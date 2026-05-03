import type { LifeSphere } from "@/utils/JourneyProvider";

/** Translation keys used when an insight card has zero entities on a sphere */
export type SferaInsightEmptyEntitiesTranslationKey =
  | "sferaInsight.emptyEntities.relationships"
  | "sferaInsight.emptyEntities.career"
  | "sferaInsight.emptyEntities.family"
  | "sferaInsight.emptyEntities.friends"
  | "sferaInsight.emptyEntities.hobbies";

const KEYS: Record<LifeSphere, SferaInsightEmptyEntitiesTranslationKey> = {
  relationships: "sferaInsight.emptyEntities.relationships",
  career: "sferaInsight.emptyEntities.career",
  family: "sferaInsight.emptyEntities.family",
  friends: "sferaInsight.emptyEntities.friends",
  hobbies: "sferaInsight.emptyEntities.hobbies",
};

export function sferaInsightEmptyEntitiesTranslationKey(
  sphere: LifeSphere,
): SferaInsightEmptyEntitiesTranslationKey {
  return KEYS[sphere];
}

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
