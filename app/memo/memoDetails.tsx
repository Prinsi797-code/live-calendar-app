import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from "react-i18next";
import {
    Alert,
    Dimensions, Linking,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
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

interface Memo {
    id: string;
    title: string;
    details: string;
    Date: string;
    reminder: string;
    completed: boolean;
    location: string;
    url: string;
}

export default function MemoDetailsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { t } = useTranslation();
    const searchParams = useLocalSearchParams();
    const { colors } = useTheme();
    const [isPremium, setIsPremium] = useState(false);
    const { width } = Dimensions.get('window');
    const [is24Hour, setIs24Hour] = useState(false);
    useScreenTracking('memo_details_screen');
    const [bannerConfig, setBannerConfig] = useState<{
        show: boolean;
        id: string;
        position: string;
    } | null>(null);

    useEffect(() => {
        const checkPremium = async () => {
            const premium = await PurchaseManager.isPremium();
            setIsPremium(premium);
        };
        checkPremium();
    }, []);

    useEffect(() => {
        const config = AdsManager.getBannerConfig('event');
        setBannerConfig(config);
    }, []);

    const [memo, setMemo] = useState<Memo | null>(null);

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

    const loadMemo = async () => {
        try {
            const memoId = params.memoId || params.id;
            console.log('Loading memo with ID:', memoId);

            const memoData = await AsyncStorage.getItem('memo');
            if (memoData) {
                const memos = JSON.parse(memoData);
                const foundMemo = memos.find((c: Memo) => c.id === memoId);
                if (foundMemo) {
                    console.log('Memo loaded:', foundMemo.title);
                    setMemo(foundMemo);
                } else {
                    console.log('Memo not found');
                }
            }
        } catch (error) {
            console.error('Error loading memo:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadMemo();
        }, [params.memoId, params.id])
    );

    const handleDelete = () => {
        Alert.alert(
            t('delete_memo_title'),
            t('delete_memo_message'),
            [
                {
                    text: t('cancel'),
                    style: 'cancel',
                },
                {
                    text: t('delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const memoId = params.memoId || params.id;
                            await NotificationService.cancelMemoNotification(memoId);
                            console.log('Memo notification cancelled for ID:', memoId);

                            const memoData = await AsyncStorage.getItem('memo');
                            if (memoData) {
                                const memos = JSON.parse(memoData);
                                const updatedMemos = memos.filter(
                                    (c: Memo) => c.id !== memoId
                                );
                                await AsyncStorage.setItem(
                                    'memo',
                                    JSON.stringify(updatedMemos)
                                );
                                // router.back();
                                if (searchParams?.from === '/memoDetails') {
                                    router.replace('/memo');
                                } else {
                                    router.replace('/memo');
                                }
                            }
                        } catch (error) {
                            console.error('Error deleting memo:', error);
                            Alert.alert('Error', 'Failed to delete memo');
                        }
                    },
                },
            ]
        );
    };

    const handleEdit = () => {
        router.push({
            pathname: '/memo/new',
            params: { id: memo?.id }
        });
    };

    // const handleBackPress = async () => {
    //     if (searchParams?.from === "/memoDetails") {
    //         router.replace("/memo");
    //     } else {
    //         router.replace("/memo");
    //     }
    // };

    const handleBackPress = async () => {
        try {
            const isPremium = await PurchaseManager.isPremium();

            if (isPremium) {
                console.log('👑 Premium user — skipping cancel ad');
                router.back();
                return;
            } else {
                console.log('Memo detail back pressed, attempting to show ad...');

                setTimeout(async () => {
                    await AdsManager.showDetailScreenInterstitialAd('memodetailback');
                }, 100);

                // const adShown = await AdsManager.showDetailScreenInterstitialAd('memodetailback');
                // if (adShown) {
                //     console.log('Memo detail back ad shown, navigating after ad closes');
                // }
                router.replace("/memo");
            }
        } catch (error) {
            console.error("Back press error:", error);
            router.replace("/memo");
        }
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

    const formatTime = (timeValue: string | number) => {
        if (!timeValue) return 'Not set';

        try {
            const time = new Date(parseInt(String(timeValue)));

            if (isNaN(time.getTime())) {
                return 'Not set';
            }

            return time.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: !is24Hour
            });
        } catch (error) {
            console.error('Error formatting time:', timeValue, error);
            return 'Not set';
        }
    };

    if (!memo) {
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
                    {/* <Feather name="arrow-left" size={24} color={colors.textPrimary} /> */}
                    <View style={[styles.closeBtnCircle, { backgroundColor: colors.cardBackground }]}>
                        {/* <Text style={[styles.closeBtnX, { color: colors.textPrimary }]}>✕</Text> */}
                        <Ionicons name="chevron-back" size={28} color={colors.textSecondary} />
                    </View>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t("memo_details")}</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        onPress={handleEdit}
                        style={styles.headerButton}
                    >
                        <Feather name="edit" size={22} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleDelete}
                        style={styles.headerButton}
                    >
                        <Feather name="trash-2" size={22} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>
            </View>


            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Title Section */}
                <View style={[styles.titleSection, { backgroundColor: colors.cardBackground }]}>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>{memo.title}</Text>
                    <View style={styles.infoGrid}>
                        <Text style={[styles.infoValue, { color: colors.textSecondary }]}>
                            {formatDate(memo.Date)}
                        </Text>
                        <Text style={[styles.infoValue, { color: colors.textSecondary }]}>
                            {formatTime(memo.reminder)}
                        </Text>
                    </View>
                </View>

                {/* Details Section */}
                {memo.details ? (
                    <View style={[styles.detailsSection, { backgroundColor: colors.cardBackground }]}>
                        <Text style={[styles.detailsText, { color: colors.textPrimary }]}>{memo.details}</Text>
                    </View>
                ) : null}
                {/* Location Section */}
                {memo.location ? (
                    <View style={[styles.detailRow, { backgroundColor: colors.cardBackground }]}>
                        <View style={styles.detailItem}>
                            <View style={styles.leftSide}>
                                <View style={[styles.iconCircle, { backgroundColor: '#FF9800' + '20' }]}>
                                    <Feather name="map-pin" size={18} color="#FF9800" />
                                </View>
                                <View style={styles.detailTextContainer}>
                                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('location')}</Text>
                                    <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                                        {memo.location}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                ) : null}

                {/* URL Section */}
                {memo.url ? (
                    <TouchableOpacity
                        style={[styles.detailRow, { backgroundColor: colors.cardBackground }]}
                        onPress={() => handleOpenUrl(memo.url)}
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
                                        {memo.url}
                                    </Text>
                                </View>
                            </View>
                            <Feather name="external-link" size={16} color={colors.textSecondary} />
                        </View>
                    </TouchableOpacity>
                ) : null}
            </ScrollView>
            {/* {bannerConfig?.show && (
                <View style={styles.stickyAdContainer}>
                    <GAMBannerAd
                        unitId={bannerConfig.id}
                        sizes={[BannerAdSize.BANNER]}
                        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
                    />
                </View>
            )} */}
            {bannerConfig?.show && !isPremium && (
                <View style={styles.stickyAdContainer}>
                    <GAMBannerAd
                        unitId={bannerConfig.id}
                        sizes={[BannerAdSize.ANCHORED_ADAPTIVE_BANNER]}
                        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
                    />
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    stickyAdContainer: {
        marginTop: 20,
        width: '100%',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        flex: 1,
        textAlign: 'center',
        // marginLeft: 12,
    },
    closeBtnCircle: {
        width: 40, height: 40, borderRadius: 50,
        alignItems: 'center', justifyContent: 'center',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 16,
    },
    headerButton: {
        // padding: 4,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    titleSection: {
        padding: 20,
        borderRadius: 12,
        marginBottom: 16,
    },
    title: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    detailsSection: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    detailsText: {
        fontSize: 15,
        lineHeight: 22,
    },
    infoGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    infoCard: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    infoIconContainer: {
        marginBottom: 8,
    },
    infoLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    infoValue: {
        marginTop: 5,
        fontSize: 14,
        fontWeight: '600',
    },
    detailRow: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    leftSide: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    detailTextContainer: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 12,
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 15,
        fontWeight: '500',
    },
});