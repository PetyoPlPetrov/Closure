/**
 * AI Service - Handles AI API calls
 * 
 * TODO: Add your AI API configuration here
 * Options:
 * - OpenAI API
 * - Anthropic Claude API
 * - Google Gemini API
 * - Or any other AI service
 */

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
    relationships?: string[];
    career?: string[];
    family?: string[];
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
 * Mock AI API that simulates processing a memory prompt
 * Returns after 4 seconds with suggested moments and lessons
 * 
 * In production, this would:
 * 1. Send the prompt and available entities (sferas) to your AI API
 * 2. The AI would analyze and match to one of the user's entities
 * 3. Return suggestions based on the matched entity
 */
export async function processMemoryPrompt(
  prompt: string,
  context: AIRequestContext
): Promise<AIMemoryResponse> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Extract entities from context.sferas
  const relationships = context.sferas.relationships || [];
  const career = context.sferas.career || [];
  const family = context.sferas.family || [];
  const friends = context.sferas.friends || [];
  const hobbies = context.sferas.hobbies || [];

  // Mock: Select an entity from available ones based on prompt
  let selectedEntityName: string | undefined;
  let selectedSphere: LifeSphere = 'relationships';

  // Simple keyword matching (in production, use AI for semantic matching)
  const promptLower = prompt.toLowerCase();
  
  if (promptLower.includes('work') || promptLower.includes('job') || promptLower.includes('career') || promptLower.includes('office')) {
    if (career.length > 0) {
      selectedEntityName = career[0];
      selectedSphere = 'career';
    }
  } else if (promptLower.includes('family') || promptLower.includes('mother') || promptLower.includes('father') || promptLower.includes('sister') || promptLower.includes('brother')) {
    if (family.length > 0) {
      selectedEntityName = family[0];
      selectedSphere = 'family';
    }
  } else if (promptLower.includes('friend') || promptLower.includes('buddy') || promptLower.includes('pal')) {
    if (friends.length > 0) {
      selectedEntityName = friends[0];
      selectedSphere = 'friends';
    }
  } else if (promptLower.includes('hobby') || promptLower.includes('interest') || promptLower.includes('activity')) {
    if (hobbies.length > 0) {
      selectedEntityName = hobbies[0];
      selectedSphere = 'hobbies';
    }
  } else {
    // Default to relationships if available
    if (relationships.length > 0) {
      selectedEntityName = relationships[0];
      selectedSphere = 'relationships';
    } else if (friends.length > 0) {
      selectedEntityName = friends[0];
      selectedSphere = 'friends';
    } else if (family.length > 0) {
      selectedEntityName = family[0];
      selectedSphere = 'family';
    } else if (career.length > 0) {
      selectedEntityName = career[0];
      selectedSphere = 'career';
    } else if (hobbies.length > 0) {
      selectedEntityName = hobbies[0];
      selectedSphere = 'hobbies';
    }
  }

  // Generate a title based on the prompt and entity
  const generateTitle = (prompt: string, entityName?: string): string => {
    // Simple title generation - in production, AI would generate a meaningful title
    const promptWords = prompt.toLowerCase().split(/\s+/).slice(0, 5);
    const titleBase = promptWords.join(' ');
    if (entityName) {
      return `${entityName}: ${titleBase.charAt(0).toUpperCase() + titleBase.slice(1)}`;
    }
    return titleBase.charAt(0).toUpperCase() + titleBase.slice(1);
  };

  // Mock response - in production, this would come from your AI API
  // The AI would analyze the prompt to determine:
  // - Which sphere it belongs to (from user's available spheres)
  // - Which entity (from user's available entities) it relates to
  // - A meaningful title for the memory
  // - Suggested hard truths (cloudy moments)
  // - Suggested good facts (sunny moments)
  // - Lessons learned

  const mockResponse: AIMemoryResponse = {
    sphere: selectedSphere,
    entityName: selectedEntityName || 'Unknown Entity',
    title: generateTitle(prompt, selectedEntityName || undefined),
    hardTruths: [
      'The relationship had communication issues',
      'We had different life goals',
      'Trust was broken at some point'
    ],
    goodFacts: [
      'We shared many happy moments together',
      'I learned a lot about myself',
      'We supported each other through difficult times'
    ],
    lessonsLearned: [
      'I need better communication in relationships',
      'It\'s important to align on life goals early',
      'Trust is fundamental and takes time to rebuild'
    ],
  };

  return mockResponse;
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
