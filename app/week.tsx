import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerActions, useFocusEffect, useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from "react-i18next";
import {
    Animated,
    Dimensions,
    Image,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { COUNTRY_CALENDAR_IDS } from '../constants/countryCalendars';
import { useTheme } from '../contexts/ThemeContext';
import { useScreenTracking } from '../hooks/useScreenTracking';
import { loadData } from '../utils/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 60;

const API_KEY = "AIzaSyCbk3aJTWGqJZVHtb3SR7OqzUFEc9Cewe0";

const getLocalDateString = (date: Date = new Date()): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export default function WeekScreen() {
    const navigation = useNavigation();
    const { colors, theme, resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const router = useRouter();
    const { t } = useTranslation();
    const [refreshKey, setRefreshKey] = useState(0);
    const lightNoEventImg = require("../assets/images/no-events.png");
    const darkNoEventImg = require("../assets/images/dark-no-event.png");
    const pulseAnim = useRef(new Animated.Value(0)).current;
    const [firstDayOfWeek, setFirstDayOfWeek] = useState(0);
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
        const today = new Date();
        const diff = ((today.getDay() - 0) + 7) % 7;
        const start = new Date(today);
        start.setDate(today.getDate() - diff);
        start.setHours(0, 0, 0, 0);
        return start;
    });
    const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
    const [events, setEvents] = useState<any[]>([]);
    const [holidays, setHolidays] = useState<any[]>([]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const weekStripX = useRef(new Animated.Value(-SCREEN_WIDTH)).current;

    const navRef = useRef({ goToNextWeek: () => { }, goToPrevWeek: () => { } });

    useScreenTracking('Week_screen');

    // ── Init ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        const today = new Date();
        const diff = ((today.getDay() - firstDayOfWeek) + 7) % 7;
        const start = new Date(today);
        start.setDate(today.getDate() - diff);
        start.setHours(0, 0, 0, 0);
        setCurrentWeekStart(start);
        setSelectedDate(getLocalDateString(today));
    }, [firstDayOfWeek]);

    useEffect(() => {
        setSelectedYear(currentWeekStart.getFullYear());
    }, [currentWeekStart]);

    useFocusEffect(
        React.useCallback(() => {
            loadEvents();
            loadFirstDay();
            loadSelectedCountry();
        }, [])
    );

    const loadEvents = async () => {
        const data = await loadData('events');
        if (data) setEvents(data);
    };

    const loadFirstDay = async () => {
        try {
            const day = await AsyncStorage.getItem('firstDayOfWeek');
            if (day) setFirstDayOfWeek(parseInt(day));
        } catch { }
    };

    const loadSelectedCountry = async () => {
        try {
            const saved = await AsyncStorage.getItem('selectedCountry');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    const countries = Array.isArray(parsed) ? parsed : [parsed];
                    fetchAllHolidays(countries);
                } catch {
                    fetchAllHolidays([saved]);
                }
            } else {
                fetchAllHolidays(['India']);
            }
        } catch {
            fetchAllHolidays(['India']);
        }
    };

    useEffect(() => {
        const prevCallback = global.firstDayChanged;

        global.firstDayChanged = (day: number) => {
            console.log('Year View - First day changed:', day);
            setFirstDayOfWeek(day);
            setRefreshKey(prev => prev + 1);

            // CalendarScreen ka callback bhi call karo agar exist kare
            if (prevCallback) prevCallback(day);
        };

        return () => {
            global.firstDayChanged = prevCallback;
        };
    }, []);

    const fetchAllHolidays = async (countries: string[]) => {
        const all: any[] = [];
        for (const country of countries) {
            const calendarId = COUNTRY_CALENDAR_IDS[country];
            if (!calendarId) continue;
            try {
                const encoded = encodeURIComponent(calendarId);
                const url = `https://www.googleapis.com/calendar/v3/calendars/${encoded}/events?key=${API_KEY}&timeMin=2024-01-01T00:00:00Z&timeMax=2030-12-31T23:59:59Z&maxResults=1000&singleEvents=true&orderBy=startTime`;
                const res = await fetch(url);
                const data = await res.json();
                if (data.items) {
                    all.push(...data.items.map((item: any) => ({
                        date: item.start.date,
                        name: item.summary,
                        country,
                    })));
                }
            } catch { }
        }
        setHolidays(all);
    };

    const getWeekDaysFrom = (start: Date): Date[] =>
        Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return d;
        });

    const getWeekDays = (): Date[] => getWeekDaysFrom(currentWeekStart);

    const goToPrevWeek = () => {
        const newStart = new Date(currentWeekStart);
        newStart.setDate(currentWeekStart.getDate() - 7);
        setCurrentWeekStart(newStart);
        setSelectedDate(getLocalDateString(newStart));
    };

    const goToNextWeek = () => {
        const newStart = new Date(currentWeekStart);
        newStart.setDate(currentWeekStart.getDate() + 7);
        setCurrentWeekStart(newStart);
        setSelectedDate(getLocalDateString(newStart));
    };
    navRef.current = { goToNextWeek, goToPrevWeek };

    // ── PanResponder — only moves the week strip ──────────────────────────────
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) =>
                Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
            onPanResponderMove: (_, g) => {
                weekStripX.setValue(-SCREEN_WIDTH + g.dx);
            },
            onPanResponderRelease: (_, g) => {
                if (g.dx < -SWIPE_THRESHOLD) {
                    Animated.timing(weekStripX, {
                        toValue: -SCREEN_WIDTH * 2,
                        duration: 220,
                        useNativeDriver: true,
                    }).start(() => {
                        weekStripX.setValue(-SCREEN_WIDTH);
                        navRef.current.goToNextWeek();
                    });
                } else if (g.dx > SWIPE_THRESHOLD) {
                    Animated.timing(weekStripX, {
                        toValue: 0,
                        duration: 220,
                        useNativeDriver: true,
                    }).start(() => {
                        weekStripX.setValue(-SCREEN_WIDTH);
                        navRef.current.goToPrevWeek();
                    });
                } else {
                    Animated.spring(weekStripX, {
                        toValue: -SCREEN_WIDTH,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    // ── Event helpers (unchanged) ─────────────────────────────────────────────
    const shouldShowEventOnDate = (event: any, targetDateStr: string): boolean => {
        const eventStart = new Date(event.startDate.split('T')[0] + 'T00:00:00');
        const targetDate = new Date(targetDateStr + 'T00:00:00');
        if (targetDate < eventStart) return false;
        const r = event.repeat;
        if (!r || r === 'Does not repeat' || r === 'does_not') {
            if (event.allDay) return event.startDate.split('T')[0] === targetDateStr;
            const end = new Date(event.endDate.split('T')[0] + 'T00:00:00');
            return targetDate >= eventStart && targetDate <= end;
        }
        switch (r) {
            case 'Everyday': case 'everyday': case 'daily': case 'every_day': return true;
            case 'Every week': case 'every_week': case 'weekly': return targetDate.getDay() === eventStart.getDay();
            case 'Every month': case 'every_month': case 'monthly': return targetDate.getDate() === eventStart.getDate();
            case 'Every year': case 'every_year': case 'yearly':
                return targetDate.getDate() === eventStart.getDate() && targetDate.getMonth() === eventStart.getMonth();
            default: return false;
        }
    };

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

    const getEventsForDate = (dateStr: string): any[] => {
        const dayEvents = events.filter(e => e.startDate && e.endDate && shouldShowEventOnDate(e, dateStr));
        const dayHolidays = holidays
            .filter(h => h.date === dateStr)
            .map((h, i) => ({
                id: `holiday-${h.date}-${h.country}-${i}`,
                title: h.name,
                date: h.date,
                country: h.country,
                allDay: true,
                isHoliday: true,
                color: '#FF6B6B',
            }));
        return [...dayHolidays, ...dayEvents];
    };

    const dayHasEvents = (date: Date) => getEventsForDate(getLocalDateString(date)).length > 0;

    // ── Format helpers (unchanged) ────────────────────────────────────────────
    const formatMonthYear = (date: Date) => {
        const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthName = t(monthKeys[date.getMonth()]);
        return `${monthName} ${date.getFullYear()}`;
    };

    const formatDayHeading = (dateStr: string): string => {
        const date = new Date(dateStr + 'T00:00:00');
        const day = date.getDate();
        const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthName = t(monthKeys[date.getMonth()]);
        if (dateStr === getLocalDateString()) return `${t('today')}, ${day} ${monthName}`;

        const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        return `${t(dayKeys[date.getDay()])} ${day}`;
    };

    const formatEventTime = (event: any): string => {
        if (event.allDay || event.isHoliday) return t('all_day') || 'All Day';

        const parseTime = (timeValue: any): string => {
            if (!timeValue) return '';
            try {
                const time = new Date(parseInt(String(timeValue)));
                if (isNaN(time.getTime())) return String(timeValue);
                return time.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                });
            } catch {
                return String(timeValue);
            }
        };

        const sd = event.startDate?.split('T')[0];
        const ed = event.endDate?.split('T')[0];
        const startFormatted = parseTime(event.startTime);
        const endFormatted = parseTime(event.endTime);

        if (sd !== ed) {
            const s = new Date(sd + 'T00:00:00');
            const e = new Date(ed + 'T00:00:00');
            return `${s.getDate()} ${s.toLocaleDateString('en-US', { month: 'short' })} to ${e.getDate()} ${e.toLocaleDateString('en-US', { month: 'short' })}, ${startFormatted} - ${endFormatted}`;
        }

        return `${startFormatted} - ${endFormatted}`;
    };

    const getRepeatText = (repeat: string) => {
        if (!repeat) return '';
        switch (repeat.toLowerCase()) {
            case 'does not repeat': case 'does_not': return '';
            case 'everyday': case 'daily': case 'every_day': return t('everyday') || 'Daily';
            case 'every week': case 'every_week': case 'weekly': return t('every_week') || 'Weekly';
            case 'every month': case 'every_month': case 'monthly': return t('every_month') || 'Monthly';
            case 'every year': case 'every_year': case 'yearly': return t('every_year') || 'Yearly';
            default: return '';
        }
    };

    const handleEventPress = (event: any) => {
        if (event.isHoliday) {
            router.push({ pathname: '/viewEvent', params: { title: event.title, description: event.description || '', startTime: event.startTime || '12:00 PM', endTime: event.endTime || '01:00 PM', startDate: event.startDate || event.date, endDate: event.endDate || event.date, color: event.color || (event.isHoliday ? '#FF6B6B' : '#0267FF'), isHoliday: String(event.isHoliday || false), country: event.country || '', alert: 'All-day' } });
            return;
        }

        router.push({
            pathname: '/viewEvent',
            params: {
                eventId: event.id,
                title: event.title || '',
                description: event.description || '',
                startDate: event.startDate || event.date,
                endDate: event.endDate || event.date,
                startTime: event.startTime || '12:00 PM',
                endTime: event.endTime || '01:00 PM',
                allDay: String(event.allDay || false),
                repeat: event.repeat || 'does_not',
                reminders: JSON.stringify(event.reminders || ['at_time']),
                color: event.color || '#0267FF',
                isHoliday: String(event.isHoliday || false),
                country: event.country || '',
            }
        });
    };

    // ── Render data ───────────────────────────────────────────────────────────
    const weekDays = getWeekDays();
    const todayStr = getLocalDateString();
    const selectedEvents = getEventsForDate(selectedDate);
    // Compute prev/next week start dates for the 3-slot strip
    const prevWeekStart = new Date(currentWeekStart);
    prevWeekStart.setDate(currentWeekStart.getDate() - 7);
    const nextWeekStart = new Date(currentWeekStart);
    nextWeekStart.setDate(currentWeekStart.getDate() + 7);

    const threeWeeks = [
        getWeekDaysFrom(prevWeekStart),
        getWeekDaysFrom(currentWeekStart),
        getWeekDaysFrom(nextWeekStart),
    ];

    const EventCard = ({ event }: { event: any }) => (
        <TouchableOpacity
            style={[styles.eventCard, { backgroundColor: isDark ? '#1C1C2E' : '#F5F5F8' }]}
            onPress={() => handleEventPress(event)}
            activeOpacity={0.75}
        >
            <View style={[styles.eventColorBar, { backgroundColor: event.isHoliday ? '#FF6B6B' : event.color || colors.primary }]} />
            <View style={styles.eventCardContent}>
                <View style={styles.eventCardRow}>
                    <Text style={[styles.eventTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {event.title}
                    </Text>
                    {getRepeatText(event.repeat) ? (
                        <Text style={[styles.repeatBadge, { color: colors.textTertiary }]}>
                            {getRepeatText(event.repeat)}
                        </Text>
                    ) : null}
                </View>
                <Text style={[styles.eventTime, { color: colors.textSecondary }]} numberOfLines={1}>
                    {formatEventTime(event)}
                </Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.textTertiary} style={{ marginRight: 12 }} />
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>

            {/* ── Header ── */}
            <View style={[styles.design, { backgroundColor: colors.cardBackground }]}>
                <View style={[styles.header]}>
                    <View style={styles.leftContainer}>
                        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={styles.backButton}>
                            <Feather name="menu" size={26} color={colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{selectedYear}</Text>
                    </View>
                    <View style={styles.rightIcons}>
                        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/search')}>
                            <Feather name="search" size={22} color={isDark ? colors.white : colors.textPrimary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.todayDateBox}
                            onPress={() => {
                                const today = new Date();
                                const diff = ((today.getDay() - firstDayOfWeek) + 7) % 7;
                                const start = new Date(today);
                                start.setDate(today.getDate() - diff);
                                start.setHours(0, 0, 0, 0);
                                setCurrentWeekStart(start);
                                setSelectedDate(getLocalDateString(today));
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.dateText, { color: colors.textPrimary }]}>
                                {String(new Date().getDate()).padStart(2, '0')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Month + Nav ── */}
                <View style={[styles.monthNavRow]}>
                    <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
                        {formatMonthYear(currentWeekStart)}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={goToPrevWeek} style={styles.navBtn}>
                            <Feather name="chevron-left" size={22} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={goToNextWeek} style={styles.navBtn}>
                            <Feather name="chevron-right" size={22} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Top divider ── */}
                <View style={[styles.weekStripContainer]} {...panResponder.panHandlers}>
                    <Animated.View
                        style={{
                            flexDirection: 'row',
                            width: SCREEN_WIDTH * 3,
                            transform: [{ translateX: weekStripX }],
                        }}
                    >
                        {threeWeeks.map((slotDays, slotIdx) => (
                            <View
                                key={slotIdx}
                                style={[styles.weekStrip, { width: SCREEN_WIDTH, backgroundColor: colors.background }]}
                            >
                                {slotDays.map((date, index) => {
                                    const dateStr = getLocalDateString(date);
                                    const isToday = dateStr === todayStr;
                                    const isSelected = dateStr === selectedDate;
                                    const hasEvents = dayHasEvents(date);

                                    const bgColor = isSelected ? colors.primary
                                        : isToday ? colors.primary + '30'
                                            : 'transparent';
                                    const textColor = isSelected ? '#FFFFFF'
                                        : isToday ? colors.primary
                                            : colors.textPrimary;
                                    const dayLabelColor = isSelected ? colors.primary
                                        : isToday ? colors.primary
                                            : colors.textSecondary;

                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.dayCell}
                                            onPress={() => setSelectedDate(dateStr)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[
                                                styles.dayCellInner,
                                                { backgroundColor: bgColor }
                                            ]}>
                                                <Text style={[styles.dayNameText, { color: textColor }]}>
                                                    {/* {date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()} */}
                                                    {t(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()]).substring(0, 3).toUpperCase()}
                                                </Text>
                                                <Text style={[
                                                    styles.dateCellNumber,
                                                    { color: textColor, fontWeight: isToday || isSelected ? '800' : '600' }
                                                ]}>
                                                    {date.getDate()}
                                                </Text>
                                                <View style={[styles.eventDot, {
                                                    backgroundColor: hasEvents
                                                        ? (isSelected ? colors.white : colors.primary + '80')
                                                        : 'transparent'
                                                }]} />
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        ))}
                    </Animated.View>
                </View>
            </View>

            {/* ── Divider below strip ── */}
            <ScrollView
                style={styles.eventsList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
            >
                {/* Selected day heading */}
                <Text style={[styles.selectedDayLabel, { color: colors.primary }]}>
                    {formatDayHeading(selectedDate)}
                </Text>

                {selectedEvents.length === 0 ? (
                    <View style={{ alignItems: "center", paddingVertical: 40 }}>
                        <Image
                            // source={theme === "dark" ? darkNoEventImg : lightNoEventImg}
                            source={resolvedTheme === "dark" ? darkNoEventImg : lightNoEventImg} // 👈
                            style={{ width: 200, height: 200, marginBottom: 0 }}
                            resizeMode="contain"
                        />
                        <Text
                            style={[
                                styles.noDataText,
                                { color: colors.textTertiary, fontSize: 16 }
                            ]}
                        >
                            {t("no_event_yet")}
                        </Text>
                    </View>
                ) : (
                    selectedEvents.map((event, idx) => <EventCard key={`s-${event.id}-${idx}`} event={event} />)
                )}
            </ScrollView>

            {/* ── FAB ── */}
            {/* <View style={{ position: "absolute", right: 30, bottom: 170 }}>
                <Animated.View
                    style={[
                        styles.pulseRing,
                        pulseStyle,
                        { backgroundColor: colors.primary },
                    ]}
                />
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: colors.primary }]}
                    onPress={() => {
                        const dateToPass = selectedDate || getLocalDateString();
                        router.push({
                            pathname: "/addEvent",
                            params: {
                                selectedDate: dateToPass
                            }
                        });
                    }}
                    activeOpacity={0.8}
                >
                    <Text style={styles.fabText}>+</Text>
                </TouchableOpacity>
            </View> */}

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
                    onPress={() => {
                        const dateToPass = selectedDate || getLocalDateString();
                        router.push({
                            pathname: "/addEvent",
                            params: {
                                selectedDate: dateToPass
                            }
                        });
                    }}
                    activeOpacity={0.8}
                >
                    <Text style={styles.fabText}>+</Text>
                </TouchableOpacity>
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12, paddingTop: 60,
    },
    leftContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    backButton: { padding: 4, marginRight: 10 },
    headerTitle: { fontSize: 18, fontWeight: '600' },
    rightIcons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconButton: { padding: 4 },
    todayDateBox: {
        borderColor: '#FF5252', borderTopWidth: 5,
        borderLeftWidth: 2, borderRightWidth: 2, borderBottomWidth: 2,
        borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
    },
    dateText: { fontSize: 16, fontWeight: 'bold' },
    monthNavRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 6,
    },
    navBtn: { padding: 10 },
    monthTitle: { fontSize: 16, fontWeight: '700' },

    weekStripContainer: {
        marginVertical: 8,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    design: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    weekStrip: { flexDirection: 'row', paddingHorizontal: 4, paddingBottom: 10, paddingTop: 6 },
    dayCell: { flex: 1, alignItems: 'center', gap: 4 },
    dayNameText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },
    dayCellInner: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 12,
        minWidth: 40,
        gap: 6,
    },

    dateCellNumber: { fontSize: 15 },
    eventDot: { width: 5, height: 5, borderRadius: 2.5 },
    divider: { height: 1 },
    eventsList: { flex: 1, paddingHorizontal: 16 },
    selectedDayLabel: { fontSize: 13, fontWeight: '700', marginTop: 16, marginBottom: 10, letterSpacing: 0.3 },
    otherDayLabel: { fontSize: 13, fontWeight: '600', marginTop: 22, marginBottom: 10, letterSpacing: 0.3 },
    eventCard: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 10, marginBottom: 10, minHeight: 62, overflow: 'hidden',
    },
    eventColorBar: { width: 4, alignSelf: 'stretch' },
    eventCardContent: { flex: 1, paddingVertical: 12, paddingHorizontal: 12 },
    eventCardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
    eventTitle: { fontSize: 15, fontWeight: '600', flex: 1 },
    repeatBadge: { fontSize: 11, fontWeight: '500', marginLeft: 6 },
    eventTime: { fontSize: 12 },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
    emptyText: { fontSize: 14 },
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
    fabText: {
        fontSize: 40,
        color: '#FFFFFF',
        fontWeight: '300',
    },
    noDataText: {
        textAlign: 'center',
        fontSize: 16,
        marginTop: 0,
    },
    pulseRing: {
        position: "absolute",
        width: 56,
        height: 56,
        borderRadius: 28,
    },
});