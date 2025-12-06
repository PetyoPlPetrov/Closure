// Make sure to configure a Paywall in the Dashboard first.
import type { PurchasesOffering } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

/**
 * Present paywall for current offering
 * @returns Promise<boolean> - Returns true if user purchased or restored, false otherwise
 */
export async function presentPaywall(): Promise<boolean> {
  try {
    const paywallResult: PAYWALL_RESULT = await RevenueCatUI.presentPaywall();

    switch (paywallResult) {
      case PAYWALL_RESULT.NOT_PRESENTED:
      case PAYWALL_RESULT.ERROR:
      case PAYWALL_RESULT.CANCELLED:
        return false;
      case PAYWALL_RESULT.PURCHASED:
      case PAYWALL_RESULT.RESTORED:
        return true;
      default:
        return false;
    }
  } catch (error) {
    // Error presenting paywall
    return false;
  }
}

/**
 * Present paywall if needed - checks entitlement and shows paywall if user doesn't have access
 * @param options - Configuration options
 * @param options.requiredEntitlementIdentifier - The entitlement identifier to check (e.g., "Sfera Premium")
 * @param options.offering - Optional specific offering to present
 * @returns Promise<boolean> - Returns true if user has entitlement or purchased/restored, false otherwise
 */
export async function presentPaywallIfNeeded(options: {
  requiredEntitlementIdentifier: string;
  offering?: PurchasesOffering;
}): Promise<boolean> {
  try {
    console.log('presentPaywallIfNeeded', options,RevenueCatUI);
    const paywallResult: PAYWALL_RESULT = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: options.requiredEntitlementIdentifier,
      offering: options.offering,
    });

    switch (paywallResult) {
      case PAYWALL_RESULT.NOT_PRESENTED:
        // User already has the entitlement, paywall was not shown
        return true;
      case PAYWALL_RESULT.PURCHASED:
      case PAYWALL_RESULT.RESTORED:
        // User purchased or restored, now has access
        return true;
      case PAYWALL_RESULT.ERROR:
      case PAYWALL_RESULT.CANCELLED:
        // User cancelled or error occurred
        return false;
      default:
        return false;
    }
  } catch (error) {
    // Error presenting paywall
    return false;
  }
}

