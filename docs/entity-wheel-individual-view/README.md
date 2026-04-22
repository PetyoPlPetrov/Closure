# Entity wheel (individual entity view)

This document describes the behavior added and adjusted for **entity wheel of life** from the home screen when a single entity is in focus (`FloatingAvatar` in `app/(tabs)/index.tsx`).

## When the entity wheel is available

Opening **entity wheel of life** (tapping the central entity avatar) is allowed only if the entity meets **both**:

1. **At least three memories** on that entity.
2. **At least nine moments in total** across all of that entity’s memories, counting:
   - lessons learned  
   - sunny moments (`goodFacts`)  
   - cloudy moments (`hardTruths`)

Moments are summed over **all** memories for the entity (not “nine per memory”).

The check is implemented in `canEnterEntityWheelOfLife()` next to `FloatingAvatar`, using exported constants `ENTITY_WHEEL_MIN_MEMORIES` and `ENTITY_WHEEL_MIN_TOTAL_MOMENTS` in `app/(tabs)/index.tsx` (so product copy, the in-app notice, and the gate stay aligned).

## In-app notice (gating)

When the user is in **individual entity** focus and taps the **entity avatar** while the wheel is still locked, the app shows a **short, dismissible notice** at the bottom of the screen. It restates the same rules (minimum memories and total moments) and **live counts** for the current entity (memories and moments so far). The notice also **auto-hides** after a few seconds; the user can close it with the **X** control.

Strings live under `home.entityWheel.gateTitle` and `home.entityWheel.gateMessage` in `utils/languages/translations.ts` (English and Bulgarian). Tapping the avatar still **nudges a random memory** (when there is at least one memory) as described below.

## When the wheel is not available

### Avatar tap

Tapping the entity avatar **does not** open entity wheel mode. If there is at least one memory, a **random memory** around the avatar gets a short **scale pulse** so it reads as “tap here instead.” This uses shared values `nudgeTargetIndex` and `nudgePulseScale` and the memory’s slot index on `FloatingMemory`.

### Usability hint (finger)

The hint is **not** on the entity avatar. It appears near a **specific memory bubble**, using a **stable index** derived from the entity id (`usabilityHintMemoryIndex`) so the same memory is highlighted consistently for that entity.

The finger is rendered **inside the same draggable/zooming container** as the avatar and memories so it stays aligned during focus animations. It reuses the same timed opacity/scale animation as the original avatar hint (`avatarClickHintOpacity` / `avatarClickHintScale`).

### Avatar pulse

The “click the avatar” pulse animation still runs only when the user **can** enter entity wheel mode. When the wheel is gated off, the **memory nudge pulse** (above) carries the affordance.

## When the wheel is available

Behavior matches the previous design: usability finger toward the **entity** avatar, avatar pulse, and tap toggles entity wheel mode.

## Data changes while the UI is open

If entity wheel mode is active and stored data later falls below the threshold (e.g. edits elsewhere), wheel mode is **closed** automatically so the UI does not stay in wheel mode when it is no longer valid.

## Structural change: `memoryPositions`

`memoryPositions` (`useMemo` that lays out memory orbits) was moved **earlier** in `FloatingAvatar` so hooks that depend on it (effects, hints, rendering) do not reference it before initialization.

## Files touched

- **`app/(tabs)/index.tsx`** — gating helper and exported thresholds (`ENTITY_WHEEL_MIN_*`), bottom gating **toast** in `FloatingAvatar`, hint placement, nudge animation, `FloatingMemory` props, and `memoryPositions` order.
- **`utils/languages/translations.ts`** — `home.entityWheel.gateTitle` / `home.entityWheel.gateMessage` for the gating notice.

No new environment variables or API contracts.
