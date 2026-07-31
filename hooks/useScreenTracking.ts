// hooks/useScreenTracking.ts 
import { useFocusEffect } from '@react-navigation/native';
import { usePostHog } from 'posthog-react-native';
import { useCallback } from 'react';
import { trackScreen } from '../utils/analytics';

export function useScreenTracking(screenName: string) {
  const posthog = usePostHog();

  useFocusEffect(
    useCallback(() => {
      posthog.screen(screenName);
      trackScreen(screenName);
    }, [screenName])
  );
}