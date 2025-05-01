import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import actual translation files
import enTranslation from './locales/en.json';
import heTranslation from './locales/he.json';

i18n
  // Detect user language automatically
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    debug: true, // Logs info to console. Set to false for production.
    fallbackLng: "he", // Use Hebrew if detected language is not available
    lng: "he", // Force Hebrew as the default language
    interpolation: {
      escapeValue: false, // React already protects from XSS
    },
    resources: {
      en: {
        translation: enTranslation,
      },
      he: {
        translation: heTranslation,
      },
    },
    detection: {
      // Order and methods for language detection
      order: ['querystring', 'cookie', 'localStorage', 'sessionStorage', 'navigator', 'htmlTag'],
      // Caching detected language
      caches: ['localStorage', 'cookie'],
      // Override detected language with Hebrew unless explicitly changed
      lookupQuerystring: 'lng',
      lookupCookie: 'i18next',
      lookupLocalStorage: 'i18nextLng'
    }
  });

export default i18n; 