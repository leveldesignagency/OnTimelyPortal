import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { alertService } from '../lib/alertService';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('🗺️ Map Error Boundary caught error:', error, errorInfo);
    
    // Show user-friendly error
    if (error.message.includes('api.mapbox.com')) {
      alertService.error(
        'Map Connection Issue',
        'Unable to connect to map service. This might be due to network issues or service downtime.'
      );
    } else {
      alertService.error('Map Error', 'There was an unexpected error with the map.');
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={48} color="#FF3B30" />
          <Text style={styles.errorTitle}>Map Error</Text>
          <Text style={styles.errorText}>
            {this.state.error?.message.includes('api.mapbox.com')
              ? 'Unable to connect to map service. Please check your internet connection.'
              : 'There was an unexpected error loading the map.'
            }
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#23242b',
    padding: 20,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 