import { Router, Request, Response, NextFunction } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from '../utils/supabase';

const router = Router();

// ── Gemini client ───────────────────────────────────────────────────────────
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_KEY);

// Chat / generation model
const chatModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
});

// ── Helper: generate embedding vector via REST API ──────────────────────────
// The SDK's embedContent is cleaner but can be finicky; use direct REST for reliability.
async function getEmbedding(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_KEY}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/gemini-embedding-001',
      content: { parts: [{ text }] },
    }),
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`Embedding API error ${resp.status}: ${errBody}`);
  }

  const data = await resp.json();
  return data.embedding.values;
}

// ── Helper: retrieve relevant docs from Supabase pgvector ───────────────────
async function retrieveContext(queryEmbedding: number[], topK = 5): Promise<string> {
  try {
    const { data, error } = await supabaseAdmin.rpc('match_documents', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_count: topK,
      match_threshold: 0.3,
    });

    if (error || !data || data.length === 0) {
      return '';
    }

    return data.map((doc: any) => doc.content).join('\n\n---\n\n');
  } catch (err) {
    console.warn('[RAG] Vector retrieval failed, continuing without context:', err);
    return '';
  }
}

// ── System prompt ───────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are PredictIQ Assistant, an expert AI chatbot embedded inside the PredictIQ Predictive Maintenance platform.

Your responsibilities:
- Help users understand their machine failure predictions, risk levels, and maintenance trends.
- Explain how features work: uploads, analytics, fleet management, webhooks, live monitoring, scheduling, etc.
- Provide actionable maintenance recommendations based on the user's data context.
- Interpret failure rates, trends (increasing/decreasing/stable), and risk classifications (High/Medium/Low).
- Be concise, friendly, and professional. Use bullet points where helpful.

Key platform facts:
- PredictIQ uses Random Forest ML models with 98.82% accuracy.
- Sensor inputs: Air Temperature (K), Process Temperature (K), Rotational Speed (RPM), Torque (Nm), Tool Wear (min).
- Failure types: HDF (Heat Dissipation Failure), TWF (Tool Wear Failure), OSF (Overstrain Failure), PWF (Power Failure).
- Risk levels: High Risk (immediate action needed), Medium Risk (schedule maintenance), Low Risk (monitor).
- The dashboard uses linear regression on the last 5 analyses to forecast the next failure rate.

IMPORTANT RULES:
- If the user asks something unrelated to predictive maintenance or the platform, politely redirect them.
- Always reference the user's actual data context when available.
- Never fabricate specific numbers; use the context provided to you.`;

// ── POST /api/chat ──────────────────────────────────────────────────────────
router.post('/chat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { message, context } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // --- RULE BASED INTERCEPTS ---
    if (message === "Show analysis history and takeaways" || message === "Show total failures and analytics details") {
      if (!context || !context.history || context.history.length === 0) {
        return res.json({ reply: "You don't have any analysis history yet." });
      }

      let replyText = "";
      if (message === "Show analysis history and takeaways") {
         replyText = "**Analysis History & Takeaways:**\n\n";
      } else {
         replyText = "**Analytics Details:**\n\n";
      }

      // Prepare table data
      const headers = ["Date", "Total Records", "Failures", "High Risk", "Failure Rate"];
      const rows = context.history.map((h: any) => [
        new Date(h.timestamp).toLocaleDateString(),
        h.records,
        h.failures,
        h.high_risk,
        Number(h.rate).toFixed(1) + "%"
      ]);

      if (message === "Show analysis history and takeaways") {
        replyText += `• Total Analyses Run: ${context.total_analyses}\n`;
        replyText += `• Overall Failure Rate: ${Number(context.overall_rate).toFixed(1)}%\n`;
        replyText += `• Total Failures Detected: ${context.total_failures}\n`;
        if (context.recent_failure_rate > context.overall_rate) {
          replyText += `• ⚠️ Your recent failure rate (${Number(context.recent_failure_rate).toFixed(1)}%) is higher than your overall average. Please inspect high-risk machines closely.\n`;
        } else {
          replyText += `• ✅ Your recent failure rate is stable or decreasing. Keep monitoring as usual.\n`;
        }
      } else {
        replyText += `You have a total of ${context.total_failures} failures across ${context.total_analyses} analysis runs. Detailed table is below:\n`;
      }
      return res.json({ reply: replyText, table: { headers, rows } });
    }

    if (message === "What are my maintenance recommendations?") {
      let replyText = "**Maintenance Recommendations:**\n\n";
      if (context && context.total_failures > 0) {
         replyText += "1. **Address High-Risk Machines:** Prioritize scheduling immediate maintenance for machines flagged as high-risk in your recent analyses.\n";
         replyText += "2. **Investigate Recurrences:** Investigate the root causes of the " + context.total_failures + " total failures detected to implement preventative measures.\n";
         replyText += "3. **Continuous Tracking:** Keep uploading daily machine logs to track if the overall failure rate improves from the current " + Number(context.overall_rate || 0).toFixed(1) + "%.\n";
      } else {
         replyText += "1. **Routine Maintenance:** Continue with your standard routine maintenance schedule as no failures have been detected yet.\n";
         replyText += "2. **Regular Uploads:** Ensure you are regularly uploading sensor data to keep the predictive models accurate.\n";
      }
      return res.json({ reply: replyText });
    }
    // --- END RULE BASED INTERCEPTS ---

    if (!GEMINI_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
    }

    // 1. Try RAG: generate embedding + retrieve relevant docs
    let ragContext = '';
    try {
      const embedding = await getEmbedding(message);
      ragContext = await retrieveContext(embedding);
    } catch (embErr: any) {
      console.warn('[Chat] Embedding/RAG step failed, continuing without RAG:', embErr?.message);
    }

    // 2. Build the live data context string
    let liveContext = '';
    if (context) {
      const parts: string[] = [];
      if (context.total_analyses !== undefined) parts.push(`Total analyses run: ${context.total_analyses}`);
      if (context.total_failures !== undefined) parts.push(`Total failures detected: ${context.total_failures}`);
      if (context.overall_rate !== undefined) parts.push(`Overall failure rate: ${Number(context.overall_rate).toFixed(1)}%`);
      if (context.recent_failure_rate !== undefined) parts.push(`Recent failure rate (last 3 runs): ${Number(context.recent_failure_rate).toFixed(1)}%`);
      if (parts.length > 0) {
        liveContext = `\n\nUSER'S CURRENT DATA:\n${parts.join('\n')}`;
      }
    }

    // 3. Build RAG context section
    let ragSection = '';
    if (ragContext) {
      ragSection = `\n\nRELEVANT KNOWLEDGE BASE CONTEXT:\n${ragContext}`;
    }

    // 4. Build the full prompt
    const fullPrompt = `${SYSTEM_PROMPT}${liveContext}${ragSection}\n\nUSER QUESTION: ${message}`;

    // 5. Call Gemini for generation
    const result = await chatModel.generateContent(fullPrompt);
    const response = result.response;
    const reply = response.text();

    res.json({ reply });
  } catch (err: any) {
    console.error('[Chat] Full Error Details:', err);
    // Return a user-friendly error rather than crashing
    res.status(500).json({
      reply: 'I encountered an issue processing your request. Please try again in a moment.',
      error: err?.message || JSON.stringify(err),
    });
  }
});

export default router;
