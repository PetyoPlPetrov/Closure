# Moment Nudges: Source Behavior

This note describes how nudge message sources work in `app/moment-notifications.tsx` and `utils/MomentNotificationProvider.tsx`.

## Available sources

- `moments` (raw):
  - Uses the original text from memories.
  - For lessons: `memory.lessonsLearned[].text`
  - For sunny moments: `memory.goodFacts[].text`
  - New memories/lessons are picked up automatically during schedule refresh.

- `ai`:
  - Uses generated summary messages stored in `MomentNotificationSummary`.
  - Messages are generated via `ensureSummariesForSphereAndType(...)`.
  - New memories/lessons require summary regeneration to become eligible.
  - Regeneration is incremental: only new lessons/sunny moments without existing summaries are generated.

## Why `both` was removed

The previous `both` option mixed raw and AI message pools. In practice this made behavior harder to reason about and reduced control over the message tone/source.

Using only `moments` or `ai` keeps intent clear:

- choose `moments` for direct, always-up-to-date memory text
- choose `ai` for curated AI phrasing

## AI refresh in edit view

When editing a schedule with source `ai`, the screen now shows a `Refresh AI source (new only)` action.

This action:

1. regenerates missing AI summaries for the selected sphere + moment type (new items only)
2. refreshes scheduled nudge notifications so new summaries can be used

It does not regenerate all existing summaries from scratch.

## Free AI nudge policy (non-entitled users)

There is one free AI-source moment nudge slot with the following rules:

- Free AI is available only when the user has no existing AI-source nudge schedule.
- Free AI creation is limited to one per day.
- If the user creates a free AI nudge and deletes it the same day, they must wait until the next day to create another free AI nudge.
- If the user deletes it on a later day, they can create a new free AI nudge (still max one free creation per day).
- Premium/entitled users are not limited by this free-slot policy.

Implementation notes:

- Last free-use day is stored in `@sferas:moment_notifications_free_ai_last_used_date`.
- The schedule carries `freeAiGranted: true` when it was created via the free AI slot.
- AI refresh remains incremental (new items only) for both premium AI schedules and free-AI schedules.

## Migration behavior

During schedule normalization:

- legacy `user` source maps to `moments`
- legacy `both` source maps to `ai`

This keeps existing schedules valid while moving to the simpler two-source model.
