import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, TouchableOpacity, View } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFontScale } from '@/hooks/use-device-size';

const SPRING_CONFIG = { damping: 15, stiffness: 120 };
const STEP = 52; // vertical spacing between buttons

interface ChildButtonProps {
  iconName: 'edit' | 'settings';
  progress: SharedValue<number>;
  offsetY: number;
  onPress: () => void;
  fontScale: number;
}

function ChildButton({ iconName, progress, offsetY, onPress, fontScale }: ChildButtonProps) {
  const buttonSize = 40 * fontScale;

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
        style={{
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
          backgroundColor: 'rgba(26, 47, 74, 0.92)',
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: 'rgba(100, 181, 246, 0.5)',
          shadowColor: '#64B5F6',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
        }}
      >
        <MaterialIcons name={iconName} size={18 * fontScale} color="#64B5F6" />
      </TouchableOpacity>
    </Animated.View>
  );
}

interface ExpandableMenuButtonProps {
  top?: number;
}

export function ExpandableMenuButton({ top }: ExpandableMenuButtonProps) {
  const fontScale = useFontScale();
  const insets = useSafeAreaInsets();
  const [isExpanded, setIsExpanded] = useState(false);

  const expandProgress = useSharedValue(0);
  const editProgress = useSharedValue(0);
  const settingsProgress = useSharedValue(0);
  const triggerScale = useSharedValue(1);

  const buttonSize = 40 * fontScale;
  const topPos = top ?? insets.top + 12;

  const expand = useCallback(() => {
    setIsExpanded(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    expandProgress.value = withSpring(1, SPRING_CONFIG);
    editProgress.value = withDelay(0, withSpring(1, SPRING_CONFIG));
    settingsProgress.value = withDelay(60, withSpring(1, SPRING_CONFIG));
  }, [expandProgress, editProgress, settingsProgress]);

  const collapse = useCallback(() => {
    expandProgress.value = withSpring(0, SPRING_CONFIG);
    editProgress.value = withSpring(0, SPRING_CONFIG);
    settingsProgress.value = withSpring(0, SPRING_CONFIG);
    setTimeout(() => setIsExpanded(false), 300);
  }, [expandProgress, editProgress, settingsProgress]);

  const handleTriggerPress = useCallback(() => {
    triggerScale.value = withSequence(
      withSpring(0.82, { damping: 10, stiffness: 300 }),
      withSpring(1, { damping: 12, stiffness: 200 })
    );
    if (isExpanded) {
      collapse();
    } else {
      expand();
    }
  }, [isExpanded, expand, collapse, triggerScale]);

  const handleEditPress = useCallback(() => {
    collapse();
    setTimeout(() => router.push('/(tabs)/spheres'), 150);
  }, [collapse]);

  const handleSettingsPress = useCallback(() => {
    collapse();
    setTimeout(() => router.push('/(tabs)/settings'), 150);
  }, [collapse]);

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
        />
        <ChildButton
          iconName="settings"
          progress={settingsProgress}
          offsetY={STEP * 2}
          onPress={handleSettingsPress}
          fontScale={fontScale}
        />

        {/* Trigger button */}
        <Animated.View style={[{ borderRadius: buttonSize / 2 }, triggerGlowStyle]}>
          <TouchableOpacity
            onPress={handleTriggerPress}
            activeOpacity={0.7}
            style={{
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonSize / 2,
              backgroundColor: 'rgba(26, 47, 74, 0.85)',
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(100, 181, 246, 0.4)',
              shadowColor: '#64B5F6',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
            }}
          >
            <MaterialIcons name="tune" size={20 * fontScale} color="#64B5F6" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </>
  );
}
