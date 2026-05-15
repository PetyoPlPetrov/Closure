# Sfera Insights Card — Redesign Brainstorm

The insight cards are the **central interactive element** on the per-sphere view. They surface entity-level data at a glance and are the natural place to integrate deeper app features (notifications, reminders, mood, streaks) without requiring users to navigate away.

## Problems with the current design

### 1. Empty state is a dead end
When an entity has zero memories, the card shows a large dashed rectangle with "0 available memories." This dominates the card and communicates *nothing useful* — the user sees empty space with no reason to come back.

### 2. Low information density
Even when populated, each mode shows one entity name, one label, one meta line, and a preview image. The card has room for more without feeling cluttered.

### 3. The carousel is invisible
Users don't discover that the card swipes between modes unless they accidentally swipe or notice the tiny pagination dots. The auto-cycle is subtle enough that users may never realize there are 3–6 different insights available.

### 4. Labels are passive, not motivating
"Oldest memory" and "Least memories" describe data. They don't prompt reflection or action. The card reads like a dashboard, not a companion.

### 5. Notification features are buried
The reminder bell only appears on modes 0–1 for family/friends. People reminders, moment nudges, event reminders — none of these surface on the card despite being directly relevant to the entity shown.

### 6. No emotional context
The card shows *what* and *when* but not *how the user feels* about an entity. Cloudy/sunny modes exist but are separate slides — there's no at-a-glance mood indicator.

---

## Proposed improvements

### A. Richer empty states

**Instead of** a dashed placeholder, show contextual prompts tied to the entity:

- **Family/friends with zero memories:** "When did you last see {name}?" with a subtle prompt to the memory creation flow (the center nav button).
- **Relationships with zero memories:** "What's the first thing you remember about {name}?"
- **Career with zero memories:** "What was your first day at {name} like?"
- **Hobbies:** "What got you into {name}?"

These are *reflection prompts* — even before the user adds a memory, the card is already doing therapeutic work. The prompt can rotate on each auto-cycle tick so it doesn't feel stale.

> The center bottom-nav button already handles memory creation, so the card shouldn't duplicate that CTA. Instead, the card's job is to **prime the user's thinking** so when they do tap the create button, they already have something in mind.

### B. Notification & reminder integration

Surface the notification state directly on the insight card instead of hiding it behind a bell icon:

- **Active reminder indicator:** If the entity has a configured reminder, show a small persistent badge (e.g., a colored dot or "Reminds weekly" chip) on the card. Users should see at a glance which entities they're tracking.
- **Overdue nudge:** When a people-reminder condition fires (e.g., no interaction in 30+ days), the card border or background should shift to a warm amber tone (this partially exists but is subtle). Add a human-readable line: "You haven't reflected on {name} in 34 days."
- **Moment nudge preview:** If a moment nudge notification was recently delivered for this entity, surface the nudged moment directly on the card — "Your sunny moment from April 12" — so the notification and the in-app experience connect.
- **Quick reminder setup:** For entities *without* reminders, show a one-tap "Remind me" chip that sets up a sensible default (weekly, 8 PM) and navigates to the detail screen only if the user wants to customize.

### C. Mood pulse / Joy meter

Add a compact mood indicator to every insight card mode, not just modes 4–5:

- **Visual:** A small arc, ring segment, or gradient bar showing the sunny-to-cloudy ratio for this entity. Warm tones for mostly sunny, cool/grey for mostly cloudy, balanced gradient for mixed.
- **Position:** Below the entity name or integrated into the avatar ring — always visible regardless of which mode is active.
- **Tap behavior:** Tapping the mood indicator could filter to the cloudy/sunny modes or open a mood breakdown view.
- **Empty state:** When no moments have mood data, show the indicator as a neutral/empty state with a subtle hint: "Add moments to see mood."

This gives the card emotional context at every swipe, not just on the dedicated cloudy/sunny slides.

### D. Carousel discoverability

Make the carousel's multi-mode nature obvious:

- **Peek animation on first visit:** When the card first appears, auto-nudge the content 20–30px to the left and back (like iOS notification peek), hinting that there's more to swipe.
- **Mode label as a pill bar:** Instead of static text + dots, show the current mode label as a tappable pill. Swiping or tapping rotates through labeled pills: `Oldest | Most recent | Most memories | ...` — this makes all available modes visible at once.
- **Progress ring instead of progress bar:** Replace the thin top bar with a subtle ring around the card border or around the entity avatar. The fill is more noticeable and ties the timer to the visual identity of the card.

### E. Contextual, warm copy

Replace data-oriented labels with reflection-oriented copy:

| Current | Proposed |
|---------|----------|
| "Oldest memory" | "It's been a while since {name}" |
| "Least memories" | "{name} has the fewest reflections" |
| "Most memories" | "You've reflected on {name} the most" |
| "Most recent" | "Your latest memory with {name}" |
| "Most cloudy" | "What weighs on you about {name}" |
| "Most sunny" | "What brings you joy with {name}" |

The copy should feel like a thoughtful friend, not a database query. Keep it short — one line, always including the entity name for personal connection.

### F. Streak integration

The app already tracks daily streaks. Surface streak context on the card:

- **If the user hasn't journaled today:** A subtle shimmer or glow on the card border reminding them their streak is active. Not intrusive — just a visual cue.
- **On milestone days:** The card could briefly show a celebratory state (e.g., "7-day streak" badge) before returning to normal insight rotation.

This turns the insight card into the app's emotional heartbeat — not just a data viewer.

---

## What the card should NOT do

- **Duplicate the create-memory CTA.** The center bottom-nav button owns that action. The card should inspire and prime, not compete with the nav.
- **Become a settings screen.** One-tap reminder setup is fine; full configuration should stay in the dedicated screens.
- **Show too many badges/indicators at once.** Pick the most relevant signal for the current mode. Mood indicator is always-on; notification badge is always-on; but nudge text and streak glow are contextual.
- **Break the swipe interaction.** All additions must respect the existing pan/tap gesture system. Tappable elements inside the card need clear hit areas that don't conflict with the card-level swipe.

---

## Priority ranking

1. **A — Richer empty states** — highest impact for lowest effort. Users with new entities see a dead card today.
2. **B — Notification integration** — connects existing features that are currently invisible on this surface.
3. **E — Warm copy** — low effort, big UX feel improvement.
4. **C — Mood pulse / Joy meter** — aligns with `feat/joy-meter` branch direction; needs design for the visual.
5. **D — Carousel discoverability** — important but less urgent than content improvements.
6. **F — Streak integration** — nice-to-have, low priority.
