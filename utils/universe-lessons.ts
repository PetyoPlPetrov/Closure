/**
 * Universe Lessons – community-contributed wisdom loaded from a published Google Sheet.
 * No backend: app fetches JSON from a public Google Apps Script URL.
 *
 * Features:
 * - Fetch lessons from Google Sheet
 * - Cache lessons locally (AsyncStorage)
 * - Submit new lessons (premium users only)
 * - Like/unlike lessons (local tracking)
 * - Track saved lessons
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const UNIVERSE_LESSONS_CACHE_KEY = "@sferas:universe_lessons_cache";
const LIKED_LESSON_IDS_KEY = "@sferas:liked_universe_lesson_ids";
const SAVED_LESSON_IDS_KEY = "@sferas:saved_universe_lesson_ids";
const LAST_FETCH_TIME_KEY = "@sferas:universe_lessons_last_fetch";
const SHARE_REJECTIONS_KEY = "@sferas:universe_share_rejections";

/** Google Apps Script URL for universe lessons (returns JSON: { status, data: [...] }). */
const DEFAULT_UNIVERSE_LESSONS_SCRIPT_URL =
  "https://script.google.com/macros/s/YOUR_SCRIPT_ID_HERE/exec";

const MOCK_LESSONS: UniverseLesson[] = [
  { id: "mock-1", text: "Pain is a teacher. The lesson is always worth learning.", author: "Maria", createdAt: "2026-01-10", likeCount: 42 },
  { id: "mock-2", text: "You cannot pour from an empty cup. Rest is not laziness — it's maintenance.", author: "Alex", createdAt: "2026-01-15", likeCount: 31 },
  { id: "mock-3", text: "The people who left made room for the people who were meant to stay.", createdAt: "2026-01-20", likeCount: 87 },
  { id: "mock-4", text: "Healing isn't linear. Some days you'll feel like you're back at the start — that's part of the journey.", author: "Sofia", createdAt: "2026-01-25", likeCount: 55 },
  { id: "mock-5", text: "Closure doesn't always come from the other person. Sometimes you have to give it to yourself.", author: "Ivan", createdAt: "2026-02-01", likeCount: 120 },
  { id: "mock-6", text: "Let the version of you that was hurt retire. You've earned a new beginning.", createdAt: "2026-02-05", likeCount: 64 },
  { id: "mock-7", text: "Not every ending is a failure. Sometimes it just means the story was complete.", author: "Elena", createdAt: "2026-02-10", likeCount: 48 },
  { id: "mock-8", text: "The things that broke you open are the same things that let the light in.", author: "Dimitar", createdAt: "2026-02-15", likeCount: 99 },
  { id: "mock-9", text: "Forgiving someone doesn't mean what they did was okay. It means you're no longer willing to carry it.", createdAt: "2026-02-20", likeCount: 73 },
  { id: "mock-10", text: "You are not the worst thing that happened to you.", author: "Niki", createdAt: "2026-03-01", likeCount: 156 },
];

/** Cache duration: 1 hour (in milliseconds) */
const CACHE_DURATION_MS = 60 * 60 * 1000;

export interface UniverseLesson {
  id: string;
  text: string;
  author?: string;
  createdAt?: string;
  likeCount?: number;
}

/** Find value in object by trying exact keys or case-insensitive match. */
function getByKey(raw: Record<string, unknown>, keys: string[]): unknown {
  const lowerMap = new Map<string, unknown>();
  for (const [k, v] of Object.entries(raw)) {
    lowerMap.set(k.toLowerCase(), v);
  }
  for (const k of keys) {
    const v = raw[k] ?? lowerMap.get(k.toLowerCase());
    if (v != null) return v;
  }
  return undefined;
}

/** Map raw JSON lesson to UniverseLesson. */
function jsonToLesson(
  raw: Record<string, unknown>,
  index: number,
): UniverseLesson | null {
  const get = (keys: string[]) => {
    const v = getByKey(raw, keys);
    if (v == null || v === "") return "";
    return String(v).trim();
  };
  const getNum = (keys: string[]) => {
    const v = getByKey(raw, keys);
    if (v == null) return undefined;
    const n = typeof v === "number" ? v : parseInt(String(v).trim(), 10);
    return !isNaN(n) ? n : undefined;
  };

  const text = get(["text", "Text", "lesson", "Lesson"]);
  if (!text) return null;

  return {
    id: get(["id", "ID"]) || `lesson-${index}-${Date.now()}`,
    text,
    author: get(["author", "Author"]) || undefined,
    createdAt: get(["createdAt", "CreatedAt", "created_at"]) || undefined,
    likeCount: getNum(["likeCount", "LikeCount", "like_count", "likes"]) || 0,
  };
}

/**
 * Read cached lessons synchronously (no network).
 * Returns null if no cache exists yet.
 */
export async function getCachedUniverseLessons(): Promise<UniverseLesson[] | null> {
  try {
    const cachedStr = await AsyncStorage.getItem(UNIVERSE_LESSONS_CACHE_KEY);
    if (!cachedStr) return null;
    return JSON.parse(cachedStr) as UniverseLesson[];
  } catch {
    return null;
  }
}

/**
 * Fetch universe lessons from Google Sheet.
 * Uses cached data if available and recent (within CACHE_DURATION_MS).
 * @param forceRefresh - If true, bypass cache and fetch fresh data
 */
export async function fetchUniverseLessons(
  forceRefresh = false,
): Promise<UniverseLesson[]> {
  try {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const lastFetchStr = await AsyncStorage.getItem(LAST_FETCH_TIME_KEY);
      const cachedStr = await AsyncStorage.getItem(UNIVERSE_LESSONS_CACHE_KEY);

      if (lastFetchStr && cachedStr) {
        const lastFetch = parseInt(lastFetchStr, 10);
        const now = Date.now();
        if (now - lastFetch < CACHE_DURATION_MS) {
          // Cache is still valid
          const cached = JSON.parse(cachedStr) as UniverseLesson[];
          if (__DEV__) {
            console.log(
              `[Universe Lessons] Using cached data (${cached.length} lessons)`,
            );
          }
          return cached;
        }
      }
    }

    // Fetch fresh data
    if (__DEV__) {
      console.log("[Universe Lessons] DEV mode — returning mock lessons.");
      await new Promise((r) => setTimeout(r, 600)); // simulate network delay
      const lessons = MOCK_LESSONS;
      await AsyncStorage.setItem(UNIVERSE_LESSONS_CACHE_KEY, JSON.stringify(lessons));
      await AsyncStorage.setItem(LAST_FETCH_TIME_KEY, Date.now().toString());
      return lessons;
    }

    const response = await fetch(DEFAULT_UNIVERSE_LESSONS_SCRIPT_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json = (await response.json()) as {
      status?: string;
      data?: Record<string, unknown>[];
    };

    if (json.status !== "success" || !Array.isArray(json.data)) {
      throw new Error("Invalid response format from Google Sheet");
    }

    const lessons: UniverseLesson[] = json.data
      .map((raw, idx) => jsonToLesson(raw, idx))
      .filter((l): l is UniverseLesson => l !== null);

    // Cache the results
    await AsyncStorage.setItem(
      UNIVERSE_LESSONS_CACHE_KEY,
      JSON.stringify(lessons),
    );
    await AsyncStorage.setItem(LAST_FETCH_TIME_KEY, Date.now().toString());

    if (__DEV__) {
      console.log(
        `[Universe Lessons] Fetched and cached ${lessons.length} lessons`,
      );
    }

    return lessons;
  } catch (error) {
    console.error("[Universe Lessons] Fetch error:", error);

    // Fallback to cache if available
    const cachedStr = await AsyncStorage.getItem(UNIVERSE_LESSONS_CACHE_KEY);
    if (cachedStr) {
      const cached = JSON.parse(cachedStr) as UniverseLesson[];
      if (__DEV__) {
        console.log(
          `[Universe Lessons] Fetch failed, using stale cache (${cached.length} lessons)`,
        );
      }
      return cached;
    }

    // No cache available, return empty array
    return [];
  }
}

/**
 * Submit a new lesson to the universe (Google Sheet).
 * Premium users only.
 * @param lessonText - The lesson text to submit
 * @param authorId - Optional author identifier
 */
export async function submitLessonToUniverse(
  lessonText: string,
  authorId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!lessonText || lessonText.trim().length === 0) {
      return { success: false, error: "Lesson text is required" };
    }

    if (__DEV__) {
      console.log("[Universe Lessons] DEV mode — mock submit:", lessonText.slice(0, 60));
      await new Promise((r) => setTimeout(r, 600));
      return { success: true };
    }

    const payload = {
      action: "submit",
      text: lessonText.trim(),
      author: authorId || "anonymous",
      createdAt: new Date().toISOString(),
    };

    const response = await fetch(DEFAULT_UNIVERSE_LESSONS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json = (await response.json()) as {
      status?: string;
      message?: string;
    };

    if (json.status === "success") {
      if (__DEV__) {
        console.log("[Universe Lessons] Lesson submitted successfully");
      }
      // Invalidate cache to force refresh
      await AsyncStorage.removeItem(LAST_FETCH_TIME_KEY);
      return { success: true };
    } else {
      return { success: false, error: json.message || "Submission failed" };
    }
  } catch (error) {
    console.error("[Universe Lessons] Submit error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get list of liked lesson IDs for the current user.
 */
export async function getLikedLessonIds(): Promise<Set<string>> {
  try {
    const str = await AsyncStorage.getItem(LIKED_LESSON_IDS_KEY);
    if (!str) return new Set();
    const arr = JSON.parse(str) as string[];
    return new Set(arr);
  } catch (error) {
    console.error("[Universe Lessons] Get liked IDs error:", error);
    return new Set();
  }
}

/**
 * Like a lesson (add to local favorites).
 */
export async function likeLesson(lessonId: string): Promise<void> {
  try {
    const liked = await getLikedLessonIds();
    liked.add(lessonId);
    await AsyncStorage.setItem(
      LIKED_LESSON_IDS_KEY,
      JSON.stringify([...liked]),
    );
  } catch (error) {
    console.error("[Universe Lessons] Like error:", error);
  }
}

/**
 * Unlike a lesson (remove from local favorites).
 */
export async function unlikeLesson(lessonId: string): Promise<void> {
  try {
    const liked = await getLikedLessonIds();
    liked.delete(lessonId);
    await AsyncStorage.setItem(
      LIKED_LESSON_IDS_KEY,
      JSON.stringify([...liked]),
    );
  } catch (error) {
    console.error("[Universe Lessons] Unlike error:", error);
  }
}

/**
 * Get list of saved lesson IDs (lessons saved to memories).
 */
export async function getSavedLessonIds(): Promise<Set<string>> {
  try {
    const str = await AsyncStorage.getItem(SAVED_LESSON_IDS_KEY);
    if (!str) return new Set();
    const arr = JSON.parse(str) as string[];
    return new Set(arr);
  } catch (error) {
    console.error("[Universe Lessons] Get saved IDs error:", error);
    return new Set();
  }
}

/**
 * Mark a lesson as saved (when added to a memory).
 */
export async function markLessonAsSaved(lessonId: string): Promise<void> {
  try {
    const saved = await getSavedLessonIds();
    saved.add(lessonId);
    await AsyncStorage.setItem(
      SAVED_LESSON_IDS_KEY,
      JSON.stringify([...saved]),
    );
  } catch (error) {
    console.error("[Universe Lessons] Mark saved error:", error);
  }
}

interface ShareRejectionsRecord {
  date: string; // "YYYY-MM-DD"
  count: number;
}

/** Today's date as "YYYY-MM-DD" string */
function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns true if the user is banned from sharing today
 * (reached 3 AI-rejected submissions on the current calendar day).
 */
export async function isShareBannedToday(): Promise<boolean> {
  try {
    const str = await AsyncStorage.getItem(SHARE_REJECTIONS_KEY);
    if (!str) return false;
    const record = JSON.parse(str) as ShareRejectionsRecord;
    return record.date === todayString() && record.count >= 3;
  } catch {
    return false;
  }
}

/**
 * Record one AI-rejection for sharing today.
 * Returns the new rejection count for today.
 */
export async function recordShareRejection(): Promise<number> {
  try {
    const str = await AsyncStorage.getItem(SHARE_REJECTIONS_KEY);
    const today = todayString();
    let record: ShareRejectionsRecord = { date: today, count: 0 };
    if (str) {
      const parsed = JSON.parse(str) as ShareRejectionsRecord;
      // Reset counter if it's a new day
      if (parsed.date === today) {
        record = parsed;
      }
    }
    record.count += 1;
    await AsyncStorage.setItem(SHARE_REJECTIONS_KEY, JSON.stringify(record));
    return record.count;
  } catch {
    return 1;
  }
}

/**
 * Clear all cached data (useful for debugging).
 */
export async function clearUniverseLessonsCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      UNIVERSE_LESSONS_CACHE_KEY,
      LAST_FETCH_TIME_KEY,
    ]);
    if (__DEV__) {
      console.log("[Universe Lessons] Cache cleared");
    }
  } catch (error) {
    console.error("[Universe Lessons] Clear cache error:", error);
  }
}
