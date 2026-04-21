# Moment Nudges: Source Behavior

This note describes how nudge message sources work in `app/moment-notifications.tsx`, `utils/MomentNotificationProvider.tsx`, `utils/ai-service.ts`, and `components/ai-modal.tsx`.

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

When editing a schedule with source `ai`, the screen shows a compact `Refresh` action with an info icon.

This action:

1. regenerates missing AI summaries for the selected sphere + moment type (new items only)
2. refreshes scheduled nudge notifications so new summaries can be used

It does not regenerate all existing summaries from scratch.

Refresh is subscription-gated:

- Pressing `Refresh` without an active subscription opens the upgrade paywall. If the user does not complete the purchase, nothing is regenerated.
- Free AI-slot users can create one free AI nudge (subject to limits), but still hit the paywall when pressing refresh.

Refresh status indicators:

- The refresh button is only clickable when there are lessons/sunny moments that still need summaries (pending count > 0).
- The button shows a pending-count badge (notification-style) for how many items still need summaries.
- If pending count is `0`, the button shows a caught-up check icon and is disabled (cannot be pressed, so no paywall is triggered).
- The info icon next to the button is always clickable; it explains incremental behavior and the current pending state.
- All refresh button labels and alerts are fully localized (see `momentNotifications.refresh.*` translation keys).

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
- Missing-summary detection is keyed by `memoryId + momentId` (not only `momentId`) to avoid collisions across different memories. See "ID mapping rules" below.
- AI modal-generated moment IDs include a timestamp and random suffix for uniqueness, but the codebase does not rely on this — compound ids (`memoryId::momentId`) are used wherever cross-memory uniqueness is required.

## AI summary generation guarantees

Every `MomentNotificationSummary` persisted anywhere in the app must carry a Gemini-generated `notificationMessage` tied 1:1 to its source lesson or sunny moment. There are no hardcoded fallback strings.

### ID mapping rules

There are four distinct ID layers at play when a lesson or sunny moment becomes an AI summary. Keep them straight — mixing them is what caused real bugs in the past.

1. **Raw moment id** — `IdealizedMemory.lessonsLearned[].id` or `IdealizedMemory.goodFacts[].id`.
   - **Not globally unique.** Two different memories can share the same raw id (legacy format still produces `lesson-1`, `lesson-2`, `good-fact-1`, …). New entries from the AI modal are timestamp+random, which makes collisions unlikely but never strictly guaranteed.
   - Use this value for storage keys and for linking back to the original lesson/good-fact inside its memory — **never as a standalone identifier across memories.**

2. **Compound AI id** — `` `${memoryId}::${lessonId}` `` (or `` `${memoryId}::${goodFactId}` ``, with the literal `::` separator).
   - Built inside `ensureSummariesForSphereAndType` and `generateBatchSuggestionsForManualLessons` before any AI call.
   - Guaranteed unique per memory-moment pair, so lessons with colliding raw ids across memories stay disambiguated through the entire AI pipeline.
   - Each compound id is paired with a `contextByAIId` entry holding the true `{ memoryId, entityId, originalMomentId, text, sphere }`. That context is what the persistence step uses — we never re-derive the memory via `memories.find(…)` on a raw id.

3. **Short alias** — `m0`, `m1`, `m2`, … generated inside `utils/ai-service.ts` only.
   - The helpers (`suggestNotificationMessagesForLessons`, `suggestNotificationMessagesForSunnyMoments`) map each incoming id — whether raw or compound — to a short alias before calling Gemini, then map Gemini's response back to the incoming id.
   - Reason: Gemini occasionally drops, truncates, or mangles long arbitrary identifiers when asked to echo them back (especially in larger batches). Short aliases are a single token each and Gemini echoes them reliably.
   - Callers never see aliases; they are purely an LLM-communication detail.

4. **Persisted summary key** — `` `${memoryId}:${momentId}` `` (single `:` separator) on `MomentNotificationSummary`, plus `momentType` for disambiguation.
   - `pendingAISummaryCount` in the screen and the dedup logic in `addSummariesBatch` both key by this shape.
   - `addSummariesBatch` dedupes incoming rows by `(memoryId, momentType, momentId)`: if a row with the same triple already exists in storage, the new row replaces it. This collapses legacy duplicates and prevents accumulation on repeated refresh clicks.

In short:

- Raw id → only meaningful within its parent memory.
- Compound id (`memoryId::momentId`) → unique key used for the LLM round trip; never persisted.
- Alias (`m0`, `m1`, …) → internal to `ai-service.ts`; never leaves that module.
- Summary key (`memoryId:momentId` + `momentType`) → canonical identity for a persisted summary row.

### Why alias mapping is used

Gemini occasionally drops, truncates, or mangles long arbitrary identifiers when asked to echo them back. With compound ids (`memoryId::momentId`) the strings are even longer, which makes the aliasing strictly necessary.

The AI helpers in `utils/ai-service.ts`:

1. Map each input to a short alias (`m0`, `m1`, `m2`, …).
2. Send only aliases + text to Gemini. The response schema and system prompt explicitly require echoing the alias verbatim.
3. Map each returned alias back to the input id (compound or raw, whichever the caller passed) before returning.

### Retry + fail-loud contract

Both `suggestNotificationMessagesForLessons` and `suggestNotificationMessagesForSunnyMoments`:

- Retry up to `MAX_AI_MESSAGE_RETRY_ATTEMPTS` (currently `3`) times, re-requesting **only** the aliases still missing from previous attempts.
- Throw an `Error` if any input still lacks a message after all retries. Callers surface the error; they never persist a partial set.
- Log every request/retry/success/failure under the `[ai-service]` tag with counts and (on failure) the missing real ids.

### Caller responsibilities

`ensureSummariesForSphereAndType` and `generateBatchSuggestionsForManualLessons` in `utils/MomentNotificationProvider.tsx`:

- Build the `lessonsForAI` / `sunnyForAI` list using compound ids (`` `${memoryId}::${momentId}` ``) and keep a `contextByAIId` map with the true `{ memoryId, entityId, originalMomentId, text, sphere }`.
- Call the helper above with the compound ids. On success, iterate the input list and persist each row using the context map — never via `memoriesInSphere.find(l => l.id === …)` on raw ids.
- If anything is still unresolved afterwards, abort with `{ generated: 0, error }` rather than writing partial state to storage.
- Log `coverage gap` errors with the compound ids that were missing. Other step logs (`requesting N`, `persisted N/M`, `nothing to generate`) are `__DEV__`-gated.

`components/ai-modal.tsx` `handleSave`:

- Backfills missing `notificationMessage` on both lessons **and** sunny moments in parallel (`Promise.all` of the two helpers).
- Throws if anything is still unresolved after backfill (unreachable in practice since the helpers already throw).
- Logs backfill counts and persisted counts under the `[AI Modal]` tag.

### What this means for the user

- Pressing `Refresh` on an AI nudge either fully updates summaries for all pending items or shows an error alert — never a partial state that leaves the nudge card stuck on "No moments available · notifications paused".
- Creating a memory through the AI modal persists exactly one AI-specific notification message per lesson and per sunny moment, or fails loud before saving.

## Migration behavior

During schedule normalization:

- legacy `user` source maps to `moments`
- legacy `both` source maps to `ai`

This keeps existing schedules valid while moving to the simpler two-source model.
