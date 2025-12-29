import { presentPaywall } from './revenuecat-paywall';

/**
 * Shows RevenueCat paywall directly for premium access
 * @returns Promise<boolean> - Returns true if user purchased/restored subscription
 */
export async function showPaywallForPremiumAccess(): Promise<boolean> {
  // Show RevenueCat paywall directly
  return await presentPaywall();
}

