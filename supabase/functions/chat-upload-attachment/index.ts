import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { 
      status: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      }
    });
  }

  // Get env vars
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  try {
    let event_id, file_base64, file_type, filename;

    // Check if it's FormData or JSON
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      // Handle FormData
      const formData = await req.formData();
      event_id = formData.get('event_id') as string;
      file_base64 = formData.get('file_base64') as string;
      file_type = formData.get('file_type') as string;
      filename = formData.get('filename') as string;
    } else {
      // Handle JSON
      const body = await req.json();
      event_id = body.event_id;
      file_base64 = body.file_base64;
      file_type = body.file_type;
      filename = body.filename;
    }

    if (!event_id || !file_base64 || !file_type) {
      return new Response(JSON.stringify({ error: 'Missing required fields: event_id, file_base64, file_type' }), { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        }
      })
    }

    // Decode base64
    const binary = Uint8Array.from(atob(file_base64), c => c.charCodeAt(0))
    const timestamp = Date.now()
    const fileExt = file_type.split('/')[1] || 'jpg'
    const fileName = `${timestamp}_${Math.random().toString(36).substring(2)}.${fileExt}`

    // Supabase client (service role)
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Upload to chat-attachments bucket
    const { data, error } = await supabase.storage
      .from('chat-attachments')
      .upload(fileName, binary, {
        contentType: file_type,
        upsert: false,
      })

    if (error) {
      console.error('Storage upload error:', error)
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        }
      })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(fileName)

    return new Response(JSON.stringify({ 
      url: urlData.publicUrl, 
      path: fileName,
      filename: filename || fileName,
      file_type: file_type,
      size: binary.length
    }), { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      }
    })

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      }
    })
  }
}) 