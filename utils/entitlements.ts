/**
 * RevenueCat entitlement and product identifiers.
 * Must match exactly what is configured in the RevenueCat dashboard.
 *
 * Products (App Store): SferaPremiumProduct (petyo.petrov.sferas), SferaPlusProduct (petyo.petrov.sferasplus).
 * Each product grants one entitlement. Offerings/paywalls: "Sferas Plus" = any plan, "Sferas AI" = Premium only.
 */
/** Sfera Plus: unlimited entities, custom notifications, statistics. Granted by SferaPlusProduct. */
export const SFERA_PLUS_ENTITLEMENT = "SferaPlus";
/** Sfera Premium (Sfera AI): all AI features. Granted by SferaPremiumProduct. */
export const SFERA_AI_ENTITLEMENT = "Sfera Premium";

/** Product IDs – must match App Store / RevenueCat Products; used to infer which plan to display when both entitlements are present */
export const SFERA_AI_PRODUCT_ID = "petyo.petrov.sferas";
export const SFERA_PLUS_PRODUCT_ID = "petyo.petrov.sferasplus";
