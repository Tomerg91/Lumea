import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

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
    debug: false, // Disable debug logging for better performance
    fallbackLng: 'he', // Use Hebrew if detected language is not available
    lng: 'he', // Force Hebrew as the default language
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
      order: ['localStorage', 'cookie', 'navigator'],
      // Caching detected language
      caches: ['localStorage'],
      // Override detected language with Hebrew unless explicitly changed
      lookupLocalStorage: 'i18nextLng',
    },
    // Performance optimizations
    load: 'languageOnly', // Load only language, not region
    preload: ['he'], // Preload only Hebrew
    cleanCode: true, // Clean language codes
    nonExplicitSupportedLngs: true,
  });

export default i18n;
