/**
 * Streak Feature - Notification Scheduling
 */

import * as Notifications from 'expo-notifications';
import { subscribeBadgeRewardsChanged } from './badge-rewards-events';
import { getStreakBadgeBenefitReminderEnabled } from './streak-badge-reminder-preference';
import { getBadgeForStreak, getLocalDateString, getStreakData, subtractDays } from './streak-manager';
import type { StreakData } from './streak-types';

const STREAK_REMINDER_ID = 'streak-reminder';
const STREAK_WARNING_ID = 'streak-warning';
const STREAK_BADGE_BENEFIT_REMINDER_ID = 'streak-badge-benefit-reminder';

/**
 * Compute when to fire a reminder on the user's "grace day" — the day AFTER
 * their last logged memory. That's the day they need to log to keep the badge.
 *
 * - Last log = today  → grace day is tomorrow (schedule for tomorrow at `hour`).
 * - Last log = yesterday → today IS the grace day (schedule for today at `hour` if not yet passed).
 * - Last log older than yesterday → streak already broken, return null.
 */
function getGraceDayTrigger(streakData: StreakData, hour: number): Date | null {
  if (!streakData.lastLoggedDate) return null;

  const today = getLocalDateString();
  const yesterday = getLocalDateString(subtractDays(new Date(), 1));

  let triggerDate: Date;
  if (streakData.lastLoggedDate === today) {
    triggerDate = new Date();
    triggerDate.setDate(triggerDate.getDate() + 1);
    triggerDate.setHours(hour, 0, 0, 0);
  } else if (streakData.lastLoggedDate === yesterday) {
    triggerDate = new Date();
    triggerDate.setHours(hour, 0, 0, 0);
  } else {
    return null;
  }

  if (triggerDate <= new Date()) {
    return null;
  }
  return triggerDate;
}

function getBadgeBenefitReminderBody(currentStreak: number): string {
  const badge = getBadgeForStreak(currentStreak);
  if (!badge) {
    return 'Log one memory today to protect your streak. AI modal memories also count.';
  }

  switch (badge.id) {
    case 'pulse':
      return 'Log one memory today to keep Pulse and your free Moment Colors editing. AI modal memories also count.';
    case 'nova':
      return 'Log one memory today to keep Nova and your 5 free entities per sfera. AI modal memories also count.';
    case 'sferas':
      return 'Log one memory today to keep Sferas and your 5 free AI requests + 5 free lesson checks. AI modal memories also count.';
    case 'ignite':
    default:
      return 'Log one memory today to keep Ignite and continue toward your next badge rewards. AI modal memories also count.';
  }
}

/**
 * Schedule the 8 PM streak reminder for the user's grace day (the day after their
 * last log). If they've already logged today, this targets tomorrow's 8 PM. If
 * today IS the grace day and 8 PM has not yet passed, it targets today.
 */
export async function scheduleStreakReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(STREAK_REMINDER_ID);

    const streakData = await getStreakData();
    if (streakData.currentStreak === 0) {
      return;
    }

    const trigger = getGraceDayTrigger(streakData, 20); // 8 PM
    if (!trigger) {
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
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger,
      },
    });
  } catch (error) {
    // Error scheduling reminder
  }
}

/**
 * Schedule the 10 PM "last chance" warning for the user's grace day.
 */
export async function scheduleStreakWarning(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(STREAK_WARNING_ID);

    const streakData = await getStreakData();
    if (streakData.currentStreak === 0) {
      return;
    }

    const trigger = getGraceDayTrigger(streakData, 22); // 10 PM
    if (!trigger) {
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
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger,
      },
    });
  } catch (error) {
    // Error scheduling warning
  }
}

/**
 * Schedule the 2 PM badge-benefit reminder for the user's grace day.
 *
 * Example: user logs on day 1, 2, 3. After the day-3 save this schedules a 2 PM
 * notification on day 4 ("Log today to keep your Pulse badge"). If they log on
 * day 4 the next save reschedules to day 5. If day 4 ends without a log, the
 * streak/badge drops at the start of day 5.
 */
export async function scheduleBadgeBenefitReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(STREAK_BADGE_BENEFIT_REMINDER_ID);
    const enabled = await getStreakBadgeBenefitReminderEnabled();
    if (!enabled) {
      return;
    }

    const streakData = await getStreakData();
    if (streakData.currentStreak === 0) {
      return;
    }

    const trigger = getGraceDayTrigger(streakData, 14); // 2 PM
    if (!trigger) {
      return;
    }

    const currentBadge = getBadgeForStreak(streakData.currentStreak);
    const badgeName = currentBadge?.name || 'streak';

    await Notifications.scheduleNotificationAsync({
      identifier: STREAK_BADGE_BENEFIT_REMINDER_ID,
      content: {
        title: `Keep your ${badgeName} badge`,
        body: getBadgeBenefitReminderBody(streakData.currentStreak),
        data: { type: 'streak_badge_benefit_reminder' },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger,
      },
    });
  } catch (error) {
    // Error scheduling badge benefit reminder
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

    const emoji = milestone >= 14 ? '🏆' : milestone >= 7 ? '🌟' : milestone >= 3 ? '🔥' : '✨';

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
    // Error sending milestone notification
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

    const emoji = currentStreak >= 14 ? '🏆' : currentStreak >= 7 ? '⭐' : currentStreak >= 3 ? '🔥' : '✨';

    let title = '';
    let body = '';

    if (currentStreak === 1) {
      title = 'Streak started! ✨';
      body = 'You\'re on day 1! Keep creating memories daily to build your streak.';
    } else if (currentStreak === 2) {
      title = 'Great start! 🔥';
      body = '2 days in a row! One more day until your Pulse badge.';
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
    // Error sending streak increment notification
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
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: 9,
        minute: 0,
        repeats: false,
      },
    });
  } catch (error) {
    // Error sending streak lost notification
  }
}

/**
 * Cancel all streak notifications
 */
export async function cancelAllStreakNotifications(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(STREAK_REMINDER_ID);
    await Notifications.cancelScheduledNotificationAsync(STREAK_WARNING_ID);
    await Notifications.cancelScheduledNotificationAsync(STREAK_BADGE_BENEFIT_REMINDER_ID);
  } catch (error) {
    // Error cancelling notifications
  }
}

/**
 * Refresh streak notifications (call daily or when app opens)
 */
export async function refreshStreakNotifications(): Promise<void> {
  await scheduleBadgeBenefitReminder();
  await scheduleStreakReminder();
  await scheduleStreakWarning();
}

// Auto-reschedule grace-day reminders whenever a memory is saved or the daily
// recompute changes the streak. This is what guarantees that after the user logs
// on day 3 and closes the app, the day-4 reminder is still pre-scheduled with
// the OS even if they never reopen the app on day 4.
let __badgeRewardsSubscribed = false;
function ensureBadgeRewardsSubscription(): void {
  if (__badgeRewardsSubscribed) return;
  __badgeRewardsSubscribed = true;
  subscribeBadgeRewardsChanged(() => {
    void refreshStreakNotifications();
  });
}
ensureBadgeRewardsSubscription();
