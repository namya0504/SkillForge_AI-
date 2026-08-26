import app from './app.js';
import { config } from './config/env.js';
import { connectDB } from './config/database.js';
import prisma from './config/database.js';
import { worker } from './services/worker.js';
import { ensureUploadDir } from './config/storage.js';

const startServer = async () => {
  await connectDB();
  await ensureUploadDir();

  const server = app.listen(config.port, () => {
    console.log(`Server running in ${config.nodeEnv} mode on port ${config.port}`);
    if (process.env.RUN_WORKER !== 'false') {
      worker.start();
      console.log('Worker automatically started inside server process.');
    } else {
      console.log('Worker disabled via RUN_WORKER=false.');
    }
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down gracefully...');
    server.close(async () => {
      console.log('HTTP server closed.');
      worker.stop();
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

startServer();
