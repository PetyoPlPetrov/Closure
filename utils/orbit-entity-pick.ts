import type { IdealizedMemory } from "@/utils/JourneyProvider";

/** Max avatars on the sfera entity ring (FocusedSferaView or FocusedEntitiesView). */
export const ORBIT_MAX_FLOATING_ENTITIES = 6;

/**
 * Sunny “moments” around an entity avatar = every goodFact line across all memories
 * (same as Sfera insight “most sunny” and floating sun icons).
 */
export function countSunnyMomentsForEntity(
  memories: IdealizedMemory[],
): number {
  return memories.reduce(
    (sum, mem) => sum + (mem.goodFacts?.length ?? 0),
    0,
  );
}

export function pickOrbitEntitiesBySunnyScore(
  entityIds: string[],
  imageUris: string[],
  entityNames: string[],
  memoriesPerEntity: IdealizedMemory[][],
  maxCount: number,
): {
  entityIds: string[];
  imageUris: string[];
  entityNames: string[];
  memoriesPerEntity: IdealizedMemory[][];
} {
  const n = entityIds.length;
  if (n <= maxCount) {
    return { entityIds, imageUris, entityNames, memoriesPerEntity };
  }

  const scored = entityIds.map((id, i) => ({
    id,
    imageUri: imageUris[i] ?? "",
    name: entityNames[i] ?? "",
    memories: memoriesPerEntity[i] ?? [],
    sunnyScore: countSunnyMomentsForEntity(memoriesPerEntity[i] ?? []),
  }));
  scored.sort((a, b) => {
    if (b.sunnyScore !== a.sunnyScore) return b.sunnyScore - a.sunnyScore;
    return a.id.localeCompare(b.id);
  });
  const picked = scored.slice(0, maxCount);
  return {
    entityIds: picked.map((p) => p.id),
    imageUris: picked.map((p) => p.imageUri),
    entityNames: picked.map((p) => p.name),
    memoriesPerEntity: picked.map((p) => p.memories),
  };
}

export function pickOrbitEntitiesBySunnyScoreForEntities<T extends { id: string }>(
  entities: T[],
  memoriesPerEntity: IdealizedMemory[][],
  maxCount: number,
): { entities: T[]; memoriesPerEntity: IdealizedMemory[][] } {
  if (entities.length <= maxCount) {
    return { entities, memoriesPerEntity };
  }
  const combined = entities.map((entity, i) => ({
    entity,
    memories: memoriesPerEntity[i] ?? [],
    sunnyScore: countSunnyMomentsForEntity(memoriesPerEntity[i] ?? []),
  }));
  combined.sort((a, b) => {
    if (b.sunnyScore !== a.sunnyScore) return b.sunnyScore - a.sunnyScore;
    return a.entity.id.localeCompare(b.entity.id);
  });
  const picked = combined.slice(0, maxCount);
  return {
    entities: picked.map((p) => p.entity),
    memoriesPerEntity: picked.map((p) => p.memories),
  };
}
