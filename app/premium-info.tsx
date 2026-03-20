import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { TabScreenContainer } from "@/library/components/tab-screen-container";
import { useTranslate } from "@/utils/languages/use-translate";
import { showPaywallForUpgradeAccess } from "@/utils/premium-access";
import { useSubscription } from "@/utils/SubscriptionProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo } from "react";
import {
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
    type ViewStyle,
} from "react-native";

const SFERA_AI_FEATURES: {
  icon: keyof typeof MaterialIcons.glyphMap;
  key: string;
}[] = [
  { icon: "psychology", key: "premium.feature.ai" },
  { icon: "people", key: "premium.feature.unlimited" },
  { icon: "notifications-active", key: "premium.feature.notifications" },
  { icon: "insights", key: "premium.feature.analytics" },
];

const SFERA_PLUS_FEATURES: {
  icon: keyof typeof MaterialIcons.glyphMap;
  key: string;
}[] = [
  { icon: "people", key: "premium.feature.unlimited" },
  { icon: "notifications-active", key: "premium.feature.notifications" },
  { icon: "insights", key: "premium.feature.analytics" },
];

export default function PremiumInfoScreen() {
  const t = useTranslate();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const fontScale = useFontScale();
  const {
    hasPlusEntitlement,
    hasAIEntitlement,
    primaryPlan,
    isSubscribed,
    checkSubscription,
    presentPaywall,
  } = useSubscription();
  const params = useLocalSearchParams<{ plan?: string }>();
  const forcePlan =
    params.plan === "plus" ? "plus" : params.plan === "ai" ? "ai" : null;

  const { activeBadgeKey, features } = useMemo(() => {
    const hasPlus = hasPlusEntitlement || primaryPlan === "plus";
    const hasAI = hasAIEntitlement || primaryPlan === "ai";

    // Dev: force plan via URL param (e.g. ?plan=plus) – show plan features but badge must reflect actual subscription
    if (forcePlan === "plus") {
      return {
        activeBadgeKey: (hasPlus ? "premium.activeBadge.plus" : "premium.plan.sferaPlus") as const,
        features: SFERA_PLUS_FEATURES,
      };
    }
    if (forcePlan === "ai") {
      return {
        activeBadgeKey: (hasAI ? "premium.activeBadge.ai" : "premium.plan.sferaAI") as const,
        features: SFERA_AI_FEATURES,
      };
    }
    // No force plan: use actual subscription status
    if (primaryPlan === "ai" || hasAI) {
      return {
        activeBadgeKey: "premium.activeBadge.ai" as const,
        features: SFERA_AI_FEATURES,
      };
    }
    if (primaryPlan === "plus" || hasPlus) {
      return {
        activeBadgeKey: "premium.activeBadge.plus" as const,
        features: SFERA_PLUS_FEATURES,
      };
    }
    return {
      activeBadgeKey: "premium.activeBadge" as const,
      features: SFERA_AI_FEATURES,
    };
  }, [hasPlusEntitlement, hasAIEntitlement, primaryPlan, forcePlan]);

  // When user has no plan, show the paywall on open
  useEffect(() => {
    if (!isSubscribed) {
      presentPaywall().then((success) => {
        if (success) checkSubscription();
      });
    }
  }, [isSubscribed, presentPaywall, checkSubscription]);

  const styles = useMemo(
    () => createStyles(colors, colorScheme ?? "dark", fontScale),
    [colors, colorScheme, fontScale],
  );

  return (
    <TabScreenContainer style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={12}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText size="l" weight="semibold" style={styles.title}>
          {t("settings.subscriptions.premium")}
        </ThemedText>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.activeBadge}>
          <View style={styles.activeBadgeIcon}>
            <MaterialIcons
              name="check-circle"
              size={28 * fontScale}
              color={colors.primary}
            />
          </View>
          <ThemedText size="l" weight="semibold" style={styles.activeBadgeText}>
            {t(activeBadgeKey)}
          </ThemedText>
        </View>

        <ThemedText size="sm" weight="medium" style={styles.sectionTitle}>
          {t("premium.whatsIncluded")}
        </ThemedText>

        <View style={styles.featuresList}>
          {features.map(({ icon, key }) => (
            <View key={key} style={styles.featureRow}>
              <View style={styles.iconWrapper}>
                <MaterialIcons
                  name={icon}
                  size={22 * fontScale}
                  color={colors.primary}
                />
              </View>
              <ThemedText size="sm" style={styles.featureText}>
                {t(key)}
              </ThemedText>
            </View>
          ))}
        </View>

        {features === SFERA_PLUS_FEATURES && primaryPlan !== "ai" && (
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={async () => {
              const success = await showPaywallForUpgradeAccess();
              if (success) await checkSubscription();
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="rocket-launch"
              size={22 * fontScale}
              color="#FFFFFF"
            />
            <ThemedText
              size="l"
              weight="semibold"
              style={styles.upgradeButtonText}
            >
              {t("premium.upgrade")}
            </ThemedText>
          </TouchableOpacity>
        )}
      </ScrollView>
    </TabScreenContainer>
  );
}

function createStyles(
  colors: { text: string; primary: string },
  scheme: "light" | "dark",
  fontScale: number,
) {
  const isDark = scheme === "dark";
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16 * fontScale,
      paddingTop: 48 * fontScale,
      paddingBottom: 16 * fontScale,
      borderBottomWidth: 1,
      borderBottomColor: isDark
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(0, 0, 0, 0.1)",
    } as ViewStyle,
    backButton: {
      padding: 16 * fontScale,
      minWidth: 40 * fontScale,
      alignItems: "center",
    } as ViewStyle,
    title: {
      flex: 1,
      textAlign: "center",
    } as ViewStyle,
    scroll: {
      flex: 1,
    } as ViewStyle,
    scrollContent: {
      padding: 20 * fontScale,
      paddingBottom: 40 * fontScale,
    } as ViewStyle,
    activeBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12 * fontScale,
      padding: 16 * fontScale,
      marginBottom: 24 * fontScale,
      borderRadius: 12 * fontScale,
      backgroundColor: isDark
        ? "rgba(100, 150, 255, 0.15)"
        : "rgba(100, 150, 255, 0.12)",
      borderWidth: 1,
      borderColor: isDark
        ? "rgba(100, 150, 255, 0.3)"
        : "rgba(100, 150, 255, 0.25)",
    } as ViewStyle,
    activeBadgeIcon: {
      width: 36 * fontScale,
      height: 36 * fontScale,
      justifyContent: "center",
      alignItems: "center",
    } as ViewStyle,
    activeBadgeText: {
      flex: 1,
      color: colors.text,
    } as ViewStyle,
    sectionTitle: {
      color: colors.text,
      opacity: 0.8,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 20 * fontScale,
    } as ViewStyle,
    featuresList: {
      gap: 14 * fontScale,
    } as ViewStyle,
    featureRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12 * fontScale,
    } as ViewStyle,
    iconWrapper: {
      width: 36 * fontScale,
      height: 36 * fontScale,
      borderRadius: 18 * fontScale,
      backgroundColor: isDark
        ? "rgba(100, 150, 255, 0.2)"
        : "rgba(100, 150, 255, 0.15)",
      justifyContent: "center",
      alignItems: "center",
    } as ViewStyle,
    featureText: {
      flex: 1,
      color: colors.text,
      lineHeight: 20 * fontScale,
    } as ViewStyle,
    upgradeButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8 * fontScale,
      marginTop: 24 * fontScale,
      paddingVertical: 16 * fontScale,
      paddingHorizontal: 24 * fontScale,
      borderRadius: 12 * fontScale,
      backgroundColor: colors.primary,
    } as ViewStyle,
    upgradeButtonText: {
      color: "#FFFFFF",
    } as ViewStyle,
  });
}
