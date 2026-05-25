import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const MEASUREMENT_ID = 'G-PSLGEMZW9G';
const API_SECRET = 'Vh7oJAi1T8yaMJA6N3bytw';
const CLIENT_ID_KEY = 'analytics_client_id';

async function getClientId(): Promise<string> {
  try {
    let clientId = await AsyncStorage.getItem(CLIENT_ID_KEY);
    if (!clientId) {
      clientId = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      await AsyncStorage.setItem(CLIENT_ID_KEY, clientId);
    }
    return clientId;
  } catch {
    return `${Platform.OS}-${Date.now()}`;
  }
}

async function sendEvent(eventName: string, params: Record<string, any> = {}) {
  try {
    const clientId = await getClientId();
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`;

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        events: [{
          name: eventName,
          params: {
            ...params,
            platform: Platform.OS,
            engagement_time_msec: '100',
            session_id: Date.now().toString(),
          },
        }],
      }),
    });

    if (__DEV__) console.log(`📊 Analytics: ${eventName}`, params);
  } catch (error) {
    if (__DEV__) console.log('Analytics error:', error);
  }
}

export async function initAnalytics() {
  console.log('✅ Analytics ready (HTTP mode)');
  await sendEvent('app_initialized', { timestamp: Date.now().toString() });
}

export async function trackScreen(screenName: string) {
  await sendEvent('screen_view', {
    firebase_screen: screenName,
    firebase_screen_class: screenName,
  });
  if (__DEV__) console.log(`📊 Screen: ${screenName}`);
}

export async function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  await sendEvent(eventName, params ?? {});
  if (__DEV__) console.log(`📊 Event: ${eventName}`, params);
}

export async function trackAdShown(adType: string, screenName: string) {
  await sendEvent('ad_impression', { ad_format: adType, screen_name: screenName });
}

export async function trackAdFailed(adType: string, screenName: string) {
  await sendEvent('ad_failed', { ad_type: adType, screen_name: screenName });
}

export async function trackAdSkipped(reason: string, screenName: string) {
  await sendEvent('ad_skipped', { reason, screen_name: screenName });
}

export async function trackError(errorMessage: string, screenName: string, fatal: boolean = false) {
  await sendEvent('app_error', {
    error_message: errorMessage.substring(0, 100),
    screen_name: screenName,
    is_fatal: fatal ? 1 : 0,
  });
}

export async function trackUserProperty(properties: Record<string, string>) {
  await sendEvent('user_properties', properties);
}

export async function trackAppOpen() {
  await sendEvent('app_open', { source: 'direct' });
}