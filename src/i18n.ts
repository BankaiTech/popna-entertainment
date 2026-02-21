// Multi-language Safe Translation
// SaaS Ready — Fully Dynamic Product
// Load only selected language (performance: do not load all languages)
// Ready for backend language sync via setLanguage(lang)

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

const LANGUAGE_KEY = 'language';
const DEFAULT_LANG = 'en';

export const supportedLanguages = [
  { code: 'en', label: 'English' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'മലയാളം' },
] as const;

export type SupportedLocale = (typeof supportedLanguages)[number]['code'];

function getStoredLanguage(): string {
  try {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    if (stored && supportedLanguages.some((l) => l.code === stored)) return stored;
  } catch (_) {}
  return DEFAULT_LANG;
}

/** Set language and persist. Apply immediately without reload. Ready for backend language sync. */
export function setLanguage(lang: string): void {
  const code = supportedLanguages.some((l) => l.code === lang) ? lang : DEFAULT_LANG;
  try {
    localStorage.setItem(LANGUAGE_KEY, code);
  } catch (_) {}
  i18n.changeLanguage(code);
}

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: getStoredLanguage(),
    fallbackLng: DEFAULT_LANG,
    supportedLngs: supportedLanguages.map((l) => l.code),
    load: 'currentOnly',
    backend: {
      loadPath: '/locales/{{lng}}.json',
    },
    react: { useSuspense: false },
    interpolation: { escapeValue: false },
  });

export default i18n;
