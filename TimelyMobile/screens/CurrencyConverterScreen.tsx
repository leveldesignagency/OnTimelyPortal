import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCurrencyList, convertCurrency } from '../lib/currencyService';

const CURRENCIES = getCurrencyList();

export default function CurrencyConverterScreen({ navigation }: { navigation?: any }) {
  const insets = useSafeAreaInsets();
  
  const [sourceCurrency, setSourceCurrency] = useState('USD');
  const [targetCurrency, setTargetCurrency] = useState('EUR');
  const [amount, setAmount] = useState('');
  const [converted, setConverted] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [showCurrencySelector, setShowCurrencySelector] = useState<'source' | 'target' | null>(null);
  const [recent, setRecent] = useState<Array<{from: string, to: string, amount: string, result: string, timestamp: Date}>>([]);

  const handleConvert = async () => {
    if (!amount || isNaN(Number(amount))) {
      Alert.alert('Invalid amount', 'Please enter a valid number.');
      return;
    }
    setIsConverting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await convertCurrency(Number(amount), sourceCurrency, targetCurrency);
      setConverted(result);
      setRecent(prev => [{from: sourceCurrency, to: targetCurrency, amount, result, timestamp: new Date()}, ...prev.slice(0, 9)]);
    } catch (e) {
      setConverted('Error');
    } finally {
      setIsConverting(false);
    }
  };

  const handleSwap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSourceCurrency(targetCurrency);
    setTargetCurrency(sourceCurrency);
    setConverted('');
  };

  const getCurrencyFlag = (code: string) => {
    return CURRENCIES.find(c => c.code === code)?.flag || '💱';
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Currency Converter</Text>
          <View style={{ width: 32 }} />
        </View>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.currencyContainer}>
            <TouchableOpacity style={styles.currencyButton} onPress={() => setShowCurrencySelector('source')}>
              <Text style={styles.currencyFlag}>{getCurrencyFlag(sourceCurrency)}</Text>
              {/* Only flag shown */}
              <Ionicons name="chevron-down" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.swapButton, { backgroundColor: '#fff' }]} onPress={handleSwap}>
              <Ionicons name="swap-horizontal" size={20} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.currencyButton} onPress={() => setShowCurrencySelector('target')}>
              <Text style={styles.currencyFlag}>{getCurrencyFlag(targetCurrency)}</Text>
              {/* Only flag shown */}
              <Ionicons name="chevron-down" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder={`Enter amount in ${sourceCurrency}...`}
              placeholderTextColor="#666"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity style={styles.convertButton} onPress={handleConvert} disabled={isConverting}>
              {isConverting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="cash-outline" size={20} color="#000" />
                  <Text style={styles.convertButtonText}>Convert</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          {converted !== '' && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultText}>{amount} {sourceCurrency} = {converted} {targetCurrency}</Text>
            </View>
          )}
          {recent.length > 0 && (
            <View style={styles.recentContainer}>
              <Text style={styles.sectionTitle}>Recent Conversions</Text>
              {recent.map((item, idx) => (
                <View key={idx} style={styles.recentItem}>
                  <Text style={styles.recentText}>{item.amount} {item.from} → {item.result} {item.to}</Text>
                  <Text style={styles.recentTime}>{item.timestamp.toLocaleTimeString()}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
        {showCurrencySelector && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select {showCurrencySelector === 'source' ? 'Source' : 'Target'} Currency</Text>
                <TouchableOpacity onPress={() => setShowCurrencySelector(null)} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.currencyList}>
                {CURRENCIES.map(currency => (
                  <TouchableOpacity
                    key={currency.code}
                    style={styles.currencyItem}
                    onPress={() => {
                      if (showCurrencySelector === 'source') setSourceCurrency(currency.code);
                      else setTargetCurrency(currency.code);
                      setShowCurrencySelector(null);
                    }}
                  >
                    <Text style={styles.currencyFlag}>{currency.flag}</Text>
                    <Text style={styles.currencyName}>{currency.name} ({currency.code})</Text>
                    {(showCurrencySelector === 'source' ? sourceCurrency : targetCurrency) === currency.code && (
                      <Ionicons name="checkmark" size={20} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#181A20' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  content: { flex: 1, padding: 20 },
  currencyContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  currencyButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#23242b', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, flex: 1, marginHorizontal: 8 },
  currencyFlag: { fontSize: 20, marginRight: 8 },
  swapButton: { padding: 12, borderRadius: 12, marginHorizontal: 8 },
  inputContainer: { marginBottom: 24 },
  textInput: { backgroundColor: '#23242b', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, minHeight: 48 },
  convertButton: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, marginTop: 16 },
  convertButtonText: { color: '#000', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  resultContainer: { backgroundColor: '#23242b', borderRadius: 12, padding: 16, marginBottom: 24 },
  resultText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  recentContainer: { marginBottom: 24 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  recentItem: { backgroundColor: '#23242b', borderRadius: 12, padding: 12, marginBottom: 8 },
  recentText: { color: '#fff', fontSize: 15 },
  recentTime: { color: '#666', fontSize: 12 },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: '#23242b', borderRadius: 16, width: '90%', maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#333' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  closeButton: { padding: 4 },
  currencyList: { maxHeight: 400 },
  currencyItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
  currencyName: { color: '#fff', fontSize: 16, flex: 1 },
}); 