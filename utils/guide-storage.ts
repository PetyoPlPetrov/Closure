import AsyncStorage from "@react-native-async-storage/async-storage";

const GUIDE_READ_KEY = "@sferas:guide_read_sections";
const GUIDE_DISMISSED_FOREVER_KEY = "@sferas:guide_dismissed_forever";

export async function getReadSections(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(GUIDE_READ_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

export async function markSectionRead(sectionId: string): Promise<void> {
  try {
    const current = await getReadSections();
    current.add(sectionId);
    await AsyncStorage.setItem(GUIDE_READ_KEY, JSON.stringify([...current]));
  } catch {
    // ignore
  }
}

export async function clearReadSections(): Promise<void> {
  try {
    await AsyncStorage.removeItem(GUIDE_READ_KEY);
  } catch {
    // ignore
  }
}

export async function getGuideDismissedForever(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(GUIDE_DISMISSED_FOREVER_KEY);
    return value === "true";
  } catch {
    return false;
  }
}

export async function setGuideDismissedForever(): Promise<void> {
  try {
    await AsyncStorage.setItem(GUIDE_DISMISSED_FOREVER_KEY, "true");
  } catch {
    // ignore
  }
}

export async function clearGuideDismissedForever(): Promise<void> {
  try {
    await AsyncStorage.removeItem(GUIDE_DISMISSED_FOREVER_KEY);
  } catch {
    // ignore
  }
}
