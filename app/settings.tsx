import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ImageBackground, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// import { Alert, Image, ImageBackground, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import {
  BannerAdSize,
  GAMBannerAd
} from 'react-native-google-mobile-ads';
import { useTheme } from '../contexts/ThemeContext';
import { useScreenTracking } from '../hooks/useScreenTracking';
import AdsManager from '../services/adsManager';
import PurchaseManager from '../services/purchaseManager';
import { getDailyQuoteData } from '../utils/dailyQuoteStorage';
import { getAllMoodEntries, MOOD_OPTIONS } from '../utils/moodStorage';
import { getProfile, saveProfile, UserProfile } from '../utils/profileStorage';

export default function Settings() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const searchParams = useLocalSearchParams();
  const { theme, colors } = useTheme();
  const [isPremium, setIsPremium] = useState(false);
  useScreenTracking('setting_screen');
  const [bannerConfig, setBannerConfig] = useState<{
    show: boolean;
    id: string;
    position: string;
  } | null>(null);

  // useEffect(() => {
  //   const config = AdsManager.getBannerConfig('setting');
  //   setBannerConfig(config);
  // }, []);

  useEffect(() => {
    const loadBannerConfig = async () => {
      const config = await AdsManager.getBannerConfig('setting');
      console.log('setting screen banner config:', config);
      setBannerConfig(config);
    };
    loadBannerConfig();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const checkPremium = async () => {
        const premium = await PurchaseManager.isPremium();
        setIsPremium(premium);
      };
      checkPremium();
    }, [])
  );

  const WEEKDAY_KEYS_MON_FIRST = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];


  const loadDailyQuote = async () => {
    const daily = await getDailyQuoteData();
    if (daily) {
      setDailyQuote({ text: daily.quoteText, imageUrl: daily.imageUrl });
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadProfileAndMoods();
      loadDailyQuote();
    }, [i18n.language])
  );

  const handleBackPress = async () => {
    console.log('Settings back button pressed');

    const isYearView = searchParams?.from === "year-view";

    const targetRoute = {
      pathname: isYearView ? "/year-view" : "/",
      params: isYearView
        ? {}
        : {
          refresh: Date.now().toString(),
          resetToToday: 'true',
        },
    };

    if (!isPremium) {
      console.log('Attempting to show settings back ad...');
      const adShown = await AdsManager.showSettingScreenInterstitialAd('back');

      if (adShown) {
        console.log('Settings back ad shown, navigating after ad closes');
        setTimeout(() => router.push(targetRoute), 500);
        return;
      }
    }

    console.log('Navigating immediately');
    router.push(targetRoute);
  };

  const handleNotifications = () => {
    router.push('/notificationmore');
  };

  const handleTimeFormat = () => {
    router.push('/time');
  };

  const handleAfterCall = () => {
    Alert.alert(
      t("after_call_feature_msg"),
      t("feature_coming_soon")
    );
  };

  const handleThemeMode = () => {
    router.push('/theme-mode');
  };

  const handleViewDailyQuote = () => {
    router.push('/daily-quote');
  };

  // const handleRate = async async () => {
  // Alert.alert(t("rate_us"), (t("would_you_app")), [
  //   {
  //     text: t("cancel"),
  //     style: "cancel",
  //   },
  //   {
  //     text: t("rate"),
  //     onPress: () => {
  //       Alert.alert(
  //         t("thank_you"),
  //         t("redirecting_store")
  //       );
  //     },
  //   }
  // ]);
  const handleRate = async () => {
    const url = "https://apps.apple.com/in/app/smart-calendar-dailt-planner/id6756920857";

    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      console.log("Cannot open App Store");
    }
  };

  const [profile, setProfile] = useState<UserProfile>({ name: '', photoUri: null });
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [weekMoods, setWeekMoods] = useState<any[]>([]);
  const [profileImageError, setProfileImageError] = useState(false);
  const [dailyQuote, setDailyQuote] = useState<{ text: string; imageUrl: string | null }>({
    text: '',
    imageUrl: null,
  });

  const getCurrentWeekDates = (dayLabels: string[]) => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);

    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      week.push({
        dateStr: `${yyyy}-${mm}-${dd}`,
        dayNum: d.getDate(),
        dayLabel: dayLabels[i],
        isToday: d.toDateString() === today.toDateString(),
      });
    }
    return week;
  };

  const DOW = WEEKDAY_KEYS_MON_FIRST.map((key) => t(key).charAt(0));
  const loadProfileAndMoods = async () => {
    const savedProfile = await getProfile();
    setProfile(savedProfile);
    setProfileImageError(false);
    setTempName(savedProfile.name);

    const allMoods = await getAllMoodEntries();
    const weekDates = getCurrentWeekDates(DOW); // <-- pass DOW here
    const merged = weekDates.map((day) => ({
      ...day,
      entry: allMoods[day.dateStr] || null,
    }));
    setWeekMoods(merged);
  };

  useFocusEffect(
    React.useCallback(() => {
      loadProfileAndMoods();
    }, [i18n.language])
  );

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      try {
        const pickedUri = result.assets[0].uri;
        const fileName = `profile_${Date.now()}.jpg`;
        const permanentUri = FileSystem.documentDirectory + fileName;

        await FileSystem.copyAsync({
          from: pickedUri,
          to: permanentUri,
        });

        const newProfile = { ...profile, photoUri: permanentUri };
        setProfile(newProfile);
        setProfileImageError(false);
        await saveProfile(newProfile);
      } catch (e) {
        console.log('Error saving profile image:', e);
        Alert.alert('Error', 'Could not save profile picture.');
      }
    }
  };

  const handleSaveName = async () => {
    const newProfile = { ...profile, name: tempName };
    setProfile(newProfile);
    await saveProfile(newProfile);
    setIsEditingName(false);
  };

  const findMoodImage = (moodKey: string) => {
    return MOOD_OPTIONS.find((m: any) => m.key === moodKey)?.image;
  };

  const handleShare = async () => {
    try {
      const result = await Share.share({
        title: t("share_app"),
        message:
          `${t("share_friends")}\n\n` +
          `👉 https://apps.apple.com/app/id6756920857`,
        url: "https://apps.apple.com/app/id6756920857",
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log("Shared with activity:", result.activityType);
        } else {
          console.log("App shared successfully");
        }
      } else if (result.action === Share.dismissedAction) {
        console.log("Share dismissed");
      }
    } catch (error) {
      console.log("Share error:", error);
    }
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL("https://sites.google.com/view/calendar-app-ios/home");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <View style={[styles.closeBtnCircle, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="chevron-back" size={26} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t("settings")}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={[styles.content, { backgroundColor: colors.cardBackground }]}
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 20 }}
      >
        <View style={[{ backgroundColor: colors.cardBackground }]}>

          {/* Profile Card */}
          <View style={[styles.profileCard, { backgroundColor: colors.background }]}>
            <TouchableOpacity onPress={handlePickImage} style={styles.profileImageWrapper}>
              {profile.photoUri && !profileImageError ? (
                <Image
                  source={{ uri: profile.photoUri }}
                  style={[styles.profileImage, { borderColor: colors.border || '#D1D5DB' }]}
                  onError={() => setProfileImageError(true)}
                />
              ) : (
                <View
                  style={[
                    styles.profileImagePlaceholder,
                    {
                      backgroundColor: colors.cardBackground || '#F1F2F4',
                      borderColor: colors.border || '#D1D5DB',
                    },
                  ]}
                >
                  <Feather name="user" size={28} color={colors.textTertiary || '#9CA3AF'} />
                </View>
              )}
              <View style={styles.editBadge}>
                <Feather name="camera" size={12} color="#fff" />
              </View>
            </TouchableOpacity>

            {isEditingName ? (
              <TextInput
                style={[styles.nameInput, { color: colors.textPrimary }]}
                value={tempName}
                onChangeText={setTempName}
                onBlur={handleSaveName}
                onSubmitEditing={handleSaveName}
                autoFocus
                placeholder="Your name"
                placeholderTextColor={colors.textTertiary}
              />
            ) : (
              <TouchableOpacity style={styles.nameRow} onPress={() => setIsEditingName(true)}>
                <Text style={[styles.profileName, { color: colors.textPrimary }]}>
                  {profile.name || t('NoName')}
                </Text>
                <Feather name="edit-2" size={14} color={colors.textTertiary} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            )}
          </View>

          {/* Moods Card */}
          <View style={[styles.moodsCard, { backgroundColor: colors.background }]}>
            <View style={styles.moodsHeaderRow}>
              <Text style={[styles.moodsTitle, { color: colors.textPrimary }]}>{t('Moods')}</Text>
              <TouchableOpacity
                style={styles.viewAllRow}
                onPress={() => router.push('/mood-calendar')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.viewAllText, { color: colors.textTertiary }]}>
                  {t('ViewAll') || 'View All'}
                </Text>
                <Feather name="chevron-right" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
            <View style={styles.weekRow}>
              {weekMoods.map((day) => (
                <View key={day.dateStr} style={styles.dayColumn}>
                  <Text style={[styles.dayLabel, { color: colors.textTertiary }]}>{day.dayLabel}</Text>
                  <View
                    style={[
                      styles.dayCircle,
                      { borderColor: colors.border },
                      day.isToday && { borderColor: colors.primary, borderWidth: 2 },
                    ]}
                  >
                    {day.entry ? (
                      <Image
                        source={findMoodImage(day.entry.mood)}
                        style={styles.dayMoodImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={0}
                      />
                    ) : (
                      <Text style={[styles.dayNumText, { color: colors.textPrimary }]}>{day.dayNum}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Daily Quote Card */}
          <View style={[styles.quoteCard, { backgroundColor: colors.background }]}>
            <View style={styles.quoteHeaderRow}>
              <Text style={[styles.quoteTitle, { color: colors.textPrimary }]}>
                {t('DailyQuote')}
              </Text>
              <TouchableOpacity
                style={styles.viewAllRow}
                onPress={handleViewDailyQuote}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.viewAllText, { color: colors.textTertiary }]}>
                  {t('View')}
                </Text>
                <Feather name="chevron-right" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity activeOpacity={0.85} onPress={handleViewDailyQuote}>
              <ImageBackground
                source={dailyQuote.imageUrl ? { uri: dailyQuote.imageUrl } : undefined}
                style={styles.quotePreview}
                imageStyle={styles.quotePreviewImage}
                resizeMode="cover"
              >
                <View style={styles.quotePreviewOverlay} />
                {dailyQuote.text ? (
                  <Text style={styles.quotePreviewText} numberOfLines={2}>
                    {dailyQuote.text}
                  </Text>
                ) : null}
              </ImageBackground>
            </TouchableOpacity>
          </View>

          {/* Existing settings list */}
          <TouchableOpacity
            style={[styles.settingItem, { padding: 16, borderRadius: 16, marginHorizontal: 20, backgroundColor: colors.background, borderBottomColor: colors.border }]}
            onPress={handleNotifications}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.cardBackground }]}>
              <Feather name="bell" size={20} color={theme === 'dark' ? colors.white : colors.textPrimary} />
            </View>
            <Text style={[styles.settingText, { color: colors.textPrimary }]}>{t("notification")}</Text>
            <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, { padding: 16, borderRadius: 16, marginHorizontal: 20, backgroundColor: colors.background, borderBottomColor: colors.border }]}
            onPress={handleTimeFormat}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.cardBackground }]}>
              <Feather name="clock" size={20} color={theme === 'dark' ? colors.white : colors.textPrimary} />
            </View>
            <Text style={[styles.settingText, { color: colors.textPrimary }]}>{t("time_format")}</Text>
            <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, { padding: 16, borderRadius: 16, marginHorizontal: 20, backgroundColor: colors.background, borderBottomColor: colors.border }]}
            onPress={handleThemeMode}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.cardBackground }]}>
              <Feather name="moon" size={20} color={theme === 'dark' ? colors.white : colors.textPrimary} />
            </View>
            <Text style={[styles.settingText, { color: colors.textPrimary }]}>{t("theme_mode")}</Text>
            <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, { padding: 16, borderRadius: 16, marginHorizontal: 20, backgroundColor: colors.background, borderBottomColor: colors.border }]}
            activeOpacity={0.6}
            onPress={handleRate}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.cardBackground }]}>
              <Feather name="star" size={20} color={theme === 'dark' ? colors.white : colors.textPrimary} />
            </View>
            <Text style={[styles.settingText, { color: colors.textPrimary }]}>{t("rate")}</Text>
            <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, { padding: 16, borderRadius: 16, marginHorizontal: 20, backgroundColor: colors.background, borderBottomColor: colors.border }]}
            onPress={handleShare}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.cardBackground }]}>
              <Feather name="share-2" size={20} color={theme === "dark" ? colors.white : colors.textPrimary} />
            </View>
            <Text style={[styles.settingText, { color: colors.textPrimary }]}>{t("Share")}</Text>
            <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, { marginBottom: 20, padding: 16, borderRadius: 16, marginHorizontal: 20, backgroundColor: colors.background, borderBottomColor: colors.border }]}
            onPress={handlePrivacyPolicy}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.cardBackground }]}>
              <Feather name="shield" size={20} color={theme === 'dark' ? colors.white : colors.textPrimary} />
            </View>
            <Text style={[styles.settingText, { color: colors.textPrimary }]}>{t("privacy_policy")}</Text>
            <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {bannerConfig?.show && !isPremium && (
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
    position: 'absolute',
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
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 10,
    borderBottomWidth: 0.5,
  },
  closeBtnCircle: {
    width: 40, height: 40, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 24,
    fontWeight: '300',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
  },
  profileImageWrapper: { marginRight: 14 },
  profileImage: { width: 56, height: 56, borderRadius: 28, borderWidth: 2 },
  profileImagePlaceholder: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  editBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#FF5252',
    alignItems: 'center', justifyContent: 'center',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  profileName: { fontSize: 17, fontWeight: '700' },
  nameInput: { fontSize: 17, fontWeight: '700', minWidth: 150, padding: 0 },

  moodsCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
  },
  moodsHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '500',
    marginRight: 2,
  },
  moodsTitle: { fontSize: 16, fontWeight: '700' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayColumn: { alignItems: 'center' },
  dayLabel: { fontSize: 12, marginBottom: 6 },
  dayCircle: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  dayNumText: { fontSize: 13, fontWeight: '600' },
  dayMoodImage: { width: 36, height: 36 },

  quoteCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
  },
  quoteHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quoteTitle: { fontSize: 16, fontWeight: '700' },
  quotePreview: {
    height: 100,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#6FBFAE',
  },
  quotePreviewImage: {
    borderRadius: 14,
  },
  quotePreviewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  quotePreviewText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
});