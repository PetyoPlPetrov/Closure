import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LifeSphere } from "@/utils/JourneyProvider";

/** Max starter memories created in onboarding memory wizard. */
export const ONBOARDING_MEMORY_WIZARD_MAX = 5;

const EX_PROFILES = "@sferas:ex_profiles";
const JOBS = "@sferas:jobs";
const FAMILY = "@sferas:family_members";
const FRIENDS = "@sferas:friends";
const HOBBIES = "@sferas:hobbies";

export type MemoryWizardPickRow = {
  id: string;
  name: string;
  sphere: LifeSphere;
  imageUri?: string;
};

function parseRows(
  raw: string | null,
): { id: string; name: string; imageUri?: string }[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { id?: string; name?: string; imageUri?: string }[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is { id: string; name: string; imageUri?: string } =>
        typeof x?.id === "string" &&
        typeof x?.name === "string" &&
        x.id.length > 0,
    );
  } catch {
    return [];
  }
}

/** Fresh read from AsyncStorage — same canonical order as the memory wizard. */
export async function loadOrderedMemoryWizardPickRows(): Promise<
  MemoryWizardPickRow[]
> {
  try {
    const pairs = await AsyncStorage.multiGet([
      FRIENDS,
      FAMILY,
      HOBBIES,
      EX_PROFILES,
      JOBS,
    ]);
    const map = Object.fromEntries(pairs) as Record<string, string | null>;

    const friends = parseRows(map[FRIENDS]);
    const family = parseRows(map[FAMILY]);
    const hobbies = parseRows(map[HOBBIES]);
    const profiles = parseRows(map[EX_PROFILES]);
    const jobs = parseRows(map[JOBS]);

    const rows: MemoryWizardPickRow[] = [];
    friends.forEach((e) =>
      rows.push({
        id: e.id,
        name: e.name,
        sphere: "friends",
        imageUri: e.imageUri,
      }),
    );
    family.forEach((e) =>
      rows.push({
        id: e.id,
        name: e.name,
        sphere: "family",
        imageUri: e.imageUri,
      }),
    );
    hobbies.forEach((e) =>
      rows.push({
        id: e.id,
        name: e.name,
        sphere: "hobbies",
        imageUri: e.imageUri,
      }),
    );
    profiles.forEach((e) =>
      rows.push({
        id: e.id,
        name: e.name,
        sphere: "relationships",
        imageUri: e.imageUri,
      }),
    );
    jobs.forEach((e) =>
      rows.push({
        id: e.id,
        name: e.name,
        sphere: "career",
        imageUri: e.imageUri,
      }),
    );
    return rows;
  } catch {
    return [];
  }
}
