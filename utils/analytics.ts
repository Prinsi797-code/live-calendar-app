// utils/analytics.ts
import analytics from '@react-native-firebase/analytics';
import { usePostHog } from 'posthog-react-native';

let posthogInstance: ReturnType<typeof usePostHog> | null = null;

export function registerPostHog(instance: ReturnType<typeof usePostHog>) {
  posthogInstance = instance;
}

export async function initAnalytics() {
  try {
    await analytics().setAnalyticsCollectionEnabled(true);
    console.log('✅ Firebase Analytics enabled');
  } catch (e) {
    console.log('Firebase Analytics init failed:', e);
  }
}

export async function trackAppOpen() {
  try {
    await analytics().logEvent('app_open');
  } catch (e) {
    console.log('trackAppOpen (firebase) failed:', e);
  }

  try {
    posthogInstance?.capture('app_open');
  } catch (e) {
    console.log('trackAppOpen (posthog) failed:', e);
  }
}

export async function trackScreen(screenName: string) {
  try {
    await analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenName,
    });
  } catch (e) {
    console.log('trackScreen (firebase) failed:', e);
  }
}

export async function trackEvent(eventName: string, params?: Record<string, any>) {
  try {
    await analytics().logEvent(eventName, params);
  } catch (e) {
    console.log('trackEvent (firebase) failed:', e);
  }

  try {
    posthogInstance?.capture(eventName, params);
  } catch (e) {
    console.log('trackEvent (posthog) failed:', e);
  }
}

export async function trackAdShown(adType: string, screenName: string) {
  try {
    await analytics().logEvent('ad_shown', {
      ad_type: adType,
      screen_name: screenName,
    });
  } catch (e) {
    console.log('trackAdShown failed:', e);
  }
}

export async function setUserCountry(countryCode: string) {
  try {
    await analytics().setUserProperty('country_code', countryCode);
  } catch (e) {
    console.log('setUserCountry failed:', e);
  }
}

export async function setUserPremiumStatus(isPremium: boolean) {
  try {
    await analytics().setUserProperty('is_premium', isPremium ? 'true' : 'false');
  } catch (e) {
    console.log('setUserPremiumStatus failed:', e);
  }
}