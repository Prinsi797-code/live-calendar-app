import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from "react-i18next";
import {
    Animated,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { isStreakRewardActive, RestoreData, StreakData } from '../utils/streakManager';

import { checkAndRefreshStreak, restoreStreak } from '../utils/streakManager';

const MILESTONES = [7, 30, 100, 365];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function StreakScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const { t } = useTranslation();
    const [streak, setStreak] = useState<StreakData>({ count: 0, lastEventDate: '' });
    const [bestStreak, setBestStreak] = useState(0);
    const [streakStartDate, setStreakStartDate] = useState('');
    const [rewardDaysLeft, setRewardDaysLeft] = useState(0);
    const flameAnim = useRef(new Animated.Value(1)).current;

    const [restoreAvailable, setRestoreAvailable] = useState(false);
    const [restoreData, setRestoreData] = useState<RestoreData | null>(null);
    const [restoreTimeLeft, setRestoreTimeLeft] = useState('');
    const [isRestoring, setIsRestoring] = useState(false);
    const [streakBlurred, setStreakBlurred] = useState(false);


    useEffect(() => {
        loadStreakData();
        startFlameAnimation();
    }, []);

    const startFlameAnimation = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(flameAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
                Animated.timing(flameAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            ])
        ).start();
    };

    useEffect(() => {
        if (!restoreData) return;

        const updateTimer = () => {
            const now = new Date();
            const end = new Date(restoreData.restoreWindowEnd);
            const diff = end.getTime() - now.getTime();

            if (diff <= 0) {
                setRestoreAvailable(false);
                setRestoreData(null);
                setStreakBlurred(false);
                loadStreakData(); // reload
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            setRestoreTimeLeft(`${hours}h ${minutes}m`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000);
        return () => clearInterval(interval);
    }, [restoreData]);

    const loadStreakData = async () => {
        const result = await checkAndRefreshStreak();
        setStreak(result.streak);
        setRestoreAvailable(result.restoreAvailable);
        setRestoreData(result.restoreData);
        setStreakBlurred(result.restoreAvailable);

        const best = await AsyncStorage.getItem('best_streak');
        const bestVal = best ? parseInt(best) : 0;
        if (result.streak.count > bestVal && !result.restoreAvailable) {
            await AsyncStorage.setItem('best_streak', result.streak.count.toString());
            setBestStreak(result.streak.count);
        } else {
            setBestStreak(bestVal);
        }

        const startDate = await AsyncStorage.getItem('streak_start_date');
        if (startDate) setStreakStartDate(startDate);

        const reward = await isStreakRewardActive();
        setRewardDaysLeft(reward.daysLeft);
    };

    const handleRestore = async () => {
        setIsRestoring(true);
        const restoredCount = await restoreStreak();
        if (restoredCount > 0) {
            setRestoreAvailable(false);
            setRestoreData(null);
            setStreakBlurred(false);
            await loadStreakData();
        }
        setIsRestoring(false);
    };

    const isToday = () => new Date().toISOString().split('T')[0] === streak.lastEventDate;

    const getNextMilestone = () => {
        for (const m of MILESTONES) if (streak.count < m) return m;
        return MILESTONES[MILESTONES.length - 1];
    };

    const getProgressPercent = () => {
        const next = getNextMilestone();
        const prev = MILESTONES[MILESTONES.indexOf(next) - 1] ?? 0;
        return Math.min(Math.max((streak.count - prev) / (next - prev), 0), 1);
    };
    const formatStartDate = () => {
        if (!streakStartDate) return '—';

        const d = new Date(streakStartDate);

        return d.toLocaleDateString('en-US', {
            timeZone: 'UTC',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };
    const getWeekDays = () => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const todayStr = today.toISOString().split('T')[0];

        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(today);
            d.setDate(today.getDate() - dayOfWeek + i);
            const dateStr = d.toISOString().split('T')[0];

            const lastDate = streak.lastEventDate;
            const daysAgo = Math.floor(
                (today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
            );

            const isFilled =
                daysAgo >= 0 &&
                daysAgo < streak.count &&
                lastDate >= dateStr &&
                streak.count > 0;

            return {
                label: DAYS[i],
                num: d.getDate(),
                isToday: dateStr === todayStr,
                isFilled,
            };
        });
    };
    const progressPercent = getProgressPercent();
    const nextMilestone = getNextMilestone();
    const daysLeft = nextMilestone - streak.count;
    const progressText = daysLeft > 0
        ? `${daysLeft} ${t('moreday')} ${t('togo')}`
        : t('Milestonereached');
    const weekDays = getWeekDays();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
                    <View style={[styles.closeBtnCircle, { backgroundColor: colors.cardBackground }]}>
                        <Ionicons name="chevron-back" size={28} color={colors.textSecondary} />
                    </View>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t("MyStreak")}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={[styles.mainCard, { backgroundColor: colors.cardBackground }]}>
                    <Animated.Text style={[styles.flameEmoji, { transform: [{ scale: flameAnim }] }]}>
                        {restoreAvailable ? '🥺' : '🔥'}
                    </Animated.Text>

                    {/* Blurred streak count */}
                    <View style={{ alignItems: 'center' }}>
                        <Text style={[
                            styles.streakCount,
                            { color: '#FF5252' },
                            streakBlurred && {
                                opacity: 0.2,
                                // blur effect
                                textShadowColor: '#FF5252',
                                textShadowRadius: 20,
                            }
                        ]}>
                            {streak.count}
                        </Text>
                        {streakBlurred && (
                            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 32 }}>🔒</Text>
                            </View>
                        )}
                    </View>

                    <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>
                        {t("DayStreak")}
                    </Text>

                    {/* Normal status pill */}
                    {!restoreAvailable && (
                        <View style={[styles.statusPill, { backgroundColor: isToday() ? '#E05C2A18' : '#88888818' }]}>
                            <View style={[styles.statusDot, { backgroundColor: isToday() ? '#FF5252' : '#888' }]} />
                            <Text style={[styles.statusText, { color: isToday() ? '#FF5252' : colors.textSecondary }]}>
                                {isToday() ? t('Eventaddedtoday') : t('keepstreak')}
                            </Text>
                        </View>
                    )}

                    {/* Restore Banner */}
                    {restoreAvailable && restoreData && (
                        <View style={{
                            width: '100%',
                            backgroundColor: '#FF525215',
                            borderRadius: 16,
                            padding: 14,
                            marginTop: 8,
                            alignItems: 'center',
                            gap: 10,
                            borderWidth: 1,
                            borderColor: '#FF525240',
                        }}>
                            <Text style={{ fontSize: 13, color: '#FF5252', fontWeight: '600', textAlign: 'center' }}>
                                😢 You broke your {restoreData.savedCount}-day streak!
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>
                                Restore it before it's gone! ⏰ {restoreTimeLeft} left
                            </Text>
                            <TouchableOpacity
                                onPress={handleRestore}
                                disabled={isRestoring}
                                style={{
                                    backgroundColor: '#FF5252',
                                    paddingHorizontal: 24,
                                    paddingVertical: 10,
                                    borderRadius: 20,
                                    opacity: isRestoring ? 0.7 : 1,
                                }}
                            >
                                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                                    {isRestoring ? 'Restoring...' : `🔥 Restore ${restoreData.savedCount}-Day Streak`}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <View style={styles.infoRow}>
                    <View style={[styles.infoCard, { backgroundColor: colors.cardBackground }]}>
                        <Image
                            source={require('../assets/images/winner.png')}
                            style={{ width: 28, height: 28, marginBottom: 2 }}
                            resizeMode="contain"
                        />
                        <Text style={[styles.infoVal, { color: colors.textPrimary }]}>{bestStreak} days</Text>
                        <Text style={[styles.infoLbl, { color: colors.textSecondary }]}>{t("BestStreak")}</Text>
                    </View>
                    <View style={[styles.infoCard, { backgroundColor: colors.cardBackground }]}>
                        <Image
                            source={require('../assets/images/calendar.png')}
                            style={{ width: 28, height: 28, marginBottom: 2 }}
                            resizeMode="contain"
                        />
                        <Text style={[styles.infoVal, { color: colors.textPrimary }]}>{formatStartDate()}</Text>
                        <Text style={[styles.infoLbl, { color: colors.textSecondary }]}>{t("streakstarted")}</Text>
                    </View>

                </View>

                <View style={[styles.progressCard, { backgroundColor: colors.cardBackground }]}>
                    <View style={styles.progressHeader}>
                        <Text style={[styles.progressTitle, { color: colors.textPrimary }]}>{t("NextMilestone")}</Text>
                        <Text style={[styles.progressMeta, { color: '#FF5252' }]}>{nextMilestone} 🔥</Text>
                    </View>
                    <Text style={[styles.progressSub, { color: colors.textSecondary }]}>{progressText}</Text>
                    <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                        <View style={[styles.progressBarFill, { width: `${progressPercent * 100}%` }]} />
                    </View>
                    <View style={styles.milestonesRow}>
                        {MILESTONES.map((m) => {
                            const reached = streak.count >= m;
                            return (
                                <View key={m} style={styles.milestoneItem}>
                                    <View style={[
                                        styles.milestoneBubble,
                                        {
                                            backgroundColor: reached ? '#E05C2A18' : colors.border,
                                            borderColor: reached ? '#FF5252' : colors.border,
                                        }
                                    ]}>
                                        <Text style={styles.milestoneLock}>{reached ? '🔥' : '🔒'}</Text>
                                    </View>
                                    <Text style={[styles.milestoneLabel, { color: reached ? '#FF5252' : colors.textSecondary }]}>
                                        {m >= 365 ? '1 yr' : `${m}d`}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

                <View style={[styles.rewardCard, {
                    backgroundColor: rewardDaysLeft > 0 ? '#22c55e12' : '#E05C2A0D',
                    borderColor: rewardDaysLeft > 0 ? '#22c55e40' : '#E05C2A30',
                }]}>
                    <View style={[styles.rewardIconWrap, {
                        backgroundColor: rewardDaysLeft > 0 ? '#22c55e20' : '#E05C2A18',
                    }]}>
                        <Text style={{ fontSize: 22 }}>{rewardDaysLeft > 0 ? '🎁' : '🎯'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.rewardTitle, {
                            color: rewardDaysLeft > 0 ? '#166534' : '#FF5252',
                        }]}>
                            {rewardDaysLeft > 0 ? t('Rewardactive') : t('streakreward')}
                        </Text>
                        <Text style={[styles.rewardSub, {
                            color: rewardDaysLeft > 0 ? '#15803d' : '#FF5252',
                        }]}>
                            {rewardDaysLeft > 0
                                ? `${t('Backgroundimages')} + 💪 ${t('Challengesunlocked')} — ${rewardDaysLeft} ${t('daysleft')}`
                                : t('Reach7days')}
                        </Text>
                    </View>
                    <View style={[styles.rewardBadge, {
                        backgroundColor: rewardDaysLeft > 0 ? '#22c55e' : '#FF5252',
                    }]}>
                        <Text style={styles.rewardBadgeText}>
                            {rewardDaysLeft > 0 ? `${t('FREE')} ${rewardDaysLeft}d` : '7d'}
                        </Text>
                    </View>
                </View>

                <View style={[styles.howCard, { backgroundColor: colors.cardBackground }]}>
                    <Text style={[styles.howTitle, { color: colors.textPrimary }]}>{t("Howitworks")}</Text>
                    {[
                        { emoji: '📅', text: t("Addatleast") },
                        { emoji: '💥', text: t("Missingaday") },
                        { emoji: '🏆', text: t("Reachmilestones") },
                    ].map((row, i) => (
                        <View key={i} style={styles.howRow}>
                            <View style={[styles.howIconWrap, { backgroundColor: colors.border }]}>
                                <Text style={{ fontSize: 15 }}>{row.emoji}</Text>
                            </View>
                            <Text style={[styles.howText, { color: colors.textSecondary }]}>{row.text}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: 16,
    },
    closeBtnCircle: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
    scroll: { padding: 16, gap: 12, paddingBottom: 40 },
    mainCard: { borderRadius: 20, padding: 24, alignItems: 'center', gap: 6 },
    flameEmoji: { fontSize: 64 },
    streakCount: { fontSize: 68, fontWeight: '800', lineHeight: 72 },
    streakLabel: { fontSize: 16, fontWeight: '600', marginTop: 2 },
    statusPill: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: 20, marginTop: 8,
    },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusText: { fontSize: 13, fontWeight: '600' },
    weekRow: {
        flexDirection: 'row',
        gap: 4,
        marginTop: 16,
        width: '100%',
    },
    dayCol: { flex: 1, alignItems: 'center', gap: 5 },
    dayLabel: { fontSize: 11, fontWeight: '500' },
    dayBubble: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'transparent',
        borderWidth: 0.5,
        borderColor: 'rgba(128,128,128,0.2)',
    },
    dayBubbleFilled: { backgroundColor: '#E05C2A', borderColor: '#E05C2A' },
    dayNum: { fontSize: 13, fontWeight: '500' },
    infoRow: { flexDirection: 'row', gap: 10 },
    infoCard: {
        flex: 1, borderRadius: 14, padding: 14,
        alignItems: 'flex-start', gap: 4,
    },
    infoEmoji: { fontSize: 24, marginBottom: 2 },
    infoVal: { fontSize: 16, fontWeight: '700' },
    infoLbl: { fontSize: 12 },
    progressCard: { borderRadius: 16, padding: 16, gap: 10 },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progressTitle: { fontSize: 15, fontWeight: '700' },
    progressMeta: { fontSize: 15, fontWeight: '700' },
    progressSub: { fontSize: 13 },
    progressBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 4, backgroundColor: '#E05C2A' },
    milestonesRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    milestoneItem: { alignItems: 'center', gap: 4 },
    milestoneBubble: {
        width: 44, height: 44, borderRadius: 22,
        borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    },
    milestoneLock: { fontSize: 20 },
    milestoneLabel: { fontSize: 11, fontWeight: '600' },
    rewardCard: {
        borderRadius: 16, borderWidth: 0.5,
        padding: 14, flexDirection: 'row',
        alignItems: 'center', gap: 12,
    },
    rewardIconWrap: {
        width: 44, height: 44, borderRadius: 22,
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    rewardTitle: { fontSize: 14, fontWeight: '600' },
    rewardSub: { fontSize: 12, marginTop: 2, lineHeight: 16 },
    rewardBadge: {
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 20, flexShrink: 0,
    },
    rewardBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
    howCard: { borderRadius: 16, padding: 16, gap: 12 },
    howTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
    howRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    howIconWrap: {
        width: 30, height: 30, borderRadius: 15,
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    howText: { flex: 1, fontSize: 13, lineHeight: 20, paddingTop: 4 },
});