import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from '../services/NotificationService';

const STREAK_KEY = 'event_streak';
const INSTALL_TIME_KEY = 'app_install_time';
const STREAK_NOTIF_KEY = 'streak_warning_notification_id';
const ONBOARDING_NOTIF_KEY = 'onboarding_notification_id';
const STREAK_REWARD_KEY = 'streak_reward_unlocked_date';
const STREAK_RESTORE_KEY = 'streak_restore_data';


export interface StreakData {
  count: number;
  lastEventDate: string;
}

const getTodayString = () => new Date().toISOString().split('T')[0];

export const getStreak = async (): Promise<StreakData> => {
  try {
    const raw = await AsyncStorage.getItem(STREAK_KEY);
    if (!raw) return { count: 0, lastEventDate: '' };
    return JSON.parse(raw);
  } catch {
    return { count: 0, lastEventDate: '' };
  }
};

export interface RestoreData {
  savedCount: number;
  savedStartDate: string;
  restoreWindowStart: string;
  restoreWindowEnd: string;
}

export const updateStreakOnEventSave = async (): Promise<number> => {
  try {
    const today = getTodayString();
    const streak = await getStreak();

    console.log('=== STREAK DEBUG ===');
    console.log('Today:', today);
    console.log('Last event date:', streak.lastEventDate);
    console.log('Current count:', streak.count);

    if (streak.lastEventDate === today) {
      await cancelStreakWarningNotification();
      return streak.count;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];

    const newCount =
      streak.lastEventDate === yesterdayString ? streak.count + 1 : 1;

    console.log('New count:', newCount);
    console.log('===================');

    const newStreak: StreakData = { count: newCount, lastEventDate: today };
    await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(newStreak));

    const best = await AsyncStorage.getItem('best_streak');
    const bestVal = best ? parseInt(best) : 0;

    if (newCount > bestVal) {
      await AsyncStorage.setItem('best_streak', newCount.toString());
    }

    await cancelStreakWarningNotification();
    await cancelOnboardingNotification();

    if (newCount === 1) {
      const pendingRestore = await AsyncStorage.getItem(STREAK_RESTORE_KEY);
      if (!pendingRestore) {
        await AsyncStorage.setItem('streak_start_date', today);
      }
    }
    if (newCount === 7) {
      await AsyncStorage.setItem(STREAK_REWARD_KEY, new Date().toISOString());
      await AsyncStorage.setItem('streak_challenge_reward_unlocked', new Date().toISOString());

      await scheduleCongratulationsNotification(newCount);
    }
    if ([30, 100, 365].includes(newCount)) {
      await scheduleCongratulationsNotification(newCount);
    }
    console.log('🔥 Streak updated:', newCount);
    return newCount;
  } catch {
    return 0;
  }
};

export const getRestoreData = async (): Promise<RestoreData | null> => {
  try {
    const raw = await AsyncStorage.getItem(STREAK_RESTORE_KEY);
    if (!raw) return null;
    const data: RestoreData = JSON.parse(raw);

    const now = new Date();
    const windowEnd = new Date(data.restoreWindowEnd);

    if (now > windowEnd) {
      await AsyncStorage.removeItem(STREAK_RESTORE_KEY);
      return null;
    }

    return data;
  } catch {
    return null;
  }
};

export const checkAndRefreshStreak = async (): Promise<{
  streak: StreakData;
  restoreAvailable: boolean;
  restoreData: RestoreData | null;
}> => {
  try {
    const streak = await getStreak();

    const existingRestore = await getRestoreData();
    if (existingRestore) {
      return {
        streak,
        restoreAvailable: true,
        restoreData: existingRestore,
      };
    }

    if (streak.count === 0 || !streak.lastEventDate) {
      return { streak, restoreAvailable: false, restoreData: null };
    }

    const today = getTodayString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (streak.lastEventDate === today || streak.lastEventDate === yesterdayStr) {
      return { streak, restoreAvailable: false, restoreData: null };
    }

    const now = new Date();
    const restoreEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const lastDate = new Date(streak.lastEventDate);
    const daysSinceLastEvent = Math.floor(
      (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastEvent > 2) {
      const resetStreak: StreakData = { count: 0, lastEventDate: streak.lastEventDate };
      await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(resetStreak));
      return { streak: resetStreak, restoreAvailable: false, restoreData: null };
    }

    const savedStartDate = await AsyncStorage.getItem('streak_start_date') || '';
    const restoreData: RestoreData = {
      savedCount: streak.count,
      savedStartDate,
      restoreWindowStart: now.toISOString(),
      restoreWindowEnd: restoreEnd.toISOString(),
    };
    await AsyncStorage.setItem(STREAK_RESTORE_KEY, JSON.stringify(restoreData));

    return {
      streak,
      restoreAvailable: true,
      restoreData,
    };

  } catch {
    return {
      streak: { count: 0, lastEventDate: '' },
      restoreAvailable: false,
      restoreData: null,
    };
  }
};

export const restoreStreak = async (): Promise<number> => {
  try {
    const restoreData = await getRestoreData();
    if (!restoreData) return 0;

    const today = getTodayString();

    const restoredStreak: StreakData = {
      count: restoreData.savedCount,
      lastEventDate: today,
    };
    await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(restoredStreak));

    await AsyncStorage.setItem('streak_start_date', restoreData.savedStartDate);

    const best = await AsyncStorage.getItem('best_streak');
    const bestVal = best ? parseInt(best) : 0;
    if (restoreData.savedCount > bestVal) {
      await AsyncStorage.setItem('best_streak', restoreData.savedCount.toString());
    }
    await AsyncStorage.removeItem(STREAK_RESTORE_KEY);

    console.log('✅ Streak restored:', restoreData.savedCount);
    return restoreData.savedCount;
  } catch {
    return 0;
  }
};

const scheduleCongratulationsNotification = async (streakCount: number): Promise<void> => {
  try {
    let title = '';
    let body = '';
    if (streakCount === 7) {
      title = '🎉 7-Day Streak! You did it!';
      body = 'Amazing! You\'ve unlocked 2 premium features FREE for 7 days: Background Images & Challenges! Keep it up! 🔥';
    } else if (streakCount === 30) {
      title = '🏆 30-Day Streak Legend!';
      body = 'One month of consistency! You\'re absolutely crushing it! 🔥';
    } else if (streakCount === 100) {
      title = '💯 100-Day Streak! Incredible!';
      body = 'You\'re in the top 1% of users! Unbelievable dedication! 🔥🔥🔥';
    } else if (streakCount === 365) {
      title = '👑 365-Day Streak! A FULL YEAR!';
      body = 'You are a true champion. One full year of daily events. Extraordinary! 🔥';
    }
    if (!title) return;
    await scheduleLocalNotification(title, body, 5, {
      type: 'streak_milestone',
      streakCount,
    });

    console.log(`🎉 Congratulations notification scheduled for ${streakCount}-day streak`);
  } catch (e) {
    console.error('Error scheduling congratulations notification:', e);
  }
};

export const isChallengeRewardActive = async (): Promise<{ active: boolean; daysLeft: number }> => {
  try {
    const existing = await AsyncStorage.getItem('streak_challenge_reward_unlocked');
    if (!existing) return { active: false, daysLeft: 0 };

    const unlockedDate = new Date(existing);
    const now = new Date();
    const daysDiff = Math.floor(
      (now.getTime() - unlockedDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff < 7) {
      return { active: true, daysLeft: 7 - daysDiff };
    }

    await AsyncStorage.removeItem('streak_challenge_reward_unlocked');
    return { active: false, daysLeft: 0 };
  } catch {
    return { active: false, daysLeft: 0 };
  }
};

export const scheduleStreakWarningIfNeeded = async (): Promise<void> => {
  try {
    const today = getTodayString();
    const streak = await getStreak();

    if (streak.lastEventDate === today) {
      console.log('Aaj event save hai, streak warning nahi chahiye');
      return;
    }

    await cancelStreakWarningNotification();

    if (streak.count === 0) {
      console.log('No streak yet, skipping streak warning');
      return;
    }

    const tonight8PM = new Date();
    tonight8PM.setHours(20, 0, 0, 0);

    if (tonight8PM <= new Date()) {
      console.log('8 PM already passed today, skipping streak warning');
      return;
    }

    const secondsUntil = Math.floor(
      (tonight8PM.getTime() - Date.now()) / 1000
    );

    const notifId = await scheduleLocalNotification(
      '🔥 Your streak is about to end!',
      `Your ${streak.count}-day streak will be lost! Set today's event now to keep it going.`,
      secondsUntil,
      { type: 'streak_warning' }
    );

    if (notifId) {
      await AsyncStorage.setItem(STREAK_NOTIF_KEY, notifId);
      console.log('⚠️ Streak warning scheduled at 8 PM:', notifId);
    }
  } catch (e) {
    console.error('Error scheduling streak warning:', e);
  }
};

export const cancelStreakWarningNotification = async (): Promise<void> => {
  try {
    const id = await AsyncStorage.getItem(STREAK_NOTIF_KEY);
    if (id) {
      await NotificationService.cancelNotification(id);
      await AsyncStorage.removeItem(STREAK_NOTIF_KEY);
      console.log('🗑️ Streak warning cancelled');
    }
  } catch (e) {
    console.error('Error cancelling streak warning:', e);
  }
};

export const scheduleOnboardingNotificationIfNeeded = async (): Promise<void> => {
  try {
    const existing = await AsyncStorage.getItem(INSTALL_TIME_KEY);
    if (!existing) {
      await AsyncStorage.setItem(INSTALL_TIME_KEY, Date.now().toString());
      console.log('📦 Install time saved');
    }

    const events = await AsyncStorage.getItem('events');
    const eventList = events ? JSON.parse(events) : [];
    if (eventList.length > 0) {
      console.log('User already has events, skipping onboarding notification');
      return;
    }

    const existingNotif = await AsyncStorage.getItem(ONBOARDING_NOTIF_KEY);
    if (existingNotif) {
      console.log('Onboarding notification already scheduled');
      return;
    }

    const notifId = await scheduleLocalNotification(
      '📅 Set Your First Event!',
      'Create your daily schedule, set reminders, and build your streak to unlock exciting surprises! 🎁',
      3600,
      { type: 'onboarding' }
    );

    if (notifId) {
      await AsyncStorage.setItem(ONBOARDING_NOTIF_KEY, notifId);
      console.log('🎯 Onboarding notification scheduled (1hr):', notifId);
    }
  } catch (e) {
    console.error('Error scheduling onboarding notification:', e);
  }
};

export const cancelOnboardingNotification = async (): Promise<void> => {
  try {
    const id = await AsyncStorage.getItem(ONBOARDING_NOTIF_KEY);
    if (id) {
      await NotificationService.cancelNotification(id);
      await AsyncStorage.removeItem(ONBOARDING_NOTIF_KEY);
      console.log('🗑️ Onboarding notification cancelled');
    }
  } catch (e) {
    console.error('Error cancelling onboarding notification:', e);
  }
};

export const checkAndGrantStreakReward = async (streakCount: number): Promise<boolean> => {
  try {
    if (streakCount < 7) return false;

    const existing = await AsyncStorage.getItem(STREAK_REWARD_KEY);

    if (existing) {
      const unlockedDate = new Date(existing);
      const now = new Date();
      const daysDiff = Math.floor(
        (now.getTime() - unlockedDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff < 7) {
        console.log(`🎁 Streak reward active — ${7 - daysDiff} days remaining`);
        return true;
      } else {
        await AsyncStorage.removeItem(STREAK_REWARD_KEY);
        console.log('⏰ Streak reward expired');
        return false;
      }
    }
    if (streakCount === 7) {
      await AsyncStorage.setItem(STREAK_REWARD_KEY, new Date().toISOString());
      console.log('🎉 7-day streak reward granted!');
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

export const isStreakRewardActive = async (): Promise<{ active: boolean; daysLeft: number }> => {
  try {
    const existing = await AsyncStorage.getItem(STREAK_REWARD_KEY);
    if (!existing) return { active: false, daysLeft: 0 };

    const unlockedDate = new Date(existing);
    const now = new Date();
    const daysDiff = Math.floor(
      (now.getTime() - unlockedDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff < 7) {
      return { active: true, daysLeft: 7 - daysDiff };
    }
    await AsyncStorage.removeItem(STREAK_REWARD_KEY);
    return { active: false, daysLeft: 0 };
  } catch {
    return { active: false, daysLeft: 0 };
  }
};

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const scheduleLocalNotification = async (
  title: string,
  body: string,
  secondsFromNow: number,
  data: object
): Promise<string | null> => {
  try {
    if (secondsFromNow < 5) return null;

    const trigger: any = {
      type: 'timeInterval',
      seconds: secondsFromNow,
      repeats: false,
    };

    if (Platform.OS === 'android') {
      trigger.channelId = 'event-reminders';
    }

    const content: any = {
      title,
      body,
      data,
      sound: 'default',
    };

    if (Platform.OS === 'ios') {
      content.badge = 1;
    } else {
      content.priority = Notifications.AndroidNotificationPriority.MAX;
      content.vibrate = [0, 250, 250, 250];
    }

    return await Notifications.scheduleNotificationAsync({ content, trigger });
  } catch (e) {
    console.error('Error in scheduleLocalNotification:', e);
    return null;
  }
};