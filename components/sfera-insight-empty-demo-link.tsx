import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useTranslate } from "@/utils/languages/use-translate";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { memo, useCallback } from "react";
import { Platform } from "react-native";

/** Inline "or try our demo" link that navigates to Settings. */
export const SferaInsightEmptyDemoLink = memo(function SferaInsightEmptyDemoLink() {
  const t = useTranslate();
  const accent = useThemeColor({}, "primary");

  const openSettings = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    router.push("/(tabs)/settings");
  }, []);

  return (
    <ThemedText
      style={{
        marginTop: 6,
        textAlign: "center",
        fontSize: 12,
        lineHeight: 18,
        paddingHorizontal: 6,
      }}
      emphasis="medium"
      weight="normal"
    >
      {t("sferaInsight.emptyStateDemo.beforeLink")}
      <ThemedText
        accessibilityRole="link"
        accessibilityHint={t("sferaInsight.emptyStateDemo.a11yHint")}
        weight="semibold"
        emphasis="medium"
        onPress={openSettings}
        style={{
          fontSize: 12,
          lineHeight: 18,
          color: accent,
          textDecorationLine: "underline",
        }}
      >
        {t("sferaInsight.emptyStateDemo.linkText")}
      </ThemedText>
    </ThemedText>
  );
});
