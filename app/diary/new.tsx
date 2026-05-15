import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Localization from 'expo-localization';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslation } from "react-i18next";
import {
    AppState, Keyboard, KeyboardAvoidingView,
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
import AdsManager from '../../services/adsManager';
import NotificationService from '../../services/NotificationService';
import PurchaseManager from '../../services/purchaseManager';

const iconOptions = [
    '🧑‍💻', '📸', '🏃‍♂️', '🧘‍♂️', '🧑‍🍳', '🛌',
    '🧑‍🎨', '🕺', '🚶‍♂️', '🧑‍🏫', '🧑‍⚕️'
];

export default function NewDiaryScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const isEditMode = !!params.id;
    const { colors } = useTheme();
    const [title, setTitle] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('💪');
    const [toastMessage, setToastMessage] = useState('');
    const [toastVisible, setToastVisible] = useState(false);
    const [reminderEnabled, setReminderEnabled] = useState(false);
    const searchParams = useLocalSearchParams();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedTime, setSelectedTime] = useState(new Date());
    const { t } = useTranslation();
    const [location, setLocation] = useState('');
    const [is24Hour, setIs24Hour] = useState(false);
    const [url, setUrl] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showIOSPicker, setShowIOSPicker] = useState(false);
    const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

    // Add refs for TextInput
    const titleInputRef = useRef<TextInput>(null);
    const locationInputRef = useRef<TextInput>(null);
    const urlInputRef = useRef<TextInput>(null);

    // Add ref to track if data has been loaded
    const hasLoadedData = useRef(false);

    useEffect(() => {
        const detectTimeFormat = async () => {
            try {
                const manualSetting = await AsyncStorage.getItem('user_manual_24hour_override');

                if (manualSetting !== null) {
                    const prefers24 = manualSetting === 'true';
                    setIs24Hour(prefers24);
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

    const showToast = (message: string) => {
        if (Platform.OS === 'android') {
            ToastAndroid.show(message, ToastAndroid.LONG);
        } else {
            setToastMessage(message);
            setToastVisible(true);
        }
    };

    const [bannerConfig, setBannerConfig] = useState<{
        show: boolean;
        id: string;
        position: string;
    } | null>(null);

    useEffect(() => {
        const config = AdsManager.getBannerConfig('home');
        setBannerConfig(config);
    }, []);

    useEffect(() => {
        requestNotificationPermission();
    }, []);

    const requestNotificationPermission = async () => {
        await NotificationService.requestPermissions();
    };

    useFocusEffect(
        useCallback(() => {
            Keyboard.dismiss();

            titleInputRef.current?.blur();
            locationInputRef.current?.blur();
            urlInputRef.current?.blur();

            if (isEditMode && params.id) {
                loadDiaryData(params.id as string);
            } else {
                setTitle('');
                setSelectedIcon('💪');
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

    const loadDiaryData = async (id: string) => {
        try {
            const diaryData = await AsyncStorage.getItem('diarys');
            if (diaryData) {
                const diarys = JSON.parse(diaryData);
                const diary = diarys.find((d: any) => d.id === id);
                if (diary) {
                    setTitle(diary.title);
                    setSelectedIcon(diary.icon || '💪');
                    setLocation(diary.location || '');
                    setUrl(diary.url || '');

                    if (diary.Date) {
                        setSelectedDate(new Date(diary.Date));
                    }

                    if (diary.reminder) {
                        setReminderEnabled(true);
                        setSelectedTime(new Date(parseInt(diary.reminder)));
                    } else {
                        setReminderEnabled(false);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading diary:', error);
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            showToast(t("enter_title") || "Please enter a title");
            return;
        }
        if (reminderEnabled) {
            const reminderDateTime = combineDateTime(selectedDate, selectedTime);
            const now = new Date();
            const timeDiff = (reminderDateTime.getTime() - now.getTime()) / 1000;
            if (timeDiff < 5) {
                showToast(t("InvalidTime") || "Reminder time must be at least 5 seconds in the future. Please select a later time.");
                return;
            }
        }

        try {
            const diaryData = await AsyncStorage.getItem('diarys');
            let diarys = diaryData ? JSON.parse(diaryData) : [];

            let diaryId = isEditMode ? params.id as string : Date.now().toString();
            let notificationId: string | null = null;

            if (isEditMode && params.id) {
                const oldNoti = await AsyncStorage.getItem(`diary_${diaryId}_notification`);
                if (oldNoti) {
                    await NotificationService.cancelNotification(oldNoti);
                    await AsyncStorage.removeItem(`diary_${diaryId}_notification`);
                }
                diarys = diarys.map((d: any) =>
                    d.id === diaryId
                        ? {
                            ...d,
                            title: title.trim(),
                            icon: selectedIcon,
                            Date: selectedDate.toISOString(),
                            reminder: reminderEnabled
                                ? combineDateTime(selectedDate, selectedTime).getTime()
                                : 0,
                            location: location.trim(),
                            url: url.trim(),
                        }
                        : d
                );
            } else {
                const newDiary = {
                    id: diaryId,
                    title: title.trim(),
                    icon: selectedIcon,
                    Date: selectedDate.toISOString(),
                    reminder: reminderEnabled
                        ? combineDateTime(selectedDate, selectedTime).getTime()
                        : 0,
                    location: location.trim(),
                    url: url.trim(),
                    completed: false,
                };
                diarys.push(newDiary);
            }

            if (reminderEnabled) {
                const reminderDT = combineDateTime(selectedDate, selectedTime);
                notificationId = await NotificationService.scheduleDiaryNotification(
                    diaryId,
                    title.trim(),
                    `Diary Reminder: ${title.trim()}`,
                    reminderDT,
                    selectedIcon
                );

                if (notificationId) {
                    await AsyncStorage.setItem(
                        `diary_${diaryId}_notification`,
                        notificationId
                    );
                }
            }

            await AsyncStorage.setItem('diarys', JSON.stringify(diarys));

            const isPremium = await PurchaseManager.isPremium();

            if (isPremium) {
                console.log('👑 Premium user — skipping ad');
            } else {
                // Free user — ad dikhao
                console.log('Attempting to show diary save ad...');
                const adShown = await AdsManager.showEventScreenInterstitialAd('CreateDiary', 'save');
                if (adShown) {
                    console.log('Diary save ad shown');
                } else {
                    console.log('Ad not shown, navigating normally');
                }
            }
            setTimeout(() => router.back(), 200);

            // setTimeout(async () => {
            //     await AdsManager.showSaveButtonAd();
            // }, 800);
        } catch (error) {
            console.error('Error saving diary:', error);
            showToast(t("failed_diary") || "Failed to save diary");
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

    const combineDateTime = (date: Date, time: Date) => {
        const c = new Date(date);
        c.setHours(time.getHours());
        c.setMinutes(time.getMinutes());
        c.setSeconds(0);
        c.setMilliseconds(0);
        return c;
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

    const getMinAllowedTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 10);
        return now;
    };

    // const handleCancel = () => {
    //     if (searchParams?.from === "diary/new") {
    //         router.replace("diary");
    //     } else {
    //         router.replace("diary");
    //     }
    // };

    const handleCancel = async () => {
        try {
            const isPremium = await PurchaseManager.isPremium();

            if (isPremium) {
                console.log('👑 Premium user — skipping ad');
                router.replace("diary");
            } else {
                console.log('🎬 Diary cancel pressed, attempting to show ad...');
                const adShown = await AdsManager.showEventScreenInterstitialAd('CreateDiary', 'back');
                if (adShown) {
                    console.log('Diary cancel ad shown, navigating after ad closes');
                }
                router.replace("diary");
            }
        } catch (error) {
            console.error("Cancel error:", error);
            router.replace("diary");
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
                        {isEditMode ? t("edit_diary") : t("new_diary")}
                    </Text>
                    {/* </View> */}

                    <TouchableOpacity onPress={handleSave} style={[styles.saveButton]}>
                        <Text style={styles.saveText}>{isEditMode ? t('update') : t('save')}</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    <View style={styles.formContainer}>
                        <View style={styles.inputGroup}>
                            <TextInput
                                ref={titleInputRef}
                                style={[styles.titleInput, { color: colors.textPrimary, backgroundColor: colors.cardBackground }]}
                                placeholder={t('type_title')}
                                placeholderTextColor={colors.textSecondary}
                                value={title}
                                onChangeText={setTitle}
                                returnKeyType="next"
                                onSubmitEditing={() => locationInputRef.current?.focus()}
                                blurOnSubmit={false}
                            />
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.label, { color: colors.textPrimary }]}>{t('choose_emoji')}</Text>
                            <View style={styles.iconGrid}>
                                {iconOptions.map((icon) => (
                                    <TouchableOpacity
                                        key={icon}
                                        style={[
                                            styles.iconButton,
                                            { backgroundColor: colors.cardBackground },
                                            selectedIcon === icon && styles.iconButtonSelected,
                                        ]}
                                        onPress={() => setSelectedIcon(icon)}
                                    >
                                        <Text style={styles.iconText}>{icon}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
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
                                    ref={locationInputRef}
                                    style={[styles.input, { color: colors.textPrimary }]}
                                    placeholder={t('location')}
                                    placeholderTextColor={colors.textSecondary}
                                    value={location}
                                    onChangeText={setLocation}
                                    returnKeyType="next"
                                    onSubmitEditing={() => urlInputRef.current?.focus()}
                                    blurOnSubmit={false}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('enter_URL')}</Text>
                            <View style={[styles.inputWithIcon, { backgroundColor: colors.cardBackground }]}>
                                <Feather name="link" size={18} color={colors.textSecondary} />
                                <TextInput
                                    ref={urlInputRef}
                                    style={[styles.input, { color: colors.textPrimary }]}
                                    placeholder={t('url')}
                                    placeholderTextColor={colors.textSecondary}
                                    value={url}
                                    onChangeText={setUrl}
                                    keyboardType="url"
                                    autoCapitalize="none"
                                    returnKeyType="done"
                                />
                            </View>
                        </View>
                    </View>
                </ScrollView>

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

                <CustomToast
                    visible={toastVisible}
                    message={toastMessage}
                    onHide={() => setToastVisible(false)}
                />

                {Platform.OS === 'android' && showDatePicker && (
                    <DateTimePicker
                        value={selectedDate}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                    />
                )}

                {Platform.OS === 'android' && showTimePicker && (
                    <DateTimePicker
                        value={selectedTime}
                        mode="time"
                        display="default"
                        onChange={onTimeChange}
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
        // position: 'absolute',
        // bottom: 60,
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
    closeBtnCircle: {
        width: 40, height: 40, borderRadius: 50,
        alignItems: 'center', justifyContent: 'center',
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
    section: {
        marginBottom: 16,
    },
    iconGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    iconButton: {
        width: 56,
        height: 56,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconButtonSelected: {
        borderWidth: 2,
        borderColor: '#FF6B6B',
    },
    iconText: {
        fontSize: 28,
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
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 20,
        width: '80%',
        maxWidth: 400,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    modalButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
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
        overflow: 'hidden',   // 🔥 MOST IMPORTANT
        alignItems: 'center',
    },

    datePicker: {
        width: '100%',
        height: 180,
    },
});