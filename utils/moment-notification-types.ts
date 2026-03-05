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
  source: 'moments' | 'ai' | 'both'; // 'moments' = raw from memories, 'ai' = AI summaries, 'both' = both combined
  userMessages: string[]; // Deprecated for 'moments'; kept for migration
  enabled: boolean;
  createdAt: string;
}
