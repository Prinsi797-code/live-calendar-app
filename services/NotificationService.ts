import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const STORAGE_KEYS = {
  OTHER: 'notification_other',
  FESTIVAL: 'notification_festival',
  CHALLENGE: 'notification_challenge',
  MEMO: 'notification_memo',
  DIARY: 'notification_diary',
  MORNING_NOTIF: 'daily_morning_notification_id',
  NIGHT_NOTIF: 'daily_night_notification_id'

};

const parseFestivalDate = (dateString: string) => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0);
};


class NotificationService {
  async requestPermissions() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      console.log('Current notification permission status:', existingStatus);

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: true,
          },
        });
        finalStatus = status;
        console.log('📱 New permission status:', finalStatus);
      }

      if (finalStatus !== 'granted') {
        alert('Notification permissions are required for reminders!\n\nPlease enable notifications in:\nSettings → Your App → Notifications');
        return false;
      }

      console.log('✅ Notification permissions granted');

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
        await Notifications.setNotificationChannelAsync('diary-reminders', {
          name: '',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B6B',
          sound: 'default',
        });
        await Notifications.setNotificationChannelAsync('event-reminders', {
          name: 'Event Reminders',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4CAF50',
          sound: 'default',
        });
      }

      if (Platform.OS === 'ios') {
        await Notifications.setNotificationCategoryAsync('diary', [
          {
            identifier: 'view',
            buttonTitle: 'View',
            options: {
              opensAppToForeground: true,
            },
          },
        ]);
        await Notifications.setNotificationCategoryAsync('event', [
          {
            identifier: 'view',
            buttonTitle: 'View Event',
            options: {
              opensAppToForeground: true,
            },
          },
        ]);
        const settings = await Notifications.getPermissionsAsync();
        console.log('📱 iOS Notification Settings:', JSON.stringify(settings, null, 2));
      }
      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  async checkPermissions(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }
  async isNotificationEnabled(type: string): Promise<boolean> {
    try {
      const storageKey = `notification_${type.toLowerCase()}`;
      const enabled = await AsyncStorage.getItem(storageKey);
      console.log(`📱 Checking notification for ${type}:`, enabled);
      return enabled === 'true' || enabled === null;
    } catch (error) {
      console.error('Error checking notification setting:', error);
      return true;
    }
  }

  async scheduleMemoNotification(
    memoId: string,
    title: string,
    body: string,
    scheduledDate: Date
  ) {
    const isEnabled = await this.isNotificationEnabled('memo');

    if (!isEnabled) {
      console.log('Memo notifications are disabled');
      return null;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📝 ' + title,
        body: '',
        data: {
          type: 'memo',
          memoId: memoId,
          title: title
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: 'date',
        date: scheduledDate,
      },
    });
    await AsyncStorage.setItem(`memo_${memoId}_notification`, notificationId);

    console.log('Memo notification scheduled:', notificationId);
    return notificationId;
  }

  async scheduleChallengeNotification(
    challengeId: string,
    title: string,
    body: string,
    scheduledDate: Date,
    repeatType: string = 'never',
    selectedIcon: string
  ) {
    try {
      console.log('=== scheduleChallengeNotification START ===');
      console.log('📥 Input Parameters:');
      console.log('  Challenge ID:', challengeId);
      console.log('  Title:', title);
      console.log('  Icon:', selectedIcon);
      console.log('  Body:', body);
      console.log('  Scheduled Date:', scheduledDate);
      console.log('  Repeat Type:', repeatType);

      const isEnabled = await this.isNotificationEnabled('challenge');
      if (!isEnabled) {
        console.log('Challenge notifications are disabled');
        return null;
      }

      const now = new Date();
      if (repeatType === 'never' && scheduledDate <= now) {
        console.log('Cannot schedule non-repeating notification in the past');
        return null;
      }

      let trigger: any;
      switch (repeatType) {
        case 'everyday':
          trigger = {
            type: 'daily',
            hour: scheduledDate.getHours(),
            minute: scheduledDate.getMinutes(),
          };
          break;
        case 'every_week':
          trigger = {
            type: 'weekly',
            weekday: scheduledDate.getDay() + 1,
            hour: scheduledDate.getHours(),
            minute: scheduledDate.getMinutes(),
          };
          break;
        case 'every_month':
          trigger = {
            type: 'calendar',
            value: {
              day: scheduledDate.getDate(),
              hour: scheduledDate.getHours(),
              minute: scheduledDate.getMinutes(),
            },
            repeats: true,
          };
          break;
        default:
          trigger = {
            type: 'date',
            date: scheduledDate,
          };
          break;
      }

      // Use user's selected icon or default to 💪
      const notificationIcon = selectedIcon || '💪';

      const content: any = {
        title: `${notificationIcon} ${title}`,
        body: '',
        data: {
          type: 'challenge',
          challengeId: challengeId,
          title: title
        },
        sound: 'default',
      };

      if (Platform.OS === 'ios') {
        content.badge = 1;
        content.categoryIdentifier = 'challenge';
      } else {
        content.priority = Notifications.AndroidNotificationPriority.MAX;
        content.vibrate = [0, 250, 250, 250];
      }

      if (Platform.OS === 'android') {
        trigger.channelId = 'event-reminders';
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content,
        trigger,
      });

      console.log('Notification scheduled with icon:', notificationIcon);
      console.log('Notification ID:', notificationId);
      console.log('=== scheduleChallengeNotification END (SUCCESS) ===');
      return notificationId;

    } catch (error) {
      console.error('Error in scheduleChallengeNotification:', error);
      return null;
    }
  }


  async scheduleMorningNotification() {
    try {
      // Pehle purani cancel karo (duplicate na bane)
      await this.cancelDailyMorningNotification();

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌅 Good Morning!',
          body: 'Check your schedule and make the most of your day 📅',
          data: {
            type: 'daily_morning',
          },
          sound: 'default',
          ...(Platform.OS === 'ios' ? { badge: 1 } : {
            priority: Notifications.AndroidNotificationPriority.HIGH,
            vibrate: [0, 250, 250, 250],
          }),
        },
        trigger: {
          type: 'daily',
          hour: 8,      // 8:00 AM user ke local time pe
          minute: 0,
          ...(Platform.OS === 'android' ? { channelId: 'event-reminders' } : {}),
        },
      });

      await AsyncStorage.setItem('daily_morning_notification_id', notificationId);
      console.log('✅ Morning notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling morning notification:', error);
      return null;
    }
  }

  // ============================================================
  // FUNCTION 2: Night Notification — Daily 9:00 PM
  // "Good Night! Kal ke N events hain 🌙"
  // ============================================================

  async scheduleNightNotification() {
    try {
      // Pehle purani cancel karo
      await this.cancelDailyNightNotification();

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌙 Good Night!',
          body: 'Plan your tomorrow and stay ahead of your schedule ✨',
          data: {
            type: 'daily_night',
          },
          sound: 'default',
          ...(Platform.OS === 'ios' ? { badge: 1 } : {
            priority: Notifications.AndroidNotificationPriority.HIGH,
            vibrate: [0, 250, 250, 250],
          }),
        },
        trigger: {
          type: 'daily',
          hour: 21,     // 9:00 PM user ke local time pe
          minute: 0,
          ...(Platform.OS === 'android' ? { channelId: 'event-reminders' } : {}),
        },
      });

      await AsyncStorage.setItem('daily_night_notification_id', notificationId);
      console.log('✅ Night notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling night notification:', error);
      return null;
    }
  }

  // ============================================================
  // FUNCTION 3: Cancel helpers
  // ============================================================

  async cancelDailyMorningNotification() {
    try {
      const id = await AsyncStorage.getItem('daily_morning_notification_id');
      if (id) {
        await this.cancelNotification(id);
        await AsyncStorage.removeItem('daily_morning_notification_id');
        console.log('🗑️ Morning notification cancelled');
      }
    } catch (error) {
      console.error('Error cancelling morning notification:', error);
    }
  }

  async cancelDailyNightNotification() {
    try {
      const id = await AsyncStorage.getItem('daily_night_notification_id');
      if (id) {
        await this.cancelNotification(id);
        await AsyncStorage.removeItem('daily_night_notification_id');
        console.log('🗑️ Night notification cancelled');
      }
    } catch (error) {
      console.error('Error cancelling night notification:', error);
    }
  }

  // ============================================================
  // FUNCTION 4: Dono ek saath schedule karo (app start pe call karo)
  // ============================================================

  async scheduleDailyNotifications() {
    console.log('📅 Scheduling daily morning & night notifications...');
    await this.scheduleMorningNotification();
    await this.scheduleNightNotification();
    console.log('✅ Both daily notifications scheduled!');
  }


  async scheduleDiaryNotification(
    diaryId: string,
    title: string,
    body: string,
    reminderDateTime: Date,
    selectedIcon: string
  ): Promise<string | null> {
    try {
      const isEnabled = await this.isNotificationEnabled('diary');
      if (!isEnabled) {
        console.log('Diary notifications are disabled');
        return null;
      }

      const now = new Date();
      const reminderTime = new Date(reminderDateTime);
      const timeDiff = reminderTime.getTime() - now.getTime();
      const secondsUntilTrigger = Math.floor(timeDiff / 1000);

      if (secondsUntilTrigger < 5) {
        console.log('Notification must be at least 5 seconds in future');
        return null;
      }

      const existingId = await AsyncStorage.getItem(`diary_${diaryId}_notification`);
      if (existingId) {
        await this.cancelNotification(existingId);
      }

      // Use user's selected icon or default to 📔
      const notificationIcon = selectedIcon || '📔';

      const content: any = {
        title: `${notificationIcon} ${title}`,
        body: '',
        data: {
          type: 'diary',
          diaryId: diaryId,
          title: title
        },
        sound: 'default',
      };

      if (Platform.OS === 'ios') {
        content.badge = 1;
        content.categoryIdentifier = 'diary';
      } else {
        content.priority = Notifications.AndroidNotificationPriority.MAX;
        content.vibrate = [0, 250, 250, 250];
      }

      const trigger: any = {
        type: 'timeInterval',
        seconds: secondsUntilTrigger,
        repeats: false,
      };

      if (Platform.OS === 'android') {
        trigger.channelId = 'diary-reminders';
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content,
        trigger,
      });

      console.log('Diary notification scheduled with icon:', notificationIcon);
      console.log('Notification ID:', notificationId);
      return notificationId;

    } catch (error) {
      console.error('Error scheduling diary notification:', error);
      return null;
    }
  }

  async scheduleDailyDiaryNotification(hour: number, minute: number) {
    const isEnabled = await this.isNotificationEnabled('diary');
    if (!isEnabled) {
      console.log('Diary notifications are disabled');
      return null;
    }

    await this.cancelNotificationByType('diary-daily');
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📔 Diary Reminder',
        body: 'Time to write your daily diary!',
        data: {
          type: 'diary',
          notificationType: 'diary-daily'
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: 'daily',
        hour: hour,
        minute: minute,
      },
    });

    await AsyncStorage.setItem('diary-daily-notification-id', notificationId);
    console.log('Daily diary notification scheduled:', notificationId);
    return notificationId;
  }

  async scheduleFestivalNotification(
    festivalId: string,
    festivalName: string,
    festivalDateString: string,
    country?: string
  ) {
    try {
      const isEnabled = await this.isNotificationEnabled('festival');
      if (!isEnabled) {
        console.log('Festival notifications are disabled');
        return null;
      }

      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permission not granted');
        return null;
      }
      const [year, month, day] = festivalDateString.split('-').map(Number);
      const festivalDate = new Date(year, month - 1, day, 0, 1, 0, 0);
      const now = new Date();
      const festivalTimeMs = festivalDate.getTime();
      const nowMs = now.getTime();

      console.log('Scheduling festival notification:');
      console.log('Name:', festivalName);
      console.log('Date string:', festivalDateString);
      console.log('Festival time (ms):', festivalTimeMs);
      console.log('Current time (ms):', nowMs);
      console.log('Target:', festivalDate.toLocaleString('en-IN'));
      console.log('Current:', now.toLocaleString('en-IN'));

      if (festivalTimeMs <= nowMs) {
        console.log('Skipping - date has passed');
        return null;
      }

      const timeDiffMs = festivalTimeMs - nowMs;
      const secondsUntilTrigger = Math.floor(timeDiffMs / 1000);

      if (secondsUntilTrigger < 5) {
        console.log('Too close (less than 5 seconds)');
        return null;
      }

      console.log('Time difference (ms):', timeDiffMs);
      console.log('Will trigger in:', secondsUntilTrigger, 'seconds');
      console.log('That is:', Math.floor(secondsUntilTrigger / 3600), 'hours', Math.floor((secondsUntilTrigger % 3600) / 60), 'minutes');

      const content = {
        title: '🎉 Festival Today!',
        body: `Today is ${festivalName}. Happy ${festivalName}! 🎊`,
        data: {
          type: 'festival',
          festivalId,
          festivalName,
          festivalDate: festivalDateString,
          country: country || '',
          scheduledAtMs: nowMs,
          targetMs: festivalTimeMs,
        },
        sound: 'default',
        priority: Platform.OS === 'android'
          ? Notifications.AndroidNotificationPriority.MAX
          : undefined,
        vibrate: Platform.OS === 'android' ? [0, 250, 250, 250] : undefined,
        badge: Platform.OS === 'ios' ? 1 : undefined,
      };

      const trigger = {
        type: 'date' as const,
        date: festivalTimeMs,
        repeats: false,
        channelId: Platform.OS === 'android' ? 'event-reminders' : undefined,
      };

      const notificationId = await Notifications.scheduleNotificationAsync({
        content,
        trigger,
      });

      console.log('SUCCESSFULLY SCHEDULED!');
      console.log('Notification ID:', notificationId);
      console.log('Will trigger at:', festivalDate.toLocaleString('en-IN'));

      // Verify it's in the queue
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      const thisNotif = allScheduled.find(n => n.identifier === notificationId);
      if (thisNotif) {
        console.log('Verified in queue');
      } else {
        console.log('NOT found in queue!');
      }

      await AsyncStorage.setItem(`festival_${festivalId}_notif`, notificationId);

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  async scheduleEventNotification(
    eventId: string,
    title: string,
    body: string,
    scheduledDate: Date,
    repeatType: string = 'Does not repeat',
    reminderOffset: string = 'At a time of event'
  ) {
    const isEnabled = await this.isNotificationEnabled('other');

    if (!isEnabled) {
      console.log('Event notifications are disabled');
      return null;
    }
    let reminderTime = new Date(scheduledDate);

    switch (reminderOffset) {
      case 'At a time of event':
      case 'at_time':
        break;
      case '5 minutes before':
      case '5min':
        reminderTime.setMinutes(reminderTime.getMinutes() - 5);
        break;
      case '10 minutes before':
      case '10min':
        reminderTime.setMinutes(reminderTime.getMinutes() - 10);
        break;
      case '15 minutes before':
      case '15min':
        reminderTime.setMinutes(reminderTime.getMinutes() - 15);
        break;
      case '30 minutes before':
      case '30min':
        reminderTime.setMinutes(reminderTime.getMinutes() - 30);
        break;
      case '1 hour before':
      case '1hour':
        reminderTime.setHours(reminderTime.getHours() - 1);
        break;
      case '1 day before':
      case '1day':
        reminderTime.setDate(reminderTime.getDate() - 1);
        break;
      case 'On the day at 9 AM':
      case 'on_day_9am':
        reminderTime.setHours(9, 0, 0, 0);
        break;
      case 'The day before at 9 AM':
      case 'day_before_9am':
        reminderTime.setDate(reminderTime.getDate() - 1);
        reminderTime.setHours(9, 0, 0, 0);
        break;
      case '2 days before at 9 AM':
      case '2days_before_9am':
        reminderTime.setDate(reminderTime.getDate() - 2);
        reminderTime.setHours(9, 0, 0, 0);
        break;
      case '1 Week before at 9 AM':
      case '1week_before_9am':
        reminderTime.setDate(reminderTime.getDate() - 7);
        reminderTime.setHours(9, 0, 0, 0);
        break;
      case '2 weeks before at 9 AM':
      case '2weeks_before_9am':
        reminderTime.setDate(reminderTime.getDate() - 14);
        reminderTime.setHours(9, 0, 0, 0);
        break;
    }
    const now = new Date();
    if (reminderTime <= now) {
      console.log('Reminder time is in the past, cannot schedule');
      return null;
    }
    let trigger: any;
    const repeatLower = repeatType.toLowerCase();

    if (repeatLower.includes('day') || repeatType === 'Everyday' || repeatType === 'everyday') {
      trigger = {
        type: 'daily',
        hour: reminderTime.getHours(),
        minute: reminderTime.getMinutes(),
      };
      console.log('Daily event notification scheduled at', reminderTime.getHours(), ':', reminderTime.getMinutes());

    } else if (repeatLower.includes('week') || repeatType === 'Every week' || repeatType === 'every_week') {
      trigger = {
        type: 'weekly',
        weekday: reminderTime.getDay() + 1,
        hour: reminderTime.getHours(),
        minute: reminderTime.getMinutes(),
      };
      console.log('Weekly event notification scheduled on day', reminderTime.getDay() + 1);

    } else if (repeatLower.includes('month') || repeatType === 'Every month' || repeatType === 'every_month') {
      trigger = {
        type: 'calendar',
        value: {
          day: reminderTime.getDate(),
          hour: reminderTime.getHours(),
          minute: reminderTime.getMinutes(),
        },
        repeats: true,
      };
      console.log('Monthly event notification scheduled on day', reminderTime.getDate());

    } else if (repeatLower.includes('year') || repeatType === 'Every year' || repeatType === 'every_year') {
      trigger = {
        type: 'calendar',
        value: {
          month: reminderTime.getMonth() + 1,
          day: reminderTime.getDate(),
          hour: reminderTime.getHours(),
          minute: reminderTime.getMinutes(),
        },
        repeats: true,
      };
      console.log('Yearly event notification scheduled');

    } else {
      trigger = {
        type: 'date',
        date: reminderTime,
      };
      console.log('One-time event notification scheduled for', reminderTime.toISOString());
    }

    const content: any = {
      title: '📅 ' + title,
      body: '',
      data: {
        type: 'event',
        eventId: eventId,
        title: title
      },
      sound: 'default',
    };

    if (Platform.OS === 'ios') {
      content.badge = 1;
      content.categoryIdentifier = 'event';
    } else {
      content.priority = Notifications.AndroidNotificationPriority.MAX;
      content.vibrate = [0, 250, 250, 250];
    }

    if (Platform.OS === 'android') {
      trigger.channelId = 'event-reminders';
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content,
      trigger,
    });

    console.log('Event notification scheduled:', notificationId);
    console.log('Repeat type:', repeatType);
    console.log('Reminder offset:', reminderOffset);
    return notificationId;
  }

  async cancelNotification(notificationId: string) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('Notification cancelled:', notificationId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
      throw error;
    }
  }

  async cancelDiaryNotification(diaryId: string) {
    try {
      const notifId = await AsyncStorage.getItem(`diary_${diaryId}_notification`);
      if (notifId) {
        await this.cancelNotification(notifId);
        await AsyncStorage.removeItem(`diary_${diaryId}_notification`);
        console.log('✅ Diary notification cancelled:', notifId);
      }

      const delivered = await Notifications.getPresentedNotificationsAsync();
      const diaryNotifications = delivered.filter(
        notif => notif.request.content.data?.diaryId === diaryId
      );

      for (const notif of diaryNotifications) {
        await Notifications.dismissNotificationAsync(notif.request.identifier);
        console.log('✅ Dismissed diary notification from lock screen');
      }
    } catch (error) {
      console.error('Error cancelling diary notification:', error);
    }
  }

  async cancelMemoNotification(memoId: string) {
    try {
      // Cancel scheduled notification
      const notifId = await AsyncStorage.getItem(`memo_${memoId}_notification`);
      if (notifId) {
        await this.cancelNotification(notifId);
        await AsyncStorage.removeItem(`memo_${memoId}_notification`);
        console.log('✅ Memo notification cancelled:', notifId);
      }

      const delivered = await Notifications.getPresentedNotificationsAsync();
      const memoNotifications = delivered.filter(
        notif => notif.request.content.data?.memoId === memoId
      );

      for (const notif of memoNotifications) {
        await Notifications.dismissNotificationAsync(notif.request.identifier);
        console.log('✅ Dismissed memo notification from lock screen');
      }
    } catch (error) {
      console.error('Error cancelling memo notification:', error);
    }
  }

  async cancelChallengeNotification(challengeId: string) {
    try {
      const notifId = await AsyncStorage.getItem(`challenge_${challengeId}_notification`);
      if (notifId) {
        await this.cancelNotification(notifId);
        await AsyncStorage.removeItem(`challenge_${challengeId}_notification`);
        console.log('✅ Challenge notification cancelled:', notifId);
      }

      const delivered = await Notifications.getPresentedNotificationsAsync();
      const challengeNotifications = delivered.filter(
        notif => notif.request.content.data?.challengeId === challengeId
      );

      for (const notif of challengeNotifications) {
        await Notifications.dismissNotificationAsync(notif.request.identifier);
        console.log('✅ Dismissed challenge notification from lock screen');
      }
    } catch (error) {
      console.error('Error cancelling challenge notification:', error);
    }
  }

  async cancelEventNotification(eventId: string) {
    try {
      const notifId = await AsyncStorage.getItem(`event_${eventId}_notification`);
      if (notifId) {
        await this.cancelNotification(notifId);
        await AsyncStorage.removeItem(`event_${eventId}_notification`);
        console.log('✅ Event notification cancelled:', notifId);
      }

      const notificationIds = await AsyncStorage.getItem(`event_${eventId}_notifications`);
      if (notificationIds) {
        const ids = JSON.parse(notificationIds);
        for (const id of ids) {
          await this.cancelNotification(id);
          console.log('✅ Event notification cancelled:', id);
        }
        await AsyncStorage.removeItem(`event_${eventId}_notifications`);
      }

      const delivered = await Notifications.getPresentedNotificationsAsync();
      const eventNotifications = delivered.filter(
        notif => notif.request.content.data?.eventId === eventId
      );

      for (const notif of eventNotifications) {
        await Notifications.dismissNotificationAsync(notif.request.identifier);
        console.log('✅ Dismissed event notification from lock screen');
      }
    } catch (error) {
      console.error('Error cancelling event notification:', error);
    }
  }

  async cancelFestivalNotification(festivalId: string) {
    try {
      const notifId = await AsyncStorage.getItem(`festival_${festivalId}_notif`);
      if (notifId) {
        await this.cancelNotification(notifId);
        await AsyncStorage.removeItem(`festival_${festivalId}_notif`);
        console.log('✅ Festival notification cancelled:', notifId);
      }

      const delivered = await Notifications.getPresentedNotificationsAsync();
      const festivalNotifications = delivered.filter(
        notif => notif.request.content.data?.festivalId === festivalId
      );

      for (const notif of festivalNotifications) {
        await Notifications.dismissNotificationAsync(notif.request.identifier);
        console.log('✅ Dismissed festival notification from lock screen');
      }
    } catch (error) {
      console.error('Error cancelling festival notification:', error);
    }
  }

  async cancelNotificationByType(type: string) {
    try {
      const savedId = await AsyncStorage.getItem(`${type}-notification-id`);
      if (savedId) {
        await this.cancelNotification(savedId);
        await AsyncStorage.removeItem(`${type}-notification-id`);
      }
    } catch (error) {
      console.error('Error cancelling notification by type:', error);
    }
  }

  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  async scheduleTestNotification() {
    try {
      console.log('Scheduling TEST notification for 10 seconds...');

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Test Notification',
          body: 'This is a test notification!',
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: {
          seconds: 10,
          channelId: Platform.OS === 'android' ? 'event-reminders' : undefined,
        },
      });
      console.log('Test notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Test notification failed:', error);
      return null;
    }
  }

  async getAllScheduledNotifications() {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log('All scheduled notifications:', notifications.length);
      notifications.forEach((notif, index) => {
        console.log(`${index + 1}. ${notif.content.title} - Trigger: ${JSON.stringify(notif.trigger)}`);
      });
      return notifications;
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }

  setupNotificationListeners(
    onNotificationTap: (notification: Notifications.NotificationResponse) => void
  ) {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification tapped:', response);
        onNotificationTap(response);
      }
    );
    return subscription;
  }

  async getLastNotificationResponse() {
    try {
      const response = await Notifications.getLastNotificationResponseAsync();
      console.log('Last notification response:', response);
      return response;
    } catch (error) {
      console.error('Error getting last notification response:', error);
      return null;
    }
  }
}

export default new NotificationService();