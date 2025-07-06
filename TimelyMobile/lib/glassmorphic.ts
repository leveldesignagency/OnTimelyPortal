import { Platform } from 'react-native';

export const getGlassCardStyle = () => {
  return {
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 22,
    padding: 20,
    marginVertical: 14,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#fff',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
    // For web: boxShadow: '0 0 32px 4px #fff, 0 2px 24px 0 #000' (not supported in RN)
    // For native: use BlurView as a wrapper for true glass effect
  };
};

export const getGlassTextColor = () => '#fff';
export const getGlassSecondaryTextColor = () => '#b0b0b0'; 