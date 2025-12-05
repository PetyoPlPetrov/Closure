// utils/firebase.ts
import { Platform } from 'react-native';

// Firebase is automatically initialized via Expo plugin (@react-native-firebase/app)
// This file just provides a helper to access the already-initialized Firebase app
let firebaseApp: any = null;

/**
 * Get the Firebase app instance (auto-initialized by Expo plugin)
 * Returns null on web platform or if Firebase is not available
 */
export const getFirebaseApp = () => {
  if (Platform.OS === 'web') {
    return null;
  }

  // Return cached instance if already retrieved
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Firebase is already initialized by the Expo plugin
    // Just access the default app instance
    const firebase = require('@react-native-firebase/app');
    firebaseApp = firebase.app();
    return firebaseApp;
  } catch (error: any) {
    console.warn('Firebase not available:', error?.message || error);
    return null;
  }
};

// Legacy export for backwards compatibility (no longer initializes)
export const initializeFirebase = () => {
  return getFirebaseApp();
};

export default firebaseApp;

