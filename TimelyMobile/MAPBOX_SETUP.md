# Mapbox Setup for Timely Offline Maps

## Quick Setup Guide

### 1. Create Mapbox Account
1. Go to [mapbox.com](https://mapbox.com)
2. Sign up for a free account
3. Verify your email

### 2. Get Access Token
1. Go to [Account Dashboard](https://account.mapbox.com/access-tokens/)
2. Your default public token is already created
3. Copy the token (starts with `pk.`)

### 3. Get Download Token (For Offline Maps)
1. In the same dashboard, click "Create a token"
2. Select these scopes:
   - `DOWNLOADS:READ` ✅
   - `NAVIGATION:READ` ✅
   - `VISION:READ` ✅
3. Name it "Timely Offline Maps"
4. Copy the token (starts with `sk.`)

### 4. Update Your App

#### In `app.config.js`:
```javascript
plugins: [
  [
    '@rnmapbox/maps',
    {
      RNMapboxMapsImpl: 'mapbox',
      RNMapboxMapsDownloadToken: 'sk.your_download_token_here'
    }
  ]
]
```

#### In `OfflineMapsScreen.tsx`:
```typescript
// Replace line 29:
Mapbox.setAccessToken('pk.your_access_token_here');
```

### 5. Rebuild App
After updating tokens, rebuild your app:
```bash
npx expo run:ios
# or
npx expo run:android
```

## Free Tier Limits
- **50,000 map loads/month** (plenty for most events)
- **Offline downloads**: Unlimited areas
- **Navigation requests**: 25,000/month

## Need Help?
- [Mapbox Documentation](https://docs.mapbox.com/react-native/maps/guides/)
- [Token Management](https://docs.mapbox.com/help/getting-started/access-tokens/)
- [Pricing](https://www.mapbox.com/pricing/) 