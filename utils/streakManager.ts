import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from '../services/NotificationService';

const STREAK_KEY = 'event_streak';
const INSTALL_TIME_KEY = 'app_install_time';
const STREAK_NOTIF_KEY = 'streak_warning_notification_id';
const ONBOARDING_NOTIF_KEY = 'onboarding_notification_id';
const STREAK_REWARD_KEY = 'streak_reward_unlocked_date';

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

export const updateStreakOnEventSave = async (): Promise<number> => {
  try {
    const today = getTodayString();
    const streak = await getStreak();

    if (streak.lastEventDate === today) {
      await cancelStreakWarningNotification();
      return streak.count;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];

    const newCount =
      streak.lastEventDate === yesterdayString ? streak.count + 1 : 1;

    const newStreak: StreakData = { count: newCount, lastEventDate: today };
    await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(newStreak));

    await cancelStreakWarningNotification();
    await cancelOnboardingNotification();

    if (newCount === 1) {
      await AsyncStorage.setItem('streak_start_date', today);
    }

    if (newCount === 7) {
      await AsyncStorage.setItem(STREAK_REWARD_KEY, new Date().toISOString());
      console.log('🎉 7-day streak! Background images unlocked for 7 days!');
    }

    console.log('🔥 Streak updated:', newCount);
    return newCount;
  } catch {
    return 0;
  }
};

export const scheduleStreakWarningIfNeeded = async (): Promise<void> => {
  try {
    const today = getTodayString();
    const streak = await getStreak();

    if (streak.lastEventDate === today) {
      console.log('✅ Aaj event save hai, streak warning nahi chahiye');
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
      '🔥 Streak tutne wali hai!',
      `Aapki ${streak.count} din ki streak khatam ho jaegi! Aaj ka event abhi set karo.`,
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
      '📅 Apna pehla event set karo!',
      'Daily schedule banao, reminders set karo aur streak banake surprises pao! 🎁',
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