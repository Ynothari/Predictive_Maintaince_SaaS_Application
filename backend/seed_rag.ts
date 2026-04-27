/**
 * PredictIQ — RAG Knowledge Base Seeder
 * 
 * Run once to populate the Supabase pgvector knowledge_store table with
 * PredictIQ system documentation so the chatbot can answer contextually.
 * 
 * Usage:  npx tsx seed_rag.ts
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, './.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const geminiKey   = process.env.GEMINI_API_KEY || '';

if (!supabaseUrl || !supabaseKey || !geminiKey) {
  console.error('Missing SUPABASE_URL, SUPABASE_KEY/SERVICE_ROLE_KEY, or GEMINI_API_KEY in backend/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ── Helper: generate embedding vector via REST API ──────────────────────────
async function getEmbedding(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${geminiKey}`;
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

// ── Knowledge chunks ────────────────────────────────────────────────────────
const KNOWLEDGE_CHUNKS: { content: string; metadata: Record<string, string> }[] = [
  {
    content: `PredictIQ is an AI-powered Predictive Maintenance SaaS platform. It helps industrial operations predict machine failures before they happen by analyzing sensor data using Machine Learning models. The platform achieves 98.82% prediction accuracy using Random Forest classifiers.`,
    metadata: { topic: 'overview', section: 'introduction' },
  },
  {
    content: `PredictIQ uses two Random Forest ML models: one for binary failure prediction (will the machine fail: yes/no) and one for failure type classification (what kind of failure). The models are trained on the UCI AI4I 2020 Predictive Maintenance Dataset which contains real industrial machine telemetry data.`,
    metadata: { topic: 'ml_models', section: 'architecture' },
  },
  {
    content: `The five sensor inputs used by PredictIQ's ML models are: 1) Air Temperature measured in Kelvin (K), 2) Process Temperature measured in Kelvin (K), 3) Rotational Speed measured in RPM, 4) Torque measured in Newton-meters (Nm), and 5) Tool Wear measured in minutes. These are the columns expected in the uploaded CSV files.`,
    metadata: { topic: 'sensor_inputs', section: 'data_format' },
  },
  {
    content: `PredictIQ classifies failure types into four categories: HDF (Heat Dissipation Failure) occurs when the temperature differential between air and process temperatures is too low and rotational speed is too low. TWF (Tool Wear Failure) occurs when tool wear time exceeds a threshold. OSF (Overstrain Failure) occurs when the product of tool wear and torque exceeds safe limits. PWF (Power Failure) occurs when the power (torque × rotational speed) falls outside the acceptable operating window.`,
    metadata: { topic: 'failure_types', section: 'ml_classification' },
  },
  {
    content: `Risk levels in PredictIQ are assigned as follows: High Risk means the machine has a very high probability of imminent failure and requires immediate maintenance action. Medium Risk means the machine shows signs of degradation and maintenance should be scheduled soon. Low Risk means the machine is operating within normal parameters but should continue to be monitored. The dashboard uses color coding: red for High Risk, amber/orange for Medium Risk, and green for Low Risk or Healthy.`,
    metadata: { topic: 'risk_levels', section: 'classification' },
  },
  {
    content: `To upload data for analysis in PredictIQ: 1) Navigate to the Upload & Analyze page. 2) Drag and drop a CSV file or click to browse. The CSV must contain columns for air temperature, process temperature, rotational speed, torque, and tool wear. 3) The system processes all rows through the ML pipeline. 4) Results appear showing predicted failures, risk distribution, and failure reasons. 5) You can export results as CSV or PDF.`,
    metadata: { topic: 'upload_workflow', section: 'user_guide' },
  },
  {
    content: `The PredictIQ Dashboard shows four key metrics: Total Analyses (number of times you've run predictions), Last Analysis (date of most recent run), Total Failures (cumulative count of predicted failures across all runs), and Model Accuracy (98.82% based on Random Forest validation). The dashboard also shows a Trend Forecast using linear regression on the last 5 analyses to predict what your next failure rate will be.`,
    metadata: { topic: 'dashboard', section: 'features' },
  },
  {
    content: `The Trend Forecast on the Dashboard works by taking the failure rates from your last 5 analysis runs, applying simple linear regression (calculating slope and intercept), and extrapolating to predict the failure rate of your next analysis. If the slope is positive (> 0.3), the trend is marked as 'Increasing' (red). If negative (< -0.3), it's 'Decreasing' (green). Otherwise it's 'Stable' (gray). A sparkline chart visualizes this trend.`,
    metadata: { topic: 'trend_forecast', section: 'analytics' },
  },
  {
    content: `The Analytics page in PredictIQ provides aggregated views across all your analyses. It includes: an Area Chart showing failure rate over time, a Line Chart showing failure count per analysis, a Pie Chart showing risk distribution (High/Medium/Low risk proportions), and summary cards for total analyses, total records, total failures, overall rate, average failures per analysis, and high risk total.`,
    metadata: { topic: 'analytics_page', section: 'features' },
  },
  {
    content: `The Analysis History page shows a paginated table of every analysis run. Each row displays: date and time, total records analyzed, number of failures, failure rate with a visual progress bar, high risk count, health status (Healthy or Failures), and editable notes. You can search history, view detailed machine readings by clicking the eye icon (which shows a popup with all individual sensor readings), and delete individual records or clear all history.`,
    metadata: { topic: 'history', section: 'features' },
  },
  {
    content: `The Compare Analyses feature lets you select two different analysis runs and view them side-by-side. A comparison table shows Date, Total Records, Failures, Failure Rate, High Risk, and Medium Risk for both analyses. A grouped bar chart visualizes the differences in failures, high risk, and medium risk counts. This helps track whether maintenance actions have improved machine health between runs.`,
    metadata: { topic: 'comparison', section: 'features' },
  },
  {
    content: `Fleet Overview groups your analyses into machine groups (lines). By default, groups are named Line A, Line B, Line C, but you can add custom groups like 'Building 2' or 'CNC Floor'. Each group shows: failure rate with a progress bar, number of analyses, high risk count, total records, total failures, and a trend indicator (Worsening/Improving/Stable). A Fleet Health Score banner shows the overall health percentage. Groups can be added or removed.`,
    metadata: { topic: 'fleet_management', section: 'features' },
  },
  {
    content: `PredictIQ Settings has three sections: Account (profile editing, password change with strength meter, 2FA setup, API key generation, session management), Notifications (toggle controls for high-risk alerts, failure warnings, healthy confirmations, and a configurable failure rate threshold), and Data Control (export all data as JSON, delete all analysis history permanently).`,
    metadata: { topic: 'settings', section: 'features' },
  },
  {
    content: `Two-Factor Authentication (2FA) in PredictIQ uses TOTP (Time-based One-Time Password). To enable: go to Settings > Account > Two-Factor Authentication, click Enable 2FA, scan the QR code with an authenticator app (Google Authenticator, Authy, etc.), enter the 6-digit code to verify. To disable, enter your current TOTP code. 2FA adds an extra security layer to protect your account.`,
    metadata: { topic: '2fa', section: 'security' },
  },
  {
    content: `The Admin Panel is restricted to super admin users. It provides: a user management table showing all registered users with their username, full name, email, last login, and analysis count. Admins can create new users, edit user profiles inline, and delete users. The Audit Log tab shows a chronological record of all system events including logins, registrations, analysis runs, and failed login attempts with timestamps and user IDs.`,
    metadata: { topic: 'admin_panel', section: 'administration' },
  },
  {
    content: `Live Monitor in PredictIQ connects to the backend via WebSocket (ws://). It streams real-time sensor data and runs instant ML predictions on each reading. When a high-risk prediction is detected, the system automatically dispatches webhook notifications to configured external URLs (Slack, Teams, custom endpoints). The monitor shows connection status and a continuously updating table of live predictions.`,
    metadata: { topic: 'live_monitor', section: 'real_time' },
  },
  {
    content: `Webhook Management in PredictIQ allows users to configure external notification endpoints. You can create webhooks with a name, target URL, optional headers, and event type triggers. The system supports testing webhooks to verify connectivity. When the live monitor detects high-risk failures, it automatically sends JSON payloads to all enabled webhooks for the user. Webhooks use Supabase Row Level Security so each user can only manage their own configurations.`,
    metadata: { topic: 'webhooks', section: 'integrations' },
  },
  {
    content: `Scheduled Analysis in PredictIQ lets users automate their predictions. After running an analysis, click 'Schedule This Analysis' to set it to repeat Daily, Weekly, or Monthly. The backend uses node-cron to check for due jobs every hour. When anomalies are detected in scheduled runs, the system sends HTML email alerts via Nodemailer (SMTP) containing metrics like total analyses reviewed, high-risk failures, and overall failure rate, with a link to the dashboard.`,
    metadata: { topic: 'scheduling', section: 'automation' },
  },
  {
    content: `To interpret your failure rate: Below 5% is generally healthy and indicates good machine maintenance. Between 5-15% suggests some machines need attention and preventive maintenance should be scheduled. Above 15% is concerning and indicates significant issues requiring immediate investigation. The configurable threshold alert (default 15%) triggers an in-app notification when exceeded.`,
    metadata: { topic: 'interpreting_results', section: 'guidance' },
  },
  {
    content: `Common maintenance recommendations based on PredictIQ predictions: For HDF (Heat Dissipation Failure) - check cooling systems, ensure adequate airflow, inspect heat exchangers. For TWF (Tool Wear Failure) - replace worn tools, review tool change schedules. For OSF (Overstrain Failure) - reduce operating loads, check for mechanical binding, inspect bearings. For PWF (Power Failure) - inspect electrical connections, check power supply stability, review motor condition.`,
    metadata: { topic: 'maintenance_recommendations', section: 'guidance' },
  },
];

// ── Main seeder ─────────────────────────────────────────────────────────────
async function seed() {
  console.log(`\n🌱 PredictIQ RAG Knowledge Base Seeder`);
  console.log(`   Chunks to embed: ${KNOWLEDGE_CHUNKS.length}`);
  console.log(`   Target: ${supabaseUrl}\n`);

  // Clear existing entries
  const { error: deleteErr } = await supabase.from('knowledge_store').delete().neq('id', 0);
  if (deleteErr) {
    console.warn('⚠️  Could not clear existing entries (table may not exist yet):', deleteErr.message);
    console.log('   Make sure you have run scripts/06_pgvector_knowledge_base.sql first!\n');
    return;
  }
  console.log('🗑️  Cleared existing knowledge entries');

  let successCount = 0;

  for (let i = 0; i < KNOWLEDGE_CHUNKS.length; i++) {
    const chunk = KNOWLEDGE_CHUNKS[i];
    const label = `[${i + 1}/${KNOWLEDGE_CHUNKS.length}]`;

    try {
      // Generate embedding
      const embedding = await getEmbedding(chunk.content);

      // Insert into Supabase
      const { error: insertErr } = await supabase.from('knowledge_store').insert({
        content:   chunk.content,
        metadata:  chunk.metadata,
        embedding: embedding,
      });

      if (insertErr) {
        console.error(`${label} ❌ Insert failed:`, insertErr.message);
      } else {
        console.log(`${label} ✅ ${chunk.metadata.topic}`);
        successCount++;
      }
    } catch (err: any) {
      console.error(`${label} ❌ Embedding failed:`, err.message);
    }

    // Small delay to respect rate limits
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n✅ Seeding complete: ${successCount}/${KNOWLEDGE_CHUNKS.length} chunks embedded.\n`);
}

seed().catch(console.error);
