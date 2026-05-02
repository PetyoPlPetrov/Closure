import AsyncStorage from "@react-native-async-storage/async-storage";
import { SECTIONS, type GuideSection } from "@/utils/guide-data";

const GUIDE_LINKS_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbwaQ0-NgsLezQRK6W9V2_3zYEnzIAfSkVNngc9RERTq87bli0JgVxlDCdnUiXvVU0RvOQ/exec";
const GUIDE_LINKS_CACHE_KEY = "@sferas:guide_remote_links_cache_v1";
const GUIDE_LINKS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type GuideRemoteRow = {
  section?: string;
  video_url?: string;
  description?: string;
};

type GuideLinksCachePayload = {
  fetchedAt: number;
  rows: GuideRemoteRow[];
};

let inFlightGuideSectionsPromise: Promise<GuideSection[]> | null = null;
let latestGuideSections: GuideSection[] | null = null;

const SECTION_NAME_TO_ID: Record<string, GuideSection["id"]> = {
  missions: "overview",
  memories: "recordingMemories",
  tools: "tools",
  nudges: "notifications",
  notifications: "notifications",
  styles: "customizations",
  customizations: "customizations",
};

function normalizeSectionName(name: string): string {
  return name.trim().toLowerCase();
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function mergeSectionsWithRemoteLinks(rows: GuideRemoteRow[]): GuideSection[] {
  const nextSections = SECTIONS.map((section) => ({ ...section }));
  for (const row of rows) {
    const sectionName = typeof row.section === "string" ? row.section : "";
    const rawUrl = typeof row.video_url === "string" ? row.video_url.trim() : "";
    const rawDescription =
      typeof row.description === "string" ? row.description.trim() : "";
    if (!sectionName) continue;
    const mappedId = SECTION_NAME_TO_ID[normalizeSectionName(sectionName)];
    if (!mappedId) continue;
    const idx = nextSections.findIndex((s) => s.id === mappedId);
    if (idx >= 0) {
      nextSections[idx] = {
        ...nextSections[idx],
        ...(rawUrl && isValidHttpUrl(rawUrl)
          ? { introYoutubeUrl: rawUrl }
          : {}),
        ...(rawDescription ? { remoteDescription: rawDescription } : {}),
      };
    }
  }
  return nextSections;
}

async function readCachedRows(): Promise<GuideRemoteRow[] | null> {
  try {
    const raw = await AsyncStorage.getItem(GUIDE_LINKS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuideLinksCachePayload;
    if (!parsed || !Array.isArray(parsed.rows) || typeof parsed.fetchedAt !== "number") {
      return null;
    }
    if (Date.now() - parsed.fetchedAt > GUIDE_LINKS_CACHE_TTL_MS) {
      return null;
    }
    return parsed.rows;
  } catch {
    return null;
  }
}

async function writeCachedRows(rows: GuideRemoteRow[]): Promise<void> {
  try {
    const payload: GuideLinksCachePayload = {
      fetchedAt: Date.now(),
      rows,
    };
    await AsyncStorage.setItem(GUIDE_LINKS_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore cache write failures
  }
}

async function fetchRemoteRows(): Promise<GuideRemoteRow[]> {
  const response = await fetch(GUIDE_LINKS_ENDPOINT);
  if (!response.ok) {
    throw new Error(`Guide links fetch failed: ${response.status}`);
  }
  const json = (await response.json()) as unknown;
  if (!Array.isArray(json)) return [];
  return json as GuideRemoteRow[];
}

export async function getGuideSectionsWithRemoteLinks(): Promise<GuideSection[]> {
  if (latestGuideSections) {
    return latestGuideSections;
  }
  if (inFlightGuideSectionsPromise) {
    return inFlightGuideSectionsPromise;
  }

  inFlightGuideSectionsPromise = (async () => {
  if (!__DEV__) {
    const cached = await readCachedRows();
    if (cached) {
      const merged = mergeSectionsWithRemoteLinks(cached);
      latestGuideSections = merged;
      return merged;
    }
  }

  try {
    const remoteRows = await fetchRemoteRows();
    if (!__DEV__) {
      await writeCachedRows(remoteRows);
    }
    const merged = mergeSectionsWithRemoteLinks(remoteRows);
    latestGuideSections = merged;
    return merged;
  } catch (error) {
    void error;
    latestGuideSections = SECTIONS;
    return SECTIONS;
  }
  })();

  try {
    return await inFlightGuideSectionsPromise;
  } finally {
    inFlightGuideSectionsPromise = null;
  }
}

export function prewarmGuideSectionsRemoteLinks(): void {
  void getGuideSectionsWithRemoteLinks();
}
