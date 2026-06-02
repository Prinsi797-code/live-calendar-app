import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from "react-i18next";
import { Alert, Image, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
    BannerAdSize,
    GAMBannerAd
} from 'react-native-google-mobile-ads';
import { useTheme } from '../contexts/ThemeContext';
import { COUNTRIES } from '../data/countries';
import { useScreenTracking } from '../hooks/useScreenTracking';
import AdsManager from '../services/adsManager';
import NotificationService from '../services/NotificationService';
import PurchaseManager from '../services/purchaseManager';

export default function ViewEventScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { colors, theme, resolvedTheme } = useTheme();
    const [is24Hour, setIs24Hour] = React.useState(false);
    const searchParams = useLocalSearchParams();
    const { t, i18n } = useTranslation();
    const [isPremium, setIsPremium] = useState(false);
    useScreenTracking('event_detail_screen');

    const lightNoEventImg = require("../assets/images/event1.png");
    const darkNoEventImg = require("../assets/images/event2.png");

    const [bannerConfig, setBannerConfig] = useState<{
        show: number;
        id: string;
    } | null>(null);

    useEffect(() => {
        const checkPremium = async () => {
            const premium = await PurchaseManager.isPremium();
            setIsPremium(premium);
        };
        checkPremium();
    }, []);

    const eventData = {
        id: params.eventId as string,
        title: params.title as string,
        description: params.description as string,
        startDate: params.startDate as string,
        endDate: params.endDate as string,
        startTime: params.startTime as string,
        endTime: params.endTime as string,
        allDay: params.allDay === 'true',
        repeat: params.repeat as string,
        reminders: params.reminders ? JSON.parse(params.reminders as string) : [],
        color: params.color as string || '#0267FF',
        isHoliday: params.isHoliday === 'true',
        country: params.country || '',
        bgImage: params.bgImage as string || null,
    };

    React.useEffect(() => {
        const checkFormat = async () => {
            const manual = await AsyncStorage.getItem('user_manual_24hour_override');
            setIs24Hour(manual === 'true');
        };
        checkFormat();
    }, []);

    // Get translated country name
    const translatedCountryName = useMemo(() => {
        if (!eventData.country) return '';

        const country = COUNTRIES.find(c => c.name === eventData.country);
        if (country && country.translationKey) {
            return t(country.translationKey);
        }
        return eventData.country;
    }, [eventData.country, i18n.language]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    const formatTime = (timeValue: string) => {
        // Convert milliseconds to Date object
        const time = new Date(parseInt(timeValue));

        if (isNaN(time.getTime())) {
            return timeValue; // Return original if invalid
        }

        return time.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: !is24Hour
        });
    };

    const getRepeatText = (repeat: string) => {
        const repeatMap: any = {
            'does_not': 'Does not repeat',
            'everyday': 'Everyday',
            'every_week': 'Every week',
            'every_month': 'Every month',
            'every_year': 'Every year',
        };
        return repeatMap[repeat] || repeat;
    };

    useEffect(() => {
        const config = AdsManager.getBannerConfig('event');
        setBannerConfig(config);
    }, []);

    const handleEdit = () => {
        router.push({
            pathname: '/editEvent',
            params: {
                eventId: eventData.id,
                title: eventData.title,
                description: eventData.description,
                startDate: eventData.startDate,
                endDate: eventData.endDate,
                startTime: eventData.startTime,
                endTime: eventData.endTime,
                allDay: String(eventData.allDay),
                repeat: eventData.repeat,
                reminders: JSON.stringify(eventData.reminders),
                color: eventData.color,
                bgImage: eventData.bgImage || '',
            }
        });
    };
    const bgImageMap: { [key: string]: any } = {
        'light': require('../assets/temp/light.jpeg'),
        'light1': require('../assets/temp/light1.jpeg'),
        'light2': require('../assets/temp/light2.jpeg'),
        'light3': require('../assets/temp/light3.jpeg'),
        'light4': require('../assets/temp/light4.jpeg'),
        'light5': require('../assets/temp/light5.jpeg'),
        'light6': require('../assets/temp/light6.jpeg'),
        'light7': require('../assets/temp/light7.jpeg'),
        'light8': require('../assets/temp/light8.jpeg'),
        'dark': require('../assets/temp/dark.jpeg'),
        'dark1': require('../assets/temp/dark1.jpeg'),
        'dark2': require('../assets/temp/dark2.jpeg'),
        'dark3': require('../assets/temp/dark3.jpeg'),
        'dark4': require('../assets/temp/dark4.jpeg'),
        'dark5': require('../assets/temp/dark5.jpeg'),
        'dark6': require('../assets/temp/dark6.jpeg'),
        'dark7': require('../assets/temp/dark7.jpeg'),
        'dark8': require('../assets/temp/dark8.jpeg'),
    };
    const currentPrefix = resolvedTheme === 'dark' ? 'dark' : 'light';
    const templateBgImage = (eventData.bgImage && eventData.bgImage.startsWith(currentPrefix))
        ? bgImageMap[eventData.bgImage]
        : null;
    console.log("eventData.bgImage:", eventData.bgImage);
    console.log("templateBgImage:", templateBgImage);

    const handleCancel = async () => {
        const isPremium = await PurchaseManager.isPremium();

        if (isPremium) {
            console.log('👑 Premium user — skipping cancel ad');
            router.back();
            return;
        }

        const adShown = await AdsManager.showDetailScreenInterstitialAd('eventdetailback');

        if (adShown) {
            setTimeout(() => {
                // resetForm();
                // router.setParams({ maintainView: 'true' });
                router.back();
            }, 500);
        } else {
            // resetForm();
            // router.setParams({ maintainView: 'true' });
            router.back();
        }
    };
    const handleDelete = () => {
        Alert.alert(
            t('delete_event_title') || 'Delete Event',
            t('delete_event_message') || 'Are you sure you want to delete this event?',
            [
                {
                    text: t('cancel') || 'Cancel',
                    style: 'cancel',
                },
                {
                    text: t('delete') || 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const eventId = params.eventId || params.id;

                            // Cancel all notifications (scheduled + lock screen)
                            await NotificationService.cancelEventNotification(eventId);
                            console.log('✅ Event notification cancelled for ID:', eventId);

                            // Delete event from storage
                            const eventData = await AsyncStorage.getItem('events');
                            if (eventData) {
                                const events = JSON.parse(eventData);
                                const updatedEvents = events.filter(
                                    (e: any) => e.id !== eventId
                                );
                                await AsyncStorage.setItem(
                                    'events',
                                    JSON.stringify(updatedEvents)
                                );
                                console.log('✅ Event deleted from storage');
                            }

                            // Navigate back
                            if (searchParams?.from === '/viewEvent') {
                                router.replace('/(tabs)');
                            } else {
                                router.back();
                            }
                        } catch (error) {
                            console.error('❌ Error deleting event:', error);
                            Alert.alert(
                                t('error') || 'Error',
                                t('delete_failed') || 'Failed to delete event'
                            );
                        }
                    },
                },
            ]
        );
    };

    const handleShare = async () => {
        try {
            const message = `${t("title")}:- ${eventData.title}
${t("date")}:- ${formatDate(eventData.startDate)}${eventData.startDate !== eventData.endDate
                    ? ` - ${formatDate(eventData.endDate)}`
                    : ""
                }
${eventData.allDay
                    ? `${t("time")}:- ${t("all_day")}`
                    : `${t("time")}:- ${formatTime(eventData.startTime)} - ${formatTime(eventData.endTime)}`
                }
${eventData.description ? `${t("note")}:- ${eventData.description}\n` : ""}
${eventData.repeat ? `${t("repeat")}:- ${t(eventData.repeat) || getRepeatText(eventData.repeat)}\n` : ""}
${translatedCountryName ? `${t("country")}:- ${translatedCountryName}` : ""}`;

            await Share.share({
                message,
                title: eventData.title,
            });
        } catch (error) {
            console.error("Error sharing event:", error);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background, }]}>
            {templateBgImage && (
                <Image
                    source={templateBgImage}
                    style={styles.fullBgImage}
                    resizeMode="cover"
                />
            )}
            {templateBgImage && (
                <Image
                    // source={
                    //     resolvedTheme === 'dark'
                    //         ? require('../assets/temp/dark.jpeg')
                    //         : require('../assets/temp/light.jpeg')
                    // }
                    style={[
                        styles.fullBgOverlay,
                        // resolvedTheme !== 'dark' && { opacity: 0.10 }
                    ]}
                    resizeMode="cover"
                />
            )}

            {/* Header */}
            <View style={[styles.header, { backgroundColor: templateBgImage ? 'transparent' : colors.background }]}>
                <TouchableOpacity
                    onPress={handleCancel}
                    // onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <View style={[styles.closeBtnCircle, { backgroundColor: colors.cardBackground }]}>
                        <Ionicons name="chevron-back" size={26} color={colors.textSecondary} />
                    </View>
                    {/* <Feather name="arrow-left" size={24} color={colors.textPrimary} /> */}
                </TouchableOpacity>

                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                    {t("event_details") || "Event details"}
                </Text>

                <View style={styles.headerActions}>
                    <TouchableOpacity
                        onPress={handleShare}
                        style={styles.iconButton}
                    >
                        <Feather name="share-2" size={22} color={colors.textPrimary} />
                    </TouchableOpacity>

                    {!eventData.isHoliday && (
                        <>
                            <TouchableOpacity
                                onPress={handleEdit}
                                style={styles.iconButton}
                            >
                                <Feather name="edit" size={22} color={colors.textPrimary} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleDelete}
                                style={styles.iconButton}
                            >
                                <Feather name="trash-2" size={22} color="#FF5252" />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>

            <ScrollView style={styles.content}>
                {/* Title */}
                <View style={[styles.section, { borderLeftColor: eventData.color }]}>
                    <Text style={[styles.eventTitle, { color: colors.textPrimary }]}>
                        {eventData.title}
                    </Text>
                </View>

                {/* Date & Time */}
                <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
                    <View style={styles.cardRow}>
                        <Feather name="clock" size={20} color={colors.textSecondary} />
                        <View style={styles.cardContent}>
                            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                                {eventData.allDay ? t("all_day") : `${formatTime(eventData.startTime)} - ${formatTime(eventData.endTime)}`}
                            </Text>

                            <Text style={[styles.cardValue, { color: colors.textPrimary }]}>
                                {formatDate(eventData.startDate)}
                                {eventData.startDate !== eventData.endDate && ` - ${formatDate(eventData.endDate)}`}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Repeat */}
                {/* {eventData.repeat && (
                    <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
                        <View style={styles.cardRow}>
                            <Feather name="repeat" size={20} color={colors.textSecondary} />
                            <View style={styles.cardContent}>
                                <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                                    {t("repeat") || "Repeat"}
                                </Text>
                                <Text style={[styles.cardValue, { color: colors.textPrimary }]}>
                                    {t(eventData.repeat) || getRepeatText(eventData.repeat)}
                                </Text>
                            </View>
                        </View>
                    </View>
                )} */}
                {eventData.repeat && !eventData.isHoliday && (
                    <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
                        <View style={styles.cardRow}>
                            <Feather name="repeat" size={20} color={colors.textSecondary} />
                            <View style={styles.cardContent}>
                                <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                                    {t("repeat") || "Repeat"}
                                </Text>
                                <Text style={[styles.cardValue, { color: colors.textPrimary }]}>
                                    {t(eventData.repeat) || getRepeatText(eventData.repeat)}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}
                {/* Reminder */}
                {(eventData.isHoliday || (eventData.reminders && eventData.reminders.length > 0)) && (
                    <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
                        <View style={styles.cardRow}>
                            <Feather name="bell" size={20} color={colors.textSecondary} />
                            <View style={styles.cardContent}>
                                <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                                    {t("alert") || "Alert"}
                                </Text>
                                <Text style={[styles.cardValue, { color: colors.textPrimary }]}>
                                    {eventData.isHoliday
                                        ? (is24Hour ? "12:01" : "12:01 AM")
                                        : eventData.reminders.map((r: string) => t(r)).join(', ')
                                    }
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Country */}
                {translatedCountryName && (
                    <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
                        <View style={styles.cardRow}>
                            <Feather name="map-pin" size={20} color={colors.textSecondary} />
                            <View style={styles.cardContent}>
                                <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                                    {t("country") || "Country"}
                                </Text>
                                <Text style={[styles.cardValue, { color: colors.textPrimary }]}>
                                    {translatedCountryName}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Note */}
                {eventData.description && (
                    <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
                        <View style={styles.cardRow}>
                            <Feather name="file-text" size={20} color={colors.textSecondary} />
                            <View style={styles.cardContent}>
                                <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                                    {t("note") || "Note"}
                                </Text>
                                <Text style={[styles.cardValue, { color: colors.textPrimary }]}>
                                    {eventData.description}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}
                {!templateBgImage && (
                    <View style={{ alignItems: "center", paddingVertical: 40 }}>
                        <Image
                            source={theme === "dark" ? darkNoEventImg : lightNoEventImg}
                            style={{ width: 300, height: 300, marginBottom: 12 }}
                            resizeMode="contain"
                        />
                    </View>
                )}

            </ScrollView>
            {/* Premium user ko banner nahi dikhega */}
            {bannerConfig?.show && !isPremium && (
                <View style={styles.stickyAdContainer}>
                    <GAMBannerAd
                        unitId={bannerConfig.id}
                        sizes={[BannerAdSize.ANCHORED_ADAPTIVE_BANNER]}
                        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 10,
    },
    stickyAdContainer: {
        bottom: 30,
        width: '100%',
        alignItems: 'center',
        zIndex: 2,

    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        paddingTop: 50,
        zIndex: 2,
    },
    fullBgImage: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        opacity: 0.5
    },
    fullBgOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
    },

    closeBtnCircle: {
        width: 40, height: 40, borderRadius: 50,
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 12,
    },
    iconButton: {
        // padding: 4,
    },
    content: {
        flex: 1,
        padding: 16,
        zIndex: 2,

    },
    section: {
        marginBottom: 20,
        borderLeftWidth: 4,
        paddingLeft: 16,
    },
    eventTitle: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    noDataText: {
        textAlign: 'center',
        fontSize: 16,
        marginTop: 32,
    },
    card: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.12,
        shadowRadius: 8,

    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    cardContent: {
        flex: 1,
    },
    bgImageContainer: {
        width: '100%',
        height: 200,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
        position: 'relative',
    },
    bgImage: {
        width: '100%',
        height: '100%',
    },
    bgOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        opacity: 0.6,
    },
    cardLabel: {
        fontSize: 14,
        marginBottom: 4,
    },
    cardValue: {
        fontSize: 16,
        lineHeight: 22,
    },
});