// utils/analytics.ts
import analytics from '@react-native-firebase/analytics';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export async function initAnalytics() {
  try {
    await analytics().setAnalyticsCollectionEnabled(true);
    await analytics().setUserProperties({
      app_version: Constants.expoConfig?.version ?? '1.0.0',
      platform: Platform.OS,
    });
  } catch (e) {
    if (__DEV__) console.log('Analytics init error:', e);
  }
}

export async function trackScreen(screenName: string) {
  try {
    await analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenName,
    });
    if (__DEV__) console.log(`📊 Screen: ${screenName}`);
  } catch (e) {}
}

export async function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  try {
    await analytics().logEvent(eventName, params ?? {});
    if (__DEV__) console.log(`📊 Event: ${eventName}`, params);
  } catch (e) {}
}

export async function trackAdShown(adType: string, screenName: string) {
  try {
    await analytics().logEvent('ad_impression', {
      ad_format: adType,
      screen_name: screenName,
    });
  } catch (e) {}
}

export async function trackAdFailed(adType: string, screenName: string) {
  try {
    await analytics().logEvent('ad_failed', {
      ad_type: adType,
      screen_name: screenName,
    });
  } catch (e) {}
}

export async function trackAdSkipped(reason: string, screenName: string) {
  try {
    await analytics().logEvent('ad_skipped', {
      reason,
      screen_name: screenName,
    });
  } catch (e) {}
}

export async function trackError(
  errorMessage: string,
  screenName: string,
  fatal: boolean = false
) {
  try {
    await analytics().logEvent('app_error', {
      error_message: errorMessage.substring(0, 100),
      screen_name: screenName,
      is_fatal: fatal ? 1 : 0,
    });
  } catch (e) {}
}

export async function trackUserProperty(properties: Record<string, string>) {
  try {
    await analytics().setUserProperties(properties);
  } catch (e) {}
}

export async function trackAppOpen() {
  try {
    await analytics().logAppOpen();
  } catch (e) {}
}