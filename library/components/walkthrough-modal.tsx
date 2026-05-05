import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { useTranslate } from "@/utils/languages/use-translate";
import type { Translations } from "@/utils/languages/translations";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { Fragment, useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";

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
  const getSectionLabelColor = (section: SectionItem) => {
    const isCurrent =
      nextSectionIndex !== -1 && sections[nextSectionIndex]?.id === section.id;
    if (section.isDone) return colorScheme === "dark" ? "#4ADE80" : "#1B5E20";
    if (isCurrent) return colorScheme === "dark" ? "#FBBF24" : "#9A3412";
    return colors.textMediumEmphasis;
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
        },
        backdrop: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(0, 0, 0, 0.45)"
              : "rgba(0, 0, 0, 0.28)",
        },
        overlay: {
          flex: 1,
          justifyContent: "flex-start",
          paddingHorizontal: 16 * fontScale,
        },
        container: {
          backgroundColor: colors.background,
          borderRadius: 16 * fontScale,
          paddingVertical: 10 * fontScale,
          paddingHorizontal: 12 * fontScale,
          width: "100%",
          position: "relative",
          overflow: "hidden",
        },
        gradientBackground: {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 16 * fontScale,
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
          fontSize: 11 * fontScale,
          fontWeight: "500",
          color: colors.textMediumEmphasis,
          letterSpacing: 0.2 * fontScale,
        },
        openGuideButton: {
          alignSelf: "auto",
          paddingVertical: 8 * fontScale,
          paddingHorizontal: 18 * fontScale,
          borderRadius: 12 * fontScale,
          backgroundColor:
            colorScheme === "dark" ? colors.primary : "#1565C0",
          borderWidth: 1,
          borderColor:
            colorScheme === "dark"
              ? "rgba(255,255,255,0.22)"
              : "rgba(0,0,0,0.12)",
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
    [
      fontScale,
      colorScheme,
      colors.background,
      colors.text,
      colors.primary,
      colors.primaryLight,
      colors.textMediumEmphasis,
      insets.top,
    ],
  );

  // Keep shadow/elevation off StyleSheet.registered ids — conditional spreads inside
  // StyleSheet.create are unreliable across RN builds and have caused the card layer to omit paint.
  const cardShadowWrapStyle = useMemo((): ViewStyle => {
    const base: ViewStyle = {
      width: "100%",
      maxWidth: 460 * fontScale,
      marginTop: insets.top + 8 * fontScale,
      alignSelf: "center",
      borderRadius: 16 * fontScale,
      overflow: "visible",
      // Opaque fill so iOS shadow path matches the rounded rect (avoids white corner glitches).
      backgroundColor: colors.background,
    };
    if (Platform.OS === "android") {
      return { ...base, elevation: 4 };
    }
    return {
      ...base,
      shadowColor: "#000000",
      shadowOffset: {
        width: 0,
        height: Math.min(2 * fontScale, 2.5),
      },
      shadowOpacity: colorScheme === "dark" ? 0.32 : 0.12,
      shadowRadius: Math.min(6 * fontScale, 8),
    };
  }, [fontScale, insets.top, colors.background, colorScheme]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      presentationStyle="overFullScreen"
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel={t("guidePrompt.close")}
        />
        <View style={styles.overlay} pointerEvents="box-none">
          <View style={cardShadowWrapStyle} collapsable={false}>
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
              borderRadius: 16 * fontScale,
              borderWidth: 2,
              borderColor:
                colorScheme === "dark"
                  ? "rgba(120, 170, 255, 0.58)"
                  : "rgba(70, 130, 215, 0.48)",
            }}
          />

          <View style={styles.content}>
            <View style={styles.headerRow}>
              <View style={styles.titleRow}>
                <View style={styles.iconContainer}>
                  <MaterialIcons
                    name="menu-book"
                    size={20 * fontScale}
                    color={
                      colorScheme === "dark"
                        ? colors.primaryLight
                        : "#1565C0"
                    }
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
                  accessibilityLabel={t("guidePrompt.close")}
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
                  {(() => {
                    const sectionIconColor = getSectionLabelColor(section);
                    const isCurrent =
                      nextSectionIndex !== -1 &&
                      sections[nextSectionIndex]?.id === section.id;
                    const sectionBadgeBackground = section.isDone
                      ? colorScheme === "dark"
                        ? "rgba(18, 50, 34, 0.95)"
                        : "#DFF7E8"
                      : isCurrent
                        ? colorScheme === "dark"
                          ? "rgba(58, 42, 10, 0.95)"
                          : "#FDEAD7"
                        : colorScheme === "dark"
                          ? "rgba(36, 48, 65, 0.95)"
                          : "#E7EDF6";
                    const sectionBadgeBorder = sectionIconColor;
                    return (
                  <View
                    style={[
                      styles.sectionIconBadge,
                      {
                        backgroundColor: sectionBadgeBackground,
                        borderWidth: 2,
                        borderColor: sectionBadgeBorder,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={section.isDone ? "check-circle" : section.icon}
                      size={18 * fontScale}
                      color={sectionIconColor}
                    />
                  </View>
                    );
                  })()}
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
              {sections.map((section) => {
                const labelColor = getSectionLabelColor(section);

                return (
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
                        color: labelColor,
                      },
                    ]}
                  >
                    {t(section.titleKey)}
                  </Text>
                </View>
                );
              })}
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
        </View>
      </View>
    </Modal>
  );
}
