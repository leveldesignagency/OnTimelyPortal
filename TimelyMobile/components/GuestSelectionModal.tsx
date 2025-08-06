import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Guest {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
}

interface GuestSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (selectedGuestIds: string[]) => void;
  guests: Guest[];
  moduleType: string;
}

export default function GuestSelectionModal({
  visible,
  onClose,
  onConfirm,
  guests,
  moduleType,
}: GuestSelectionModalProps) {
  const [selectedGuests, setSelectedGuests] = useState<string[]>([]);

  const getModuleDisplayName = (type: string) => {
    const displayNames: { [key: string]: string } = {
      question: 'Question',
      feedback: 'Feedback',
      multiple_choice: 'Multiple Choice',
      photo_video: 'Photo/Video'
    };
    return displayNames[type] || type;
  };

  const handleSelectAll = () => {
    setSelectedGuests(guests.map(guest => guest.id));
  };

  const handleClearAll = () => {
    setSelectedGuests([]);
  };

  const handleToggleGuest = (guestId: string) => {
    setSelectedGuests(prev => 
      prev.includes(guestId) 
        ? prev.filter(id => id !== guestId)
        : [...prev, guestId]
    );
  };

  const handleConfirm = () => {
    if (selectedGuests.length === 0) {
      Alert.alert(
        'No Guests Selected',
        'Please select at least one guest to assign this module to.',
        [{ text: 'OK' }]
      );
      return;
    }
    onConfirm(selectedGuests);
  };

  const getGuestDisplayName = (guest: Guest) => {
    if (guest.first_name || guest.last_name) {
      return `${guest.first_name || ''} ${guest.last_name || ''}`.trim();
    }
    return guest.email;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>
              Select Guests for {getModuleDisplayName(moduleType)}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.selectionButton}
              onPress={handleSelectAll}
            >
              <Text style={styles.selectionButtonText}>Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.selectionButton}
              onPress={handleClearAll}
            >
              <Text style={styles.selectionButtonText}>Clear All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.guestList}>
            {guests.map(guest => (
              <TouchableOpacity
                key={guest.id}
                style={[
                  styles.guestItem,
                  selectedGuests.includes(guest.id) && styles.guestItemSelected
                ]}
                onPress={() => handleToggleGuest(guest.id)}
              >
                <View style={styles.checkbox}>
                  {selectedGuests.includes(guest.id) && (
                    <MaterialCommunityIcons 
                      name="check" 
                      size={16} 
                      color="#fff" 
                    />
                  )}
                </View>
                <View style={styles.guestInfo}>
                  <Text style={styles.guestName}>
                    {getGuestDisplayName(guest)}
                  </Text>
                  <Text style={styles.guestEmail}>{guest.email}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                selectedGuests.length === 0 && styles.confirmButtonDisabled
              ]}
              onPress={handleConfirm}
              disabled={selectedGuests.length === 0}
            >
              <Text style={styles.confirmButtonText}>
                Assign to {selectedGuests.length} Guest{selectedGuests.length !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  selectionButton: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  guestList: {
    flex: 1,
    marginBottom: 20,
  },
  guestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    marginBottom: 8,
  },
  guestItemSelected: {
    backgroundColor: '#3b82f6',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#666',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestInfo: {
    flex: 1,
  },
  guestName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 2,
  },
  guestEmail: {
    fontSize: 12,
    color: '#999',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#444',
    opacity: 0.6,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 