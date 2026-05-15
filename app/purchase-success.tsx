import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function PurchaseSuccessScreen() {
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const slideAnim   = useRef(new Animated.Value(40)).current;
    const lottieRef   = useRef<LottieView>(null);

    useEffect(() => {
        lottieRef.current?.play();

        Animated.parallel([
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 600,
                delay: 300,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                delay: 300,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#EAF6FB" />

            {/* ✅ Lottie Animation */}
            <LottieView
                ref={lottieRef}
                source={require('../assets/icons/done.json')}
                style={styles.lottie}
                autoPlay
                loop={false}  // ek baar play karo
                resizeMode="contain"
            />

            {/* Title + Subtitle */}
            <Animated.View style={{
                opacity: opacityAnim,
                transform: [{ translateY: slideAnim }],
                alignItems: 'center',
            }}>
                <View style={styles.checkRow}>
                    <Ionicons name="checkmark-circle" size={28} color="#4CAF50" />
                    <Text style={styles.title}>Purchase Successful!</Text>
                </View>
                <Text style={styles.subtitle}>
                    Welcome to Premium!{'\n'}All ads have been removed.
                </Text>
            </Animated.View>

            {/* Go to Home Button */}
            <Animated.View style={[styles.btnWrap, { opacity: opacityAnim }]}>
                <TouchableOpacity
                    style={styles.btn}
                    activeOpacity={0.85}
                    onPress={() => router.replace('/')}
                >
                    <Ionicons name="home" size={20} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.btnText}>Go to Home</Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#EAF6FB',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    lottie: {
        width: 250,
        height: 250,
        marginBottom: 16,
    },
    checkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1A1A1A',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
    },
    btnWrap: {
        position: 'absolute',
        bottom: 48,
        left: 24,
        right: 24,
    },
    btn: {
        backgroundColor: '#FF5252',
        borderRadius: 50,
        paddingVertical: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#FF5252',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
        elevation: 8,
    },
    btnText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '800',
    },
});