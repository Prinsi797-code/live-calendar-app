import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerActions } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import * as Notifications from 'expo-notifications';
import { useNavigation, useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import * as StoreReview from 'expo-store-review';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Animated, AppState, AppStateStatus, Image, InteractionManager, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import AdsManager from '../services/adsManager';
import LocationService from '../services/LocationService';
import NotificationService from '../services/NotificationService';
import OnboardingService from '../services/OnboardingService';
import PurchaseManager from '../services/purchaseManager';
import { initAnalytics, trackAppOpen, trackEvent, trackScreen } from '../utils/analytics';
import { initializeI18n } from '../utils/i18n';

// Initialize Sentry - Only in Production
Sentry.init({
  dsn: 'https://79dc55677e30fe9622e115bdd4dc8daf@o4510616236589056.ingest.us.sentry.io/4510616245174272',
  enabled: !__DEV__,
  debug: false,
  tracesSampleRate: 1.0,
  enableAutoSessionTracking: true,
  sessionTrackingIntervalMillis: 10000,
  enableNativeCrashHandling: true,
  enableAutoPerformanceTracing: true,
  environment: __DEV__ ? 'development' : 'production',
});

const logError = (error: any, context?: string) => {
  console.error(context || 'Error:', error);
  if (!__DEV__) {
    Sentry.captureException(error);
  }
};

function SplashScreen({ onComplete, skipAd = false }: { onComplete: () => void; skipAd?: boolean }) {
  const { colors } = useTheme();
  const [adStatus, setAdStatus] = useState('Initializing...');
  const completedRef = useRef(false);
  const lottieRef = useRef<LottieView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const btnSlide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    setTimeout(() => lottieRef.current?.play(), 200);

    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(500),
      Animated.timing(btnSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    const setupNotifications = async () => {
      const hasPermission = await NotificationService.requestPermissions();
      if (hasPermission) {
        await NotificationService.scheduleDailyNotifications();
      }
    };
    setupNotifications();
  }, []);

  useEffect(() => {
    const loadAndShowAd = async () => {
      try {
        console.log('Splash Screen: Initializing ads...');
        setAdStatus('Loading ads...');

        if (skipAd) {
          console.log('⏭️ Skipping splash ad (opened from notification)');
          if (!completedRef.current) {
            completedRef.current = true;
            setTimeout(onComplete, 100);
          }
          return;
        }

        const premiumStatus = await PurchaseManager.isPremium();

        if (premiumStatus) {
          console.log('User is premium — splash ad skipped');
          setAdStatus('Premium user');
          if (!completedRef.current) {
            completedRef.current = true;
            setTimeout(onComplete, 100);
          }
          return;
        }

        await AdsManager.initializeAds();
        await new Promise(resolve => setTimeout(resolve, 2000));

        const config = AdsManager.getConfig();
        console.log('Splash config:', config?.splash_screen);
        console.log('Floor config:', config?.floor_inter);

        if (!config) {
          console.log('No config loaded');
          setAdStatus('No config');
          if (!completedRef.current) {
            completedRef.current = true;
            setTimeout(onComplete, 500);
          }
          return;
        }

        const splashConfig = config.splash_screen;

        if (!splashConfig || splashConfig.inter_ads_flag === 0) {
          console.log('Splash ads disabled (flag = 0)');
          setAdStatus('Ads disabled');
          if (!completedRef.current) {
            completedRef.current = true;
            setTimeout(onComplete, 500);
          }
          return;
        }
        console.log('Splash ads enabled with flag:', splashConfig.inter_ads_flag);
        setAdStatus('Loading Splash Ad...');

        const shown = await AdsManager.showSplashAd();

        if (shown) {
          console.log('Splash ad shown successfully');
          setAdStatus('Ad shown - Please close to continue');

          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.log('Splash ad not shown (frequency limit or ad not available)');
          setAdStatus('Ad not available');
        }

        if (!completedRef.current) {
          completedRef.current = true;
          console.log('Splash screen complete - navigating to app');
          onComplete();
        }

      } catch (error) {
        console.error('Error in splash ad flow:', error);
        logError(error, 'Splash Screen Ad Error');
        setAdStatus('Ad error');

        // Continue even if ad fails
        if (!completedRef.current) {
          completedRef.current = true;
          setTimeout(onComplete, 500);
        }
      }
    };

    loadAndShowAd();
  }, [skipAd, onComplete]);

  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background
    }}>
      <Image
        source={require('../assets/icons/logo.png')}
        style={{
          width: 150,
          height: 150,
          resizeMode: 'contain'
        }}
      />
      <ActivityIndicator
        size="small"
        color={colors.primary}
        style={{ marginTop: 30 }}
      />
      {__DEV__ && (
        <Text style={{
          marginTop: 10,
          color: colors.textTertiary,
          fontSize: 12
        }}>
          {adStatus}
        </Text>
      )}
    </View>
  );
}

function DrawerNavigator() {
  const { colors } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const [isReady, setIsReady] = useState(false);
  const [showSplashAd, setShowSplashAd] = useState(true);
  const [shouldShowLanguage, setShouldShowLanguage] = useState(false);
  const [openedFromNotification, setOpenedFromNotification] = useState(false);
  const [initialRoute, setInitialRoute] = useState<any>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [currentRouteName, setCurrentRouteName] = useState('');
  const [initComplete, setInitComplete] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);

  const initStartedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('state', () => {
      try {
        const state = navigation.getState();
        const route = state.routes[state.index];
        trackScreen(route.name);
        setCurrentRouteName(route.name);
      } catch (error) {
        console.error('Error tracking route:', error);
      }
    });
    return unsubscribe;
  }, [navigation]);

  const isDrawerEnabledForRoute = (routeName: string) => {
    return routeName === 'index' || routeName === '(tabs)' || routeName === 'year-view';
  };

  const getNotificationRouteData = async (data: any) => {
    if (!data || !data.type) return null;

    try {
      switch (data.type) {
        case 'diary':
          const diariesData = await AsyncStorage.getItem('diarys');
          if (diariesData) {
            const diaries = JSON.parse(diariesData);
            const diary = diaries.find((d: any) => d.id === data.diaryId);
            if (diary) {
              return {
                pathname: '/diary/diaryDetails',
                params: {
                  id: diary.id,
                  diaryId: diary.id,
                  title: diary.title || 'Diary',
                  icon: diary.icon || '💪',
                  location: diary.location || '',
                  url: diary.url || '',
                  Date: diary.Date || new Date().toISOString(),
                  reminder: diary.reminder ? String(diary.reminder) : '',
                  from: "notification"
                }
              };
            }
          }
          break;

        case 'memo':
          const memosData = await AsyncStorage.getItem('memo');
          if (memosData) {
            const memos = JSON.parse(memosData);
            const memo = memos.find((m: any) => m.id === data.memoId);
            if (memo) {
              return {
                pathname: '/memo/memoDetails',
                params: {
                  id: memo.id,
                  memoId: memo.id,
                  title: memo.title || 'Memo',
                  details: memo.details || '',
                  location: memo.location || '',
                  url: memo.url || '',
                  Date: memo.Date || new Date().toISOString(),
                  reminder: memo.reminder ? String(memo.reminder) : '',
                }
              };
            }
          }
          break;

        case 'challenge':
          const challengesData = await AsyncStorage.getItem('challenges');
          if (challengesData) {
            const challenges = JSON.parse(challengesData);
            const challenge = challenges.find((c: any) => c.id === data.challengeId);
            if (challenge) {
              return {
                pathname: '/challenge/challengeDetails',
                params: {
                  id: challenge.id,
                  challengeId: challenge.id,
                  title: challenge.title || 'Challenge',
                  icon: challenge.icon || '🎯',
                  repeat: challenge.repeat || 'does_not',
                  startDate: challenge.startDate || new Date().toISOString(),
                  endDate: challenge.endDate || new Date().toISOString(),
                  reminder: challenge.reminder ? String(challenge.reminder) : '',
                }
              };
            }
          }
          break;
        case 'festival':
          const eventsDataForFestival = await AsyncStorage.getItem('events');
          if (eventsDataForFestival) {
            const events = JSON.parse(eventsDataForFestival);
            const festival = events.find((e: any) => e.id === data.festivalId);

            if (festival) {
              return {
                pathname: '/viewEvent',
                params: {
                  eventId: festival.id,
                  title: festival.title || data.festivalName || 'Festival',
                  description: festival.description || '',
                  startDate: festival.startDate || festival.date || data.festivalDate,
                  endDate: festival.endDate || festival.date || data.festivalDate,
                  startTime: String(festival.startTime || new Date().setHours(0, 0, 0, 0)),
                  endTime: String(festival.endTime || new Date().setHours(23, 59, 59, 999)),
                  allDay: String(festival.allDay ?? true),
                  repeat: festival.repeat || 'every_year',
                  reminders: JSON.stringify(festival.reminders || ['at_time']),
                  color: festival.color || '#FF6B6B',
                  isHoliday: String(festival.isHoliday ?? true),
                  country: festival.country || data.country || '',
                }
              };
            }
          }
          return {
            pathname: '/viewEvent',
            params: {
              eventId: data.festivalId,
              title: data.festivalName || 'Festival',
              description: '',
              startDate: data.festivalDate || new Date().toISOString().split('T')[0],
              endDate: data.festivalDate || new Date().toISOString().split('T')[0],
              startTime: String(new Date().setHours(0, 0, 0, 0)),
              endTime: String(new Date().setHours(23, 59, 59, 999)),
              allDay: 'true',
              repeat: 'every_year',
              reminders: JSON.stringify(['at_time']),
              color: '#FF6B6B',
              isHoliday: 'true',
              country: data.country || '',
            }
          };

        case 'event':
          const eventsData = await AsyncStorage.getItem('events');
          if (eventsData) {
            const events = JSON.parse(eventsData);
            const event = events.find((e: any) => e.id === data.eventId);
            if (event) {
              return {
                pathname: '/viewEvent',
                params: {
                  eventId: event.id,
                  title: event.title || '',
                  description: event.description || '',
                  startDate: event.startDate || event.date,
                  endDate: event.endDate || event.date,
                  startTime: String(event.startTime),
                  endTime: String(event.endTime),
                  allDay: String(event.allDay || false),
                  repeat: event.repeat || 'does_not',
                  reminders: JSON.stringify(event.reminders || ['at_time']),
                  color: event.color || '#0267FF',
                  isHoliday: String(event.isHoliday || false),
                  country: event.country || '',
                }
              };
            }
          }
          break;
      }
    } catch (error) {
      console.error('Error getting notification route data:', error);
    }
    return null;
  };

  useEffect(() => {
    if (initStartedRef.current) {
      console.log('Initialization already started, skipping...');
      return;
    }
    initStartedRef.current = true;


    const initializeApp = async () => {
      try {
        await initAnalytics();
        await trackAppOpen();
        
        await PurchaseManager.initialize();
        const premiumStatus = await PurchaseManager.checkAndRestorePremium();

        const lastNotification = await NotificationService.getLastNotificationResponse();
        const isFromNotification = !!lastNotification;

        trackEvent('app_open', {
          source: isFromNotification ? 'notification' : 'direct',
          is_premium: premiumStatus ? 'true' : 'false',
        });

        if (isFromNotification) {
          // ✅ Flag set karo
          await AsyncStorage.setItem('opened_from_notification', 'true');

          const notificationData = lastNotification.notification.request.content.data;
          if (!premiumStatus) {
            await AdsManager.initializeAdsWithoutFloorInter();
          }
          await initializeI18n();

          const routeData = await getNotificationRouteData(notificationData);
          if (routeData) {
            setInitialRoute(routeData);
            setOpenedFromNotification(true);
            setShowSplashAd(false);
            setIsReady(true);
            return;
          }
        }

        await AsyncStorage.removeItem('opened_from_notification');


        if (!premiumStatus) {
          console.log('Normal launch - loading ads');
          await AdsManager.initializeAds();
        } else {
          console.log('Premium user — ads not initialized');
        }
        await initializeI18n();

        const completed = await OnboardingService.isOnboardingCompleted();
        console.log('Onboarding completed:', completed);

        if (!completed) {
          console.log('First time user - Will show language screen');
          setShouldShowLanguage(true);

          try {
            const country = await LocationService.fetchAndSaveUserCountry();
            console.log('Country detected:', country || 'Using default');
          } catch (error) {
            console.error('Country detection failed:', error);
          }

          setIsReady(true);
          return;
        }

        try {
          const country = await LocationService.fetchAndSaveUserCountry();
          console.log('Country detected:', country || 'Using default');
        } catch (error) {
          console.error('Country detection failed:', error);
        }

        console.log('App initialization complete - will show splash ad');
        setIsReady(true);

      } catch (error) {
        logError(error, 'Error initializing app');
        setIsReady(true);
      }
    };

    initializeApp();
  }, []);

  // App background → foreground detect karo
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        console.log('App came to foreground');

        if (openedFromNotification) {
          console.log('⏭️ Skipping main screen ad (notification open)');
          return;
        }

        const premiumStatus = await PurchaseManager.isPremium();

        if (premiumStatus) {
          console.log('Premium user - skipping main screen ad');
          return;
        }
        await AdsManager.showMainScreenAd();
      }
    });
    return () => subscription.remove();
  }, [openedFromNotification]);

  const handleSplashComplete = async () => {
    console.log('Splash complete');
    setShowSplashAd(false);
    AdsManager.loadMainScreenInterstitialAd();
    try {
      const onboardingDone = await OnboardingService.isOnboardingCompleted();
      if (!onboardingDone) return;

      const alreadyAsked = await AsyncStorage.getItem('reviewAsked');
      if (alreadyAsked) return;

      const installDateStr = await AsyncStorage.getItem('installDate');
      if (!installDateStr) {
        await AsyncStorage.setItem('installDate', Date.now().toString());
        return;
      }

      const daysSinceInstall = (Date.now() - parseInt(installDateStr)) / (1000 * 60 * 60 * 24);

      if (daysSinceInstall >= 1) {
        const isAvailable = await StoreReview.isAvailableAsync();
        if (isAvailable) {
          setTimeout(async () => {
            await StoreReview.requestReview();
            await AsyncStorage.setItem('reviewAsked', 'true');
          }, 1500);
        }
      }
    } catch (error) {
      console.log('Review prompt error:', error);
    }
  };

  useEffect(() => {
    if (isReady && !showSplashAd && openedFromNotification && initialRoute) {
      console.log('Navigating to notification details:', initialRoute.pathname);
      setTimeout(() => {
        router.replace(initialRoute);
      }, 100);
    }
  }, [isReady, showSplashAd, openedFromNotification, initialRoute]);

  useEffect(() => {
    const handleNotificationResponse = async (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;
      console.log('Notification tapped (app running):', data);

      const routeData = await getNotificationRouteData(data);
      if (routeData) {
        setTimeout(() => {
          router.push(routeData);
        }, 300);
      } else {
        router.push('/(tabs)');
      }
    };

    const subscription = NotificationService.setupNotificationListeners(handleNotificationResponse);
    return () => subscription.remove();
  }, []);

  // Navigate to language screen for first-time users
  useEffect(() => {
    if (isReady && !showSplashAd && shouldShowLanguage && !openedFromNotification) {
      console.log('🌐 Navigating to language screen (first time user)');
      requestAnimationFrame(() => {
        router.replace('/language');
      });
    }
  }, [isReady, showSplashAd, shouldShowLanguage, router, openedFromNotification]);

  // CRITICAL: Don't render drawer until splash is COMPLETELY done
  if (!isReady || showSplashAd) {
    console.log('⏳ Showing splash...', { isReady, showSplashAd, openedFromNotification });

    if (openedFromNotification && !showSplashAd) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    return <SplashScreen onComplete={handleSplashComplete} skipAd={openedFromNotification} />;
  }
  console.log('Rendering main app - Splash fully dismissed');

  return (
    <>
      <Drawer
        drawerContent={(props) => <DrawerContent {...props} />}
        screenOptions={{
          drawerStyle: {
            width: 280,
            backgroundColor: colors.background,
          },
          drawerType: 'front',
          headerShown: false,
          swipeEnabled: isDrawerEnabledForRoute(currentRouteName),
        }}
      >
        <Drawer.Screen
          name="(tabs)"
          options={{
            drawerLabel: 'Calendar',
            title: 'Calendar',
            header: () => <CustomHeader />,
            headerShown: true,
            swipeEnabled: false,
          }}
        />
        <Drawer.Screen
          name="language"
          options={{
            drawerItemStyle: { display: 'none' },
            headerShown: false,
            swipeEnabled: false,
          }}
        />
        <Drawer.Screen
          name="year-view"
          options={{
            drawerItemStyle: { display: 'none' },
            swipeEnabled: true,
          }}
        />
        <Drawer.Screen
          name="week"
          options={{
            drawerItemStyle: { display: 'none' },
            swipeEnabled: true,
          }}
        />
        <Drawer.Screen
          name="holidays"
          options={{
            drawerItemStyle: { display: 'none' },
            swipeEnabled: false,
          }}
        />
        <Drawer.Screen
          name="settings"
          options={{
            drawerItemStyle: { display: 'none' },
            swipeEnabled: false,
          }}
        />
        <Drawer.Screen
          name="theme-mode"
          options={{
            drawerItemStyle: { display: 'none' },
            swipeEnabled: false,
          }}
        />
      </Drawer>
      {/* <RatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
      /> */}
    </>
  );
}

function CustomHeader() {
  const navigation = useNavigation();
  const { colors, theme } = useTheme();
  const router = useRouter();
  const formatDate = (d: number) => (d < 10 ? `0${d}` : d);
  const { currentYear: themeYear } = useTheme();
  const [displayYear, setDisplayYear] = useState(new Date().getFullYear());

  const { t } = useTranslation();

  useEffect(() => {
    setDisplayYear(themeYear);
    console.log('📍 Header display year updated to:', themeYear);
  }, [themeYear]);

  const handleDateBoxPress = () => {
    try {
      const state = navigation.getState();
      const currentRoute = state.routes[state.index].name;
      const refreshTimestamp = Date.now().toString();

      if (currentRoute === 'index') {
        router.replace({
          pathname: '/',
          params: {
            refresh: refreshTimestamp,
            scrollToCurrentMonth: 'true'
          }
        });
      } else {
        router.push({
          pathname: '/',
          params: {
            refresh: refreshTimestamp,
            scrollToCurrentMonth: 'true'
          }
        });
      }
    } catch (error) {
      logError(error, 'handleDateBoxPress');
    }
  };

  const isDrawerEnabled = () => {
    try {
      const state = navigation.getState();
      const currentRoute = state.routes[state.index].name;
      return currentRoute === 'index' || currentRoute === '(tabs)' || currentRoute === 'year-view';
    } catch {
      return false;
    }
  };

  return (
    <View style={[styles.header, { backgroundColor: colors.background }]}>
      <View style={styles.leftContainer}>
        {isDrawerEnabled() && (
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={styles.backButton}
          >
            <Feather name="menu" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {displayYear}
        </Text>
      </View>
      <View style={styles.rightIcons}>
        <TouchableOpacity
          onPress={() => router.push('/PremiumScreen')}
          style={[styles.premiumButton, { backgroundColor: colors.cardBackground }]}
        >
          <View style={[styles.premiumBadge]}>
            <Ionicons name="diamond" size={24} color="#FF5252" />
          </View>
        </TouchableOpacity>

        {/* <View style={[styles.closeBtnCircle, { backgroundColor: colors.cardBackground }]}></View> */}
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: colors.cardBackground }]}
          onPress={() => router.push('/search')}
        >
          <Feather
            name="search"
            size={24}
            color={theme === 'dark' ? colors.white : colors.textPrimary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dateBox]}
          onPress={handleDateBoxPress}
          activeOpacity={0.7}
        >
          <Text style={[styles.dateText, { color: colors.textPrimary }]}>
            {formatDate(new Date().getDate())}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function FirstDaySelector({ visible, onClose, onSelect }: any) {
  const { colors } = useTheme();
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const { t } = useTranslation();

  React.useEffect(() => {
    loadFirstDay();
  }, [visible]);

  const loadFirstDay = async () => {
    try {
      const day = await AsyncStorage.getItem('firstDayOfWeek');
      if (day) {
        setSelectedDay(parseInt(day));
      }
    } catch (error) {
      logError(error, 'loadFirstDay');
    }
  };

  const handleOk = async () => {
    try {
      await AsyncStorage.setItem('firstDayOfWeek', selectedDay.toString());
      onSelect(selectedDay);
      onClose();
    } catch (error) {
      logError(error, 'handleOk');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.firstDayModal, { backgroundColor: colors.background }]}>
          <Text style={[styles.firstDayTitle, { color: colors.textPrimary }]}>
            {t("first_day_of_week")}
          </Text>
          <TouchableOpacity style={styles.radioOption} onPress={() => setSelectedDay(0)}>
            <View style={[styles.radioCircle, { borderColor: colors.border }]}>
              {selectedDay === 0 && (
                <View style={[styles.radioSelected, { backgroundColor: colors.primary }]} />
              )}
            </View>
            <Text style={[styles.radioLabel, { color: colors.textPrimary }]}>{t("Sunday")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.radioOption} onPress={() => setSelectedDay(1)}>
            <View style={[styles.radioCircle, { borderColor: colors.border }]}>
              {selectedDay === 1 && (
                <View style={[styles.radioSelected, { backgroundColor: colors.primary }]} />
              )}
            </View>
            <Text style={[styles.radioLabel, { color: colors.textPrimary }]}>{t("Monday")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.radioOption} onPress={() => setSelectedDay(6)}>
            <View style={[styles.radioCircle, { borderColor: colors.border }]}>
              {selectedDay === 6 && (
                <View style={[styles.radioSelected, { backgroundColor: colors.primary }]} />
              )}
            </View>
            <Text style={[styles.radioLabel, { color: colors.textPrimary }]}>{t("Saturday")}</Text>
          </TouchableOpacity>
          <View style={styles.firstDayButtons}>
            <TouchableOpacity
              style={[styles.firstDayButton, { backgroundColor: colors.cardBackground }]}
              onPress={onClose}
            >
              <Text style={[styles.firstDayButtonText, { color: colors.textPrimary }]}>
                {t("cancel")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.firstDayButton, { backgroundColor: colors.primary }]}
              onPress={handleOk}
            >
              <Text style={[styles.firstDayButtonText, { color: '#FFFFFF' }]}>
                {t("ok")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DrawerContent({ navigation }: any) {
  const router = useRouter();
  const { colors } = useTheme();
  const [showFirstDaySelector, setShowFirstDaySelector] = useState(false);
  const currentYear = new Date().getFullYear();
  const today = new Date();
  const currentDate = today.getDate() < 10 ? `0${today.getDate()}` : today.getDate();
  const currentDay = today.toLocaleDateString("en-US", { weekday: "long" });
  const [openedFromNotification, setOpenedFromNotification] = useState(false);
  const currentMonthName = today.toLocaleDateString("en-US", { month: "long" });
  const { t } = useTranslation();
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const currentMonth = new Date().getMonth();

  const handleYearClick = () => {
    router.push({ pathname: '/year-view', params: { resetYear: 'true' } });
    navigation.dispatch(DrawerActions.closeDrawer());
  };

  const handleMonthClick = () => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    router.push({
      pathname: '/(tabs)',
      params: {
        refresh: Date.now().toString(),
        resetToToday: 'true'
      }
    });
    navigation.dispatch(DrawerActions.closeDrawer());
  };

  const handleHolidaysClick = () => {
    router.push('/holidays');
    navigation.dispatch(DrawerActions.closeDrawer());
  };

  const handleWeekClick = () => {
    router.push('/week');
    navigation.dispatch(DrawerActions.closeDrawer());
  }

  const handleSettingsClick = () => {
    const currentRoute = navigation.getState().routes[navigation.getState().index].name;
    router.push({
      pathname: '/settings',
      params: {
        from: currentRoute === 'year-view' ? 'year-view' : '/'
      }
    });
    navigation.dispatch(DrawerActions.closeDrawer());
  };

  const handleCountryClick = () => {
    const currentRoute = navigation.getState().routes[navigation.getState().index].name;
    router.push({
      pathname: '/country',
      params: {
        from: currentRoute === 'year-view' ? 'year-view' : '/'
      }
    });
    navigation.dispatch(DrawerActions.closeDrawer());
  };

  const handlelanguageClick = () => {
    const currentRoute = navigation.getState().routes[navigation.getState().index].name;
    router.push({
      pathname: '/language',
      params: {
        from: currentRoute === 'year-view' ? 'year-view' : '/'
      }
    });
    navigation.dispatch(DrawerActions.closeDrawer());
  };

  const handleFirstDayClick = () => {
    navigation.dispatch(DrawerActions.closeDrawer());
    InteractionManager.runAfterInteractions(() => {
      setShowFirstDaySelector(true);
    });
  };

  const handleFirstDaySelect = (day: number) => {
    (global as any).firstDayChanged?.(day);
  };

  return (
    <>
      <ScrollView style={[styles.drawerContent, { backgroundColor: colors.background }]}>
        <View style={styles.drawerHeader}>
          <View style={styles.dateRow}>
            <View style={styles.dateBox}>
              <Text style={[styles.dateNumber, { color: colors.textPrimary }]}>{currentDate}</Text>
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.dayText, { color: colors.textPrimary }]}>
                {t(currentDay)}
              </Text>
              <Text style={[styles.monthYearText, { color: colors.textTertiary }]}>
                {t(currentMonthName)} {currentYear}
              </Text>
            </View>
          </View>
          <View style={styles.separator} />
        </View>
        <TouchableOpacity style={[styles.menuItem]} onPress={handleYearClick}>
          <Image source={require('../assets/icons/Vector.png')} style={styles.menuIconImage} resizeMode="contain" />
          <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>{t("year")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem]} onPress={handleMonthClick}>
          <Image source={require('../assets/icons/Vector1.png')} style={styles.menuIconImage} resizeMode="contain" />
          <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>{t("month")}</Text>
          <Text style={[styles.menuSubtext, { color: colors.textTertiary }]}>
            {months[currentMonth]} {currentYear}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem]} onPress={handleWeekClick}>
          <Image source={require('../assets/icons/Vector3.png')} style={styles.menuIconImage} resizeMode="contain" />
          <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>{t("week")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem]} onPress={handleHolidaysClick}>
          <Image source={require('../assets/icons/Vector2.png')} style={styles.menuIconImage} resizeMode="contain" />
          <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>{t("holidays")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem]} onPress={handleCountryClick}>
          <Image source={require('../assets/icons/country.png')} style={styles.menuIconImage} />
          <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>{t("country")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem]} onPress={handleFirstDayClick}>
          <Image source={require('../assets/icons/firstday.png')} style={styles.menuIconImage} resizeMode="contain" />
          <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>{t("first_day_of_week")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem]} onPress={handlelanguageClick}>
          <Image source={require('../assets/icons/language.png')} style={styles.menuIconImage} />
          <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>{t("language")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem]} onPress={handleSettingsClick}>
          <Image source={require('../assets/icons/Icon1.png')} style={styles.menuIconImage} resizeMode="contain" />
          <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>{t("settings")}</Text>
        </TouchableOpacity>
      </ScrollView>
      <Image source={require("../assets/images/bottom-flower.png")} style={styles.bottomFixedImage} />
      <FirstDaySelector
        visible={showFirstDaySelector}
        onClose={() => setShowFirstDaySelector(false)}
        onSelect={handleFirstDaySelect}
      />
    </>
  );
}

function ErrorFallbackWithTheme({
  error,
  resetError
}: {
  error: unknown;
  resetError: () => void;
  componentStack?: string;
  eventId?: string;
}) {
  const { colors } = useTheme();

  const errorMessage = error instanceof Error
    ? error.toString()
    : String(error);

  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: colors.background
    }}>
      <Text style={{
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        color: colors.textPrimary
      }}>
        Oops! Something went wrong
      </Text>
      {__DEV__ && (
        <ScrollView style={{ maxHeight: 200, marginBottom: 20 }}>
          <Text style={{
            color: 'red',
            fontFamily: 'monospace',
            fontSize: 12
          }}>
            {errorMessage}
          </Text>
        </ScrollView>
      )}
      <TouchableOpacity
        onPress={resetError}
        style={{
          backgroundColor: colors.primary,
          paddingVertical: 12,
          paddingHorizontal: 24,
          borderRadius: 8
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
          Try Again
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function RootLayoutContent() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <Sentry.ErrorBoundary
          fallback={(props) => <ErrorFallbackWithTheme {...props} />}
          showDialog={false}
        >
          <DrawerNavigator />
        </Sentry.ErrorBoundary>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

export default __DEV__ ? RootLayoutContent : Sentry.wrap(RootLayoutContent);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 60,
  },
  premiumButton: { padding: 0, width: 40, height: 40, borderRadius: 50, alignItems: 'center', justifyContent: 'center', },
  premiumBadge: {
    alignItems: 'center', justifyContent: 'center',
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    fontSize: 24,
    marginTop: 5
  },
  backButton: {
    padding: 4,
    marginRight: 10,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateNumber: {
    fontSize: 26,
    fontWeight: "bold",
  },
  dayText: {
    fontSize: 20,
    fontWeight: "700",
  },
  monthYearText: {
    fontSize: 14,
    marginTop: 2,
  },
  separator: {
    marginTop: 20,
    height: 1,
    backgroundColor: "#333",
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  yearText: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    marginTop: 4,
    textAlign: 'center',
    marginRight: 170,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    // padding: 2,
    width: 40, height: 40, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#FF5252',
    borderTopWidth: 5,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
    gap: 6,
  },
  dateIcon: {
    fontSize: 16,
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  drawerContent: {
    flex: 1,
  },
  bottomFixedImage: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: "100%",
    height: 180,
    resizeMode: "contain",
  },
  drawerHeader: {
    padding: 20,
    paddingTop: 70,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 0,
  },
  drawerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIconImage: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  primiIconImage: {
    width: 35,
    height: 35,
  },
  menuIconText: {
    fontSize: 24,
    marginRight: 12,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  menuSubtext: {
    fontSize: 12,
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  firstDayModal: {
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 320,
  },
  firstDayTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  radioLabel: {
    fontSize: 16,
  },
  firstDayButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  firstDayButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  firstDayButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});