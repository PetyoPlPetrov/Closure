import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { emitSpheresTabPress } from '@/utils/spheres-tab-press';

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (Platform.OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}

// Custom home tab button that intercepts presses even when already focused
export function HomeTabButton(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (Platform.OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}

// Custom spheres tab button that intercepts presses even when already focused
export function SpheresTabButton(props: BottomTabBarButtonProps) {
  const handlePress = (ev: any) => {
    // Always emit the event - let the screen component decide if it should handle it
    // This works because the event listener is only active when the screen is focused
    emitSpheresTabPress();
    
    // Always call the original onPress
    props.onPress?.(ev);
  };

  return (
    <PlatformPressable
      {...props}
      onPress={handlePress}
      onPressIn={(ev) => {
        if (Platform.OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
