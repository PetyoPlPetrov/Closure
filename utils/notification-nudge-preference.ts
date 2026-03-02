import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@sferas:home_notification_nudge_enabled";

/** Default true: show the encouragement nudge and allow AI-suggested messages on the Home tab. */
export async function getNotificationNudgeEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === "false") return false;
    if (raw === "true") return true;
    return true; // default on
  } catch {
    return true;
  }
}

export async function setNotificationNudgeEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
}
