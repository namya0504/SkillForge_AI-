import app from './app.js';
import { config } from './config/env.js';
import { connectDB } from './config/database.js';
import prisma from './config/database.js';
import { worker } from './services/worker.js';

const startServer = async () => {
  await connectDB();

  const server = app.listen(config.port, () => {
    console.log(`Server running in ${config.nodeEnv} mode on port ${config.port}`);
    worker.start();
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
