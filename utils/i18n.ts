import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import de from "../locales/de.json";
import en from "../locales/en.json";
import es from "../locales/es.json";
import fr from "../locales/fr.json";
import hi from "../locales/hi.json";
import id from "../locales/id.json";
import it from "../locales/it.json";
import ja from "../locales/ja.json";
import ko from "../locales/ko.json";
import pt from "../locales/pt.json";
import ru from "../locales/ru.json";
import zh from "../locales/zh.json";

// Supported languages
const SUPPORTED_LANGUAGES = ['en', 'hi', 'de', 'es', 'fr', 'id', 'it', 'ko', 'pt', 'ru', 'zh', 'ja'];

let isInitialized = false;
let initPromise: Promise<typeof i18n> | null = null;

export const initializeI18n = async () => {
    if (initPromise) {
        console.log('⏳ i18n initialization already in progress...');
        return initPromise;
    }
    if (isInitialized) {
        console.log('✅ i18n already initialized');
        return i18n;
    }
    
    initPromise = (async () => {
        try {
            console.log('🌍 Initializing i18n...');
            const savedLang = await AsyncStorage.getItem("selectedLanguage") || 
                             await AsyncStorage.getItem("appLanguage");
            console.log('💾 Saved language:', savedLang);
        
            const locales = Localization.getLocales();
            const deviceLang = locales[0]?.languageCode ?? "en";
            console.log('📱 Device language:', deviceLang);
            
            let defaultLang = "en";
            
            if (savedLang && SUPPORTED_LANGUAGES.includes(savedLang)) {
                defaultLang = savedLang;
                console.log('✅ Using saved language:', savedLang);
            } else if (SUPPORTED_LANGUAGES.includes(deviceLang)) {
                defaultLang = deviceLang;
                console.log('📱 Using device language:', deviceLang);
                await AsyncStorage.setItem("appLanguage", deviceLang);
            } else {
                console.log('⚠️ Using fallback: English');
                await AsyncStorage.setItem("appLanguage", "en");
            }

            await i18n
                .use(initReactI18next)
                .init({
                    compatibilityJSON: "v3",
                    lng: defaultLang,
                    fallbackLng: "en",
                    resources: {
                        en: { translation: en },
                        hi: { translation: hi },
                        de: { translation: de }, 
                        es: { translation: es }, 
                        fr: { translation: fr }, 
                        id: { translation: id }, 
                        it: { translation: it }, 
                        ko: { translation: ko }, 
                        pt: { translation: pt },
                        ru: { translation: ru }, 
                        zh: { translation: zh }, 
                        ja: { translation: ja }, 
                    },
                    interpolation: { 
                        escapeValue: false 
                    },
                    react: {
                        useSuspense: false,
                    },
                });
            
            isInitialized = true;
            console.log('✅ i18n initialized successfully');
            console.log('📍 Current language:', i18n.language);
            
            return i18n;
        } catch (error) {
            console.error('❌ Error initializing i18n:', error);
            
            await i18n
                .use(initReactI18next)
                .init({
                    compatibilityJSON: "v3",
                    lng: "en",
                    fallbackLng: "en",
                    resources: {
                        en: { translation: en },
                        hi: { translation: hi },
                        de: { translation: de }, 
                        es: { translation: es }, 
                        fr: { translation: fr }, 
                        id: { translation: id }, 
                        it: { translation: it }, 
                        ko: { translation: ko }, 
                        pt: { translation: pt },
                        ru: { translation: ru }, 
                        zh: { translation: zh },
                        ja: { translation: ja }, 
                    },
                    interpolation: { escapeValue: false },
                    react: { useSuspense: false },
                });
            
            isInitialized = true;
            return i18n;
        }
    })();
    return initPromise;
};

initializeI18n();

export default i18n;