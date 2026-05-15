import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  remainingDays: number;
  visible: boolean;
}

export function TrialBanner({ remainingDays, visible }: Props) {
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  const isLastDay = remainingDays === 1;
  const bgColor = isLastDay ? '#FF5252' : '#FF6B6B';

  const getMessage = () => {
    if (remainingDays === 1) return '⚠️ Last day of free trial!';
    return `🎁 Free trial: ${remainingDays} days remaining`;
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgColor, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.left}>
        <Text style={styles.message}>{getMessage()}</Text>
        <Text style={styles.sub}>Upgrade to keep premium features</Text>
      </View>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => router.push('/PremiumScreen')}
        activeOpacity={0.8}
      >
        <Ionicons name="diamond" size={14} color="#FF5252" />
        <Text style={styles.btnText}>Upgrade</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
  },
  left: { flex: 1 },
  message: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  sub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 1,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  btnText: {
    color: '#FF5252',
    fontWeight: '700',
    fontSize: 12,
  },
});