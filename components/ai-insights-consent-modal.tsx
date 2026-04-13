import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import {
  getAIInsightsManualTipDismissed,
  setAIInsightsManualTipDismissed,
} from "@/utils/ai-insights-consent";
import { useTranslate } from "@/utils/languages/use-translate";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AIInsightsConsentModalProps = {
  visible: boolean;
  onEnable: () => void;
  onMaybeLater: () => void;
};

export function AIInsightsConsentModal({
  visible,
  onEnable,
  onMaybeLater,
}: AIInsightsConsentModalProps) {
  const t = useTranslate();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const fontScale = useFontScale();
  const insets = useSafeAreaInsets();

  const styles = useMemo(
    () => createStyles(colors, colorScheme ?? "dark", fontScale, insets.top),
    [colors, colorScheme, fontScale, insets.top],
  );

  const enablePressedRef = useRef(false);
  const [showManualModeTip, setShowManualModeTip] = useState(false);
  const [manualModeTipDismissed, setManualModeTipDismissed] = useState(false);

  useEffect(() => {
    if (!visible) return;
    enablePressedRef.current = false;
    setShowManualModeTip(false);

    let isActive = true;
    void getAIInsightsManualTipDismissed().then((dismissed) => {
      if (!isActive) return;
      setManualModeTipDismissed(dismissed);
    });
    return () => {
      isActive = false;
    };
  }, [visible]);

  const handleContainerPress = () => {
    onMaybeLater();
  };
  const handleCardPress = () => {};
  const handleEnablePress = () => {
    if (enablePressedRef.current) return;
    enablePressedRef.current = true;
    onEnable();
  };
  const handleMaybeLaterPress = () => {
    if (manualModeTipDismissed) {
      onMaybeLater();
      return;
    }
    setShowManualModeTip(true);
  };
  const handleManualTipOkPress = () => {
    onMaybeLater();
  };
  const handleManualTipDontShowAgainPress = () => {
    setManualModeTipDismissed(true);
    void setAIInsightsManualTipDismissed(true);
    onMaybeLater();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onMaybeLater}
    >
      <Pressable style={styles.container} onPress={handleContainerPress}>
        <Pressable style={styles.card} onPress={handleCardPress}>
          <ThemedText size="l" weight="bold" style={styles.title}>
            {showManualModeTip
              ? t("ai.insights.manualTip.title")
              : t("settings.aiInsights.title")}
          </ThemedText>
          <ThemedText size="sm" style={styles.body}>
            {showManualModeTip
              ? t("ai.insights.manualTip.body")
              : t("ai.insights.consent.body")}
          </ThemedText>

          <View style={styles.actions}>
            {showManualModeTip ? (
              <>
                <Pressable
                  style={styles.primaryButton}
                  onPress={handleManualTipOkPress}
                  hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
                >
                  <ThemedText
                    size="sm"
                    weight="bold"
                    style={styles.primaryButtonText}
                  >
                    {t("common.ok")}
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={handleManualTipDontShowAgainPress}
                >
                  <ThemedText
                    size="sm"
                    weight="bold"
                    style={styles.secondaryButtonText}
                  >
                    {t("guidePrompt.dismiss")}
                  </ThemedText>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  style={styles.primaryButton}
                  onPress={handleEnablePress}
                  hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
                >
                  <ThemedText
                    size="sm"
                    weight="bold"
                    style={styles.primaryButtonText}
                  >
                    {t("settings.aiInsights.enable")}
                  </ThemedText>
                </Pressable>

                <Pressable
                  style={styles.secondaryButton}
                  onPress={handleMaybeLaterPress}
                >
                  <ThemedText
                    size="sm"
                    weight="bold"
                    style={styles.secondaryButtonText}
                  >
                    {t("ai.insights.consent.maybeLater")}
                  </ThemedText>
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(
  colors: any,
  scheme: "light" | "dark",
  fontScale: number,
  safeTop: number,
) {
  const isDark = scheme === "dark";
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 18 * fontScale,
      paddingTop: safeTop,
      backgroundColor: "rgba(0,0,0,0.55)",
    },
    card: {
      borderRadius: 16 * fontScale,
      padding: 18 * fontScale,
      backgroundColor: isDark
        ? colors.surfaceElevated1 || "rgba(26, 35, 50, 1)"
        : "#FFFFFF",
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 10,
    },
    title: {
      marginBottom: 10 * fontScale,
      color: colors.text,
    },
    body: {
      color: isDark
        ? colors.textMediumEmphasis || colors.text
        : colors.textMediumEmphasis || colors.text,
      lineHeight: 20 * fontScale,
    },
    actions: {
      marginTop: 16 * fontScale,
      gap: 10 * fontScale,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 12 * fontScale,
      paddingVertical: 12 * fontScale,
      alignItems: "center",
    },
    primaryButtonText: {
      color: "#FFFFFF",
    },
    secondaryButton: {
      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
      borderRadius: 12 * fontScale,
      paddingVertical: 12 * fontScale,
      alignItems: "center",
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
    },
    secondaryButtonText: {
      color: colors.text,
    },
  });
}
