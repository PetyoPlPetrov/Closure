/**
 * Firebase App Check initialization
 * Protects backend resources from abuse by verifying app authenticity
 * 
 * Documentation: https://rnfirebase.io/app-check/usage
 * 
 * Uses initializeAppCheck (recommended) instead of deprecated activate() method
 * This provides firebase-js-sdk v9 compatibility and access to all platform providers
 */

import { firebase } from '@react-native-firebase/app-check';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

let isInitialized = false;

/**
 * Determine if we should use production App Check providers
 * In production builds (TestFlight, App Store), we must use App Attest/DeviceCheck
 * Debug tokens only work in development builds
 * 
 * IMPORTANT: For TestFlight and App Store builds, this MUST return true
 * even if __DEV__ is true (which can happen in some build configurations)
 */
function shouldUseProductionProvider(): boolean {
  // Check if running in Expo Go (always use debug)
  if (Constants.executionEnvironment === 'storeClient') {
    return false; // Expo Go = debug
  }
  
  // For standalone builds (TestFlight, App Store), always use production provider
  // This is critical - standalone builds MUST use App Attest/DeviceCheck
  if (Constants.executionEnvironment === 'standalone') {
    return true; // Standalone = production provider required
  }
  
  // For bare workflow or development builds, use __DEV__ flag
  // But note: some TestFlight builds might have __DEV__ = true
  // So we prioritize executionEnvironment over __DEV__
  return !__DEV__;
}

/**
 * Initialize Firebase App Check
 * Must be called before any Firebase backend services are used
 */
export async function initializeAppCheckService(): Promise<void> {
  try {
    // Skip initialization if already initialized
    if (isInitialized) {
      return;
    }

    // Skip App Check on web platform (React Native only)
    if (Platform.OS === 'web') {
      return;
    }

    // Get your Debug Token from Firebase Console -> App Check -> Apps -> iOS -> Manage Debug Tokens
    // IMPORTANT: If the token below doesn't work, set it to undefined to let Firebase generate one,
    // then check the native logs (Xcode console for iOS, logcat for Android) for the generated token
    const DEBUG_TOKEN = '9A1313D4-8501-491B-8923-A26E59DC24AC';

    // 1. Create the native provider
    const rnfbProvider = firebase.appCheck().newReactNativeFirebaseAppCheckProvider();

    // 2. Configure it based on environment (Debug vs Production)
    // Only configure for the current platform to avoid web configuration issues
    const useProduction = shouldUseProductionProvider();
    const config: any = {};
    
    if (Platform.OS === 'android') {
      config.android = {
        provider: useProduction ? 'playIntegrity' : 'debug',
        debugToken: useProduction ? undefined : DEBUG_TOKEN,
      };
    } else if (Platform.OS === 'ios') {
      config.apple = {
        // In TestFlight/Production use combined method for better stability
        // appAttestWithDeviceCheckFallback: tries App Attest first, falls back to DeviceCheck
        provider: useProduction ? 'appAttestWithDeviceCheckFallback' : 'debug',
        debugToken: useProduction ? undefined : DEBUG_TOKEN,
      };
    }
    
    // Log configuration for debugging (especially important for production builds)
    if (Platform.OS === 'ios') {
      console.log(`📱 App Check Configuration: ${useProduction ? 'PRODUCTION' : 'DEBUG'}`);
      console.log(`   Provider: ${config.apple?.provider || 'none'}`);
      console.log(`   Execution Environment: ${Constants.executionEnvironment}`);
      console.log(`   __DEV__: ${__DEV__}`);
    }
    
    rnfbProvider.configure(config);

    /**
     * 3. INITIALIZATION (Recommended Method)
     * Uses initializeAppCheck instead of deprecated activate() method
     * This provides firebase-js-sdk v9 compatibility
     */
    await firebase.appCheck().initializeAppCheck({
      provider: rnfbProvider,
      isTokenAutoRefreshEnabled: true, // Automatically refresh tokens (works on both Android and iOS)
    });
    
    isInitialized = true;

    // Verify token is available (iOS-friendly approach: use getToken(true) to request fresh token)
    // On iOS, onTokenChanged is not implemented, so we use getToken(true) instead
    try {
      // Wait a bit for token to be ready (especially important for iOS App Attest)
      await new Promise(resolve => setTimeout(resolve, Platform.OS === 'ios' ? 1000 : 500));
      
      // iOS-friendly approach: request a fresh token when needed
      // This ensures the token is available before any Firebase services are used
      const { token } = await firebase.appCheck().getToken(true);
      
      // Verify App Check was initialized correctly
      if (token && token.length > 0) {
        console.log('✅ AppCheck verification passed');
        console.log(`   Token length: ${token.length} characters`);
      } else {
        console.log('⚠️ AppCheck verification failed: token is empty');
        if (useProduction && Platform.OS === 'ios') {
          console.log('   ⚠️ CRITICAL: Production build but token is empty!');
          console.log('   This usually means:');
          console.log('   1. App Attest is not enabled in Firebase Console');
          console.log('   2. App is not registered in Firebase App Check');
          console.log('   3. Entitlement is missing or incorrect');
        }
      }
    } catch (error) {
      console.log('❌ AppCheck verification failed:', error instanceof Error ? error.message : String(error));
      if (useProduction && Platform.OS === 'ios') {
        console.log('   ⚠️ CRITICAL: Production build failed to get token!');
        console.log('   Check Firebase Console -> App Check -> Apps -> iOS');
        console.log('   Ensure App Attest is enabled and app is registered');
      }
    }
  } catch {
    // Don't throw - allow app to continue without App Check
    // App Check errors won't prevent the app from running
  }
}

/**
 * Get the current App Check token
 * Useful for verifying App Check is working or for custom backend verification
 * 
 * iOS-friendly approach: Use forceRefresh=true to request a fresh token
 * (onTokenChanged is not implemented on iOS, so polling getToken is recommended)
 */
export async function getAppCheckToken(forceRefresh: boolean = false): Promise<string | null> {
  try {
    if (!isInitialized) {
      return null;
    }

    // iOS-friendly approach: request a fresh token when needed
    // On iOS, onTokenChanged is not implemented, so we use getToken(true) instead
    const forceRefreshToken = forceRefresh || Platform.OS === 'ios';
    const { token } = await firebase.appCheck().getToken(forceRefreshToken);
    return token || null;
  } catch {
    return null;
  }
}

/**
 * Ensure App Check token is available before making Firebase requests
 * This is especially important for iOS where App Attest may take time to generate tokens
 * 
 * iOS-friendly approach: Use getToken(true) to request a fresh token
 * This should be called before making Firebase backend requests (like AI calls)
 */
export async function ensureAppCheckToken(): Promise<boolean> {
  try {
    if (!isInitialized) {
      return false;
    }

    // iOS-friendly approach: request a fresh token when needed
    // On iOS, onTokenChanged is not implemented, so we use getToken(true) instead
    const { token } = await firebase.appCheck().getToken(true);
    
    return !!(token && token.length > 0);
  } catch {
    return false;
  }
}

/**
 * Check if App Check is initialized
 */
export function isAppCheckInitialized(): boolean {
  return isInitialized;
}

/**
 * Verify App Check is working correctly
 * This matches the official documentation verification pattern
 * Call this after initialization to confirm App Check is functioning
 */
export async function verifyAppCheck(): Promise<boolean> {
  try {
    if (!isInitialized) {
      console.log('❌ AppCheck verification failed: not initialized');
      return false;
    }

    // appCheckInstance is the saved return value from initializeAppCheck
    const { token } = await firebase.appCheck().getToken(true);
    
    if (token && token.length > 0) {
      console.log('✅ AppCheck verification passed');
      return true;
    } else {
      console.log('❌ AppCheck verification failed: token is empty');
      return false;
    }
  } catch (error) {
    console.log('❌ AppCheck verification failed:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Helper function to get debug token instructions
 * Call this from your app to get instructions on finding your debug token
 */
export function getDebugTokenInstructions(): void {
  // Function kept for API compatibility but no longer logs
}

export default {
  initializeAppCheckService,
  getAppCheckToken,
  isAppCheckInitialized,
  verifyAppCheck,
  getDebugTokenInstructions,
};
