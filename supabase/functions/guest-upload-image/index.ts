import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  // Get env vars
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Parse request
  const { guest_id, module_id, event_id, file_base64, file_type, upload_type } = await req.json()

  if (!file_base64 || !file_type) {
    return new Response(JSON.stringify({ error: 'Missing required fields: file_base64, file_type' }), { status: 400 })
  }

  // Decode base64
  const binary = Uint8Array.from(atob(file_base64), c => c.charCodeAt(0))
  
  // Determine bucket and file path based on upload type
  let bucketName, fileName;
  
  if (upload_type === 'chat') {
    // For chat uploads
    bucketName = 'chat-attachments';
    const timestamp = Date.now();
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/heic': 'heic',
      'image/heif': 'heif',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'video/x-matroska': 'mkv',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a',
      'audio/wav': 'wav',
      'application/pdf': 'pdf',
    };
    const fileExt = extMap[file_type] || (file_type.includes('/') ? file_type.split('/')[1] : 'bin');
    fileName = `${timestamp}_${Math.random().toString(36).substring(2)}.${fileExt}`;
  } else {
    // For guest module uploads (original functionality)
    if (!guest_id) {
      return new Response(JSON.stringify({ error: 'Missing required field: guest_id' }), { status: 400 })
    }
    bucketName = 'guest_event_module_responses';
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/heic': 'heic',
      'image/heif': 'heif',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'video/x-matroska': 'mkv',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a',
      'audio/wav': 'wav',
      'application/pdf': 'pdf',
    };
    const fileExt = extMap[file_type] || (file_type.includes('/') ? file_type.split('/')[1] : 'bin');
    fileName = `${guest_id}/${Date.now()}_${module_id || 'media'}.${fileExt}`;
  }

  // Supabase client (service role)
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // Upload to storage
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, binary, {
      contentType: file_type,
      upsert: false,
    })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(fileName)

  return new Response(JSON.stringify({ url: urlData.publicUrl, path: fileName }), { status: 200 })
})