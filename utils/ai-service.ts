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
Rules: Motivational, second-person "you". No shaming, no advice overload, no numbers/stats/clinical language. Reflect tone from whether sunny or cloudy prevails (implicitly). Always acknowledge love and lessons; if cloudy prevails, gently encourage more sunny moments. Vary the messages so they feel fresh when shown randomly throughout the day.`;

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

  const messages = Array.isArray(parsed?.messages)
    ? parsed.messages
        .map((m: any) => (typeof m === "string" ? m.trim() : ""))
        .filter((m: string) => m.length > 0)
    : [];

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
          },
          required: ["type", "text"],
        }),
      }),
    },
    required: ["memory", "moments"],
  });

  const systemPrompt = `Sfera AI coach. Analyze the user's story and extract:
1. ONE memory (title, description, date)
2. Multiple moments: sunnyMoments (goodFacts), lessonsLearned, hardTruths

CRITICAL: Generate moments in FIRST PERSON ("I", "my", "me") as if the user wrote them.

Respond in ${languageName} (${languageCode}). JSON only.

Rules:
- Memory: Realistic title and description based on the story
- Moments: Extract 2-4 sunny moments, 1-2 lessons, 0-2 hard truths
- Use first person perspective ("I learned...", "I felt...", "My experience...")
- Be honest about hard truths but compassionate
- Lessons should be actionable insights
- Sunny moments should be specific positive experiences${
    imageUri
      ? `

IMAGE: If a photo is attached, analyze it with the story. Identify people, setting, occasion, mood. The image is the memory's picture—use it to suggest more specific moments.`
      : ""
  }`;

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
 * Process entity creation prompt with AI
 */
export async function processEntityCreationPrompt(
  prompt: string,
  sphere: LifeSphere,
  language: string = "en",
): Promise<AIEntityCreationResponse> {
  const requestId = `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = Date.now();

  // If using mock requests, return mock data
  if (USE_MOCK_AI_REQUEST) {
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate delay
    return {
      entity: {
        name: "Mock Entity",
        description: prompt.substring(0, 100),
      },
      moments: [
        {
          type: "sunnyMoments",
          text: "This is a mock sunny moment",
        },
      ],
    };
  }

  const languageName = language === "bg" ? "Bulgarian" : "English";
  const languageCode = language === "bg" ? "bg" : "en";

  const spherePrompts: Record<LifeSphere, string> = {
    relationships:
      "Analyze the story and extract information about a relationship/partner",
    career: "Analyze the story and extract information about a job/career",
    family: "Analyze the story and extract information about a family member",
    friends: "Analyze the story and extract information about a friend",
    hobbies: "Analyze the story and extract information about a hobby",
  };

  const responseSchema = Schema.object({
    properties: {
      entity: Schema.object({
        properties: {
          name: Schema.string({
            description: `Name of the ${sphere}`,
          }),
          description: Schema.string({
            description: `Brief description of the ${sphere}`,
          }),
        },
        required: ["name", "description"],
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
          },
          required: ["type", "text"],
        }),
      }),
    },
    required: ["entity", "moments"],
  });

  const systemPrompt = `Sfera AI coach. ${spherePrompts[sphere]}.

CRITICAL: Generate moments in FIRST PERSON ("I", "my", "me") as if the user wrote them.

Respond in ${languageName} (${languageCode}). JSON only.

Rules:
- Extract entity name and description from the story
- Generate 2-4 moments (mix of sunny moments, lessons, and optionally hard truths)
- Use first person perspective ("I learned...", "I felt...", "My experience...")
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
  moments: {
    type: "sunnyMoments" | "lessonsLearned" | "hardTruths";
    text: string;
  }[];
}

export interface AIEntityCreationResponse {
  entity: {
    name: string;
    description: string;
  };
  moments: {
    type: "sunnyMoments" | "lessonsLearned" | "hardTruths";
    text: string;
  }[];
}
