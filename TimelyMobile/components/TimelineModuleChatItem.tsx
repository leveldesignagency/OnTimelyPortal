import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface TimelineModule {
  id: string;
  module_type: 'question' | 'feedback' | 'multiple_choice' | 'photo_video';
  title?: string;
  question?: string;
  time: string;
  date: string;
  event_id: string;
  created_at: string;
  survey_data?: any;
  feedback_data?: any;
  label?: string;
  created_by?: string;
}

interface TimelineModuleChatItemProps {
  module: TimelineModule;
  onPress?: () => void;
}

export default function TimelineModuleChatItem({ module, onPress }: TimelineModuleChatItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getModuleIcon = (type: string) => {
    switch (type) {
      case 'question': return 'help-circle';
      case 'feedback': return 'star';
      case 'multiple_choice': return 'format-list-bulleted';
      case 'photo_video': return 'camera';
      default: return 'puzzle';
    }
  };

  const getModuleColor = (type: string) => {
    switch (type) {
      case 'question': return '#3b82f6';
      case 'feedback': return '#f59e0b';
      case 'multiple_choice': return '#10b981';
      case 'photo_video': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getModuleDisplayName = (type: string) => {
    const displayNames: { [key: string]: string } = {
      question: 'Question',
      feedback: 'Feedback',
      multiple_choice: 'Multiple Choice',
      photo_video: 'Photo/Video'
    };
    return displayNames[type] || type;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handlePress = () => {
    setIsExpanded(!isExpanded);
    if (onPress) {
      onPress();
    }
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity 
        style={styles.container} 
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, { backgroundColor: getModuleColor(module.module_type) }]}>
              <MaterialCommunityIcons 
                name={getModuleIcon(module.module_type)} 
                size={16} 
                color="#ffffff" 
              />
            </View>
            <Text style={styles.title}>
              {getModuleDisplayName(module.module_type)}
            </Text>
          </View>
          <Text style={styles.time}>{formatTime(module.created_at)}</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.description}>
            {module.question || module.title || module.label || `New ${getModuleDisplayName(module.module_type)} module available`}
          </Text>

          {isExpanded && (
            <View style={styles.expandedContent}>
              <View style={styles.infoSection}>
                <Text style={styles.sectionLabel}>Scheduled for:</Text>
                <Text style={styles.infoText}>
                  {module.date} at {module.time}
                </Text>
              </View>

              {module.module_type === 'multiple_choice' && module.survey_data && (
                <View style={styles.infoSection}>
                  <Text style={styles.sectionLabel}>Options:</Text>
                  {module.survey_data.options?.map((option: string, index: number) => (
                    <Text key={index} style={styles.optionText}>• {option}</Text>
                  ))}
                </View>
              )}

              {module.module_type === 'feedback' && module.feedback_data && (
                <View style={styles.infoSection}>
                  <Text style={styles.sectionLabel}>Feedback Type:</Text>
                  <Text style={styles.infoText}>
                    {module.feedback_data.type || 'General Feedback'}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={[styles.badge, { backgroundColor: getModuleColor(module.module_type) }]}>
            <MaterialCommunityIcons 
              name={getModuleIcon(module.module_type)} 
              size={12} 
              color="#ffffff" 
            />
            <Text style={styles.badgeText}>
              {getModuleDisplayName(module.module_type)}
            </Text>
          </View>
          <Text style={styles.expandText}>
            {isExpanded ? 'Tap to collapse' : 'Tap to expand'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginVertical: 8,
  },
  container: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    maxWidth: 350,
    width: '100%',
    overflow: 'hidden',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  time: {
    fontSize: 12,
    color: '#888888',
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 18,
    marginBottom: 8,
  },
  expandedContent: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#404040',
  },
  infoSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#888888',
    fontWeight: '500',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#ffffff',
    marginLeft: 8,
  },
  optionText: {
    fontSize: 12,
    color: '#cccccc',
    marginLeft: 8,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#404040',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '500',
    marginLeft: 4,
  },
  expandText: {
    fontSize: 10,
    color: '#888888',
  },
}); 