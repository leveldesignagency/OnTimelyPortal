import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushNotificationData {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  categoryId?: string;
  mutableContent?: boolean;
  priority?: 'default' | 'normal' | 'high';
  subtitle?: string;
  ttl?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get request body
    const { notificationId, guestEmail, title, body, data, badge } = await req.json()

    if (!notificationId || !guestEmail || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: notificationId, guestEmail, title, body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get push tokens for the guest
    const { data: tokens, error: tokenError } = await supabase
      .rpc('get_guest_push_tokens', { guest_email: guestEmail })

    if (tokenError) {
      console.error('Error fetching push tokens:', tokenError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch push tokens' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!tokens || tokens.length === 0) {
      console.log('No push tokens found for guest:', guestEmail)
      return new Response(
        JSON.stringify({ message: 'No push tokens found for guest' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prepare notification data
    const pushTokens = tokens.map((t: any) => t.expo_push_token)
    
    const notificationData: PushNotificationData = {
      to: pushTokens,
      title,
      body,
      data: {
        notificationId,
        ...data
      },
      sound: 'default',
      badge: badge || 1,
      priority: 'high',
    }

    // Send push notification via Expo
    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notificationData),
    })

    if (!expoResponse.ok) {
      const errorText = await expoResponse.text()
      console.error('Expo API error:', errorText)
      
      // Update notification record with error
      await supabase
        .from('itinerary_module_notifications')
        .update({ 
          push_error: `Expo API error: ${errorText}`,
          push_sent: false
        })
        .eq('id', notificationId)

      return new Response(
        JSON.stringify({ error: 'Failed to send push notification via Expo' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const expoResult = await expoResponse.json()
    console.log('Expo push notification result:', expoResult)

    // Update notification record with success
    await supabase
      .from('itinerary_module_notifications')
      .update({ 
        push_sent: true,
        push_sent_at: new Date().toISOString(),
        push_error: null
      })
      .eq('id', notificationId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Push notification sent successfully',
        expoResult 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in send-push-notification function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 