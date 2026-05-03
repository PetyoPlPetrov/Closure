import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { LifeSphere } from "@/utils/JourneyProvider";
import { useTranslate } from "@/utils/languages/use-translate";
import { sferaInsightEmptyStateGuideBeforeLinkKey } from "@/utils/sfera-insight-empty-entities";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { memo, useCallback } from "react";
import { Platform } from "react-native";

type Props = { sphere: LifeSphere; compact?: boolean };

/** Inline “learn how … **here**” link to Recording Memories (`recordingMemories`). */
export const SferaInsightEmptyGuideLink = memo(function SferaInsightEmptyGuideLink({
  sphere,
  compact,
}: Props) {
  const t = useTranslate();
  const accent = useThemeColor({}, "primary");
  const fontSize = compact ? 10 : 12;
  const lineHeight = compact ? 14 : 18;

  const openRecordingMemoriesGuide = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    router.push({
      pathname: "/guide/[sectionId]",
      params: { sectionId: "recordingMemories" },
    });
  }, []);

  return (
    <ThemedText
      style={{
        marginTop: compact ? 6 : 8,
        textAlign: "center",
        fontSize,
        lineHeight,
        paddingHorizontal: compact ? 2 : 6,
      }}
      emphasis="medium"
      weight="normal"
    >
      {t(sferaInsightEmptyStateGuideBeforeLinkKey(sphere))}
      <ThemedText
        accessibilityRole="link"
        accessibilityHint={t("sferaInsight.emptyStateGuide.a11yHint")}
        weight="semibold"
        emphasis="medium"
        onPress={openRecordingMemoriesGuide}
        style={{
          fontSize,
          lineHeight,
          color: accent,
          textDecorationLine: "underline",
        }}
      >
        {t("sferaInsight.emptyStateGuide.linkHere")}
      </ThemedText>
    </ThemedText>
  );
});
