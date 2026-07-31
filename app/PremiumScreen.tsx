import { Ionicons } from '@expo/vector-icons';
import { Subscription } from 'expo-iap';
import { router } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    Animated, Appearance, Dimensions,
    Image, Linking, Modal, ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import PurchaseManager, { SUBSCRIPTION_SKUS } from '../services/purchaseManager';

const { width } = Dimensions.get('window');
type PlanKey = 'yearly' | 'weekly' | 'monthly';

interface Plan {
    key: PlanKey;
    sku: string;
    label: string;
    fallbackPrice: string;
    sub: string;
    badge?: string;
    badgeColor?: string;
    discount: string;
    discountLabel: string;
    highlight: boolean;
}

const PLANS: Plan[] = [
    {
        key: 'yearly',
        sku: SUBSCRIPTION_SKUS.yearly,
        label: 'Yearly',
        fallbackPrice: '₹14,900',
        sub: 'Best annual deal',
        badge: 'Best value',
        badgeColor: '#FF5252',
        discount: '80% OFF',
        discountLabel: '',
        highlight: true,
    },
    {
        key: 'monthly',
        sku: SUBSCRIPTION_SKUS.monthly,
        label: 'Monthly',
        fallbackPrice: '₹1,999',
        sub: 'Per month',
        discount: '76% OFF',
        discountLabel: 'Recommend',
        highlight: true,

    },
    {
        key: 'weekly',
        sku: SUBSCRIPTION_SKUS.weekly,
        label: 'Weekly',
        fallbackPrice: '₹499',
        sub: 'Per week',
        discount: '39% OFF',
        discountLabel: 'Most Popular',
        highlight: true,
    },
];

export default function PremiumScreen() {
    const { theme, colors } = useTheme();

    const isDarkMode = theme === 'dark' || (theme === 'system' && Appearance.getColorScheme() === 'dark');
    const [selectedPlan, setSelectedPlan] = useState<PlanKey>('yearly');
    const [products, setProducts] = useState<Record<string, Subscription>>({});
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    const trialScaleAnim = useRef(new Animated.Value(1)).current;

    const [restoring, setRestoring] = useState(false);
    const [activePlanKey, setActivePlanKey] = useState<PlanKey | null>(null);

    const scaleAnim = useRef(new Animated.Value(1)).current;
    const { t } = useTranslation();
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const accent = '#FF5252';
    const activeGreen = '#4CAF50';
    const bg = colors.background;
    const cardBg = colors.cardBackground;
    const textPrimary = colors.textPrimary;
    const textSecondary = colors.textSecondary;


    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(trialScaleAnim, {
                    toValue: 1.15,
                    duration: 700,
                    useNativeDriver: true,
                }),
                Animated.timing(trialScaleAnim, {
                    toValue: 1,
                    duration: 700,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    useEffect(() => {
        initAndLoad();
        return () => { PurchaseManager.removeListeners(); };
    }, []);

    const getPlanKeyFromProductId = (productId: string): PlanKey | null => {
        if (productId.includes('yearly')) return 'yearly';
        if (productId.includes('monthly')) return 'monthly';
        if (productId.includes('weekly')) return 'weekly';
        return null;
    };

    const initAndLoad = async () => {
        try {
            setLoading(true);
            await PurchaseManager.initialize();

            PurchaseManager.setCallbacks(
                (productId) => {
                    setPurchasing(false);
                    const key = getPlanKeyFromProductId(productId);
                    if (key) setActivePlanKey(key);
                    setShowSuccessModal(true);
                },
                (error) => {
                    setPurchasing(false);
                    Alert.alert('Purchase Failed', error || 'Something went wrong.');
                }
            );

            const subs = await PurchaseManager.getSubscriptionProducts();
            const map: Record<string, Subscription> = {};
            subs.forEach((s) => { map[s.productId] = s; });
            setProducts(map);

            // Check existing active plan
            const premiumInfo = await PurchaseManager.getPremiumInfo();
            if (premiumInfo.isPremium && premiumInfo.productId) {
                const key = getPlanKeyFromProductId(premiumInfo.productId);
                if (key) setActivePlanKey(key);
            }

        } catch (err) {
            console.log('initAndLoad error:', err);
        } finally {
            setLoading(false);
        }
    };

    const getPriceForPlan = (plan: Plan): string => {
        const p = products[plan.sku];
        return (p as any)?.localizedPrice ?? (p as any)?.price ?? plan.fallbackPrice;
    };

    const handleSubscribe = useCallback(async () => {
        const selected = PLANS.find((p) => p.key === selectedPlan);
        if (!selected) return;

        if (activePlanKey === selectedPlan) {
            Alert.alert('Already Active', `You already have the ${selected.label} plan active.`);
            return;
        }

        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 0.96, duration: 100, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();

        setPurchasing(true);
        try {
            await PurchaseManager.purchaseSubscription(selected.sku);
        } catch {
            setPurchasing(false);
        } finally {
            setTimeout(() => setPurchasing(false), 30000);
        }

    }, [selectedPlan, scaleAnim, activePlanKey]);

    const handleRestore = async () => {
        setRestoring(true);
        try {
            const restored = await PurchaseManager.checkAndRestorePremium();
            if (restored) {
                const premiumInfo = await PurchaseManager.getPremiumInfo();
                if (premiumInfo.productId) {
                    const key = getPlanKeyFromProductId(premiumInfo.productId);
                    if (key) setActivePlanKey(key);
                }
                Alert.alert('Restored!', 'Premium has been restored.', [
                    { text: 'OK', onPress: () => router.back() },
                ]);
            } else {
                Alert.alert('Not Found', 'No active subscription found for this Apple ID.');
            }
        } catch {
            Alert.alert('Error', 'Could not restore. Please try again.');
        } finally {
            setRestoring(false);
        }
    };

    const getButtonLabel = () => {
        if (purchasing) return t("processing_button");
        if (activePlanKey === selectedPlan) return t("current_plan");
        if (activePlanKey && activePlanKey !== selectedPlan) return t("swift_plan");
        return t("subscribe_button");
    };

    const getButtonColor = () => {
        if (activePlanKey === selectedPlan) return activeGreen;
        return accent;
    };

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <StatusBar translucent backgroundColor="transparent" barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                {/* Hero */}
                <View style={styles.heroSection}>
                    <Image
                        source={isDarkMode
                            ? require('../assets/images/Frame2.png')
                            : require('../assets/images/Frame.png')
                        }
                        style={styles.heroImage}
                        resizeMode="cover"
                    />
                    <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                        <View style={[styles.closeBtnCircle, {
                            backgroundColor: isDarkMode ? 'rgba(67, 67, 67, 0.85)' : 'rgb(255, 255, 255)'
                        }]}>
                            <Ionicons name="close" size={25} color={textSecondary} />
                            {/* <Ionicons name="chevron-back" size={26} color={colors.textSecondary} /> */}
                        </View>
                    </TouchableOpacity>
                    <View style={styles.titleOverlay}>
                        <Text style={[styles.titleOverlayText, { color: isDarkMode ? '#FFFFFF' : '#383838' }]}>
                            {t("premium_features")}
                        </Text>
                    </View>
                </View>

                {loading && (
                    <View style={styles.loadingRow}>
                        <ActivityIndicator color={accent} />
                        <Text style={[styles.loadingText, { color: textSecondary }]}>Loading plans...</Text>
                    </View>
                )}

                {/* Plans */}
                <View style={styles.plansContainer}>
                    {PLANS.map((plan) => {
                        const isSelected = selectedPlan === plan.key;
                        const isActive = activePlanKey === plan.key;

                        return (
                            <TouchableOpacity
                                key={plan.key}
                                activeOpacity={0.8}
                                onPress={() => setSelectedPlan(plan.key)}
                                style={[
                                    styles.planCard,
                                    {
                                        backgroundColor: isActive
                                            ? colors.successBackground ?? 'cardBg'
                                            : isSelected
                                                ? colors.selectedBackground ?? cardBg
                                                : cardBg,

                                        borderColor: isActive
                                            ? activeGreen
                                            : isSelected
                                                ? accent
                                                : (isDarkMode ? '#333' : '#eeeeee'),
                                        borderWidth: isActive || isSelected ? 2 : 1,
                                    }
                                ]}
                            >
                                {/* Badge */}
                                {isActive ? (
                                    <View style={[styles.badge, { backgroundColor: activeGreen }]}>
                                        <Text style={styles.badgeText}>✓ Activated</Text>
                                    </View>
                                ) : plan.badge ? (
                                    <View style={[styles.badge, { backgroundColor: plan.badgeColor }]}>
                                        <Text style={styles.badgeText}>{plan.badge}</Text>
                                    </View>
                                ) : null}

                                <View style={styles.planRow}>
                                    {/* Radio */}
                                    <View style={[styles.radio, {
                                        borderColor: isActive
                                            ? activeGreen
                                            : isSelected
                                                ? accent
                                                : (isDarkMode ? '#555' : '#CCC')
                                    }]}>
                                        {(isSelected || isActive) && (
                                            <View style={[styles.radioDot, {
                                                backgroundColor: isActive ? activeGreen : accent
                                            }]} />
                                        )}
                                    </View>

                                    <View style={styles.planInfo}>
                                        <Text style={[styles.planLabel, { color: textPrimary }]}>
                                            {plan.label} : {getPriceForPlan(plan)}
                                        </Text>
                                        <Text style={[styles.planSub, {
                                            color: isActive ? activeGreen : textSecondary,
                                            fontWeight: isActive ? '600' : 'normal',
                                        }]}>
                                            {isActive ? '🟢 Your current plan' : plan.sub}
                                        </Text>
                                    </View>

                                    {/* <View style={styles.discountBox}>
                                        {isActive ? (
                                            <Ionicons name="checkmark-circle" size={28} color={activeGreen} />
                                        ) : plan.highlight ? (
                                            <View style={[styles.discountPill, { backgroundColor: accent }]}>
                                                <Text style={styles.discountPillText}>{plan.discount}</Text>
                                            </View>
                                        ) : (
                                            <View style={styles.discountTextBox}>
                                                <Text style={[styles.discountText, { color: textPrimary }]}>{plan.discount}</Text>
                                                <Text style={[styles.discountLabel, { color: textSecondary }]}>{plan.discountLabel}</Text>
                                            </View>
                                        )}
                                    </View> */}
                                    <View style={styles.discountBox}>
                                        {isActive ? (
                                            <Ionicons name="checkmark-circle" size={28} color={activeGreen} />
                                        ) : plan.highlight ? (
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <View style={[styles.discountPill, { backgroundColor: accent }]}>
                                                    <Text style={styles.discountPillText}>{plan.discount}</Text>
                                                </View>
                                                <Animated.View style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    marginTop: 5,
                                                    backgroundColor: '#E8F5E9',
                                                    paddingHorizontal: 7,
                                                    paddingVertical: 3,
                                                    borderRadius: 10,
                                                    transform: [{ scale: trialScaleAnim }],
                                                }}>
                                                    <Ionicons name="gift-outline" size={10} color="#2E7D32" />
                                                    <Text style={{
                                                        fontSize: 12,
                                                        color: '#2E7D32',
                                                        fontWeight: '700',
                                                        marginLeft: 2,
                                                    }}>
                                                        3-Day Free
                                                    </Text>
                                                </Animated.View>
                                            </View>
                                        ) : (
                                            <View style={styles.discountTextBox}>
                                                <Text style={[styles.discountText, { color: textPrimary }]}>{plan.discount}</Text>
                                                <Text style={[styles.discountLabel, { color: textSecondary }]}>{plan.discountLabel}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Subscribe / Switch / Current Plan Button */}
                <Animated.View style={[styles.subscribeWrap, { transform: [{ scale: scaleAnim }] }]}>
                    <TouchableOpacity
                        style={[
                            styles.subscribeBtn,
                            {
                                backgroundColor: getButtonColor(),
                                opacity: purchasing || loading ? 0.7 : 1,
                            }
                        ]}
                        onPress={handleSubscribe}
                        activeOpacity={0.9}
                        disabled={purchasing || loading}
                    >
                        {purchasing ? (
                            <ActivityIndicator color="#FFF" style={{ marginRight: 8 }} />
                        ) : activePlanKey === selectedPlan ? (
                            <Ionicons name="checkmark-circle" size={18} color="#FFF" style={{ marginRight: 8 }} />
                        ) : activePlanKey && activePlanKey !== selectedPlan ? (
                            <Ionicons name="swap-horizontal" size={18} color="#FFF" style={{ marginRight: 8 }} />
                        ) : (
                            <Ionicons name="diamond" size={18} color="#FFF" style={{ marginRight: 8 }} />
                        )}
                        <Text style={styles.subscribeBtnText}>
                            {getButtonLabel()}
                        </Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* Restore */}
                <TouchableOpacity onPress={handleRestore} disabled={restoring} style={styles.restoreBtn}>
                    {restoring
                        ? <ActivityIndicator color={textSecondary} size="small" />
                        : <Text style={[styles.restoreText, { color: textSecondary }]}>{t("restore_purchase")}</Text>
                    }
                </TouchableOpacity>

                {/* Footer */}
                <View style={styles.footer}>
                    <TouchableOpacity onPress={() => Linking.openURL("https://smart-calendar-2026.blogspot.com/")}>
                        <Text style={[styles.footerLink, { color: textSecondary }]}>{t("privacy")}</Text>
                    </TouchableOpacity>
                    <View style={[styles.footerDivider, { backgroundColor: textSecondary }]} />
                    <TouchableOpacity onPress={() => Linking.openURL("https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")}>
                        <Text style={[styles.footerLink, { color: textSecondary }]}>{t("team_conditions")}</Text>
                    </TouchableOpacity>
                </View>
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* ✅ Success Modal */}
            <Modal
                visible={showSuccessModal}
                transparent
                animationType="fade"
                statusBarTranslucent
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 24,
                }}>
                    <View style={{
                        // backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
                        backgroundColor: colors.cardBackground,
                        borderRadius: 24,
                        padding: 32,
                        alignItems: 'center',
                        width: '100%',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.25,
                        shadowRadius: 16,
                        elevation: 10,
                    }}>

                        {/* Lottie Animation */}
                        <LottieView
                            source={require('../assets/images/success.json')}
                            autoPlay
                            loop={false}
                            style={{ width: 140, height: 140 }}
                        />

                        {/* Title */}
                        <Text style={{
                            fontSize: 22,
                            fontWeight: '800',
                            color: isDarkMode ? '#FFFFFF' : '#1A1A1A',
                            marginTop: 8,
                            textAlign: 'center',
                        }}>
                            Purchase Successful! 🎉
                        </Text>

                        {/* Subtitle */}
                        <Text style={{
                            fontSize: 14,
                            color: isDarkMode ? '#AAAAAA' : '#666666',
                            marginTop: 8,
                            textAlign: 'center',
                            lineHeight: 20,
                        }}>
                            Welcome to Premium! All ads have been removed.{'\n'}
                            Please restart the app to apply changes.
                        </Text>

                        {/* Go to Home Button */}
                        <TouchableOpacity
                            onPress={() => {
                                setShowSuccessModal(false);
                                router.replace('/');
                            }}
                            style={{
                                backgroundColor: '#FF5252',
                                borderRadius: 50,
                                paddingVertical: 14,
                                paddingHorizontal: 40,
                                marginTop: 24,
                                width: '100%',
                                alignItems: 'center',
                                shadowColor: '#FF5252',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.35,
                                shadowRadius: 8,
                                elevation: 6,
                            }}
                            activeOpacity={0.85}
                        >
                            <Text style={{
                                color: '#FFF',
                                fontSize: 16,
                                fontWeight: '800',
                            }}>
                                Go to Home 🏠
                            </Text>
                        </TouchableOpacity>

                    </View>
                </View>
            </Modal>
        </View>

    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { paddingBottom: 0 },
    heroSection: { width, height: 280, position: 'relative', marginBottom: 40 },
    heroImage: { width: '100%', height: '100%' },
    closeBtn: { position: 'absolute', top: 48, left: 16, zIndex: 10 },
    closeBtnCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    titleOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 40 },
    titleOverlayText: { fontSize: 22, fontWeight: '600', textAlign: 'center', lineHeight: 28, marginTop: 10, color: '#383838' },
    loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
    loadingText: { fontSize: 13 },
    plansContainer: { gap: 12, marginBottom: 40, paddingHorizontal: 20 },
    planCard: { borderRadius: 16, padding: 16, paddingTop: 20, position: 'relative', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    badge: { position: 'absolute', top: -12, left: 16, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
    badgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
    planRow: { flexDirection: 'row', alignItems: 'center' },
    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    radioDot: { width: 11, height: 11, borderRadius: 6 },
    planInfo: { flex: 1 },
    planLabel: { fontSize: 15, fontWeight: '600' },
    planSub: { fontSize: 12, marginTop: 2 },
    discountBox: { alignItems: 'flex-end' },
    discountPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
    discountPillText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
    discountTextBox: { alignItems: 'flex-end' },
    discountText: { fontSize: 14, fontWeight: '700' },
    discountLabel: { fontSize: 11, marginTop: 2 },
    subscribeWrap: { marginBottom: 16, paddingHorizontal: 20 },
    subscribeBtn: { borderRadius: 50, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#FF5252', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8 },
    subscribeBtnText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
    restoreBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginBottom: 20 },
    restoreText: { fontSize: 14, textDecorationLine: 'underline' },
    footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 20, marginBottom: 12 },
    footerLink: { fontSize: 13, textDecorationLine: 'underline' },
    footerDivider: { width: 1, height: 14, opacity: 0.4 },
    disclaimer: { fontSize: 11, textAlign: 'center', paddingHorizontal: 24, lineHeight: 16, marginBottom: 10 },
});