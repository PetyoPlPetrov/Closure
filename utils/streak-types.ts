/**
 * Streak Feature - Type Definitions
 */

export interface StreakBadge {
  id: string;
  name: string;
  emoji: string;
  daysRequired: number;
  colorGradient: [string, string];
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface StreakData {
  currentStreak: number;           // Current consecutive days in rolling 7-day window
  longestStreak: number;           // All-time record
  lastLoggedDate: string;          // ISO date string (YYYY-MM-DD)
  streakStartDate: string;         // When current streak began
  totalDaysLogged: number;         // Lifetime stat
  memoryLogDates: string[];        // Array of dates when memories were created (YYYY-MM-DD)
  currentBadge: string | null;     // Currently active badge ID based on rolling window
  milestones: number[];            // Array of achieved milestones [3, 7, 14...]
  earnedBadges: string[];          // Array of badge IDs that have been earned (based on longestStreak)
}

export const STREAK_BADGES: StreakBadge[] = [
  {
    id: 'spark',
    name: 'Spark',
    emoji: '✨',
    daysRequired: 1,
    colorGradient: ['#E3F2FD', '#90CAF9'],
    description: 'First step on your journey',
    rarity: 'common',
  },
  {
    id: 'flame',
    name: 'Flame',
    emoji: '🔥',
    daysRequired: 3,
    colorGradient: ['#FFEBEE', '#EF5350'],
    description: '3 days of consistent growth',
    rarity: 'common',
  },
  {
    id: 'keeper',
    name: 'Keeper',
    emoji: '🌟',
    daysRequired: 7,
    colorGradient: ['#FFF3E0', '#FFB74D'],
    description: '1 week of dedication',
    rarity: 'rare',
  },
  {
    id: 'champion',
    name: 'Champion',
    emoji: '🏆',
    daysRequired: 14,
    colorGradient: ['#F3E5F5', '#BA68C8'],
    description: '2 weeks strong',
    rarity: 'rare',
  },
  {
    id: 'warrior',
    name: 'Warrior',
    emoji: '⚔️',
    daysRequired: 30,
    colorGradient: ['#E8F5E9', '#66BB6A'],
    description: '1 month of commitment',
    rarity: 'epic',
  },
  {
    id: 'legend',
    name: 'Legend',
    emoji: '👑',
    daysRequired: 60,
    colorGradient: ['#FFF9C4', '#FFD700'],
    description: '2 months of mastery',
    rarity: 'epic',
  },
  {
    id: 'titan',
    name: 'Titan',
    emoji: '💎',
    daysRequired: 100,
    colorGradient: ['#E1F5FE', '#00BCD4'],
    description: '100-day milestone',
    rarity: 'legendary',
  },
  {
    id: 'immortal',
    name: 'Immortal',
    emoji: '🌌',
    daysRequired: 365,
    colorGradient: ['#F3E5F5', '#9C27B0'],
    description: '1 year champion',
    rarity: 'legendary',
  },
];

export const STREAK_MILESTONES = [1, 3, 7, 14, 30, 60, 100, 365];

export const STORAGE_KEY = '@sferas:streak_data';
