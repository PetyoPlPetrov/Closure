import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import type { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

// Subscription status is NOT persisted - subscriptions are session-only for testing
// When you integrate real RevenueCat, subscriptions will be managed by their servers

export type SubscriptionStatus = 'loading' | 'subscribed' | 'not_subscribed';

interface SubscriptionContextType {
  isSubscribed: boolean;
  subscriptionStatus: SubscriptionStatus;
  offerings: PurchasesOffering | null;
  customerInfo: CustomerInfo | null;
  checkSubscription: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<void>;
  restorePurchases: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

interface SubscriptionProviderProps {
  children: ReactNode;
}

// Helper function to create a mock PurchasesPackage
const createMockPackage = (
  identifier: string,
  packageType: 'MONTHLY' | 'ANNUAL' | 'WEEKLY' | 'TRIAL' | 'CUSTOM',
  productId: string,
  title: string,
  description: string,
  price: number,
  priceString: string
): PurchasesPackage => {
  return {
    identifier,
    packageType,
    product: {
      identifier: productId,
      description,
      title,
      price,
      priceString,
      currencyCode: 'EUR',
      introPrice: null,
      discounts: [],
      subscriptionPeriod: packageType === 'MONTHLY' ? 'P1M' : 'P1Y',
      subscriptionGroupIdentifier: null,
    },
    offeringIdentifier: 'default',
    presentedOfferingContext: null,
  } as unknown as PurchasesPackage;
};

// Mock subscription data
const createMockOfferings = (): PurchasesOffering => {
  const monthlyPackage = createMockPackage(
    '$rc_monthly',
    'MONTHLY',
    'premium_monthly',
    'Monthly Premium',
    'Premium Monthly Subscription',
    5.0,
    '€5.00'
  );

  const yearlyPackage = createMockPackage(
    '$rc_annual',
    'ANNUAL',
    'premium_annual',
    'Annual Premium',
    'Premium Annual Subscription (20% off)',
    48.0, // 5 * 12 * 0.8 = 48 (20% discount)
    '€48.00'
  );

  return {
    identifier: 'default',
    serverDescription: 'Premium subscription',
    metadata: {},
    availablePackages: [monthlyPackage, yearlyPackage],
    lifetime: null,
    annual: yearlyPackage,
    sixMonth: null,
    threeMonth: null,
    twoMonth: null,
    monthly: monthlyPackage,
    weekly: null,
  } as PurchasesOffering;
};

// Subscription status is NOT persisted - subscriptions are session-only for testing
// When you integrate real RevenueCat, subscriptions will be managed by their servers

// Helper to create mock CustomerInfo
const createMockCustomerInfo = (isSubscribed: boolean, expiryDate: Date | null, productIdentifier?: string): CustomerInfo => {
  const expiryDateString = expiryDate ? expiryDate.toISOString() : null;
  const now = new Date().toISOString();

  return {
    entitlements: {
      active: isSubscribed && expiryDate
        ? {
            premium: {
              identifier: 'premium',
              isActive: true,
              willRenew: true,
              periodType: 'NORMAL',
              latestPurchaseDate: now,
              originalPurchaseDate: now,
              expirationDate: expiryDateString,
              store: 'APP_STORE',
              productIdentifier: productIdentifier || 'premium_monthly',
              isSandbox: false,
              unsubscribeDetectedAt: null,
              billingIssueDetectedAt: null,
              gracePeriodExpiresDate: null,
            },
          }
        : {},
      all: isSubscribed && expiryDate
        ? {
            premium: {
              identifier: 'premium',
              isActive: true,
              willRenew: true,
              periodType: 'NORMAL',
              latestPurchaseDate: now,
              originalPurchaseDate: now,
              expirationDate: expiryDateString,
              store: 'APP_STORE',
              productIdentifier: productIdentifier || 'premium_monthly',
              isSandbox: false,
              unsubscribeDetectedAt: null,
              billingIssueDetectedAt: null,
              gracePeriodExpiresDate: null,
            },
          }
        : {},
    },
    activeSubscriptions: isSubscribed ? [productIdentifier || 'premium_monthly'] : [],
    allPurchasedProductIdentifiers: isSubscribed ? [productIdentifier || 'premium_monthly'] : [],
    latestExpirationDate: expiryDateString,
    firstSeen: now,
    originalAppUserId: 'mock_user_id',
    managementURL: null,
    requestDate: now,
    originalApplicationVersion: null,
    allExpirationDates: isSubscribed && expiryDateString ? { [productIdentifier || 'premium_monthly']: expiryDateString } : {},
    allPurchaseDates: isSubscribed ? { [productIdentifier || 'premium_monthly']: now } : {},
  } as CustomerInfo;
};

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('loading');
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const checkSubscription = useCallback(async () => {
    try {
      // Don't load from AsyncStorage - subscriptions are session-only for testing
      // const { isSubscribed: subscribed, expiryDate } = await loadSubscriptionStatus();
      
      // Always start as not subscribed (subscriptions don't persist)
      setIsSubscribed(false);
      setSubscriptionStatus('not_subscribed');
      
      // Create mock customer info
      const mockCustomerInfo = createMockCustomerInfo(false, null);
      setCustomerInfo(mockCustomerInfo);
    } catch (error) {
      setSubscriptionStatus('not_subscribed');
      setIsSubscribed(false);
    }
  }, []);

  const purchasePackage = useCallback(async (pkg: PurchasesPackage) => {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Calculate expiry date based on package type
      const now = new Date();
      let expiryDate: Date;
      
      if (pkg.packageType === 'MONTHLY') {
        expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
      } else if (pkg.packageType === 'ANNUAL') {
        expiryDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 365 days
      } else {
        expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // Default to 30 days
      }
      
      // DON'T save subscription status to AsyncStorage - keep it in memory only for testing
      // await saveSubscriptionStatus(true, expiryDate);
      
      // Update state only (not persisted)
      setIsSubscribed(true);
      setSubscriptionStatus('subscribed');
      
      // Update customer info
      const mockCustomerInfo = createMockCustomerInfo(true, expiryDate, pkg.product.identifier);
      setCustomerInfo(mockCustomerInfo);
    } catch (error: any) {
      throw error;
    }
  }, []);

  const restorePurchases = useCallback(async () => {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Don't restore from AsyncStorage - subscriptions are session-only
      // Always throw error since we don't persist subscriptions
      throw new Error('No purchases found to restore');
    } catch (error) {
      throw error;
    }
  }, []);

  useEffect(() => {
    // Initialize mock subscription system
    const initializeMockSubscription = async () => {
      try {
        // Create mock offerings
        const mockOfferings = createMockOfferings();
        setOfferings(mockOfferings);
        
        // Check subscription status
        await checkSubscription();
      } catch (error) {
        setSubscriptionStatus('not_subscribed');
        setIsSubscribed(false);
      }
    };

    initializeMockSubscription();
  }, [checkSubscription]);

  const value: SubscriptionContextType = {
    isSubscribed,
    subscriptionStatus,
    offerings,
    customerInfo,
    checkSubscription,
    purchasePackage,
    restorePurchases,
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
