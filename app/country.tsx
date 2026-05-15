import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Network from 'expo-network';
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Image,
  InteractionManager,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import {
  BannerAdSize,
  GAMBannerAd
} from 'react-native-google-mobile-ads';
import { CustomToast } from '../components/CustomToast';
import { useTheme } from '../contexts/ThemeContext';
import { COUNTRIES } from "../data/countries";
import AdsManager from '../services/adsManager';
import PurchaseManager from '../services/purchaseManager';

export default function Country({ navigation }: any) {
  const router = useRouter();
  const { colors } = useTheme();
  const [search, setSearch] = useState("");
  const { t, i18n } = useTranslation();
  const [showSearch, setShowSearch] = useState(false);
  const searchParams = useLocalSearchParams();
  const [filtered, setFiltered] = useState(COUNTRIES);
  const [isSearch, setIsSearch] = useState(false);
  const SELECTED_COUNTRY_KEY = 'selectedCountry';
  const [selected, setSelected] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isPremium, setIsPremium] = useState(false);

  // Show toast function
  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
  };

  useEffect(() => {
    const checkPremium = async () => {
      const premium = await PurchaseManager.isPremium();
      setIsPremium(premium);
    };
    checkPremium();
  }, []);

  const checkNetworkStatus = async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      const connected = networkState.isConnected ?? false;

      const isReachable = networkState.isInternetReachable ?? false;
      const networkType = networkState.type;

      console.log('Network Status:', {
        isConnected: connected,
        isInternetReachable: isReachable,
        type: networkType
      });

      const actuallyConnected = connected && isReachable;

      setIsConnected(actuallyConnected);
      return actuallyConnected;
    } catch (error) {
      console.log('Network check error:', error);
      setIsConnected(false);
      return false;
    }
  };

  useEffect(() => {
    checkNetworkStatus();

    const intervalId = setInterval(async () => {
      const connected = await checkNetworkStatus();

      if (!connected && isConnected) {
        showToast(t("no_internet") || "No Internet Connection");
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [isConnected]);

  const getTranslatedName = (countrys: any) => {
    return t(countrys.translationKey || countrys.name);
  };

  const translatedCountries = useMemo(() => {
    return COUNTRIES.map(countrys => ({
      ...countrys,
      translatedName: getTranslatedName(countrys)
    }));
  }, [i18n.language]);

  useEffect(() => {
    const searchLower = search.toLowerCase();
    setFiltered(
      translatedCountries.filter((item) =>
        item.translatedName.toLowerCase().includes(searchLower) ||
        item.name.toLowerCase().includes(searchLower)
      )
    );
  }, [search, translatedCountries]);

  const [bannerConfig, setBannerConfig] = useState<{
    show: boolean;
    id: string;
  } | null>(null);

  // Load banner config from setting_screen (country uses setting_screen config)
  useEffect(() => {
    const config = AdsManager.getBannerConfig('setting');
    console.log('Country screen banner config:', config);
    setBannerConfig(config);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      InteractionManager.runAfterInteractions(() => {
        loadSavedCountry();
        checkNetworkStatus();
        setIsSearch(false);
        setSearch("");
      });
    }, [])
  );

  const loadSavedCountry = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Load timeout')), 2000)
      );
      const loadPromise = AsyncStorage.getItem(SELECTED_COUNTRY_KEY);

      const savedCountry = await Promise.race([loadPromise, timeoutPromise]) as string | null;

      console.log('Loaded country on focus:', savedCountry);
      if (savedCountry) {
        try {
          const parsed = JSON.parse(savedCountry);
          setSelected(Array.isArray(parsed) ? parsed : [parsed]);
        } catch {
          setSelected([savedCountry]);
        }
      } else {
        setSelected(['United Kingdom']);
      }
    } catch (error) {
      console.log('Error loading country:', error);
      setSelected(['United Kingdom']);
    }
  };

  // Back button - uses setting_screen config
  const handleBackPress = async () => {
    console.log('Country back button pressed');

    const from = searchParams?.from;
    const routeMap = {
      "year-view": "/year-view",
    };

    const targetRoute = routeMap[from] || {
      pathname: '/',
      params: {
        refresh: Date.now().toString(),
        resetToToday: 'true',
      },
    };

    // Show setting screen back ad
    const hasNetwork = await checkNetworkStatus();
    if (hasNetwork) {
      console.log('Attempting to show country back ad...');
      const adShown = await AdsManager.showSettingScreenInterstitialAd('back');

      if (adShown) {
        console.log('Country back ad shown, navigating after ad closes');
        setTimeout(() => router.push(targetRoute), 500);
      } else {
        console.log('Country back ad not shown, navigating immediately');
        router.push(targetRoute);
      }
    } else {
      console.log('No network, navigating without ad');
      router.push(targetRoute);
    }
  };

  const toggleSelect = (countryName: string) => {
    const isSelected = selected.includes(countryName);

    if (isSelected) {
      if (selected.length === 1) {
        showToast(
          t("one_country_required") || "At least one country must be selected"
        );
        return;
      }
      setSelected(selected.filter((c) => c !== countryName));
    } else {
      setSelected([...selected, countryName]);
    }
  };

  // Save button - uses setting_screen config
  const saveCountries = async () => {
    if (isSaving) return;

    if (selected.length === 0) {
      showToast(
        t("one_country_required") || "At least one country must be selected"
      );
      return;
    }

    const hasNetwork = await checkNetworkStatus();
    if (!hasNetwork) {
      showToast(
        t("no_internet_message") ||
        "Please check your internet connection and try again."
      );
      return;
    }

    setIsSaving(true);

    try {
      const countriesToSave = JSON.stringify(selected);

      const savePromise = AsyncStorage.setItem(
        SELECTED_COUNTRY_KEY,
        countriesToSave
      );
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Save timeout")), 2000)
      );
      await Promise.race([savePromise, timeoutPromise]);
      console.log("Countries saved:", selected);

      const targetRoute = searchParams?.from === "year-view"
        ? "/year-view"
        : {
          pathname: "/",
          params: {
            refresh: Date.now().toString(),
            resetToToday: "true",
          },
        };

      // Show setting screen save ad
      console.log('🎬 Attempting to show country save ad...');
      const adShown = await AdsManager.showSettingScreenInterstitialAd('save');

      if (adShown) {
        console.log('Country save ad shown, navigating after ad closes');
        setTimeout(() => router.push(targetRoute), 500);
      } else {
        console.log('Country save ad not shown, navigating immediately');
        router.push(targetRoute);
      }

    } catch (error) {
      console.log("Error saving countries:", error);
      showToast(
        t("save_error_message") ||
        "Country selection not possible. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const getTranslatedNameByCode = (countryName: string) => {
    const countrys = COUNTRIES.find(c => c.name === countryName);
    return countrys ? getTranslatedName(countrys) : countryName;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        {!isSearch && (
          <>
            {/* <View style={styles.leftContainer}> */}
            {/* <TouchableOpacity
                onPress={handleBackPress}
                style={styles.backButton}>
                <Feather name="arrow-left" size={24} color={colors.textPrimary} />
              </TouchableOpacity> */}
            <TouchableOpacity onPress={handleBackPress} style={styles.closeBtn} activeOpacity={0.7}>
              <View style={[styles.closeBtnCircle, { backgroundColor: colors.cardBackground }]}>
                {/* <Text style={[styles.closeBtnX, { color: colors.textPrimary }]}>✕</Text> */}
                <Ionicons name="chevron-back" size={28} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {t("select_country")}
            </Text>
            {/* </View> */}

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity onPress={() => setIsSearch(true)} style={{ marginRight: 10 }}>
                <Feather name="search" size={22} style={[{ color: colors.textPrimary }]} />
              </TouchableOpacity>
              <TouchableOpacity onPress={saveCountries} disabled={isSaving}>
                {/* <View style={[styles.closeBtnCircle, { backgroundColor: colors.primary }]}>
                  <Feather name="check" size={24} style={[{ color: colors.white, opacity: isSaving ? 0.5 : 1 }]} />
                </View> */}
                <Text style={[styles.doneText, { color: colors.primary }]}>
                  {t("done")}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {isSearch && (
          <View style={[styles.searchHeader, { backgroundColor: colors.background }]}>
            <TouchableOpacity onPress={() => { setIsSearch(false); setSearch(""); }}>
              <Feather name="x" size={28} style={[{ color: colors.textPrimary }]} />
            </TouchableOpacity>
            <TextInput
              placeholder={t("search")}
              placeholderTextColor="#888"
              value={search}
              onChangeText={setSearch}
              style={[styles.searchInput, { color: colors.textPrimary }]}
              autoFocus
            />
            <TouchableOpacity onPress={saveCountries} disabled={isSaving}>
              <Feather name="check" size={26} style={[{ color: colors.textPrimary, opacity: isSaving ? 0.5 : 1 }]} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagWrapper}>
        {selected.map((name) => (
          <View key={name} style={[styles.tag, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.tagText, { color: colors.textPrimary }]}>
              {getTranslatedNameByCode(name)}
            </Text>
            {selected.length > 1 && (
              <TouchableOpacity onPress={() => toggleSelect(name)} style={{ marginLeft: 6 }}>
                <Feather name="x" size={16} style={[{ color: colors.textSecondary }]} />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.code}
        renderItem={({ item }) => {
          const isSelected = selected.includes(item.name);
          return (
            <TouchableOpacity
              style={[styles.countryItem]}
              onPress={() => toggleSelect(item.name)}
            >
              <View style={[styles.maindata, { backgroundColor: colors.cardBackground }]}>
                <Image source={item.flag} style={[styles.flag]} />
                <Text style={[styles.countryText, { color: colors.textPrimary }]}>
                  {item.translatedName}
                </Text>
                {isSelected ? (
                  <Feather name="check-circle" size={22} color="#FF433A" />
                ) : (
                  <Feather name="circle" size={22} color="#ccc" />
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      />

      {/* Show banner from setting_screen config */}
      {/* {bannerConfig?.show && isConnected && (
        <View style={styles.stickyAdContainer}>
          <GAMBannerAd
            unitId={bannerConfig.id}
            sizes={[BannerAdSize.BANNER]}
            requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          />
        </View>
      )} */}
      {bannerConfig?.show && isConnected && !isPremium && (
        <View style={styles.stickyAdContainer}>
          <GAMBannerAd
            unitId={bannerConfig.id}
            sizes={[BannerAdSize.BANNER]}
            requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          />
        </View>
      )}

      {/* Toast at bottom */}
      <CustomToast
        visible={toastVisible}
        message={toastMessage}
        onHide={() => setToastVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 15 },
  stickyAdContainer: {
    bottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  doneText: {
    fontSize: 20,
    fontWeight: '600',
  },
  topBar: {
    marginTop: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  texcountry: {},
  topTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  maindata: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    // marginHorizontal: 16,
    // marginBottom: 12,
    borderRadius: 12,
  },
  rightIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  search: {
    height: 40,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginVertical: 10,
  },
  closeBtn: { minWidth: 50, alignItems: 'flex-start', justifyContent: 'center' },
  closeBtnCircle: {
    width: 40, height: 40, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnX: { fontSize: 25, fontWeight: '700' },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    marginTop: 50,
  },
  backButton: {
    padding: 4,
    marginRight: 10,
  },
  backIcon: {
    fontSize: 26,
    fontWeight: "600"
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    alignItems: 'center'
  },
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  searchInput: {
    flex: 1,
    height: 40,
    marginLeft: 10,
    borderBottomWidth: 1.3,
    borderColor: "#ccc",
    fontSize: 17,
    paddingHorizontal: 10,
  },
  tagWrapper: {
    maxHeight: 70,
    flexShrink: 1,
    marginTop: 6,
    marginBottom: 10,
    paddingBottom: 30,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF0F0",
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 18,
    marginRight: 8,
    borderColor: "#FF433A",
  },
  tagText: {
    fontSize: 14,
    color: "#FF433A",
  },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
  },
  flag: {
    width: 30,
    height: 30,
    marginRight: 12,
    borderRadius: 4,
  },
  countryText: {
    fontSize: 16,
    flex: 1,
  },
});