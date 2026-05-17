/**
 * EAS Update (OTA) helpers.
 * Only relevant in production builds; no-ops in __DEV__ and on web.
 */
import Constants from "expo-constants";
import { Platform } from "react-native";

export type AppVersionInfo = {
  /** App version from the native build (e.g. "1.0.131"). */
  nativeVersion: string;
  /** Current OTA update ID, if running a downloaded update; undefined if embedded or N/A. */
  updateId: string | undefined;
  /** Whether the app is running the bundle embedded in the build (no OTA applied). */
  isEmbeddedLaunch: boolean | undefined;
};

/** Returns version and update info for display and support. Safe to call in dev (returns placeholder when updates not available). */
export async function getAppVersionInfo(): Promise<AppVersionInfo> {
  const nativeVersion =
    Constants.expoConfig?.version ?? ((Constants.manifest as Record<string, unknown> | null)?.version as string | undefined) ?? "—";
  if (__DEV__ || Platform.OS === "web") {
    return { nativeVersion, updateId: undefined, isEmbeddedLaunch: undefined };
  }
  try {
    const Updates = (await import("expo-updates")).default;
    return {
      nativeVersion,
      updateId: Updates.updateId ?? undefined,
      isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    };
  } catch {
    return { nativeVersion, updateId: undefined, isEmbeddedLaunch: undefined };
  }
}

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
