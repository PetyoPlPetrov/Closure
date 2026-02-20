import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { LifeSphere, useJourney } from './JourneyProvider';

// For now, assume we're always on a real device since simulator detection is unreliable
// The notification behavior will tell us if we're on simulator or not
const isIOSSimulator = false;

const STORAGE_KEY_TEMPLATES = '@sferas:notification_templates';
const STORAGE_KEY_ASSIGNMENTS = '@sferas:notification_assignments';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type NotificationTemplate = {
  id: string;
  name: string;
  frequencyDays: number;
  timeOfDay: string;
  weekDay?: number; // 0-6 (Sunday-Saturday) for weekly notifications
  condition: string;
  noRecentDays?: number;
  defaultForSpheres?: LifeSphere[];
  message?: string;
  soundEnabled?: boolean; // Whether to play sound with notification
};

type EntityNotificationChoice =
  | { kind: 'template'; templateId: string }
  | { kind: 'custom'; template: NotificationTemplate }
  | { kind: 'none' };

type SphereAssignment = {
  defaultTemplateId?: string;
  overrides: Record<string, EntityNotificationChoice>;
};

type AssignmentsState = Partial<Record<LifeSphere, SphereAssignment>>;

type NotificationContextType = {
  templates: NotificationTemplate[];
  assignments: AssignmentsState;
  isScheduling: boolean;
  refreshSchedules: () => Promise<void>;
  addTemplate: (tpl: Omit<NotificationTemplate, 'id'>) => Promise<NotificationTemplate>;
  updateTemplate: (tpl: NotificationTemplate) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
  setSphereDefault: (sphere: LifeSphere, templateId?: string) => Promise<void>;
  setOverride: (sphere: LifeSphere, entityId: string, choice: EntityNotificationChoice) => Promise<void>;
  checkCondition: (entityId: string, sphere: LifeSphere, condition: string, noRecentDays?: number) => boolean;
  getNextTriggerDate: (template: NotificationTemplate) => Date;
  getScheduledNotifications: () => Promise<Notifications.NotificationRequest[]>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [assignments, setAssignments] = useState<AssignmentsState>({});
  const [isScheduling, setIsScheduling] = useState(false);
  const journey = useJourney();

  // Load templates and assignments from storage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [templatesData, assignmentsData] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_TEMPLATES),
          AsyncStorage.getItem(STORAGE_KEY_ASSIGNMENTS),
        ]);

        if (templatesData) {
          setTemplates(JSON.parse(templatesData));
        }
        if (assignmentsData) {
          setAssignments(JSON.parse(assignmentsData));
        }
      } catch (error) {
        // Silent error handling
      }
    };

    loadData();
  }, []);

  // Note: Notification permissions are now requested only when user explicitly enables notifications
  // from the notification settings screen, not automatically on app startup

  // Calculate if entity meets condition for notification
  const checkCondition = useCallback(
    (entityId: string, sphere: LifeSphere, condition: string, noRecentDays?: number): boolean => {
      const { idealizedMemories, profiles, jobs, familyMembers, friends, hobbies } = journey;

      // Get entity memories
      const entityMemories = idealizedMemories.filter(
        (m) => m.entityId === entityId && m.sphere === sphere
      );

      if (condition === 'noRecent') {
        // Check if no memory logged in the last N days
        if (!entityMemories.length) {
          return true;
        }

        const lastMemoryDate = new Date(
          Math.max(...entityMemories.map((m) => new Date(m.createdAt).getTime()))
        );
        const daysSinceLastMemory = Math.floor(
          (Date.now() - lastMemoryDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        return daysSinceLastMemory >= (noRecentDays || 7);
      }

      if (condition === 'belowAvgMoments') {
        // Check if entity has below average moments in its sphere
        let sphereEntities: any[] = [];

        if (sphere === 'relationships') sphereEntities = profiles.filter(p => !p.relationshipEndDate);
        else if (sphere === 'career') sphereEntities = jobs;
        else if (sphere === 'family') sphereEntities = familyMembers;
        else if (sphere === 'friends') sphereEntities = friends;
        else if (sphere === 'hobbies') sphereEntities = hobbies;

        if (sphereEntities.length === 0) {
          return false;
        }

        const totalMemories = idealizedMemories.filter((m) => m.sphere === sphere).length;
        const avgMemoriesPerEntity = totalMemories / sphereEntities.length;

        return entityMemories.length < avgMemoriesPerEntity;
      }

      if (condition === 'relationshipLessThanJob') {
        // Check if relationship has fewer moments than career entities
        const jobMemories = idealizedMemories.filter((m) => m.sphere === 'career');
        const avgJobMemories = jobs.length > 0 ? jobMemories.length / jobs.length : 0;

        return entityMemories.length < avgJobMemories;
      }

      if (condition === 'relationshipLessThanFriendsAvg') {
        // Check if relationship has fewer moments than friends average
        const friendMemories = idealizedMemories.filter((m) => m.sphere === 'friends');
        const avgFriendMemories = friends.length > 0 ? friendMemories.length / friends.length : 0;

        return entityMemories.length < avgFriendMemories;
      }

      return false;
    },
    [journey]
  );

  // Calculate next notification trigger date
  const getNextTriggerDate = useCallback((template: NotificationTemplate): Date => {
    const now = new Date();
    const [hours, minutes] = template.timeOfDay.split(':').map(Number);
    const h = hours ?? 9;
    const m = minutes ?? 0;

    if (template.frequencyDays === 7 && template.weekDay !== undefined) {
      // Weekly: find next occurrence of target weekday at timeOfDay
      // Use date arithmetic (add days to now) so month boundaries are correct
      const currentDay = now.getDay();
      const targetDay = template.weekDay;
      let daysUntilTarget = targetDay - currentDay;
      if (daysUntilTarget < 0) {
        daysUntilTarget += 7;
      } else if (daysUntilTarget === 0) {
        if (now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m)) {
          daysUntilTarget = 7;
        }
      }
      const trigger = new Date(now.getTime() + daysUntilTarget * 24 * 60 * 60 * 1000);
      trigger.setHours(h, m, 0, 0);
      return trigger;
    }

    // Daily (frequencyDays === 1): today at timeOfDay, or tomorrow if time has passed
    const trigger = new Date();
    trigger.setHours(h, m, 0, 0);
    if (trigger.getTime() <= now.getTime()) {
      trigger.setDate(trigger.getDate() + template.frequencyDays);
    }
    return trigger;
  }, []);

  // Schedule notification for an entity
  const scheduleNotificationForEntity = useCallback(
    async (
      entityId: string,
      entityName: string,
      sphere: LifeSphere,
      template: NotificationTemplate
    ) => {
      try {
        // Check if condition is met
        const conditionMet = checkCondition(entityId, sphere, template.condition, template.noRecentDays);
        if (__DEV__) {
          console.log('[Notifications] scheduleForEntity:', {
            entityId,
            entityName,
            sphere,
            frequencyDays: template.frequencyDays,
            weekDay: template.weekDay,
            conditionMet,
          });
        }
        if (!conditionMet) {
          return null;
        }

        const trigger = getNextTriggerDate(template);
        const message = template.message || `Check in with ${entityName} today`;

        // IMPORTANT: expo-notifications has bugs with repeats:true on iOS
        // Instead of using repeating notifications, we schedule one-time notifications
        // and rely on condition checking to determine if they should fire again

        // Use explicit DateTriggerInput format - most reliable method for iOS
        // According to Expo docs: https://docs.expo.dev/versions/latest/sdk/notifications/
        // In dev mode, allow shorter delays for testing; in production, enforce 60s minimum
        const minDelay = __DEV__ ? 5000 : 60000; // 5s in dev, 60s in production
        const triggerDate = new Date(Math.max(trigger.getTime(), Date.now() + minDelay));

        // Create explicit trigger object with type field
        const triggerInput: Notifications.DateTriggerInput = {
          type: Notifications.SchedulableTriggerInputTypes.DATE as Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        };

        // Check permissions before scheduling
        const { status: permissionStatus } = await Notifications.getPermissionsAsync();
        if (__DEV__) {
          console.log('[Notifications] permission:', permissionStatus, 'triggerDate:', triggerDate.toISOString());
        }
        if (permissionStatus !== 'granted') {
          return null;
        }

        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: entityName,
            body: message,
            data: { entityId, sphere, type: 'entity_reminder', scheduledAt: Date.now() },
            sound: template.soundEnabled !== false ? 'default' : undefined, // Play sound unless explicitly disabled
          },
          trigger: triggerInput, // Use explicit DateTriggerInput format
        });
        if (__DEV__) {
          console.log('[Notifications] scheduled:', notificationId, 'for', triggerDate.toISOString());
        }
        return notificationId;
      } catch (error) {
        if (__DEV__) {
          console.warn('[Notifications] scheduleForEntity error:', entityId, error);
        }
        return null;
      }
    },
    [checkCondition, getNextTriggerDate]
  );

  // Refresh all notification schedules
  const refreshSchedules = useCallback(async () => {
    setIsScheduling(true);
    if (__DEV__) {
      console.log('[Notifications] refreshSchedules start');
    }
    try {
      // Cancel all existing notifications
      await Notifications.cancelAllScheduledNotificationsAsync();

      const { profiles, jobs, familyMembers, friends, hobbies } = journey;

      // Schedule notifications for each sphere
      const scheduleForSphere = async (
        sphere: LifeSphere,
        entities: { id: string; name: string }[]
      ) => {
        const assignment = assignments[sphere];
        if (!assignment) {
          return;
        }

        for (const entity of entities) {
          const override = assignment.overrides[entity.id];

          if (override?.kind === 'custom') {
            if (__DEV__) {
              console.log('[Notifications] custom override for', sphere, entity.name, 'template:', {
                frequencyDays: override.template.frequencyDays,
                weekDay: override.template.weekDay,
                timeOfDay: override.template.timeOfDay,
              });
            }
            await scheduleNotificationForEntity(
              entity.id,
              entity.name,
              sphere,
              override.template
            );
          }
        }
      };

      await Promise.all([
        scheduleForSphere('relationships', profiles.filter(p => !p.relationshipEndDate).map(p => ({ id: p.id, name: p.name }))),
        scheduleForSphere('career', jobs.map(j => ({ id: j.id, name: j.name }))),
        scheduleForSphere('family', familyMembers.map(f => ({ id: f.id, name: f.name }))),
        scheduleForSphere('friends', friends),
        scheduleForSphere('hobbies', hobbies),
      ]);
      if (__DEV__) {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        const summary = scheduled.map((s) => {
          const t = s.trigger as { type?: string; date?: number } | null;
          return {
            id: s.identifier,
            title: s.content?.title,
            at: t?.date != null ? new Date(t.date).toISOString() : (t?.type ?? 'unknown'),
          };
        });
        console.log('[Notifications] refreshSchedules done, scheduled count:', scheduled.length, summary);
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('[Notifications] refreshSchedules error:', error);
      }
    } finally {
      setIsScheduling(false);
    }
  }, [assignments, journey, scheduleNotificationForEntity]);

  // Auto-refresh schedules when assignments or memories change
  // (conditions like belowAvgMoments and noRecent depend on idealizedMemories)
  const idealizedMemories = journey.idealizedMemories ?? [];
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      refreshSchedules();
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [assignments, refreshSchedules, idealizedMemories]);

  const addTemplate = useCallback(
    async (tpl: Omit<NotificationTemplate, 'id'>): Promise<NotificationTemplate> => {
      const newTemplate: NotificationTemplate = {
        ...tpl,
        id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };

      const updated = [...templates, newTemplate];
      setTemplates(updated);
      await AsyncStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(updated));
      return newTemplate;
    },
    [templates]
  );

  const updateTemplate = useCallback(
    async (tpl: NotificationTemplate) => {
      const updated = templates.map((t) => (t.id === tpl.id ? tpl : t));
      setTemplates(updated);
      await AsyncStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(updated));
    },
    [templates]
  );

  const deleteTemplate = useCallback(
    async (templateId: string) => {
      const updated = templates.filter((t) => t.id !== templateId);
      setTemplates(updated);
      await AsyncStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(updated));
    },
    [templates]
  );

  const setSphereDefault = useCallback(
    async (sphere: LifeSphere, templateId?: string) => {
      const updated = {
        ...assignments,
        [sphere]: {
          ...assignments[sphere],
          defaultTemplateId: templateId,
          overrides: assignments[sphere]?.overrides || {},
        },
      };
      setAssignments(updated);
      await AsyncStorage.setItem(STORAGE_KEY_ASSIGNMENTS, JSON.stringify(updated));
    },
    [assignments]
  );

  const setOverride = useCallback(
    async (sphere: LifeSphere, entityId: string, choice: EntityNotificationChoice) => {
      const updated = {
        ...assignments,
        [sphere]: {
          ...assignments[sphere],
          overrides: {
            ...(assignments[sphere]?.overrides || {}),
            [entityId]: choice,
          },
        },
      };
      setAssignments(updated);
      await AsyncStorage.setItem(STORAGE_KEY_ASSIGNMENTS, JSON.stringify(updated));
    },
    [assignments]
  );

  const getScheduledNotifications = useCallback(async () => {
    return await Notifications.getAllScheduledNotificationsAsync();
  }, []);

  const value = useMemo(
    () => ({
      templates,
      assignments,
      isScheduling,
      refreshSchedules,
      addTemplate,
      updateTemplate,
      deleteTemplate,
      setSphereDefault,
      setOverride,
      checkCondition,
      getNextTriggerDate,
      getScheduledNotifications,
    }),
    [
      templates,
      assignments,
      isScheduling,
      refreshSchedules,
      addTemplate,
      updateTemplate,
      deleteTemplate,
      setSphereDefault,
      setOverride,
      checkCondition,
      getNextTriggerDate,
      getScheduledNotifications,
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotificationsManager() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotificationsManager must be used within NotificationsProvider');
  }
  return ctx;
}
