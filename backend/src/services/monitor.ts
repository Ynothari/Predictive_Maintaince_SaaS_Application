/**
 * Live Monitor WebSocket Service
 *
 * Handles real-time machine sensor data via WebSocket connections.
 * Clients send JSON payloads with sensor readings; the server runs
 * ML predictions and pushes results back immediately.
 *
 * Protocol (client → server):
 *   { machine_id, air_temp, process_temp, rpm, torque, tool_wear }
 *   { type: "ping" }
 *
 * Protocol (server → client):
 *   { machine_id, will_fail, failure_probability, risk_level, ... }
 *   { type: "pong" }
 *   { type: "error", message }
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server as HTTPServer } from 'http';
import { predictFailures } from './ml';
import { supabaseAdmin } from '../utils/supabase';

interface SensorPayload {
  machine_id: string;
  air_temp: number;
  process_temp: number;
  rpm: number;
  torque: number;
  tool_wear: number;
}

/**
 * Validate and normalise an incoming sensor payload.
 * Returns a clean SensorPayload or null if validation fails.
 */
function validatePayload(raw: any): SensorPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const machineId = String(raw.machine_id || '').trim();
  if (!machineId) return null;

  const airTemp     = Number(raw.air_temp);
  const processTemp = Number(raw.process_temp);
  const rpm         = Number(raw.rpm);
  const torque      = Number(raw.torque);
  const toolWear    = Number(raw.tool_wear);

  if ([airTemp, processTemp, rpm, torque, toolWear].some(v => isNaN(v))) return null;

  return { machine_id: machineId, air_temp: airTemp, process_temp: processTemp, rpm, torque, tool_wear: toolWear };
}

/**
 * Fire configured webhooks for high-risk predictions.
 * Reads from the Supabase `webhook_configs` table, filters enabled ones,
 * and dispatches POST requests.  Failures are swallowed and logged.
 */
async function fireWebhooks(prediction: Record<string, any>) {
  try {
    // Only fire webhooks for concerning predictions
    if (prediction.risk_level === 'Low Risk' && !prediction.will_fail) return;

    const { data: configs, error } = await supabaseAdmin
      .from('webhook_configs')
      .select('id, url, secret, enabled')
      .eq('enabled', true);

    if (error || !configs || configs.length === 0) return;

    const payload = JSON.stringify({
      event: 'live_monitor.prediction',
      timestamp: new Date().toISOString(),
      data: prediction,
    });

    for (const cfg of configs) {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (cfg.secret) headers['X-Webhook-Secret'] = cfg.secret;

        // Using native fetch (Node 18+) — no extra dependency needed
        fetch(cfg.url, { method: 'POST', headers, body: payload, signal: AbortSignal.timeout(5000) })
          .catch(err => console.warn(`[webhook] Failed to fire webhook ${cfg.id}: ${err.message}`));
      } catch (err: any) {
        console.warn(`[webhook] Error preparing webhook ${cfg.id}: ${err.message}`);
      }
    }
  } catch (err: any) {
    console.warn('[webhook] Error loading webhook configs:', err.message);
  }
}

/**
 * Log a live-monitor event into the `audit_logs` table using the service role
 * (bypasses RLS). We batch these so they don't slow down the response.
 */
let auditBuffer: { action: string; details: string }[] = [];
let auditFlushTimer: ReturnType<typeof setTimeout> | null = null;

function queueAuditLog(action: string, details: string) {
  auditBuffer.push({ action, details });
  if (!auditFlushTimer) {
    auditFlushTimer = setTimeout(flushAuditLogs, 5000);
  }
}

async function flushAuditLogs() {
  auditFlushTimer = null;
  if (auditBuffer.length === 0) return;
  const batch = auditBuffer.splice(0, auditBuffer.length);
  try {
    // Insert without user_id since it's nullable
    await supabaseAdmin.from('audit_logs').insert(batch.map(b => ({
      action: b.action,
      details: b.details,
    })));
  } catch (err: any) {
    console.warn('[audit] Failed to flush audit logs:', err.message);
  }
}

/**
 * Attach a WebSocket server to the given HTTP server on the `/ws/monitor` path.
 */
export function attachMonitorWebSocket(httpServer: HTTPServer): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  // Handle HTTP upgrade — only for /ws/monitor path
  httpServer.on('upgrade', (request: IncomingMessage, socket, head) => {
    const pathname = new URL(request.url || '/', `http://${request.headers.host}`).pathname;

    if (pathname === '/ws/monitor') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
    console.log(`[ws] Client connected (total: ${wss.clients.size})`);

    ws.on('message', async (raw: Buffer | string) => {
      try {
        const msg = JSON.parse(typeof raw === 'string' ? raw : raw.toString());

        // Handle ping/pong
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        const payload = validatePayload(msg);
        if (!payload) {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid sensor payload. Required: machine_id, air_temp, process_temp, rpm, torque, tool_wear' }));
          return;
        }

        // Build feature vector in the order our ML expects
        const features: number[][] = [[
          payload.air_temp,      // Air temperature [K]
          payload.process_temp,  // Process temperature [K]
          payload.rpm,           // Rotational speed [rpm]
          payload.torque,        // Torque [Nm]
          payload.tool_wear,     // Tool wear [min]
        ]];

        const [prediction] = predictFailures(features);

        const result = {
          machine_id: payload.machine_id,
          will_fail: prediction.will_fail,
          failure_probability: prediction.failure_probability,
          risk_level: prediction.risk_level,
          failure_reason: prediction.failure_reason || null,
          recommendation: prediction.recommendation,
          timestamp: new Date().toISOString(),
        };

        // Send result back to the client
        ws.send(JSON.stringify(result));

        // Fire webhooks for medium/high risk async (non-blocking)
        fireWebhooks(result);

        // Audit log
        queueAuditLog('live_monitor_prediction', `Machine: ${payload.machine_id}, Risk: ${prediction.risk_level}`);

      } catch (err: any) {
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to process message' }));
        console.error('[ws] Message handling error:', err);
      }
    });

    ws.on('close', () => {
      console.log(`[ws] Client disconnected (remaining: ${wss.clients.size})`);
    });

    ws.on('error', (err) => {
      console.error('[ws] WebSocket error:', err.message);
    });
  });

  console.log('[ws] WebSocket monitor attached at /ws/monitor');
  return wss;
}
