/**
 * Event memory reminders – in-app only (no phone notifications).
 * We show up to 3 in-app reminders per past attended event; when user saves a memory we clear all for that event.
 */

import * as Notifications from "expo-notifications";

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
