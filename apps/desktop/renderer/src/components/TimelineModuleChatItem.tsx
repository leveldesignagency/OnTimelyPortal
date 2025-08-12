import React, { useState } from 'react';

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
  isDark: boolean;
}

export default function TimelineModuleChatItem({ module, onPress, isDark }: TimelineModuleChatItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getModuleIcon = (type: string) => {
    switch (type) {
      case 'question': return '❓';
      case 'feedback': return '⭐';
      case 'multiple_choice': return '📋';
      case 'photo_video': return '📷';
      default: return '🧩';
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

  const theme = isDark ? {
    bg: '#2a2a2a',
    text: '#ffffff',
    textSecondary: '#cccccc',
    border: '#404040',
    accent: getModuleColor(module.module_type),
  } : {
    bg: '#ffffff',
    text: '#1a1a1a',
    textSecondary: '#666666',
    border: '#e0e0e0',
    accent: getModuleColor(module.module_type),
  };

  return (
    <div 
      style={{
        backgroundColor: theme.bg,
        borderRadius: '12px',
        padding: '16px',
        margin: '8px 0',
        border: `1px solid ${theme.border}`,
        borderLeft: `4px solid ${theme.accent}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        maxWidth: '520px',
        width: '100%',
        marginLeft: 'auto',
        marginRight: 'auto',
      }}
      onClick={handlePress}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '16px',
            backgroundColor: theme.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
          }}>
            {getModuleIcon(module.module_type)}
          </div>
          <div>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: theme.text,
            }}>
              {getModuleDisplayName(module.module_type)}
            </div>
            <div style={{
              fontSize: '12px',
              color: theme.textSecondary,
            }}>
              {formatTime(module.created_at)}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{
        fontSize: '14px',
        color: theme.text,
        lineHeight: '1.4',
        marginBottom: '8px',
      }}>
        {module.question || module.title || module.label || `New ${getModuleDisplayName(module.module_type)} module available`}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
          borderRadius: '8px',
          border: `1px solid ${theme.border}`,
        }}>
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              fontSize: '12px',
              color: theme.textSecondary,
              fontWeight: '500',
              marginBottom: '4px',
            }}>
              Scheduled for:
            </div>
            <div style={{
              fontSize: '12px',
              color: theme.text,
            }}>
              {module.date} at {module.time}
            </div>
          </div>

          {module.module_type === 'multiple_choice' && module.survey_data && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                fontSize: '12px',
                color: theme.textSecondary,
                fontWeight: '500',
                marginBottom: '4px',
              }}>
                Options:
              </div>
              {module.survey_data.options?.map((option: string, index: number) => (
                <div key={index} style={{
                  fontSize: '12px',
                  color: theme.text,
                  marginLeft: '8px',
                  marginTop: '2px',
                }}>
                  • {option}
                </div>
              ))}
            </div>
          )}

          {module.module_type === 'feedback' && module.feedback_data && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                fontSize: '12px',
                color: theme.textSecondary,
                fontWeight: '500',
                marginBottom: '4px',
              }}>
                Feedback Type:
              </div>
              <div style={{
                fontSize: '12px',
                color: theme.text,
              }}>
                {module.feedback_data.type || 'General Feedback'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '12px',
        paddingTop: '8px',
        borderTop: `1px solid ${theme.border}`,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          backgroundColor: theme.accent,
          borderRadius: '12px',
          fontSize: '10px',
          color: '#ffffff',
          fontWeight: '500',
        }}>
          {getModuleIcon(module.module_type)}
          {getModuleDisplayName(module.module_type)}
        </div>
        <div style={{
          fontSize: '10px',
          color: theme.textSecondary,
        }}>
          {isExpanded ? 'Click to collapse' : 'Click to expand'}
        </div>
      </div>
    </div>
  );
} 