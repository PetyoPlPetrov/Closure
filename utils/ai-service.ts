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
  console.log('🤖 Processing AI memory prompt:', prompt.substring(0, 100) + '...', imageUri ? '(with image)' : '');
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

    // Log available entities for debugging
    console.log('📋 Available entities (enriched):', JSON.stringify(enrichedEntities, null, 2));
    console.log('📋 Available entities (detailed):', JSON.stringify(availableEntities, null, 2));

    // Determine language name for prompt
    const languageName = language === 'bg' ? 'Bulgarian' : 'English';
    const languageCode = language === 'bg' ? 'bg' : 'en';
    
    // Create the AI prompt with enriched entity information
    const systemPrompt = `You are a helpful assistant for the Sferas app, which helps users process life experiences and memories. 
Your task is to analyze a user's story and create a structured memory with moments.

IMPORTANT: You must respond entirely in ${languageName} (${languageCode}). All text in your response including memory titles, moments, and lessons must be in ${languageName}.

Available entities in each sphere (with relationship/role context):
- Relationships: ${enrichedEntities.relationships.join(', ') || 'None'}
  ${relationships.length > 0 ? relationships.map((e: any) => {
    const entity = typeof e === 'string' ? { name: e } : e;
    const status = entity.isOngoing === false ? ' (Past)' : entity.isOngoing === true ? ' (Current)' : '';
    return `  - ${entity.name}${status}`;
  }).join('\n') : ''}

- Career: ${enrichedEntities.career.join(', ') || 'None'}
  ${career.length > 0 ? career.map((e: any) => {
    const entity = typeof e === 'string' ? { name: e } : e;
    const status = entity.isCurrent ? ' (Current Job)' : entity.endDate ? ' (Past Job)' : '';
    return `  - ${entity.name}${status}`;
  }).join('\n') : ''}

- Family: ${enrichedEntities.family.join(', ') || 'None'}
  ${family.length > 0 ? family.map((e: any) => {
    const entity = typeof e === 'string' ? { name: e } : e;
    const relationship = entity.relationship ? ` (${entity.relationship})` : '';
    return `  - ${entity.name}${relationship}`;
  }).join('\n') : ''}

- Friends: ${enrichedEntities.friends.join(', ') || 'None'}
- Hobbies: ${enrichedEntities.hobbies.join(', ') || 'None'}

Based on the user's story, you must:
1. Determine which sphere (relationships, career, family, friends, or hobbies) the story belongs to
2. Match the story to the MOST SPECIFIC and RELEVANT entity in that sphere based on:
   - For Family: Match based on relationship type (Father, Mother, Brother, Sister, etc.) mentioned in the story
   - For Career: Match based on whether it's a current or past job mentioned in the story
   - For Relationships: Match based on whether it's a current or past relationship
   - The entityName must EXACTLY match the name (without the relationship/status suffix) from the available entities
3. Generate a meaningful title for the memory IN ${languageName.toUpperCase()}
4. Generate 2-4 "hardTruths" - difficult truths or challenging moments (clouds) if applicable, ALL IN ${languageName.toUpperCase()}
5. Generate 2-4 "goodFacts" - positive aspects or happy moments (suns) if applicable, ALL IN ${languageName.toUpperCase()}
6. Generate 1-3 "lessonsLearned" - insights or lessons from the experience (lightbulbs) if applicable, ALL IN ${languageName.toUpperCase()}

FIRST-PERSON VOICE ("I"):
- Write the title, hardTruths, goodFacts, and lessonsLearned as if the USER has written them themselves. Use first person: "I", "my", "me" (or the equivalent in ${languageName}).
- Each moment must sound like the user's own reflection, not a third-person observation. Examples: "I often felt dismissed" not "She was often dismissive"; "I learned to set boundaries" not "Setting boundaries is important"; "I am grateful for the good times we had" not "There were good times."
- Apply this to ALL output: title, hardTruths, goodFacts, and lessonsLearned.

CRITICAL MATCHING RULES:
- Match entities based on relationship keywords in the user's story (in ${languageName})
- For Family: Match based on relationship type mentioned in the story (e.g., "father"/"баща", "mother"/"майка", "brother"/"брат", "sister"/"сестра", etc.)
- For Career: Match based on whether it's a current or past job mentioned in the story
- For Relationships: Match based on whether it's a current or past relationship
- The entityName must be the EXACT name from the list (e.g., if available entity is "John Smith (Father)", use "John Smith" as entityName)
- All arrays should contain meaningful, specific moments related to the story, ALL IN ${languageName.toUpperCase()}
- Be empathetic and thoughtful in your analysis

ESSENTIAL PHILOSOPHY - BALANCED TRUTH WITH COMPASSION:
- HARD TRUTHS: Be honest and direct about toxic, unhealthy, or harmful situations. Do not sugar-coat reality. If a relationship is toxic, abusive, or harmful, clearly state this in the "hardTruths" array. Users need to see reality to protect themselves and make healthy choices.
- ENCOURAGEMENT: Even in toxic or difficult situations, find healthy, realistic encouragement. The "goodFacts" array is REQUIRED and must ALWAYS contain at least 2 meaningful positive aspects. However, these should be:
  * Realistic and healthy (not false positivity)
  * Focused on: recognizing the problem (a strength), setting boundaries (growth), learning what healthy love looks like (wisdom), protecting oneself (self-care), or finding support (connection)
  * NOT minimizing the harm or toxicity
- LOVE IN ALL FORMS: Love comes in many forms - embrace its diversity. In healthy relationships, celebrate acts of kindness, understanding, growth, connections, resilience, and wisdom. In unhealthy relationships, recognize that learning to identify and protect oneself from harm is also a form of self-love.
- BALANCE: Be truthful about what is harmful or toxic, while also providing healthy encouragement that helps the user grow, learn, and protect themselves. Every memory holds lessons - sometimes the lesson is recognizing what is NOT love, and that is valuable wisdom.${imageUri ? `

IMAGE ANALYSIS: The user may attach a photo. If an image is provided, analyze it alongside the story. Identify people, setting, occasion, and mood from the image. Use this visual context to suggest more specific, relevant moments (hardTruths, goodFacts, lessonsLearned). The image will be used as the memory's moment picture—reference it to enrich your suggestions.` : ''}`;

    const userPrompt = `User's story (in ${languageName}): ${prompt}
${imageUri ? `\nThe user has attached an image. Analyze it together with the story to suggest better, more specific moments for this memory.` : ''}

Analyze this story${imageUri ? ' and image' : ''} and return the structured memory response. Remember: ALL text (title, hardTruths, goodFacts, lessonsLearned) must be in ${languageName} and written in first person as if the user wrote it themselves (use I/my/me).`;

    // Read image as base64 when provided
    let imageBase64: { mimeType: string; data: string } | null = null;
    if (imageUri) {
      imageBase64 = await readImageAsBase64(imageUri);
      if (imageBase64) {
        console.log('📤 Sending to AI - Image attached, size:', Math.round(imageBase64.data.length / 1024), 'KB base64');
      }
    }

    // Log the full prompt being sent to AI
    console.log('📤 Sending to AI - System prompt length:', systemPrompt.length);
    console.log('📤 Sending to AI - User story:', prompt);

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
    console.log('🤖 Initializing Firebase AI...');
    const app = getApp();
    const ai = getAI(app, {
      appCheck: firebase.appCheck(), // Pass App Check instance for automatic token inclusion in requests
    });
    
    // Using gemini-2.5-flash-lite (recommended newer model)
    // Note: gemini-1.5-flash was retired, gemini-2.0-flash will be retired March 3, 2026
    const model = getGenerativeModel(ai, {
      model: 'gemini-2.5-flash-lite', // Updated to recommended newer model
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });
    console.log('🤖 Firebase AI model ready, generating content...');

    // Build user message parts: text + optional image
    const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [
      { text: userPrompt },
    ];
    if (imageBase64) {
      parts.push({
        inlineData: { mimeType: imageBase64.mimeType, data: imageBase64.data },
      });
    }

    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      systemInstruction: systemPrompt,
    });

    // Get the structured JSON response (schema ensures it's valid JSON)
    let parsedResponse: any;
    try {
      // With responseSchema, the response should be directly parseable JSON
      const responseText = result.response.text();
      console.log('📥 AI response received, length:', responseText.length);
      console.log('📥 AI raw response text:', responseText);
      
      // Parse the JSON response (schema ensures it matches our structure)
      parsedResponse = JSON.parse(responseText);
      console.log('✅ AI response parsed successfully');
      console.log('📥 AI parsed response:', JSON.stringify(parsedResponse, null, 2));
      console.log('📊 AI response summary:', {
        sphere: parsedResponse.sphere,
        entityName: parsedResponse.entityName,
        title: parsedResponse.title,
        hardTruthsCount: parsedResponse.hardTruths?.length || 0,
        goodFactsCount: parsedResponse.goodFacts?.length || 0,
        lessonsCount: parsedResponse.lessonsLearned?.length || 0,
      });
      
      // Log entity matching details for debugging
      console.log('🔍 Entity matching check:');
      console.log('  - AI selected sphere:', parsedResponse.sphere);
      console.log('  - AI selected entity:', parsedResponse.entityName);
      console.log('  - Available entities in selected sphere:', JSON.stringify(availableEntities[parsedResponse.sphere as keyof typeof availableEntities] || []));
      const selectedSphereEntities = availableEntities[parsedResponse.sphere as keyof typeof availableEntities] || [];
      const entityMatch = selectedSphereEntities.includes(parsedResponse.entityName);
      console.log('  - Entity match found:', entityMatch ? '✅ YES' : '❌ NO');
      if (!entityMatch) {
        console.warn('  ⚠️ WARNING: AI selected entity does not match available entities!');
        console.warn('  ⚠️ Available options:', selectedSphereEntities);
      }
    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', parseError);
      const responseText = result.response.text();
      console.error('Response text:', responseText);
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

    console.log('✅ AI memory processing completed successfully');
    return aiResponse;
  } catch (error) {
    console.error('AI processing error:', error);
    throw new Error(
      `AI processing failed: ${(error as Error).message}. Please try again or check your Firebase AI configuration.`
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
  targetCharCount: number;
  language: 'en' | 'bg';
}): Promise<AIEncouragementResponse> {
  const {
    overallSunnyPercentage,
    sunnyMomentsCount,
    cloudyMomentsCount,
    sampleLessons,
    sampleSunnyMoments,
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

  const systemPrompt = `You are the Sfera AI coach. Create ONE short, encouraging, premium-sounding notification message for the Sferas app home banner.

CRITICAL LANGUAGE: respond entirely in ${languageName} (${languageCode}).

CONSTRAINTS:
- Output JSON only, following the provided schema.
- The message must be motivational, uplifting, and personal (second person "you").
- No shaming, no clinical language, no advice overload.
- No newlines.
- Length target: about ${targetCharCount} characters (±15%).
- Keep it human and warm: do NOT mention percentages, numbers, counts, statistics, or any math-like framing.
- Instead, reflect the overall tone based on whether sunny or cloudy moments prevail (implicitly, without numbers).
 - Always remind the user to appreciate the love they have in their life—every sunny moment is worth love and appreciation.
 - Always remind the user to remember their lessons and to be grateful for any sunny moment and lesson.
 - If cloudy moments prevail (overall sunny percentage < 55%), additionally encourage the user to create more sunny moments.
 - Do NOT include emojis.
`;

  const userPrompt = `User mood balance:
- Overall sunny percentage: ${Math.round(overallSunnyPercentage)}%
- Sunny moments count: ${sunnyMomentsCount}
- Cloudy moments count: ${cloudyMomentsCount}

Sample lessons (may be empty): ${sampleLessons.slice(0, 5).join(' | ') || 'None'}
Sample sunny moments (may be empty): ${sampleSunnyMoments.slice(0, 5).join(' | ') || 'None'}

Write the notification message now.`;

  const app = getApp();
  const ai = getAI(app, {
    appCheck: firebase.appCheck(),
  });

  const model = getGenerativeModel(ai, {
    model: 'gemini-2.5-flash-lite',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  });

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
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
  console.log('🤖 Processing AI entity creation prompt for sphere:', sphere);
  
  // Mock AI request for testing loading states
  if (USE_MOCK_AI_REQUEST) {
    console.log('🧪 Using mock AI request (slow) for testing...');
    
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
    
    console.log('📦 Mock AI Entity Creation Response:', JSON.stringify(mockData, null, 2));
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

      const relationshipExamples = language === 'bg' 
        ? 'например: "Майка", "Баща", "Брат", "Сестра", "Баба", "Дядо", "Леля", "Чичо", "Братовчед", "Син", "Дъщеря" и т.н.'
        : 'e.g., "Mother", "Father", "Brother", "Sister", "Grandmother", "Grandfather", "Aunt", "Uncle", "Cousin", "Son", "Daughter", etc.';
      
      const descriptionExample = language === 'bg'
        ? 'например: "Моята сестра е много забавна" не "Сестрата на потребителя е забавна"'
        : 'e.g., "My sister is funny" not "User\'s sister is funny"';

      systemPrompt = `You are a helpful assistant for the Sferas app. Analyze the user's story about their family members and extract all family members mentioned.

CRITICAL LANGUAGE REQUIREMENT: You MUST respond entirely in ${languageName} (${languageCode}). This includes:
- ALL relationship types (${relationshipExamples})
- ALL descriptions
- ALL text content
- ALL entity names (if the user provided names in their story, use those; otherwise use appropriate ${languageName} names)

CRITICAL: When writing descriptions, write them from the user's first-person perspective. If the user refers to themselves as "me" or "I" in their story, write descriptions as if the user wrote them. ${descriptionExample}. Use first-person possessive pronouns.

Extract all family members from the story. For each family member, provide:
- name: The full name of the family member (in ${languageName} if generating names)
- relationship: Their relationship to the user in ${languageName} (${relationshipExamples})
- description: Optional brief description if mentioned in the story (written from first-person perspective in ${languageName}, ${descriptionExample})

ALL fields must be in ${languageName}.`;
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

      const relationshipDescriptionExample = language === 'bg'
        ? 'например: "Моят текущ партньор е много подкрепящ" не "Текущият партньор на потребителя е подкрепящ"'
        : 'e.g., "My current partner is supportive" not "User\'s current partner is supportive"';

      systemPrompt = `You are a helpful assistant for the Sferas app. Analyze the user's story about their relationships and extract all relationships mentioned.

CRITICAL LANGUAGE REQUIREMENT: You MUST respond entirely in ${languageName} (${languageCode}). This includes:
- ALL person names (if the user provided names in their story, use those; otherwise use appropriate ${languageName} names)
- ALL descriptions
- ALL text content

CRITICAL: When writing descriptions, write them from the user's first-person perspective. If the user refers to themselves as "me" or "I" in their story, write descriptions as if the user wrote them. ${relationshipDescriptionExample}. Use first-person perspective.

Extract all relationships from the story. For each relationship, provide:
- name: The name of the person (in ${languageName} if generating names)
- isCurrent: true if it's a current relationship, false if it's a past relationship
- startDate: When the relationship started (ISO date format YYYY-MM-DD, or approximate year if exact date unknown)
- endDate: When the relationship ended (ISO date format YYYY-MM-DD, or null if ongoing/current)
- description: Optional brief description if mentioned in the story (written from first-person perspective in ${languageName}, ${relationshipDescriptionExample})

ALL fields must be in ${languageName}.`;
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

      const jobDescriptionExample = language === 'bg'
        ? 'например: "Работя като софтуерен инженер" не "Потребителят работи като софтуерен инженер"'
        : 'e.g., "I worked as a software engineer" not "User worked as a software engineer"';

      systemPrompt = `You are a helpful assistant for the Sferas app. Analyze the user's story about their jobs/career and extract all jobs mentioned.

CRITICAL LANGUAGE REQUIREMENT: You MUST respond entirely in ${languageName} (${languageCode}). This includes:
- ALL job titles and company names (in ${languageName})
- ALL descriptions
- ALL text content

CRITICAL: When writing descriptions, write them from the user's first-person perspective. If the user refers to themselves as "me" or "I" in their story, write descriptions as if the user wrote them. ${jobDescriptionExample}. Use first-person perspective.

Extract all jobs from the story. For each job, provide:
- name: The job title or company name (in ${languageName})
- isCurrent: true if it's a current job, false if it's a past job
- startDate: When the job started (ISO date format YYYY-MM-DD, or approximate year if exact date unknown)
- endDate: When the job ended (ISO date format YYYY-MM-DD, or null if ongoing/current)
- description: Optional brief description if mentioned in the story (written from first-person perspective in ${languageName}, ${jobDescriptionExample})

ALL fields must be in ${languageName}.`;
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

      const friendDescriptionExample = language === 'bg'
        ? 'например: "Моят приятел е много добър" не "Приятелят на потребителя е добър"'
        : 'e.g., "My friend is very kind" not "User\'s friend is very kind"';

      systemPrompt = `You are a helpful assistant for the Sferas app. Analyze the user's story about their friends and extract all friends mentioned.

CRITICAL LANGUAGE REQUIREMENT: You MUST respond entirely in ${languageName} (${languageCode}). This includes:
- ALL friend names (if the user provided names in their story, use those; otherwise use appropriate ${languageName} names)
- ALL descriptions
- ALL text content

CRITICAL: When writing descriptions, write them from the user's first-person perspective. If the user refers to themselves as "me" or "I" in their story, write descriptions as if the user wrote them. ${friendDescriptionExample}. Use first-person perspective.

Extract all friends from the story. For each friend, provide:
- name: The full name of the friend (in ${languageName} if generating names)
- description: Optional brief description if mentioned in the story (written from first-person perspective in ${languageName}, ${friendDescriptionExample})

ALL fields must be in ${languageName}.`;
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

      const hobbyDescriptionExample = language === 'bg'
        ? 'например: "Обичам да свиря на китара" не "Потребителят обича да свири на китара"'
        : 'e.g., "I love playing guitar" not "User loves playing guitar"';

      const hobbyNameExample = language === 'bg'
        ? 'например: "Четене", "Спорт", "Музика", "Рисуване" и т.н.'
        : 'e.g., "Reading", "Sports", "Music", "Painting", etc.';

      systemPrompt = `You are a helpful assistant for the Sferas app. Analyze the user's story about their hobbies and extract all hobbies mentioned.

CRITICAL LANGUAGE REQUIREMENT: You MUST respond entirely in ${languageName} (${languageCode}). This includes:
- ALL hobby names (in ${languageName}, ${hobbyNameExample})
- ALL descriptions
- ALL text content

CRITICAL: When writing descriptions, write them from the user's first-person perspective. If the user refers to themselves as "me" or "I" in their story, write descriptions as if the user wrote them. ${hobbyDescriptionExample}. Use first-person perspective.

Extract all hobbies from the story. For each hobby, provide:
- name: The name of the hobby (in ${languageName}, ${hobbyNameExample})
- description: Optional brief description if mentioned in the story (written from first-person perspective in ${languageName}, ${hobbyDescriptionExample})

ALL fields must be in ${languageName}.`;
    }

    const model = getGenerativeModel(aiInstance, {
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: systemPrompt,
    });

    const responseText = result.response.text();
    console.log('📦 AI Entity Creation Response:', responseText);

    const parsed = JSON.parse(responseText);
    
    return {
      sphere,
      entities: parsed.entities || [],
    };
  } catch (error) {
    console.error('❌ AI Entity Creation Error:', error);
    throw new Error((error as Error).message || 'Failed to process entity creation prompt');
  }
}
