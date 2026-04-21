/**
 * AI Service - Handles AI API calls using Firebase AI (Gemini)
 */

import { getAI, getGenerativeModel, Schema } from "@react-native-firebase/ai";
import { getApp } from "@react-native-firebase/app";
import { firebase } from "@react-native-firebase/app-check";
import * as FileSystem from "expo-file-system/legacy";
import type { LifeSphere } from "./JourneyProvider";

// Runtime flag for mock AI requests (set to true to use slow mock requests for testing)
const USE_MOCK_AI_REQUEST = __DEV__ && false; // Set to true to enable mock requests

export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIResponse {
  message: string;
  error?: string;
}

export interface AIRequestContext {
  sferas: {
    relationships?: {
      name: string;
      relationshipType?: string;
      isOngoing?: boolean;
      startDate?: string;
      endDate?: string | null;
    }[];
    career?: {
      name: string;
      isCurrent?: boolean;
      startDate?: string;
      endDate?: string | null;
    }[];
    family?: { name: string; relationship?: string }[];
    friends?: string[];
    hobbies?: string[];
  };
  language?: string;
}

/**
 * Read image file as base64 for Gemini inline data.
 * @param imageUri - Local file URI (file://)
 * @returns Base64 string with mime type prefix
 */
async function readImageAsBase64(imageUri: string): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    // Determine mime type from file extension
    const ext = imageUri.split(".").pop()?.toLowerCase();
    let mimeType = "image/jpeg"; // default
    if (ext === "png") mimeType = "image/png";
    else if (ext === "gif") mimeType = "image/gif";
    else if (ext === "webp") mimeType = "image/webp";
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    throw new Error(`Failed to read image: ${error}`);
  }
}

/**
 * Send a message to the AI service
 * @param message - User's message
 * @param context - Optional context about the user's journey/spheres
 * @returns AI response
 */
export async function sendToAI(
  message: string,
  context?: AIRequestContext,
): Promise<AIResponse> {
  const app = getApp();
  const ai = getAI(app, {
    appCheck: firebase.appCheck(),
  });

  const model = getGenerativeModel(ai, {
    model: "gemini-2.5-flash-lite",
  });

  try {
    const result = await model.generateContent(message);
    return { message: result.response.text() };
  } catch (error) {
    return {
      message: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Process memory creation prompt with AI
 */
export async function processMemoryPrompt(
  prompt: string,
  context: AIRequestContext,
  language: string = "en",
  imageUri?: string,
): Promise<AIMemoryResponse> {
  const requestId = `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = Date.now();

  // If using mock requests, return mock data
  if (USE_MOCK_AI_REQUEST) {
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate delay
    return {
      memory: {
        title: "Mock Memory",
        description: prompt.substring(0, 100),
        date: new Date().toISOString(),
      },
      moments: [
        {
          type: "sunnyMoments",
          text: "This is a mock sunny moment",
        },
        {
          type: "lessonsLearned",
          text: "This is a mock lesson",
        },
      ],
    };
  }

  const languageName = language === "bg" ? "Bulgarian" : "English";
  const languageCode = language === "bg" ? "bg" : "en";

  const responseSchema = Schema.object({
    properties: {
      memory: Schema.object({
        properties: {
          title: Schema.string({
            description: "Short title for the memory (3-6 words)",
          }),
          description: Schema.string({
            description: "Brief description of the memory (1-2 sentences)",
          }),
          date: Schema.string({
            description: "ISO date string for when this memory occurred",
          }),
        },
        required: ["title", "description", "date"],
      }),
      sphere: Schema.string({
        enum: ["relationships", "career", "family", "friends", "hobbies"],
        description:
          "The life sphere this memory belongs to. Pick the best match based on the story content.",
      }),
      entityName: Schema.string({
        description:
          "Name of the specific entity (person, job, hobby, etc.) this memory is about. Must match one of the names from the user's Sferas context if provided.",
      }),
      moments: Schema.array({
        items: Schema.object({
          properties: {
            type: Schema.string({
              enum: ["sunnyMoments", "lessonsLearned", "hardTruths"],
              description: "Type of moment",
            }),
            text: Schema.string({
              description:
                'First-person moment text ("I", "my"). For lessonsLearned: a complete reflection in 1–3 sentences (full sentences, not a fragment). For others: as appropriate.',
            }),
            notificationMessage: Schema.string({
              description:
                "REQUIRED for sunnyMoments and lessonsLearned: As Sfera addressing the user. Use second person and REFLECT what they did/learned (e.g. 'You learned that...', 'You discovered...', 'You felt...'). Max 15-20 words. No imperatives. Use empty string for hardTruths.",
            }),
          },
          required: ["type", "text", "notificationMessage"],
        }),
      }),
    },
    required: ["memory", "sphere", "entityName", "moments"],
  });

  const systemPrompt = `Sfera AI coach. Analyze the user's story and extract:
1. ONE memory (title, description, date)
2. The life sphere and entity name this memory belongs to
3. Multiple moments: sunnyMoments (goodFacts), lessonsLearned, hardTruths

CRITICAL: Generate moments in FIRST PERSON ("I", "my", "me") as if the user wrote them.

Respond in ${languageName} (${languageCode}). JSON only.

Rules:
- Memory: Realistic title and description based on the story
- Sphere: Pick the best matching sphere (relationships, career, family, friends, hobbies)
- Entity name: The specific person, job, family member, friend, or hobby name from the user's context. Must match an existing name if context is provided.
- Moments: Extract 2-4 sunny moments, 1-2 lessons, 0-2 hard truths
- Use first person perspective ("I learned...", "I felt...", "My experience...")
- Be honest about hard truths but compassionate
- Lessons: write the full insight in 1–3 complete sentences (do not stop mid-thought); actionable and specific
- Sunny moments should be specific positive experiences

REQUIRED: For EVERY sunnyMoments and lessonsLearned moment you MUST provide notificationMessage. For hardTruths use empty string "". STRICT RULES FOR PUSH NOTIFICATIONS:
- Format: Sfera speaks directly to the user in second person. REFLECT back what the user did/learned/felt—do not give advice or commands.
- Start with "You...": e.g. "You learned that preparedness matters when traveling.", "You discovered you can trust your instincts.", "You felt stronger after that experience."
- BAD (avoid): Imperatives ("Trust your instincts.", "Be prepared!"), generic praise ("You did great."), advice ("You should...").
- GOOD: Reflect the specific moment in second person—"You realized independence matters as much as friendship."
- Tone: Supportive, empathetic. Max 15-20 words (readable on lock screen).`;

  const sferasContext = context.sferas
    ? `\n\nUser's Sferas context:\n${JSON.stringify(context.sferas, null, 2)}`
    : "";

  const userPrompt = `${prompt}${sferasContext}`;

  const app = getApp();
  const ai = getAI(app, {
    appCheck: firebase.appCheck(),
  });

  const model = getGenerativeModel(ai, {
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const parts: any[] = [{ text: userPrompt }];
  if (imageUri) {
    try {
      const base64Image = await readImageAsBase64(imageUri);
      parts.push({ inlineData: { data: base64Image, mimeType: "image/jpeg" } });
    } catch (error) {
      console.error("Failed to process image for AI:", error);
      // Continue without image
    }
  }

  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
    systemInstruction: systemPrompt,
  });

  const responseText = result.response.text();
  const parsed = JSON.parse(responseText);

  return parsed as AIMemoryResponse;
}

/**
 * Suggest notification messages for manual-lesson moments (batch).
 * One AI request for all lessons; returns map of momentId -> notificationMessage.
 */
// Max attempts to get a complete response from Gemini.
// Gemini can occasionally drop/truncate one item per call for long batches;
// we retry only the missing aliases to guarantee full coverage.
const MAX_AI_MESSAGE_RETRY_ATTEMPTS = 3;

/**
 * Low-level Gemini call for lessons. Input/output is keyed by SHORT ALIASES
 * (e.g. "m0", "m1"). The caller is responsible for mapping aliases to real ids.
 * Using aliases avoids the "Gemini drops a long momentId" class of bugs.
 */
async function requestLessonMessagesByAlias(
  aliased: { alias: string; text: string; memoryTitle?: string }[],
  language: "en" | "bg"
): Promise<{ [alias: string]: string }> {
  if (aliased.length === 0) return {};

  if (USE_MOCK_AI_REQUEST) {
    await new Promise((r) => setTimeout(r, 1000));
    const out: { [alias: string]: string } = {};
    for (const l of aliased) {
      out[l.alias] = "You learned something valuable from that experience.";
    }
    return out;
  }

  const languageName = language === "bg" ? "Bulgarian" : "English";
  const languageCode = language === "bg" ? "bg" : "en";

  const responseSchema = Schema.object({
    properties: {
      momentNotificationMessages: Schema.array({
        items: Schema.object({
          properties: {
            momentId: Schema.string({
              description:
                "Short alias copied EXACTLY from input (e.g. m0, m1, m2). Must be one of the aliases provided.",
            }),
            notificationMessage: Schema.string({
              description:
                "As Sfera addressing the user. Use second person and REFLECT what they learned (e.g. 'You learned that...'). Max 15-20 words. No imperatives.",
            }),
          },
          required: ["momentId", "notificationMessage"],
        }),
      }),
    },
    required: ["momentNotificationMessages"],
  });

  const strictRules = `STRICT RULES FOR PUSH NOTIFICATIONS:
- Format: Sfera speaks directly to the user in second person. REFLECT back what the user learned—do not give advice or commands.
- Start with "You...": e.g. "You learned that preparedness matters when traveling.", "You discovered you can trust your instincts."
- BAD (avoid): Imperatives ("Trust your instincts.", "Be prepared!"), generic praise ("You did great."), advice ("You should...").
- GOOD: Reflect the lesson in second person—"You realized independence matters as much as friendship."
- Tone: Supportive, empathetic. Max 15-20 words (readable on lock screen).`;

  const systemPrompt = `Sfera AI coach. For each lesson provided, suggest exactly one notification message that reminds the user about this insight. Respond in ${languageName} (${languageCode}). JSON only.

${strictRules}

CRITICAL OUTPUT CONTRACT:
- Return EXACTLY one object for EVERY input lesson. Do not skip any. Do not merge.
- Copy the momentId alias VERBATIM from the input (e.g. "m0" -> "m0"). Never invent, truncate, or reformat aliases.
- If you cannot produce a message for a lesson, still return the alias with a best-effort reflection.`;

  const userPrompt = `Lessons (${aliased.length}):\n${aliased
    .map(
      (l) =>
        `- momentId: "${l.alias}", text: "${l.text.replace(/"/g, '\\"')}"${l.memoryTitle ? `, memoryTitle: "${l.memoryTitle}"` : ""}`
    )
    .join("\n")}`;

  const app = getApp();
  const ai = getAI(app, { appCheck: firebase.appCheck() });
  const model = getGenerativeModel(ai, {
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    systemInstruction: systemPrompt,
  });

  const responseText = result.response.text();
  const parsed = JSON.parse(responseText) as {
    momentNotificationMessages: { momentId: string; notificationMessage: string }[];
  };

  const map: { [alias: string]: string } = {};
  for (const item of parsed.momentNotificationMessages ?? []) {
    if (item.momentId && item.notificationMessage?.trim()) {
      map[item.momentId] = item.notificationMessage.trim();
    }
  }

  return map;
}

export async function suggestNotificationMessagesForLessons(
  lessons: {
    id: string;
    text: string;
    memoryTitle?: string;
    sphere: LifeSphere;
  }[],
  language: "en" | "bg" = "en"
): Promise<{ [momentId: string]: string }> {
  if (lessons.length === 0) return {};

  // Build alias <-> real id maps. Aliases are short (m0, m1, ...) so Gemini
  // echoes them reliably and cannot truncate them mid-token.
  const realById = new Map<string, { id: string; text: string; memoryTitle?: string }>();
  const aliasByRealId = new Map<string, string>();
  lessons.forEach((l, i) => {
    const alias = `m${i}`;
    realById.set(alias, { id: l.id, text: l.text, memoryTitle: l.memoryTitle });
    aliasByRealId.set(l.id, alias);
  });

  console.log(
    `[ai-service] suggestNotificationMessagesForLessons: requesting ${lessons.length} message(s)`
  );

  const resolved: { [realId: string]: string } = {};
  const pending = new Set<string>(realById.keys());

  for (let attempt = 1; attempt <= MAX_AI_MESSAGE_RETRY_ATTEMPTS; attempt++) {
    if (pending.size === 0) break;

    const batch = Array.from(pending).map((alias) => {
      const real = realById.get(alias)!;
      return { alias, text: real.text, memoryTitle: real.memoryTitle };
    });

    const batchMap = await requestLessonMessagesByAlias(batch, language);

    for (const alias of Array.from(pending)) {
      const msg = batchMap[alias];
      if (msg?.trim()) {
        const real = realById.get(alias)!;
        resolved[real.id] = msg.trim();
        pending.delete(alias);
      }
    }

    if (pending.size > 0) {
      console.warn(
        `[ai-service] suggestNotificationMessagesForLessons: attempt ${attempt}/${MAX_AI_MESSAGE_RETRY_ATTEMPTS} missed ${pending.size}/${batch.length} message(s); retrying missing only`,
        { missingAliases: Array.from(pending) }
      );
    }
  }

  if (pending.size > 0) {
    const missingRealIds = Array.from(pending).map((a) => realById.get(a)!.id);
    console.error(
      `[ai-service] suggestNotificationMessagesForLessons: FAILED — ${missingRealIds.length} lesson(s) still missing after ${MAX_AI_MESSAGE_RETRY_ATTEMPTS} attempt(s)`,
      { missingRealIds }
    );
    throw new Error(
      `AI could not generate notification messages for ${missingRealIds.length} lesson(s) after ${MAX_AI_MESSAGE_RETRY_ATTEMPTS} attempts. Please try again.`
    );
  }

  console.log(
    `[ai-service] suggestNotificationMessagesForLessons: OK ${Object.keys(resolved).length}/${lessons.length}`
  );
  return resolved;
}

/**
 * Suggest notification messages for sunny-moment (goodFacts) moments (batch).
 * One AI request for all sunny moments; returns map of momentId -> notificationMessage.
 */
async function requestSunnyMomentMessagesByAlias(
  aliased: { alias: string; text: string; memoryTitle?: string }[],
  language: "en" | "bg"
): Promise<{ [alias: string]: string }> {
  if (aliased.length === 0) return {};

  if (USE_MOCK_AI_REQUEST) {
    await new Promise((r) => setTimeout(r, 1000));
    const out: { [alias: string]: string } = {};
    for (const m of aliased) {
      out[m.alias] = "You experienced something positive from that moment.";
    }
    return out;
  }

  const languageName = language === "bg" ? "Bulgarian" : "English";
  const languageCode = language === "bg" ? "bg" : "en";

  const responseSchema = Schema.object({
    properties: {
      momentNotificationMessages: Schema.array({
        items: Schema.object({
          properties: {
            momentId: Schema.string({
              description:
                "Short alias copied EXACTLY from input (e.g. m0, m1, m2). Must be one of the aliases provided.",
            }),
            notificationMessage: Schema.string({
              description:
                "As Sfera addressing the user. Use second person and REFLECT what they felt/experienced (e.g. 'You felt...'). Max 15-20 words. No imperatives.",
            }),
          },
          required: ["momentId", "notificationMessage"],
        }),
      }),
    },
    required: ["momentNotificationMessages"],
  });

  const strictRules = `STRICT RULES FOR PUSH NOTIFICATIONS:
- Format: Sfera speaks directly to the user in second person. REFLECT back what the user felt/experienced—do not give advice or commands.
- Start with "You...": e.g. "You felt confident when...", "You discovered joy in...", "You experienced warmth with..."
- BAD (avoid): Imperatives, generic praise ("You did great."), advice.
- GOOD: Reflect the sunny moment in second person—"You felt stronger after that experience."
- Tone: Supportive, empathetic. Max 15-20 words (readable on lock screen).`;

  const systemPrompt = `Sfera AI coach. For each sunny moment provided, suggest exactly one notification message that reflects what the user felt or experienced. Respond in ${languageName} (${languageCode}). JSON only.

${strictRules}

CRITICAL OUTPUT CONTRACT:
- Return EXACTLY one object for EVERY input moment. Do not skip any. Do not merge.
- Copy the momentId alias VERBATIM from the input (e.g. "m0" -> "m0"). Never invent, truncate, or reformat aliases.
- If you cannot produce a message for a moment, still return the alias with a best-effort reflection.`;

  const userPrompt = `Sunny moments (${aliased.length}):\n${aliased
    .map(
      (m) =>
        `- momentId: "${m.alias}", text: "${m.text.replace(/"/g, '\\"')}"${m.memoryTitle ? `, memoryTitle: "${m.memoryTitle}"` : ""}`
    )
    .join("\n")}`;

  const app = getApp();
  const ai = getAI(app, { appCheck: firebase.appCheck() });
  const model = getGenerativeModel(ai, {
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    systemInstruction: systemPrompt,
  });

  const responseText = result.response.text();
  const parsed = JSON.parse(responseText) as {
    momentNotificationMessages: { momentId: string; notificationMessage: string }[];
  };

  const map: { [alias: string]: string } = {};
  for (const item of parsed.momentNotificationMessages ?? []) {
    if (item.momentId && item.notificationMessage?.trim()) {
      map[item.momentId] = item.notificationMessage.trim();
    }
  }

  return map;
}

export async function suggestNotificationMessagesForSunnyMoments(
  moments: {
    id: string;
    text: string;
    memoryTitle?: string;
    sphere: LifeSphere;
  }[],
  language: "en" | "bg" = "en"
): Promise<{ [momentId: string]: string }> {
  if (moments.length === 0) return {};

  const realById = new Map<string, { id: string; text: string; memoryTitle?: string }>();
  const aliasByRealId = new Map<string, string>();
  moments.forEach((m, i) => {
    const alias = `m${i}`;
    realById.set(alias, { id: m.id, text: m.text, memoryTitle: m.memoryTitle });
    aliasByRealId.set(m.id, alias);
  });

  console.log(
    `[ai-service] suggestNotificationMessagesForSunnyMoments: requesting ${moments.length} message(s)`
  );

  const resolved: { [realId: string]: string } = {};
  const pending = new Set<string>(realById.keys());

  for (let attempt = 1; attempt <= MAX_AI_MESSAGE_RETRY_ATTEMPTS; attempt++) {
    if (pending.size === 0) break;

    const batch = Array.from(pending).map((alias) => {
      const real = realById.get(alias)!;
      return { alias, text: real.text, memoryTitle: real.memoryTitle };
    });

    const batchMap = await requestSunnyMomentMessagesByAlias(batch, language);

    for (const alias of Array.from(pending)) {
      const msg = batchMap[alias];
      if (msg?.trim()) {
        const real = realById.get(alias)!;
        resolved[real.id] = msg.trim();
        pending.delete(alias);
      }
    }

    if (pending.size > 0) {
      console.warn(
        `[ai-service] suggestNotificationMessagesForSunnyMoments: attempt ${attempt}/${MAX_AI_MESSAGE_RETRY_ATTEMPTS} missed ${pending.size}/${batch.length} message(s); retrying missing only`,
        { missingAliases: Array.from(pending) }
      );
    }
  }

  if (pending.size > 0) {
    const missingRealIds = Array.from(pending).map((a) => realById.get(a)!.id);
    console.error(
      `[ai-service] suggestNotificationMessagesForSunnyMoments: FAILED — ${missingRealIds.length} moment(s) still missing after ${MAX_AI_MESSAGE_RETRY_ATTEMPTS} attempt(s)`,
      { missingRealIds }
    );
    throw new Error(
      `AI could not generate notification messages for ${missingRealIds.length} sunny moment(s) after ${MAX_AI_MESSAGE_RETRY_ATTEMPTS} attempts. Please try again.`
    );
  }

  console.log(
    `[ai-service] suggestNotificationMessagesForSunnyMoments: OK ${Object.keys(resolved).length}/${moments.length}`
  );
  return resolved;
}

/**
 * Process entity creation prompt with AI
 */
export async function processEntityCreationPrompt(
  prompt: string,
  sphere: LifeSphere,
  language: string = "en",
): Promise<AIEntityCreationResponse> {

  // If using mock requests, return mock data
  if (USE_MOCK_AI_REQUEST) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return {
      sphere,
      entities: [
        {
          name: "Mock Entity",
          description: prompt.substring(0, 100),
          ...(sphere === "relationships" || sphere === "career"
            ? { isCurrent: false, startDate: "2020-01-01", endDate: "2023-06-15" }
            : {}),
          ...(sphere === "family" ? { relationship: "mother" } : {}),
        },
      ],
    };
  }

  const languageName = language === "bg" ? "Bulgarian" : "English";
  const languageCode = language === "bg" ? "bg" : "en";

  const spherePrompts: Record<LifeSphere, string> = {
    relationships:
      "Analyze the story and extract all relationships/partners mentioned",
    career: "Analyze the story and extract all jobs/careers mentioned",
    family: "Analyze the story and extract all family members mentioned",
    friends: "Analyze the story and extract all friends mentioned",
    hobbies: "Analyze the story and extract all hobbies mentioned",
  };

  const entityProperties: Record<string, any> = {
    name: Schema.string({
      description: `Name of the ${sphere} entity`,
    }),
    description: Schema.string({
      description: `Brief description`,
    }),
  };

  const requiredFields = ["name", "description"];

  if (sphere === "relationships" || sphere === "career") {
    entityProperties.isCurrent = Schema.boolean({
      description: "Whether this is current (true) or past (false)",
    });
    entityProperties.startDate = Schema.string({
      description: "Approximate start date in YYYY-MM-DD format",
    });
    entityProperties.endDate = Schema.string({
      description:
        "Approximate end date in YYYY-MM-DD format (omit if isCurrent is true)",
    });
    requiredFields.push("isCurrent", "startDate");
  }

  if (sphere === "family") {
    entityProperties.relationship = Schema.string({
      description:
        "Relationship type (e.g. mother, father, sister, brother, aunt, uncle, grandmother, grandfather, cousin)",
    });
    requiredFields.push("relationship");
  }

  const responseSchema = Schema.object({
    properties: {
      sphere: Schema.string({
        enum: ["relationships", "career", "family", "friends", "hobbies"],
        description: "The life sphere these entities belong to",
      }),
      entities: Schema.array({
        items: Schema.object({
          properties: entityProperties,
          required: requiredFields,
        }),
      }),
    },
    required: ["sphere", "entities"],
  });

  const dateGuidance =
    sphere === "relationships" || sphere === "career"
      ? `\n- Include startDate (YYYY-MM-DD) and isCurrent flag for each entity\n- If the entity has ended, include endDate (YYYY-MM-DD)`
      : "";

  const familyGuidance =
    sphere === "family"
      ? `\n- Include the relationship type (mother, father, sister, etc.) for each family member`
      : "";

  const systemPrompt = `Sfera AI coach. ${spherePrompts[sphere]}.

Respond in ${languageName} (${languageCode}). JSON only.

CRITICAL: You MUST return at least 1 entity. Never return an empty entities array. If the user mentions people, places, activities, or experiences, create entities from them. If the text is vague, infer the most likely entity from context.

Rules:
- Extract ALL entities mentioned in the story (1-5 entities)
- You MUST always create at least 1 entity from the user's text
- For each entity provide a name and brief description
- Set sphere to "${sphere}"${dateGuidance}${familyGuidance}
- Be honest but compassionate`;

  const app = getApp();
  const ai = getAI(app, {
    appCheck: firebase.appCheck(),
  });

  const model = getGenerativeModel(ai, {
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    systemInstruction: systemPrompt,
  });

  const responseText = result.response.text();
  const parsed = JSON.parse(responseText);
  return parsed as AIEntityCreationResponse;
}

export interface AIMemoryResponse {
  memory: {
    title: string;
    description: string;
    date: string;
  };
  sphere?: "relationships" | "career" | "family" | "friends" | "hobbies";
  entityName?: string;
  moments: {
    type: "sunnyMoments" | "lessonsLearned" | "hardTruths";
    text: string;
    notificationMessage?: string;
  }[];
}

export interface AIEntitySuggestion {
  name: string;
  description?: string;
  isCurrent?: boolean;
  startDate?: string;
  endDate?: string;
  relationship?: string;
  imageUri?: string;
}

export interface AIEntityCreationResponse {
  sphere: "relationships" | "career" | "family" | "friends" | "hobbies";
  entities: AIEntitySuggestion[];
}

/** Onboarding: extract entities across ALL spheres from one story */
export interface AIOnboardingResponse {
  entitiesBySphere: {
    relationships?: AIEntitySuggestion[];
    career?: AIEntitySuggestion[];
    family?: AIEntitySuggestion[];
    friends?: AIEntitySuggestion[];
    hobbies?: AIEntitySuggestion[];
  };
}

/**
 * Process onboarding prompt - extract entities from ALL life spheres based on user's story.
 * User introduces themselves (family, friends, job, hobbies, relationships) and AI suggests entities for each sphere.
 */
export async function processOnboardingPrompt(
  story: string,
  language: string = "en",
): Promise<AIOnboardingResponse> {
  if (USE_MOCK_AI_REQUEST) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return {
      entitiesBySphere: {
        family: [{ name: "Family Member", description: story.substring(0, 80), relationship: "parent" }],
        friends: [{ name: "Friend", description: story.substring(0, 80) }],
        hobbies: [{ name: "Hobby", description: story.substring(0, 80) }],
      },
    };
  }

  const languageName = language === "bg" ? "Bulgarian" : "English";
  const languageCode = language === "bg" ? "bg" : "en";

  const entitySchema = Schema.object({
    properties: {
      name: Schema.string({ description: "Name of the entity" }),
      description: Schema.string({ description: "Brief description" }),
      isCurrent: Schema.boolean({ description: "For relationships/career: whether current (true) or past (false)" }),
      startDate: Schema.string({ description: "For relationships/career: approximate start date YYYY-MM-DD" }),
      endDate: Schema.string({ description: "For relationships/career: end date YYYY-MM-DD if past" }),
      relationship: Schema.string({ description: "For family only: relationship type (mother, father, sister, etc.)" }),
    },
    required: ["name", "description"],
  });

  const responseSchema = Schema.object({
    properties: {
      entitiesBySphere: Schema.object({
        properties: {
          relationships: Schema.array({
            items: entitySchema,
            description: "Ex-partners, current/past romantic relationships mentioned",
          }),
          career: Schema.array({
            items: entitySchema,
            description: "Jobs, companies, career roles mentioned",
          }),
          family: Schema.array({
            items: entitySchema,
            description: "Family members (parents, siblings, etc.) mentioned",
          }),
          friends: Schema.array({
            items: entitySchema,
            description: "Friends mentioned",
          }),
          hobbies: Schema.array({
            items: entitySchema,
            description: "Hobbies, interests, activities mentioned",
          }),
        },
      }),
    },
    required: ["entitiesBySphere"],
  });

  const systemPrompt = `Sfera AI coach. Analyze the user's personal story and extract ALL possible entities across their life spheres.

The user is introducing themselves to Sfera - their universe of life spheres and memories. They may mention:
- Family: parents, siblings, children, relatives
- Friends: close friends, social circle
- Career: jobs, companies, roles, work history
- Relationships: romantic partners, ex-partners, current/past relationships
- Hobbies: interests, activities, things they enjoy

CRITICAL: Extract EVERY entity mentioned. Return entities grouped by sphere. For each sphere that has mentions, include an array of entities. Omit spheres with no mentions (or use empty array).

Rules:
- relationships: Include isCurrent, startDate, endDate (if past). Do NOT suggest a relationship entity for being single—e.g. never create "Self" or similar when the user only says they are or have been single. This sphere is for actual romantic partners or ex-partners only; leave relationships array empty if none are mentioned.
- career: Include isCurrent, startDate, endDate (if past)
- family: Include relationship (mother, father, sister, brother, etc.)
- friends, hobbies: Just name and description

Respond in ${languageName} (${languageCode}). JSON only.`;

  const app = getApp();
  const ai = getAI(app, { appCheck: firebase.appCheck() });
  const model = getGenerativeModel(ai, {
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: story }] }],
    systemInstruction: systemPrompt,
  });

  const responseText = result.response.text();
  const parsed = JSON.parse(responseText);

  const raw = parsed?.entitiesBySphere ?? {};
  const normalized: AIOnboardingResponse["entitiesBySphere"] = {};
  const spheres: Array<keyof typeof normalized> = ["relationships", "career", "family", "friends", "hobbies"];
  for (const sphere of spheres) {
    const arr = raw[sphere];
    if (Array.isArray(arr) && arr.length > 0) {
      normalized[sphere] = arr.map((e: any) => {
        const out: AIEntitySuggestion = {
          name: String(e?.name ?? "").trim() || "Unknown",
          description: e?.description != null ? String(e.description).trim() : "",
        };
        if (sphere === "relationships" || sphere === "career") {
          out.isCurrent = e?.isCurrent;
          out.startDate = e?.startDate ? String(e.startDate).trim() : undefined;
          out.endDate = e?.endDate ? String(e.endDate).trim() : undefined;
        }
        if (sphere === "family") {
          out.relationship = e?.relationship ? String(e.relationship).trim() : undefined;
        }
        return out;
      });
    }
  }

  return { entitiesBySphere: normalized };
}

/** One preloaded exam item: each question is linked to a specific user lesson. */
export interface PreloadedExamQuestion {
  lessonId: string;
  lessonText: string; // Revealed after user answers; AI uses this to evaluate
  question: string; // Situational question based on this lesson
  memoryId?: string;
  memoryImageUri?: string;
  /** For main wheel: needed for navigation to memory (entity wheel knows entity from context) */
  entityId?: string;
  sphere?: "relationships" | "career" | "family" | "friends" | "hobbies";
}

/** Wheel exam: pick up to 20 lessons, generate ONE question per lesson (each question linked to its lesson). */
export async function generateLessonExamQuestionsBatch(
  lessons: {
    id: string;
    text: string;
    memoryId?: string;
    memoryImageUri?: string;
    entityId?: string;
    sphere?: "relationships" | "career" | "family" | "friends" | "hobbies";
  }[],
  language: "en" | "bg" = "en",
): Promise<PreloadedExamQuestion[]> {
  if (lessons.length === 0) return [];

  if (USE_MOCK_AI_REQUEST) {
    await new Promise((r) => setTimeout(r, 1500));
    return lessons.map((l) => ({
      lessonId: l.id,
      lessonText: l.text,
      question:
        language === "bg"
          ? "Представи си ситуация, в която трябва да приложиш този урок. Как би реагирал?"
          : "Imagine a situation where you'd need to apply this lesson. How would you respond?",
      memoryId: l.memoryId,
      memoryImageUri: l.memoryImageUri,
      entityId: l.entityId,
      sphere: l.sphere,
    }));
  }

  const languageName = language === "bg" ? "Bulgarian" : "English";
  const responseSchema = Schema.object({
    properties: {
      questions: Schema.array({
        items: Schema.object({
          properties: {
            lessonIndex: Schema.number({
              description: "0-based index of the lesson in the input list",
            }),
            question: Schema.string({
              description:
                "Short situational question (1-2 sentences, under 120 chars). Concrete scenario. Second person 'you'. Do NOT reveal the lesson.",
            }),
          },
          required: ["lessonIndex", "question"],
        }),
      }),
    },
    required: ["questions"],
  });

  const systemPrompt = `Sfera AI coach. For each lesson provided, create ONE short situational quiz question to test if someone learned it.
Rules per question:
- Presents a concrete situation/scenario where the user could apply the lesson.
- Use second person "you". Keep 1-2 sentences, under 120 characters.
- Do NOT reveal the lesson in the question.
Respond in ${languageName}. JSON only. Return exactly one question per input lesson, in the same order.`;

  const lessonsBlock = lessons
    .map(
      (l, i) =>
        `[${i}] "${l.text.substring(0, 200)}${l.text.length > 200 ? "..." : ""}"`,
    )
    .join("\n");
  const userPrompt = `Lessons (index and text):\n${lessonsBlock}\n\nGenerate one situational question for each lesson. Return questions array with lessonIndex and question.`;

  const app = getApp();
  const ai = getAI(app, { appCheck: firebase.appCheck() });
  const model = getGenerativeModel(ai, {
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    systemInstruction: systemPrompt,
  });

  const responseText = result.response.text();
  const parsed = JSON.parse(responseText) as {
    questions: { lessonIndex: number; question: string }[];
  };
  const questions = parsed?.questions ?? [];

  const resultItems = questions
    .filter((q) => q.lessonIndex >= 0 && q.lessonIndex < lessons.length)
    .map((q) => {
      const lesson = lessons[q.lessonIndex];
      if (!lesson) return null;
      return {
        lessonId: lesson.id,
        lessonText: lesson.text,
        question: (q.question || "").trim().replace(/^["']|["']$/g, ""),
        memoryId: lesson.memoryId,
        memoryImageUri: lesson.memoryImageUri,
        entityId: lesson.entityId,
        sphere: lesson.sphere,
      };
    })
    .filter((q): q is PreloadedExamQuestion => q != null);

  return resultItems;
}

/** Wheel exam: generate a situational question based on a lesson (legacy single-call) */
export async function generateLessonExamQuestion(
  lessonText: string,
  language: "en" | "bg" = "en",
): Promise<string> {
  if (USE_MOCK_AI_REQUEST) {
    await new Promise((r) => setTimeout(r, 800));
    return language === "bg"
      ? "Представи си ситуация, в която трябва да приложиш този урок. Как би реагирал?"
      : "Imagine a situation where you'd need to apply this lesson. How would you respond?";
  }

  const languageName = language === "bg" ? "Bulgarian" : "English";
  const systemPrompt = `Sfera AI coach. You create short situational quiz questions to test if someone learned a personal lesson.
Rules:
- Output ONE question only, no quotes, no preamble.
- The question presents a concrete situation or scenario where the user could apply the lesson.
- Use second person "you" (e.g. "You're faced with...", "Someone says to you...", "In this situation you...").
- Keep it 1-2 sentences, under 120 characters ideally.
- Do NOT reveal the lesson itself in the question.
- Respond in ${languageName}.`;

  const userPrompt = `Lesson the user learned: "${lessonText}"

Generate ONE situational question to test if they'd apply this lesson.`;

  const app = getApp();
  const ai = getAI(app, { appCheck: firebase.appCheck() });
  const model = getGenerativeModel(ai, { model: "gemini-2.5-flash-lite" });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    systemInstruction: systemPrompt,
  });

  const text = result.response.text().trim();
  return text.replace(/^["']|["']$/g, ""); // Strip surrounding quotes if any
}

/** Wheel exam: analyze user's answer and determine if they demonstrated learning */
export interface LessonExamAnalysis {
  isCorrect: boolean;
  feedback: string;
}

export async function analyzeLessonExamAnswer(
  lessonText: string,
  question: string,
  userAnswer: string,
  language: "en" | "bg" = "en",
): Promise<LessonExamAnalysis> {
  if (USE_MOCK_AI_REQUEST) {
    await new Promise((r) => setTimeout(r, 1200));
    const hasContent = userAnswer.trim().length > 5;
    return {
      isCorrect: hasContent,
      feedback:
        language === "bg"
          ? "Добре! Показа, че си обмислил урока."
          : "Well done! You showed you've thought about the lesson.",
    };
  }

  const languageName = language === "bg" ? "Bulgarian" : "English";
  const responseSchema = Schema.object({
    properties: {
      isCorrect: Schema.boolean({
        description:
          "True if the user's answer demonstrates they understood and could apply the lesson. Be generous: partial understanding, personal reflection, or situational awareness counts. False only if completely off-topic or empty.",
      }),
      feedback: Schema.string({
        description:
          "One short supportive sentence. If correct: celebrate. If not: gentle encouragement. Max 80 chars.",
      }),
    },
    required: ["isCorrect", "feedback"],
  });

  const systemPrompt = `Sfera AI coach. You evaluate whether a user's answer to a situational question shows they learned a personal lesson.
Be generous: partial understanding, personal reflection, or situational awareness counts as correct.
Only mark isCorrect=false if the answer is completely off-topic, nonsensical, or empty.
Respond in ${languageName}. JSON only.`;

  const userPrompt = `Lesson: "${lessonText}"
Question: "${question}"
User's answer: "${userAnswer}"

Evaluate: isCorrect (boolean), feedback (short supportive sentence).`;

  const app = getApp();
  const ai = getAI(app, { appCheck: firebase.appCheck() });
  const model = getGenerativeModel(ai, {
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    systemInstruction: systemPrompt,
  });

  const responseText = result.response.text();
  const parsed = JSON.parse(responseText) as LessonExamAnalysis;

  return parsed;
}
