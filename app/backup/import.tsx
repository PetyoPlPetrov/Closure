import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { TabScreenContainer } from "@/library/components/tab-screen-container";
import { useJourney } from "@/utils/JourneyProvider";
import { useTranslate } from "@/utils/languages/use-translate";
import { BACKUP_NEEDS_DEV_BUILD } from "@/utils/backup-pick-file";
import { importFromZip } from "@/utils/sferas-backup";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

/**
 * Import backup screen. Loads expo-document-picker only when this screen mounts.
 * In Expo Go we show an alert and go back without loading the picker.
 */
export default function BackupImportScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const fontScale = useFontScale();
  const t = useTranslate();
  const {
    reloadProfiles,
    reloadJobs,
    reloadFamilyMembers,
    reloadFriends,
    reloadHobbies,
    reloadIdealizedMemories,
  } = useJourney();
  const [isImporting, setIsImporting] = useState(false);
  const didRun = useRef(false);

  const isExpoGo = Constants.appOwnership === "expo";

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    if (isExpoGo) {
      Alert.alert(
        t("settings.backup.importError"),
        "Import requires a development build. Run: npx expo prebuild && npx expo run:ios (or run:android), then try again.",
        [{ text: t("common.ok"), onPress: () => router.back() }]
      );
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { pickBackupFileUri } = await import("../../utils/backup-pick-file");
        const uri = await pickBackupFileUri();
        if (cancelled || !uri) {
          router.back();
          return;
        }
        setIsImporting(true);
        const result = await importFromZip(uri);
        if (cancelled) return;
        if (!result.success) {
          Alert.alert(t("settings.backup.importError"), result.error, [
            { text: t("common.ok"), onPress: () => router.back() },
          ]);
          return;
        }
        await Promise.all([
          reloadProfiles(),
          reloadJobs(),
          reloadFamilyMembers(),
          reloadFriends(),
          reloadHobbies(),
          reloadIdealizedMemories(),
        ]);
        Alert.alert(t("common.ok"), t("settings.backup.importSuccess"), [
          { text: t("common.ok"), onPress: () => router.back() },
        ]);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        const needsDevBuild =
          msg === BACKUP_NEEDS_DEV_BUILD ||
          msg.includes("ExpoDocumentPicker") ||
          msg.includes("native module");
        if (needsDevBuild) {
          Alert.alert(
            t("settings.backup.importError"),
            "Import requires a development build. Run: npx expo prebuild && npx expo run:ios (or run:android), then try again.",
            [{ text: t("common.ok"), onPress: () => router.back() }]
          );
        } else {
          Alert.alert(t("settings.backup.importError"), msg, [
            { text: t("common.ok"), onPress: () => router.back() },
          ]);
        }
      } finally {
        if (!cancelled) setIsImporting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isExpoGo,
    t,
    reloadProfiles,
    reloadJobs,
    reloadFamilyMembers,
    reloadFriends,
    reloadHobbies,
    reloadIdealizedMemories,
  ]);

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  return (
    <TabScreenContainer>
      <View style={[styles.header, { paddingHorizontal: 16 * fontScale, paddingTop: 20 * fontScale, marginTop: 50 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7} hitSlop={12}>
          <MaterialIcons name="arrow-back" size={24 * fontScale} color={colors.text} />
        </TouchableOpacity>
        <ThemedText size="xl" weight="bold" style={styles.title}>
          {t("settings.backup.import")}
        </ThemedText>
        <View style={styles.backBtn} />
      </View>
      <View style={styles.center}>
        {isImporting ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : isExpoGo ? (
          <ThemedText size="m" style={{ color: colors.text, opacity: 0.8 }}>
            {t("common.ok")}
          </ThemedText>
        ) : null}
      </View>
    </TabScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
  },
  backBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
