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
  currentStreak: number;           // Current consecutive days ending today
  longestStreak: number;           // All-time record
  lastLoggedDate: string;          // ISO date string (YYYY-MM-DD)
  streakStartDate: string;         // When current streak began
  totalDaysLogged: number;         // Lifetime stat
  memoryLogDates: string[];        // Array of dates when memories were created (YYYY-MM-DD)
  currentBadge: string | null;     // Currently active badge ID based on current streak
  milestones: number[];            // Array of achieved milestones [3, 7, 14...]
  earnedBadges: string[];          // Array of badge IDs that have been earned (based on longestStreak)
}

export const STREAK_BADGES: StreakBadge[] = [
  {
    id: 'ignite',
    name: 'Ignite',
    emoji: '🔥',
    daysRequired: 1,
    colorGradient: ['#E3F2FD', '#90CAF9'],
    description: 'Your first spark in the cosmos',
    rarity: 'common',
  },
  {
    id: 'pulse',
    name: 'Pulse',
    emoji: '💓',
    daysRequired: 3,
    colorGradient: ['#FFEBEE', '#EF5350'],
    description: 'Your rhythm is steady and alive',
    rarity: 'common',
  },
  {
    id: 'nova',
    name: 'Nova',
    emoji: '🌟',
    daysRequired: 7,
    colorGradient: ['#FFF3E0', '#FFB74D'],
    description: 'A full week of radiant momentum',
    rarity: 'rare',
  },
  {
    id: 'sferas',
    name: 'Sferas',
    emoji: '🏆',
    daysRequired: 14,
    colorGradient: ['#F3E5F5', '#BA68C8'],
    description: 'Access 5 free AI requests and special Sferas events access',
    rarity: 'legendary',
  },
];

export const STREAK_MILESTONES = [1, 3, 7, 14];

export const STORAGE_KEY = '@sferas:streak_data';
