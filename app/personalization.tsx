import { ConstellationBackground } from "@/components/constellation-background";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { useLargeDevice } from "@/hooks/use-large-device";
import { TabScreenContainer } from "@/library/components/tab-screen-container";
import { useAIInsightsConsent } from "@/utils/AIInsightsConsentProvider";
import { useNotificationNudgePreference } from "@/utils/NotificationNudgePreferenceProvider";
import { useTranslate } from "@/utils/languages/use-translate";
import { router } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  MAX_CONSTELLATION_AMOUNT,
  MAX_CONSTELLATION_OPACITY,
  MAX_COSMIC_BACKGROUND_OPACITY,
  MAX_ORBIT_DURATION_MS,
  MIN_CONSTELLATION_AMOUNT,
  MIN_CONSTELLATION_OPACITY,
  MIN_COSMIC_BACKGROUND_OPACITY,
  MIN_ORBIT_DURATION_MS,
  useVisualSettings,
} from "@/utils/VisualSettingsProvider";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SLIDER_TRACK_HEIGHT = 6;
const SLIDER_THUMB_SIZE = 20;

function SliderRow({
  label,
  value,
  min,
  max,
  onValueChange,
  valueLabel,
  colorScheme,
  colors,
  fontScale,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onValueChange: (v: number) => void;
  valueLabel: string;
  colorScheme: "light" | "dark";
  colors: { text: string; primary: string };
  fontScale: number;
}) {
  const trackRef = useRef<View>(null);
  const fraction = (value - min) / (max - min) || 0;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          trackRef.current?.measureInWindow((x, _y, width) => {
            const touchX = evt.nativeEvent.pageX - x;
            const frac = Math.max(0, Math.min(1, touchX / width));
            const v = min + frac * (max - min);
            onValueChange(Math.round(v));
          });
        },
        onPanResponderMove: (evt) => {
          trackRef.current?.measureInWindow((x, _y, width) => {
            const touchX = evt.nativeEvent.pageX - x;
            const frac = Math.max(0, Math.min(1, touchX / width));
            const v = min + frac * (max - min);
            onValueChange(Math.round(v));
          });
        },
      }),
    [min, max, onValueChange],
  );

  return (
    <View style={{ marginBottom: 16 * fontScale }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <ThemedText style={{ fontSize: 15 * fontScale, opacity: 0.9 }}>
          {label}
        </ThemedText>
        <ThemedText style={{ fontSize: 14 * fontScale, opacity: 0.7 }}>
          {valueLabel}
        </ThemedText>
      </View>
      <View
        ref={trackRef}
        style={{ height: 32, justifyContent: "center" }}
        {...panResponder.panHandlers}
      >
        <View
          style={{
            height: SLIDER_TRACK_HEIGHT,
            borderRadius: SLIDER_TRACK_HEIGHT / 2,
            backgroundColor:
              colorScheme === "dark"
                ? "rgba(255,255,255,0.2)"
                : "rgba(0,0,0,0.15)",
          }}
        />
        <View
          style={{
            position: "absolute",
            left: `${fraction * 100}%`,
            marginLeft: -SLIDER_THUMB_SIZE / 2,
            width: SLIDER_THUMB_SIZE,
            height: SLIDER_THUMB_SIZE,
            borderRadius: SLIDER_THUMB_SIZE / 2,
            backgroundColor: colors.primary,
            top: (32 - SLIDER_THUMB_SIZE) / 2,
          }}
        />
      </View>
    </View>
  );
}

export default function PersonalizationScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const fontScale = useFontScale();
  const { maxContentWidth } = useLargeDevice();
  const t = useTranslate();
  const {
    orbitDurationMs,
    setOrbitDurationMs,
    constellationAmount,
    setConstellationAmount,
    constellationOpacity,
    setConstellationOpacity,
    cosmicBackgroundOpacity,
    setCosmicBackgroundOpacity,
  } = useVisualSettings();
  const aiConsent = useAIInsightsConsent();
  const notificationNudge = useNotificationNudgePreference();
  const [infoPopupKey, setInfoPopupKey] = useState<"aiInsights" | "notificationNudge" | null>(null);

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
          width: 40 * fontScale,
          height: 40 * fontScale,
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
          backgroundColor: colorScheme === "dark" ? "#1a1a1a" : "#ffffff",
          maxWidth: 360,
          alignSelf: "center",
        },
      }),
    [
      colorScheme,
      fontScale,
      maxContentWidth,
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
          {/* Look / Visual section: Moments Colors + sliders */}
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
                  color={colors.primary}
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

            <SliderRow
              label={t("settings.personalization.rotationSpeed")}
              value={orbitDurationMs}
              min={MIN_ORBIT_DURATION_MS}
              max={MAX_ORBIT_DURATION_MS}
              onValueChange={setOrbitDurationMs}
              valueLabel={`${Math.round(orbitDurationMs / 1000)}s`}
              colorScheme={colorScheme ?? "dark"}
              colors={colors}
              fontScale={fontScale}
            />
            <SliderRow
              label={t("settings.personalization.constellationAmount")}
              value={constellationAmount}
              min={MIN_CONSTELLATION_AMOUNT}
              max={MAX_CONSTELLATION_AMOUNT}
              onValueChange={setConstellationAmount}
              valueLabel={String(constellationAmount)}
              colorScheme={colorScheme ?? "dark"}
              colors={colors}
              fontScale={fontScale}
            />
            <SliderRow
              label={t("settings.personalization.constellationOpacity")}
              value={constellationOpacity}
              min={MIN_CONSTELLATION_OPACITY}
              max={MAX_CONSTELLATION_OPACITY}
              onValueChange={setConstellationOpacity}
              valueLabel={
                constellationOpacity === 0
                  ? t("settings.personalization.cosmicBackgroundOff")
                  : String(constellationOpacity)
              }
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

          {/* AI section */}
          <View style={styles.section}>
            <ThemedText size="l" weight="semibold" style={styles.sectionTitle}>
              {t("settings.aiInsights.title")}
            </ThemedText>

            <View style={styles.aiToggleRow}>
              <View style={styles.aiToggleTextWrap}>
                <View style={styles.aiToggleTitleRow}>
                  <ThemedText size="l" weight="medium" style={{ flex: 1 }}>
                    {t("settings.aiInsights.enable")}
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

            <View style={styles.aiToggleRow}>
              <View style={styles.aiToggleTextWrap}>
                <View style={styles.aiToggleTitleRow}>
                  <ThemedText size="l" weight="medium" style={{ flex: 1 }}>
                    {t("settings.notificationNudge.title")}
                  </ThemedText>
                  <TouchableOpacity
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.infoIconButton}
                    onPress={() => setInfoPopupKey("notificationNudge")}
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
                value={notificationNudge.enabled}
                onValueChange={(v) => void notificationNudge.setEnabled(v)}
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
                : infoPopupKey === "notificationNudge"
                  ? t("settings.notificationNudge.description")
                  : ""}
            </ThemedText>
          </Pressable>
        </Pressable>
      </Modal>
    </TabScreenContainer>
  );
}
