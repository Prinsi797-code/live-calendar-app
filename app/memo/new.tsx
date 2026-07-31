import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Localization from 'expo-localization';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  AppState,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View
} from 'react-native';
import {
  BannerAdSize,
  GAMBannerAd
} from 'react-native-google-mobile-ads';
import { CustomToast } from '../../components/CustomToast';
import { useTheme } from '../../contexts/ThemeContext';
import { useScreenTracking } from '../../hooks/useScreenTracking';
import AdsManager from '../../services/adsManager';
import NotificationService from '../../services/NotificationService';
import PurchaseManager from '../../services/purchaseManager';

export default function NewMemoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isEditMode = !!params.id;
  const { colors } = useTheme();
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [title, setTitle] = useState('');
  const searchParams = useLocalSearchParams();
  const [details, setDetails] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [location, setLocation] = useState('');
  const [url, setUrl] = useState('');
  const { t } = useTranslation();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showIOSPicker, setShowIOSPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [memos, setMemos] = useState([]);
  const [is24Hour, setIs24Hour] = useState(false);
  useScreenTracking('new_memo_screen');
  const [isSaving, setIsSaving] = useState(false);
  const [bannerConfig, setBannerConfig] = useState<{
    show: boolean;
    id: string;
    position: string;
  } | null>(null);

  const titleInputRef = useRef<TextInput>(null);
  const DetailsInputRef = useRef<TextInput>(null);
  const locationInputRef = useRef<TextInput>(null);
  const urlInputRef = useRef<TextInput>(null);

  const hasLoadedData = useRef(false);

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.LONG);
    } else {
      setToastMessage(message);
      setToastVisible(true);
    }
  };

  // REPLACE entire useEffect with:
  useEffect(() => {
    const detectTimeFormat = async () => {
      try {
        const manualSetting = await AsyncStorage.getItem('user_manual_24hour_override');

        if (manualSetting !== null) {
          const prefers24 = manualSetting === 'true';
          setIs24Hour(prefers24);
          console.log('✅ Using MANUAL override:', prefers24 ? '24-hour' : '12-hour');
          return;
        }

        let systemUses24Hour = false;

        if (Localization.use24hourClock !== undefined && Localization.use24hourClock !== null) {
          systemUses24Hour = Localization.use24hourClock;
        } else {
          const locales = Localization.getLocales();
          const deviceLocale = locales[0]?.languageTag || 'en-US';
          const testTime = new Date(2000, 0, 1, 13, 0, 0);
          const systemFormat = testTime.toLocaleTimeString(deviceLocale, {
            hour: 'numeric',
            minute: '2-digit'
          });
          systemUses24Hour = !systemFormat.match(/AM|PM|am|pm/);
        }

        setIs24Hour(systemUses24Hour);

      } catch (error) {
        console.error('Time format detection error:', error);
        setIs24Hour(false);
      }
    };

    detectTimeFormat();
    const subscription = AppState.addEventListener('change', detectTimeFormat);
    return () => {
      subscription?.remove();
    };
  }, []);

  // Re-detect time format when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const detectTimeFormat = async () => {
        try {
          const manualSetting = await AsyncStorage.getItem('user_manual_24hour_override');

          if (manualSetting !== null) {
            setIs24Hour(manualSetting === 'true');
            return;
          }

          let systemUses24Hour = false;

          if (Localization.use24hourClock !== undefined) {
            systemUses24Hour = Localization.use24hourClock;
          } else {
            const locales = Localization.getLocales();
            const deviceLocale = locales[0]?.languageTag || 'en-US';
            const testTime = new Date(2000, 0, 1, 13, 0, 0);
            const systemFormat = testTime.toLocaleTimeString(deviceLocale, {
              hour: 'numeric',
              minute: '2-digit'
            });
            systemUses24Hour = !systemFormat.match(/AM|PM|am|pm/);
          }
          setIs24Hour(systemUses24Hour);
        } catch (error) {
          console.error('Error detecting time format:', error);
        }
      };
      detectTimeFormat();
    }, [])
  );

  // useEffect(() => {
  //   const config = AdsManager.getBannerConfig('home');
  //   setBannerConfig(config);
  // }, []);

  useEffect(() => {
    const loadBannerConfig = async () => {
      const config = await AdsManager.getBannerConfig('main');
      console.log('memo screen banner config:', config);
      setBannerConfig(config);
    };
    loadBannerConfig();
  }, []);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const requestNotificationPermission = async () => {
    try {
      await NotificationService.requestPermissions();
    } catch (error) {
      console.error('Permission error:', error);
    }
  };

  const loadMemos = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );
      const loadPromise = AsyncStorage.getItem('memo');

      const memoData = await Promise.race([loadPromise, timeoutPromise]) as string | null;

      if (memoData) {
        const parsedMemos = JSON.parse(memoData);
        setMemos(parsedMemos);
      } else {
        setMemos([]);
      }
    } catch (error) {
      console.error('Error loading memos:', error);
      setMemos([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      InteractionManager.runAfterInteractions(() => {
        loadMemos();
      });
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      Keyboard.dismiss();

      titleInputRef.current?.blur();
      DetailsInputRef.current?.blur();
      locationInputRef.current?.blur();
      urlInputRef.current?.blur();

      if (isEditMode && params.id) {
        loadMemoData(params.id as string);
      } else {
        setTitle('');
        setDetails('');
        setReminderEnabled(false);
        setSelectedDate(new Date());
        setSelectedTime(getMinAllowedTime());
        setLocation('');
        setUrl('');
      }
      const focusTimeout = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 350);
      return () => clearTimeout(focusTimeout);

    }, [isEditMode, params.id])
  );


  const loadMemoData = async (id: string) => {
    try {
      const memoData = await AsyncStorage.getItem('memo');
      if (memoData) {
        const memos = JSON.parse(memoData);
        const memo = memos.find((m: any) => m.id === id);
        if (memo) {
          setTitle(memo.title);
          setDetails(memo.details || '');
          setLocation(memo.location || '');
          setUrl(memo.url || '');

          if (memo.Date) {
            setSelectedDate(new Date(memo.Date));
          }

          if (memo.reminder) {
            setReminderEnabled(true);
            setSelectedTime(new Date(parseInt(memo.reminder)));
          } else {
            setReminderEnabled(false);
          }
        }
      }
    } catch (error) {
      console.error('Error loading memo:', error);
    }
  };

  const combineDateTime = (date: Date, time: Date): Date => {
    const combined = new Date(date);
    combined.setHours(time.getHours());
    combined.setMinutes(time.getMinutes());
    combined.setSeconds(0);
    combined.setMilliseconds(0);
    return combined;
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showToast(t("memo_title") || "Please enter a title");
      return;
    }
    if (isSaving) return;

    if (reminderEnabled) {
      const reminderDateTime = combineDateTime(selectedDate, selectedTime);
      const now = new Date();
      const timeDiff = (reminderDateTime.getTime() - now.getTime()) / 1000;

      if (timeDiff < 5) {
        showToast(t("memo_time") || "Reminder time must be at least 5 seconds in the future.");
        return;
      }
    }
    setIsSaving(true);

    try {
      await performSave();
      const isPremium = await PurchaseManager.isPremium();
      if (isPremium) {
        console.log('👑 Premium user — skipping ad');
      } else {
        console.log('Attempting to show memo save ad...');

        setTimeout(async () => {
          await AdsManager.showEventScreenInterstitialAd('CreateMemo', 'save');
        }, 100);

        // const adShown = await AdsManager.showEventScreenInterstitialAd('CreateMemo', 'save');
        // if (adShown) {
        //   console.log('Memo save ad shown');
        // } else {
        //   console.log('Ad not shown, navigating normally');
        // }
      }
      router.replace({
        pathname: '/memo',
        params: { refresh: Date.now().toString() }
      });
    } catch (error) {
      console.error('Save error:', error);
      showToast(t("memo_error") || "Failed to save memo");
      router.back();
    } finally {
      setIsSaving(false);
    }
  };

  const performSave = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Save timeout')), 3000)
      );
      const loadPromise = AsyncStorage.getItem('memo');

      const memoData = await Promise.race([loadPromise, timeoutPromise]) as string | null;
      let memos = memoData ? JSON.parse(memoData) : [];
      let memoId: string;

      if (isEditMode && params.id) {
        memoId = params.id as string;
        await NotificationService.cancelMemoNotification(memoId);

        memos = memos.map((m: any) =>
          m.id === memoId
            ? {
              ...m,
              title: title.trim(),
              details: details.trim(),
              Date: selectedDate.toISOString(),
              reminder: reminderEnabled
                ? combineDateTime(selectedDate, selectedTime).getTime()
                : 0,
              location: location.trim(),
              url: url.trim(),
            }
            : m
        );

      } else {
        memoId = Date.now().toString();

        const newMemo = {
          id: memoId,
          title: title.trim(),
          details: details.trim(),
          Date: selectedDate.toISOString(),
          reminder: reminderEnabled
            ? combineDateTime(selectedDate, selectedTime).getTime()
            : 0,
          location: location.trim(),
          url: url.trim(),
          completed: false,
        };

        memos.push(newMemo);
      }

      if (reminderEnabled) {
        const reminderDateTime = combineDateTime(selectedDate, selectedTime);

        const notificationId = await NotificationService.scheduleMemoNotification(
          memoId,
          title.trim(),
          details.trim() || `Memo Reminder: ${title.trim()}`,
          reminderDateTime
        );

        if (notificationId) {
          await AsyncStorage.setItem(`memo_${memoId}_notification`, notificationId);
          console.log('✅ Memo notification ID stored:', notificationId);
        }
      }

      const dataToSave = JSON.stringify(memos);
      const savePromise = AsyncStorage.setItem('memo', dataToSave);
      const saveTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Save timeout')), 3000)
      );

      await Promise.race([savePromise, saveTimeout]);

    } catch (error) {
      console.error('Save error:', error);
      throw error;
    }
  };

  const onDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (date) {
        setSelectedDate(date);
      }
    } else {
      if (date) {
        setSelectedDate(date);
      }
    }
  };

  const onTimeChange = (event: any, time?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (time) {
        setSelectedTime(time);
      }
    } else {
      if (time) {
        setSelectedTime(time);
      }
    }
  };

  const handleIOSPickerPress = (mode: 'date' | 'time') => {
    if (Platform.OS === 'ios') {
      setPickerMode(mode);
      setShowIOSPicker(true);
    } else {
      if (mode === 'date') {
        setShowDatePicker(true);
      } else {
        setShowTimePicker(true);
      }
    }
  };

  const getMinAllowedTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 10);
    return now;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: !is24Hour
    });
  };

  const resetForm = () => {
    setTitle('');
    setDetails('');
    setReminderEnabled(false);
    setSelectedDate(new Date());
    setSelectedTime(getMinAllowedTime());
    setLocation('');
    setUrl('');
  };

  // const handleCancel = () => {
  //   if (searchParams?.from === "memo/new") {
  //     router.replace("memo");
  //   } else {
  //     router.replace("memo");
  //   }
  // };

  const handleCancel = async () => {
    try {
      const isPremium = await PurchaseManager.isPremium();

      if (isPremium) {
        console.log('👑 Premium user — skipping cancel ad');
        router.replace("/memo");
        return;
      } else {
        router.replace("memo");

        setTimeout(async () => {
          await AdsManager.showEventScreenInterstitialAd('CreateMemo', 'back');
        }, 100);

      }
    } catch (error) {
      console.error("Cancel error:", error);
      router.replace("memo");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          {/* <View style={styles.leftContainer}> */}
          <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
            {/* <Feather name="arrow-left" size={24} color={colors.textPrimary} /> */}
            <View style={[styles.closeBtnCircle, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="chevron-back" size={26} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {isEditMode ? t("edit_memo") : t("new_memo")}
          </Text>
          {/* </View> */}
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveButton]}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveText}>
                {isEditMode ? t('save') : t('save')}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <TextInput
                style={[styles.titleInput, { color: colors.textPrimary, backgroundColor: colors.cardBackground }]}
                placeholder={t('type_title')}
                ref={titleInputRef}
                placeholderTextColor={colors.textSecondary}
                value={title}
                returnKeyType="next"
                onSubmitEditing={() => DetailsInputRef.current?.focus()}
                blurOnSubmit={false}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.inputGroup}>
              <TextInput
                style={[styles.detailsInput, { color: colors.textPrimary, backgroundColor: colors.cardBackground }]}
                placeholder={t('add_details')}
                placeholderTextColor={colors.textSecondary}
                value={details}
                ref={DetailsInputRef}
                onChangeText={setDetails}
                multiline
                numberOfLines={4}
                onSubmitEditing={() => locationInputRef.current?.focus()}
                blurOnSubmit={false}
                returnKeyType="next"
                textAlignVertical="top"
              />
            </View>

            <View style={[styles.timeContainer, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>{t('time')}</Text>
              <TouchableOpacity
                style={[styles.toggle, reminderEnabled && styles.toggleActive]}
                onPress={() => setReminderEnabled(!reminderEnabled)}
              >
                <View style={[styles.toggleCircle, reminderEnabled && styles.toggleCircleActive]} />
              </TouchableOpacity>
            </View>

            {reminderEnabled && (
              <View style={styles.dateTimeContainer}>
                <TouchableOpacity
                  style={[styles.dateTimeButton, { backgroundColor: colors.cardBackground }]}
                  onPress={() => handleIOSPickerPress('date')}
                >
                  <Feather name="calendar" size={16} color={colors.textSecondary} style={styles.dateTimeIcon} />
                  <Text style={[styles.dateTimeText, { color: colors.textPrimary }]}>
                    {formatDate(selectedDate)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dateTimeButton, { backgroundColor: colors.cardBackground }]}
                  onPress={() => handleIOSPickerPress('time')}
                >
                  <Feather name="clock" size={16} color={colors.textSecondary} style={styles.dateTimeIcon} />
                  <Text style={[styles.dateTimeText, { color: colors.textPrimary }]}>
                    {formatTime(selectedTime)}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('enter_location')}</Text>
              <View style={[styles.inputWithIcon, { backgroundColor: colors.cardBackground }]}>
                <Feather name="map-pin" size={18} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder={t('location')}
                  placeholderTextColor={colors.textSecondary}
                  value={location}
                  ref={locationInputRef}
                  onSubmitEditing={() => urlInputRef.current?.focus()}
                  blurOnSubmit={false}
                  returnKeyType="next"
                  onChangeText={setLocation}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('enter_URL')}</Text>
              <View style={[styles.inputWithIcon, { backgroundColor: colors.cardBackground }]}>
                <Feather name="link" size={18} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder={t('url')}
                  ref={urlInputRef}
                  placeholderTextColor={colors.textSecondary}
                  value={url}
                  onChangeText={setUrl}
                  keyboardType="url"
                  returnKeyType="next"
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>
        </ScrollView>
        <CustomToast
          visible={toastVisible}
          message={toastMessage}
          onHide={() => setToastVisible(false)}
        />

        {bannerConfig?.show && (
          <View style={styles.stickyAdContainer}>
            <GAMBannerAd
              unitId={bannerConfig.id}
              sizes={[BannerAdSize.BANNER]}
              requestOptions={{ requestNonPersonalizedAdsOnly: true }}
            />
          </View>
        )}

        {Platform.OS === 'ios' && (
          <Modal visible={showIOSPicker} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  {t('select_reminder_time')}
                </Text>

                <View style={styles.pickerWrapper}>
                  <DateTimePicker
                    value={pickerMode === 'date' ? selectedDate : selectedTime}
                    mode={pickerMode}
                    display="spinner"
                    minimumDate={pickerMode === 'time' ? getMinAllowedTime() : new Date()}
                    onChange={pickerMode === 'date' ? onDateChange : onTimeChange}
                    textColor={colors.textPrimary}
                    is24Hour={is24Hour}
                  />
                </View>

                <View style={styles.modalFooter}>
                  <TouchableOpacity onPress={() => setShowIOSPicker(false)} style={styles.modalButton}>
                    <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>
                      {t('cancel')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonPrimary]}
                    onPress={() => setShowIOSPicker(false)}
                  >
                    <Text style={[styles.modalButtonTextPrimary]}>
                      {t('ok')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        {Platform.OS === 'android' && showTimePicker && (
          <DateTimePicker
            value={selectedTime}
            mode="time"
            display="default"
            onChange={onTimeChange}
            is24Hour={is24Hour}
          />
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stickyAdContainer: {
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
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  closeBtnCircle: {
    width: 40, height: 40, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  backButton: {
    padding: 4,
    marginRight: 10,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FF5252',
    borderRadius: 10,
  },
  saveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  titleInput: {
    fontSize: 16,
    padding: 16,
    borderRadius: 8,
    minHeight: 50,
  },
  detailsInput: {
    fontSize: 14,
    padding: 16,
    borderRadius: 8,
    minHeight: 120,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    minHeight: 50,
    gap: 12,
  },
  input: {
    fontSize: 14,
    flex: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
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
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  dateTimeIcon: {
    marginRight: 4,
  },
  dateTimeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  footerButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonPrimary: {
    backgroundColor: '#FF5252',
  },
  pickerWrapper: {
    width: '100%',
    overflow: 'hidden',
    alignItems: 'center',
  },
  datePicker: {
    width: '100%',
    height: 180,
  },
});