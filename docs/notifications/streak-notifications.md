# Streak Notifications

## Overview

Automated push notifications that motivate users to maintain their daily journaling streak. Fires reminders before the streak resets on the user's grace day (the day after their last logged memory).

## How It Works

Streak notifications are scheduled automatically. They are triggered by streak-related events throughout the app and rescheduled whenever a memory is saved.

## Notification Types

### Scheduled Reminders (grace day)

| Type | Time | Message |
|------|------|---------|
| Badge Benefit Reminder | 2 PM | "Log one memory today to keep your badge" |
| Streak Warning | 10 PM | "Streak ending soon! Only 2 hours left!" |

Both target the grace day. If the user logs a memory, they automatically reschedule to the next grace day.

The badge benefit reminder can be toggled by the user in the Streak Rules modal (enabled by default).

## Functions

| Function | Description |
|----------|-------------|
| `scheduleBadgeBenefitReminder()` | Schedule 2 PM grace-day badge reminder |
| `scheduleStreakWarning()` | Schedule 10 PM urgent reminder |
| `refreshStreakNotifications()` | Re-schedule all reminders based on current streak state |
| `cancelAllStreakNotifications()` | Cancel all scheduled streak notifications |

## Relevant Files

| File | Purpose |
|------|---------|
| `utils/streak-notifications.ts` | All streak notification scheduling logic |
| `utils/streak-badge-reminder-preference.ts` | User preference for badge benefit reminder toggle |

## Notes

- Badge benefit reminder is user-toggleable; streak warning is always active.
- Reminders are re-scheduled on app open and after every memory save.
- Badge/milestone feedback while in-app uses `showNotification()` (in-app toast), not system notifications.
