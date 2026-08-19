import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  port: process.env.PORT || 3001,
  dbUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30m',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  llmApiKey: process.env.LLM_API_KEY || '',
  maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '3', 10),
  supabaseUrl: process.env.SUPABASE_URL || 'https://jrikbhexexnmrbtsxikh.supabase.co',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
};