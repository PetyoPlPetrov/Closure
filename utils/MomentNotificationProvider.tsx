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

function formatMomentNudgeNotification(
  momentType: MomentType,
  message: string
): { title: string; body: string } {
  const label = momentType === 'lesson' ? 'Lesson' : 'Sunny moment';
  return {
    title: `Sferas - ${label}`,
    body: `${label}: ${message}`,
  };
}

function normalizeSchedule(
  schedule: MomentNotificationSchedule
): MomentNotificationSchedule {
  const rawSource = (schedule as { source?: string }).source;
  const migratedSource: MomentNotificationSchedule['source'] =
    rawSource === 'moments' || rawSource === 'user' ? 'moments' : 'ai';
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
      // Dedupe by (memoryId, momentId, momentType): the new entries replace any
      // existing rows with the same key. This collapses legacy duplicates and
      // prevents accumulation on repeated refreshes.
      const incomingKeys = new Set(
        created.map((s) => `${s.memoryId}::${s.momentType}::${s.momentId}`)
      );
      const deduped = current.filter(
        (s) => !incomingKeys.has(`${s.memoryId}::${s.momentType}::${s.momentId}`)
      );
      const removed = current.length - deduped.length;
      if (__DEV__ && removed > 0) {
        console.log(
          `[MomentNotificationProvider] addSummariesBatch: replacing ${removed} existing summary row(s) with same (memoryId, momentType, momentId)`
        );
      }
      const next = [...deduped, ...created];
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
      const existingMomentKeys = new Set(
        summaries.map((s) => `${s.memoryId}:${s.momentId}`)
      );
      const manualMemories = idealizedMemories.filter((m) => m.source === 'manual');
      // Compound AI id "<memoryId>::<lessonId>" keeps lessons disambiguated
      // through the LLM call when raw lesson ids collide across memories
      // (legacy "lesson-2" / index-based ids).
      const lessonsForAI: { id: string; text: string; memoryTitle?: string; sphere: LifeSphere }[] = [];
      const contextByAIId = new Map<
        string,
        { memoryId: string; entityId: string; originalMomentId: string; text: string; sphere: LifeSphere }
      >();
      for (const mem of manualMemories) {
        const list = mem.lessonsLearned ?? [];
        for (const lesson of list) {
          if (!lesson.text.trim() || existingMomentKeys.has(`${mem.id}:${lesson.id}`)) continue;
          const aiId = `${mem.id}::${lesson.id}`;
          lessonsForAI.push({
            id: aiId,
            text: lesson.text,
            memoryTitle: mem.title,
            sphere: mem.sphere,
          });
          contextByAIId.set(aiId, {
            memoryId: mem.id,
            entityId: mem.entityId,
            originalMomentId: lesson.id,
            text: lesson.text,
            sphere: mem.sphere,
          });
        }
      }
      if (lessonsForAI.length === 0) {
        return { generated: 0 };
      }
      const aiEnabled = await isAIInsightsEnabled();
      if (!aiEnabled) return { generated: 0 };
      try {
        if (__DEV__) {
          console.log(
            `[MomentNotificationProvider] generateBatchSuggestionsForManualLessons: lessons=${lessonsForAI.length}`
          );
        }
        // Helper guarantees one message per input lesson or throws.
        const map = await suggestNotificationMessagesForLessons(lessonsForAI, language);
        const toAdd: Omit<MomentNotificationSummary, 'id' | 'createdAt'>[] = [];
        const missing: string[] = [];
        for (const lesson of lessonsForAI) {
          const msg = map[lesson.id];
          const ctx = contextByAIId.get(lesson.id);
          if (!msg?.trim() || !ctx) {
            missing.push(lesson.id);
            continue;
          }
          toAdd.push({
            momentId: ctx.originalMomentId,
            memoryId: ctx.memoryId,
            entityId: ctx.entityId,
            sphere: ctx.sphere,
            momentType: 'lesson',
            momentText: ctx.text,
            notificationMessage: msg.trim(),
            source: 'ai_batch',
          });
        }
        if (missing.length > 0) {
          // With the alias+retry helper this should never happen; if it does, fail loud
          // rather than silently persisting a partial set.
          console.error(
            `[MomentNotificationProvider] generateBatchSuggestionsForManualLessons: coverage gap`,
            { missing }
          );
          return {
            generated: 0,
            error: `AI returned messages for ${lessonsForAI.length - missing.length}/${lessonsForAI.length} lesson(s). Aborting to avoid partial state.`,
          };
        }
        if (toAdd.length > 0) {
          await addSummariesBatch(toAdd);
        }
        if (__DEV__) {
          console.log(
            `[MomentNotificationProvider] generateBatchSuggestionsForManualLessons: persisted ${toAdd.length}/${lessonsForAI.length}`
          );
        }
        return { generated: toAdd.length };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate suggestions';
        console.error(
          `[MomentNotificationProvider] generateBatchSuggestionsForManualLessons: error`,
          err
        );
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
      const existingMomentKeysArr = matchingSummaries.map((s) => `${s.memoryId}:${s.momentId}`);
      const existingMomentKeys = new Set(existingMomentKeysArr);
      const memoriesInSphere = idealizedMemories.filter((m) => m.sphere === sphere);

      if (__DEV__) {
        console.log(
          `[MomentNotificationProvider] ensureSummariesForSphereAndType(${momentType}, ${sphere}) snapshot: totalSummaries=${currentSummaries.length} matching=${matchingSummaries.length} memoriesInSphere=${memoriesInSphere.length}`,
          {
            existingMomentKeys: existingMomentKeysArr,
            memoriesInSphere: memoriesInSphere.map((m) => ({
              id: m.id,
              title: m.title,
              lessonIds: (m.lessonsLearned ?? []).map((l) => l.id),
              goodFactIds: (m.goodFacts ?? []).map((g) => g.id),
            })),
          }
        );
      }

      if (momentType === 'lesson') {
        // Use a compound AI id of "<memoryId>::<lessonId>" so that lessons
        // with colliding raw ids across memories (legacy "lesson-2" format)
        // stay disambiguated through the AI call and are persisted against
        // the correct memory.
        const lessonsForAI: { id: string; text: string; memoryTitle?: string; sphere: LifeSphere }[] = [];
        const contextByAIId = new Map<
          string,
          { memoryId: string; entityId: string; originalMomentId: string; text: string; sphere: LifeSphere }
        >();
        for (const mem of memoriesInSphere) {
          for (const l of mem.lessonsLearned ?? []) {
            if (!l.text.trim() || existingMomentKeys.has(`${mem.id}:${l.id}`)) continue;
            const aiId = `${mem.id}::${l.id}`;
            lessonsForAI.push({ id: aiId, text: l.text, memoryTitle: mem.title, sphere: mem.sphere });
            contextByAIId.set(aiId, {
              memoryId: mem.id,
              entityId: mem.entityId,
              originalMomentId: l.id,
              text: l.text,
              sphere: mem.sphere,
            });
          }
        }
        if (lessonsForAI.length === 0) {
          if (__DEV__) {
            console.log(
              `[MomentNotificationProvider] ensureSummariesForSphereAndType(lesson, ${sphere}): nothing to generate`
            );
          }
          return { generated: 0 };
        }
        const aiEnabled = await isAIInsightsEnabled();
        if (!aiEnabled) {
          console.warn(
            `[MomentNotificationProvider] ensureSummariesForSphereAndType: AI insights disabled; skipping`
          );
          return { generated: 0 };
        }
        try {
          if (__DEV__) {
            console.log(
              `[MomentNotificationProvider] ensureSummariesForSphereAndType(lesson, ${sphere}): requesting ${lessonsForAI.length} message(s)`,
              {
                compoundIds: lessonsForAI.map((l) => l.id),
              }
            );
          }
          const map = await suggestNotificationMessagesForLessons(lessonsForAI, language);
          if (__DEV__) {
            console.log(
              `[MomentNotificationProvider] ensureSummariesForSphereAndType(lesson, ${sphere}): LLM returned ${Object.keys(map).length} message(s)`,
              { returnedIds: Object.keys(map) }
            );
          }
          const toAdd: Omit<MomentNotificationSummary, 'id' | 'createdAt'>[] = [];
          const missing: string[] = [];
          for (const lesson of lessonsForAI) {
            const msg = map[lesson.id];
            const ctx = contextByAIId.get(lesson.id);
            if (!msg?.trim() || !ctx) {
              missing.push(lesson.id);
              continue;
            }
            toAdd.push({
              momentId: ctx.originalMomentId,
              memoryId: ctx.memoryId,
              entityId: ctx.entityId,
              sphere: ctx.sphere,
              momentType: 'lesson',
              momentText: ctx.text,
              notificationMessage: msg.trim(),
              source: 'ai_batch',
            });
          }
          if (missing.length > 0) {
            console.error(
              `[MomentNotificationProvider] ensureSummariesForSphereAndType(lesson, ${sphere}): coverage gap — ${missing.length}/${lessonsForAI.length} unresolved`,
              { missingCompoundIds: missing }
            );
            return {
              generated: 0,
              error: `AI returned messages for ${lessonsForAI.length - missing.length}/${lessonsForAI.length} lesson(s). Please try again.`,
            };
          }
          if (toAdd.length > 0) await addSummariesBatch(toAdd);
          if (__DEV__) {
            console.log(
              `[MomentNotificationProvider] ensureSummariesForSphereAndType(lesson, ${sphere}): persisted ${toAdd.length}/${lessonsForAI.length}`,
              {
                persistedKeys: toAdd.map((s) => `${s.memoryId}:${s.momentId}`),
              }
            );
          }
          return { generated: toAdd.length };
        } catch (err) {
          console.error(
            `[MomentNotificationProvider] ensureSummariesForSphereAndType(lesson, ${sphere}): error`,
            err
          );
          return { generated: 0, error: err instanceof Error ? err.message : 'Failed to generate' };
        }
      }

      // momentType === 'sunny'
      // Same compound-id strategy as the lesson branch to disambiguate
      // good-fact ids that collide across memories.
      const sunnyForAI: { id: string; text: string; memoryTitle?: string; sphere: LifeSphere }[] = [];
      const sunnyContextByAIId = new Map<
        string,
        { memoryId: string; entityId: string; originalMomentId: string; text: string; sphere: LifeSphere }
      >();
      for (const mem of memoriesInSphere) {
        for (const g of mem.goodFacts ?? []) {
          if (!g.text.trim() || existingMomentKeys.has(`${mem.id}:${g.id}`)) continue;
          const aiId = `${mem.id}::${g.id}`;
          sunnyForAI.push({ id: aiId, text: g.text, memoryTitle: mem.title, sphere: mem.sphere });
          sunnyContextByAIId.set(aiId, {
            memoryId: mem.id,
            entityId: mem.entityId,
            originalMomentId: g.id,
            text: g.text,
            sphere: mem.sphere,
          });
        }
      }
      if (sunnyForAI.length === 0) {
        if (__DEV__) {
          console.log(
            `[MomentNotificationProvider] ensureSummariesForSphereAndType(sunny, ${sphere}): nothing to generate`
          );
        }
        return { generated: 0 };
      }
      const aiEnabledForSunny = await isAIInsightsEnabled();
      if (!aiEnabledForSunny) {
        console.warn(
          `[MomentNotificationProvider] ensureSummariesForSphereAndType: AI insights disabled; skipping`
        );
        return { generated: 0 };
      }
      try {
        if (__DEV__) {
          console.log(
            `[MomentNotificationProvider] ensureSummariesForSphereAndType(sunny, ${sphere}): requesting ${sunnyForAI.length} message(s)`,
            {
              compoundIds: sunnyForAI.map((m) => m.id),
            }
          );
        }
        const map = await suggestNotificationMessagesForSunnyMoments(sunnyForAI, language);
        if (__DEV__) {
          console.log(
            `[MomentNotificationProvider] ensureSummariesForSphereAndType(sunny, ${sphere}): LLM returned ${Object.keys(map).length} message(s)`,
            { returnedIds: Object.keys(map) }
          );
        }
        const toAdd: Omit<MomentNotificationSummary, 'id' | 'createdAt'>[] = [];
        const missing: string[] = [];
        for (const m of sunnyForAI) {
          const msg = map[m.id];
          const ctx = sunnyContextByAIId.get(m.id);
          if (!msg?.trim() || !ctx) {
            missing.push(m.id);
            continue;
          }
          toAdd.push({
            momentId: ctx.originalMomentId,
            memoryId: ctx.memoryId,
            entityId: ctx.entityId,
            sphere: ctx.sphere,
            momentType: 'sunny',
            momentText: ctx.text,
            notificationMessage: msg.trim(),
            source: 'ai_batch',
          });
        }
        if (missing.length > 0) {
          console.error(
            `[MomentNotificationProvider] ensureSummariesForSphereAndType(sunny, ${sphere}): coverage gap — ${missing.length}/${sunnyForAI.length} unresolved`,
            { missingCompoundIds: missing }
          );
          return {
            generated: 0,
            error: `AI returned messages for ${sunnyForAI.length - missing.length}/${sunnyForAI.length} sunny moment(s). Please try again.`,
          };
        }
        if (toAdd.length > 0) await addSummariesBatch(toAdd);
        if (__DEV__) {
          console.log(
            `[MomentNotificationProvider] ensureSummariesForSphereAndType(sunny, ${sphere}): persisted ${toAdd.length}/${sunnyForAI.length}`,
            {
              persistedKeys: toAdd.map((s) => `${s.memoryId}:${s.momentId}`),
            }
          );
        }
        return { generated: toAdd.length };
      } catch (err) {
        console.error(
          `[MomentNotificationProvider] ensureSummariesForSphereAndType(sunny, ${sphere}): error`,
          err
        );
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
        const canUseAIForSchedule = canUseAI;
        const effectiveSource = schedule.source === 'ai' && !canUseAIForSchedule ? 'moments' : schedule.source;
        if (effectiveSource === 'moments') {
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
        if (effectiveSource === 'ai') {
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
          // Keep the schedule enabled even when there are no candidates right now.
          // This avoids flipping new schedules OFF immediately and preserves user intent.
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
          const notificationContent = formatMomentNudgeNotification(
            candidate.momentType,
            candidate.body
          );
          await Notifications.scheduleNotificationAsync({
            identifier: `${MOMENT_NUDGE_PREFIX}${schedule.id}_${i}`,
            content: {
              title: notificationContent.title,
              body: notificationContent.body,
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
