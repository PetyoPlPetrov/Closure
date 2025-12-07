/**
 * Safe wrapper for RevenueCat native modules
 * Handles cases where native modules aren't available (e.g., Expo Go)
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Check if we're in Expo Go (which doesn't support native modules)
const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Check if native modules are available
let Purchases: any = null;
let RevenueCatUI: any = null;
let LOG_LEVEL: any = null;
let PAYWALL_RESULT: any = null;
let isNativeModuleAvailable = false;

if (!isExpoGo) {
  try {
    // Try to import native modules
    const purchasesModule = require('react-native-purchases');
    const purchasesUIModule = require('react-native-purchases-ui');
    
    Purchases = purchasesModule.default || purchasesModule;
    RevenueCatUI = purchasesUIModule.default || purchasesUIModule;
    LOG_LEVEL = purchasesModule.LOG_LEVEL;
    PAYWALL_RESULT = purchasesUIModule.PAYWALL_RESULT;
    
    // Check if the native module is actually available
    // by trying to access a native method
    if (Purchases && typeof Purchases.configure === 'function') {
      isNativeModuleAvailable = true;
    }
  } catch (error) {
    // Native module not available - this is OK in development
    if (__DEV__) {
      console.warn('[RevenueCat] Native module not available. RevenueCat features will be disabled.');
    }
  }
}

export { Purchases, RevenueCatUI, LOG_LEVEL, PAYWALL_RESULT, isNativeModuleAvailable };

