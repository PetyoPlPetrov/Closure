/**
 * Event memory reminders – in-app only (no phone notifications).
 * We show up to 3 in-app reminders per past attended event; when user saves a memory we clear all for that event.
 */

import * as Notifications from "expo-notifications";
import {
  addAttendedEventSnapshot,
  addAttendingEventId,
  getAttendedEventSnapshots,
  isEventPassed,
  removeAttendedEventSnapshotsByIds,
  removeAttendingEventId,
  removeEventGoldenMemoryUsedIds,
  removeEventReminderScheduledIds,
  type SferaEvent,
} from "./sfera-events";

const REMINDER_PREFIX_1 = "event_memory_reminder_";
const REMINDER_SUFFIX_2 = "_2";

function reminderId1(eventId: string): string {
  return `${REMINDER_PREFIX_1}${eventId}`;
}

function reminderId2(eventId: string): string {
  return `${REMINDER_PREFIX_1}${eventId}${REMINDER_SUFFIX_2}`;
}

/** No-op: we no longer schedule phone notifications; reminders are in-app only (see _layout showEventMemoryReminderIfNeeded). */
export async function scheduleEventMemoryReminders(): Promise<void> {
  // In-app reminders are shown from _layout on app open/active; up to 3 per event (tracked in sfera-events).
}

/** Cancel any previously scheduled system notifications for this event (cleanup only). */
export async function cancelEventMemoryReminders(eventId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(reminderId1(eventId));
    await Notifications.cancelScheduledNotificationAsync(reminderId2(eventId));
  } catch {
    // ignore
  }
}

// --- Dev: mock past events for testing in-app reminders ---

const MOCK_DEV_EVENT_ID_PREFIX = "mock-dev-event-";

function isMockDevEventId(id: string): boolean {
  return id.startsWith(MOCK_DEV_EVENT_ID_PREFIX);
}

function formatStartDateForSheet(d: Date): string {
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear();
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${month}/${day}/${year} ${h}:${m}:${s}`;
}

/**
 * Dev only: clear old mock events from storage, then seed new mock events that count as past.
 * In-app reminders will show on next app open/active (up to 3 times per event).
 */
export async function seedMockPastEventsForDev(): Promise<void> {
  if (!__DEV__) return;

  const { clearEventReminderInAppForEvents } = await import("./sfera-events");

  const snapshots = await getAttendedEventSnapshots();
  const mockIds = snapshots.filter((e) => isMockDevEventId(e.id)).map((e) => e.id);
  if (mockIds.length > 0) {
    await removeAttendedEventSnapshotsByIds(mockIds);
    for (const id of mockIds) {
      await removeAttendingEventId(id);
    }
    await removeEventReminderScheduledIds(mockIds);
    await removeEventGoldenMemoryUsedIds(mockIds);
    await clearEventReminderInAppForEvents(mockIds);
    for (const id of mockIds) {
      await cancelEventMemoryReminders(id);
    }
  }

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(10, 0, 0, 0);
  const startDateStr = formatStartDateForSheet(yesterday);

  const mockEvents: SferaEvent[] = [
    {
      id: `${MOCK_DEV_EVENT_ID_PREFIX}1`,
      name: "Dev Test Event Alpha",
      location: "Test Location",
      description: "Mock event for notification testing",
      imageUrl: "",
      type: "social",
      vipCode: null,
      date: startDateStr,
      startDate: startDateStr,
      eventLink: "",
      country: "",
      town: "",
    },
    {
      id: `${MOCK_DEV_EVENT_ID_PREFIX}2`,
      name: "Dev Test Event Beta",
      location: "Another Test Location",
      description: "Second mock event for notification testing",
      imageUrl: "",
      type: "social",
      vipCode: null,
      date: startDateStr,
      startDate: startDateStr,
      eventLink: "",
      country: "",
      town: "",
    },
  ];

  for (const event of mockEvents) {
    await addAttendingEventId(event.id);
    await addAttendedEventSnapshot(event);
  }

  console.log(
    "[Event memory reminders] Dev: seeded",
    mockEvents.length,
    "mock past events. In-app reminder will show on next app open/active (up to 3 times per event).",
    mockEvents.map((e) => ({ id: e.id, name: e.name, startDate: e.startDate })),
  );

  const verifySnapshots = await getAttendedEventSnapshots();
  const verifyPast = verifySnapshots.filter(isEventPassed);
  console.log("[Event memory reminders] Dev: after seed – snapshots:", verifySnapshots.length, "past:", verifyPast.length, "ids:", verifyPast.map((e) => e.id));
}
