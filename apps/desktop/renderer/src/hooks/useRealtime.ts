import { useEffect, useState, useCallback } from 'react'
import { supabase, subscribeToEvents, subscribeToGuests, type Event, type Guest } from '../lib/supabase'

// Hook for real-time events
export const useRealtimeEvents = () => {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setEvents(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()

    // Set up real-time subscription
    const subscription = subscribeToEvents((payload) => {
      console.log('Real-time event update:', payload)
      
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
  }, [fetchEvents])

  return { events, loading, error, refetch: fetchEvents }
}

// Hook for real-time guests
export const useRealtimeGuests = (eventId: string) => {
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

// Hook for connection status
export const useSupabaseConnection = () => {
  const [isConnected, setIsConnected] = useState(true)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  useEffect(() => {
    // Monitor connection status
    const channel = supabase.channel('connection-test')
    
    channel
      .on('system', {}, (payload) => {
        if (payload.type === 'connected') {
          setIsConnected(true)
          setConnectionError(null)
        } else if (payload.type === 'error') {
          setIsConnected(false)
          setConnectionError('Connection lost')
        }
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