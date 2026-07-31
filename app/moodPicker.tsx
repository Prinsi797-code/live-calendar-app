import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from "react-i18next";
// import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { MOOD_OPTIONS } from '../utils/moodStorage';

const MOOD_FAB_VISIBLE_KEY = 'moodFabVisible';

export default function MoodPickerScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const params = useLocalSearchParams();
    const date = (params.date as string) || '';
    const isEditMode = (params.mode as string) === 'edit';
    const { t } = useTranslation();

    const [showHomeButton, setShowHomeButton] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const val = await AsyncStorage.getItem(MOOD_FAB_VISIBLE_KEY);
                setShowHomeButton(val !== 'false');
            } catch (e) { }
        })();
    }, []);

    const toggleHomeButton = async () => {
        const newVal = !showHomeButton;
        setShowHomeButton(newVal);
        try {
            await AsyncStorage.setItem(MOOD_FAB_VISIBLE_KEY, newVal ? 'true' : 'false');
        } catch (e) { }
    };

    const goToDetail = (moodKey: string) => {
        if (isEditMode) {
            router.replace({
                pathname: '/moodDetail',
                params: { date, mood: moodKey },
            });
        } else {
            router.push({
                pathname: '/moodDetail',
                params: { date, mood: moodKey },
            });
        }
    };

    const handleClose = () => {
        router.back();
    };

    const findMood = (key: string) => MOOD_OPTIONS.find((m) => m.key === key)!;
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    const positions: Record<string, { top: number; left: string }> = {
        awful: { top: 0, left: '33%' },
        excellent: { top: 0, left: '67%' },
        bad: { top: 90, left: '14%' },
        great: { top: 90, left: '86%' },
        poor: { top: 200, left: '21%' },
        good: { top: 200, left: '79%' },
        neutral: { top: 250, left: '50%' },
    };

    const renderMoodCircle = (key: string) => {
        const mood = findMood(key);
        const pos = positions[key];
        return (
            <TouchableOpacity
                key={mood.key}
                style={[
                    styles.moodItem,
                    { position: 'absolute', top: pos.top, left: pos.left, transform: [{ translateX: -45 }] },
                ]}
                onPress={() => goToDetail(mood.key)}
                activeOpacity={0.8}
            >
                <View style={styles.moodCircle}>
                    <Image
                        source={mood.image}
                        style={styles.moodImage}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                        transition={0}
                    />
                </View>
                <Text style={[styles.moodLabel, { color: colors.textPrimary }]}>{t(capitalize(mood.key))}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.grid}>
                {renderMoodCircle('awful')}
                {renderMoodCircle('excellent')}
                {renderMoodCircle('bad')}
                {renderMoodCircle('great')}

                <Text style={[styles.title, { color: colors.textPrimary, top: 160 }]}>
                    {t('Howyoufeelnow')}
                </Text>

                {renderMoodCircle('poor')}
                {renderMoodCircle('good')}
                {renderMoodCircle('neutral')}
            </View>

            <View style={styles.bottomWrap}>
                <TouchableOpacity
                    style={[styles.closeCircle, { borderColor: colors.textPrimary }]}
                    onPress={handleClose}
                    activeOpacity={0.7}
                >
                    <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={toggleHomeButton}
                    activeOpacity={0.7}
                >
                    <View
                        style={[
                            styles.checkbox,
                            { borderColor: colors.textTertiary },
                            showHomeButton && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                    >
                        {showHomeButton && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                    <Text style={[styles.checkboxLabel, { color: colors.textTertiary }]}>
                        {t('HomeFloatingButton')}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 15, justifyContent: 'center' },
    grid: {
        marginTop: 40,
        width: '100%',
        height: 380,
        position: 'relative',
        alignSelf: 'center',
    },
    title: {
        position: 'absolute',
        left: 0,
        right: 0,
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
    },
    moodItem: { alignItems: 'center', width: 90 },
    moodCircle: {
        width: 90,
        height: 90,
        // borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        // marginBottom: 8,
        // overflow: 'hidden',
    },
    moodImage: {
        width: 78,
        height: 78,
        // borderRadius: 40,
    },
    moodLabel: { fontSize: 14, fontWeight: '500' },

    bottomWrap: {
        position: 'absolute',
        bottom: 60,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    closeCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 5,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxLabel: { fontSize: 14, fontWeight: '500' },
});