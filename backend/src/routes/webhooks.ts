/**
 * Webhook Configuration Routes
 *
 * CRUD endpoints for managing webhook configurations stored in Supabase.
 * Uses the user's Supabase token for RLS-enforced access.
 *
 * GET    /api/webhooks          — list user's webhook configs
 * POST   /api/webhooks          — create a new webhook config
 * PATCH  /api/webhooks/:id      — update (toggle enabled, change URL/secret)
 * DELETE /api/webhooks/:id      — remove a webhook config
 * POST   /api/webhooks/:id/test — fire a test payload to a configured webhook
 */

import { Router, Response, NextFunction } from 'express';
import { getSupabaseUserClient } from '../utils/supabase';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// ─── List ────────────────────────────────────────────────────────────────────

router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userClient = getSupabaseUserClient(req.headers.authorization!);
    const { data, error } = await userClient
      .from('webhook_configs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data ?? []);
  } catch (err) { next(err); }
});

// ─── Create ──────────────────────────────────────────────────────────────────

router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { url, secret = '', enabled = true } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ detail: 'A valid `url` is required.' });
    }

    // Basic URL validation
    try { new URL(url); } catch {
      return res.status(400).json({ detail: 'The `url` must be a valid HTTP/HTTPS URL.' });
    }

    const userClient = getSupabaseUserClient(req.headers.authorization!);
    const userId     = req.user!.id;

    const { data, error } = await userClient
      .from('webhook_configs')
      .insert({
        user_id: userId,
        url,
        secret: String(secret),
        enabled: Boolean(enabled),
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
});

// ─── Update ──────────────────────────────────────────────────────────────────

router.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const webhookId  = req.params.id;
    const updates: Record<string, any> = {};

    if (req.body.url !== undefined)     updates.url     = String(req.body.url);
    if (req.body.secret !== undefined)  updates.secret  = String(req.body.secret);
    if (req.body.enabled !== undefined) updates.enabled = Boolean(req.body.enabled);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ detail: 'No fields to update.' });
    }

    // Validate URL if provided
    if (updates.url) {
      try { new URL(updates.url); } catch {
        return res.status(400).json({ detail: 'The `url` must be a valid HTTP/HTTPS URL.' });
      }
    }

    const userClient = getSupabaseUserClient(req.headers.authorization!);
    const { data, error } = await userClient
      .from('webhook_configs')
      .update(updates)
      .eq('id', webhookId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ detail: 'Webhook config not found.' });

    res.json(data);
  } catch (err) { next(err); }
});

// ─── Delete ──────────────────────────────────────────────────────────────────

router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userClient = getSupabaseUserClient(req.headers.authorization!);
    const { error } = await userClient
      .from('webhook_configs')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ status: 'deleted', id: req.params.id });
  } catch (err) { next(err); }
});

// ─── Test ────────────────────────────────────────────────────────────────────

router.post('/:id/test', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userClient = getSupabaseUserClient(req.headers.authorization!);
    const { data: config, error } = await userClient
      .from('webhook_configs')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!config) return res.status(404).json({ detail: 'Webhook config not found.' });

    // Build test payload
    const testPayload = JSON.stringify({
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: {
        machine_id: 'TEST-001',
        will_fail: false,
        failure_probability: 0.12,
        risk_level: 'Low Risk',
        failure_reason: null,
        recommendation: 'Normal operation — this is a test webhook.',
      },
    });

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.secret) headers['X-Webhook-Secret'] = config.secret;

    const response = await fetch(config.url, {
      method: 'POST',
      headers,
      body: testPayload,
      signal: AbortSignal.timeout(10000),
    });

    res.json({
      status: 'sent',
      response_status: response.status,
      response_ok: response.ok,
    });
  } catch (err: any) {
    res.status(502).json({
      status: 'failed',
      detail: `Webhook delivery failed: ${err.message}`,
    });
  }
});

export default router;
