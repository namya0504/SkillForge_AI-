import { connectDB } from './config/database.js';
import { ensureUploadDir } from './config/storage.js';
import { worker } from './services/worker.js';

const startStandaloneWorker = async () => {
  await connectDB();
  await ensureUploadDir();
  console.log('Starting standalone background worker process...');
  worker.start();
};

startStandaloneWorker();
