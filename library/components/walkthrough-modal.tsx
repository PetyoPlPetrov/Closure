import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { useTranslate } from "@/utils/languages/use-translate";
import type { Translations } from "@/utils/languages/translations";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
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
  onOpenGuide: () => void;
  onDismissForever: () => void;
  sections: SectionItem[];
};

export function WalkthroughModal({
  visible,
  onDismiss,
  onOpenGuide,
  onDismissForever,
  sections,
}: WalkthroughModalProps) {
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const colors = Colors[colorScheme ?? "dark"];
  const t = useTranslate();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          justifyContent: "center",
          alignItems: "center",
          padding: 20 * fontScale,
          paddingTop: 80 * fontScale,
        },
        container: {
          backgroundColor:
            colorScheme === "dark" ? colors.background : "#ffffff",
          borderRadius: 20 * fontScale,
          padding: 24 * fontScale,
          width: "100%",
          maxWidth: 360 * fontScale,
          marginTop: 48 * fontScale,
          position: "relative",
          overflow: "hidden",
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
          gap: 16 * fontScale,
        },
        iconContainer: {
          width: 64 * fontScale,
          height: 64 * fontScale,
          borderRadius: 32 * fontScale,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(100, 150, 255, 0.2)"
              : "rgba(100, 150, 255, 0.15)",
          justifyContent: "center",
          alignItems: "center",
          alignSelf: "center",
        },
        title: {
          textAlign: "center",
        },
        message: {
          textAlign: "center",
          lineHeight: 22 * fontScale,
        },
        sectionRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12 * fontScale,
          paddingVertical: 6 * fontScale,
        },
        primaryButton: {
          height: 48 * fontScale,
          borderRadius: 12 * fontScale,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24 * fontScale,
          backgroundColor: colors.primary,
        },
        dismissLink: {
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 8 * fontScale,
        },
      }),
    [fontScale, colorScheme, colors.background, colors.primary],
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
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
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

              {/* Close button */}
              <TouchableOpacity
                onPress={onDismiss}
                activeOpacity={0.7}
                hitSlop={12}
                style={{
                  position: "absolute",
                  top: 16 * fontScale,
                  right: 16 * fontScale,
                  zIndex: 2,
                  width: 32 * fontScale,
                  height: 32 * fontScale,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons
                  name="close"
                  size={22 * fontScale}
                  color={colors.text}
                />
              </TouchableOpacity>

              <View style={styles.content}>
                {/* Icon */}
                <View style={styles.iconContainer}>
                  <MaterialIcons
                    name="menu-book"
                    size={32 * fontScale}
                    color={colors.primaryLight}
                  />
                </View>

                {/* Title */}
                <ThemedText
                  size="xl"
                  weight="bold"
                  letterSpacing="s"
                  style={styles.title}
                >
                  {t("guidePrompt.title")}
                </ThemedText>

                {/* Message */}
                <ThemedText size="sm" weight="normal" style={styles.message}>
                  {t("guidePrompt.message")}
                </ThemedText>

                {/* Sections checklist */}
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false}
                >
                  {sections.map((section) => (
                    <View key={section.id} style={styles.sectionRow}>
                      <MaterialIcons
                        name={section.isDone ? "check-circle" : "radio-button-unchecked"}
                        size={20 * fontScale}
                        color={section.isDone ? colors.primary : colors.textDisabled}
                      />
                      <MaterialIcons
                        name={section.icon}
                        size={20 * fontScale}
                        color={colors.text}
                      />
                      <ThemedText size="sm" weight="medium">
                        {t(section.titleKey)}
                      </ThemedText>
                    </View>
                  ))}
                </ScrollView>

                {/* Open Guide button */}
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={onOpenGuide}
                  activeOpacity={0.8}
                >
                  <ThemedText size="l" weight="bold" style={{ color: "#ffffff" }}>
                    {t("guidePrompt.openGuide")}
                  </ThemedText>
                </TouchableOpacity>

                {/* Don't show again */}
                <TouchableOpacity
                  style={styles.dismissLink}
                  onPress={onDismissForever}
                  activeOpacity={0.7}
                >
                  <ThemedText size="sm" emphasis="medium">
                    {t("guidePrompt.dismiss")}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
