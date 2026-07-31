import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useRef, useState } from 'react';
// import {
//     ActivityIndicator,
//     Alert,
//     ImageBackground,
//     StyleSheet,
//     Text,
//     TouchableOpacity,
//     View,
// } from 'react-native';
import { Image as ExpoImage, ImageBackground } from 'expo-image';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import PurchaseManager from '../services/purchaseManager';
import {
    fetchImageList,
    fetchQuoteList,
    getDailyQuoteData,
    getRandomImage,
    getRandomQuote,
    ImageItem,
    QuoteItem,
    saveDailyQuoteData,
} from '../utils/dailyQuoteStorage';

export default function DailyQuoteScreen() {
    const router = useRouter();
    const viewShotRef = useRef<ViewShot>(null);

    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [quoteList, setQuoteList] = useState<QuoteItem[]>([]);
    const [imageList, setImageList] = useState<ImageItem[]>([]);
    const [currentQuote, setCurrentQuote] = useState<QuoteItem | null>(null);
    const [currentImage, setCurrentImage] = useState<ImageItem | null>(null);

    const DAILY_QUOTE_USAGE_KEY = 'dailyQuoteUsage';
    const FREE_DAILY_LIMIT = 3;

    const [usageCount, setUsageCount] = useState(0);
    const [isPremiumUser, setIsPremiumUser] = useState(false);

    const getTodayString = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    useEffect(() => {
        (async () => {
            try {
                const [daily, quotes, images, premium] = await Promise.all([
                    getDailyQuoteData(),
                    fetchQuoteList(),
                    fetchImageList(),
                    PurchaseManager.isPremium(),
                ]);
                setQuoteList(quotes);
                setImageList(images);
                setIsPremiumUser(premium);
                ExpoImage.prefetch(images.map((img) => img.image)).catch((e) =>
                    console.log('Daily quote image prefetch error:', e)
                );
                if (daily) {
                    setCurrentQuote({ id: daily.quoteId, quote: daily.quoteText });
                    setCurrentImage({ id: daily.imageId, image: daily.imageUrl });
                } else {
                    setCurrentQuote(quotes[0] || null);
                    setCurrentImage(images[0] || null);
                }
            } catch (e) {
                console.log('daily-quote load error', e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const canChangeAndTrack = async (): Promise<boolean> => {
        if (isPremiumUser) return true;
        const today = getTodayString();
        const raw = await AsyncStorage.getItem(DAILY_QUOTE_USAGE_KEY);
        let count = 0;
        if (raw) {
            const parsed = JSON.parse(raw);
            count = parsed.date === today ? parsed.count : 0;
        }
        if (count >= FREE_DAILY_LIMIT) {
            router.push('/PremiumScreen');
            return false;
        }
        const newCount = count + 1;
        await AsyncStorage.setItem(DAILY_QUOTE_USAGE_KEY, JSON.stringify({ date: today, count: newCount }));
        setUsageCount(newCount);
        return true;
    };

    const handleShuffleQuote = async () => {
        const allowed = await canChangeAndTrack();
        if (!allowed) return;
        const next = getRandomQuote(quoteList, currentQuote?.id);
        if (next && currentImage) {
            setCurrentQuote(next);
            saveDailyQuoteData(next, currentImage);
        }
    };

    const handleNextImage = async () => {
        const allowed = await canChangeAndTrack();
        if (!allowed) return;
        const next = getRandomImage(imageList, currentImage?.id);
        if (next && currentQuote) {
            setCurrentImage(next);
            saveDailyQuoteData(currentQuote, next);
        }
    };

    const captureImage = async (): Promise<string | null> => {
        try {
            if (!viewShotRef.current?.capture) return null;
            const uri = await viewShotRef.current.capture();
            return uri;
        } catch (e) {
            console.log('capture error', e);
            return null;
        }
    };

    const handleDownload = async () => {
        if (busy) return;
        setBusy(true);
        try {
            const permission = await MediaLibrary.requestPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('Permission needed', 'Please allow photo access to save the quote image.');
                return;
            }
            const uri = await captureImage();
            if (!uri) {
                Alert.alert('Error', 'Could not create the image.');
                return;
            }
            await MediaLibrary.saveToLibraryAsync(uri);
            Alert.alert('Saved', 'Quote image saved to your photos.');
        } catch (e) {
            console.log('download error', e);
            Alert.alert('Error', 'Something went wrong while saving.');
        } finally {
            setBusy(false);
        }
    };

    const handleShare = async () => {
        if (busy) return;
        setBusy(true);
        try {
            const uri = await captureImage();
            if (!uri) {
                Alert.alert('Error', 'Could not create the image.');
                return;
            }
            const available = await Sharing.isAvailableAsync();
            if (available) {
                await Sharing.shareAsync(uri);
            } else {
                Alert.alert('Sharing is not available on this device.');
            }
        } catch (e) {
            console.log('share error', e);
        } finally {
            setBusy(false);
        }
    };

    const handleClose = () => {
        if (router.canGoBack()) {
            router.replace('/settings');
        } else {
            router.back();
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fff" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ViewShot ref={viewShotRef} style={styles.viewShot} options={{ format: 'jpg', quality: 0.9 }}>
                <ImageBackground
                    source={{ uri: currentImage?.image }}
                    style={styles.background}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={0}
                >
                    <View style={styles.overlay} />

                    <View style={styles.quoteWrapper}>
                        <Text style={styles.quoteText}>{currentQuote?.quote}</Text>
                    </View>
                </ImageBackground>
            </ViewShot>

            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>

            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.iconButton} onPress={handleDownload} disabled={busy}>
                    <Ionicons name="download-outline" size={22} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={handleShare} disabled={busy}>
                    <Ionicons name="share-outline" size={22} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={handleShuffleQuote} disabled={busy}>
                    <Ionicons name="shuffle" size={22} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={handleNextImage} disabled={busy}>
                    <Ionicons name="play-skip-forward-outline" size={22} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    loadingContainer: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
    viewShot: { flex: 1 },
    background: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.15)' },
    quoteWrapper: { paddingHorizontal: 32 },
    quoteText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 34,
    },
    closeButton: {
        position: 'absolute',
        top: 60,
        left: 20,
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 20,
    },
    iconButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
});