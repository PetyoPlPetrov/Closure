import { calculateConsecutiveDays, filterRecentDays, getStreakData } from "@/utils/streak-manager";

const STREAK_LOG_LOOKBACK_DAYS = 30;

export const FREE_ENTITY_LIMIT_DEFAULT = 2;
export const FREE_ENTITY_LIMIT_WITH_NOVA = 5;

export const FREE_AI_DAILY_LIMIT_DEFAULT = 3;
export const FREE_AI_DAILY_LIMIT_WITH_SFERAS = 5;

export const FREE_EXAM_DAILY_LIMIT_DEFAULT = 3;
export const FREE_EXAM_DAILY_LIMIT_WITH_SFERAS = 5;

const DAYS_FOR_PULSE = 3;
const DAYS_FOR_NOVA = 7;
const DAYS_FOR_SFERAS = 14;

async function getEffectiveCurrentStreak(): Promise<number> {
  const streakData = await getStreakData();
  const recentLogDates = filterRecentDays(
    streakData.memoryLogDates || [],
    STREAK_LOG_LOOKBACK_DAYS,
  );
  return calculateConsecutiveDays(recentLogDates);
}

export async function hasPulseBadgeActive(): Promise<boolean> {
  return (await getEffectiveCurrentStreak()) >= DAYS_FOR_PULSE;
}

export async function hasNovaBadgeActive(): Promise<boolean> {
  return (await getEffectiveCurrentStreak()) >= DAYS_FOR_NOVA;
}

export async function hasSferasBadgeActive(): Promise<boolean> {
  return (await getEffectiveCurrentStreak()) >= DAYS_FOR_SFERAS;
}

export async function canUseMomentColorEditingWithoutSubscription(): Promise<boolean> {
  return hasPulseBadgeActive();
}

export async function getFreeEntityLimitPerSfera(): Promise<number> {
  return (await hasNovaBadgeActive())
    ? FREE_ENTITY_LIMIT_WITH_NOVA
    : FREE_ENTITY_LIMIT_DEFAULT;
}

export async function getFreeAIDailyLimit(): Promise<number> {
  return (await hasSferasBadgeActive())
    ? FREE_AI_DAILY_LIMIT_WITH_SFERAS
    : FREE_AI_DAILY_LIMIT_DEFAULT;
}

export async function getFreeExamDailyLimit(): Promise<number> {
  return (await hasSferasBadgeActive())
    ? FREE_EXAM_DAILY_LIMIT_WITH_SFERAS
    : FREE_EXAM_DAILY_LIMIT_DEFAULT;
}
