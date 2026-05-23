import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from "react-i18next";
import {
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
import { useTheme } from '../contexts/ThemeContext';
import { useScreenTracking } from '../hooks/useScreenTracking';
import AdsManager from '../services/adsManager';
import NotificationService from '../services/NotificationService';
import PurchaseManager from '../services/purchaseManager';
import { loadData, saveData } from '../utils/storage';

export default function EditEventScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const params = useLocalSearchParams();
    const { colors, theme } = useTheme();
    const [isTimeFormatLoaded, setIsTimeFormatLoaded] = useState(false);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const [is24Hour, setIs24Hour] = useState(false);
    const [userLocale, setUserLocale] = useState('en-US');
    // Add state for repeat modal
    const [showRepeatModal, setShowRepeatModal] = useState(false);
    const [tempRepeatValue, setTempRepeatValue] = useState('does_not');
    useScreenTracking('edit_event_screen');

    // Repeat options
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

    const [showStartTimeModal, setShowStartTimeModal] = useState(false);
    const [showEndTimeModal, setShowEndTimeModal] = useState(false);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [tempDate, setTempDate] = useState(new Date());
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [activeTimeField, setActiveTimeField] = useState<"start" | "end" | null>(null);
    const [tempTime, setTempTime] = useState(new Date());
    const [originalData, setOriginalData] = useState<any>(null);

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
        if (params.id) {
            loadEvent(params.id as string);
        }
    }, [params.id]);

    const loadEvent = async (id: string) => {
        const stored = await AsyncStorage.getItem('events');
        if (!stored) return;

        const events = JSON.parse(stored);
        const event = events.find((e: any) => e.id === id);
        if (!event) return;

        const snapshot = JSON.parse(JSON.stringify(event));
        setOriginalFormData(snapshot);

        setOriginalData(snapshot);
        setFormData(snapshot);
    };

    const formatDateForDisplay = (date: Date) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    };

    const [originalFormData, setOriginalFormData] = useState({
        title: '',
        description: '',
        startDate: new Date(),
        endDate: new Date(),
        startTime: new Date(),
        endTime: new Date(),
        allDay: false,
        repeat: 'Does not repeat',
        reminders: ['at_time'],
        color: '#0267FF',
    });

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        startDate: new Date(),
        endDate: new Date(),
        startTime: new Date(),
        endTime: new Date(),
        allDay: false,
        repeat: 'Does not repeat',
        reminders: ['at_time'],
        color: '#0267FF',
    });
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
                { key: 'on_day_9am', label: t('on_day_9am') },
                { key: 'day_before_9am', label: t('day_before_9am') },
                { key: '2days_before_9am', label: t('2days_before_9am') },
                { key: '1week_before_9am', label: t('1week_before_9am') },
                { key: '2weeks_before_9am', label: t('2weeks_before_9am') },
            ];
        }

        return [
            { key: 'at_time', label: t('at_time') },
            { key: '5min', label: t('5min') },
            { key: '10min', label: t('10min') },
            { key: '15min', label: t('15min') },
            { key: '30min', label: t('30min') },
            { key: '1hour', label: t('1hour') },
            { key: '1day', label: t('1day') },
        ];
    };
    const isAllDayEnabled = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = new Date(formData.startDate);
        start.setHours(0, 0, 0, 0);
        return start > today;
    };

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
                showToast(t("for_monthly_repeating_events") || "For monthly repeating events, the duration must be less than 31 days");
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
                showToast(t("for_weekly_repeating_events") || "For weekly repeating events, the duration must be less than 7 days");
                return false;
            }
        }
        if (
            formData.repeat.toLowerCase().includes("year") ||
            formData.repeat === "every_year"
        ) {
            if (diffYears > 1) {
                showToast(t("for_yearly_repeating_events_the") || "For yearly repeating events, the duration must be less than 1 year");
                return false;
            }
        }
        return true;
    };

    useEffect(() => {
        console.log('📝 EditEvent - Params received:', params);

        if (params.eventId) {
            try {
                const newStartDate = new Date(params.startDate as string);
                const newEndDate = new Date(params.endDate as string);

                const newStartTime = new Date(parseInt(params.startTime as string));
                const newEndTime = new Date(parseInt(params.endTime as string));

                if (isNaN(newStartDate.getTime())) {
                    console.error('Invalid start date:', params.startDate);
                    return;
                }
                if (isNaN(newEndDate.getTime())) {
                    console.error('Invalid end date:', params.endDate);
                    return;
                }
                if (isNaN(newStartTime.getTime())) {
                    console.error('Invalid start time:', params.startTime);
                    return;
                }
                if (isNaN(newEndTime.getTime())) {
                    console.error('Invalid end time:', params.endTime);
                    return;
                }

                setStartDate(newStartDate);
                setEndDate(newEndDate);

                const newFormData = {
                    title: params.title as string || '',
                    description: params.description as string || '',
                    startDate: newStartDate,
                    endDate: newEndDate,
                    startTime: newStartTime,
                    endTime: newEndTime,
                    allDay: params.allDay === 'true',
                    repeat: params.repeat as string || 'Does not repeat',
                    reminders: params.reminders ? JSON.parse(params.reminders as string) : ['at_time'],
                    color: params.color as string || '#0267FF',
                };

                setOriginalFormData(JSON.parse(JSON.stringify(newFormData)));
                setFormData(newFormData);
                setTempReminders(newFormData.reminders);

                console.log('✅ Form data loaded successfully');
                console.log('Start Time:', newStartTime.toLocaleTimeString());
                console.log('End Time:', newEndTime.toLocaleTimeString());

            } catch (error) {
                console.error('Error loading event data:', error);
                showToast(t("error_loading_event") || "Error loading event data");
            }
        }
    }, [
        params.eventId,
        params.title,
        params.description,
        params.startDate,
        params.endDate,
        params.startTime,
        params.endTime,
        params.allDay,
        params.repeat,
        params.reminders,
        params.color
    ]);

    useEffect(() => {
        if (params.repeatValue) {
            console.log("Received repeat value:", params.repeatValue);
            setFormData(prev => ({
                ...prev,
                repeat: params.repeatValue as string
            }));
        }
    }, [params.repeatValue]);

    const formatDate = (date: Date) => {
        const d = new Date(date);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
    };


    const handleOpenReminderModal = () => {
        setTempReminders([...formData.reminders]);
        setShowReminderModal(true);
    };

    const handleToggleReminder = (key: string) => {
        if (tempReminders.includes(key)) {
            if (tempReminders.length > 1) {
                setTempReminders(tempReminders.filter(r => r !== key));
            }
        } else {
            setTempReminders([...tempReminders, key]);
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
            showToast(t("end_date_cannot_be_before") || "End date cannot be before start date");
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

    useEffect(() => {
        const checkFormat = async () => {
            const manual = await AsyncStorage.getItem('user_manual_24hour_override');
            setIs24Hour(manual === 'true');
        };
        checkFormat();
    }, []);


    const formatTime = (date: Date) => {
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            return new Date().toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: !is24Hour
            });
        }

        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: !is24Hour
        });
    };

    const handleColorSelect = (color: string) => {
        setFormData({ ...formData, color });
        setShowColorPicker(false);
    };

    const updateEvent = async () => {
        if (!formData.title.trim()) {
            showToast(t("please_enter_title") || "Please enter a title");
            return;
        }
        if (!validateMonthlyRepeat()) {
            return;
        }
        if (!validateRepeatDurations()) {
            return;
        }

        const startDateObj = ensureDateObject(formData.startDate);
        const endDateObj = ensureDateObject(formData.endDate);
        const startTimeObj = ensureDateObject(formData.startTime);
        const endTimeObj = ensureDateObject(formData.endTime);

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
        console.log('⏰ Reminders:', formData.reminders);

        const originalEventTime = new Date(originalFormData.startDate);
        if (!originalFormData.allDay) {
            const originalStartTime = originalFormData.startTime instanceof Date
                ? originalFormData.startTime
                : new Date(originalFormData.startTime);
            originalEventTime.setHours(originalStartTime.getHours());
            originalEventTime.setMinutes(originalStartTime.getMinutes());
        }

        const isTimeChanged = eventDateTime.getTime() !== originalEventTime.getTime();

        if (isTimeChanged && (formData.repeat === 'Does not repeat' || formData.repeat === 'does_not')) {
            const now = new Date();
            const timeDiff = (eventDateTime.getTime() - now.getTime()) / 1000;

            if (timeDiff < 5) {
                showToast(t("event_time_must_be_at_lease_seconds") || "Event time must be at least 5 seconds in the future for reminders");
                return;
            }
        }

        try {
            const updatedEvent = {
                id: params.eventId as string,
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
            };

            console.log("📌 Updated Event:", updatedEvent);

            const oldNotificationIds = await AsyncStorage.getItem(
                `event_${params.eventId}_notifications`
            );

            if (oldNotificationIds) {
                const ids = JSON.parse(oldNotificationIds);
                console.log('🗑️ Cancelling old notifications:', ids.length);

                for (const notificationId of ids) {
                    await NotificationService.cancelNotification(notificationId);
                }

                await AsyncStorage.removeItem(`event_${params.eventId}_notifications`);
                console.log('Old notifications cancelled');
            }

            console.log('=== Scheduling Updated Event Notifications ===');
            const notificationIds: string[] = [];

            for (let i = 0; i < formData.reminders.length; i++) {
                const reminderOffset = formData.reminders[i];
                console.log(`Scheduling reminder ${i + 1}:`, reminderOffset);

                const notificationId = await NotificationService.scheduleEventNotification(
                    updatedEvent.id,
                    formData.title,
                    formData.description || `Event: ${formData.title}`,
                    eventDateTime,
                    formData.repeat,
                    reminderOffset
                );

                if (notificationId) {
                    notificationIds.push(notificationId);
                    console.log(`Reminder ${i + 1} scheduled:`, notificationId);
                }
            }

            if (notificationIds.length > 0) {
                await AsyncStorage.setItem(
                    `event_${updatedEvent.id}_notifications`,
                    JSON.stringify(notificationIds)
                );
                console.log('New notification IDs saved:', notificationIds.length);
            }

            // Save updated event
            const events = await loadData('events') || [];
            const updatedEvents = events.map((event: any) =>
                event.id === params.eventId ? updatedEvent : event
            );
            await saveData('events', updatedEvents);
            console.log('Event updated in storage');

            // Show success message
            if (notificationIds.length > 0) {
                const repeatMessage =
                    formData.repeat === 'Everyday' || formData.repeat === 'everyday' ? 'Daily reminders updated!' :
                        formData.repeat === 'Every week' || formData.repeat === 'every_week' ? 'Weekly reminders updated!' :
                            formData.repeat === 'Every month' || formData.repeat === 'every_month' ? 'Monthly reminders updated!' :
                                formData.repeat === 'Every year' || formData.repeat === 'every_year' ? 'Yearly reminders updated!' :
                                    `${notificationIds.length} reminder(s) updated!`;

                showToast(`${t("event_update") || "Event updated!"} ${repeatMessage}`);
            } else {
                showToast(`${t("event_update") || "Event updated!"}`);
            }

            // setTimeout(() => router.back(), 100);

            const isPremium = await PurchaseManager.isPremium();

            if (isPremium) {
                console.log('👑 Premium user — skipping cancel ad');
                router.back();
                return;
            } else {
                console.log('🎬 Attempting to show event save ad...');
                const adShown = await AdsManager.showEventScreenInterstitialAd('EditEvent', 'save');

                if (adShown) {
                    console.log('Event save ad shown, navigating after ad closes');
                    setTimeout(() => router.back(), 500);
                } else {
                    console.log('Event save ad not shown (disabled or frequency limit), navigating immediately');
                    setTimeout(() => router.back(), 300);
                }
            }
        } catch (error) {
            console.error('Error updating event:', error);
            showToast(t("error_event_update") || "Failed to update event");
        }
    };

    const ensureDateObject = (date: any): Date => {
        if (date instanceof Date) return date;
        return new Date(date);
    };

    const resetToOriginalValues = () => {
        const resetData = {
            ...originalFormData,
            startDate: new Date(originalFormData.startDate),
            endDate: new Date(originalFormData.endDate),
            startTime: new Date(originalFormData.startTime),
            endTime: new Date(originalFormData.endTime),
        };

        setFormData(resetData);
        setStartDate(new Date(originalFormData.startDate));
        setEndDate(new Date(originalFormData.endDate));
        setTempReminders([...originalFormData.reminders]);
    };

    // const handleCancel = () => {
    //     resetToOriginalValues();
    //     router.back();
    // };
    const handleCancel = async () => {
        const isPremium = await PurchaseManager.isPremium();

        if (isPremium) {
            console.log('👑 Premium user — skipping cancel ad');
            router.back();
            return;
        }
        console.log('🎬 Event cancelled, attempting to show ad...');
        const adShown = await AdsManager.showEventScreenInterstitialAd('editEvent', 'back');

        if (adShown) {
            console.log('Event cancel ad shown, navigating after ad closes');
            setTimeout(() => {
                resetToOriginalValues();
                router.back();
            }, 500);
        } else {
            console.log('Event cancel ad not shown (disabled or frequency limit), navigating immediately');
            resetToOriginalValues();
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
        return t(mapping[repeatValue] || repeatValue);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header]}>
                {/* <View style={styles.leftContainer}> */}
                    <TouchableOpacity
                        onPress={handleCancel}
                        style={styles.backButton}
                    >
                        <View style={[styles.closeBtnCircle, { backgroundColor: colors.cardBackground }]}>
                            {/* <Text style={[styles.closeBtnX, { color: colors.textPrimary }]}>✕</Text> */}
                            <Ionicons name="chevron-back" size={28} color={colors.textSecondary} />
                        </View>
                        {/* <Text style={[styles.headerButton, { color: colors.textPrimary }]}>✕</Text> */}
                    </TouchableOpacity>

                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                        {t("edit_event")}
                    </Text>
                {/* </View> */}
                <TouchableOpacity onPress={updateEvent}>
                    <Text style={[styles.saveText, styles.saveButton]}>{t("update")}</Text>
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <SafeAreaView style={{ flex: 1 }}>
                    <ScrollView
                        style={styles.formScroll}
                        contentContainerStyle={{ paddingBottom: 120 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={[styles.titleContainer, { borderBottomColor: colors.border }]}>
                            <TextInput
                                placeholder={t("add_title")}
                                placeholderTextColor={colors.textSecondary}
                                style={[styles.titleInput, { color: colors.textPrimary }]}
                                value={formData.title}
                                onChangeText={t => setFormData({ ...formData, title: t })}
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
                            <View style={styles.halfSection}>
                                <Text style={[styles.label, { color: colors.textPrimary }]}>{t("start_date")}</Text>
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
                            <View style={styles.halfSection}>
                                <Text style={[styles.label, { color: colors.textPrimary }]}>{t("end_date")}</Text>
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
                                    <Text style={[styles.dateLabel, { color: colors.textPrimary }]}>
                                        {t("start_time")}
                                    </Text>

                                    <TouchableOpacity
                                        style={[styles.dateButton, { backgroundColor: colors.cardBackground }]}
                                        onPress={() => {
                                            setActiveTimeField("start");
                                            setTempTime(formData.startTime);
                                            setShowTimePicker(true);
                                        }}
                                    >
                                        <Feather
                                            name="clock"
                                            size={20}
                                            color={theme === "dark" ? colors.white : colors.textPrimary}
                                        />
                                        <Text style={[styles.dateText, { color: colors.textPrimary }]}>
                                            {formatTime(formData.startTime)}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.dateColumn}>
                                    <Text style={[styles.dateLabel, { color: colors.textPrimary }]}>
                                        {t("end_time")}
                                    </Text>

                                    <TouchableOpacity
                                        style={[styles.dateButton, { backgroundColor: colors.cardBackground }]}
                                        onPress={() => {
                                            setActiveTimeField("end");
                                            setTempTime(formData.endTime);
                                            setShowTimePicker(true);
                                        }}
                                    >
                                        <Feather
                                            name="clock"
                                            size={20}
                                            color={theme === "dark" ? colors.white : colors.textPrimary}
                                        />
                                        <Text style={[styles.dateText, { color: colors.textPrimary }]}>
                                            {formatTime(formData.endTime)}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Repeat */}
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
                                style={[
                                    {
                                        backgroundColor: colors.cardBackground,
                                        paddingLeft: 15,
                                        paddingRight: 15,
                                        paddingTop: 15,
                                        paddingBottom: 15,
                                        borderRadius: 10,
                                    },
                                ]}
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
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <Text style={[styles.repeatIcon, { color: colors.textPrimary, flex: 1 }]}>
                                                    {t(formData.reminders[1])}
                                                </Text>
                                                <TouchableOpacity
                                                    onPress={() => handleRemoveReminder(formData.reminders[1])}
                                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                >
                                                    <Feather name="x" size={18} color={colors.textSecondary} />
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Note */}
                        <TextInput
                            placeholder={t("note")}
                            placeholderTextColor={colors.textSecondary}
                            style={[styles.noteInput, { color: colors.textPrimary, backgroundColor: colors.cardBackground }]}
                            value={formData.description}
                            onChangeText={d => setFormData({ ...formData, description: d })}
                            multiline
                        />
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
                    <CustomToast
                        visible={toastVisible}
                        message={toastMessage}
                        onHide={() => setToastVisible(false)}
                    />
                </SafeAreaView>
            </KeyboardAvoidingView>


            {/* REPEAT MODAL - NEW POPUP */}
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
            {/* Color Picker Modal */}
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
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t("select_color")}</Text>
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

            {/* Start Date Picker Modal */}
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
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                            {t("select_end_date")}
                        </Text>
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

            {/* REMINDER MODAL */}
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

            {/* Time Picker Modal */}
            <Modal
                visible={showTimePicker}
                transparent
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
                            {activeTimeField === "start"
                                ? t("select_start_time")
                                : t("select_end_time")}
                        </Text>

                        <DateTimePicker
                            value={tempTime}
                            mode="time"
                            display={Platform.OS === "ios" ? "spinner" : "default"}
                            onChange={(event, selectedTime) => {
                                if (selectedTime) {
                                    setTempTime(selectedTime);
                                }
                            }}
                            textColor={colors.textPrimary}
                            is24Hour={is24Hour}  // Keep this, check from AsyncStorage
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalButton}
                                onPress={() => setShowTimePicker(false)}
                            >
                                <Text style={styles.modalButtonText}>
                                    {t("cancel")}
                                </Text>
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
                                <Text style={styles.modalButtonTextPrimary}>
                                    {t("ok")}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        // padding: 15,
        paddingTop: 15,
        paddingLeft: 15,
        paddingRight: 15,
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 50,
    },
    stickyAdContainer: {
        width: '100%',
        alignItems: 'center',
    },

    halfSection: {
        flex: 1,
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    reminderOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        gap: 12,
    },
    closeBtnCircle: {
        width: 40, height: 40, borderRadius: 50,
        alignItems: 'center', justifyContent: 'center',
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
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    modalButtonTextPrimary: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
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
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 16,
        gap: 12,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 16,
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
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
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
        fontWeight: '700',
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
        fontSize: 14,
        marginBottom: 8,
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
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        borderBottomWidth: 1,
        paddingVertical: 12,
    },

    titleInput: {
        flex: 1,
        fontSize: 18,
        paddingVertical: 6,
        paddingHorizontal: 4,
    },

});