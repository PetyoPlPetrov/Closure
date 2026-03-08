/**
 * Onboarding storage - track completion, walkthrough trigger, and cached AI response
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AIOnboardingResponse } from "./ai-service";

const ONBOARDING_COMPLETED_KEY = "@sferas:onboarding_completed";
const SHOW_WALKTHROUGH_AFTER_ONBOARDING_KEY = "@sferas:show_walkthrough_after_onboarding";
const CACHED_ONBOARDING_RESPONSE_KEY = "@sferas:cached_onboarding_response";

export async function getOnboardingCompleted(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
    if (__DEV__) {
      console.log("[OnboardingStorage] getOnboardingCompleted raw:", {
        key: ONBOARDING_COMPLETED_KEY,
        rawValue: value,
        parsed: value === "true",
      });
    }
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
