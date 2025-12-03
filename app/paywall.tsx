import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { useLargeDevice } from '@/hooks/use-large-device';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import { useSubscription } from '@/utils/SubscriptionProvider';
import { useTranslate } from '@/utils/languages/use-translate';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';

export default function PaywallScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const { maxContentWidth } = useLargeDevice();
  const t = useTranslate();
  const { offerings, purchasePackage, restorePurchases, subscriptionStatus } = useSubscription();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);

  const monthlyPackage = useMemo(() => {
    return offerings?.availablePackages.find(pkg => 
      pkg.identifier === '$rc_monthly' || 
      pkg.packageType === 'MONTHLY'
    );
  }, [offerings]);

  const yearlyPackage = useMemo(() => {
    return offerings?.availablePackages.find(pkg => 
      pkg.identifier === '$rc_annual' || 
      pkg.packageType === 'ANNUAL'
    );
  }, [offerings]);

  // Default to yearly if available, otherwise monthly
  const defaultPackage = yearlyPackage || monthlyPackage;

  const handlePurchase = useCallback(async (pkg: PurchasesPackage) => {
    if (isPurchasing) return;
    
    try {
      setIsPurchasing(true);
      setSelectedPackage(pkg);
      await purchasePackage(pkg);
      
      // Success - navigate back or to a success screen
      Alert.alert(
        t('subscription.success.title') || 'Success!',
        t('subscription.success.message') || 'Your subscription is now active!',
        [
          {
            text: t('common.ok') || 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      if (!error.userCancelled) {
        Alert.alert(
          t('subscription.error.title') || 'Purchase Failed',
          error.message || t('subscription.error.message') || 'Something went wrong. Please try again.',
          [{ text: t('common.ok') || 'OK' }]
        );
      }
    } finally {
      setIsPurchasing(false);
      setSelectedPackage(null);
    }
  }, [isPurchasing, purchasePackage, t]);

  const handleRestore = useCallback(async () => {
    try {
      setIsPurchasing(true);
      await restorePurchases();
      Alert.alert(
        t('subscription.restore.success.title') || 'Restored',
        t('subscription.restore.success.message') || 'Your purchases have been restored.',
        [{ text: t('common.ok') || 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert(
        t('subscription.restore.error.title') || 'Restore Failed',
        error.message || t('subscription.restore.error.message') || 'No purchases found to restore.',
        [{ text: t('common.ok') || 'OK' }]
      );
    } finally {
      setIsPurchasing(false);
    }
  }, [restorePurchases, t]);

  const formatPrice = (pkg: PurchasesPackage) => {
    return pkg.product.priceString;
  };

  const calculateYearlySavings = () => {
    if (!monthlyPackage || !yearlyPackage) return null;
    const monthlyPrice = monthlyPackage.product.price;
    const yearlyPrice = yearlyPackage.product.price;
    const yearlyEquivalent = monthlyPrice * 12;
    const savings = yearlyEquivalent - yearlyPrice;
    const savingsPercent = Math.round((savings / yearlyEquivalent) * 100);
    return savingsPercent;
  };

  // Auto-select default package when offerings load
  useEffect(() => {
    if (defaultPackage && !selectedPackage) {
      setSelectedPackage(defaultPackage);
    }
  }, [defaultPackage, selectedPackage]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
        screenHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16 * fontScale,
          paddingTop: 8 * fontScale,
          paddingBottom: 8 * fontScale,
          marginTop: 20,
        },
        headerButton: {
          width: 48 * fontScale,
          height: 48 * fontScale,
          alignItems: 'center',
          justifyContent: 'center',
        },
        headerTitle: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8 * fontScale,
          flex: 1,
          justifyContent: 'center',
        },
        scrollContent: {
          padding: 16 * fontScale,
          gap: 24 * fontScale,
          maxWidth: maxContentWidth as any,
          alignSelf: 'center',
          width: '100%',
        },
        header: {
          alignItems: 'center',
          marginBottom: 16 * fontScale,
        },
        title: {
          fontSize: 32 * fontScale,
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: 8 * fontScale,
        },
        subtitle: {
          fontSize: 16 * fontScale,
          textAlign: 'center',
          opacity: 0.7,
        },
        featuresContainer: {
          gap: 16 * fontScale,
          marginBottom: 24 * fontScale,
        },
        featureRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12 * fontScale,
        },
        featureIcon: {
          width: 24 * fontScale,
          height: 24 * fontScale,
          borderRadius: 12 * fontScale,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        },
        packagesContainer: {
          gap: 16 * fontScale,
        },
        packageButton: {
          borderRadius: 16 * fontScale,
          overflow: 'hidden',
          borderWidth: 2,
          borderColor: 'transparent',
        },
        packageButtonSelected: {
          borderColor: colors.primary,
        },
        packageContent: {
          padding: 20 * fontScale,
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.05)' 
            : 'rgba(0, 0, 0, 0.05)',
        },
        packageHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 8 * fontScale,
        },
        packageTitle: {
          fontSize: 20 * fontScale,
          fontWeight: 'bold',
        },
        packagePrice: {
          fontSize: 24 * fontScale,
          fontWeight: 'bold',
        },
        packagePeriod: {
          fontSize: 14 * fontScale,
          opacity: 0.7,
          marginTop: 4 * fontScale,
        },
        savingsBadge: {
          backgroundColor: colors.primary,
          paddingHorizontal: 8 * fontScale,
          paddingVertical: 4 * fontScale,
          borderRadius: 8 * fontScale,
          marginTop: 8 * fontScale,
          alignSelf: 'flex-start',
        },
        savingsText: {
          color: '#ffffff',
          fontSize: 12 * fontScale,
          fontWeight: '600',
        },
        primaryButton: {
          backgroundColor: colors.primary,
          padding: 16 * fontScale,
          borderRadius: 12 * fontScale,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 24 * fontScale,
        },
        primaryButtonDisabled: {
          opacity: 0.5,
        },
        primaryButtonText: {
          color: '#ffffff',
          fontSize: 18 * fontScale,
          fontWeight: 'bold',
        },
        restoreButton: {
          padding: 16 * fontScale,
          alignItems: 'center',
        },
        restoreButtonText: {
          fontSize: 14 * fontScale,
          color: colors.primary,
        },
      }),
    [fontScale, maxContentWidth, colorScheme, colors]
  );

  if (subscriptionStatus === 'loading') {
    return (
      <TabScreenContainer>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </TabScreenContainer>
    );
  }

  return (
    <TabScreenContainer>
      <View style={styles.screenHeader}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="arrow-back"
            size={24 * fontScale}
            color={colors.text}
          />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <MaterialIcons name="star" size={20 * fontScale} color={colors.primary} />
          <ThemedText size="l" weight="bold" letterSpacing="s">
            {t('subscription.title') || 'Unlock Premium'}
          </ThemedText>
        </View>
        <View style={styles.headerButton} />
      </View>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <ThemedText size="xl" weight="bold" style={styles.title}>
              {t('subscription.title') || 'Unlock Premium'}
            </ThemedText>
            <ThemedText size="m" style={styles.subtitle}>
              {t('subscription.subtitle') || 'Get unlimited access to all features'}
            </ThemedText>
          </View>

          {/* Features */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <MaterialIcons name="check" size={16 * fontScale} color="#ffffff" />
              </View>
              <ThemedText size="m">
                {t('subscription.feature.unlimited') || 'Unlimited partners, jobs, friends, family members, and hobbies'}
              </ThemedText>
            </View>
            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <MaterialIcons name="check" size={16 * fontScale} color="#ffffff" />
              </View>
              <ThemedText size="m">
                {t('subscription.feature.insights') || 'Access to premium insights and analytics'}
              </ThemedText>
            </View>
            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <MaterialIcons name="check" size={16 * fontScale} color="#ffffff" />
              </View>
              <ThemedText size="m">
                {t('subscription.feature.support') || 'Priority support and updates'}
              </ThemedText>
            </View>
          </View>

          {/* Packages */}
          <View style={styles.packagesContainer}>
            {yearlyPackage && (
              <TouchableOpacity
                style={[
                  styles.packageButton,
                  selectedPackage?.identifier === yearlyPackage.identifier && styles.packageButtonSelected,
                ]}
                onPress={() => setSelectedPackage(yearlyPackage)}
                disabled={isPurchasing}
              >
                <View style={styles.packageContent}>
                  <View style={styles.packageHeader}>
                    <View>
                      <ThemedText size="l" weight="bold" style={styles.packageTitle}>
                        {t('subscription.yearly.title') || 'Yearly'}
                      </ThemedText>
                      <ThemedText size="m" style={styles.packagePrice}>
                        {formatPrice(yearlyPackage)}
                      </ThemedText>
                      <ThemedText size="sm" style={styles.packagePeriod}>
                        {t('subscription.yearly.period') || 'per year'}
                      </ThemedText>
                    </View>
                    {calculateYearlySavings() && (
                      <View style={styles.savingsBadge}>
                        <ThemedText style={styles.savingsText}>
                          {t('subscription.yearly.savings').replace('{percent}', calculateYearlySavings()?.toString() || '20') || 
                            `Save ${calculateYearlySavings()}%`}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {monthlyPackage && (
              <TouchableOpacity
                style={[
                  styles.packageButton,
                  selectedPackage?.identifier === monthlyPackage.identifier && styles.packageButtonSelected,
                ]}
                onPress={() => setSelectedPackage(monthlyPackage)}
                disabled={isPurchasing}
              >
                <View style={styles.packageContent}>
                  <View style={styles.packageHeader}>
                    <View>
                      <ThemedText size="l" weight="bold" style={styles.packageTitle}>
                        {t('subscription.monthly.title') || 'Monthly'}
                      </ThemedText>
                      <ThemedText size="m" style={styles.packagePrice}>
                        {formatPrice(monthlyPackage)}
                      </ThemedText>
                      <ThemedText size="sm" style={styles.packagePeriod}>
                        {t('subscription.monthly.period') || 'per month'}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Purchase Button */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!selectedPackage || isPurchasing) && styles.primaryButtonDisabled,
            ]}
            onPress={() => selectedPackage && handlePurchase(selectedPackage)}
            disabled={!selectedPackage || isPurchasing}
          >
            {isPurchasing ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText style={styles.primaryButtonText}>
                {t('subscription.purchase') || 'Subscribe'}
              </ThemedText>
            )}
          </TouchableOpacity>

          {/* Close Button */}
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={() => router.back()}
            disabled={isPurchasing}
          >
            <ThemedText style={styles.restoreButtonText}>
              {t('common.close') || 'Close'}
            </ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </TabScreenContainer>
  );
}

