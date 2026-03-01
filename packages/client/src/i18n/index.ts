import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en';
import he from './he';

const savedLang = localStorage.getItem('lang') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      he: { translation: he },
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

// Keep <html> dir in sync
document.documentElement.dir = savedLang === 'he' ? 'rtl' : 'ltr';
document.documentElement.lang = savedLang;

export const toggleLanguage = () => {
  const next = i18n.language === 'en' ? 'he' : 'en';
  i18n.changeLanguage(next);
  localStorage.setItem('lang', next);
  document.documentElement.dir = next === 'he' ? 'rtl' : 'ltr';
  document.documentElement.lang = next;
};

export default i18n;
