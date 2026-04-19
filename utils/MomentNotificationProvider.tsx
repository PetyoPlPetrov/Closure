import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { AppState, type AppStateStatus } from 'react-native';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  suggestNotificationMessagesForLessons,
  suggestNotificationMessagesForSunnyMoments,
} from './ai-service';
import { isAIInsightsEnabled } from './ai-insights-consent';
import type { LifeSphere } from './JourneyProvider';
import { useJourney } from './JourneyProvider';
import { useSubscription } from './SubscriptionProvider';
import type {
  MomentNotificationSchedule,
  MomentNotificationSummary,
  MomentType,
} from './moment-notification-types';

const MOMENT_NUDGE_PREFIX = 'moment_nudge_';
/** Max one-time notifications per schedule (iOS allows ~64 total; we may have multiple schedules) */
const NOTIFICATIONS_PER_SCHEDULE = 20;
const DEFAULT_ACTIVE_START_TIME = '10:00';
const DEFAULT_ACTIVE_END_TIME = '19:00';

const STORAGE_KEY_SUMMARIES = '@sferas:moment_notification_summaries';
const STORAGE_KEY_SCHEDULES = '@sferas:moment_notification_schedules';

type MomentNotificationContextValue = {
  summaries: MomentNotificationSummary[];
  schedules: MomentNotificationSchedule[];
  isLoaded: boolean;
  addSummary: (summary: Omit<MomentNotificationSummary, 'id' | 'createdAt'>) => Promise<MomentNotificationSummary>;
  addSummariesBatch: (summaries: Omit<MomentNotificationSummary, 'id' | 'createdAt'>[]) => Promise<MomentNotificationSummary[]>;
  getSummariesBySphereAndType: (sphere: LifeSphere, momentType: MomentType) => MomentNotificationSummary[];
  deleteSummary: (id: string) => Promise<void>;
  deleteSummariesByMemoryId: (memoryId: string) => Promise<void>;
  addSchedule: (schedule: Omit<MomentNotificationSchedule, 'id' | 'createdAt'>) => Promise<MomentNotificationSchedule>;
  updateSchedule: (schedule: MomentNotificationSchedule) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  getSchedules: () => MomentNotificationSchedule[];
  generateBatchSuggestionsForManualLessons: (language: 'en' | 'bg') => Promise<{ generated: number; error?: string }>;
  ensureSummariesForSphereAndType: (
    sphere: LifeSphere,
    momentType: MomentType,
    language: 'en' | 'bg'
  ) => Promise<{ generated: number; error?: string }>;
  refreshMomentNudgeSchedules: () => Promise<void>;
};

const MomentNotificationContext = createContext<MomentNotificationContextValue | undefined>(undefined);

function generateId(): string {
  return `mn_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function parseTimeToMinutes(time: string, fallbackMinutes: number): number {
  const [hourRaw, minuteRaw] = time.split(':');
  const hours = Number.parseInt(hourRaw ?? '', 10);
  const minutes = Number.parseInt(minuteRaw ?? '', 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return fallbackMinutes;
  const boundedHours = Math.max(0, Math.min(23, hours));
  const boundedMinutes = Math.max(0, Math.min(59, minutes));
  return boundedHours * 60 + boundedMinutes;
}

function formatMinutesToTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60).toString().padStart(2, '0');
  const minutes = (normalized % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function normalizeSchedule(
  schedule: MomentNotificationSchedule
): MomentNotificationSchedule {
  const migratedSource = schedule.source === 'user' ? 'moments' : schedule.source;
  const frequencyMode = schedule.frequencyMode === 'specific_times' ? 'specific_times' : 'interval';
  const activeStart = schedule.activeStartTime ?? DEFAULT_ACTIVE_START_TIME;
  const activeEnd = schedule.activeEndTime ?? DEFAULT_ACTIVE_END_TIME;
  const uniqueSpecificTimes = Array.from(
    new Set((schedule.specificTimes ?? []).map((time) => formatMinutesToTime(parseTimeToMinutes(time, 600))))
  );
  uniqueSpecificTimes.sort((a, b) => parseTimeToMinutes(a, 0) - parseTimeToMinutes(b, 0));
  return {
    ...schedule,
    source: migratedSource,
    frequencyMode,
    activeStartTime: formatMinutesToTime(parseTimeToMinutes(activeStart, 600)),
    activeEndTime: formatMinutesToTime(parseTimeToMinutes(activeEnd, 1140)),
    specificTimes: uniqueSpecificTimes,
    soundEnabled: schedule.soundEnabled !== false,
  };
}

function generateIntervalTriggerDates(
  schedule: MomentNotificationSchedule,
  now: Date,
  count: number
): Date[] {
  const startMinutes = parseTimeToMinutes(schedule.activeStartTime ?? DEFAULT_ACTIVE_START_TIME, 600);
  const endMinutes = parseTimeToMinutes(schedule.activeEndTime ?? DEFAULT_ACTIVE_END_TIME, 1140);
  const stepMinutes = Math.max(1, (schedule.frequencyHours || 1) * (__DEV__ ? 1 : 60));
  const dates: Date[] = [];
  const cursor = new Date(now);
  cursor.setSeconds(0, 0);

  for (let dayOffset = 0; dayOffset < 120 && dates.length < count; dayOffset++) {
    const day = new Date(cursor);
    day.setDate(cursor.getDate() + dayOffset);

    const start = new Date(day);
    start.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
    const end = new Date(day);
    end.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);

    if (end < start) {
      end.setDate(end.getDate() + 1);
    }

    const slots: Date[] = [];
    for (
      const slot = new Date(start);
      slot <= end;
      slot.setMinutes(slot.getMinutes() + stepMinutes)
    ) {
      slots.push(new Date(slot));
      if (slots.length > 64) break;
    }

    // If interval is longer than the active window, still schedule one nudge at start.
    if (slots.length === 0) {
      slots.push(start);
    }

    for (const slot of slots) {
      if (slot > now) dates.push(slot);
      if (dates.length >= count) break;
    }
  }

  return dates;
}

function generateSpecificTimeTriggerDates(
  schedule: MomentNotificationSchedule,
  now: Date,
  count: number
): Date[] {
  const specificTimes = (schedule.specificTimes ?? [])
    .map((time) => formatMinutesToTime(parseTimeToMinutes(time, 600)))
    .sort((a, b) => parseTimeToMinutes(a, 0) - parseTimeToMinutes(b, 0));
  if (specificTimes.length === 0) return [];

  const dates: Date[] = [];
  const cursor = new Date(now);
  cursor.setSeconds(0, 0);

  for (let dayOffset = 0; dayOffset < 120 && dates.length < count; dayOffset++) {
    const day = new Date(cursor);
    day.setDate(cursor.getDate() + dayOffset);
    for (const time of specificTimes) {
      const minutes = parseTimeToMinutes(time, 600);
      const slot = new Date(day);
      slot.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      if (slot > now) dates.push(slot);
      if (dates.length >= count) break;
    }
  }

  return dates;
}

export function MomentNotificationProvider({ children }: { children: React.ReactNode }) {
  const [summaries, setSummaries] = useState<MomentNotificationSummary[]>([]);
  const [schedules, setSchedules] = useState<MomentNotificationSchedule[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { idealizedMemories } = useJourney();
  const { hasAIEntitlement } = useSubscription();

  useEffect(() => {
    const load = async () => {
      try {
        const [summariesRaw, schedulesRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_SUMMARIES),
          AsyncStorage.getItem(STORAGE_KEY_SCHEDULES),
        ]);
        if (summariesRaw) {
          setSummaries(JSON.parse(summariesRaw));
        }
        if (schedulesRaw) {
          const parsed = JSON.parse(schedulesRaw) as MomentNotificationSchedule[];
          const migrated = parsed.map(normalizeSchedule);
          setSchedules(migrated);
        }
      } catch {
        // ignore
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, []);

  const persistSummaries = useCallback(async (next: MomentNotificationSummary[]) => {
    setSummaries(next);
    await AsyncStorage.setItem(STORAGE_KEY_SUMMARIES, JSON.stringify(next));
  }, []);

  const persistSchedules = useCallback(async (next: MomentNotificationSchedule[]) => {
    setSchedules(next);
    await AsyncStorage.setItem(STORAGE_KEY_SCHEDULES, JSON.stringify(next));
  }, []);

  const addSummary = useCallback(
    async (summary: Omit<MomentNotificationSummary, 'id' | 'createdAt'>): Promise<MomentNotificationSummary> => {
      const created: MomentNotificationSummary = {
        ...summary,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      let current: MomentNotificationSummary[] = summaries;
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY_SUMMARIES);
        if (raw) current = JSON.parse(raw);
      } catch { /* use state */ }
      const next = [...current, created];
      setSummaries(next);
      await AsyncStorage.setItem(STORAGE_KEY_SUMMARIES, JSON.stringify(next));
      return created;
    },
    [summaries]
  );

  const addSummariesBatch = useCallback(
    async (items: Omit<MomentNotificationSummary, 'id' | 'createdAt'>[]): Promise<MomentNotificationSummary[]> => {
      if (items.length === 0) return [];
      const created = items.map((s) => ({
        ...s,
        id: generateId(),
        createdAt: new Date().toISOString(),
      }));
      // Read latest from AsyncStorage before appending (summaries state can be stale)
      let current: MomentNotificationSummary[] = summaries;
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY_SUMMARIES);
        if (raw) current = JSON.parse(raw);
      } catch { /* use state */ }
      const next = [...current, ...created];
      setSummaries(next);
      await AsyncStorage.setItem(STORAGE_KEY_SUMMARIES, JSON.stringify(next));
      return created;
    },
    [summaries]
  );

  const getSummariesBySphereAndType = useCallback(
    (sphere: LifeSphere, momentType: MomentType): MomentNotificationSummary[] => {
      return summaries.filter((s) => s.sphere === sphere && s.momentType === momentType);
    },
    [summaries]
  );

  const deleteSummary = useCallback(
    async (id: string) => {
      const next = summaries.filter((s) => s.id !== id);
      await persistSummaries(next);
    },
    [summaries, persistSummaries]
  );

  const deleteSummariesByMemoryId = useCallback(
    async (memoryId: string) => {
      const next = summaries.filter((s) => s.memoryId !== memoryId);
      if (next.length !== summaries.length) {
        await persistSummaries(next);
      }
    },
    [summaries, persistSummaries]
  );

  const addSchedule = useCallback(
    async (schedule: Omit<MomentNotificationSchedule, 'id' | 'createdAt'>): Promise<MomentNotificationSchedule> => {
      const created = normalizeSchedule({
        ...schedule,
        id: generateId(),
        createdAt: new Date().toISOString(),
      });
      const next = [...schedules, created];
      await persistSchedules(next);
      return created;
    },
    [schedules, persistSchedules]
  );

  const updateSchedule = useCallback(
    async (schedule: MomentNotificationSchedule) => {
      const normalized = normalizeSchedule(schedule);
      const next = schedules.map((s) => (s.id === schedule.id ? normalized : s));
      await persistSchedules(next);
    },
    [schedules, persistSchedules]
  );

  const deleteSchedule = useCallback(
    async (id: string) => {
      const next = schedules.filter((s) => s.id !== id);
      await persistSchedules(next);
    },
    [schedules, persistSchedules]
  );

  const getSchedules = useCallback(() => schedules, [schedules]);

  const generateBatchSuggestionsForManualLessons = useCallback(
    async (language: 'en' | 'bg'): Promise<{ generated: number; error?: string }> => {
      const existingMomentIds = new Set(summaries.map((s) => s.momentId));
      const manualMemories = idealizedMemories.filter((m) => m.source === 'manual');
      const lessons: { id: string; text: string; memoryTitle?: string; sphere: LifeSphere }[] = [];
      for (const mem of manualMemories) {
        const list = mem.lessonsLearned ?? [];
        for (const lesson of list) {
          if (!lesson.text.trim() || existingMomentIds.has(lesson.id)) continue;
          lessons.push({
            id: lesson.id,
            text: lesson.text,
            memoryTitle: mem.title,
            sphere: mem.sphere,
          });
        }
      }
      if (lessons.length === 0) {
        return { generated: 0 };
      }
      const aiEnabled = await isAIInsightsEnabled();
      if (!aiEnabled) return { generated: 0 };
      try {
        const map = await suggestNotificationMessagesForLessons(lessons, language);
        const toAdd: Omit<MomentNotificationSummary, 'id' | 'createdAt'>[] = [];
        for (const lesson of lessons) {
          const msg = map[lesson.id];
          if (!msg?.trim()) continue;
          const mem = manualMemories.find((m) => (m.lessonsLearned ?? []).some((l) => l.id === lesson.id));
          if (!mem) continue;
          toAdd.push({
            momentId: lesson.id,
            memoryId: mem.id,
            entityId: mem.entityId,
            sphere: mem.sphere,
            momentType: 'lesson',
            momentText: lesson.text,
            notificationMessage: msg.trim(),
            source: 'ai_batch',
          });
        }
        if (toAdd.length > 0) {
          await addSummariesBatch(toAdd);
        }
        return { generated: toAdd.length };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate suggestions';
        return { generated: 0, error: message };
      }
    },
    [idealizedMemories, summaries, addSummariesBatch]
  );

  const ensureSummariesForSphereAndType = useCallback(
    async (
      sphere: LifeSphere,
      momentType: MomentType,
      language: 'en' | 'bg'
    ): Promise<{ generated: number; error?: string }> => {
      let currentSummaries: MomentNotificationSummary[] = summaries;
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY_SUMMARIES);
        if (raw) {
          const fromStorage = JSON.parse(raw) as MomentNotificationSummary[] | null;
          const fromState = summaries;
          // Use whichever has more (handles: storage empty but state has recent adds, or vice versa)
          if (Array.isArray(fromStorage) && fromStorage.length >= (fromState?.length ?? 0)) {
            currentSummaries = fromStorage;
          } else if (Array.isArray(fromState) && fromState.length > 0) {
            currentSummaries = fromState;
          } else if (Array.isArray(fromStorage)) {
            currentSummaries = fromStorage;
          }
        }
      } catch { /* use state fallback */ }
      const matchingSummaries = currentSummaries.filter(
        (s) => s.sphere === sphere && s.momentType === momentType
      );
      const existingMomentIds = new Set(matchingSummaries.map((s) => s.momentId));
      const memoriesInSphere = idealizedMemories.filter((m) => m.sphere === sphere);

      if (momentType === 'lesson') {
        const lessons: { id: string; text: string; memoryTitle?: string; sphere: LifeSphere }[] = [];
        for (const mem of memoriesInSphere) {
          for (const l of mem.lessonsLearned ?? []) {
            if (!l.text.trim() || existingMomentIds.has(l.id)) continue;
            lessons.push({ id: l.id, text: l.text, memoryTitle: mem.title, sphere: mem.sphere });
          }
        }
        if (lessons.length === 0) return { generated: 0 };
        const aiEnabled = await isAIInsightsEnabled();
        if (!aiEnabled) return { generated: 0 };
        try {
          const map = await suggestNotificationMessagesForLessons(lessons, language);
          const toAdd: Omit<MomentNotificationSummary, 'id' | 'createdAt'>[] = [];
          for (const lesson of lessons) {
            const msg = map[lesson.id];
            if (!msg?.trim()) continue;
            const mem = memoriesInSphere.find((m) => (m.lessonsLearned ?? []).some((l) => l.id === lesson.id));
            if (!mem) continue;
            toAdd.push({
              momentId: lesson.id,
              memoryId: mem.id,
              entityId: mem.entityId,
              sphere: mem.sphere,
              momentType: 'lesson',
              momentText: lesson.text,
              notificationMessage: msg.trim(),
              source: 'ai_batch',
            });
          }
          if (toAdd.length > 0) await addSummariesBatch(toAdd);
          return { generated: toAdd.length };
        } catch (err) {
          return { generated: 0, error: err instanceof Error ? err.message : 'Failed to generate' };
        }
      }

      // momentType === 'sunny'
      const sunnyMoments: { id: string; text: string; memoryTitle?: string; sphere: LifeSphere }[] = [];
      for (const mem of memoriesInSphere) {
        for (const g of mem.goodFacts ?? []) {
          if (!g.text.trim() || existingMomentIds.has(g.id)) continue;
          sunnyMoments.push({ id: g.id, text: g.text, memoryTitle: mem.title, sphere: mem.sphere });
        }
      }
      if (sunnyMoments.length === 0) return { generated: 0 };
      const aiEnabledForSunny = await isAIInsightsEnabled();
      if (!aiEnabledForSunny) return { generated: 0 };
      try {
        const map = await suggestNotificationMessagesForSunnyMoments(sunnyMoments, language);
        const toAdd: Omit<MomentNotificationSummary, 'id' | 'createdAt'>[] = [];
        for (const m of sunnyMoments) {
          const msg = map[m.id];
          if (!msg?.trim()) continue;
          const mem = memoriesInSphere.find((mem) => (mem.goodFacts ?? []).some((g) => g.id === m.id));
          if (!mem) continue;
          toAdd.push({
            momentId: m.id,
            memoryId: mem.id,
            entityId: mem.entityId,
            sphere: mem.sphere,
            momentType: 'sunny',
            momentText: m.text,
            notificationMessage: msg.trim(),
            source: 'ai_batch',
          });
        }
        if (toAdd.length > 0) await addSummariesBatch(toAdd);
        return { generated: toAdd.length };
      } catch (err) {
        return { generated: 0, error: err instanceof Error ? err.message : 'Failed to generate' };
      }
    },
    [idealizedMemories, summaries, addSummariesBatch]
  );

  const refreshMomentNudgeSchedules = useCallback(async () => {
    try {
      const all = await Notifications.getAllScheduledNotificationsAsync();
      for (const req of all) {
        if (req.identifier.startsWith(MOMENT_NUDGE_PREFIX)) {
          await Notifications.cancelScheduledNotificationAsync(req.identifier);
        }
      }
      // Read fresh from AsyncStorage so we use the latest data after add/update/delete
      // (React state may not have updated yet when called from handleSave)
      let schedulesToUse = schedules;
      let summariesToUse = summaries;
      try {
        const [schedulesRaw, summariesRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_SCHEDULES),
          AsyncStorage.getItem(STORAGE_KEY_SUMMARIES),
        ]);
        if (schedulesRaw) {
          const parsed = JSON.parse(schedulesRaw) as MomentNotificationSchedule[];
          const migrated = parsed.map(normalizeSchedule);
          schedulesToUse = migrated;
        }
        if (summariesRaw) summariesToUse = JSON.parse(summariesRaw) as MomentNotificationSummary[];
      } catch { /* fallback to state */ }

      const enabled = schedulesToUse.filter((s) => s.enabled);
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') return;
      const aiEnabled = await isAIInsightsEnabled();
      const canUseAI = hasAIEntitlement && aiEnabled;
      for (const schedule of enabled) {
        const candidates: Array<{
          body: string;
          memoryId: string;
          entityId: string;
          sphere: LifeSphere;
          momentType: MomentType;
          momentId: string;
          momentText: string;
        }> = [];
        const effectiveSource =
          (schedule.source === 'ai' || schedule.source === 'both') && !canUseAI ? 'moments' : schedule.source;
        if (effectiveSource === 'moments' || effectiveSource === 'both') {
          for (const mem of idealizedMemories) {
            if (mem.sphere !== schedule.sphere) continue;
            if (schedule.momentType === 'lesson') {
              for (const l of mem.lessonsLearned ?? []) {
                const text = l.text?.trim();
                if (!text) continue;
                candidates.push({
                  body: text,
                  memoryId: mem.id,
                  entityId: mem.entityId,
                  sphere: mem.sphere,
                  momentType: 'lesson',
                  momentId: l.id,
                  momentText: text,
                });
              }
            } else {
              for (const g of mem.goodFacts ?? []) {
                const text = g.text?.trim();
                if (!text) continue;
                candidates.push({
                  body: text,
                  memoryId: mem.id,
                  entityId: mem.entityId,
                  sphere: mem.sphere,
                  momentType: 'sunny',
                  momentId: g.id,
                  momentText: text,
                });
              }
            }
          }
        }
        if (effectiveSource === 'ai' || effectiveSource === 'both') {
          const list = summariesToUse.filter(
            (s) => s.sphere === schedule.sphere && s.momentType === schedule.momentType
          );
          for (const summary of list) {
            const body = summary.notificationMessage?.trim();
            if (!body) continue;
            candidates.push({
              body,
              memoryId: summary.memoryId,
              entityId: summary.entityId,
              sphere: summary.sphere,
              momentType: summary.momentType,
              momentId: summary.momentId,
              momentText: summary.momentText,
            });
          }
        }
        if (candidates.length === 0) {
          // Auto-disable the schedule so the user can re-enable it once moments are available again.
          const disabledList = schedulesToUse.map((s) => s.id === schedule.id ? { ...s, enabled: false } : s);
          schedulesToUse = disabledList;
          await persistSchedules(disabledList);
          continue;
        }
        const triggerDates =
          schedule.frequencyMode === 'specific_times'
            ? generateSpecificTimeTriggerDates(schedule, new Date(), NOTIFICATIONS_PER_SCHEDULE)
            : generateIntervalTriggerDates(schedule, new Date(), NOTIFICATIONS_PER_SCHEDULE);
        if (triggerDates.length === 0) {
          continue;
        }

        // Pick random body for each notification to avoid sending the same nudge twice.
        // When 2+ messages exist, exclude the previous pick to avoid back-to-back repeats.
        const pickRandom = (excludeMomentId?: string) => {
          const pool = excludeMomentId && candidates.length > 1
            ? candidates.filter((candidate) => candidate.momentId !== excludeMomentId)
            : [...candidates];
          return pool[Math.floor(Math.random() * pool.length)];
        };

        let previousMomentId: string | undefined;
        for (let i = 0; i < triggerDates.length; i++) {
          const candidate = pickRandom(previousMomentId);
          previousMomentId = candidate.momentId;
          const triggerDate = triggerDates[i];
          await Notifications.scheduleNotificationAsync({
            identifier: `${MOMENT_NUDGE_PREFIX}${schedule.id}_${i}`,
            content: {
              title: 'Sferas',
              body: candidate.body,
              data: {
                type: 'moment_nudge',
                scheduleId: schedule.id,
                momentType: candidate.momentType,
                momentId: candidate.momentId,
                momentText: candidate.momentText,
                memoryId: candidate.memoryId,
                entityId: candidate.entityId,
                sphere: candidate.sphere,
              },
              sound: schedule.soundEnabled === false ? undefined : 'default',
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: triggerDate,
            },
          });
        }
      }
    } catch {
      // ignore
    }
  }, [schedules, summaries, idealizedMemories, hasAIEntitlement, persistSchedules]);

  useEffect(() => {
    if (!isLoaded) return;
    void refreshMomentNudgeSchedules();
  }, [isLoaded, schedules, summaries, refreshMomentNudgeSchedules]);

  // Replenish queue when app comes to foreground (existing ones may have fired)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && isLoaded && schedules.some((s) => s.enabled)) {
        void refreshMomentNudgeSchedules();
      }
    });
    return () => sub.remove();
  }, [isLoaded, schedules, refreshMomentNudgeSchedules]);

  // Cascade: when memories are deleted (e.g. entity delete), remove orphaned summaries
  useEffect(() => {
    const validMemoryIds = new Set(idealizedMemories.map((m) => m.id));
    const orphaned = summaries.filter((s) => !validMemoryIds.has(s.memoryId));
    if (orphaned.length > 0) {
      const next = summaries.filter((s) => validMemoryIds.has(s.memoryId));
      void persistSummaries(next);
    }
  }, [idealizedMemories, summaries, persistSummaries]);

  const value = useMemo<MomentNotificationContextValue>(
    () => ({
      summaries,
      schedules,
      isLoaded,
      addSummary,
      addSummariesBatch,
      getSummariesBySphereAndType,
      deleteSummary,
      deleteSummariesByMemoryId,
      addSchedule,
      updateSchedule,
      deleteSchedule,
      getSchedules,
      generateBatchSuggestionsForManualLessons,
      ensureSummariesForSphereAndType,
      refreshMomentNudgeSchedules,
    }),
    [
      summaries,
      schedules,
      isLoaded,
      addSummary,
      addSummariesBatch,
      getSummariesBySphereAndType,
      deleteSummary,
      deleteSummariesByMemoryId,
      addSchedule,
      updateSchedule,
      deleteSchedule,
      getSchedules,
      generateBatchSuggestionsForManualLessons,
      ensureSummariesForSphereAndType,
      refreshMomentNudgeSchedules,
    ]
  );

  return (
    <MomentNotificationContext.Provider value={value}>
      {children}
    </MomentNotificationContext.Provider>
  );
}

export function useMomentNotifications() {
  const ctx = useContext(MomentNotificationContext);
  if (ctx === undefined) {
    throw new Error('useMomentNotifications must be used within MomentNotificationProvider');
  }
  return ctx;
}
