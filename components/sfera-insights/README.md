# Sfera Insight Cards — State Reference

Each insight card auto-cycles and is swipeable. This document describes what the user sees on each card, in each state, across all sferas.

## Visibility per sfera

| Card | Family | Friends | Relationships | Career | Hobbies |
|------|--------|---------|---------------|--------|---------|
| Least memories (0) | yes | yes | **hidden** | **hidden** | yes |
| Oldest memory (1) | yes | yes | **hidden** | **hidden** | yes |
| Most recent (2) | yes | yes | **hidden** | **hidden** | yes |
| Most memories (3) | yes | yes | yes | yes | yes |
| Most cloudy (4) | yes | yes | yes | yes | **hidden** |
| Most sunny (5) | yes | yes | yes | yes | **hidden** |

Additionally, mode 4 is removed entirely if `maxCloudyScore <= 0` and mode 5 is removed if `maxSunnyScore <= 0`, regardless of sfera.

---

## Card 0 — Least Memories

Highlights the entity with the fewest recorded memories.

**Label:**
- Default: "Least memories"
- Hobbies: "Least memories"

### Normal state (entity has memories)

- **Title row:** entity name
- **Meta row:** time-ago label (today / Xd ago / Xmo ago) + optional reminder bell (Family & Friends only)
- **Body:** memory preview — photo with title caption bar, or title + description text if no photo
- Tapping body opens the memory

### Empty state (entity has 0 memories)

- **Title row:** entity name
- **Meta row:** time-ago (empty), optional reminder bell
- **Body:** dashed-border area with:
  - Rotating reflection prompt (one of 3, cycles with auto-tick):
    - Family: "When did you last see {name}?" / "What's your favorite memory with {name}?" / "What would you tell {name} right now?"
    - Friends: "When did you last see {name}?" / "What makes {name} special to you?" / "What's something {name} doesn't know about you?"
    - Hobbies: "What got you into {name}?" / "How does {name} make you feel?" / "When do you feel most alive doing {name}?"
    - *(Career & Relationships: card is hidden, prompts never shown)*
  - **"Add your first memory"** pill button → opens entity detail

---

## Card 1 — Oldest Memory

Highlights the entity whose most recent memory is the oldest (longest time without interaction). Family & Friends prefer starting on this card.

**Label:**
- Default: "Oldest memory"
- Hobbies: "Longest not done"

### Normal state

- **Title row:** entity name
- **Meta row:** time-ago label + optional reminder bell (Family & Friends) + urgency amber tint if > 30 days
- **Body:** memory preview (photo + caption, or title + description)
- Tapping body opens the memory

### Empty state (entity has 0 memories)

Same as Card 0 empty state — dashed area with rotating reflection prompt + "Add your first memory" button.

---

## Card 2 — Most Recent Memory

Highlights the newest memory by `updatedAt`.

**Label:**
- Default: "Most recent memory"
- Hobbies: "Most recently done"

### Normal state

- **Title row:** entity name
- **Meta row:** time-ago label
- **Body:** memory preview (photo + caption bar, or title + description text)
- Tapping body opens the memory

### Empty state

This card only appears for Family, Friends, Hobbies. If the highlighted entity has no memories, no body content renders (the card shows label + entity name only). In practice this is rare since "most recent" implies at least one memory exists.

---

## Card 3 — Most Memories

Highlights the entity with the highest memory count. Visible on all sferas.

**Label:** "Most memories"

### Normal state

- **Title row:** entity name
- **Meta row:** "{count} memories"
- **Body:** up to 8 scattered circular bubbles at fixed positions:
  - Each bubble shows a memory photo thumbnail, or a photo icon if no image
  - Bubble sizes vary (36 / 44 / 52 px)
  - Bordered with mood color (sunny or cloudy tint per memory)
  - Each bubble is tappable → opens that memory

### Empty state

If the entity with the most memories still has 0 memories, the body is empty (no bubbles render). The card shows label + entity name + "0 memories" meta text.

---

## Card 4 — Most Cloudy

Highlights the memory with the most hard truths (cloudy moments). **Hidden for Hobbies.** Also removed if no entity has any hard truths (`maxCloudyScore <= 0`).

**Label:** "Most cloudy"

### Normal state

- **Title row:** entity name
- **Meta row:** "1 cloudy moment" or "{count} cloudy moments" (amber/cloudy text color)
- **Card border:** tinted with cloudy mood color
- **Body:** memory preview — photo with mood-tinted caption bar, or title + description
  - Title falls back to first hard truth text if memory title is empty
- Tapping body opens the memory

### Empty state

This card is dynamically removed when there are no cloudy moments, so an empty state is not shown.

---

## Card 5 — Most Sunny

Highlights the memory with the most good facts (sunny moments). **Hidden for Hobbies.** Also removed if no entity has any good facts (`maxSunnyScore <= 0`).

**Label:**
- Default: "Most sunny"
- Hobbies: *(hidden, never shown)*

### Normal state

- **Title row:** entity name
- **Meta row:** "1 sunny moment" or "{count} sunny moments" (golden/sunny text color)
- **Card border:** tinted with sunny mood color
- **Body:** memory preview — photo with mood-tinted caption bar, or title + description
  - Title falls back to first good fact text if memory title is empty
- Tapping body opens the memory

### Empty state

This card is dynamically removed when there are no sunny moments, so an empty state is not shown.

---

## Global empty states (before any card renders)

These replace the entire insight carousel.

### No entities in the sfera

Single card with:
- **Warm text** (italic, sphere-specific):
  - Relationships: "Start by adding someone who shaped your story."
  - Career: "Add a career chapter to start reflecting."
  - Family: "Add a family member to start reflecting."
  - Friends: "Add a friend to start reflecting."
  - Hobbies: "Add something you love doing."
- **Guide link:** "Learn how to add [type] **here**" → opens Recording Memories guide

### Entities exist but zero total memories across the sfera

Single card with:
- **Reflection prompt** (sphere-specific):
  - Relationships: "What comes to mind when you think about this sphere?"
  - Career: "What moment at work changed how you see things?"
  - Family: "Think of a family moment worth holding on to."
  - Friends: "What's a moment with a friend you'd love to relive?"
  - Hobbies: "When did a hobby bring you unexpected joy?"
- **"Add your first memory"** pill button → opens entity detail
- Optional hint bubble below card: "Tap a person to add your first memory"

---

## Orbit view (sphere overview)

Simpler 3-mode card shown in the orbit/overview screen. Auto-cycles every 4 500 ms.

### Orbit mode 0 — Least Memories
- Icon: `person-outline`
- Shows entity with fewest memories, entity name, subtext

### Orbit mode 1 — Most Memories
- Icon: `star`
- Shows entity with most memories, entity name, subtext

### Orbit mode 2 — Recently Active
- Icon: `schedule`
- Shows entity with most recently updated memory, entity name, subtext

### Orbit empty: no entities
- Short message: "No [type] added."
- Guide link → Recording Memories guide

### Orbit empty: entities but zero memories
- "Add memories to begin" text
- **"Add your first memory"** button → triggers need-memories hint

---

## Shared UI elements

- **Progress bar:** 3 px animated bar at top of card, fills left→right over the auto-cycle interval
- **Pagination dots:** bottom of card, active dot is wider (14 px vs 6 px)
- **Expand/collapse toggle:** unfold icon below dots
- **Chevron arrows:** left/right of card for manual mode switching
- **Reminder bell:** only on modes 0 & 1, only for Family & Friends sferas

## Key files

| File | What |
|------|------|
| `focused-entities-view.tsx` | Per-entity carousel cards (modes 0–5) |
| `focused-sfera-view.tsx` | Orbit overview cards (3 modes) |
| `sfera-insight-empty-guide-link.tsx` | "Learn how… here" guide link component |
| `utils/sfera-insight-empty-entities.ts` | Translation key helpers for empty/reflection states |
| `utils/languages/translations.ts` | All `sferaInsight.*` strings (EN + BG) |
