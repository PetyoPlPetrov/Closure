/**
 * Sfera Events – community events loaded from a published Google Sheet.
 * No backend: app fetches CSV from a public "Publish to web" URL.
 *
 * Sheet columns (header row): ID, Name, ImageLink, StartDate, Country, Town, Location, Description, Date, Privacy, Code, DiscountCode
 * - Privacy: "Social" | "Plus" | "Private"
 * - Code: required to unlock Private/Plus events (validated against sheet rows)
 * - DiscountCode: voucher code for Plus events; shown to Sfera Plus or Sfera AI subscribers
 * - ImageLink: single URL or comma-separated URLs for image carousel
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
const ATTENDED_EVENT_SNAPSHOTS_KEY = "@sferas:attended_event_snapshots";
/** Golden event AI access: one-time Create memory per event (official name). */
const EVENT_GOLDEN_MEMORY_USED_KEY = "@sferas:event_golden_memory_used";
const EVENT_REMINDER_SCHEDULED_IDS_KEY = "@sferas:event_reminder_scheduled_ids";
/** In-app reminder: 3 time-based reminders per event. No phone notifications. */
const EVENT_REMINDER_INAPP_SCHEDULE_KEY = "@sferas:event_reminder_inapp_schedule";

/** Published CSV export for SferaEvents sheet. File → Share → Publish to web → CSV, gid=0 */
const DEFAULT_EVENTS_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1MmK5LCisFoBhyx1Jwt8kWk3YixDlSMl5sYuIrnJHmiE/export?format=csv&gid=0";

export type SferaEventType = "social" | "private" | "plus";

export interface SferaEvent {
  id: string;
  name: string;
  /** Display: e.g. "Sofia, South Park" from Town + Location */
  location: string;
  description: string;
  /** Image URL(s) from sheet (ImageLink column): single URL or comma-separated. Use getEventImageUrls() for carousel. */
  imageUrl: string;
  type: SferaEventType;
  /** Code from sheet; user must enter this to unlock Private/Plus section */
  vipCode: string | null;
  /** Discount/voucher code from Discount_Code column; shown to Sfera Plus or Sfera AI subscribers for Plus events. Omitted in old cache. */
  discountCode?: string | null;
  /** Display date string from sheet */
  date: string;
  /** Start date from sheet (StartDate); event is active when current date is before this */
  startDate: string;
  /** External link for the event (EventLink column) */
  eventLink: string;
  country: string;
  town: string;
  /** "open" = can join; "closed" = event is filled (no seats left), active and upcoming. Omitted in old cache. */
  status?: "open" | "closed";
}

/** Parse imageUrl: single URL or comma-separated URLs. Returns array of trimmed non-empty URLs. */
export function getEventImageUrls(event: SferaEvent): string[] {
  const raw = (event.imageUrl ?? "").trim();
  if (!raw) return [];
  const urls = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return urls;
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
  const privacyRaw = (get("privacy") || "social").toLowerCase();
  let type: SferaEventType;
  if (privacyRaw === "private") type = "private";
  else if (privacyRaw === "plus" || privacyRaw === "vip") type = "plus";
  else type = "social"; // "public" or "social"
  const country = get("country");
  const town = get("town");
  const loc = get("location");
  const locationDisplay =
    [town, loc].filter(Boolean).join(", ") || country || "";
  const code = get("code");
  const startDateRaw = get("startdate") || get("date") || "";
  const dateDisplay = get("date") || startDateRaw;
  const statusRaw = (get("status") || "open").toLowerCase();
  const status: "open" | "closed" =
    statusRaw === "closed" ? "closed" : "open";
  // Sheet column: DiscountCode (or Discount_Code). Headers are lowercased when building headerIndex.
  const discountCodeRaw =
    get("discountcode") || get("discount_code") || get("discount code") || "";
  const discountCode = discountCodeRaw.trim() || null;

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
    vipCode: type !== "social" && code ? code : null,
    discountCode: type === "plus" ? discountCode : null,
    date: dateDisplay,
    startDate: startDateRaw,
    eventLink: get("eventlink") || get("event link") || "",
    country,
    town,
    status,
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

/** Start of day (midnight) in local time – exported for reminder scheduling. */
export function getStartOfDayExport(d: Date): Date {
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

/** Event has passed if its start date is before today (by calendar day). */
export function isEventPassed(event: SferaEvent): boolean {
  return !isEventActive(event);
}

/** Parse date string from sheet (M/D/YYYY, etc.) – exported for reminder scheduling. */
export function parseEventStartDate(s: string): Date | null {
  return parseStartDate(s);
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
 * Fetch events, compare social+Plus IDs with last known; return events, count of new ones, and which communities have new events.
 * On first run (no last known), newCount is 0. On fetch failure, returns cached events and newCount 0.
 */
export async function fetchAndCheckForNewEvents(): Promise<{
  events: SferaEvent[];
  newCount: number;
  newCommunities: Array<"social" | "plus">;
}> {
  const { events } = await fetchSferaEvents();
  const socialEvents = events.filter((e) => e.type === "social");
  const plusEvents = events.filter((e) => e.type === "plus");
  const socialPlus = [...socialEvents, ...plusEvents];
  const currentIds = new Set(socialPlus.map((e) => e.id));
  const lastKnown = await getLastKnownPublicVipEventIds();

  const newCommunities: Array<"social" | "plus"> = [];
  let newCount = 0;
  if (lastKnown.size > 0) {
    let hasNewSocial = false;
    let hasNewPlus = false;
    for (const e of socialPlus) {
      if (!lastKnown.has(e.id)) {
        newCount++;
        if (e.type === "social") hasNewSocial = true;
        else hasNewPlus = true;
      }
    }
    if (hasNewSocial) newCommunities.push("social");
    if (hasNewPlus) newCommunities.push("plus");
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

// --- Attended event snapshots (for past attended events when cache only has active events) ---

export async function getAttendedEventSnapshots(): Promise<SferaEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(ATTENDED_EVENT_SNAPSHOTS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as SferaEvent[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function addAttendedEventSnapshot(event: SferaEvent): Promise<void> {
  const list = await getAttendedEventSnapshots();
  const existing = list.findIndex((e) => e.id === event.id);
  const next = existing >= 0 ? list.map((e, i) => (i === existing ? event : e)) : [...list, event];
  await AsyncStorage.setItem(ATTENDED_EVENT_SNAPSHOTS_KEY, JSON.stringify(next));
}

/** Remove attended snapshots by IDs (e.g. when user leaves or dev mock cleanup). */
export async function removeAttendedEventSnapshotsByIds(eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return;
  const list = await getAttendedEventSnapshots();
  const idsSet = new Set(eventIds);
  const next = list.filter((e) => !idsSet.has(e.id));
  await AsyncStorage.setItem(ATTENDED_EVENT_SNAPSHOTS_KEY, JSON.stringify(next));
}

/**
 * Sync attended snapshots from the active Sfera events list: only for events the user has joined
 * (attending_event_ids) and that have passed. Call after loading events so past-attended storage
 * is derived from current event data and the joined flag.
 */
export async function syncAttendedSnapshotsFromActiveEvents(
  events: SferaEvent[],
  attendingIds: Set<string>,
): Promise<void> {
  for (const event of events) {
    if (!attendingIds.has(event.id)) continue;
    if (!isEventPassed(event)) continue;
    await addAttendedEventSnapshot(event);
  }
}

/** Past attended events: snapshots that have passed and are still in attending (user joined). */
export async function getPastAttendedEvents(): Promise<SferaEvent[]> {
  const [list, attending] = await Promise.all([
    getAttendedEventSnapshots(),
    getAttendingEventIds(),
  ]);
  const past = list.filter((e) => isEventPassed(e) && attending.has(e.id));
  if (__DEV__ && (list.length > 0 || past.length > 0)) {
    console.log("[sfera-events] getPastAttendedEvents: snapshots =", list.length, "attending =", attending.size, "past (passed+joined) =", past.length, past.map((e) => ({ id: e.id, name: e.name, startDate: e.startDate })));
  }
  return past;
}

// --- Golden event AI access (one-time Create memory per event; official name) ---

export async function getEventGoldenMemoryUsedIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(EVENT_GOLDEN_MEMORY_USED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export async function isEventGoldenMemoryUsed(eventId: string): Promise<boolean> {
  const set = await getEventGoldenMemoryUsedIds();
  return set.has(eventId);
}

export async function markEventGoldenMemoryUsed(eventId: string): Promise<void> {
  const set = await getEventGoldenMemoryUsedIds();
  set.add(eventId);
  await AsyncStorage.setItem(EVENT_GOLDEN_MEMORY_USED_KEY, JSON.stringify([...set]));
}

/** Remove golden-memory-used entries by IDs (e.g. for dev mock cleanup). */
export async function removeEventGoldenMemoryUsedIds(eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return;
  const set = await getEventGoldenMemoryUsedIds();
  eventIds.forEach((id) => set.delete(id));
  await AsyncStorage.setItem(EVENT_GOLDEN_MEMORY_USED_KEY, JSON.stringify([...set]));
}

// --- Event memory reminder scheduling (first = day+1, second = day+4) ---

export async function getEventReminderScheduledIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(EVENT_REMINDER_SCHEDULED_IDS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export async function addEventReminderScheduled(eventId: string): Promise<void> {
  const set = await getEventReminderScheduledIds();
  set.add(eventId);
  await AsyncStorage.setItem(EVENT_REMINDER_SCHEDULED_IDS_KEY, JSON.stringify([...set]));
}

/** Remove one or more event IDs from reminder-scheduled set (e.g. for dev mock cleanup). */
export async function removeEventReminderScheduledIds(eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return;
  const set = await getEventReminderScheduledIds();
  eventIds.forEach((id) => set.delete(id));
  await AsyncStorage.setItem(EVENT_REMINDER_SCHEDULED_IDS_KEY, JSON.stringify([...set]));
}

// --- In-app event memory reminder (3 time-based reminders per event; clear when user saves memory) ---
// Prod: 1 reminder per day for the next 3 days (day+1, day+2, day+3 at 10:00). Dev: 1 per minute (1min, 2min, 3min from now).

const REMINDER_HOUR = 10;
const REMINDER_MINUTE = 0;
const DEV_REMINDER_INTERVAL_MS = 60 * 1000; // 1 minute
const NUM_REMINDERS_PER_EVENT = 3;

export interface EventReminderInAppSchedule {
  dueTimes: number[]; // 3 timestamps (ms)
  shownCount: number; // 0..3
}

function computeReminderDueTimes(event: SferaEvent): number[] {
  const now = Date.now();
  if (__DEV__) {
    return [
      now + 1 * DEV_REMINDER_INTERVAL_MS,
      now + 2 * DEV_REMINDER_INTERVAL_MS,
      now + 3 * DEV_REMINDER_INTERVAL_MS,
    ];
  }
  const startDate = parseEventStartDate(event.startDate);
  if (!startDate) {
    const fallback = new Date(now);
    fallback.setDate(fallback.getDate() - 1);
    return computeDueTimesFromStartDay(getStartOfDayExport(fallback));
  }
  const startDay = getStartOfDayExport(startDate);
  return computeDueTimesFromStartDay(startDay);
}

function computeDueTimesFromStartDay(startDay: Date): number[] {
  const due1 = new Date(startDay);
  due1.setDate(due1.getDate() + 1);
  due1.setHours(REMINDER_HOUR, REMINDER_MINUTE, 0, 0);
  const due2 = new Date(startDay);
  due2.setDate(due2.getDate() + 2);
  due2.setHours(REMINDER_HOUR, REMINDER_MINUTE, 0, 0);
  const due3 = new Date(startDay);
  due3.setDate(due3.getDate() + 3);
  due3.setHours(REMINDER_HOUR, REMINDER_MINUTE, 0, 0);
  return [due1.getTime(), due2.getTime(), due3.getTime()];
}

async function getEventReminderScheduleMap(): Promise<Record<string, EventReminderInAppSchedule>> {
  try {
    const raw = await AsyncStorage.getItem(EVENT_REMINDER_INAPP_SCHEDULE_KEY);
    if (!raw) return {};
    const map = JSON.parse(raw) as Record<string, EventReminderInAppSchedule>;
    return typeof map === "object" && map !== null ? map : {};
  } catch {
    return {};
  }
}

async function setEventReminderScheduleMap(map: Record<string, EventReminderInAppSchedule>): Promise<void> {
  await AsyncStorage.setItem(EVENT_REMINDER_INAPP_SCHEDULE_KEY, JSON.stringify(map));
}

/** Get schedule for event, or null if not yet scheduled. */
export async function getEventReminderInAppSchedule(eventId: string): Promise<EventReminderInAppSchedule | null> {
  const map = await getEventReminderScheduleMap();
  const entry = map[eventId];
  if (!entry || !Array.isArray(entry.dueTimes) || entry.dueTimes.length !== NUM_REMINDERS_PER_EVENT) return null;
  const shownCount = typeof entry.shownCount === "number" ? Math.min(entry.shownCount, NUM_REMINDERS_PER_EVENT) : 0;
  return { dueTimes: entry.dueTimes, shownCount };
}

/** Get or create schedule for event (creates with due times from event.startDate). Returns schedule and whether it was just created. */
export async function getOrCreateEventReminderSchedule(event: SferaEvent): Promise<{ schedule: EventReminderInAppSchedule; created: boolean }> {
  const existing = await getEventReminderInAppSchedule(event.id);
  if (existing) return { schedule: existing, created: false };
  const dueTimes = computeReminderDueTimes(event);
  const schedule: EventReminderInAppSchedule = { dueTimes, shownCount: 0 };
  const map = await getEventReminderScheduleMap();
  map[event.id] = schedule;
  await setEventReminderScheduleMap(map);
  return { schedule, created: true };
}

/** After showing a reminder, increment shown count. Returns new count. */
export async function incrementEventReminderInAppShownCount(eventId: string): Promise<number> {
  const map = await getEventReminderScheduleMap();
  const entry = map[eventId];
  if (!entry) return 0;
  const next = Math.min((entry.shownCount ?? 0) + 1, NUM_REMINDERS_PER_EVENT);
  map[eventId] = { ...entry, shownCount: next };
  await setEventReminderScheduleMap(map);
  return next;
}

export async function getEventReminderInAppShownCount(eventId: string): Promise<number> {
  const s = await getEventReminderInAppSchedule(eventId);
  return s?.shownCount ?? 0;
}

/** Remove all in-app reminders for this event (e.g. after user saved memory or removed from orbit). */
export async function clearEventReminderInAppForEvent(eventId: string): Promise<void> {
  const map = await getEventReminderScheduleMap();
  delete map[eventId];
  await setEventReminderScheduleMap(map);
}

export async function clearEventReminderInAppForEvents(eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return;
  const map = await getEventReminderScheduleMap();
  eventIds.forEach((id) => delete map[id]);
  await setEventReminderScheduleMap(map);
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

/** Returns true if the entered code matches any event in the given section (Private or Plus). */
export function validateCodeForSection(
  events: SferaEvent[],
  sectionType: "private" | "plus",
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

/** Check if the Plus section is unlocked (user has a code that matches any Plus event). */
export function isPlusSectionUnlocked(
  events: SferaEvent[],
  unlockedCodes: Set<string>,
): boolean {
  return events.some(
    (e) =>
      e.type === "plus" &&
      e.vipCode &&
      unlockedCodes.has((e.vipCode || "").trim().toLowerCase()),
  );
}

export async function isPlusEventUnlocked(event: SferaEvent): Promise<boolean> {
  if (event.type !== "plus" || !event.vipCode) return false;
  const unlocked = await getUnlockedVipCodes();
  return unlocked.has(event.vipCode.trim().toLowerCase());
}

/** Clear all locally stored events data (cache, seen, last known, unlocked codes, sheet URL, location declined flag, attending, snapshots, golden memory, reminders). */
export async function clearSferaEventsStorage(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(EVENTS_SHEET_URL_KEY),
    AsyncStorage.removeItem(UNLOCKED_VIP_CODES_KEY),
    AsyncStorage.removeItem(EVENTS_CACHE_KEY),
    AsyncStorage.removeItem(LAST_KNOWN_PUBLIC_VIP_IDS_KEY),
    AsyncStorage.removeItem(SEEN_EVENT_IDS_KEY),
    AsyncStorage.removeItem(ATTENDING_EVENT_IDS_KEY),
    AsyncStorage.removeItem(ATTENDED_EVENT_SNAPSHOTS_KEY),
    AsyncStorage.removeItem(EVENT_GOLDEN_MEMORY_USED_KEY),
    AsyncStorage.removeItem(EVENT_REMINDER_SCHEDULED_IDS_KEY),
    AsyncStorage.removeItem(EVENT_REMINDER_INAPP_SCHEDULE_KEY),
    AsyncStorage.removeItem(LOCATION_DECLINED_KEY),
    AsyncStorage.removeItem(LAST_KNOWN_REGION_KEY),
    AsyncStorage.removeItem(LAST_KNOWN_CITY_KEY),
  ]);
}
