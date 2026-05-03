import AsyncStorage from "@react-native-async-storage/async-storage";

/** Persisted orbit vs Memory Balance layout (FocusedSferas overview). */
export const FOCUSED_DISPLAY_MODE_STORAGE_KEY = "@sferas:focused_display_mode";

export type FocusedHomeDisplayMode = "defaultOrbit" | "memoryBalanceRings";

export async function setFocusedDisplayMode(
  mode: FocusedHomeDisplayMode,
): Promise<void> {
  await AsyncStorage.setItem(FOCUSED_DISPLAY_MODE_STORAGE_KEY, mode);
}
