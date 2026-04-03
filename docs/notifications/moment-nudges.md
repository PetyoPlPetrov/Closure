# Moment Nudges

## Overview

Periodic push notifications that surface the user's recorded lessons and sunny moments as reminders to stay present and grateful. Can optionally use AI-generated summaries.

## Settings

- **Location**: Notifications screen → Push Reminders → "Moment nudges"
- **Screen**: `app/moment-notifications.tsx`

## How It Works

1. The user creates schedules per sphere and moment type (lesson or sunny moment).
2. Each schedule defines a frequency (in hours), source type, and optional sphere filter.
3. `MomentNotificationProvider` reads all schedules and schedules up to 20 one-time push notifications per schedule (iOS system limit).
4. When a notification fires, the user sees a lesson or sunny moment as a reminder.
5. Notifications rotate randomly through available messages to avoid repetition.

## Schedule Configuration

Each schedule has:

| Field | Options | Description |
|-------|---------|-------------|
| `momentType` | `lesson` / `sunny` | Which type of moment to surface |
| `sphere` | Any sphere or all | Filter moments to a specific sphere |
| `frequencyHours` | 1–168 | How often (in hours) to send |
| `source` | `moments` / `ai` / `both` | Use raw moments, AI summaries, or both |
| `enabled` | boolean | Whether this schedule is active |

## Source Types

- **`moments`**: Uses the raw lesson/sunny text the user wrote in their memories.
- **`ai`**: Uses AI-generated notification messages (requires AI entitlement / Premium).
- **`both`**: Combines raw moments and AI summaries.

AI summaries are generated and stored in `@sferas:moment_notification_summaries`. When memories are deleted, orphaned summaries are cleaned up via `deleteSummariesByMemoryIds()`.

## Paywall Gating

- `ai` and `both` sources require the **Sfera Premium** entitlement (AI access).
- Selecting these will trigger the AI paywall if not subscribed.
- An AI consent modal is shown before generating summaries.

## Scheduling Logic

- Up to **20 one-time notifications** are pre-scheduled per active schedule (iOS limitation).
- Notifications are rescheduled when the app opens or returns to foreground.
- Messages are picked randomly from the available pool for the schedule's sphere/type/source.

## Settings Screen (`app/moment-notifications.tsx`)

Displays:
- All existing schedules (grouped or flat)
- Moment count per sphere/type
- Controls to add, edit, enable/disable, or delete schedules
- Source selector with paywall for AI options
- AI summary generation trigger for manual lessons

## Relevant Files

| File | Purpose |
|------|---------|
| `utils/MomentNotificationProvider.tsx` | Core scheduling and notification management |
| `utils/moment-notification-types.ts` | TypeScript types for schedules and summaries |
| `utils/moment-notification-storage.ts` | Cleanup utility for orphaned AI summaries |
| `app/moment-notifications.tsx` | Full settings/config screen |
| `app/notifications.tsx` | Entry point link to this screen |

## Storage Keys

```
@sferas:moment_notification_schedules    // user-configured schedules
@sferas:moment_notification_summaries   // AI-generated or cached notification messages
```
