/**
 * Universe Exam Rate Limiter
 * 3 free universe exam questions per day for users without Sfera AI.
 * Resets at midnight in user's timezone.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocalDateString } from "./ai-rate-limiter";

const UNIVERSE_EXAM_KEY = "@sferas:universe_exam_usage";
const FREE_DAILY_LIMIT = 3;

interface UsageRecord {
  date: string;
  count: number;
}

async function getUsageRecord(): Promise<UsageRecord> {
  try {
    const raw = await AsyncStorage.getItem(UNIVERSE_EXAM_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as UsageRecord;
      if (parsed.date === getLocalDateString()) return parsed;
    }
  } catch {
    // ignore
  }
  return { date: getLocalDateString(), count: 0 };
}

async function saveUsageRecord(record: UsageRecord): Promise<void> {
  try {
    await AsyncStorage.setItem(UNIVERSE_EXAM_KEY, JSON.stringify(record));
  } catch {
    // ignore
  }
}

/** Serializes consume calls to avoid race conditions. */
let consumeChain: Promise<boolean> = Promise.resolve(true);

/**
 * Atomically consume one free universe exam slot if available.
 * Returns true if the exam can proceed, false if the daily limit is reached.
 */
export async function consumeUniverseExamIfAvailable(
  hasAIEntitlement: boolean,
): Promise<boolean> {
  if (hasAIEntitlement) return true;
  const prev = consumeChain;
  consumeChain = prev.then(async () => {
    const record = await getUsageRecord();
    if (record.count >= FREE_DAILY_LIMIT) return false;
    await saveUsageRecord({ date: record.date, count: record.count + 1 });
    return true;
  });
  return consumeChain;
}

/**
 * Check remaining free universe exams today (without consuming).
 */
export async function getRemainingUniverseExams(
  hasAIEntitlement: boolean,
): Promise<number> {
  if (hasAIEntitlement) return Infinity;
  const record = await getUsageRecord();
  return Math.max(0, FREE_DAILY_LIMIT - record.count);
}
