import type { IdealizedMemory, LifeSphere } from "@/utils/JourneyProvider";

export type MomentInsightKind = "sunny" | "cloudy" | "lessons";

export function parseMomentInsightKind(
  raw: string | undefined,
): MomentInsightKind | null {
  if (raw === "sunny" || raw === "cloudy" || raw === "lessons") return raw;
  return null;
}

export function parseLifeSphereParam(raw: string | undefined): LifeSphere | null {
  if (
    raw === "relationships" ||
    raw === "career" ||
    raw === "family" ||
    raw === "friends" ||
    raw === "hobbies"
  ) {
    return raw;
  }
  return null;
}

export function countMetricInMemory(
  memory: IdealizedMemory,
  kind: MomentInsightKind,
): number {
  switch (kind) {
    case "sunny":
      return memory.goodFacts?.length ?? 0;
    case "cloudy":
      return memory.hardTruths?.length ?? 0;
    case "lessons":
      return memory.lessonsLearned?.length ?? 0;
  }
}

export function getMemoriesForEntityInsight(
  sphere: LifeSphere,
  entityId: string,
  getIdealizedMemoriesByProfileId: (id: string) => IdealizedMemory[],
  getIdealizedMemoriesByEntityId: (
    id: string,
    s: LifeSphere,
  ) => IdealizedMemory[],
): IdealizedMemory[] {
  return sphere === "relationships"
    ? getIdealizedMemoriesByProfileId(entityId)
    : getIdealizedMemoriesByEntityId(entityId, sphere);
}
