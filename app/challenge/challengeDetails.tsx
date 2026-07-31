import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from "react-i18next";
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View
} from 'react-native';
import {
  BannerAdSize,
  GAMBannerAd
} from 'react-native-google-mobile-ads';
import { useTheme } from '../../contexts/ThemeContext';
import { useScreenTracking } from '../../hooks/useScreenTracking';
import AdsManager from '../../services/adsManager';
import NotificationService from '../../services/NotificationService';
import PurchaseManager from '../../services/purchaseManager';

interface Challenge {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  icon: string;
  repeat: string;
  reminder: string;
  completed: boolean;
}

export default function ChallengeDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors, theme } = useTheme();
  const searchParams = useLocalSearchParams();
  const { t } = useTranslation();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [is24Hour, setIs24Hour] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  useScreenTracking('challenge_details_screen');
  const [bannerConfig, setBannerConfig] = useState<{
    show: boolean;
    id: string;
    position: string;
  } | null>(null);

  // useEffect(() => {
  //   const config = AdsManager.getBannerConfig('event');
  //   setBannerConfig(config);
  // }, []);
  useEffect(() => {
    const loadBannerConfig = async () => {
      const config = await AdsManager.getBannerConfig('event');
      console.log('challenge screen banner config:', config);
      setBannerConfig(config);
    };
    loadBannerConfig();
  }, []);

  useEffect(() => {
    const checkPremium = async () => {
      const premium = await PurchaseManager.isPremium();
      setIsPremium(premium);
    };
    checkPremium();
  }, []);

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

  const loadChallenge = async () => {
    try {
      console.log('Loading challenge with params:', params);

      const challengeId = params.challengeId || params.id;

      console.log('Challenge ID to find:', challengeId);

      const challengesData = await AsyncStorage.getItem('challenges');
      if (challengesData) {
        const challenges = JSON.parse(challengesData);
        console.log('Total challenges:', challenges.length);

        const foundChallenge = challenges.find((c: Challenge) => c.id === challengeId);

        if (foundChallenge) {
          console.log('Challenge found:', foundChallenge.title);
          setChallenge(foundChallenge);
        } else {
          console.log('Challenge not found with ID:', challengeId);
        }
      }
    } catch (error) {
      console.error('Error loading challenge:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadChallenge();
    }, [params.challengeId, params.id])
  );

  useFocusEffect(
    useCallback(() => {
      loadChallenge();
    }, [params.id])
  );

  const handleDelete = () => {
    Alert.alert(
      t('delete_challenge_title'),
      t('delete_challenge_message'),
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const challengeId = params.id;

              await NotificationService.cancelChallengeNotification(challengeId);
              console.log('Challenge notification cancelled for ID:', challengeId);

              const challengesData = await AsyncStorage.getItem('challenges');
              if (challengesData) {
                const challenges = JSON.parse(challengesData);
                const updatedChallenges = challenges.filter(
                  (c: Challenge) => c.id !== challengeId
                );
                await AsyncStorage.setItem(
                  'challenges',
                  JSON.stringify(updatedChallenges)
                );

                if (Platform.OS === 'android') {
                  ToastAndroid.show(
                    t('challenge_deleted') || 'Challenge deleted successfully',
                    ToastAndroid.SHORT
                  );
                }

                if (searchParams?.from === '/challengeDetails') {
                  router.replace('/challenge');
                } else {
                  router.replace('/challenge');
                }
              }
            } catch (error) {
              console.error('Error deleting challenge:', error);
              Alert.alert(
                t('error') || 'Error',
                t('delete_challenge_error') || 'Failed to delete challenge'
              );
            }
          },
        },
      ]
    );
  };

  const handleBackPress = async () => {
    try {
      const isPremium = await PurchaseManager.isPremium();

      if (isPremium) {
        console.log('👑 Premium user — skipping cancel ad');
        router.replace("/challenge");
        return;
      }

      setTimeout(async () => {
        await AdsManager.showDetailScreenInterstitialAd('chalengedetailback');
      }, 100);

      // const adShown = await AdsManager.showDetailScreenInterstitialAd('chalengedetailback');
      // if (adShown) {
      //   console.log('Challenge detail back ad shown, navigating after ad closes');
      // }
      if (searchParams?.from === "/challengeDetails") {
        router.replace("/challenge");
      } else {
        router.replace("/challenge");
      }
    } catch (error) {
      console.error("Error on back:", error);
      router.replace("/challenge");
    }
  };

  const formatTime = (timeValue: string) => {
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  if (!challenge) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress}>
          <View style={[styles.closeBtnCircle, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="chevron-back" size={28} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t("challenge_details")}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.push({
              pathname: '/challenge/new',
              params: { id: challenge.id }
            })}
            style={styles.headerButton}
          >
            <Feather name="edit" size={22} style={{ color: colors.textPrimary }} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.headerButton}
          >
            <Feather name="trash-2" size={22} style={{ color: colors.textPrimary }} />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView style={styles.content}>
        <View style={[styles.challengeHeader, { backgroundColor: colors.cardBackground }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
            <Text style={styles.icon}>{challenge.icon}</Text>
          </View>
          <View style={styles.challengeInfo}>
            <Text style={[styles.challengeTitle, { color: colors.textPrimary }]}>{challenge.title}</Text>
            <Text style={styles.challengeDate}>
              {formatDate(challenge.startDate)} - {formatDate(challenge.endDate)}
            </Text>
          </View>
        </View>

        <View style={styles.detailsSection}>
          <View style={[styles.detailRow, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.detailItem}>
              <View style={styles.leftSide}>
                <Feather name="repeat" size={20} color={colors.textSecondary} />
                <Text style={[styles.detailLabel, { color: colors.textPrimary }]}>
                  {t("repeat")}
                </Text>
              </View>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                {t(challenge.repeat)}
              </Text>
            </View>
          </View>

          <View style={[styles.detailRow, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.detailItem}>
              <View style={styles.leftSide}>
                <Feather name="calendar" size={20} color={colors.textSecondary} />
                <Text style={[styles.detailLabel, { color: colors.textPrimary }]}>
                  {t("start_date")}
                </Text>
              </View>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                {formatDate(challenge.startDate)}
              </Text>
            </View>
          </View>

          <View style={[styles.detailRow, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.detailItem}>
              <View style={styles.leftSide}>
                <Feather name="calendar" size={20} color={colors.textSecondary} />
                <Text style={[styles.detailLabel, { color: colors.textPrimary }]}>
                  {t("end_date")}
                </Text>
              </View>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                {formatDate(challenge.endDate)}
              </Text>
            </View>
          </View>

          <View style={[styles.detailRow, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.detailItem}>
              <View style={styles.leftSide}>
                <Feather name="bell" size={20} color={colors.textSecondary} />
                <Text style={[styles.detailLabel, { color: colors.textPrimary }]}>
                  {t("reminder")}
                </Text>
              </View>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                {formatTime(challenge.reminder)}
              </Text>
            </View>
          </View>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stickyAdContainer: {
    bottom: 0,
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    // padding: 4,
  },
  closeBtnCircle: {
    width: 40, height: 40, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 24,
    borderRadius: 15,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    marginLeft: 15,
  },
  icon: {
    fontSize: 32,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  challengeDate: {
    fontSize: 14,
    color: '#888',
  },
  detailsSection: {
    marginTop: 24,
    borderRadius: 12,
  },
  leftSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailRow: {
    marginTop: 8,
    padding: 15,
    borderRadius: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 15,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#2a2a2a',
  },

});