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
        id: 'job',
        title: 'find_job_opportunities',
        subtitle: 'develop_yourself',
        icon: 'briefcase-search',
    },
    {
        id: 'raise',
        title: 'raise_pet',
        subtitle: 'make_you_feel',
        icon: 'paw',
    },
    {
        id: 'chess',
        title: 'play_chess',
        subtitle: 'deepen_focus_elevate',
        icon: 'chess-knight',
    },
    {
        id: 'party',
        title: 'have_party',
        subtitle: 'meet_new_interesting',
        icon: 'party-popper',
    },
    {
        id: 'painting',
        title: 'learn_painting',
        subtitle: 'stimulates_attitude',
        icon: 'palette',
    },
    {
        id: 'trip',
        title: 'take_trip',
        subtitle: 'improves_communication',
        icon: 'airplane',
    },
    {
        id: 'trees',
        title: 'plant_trees',
        subtitle: 'trees_streets_city',
        icon: 'tree',
    },
    {
        id: 'friends',
        title: 'make_friends',
        subtitle: 'open_possibilities',
        icon: 'account-group',
    },
    {
        id: 'house',
        title: 'renew_house',
        subtitle: 'make_stand_out',
        icon: 'home-edit',
    },
    {
        id: 'talk',
        title: 'talk_yourself',
        subtitle: 'your_brain_efficiently',
        icon: 'chat-processing',
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
            console.log('weird screen banner config:', config);
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
            if (from === "challenge/weird") {
                router.replace("/challenge/create");
            } else {
                router.replace("/challenge/create");
            }
        } catch (error) {
            console.error("Error showing back ad:", error);
            if (from === "challenge/weird") {
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
                        {t("be_weird_you")}
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
    closeBtnCircle: {
        width: 40, height: 40, borderRadius: 50,
        alignItems: 'center', justifyContent: 'center',
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