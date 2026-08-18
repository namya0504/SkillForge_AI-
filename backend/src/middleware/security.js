import helmet from 'helmet';
import cors from 'cors';
import { config } from '../config/env.js';

const allowedOrigins = [
  config.frontendUrl,
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

export const securityMiddleware = [
  helmet({
    contentSecurityPolicy: false,
    xContentTypeOptions: true,
    xFrameOptions: { action: 'deny' },
  }),
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      return callback(null, origin);
    },
    credentials: true,
  })
];
