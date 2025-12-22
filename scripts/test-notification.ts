/**
 * Test script to manually trigger a test notification
 * Run this from the dev console or add it to a debug screen
 */
import * as Notifications from 'expo-notifications';

export async function scheduleTestNotification(seconds: number = 10) {
  try {
    // Check permissions
    const { status } = await Notifications.getPermissionsAsync();

    if (status !== 'granted') {
      console.log('[Test] Notification permissions not granted:', status);
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') {
        console.log('[Test] Failed to get notification permissions');
        return;
      }
    }

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
  (global as any).testNotification = scheduleTestNotification;
  (global as any).listNotifications = listScheduledNotifications;
  (global as any).cancelAllNotifications = cancelAllNotifications;}
