/**
 * Persists unsaved AI memory review state when the user closes AIModal without
 * saving or discarding, so reopening the modal restores the same UI.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AIMemoryResponse } from "@/utils/ai-service";
import type { LifeSphere } from "@/utils/JourneyProvider";

const STORAGE_KEY = "@sferas:ai_modal_results_draft";

export const AI_MODAL_RESULTS_DRAFT_VERSION = 1 as const;

export type AIModalSessionKeyInput = {
  goldenEventId?: string | null;
  onboardingSferaAI?: {
    sphere: LifeSphere;
    entityId: string;
    entityName: string;
    contextBlurb: string;
  } | null;
};

export function getAIModalSessionKey(input: AIModalSessionKeyInput): string {
  if (input.goldenEventId?.trim()) {
    return `golden:${input.goldenEventId.trim()}`;
  }
  if (input.onboardingSferaAI) {
    const o = input.onboardingSferaAI;
    return `onboarding:${o.sphere}:${o.entityId}`;
  }
  return "default";
}

export type AIModalSerializedMemoryItem = {
  id: string;
  type: "hardTruth" | "goodFact" | "lesson";
  text: string;
  notificationMessage?: string;
};

export type AIModalSerializedMemoryDraft = {
  id: string;
  title: string;
  items: AIModalSerializedMemoryItem[];
  sphere?: LifeSphere | null;
  entityId?: string | null;
  entityName?: string | null;
};

export type AIModalResultsDraftV1 = {
  version: typeof AI_MODAL_RESULTS_DRAFT_VERSION;
  timestamp: number;
  sessionKey: string;
  aiResponse: AIMemoryResponse;
  memoryDrafts: AIModalSerializedMemoryDraft[];
  expandedDraftIds: string[];
  /** @deprecated Per-memory fields on memoryDrafts; kept for restoring old saves. */
  selectedSphere?: LifeSphere | null;
  selectedEntityId?: string | null;
  selectedEntityName?: string | null;
  /** Which memory card had "add entity" open (if any). */
  addEntityDraftId?: string | null;
  inputText: string;
  showAddEntityForm?: boolean;
  showValidationErrors: boolean;
  newEntityName: string;
  newEntityDescription: string;
  newEntityRelationship: string;
  newEntityStartDateIso: string | null;
  newEntityEndDateIso: string | null;
  newEntityIsCurrent: boolean;
  newEntityImage: string | null;
  /** "Add to existing memory" mode fields */
  addToExistingMemory?: boolean;
  selectedExistingSphere?: LifeSphere | null;
  selectedExistingEntityId?: string | null;
  selectedExistingEntityName?: string | null;
  selectedExistingMemoryId?: string | null;
  selectedExistingMemoryTitle?: string | null;
};

export async function saveAIModalResultsDraft(
  draft: AIModalResultsDraftV1,
): Promise<void> {
  try {
    const json = JSON.stringify(draft);
    await AsyncStorage.setItem(STORAGE_KEY, json);
  } catch (e) {
    console.error("[ai-modal-results-draft] save failed:", e);
  }
}

export async function getAIModalResultsDraft(): Promise<AIModalResultsDraftV1 | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as AIModalResultsDraftV1;
    if (parsed?.version !== AI_MODAL_RESULTS_DRAFT_VERSION) {
      return null;
    }
    if (!parsed.sessionKey || !parsed.aiResponse) {
      return null;
    }
    return parsed;
  } catch (e) {
    console.error("[ai-modal-results-draft] read failed:", e);
    return null;
  }
}

export async function clearAIModalResultsDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("[ai-modal-results-draft] clear failed:", e);
  }
}
