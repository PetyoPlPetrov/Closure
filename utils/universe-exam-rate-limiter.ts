/**
 * Exam Rate Limiter — shared across all exam entry points (wheel spin, entity wheel spin,
 * Sun exam icon). Free users get 3 uses/day by default or 5/day with active Sferas badge.
 * Resets at midnight in user's timezone.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocalDateString } from "./ai-rate-limiter";
import { getFreeExamDailyLimit } from "@/utils/badge-rewards";

const UNIVERSE_EXAM_KEY = "@sferas:universe_exam_usage";
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
  const freeDailyLimit = await getFreeExamDailyLimit();
  const prev = consumeChain;
  consumeChain = prev.then(async () => {
    const record = await getUsageRecord();
    if (record.count >= freeDailyLimit) return false;
    await saveUsageRecord({ date: record.date, count: record.count + 1 });
    return true;
  });
  return consumeChain;
}

/**
 * Non-consuming check: returns true if at least one free exam slot remains today.
 * Use for preload guards that must not consume a slot.
 */
export async function canUseExam(hasAIEntitlement: boolean): Promise<boolean> {
  if (hasAIEntitlement) return true;
  const freeDailyLimit = await getFreeExamDailyLimit();
  const record = await getUsageRecord();
  return record.count < freeDailyLimit;
}

/**
 * Check remaining free universe exams today (without consuming).
 */
export async function getRemainingUniverseExams(
  hasAIEntitlement: boolean,
): Promise<number> {
  if (hasAIEntitlement) return Infinity;
  const freeDailyLimit = await getFreeExamDailyLimit();
  const record = await getUsageRecord();
  return Math.max(0, freeDailyLimit - record.count);
}
