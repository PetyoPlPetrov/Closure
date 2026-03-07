/**
 * Sfera Events – community events loaded from a published Google Sheet.
 * No backend: app fetches CSV from a public "Publish to web" URL.
 *
 * Sheet columns (header row): ID, Name, ImageLink, StartDate, Country, Town, Location, Description, Date, Privacy, Code
 * - Privacy: "Public" | "Private" | "VIP"
 * - Code: required to unlock Private/VIP events (validated against sheet rows)
 * - StartDate: event is active when current date is before StartDate; only active events are stored locally.
 * - Country: event is active when it matches the device region (from location + reverse geocode); events with empty Country are shown for all regions.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";

const EVENTS_SHEET_URL_KEY = "@sferas:events_sheet_url";
const LOCATION_DECLINED_KEY = "@sferas:location_declined_for_events";
const LAST_KNOWN_REGION_KEY = "@sferas:last_known_region";
const LAST_KNOWN_CITY_KEY = "@sferas:last_known_city";
const UNLOCKED_VIP_CODES_KEY = "@sferas:unlocked_vip_event_codes";
const EVENTS_CACHE_KEY = "@sferas:sfera_events_cache";
const LAST_KNOWN_PUBLIC_VIP_IDS_KEY = "@sferas:last_known_public_vip_event_ids";
const SEEN_EVENT_IDS_KEY = "@sferas:seen_event_ids";
const ATTENDING_EVENT_IDS_KEY = "@sferas:attending_event_ids";

/** Published CSV export for SferaEvents sheet. File → Share → Publish to web → CSV, gid=0 */
const DEFAULT_EVENTS_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1MmK5LCisFoBhyx1Jwt8kWk3YixDlSMl5sYuIrnJHmiE/export?format=csv&gid=0";

export type SferaEventType = "public" | "private" | "vip";

export interface SferaEvent {
  id: string;
  name: string;
  /** Display: e.g. "Sofia, South Park" from Town + Location */
  location: string;
  description: string;
  /** Image URL from sheet (ImageLink column); shown above event name in the card */
  imageUrl: string;
  type: SferaEventType;
  /** Code from sheet; user must enter this to unlock Private/VIP section */
  vipCode: string | null;
  /** Display date string from sheet */
  date: string;
  /** Start date from sheet (StartDate); event is active when current date is before this */
  startDate: string;
  /** External link for the event (EventLink column) */
  eventLink: string;
  country: string;
  town: string;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (inQuotes) {
      current += c;
    } else if (c === ",") {
      result.push(current.trim());
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

function rowToEvent(
  row: string[],
  headerIndex: Record<string, number>,
  rowIndex: number,
): SferaEvent | null {
  const get = (key: string) => {
    const i = headerIndex[key];
    return i !== undefined && row[i] !== undefined ? String(row[i]).trim() : "";
  };
  const name = get("name");
  if (!name) return null;
  const privacyRaw = (get("privacy") || "public").toLowerCase();
  const type: SferaEventType =
    privacyRaw === "private" || privacyRaw === "vip" ? privacyRaw : "public";
  const country = get("country");
  const town = get("town");
  const loc = get("location");
  const locationDisplay =
    [town, loc].filter(Boolean).join(", ") || country || "";
  const code = get("code");
  const startDateRaw = get("startdate") || get("date") || "";
  const dateDisplay = get("date") || startDateRaw;
  return {
    id:
      get("id") ||
      `evt-row-${rowIndex}-${name.replace(/\s+/g, "-").toLowerCase()}`,
    name,
    location: locationDisplay,
    description: get("description"),
    imageUrl:
      get("imagelink") ||
      get("image link") ||
      get("imageurl") ||
      get("image url") ||
      get("imageUrl") ||
      "",
    type,
    vipCode: type !== "public" && code ? code : null,
    date: dateDisplay,
    startDate: startDateRaw,
    eventLink: get("eventlink") || get("event link") || "",
    country,
    town,
  };
}

/** Parse date string from sheet (M/D/YYYY, M/D/YYYY HH:MM, or ISO). */
function parseStartDate(s: string): Date | null {
  const raw = s.trim();
  if (!raw) return null;
  // M/D/YYYY or MM/DD/YYYY (optionally with time)
  const slashMatch = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (slashMatch) {
    const [, month, day, year, h, m, sec] = slashMatch;
    const d = new Date(
      parseInt(year!, 10),
      parseInt(month!, 10) - 1,
      parseInt(day!, 10),
      h ? parseInt(h, 10) : 0,
      m ? parseInt(m, 10) : 0,
      sec ? parseInt(sec, 10) : 0,
    );
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

/** Start of day (midnight) in local time for date-only comparison. */
function getStartOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Event is active if today is on or before StartDate (by calendar day; hours are ignored). */
function isEventActive(event: SferaEvent): boolean {
  if (!event.startDate || !event.startDate.trim()) return true;
  const start = parseStartDate(event.startDate);
  if (!start) return true;
  const today = getStartOfDay(new Date());
  const startDay = getStartOfDay(start);
  return today <= startDay;
}

/** Check if user previously tapped "Close" on the location modal (don't show modal again until cleared). */
export async function isLocationDeclinedByUser(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(LOCATION_DECLINED_KEY);
    return v === "1";
  } catch {
    return false;
  }
}

/** Mark that user dismissed the location modal (don't show again until e.g. clear data). */
export async function setLocationDeclinedByUser(): Promise<void> {
  await AsyncStorage.setItem(LOCATION_DECLINED_KEY, "1");
}

/** Get current location permission status (does not request). */
export async function getLocationPermissionStatus(): Promise<
  "granted" | "denied" | "undetermined"
> {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  return "undetermined";
}

/** Request location permission. Call when user opens Events tab. Returns status after request. */
export async function requestLocationPermission(): Promise<
  "granted" | "denied" | "undetermined"
> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  return "undetermined";
}

/**
 * Get device region from location: only if permission already granted, get position + reverse geocode.
 * Does not request permission. When permission is not granted, returns null region (global events).
 */
export async function getUserRegionCodeAsync(): Promise<{
  regionCode: string | null;
  city: string | null;
}> {
  const status = await Location.getForegroundPermissionsAsync().then(
    (r) => r.status,
  );
  if (status !== "granted") {
    const stored = await getLastKnownRegionAndTown();
    return { regionCode: stored.regionCode, city: stored.city };
  }

  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
    });

    const [address] = await Location.reverseGeocodeAsync({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });

    const iso = address?.isoCountryCode;
    const regionCode = iso ? String(iso).trim().toUpperCase() : null;
    const city =
      (address?.city ?? address?.subregion ?? address?.region ?? null)?.trim() ||
      null;

    if (regionCode) await AsyncStorage.setItem(LAST_KNOWN_REGION_KEY, regionCode);
    if (city) await AsyncStorage.setItem(LAST_KNOWN_CITY_KEY, city);

    return { regionCode, city };
  } catch {
    const stored = await getLastKnownRegionAndTown();
    return { regionCode: stored.regionCode, city: stored.city };
  }
}

/** Last known region and city from location (for display in Settings). */
export async function getLastKnownRegionAndTown(): Promise<{
  regionCode: string | null;
  city: string | null;
}> {
  try {
    const [region, city] = await Promise.all([
      AsyncStorage.getItem(LAST_KNOWN_REGION_KEY),
      AsyncStorage.getItem(LAST_KNOWN_CITY_KEY),
    ]);
    return {
      regionCode: region && region.length >= 2 ? region : null,
      city: city || null,
    };
  } catch {
    return { regionCode: null, city: null };
  }
}

/** Normalize event country to ISO alpha-2 for comparison. Sheet may have "BG", "Bulgaria", etc. */
function eventCountryToRegionCode(country: string): string | null {
  const raw = country.trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (raw.length === 2) return raw.toUpperCase();
  const nameToCode: Record<string, string> = {
    bulgaria: "BG",
    "united states": "US",
    "united states of america": "US",
    usa: "US",
    "united kingdom": "GB",
    uk: "GB",
  };
  return nameToCode[lower] ?? null;
}

/** Event is for the user's country. Empty event country = global (matches all). When no location permission, only global events (no country set) are shown. */
function isEventForUserCountry(
  event: SferaEvent,
  userRegionCode: string | null,
): boolean {
  const eventHasCountry = (event.country ?? "").trim().length > 0;
  if (!userRegionCode) {
    return !eventHasCountry;
  }
  const eventRegion = eventCountryToRegionCode(event.country);
  if (!eventRegion) return true;
  return eventRegion.toUpperCase() === userRegionCode.toUpperCase();
}

/** Load cached events from AsyncStorage (for fallback when fetch fails). */
async function getCachedEvents(): Promise<SferaEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(EVENTS_CACHE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/**
 * Fetch events from the configured Google Sheet (CSV export).
 * Only active events are kept and stored locally; each fetch overrides the cache.
 * On fetch failure (network error, etc.), returns previously cached events so users still see content.
 * Active = (1) today on or before StartDate, and (2) for public/VIP only, event Country matches device region.
 * Private events are always included when active (no country filter) so unlocked private events are visible regardless of location.
 * Region comes from location permission + reverse geocode only.
 */
export async function fetchSferaEvents(): Promise<{ events: SferaEvent[] }> {
  const url = await getEventsSheetUrl();
  if (!url) return { events: await getCachedEvents() };
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { events: await getCachedEvents() };
    const text = await res.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return { events: await getCachedEvents() };

    const header = parseCsvLine(lines[0]);
    const headerIndex: Record<string, number> = {};
    header.forEach((h, i) => {
      headerIndex[h.trim().toLowerCase()] = i;
    });
    const events: SferaEvent[] = [];
    for (let i = 1; i < lines.length; i++) {
      const row = parseCsvLine(lines[i]);
      const evt = rowToEvent(row, headerIndex, i);
      if (evt) events.push(evt);
    }

    const { regionCode: userRegion } = await getUserRegionCodeAsync();

    const activeOnly = events.filter((e) => {
      if (!isEventActive(e)) return false;
      if (e.type === "private") return true;
      return isEventForUserCountry(e, userRegion);
    });
    await AsyncStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify(activeOnly));
    return { events: activeOnly };
  } catch (err) {
    console.warn("[Sfera fetch] error:", err);
    return { events: await getCachedEvents() };
  }
}

/** Get the URL used for fetching events (from storage or default). */
export async function getEventsSheetUrl(): Promise<string | null> {
  try {
    const stored = await AsyncStorage.getItem(EVENTS_SHEET_URL_KEY);
    if (stored && stored.startsWith("http")) return stored;
  } catch {}
  return DEFAULT_EVENTS_SHEET_URL;
}

/** Set a custom sheet URL (e.g. from settings). */
export async function setEventsSheetUrl(url: string | null): Promise<void> {
  if (url) await AsyncStorage.setItem(EVENTS_SHEET_URL_KEY, url);
  else await AsyncStorage.removeItem(EVENTS_SHEET_URL_KEY);
}

// --- New events detection (public + VIP only; for badge + notification) ---

export async function getLastKnownPublicVipEventIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(LAST_KNOWN_PUBLIC_VIP_IDS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export async function setLastKnownPublicVipEventIds(
  ids: Set<string>,
): Promise<void> {
  await AsyncStorage.setItem(
    LAST_KNOWN_PUBLIC_VIP_IDS_KEY,
    JSON.stringify([...ids]),
  );
}

/**
 * Fetch events, compare public+VIP IDs with last known; return events, count of new ones, and which communities have new events.
 * On first run (no last known), newCount is 0. On fetch failure, returns cached events and newCount 0.
 */
export async function fetchAndCheckForNewEvents(): Promise<{
  events: SferaEvent[];
  newCount: number;
  newCommunities: Array<"public" | "vip">;
}> {
  const { events } = await fetchSferaEvents();
  const publicEvents = events.filter((e) => e.type === "public");
  const vipEvents = events.filter((e) => e.type === "vip");
  const publicVip = [...publicEvents, ...vipEvents];
  const currentIds = new Set(publicVip.map((e) => e.id));
  const lastKnown = await getLastKnownPublicVipEventIds();

  const newCommunities: Array<"public" | "vip"> = [];
  let newCount = 0;
  if (lastKnown.size > 0) {
    let hasNewPublic = false;
    let hasNewVip = false;
    for (const e of publicVip) {
      if (!lastKnown.has(e.id)) {
        newCount++;
        if (e.type === "public") hasNewPublic = true;
        else hasNewVip = true;
      }
    }
    if (hasNewPublic) newCommunities.push("public");
    if (hasNewVip) newCommunities.push("vip");
  }

  await setLastKnownPublicVipEventIds(currentIds);
  return { events, newCount, newCommunities };
}

// --- Seen/unseen events (for badge and orbit card indicators) ---

export async function getSeenEventIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_EVENT_IDS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export async function markEventAsSeen(eventId: string): Promise<void> {
  const set = await getSeenEventIds();
  set.add(eventId);
  await AsyncStorage.setItem(SEEN_EVENT_IDS_KEY, JSON.stringify([...set]));
}

// --- Attending events (join/leave; stored locally after successful script response) ---

export async function getAttendingEventIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(ATTENDING_EVENT_IDS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export async function addAttendingEventId(eventId: string): Promise<void> {
  const set = await getAttendingEventIds();
  set.add(eventId);
  await AsyncStorage.setItem(
    ATTENDING_EVENT_IDS_KEY,
    JSON.stringify([...set]),
  );
}

export async function removeAttendingEventId(eventId: string): Promise<void> {
  const set = await getAttendingEventIds();
  set.delete(eventId);
  await AsyncStorage.setItem(
    ATTENDING_EVENT_IDS_KEY,
    JSON.stringify([...set]),
  );
}

// --- Code unlock (stored locally; used for both Private and VIP) ---

export async function getUnlockedVipCodes(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(UNLOCKED_VIP_CODES_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr.map((c) => c.toLowerCase()) : []);
  } catch {
    return new Set();
  }
}

export async function addUnlockedVipCode(code: string): Promise<void> {
  const set = await getUnlockedVipCodes();
  set.add(code.trim().toLowerCase());
  await AsyncStorage.setItem(UNLOCKED_VIP_CODES_KEY, JSON.stringify([...set]));
}

/** Returns true if the entered code matches any event in the given section (Private or VIP). */
export function validateCodeForSection(
  events: SferaEvent[],
  sectionType: "private" | "vip",
  code: string,
): boolean {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return false;
  return events.some(
    (e) =>
      e.type === sectionType &&
      (e.vipCode || "").trim().toLowerCase() === normalized,
  );
}

/** Check if the Private section is unlocked (user has a code that matches any private event). */
export function isPrivateSectionUnlocked(
  events: SferaEvent[],
  unlockedCodes: Set<string>,
): boolean {
  return events.some(
    (e) =>
      e.type === "private" &&
      e.vipCode &&
      unlockedCodes.has((e.vipCode || "").trim().toLowerCase()),
  );
}

/** Check if the VIP section is unlocked (user has a code that matches any VIP event). */
export function isVipSectionUnlocked(
  events: SferaEvent[],
  unlockedCodes: Set<string>,
): boolean {
  return events.some(
    (e) =>
      e.type === "vip" &&
      e.vipCode &&
      unlockedCodes.has((e.vipCode || "").trim().toLowerCase()),
  );
}

export async function isVipEventUnlocked(event: SferaEvent): Promise<boolean> {
  if (event.type !== "vip" || !event.vipCode) return false;
  const unlocked = await getUnlockedVipCodes();
  return unlocked.has(event.vipCode.trim().toLowerCase());
}

/** Clear all locally stored events data (cache, seen, last known, unlocked codes, sheet URL, location declined flag, attending). */
export async function clearSferaEventsStorage(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(EVENTS_SHEET_URL_KEY),
    AsyncStorage.removeItem(UNLOCKED_VIP_CODES_KEY),
    AsyncStorage.removeItem(EVENTS_CACHE_KEY),
    AsyncStorage.removeItem(LAST_KNOWN_PUBLIC_VIP_IDS_KEY),
    AsyncStorage.removeItem(SEEN_EVENT_IDS_KEY),
    AsyncStorage.removeItem(ATTENDING_EVENT_IDS_KEY),
    AsyncStorage.removeItem(LOCATION_DECLINED_KEY),
    AsyncStorage.removeItem(LAST_KNOWN_REGION_KEY),
    AsyncStorage.removeItem(LAST_KNOWN_CITY_KEY),
  ]);
}
