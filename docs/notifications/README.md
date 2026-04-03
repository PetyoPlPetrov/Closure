# Notifications

Sferas has five distinct notification features. Each is documented separately:

| Feature | Type | Configurable | Doc |
|---------|------|-------------|-----|
| [In-App Event Notifications](./in-app-event-notifications.md) | In-app banner | Global toggle | Banners triggered while app is open for events the user joined |
| [Event Memory Reminders](./event-memory-reminders.md) | Push (system) | Per-event | Reminders to capture memories after attended events |
| [Moment Nudges](./moment-nudges.md) | Push (system) | Per-schedule | Periodic reminders surfacing lessons & sunny moments |
| [People Notifications](./people-notifications.md) | Push (system) | Per-entity | Custom reminders for specific people (family/friends/relationships) |
| [Streak Notifications](./streak-notifications.md) | Push (system) | None (automatic) | Daily streak reminders and milestone celebrations |

## Architecture

All notification logic lives in `utils/`. The app layout (`app/_layout.tsx`) wires up providers and triggers reschedule on app focus.

### Providers

| Provider | Responsibility |
|----------|---------------|
| `NotificationsProvider` | Per-entity push notifications |
| `InAppNotificationProvider` | In-app banner display |
| `EventInAppNotificationPreferenceProvider` | Event banner enable/disable preference |
| `MomentNotificationProvider` | Moment nudge push notifications |

### Settings Entry Point

All notification settings are accessible from `app/notifications.tsx`.
