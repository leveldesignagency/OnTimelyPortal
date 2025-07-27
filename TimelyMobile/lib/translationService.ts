// Translation service using LibreTranslate API (free and open source)
// You can also use Google Translate API, DeepL, or other services

const LIBRE_TRANSLATE_API = 'https://libretranslate.de/translate';

export interface TranslationResult {
  translatedText: string;
  detectedLanguage?: string;
  confidence?: number;
}

export interface Language {
  code: string;
  name: string;
  flag: string;
}

// Mock translation for development (replace with actual API calls)
export const translateText = async (
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<TranslationResult> => {
  if (!text.trim()) {
    return { translatedText: '' };
  }

  try {
    // For development, use mock translations
    const mockTranslations: { [key: string]: { [key: string]: string } } = {
      'en': {
        'es': {
          'Hello': 'Hola',
          'Thank you': 'Gracias',
          'Goodbye': 'Adiós',
          'Please': 'Por favor',
          'Excuse me': 'Disculpe',
          'Where is the bathroom?': '¿Dónde está el baño?',
          'I need help': 'Necesito ayuda',
          'How much does this cost?': '¿Cuánto cuesta esto?',
          'I would like to order': 'Me gustaría ordenar',
          'The bill, please': 'La cuenta, por favor',
          'I am allergic to': 'Soy alérgico a',
          'I need a doctor': 'Necesito un médico',
          'What time is it?': '¿Qué hora es?',
          'Where is the nearest hospital?': '¿Dónde está el hospital más cercano?',
          'I lost my passport': 'Perdí mi pasaporte',
          'Call the police': 'Llame a la policía',
          'I don\'t understand': 'No entiendo',
          'Can you speak English?': '¿Puede hablar inglés?',
          'I\'m sorry': 'Lo siento',
          'No problem': 'No hay problema',
        },
        'fr': {
          'Hello': 'Bonjour',
          'Thank you': 'Merci',
          'Goodbye': 'Au revoir',
          'Please': 'S\'il vous plaît',
          'Excuse me': 'Excusez-moi',
          'Where is the bathroom?': 'Où sont les toilettes ?',
          'I need help': 'J\'ai besoin d\'aide',
          'How much does this cost?': 'Combien ça coûte ?',
          'I would like to order': 'Je voudrais commander',
          'The bill, please': 'L\'addition, s\'il vous plaît',
          'I am allergic to': 'Je suis allergique à',
          'I need a doctor': 'J\'ai besoin d\'un médecin',
          'What time is it?': 'Quelle heure est-il ?',
          'Where is the nearest hospital?': 'Où est l\'hôpital le plus proche ?',
          'I lost my passport': 'J\'ai perdu mon passeport',
          'Call the police': 'Appelez la police',
          'I don\'t understand': 'Je ne comprends pas',
          'Can you speak English?': 'Pouvez-vous parler anglais ?',
          'I\'m sorry': 'Je suis désolé',
          'No problem': 'Pas de problème',
        },
        'de': {
          'Hello': 'Hallo',
          'Thank you': 'Danke',
          'Goodbye': 'Auf Wiedersehen',
          'Please': 'Bitte',
          'Excuse me': 'Entschuldigung',
          'Where is the bathroom?': 'Wo ist die Toilette?',
          'I need help': 'Ich brauche Hilfe',
          'How much does this cost?': 'Wie viel kostet das?',
          'I would like to order': 'Ich möchte bestellen',
          'The bill, please': 'Die Rechnung, bitte',
          'I am allergic to': 'Ich bin allergisch gegen',
          'I need a doctor': 'Ich brauche einen Arzt',
          'What time is it?': 'Wie spät ist es?',
          'Where is the nearest hospital?': 'Wo ist das nächste Krankenhaus?',
          'I lost my passport': 'Ich habe meinen Pass verloren',
          'Call the police': 'Rufen Sie die Polizei',
          'I don\'t understand': 'Ich verstehe nicht',
          'Can you speak English?': 'Können Sie Englisch sprechen?',
          'I\'m sorry': 'Es tut mir leid',
          'No problem': 'Kein Problem',
        },
        'it': {
          'Hello': 'Ciao',
          'Thank you': 'Grazie',
          'Goodbye': 'Arrivederci',
          'Please': 'Per favore',
          'Excuse me': 'Mi scusi',
          'Where is the bathroom?': 'Dove è il bagno?',
          'I need help': 'Ho bisogno di aiuto',
          'How much does this cost?': 'Quanto costa questo?',
          'I would like to order': 'Vorrei ordinare',
          'The bill, please': 'Il conto, per favore',
          'I am allergic to': 'Sono allergico a',
          'I need a doctor': 'Ho bisogno di un medico',
          'What time is it?': 'Che ora è?',
          'Where is the nearest hospital?': 'Dove è l\'ospedale più vicino?',
          'I lost my passport': 'Ho perso il mio passaporto',
          'Call the police': 'Chiami la polizia',
          'I don\'t understand': 'Non capisco',
          'Can you speak English?': 'Può parlare inglese?',
          'I\'m sorry': 'Mi dispiace',
          'No problem': 'Nessun problema',
        },
        'pt': {
          'Hello': 'Olá',
          'Thank you': 'Obrigado',
          'Goodbye': 'Adeus',
          'Please': 'Por favor',
          'Excuse me': 'Com licença',
          'Where is the bathroom?': 'Onde fica o banheiro?',
          'I need help': 'Preciso de ajuda',
          'How much does this cost?': 'Quanto custa isso?',
          'I would like to order': 'Gostaria de pedir',
          'The bill, please': 'A conta, por favor',
          'I am allergic to': 'Sou alérgico a',
          'I need a doctor': 'Preciso de um médico',
          'What time is it?': 'Que horas são?',
          'Where is the nearest hospital?': 'Onde fica o hospital mais próximo?',
          'I lost my passport': 'Perdi meu passaporte',
          'Call the police': 'Chame a polícia',
          'I don\'t understand': 'Não entendo',
          'Can you speak English?': 'Você pode falar inglês?',
          'I\'m sorry': 'Desculpe',
          'No problem': 'Sem problema',
        },
      },
    };

    // Check if we have a mock translation
    const mockTranslation = mockTranslations[sourceLanguage]?.[targetLanguage]?.[text];
    if (mockTranslation) {
      return { translatedText: mockTranslation };
    }

    // For now, use mock translations only to avoid API issues
    // In production, you can uncomment the API call below
    return {
      translatedText: `[${targetLanguage.toUpperCase()}: ${text}]`,
    };

    // For production, use actual API (uncomment when ready)
    /*
    const response = await fetch(LIBRE_TRANSLATE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: sourceLanguage,
        target: targetLanguage,
      }),
    });

    if (!response.ok) {
      throw new Error(`Translation failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      translatedText: data.translatedText,
      detectedLanguage: data.detectedLanguage?.confidence,
      confidence: data.detectedLanguage?.confidence,
    };
    */
  } catch (error) {
    console.error('Translation error:', error);
    // Return a fallback translation
    return {
      translatedText: `[Translation: ${text}]`,
    };
  }
};

// Get supported languages
export const getSupportedLanguages = (): Language[] => {
  return [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'it', name: 'Italian', flag: '🇮🇹' },
    { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
    { code: 'ru', name: 'Russian', flag: '🇷🇺' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
    { code: 'ko', name: 'Korean', flag: '🇰🇷' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
    { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
    { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
    { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
    { code: 'pl', name: 'Polish', flag: '🇵🇱' },
    { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
    { code: 'da', name: 'Danish', flag: '🇩🇰' },
    { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
    { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
    { code: 'cs', name: 'Czech', flag: '🇨🇿' },
    { code: 'hu', name: 'Hungarian', flag: '🇭🇺' },
    { code: 'ro', name: 'Romanian', flag: '🇷🇴' },
    { code: 'bg', name: 'Bulgarian', flag: '🇧🇬' },
    { code: 'hr', name: 'Croatian', flag: '🇭🇷' },
    { code: 'sk', name: 'Slovak', flag: '🇸🇰' },
    { code: 'sl', name: 'Slovenian', flag: '🇸🇮' },
    { code: 'et', name: 'Estonian', flag: '🇪🇪' },
    { code: 'lv', name: 'Latvian', flag: '🇱🇻' },
    { code: 'lt', name: 'Lithuanian', flag: '🇱🇹' },
    { code: 'mt', name: 'Maltese', flag: '🇲🇹' },
    { code: 'el', name: 'Greek', flag: '🇬🇷' },
    { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
    { code: 'th', name: 'Thai', flag: '🇹🇭' },
    { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
    { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
    { code: 'ms', name: 'Malay', flag: '🇲🇾' },
    { code: 'tl', name: 'Filipino', flag: '🇵🇭' },
    { code: 'bn', name: 'Bengali', flag: '🇧🇩' },
    { code: 'ur', name: 'Urdu', flag: '🇵🇰' },
    { code: 'fa', name: 'Persian', flag: '🇮🇷' },
    { code: 'am', name: 'Amharic', flag: '🇪🇹' },
    { code: 'sw', name: 'Swahili', flag: '🇹🇿' },
    { code: 'yo', name: 'Yoruba', flag: '🇳🇬' },
    { code: 'zu', name: 'Zulu', flag: '🇿🇦' },
  ];
};

// Common phrases for quick translation
export const getCommonPhrases = () => {
  return [
    { en: 'Hello', category: 'Greetings' },
    { en: 'Thank you', category: 'Greetings' },
    { en: 'Goodbye', category: 'Greetings' },
    { en: 'Please', category: 'Greetings' },
    { en: 'Excuse me', category: 'Greetings' },
    { en: 'Where is the bathroom?', category: 'Essential' },
    { en: 'I need help', category: 'Essential' },
    { en: 'How much does this cost?', category: 'Shopping' },
    { en: 'I would like to order', category: 'Food' },
    { en: 'The bill, please', category: 'Food' },
    { en: 'I am allergic to', category: 'Health' },
    { en: 'I need a doctor', category: 'Health' },
    { en: 'What time is it?', category: 'Essential' },
    { en: 'Where is the nearest hospital?', category: 'Health' },
    { en: 'I lost my passport', category: 'Emergency' },
    { en: 'Call the police', category: 'Emergency' },
    { en: 'I don\'t understand', category: 'Essential' },
    { en: 'Can you speak English?', category: 'Essential' },
    { en: 'I\'m sorry', category: 'Greetings' },
    { en: 'No problem', category: 'Greetings' },
  ];
}; 