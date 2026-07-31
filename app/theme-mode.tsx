import { Feather, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import {
  BannerAdSize,
  GAMBannerAd
} from 'react-native-google-mobile-ads';
import { useTheme } from '../contexts/ThemeContext';
import { useScreenTracking } from '../hooks/useScreenTracking';
import AdsManager from '../services/adsManager';

export default function ThemeMode() {
  const router = useRouter();
  const { from } = useLocalSearchParams();
  const { theme, setTheme, colors } = useTheme();
  const { t } = useTranslation();
  const systemColorScheme = useColorScheme();
  useScreenTracking('theme_mode_screen');

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    const messages = {
      light: t("light_theme_appleid"),
      dark: t("dark_theme_appleid"),
      system: t("system_theme_applied"),
    };
    Alert.alert(t("success"), messages[newTheme]);
  };

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
      console.log('theme mode screen banner config:', config);
      setBannerConfig(config);
    };
    loadBannerConfig();
  }, []);

  const handleBackPress = async () => {
    const adShown = await AdsManager.showSettingScreenInterstitialAd('back');
    if (adShown) {
      setTimeout(() => router.replace("/settings"), 500);
    } else {
      router.replace("/settings");
    }
  };

  const isSystemSelected = theme === 'system';
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <View style={[styles.closeBtnCircle, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="chevron-back" size={26} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t("theme_mode_title")}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* CONTENT */}
      <View style={styles.content}>

        {/* SYSTEM DEFAULT */}
        <TouchableOpacity
          style={[styles.themeOption, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          onPress={() => handleThemeChange('system')}
        >
          <View style={styles.themeInfo}>
            <Ionicons
              name="phone-portrait-outline"
              size={20}
              color={isSystemSelected ? colors.primary : colors.textPrimary}
            />
            <View>
              <Text style={[styles.themeText, { color: colors.textPrimary }]}>{t("system_default")}</Text>
              <Text style={[styles.themeSubText, { color: colors.textTertiary }]}>
                {systemColorScheme === 'dark' ? t("dark_theme") : t("light_theme")}
              </Text>
            </View>
          </View>
          <View style={[
            styles.circle,
            { borderColor: colors.textTertiary },
            isSystemSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
          ]}>
            {isSystemSelected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        </TouchableOpacity>

        {/* LIGHT THEME */}
        <TouchableOpacity
          style={[styles.themeOption, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          onPress={() => handleThemeChange('light')}
        >
          <View style={styles.themeInfo}>
            <Feather
              name="sun"
              size={20}
              color={theme === 'light' ? colors.primary : colors.textPrimary}
            />
            <Text style={[styles.themeText, { color: colors.textPrimary }]}>{t("light_theme")}</Text>
          </View>
          <View style={[
            styles.circle,
            { borderColor: colors.textTertiary },
            theme === 'light' && { backgroundColor: colors.primary, borderColor: colors.primary }
          ]}>
            {theme === 'light' && <Text style={styles.checkmark}>✓</Text>}
          </View>
        </TouchableOpacity>

        {/* DARK THEME */}
        <TouchableOpacity
          style={[styles.themeOption, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          onPress={() => handleThemeChange('dark')}
        >
          <View style={styles.themeInfo}>
            <Feather
              name="moon"
              size={20}
              color={theme === 'dark' ? colors.primary : colors.textPrimary}
            />
            <Text style={[styles.themeText, { color: colors.textPrimary }]}>{t("dark_theme")}</Text>
          </View>
          <View style={[
            styles.circle,
            { borderColor: colors.textTertiary },
            theme === 'dark' && { backgroundColor: colors.primary, borderColor: colors.primary }
          ]}>
            {theme === 'dark' && <Text style={styles.checkmark}>✓</Text>}
          </View>
        </TouchableOpacity>
      </View>
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
  container: { flex: 1 },
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
  closeBtnCircle: {
    width: 40, height: 40, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  backButton: { padding: 4, marginRight: 10 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  placeholder: { width: 40 },
  content: { flex: 1, padding: 16 },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  themeInfo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  themeText: { fontSize: 16, fontWeight: '500' },
  themeSubText: { fontSize: 12, marginTop: 2 },  // System ka current mode dikhata hai
  circle: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 2, justifyContent: 'center', alignItems: 'center',
  },
  checkmark: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});