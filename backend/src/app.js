import express from 'express';
import cookieParser from 'cookie-parser';
import { securityMiddleware } from './middleware/security.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import authRoutes from './routes/auth.routes.js';
import { config } from './config/env.js';

const app = express();

// Trust proxy if we are behind a reverse proxy (useful for rate limiting)
app.set('trust proxy', 1);

// Apply security middlewares (helmet, cors)
app.use(securityMiddleware);

// Parse JSON bodies (limit 10kb)
app.use(express.json({ limit: '10kb' }));

// Parse cookies
app.use(cookieParser());

// Apply general rate limiting
app.use(generalLimiter);

// Routes
app.use('/api/v1/auth', authRoutes);

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const isProduction = config.nodeEnv === 'production';
  res.status(500).json({
    error: 'Internal Server Error',
    ...(isProduction ? {} : { message: err.message })
  });
});

export default app;
