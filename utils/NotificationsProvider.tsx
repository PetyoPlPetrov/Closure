import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { LifeSphere, useJourney } from './JourneyProvider';

// For now, assume we're always on a real device since simulator detection is unreliable
// The notification behavior will tell us if we're on simulator or not
const isIOSSimulator = false;

const STORAGE_KEY_TEMPLATES = '@sferas:notification_templates';
const STORAGE_KEY_ASSIGNMENTS = '@sferas:notification_assignments';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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
        console.error('Failed to load notification settings:', error);
      }
    };

    loadData();
  }, []);

  // Request notification permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      if (isIOSSimulator) {
        console.warn('[NotificationPermissions] ⚠️  Running on iOS Simulator - notifications are unreliable!');
        console.warn('[NotificationPermissions] ⚠️  Please test on a real iOS device for accurate behavior');
      }

      console.log('[NotificationPermissions] Checking notification permissions...');
      console.log('[NotificationPermissions] Platform:', Platform.OS);
      console.log('[NotificationPermissions] Note: Testing on real device (simulator detection disabled)');

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('[NotificationPermissions] Current permission status:', existingStatus);

      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        console.log('[NotificationPermissions] Requesting permissions...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('[NotificationPermissions] Permission request result:', status);
      }

      if (finalStatus !== 'granted') {
        console.warn('[NotificationPermissions] ❌ Notification permissions NOT granted! Status:', finalStatus);
      } else {
        console.log('[NotificationPermissions] ✅ Notification permissions granted');
      }
    };

    requestPermissions();
  }, []);

  // Calculate if entity meets condition for notification
  const checkCondition = useCallback(
    (entityId: string, sphere: LifeSphere, condition: string, noRecentDays?: number): boolean => {
      const { idealizedMemories, profiles, jobs, familyMembers, friends, hobbies } = journey;

      console.log('[NotificationCondition] Checking condition for entity:', entityId);
      console.log('[NotificationCondition] Condition:', condition);
      console.log('[NotificationCondition] Sphere:', sphere);

      // Get entity memories
      const entityMemories = idealizedMemories.filter(
        (m) => m.entityId === entityId && m.sphere === sphere
      );
      console.log('[NotificationCondition] Entity has', entityMemories.length, 'memories');

      if (condition === 'noRecent') {
        console.log('[NotificationCondition] Checking "noRecent" condition');
        console.log('[NotificationCondition] noRecentDays threshold:', noRecentDays || 7);

        // Check if no memory logged in the last N days
        if (!entityMemories.length) {
          console.log('[NotificationCondition] No memories exist → condition MET');
          return true;
        }

        const lastMemoryDate = new Date(
          Math.max(...entityMemories.map((m) => new Date(m.createdAt).getTime()))
        );
        const daysSinceLastMemory = Math.floor(
          (Date.now() - lastMemoryDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        console.log('[NotificationCondition] Last memory date:', lastMemoryDate.toISOString());
        console.log('[NotificationCondition] Days since last memory:', daysSinceLastMemory);

        const result = daysSinceLastMemory >= (noRecentDays || 7);
        console.log('[NotificationCondition] Result:', result ? 'MET' : 'NOT MET');
        return result;
      }

      if (condition === 'belowAvgMoments') {
        console.log('[NotificationCondition] Checking "belowAvgMoments" condition');

        // Check if entity has below average moments in its sphere
        let sphereEntities: any[] = [];

        if (sphere === 'relationships') sphereEntities = profiles.filter(p => !p.relationshipEndDate);
        else if (sphere === 'career') sphereEntities = jobs;
        else if (sphere === 'family') sphereEntities = familyMembers;
        else if (sphere === 'friends') sphereEntities = friends;
        else if (sphere === 'hobbies') sphereEntities = hobbies;

        console.log('[NotificationCondition] Sphere entity count:', sphereEntities.length);

        if (sphereEntities.length === 0) {
          console.log('[NotificationCondition] No entities in sphere → condition NOT MET');
          return false;
        }

        const totalMemories = idealizedMemories.filter((m) => m.sphere === sphere).length;
        const avgMemoriesPerEntity = totalMemories / sphereEntities.length;

        console.log('[NotificationCondition] Total memories in sphere:', totalMemories);
        console.log('[NotificationCondition] Average per entity:', avgMemoriesPerEntity);
        console.log('[NotificationCondition] Entity memories:', entityMemories.length);

        const result = entityMemories.length < avgMemoriesPerEntity;
        console.log('[NotificationCondition] Result:', result ? 'MET' : 'NOT MET');
        return result;
      }

      if (condition === 'relationshipLessThanJob') {
        console.log('[NotificationCondition] Checking "relationshipLessThanJob" condition');

        // Check if relationship has fewer moments than career entities
        const jobMemories = idealizedMemories.filter((m) => m.sphere === 'career');
        const avgJobMemories = jobs.length > 0 ? jobMemories.length / jobs.length : 0;

        console.log('[NotificationCondition] Job memories total:', jobMemories.length);
        console.log('[NotificationCondition] Jobs count:', jobs.length);
        console.log('[NotificationCondition] Avg job memories:', avgJobMemories);
        console.log('[NotificationCondition] Entity memories:', entityMemories.length);

        const result = entityMemories.length < avgJobMemories;
        console.log('[NotificationCondition] Result:', result ? 'MET' : 'NOT MET');
        return result;
      }

      if (condition === 'relationshipLessThanFriendsAvg') {
        console.log('[NotificationCondition] Checking "relationshipLessThanFriendsAvg" condition');

        // Check if relationship has fewer moments than friends average
        const friendMemories = idealizedMemories.filter((m) => m.sphere === 'friends');
        const avgFriendMemories = friends.length > 0 ? friendMemories.length / friends.length : 0;

        console.log('[NotificationCondition] Friend memories total:', friendMemories.length);
        console.log('[NotificationCondition] Friends count:', friends.length);
        console.log('[NotificationCondition] Avg friend memories:', avgFriendMemories);
        console.log('[NotificationCondition] Entity memories:', entityMemories.length);

        const result = entityMemories.length < avgFriendMemories;
        console.log('[NotificationCondition] Result:', result ? 'MET' : 'NOT MET');
        return result;
      }

      console.log('[NotificationCondition] Unknown condition → NOT MET');
      return false;
    },
    [journey]
  );

  // Calculate next notification trigger date
  const getNextTriggerDate = useCallback((template: NotificationTemplate): Date => {
    const now = new Date();
    const [hours, minutes] = template.timeOfDay.split(':').map(Number);

    console.log('[NotificationScheduler] Calculating next trigger date');
    console.log('[NotificationScheduler] Current time:', now.toISOString());
    console.log('[NotificationScheduler] Current local time:', now.toLocaleString());
    console.log('[NotificationScheduler] Template time:', template.timeOfDay);
    console.log('[NotificationScheduler] Frequency days:', template.frequencyDays);
    console.log('[NotificationScheduler] Week day:', template.weekDay);

    // Create trigger date in local timezone
    const trigger = new Date();
    trigger.setHours(hours ?? 9, minutes ?? 0, 0, 0);

    console.log('[NotificationScheduler] Initial trigger (today at template time):', trigger.toISOString());
    console.log('[NotificationScheduler] Initial trigger local:', trigger.toLocaleString());
    console.log('[NotificationScheduler] Trigger timestamp:', trigger.getTime());
    console.log('[NotificationScheduler] Now timestamp:', now.getTime());
    console.log('[NotificationScheduler] Trigger is in past?', trigger.getTime() < now.getTime());

    if (template.frequencyDays === 7 && template.weekDay !== undefined) {
      // Weekly notification on specific day
      const currentDay = now.getDay();
      const targetDay = template.weekDay;

      console.log('[NotificationScheduler] Weekly mode - Current day:', currentDay, '(0=Sun, 6=Sat)');
      console.log('[NotificationScheduler] Weekly mode - Target day:', targetDay);

      let daysUntilTarget = targetDay - currentDay;
      console.log('[NotificationScheduler] Days until target (initial):', daysUntilTarget);

      if (daysUntilTarget < 0) {
        daysUntilTarget += 7;
        console.log('[NotificationScheduler] Target day is in the past this week, adding 7 days:', daysUntilTarget);
      } else if (daysUntilTarget === 0) {
        // Same day - check if time has passed
        console.log('[NotificationScheduler] Same day - checking if time has passed');
        console.log('[NotificationScheduler] Current hours:', now.getHours(), 'Target hours:', hours);
        console.log('[NotificationScheduler] Current minutes:', now.getMinutes(), 'Target minutes:', minutes ?? 0);

        if (now.getHours() > hours || (now.getHours() === hours && now.getMinutes() >= (minutes ?? 0))) {
          // Time has passed, schedule for next week
          daysUntilTarget = 7;
          console.log('[NotificationScheduler] Time has passed today, scheduling for next week');
        } else {
          console.log('[NotificationScheduler] Time has not passed, scheduling for today');
        }
      }

      trigger.setDate(now.getDate() + daysUntilTarget);
      console.log('[NotificationScheduler] Final trigger after weekly adjustment:', trigger.toISOString());
      console.log('[NotificationScheduler] Final trigger local:', trigger.toLocaleString());
    } else {
      // Daily or custom frequency
      console.log('[NotificationScheduler] Daily/custom mode');
      console.log('[NotificationScheduler] Checking if time has passed - Current hours:', now.getHours(), 'Target hours:', hours);
      console.log('[NotificationScheduler] Checking if time has passed - Current minutes:', now.getMinutes(), 'Target minutes:', minutes ?? 0);

      if (now.getHours() > hours || (now.getHours() === hours && now.getMinutes() >= (minutes ?? 0))) {
        // Time has passed today, schedule for tomorrow
        console.log('[NotificationScheduler] Time has passed today, adding', template.frequencyDays, 'day(s)');
        trigger.setDate(now.getDate() + template.frequencyDays);
        console.log('[NotificationScheduler] New trigger date:', trigger.toISOString());
        console.log('[NotificationScheduler] New trigger local:', trigger.toLocaleString());
      } else {
        console.log('[NotificationScheduler] Time has not passed, trigger is today');
      }
    }

    console.log('[NotificationScheduler] FINAL TRIGGER TIME:', trigger.toISOString());
    console.log('[NotificationScheduler] FINAL TRIGGER LOCAL:', trigger.toLocaleString());
    console.log('[NotificationScheduler] Minutes from now:', Math.round((trigger.getTime() - now.getTime()) / 1000 / 60), 'minutes');

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
        console.log('[NotificationScheduler] ========================================');
        console.log('[NotificationScheduler] Attempting to schedule notification for:', entityName);
        console.log('[NotificationScheduler] Entity ID:', entityId);
        console.log('[NotificationScheduler] Sphere:', sphere);
        console.log('[NotificationScheduler] Template:', JSON.stringify(template, null, 2));

        // Check if condition is met
        const conditionMet = checkCondition(entityId, sphere, template.condition, template.noRecentDays);
        console.log('[NotificationScheduler] Condition check result:', conditionMet);

        if (!conditionMet) {
          console.log('[NotificationScheduler] Condition not met, skipping notification');
          return null;
        }

        const trigger = getNextTriggerDate(template);
        const message = template.message || `Check in with ${entityName} today`;

        console.log('[NotificationScheduler] Scheduling notification with:');
        console.log('[NotificationScheduler] - Title:', entityName);
        console.log('[NotificationScheduler] - Body:', message);
        console.log('[NotificationScheduler] - Trigger date:', trigger.toISOString());
        console.log('[NotificationScheduler] - Trigger local:', trigger.toLocaleString());
        console.log('[NotificationScheduler] - Repeats:', template.frequencyDays === 1);

        // IMPORTANT: expo-notifications has bugs with repeats:true on iOS
        // Instead of using repeating notifications, we schedule one-time notifications
        // and rely on condition checking to determine if they should fire again

        // Use explicit DateTriggerInput format - most reliable method for iOS
        // According to Expo docs: https://docs.expo.dev/versions/latest/sdk/notifications/
        const triggerDate = new Date(Math.max(trigger.getTime(), Date.now() + 60000)); // At least 60 seconds in future

        // Create explicit trigger object with type field
        const triggerInput = {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        };

        console.log('[NotificationScheduler] Using DateTriggerInput (fires once at specific time)');
        console.log('[NotificationScheduler] Trigger date:', triggerDate.toISOString());
        console.log('[NotificationScheduler] Trigger local:', triggerDate.toLocaleString());
        console.log('[NotificationScheduler] Seconds from now:', Math.floor((triggerDate.getTime() - Date.now()) / 1000));
        console.log('[NotificationScheduler] Trigger input:', JSON.stringify(triggerInput));

        if (isIOSSimulator) {
          console.warn('[NotificationScheduler] ⚠️  iOS Simulator detected - notifications may fire immediately or not work correctly');
          console.warn('[NotificationScheduler] ⚠️  This is a known iOS Simulator limitation, NOT a bug in the app');
          console.warn('[NotificationScheduler] ⚠️  Test on a real iOS device for accurate notification behavior');
        }

        // Check permissions before scheduling
        const { status: permissionStatus } = await Notifications.getPermissionsAsync();
        console.log('[NotificationScheduler] Permission status before scheduling:', permissionStatus);

        if (permissionStatus !== 'granted') {
          console.error('[NotificationScheduler] ❌ Cannot schedule notification - permissions not granted!');
          return null;
        }

        console.log('[NotificationScheduler] Attempting to schedule notification...');

        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: entityName,
            body: message,
            data: { entityId, sphere, type: 'entity_reminder', scheduledAt: Date.now() },
          },
          trigger: triggerInput, // Use explicit DateTriggerInput format
        });

        console.log('[NotificationScheduler] ✅ Notification scheduled successfully with ID:', notificationId);
        console.log('[NotificationScheduler] ✅ Current time when scheduled:', new Date().toISOString());

        // Verify the notification was actually scheduled
        try {
          const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
          console.log('[NotificationScheduler] Total scheduled notifications in system:', allScheduled.length);

          const ourNotification = allScheduled.find(n => n.identifier === notificationId);
          console.log('[NotificationScheduler] Verification - Our notification found:', !!ourNotification);

          if (ourNotification) {
            console.log('[NotificationScheduler] Verification - Full trigger info:', JSON.stringify(ourNotification.trigger, null, 2));
          } else {
            console.error('[NotificationScheduler] ❌ WARNING: Notification was not found in scheduled list immediately after scheduling!');
            console.log('[NotificationScheduler] All scheduled notification IDs:', allScheduled.map(n => n.identifier));
          }
        } catch (verifyError) {
          console.error('[NotificationScheduler] Failed to verify notification:', verifyError);
        }

        console.log('[NotificationScheduler] ========================================');

        return notificationId;
      } catch (error) {
        console.error('[NotificationScheduler] ❌ Failed to schedule notification for', entityName, ':', error);
        return null;
      }
    },
    [checkCondition, getNextTriggerDate]
  );

  // Refresh all notification schedules
  const refreshSchedules = useCallback(async () => {
    console.log('[NotificationScheduler] 🔄 Starting notification refresh...');
    setIsScheduling(true);
    try {
      // Cancel all existing notifications
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('[NotificationScheduler] Cancelled all existing notifications');

      const { profiles, jobs, familyMembers, friends, hobbies } = journey;

      console.log('[NotificationScheduler] Entity counts:');
      console.log('[NotificationScheduler] - Relationships:', profiles.filter(p => !p.relationshipEndDate).length);
      console.log('[NotificationScheduler] - Career:', jobs.length);
      console.log('[NotificationScheduler] - Family:', familyMembers.length);
      console.log('[NotificationScheduler] - Friends:', friends.length);
      console.log('[NotificationScheduler] - Hobbies:', hobbies.length);

      console.log('[NotificationScheduler] Assignments:', JSON.stringify(assignments, null, 2));

      // Schedule notifications for each sphere
      const scheduleForSphere = async (
        sphere: LifeSphere,
        entities: { id: string; name: string }[]
      ) => {
        const assignment = assignments[sphere];
        if (!assignment) {
          console.log(`[NotificationScheduler] No assignment for sphere: ${sphere}`);
          return;
        }

        console.log(`[NotificationScheduler] Processing ${sphere} sphere with ${entities.length} entities`);

        for (const entity of entities) {
          const override = assignment.overrides[entity.id];

          if (override?.kind === 'custom') {
            console.log(`[NotificationScheduler] Found custom override for ${entity.name} in ${sphere}`);
            await scheduleNotificationForEntity(
              entity.id,
              entity.name,
              sphere,
              override.template
            );
          } else {
            console.log(`[NotificationScheduler] No custom override for ${entity.name} in ${sphere}, override:`, override);
          }
        }
      };

      await Promise.all([
        scheduleForSphere('relationships', profiles.filter(p => !p.relationshipEndDate)),
        scheduleForSphere('career', jobs),
        scheduleForSphere('family', familyMembers),
        scheduleForSphere('friends', friends),
        scheduleForSphere('hobbies', hobbies),
      ]);

      // Log all scheduled notifications
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log('[NotificationScheduler] ✅ Refresh complete. Total scheduled notifications:', scheduledNotifications.length);
      scheduledNotifications.forEach((notif, index) => {
        console.log(`[NotificationScheduler] Scheduled notification #${index + 1}:`, {
          id: notif.identifier,
          title: notif.content.title,
          trigger: notif.trigger,
        });
      });
    } catch (error) {
      console.error('[NotificationScheduler] ❌ Failed to refresh notification schedules:', error);
    } finally {
      setIsScheduling(false);
    }
  }, [assignments, journey, scheduleNotificationForEntity]);

  // Auto-refresh schedules when assignments change
  useEffect(() => {
    // Debounce refresh to avoid multiple rapid calls
    const timeoutId = setTimeout(() => {
      refreshSchedules();
    }, 1000); // Wait 1 second after last change

    return () => clearTimeout(timeoutId);
  }, [assignments, refreshSchedules]);

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
