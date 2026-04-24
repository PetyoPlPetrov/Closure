import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTranslate } from "@/utils/languages/use-translate";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

type Props = {
  message: string;
  dismissLabel: string;
  onClose: () => void;
  onDontShowAgain: () => void;
  messageIconName?: keyof typeof MaterialIcons.glyphMap;
  messageIconColor?: string;
};

export function SferaSizeHintBanner({
  message,
  dismissLabel,
  onClose,
  onDontShowAgain,
  messageIconName,
  messageIconColor,
}: Props) {
  const t = useTranslate();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];

  const bg =
    colorScheme === "dark"
      ? "rgba(18, 24, 36, 0.42)"
      : "rgba(248, 249, 252, 0.72)";
  const border =
    colorScheme === "dark"
      ? "rgba(255, 255, 255, 0.1)"
      : "rgba(0, 0, 0, 0.08)";
  const entranceProgress = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    entranceProgress.setValue(0);
    Animated.timing(entranceProgress, {
      toValue: 1,
      duration: 550,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entranceProgress, message]);

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
          onPress={onClose}
          hitSlop={12}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
        >
          <MaterialIcons
            name="close"
            size={18}
            color={colorScheme === "dark" ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)"}
          />
        </Pressable>
        <View style={styles.messageRow}>
          {messageIconName ? (
            <MaterialIcons
              name={messageIconName}
              size={22}
              color={messageIconColor ?? "#FACC15"}
              style={styles.messageIcon}
            />
          ) : null}
          <ThemedText style={[styles.body, { color: colors.text }]}>
            {message}
          </ThemedText>
        </View>
        <Pressable onPress={onDontShowAgain} style={styles.dismissRow}>
          <ThemedText
            style={[styles.dismissText, { color: colors.tint, opacity: 0.85 }]}
            type="link"
          >
            {dismissLabel}
          </ThemedText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
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
    opacity: 0.82,
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
  dismissRow: {
    marginTop: 12,
    alignSelf: "center",
  },
  dismissText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
