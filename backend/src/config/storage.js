import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';

// Guarantee a single, canonical, absolute upload directory path across all processes and requests
const UPLOAD_DIR = path.join(os.tmpdir(), 'skillforge_uploads');

const getUploadDir = () => {
  if (!fsSync.existsSync(UPLOAD_DIR)) {
    fsSync.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  return UPLOAD_DIR;
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
  return await fs.readFile(filePath);
};

export const deleteFile = async (storageKey) => {
  try {
    const dir = getUploadDir();
    const filePath = path.join(dir, storageKey);
    await fs.unlink(filePath);
  } catch (err) {
    // Ignore cleanup error
  }
};
