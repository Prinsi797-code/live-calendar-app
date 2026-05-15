import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from "react-i18next";
import {
  Alert,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import NotificationService from '../../services/NotificationService';

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

export default function ChallengeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { theme, colors } = useTheme();
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-GB');
  const params = useLocalSearchParams(); 
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { t } = useTranslation();
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const [bannerConfig, setBannerConfig] = useState<{
    show: boolean;
    id: string;
    position: string;
  } | null>(null);

  useEffect(() => {
    if (params.refresh) {
      console.log('🔄 Refreshing challenges list');
      loadChallenges();
    }
  }, [params.refresh]);

  useFocusEffect(
    useCallback(() => {
      const parentNav = navigation.getParent();
      if (parentNav) {
        parentNav.setOptions({
          headerShown: false,
        });
      }
      loadChallenges();
      return () => {
        if (parentNav) {
          parentNav.setOptions({
            headerShown: true,
          });
        }
        setSelectionMode(false);
        setSelectedIds(new Set());
      };
    }, [navigation])
  );

  const loadChallenges = async () => {
    try {
      const challengesData = await AsyncStorage.getItem('challenges');
      if (challengesData) {
        const parsedChallenges = JSON.parse(challengesData);
        setChallenges(parsedChallenges);
      } else {
        setChallenges([]);
      }
    } catch (error) {
      console.error('Error loading challenges:', error);
    }
  };

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

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleLongPress = (id: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  };

  const handleSelectToggle = (id: string) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id);
    } else {
      newSelectedIds.add(id);
    }
    setSelectedIds(newSelectedIds);
    if (newSelectedIds.size === 0) {
      setSelectionMode(false);
    }
  };

  const handleCardPress = (challenge?: Challenge) => {
    if (selectionMode && challenge) {
      handleSelectToggle(challenge.id);
    } else if (challenge) {
      router.push({
        pathname: '/challenge/challengeDetails',
        params: { id: challenge.id }
      });
    } else {
      router.push('/challenge/new');
    }
  };

  // const handleDelete = async () => {
  //   Alert.alert(
  //     t('delete_challenge_title'),
  //     t('delete_challenge_message', { count: selectedIds.size }),
  //     [
  //       {
  //         text: t('cancel'),
  //         style: 'cancel',
  //       },
  //       {
  //         text: t('delete'),
  //         style: 'destructive',
  //         onPress: async () => {
  //           try {
  //             const updatedChallenges = challenges.filter(
  //               (c) => !selectedIds.has(c.id)
  //             );
  //             setChallenges(updatedChallenges);
  //             await AsyncStorage.setItem('challenges', JSON.stringify(updatedChallenges));
  //             setSelectionMode(false);
  //             setSelectedIds(new Set());
  //           } catch (error) {
  //             console.error('Error deleting challenges:', error);
  //           }
  //         },
  //       },
  //     ]
  //   );
  // };

  const handleDelete = async () => {
    Alert.alert(
      t('delete_challenge_title'),
      t('delete_challenge_message', { count: selectedIds.size }),
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
              const challengesData = await AsyncStorage.getItem('challenges');
              if (challengesData) {
                const challenges = JSON.parse(challengesData);

                for (const challengeId of selectedIds) {
                  await NotificationService.cancelChallengeNotification(challengeId);
                  console.log('Challenge notification cancelled for ID:', challengeId);
                }

                const updatedChallenges = challenges.filter(
                  (c: Challenge) => !selectedIds.has(c.id)
                );
                setChallenges(updatedChallenges);

                await AsyncStorage.setItem(
                  'challenges',
                  JSON.stringify(updatedChallenges)
                );

                if (Platform.OS === 'android') {
                  ToastAndroid.show(
                    t('challenges_deleted', { count: selectedIds.size }) ||
                    `${selectedIds.size} challenge(s) deleted successfully`,
                    ToastAndroid.SHORT
                  );
                }

                setSelectionMode(false);
                setSelectedIds(new Set());
              }
            } catch (error) {
              console.error('Error deleting challenges:', error);
              Alert.alert(
                t('error') || 'Error',
                t('delete_challenges_error') || 'Failed to delete challenges'
              );
            }
          },
        },
      ]
    );
  };

  const handleCancelSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {selectionMode ? (
        // Selection Mode Header
        <View style={[styles.selectionHeader, { backgroundColor: colors.background }]}>
          <TouchableOpacity onPress={handleCancelSelection} style={styles.cancelButton}>
            <Feather name="x" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={[styles.selectionTitle, { color: colors.textPrimary }]}>
            {selectedIds.size} {t("selected")}
          </Text>

          <TouchableOpacity
            onPress={handleDelete}
            style={styles.deleteButton}
            disabled={selectedIds.size === 0}
          >
            <Feather
              name="trash-2"
              size={24}
              color={selectedIds.size > 0 ? '#FF6B6B' : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      ) : (
        // Normal Header
        <Text style={[styles.header, { color: colors.textPrimary }]}>{t("challenge")}</Text>
      )}

      <ScrollView style={styles.scrollView}>
        <View style={styles.challengeList}>
          {challenges.length === 0 ? (
            <TouchableOpacity
              style={[styles.challengeCard, { backgroundColor: colors.cardBackground }]}
              activeOpacity={0.8}
              onPress={() => handleCardPress()}
            >
              <View style={styles.challengeContent}>
                <Text style={[styles.challengeTitle, { color: colors.textPrimary }]}>
                  Challenge Yourself Today.
                </Text>
                <Text style={[styles.challengeDate, { color: colors.textSecondary }]}>
                  {formattedDate} - {formattedDate}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            challenges.map((challenge) => {
              const isSelected = selectedIds.has(challenge.id);
              return (
                <TouchableOpacity
                  key={challenge.id}
                  style={[
                    styles.challengeCard,
                    { backgroundColor: colors.cardBackground },
                    isSelected && styles.selectedCard
                  ]}
                  activeOpacity={0.8}
                  onPress={() => handleCardPress(challenge)}
                  onLongPress={() => handleLongPress(challenge.id)}
                  delayLongPress={500}
                >
                  <View style={styles.challengeContent}>
                    <Text style={[styles.challengeTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                      {challenge.title}
                    </Text>
                    <Text style={[styles.challengeDate, { color: colors.textSecondary }]}>
                      {formatDate(challenge.startDate)} - {formatDate(challenge.endDate)}
                    </Text>
                  </View>

                  {selectionMode && (
                    <View
                      style={[
                        styles.checkCircle,
                        isSelected
                          ? { backgroundColor: '#FF6B6B', borderColor: '#FF6B6B' }
                          : { backgroundColor: 'transparent', borderColor: colors.textSecondary }
                      ]}
                    >
                      {isSelected && (
                        <Feather name="check" size={16} color="#fff" />
                      )}
                    </View>
                  )}

                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {!selectionMode && (
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
            onPress={() => router.push('/challenge/create')}
            activeOpacity={0.8}
          >
            <View style={styles.fabTextWrapper}>
              <Text style={styles.fabText}>+</Text>
            </View>
          </TouchableOpacity>
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
    fontSize: 20,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 10,
  },
  stickyAdContainer: {
    bottom: 0,
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  cancelButton: {
    padding: 8,
  },
  selectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  challengeList: {
    padding: 16,
  },
  closeBtnCircle: {
    width: 40, height: 40, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  challengeCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  challengeContent: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  challengeDate: {
    fontSize: 14,
  },
  radioContainer: {
    marginLeft: 12,
  },
  radioSelected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF6B6B',
  },
  radioUnselected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabTextWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: {
    fontSize: 40,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  pulseRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    top: 0,
    left: 0,
  },
});