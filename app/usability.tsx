import { ConstellationBackground } from "@/components/constellation-background";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { useLargeDevice } from "@/hooks/use-large-device";
import { TabScreenContainer } from "@/library/components/tab-screen-container";
import { useTranslate } from "@/utils/languages/use-translate";
import { useVisualSettings } from "@/utils/VisualSettingsProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useMemo } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function UsabilityScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const fontScale = useFontScale();
  const { maxContentWidth } = useLargeDevice();
  const t = useTranslate();
  const {
    constellationAmount,
    constellationOpacity,
    appUsabilityHints,
    setAppUsabilityHints,
    pulsingAnimations,
    setPulsingAnimations,
  } = useVisualSettings();

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
        toggleRow: ViewStyle;
        toggleTextWrap: ViewStyle;
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
        toggleRow: {
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
        toggleTextWrap: { flex: 1, paddingRight: 12 * fontScale },
      }),
    [colorScheme, fontScale, maxContentWidth],
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
            {t("settings.usability.title")}
          </ThemedText>
          <View style={styles.headerButton} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextWrap}>
                <ThemedText size="l" weight="medium" style={{ flex: 1 }}>
                  {t("settings.usability.showHints")}
                </ThemedText>
                <ThemedText
                  size="s"
                  style={{ opacity: 0.75, marginTop: 4 }}
                >
                  {t("settings.appUsabilityHints.description")}
                </ThemedText>
              </View>
              <Switch
                value={appUsabilityHints}
                onValueChange={setAppUsabilityHints}
                trackColor={{
                  false: "rgba(150,150,150,0.35)",
                  true: colors.primary,
                }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextWrap}>
                <ThemedText size="l" weight="medium" style={{ flex: 1 }}>
                  {t("settings.usability.stopPulsingAnimations")}
                </ThemedText>
                <ThemedText
                  size="s"
                  style={{ opacity: 0.75, marginTop: 4 }}
                >
                  {t("settings.usability.stopPulsingAnimationsDescription")}
                </ThemedText>
              </View>
              <Switch
                value={pulsingAnimations}
                onValueChange={setPulsingAnimations}
                trackColor={{
                  false: "rgba(150,150,150,0.35)",
                  true: colors.primary,
                }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </TabScreenContainer>
  );
}
