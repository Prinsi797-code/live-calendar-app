import { Feather, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    BannerAdSize,
    GAMBannerAd
} from 'react-native-google-mobile-ads';
import { useTheme } from '../../contexts/ThemeContext';
import AdsManager from '../../services/adsManager';
import PurchaseManager from '../../services/purchaseManager';

interface CreateOption {
    id: string;
    title: string;
    icon: string;
    iconBg: string;
}

interface Category {
    id: string;
    title: string;
    subtitle: string;
    emoji: string;
}

const createOptions: CreateOption[] = [
    {
        id: 'regular',
        title: 'regular_habit',
        icon: 'calendar',
        iconBg: '#9333EA',
    },
    {
        id: 'onetime',
        title: 'one_time_task',
        icon: 'file-text',
        iconBg: '#F59E0B',
    },
];

const categories: Category[] = [
    {
        id: 'eat',
        title: 'eat_healthy',
        subtitle: 'eating_health',
        emoji: '🥗',
    },
    {
        id: 'relax',
        title: 'self_relaxation',
        subtitle: 'do_something',
        emoji: '🧘',
    },
    {
        id: 'active',
        title: 'be_active_my',
        subtitle: 'bunch_of_other',
        emoji: '🚴',
    },
    {
        id: 'weird',
        title: 'be_weird',
        subtitle: 'being_called',
        emoji: '🦄',
    },
    {
        id: 'connect',
        title: 'connect_with_others',
        subtitle: 'live_longer',
        emoji: '👥',
    },
    {
        id: 'improvement',
        title: 'self_improvement',
        subtitle: 'aware_of_your',
        emoji: '💡',
    },
];

export default function CreateScreen() {
    const router = useRouter();
    const { theme, colors } = useTheme();
    const searchParams = useLocalSearchParams();
    const { t } = useTranslation();
    const [isPremium, setIsPremium] = useState(false);
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
        const config = AdsManager.getBannerConfig('home');
        setBannerConfig(config);
    }, []);

    const handleCreateOption = (optionId: string) => {
        router.push({
            pathname: '/challenge/new',
            params: {
                type: optionId,
                from: 'challenge/create'
            }
        });
    };

    const handleCategory = (categoryId: string) => {
        const categoryPaths: { [key: string]: string } = {
            'eat': '/challenge/eat',
            'relax': '/challenge/relax',
            'active': '/challenge/active',
            'weird': '/challenge/weird',
            'connect': '/challenge/connect',
            'improvement': '/challenge/improvement',
        };

        const path = categoryPaths[categoryId];
        if (path) {
            router.push(path as any);
        }
    };

    // const handleBackPress = async () => {
    //     if (searchParams?.from === "challenge/create") {
    //         router.replace("/challenge");
    //     } else {
    //         router.replace("/challenge");
    //     }
    // };

    const handleBackPress = async () => {
        try {
            // Premium check
            const isPremium = await PurchaseManager.isPremium();

            if (!isPremium) {
                // Free user — ad dikhao
                console.log('Challenge detail back pressed, attempting to show ad...');
                const adShown = await AdsManager.showDetailScreenInterstitialAd('chalengedetailback');
                if (adShown) {
                    console.log('👑 Challenge detail back ad shown, navigating after ad closes');
                }
            } else {
                console.log('👑 Premium user — skipping ad');
            }

            if (searchParams?.from === "challenge/create") {
                router.replace("/challenge");
            } else {
                router.replace("/challenge");
            }
        } catch (error) {
            console.error("Error on back:", error);
            router.replace("/challenge");
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                {/* <View style={styles.leftContainer}> */}
                <TouchableOpacity
                    onPress={handleBackPress}
                    style={styles.backButton}
                >
                    <View style={[styles.closeBtnCircle, { backgroundColor: colors.cardBackground }]}>
                        <Ionicons name="chevron-back" size={26} color={colors.textSecondary} />
                    </View>
                    {/* <Feather name="arrow-left" size={24} color={colors.textPrimary} /> */}
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                    {t("create")}
                </Text>
                <View style={styles.backBtn} />
                {/* </View> */}
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Create your own section */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    {t("create_your_own")}
                </Text>

                <View style={styles.createOptionsContainer}>
                    {createOptions.map((option) => (
                        <TouchableOpacity
                            key={option.id}
                            style={[styles.createOptionCard, { backgroundColor: colors.cardBackground }]}
                            activeOpacity={0.7}
                            onPress={() => handleCreateOption(option.id)}
                        >
                            <View style={[styles.optionIconContainer, { backgroundColor: option.iconBg }]}>
                                <Feather name={option.icon as any} size={24} color="#fff" />
                            </View>
                            <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                                {t(option.title)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Categories section */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 24 }]}>
                    {t("choose_categories")}
                </Text>

                <View style={styles.categoriesContainer}>
                    {categories.map((category) => (
                        <TouchableOpacity
                            key={category.id}
                            style={[styles.categoryCard, { backgroundColor: colors.cardBackground }]}
                            activeOpacity={0.7}
                            onPress={() => handleCategory(category.id)}
                        >
                            <View style={styles.categoryContent}>
                                <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                                <View style={styles.categoryTextContainer}>
                                    <Text style={[styles.categoryTitle, { color: colors.textPrimary }]}>
                                        {t(category.title)}
                                    </Text>
                                    <Text style={[styles.categorySubtitle, { color: colors.textSecondary }]}>
                                        {t(category.subtitle)}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
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
                        sizes={[BannerAdSize.BANNER]}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        // justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        // marginTop: 50,
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    closeBtnCircle: {
        width: 40, height: 40, borderRadius: 50,
        alignItems: 'center', justifyContent: 'center',
    },
    backButton: {
        padding: 4,
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
    },
    placeholder: {
        width: 32,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 14,
        marginTop: 20,
        marginBottom: 12,
    },
    createOptionsContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    createOptionCard: {
        flex: 1,
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        minWidth: 70,
    },
    optionIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    optionTitle: {
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
    },
    categoriesContainer: {
        gap: 12,
        marginTop: 10,
        paddingBottom: 24,
    },
    stickyAdContainer: {
        width: '100%',
        alignItems: 'center',
    },
    categoryCard: {
        borderRadius: 12,
        padding: 16,
    },
    categoryContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    categoryEmoji: {
        fontSize: 40,
        marginRight: 16,
    },
    categoryTextContainer: {
        flex: 1,
    },
    categoryTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    categorySubtitle: {
        fontSize: 13,
        lineHeight: 18,
    },
});