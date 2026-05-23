import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from "react-i18next";
import {
  Alert,
  Animated,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useScreenTracking } from '../../hooks/useScreenTracking';
import NotificationService from '../../services/NotificationService';

interface Diary {
  id: string;
  title: string;
  icon: string;
  Date: string;
  reminder: string;
  location: string;
  url: string;
  completed: boolean;
}

export default function DiaryScreen() {
  const router = useRouter();
  const { theme, colors } = useTheme();
  const today = new Date();
  const navigation = useNavigation();
  const formattedDate = today.toLocaleDateString('en-GB');
  const { t } = useTranslation();
  const [diary, setDiary] = useState<Diary[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const pulseAnim = useRef(new Animated.Value(0)).current;
  useScreenTracking('diary_screen');
  const [bannerConfig, setBannerConfig] = useState<{
    show: boolean;
    id: string;
    position: string;
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      const parentNav = navigation.getParent();
      if (parentNav) {
        parentNav.setOptions({
          headerShown: false,
        });
      }
      loadDiary();
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

  const loadDiary = async () => {
    try {
      const diaryData = await AsyncStorage.getItem('diarys');
      if (diaryData) {
        const parsedDiary = JSON.parse(diaryData);
        setDiary(parsedDiary);
      } else {
        setDiary([]);
      }
    } catch (error) {
      console.error('Error loading Diary:', error);
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
  useFocusEffect(
    useCallback(() => {
      loadDiary();
      return () => {
        setSelectionMode(false);
        setSelectedIds(new Set());
      };
    }, [])
  );

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
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

  const handleCardPress = (diaryItem?: Diary) => {
    if (selectionMode && diaryItem) {
      handleSelectToggle(diaryItem.id);
    } else if (diaryItem) {
      router.push({
        pathname: '/diary/diaryDetails',
        params: { id: diaryItem.id }
      });
    } else {
      router.push('/diary/new');
    }
  };

  // const handleDelete = async () => {
  //   Alert.alert(
  //     t('delete_diary'),
  //     t('are_sure_diary_entries', { count: selectedIds.size }),
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
  //             const updatedDiary = diary.filter(
  //               (item) => !selectedIds.has(item.id)
  //             );
  //             setDiary(updatedDiary);
  //             await AsyncStorage.setItem('diarys', JSON.stringify(updatedDiary));
  //             setSelectionMode(false);
  //             setSelectedIds(new Set());
  //           } catch (error) {
  //             console.error('Error deleting diary:', error);
  //           }
  //         },
  //       },
  //     ]
  //   );
  // };

  const handleDelete = async () => {
    Alert.alert(
      t('delete_diary'),
      t('are_sure_diary_entries', { count: selectedIds.size }),
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
              for (const diaryId of selectedIds) {
                await NotificationService.cancelDiaryNotification(diaryId);
                console.log('Diary notification cancelled for ID:', diaryId);
              }
              const updatedDiary = diary.filter(
                (item) => !selectedIds.has(item.id)
              );
              setDiary(updatedDiary);
              await AsyncStorage.setItem('diarys', JSON.stringify(updatedDiary));
              if (Platform.OS === 'android') {
                ToastAndroid.show(
                  t('diaries_deleted', { count: selectedIds.size }) ||
                  `${selectedIds.size} diary entry(s) deleted successfully`,
                  ToastAndroid.SHORT
                );
              }
              setSelectionMode(false);
              setSelectedIds(new Set());
            } catch (error) {
              console.error('Error deleting diary:', error);
              Alert.alert(
                t('error') || 'Error',
                t('delete_diary_error') || 'Failed to delete diary entries'
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
    <>
      {selectionMode ? (
        <View style={[styles.fullScreenContainer, { backgroundColor: colors.background }]}>
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

          <ScrollView style={styles.scrollView}>
            <View style={styles.challengeList}>
              {diary.map((diaryItem) => {
                const isSelected = selectedIds.has(diaryItem.id);
                return (
                  <TouchableOpacity
                    key={diaryItem.id}
                    style={[
                      styles.challengeCard,
                      { backgroundColor: colors.cardBackground },
                      isSelected && styles.selectedCard
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleSelectToggle(diaryItem.id)}
                  >
                    <View style={styles.iconContainer}>
                      <Text style={styles.emojiIcon}>{diaryItem.icon || '📖'}</Text>
                    </View>

                    <View style={styles.challengeContent}>
                      <Text style={[styles.challengeTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {diaryItem.title}
                      </Text>
                      <Text style={[styles.challengeDate, { color: colors.textSecondary }]}>
                        {formatDate(diaryItem.Date)}
                      </Text>
                      {diaryItem.location && (
                        <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
                          <Feather name="map-pin" size={12} /> {diaryItem.location}
                        </Text>
                      )}
                    </View>

                    {/* <View style={styles.radioContainer}>
                      {isSelected ? (
                        <View style={[styles.radioSelected, { borderColor: '#FF6B6B' }]}>
                          <View style={styles.radioInner} />
                        </View>
                      ) : (
                        <View style={[styles.radioUnselected, { borderColor: colors.textSecondary }]} />
                      )}
                    </View> */}
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

                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      ) : (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>

          <Text style={[styles.header, { color: colors.textPrimary }]}>{t("diary")}</Text>

          <ScrollView style={styles.scrollView}>
            <View style={styles.challengeList}>
              {diary.length === 0 ? (
                <TouchableOpacity
                  style={[styles.challengeCard, { backgroundColor: colors.cardBackground }]}
                  activeOpacity={0.8}
                  onPress={() => handleCardPress()}
                >
                  <View style={styles.iconContainer}>
                    <Text style={styles.emojiIcon}>📖</Text>
                  </View>
                  <View style={styles.challengeContent}>
                    <Text style={[styles.challengeTitle, { color: colors.textPrimary }]}>
                      Start Your Diary Today
                    </Text>
                    <Text style={[styles.challengeDate, { color: colors.textSecondary }]}>
                      {formattedDate}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                diary.map((diaryItem) => (
                  <TouchableOpacity
                    key={diaryItem.id}
                    style={[
                      styles.challengeCard,
                      { backgroundColor: colors.cardBackground },
                      diaryItem.completed && styles.completedCard
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleCardPress(diaryItem)}
                    onLongPress={() => handleLongPress(diaryItem.id)}
                    delayLongPress={500}
                  >
                    <View
                      style={[styles.leftLine]}
                    />
                    <View style={styles.iconContainer}>
                      <Text style={styles.emojiIcon}>{diaryItem.icon || '📖'}</Text>
                    </View>

                    <View style={styles.challengeContent}>
                      <Text style={[styles.challengeTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {diaryItem.title}
                      </Text>
                      {/* <Text style={[styles.challengeDate, { color: colors.textSecondary }]}>
                        {formatDate(diaryItem.Date)}
                      </Text> */}
                    </View>

                    {diaryItem.completed && (
                      <View style={styles.completedBadge}>
                        <Feather name="check" size={16} color="#4CAF50" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>

          <View style={{ position: "absolute", right: 30, bottom: 170 }}>
            {/* PULSE RING */}
            <Animated.View
              style={[
                styles.pulseRing,
                pulseStyle,
                { backgroundColor: colors.primary },
              ]}
            />
            {/* FAB */}
            <TouchableOpacity
              style={[styles.fab, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/diary/new')}
              activeOpacity={0.8}
            >
              <View style={styles.fabTextWrapper}>
                <Text style={styles.fabText}>+</Text>
              </View>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  stickyAdContainer: {
    bottom: 0,
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  fullScreenContainer: { flex: 1 },
  scrollView: { flex: 1, paddingHorizontal: 16 },
  header: { fontSize: 20, fontWeight: 'bold', marginTop: 16, marginBottom: 20, marginHorizontal: 16 },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  cancelButton: { padding: 4 },
  selectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
  },
  challengeList: { gap: 12, paddingBottom: 100 },
  challengeCard: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  leftLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#f6b15dff',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
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

  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  lockButton: {
    padding: 8,
  },
  selectedLeftLine: { backgroundColor: '#FF6B6B' },

  selectedCard: { opacity: 0.8 },
  completedCard: { opacity: 0.7 },

  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  challengeContent: { flex: 1 },
  challengeTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  challengeDate: { fontSize: 13, marginBottom: 2 },
  locationText: { fontSize: 12, marginTop: 2 },
  emojiIcon: {
    fontSize: 34,
  },
  completedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioContainer: { marginLeft: 12 },
  radioSelected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF6B6B' },
  radioUnselected: { width: 24, height: 24, borderRadius: 12, borderWidth: 2 },
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
  fabTextWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: {
    fontSize: 40,
    color: '#FFFFFF',
    fontWeight: '300',
  },
});