/**
 * Background AI Processor - Handles AI requests in the background
 * Persists request context and responses in AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import BackgroundJob from 'react-native-background-actions';
import { processMemoryPrompt, type AIMemoryResponse, type AIRequestContext } from './ai-service';
import { processEntityCreationPrompt, type AIEntityCreationResponse } from './ai-service';

const PENDING_AI_REQUEST_KEY = '@sferas:pending_ai_request';
const PENDING_AI_RESPONSE_KEY = '@sferas:pending_ai_response';
const PENDING_AI_ERROR_KEY = '@sferas:pending_ai_error';
const PENDING_ENTITY_REQUEST_KEY = '@sferas:pending_entity_request';
const PENDING_ENTITY_RESPONSE_KEY = '@sferas:pending_entity_response';
const PENDING_ENTITY_ERROR_KEY = '@sferas:pending_entity_error';

export interface PendingAIRequest {
  prompt: string;
  context: AIRequestContext;
  timestamp: number;
  requestId: string;
  imageUri?: string; // Optional image URI if user uploaded an image
  language?: 'en' | 'bg'; // Language code for AI prompt and response
}

export interface PendingAIResponse {
  requestId: string;
  response: AIMemoryResponse;
  timestamp: number;
  imageUri?: string; // Optional image URI if user uploaded an image
}

export interface PendingAIError {
  requestId: string;
  error: string;
  timestamp: number;
  imageUri?: string; // Optional image URI if user uploaded an image
}

export interface PendingEntityRequest {
  prompt: string;
  sphere: 'family' | 'friends' | 'hobbies' | 'relationships' | 'career';
  timestamp: number;
  requestId: string;
  language?: 'en' | 'bg';
}

export interface PendingEntityResponse {
  requestId: string;
  response: AIEntityCreationResponse;
  timestamp: number;
}

export interface PendingEntityError {
  requestId: string;
  error: string;
  timestamp: number;
}

/**
 * Save pending AI request to storage
 */
export async function savePendingAIRequest(request: PendingAIRequest): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_AI_REQUEST_KEY, JSON.stringify(request));
  } catch (error) {
    console.error('Failed to save pending AI request:', error);
  }
}

/**
 * Get pending AI request from storage
 */
export async function getPendingAIRequest(): Promise<PendingAIRequest | null> {
  try {
    const data = await AsyncStorage.getItem(PENDING_AI_REQUEST_KEY);
    if (data) {
      return JSON.parse(data) as PendingAIRequest;
    }
  } catch (error) {
    console.error('Failed to get pending AI request:', error);
  }
  return null;
}

/**
 * Clear pending AI request from storage
 */
export async function clearPendingAIRequest(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_AI_REQUEST_KEY);
  } catch (error) {
    console.error('Failed to clear pending AI request:', error);
  }
}

/**
 * Save AI response to storage
 */
export async function savePendingAIResponse(response: PendingAIResponse): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_AI_RESPONSE_KEY, JSON.stringify(response));
  } catch (error) {
    console.error('Failed to save pending AI response:', error);
  }
}

/**
 * Get pending AI response from storage
 */
export async function getPendingAIResponse(): Promise<PendingAIResponse | null> {
  try {
    const data = await AsyncStorage.getItem(PENDING_AI_RESPONSE_KEY);
    if (data) {
      return JSON.parse(data) as PendingAIResponse;
    }
  } catch (error) {
    console.error('Failed to get pending AI response:', error);
  }
  return null;
}

/**
 * Clear pending AI response from storage
 */
export async function clearPendingAIResponse(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_AI_RESPONSE_KEY);
  } catch (error) {
    console.error('Failed to clear pending AI response:', error);
  }
}

/**
 * Save AI error to storage
 */
export async function savePendingAIError(error: PendingAIError): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_AI_ERROR_KEY, JSON.stringify(error));
  } catch (err) {
    console.error('Failed to save pending AI error:', err);
  }
}

/**
 * Get pending AI error from storage
 */
export async function getPendingAIError(): Promise<PendingAIError | null> {
  try {
    const data = await AsyncStorage.getItem(PENDING_AI_ERROR_KEY);
    if (data) {
      return JSON.parse(data) as PendingAIError;
    }
  } catch (error) {
    console.error('Failed to get pending AI error:', error);
  }
  return null;
}

/**
 * Clear pending AI error from storage
 */
export async function clearPendingAIError(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_AI_ERROR_KEY);
  } catch (error) {
    console.error('Failed to clear pending AI error:', error);
  }
}

/**
 * Background task to process AI request
 */
type AIBackgroundTaskData = {
  delay: number;
  requestId: string;
  prompt: string;
  context: AIRequestContext;
  imageUri: string | undefined;
  language: 'en' | 'bg' | undefined;
};

const backgroundTask = async (taskData?: AIBackgroundTaskData) => {
  if (!taskData) return;
  const { requestId, prompt, context } = taskData;

  try {
    // Get the pending request to check for image URI and language
    const pendingRequest = await getPendingAIRequest();
    const savedImageUri = pendingRequest?.imageUri || taskData.imageUri;
    const language = pendingRequest?.language || taskData.language || 'en';
    
    // Process the AI request with language and optional image (AI analyzes image for better moments)
    const response = await processMemoryPrompt(prompt, context, language, savedImageUri);
    
    // Save response to storage with image URI if available
    await savePendingAIResponse({
      requestId,
      response,
      timestamp: Date.now(),
      imageUri: savedImageUri,
    });
    
    // Clear the pending request
    await clearPendingAIRequest();
    
    // Stop the background task
    await BackgroundJob.stop();
  } catch (error) {
    console.error('Background AI processing failed:', error);
    
    // Get the pending request to save image URI with error
    const pendingRequest = await getPendingAIRequest();
    const savedImageUri = pendingRequest?.imageUri || taskData.imageUri;
    
    // Save error to storage so user can be notified
    const errorMessage = error instanceof Error ? error.message : String(error);
    await savePendingAIError({
      requestId,
      error: errorMessage,
      timestamp: Date.now(),
      imageUri: savedImageUri,
    });
    
    // Clear pending request on error
    await clearPendingAIRequest();
    await BackgroundJob.stop();
  }
};

/**
 * Start background processing for AI request
 */
export async function startBackgroundAIProcessing(
  prompt: string,
  context: AIRequestContext,
  imageUri?: string,
  language?: 'en' | 'bg'
): Promise<string> {
  const requestId = `ai_request_${Date.now()}`;
  
  // Save pending request with image URI and language if available
  await savePendingAIRequest({
    prompt,
    context,
    timestamp: Date.now(),
    requestId,
    imageUri,
    language,
  });
  
  // Start background task
  const options = {
    taskName: 'AI Memory Processing',
    taskTitle: 'Processing your memory...',
    taskDesc: 'AI is analyzing your thoughts',
    taskIcon: {
      name: 'ic_launcher',
      type: 'mipmap',
    },
    color: '#ff6b35',
    linkingURI: 'sferas://ai-response',
    parameters: {
      delay: 1000,
      requestId,
      prompt,
      context,
      imageUri,
      language,
    },
  };
  
  try {
    await BackgroundJob.start(backgroundTask, options);
    return requestId;
  } catch (error) {
    console.error('Failed to start background task:', error);
    // Clear pending request if background task fails to start
    await clearPendingAIRequest();
    throw error;
  }
}

/**
 * Stop background AI processing
 */
export async function stopBackgroundAIProcessing(): Promise<void> {
  try {
    const isRunning = await BackgroundJob.isRunning();
    if (isRunning) {
      await BackgroundJob.stop();
    }
    await clearPendingAIRequest();
  } catch (error) {
    console.error('Failed to stop background task:', error);
  }
}

/**
 * Check if background task is running
 */
export async function isBackgroundTaskRunning(): Promise<boolean> {
  try {
    return await BackgroundJob.isRunning();
  } catch (error) {
    return false;
  }
}

/**
 * Save pending entity creation request to storage
 */
export async function savePendingEntityRequest(request: PendingEntityRequest): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_ENTITY_REQUEST_KEY, JSON.stringify(request));
  } catch (error) {
    console.error('Failed to save pending entity request:', error);
  }
}

/**
 * Get pending entity creation request from storage
 */
export async function getPendingEntityRequest(): Promise<PendingEntityRequest | null> {
  try {
    const data = await AsyncStorage.getItem(PENDING_ENTITY_REQUEST_KEY);
    if (data) {
      return JSON.parse(data) as PendingEntityRequest;
    }
  } catch (error) {
    console.error('Failed to get pending entity request:', error);
  }
  return null;
}

/**
 * Clear pending entity creation request from storage
 */
export async function clearPendingEntityRequest(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_ENTITY_REQUEST_KEY);
  } catch (error) {
    console.error('Failed to clear pending entity request:', error);
  }
}

/**
 * Save entity creation response to storage
 */
export async function savePendingEntityResponse(response: PendingEntityResponse): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_ENTITY_RESPONSE_KEY, JSON.stringify(response));
  } catch (error) {
    console.error('Failed to save pending entity response:', error);
  }
}

/**
 * Get pending entity creation response from storage
 */
export async function getPendingEntityResponse(): Promise<PendingEntityResponse | null> {
  try {
    const data = await AsyncStorage.getItem(PENDING_ENTITY_RESPONSE_KEY);
    if (data) {
      return JSON.parse(data) as PendingEntityResponse;
    }
  } catch (error) {
    console.error('Failed to get pending entity response:', error);
  }
  return null;
}

/**
 * Clear pending entity creation response from storage
 */
export async function clearPendingEntityResponse(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_ENTITY_RESPONSE_KEY);
  } catch (error) {
    console.error('Failed to clear pending entity response:', error);
  }
}

/**
 * Save entity creation error to storage
 */
export async function savePendingEntityError(error: PendingEntityError): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_ENTITY_ERROR_KEY, JSON.stringify(error));
  } catch (err) {
    console.error('Failed to save pending entity error:', err);
  }
}

/**
 * Get pending entity creation error from storage
 */
export async function getPendingEntityError(): Promise<PendingEntityError | null> {
  try {
    const data = await AsyncStorage.getItem(PENDING_ENTITY_ERROR_KEY);
    if (data) {
      return JSON.parse(data) as PendingEntityError;
    }
  } catch (error) {
    console.error('Failed to get pending entity error:', error);
  }
  return null;
}

/**
 * Clear pending entity creation error from storage
 */
export async function clearPendingEntityError(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_ENTITY_ERROR_KEY);
  } catch (error) {
    console.error('Failed to clear pending entity error:', error);
  }
}

/**
 * Background task to process entity creation request
 */
type EntityBackgroundTaskData = {
  delay: number;
  requestId: string;
  prompt: string;
  sphere: 'family' | 'friends' | 'hobbies' | 'relationships' | 'career';
  language: 'en' | 'bg' | undefined;
};

const entityBackgroundTask = async (taskData?: EntityBackgroundTaskData) => {
  if (!taskData) return;
  const { requestId, prompt, sphere } = taskData;

  try {
    // Get the pending request to check for language
    const pendingRequest = await getPendingEntityRequest();
    const language = pendingRequest?.language || taskData.language || 'en';
    
    // Process the entity creation request
    const response = await processEntityCreationPrompt(prompt, sphere, language);
    
    // Save response to storage
    await savePendingEntityResponse({
      requestId,
      response,
      timestamp: Date.now(),
    });
    
    // Clear the pending request
    await clearPendingEntityRequest();
    
    // Stop the background task
    await BackgroundJob.stop();
  } catch (error) {
    console.error('Background entity creation processing failed:', error);
    
    // Save error to storage so user can be notified
    const errorMessage = error instanceof Error ? error.message : String(error);
    await savePendingEntityError({
      requestId,
      error: errorMessage,
      timestamp: Date.now(),
    });
    
    // Clear pending request on error
    await clearPendingEntityRequest();
    await BackgroundJob.stop();
  }
};

/**
 * Start background processing for entity creation request
 */
export async function startBackgroundEntityProcessing(
  prompt: string,
  sphere: 'family' | 'friends' | 'hobbies' | 'relationships' | 'career',
  language?: 'en' | 'bg'
): Promise<string> {
  const requestId = `entity_request_${Date.now()}`;
  
  // Save pending request with language if available
  await savePendingEntityRequest({
    prompt,
    sphere,
    timestamp: Date.now(),
    requestId,
    language,
  });
  
  // Start background task
  const options = {
    taskName: 'AI Entity Creation',
    taskTitle: 'Creating entities...',
    taskDesc: 'AI is analyzing your story',
    taskIcon: {
      name: 'ic_launcher',
      type: 'mipmap',
    },
    color: '#ff6b35',
    linkingURI: 'sferas://entity-response',
    parameters: {
      delay: 1000,
      requestId,
      prompt,
      sphere,
      language,
    },
  };
  
  try {
    await BackgroundJob.start(entityBackgroundTask, options);
    return requestId;
  } catch (error) {
    console.error('Failed to start background entity task:', error);
    // Clear pending request if background task fails to start
    await clearPendingEntityRequest();
    throw error;
  }
}

/**
 * Stop background entity processing task
 */
export async function stopBackgroundEntityProcessing(): Promise<void> {
  try {
    await BackgroundJob.stop();
  } catch (error) {
    console.error('Failed to stop background entity task:', error);
  }
}

/**
 * Check if background entity processing task is running
 */
export async function isBackgroundEntityTaskRunning(): Promise<boolean> {
  try {
    return await BackgroundJob.isRunning();
  } catch (error) {
    console.error('Failed to check background entity task status:', error);
    return false;
  }
}
