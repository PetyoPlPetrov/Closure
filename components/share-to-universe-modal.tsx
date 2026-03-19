/**
 * ShareToUniverseModal — bottom-sheet where users type a life lesson/thought
 * and share it with the community Universe feed.
 *
 * Design language: matches the dark Sferas palette (#1A2332 / #243041),
 * floating blur pill header, same accent blue (#64B5F6).
 */

import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { useTranslate } from "@/utils/languages/use-translate";
import {
  isShareBannedToday,
  recordShareRejection,
  submitLessonToUniverse,
} from "@/utils/universe-lessons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { BlurView } from "expo-blur";
import * as Device from "expo-device";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ShareToUniverseModalProps {
  visible: boolean;
  onClose: () => void;
}

type SubmitState = "idle" | "submitting" | "success";

const MAX_LENGTH = 280;

export const ShareToUniverseModal: React.FC<ShareToUniverseModalProps> = ({
  visible,
  onClose,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const t = useTranslate();
  const insets = useSafeAreaInsets();
  const fontScale = useFontScale();
  const inputRef = useRef<TextInput>(null);

  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  // Sheet slide-up animation
  const translateY = useSharedValue(500);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 280 });
      translateY.value = withSpring(0, {
        damping: 22,
        stiffness: 200,
        mass: 0.8,
      });
      // Auto-focus input after sheet animates in
      setTimeout(() => inputRef.current?.focus(), 350);
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(500, {
        duration: 260,
        easing: Easing.in(Easing.ease),
      });
    }
  }, [visible, backdropOpacity, translateY]);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose();
    // Reset after close animation
    setTimeout(() => {
      setText("");
      setAuthor("");
      setSubmitState("idle");
    }, 300);
  }, [onClose]);

  const handleShare = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (trimmed.length < 10) {
      Alert.alert(
        t("error"),
        "Please write at least 10 characters to share a meaningful thought."
      );
      return;
    }

    // Check daily share ban
    const banned = await isShareBannedToday();
    if (banned) {
      Alert.alert(t("lesson_share_banned_title"), t("lesson_share_banned"));
      return;
    }

    Keyboard.dismiss();
    if (Platform.OS === "ios" && Device.isDevice) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    setSubmitState("submitting");
    const result = await submitLessonToUniverse(
      trimmed,
      author.trim() || undefined
    );

    if (result.success) {
      setSubmitState("success");
      if (Platform.OS === "ios" && Device.isDevice) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      setTimeout(() => {
        handleClose();
      }, 1800);
    } else {
      // Check if rejected by AI moderation
      if (
        result.error &&
        (result.error.toLowerCase().includes("reject") ||
          result.error.toLowerCase().includes("moderat"))
      ) {
        await recordShareRejection();
        Alert.alert(t("error"), t("lesson_moderation_rejected"));
      } else {
        Alert.alert(t("error"), t("lesson_shared_error"));
      }
      setSubmitState("idle");
    }
  }, [text, author, t, handleClose]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const isDark = colorScheme === "dark";
  const charCount = text.length;
  const charNearLimit = charCount > MAX_LENGTH * 0.8;
  const charOverLimit = charCount > MAX_LENGTH;

  const canShare = text.trim().length >= 10 && !charOverLimit && submitState === "idle";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
      accessibilityViewIsModal
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} accessibilityLabel="Close share modal" />
        </Animated.View>

        {/* Bottom sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom + 16, 28),
            },
            sheetStyle,
          ]}
        >
          {/* Background gradient — matches app surface palette */}
          <LinearGradient
            colors={isDark ? ["#243041", "#1E2A3A", "#1A2332"] : ["#F5F5F5", "#EBEBEB"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Drag handle */}
          <View style={styles.dragHandle} />

          {/* Header row */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleRow}>
              <MaterialIcons
                name="auto-awesome"
                size={18}
                color="#64B5F6"
                style={{ marginRight: 7 }}
                accessibilityElementsHidden
              />
              <ThemedText style={styles.headerTitle}>
                {t("share_to_universe")}
              </ThemedText>
            </View>
            <Pressable
              onPress={handleClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel={t("common.close") || "Close"}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons
                name="close"
                size={20}
                color="rgba(255,255,255,0.55)"
                accessibilityElementsHidden
              />
            </Pressable>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Text input area */}
          <View style={styles.inputWrapper}>
            <BlurView
              intensity={isDark ? 12 : 6}
              tint={isDark ? "dark" : "light"}
              style={styles.inputBlur}
            >
              <TextInput
                ref={inputRef}
                style={[
                  styles.textInput,
                  { fontSize: Math.round(16 * fontScale), color: "rgba(255,255,255,0.87)" },
                ]}
                placeholder={
                  "What did life teach you? Share a thought, a lesson, a realization..."
                }
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={text}
                onChangeText={setText}
                multiline
                maxLength={MAX_LENGTH + 10}
                textAlignVertical="top"
                accessibilityLabel="Share your lesson"
                accessibilityHint="Type a life lesson or thought to share with the universe"
              />
              {/* Char counter */}
              {charCount > 0 && (
                <ThemedText
                  style={[
                    styles.charCounter,
                    charNearLimit && styles.charCounterWarn,
                    charOverLimit && styles.charCounterOver,
                  ]}
                >
                  {charCount}/{MAX_LENGTH}
                </ThemedText>
              )}
            </BlurView>
          </View>

          {/* Optional author name */}
          <View style={styles.authorWrapper}>
            <BlurView
              intensity={isDark ? 8 : 4}
              tint={isDark ? "dark" : "light"}
              style={styles.authorBlur}
            >
              <MaterialIcons
                name="person-outline"
                size={16}
                color="rgba(255,255,255,0.38)"
                style={{ marginRight: 8 }}
                accessibilityElementsHidden
              />
              <TextInput
                style={[
                  styles.authorInput,
                  { fontSize: Math.round(14 * fontScale) },
                ]}
                placeholder={t("share_to_universe_author_placeholder")}
                placeholderTextColor="rgba(255,255,255,0.28)"
                value={author}
                onChangeText={setAuthor}
                maxLength={40}
                returnKeyType="done"
                onSubmitEditing={canShare ? handleShare : undefined}
                accessibilityLabel={t("share_to_universe_author_label")}
              />
            </BlurView>
          </View>

          {/* Share button */}
          <Pressable
            onPress={handleShare}
            disabled={!canShare}
            style={({ pressed }) => [
              styles.shareBtn,
              !canShare && styles.shareBtnDisabled,
              pressed && canShare && styles.shareBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t("share_to_universe")}
            accessibilityState={{ disabled: !canShare }}
          >
            <LinearGradient
              colors={
                canShare || submitState === "submitting"
                  ? ["#5BA8E8", "#4290D4", "#3478BC"]
                  : ["rgba(100,181,246,0.25)", "rgba(100,181,246,0.15)"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.shareBtnGradient}
            >
              {submitState === "submitting" ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : submitState === "success" ? (
                <>
                  <MaterialIcons name="check" size={18} color="#fff" accessibilityElementsHidden />
                  <ThemedText style={styles.shareBtnText}>
                    {t("lesson_shared_success")}
                  </ThemedText>
                </>
              ) : (
                <>
                  <MaterialIcons name="auto-awesome" size={16} color={canShare ? "#fff" : "rgba(255,255,255,0.38)"} accessibilityElementsHidden />
                  <ThemedText
                    style={[
                      styles.shareBtnText,
                      !canShare && styles.shareBtnTextDisabled,
                    ]}
                  >
                    {t("share_to_universe")}
                  </ThemedText>
                </>
              )}
            </LinearGradient>
          </Pressable>

          {/* Disclaimer */}
          <ThemedText style={styles.disclaimer}>
            {t("share_to_universe_confirm")}
          </ThemedText>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    paddingHorizontal: 20,
    paddingTop: 10,
    // Subtle top border glow
    borderTopWidth: 1,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(100, 181, 246, 0.18)",
  },
  dragHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.20)",
    marginBottom: 14,
    marginTop: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "rgba(255,255,255,0.87)",
    letterSpacing: 0.2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -6,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 16,
  },
  inputWrapper: {
    marginBottom: 10,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(100,181,246,0.18)",
  },
  inputBlur: {
    padding: 14,
    minHeight: 120,
  },
  textInput: {
    minHeight: 90,
    fontWeight: "400",
    lineHeight: 24,
    letterSpacing: 0.15,
  },
  charCounter: {
    fontSize: 12,
    color: "rgba(255,255,255,0.38)",
    textAlign: "right",
    marginTop: 4,
  },
  charCounterWarn: {
    color: "rgba(255,204,128,0.75)",
  },
  charCounterOver: {
    color: "rgba(239,83,80,0.90)",
  },
  authorWrapper: {
    marginBottom: 16,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
  },
  authorBlur: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  authorInput: {
    flex: 1,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "400",
    letterSpacing: 0.15,
  },
  shareBtn: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
  },
  shareBtnDisabled: {
    opacity: 0.7,
  },
  shareBtnPressed: {
    opacity: 0.88,
  },
  shareBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: 0.3,
  },
  shareBtnTextDisabled: {
    color: "rgba(255,255,255,0.38)",
  },
  disclaimer: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 4,
  },
});
