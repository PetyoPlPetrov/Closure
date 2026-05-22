import AsyncStorage from "@react-native-async-storage/async-storage";

/** Persisted orbit vs list layout for entity views. */
export const ENTITIES_DISPLAY_MODE_STORAGE_KEY =
  "@sferas:entities_display_mode";

export type EntitiesDisplayMode = "orbit" | "list";

export async function setEntitiesDisplayMode(
  mode: EntitiesDisplayMode,
): Promise<void> {
  await AsyncStorage.setItem(ENTITIES_DISPLAY_MODE_STORAGE_KEY, mode);
}
