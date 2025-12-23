/**
 * Safe wrapper for RevenueCat native modules
 * Handles cases where native modules aren't available
 */

// Feature flag to enable/disable RevenueCat initialization
// Set to false to disable RevenueCat (useful when using test keys in production)
export const ENABLE_REVENUECAT = true;

// Flag to control whether custom paywall is shown or RevenueCat paywall is shown directly
// When false, users will directly see RevenueCat paywall when accessing premium content
// When true, users will see the custom paywall screen (for testing)
export const DEV_PAYWALL = true;

// Check if native modules are available
let Purchases: any = null;
let RevenueCatUI: any = null;
let LOG_LEVEL: any = null;
let PAYWALL_RESULT: any = null;
let isNativeModuleAvailable = false;

if (ENABLE_REVENUECAT) {
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
    console.error('Error importing RevenueCat native modules:', error);
    // Native module not available - this is OK in development
  }
}

export { isNativeModuleAvailable, LOG_LEVEL, PAYWALL_RESULT, Purchases, RevenueCatUI };

