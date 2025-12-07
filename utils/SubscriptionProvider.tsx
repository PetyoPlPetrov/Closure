import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { Purchases, isNativeModuleAvailable } from './revenuecat-wrapper';
import type { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { presentPaywall, presentPaywallIfNeeded } from './revenuecat-paywall';
import { handleDevError } from './dev-error-handler';

export type SubscriptionStatus = 'loading' | 'subscribed' | 'not_subscribed';

interface SubscriptionContextType {
  isSubscribed: boolean;
  subscriptionStatus: SubscriptionStatus;
  offerings: PurchasesOffering | null;
  customerInfo: CustomerInfo | null;
  checkSubscription: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<void>;
  restorePurchases: () => Promise<void>;
  presentPaywall: () => Promise<boolean>;
  presentPaywallIfNeeded: (requiredEntitlementIdentifier: string, offering?: PurchasesOffering) => Promise<boolean>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('loading');
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const checkSubscription = useCallback(async () => {
    if (!isNativeModuleAvailable || !Purchases) {
      setSubscriptionStatus('not_subscribed');
      setIsSubscribed(false);
      setCustomerInfo(null);
      return;
    }

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      
      // Check for "Sfera Premium" entitlement
      const hasPremiumEntitlement = typeof customerInfo.entitlements.active['Sfera Premium'] !== 'undefined';
      
      setIsSubscribed(hasPremiumEntitlement);
      setSubscriptionStatus(hasPremiumEntitlement ? 'subscribed' : 'not_subscribed');
      setCustomerInfo(customerInfo);
    } catch (error) {
      // Error fetching customer info
      handleDevError(error, 'Check Subscription');
      setSubscriptionStatus('not_subscribed');
      setIsSubscribed(false);
      setCustomerInfo(null);
    }
  }, []);

  const purchasePackage = useCallback(async (pkg: PurchasesPackage) => {
    if (!isNativeModuleAvailable || !Purchases) {
      throw new Error('RevenueCat native module not available');
    }

    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      
      // Check for "Sfera Premium" entitlement after purchase
      const hasPremiumEntitlement = typeof customerInfo.entitlements.active['Sfera Premium'] !== 'undefined';
      
      setIsSubscribed(hasPremiumEntitlement);
      setSubscriptionStatus(hasPremiumEntitlement ? 'subscribed' : 'not_subscribed');
      setCustomerInfo(customerInfo);
    } catch (error: any) {
      // Handle purchase errors
      if (error.userCancelled) {
        // User cancelled the purchase, don't update state
        return;
      }
      handleDevError(error, 'Purchase Package');
      throw error;
    }
  }, []);

  const restorePurchases = useCallback(async () => {
    if (!isNativeModuleAvailable || !Purchases) {
      throw new Error('RevenueCat native module not available');
    }

    try {
      const customerInfo = await Purchases.restorePurchases();
      
      // Check for "Sfera Premium" entitlement after restore
      const hasPremiumEntitlement = typeof customerInfo.entitlements.active['Sfera Premium'] !== 'undefined';
      
      setIsSubscribed(hasPremiumEntitlement);
      setSubscriptionStatus(hasPremiumEntitlement ? 'subscribed' : 'not_subscribed');
      setCustomerInfo(customerInfo);
    } catch (error) {
      // Error restoring purchases
      handleDevError(error, 'Restore Purchases');
      throw error;
    }
  }, []);

  useEffect(() => {
    // Initialize RevenueCat subscription system
    const initializeSubscription = async () => {
      if (!isNativeModuleAvailable || !Purchases) {
        setSubscriptionStatus('not_subscribed');
        setIsSubscribed(false);
        setOfferings(null);
        return;
      }

      try {
        // Fetch offerings from RevenueCat
        const offerings = await Purchases.getOfferings();
        
        if (offerings.current !== null) {
          setOfferings(offerings.current);
        }
        
        // Check subscription status
        await checkSubscription();
      } catch (error) {
        // Error initializing subscription system
        handleDevError(error, 'Initialize Subscription');
        setSubscriptionStatus('not_subscribed');
        setIsSubscribed(false);
        setOfferings(null);
      }
    };

    initializeSubscription();
  }, [checkSubscription]);

  const handlePresentPaywall = useCallback(async (): Promise<boolean> => {
    const result = await presentPaywall();
    if (result) {
      // User purchased or restored, refresh subscription status
      await checkSubscription();
    }
    return result;
  }, [checkSubscription]);

  const handlePresentPaywallIfNeeded = useCallback(async (
    requiredEntitlementIdentifier: string,
    offering?: PurchasesOffering
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
  }, [checkSubscription, offerings]);

  const value: SubscriptionContextType = {
    isSubscribed,
    subscriptionStatus,
    offerings,
    customerInfo,
    checkSubscription,
    purchasePackage,
    restorePurchases,
    presentPaywall: handlePresentPaywall,
    presentPaywallIfNeeded: handlePresentPaywallIfNeeded,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
