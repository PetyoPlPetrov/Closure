import { router } from 'expo-router';
import { presentPaywall } from './revenuecat-paywall';
import { DEV_PAYWALL } from './revenuecat-wrapper';

/**
 * Shows paywall based on DEV_PAYWALL flag:
 * - If DEV_PAYWALL is true: Navigates to custom paywall screen
 * - If DEV_PAYWALL is false: Shows RevenueCat paywall directly
 * @returns Promise<boolean> - Returns true if user has access (subscribed in dev, or purchased/restored in prod)
 */
export async function showPaywallForPremiumAccess(): Promise<boolean> {
  if (DEV_PAYWALL) {
    // Show custom paywall screen (for testing)
    router.push('/paywall');
    return false; // Return false since we're navigating, not granting access immediately
  } else {
    // Show RevenueCat paywall directly
    return await presentPaywall();
  }
}

