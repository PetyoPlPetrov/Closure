import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { useLargeDevice } from "@/hooks/use-large-device";
import { TabScreenContainer } from "@/library/components/tab-screen-container";
import {
  clearGuideDismissedForever,
  getGuideDismissedForever,
  getReadSections,
  setGuideDismissedForever,
} from "@/utils/guide-storage";
import { getGuideSectionsWithRemoteLinks } from "@/utils/guide-remote-links";
import { emitGuideRecheckAfterWelcomeDismiss } from "@/utils/onboarding-storage";
import { useTranslate } from "@/utils/languages/use-translate";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  DimensionValue,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SECTIONS } from "@/utils/guide-data";
import { logGuideNav } from "@/utils/guide-nav-debug";

export default function GuideScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const fontScale = useFontScale();
  const { maxContentWidth } = useLargeDevice();
  const t = useTranslate();
  const [readSections, setReadSections] = useState<Set<string>>(new Set());
  const [sections, setSections] = useState(SECTIONS);
  /** Same flag as `@sferas:guide_dismissed_forever` — OFF means user chose don't remind (modal or switch). */
  const [remindOnOpen, setRemindOnOpen] = useState(false);
  const [guidePrefsLoaded, setGuidePrefsLoaded] = useState(false);
  const [guideLinksLoading, setGuideLinksLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      logGuideNav("guide index focused");
      let cancelled = false;
      setGuidePrefsLoaded(false);
      setGuideLinksLoading(true);
      void Promise.all([
        getReadSections(),
        getGuideDismissedForever(),
        getGuideSectionsWithRemoteLinks(),
      ])
        .then(([read, dismissedForever, nextSections]) => {
          if (cancelled) return;
          setReadSections(read);
          setRemindOnOpen(!dismissedForever);
          setSections(nextSections);
          setGuidePrefsLoaded(true);
          setGuideLinksLoading(false);
          logGuideNav("guide index prefs loaded", {
            readSectionCount: read.size,
            dismissedForever,
          });
        })
        .catch(() => {
          if (cancelled) return;
          setGuideLinksLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const getSectionShortTitleKey = useCallback(
    (sectionId: (typeof SECTIONS)[number]["id"]) =>
      sectionId === "overview"
        ? "guide.section.overview.shortTitle"
        : sectionId === "recordingMemories"
          ? "guide.section.recordingMemories.shortTitle"
          : sectionId === "tools"
            ? "guide.section.tools.shortTitle"
            : sectionId === "notifications"
              ? "guide.section.notifications.shortTitle"
              : "guide.section.customizations.shortTitle",
    [],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create<{
        header: ViewStyle;
        headerButton: ViewStyle;
        headerTitle: TextStyle;
        content: ViewStyle;
        dropdown: ViewStyle;
        dropdownContent: ViewStyle;
        reminderRow: ViewStyle;
        blockingLoaderOverlay: ViewStyle;
      }>({
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
          gap: 12 * fontScale,
          maxWidth: maxContentWidth as DimensionValue,
          alignSelf: "center",
          width: "100%",
        },
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
        reminderRow: {
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
          marginTop: 4 * fontScale,
        },
        blockingLoaderOverlay: {
          ...StyleSheet.absoluteFillObject,
          zIndex: 999,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(5, 10, 18, 0.42)"
              : "rgba(248, 249, 252, 0.45)",
          alignItems: "center",
          justifyContent: "center",
        },
      }),
    [fontScale, colorScheme, maxContentWidth],
  );

  return (
    <TabScreenContainer>
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
          {t("guide.title")}
        </ThemedText>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {sections.map((section) => {
          const isRead = readSections.has(section.id);
          return (
            <TouchableOpacity
              key={section.id}
              style={styles.dropdown}
              onPress={() => {
                const href = {
                  pathname: "/guide/[sectionId]" as const,
                  params: { sectionId: section.id },
                };
                logGuideNav("list row onPress → router.push", {
                  sectionId: section.id,
                  href,
                });
                try {
                  router.push(href);
                  logGuideNav("router.push returned (no sync throw)");
                } catch (err) {
                  logGuideNav("router.push threw", {
                    error: err instanceof Error ? err.message : String(err),
                  });
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownContent}>
                <MaterialIcons
                  name={section.icon}
                  size={24 * fontScale}
                  color={colors.primary}
                />
                <ThemedText size="l" weight="medium">
                  {t(getSectionShortTitleKey(section.id))}
                </ThemedText>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 * fontScale }}>
                <MaterialIcons
                  name="check-circle"
                  size={20 * fontScale}
                  color={isRead ? "#4CAF50" : colorScheme === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}
                />
                <MaterialIcons
                  name="arrow-forward-ios"
                  size={16 * fontScale}
                  color={colors.text}
                />
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.reminderRow}>
          <View style={{ flex: 1, paddingRight: 12 * fontScale }}>
            <ThemedText size="m" weight="medium">
              {t("guide.remindOnOpen")}
            </ThemedText>
            <ThemedText size="s" style={{ opacity: 0.6, marginTop: 2 * fontScale }}>
              {t("guide.remindOnOpenDescription")}
            </ThemedText>
          </View>
          {guidePrefsLoaded ? (
            <Switch
              value={remindOnOpen}
              onValueChange={async (value) => {
                if (value) {
                  await clearGuideDismissedForever();
                  emitGuideRecheckAfterWelcomeDismiss(0);
                } else {
                  await setGuideDismissedForever();
                }
                setRemindOnOpen(value);
              }}
              trackColor={{ false: "rgba(150,150,150,0.35)", true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          ) : (
            <Switch
              value={remindOnOpen}
              disabled
              trackColor={{ false: "rgba(150,150,150,0.25)", true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          )}
        </View>
      </ScrollView>
      {guideLinksLoading ? (
        <View style={styles.blockingLoaderOverlay} pointerEvents="auto">
          <ActivityIndicator
            color={colors.primary}
            size="large"
            style={{ transform: [{ scale: 1.35 }] }}
          />
          <ThemedText
            size="xs"
            emphasis="medium"
            style={{ marginTop: 12 * fontScale, opacity: 0.9, fontSize: 14 * fontScale }}
          >
            {t("guide.introVideoLoading")}
          </ThemedText>
        </View>
      ) : null}
    </TabScreenContainer>
  );
}
