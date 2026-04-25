import { SliderRow } from "@/components/slider-row";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { useLargeDevice } from "@/hooks/use-large-device";
import { TabScreenContainer } from "@/library/components/tab-screen-container";
import { useTranslate } from "@/utils/languages/use-translate";
import {
  MAX_COSMIC_BACKGROUND_OPACITY,
  MAX_ORBIT_DURATION_MS,
  MIN_COSMIC_BACKGROUND_OPACITY,
  MIN_ORBIT_DURATION_MS,
  useVisualSettings,
} from "@/utils/VisualSettingsProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View, type TextStyle, type ViewStyle } from "react-native";

export default function CosmicAppLookScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const fontScale = useFontScale();
  const { maxContentWidth } = useLargeDevice();
  const t = useTranslate();
  const {
    orbitDurationMs,
    setOrbitDurationMs,
    cosmicBackgroundOpacity,
    setCosmicBackgroundOpacity,
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
          flexGrow: 1,
          justifyContent: "flex-end",
          padding: 16 * fontScale,
          paddingBottom: 32 * fontScale,
          gap: 24 * fontScale,
          maxWidth: maxContentWidth as number,
          alignSelf: "center",
          width: "100%",
        },
        section: { gap: 16 * fontScale },
      }),
    [fontScale, maxContentWidth],
  );

  return (
    <TabScreenContainer>
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
            {t("settings.personalization.cosmicAppLookTitle")}
          </ThemedText>
          <View style={styles.headerButton} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <SliderRow
              label={t("settings.personalization.rotationSpeed")}
              value={MAX_ORBIT_DURATION_MS + MIN_ORBIT_DURATION_MS - orbitDurationMs}
              min={MIN_ORBIT_DURATION_MS}
              max={MAX_ORBIT_DURATION_MS}
              onValueChange={(v) => setOrbitDurationMs(MAX_ORBIT_DURATION_MS + MIN_ORBIT_DURATION_MS - v)}
              valueLabel={`${Math.round(orbitDurationMs / 1000)}s / full rotation`}
              colorScheme={colorScheme ?? "dark"}
              colors={colors}
              fontScale={fontScale}
            />
            <SliderRow
              label={t("settings.personalization.cosmicBackgroundOpacity")}
              value={cosmicBackgroundOpacity}
              min={MIN_COSMIC_BACKGROUND_OPACITY}
              max={MAX_COSMIC_BACKGROUND_OPACITY}
              onValueChange={setCosmicBackgroundOpacity}
              valueLabel={
                cosmicBackgroundOpacity === 0
                  ? t("settings.personalization.cosmicBackgroundOff")
                  : String(cosmicBackgroundOpacity)
              }
              colorScheme={colorScheme ?? "dark"}
              colors={colors}
              fontScale={fontScale}
            />
          </View>
        </ScrollView>
      </View>
    </TabScreenContainer>
  );
}
