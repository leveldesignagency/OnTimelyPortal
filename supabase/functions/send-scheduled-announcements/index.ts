import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get current time
    const now = new Date()
    const currentTime = now.toISOString()

    // Find announcements that are scheduled to be sent now or in the past
    const { data: scheduledAnnouncements, error } = await supabase
      .from('announcements')
      .select('*')
      .not('scheduled_for', 'is', null)
      .not('sent_at', 'is', null)
      .lte('scheduled_for', currentTime)

    if (error) {
      console.error('Error fetching scheduled announcements:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch scheduled announcements' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${scheduledAnnouncements?.length || 0} scheduled announcements to send`)

    // Process each scheduled announcement
    for (const announcement of scheduledAnnouncements || []) {
      try {
        // Update the announcement to mark it as sent
        const { error: updateError } = await supabase
          .from('announcements')
          .update({ 
            sent_at: currentTime,
            updated_at: currentTime
          })
          .eq('id', announcement.id)

        if (updateError) {
          console.error('Error updating announcement:', updateError)
          continue
        }

        // TODO: Send push notifications to all guests for this event
        // This would involve:
        // 1. Fetching all guests for the event
        // 2. Getting their push tokens
        // 3. Sending push notifications

        console.log(`Processed scheduled announcement: ${announcement.title}`)
      } catch (error) {
        console.error('Error processing announcement:', error)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: scheduledAnnouncements?.length || 0 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in scheduled announcements function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 
    // Update announcements as sent
    const announcementIds = scheduledAnnouncements.map(a => a.id)
    const { error: updateError } = await supabase
      .from('announcements')
      .update({ sent_at: now })
      .in('id', announcementIds)

    if (updateError) {
      throw updateError
    }

    // Send push notifications for each announcement
    const notificationPromises = scheduledAnnouncements.map(async (announcement) => {
      try {
        // Get all guests for this event
        const { data: guests, error: guestsError } = await supabase
          .from('guests')
          .select('id, email, contact_number')
          .eq('event_id', announcement.event_id)

        if (guestsError) {
          console.error('Error fetching guests:', guestsError)
          return
        }

        // Send push notifications to all guests
        for (const guest of guests || []) {
          // Here you would integrate with your push notification service
          // For now, we'll just log the notification
          console.log(`Sending announcement "${announcement.title}" to guest ${guest.email}`)
          
          // TODO: Integrate with actual push notification service
          // await sendPushNotification({
          //   to: guest.push_token,
          //   title: 'New Announcement',
          //   body: announcement.title,
          //   data: {
          //     type: 'announcement',
          //     announcementId: announcement.id,
          //     eventId: announcement.event_id
          //   }
          // })
        }
      } catch (error) {
        console.error('Error sending notification for announcement:', announcement.id, error)
      }
    })

    await Promise.all(notificationPromises)

    return new Response(
      JSON.stringify({ 
        message: `Sent ${scheduledAnnouncements.length} announcements`,
        announcements: scheduledAnnouncements.map(a => ({ id: a.id, title: a.title }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-scheduled-announcements:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 