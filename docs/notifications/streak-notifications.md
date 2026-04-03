# Streak Notifications

## Overview

Automated push notifications that motivate users to maintain their daily journaling streak. Fires reminders before the streak resets, and sends celebration messages on milestones.

## How It Works

Streak notifications are scheduled automatically — no user configuration required. They are triggered by streak-related events throughout the app.

## Notification Types

### Daily Reminders

| Type | Time | Message |
|------|------|---------|
| Streak Reminder | 8 PM | "Keep your streak alive!" |
| Streak Warning | 10 PM | "Streak ending soon! Only 2 hours left!" |

Both are rescheduled daily. The warning fires only if the streak hasn't been extended by 10 PM.

### Immediate Notifications (event-triggered)

| Type | Trigger | Message |
|------|---------|---------|
| Streak Started | Day 1 | Encouragement for starting |
| Streak Increment | Day 2+ | Celebration of current streak count |
| Milestone | Badge unlock | Immediate celebration notification |
| Streak Lost | Streak breaks | Gentle "come back" encouragement |

## Functions

| Function | Description |
|----------|-------------|
| `scheduleStreakReminder()` | Schedule 8 PM daily reminder |
| `scheduleStreakWarning()` | Schedule 10 PM urgent reminder |
| `sendMilestoneNotification()` | Immediate notification on badge unlock |
| `sendStreakIncrementNotification()` | Immediate notification on streak day 1/2+ |
| `sendStreakLostNotification()` | Gentle encouragement when streak breaks |

## Relevant Files

| File | Purpose |
|------|---------|
| `utils/streak-notifications.ts` | All streak notification scheduling and sending logic |

## Notes

- No user-facing settings for streak notifications — they are always active.
- Reminders are re-scheduled on app open to stay current.
- Milestone notifications fire immediately (not scheduled ahead of time).
