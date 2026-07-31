import remoteConfig from '@react-native-firebase/remote-config';

// ------------------------------
// SAFE FALLBACK DEFAULTS
// Sirf app crash na ho isliye — koi real ad ID yahan nahi,
// sab kuch Firebase Remote Config se fetch hoga
// ------------------------------
const REMOTE_DEFAULTS = {
  // custom_theme
  reward_ad_flag: 0,
  reward_id: '',

  // detail_screen
  inter_ads_flag: 0,
  inter_id: '',

  // event_screen
  ad_flag: 0,
  baner_id: '',
  event_inter_ads_flag: 0,
  event_inter_id: '',

  // floor_inter
  floor_inter_ads_flag: 0,
  floor_inter_id: '',

  // language_screen
  language_ad_flag: 0,
  language_baner_id: '',
  language_inter_ads_flag: 0,
  language_inter_id: '',

  // main_screen
  main_ad_flag: 0,
  main_baner_id: '',

  // main_screen_ad
  main_screen_ad_flag: 0,
  main_screen_inter_id: '',

  // setting_screen
  setting_ad_flag: 0,
  setting_baner_id: '',
  setting_inter_ads_flag: 0,
  setting_inter_id: '',

  // splash_screen
  splash_inter_ads_flag: 0,
  splash_inter_id: '',
};

let isInitialized = false;

async function initRemoteConfig() {
  if (isInitialized) return;

  await remoteConfig().setConfigSettings({
    minimumFetchIntervalMillis: __DEV__ ? 0 : 3600000,
  });

  await remoteConfig().setDefaults(REMOTE_DEFAULTS);
  isInitialized = true;
}

// ------------------------------
// FETCH APP CONFIG FROM REMOTE CONFIG
// ------------------------------
export async function fetchAppConfig() {
  try {
    await initRemoteConfig();

    const activated = await remoteConfig().fetchAndActivate();
    console.log('Remote Config fetched & activated:', activated);

    const getNum = (key: string) => remoteConfig().getValue(key).asNumber();
    const getStr = (key: string) => remoteConfig().getValue(key).asString();

    const config = {
      custom_theme: {
        reward_ad_flag: getNum('reward_ad_flag'),
        reward_id: getStr('reward_id'),
      },
      detail_screen: {
        inter_ads_flag: getNum('inter_ads_flag'),
        inter_id: getStr('inter_id'),
      },
      event_screen: {
        ad_flag: getNum('ad_flag'),
        baner_id: getStr('baner_id'),
        inter_ads_flag: getNum('event_inter_ads_flag'),
        inter_id: getStr('event_inter_id'),
      },
      floor_inter: {
        inter_ads_flag: getNum('floor_inter_ads_flag'),
        inter_id: getStr('floor_inter_id'),
      },
      language_screen: {
        ad_flag: getNum('language_ad_flag'),
        baner_id: getStr('language_baner_id'),
        inter_ads_flag: getNum('language_inter_ads_flag'),
        inter_id: getStr('language_inter_id'),
      },
      main_screen: {
        ad_flag: getNum('main_ad_flag'),
        baner_id: getStr('main_baner_id'),
      },
      main_screen_ad: {
        ad_flag: getNum('main_screen_ad_flag'),
        inter_id: getStr('main_screen_inter_id'),
      },
      setting_screen: {
        ad_flag: getNum('setting_ad_flag'),
        baner_id: getStr('setting_baner_id'),
        inter_ads_flag: getNum('setting_inter_ads_flag'),
        inter_id: getStr('setting_inter_id'),
      },
      splash_screen: {
        inter_ads_flag: getNum('splash_inter_ads_flag'),
        inter_id: getStr('splash_inter_id'),
      },
    };

    console.log('Remote Config mapped:', config);
    return config;
  } catch (error) {
    console.log('Remote Config Fetch Failed:', error);
    return null;
  }
}