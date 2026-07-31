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

const relaxChallenges: ChallengeOption[] = [
    {
        id: 'body',
        title: 'relax_your_mind',
        subtitle: 'relieve_anxiety_depression',
        icon: 'meditation',
    },
    {
        id: 'brushing',
        title: 'regular_tooth',
        subtitle: 'gear_up_for',
        icon: 'toothbrush',
    },
    {
        id: 'books',
        title: 'read_books',
        subtitle: 'strengthen_the_brain',
        icon: 'book-open-page-variant',
    },
    {
        id: 'sleep',
        title: 'get_enough_sleep',
        subtitle: 'reduce_strees_improve',
        icon: 'sleep',
    },
    {
        id: 'journal',
        title: 'Keep_journal',
        subtitle: 'allow_yourself_reflect',
        icon: 'notebook-edit-outline',
    },
    {
        id: 'shower',
        title: 'take_a_shower',
        subtitle: 'decreased_anxiety',
        icon: 'shower',
    },
    {
        id: 'music',
        title: 'listen_to_music',
        subtitle: 'provide_comfort_lessen',
        icon: 'music-note',
    },
    {
        id: 'smile',
        title: 'smile_everyday',
        subtitle: 'smiling_elevates_mood',
        icon: 'emoticon-happy-outline',
    },
    {
        id: 'chat',
        title: 'chat_with_friends',
        subtitle: 'reduce_pressure_life',
        icon: 'chat-outline',
    },
    {
        id: 'sleep2',
        title: 'sleep_early',
        subtitle: 'improve_your_memories',
        icon: 'bed-clock',
    },
    {
        id: 'media',
        title: 'break_away_from_media',
        subtitle: 'find_value_yourself',
        icon: 'cellphone-off',
    },
];


export default function RelaxationScreen() {
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
            console.log('relax screen banner config:', config);
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
                category: 'relax'
            }
        });
    };

    const handleBackPress = async () => {
        try {
            if (from === "relax") {
                router.replace("/challenge/create");
            } else {
                router.replace("/challenge/create");
            }
        } catch (error) {
            console.error("Error showing back ad:", error);
            if (from === "relax") {
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
                        style={styles.backButton}>
                        <View style={[styles.closeBtnCircle, { backgroundColor: colors.cardBackground }]}>
                            <Ionicons name="chevron-back" size={26} color={colors.textSecondary} />
                        </View>
                        {/* <Feather name="arrow-left" size={24} color={colors.textPrimary} /> */}
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                        {t("self_relaxation")}
                    </Text>
                </View>
            </View>
            <ScrollView style={styles.scrollView}>
                <View style={styles.challengesList}>
                    {relaxChallenges.map((challenge) => (
                        <TouchableOpacity
                            key={challenge.id}
                            style={[styles.challengeCard, { backgroundColor: colors.cardBackground }]}
                            activeOpacity={0.7}
                            onPress={() => handleChallengeSelect(challenge)}
                        >
                            <View style={styles.iconContainer}>
                                {/* <Text style={styles.iconText}>{challenge.icon}</Text> */}
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
        // position: 'absolute',
        // bottom: 60,
        width: '100%',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        // borderBottomWidth: 1,
        // borderBottomColor: '#2a2a2a',
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
        // width: 48,
        // height: 48,
        borderRadius: 24,
        // backgroundColor: '#f5f5f5',
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