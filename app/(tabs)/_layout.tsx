import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs, useGlobalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AITabButton, HapticTab, HomeTabButton } from "@/components/haptic-tab";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { TAB_BAR_BACKGROUND_LIGHT_COSMIC_OFF } from "@/library/components/tab-screen-container";
import { useJourney } from "@/utils/JourneyProvider";
import { useTranslate } from "@/utils/languages/use-translate";
import {
  emitGuideRecheckAfterWelcomeDismiss,
  getShowPostOnboardingAIWelcome,
  getOnboardingCompleted,
  POST_ONBOARDING_AI_SPOTLIGHT_MAX_MEMORIES,
  setPostOnboardingAIWelcomeDismissedThisSession as setPostOnboardingAIWelcomeDismissedThisSessionStorage,
  setShowPostOnboardingAIWelcome,
  setShowWalkthroughAfterOnboarding,
} from "@/utils/onboarding-storage";
import { useVisualSettings, MAX_COSMIC_BACKGROUND_OPACITY } from "@/utils/VisualSettingsProvider";

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function lerpHex(a: string, b: string, t: number): string {
  const u = Math.max(0, Math.min(1, t));
  const p = hexToRgb(a);
  const q = hexToRgb(b);
  const r = Math.round(p.r + (q.r - p.r) * u);
  const g = Math.round(p.g + (q.g - p.g) * u);
  const bl = Math.round(p.b + (q.b - p.b) * u);
  const h = (x: number) => x.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(bl)}`;
}

/** Light tab bar: cosmos off → full chrome (matches `TabBarBackground` lerps). */
function lightTabBarBorderRgba(cosmicBackgroundOpacity: number): string {
  const t =
    MAX_COSMIC_BACKGROUND_OPACITY <= 0
      ? 0
      : cosmicBackgroundOpacity / MAX_COSMIC_BACKGROUND_OPACITY;
  const g = Math.round(150 * t);
  const a = 0.08 + (0.6 - 0.08) * t;
  return `rgba(${g}, ${g}, ${g}, ${a})`;
}

function TabBarBackground() {
  const colorScheme = useColorScheme();
  const { cosmicBackgroundOpacity } = useVisualSettings();
  const chromeT =
    MAX_COSMIC_BACKGROUND_OPACITY <= 0
      ? 0
      : cosmicBackgroundOpacity / MAX_COSMIC_BACKGROUND_OPACITY;

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

  // Light (or unset): blend tab bar chrome with cosmic slider
  if (cosmicBackgroundOpacity <= 0) {
    return (
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: TAB_BAR_BACKGROUND_LIGHT_COSMIC_OFF },
        ]}
      />
    );
  }

  const t = chromeT;
  const c1 = lerpHex(TAB_BAR_BACKGROUND_LIGHT_COSMIC_OFF, "#D0D4DA", t);
  const c2 = lerpHex(TAB_BAR_BACKGROUND_LIGHT_COSMIC_OFF, "#C9CDD4", t);
  const c3 = lerpHex(TAB_BAR_BACKGROUND_LIGHT_COSMIC_OFF, "#C2C7CE", t);
  return (
    <LinearGradient
      colors={[c1, c2, c3]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

const POST_ONBOARDING_AI_WELCOME_SHOW_DELAY_MS = 2500;
const POST_ONBOARDING_AI_WELCOME_FADE_MS = 650;

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const { cosmicBackgroundOpacity } = useVisualSettings();
  const fontScale = useFontScale();
  const t = useTranslate();
  const insets = useSafeAreaInsets();
  const { idealizedMemories } = useJourney();
  const globalParams = useGlobalSearchParams<{ insightsReturnPath?: string | string[] }>();
  const isInsightsDrillMemoryFlow =
    (Array.isArray(globalParams.insightsReturnPath)
      ? globalParams.insightsReturnPath[0]
      : globalParams.insightsReturnPath) === "/insights-moment-memories";
  const memoriesBelowAISpotlightCap =
    idealizedMemories.length < POST_ONBOARDING_AI_SPOTLIGHT_MAX_MEMORIES;

  const iconSize = Math.round(28 * fontScale);
  const tabBarHeight =
    Math.round(78 * fontScale) +
    Math.max(12, insets.bottom + 12 - 20 * fontScale);
  const aiButtonSize = Math.round(56 * fontScale);
  const [showPostOnboardingAIWelcome, setShowPostOnboardingAIWelcomeState] = useState(false);
  const [postOnboardingAIWelcomeEligible, setPostOnboardingAIWelcomeEligible] =
    useState(false);
  const [postOnboardingAIWelcomeDismissedThisSession, setPostOnboardingAIWelcomeDismissedThisSession] =
    useState(false);
  const welcomeShowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const postOnboardingWelcomeOpacity = useRef(new Animated.Value(0)).current;
  const showPostOnboardingAIWelcomeUI =
    showPostOnboardingAIWelcome && !isInsightsDrillMemoryFlow;

  const inactiveColor =
    colorScheme === "dark" ? "#ffffff" : colors.tabIconDefault;
  const activeTintColor =
    colorScheme === "dark" ? colors.primaryLight : "#1976D2";
  const borderTopColor =
    colorScheme === "dark"
      ? "rgba(255, 255, 255, 0.1)"
      : lightTabBarBorderRgba(cosmicBackgroundOpacity);

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
      cosmicBackgroundOpacity,
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
        (storedShouldShow || onboardingCompleted) && memoriesBelowAISpotlightCap;
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
  }, [memoriesBelowAISpotlightCap, idealizedMemories.length]);

  useEffect(() => {
    if (welcomeShowTimeoutRef.current) {
      clearTimeout(welcomeShowTimeoutRef.current);
      welcomeShowTimeoutRef.current = null;
    }

    if (!memoriesBelowAISpotlightCap && postOnboardingAIWelcomeEligible) {
      setShowPostOnboardingAIWelcomeState(false);
      setPostOnboardingAIWelcomeEligible(false);
      void setShowPostOnboardingAIWelcome(false);
      postOnboardingWelcomeOpacity.setValue(0);
    } else if (
      postOnboardingAIWelcomeEligible &&
      memoriesBelowAISpotlightCap &&
      !postOnboardingAIWelcomeDismissedThisSession
    ) {
      welcomeShowTimeoutRef.current = setTimeout(() => {
        setShowPostOnboardingAIWelcomeState(true);
      }, POST_ONBOARDING_AI_WELCOME_SHOW_DELAY_MS);
    } else {
      setShowPostOnboardingAIWelcomeState(false);
      postOnboardingWelcomeOpacity.setValue(0);
    }

    return () => {
      if (welcomeShowTimeoutRef.current) {
        clearTimeout(welcomeShowTimeoutRef.current);
        welcomeShowTimeoutRef.current = null;
      }
    };
  }, [
    memoriesBelowAISpotlightCap,
    idealizedMemories.length,
    postOnboardingAIWelcomeEligible,
    postOnboardingAIWelcomeDismissedThisSession,
    postOnboardingWelcomeOpacity,
  ]);

  useEffect(() => {
    Animated.timing(postOnboardingWelcomeOpacity, {
      toValue: showPostOnboardingAIWelcomeUI ? 1 : 0,
      duration: POST_ONBOARDING_AI_WELCOME_FADE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [showPostOnboardingAIWelcomeUI, postOnboardingWelcomeOpacity]);

  const handleAIButtonPressForWelcome = useCallback(() => {
    if (!showPostOnboardingAIWelcomeUI) return;
    setShowPostOnboardingAIWelcomeState(false);
    setPostOnboardingAIWelcomeDismissedThisSession(true);
    setPostOnboardingAIWelcomeDismissedThisSessionStorage(true);
  }, [showPostOnboardingAIWelcomeUI]);

  const dismissPostOnboardingWelcome = useCallback(() => {
    if (!showPostOnboardingAIWelcomeUI) return;
    setShowPostOnboardingAIWelcomeState(false);
    setPostOnboardingAIWelcomeDismissedThisSession(true);
    setPostOnboardingAIWelcomeDismissedThisSessionStorage(true);
    void setShowWalkthroughAfterOnboarding(true);
    emitGuideRecheckAfterWelcomeDismiss(1000);
  }, [showPostOnboardingAIWelcomeUI]);

  return (
    <View style={styles.container}>
      {showPostOnboardingAIWelcomeUI && (
        <Animated.View
          style={{
            ...StyleSheet.absoluteFillObject,
            opacity: postOnboardingWelcomeOpacity,
            zIndex: 95,
          }}
        >
          <Pressable
            onPress={dismissPostOnboardingWelcome}
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: "rgba(6, 10, 18, 0.68)",
            }}
          />
        </Animated.View>
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
        {showPostOnboardingAIWelcomeUI && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              bottom: aiButtonSize + Math.round(26 * fontScale),
              alignItems: "center",
              gap: Math.round(6 * fontScale),
              opacity: postOnboardingWelcomeOpacity,
              transform: [
                {
                  translateY: postOnboardingWelcomeOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
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
              {t("tab.postOnboardingAiWelcome.title")}
            </ThemedText>
            <ThemedText
              size="m"
              weight="medium"
              style={{
                color: "rgba(255, 255, 255, 0.96)",
                textAlign: "center",
              }}
            >
              {t("tab.postOnboardingAiWelcome.cta")}
            </ThemedText>
            <MaterialIcons
              name="south"
              size={Math.round(36 * fontScale)}
              color="#FFFFFF"
            />
          </Animated.View>
        )}
        <View style={{ pointerEvents: "auto" }}>
          <AITabButton
            size={aiButtonSize}
            spotlight={showPostOnboardingAIWelcomeUI}
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
