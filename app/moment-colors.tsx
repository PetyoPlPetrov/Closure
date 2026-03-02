import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { useLargeDevice } from "@/hooks/use-large-device";
import { TabScreenContainer } from "@/library/components/tab-screen-container";
import {
  useMomentColorsRaw,
  DEFAULT_MOMENT_COLORS,
  type MomentColors,
  type MomentColorSet,
} from "@/utils/MomentColorsProvider";
import { useSubscription } from "@/utils/SubscriptionProvider";
import { useTranslate } from "@/utils/languages/use-translate";
import { showPaywallForPlusAccess } from "@/utils/premium-access";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import ColorPicker, {
  Panel1,
  HueSlider,
  Preview as ColorPreview,
} from "reanimated-color-picker";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const RECENT_COLORS_KEY = "@sferas:recent_custom_colors";
const MAX_RECENT = 10;

interface RecentColors {
  background: string[];
  text: string[];
}

function useRecentColors() {
  const [recent, setRecent] = useState<RecentColors>({
    background: [],
    text: [],
  });

  useEffect(() => {
    AsyncStorage.getItem(RECENT_COLORS_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as RecentColors;
            setRecent({
              background: Array.isArray(parsed.background)
                ? parsed.background.slice(0, MAX_RECENT)
                : [],
              text: Array.isArray(parsed.text)
                ? parsed.text.slice(0, MAX_RECENT)
                : [],
            });
          } catch {
            /* corrupt */
          }
        }
      })
      .catch(() => {});
  }, []);

  const addRecent = useCallback(
    (field: "background" | "text", hex: string) => {
      const upper = hex.toUpperCase();
      setRecent((prev) => {
        const list = [
          upper,
          ...prev[field].filter((c) => c.toUpperCase() !== upper),
        ].slice(0, MAX_RECENT);
        const next = { ...prev, [field]: list };
        AsyncStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(next)).catch(
          () => {},
        );
        return next;
      });
    },
    [],
  );

  const removeRecent = useCallback(
    (field: "background" | "text", hex: string) => {
      const upper = hex.toUpperCase();
      setRecent((prev) => {
        const list = prev[field].filter((c) => c.toUpperCase() !== upper);
        const next = { ...prev, [field]: list };
        AsyncStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(next)).catch(
          () => {},
        );
        return next;
      });
    },
    [],
  );

  return { recent, addRecent, removeRecent };
}

function ColorPickerModal({
  visible,
  onClose,
  onConfirm,
  initialColor,
  title,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (hex: string) => void;
  initialColor: string;
  title: string;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const fontScale = useFontScale();
  const t = useTranslate();
  const selectedRef = useRef(initialColor);

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "center",
          alignItems: "center",
        }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            width: SCREEN_WIDTH * 0.85,
            backgroundColor:
              colorScheme === "dark" ? "#1E293B" : "#FFFFFF",
            borderRadius: 20,
            padding: 20 * fontScale,
            gap: 16 * fontScale,
          }}
        >
          <ThemedText size="l" weight="bold" style={{ textAlign: "center" }}>
            {title}
          </ThemedText>

          <ColorPicker
            style={{ gap: 14 * fontScale }}
            value={initialColor}
            onCompleteJS={({ hex }) => {
              selectedRef.current = hex;
            }}
          >
            <ColorPreview hideInitialColor />
            <Panel1 style={{ height: 160 * fontScale, borderRadius: 14 }} />
            <HueSlider style={{ borderRadius: 10 }} />
          </ColorPicker>

          <View
            style={{
              flexDirection: "row",
              gap: 10,
              marginTop: 4 * fontScale,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              style={{
                flex: 1,
                paddingVertical: 12 * fontScale,
                borderRadius: 12,
                alignItems: "center",
                backgroundColor:
                  colorScheme === "dark"
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.06)",
              }}
            >
              <ThemedText size="m" weight="medium">
                ✕
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                onConfirm(selectedRef.current);
                onClose();
              }}
              style={{
                flex: 2,
                paddingVertical: 12 * fontScale,
                borderRadius: 12,
                alignItems: "center",
                backgroundColor: colors.primary,
              }}
            >
              <ThemedText
                size="m"
                weight="semibold"
                style={{ color: "#FFFFFF" }}
              >
                {t("settings.momentColors.confirm")}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Sunny: joyful, warm memories — golden hour, sunshine, happiness
const SUNNY_BG_SUGGESTED = [
  "#FFD700", "#FFC107", "#FFB300", "#FF9800", "#FFEB3B", "#F9A825", "#FFA726", "#FFF176",
];
// Cloudy: reflective, difficult moments — overcast, contemplative, safe to process
const CLOUDY_BG_SUGGESTED = [
  "#2C3E50", "#37474F", "#455A64", "#546E7A", "#263238", "#3E4A5C", "#1A2332",
];
// Lesson: wisdom, growth, insight — clarity, “aha”, learning
const LESSON_BG_SUGGESTED = [
  "#FFD700", "#FFA000", "#64B5F6", "#81C784", "#CE93D8", "#4DB6AC", "#7986CB", "#F48FB1",
];

// Text suggestions tuned per moment so they read well and match the vibe
const SUNNY_TEXT_SUGGESTED = [
  "#000000", "#1A1A1A", "#2D2D2D", "#3E2723", "#1B5E20", "#333333",
];
const CLOUDY_TEXT_SUGGESTED = [
  "#FFFFFFE6", "#FFFFFF", "#E8E8E8", "#B0BEC5", "#CFD8DC", "#ECEFF1",
];
const LESSON_TEXT_SUGGESTED = [
  "#1A1A1A", "#000000", "#333333", "#37474F", "#4A148C", "#2D2D2D",
];

function getBgSuggestedForType(type: keyof MomentColors): string[] {
  if (type === "sunny") return SUNNY_BG_SUGGESTED;
  if (type === "cloudy") return CLOUDY_BG_SUGGESTED;
  return LESSON_BG_SUGGESTED;
}

function getTextSuggestedForType(type: keyof MomentColors): string[] {
  if (type === "sunny") return SUNNY_TEXT_SUGGESTED;
  if (type === "cloudy") return CLOUDY_TEXT_SUGGESTED;
  return LESSON_TEXT_SUGGESTED;
}

function mergeSwatches(suggested: string[], recent: string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const c of [...suggested, ...recent]) {
    const key = c.toUpperCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(c);
    }
  }
  return merged;
}

function MomentPreviewPopup({
  visible,
  onClose,
  type,
  bg,
  text,
  sampleText,
}: {
  visible: boolean;
  onClose: () => void;
  type: keyof MomentColors;
  bg: string;
  text: string;
  sampleText: string;
}) {
  const { isTablet } = useLargeDevice();
  const fontScale = useFontScale();
  const size = isTablet ? 220 : 170;

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "center",
          alignItems: "center",
        }}
        onPress={onClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          {type === "sunny" && (
            <View
              style={{
                width: size,
                height: size,
                shadowColor: bg,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 14,
                elevation: 12,
              }}
            >
              <Svg width={size} height={size} viewBox="0 0 160 160" preserveAspectRatio="xMidYMid meet">
                <Defs>
                  <RadialGradient id="previewSunGrad" cx="80" cy="80" rx="48" ry="48" fx="80" fy="80" gradientUnits="userSpaceOnUse">
                    <Stop offset="0%" stopColor={bg} stopOpacity="0.9" />
                    <Stop offset="60%" stopColor={bg} stopOpacity="1" />
                    <Stop offset="100%" stopColor={bg} stopOpacity="1" />
                  </RadialGradient>
                </Defs>
                {Array.from({ length: 12 }).map((_, i) => {
                  const angle = (i * 360) / 12;
                  const rad = (angle * Math.PI) / 180;
                  const cx = 80, cy = 80, ir = 48, or = 72, rw = 3;
                  const ix = cx + Math.cos(rad) * ir, iy = cy + Math.sin(rad) * ir;
                  const ox = cx + Math.cos(rad) * or, oy = cy + Math.sin(rad) * or;
                  const pa = rad + Math.PI / 2, hw = rw / 2;
                  return (
                    <Path
                      key={i}
                      d={`M ${ix} ${iy} L ${ox + Math.cos(pa) * hw} ${oy + Math.sin(pa) * hw} L ${ox + Math.cos(pa + Math.PI) * hw} ${oy + Math.sin(pa + Math.PI) * hw} Z`}
                      fill={bg}
                    />
                  );
                })}
                <Circle cx="80" cy="80" r="48" fill="url(#previewSunGrad)" />
              </Svg>
              <View style={{ position: "absolute", top: 0, left: 0, width: size, height: size, justifyContent: "center", alignItems: "center", paddingHorizontal: (size / 160) * 48 * 0.7 }}>
                <ThemedText style={{ color: text, fontSize: 13 * fontScale, textAlign: "center", fontWeight: "700" }} numberOfLines={3}>
                  {sampleText}
                </ThemedText>
              </View>
            </View>
          )}

          {type === "cloudy" && (
            <View
              style={{
                width: size * 1.6,
                height: size * 0.55,
                shadowColor: bg,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.7,
                shadowRadius: 10,
                elevation: 8,
              }}
            >
              <Svg width={size * 1.6} height={size * 0.55} viewBox="0 0 320 100" preserveAspectRatio="xMidYMid meet">
                <Defs>
                  <SvgLinearGradient id="previewCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor={bg} stopOpacity="0.95" />
                    <Stop offset="50%" stopColor={bg} stopOpacity="0.98" />
                    <Stop offset="100%" stopColor={bg} stopOpacity="1" />
                  </SvgLinearGradient>
                </Defs>
                <Path
                  d="M50,50 Q40,35 50,25 Q60,15 75,20 Q85,10 100,20 Q115,10 130,20 Q145,10 160,20 Q175,10 190,20 Q205,10 220,20 Q235,10 250,20 Q265,15 270,25 Q280,35 270,50 Q280,65 270,75 Q260,85 245,80 Q230,90 220,85 Q205,95 190,85 Q175,95 160,85 Q145,95 130,85 Q115,95 100,85 Q85,90 75,80 Q60,85 50,75 Q40,65 50,50 Z"
                  fill="url(#previewCloudGrad)"
                  stroke="rgba(0,0,0,0.7)"
                  strokeWidth={1.5}
                />
              </Svg>
              <View style={{ position: "absolute", top: 0, left: 0, width: size * 1.6, height: size * 0.55, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}>
                <ThemedText style={{ color: text, fontSize: 13 * fontScale, textAlign: "center", fontWeight: "500" }} numberOfLines={3}>
                  {sampleText}
                </ThemedText>
              </View>
            </View>
          )}

          {type === "lesson" && (
            <View
              style={{
                width: size,
                height: size,
                shadowColor: bg,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.7,
                shadowRadius: 14,
                elevation: 10,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <MaterialIcons name="lightbulb" size={size * 0.35} color={bg} />
              <View style={{ paddingHorizontal: 20, marginTop: 4 }}>
                <ThemedText style={{ color: text, fontSize: 13 * fontScale, textAlign: "center", fontWeight: "600" }} numberOfLines={3}>
                  {sampleText}
                </ThemedText>
              </View>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function MomentColorsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const fontScale = useFontScale();
  const t = useTranslate();
  const { momentColors, setMomentColor, resetToDefaults } = useMomentColorsRaw();
  const { recent, addRecent, removeRecent } = useRecentColors();
  const { isSubscribed } = useSubscription(); // true for Sfera Plus OR Sfera AI — both can save colors

  // Draft state per section — initially matches saved colors
  const [draftColors, setDraftColors] = useState<MomentColors>(() => ({
    sunny: { ...momentColors.sunny },
    cloudy: { ...momentColors.cloudy },
    lesson: { ...momentColors.lesson },
  }));

  // Track which sections have unsaved changes
  const isDirty = useCallback(
    (key: keyof MomentColors) =>
      draftColors[key].background !== momentColors[key].background ||
      draftColors[key].text !== momentColors[key].text,
    [draftColors, momentColors],
  );

  // Track saved flash per section
  const [savedFlash, setSavedFlash] = useState<Record<string, boolean>>({});

  // Color picker modal state
  const [pickerTarget, setPickerTarget] = useState<{
    type: keyof MomentColors;
    field: "background" | "text";
  } | null>(null);

  const setDraft = useCallback(
    (type: keyof MomentColors, field: keyof MomentColorSet, value: string) => {
      const normalized = value.toUpperCase();
      setDraftColors((prev) => ({
        ...prev,
        [type]: { ...prev[type], [field]: normalized },
      }));
    },
    [],
  );

  const handleSave = useCallback(
    async (key: keyof MomentColors) => {
      // Show paywall only if no subscription (Plus or AI both allow saving)
      if (!isSubscribed) {
        const purchased = await showPaywallForPlusAccess();
        if (!purchased) return;
      }
      setMomentColor(key, "background", draftColors[key].background);
      setMomentColor(key, "text", draftColors[key].text);
      setSavedFlash((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => setSavedFlash((prev) => ({ ...prev, [key]: false })), 1500);
    },
    [draftColors, setMomentColor, isSubscribed],
  );

  const isNonDefault = useCallback(
    (key: keyof MomentColors) =>
      draftColors[key].background !== DEFAULT_MOMENT_COLORS[key].background ||
      draftColors[key].text !== DEFAULT_MOMENT_COLORS[key].text,
    [draftColors],
  );

  const handleResetSection = useCallback(
    (key: keyof MomentColors) => {
      const defaults = DEFAULT_MOMENT_COLORS[key];
      setMomentColor(key, "background", defaults.background);
      setMomentColor(key, "text", defaults.text);
      setDraftColors((prev) => ({
        ...prev,
        [key]: { ...defaults },
      }));
    },
    [setMomentColor],
  );

  // Preview popup state
  const [previewType, setPreviewType] = useState<keyof MomentColors | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        header: {
          flexDirection: "row" as const,
          alignItems: "center" as const,
          paddingHorizontal: 16 * fontScale,
          paddingTop: 50,
          paddingBottom: 12 * fontScale,
          gap: 12,
        } satisfies ViewStyle,
        headerButton: {
          width: 40 * fontScale,
          height: 40 * fontScale,
          justifyContent: "center" as const,
          alignItems: "center" as const,
        } satisfies ViewStyle,
        headerTitle: {
          flex: 1,
          textAlign: "center" as const,
        } satisfies TextStyle,
        content: {
          paddingHorizontal: 20 * fontScale,
          paddingBottom: 40 * fontScale,
          gap: 28 * fontScale,
        } satisfies ViewStyle,
        momentSection: {
          gap: 10 * fontScale,
        } satisfies ViewStyle,
        momentHeader: {
          flexDirection: "row" as const,
          alignItems: "center" as const,
          gap: 10,
        } satisfies ViewStyle,
        colorLabel: {
          opacity: 0.55,
          marginTop: 4 * fontScale,
        } satisfies TextStyle,
        swatchRow: {
          flexDirection: "row" as const,
          flexWrap: "wrap" as const,
          gap: 10,
          marginTop: 2,
        } satisfies ViewStyle,
        actionRow: {
          flexDirection: "row" as const,
          gap: 10,
          marginTop: 6 * fontScale,
        } satisfies ViewStyle,
        resetButton: {
          flexDirection: "row" as const,
          alignItems: "center" as const,
          justifyContent: "center" as const,
          gap: 6,
          paddingVertical: 12 * fontScale,
          borderRadius: 12,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255,255,255,0.08)"
              : "rgba(0,0,0,0.06)",
          marginTop: 8 * fontScale,
        } satisfies ViewStyle,
      }),
    [fontScale, colorScheme],
  );

  const momentSections = [
    { key: "sunny" as const, label: t("settings.momentColors.sunny"), icon: "wb-sunny" as const, sample: t("settings.momentColors.sampleSunny") },
    { key: "cloudy" as const, label: t("settings.momentColors.cloudy"), icon: "cloud-queue" as const, sample: t("settings.momentColors.sampleCloudy") },
    { key: "lesson" as const, label: t("settings.momentColors.lesson"), icon: "emoji-objects" as const, sample: t("settings.momentColors.sampleLesson") },
  ] as const;

  const renderSwatch = (
    swatchKey: string,
    color: string,
    isSelected: boolean,
    onPress: () => void,
    onRemove?: () => void,
  ) => (
    <View
      key={swatchKey}
      style={{
        width: 38 * fontScale,
        height: 38 * fontScale,
        position: "relative",
      }}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={{
          width: 38 * fontScale,
          height: 38 * fontScale,
          borderRadius: 19 * fontScale,
          backgroundColor: color,
          borderWidth: isSelected ? 3 : 1,
          borderColor: isSelected
            ? colors.primary
            : colorScheme === "dark"
              ? "rgba(255,255,255,0.2)"
              : "rgba(0,0,0,0.15)",
        }}
      />
      {onRemove != null && (
        <TouchableOpacity
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          onPress={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          activeOpacity={0.8}
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            width: 20 * fontScale,
            height: 20 * fontScale,
            borderRadius: 10 * fontScale,
            backgroundColor: colorScheme === "dark" ? "#1E293B" : "#FFF",
            borderWidth: 1,
            borderColor: colors.error || "#EF5350",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <MaterialIcons
            name="close"
            size={12 * fontScale}
            color={colors.error || "#EF5350"}
          />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <TabScreenContainer>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={26 * fontScale} color={colors.text} />
          </TouchableOpacity>

          <ThemedText size="l" weight="bold" style={styles.headerTitle}>
            {t("settings.momentColors.title")}
          </ThemedText>

          <View style={styles.headerButton} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {momentSections.map(({ key, label, icon, sample }) => (
            <View key={key} style={styles.momentSection}>
              {/* Type header */}
              <View style={styles.momentHeader}>
                <MaterialIcons
                  name={icon}
                  size={22 * fontScale}
                  color={draftColors[key].background}
                />
                <ThemedText size="l" weight="semibold">{label}</ThemedText>
              </View>

              {/* Background swatches */}
              <ThemedText size="sm" style={styles.colorLabel}>
                {t("settings.momentColors.background")}
              </ThemedText>
              <View style={styles.swatchRow}>
                {mergeSwatches(getBgSuggestedForType(key), recent.background).map((c) =>
                  renderSwatch(
                    `bg-${c}`,
                    c,
                    draftColors[key].background === c,
                    () => setDraft(key, "background", c),
                    recent.background.some((r) => r.toUpperCase() === c.toUpperCase())
                      ? () => removeRecent("background", c)
                      : undefined,
                  ),
                )}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setPickerTarget({ type: key, field: "background" })}
                  style={{
                    width: 38 * fontScale,
                    height: 38 * fontScale,
                    borderRadius: 19 * fontScale,
                    borderWidth: 1.5,
                    borderColor: colorScheme === "dark" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)",
                    borderStyle: "dashed",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <MaterialIcons name="add" size={20 * fontScale} color={colors.text} style={{ opacity: 0.5 }} />
                </TouchableOpacity>
              </View>

              {/* Text swatches */}
              <ThemedText size="sm" style={styles.colorLabel}>
                {t("settings.momentColors.text")}
              </ThemedText>
              <View style={styles.swatchRow}>
                {mergeSwatches(getTextSuggestedForType(key), recent.text).map((c) =>
                  renderSwatch(
                    `txt-${c}`,
                    c,
                    draftColors[key].text === c,
                    () => setDraft(key, "text", c),
                    recent.text.some((r) => r.toUpperCase() === c.toUpperCase())
                      ? () => removeRecent("text", c)
                      : undefined,
                  ),
                )}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setPickerTarget({ type: key, field: "text" })}
                  style={{
                    width: 38 * fontScale,
                    height: 38 * fontScale,
                    borderRadius: 19 * fontScale,
                    borderWidth: 1.5,
                    borderColor: colorScheme === "dark" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)",
                    borderStyle: "dashed",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <MaterialIcons name="add" size={20 * fontScale} color={colors.text} style={{ opacity: 0.5 }} />
                </TouchableOpacity>
              </View>

              {/* Preview + Save row */}
              <View style={styles.actionRow}>
                {/* Preview button */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setPreviewType(key)}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    paddingVertical: 10 * fontScale,
                    borderRadius: 10,
                    backgroundColor: draftColors[key].background,
                  }}
                >
                  <MaterialIcons name="visibility" size={16 * fontScale} color={draftColors[key].text} />
                  <ThemedText size="sm" weight="bold" style={{ color: draftColors[key].text }}>
                    {t("settings.momentColors.preview")}
                  </ThemedText>
                </TouchableOpacity>

                {/* Save button */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleSave(key)}
                  disabled={!isDirty(key)}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    paddingVertical: 10 * fontScale,
                    borderRadius: 10,
                    backgroundColor: savedFlash[key]
                      ? "rgba(76, 175, 80, 0.25)"
                      : isDirty(key)
                        ? colors.primary
                        : colorScheme === "dark"
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.04)",
                  }}
                >
                  <MaterialIcons
                    name={savedFlash[key] ? "check" : "save"}
                    size={18 * fontScale}
                    color={
                      savedFlash[key]
                        ? "#4CAF50"
                        : isDirty(key)
                          ? "#FFFFFF"
                          : colors.text
                    }
                    style={{ opacity: isDirty(key) || savedFlash[key] ? 1 : 0.35 }}
                  />
                  <ThemedText
                    size="sm"
                    weight={isDirty(key) ? "semibold" : "regular"}
                    style={{
                      color: savedFlash[key]
                        ? "#4CAF50"
                        : isDirty(key)
                          ? "#FFFFFF"
                          : colors.text,
                      opacity: isDirty(key) || savedFlash[key] ? 1 : 0.35,
                    }}
                  >
                    {savedFlash[key]
                      ? t("settings.momentColors.saved")
                      : t("settings.momentColors.save")}
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {/* Reset to defaults */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleResetSection(key)}
                disabled={!isNonDefault(key)}
                style={[
                  styles.resetButton,
                  { opacity: isNonDefault(key) ? 1 : 0.3 },
                ]}
              >
                <MaterialIcons
                  name="refresh"
                  size={16 * fontScale}
                  color={colors.text}
                />
                <ThemedText size="xs">
                  {t("settings.momentColors.reset")}
                </ThemedText>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Preview popup — shows a real moment shape with draft colors */}
      {previewType && (
        <MomentPreviewPopup
          visible={previewType !== null}
          onClose={() => setPreviewType(null)}
          type={previewType}
          bg={draftColors[previewType].background}
          text={draftColors[previewType].text}
          sampleText={
            momentSections.find((s) => s.key === previewType)?.sample ?? ""
          }
        />
      )}

      {/* Custom color picker modal */}
      <ColorPickerModal
        visible={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        initialColor={
          pickerTarget
            ? draftColors[pickerTarget.type][pickerTarget.field]
            : "#FFFFFF"
        }
        title={t("settings.momentColors.pickColor")}
        onConfirm={(hex) => {
          if (pickerTarget) {
            setDraft(pickerTarget.type, pickerTarget.field, hex);
            addRecent(pickerTarget.field, hex);
          }
        }}
      />
    </TabScreenContainer>
  );
}
