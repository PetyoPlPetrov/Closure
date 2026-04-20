import type { LifeSphere } from './JourneyProvider';

export type MomentType = 'lesson' | 'sunny';

export interface MomentNotificationSummary {
  id: string;
  momentId: string;
  memoryId: string;
  entityId: string;
  sphere: LifeSphere;
  momentType: MomentType;
  momentText: string;
  notificationMessage: string;
  source: 'ai_suggested' | 'ai_batch';
  createdAt: string;
}

export interface MomentNotificationSchedule {
  id: string;
  sphere: LifeSphere;
  momentType: MomentType;
  frequencyHours: number;
  frequencyMode?: 'interval' | 'specific_times';
  activeStartTime?: string; // HH:mm
  activeEndTime?: string; // HH:mm
  specificTimes?: string[]; // HH:mm list
  source: 'moments' | 'ai'; // 'moments' = raw from memories, 'ai' = AI summaries
  freeAiGranted?: boolean; // True when schedule uses the 1/day free AI slot for non-entitled users
  userMessages: string[]; // Deprecated for 'moments'; kept for migration
  soundEnabled?: boolean;
  enabled: boolean;
  createdAt: string;
}
