import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from "react-i18next";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { useTheme } from '../contexts/ThemeContext';
import { deleteMoodEntry, getAllMoodEntries, MOOD_OPTIONS } from '../utils/moodStorage';

const MOOD_COLOR: Record<string, string> = {
    bad: '#B084DC',
    sad: '#F97316',
    neutral: '#93c4fc',
    good: '#80c084',
    great: '#fad764',
    excellent: '#fab54f',
    awful: '#ef7382',
    poor: '#6c74ff'

};
const colorOf = (moodKey?: string | null) =>
    (moodKey && MOOD_COLOR[moodKey]) || '#9CA3AF';
const findMoodImage = (moodKey: string) =>
    MOOD_OPTIONS.find((m: any) => m.key === moodKey)?.image;

// const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_KEYS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_KEYS_SUN_FIRST = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export default function MoodRecordsScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const [moodMap, setMoodMap] = useState<Record<string, any>>({});
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerYear, setPickerYear] = useState(filterYear);

    const swipeableRefs = useRef<Record<string, Swipeable | null>>({});
    const openRowKey = useRef<string | null>(null);
    const { t } = useTranslation();

    useFocusEffect(
        useCallback(() => {
            (async () => {
                const all = await getAllMoodEntries();
                setMoodMap(all);
            })();
        }, [])
    );

    // const monthLabel = `${filterYear}-${String(filterMonth + 1).padStart(2, '0')}`;
    const monthLabel = `${t(MONTH_KEYS[filterMonth]).substring(0, 3)} ${filterYear}`;
    const records = Object.entries(moodMap)
        .filter(([dateStr]) => {
            const [y, m] = dateStr.split('-').map(Number);
            return y === filterYear && m - 1 === filterMonth;
        })
        .sort((a, b) => (a[0] < b[0] ? 1 : -1));

    const openPicker = () => {
        setPickerYear(filterYear);
        setPickerVisible(true);
    };

    const handleDelete = async (dateStr: string) => {
        swipeableRefs.current[dateStr]?.close();
        await deleteMoodEntry(dateStr);
        const all = await getAllMoodEntries();
        setMoodMap(all);
        if (openRowKey.current === dateStr) {
            openRowKey.current = null;
        }
    };

    const handleSwipeWillOpen = (dateStr: string) => {
        const prevKey = openRowKey.current;
        if (prevKey && prevKey !== dateStr) {
            swipeableRefs.current[prevKey]?.close();
        }
        openRowKey.current = dateStr;
    };

    const renderRightActions = (dateStr: string) => (
        <View style={styles.deleteActionWrap}>
            <TouchableOpacity
                style={styles.deleteAction}
                onPress={() => handleDelete(dateStr)}
            >
                <Ionicons name="trash" size={22} color="#fff" />
            </TouchableOpacity>
        </View>
    );

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.header}>
                    {/* <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="close" size={26} color={colors.textPrimary} />
                    </TouchableOpacity> */}
                    <TouchableOpacity
                        onPress={() => {
                            if (router.canGoBack()) {
                                router.replace('/mood-calendar');
                            } else {
                                router.back();
                            }
                        }}
                    >
                        <Ionicons name="close" size={26} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.monthPickerBtn} onPress={openPicker}>
                        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{monthLabel}</Text>
                        <Ionicons name="chevron-down" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={{ width: 26 }} />
                </View>

                {records.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <Text style={{ color: colors.textTertiary }}>{t('Norecordsmonth')}</Text>
                    </View>
                ) : (
                    records.map(([dateStr, entry]: [string, any]) => {
                        const d = new Date(dateStr);
                        return (
                            <Swipeable
                                key={dateStr}
                                ref={(ref) => {
                                    swipeableRefs.current[dateStr] = ref;
                                }}
                                renderRightActions={() => renderRightActions(dateStr)}
                                overshootRight={false}
                                friction={2}
                                rightThreshold={40}
                                onSwipeableWillOpen={() => handleSwipeWillOpen(dateStr)}
                                onSwipeableClose={() => {
                                    if (openRowKey.current === dateStr) {
                                        openRowKey.current = null;
                                    }
                                }}
                            >
                                <View style={[styles.recordCard, { backgroundColor: colors.cardBackground }]}>
                                    <View style={styles.recordDateCol}>
                                        <Text style={[styles.recordDayNum, { color: colors.textPrimary }]}>{d.getDate()}</Text>
                                        <Text style={[styles.recordDow, { color: colors.textTertiary }]}>
                                            {t(WEEKDAY_KEYS_SUN_FIRST[d.getDay()]).substring(0, 3).toUpperCase()}
                                            {/* {d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()} */}
                                        </Text>
                                    </View>
                                    <View style={[styles.moodCircle,]}>
                                        {entry?.mood ? (
                                            <Image source={findMoodImage(entry.mood)} style={{ width: 34, height: 34 }} contentFit="cover" />
                                        ) : null}
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={[styles.recordMoodLabel, { color: colorOf(entry?.mood) }]}>
                                            {entry?.mood ? t(capitalize(entry.mood)) : ''}
                                            {/* {MOOD_OPTIONS.find((m: any) => m.key === entry?.mood)?.label ?? entry?.mood} */}
                                        </Text>
                                        {Array.isArray(entry?.tags) && entry.tags.length > 0 && (
                                            <View style={styles.tagsRow}>
                                                {entry.tags.map((tag: string) => (
                                                    <View key={tag} style={[styles.tagPill, { backgroundColor: colorOf(entry?.mood) + '22' }]}>
                                                        <Text style={[styles.tagText, { color: colorOf(entry?.mood) }]}>{t(capitalize(tag))}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                        {!!entry?.reason && (
                                            <Text style={[styles.reasonText, { color: colors.textTertiary }]} numberOfLines={1}>
                                                {entry.reason}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            </Swipeable>
                        );
                    })
                )}
            </View>

            {/* Month/Year Picker Modal */}
            <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setPickerVisible(false)}>
                    <TouchableOpacity activeOpacity={1} style={[styles.pickerSheet, { backgroundColor: colors.cardBackground }]} onPress={() => { }}>
                        <View style={styles.yearNavRow}>
                            <TouchableOpacity onPress={() => setPickerYear((y) => y - 1)}>
                                <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                            <Text style={[styles.yearLabel, { color: colors.textPrimary }]}>{pickerYear}</Text>
                            <TouchableOpacity onPress={() => setPickerYear((y) => y + 1)}>
                                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.monthGrid}>
                            {MONTH_KEYS.map((key, idx) => {
                                const active = pickerYear === filterYear && idx === filterMonth;
                                return (
                                    <TouchableOpacity
                                        key={key}
                                        style={[
                                            styles.monthChip,
                                            { backgroundColor: colors.background },
                                            active && { backgroundColor: colors.primary },
                                        ]}
                                        onPress={() => {
                                            setFilterYear(pickerYear);
                                            setFilterMonth(idx);
                                            setPickerVisible(false);
                                        }}
                                    >
                                        <Text style={[styles.monthChipText, { color: active ? '#fff' : colors.textPrimary }]}>
                                            {t(key).substring(0, 3)}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 60 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    monthPickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    headerTitle: { fontSize: 18, fontWeight: '600' },
    emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },

    recordCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: 12,
        padding: 14,
        borderRadius: 16,
    },
    recordDateCol: { width: 36, alignItems: 'center', marginRight: 10 },
    recordDayNum: { fontSize: 20, fontWeight: '700' },
    recordDow: { fontSize: 10, fontWeight: '600' },
    moodCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    recordMoodLabel: { fontSize: 15, fontWeight: '700' },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
    tagPill: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 10 },
    tagText: { fontSize: 12, fontWeight: '600' },
    reasonText: { fontSize: 12, marginTop: 4 },

    deleteAction: {
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        width: 50,
        height: 50,
        borderRadius: 100,
        gap: 2,
    },
    deleteActionText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    deleteActionWrap: {
        width: 70,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
        marginBottom: 12,
    },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
    pickerSheet: { width: '85%', borderRadius: 20, padding: 20 },
    yearNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 30, marginBottom: 16 },
    yearLabel: { fontSize: 17, fontWeight: '700' },
    monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
    monthChip: { width: '28%', paddingVertical: 12, borderRadius: 20, alignItems: 'center' },
    monthChipText: { fontSize: 14, fontWeight: '600' },
});