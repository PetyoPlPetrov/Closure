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
  source: 'moments' | 'ai'; // 'moments' = raw lesson/sunny text from memories, 'ai' = AI nudge summaries
  userMessages: string[]; // Deprecated for 'moments'; kept for migration
  enabled: boolean;
  createdAt: string;
}
