import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { useTranslate } from "@/utils/languages/use-translate";
import type { Translations } from "@/utils/languages/translations";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { Fragment, useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, Modal, StyleSheet, TouchableOpacity, View } from "react-native";

type SectionItem = {
  id: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  titleKey: keyof Translations;
  isDone: boolean;
};

type WalkthroughModalProps = {
  visible: boolean;
  onDismiss: () => void;
  onDismissForever: () => void;
  onOpenGuide: () => void;
  sections: SectionItem[];
};

export function WalkthroughModal({
  visible,
  onDismiss,
  onDismissForever,
  onOpenGuide,
  sections,
}: WalkthroughModalProps) {
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const insets = useSafeAreaInsets();
  const colors = Colors[colorScheme ?? "dark"];
  const t = useTranslate();
  const nextSectionIndex = sections.findIndex((section) => !section.isDone);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          justifyContent: "flex-start",
          paddingHorizontal: 16 * fontScale,
        },
        container: {
          backgroundColor:
            colorScheme === "dark" ? colors.background : "#ffffff",
          borderRadius: 16 * fontScale,
          paddingVertical: 10 * fontScale,
          paddingHorizontal: 12 * fontScale,
          width: "100%",
          maxWidth: 460 * fontScale,
          marginTop: insets.top + 8 * fontScale,
          position: "relative",
          overflow: "hidden",
          alignSelf: "center",
        },
        gradientBackground: {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 20 * fontScale,
        },
        content: {
          position: "relative",
          zIndex: 1,
          gap: 10 * fontScale,
        },
        headerRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        titleRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8 * fontScale,
        },
        iconContainer: {
          width: 36 * fontScale,
          height: 36 * fontScale,
          borderRadius: 18 * fontScale,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(100, 150, 255, 0.2)"
              : "rgba(100, 150, 255, 0.15)",
          justifyContent: "center",
          alignItems: "center",
          alignSelf: "flex-start",
        },
        actionRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8 * fontScale,
        },
        headerTitle: {
          fontSize: 15 * fontScale,
          fontWeight: "700",
          color: colors.text,
          letterSpacing: 0.2 * fontScale,
        },
        iconButton: {
          width: 34 * fontScale,
          height: 34 * fontScale,
          borderRadius: 17 * fontScale,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(0, 0, 0, 0.05)",
        },
        progressTrack: {
          display: "none",
        },
        iconStrip: {
          flexDirection: "row",
          alignItems: "center",
        },
        labelsRow: {
          flexDirection: "row",
          alignItems: "flex-start",
          marginTop: 6 * fontScale,
        },
        sectionLabelCell: {
          flex: 1,
          minWidth: 0,
          alignItems: "center",
        },
        sectionIconBadge: {
          width: 32 * fontScale,
          height: 32 * fontScale,
          borderRadius: 16 * fontScale,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.06)"
              : "rgba(0, 0, 0, 0.05)",
        },
        sectionConnector: {
          flex: 1,
          height: 2 * fontScale,
          marginHorizontal: 6 * fontScale,
          borderRadius: 999,
        },
        sectionLabel: {
          fontSize: 11 * fontScale,
          fontWeight: "600",
          textAlign: "center",
          lineHeight: 13 * fontScale,
          includeFontPadding: false,
          width: "100%",
        },
        dismissForeverButton: {
          alignSelf: "auto",
          paddingVertical: 7 * fontScale,
          paddingHorizontal: 14 * fontScale,
          borderRadius: 12 * fontScale,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(0, 0, 0, 0.05)",
          borderWidth: 1,
          borderColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.14)"
              : "rgba(0, 0, 0, 0.1)",
        },
        dismissForeverText: {
          fontSize: 12 * fontScale,
          fontWeight: "700",
          color: colors.textMuted,
          letterSpacing: 0.2 * fontScale,
        },
        openGuideButton: {
          alignSelf: "auto",
          paddingVertical: 8 * fontScale,
          paddingHorizontal: 18 * fontScale,
          borderRadius: 12 * fontScale,
          backgroundColor: colors.primary,
          borderWidth: 1,
          borderColor:
            colorScheme === "dark"
              ? "rgba(255,255,255,0.22)"
              : "rgba(0,0,0,0.08)",
        },
        openGuideText: {
          fontSize: 12 * fontScale,
          fontWeight: "700",
          color: "#FFFFFF",
          letterSpacing: 0.2 * fontScale,
        },
        ctaRow: {
          marginTop: 4 * fontScale,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10 * fontScale,
        },
      }),
    [fontScale, colorScheme, colors.background, colors.primary, insets.top],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      presentationStyle="overFullScreen"
      statusBarTranslucent
    >
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.container}>
          {/* Gradient background */}
          <LinearGradient
            colors={
              colorScheme === "dark"
                ? [
                    "rgba(100, 150, 255, 0.15)",
                    "rgba(100, 150, 255, 0.08)",
                    "rgba(100, 150, 255, 0.12)",
                  ]
                : [
                    "rgba(100, 150, 255, 0.12)",
                    "rgba(100, 150, 255, 0.06)",
                    "rgba(100, 150, 255, 0.1)",
                  ]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBackground}
          />

          {/* Border */}
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              borderRadius: 20 * fontScale,
              borderWidth: 1.5,
              borderColor:
                colorScheme === "dark"
                  ? "rgba(100, 150, 255, 0.4)"
                  : "rgba(100, 150, 255, 0.3)",
            }}
          />

          <View style={styles.content}>
            <View style={styles.headerRow}>
              <View style={styles.titleRow}>
                <View style={styles.iconContainer}>
                  <MaterialIcons
                    name="menu-book"
                    size={20 * fontScale}
                    color={colors.primaryLight}
                  />
                </View>
                <Text style={styles.headerTitle}>{t("guidePrompt.title")}</Text>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={onDismiss}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={t("guidePrompt.dismiss")}
                >
                  <MaterialIcons
                    name="close"
                    size={18 * fontScale}
                    color={colors.text}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.iconStrip}>
              {sections.map((section, index) => (
                <Fragment key={section.id}>
                  <View
                    style={[
                      styles.sectionIconBadge,
                      {
                        backgroundColor: section.isDone
                          ? colorScheme === "dark"
                            ? "rgba(34, 197, 94, 0.22)"
                            : "rgba(34, 197, 94, 0.16)"
                          : nextSectionIndex !== -1 &&
                              sections[nextSectionIndex]?.id === section.id
                            ? colorScheme === "dark"
                              ? "rgba(245, 158, 11, 0.24)"
                              : "rgba(245, 158, 11, 0.2)"
                            : colorScheme === "dark"
                              ? "rgba(125, 181, 255, 0.14)"
                              : "rgba(78, 141, 214, 0.12)",
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={section.isDone ? "check-circle" : section.icon}
                      size={18 * fontScale}
                      color={
                        section.isDone
                          ? "#22C55E"
                          : nextSectionIndex !== -1 &&
                              sections[nextSectionIndex]?.id === section.id
                            ? "#F59E0B"
                            : colors.text
                      }
                    />
                  </View>
                  {index < sections.length - 1 ? (
                    <View
                      style={[
                        styles.sectionConnector,
                        {
                          backgroundColor: section.isDone
                            ? "#22C55E"
                            : nextSectionIndex !== -1 &&
                                sections[nextSectionIndex]?.id === section.id
                              ? "rgba(245, 158, 11, 0.65)"
                              : colorScheme === "dark"
                                ? "rgba(125, 181, 255, 0.32)"
                                : "rgba(78, 141, 214, 0.3)",
                        },
                      ]}
                    />
                  ) : null}
                </Fragment>
              ))}
            </View>
            <View style={styles.labelsRow}>
              {sections.map((section) => (
                <View
                  key={`${section.id}-label`}
                  style={styles.sectionLabelCell}
                  accessibilityLabel={t(section.titleKey)}
                >
                  <Text
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    style={[
                      styles.sectionLabel,
                      {
                        color: section.isDone ? "#22C55E" : colors.primaryLight,
                      },
                    ]}
                  >
                    {t(section.titleKey)}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.ctaRow}>
              <TouchableOpacity
                style={styles.dismissForeverButton}
                onPress={onDismissForever}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={t("guidePrompt.dismiss")}
              >
                <Text style={styles.dismissForeverText}>{t("guidePrompt.dismiss")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.openGuideButton}
                onPress={onOpenGuide}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t("guidePrompt.openGuide")}
              >
                <Text style={styles.openGuideText}>{t("guidePrompt.openGuide")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
