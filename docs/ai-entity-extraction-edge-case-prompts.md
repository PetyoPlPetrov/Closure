# AI entity extraction — edge-case test prompts

Use these as **raw user text** (onboarding “tell your story” or AI entity modal input). App language **Bulgarian** unless noted. After each run, check JSON fields and UI review step.

**Legend**

- **BG UI + EN transcript**: Bulgarian app language, text in English (simulates STT fallback).
- **Expect**: shorthand for what should *not* break (not a strict contract on every word).

---

## 1. Bulgarian UI, English transcript — family kinship

**Prompt (English)**

> My sister Analia lives with me. She helps a lot with the kids. Our mother visits on weekends.

**Expect**

- `family`: `name` can stay **Analia** (proper name); `relationship` **сестра** (not `sister`); mother row **майка** or natural Bulgarian, not `mother`.
- Descriptions in **Bulgarian** (Cyrillic).

---

## 2. Bulgarian UI, English transcript — hobby title

**Prompt (English)**

> I go hiking every Sunday in the mountains near Sofia. It clears my head.

**Expect**

- `hobbies`: title/description natural **Bulgarian** where possible (e.g. планински преходи / планинарство), not left as only **Hiking** if a common BG term fits.

---

## 3. “Single only” — no fake relationship entity

**Prompt (English)**

> I have been single for three years. I focus on work and my friends. No partner right now.

**Expect**

- `relationships`: **empty array** `[]` or omitted per schema — **no** entity named Self / Single / “Being single”.

---

## 4. “Single only” — Bulgarian text

**Prompt (Bulgarian)**

> Три години съм сама. Фокусът ми е работата и приятелите. Нямам партньор в момента.

**Expect**

- Same as §3: **no** romantic placeholder in `relationships`.

---

## 5. Vague / thin — entity modal (one sphere)

**Sphere:** `hobbies`  
**Prompt (English)**

> Stuff.

**Expect**

- Still **≥1** hobby entity; model infers something plausible (even generic) rather than empty `entities`.

---

## 6. Vague — onboarding

**Prompt (English)**

> I don’t know what to say. Life is okay. I like coffee.

**Expect**

- `entitiesBySphere`: at least **hobbies** or **friends**-ish entry possible; `relationships` empty if no partners; **no** crash / empty root object.

---

## 7. Multi-sphere dense (stress)

**Prompt (English)**

> I dated Alex from 2019 to 2021. Now I am with Sam since 2022. I work at Contoso as a designer since 2020. My brother Viktor is a doctor. My best friend is Maria from university. I play guitar and run marathons.

**Expect**

- `relationships`: two partners (or current + ex) with plausible **dates** / `isCurrent`.
- `career`: job + dates if implied.
- `family`: **brother** → Bulgarian kinship + name.
- `friends`: Maria.
- `hobbies`: guitar, running (or merged) — multiple entities allowed up to cap.

---

## 8. English UI, English text (baseline)

**Prompt (English)** (app **English**)

> My father John and my aunt live in Plovdiv. I visit twice a year.

**Expect**

- `family`: English relationship labels acceptable (`father`, `aunt`); names preserved.

---

## 9. Bulgarian UI, mixed BG + EN in one story

**Prompt (mixed)**

> Моята sister се казва Elena. Работя в IT от 2018. Имам близък приятел Ivan.

**Expect**

- `family`: relationship **сестра** (not `sister`); names as given.
- `career` / `friends`: Bulgarian descriptions preferred for BG UI.

---

## 10. Career — current vs past

**Sphere:** `career`  
**Prompt (English)**

> I was a barista at Blue Mug until December 2023. Since January 2024 I am a junior developer at TechCo.

**Expect**

- Two jobs or one merged story — at minimum **dates** + **isCurrent** coherent; JSON valid.

---

## 11. Relationships — only ex, explicit past

**Sphere:** `relationships`  
**Prompt (English)**

> My ex Jordan and I broke up in 2022. I am not dating anyone now.

**Expect**

- One (or more) past relationship(s); **no** “current” invented partner; `endDate` / `isCurrent: false` sensible.

---

## 12. Family — step / extended (wording stress)

**Prompt (English)**

> My stepmother Linda and my half-brother Tom are important to me.

**Expect**

- `relationship` in **Bulgarian** for BG UI (e.g. мащеха, полубрат — or clearest BG kinship phrase model knows); not raw `stepmother` / `half-brother` if policy is strict BG.

---

## 13. Very long ramble (token / truncation risk)

**Prompt**

Paste 2–3 paragraphs of lorem ipsum **plus** one clear sentence:  
“My sister **UNIQUE_NAME_TEST** teaches math.”

**Expect**

- Family entry still picks up **UNIQUE_NAME_TEST** or sister kinship; no empty `family` if sentence is in window.

---

## 14. JSON / schema hygiene (onboarding)

**Prompt (English)**

> Parents Anna and Bob. Friend Zoe. Hobby chess.

**Expect**

- `entitiesBySphere` includes **empty arrays** `[]` for unmentioned spheres (per prompt), not missing keys if schema requires all keys.

---

## Quick checklist (manual pass)

| # | Case                         | BG UI | EN text | Check                          |
|---|------------------------------|-------|---------|--------------------------------|
| 1 | Family EN → BG kinship       | ✓     | ✓       | сестра / майка, not sister     |
| 2 | Hobby EN → BG title          | ✓     | ✓       | Not only “Hiking”              |
| 3 | Single only                  | ✓     | ✓       | No relationships entity        |
| 5 | Vague one word               | ✓     | ✓       | ≥1 entity in chosen sphere     |
| 7 | Multi-sphere                 | ✓     | ✓       | All relevant spheres non-empty |
| 9 | Code-switch BG/EN            | ✓     | mixed   | Kinship BG                     |

---

## Optional: DEV mock

Set `USE_MOCK_AI_REQUEST` to `true` in `utils/ai-service.ts` only for local prompt-shape checks (no Firebase). Turn off before shipping.
