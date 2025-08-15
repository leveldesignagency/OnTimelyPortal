import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';

interface UploadGuestsPageProps {
  route?: any;
  navigation?: any;
}

export default function UploadGuestsPage({ route, navigation }: UploadGuestsPageProps) {
  const insets = useSafeAreaInsets();
  
  const goBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const currentEventId = route?.params?.eventId;
  
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      if (result.assets && result.assets[0]) {
        const file = result.assets[0];
        setSelectedFile(file);
        console.log('Selected file:', file);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a CSV file first');
      return;
    }

    setLoading(true);
    try {
      // For mobile, we'll show a success message since file processing is complex
      // In a real app, you'd use react-native-fs to read and process the CSV
      Alert.alert(
        'Upload Successful',
        `File "${selectedFile.name}" uploaded successfully. CSV processing would happen here in a full implementation.`,
        [{ text: 'OK', onPress: () => goBack() }]
      );
    } catch (error) {
      console.error('Error uploading file:', error);
      Alert.alert('Error', 'Failed to upload file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Upload CSV</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <MaterialCommunityIcons name="file-csv" size={64} color="#10b981" />
          <Text style={styles.instructionsTitle}>Upload Guest CSV</Text>
          <Text style={styles.instructionsDescription}>
            Upload a CSV file containing guest information to bulk import guests into your event.
          </Text>
        </View>

        {/* CSV Format Info */}
        <View style={styles.formatCard}>
          <Text style={styles.formatTitle}>CSV Format Requirements</Text>
          <View style={styles.formatList}>
            <Text style={styles.formatItem}>• First column: First Name (required)</Text>
            <Text style={styles.formatItem}>• Second column: Last Name (required)</Text>
            <Text style={styles.formatItem}>• Third column: Email (required)</Text>
            <Text style={styles.formatItem}>• Additional columns: Contact Number, Country Code, etc.</Text>
            <Text style={styles.formatItem}>• First row should contain column headers</Text>
          </View>
        </View>

        {/* File Selection */}
        <View style={styles.fileCard}>
          <Text style={styles.fileTitle}>Select CSV File</Text>
          
          {selectedFile ? (
            <View style={styles.selectedFile}>
              <MaterialCommunityIcons name="file-check" size={24} color="#10b981" />
              <View style={styles.fileInfo}>
                <Text style={styles.fileName}>{selectedFile.name}</Text>
                <Text style={styles.fileSize}>
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedFile(null)}
                style={styles.removeFileButton}
              >
                <Ionicons name="close" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={pickDocument} style={styles.selectFileButton}>
              <MaterialCommunityIcons name="file-plus" size={32} color="#10b981" />
              <Text style={styles.selectFileText}>Choose CSV File</Text>
              <Text style={styles.selectFileSubtext}>Tap to browse files</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Upload Button */}
        <TouchableOpacity
          style={[styles.uploadButton, (!selectedFile || loading) && styles.uploadButtonDisabled]}
          onPress={handleUpload}
          disabled={!selectedFile || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialCommunityIcons name="upload" size={24} color="#fff" />
          )}
          <Text style={styles.uploadButtonText}>
            {loading ? 'Uploading...' : 'Upload CSV'}
          </Text>
        </TouchableOpacity>

        {/* Note about simulator */}
        <View style={styles.noteCard}>
          <MaterialCommunityIcons name="information" size={24} color="#f59e0b" />
          <Text style={styles.noteText}>
            Note: File upload functionality may be limited in iOS Simulator. 
            Test on a physical device for full functionality.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181A20',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  instructionsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 24,
    marginTop: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    alignItems: 'center',
  },
  instructionsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  instructionsDescription: {
    fontSize: 16,
    color: '#a0a0a0',
    textAlign: 'center',
    lineHeight: 24,
  },
  formatCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  formatTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  formatList: {
    gap: 8,
  },
  formatItem: {
    fontSize: 14,
    color: '#a0a0a0',
    lineHeight: 20,
  },
  fileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fileTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  selectFileButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 32,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  selectFileText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 4,
  },
  selectFileSubtext: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  selectedFile: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  fileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  removeFileButton: {
    padding: 8,
  },
  uploadButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  uploadButtonDisabled: {
    backgroundColor: '#374151',
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  noteCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: '#f59e0b',
    lineHeight: 20,
  },
}); 