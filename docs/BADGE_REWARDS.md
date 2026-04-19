# Badge Rewards System

Streak-driven badges that unlock concrete in-app rewards for free users while
they keep a daily memory-logging habit.

## TL;DR

- Earn a badge by logging at least one memory per day (manual or AI modal —
  both count) for N consecutive days.
- Each badge unlocks a specific, tangible reward.
- Rewards are **active only while the badge is currently active**. The moment
  the streak drops below the badge's day threshold, the reward goes away.
- A 1-day grace period applies: missing one day puts you "at risk" but does not
  break the streak. Missing two days in a row breaks it.

## Badges

The 4 active streak badges live in `utils/streak-types.ts`:

| Badge   | Days | Rarity     | Emoji |
| ------- | ---- | ---------- | ----- |
| Ignite  | 1    | common     | ✨    |
| Pulse   | 3    | common     | 🔥    |
| Nova    | 7    | rare       | 🌟    |
| Sferas  | 14   | legendary  | 🏆    |

## Reward Rules

| Badge   | Threshold | Reward |
| ------- | --------- | ------ |
| Ignite  | 1 day     | Starts the streak progression. No paid feature unlocked. |
| Pulse   | 3 days    | Unlocks **Moment Colors** editing for non-subscribed users. |
| Nova    | 7 days    | Raises the **free entity cap per sfera** from `2` → `5`. |
| Sferas  | 14 days   | Raises **free AI modal daily requests** from `3` → `5`, raises **free lesson-check / wheel exam daily uses** from `3` → `5`, and surfaces special Sferas Plus / private-events ticket messaging in the badge description. |

Subscribers (Sfera Plus / Sfera AI) always retain their subscription
entitlements; badges only affect free-user limits and never reduce a paid
benefit. Subscription checks always run *after* the badge bumps the limit, so
crossing the limit still routes the user through the existing paywall flow.

## How a "day" is counted

A day counts as soon as **one memory is saved** — from either entry point:

1. The manual `add-idealized-memory` screen save.
2. The AI modal save (`components/ai-modal.tsx`) and the AI entity-creation modal.

Both paths call `updateStreakOnMemoryCreation()` after persisting the memory.
Days are stored as YYYY-MM-DD strings in **local time** (not UTC), in the
`memoryLogDates` array of `StreakData`.

## Streak Calculation (lenient with 1-day grace)

Implemented in `calculateConsecutiveDays(memoryLogDates)` in
`utils/streak-manager.ts`. Walking backward from today, the chain stays alive
if **either today or yesterday** is in the log:

- `today` is in the log → chain starts at today.
- `today` is not in the log but `yesterday` is → chain starts at yesterday
  (this is the **grace day** — the user has the rest of today to log and grow
  the chain).
- Neither is in the log → chain is broken, returns `0`.

Concrete example: user logs on day 1, day 2, day 3.

| Moment                                   | `today` | `yesterday` | Chain anchor | Streak | Pulse badge? |
| ---------------------------------------- | ------- | ----------- | ------------ | ------ | ------------ |
| End of day 3, just after save            | day 3   | day 2       | day 3        | 3      | Yes          |
| Day 4 morning (no log yet)               | day 4   | day 3       | day 3 (grace)| 3      | Yes (grace)  |
| Day 4, 11 AM, user logs                  | day 4   | day 3       | day 4        | 4      | Yes (grew)   |
| Day 4 fully ends without logging         | day 4   | day 3       | day 3 (grace)| 3      | Yes          |
| Day 5 starts (still no day-4 log)        | day 5   | day 4       | (broken)     | 0      | No           |

The badge drops at the moment day 5 begins, because by then both today and
yesterday are missing from the log.

`recalculateStreak()` re-runs this calculation on app open and after every
save, then writes `currentStreak`, `currentBadge`, `earnedBadges` back to
storage. Storage retention is 30 days (`STREAK_LOG_LOOKBACK_DAYS`) so 14-day
Sferas progression has room to be tracked.

## Backward compatibility (stale storage + new badges)

When badge rules evolve (for example, adding new badge tiers later), existing
users keep their streak progress and automatically receive any newly eligible
badges. The same machinery also reconciles state across day rollovers without
requiring a memory save.

This is handled by normalization inside `getStreakData()` in
`utils/streak-manager.ts`:

- Recomputes live `currentStreak` from `memoryLogDates` (instead of trusting
  the stale stored `currentStreak` value).
- Bumps `longestStreak` to `max(stored, liveCurrentStreak)` so it never
  shrinks but does grow when a fresh recompute exceeds the stored value.
- Recomputes live `currentBadge` from that streak using the **current**
  `STREAK_BADGES` list.
- Prunes `memoryLogDates` to the 30-day retention window.
- Recomputes `earnedBadges` from `longestStreak` using the **current**
  `STREAK_BADGES` list. `checkNewBadges` only ever appends, so previously
  earned badges that have since been removed/renamed in code are not revoked.
- Persists the normalized result if any field is stale/missing **and** emits
  `notifyBadgeRewardsChanged()` so already-mounted reward consumers refresh
  immediately (see next section).

This means the first call to `getStreakData()` after one of these events
reconciles storage and notifies subscribers in a single pass:

| Trigger                                                    | What gets normalized                          | Notify fires? |
| ---------------------------------------------------------- | --------------------------------------------- | ------------- |
| Day rolled over since last open (badge demotion)           | `currentStreak`, `currentBadge`               | Yes           |
| App update introduced a new `STREAK_BADGES` tier           | `earnedBadges` (and `currentBadge` if active) | Yes           |
| Logs older than 30 days exist                              | `memoryLogDates` pruning                      | Yes           |
| Migration from pre-`earnedBadges` storage                  | `earnedBadges` populated from `longestStreak` | Yes           |
| Storage already in sync (steady state, repeat reads)       | Nothing                                       | No            |

Recursion is avoided because any listener that re-enters via `getStreakData()`
sees the now-normalized data, `shouldPersistNormalizedData` evaluates to
`false`, and no further notification fires.

`recalculateStreak()` is kept as a thin convenience wrapper that re-reads via
`getStreakData()` and still emits a notify if its own diff check ever sees a
change. In practice that diff is `false` (because `getStreakData()` already
normalized the storage), so the notify path inside `recalculateStreak()` is a
defensive no-op — the real reconciliation now happens on read.

## Live reward refresh (in-process event bus)

Reward unlocks/downgrades are recomputed every time the streak changes, even
mid-session. The mechanism lives in `utils/badge-rewards-events.ts`:

- `notifyBadgeRewardsChanged()` is called from `streak-manager.ts`:
  - After every `updateStreakOnMemoryCreation` save.
  - From `getStreakData()` whenever it persists a normalized change (day
    rollover demotion, retroactive new-badge unlock after an app update,
    initial migration, log pruning).
  - From `recalculateStreak()` if its own diff check ever triggers (defensive
    — typically a no-op now that `getStreakData` reconciles on read).
- `subscribeBadgeRewardsChanged(listener)` is consumed by:
  - `utils/MomentColorsProvider.tsx` — refreshes `hasBadgeAccess` so custom
    moment colors render across the app the moment the user crosses Pulse.
  - `components/ai-modal.tsx` and `components/ai-action-modal.tsx` — refresh
    the displayed `freeAIDailyLimit` and `remainingAIRequests` so the "X of
    5" copy flips immediately when the user crosses Sferas while the modal is
    open.
  - `utils/streak-notifications.ts` — re-schedules grace-day reminders (see
    next section).

The exam rate limiter and entity-add screens query the badge state at call
time, so they don't need a subscription.

## Notifications (grace-day reminders)

Three notifications fire on the user's **grace day** — the day after their
last log. The decision lives in `getGraceDayTrigger(streakData, hour)` in
`utils/streak-notifications.ts`:

- Last log = today → grace day is tomorrow (schedule for tomorrow at `hour`).
- Last log = yesterday → today IS the grace day (schedule for today at `hour`
  if not yet passed).
- Last log older than yesterday → streak already broken, no reminder.

The three reminders use this same trigger:

| ID                              | Time  | Purpose |
| ------------------------------- | ----- | ------- |
| `streak-badge-benefit-reminder` | 2 PM  | "Keep your X badge — log today to keep your reward." User-toggleable from the streak rules modal. |
| `streak-reminder`               | 8 PM  | "Keep your streak alive!" |
| `streak-warning`                | 10 PM | "⚠️ Streak ending soon!" Last-chance warning. |

**Why pre-scheduling matters.** When the user logs on day 3 and closes the
app, the day-4 reminders are already committed to the OS. They will fire even
if the app is never opened on day 4. This is achieved by a module-level
subscription in `utils/streak-notifications.ts`:

```ts
subscribeBadgeRewardsChanged(() => {
  void refreshStreakNotifications();
});
```

Every memory save / streak recompute → emits → re-runs all three schedule
functions → cancels stale reminders and queues fresh grace-day reminders.

The `refreshStreakNotifications()` function is also called explicitly when the
home screen mounts (`loadStreakData`) and when the rules modal toggles the
benefit-reminder preference, as additional safety nets.

## Module map

### Core

- `utils/streak-types.ts` — `StreakData`, `StreakBadge`, `STREAK_BADGES`,
  `STREAK_MILESTONES`, `STORAGE_KEY`.
- `utils/streak-manager.ts` — `calculateConsecutiveDays` (lenient),
  `updateStreakOnMemoryCreation`, `recalculateStreak`, `isStreakAtRisk`,
  `getDaysUntilStreakLost`, `getCurrentBadge`, `getNextBadge`,
  `getEarnedBadges`. Emits `notifyBadgeRewardsChanged()` after every save.
- `utils/badge-rewards.ts` — single source of truth for all reward checks:
  `hasPulseBadgeActive`, `hasNovaBadgeActive`, `hasSferasBadgeActive`,
  `canUseMomentColorEditingWithoutSubscription`,
  `getFreeEntityLimitPerSfera`, `getFreeAIDailyLimit`,
  `getFreeExamDailyLimit`. Always recomputes from the log so the result can
  never be stale.
- `utils/badge-rewards-events.ts` — tiny in-process pub/sub
  (`notifyBadgeRewardsChanged`, `subscribeBadgeRewardsChanged`).
- `utils/streak-badge-reminder-preference.ts` — AsyncStorage toggle for the
  2 PM badge benefit reminder.

### Reward integrations

- **Moment colors unlock** — `utils/MomentColorsProvider.tsx`,
  `app/moment-colors.tsx`. The provider gates `momentColors` on
  `isSubscribed || hasBadgeAccess`. The screen's `handleSave` re-checks badge
  access at save time and falls back to the paywall if neither qualifies.
- **Entity cap unlock** — `app/(tabs)/add-ex-profile.tsx`,
  `app/(tabs)/add-job.tsx`, `app/(tabs)/add-family-member.tsx`,
  `app/(tabs)/add-friend.tsx`, `app/(tabs)/add-hobby.tsx`. Each calls
  `await getFreeEntityLimitPerSfera()` before checking
  `hasEntityLimitEntitlement`/paywall.
- **AI daily limit unlock** — `utils/ai-rate-limiter.ts`
  (`consumeAIRequestIfAvailable`, `getRemainingAIRequests`,
  `getTimeUntilNextRequest` all `await getFreeAIDailyLimit()` for free users;
  premium gets the static 30/day). Consumed by `components/ai-modal.tsx`,
  `components/ai-entity-creation-modal.tsx`, `components/ai-action-modal.tsx`.
- **Wheel/lesson exam daily limit unlock** —
  `utils/universe-exam-rate-limiter.ts` (`consumeUniverseExamIfAvailable`,
  `canUseExam`, `getRemainingUniverseExams` all `await
  getFreeExamDailyLimit()` for non-AI-entitled users; AI entitlement
  bypasses the limit entirely).

### UI / copy

- `components/streak-rules-modal.tsx` — Shows each badge with earned/locked
  state derived from the live `currentStreak`, the per-badge reward line,
  and the toggle for the 2 PM benefit reminder.
- `components/streak-badge.tsx` — Floating top-right badge in the home view.
- `utils/languages/translations.ts` — `streakRules.badge.{ignite|pulse|nova|sferas}.{name|description|reward}`,
  `streakRules.reminder.toggleTitle`, `streakRules.reminder.toggleDescription`.
- `utils/streak-notifications.ts` — Grace-day reminder scheduling +
  milestone/increment/lost notifications.
- Streak update notifications inside `app/(tabs)/add-idealized-memory.tsx`
  and `components/ai-modal.tsx` — In-app toast/badge celebrations on save
  (new badge, new milestone, streak increment).

## Subscriber-aware design

Every reward check is structured so that subscriptions take precedence over
badges, and badges take precedence over the default free limit:

- **AI:** `isSubscribed ? 30 : await getFreeAIDailyLimit()` (3 or 5).
- **Exam:** `if (hasAIEntitlement) return true;` else `await getFreeExamDailyLimit()` (3 or 5).
- **Entity cap:** Badge raises threshold from 2 to 5; once exceeded, the
  existing `hasEntityLimitEntitlement` paywall flow runs unchanged.
- **Moment colors:** `isSubscribed || hasBadgeAccess`. Subscribers are never
  blocked.

This means turning the badge feature on or off can never reduce or break a
paid feature.

## Storage keys

- `@sferas:streak_data` — `StreakData` (badges, current/longest streak,
  `memoryLogDates`, etc.).
- `@sferas:streak_badge_benefit_reminder_enabled` — bool, defaults true.
- `@sferas:ai_requests` — daily AI request usage.
- `@sferas:universe_exam_usage` — daily exam usage.
- `@sferas:moment_colors` — saved custom moment colors (only displayed when
  subscribed or badge-unlocked).

## Design notes

- Badge rewards are **dynamic**, not permanently unlocked. They are
  recomputed from the live streak on every relevant call.
- The 1-day grace period exists so the user has the entire next day to log
  and keep the streak. The streak only breaks at the start of the day after
  the grace day (i.e. when both today and yesterday are missing from the
  log).
- All date arithmetic uses local time (`getLocalDateString`), not UTC.
  Logging at 11 PM and again at 1 AM the next day correctly counts as two
  separate days.
- The `STREAK_LOG_LOOKBACK_DAYS = 30` retention window keeps storage bounded
  while still covering the 14-day Sferas badge with margin.
- The badge rules modal grays out badges the user doesn't currently hold,
  reinforcing that rewards are tied to the *active* badge — not historic
  earnings.
