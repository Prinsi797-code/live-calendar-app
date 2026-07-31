import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import * as FileSystem from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import { useTranslation } from "react-i18next";
import { Alert, Dimensions, Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';
import PurchaseManager from '../services/purchaseManager';
import { getAllMoodEntries, MOOD_OPTIONS } from '../utils/moodStorage';

const MOOD_FAB_VISIBLE_KEY = 'moodFabVisible';

const MOOD_SCORE: Record<string, number> = {
    awful: 0,
    bad: 1,
    poor: 2,
    neutral: 3,
    good: 4,
    great: 5,
    excellent: 6,
};
const MOOD_MAX_SCORE = 6;

const MOOD_COLOR: Record<string, string> = {
    awful: '#EF4444',
    bad: '#F97316',
    poor: '#F59E0B',
    neutral: '#9CA3AF',
    good: '#84CC16',
    great: '#22C55E',
    excellent: '#10B981',
};
const scoreOf = (moodKey?: string | null) =>
    moodKey && MOOD_SCORE[moodKey] !== undefined ? MOOD_SCORE[moodKey] : 0;
const colorOf = (moodKey?: string | null, fallback = '#D1D5DB') =>
    moodKey && MOOD_COLOR[moodKey] ? MOOD_COLOR[moodKey] : fallback;

const findMoodImage = (moodKey: string) =>
    MOOD_OPTIONS.find((m: any) => m.key === moodKey)?.image;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type DayCell = {
    dateStr: string;
    dayNum: number;
    inMonth: boolean;
    isToday: boolean;
    mood: string | null;
};

// const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const MONTH_KEYS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_KEYS_MON_FIRST = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WEEKDAY_KEYS_SUN_FIRST = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];



function buildMonthGrid(monthDate: Date, moodMap: Record<string, any>): DayCell[] {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - startOffset);

    const today = new Date();
    const cells: DayCell[] = [];
    for (let i = 0; i < 42; i++) {
        const d = new Date(gridStart);
        d.setDate(gridStart.getDate() + i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        cells.push({
            dateStr,
            dayNum: d.getDate(),
            inMonth: d.getMonth() === month,
            isToday: d.toDateString() === today.toDateString(),
            mood: moodMap[dateStr]?.mood ?? null,
        });
    }
    while (cells.length > 35 && cells.slice(-7).every((c) => !c.inMonth)) {
        cells.splice(cells.length - 7, 7);
    }
    return cells;
}

function getWeekRange(anchor: Date, dowLabels: string[]): { dateStr: string; label: string }[] {
    const dayOfWeek = anchor.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(anchor);
    monday.setDate(anchor.getDate() + diffToMonday);
    const out = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        out.push({ dateStr: `${yyyy}-${mm}-${dd}`, label: dowLabels[i] });
    }
    return out;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_HEIGHT = 170;
const LEGEND_WIDTH = 78;
const CHART_AREA_WIDTH = SCREEN_WIDTH - 40 - 32 - LEGEND_WIDTH - 12;
const MONTH_POINT_SPACING = 42;
const DONUT_SIZE = 160;
const DONUT_STROKE = 26;
const DONUT_RADIUS = (DONUT_SIZE - DONUT_STROKE) / 2;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

function csvEscape(value: string): string {
    if (value == null) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

export default function MoodCalendar() {
    const router = useRouter();
    const { colors } = useTheme();

    const [monthDate, setMonthDate] = useState(new Date());
    const [moodMap, setMoodMap] = useState<Record<string, any>>({});
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const [chartViewMode, setChartViewMode] = useState<'week' | 'month'>('week');
    const [chartRangeAnchor, setChartRangeAnchor] = useState(new Date());

    const [donutViewMode, setDonutViewMode] = useState<'week' | 'month'>('week');
    const [donutRangeAnchor, setDonutRangeAnchor] = useState(new Date());
    const { t } = useTranslation();
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [moodFabVisible, setMoodFabVisible] = useState(true);
    const [exporting, setExporting] = useState(false);

    const DOW = WEEKDAY_KEYS_MON_FIRST.map((key) => t(key).charAt(0));

    useFocusEffect(
        React.useCallback(() => {
            (async () => {
                const all = await getAllMoodEntries();
                setMoodMap(all);
                try {
                    const val = await AsyncStorage.getItem(MOOD_FAB_VISIBLE_KEY);
                    setMoodFabVisible(val !== 'false');
                } catch (e) { }
            })();
        }, [])
    );

    const handleDayPress = async (cell: DayCell) => {
        setSelectedDate(cell.dateStr);

        const isPremium = await PurchaseManager.isPremium();
        if (!isPremium) {
            router.push('/PremiumScreen');
            return;
        }

        if (cell.mood) {
            router.push({
                pathname: '/moodPicker',
                params: { date: cell.dateStr, mode: 'edit' },
            });
        } else {
            router.push({
                pathname: '/moodPicker',
                params: { date: cell.dateStr },
            });
        }
    };

    const toggleMoodFab = async (val: boolean) => {
        setMoodFabVisible(val);
        try {
            await AsyncStorage.setItem(MOOD_FAB_VISIBLE_KEY, val ? 'true' : 'false');
        } catch (e) { }
    };

    const handleExport = async () => {
        try {
            setExporting(true);
            const rows = Object.entries(moodMap).sort((a, b) => (a[0] < b[0] ? -1 : 1));

            let csv = 'Time,Mood,Feel,Note\n';
            rows.forEach(([dateStr, entry]: [string, any]) => {
                const moodLabel = MOOD_OPTIONS.find((m: any) => m.key === entry?.mood)?.label ?? entry?.mood ?? '';
                const feel = Array.isArray(entry?.tags) ? entry.tags.join(' | ') : '';
                const note = entry?.reason ?? '';
                csv += `${csvEscape(dateStr)},${csvEscape(moodLabel)},${csvEscape(feel)},${csvEscape(note)}\n`;
            });

            const fileUri = FileSystem.documentDirectory + 'mood_export.csv';
            await FileSystem.writeAsStringAsync(fileUri, csv, {
                encoding: FileSystem.EncodingType.UTF8,
            });

            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(fileUri, {
                    mimeType: 'text/csv',
                    dialogTitle: 'Export Mood Data',
                    UTI: 'public.comma-separated-values-text',
                });
            } else {
                Alert.alert('Export complete', `File saved at: ${fileUri}`);
            }
        } catch (e) {
            console.log('Export error:', e);
            Alert.alert('Export failed', 'Something went wrong while exporting your data.');
        } finally {
            setExporting(false);
            setSettingsVisible(false);
        }
    };

    const monthCells = buildMonthGrid(monthDate, moodMap);
    const monthLabel = `${t(MONTH_KEYS[monthDate.getMonth()]).substring(0, 3)} ${monthDate.getFullYear()}`;

    const changeMonth = (delta: number) => {
        const d = new Date(monthDate);
        d.setMonth(d.getMonth() + delta);
        setMonthDate(d);
    };

    const graphDays =
        chartViewMode === 'week'
            ? getWeekRange(chartRangeAnchor, DOW)
            : buildMonthGrid(chartRangeAnchor, moodMap)
                .filter((c) => c.inMonth)
                .map((c) => ({ dateStr: c.dateStr, label: String(c.dayNum) }));

    const rangeLabel =
        chartViewMode === 'week'
            ? `${graphDays[0]?.dateStr.slice(5).replace('-', '.')}-${graphDays[6]?.dateStr.slice(8)}`
            : `${t(MONTH_KEYS[chartRangeAnchor.getMonth()]).substring(0, 3)} ${chartRangeAnchor.getFullYear()}`;

    const shiftRange = (delta: number) => {
        const d = new Date(chartRangeAnchor);
        if (chartViewMode === 'week') d.setDate(d.getDate() + delta * 7);
        else d.setMonth(d.getMonth() + delta);
        setChartRangeAnchor(d);
    };

    const pointSpacing =
        chartViewMode === 'week' ? CHART_AREA_WIDTH / Math.max(graphDays.length - 1, 1) : MONTH_POINT_SPACING;
    const chartWidth =
        chartViewMode === 'week'
            ? CHART_AREA_WIDTH
            : Math.max(CHART_AREA_WIDTH, pointSpacing * (graphDays.length - 1) + 40);

    const scoreToTop = (score: number, hasMood: boolean) => {
        const topPad = 16;
        const bottomPad = 34;
        const usable = CHART_HEIGHT - topPad - bottomPad;
        if (!hasMood) return CHART_HEIGHT - bottomPad;
        const pct = score / MOOD_MAX_SCORE;
        return topPad + (1 - pct) * usable;
    };
    const donutGraphDays =
        donutViewMode === 'week'
            ? getWeekRange(donutRangeAnchor, DOW)
            : buildMonthGrid(donutRangeAnchor, moodMap)
                .filter((c) => c.inMonth)
                .map((c) => ({ dateStr: c.dateStr, label: String(c.dayNum) }));

    const donutRangeLabel =
        donutViewMode === 'week'
            ? `${donutGraphDays[0]?.dateStr.slice(5).replace('-', '.')}-${donutGraphDays[6]?.dateStr.slice(8)}`
            : `${t(MONTH_KEYS[donutRangeAnchor.getMonth()]).substring(0, 3)} ${donutRangeAnchor.getFullYear()}`;

    const shiftDonutRange = (delta: number) => {
        const d = new Date(donutRangeAnchor);
        if (donutViewMode === 'week') d.setDate(d.getDate() + delta * 7);
        else d.setMonth(d.getMonth() + delta);
        setDonutRangeAnchor(d);
    };

    const points = graphDays.map((day, idx) => {
        const entry = moodMap[day.dateStr];
        const score = scoreOf(entry?.mood);
        return {
            x: 20 + idx * pointSpacing,
            y: scoreToTop(score, !!entry?.mood),
            mood: entry?.mood ?? null,
            color: colorOf(entry?.mood, colors.border),
            label: day.label,
        };
    });

    const moodCounts: Record<string, number> = {};

    donutGraphDays.forEach((day) => {
        const mood = moodMap[day.dateStr]?.mood;
        if (mood) moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    });
    const totalMoodDays = Object.values(moodCounts).reduce((a, b) => a + b, 0);
    let donutOffset = 0;
    const donutSegments = Object.entries(moodCounts).map(([mood, count]) => {
        const pct = totalMoodDays ? (count / totalMoodDays) * 100 : 0;
        const arcLen = (pct / 100) * DONUT_CIRCUMFERENCE;
        const seg = {
            mood,
            count,
            pct,
            arcLen,
            offset: donutOffset,
            color: colorOf(mood),
            label: t(capitalize(mood)),
            // label: MOOD_OPTIONS.find((m: any) => m.key === mood)?.label ?? mood,
        };
        donutOffset += arcLen;
        return seg;
    });

    const segments = [];
    let lastMoodIdx = -1;
    for (let i = 0; i < points.length; i++) {
        if (!points[i].mood) continue;
        if (lastMoodIdx !== -1) {
            segments.push({
                id: `grad-${lastMoodIdx}-${i}`,
                x1: points[lastMoodIdx].x,
                y1: points[lastMoodIdx].y,
                x2: points[i].x,
                y2: points[i].y,
                colorStart: points[lastMoodIdx].color,
                colorEnd: points[i].color,
            });
        }
        lastMoodIdx = i;
    }

    const handleClose = () => {
        if (router.canGoBack()) {
            //   router.back();
            router.replace('/settings');
        } else {
            router.back();
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleClose}>
                    <Ionicons name="close" size={26} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('Moods')}</Text>
                <TouchableOpacity onPress={() => setSettingsVisible(true)}>
                    <Ionicons name="settings-outline" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Month calendar */}
                <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
                    <View style={styles.monthNavRow}>
                        <TouchableOpacity onPress={() => changeMonth(-1)}>
                            <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>{monthLabel}</Text>
                        <TouchableOpacity onPress={() => changeMonth(1)}>
                            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.dowRow}>
                        {DOW.map((d, i) => (
                            <Text key={i} style={[styles.dowText, { color: colors.textTertiary }]}>{d}</Text>
                        ))}
                    </View>

                    <View style={styles.grid}>
                        {monthCells.map((cell) => {
                            const isSelected = selectedDate === cell.dateStr;
                            return (
                                <TouchableOpacity
                                    key={cell.dateStr}
                                    style={styles.gridCell}
                                    onPress={() => handleDayPress(cell)}
                                    disabled={!cell.inMonth}
                                >
                                    <View
                                        style={[
                                            styles.dayCircle,
                                            isSelected && cell.mood ? { backgroundColor: colors.primary + '33' } : null,
                                            cell.isToday && !isSelected && { borderWidth: 1, borderColor: colors.primary },
                                        ]}
                                    >
                                        {cell.mood ? (
                                            <Image
                                                source={findMoodImage(cell.mood)}
                                                style={styles.dayMoodImage}
                                                contentFit="cover"
                                                cachePolicy="memory-disk"
                                                transition={0}
                                            />
                                        ) : (
                                            <Text
                                                style={[
                                                    styles.dayNumText,
                                                    { color: cell.inMonth ? colors.textPrimary : colors.textTertiary },
                                                ]}
                                            >
                                                {cell.dayNum}
                                            </Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Mood Chart */}
                <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
                    <View style={styles.chartHeaderRow}>
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('MoodChart')}</Text>
                        <View style={[styles.pillGroup, { backgroundColor: colors.background }]}>
                            <TouchableOpacity
                                style={[styles.pill, chartViewMode === 'week' && { backgroundColor: colors.primary }]}
                                onPress={() => setChartViewMode('week')}
                            >
                                <Text style={[styles.pillText, { color: chartViewMode === 'week' ? '#fff' : colors.textSecondary }]}>
                                    {t('Week')}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.pill, chartViewMode === 'month' && { backgroundColor: colors.primary }]}
                                onPress={() => setChartViewMode('month')}
                            >
                                <Text style={[styles.pillText, { color: chartViewMode === 'month' ? '#fff' : colors.textSecondary }]}>
                                    {t('Month')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.rangeNavRow}>
                        <TouchableOpacity onPress={() => shiftRange(-1)}>
                            <Ionicons name="chevron-back" size={20} color={colors.textTertiary} />
                        </TouchableOpacity>
                        <Text style={[styles.rangeLabel, { color: colors.textTertiary }]}>{rangeLabel}</Text>
                        <TouchableOpacity onPress={() => shiftRange(1)}>
                            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.chartRow}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            scrollEnabled={chartViewMode === 'month' || 'week'}
                            // scrollEnabled = {chartViewMode === 'week'}
                            style={{ width: CHART_AREA_WIDTH }}
                        >
                            <View style={{ width: chartWidth, height: CHART_HEIGHT }}>
                                <Svg width={chartWidth} height={CHART_HEIGHT} style={StyleSheet.absoluteFill}>
                                    <Defs>
                                        {segments.map((seg) => (
                                            <LinearGradient
                                                key={seg.id}
                                                id={seg.id}
                                                x1={seg.x1}
                                                y1={seg.y1}
                                                x2={seg.x2}
                                                y2={seg.y2}
                                                gradientUnits="userSpaceOnUse"
                                            >
                                                <Stop offset="0" stopColor={seg.colorStart} />
                                                <Stop offset="1" stopColor={seg.colorEnd} />
                                            </LinearGradient>
                                        ))}
                                    </Defs>
                                    {segments.map((seg) => (
                                        <Line
                                            key={seg.id}
                                            x1={seg.x1}
                                            y1={seg.y1}
                                            x2={seg.x2}
                                            y2={seg.y2}
                                            stroke={`url(#${seg.id})`}
                                            strokeWidth={3}
                                            strokeLinecap="round"
                                        />
                                    ))}
                                </Svg>

                                {points.map((p, idx) => (
                                    <View key={idx} style={{ position: 'absolute', left: p.x - 15, top: p.y - 15 }}>
                                        {p.mood ? (
                                            <View style={[styles.chartNode, { borderColor: p.color }]}>
                                                <Image
                                                    source={findMoodImage(p.mood)}
                                                    style={styles.chartMoodImage}
                                                    resizeMode="cover"
                                                />
                                            </View>
                                        ) : (
                                            <View
                                                style={[
                                                    styles.chartDotEmpty,
                                                    { backgroundColor: colors.border, marginTop: 11, marginLeft: 11 },
                                                ]}
                                            />
                                        )}
                                    </View>
                                ))}

                                {points.map((p, idx) => (
                                    <Text
                                        key={`label-${idx}`}
                                        style={[
                                            styles.chartDayLabel,
                                            { left: p.x - 15, top: CHART_HEIGHT - 18, color: colors.textTertiary },
                                        ]}
                                    >
                                        {p.label}
                                    </Text>
                                ))}
                            </View>
                        </ScrollView>

                        {/* Legend */}
                        <View style={styles.legendCol}>
                            {MOOD_OPTIONS.map((m: any) => (
                                <View key={m.key} style={styles.legendRow}>
                                    <Image source={m.image} style={styles.legendImage} />
                                    <Text
                                        style={[styles.legendText, { color: colors.textSecondary }]}
                                        numberOfLines={1}
                                    >
                                        {t(capitalize(m.key))}
                                        {/* {m.label ?? m.key} */}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Mood Distribution (donut) */}
                <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
                    <View style={styles.chartHeaderRow}>
                        <View style={[styles.pillGroup, { backgroundColor: colors.background }]}>
                            <TouchableOpacity
                                style={[styles.pill, donutViewMode === 'week' && { backgroundColor: colors.primary }]}
                                onPress={() => setDonutViewMode('week')}
                            >
                                <Text style={[styles.pillText, { color: donutViewMode === 'week' ? '#fff' : colors.textSecondary }]}>
                                    {t('Week')}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.pill, donutViewMode === 'month' && { backgroundColor: colors.primary }]}
                                onPress={() => setDonutViewMode('month')}
                            >
                                <Text style={[styles.pillText, { color: donutViewMode === 'month' ? '#fff' : colors.textSecondary }]}>
                                    {t('Month')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.rangeNavRow}>
                            <TouchableOpacity onPress={() => shiftDonutRange(-1)}>
                                <Ionicons name="chevron-back" size={16} color={colors.textTertiary} />
                            </TouchableOpacity>
                            <Text style={[styles.rangeLabel, { color: colors.textTertiary }]}>{donutRangeLabel}</Text>
                            <TouchableOpacity onPress={() => shiftDonutRange(1)}>
                                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.donutWrap}>
                        <Svg width={DONUT_SIZE} height={DONUT_SIZE}>
                            <G rotation={-90} origin={`${DONUT_SIZE / 2}, ${DONUT_SIZE / 2}`}>
                                {donutSegments.length === 0 ? (
                                    <Circle
                                        cx={DONUT_SIZE / 2}
                                        cy={DONUT_SIZE / 2}
                                        r={DONUT_RADIUS}
                                        stroke={colors.border}
                                        strokeWidth={DONUT_STROKE}
                                        fill="none"
                                    />
                                ) : (
                                    donutSegments.map((seg) => (
                                        <Circle
                                            key={seg.mood}
                                            cx={DONUT_SIZE / 2}
                                            cy={DONUT_SIZE / 2}
                                            r={DONUT_RADIUS}
                                            stroke={seg.color}
                                            strokeWidth={DONUT_STROKE}
                                            fill="none"
                                            strokeDasharray={`${seg.arcLen} ${DONUT_CIRCUMFERENCE - seg.arcLen}`}
                                            strokeDashoffset={-seg.offset}
                                        />
                                    ))
                                )}
                            </G>
                        </Svg>
                        <View style={styles.donutCenter}>
                            <Text style={[styles.donutTotalNum, { color: colors.textPrimary }]}>{totalMoodDays}</Text>
                            {/* <Text style={[styles.donutTotalLabel, { color: colors.textTertiary }]}>
                                {totalMoodDays === 1 ? 'day' : 'days'}
                            </Text> */}
                            <Text style={[styles.donutTotalLabel, { color: colors.textTertiary }]}>
                                {t(totalMoodDays === 1 ? 'day' : 'days')}
                            </Text>
                            <Text style={[styles.donutTotalSub, { color: colors.textTertiary }]}>{t('Total')}</Text>
                        </View>
                    </View>

                    <View style={styles.donutLegendWrap}>
                        {donutSegments.length === 0 ? (
                            <Text style={{ color: colors.textTertiary, fontSize: 13, textAlign: 'center' }}>
                                {t('Nomoodentries')}
                            </Text>
                        ) : (
                            donutSegments.map((seg) => (
                                <View key={seg.mood} style={styles.donutLegendItem}>
                                    <View style={[styles.donutLegendDot, { backgroundColor: seg.color }]} />
                                    <Text style={[styles.donutLegendLabel, { color: colors.textPrimary }]}>{seg.label}</Text>
                                    <Text style={[styles.donutLegendPct, { color: seg.color }]}>{Math.round(seg.pct)}%</Text>
                                    {/* <Text style={[styles.donutLegendDays, { color: colors.textTertiary }]}>
                                        {seg.count} {seg.count === 1 ? 'day' : 'days'}
                                    </Text> */}
                                    <Text style={[styles.donutLegendDays, { color: colors.textTertiary }]}>
                                        {seg.count} {t(seg.count === 1 ? 'day' : 'days')}
                                    </Text>
                                </View>
                            ))
                        )}
                    </View>
                </View>

                <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
                    <TouchableOpacity
                        style={styles.recordsHeaderRow}
                        onPress={() => router.push('/mood-records')}
                    >
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                            {t('MoodRecords')}
                        </Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                    </TouchableOpacity>
                    {Object.entries(moodMap)
                        .sort((a, b) => (a[0] < b[0] ? 1 : -1))
                        .slice(0, 2)
                        .map(([dateStr, entry]: [string, any]) => {
                            const d = new Date(dateStr);
                            return (
                                <View key={dateStr} style={styles.recordRow}>
                                    <View style={styles.recordDateCol}>
                                        <Text style={[styles.recordDayNum, { color: colors.textPrimary }]}>{d.getDate()}</Text>
                                        <Text style={[styles.recordDow, { color: colors.textTertiary }]}>
                                            {/* {d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()} */}
                                            {t(WEEKDAY_KEYS_SUN_FIRST[d.getDay()]).substring(0, 3).toUpperCase()}
                                        </Text>
                                    </View>
                                    {entry?.mood ? (
                                        <Image source={findMoodImage(entry.mood)} style={styles.recordMoodImage} resizeMode="cover" />
                                    ) : null}
                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                        <Text style={[styles.recordMoodLabel, { color: colorOf(entry?.mood) }]}>
                                            {entry?.mood ? t(capitalize(entry.mood)) : ''}
                                            {/* {MOOD_OPTIONS.find((m: any) => m.key === entry?.mood)?.label ?? entry?.mood} */}
                                        </Text>
                                        {Array.isArray(entry?.tags) && entry.tags.length > 0 && (
                                            <View style={styles.recordTagsRow}>
                                                {entry.tags.slice(0, 3).map((tag: string) => (
                                                    <View
                                                        key={tag}
                                                        style={[styles.recordTagPill, { backgroundColor: colorOf(entry?.mood) + '22' }]}
                                                    >
                                                        <Text style={[styles.recordTagText, { color: colorOf(entry?.mood) }]}>{tag}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                </View>
            </ScrollView>

            {/* Settings Bottom Sheet */}
            <Modal
                visible={settingsVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setSettingsVisible(false)}
            >
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={() => setSettingsVisible(false)}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        style={[styles.sheet, { backgroundColor: colors.cardBackground }]}
                        onPress={() => { }}
                    >
                        <View style={styles.sheetHandle} />
                        <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>{t('settings')}</Text>

                        <View style={[styles.sheetRow, { borderTopColor: colors.border }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.sheetRowTitle, { color: colors.textPrimary }]}>
                                    {t('HomeFloatingButton')}
                                </Text>
                                <Text style={[styles.sheetRowSubtitle, { color: colors.textTertiary }]}>
                                    {t('Showmoodshortcut')}
                                </Text>
                            </View>
                            <Switch
                                value={moodFabVisible}
                                onValueChange={toggleMoodFab}
                                trackColor={{ false: colors.border, true: colors.primary }}
                                thumbColor="#fff"
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.sheetRow, { borderTopColor: colors.border }]}
                            onPress={handleExport}
                            disabled={exporting}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.sheetRowTitle, { color: colors.textPrimary }]}>
                                    {t('Export')}
                                </Text>
                                <Text style={[styles.sheetRowSubtitle, { color: colors.textTertiary }]}>
                                    {t('Downloadallmood')}
                                </Text>
                            </View>
                            <Ionicons name="download-outline" size={22} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingBottom: 16,
        paddingHorizontal: 20,
    },
    recordsHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    recordTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    recordTagPill: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 10 },
    recordTagText: { fontSize: 11, fontWeight: '600' },
    headerTitle: { fontSize: 18, fontWeight: '600' },
    card: {
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 16,
        borderRadius: 16,
    },
    monthNavRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    monthLabel: { fontSize: 16, fontWeight: '700' },
    dowRow: { flexDirection: 'row', marginBottom: 6 },
    dowText: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600' },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    gridCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 },
    dayCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    dayNumText: { fontSize: 13, fontWeight: '600' },
    dayMoodImage: { width: 34, height: 34 },

    sectionTitle: { fontSize: 16, fontWeight: '700' },
    chartHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    pillGroup: { flexDirection: 'row', borderRadius: 20, padding: 3 },
    pill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16 },
    pillText: { fontSize: 13, fontWeight: '600' },
    rangeNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 },
    rangeLabel: { fontSize: 13, marginHorizontal: 4 },

    chartRow: { flexDirection: 'row', alignItems: 'flex-start' },
    chartNode: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 2,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    chartMoodImage: { width: 30, height: 30 },
    chartDotEmpty: { width: 8, height: 8, borderRadius: 4 },
    chartDayLabel: { position: 'absolute', width: 30, textAlign: 'center', fontSize: 11 },

    legendCol: { width: LEGEND_WIDTH, marginLeft: 12, paddingTop: 4 },
    legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    legendImage: { width: 18, height: 18, borderRadius: 9, marginRight: 6 },
    legendText: { fontSize: 11, flexShrink: 1 },

    donutWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 16 },
    donutCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
    donutTotalNum: { fontSize: 26, fontWeight: '800', lineHeight: 30 },
    donutTotalLabel: { fontSize: 13, marginTop: -2 },
    donutTotalSub: { fontSize: 11, marginTop: 2 },
    donutLegendWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14 },
    donutLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    donutLegendDot: { width: 10, height: 10, borderRadius: 5 },
    donutLegendLabel: { fontSize: 13, fontWeight: '600' },
    donutLegendPct: { fontSize: 13, fontWeight: '700' },
    donutLegendDays: { fontSize: 12 },

    recordRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    recordDateCol: { width: 36, alignItems: 'center', marginRight: 10 },
    recordDayNum: { fontSize: 18, fontWeight: '700' },
    recordDow: { fontSize: 10, fontWeight: '600' },
    recordMoodImage: { width: 36, height: 36, borderRadius: 18 },
    recordMoodLabel: { fontSize: 14, fontWeight: '600' },
    recordTags: { fontSize: 12, marginTop: 2 },

    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 36,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#D1D5DB',
        alignSelf: 'center',
        marginBottom: 16,
    },
    sheetTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16, textAlign: "center" },
    sheetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderTopWidth: StyleSheet.hairlineWidth,
        // borderTopColor: '#E5E7EB',
    },
    sheetRowTitle: { fontSize: 15, fontWeight: '600' },
    sheetRowSubtitle: { fontSize: 12, marginTop: 2 },
});