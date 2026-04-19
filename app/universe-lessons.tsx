import { UniverseLessonsScreen } from "@/components/universe-lessons-screen";
import type { LifeSphere } from "@/utils/JourneyProvider";
import { router, useLocalSearchParams } from "expo-router";

export default function UniverseLessonsRoute() {
  const params = useLocalSearchParams();

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
      visible
      onClose={() => router.replace("/(tabs)")}
      initialTarget={initialTarget}
      onInitialTargetHandled={() => {}}
    />
  );
}
