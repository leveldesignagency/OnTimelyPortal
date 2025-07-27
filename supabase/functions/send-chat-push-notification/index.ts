import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatPushNotificationData {
  notificationId: string;
  messageId: string;
  channelId: string;
  senderEmail: string;
  senderName: string;
  messageText: string;
  eventName: string;
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
    const requestData: ChatPushNotificationData = await req.json()
    
    const { 
      notificationId, 
      messageId, 
      channelId, 
      senderEmail, 
      senderName, 
      messageText, 
      eventName 
    } = requestData

    console.log('[CHAT PUSH] Processing notification:', {
      notificationId,
      messageId,
      senderName,
      eventName,
      messagePreview: messageText.substring(0, 50)
    })

    if (!notificationId || !messageId || !senderEmail || !messageText) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get all participants in the channel (except sender)
    const { data: participants, error: participantsError } = await supabase
      .from('chat_participants')
      .select(`
        id,
        participant_type,
        user_id,
        guest_id,
        users!inner(email, first_name, last_name),
        guests!inner(email, first_name, last_name)
      `)
      .eq('channel_id', channelId)
      .eq('is_active', true)

    if (participantsError) {
      console.error('[CHAT PUSH] Error fetching participants:', participantsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch participants' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('[CHAT PUSH] Found participants:', participants?.length || 0)

    // Filter out the sender and get recipient emails
    const recipients = participants?.filter(p => {
      const userEmail = p.users?.[0]?.email
      const guestEmail = p.guests?.[0]?.email
      const participantEmail = userEmail || guestEmail
      return participantEmail !== senderEmail
    }) || []

    console.log('[CHAT PUSH] Recipients after filtering sender:', recipients.length)

    let totalSent = 0
    let totalErrors = 0

    // Send push notifications to each recipient
    for (const recipient of recipients) {
      try {
        const recipientEmail = recipient.users?.[0]?.email || recipient.guests?.[0]?.email
        
        if (!recipientEmail) {
          console.warn('[CHAT PUSH] No email found for recipient:', recipient.id)
          continue
        }

        console.log('[CHAT PUSH] Processing recipient:', recipientEmail)

        // Get push tokens for this recipient
        const { data: tokens, error: tokenError } = await supabase
          .rpc('get_guest_push_tokens', { guest_email: recipientEmail })

        if (tokenError) {
          console.error('[CHAT PUSH] Error fetching tokens for', recipientEmail, ':', tokenError)
          totalErrors++
          continue
        }

        if (!tokens || tokens.length === 0) {
          console.log('[CHAT PUSH] No push tokens found for:', recipientEmail)
          continue
        }

        const pushTokens = tokens.map((t: any) => t.expo_push_token)
        console.log('[CHAT PUSH] Found', pushTokens.length, 'tokens for', recipientEmail)

        // Prepare notification data
        const notificationData = {
          to: pushTokens,
          title: `${eventName} - ${senderName}`,
          body: messageText.length > 100 
            ? messageText.substring(0, 100) + '...' 
            : messageText,
          data: {
            type: 'chat_message',
            messageId,
            channelId,
            eventName,
            senderName,
            senderEmail,
            notificationId
          },
          sound: 'default',
          badge: 1,
          priority: 'high',
          channelId: 'chat-messages',
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
          console.error('[CHAT PUSH] Expo API error for', recipientEmail, ':', errorText)
          totalErrors++
          
          // Update notification record with error
          await supabase
            .from('chat_notifications')
            .update({ 
              error_message: `Expo API error: ${errorText}`,
              is_sent: false
            })
            .eq('id', notificationId)
          
          continue
        }

        const expoResult = await expoResponse.json()
        console.log('[CHAT PUSH] Expo result for', recipientEmail, ':', expoResult)

        // Check for push receipt errors
        const hasErrors = expoResult.data?.some((receipt: any) => receipt.status === 'error')
        
        if (hasErrors) {
          const errorDetails = expoResult.data?.filter((r: any) => r.status === 'error')
          console.error('[CHAT PUSH] Push receipt errors:', errorDetails)
          totalErrors++
        } else {
          totalSent++
        }

      } catch (error) {
        console.error('[CHAT PUSH] Error processing recipient:', error)
        totalErrors++
      }
    }

    // Update notification record with final status
    const finalStatus = totalErrors === 0 && totalSent > 0
    await supabase
      .from('chat_notifications')
      .update({ 
        is_sent: finalStatus,
        sent_at: finalStatus ? new Date().toISOString() : null,
        error_message: totalErrors > 0 ? `Partial delivery: ${totalSent} sent, ${totalErrors} errors` : null
      })
      .eq('id', notificationId)

    console.log('[CHAT PUSH] Final status:', {
      totalSent,
      totalErrors,
      finalStatus,
      notificationId
    })

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Chat push notification processed',
        sent: totalSent,
        errors: totalErrors,
        recipients: recipients.length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('[CHAT PUSH] Error in send-chat-push-notification function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 
 
 
 