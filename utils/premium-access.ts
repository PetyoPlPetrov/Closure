import { SFERA_AI_ENTITLEMENT, SFERA_PLUS_ENTITLEMENT } from "./entitlements";
import {
  presentPaywall,
  presentPaywallIfNeeded,
  presentPaywallWithOffering,
} from "./revenuecat-paywall";
import { Purchases } from "./revenuecat-wrapper";

/**
 * RevenueCat offering identifiers. Must match dashboard (Offerings tab); offerings.all is keyed by identifier.
 * Any subscription: Sferas_ALL_Plans_Paywall (identifier "Sferas Plus"). Premium-only: Sferas_PREMIUM__ONLY_Paywall (identifier "Sferas AI").
 */
/** Any subscription paywall – Plus or Premium (display name: Sferas_ALL_Plans_Paywall). */
export const OFFERING_ID_ALL_PLANS = "Sferas Plus";
/** Premium-only paywall – Sfera AI (display name: Sferas_PREMIUM__ONLY_Paywall; wheel of life, AI modal, custom notification nudges). */
export const OFFERING_ID_PREMIUM_ONLY = "Sferas AI";

type PurchasesOffering = import("react-native-purchases").PurchasesOffering;

async function getOfferingById(
  identifier: string,
): Promise<PurchasesOffering | undefined> {
  try {
    if (!Purchases || typeof Purchases.getOfferings !== "function") return undefined;
    const offerings = await Purchases.getOfferings();
    const all = (offerings as { all?: Record<string, PurchasesOffering> })?.all;
    return all?.[identifier];
  } catch {
    return undefined;
  }
}

/**
 * Shows RevenueCat paywall directly (generic - used by settings)
 * @returns Promise<boolean> - Returns true if user purchased/restored subscription
 */
export async function showPaywallForPremiumAccess(): Promise<boolean> {
  return await presentPaywall();
}

/**
 * Shows paywall when the feature requires any subscription (Plus or Premium).
 * If user already has either Plus or Premium entitlement, no paywall is shown.
 * Presents Sferas_ALL_Plans_Paywall (offering "Sferas Plus").
 */
export async function showPaywallForAnySubscriptionAccess(): Promise<boolean> {
  try {
    if (Purchases && typeof Purchases.getCustomerInfo === "function") {
      const info = await Purchases.getCustomerInfo();
      const hasAny =
        info.entitlements.active[SFERA_PLUS_ENTITLEMENT] ||
        info.entitlements.active[SFERA_AI_ENTITLEMENT];
      if (hasAny) return true;
    }
  } catch {
    // Fall through to show paywall
  }
  return await presentPaywallWithOffering(OFFERING_ID_ALL_PLANS);
}

/**
 * Shows paywall for Sfera AI Premium only (Sferas_PREMIUM__ONLY_Paywall).
 * Use when the feature requires Premium: wheel of life, AI modal, custom notification nudges from settings.
 */
export async function showPaywallForAIAccess(): Promise<boolean> {
  const offering = await getOfferingById(OFFERING_ID_PREMIUM_ONLY);
  return await presentPaywallIfNeeded({
    requiredEntitlementIdentifier: SFERA_AI_ENTITLEMENT,
    offering: offering ?? undefined,
  });
}

/**
 * Shows paywall for Sfera AI using the Premium-only offering (Upgrade button).
 * Uses offering {@link OFFERING_ID_PREMIUM_ONLY} when available.
 */
export async function showPaywallForUpgradeAccess(): Promise<boolean> {
  const offering = await getOfferingById(OFFERING_ID_PREMIUM_ONLY);
  return await presentPaywallIfNeeded({
    requiredEntitlementIdentifier: SFERA_AI_ENTITLEMENT,
    offering: offering ?? undefined,
  });
}
