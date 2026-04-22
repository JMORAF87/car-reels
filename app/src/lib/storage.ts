import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function uploadImageBuffer(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { error } = await supabase.storage
      .from('car-photos')
      .upload(filename, buffer, { contentType: mimeType, upsert: true });
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);
    const { data } = supabase.storage.from('car-photos').getPublicUrl(filename);
    return data.publicUrl;
  }

  // Local fallback
  const { writeFile, mkdir } = await import('fs/promises');
  const path = await import('path');
  const dir = path.join(process.cwd(), 'public/uploads');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/${filename}`;
}

export async function uploadRenderedVideo(localPath: string, filename: string): Promise<string> {
  const supabase = getSupabaseClient();

  if (supabase) {
    const buffer = await readFile(localPath);
    const { error } = await supabase.storage
      .from('rendered-videos')
      .upload(filename, buffer, { contentType: 'video/mp4', upsert: true });
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);
    const { data } = supabase.storage.from('rendered-videos').getPublicUrl(filename);
    return data.publicUrl;
  }

  // Local fallback — file is already at localPath inside public/output/
  return `/output/${filename}`;
}
