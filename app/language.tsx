import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BackHandler,
  Image,
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
import OnboardingService from '../services/OnboardingService';
import PurchaseManager from '../services/purchaseManager';

const logError = (error: any, context?: string) => {
  console.error(context || 'Error:', error);
  if (!__DEV__) {
    const Sentry = require('@sentry/react-native');
    Sentry.captureException(error);
  }
};

const LANGUAGES = [
  { code: "en", name: "English(English)", flag: require("../assets/language/uk.png") },
  { code: "es", name: "Spanish(Española)", flag: require("../assets/language/spanish.png") },
  { code: "fr", name: "French(Français)", flag: require("../assets/language/french.png") },
  { code: "pt", name: "Portuguese(Português)", flag: require("../assets/language/portugal.png") },
  { code: "ru", name: "Russian(Русский)", flag: require("../assets/language/russia.png") },
  { code: "ko", name: "Korean(한국인)", flag: require("../assets/language/korean.png") },
  { code: "de", name: "German(Deutsch)", flag: require("../assets/language/german.png") },
  { code: "it", name: "Italian(Italiana)", flag: require("../assets/language/italian.png") },
  { code: "ja", name: "Japanese(日本風)", flag: require("../assets/language/japan.png") },
  { code: "id", name: "Indonesian(Indonesia)", flag: require("../assets/language/indonesia.png") },
  { code: "zh", name: "Chinese(中國人)", flag: require("../assets/language/china.png") },
  { code: "hi", name: "Hindi(हिंदी)", flag: require("../assets/language/india.png") },
];

export default function Language() {
  const router = useRouter();
  const { colors } = useTheme();
  const { i18n, t } = useTranslation();
  const searchParams = useLocalSearchParams();
  const { from } = useLocalSearchParams();
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  useScreenTracking('diary_screen');
  const [bannerConfig, setBannerConfig] = useState<{
    show: boolean;
    id: string;
  } | null>(null);

  useEffect(() => {
    const checkPremium = async () => {
      const premium = await PurchaseManager.isPremium();
      setIsPremium(premium);
    };
    checkPremium();
  }, []);

  // useEffect(() => {
  //   const loadBannerConfig = async () => {
  //     const completed = await OnboardingService.isOnboardingCompleted();
  //     const configType = !completed ? 'language' : 'setting';
  //     const config = AdsManager.getBannerConfig(configType);
  //     console.log(`Language screen banner config (${configType}):`, config);
  //     setBannerConfig(config);
  //   };
  //   loadBannerConfig();
  // }, []);

  useEffect(() => {
    const loadBannerConfig = async () => {
      const completed = await OnboardingService.isOnboardingCompleted();
      const configType = !completed ? 'language' : 'setting';
      const config = await AdsManager.getBannerConfig(configType);
      console.log(`Language screen banner config (${configType}):`, config);
      setBannerConfig(config);
    };
    loadBannerConfig();
  }, []);

  const sortedLanguages = useMemo(() => {
    const selected = LANGUAGES.find(lang => lang.code === selectedLanguage);
    const others = LANGUAGES.filter(lang => lang.code !== selectedLanguage);

    return selected ? [selected, ...others] : LANGUAGES;
  }, [selectedLanguage]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (isFirstTime) {
          handleDefaultLanguageAndNavigate();
          return true;
        }
        return false;
      };
      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => backHandler.remove();
    }, [isFirstTime])
  );

  useFocusEffect(
    useCallback(() => {
      const loadLanguage = async () => {
        try {
          const completed = await OnboardingService.isOnboardingCompleted();
          setIsFirstTime(!completed);

          if (!completed) {
            setSelectedLanguage('en');
            await i18n.changeLanguage('en');
          } else {
            const savedLang = await AsyncStorage.getItem('selectedLanguage');
            if (savedLang) {
              setSelectedLanguage(savedLang);
              await i18n.changeLanguage(savedLang);
            } else {
              const currentLang = i18n.language || 'en';
              setSelectedLanguage(currentLang);
            }
          }
        } catch (error) {
          logError(error, 'loadLanguage');
        }
      };
      loadLanguage();
    }, [])
  );

  const handleLanguageSelect = (langCode: string) => {
    setSelectedLanguage(langCode);
  };

  const handleDefaultLanguageAndNavigate = async () => {
    try {
      console.log('Back pressed on first time - Setting default English');
      await i18n.changeLanguage('en');
      await AsyncStorage.setItem('selectedLanguage', 'en');
      await OnboardingService.completeOnboarding();

      console.log('Attempting to show language back ad (first time - language_screen)...');
      const adShown = await AdsManager.showLanguageScreenInterstitialAd('back');

      if (adShown) {
        console.log('Language back ad shown, navigating after ad closes');
        setTimeout(() => router.replace('/(tabs)'), 500);
      } else {
        console.log('Language back ad not shown, navigating immediately');
        router.replace('/(tabs)');
      }
    } catch (error) {
      logError(error, 'handleDefaultLanguageAndNavigate');
      await OnboardingService.completeOnboarding();
      router.replace('/(tabs)');
    }
  };

  // Done button
  const handleDone = async () => {
    try {
      console.log('Done pressed - Selected language:', selectedLanguage);
      await i18n.changeLanguage(selectedLanguage);
      await AsyncStorage.setItem('selectedLanguage', selectedLanguage);
      console.log('Language saved to AsyncStorage');

      await new Promise(resolve => setTimeout(resolve, 200));

      if (isFirstTime) {
        await OnboardingService.completeOnboarding();
        console.log('Onboarding completed - Home screen will now load');

        console.log('Attempting to show language save ad (first time - language_screen)...');
        const adShown = await AdsManager.showLanguageScreenInterstitialAd('save');

        if (adShown) {
          console.log('Language save ad shown, navigating after ad closes');
          setTimeout(() => router.replace('/(tabs)'), 500);
        } else {
          console.log('Language save ad not shown, navigating immediately');
          await new Promise(resolve => setTimeout(resolve, 100));
          router.replace('/(tabs)');
        }
      } else {
        // Returning user (from settings) → use setting_screen config
        console.log('Attempting to show language save ad (returning user - setting_screen)...');
        const adShown = await AdsManager.showSettingScreenInterstitialAd('save');

        const navigateBack = () => {
          if (from === "year-view") {
            router.replace("/year-view");
          } else {
            router.replace("/");
          }
        };

        if (adShown) {
          console.log('Language save ad shown, navigating after ad closes');
          setTimeout(navigateBack, 500);
        } else {
          console.log('Language save ad not shown, navigating immediately');
          navigateBack();
        }
      }
    } catch (error) {
      logError(error, 'handleDone');
      if (isFirstTime) {
        await OnboardingService.completeOnboarding();
        router.replace('/(tabs)');
      } else {
        router.back();
      }
    }
  };

  const handleBackPress = async () => {
    if (!isFirstTime) {
      console.log('Back button pressed (returning user - setting_screen)');

      // Show setting screen back ad
      console.log('Attempting to show language back ad (returning user - setting_screen)...');
      const adShown = await AdsManager.showSettingScreenInterstitialAd('back');

      const navigateBack = () => {
        if (from === "year-view") {
          router.replace("/year-view");
        } else {
          router.replace("/");
        }
      };

      const isPremium = await PurchaseManager.isPremium();

      if (isPremium) {
        console.log('👑 Premium user — skipping ad');
        navigateBack();
      } else {
        if (adShown) {
          console.log('Language back ad shown, navigating after ad closes');
          setTimeout(navigateBack, 500);
        } else {
          console.log('Language back ad not shown, navigating immediately');
          navigateBack();
        }
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        {!isFirstTime && (
          // <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          //   <Feather name="arrow-left" size={24} color={colors.textPrimary} />
          // </TouchableOpacity>
          <TouchableOpacity onPress={handleBackPress} style={styles.closeBtn} activeOpacity={0.7}>
            <View style={[styles.closeBtnCircle, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="chevron-back" size={26} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        )}

        <Text style={[styles.headerTitle, { color: colors.textPrimary, marginLeft: isFirstTime ? 16 : 0 }]}>
          {t("select_language")}
        </Text>

        <TouchableOpacity onPress={handleDone} style={styles.doneButton}>
          {/* <Text style={[styles.doneText, { color: colors.primary }]}>
            {t("done")}
          </Text> */}
          <View style={[styles.closeBtnCircle, { backgroundColor: colors.cardBackground }]}>
            <Feather name="check" size={26} style={[{ color: colors.primary }]} />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {sortedLanguages.map((language) => (
          <TouchableOpacity
            key={language.code}
            style={[
              styles.languageItem,
              { backgroundColor: colors.cardBackground }
            ]}
            onPress={() => handleLanguageSelect(language.code)}
          >
            <View style={styles.languageLeft}>
              <Image source={language.flag} style={styles.flag} />
              <View style={styles.languageInfo}>
                <Text style={[styles.languageName, { color: colors.textPrimary }]}>
                  {t(language.name.split('(')[0])}
                  <Text style={styles.languageSubName}>
                    ({language.name.split('(')[1]})
                  </Text>
                </Text>
              </View>
            </View>

            {selectedLanguage === language.code ? (
              <Feather name="check-circle" size={24} color="#FF433A" />
            ) : (
              <Feather name="circle" size={24} color="#ccc" />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {bannerConfig?.show && !isPremium && (
        <View style={styles.stickyAdContainer}>
          <GAMBannerAd
            unitId={bannerConfig.id}
            sizes={[BannerAdSize.MEDIUM_RECTANGLE]}
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
    paddingTop: 60,
  },
  closeBtn: { minWidth: 50, alignItems: 'flex-start', justifyContent: 'center' },
  closeBtnCircle: {
    width: 40, height: 40, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnX: { fontSize: 25, fontWeight: '700' },
  backButton: {
    padding: 8,
  },
  languageSubName: {
    fontSize: 14,
    color: '#888',
    fontWeight: '400',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  doneButton: {
    // padding: 8,
  },
  doneText: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingTop: 16,
    marginBottom: 20
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  languageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flag: {
    width: 30,
    height: 30,
    borderRadius: 4,
    marginRight: 16,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  stickyAdContainer: {
    bottom: 20,
    width: '100%',
    alignItems: 'center',
  },
});