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
        id: 'Tidy',
        title: 'tidy_up',
        subtitle: 'get_rid_piles',
        icon: 'broom',
    },
    {
        id: 'exercises',
        title: 'do_exercises',
        subtitle: 'feel_more_relaxed',
        icon: 'dumbbell',
    },
    {
        id: 'bed',
        title: 'make_your_bed',
        subtitle: 'improve_your_quality',
        icon: 'bed-outline',
    },
    {
        id: 'running',
        title: 'go_running',
        subtitle: "help_maintain_weight",
        icon: 'run',
    },
    {
        id: 'walk',
        title: 'go_for_walk',
        subtitle: 'stronger_bones',
        icon: 'walk',
    },
    {
        id: 'join',
        title: 'join_yoga_class',
        subtitle: 'improves_strength_flexibility',
        icon: 'yoga',
    },
    {
        id: 'cook',
        title: 'cook_at_home',
        subtitle: 'it_can_make_happier',
        icon: 'chef-hat',
    },
    {
        id: 'creatively',
        title: 'think_creatively',
        subtitle: 'become_better_problem',
        icon: 'lightbulb-on-outline',
    },
    {
        id: 'health',
        title: 'annual_health_check',
        subtitle: 'reduce_pressure_your_life',
        icon: 'stethoscope',
    },
    {
        id: 'hardbreak',
        title: 'break_bad_habits',
        subtitle: 'establish_pattern_new_habits',
        icon: 'emoticon-sad-outline',
    },
];


export default function EatHealthyScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const { from } = useLocalSearchParams();
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
            console.log('active screen banner config:', config);
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
            if (from === "challenge/active") {
                router.replace("/challenge/create");
            } else {
                router.replace("/challenge/create");
            }
        } catch (error) {
            console.error("Error showing back ad:", error);
            if (from === "challenge/active") {
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
                        <View style={[styles.closeBtnCircle, { backgroundColor: colors.cardBackground }]}>
                            <Ionicons name="chevron-back" size={26} color={colors.textSecondary} />
                        </View>
                        {/* <Feather name="arrow-left" size={24} color={colors.textPrimary} /> */}
                    </TouchableOpacity>

                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                        {t("be_active_my")}
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
    closeBtnCircle: {
        width: 40, height: 40, borderRadius: 50,
        alignItems: 'center', justifyContent: 'center',
    },
    placeholder: {
        width: 32,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 16,
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