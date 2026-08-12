import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { config } from './env.js';

export const ensureUploadDir = async () => {
  try {
    await fs.mkdir(config.uploadDir, { recursive: true });
  } catch (err) {
    console.error('Failed to create upload directory:', err);
  }
};

export const saveFile = async (buffer, storageKey) => {
  await ensureUploadDir();
  const filePath = path.join(config.uploadDir, storageKey);
  await fs.writeFile(filePath, buffer);
  return filePath;
};

export const readFile = async (storageKey) => {
  const filePath = path.join(config.uploadDir, storageKey);
  return await fs.readFile(filePath);
};

export const deleteFile = async (storageKey) => {
  try {
    const filePath = path.join(config.uploadDir, storageKey);
    await fs.unlink(filePath);
  } catch (err) {
    console.error(`Failed to delete file ${storageKey}:`, err);
  }
};
