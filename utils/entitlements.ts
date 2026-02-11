/**
 * RevenueCat entitlement identifiers.
 * Must match exactly what is configured in the RevenueCat dashboard.
 * Sfera Plus: unlimited entities, custom notifications, statistics.
 * Sfera Premium (Sfera AI): all AI features - product petyo.petrov.sferas grants this.
 */
export const SFERA_PLUS_ENTITLEMENT = "SferaPlus";
export const SFERA_AI_ENTITLEMENT = "Sfera Premium";

/** Product IDs - used to infer which plan to display when both entitlements are present */
export const SFERA_AI_PRODUCT_ID = "petyo.petrov.sferas";
export const SFERA_PLUS_PRODUCT_ID = "petyo.petrov.sferasplus";
