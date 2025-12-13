/**
 * Streak Feature - Core Logic
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEY, STREAK_BADGES, STREAK_MILESTONES, type StreakBadge, type StreakData } from './streak-types';

/**
 * Get local date string in YYYY-MM-DD format
 */
export function getLocalDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Subtract days from a date
 */
export function subtractDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

/**
 * Get streak data from storage
 */
export async function getStreakData(): Promise<StreakData> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsedData = JSON.parse(data) as StreakData;
      // Migrate old data: compute earnedBadges if missing
      if (!parsedData.earnedBadges) {
        parsedData.earnedBadges = checkNewBadges(parsedData.longestStreak || 0, []);
        // Save migrated data
        await saveStreakData(parsedData);
      }
      return parsedData;
    }
  } catch (error) {
    console.error('[StreakManager] Error reading streak data:', error);
  }

  // Return default data
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastLoggedDate: '',
    streakStartDate: '',
    totalDaysLogged: 0,
    memoryLogDates: [],
    currentBadge: null,
    milestones: [],
    earnedBadges: [],
  };
}

/**
 * Save streak data to storage
 */
export async function saveStreakData(data: StreakData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('[StreakManager] Error saving streak data:', error);
  }
}

/**
 * Calculate consecutive days from the end of the log dates array
 * Counts backwards from today/last logged date to find longest consecutive streak
 */
export function calculateConsecutiveDays(memoryLogDates: string[]): number {
  if (!memoryLogDates || memoryLogDates.length === 0) {
    return 0;
  }

  // Sort dates in descending order (most recent first)
  const sortedDates = [...memoryLogDates].sort((a, b) => b.localeCompare(a));

  const today = getLocalDateString();
  let consecutiveDays = 0;
  let expectedDate = today;

  // Start from today and count backwards
  for (let i = 0; i < sortedDates.length; i++) {
    const currentDate = sortedDates[i];

    if (currentDate === expectedDate) {
      consecutiveDays++;
      // Move expected date back by one day
      const date = new Date(expectedDate);
      date.setDate(date.getDate() - 1);
      expectedDate = getLocalDateString(date);
    } else {
      // Gap found - stop counting
      break;
    }
  }

  return consecutiveDays;
}

/**
 * Get dates from last 7 days (including today)
 */
export function getLast7Days(): string[] {
  const dates: string[] = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(getLocalDateString(date));
  }

  return dates;
}

/**
 * Filter memory log dates to only include last 7 days
 */
export function filterLast7Days(memoryLogDates: string[]): string[] {
  const last7Days = getLast7Days();
  return memoryLogDates.filter(date => last7Days.includes(date));
}

/**
 * Get the appropriate badge for a streak count
 */
export function getBadgeForStreak(streakDays: number): StreakBadge | null {
  // Find the highest badge the user has earned
  const sortedBadges = [...STREAK_BADGES].sort((a, b) => b.daysRequired - a.daysRequired);

  for (const badge of sortedBadges) {
    if (streakDays >= badge.daysRequired) {
      return badge;
    }
  }

  return null;
}

/**
 * Check if new milestones were reached
 */
function checkNewMilestones(newStreak: number, existingMilestones: number[]): number[] {
  const newMilestones = [...existingMilestones];

  for (const milestone of STREAK_MILESTONES) {
    if (newStreak >= milestone && !existingMilestones.includes(milestone)) {
      newMilestones.push(milestone);
    }
  }

  return newMilestones;
}

/**
 * Check if new badges were earned
 */
function checkNewBadges(newStreak: number, existingBadges: string[]): string[] {
  const newBadges = [...existingBadges];

  for (const badge of STREAK_BADGES) {
    if (newStreak >= badge.daysRequired && !existingBadges.includes(badge.id)) {
      newBadges.push(badge.id);
    }
  }

  return newBadges;
}

/**
 * Update streak when a new memory is created
 * Uses rolling 7-day window: badge reflects consecutive days in last 7 days
 */
export async function updateStreakOnMemoryCreation(): Promise<{
  data: StreakData;
  streakIncreased: boolean;
  newBadges: StreakBadge[];
  newMilestones: number[];
  isFirstMemory: boolean;
}> {
  const today = getLocalDateString();
  const streakData = await getStreakData();

  console.log('[StreakManager] updateStreakOnMemoryCreation called');
  console.log('[StreakManager] Today:', today);
  console.log('[StreakManager] Current memory log dates:', streakData.memoryLogDates);

  // Check if already logged today
  const alreadyLoggedToday = streakData.memoryLogDates?.includes(today);
  if (alreadyLoggedToday) {
    console.log('[StreakManager] Already logged today - no change');
    return {
      data: streakData,
      streakIncreased: false,
      newBadges: [],
      newMilestones: [],
      isFirstMemory: false,
    };
  }

  const isFirstMemory = !streakData.memoryLogDates || streakData.memoryLogDates.length === 0;

  // Add today to memory log dates
  const updatedLogDates = [...(streakData.memoryLogDates || []), today];

  // Keep only last 7 days of data (rolling window)
  const last7DaysData = filterLast7Days(updatedLogDates);

  // Calculate consecutive days from the filtered data
  const previousStreak = streakData.currentStreak;
  const newStreak = calculateConsecutiveDays(last7DaysData);
  const streakIncreased = newStreak > previousStreak;

  console.log('[StreakManager] Previous streak:', previousStreak);
  console.log('[StreakManager] New streak:', newStreak);
  console.log('[StreakManager] Streak increased:', streakIncreased);

  // Determine current badge based on new streak
  const currentBadge = getBadgeForStreak(newStreak);
  const previousBadge = getBadgeForStreak(previousStreak);

  // Check if we earned a new badge
  const newBadges: StreakBadge[] = [];
  if (currentBadge && (!previousBadge || currentBadge.daysRequired > previousBadge.daysRequired)) {
    newBadges.push(currentBadge);
    console.log('[StreakManager] New badge earned:', currentBadge.name);
  }

  // Check milestones
  const previousMilestones = streakData.milestones || [];
  const newMilestonesArray = checkNewMilestones(newStreak, previousMilestones);
  const justReachedMilestones = newMilestonesArray.filter(
    milestone => !previousMilestones.includes(milestone)
  );

  // Calculate earned badges based on longest streak
  const newLongestStreak = Math.max(newStreak, streakData.longestStreak || 0);
  const previousEarnedBadges = streakData.earnedBadges || [];
  const newEarnedBadges = checkNewBadges(newLongestStreak, previousEarnedBadges);

  const newStreakData: StreakData = {
    ...streakData,
    currentStreak: newStreak,
    longestStreak: newLongestStreak,
    lastLoggedDate: today,
    streakStartDate: streakData.streakStartDate || today,
    totalDaysLogged: (streakData.totalDaysLogged || 0) + 1,
    memoryLogDates: last7DaysData, // Store only last 7 days
    currentBadge: currentBadge?.id || null,
    milestones: newMilestonesArray,
    earnedBadges: newEarnedBadges,
  };

  console.log('[StreakManager] Saving new streak data:', {
    currentStreak: newStreakData.currentStreak,
    totalDaysLogged: newStreakData.totalDaysLogged,
    memoryLogDates: newStreakData.memoryLogDates,
  });

  await saveStreakData(newStreakData);

  return {
    data: newStreakData,
    streakIncreased,
    newBadges,
    newMilestones: justReachedMilestones,
    isFirstMemory,
  };
}

/**
 * Recalculate streak based on current rolling 7-day window
 * Call this when app opens to update badge if days have passed
 */
export async function recalculateStreak(): Promise<StreakData> {
  const streakData = await getStreakData();

  console.log('[StreakManager] recalculateStreak called');
  console.log('[StreakManager] Current memory log dates:', streakData.memoryLogDates);

  // Filter to only last 7 days
  const last7DaysData = filterLast7Days(streakData.memoryLogDates || []);

  // Recalculate consecutive days
  const newStreak = calculateConsecutiveDays(last7DaysData);
  const currentBadge = getBadgeForStreak(newStreak);

  console.log('[StreakManager] Recalculated streak:', newStreak);
  console.log('[StreakManager] Current badge:', currentBadge?.name || 'None');

  // Update streak data if changed
  if (newStreak !== streakData.currentStreak || last7DaysData.length !== streakData.memoryLogDates?.length) {
    // Ensure earnedBadges is computed based on longestStreak
    const previousEarnedBadges = streakData.earnedBadges || [];
    const updatedEarnedBadges = checkNewBadges(streakData.longestStreak || 0, previousEarnedBadges);
    
    const updatedData: StreakData = {
      ...streakData,
      currentStreak: newStreak,
      memoryLogDates: last7DaysData,
      currentBadge: currentBadge?.id || null,
      earnedBadges: updatedEarnedBadges,
    };

    await saveStreakData(updatedData);

    console.log('[StreakManager] Streak recalculated and saved:', {
      oldStreak: streakData.currentStreak,
      newStreak,
      memoryLogDates: last7DaysData,
    });

    return updatedData;
  }

  return streakData;
}

/**
 * Check if streak is at risk (no log today)
 */
export async function isStreakAtRisk(): Promise<boolean> {
  const today = getLocalDateString();
  const streakData = await getStreakData();

  // Streak is at risk if:
  // 1. Current streak is > 0
  // 2. Haven't logged today
  return streakData.currentStreak > 0 && streakData.lastLoggedDate !== today;
}

/**
 * Get days until streak is lost
 */
export async function getDaysUntilStreakLost(): Promise<number> {
  const today = getLocalDateString();
  const streakData = await getStreakData();

  if (streakData.lastLoggedDate === today) {
    return 1; // Safe for today
  }

  const yesterday = getLocalDateString(subtractDays(new Date(), 1));
  if (streakData.lastLoggedDate === yesterday) {
    return 0; // At risk - today is the last day
  }

  return -1; // Already lost
}

/**
 * Get all earned badges
 */
export async function getEarnedBadges(): Promise<StreakBadge[]> {
  const streakData = await getStreakData();
  const earnedBadgeIds = streakData.earnedBadges || [];
  return STREAK_BADGES.filter(badge => earnedBadgeIds.includes(badge.id));
}

/**
 * Get current active badge
 */
export async function getCurrentBadge(): Promise<StreakBadge | null> {
  const streakData = await getStreakData();
  if (!streakData.currentBadge) return null;

  return STREAK_BADGES.find(badge => badge.id === streakData.currentBadge) || null;
}

/**
 * Get next badge to earn
 */
export async function getNextBadge(): Promise<StreakBadge | null> {
  const streakData = await getStreakData();
  const currentStreak = streakData.currentStreak;

  // Find the next badge that hasn't been earned
  const sortedBadges = [...STREAK_BADGES].sort((a, b) => a.daysRequired - b.daysRequired);

  for (const badge of sortedBadges) {
    if (currentStreak < badge.daysRequired) {
      return badge;
    }
  }

  return null; // All badges earned!
}

/**
 * Reset streak data (for testing or user request)
 */
export async function resetStreakData(): Promise<void> {
  const defaultData: StreakData = {
    currentStreak: 0,
    longestStreak: 0,
    lastLoggedDate: '',
    streakStartDate: '',
    totalDaysLogged: 0,
    memoryLogDates: [],
    currentBadge: null,
    milestones: [],
    earnedBadges: [],
  };

  await saveStreakData(defaultData);
}
