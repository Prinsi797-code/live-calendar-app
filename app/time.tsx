import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  AppState,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import {
  BannerAdSize,
  GAMBannerAd
} from 'react-native-google-mobile-ads';
import { useTheme } from '../contexts/ThemeContext';
import { useScreenTracking } from '../hooks/useScreenTracking';
import AdsManager from '../services/adsManager';

export default function TimeFormatSettings() {
  const router = useRouter();
  const { t } = useTranslation();
  const searchParams = useLocalSearchParams();
  const { colors } = useTheme();
  const [is24Hour, setIs24Hour] = useState(false);
  const [userLocale, setUserLocale] = useState('en-US');
  const [hasManualOverride, setHasManualOverride] = useState(false);
  useScreenTracking('time_format_screen');
  const [bannerConfig, setBannerConfig] = useState<{
    show: boolean;
    id: string;
    position: string;
  } | null>(null);

  // useEffect(() => {
  //   const config = AdsManager.getBannerConfig('setting');
  //   console.log('Time format screen banner config:', config);
  //   setBannerConfig(config);
  // }, []);

  useEffect(() => {
      const loadBannerConfig = async () => {
        const config = await AdsManager.getBannerConfig('setting');
        console.log('time screen banner config:', config);
        setBannerConfig(config);
      };
      loadBannerConfig();
    }, []);

  useEffect(() => {
    detectTimeFormat();
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        const manualSetting = await AsyncStorage.getItem('user_manual_24hour_override');
        if (manualSetting === null) {
          console.log('App became active - rechecking SYSTEM settings...');
          setTimeout(detectTimeFormat, 300);
        } else {
          console.log('Manual override active - keeping user preference');
        }
      }
    });
    return () => {
      subscription?.remove();
    };
  }, []);

  const detectTimeFormat = async () => {
    try {
      const locales = Localization.getLocales();
      const deviceLocale = locales[0]?.languageTag || 'en-US';
      setUserLocale(deviceLocale);

      console.log('Device Locale:', deviceLocale);
      const manualSetting = await AsyncStorage.getItem('user_manual_24hour_override');

      if (manualSetting !== null) {
        const prefers24 = manualSetting === 'true';
        setIs24Hour(prefers24);
        setHasManualOverride(true);
        console.log('Using MANUAL override:', prefers24 ? '24-hour' : '12-hour');
        return;
      }

      setHasManualOverride(false);
      let systemUses24Hour = false;

      if (Localization.use24hourClock !== undefined && Localization.use24hourClock !== null) {
        systemUses24Hour = Localization.use24hourClock;
        console.log('System Setting (use24hourClock):', systemUses24Hour ? '24-hour' : '12-hour');
      } else {
        const testTime = new Date(2000, 0, 1, 13, 0, 0);

        const systemFormat = testTime.toLocaleTimeString(deviceLocale, {
          hour: 'numeric',
          minute: '2-digit'
        });

        systemUses24Hour = !systemFormat.match(/AM|PM|am|pm/);
        console.log('System format test:', systemFormat, '→', systemUses24Hour ? '24-hour' : '12-hour');
      }

      setIs24Hour(systemUses24Hour);
      console.log('Final Format (SYSTEM):', systemUses24Hour ? '24-hour ✅' : '12-hour ✅');

    } catch (error) {
      console.error('Time format detection error:', error);
      setUserLocale('en-US');
      setIs24Hour(false);
      setHasManualOverride(false);
    }
  };

  const toggle24HourFormat = async () => {
    const newValue = !is24Hour;
    setIs24Hour(newValue);
    setHasManualOverride(true);

    try {
      await AsyncStorage.setItem('user_manual_24hour_override', newValue.toString());
      console.log('Manual override saved:', newValue ? '24-hour' : '12-hour');

      Alert.alert(
        t("success"),
        `${t("time_format_changed")} ${newValue ? '24-hour' : '12-hour'}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to save override:', error);
    }
  };

  const resetToSystemDefault = async () => {
    try {
      await AsyncStorage.removeItem('user_manual_24hour_override');
      setHasManualOverride(false);
      let systemUses24Hour = false;

      if (Localization.use24hourClock !== undefined && Localization.use24hourClock !== null) {
        systemUses24Hour = Localization.use24hourClock;
      } else {
        const testTime = new Date(2000, 0, 1, 13, 0, 0);
        const systemFormat = testTime.toLocaleTimeString(userLocale, {
          hour: 'numeric',
          minute: '2-digit'
        });
        systemUses24Hour = !systemFormat.match(/AM|PM|am|pm/);
      }

      setIs24Hour(systemUses24Hour);
      console.log('Reset to system default:', systemUses24Hour ? '24-hour' : '12-hour');

      Alert.alert(
        t("reset_successful"),
        `${t("time_format_reset")} ${systemUses24Hour ? '24-hour' : '12-hour'}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to reset:', error);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(userLocale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: !is24Hour
    });
  };

  // const handleBackPress = async () => {
  //     await AdsManager.showBackButtonAd('theme-mode');
  //     if (searchParams?.from === "/theme-mode") {
  //       router.replace("/settings");
  //     } else {
  //       router.replace("/settings");
  //     }
  //   };

  const handleBackPress = async () => {
    console.log('Attempting to show time format back ad...');
    const adShown = await AdsManager.showSettingScreenInterstitialAd('back');

    if (adShown) {
      console.log('Time format back ad shown, navigating after ad closes');
      setTimeout(() => {
        router.replace("/settings");
      }, 500);
    } else {
      console.log('Time format back ad not shown, navigating immediately');
      router.replace("/settings");
    }
  };

  const currentTime = formatTime(new Date());

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <View style={[styles.closeBtnCircle, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="chevron-back" size={26} color={colors.textSecondary} />
          </View>
          {/* <Feather name="arrow-left" size={24} color={colors.textPrimary} /> */}
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {t("time_format")}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Current Time Display */}
        <View style={[styles.previewCard, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
            {t("current_time")}
          </Text>
          <Text style={[styles.previewTime, { color: colors.textPrimary }]}>
            {currentTime}
          </Text>
        </View>

        {/* 24-Hour Format Toggle */}
        <View style={[styles.settingCard, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.settingHeader}>
            <View style={styles.settingTitleRow}>
              <Feather name="clock" size={20} color={colors.textSecondary} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                  {t("use_24_hour_format")}
                </Text>
                <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                  {is24Hour ? '13:00, 14:00, 15:00' : '1:00 PM, 2:00 PM, 3:00 PM'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.toggle, is24Hour && styles.toggleActive]}
              onPress={toggle24HourFormat}
            >
              <View style={[styles.toggleCircle, is24Hour && styles.toggleCircleActive]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Card */}
        <View style={[styles.statusCard, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
              {t("format_source")}
            </Text>
            <View style={styles.statusBadge}>
              <Text style={[styles.statusText, { color: colors.textPrimary }]}>
                {hasManualOverride ? '📝 ' + t("manual") : '⚙️ ' + t("system")}
              </Text>
            </View>
          </View>

          {hasManualOverride && (
            <TouchableOpacity
              style={[styles.resetButton, { backgroundColor: colors.background }]}
              onPress={resetToSystemDefault}
            >
              <Feather name="rotate-ccw" size={16} color="#FF5252" />
              <Text style={styles.resetButtonText}>{t("reset_to_system")}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info Card */}
        {/* <View style={[styles.infoCard, { backgroundColor: colors.cardBackground }]}>
          <Feather name="info" size={20} color={colors.textSecondary} style={styles.infoIcon} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {t("time_format_info")}
          </Text>
        </View> */}
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
  closeBtnCircle: {
    width: 40, height: 40, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
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
    padding: 16,
  },
  previewCard: {
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  previewTime: {
    fontSize: 32,
    fontWeight: '600',
  },
  settingCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#FF6B6B',
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
  },
  statusCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  resetButtonText: {
    color: '#FF5252',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});