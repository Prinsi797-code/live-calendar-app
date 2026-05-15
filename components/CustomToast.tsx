// CustomToast.tsx - Create this new file
import React, { useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface ToastProps {
    visible: boolean;
    message: string;
    onHide: () => void;
}

export const CustomToast: React.FC<ToastProps> = ({ visible, message, onHide }) => {
    const opacity = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Show toast
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.delay(2000), // Show for 2 seconds
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                onHide();
            });
        }
    }, [visible, message]);

    if (!visible) return null;

    return (
        <Animated.View
            style={[
                styles.toastContainer,
                {
                    opacity,
                    transform: [
                        {
                            translateY: opacity.interpolate({
                                inputRange: [0, 1],
                                outputRange: [20, 0],
                            }),
                        },
                    ],
                },
            ]}
        >
            <View style={styles.toast}>
                <Text style={styles.toastText}>{message}</Text>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    toastContainer: {
        position: 'absolute',
        bottom: 100,
        left: 20,
        right: 20,
        alignItems: 'center',
        zIndex: 9999,
    },
    toast: {
        backgroundColor: '#333',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        maxWidth: '90%',
    },
    toastText: {
        color: '#fff',
        fontSize: 14,
        textAlign: 'center',
    },
});