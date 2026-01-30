/**
 * AI Request Rate Limiter
 * Tracks AI requests per calendar day (timezone-based).
 * Counts submits for memory creation and entity creation (shared pool).
 * Limits: 3/day for free users, 30/day for premium.
 * Resets at midnight in user's timezone.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const AI_REQUESTS_KEY = "@sferas:ai_requests";
export const REQUESTS_PER_DAY_FREE = 3;
export const REQUESTS_PER_DAY_PREMIUM = 30;

interface AIRequestRecord {
  date: string; // Date string in format "YYYY-MM-DD" (timezone-aware)
  count: number; // Number of requests made on this date
}

/**
 * Get current date string in user's timezone (YYYY-MM-DD format).
 * Exported for use by encouragement rate limiting.
 */
export function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
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
    console.error("Failed to get AI request records:", error);
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
    console.error("Failed to save AI request records:", error);
  }
}

/**
 * Get request count for today
 */
async function getTodayRequestCount(): Promise<number> {
  const records = await getAIRequestRecords();
  const today = getLocalDateString();
  const todayRecord = records.find((record) => record.date === today);
  return todayRecord ? todayRecord.count : 0;
}

/**
 * Clean up old records (older than today) - optional cleanup
 */
async function cleanupOldRecords(): Promise<void> {
  const records = await getAIRequestRecords();
  const today = getLocalDateString();
  const filteredRecords = records.filter((record) => record.date === today);

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
  const today = getLocalDateString();

  // Find today's record
  const todayRecordIndex = records.findIndex((record) => record.date === today);

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
 * @param isSubscribed - Whether user has premium subscription
 * @returns Number of remaining requests
 */
export async function getRemainingAIRequests(
  isSubscribed: boolean,
): Promise<number> {
  const used = await getTodayRequestCount();
  const limit = isSubscribed ? REQUESTS_PER_DAY_PREMIUM : REQUESTS_PER_DAY_FREE;
  return Math.max(0, limit - used);
}

/**
 * Check if user can make an AI request
 * @param isSubscribed - Whether user has premium subscription
 * @returns true if user has remaining requests, false otherwise
 */
export async function canMakeAIRequest(
  isSubscribed: boolean,
): Promise<boolean> {
  const remaining = await getRemainingAIRequests(isSubscribed);
  return remaining > 0;
}

/**
 * Get time until next request is available (in milliseconds)
 * Returns 0 if requests are available now
 * @param isSubscribed - Whether user has premium subscription
 */
export async function getTimeUntilNextRequest(
  isSubscribed: boolean,
): Promise<number> {
  const used = await getTodayRequestCount();
  const limit = isSubscribed ? REQUESTS_PER_DAY_PREMIUM : REQUESTS_PER_DAY_FREE;

  if (used < limit) {
    return 0;
  }

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return Math.max(0, tomorrow.getTime() - now.getTime());
}

/**
 * Format time until next request as human-readable string
 * @param isSubscribed - Whether user has premium subscription
 */
export async function getTimeUntilNextRequestFormatted(
  isSubscribed: boolean,
): Promise<string> {
  const timeMs = await getTimeUntilNextRequest(isSubscribed);

  if (timeMs === 0) {
    return "Available now";
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
    console.error("Failed to clear AI request records:", error);
  }
}
