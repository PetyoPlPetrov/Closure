/**
 * Wheel exam question preloading.
 * - Each question is linked to a specific user lesson (one question per lesson).
 * - Main: preload up to 20 questions on app open. Cache in AsyncStorage.
 * - Entity: preload up to 20 questions when entity wheel opens. Cache per entity.
 * - Remove question from cache when user sees it.
 * - Refill when main < 5 or entity < 10: pick another set of random lessons (up to 20),
 *   generate one new question per lesson via AI, append to pool.
 * - AI evaluation receives user answer + question + linked lesson to decide if user learned it.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { IdealizedMemory } from "./JourneyProvider";
import { canSpinWheelExam } from "./wheel-exam-rate-limiter";
import {
  generateLessonExamQuestionsBatch,
  type PreloadedExamQuestion as PreloadedType,
} from "./ai-service";

const MAX_PRELOAD = 20;
const MAIN_REFILL_THRESHOLD = 5;
const ENTITY_REFILL_THRESHOLD = 10;

const MAIN_STORAGE_KEY = "@sferas:wheel_exam_main";
const ENTITY_STORAGE_PREFIX = "@sferas:wheel_exam_entity:";

/** Flatten all lessons from memories with id, text, memoryId, memoryImageUri, entityId, sphere */
function collectLessonsFromMemories(
  memories: IdealizedMemory[],
): {
  id: string;
  text: string;
  memoryId: string;
  memoryImageUri?: string;
  entityId: string;
  sphere: IdealizedMemory["sphere"];
}[] {
  const out: {
    id: string;
    text: string;
    memoryId: string;
    memoryImageUri?: string;
    entityId: string;
    sphere: IdealizedMemory["sphere"];
  }[] = [];
  for (const m of memories) {
    const list = m.lessonsLearned ?? [];
    for (const l of list) {
      if (l?.text?.trim()) {
        out.push({
          id: l.id,
          text: l.text.trim(),
          memoryId: m.id,
          memoryImageUri: m.imageUri,
          entityId: m.entityId ?? m.profileId ?? "",
          sphere: m.sphere ?? "relationships",
        });
      }
    }
  }
  return out;
}

/** Pick up to n random items */
function pickRandom<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

let mainPreloaded: PreloadedType[] = [];
const entityPreloaded = new Map<string, PreloadedType[]>();
let mainLoadedFromStorage = false;
const entityLoadedFromStorage = new Set<string>();
let mainPreloadPromise: Promise<void> | null = null;
const entityPreloadPromises = new Map<string, Promise<void>>();

async function loadMainFromStorage(): Promise<void> {
  if (mainLoadedFromStorage) return;
  mainLoadedFromStorage = true;
  try {
    const raw = await AsyncStorage.getItem(MAIN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PreloadedType[];
      if (Array.isArray(parsed)) {
        mainPreloaded = parsed;
      }
    }
  } catch {
    // Cache load failed, continue with empty pool
  }
}

async function loadEntityFromStorage(entityId: string): Promise<void> {
  if (entityLoadedFromStorage.has(entityId)) return;
  entityLoadedFromStorage.add(entityId);
  try {
    const raw = await AsyncStorage.getItem(ENTITY_STORAGE_PREFIX + entityId);
    if (raw) {
      const parsed = JSON.parse(raw) as PreloadedType[];
      if (Array.isArray(parsed)) {
        entityPreloaded.set(entityId, parsed);
      }
    }
  } catch {
    // Cache load failed, continue with empty pool
  }
}

async function saveMainToStorage(): Promise<void> {
  try {
    await AsyncStorage.setItem(MAIN_STORAGE_KEY, JSON.stringify(mainPreloaded));
  } catch {
    // Cache save failed
  }
}

async function saveEntityToStorage(entityId: string): Promise<void> {
  try {
    const pool = entityPreloaded.get(entityId) ?? [];
    await AsyncStorage.setItem(
      ENTITY_STORAGE_PREFIX + entityId,
      JSON.stringify(pool),
    );
  } catch {
    // Cache save failed
  }
}

export async function getMainPreloadedQuestions(): Promise<PreloadedType[]> {
  await loadMainFromStorage();
  return [...mainPreloaded];
}

export async function getEntityPreloadedQuestions(
  entityId: string,
): Promise<PreloadedType[]> {
  await loadEntityFromStorage(entityId);
  return [...(entityPreloaded.get(entityId) ?? [])];
}

export function pickRandomPreloaded(
  pool: PreloadedType[],
): PreloadedType | null {
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Pick a question and remove it from the cache. Persists. Triggers refetch if below threshold.
 * Returns the picked item or null.
 */
export async function pickAndConsumePreloadedQuestion(params: {
  type: "main" | "entity";
  entityId?: string;
  onRefetchMain?: () => Promise<void>;
  onRefetchEntity?: (entityId: string) => Promise<void>;
}): Promise<PreloadedType | null> {
  const { type, entityId, onRefetchMain, onRefetchEntity } = params;

  if (type === "main") {
    await loadMainFromStorage();
    let pool = mainPreloaded;

    // If pool is empty but preload is in flight, wait for it (with timeout).
    // Fixes race where user spins main wheel before preload finishes.
    if (pool.length === 0 && mainPreloadPromise) {
      try {
        await Promise.race([
          mainPreloadPromise,
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error("preload_timeout")), 8000),
          ),
        ]);
        pool = mainPreloaded;
      } catch {
        // Preload wait failed or timed out
      }
    }

    if (pool.length === 0) return null;
    const idx = Math.floor(Math.random() * mainPreloaded.length);
    const item = mainPreloaded[idx];
    mainPreloaded.splice(idx, 1);
    await saveMainToStorage();
    if (mainPreloaded.length < MAIN_REFILL_THRESHOLD && onRefetchMain) {
      void onRefetchMain();
    }
    return item;
  }

  if (type === "entity" && entityId) {
    await loadEntityFromStorage(entityId);
    let pool = entityPreloaded.get(entityId) ?? [];

    // If pool is empty but preload is in flight, wait for it (with timeout).
    // Fixes race where user spins before preload finishes — exam would not show promptly.
    const inFlight = entityPreloadPromises.get(entityId);
    if (pool.length === 0 && inFlight) {
      try {
        await Promise.race([
          inFlight,
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error("preload_timeout")), 8000),
          ),
        ]);
        pool = entityPreloaded.get(entityId) ?? [];
      } catch {
        // Preload wait failed or timed out
      }
    }

    if (pool.length === 0) return null;
    const idx = Math.floor(Math.random() * pool.length);
    const item = pool[idx];
    pool.splice(idx, 1);
    entityPreloaded.set(entityId, pool);
    await saveEntityToStorage(entityId);
    if (pool.length < ENTITY_REFILL_THRESHOLD && onRefetchEntity) {
      void onRefetchEntity(entityId);
    }
    return item;
  }

  return null;
}

/**
 * Preload questions for main wheel (all entities).
 * Loads from cache first. Appends new questions. Persists.
 */
export async function preloadMainWheelQuestions(params: {
  memories: IdealizedMemory[];
  language: "en" | "bg";
  hasAIEntitlement: boolean;
  appendOnly?: boolean;
}): Promise<void> {
  const {
    memories,
    language,
    hasAIEntitlement,
    appendOnly = false,
  } = params;

  await loadMainFromStorage();
  if (appendOnly && mainPreloaded.length >= MAIN_REFILL_THRESHOLD) return;
  if (!appendOnly && mainPreloaded.length >= MAIN_REFILL_THRESHOLD) return;
  if (mainPreloadPromise) return mainPreloadPromise;

  mainPreloadPromise = (async () => {
    const all = collectLessonsFromMemories(memories);
    if (all.length === 0) {
      mainPreloadPromise = null;
      return;
    }

    const toPreload = pickRandom(all, MAX_PRELOAD);
    // Skip preload only for free users who exhausted their daily spin.
    // Always preload for users with AI entitlement (unlimited spins).
    if (!hasAIEntitlement) {
      const canPreload = await canSpinWheelExam(hasAIEntitlement);
      if (!canPreload) {
        mainPreloadPromise = null;
        return;
      }
    }
    // Don't record here - record when user actually spins (in index/EntityWheelOfLife)

    try {
      const questions = await generateLessonExamQuestionsBatch(
        toPreload,
        language,
      );
      mainPreloaded =
        mainPreloaded.length > 0
          ? [...mainPreloaded, ...questions]
          : questions;
      await saveMainToStorage();
    } catch {
      if (!appendOnly) mainPreloaded = [];
    } finally {
      mainPreloadPromise = null;
    }
  })();

  return mainPreloadPromise;
}

/**
 * Preload questions for entity wheel.
 * Loads from cache first. Appends new questions. Persists.
 */
export async function preloadEntityWheelQuestions(params: {
  entityId: string;
  memories: IdealizedMemory[];
  language: "en" | "bg";
  hasAIEntitlement: boolean;
  appendOnly?: boolean;
}): Promise<void> {
  const {
    entityId,
    memories,
    language,
    hasAIEntitlement,
    appendOnly = false,
  } = params;

  await loadEntityFromStorage(entityId);
  const existing = entityPreloaded.get(entityId) ?? [];
  if (appendOnly && existing.length >= ENTITY_REFILL_THRESHOLD) return;
  if (!appendOnly && existing.length >= ENTITY_REFILL_THRESHOLD) return;

  let promise = entityPreloadPromises.get(entityId);
  if (promise) return promise;

  promise = (async () => {
    const all = collectLessonsFromMemories(memories);
    if (all.length === 0) {
      entityPreloaded.set(entityId, []);
      await saveEntityToStorage(entityId);
      entityPreloadPromises.delete(entityId);
      return;
    }

    const toPreload = pickRandom(all, MAX_PRELOAD);
    // Skip preload only for free users who exhausted their daily spin.
    // Always preload for users with AI entitlement (unlimited spins).
    if (!hasAIEntitlement) {
      const canPreload = await canSpinWheelExam(hasAIEntitlement);
      if (!canPreload) {
        entityPreloadPromises.delete(entityId);
        return;
      }
    }
    // Don't record here - record when user actually spins (in index/EntityWheelOfLife)

    try {
      const questions = await generateLessonExamQuestionsBatch(
        toPreload,
        language,
      );
      const current = entityPreloaded.get(entityId) ?? [];
      const updated = appendOnly ? [...current, ...questions] : questions;
      entityPreloaded.set(entityId, updated);
      await saveEntityToStorage(entityId);
    } catch {
      if (!appendOnly) entityPreloaded.set(entityId, []);
    } finally {
      entityPreloadPromises.delete(entityId);
    }
  })();

  entityPreloadPromises.set(entityId, promise);
  return promise;
}
