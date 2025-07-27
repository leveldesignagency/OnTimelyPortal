# Translator App for Timely Mobile

## Overview
The Translator app is a comprehensive translation tool built for the Timely mobile application. It provides real-time translation between 40+ languages with a modern, intuitive interface that matches the Timely app's design system.

## Features

### 🌐 Multi-Language Support
- **40+ Languages**: English, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean, Chinese, Arabic, Hindi, Turkish, Dutch, Polish, Swedish, Danish, Norwegian, Finnish, Czech, Hungarian, Romanian, Bulgarian, Croatian, Slovak, Slovenian, Estonian, Latvian, Lithuanian, Maltese, Greek, Hebrew, Thai, Vietnamese, Indonesian, Malay, Filipino, Bengali, Urdu, Persian, Amharic, Swahili, Yoruba, Zulu
- **Language Flags**: Each language is represented with its country flag emoji
- **Easy Language Selection**: Tap to change source and target languages

### 💬 Translation Features
- **Real-time Translation**: Instant translation as you type
- **Quick Phrases**: Pre-loaded common phrases for travel and events
- **Recent Translations**: History of your recent translations
- **Copy to Clipboard**: Easy sharing of translated text
- **Language Swap**: Quick swap between source and target languages

### 🎨 User Experience
- **Haptic Feedback**: Tactile feedback for all interactions
- **Dark Mode**: Consistent with Timely's dark theme
- **Responsive Design**: Works on all screen sizes
- **Keyboard Handling**: Proper keyboard avoidance and input handling

### 📱 Quick Phrases Categories
- **Greetings**: Hello, Thank you, Goodbye, Please, Excuse me
- **Essential**: Where is the bathroom?, I need help, What time is it?, I don't understand
- **Shopping**: How much does this cost?
- **Food**: I would like to order, The bill, please
- **Health**: I am allergic to, I need a doctor, Where is the nearest hospital?
- **Emergency**: I lost my passport, Call the police

## Technical Implementation

### Architecture
- **React Native**: Built with React Native and Expo
- **TypeScript**: Full TypeScript support for type safety
- **Navigation**: Uses React Navigation for seamless app navigation
- **Translation Service**: Modular translation service for easy API switching

### Translation Service
The app uses a translation service (`lib/translationService.ts`) that supports:
- **Mock Translations**: For development and testing
- **LibreTranslate API**: Free, open-source translation API
- **Extensible**: Easy to switch to Google Translate, DeepL, or other APIs

### Dependencies Required
```bash
npm install @react-navigation/native-stack
```

The following dependencies are already included in the project:
- `expo-haptics`: For haptic feedback
- `@expo/vector-icons`: For icons
- `react-native`: Core React Native components

## Setup Instructions

1. **Install Dependencies**:
   ```bash
   cd TimelyMobile
   npm install @react-navigation/native-stack
   ```

2. **Add Translator to Event**:
   - In the desktop app, go to Event Dashboard
   - Drag the "Translator" add-on to the active modules
   - Save the add-ons

3. **Access in Mobile App**:
   - Open the Timely mobile app
   - Navigate to the "Apps" tab
   - Tap on the Translator app card
   - Start translating!

## API Integration

### Current Implementation
- Uses mock translations for development
- Includes LibreTranslate API integration for production
- Easy to switch to other translation services

### To Use Real Translation API
1. **Google Translate API**:
   ```typescript
   // In translationService.ts, replace the API call with:
   const response = await fetch('https://translation.googleapis.com/language/translate/v2', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${GOOGLE_API_KEY}`,
       'Content-Type': 'application/json',
     },
     body: JSON.stringify({
       q: text,
       source: sourceLanguage,
       target: targetLanguage,
     }),
   });
   ```

2. **DeepL API**:
   ```typescript
   const response = await fetch('https://api-free.deepl.com/v2/translate', {
     method: 'POST',
     headers: {
       'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
       'Content-Type': 'application/json',
     },
     body: JSON.stringify({
       text: [text],
       source_lang: sourceLanguage.toUpperCase(),
       target_lang: targetLanguage.toUpperCase(),
     }),
   });
   ```

## File Structure
```
TimelyMobile/
├── screens/
│   └── TranslatorScreen.tsx          # Main translator screen
├── lib/
│   └── translationService.ts         # Translation service
└── App.tsx                          # Navigation setup
```

## Future Enhancements

### Planned Features
- **Voice Translation**: Speech-to-text and text-to-speech
- **Camera Translation**: Translate text from images
- **Offline Mode**: Download language packs for offline use
- **Custom Phrases**: Save custom phrases for events
- **Translation History**: Persistent translation history
- **Share Translations**: Share translations via messaging apps

### Technical Improvements
- **Caching**: Cache translations for better performance
- **Error Handling**: Better error messages and retry logic
- **Accessibility**: VoiceOver and TalkBack support
- **Performance**: Optimize for large text translations

## Troubleshooting

### Common Issues
1. **Translation not working**: Check internet connection and API status
2. **App not loading**: Ensure all dependencies are installed
3. **Navigation issues**: Verify React Navigation setup

### Debug Mode
Enable debug logging by adding console.log statements in the translation service.

## Contributing
To add new languages or features:
1. Update `getSupportedLanguages()` in `translationService.ts`
2. Add mock translations for new languages
3. Test the translation flow
4. Update the UI to handle new languages

## License
This translator app is part of the Timely mobile application and follows the same licensing terms. 