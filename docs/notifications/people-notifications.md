# People (Entity) Notifications

## Overview

Per-entity push notifications that remind users to engage with specific people (family, friends, relationships). Each entity can have custom conditions, frequency, time, and message.

## Scope

Covers **friends, family, and relationships only** — career and hobbies are intentionally excluded.

## Settings

- **Location**: Notifications screen → People → "People reminders" card → `app/entity-reminders.tsx`
- **Groups**: Family / Friends / Relationships
- **Per-entity screen**: `app/notifications/[sphere]/[entityId].tsx`

## How It Works

1. `NotificationsProvider` loads all notification templates and assignments from storage.
2. An assignment links an entity to a notification template (conditions + schedule).
3. At the scheduled time, the provider evaluates the assignment's **condition** to determine if the notification should fire.
4. If the condition is met, a system push notification is sent.
5. Notifications are rescheduled when the app opens.

## Notification Templates

A template defines:

| Field | Description |
|-------|-------------|
| `name` | Display name for this notification rule |
| `frequency` | `daily` or `weekly` |
| `time` | Time of day (hour + minute) |
| `weekday` | (Weekly only) day of week 0–6 |
| `condition` | When to actually fire (see below) |
| `message` | Custom notification body text |
| `soundEnabled` | Whether to play a sound |

## Conditions

| Condition | Description |
|-----------|-------------|
| `noRecent` | Entity has no memory logged in the last N days (default: 7) |
| `belowAvgMoments` | Entity has below-average moments compared to others in its sphere |
| `relationshipLessThanJob` | Relationship entity has fewer moments than career average |
| `relationshipLessThanFriendsAvg` | Relationship entity has fewer moments than friends sphere average |

If no condition is set, the notification fires unconditionally on schedule.

## Per-Entity Settings Screen (`app/notifications/[sphere]/[entityId].tsx`)

Displays:
- Custom notification name
- Frequency (daily / weekly)
- Time picker
- Weekday selector (weekly only)
- Condition selector
- Custom message text field
- Sound toggle
- Preview of next trigger date

## Navigation Flow

`app/notifications.tsx` → "People reminders" card → `app/entity-reminders.tsx` → per-entity row → `app/notifications/[sphere]/[entityId].tsx`

`app/entity-reminders.tsx` lists all entities grouped by sphere (Family, Friends, Relationships) with:
- Entity name
- Status badge: "On" / "Off" with bell icon
- Chevron to navigate to per-entity settings

## Relevant Files

| File | Purpose |
|------|---------|
| `utils/NotificationsProvider.tsx` | Core logic: template/assignment management, scheduling, condition evaluation |
| `app/entity-reminders.tsx` | Intermediate screen listing all people grouped by sphere |
| `app/notifications/[sphere]/[entityId].tsx` | Per-entity notification config screen |
| `app/notifications.tsx` | Main notifications hub — shows "People reminders" entry card |

## Storage Keys

```
@sferas:notification_templates      // template definitions (name, condition, schedule)
@sferas:notification_assignments    // entity → template mappings
```
