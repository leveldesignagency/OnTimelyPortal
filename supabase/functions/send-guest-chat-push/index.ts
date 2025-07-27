import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GuestChatPushData {
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
    const { 
      notificationId, 
      messageId, 
      eventId, 
      recipientEmail, 
      senderEmail,
      senderName,
      title, 
      body, 
      data, 
      badge 
    } = await req.json()

    console.log('[GUEST CHAT PUSH] Processing notification:', {
      notificationId,
      messageId,
      eventId,
      recipientEmail,
      senderName,
      messagePreview: body?.substring(0, 50)
    })

    if (!notificationId || !recipientEmail || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: notificationId, recipientEmail, title, body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get push tokens for the recipient using existing function
    const { data: tokens, error: tokenError } = await supabase
      .rpc('get_guest_push_tokens', { guest_email: recipientEmail })

    if (tokenError) {
      console.error('[GUEST CHAT PUSH] Error fetching push tokens:', tokenError)
      
      // Update notification record with error
      await supabase
        .from('guests_chat_notifications')
        .update({ 
          push_error: `Token fetch error: ${tokenError.message}`,
          push_sent: false
        })
        .eq('id', notificationId)

      return new Response(
        JSON.stringify({ error: 'Failed to fetch push tokens' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!tokens || tokens.length === 0) {
      console.log('[GUEST CHAT PUSH] No push tokens found for recipient:', recipientEmail)
      
      // Update notification record
      await supabase
        .from('guests_chat_notifications')
        .update({ 
          push_error: 'No push tokens found for recipient',
          push_sent: false
        })
        .eq('id', notificationId)

      return new Response(
        JSON.stringify({ message: 'No push tokens found for recipient' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prepare notification data
    const pushTokens = tokens.map((t: any) => t.expo_push_token)
    
    const notificationData: GuestChatPushData = {
      to: pushTokens,
      title,
      body,
      data: {
        type: 'guest_chat',
        notificationId,
        messageId,
        eventId,
        senderEmail,
        senderName,
        ...data
      },
      sound: 'default',
      badge: badge || 1,
      priority: 'high',
      channelId: 'guest-chat',
    }

    console.log('[GUEST CHAT PUSH] Sending to', pushTokens.length, 'devices for', recipientEmail)

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
      console.error('[GUEST CHAT PUSH] Expo API error:', errorText)
      
      // Update notification record with error
      await supabase
        .from('guests_chat_notifications')
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
    console.log('[GUEST CHAT PUSH] Expo result:', expoResult)

    // Check for individual push failures
    const hasErrors = expoResult.data?.some((receipt: any) => receipt.status === 'error')
    const errorDetails = expoResult.data?.filter((receipt: any) => receipt.status === 'error')

    if (hasErrors) {
      console.error('[GUEST CHAT PUSH] Some pushes failed:', errorDetails)
      
      // Update notification record with partial success
      await supabase
        .from('guests_chat_notifications')
        .update({ 
          push_sent: true,
          push_sent_at: new Date().toISOString(),
          push_error: `Partial failure: ${JSON.stringify(errorDetails)}`
        })
        .eq('id', notificationId)
    } else {
      // Update notification record with success
      await supabase
        .from('guests_chat_notifications')
        .update({ 
          push_sent: true,
          push_sent_at: new Date().toISOString(),
          push_error: null
        })
        .eq('id', notificationId)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Guest chat push notification sent successfully',
        recipientEmail,
        tokenCount: pushTokens.length,
        expoResult 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('[GUEST CHAT PUSH] Error in send-guest-chat-push function:', error)
    
    // Try to update notification record with error if possible
    try {
      const { notificationId } = await req.clone().json()
      if (notificationId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        
        await supabase
          .from('guests_chat_notifications')
          .update({ 
            push_error: `Function error: ${error.message}`,
            push_sent: false
          })
          .eq('id', notificationId)
      }
    } catch (updateError) {
      console.error('[GUEST CHAT PUSH] Failed to update notification with error:', updateError)
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 
 
 
 