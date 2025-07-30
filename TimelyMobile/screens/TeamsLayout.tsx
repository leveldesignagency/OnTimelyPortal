import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface TeamsLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function TeamsLayout({ children, activeTab, onTabChange }: TeamsLayoutProps) {
  const insets = useSafeAreaInsets();

  const tabs = [
    { id: 'create', label: 'Create Team', icon: 'plus-circle' },
    { id: 'chat', label: 'Chat', icon: 'chat' },
    { id: 'calendar', label: 'Calendar', icon: 'calendar' },
    // Canvas excluded as requested
  ];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Main Content */}
      <View style={styles.content}>
        {children}
      </View>

      {/* Bottom Tab Navigation */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabItem,
              activeTab === tab.id && styles.activeTabItem
            ]}
            onPress={() => onTabChange(tab.id)}
          >
            <MaterialCommunityIcons
              name={tab.icon as any}
              size={24}
              color={activeTab === tab.id ? '#fff' : '#888'}
            />
            <Text style={[
              styles.tabLabel,
              activeTab === tab.id && styles.activeTabLabel
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTabItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    textAlign: 'center',
  },
  activeTabLabel: {
    color: '#fff',
  },
}); 