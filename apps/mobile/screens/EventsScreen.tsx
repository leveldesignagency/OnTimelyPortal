import React from 'react';
import { View, Text, FlatList } from 'react-native';
import type { Event } from '../../../packages/shared/types/event';

const mockEvents: Event[] = [
  { id: '1', name: 'Launch Party', startDate: '2025-07-01', endDate: '2025-07-02', status: 'PUBLISHED' },
  { id: '2', name: 'Conference', startDate: '2025-08-10', endDate: '2025-08-12', status: 'DRAFT' },
];

export default function EventsScreen() {
  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Events</Text>
      <FlatList
        data={mockEvents}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={{ marginVertical: 10 }}>
            <Text style={{ fontWeight: 'bold' }}>{item.name} ({item.status})</Text>
            <Text>{item.startDate} to {item.endDate}</Text>
          </View>
        )}
      />
    </View>
  );
} 