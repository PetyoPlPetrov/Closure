import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_SUMMARIES = '@sferas:moment_notification_summaries';

/**
 * Delete all moment notification summaries for the given memory IDs.
 * Used when memories are bulk-deleted (e.g. when an entity is deleted).
 */
export async function deleteSummariesByMemoryIds(memoryIds: string[]): Promise<void> {
  if (memoryIds.length === 0) return;
  const idsSet = new Set(memoryIds);
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_SUMMARIES);
    if (!raw) return;
    const list = JSON.parse(raw) as { id: string; memoryId: string }[];
    const next = list.filter((s: { memoryId: string }) => !idsSet.has(s.memoryId));
    if (next.length !== list.length) {
      await AsyncStorage.setItem(STORAGE_KEY_SUMMARIES, JSON.stringify(next));
    }
  } catch {
    // ignore
  }
}
