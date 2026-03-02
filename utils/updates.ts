/**
 * EAS Update (OTA) helpers.
 * Only relevant in production builds; no-ops in __DEV__ and on web.
 */
import { Platform } from "react-native";

export async function checkForUpdateAndReload(): Promise<boolean> {
  if (__DEV__ || Platform.OS === "web") {
    return false;
  }
  try {
    const { default: Updates } = await import("expo-updates");
    const update = await Updates.checkForUpdateAsync();
    if (!update.isAvailable) return false;
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
    return true;
  } catch {
    return false;
  }
}
