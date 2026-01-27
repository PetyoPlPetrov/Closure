/**
 * AI Service - Handles AI API calls using Firebase AI (Gemini)
 */

import { getAI, getGenerativeModel, Schema } from '@react-native-firebase/ai';
import { getApp } from '@react-native-firebase/app';
import { firebase } from '@react-native-firebase/app-check';
import * as FileSystem from 'expo-file-system/legacy';
import type { LifeSphere } from './JourneyProvider';

// Runtime flag for mock AI requests (set to true to use slow mock requests for testing)
const USE_MOCK_AI_REQUEST = __DEV__ && false; // Set to true to enable mock requests

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  message: string;
  error?: string;
}

export interface AIRequestContext {
  sferas: {
    relationships?: { name: string; relationshipType?: string; isOngoing?: boolean; startDate?: string; endDate?: string | null }[];
    career?: { name: string; isCurrent?: boolean; startDate?: string; endDate?: string | null }[];
    family?: { name: string; relationship?: string }[];
    friends?: string[];
    hobbies?: string[];
  };
}

export interface AIMemoryResponse {
  sphere: LifeSphere;
  entityId?: string;
  entityName?: string;
  title: string;
  hardTruths: string[];
  goodFacts: string[];
  lessonsLearned: string[];
}

export interface AIEntitySuggestion {
  name: string;
  relationship?: string; // For family members: "Brother", "Sister", "Mother", etc.
  isCurrent?: boolean; // For relationships: current or past
  startDate?: string; // For relationships: when it started (ISO format)
  endDate?: string | null; // For relationships: when it ended (null if ongoing)
  description?: string; // Optional description for any entity
  imageUri?: string; // Optional image URI for any entity
}

export interface AIEntityCreationResponse {
  sphere: 'family' | 'friends' | 'hobbies' | 'relationships' | 'career';
  entities: AIEntitySuggestion[];
}

export interface AIEncouragementResponse {
  message: string;
}

/**
 * Read image file as base64 for Gemini inline data.
 * Returns { mimeType, data } or null if read fails.
 */
async function readImageAsBase64(imageUri: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    const mimeType = imageUri.toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg';
    const data = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',
    });
    if (!data || data.length === 0) return null;
    return { mimeType, data };
  } catch (e) {
    console.warn('Failed to read image as base64:', e);
    return null;
  }
}

/**
 * Process memory prompt using Firebase AI (Gemini)
 * Analyzes the user's story and generates a memory with moments.
 * When imageUri is provided, the AI also analyzes the image to suggest better, more specific moments.
 * @param prompt - User's story/input text
 * @param context - AI request context with entities
 * @param language - Language code ('en' or 'bg') for prompt and response
 * @param imageUri - Optional local image URI; AI will analyze it for better moment suggestions. Used as memory moment picture.
 */
export async function processMemoryPrompt(
  prompt: string,
  context: AIRequestContext,
  language: 'en' | 'bg' = 'en',
  imageUri?: string
): Promise<AIMemoryResponse> {
  try {
    // Extract entities from context.sferas (now with enriched metadata)
    const relationships = context.sferas.relationships || [];
    const career = context.sferas.career || [];
    const family = context.sferas.family || [];
    const friends = context.sferas.friends || [];
    const hobbies = context.sferas.hobbies || [];

    // Build enriched entities list with relationship/role information
    const buildEntityDescription = (entity: any, type: string): string => {
      if (typeof entity === 'string') {
        return entity; // Fallback for simple string format
      }
      
      let desc = entity.name;
      if (type === 'family' && entity.relationship) {
        desc += ` (${entity.relationship})`;
      } else if (type === 'career') {
        if (entity.isCurrent) {
          desc += ' (Current Job)';
        } else if (entity.endDate) {
          desc += ' (Past Job)';
        }
      } else if (type === 'relationships') {
        if (entity.isOngoing === false) {
          desc += ' (Past Relationship)';
        } else if (entity.isOngoing === true) {
          desc += ' (Current Relationship)';
        }
      }
      return desc;
    };

    const enrichedEntities = {
      relationships: relationships.map(e => buildEntityDescription(e, 'relationships')),
      career: career.map(e => buildEntityDescription(e, 'career')),
      family: family.map(e => buildEntityDescription(e, 'family')),
      friends: friends.map(e => typeof e === 'string' ? e : (e as any).name || String(e)),
      hobbies: hobbies.map(e => typeof e === 'string' ? e : (e as any).name || String(e)),
    };

    // Also keep original objects for detailed matching
    const availableEntities = {
      relationships: relationships.length > 0 ? relationships : [],
      career: career.length > 0 ? career : [],
      family: family.length > 0 ? family : [],
      friends: friends.length > 0 ? friends : [],
      hobbies: hobbies.length > 0 ? hobbies : [],
    };

    // Determine language name for prompt
    const languageName = language === 'bg' ? 'Bulgarian' : 'English';
    const languageCode = language === 'bg' ? 'bg' : 'en';
    
    // Compact entity list: one line per sphere (no duplicate bullet lists)
    const entityLines = [
      `Relationships: ${enrichedEntities.relationships.join(', ') || 'None'}`,
      `Career: ${enrichedEntities.career.join(', ') || 'None'}`,
      `Family: ${enrichedEntities.family.join(', ') || 'None'}`,
      `Friends: ${enrichedEntities.friends.join(', ') || 'None'}`,
      `Hobbies: ${enrichedEntities.hobbies.join(', ') || 'None'}`,
    ].join('\n');

    const systemPrompt = `Sferas app assistant. Analyze the user's story and create a structured memory with moments. Respond entirely in ${languageName} (${languageCode}). Use first person ("I"/"my"/"me") as if the user wrote it—e.g. "I often felt dismissed" not "She was dismissive." Be empathetic and thoughtful.

Entities (match by type; use EXACT name as entityName):
${entityLines}

Tasks:
1. Pick sphere (relationships|career|family|friends|hobbies) and match to ONE entity. Family→relationship type; Career→current/past job; Relationships→current/past. Match by keywords (e.g. father/баща, sister/сестра). Output meaningful, specific moments.
2. Output: title, 2-4 hardTruths, 2-4 goodFacts, 1-3 lessonsLearned. All in ${languageName}.

Philosophy: Be honest about harm and toxicity (hardTruths); don't sugar-coat. goodFacts REQUIRED (≥2)—realistic encouragement: recognizing the problem, boundaries, self-care, healthy love, support; never minimize harm. Balance truth with compassion.${imageUri ? `

IMAGE: If a photo is attached, analyze it with the story. Identify people, setting, occasion, mood. The image is the memory's picture—use it to suggest more specific moments.` : ''}`;

    const userPrompt = imageUri
      ? `Story: ${prompt}\n[Image attached—analyze with story.]\n\nAnalyze and return structured memory.`
      : `Story: ${prompt}\n\nAnalyze and return structured memory.`;

    // Read image as base64 when provided
    let imageBase64: { mimeType: string; data: string } | null = null;
    if (imageUri) {
      imageBase64 = await readImageAsBase64(imageUri);
    }

    // Define the response schema using Schema.object()
    const responseSchema = Schema.object({
      properties: {
        sphere: Schema.string({
          description: 'The life sphere this memory belongs to. Must be one of: relationships, career, family, friends, hobbies',
        }),
        entityName: Schema.string({
          description: 'The name of the entity this memory relates to. Must match one of the available entities in the selected sphere.',
        }),
        title: Schema.string({
          description: `A concise, meaningful title for the memory IN ${languageName.toUpperCase()}. Write as if the user wrote it (first person: I/my/me or ${languageName} equivalent).`,
        }),
        hardTruths: Schema.array({
          items: Schema.string({
            description: `A difficult truth or challenging moment IN ${languageName.toUpperCase()}, written as if the user wrote it (first person: I/my/me). Be direct and honest. Example: "I often felt dismissed" not "She was dismissive."`,
          }),
          description: `Array of 2-4 difficult truths or challenging moments. Each must be in first person as if the user wrote it. ALL IN ${languageName.toUpperCase()}`,
        }),
        goodFacts: Schema.array({
          items: Schema.string({
            description: `A healthy, realistic positive aspect IN ${languageName.toUpperCase()}, written as if the user wrote it (first person: I/my/me). Example: "I am grateful for the support I received." Be realistic, not false positivity.`,
          }),
          description: `REQUIRED: Array of 2-4 positive aspects. Each must be in first person as if the user wrote it. ALL IN ${languageName.toUpperCase()}`,
        }),
        lessonsLearned: Schema.array({
          items: Schema.string({
            description: `An insight or lesson from the experience IN ${languageName.toUpperCase()}, written as if the user wrote it (first person: I/my/me). Example: "I learned to set boundaries."`,
          }),
          description: `Array of 1-3 insights or lessons. Each must be in first person as if the user wrote it. ALL IN ${languageName.toUpperCase()}`,
        }),
      },
      required: ['sphere', 'entityName', 'title', 'hardTruths', 'goodFacts', 'lessonsLearned'],
    });

    // Initialize Firebase AI
    // Pass App Check instance so SDK automatically includes token in X-Firebase-AppCheck header
    // The SDK will automatically call getToken() and add it to the X-Firebase-AppCheck header
    const app = getApp();
    const ai = getAI(app, {
      appCheck: firebase.appCheck(), // Pass App Check instance for automatic token inclusion in requests
    });
    
    // Using gemini-2.5-flash-lite (recommended newer model)
    // Note: gemini-1.5-flash was retired, gemini-2.0-flash will be retired March 3, 2026
    // IMPORTANT: Each call creates a fresh model instance - no conversation history is maintained
    // We send the complete current state in each request, so no need for context history
    const model = getGenerativeModel(ai, {
      model: 'gemini-2.5-flash-lite', // Updated to recommended newer model
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    // Build user message parts: text + optional image
    const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [
      { text: userPrompt },
    ];
    if (imageBase64) {
      parts.push({
        inlineData: { mimeType: imageBase64.mimeType, data: imageBase64.data },
      });
    }

    // Generate content with single user message - no conversation history
    // Each request is stateless and includes all necessary context in the current message
    const result = await model.generateContent({
      contents: [{ role: 'user', parts }], // Single message only - no history
      systemInstruction: systemPrompt,
    });

    // Get the structured JSON response (schema ensures it's valid JSON)
    let parsedResponse: any;
    try {
      // With responseSchema, the response should be directly parseable JSON
      const responseText = result.response.text();
      parsedResponse = JSON.parse(responseText);
    } catch {
      throw new Error('AI returned invalid JSON response');
    }

    // Validate and map the response to AIMemoryResponse
    const validSpheres: LifeSphere[] = ['relationships', 'career', 'family', 'friends', 'hobbies'];
    
    if (!parsedResponse.sphere || !validSpheres.includes(parsedResponse.sphere)) {
      throw new Error(`Invalid sphere: ${parsedResponse.sphere}`);
    }

    if (!parsedResponse.entityName || typeof parsedResponse.entityName !== 'string') {
      throw new Error('Missing or invalid entityName');
    }

    if (!parsedResponse.title || typeof parsedResponse.title !== 'string') {
      throw new Error('Missing or invalid title');
    }

    // Ensure arrays exist and are valid
    const hardTruths = Array.isArray(parsedResponse.hardTruths) 
      ? parsedResponse.hardTruths.filter((t: any) => typeof t === 'string' && t.trim().length > 0)
      : [];
    
    const goodFacts = Array.isArray(parsedResponse.goodFacts)
      ? parsedResponse.goodFacts.filter((f: any) => typeof f === 'string' && f.trim().length > 0)
      : [];
    
    const lessonsLearned = Array.isArray(parsedResponse.lessonsLearned)
      ? parsedResponse.lessonsLearned.filter((l: any) => typeof l === 'string' && l.trim().length > 0)
      : [];

    // Build the response
    const aiResponse: AIMemoryResponse = {
      sphere: parsedResponse.sphere as LifeSphere,
      entityName: parsedResponse.entityName,
      title: parsedResponse.title,
      hardTruths: hardTruths.length > 0 ? hardTruths : ['This experience taught me important lessons'],
      goodFacts: goodFacts.length > 0 ? goodFacts : ['There were positive aspects to this experience'],
      lessonsLearned: lessonsLearned.length > 0 ? lessonsLearned : ['I learned something valuable from this'],
    };

    return aiResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `AI processing failed: ${errorMessage}. Please try again or check your Firebase AI configuration.`
    );
  }
}

/**
 * Generate an encouraging, motivational home notification message based on the user's overall mood balance.
 * Uses structured JSON schema so the UI can safely render the result.
 */
export async function processHomeEncouragementPrompt(params: {
  overallSunnyPercentage: number;
  sunnyMomentsCount: number;
  cloudyMomentsCount: number;
  sampleLessons: string[];
  sampleSunnyMoments: string[];
  sampleCloudyMoments?: string[];
  targetCharCount: number;
  language: 'en' | 'bg';
}): Promise<AIEncouragementResponse> {
  const requestId = `encouragement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = Date.now();
  
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

  // If using mock requests, just return a deterministic message
  if (USE_MOCK_AI_REQUEST) {
    return {
      message:
        language === 'bg'
          ? 'Чудесно! Ти напредваш — продължавай да създаваш малки слънчеви моменти всеки ден. ✨'
          : 'Wonderful! You’re making progress—keep creating small sunny moments every day. ✨',
    };
  }

  const languageName = language === 'bg' ? 'Bulgarian' : 'English';
  const languageCode = language === 'bg' ? 'bg' : 'en';

  const responseSchema = Schema.object({
    properties: {
      message: Schema.string({
        description:
          'A single-sentence (or two short sentences) motivational notification message for the home banner. No newlines.',
      }),
    },
    required: ['message'],
  });

  const systemPrompt = `Sfera AI coach. Create ONE short, encouraging, premium-sounding home-banner message. Respond in ${languageName} (${languageCode}). JSON only, ~${targetCharCount} chars (±15%), no newlines, no emojis.
Rules: Motivational, second-person "you". No shaming, no advice overload, no numbers/stats/clinical language. Reflect tone from whether sunny or cloudy prevails (implicitly). Always acknowledge love and lessons; if cloudy prevails, gently encourage more sunny moments.`;

  const tone = overallSunnyPercentage >= 55 ? 'sunny prevails' : 'cloudy prevails';
  const latestLessons = sampleLessons.slice(0, 2).join(' | ') || 'None';
  const latestSunny = sampleSunnyMoments.slice(0, 2).join(' | ') || 'None';
  const latestCloudy = sampleCloudyMoments.slice(0, 2).join(' | ') || 'None';
  const userPrompt = `Tone: ${tone}
Latest lessons: ${latestLessons}
Latest sunny: ${latestSunny}
Latest cloudy: ${latestCloudy}
Write the notification message.`;

  const app = getApp();
  const ai = getAI(app, {
    appCheck: firebase.appCheck(),
  });

  // IMPORTANT: Each call creates a fresh model instance - no conversation history is maintained
  // We send the complete current state in each request, so no need for context history
  const model = getGenerativeModel(ai, {
    model: 'gemini-2.5-flash-lite',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  });

  // Generate content with single user message - no conversation history
  // Each request is stateless and includes all necessary context in the current message
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }], // Single message only - no history
    systemInstruction: systemPrompt,
  });

  const responseText = result.response.text();
  const parsed = JSON.parse(responseText);

  const message = typeof parsed?.message === 'string' ? parsed.message.trim() : '';
  if (!message) {
    throw new Error('AI returned empty encouragement message');
  }

  return { message };
}

/**
 * Send a message to the AI service
 * @param message - User's message
 * @param context - Optional context about the user's journey/spheres
 * @returns AI response
 */
export async function sendToAI(
  message: string,
  context?: {
    spheres?: string[];
    currentEntity?: string;
  }
): Promise<AIResponse> {
  try {
    // TODO: Replace with your actual AI API implementation
    // Example structure:
    
    // const apiKey = process.env.EXPO_PUBLIC_AI_API_KEY;
    // if (!apiKey) {
    //   throw new Error('AI API key not configured');
    // }
    
    // const response = await fetch('https://api.openai.com/v1/chat/completions', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${apiKey}`,
    //   },
    //   body: JSON.stringify({
    //     model: 'gpt-4',
    //     messages: [
    //       {
    //         role: 'system',
    //         content: 'You are a helpful assistant for the Sferas app, which helps users process life experiences.',
    //       },
    //       {
    //         role: 'user',
    //         content: message,
    //       },
    //     ],
    //   }),
    // });
    
    // const data = await response.json();
    // return { message: data.choices[0].message.content };
    
    // Placeholder response for now
    return {
      message: `I received your message: "${message}". AI integration is not yet configured. Please add your AI API key in utils/ai-service.ts`,
    };
  } catch (error) {
    return {
      message: '',
      error: (error as Error).message || 'Failed to get AI response',
    };
  }
}

/**
 * Process speech-to-text
 * Note: This is a placeholder. You'll need to integrate with:
 * - Google Cloud Speech-to-Text API
 * - AWS Transcribe
 * - Or use a local on-device library (e.g. expo-speech-recognition)
 */
export async function processSpeechToText(audioUri: string): Promise<string> {
  // TODO: Implement speech-to-text
  void audioUri;
  return '';
}

/**
 * Process entity creation prompt using Firebase AI (Gemini)
 * Analyzes the user's story and extracts entities for the specified sphere
 * @param prompt - User's story/input text
 * @param sphere - The sphere type ('family', 'friends', 'hobbies', 'relationships', 'career')
 * @param language - Language code ('en' or 'bg') for prompt and response
 */
export async function processEntityCreationPrompt(
  prompt: string,
  sphere: 'family' | 'friends' | 'hobbies' | 'relationships' | 'career',
  language: 'en' | 'bg' = 'en'
): Promise<AIEntityCreationResponse> {
  // Mock AI request for testing loading states
  if (USE_MOCK_AI_REQUEST) {
    
    // Simulate a slow AI request (6 seconds delay)
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    // Return mock data based on sphere type
    const mockData: AIEntityCreationResponse = {
      sphere,
      entities: [],
    };
    
    if (sphere === 'family') {
      mockData.entities = [
        {
          name: language === 'bg' ? 'Мария Иванова' : 'Maria Johnson',
          relationship: language === 'bg' ? 'Сестра' : 'Sister',
          description: language === 'bg' ? 'Моята сестра е много забавна и винаги ме кара да се смея.' : 'My sister is very funny and always makes me laugh.',
        },
      ];
    } else if (sphere === 'friends') {
      mockData.entities = [
        {
          name: language === 'bg' ? 'Петър Стоянов' : 'Peter Smith',
          description: language === 'bg' ? 'Моят приятел е много добър и винаги е там за мен.' : 'My friend is very kind and always there for me.',
        },
      ];
    } else if (sphere === 'hobbies') {
      mockData.entities = [
        {
          name: language === 'bg' ? 'Четене' : 'Reading',
          description: language === 'bg' ? 'Обичам да чета книги в свободното си време.' : 'I love reading books in my free time.',
        },
      ];
    } else if (sphere === 'relationships') {
      mockData.entities = [
        {
          name: language === 'bg' ? 'Анна Петрова' : 'Anna Williams',
          isCurrent: true,
          startDate: '2020-01-15',
          endDate: null,
          description: language === 'bg' ? 'Моята текуща партньорка е много подкрепяща.' : 'My current partner is very supportive.',
        },
      ];
    } else if (sphere === 'career') {
      mockData.entities = [
        {
          name: language === 'bg' ? 'Софтуерен инженер' : 'Software Engineer',
          isCurrent: true,
          startDate: '2021-06-01',
          endDate: null,
          description: language === 'bg' ? 'Работя като софтуерен инженер в технологична компания.' : 'I work as a software engineer at a tech company.',
        },
      ];
    }

    return mockData;
  }
  
  try {
    const app = getApp();
    const aiInstance = getAI(app, {
      appCheck: firebase.appCheck(), // Pass App Check instance for automatic token inclusion
    });

    const languageName = language === 'bg' ? 'Bulgarian' : 'English';
    const languageCode = language === 'bg' ? 'bg' : 'en';

    // Build schema based on sphere type
    let responseSchema: Schema;
    let systemPrompt: string;

    if (sphere === 'family') {
      responseSchema = Schema.object({
        properties: {
          entities: Schema.array({
            items: Schema.object({
              properties: {
                name: Schema.string({ description: 'Full name of the family member' }),
                relationship: Schema.string({ 
                  description: `Relationship to the user in ${languageName} (e.g., ${language === 'bg' ? '"Майка", "Баща", "Брат", "Сестра", "Баба", "Дядо", "Леля", "Чичо", "Братовчед", "Син", "Дъщеря"' : '"Mother", "Father", "Brother", "Sister", "Grandmother", "Grandfather", "Aunt", "Uncle", "Cousin", "Son", "Daughter"'} etc.)` 
                }),
                description: Schema.string({ 
                  description: 'Optional brief description or context about this family member' 
                }),
              },
              required: ['name', 'relationship'],
            }),
          }),
        },
        required: ['entities'],
      });

      const relEx = language === 'bg' ? 'Майка, Баща, Брат, Сестра, ...' : 'Mother, Father, Brother, Sister, ...';
      systemPrompt = `Sferas assistant. Extract all family members from the story. Respond in ${languageName} (${languageCode}). First-person only: "My sister is funny" not "User's sister." Use names from the story when given; otherwise ${languageName} names. Fields: name, relationship (${relEx}), optional description. All output in ${languageName}.`;
    } else if (sphere === 'relationships') {
      responseSchema = Schema.object({
        properties: {
          entities: Schema.array({
            items: Schema.object({
              properties: {
                name: Schema.string({ description: 'Name of the person in the relationship' }),
                isCurrent: Schema.boolean({ 
                  description: 'Whether this is a current relationship (true) or past relationship (false)' 
                }),
                startDate: Schema.string({ 
                  description: 'When the relationship started (ISO date format: YYYY-MM-DD, or approximate year if exact date unknown)' 
                }),
                endDate: Schema.string({ 
                  description: 'When the relationship ended (ISO date format: YYYY-MM-DD, or null if ongoing/current). Leave as null if isCurrent is true.' 
                }),
                description: Schema.string({ 
                  description: 'Optional brief description or context about this relationship' 
                }),
              },
              required: ['name', 'isCurrent', 'startDate'],
            }),
          }),
        },
        required: ['entities'],
      });

      systemPrompt = `Sferas assistant. Extract all relationships from the story. Respond in ${languageName} (${languageCode}). First-person only: "My partner is supportive" not "User's partner." Use names from the story when given; otherwise ${languageName} names. Fields: name, isCurrent, startDate (YYYY-MM-DD or year), endDate (null if current), optional description. All output in ${languageName}.`;
    } else if (sphere === 'career') {
      responseSchema = Schema.object({
        properties: {
          entities: Schema.array({
            items: Schema.object({
              properties: {
                name: Schema.string({ description: 'Job title or company name' }),
                isCurrent: Schema.boolean({ 
                  description: 'Whether this is a current job (true) or past job (false)' 
                }),
                startDate: Schema.string({ 
                  description: 'When the job started (ISO date format: YYYY-MM-DD, or approximate year if exact date unknown)' 
                }),
                endDate: Schema.string({ 
                  description: 'When the job ended (ISO date format: YYYY-MM-DD, or null if ongoing/current). Leave as null if isCurrent is true.' 
                }),
                description: Schema.string({ 
                  description: 'Optional brief description or context about this job' 
                }),
              },
              required: ['name', 'isCurrent', 'startDate'],
            }),
          }),
        },
        required: ['entities'],
      });

      systemPrompt = `Sferas assistant. Extract all jobs/career from the story. Respond in ${languageName} (${languageCode}). First-person only: "I work as a software engineer" not "User works as..." Use job/company names from the story when given; otherwise ${languageName}. Fields: name (title/company), isCurrent, startDate (YYYY-MM-DD or year), endDate (null if current), optional description. All output in ${languageName}.`;
    } else if (sphere === 'friends') {
      responseSchema = Schema.object({
        properties: {
          entities: Schema.array({
            items: Schema.object({
              properties: {
                name: Schema.string({ description: 'Full name of the friend' }),
                description: Schema.string({ 
                  description: 'Optional brief description or context about this friend' 
                }),
              },
              required: ['name'],
            }),
          }),
        },
        required: ['entities'],
      });

      systemPrompt = `Sferas assistant. Extract all friends from the story. Respond in ${languageName} (${languageCode}). First-person only: "My friend is kind" not "User's friend." Use names from the story when given; otherwise ${languageName} names. Fields: name, optional description. All output in ${languageName}.`;
    } else { // hobbies
      responseSchema = Schema.object({
        properties: {
          entities: Schema.array({
            items: Schema.object({
              properties: {
                name: Schema.string({ description: 'Name of the hobby' }),
                description: Schema.string({ 
                  description: 'Optional brief description or context about this hobby' 
                }),
              },
              required: ['name'],
            }),
          }),
        },
        required: ['entities'],
      });

      const hobbyEx = language === 'bg' ? 'Четене, Спорт, Музика, ...' : 'Reading, Sports, Music, ...';
      systemPrompt = `Sferas assistant. Extract all hobbies from the story. Respond in ${languageName} (${languageCode}). First-person only: "I love playing guitar" not "User loves..." Use hobby names from the story when given; otherwise ${languageName} (${hobbyEx}). Fields: name, optional description. All output in ${languageName}.`;
    }

    // IMPORTANT: Each call creates a fresh model instance - no conversation history is maintained
    // We send the complete current state in each request, so no need for context history
    const model = getGenerativeModel(aiInstance, {
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    // Generate content with single user message - no conversation history
    // Each request is stateless and includes all necessary context in the current message
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }], // Single message only - no history
      systemInstruction: systemPrompt,
    });

    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);

    return {
      sphere,
      entities: parsed.entities || [],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(errorMessage || 'Failed to process entity creation prompt');
  }
}
