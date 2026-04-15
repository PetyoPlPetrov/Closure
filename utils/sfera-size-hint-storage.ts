import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@sferas:sfera_size_hint_dismissed_forever";

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
