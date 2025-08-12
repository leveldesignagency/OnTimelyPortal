import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

export default function NotificationsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const eventId = route.params?.eventId || null;

  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [eventFilter, setEventFilter] = useState<string>(eventId || '');
  const [userFilter, setUserFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('users').select('company_id').eq('id', auth.user?.id || '').single();
      const companyId = profile?.company_id;

      setLoading(true);
      const { data: logs } = await supabase
        .from('activity_log')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(200);
      setActivity(logs || []);
      setFiltered(logs || []);

      const { data: eventList } = await supabase
        .from('events')
        .select('id, name')
        .eq('company_id', companyId);
      setEvents(eventList || []);

      if (eventFilter) {
        const { data: teamEvents } = await supabase.from('team_events').select('team_id').eq('event_id', eventFilter);
        const teamIds = (teamEvents || []).map((t: any) => t.team_id);
        const { data: teamMembers } = await supabase.from('team_members').select('user_id').in('team_id', teamIds);
        const userIds = Array.from(new Set((teamMembers || []).map((m: any) => m.user_id)));
        const { data: userList } = await supabase.from('users').select('id, name').eq('company_id', companyId).in('id', userIds);
        setUsers(userList || []);
      } else {
        const { data: userList } = await supabase.from('users').select('id, name').eq('company_id', companyId);
        setUsers(userList || []);
      }
      setLoading(false);
    })();
  }, [eventFilter]);

  useEffect(() => {
    let data = [...activity];
    if (typeFilter) data = data.filter(a => a.action_type === typeFilter);
    if (eventFilter) data = data.filter(a => a.event_id === eventFilter);
    if (userFilter) data = data.filter(a => a.user_id === userFilter);
    if (search) {
      const s = search.toLowerCase();
      data = data.filter(a => (a.details?.event_title || '').toLowerCase().includes(s) || (a.action_type || '').toLowerCase().includes(s));
    }
    setFiltered(data);
  }, [activity, typeFilter, eventFilter, userFilter, search]);

  const actionPhrase = (type: string) => {
    switch (type) {
      case 'event_created': return 'created an event';
      case 'event_updated': return 'updated an event';
      case 'event_deleted': return 'deleted an event';
      case 'guests_added': return 'added guests';
      case 'guest_updated': return 'updated a guest';
      case 'guest_deleted': return 'deleted a guest';
      case 'itinerary_created': return 'created an itinerary';
      case 'itinerary_updated': return 'updated an itinerary';
      case 'itinerary_deleted': return 'deleted an itinerary';
      case 'homepage_updated': return 'updated the homepage';
      case 'chat_message': return 'sent a message';
      case 'chat_attachment': return 'shared an attachment';
      case 'chat_reaction': return 'reacted in chat';
      case 'module_response': return 'submitted a module response';
      case 'timeline_checkpoint': return 'reached a checkpoint';
      default: return type.replace(/_/g, ' ');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#111' }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>Notifications</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)' }}>
          <Text style={{ color: '#fff' }}>Close</Text>
        </TouchableOpacity>
      </View>
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <TextInput value={search} onChangeText={setSearch} placeholder="Search" placeholderTextColor="#888" style={{ backgroundColor: '#222', color: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 }} />
        {/* Simple filter row */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => setTypeFilter('')} style={{ backgroundColor: '#222', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }}><Text style={{ color: '#fff' }}>{typeFilter ? actionPhrase(typeFilter) : 'All Types'}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setEventFilter('')} style={{ backgroundColor: '#222', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }}><Text style={{ color: '#fff' }}>{eventFilter ? (events.find(e=>e.id===eventFilter)?.name || 'Event') : 'All Events'}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setUserFilter('')} style={{ backgroundColor: '#222', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }}><Text style={{ color: '#fff' }}>{userFilter ? (users.find(u=>u.id===userFilter)?.name || 'User') : 'All Users'}</Text></TouchableOpacity>
        </View>
      </View>
      {loading ? (
        <ActivityIndicator color="#999" style={{ marginTop: 20 }} />
      ) : (
        <FlatList data={filtered.slice(0, 100)} keyExtractor={(item) => item.id} renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomColor: '#222', borderBottomWidth: 1 }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>{item.details?.event_title ? `${item.details.event_title}` : ''}</Text>
            <Text style={{ color: '#bbb', marginTop: 2 }}>{actionPhrase(item.action_type)}</Text>
            <Text style={{ color: '#777', marginTop: 2 }}>{new Date(item.created_at).toLocaleString()}</Text>
          </View>
        )} />
      )}
    </View>
  );
}