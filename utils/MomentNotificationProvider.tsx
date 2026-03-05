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
          const migrated = parsed.map((s) => {
            if (s.source === 'user') return { ...s, source: 'moments' as const };
            return s;
          });
          setSchedules(migrated);
        }
      } catch (_) {
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
      if (__DEV__) {
        const type = created[0]?.momentType;
        const sphere = created[0]?.sphere;
        console.log('[AI Summary] Stored locally (AsyncStorage):', {
          count: created.length,
          momentType: type,
          sphere,
          momentIds: created.map((s) => s.momentId),
        });
      }
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
      const created: MomentNotificationSchedule = {
        ...schedule,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      const next = [...schedules, created];
      await persistSchedules(next);
      return created;
    },
    [schedules, persistSchedules]
  );

  const updateSchedule = useCallback(
    async (schedule: MomentNotificationSchedule) => {
      const next = schedules.map((s) => (s.id === schedule.id ? { ...schedule } : s));
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

      if (__DEV__) {
        console.log('[AI Summary] Cache check (per sphere):', {
          sphere,
          momentType,
          totalSummaries: currentSummaries.length,
          summariesForSphereAndType: matchingSummaries.length,
          existingMomentIds: [...existingMomentIds],
        });
      }

      if (momentType === 'lesson') {
        const lessons: { id: string; text: string; memoryTitle?: string; sphere: LifeSphere }[] = [];
        for (const mem of memoriesInSphere) {
          for (const l of mem.lessonsLearned ?? []) {
            if (!l.text.trim() || existingMomentIds.has(l.id)) continue;
            lessons.push({ id: l.id, text: l.text, memoryTitle: mem.title, sphere: mem.sphere });
          }
        }
        if (lessons.length === 0) {
          if (__DEV__) {
            console.log('[AI Summary] Using local cache — all lesson summaries already exist for', sphere, '- no AI request');
          }
          return { generated: 0 };
        }
        if (__DEV__) {
          console.log('[AI Summary] Sending AI request for lesson summaries:', {
            sphere,
            momentType,
            language,
            count: lessons.length,
            lessons: lessons.map((l) => ({ id: l.id, text: l.text?.slice(0, 80) })),
          });
        }
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
          if (toAdd.length > 0) {
            await addSummariesBatch(toAdd);
            if (__DEV__) {
              console.log('[AI Summary] ensureSummariesForSphereAndType STORED (lessons):', {
                count: toAdd.length,
                summaries: toAdd.map((s) => ({ momentId: s.momentId, notificationMessage: s.notificationMessage })),
              });
            }
          }
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
      if (sunnyMoments.length === 0) {
        if (__DEV__) {
          console.log('[AI Summary] Using local cache — all sunny moment summaries already exist for', sphere, '- no AI request');
        }
        return { generated: 0 };
      }
      if (__DEV__) {
        console.log('[AI Summary] Sending AI request for sunny moment summaries:', {
          sphere,
          momentType,
          language,
          count: sunnyMoments.length,
          moments: sunnyMoments.map((m) => ({ id: m.id, text: m.text?.slice(0, 80) })),
        });
      }
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
        if (toAdd.length > 0) {
          await addSummariesBatch(toAdd);
          if (__DEV__) {
            console.log('[AI Summary] ensureSummariesForSphereAndType STORED (sunny):', {
              count: toAdd.length,
              summaries: toAdd.map((s) => ({ momentId: s.momentId, notificationMessage: s.notificationMessage })),
            });
          }
        }
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
          const migrated = parsed.map((s) => {
            if (s.source === 'user') return { ...s, source: 'moments' as const };
            return s;
          });
          schedulesToUse = migrated;
        }
        if (summariesRaw) summariesToUse = JSON.parse(summariesRaw) as MomentNotificationSummary[];
      } catch { /* fallback to state */ }

      const enabled = schedulesToUse.filter((s) => s.enabled);
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') return;
      const minSeconds = __DEV__ ? 60 : 3600;
      const aiEnabled = await isAIInsightsEnabled();
      const canUseAI = hasAIEntitlement && aiEnabled;
      for (const schedule of enabled) {
        const messages: string[] = [];
        const effectiveSource =
          (schedule.source === 'ai' || schedule.source === 'both') && !canUseAI ? 'moments' : schedule.source;
        if (effectiveSource === 'moments' || effectiveSource === 'both') {
          for (const mem of idealizedMemories) {
            if (mem.sphere !== schedule.sphere) continue;
            if (schedule.momentType === 'lesson') {
              for (const l of mem.lessonsLearned ?? []) {
                if (l.text?.trim()) messages.push(l.text.trim());
              }
            } else {
              for (const g of mem.goodFacts ?? []) {
                if (g.text?.trim()) messages.push(g.text.trim());
              }
            }
          }
        }
        if (effectiveSource === 'ai' || effectiveSource === 'both') {
          const list = summariesToUse.filter(
            (s) => s.sphere === schedule.sphere && s.momentType === schedule.momentType
          );
          messages.push(...list.map((s) => s.notificationMessage));
        }
        const fallback = 'A little nudge from your journey.';
        const seconds = __DEV__
          ? 60 * Math.max(1, schedule.frequencyHours)
          : Math.max(minSeconds, 3600 * schedule.frequencyHours);

        // Pick random body for each notification to avoid sending the same nudge twice.
        // When 2+ messages exist, exclude the previous pick to avoid back-to-back repeats.
        const pickRandom = (exclude?: string) => {
          if (messages.length === 0) return fallback;
          const pool = exclude && messages.length > 1 ? messages.filter((m) => m !== exclude) : [...messages];
          return pool[Math.floor(Math.random() * pool.length)];
        };

        let prevBody: string | undefined;
        for (let i = 0; i < NOTIFICATIONS_PER_SCHEDULE; i++) {
          const body = pickRandom(prevBody);
          prevBody = body;
          const triggerDate = new Date(Date.now() + (i + 1) * seconds * 1000);
          await Notifications.scheduleNotificationAsync({
            identifier: `${MOMENT_NUDGE_PREFIX}${schedule.id}_${i}`,
            content: {
              title: 'Sferas',
              body,
              data: { type: 'moment_nudge', scheduleId: schedule.id },
              sound: true,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: triggerDate,
            },
          });
        }
      }
    } catch (_) {
      // ignore
    }
  }, [schedules, summaries, idealizedMemories, hasAIEntitlement]);

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
