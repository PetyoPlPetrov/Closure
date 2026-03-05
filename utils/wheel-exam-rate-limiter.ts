/**
 * Wheel Exam Rate Limiter
 * 1 free wheel exam rotation per day for users without Sfera AI.
 * Resets at midnight in user's timezone.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocalDateString } from "./ai-rate-limiter";

const WHEEL_EXAM_KEY = "@sferas:wheel_exam_date";

/**
 * Check if user can spin the wheel exam (either has AI or has free rotation today).
 */
export async function canSpinWheelExam(
  hasAIEntitlement: boolean,
): Promise<boolean> {
  if (hasAIEntitlement) return true;
  const lastDate = await AsyncStorage.getItem(WHEEL_EXAM_KEY);
  const today = getLocalDateString();
  return lastDate !== today;
}

/**
 * Record that user used their free wheel exam today.
 */
export async function recordWheelExamUsed(): Promise<void> {
  await AsyncStorage.setItem(WHEEL_EXAM_KEY, getLocalDateString());
}
