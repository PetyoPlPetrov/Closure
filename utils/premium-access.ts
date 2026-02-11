import { SFERA_AI_ENTITLEMENT, SFERA_PLUS_ENTITLEMENT } from "./entitlements";
import { presentPaywall, presentPaywallIfNeeded } from "./revenuecat-paywall";

/**
 * Shows RevenueCat paywall directly (generic - used by settings)
 * @returns Promise<boolean> - Returns true if user purchased/restored subscription
 */
export async function showPaywallForPremiumAccess(): Promise<boolean> {
  return await presentPaywall();
}

/**
 * Shows paywall for Sfera Plus (unlimited entities, custom notifications, statistics)
 */
export async function showPaywallForPlusAccess(): Promise<boolean> {
  return await presentPaywallIfNeeded({
    requiredEntitlementIdentifier: SFERA_PLUS_ENTITLEMENT,
  });
}

/**
 * Shows paywall for Sfera AI (all AI features)
 */
export async function showPaywallForAIAccess(): Promise<boolean> {
  return await presentPaywallIfNeeded({
    requiredEntitlementIdentifier: SFERA_AI_ENTITLEMENT,
  });
}
