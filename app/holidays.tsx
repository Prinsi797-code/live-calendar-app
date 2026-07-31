import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import React, { useEffect, useState } from 'react';
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  BannerAdSize,
  GAMBannerAd
} from 'react-native-google-mobile-ads';
import { COUNTRY_CALENDAR_IDS } from '../constants/countryCalendars';
import { useTheme } from '../contexts/ThemeContext';
import { useScreenTracking } from '../hooks/useScreenTracking';
import AdsManager from '../services/adsManager';
import NotificationService from '../services/NotificationService';

const SELECTED_COUNTRY_KEY = 'selectedCountry';
const HOLIDAYS_CACHE_KEY = 'holidays_cache_';
const LAST_FETCH_KEY = 'holidays_last_fetch_';
const CACHED_YEAR_KEY = 'holidays_cached_year_';

interface Holiday {
  date: string;
  name: string;
  country: string;
  rawDate: string;
}

interface CachedHolidayData {
  holidays: Holiday[];
  timestamp: number;
  year: number;
}

export default function Holidays() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const { t, i18n } = useTranslation();

  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);

  const [selectedCountries, setSelectedCountries] = useState<string[] | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  useScreenTracking('holiday_screen');

  const [bannerConfig, setBannerConfig] = useState<{
    show: boolean;
    id: string;
    position: string;
  } | null>(null);

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript || '';
    setSearchQuery(transcript);
  });
  useSpeechRecognitionEvent('end', () => setIsListening(false));
  useSpeechRecognitionEvent('error', () => setIsListening(false));

  const startVoiceSearch = async () => {
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) { alert('Microphone permission required!'); return; }
    setSearchQuery('');
    setIsListening(true);
    ExpoSpeechRecognitionModule.start({
      lang: i18n.language === 'hi' ? 'hi-IN' : 'en-US',
      interimResults: true,
      continuous: false,
    });
  };

  const stopVoiceSearch = () => {
    ExpoSpeechRecognitionModule.stop();
    setIsListening(false);
  };

  const closeSearch = () => {
    setIsSearching(false);
    setSearchQuery('');
    stopVoiceSearch();
  };

  // Filtered holidays
  const filteredHolidays = searchQuery.trim()
    ? holidays.filter(h =>
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.date.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : holidays;

  // Load countries first
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const savedCountry = await AsyncStorage.getItem(SELECTED_COUNTRY_KEY);
        console.log('Holidays - Loading saved country:', savedCountry);

        if (savedCountry) {
          try {
            const parsed = JSON.parse(savedCountry);
            const countries = Array.isArray(parsed) ? parsed : [parsed];
            console.log('Setting countries from storage:', countries);
            setSelectedCountries(countries);
          } catch {
            console.log('Setting single country:', savedCountry);
            setSelectedCountries([savedCountry]);
          }
        } else {
          console.log('No saved country found, using default: United Kingdom');
          setSelectedCountries(['United Kingdom']);
        }
      } catch (error) {
        console.log('Error loading countries:', error);
        setSelectedCountries(['United Kingdom']);
      }
    };

    loadCountries();
  }, []);

  // useEffect(() => {
  //   const config = AdsManager.getBannerConfig('search');
  //   console.log('📋 Language screen banner config:', config);
  //   setBannerConfig(config);
  // }, []);

  useEffect(() => {
    const loadBannerConfig = async () => {
      const config = await AdsManager.getBannerConfig('setting');
      console.log('holiday screen banner config:', config);
      setBannerConfig(config);
    };
    loadBannerConfig();
  }, []);


  const handleBackPress = async () => {
    try {
      const adShown = await AdsManager.showSettingScreenInterstitialAd('back');

      const targetRoute = {
        pathname: '/',
        params: {
          refresh: Date.now().toString(),
          resetToToday: 'true'
        }
      };

      if (adShown) {
        setTimeout(() => router.push(targetRoute), 100);
      } else {
        router.push(targetRoute);
      }
    } catch (error) {
      console.error("Back ad error:", error);
      router.push({
        pathname: '/',
        params: { refresh: Date.now().toString(), resetToToday: 'true' }
      });
    }
  };

  const API_KEY = "AIzaSyCbk3aJTWGqJZVHtb3SR7OqzUFEc9Cewe0";

  const formatDate = (rawDate: string, lang: string) => {
    const date = new Date(rawDate);
    return date.toLocaleDateString(
      lang === 'hi' ? 'hi-IN' : 'en-IN',
      {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }
    );
  };

  const loadCachedHolidays = async (country: string, year: number): Promise<Holiday[] | null> => {
    try {
      const cachedData = await AsyncStorage.getItem(`${HOLIDAYS_CACHE_KEY}${country}`);
      const cachedYear = await AsyncStorage.getItem(`${CACHED_YEAR_KEY}${country}`);

      if (cachedData && cachedYear) {
        const parsed: CachedHolidayData = JSON.parse(cachedData);

        if (parsed.year === year || parseInt(cachedYear) === year) {
          console.log(`Loaded ${parsed.holidays.length} cached holidays for ${country} (Year: ${year})`);
          return parsed.holidays;
        } else {
          console.log(`Cache year mismatch. Cached: ${parsed.year || cachedYear}, Current: ${year}`);
          return null;
        }
      }
    } catch (error) {
      console.log(`Error loading cached holidays for ${country}:`, error);
    }
    return null;
  };

  const saveCachedHolidays = async (country: string, holidays: Holiday[], year: number) => {
    try {
      const cacheData: CachedHolidayData = {
        holidays,
        timestamp: Date.now(),
        year: year
      };
      await AsyncStorage.setItem(`${HOLIDAYS_CACHE_KEY}${country}`, JSON.stringify(cacheData));
      await AsyncStorage.setItem(`${CACHED_YEAR_KEY}${country}`, year.toString());
      console.log(`Saved ${holidays.length} holidays to cache for ${country} (Year: ${year})`);
    } catch (error) {
      console.log(`Error saving holidays cache for ${country}:`, error);
    }
  };

  const shouldFetchCountry = async (country: string, year: number): Promise<boolean> => {
    try {
      const cachedYear = await AsyncStorage.getItem(`${CACHED_YEAR_KEY}${country}`);
      if (!cachedYear || parseInt(cachedYear) !== year) {
        console.log(`Year changed or no cache. Need to fetch ${country} for ${year}`);
        return true;
      }

      const cachedData = await AsyncStorage.getItem(`${HOLIDAYS_CACHE_KEY}${country}`);
      if (!cachedData) return true;

      return false;
    } catch (error) {
      return true;
    }
  };

  const markCountryFetched = async (country: string) => {
    try {
      await AsyncStorage.setItem(`${LAST_FETCH_KEY}${country}`, Date.now().toString());
    } catch (error) {
      console.log(`Error marking country as fetched:`, error);
    }
  };

  const cleanupUnselectedCountries = async (currentCountries: string[]) => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key =>
        key.startsWith(HOLIDAYS_CACHE_KEY) ||
        key.startsWith(LAST_FETCH_KEY) ||
        key.startsWith(CACHED_YEAR_KEY)
      );

      for (const key of cacheKeys) {
        const country = key
          .replace(HOLIDAYS_CACHE_KEY, '')
          .replace(LAST_FETCH_KEY, '')
          .replace(CACHED_YEAR_KEY, '');
        if (!currentCountries.includes(country)) {
          await AsyncStorage.removeItem(key);
          console.log(`Removed cache for unselected country: ${country}`);
        }
      }
    } catch (error) {
      console.log('Error cleaning up cache:', error);
    }
  };

  useEffect(() => {
    if (selectedCountries === null) {
      console.log('⏳ Waiting for countries to load...');
      return;
    }

    if (selectedCountries.length === 0) {
      console.log('⚠️ No countries selected');
      setLoading(false);
      return;
    }

    const fetchAllHolidays = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('Starting holiday fetch for countries:', selectedCountries);
        const allHolidaysData: Holiday[] = [];

        await cleanupUnselectedCountries(selectedCountries);

        const lastCleanup = await AsyncStorage.getItem('last_notification_cleanup');
        const nowMs = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;

        if (!lastCleanup || nowMs - parseInt(lastCleanup) > oneDayMs) {
          console.log('Running daily notification cleanup...');
          const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
          console.log(`Found ${allScheduled.length} total scheduled notifications`);

          let cancelledCount = 0;

          for (const notif of allScheduled) {
            if (notif.content.data?.type === 'festival') {
              const festivalDateStr = notif.content.data?.festivalDate;
              if (festivalDateStr) {
                const [year, month, day] = festivalDateStr.split('-').map(Number);
                const festivalDate = new Date(year, month - 1, day, 23, 59, 59, 999);

                if (festivalDate.getTime() + oneDayMs < nowMs) {
                  await Notifications.cancelScheduledNotificationAsync(notif.identifier);
                  cancelledCount++;
                  console.log(`Cleaned up old: ${notif.content.title} from ${festivalDateStr}`);

                  const festivalId = notif.content.data?.festivalId;
                  if (festivalId) {
                    await AsyncStorage.removeItem(`festival_${festivalId}_notif`);
                  }
                }
              }
            }
          }
          console.log(`Cleaned up ${cancelledCount} old notifications`);
          await AsyncStorage.setItem('last_notification_cleanup', nowMs.toString());
        } else {
          console.log('Skipping cleanup - already done today');
        }
        for (const country of selectedCountries) {
          console.log(`Processing country: ${country}`);
          const calendarId = COUNTRY_CALENDAR_IDS[country];

          if (!calendarId) {
            console.error(`Calendar ID not found for ${country}`);
            console.log('Available calendar IDs:', Object.keys(COUNTRY_CALENDAR_IDS));
            continue;
          }
          console.log(`Calendar ID found for ${country}: ${calendarId}`);
          const needsFetch = await shouldFetchCountry(country, currentYear);

          if (!needsFetch) {
            console.log(`Loading ${country} holidays from cache for year ${currentYear}...`);
            const cachedHolidays = await loadCachedHolidays(country, currentYear);

            if (cachedHolidays) {
              console.log(`Loaded ${cachedHolidays.length} cached holidays for ${country}`);
              allHolidaysData.push(...cachedHolidays);

              let scheduledCount = 0;
              let skippedCount = 0;

              for (const holiday of cachedHolidays) {
                try {
                  if (!holiday.rawDate || !holiday.rawDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    continue;
                  }
                  const [year, month, day] = holiday.rawDate.split('-').map(Number);
                  if (!year || !month || !day || year !== currentYear) {
                    continue;
                  }
                  const festivalDate = new Date(year, month - 1, day, 0, 1, 0, 0);
                  const festivalTimeMs = festivalDate.getTime();
                  if (festivalTimeMs - nowMs > 120000) {
                    const festivalId = `festival_${holiday.rawDate}_${holiday.name}_${country}`;
                    const existingNotifId = await AsyncStorage.getItem(`festival_${festivalId}_notif`);

                    if (!existingNotifId) {
                      const notificationId = await NotificationService.scheduleFestivalNotification(
                        festivalId,
                        holiday.name,
                        holiday.rawDate,
                        country
                      );
                      if (notificationId) {
                        scheduledCount++;
                      }
                    } else {
                      skippedCount++;
                    }
                  }
                } catch (error) {
                  console.error(`Error scheduling cached ${holiday.name}:`, error);
                }
              }
              if (scheduledCount > 0) {
                console.log(`Scheduled ${scheduledCount} new notifications for ${country}`);
              }
              if (skippedCount > 0) {
                console.log(`Skipped ${skippedCount} already scheduled for ${country}`);
              }
              console.log(`Finished processing ${country} from cache`);
              continue;
            } else {
              console.log(`No cached holidays found for ${country}, will fetch from API`);
            }
          }
          console.log(`Fetching ${country} holidays from API for year ${currentYear}...`);
          const encodedCalendarId = encodeURIComponent(calendarId);
          const API_URL =
            `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events` +
            `?key=${API_KEY}` +
            `&timeMin=${currentYear}-01-01T00:00:00Z` +
            `&timeMax=${currentYear}-12-31T23:59:59Z` +
            `&maxResults=2000` +
            `&singleEvents=true` +
            `&orderBy=startTime` +
            `&hl=${i18n.language === 'hi' ? 'hi' : 'en'}`;

          try {
            const res = await fetch(API_URL);
            const data = await res.json();

            if (data.error) {
              console.error(`API Error for ${country}:`, data.error);
              continue;
            }
            if (data.items && data.items.length > 0) {
              console.log(`Found ${data.items.length} holidays for ${country} in ${currentYear}`);
              const formatted = data.items.map((item: any) => ({
                date: formatDate(item.start.date, i18n.language),
                name: item.summary,
                country: country,
                rawDate: item.start.date
              }));

              allHolidaysData.push(...formatted);
              console.log(`Added ${formatted.length} holidays for ${country} to total list`);

              await saveCachedHolidays(country, formatted, currentYear);
              await markCountryFetched(country);

              let scheduledCount = 0;
              let skippedCount = 0;

              for (const item of data.items) {
                try {
                  if (!item.start.date || !item.start.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    continue;
                  }
                  const [year, month, day] = item.start.date.split('-').map(Number);

                  if (!year || !month || !day || year !== currentYear) {
                    continue;
                  }
                  const festivalDate = new Date(year, month - 1, day, 0, 1, 0, 0);
                  const festivalTimeMs = festivalDate.getTime();
                  if (festivalTimeMs - nowMs > 120000) {
                    const festivalId = `festival_${item.id}_${country}`;
                    const existingNotifId = await AsyncStorage.getItem(`festival_${festivalId}_notif`);
                    if (!existingNotifId) {
                      const notificationId = await NotificationService.scheduleFestivalNotification(
                        festivalId,
                        item.summary,
                        item.start.date,
                        country
                      );
                      if (notificationId) {
                        scheduledCount++;
                      }
                    } else {
                      skippedCount++;
                    }
                  }
                } catch (error) {
                  console.error(`Error scheduling ${item.summary}:`, error);
                }
              }
              if (scheduledCount > 0) {
                console.log(`Scheduled ${scheduledCount} new festival notifications for ${country}`);
              }
              if (skippedCount > 0) {
                console.log(`Skipped ${skippedCount} already scheduled for ${country}`);
              }
            } else {
              console.log(`No holidays found in API response for ${country}`);
            }
            console.log(`Finished processing ${country} from API`);
          } catch (error) {
            console.error(`Error fetching holidays for ${country}:`, error);
          }
        }
        console.log(`\n📊 Total holidays collected from all countries: ${allHolidaysData.length}`);
        allHolidaysData.sort((a, b) => {
          const dateA = new Date(a.rawDate).getTime();
          const dateB = new Date(b.rawDate).getTime();
          return dateA - dateB;
        });
        setHolidays(allHolidaysData);
        if (allHolidaysData.length === 0) {
          setError(`No holidays found for ${currentYear}`);
        } else {
          console.log(`Successfully loaded ${allHolidaysData.length} holidays for ${currentYear}`);
        }
      } catch (err) {
        console.error("Critical error fetching holidays:", err);
        setError("Failed to load holidays. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllHolidays();
  }, [selectedCountries, i18n.language, currentYear]);
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        {!isSearching ? (
          <>
            <TouchableOpacity onPress={handleBackPress} style={styles.closeBtn} activeOpacity={0.7}>
              <View style={[styles.closeBtnCircle, { backgroundColor: colors.cardBackground }]}>
                <Ionicons name="chevron-back" size={28} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {t("holiday")} {currentYear}
            </Text>
            <TouchableOpacity
              onPress={() => setIsSearching(true)}
              style={[styles.closeBtnCircle, { backgroundColor: colors.cardBackground }]}
            >
              <Feather name="search" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={closeSearch}>
              <Feather name="x" size={26} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginHorizontal: 10, position: 'relative', justifyContent: 'center' }}>
              {isListening && (
                <View style={styles.voicePill}>
                  <Ionicons name="mic" size={13} color="#fff" />
                  <View style={styles.voiceDivider} />
                  <Text style={styles.voiceLangText}>
                    {i18n.language === 'hi' ? 'HI' : 'EN'}
                  </Text>
                </View>
              )}

              <TextInput
                placeholder={`${t("search")} ${t("holiday")}...`}
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                style={[styles.searchInput, {
                  color: colors.textPrimary,
                  backgroundColor: colors.cardBackground,
                  paddingLeft: isListening ? 90 : 14,
                  paddingRight: 40,
                }]}
              />
              <TouchableOpacity
                onPress={searchQuery.length > 0
                  ? () => setSearchQuery('')
                  : isListening ? stopVoiceSearch : startVoiceSearch}
                style={styles.inputMicBtn}
              >
                {searchQuery.length > 0 ? (
                  <Feather name="x" size={18} color={colors.textTertiary} />
                ) : (
                  <Ionicons
                    name={isListening ? 'mic' : 'mic-outline'}
                    size={20}
                    color={isListening ? '#FF3B30' : colors.textTertiary}
                  />
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.textPrimary} size="large" style={{ marginTop: 20 }} />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.textPrimary }]}>{error}</Text>
        </View>
      ) : holidays.length === 0 ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.textPrimary }]}>
            No holidays found for {currentYear}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {filteredHolidays.map((holiday, index) => (
            <View key={`${holiday.country}_${index}`} style={[styles.card, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.redBar, { backgroundColor: '#FF433A' }]} />
              <View style={styles.textSection}>
                <Text style={[styles.date, { color: '#FF433A' }]}>{holiday.date}</Text>
                <Text style={[styles.name, { color: colors.textPrimary }]}>{holiday.name}</Text>
                <Text style={[styles.country, { color: colors.textSecondary, fontSize: 13, marginTop: 2 }]}>
                  {holiday.country}
                </Text>
                <Text style={[styles.subText, { color: colors.textTertiary }]}>{t("allday")}</Text>
              </View>
              <Text style={[styles.never, { color: colors.textTertiary }]}>{t("never")}</Text>
            </View>
          ))}
        </ScrollView>
      )}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 50,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  voicePill: {
    position: 'absolute',
    left: 6,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  voiceDivider: {
    width: 1,
    height: 13,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  voiceLangText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  searchInput: {
    height: 42,
    borderRadius: 21,
    fontSize: 16,
    paddingHorizontal: 14,
  },
  inputMicBtn: {
    position: 'absolute',
    right: 8,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backIcon: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  closeBtn: { minWidth: 50, alignItems: 'flex-start', justifyContent: 'center' },
  closeBtnCircle: {
    width: 40, height: 40, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnX: { fontSize: 25, fontWeight: '700' },
  card: {
    flexDirection: 'row',
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  redBar: {
    width: 4,
  },
  textSection: {
    flex: 1,
    padding: 16,
  },
  date: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  country: {
    fontSize: 13,
    marginTop: 2,
  },
  subText: {
    fontSize: 12,
  },
  never: {
    fontSize: 12,
    padding: 16,
    alignSelf: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 70,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  stickyAdContainer: {
    marginBottom: 10,
    alignItems: 'center',
    paddingVertical: 8,
  },
});