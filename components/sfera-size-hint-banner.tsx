import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTranslate } from "@/utils/languages/use-translate";
import { useMomentColors } from "@/utils/MomentColorsProvider";
import { useVisualSettings } from "@/utils/VisualSettingsProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import {
  Animated,
  Easing as RNEasing,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  UIManager,
  View,
} from "react-native";
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Reminder taps + periodic pulse */
const PULSE_PEAK = 1.24;
const PULSE_UP_MS = 105;
/** First paint when the sunny hint appears */
const INTRO_PULSE_PEAK = 1.68;
const INTRO_PULSE_UP_MS = 220;
/** Periodic reminder pulse when usability → pulsing animation is on */
const SUN_ACTION_PERIODIC_PULSE_MS = 10_000;
/** Small left chip icon attention pulse after banner enters. */
const SUN_CHIP_ICON_DOUBLE_PULSE_DELAY_MS = 650;
const SUN_CHIP_ICON_DOUBLE_PULSE_GAP_MS = 340;

type Props = {
  message: string;
  dismissLabel?: string;
  onClose: () => void;
  onDontShowAgain?: () => void;
  /** If omitted with `onActionPress`, action is icon-only (`actionAccessibilityLabel` should be set). */
  actionLabel?: string;
  /** Screen reader label when action is icon-only */
  actionAccessibilityLabel?: string;
  onActionPress?: () => void;
  actionIconName?: keyof typeof MaterialIcons.glyphMap;
  secondaryActionAccessibilityLabel?: string;
  onSecondaryActionPress?: () => void;
  secondaryActionIconName?: keyof typeof MaterialIcons.glyphMap;
  messageIconName?: keyof typeof MaterialIcons.glyphMap;
  messageIconColor?: string;
  /** Start collapsed (persisted state). Only used when `onActionPress` is set. */
  initialCollapsed?: boolean;
  /** Called when collapsed state changes so the parent can persist it. */
  onCollapsedChange?: (collapsed: boolean) => void;
};

export function SferaSizeHintBanner({
  message,
  dismissLabel,
  onClose,
  onDontShowAgain,
  actionLabel,
  actionAccessibilityLabel,
  onActionPress,
  actionIconName = "wb-sunny",
  secondaryActionAccessibilityLabel,
  onSecondaryActionPress,
  secondaryActionIconName = "device-hub",
  initialCollapsed = false,
  onCollapsedChange,
  messageIconName,
  messageIconColor,
}: Props) {
  const t = useTranslate();
  const { momentColors } = useMomentColors();
  const { pulsingAnimations } = useVisualSettings();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const hasTrailingActions = !!(onSecondaryActionPress || onActionPress);
  const sunnyMomentFill = momentColors.sunny.background;
  const sunnyActionIconColor =
    actionIconName === "wb-sunny" ? sunnyMomentFill : colors.tint;

  const bg =
    colorScheme === "dark"
      ? "rgba(18, 24, 36, 0.42)"
      : "rgba(248, 249, 252, 0.72)";
  const border =
    colorScheme === "dark"
      ? "rgba(255, 255, 255, 0.1)"
      : "rgba(0, 0, 0, 0.08)";
  const entranceProgress = React.useRef(new Animated.Value(0)).current;
  /** UI-thread pulse so heavy JS work from `onActionPress` cannot stall mid-animation. */
  const actionIconScale = useSharedValue(1);
  const actionButtonScale = useSharedValue(1);

  const actionIconPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: actionIconScale.value }],
  }));
  const actionButtonPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: actionButtonScale.value }],
  }));

  const pulseSunActionIcon = React.useCallback(() => {
    actionIconScale.value = 1;
    actionIconScale.value = withSequence(
      withTiming(PULSE_PEAK, {
        duration: PULSE_UP_MS,
        easing: Easing.out(Easing.quad),
      }),
      withSpring(1, { damping: 12, stiffness: 320 }),
    );
  }, [actionIconScale]);

  const pulseSunActionButton = React.useCallback(() => {
    actionButtonScale.value = 1;
    actionButtonScale.value = withSequence(
      withTiming(0.94, {
        duration: 140,
        easing: Easing.out(Easing.quad),
      }),
      withTiming(1, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [actionButtonScale]);

  const pulseSunChipIconTwice = React.useCallback(() => {
    actionIconScale.value = 1;
    actionIconScale.value = withDelay(
      SUN_CHIP_ICON_DOUBLE_PULSE_DELAY_MS,
      withSequence(
        withTiming(1.12, {
          duration: 240,
          easing: Easing.out(Easing.cubic),
        }),
        withTiming(1, {
          duration: 280,
          easing: Easing.out(Easing.cubic),
        }),
        withDelay(
          SUN_CHIP_ICON_DOUBLE_PULSE_GAP_MS,
          withSequence(
            withTiming(1.12, {
              duration: 240,
              easing: Easing.out(Easing.cubic),
            }),
            withTiming(1, {
              duration: 280,
              easing: Easing.out(Easing.cubic),
            }),
          ),
        ),
      ),
    );
  }, [actionIconScale]);

  const pulseSunActionIconIntro = React.useCallback(() => {
    actionIconScale.value = 1;
    actionIconScale.value = withSequence(
      withTiming(INTRO_PULSE_PEAK, {
        duration: INTRO_PULSE_UP_MS,
        easing: Easing.out(Easing.cubic),
      }),
      withSpring(1, { damping: 9, stiffness: 220 }),
    );
  }, [actionIconScale]);

  const shouldAutoPulseSun =
    Boolean(onActionPress) && !actionLabel && actionIconName === "wb-sunny";

  React.useEffect(() => {
    if (!shouldAutoPulseSun || !pulsingAnimations) return;

    pulseSunActionIconIntro();
    const intervalId = setInterval(
      pulseSunActionIcon,
      SUN_ACTION_PERIODIC_PULSE_MS,
    );
    return () => clearInterval(intervalId);
  }, [
    shouldAutoPulseSun,
    pulsingAnimations,
    pulseSunActionIcon,
    pulseSunActionIconIntro,
  ]);

  React.useEffect(() => {
    const shouldPulseChipIcon =
      pulsingAnimations &&
      Boolean(actionLabel) &&
      Boolean(onActionPress) &&
      actionIconName === "wb-sunny";
    if (!shouldPulseChipIcon) return;
    pulseSunChipIconTwice();
  }, [
    pulsingAnimations,
    actionLabel,
    onActionPress,
    actionIconName,
    pulseSunChipIconTwice,
  ]);

  // Mount-only: message includes live stats (e.g. sunny %) and must not retrigger this.
  // Parent switches hint type with different `key` so a new instance replays entrance when appropriate.
  React.useEffect(() => {
    entranceProgress.setValue(0);
    Animated.timing(entranceProgress, {
      toValue: 1,
      duration: 550,
      easing: RNEasing.out(RNEasing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entranceProgress]);

  const animatedCardStyle = React.useMemo(
    () => ({
      opacity: entranceProgress,
      transform: [
        {
          translateY: entranceProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0],
          }),
        },
        {
          scale: entranceProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.98, 1],
          }),
        },
      ],
    }),
    [entranceProgress],
  );

  const isCollapsible = Boolean(onActionPress);
  const [collapsed, setCollapsed] = React.useState(isCollapsible && initialCollapsed);

  // Notify parent when collapsed state changes (outside render to avoid setState-during-render).
  const isFirstRender = React.useRef(true);
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    onCollapsedChange?.(collapsed);
  }, [collapsed, onCollapsedChange]);

  const toggleCollapsed = React.useCallback(() => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(280, "easeInEaseOut", "opacity"),
    );
    setCollapsed((prev) => !prev);
  }, []);

  if (isCollapsible && collapsed) {
    return (
      <View pointerEvents="box-none" style={styles.wrap}>
        <View style={styles.collapsedRow}>
          <Pressable
            onPress={toggleCollapsed}
            style={[
              styles.collapsedTab,
              { backgroundColor: bg, borderColor: border },
            ]}
            accessibilityRole="button"
            accessibilityLabel={actionAccessibilityLabel || actionLabel}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons
              name={actionIconName}
              size={18}
              color={sunnyActionIconColor}
            />
            <MaterialIcons
              name="expand-less"
              size={16}
              color={colors.textMediumEmphasis}
            />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: bg, borderColor: border },
          animatedCardStyle,
        ]}
      >
        <Pressable
          onPress={isCollapsible ? toggleCollapsed : onClose}
          hitSlop={12}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
        >
          <MaterialIcons
            name={isCollapsible ? "expand-more" : "close"}
            size={18}
            color={colors.textMediumEmphasis}
          />
        </Pressable>
        <View style={styles.messageRow}>
          {messageIconName ? (
            <MaterialIcons
              name={messageIconName}
              size={22}
              color={messageIconColor ?? sunnyMomentFill}
              style={styles.messageIcon}
            />
          ) : null}
          <ThemedText style={[styles.body, { color: colors.text }]}>
            {message}
          </ThemedText>
        </View>
        <View
          style={[
            styles.actionsRow,
            !hasTrailingActions && styles.actionsRowDismissOnly,
          ]}
        >
          {onDontShowAgain ? (
            <Pressable onPress={onDontShowAgain} style={styles.dismissRow}>
              <ThemedText emphasis="medium" style={styles.dismissPersistText}>
                {dismissLabel}
              </ThemedText>
            </Pressable>
          ) : (
            <View />
          )}
          {hasTrailingActions ? (
            <View style={styles.actionIconsWrap}>
              {onSecondaryActionPress ? (
                <Pressable
                  onPress={onSecondaryActionPress}
                  accessibilityRole="button"
                  accessibilityLabel={secondaryActionAccessibilityLabel}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.actionIconOnly}
                >
                  <MaterialIcons
                    name={secondaryActionIconName}
                    size={22}
                    color={colors.tint}
                  />
                </Pressable>
              ) : null}
              {onActionPress ? (
                <Reanimated.View style={actionLabel ? actionButtonPulseStyle : undefined}>
                  <Pressable
                    onPress={() => {
                      if (pulsingAnimations) {
                        if (actionLabel) pulseSunActionButton();
                        else pulseSunActionIcon();
                      }
                      onActionPress();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      actionLabel ? undefined : actionAccessibilityLabel
                    }
                    hitSlop={
                      actionLabel
                        ? undefined
                        : ({ top: 10, bottom: 10, left: 10, right: 10 } as const)
                    }
                    style={
                      actionLabel
                        ? [
                            styles.actionRow,
                            styles.actionPill,
                            { backgroundColor: colors.primaryDark },
                          ]
                        : styles.actionIconOnly
                    }
                  >
                    <Reanimated.View
                      style={[
                        {
                          flexDirection: actionLabel ? "row" : undefined,
                          alignItems: "center",
                        },
                        !actionLabel && actionIconPulseStyle,
                      ]}
                    >
                      <Reanimated.View style={actionLabel ? actionIconPulseStyle : undefined}>
                        <MaterialIcons
                          name={actionIconName}
                          size={actionLabel ? 16 : 22}
                          color={actionLabel ? colors.primaryText : sunnyActionIconColor}
                          style={actionLabel ? styles.actionIcon : undefined}
                        />
                      </Reanimated.View>
                      {actionLabel ? (
                        <ThemedText
                          style={[styles.actionLinkLabel, styles.actionText, { color: colors.primaryText }]}
                        >
                          {actionLabel}
                        </ThemedText>
                      ) : null}
                      {actionLabel ? (
                        <MaterialIcons
                          name="chevron-right"
                          size={18}
                          color={colors.primaryText}
                        />
                      ) : null}
                    </Reanimated.View>
                  </Pressable>
                </Reanimated.View>
              ) : null}
            </View>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
  collapsedRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  collapsedTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      android: { elevation: 2 },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
    }),
  },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: 36,
    paddingHorizontal: 16,
    paddingBottom: 12,
    ...Platform.select({
      android: { elevation: 2 },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
    }),
  },
  closeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 2,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 1,
    textAlign: "center",
    flexShrink: 1,
  },
  messageRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  messageIcon: {
    marginRight: 6,
    marginTop: 1,
  },
  actionsRow: {
    marginTop: 12,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionsRowDismissOnly: {
    justifyContent: "center",
  },
  dismissRow: {
    paddingVertical: 2,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  actionPill: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  actionIcon: {
    marginTop: 1,
  },
  actionIconOnly: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 4,
    opacity: 0.95,
  },
  actionIconsWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  /** Don't show again — tertiary, smaller than banner body */
  dismissPersistText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "400",
  },
  actionLinkLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  actionText: {
    textAlign: "right",
  },
});
