import { createClient } from '@supabase/supabase-js';
import { config } from './env.js';

const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);
const BUCKET = 'resumes';

export const saveFile = async (buffer, storageKey) => {
  if (!config.supabaseServiceRoleKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY missing. File storage operating in fallback mode.');
    return storageKey;
  }
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storageKey, buffer, { upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return storageKey;
};

export const readFile = async (storageKey) => {
  if (!config.supabaseServiceRoleKey) {
    throw new Error('Storage read failed: SUPABASE_SERVICE_ROLE_KEY missing');
  }
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(storageKey);
  if (error) throw new Error(`Storage read failed: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
};

export const deleteFile = async (storageKey) => {
  if (!config.supabaseServiceRoleKey) return;
  const { error } = await supabase.storage.from(BUCKET).remove([storageKey]);
  if (error) console.error(`Failed to delete file ${storageKey}:`, error.message);
};

export const ensureUploadDir = async () => {
  return true;
};
