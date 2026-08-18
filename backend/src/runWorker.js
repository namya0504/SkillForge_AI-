import 'dotenv/config';
import { connectDB } from './config/database.js';
import { worker } from './services/worker.js';

const startWorker = async () => {
  console.log('Initializing standalone worker process...');
  await connectDB();
  worker.start();

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down worker gracefully...');
    worker.stop();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

startWorker();
