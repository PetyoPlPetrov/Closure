import { useDemoMode } from '@/utils/DemoModeProvider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, InteractionManager, Platform, Pressable, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useFontScale } from '@/hooks/use-device-size';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { logMenuOpen } from '@/utils/analytics';

const log = (..._args: unknown[]) => {};

const LIGHT_MENU_BG = 'rgba(255, 255, 255, 0.96)';
const LIGHT_MENU_BORDER = 'rgba(0, 0, 0, 0.16)';
/** ≥7:1 on light fills — WCAG AAA for icon-sized glyphs. */
const LIGHT_MENU_ICON = '#0D0D0D';
const LIGHT_MENU_SHADOW = '#000000';

const DARK_MENU_BG_CHILD = 'rgba(26, 47, 74, 0.92)';
const DARK_MENU_BG_TRIGGER = 'rgba(26, 47, 74, 0.85)';
const DARK_MENU_BORDER = 'rgba(100, 181, 246, 0.5)';
const DARK_MENU_BORDER_TRIGGER = 'rgba(100, 181, 246, 0.4)';
const DARK_MENU_ICON = Colors.dark.primary;
const DARK_MENU_SHADOW = Colors.dark.primary;

const SPRING_CONFIG = { damping: 15, stiffness: 120 };
const STEP = 52; // vertical spacing between buttons
const MENU_OPEN_DURATION_MS = 320;
const MENU_CLOSE_DURATION_MS = 260;

interface ChildButtonProps {
  iconName: 'edit' | 'settings' | 'palette';
  progress: SharedValue<number>;
  offsetY: number;
  onPress: () => void;
  fontScale: number;
  colorScheme: 'light' | 'dark';
  disabled?: boolean;
}

function ChildButton({ iconName, progress, offsetY, onPress, fontScale, colorScheme, disabled }: ChildButtonProps) {
  const buttonSize = 40 * fontScale;
  const isDark = colorScheme === 'dark';

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: progress.value * offsetY * fontScale },
      { scale: 0.8 + progress.value * 0.2 },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          width: buttonSize,
          height: buttonSize,
        },
        animatedStyle,
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        disabled={disabled}
        style={{
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
          backgroundColor: isDark ? DARK_MENU_BG_CHILD : LIGHT_MENU_BG,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: isDark ? DARK_MENU_BORDER : LIGHT_MENU_BORDER,
          shadowColor: isDark ? DARK_MENU_SHADOW : LIGHT_MENU_SHADOW,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isDark ? 0.3 : 0.14,
          shadowRadius: isDark ? 6 : 4,
          elevation: isDark ? 4 : 3,
          opacity: disabled ? 0.35 : 1,
        }}
      >
        <MaterialIcons
          name={iconName}
          size={18 * fontScale}
          color={isDark ? DARK_MENU_ICON : LIGHT_MENU_ICON}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

interface ExpandableMenuButtonProps {
  top?: number;
}

export function ExpandableMenuButton({ top }: ExpandableMenuButtonProps) {
  const { isDemoMode } = useDemoMode();
  const fontScale = useFontScale();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  // isExpanded as React state is only used to mount/unmount the backdrop Pressable
  const [isExpanded, setIsExpanded] = useState(false);
  // isExpandedSV drives toggle logic — lives on the UI thread, no re-render needed
  const isExpandedSV = useSharedValue(false);
  // False after resume until InteractionManager clears — suppresses animations while JS is busy
  const isReadySV = useSharedValue(true);
  const interactionHandleRef = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);

  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  log(`render #${renderCountRef.current} isExpanded=${isExpanded} fontScale=${fontScale}`);

  const lastPressTimeRef = useRef(0);

  const expandProgress = useSharedValue(0);
  const editProgress = useSharedValue(0);
  const settingsProgress = useSharedValue(0);
  const personalizationProgress = useSharedValue(0);
  const triggerScale = useSharedValue(1);

  const buttonSize = 40 * fontScale;
  const topPos = top ?? insets.top + 12;

  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      log(`AppState changed: ${appStateRef.current} → ${nextState}`);
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        log('Returned from background — resetting animation state, blocking animations until JS is free');
        log(`  expandProgress before reset: ${expandProgress.value}`);
        expandProgress.value = 0;
        editProgress.value = 0;
        settingsProgress.value = 0;
        personalizationProgress.value = 0;
        triggerScale.value = 1;
        isExpandedSV.value = false;
        isReadySV.value = false;
        setIsExpanded(false);
        log('  Reset complete, waiting for interactions to drain');

        // Cancel any previous pending handle
        interactionHandleRef.current?.cancel();
        interactionHandleRef.current = InteractionManager.runAfterInteractions(() => {
          log('JS thread free — re-enabling animations');
          isReadySV.value = true;
        });
      }
      appStateRef.current = nextState;
    });
    return () => {
      sub.remove();
      interactionHandleRef.current?.cancel();
    };
  }, [expandProgress, editProgress, settingsProgress, personalizationProgress, triggerScale, isExpandedSV, isReadySV]);

  const expand = useCallback(() => {
    log('expand() called — starting animation');
    isExpandedSV.value = true;
    setIsExpanded(true);
    logMenuOpen();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    expandProgress.value = withSpring(1, SPRING_CONFIG);
    editProgress.value = withDelay(
      0,
      withTiming(1, { duration: MENU_OPEN_DURATION_MS, easing: Easing.out(Easing.quad) })
    );
    personalizationProgress.value = withDelay(
      60,
      withTiming(1, { duration: MENU_OPEN_DURATION_MS, easing: Easing.out(Easing.quad) })
    );
    settingsProgress.value = withDelay(
      120,
      withTiming(1, { duration: MENU_OPEN_DURATION_MS, easing: Easing.out(Easing.quad) })
    );
  }, [expandProgress, editProgress, settingsProgress, personalizationProgress, isExpandedSV]);

  const collapse = useCallback(() => {
    log('collapse() called — starting animation');
    isExpandedSV.value = false;
    expandProgress.value = withSpring(0, SPRING_CONFIG);
    editProgress.value = withTiming(0, { duration: MENU_CLOSE_DURATION_MS, easing: Easing.in(Easing.quad) });
    settingsProgress.value = withTiming(0, { duration: MENU_CLOSE_DURATION_MS, easing: Easing.in(Easing.quad) });
    personalizationProgress.value = withTiming(0, {
      duration: MENU_CLOSE_DURATION_MS,
      easing: Easing.in(Easing.quad),
    });
    setTimeout(() => setIsExpanded(false), 300);
  }, [expandProgress, editProgress, settingsProgress, personalizationProgress, isExpandedSV]);

  const triggerLightHaptic = useCallback(() => {
    if (Platform.OS === 'ios' && Device.isDevice) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, []);

  const handleTriggerPress = useCallback(() => {
    const now = Date.now();
    if (now - lastPressTimeRef.current < 500) {
      log('handleTriggerPress — debounced (double-tap ignored)');
      return;
    }
    lastPressTimeRef.current = now;
    log(`handleTriggerPress — isExpandedSV=${isExpandedSV.value} isReadySV=${isReadySV.value} expandProgress=${expandProgress.value} triggerScale=${triggerScale.value}`);

    // If user taps while we're still waiting for interactions to drain, unblock immediately.
    if (!isReadySV.value) {
      log('handleTriggerPress — user tapped before isReady; forcing isReady now');
      interactionHandleRef.current?.cancel();
      interactionHandleRef.current = null;
      isReadySV.value = true;
    }

    // Only run the press bounce animation when the JS thread is free.
    // While loading (isReadySV=false), skip it so the menu opens instantly.
    if (isReadySV.value) {
      triggerScale.value = 1;
      triggerScale.value = withSequence(
        withSpring(0.82, { damping: 10, stiffness: 300 }),
        withSpring(1, { damping: 12, stiffness: 200 })
      );
    }

    if (isExpandedSV.value) {
      collapse();
    } else {
      expand();
    }
  }, [expand, collapse, triggerScale, isExpandedSV, isReadySV, expandProgress]);

  const handleEditPress = useCallback(() => {
    triggerLightHaptic();
    collapse();
    setTimeout(() => router.push('/(tabs)/spheres'), 150);
  }, [collapse, triggerLightHaptic]);

  const handleSettingsPress = useCallback(() => {
    triggerLightHaptic();
    collapse();
    setTimeout(() => router.push('/(tabs)/settings'), 150);
  }, [collapse, triggerLightHaptic]);

  const handlePersonalizationPress = useCallback(() => {
    triggerLightHaptic();
    collapse();
    setTimeout(() => router.push('/personalization'), 150);
  }, [collapse, triggerLightHaptic]);

  const triggerGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.2 + expandProgress.value * 0.3,
    transform: [{ scale: triggerScale.value }],
  }));

  return (
    <>
      {isExpanded && (
        <Pressable
          onPress={collapse}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 998,
          }}
        />
      )}
      <View
        style={{
          position: 'absolute',
          top: topPos,
          left: 16,
          width: buttonSize,
          height: buttonSize,
          zIndex: 999,
        }}
        pointerEvents="box-none"
      >
        {/* Child buttons — stacked vertically, fall from behind trigger */}
        <ChildButton
          iconName="edit"
          progress={editProgress}
          offsetY={STEP}
          onPress={handleEditPress}
          fontScale={fontScale}
          colorScheme={colorScheme}
          disabled={isDemoMode}
        />
        <ChildButton
          iconName="palette"
          progress={personalizationProgress}
          offsetY={STEP * 2}
          onPress={handlePersonalizationPress}
          fontScale={fontScale}
          colorScheme={colorScheme}
        />
        <ChildButton
          iconName="settings"
          progress={settingsProgress}
          offsetY={STEP * 3}
          onPress={handleSettingsPress}
          fontScale={fontScale}
          colorScheme={colorScheme}
        />

        {/* Trigger button */}
        <Animated.View style={[{ borderRadius: buttonSize / 2 }, triggerGlowStyle]}>
          <TouchableOpacity
            onPress={(e) => {
              log(`TouchableOpacity onPress fired — timestamp=${e.nativeEvent.timestamp}`);
              handleTriggerPress();
            }}
            activeOpacity={0.7}
            style={{
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonSize / 2,
              backgroundColor: isDark ? DARK_MENU_BG_TRIGGER : LIGHT_MENU_BG,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: isDark ? DARK_MENU_BORDER_TRIGGER : LIGHT_MENU_BORDER,
              shadowColor: isDark ? DARK_MENU_SHADOW : LIGHT_MENU_SHADOW,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isDark ? 0.2 : 0.14,
              shadowRadius: isDark ? 8 : 4,
              elevation: isDark ? 5 : 3,
            }}
          >
            <MaterialIcons
              name="tune"
              size={20 * fontScale}
              color={isDark ? DARK_MENU_ICON : LIGHT_MENU_ICON}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </>
  );
}
