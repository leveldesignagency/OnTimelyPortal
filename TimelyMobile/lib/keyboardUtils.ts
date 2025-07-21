import { Keyboard, Platform } from 'react-native';

/**
 * Dismisses the keyboard with platform-specific handling
 */
export const dismissKeyboard = () => {
  Keyboard.dismiss();
};

/**
 * Checks if keyboard is currently visible
 */
export const isKeyboardVisible = () => {
  return Keyboard.isVisible();
};

/**
 * Adds keyboard show/hide listeners
 */
export const addKeyboardListeners = (onShow?: () => void, onHide?: () => void) => {
  const showSubscription = Keyboard.addListener('keyboardDidShow', onShow || (() => {}));
  const hideSubscription = Keyboard.addListener('keyboardDidHide', onHide || (() => {}));
  
  return () => {
    showSubscription?.remove();
    hideSubscription?.remove();
  };
};

/**
 * Platform-specific keyboard behavior
 */
export const getKeyboardBehavior = () => {
  return Platform.OS === 'ios' ? 'padding' : 'height';
}; 