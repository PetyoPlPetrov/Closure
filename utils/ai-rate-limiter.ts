/**
 * AI Request Rate Limiter
 * Tracks AI requests per calendar day (timezone-based) for non-premium users
 * Limits: 3 requests per day
 * Resets at midnight in user's timezone
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const AI_REQUESTS_KEY = '@sferas:ai_requests';
const REQUESTS_PER_DAY = 3;

interface AIRequestRecord {
  date: string; // Date string in format "YYYY-MM-DD" (timezone-aware)
  count: number; // Number of requests made on this date
}

/**
 * Get current date string in user's timezone (YYYY-MM-DD format)
 */
function getCurrentDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get all AI request records from storage
 */
async function getAIRequestRecords(): Promise<AIRequestRecord[]> {
  try {
    const data = await AsyncStorage.getItem(AI_REQUESTS_KEY);
    if (data) {
      return JSON.parse(data) as AIRequestRecord[];
    }
  } catch (error) {
    console.error('Failed to get AI request records:', error);
  }
  return [];
}

/**
 * Save AI request records to storage
 */
async function saveAIRequestRecords(records: AIRequestRecord[]): Promise<void> {
  try {
    await AsyncStorage.setItem(AI_REQUESTS_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('Failed to save AI request records:', error);
  }
}

/**
 * Get request count for today
 */
async function getTodayRequestCount(): Promise<number> {
  const records = await getAIRequestRecords();
  const today = getCurrentDateString();
  const todayRecord = records.find(record => record.date === today);
  return todayRecord ? todayRecord.count : 0;
}

/**
 * Clean up old records (older than today) - optional cleanup
 */
async function cleanupOldRecords(): Promise<void> {
  const records = await getAIRequestRecords();
  const today = getCurrentDateString();
  const filteredRecords = records.filter(record => record.date === today);
  
  // Only save if we removed some records
  if (filteredRecords.length !== records.length) {
    await saveAIRequestRecords(filteredRecords);
  }
}

/**
 * Record a new AI request
 */
export async function recordAIRequest(): Promise<void> {
  const records = await getAIRequestRecords();
  const today = getCurrentDateString();
  
  // Find today's record
  const todayRecordIndex = records.findIndex(record => record.date === today);
  
  if (todayRecordIndex >= 0) {
    // Increment count for today
    records[todayRecordIndex].count += 1;
  } else {
    // Create new record for today
    records.push({
      date: today,
      count: 1,
    });
  }
  
  await saveAIRequestRecords(records);
  
  // Optional: cleanup old records
  await cleanupOldRecords();
}

/**
 * Get remaining AI requests for today
 * @returns Number of remaining requests (0-3)
 */
export async function getRemainingAIRequests(): Promise<number> {
  const used = await getTodayRequestCount();
  const remaining = Math.max(0, REQUESTS_PER_DAY - used);
  return remaining;
}

/**
 * Check if user can make an AI request
 * @returns true if user has remaining requests, false otherwise
 */
export async function canMakeAIRequest(): Promise<boolean> {
  const remaining = await getRemainingAIRequests();
  return remaining > 0;
}

/**
 * Get time until next request is available (in milliseconds)
 * Returns 0 if requests are available now
 * For calendar day tracking, this is time until midnight
 */
export async function getTimeUntilNextRequest(): Promise<number> {
  const used = await getTodayRequestCount();
  
  if (used < REQUESTS_PER_DAY) {
    return 0; // Requests available now
  }
  
  // Calculate time until midnight in user's timezone
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0); // Set to midnight
  
  const timeUntilMidnight = tomorrow.getTime() - now.getTime();
  return Math.max(0, timeUntilMidnight);
}

/**
 * Format time until next request as human-readable string
 * @returns String like "5h 30m" or "23h 15m" or "Available now"
 */
export async function getTimeUntilNextRequestFormatted(): Promise<string> {
  const timeMs = await getTimeUntilNextRequest();
  
  if (timeMs === 0) {
    return 'Available now';
  }
  
  const hours = Math.floor(timeMs / (60 * 60 * 1000));
  const minutes = Math.floor((timeMs % (60 * 60 * 1000)) / (60 * 1000));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Clear all AI request records (useful for testing or reset)
 */
export async function clearAIRequestRecords(): Promise<void> {
  try {
    await AsyncStorage.removeItem(AI_REQUESTS_KEY);
  } catch (error) {
    console.error('Failed to clear AI request records:', error);
  }
}
