import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from "react-i18next";
import {
    Alert,
    Linking,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
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
import { useTheme } from '../../contexts/ThemeContext';
import { useScreenTracking } from '../../hooks/useScreenTracking';
import AdsManager from '../../services/adsManager';
import NotificationService from '../../services/NotificationService';
import PurchaseManager from '../../services/purchaseManager';

interface Diary {
    id: string;
    title: string;
    icon: string;
    Date: string;
    reminder: string;
    completed: boolean;
    location: string;
    url: string;
    passwordProtected?: boolean;
}

export default function DiaryDetailsScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const params = useLocalSearchParams();
    const { colors } = useTheme();
    const searchParams = useLocalSearchParams();
    const [is24Hour, setIs24Hour] = useState(false);
    useScreenTracking('diary_details_screen');
    const [bannerConfig, setBannerConfig] = useState<{
        show: boolean;
        id: string;
        position: string;
    } | null>(null);

    const [diary, setDiary] = useState<Diary | null>(null);

    // Password modal state
    const [passwordModalVisible, setPasswordModalVisible] = useState(false);
    const [unlockModalVisible, setUnlockModalVisible] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
    const [unlockInput, setUnlockInput] = useState('');
    const [unlockError, setUnlockError] = useState('');

    // useEffect(() => {
    //     const config = AdsManager.getBannerConfig('event');
    //     setBannerConfig(config);
    // }, []);
    useEffect(() => {
        const loadBannerConfig = async () => {
            const config = await AdsManager.getBannerConfig('event');
            console.log('diary screen banner config:', config);
            setBannerConfig(config);
        };
        loadBannerConfig();
    }, []);

    useEffect(() => {
        const loadTimeFormat = async () => {
            try {
                const manualSetting = await AsyncStorage.getItem('user_manual_24hour_override');
                setIs24Hour(manualSetting === 'true');
            } catch (error) {
                console.error('Error loading time format:', error);
            }
        };
        loadTimeFormat();
    }, []);

    const loadDiary = async () => {
        try {
            const diaryId = params.diaryId || params.id;
            const diaryData = await AsyncStorage.getItem('diarys');
            if (diaryData) {
                const diarys = JSON.parse(diaryData);
                const foundDiary = diarys.find((d: Diary) => d.id === diaryId);
                if (foundDiary) {
                    setDiary(foundDiary);
                }
            }
        } catch (error) {
            console.error('Error loading diary:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadDiary();
        }, [params.diaryId, params.id])
    );

    // --- Password storage helpers ---
    const getDiaryPasswordKey = (id: string) => `diary_password_${id}`;

    const setDiaryPassword = async (id: string, password: string) => {
        await AsyncStorage.setItem(getDiaryPasswordKey(id), password);
    };

    const getDiaryPassword = async (id: string): Promise<string | null> => {
        return await AsyncStorage.getItem(getDiaryPasswordKey(id));
    };

    const removeDiaryPassword = async (id: string) => {
        await AsyncStorage.removeItem(getDiaryPasswordKey(id));
    };

    const updateDiaryProtectionFlag = async (protectedValue: boolean) => {
        if (!diary) return;
        try {
            const diaryData = await AsyncStorage.getItem('diarys');
            if (diaryData) {
                const diarys = JSON.parse(diaryData);
                const updated = diarys.map((d: Diary) =>
                    d.id === diary.id ? { ...d, passwordProtected: protectedValue } : d
                );
                await AsyncStorage.setItem('diarys', JSON.stringify(updated));
            }
            setDiary({ ...diary, passwordProtected: protectedValue });
        } catch (error) {
            console.error('Error updating diary protection flag:', error);
        }
    };

    const handleLockIconPress = () => {
        if (diary?.passwordProtected) {
            setUnlockInput('');
            setUnlockError('');
            setUnlockModalVisible(true);
        } else {
            setPasswordInput('');
            setConfirmPasswordInput('');
            setPasswordModalVisible(true);
        }
    };

    const handleSavePassword = async () => {
        if (!diary) return;
        if (!passwordInput || passwordInput.length < 4) {
            Alert.alert(t('error') || 'Error', 'Password must be at least 4 characters.');
            return;
        }
        if (passwordInput !== confirmPasswordInput) {
            Alert.alert(t('error') || 'Error', 'Passwords do not match.');
            return;
        }

        await setDiaryPassword(diary.id, passwordInput);
        await updateDiaryProtectionFlag(true);

        setPasswordModalVisible(false);
        setPasswordInput('');
        setConfirmPasswordInput('');
    };

    const handleRemoveProtection = async () => {
        if (!diary) return;
        const savedPassword = await getDiaryPassword(diary.id);
        if (unlockInput !== savedPassword) {
            setUnlockError('Incorrect password.');
            return;
        }

        await removeDiaryPassword(diary.id);
        await updateDiaryProtectionFlag(false);

        setUnlockModalVisible(false);
        setUnlockInput('');
        setUnlockError('');
    };

    const handleDelete = () => {
        Alert.alert(
            t('delete_diary'),
            t('are_sure_diary_entries'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const diaryId = params.diaryId || params.id;
                            await NotificationService.cancelDiaryNotification(diaryId);

                            const diaryData = await AsyncStorage.getItem('diarys');
                            if (diaryData) {
                                const diarys = JSON.parse(diaryData);
                                const updatedDiarys = diarys.filter((d: Diary) => d.id !== diaryId);
                                await AsyncStorage.setItem('diarys', JSON.stringify(updatedDiarys));

                                if (Platform.OS === 'android') {
                                    ToastAndroid.show(
                                        t('diary_deleted') || 'Diary deleted successfully',
                                        ToastAndroid.SHORT
                                    );
                                }
                                router.replace('/diary');
                            }
                        } catch (error) {
                            console.error('Error deleting diary:', error);
                            Alert.alert(t('error') || 'Error', t('delete_error') || 'Failed to delete diary');
                        }
                    },
                },
            ]
        );
    };

    const handleEdit = () => {
        router.push({
            pathname: '/diary/new',
            params: { id: diary?.id }
        });
    };

    const handleOpenUrl = (url: string) => {
        if (url) {
            let formattedUrl = url;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                formattedUrl = 'https://' + url;
            }
            Linking.openURL(formattedUrl).catch(() => {
                Alert.alert('Error', 'Unable to open URL');
            });
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'Not set';
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const handleBackPress = async () => {
        try {
            const isPremium = await PurchaseManager.isPremium();
            if (isPremium) {
                router.replace("/diary");
                return;
            } else {
                setTimeout(async () => {
                    await AdsManager.showDetailScreenInterstitialAd('Diarydetailback');
                }, 100);
                router.replace("/diary");
            }
        } catch (error) {
            console.error("Back press error:", error);
            router.replace("/diary");
        }
    };

    const formatTime = (timeValue: string | number) => {
        if (!timeValue) return 'Not set';
        try {
            const time = new Date(parseInt(String(timeValue)));
            if (isNaN(time.getTime())) return 'Not set';
            return time.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: !is24Hour
            });
        } catch (error) {
            return 'Not set';
        }
    };

    if (!diary) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.loadingContainer}>
                    <Text style={[styles.loadingText, { color: colors.textPrimary }]}>Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header]}>
                <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
                    <View style={[styles.closeBtnCircle, { backgroundColor: colors.cardBackground }]}>
                        <Ionicons name="chevron-back" size={28} color={colors.textSecondary} />
                    </View>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t("diary_details")}</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={handleLockIconPress} style={styles.headerButton}>
                        <Feather
                            name={diary.passwordProtected ? 'unlock' : 'lock'}
                            size={22}
                            color={diary.passwordProtected ? '#4CAF50' : colors.textPrimary}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleEdit} style={styles.headerButton}>
                        <Feather name="edit" size={22} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
                        <Feather name="trash-2" size={22} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={[styles.challengeHeader, { backgroundColor: colors.cardBackground }]}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
                        <Text style={styles.icon}>{diary.icon}</Text>
                    </View>
                    <View style={styles.challengeInfo}>
                        <Text style={[styles.challengeTitle, { color: colors.textPrimary }]}>{diary.title}</Text>
                        <View style={styles.infoGrid}>
                            <Text style={[styles.infoValue, { color: colors.textSecondary }]}>
                                {formatDate(diary.Date)}
                            </Text>
                            <Text style={[styles.infoValue, { color: colors.textSecondary }]}>
                                {formatTime(diary.reminder)}
                            </Text>
                        </View>
                    </View>
                </View>

                {diary.location ? (
                    <View style={[styles.detailRow, { backgroundColor: colors.cardBackground }]}>
                        <View style={styles.detailItem}>
                            <View style={styles.leftSide}>
                                <View style={[styles.iconCircle, { backgroundColor: '#FF9800' + '20' }]}>
                                    <Feather name="map-pin" size={18} color="#FF9800" />
                                </View>
                                <View style={styles.detailTextContainer}>
                                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Location</Text>
                                    <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                                        {diary.location}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                ) : null}

                {diary.url ? (
                    <TouchableOpacity
                        style={[styles.detailRow, { backgroundColor: colors.cardBackground }]}
                        onPress={() => handleOpenUrl(diary.url)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.detailItem}>
                            <View style={styles.leftSide}>
                                <View style={[styles.iconCircle, { backgroundColor: '#9C27B0' + '20' }]}>
                                    <Feather name="link" size={18} color="#9C27B0" />
                                </View>
                                <View style={styles.detailTextContainer}>
                                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>URL</Text>
                                    <Text style={[styles.detailValue, { color: '#2196F3' }]} numberOfLines={1}>
                                        {diary.url}
                                    </Text>
                                </View>
                            </View>
                            <Feather name="external-link" size={16} color={colors.textSecondary} />
                        </View>
                    </TouchableOpacity>
                ) : null}
            </ScrollView>

            {bannerConfig?.show && (
                <View style={styles.stickyAdContainer}>
                    <GAMBannerAd
                        unitId={bannerConfig.id}
                        sizes={[BannerAdSize.ANCHORED_ADAPTIVE_BANNER]}
                        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
                    />
                </View>
            )}

            {/* Set Password Modal */}
            <Modal visible={passwordModalVisible} transparent animationType="fade" onRequestClose={() => setPasswordModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalBox, { backgroundColor: colors.cardBackground }]}>
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('SetPassword')}</Text>
                        <TextInput
                            style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.border }]}
                            placeholder={t('Enterpassword')}
                            placeholderTextColor={colors.textTertiary}
                            secureTextEntry
                            value={passwordInput}
                            onChangeText={setPasswordInput}
                        />
                        <TextInput
                            style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.border }]}
                            placeholder={t('Confirmpassword')}
                            placeholderTextColor={colors.textTertiary}
                            secureTextEntry
                            value={confirmPasswordInput}
                            onChangeText={setConfirmPasswordInput}
                        />
                        <View style={styles.modalButtonRow}>
                            <TouchableOpacity style={styles.modalButton} onPress={() => setPasswordModalVisible(false)}>
                                <Text style={{ color: colors.textSecondary }}>{t('cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.primary }]} onPress={handleSavePassword}>
                                <Text style={{ color: '#fff', fontWeight: '700' }}>{t('Save')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Remove Password Modal */}
            <Modal visible={unlockModalVisible} transparent animationType="fade" onRequestClose={() => setUnlockModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalBox, { backgroundColor: colors.cardBackground }]}>
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('RemovePasswordProtection')}</Text>
                        <TextInput
                            style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.border }]}
                            placeholder={t('currentpassword')}
                            placeholderTextColor={colors.textTertiary}
                            secureTextEntry
                            value={unlockInput}
                            onChangeText={setUnlockInput}
                        />
                        {!!unlockError && <Text style={{ color: '#FF6B6B', marginBottom: 8 }}>{unlockError}</Text>}
                        <View style={styles.modalButtonRow}>
                            <TouchableOpacity style={styles.modalButton} onPress={() => setUnlockModalVisible(false)}>
                                <Text style={{ color: colors.textSecondary }}>{t('cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.primary }]} onPress={handleRemoveProtection}>
                                <Text style={{ color: '#fff', fontWeight: '700' }}>{t('Unlock')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    challengeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 24,
        borderRadius: 15,
        marginBottom: 10,
    },
    stickyAdContainer: { width: '100%', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    iconContainer: {
        width: 50, height: 50, borderRadius: 30,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 15, marginLeft: 15,
    },
    backButton: { padding: 4 },
    icon: { fontSize: 32 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    modalBox: { width: '100%', borderRadius: 16, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
    modalInput: {
        borderWidth: 1, borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 10,
        marginBottom: 12, fontSize: 15,
    },
    modalButtonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 8 },
    modalButton: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10 },
    headerTitle: { fontSize: 20, fontWeight: '600', flex: 1, textAlign: 'center' },
    headerActions: { flexDirection: 'row', gap: 16 },
    headerButton: {},
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { fontSize: 16 },
    challengeInfo: { flex: 1 },
    challengeTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
    challengeDate: { fontSize: 14, color: '#888' },
    closeBtnCircle: { width: 40, height: 40, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
    content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
    infoGrid: { flexDirection: 'row', gap: 16 },
    infoValue: { fontSize: 14, fontWeight: '500' },
    detailRow: { padding: 16, borderRadius: 12, marginBottom: 12 },
    detailItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    leftSide: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    detailTextContainer: { flex: 1 },
    detailLabel: { fontSize: 12, marginBottom: 2 },
    detailValue: { fontSize: 15, fontWeight: '500' },
});