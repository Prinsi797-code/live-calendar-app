import { Colors } from '@/constants/theme';
import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from "react-i18next";
import {
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
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
import { CustomToast } from '../components/CustomToast';
import { NotificationPermissionModal } from '../components/NotificationPermissionModal';
import { EventTemplate, TEMPLATE_CATEGORIES, TemplateCategory } from '../constants/eventTemplates';
import { useTheme } from '../contexts/ThemeContext';
import { useScreenTracking } from '../hooks/useScreenTracking';
import AdsManager from '../services/adsManager';
import NotificationService from '../services/NotificationService';
import PurchaseManager from '../services/purchaseManager';
import { loadData, saveData } from '../utils/storage';
import { isStreakRewardActive, updateStreakOnEventSave } from '../utils/streakManager';

export default function AddEventScreen() {
    const router = useRouter();
    const { selectedDate } = useLocalSearchParams();
    const { colors, theme, resolvedTheme } = useTheme();
    const { t } = useTranslation();
    const params = useLocalSearchParams();
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [is24Hour, setIs24Hour] = useState(false);
    const [userLocale, setUserLocale] = useState('en-US');
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | null>(null);

    const [showRepeatModal, setShowRepeatModal] = useState(false);
    const [tempRepeatValue, setTempRepeatValue] = useState('does_not');
    const [showPermissionModal, setShowPermissionModal] = useState(false);

    const scrollViewRef = useRef<ScrollView>(null);
    const noteInputRef = useRef<TextInput>(null);
    const titleInputRef = useRef<TextInput>(null);
    const [isNoteFocused, setIsNoteFocused] = useState(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useScreenTracking('add_event_screen');

    // ✅ SIRF YE RAKHO
    const [isPremiumUser, setIsPremiumUser] = useState(false);
    const [rewardDaysLeft, setRewardDaysLeft] = useState(0);

    useEffect(() => {
        const checkAccess = async () => {
            const premium = await PurchaseManager.isPremium();
            setIsPremiumUser(premium);
            const reward = await isStreakRewardActive();
            setRewardDaysLeft(reward.daysLeft);
        };
        checkAccess();
    }, []);

    const hasBgImageAccess = isPremiumUser || rewardDaysLeft > 0;

    useEffect(() => {
        PurchaseManager.isPremium().then(setIsPremiumUser);
    }, []);

    {
        !isPremiumUser && (
            <View style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.45)',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
            }}>
                <Ionicons name="lock-closed" size={20} color="#FFD700" />
            </View>
        )
    }

    useFocusEffect(
        useCallback(() => {
            Keyboard.dismiss();

            titleInputRef.current?.blur();
            noteInputRef.current?.blur();

            const focusTimeout = setTimeout(() => {
                titleInputRef.current?.focus();
            }, 350);

            return () => clearTimeout(focusTimeout);
        }, [])
    );
    const applyTemplate = (template: EventTemplate) => {
        const isAllDay = template.reminder.includes('day') || template.reminder.includes('week');
        setFormData(prev => ({
            ...prev,
            title: template.title,
            color: template.color,
            allDay: isAllDay,
            reminders: [template.reminder],
            description: '',
        }));
        setShowTemplateModal(false);
        setSelectedCategory(null);
        setTimeout(() => titleInputRef.current?.focus(), 300);
    };
    const getMinStartTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 10);
        now.setSeconds(0);
        now.setMilliseconds(0);
        return now;
    };
    const showToast = (message: string) => {
        if (Platform.OS === 'android') {
            ToastAndroid.show(message, ToastAndroid.LONG);
        } else {
            setToastMessage(message);
            setToastVisible(true);
        }
    };
    const getInitialDate = () => {
        if (selectedDate && typeof selectedDate === 'string') {
            const parsedDate = new Date(selectedDate);
            parsedDate.setHours(12, 0, 0, 0);
            return parsedDate;
        }
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        return today;
    };

    const initialDate = getInitialDate();
    const minStartTime = getMinStartTime();

    const [startDate, setStartDate] = useState(initialDate);
    const [endDate, setEndDate] = useState(initialDate);
    const [showStartTimeModal, setShowStartTimeModal] = useState(false);
    const [activeTimeField, setActiveTimeField] = useState(null);
    const [showEndTimeModal, setShowEndTimeModal] = useState(false);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [is24HourFormat, setIs24HourFormat] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [tempTime, setTempTime] = useState(new Date());
    const [tempDate, setTempDate] = useState(new Date());

    const [bannerConfig, setBannerConfig] = useState<{
        show: boolean;
        id: string;
        position: string;
    } | null>(null);


    useFocusEffect(
        React.useCallback(() => {
            const loadBannerConfig = async () => {
                const config = await AdsManager.getBannerConfig('main');
                setBannerConfig(config);
            };
            loadBannerConfig();
        }, [])
    );

    const isTimeInPast = (selectedDate: Date, selectedTime: Date) => {
        const now = new Date();
        const selectedDateTime = new Date(selectedDate);
        selectedDateTime.setHours(selectedTime.getHours());
        selectedDateTime.setMinutes(selectedTime.getMinutes());
        selectedDateTime.setSeconds(0);
        return selectedDateTime < now;
    };

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        startDate: initialDate,
        endDate: initialDate,
        startTime: minStartTime,
        endTime: new Date(minStartTime.getTime() + 3600000),
        allDay: false,
        repeat: 'does_not',
        reminders: ['at_time'],
        color: '#0267FF',
        bgImage: null as string | null,
    });

    useEffect(() => {
        if (isNoteFocused) {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            scrollTimeoutRef.current = setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }

        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, [isNoteFocused, formData.description]);


    useEffect(() => {
        const newDate = getInitialDate();
        const newMinStartTime = getMinStartTime();

        setStartDate(newDate);
        setEndDate(newDate);
        setFormData(prev => ({
            ...prev,
            startDate: newDate,
            endDate: newDate,
            startTime: newMinStartTime,
            endTime: new Date(newMinStartTime.getTime() + 3600000),
        }));
    }, [selectedDate]);

    const [tempReminders, setTempReminders] = useState<string[]>(['at_time']);
    const availableColors = [
        '#0267FF',
        '#895129',
        '#FFDAB9',
        '#FF0004',
        '#b4962a98',
        '#75D23B',
        '#e1e41aff',
        '#27aa6dff',
        '#6734ceff',
        '#ce3479ff',
    ];

    const getReminderOptions = () => {
        if (formData.allDay) {
            return [
                { key: 'on_day_9am', label: t("on_day_9am") || "On the day at 9 AM" },
                { key: 'day_before_9am', label: t("day_before_9am") || "The day before at 9 AM" },
                { key: '2days_before_9am', label: t("2days_before_9am") || "2 days before at 9 AM" },
                { key: '1week_before_9am', label: t("1week_before_9am") || "1 Week before at 9 AM" },
                { key: '2weeks_before_9am', label: t("2weeks_before_9am") || "2 weeks before at 9 AM" },
            ];
        } else {
            return [
                { key: 'at_time', label: t('at_time') },
                { key: '5min', label: t('5min') },
                { key: '10min', label: t('10min') },
                { key: '15min', label: t('15min') },
                { key: '30min', label: t('30min') },
                { key: '1hour', label: t('1hour') },
                { key: '1day', label: t('1day') },
            ];
        }
    };

    const getRepeatOptions = () => {
        return [
            { key: 'does_not', label: t('does_not_repeat') || 'Does not repeat' },
            { key: 'everyday', label: t('everyday') || 'Every day' },
            { key: 'every_week', label: t('every_week') || 'Every week' },
            { key: 'every_month', label: t('every_month') || 'Every month' },
            { key: 'every_year', label: t('every_year') || 'Every year' },
        ];
    };

    const handleOpenRepeatModal = () => {
        setTempRepeatValue(formData.repeat);
        setShowRepeatModal(true);
    };

    const handleRepeatSelect = (option: string) => {
        setTempRepeatValue(option);
    };

    const handleRepeatCancel = () => {
        setTempRepeatValue(formData.repeat);
        setShowRepeatModal(false);
    };

    const handleRepeatOk = () => {
        setFormData({ ...formData, repeat: tempRepeatValue });
        setShowRepeatModal(false);
    };

    useEffect(() => {
        if (params.repeatValue) {
            console.log("Received repeat value from repeat screen:", params.repeatValue);
            setFormData(prev => ({
                ...prev,
                repeat: params.repeatValue as string
            }));
        }
    }, [params.repeatValue]);

    const handleAllDayToggle = (value: boolean) => {
        if (value) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const start = new Date(formData.startDate);
            start.setHours(0, 0, 0, 0);

            if (start <= today) {
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(12, 0, 0, 0);

                setStartDate(tomorrow);
                setEndDate(tomorrow);

                setFormData({
                    ...formData,
                    startDate: tomorrow,
                    endDate: tomorrow,
                    allDay: true,
                    reminders: ["on_day_9am"]
                });

                showToast(t("all_day_auto_updated") || "Start date updated to tomorrow for all-day event");
                return;
            }
        }
        const defaultReminder = value ? "on_day_9am" : "at_time";

        setFormData({
            ...formData,
            allDay: value,
            reminders: [defaultReminder]
        });
    };

    const formatDate = (date: Date) => {
        const d = new Date(date);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
    };

    const getMinAllowedTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 10);
        return now;
    };
    useEffect(() => {
        const checkFormat = async () => {
            const manual = await AsyncStorage.getItem('user_manual_24hour_override');
            setIs24Hour(manual === 'true');
            setIs24HourFormat(manual === 'true');
        };
        checkFormat();
    }, []);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: !is24Hour
        });
    };

    const handleOpenReminderModal = () => {
        setTempReminders([...formData.reminders]);
        setShowReminderModal(true);
    };

    const handleToggleReminder = (option: string) => {
        if (tempReminders.includes(option)) {
            if (tempReminders.length > 1) {
                setTempReminders(tempReminders.filter(r => r !== option));
            }
        } else {
            setTempReminders([...tempReminders, option]);
        }
    };

    const handleStartDateConfirm = () => {
        setStartDate(tempDate);
        setFormData({ ...formData, startDate: tempDate });

        if (endDate < tempDate) {
            setEndDate(tempDate);
            setFormData(prev => ({ ...prev, endDate: tempDate }));
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const newStart = new Date(tempDate);
        newStart.setHours(0, 0, 0, 0);
        if (newStart <= today && formData.allDay) {
            setFormData(prev => ({
                ...prev,
                startDate: tempDate,
                allDay: false,
                reminders: ["at_time"]
            }));
        }
        setShowStartDatePicker(false);
    };

    const handleEndDateConfirm = () => {
        if (tempDate < startDate) {
            showToast(t("invalid_end_date") || "End date cannot be before start date");
            return;
        }
        const newEndDateTime = new Date(tempDate);
        newEndDateTime.setHours(formData.endTime.getHours());
        newEndDateTime.setMinutes(formData.endTime.getMinutes());
        newEndDateTime.setSeconds(0);

        const currentStartDateTime = new Date(formData.startDate);
        currentStartDateTime.setHours(formData.startTime.getHours());
        currentStartDateTime.setMinutes(formData.startTime.getMinutes());
        currentStartDateTime.setSeconds(0);

        if (newEndDateTime <= currentStartDateTime) {
            showToast(t("end_datetime_validation") || "End date and time must be after start date and time");
            return;
        }

        setEndDate(tempDate);
        setFormData({ ...formData, endDate: tempDate });
        setShowEndDatePicker(false);
    };

    const handleReminderCancel = () => {
        setTempReminders([...formData.reminders]);
        setShowReminderModal(false);
    };

    const handleReminderOk = () => {
        setFormData({ ...formData, reminders: [...tempReminders] });
        setShowReminderModal(false);
    };

    const handleRemoveReminder = (reminder: string) => {
        if (formData.reminders.length > 1) {
            setFormData({
                ...formData,
                reminders: formData.reminders.filter(r => r !== reminder)
            });
        }
    };

    const handleColorSelect = (color: string) => {
        setFormData({ ...formData, color });
        setShowColorPicker(false);
    };


    const validateMonthlyRepeat = () => {
        if (formData.repeat.toLowerCase().includes('month') || formData.repeat === 'every_month') {
            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);

            const startUTC = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
            const endUTC = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());

            const msDiff = endUTC - startUTC;
            const daysDiff = Math.floor(msDiff / (24 * 60 * 60 * 1000));

            console.log('daysDiff', daysDiff);
            if (daysDiff >= 31) {
                showToast(t("monthly_event_validation") || "For monthly repeating events, the duration must be less than 31 days");
                return false;
            }
        }
        return true;
    };

    const validateRepeatDurations = () => {
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);

        const diffMs = end.getTime() - start.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        const diffYears = diffDays / 365;
        if (
            formData.repeat.toLowerCase().includes("week") ||
            formData.repeat === "every_week"
        ) {
            if (diffDays > 7) {
                showToast(t("weekly_event_validation") || "For weekly repeating events, the duration must be less than 7 days");
                return false;
            }
        }
        if (
            formData.repeat.toLowerCase().includes("year") ||
            formData.repeat === "every_year"
        ) {
            if (diffYears > 1) {
                showToast(t("yearly_event_validation") || "For yearly repeating events, the duration must be less than 1 year");
                return false;
            }
        }
        return true;
    };

    const saveEvent = async () => {
        if (!formData.title.trim()) {
            showToast(t("please_enter_title") || "Please enter a title");
            return;
        }
        const hasPermission = await NotificationService.checkPermissions();

        if (!hasPermission) {
            console.log('Notification permission not granted - showing custom modal');
            setShowPermissionModal(true);
            return;
        }

        if (!validateMonthlyRepeat()) {
            return;
        }
        if (!validateRepeatDurations()) {
            return;
        }

        let eventDateTime: Date;
        if (formData.allDay) {
            eventDateTime = new Date(formData.startDate);
            eventDateTime.setHours(9, 0, 0, 0);
        } else {
            eventDateTime = new Date(formData.startDate);
            const startTime = new Date(formData.startTime);
            eventDateTime.setHours(startTime.getHours());
            eventDateTime.setMinutes(startTime.getMinutes());
            eventDateTime.setSeconds(0);
            eventDateTime.setMilliseconds(0);
        }

        console.log('📅 Event DateTime:', eventDateTime.toISOString());
        console.log('🔔 Repeat Type:', formData.repeat);
        console.log('⏰ Reminder:', formData.reminders[0]);

        const now = new Date();
        const timeDiff = (eventDateTime.getTime() - now.getTime()) / 1000;

        if (formData.repeat === 'Does not repeat' || formData.repeat === 'does_not') {
            if (timeDiff < 5) {
                showToast(t("invalid_time_warning") || "Event time must be at least 5 seconds in the future for reminders");
                return;
            }
        }

        try {
            const newEvent = {
                id: Date.now().toString(),
                title: formData.title,
                description: formData.description,
                date: formData.startDate.toISOString().split('T')[0],
                startDate: formData.startDate.toISOString().split('T')[0],
                endDate: formData.endDate.toISOString().split('T')[0],
                startTime: formData.startTime.getTime(),
                endTime: formData.endTime.getTime(),
                allDay: formData.allDay,
                repeat: formData.repeat,
                reminders: formData.reminders,
                color: formData.color,
                bgImage: formData.bgImage ?? null,
            };

            console.log('=== Scheduling Event Notifications ===');
            console.log('Event ID:', newEvent.id);
            console.log('Title:', newEvent.title);

            const notificationIds: string[] = [];

            for (let i = 0; i < formData.reminders.length; i++) {
                const reminderOffset = formData.reminders[i];
                console.log(`Scheduling reminder ${i + 1}:`, reminderOffset);
                const notificationId = await NotificationService.scheduleEventNotification(
                    newEvent.id,
                    formData.title,
                    formData.description || `Event: ${formData.title}`,
                    eventDateTime,
                    formData.repeat,
                    reminderOffset
                );

                if (notificationId) {
                    notificationIds.push(notificationId);
                    console.log(`Reminder ${i + 1} scheduled:`, notificationId);
                } else {
                    console.log(`Reminder ${i + 1} not scheduled (might be in past)`);
                }
            }

            if (notificationIds.length > 0) {
                await AsyncStorage.setItem(
                    `event_${newEvent.id}_notifications`,
                    JSON.stringify(notificationIds)
                );
                console.log('All notification IDs saved');
            }

            const events = await loadData('events') || [];
            await saveData('events', [...events, newEvent]);
            console.log('Event saved successfully');
            await updateStreakOnEventSave();

            const currentDate = selectedDate ? new Date(String(selectedDate)) : new Date();

            setFormData({
                title: '',
                description: '',
                startDate: currentDate,
                endDate: currentDate,
                startTime: new Date(),
                endTime: new Date(Date.now() + 3600000),
                allDay: false,
                repeat: 'does_not',
                reminders: ['at_time'],
                color: '#0267FF',
                bgImage: null,
            });

            const isPremium = await PurchaseManager.isPremium();


            const repeatMessage =
                formData.repeat === 'Everyday' || formData.repeat === 'everyday' ? 'Daily reminders set!' :
                    formData.repeat === 'Every week' || formData.repeat === 'every_week' ? 'Weekly reminders set!' :
                        formData.repeat === 'Every month' || formData.repeat === 'every_month' ? 'Monthly reminders set!' :
                            formData.repeat === 'Every year' || formData.repeat === 'every_year' ? 'Yearly reminders set!' :
                                notificationIds.length > 0 ? `${notificationIds.length} reminder(s) set!` : '';

            showToast(`${t("event_created") || "Event created!"}${repeatMessage ? ' ' + repeatMessage : ''}`);

            if (isPremium) {
                console.log('👑 Premium user — skipping ad');
                setTimeout(() => router.back(), 300);
            } else {
                console.log('🎬 Attempting to show event save ad...');
                const adShown = await AdsManager.showEventScreenInterstitialAd('CreateEvent', 'save');

                if (adShown) {
                    console.log('✅ Event save ad shown, navigating after ad closes');
                    setTimeout(() => router.back(), 500);
                } else {
                    console.log('⏭️ Event save ad not shown, navigating immediately');
                    setTimeout(() => router.back(), 300);
                }
            }

        } catch (error) {
            console.error('Error saving event:', error);
            showToast(t("failed_create_event") || "Failed to create event");
        }
    };

    const handlePermissionModalClose = () => {
        setShowPermissionModal(false);
    };

    useEffect(() => {
        const currentDate = selectedDate ? new Date(String(selectedDate)) : new Date();
        const minStartTime = getMinStartTime();
        setFormData({
            title: '',
            description: '',
            startDate: currentDate,
            endDate: currentDate,
            startTime: minStartTime,
            endTime: new Date(minStartTime.getTime() + 3600000),
            allDay: false,
            repeat: 'does_not',
            reminders: ['at_time'],
            color: '#0267FF',
            bgImage: null,
        });
    }, [selectedDate]);

    const currentDate = selectedDate ? new Date(String(selectedDate)) : new Date();

    const resetForm = () => {
        const freshDate = getInitialDate();
        const freshMinStartTime = getMinStartTime();
        setFormData({
            title: '',
            description: '',
            color: '#0267FF',
            allDay: false,
            startDate: freshDate,
            endDate: freshDate,
            startTime: minStartTime,
            endTime: new Date(minStartTime.getTime() + 3600000),
            repeat: 'does_not',
            reminders: ['at_time'],
            bgImage: null,
        });
        setStartDate(freshDate);
        setEndDate(freshDate);
    };
    const handleCancel = async () => {
        const isPremium = await PurchaseManager.isPremium();
        if (isPremium) {
            console.log('👑 Premium user — skipping cancel ad');
            resetForm();
            router.setParams({ maintainView: 'true' });
            router.back();
            return;
        }
        console.log('🎬 Event cancelled, attempting to show ad...');
        const adShown = await AdsManager.showEventScreenInterstitialAd('CreateEvent', 'back');

        if (adShown) {
            console.log('Event cancel ad shown, navigating after ad closes');
            setTimeout(() => {
                resetForm();
                router.setParams({ maintainView: 'true' });
                router.back();
            }, 500);
        } else {
            console.log('Event cancel ad not shown, navigating immediately');
            resetForm();
            router.setParams({ maintainView: 'true' });
            router.back();
        }
    };

    const getRepeatDisplayText = (repeatValue: string) => {
        const mapping: { [key: string]: string } = {
            'does_not': 'does_not_repeat',
            'everyday': 'everyday',
            'every_week': 'every_week',
            'every_month': 'every_month',
            'every_year': 'every_year',
        };
        return t(mapping[repeatValue] || 'does_not_repeat');
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.background }]}>
                <TouchableOpacity
                    onPress={handleCancel}
                    style={styles.backButton}
                >
                    <View style={[styles.closeBtnCircle, { backgroundColor: colors.cardBackground }]}>
                        <Ionicons name="chevron-back" size={28} color={colors.textSecondary} />
                    </View>
                </TouchableOpacity>

                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                    {t("add_event")}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                        onPress={() => {
                            setSelectedCategory(null);
                            setShowTemplateModal(true);
                        }}
                        style={[styles.templateBtn, { backgroundColor: colors.cardBackground }]}
                    >
                        <Ionicons name="grid-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={saveEvent}>
                        <Text style={[styles.saveText, styles.saveButton]}>{t("save")}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <SafeAreaView style={{ flex: 1 }}>
                    <ScrollView
                        ref={scrollViewRef}
                        style={styles.formScroll}
                        contentContainerStyle={{ paddingBottom: 120 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={[styles.titleContainer, { borderBottomColor: colors.border }]}>
                            <TextInput
                                placeholder={t("add_title")}
                                ref={titleInputRef}
                                placeholderTextColor={colors.textSecondary}
                                style={[styles.titleInput, { color: colors.textPrimary }]}
                                value={formData.title}
                                onChangeText={t => setFormData({ ...formData, title: t })}
                                onFocus={() => setIsNoteFocused(false)}
                            />
                            <TouchableOpacity
                                onPress={() => setShowColorPicker(true)}
                                style={[styles.colorDot, { backgroundColor: formData.color }]}
                            />
                        </View>

                        <View style={[styles.row, { backgroundColor: colors.cardBackground, borderRadius: 10, paddingLeft: 10, paddingRight: 10 }]}>
                            <Text style={[styles.label, { color: colors.textPrimary }]}>{t("all_day")}</Text>
                            <Switch
                                value={formData.allDay}
                                onValueChange={handleAllDayToggle}
                                trackColor={{ false: colors.border, true: '#FF5252' }}
                                thumbColor={formData.allDay ? '#FFFFFF' : '#f4f3f4'}
                            />
                        </View>

                        <View style={styles.dateRow}>
                            <View style={styles.dateColumn}>
                                <Text style={[styles.dateLabel, { color: colors.textPrimary }]}>{t("start_date")}</Text>
                                <TouchableOpacity
                                    style={[styles.inputContainer, { backgroundColor: colors.cardBackground }]}
                                    onPress={() => {
                                        setTempDate(startDate);
                                        setShowStartDatePicker(true);
                                    }}
                                >
                                    <Feather name="calendar" size={20} color="#888" />
                                    <Text style={[styles.inputText, { color: colors.textPrimary }]}>{formatDate(startDate)}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.dateColumn}>
                                <Text style={[styles.dateLabel, { color: colors.textPrimary }]}>{t("end_date")}</Text>
                                <TouchableOpacity
                                    style={[styles.inputContainer, { backgroundColor: colors.cardBackground }]}
                                    onPress={() => {
                                        setTempDate(endDate);
                                        setShowEndDatePicker(true);
                                    }}
                                >
                                    <Feather name="calendar" size={20} color="#888" />
                                    <Text style={[styles.inputText, { color: colors.textPrimary }]}>{formatDate(endDate)}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {!formData.allDay && (
                            <View style={styles.dateRow}>
                                <View style={styles.dateColumn}>
                                    <Text style={[styles.dateLabel, { color: colors.textPrimary }]}>{t("start_time")}</Text>
                                    <TouchableOpacity
                                        style={[styles.dateButton, { backgroundColor: colors.cardBackground }]}
                                        onPress={() => {
                                            setActiveTimeField("start");

                                            const minTime = getMinStartTime();

                                            const currentStartDateTime = new Date(formData.startDate);
                                            currentStartDateTime.setHours(formData.startTime.getHours());
                                            currentStartDateTime.setMinutes(formData.startTime.getMinutes());
                                            currentStartDateTime.setSeconds(0);

                                            if (currentStartDateTime < minTime) {
                                                setTempTime(minTime);
                                                const newEndTime = new Date(minTime.getTime() + 3600000);
                                                setFormData({
                                                    ...formData,
                                                    startTime: minTime,
                                                    endTime: newEndTime
                                                });
                                            } else {
                                                setTempTime(formData.startTime);
                                            }

                                            setShowTimePicker(true);
                                        }}
                                    >
                                        <Feather name="clock" size={20} color={theme === 'dark' ? colors.white : colors.textPrimary} />
                                        <Text style={[styles.dateText, { color: colors.textPrimary }]}>
                                            {formatTime(formData.startTime)}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.dateColumn}>
                                    <Text style={[styles.dateLabel, { color: colors.textPrimary }]}>{t("end_time")}</Text>
                                    <TouchableOpacity
                                        style={[styles.dateButton, { backgroundColor: colors.cardBackground }]}
                                        onPress={() => {
                                            setActiveTimeField("end");
                                            setTempTime(formData.endTime);
                                            setShowTimePicker(true);
                                        }}
                                    >
                                        <Feather name="clock" size={20} color={theme === 'dark' ? colors.white : colors.textPrimary} />
                                        <Text style={[styles.dateText, { color: colors.textPrimary }]}>
                                            {formatTime(formData.endTime)}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        <View style={styles.dateColumn}>
                            <Text style={[styles.dateLabel, { color: colors.textPrimary }]}>{t("repeat")}</Text>
                            <TouchableOpacity
                                onPress={handleOpenRepeatModal}
                                style={[{
                                    borderBottomColor: colors.border,
                                    backgroundColor: colors.cardBackground,
                                    paddingLeft: 15,
                                    paddingRight: 15,
                                    paddingTop: 15,
                                    paddingBottom: 15,
                                    borderRadius: 10,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 10,
                                }]}
                            >
                                <Feather name="repeat" size={20} color={colors.textPrimary} />
                                <Text style={[styles.repeatIcon, { color: colors.textPrimary }]}>
                                    {getRepeatDisplayText(formData.repeat)}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Reminder */}
                        <View style={styles.dateColumn}>
                            <Text style={[styles.dateLabel, { color: colors.textPrimary, paddingTop: 20 }]}>{t("reminder")}</Text>
                            <TouchableOpacity
                                onPress={handleOpenReminderModal}
                                style={[{
                                    backgroundColor: colors.cardBackground,
                                    paddingLeft: 15,
                                    paddingRight: 15,
                                    paddingTop: 15,
                                    paddingBottom: 15,
                                    borderRadius: 10,
                                }]}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                                    <Feather
                                        name="bell"
                                        size={20}
                                        color={colors.textPrimary}
                                        style={{ marginTop: 2 }}
                                    />
                                    <View style={{ flex: 1, gap: 8 }}>
                                        <Text style={[styles.repeatIcon, { color: colors.textPrimary }]}>
                                            {t(formData.reminders[0])}
                                        </Text>
                                        {formData.reminders[1] && (
                                            <View
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                }}
                                            >
                                                <Text
                                                    style={[
                                                        styles.repeatIcon,
                                                        { color: colors.textPrimary, flex: 1 },
                                                    ]}
                                                >
                                                    {t(formData.reminders[1])}
                                                </Text>

                                                <TouchableOpacity
                                                    onPress={() =>
                                                        handleRemoveReminder(formData.reminders[1])
                                                    }
                                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                >
                                                    <Feather
                                                        name="x"
                                                        size={18}
                                                        color={colors.textSecondary}
                                                    />
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </View>
                        {/* Background Image Picker */}
                        <View style={styles.dateColumn}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 20, marginBottom: 0 }}>
                                <Text style={[styles.dateLabel, { color: colors.textPrimary, paddingTop: 0 }]}>
                                    Background Image
                                </Text>
                                {/* Badge — reward active ho to green, warna gold PRO */}
                                {rewardDaysLeft > 0 ? (
                                    <View style={{
                                        backgroundColor: '#22c55e',
                                        paddingHorizontal: 7,
                                        paddingVertical: 2,
                                        borderRadius: 6,
                                    }}>
                                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                                            FREE {rewardDaysLeft}d
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={{
                                        backgroundColor: '#FFD700',
                                        paddingHorizontal: 7,
                                        paddingVertical: 2,
                                        borderRadius: 6,
                                    }}>
                                        <Text style={{ color: '#000', fontSize: 10, fontWeight: '700' }}>PRO</Text>
                                    </View>
                                )}
                            </View>

                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ gap: 10, paddingVertical: 6 }}
                            >
                                {/* None option */}
                                <TouchableOpacity
                                    onPress={async () => {
                                        if (!hasBgImageAccess) {
                                            router.push('/PremiumScreen');
                                            return;
                                        }
                                        setFormData({ ...formData, bgImage: null });
                                    }}
                                    style={{
                                        width: 70,
                                        height: 70,
                                        borderRadius: 10,
                                        backgroundColor: colors.cardBackground,
                                        borderWidth: 2,
                                        borderColor: formData.bgImage === null ? '#FF5252' : colors.border,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Feather name="x" size={22} color={colors.textSecondary} />
                                    <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 3 }}>None</Text>
                                </TouchableOpacity>

                                {/* Image options */}
                                {(() => {
                                    const prefix = resolvedTheme === 'dark' ? 'dark' : 'light';
                                    const images: { [key: string]: any } = {
                                        'light': require('../assets/temp/light.jpeg'),
                                        'light1': require('../assets/temp/light1.jpeg'),
                                        'light2': require('../assets/temp/light2.jpeg'),
                                        'light3': require('../assets/temp/light3.jpeg'),
                                        'light4': require('../assets/temp/light4.jpeg'),
                                        'light5': require('../assets/temp/light5.jpeg'),
                                        'light6': require('../assets/temp/light6.jpeg'),
                                        'light7': require('../assets/temp/light7.jpeg'),
                                        'light8': require('../assets/temp/light8.jpeg'),
                                        'dark': require('../assets/temp/dark.jpeg'),
                                        'dark1': require('../assets/temp/dark1.jpeg'),
                                        'dark2': require('../assets/temp/dark2.jpeg'),
                                        'dark3': require('../assets/temp/dark3.jpeg'),
                                        'dark4': require('../assets/temp/dark4.jpeg'),
                                        'dark5': require('../assets/temp/dark5.jpeg'),
                                        'dark6': require('../assets/temp/dark6.jpeg'),
                                        'dark7': require('../assets/temp/dark7.jpeg'),
                                        'dark8': require('../assets/temp/dark8.jpeg'),
                                    };
                                    const keys = [`${prefix}`, `${prefix}1`, `${prefix}2`, `${prefix}3`,
                                    `${prefix}4`, `${prefix}5`, `${prefix}6`, `${prefix}7`, `${prefix}8`];

                                    return keys.map((key) => (
                                        <TouchableOpacity
                                            key={key}
                                            onPress={async () => {
                                                if (!hasBgImageAccess) {
                                                    router.push('/PremiumScreen');
                                                    return;
                                                }
                                                setFormData({ ...formData, bgImage: key });
                                            }}
                                            style={{
                                                borderRadius: 10,
                                                overflow: 'hidden',
                                                borderWidth: 2.5,
                                                borderColor: formData.bgImage === key ? '#FF5252' : 'transparent',
                                            }}
                                        >
                                            <Image
                                                source={images[key]}
                                                style={{ width: 70, height: 70 }}
                                                resizeMode="cover"
                                            />
                                            {/* Lock sirf tab dikhao jab access nahi */}
                                            {!hasBgImageAccess && (
                                                <View style={{
                                                    position: 'absolute',
                                                    top: 0, left: 0, right: 0, bottom: 0,
                                                    backgroundColor: 'rgba(0,0,0,0.45)',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: 8,
                                                }}>
                                                    <Ionicons name="lock-closed" size={20} color="#FF5252" />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    ));
                                })()}
                            </ScrollView>
                        </View>
                        {/* Note */}
                        <TextInput
                            placeholder={t("note")}
                            ref={noteInputRef}
                            placeholderTextColor={colors.textSecondary}
                            style={[styles.noteInput, { color: colors.textPrimary, backgroundColor: colors.cardBackground }]}
                            value={formData.description}
                            onChangeText={d => setFormData({ ...formData, description: d })}
                            onFocus={() => {
                                setIsNoteFocused(true);
                                setTimeout(() => {
                                    scrollViewRef.current?.scrollToEnd({ animated: true });
                                }, 300);
                            }}
                            onBlur={() => setIsNoteFocused(false)}
                            textAlignVertical="top"
                            multiline
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
                    </ScrollView>

                    <CustomToast
                        visible={toastVisible}
                        message={toastMessage}
                        onHide={() => setToastVisible(false)}
                    />
                </SafeAreaView>
            </KeyboardAvoidingView>

            <NotificationPermissionModal
                visible={showPermissionModal}
                onClose={handlePermissionModalClose}
                colors={colors}
            />
            <Modal
                visible={showColorPicker}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowColorPicker(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowColorPicker(false)}
                >
                    <View style={[styles.colorPickerModal, { backgroundColor: colors.background }]}>
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('select_color')}</Text>
                        <View style={styles.colorGrid}>
                            {availableColors.map((color, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => handleColorSelect(color)}
                                    style={[
                                        styles.colorOption,
                                        { backgroundColor: color },
                                        formData.color === color && styles.colorOptionSelected
                                    ]}
                                >
                                    {formData.color === color && (
                                        <Feather name="check" size={24} color="#FFFFFF" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
            <Modal
                visible={showTemplateModal}
                transparent
                animationType="slide"
                onRequestClose={() => {
                    setSelectedCategory(null);
                    setShowTemplateModal(false);
                }}
            >
                <View style={tmplStyles.overlay}>
                    <View style={[tmplStyles.sheet, { backgroundColor: colors.background }]}>

                        {/* Header */}
                        <View style={tmplStyles.sheetHeader}>
                            {selectedCategory ? (
                                <TouchableOpacity onPress={() => setSelectedCategory(null)}>
                                    <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
                                </TouchableOpacity>
                            ) : (
                                <View style={{ width: 24 }} />
                            )}
                            <Text style={[tmplStyles.sheetTitle, { color: colors.textPrimary }]}>
                                {selectedCategory ? selectedCategory.name : 'Templates'}
                            </Text>
                            <TouchableOpacity onPress={() => {
                                setSelectedCategory(null);
                                setShowTemplateModal(false);
                            }}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Categories */}
                        {!selectedCategory ? (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={tmplStyles.categoryGrid}>
                                    {TEMPLATE_CATEGORIES.map(cat => (
                                        <TouchableOpacity
                                            key={cat.id}
                                            style={[tmplStyles.categoryCard, {
                                                backgroundColor: colors.cardBackground,
                                                borderColor: cat.color + '40',
                                                borderWidth: 1.5,
                                            }]}
                                            onPress={() => setSelectedCategory(cat)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[tmplStyles.categoryIcon, { backgroundColor: cat.color + '20' }]}>
                                                <Text style={{ fontSize: 28 }}>{cat.emoji}</Text>
                                            </View>
                                            <Text style={[tmplStyles.categoryName, { color: colors.textPrimary }]}>
                                                {cat.name}
                                            </Text>
                                            <Text style={[tmplStyles.categoryCount, { color: colors.textTertiary }]}>
                                                {cat.templates.length} templates
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                        ) : (
                            // Templates list
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {selectedCategory.templates.map(template => (
                                    <TouchableOpacity
                                        key={template.id}
                                        style={[tmplStyles.templateRow, {
                                            backgroundColor: colors.cardBackground,
                                            borderLeftColor: template.color,
                                        }]}
                                        onPress={() => applyTemplate(template)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[tmplStyles.templateEmoji, { backgroundColor: template.color + '20' }]}>
                                            <Text style={{ fontSize: 22 }}>{template.emoji}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[tmplStyles.templateTitle, { color: colors.textPrimary }]}>
                                                {template.title}
                                            </Text>
                                            {/* <Text style={[tmplStyles.templateReminder, { color: colors.textTertiary }]}>
                                                🔔 Reminder: {template.reminder.replace(/_/g, ' ')}
                                            </Text> */}
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
            <Modal
                visible={showStartDatePicker}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowStartDatePicker(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
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
                            style={styles.datePicker}
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

            <Modal visible={showRepeatModal} transparent animationType="fade">
                <View style={styles.centeredModalContainer}>
                    <TouchableOpacity
                        style={styles.modalBackdrop}
                        activeOpacity={1}
                        onPress={handleRepeatCancel}
                    />
                    <View style={[styles.reminderModalBox, { backgroundColor: colors.cardBackground }]}>
                        <ScrollView style={{ maxHeight: 400 }}>
                            {getRepeatOptions().map(option => (
                                <TouchableOpacity
                                    key={option.key}
                                    onPress={() => handleRepeatSelect(option.key)}
                                    style={styles.reminderOption}
                                >
                                    <View style={styles.radioButton}>
                                        {tempRepeatValue === option.key && (
                                            <View style={styles.radioButtonSelected} />
                                        )}
                                    </View>
                                    <Text style={[styles.reminderOptionText, { color: colors.textPrimary }]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={styles.reminderModalActions}>
                            <TouchableOpacity onPress={handleRepeatCancel} style={styles.reminderModalBtn}>
                                <Text style={[styles.reminderModalBtnText, { color: colors.textSecondary }]}>
                                    {t("cancel")}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleRepeatOk} style={styles.reminderModalBtn}>
                                <Text style={[styles.reminderModalBtnText, { color: '#FF5252' }]}>
                                    {t("ok")}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={showReminderModal} transparent animationType="fade">
                <View style={styles.centeredModalContainer}>
                    <TouchableOpacity
                        style={styles.modalBackdrop}
                        activeOpacity={1}
                        onPress={handleReminderCancel}
                    />
                    <View style={[styles.reminderModalBox, { backgroundColor: colors.cardBackground }]}>
                        <ScrollView style={{ maxHeight: 400 }}>
                            {getReminderOptions().map(option => (
                                <TouchableOpacity
                                    key={option.key}
                                    onPress={() => handleToggleReminder(option.key)}
                                    style={styles.reminderOption}
                                >
                                    <View style={styles.radioButton}>
                                        {tempReminders.includes(option.key) && (
                                            <View style={styles.radioButtonSelected} />
                                        )}
                                    </View>
                                    <Text style={[styles.reminderOptionText, { color: colors.textPrimary }]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={styles.reminderModalActions}>
                            <TouchableOpacity onPress={handleReminderCancel} style={styles.reminderModalBtn}>
                                <Text style={[styles.reminderModalBtnText, { color: colors.textSecondary }]}>
                                    {t("cancel")}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleReminderOk} style={styles.reminderModalBtn}>
                                <Text style={[styles.reminderModalBtnText, { color: '#FF5252' }]}>
                                    {t("ok")}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

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
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                            {activeTimeField === "start" ? t("select_start_time") : t("select_end_time")}
                        </Text>

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
                            minimumDate={activeTimeField === "start" ? getMinStartTime() : undefined}
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
                                onPress={() => {
                                    if (activeTimeField === "start") {
                                        const newStartDateTime = new Date(formData.startDate);
                                        newStartDateTime.setHours(tempTime.getHours());
                                        newStartDateTime.setMinutes(tempTime.getMinutes());
                                        newStartDateTime.setSeconds(0);

                                        const currentEndDateTime = new Date(formData.endDate);
                                        currentEndDateTime.setHours(formData.endTime.getHours());
                                        currentEndDateTime.setMinutes(formData.endTime.getMinutes());
                                        currentEndDateTime.setSeconds(0);

                                        if (currentEndDateTime <= newStartDateTime) {
                                            const newEndTime = new Date(tempTime.getTime() + 3600000);
                                            setFormData({
                                                ...formData,
                                                startTime: tempTime,
                                                endTime: newEndTime
                                            });
                                        } else {
                                            setFormData({ ...formData, startTime: tempTime });
                                        }
                                        setShowTimePicker(false);
                                    } else {
                                        const currentStartDateTime = new Date(formData.startDate);
                                        currentStartDateTime.setHours(formData.startTime.getHours());
                                        currentStartDateTime.setMinutes(formData.startTime.getMinutes());
                                        currentStartDateTime.setSeconds(0);

                                        const selectedEndDateTime = new Date(formData.endDate);
                                        selectedEndDateTime.setHours(tempTime.getHours());
                                        selectedEndDateTime.setMinutes(tempTime.getMinutes());
                                        selectedEndDateTime.setSeconds(0);

                                        if (selectedEndDateTime <= currentStartDateTime) {
                                            showToast(t("end_time_validation") || "End date and time must be after start date and time");
                                            return;
                                        }
                                        setFormData({ ...formData, endTime: tempTime });
                                        setShowTimePicker(false);
                                    }
                                }}
                            >
                                <Text style={styles.modalButtonTextPrimary}>{t("ok")}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}
const tmplStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '80%',
        minHeight: '50%',
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        paddingBottom: 30,
    },
    categoryCard: {
        width: '47%',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        gap: 8,
    },
    categoryIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    categoryName: {
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
    categoryCount: {
        fontSize: 11,
    },
    templateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderLeftWidth: 4,
        gap: 12,
    },
    templateEmoji: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    templateTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 3,
    },
    templateReminder: {
        fontSize: 12,
    },
    colorDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
});
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        padding: 15,
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 50,
    },
    templateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 8,
    },
    templateBtnText: {
        fontSize: 13,
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
    stickyAdContainer: {
        width: '100%',
        alignItems: 'center',
        marginTop: 20,
    },
    reminderModalBox: {
        width: '90%',
        maxWidth: 400,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    reminderOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        gap: 12,
    },
    backButton: {
        padding: 4,
        marginRight: 10,
    },
    inputText: {
        flex: 1,
        fontSize: 16,
        color: '#fff',
    },
    halfSection: {
        flex: 1,
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#FF5252',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    modalButtonPrimary: {
        backgroundColor: '#FF5252',
    },
    closeBtnCircle: {
        width: 40, height: 40, borderRadius: 50,
        alignItems: 'center', justifyContent: 'center',
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
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 16,
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
    radioButtonSelected: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FF5252',
    },
    reminderOptionText: {
        fontSize: 16,
        flex: 1,
    },
    reminderModalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 16,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
    },
    reminderModalBtn: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    reminderModalBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
    headerButton: {
        fontSize: 20,
        fontWeight: '500',
    },
    saveButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#FF5252',
        borderRadius: 10,
    },
    saveText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 10,
        gap: 12,
    },
    formScroll: {
        padding: 15,
    },
    input: {
        fontSize: 16,
        paddingVertical: 12,
        marginBottom: 15,
        borderBottomWidth: 1,
    },
    row: {
        paddingVertical: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        fontSize: 16,
    },
    value: {
        fontSize: 16,
        fontWeight: '500',
    },
    rowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    repeatIcon: {
        fontSize: 16,
    },
    dateRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 20,
    },

    dateColumn: {
        flex: 1,
    },

    dateLabel: {
        fontSize: 14,
        marginBottom: 8,
    },

    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        gap: 8,
    },
    dateIcon: {
        fontSize: 18,
    },
    dateText: {
        fontSize: 14,
        fontWeight: '500',
    },
    noteInput: {
        fontSize: 16,
        padding: 12,
        marginTop: 10,
        borderRadius: 8,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    centeredModalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    centeredModalBox: {
        width: '90%',
        maxWidth: 400,
        padding: 15,
        borderRadius: 16,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    timeModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    timeModalCenter: {
        width: '85%',
        maxWidth: 340,
    },
    timeModalContent: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    timeDisplayHeader: {
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
    },
    timeDisplayText: {
        fontSize: 32,
        fontWeight: '300',
        letterSpacing: 1,
    },
    pickerWrapper: {
        height: 220,
        position: 'relative',
        overflow: 'hidden',
    },
    pickerRow: {
        flexDirection: 'row',
        height: '100%',
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pickerCol: {
        flex: 1,
        height: '100%',
    },
    scrollContent: {
        paddingVertical: 88,
    },
    pickerOption: {
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },

    pickerOptionText: {
        fontSize: 22,
    },
    colonSeparator: {
        fontSize: 24,
        fontWeight: '300',
        marginHorizontal: 8,
    },
    ampmContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectionHighlight: {
        position: 'absolute',
        left: 20,
        right: 20,
        top: 88,
        height: 44,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(255,255,255,0.03)',
        pointerEvents: 'none',
        zIndex: 1,
    },
    timeModalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    timeModalBtn: {
        paddingVertical: 8,
        paddingHorizontal: 20,
    },
    timeModalBtnText: {
        fontSize: 16,
        fontWeight: '600',
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        marginBottom: 10,
        paddingVertical: 12,
    },
    titleInput: {
        flex: 1,
        fontSize: 18,
        paddingVertical: 6,
        paddingHorizontal: 4,
    },
    colorDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        marginLeft: 10,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    colorPickerModal: {
        width: 300,
        padding: 18,
        borderRadius: 16,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
        elevation: 8,
    },
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
    },
    colorOption: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
    },
    colorOptionSelected: {
        borderWidth: 3,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 5,
    },
});