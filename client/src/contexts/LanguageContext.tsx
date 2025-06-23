import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';

interface LanguageContextType {
  language: 'he' | 'en';
  isRTL: boolean;
  setLanguage: (lang: 'he' | 'en') => void;
  isChangingLanguage: boolean;
  t: (key: string, options?: any) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { i18n, t } = useTranslation();
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  
  const currentLanguage = i18n.language as 'he' | 'en';
  const isRTL = currentLanguage === 'he';

  const setLanguage = async (lang: 'he' | 'en') => {
    if (lang === currentLanguage) return;
    
    setIsChangingLanguage(true);
    
    try {
      // Save preference to localStorage
      localStorage.setItem('i18nextLng', lang);
      
      // If running in Capacitor (mobile), we need to restart the app
      // to properly apply RTL/LTR changes
      if (Capacitor.isNativePlatform()) {
        // Set the language first
        await i18n.changeLanguage(lang);
        
        // Show user feedback about restart
        if (window.confirm(
          lang === 'he' 
            ? 'האפליקציה תתחיל מחדש כדי להחיל את שינוי השפה'
            : 'The app will restart to apply the language change'
        )) {
          // Force app restart on mobile for proper RTL/LTR
          window.location.reload();
        }
      } else {
        // For web, just change language normally
        await i18n.changeLanguage(lang);
      }
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setIsChangingLanguage(false);
    }
  };

  return (
    <LanguageContext.Provider value={{
      language: currentLanguage,
      isRTL,
      setLanguage,
      isChangingLanguage,
      t
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}; 