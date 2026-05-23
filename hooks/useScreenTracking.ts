// hooks/useScreenTracking.ts
import { useEffect, useRef } from 'react';
import { trackEvent, trackScreen } from '../utils/analytics';

export function useScreenTracking(screenName: string) {
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    // Screen pe aane ka track
    trackScreen(screenName);
    startTimeRef.current = Date.now();

    // Screen se jane par time calculate karo
    return () => {
      const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
      trackEvent('screen_time', {
        screen_name: screenName,
        time_seconds: timeSpent,
      });
    };
  }, [screenName]);
}