import { createClient } from '@supabase/supabase-js';  
import { env } from '../config/env.js';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

export async function uploadAudio(  
  buffer: Buffer,  
  filename: string,  
  bucket = 'tts-audio',  
): Promise<string> {  
  const { error } = await supabase.storage  
    .from(bucket)  
    .upload(filename, buffer, {  
      contentType: 'audio/mpeg',  
      upsert: true,  
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(filename);  
  return data.publicUrl;  
}

export async function logQuery(params: {  
  deviceIdHash: string;  
  intent: string;  
  language: string;  
  latencyMs: number;  
}): Promise<void> {  
  const { error } = await supabase.from('query_logs').insert({  
    device_id_hash: params.deviceIdHash,  
    intent: params.intent,  
    language: params.language,  
    latency_ms: params.latencyMs,  
  });  
  if (error) console.warn('Failed to log query:', error.message);  
}
