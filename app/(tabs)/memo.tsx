import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from "react-i18next";
import {
  Alert,
  Animated,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useScreenTracking } from '../../hooks/useScreenTracking';
import NotificationService from '../../services/NotificationService';

interface memo {
  id: string;
  title: string;
  details: string;
  Date: string;
  reminder: string;
  location: string;
  url: string;
  completed: boolean;
}

export default function MemoScreen() {
  const router = useRouter();
  const { theme, colors } = useTheme();
  const navigation = useNavigation();
  const [memos, setMemos] = useState<memo[]>([]);
  const { t } = useTranslation();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMemos, setSelectedMemos] = useState<string[]>([]);
  const today = new Date();
  const params = useLocalSearchParams();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const formattedDate = today.toLocaleDateString('en-GB');
  const [is24Hour, setIs24Hour] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  useScreenTracking('memo_screen');
  const [bannerConfig, setBannerConfig] = useState<{
    show: boolean;
    id: string;
    position: string;
  } | null>(null);

  useEffect(() => {
    if (params.refresh) {
      console.log('🔄 Refreshing memo list');
      loadmemo();
    }
  }, [params.refresh]);

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
  useFocusEffect(
    useCallback(() => {
      const parentNav = navigation.getParent();
      if (parentNav) {
        parentNav.setOptions({
          headerShown: false,
        });
      }
      loadmemo();
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

  const loadmemo = async () => {
    try {
      const memoData = await AsyncStorage.getItem('memo');
      console.log('Memo List Screen focused - Loading memos...');
      console.log('Raw memo data:', memoData);

      if (memoData) {
        const parsedMemos = JSON.parse(memoData);
        console.log('Parsed memos:', parsedMemos);
        console.log('Total memos:', parsedMemos.length);
        setMemos(parsedMemos);
      } else {
        console.log('No memo data found!');
        setMemos([]);
      }
    } catch (error) {
      console.error('Error loading memo:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadmemo();
    }, [])
  );

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
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  const formatTime = (timeValue: string | number) => {
    if (!timeValue) return '';
    try {
      const time = new Date(parseInt(String(timeValue)));

      if (isNaN(time.getTime())) {
        return '';
      }
      return time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: !is24Hour
      });
    } catch (error) {
      console.error('Error formatting time:', timeValue, error);
      return '';
    }
  };

  const handleLongPress = (id: string) => {
    setSelectionMode(true);
    setSelectedMemos([id]);
  };

  const handleSelectMemo = (id: string) => {
    if (selectedMemos.includes(id)) {
      const newList = selectedMemos.filter(x => x !== id);
      setSelectedMemos(newList);
      if (newList.length === 0) setSelectionMode(false);
    } else {
      setSelectedMemos([...selectedMemos, id]);
    }
  };

  const handleCardPress = (memo?: memo) => {
    if (selectionMode && memo) {
      handleSelectMemo(memo.id);
    } else if (memo) {
      router.push({ pathname: '/memo/memoDetails', params: { id: memo.id } });
    } else {
      router.push(`/memo/new?timestamp=${Date.now()}`);
    }
  };

  const handleCancelSelection = () => {
    setSelectionMode(false);
    setSelectedMemos([]);
  };

  // const handleDeleteSelected = () => {
  //   Alert.alert(
  //     t('delete_memo_title'),
  //     t('delete_memo_message', { count: selectedMemos.length }),
  //     [
  //       { text: t('cancel'), style: 'cancel' },
  //       {
  //         text: t('delete'),
  //         style: 'destructive',
  //         onPress: async () => {
  //           const updated = memos.filter(m => !selectedMemos.includes(m.id));
  //           setMemos(updated);
  //           await AsyncStorage.setItem('memo', JSON.stringify(updated));
  //           setSelectionMode(false);
  //           setSelectedMemos([]);
  //         }
  //       }
  //     ]
  //   );
  // };
  const handleDeleteSelected = () => {
    Alert.alert(
      t('delete_memo_title'),
      t('delete_memo_message', { count: selectedMemos.length }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              for (const memoId of selectedMemos) {
                await NotificationService.cancelMemoNotification(memoId);
                console.log('Memo notification cancelled for ID:', memoId);
              }

              const updated = memos.filter(m => !selectedMemos.includes(m.id));
              setMemos(updated);
              await AsyncStorage.setItem('memo', JSON.stringify(updated));
              if (Platform.OS === 'android') {
                ToastAndroid.show(
                  t('memos_deleted', { count: selectedMemos.length }) ||
                  `${selectedMemos.length} memo(s) deleted successfully`,
                  ToastAndroid.SHORT
                );
              }
              setSelectionMode(false);
              setSelectedMemos([]);
            } catch (error) {
              console.error('Error deleting memos:', error);
              Alert.alert(
                t('error') || 'Error',
                t('delete_memo_error') || 'Failed to delete memos'
              );
            }
          }
        }
      ]
    );
  };

  console.log('Rendering MemoScreen with', memos.length, 'memos');

  return (
    <>
      {selectionMode ? (
        <View style={[styles.fullScreenContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.selectionHeader, { backgroundColor: colors.background }]}>
            <TouchableOpacity onPress={handleCancelSelection} style={styles.cancelButton}>
              <Feather name="x" size={24} color={colors.textPrimary} />
            </TouchableOpacity>

            <Text style={[styles.selectionTitle, { color: colors.textPrimary }]}>
              {selectedMemos.length} {t("selected")}
            </Text>

            <TouchableOpacity
              onPress={handleDeleteSelected}
              style={styles.deleteButton}
              disabled={selectedMemos.length === 0}
            >
              <Feather
                name="trash-2"
                size={24}
                color={selectedMemos.length > 0 ? '#FF6B6B' : colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView}>
            <View style={styles.memo}>
              <View style={styles.challengeList}>
                {memos.map(memo => (
                  <TouchableOpacity
                    key={memo.id}
                    style={[
                      styles.challengeCard,
                      { backgroundColor: colors.cardBackground },
                      selectedMemos.includes(memo.id) && styles.selectedCard
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleSelectMemo(memo.id)}
                  >
                    <View
                      style={[
                        styles.leftLine,
                        selectedMemos.includes(memo.id) && styles.selectedLeftLine,
                      ]}
                    />
                    <View style={styles.challengeContent}>
                      <Text style={[styles.challengeTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {memo.title}
                      </Text>

                      {memo.details ? (
                        <Text style={[styles.memoDetails, { color: colors.textSecondary }]} numberOfLines={1}>
                          {memo.details}
                        </Text>
                      ) : null}

                      <Text style={[styles.challengeDate, { color: colors.textSecondary }]}>
                        {formatDate(memo.Date)} {memo.reminder && formatTime(memo.reminder)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.checkCircle,
                        selectedMemos.includes(memo.id)
                          ? { backgroundColor: '#FF6B6B', borderColor: '#FF6B6B' }
                          : { backgroundColor: 'transparent', borderColor: colors.textSecondary }
                      ]}
                    >
                      {selectedMemos.includes(memo.id) && (
                        <Feather name="check" size={16} color="#fff" />
                      )}
                    </View>

                  </TouchableOpacity>
                ))}
              </View>
            </View>

          </ScrollView>
        </View>
      ) : (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          <Text style={[styles.header, { color: colors.textPrimary }]}>{t("Memo")}</Text>

          <ScrollView style={styles.scrollView}>
            <View style={styles.memo}>
              <View style={styles.challengeList}>
                {memos.length === 0 ? (
                  <TouchableOpacity
                    style={[styles.challengeCard, styles.defaultCard, { backgroundColor: colors.cardBackground }]}
                    activeOpacity={0.8}
                    onPress={() => handleCardPress()}
                  >
                    <View style={styles.leftLine} />
                    <View style={styles.challengeContent}>
                      <Text style={[styles.challengeTitle, { color: colors.textPrimary }]}>
                        Write a Moment to Remember.
                      </Text>
                      <Text style={[styles.challengeDate, { color: colors.textSecondary }]}>
                        {formattedDate}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  memos.map(memo => (
                    <TouchableOpacity
                      key={memo.id}
                      style={[
                        styles.challengeCard,
                        { backgroundColor: colors.cardBackground },
                      ]}
                      activeOpacity={0.8}
                      onPress={() => handleCardPress(memo)}
                      onLongPress={() => handleLongPress(memo.id)}
                    >
                      <View style={styles.leftLine} />
                      <View style={styles.challengeContent}>
                        <Text style={[styles.challengeTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                          {memo.title}
                        </Text>

                        {memo.details ? (
                          <Text style={[styles.memoDetails, { color: colors.textSecondary }]} numberOfLines={1}>
                            {memo.details}
                          </Text>
                        ) : null}

                        <Text style={[styles.challengeDate, { color: colors.textSecondary }]}>
                          {formatDate(memo.Date)} {memo.reminder && formatTime(memo.reminder)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>
          </ScrollView>
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
              onPress={() => router.push(`/memo/new?timestamp=${Date.now()}`)}
              activeOpacity={0.8}
            >
              <Image
                source={require("../../assets/flags/plus1.png")}
                style={{ width: 55, height: 55 }}
                resizeMode="contain"
              />
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
  memo: { paddingBottom: 100 },
  challengeList: { gap: 12 },
  challengeCard: {
    borderRadius: 12,
    padding: 16,
    paddingLeft: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  selectedCard: { opacity: 0.8 },
  defaultCard: {
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

  leftLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#5a0a0aff',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  selectedLeftLine: { backgroundColor: '#FF6B6B' },
  challengeContent: { flex: 1 },
  challengeTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  memoDetails: { fontSize: 14, marginBottom: 4 },
  challengeDate: { fontSize: 13 },
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
