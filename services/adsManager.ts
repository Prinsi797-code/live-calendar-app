import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AdEventType,
  AppOpenAd,
  InterstitialAd,
  TestIds
} from 'react-native-google-mobile-ads';
import { trackAdShown } from '../utils/analytics';
import { fetchAppConfig } from '../utils/firebaseConfig';

interface AdConfig {
  detail_screen?: {
    inter_ads_flag: number;
    inter_id: string;
  };

  event_screen?: {
    ad_flag: number;
    baner_id: string;
    inter_ads_flag: number;
    inter_id: string;
  };

  language_screen?: {
    ad_flag: number;
    baner_id: string;
    inter_ads_flag: number;
    inter_id: string;
  };

  main_screen?: {
    ad_flag: number;
    baner_id: string;
  };

  custom_theme?: {
    reward_ad_flag: number;
    reward_id: string;
  }

  setting_screen?: {
    ad_flag: number;
    baner_id: string;
    inter_ads_flag: number;
    inter_id: string;
  };

  splash_screen?: {
    inter_ads_flag: number;
    inter_id: string;
  };

  floor_inter?: {
    inter_id: string;
    inter_ads_flag: number;
  };

  main_screen_ad?: {
    ad_flag: number;
    inter_id: string;
  };

}

class AdsManager {
  private static skipNextAppOpenAd = false;
  private static instance: AdsManager;
  private config: AdConfig | null = null;
  private appOpenAd: AppOpenAd | null = null;
  private floorInterstitialAd: InterstitialAd | null = null;
  private settingInterstitialAd: InterstitialAd | null = null;
  private detailInterstitialAd: InterstitialAd | null = null;
  private eventInterstitialAd: InterstitialAd | null = null;
  private isShowingAd = false;
  private isConfigLoaded = false;
  private isFloorInterstitialLoaded = false;
  private isSettingInterstitialLoaded = false;
  private isDetailInterstitialLoaded = false;
  private isEventInterstitialLoaded = false;
  private mainScreenInterstitialAd: InterstitialAd | null = null;
  private isMainScreenInterstitialLoaded = false;
  private static skipNextMainScreenAd = false;
  private rewardedAd: any | null = null;
  private isRewardedAdLoaded = false;

  // Ad frequency tracking keys
  private readonly SPLASH_AD_SHOWN_KEY = 'splash_ad_shown';
  private readonly SPLASH_AD_LAST_SHOWN_KEY = 'splash_ad_last_shown';
  private readonly SETTING_AD_SHOWN_KEY = 'setting_ad_shown';
  private readonly SETTING_AD_LAST_SHOWN_KEY = 'setting_ad_last_shown';
  private readonly DETAIL_AD_SHOWN_KEY = 'detail_ad_shown';
  private readonly DETAIL_AD_LAST_SHOWN_KEY = 'detail_ad_last_shown';
  private readonly EVENT_AD_SHOWN_KEY = 'event_ad_shown';
  private readonly EVENT_AD_LAST_SHOWN_KEY = 'event_ad_last_shown';


  private sessionAdsShown: Set<string> = new Set();
  private recentAdShown: { screenName: string; timestamp: number } | null = null;
  private readonly AD_COOLDOWN_MS = 60000;

  private constructor() { }

  static setSkipNextAppOpenAd(skip: boolean) {
    this.skipNextAppOpenAd = skip;
    console.log('🔔 Skip next App Open Ad:', skip);
  }

  static getInstance(): AdsManager {
    if (!AdsManager.instance) {
      AdsManager.instance = new AdsManager();
    }
    return AdsManager.instance;
  }

  async loadRewardedAd() {
    const rewardConfig = this.config?.custom_theme;
    console.log('🎯 Reward config:', JSON.stringify(rewardConfig));

    if (!rewardConfig || rewardConfig.reward_ad_flag !== 1 || !rewardConfig.reward_id?.trim()) {
      console.log('Rewarded ad not configured');
      return;
    }
    try {
      const { RewardedAd, RewardedAdEventType } = await import('react-native-google-mobile-ads');
      const adUnitId = this.getAdUnitId(rewardConfig.reward_id);
      console.log('🎯 Loading rewarded ad with ID:', adUnitId);

      this.rewardedAd = RewardedAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      this.rewardedAd.addAdEventListener('rewarded_loaded', () => {
        this.isRewardedAdLoaded = true;
        console.log('✅ Rewarded Ad Loaded successfully');
      });

      this.rewardedAd.addAdEventListener('rewarded_error', (error: any) => {
        console.log('❌ Rewarded Ad Error:', JSON.stringify(error));
        this.isRewardedAdLoaded = false;
      });
      console.log('🎯 Calling rewardedAd.load()...'); 
      this.rewardedAd.load();
      console.log('🎯 rewardedAd.load() called');
    } catch (error) {
      console.log('❌ Rewarded Ad Load Failed:', error);
    }
  }

  async showCustomThemeRewardedAd(): Promise<boolean> {
    const rewardConfig = this.config?.custom_theme;

    // Flag 0 = ads disabled, seedha apply karo
    if (!rewardConfig || rewardConfig.reward_ad_flag === 0) {
      console.log('Rewarded ad disabled — apply theme directly');
      return true;
    }

    if (!this.isRewardedAdLoaded) {
      console.log('Rewarded ad not ready, waiting...');
      await new Promise<void>((resolve) => {
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if (this.isRewardedAdLoaded) {
            clearInterval(interval);
            resolve();
          } else if (attempts >= 10) {
            clearInterval(interval);
            resolve();
          }
        }, 500);
      });
    }

    if (!this.isRewardedAdLoaded || !this.rewardedAd) {
      console.log('Rewarded ad still not loaded — apply theme directly');
      return true;
    }

    try {
      const { RewardedAdEventType } = await import('react-native-google-mobile-ads');

      return new Promise((resolve) => {
        let rewarded = false;

        this.rewardedAd.addAdEventListener('rewarded_earned_reward', () => {
          console.log('User earned reward');
          rewarded = true;
        });

        this.rewardedAd.addAdEventListener('rewarded_closed', () => {
          console.log('Rewarded ad closed');
          this.isRewardedAdLoaded = false;
          setTimeout(() => this.loadRewardedAd(), 1000);
          resolve(rewarded);
        });

        this.rewardedAd.show();
      });
    } catch (e) {
      console.log('Rewarded ad show failed:', e);
      return true; // Fail hone par bhi theme apply karo
    }
  }

  // ==================== LOAD CONFIG FROM FIREBASE ====================
  async loadConfigFromFirebase(): Promise<boolean> {
    try {
      console.log('Loading ad config from Firebase...');
      const firebaseConfig = await fetchAppConfig();

      if (firebaseConfig) {
        this.config = firebaseConfig as AdConfig;
        this.isConfigLoaded = true;
        console.log('Firebase ad config loaded:', this.config);
        return true;
      } else {
        console.log('No Firebase config found');
        this.isConfigLoaded = false;
        return false;
      }
    } catch (error) {
      console.log('Failed to load Firebase config:', error);
      this.isConfigLoaded = false;
      return false;
    }
  }

  setConfig(config: AdConfig) {
    this.config = config;
    this.isConfigLoaded = true;
    console.log('🎯 Ads Config Set:', config);
  }

  private getAdUnitId(adId?: string): string {
    if (!adId || adId.trim() === '') {
      console.log('No ad ID provided, using test ID');
      return TestIds.INTERSTITIAL;
    }
    return adId;
  }

  isConfigReady(): boolean {
    return this.isConfigLoaded;
  }

  private isAdInCooldown(): boolean {
    if (!this.recentAdShown) return false;

    const now = Date.now();
    const timeSinceLastAd = now - this.recentAdShown.timestamp;

    if (timeSinceLastAd < this.AD_COOLDOWN_MS) {
      console.log(
        `Ad cooldown active (${Math.round(
          (this.AD_COOLDOWN_MS - timeSinceLastAd) / 1000
        )}s remaining)`
      );
      return true;
    }

    this.recentAdShown = null;
    return false;
  }

  // Notification se open hone par call karo - saare ads skip karne ke liye
  static setOpenedFromNotification(value: boolean) {
    this.skipNextMainScreenAd = value;
    console.log('🔔 Opened from notification:', value);
  }

  static shouldSkipMainScreenAd(): boolean {
    return this.skipNextMainScreenAd;
  }

  // Background se foreground aane par call karo
  async loadMainScreenInterstitialAd() {
    const mainConfig = this.config?.main_screen_ad;

    if (!mainConfig || !mainConfig.inter_id || mainConfig.inter_id.trim() === '') {
      console.log('Main screen ad not configured');
      this.isMainScreenInterstitialLoaded = false;
      return;
    }

    if (mainConfig.ad_flag !== 1) {
      console.log('Main screen ad disabled (ad_flag != 1)');
      this.isMainScreenInterstitialLoaded = false;
      return;
    }

    const adUnitId = this.getAdUnitId(mainConfig.inter_id);
    console.log('Loading main screen interstitial ad:', adUnitId);

    try {
      this.mainScreenInterstitialAd = InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      this.mainScreenInterstitialAd.addAdEventListener(AdEventType.LOADED, () => {
        this.isMainScreenInterstitialLoaded = true;
        console.log('Main Screen Interstitial Ad Loaded');
      });

      this.mainScreenInterstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('Main Screen Interstitial Ad Closed');
        this.isShowingAd = false;
        this.isMainScreenInterstitialLoaded = false;
        // Reload for next time
        setTimeout(() => this.loadMainScreenInterstitialAd(), 1000);
      });

      this.mainScreenInterstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
        console.log('Main Screen Interstitial Ad Error:', error);
        this.isShowingAd = false;
        this.isMainScreenInterstitialLoaded = false;
        setTimeout(() => this.loadMainScreenInterstitialAd(), 5000);
      });

      this.mainScreenInterstitialAd.load();
    } catch (error) {
      console.log('Main Screen Interstitial Load Failed:', error);
      this.isMainScreenInterstitialLoaded = false;
    }
  }

  async showMainScreenAd(): Promise<boolean> {
    console.log('Attempting Main Screen Ad (app foregrounded)');

    // Notification se open hua? Skip karo
    if (AdsManager.skipNextMainScreenAd) {
      console.log('⏭️ Skipping main screen ad (opened from notification)');
      AdsManager.skipNextMainScreenAd = false; // Reset after one skip
      return false;
    }

    if (this.isShowingAd) {
      console.log('Already showing an ad');
      return false;
    }

    const mainConfig = this.config?.main_screen_ad;
    if (!mainConfig) {
      console.log('Main screen config not found');
      return false;
    }

    if (mainConfig.ad_flag !== 1) {
      console.log('Main screen ads disabled (ad_flag != 1)');
      return false;
    }

    if (!this.isMainScreenInterstitialLoaded || !this.mainScreenInterstitialAd) {
      console.log('Main screen ad not loaded yet');
      return false;
    }

    try {
      this.isShowingAd = true;
      await this.mainScreenInterstitialAd.show();
      trackAdShown('main_screen', 'main_screen'); // ← add karo
      console.log('Main screen ad shown successfully');
      return true;
    } catch (e) {
      console.log('Main screen ad failed to show', e);
      this.isShowingAd = false;
      return false;
    }
  }

  // ==================== FLOOR INTERSTITIAL AD (PRIORITY) ====================
  async loadFloorInterstitialAd() {
    const floorConfig = this.config?.floor_inter;
    if (!floorConfig?.inter_id?.trim()) {
      this.isFloorInterstitialLoaded = false;
      return;
    }
    const adUnitId = this.getAdUnitId(floorConfig.inter_id);
    try {
      this.floorInterstitialAd = InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      const unsubLoaded = this.floorInterstitialAd.addAdEventListener(
        AdEventType.LOADED, () => {
          this.isFloorInterstitialLoaded = true;
          console.log('Floor Interstitial Ad Loaded');
        }
      );

      const unsubClosed = this.floorInterstitialAd.addAdEventListener(
        AdEventType.CLOSED, () => {
          console.log('Floor Interstitial Ad Closed');
          this.isShowingAd = false;
          this.isFloorInterstitialLoaded = false;
          unsubLoaded();
          unsubClosed();
          unsubError();
          setTimeout(() => this.loadFloorInterstitialAd(), 1000);
        }
      );

      const unsubError = this.floorInterstitialAd.addAdEventListener(
        AdEventType.ERROR, (error) => {
          console.log('Floor Interstitial Ad Error:', error);
          this.isShowingAd = false;
          this.isFloorInterstitialLoaded = false;
          unsubLoaded();
          unsubClosed();
          unsubError();
          setTimeout(() => this.loadFloorInterstitialAd(), 5000);
        }
      );

      this.floorInterstitialAd.load();
    } catch (error) {
      console.log('Floor Interstitial Ad Load Failed:', error);
      this.isFloorInterstitialLoaded = false;
    }
  }

  // ==================== SETTING SCREEN INTERSTITIAL AD ====================
  async loadSettingInterstitialAd() {
    // Only load if floor interstitial is not available
    if (this.isFloorInterstitialLoaded && this.floorInterstitialAd) {
      console.log('Floor interstitial available, skipping setting interstitial load');
      return;
    }

    const settingConfig = this.config?.setting_screen;

    if (!settingConfig || !settingConfig.inter_id || settingConfig.inter_id.trim() === '') {
      console.log('Setting interstitial not configured or empty ID');
      this.isSettingInterstitialLoaded = false;
      return;
    }

    const adUnitId = this.getAdUnitId(settingConfig.inter_id);
    console.log('Loading setting interstitial ad with ID:', adUnitId);

    try {
      this.settingInterstitialAd = InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      this.settingInterstitialAd.addAdEventListener(AdEventType.LOADED, () => {
        this.isSettingInterstitialLoaded = true;
        console.log('Setting Interstitial Ad Loaded and Ready');
      });

      this.settingInterstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('Setting Interstitial Ad Closed');
        this.isShowingAd = false;
        this.isSettingInterstitialLoaded = false;
        setTimeout(() => this.loadSettingInterstitialAd(), 1000);
      });

      this.settingInterstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
        console.log('Setting Interstitial Ad Error:', error);
        this.isShowingAd = false;
        this.isSettingInterstitialLoaded = false;
        setTimeout(() => this.loadSettingInterstitialAd(), 5000);
      });

      this.settingInterstitialAd.load();
    } catch (error) {
      console.log('Setting Interstitial Ad Load Failed:', error);
      this.isSettingInterstitialLoaded = false;
    }
  }

  // ==================== DETAIL SCREEN INTERSTITIAL AD ====================
  async loadDetailInterstitialAd() {
    // Only load if floor interstitial is not available
    if (this.isFloorInterstitialLoaded && this.floorInterstitialAd) {
      console.log('Floor interstitial available, skipping detail interstitial load');
      return;
    }

    const detailConfig = this.config?.detail_screen;

    if (!detailConfig || !detailConfig.inter_id || detailConfig.inter_id.trim() === '') {
      console.log('Detail interstitial not configured or empty ID');
      this.isDetailInterstitialLoaded = false;
      return;
    }

    const adUnitId = this.getAdUnitId(detailConfig.inter_id);
    console.log('Loading detail interstitial ad with ID:', adUnitId);

    try {
      this.detailInterstitialAd = InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      this.detailInterstitialAd.addAdEventListener(AdEventType.LOADED, () => {
        this.isDetailInterstitialLoaded = true;
        console.log('Detail Interstitial Ad Loaded and Ready');
      });

      this.detailInterstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('Detail Interstitial Ad Closed');
        this.isShowingAd = false;
        this.isDetailInterstitialLoaded = false;
        setTimeout(() => this.loadDetailInterstitialAd(), 1000);
      });

      this.detailInterstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
        console.log('Detail Interstitial Ad Error:', error);
        this.isShowingAd = false;
        this.isDetailInterstitialLoaded = false;
        setTimeout(() => this.loadDetailInterstitialAd(), 5000);
      });

      this.detailInterstitialAd.load();
    } catch (error) {
      console.log('Detail Interstitial Ad Load Failed:', error);
      this.isDetailInterstitialLoaded = false;
    }
  }

  // ==================== EVENT SCREEN INTERSTITIAL AD ====================
  async loadEventInterstitialAd() {
    // Only load if floor interstitial is not available
    if (this.isFloorInterstitialLoaded && this.floorInterstitialAd) {
      console.log('Floor interstitial available, skipping event interstitial load');
      return;
    }

    const eventConfig = this.config?.event_screen;

    if (!eventConfig || !eventConfig.inter_id || eventConfig.inter_id.trim() === '') {
      console.log('Event interstitial not configured or empty ID');
      this.isEventInterstitialLoaded = false;
      return;
    }

    const adUnitId = this.getAdUnitId(eventConfig.inter_id);
    console.log('Loading event interstitial ad with ID:', adUnitId);

    try {
      this.eventInterstitialAd = InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      this.eventInterstitialAd.addAdEventListener(AdEventType.LOADED, () => {
        this.isEventInterstitialLoaded = true;
        console.log('Event Interstitial Ad Loaded and Ready');
      });

      this.eventInterstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('Event Interstitial Ad Closed');
        this.isShowingAd = false;
        this.isEventInterstitialLoaded = false;
        setTimeout(() => this.loadEventInterstitialAd(), 1000);
      });

      this.eventInterstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
        console.log('Event Interstitial Ad Error:', error);
        this.isShowingAd = false;
        this.isEventInterstitialLoaded = false;
        setTimeout(() => this.loadEventInterstitialAd(), 5000);
      });

      this.eventInterstitialAd.load();
    } catch (error) {
      console.log('Event Interstitial Ad Load Failed:', error);
      this.isEventInterstitialLoaded = false;
    }
  }

  // ==================== SPLASH SCREEN AD ====================
  async showSplashAd(): Promise<boolean> {
    console.log('Attempting Splash Screen Ad');

    if (this.isShowingAd) {
      console.log('Already showing an ad');
      return false;
    }

    const splashConfig = this.config?.splash_screen;
    if (!splashConfig) {
      console.log('Splash screen config not found');
      return false;
    }

    const frequency = splashConfig.inter_ads_flag ?? 0;

    // 0 = no ads
    if (frequency === 0) {
      console.log('Splash ads disabled (flag = 0)');
      return false;
    }

    // 1 = once in lifetime
    if (frequency === 1) {
      const shown = await AsyncStorage.getItem(this.SPLASH_AD_SHOWN_KEY);
      if (shown) {
        console.log('Splash ad already shown (lifetime)');
        return false;
      }
    }

    // 2 = once in a day
    if (frequency === 2) {
      const lastShown = await AsyncStorage.getItem(this.SPLASH_AD_LAST_SHOWN_KEY);
      if (lastShown) {
        const lastDate = new Date(lastShown).toDateString();
        const today = new Date().toDateString();
        if (lastDate === today) {
          console.log('⏭️ Splash ad already shown today');
          return false;
        }
      }
    }

    // Priority: floor_inter > splash inter
    let adToShow: InterstitialAd | null = null;
    let adType = '';

    // PRIORITY 1: Check floor_inter first
    if (this.isFloorInterstitialLoaded && this.floorInterstitialAd) {
      adToShow = this.floorInterstitialAd;
      adType = 'floor';
      console.log('Using floor_inter for splash ad');
    }
    // PRIORITY 2: Load splash-specific ad only if floor_inter is not available
    else if (splashConfig.inter_id && splashConfig.inter_id.trim() !== '') {
      console.log('Floor_inter not available, loading splash-specific ad');
      const adUnitId = this.getAdUnitId(splashConfig.inter_id);

      try {
        // Create and load splash ad
        const splashAd = InterstitialAd.createForAdRequest(adUnitId, {
          requestNonPersonalizedAdsOnly: true,
        });

        // Wait for ad to load
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Ad load timeout'));
          }, 5000);

          splashAd.addAdEventListener(AdEventType.LOADED, () => {
            clearTimeout(timeout);
            console.log('Splash-specific ad loaded');
            resolve();
          });

          splashAd.addAdEventListener(AdEventType.ERROR, (error) => {
            clearTimeout(timeout);
            console.log('Splash ad load error:', error);
            reject(error);
          });

          splashAd.load();
        });

        adToShow = splashAd;
        adType = 'splash';
      } catch (e) {
        console.log('Failed to load splash ad', e);
        return false;
      }
    } else {
      console.log('No splash ad ID configured');
    }

    if (!adToShow) {
      console.log('No splash ad available');
      return false;
    }

    try {
      this.isShowingAd = true;

      // Set up promise to wait for ad close
      const adClosedPromise = new Promise<void>((resolve) => {
        const closedListener = adToShow!.addAdEventListener(
          AdEventType.CLOSED,
          () => {
            console.log('Splash ad closed by user');
            this.isShowingAd = false;
            if (closedListener) closedListener();
            resolve();
          }
        );

        // Fallback timeout (30 seconds)
        setTimeout(() => {
          console.log('Splash ad timeout');
          this.isShowingAd = false;
          if (closedListener) closedListener();
          resolve();
        }, 30000);
      });

      // Show the ad
      await adToShow.show();
      trackAdShown(adType, 'splash_screen'); // ← add karo

      // Save based on frequency
      if (frequency === 1) {
        await AsyncStorage.setItem(this.SPLASH_AD_SHOWN_KEY, 'true');
      }
      if (frequency === 2) {
        await AsyncStorage.setItem(this.SPLASH_AD_LAST_SHOWN_KEY, new Date().toISOString());
      }

      console.log(`Splash ad shown (${adType}), waiting for close...`);

      // Wait for ad to be closed
      await adClosedPromise;

      console.log('Splash ad flow complete');
      return true;
    } catch (e) {
      console.log('Splash ad failed to show', e);
      this.isShowingAd = false;
      return false;
    }
  }

  // ==================== LANGUAGE SCREEN ADS (First-time users) ====================
  private languageInterstitialAd: InterstitialAd | null = null;
  private isLanguageInterstitialLoaded = false;
  private readonly LANGUAGE_AD_SHOWN_KEY = 'language_ad_shown';
  private readonly LANGUAGE_AD_LAST_SHOWN_KEY = 'language_ad_last_shown';

  async loadLanguageInterstitialAd() {
    // Only load if floor interstitial is not available
    if (this.isFloorInterstitialLoaded && this.floorInterstitialAd) {
      console.log('Floor interstitial available, skipping language interstitial load');
      return;
    }

    const languageConfig = this.config?.language_screen;

    if (!languageConfig || !languageConfig.inter_id || languageConfig.inter_id.trim() === '') {
      console.log('Language interstitial not configured or empty ID');
      this.isLanguageInterstitialLoaded = false;
      return;
    }

    const adUnitId = this.getAdUnitId(languageConfig.inter_id);
    console.log('Loading language interstitial ad with ID:', adUnitId);

    try {
      this.languageInterstitialAd = InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      this.languageInterstitialAd.addAdEventListener(AdEventType.LOADED, () => {
        this.isLanguageInterstitialLoaded = true;
        console.log('Language Interstitial Ad Loaded and Ready');
      });

      this.languageInterstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('Language Interstitial Ad Closed');
        this.isShowingAd = false;
        this.isLanguageInterstitialLoaded = false;
        setTimeout(() => this.loadLanguageInterstitialAd(), 1000);
      });

      this.languageInterstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
        console.log('Language Interstitial Ad Error:', error);
        this.isShowingAd = false;
        this.isLanguageInterstitialLoaded = false;
        setTimeout(() => this.loadLanguageInterstitialAd(), 5000);
      });

      this.languageInterstitialAd.load();
    } catch (error) {
      console.log('Language Interstitial Ad Load Failed:', error);
      this.isLanguageInterstitialLoaded = false;
    }
  }

  async showLanguageScreenInterstitialAd(actionType: 'save' | 'back'): Promise<boolean> {
    console.log(`Attempting Language Screen ${actionType} Ad (First-time user)`);

    if (this.isShowingAd) {
      console.log('Already showing an ad');
      return false;
    }

    if (this.isAdInCooldown()) {
      console.log('Skipping ad due to cooldown');
      return false;
    }

    const languageConfig = this.config?.language_screen;
    if (!languageConfig) {
      console.log('Language screen config not found');
      return false;
    }

    const frequency = languageConfig.inter_ads_flag ?? 0;

    // 0 = no ads
    if (frequency === 0) {
      console.log('Language screen ads disabled (flag = 0)');
      return false;
    }

    // 1 = once in lifetime
    if (frequency === 1) {
      const shown = await AsyncStorage.getItem(this.LANGUAGE_AD_SHOWN_KEY);
      if (shown) {
        console.log('Language ad already shown (lifetime)');
        return false;
      }
    }

    // 2 = once in a day
    if (frequency === 2) {
      const lastShown = await AsyncStorage.getItem(this.LANGUAGE_AD_LAST_SHOWN_KEY);
      if (lastShown) {
        const lastDate = new Date(lastShown).toDateString();
        const today = new Date().toDateString();
        if (lastDate === today) {
          console.log('⏭️ Language ad already shown today');
          return false;
        }
      }
    }

    // 3 = every time (no check needed)

    // Priority: floor_inter > language_inter
    let adToShow: InterstitialAd | null = null;
    let adType = '';

    if (this.isFloorInterstitialLoaded && this.floorInterstitialAd) {
      adToShow = this.floorInterstitialAd;
      adType = 'floor';
    } else if (this.isLanguageInterstitialLoaded && this.languageInterstitialAd) {
      adToShow = this.languageInterstitialAd;
      adType = 'language';
    }

    if (!adToShow) {
      console.log('No language ad loaded');
      return false;
    }

    try {
      this.isShowingAd = true;
      await adToShow.show();

      // Update cooldown
      this.recentAdShown = {
        screenName: 'language_screen',
        timestamp: Date.now()
      };

      // Save based on frequency
      if (frequency === 1) {
        await AsyncStorage.setItem(this.LANGUAGE_AD_SHOWN_KEY, 'true');
      }
      if (frequency === 2) {
        await AsyncStorage.setItem(this.LANGUAGE_AD_LAST_SHOWN_KEY, new Date().toISOString());
      }

      console.log(`Language screen ${actionType} ad shown (${adType})`);
      return true;
    } catch (e) {
      console.log(`Language ${actionType} ad failed`, e);
      this.isShowingAd = false;
      return false;
    }
  }

  // ==================== SETTING SCREEN ADS (Language, Country, etc.) ====================
  async showSettingScreenInterstitialAd(actionType: 'save' | 'back'): Promise<boolean> {
    console.log(`Attempting Setting Screen ${actionType} Ad`);

    if (this.isShowingAd) {
      console.log('Already showing an ad');
      return false;
    }

    if (this.isAdInCooldown()) {
      console.log('Skipping ad due to cooldown');
      return false;
    }

    const settingConfig = this.config?.setting_screen;
    if (!settingConfig) {
      console.log('Setting screen config not found');
      return false;
    }

    const frequency = settingConfig.inter_ads_flag ?? 0;

    // 0 = no ads
    if (frequency === 0) {
      console.log('Setting screen ads disabled (flag = 0)');
      return false;
    }

    // 1 = once in lifetime
    if (frequency === 1) {
      const shown = await AsyncStorage.getItem(this.SETTING_AD_SHOWN_KEY);
      if (shown) {
        console.log('Setting ad already shown (lifetime)');
        return false;
      }
    }

    // 2 = once in a day
    if (frequency === 2) {
      const lastShown = await AsyncStorage.getItem(this.SETTING_AD_LAST_SHOWN_KEY);
      if (lastShown) {
        const lastDate = new Date(lastShown).toDateString();
        const today = new Date().toDateString();
        if (lastDate === today) {
          console.log('⏭️ Setting ad already shown today');
          return false;
        }
      }
    }

    // 3 = every time (no check needed)

    // Priority: floor_inter > setting_inter
    let adToShow: InterstitialAd | null = null;
    let adType = '';

    if (this.isFloorInterstitialLoaded && this.floorInterstitialAd) {
      adToShow = this.floorInterstitialAd;
      adType = 'floor';
    } else if (this.isSettingInterstitialLoaded && this.settingInterstitialAd) {
      adToShow = this.settingInterstitialAd;
      adType = 'setting';
    }

    if (!adToShow) {
      console.log('No setting ad loaded');
      return false;
    }

    try {
      this.isShowingAd = true;
      await adToShow.show();
      trackAdShown(adType, 'setting_screen');

      // Update cooldown
      this.recentAdShown = {
        screenName: 'setting_screen',
        timestamp: Date.now()
      };

      // Save based on frequency
      if (frequency === 1) {
        await AsyncStorage.setItem(this.SETTING_AD_SHOWN_KEY, 'true');
      }
      if (frequency === 2) {
        await AsyncStorage.setItem(this.SETTING_AD_LAST_SHOWN_KEY, new Date().toISOString());
      }

      console.log(`Setting screen ${actionType} ad shown (${adType})`);
      return true;
    } catch (e) {
      console.log(`Setting ${actionType} ad failed`, e);
      this.isShowingAd = false;
      return false;
    }
  }

  // ==================== DETAIL SCREEN ADS (Event, Challenge, Memo, Diary back button) ====================
  async showDetailScreenInterstitialAd(screenName: string): Promise<boolean> {
    console.log(`Attempting Detail Screen Ad for: ${screenName}`);

    if (this.isShowingAd) {
      console.log('Already showing an ad');
      return false;
    }

    if (this.isAdInCooldown()) {
      console.log('Skipping ad due to cooldown');
      return false;
    }

    const detailConfig = this.config?.detail_screen;
    if (!detailConfig) {
      console.log('Detail screen config not found');
      return false;
    }

    const frequency = detailConfig.inter_ads_flag ?? 0;

    // 0 = no ads
    if (frequency === 0) {
      console.log('Detail screen ads disabled (flag = 0)');
      return false;
    }

    // 1 = once in lifetime
    if (frequency === 1) {
      const shown = await AsyncStorage.getItem(this.DETAIL_AD_SHOWN_KEY);
      if (shown) {
        console.log('Detail ad already shown (lifetime)');
        return false;
      }
    }

    // 2 = once in a day
    if (frequency === 2) {
      const lastShown = await AsyncStorage.getItem(this.DETAIL_AD_LAST_SHOWN_KEY);
      if (lastShown) {
        const lastDate = new Date(lastShown).toDateString();
        const today = new Date().toDateString();
        if (lastDate === today) {
          console.log('Detail ad already shown today');
          return false;
        }
      }
    }

    // 3 = every time (no check needed)

    // Priority: floor_inter > detail_inter
    let adToShow: InterstitialAd | null = null;
    let adType = '';

    if (this.isFloorInterstitialLoaded && this.floorInterstitialAd) {
      adToShow = this.floorInterstitialAd;
      adType = 'floor';
    } else if (this.isDetailInterstitialLoaded && this.detailInterstitialAd) {
      adToShow = this.detailInterstitialAd;
      adType = 'detail';
    }

    if (!adToShow) {
      console.log('No detail ad loaded');
      return false;
    }

    try {
      this.isShowingAd = true;
      await adToShow.show();
      trackAdShown(adType, screenName);

      // Update cooldown
      this.recentAdShown = {
        screenName: screenName,
        timestamp: Date.now()
      };

      // Save based on frequency
      if (frequency === 1) {
        await AsyncStorage.setItem(this.DETAIL_AD_SHOWN_KEY, 'true');
      }
      if (frequency === 2) {
        await AsyncStorage.setItem(this.DETAIL_AD_LAST_SHOWN_KEY, new Date().toISOString());
      }

      console.log(`Detail screen ad shown for ${screenName} (${adType})`);
      return true;
    } catch (e) {
      console.log('Detail ad failed', e);
      this.isShowingAd = false;
      return false;
    }
  }

  // ==================== EVENT SCREEN ADS (Event, Challenge, Memo, Diary save/back button) ====================
  async showEventScreenInterstitialAd(screenName: string, actionType: 'save' | 'back'): Promise<boolean> {
    console.log(`Attempting Event Screen ${actionType} Ad for: ${screenName}`);

    if (this.isShowingAd) {
      console.log('Already showing an ad');
      return false;
    }

    if (this.isAdInCooldown()) {
      console.log('Skipping ad due to cooldown');
      return false;
    }

    const eventConfig = this.config?.event_screen;
    if (!eventConfig) {
      console.log('Event screen config not found');
      return false;
    }

    const frequency = eventConfig.inter_ads_flag ?? 0;

    // 0 = no ads
    if (frequency === 0) {
      console.log('Event screen ads disabled (flag = 0)');
      return false;
    }

    // 1 = once in lifetime
    if (frequency === 1) {
      const shown = await AsyncStorage.getItem(this.EVENT_AD_SHOWN_KEY);
      if (shown) {
        console.log('Event ad already shown (lifetime)');
        return false;
      }
    }

    // 2 = once in a day
    if (frequency === 2) {
      const lastShown = await AsyncStorage.getItem(this.EVENT_AD_LAST_SHOWN_KEY);
      if (lastShown) {
        const lastDate = new Date(lastShown).toDateString();
        const today = new Date().toDateString();
        if (lastDate === today) {
          console.log('Event ad already shown today');
          return false;
        }
      }
    }

    // 3 = every time (no check needed)

    // Priority: floor_inter > event_inter
    let adToShow: InterstitialAd | null = null;
    let adType = '';

    if (this.isFloorInterstitialLoaded && this.floorInterstitialAd) {
      adToShow = this.floorInterstitialAd;
      adType = 'floor';
    } else if (this.isEventInterstitialLoaded && this.eventInterstitialAd) {
      adToShow = this.eventInterstitialAd;
      adType = 'event';
    }

    if (!adToShow) {
      console.log('No event ad loaded');
      return false;
    }

    try {
      this.isShowingAd = true;
      await adToShow.show();
      trackAdShown(adType, screenName);

      // Update cooldown
      this.recentAdShown = {
        screenName: screenName,
        timestamp: Date.now()
      };

      // Save based on frequency
      if (frequency === 1) {
        await AsyncStorage.setItem(this.EVENT_AD_SHOWN_KEY, 'true');
      }
      if (frequency === 2) {
        await AsyncStorage.setItem(this.EVENT_AD_LAST_SHOWN_KEY, new Date().toISOString());
      }

      console.log(`Event screen ${actionType} ad shown for ${screenName} (${adType})`);
      return true;
    } catch (e) {
      console.log(`Event ${actionType} ad failed`, e);
      this.isShowingAd = false;
      return false;
    }
  }

  // ==================== BANNER AD CONFIG ====================
  getBannerConfig(screen: 'main' | 'language' | 'setting' | 'event'): { show: boolean; id: string } | null {
    const screenKey = `${screen}_screen` as keyof AdConfig;
    const screenConfig = this.config?.[screenKey];

    if (!screenConfig || typeof screenConfig !== 'object') {
      return null;
    }

    // Type guard for configs with banner
    if ('ad_flag' in screenConfig && 'baner_id' in screenConfig) {
      const config = screenConfig as { ad_flag: number; baner_id: string };

      // ad_flag: 0 = no banner, 1 = show banner
      if (config.ad_flag === 1 && config.baner_id && config.baner_id.trim() !== '') {
        return {
          show: true,
          id: this.getAdUnitId(config.baner_id),
        };
      }
    }

    return null;
  }

  // ==================== SESSION MANAGEMENT ====================
  clearSessionData() {
    this.sessionAdsShown.clear();
    this.recentAdShown = null;
    console.log('Session data cleared');
  }

  resetAdState() {
    this.isShowingAd = false;
    console.log('Ad state reset');
  }

  // ==================== INITIALIZATION ====================
  async initializeAds() {
    console.log('🚀 Initializing Ads...');

    const configLoaded = await this.loadConfigFromFirebase();

    if (!configLoaded) {
      console.log('Failed to load Firebase config');
      return;
    }
    console.log('Config loaded successfully');
    await this.loadFloorInterstitialAd();

    await new Promise(resolve => setTimeout(resolve, 2000));

    if (!this.isFloorInterstitialLoaded) {
      console.log('Floor interstitial not available, loading other interstitials');
      this.loadLanguageInterstitialAd();
      this.loadSettingInterstitialAd();
      this.loadDetailInterstitialAd();
      this.loadEventInterstitialAd();
    } else {
      console.log('Floor interstitial loaded, other interstitials will use it');
    }
    this.loadRewardedAd();
  }
  async initializeAdsWithoutFloorInter() {
    console.log('🚀 Initializing Ads (WITHOUT floor_inter)...');

    const configLoaded = await this.loadConfigFromFirebase();

    if (!configLoaded) {
      console.log('Failed to load Firebase config');
      return;
    }

    console.log('Config loaded successfully');

    console.log('Skipping floor_inter, loading screen-specific interstitials');
    this.loadLanguageInterstitialAd();
    this.loadSettingInterstitialAd();
    this.loadDetailInterstitialAd();
    this.loadEventInterstitialAd();
    this.loadRewardedAd();
  }

  getConfig() {
    return this.config;
  }
}

export default AdsManager.getInstance();