import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';

type StepStatus = 'completed' | 'current' | 'ready';

type StepProps = {
  number: number;
  title: string;
  description: string;
  status?: StepStatus;
  isLast?: boolean;
  containerStyle?: ViewStyle;
  onPress?: () => void;
  disabled?: boolean;
};

export function Step({
  number,
  title,
  description,
  status = 'ready',
  isLast = false,
  containerStyle,
  onPress,
  disabled = false,
}: StepProps) {
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const colors = Colors[colorScheme ?? 'dark'];

  const isCompleted = status === 'completed';
  const isCurrent = status === 'current';
  const isReady = status === 'ready';
  const isDisabled = disabled && !isCompleted;

  // Badge color based on status
  const badgeColor = isCompleted
    ? colorScheme === 'dark'
      ? 'rgba(56, 189, 248, 0.3)' // Muted blue for completed in dark mode
      : 'rgba(56, 189, 248, 0.2)' // Muted blue for completed in light mode
    : isDisabled
    ? colorScheme === 'dark'
      ? 'rgba(255, 255, 255, 0.1)' // Muted grey for disabled
      : 'rgba(0, 0, 0, 0.1)'
    : colors.primary; // Vibrant blue for current/ready

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: 'row',
          gap: 16 * fontScale,
          position: 'relative',
          opacity: isDisabled ? 0.5 : 1,
        },
        touchableContainer: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'flex-start',
        },
        badgeContainer: {
          alignItems: 'center',
          gap: 0,
        },
        badge: {
          width: 40 * fontScale,
          height: 40 * fontScale,
          borderRadius: 20 * fontScale,
          backgroundColor: badgeColor,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
          borderWidth: isCompleted ? 2 : 0,
          borderColor: colorScheme === 'dark' 
            ? 'rgba(125, 211, 252, 0.5)' 
            : 'rgba(56, 189, 248, 0.5)',
        },
        line: {
          width: 2 * fontScale,
          flex: 1,
          minHeight: 20 * fontScale,
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(226, 232, 240, 0.2)' 
            : 'rgba(226, 232, 240, 1)',
          marginTop: 8 * fontScale,
          marginBottom: isLast ? 0 : 8 * fontScale,
        },
        content: {
          flex: 1,
          paddingTop: 4 * fontScale,
          gap: 8 * fontScale,
        },
        stepLabel: {
          marginBottom: 4 * fontScale,
        },
        title: {
          marginBottom: 4 * fontScale,
        },
        description: {
          marginBottom: isLast ? 0 : 24 * fontScale,
        },
        arrowContainer: {
          paddingLeft: 8 * fontScale,
          paddingTop: 4 * fontScale,
          justifyContent: 'center',
        },
      }),
    [fontScale, colorScheme, badgeColor, isCompleted, isLast]
  );

  const contentSection = (
    <>
      <View style={styles.content}>
        <ThemedText
          size="xs"
          weight="medium"
          letterSpacing="l"
          style={styles.stepLabel}
        >
          {isCompleted ? 'COMPLETED' : `STEP ${number}`}
        </ThemedText>
        <ThemedText size="l" weight="bold" letterSpacing="s" style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText size="sm" weight="normal" style={styles.description}>
          {description}
        </ThemedText>
      </View>
      {onPress && (
        <View style={styles.arrowContainer}>
          <MaterialIcons
            name="chevron-right"
            size={24 * fontScale}
            color={colorScheme === 'dark' ? colors.icon : colors.tabIconDefault}
          />
        </View>
      )}
    </>
  );

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.badgeContainer}>
        <View style={styles.badge}>
          {isCompleted ? (
            <MaterialIcons
              name="check"
              size={24 * fontScale}
              color={colors.primary}
            />
          ) : (
            <ThemedText weight="bold" style={{ color: '#ffffff', fontSize: 18 * fontScale }}>
              {number}
            </ThemedText>
          )}
        </View>
        {!isLast && <View style={styles.line} />}
      </View>
      {onPress && !isDisabled ? (
        <TouchableOpacity
          style={styles.touchableContainer}
          onPress={onPress}
          activeOpacity={0.7}
        >
          {contentSection}
        </TouchableOpacity>
      ) : (
        <View style={styles.touchableContainer}>
          {contentSection}
        </View>
      )}
    </View>
  );
}

