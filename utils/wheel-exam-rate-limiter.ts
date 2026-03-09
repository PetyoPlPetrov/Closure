/**
 * Wheel Exam Rate Limiter
 * 1 free wheel exam rotation per day for users without Sfera AI.
 * Resets at midnight in user's timezone.
 *
 * Use consumeWheelExamIfAvailable() at spin start to avoid race conditions
 * (e.g. double-tap or main + entity wheel spun quickly both passing the check
 * before either records usage).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocalDateString } from "./ai-rate-limiter";

const WHEEL_EXAM_KEY = "@sferas:wheel_exam_date";

/** Serializes consume calls so two concurrent spins cannot both get true. */
let consumeChain: Promise<boolean> = Promise.resolve(true);

/**
 * Atomically consume one free wheel exam spin if available.
 * Call this at spin start (before starting the wheel animation). If it returns
 * true, proceed with the spin and do not call recordWheelExamUsed() on completion.
 * If it returns false, show paywall and do not spin.
 * @param hasAIEntitlement - Whether user has Sfera AI (unlimited spins)
 * @returns true if a spin was consumed and the spin can proceed, false if limit reached
 */
export async function consumeWheelExamIfAvailable(
  hasAIEntitlement: boolean,
): Promise<boolean> {
  if (hasAIEntitlement) return true;
  const prev = consumeChain;
  consumeChain = prev.then(async () => {
    const lastDate = await AsyncStorage.getItem(WHEEL_EXAM_KEY);
    const today = getLocalDateString();
    if (lastDate === today) return false;
    await AsyncStorage.setItem(WHEEL_EXAM_KEY, today);
    return true;
  });
  return consumeChain;
}

/**
 * Check if user can spin the wheel exam (either has AI or has free rotation today).
 * Prefer consumeWheelExamIfAvailable() at spin start to avoid race conditions.
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
 * Only needed for legacy paths; spin start should use consumeWheelExamIfAvailable().
 */
export async function recordWheelExamUsed(): Promise<void> {
  await AsyncStorage.setItem(WHEEL_EXAM_KEY, getLocalDateString());
}
