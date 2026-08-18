import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
import { config } from './env.js';

const getUploadDir = () => {
  const primaryDir = config.uploadDir || path.join(process.cwd(), 'uploads');
  try {
    if (!fsSync.existsSync(primaryDir)) {
      fsSync.mkdirSync(primaryDir, { recursive: true });
    }
    return primaryDir;
  } catch (err) {
    console.warn(`Could not use primary upload dir ${primaryDir}, falling back to system temp dir`, err.message);
    const fallbackDir = path.join(os.tmpdir(), 'skillforge_uploads');
    if (!fsSync.existsSync(fallbackDir)) {
      fsSync.mkdirSync(fallbackDir, { recursive: true });
    }
    return fallbackDir;
  }
};

export const ensureUploadDir = async () => {
  return getUploadDir();
};

export const saveFile = async (buffer, storageKey) => {
  const dir = getUploadDir();
  const filePath = path.join(dir, storageKey);
  await fs.writeFile(filePath, buffer);
  return filePath;
};

export const readFile = async (storageKey) => {
  const dir = getUploadDir();
  const filePath = path.join(dir, storageKey);
  try {
    return await fs.readFile(filePath);
  } catch (err) {
    const fallbackPath = path.join(os.tmpdir(), 'skillforge_uploads', storageKey);
    return await fs.readFile(fallbackPath);
  }
};

export const deleteFile = async (storageKey) => {
  try {
    const dir = getUploadDir();
    const filePath = path.join(dir, storageKey);
    await fs.unlink(filePath);
  } catch (err) {
    try {
      const fallbackPath = path.join(os.tmpdir(), 'skillforge_uploads', storageKey);
      await fs.unlink(fallbackPath);
    } catch (e) {
      // Ignore cleanup error
    }
  }
};
