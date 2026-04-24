import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@sferas:sfera_size_hint_dismissed_forever";
const SUNNY_VS_CLOUDY_KEY = "@sferas:sunny_vs_cloudy_hint_dismissed_forever";

export async function getSferaSizeHintDismissedForever(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === "true";
  } catch {
    return false;
  }
}

export async function setSferaSizeHintDismissedForever(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, value ? "true" : "false");
  } catch {
    // ignore
  }
}

export async function getSunnyVsCloudyHintDismissedForever(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SUNNY_VS_CLOUDY_KEY)) === "true";
  } catch {
    return false;
  }
}

export async function setSunnyVsCloudyHintDismissedForever(
  value: boolean,
): Promise<void> {
  try {
    await AsyncStorage.setItem(SUNNY_VS_CLOUDY_KEY, value ? "true" : "false");
  } catch {
    // ignore
  }
}
