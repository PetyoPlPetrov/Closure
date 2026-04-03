# Event Memory Reminders

## Overview

Push reminders that prompt users to capture memories after events they've attended. These are system-level push notifications (unlike event in-app banners) and are configured per event.

## Settings

- **Location**: Notifications screen → Push Reminders → "Event Memory Reminders"
- **Screen**: `app/event-reminders.tsx`
- **No global toggle** — managed per-event

## How It Works

1. When a user joins an event, a reminder schedule is created via `getOrCreateEventReminderSchedule()`.
2. The schedule defines up to 3 reminder times after the event.
3. Reminders appear as system push notifications with the message to capture a memory.
4. Each reminder can be individually cancelled from the Event Reminders settings screen.
5. All reminders for an event are cleared when the user creates a memory linked to that event.

## Schedule Rules

- **Prod**: Day+1, Day+2, Day+3 after event at 9 AM, 2 PM, 7 PM
- **Dev**: 1-minute intervals for testing
- Maximum **3 reminders per event**
- A reminder is marked as shown and not repeated

## Settings Screen (`app/event-reminders.tsx`)

Displays:
- List of all events with scheduled reminders
- Event name and location
- Reminder timing (relative: "in X minutes/hours/days" or "overdue")
- Toggle to cancel a specific reminder
- Overdue reminders highlighted

## Relevant Files

| File | Purpose |
|------|---------|
| `utils/event-memory-reminders.ts` | Core scheduling logic for in-app and push variants |
| `utils/sfera-events.ts` | Event join triggers reminder creation |
| `app/event-reminders.tsx` | Settings screen to view/cancel reminders |
| `app/notifications.tsx` | Entry point link to this screen |

## Storage Keys

```
@sferas:event_reminder_inapp_schedule    // in-app reminder schedules (3 per event)
@sferas:event_reminder_scheduled_ids    // tracks which events have reminders set
```
