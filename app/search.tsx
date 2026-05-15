import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BannerAdSize,
  GAMBannerAd
} from 'react-native-google-mobile-ads';
import { useTheme } from '../contexts/ThemeContext';
import AdsManager from '../services/adsManager';
import { loadData } from '../utils/storage';

export default function SearchScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [memos, setMemos] = useState<any[]>([]);

  const lightNoEventImg = require("../assets/images/search2.png");
  const darkNoEventImg = require("../assets/images/search1.png");

  const [diaries, setDiaries] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [is24Hour, setIs24Hour] = useState(false);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const API_KEY = "AIzaSyCbk3aJTWGqJZVHtb3SR7OqzUFEc9Cewe0";
  const calendarId = "en.indian#holiday@group.v.calendar.google.com";
  const encodedCalendarId = encodeURIComponent(calendarId);
  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear}-01-01T00:00:00Z`;
  const endDate = `${currentYear + 3}-12-31T23:59:59Z`;

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const [bannerConfig, setBannerConfig] = useState<{
    show: boolean;
    id: string;
    position: string;
  } | null>(null);

  useEffect(() => {
    const loadTimeFormat = async () => {
      try {
        const manualSetting = await AsyncStorage.getItem('user_manual_24hour_override');
        setIs24Hour(manualSetting === 'true');
      } catch (error) {
        console.error('Error loading time format:', error);
      }
    };
    loadTimeFormat();
  }, []);

  useEffect(() => {
    const config = AdsManager.getBannerConfig('home');
    setBannerConfig(config);
  }, []);

  useEffect(() => {
    filterAllItems();
  }, [searchQuery, events, challenges, memos, diaries, holidays]);

  const formatTime = (timeValue: string | number) => {
    if (!timeValue) return 'Not set';

    try {
      const time = new Date(parseInt(String(timeValue)));

      if (isNaN(time.getTime())) {
        return 'Not set';
      }

      return time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: !is24Hour
      });
    } catch (error) {
      console.error('Error formatting time:', timeValue, error);
      return 'Not set';
    }
  };
  const fetchHolidays = async () => {
    try {
      const API_URL = `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events` +
        `?key=${API_KEY}` +
        `&timeMin=${currentYear}-01-01T00:00:00Z` +
        `&timeMax=${currentYear + 3}-12-31T23:59:59Z` +
        `&maxResults=1000` +
        `&singleEvents=true` +
        `&orderBy=startTime` +
        `&hl=${i18n.language === 'hi' ? 'hi' : 'en'}`;

      const response = await fetch(API_URL);
      const data = await response.json();

      if (data.items) {
        const holidayEvents = data.items.map((item: any) => ({
          id: `holiday-${item.id}`,
          title: item.summary,
          date: item.start.date || item.start.dateTime.split('T')[0],
          allDay: true,
          type: 'holiday',
        }));
        setHolidays(holidayEvents);
      }
    } catch (error) {
      console.error('Error fetching holidays:', error);

      setHolidays([]);
    }
  };
  const loadAllData = async () => {
    try {
      setLoading(true);

      const eventsData = await loadData('events');
      if (eventsData) setEvents(eventsData);

      const challengesData = await AsyncStorage.getItem('challenges');
      if (challengesData) {
        const parsedChallenges = JSON.parse(challengesData);
        setChallenges(parsedChallenges);
      }

      const memosData = await AsyncStorage.getItem('memos');
      if (memosData) {
        const parsedMemos = JSON.parse(memosData);
        setMemos(parsedMemos);
      }
      const diariesData = await AsyncStorage.getItem('diarys');
      if (diariesData) {
        const parsedDiaries = JSON.parse(diariesData);
        setDiaries(parsedDiaries);
      }
      await fetchHolidays();

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };
  const filterAllItems = () => {
    let allItems: any[] = [];

    allItems = allItems.concat(
      holidays.map((h) => ({
        ...h,
        type: 'holiday',
        displayDate: h.date,
      }))
    );

    allItems = allItems.concat(
      events.map((e) => ({
        ...e,
        type: 'event',
        displayDate: e.date || e.startDate,
      }))
    );

    // Add challenges
    allItems = allItems.concat(
      challenges.map((c) => ({
        ...c,
        type: 'challenge',
        displayDate: c.startDate ? new Date(c.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      }))
    );

    allItems = allItems.concat(
      memos.map((m) => ({
        ...m,
        type: 'memo',
        displayDate: m.Date || m.date || new Date().toISOString().split('T')[0],
      }))
    );
    allItems = allItems.concat(
      diaries.map((d) => ({
        ...d,
        type: 'diary',
        displayDate: d.Date ? new Date(d.Date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      }))
    );
    if (searchQuery.trim() !== '') {
      allItems = allItems.filter((item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredItems(allItems);
  };

  const groupItemsByDate = () => {
    const grouped: { [key: string]: any[] } = {};

    filteredItems.forEach((item) => {
      const date = item.displayDate;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(item);
    });
    const sortedDates = Object.keys(grouped).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    return sortedDates.map((date) => ({
      date,
      items: grouped[date],
    }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getTypeStyle = (type: string, item?: any) => {
    switch (type) {
      case 'holiday':
        return { color: '#FF6B6B', icon: 'calendar' };
      case 'event':
        return {
          color: item?.color || '#0267FF',
          icon: 'calendar'
        };
      case 'challenge':
        return { color: '#4CAF50', icon: 'target' };
      case 'memo':
        return { color: '#FF9800', icon: 'file-text' };
      case 'diary':
        return { color: '#9C27B0', icon: 'book' };
      default:
        return { color: '#0267FF', icon: 'calendar' };
    }
  };

  // Navigate to appropriate edit screen
  const handleItemPress = (item: any) => {
    switch (item.type) {
      case 'event':
        router.push({
          pathname: '/editEvent',
          params: {
            eventId: item.id,
            title: item.title,
            description: item.description,
            startDate: item.startDate,
            endDate: item.endDate,
            startTime: item.startTime,
            endTime: item.endTime,
            allDay: item.allDay.toString(),
            repeat: item.repeat,
            reminders: JSON.stringify(item.reminders),
          },
        });
        break;
      case 'challenge':
        router.push({
          pathname: '/challenge/new',
          params: { id: item.id },
        });
        break;
      case 'memo':
        router.push({
          pathname: '/memo/new',
          params: { id: item.id },
        });
        break;
      case 'diary':
        router.push({
          pathname: '/diary/new',
          params: { id: item.id },
        });
        break;
      default:
        break;
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    inputRef.current?.clear();
  };

  // const handleBackPress = () => {
  //   setSearchQuery('');

  //   const today = new Date();
  //   const todayString = today.toISOString().split('T')[0];

  //   router.push({
  //     pathname: '/',
  //     params: {
  //       refresh: Date.now().toString(),
  //       resetToToday: 'true'
  //     }
  //   });
  // };


  const handleBackPress = async () => {
    try {
      setSearchQuery('');
      console.log('Search back pressed, attempting to show ad...');
      const adShown = await AdsManager.showEventScreenInterstitialAd('Search', 'back');
      if (adShown) {
        console.log('Search back ad shown, navigating after ad closes');
      }
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      router.push({
        pathname: '/',
        params: {
          refresh: Date.now().toString(),
          resetToToday: 'true'
        }
      });
    } catch (error) {
      console.error("Back press error:", error);

      router.push({
        pathname: '/',
        params: {
          refresh: Date.now().toString(),
          resetToToday: 'true'
        }
      });
    }
  };



  const groupedItems = groupItemsByDate();

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t('loading')}...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <View style={[styles.closeBtnCircle, { backgroundColor: colors.cardBackground }]}>
            {/* <Text style={[styles.closeBtnX, { color: colors.textPrimary }]}>✕</Text> */}
            <Ionicons name="chevron-back" size={28} color={colors.textSecondary} />
          </View>
          {/* <Feather name="arrow-left" size={24} color={colors.textPrimary} /> */}
        </TouchableOpacity>

        <View style={styles.searchInputContainer}>
          <TextInput
            ref={inputRef}
            style={[
              styles.searchInput,
              {
                backgroundColor: colors.cardBackground,
                color: colors.textPrimary,
              },
            ]}
            placeholder={t("search_events")}
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearSearch}
            >
              <Feather name="x" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push('/settings')}
        >
          <Feather name="settings" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} >
        {groupedItems.length > 0 ? (
          groupedItems.map((group) => (
            <View key={group.date} style={styles.dateGroup}>
              <Text style={[styles.dateHeader, { color: colors.textPrimary }]}>
                {formatDate(group.date)}
              </Text>
              {group.items.map((item) => {
                const typeStyle = getTypeStyle(item.type, item);

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.eventCard,
                      { backgroundColor: colors.cardBackground },
                    ]}
                    activeOpacity={0.7}
                    // onPress={() => handleItemPress(item)}
                    disabled={item.type === 'holiday'}
                  >
                    <View
                      style={[
                        styles.eventColorBar,
                        { backgroundColor: typeStyle.color },
                      ]}
                    />

                    <View style={styles.eventContent}>
                      {item.icon ? (
                        <View style={styles.titleRow}>
                          <Text style={styles.itemIcon}>{item.icon}</Text>
                          <Text
                            style={[
                              styles.eventTitle,
                              { color: colors.textPrimary },
                            ]}
                            numberOfLines={2}
                          >
                            {item.title}
                          </Text>
                        </View>
                      ) : (
                        <Text
                          style={[
                            styles.eventTitle,
                            { color: colors.textPrimary },
                          ]}
                          numberOfLines={2}
                        >
                          {item.title}
                        </Text>
                      )}

                      {item.type !== 'diary' && (
                        <View style={styles.eventDetails}>
                          {(item.type === 'holiday' || item.allDay) && (
                            <Text
                              style={[
                                styles.eventTime,
                                { color: colors.textTertiary },
                              ]}
                            >
                              {t('all_day')}
                            </Text>
                          )}
                          {item.type === 'event' && !item.allDay && item.startTime && (
                            <Text
                              style={[
                                styles.eventTime,
                                { color: colors.textTertiary },
                              ]}
                            >
                              {`${formatTime(item.startTime)} - ${formatTime(item.endTime)}`}
                            </Text>
                          )}
                          {item.type === 'challenge' && (
                            <Text
                              style={[
                                styles.eventTime,
                                { color: colors.textTertiary },
                              ]}
                            >
                              {item.repeat === 'everyday'
                                ? t('daily')
                                : item.repeat === 'every_week'
                                  ? t('weekly')
                                  : item.repeat === 'every_month'
                                    ? t('monthly')
                                    : t('once')}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>

                    {/* Type Badge */}
                    <View
                      style={[
                        styles.typeBadge,
                        { backgroundColor: typeStyle.color },
                      ]}
                    >
                      <Feather
                        name={typeStyle.icon as any}
                        size={12}
                        color="#FFF"
                      />
                      <Text style={styles.typeBadgeText}>
                        {t(item.type)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Image
              source={theme === "dark" ? darkNoEventImg : lightNoEventImg}
              style={{ width: 170, height: 170, marginBottom: 0 }}
              resizeMode="contain"
            />
            <Text
              style={[
                styles.noDataText,
                { color: colors.textTertiary, fontSize: 16 }
              ]}
            >
              {t("no_results_found")}
            </Text>
          </View>
          // <View style={styles.noResultsContainer}>
          //   <Feather
          //     name="search"
          //     size={64}
          //     color={colors.textTertiary}
          //     style={styles.noResultsIcon}
          //   />
          //   <Text
          //     style={[styles.noResultsText, { color: colors.textTertiary }]}
          //   >
          //     {searchQuery.trim() === ''
          //       ? t('start_typing_to_search')
          //       : t('no_results_found')}
          //   </Text>
          // </View>
        )}
      </ScrollView>
      {bannerConfig?.show && (
        <View style={styles.stickyAdContainer}>
          <GAMBannerAd
            unitId={bannerConfig.id}
            sizes={[BannerAdSize.BANNER]}
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
    paddingTop: 30,
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 10,
  },
  closeBtnCircle: {
    width: 40, height: 40, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  stickyAdContainer: {
    bottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 40,
    gap: 12,
  },
  backButton: {
    // padding: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  itemIcon: {
    fontSize: 18,
  },
  searchInputContainer: {
    flex: 1,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingRight: 44,
    fontSize: 16,
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  settingsButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  dateGroup: {
    marginBottom: 1,
  },
  dateHeader: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  eventCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eventColorBar: {
    width: 4,
  },
  eventContent: {
    flex: 1,
    padding: 16,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventTime: {
    fontSize: 14,
  },
  repeatBadge: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  holidayBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  holidayBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  noResultsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noResultsIcon: {
    marginBottom: 16,
  },
  noResultsText: {
    fontSize: 16,
    textAlign: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    margin: 8,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});