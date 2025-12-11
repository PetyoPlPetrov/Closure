import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { IdealizedMemory, LifeSphere, useJourney } from './JourneyProvider';

type NotificationCondition =
  | 'none'
  | 'noRecent'
  | 'belowAvgMoments'
  | 'relationshipLessThanJob'
  | 'relationshipLessThanFriendsAvg'
  | 'relationshipNoRecent';

export type NotificationTemplate = {
  id: string;
  name: string;
  frequencyDays: number; // Repeat interval in days (>=1)
  timeOfDay: string; // "HH:mm" 24h
  condition: NotificationCondition;
  noRecentDays?: number; // Used when condition === 'noRecent' or 'relationshipNoRecent'
  defaultForSpheres?: LifeSphere[]; // Template-level defaults
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

const STORAGE_TEMPLATES = '@sferas:notification_templates';
const STORAGE_ASSIGNMENTS = '@sferas:notification_assignments';
const STORAGE_LAST_RESCHEDULE_KEY = '@sferas:notification_last_reschedule_key';

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const parseTime = (time: string) => {
  const [hourStr, minuteStr] = time.split(':');
  const hour = Math.min(23, Math.max(0, parseInt(hourStr ?? '8', 10)));
  const minute = Math.min(59, Math.max(0, parseInt(minuteStr ?? '0', 10)));
  return { hour, minute };
};

const getNextTriggerSeconds = (time: string, intervalDays: number) => {
  const { hour, minute } = parseTime(time);
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  
  // Calculate time difference
  const timeDiffMs = next.getTime() - now.getTime();
  const oneMinuteMs = 60 * 1000;
  const minDelayMs = 60 * 1000; // 60 seconds (1 minute) minimum for iOS/Android platform requirements
  
  // If time has already passed today (or is exactly now), schedule for tomorrow
  if (timeDiffMs <= 0) {
    // Time has passed or is exactly now - schedule for tomorrow
    next.setDate(next.getDate() + 1);
  } else if (timeDiffMs <= oneMinuteMs) {
    // Time is in the very near future (within 1 minute) - use it but ensure minimum delay
    next.setTime(now.getTime() + Math.max(minDelayMs, timeDiffMs));
  }
  // If timeDiffMs > oneMinuteMs, the time is later today, so use it as-is
  
  const initialDelayMs = next.getTime() - now.getTime();
  const intervalSeconds = Math.max(1, Math.round(intervalDays * 24 * 60 * 60));
  // Enforce minimum 60 seconds (1 minute) for iOS/Android platform requirements
  const result = { initialSeconds: Math.max(60, Math.round(initialDelayMs / 1000)), intervalSeconds };
  
  // Format local times for better debugging
  const formatLocalTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  
  const delayMinutes = result.initialSeconds / 60;
  const delayHours = result.initialSeconds / 3600;
  
  console.log('[Notifications] getNextTriggerSeconds:', {
    time,
    intervalDays,
    nowUTC: now.toISOString(),
    nowLocal: formatLocalTime(now),
    nextUTC: next.toISOString(),
    nextLocal: formatLocalTime(next),
    initialSeconds: result.initialSeconds,
    intervalSeconds: result.intervalSeconds,
    initialDelayHours: delayHours.toFixed(2),
    initialDelayMinutes: delayMinutes.toFixed(1),
  });
  
  // Warn if delay is very short (we enforce 60s minimum, but warn if it was requested shorter)
  if (result.initialSeconds < 60) {
    console.warn('[Notifications] WARNING: Requested delay was less than 1 minute. Enforced minimum of 60 seconds for platform compatibility.', {
      delaySeconds: result.initialSeconds,
      delayMinutes: delayMinutes.toFixed(2),
    });
  }
  
  return result;
};

const STORAGE_VERSION = 1;

type StoredPayload = {
  v: number;
  templates: NotificationTemplate[];
  assignments: AssignmentsState;
};

const loadState = async (): Promise<StoredPayload> => {
  try {
    const tplRaw = await AsyncStorage.getItem(STORAGE_TEMPLATES);
    const assignRaw = await AsyncStorage.getItem(STORAGE_ASSIGNMENTS);
    const templates: NotificationTemplate[] = tplRaw ? JSON.parse(tplRaw) : [];
    const assignments: AssignmentsState = assignRaw ? JSON.parse(assignRaw) : {};
    return { v: STORAGE_VERSION, templates, assignments };
  } catch {
    return { v: STORAGE_VERSION, templates: [], assignments: {} };
  }
};

const persistState = async (templates: NotificationTemplate[], assignments: AssignmentsState) => {
  try {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_TEMPLATES, JSON.stringify(templates)),
      AsyncStorage.setItem(STORAGE_ASSIGNMENTS, JSON.stringify(assignments)),
    ]);
    // Only log occasionally to avoid spam
    if (Math.random() < 0.01) { // Log ~1% of the time
      console.log('[Notifications] State persisted', {
        templateCount: templates.length,
        assignmentSpheres: Object.keys(assignments),
      });
    }
  } catch (error) {
    console.error('[Notifications] Failed to persist state:', error);
    throw error;
  }
};

const countMoments = (memories: IdealizedMemory[] | undefined) => {
  if (!memories || memories.length === 0) return 0;
  return memories.reduce((acc, m) => acc + (m.hardTruths?.length ?? 0) + (m.goodFacts?.length ?? 0), 0);
};

const countSunny = (memories: IdealizedMemory[] | undefined) => {
  if (!memories || memories.length === 0) return 0;
  return memories.reduce((acc, m) => acc + (m.goodFacts?.length ?? 0), 0);
};

const countClouds = (memories: IdealizedMemory[] | undefined) => {
  if (!memories || memories.length === 0) return 0;
  return memories.reduce((acc, m) => acc + (m.hardTruths?.length ?? 0), 0);
};

const latestMemoryDate = (memories: IdealizedMemory[] | undefined) => {
  if (!memories || memories.length === 0) return undefined;
  const timestamps = memories
    .map((m) => m.updatedAt || m.createdAt)
    .filter(Boolean)
    .map((ts) => new Date(ts).getTime());
  if (timestamps.length === 0) return undefined;
  return new Date(Math.max(...timestamps));
};

export function NotificationsProvider({ children }: { children: ReactNode }) {
  // Subscription gating temporarily disabled
  const { isSubscribed } = { isSubscribed: true as const };
  const { profiles, familyMembers, friends, idealizedMemories } = useJourney();

  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [assignments, setAssignments] = useState<AssignmentsState>({});
  const [isScheduling, setIsScheduling] = useState(false);
  
  // Track recently scheduled notifications to prevent immediate display
  // Maps notification ID to expected trigger time
  const recentlyScheduledRef = useRef<Map<string, number>>(new Map());

  // Set a simple notification handler so local notifications show while app is foregrounded
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const identifier = notification.request.identifier;
        const now = Date.now();
        
        // Check if this notification is in our tracking map (recently scheduled for future)
        const expectedTriggerTime = recentlyScheduledRef.current.get(identifier);
        if (expectedTriggerTime && expectedTriggerTime > now) {
          const secondsUntilFire = Math.round((expectedTriggerTime - now) / 1000);
          console.log('[Notifications] Suppressing notification scheduled for future:', {
            identifier,
            expectedTriggerTime: new Date(expectedTriggerTime).toISOString(),
            now: new Date(now).toISOString(),
            secondsUntilFire,
            title: notification.request.content.title,
          });
          return {
            shouldShowAlert: false,
            shouldPlaySound: false,
            shouldSetBadge: false,
          };
        }
        
        // Also check by temp key if notification ID not found yet
        const data = notification.request.content.data as any;
        if (data?._tempKey) {
          const tempTriggerTime = recentlyScheduledRef.current.get(data._tempKey);
          if (tempTriggerTime && tempTriggerTime > now) {
            const secondsUntilFire = Math.round((tempTriggerTime - now) / 1000);
            console.log('[Notifications] Suppressing notification (by temp key):', {
              identifier,
              tempKey: data._tempKey,
              expectedTriggerTime: new Date(tempTriggerTime).toISOString(),
              now: new Date(now).toISOString(),
              secondsUntilFire,
              title: notification.request.content.title,
            });
            return {
              shouldShowAlert: false,
              shouldPlaySound: false,
              shouldSetBadge: false,
            };
          }
        }
        
        // Also check the actual scheduled notification to verify its trigger time
        try {
          const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
          const scheduledNotification = scheduledNotifications.find(n => n.identifier === identifier);
          
          if (scheduledNotification) {
            const trigger = scheduledNotification.trigger as any;
            let scheduledTriggerTime: number | null = null;
            
            if (trigger && 'date' in trigger) {
              scheduledTriggerTime = new Date(trigger.date).getTime();
            } else if (trigger && 'seconds' in trigger) {
              scheduledTriggerTime = now + (trigger.seconds * 1000);
            } else if (trigger && 'hour' in trigger && 'minute' in trigger) {
              // For hour/minute triggers, calculate next occurrence
              const next = new Date();
              next.setHours(trigger.hour, trigger.minute, 0, 0);
              if (next.getTime() <= now) {
                next.setDate(next.getDate() + 1); // Tomorrow if time passed
              }
              scheduledTriggerTime = next.getTime();
            }
            
            // If notification is scheduled for the future, suppress it
            if (scheduledTriggerTime && scheduledTriggerTime > now) {
              const secondsUntilFire = Math.round((scheduledTriggerTime - now) / 1000);
              console.log('[Notifications] Suppressing notification (verified from scheduled list):', {
                identifier,
                scheduledTriggerTime: new Date(scheduledTriggerTime).toISOString(),
                now: new Date(now).toISOString(),
                secondsUntilFire,
                title: notification.request.content.title,
              });
              // Add to tracking if not already there
              if (!expectedTriggerTime) {
                recentlyScheduledRef.current.set(identifier, scheduledTriggerTime);
              }
              return {
                shouldShowAlert: false,
                shouldPlaySound: false,
                shouldSetBadge: false,
              };
            }
          }
        } catch (error) {
          console.warn('[Notifications] Error checking scheduled notifications:', error);
        }
        
        // If notification is in tracking but it's time to show, remove from tracking
        if (expectedTriggerTime && expectedTriggerTime <= now) {
          console.log('[Notifications] Notification is ready to show (scheduled time reached):', {
            identifier,
            expectedTriggerTime: new Date(expectedTriggerTime).toISOString(),
            now: new Date(now).toISOString(),
          });
          recentlyScheduledRef.current.delete(identifier);
        }
        
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        };
      },
    });

    // Handle notification taps (when app is in background/closed)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[Notifications] Notification tapped/opened app:', {
        title: response.notification.request.content.title,
        body: response.notification.request.content.body,
        data: response.notification.request.content.data,
        identifier: response.notification.request.identifier,
        actionIdentifier: response.actionIdentifier,
      });
      const { entityId, sphere } = response.notification.request.content.data as { entityId?: string; sphere?: LifeSphere };
      
      if (!entityId || !sphere) return;

      // Navigate to the appropriate detail screen based on sphere
      if (sphere === 'relationships') {
        router.push(`/relationship-detail?id=${entityId}`);
      } else if (sphere === 'friends') {
        router.push({
          pathname: '/friend-detail',
          params: { id: entityId },
        });
      } else if (sphere === 'family') {
        router.push({
          pathname: '/family-member-detail',
          params: { id: entityId },
        });
      }
    });

    // Handle notifications received while app is in foreground (user can tap to navigate)
    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      const trigger = notification.request.trigger as any;
      const now = Date.now();
      let triggerTime: number | null = null;
      
      if (trigger && 'date' in trigger) {
        triggerTime = new Date(trigger.date).getTime();
      } else if (trigger && 'seconds' in trigger) {
        triggerTime = now + (trigger.seconds * 1000);
      }
      
      const shouldFireNow = triggerTime ? triggerTime <= now : false;
      
      console.log('[Notifications] Notification received (foreground):', {
        title: notification.request.content.title,
        body: notification.request.content.body,
        data: notification.request.content.data,
        identifier: notification.request.identifier,
        triggerType: trigger?.type || 'unknown',
        triggerTime: triggerTime ? new Date(triggerTime).toISOString() : 'unknown',
        now: new Date(now).toISOString(),
        shouldFireNow,
        secondsUntilFire: triggerTime ? Math.round((triggerTime - now) / 1000) : null,
      });
      
      // If notification is scheduled for the future, it shouldn't fire now
      // This might indicate a bug or that the notification was already scheduled
      if (triggerTime && triggerTime > now) {
        console.warn('[Notifications] WARNING: Notification received but scheduled for future!', {
          scheduledFor: new Date(triggerTime).toISOString(),
          now: new Date(now).toISOString(),
          secondsUntilScheduled: Math.round((triggerTime - now) / 1000),
        });
      }
      
      // When notification is tapped in foreground, it will trigger the response listener above
      // This listener is mainly for handling the notification display
    });

    return () => {
      responseSubscription.remove();
      receivedSubscription.remove();
    };
  }, []);

  // Load persisted data on mount
  useEffect(() => {
    const init = async () => {
      // Capture current values for the reschedule key
      const currentMemoryCount = idealizedMemories.length;
      const currentIsSubscribed = isSubscribed;
      const { templates: storedTemplates, assignments: storedAssignments } = await loadState();

      if (storedTemplates.length === 0) {
        const seeded: NotificationTemplate = {
          id: `tpl_default_${Date.now()}`,
          name: 'Stay connected',
          frequencyDays: 1,
          timeOfDay: '09:00',
          condition: 'belowAvgMoments',
          defaultForSpheres: ['friends', 'family'],
        };

        const seededAssignments: AssignmentsState = {
          friends: { defaultTemplateId: seeded.id, overrides: {} },
          family: { defaultTemplateId: seeded.id, overrides: {} },
        };

        setTemplates([seeded]);
        setAssignments(seededAssignments);
        await persistState([seeded], seededAssignments);
        return;
      }

      setTemplates(storedTemplates);
      setAssignments(storedAssignments);
      
      // Mark initial load as complete
      isInitialLoadRef.current = false;
      
      // Check if we need to reschedule by comparing current state with last stored reschedule key
      const currentRescheduleKey = JSON.stringify({
        templateIds: storedTemplates.map(t => t.id).sort(),
        assignmentKeys: Object.keys(storedAssignments).sort(),
      });
      
      try {
        const lastRescheduleKey = await AsyncStorage.getItem(STORAGE_LAST_RESCHEDULE_KEY);
        
        // Only reschedule if data has changed or this is the first time
        if (lastRescheduleKey !== currentRescheduleKey) {
          hasInitialScheduledRef.current = true;
          // Store the new key
          await AsyncStorage.setItem(STORAGE_LAST_RESCHEDULE_KEY, currentRescheduleKey);
          // Also set it in the ref so auto-reschedule doesn't immediately trigger
          lastRescheduleRef.current = currentRescheduleKey;
          // Schedule notifications after initial load (with a small delay to ensure state is set)
          setTimeout(() => {
            refreshSchedules({ force: true });
          }, 1000);
        } else {
          // Data hasn't changed, so notifications should already be scheduled
          // Mark as scheduled and set the ref so auto-reschedule can work for future changes
          hasInitialScheduledRef.current = true;
          // Create a full reschedule key (including memories/subscription) for the ref
          // This prevents auto-reschedule from triggering immediately
          const fullRescheduleKey = JSON.stringify({
            templateIds: storedTemplates.map(t => t.id).sort(),
            assignmentKeys: Object.keys(storedAssignments).sort(),
            memoryCount: currentMemoryCount,
            isSubscribed: currentIsSubscribed,
          });
          lastRescheduleRef.current = fullRescheduleKey;
          console.log('[Notifications] Skipping reschedule on app open - data unchanged, notifications should already be scheduled');
        }
      } catch (error) {
        console.error('[Notifications] Error checking last reschedule key:', error);
        // On error, reschedule to be safe
        hasInitialScheduledRef.current = true;
        setTimeout(() => {
          refreshSchedules({ force: true });
        }, 1000);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Persist on change (debounced to prevent infinite loops)
  const persistTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);
  
  useEffect(() => {
    // Skip persistence on initial load
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }
    
    // Debounce persistence to prevent rapid writes
    if (persistTimeoutRef.current) {
      clearTimeout(persistTimeoutRef.current);
    }
    
    persistTimeoutRef.current = setTimeout(() => {
      persistState(templates, assignments);
    }, 300); // 300ms debounce
    
    return () => {
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current);
      }
    };
  }, [templates, assignments]);

  const ensurePermissions = useCallback(async () => {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.status === 'granted') return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.status === 'granted';
  }, []);

  const scheduleEntity = useCallback(
    async (entityName: string, entityId: string, sphere: LifeSphere, template: NotificationTemplate) => {
      console.log('[Notifications] scheduleEntity called:', { entityName, entityId, sphere, template: { ...template, id: template.id } });
      
      if (!template.frequencyDays || template.frequencyDays < 1) {
        console.log('[Notifications] scheduleEntity SKIPPED: invalid frequencyDays', template.frequencyDays);
        return;
      }
      
      const { initialSeconds, intervalSeconds } = getNextTriggerSeconds(template.timeOfDay, template.frequencyDays);

      const notificationMessage = (template as any).message || `Check in on ${entityName} today.`;

      try {
        // For daily notifications, use hour/minute trigger (better iOS support and more reliable)
        // For other intervals, schedule a one-time notification first, then a repeating one
        if (template.frequencyDays === 1) {
          // Daily: schedule first notification using calculated initialSeconds (handles today/tomorrow correctly)
          // Then schedule repeating notification for subsequent days
          const { hour, minute } = parseTime(template.timeOfDay);
          
          // Schedule first notification - this will fire today if time is later, or tomorrow if time has passed
          // IMPORTANT: Ensure minimum delay to prevent immediate firing
          const minDelaySeconds = 60; // 1 minute minimum
          const safeInitialSeconds = Math.max(minDelaySeconds, initialSeconds);
          const now = new Date();
          
          const triggerTime = new Date(now.getTime() + safeInitialSeconds * 1000);
          const triggerTimeMs = triggerTime.getTime();
          
          // Generate a temporary tracking key BEFORE scheduling to prevent race condition
          // We'll use entityId+sphere as a temporary key, then update with actual notification ID
          const tempKey = `${entityId}_${sphere}_first`;
          recentlyScheduledRef.current.set(tempKey, triggerTimeMs);
          
          // Track this notification so we can prevent immediate display if it's scheduled for the future
          const firstNotification = await Notifications.scheduleNotificationAsync({
            content: {
              title: template.name || 'Stay connected',
              body: notificationMessage,
              data: {
                entityId,
                sphere,
                _tempKey: tempKey, // Include temp key in data for handler lookup
              },
            },
            trigger: {
              seconds: safeInitialSeconds,
              repeats: false,
            },
          });
          
          // Store the expected trigger time with actual notification ID
          recentlyScheduledRef.current.delete(tempKey);
          recentlyScheduledRef.current.set(firstNotification, triggerTimeMs);
          
          // Clean up the tracking after the notification should have fired (with some buffer)
          setTimeout(() => {
            recentlyScheduledRef.current.delete(firstNotification);
          }, (safeInitialSeconds * 1000) + 60000); // 1 minute after expected fire time
          
          const secondsUntilFire = Math.round((triggerTime.getTime() - now.getTime()) / 1000);
          
          console.log('[Notifications] First daily notification scheduled:', {
            notificationId: firstNotification,
            entityName,
            entityId,
            initialSeconds,
            safeInitialSeconds,
            triggerTime: triggerTime.toISOString(),
            now: now.toISOString(),
            secondsUntilFire,
            isToday: safeInitialSeconds < 86400,
            isTomorrow: safeInitialSeconds >= 86400,
          });
          
          if (secondsUntilFire < minDelaySeconds) {
            console.warn('[Notifications] WARNING: Notification scheduled to fire too soon!', {
              secondsUntilFire,
              minDelaySeconds,
              triggerTime: triggerTime.toISOString(),
              now: now.toISOString(),
            });
          }
          
          // Schedule repeating notification for subsequent days
          // IMPORTANT: Check if the scheduled time has already passed today
          // We can't use hour/minute if time has passed because that would fire immediately
          const scheduledTimeToday = new Date(now);
          scheduledTimeToday.setHours(hour, minute, 0, 0);
          const timeHasPassedToday = scheduledTimeToday.getTime() <= now.getTime();
          
          if (timeHasPassedToday) {
            // Time has passed today - schedule repeating notification to start the day after the first one
            // (which is tomorrow, so repeating starts day after tomorrow, then repeats daily)
            const repeatingTriggerTime = now.getTime() + (initialSeconds + intervalSeconds) * 1000;
            
            // Track repeating notification BEFORE scheduling to prevent race condition
            const tempRepeatingKey = `${entityId}_${sphere}_repeating`;
            recentlyScheduledRef.current.set(tempRepeatingKey, repeatingTriggerTime);
            
            const repeatingNotification = await Notifications.scheduleNotificationAsync({
              content: {
                title: template.name || 'Stay connected',
                body: notificationMessage,
                data: {
                  entityId,
                  sphere,
                  _tempKey: tempRepeatingKey,
                },
              },
              trigger: {
                seconds: initialSeconds + intervalSeconds, // Start day after first notification
                repeats: true,
              },
            });
            
            // Update tracking with actual notification ID
            recentlyScheduledRef.current.delete(tempRepeatingKey);
            recentlyScheduledRef.current.set(repeatingNotification, repeatingTriggerTime);
            setTimeout(() => {
              recentlyScheduledRef.current.delete(repeatingNotification);
            }, ((initialSeconds + intervalSeconds) * 1000) + 60000);
            
            console.log('[Notifications] Daily repeating notification scheduled (time passed, starting day after first):', {
              notificationId: repeatingNotification,
              entityName,
              entityId,
              startsAt: new Date(repeatingTriggerTime).toISOString(),
            });
          } else {
            // Time is later today - can safely use hour/minute for repeating
            // For hour/minute triggers, calculate when it will first fire
            const scheduledTimeToday = new Date(now);
            scheduledTimeToday.setHours(hour, minute, 0, 0);
            const repeatingTriggerTime = scheduledTimeToday.getTime() > now.getTime() 
              ? scheduledTimeToday.getTime() 
              : scheduledTimeToday.getTime() + 86400000; // Tomorrow if time passed
            
            // Track repeating notification BEFORE scheduling if scheduled for future
            const tempRepeatingKey = `${entityId}_${sphere}_repeating`;
            if (repeatingTriggerTime > now.getTime()) {
              recentlyScheduledRef.current.set(tempRepeatingKey, repeatingTriggerTime);
            }
            
            const repeatingNotification = await Notifications.scheduleNotificationAsync({
              content: {
                title: template.name || 'Stay connected',
                body: notificationMessage,
                data: {
                  entityId,
                  sphere,
                  _tempKey: tempRepeatingKey,
                },
              },
              trigger: {
                hour,
                minute,
                repeats: true,
              },
            });
            
            // Update tracking with actual notification ID
            if (repeatingTriggerTime > now.getTime()) {
              recentlyScheduledRef.current.delete(tempRepeatingKey);
              recentlyScheduledRef.current.set(repeatingNotification, repeatingTriggerTime);
              setTimeout(() => {
                recentlyScheduledRef.current.delete(repeatingNotification);
              }, (repeatingTriggerTime - now.getTime()) + 60000);
            }
            
            console.log('[Notifications] Daily repeating notification scheduled (using hour/minute):', {
              notificationId: repeatingNotification,
              entityName,
              entityId,
              hour,
              minute,
              firstFireTime: new Date(repeatingTriggerTime).toISOString(),
            });
          }
        } else {
          // Weekly or other interval: schedule first notification, then repeating
          const firstNotification = await Notifications.scheduleNotificationAsync({
            content: {
              title: template.name || 'Stay connected',
              body: notificationMessage,
              data: {
                entityId,
                sphere,
              },
            },
            trigger: {
              seconds: initialSeconds,
              repeats: false,
            },
          });
          console.log('[Notifications] First notification scheduled:', {
            notificationId: firstNotification,
            entityName,
            entityId,
            initialSeconds,
            triggerTime: new Date(Date.now() + initialSeconds * 1000).toISOString(),
          });

          // Schedule repeating notification to start after the first one
          // Note: with repeats: true, seconds is the interval, so we schedule it to start
          // at initialSeconds + intervalSeconds, then repeat every intervalSeconds
          const repeatingNotification = await Notifications.scheduleNotificationAsync({
            content: {
              title: template.name || 'Stay connected',
              body: notificationMessage,
              data: {
                entityId,
                sphere,
              },
            },
            trigger: {
              seconds: initialSeconds + intervalSeconds,
              repeats: true,
            },
          });
          console.log('[Notifications] Repeating notification scheduled:', {
            notificationId: repeatingNotification,
            entityName,
            entityId,
            intervalSeconds,
            intervalDays: template.frequencyDays,
            firstRepeatAt: new Date(Date.now() + (initialSeconds + intervalSeconds) * 1000).toISOString(),
          });
        }
      } catch (error) {
        console.error('[Notifications] Error scheduling notification:', error, { entityName, entityId, sphere });
      }
    },
    []
  );

  const evaluateCondition = useCallback(
    (template: NotificationTemplate, sphere: LifeSphere, entityId: string): boolean => {
      const memoriesForEntity = idealizedMemories.filter((m) => m.entityId === entityId && m.sphere === sphere);
      console.log('[Notifications] evaluateCondition:', {
        entityId,
        sphere,
        condition: template.condition,
        memoryCount: memoriesForEntity.length,
      });

      if (template.condition === 'none') {
        console.log('[Notifications] Condition check: none -> TRUE');
        return true;
      }

      if (template.condition === 'noRecent' && template.noRecentDays) {
        const last = latestMemoryDate(memoriesForEntity);
        if (!last) {
          console.log('[Notifications] Condition check: noRecent -> TRUE (no memories)');
          return true;
        }
        const diffDays = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
        const result = diffDays >= template.noRecentDays;
        console.log('[Notifications] Condition check: noRecent ->', result, { diffDays: diffDays.toFixed(2), threshold: template.noRecentDays });
        return result;
      }

      if (template.condition === 'belowAvgMoments' && (sphere === 'friends' || sphere === 'family')) {
        const entitiesInSphere =
          sphere === 'friends'
            ? friends.map((f) => f.id)
            : sphere === 'family'
              ? familyMembers.map((f) => f.id)
              : [];
        // Exclude the current entity from the average calculation
        const otherEntities = entitiesInSphere.filter((id) => id !== entityId);
        if (otherEntities.length === 0) {
          console.log('[Notifications] Condition check: belowAvgMoments -> FALSE (no other entities in sphere to compare)');
          return false;
        }
        // Calculate totals for OTHER entities only (excluding current entity)
        const totals = otherEntities.map((id) =>
          countMoments(idealizedMemories.filter((m) => m.entityId === id && m.sphere === sphere))
        );
        const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
        const entityTotal = countMoments(memoriesForEntity);
        const result = entityTotal < avg;
        console.log('[Notifications] Condition check: belowAvgMoments ->', result, { 
          entityTotal, 
          avg: avg.toFixed(2),
          otherEntitiesCount: otherEntities.length,
          entityId,
        });
        return result;
      }

      if (template.condition === 'relationshipLessThanJob' && sphere === 'relationships') {
        const currentRelationship = profiles.find((p) => !p.relationshipEndDate);
        if (!currentRelationship || currentRelationship.id !== entityId) {
          console.log('[Notifications] Condition check: relationshipLessThanJob -> FALSE', { 
            hasCurrent: !!currentRelationship, 
            matchesEntity: currentRelationship?.id === entityId 
          });
          return false;
        }

        const relationshipMems = idealizedMemories.filter((m) => m.entityId === currentRelationship.id && m.sphere === 'relationships');
        const careerMems = idealizedMemories.filter((m) => m.sphere === 'career');

        const careerTotal = countMoments(careerMems);
        const relationshipTotal = countMoments(relationshipMems);
        const result = relationshipTotal < careerTotal;
        console.log('[Notifications] Condition check: relationshipLessThanJob ->', result, { relationshipTotal, careerTotal });
        return result;
      }

      if (template.condition === 'relationshipLessThanFriendsAvg' && sphere === 'relationships') {
        const currentRelationship = profiles.find((p) => !p.relationshipEndDate);
        if (!currentRelationship || currentRelationship.id !== entityId) {
          console.log('[Notifications] Condition check: relationshipLessThanFriendsAvg -> FALSE', { 
            hasCurrent: !!currentRelationship, 
            matchesEntity: currentRelationship?.id === entityId 
          });
          return false;
        }

        const relationshipMems = idealizedMemories.filter((m) => m.entityId === currentRelationship.id && m.sphere === 'relationships');
        const friendsEntities = friends.map((f) => f.id);
        if (friendsEntities.length === 0) {
          console.log('[Notifications] Condition check: relationshipLessThanFriendsAvg -> FALSE (no friends)');
          return false;
        }
        const friendsTotals = friendsEntities.map((id) =>
          countMoments(idealizedMemories.filter((m) => m.entityId === id && m.sphere === 'friends'))
        );
        const avgFriends = friendsTotals.reduce((a, b) => a + b, 0) / friendsTotals.length;
        const relationshipTotal = countMoments(relationshipMems);
        const result = relationshipTotal < avgFriends;
        console.log('[Notifications] Condition check: relationshipLessThanFriendsAvg ->', result, { relationshipTotal, avgFriends: avgFriends.toFixed(2) });
        return result;
      }

      if (template.condition === 'relationshipNoRecent' && sphere === 'relationships') {
        const currentRelationship = profiles.find((p) => !p.relationshipEndDate);
        if (!currentRelationship || currentRelationship.id !== entityId) {
          console.log('[Notifications] Condition check: relationshipNoRecent -> FALSE', { 
            hasCurrent: !!currentRelationship, 
            matchesEntity: currentRelationship?.id === entityId 
          });
          return false;
        }
        const last = latestMemoryDate(memoriesForEntity);
        if (!last) {
          console.log('[Notifications] Condition check: relationshipNoRecent -> TRUE (no memories)');
          return true;
        }
        const threshold = template.noRecentDays ?? 7;
        const diffDays = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
        const result = diffDays >= threshold;
        console.log('[Notifications] Condition check: relationshipNoRecent ->', result, { diffDays: diffDays.toFixed(2), threshold });
        return result;
      }

      console.log('[Notifications] Condition check: UNKNOWN CONDITION -> FALSE', { condition: template.condition });
      return false;
    },
    [familyMembers, friends, idealizedMemories, profiles]
  );

  const resolveTemplateFor = useCallback(
    (sphere: LifeSphere, entityId: string): NotificationTemplate | undefined => {
      const sphereAssignment = assignments[sphere];
      const override = sphereAssignment?.overrides?.[entityId];
      
      console.log('[Notifications] resolveTemplateFor:', {
        sphere,
        entityId,
        hasOverride: !!override,
        overrideKind: override?.kind,
        hasDefaultTemplate: !!sphereAssignment?.defaultTemplateId,
      });
      
      // If there's an explicit override, use it
      if (override) {
        if (override.kind === 'none') {
          console.log('[Notifications] resolveTemplateFor: override is "none" -> undefined (notifications OFF)');
          return undefined;
        }
        if (override.kind === 'custom') {
          console.log('[Notifications] resolveTemplateFor: found custom override', { template: override.template });
          return override.template;
        }
        if (override.kind === 'template') {
          const template = templates.find((t) => t.id === override.templateId);
          console.log('[Notifications] resolveTemplateFor: found template override', { templateId: override.templateId, found: !!template });
          return template;
        }
      }
      
      // IMPORTANT: If there's NO override at all, treat it as "notifications OFF"
      // Don't fall back to defaults - user must explicitly enable notifications
      console.log('[Notifications] resolveTemplateFor: NO override found -> undefined (notifications OFF by default)');
      return undefined;
    },
    [assignments, templates]
  );

  // Helper to build reschedule key from assignments (used in both refreshSchedules and auto-reschedule)
  const buildRescheduleKey = useCallback(() => {
    const assignmentContent = Object.keys(assignments).map(sphere => {
      const sphereAssign = assignments[sphere as LifeSphere];
      if (!sphereAssign) return `${sphere}:null`;
      const overrideKeys = Object.keys(sphereAssign.overrides || {}).sort();
      const overrideContent = overrideKeys.map(entityId => {
        const override = sphereAssign.overrides?.[entityId];
        if (!override) return `${entityId}:null`;
        if (override.kind === 'none') return `${entityId}:none`;
        if (override.kind === 'custom') {
          const tpl = override.template;
          return `${entityId}:custom:${tpl.timeOfDay}:${tpl.frequencyDays}:${tpl.condition}`;
        }
        return `${entityId}:template:${override.templateId}`;
      }).join('|');
      return `${sphere}:${sphereAssign.defaultTemplateId || 'none'}:${overrideContent}`;
    }).sort().join('||');
    
    return JSON.stringify({
      templateIds: templates.map(t => t.id).sort(),
      assignmentContent,
      memoryCount: idealizedMemories.length,
      isSubscribed,
    });
  }, [assignments, templates, idealizedMemories.length, isSubscribed]);

  const refreshSchedules = useCallback(async (opts?: { force?: boolean }) => {
    console.log('[Notifications] refreshSchedules: START', opts);

    // Build the current reschedule key (same shape as auto-reschedule)
    const rescheduleKey = buildRescheduleKey();

    // If nothing changed and we've already scheduled once, skip cancelling/rescheduling
    if (!opts?.force && hasInitialScheduledRef.current && rescheduleKey === lastRescheduleRef.current) {
      console.log('[Notifications] refreshSchedules: SKIPPED - no meaningful changes', {
        rescheduleKey,
        lastRescheduleKey: lastRescheduleRef.current,
      });
      return;
    }

    // Track the latest key so subsequent calls can skip
    lastRescheduleRef.current = rescheduleKey;

    setIsScheduling(true);
    try {
      // Log currently scheduled notifications before cancelling (for debugging)
      const scheduledBefore = await Notifications.getAllScheduledNotificationsAsync();
      console.log('[Notifications] refreshSchedules: Currently scheduled notifications:', {
        count: scheduledBefore.length,
        notifications: scheduledBefore.map(n => ({
          identifier: n.identifier,
          trigger: n.trigger,
          content: n.content,
        })),
      });
      
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('[Notifications] refreshSchedules: Cancelled all existing notifications');
      
      const granted = await ensurePermissions();
      if (!granted) {
        console.log('[Notifications] refreshSchedules: SKIPPED - permissions not granted');
        return;
      }
      console.log('[Notifications] refreshSchedules: Permissions granted');

      // Log the data we have available
      console.log('[Notifications] refreshSchedules: Data available', {
        friendsCount: friends.length,
        familyCount: familyMembers.length,
        profilesCount: profiles.length,
        assignmentsKeys: Object.keys(assignments),
        hasAssignments: Object.keys(assignments).length > 0,
        assignmentsDetails: assignments,
      });

      const targets: { name: string; sphere: LifeSphere; entityId: string }[] = [];

      friends.forEach((f) => targets.push({ name: f.name, sphere: 'friends', entityId: f.id }));
      familyMembers.forEach((f) => targets.push({ name: f.name, sphere: 'family', entityId: f.id }));
      // Only include current partners (no relationshipEndDate)
      profiles.filter((p) => !p.relationshipEndDate).forEach((p) => targets.push({ name: p.name, sphere: 'relationships', entityId: p.id }));

      // If no targets and no assignments, skip scheduling (data not loaded yet)
      if (targets.length === 0 && Object.keys(assignments).length === 0) {
        console.log('[Notifications] refreshSchedules: SKIPPED - no targets and no assignments (data not loaded yet)');
        return;
      }

      console.log('[Notifications] refreshSchedules: Processing targets', {
        totalTargets: targets.length,
        friends: friends.length,
        family: familyMembers.length,
        currentPartners: profiles.filter((p) => !p.relationshipEndDate).length,
        allProfiles: profiles.length,
        allProfilesDetails: profiles.map(p => ({
          id: p.id,
          name: p.name,
          hasEndDate: !!p.relationshipEndDate,
          endDate: p.relationshipEndDate,
        })),
        targetsDetails: targets.map(t => ({
          name: t.name,
          sphere: t.sphere,
          entityId: t.entityId,
        })),
      });

      console.log('[Notifications] refreshSchedules: Current assignments state', {
        assignments: JSON.stringify(assignments, null, 2),
        assignmentsKeys: Object.keys(assignments),
        friendsAssignments: assignments.friends,
        familyAssignments: assignments.family,
        relationshipsAssignments: assignments.relationships,
      });
      
      for (const target of targets) {
        console.log('[Notifications] refreshSchedules: Processing target', target);
        const tpl = resolveTemplateFor(target.sphere, target.entityId);
        console.log('[Notifications] refreshSchedules: Template resolved', {
          target,
          hasTemplate: !!tpl,
          templateDetails: tpl ? {
            id: tpl.id,
            name: tpl.name,
            timeOfDay: tpl.timeOfDay,
            frequencyDays: tpl.frequencyDays,
            condition: tpl.condition,
            message: (tpl as any).message,
          } : null,
        });
        if (!tpl) {
          console.log('[Notifications] refreshSchedules: SKIPPED - no template found', target);
          continue;
        }
        const shouldSend = evaluateCondition(tpl, target.sphere, target.entityId);
        console.log('[Notifications] refreshSchedules: Condition evaluated', {
          target,
          shouldSend,
          condition: tpl.condition,
        });
        if (!shouldSend) {
          console.log('[Notifications] refreshSchedules: SKIPPED - condition not met', target);
          continue;
        }
        console.log('[Notifications] refreshSchedules: Scheduling notification', target);
        await scheduleEntity(target.name, target.entityId, target.sphere, tpl);
      }
      console.log('[Notifications] refreshSchedules: COMPLETE');
    } catch (error) {
      console.error('[Notifications] refreshSchedules: ERROR', error);
    } finally {
      setIsScheduling(false);
    }
  }, [ensurePermissions, evaluateCondition, familyMembers, friends, isSubscribed, profiles, resolveTemplateFor, scheduleEntity, buildRescheduleKey]);

  // Store refreshSchedules in a ref to avoid dependency issues
  const refreshSchedulesRef = useRef(refreshSchedules);
  useEffect(() => {
    refreshSchedulesRef.current = refreshSchedules;
  }, [refreshSchedules]);

  // Track if we've done initial scheduling
  const hasInitialScheduledRef = useRef(false);
  
  // Auto-reschedule when dependencies change (debounced to prevent infinite loops)
  const lastRescheduleRef = useRef<string>('');
  const rescheduleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Skip auto-reschedule until initial scheduling is complete - we'll schedule manually after load
    if (!hasInitialScheduledRef.current) {
      return;
    }
    
    // Create a stable key from the dependencies that matter (using the same helper)
    const rescheduleKey = buildRescheduleKey();
    
    console.log('[Notifications] Auto-reschedule check:', {
      rescheduleKey,
      lastRescheduleKey: lastRescheduleRef.current,
      keysMatch: rescheduleKey === lastRescheduleRef.current,
    });
    
    // Only reschedule if something meaningful changed
    if (rescheduleKey === lastRescheduleRef.current) {
      console.log('[Notifications] Auto-reschedule: SKIPPED - no changes detected');
      return;
    }
    
    console.log('[Notifications] Auto-reschedule: CHANGE DETECTED, will reschedule');
    lastRescheduleRef.current = rescheduleKey;
    
    // Debounce to prevent rapid re-scheduling
    if (rescheduleTimeoutRef.current) {
      clearTimeout(rescheduleTimeoutRef.current);
    }
    
    rescheduleTimeoutRef.current = setTimeout(async () => {
      // Store the reschedule key before rescheduling
      try {
        await AsyncStorage.setItem(STORAGE_LAST_RESCHEDULE_KEY, rescheduleKey);
      } catch (error) {
        console.error('[Notifications] Error storing reschedule key:', error);
      }
      // Use a longer delay to ensure state has updated (especially after setOverride)
      refreshSchedulesRef.current({ force: false });
    }, 1000); // 1 second debounce - gives time for state updates to propagate
    
    return () => {
      if (rescheduleTimeoutRef.current) {
        clearTimeout(rescheduleTimeoutRef.current);
      }
    };
  }, [templates, assignments, idealizedMemories, isSubscribed, buildRescheduleKey]);

  const addTemplate = useCallback(
    async (tpl: Omit<NotificationTemplate, 'id'>) => {
      const newTemplate: NotificationTemplate = { ...tpl, id: `tpl_${Date.now()}` };
      setTemplates((prev) => [...prev, newTemplate]);
      return newTemplate;
    },
    []
  );

  const updateTemplate = useCallback(async (tpl: NotificationTemplate) => {
    setTemplates((prev) => prev.map((t) => (t.id === tpl.id ? tpl : t)));
  }, []);

  const deleteTemplate = useCallback(
    async (templateId: string) => {
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      setAssignments((prev) => {
        const next: AssignmentsState = {};
        Object.entries(prev).forEach(([sphere, assignment]) => {
          const safeSphere = sphere as LifeSphere;
          if (!assignment) return;
          const cleanOverrides = Object.fromEntries(
            Object.entries(assignment.overrides || {}).filter(([, choice]) => {
              if (choice.kind === 'template') {
                return choice.templateId !== templateId;
              }
              return true;
            })
          );
          next[safeSphere] = {
            defaultTemplateId: assignment.defaultTemplateId === templateId ? undefined : assignment.defaultTemplateId,
            overrides: cleanOverrides,
          };
        });
        return next;
      });
    },
    []
  );

  const setSphereDefault = useCallback(async (sphere: LifeSphere, templateId?: string) => {
    setAssignments((prev) => ({
      ...prev,
      [sphere]: {
        defaultTemplateId: templateId,
        overrides: prev[sphere]?.overrides || {},
      },
    }));
  }, []);

  // Helper to cancel notifications for a specific entity
  const cancelEntityNotifications = useCallback(async (sphere: LifeSphere, entityId: string) => {
    try {
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      const entityNotifications = allScheduled.filter(
        (notification) => {
          const data = notification.request.content.data as { entityId?: string; sphere?: LifeSphere };
          return data.entityId === entityId && data.sphere === sphere;
        }
      );
      
      if (entityNotifications.length > 0) {
        console.log('[Notifications] cancelEntityNotifications: Cancelling notifications for entity', {
          sphere,
          entityId,
          count: entityNotifications.length,
          notificationIds: entityNotifications.map(n => n.identifier),
        });
        await Promise.all(
          entityNotifications.map((notification) =>
            Notifications.cancelScheduledNotificationAsync(notification.identifier)
          )
        );
        console.log('[Notifications] cancelEntityNotifications: Cancelled notifications for entity', {
          sphere,
          entityId,
        });
      }
    } catch (error) {
      console.error('[Notifications] cancelEntityNotifications: Error cancelling notifications', error);
    }
  }, []);

  const setOverride = useCallback(async (sphere: LifeSphere, entityId: string, choice: EntityNotificationChoice) => {
    console.log('[Notifications] setOverride: CALLED', {
      sphere,
      entityId,
      choiceKind: choice.kind,
      hasTemplate: choice.kind === 'custom' ? !!choice.template : false,
      templateDetails: choice.kind === 'custom' ? {
        name: choice.template.name,
        timeOfDay: choice.template.timeOfDay,
        frequencyDays: choice.template.frequencyDays,
        condition: choice.template.condition,
        message: (choice.template as any).message,
      } : undefined,
    });
    
    // If setting to 'none', immediately cancel notifications for this entity
    if (choice.kind === 'none') {
      console.log('[Notifications] setOverride: Setting to "none", cancelling entity notifications immediately');
      await cancelEntityNotifications(sphere, entityId);
    }
    
    setAssignments((prev) => {
      const newAssignments = {
        ...prev,
        [sphere]: {
          defaultTemplateId: prev[sphere]?.defaultTemplateId,
          overrides: { ...(prev[sphere]?.overrides || {}), [entityId]: choice },
        },
      };
      console.log('[Notifications] setOverride: Updated assignments', {
        sphere,
        entityId,
        allOverridesForSphere: Object.keys(newAssignments[sphere]?.overrides || {}),
        newChoice: newAssignments[sphere]?.overrides?.[entityId],
      });
      return newAssignments;
    });
    
    // If setting to 'none', also trigger refreshSchedules to ensure cleanup
    // (though we already cancelled above, this ensures everything is in sync)
    if (choice.kind === 'none' && hasInitialScheduledRef.current) {
      console.log('[Notifications] setOverride: Triggering refreshSchedules after setting to "none"');
      // Use a delay to ensure state has updated
      setTimeout(() => {
        refreshSchedulesRef.current({ force: true });
      }, 500);
    } else if (choice.kind === 'custom' && hasInitialScheduledRef.current) {
      // When enabling notifications, also trigger refreshSchedules after a delay
      // to ensure the new assignment is included
      console.log('[Notifications] setOverride: Triggering refreshSchedules after setting custom notification');
      setTimeout(() => {
        refreshSchedulesRef.current({ force: true });
      }, 500);
    }
    
    // Note: Persistence is handled by the useEffect that watches assignments
  }, [cancelEntityNotifications]);

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
    [assignments, isScheduling, templates, refreshSchedules, addTemplate, updateTemplate, deleteTemplate, setSphereDefault, setOverride]
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
