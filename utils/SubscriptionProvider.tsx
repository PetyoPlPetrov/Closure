import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus, InteractionManager } from "react-native";
import type {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";
import { handleDevError } from "./dev-error-handler";
import {
  SFERA_AI_ENTITLEMENT,
  SFERA_AI_PRODUCT_ID,
  SFERA_PLUS_ENTITLEMENT,
  SFERA_PLUS_PRODUCT_ID,
} from "./entitlements";
import { presentPaywall, presentPaywallIfNeeded } from "./revenuecat-paywall";
import { isNativeModuleAvailable, Purchases } from "./revenuecat-wrapper";

export type SubscriptionStatus = "loading" | "subscribed" | "not_subscribed";

export type PrimaryPlan = "ai" | "plus" | null;

interface SubscriptionContextType {
  /** True if user has either Plus or AI entitlement */
  isSubscribed: boolean;
  /** Sfera Plus: unlimited entities, custom notifications, statistics */
  hasPlusEntitlement: boolean;
  /** Sfera AI: all AI features */
  hasAIEntitlement: boolean;
  /** Plan to display (AI product vs Plus product) - resolves "both entitlements" correctly */
  primaryPlan: PrimaryPlan;
  subscriptionStatus: SubscriptionStatus;
  offerings: PurchasesOffering | null;
  customerInfo: CustomerInfo | null;
  /** Waits for subscription to resolve if loading. hasEntityLimitEntitlement = Plus OR AI (both include unlimited). */
  ensureSubscriptionResolved: () => Promise<{
    hasPlusEntitlement: boolean;
    hasAIEntitlement: boolean;
    hasEntityLimitEntitlement: boolean;
  }>;
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
  const [primaryPlan, setPrimaryPlan] = useState<PrimaryPlan>(null);
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

    // Determine primaryPlan from activeSubscriptions: which Apple subscription plan
    // the user actually purchased. Sfera Plus product (sferasplus) vs Sfera AI product (sferas).
    // RevenueCat entitlements can be granted by either product; we need the purchased plan.
    const activeSubs = info.activeSubscriptions ?? [];
    const hasAIPlan = activeSubs.includes(SFERA_AI_PRODUCT_ID);
    const hasPlusPlan = activeSubs.includes(SFERA_PLUS_PRODUCT_ID);
    let plan: PrimaryPlan = null;
    if (hasAIPlan) {
      plan = "ai"; // User has Sfera AI subscription plan
    } else if (hasPlusPlan) {
      plan = "plus"; // User has Sfera Plus subscription plan
    } else if (hasAI) {
      plan = "ai"; // Fallback: has AI entitlement but activeSubs empty
    } else if (hasPlus) {
      plan = "plus";
    }

    setIsSubscribed(hasAny);
    setHasPlusEntitlement(hasPlus);
    setHasAIEntitlement(hasAI);
    setPrimaryPlan(plan);
    setSubscriptionStatus(hasAny ? "subscribed" : "not_subscribed");
    setCustomerInfo(info);
  }, []);

  const checkSubscription = useCallback(
    async (forceSync: boolean = false) => {
      if (!isNativeModuleAvailable || !Purchases) {
        setSubscriptionStatus("not_subscribed");
        setIsSubscribed(false);
        setHasPlusEntitlement(false);
        setHasAIEntitlement(false);
        setPrimaryPlan(null);
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
        setPrimaryPlan(null);
        setCustomerInfo(null);
      }
    },
    [updateSubscriptionState],
  );

  // Refresh customer info - can be called by screens before accessing premium content
  const refreshCustomerInfo = useCallback(async () => {
    await checkSubscription();
  }, [checkSubscription]);

  /** Waits for subscription to resolve if loading. hasEntityLimitEntitlement = Plus OR AI (both include unlimited). */
  const ensureSubscriptionResolved = useCallback(async (): Promise<{
    hasPlusEntitlement: boolean;
    hasAIEntitlement: boolean;
    hasEntityLimitEntitlement: boolean;
  }> => {
    if (!isNativeModuleAvailable || !Purchases) {
      return {
        hasPlusEntitlement: false,
        hasAIEntitlement: false,
        hasEntityLimitEntitlement: false,
      };
    }
    if (subscriptionStatus === "loading") {
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        updateSubscriptionState(customerInfo);
        const plus = customerInfo.entitlements.active[SFERA_PLUS_ENTITLEMENT];
        const ai = customerInfo.entitlements.active[SFERA_AI_ENTITLEMENT];
        const hasPlus = plus !== undefined && plus.isActive === true;
        const hasAI = ai !== undefined && ai.isActive === true;
        return {
          hasPlusEntitlement: hasPlus,
          hasAIEntitlement: hasAI,
          hasEntityLimitEntitlement: hasPlus || hasAI,
        };
      } catch (error) {
        handleDevError(error, "Ensure Subscription Resolved");
        return {
          hasPlusEntitlement: false,
          hasAIEntitlement: false,
          hasEntityLimitEntitlement: false,
        };
      }
    }
    return {
      hasPlusEntitlement,
      hasAIEntitlement,
      hasEntityLimitEntitlement: hasPlusEntitlement || hasAIEntitlement,
    };
  }, [
    subscriptionStatus,
    hasPlusEntitlement,
    hasAIEntitlement,
    updateSubscriptionState,
  ]);

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
    let listener: any = null;

    const initializeSubscription = async () => {
      if (!isNativeModuleAvailable || !Purchases) {
        setSubscriptionStatus("not_subscribed");
        setIsSubscribed(false);
        setHasPlusEntitlement(false);
        setHasAIEntitlement(false);
        setPrimaryPlan(null);
        setOfferings(null);
        return;
      }

      try {
        // Add listener first – the React Native bridge sometimes doesn't resolve
        // getCustomerInfo() promises, but the listener reliably receives updates
        // when the native SDK gets CustomerInfo (including initial fetch).
        listener = Purchases.addCustomerInfoUpdateListener(
          (info: CustomerInfo) => updateSubscriptionState(info),
        );

        const offerings = await Purchases.getOfferings();
        if (offerings.current !== null) {
          setOfferings(offerings.current);
        }

        // getCustomerInfo triggers the fetch; we may get the result via the
        // listener above if the promise doesn't resolve (known bridge issue).
        const customerInfo = await Purchases.getCustomerInfo();
        updateSubscriptionState(customerInfo);
      } catch (error) {
        handleDevError(error, "Initialize Subscription");
        setSubscriptionStatus("not_subscribed");
        setIsSubscribed(false);
        setHasPlusEntitlement(false);
        setHasAIEntitlement(false);
        setPrimaryPlan(null);
        setOfferings(null);
      }
    };

    initializeSubscription();

    return () => {
      if (listener && typeof listener.remove === "function") {
        listener.remove();
      }
    };
  }, [updateSubscriptionState]);

  // RevenueCat best practice: Refresh subscription status when app comes to foreground
  // This ensures we catch subscription expirations that occurred while the app was in background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // When app comes to foreground, refresh subscription status
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        InteractionManager.runAfterInteractions(() => {
          checkSubscription();
        });
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
    primaryPlan,
    subscriptionStatus,
    offerings,
    customerInfo,
    ensureSubscriptionResolved,
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
