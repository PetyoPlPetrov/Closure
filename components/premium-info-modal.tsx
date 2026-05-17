import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { useTranslate } from "@/utils/languages/use-translate";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useMemo } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

type PremiumInfoModalProps = {
  visible: boolean;
  onClose: () => void;
};

const FEATURES: { icon: keyof typeof MaterialIcons.glyphMap; key: string }[] = [
  { icon: "psychology", key: "premium.feature.ai" },
  { icon: "people", key: "premium.feature.unlimited" },
  { icon: "notifications-active", key: "premium.feature.notifications" },
  { icon: "insights", key: "premium.feature.analytics" },
];

export function PremiumInfoModal({ visible, onClose }: PremiumInfoModalProps) {
  const t = useTranslate();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const fontScale = useFontScale();

  const styles = useMemo(
    () => createStyles(colors, colorScheme ?? "dark", fontScale),
    [colors, colorScheme, fontScale],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <ThemedText size="sm" weight="medium" style={styles.sectionTitle}>
              {t("premium.whatsIncluded")}
            </ThemedText>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeButton}
            >
              <MaterialIcons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.featuresList}>
            {FEATURES.map(({ icon, key }) => (
              <View key={key} style={styles.featureRow}>
                <View style={styles.iconWrapper}>
                  <MaterialIcons
                    name={icon}
                    size={22 * fontScale}
                    color={colors.primary}
                  />
                </View>
                <ThemedText size="sm" style={styles.featureText}>
                  {t(key as keyof import("@/utils/languages/translations").Translations)}
                </ThemedText>
              </View>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(
  colors: { text: string; primary: string; background: string },
  scheme: "light" | "dark",
  fontScale: number,
) {
  const isDark = scheme === "dark";
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: 24 * fontScale,
    },
    card: {
      width: "100%",
      maxWidth: 400,
      backgroundColor: isDark ? colors.background : "#ffffff",
      borderRadius: 16 * fontScale,
      padding: 20 * fontScale,
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16 * fontScale,
    },
    sectionTitle: {
      color: colors.text,
      opacity: 0.8,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    closeButton: {
      padding: 4,
    },
    featuresList: {
      gap: 14 * fontScale,
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12 * fontScale,
    },
    iconWrapper: {
      width: 36 * fontScale,
      height: 36 * fontScale,
      borderRadius: 18 * fontScale,
      backgroundColor: isDark
        ? "rgba(100, 150, 255, 0.2)"
        : "rgba(100, 150, 255, 0.15)",
      justifyContent: "center",
      alignItems: "center",
    },
    featureText: {
      flex: 1,
      color: colors.text,
      lineHeight: 20 * fontScale,
    },
  });
}
