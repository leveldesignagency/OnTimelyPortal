import { useEffect, useState, useCallback } from 'react'
import { supabase, subscribeToEvents, subscribeToGuests, subscribeToItineraries, getItineraries, type Event, type Guest, type Itinerary } from '../lib/supabase'
import { getCurrentUser } from '../lib/auth'

// Hook for real-time events
export const useRealtimeEvents = (companyId?: string | null) => {
  const [events, setEvents] = useState<Event[]>([])
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
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setEvents(data || [])
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
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setGuests(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    if (!eventId) return
    
    fetchGuests()

    // Set up real-time subscription
    const subscription = subscribeToGuests(eventId, (payload) => {
      console.log('Real-time guest update:', payload)
      
      if (payload.eventType === 'INSERT') {
        setGuests(prev => [payload.new, ...prev])
      } else if (payload.eventType === 'UPDATE') {
        setGuests(prev => prev.map(guest => 
          guest.id === payload.new.id ? payload.new : guest
        ))
      } else if (payload.eventType === 'DELETE') {
        setGuests(prev => prev.filter(guest => guest.id !== payload.old.id))
      }
    })

    return () => {
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
      const currentUser = getCurrentUser()
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
    const subscription = subscribeToItineraries(eventId, (payload) => {
      console.log('Real-time itinerary update:', payload)
      
      // Additional security check: only process updates for the current user's company
      const currentUser = getCurrentUser()
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