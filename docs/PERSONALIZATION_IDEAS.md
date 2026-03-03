# Personalization Ideas (similar to Moment Colors)

Ideas for user-customizable settings that fit the same pattern as **Moment Colors**: a provider + AsyncStorage, a Settings entry, and use across the app. All are relative to current features.

---

## 1. **Sphere colors** (highest impact, same pattern)

**What:** Let users pick an accent color for each of the 5 spheres (Relationships, Career, Family, Friends, Hobbies).

**Where it’s used today (hardcoded):**
- **Insights** – Wheel of Life slice colors (`getSphereColor` in `insights.tsx`: red, blue, green, purple, orange).
- **Home** – Floating entity icon colors and gradients (`getSphereIconColor` in `index.tsx`, same palette).
- **Spheres tab** – Likely same or similar sphere styling.
- **Comparison screens** – Entity cards / headers may use sphere type for color.

**Implementation (same as Moment Colors):**
- `SphereColorsProvider` with `@sferas:sphere_colors`, defaults = current hardcoded palette (light + dark).
- Settings → “Sphere colors” (or “Life spheres colors”) with one row per sphere and a color picker each.
- Replace `getSphereColor` / `getSphereIconColor` (and any other sphere color usage) with the provider’s values.
- Optional: gate behind Plus (like moment colors) or leave free.

**Why it fits:** Same mental model as moment colors (customize how “my” content looks), reuses existing UI patterns, and touches several key screens.

---

## 2. **Central avatar / “Sunny life” style**

**What:** Light customization of the home center circle (the overall sunny % avatar).

**Options (pick one or a few):**
- **Icon:** Choose what appears in the center (e.g. sun, cloud, heart, or none).
- **Border:** Thicker / thinner ring, or optional “minimal” (no ring, just percentage).
- **Label:** Show/hide “Sunny life” (or localized) under the percentage.

**Implementation:** Small provider (e.g. `CentralAvatarPreferences`: `iconStyle`, `borderWeight`, `showLabel`) stored in AsyncStorage; one compact settings section; Home reads it and adjusts the `OverallPercentageAvatar` (and any central circle component).

**Why it fits:** Same “make the home screen feel mine” as moment colors, without a full redesign.

---

## 3. **Corner accent on/off**

**What:** Let users turn the corner accent on or off. The accent is the colored corner on some screens (from `TabScreenContainer` + `momentType`), derived from moment colors.

**Options:**
- Global toggle: “Show corner accent on screens” (on/off).
- Or keep as-is and only add this if users ask for less visual noise.

**Implementation:** Single preference in a small provider or next to “Moment colors” in Settings; `TabScreenContainer` reads it and skips rendering the accent when off.

**Why it fits:** Same “I control how the app looks” as moment colors; very small change.

---

## 4. **Streak badge color / style**

**What:** Customize how the streak badge (flame, count, etc.) looks.

**Options:**
- **Accent color** for the streak UI (flame icon, progress, or “days” text).
- **“Use my moment colors”** – e.g. use sunny (or lesson) background as streak accent so the app feels consistent.

**Implementation:** Either a single “Streak accent color” in Settings (and a tiny provider) or a toggle “Use sunny moment color for streak” that reads from `useMomentColors()` in the streak component.

**Why it fits:** Keeps streak visible and motivating but aligned with the rest of the app’s look.

---

## 5. **Default section when adding a memory**

**What:** When opening “Add idealized memory”, which section is expanded first: Hard truths, Good facts, or Lessons.

**Implementation:** One preference (e.g. `defaultMemorySection: 'hardTruths' | 'goodFacts' | 'lessons'`) in AsyncStorage; `add-idealized-memory` reads it and sets initial expanded state. No new provider needed if you already have a “preferences” store; otherwise a small one.

**Why it fits:** Same “the app adapts to how I use it” as moment colors, but for behavior instead of color.

---

## 6. **List density (compact / comfortable)**

**What:** Single setting: “Compact” vs “Comfortable” for list and card spacing (and optionally font size) on Spheres, comparison screens, idealized memories list, etc.

**Implementation:** One preference (e.g. `listDensity: 'compact' | 'comfortable'`); apply to padding/margin and optionally to `ThemedText` size in lists. Could live in a generic “App preferences” provider.

**Why it fits:** Same “personalize my experience” as moment colors; good for users who want more on screen or less clutter.

---

## Suggested order

| Idea                 | Similarity to moment colors | Effort | Impact   |
|----------------------|----------------------------|--------|----------|
| Sphere colors        | Very high                  | Medium | High     |
| Central avatar style | High                       | Low    | Medium   |
| Corner accent on/off | High                      | Low    | Low–Med  |
| Streak badge color   | High                       | Low    | Medium   |
| Default memory section | Medium (behavior)        | Low    | Medium   |
| List density         | Medium                     | Medium | Medium   |

**Recommendation:** Implement **Sphere colors** first (same pattern as moment colors, removes hardcoded duplication, visible in Insights + Home + anywhere sphere type is used). Then **Central avatar style** or **Corner accent on/off** for quick wins.
