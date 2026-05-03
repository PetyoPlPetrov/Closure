import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AITabButton, HapticTab, HomeTabButton } from "@/components/haptic-tab";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { useJourney } from "@/utils/JourneyProvider";
import { useTranslate } from "@/utils/languages/use-translate";
import {
  emitGuideRecheckAfterWelcomeDismiss,
  getShowPostOnboardingAIWelcome,
  getOnboardingCompleted,
  setPostOnboardingAIWelcomeDismissedThisSession as setPostOnboardingAIWelcomeDismissedThisSessionStorage,
  setShowPostOnboardingAIWelcome,
  setShowWalkthroughAfterOnboarding,
} from "@/utils/onboarding-storage";

function TabBarBackground() {
  const colorScheme = useColorScheme();
  if (colorScheme === "dark") {
    return (
      <LinearGradient
        colors={["#243041", "#1F2A3A", "#1A2332", "#151D2A", "#0F1620"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    );
  }
  return (
    <LinearGradient
      colors={["#D0D4DA", "#C9CDD4", "#C2C7CE"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const fontScale = useFontScale();
  const t = useTranslate();
  const insets = useSafeAreaInsets();
  const { idealizedMemories } = useJourney();
  const hasAnyMemories = idealizedMemories.length > 0;

  const iconSize = Math.round(28 * fontScale);
  const tabBarHeight =
    Math.round(78 * fontScale) +
    Math.max(12, insets.bottom + 12 - 20 * fontScale);
  const aiButtonSize = Math.round(52 * fontScale);
  const [showPostOnboardingAIWelcome, setShowPostOnboardingAIWelcomeState] = useState(false);
  const [postOnboardingAIWelcomeEligible, setPostOnboardingAIWelcomeEligible] =
    useState(false);
  const [postOnboardingAIWelcomeDismissedThisSession, setPostOnboardingAIWelcomeDismissedThisSession] =
    useState(false);

  const inactiveColor =
    colorScheme === "dark" ? "#ffffff" : colors.tabIconDefault;
  const activeTintColor =
    colorScheme === "dark" ? colors.primaryLight : "#1976D2";
  const borderTopColor =
    colorScheme === "dark"
      ? "rgba(255, 255, 255, 0.1)"
      : "rgba(150, 150, 150, 0.6)";

  const screenOptions = useMemo(
    () => ({
      tabBarActiveTintColor: activeTintColor,
      tabBarInactiveTintColor: inactiveColor,
      headerShown: false,
      tabBarButton: HapticTab,
      tabBarLabelPosition: "below-icon" as const,
      tabBarBackground: TabBarBackground,
      tabBarStyle: {
        backgroundColor: "transparent" as const,
        borderTopColor,
        borderTopWidth: 1,
        paddingBottom: Math.max(32 * fontScale, insets.bottom + 12),
        paddingTop: 8 * fontScale,
        height: tabBarHeight,
        flexDirection: "row" as const,
      },
      tabBarItemStyle: {
        flexDirection: "column" as const,
        justifyContent: "center" as const,
        alignItems: "center" as const,
      },
      tabBarLabelStyle: {
        fontSize: Math.round(12 * fontScale),
        fontWeight: "500" as const,
        letterSpacing: 0.015,
        marginTop: 4 * fontScale,
      },
    }),
    [
      activeTintColor,
      inactiveColor,
      borderTopColor,
      fontScale,
      insets.bottom,
      tabBarHeight,
    ],
  );

  const homeIcon = useCallback(
    ({ color }: { color: string }) => (
      <MaterialIcons name="home" size={iconSize} color={color} />
    ),
    [iconSize],
  );

  const homeLabel = useCallback(
    ({ focused, color }: { focused: boolean; color: string }) => (
      <ThemedText
        size="xs"
        weight={focused ? "bold" : "medium"}
        letterSpacing="l"
        style={{
          color: focused ? color : inactiveColor,
          marginTop: 6 * fontScale,
          lineHeight: 18 * fontScale,
        }}
      >
        {t("tab.home")}
      </ThemedText>
    ),
    [inactiveColor, fontScale, t],
  );

  const lessonsIcon = useCallback(
    ({ color }: { color: string }) => (
      <MaterialIcons name="menu-book" size={iconSize} color={color} />
    ),
    [iconSize],
  );

  const lessonsLabel = useCallback(
    ({ focused, color }: { focused: boolean; color: string }) => (
      <ThemedText
        size="xs"
        weight={focused ? "bold" : "medium"}
        letterSpacing="l"
        style={{
          color: focused ? color : inactiveColor,
          marginTop: 6 * fontScale,
          lineHeight: 18 * fontScale,
        }}
      >
        {t("tab.lessons")}
      </ThemedText>
    ),
    [inactiveColor, fontScale, t],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [storedShouldShow, onboardingCompleted] = await Promise.all([
        getShowPostOnboardingAIWelcome(),
        getOnboardingCompleted(),
      ]);
      const shouldShow =
        storedShouldShow || (onboardingCompleted && !hasAnyMemories);
      if (!cancelled) {
        setPostOnboardingAIWelcomeEligible(shouldShow);
        setPostOnboardingAIWelcomeDismissedThisSession(false);
        setPostOnboardingAIWelcomeDismissedThisSessionStorage(false);
      }
      if (shouldShow) {
        await setShowPostOnboardingAIWelcome(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasAnyMemories]);

  useEffect(() => {
    if (hasAnyMemories && postOnboardingAIWelcomeEligible) {
      setShowPostOnboardingAIWelcomeState(false);
      setPostOnboardingAIWelcomeEligible(false);
      void setShowPostOnboardingAIWelcome(false);
      return;
    }

    if (
      postOnboardingAIWelcomeEligible &&
      !hasAnyMemories &&
      !postOnboardingAIWelcomeDismissedThisSession
    ) {
      setShowPostOnboardingAIWelcomeState(true);
    }
  }, [
    hasAnyMemories,
    postOnboardingAIWelcomeEligible,
    postOnboardingAIWelcomeDismissedThisSession,
  ]);

  const handleAIButtonPressForWelcome = useCallback(() => {
    if (!showPostOnboardingAIWelcome) return;
    setShowPostOnboardingAIWelcomeState(false);
    setPostOnboardingAIWelcomeDismissedThisSession(true);
    setPostOnboardingAIWelcomeDismissedThisSessionStorage(true);
  }, [showPostOnboardingAIWelcome]);

  const dismissPostOnboardingWelcome = useCallback(() => {
    if (!showPostOnboardingAIWelcome) return;
    setShowPostOnboardingAIWelcomeState(false);
    setPostOnboardingAIWelcomeDismissedThisSession(true);
    setPostOnboardingAIWelcomeDismissedThisSessionStorage(true);
    void setShowWalkthroughAfterOnboarding(true);
    emitGuideRecheckAfterWelcomeDismiss(1000);
  }, [showPostOnboardingAIWelcome]);

  return (
    <View style={styles.container}>
      {showPostOnboardingAIWelcome && (
        <Pressable
          onPress={dismissPostOnboardingWelcome}
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: "rgba(6, 10, 18, 0.68)",
            zIndex: 95,
          }}
        />
      )}
      <Tabs initialRouteName="index" screenOptions={screenOptions}>
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: homeIcon,
            tabBarLabel: homeLabel,
            tabBarButton: HomeTabButton,
          }}
        />
        <Tabs.Screen
          name="spheres"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="lessons"
          options={{
            title: "Lessons",
            tabBarButton: HapticTab,
            tabBarIcon: lessonsIcon,
            tabBarLabel: lessonsLabel,
            /** Pauses the Lessons screen tree when another tab is focused (no Reanimated/JS work). */
            freezeOnBlur: true,
          }}
        />
        <Tabs.Screen
          name="events"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="settings"
          options={{ href: null, headerShown: false }}
        />

        {/* Entity detail and edit screens - hidden from tab bar but keep tabs visible */}
        <Tabs.Screen
          name="add-ex-profile"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="edit-profile"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="add-job"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="edit-job"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="add-family-member"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="edit-family-member"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="edit-friend"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="edit-hobby"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="add-friend"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="add-hobby"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="idealized-memories"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="add-idealized-memory"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="relationship-detail"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="job-detail"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="family-member-detail"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="friend-detail"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="hobby-detail"
          options={{ href: null, headerShown: false }}
        />
      </Tabs>
      {/* Central AI button floating above the tab bar between Home and Lessons */}
      <View
        style={{
          position: "absolute",
          bottom: tabBarHeight - aiButtonSize * 0.5,
          left: 0,
          right: 0,
          alignItems: "center",
          pointerEvents: "box-none",
          zIndex: 100,
        }}
      >
        {showPostOnboardingAIWelcome && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              bottom: aiButtonSize + Math.round(26 * fontScale),
              alignItems: "center",
              gap: Math.round(6 * fontScale),
            }}
          >
            <ThemedText
              size="l"
              weight="bold"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              style={{
                color: "#FFFFFF",
                textAlign: "center",
                maxWidth: "94%",
                textShadowColor: "rgba(0, 0, 0, 0.8)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 4,
              }}
            >
              🎉 Welcome! You started your journey. 🎉
            </ThemedText>
            <ThemedText
              size="m"
              weight="medium"
              style={{
                color: "rgba(255, 255, 255, 0.96)",
                textAlign: "center",
              }}
            >
              ✨ Create your first memory ✨
            </ThemedText>
            <MaterialIcons
              name="south"
              size={Math.round(36 * fontScale)}
              color="#FFFFFF"
            />
          </View>
        )}
        <View style={{ pointerEvents: "auto" }}>
          <AITabButton
            size={aiButtonSize}
            spotlight={showPostOnboardingAIWelcome}
            onPressed={handleAIButtonPressForWelcome}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
