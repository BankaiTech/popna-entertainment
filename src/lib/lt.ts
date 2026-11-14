/**
 * Translation for LCO Desk screens. The English text itself is the key, so code stays readable:
 *   const tr = useLt();  tr('Collected today')  tr('{{n}} payments', { n: 5 })
 * Translations live in public/locales/<lang>.json under the same English key.
 * (Use variable names other than `count`, which i18next treats as plural.)
 */
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

export type Lt = (text: string, vars?: Record<string, string | number>) => string;

export function useLt(): Lt {
  const { t } = useTranslation();
  return useCallback(
    (text: string, vars?: Record<string, string | number>) =>
      t(text, { defaultValue: text, nsSeparator: false, keySeparator: false, ...vars }) as string,
    [t],
  );
}

/**
 * Same as useLt() but usable anywhere inside a component without a hook. Screens refresh on a
 * language change because App re-renders its routes when the language (or its file) loads.
 * Do not call it at module level: that would run once, before the user picks a language.
 */
export function tr(text: string, vars?: Record<string, string | number>): string {
  return i18n.t(text, { defaultValue: text, nsSeparator: false, keySeparator: false, ...vars }) as string;
}
