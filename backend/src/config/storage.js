import { createClient } from '@supabase/supabase-js';
import { config } from './env.js';

let supabase = null;
if (config.supabaseUrl && config.supabaseServiceRoleKey && !config.supabaseServiceRoleKey.includes('placeholder')) {
  try {
    supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);
  } catch (err) {
    console.warn('Supabase client init warning:', err.message);
  }
}

const BUCKET = 'resumes';

export const saveFile = async (buffer, storageKey) => {
  if (!supabase) {
    console.warn('Supabase client not configured or key is placeholder. Skipping bucket upload.');
    return storageKey;
  }
  try {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storageKey, buffer, { upsert: true });
    if (error) {
      console.warn(`Supabase storage upload warning: ${error.message}. Job processing will use base64 payload fallback.`);
    }
  } catch (err) {
    console.warn('Supabase storage upload exception:', err.message);
  }
  return storageKey;
};

export const readFile = async (storageKey) => {
  if (!supabase) {
    throw new Error('Storage read failed: Supabase storage is not configured.');
  }
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(storageKey);
  if (error) throw new Error(`Storage read failed: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
};

export const deleteFile = async (storageKey) => {
  if (!supabase) return;
  try {
    const { error } = await supabase.storage.from(BUCKET).remove([storageKey]);
    if (error) console.error(`Failed to delete file ${storageKey}:`, error.message);
  } catch (err) {
    // ignore cleanup error
  }
};

export const ensureUploadDir = async () => {
  return true;
};
