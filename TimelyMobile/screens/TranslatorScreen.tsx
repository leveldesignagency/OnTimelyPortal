import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { translateText, getSupportedLanguages, getCommonPhrases } from '../lib/translationService';

// Supported languages with their codes and names
const SUPPORTED_LANGUAGES = getSupportedLanguages();

// Common phrases for quick translation
const COMMON_PHRASES = getCommonPhrases();

interface TranslatorScreenProps {
  navigation?: any;
}

export default function TranslatorScreen({ navigation }: TranslatorScreenProps) {
  const insets = useSafeAreaInsets();
  
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [isTranslating, setIsTranslating] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState<'source' | 'target' | null>(null);
  const [recentTranslations, setRecentTranslations] = useState<Array<{
    original: string;
    translated: string;
    source: string;
    target: string;
    timestamp: Date;
  }>>([]);

  // Translation function using the translation service
  const performTranslation = async (text: string, from: string, to: string) => {
    if (!text.trim()) return '';
    
    setIsTranslating(true);
    
    try {
      const result = await translateText(text, from, to);
      return result.translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      return 'Translation failed. Please try again.';
    } finally {
      setIsTranslating(false);
    }
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const result = await performTranslation(inputText, sourceLanguage, targetLanguage);
    setTranslatedText(result);
    
    // Add to recent translations
    const newTranslation = {
      original: inputText,
      translated: result,
      source: sourceLanguage,
      target: targetLanguage,
      timestamp: new Date(),
    };
    
    setRecentTranslations(prev => [newTranslation, ...prev.slice(0, 9)]);
  };

  const handleSwapLanguages = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);
    setInputText(translatedText);
    setTranslatedText('');
  };

  const handleQuickPhrase = (phrase: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputText(phrase);
  };

  const getLanguageName = (code: string) => {
    return SUPPORTED_LANGUAGES.find(lang => lang.code === code)?.name || code;
  };

  const getLanguageFlag = (code: string) => {
    return SUPPORTED_LANGUAGES.find(lang => lang.code === code)?.flag || '🌐';
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity 
            onPress={() => navigation?.goBack?.()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Translator</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Language Selection */}
          <View style={styles.languageContainer}>
            <TouchableOpacity 
              style={styles.languageButton}
              onPress={() => setShowLanguageSelector('source')}
            >
              <Text style={styles.languageFlag}>{getLanguageFlag(sourceLanguage)}</Text>
              {/* Removed language name for selected */}
              <Ionicons name="chevron-down" size={16} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.swapButton, { backgroundColor: '#fff' }]}
              onPress={handleSwapLanguages}
            >
              <Ionicons name="swap-horizontal" size={20} color="#000" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.languageButton}
              onPress={() => setShowLanguageSelector('target')}
            >
              <Text style={styles.languageFlag}>{getLanguageFlag(targetLanguage)}</Text>
              {/* Removed language name for selected */}
              <Ionicons name="chevron-down" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Translation Area */}
          <View style={styles.translationContainer}>
            {/* Input Area */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Enter text to translate..."
                placeholderTextColor="#666"
                value={inputText}
                onChangeText={setInputText}
                multiline
                textAlignVertical="top"
              />
              {inputText.length > 0 && (
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={() => setInputText('')}
                >
                  <Ionicons name="close-circle" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>

            {/* Translate Button */}
            <TouchableOpacity 
              style={[styles.translateButton, !inputText.trim() && styles.translateButtonDisabled]}
              onPress={handleTranslate}
              disabled={!inputText.trim() || isTranslating}
            >
              {isTranslating ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  <Ionicons name="language" size={20} color="#000" />
                  <Text style={styles.translateButtonText}>Translate</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Output Area */}
            {translatedText && (
              <View style={styles.outputContainer}>
                <Text style={styles.outputText}>{translatedText}</Text>
                <TouchableOpacity 
                  style={styles.copyButton}
                  onPress={() => {
                    // Copy to clipboard
                    Alert.alert('Copied!', 'Translation copied to clipboard');
                  }}
                >
                  <Ionicons name="copy-outline" size={20} color="#007AFF" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Quick Phrases */}
          <View style={styles.quickPhrasesContainer}>
            <Text style={styles.sectionTitle}>Quick Phrases</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.phrasesScroll}>
              {COMMON_PHRASES.map((phrase, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.phraseButton}
                  onPress={() => handleQuickPhrase(phrase.en)}
                >
                  <Text style={styles.phraseText}>{phrase.en}</Text>
                  <Text style={styles.phraseCategory}>{phrase.category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Recent Translations */}
          {recentTranslations.length > 0 && (
            <View style={styles.recentContainer}>
              <Text style={styles.sectionTitle}>Recent Translations</Text>
              {recentTranslations.map((translation, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.recentItem}
                  onPress={() => {
                    setInputText(translation.original);
                    setTranslatedText(translation.translated);
                  }}
                >
                  <View style={styles.recentHeader}>
                    <Text style={styles.recentLanguages}>
                      {getLanguageName(translation.source)} → {getLanguageName(translation.target)}
                    </Text>
                    <Text style={styles.recentTime}>
                      {translation.timestamp.toLocaleTimeString()}
                    </Text>
                  </View>
                  <Text style={styles.recentOriginal} numberOfLines={2}>
                    {translation.original}
                  </Text>
                  <Text style={styles.recentTranslated} numberOfLines={2}>
                    {translation.translated}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Language Selector Modal */}
        {showLanguageSelector && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Select {showLanguageSelector === 'source' ? 'Source' : 'Target'} Language
                </Text>
                <TouchableOpacity 
                  onPress={() => setShowLanguageSelector(null)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.languageList}>
                {SUPPORTED_LANGUAGES.map((language) => (
                  <TouchableOpacity
                    key={language.code}
                    style={styles.languageItem}
                    onPress={() => {
                      if (showLanguageSelector === 'source') {
                        setSourceLanguage(language.code);
                      } else {
                        setTargetLanguage(language.code);
                      }
                      setShowLanguageSelector(null);
                    }}
                  >
                    <Text style={styles.languageItemFlag}>{language.flag}</Text>
                    <Text style={styles.languageItemName}>{language.name}</Text>
                    {(showLanguageSelector === 'source' ? sourceLanguage : targetLanguage) === language.code && (
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
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  settingsButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  languageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23242b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 8,
  },
  languageFlag: {
    fontSize: 20,
    marginRight: 8,
  },
  languageName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  swapButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  translationContainer: {
    marginBottom: 24,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: '#23242b',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  clearButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  translateButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  translateButtonDisabled: {
    backgroundColor: '#333',
  },
  translateButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  outputContainer: {
    backgroundColor: '#23242b',
    borderRadius: 12,
    padding: 16,
    position: 'relative',
  },
  outputText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
  },
  copyButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  quickPhrasesContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  phrasesScroll: {
    marginBottom: 8,
  },
  phraseButton: {
    backgroundColor: '#23242b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 120,
  },
  phraseText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  phraseCategory: {
    color: '#666',
    fontSize: 12,
  },
  recentContainer: {
    marginBottom: 24,
  },
  recentItem: {
    backgroundColor: '#23242b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recentLanguages: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  recentTime: {
    color: '#666',
    fontSize: 12,
  },
  recentOriginal: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  recentTranslated: {
    color: '#ccc',
    fontSize: 14,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#23242b',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  languageList: {
    maxHeight: 400,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  languageItemFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageItemName: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
}); 