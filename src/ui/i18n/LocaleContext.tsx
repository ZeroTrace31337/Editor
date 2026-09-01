/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { SupportedLocale, SUPPORTED_LOCALES, TRANSLATIONS, LocaleInfo } from '../../core/i18n/Localization';

interface LocaleContextValue {
  locale: SupportedLocale;
  setLocale: (loc: SupportedLocale) => void;
  isRTL: boolean;
  supportedLocales: LocaleInfo[];
  t: (key: string, defaultText?: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const STORAGE_KEY = 'veecut_locale';

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => {
    return (localStorage.getItem(STORAGE_KEY) as SupportedLocale) || 'en';
  });

  const activeLocaleInfo = SUPPORTED_LOCALES.find((l) => l.code === locale) || SUPPORTED_LOCALES[0];
  const isRTL = activeLocaleInfo.direction === 'rtl';

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
  }, [locale, isRTL]);

  const setLocale = (loc: SupportedLocale) => {
    setLocaleState(loc);
  };

  const t = (key: string, defaultText?: string): string => {
    const dict = TRANSLATIONS[locale] || TRANSLATIONS.en;
    if (dict[key]) return dict[key];
    if (TRANSLATIONS.en[key]) return TRANSLATIONS.en[key];
    return defaultText || key;
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, isRTL, supportedLocales: SUPPORTED_LOCALES, t }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = (): LocaleContextValue => {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return ctx;
};
