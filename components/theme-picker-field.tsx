import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { useTranslate } from "@/utils/languages/use-translate";
import { type ThemeMode, useTheme } from "@/utils/ThemeContext";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

/** Display order: Dark, Light, System */
const THEME_OPTIONS: ThemeMode[] = ["dark", "light", "system"];

function themeOptionIcon(
  mode: ThemeMode,
): "light-mode" | "dark-mode" | "brightness-auto" {
  switch (mode) {
    case "light":
      return "light-mode";
    case "dark":
      return "dark-mode";
    case "system":
      return "brightness-auto";
  }
}

export function ThemePickerField() {
  const fontScale = useFontScale();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const t = useTranslate();
  const { themeMode, setThemeMode } = useTheme();
  const [visible, setVisible] = useState(false);

  const getThemeLabel = (mode: ThemeMode) => {
    switch (mode) {
      case "light":
        return t("settings.theme.light");
      case "dark":
        return t("settings.theme.dark");
      case "system":
        return t("settings.theme.system");
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        section: { gap: 16 * fontScale },
        sectionTitle: { marginBottom: 8 * fontScale },
        dropdown: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 16 * fontScale,
          borderRadius: 12 * fontScale,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(0, 0, 0, 0.05)",
          borderWidth: 1,
          borderColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
        },
        dropdownContent: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12 * fontScale,
          flex: 1,
        },
        dropdownText: { flex: 1 },
        modalOverlay: {
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          justifyContent: "flex-end",
        },
        modalContent: {
          backgroundColor: colorScheme === "dark" ? "#1a1a1a" : colors.surfaceElevated1,
          borderTopLeftRadius: 20 * fontScale,
          borderTopRightRadius: 20 * fontScale,
          paddingTop: 20 * fontScale,
          paddingBottom: 40 * fontScale,
          maxHeight: "50%",
        },
        modalHeader: {
          paddingHorizontal: 20 * fontScale,
          paddingBottom: 16 * fontScale,
          borderBottomWidth: 1,
          borderBottomColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
        },
        dropdownOption: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 16 * fontScale,
          paddingHorizontal: 20 * fontScale,
        },
        dropdownOptionContent: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12 * fontScale,
          flex: 1,
        },
      }),
    [colorScheme, fontScale, colors.surfaceElevated1],
  );

  return (
    <>
      <View style={styles.section}>
        <ThemedText size="l" weight="semibold" style={styles.sectionTitle}>
          {t("settings.theme")}
        </ThemedText>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setVisible(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t("settings.theme")}
          accessibilityHint={t("settings.theme.description")}
        >
          <View style={styles.dropdownContent}>
            <MaterialIcons
              name="contrast"
              size={24 * fontScale}
              color={colors.icon}
            />
            <ThemedText size="l" weight="medium" style={styles.dropdownText}>
              {getThemeLabel(themeMode)}
            </ThemedText>
          </View>
          <MaterialIcons
            name="arrow-drop-down"
            size={24 * fontScale}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setVisible(false)}
        >
          <View style={styles.modalContent}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <ThemedText size="l" weight="bold">
                  {t("settings.theme")}
                </ThemedText>
              </View>

              {THEME_OPTIONS.map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={styles.dropdownOption}
                  onPress={async () => {
                    await setThemeMode(mode);
                    setVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.dropdownOptionContent}>
                    <MaterialIcons
                      name={themeOptionIcon(mode)}
                      size={24 * fontScale}
                      color={colors.icon}
                    />
                    <ThemedText
                      size="l"
                      weight={themeMode === mode ? "bold" : "medium"}
                    >
                      {getThemeLabel(mode)}
                    </ThemedText>
                  </View>
                  {themeMode === mode && (
                    <MaterialIcons
                      name="check-circle"
                      size={24 * fontScale}
                      color={colors.text}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
