import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useRealtimeGuests(eventId: string | null) {
  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) {
      setGuests([]);
      setLoading(false);
      return;
    }

    const loadGuests = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('User not authenticated');
          return;
        }

        const { data: userProfile } = await supabase
          .from('users')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (userProfile?.company_id) {
          const { data: guestsData, error } = await supabase
            .from('guests')
            .select('*')
            .eq('event_id', eventId)
            .eq('company_id', userProfile.company_id)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error loading guests:', error);
            setError('Failed to load guests');
          } else {
            setGuests(guestsData || []);
          }
        }
      } catch (err) {
        console.error('Error loading guests:', err);
        setError('Failed to load guests');
      } finally {
        setLoading(false);
      }
    };

    loadGuests();

    // Set up real-time subscription
    const channel = supabase
      .channel(`guests-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guests',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          console.log('🔄 Real-time guest change:', payload.eventType, payload);
          if (payload.eventType === 'INSERT') {
            setGuests(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setGuests(prev => 
              prev.map(guest => 
                guest.id === payload.new.id ? payload.new : guest
              )
            );
          } else if (payload.eventType === 'DELETE') {
            console.log('🗑️ Deleting guest from real-time:', payload.old.id);
            setGuests(prev => 
              prev.filter(guest => guest.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const refetch = async () => {
    if (!eventId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return;
      }

      const { data: userProfile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (userProfile?.company_id) {
        const { data: guestsData, error } = await supabase
          .from('guests')
          .select('*')
          .eq('event_id', eventId)
          .eq('company_id', userProfile.company_id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error refetching guests:', error);
          setError('Failed to load guests');
        } else {
          setGuests(guestsData || []);
        }
      }
    } catch (err) {
      console.error('Error refetching guests:', err);
      setError('Failed to load guests');
    } finally {
      setLoading(false);
    }
  };

  return { guests, loading, error, refetch };
}

export function useRealtimeItineraries(eventId: string | null) {
  const [itineraries, setItineraries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) {
      setItineraries([]);
      setLoading(false);
      return;
    }

    const loadItineraries = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('User not authenticated');
          return;
        }

        const { data: userProfile } = await supabase
          .from('users')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (userProfile?.company_id) {
          const { data: itinerariesData, error } = await supabase
            .from('itineraries')
            .select('*')
            .eq('event_id', eventId)
            .eq('company_id', userProfile.company_id)
            .order('date', { ascending: true });

          if (error) {
            console.error('Error loading itineraries:', error);
            setError('Failed to load itineraries');
          } else {
            setItineraries(itinerariesData || []);
          }
        }
      } catch (err) {
        console.error('Error loading itineraries:', err);
        setError('Failed to load itineraries');
      } finally {
        setLoading(false);
      }
    };

    loadItineraries();

    // Set up real-time subscription
    const channel = supabase
      .channel(`itineraries-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'itineraries',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          console.log('🔄 Real-time itinerary change:', payload.eventType, payload);
          if (payload.eventType === 'INSERT') {
            setItineraries(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setItineraries(prev => 
              prev.map(itinerary => 
                itinerary.id === payload.new.id ? payload.new : itinerary
              )
            );
          } else if (payload.eventType === 'DELETE') {
            console.log('🗑️ Deleting itinerary from real-time:', payload.old.id);
            setItineraries(prev => 
              prev.filter(itinerary => itinerary.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const refetch = async () => {
    if (!eventId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return;
      }

      const { data: userProfile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (userProfile?.company_id) {
        const { data: itinerariesData, error } = await supabase
          .from('itineraries')
          .select('*')
          .eq('event_id', eventId)
          .eq('company_id', userProfile.company_id)
          .order('date', { ascending: true });

        if (error) {
          console.error('Error refetching itineraries:', error);
          setError('Failed to load itineraries');
        } else {
          setItineraries(itinerariesData || []);
        }
      }
    } catch (err) {
      console.error('Error refetching itineraries:', err);
      setError('Failed to load itineraries');
    } finally {
      setLoading(false);
    }
  };

  return { itineraries, loading, error, refetch };
} 