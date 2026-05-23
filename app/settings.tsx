import { Feather, Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  BannerAdSize,
  GAMBannerAd
} from 'react-native-google-mobile-ads';
import { useTheme } from '../contexts/ThemeContext';
import { useScreenTracking } from '../hooks/useScreenTracking';
import AdsManager from '../services/adsManager';
import PurchaseManager from '../services/purchaseManager';

export default function Settings() {
  const router = useRouter();
  const { t } = useTranslation();
  const searchParams = useLocalSearchParams();
  const { theme, colors } = useTheme();
  useScreenTracking('setting_screen');
  const [bannerConfig, setBannerConfig] = useState<{
    show: boolean;
    id: string;
    position: string;
  } | null>(null);

  useEffect(() => {
    const config = AdsManager.getBannerConfig('setting');
    setBannerConfig(config);
  }, []);

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

    const isPremium = await PurchaseManager.isPremium();

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
          {/* <Feather name="arrow-left" size={24} color={colors.textPrimary} /> */}
          <View style={[styles.closeBtnCircle, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="chevron-back" size={26} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t("settings")}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: colors.background, borderBottomColor: colors.border }]}
          onPress={handleNotifications}
        >
          <View style={[styles.iconBox, { backgroundColor: colors.cardBackground }]}>
            <Feather
              name="bell"
              size={20}
              color={theme === 'dark' ? colors.white : colors.textPrimary}
            />
          </View>
          <Text style={[styles.settingText, { color: colors.textPrimary }]}>{t("notification")}</Text>
          <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: colors.background, borderBottomColor: colors.border }]}
          onPress={handleTimeFormat}
        >
          <View style={[styles.iconBox, { backgroundColor: colors.cardBackground }]}>
            <Feather
              name="clock"
              size={20}
              color={theme === 'dark' ? colors.white : colors.textPrimary}
            />
          </View>
          <Text style={[styles.settingText, { color: colors.textPrimary }]}>{t("time_format")}</Text>
          <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: colors.background, borderBottomColor: colors.border }]}
          onPress={handleThemeMode}
        >
          <View style={[styles.iconBox, { backgroundColor: colors.cardBackground }]}>
            <Feather
              name="moon"
              size={20}
              color={theme === 'dark' ? colors.white : colors.textPrimary}
            />
          </View>
          <Text style={[styles.settingText, { color: colors.textPrimary }]}>{t("theme_mode")}</Text>
          <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
        </TouchableOpacity>

        {/* <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: colors.background, borderBottomColor: colors.border }]}
          onPress={handleRate}
        >
          <View style={[styles.iconBox, { backgroundColor: colors.cardBackground }]}>
            <Feather
              name="star"
              size={20}
              color={theme === 'dark' ? colors.white : colors.textPrimary}
            />
          </View>
          <Text style={[styles.settingText, { color: colors.textPrimary }]}>{t("rate")}</Text>
          <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
        </TouchableOpacity> */}

        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: colors.background, borderBottomColor: colors.border }]}
          activeOpacity={0.6}
          onPress={handleRate}
        >
          <View style={[styles.iconBox, { backgroundColor: colors.cardBackground }]}>
            <Feather
              name="star"
              size={20}
              color={theme === 'dark' ? colors.white : colors.textPrimary}
            />
          </View>
          <Text style={[styles.settingText, { color: colors.textPrimary }]}>{t("rate")}</Text>
          <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
        </TouchableOpacity>


        <TouchableOpacity
          style={[
            styles.settingItem,
            { backgroundColor: colors.background, borderBottomColor: colors.border }
          ]}
          onPress={handleShare}
        >
          <View style={[styles.iconBox, { backgroundColor: colors.cardBackground }]}>
            <Feather
              name="share-2"
              size={20}
              color={theme === "dark" ? colors.white : colors.textPrimary}
            />
          </View>
          <Text style={[styles.settingText, { color: colors.textPrimary }]}>
            {t("Share")}
          </Text>
          <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.settingItem,
            { backgroundColor: colors.background, borderBottomColor: colors.border }
          ]}
          onPress={handlePrivacyPolicy}
        >
          <View style={[styles.iconBox, { backgroundColor: colors.cardBackground }]}>
            <Feather
              name="shield"
              size={20}
              color={theme === 'dark' ? colors.white : colors.textPrimary}
            />
          </View>
          <Text style={[styles.settingText, { color: colors.textPrimary }]}>
            {t("privacy_policy")}
          </Text>
          <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
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
});