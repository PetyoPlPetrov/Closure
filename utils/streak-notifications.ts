/**
 * Streak Feature - Notification Scheduling
 */

import * as Notifications from 'expo-notifications';
import { getBadgeForStreak, getStreakData, isStreakAtRisk } from './streak-manager';

const STREAK_REMINDER_ID = 'streak-reminder';
const STREAK_WARNING_ID = 'streak-warning';

/**
 * Schedule daily reminder to log moments (8 PM)
 */
export async function scheduleStreakReminder(): Promise<void> {
  try {
    // Cancel existing reminder
    await Notifications.cancelScheduledNotificationAsync(STREAK_REMINDER_ID);

    const streakData = await getStreakData();

    // Only schedule if user has an active streak
    if (streakData.currentStreak === 0) {
      return;
    }

    // Check if at risk (haven't logged today)
    const atRisk = await isStreakAtRisk();
    if (!atRisk) {
      // Already logged today, don't need reminder
      return;
    }

    // Schedule for 8 PM today
    const now = new Date();
    const trigger = new Date();
    trigger.setHours(20, 0, 0, 0); // 8 PM

    // If 8 PM already passed, don't schedule (will check tomorrow)
    if (trigger <= now) {
      return;
    }

    const currentBadge = getBadgeForStreak(streakData.currentStreak);

    await Notifications.scheduleNotificationAsync({
      identifier: STREAK_REMINDER_ID,
      content: {
        title: 'Keep your streak alive! 🔥',
        body: `You're at ${streakData.currentStreak} days with your ${currentBadge?.name || 'Streak'} badge. Create a new memory before midnight!`,
        data: { type: 'streak_reminder' },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger,
    });
  } catch (error) {
    console.error('[StreakNotifications] Error scheduling reminder:', error);
  }
}

/**
 * Schedule warning notification (10 PM - last chance)
 */
export async function scheduleStreakWarning(): Promise<void> {
  try {
    // Cancel existing warning
    await Notifications.cancelScheduledNotificationAsync(STREAK_WARNING_ID);

    const streakData = await getStreakData();

    // Only schedule if user has an active streak
    if (streakData.currentStreak === 0) {
      return;
    }

    // Check if at risk
    const atRisk = await isStreakAtRisk();
    if (!atRisk) {
      return;
    }

    // Schedule for 10 PM today
    const now = new Date();
    const trigger = new Date();
    trigger.setHours(22, 0, 0, 0); // 10 PM

    // If 10 PM already passed, don't schedule
    if (trigger <= now) {
      return;
    }

    const currentBadge = getBadgeForStreak(streakData.currentStreak);

    await Notifications.scheduleNotificationAsync({
      identifier: STREAK_WARNING_ID,
      content: {
        title: '⚠️ Streak ending soon!',
        body: `Only 2 hours left to keep your ${streakData.currentStreak}-day ${currentBadge?.name || 'streak'}! Create a new memory now.`,
        data: { type: 'streak_warning' },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger,
    });
  } catch (error) {
    console.error('[StreakNotifications] Error scheduling warning:', error);
  }
}

/**
 * Send immediate notification for milestone achievement
 */
export async function sendMilestoneNotification(
  milestone: number,
  badgeName?: string
): Promise<void> {
  try {
    // Check permissions first
    const { status } = await Notifications.getPermissionsAsync();
    
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      
      if (newStatus !== 'granted') {
        return;
      }
    }

    const emoji = milestone >= 100 ? '👑' : milestone >= 30 ? '🏆' : milestone >= 7 ? '🌟' : '🔥';

    let title = '';
    let body = '';

    if (badgeName) {
      title = `${emoji} New Badge Unlocked!`;
      body = `You've earned the ${badgeName} badge with ${milestone} consecutive days!`;
    } else {
      title = `${emoji} ${milestone}-day streak!`;
      body = `Amazing! You've created memories for ${milestone} days in a row.`;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { type: 'streak_milestone', milestone },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Send immediately
    });
  } catch (error) {
    console.error('[StreakNotifications] ❌ Error sending milestone notification:', error);
  }
}

/**
 * Send immediate notification for regular streak increment
 */
export async function sendStreakIncrementNotification(currentStreak: number): Promise<void> {
  try {
    // Check permissions first
    const { status } = await Notifications.getPermissionsAsync();
    
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      
      if (newStatus !== 'granted') {
        return;
      }
    }

    const emoji = currentStreak >= 30 ? '👑' : currentStreak >= 14 ? '🏆' : currentStreak >= 7 ? '⭐' : currentStreak >= 3 ? '🔥' : '✨';

    let title = '';
    let body = '';

    if (currentStreak === 1) {
      title = 'Streak started! ✨';
      body = 'You\'re on day 1! Keep creating memories daily to build your streak.';
    } else if (currentStreak === 2) {
      title = 'Great start! 🔥';
      body = '2 days in a row! One more day until your Flame badge.';
    } else {
      title = `${emoji} ${currentStreak}-day streak!`;
      body = `Amazing! You've created memories for ${currentStreak} days in a row. Keep it up!`;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { type: 'streak_increment', currentStreak },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
      },
      trigger: null, // Send immediately
    });
  } catch (error) {
    console.error('[StreakNotifications] ❌ Error sending streak increment notification:', error);
  }
}

/**
 * Send streak lost notification (gentle, encouraging)
 */
export async function sendStreakLostNotification(lostStreak: number): Promise<void> {
  try {
    // Don't send if streak was very short (less than 3 days)
    if (lostStreak < 3) {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Start fresh today 🌱',
        body: `Your ${lostStreak}-day streak ended, but every day is a chance to begin again. You've got this!`,
        data: { type: 'streak_lost', lostStreak },
        sound: false, // Gentle, no sound
        priority: Notifications.AndroidNotificationPriority.LOW,
      },
      trigger: {
        hour: 9,
        minute: 0,
        repeats: false,
      },
    });
  } catch (error) {
    console.error('[StreakNotifications] Error sending streak lost notification:', error);
  }
}

/**
 * Cancel all streak notifications
 */
export async function cancelAllStreakNotifications(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(STREAK_REMINDER_ID);
    await Notifications.cancelScheduledNotificationAsync(STREAK_WARNING_ID);
  } catch (error) {
    console.error('[StreakNotifications] Error cancelling notifications:', error);
  }
}

/**
 * Refresh streak notifications (call daily or when app opens)
 */
export async function refreshStreakNotifications(): Promise<void> {
  await scheduleStreakReminder();
  await scheduleStreakWarning();
}
