module.exports = {
  expo: {
    name: 'TimelyMobile',
    slug: 'TimelyMobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    jsEngine: 'jsc',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    updates: {
      fallbackToCacheTimeout: 0
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      jsEngine: 'jsc',
      bundleIdentifier: 'com.leveldesign.TimelyMobile'
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#FFFFFF'
      },
      edgeToEdgeEnabled: true,
      jsEngine: 'jsc',
      package: 'com.leveldesign.TimelyMobile'
    },
    web: {
      favicon: './assets/favicon.png'
    },
    plugins: [
      [
        '@rnmapbox/maps',
        {
          RNMapboxMapsImpl: 'mapbox',
          RNMapboxMapsDownloadToken: 'sk.eyJ1IjoidGltZWx5bW9iaWxlYXBwIiwiYSI6ImNtZGhnZTJkcTAxaHoybHNoMzgxd252OWIifQ.fP6TJHXgq3frf8KHYexfAg'
        }
      ]
    ],
    extra: {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      EXPO_PROJECT_ID: 'dedc34d3-7d05-47c5-8a66-a525b5ed9a4a',
      eas: {
        projectId: 'dedc34d3-7d05-47c5-8a66-a525b5ed9a4a'
      }
    }
  }
}; 