/**
 * AI Service - Handles AI API calls using Firebase AI (Gemini)
 */

import { getAI, getGenerativeModel, Schema } from '@react-native-firebase/ai';
import { getApp } from '@react-native-firebase/app';
import { firebase } from '@react-native-firebase/app-check';
import type { LifeSphere } from './JourneyProvider';

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

/**
 * Process memory prompt using Firebase AI (Gemini)
 * Analyzes the user's story and generates a memory with moments
 * @param prompt - User's story/input text
 * @param context - AI request context with entities
 * @param language - Language code ('en' or 'bg') for prompt and response
 */
export async function processMemoryPrompt(
  prompt: string,
  context: AIRequestContext,
  language: 'en' | 'bg' = 'en'
): Promise<AIMemoryResponse> {
  console.log('🤖 Processing AI memory prompt:', prompt.substring(0, 100) + '...');
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

CRITICAL MATCHING RULES:
- Match entities based on relationship keywords in the user's story (in ${languageName})
- For Family: Match based on relationship type mentioned in the story (e.g., "father"/"баща", "mother"/"майка", "brother"/"брат", "sister"/"сестра", etc.)
- For Career: Match based on whether it's a current or past job mentioned in the story
- For Relationships: Match based on whether it's a current or past relationship
- The entityName must be the EXACT name from the list (e.g., if available entity is "John Smith (Father)", use "John Smith" as entityName)
- All arrays should contain meaningful, specific moments related to the story, ALL IN ${languageName.toUpperCase()}
- Be empathetic and thoughtful in your analysis`;

    const userPrompt = `User's story (in ${languageName}): ${prompt}

Analyze this story and return the structured memory response. Remember: ALL text in your response (title, hardTruths, goodFacts, lessonsLearned) must be in ${languageName}.`;

    // Log the full prompt being sent to AI
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
    console.log('📤 Sending to AI - Full prompt length:', fullPrompt.length);
    console.log('📤 Sending to AI - System prompt:', systemPrompt.substring(0, 500) + '...');
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
          description: `A concise, meaningful title for the memory IN ${languageName.toUpperCase()}`,
        }),
        hardTruths: Schema.array({
          items: Schema.string({
            description: `A difficult truth or challenging moment (cloud) IN ${languageName.toUpperCase()}`,
          }),
          description: `Array of 2-4 difficult truths or challenging moments, if applicable, ALL IN ${languageName.toUpperCase()}`,
        }),
        goodFacts: Schema.array({
          items: Schema.string({
            description: `A positive aspect or happy moment (sun) IN ${languageName.toUpperCase()}`,
          }),
          description: `Array of 2-4 positive aspects or happy moments, if applicable, ALL IN ${languageName.toUpperCase()}`,
        }),
        lessonsLearned: Schema.array({
          items: Schema.string({
            description: `An insight or lesson learned from the experience (lightbulb) IN ${languageName.toUpperCase()}`,
          }),
          description: `Array of 1-3 insights or lessons learned, if applicable, ALL IN ${languageName.toUpperCase()}`,
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

    // Generate content with text-only input and structured schema
    const result = await model.generateContent(fullPrompt);

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
 * - Or use @react-native-voice/voice library
 */
export async function processSpeechToText(audioUri: string): Promise<string> {
  try {
    // TODO: Implement speech-to-text
    // Example with Google Cloud Speech-to-Text:
    // const response = await fetch('https://speech.googleapis.com/v1/speech:recognize', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${apiKey}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     config: {
    //       encoding: 'LINEAR16',
    //       sampleRateHertz: 16000,
    //       languageCode: 'en-US',
    //     },
    //     audio: {
    //       uri: audioUri,
    //     },
    //   }),
    // });
    
    // const data = await response.json();
    // return data.results[0].alternatives[0].transcript;
    
    return '';
  } catch (error) {
    throw new Error((error as Error).message || 'Speech-to-text failed');
  }
}
