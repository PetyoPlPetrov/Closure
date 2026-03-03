import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { useLargeDevice } from "@/hooks/use-large-device";
import { TabScreenContainer } from "@/library/components/tab-screen-container";
import { useTranslate } from "@/utils/languages/use-translate";
import { showPaywallForPlusAccess } from "@/utils/premium-access";
import {
  exportToZip,
  shareExportedFile,
} from "@/utils/sferas-backup";
import { useSubscription } from "@/utils/SubscriptionProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

/**
 * Backup screen: Export and Import options.
 * Import navigates to /backup/import so expo-document-picker is never loaded here
 * (avoids "Cannot find native module 'ExpoDocumentPicker'" when opening this screen in Expo Go).
 */
export default function BackupScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const fontScale = useFontScale();
  const { maxContentWidth } = useLargeDevice();
  const t = useTranslate();
  const { hasPlusEntitlement, hasAIEntitlement } = useSubscription();
  const hasBackupAccess = hasPlusEntitlement || hasAIEntitlement;
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (hasBackupAccess) return;
    let cancelled = false;
    showPaywallForPlusAccess().then((purchased) => {
      if (!cancelled && !purchased) router.back();
    });
    return () => {
      cancelled = true;
    };
  }, [hasBackupAccess]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16 * fontScale,
          paddingTop: 20 * fontScale,
          paddingBottom: 8 * fontScale,
          marginTop: 50,
        },
        headerButton: {
          width: 48 * fontScale,
          height: 48 * fontScale,
          alignItems: "center",
          justifyContent: "center",
        },
        headerTitle: {
          flex: 1,
          textAlign: "center",
        },
        scrollContent: {
          padding: 16 * fontScale,
          paddingBottom: 32 * fontScale,
          gap: 24 * fontScale,
          maxWidth: maxContentWidth,
          alignSelf: "center",
          width: "100%",
        },
        description: {
          marginBottom: 24 * fontScale,
          opacity: 0.9,
        },
        section: {
          gap: 16 * fontScale,
        },
        dropdown: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 16 * fontScale,
          borderRadius: 12 * fontScale,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.06)"
              : "rgba(0, 0, 0, 0.05)",
        },
        dropdownContent: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12 * fontScale,
        },
        dropdownText: {
          color: colors.text,
        },
      }),
    [colorScheme, colors, fontScale, maxContentWidth]
  );

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const result = await exportToZip();
      if (!result.success) {
        Alert.alert(t("settings.backup.exportError"), result.error);
        return;
      }
      const shareResult = await shareExportedFile(result.fileUri);
      if (shareResult.shared) {
        Alert.alert(t("common.ok"), t("settings.backup.exportSuccess"));
      } else if (shareResult.error) {
        Alert.alert(t("settings.backup.exportError"), shareResult.error);
      }
    } finally {
      setIsExporting(false);
    }
  }, [t]);

  const handleImport = useCallback(() => {
    router.push("/backup/import");
  }, []);

  return (
    <TabScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="arrow-back"
            size={24 * fontScale}
            color={colors.text}
          />
        </TouchableOpacity>
        <ThemedText size="xl" weight="bold" letterSpacing="s" style={styles.headerTitle}>
          {t("settings.backup.title")}
        </ThemedText>
        <View style={styles.headerButton} />
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText size="sm" weight="normal" style={styles.description}>
          {t("settings.backup.description")}
        </ThemedText>
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={handleExport}
            disabled={isExporting}
            activeOpacity={0.7}
          >
            <View style={styles.dropdownContent}>
              <MaterialIcons
                name="file-download"
                size={24 * fontScale}
                color={colors.primary}
              />
              <ThemedText size="l" weight="medium" style={styles.dropdownText}>
                {isExporting ? "Exporting…" : t("settings.backup.export")}
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
            onPress={handleImport}
            activeOpacity={0.7}
          >
            <View style={styles.dropdownContent}>
              <MaterialIcons
                name="file-upload"
                size={24 * fontScale}
                color={colors.primary}
              />
              <ThemedText size="l" weight="medium" style={styles.dropdownText}>
                {t("settings.backup.import")}
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
    </TabScreenContainer>
  );
}
