import helmet from 'helmet';
import cors from 'cors';
import { config } from '../config/env.js';

export const securityMiddleware = [
  helmet({
    contentSecurityPolicy: true,
    xContentTypeOptions: true,
    xFrameOptions: { action: 'deny' },
  }),
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
];
