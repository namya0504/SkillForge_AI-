import './env.js';
import { PrismaClient } from '../generated/prisma/client.js';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Create the Postgres adapter with loaded environment variables
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// Pass the adapter to PrismaClient
const prisma = new PrismaClient({ adapter });

export const connectDB = async () => {
  try {
    // Test connection by running a simple query
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed', error);
    process.exit(1);
  }
};

export default prisma;
