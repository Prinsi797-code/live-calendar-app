import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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

interface ChallengeOption {
    id: string;
    title: string;
    subtitle: string;
    icon: string;
}

const eatChallenges: ChallengeOption[] = [
    {
        id: 'breakfast',
        title: 'have_great_breakfast',
        subtitle: 'breakfast_can_help',
        icon: 'coffee-outline',
    },
    {
        id: 'lunch',
        title: 'packed_lunches',
        subtitle: 'provide_energy_and_nutrients',
        icon: 'food',
    },
    {
        id: 'fish',
        title: 'eat_fish',
        subtitle: 'an_important_source',
        icon: 'fish',
    },
    {
        id: 'beef',
        title: 'eat_beef',
        subtitle: "it_excellent_source",
        icon: 'food-steak',
    },
    {
        id: 'vitamins',
        title: 'take_multivitamins',
        subtitle: 'refuce_stress_anxiety',
        icon: 'pill',
    },
    {
        id: 'cakes',
        title: 'have_cakes',
        subtitle: 'helps_with_digestion',
        icon: 'cake-variant',
    },
    {
        id: 'tea',
        title: 'daily_cup_tea',
        subtitle: 'tea_may_reduce_risk',
        icon: 'tea-outline',
    },
    {
        id: 'water',
        title: 'drink_water',
        subtitle: 'regulate_body_temperature',
        icon: 'cup-water',
    },
    {
        id: 'beans',
        title: 'add_beans_day',
        subtitle: 'beans_are_high',
        icon: 'circle',
    },
    {
        id: 'apple',
        title: 'an_apple_day',
        subtitle: 'support_healthy',
        icon: 'apple',
    },
    {
        id: 'bananas',
        title: 'eat_bananas',
        subtitle: 'bananas_are_one_of',
        icon: 'fruit-pineapple',
    },
    {
        id: 'cheese',
        title: 'add_cheese_to_meals',
        subtitle: 'you_gain_weiight_helthy',
        icon: 'cheese',
    },
    {
        id: 'clean',
        title: 'eat_clean_eat',
        subtitle: 'eat_plenty_every',
        icon: 'leaf',
    },
    {
        id: 'everyday',
        title: 'a_glass_of_fruit',
        subtitle: 'it_great_way_add',
        icon: 'cup',
    },
    {
        id: 'egg',
        title: 'eat_egg',
        subtitle: 'eggs_provide_the_highest',
        icon: 'egg',
    },
    {
        id: 'body',
        title: 'bread_fuels_your_body',
        subtitle: 'bread_contains_fiber',
        icon: 'bread-slice',
    },
    {
        id: 'carrots',
        title: 'eat_carrots',
        subtitle: 'boosts_eye_health',
        icon: 'food',
    },
    {
        id: 'avocados',
        title: 'have_avocados',
        subtitle: 'it_lowers_the_risk',
        icon: 'fruit-grapes-outline',
    },
    {
        id: 'shrimps',
        title: 'eat_shrimps',
        subtitle: 'promote_brain_health',
        icon: 'fish',
    },
    {
        id: 'daily',
        title: 'mushrooms_your_daliy',
        subtitle: 'boosts_immune_system',
        icon: 'mushroom-outline',
    },
];


export default function EatHealthyScreen() {
    const router = useRouter();
    const { from } = useLocalSearchParams();
    const { t } = useTranslation();
    const { theme, colors } = useTheme();
    const [bannerConfig, setBannerConfig] = useState<{
        show: boolean;
        id: string;
        position: string;
    } | null>(null);

    // useEffect(() => {
    //     const config = AdsManager.getBannerConfig('home');
    //     setBannerConfig(config);
    // }, []);

    useEffect(() => {
        const loadBannerConfig = async () => {
            const config = await AdsManager.getBannerConfig('main');
            console.log('challenge eat screen banner config:', config);
            setBannerConfig(config);
        };
        loadBannerConfig();
    }, []);


    const handleChallengeSelect = (challenge: ChallengeOption) => {
        router.push({
            pathname: '/challenge/new',
            params: {
                title: t(challenge.title),
                icon: challenge.icon,
                category: 'eat'
            }
        });
    };

    const handleBackPress = async () => {
        try {
            if (from === "eat") {
                router.replace("/challenge/create");
            } else {
                router.replace("/challenge/create");
            }
        } catch (error) {
            console.error("Error showing back ad:", error);
            if (from === "eat") {
                router.replace("/challenge/create");
            } else {
                router.replace("/challenge/create");
            }
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.leftContainer}>
                    <TouchableOpacity
                        onPress={handleBackPress}
                        style={styles.backButton}
                    >
                        {/* <Feather name="arrow-left" size={24} color={colors.textPrimary} /> */}
                        <View style={[styles.closeBtnCircle, { backgroundColor: colors.cardBackground }]}>
                            <Ionicons name="chevron-back" size={26} color={colors.textSecondary} />
                        </View>
                    </TouchableOpacity>

                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                        {t("eat_healthy")}
                    </Text>
                </View>
            </View>
            <ScrollView style={styles.scrollView}>
                <View style={styles.challengesList}>
                    {eatChallenges.map((challenge) => (
                        <TouchableOpacity
                            key={challenge.id}
                            style={[styles.challengeCard, { backgroundColor: colors.cardBackground }]}
                            activeOpacity={0.7}
                            onPress={() => handleChallengeSelect(challenge)}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: colors.cardBackground }]}>
                                <MaterialCommunityIcons
                                    name={challenge.icon}
                                    size={24}
                                    color={colors.textPrimary}

                                />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={[styles.challengeTitle, { color: colors.textPrimary }]}>
                                    {t(challenge.title)}
                                </Text>
                                <Text style={[styles.challengeSubtitle, { color: colors.textSecondary }]}>
                                    {t(challenge.subtitle)}
                                </Text>
                            </View>
                        </TouchableOpacity>

                    ))}
                </View>
            </ScrollView>
            {bannerConfig?.show && (
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
    stickyAdContainer: {
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
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        padding: 4,
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
    },
    placeholder: {
        width: 32,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 16,
    },
    closeBtnCircle: {
        width: 40, height: 40, borderRadius: 50,
        alignItems: 'center', justifyContent: 'center',
    },
    challengesList: {
        paddingVertical: 16,
        gap: 12,
    },
    challengeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 16,
    },
    iconContainer: {
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    iconText: {
        fontSize: 24,
    },
    textContainer: {
        flex: 1,
    },
    challengeTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    challengeSubtitle: {
        fontSize: 13,
        lineHeight: 18,
    },
});