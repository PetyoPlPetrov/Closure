/**
 * Onboarding storage - track completion, walkthrough trigger, and cached AI response
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AIOnboardingResponse } from "./ai-service";

const ONBOARDING_POST_ENTITY_PENDING_KEY = "@sferas:onboarding_post_entity_pending";
const ONBOARDING_POST_ENTITY_STATE_KEY = "@sferas:onboarding_post_entity_state";

/** After story entities: first collect min objects per sphere, then sequential memory wizard. */
export type PostEntityWizardPhase = "entities" | "memoryPick" | "memory";

export type OnboardingPostEntityState = {
  /** Legacy post-entity steps; retained for persisted JSON compatibility. */
  mandatoryFillComplete: boolean;
  selectionSubmitted: boolean;
  entityBlurbs: Record<string, string>;
  selectedEntityIds: string[];
  /** Step within the memory phase (per-entity AI memories). */
  wizardStepIndex: number;
  /** IDs for which onboarding memory wizard AI save succeeded (survives resume). */
  wizardAiMemoryCommittedIds?: string[];
  /** `entities` = grow-Sferas list; `memoryPick` = choose ≤5 targets when user has many; `memory` = OnboardingMemoryWizardStep. */
  postEntityWizardPhase?: PostEntityWizardPhase;
};

/** Post-onboarding AI tab spotlight: dismissed once user reaches this many memories. */
export const POST_ONBOARDING_AI_SPOTLIGHT_MAX_MEMORIES = 6;

const ONBOARDING_COMPLETED_KEY = "@sferas:onboarding_completed";
const SHOW_WALKTHROUGH_AFTER_ONBOARDING_KEY = "@sferas:show_walkthrough_after_onboarding";
const CACHED_ONBOARDING_RESPONSE_KEY = "@sferas:cached_onboarding_response";
const SHOW_POST_ONBOARDING_AI_WELCOME_KEY = "@sferas:show_post_onboarding_ai_welcome";
let postOnboardingAIWelcomeDismissedThisSession = false;
type GuideRecheckAfterWelcomeDismissListener = () => void;
const guideRecheckAfterWelcomeDismissListeners = new Set<
  GuideRecheckAfterWelcomeDismissListener
>();

export async function getOnboardingCompleted(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
    return value === "true";
  } catch {
    return false;
  }
}

export async function setOnboardingCompleted(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, value ? "true" : "false");
  } catch {
    // ignore
  }
}

export async function getShowWalkthroughAfterOnboarding(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(SHOW_WALKTHROUGH_AFTER_ONBOARDING_KEY);
    return value === "true";
  } catch {
    return false;
  }
}

export async function setShowWalkthroughAfterOnboarding(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(SHOW_WALKTHROUGH_AFTER_ONBOARDING_KEY, value ? "true" : "false");
  } catch {
    // ignore
  }
}

export async function getShowPostOnboardingAIWelcome(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(SHOW_POST_ONBOARDING_AI_WELCOME_KEY);
    return value === "true";
  } catch {
    return false;
  }
}

export async function setShowPostOnboardingAIWelcome(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(SHOW_POST_ONBOARDING_AI_WELCOME_KEY, value ? "true" : "false");
  } catch {
    // ignore
  }
}

export function getPostOnboardingAIWelcomeDismissedThisSession(): boolean {
  return postOnboardingAIWelcomeDismissedThisSession;
}

export function setPostOnboardingAIWelcomeDismissedThisSession(value: boolean): void {
  postOnboardingAIWelcomeDismissedThisSession = value;
}

export function subscribeGuideRecheckAfterWelcomeDismiss(
  listener: GuideRecheckAfterWelcomeDismissListener,
): () => void {
  guideRecheckAfterWelcomeDismissListeners.add(listener);
  return () => {
    guideRecheckAfterWelcomeDismissListeners.delete(listener);
  };
}

// ─── "Create memory from here" hint above AI button ───
type CreateMemoryHintListener = () => void;
const createMemoryHintListeners = new Set<CreateMemoryHintListener>();

export function subscribeCreateMemoryHint(
  listener: CreateMemoryHintListener,
): () => void {
  createMemoryHintListeners.add(listener);
  return () => {
    createMemoryHintListeners.delete(listener);
  };
}

export function emitCreateMemoryHint(): void {
  createMemoryHintListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore listener errors
    }
  });
}

export function emitGuideRecheckAfterWelcomeDismiss(delayMs = 1000): void {
  setTimeout(() => {
    guideRecheckAfterWelcomeDismissListeners.forEach((listener) => {
      try {
        listener();
      } catch {
        // ignore listener errors
      }
    });
  }, delayMs);
}

/** Cached AI onboarding response (step 3) – restored when user reopens app after accidental close */
export async function getCachedOnboardingResponse(): Promise<AIOnboardingResponse | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHED_ONBOARDING_RESPONSE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AIOnboardingResponse;
    if (!parsed?.entitiesBySphere || typeof parsed.entitiesBySphere !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setCachedOnboardingResponse(response: AIOnboardingResponse): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHED_ONBOARDING_RESPONSE_KEY, JSON.stringify(response));
  } catch {
    // ignore
  }
}

export async function clearCachedOnboardingResponse(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHED_ONBOARDING_RESPONSE_KEY);
  } catch {
    // ignore
  }
}

export async function getOnboardingPostEntityPending(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_POST_ENTITY_PENDING_KEY)) === "true";
  } catch {
    return false;
  }
}

export async function setOnboardingPostEntityPending(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(
      ONBOARDING_POST_ENTITY_PENDING_KEY,
      value ? "true" : "false",
    );
  } catch {
    // ignore
  }
}

export async function getOnboardingPostEntityState(): Promise<OnboardingPostEntityState | null> {
  try {
    const raw = await AsyncStorage.getItem(ONBOARDING_POST_ENTITY_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OnboardingPostEntityState>;
    if (typeof parsed !== "object" || parsed === null) return null;
    const wiz =
      typeof parsed.wizardStepIndex === "number" && Number.isFinite(parsed.wizardStepIndex)
        ? Math.max(0, Math.floor(parsed.wizardStepIndex))
        : 0;
    return {
      mandatoryFillComplete: parsed.mandatoryFillComplete === true,
      selectionSubmitted: parsed.selectionSubmitted === true,
      entityBlurbs:
        parsed.entityBlurbs && typeof parsed.entityBlurbs === "object" ? parsed.entityBlurbs : {},
      selectedEntityIds: Array.isArray(parsed.selectedEntityIds) ? parsed.selectedEntityIds : [],
      wizardStepIndex: wiz,
      wizardAiMemoryCommittedIds:
        parsed.wizardAiMemoryCommittedIds === undefined
          ? undefined
          : Array.isArray(parsed.wizardAiMemoryCommittedIds)
            ? parsed.wizardAiMemoryCommittedIds.filter(
                (x): x is string => typeof x === "string",
              )
            : undefined,
      postEntityWizardPhase:
        parsed.postEntityWizardPhase === "memory"
          ? "memory"
          : parsed.postEntityWizardPhase === "memoryPick"
            ? "memoryPick"
            : "entities",
    };
  } catch {
    return null;
  }
}

export async function setOnboardingPostEntityState(
  state: OnboardingPostEntityState,
): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_POST_ENTITY_STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export async function clearOnboardingPostEntityFlow(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      ONBOARDING_POST_ENTITY_PENDING_KEY,
      ONBOARDING_POST_ENTITY_STATE_KEY,
    ]);
  } catch {
    try {
      await AsyncStorage.removeItem(ONBOARDING_POST_ENTITY_PENDING_KEY);
      await AsyncStorage.removeItem(ONBOARDING_POST_ENTITY_STATE_KEY);
    } catch {
      // ignore
    }
  }
}
