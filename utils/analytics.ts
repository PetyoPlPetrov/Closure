// utils/analytics.ts
import { Platform } from 'react-native';
import { getFirebaseApp } from './firebase';

// Suppress deprecation warnings during migration period
// Remove this once React Native Firebase fully supports modular API for Analytics
if (Platform.OS !== 'web' && typeof globalThis !== 'undefined') {
  (globalThis as any).RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;
}

let analytics: any = null;
let analyticsInitialized = false;

const initializeAnalytics = () => {
  if (analyticsInitialized) {
    return analytics;
  }

  // Skip on web platform
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    // Check if Firebase is initialized (it should be initialized in _layout.tsx)
    const firebaseApp = getFirebaseApp();
    if (!firebaseApp) {
      return null;
    }

    const rnfbAnalytics = require('@react-native-firebase/analytics');
    // Using namespaced API for now (deprecated but still functional)
    // React Native Firebase Analytics modular API is not fully available yet
    analytics = rnfbAnalytics.default();
    analyticsInitialized = true;
    return analytics;
  } catch (error: any) {
    return null;
  }
};

// Don't initialize analytics on module load - wait until first use
// This ensures Firebase is initialized first

/**
 * Log a custom event to Firebase Analytics
 */
export const logEvent = async (eventName: string, params?: Record<string, any>) => {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    if (!analytics) {
      analytics = initializeAnalytics();
    }

    if (analytics) {
      await analytics.logEvent(eventName, params || {});
    }
  } catch (error: any) {
    // Failed to log event
  }
};

/**
 * Log when a sphere entity is created
 */
export const logEntityCreated = async (sphere: string, entityType: string) => {
  await logEvent('entity_created', {
    sphere,
    entity_type: entityType,
  });
};

/**
 * Log when a memory is created
 */
export const logMemoryCreated = async (sphere: string) => {
  await logEvent('memory_created', {
    sphere,
  });
};

/**
 * Log when a memory is deleted
 */
export const logMemoryDeleted = async (sphere: string) => {
  await logEvent('memory_deleted', {
    sphere,
  });
};

/**
 * Log when a moment is created
 */
export const logMomentCreated = async (sphere: string, momentType: 'cloud' | 'sun' | 'lesson') => {
  await logEvent('moment_created', {
    sphere,
    moment_type: momentType,
  });
};

/**
 * Log when the wheel of life is spun
 */
export const logWheelSpin = async () => {
  await logEvent('wheel_spin', {});
};

/**
 * Log when an insights sphere is opened
 */
export const logInsightsSphereOpened = async (sphere: string) => {
  await logEvent('insights_sphere_opened', {
    sphere,
  });
};

/**
 * Log when notifications are turned on
 */
export const logNotificationTurnedOn = async (sphere: string, entityType: string) => {
  await logEvent('notification_turned_on', {
    sphere,
    entity_type: entityType,
  });
};

export default {
  logEvent,
  logEntityCreated,
  logMemoryCreated,
  logMemoryDeleted,
  logMomentCreated,
  logWheelSpin,
  logInsightsSphereOpened,
  logNotificationTurnedOn,
};

