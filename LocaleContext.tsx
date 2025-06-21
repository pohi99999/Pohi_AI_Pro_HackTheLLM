
import React, { createContext, useState, useContext, useCallback, ReactNode, useEffect } from 'react';
import { translations as appTranslations, type Locale as AppLocale, type TranslationKey as AppTranslationKey } from './locales';

interface LocaleContextType {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: AppTranslationKey, params?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);
const LOCALE_STORAGE_KEY = 'pohi-ai-locale';

export const LocaleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<AppLocale>(() => {
    const storedLocale = typeof window !== 'undefined' ? localStorage.getItem(LOCALE_STORAGE_KEY) : null;
    return (storedLocale === 'hu' || storedLocale === 'en' || storedLocale === 'de') ? storedLocale : 'hu';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    }
  }, [locale]);

  const setLocale = (newLocale: AppLocale) => {
    setLocaleState(newLocale);
  };

  const t = useCallback((key: AppTranslationKey, params?: Record<string, string | number>): string => {
    let translation = appTranslations[locale]?.[key] || appTranslations['en']?.[key] || String(key); // Fallback: current -> English -> key
    if (params) {
      Object.keys(params).forEach(paramKey => {
        translation = translation.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(params[paramKey]));
      });
    }
    return translation;
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = (): LocaleContextType => {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};
