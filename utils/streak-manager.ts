/**
 * Streak Feature - Core Logic
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { notifyBadgeRewardsChanged } from './badge-rewards-events';
import { STORAGE_KEY, STREAK_BADGES, STREAK_MILESTONES, type StreakBadge, type StreakData } from './streak-types';

const STREAK_LOG_LOOKBACK_DAYS = 30;

/**
 * Get local date string in YYYY-MM-DD format
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD as a local date (never UTC).
 */
function parseLocalDateString(dateString: string): Date {
  const [yearString, monthString, dayString] = dateString.split('-');
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);
  return new Date(year, month - 1, day);
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
      const recentLogDates = filterRecentDays(
        parsedData.memoryLogDates || [],
        STREAK_LOG_LOOKBACK_DAYS,
      );
      const liveCurrentStreak = calculateConsecutiveDays(recentLogDates);
      const normalizedLongestStreak = Math.max(
        parsedData.longestStreak || 0,
        liveCurrentStreak,
      );
      const normalizedCurrentBadge =
        getBadgeForStreak(liveCurrentStreak)?.id || null;
      const normalizedEarnedBadges = checkNewBadges(
        normalizedLongestStreak,
        parsedData.earnedBadges || [],
      );
      const hadEarnedBadges = Array.isArray(parsedData.earnedBadges);
      const normalizedData: StreakData = {
        ...parsedData,
        currentStreak: liveCurrentStreak,
        longestStreak: normalizedLongestStreak,
        memoryLogDates: recentLogDates,
        currentBadge: normalizedCurrentBadge,
        earnedBadges: normalizedEarnedBadges,
      };

      const shouldPersistNormalizedData =
        !hadEarnedBadges ||
        normalizedData.currentStreak !== (parsedData.currentStreak || 0) ||
        normalizedData.longestStreak !== (parsedData.longestStreak || 0) ||
        normalizedData.currentBadge !== (parsedData.currentBadge || null) ||
        normalizedData.memoryLogDates.length !==
          (parsedData.memoryLogDates || []).length ||
        normalizedData.earnedBadges.length !==
          (parsedData.earnedBadges || []).length;

      if (shouldPersistNormalizedData) {
        await saveStreakData(normalizedData);
        // Reconciliation just happened (day rollover, retroactive badge unlock
        // after a new STREAK_BADGES tier shipped, missing earnedBadges, etc.).
        // Notify subscribers so already-mounted reward consumers (moment colors,
        // AI/exam limits, notifications) refresh — without this, normalization
        // would happen silently and listeners would stay on stale state until
        // their next mount or a fresh memory save. Safe vs recursion: any
        // listener that re-reads via getStreakData() will see normalized data
        // already persisted, so shouldPersistNormalizedData will be false on
        // the second pass and no further notify fires.
        notifyBadgeRewardsChanged();
      }

      return normalizedData;
    }
  } catch (error) {
    // Error reading streak data
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
    // Error saving streak data
  }
}

/**
 * Calculate consecutive days from the end of the log dates array.
 *
 * Lenient rule (grace period of one day):
 * - If today is logged → chain starts at today.
 * - Else if yesterday is logged → chain starts at yesterday. The user still has
 *   the rest of today to log a memory and grow the chain. They only lose the
 *   streak when the day after the last log has fully passed without a log
 *   (i.e. when neither today nor yesterday is in the log).
 * - Else → chain is broken, returns 0.
 */
export function calculateConsecutiveDays(memoryLogDates: string[]): number {
  if (!memoryLogDates || memoryLogDates.length === 0) {
    return 0;
  }

  // Sort dates in descending order (most recent first)
  const sortedDates = [...memoryLogDates].sort((a, b) => b.localeCompare(a));
  const datesSet = new Set(sortedDates);

  const today = getLocalDateString();
  const yesterday = getLocalDateString(subtractDays(new Date(), 1));

  let expectedDate: string;
  if (datesSet.has(today)) {
    expectedDate = today;
  } else if (datesSet.has(yesterday)) {
    // Grace period: today not yet logged but yesterday was — keep the streak alive.
    expectedDate = yesterday;
  } else {
    return 0;
  }

  let consecutiveDays = 0;
  for (const currentDate of sortedDates) {
    if (currentDate === expectedDate) {
      consecutiveDays++;
      const previousDate = subtractDays(parseLocalDateString(expectedDate), 1);
      expectedDate = getLocalDateString(previousDate);
    } else if (currentDate < expectedDate) {
      // Gap found - stop counting
      break;
    }
    // currentDate > expectedDate is unreachable given the start logic above
    // (we always start at the most recent valid anchor), but skip silently if it ever happens.
  }

  return consecutiveDays;
}

/**
 * Get dates from the last N days (including today)
 */
export function getRecentDays(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(getLocalDateString(date));
  }

  return dates;
}

/**
 * Filter memory log dates to only include the last N days
 */
export function filterRecentDays(memoryLogDates: string[], days: number): string[] {
  const recentDays = new Set(getRecentDays(days));
  return memoryLogDates.filter(date => recentDays.has(date));
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
 * Update streak when a new memory is created.
 * Active badge always reflects the current consecutive streak ending today.
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

  // Check if already logged today
  const alreadyLoggedToday = streakData.memoryLogDates?.includes(today);
  if (alreadyLoggedToday) {
    return {
      data: streakData,
      streakIncreased: false,
      newBadges: [],
      newMilestones: [],
      isFirstMemory: false,
    };
  }

  const isFirstMemory = !streakData.memoryLogDates || streakData.memoryLogDates.length === 0;
  const previousRecentLogDates = filterRecentDays(
    streakData.memoryLogDates || [],
    STREAK_LOG_LOOKBACK_DAYS,
  );
  const previousStreak = calculateConsecutiveDays(previousRecentLogDates);

  // Add today to memory log dates
  const updatedLogDates = [...(streakData.memoryLogDates || []), today];

  // Keep only recent dates to avoid unbounded growth while still allowing 14+ day streak tracking.
  const recentLogDates = filterRecentDays(updatedLogDates, STREAK_LOG_LOOKBACK_DAYS);

  // Calculate consecutive days from recent data
  const newStreak = calculateConsecutiveDays(recentLogDates);
  const streakIncreased = newStreak > previousStreak;

  // Determine current badge based on new streak
  const currentBadge = getBadgeForStreak(newStreak);
  const previousBadge = getBadgeForStreak(previousStreak);

  // Check if we earned a new badge
  const newBadges: StreakBadge[] = [];
  if (currentBadge && (!previousBadge || currentBadge.daysRequired > previousBadge.daysRequired)) {
    newBadges.push(currentBadge);
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
    streakStartDate: newStreak <= 1 ? today : (streakData.streakStartDate || today),
    totalDaysLogged: (streakData.totalDaysLogged || 0) + 1,
    memoryLogDates: recentLogDates,
    currentBadge: currentBadge?.id || null,
    milestones: newMilestonesArray,
    earnedBadges: newEarnedBadges,
  };

  await saveStreakData(newStreakData);
  // Streak just changed → notify reward consumers (moment colors, AI/exam limits, etc.) so they refresh immediately.
  notifyBadgeRewardsChanged();

  return {
    data: newStreakData,
    streakIncreased,
    newBadges,
    newMilestones: justReachedMilestones,
    isFirstMemory,
  };
}

/**
 * Recalculate streak based on recent stored logs
 * Call this when app opens to update badge if days have passed
 */
export async function recalculateStreak(): Promise<StreakData> {
  const streakData = await getStreakData();

  // Filter to only recent days
  const recentLogDates = filterRecentDays(
    streakData.memoryLogDates || [],
    STREAK_LOG_LOOKBACK_DAYS,
  );

  // Recalculate consecutive days
  const newStreak = calculateConsecutiveDays(recentLogDates);
  const currentBadge = getBadgeForStreak(newStreak);
  const previousEarnedBadges = streakData.earnedBadges || [];
  const updatedEarnedBadges = checkNewBadges(
    streakData.longestStreak || 0,
    previousEarnedBadges,
  );
  const shouldUpdateEarnedBadges =
    updatedEarnedBadges.length !== previousEarnedBadges.length;
  const shouldUpdateCurrentBadge =
    (currentBadge?.id || null) !== (streakData.currentBadge || null);

  // Update streak data if changed
  if (
    newStreak !== streakData.currentStreak ||
    recentLogDates.length !== streakData.memoryLogDates?.length ||
    shouldUpdateCurrentBadge ||
    shouldUpdateEarnedBadges
  ) {
    const updatedData: StreakData = {
      ...streakData,
      currentStreak: newStreak,
      memoryLogDates: recentLogDates,
      currentBadge: currentBadge?.id || null,
      earnedBadges: updatedEarnedBadges,
    };

    await saveStreakData(updatedData);
    // Day rolled over or pruning happened → reward state may have changed.
    notifyBadgeRewardsChanged();

    return updatedData;
  }

  return streakData;
}

/**
 * Check if streak is at risk (alive via grace, but today not yet logged).
 * Uses a fresh recompute so it stays correct even if stored `currentStreak`
 * has not been refreshed since midnight.
 */
export async function isStreakAtRisk(): Promise<boolean> {
  const today = getLocalDateString();
  const streakData = await getStreakData();
  const recentLogDates = filterRecentDays(
    streakData.memoryLogDates || [],
    STREAK_LOG_LOOKBACK_DAYS,
  );
  const liveStreak = calculateConsecutiveDays(recentLogDates);
  return liveStreak > 0 && !recentLogDates.includes(today);
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
