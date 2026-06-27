import React, { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface SplashScreenProps {
  onFinish: () => void;
  isAppReady?: boolean;
}

export default function SplashScreen({ onFinish, isAppReady = false }: SplashScreenProps) {
  const { colors } = useTheme();

  useEffect(() => {
    if (isAppReady) {
      onFinish();
    }
  }, [isAppReady]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Image
        source={require('../assets/icons/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logo: { width: 120, height: 120 },
});