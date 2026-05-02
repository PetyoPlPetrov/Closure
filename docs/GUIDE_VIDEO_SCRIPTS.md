# Sferas Guide — video scripts (remaining sections)

Use these voiceovers for **embedded guide clips or vertical video (~1 minute each** at a relaxed pace — tighten only if your VO runs long).

**Tone:** speak **to the listener like a story**: what life feels like before the feature, what shifts after. Avoid product jargon in voiceover (“entity,” “sphere,” internal routes). **On-screen text** can show tab names or arrows for people who learn visually.

**Already wired in the app:** **Missions** and **Recording Memories** use `introYoutubeUrl` in `utils/guide-data.ts`. After you upload clips for the sections below, add URLs the same way.

---

## 1. Four concrete rhythms *(guide row id: `tools`)*

**Working title:** Four rhythms in the app  
**Length target:** ~60 s (~140–150 words at a relaxed VO pace)

### Story script (~60 s VO)

Sferas gives you four practical **tools** that help you follow through on the Missions in daily life. **Home** comes first: each circle grows with the moments inside it, so you can instantly see whether your life is expanding in all directions—or if one area is crowding out the rest. It is your clearest view of whether you are living **spherically** and keeping balance across your worlds. On **Lessons**, the **lesson check** asks something new spun from **a random lesson** you’ve saved—same archive, fresh prompt, so old notes stay alive. The **wheel of life** anchors on **one person you choose** from the people you keep here—partner, coworker, family—and the question rises from **their** lessons alone, not the whole library. **Insights** closes the loop: love, work, family, friends, and what you love doing side by side—how life leans stays readable without jumping menus.

_Feature mapping (for captions / demo only): Home → sphere sizes / “living spherically”; Lessons → lesson check (random saved lesson); wheel → chosen person’s lessons; Insights last._

---

## 2. Notifications & nudges — kindness that pings

**Working title:** Before silence becomes habit  
**Length target:** ~60 s  

### Story script (~150 words → ~60 s VO)

**Notifications & nudges** have one clear goal: keep what matters from slipping away in busy days. **Sferas people reminders** are your gentle prompts to reach out—send the message, make the call, check in before distance quietly grows. They help you stay present with people you care about instead of remembering too late.  

**Sferas moment nudges** are different: you can turn your own saved lessons or sunny moments into small reminders that come back to you at the right time. A lesson nudge can keep you focused when old patterns try to pull you off course. A sunny-moment nudge can cheer you up and reconnect you with gratitude when the day feels heavy.  

You can tune frequency so it feels supportive, not noisy. The point is simple: reminders help you stay connected to people, and nudges help you stay  present and focused.

_Feature mapping (for captions / demo only): Sferas people reminders (reach out/check in), Sferas moment nudges from lessons (stay focused), Sferas moment nudges from sunny moments (encouragement), event follow-ups._

---

## 3. Customizations — exact controls that change feel and usability

**Working title:** Usability, colors, and cosmic look  
**Length target:** ~60 s  

### Story script (~150 words → ~60 s VO)

**Customizations** in Sferas come in three exact parts: **Usability**, **Moment Colors**, and **Cosmic App Look**. **Usability** lets you tune how the app feels to move through day to day—smoother, softer, or quicker depending on how you focus best. In **Moment Colors**, you choose the exact colors for the floating bubbles on Home, so sunny memories, harder moments, and lessons are easier to read at a glance in a palette that feels right to you. In **Cosmic App Look**, you shape the atmosphere behind everything: how dense the stars feel, how strong the glow/opacity is, and how fast the background drift moves—calm and subtle, or more vivid and alive.  

So this isn’t generic theming. It is practical control over comfort and clarity: usability for flow, colors for readability, and cosmic look for atmosphere while you reflect.

_Feature mapping (for captions / demo only): Usability (interaction/motion comfort), Moment Colors (bubble colors by moment type), Cosmic App Look (star density, glow/opacity, drift speed)._

---

## Quick checklist before filming

| Guide row (app list) | Clip slug idea                  | After upload                           |
|----------------------|---------------------------------|----------------------------------------|
| Tools                | `sferas-guide-tools`             | `introYoutubeUrl` on `tools`           |
| Nudges               | `sferas-guide-notifications`    | `introYoutubeUrl` on `notifications`   |
| Styles               | `sferas-guide-customizations`   | `introYoutubeUrl` on `customizations` |

1. Record vertical video (**1080×1920** or similar), **~60 seconds** per section unless your edit needs handles.  
2. Let **VO carry emotion**; layer **captions** for names of tabs or taps from `utils/guide-data.ts` if useful.  
3. Paste HTTPS URLs into `utils/guide-data.ts` → rebuild / publish **OTA** per repo root `CLAUDE.md` (versioning).
