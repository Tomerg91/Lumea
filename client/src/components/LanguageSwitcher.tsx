import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'toggle' | 'select';
  className?: string;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  variant = 'dropdown',
  className = ''
}) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  const currentLanguage = i18n.language || 'he';
  const isRTL = currentLanguage === 'he';

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
  };

  const toggleLanguage = () => {
    const newLang = currentLanguage === 'he' ? 'en' : 'he';
    changeLanguage(newLang);
  };

  if (variant === 'toggle') {
    return (
      <button
        onClick={toggleLanguage}
        className={`text-sm font-semibold px-3 py-1 rounded-lg bg-gradient-coral-teal text-white hover:opacity-90 transition-opacity ${className}`}
        aria-label={`Switch to ${currentLanguage === 'he' ? 'English' : 'Hebrew'}`}
      >
        {currentLanguage === 'he' ? 'English' : 'עברית'}
      </button>
    );
  }

  if (variant === 'select') {
    return (
      <select
        value={currentLanguage}
        onChange={(e) => changeLanguage(e.target.value)}
        className={`glass-input w-full ${className}`}
        aria-label="Select language"
      >
        <option value="he">עברית</option>
        <option value="en">English</option>
      </select>
    );
  }

  // Default dropdown variant
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-xl glass-card hover-lift transition-all duration-300"
        aria-label="Language menu"
        aria-expanded={isOpen}
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm font-medium">{currentLanguage.toUpperCase()}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Dropdown menu */}
          <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} mt-2 w-32 glass-card-strong rounded-xl shadow-lumea-medium overflow-hidden z-50`}>
            <button
              onClick={() => changeLanguage('he')}
              className={`w-full px-4 py-2 text-sm hover:bg-gradient-background-subtle transition-colors duration-200 text-start ${
                currentLanguage === 'he' ? 'bg-gradient-cream-peach font-medium' : ''
              }`}
              aria-label="Switch to Hebrew"
            >
              עברית
            </button>
            <button
              onClick={() => changeLanguage('en')}
              className={`w-full px-4 py-2 text-sm hover:bg-gradient-background-subtle transition-colors duration-200 text-start ${
                currentLanguage === 'en' ? 'bg-gradient-cream-peach font-medium' : ''
              }`}
              aria-label="Switch to English"
            >
              English
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher; 