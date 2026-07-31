import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from "react-i18next";
import {
    Alert,
    Image,
    Keyboard,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { deleteMoodEntry, getMoodEntry, MOOD_OPTIONS, saveMoodEntry } from '../utils/moodStorage';

const FEELING_TAGS = [
    'Amazed', 'Annoyed', 'Brave', 'Amused', 'Anxious', 'Calm',
    'Angry', 'Ashamed', 'Confident', 'Disgusted', 'Excited', 'Guilty',
    'Drained', 'Frustrated', 'Happy', 'Embarrassed', 'Grateful', 'Hopeful',
];

const IMPACT_TAGS = [
    'Community', 'Education', 'Friends', 'Current Events', 'Family', 'Health',
    'Dating', 'Fitness', 'Hobbies', 'Identity', 'Self-Care', 'Travel',
    'Money', 'Spirituality', 'Weather', 'Partner', 'Tasks', 'Work',
];

const MAX_TAGS = 5;

export default function MoodDetailScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const params = useLocalSearchParams();
    const date = (params.date as string) || '';
    const moodKey = (params.mood as string) || '';
    const { t } = useTranslation();
    const [reason, setReason] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [hasSavedEntry, setHasSavedEntry] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [sheetVisible, setSheetVisible] = useState(false);
    const textInputRef = useRef<TextInput>(null);

    const mood = MOOD_OPTIONS.find((m) => m.key === moodKey);
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    useEffect(() => {
        const loadExisting = async () => {
            const existing = await getMoodEntry(date);
            if (existing) {
                setReason(existing.reason || '');
                setTags(Array.isArray(existing.tags) ? existing.tags : []);
                setHasSavedEntry(true);
            }
        };
        loadExisting();
    }, [date]);

    const formatHeaderDate = (dateString: string) => {
        if (!dateString) return '';
        const [, month, day] = dateString.split('-');
        return `${month}.${day}`;
    };

    const closeBothScreens = () => {
        try {
            if (router.canDismiss?.()) {
                router.dismissAll();
                return;
            }
        } catch (e) { }

        try {
            if (router.canGoBack()) {
                router.back();
                return;
            }
        } catch (e) { }
        router.replace('/');
    };

    const handleSave = async () => {
        await saveMoodEntry({ date, mood: moodKey, reason, tags });
        closeBothScreens();
    };

    const handleDelete = () => {
        Alert.alert(t('DeleteMood'), t('RemoveTodayEntry'), [
            { text: t('Cancel'), style: 'cancel' },
            {
                text: t('Delete'),
                style: 'destructive',
                onPress: async () => {
                    await deleteMoodEntry(date);
                    closeBothScreens();
                },
            },
        ]);
    };

    const toggleTag = (tag: string) => {
        setTags((prev) => {
            if (prev.includes(tag)) {
                return prev.filter((t) => t !== tag);
            }
            if (prev.length >= MAX_TAGS) {
                Alert.alert(t('LimitReached'), t('LimitReachedMsg', { max: MAX_TAGS }));
                // Alert.alert('Limit reached', `You can select up to ${MAX_TAGS} tags only.`);
                return prev;
            }
            return [...prev, tag];
        });
    };

    if (!mood) return null;

    const showAddReasonPill = !isEditing && !reason && tags.length === 0;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={[styles.closeIcon, { color: colors.textPrimary }]}>✕</Text>
                </TouchableOpacity>
                <Text style={[styles.headerDate, { color: colors.textPrimary }]}>
                    {formatHeaderDate(date)}
                </Text>
                {hasSavedEntry ? (
                    <TouchableOpacity onPress={handleDelete}>
                        <Ionicons name="trash" size={22} style={[styles.icon, { color: colors.primary}]}/>
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 24 }} />
                )}
            </View>

            <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
                <TouchableOpacity
                    style={styles.moodCircle}
                    activeOpacity={0.7}
                    onPress={() =>
                        router.push({
                            pathname: '/moodPicker',
                            params: { date, mode: 'edit' },
                        })
                    }
                >
                    <Image source={mood.image} style={{ width: 60, height: 60 }} resizeMode="contain" />
                </TouchableOpacity>
                <Text style={[styles.moodLabel, { color: colors.textPrimary }]}>{t(capitalize(mood.key))}</Text>
                {/* <Text style={[styles.moodLabel, { color: colors.textPrimary }]}>{mood.label}</Text> */}

                {tags.length > 0 && (
                    <View style={styles.selectedTagsRow}>
                        {tags.map((tag) => (
                            <TouchableOpacity
                                key={tag}
                                style={styles.selectedTagPill}
                                onPress={() => toggleTag(tag)}
                            >
                                <Text style={styles.selectedTagText}>{t(tag)}</Text>
                                {/* <Text style={styles.selectedTagText}>{tag}</Text> */}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <TextInput
                    ref={textInputRef}
                    style={[styles.reasonInput, { color: colors.textPrimary }]}
                    // placeholder="Write a reason..."
                    placeholder={t('WriteReason')}
                    placeholderTextColor={colors.textTertiary}
                    value={reason}
                    onChangeText={setReason}
                    multiline
                    autoFocus={false}
                    returnKeyType="done"
                    blurOnSubmit
                    onFocus={() => setIsEditing(true)}
                    onBlur={() => setIsEditing(false)}
                    onSubmitEditing={() => Keyboard.dismiss()}
                />
            </View>

            <View style={styles.footer}>
                {showAddReasonPill ? (
                    <TouchableOpacity
                        style={styles.reasonPill}
                        onPress={() => setSheetVisible(true)}
                    >
                        <Text style={styles.reasonPillText}>{t('Addreason')}</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.reasonPill}
                        onPress={() => setSheetVisible(true)}
                    >
                        <Text style={styles.reasonPillText}>{t('Edittags')}</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: colors.primary }]}
                    onPress={handleSave}
                >
                    <Text style={styles.saveButtonText}>{t('Save')}</Text>
                </TouchableOpacity>
            </View>

            {/* Tags Bottom Sheet */}
            <Modal
                visible={sheetVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setSheetVisible(false)}
            >
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={() => setSheetVisible(false)}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        style={[styles.sheet, { backgroundColor: colors.cardBackground }]}
                        onPress={() => { }}
                    >
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.sheetHeaderRow}>
                                <Text style={[styles.sheetTitle, { color: colors.textPrimary, marginBottom: 0 }]}>
                                    {t('Whatbestfeeling')}
                                </Text>
                                <Text style={[styles.tagCounter, { color: colors.textTertiary }]}>
                                    {tags.length}/{MAX_TAGS}
                                </Text>
                            </View>
                            <View style={styles.tagWrap}>
                                {FEELING_TAGS.map((tag) => {
                                    const selected = tags.includes(tag);
                                    return (
                                        <TouchableOpacity
                                            key={tag}
                                            style={[
                                                styles.tagChip,
                                                { backgroundColor: colors.background },
                                                selected && { backgroundColor: colors.primary },
                                            ]}
                                            onPress={() => toggleTag(tag)}
                                        >
                                            <Text
                                                style={[
                                                    styles.tagChipText,
                                                    { color: selected ? '#fff' : colors.textPrimary },
                                                ]}
                                            >
                                                {t(tag)}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text style={[styles.sheetTitle, { color: colors.textPrimary, marginTop: 20 }]}>
                                {t('Whatshaving')}
                            </Text>
                            <View style={styles.tagWrap}>
                                {IMPACT_TAGS.map((tag) => {
                                    const selected = tags.includes(tag);
                                    return (
                                        <TouchableOpacity
                                            key={tag}
                                            style={[
                                                styles.tagChip,
                                                { backgroundColor: colors.background },
                                                selected && { backgroundColor: colors.primary },
                                            ]}
                                            onPress={() => toggleTag(tag)}
                                        >
                                            <Text
                                                style={[
                                                    styles.tagChipText,
                                                    { color: selected ? '#fff' : colors.textPrimary },
                                                ]}
                                            >
                                                {t(tag)}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.doneButton, { backgroundColor: colors.primary }]}
                            onPress={() => setSheetVisible(false)}
                        >
                            <Text style={styles.doneButtonText}>{t('Done')}</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 60, paddingHorizontal: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    closeIcon: { fontSize: 22 },
    trashIcon: { fontSize: 20 },
    headerDate: { fontSize: 18, fontWeight: '600' },
    card: {
        marginTop: 30,
        borderRadius: 20,
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    moodCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    moodLabel: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
    selectedTagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 16,
    },
    selectedTagPill: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        backgroundColor: '#FCE8EA',
    },
    selectedTagText: { fontSize: 12, fontWeight: '500', color: '#E0748A' },
    reasonInput: { fontSize: 16, minHeight: 60, width: '100%', textAlign: 'center' },
    footer: { marginTop: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    reasonPill: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, backgroundColor: '#EFEFEF' },
    reasonPillText: { fontSize: 14, fontWeight: '500', color: '#333' },
    saveButton: { paddingVertical: 12, paddingHorizontal: 30, borderRadius: 20 },
    saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },

    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 30,
        maxHeight: '75%',
    },
    sheetHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    tagCounter: { fontSize: 13, fontWeight: '600' },
    sheetTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14 },
    tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tagChip: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 20 },
    tagChipText: { fontSize: 15, fontWeight: '500' },
    doneButton: {
        marginTop: 16,
        paddingVertical: 14,
        borderRadius: 20,
        alignItems: 'center',
    },
    icon:{},
    doneButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});