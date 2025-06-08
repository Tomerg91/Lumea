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
      // Look for language preference in localStorage
      lookupLocalStorage: 'i18nextLng',
    },
    // Performance optimizations
    load: 'languageOnly', // Load only language, not region
    preload: ['he', 'en'], // Preload both languages
    cleanCode: true, // Clean language codes
    nonExplicitSupportedLngs: true,
  });

// Set document direction and language on language change
i18n.on('languageChanged', (lng) => {
  const isRTL = lng === 'he';
  document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', lng);
  
  // Store in localStorage for persistence
  localStorage.setItem('i18nextLng', lng);
});

// Initialize direction on first load
const currentLang = i18n.language || 'he';
const isRTL = currentLang === 'he';
document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
document.documentElement.setAttribute('lang', currentLang);

export default i18n;
