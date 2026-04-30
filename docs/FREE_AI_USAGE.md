# Free-tier AI usage (Sferas)

This document summarizes **how much AI-powered usage** non‑subscribers get **per calendar day** (local timezone), and how **streak badges** change those limits. For streak rules (grace days, how days are logged), see [BADGE_REWARDS.md](./BADGE_REWARDS.md).

Paid **Sfera AI** subscribers use separate caps (see **Premium** below); badges never reduce paid benefits.

---

## Two independent daily pools

Free users have **two counters**, stored separately. Using one does **not** subtract from the other.

| Pool | What it limits | Default (no Sferas badge) | With **Sferas** badge (14+ day streak) | Implementation |
|------|----------------|---------------------------|----------------------------------------|----------------|
| **AI creation** | Submitting **Create memory with AI** (`AIModal`) and **Create entity with AI** (`AIEntityCreationModal`) | **3 / day** | **5 / day** | `@sferas:ai_requests` · `utils/ai-rate-limiter.ts` · `getFreeAIDailyLimit()` in `utils/badge-rewards.ts` |
| **Lesson revisit** (one shared pool) | Each time you **use a lesson check**: spin the **entity** wheel into the lesson exam, open the lesson check from **Universe Lessons**, spin the **home** main wheel into the same exam flow, or use the **Sun** exam entry — all count toward the **same** daily counter. Not three separate “3s”; one bucket for “generate / use the AI question for an existing lesson and get feedback.” | **3 / day** | **5 / day** | `@sferas:universe_exam_usage` · `utils/universe-exam-rate-limiter.ts` · `getFreeExamDailyLimit()` in `utils/badge-rewards.ts` |

**Lesson revisit** in the product sense: you already have lesson text on a memory; the app picks (or already preloaded) a situational question from that lesson, you answer, and AI evaluates. **Spinning the entity wheel of life** into that flow and **tapping the lesson check affordance on the Universe Lessons screen** are the same category — they are **not** an extra parallel quota; they share this single pool with the main wheel exam and other exam entry points wired to `consumeUniverseExamIfAvailable`.

So in a single day, a free user with **no** Sferas badge can use **up to 3** AI creations **and** **up to 3** lesson-revisit / exam actions total (**6** across both pools), no matter how many different buttons they use to start a lesson check.

---

## Streak badges that affect free AI (and related caps)

Badges are earned by logging memories on consecutive days (manual save or AI modal save both count). Only **Sferas** changes **AI** and **exam** daily limits.

| Badge | Consecutive days | Effect on **free AI / exam** | Other free-tier effect |
|-------|------------------|------------------------------|-------------------------|
| **Ignite** | 1 | — | Starts streak path |
| **Pulse** | 3 | — | Moment color editing without subscription |
| **Nova** | 7 | — | Entity cap per sphere: **2 → 5** |
| **Sferas** | 14 | AI creation: **3 → 5** / day · Lesson revisit / exam: **3 → 5** / day | Plus messaging / events copy in-app |

Constants: `FREE_AI_DAILY_LIMIT_DEFAULT` / `FREE_AI_DAILY_LIMIT_WITH_SFERAS`, `FREE_EXAM_DAILY_LIMIT_DEFAULT` / `FREE_EXAM_DAILY_LIMIT_WITH_SFERAS` in `utils/badge-rewards.ts`.

---

## What does *not* count toward the “AI creation” pool

- **Generating exam questions** for the wheel (batch preload of situational questions from existing lesson text) runs through a **different** AI call (`generateLessonExamQuestionsBatch` in `utils/ai-service.ts`). It is **not** gated by `consumeAIRequestIfAvailable` (the memory/entity creation counter). Preload is still subject to **exam** eligibility and product rules (e.g. free users who cannot take another exam may not preload — see `utils/wheel-exam-preload.ts` and `canUseExam`).
- **Analyzing** an exam answer after you submit is part of the lesson-revisit flow (rate-limited by the **shared exam** pool when you consume a slot on submit/spin, depending on entry point).

---

## Moment notifications: one free “AI” schedule setup per day

Non‑subscribers can start **one** notification schedule whose **source** is **AI** per calendar day, under conditions enforced in `app/moment-notifications.tsx` (e.g. no existing AI schedule, `freeAiGranted` / `FREE_AI_LAST_USED_DATE_KEY`). That is **separate** from the two daily pools above.

---

## Premium (Sfera AI entitlement)

- **AI creation:** **30** submissions per day (`REQUESTS_PER_DAY_PREMIUM` in `utils/ai-rate-limiter.ts`).
- **Lesson revisit / universe exam:** entitlement short-circuits the free exam counter (`consumeUniverseExamIfAvailable` returns true without consuming for subscribers).

Product code may also bypass limits for special flows (e.g. golden event paths in the AI modal); see app/components for edge cases.

---

## Quick reference: where limits are enforced

| User action | Rate limit |
|-------------|------------|
| AI memory submit | AI creation pool |
| AI entity submit | AI creation pool |
| Lesson revisit — **same shared slot** for all entry points below | **One** lesson-revisit / exam pool |
| → Main wheel spin into lesson exam | ↑ |
| → Entity wheel spin into lesson exam | ↑ |
| → Universe Lessons → lesson check → submit answer | ↑ |
| → Sun / universe exam icon flows using the same consumer | ↑ |

---

## Maintainer note

If you change numbers or badge thresholds, update **`utils/badge-rewards.ts`**, **`utils/ai-rate-limiter.ts`**, **`utils/universe-exam-rate-limiter.ts`**, and this file so support docs and the codebase stay aligned.
