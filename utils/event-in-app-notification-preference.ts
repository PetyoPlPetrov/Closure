import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@sferas:event_in_app_notifications_enabled";

/** Default true: show in-app notifications for events (new events, event memory reminders). */
export async function getEventInAppNotificationsEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === "false") return false;
    if (raw === "true") return true;
    return true; // default on
  } catch {
    return true;
  }
}

export async function setEventInAppNotificationsEnabled(
  enabled: boolean,
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
}
