# Sfera Insights card

Implementation: `SferaInsightsCard` in [`../focused-entities-view.tsx`](../focused-entities-view.tsx) (central carousel card on the focused-entities / per-sphere view).

## Insight modes (conceptual indices 0–5)

| Mode | Label (typical) | Notes |
|------|-----------------|--------|
| 0 | Least memories / least practiced | Sphere-specific copy |
| 1 | Oldest interaction / last practiced | Family & friends: social row + optional event card |
| 2 | Most recent memory | |
| 3 | Most memories | Scattered memory bubbles |
| 4 | Most cloudy | Hard truths (cloudy moments) |
| 5 | Most sunny | Good facts (sunny moments) |

## Sphere-specific hidden modes

- **Career & relationships:** modes `0`, `1`, `2` are hidden (processing-focused spheres, not “social orbit” insights).
- **Hobbies:** modes `4` and `5` are hidden (cloudy/sunny framing does not apply).

## When a mode is omitted entirely

After applying hidden modes above, **do not include** a slide if:

- **Mode 4 (Most cloudy):** `maxCloudyScore <= 0` — no hard-truth moments anywhere in that sphere.
- **Mode 5 (Most sunny):** `maxSunnyScore <= 0` — no good-fact moments anywhere in that sphere.

Scores come from `getInteractionIndices()` in the same file (`maxCloudyScore` / `maxSunnyScore`).

Empty or misleading slides (e.g. “Most cloudy” with **0** cloudy moments) should not appear.

## Memory preview (modes 2, 4, 5)

- If the highlighted memory has **`imageUri`**, show the image plus title bar as before.
- If there is **no image**, still fill the body: show **title** (and **description** when present). Title may fall back to a representative hard truth / good fact line when the title is empty.
- The preview is tappable and should open the relevant entity (same as before).

Do not return `null` for the main body only because the image is missing — that produced blank cards.

## Carousel index behavior

- When the allowed mode list **shrinks** (e.g. mood data changes), **clamp** `modeIdx` so it stays valid.
- When the **sphere** changes, **reset** the index (family/friends still prefer **oldest interaction**, mode `1`, when that mode is present).

## Copy (i18n)

Cloudy/sunny counts use:

- `sferaInsight.cloudyMomentsOne` / `sferaInsight.cloudyMomentsMany`
- `sferaInsight.sunnyMomentsOne` / `sferaInsight.sunnyMomentsMany`

Use `{count}` in the “many” strings. Singular is a separate key (not “1 … moments”).

Defined in [`utils/languages/translations.ts`](../../utils/languages/translations.ts).
