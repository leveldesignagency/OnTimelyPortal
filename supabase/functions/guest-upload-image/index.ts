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
  const { guest_id, module_id, event_id, file_base64, file_type } = await req.json()

  if (!guest_id || !file_base64 || !file_type) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
  }

  // Decode base64
  const binary = Uint8Array.from(atob(file_base64), c => c.charCodeAt(0))
  const fileName = `${guest_id}/${Date.now()}_${module_id || 'media'}.${file_type.split('/')[1]}`

  // Supabase client (service role)
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // Upload to storage
  const { data, error } = await supabase.storage
    .from('guest_event_module_responses')
    .upload(fileName, binary, {
      contentType: file_type,
      upsert: false,
    })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('guest_event_module_responses')
    .getPublicUrl(fileName)

  return new Response(JSON.stringify({ url: urlData.publicUrl, path: fileName }), { status: 200 })
}) 