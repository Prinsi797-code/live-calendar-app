import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

const { width } = Dimensions.get('window');
const DOT_SIZE = 20;
const DOT_SPACING = (width - 100) / 2;

export default function ForgotPasswordPatternScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const [pattern, setPattern] = useState<number[]>([]);
    const [currentPosition, setCurrentPosition] = useState<{ x: number; y: number } | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    // 3x3 grid positions
    const dots = [
        { id: 0, x: DOT_SPACING, y: 150 },
        { id: 1, x: DOT_SPACING * 2, y: 150 },
        { id: 2, x: DOT_SPACING * 3, y: 150 },
        { id: 3, x: DOT_SPACING, y: 150 + DOT_SPACING },
        { id: 4, x: DOT_SPACING * 2, y: 150 + DOT_SPACING },
        { id: 5, x: DOT_SPACING * 3, y: 150 + DOT_SPACING },
        { id: 6, x: DOT_SPACING, y: 150 + DOT_SPACING * 2 },
        { id: 7, x: DOT_SPACING * 2, y: 150 + DOT_SPACING * 2 },
        { id: 8, x: DOT_SPACING * 3, y: 150 + DOT_SPACING * 2 },
    ];

    const checkDotCollision = (x: number, y: number) => {
        for (const dot of dots) {
            const distance = Math.sqrt(
                Math.pow(x - dot.x, 2) + Math.pow(y - dot.y, 2)
            );
            if (distance < 35) {
                return dot.id;
            }
        }
        return null;
    };

    const handleTouchStart = (event: any) => {
        setIsDrawing(true);
        const { locationX, locationY } = event.nativeEvent;
        setCurrentPosition({ x: locationX, y: locationY });
        
        const dotId = checkDotCollision(locationX, locationY);
        if (dotId !== null && !pattern.includes(dotId)) {
            setPattern([dotId]);
        }
    };

    const handleTouchMove = (event: any) => {
        if (!isDrawing) return;
        
        const { locationX, locationY } = event.nativeEvent;
        setCurrentPosition({ x: locationX, y: locationY });
        
        const dotId = checkDotCollision(locationX, locationY);
        if (dotId !== null && !pattern.includes(dotId)) {
            setPattern(prev => [...prev, dotId]);
        }
    };

    const handleTouchEnd = () => {
        setIsDrawing(false);
        setCurrentPosition(null);
    };

    const handleRedraw = () => {
        setPattern([]);
        setCurrentPosition(null);
    };

    const handleContinue = async () => {
        if (pattern.length < 4) {
            Alert.alert('Error', 'Pattern must connect at least 4 dots');
            return;
        }

        try {
            await AsyncStorage.setItem('diary_pattern', JSON.stringify(pattern));
            await AsyncStorage.setItem('diary_locked', 'true');
            
            Alert.alert(
                'Success',
                'Your diary is now locked with a pattern',
                [
                    {
                        text: 'OK',
                        onPress: () => router.replace('/diary'),
                    },
                ]
            );
        } catch (error) {
            console.error('Error saving pattern:', error);
            Alert.alert('Error', 'Failed to save pattern');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                {pattern.length === 0 ? 'Draw your pattern' : 'Pattern recorded'}
            </Text>

            <View 
                style={styles.patternContainer}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={handleTouchStart}
                onResponderMove={handleTouchMove}
                onResponderRelease={handleTouchEnd}
            >
                {/* Draw lines between connected dots */}
                {pattern.map((dotId, index) => {
                    if (index === pattern.length - 1) {
                        // Draw line from last dot to current finger position if drawing
                        if (isDrawing && currentPosition) {
                            const currentDot = dots[dotId];
                            const angle = Math.atan2(
                                currentPosition.y - currentDot.y,
                                currentPosition.x - currentDot.x
                            );
                            const distance = Math.sqrt(
                                Math.pow(currentPosition.x - currentDot.x, 2) +
                                Math.pow(currentPosition.y - currentDot.y, 2)
                            );

                            return (
                                <View
                                    key={`line-current`}
                                    style={[
                                        styles.line,
                                        {
                                            left: currentDot.x,
                                            top: currentDot.y,
                                            width: distance,
                                            transform: [{ rotate: `${angle}rad` }],
                                        },
                                    ]}
                                />
                            );
                        }
                        return null;
                    }
                    
                    const currentDot = dots[dotId];
                    const nextDot = dots[pattern[index + 1]];
                    
                    const angle = Math.atan2(
                        nextDot.y - currentDot.y,
                        nextDot.x - currentDot.x
                    );
                    const distance = Math.sqrt(
                        Math.pow(nextDot.x - currentDot.x, 2) +
                        Math.pow(nextDot.y - currentDot.y, 2)
                    );

                    return (
                        <View
                            key={`line-${index}`}
                            style={[
                                styles.line,
                                {
                                    left: currentDot.x,
                                    top: currentDot.y,
                                    width: distance,
                                    transform: [{ rotate: `${angle}rad` }],
                                },
                            ]}
                        />
                    );
                })}

                {/* Render dots */}
                {dots.map((dot, index) => (
                    <View
                        key={dot.id}
                        style={[
                            styles.dot,
                            {
                                left: dot.x - DOT_SIZE / 2,
                                top: dot.y - DOT_SIZE / 2,
                                backgroundColor: pattern.includes(dot.id)
                                    ? '#E57373'
                                    : colors.textSecondary,
                                transform: [
                                    { 
                                        scale: pattern.includes(dot.id) ? 1.5 : 1 
                                    }
                                ],
                            },
                        ]}
                    >
                        {pattern.includes(dot.id) && (
                            <View style={[styles.dotInner, { backgroundColor: '#FFFFFF' }]} />
                        )}
                    </View>
                ))}
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.cardBackground }]}
                    onPress={handleRedraw}
                >
                    <Text style={[styles.buttonText, { color: colors.textPrimary }]}>
                        Redraw
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.continueButton, { backgroundColor: '#E57373' }]}
                    onPress={handleContinue}
                    disabled={pattern.length < 4}
                    activeOpacity={pattern.length < 4 ? 0.5 : 0.7}
                >
                    <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                        Continue
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 40,
    },
    statusText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 40,
    },
    patternContainer: {
        flex: 1,
        position: 'relative',
    },
    dot: {
        position: 'absolute',
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: DOT_SIZE / 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dotInner: {
        width: DOT_SIZE / 3,
        height: DOT_SIZE / 3,
        borderRadius: DOT_SIZE / 6,
    },
    line: {
        position: 'absolute',
        height: 3,
        backgroundColor: '#E57373',
    },
    buttonContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingBottom: 40,
        gap: 12,
    },
    button: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    continueButton: {
        flex: 1,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});