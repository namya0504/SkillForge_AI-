import helmet from 'helmet';
import cors from 'cors';

const allowedOrigins = [
  process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : '',
  'https://skill-forge-ai-rose.vercel.app',
  'https://skillforge-ai.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server or mobile non-browser requests
    if (!origin) return callback(null, true);

    // Allow explicit allowed origins OR any Vercel deployment domain (*.vercel.app)
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

export const securityMiddleware = [
  helmet({
    contentSecurityPolicy: false,
    xContentTypeOptions: true,
    xFrameOptions: { action: 'deny' },
  }),
  cors(corsOptions)
];
