import { useEffect } from 'react';
import { trackScreen } from '../utils/analytics';

export function useScreenTracking(screenName: string, extraParams?: Record<string, string | number | boolean>) {
  useEffect(() => {
    trackScreen(screenName, extraParams);
  }, [screenName]);
}