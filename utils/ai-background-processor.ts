/**
 * Background AI Processor - Handles AI requests in the background
 * Persists request context and responses in AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import BackgroundJob from 'react-native-background-actions';
import { processMemoryPrompt, type AIMemoryResponse, type AIRequestContext } from './ai-service';

const PENDING_AI_REQUEST_KEY = '@sferas:pending_ai_request';
const PENDING_AI_RESPONSE_KEY = '@sferas:pending_ai_response';
const PENDING_AI_ERROR_KEY = '@sferas:pending_ai_error';

export interface PendingAIRequest {
  prompt: string;
  context: AIRequestContext;
  timestamp: number;
  requestId: string;
  imageUri?: string; // Optional image URI if user uploaded an image
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
const backgroundTask = async (taskData: { requestId: string; prompt: string; context: AIRequestContext; imageUri?: string }) => {
  const { requestId, prompt, context } = taskData;
  
  try {
    // Get the pending request to check for image URI
    const pendingRequest = await getPendingAIRequest();
    const savedImageUri = pendingRequest?.imageUri || taskData.imageUri;
    
    // Process the AI request
    const response = await processMemoryPrompt(prompt, context);
    
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
  imageUri?: string
): Promise<string> {
  const requestId = `ai_request_${Date.now()}`;
  
  // Save pending request with image URI if available
  await savePendingAIRequest({
    prompt,
    context,
    timestamp: Date.now(),
    requestId,
    imageUri,
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
