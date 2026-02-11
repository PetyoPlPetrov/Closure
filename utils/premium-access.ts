import { SFERA_AI_ENTITLEMENT, SFERA_PLUS_ENTITLEMENT } from "./entitlements";
import { presentPaywall, presentPaywallIfNeeded } from "./revenuecat-paywall";
import { Purchases } from "./revenuecat-wrapper";

/** RevenueCat offering ID shown when user taps Upgrade (e.g. premium-info screen) */
const UPGRADE_OFFERING_ID = "ofrngf2c100f8c5";

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

/**
 * Shows paywall for Sfera AI using a specific RevenueCat offering (Upgrade button).
 * Uses offering identifier {@link UPGRADE_OFFERING_ID} when available.
 */
export async function showPaywallForUpgradeAccess(): Promise<boolean> {
  let offering: import("react-native-purchases").PurchasesOffering | undefined;
  try {
    if (Purchases && typeof Purchases.getOfferings === "function") {
      const offerings = await Purchases.getOfferings();
      const all = (
        offerings as {
          all?: Record<
            string,
            import("react-native-purchases").PurchasesOffering
          >;
        }
      )?.all;
      offering = all?.[UPGRADE_OFFERING_ID];
    }
  } catch {
    // Fall through to presentPaywallIfNeeded without offering
  }
  return await presentPaywallIfNeeded({
    requiredEntitlementIdentifier: SFERA_AI_ENTITLEMENT,
    offering: offering ?? undefined,
  });
}
