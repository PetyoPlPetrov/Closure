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
import { useTranslate } from "@/utils/languages/use-translate";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
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

export default function GuideScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const fontScale = useFontScale();
  const { maxContentWidth } = useLargeDevice();
  const t = useTranslate();
  const [readSections, setReadSections] = useState<Set<string>>(new Set());
  // remindOnOpen = true means the modal will show on app open (dismissedForever = false)
  const [remindOnOpen, setRemindOnOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getReadSections().then(setReadSections);
      getGuideDismissedForever().then((dismissed) => setRemindOnOpen(!dismissed));
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
              : sectionId === "customizations"
                ? "guide.section.customizations.shortTitle"
                : "guide.section.account.shortTitle",
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
      >
        {SECTIONS.map((section) => {
          const isRead = readSections.has(section.id);
          return (
            <TouchableOpacity
              key={section.id}
              style={styles.dropdown}
              onPress={() => router.push(`/guide/${section.id}`)}
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
          <Switch
            value={remindOnOpen}
            onValueChange={async (value) => {
              if (value) {
                await clearGuideDismissedForever();
              } else {
                await setGuideDismissedForever();
              }
              setRemindOnOpen(value);
            }}
            trackColor={{ false: "rgba(150,150,150,0.35)", true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </ScrollView>
    </TabScreenContainer>
  );
}
