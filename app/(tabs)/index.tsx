import { useTrial } from '@/hooks/useTrial';
import AdsManager from "@/services/adsManager";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import * as Localization from 'expo-localization';
import * as Notifications from 'expo-notifications';
import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from "react-i18next";
import { Alert, Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { COUNTRY_CALENDAR_IDS } from '../../constants/countryCalendars';

import { useTheme } from '../../contexts/ThemeContext';
import { loadData, saveData } from '../../utils/storage';


declare global {
  var firstDayChanged: ((day: number) => void) | undefined;
}
export { };

interface Holiday {
  date: string;
  name: string;
  country: string;
}

export default function CalendarScreen({ navigation }: any) {

  const { trialActive, remainingDays } = useTrial();
  const systemColorScheme = useColorScheme();

  // const { colors, theme, setCurrentYear, resolvedTheme, colorVersion } = useTheme();
  const { colors, theme, setCurrentYear, resolvedTheme } = useTheme();

  const isDarkMode = resolvedTheme === 'dark';

  const getLocalDateString = (date: Date = new Date()): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState('');
  const [currentCalendarDate, setCurrentCalendarDate] = useState(getLocalDateString());
  const [events, setEvents] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [firstDayOfWeek, setFirstDayOfWeek] = useState(0);
  const pathname = usePathname();
  // const { colors, theme } = useTheme();
  const isFocused = useIsFocused();
  const router = useRouter();
  // const { setCurrentYear } = useTheme();
  const [showMonthEvents, setShowMonthEvents] = useState(true);
  // const [colorVersion, setColorVersion] = useState(0);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['United States']);
  const [loadingHolidays, setLoadingHolidays] = useState(true);
  const { t, i18n } = useTranslation();
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [is24Hour, setIs24Hour] = useState(false);

  const lightNoEventImg = require("../../assets/images/no-events.png");
  const darkNoEventImg = require("../../assets/images/dark-no-event.png");

  const params = useLocalSearchParams();
  const [calendarKey, setCalendarKey] = useState(0);

  useEffect(() => {
    const requestNotificationPermission = async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();

        if (existingStatus !== 'granted') {
          console.log('📱 Requesting notification permission on home screen...');
          const { status } = await Notifications.requestPermissionsAsync();

          if (status === 'granted') {
            console.log('✅ Notification permission granted');
          } else {
            console.log('❌ Notification permission denied');
          }
        } else {
          console.log('✅ Notification permission already granted');
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    };
    const timer = setTimeout(() => {
      requestNotificationPermission();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const loadTimeFormat = async () => {
    try {
      const manualSetting = await AsyncStorage.getItem('user_manual_24hour_override');

      if (manualSetting !== null) {
        const is24 = manualSetting === 'true';
        setIs24Hour(is24);
        console.log('Calendar - Using time format:', is24 ? '24-hour' : '12-hour');
        return;
      }

      let systemUses24Hour = false;

      if (Localization.use24hourClock !== undefined && Localization.use24hourClock !== null) {
        systemUses24Hour = Localization.use24hourClock;
      } else {
        const locales = Localization.getLocales();
        const deviceLocale = locales[0]?.languageTag || 'en-US';
        const testTime = new Date(2000, 0, 1, 13, 0, 0);
        const systemFormat = testTime.toLocaleTimeString(deviceLocale, {
          hour: 'numeric',
          minute: '2-digit'
        });
        systemUses24Hour = !systemFormat.match(/AM|PM|am|pm/);
      }

      setIs24Hour(systemUses24Hour);
      console.log('Calendar - Using time format:', systemUses24Hour ? '24-hour' : '12-hour');

    } catch (error) {
      console.log('Error loading time format:', error);
      setIs24Hour(false);
    }
  };
  useEffect(() => {
    const today = getLocalDateString();
    console.log('Initial mount - Setting date to:', today);
    setSelectedDate('');
    setShowMonthEvents(true);
    loadSelectedCountries();
    loadTimeFormat();
  }, []);


  useEffect(() => {
    console.log('selectedDate changed to:', selectedDate);
    console.log('Current date is:', getLocalDateString());
  }, [selectedDate]);

  const [bannerConfig, setBannerConfig] = useState<{
    show: boolean;
    id: string;
    position: string;
  } | null>(null);

  const [currentMonth, setCurrentMonth] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  const formatEventTime = (timeValue: string): string => {
    if (!timeValue) return '';

    try {
      const time = new Date(parseInt(timeValue));

      if (isNaN(time.getTime())) {
        return timeValue;
      }

      return time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: !is24Hour
      });
    } catch (error) {
      console.error('Error formatting time:', timeValue, error);
      return timeValue;
    }
  };

  useEffect(() => {
    console.log('Syncing currentMonth.year:', currentMonth.year);
    setCurrentYear(currentMonth.year);
  }, [currentMonth.year, setCurrentYear]);

  const pulseAnim = useRef(new Animated.Value(0)).current;
  const API_KEY = "AIzaSyCbk3aJTWGqJZVHtb3SR7OqzUFEc9Cewe0";

  useEffect(() => {
    const config = AdsManager.getBannerConfig('home');
    setBannerConfig(config);
  }, []);

  useEffect(() => {
    console.log('Syncing params:', params);

    if (params.refresh) {
      console.log('Calendar refresh triggered');
      if (params.scrollToCurrentMonth === 'true') {
        console.log('Scrolling to current month');
        const today = new Date();
        const todayString = getLocalDateString(today);
        setCurrentCalendarDate(todayString);
        setCurrentMonth({
          month: today.getMonth() + 1,
          year: today.getFullYear(),
        });
        setCurrentYear(today.getFullYear());
        setSelectedDate('');
        setShowMonthEvents(true);
        setCalendarKey(prev => prev + 1);
        console.log('Scrolled to current month without selecting date');
        return;
      }

      if (params.resetToToday === 'true') {
        console.log('Resetting calendar to today');
        const today = new Date();
        const todayString = getLocalDateString(today);

        setSelectedDate(todayString);
        setCurrentCalendarDate(todayString);
        setCurrentMonth({
          month: today.getMonth() + 1,
          year: today.getFullYear(),
        });
        setCurrentYear(today.getFullYear());
        setShowMonthEvents(false);
        setCalendarKey(prev => prev + 1);
        console.log('Calendar reset complete:', todayString);
        return;
      }

      if (params.navigateToMonth === 'true' && params.targetDate) {
        console.log('Navigating to month from year view:', params.targetDate);
        const targetDate = params.targetDate as string;
        const targetYear = parseInt(params.targetYear as string);
        const targetMonth = parseInt(params.targetMonth as string);

        setCurrentCalendarDate(targetDate);
        setCurrentMonth({
          month: targetMonth,
          year: targetYear,
        });
        setCurrentYear(targetYear);
        setSelectedDate(targetDate);
        setShowMonthEvents(true);
        setCalendarKey(prev => prev + 1);

        console.log(`Opened ${targetMonth}/${targetYear} with holidays`);
        return;
      }

      if (params.navigateToDate === 'true' && params.targetDate) {
        console.log('Navigating to date from year view:', params.targetDate);
        const targetDate = params.targetDate as string;
        const targetYear = parseInt(params.targetYear as string);
        const targetMonth = parseInt(params.targetMonth as string);

        setCurrentCalendarDate(targetDate);
        setCurrentMonth({
          month: targetMonth,
          year: targetYear,
        });
        setCurrentYear(targetYear);
        setSelectedDate(targetDate);
        setShowMonthEvents(false);
        setCalendarKey(prev => prev + 1);

        console.log(`Opened date ${targetDate} with events`);
        return;
      }
    }
  }, [params.refresh, params.scrollToCurrentMonth, params.resetToToday, params.navigateToMonth, params.navigateToDate, params.targetDate, params.targetYear, params.targetMonth, setCurrentYear]);
  useEffect(() => {
    setCurrentYear(currentMonth.year);
  }, [currentMonth.year, setCurrentYear]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const pulseStyle = {
    transform: [
      {
        scale: pulseAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.6],
        }),
      },
    ],
    opacity: pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.6, 0],
    }),
  };

  useEffect(() => {
    LocaleConfig.locales['custom'] = {
      monthNames: [
        t('January'), t('February'), t('March'), t('April'),
        t('May'), t('June'), t('July'), t('August'),
        t('September'), t('October'), t('November'), t('December')
      ],
      monthNamesShort: [
        t('January').substring(0, 3), t('February').substring(0, 3),
        t('March').substring(0, 3), t('April').substring(0, 3),
        t('May').substring(0, 3), t('June').substring(0, 3),
        t('July').substring(0, 3), t('August').substring(0, 3),
        t('September').substring(0, 3), t('October').substring(0, 3),
        t('November').substring(0, 3), t('December').substring(0, 3)
      ],
      dayNames: [
        t('Sunday'), t('Monday'), t('Tuesday'), t('Wednesday'),
        t('Thursday'), t('Friday'), t('Saturday')
      ],
      dayNamesShort: [
        t('Sunday').substring(0, 3), t('Monday').substring(0, 3),
        t('Tuesday').substring(0, 3), t('Wednesday').substring(0, 3),
        t('Thursday').substring(0, 3), t('Friday').substring(0, 3),
        t('Saturday').substring(0, 3)
      ],
      today: t('Today')
    };
    LocaleConfig.defaultLocale = 'custom';
    setRefreshKey(prev => prev + 1);
  }, [i18n.language, t]);

  // useEffect(() => {
  //   const today = new Date().toISOString().split('T')[0];
  //   setSelectedDate(today);
  //   setShowMonthEvents(true);
  //   loadSelectedCountries();
  // }, []);

  useEffect(() => {
    global.firstDayChanged = (day: number) => {
      setFirstDayOfWeek(day);
      setRefreshKey(prev => prev + 1);
    };
    return () => {
      global.firstDayChanged = undefined;
    };
  }, []);

  const loadSelectedCountries = async () => {
    try {
      const savedData = await AsyncStorage.getItem('selectedCountry');
      console.log('Calendar - Loading countries:', savedData);

      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          const countries = Array.isArray(parsed) ? parsed : [parsed];
          setSelectedCountries(countries);
          console.log('Fetching holidays for:', countries);
          fetchAllHolidays(countries);
        } catch {
          setSelectedCountries([savedData]);
          fetchAllHolidays([savedData]);
        }
      } else {
        console.log('No saved countries, using India');
        setSelectedCountries(['United States']);
        fetchAllHolidays(['United States']);
      }
    } catch (error) {
      console.log('Error loading countries:', error);
      fetchAllHolidays(['United States']);
    }
  };

  const fetchAllHolidays = async (countries: string[]) => {
    setLoadingHolidays(true);
    const allHolidays: Holiday[] = [];

    try {
      for (const country of countries) {
        const calendarId = COUNTRY_CALENDAR_IDS[country];
        console.log('Calendar ID for', country, ':', calendarId);

        if (!calendarId) {
          console.log(`No calendar found for ${country}`);
          continue;
        }

        const encodedCalendarId = encodeURIComponent(calendarId);
        const API_URL = `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events?key=${API_KEY}&timeMin=2024-01-01T00:00:00Z&timeMax=2030-12-31T23:59:59Z&maxResults=1000&singleEvents=true&orderBy=startTime`;

        console.log('Fetching from API for', country);
        const res = await fetch(API_URL);
        const data = await res.json();

        if (data.error) {
          console.log('API Error for', country, ':', data.error.message);
          continue;
        }

        if (data.items) {
          console.log(`Found ${data.items.length} holidays for ${country}`);
          const formattedHolidays = data.items.map((item: any) => ({
            date: item.start.date,
            name: item.summary,
            country: country,
          }));
          allHolidays.push(...formattedHolidays);
        }
      }

      console.log(`Total holidays loaded: ${allHolidays.length}`);
      setHolidays(allHolidays);
    } catch (err) {
      console.log('Error fetching holidays:', err);
      setHolidays([]);
    } finally {
      setLoadingHolidays(false);
    }
  };

  const getRepeatDisplayText = (repeat: string) => {
    if (!repeat) return t('never');
    switch (repeat.toLowerCase()) {
      case 'does not repeat':
      case 'does_not':
        return t('never');
      case 'everyday':
      case 'daily':
        return t('everyday');
      case 'every week':
      case 'every_week':
      case 'weekly':
        return t('every_week');
      case 'every month':
      case 'every_month':
      case 'monthly':
        return t('every_month');
      case 'every year':
      case 'every_year':
      case 'yearly':
        return t('every_year');
      default:
        return t('never');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    Alert.alert(
      t('delete_event_title'),
      t('delete_event_message'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const events = await loadData('events') || [];
              const updatedEvents = events.filter((e: any) => e.id !== eventId);
              await saveData('events', updatedEvents);
              setMenuVisible(null);
              setEvents(updatedEvents);
              console.log('Event deleted successfully');
            } catch (error) {
              console.error('Error deleting event:', error);
              Alert.alert('Error', 'Failed to delete event');
            }
          }
        }
      ]
    );
  };

  useFocusEffect(
    React.useCallback(() => {
      const reloadData = async () => {
        const data = await loadData('events');
        if (data) setEvents(data);
      };

      reloadData();
      loadFirstDay();
      loadTimeFormat();
      loadSelectedCountries();

      console.log('🔄 useFocusEffect - Preserving view - Selected date:', selectedDate, 'Show month events:', showMonthEvents);
    }, [])
  );

  const loadEvents = async () => {
    setIsLoadingData(true);
    const data = await loadData('events');
    if (data) setEvents(data);
    setIsLoadingData(false);
  };


  const loadFirstDay = async () => {
    try {
      const day = await AsyncStorage.getItem('firstDayOfWeek');
      if (day) {
        const newFirstDay = parseInt(day);
        console.log('Calendar - Loading first day:', newFirstDay);
        setFirstDayOfWeek(newFirstDay);
        setRefreshKey(prev => prev + 1);
        const data = await loadData('events');
        if (data) setEvents(data);
      }
    } catch (error) {
      console.log('Error loading first day:', error);
    }
  };

  const getMonthEvents = () => {
    const { month, year } = currentMonth;
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const allEvents: any[] = [];

    events.forEach((event) => {
      const repeatType = event.repeat;
      const eventStartDate = event.startDate.split('T')[0];
      const eventStart = new Date(eventStartDate + 'T00:00:00');

      if (!repeatType || repeatType === 'Does not repeat' || repeatType === 'does_not') {
        const eventStartMonth = eventStart.getMonth() + 1;
        const eventStartYear = eventStart.getFullYear();

        if (event.allDay) {
          if (eventStartMonth === month && eventStartYear === year) {
            allEvents.push(event);
          }
        } else {
          const end = new Date(event.endDate.split('T')[0] + 'T00:00:00');
          if (eventStart <= lastDay && end >= firstDay) {
            allEvents.push(event);
          }
        }
        return;
      }

      let hasEventInMonth = false;
      if (eventStart > lastDay) return;

      switch (repeatType) {
        case 'Everyday':
        case 'everyday':
        case 'daily':
          hasEventInMonth = eventStart <= lastDay;
          break;
        case 'Every week':
        case 'every_week':
        case 'weekly':
          const eventWeekday = eventStart.getDay();
          let current = new Date(Math.max(firstDay.getTime(), eventStart.getTime()));
          while (current <= lastDay) {
            if (current.getDay() === eventWeekday) {
              hasEventInMonth = true;
              break;
            }
            current.setDate(current.getDate() + 1);
          }
          break;
        case 'Every month':
        case 'every_month':
        case 'monthly':
          const eventDate = eventStart.getDate();
          const daysInMonth = lastDay.getDate();
          if (eventDate <= daysInMonth) {
            hasEventInMonth = true;
          }
          break;
        case 'Every year':
        case 'every_year':
        case 'yearly':
          if (eventStart.getMonth() === month - 1) {
            hasEventInMonth = true;
          }
          break;
      }

      if (hasEventInMonth) {
        allEvents.push(event);
      }
    });

    const monthHolidays = holidays
      .filter((h) => {
        const holidayDate = new Date(h.date);
        return holidayDate.getMonth() + 1 === month && holidayDate.getFullYear() === year;
      })
      .map((h, index) => ({
        id: `holiday-${h.date}-${h.country}-${index}`,
        title: h.name,
        date: h.date,
        country: h.country,
        allDay: true,
        isHoliday: true,
      }));

    return [...monthHolidays, ...allEvents];
  };

  const getMarkedDates = () => {
    const marked: any = {};
    const eventDotsByDate: any = {};

    const formatDateString = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const { month, year } = currentMonth;
    const startRange = new Date(year, month - 4, 1);
    const endRange = new Date(year, month + 2, 0);

    // Process user events
    events.forEach((event) => {
      const eventColor = event.color || '#0267FF';
      const repeatType = event.repeat;
      const eventStartDate = event.startDate.split('T')[0];
      const eventStart = new Date(eventStartDate + 'T00:00:00');

      if (!repeatType || repeatType === 'Does not repeat' || repeatType === 'does_not') {
        if (!eventDotsByDate[eventStartDate]) {
          eventDotsByDate[eventStartDate] = [];
        }
        eventDotsByDate[eventStartDate].push(eventColor);
        return;
      }

      let current = new Date(Math.max(eventStart.getTime(), startRange.getTime()));

      while (current <= endRange) {
        const dateString = formatDateString(current);
        let shouldMark = false;

        switch (repeatType) {
          case 'Everyday':
          case 'everyday':
          case 'daily':
            shouldMark = current >= eventStart;
            break;
          case 'Every week':
          case 'every_week':
          case 'weekly':
            shouldMark = current >= eventStart && current.getDay() === eventStart.getDay();
            break;
          case 'Every month':
          case 'every_month':
          case 'monthly':
            shouldMark = current >= eventStart && current.getDate() === eventStart.getDate();
            break;
          case 'Every year':
          case 'every_year':
          case 'yearly':
            shouldMark = current >= eventStart &&
              current.getMonth() === eventStart.getMonth() &&
              current.getDate() === eventStart.getDate();
            break;
        }

        if (shouldMark) {
          if (!eventDotsByDate[dateString]) {
            eventDotsByDate[dateString] = [];
          }
          eventDotsByDate[dateString].push(eventColor);
        }
        current.setDate(current.getDate() + 1);
      }
    });

    // Add holiday dots (red dots for holidays)
    holidays.forEach((h) => {
      if (!marked[h.date]) {
        marked[h.date] = { marked: true, dots: [{ color: "#FF5252" }] };
      } else if (!marked[h.date].dots.find((dot: any) => dot.color === "#FF5252")) {
        if (marked[h.date].dots.length < 2) {
          marked[h.date].dots.push({ color: "#FF5252" });
        }
      }
    });

    Object.keys(eventDotsByDate).forEach((dateString) => {
      const eventColors = eventDotsByDate[dateString];
      const uniqueColors = [...new Set(eventColors)];
      const firstEventColor = uniqueColors[0];
      const secondEventColor = uniqueColors[1];

      if (!marked[dateString]) {
        marked[dateString] = {
          marked: true,
          dots: [{ color: firstEventColor }]
        };
      } else {
        if (marked[dateString].dots && marked[dateString].dots.length < 2) {
          marked[dateString].dots.push({ color: firstEventColor });
        }
      }

      if (secondEventColor && marked[dateString].dots.length < 2) {
        marked[dateString].dots.push({ color: secondEventColor });
      }
    });

    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: colors.primary,
      };
    }

    return marked;
  };

  const getSelectedDateEvents = () => {
    const dateToUse = selectedDate || getLocalDateString();
    const selectedDateOnly = dateToUse.split('T')[0];
    const selectedD = new Date(selectedDateOnly + 'T00:00:00');
    const allEvents: any[] = [];


    // const selected = selectedDate;
    // const selectedDateOnly = selected.split('T')[0];
    // const selectedD = new Date(selectedDateOnly + 'T00:00:00');
    // const allEvents: any[] = [];

    events.forEach((event) => {
      const repeatType = event.repeat;
      const eventStartDate = event.startDate.split('T')[0];
      const eventStart = new Date(eventStartDate + 'T00:00:00');

      if (selectedD < eventStart) return;

      if (!repeatType || repeatType === 'Does not repeat' || repeatType === 'does_not') {
        if (event.allDay) {
          if (eventStartDate === selectedDateOnly) {
            allEvents.push(event);
          }
        } else {
          const start = new Date(event.startDate.split('T')[0] + 'T00:00:00');
          const end = new Date(event.endDate.split('T')[0] + 'T00:00:00');
          if (selectedD >= start && selectedD <= end) {
            allEvents.push(event);
          }
        }
        return;
      }

      let shouldShow = false;

      switch (repeatType) {
        case 'Everyday':
        case 'everyday':
        case 'daily':
          shouldShow = true;
          break;
        case 'Every week':
        case 'every_week':
        case 'weekly':
          shouldShow = selectedD.getDay() === eventStart.getDay();
          break;
        case 'Every month':
        case 'every_month':
        case 'monthly':
          shouldShow = selectedD.getDate() === eventStart.getDate();
          break;
        case 'Every year':
        case 'every_year':
        case 'yearly':
          shouldShow = selectedD.getMonth() === eventStart.getMonth() &&
            selectedD.getDate() === eventStart.getDate();
          break;
      }

      if (shouldShow) {
        allEvents.push(event);
      }
    });

    const todayHolidays = holidays
      .filter((h) => h.date === selectedDateOnly)
      .map((h, index) => ({
        id: `holiday-${h.date}-${h.country}-${index}`,
        title: h.name,
        date: h.date,
        country: h.country,
        allDay: true,
        isHoliday: true,
      }));

    return [...todayHolidays, ...allEvents];
  };

  const handleEditEvent = (event: any) => {
    setMenuVisible(null);

    if (event.isHoliday) {
      router.push({
        pathname: '/holidayDetails',
        params: {
          title: event.title,
          date: event.date,
          country: event.country || '',
          alert: event.alert || "All-day",
        }
      });
      return;
    }

    router.push({
      pathname: '/editEvent',
      params: {
        eventId: event.id,
        title: event.title || '',
        description: event.description || '',
        startDate: event.startDate || event.date,
        endDate: event.endDate || event.date,
        startTime: event.startTime || '12:00 PM',
        endTime: event.endTime || '01:00 PM',
        allDay: String(event.allDay || false),
        repeat: event.repeat || 'Does not repeat',
        reminders: JSON.stringify(event.reminders || ['At a time of event']),
      }
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* <TrialBanner visible={trialActive} remainingDays={remainingDays} /> */}
      <View style={[styles.calendarContainer, {
        margin: 10,
        borderRadius: 10,
        backgroundColor: colors.background,
        shadowColor: '#535353',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
      }]}>
        <Calendar
          key={`${resolvedTheme}-${theme}-${firstDayOfWeek}-${refreshKey}-${i18n.language}-${calendarKey}-${systemColorScheme}`}
          firstDay={firstDayOfWeek}
          current={currentCalendarDate}
          onDayPress={(day) => {
            setSelectedDate(day.dateString);
            setShowMonthEvents(false);
          }}
          markedDates={getMarkedDates()}
          onMonthChange={(month) => {
            console.log('📆 Month changed to:', month);
            const newDate = `${month.year}-${String(month.month).padStart(2, '0')}-01`;
            setCurrentCalendarDate(newDate);
            setCurrentMonth({
              month: month.month,
              year: month.year,
            });
            setCurrentYear(month.year);
            setSelectedDate('');
            setShowMonthEvents(true);
          }}
          enableSwipeMonths={true}
          style={{ backgroundColor: colors.background, borderRadius: 10 }}
          theme={{
            backgroundColor: colors.background,
            calendarBackground: colors.background,
            textSectionTitleColor: colors.textPrimary,
            // textSectionTitleColor: colors.textSecondary,
            textSectionTitleDisabledColor: colors.textTertiary,
            selectedDayBackgroundColor: colors.primary,
            selectedDayTextColor: '#ffffff',
            todayTextColor: colors.primary,
            dayTextColor: colors.textPrimary,
            textDisabledColor: colors.textTertiary,
            dotColor: colors.primary,
            selectedDotColor: '#ffffff',
            arrowColor: colors.primary,
            disabledArrowColor: colors.textTertiary,
            monthTextColor: colors.textPrimary,
            indicatorColor: colors.primary,
          }}
          dayComponent={({ date, state, marking }: any) => {
            // const isSunday = new Date(date.dateString).getDay() === 0;
            const isSunday = new Date(date.dateString + 'T00:00:00').getDay() === 0;
            const currentDateString = getLocalDateString();
            const isSelected = date.dateString === selectedDate;
            const isToday = date.dateString === getLocalDateString();
            const RunningDotRing = () => {
              const rotateAnim = useRef(new Animated.Value(0)).current;
              useEffect(() => {
                Animated.loop(
                  Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 4000,
                    useNativeDriver: true,
                  })
                ).start();
              }, []);

              const spin = rotateAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg'],
              });

              return (
                <Animated.View
                  style={[
                    StyleSheet.absoluteFillObject,
                    {
                      width: 36,
                      height: 36,
                      borderRadius: 20,
                      borderWidth: 1.5,
                      borderColor: colors.primary,
                      borderStyle: 'dashed',
                      backgroundColor: 'transparent',
                      transform: [{ rotate: spin }],
                      position: 'absolute',
                      left: -2,
                      top: -2,
                      zIndex: -1,
                    },
                  ]}
                />
              );
            };

            const getBackgroundColor = () => {
              if (isSelected) {
                return colors.primary;
              }
              if (isToday) {
                return `${colors.primary}40`;
              }
              return 'transparent';
            };
            const getTextColor = () => {
              if (isSelected) {
                return '#ffffff';
              }
              if (state === 'disabled') {
                return colors.textTertiary;
              }
              if (isSunday || isToday) {
                return '#FF5252';
              }
              return colors.textPrimary;
            };

            return (
              <TouchableOpacity
                onPress={() => {
                  setSelectedDate(date.dateString);
                  setShowMonthEvents(false);
                }}
                // onLongPress={() => {
                //   setSelectedDate(date.dateString);
                //   router.push({
                //     pathname: '/templateSelection',
                //     params: { selectedDate: date.dateString }
                //   });
                // }}
                // delayLongPress={400}
                style={{
                  width: 32,
                  height: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: getBackgroundColor(),
                  borderRadius: 16,
                  position: 'relative',
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: getTextColor(),
                    fontWeight: isToday ? 'bold' : '400',
                  }}
                >
                  {date.day}
                </Text>
                {isToday && <RunningDotRing />}
                {marking?.dots && marking.dots.length > 0 && (
                  <View style={{ flexDirection: "row", position: "absolute", bottom: 3 }}>
                    {marking.dots.map((dot: any, index: number) => (
                      <View
                        key={index}
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: isSelected ? '#ffffff' : dot.color,
                          marginHorizontal: 1,
                        }}
                      />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <ScrollView style={styles.eventsScrollView}>
        <View style={[styles.eventsList, { backgroundColor: colors.background }]}>
          {(showMonthEvents ? getMonthEvents() : getSelectedDateEvents()).length > 0 ? (
            (showMonthEvents ? getMonthEvents() : getSelectedDateEvents()).map((event, index) => (
              <View key={`${event.id}-${index}`} style={{ marginBottom: 12 }}>
                <TouchableOpacity
                  style={[styles.eventCard, { backgroundColor: colors.cardBackground }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    router.push({
                      pathname: '/viewEvent',
                      params: {
                        eventId: event.id,
                        title: event.title || '',
                        description: event.description || '',
                        startDate: event.startDate || event.date,
                        endDate: event.endDate || event.date,
                        startTime: event.startTime || '12:00 PM',
                        endTime: event.endTime || '01:00 PM',
                        allDay: String(event.allDay || false),
                        repeat: event.repeat || 'does_not',
                        reminders: JSON.stringify(event.reminders || ['at_time']),
                        color: event.color || (event.isHoliday ? '#FF6B6B' : '#0267FF'),
                        isHoliday: String(event.isHoliday || false),
                        country: event.country || '',
                        bgImage: event.bgImage || '',
                      }
                    });
                  }}
                >
                  <View
                    style={[
                      styles.eventDateBar,
                      {
                        backgroundColor: event.isHoliday
                          ? '#FF6B6B'
                          : event.color || colors.primary,
                      },
                    ]}
                  />
                  <View style={styles.eventContent}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.eventTime, { color: colors.primary }]}>
                        {event.date || selectedDate}
                      </Text>
                      <Text style={[styles.eventRepeat, { color: colors.textTertiary, fontSize: 12, alignItems: 'center' }]}>
                        {getRepeatDisplayText(event.repeat || (event.isHoliday ? 'does_not' : ''))}
                      </Text>
                    </View>

                    <Text style={[styles.eventTitle, { color: colors.textPrimary }]}>
                      {event.title}
                    </Text>
                    <Text style={[styles.eventTime, { color: colors.textTertiary }]}>
                      {event.isHoliday
                        ? t('all_day')
                        : event.allDay
                          ? t('all_day')
                          : `${formatEventTime(event.startTime)} - ${formatEventTime(event.endTime)}`
                      }
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 0 }}>
              <Image
                // source={theme === "dark" ? darkNoEventImg : lightNoEventImg}
                source={isDarkMode ? darkNoEventImg : lightNoEventImg}
                style={{ width: 200, height: 200, marginBottom: 0 }}
                resizeMode="contain"
              />
              <Text
                style={[
                  styles.noDataText,
                  { color: colors.textTertiary, fontSize: 16 }
                ]}
              > {t("no_event_yet")}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      {/* FAB BUTTON */}
      <View style={{ position: "absolute", right: 30, bottom: 170 }}>
        <Animated.View
          style={[
            styles.pulseRing,
            pulseStyle,
            { backgroundColor: colors.primary },
          ]}
        />
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => {
            const dateToPass = selectedDate || getLocalDateString();
            router.push({
              pathname: "/addEvent",
              params: {
                selectedDate: dateToPass
              }
            });
          }}
          activeOpacity={0.8}
        >
          <Image
            source={require("../../assets/flags/plus1.png")}
            style={{ width: 55, height: 55 }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  calendarContainer: {

  },
  eventsScrollView: {
    flex: 1,
    marginBottom: 100,
  },
  eventsList: {
    padding: 16,
  },
  eventCard: {
    flexDirection: 'row',
    borderRadius: 8,
    marginBottom: 12,
  },
  eventDateBar: {
    width: 4,
  },
  eventContent: {
    flex: 1,
    padding: 12,
  },
  stickyAdContainer: {
    bottom: 20,
    left: 0,
    marginTop: 6,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventDesc: {
    fontSize: 14,
    marginBottom: 8,
  },
  eventTime: {
    fontSize: 14,
  },
  eventRepeatContainer: {
    justifyContent: 'center',
    paddingRight: 12,
    paddingLeft: 8,
  },
  eventRepeat: {
    justifyContent: "center",
    alignItems: 'center',
    textAlign: 'center',
  },
  bannerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  topPosition: {
    paddingTop: 10,
  },
  bottomPosition: {
    paddingBottom: 10,
  },

  eventRepeatText: {
    fontSize: 12,
    fontWeight: '500',
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 0,
  },
  pulseRing: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 40,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  eventMenuContainer: {
    position: 'relative',
    paddingTop: 8,
    paddingRight: 8,
  },
  menuButton: {
    padding: 4,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 0,
    right: 30,
    width: 130,
    borderRadius: 8,
    paddingVertical: 4,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 9999,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
});