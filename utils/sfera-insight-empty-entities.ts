import type { LifeSphere } from "@/utils/JourneyProvider";

/** Prefix before tap target “here” → Recording Memories guide (include trailing space where needed). */
export type SferaInsightEmptyStateGuideBeforeLinkKey =
  | "sferaInsight.emptyStateGuide.beforeLink.relationships"
  | "sferaInsight.emptyStateGuide.beforeLink.career"
  | "sferaInsight.emptyStateGuide.beforeLink.family"
  | "sferaInsight.emptyStateGuide.beforeLink.friends"
  | "sferaInsight.emptyStateGuide.beforeLink.hobbies";

const BEFORE_LINK_KEYS: Record<LifeSphere, SferaInsightEmptyStateGuideBeforeLinkKey> = {
  relationships: "sferaInsight.emptyStateGuide.beforeLink.relationships",
  career: "sferaInsight.emptyStateGuide.beforeLink.career",
  family: "sferaInsight.emptyStateGuide.beforeLink.family",
  friends: "sferaInsight.emptyStateGuide.beforeLink.friends",
  hobbies: "sferaInsight.emptyStateGuide.beforeLink.hobbies",
};

export function sferaInsightEmptyStateGuideBeforeLinkKey(
  sphere: LifeSphere,
): SferaInsightEmptyStateGuideBeforeLinkKey {
  return BEFORE_LINK_KEYS[sphere];
}

/** Warm empty-entity copy — encourages user to add their first entity. */
export type SferaInsightEmptyEntitiesWarmKey =
  | "sferaInsight.emptyEntitiesWarm.relationships"
  | "sferaInsight.emptyEntitiesWarm.career"
  | "sferaInsight.emptyEntitiesWarm.family"
  | "sferaInsight.emptyEntitiesWarm.friends"
  | "sferaInsight.emptyEntitiesWarm.hobbies";

const WARM_KEYS: Record<LifeSphere, SferaInsightEmptyEntitiesWarmKey> = {
  relationships: "sferaInsight.emptyEntitiesWarm.relationships",
  career: "sferaInsight.emptyEntitiesWarm.career",
  family: "sferaInsight.emptyEntitiesWarm.family",
  friends: "sferaInsight.emptyEntitiesWarm.friends",
  hobbies: "sferaInsight.emptyEntitiesWarm.hobbies",
};

export function sferaInsightEmptyEntitiesWarmKey(
  sphere: LifeSphere,
): SferaInsightEmptyEntitiesWarmKey {
  return WARM_KEYS[sphere];
}

/** Sphere-specific reflection prompt when entities exist but have no memories. */
export type SferaInsightNoMemoriesReflectionKey =
  | "sferaInsight.noMemoriesReflection.relationships"
  | "sferaInsight.noMemoriesReflection.career"
  | "sferaInsight.noMemoriesReflection.family"
  | "sferaInsight.noMemoriesReflection.friends"
  | "sferaInsight.noMemoriesReflection.hobbies";

const NO_MEM_REFLECTION_KEYS: Record<LifeSphere, SferaInsightNoMemoriesReflectionKey> = {
  relationships: "sferaInsight.noMemoriesReflection.relationships",
  career: "sferaInsight.noMemoriesReflection.career",
  family: "sferaInsight.noMemoriesReflection.family",
  friends: "sferaInsight.noMemoriesReflection.friends",
  hobbies: "sferaInsight.noMemoriesReflection.hobbies",
};

export function sferaInsightNoMemoriesReflectionKey(
  sphere: LifeSphere,
): SferaInsightNoMemoriesReflectionKey {
  return NO_MEM_REFLECTION_KEYS[sphere];
}

/**
 * Returns a sphere+entity-specific reflection prompt key.
 * Rotates between 3 prompts based on a tick index to keep the card fresh.
 */
const REFLECTION_PROMPTS: Record<LifeSphere, [string, string, string]> = {
  family: [
    "sferaInsight.reflectionPrompt.family",
    "sferaInsight.reflectionPrompt2.family",
    "sferaInsight.reflectionPrompt3.family",
  ],
  friends: [
    "sferaInsight.reflectionPrompt.friends",
    "sferaInsight.reflectionPrompt2.friends",
    "sferaInsight.reflectionPrompt3.friends",
  ],
  relationships: [
    "sferaInsight.reflectionPrompt.relationships",
    "sferaInsight.reflectionPrompt2.relationships",
    "sferaInsight.reflectionPrompt3.relationships",
  ],
  career: [
    "sferaInsight.reflectionPrompt.career",
    "sferaInsight.reflectionPrompt2.career",
    "sferaInsight.reflectionPrompt3.career",
  ],
  hobbies: [
    "sferaInsight.reflectionPrompt.hobbies",
    "sferaInsight.reflectionPrompt2.hobbies",
    "sferaInsight.reflectionPrompt3.hobbies",
  ],
};

export function sferaInsightReflectionPromptKey(
  sphere: LifeSphere,
  tick: number,
): string {
  const prompts = REFLECTION_PROMPTS[sphere];
  return prompts[((tick % prompts.length) + prompts.length) % prompts.length];
}
