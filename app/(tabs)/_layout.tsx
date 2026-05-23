import { useDemoMode } from "@/utils/DemoModeProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { BlurView } from "expo-blur";
import { Tabs, useGlobalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing as REasing,
} from "react-native-reanimated";
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
  POST_ONBOARDING_AI_SPOTLIGHT_MAX_MEMORIES,
  setPostOnboardingAIWelcomeDismissedThisSession as setPostOnboardingAIWelcomeDismissedThisSessionStorage,
  setShowPostOnboardingAIWelcome,
  setShowWalkthroughAfterOnboarding,
  subscribeCreateMemoryHint,
} from "@/utils/onboarding-storage";

/** Horizontal margin for the floating tab bar. */
const TAB_BAR_H_MARGIN = 16;
const TAB_BAR_RADIUS = 28;

function TabBarBackground() {
  const colorScheme = useColorScheme();
  const isDark = (colorScheme ?? "dark") === "dark";

  return (
    <View style={[StyleSheet.absoluteFill, { borderRadius: TAB_BAR_RADIUS, overflow: "hidden" }]}>
      <BlurView
        intensity={isDark ? 60 : 80}
        tint={isDark ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      />
      {/* Tinted overlay for depth */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark
              ? "rgba(15, 22, 36, 0.55)"
              : "rgba(245, 245, 247, 0.45)",
          },
        ]}
      />
    </View>
  );
}

/** Animated pill indicator for the active tab. */
function ActiveTabPill({
  activeIndex,
  tabCount,
  tabBarWidth,
  pillColor,
}: {
  activeIndex: number;
  tabCount: number;
  tabBarWidth: number;
  pillColor: string;
}) {
  const translateX = useSharedValue(0);
  const PILL_W = 36;
  const PILL_H = 3.5;

  const tabItemWidth = tabBarWidth / tabCount;

  useEffect(() => {
    const target = activeIndex * tabItemWidth + tabItemWidth / 2 - PILL_W / 2;
    translateX.value = withTiming(target, {
      duration: 300,
      easing: REasing.out(REasing.cubic),
    });
  }, [activeIndex, tabItemWidth, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Reanimated.View
      style={[
        {
          position: "absolute",
          bottom: 10,
          left: 0,
          width: PILL_W,
          height: PILL_H,
          borderRadius: PILL_H / 2,
          backgroundColor: pillColor,
        },
        animatedStyle,
      ]}
    />
  );
}

const POST_ONBOARDING_AI_WELCOME_SHOW_DELAY_MS = 2500;
const POST_ONBOARDING_AI_WELCOME_FADE_MS = 650;

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const fontScale = useFontScale();
  const t = useTranslate();
  const { isDemoMode } = useDemoMode();
  const insets = useSafeAreaInsets();
  const { idealizedMemories } = useJourney();
  const globalParams = useGlobalSearchParams<{ insightsReturnPath?: string | string[] }>();
  const isInsightsDrillMemoryFlow =
    (Array.isArray(globalParams.insightsReturnPath)
      ? globalParams.insightsReturnPath[0]
      : globalParams.insightsReturnPath) === "/insights-moment-memories";
  const memoriesBelowAISpotlightCap =
    idealizedMemories.length < POST_ONBOARDING_AI_SPOTLIGHT_MAX_MEMORIES;

  const iconSize = Math.round(26 * fontScale);
  const tabBarHeight = Math.round(58 * fontScale);
  const aiButtonSize = Math.round(56 * fontScale);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [tabBarWidth, setTabBarWidth] = useState(0);
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
    colorScheme === "dark" ? "rgba(255,255,255,0.45)" : colors.tabIconDefault;
  const activeTintColor =
    colorScheme === "dark" ? colors.primaryLight : "#1976D2";

  const screenOptions = useMemo(
    () => ({
      tabBarActiveTintColor: activeTintColor,
      tabBarInactiveTintColor: inactiveColor,
      headerShown: false,
      tabBarButton: HapticTab,
      tabBarShowLabel: false,
      tabBarBackground: TabBarBackground,
      tabBarStyle: {
        position: "absolute" as const,
        backgroundColor: "transparent" as const,
        borderTopWidth: 0,
        borderWidth: 1,
        borderColor: colorScheme === "dark"
          ? "rgba(255,255,255,0.08)"
          : "rgba(0,0,0,0.06)",
        marginHorizontal: TAB_BAR_H_MARGIN,
        marginBottom: Math.max(12, insets.bottom),
        borderRadius: TAB_BAR_RADIUS,
        height: tabBarHeight,
        flexDirection: "row" as const,
        elevation: 0,
        shadowColor: colorScheme === "dark" ? "#000" : "#555",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: colorScheme === "dark" ? 0.4 : 0.12,
        shadowRadius: 24,
      },
      tabBarItemStyle: {
        flex: 1,
        flexDirection: "column" as const,
        justifyContent: "center" as const,
        alignItems: "center" as const,
        height: tabBarHeight,
      },
    }),
    [
      activeTintColor,
      inactiveColor,
      colorScheme,
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

  const lessonsIcon = useCallback(
    ({ color }: { color: string }) => (
      <MaterialIcons name="menu-book" size={iconSize} color={color} />
    ),
    [iconSize],
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

  // ─── "Create memory from here" hint above AI button ───
  const [showCreateMemoryHint, setShowCreateMemoryHint] = useState(false);
  const createMemoryHintOpacity = useRef(new Animated.Value(0)).current;
  const createMemoryHintPulse = useRef(new Animated.Value(1)).current;
  const createMemoryHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const createMemoryHintPulseRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const unsub = subscribeCreateMemoryHint(() => {
      if (createMemoryHintTimerRef.current) {
        clearTimeout(createMemoryHintTimerRef.current);
      }
      setShowCreateMemoryHint(true);
      createMemoryHintTimerRef.current = setTimeout(() => {
        setShowCreateMemoryHint(false);
      }, 4000);
    });
    return () => {
      unsub();
      if (createMemoryHintTimerRef.current) {
        clearTimeout(createMemoryHintTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (showCreateMemoryHint) {
      Animated.timing(createMemoryHintOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      createMemoryHintPulse.setValue(1);
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(createMemoryHintPulse, {
            toValue: 1.08,
            duration: 600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(createMemoryHintPulse, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      createMemoryHintPulseRef.current = pulse;
      pulse.start();
    } else {
      createMemoryHintPulseRef.current?.stop();
      createMemoryHintPulseRef.current = null;
      createMemoryHintPulse.setValue(1);
      Animated.timing(createMemoryHintOpacity, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [showCreateMemoryHint, createMemoryHintOpacity, createMemoryHintPulse]);

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
      <Tabs
        initialRouteName="index"
        screenOptions={screenOptions}
        screenListeners={{
          state: (e: any) => {
            const state = e.data?.state;
            if (!state) return;
            const idx = state.index ?? 0;
            // Map: index=0 (Home), lessons=2 (but visually tab index 1)
            const routeName = state.routes?.[idx]?.name;
            if (routeName === "index") setActiveTabIndex(0);
            else if (routeName === "lessons") setActiveTabIndex(1);
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: homeIcon,
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
      {/* Animated pill indicator overlaid on the tab bar */}
      <View
        pointerEvents="none"
        onLayout={(e) => setTabBarWidth(e.nativeEvent.layout.width)}
        style={{
          position: "absolute",
          bottom: Math.max(12, insets.bottom),
          left: TAB_BAR_H_MARGIN,
          right: TAB_BAR_H_MARGIN,
          height: tabBarHeight,
          zIndex: 99,
        }}
      >
        {tabBarWidth > 0 && (
          <ActiveTabPill
            activeIndex={activeTabIndex}
            tabCount={2}
            tabBarWidth={tabBarWidth}
            pillColor={activeTintColor}
          />
        )}
      </View>
      {/* Central AI button floating above the tab bar between Home and Lessons */}
      <View
        style={{
          position: "absolute",
          bottom: Math.max(12, insets.bottom) + tabBarHeight - aiButtonSize * 0.5,
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
        {/* "Create memory from here" hint — triggered from focused-entities zero-memories view */}
        {!showPostOnboardingAIWelcomeUI && showCreateMemoryHint && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              bottom: aiButtonSize + Math.round(16 * fontScale),
              alignItems: "center",
              gap: Math.round(4 * fontScale),
              opacity: createMemoryHintOpacity,
              transform: [
                {
                  translateY: createMemoryHintOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
                { scale: createMemoryHintPulse },
              ],
            }}
          >
            <ThemedText
              size="m"
              weight="bold"
              style={{
                color: "#FFFFFF",
                textAlign: "center",
                textShadowColor: "rgba(0, 0, 0, 0.8)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 4,
              }}
            >
              {t("sferaInsight.createMemoryFromHere")}
            </ThemedText>
            <MaterialIcons
              name="south"
              size={Math.round(28 * fontScale)}
              color="#FFFFFF"
            />
          </Animated.View>
        )}
        {!isDemoMode && (
        <View style={{ pointerEvents: "auto" }}>
          <AITabButton
            size={aiButtonSize}
            spotlight={showPostOnboardingAIWelcomeUI}
            onPressed={handleAIButtonPressForWelcome}
          />
        </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
