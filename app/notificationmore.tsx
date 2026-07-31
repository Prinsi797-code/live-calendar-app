import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import {
  BannerAdSize,
  GAMBannerAd
} from 'react-native-google-mobile-ads';
import { useTheme } from '../contexts/ThemeContext';
import { useScreenTracking } from '../hooks/useScreenTracking';
import AdsManager from '../services/adsManager';
import NotificationService from '../services/NotificationService';

const STORAGE_KEYS = {
  OTHER: 'notification_other',
  FESTIVAL: 'notification_festival',
  CHALLENGE: 'notification_challenge',
  MEMO: 'notification_memo',
  DIARY: 'notification_diary',
  MORNING: 'notification_morning',
  NIGHT: 'notification_night',

};

export default function NotificationMore() {
  const router = useRouter();
  const { t } = useTranslation();
  const searchParams = useLocalSearchParams();
  const { from } = useLocalSearchParams();
  const { theme, colors } = useTheme();
  const BANNER_HEIGHT = 60;
  useScreenTracking('notification_screen');
  const [bannerConfig, setBannerConfig] = useState<{
    show: boolean;
    id: string;
    position: string;
  } | null>(null);

  // useEffect(() => {
  //   const config = AdsManager.getBannerConfig('setting');
  //   console.log('Notification screen banner config:', config);
  //   setBannerConfig(config);
  // }, []);

  useEffect(() => {
    const loadBannerConfig = async () => {
      const config = await AdsManager.getBannerConfig('setting');
      console.log('Notification screen banner config:', config);
      setBannerConfig(config);
    };
    loadBannerConfig();
  }, []);

  const handleBackPress = async () => {
    console.log('Notification screen back button pressed');

    console.log('Attempting to show notification back ad...');
    const adShown = await AdsManager.showSettingScreenInterstitialAd('back');

    if (adShown) {
      console.log('Notification back ad shown, navigating after ad closes');
      setTimeout(() => {
        router.replace("/settings");
      }, 500);
    } else {
      console.log('Notification back ad not shown, navigating immediately');
      router.replace("/settings");
    }
  };

  const [notifications, setNotifications] = useState({
    other: true,
    festival: true,
    challenge: true,
    memo: true,
    diary: true,
    morning: true,
    night: true,
  });

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.multiGet([
        STORAGE_KEYS.OTHER,
        STORAGE_KEYS.FESTIVAL,
        STORAGE_KEYS.CHALLENGE,
        STORAGE_KEYS.MEMO,
        STORAGE_KEYS.DIARY
      ]);
      const settings = {
        other: savedSettings[0][1] !== null ? savedSettings[0][1] === 'true' : true,
        festival: savedSettings[1][1] !== null ? savedSettings[1][1] === 'true' : true,
        challenge: savedSettings[2][1] !== null ? savedSettings[2][1] === 'true' : true,
        memo: savedSettings[3][1] !== null ? savedSettings[3][1] === 'true' : true,
        diary: savedSettings[4][1] !== null ? savedSettings[4][1] === 'true' : true,
      };
      setNotifications(settings);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const saveNotificationSetting = async (key: string, value: boolean) => {
    try {
      await AsyncStorage.setItem(key, value.toString());
    } catch (error) {
      console.error('Error saving notification setting:', error);
    }
  };

  const cancelNotificationsByType = async (type: string) => {
    try {
      const allScheduled = await NotificationService.getAllScheduledNotifications();

      for (const notification of allScheduled) {
        if (notification.content.data?.type === type) {
          await NotificationService.cancelNotification(notification.identifier);
          console.log(`Cancelled ${type} notification:`, notification.identifier);
        }
      }

      if (type === 'diary') {
        const diaryData = await AsyncStorage.getItem('diarys');
        if (diaryData) {
          const diarys = JSON.parse(diaryData);
          for (const diary of diarys) {
            await AsyncStorage.removeItem(`diary_${diary.id}_notification`);
          }
        }
      } else if (type === 'memo') {
        const memoData = await AsyncStorage.getItem('memo');
        if (memoData) {
          const memos = JSON.parse(memoData);
          for (const memo of memos) {
            await AsyncStorage.removeItem(`memo_${memo.id}_notification`);
          }
        }
      } else if (type === 'challenge') {
        const challengeData = await AsyncStorage.getItem('challenges');
        if (challengeData) {
          const challenges = JSON.parse(challengeData);
          for (const challenge of challenges) {
            await AsyncStorage.removeItem(`challenge_${challenge.id}_notification`);
          }
        }
      } else if (type === 'event') {
        const eventData = await AsyncStorage.getItem('events');
        if (eventData) {
          const events = JSON.parse(eventData);
          for (const event of events) {
            const notificationIds = await AsyncStorage.getItem(`event_${event.id}_notifications`);
            if (notificationIds) {
              const ids = JSON.parse(notificationIds);
              for (const id of ids) {
                await NotificationService.cancelNotification(id);
              }
            }
            await AsyncStorage.removeItem(`event_${event.id}_notifications`);
          }
        }
      } else if (type === 'festival') {
        const festivalData = await AsyncStorage.getItem('festivals');
        if (festivalData) {
          const festivals = JSON.parse(festivalData);
          for (const festival of festivals) {
            await AsyncStorage.removeItem(`festival_${festival.id}_notif`);
          }
        }
      }

      console.log(`All ${type} notifications cancelled`);
    } catch (error) {
      console.error(`Error cancelling ${type} notifications:`, error);
    }
  };

  const rescheduleDiaryNotifications = async () => {
    try {
      const diaryData = await AsyncStorage.getItem('diarys');
      if (!diaryData) return;

      const diarys = JSON.parse(diaryData);
      const now = new Date();
      let rescheduledCount = 0;

      for (const diary of diarys) {
        if (diary.reminder && diary.reminder !== 0) {
          const reminderDateTime = new Date(parseInt(diary.reminder));

          if (reminderDateTime > now) {
            const notificationId = await NotificationService.scheduleDiaryNotification(
              diary.id,
              diary.title,
              `Diary Reminder: ${diary.title}`,
              reminderDateTime
            );

            if (notificationId) {
              await AsyncStorage.setItem(
                `diary_${diary.id}_notification`,
                notificationId
              );
              rescheduledCount++;
              console.log(`Rescheduled diary notification: ${diary.title}`);
            }
          }
        }
      }

      console.log(`Total ${rescheduledCount} diary notifications rescheduled`);
    } catch (error) {
      console.error('Error rescheduling diary notifications:', error);
    }
  };

  const rescheduleMemoNotifications = async () => {
    try {
      const memoData = await AsyncStorage.getItem('memo');
      if (!memoData) {
        console.log('No memo data found');
        return;
      }

      const memos = JSON.parse(memoData);
      const now = new Date();
      let rescheduledCount = 0;

      console.log(`Found ${memos.length} memos to check`);

      for (const memo of memos) {
        if (memo.reminder && memo.reminder !== 0) {
          const reminderDateTime = new Date(parseInt(memo.reminder));

          console.log(`Checking memo: ${memo.title}`);
          console.log(`Reminder time: ${reminderDateTime.toLocaleString()}`);
          console.log(`Is future: ${reminderDateTime > now}`);

          if (reminderDateTime > now) {
            const notificationId = await NotificationService.scheduleMemoNotification(
              memo.id,
              memo.title,
              memo.details || `Memo Reminder: ${memo.title}`,
              reminderDateTime
            );

            if (notificationId) {
              await AsyncStorage.setItem(
                `memo_${memo.id}_notification`,
                notificationId
              );
              rescheduledCount++;
              console.log(`Rescheduled memo notification: ${memo.title}`);
            }
          } else {
            console.log(`Skipped past reminder for: ${memo.title}`);
          }
        }
      }

      console.log(`Total ${rescheduledCount} memo notifications rescheduled`);
    } catch (error) {
      console.error('Error rescheduling memo notifications:', error);
    }
  };

  // Reschedule all challenge notifications
  const rescheduleChallengeNotifications = async () => {
    try {
      const challengeData = await AsyncStorage.getItem('challenges');
      if (!challengeData) {
        console.log('⚠️ No challenge data found');
        return;
      }

      const challenges = JSON.parse(challengeData);
      const now = new Date();
      let rescheduledCount = 0;

      console.log(`💪 Found ${challenges.length} challenges to check`);

      for (const challenge of challenges) {
        if (challenge.reminder && challenge.reminder !== 0) {
          const reminderDateTime = new Date(parseInt(challenge.reminder));

          console.log(`Checking challenge: ${challenge.title}`);
          console.log(`Reminder time: ${reminderDateTime.toLocaleString()}`);
          console.log(`Repeat type: ${challenge.repeat || 'never'}`);
          console.log(`Is future or repeating: ${reminderDateTime > now || (challenge.repeat && challenge.repeat !== 'never')}`);

          if (reminderDateTime > now || (challenge.repeat && challenge.repeat !== 'never')) {
            const notificationId = await NotificationService.scheduleChallengeNotification(
              challenge.id,
              challenge.title,
              `Challenge Reminder: ${challenge.title}`,
              reminderDateTime,
              challenge.repeat || 'never'
            );

            if (notificationId) {
              await AsyncStorage.setItem(
                `challenge_${challenge.id}_notification`,
                notificationId
              );
              rescheduledCount++;
              console.log(`Rescheduled challenge notification: ${challenge.title}`);
            } else {
              console.log(`Failed to reschedule challenge: ${challenge.title}`);
            }
          } else {
            console.log(`Skipped past reminder for: ${challenge.title}`);
          }
        }
      }

      console.log(`Total ${rescheduledCount} challenge notifications rescheduled`);
    } catch (error) {
      console.error('Error rescheduling challenge notifications:', error);
    }
  };

  const rescheduleEventNotifications = async () => {
    try {
      const eventData = await AsyncStorage.getItem('events');
      if (!eventData) {
        console.log('No event data found');
        return;
      }

      const events = JSON.parse(eventData);
      const now = new Date();
      let rescheduledCount = 0;

      console.log(`Found ${events.length} events to check`);

      for (const event of events) {
        const startDate = new Date(event.startDate);
        const startTime = new Date(parseInt(event.startTime));
        let eventDateTime = new Date(startDate);
        if (event.allDay) {
          eventDateTime.setHours(9, 0, 0, 0);
        } else {
          eventDateTime.setHours(startTime.getHours());
          eventDateTime.setMinutes(startTime.getMinutes());
          eventDateTime.setSeconds(0);
        }

        console.log(`Checking event: ${event.title}`);
        console.log(`Event time: ${eventDateTime.toLocaleString()}`);
        console.log(`Repeat type: ${event.repeat || 'does_not'}`);

        const isFutureOrRepeating = eventDateTime > now ||
          (event.repeat && event.repeat !== 'does_not' && event.repeat !== 'Does not repeat');

        console.log(`Is future or repeating: ${isFutureOrRepeating}`);

        if (isFutureOrRepeating) {
          const existingNotifIds = await AsyncStorage.getItem(`event_${event.id}_notifications`);
          if (existingNotifIds) {
            try {
              const ids = JSON.parse(existingNotifIds);
              console.log(`Cancelling ${ids.length} existing notifications for: ${event.title}`);
              for (const id of ids) {
                await NotificationService.cancelNotification(id);
              }
              await AsyncStorage.removeItem(`event_${event.id}_notifications`);
            } catch (e) {
              console.log('No existing notifications to cancel');
            }
          }
          const notificationIds: string[] = [];
          const reminders = event.reminders && event.reminders.length > 0
            ? event.reminders
            : ['at_time'];

          console.log(`Scheduling ${reminders.length} reminder(s) for: ${event.title}`);

          for (let i = 0; i < reminders.length; i++) {
            const reminderOffset = reminders[i];
            console.log(`  Scheduling reminder ${i + 1}:`, reminderOffset);

            const notificationId = await NotificationService.scheduleEventNotification(
              event.id,
              event.title,
              event.description || `Event Reminder: ${event.title}`,
              eventDateTime,
              event.repeat || 'does_not',
              reminderOffset
            );

            if (notificationId) {
              notificationIds.push(notificationId);
              console.log(`Reminder ${i + 1} scheduled:`, notificationId);
            } else {
              console.log(`Reminder ${i + 1} not scheduled (might be in past)`);
            }
          }

          if (notificationIds.length > 0) {
            await AsyncStorage.setItem(
              `event_${event.id}_notifications`,
              JSON.stringify(notificationIds)
            );
            rescheduledCount++;
            console.log(`Rescheduled ${notificationIds.length} notification(s) for event: ${event.title}`);
          } else {
            console.log(`No notifications scheduled for: ${event.title}`);
          }
        } else {
          console.log(`Skipped past event: ${event.title}`);
        }
      }

      console.log(`Total ${rescheduledCount} events rescheduled`);
    } catch (error) {
      console.error('Error rescheduling event notifications:', error);
    }
  };

  const rescheduleFestivalNotifications = async () => {
    try {
      const festivalData = await AsyncStorage.getItem('festivals');
      if (!festivalData) return;

      const festivals = JSON.parse(festivalData);
      const now = new Date();
      let rescheduledCount = 0;

      for (const festival of festivals) {
        if (festival.date) {
          const [year, month, day] = festival.date.split('-').map(Number);
          const festivalDate = new Date(year, month - 1, day, 10, 45, 0, 0);

          if (festivalDate > now) {
            const notificationId = await NotificationService.scheduleFestivalNotification(
              festival.id,
              festival.name,
              festival.date,
              festival.country
            );

            if (notificationId) {
              await AsyncStorage.setItem(
                `festival_${festival.id}_notif`,
                notificationId
              );
              rescheduledCount++;
              console.log(`Rescheduled festival notification: ${festival.name}`);
            }
          }
        }
      }
      console.log(`Total ${rescheduledCount} festival notifications rescheduled`);
    } catch (error) {
      console.error('Error rescheduling festival notifications:', error);
    }
  };

  const toggleNotification = async (type: keyof typeof notifications) => {
    const newValue = !notifications[type];

    if (!newValue) {
      Alert.alert(
        t('confirm'),
        `${t('turn_off')} ${type} ${t('notifications')}? ${t('all_scheduled_notifications_will_be_cancelled')}.`,
        [
          {
            text: t('cancel'),
            style: 'cancel'
          },
          {
            text: t('ok'),
            onPress: async () => {
              setNotifications(prev => ({
                ...prev,
                [type]: newValue
              }));
              const storageKey = STORAGE_KEYS[type.toUpperCase() as keyof typeof STORAGE_KEYS];
              await saveNotificationSetting(storageKey, newValue);

              // Cancel based on type
              if (type === 'other') {
                await cancelNotificationsByType('event');
              } else {
                await cancelNotificationsByType(type);
              }

              Alert.alert(t('success'), `${type} ${t('notifications_disabled')}`);
            }
          }
        ]
      );
    } else {
      setNotifications(prev => ({
        ...prev,
        [type]: newValue
      }));
      const storageKey = STORAGE_KEYS[type.toUpperCase() as keyof typeof STORAGE_KEYS];
      await saveNotificationSetting(storageKey, newValue);

      if (type === 'diary') {
        await rescheduleDiaryNotifications();
      } else if (type === 'memo') {
        await rescheduleMemoNotifications();
      } else if (type === 'challenge') {
        await rescheduleChallengeNotifications();
      } else if (type === 'other') {
        await rescheduleEventNotifications();
      } else if (type === 'festival') {
        await rescheduleFestivalNotifications();
      } else if (type === 'morning') {
        if (newValue) {
          await NotificationService.scheduleMorningNotification();
        } else {
          await NotificationService.cancelDailyMorningNotification();
        }
      } else if (type === 'night') {
        if (newValue) {
          await NotificationService.scheduleNightNotification();
        } else {
          await NotificationService.cancelDailyNightNotification();
        }
      }
      Alert.alert(
        t('success'),
        `${type} ${t('notifications_enabled')}. ${t('pending_reminders_rescheduled') || 'Pending reminders have been rescheduled.'}`
      );
    }
  };

  const NotificationItem = ({
    title,
    description,
    type
  }: {
    title: string;
    description: string;
    type: keyof typeof notifications;
  }) => (
    <View style={[styles.notificationItem, {
      backgroundColor: colors.cardBackground,
      borderBottomColor: colors.border
    }]}>
      <View style={styles.notificationInfo}>
        <Text style={[styles.notificationTitle, { color: colors.textPrimary }]}>
          {title}
        </Text>
        <Text style={[styles.notificationDescription, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>
      <Switch
        value={notifications[type]}
        onValueChange={() => toggleNotification(type)}
        trackColor={{
          false: colors.border,
          true: '#FF6B6B'
        }}
        thumbColor={colors.white}
        ios_backgroundColor={colors.border}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          {/* <Feather name="arrow-left" size={24} color={colors.textPrimary} /> */}
          <View style={[styles.closeBtnCircle, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="chevron-back" size={26} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t("notification")}</Text>
      </View>

      <ScrollView style={styles.content}>
        <NotificationItem
          title={t("other_notification")}
          description={t("show_notification_other")}
          type="other"
        />

        <NotificationItem
          title={t("festival_notification")}
          description={t("notification_festival")}
          type="festival"
        />

        <NotificationItem
          title={t("challenge_notification")}
          description={t("show_notification_challenge")}
          type="challenge"
        />

        <NotificationItem
          title={t("memo_notification")}
          description={t("show_notificatin_memo")}
          type="memo"
        />

        <NotificationItem
          title={t("diary_notification")}
          description={t("show_notification_diary")}
          type="diary"
        />
      </ScrollView>
      {bannerConfig?.show && (
        <View style={styles.stickyAdContainer}>
          <GAMBannerAd
            unitId={bannerConfig.id}
            sizes={[BannerAdSize.ANCHORED_ADAPTIVE_BANNER]}
            requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stickyAdContainer: {
    bottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 4,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingTop: 8,
  },
  backIcon: {
    fontSize: 26,
    fontWeight: "600"
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    borderBottomWidth: 0.5,
  },
  closeBtnCircle: {
    width: 40, height: 40, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  notificationInfo: {
    flex: 1,
    marginRight: 16,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  notificationDescription: {
    fontSize: 13,
  },
});