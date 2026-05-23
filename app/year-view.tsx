import AdsManager from "@/services/adsManager";
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerActions } from '@react-navigation/native';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Dimensions, PanResponder, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useScreenTracking } from '../hooks/useScreenTracking';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SELECTED_YEAR_KEY = 'selectedYear';

export default function YearView() {
    const router = useRouter();
    const { colors, theme } = useTheme();
    const navigation = useNavigation();
    const { i18n } = useTranslation();
    const { t } = useTranslation();
    const params = useLocalSearchParams();
    const [firstDayOfWeek, setFirstDayOfWeek] = useState(0);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [refreshKey, setRefreshKey] = useState(0);
    const [isInitialized, setIsInitialized] = useState(false);
    const currentYear = new Date().getFullYear();
    const SWIPE_THRESHOLD = 60;
    useScreenTracking('year_screen');
    const [bannerConfig, setBannerConfig] = useState<{
        show: boolean;
        id: string;
        position: string;
    } | null>(null);

    const viewScale = useRef(new Animated.Value(1)).current;
    const viewOpacity = useRef(new Animated.Value(1)).current;

    const formatDate = (d) => (d < 10 ? `0${d}` : d);

    useEffect(() => {
        const config = AdsManager.getBannerConfig('setting');
        setBannerConfig(config);
    }, []);

    const getMonths = (lang) => {
        const localeMap = {
            'hi': 'hi-IN',
            'en': 'en-US',
            'es': 'es-ES',
            'de': 'de-DE',
            'fr': 'fr-FR',
            'ko': 'ko-KR',
            'it': 'it-IT',
            'ru': 'ru-RU',
            'zh': 'zh-ZH',
            'id': 'id-ID',
            'pt': 'pt-PT',
        };

        const locale = localeMap[lang] || 'en-US';

        return Array.from({ length: 12 }, (_, i) =>
            new Date(2024, i, 1).toLocaleString(locale, { month: 'long' })
        );
    };

    const months = getMonths(i18n.language);
    const currentMonth = new Date().getMonth();
    const currentDate = new Date().getDate();
    const pulseAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const config = AdsManager.getBannerConfig('home');
        setBannerConfig(config);
    }, []);

    useEffect(() => {
        const initializeScreen = async () => {
            await loadFirstDay();
            await loadSavedYear();
            setIsInitialized(true);
        };
        initializeScreen();
    }, []);

    const loadSavedYear = async () => {
        try {
            const savedYear = await AsyncStorage.getItem(SELECTED_YEAR_KEY);
            if (savedYear) {
                const year = parseInt(savedYear);
                console.log('📅 Loading saved year:', year);
                setSelectedYear(year);
            } else {
                console.log('📅 No saved year, using current:', currentYear);
            }
        } catch (error) {
            console.log('Error loading saved year:', error);
        }
    };

    const saveYear = async (year: number) => {
        try {
            await AsyncStorage.setItem(SELECTED_YEAR_KEY, year.toString());
            console.log('💾 Saved year:', year);
        } catch (error) {
            console.log('Error saving year:', error);
        }
    };

    // useFocusEffect(
    //     useCallback(() => {
    //         if (params.resetYear === 'true') {
    //             console.log('🔄 Reset year requested via params');
    //             const currentYear = new Date().getFullYear();
    //             setSelectedYear(currentYear);
    //             saveYear(currentYear);
    //         }
    //     }, [params.resetYear])
    // );

    useFocusEffect(
        useCallback(() => {
            loadFirstDay();

            Animated.parallel([
                Animated.timing(viewScale, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(viewOpacity, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                })
            ]).start();

            if (params.resetYear === 'true') {
                const currentYear = new Date().getFullYear();
                setSelectedYear(currentYear);
                saveYear(currentYear);
            }
        }, [params.resetYear])
    );

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

    const loadFirstDay = async () => {
        try {
            const day = await AsyncStorage.getItem('firstDayOfWeek');
            if (day) {
                const newFirstDay = parseInt(day);
                setFirstDayOfWeek(newFirstDay);
                setRefreshKey(prev => prev + 1);
            }
        } catch (error) {
            console.log('Error loading first day:', error);
        }
    };

    const animateOutAndNavigate = (navigateCallback: () => void) => {
        Animated.parallel([
            Animated.timing(viewScale, {
                toValue: 0.85, // Scale down (Zoom out effect)
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(viewOpacity, {
                toValue: 0, // Fade out completely
                duration: 250,
                useNativeDriver: true,
            })
        ]).start(() => {
            navigateCallback(); // Navigation starts after animation ends
        });
    };

    const getDaysInMonth = (month: number, year: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (month: number, year: number) => {
        return new Date(year, month, 1).getDay();
    };

    const handleDateBoxPress = async () => {
        const currentYear = new Date().getFullYear();
        console.log('Resetting to current year:', currentYear);

        setSelectedYear(currentYear);
        await saveYear(currentYear);
    };

    const handleYearChange = async (newYear: number) => {
        console.log('Changing year to:', newYear);
        setSelectedYear(newYear);
        await saveYear(newYear);
    };

    const handleMonthPress = (monthIndex: number) => {
        console.log(`Navigating to month ${monthIndex + 1} with Zoom Out`);
        const targetDate = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-01`;

        animateOutAndNavigate(() => {
            router.push({
                pathname: '/',
                params: {
                    refresh: Date.now().toString(),
                    navigateToMonth: 'true',
                    targetDate: targetDate,
                    targetYear: selectedYear.toString(),
                    targetMonth: (monthIndex + 1).toString()
                }
            });
        });
    };

    const handleDatePress = (monthIndex: number, day: number) => {
        console.log(`Navigating to date with Zoom Out`);
        const targetDate = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        animateOutAndNavigate(() => {
            router.push({
                pathname: '/',
                params: {
                    refresh: Date.now().toString(),
                    navigateToDate: 'true',
                    targetDate: targetDate,
                    targetYear: selectedYear.toString(),
                    targetMonth: (monthIndex + 1).toString()
                }
            });
        });
    };

    const panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => {
            const isHorizontal = Math.abs(gesture.dx) > Math.abs(gesture.dy);
            const hasMovement = Math.abs(gesture.dx) > 10;
            return isHorizontal && hasMovement;
        },

        onPanResponderMove: () => {
        },

        onPanResponderRelease: (_, gesture) => {
            const velocity = gesture.vx;
            const movement = gesture.dx;

            if (movement > SWIPE_THRESHOLD || velocity > 0.4) {
                handleYearChange(selectedYear - 1);
            } else if (movement < -SWIPE_THRESHOLD || velocity < -0.4) {
                handleYearChange(selectedYear + 1);
            }
        },
    });

    const getWeekDayHeaders = () => {
        const localeMap = {
            'hi': 'hi-IN',
            'en': 'en-US',
            'es': 'es-ES',
            'de': 'de-DE',
            'fr': 'fr-FR',
            'ko': 'ko-KR',
            'it': 'it-IT',
            'ru': 'ru-RU',
            'zh': 'zh-CN',
            'id': 'id-ID',
            'pt': 'pt-PT',
        };

        const locale = localeMap[i18n.language] || 'en-US';
        const baseDate = new Date(2024, 0, 7);
        const shortDays = [];
        const fullDays = [];

        for (let i = 0; i < 7; i++) {
            const date = new Date(baseDate);
            date.setDate(baseDate.getDate() + i);

            shortDays.push(
                date.toLocaleDateString(locale, { weekday: 'narrow' })
            );
            fullDays.push(
                date.toLocaleDateString(locale, { weekday: 'long' })
            );
        }
        return {
            short: [...shortDays.slice(firstDayOfWeek), ...shortDays.slice(0, firstDayOfWeek)],
            full: [...fullDays.slice(firstDayOfWeek), ...fullDays.slice(0, firstDayOfWeek)],
        };
    };

    const getBeamColors = (color: string) => {
        // Hex color ko RGB mein convert karke light/dark variants banao
        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        const lighten = (v: number) => Math.min(255, Math.round(v + (255 - v) * 0.55));
        const darken = (v: number) => Math.round(v * 0.45);

        const toHex = (rv: number, gv: number, bv: number) =>
            `#${rv.toString(16).padStart(2, '0')}${gv.toString(16).padStart(2, '0')}${bv.toString(16).padStart(2, '0')}`;

        return {
            light: toHex(lighten(r), lighten(g), lighten(b)),
            primary: color,
            dark: toHex(darken(r), darken(g), darken(b)),
        };
    };

    const CardBorderBeam = React.memo(({ color }: { color: string }) => {
        const anim = useRef(new Animated.Value(0)).current;
        const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
        const loopRef = useRef<Animated.CompositeAnimation | null>(null);

        useEffect(() => {
            if (!dims) return;
            const { w, h } = dims;
            const P = 2 * (w + h);
            anim.setValue(0);
            loopRef.current = Animated.loop(
                Animated.timing(anim, {
                    toValue: P,
                    duration: 2600,
                    useNativeDriver: true,
                })
            );
            loopRef.current.start();
            return () => loopRef.current?.stop();
        }, [dims?.w, dims?.h]);

        const BEAM = 55;
        const THICK = 2;
        const R = 10;

        return (
            <View
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
                onLayout={(e) => {
                    const { width, height } = e.nativeEvent.layout;
                    if (width > 0 && height > 0) setDims({ w: width, h: height });
                }}
            >
                {dims && (() => {
                    const { w, h } = dims;
                    const P = 2 * (w + h);
                    // Top: beam travels left → right
                    const topX = anim.interpolate({
                        inputRange: [0, w + BEAM],
                        outputRange: [-BEAM, w],
                        extrapolate: 'clamp',
                    });
                    // Right: beam travels top → bottom
                    const rightY = anim.interpolate({
                        inputRange: [w, w + h + BEAM],
                        outputRange: [-BEAM, h],
                        extrapolate: 'clamp',
                    });
                    // Bottom: beam travels right → left
                    const bottomX = anim.interpolate({
                        inputRange: [w + h, 2 * w + h + BEAM],
                        outputRange: [w, -BEAM],
                        extrapolate: 'clamp',
                    });
                    // Left: beam travels bottom → top
                    const leftY = anim.interpolate({
                        inputRange: [2 * w + h, 2 * (w + h) + BEAM],
                        outputRange: [h, -BEAM],
                        extrapolate: 'clamp',
                    });

                    return (
                        <>
                            {/* ── BEAM 1 ── */}
                            {/* Top */}
                            <View style={{ overflow: 'hidden', position: 'absolute', top: 0, left: R, right: R, height: THICK }}>
                                <Animated.View style={{ position: 'absolute', width: BEAM, height: THICK, backgroundColor: color, transform: [{ translateX: topX }] }} />
                            </View>
                            {/* Right */}
                            <View style={{ overflow: 'hidden', position: 'absolute', top: R, bottom: R, right: 0, width: THICK }}>
                                <Animated.View style={{ position: 'absolute', width: THICK, height: BEAM, backgroundColor: color, transform: [{ translateY: rightY }] }} />
                            </View>
                            {/* Bottom */}
                            <View style={{ overflow: 'hidden', position: 'absolute', bottom: 0, left: R, right: R, height: THICK }}>
                                <Animated.View style={{ position: 'absolute', width: BEAM, height: THICK, backgroundColor: color, transform: [{ translateX: bottomX }] }} />
                            </View>
                            {/* Left */}
                            <View style={{ overflow: 'hidden', position: 'absolute', top: R, bottom: R, left: 0, width: THICK }}>
                                <Animated.View style={{ position: 'absolute', width: THICK, height: BEAM, backgroundColor: color, transform: [{ translateY: leftY }] }} />
                            </View>

                            {/* ── BEAM 2 (half perimeter offset) ── */}
                            {/* Top */}
                            <View style={{ overflow: 'hidden', position: 'absolute', top: 0, left: R, right: R, height: THICK }}>
                                <Animated.View style={{ position: 'absolute', width: BEAM, height: THICK, backgroundColor: color, transform: [{ translateX: anim.interpolate({ inputRange: [P / 2, P / 2 + w + BEAM], outputRange: [-BEAM, w], extrapolate: 'clamp' }) }] }} />
                            </View>
                            {/* Right */}
                            <View style={{ overflow: 'hidden', position: 'absolute', top: R, bottom: R, right: 0, width: THICK }}>
                                <Animated.View style={{ position: 'absolute', width: THICK, height: BEAM, backgroundColor: color, transform: [{ translateY: anim.interpolate({ inputRange: [P / 2 + w, P / 2 + w + h + BEAM], outputRange: [-BEAM, h], extrapolate: 'clamp' }) }] }} />
                            </View>
                            {/* Bottom */}
                            <View style={{ overflow: 'hidden', position: 'absolute', bottom: 0, left: R, right: R, height: THICK }}>
                                <Animated.View style={{ position: 'absolute', width: BEAM, height: THICK, backgroundColor: color, transform: [{ translateX: anim.interpolate({ inputRange: [P / 2 + w + h, P / 2 + 2 * w + h + BEAM], outputRange: [w, -BEAM], extrapolate: 'clamp' }) }] }} />
                            </View>
                            {/* Left */}
                            <View style={{ overflow: 'hidden', position: 'absolute', top: R, bottom: R, left: 0, width: THICK }}>
                                <Animated.View style={{ position: 'absolute', width: THICK, height: BEAM, backgroundColor: color, transform: [{ translateY: anim.interpolate({ inputRange: [P / 2 + 2 * w + h, P / 2 + 2 * (w + h) + BEAM], outputRange: [h, -BEAM], extrapolate: 'clamp' }) }] }} />
                            </View>
                        </>
                    );
                })()}
            </View>
        );
    });

    const renderMonthCalendar = (monthIndex: number) => {
        const daysInMonth = getDaysInMonth(monthIndex, selectedYear);
        const firstDay = getFirstDayOfMonth(monthIndex, selectedYear);
        const days = [];
        const weekDays = getWeekDayHeaders();
        const headers = weekDays.short.map((day, index) => {
            const originalDayIndex = (index + firstDayOfWeek) % 7;
            const isSunday = originalDayIndex === 0;

            return (
                <View key={`header-${monthIndex}-${index}-${refreshKey}`} style={styles.dayHeader}>
                    <Text style={[
                        styles.dayHeaderText,
                        { color: colors.textSecondary },
                        isSunday && { color: colors.primary }
                    ]}>
                        {day}
                    </Text>
                </View>
            );
        });

        const adjustedFirstDay = (firstDay - firstDayOfWeek + 7) % 7;

        for (let i = 0; i < adjustedFirstDay; i++) {
            days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(selectedYear, monthIndex, day);
            const dayOfWeek = date.getDay();
            const isSunday = dayOfWeek === 0;
            const isToday = selectedYear === currentYear && monthIndex === currentMonth && day === currentDate;

            days.push(
                <TouchableOpacity
                    key={day}
                    style={[
                        styles.dayCell,
                        isToday && { backgroundColor: colors.primary, borderRadius: 50 }
                    ]}
                    onPress={() => handleDatePress(monthIndex, day)}
                    activeOpacity={0.7}
                >
                    <Text
                        style={[
                            styles.dayText,
                            { color: colors.textPrimary },
                            isSunday && { color: colors.primary, fontWeight: '600' },
                            isToday && { color: '#fff', fontWeight: 'bold' }
                        ]}>
                        {day}
                    </Text>
                </TouchableOpacity>
            );
        }

        return (
            <TouchableOpacity
                key={monthIndex}
                style={[
                    styles.monthCard,
                    { backgroundColor: colors.background },
                    selectedYear === currentYear && monthIndex === currentMonth && styles.currentMonthCard
                ]}
                onPress={() => handleMonthPress(monthIndex)}
                activeOpacity={0.8}
            >
                {selectedYear === currentYear && monthIndex === currentMonth && (
                    <CardBorderBeam color={colors.primary} />
                )}

                <Text
                    style={[
                        styles.monthName,
                        {
                            color:
                                selectedYear === currentYear && monthIndex === currentMonth
                                    ? '#FF4A4A'
                                    : colors.textPrimary,
                        },
                    ]}
                >
                    {months[monthIndex].slice(0, 3)}
                </Text>
                <View style={[styles.monthDivider, { backgroundColor: colors.border }]} />

                <View style={styles.calendar}>
                    <View style={styles.weekRow}>{headers}</View>
                    <View style={styles.daysGrid}>{days}</View>
                </View>
            </TouchableOpacity>
        );
    };

    if (!isInitialized) {
        return <View style={[styles.container, { backgroundColor: colors.background }]} />;
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.background }]}>
                <View style={styles.leftContainer}>
                    <TouchableOpacity
                        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
                        style={styles.backButton}
                    >
                        <Feather name="menu" size={26} color={colors.textPrimary} />
                    </TouchableOpacity>

                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                        {selectedYear}
                    </Text>
                </View>

                <View style={styles.rightIcons}>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => router.push('/search')}
                    >
                        <Feather
                            name="search"
                            size={22}
                            color={theme === 'dark' ? colors.white : colors.textPrimary}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.dateBox]}
                        onPress={handleDateBoxPress}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.dateText, { color: colors.textPrimary }]}>
                            {formatDate(new Date().getDate())}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={{ flex: 1 }} {...panResponder.panHandlers}>
                <Animated.View
                    style={{
                        flex: 1,
                        transform: [{ scale: viewScale }],
                        opacity: viewOpacity
                    }}
                >
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        {months.map((month, index) => renderMonthCalendar(index))}
                    </ScrollView>
                </Animated.View>
            </View>
            <View style={{ position: "absolute", right: 16, bottom: 80 }}>
                <Animated.View
                    style={[
                        styles.pulseRing,
                        pulseStyle,
                        { backgroundColor: colors.primary },
                    ]}
                />
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: colors.primary }]}
                    onPress={() => router.push("/addEvent")}
                    activeOpacity={0.8}
                >
                    <Text style={styles.fabText}>+</Text>
                </TouchableOpacity>
            </View>
        </View>
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: 60,
    },
    backButton: {
        padding: 4,
        marginRight: 10,
    },
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
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    fabText: {
        fontSize: 40,
        color: '#FFFFFF',
        fontWeight: '300',
    },
    menuButton: {
        padding: 8,
    },
    rightIcons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    stickyAdContainer: {
        bottom: 20,
        width: '100%',
        alignItems: 'center',
    },
    monthDivider: {
        height: 1,
        marginBottom: 8,
        width: '40%',
        alignSelf: 'center',
        opacity: 0.5,
    },
    yearText: {
        fontSize: 20,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
        marginRight: 160,
    },
    dateText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    dateBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderColor: '#FF5252',
        borderTopWidth: 5,
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderBottomWidth: 2,
        borderRadius: 8,
        paddingHorizontal: 5,
        paddingVertical: 2,
        gap: 6,
    },
    menuIcon: {
        fontSize: 24,
        marginTop: 5,
    },
    iconButton: {
        padding: 4,
    },
    backIcon: {
        fontSize: 24,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    placeholder: {
        width: 40,
    },
    content: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        padding: 12,
    },
    monthName: {
        fontSize: 15,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 12,
    },
    currentMonthName: {},
    weekRow: {
        flexDirection: 'row',
        marginBottom: 8,
        color: "#fff",
    },
    dayHeader: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 4,
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    todayText: {
        fontWeight: 'bold',
    },
    monthCard: {
        width: '48%',
        marginBottom: 14,
        backgroundColor: 'transparent',
        borderRadius: 10,
        borderWidth: 0,
        padding: 10,
        shadowColor: '#626161',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    monthHeader: {
        backgroundColor: '#1A1A1A',
        paddingVertical: 10,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    monthHeaderText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#fff',
    },
    dayCell: {
        width: '14.28%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayText: {
        fontSize: 11,
        color: '#DADADA',
    },
    dayHeaderText: {
        fontSize: 11,
        color: '#858585',
        fontWeight: '600',
    },
    todayCircle: {
        backgroundColor: '#FF4A4A',
        width: 28,
        height: 28,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    calendar: {
        gap: 2,
    },
    currentMonthCard: {
        // borderColor: '#FF4A4A',
        // borderRadius: 5,
        // borderWidth: 2,
    },
});