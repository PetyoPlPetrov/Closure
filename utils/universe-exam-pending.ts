/**
 * Persists an in-progress Lesson Check (universe exam) so closing without submitting
 * does not trigger a new AI question or consume another free daily slot on reopen.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LifeSphere } from "@/utils/JourneyProvider";

const KEY = "@sferas:universe_exam_pending";

export type PendingUniverseExamPayload = {
  card: {
    id: string;
    text: string;
    memoryTitle: string;
    memoryImageUri?: string;
    sphere: LifeSphere;
    memoryId?: string;
    entityId?: string;
  };
  question: string;
  answerInput: string;
};

export async function hasPendingUniverseExam(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<PendingUniverseExamPayload>;
    return (
      typeof parsed?.question === "string" &&
      parsed.question.trim().length > 0 &&
      typeof parsed?.card?.id === "string"
    );
  } catch {
    return false;
  }
}

/**
 * Returns restored exam state if storage is valid and the lesson still exists in `cards`.
 * Uses the live card from `cards` so text/images stay in sync with Journey data.
 */
export async function tryRestorePendingUniverseExam<T extends { id: string }>(
  cards: T[],
): Promise<{ card: T; question: string; answerInput: string } | null> {
  if (cards.length === 0) return null;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingUniverseExamPayload;
    if (!parsed?.card?.id || !parsed?.question?.trim()) {
      await clearPendingUniverseExam();
      return null;
    }
    const match = cards.find((c) => c.id === parsed.card.id);
    if (!match) {
      await clearPendingUniverseExam();
      return null;
    }
    return {
      card: match,
      question: parsed.question,
      answerInput: typeof parsed.answerInput === "string" ? parsed.answerInput : "",
    };
  } catch {
    await clearPendingUniverseExam();
    return null;
  }
}

export async function savePendingUniverseExam(
  payload: PendingUniverseExamPayload,
): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export async function clearPendingUniverseExam(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
