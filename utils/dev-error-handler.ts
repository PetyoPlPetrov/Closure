import { Alert } from 'react-native';

/**
 * Shows an error alert in development mode only
 * Silently handles errors in production to prevent crashes
 * @param error - The error object or error message
 * @param context - Optional context about where the error occurred
 */
export function handleDevError(error: unknown, context?: string): void {
  if (!__DEV__) {
    // In production, silently handle errors
    return;
  }

  // Extract error message
  let errorMessage = 'Unknown error';
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && typeof error === 'object' && 'message' in error) {
    errorMessage = String(error.message);
  }

  // Build alert message
  const title = context ? `Error: ${context}` : 'Error';
  const message = errorMessage;

  // Show alert in dev mode
  Alert.alert(title, message, [{ text: 'OK' }]);
}

/**
 * Wraps an async function to catch and display errors in dev mode
 * @param fn - The async function to wrap
 * @param context - Optional context about where the error occurred
 * @returns The wrapped function
 */
export function withDevErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: string
): T {
  return ((...args: any[]) => {
    return fn(...args).catch((error) => {
      handleDevError(error, context);
      throw error; // Re-throw to allow caller to handle if needed
    });
  }) as T;
}

