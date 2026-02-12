import { SFERA_AI_ENTITLEMENT, SFERA_PLUS_ENTITLEMENT } from "./entitlements";
import { presentPaywall, presentPaywallIfNeeded } from "./revenuecat-paywall";
import { Purchases } from "./revenuecat-wrapper";

/** RevenueCat offering identifier for upgrade paywall (AI-only, for Plus→AI upgrade).
 * Must be the offering identifier (e.g. "Sferas AI"), not the RevenueCat internal ID.
 * offerings.all is keyed by identifier. */
const UPGRADE_OFFERING_ID = "Sferas AI";

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
