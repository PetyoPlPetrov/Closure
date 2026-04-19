/**
 * Test script to manually trigger a test notification
 * Run this from the dev console or add it to a debug screen
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const MOMENT_SUMMARIES_KEY = '@sferas:moment_notification_summaries';

type MomentSummary = {
  id: string;
  momentId: string;
  memoryId: string;
  entityId: string;
  sphere: 'relationships' | 'career' | 'family' | 'friends' | 'hobbies';
  momentType: 'lesson' | 'sunny';
  momentText: string;
  notificationMessage: string;
};

async function ensureNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  console.log('[Test] Notification permissions not granted:', status);
  const { status: newStatus } = await Notifications.requestPermissionsAsync();
  if (newStatus !== 'granted') {
    console.log('[Test] Failed to get notification permissions');
    return false;
  }
  return true;
}

export async function scheduleTestNotification(seconds: number = 10) {
  try {
    if (!(await ensureNotificationPermission())) return;

    // Schedule a test notification
    const triggerDate = new Date(Date.now() + seconds * 1000);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification',
        body: `This notification was scheduled ${seconds} seconds ago`,
        data: { test: true },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    console.log(`[Test] Scheduled test notification (ID: ${notificationId}) for ${triggerDate.toLocaleTimeString()}`);
    console.log(`[Test] Will fire in ${seconds} seconds`);

    return notificationId;
  } catch (error) {
    console.error('[Test] Failed to schedule notification:', error);
  }
}

export async function scheduleMomentNudgeTapTests(startInSeconds: number = 8, gapSeconds: number = 7) {
  try {
    if (!(await ensureNotificationPermission())) return;

    const raw = await AsyncStorage.getItem(MOMENT_SUMMARIES_KEY);
    const summaries = (raw ? JSON.parse(raw) : []) as MomentSummary[];
    const lesson = summaries.find((s) => s.momentType === 'lesson');
    const sunny = summaries.find((s) => s.momentType === 'sunny');

    if (!lesson || !sunny) {
      console.log('[Test] Need both lesson and sunny moment summaries first.');
      console.log('[Test] Current summaries:', {
        total: summaries.length,
        lessons: summaries.filter((s) => s.momentType === 'lesson').length,
        sunny: summaries.filter((s) => s.momentType === 'sunny').length,
      });
      return;
    }

    const lessonDate = new Date(Date.now() + Math.max(2, startInSeconds) * 1000);
    const sunnyDate = new Date(lessonDate.getTime() + Math.max(2, gapSeconds) * 1000);

    const lessonId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Sferas (Test Lesson Nudge)',
        body: lesson.notificationMessage || lesson.momentText,
        data: {
          type: 'moment_nudge',
          scheduleId: 'test_lesson',
          momentType: 'lesson',
          momentId: lesson.momentId,
          momentText: lesson.momentText,
          memoryId: lesson.memoryId,
          entityId: lesson.entityId,
          sphere: lesson.sphere,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: lessonDate,
      },
    });

    const sunnyId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Sferas (Test Sunny Nudge)',
        body: sunny.notificationMessage || sunny.momentText,
        data: {
          type: 'moment_nudge',
          scheduleId: 'test_sunny',
          momentType: 'sunny',
          momentId: sunny.momentId,
          momentText: sunny.momentText,
          memoryId: sunny.memoryId,
          entityId: sunny.entityId,
          sphere: sunny.sphere,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: sunnyDate,
      },
    });

    console.log('[Test] Scheduled moment nudge tap tests:');
    console.log(`  lesson (${lessonId}) -> ${lessonDate.toLocaleTimeString()}`);
    console.log(`  sunny  (${sunnyId}) -> ${sunnyDate.toLocaleTimeString()}`);
    console.log('[Test] Tap lesson notification first, then sunny notification.');
    return { lessonId, sunnyId };
  } catch (error) {
    console.error('[Test] Failed to schedule moment nudge tests:', error);
  }
}

export async function listScheduledNotifications() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log('\n=== All Scheduled Notifications ===');
    console.log(`Total: ${scheduled.length}`);

    if (scheduled.length === 0) {
      console.log('No scheduled notifications found');
      return;
    }

    scheduled.forEach((notification, index) => {
      const trigger = notification.trigger as any;
      const triggerDate = trigger.type === 'date' ? new Date(trigger.value) : null;
      const secondsUntil = triggerDate ? Math.floor((triggerDate.getTime() - Date.now()) / 1000) : null;

      console.log(`\n[${index + 1}] ${notification.content.title}`);
      console.log(`  ID: ${notification.identifier}`);
      console.log(`  Body: ${notification.content.body}`);
      console.log(`  Trigger: ${triggerDate ? triggerDate.toLocaleString() : 'N/A'}`);
      console.log(`  In: ${secondsUntil !== null ? `${secondsUntil}s` : 'N/A'}`);
    });

    console.log('\n===================================\n');
  } catch (error) {
    console.error('[Test] Failed to list notifications:', error);
  }
}

export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[Test] Cancelled all scheduled notifications');
  } catch (error) {
    console.error('[Test] Failed to cancel notifications:', error);
  }
}

// Make functions available globally in dev mode for easy testing
if (__DEV__) {
  const root = globalThis as any;
  root.testNotification = scheduleTestNotification;
  root.testMomentNudges = scheduleMomentNudgeTapTests;
  root.listNotifications = listScheduledNotifications;
  root.cancelAllNotifications = cancelAllNotifications;

  // Extra aliases for environments that expose `global` separately.
  if (typeof global !== 'undefined') {
    (global as any).testNotification = scheduleTestNotification;
    (global as any).testMomentNudges = scheduleMomentNudgeTapTests;
    (global as any).listNotifications = listScheduledNotifications;
    (global as any).cancelAllNotifications = cancelAllNotifications;
  }

  console.log('[Test] Notification helpers ready: testMomentNudges(), listNotifications(), cancelAllNotifications()');
}
