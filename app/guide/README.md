# App Guide — Session Notes

Changes made in the session that introduced the guide modal timing fix and the reminder setting.

---

## 1. Guide modal timing fix

**Problem:** The App Guide walkthrough modal (`WalkthroughModal`) was appearing on app open before the sunny moments celebration animation in `FocusedSferaView` finished, causing a visual overlap.

**Root cause:** The `checkWalkthrough` effect in `app/(tabs)/index.tsx` only gated on `isAnimationComplete` (splash done) and `isLoading`, but had no awareness of the `FocusedSferaView` intro animation.

**Fix — three-part change:**

### `components/focused-sfera-view.tsx`

- Added `onIntroComplete?: () => void` to `FocusedSferaViewProps`.
- Added `markIntroComplete` callback that calls both `setIntroComplete(true)` (internal) and `onIntroComplete?.()` (parent notification).
- Both places that complete the intro now call `markIntroComplete`:
  - When the animation is skipped (no congrats today / percentage < 50%): direct call.
  - When the full animation finishes (Phase 4 stagger at ~5400ms): `runOnJS(markIntroComplete)()`.

### `app/(tabs)/index.tsx`

- Added `focusedIntroComplete` state (default `false`).
- `FocusedSferaView` receives `onIntroComplete={() => setFocusedIntroComplete(true)}`.
- `checkWalkthrough` effect gains an extra early-return guard:
  ```ts
  if (homeViewMode === "focused" && !focusedIntroComplete) return;
  ```
- `focusedIntroComplete` and `homeViewMode` added to the effect dependency array.

**Result:** The modal only appears after the sunny moments intro (or instant skip) is fully done.

---

## 2. "Remind me to complete the guide" user setting

**Problem:** The `getGuideDismissedForever()` flag (set when user presses "Don't show again") had no user-facing way to be reset. Once dismissed, there was no way to re-enable the on-open prompt.

**Changes:**

### `utils/guide-storage.ts`

- Added `clearGuideDismissedForever()` — removes `@sferas:guide_dismissed_forever` from AsyncStorage, re-enabling the on-open modal prompt.

### `utils/languages/translations.ts`

- Added type keys: `guide.remindOnOpen`, `guide.remindOnOpenDescription`.
- Added English values:
  - `"Remind me to complete the guide"`
  - `"Show a prompt on app open until you've read all sections."`
- Added Bulgarian equivalents.

### `app/guide/index.tsx`

- Added `remindOnOpen` state, loaded via `getGuideDismissedForever()` (inverted: `!dismissed`).
- Removed the previous `__DEV__`-only debug toggle.
- Added a user-facing **"Remind me to complete the guide"** toggle row at the bottom of the section list:
  - Toggle **on** → `clearGuideDismissedForever()` — modal will reappear on next app open.
  - Toggle **off** → `setGuideDismissedForever()` — modal suppressed (same as pressing "Don't show again").
- Reads current state on every `useFocusEffect` to stay in sync.

---

## Storage keys involved

| Key | Purpose |
|-----|---------|
| `@sferas:guide_read_sections` | JSON array of section IDs the user has opened |
| `@sferas:guide_dismissed_forever` | `"true"` if user pressed "Don't show again" or toggled reminder off |

---

## Gate order for the walkthrough modal

```
isLoading === false
  && !isSplashVisible
  && isAnimationComplete          ← splash animation done
  && focusedIntroComplete         ← sunny moments intro done (focused view only)
  && onboardingCompleted === true
  && dismissedForever === false
  && not all sections read
  → setWalkthroughVisible(true)
```
