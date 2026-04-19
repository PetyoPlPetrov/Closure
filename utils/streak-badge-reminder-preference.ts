import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@sferas:streak_badge_benefit_reminder_enabled";

/**
 * Default true: users receive the mid-day badge benefit reminder.
 */
export async function getStreakBadgeBenefitReminderEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === "false") return false;
    if (raw === "true") return true;
    return true;
  } catch {
    return true;
  }
}

export async function setStreakBadgeBenefitReminderEnabled(
  enabled: boolean,
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
}
