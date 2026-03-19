/**
 * AI Service - Handles AI API calls using Firebase AI (Gemini)
 */

import { getAI, getGenerativeModel, Schema } from "@react-native-firebase/ai";
import { getApp } from "@react-native-firebase/app";
import { firebase } from "@react-native-firebase/app-check";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import type { LifeSphere } from "./JourneyProvider";

// Runtime flag for mock AI requests (set to true to use slow mock requests for testing)
const USE_MOCK_AI_REQUEST = __DEV__ && false; // Set to true to enable mock requests

// ─── Safety Violation Tracking ───────────────────────────────────────────────

const SAFETY_VIOLATIONS_KEY = "@sferas:ai_safety_violations";
const MAX_DAILY_VIOLATIONS = 3;

/** Thrown when a prompt violates Sfera's content policy. */
export class AISafetyViolationError extends Error {
  constructor() {
    super("AI_SAFETY_VIOLATION");
    this.name = "AISafetyViolationError";
  }
}

/** Thrown when the user is blocked for the rest of the day after too many violations. */
export class AISafetyBlockedError extends Error {
  constructor() {
    super("AI_SAFETY_BLOCKED");
    this.name = "AISafetyBlockedError";
  }
}

interface SafetyViolationRecord {
  date: string; // YYYY-MM-DD
  count: number;
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Returns the number of safety violations recorded today. */
export async function getDailySafetyViolationCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(SAFETY_VIOLATIONS_KEY);
    if (!raw) return 0;
    const record: SafetyViolationRecord = JSON.parse(raw);
    if (record.date !== todayDateString()) return 0;
    return record.count;
  } catch {
    return 0;
  }
}

/** Returns true if the user is blocked from making AI entity/memory requests today. */
export async function isAISafetyBlocked(): Promise<boolean> {
  return (await getDailySafetyViolationCount()) >= MAX_DAILY_VIOLATIONS;
}

/**
 * Records a safety violation. After MAX_DAILY_VIOLATIONS the user is blocked for the day.
 * Returns the new violation count.
 */
export async function recordAISafetyViolation(): Promise<number> {
  try {
    const today = todayDateString();
    const raw = await AsyncStorage.getItem(SAFETY_VIOLATIONS_KEY);
    let record: SafetyViolationRecord = { date: today, count: 0 };
    if (raw) {
      const parsed: SafetyViolationRecord = JSON.parse(raw);
      if (parsed.date === today) record = parsed;
    }
    record.count = Math.min(record.count + 1, MAX_DAILY_VIOLATIONS);
    await AsyncStorage.setItem(SAFETY_VIOLATIONS_KEY, JSON.stringify(record));
    return record.count;
  } catch {
    return 1;
  }
}

// ─── Content Safety Rules ─────────────────────────────────────────────────────

// Safety content policy injected into all entity and memory prompts
const CONTENT_SAFETY_RULES = `
CONTENT SAFETY (NON-NEGOTIABLE):
- NEVER process prompts that involve: violence, illegal activities, death, self-harm, disturbing or graphic events, political topics, hate speech, or anything immoral or harmful.
- Stories and memories may be sad or emotionally difficult—but must remain moral and constructive.
- If the user's input contains ANY forbidden content, you MUST set safetyViolation: true in your response and return nothing else. Do NOT extract any partial content. Reject the entire prompt.
- All content must support personal growth, healing, and well-being.`;

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

export interface AIEncouragementResponse {
  messages: string[]; // Array of motivational messages for the day
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
 * Process home screen encouragement prompt - returns multiple messages for the day
 * Makes ONE request per day that returns 8-12 motivational messages
 */
export async function processHomeEncouragementPrompt(params: {
  overallSunnyPercentage: number;
  sunnyMomentsCount: number;
  cloudyMomentsCount: number;
  sampleLessons: string[];
  sampleSunnyMoments: string[];
  sampleCloudyMoments?: string[];
  targetCharCount: number;
  language: "en" | "bg";
}): Promise<AIEncouragementResponse> {
  const {
    overallSunnyPercentage,
    sunnyMomentsCount,
    cloudyMomentsCount,
    sampleLessons,
    sampleSunnyMoments,
    sampleCloudyMoments = [],
    targetCharCount,
    language,
  } = params;

  // If using mock requests, just return deterministic messages
  if (USE_MOCK_AI_REQUEST) {
    return {
      messages:
        language === "bg"
          ? [
              "Чудесно! Ти напредваш — продължавай да създаваш малки слънчеви моменти всеки ден. ✨",
              "Всеки ден е възможност да добавиш повече радост в живота си.",
              "Твоите моменти разказват история за растеж и любов.",
            ]
          : [
              "Wonderful! You're making progress - keep creating small sunny moments every day. ✨",
              "Each day is an opportunity to add more joy to your life.",
              "Your moments tell a story of growth and love.",
            ],
    };
  }

  const languageName = language === "bg" ? "Bulgarian" : "English";
  const languageCode = language === "bg" ? "bg" : "en";

  const responseSchema = Schema.object({
    properties: {
      messages: Schema.array({
        items: Schema.string({
          description:
            "A single-sentence (or two short sentences) motivational notification message for the home banner. No newlines.",
        }),
      }),
    },
    required: ["messages"],
  });

  const systemPrompt = `Sfera AI coach. Create 8-12 short, encouraging, premium-sounding home-banner messages for the day. Respond in ${languageName} (${languageCode}). JSON only, each message ~${targetCharCount} chars (±15%), no newlines, no emojis.
Rules: Motivational, second-person "you". No shaming, no advice overload, no numbers/stats/clinical language. Reflect tone from whether sunny or cloudy prevails (implicitly). Always acknowledge love and lessons; if cloudy prevails, gently encourage more sunny moments. Vary the messages so they feel fresh when shown randomly throughout the day.${CONTENT_SAFETY_RULES}`;

  const tone =
    overallSunnyPercentage >= 55 ? "sunny prevails" : "cloudy prevails";
  const latestLessons = sampleLessons.slice(0, 2).join(" | ") || "None";
  const latestSunny = sampleSunnyMoments.slice(0, 2).join(" | ") || "None";
  const latestCloudy = sampleCloudyMoments.slice(0, 2).join(" | ") || "None";
  const userPrompt = `Tone: ${tone}
Latest lessons: ${latestLessons}
Latest sunny: ${latestSunny}
Latest cloudy: ${latestCloudy}
Write 8-12 varied notification messages for today.`;

  const app = getApp();
  const ai = getAI(app, {
    appCheck: firebase.appCheck(),
  });

  // IMPORTANT: Each call creates a fresh model instance - no conversation history is maintained
  // We send the complete current state in each request, so no need for context history
  const model = getGenerativeModel(ai, {
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  // Generate content with single user message - no conversation history
  // Each request is stateless and includes all necessary context in the current message
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userPrompt }] }], // Single message only - no history
    systemInstruction: systemPrompt,
  });

  const responseText = result.response.text();
  const parsed = JSON.parse(responseText);

  // Normalize: accept array of strings, or array of objects with .text
  let messages: string[] = [];
  if (Array.isArray(parsed?.messages)) {
    messages = parsed.messages
      .map((m: any) => (typeof m === "string" ? m.trim() : m?.text != null ? String(m.text).trim() : ""))
      .filter((m: string) => m.length > 0);
  } else if (typeof parsed?.message === "string" && parsed.message.trim()) {
    messages = [parsed.message.trim()];
  }

  if (messages.length === 0) {
    throw new Error("AI returned no valid encouragement messages");
  }

  return { messages };
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

  // Block if the user has exceeded daily safety violations
  if (await isAISafetyBlocked()) {
    throw new AISafetyBlockedError();
  }

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
              description: 'Text content of the moment (first person "I")',
            }),
            notificationMessage: Schema.string({
              description:
                "REQUIRED for sunnyMoments and lessonsLearned: As Sfera addressing the user. Use second person and REFLECT what they did/learned (e.g. 'You learned that...', 'You discovered...', 'You felt...'). Max 15-20 words. No imperatives. Use empty string for hardTruths.",
            }),
          },
          required: ["type", "text", "notificationMessage"],
        }),
      }),
      safetyViolation: Schema.boolean({
        description: "Set to true ONLY if the prompt violates content safety rules. When true, omit all other fields.",
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
- Lessons should be actionable insights
- Sunny moments should be specific positive experiences

REQUIRED: For EVERY sunnyMoments and lessonsLearned moment you MUST provide notificationMessage. For hardTruths use empty string "". STRICT RULES FOR PUSH NOTIFICATIONS:
- Format: Sfera speaks directly to the user in second person. REFLECT back what the user did/learned/felt—do not give advice or commands.
- Start with "You...": e.g. "You learned that preparedness matters when traveling.", "You discovered you can trust your instincts.", "You felt stronger after that experience."
- BAD (avoid): Imperatives ("Trust your instincts.", "Be prepared!"), generic praise ("You did great."), advice ("You should...").
- GOOD: Reflect the specific moment in second person—"You realized independence matters as much as friendship."
- Tone: Supportive, empathetic. Max 15-20 words (readable on lock screen).${
    imageUri
      ? `

IMAGE: If a photo is attached, analyze it with the story. Identify people, setting, occasion, mood. The image is the memory's picture—use it to suggest more specific moments.`
      : ""
  }${CONTENT_SAFETY_RULES}`;

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

  if (parsed?.safetyViolation === true) {
    await recordAISafetyViolation();
    throw new AISafetyViolationError();
  }

  return parsed as AIMemoryResponse;
}

/**
 * Suggest notification messages for manual-lesson moments (batch).
 * One AI request for all lessons; returns map of momentId -> notificationMessage.
 */
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

  if (USE_MOCK_AI_REQUEST) {
    await new Promise((r) => setTimeout(r, 1000));
    const out: { [momentId: string]: string } = {};
    for (const l of lessons) {
      out[l.id] = "You learned something valuable from that experience.";
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
            momentId: Schema.string({ description: "Same id as in the input lesson" }),
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

Return one object per lesson with momentId (same as input) and notificationMessage.`;

  const userPrompt = `Lessons:\n${lessons
    .map(
      (l) =>
        `- momentId: "${l.id}", text: "${l.text.replace(/"/g, '\\"')}"${l.memoryTitle ? `, memoryTitle: "${l.memoryTitle}"` : ""}`
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

  const map: { [momentId: string]: string } = {};
  for (const item of parsed.momentNotificationMessages ?? []) {
    if (item.momentId && item.notificationMessage?.trim()) {
      map[item.momentId] = item.notificationMessage.trim();
    }
  }

  return map;
}

/**
 * Suggest notification messages for sunny-moment (goodFacts) moments (batch).
 * One AI request for all sunny moments; returns map of momentId -> notificationMessage.
 */
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

  if (USE_MOCK_AI_REQUEST) {
    await new Promise((r) => setTimeout(r, 1000));
    const out: { [momentId: string]: string } = {};
    for (const m of moments) {
      out[m.id] = "You experienced something positive from that moment.";
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
            momentId: Schema.string({ description: "Same id as in the input moment" }),
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

Return one object per moment with momentId (same as input) and notificationMessage.`;

  const userPrompt = `Sunny moments:\n${moments
    .map(
      (m) =>
        `- momentId: "${m.id}", text: "${m.text.replace(/"/g, '\\"')}"${m.memoryTitle ? `, memoryTitle: "${m.memoryTitle}"` : ""}`
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

  const map: { [momentId: string]: string } = {};
  for (const item of parsed.momentNotificationMessages ?? []) {
    if (item.momentId && item.notificationMessage?.trim()) {
      map[item.momentId] = item.notificationMessage.trim();
    }
  }

  return map;
}

/**
 * Process entity creation prompt with AI
 */
export async function processEntityCreationPrompt(
  prompt: string,
  sphere: LifeSphere,
  language: string = "en",
): Promise<AIEntityCreationResponse> {

  // Block if the user has exceeded daily safety violations
  if (await isAISafetyBlocked()) {
    throw new AISafetyBlockedError();
  }

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
      safetyViolation: Schema.boolean({
        description: "Set to true ONLY if the prompt violates content safety rules. When true, omit all other fields.",
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
- Be honest but compassionate${CONTENT_SAFETY_RULES}`;

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

  if (parsed?.safetyViolation === true) {
    await recordAISafetyViolation();
    throw new AISafetyViolationError();
  }

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
  // Block if the user has exceeded daily safety violations
  if (await isAISafetyBlocked()) {
    throw new AISafetyBlockedError();
  }

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
      safetyViolation: Schema.boolean({
        description: "Set to true ONLY if the prompt violates content safety rules. When true, omit entitiesBySphere.",
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
${CONTENT_SAFETY_RULES}
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

  if (parsed?.safetyViolation === true) {
    await recordAISafetyViolation();
    throw new AISafetyViolationError();
  }

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

export interface LessonModerationResult {
  approved: boolean;
  reason: string;
}

/**
 * Moderate a user-submitted lesson before sharing to the Universe feed.
 * Checks for hostile, rude, offensive, vulgar, or malicious content.
 * Only pure life lessons that encourage growth and learning are approved.
 */
export async function moderateLessonForUniverse(
  lessonText: string,
): Promise<LessonModerationResult> {
  if (USE_MOCK_AI_REQUEST) {
    await new Promise((r) => setTimeout(r, 800));
    return { approved: true, reason: "Mock: approved for testing." };
  }

  const responseSchema = Schema.object({
    properties: {
      approved: Schema.boolean({
        description:
          "True if the lesson is a constructive, positive life insight free of any hostility, vulgarity, offensive, or malicious content. False otherwise.",
      }),
      reason: Schema.string({
        description:
          "One short sentence explaining the decision. If approved, briefly confirm it's a positive life lesson. If rejected, briefly explain what rule it violates.",
      }),
    },
    required: ["approved", "reason"],
  });

  const systemPrompt = `You are a content moderator for Sfera, a personal growth app.
Your job is to approve or reject user-submitted life lessons for the Universe community feed.

The Universe feed is a safe, uplifting space where people from all backgrounds share personal growth wisdom.
Every lesson must be universally positive — something that genuinely helps people heal, grow, and thrive.

APPROVE only if ALL of the following are true:
- The lesson is a genuine personal insight about growth, healing, resilience, self-awareness, or positive change
- The message is constructive, kind, and uplifting in tone
- The lesson is universally applicable — it does not target or alienate any group of people
- The lesson motivates and empowers — it leaves the reader feeling hopeful, capable, or wiser

REJECT if the lesson contains ANY of the following:
- Violence, threats, aggression, or references to murder, harm, or physical danger
- Suicidal thoughts, self-harm encouragement, or content that romanticizes death or suffering
- Gambling, betting, casino references, or encouragement of addictive behaviours
- References to illegal activities, drug use, substance abuse, or criminal behaviour
- Vulgarity, profanity, sexual content, or explicit language
- Malicious intent, manipulation tactics, or advice that could cause harm
- Demotivating, nihilistic, hopeless, or discouraging messages (e.g. "nothing matters", "you will always fail")
- Dark, disturbing, or morbid content that leaves the reader feeling worse
- Religious doctrine, proselytizing, or content that implies one religion is superior or inferior
- Political opinions, partisan statements, or content that promotes or attacks any political party, ideology, or figure
- Discrimination or prejudice based on race, gender, nationality, religion, sexual orientation, age, or any other characteristic
- Divisive "us vs them" framing that could make any group feel excluded or attacked
- Spam, advertising, personal promotion, or nonsensical/gibberish text
- Content that shames, blames, or attacks any specific person (even unnamed)

When in doubt, REJECT. The standard is high: only pure, positive, universally human wisdom belongs in the Universe feed.

Respond with JSON only.`;

  const userPrompt = `Lesson to moderate: "${lessonText}"`;

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
  const parsed = JSON.parse(responseText) as LessonModerationResult;

  return parsed;
}
