# In-App Notifications for Events

## Overview

An in-app banner system that shows reminders and celebrations related to Sferas events — triggered while the user is actively using the app (no system push required).

## Settings

- **Location**: Notifications screen → Banners & Alerts section
- **Toggle**: "In-app notifications for events"
- **Default**: Enabled
- **Storage key**: `@sferas:event_in_app_notifications_enabled`

## How It Works

1. When the app opens or returns to foreground, `showEventMemoryReminderIfNeeded()` is called from `app/_layout.tsx`.
2. It checks `@sferas:event_reminder_inapp_schedule` for any pending reminders whose trigger time has passed.
3. If found and the preference is enabled, the `InAppNotificationProvider` displays an animated banner at the top of the screen.
4. The banner auto-dismisses or can be manually closed.

## Trigger Rules

- Reminders are set when a user joins an event (via `getOrCreateEventReminderSchedule()`).
- Up to **3 reminders per event** are scheduled:
  - **Prod**: Day+1, Day+2, Day+3 after the event at 9 AM, 2 PM, and 7 PM
  - **Dev**: 1-minute intervals for testing
- A reminder is only shown once per scheduled slot.
- All reminders for an event are cleared when the user creates a memory for that event.

## Relevant Files

| File | Purpose |
|------|---------|
| `utils/event-memory-reminders.ts` | Core reminder scheduling and retrieval logic |
| `utils/sfera-events.ts` | Event join hook that triggers reminder creation |
| `utils/event-in-app-notification-preference.ts` | Persist/read the enable/disable preference |
| `utils/EventInAppNotificationPreferenceProvider.tsx` | React context exposing the preference |
| `utils/InAppNotificationProvider.tsx` | Displays the in-app banner UI |
| `components/in-app-notification.tsx` | Animated banner component |
| `app/notifications.tsx` | Settings toggle UI |
| `app/_layout.tsx` | Triggers check on app focus |

## Storage Keys

```
@sferas:event_in_app_notifications_enabled   // boolean preference
@sferas:event_reminder_inapp_schedule        // pending reminder schedule per event
```
