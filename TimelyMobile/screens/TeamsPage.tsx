import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CreateTeamPage from './CreateTeamPage';
import ChatListPage from './ChatListPage';
import TeamCalendarPage from './TeamCalendarPage';

const { width } = Dimensions.get('window');

interface TeamsPageProps {
  onNavigate: (route: string) => void;
  onMenuPress?: () => void;
}

export default function TeamsPage({ onNavigate, onMenuPress }: TeamsPageProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('create');

  const tabs = [
    { id: 'create', label: 'Create Team', icon: 'plus-circle' },
    { id: 'chat', label: 'Chat', icon: 'chat' },
    { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'create':
        return <CreateTeamPage onNavigate={onNavigate} />;
      case 'chat':
        return <ChatListPage onNavigate={onNavigate} onMenuPress={onMenuPress} onOpenChat={(chatId, chatName) => {
          // Navigate to chat conversation
          console.log('🚀 TeamsPage: Opening chat:', chatId, chatName);
          onNavigate(`chat-conversation-${chatId}`);
        }} />;
      case 'calendar':
        return <TeamCalendarPage onNavigate={onNavigate} />;
      default:
        return <CreateTeamPage onNavigate={onNavigate} />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Back Button and Hamburger Menu */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => onNavigate('dashboard')} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Workspace</Text>
        
        {onMenuPress && (
          <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
            <MaterialCommunityIcons name="menu" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {renderContent()}
      </View>

      {/* Bottom Tab Navigation */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabItem,
              activeTab === tab.id && styles.activeTabItem
            ]}
            onPress={() => setActiveTab(tab.id)}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  backButton: {
    padding: 8,
  },
  menuButton: {
    padding: 8,
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
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
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