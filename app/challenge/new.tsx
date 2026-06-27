import { Colors } from '@/constants/theme';
import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Localization from 'expo-localization';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from "react-i18next";
import { Animated } from 'react-native';

import {
    ActivityIndicator,
    Alert,
    AppState,
    InteractionManager,
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
    View,
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
// import { isStreakRewardActive } from '../../utils/streakManager';
import { isChallengeRewardActive, isStreakRewardActive } from '../../utils/streakManager';



const iconOptions = [
    '💪', '🗑️', '💣', '🎨', '☕', '🔧',
    '💊', '✖️', '🏋️', '✏️', '💉', '🏠',
];

// Constants for default values
const DEFAULT_TITLE = 'Challenge Yourself Today.';
const DEFAULT_ICON = '💪';

export default function NewChallengeScreen() {
    const router = useRouter();
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const params = useLocalSearchParams();
    const [showPremiumModal, setShowPremiumModal] = useState(false);
    const [challengeRewardDaysLeft, setChallengeRewardDaysLeft] = useState(0);
    const isEditMode = !!params.id;
    useScreenTracking('new_challenge_screen');

    const getInitialReminderTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 10);
        return now;
    };
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const getInitialValues = () => {
        const shouldUseDefaults = !params.title && !params.icon && !isEditMode;

        return {
            title: shouldUseDefaults ? DEFAULT_TITLE : (params.title ? String(params.title) : DEFAULT_TITLE),
            icon: shouldUseDefaults ? DEFAULT_ICON : (params.icon ? String(params.icon) : DEFAULT_ICON),
            repeat: 'never',
            startDate: new Date(),
            endDate: new Date(),
            reminderTime: getInitialReminderTime()
        };
    };

    const initialValues = getInitialValues();

    // Original values (for reset on back)
    const [originalTitle, setOriginalTitle] = useState(initialValues.title);
    const [originalIcon, setOriginalIcon] = useState(initialValues.icon);
    const [originalRepeat, setOriginalRepeat] = useState(initialValues.repeat);
    const [originalStartDate, setOriginalStartDate] = useState(initialValues.startDate);
    const [originalEndDate, setOriginalEndDate] = useState(initialValues.endDate);
    const [originalReminderTime, setOriginalReminderTime] = useState(initialValues.reminderTime);

    // Current editing values
    const [title, setTitle] = useState(initialValues.title);
    const [selectedIcon, setSelectedIcon] = useState(initialValues.icon);
    const [repeat, setRepeat] = useState(initialValues.repeat);
    const [startDate, setStartDate] = useState(initialValues.startDate);
    const [endDate, setEndDate] = useState(initialValues.endDate);
    const [reminderTime, setReminderTime] = useState(initialValues.reminderTime);

    const [showRepeatModal, setShowRepeatModal] = useState(false);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [tempDate, setTempDate] = useState(new Date());
    const [tempTime, setTempTime] = useState(new Date());
    const [isSaving, setIsSaving] = useState(false);

    // 24-hour format detection
    const [is24Hour, setIs24Hour] = useState(false);

    const { t } = useTranslation();
    const { from } = useLocalSearchParams();
    const { colors, theme } = useTheme();
    const [bannerConfig, setBannerConfig] = useState<{
        show: boolean;
        id: string;
        position: string;
    } | null>(null);

    const showToast = (message: string) => {
        if (Platform.OS === 'android') {
            ToastAndroid.show(message, ToastAndroid.LONG);
        } else {
            setToastMessage(message);
            setToastVisible(true);
        }
    };
    useEffect(() => {
        const detectTimeFormat = async () => {
            try {
                const manualSetting = await AsyncStorage.getItem('user_manual_24hour_override');

                if (manualSetting !== null) {
                    const prefers24 = manualSetting === 'true';
                    setIs24Hour(prefers24);
                    console.log('Using MANUAL override:', prefers24 ? '24-hour' : '12-hour');
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
                    console.error('Error detecting time format:', error);
                }
            };

            detectTimeFormat();

            // Reset to defaults when screen comes into focus from "Create your own"
            if (!isEditMode && from === 'challenge/create') {
                const shouldUseDefaults = !params.title && !params.icon;

                if (shouldUseDefaults) {
                    const now = new Date();
                    const defaultReminder = new Date(now.getTime() + 10 * 60000);

                    setOriginalTitle(DEFAULT_TITLE);
                    setOriginalIcon(DEFAULT_ICON);
                    setOriginalRepeat('never');
                    setOriginalStartDate(now);
                    setOriginalEndDate(now);
                    setOriginalReminderTime(defaultReminder);

                    setTitle(DEFAULT_TITLE);
                    setSelectedIcon(DEFAULT_ICON);
                    setRepeat('never');
                    setStartDate(now);
                    setEndDate(now);
                    setReminderTime(defaultReminder);
                }
            }
        }, [isEditMode, from, params.title, params.icon])
    );

    useEffect(() => {
        const config = AdsManager.getBannerConfig('home');
        setBannerConfig(config);
    }, []);

    const repeatOptions = [
        { key: "never", label: t("never") },
        { key: "everyday", label: t("everyday") },
        { key: "every_week", label: t("every_week") },
        { key: "every_month", label: t("every_month") }
    ];

    useEffect(() => {
        NotificationService.requestPermissions().catch(console.error);
    }, []);

    useEffect(() => {
        if (isEditMode && params.id) {
            InteractionManager.runAfterInteractions(() => {
                loadChallengeData(params.id as string);
            });
        } else {
            const shouldUseDefaults = !params.title && !params.icon;

            if (shouldUseDefaults) {
                const now = new Date();
                const defaultReminder = new Date(now.getTime() + 10 * 60000);

                setOriginalTitle(DEFAULT_TITLE);
                setOriginalIcon(DEFAULT_ICON);
                setOriginalRepeat('never');
                setOriginalStartDate(now);
                setOriginalEndDate(now);
                setOriginalReminderTime(defaultReminder);

                setTitle(DEFAULT_TITLE);
                setSelectedIcon(DEFAULT_ICON);
                setRepeat('never');
                setStartDate(now);
                setEndDate(now);
                setReminderTime(defaultReminder);
            } else {
                if (params.title) {
                    const titleStr = String(params.title);
                    setOriginalTitle(titleStr);
                    setTitle(titleStr);
                }
                if (params.icon) {
                    const iconStr = String(params.icon);
                    setOriginalIcon(iconStr);
                    setSelectedIcon(iconStr);
                }
            }
        }
    }, [params.id, params.title, params.icon, isEditMode]);

    const loadChallengeData = async (id: string) => {
        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Load timeout')), 3000)
            );
            const loadPromise = AsyncStorage.getItem('challenges');
            const challengesData = await Promise.race([loadPromise, timeoutPromise]) as string | null;

            if (challengesData) {
                const challenges = JSON.parse(challengesData);
                const challenge = challenges.find((c: any) => c.id === id);
                if (challenge) {
                    let reminderDate = new Date();
                    if (challenge.reminder) {
                        reminderDate = new Date(parseInt(challenge.reminder));
                    }

                    setOriginalTitle(challenge.title);
                    setOriginalIcon(challenge.icon);
                    setOriginalRepeat(challenge.repeat);
                    setOriginalStartDate(new Date(challenge.startDate));
                    setOriginalEndDate(new Date(challenge.endDate));
                    setOriginalReminderTime(reminderDate);

                    setTitle(challenge.title);
                    setSelectedIcon(challenge.icon);
                    setRepeat(challenge.repeat);
                    setStartDate(new Date(challenge.startDate));
                    setEndDate(new Date(challenge.endDate));
                    setReminderTime(reminderDate);
                }
            }
        } catch (error) {
            console.error('Error loading challenge:', error);
        }
    };

    const resetToOriginalValues = () => {
        setTitle(originalTitle);
        setSelectedIcon(originalIcon);
        setRepeat(originalRepeat);
        setStartDate(originalStartDate);
        setEndDate(originalEndDate);
        setReminderTime(originalReminderTime);
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

    const formatTimeForStorage = (date: Date) => {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const combineDateTime = (date: Date, time: Date): Date => {
        const combined = new Date(date);
        combined.setHours(time.getHours());
        combined.setMinutes(time.getMinutes());
        combined.setSeconds(0);
        combined.setMilliseconds(0);
        return combined;
    };

    const [rewardDaysLeft, setRewardDaysLeft] = useState(0);

    useEffect(() => {
        if (rewardDaysLeft > 0) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.04,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
    }, [rewardDaysLeft]);



    useEffect(() => {
        const checkReward = async () => {
            const reward = await isStreakRewardActive();
            setRewardDaysLeft(reward.daysLeft);
            const challengeReward = await isChallengeRewardActive();
            if (challengeReward.daysLeft > reward.daysLeft) {
                setRewardDaysLeft(challengeReward.daysLeft);
            }
        };
        checkReward();
    }, []);

    const hasChallengeAccess = async () => {
        const isPremium = await PurchaseManager.isPremium();
        if (isPremium) return true;

        const bgReward = await isStreakRewardActive();
        const challengeReward = await isChallengeRewardActive();

        return bgReward.active || challengeReward.active;
    };

    const handleSave = async () => {
        if (!title.trim()) {
            return showToast(t("challenge_title") || "Enter a challenge title");
        }

        if (endDate < startDate) {
            return showToast(t("end_date") || "End date cannot be before start date");
        }

        if (isSaving) return;

        const reminderDateTime = combineDateTime(startDate, reminderTime);
        const now = new Date();
        const timeDiff = (reminderDateTime.getTime() - now.getTime()) / 1000;

        if (repeat === 'never' && timeDiff < 5) {
            return showToast(
                t("invalid_reminder") ||
                "Reminder time must be at least 5 seconds in the future"
            );
        }

        try {
            setIsSaving(true);
            const hasAccess = await hasChallengeAccess();

            if (!hasAccess) {
                setShowPremiumModal(true);
                setIsSaving(false);
                return;
            }
            console.log("Premium user — saving without ads");

            await performSave(reminderDateTime);

            router.replace({
                pathname: "/challenge",
                params: { refresh: Date.now().toString() }
            });

        } catch (error) {
            console.error("Save error:", error);
            Alert.alert("Error", "Failed to save challenge");
        } finally {
            setIsSaving(false);
        }
    };

    const performSave = async (reminderDateTime: Date) => {
        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Save timeout')), 3000)
            );
            const loadPromise = AsyncStorage.getItem('challenges');

            const data = await Promise.race([loadPromise, timeoutPromise]) as string | null;
            let challenges = data ? JSON.parse(data) : [];
            let challengeId = isEditMode ? String(params.id) : Date.now().toString();

            if (isEditMode) {
                try {
                    const prevId = await AsyncStorage.getItem(`challenge_${challengeId}_notification`);
                    if (prevId) {
                        await NotificationService.cancelNotification(prevId);
                        await AsyncStorage.removeItem(`challenge_${challengeId}_notification`);
                        console.log('Old challenge notification cancelled');
                    }
                } catch (error) {
                    console.error('Error cancelling old notification:', error);
                }
            }
            const reminderMilliseconds = reminderTime.getTime();

            if (isEditMode) {
                challenges = challenges.map((c: any) =>
                    c.id === challengeId
                        ? {
                            ...c,
                            title,
                            icon: selectedIcon,
                            repeat,
                            startDate: startDate.toISOString(),
                            endDate: endDate.toISOString(),
                            reminder: reminderMilliseconds,
                        }
                        : c
                );
                console.log('Challenge updated');

                setOriginalTitle(title);
                setOriginalIcon(selectedIcon);
                setOriginalRepeat(repeat);
                setOriginalStartDate(startDate);
                setOriginalEndDate(endDate);
                setOriginalReminderTime(reminderTime);
            } else {
                challenges.push({
                    id: challengeId,
                    title,
                    icon: selectedIcon,
                    repeat,
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                    reminder: reminderMilliseconds,
                    completed: false,
                });
                console.log('New challenge created');
            }

            const dataToSave = JSON.stringify(challenges);
            const savePromise = AsyncStorage.setItem('challenges', dataToSave);
            const saveTimeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Save timeout')), 3000)
            );

            await Promise.race([savePromise, saveTimeout]);
            console.log('Challenge data saved successfully');
            console.log('Attempting to schedule notification...');
            try {
                const newNotiId = await NotificationService.scheduleChallengeNotification(
                    challengeId,
                    title,
                    `Challenge Reminder: ${title}`,
                    reminderDateTime,
                    repeat,
                    selectedIcon
                );

                if (newNotiId) {
                    await AsyncStorage.setItem(
                        `challenge_${challengeId}_notification`,
                        newNotiId
                    );
                    console.log('Notification scheduled successfully!');
                    console.log('Notification ID:', newNotiId);
                } else {
                    console.log('Notification not scheduled (may be disabled in settings)');
                    console.log('Challenge saved without notification');
                }
            } catch (notificationError) {
                console.log('Notification scheduling skipped:', notificationError);
                console.log('Challenge saved successfully without notification');
            }

        } catch (err) {
            console.error('Error saving challenge:', err);
            throw err;
        }
    };

    const handleStartDateConfirm = () => {
        setStartDate(tempDate);
        if (endDate < tempDate) {
            setEndDate(tempDate);
        }
        setShowStartDatePicker(false);
    };

    const handleEndDateConfirm = () => {
        if (tempDate < startDate) {
            Alert.alert('Invalid Date', 'End date cannot be before start date');
            return;
        }
        setEndDate(tempDate);
        setShowEndDatePicker(false);
    };

    const handleTimeConfirm = () => {
        setReminderTime(tempTime);
        setShowTimePicker(false);
    };

    const getRepeatLabel = () => {
        const found = repeatOptions.find(o => o.key === repeat);
        return found ? found.label : repeat;
    };

    // const handleBackPress = async () => {
    //     try {
    //         if (isEditMode) {
    //             resetToOriginalValues();
    //         }
    //         router.replace("/challenge/create");
    //     } catch (error) {
    //         console.error("Error on back:", error);
    //         router.replace("/challenge/create");
    //     }
    // };

    const handleBackPress = async () => {
        try {
            if (isEditMode) {
                resetToOriginalValues();
            }

            const isPremium = await PurchaseManager.isPremium();

            if (isPremium) {
                console.log('👑 Premium user — skipping cancel ad');
                router.replace("/challenge/create");
                return;
            }
            router.replace("/challenge/create");
            setTimeout(async () => {
                await AdsManager.showEventScreenInterstitialAd('CreateChalange', 'back');
            }, 100);

        } catch (error) {
            console.error("Error on back:", error);
            router.replace("/challenge/create");
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
                    <TouchableOpacity
                        onPress={handleBackPress}
                        style={styles.backButton}
                    >
                        {/* <Feather name="arrow-left" size={24} color={colors.textPrimary} /> */}
                        <View style={[styles.closeBtnCircle, { backgroundColor: colors.cardBackground }]}>
                            <Ionicons name="chevron-back" size={26} color={colors.textSecondary} />
                        </View>
                    </TouchableOpacity>

                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                        {isEditMode ? t("edit_challenge") : t("new_challenge")}
                    </Text>
                    {/* </View> */}

                    <TouchableOpacity
                        onPress={handleSave}
                        style={styles.saveButton}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="diamond" size={16} color="#fff" style={{ marginRight: 6 }} />
                                <Text style={styles.saveText}>
                                    {isEditMode ? t('save') : t('save')}
                                </Text>
                                {/* Streak reward badge */}
                                {/* {rewardDaysLeft > 0 && (
                                    <View style={{
                                        backgroundColor: '#22c55e',
                                        paddingHorizontal: 6,
                                        paddingVertical: 2,
                                        borderRadius: 5,
                                        marginLeft: 6,
                                    }}>
                                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
                                            FREE {rewardDaysLeft}d
                                        </Text>
                                    </View>
                                )} */}
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
                {/* Reward Banner - shown below header when streak reward is active */}
                {rewardDaysLeft > 0 && (
                    <Animated.View
                        style={{
                            transform: [{ scale: pulseAnim }],
                            marginHorizontal: 16,
                            marginTop: 10,
                            marginBottom: 4,
                            borderRadius: 14,
                            overflow: 'hidden',
                        }}
                    >
                        <View
                            style={{
                                background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                                backgroundColor: '#16a34a',
                                borderRadius: 14,
                                paddingVertical: 12,
                                paddingHorizontal: 16,
                                flexDirection: 'row',
                                gap: 10,
                            }}
                        >
                            <Text style={{ fontSize: 26, marginTop:5 }}>🎉</Text>
                            <View style={{ flex: 1, justifyContent: 'center', }}>
                                <Text style={{
                                    color: '#fff',
                                    fontSize: 13,
                                    fontWeight: '800',
                                    letterSpacing: 0.3,
                                    alignContent: 'center',
                                    marginTop: 5,
                                }}>
                                    {t('Congratulations')}
                                </Text>
                                <Text style={{
                                    color: '#bbf7d0',
                                    fontSize: 11,
                                    fontWeight: '500',
                                    lineHeight: 15,
                                }}>
                                </Text>
                            </View>

                            <View style={{
                                backgroundColor: '#15803d',
                                borderRadius: 8,
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                alignItems: 'center',
                            }}>
                                <Text style={{ color: '#4ade80', fontSize: 9, fontWeight: '700' }}>{t('FREE')}</Text>
                                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900', lineHeight: 16 }}>
                                    {rewardDaysLeft}d
                                </Text>
                            </View>
                        </View>
                    </Animated.View>
                )}

                <ScrollView style={styles.content}>
                    <View style={styles.titleSection}>
                        <TextInput
                            style={[styles.titleInput, { color: colors.textPrimary }]}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Challenge title"
                            placeholderTextColor="#888"
                        />
                        <View style={styles.statusIndicator} />
                    </View>

                    <View style={styles.section}>
                        <Text style={[styles.label, { color: colors.textPrimary }]}>
                            {t("choose_icon")}
                        </Text>
                        <View style={[styles.iconGrid, { backgroundColor: colors.background }]}>
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

                    <View style={styles.section}>
                        <Text style={[styles.label, { color: colors.textPrimary }]}>
                            {t("repeat")}
                        </Text>
                        <TouchableOpacity
                            style={[styles.inputContainer, { backgroundColor: colors.cardBackground }]}
                            onPress={() => setShowRepeatModal(true)}
                        >
                            <Feather name="repeat" size={20} color="#888" />
                            <Text style={[styles.inputText, { color: colors.textPrimary }]}>
                                {getRepeatLabel()}
                            </Text>
                            <Feather name="chevron-right" size={20} color="#888" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.halfSection}>
                            <Text style={[styles.label, { color: colors.textPrimary }]}>
                                {t("start_date")}
                            </Text>
                            <TouchableOpacity
                                style={[styles.inputContainer, { backgroundColor: colors.cardBackground }]}
                                onPress={() => {
                                    setTempDate(startDate);
                                    setShowStartDatePicker(true);
                                }}
                            >
                                <Feather name="calendar" size={20} color="#888" />
                                <Text style={[styles.inputText, { color: colors.textPrimary }]}>
                                    {formatDate(startDate)}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.halfSection}>
                            <Text style={[styles.label, { color: colors.textPrimary }]}>
                                {t("end_date")}
                            </Text>
                            <TouchableOpacity
                                style={[styles.inputContainer, { backgroundColor: colors.cardBackground }]}
                                onPress={() => {
                                    setTempDate(endDate);
                                    setShowEndDatePicker(true);
                                }}
                            >
                                <Feather name="calendar" size={20} color="#888" />
                                <Text style={[styles.inputText, { color: colors.textPrimary }]}>
                                    {formatDate(endDate)}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={[styles.label, { color: colors.textPrimary }]}>
                            {t("reminder")}
                        </Text>
                        <TouchableOpacity
                            style={[styles.inputContainer, { backgroundColor: colors.cardBackground }]}
                            onPress={() => {
                                setTempTime(reminderTime);
                                setShowTimePicker(true);
                            }}
                        >
                            <Feather name="bell" size={20} color="#888" />
                            <Text style={[styles.inputText, { color: colors.textPrimary }]}>
                                {formatTime(reminderTime)}
                            </Text>
                            <Feather name="chevron-right" size={20} color="#888" />
                        </TouchableOpacity>
                    </View>

                    {bannerConfig?.show && (
                        <View style={styles.stickyAdContainer}>
                            <GAMBannerAd
                                unitId={bannerConfig.id}
                                sizes={[BannerAdSize.BANNER]}
                                requestOptions={{ requestNonPersonalizedAdsOnly: true }}
                            />
                        </View>
                    )}
                </ScrollView>

                <Modal
                    visible={showRepeatModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowRepeatModal(false)}
                >
                    <TouchableOpacity
                        style={[styles.modalOverlay]}
                        activeOpacity={1}
                        onPress={() => setShowRepeatModal(false)}
                    >
                        <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
                            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                                {t("repeat")}
                            </Text>
                            {repeatOptions.map((item) => (
                                <TouchableOpacity
                                    key={item.key}
                                    style={[
                                        styles.modalOption,
                                        repeat === item.key && {
                                            backgroundColor: colors.border,
                                            borderRadius: 8,
                                            paddingHorizontal: 12,
                                        },
                                    ]}
                                    onPress={() => {
                                        setRepeat(item.key);
                                        setShowRepeatModal(false);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.modalOptionText,
                                            { color: colors.textPrimary },
                                            repeat === item.key && styles.modalOptionTextSelected,
                                        ]}
                                    >
                                        {item.label}
                                    </Text>
                                    {repeat === item.key && (
                                        <Feather name="check" size={20} color="#FF5252" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </TouchableOpacity>
                </Modal>

                <Modal
                    visible={showPremiumModal}
                    transparent
                    animationType="fade"
                >
                    <View style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        <View style={{
                            width: '85%',
                            backgroundColor: '#fff',
                            borderRadius: 16,
                            padding: 20,
                            alignItems: 'center'
                        }}>

                            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>
                                👑 Premium Required
                            </Text>

                            <Text style={{ textAlign: 'center', marginBottom: 20 }}>
                                This feature is available for Premium users only.
                            </Text>

                            <TouchableOpacity
                                style={{
                                    backgroundColor: '#FF5252',
                                    paddingVertical: 12,
                                    paddingHorizontal: 25,
                                    borderRadius: 10
                                }}
                                onPress={() => {
                                    setShowPremiumModal(false);
                                    router.push("/PremiumScreen");
                                }}
                            >
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                                    Get Premium
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{ marginTop: 10 }}
                                onPress={() => setShowPremiumModal(false)}
                            >
                                <Text style={{ color: 'gray' }}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>

                        </View>
                    </View>
                </Modal>
                {/* Start Date Picker Modal */}
                <Modal
                    visible={showStartDatePicker}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowStartDatePicker(false)}
                >
                    <TouchableOpacity
                        style={[styles.modalOverlay]}
                        activeOpacity={1}
                        onPress={() => setShowStartDatePicker(false)}
                    >
                        <View style={[styles.datePickerModal, { backgroundColor: colors.background }]}>
                            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t("select_start_date")}</Text>
                            <DateTimePicker
                                value={tempDate}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(event, selectedDate) => {
                                    if (selectedDate) {
                                        setTempDate(selectedDate);
                                    }
                                }}
                                minimumDate={new Date()}
                                textColor={colors.textPrimary}
                                style={[styles.datePicker]}
                            />
                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={styles.modalButton}
                                    onPress={() => setShowStartDatePicker(false)}
                                >
                                    <Text style={styles.modalButtonText}>{t("cancel")}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.modalButtonPrimary]}
                                    onPress={handleStartDateConfirm}
                                >
                                    <Text style={styles.modalButtonTextPrimary}>{t("ok")}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                </Modal>
                <CustomToast
                    visible={toastVisible}
                    message={toastMessage}
                    onHide={() => setToastVisible(false)}
                />
                {/* End Date Picker Modal */}
                <Modal
                    visible={showEndDatePicker}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowEndDatePicker(false)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowEndDatePicker(false)}
                    >
                        <View style={[styles.datePickerModal, { backgroundColor: colors.background }]}>
                            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t("select_end_date")}</Text>
                            <DateTimePicker
                                value={tempDate}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(event, selectedDate) => {
                                    if (selectedDate) {
                                        setTempDate(selectedDate);
                                    }
                                }}
                                minimumDate={startDate}
                                textColor={colors.textPrimary}
                                style={styles.datePicker}
                            />
                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={styles.modalButton}
                                    onPress={() => setShowEndDatePicker(false)}
                                >
                                    <Text style={styles.modalButtonText}>{t("cancel")}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.modalButtonPrimary]}
                                    onPress={handleEndDateConfirm}
                                >
                                    <Text style={styles.modalButtonTextPrimary}>{t("ok")}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Time Picker Modal */}
                <Modal
                    visible={showTimePicker}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowTimePicker(false)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowTimePicker(false)}
                    >
                        <View style={[styles.datePickerModal, { backgroundColor: colors.background }]}>
                            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t("select_reminder_time")}</Text>
                            <DateTimePicker
                                value={tempTime}
                                mode="time"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(event, selectedTime) => {
                                    if (selectedTime) {
                                        setTempTime(selectedTime);
                                    }
                                }}
                                style={styles.datePicker}
                                textColor={colors.textPrimary}
                                is24Hour={is24Hour}
                            />
                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={styles.modalButton}
                                    onPress={() => setShowTimePicker(false)}
                                >
                                    <Text style={styles.modalButtonText}>{t("cancel")}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.modalButtonPrimary]}
                                    onPress={handleTimeConfirm}
                                >
                                    <Text style={styles.modalButtonTextPrimary}>{t("ok")}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                </Modal>
            </SafeAreaView>
        </KeyboardAvoidingView>
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
        padding: 16,
    },
    stickyAdContainer: {
        width: '100%',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
    },
    saveButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#FF5252',
        borderRadius: 10,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    closeBtnCircle: {
        width: 40, height: 40, borderRadius: 50,
        alignItems: 'center', justifyContent: 'center',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    titleSection: {
        marginBottom: 24,
    },
    backButton: {
        padding: 4,
        marginRight: 10,
    },
    saveText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    titleInput: {
        fontSize: 16,
        color: '#fff',
        paddingVertical: 8,
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    statusIndicator: {
        width: 40,
        borderRadius: 2,
    },
    section: {
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        color: '#fff',
        marginBottom: 12,
        fontWeight: '500',
    },
    iconGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    iconButton: {
        width: 56,
        height: 56,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    iconButtonSelected: {
        borderColor: '#FF5252',
    },
    iconText: {
        fontSize: 28,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 16,
        gap: 12,
    },
    inputText: {
        flex: 1,
        fontSize: 16,
        color: '#fff',
    },
    row: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    halfSection: {
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
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
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    modalOptionSelected: {
        backgroundColor: Colors.dark.background,
        borderRadius: 8,
        paddingHorizontal: 12,
    },
    modalOptionText: {
        fontSize: 16,
    },
    modalOptionTextSelected: {
        color: '#FF5252',
        fontWeight: '600',
    },
    datePickerModal: {
        borderRadius: 16,
        padding: 20,
        width: '90%',
        maxWidth: 400,
    },
    datePicker: {
        width: '100%',
        height: 200,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 16,
    },
    modalButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    modalButtonPrimary: {
        backgroundColor: '#FF5252',
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
});