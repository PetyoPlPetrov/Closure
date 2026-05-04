import { ThemePickerField } from "@/components/theme-picker-field";
import { ConstellationBackground } from "@/components/constellation-background";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { useLargeDevice } from "@/hooks/use-large-device";
import { TabScreenContainer } from "@/library/components/tab-screen-container";
import { useAIInsightsConsent } from "@/utils/AIInsightsConsentProvider";
import { useLanguage } from "@/utils/languages/language-context";
import { useTranslate } from "@/utils/languages/use-translate";
import { useVisualSettings } from "@/utils/VisualSettingsProvider";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { type Language } from "@/utils/languages/translations";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function PersonalizationScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const fontScale = useFontScale();
  const { maxContentWidth } = useLargeDevice();
  const t = useTranslate();
  const { constellationAmount, constellationOpacity } = useVisualSettings();
  const aiConsent = useAIInsightsConsent();
  const { language, setLanguage } = useLanguage();
  const [languageDropdownVisible, setLanguageDropdownVisible] = useState(false);
  const [infoPopupKey, setInfoPopupKey] = useState<"aiInsights" | null>(null);

  const handleLanguageChange = async (lang: Language) => {
    await setLanguage(lang);
    setLanguageDropdownVisible(false);
  };

  const getLanguageLabel = (lang: Language) => {
    return lang === "en"
      ? t("settings.language.english")
      : t("settings.language.bulgarian");
  };

  const handleToggleAIInsights = useCallback(
    async (next: boolean) => {
      try {
        await aiConsent.setChoice(next ? "enabled" : "maybe_later");
      } catch {
        // ignore
      }
    },
    [aiConsent],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create<{
        container: ViewStyle;
        header: ViewStyle;
        headerButton: ViewStyle;
        headerTitle: TextStyle;
        content: ViewStyle;
        section: ViewStyle;
        sectionTitle: TextStyle;
        dropdown: ViewStyle;
        dropdownContent: ViewStyle;
        dropdownText: ViewStyle;
        aiToggleRow: ViewStyle;
        aiToggleTextWrap: ViewStyle;
        aiToggleTitleRow: ViewStyle;
        infoIconButton: ViewStyle;
        infoPopupCard: ViewStyle;
        modalOverlay: ViewStyle;
        modalContent: ViewStyle;
        modalHeader: ViewStyle;
        dropdownOption: ViewStyle;
        dropdownOptionContent: ViewStyle;
      }>({
        container: { flex: 1 },
        header: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16 * fontScale,
          paddingTop: 50,
          paddingBottom: 12 * fontScale,
        },
        headerButton: {
          minWidth: 44,
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
        },
        headerTitle: {
          flex: 1,
          textAlign: "center",
        },
        content: {
          padding: 16 * fontScale,
          paddingBottom: 32 * fontScale,
          gap: 24 * fontScale,
          maxWidth: maxContentWidth as number,
          alignSelf: "center",
          width: "100%",
        },
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
        aiToggleRow: {
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
        aiToggleTextWrap: { flex: 1, paddingRight: 12 * fontScale },
        aiToggleTitleRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8 * fontScale,
          flex: 1,
        },
        infoIconButton: { padding: 4 * fontScale, marginLeft: 4 * fontScale },
        infoPopupCard: {
          marginHorizontal: 24 * fontScale,
          padding: 20 * fontScale,
          borderRadius: 16 * fontScale,
          backgroundColor: colorScheme === "dark" ? "#1a1a1a" : colors.surfaceElevated1,
          maxWidth: 360,
          alignSelf: "center",
        },
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
    [
      colorScheme,
      fontScale,
      maxContentWidth,
      colors.surfaceElevated1,
    ],
  );

  return (
    <TabScreenContainer>
      <ConstellationBackground
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        constellationAmount={constellationAmount}
        constellationOpacity={constellationOpacity}
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
              hitSlop={12}
          >
            <MaterialIcons
              name="arrow-back-ios"
              size={24 * fontScale}
              color={colors.text}
            />
          </TouchableOpacity>
          <ThemedText size="l" weight="bold" style={styles.headerTitle}>
            {t("settings.personalization.title")}
          </ThemedText>
          <View style={styles.headerButton} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Language */}
          <View style={styles.section}>
            <ThemedText size="l" weight="semibold" style={styles.sectionTitle}>
              {t("settings.language")}
            </ThemedText>

            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setLanguageDropdownVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownContent}>
                <MaterialIcons
                  name="language"
                  size={24 * fontScale}
                  color={colors.icon}
                />
                <ThemedText size="l" weight="medium" style={styles.dropdownText}>
                  {getLanguageLabel(language)}
                </ThemedText>
              </View>
              <MaterialIcons
                name="arrow-drop-down"
                size={24 * fontScale}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>

          <ThemePickerField />

          {/* AI section */}
          <View style={styles.section}>
            <ThemedText size="l" weight="semibold" style={styles.sectionTitle}>
              {t("settings.aiInsights.title")}
            </ThemedText>

            <View style={styles.aiToggleRow}>
              <View style={styles.aiToggleTextWrap}>
                <View style={styles.aiToggleTitleRow}>
                  <ThemedText size="l" weight="medium" style={{ flex: 1 }}>
                    {t("settings.aiInsights.title")}
                  </ThemedText>
                  <TouchableOpacity
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.infoIconButton}
                    onPress={() => setInfoPopupKey("aiInsights")}
                  >
                    <MaterialIcons
                      name="info-outline"
                      size={20 * fontScale}
                      color={colors.text}
                      style={{ opacity: 0.6 }}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <Switch
                value={aiConsent.isEnabled}
                onValueChange={handleToggleAIInsights}
                trackColor={{
                  false: "rgba(150,150,150,0.35)",
                  true: colors.primary,
                }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* Notifications */}
          <View style={styles.section}>
            <ThemedText size="l" weight="semibold" style={styles.sectionTitle}>
              {t("settings.notifications.title")}
            </ThemedText>

            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => router.push("/notifications")}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownContent}>
                <MaterialIcons
                  name="notifications-active"
                  size={24 * fontScale}
                  color={colors.icon}
                />
                <ThemedText size="l" weight="medium" style={styles.dropdownText}>
                  {t("settings.notifications.manage")}
                </ThemedText>
              </View>
              <MaterialIcons
                name="arrow-forward-ios"
                size={20 * fontScale}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>

          {/* Usability: opens dedicated screen (hints + stop pulsing) */}
          <View style={styles.section}>
            <ThemedText size="l" weight="semibold" style={styles.sectionTitle}>
              {t("settings.usability.sectionTitle")}
            </ThemedText>

            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => router.push("/usability")}
              activeOpacity={0.7}
              hitSlop={12}
            >
              <View style={styles.dropdownContent}>
                <MaterialIcons
                  name="touch-app"
                  size={24 * fontScale}
                  color={colors.icon}
                />
                <ThemedText size="l" weight="medium" style={styles.dropdownText}>
                  {t("settings.usability.title")}
                </ThemedText>
              </View>
              <MaterialIcons
                name="arrow-forward-ios"
                size={20 * fontScale}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>

          {/* Look / Visual section: Moment Colors + Cosmic app look */}
          <View style={styles.section}>
            <ThemedText size="l" weight="semibold" style={styles.sectionTitle}>
              {t("personalization.visualSection")}
            </ThemedText>

            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => router.push("/moment-colors")}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownContent}>
                <MaterialIcons
                  name="palette"
                  size={24 * fontScale}
                  color={colors.icon}
                />
                <ThemedText size="l" weight="medium" style={styles.dropdownText}>
                  {t("settings.momentColors.title")}
                </ThemedText>
              </View>
              <MaterialIcons
                name="arrow-forward-ios"
                size={20 * fontScale}
                color={colors.text}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => router.push("/cosmic-app-look")}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownContent}>
                <MaterialIcons
                  name="blur-circular"
                  size={24 * fontScale}
                  color={colors.icon}
                />
                <ThemedText size="l" weight="medium" style={styles.dropdownText}>
                  {t("settings.personalization.cosmicAppLookTitle")}
                </ThemedText>
              </View>
              <MaterialIcons
                name="arrow-forward-ios"
                size={20 * fontScale}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      <Modal
        visible={languageDropdownVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLanguageDropdownVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setLanguageDropdownVisible(false)}
        >
          <View style={styles.modalContent}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <ThemedText size="l" weight="bold">
                  {t("settings.language")}
                </ThemedText>
              </View>

              <TouchableOpacity
                style={styles.dropdownOption}
                onPress={() => handleLanguageChange("en")}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownOptionContent}>
                  <MaterialIcons
                    name="language"
                    size={24 * fontScale}
                    color={colors.icon}
                  />
                  <ThemedText
                    size="l"
                    weight={language === "en" ? "bold" : "medium"}
                  >
                    {t("settings.language.english")}
                  </ThemedText>
                </View>
                {language === "en" && (
                  <MaterialIcons
                    name="check-circle"
                    size={24 * fontScale}
                    color={colors.text}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dropdownOption}
                onPress={() => handleLanguageChange("bg")}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownOptionContent}>
                  <MaterialIcons
                    name="language"
                    size={24 * fontScale}
                    color={colors.icon}
                  />
                  <ThemedText
                    size="l"
                    weight={language === "bg" ? "bold" : "medium"}
                  >
                    {t("settings.language.bulgarian")}
                  </ThemedText>
                </View>
                {language === "bg" && (
                  <MaterialIcons
                    name="check-circle"
                    size={24 * fontScale}
                    color={colors.text}
                  />
                )}
              </TouchableOpacity>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={infoPopupKey !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoPopupKey(null)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => setInfoPopupKey(null)}
        >
          <Pressable
            style={styles.infoPopupCard}
            onPress={(e) => e.stopPropagation()}
          >
            <ThemedText size="sm" style={{ lineHeight: 22, opacity: 0.9 }}>
              {infoPopupKey === "aiInsights"
                ? t("settings.aiInsights.description")
                : ""}
            </ThemedText>
          </Pressable>
        </Pressable>
      </Modal>
    </TabScreenContainer>
  );
}
