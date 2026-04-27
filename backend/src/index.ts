import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import predictRoutes from './routes/predict';
import retrainRoutes from './routes/retrain';
import dashboardRoutes from './routes/dashboard';
import webhookRoutes from './routes/webhooks';
import chatRoutes from './routes/chat';
import { startCronJobs } from './services/cron';
import { attachMonitorWebSocket } from './services/monitor';

dotenv.config();

const app = express();
const port = process.env.PORT || 8001;

app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173']
}));

app.use(express.json());

// Basic health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    app_name: 'Predictive Maintenance API (TS)',
    version: '2.0.0',
    websocket: '/ws/monitor',
  });
});

// Routes
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/predict', predictRoutes);
app.use('/api', predictRoutes); // Maps inner /files routes accurately to /api/files
app.use('/api/retrain', retrainRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api', chatRoutes);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    details: err.details || null,
  });
});

// Create HTTP server from Express so WebSocket can share the same port
const httpServer = createServer(app);

// Attach WebSocket server for /ws/monitor
attachMonitorWebSocket(httpServer);

httpServer.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
  console.log(`[server]: WebSocket available at ws://localhost:${port}/ws/monitor`);
  
  // Initialize the email scheduling cron job
  startCronJobs();
});
