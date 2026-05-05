import { getFreeEntityLimitPerSfera } from "@/utils/badge-rewards";
import { type LifeSphere } from "@/utils/JourneyProvider";
import { showPaywallForAnySubscriptionAccess } from "@/utils/premium-access";

export type IdealizedAiMemoryChip = {
  entityId?: string | null;
  sphere: LifeSphere;
  source?: string;
};

export type EntityMini = { id: string; name: string };

export function entityHasAiMemory(
  memories: IdealizedAiMemoryChip[],
  sphere: LifeSphere,
  entityId: string,
): boolean {
  return memories.some(
    (m) =>
      m.entityId === entityId &&
      m.sphere === sphere &&
      m.source === "ai",
  );
}

export function sphereEntityList(
  sphere: LifeSphere,
  profiles: { id: string; name: string }[],
  jobs: { id: string; name: string }[],
  friends: typeof profiles,
  familyMembers: typeof profiles,
  hobbies: typeof profiles,
): EntityMini[] {
  if (sphere === "relationships") return profiles;
  if (sphere === "career") return jobs;
  if (sphere === "friends") return friends;
  if (sphere === "family") return familyMembers;
  return hobbies;
}

export function sphereEntityCount(
  sphere: LifeSphere,
  profiles: unknown[],
  jobs: unknown[],
  friends: unknown[],
  familyMembers: unknown[],
  hobbies: unknown[],
): number {
  return sphereEntityList(
    sphere,
    profiles as { id: string; name: string }[],
    jobs as { id: string; name: string }[],
    friends as { id: string; name: string }[],
    familyMembers as { id: string; name: string }[],
    hobbies as { id: string; name: string }[],
  ).length;
}

export function listSphereMissingFirstAiMemory(
  memories: IdealizedAiMemoryChip[],
  sphere: LifeSphere,
  profiles: EntityMini[],
  jobs: EntityMini[],
  friends: EntityMini[],
  familyMembers: EntityMini[],
  hobbies: EntityMini[],
): EntityMini[] {
  const list = sphereEntityList(sphere, profiles, jobs, friends, familyMembers, hobbies);
  return list.filter((e) => !entityHasAiMemory(memories, sphere, e.id));
}

export async function guardFfEntityLimit(
  countInSphere: number,
  ensureSubscriptionResolved: () => Promise<{ hasEntityLimitEntitlement: boolean }>,
): Promise<boolean> {
  const freeEntityLimit = await getFreeEntityLimitPerSfera();
  if (countInSphere < freeEntityLimit) return true;
  const { hasEntityLimitEntitlement } = await ensureSubscriptionResolved();
  if (hasEntityLimitEntitlement) return true;
  return showPaywallForAnySubscriptionAccess();
}

/** Count tracked entities across these spheres that have ≥1 onboarding AI memory. */
export function countFfEntitiesWithAiMemory(
  memories: IdealizedAiMemoryChip[],
  profiles: { id: string }[],
  jobs: { id: string }[],
  friends: { id: string }[],
  familyMembers: { id: string }[],
  hobbies: { id: string }[],
): number {
  let n = 0;
  for (const p of profiles) {
    if (entityHasAiMemory(memories, "relationships", p.id)) n++;
  }
  for (const j of jobs) {
    if (entityHasAiMemory(memories, "career", j.id)) n++;
  }
  for (const f of friends) {
    if (entityHasAiMemory(memories, "friends", f.id)) n++;
  }
  for (const fm of familyMembers) {
    if (entityHasAiMemory(memories, "family", fm.id)) n++;
  }
  for (const h of hobbies) {
    if (entityHasAiMemory(memories, "hobbies", h.id)) n++;
  }
  return n;
}

/** Row check: sphere has ≥1 entity and every entity already has starter AI memory. */
export function isFfWizardSphereRowComplete(
  memories: IdealizedAiMemoryChip[],
  sphere: LifeSphere,
  profiles: EntityMini[],
  jobs: EntityMini[],
  friends: EntityMini[],
  familyMembers: EntityMini[],
  hobbies: EntityMini[],
): boolean {
  const cnt = sphereEntityCount(
    sphere,
    profiles,
    jobs,
    friends,
    familyMembers,
    hobbies,
  );
  if (cnt < 1) return false;
  return (
    listSphereMissingFirstAiMemory(
      memories,
      sphere,
      profiles,
      jobs,
      friends,
      familyMembers,
      hobbies,
    ).length === 0
  );
}
