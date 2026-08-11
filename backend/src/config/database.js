import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

// Create the SQLite adapter - Prisma 7 requires driver adapters
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./dev.db',
});

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
