import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import type {
  CustomerInfo,
  PurchasesOffering,
  PurchasesOfferings,
  PurchasesPackage,
} from "react-native-purchases";
import { handleDevError } from "./dev-error-handler";
import { SFERA_AI_ENTITLEMENT, SFERA_PLUS_ENTITLEMENT } from "./entitlements";
import { presentPaywall, presentPaywallIfNeeded } from "./revenuecat-paywall";
import { isNativeModuleAvailable, Purchases } from "./revenuecat-wrapper";

export type SubscriptionStatus = "loading" | "subscribed" | "not_subscribed";

function logSubscriptionInitInfo(
  offerings: PurchasesOfferings,
  customerInfo: CustomerInfo,
): void {
  const packages: {
    identifier: string;
    product: { identifier: string; priceString?: string };
  }[] = [];
  if (offerings.current?.availablePackages) {
    for (const pkg of offerings.current.availablePackages) {
      packages.push({
        identifier: pkg.identifier,
        product: {
          identifier: pkg.product?.identifier ?? "unknown",
          priceString: pkg.product?.priceString,
        },
      });
    }
  }

  console.log(
    "[SubscriptionProvider] Init – subscriptions, products, packages, entitlements:",
    {
      subscriptions: {
        activeSubscriptions: customerInfo.activeSubscriptions ?? [],
        allPurchasedProductIdentifiers:
          customerInfo.allPurchasedProductIdentifiers ?? [],
        allExpirationDates: customerInfo.allExpirationDates ?? {},
        allPurchaseDates: customerInfo.allPurchaseDates ?? {},
        latestExpirationDate: customerInfo.latestExpirationDate ?? null,
        managementURL: customerInfo.managementURL ?? null,
      },
      entitlements: {
        active: Object.fromEntries(
          Object.entries(customerInfo.entitlements?.active ?? {}).map(
            ([k, v]) => [
              k,
              {
                isActive: v?.isActive,
                expirationDate: v?.expirationDate,
                willRenew: v?.willRenew,
                productIdentifier: v?.productIdentifier,
                periodType: v?.periodType,
              },
            ],
          ),
        ),
        all: Object.keys(customerInfo.entitlements?.all ?? {}),
      },
      products: packages.map((p) => p.product),
      packages,
      offerings: {
        currentIdentifier: offerings.current?.identifier ?? null,
        all: Object.keys(offerings.all ?? {}),
      },
    },
  );
}

interface SubscriptionContextType {
  /** True if user has either Plus or AI entitlement */
  isSubscribed: boolean;
  /** Sfera Plus: unlimited entities, custom notifications, statistics */
  hasPlusEntitlement: boolean;
  /** Sfera AI: all AI features */
  hasAIEntitlement: boolean;
  subscriptionStatus: SubscriptionStatus;
  offerings: PurchasesOffering | null;
  customerInfo: CustomerInfo | null;
  checkSubscription: () => Promise<void>;
  refreshCustomerInfo: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<void>;
  restorePurchases: () => Promise<void>;
  presentPaywall: () => Promise<boolean>;
  presentPaywallIfNeeded: (
    requiredEntitlementIdentifier: string,
    offering?: PurchasesOffering,
  ) => Promise<boolean>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined,
);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [hasPlusEntitlement, setHasPlusEntitlement] = useState(false);
  const [hasAIEntitlement, setHasAIEntitlement] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus>("loading");
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // Helper function to update state from customerInfo
  // RevenueCat best practice: Trust the isActive flag from RevenueCat
  const updateSubscriptionState = useCallback((info: CustomerInfo) => {
    const plus = info.entitlements.active[SFERA_PLUS_ENTITLEMENT];
    const ai = info.entitlements.active[SFERA_AI_ENTITLEMENT];
    const hasPlus = plus !== undefined && plus.isActive === true;
    const hasAI = ai !== undefined && ai.isActive === true;
    const hasAny = hasPlus || hasAI;

    setIsSubscribed(hasAny);
    setHasPlusEntitlement(hasPlus);
    setHasAIEntitlement(hasAI);
    setSubscriptionStatus(hasAny ? "subscribed" : "not_subscribed");
    setCustomerInfo(info);

    console.log("[SubscriptionProvider] Subscription state updated:", {
      hasPlusEntitlement: hasPlus,
      hasAIEntitlement: hasAI,
      isSubscribed: hasAny,
      activeEntitlements: Object.keys(info.entitlements.active),
    });
  }, []);

  const checkSubscription = useCallback(
    async (forceSync: boolean = false) => {
      if (!isNativeModuleAvailable || !Purchases) {
        setSubscriptionStatus("not_subscribed");
        setIsSubscribed(false);
        setHasPlusEntitlement(false);
        setHasAIEntitlement(false);
        setCustomerInfo(null);
        return;
      }

      try {
        // RevenueCat best practice: getCustomerInfo() automatically syncs with the store
        // This ensures we have the latest subscription status, including expirations
        // The SDK handles caching, so this is safe to call frequently
        const customerInfo = await Purchases.getCustomerInfo();
        updateSubscriptionState(customerInfo);
      } catch (error) {
        handleDevError(error, "Check Subscription");
        setSubscriptionStatus("not_subscribed");
        setIsSubscribed(false);
        setHasPlusEntitlement(false);
        setHasAIEntitlement(false);
        setCustomerInfo(null);
      }
    },
    [updateSubscriptionState],
  );

  // Refresh customer info - can be called by screens before accessing premium content
  const refreshCustomerInfo = useCallback(async () => {
    console.log("[SubscriptionProvider] Manually refreshing customer info...");
    await checkSubscription();
  }, [checkSubscription]);

  const purchasePackage = useCallback(
    async (pkg: PurchasesPackage) => {
      if (!isNativeModuleAvailable || !Purchases) {
        throw new Error("RevenueCat native module not available");
      }

      try {
        const { customerInfo } = await Purchases.purchasePackage(pkg);

        // Update subscription state using helper function
        updateSubscriptionState(customerInfo);
      } catch (error: any) {
        // Handle purchase errors
        if (error.userCancelled) {
          // User cancelled the purchase, don't update state
          return;
        }
        handleDevError(error, "Purchase Package");
        throw error;
      }
    },
    [updateSubscriptionState],
  );

  const restorePurchases = useCallback(async () => {
    if (!isNativeModuleAvailable || !Purchases) {
      throw new Error("RevenueCat native module not available");
    }

    try {
      const customerInfo = await Purchases.restorePurchases();

      // Update subscription state using helper function
      updateSubscriptionState(customerInfo);
    } catch (error) {
      // Error restoring purchases
      handleDevError(error, "Restore Purchases");
      throw error;
    }
  }, [updateSubscriptionState]);

  useEffect(() => {
    // Initialize RevenueCat subscription system
    const initializeSubscription = async () => {
      if (!isNativeModuleAvailable || !Purchases) {
        setSubscriptionStatus("not_subscribed");
        setIsSubscribed(false);
        setHasPlusEntitlement(false);
        setHasAIEntitlement(false);
        setOfferings(null);
        return;
      }

      try {
        // Fetch offerings from RevenueCat
        const offerings = await Purchases.getOfferings();

        if (offerings.current !== null) {
          setOfferings(offerings.current);
        }

        // Check subscription status (this syncs with store automatically)
        const customerInfo = await Purchases.getCustomerInfo();
        updateSubscriptionState(customerInfo);

        // Log all subscriptions, products, packages, and entitlements on init
        logSubscriptionInitInfo(offerings, customerInfo);
      } catch (error) {
        handleDevError(error, "Initialize Subscription");
        setSubscriptionStatus("not_subscribed");
        setIsSubscribed(false);
        setHasPlusEntitlement(false);
        setHasAIEntitlement(false);
        setOfferings(null);
      }
    };

    initializeSubscription();

    // Add CustomerInfo update listener (RevenueCat best practice)
    // This automatically updates subscription state when purchases/restores complete
    let listener: any = null;

    if (isNativeModuleAvailable && Purchases) {
      try {
        console.log(
          "[SubscriptionProvider] Adding CustomerInfo update listener",
        );
        listener = Purchases.addCustomerInfoUpdateListener(
          (info: CustomerInfo) => {
            console.log(
              "[SubscriptionProvider] CustomerInfo updated via listener",
            );
            updateSubscriptionState(info);
          },
        );
      } catch (error) {
        handleDevError(error, "Add CustomerInfo Listener");
      }
    }

    // Cleanup listener on unmount
    return () => {
      if (listener && typeof listener.remove === "function") {
        console.log(
          "[SubscriptionProvider] Removing CustomerInfo update listener",
        );
        listener.remove();
      }
    };
  }, [checkSubscription, updateSubscriptionState]);

  // RevenueCat best practice: Refresh subscription status when app comes to foreground
  // This ensures we catch subscription expirations that occurred while the app was in background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // When app comes to foreground, refresh subscription status
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        console.log(
          "[SubscriptionProvider] App came to foreground, refreshing subscription status...",
        );
        // Refresh subscription status to catch any expirations that occurred in background
        checkSubscription();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
    };
  }, [checkSubscription]);

  const handlePresentPaywall = useCallback(async (): Promise<boolean> => {
    const result = await presentPaywall();
    if (result) {
      // User purchased or restored, refresh subscription status
      await checkSubscription();
    }
    return result;
  }, [checkSubscription]);

  const handlePresentPaywallIfNeeded = useCallback(
    async (
      requiredEntitlementIdentifier: string,
      offering?: PurchasesOffering,
    ): Promise<boolean> => {
      const result = await presentPaywallIfNeeded({
        requiredEntitlementIdentifier,
        offering: offering || offerings || undefined,
      });
      if (result) {
        // User has entitlement or purchased/restored, refresh subscription status
        await checkSubscription();
      }
      return result;
    },
    [checkSubscription, offerings],
  );

  const value: SubscriptionContextType = {
    isSubscribed,
    hasPlusEntitlement,
    hasAIEntitlement,
    subscriptionStatus,
    offerings,
    customerInfo,
    checkSubscription,
    refreshCustomerInfo,
    purchasePackage,
    restorePurchases,
    presentPaywall: handlePresentPaywall,
    presentPaywallIfNeeded: handlePresentPaywallIfNeeded,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error(
      "useSubscription must be used within a SubscriptionProvider",
    );
  }
  return context;
}
