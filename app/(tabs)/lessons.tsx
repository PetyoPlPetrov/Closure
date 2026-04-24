import { UniverseLessonsScreen } from "@/components/universe-lessons-screen";
import { useFontScale } from "@/hooks/use-device-size";
import type { LifeSphere } from "@/utils/JourneyProvider";
import { useIsFocused } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LessonsTabScreen() {
  // Pauses `UniverseLessons` logic when another tab is focused. Tab also uses
  // `freezeOnBlur` in (tabs)/_layout so the screen tree is frozen off-tab.
  const isLessonsTabFocused = useIsFocused();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const fontScale = useFontScale();

  const tabBarOverlapHeight = useMemo(
    () =>
      Math.round(78 * fontScale) +
      Math.max(12, insets.bottom + 12 - 20 * fontScale),
    [fontScale, insets.bottom],
  );

  const nudgeKey = Array.isArray(params.nudgeKey)
    ? params.nudgeKey[0]
    : params.nudgeKey;
  const lessonId = Array.isArray(params.lessonId)
    ? params.lessonId[0]
    : params.lessonId;
  const memoryId = Array.isArray(params.memoryId)
    ? params.memoryId[0]
    : params.memoryId;
  const entityId = Array.isArray(params.entityId)
    ? params.entityId[0]
    : params.entityId;
  const sphereParam = Array.isArray(params.sphere) ? params.sphere[0] : params.sphere;
  const text = Array.isArray(params.text) ? params.text[0] : params.text;

  const initialTarget = nudgeKey
    ? {
        key: nudgeKey,
        lessonId,
        memoryId,
        entityId,
        sphere: sphereParam as LifeSphere | undefined,
        text,
      }
    : null;

  return (
    <UniverseLessonsScreen
      visible={isLessonsTabFocused}
      embeddedInTab
      tabBarOverlapHeight={tabBarOverlapHeight}
      onClose={() => router.replace("/(tabs)" as const)}
      initialTarget={initialTarget}
      onInitialTargetHandled={() => {}}
    />
  );
}
