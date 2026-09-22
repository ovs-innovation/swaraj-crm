import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getByPath, translations } from '../../i18n/translations';

const LanguageContext = createContext(null);
const LANG_KEY = 'swaraj_lang';

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => localStorage.getItem(LANG_KEY) || 'en');

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang === 'hi' ? 'hi' : 'en';
    document.documentElement.setAttribute('data-lang', lang);
  }, [lang]);

  const value = useMemo(() => {
    const t = (key) => {
      const value = getByPath(translations[lang], key) ?? getByPath(translations.en, key);
      return value == null ? key : value;
    };
    return { lang, setLang, t };
  }, [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLang = () => useContext(LanguageContext);
