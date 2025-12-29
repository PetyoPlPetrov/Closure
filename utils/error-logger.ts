/**
 * Error logger utility that sends errors to Firebase Analytics
 * Logs errors as analytics events for tracking and debugging
 */

import analytics from '@react-native-firebase/analytics';

/**
 * Log an error to Firebase Analytics
 * @param context - The context/location where the error occurred (e.g., 'HomeScreen', 'ShareModal')
 * @param error - The error object or message
 * @param additionalData - Optional additional data to include with the error
 */
export async function logError(
  context: string,
  error: Error | string | unknown,
  additionalData?: Record<string, any>
): Promise<void> {
  try {
    // Extract error message and stack
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Prepare event parameters
    const eventParams: Record<string, any> = {
      context,
      error_message: errorMessage,
      timestamp: new Date().toISOString(),
    };

    // Add stack trace if available (truncated to 100 chars for Firebase limits)
    if (errorStack) {
      eventParams.error_stack = errorStack.substring(0, 100);
    }

    // Add additional data if provided
    if (additionalData) {
      // Flatten additional data and ensure values are primitives (Firebase Analytics requirement)
      Object.entries(additionalData).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          eventParams[key] = value;
        } else {
          eventParams[key] = JSON.stringify(value).substring(0, 100);
        }
      });
    }

    // Log to Firebase Analytics as an error event
    await analytics().logEvent('app_error', eventParams);

    // Also log to console in development for debugging
    if (__DEV__) {
      console.error(`[${context}]`, errorMessage, error);
    }
  } catch (loggingError) {
    // If logging fails, fall back to console only
    if (__DEV__) {
      console.error('Failed to log error to Firebase:', loggingError);
      console.error(`[${context}]`, error);
    }
  }
}

/**
 * Log a warning to Firebase Analytics
 * @param context - The context/location where the warning occurred
 * @param message - The warning message
 * @param additionalData - Optional additional data to include
 */
export async function logWarning(
  context: string,
  message: string,
  additionalData?: Record<string, any>
): Promise<void> {
  try {
    const eventParams: Record<string, any> = {
      context,
      warning_message: message,
      timestamp: new Date().toISOString(),
    };

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          eventParams[key] = value;
        } else {
          eventParams[key] = JSON.stringify(value).substring(0, 100);
        }
      });
    }

    await analytics().logEvent('app_warning', eventParams);

    if (__DEV__) {
      console.warn(`[${context}]`, message);
    }
  } catch (loggingError) {
    if (__DEV__) {
      console.error('Failed to log warning to Firebase:', loggingError);
      console.warn(`[${context}]`, message);
    }
  }
}

/**
 * Log an info event to Firebase Analytics
 * @param context - The context/location
 * @param message - The info message
 * @param additionalData - Optional additional data
 */
export async function logInfo(
  context: string,
  message: string,
  additionalData?: Record<string, any>
): Promise<void> {
  try {
    const eventParams: Record<string, any> = {
      context,
      info_message: message,
      timestamp: new Date().toISOString(),
    };

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          eventParams[key] = value;
        } else {
          eventParams[key] = JSON.stringify(value).substring(0, 100);
        }
      });
    }

    await analytics().logEvent('app_info', eventParams);

    if (__DEV__) {
      console.info(`[${context}]`, message);
    }
  } catch (loggingError) {
    if (__DEV__) {
      console.error('Failed to log info to Firebase:', loggingError);
    }
  }
}
