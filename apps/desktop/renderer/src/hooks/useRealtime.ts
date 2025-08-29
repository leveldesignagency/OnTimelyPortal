import { useEffect, useState, useCallback } from 'react'
import { supabase, subscribeToEvents, subscribeToGuests, subscribeToItineraries, getItineraries, type SupabaseEvent, type Guest, type Itinerary } from '../lib/supabase'
import { getCurrentUser } from '../lib/auth'

// Hook for real-time events
export const useRealtimeEvents = (companyId?: string | null) => {
  const [events, setEvents] = useState<SupabaseEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    if (!companyId) {
      setEvents([])
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      
      // Get current user to check their access
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('❌ No authenticated user found in useRealtime')
        setEvents([])
        setLoading(false)
        return
      }

      // Get events the user is assigned to via teams
      const { data: teamMemberships, error: teamMembershipsError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)

      if (teamMembershipsError) {
        console.error('❌ Failed to fetch team memberships:', teamMembershipsError)
        setEvents([])
        setLoading(false)
        return
      }

      const teamIds = (teamMemberships || []).map(tm => tm.team_id)
      
      // Get events created by the user
      const { data: userCreatedEvents, error: userEventsError } = await supabase
        .from('events')
        .select('*')
        .eq('company_id', companyId)
        .eq('created_by', user.id)

      if (userEventsError) {
        console.error('❌ Failed to fetch user created events:', userEventsError)
        setEvents([])
        setLoading(false)
        return
      }

      // Get events the user is assigned to via teams
      let teamAssignedEvents: any[] = []
      if (teamIds.length > 0) {
        const { data: teamEvents, error: teamEventsError } = await supabase
          .from('team_events')
          .select('event_id')
          .in('team_id', teamIds)

        if (teamEventsError) {
          console.error('❌ Failed to fetch team events:', teamEventsError)
        } else {
          const eventIds = (teamEvents || []).map(te => te.event_id)
          
          if (eventIds.length > 0) {
            const { data: assignedEvents, error: assignedEventsError } = await supabase
              .from('events')
              .select('*')
              .eq('company_id', companyId)
              .in('id', eventIds)

            if (assignedEventsError) {
              console.error('❌ Failed to fetch assigned events:', assignedEventsError)
            } else {
              teamAssignedEvents = assignedEvents || []
            }
          }
        }
      }

      // Merge and deduplicate events
      const allEvents = [...(userCreatedEvents || []), ...teamAssignedEvents]
      const dedupedEvents = Object.values(
        allEvents.reduce((acc: Record<string, any>, event: any) => {
          acc[event.id] = event
          return acc
        }, {})
      )

      console.log(`✅ useRealtime: User ${user.email} can see ${dedupedEvents.length} events`)
      setEvents(dedupedEvents)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchEvents()

    if (!companyId) return

    // Set up real-time subscription
    const subscription = subscribeToEvents((payload) => {
      console.log('Real-time event update:', payload)
      
      // Additional security check: only process updates for the current company
      if (payload.new?.company_id !== companyId) {
        return // Ignore updates from other companies
      }
      
      if (payload.eventType === 'INSERT') {
        setEvents(prev => [payload.new, ...prev])
      } else if (payload.eventType === 'UPDATE') {
        setEvents(prev => prev.map(event => 
          event.id === payload.new.id ? payload.new : event
        ))
      } else if (payload.eventType === 'DELETE') {
        setEvents(prev => prev.filter(event => event.id !== payload.old.id))
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchEvents, companyId])

  return { events, loading, error, refetch: fetchEvents }
}

// Hook for real-time guests
export const useRealtimeGuests = (eventId: string | null) => {
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGuests = useCallback(async () => {
    if (!eventId) return
    
    try {
      setLoading(true)
      console.log('🔄 Fetching guests for event:', eventId)
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      console.log('✅ Fetched guests:', data?.length || 0, 'guests')
      setGuests(data || [])
    } catch (err) {
      console.error('❌ Error fetching guests:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    if (!eventId) return
    
    fetchGuests()

    // Set up real-time subscription
    console.log('🔌 Setting up real-time subscription for guests, event:', eventId)
    const subscription = subscribeToGuests(eventId, (payload) => {
      console.log('📡 Real-time guest update received:', payload)
      
      if (payload.eventType === 'INSERT') {
        console.log('➕ New guest inserted:', payload.new)
        setGuests(prev => [payload.new, ...prev])
      } else if (payload.eventType === 'UPDATE') {
        console.log('✏️ Guest updated:', payload.new)
        setGuests(prev => prev.map(guest => 
          guest.id === payload.new.id ? payload.new : guest
        ))
      } else if (payload.eventType === 'DELETE') {
        console.log('🗑️ Guest deleted:', payload.old)
        setGuests(prev => prev.filter(guest => guest.id !== payload.old.id))
      }
    })

    return () => {
      console.log('🔌 Unsubscribing from guests real-time updates')
      subscription.unsubscribe()
    }
  }, [eventId, fetchGuests])

  return { guests, loading, error, refetch: fetchGuests }
}

// Hook for real-time itineraries
export const useRealtimeItineraries = (eventId: string | null) => {
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchItineraries = useCallback(async () => {
    if (!eventId) return
    
    try {
      setLoading(true)
      const currentUser = await getCurrentUser()
      const data = await getItineraries(eventId, currentUser?.company_id)
      setItineraries(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    if (!eventId) return
    
    fetchItineraries()

    // Set up real-time subscription
    const subscription = subscribeToItineraries(eventId, async (payload) => {
      console.log('Real-time itinerary update:', payload)
      
      // Additional security check: only process updates for the current user's company
      const currentUser = await getCurrentUser()
      if (currentUser && payload.new?.company_id !== currentUser.company_id) {
        return // Ignore updates from other companies
      }
      
      if (payload.eventType === 'INSERT') {
        setItineraries(prev => [payload.new, ...prev])
      } else if (payload.eventType === 'UPDATE') {
        setItineraries(prev => prev.map(itinerary => 
          itinerary.id === payload.new.id ? payload.new : itinerary
        ))
      } else if (payload.eventType === 'DELETE') {
        setItineraries(prev => prev.filter(itinerary => itinerary.id !== payload.old.id))
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [eventId, fetchItineraries])

  return { itineraries, loading, error, refetch: fetchItineraries }
}

// Hook for connection status
export const useSupabaseConnection = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  useEffect(() => {
    const channel = supabase.channel('connection-test')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        // Connection test
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          setConnectionError(null)
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false)
          setConnectionError('Failed to connect to real-time server')
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [])

  return { isConnected, connectionError }
} 