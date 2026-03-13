import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useOrganizationStore } from '@/store/useOrganizationStore';

/**
 * Hook that wraps useTranslation() with industry terminology overrides.
 * Returns term(key, fallback) which checks org terminology first, then i18n.
 */
export function useTerminology() {
  const { t } = useTranslation();
  const currentOrganization = useOrganizationStore((s) => s.currentOrganization);

  const term = useCallback(
    (key: string, fallback?: string): string => {
      const terminology = currentOrganization?.terminology;
      if (terminology?.[key]) return terminology[key];
      return t(`terminology.${key}`, fallback ?? key);
    },
    [currentOrganization, t]
  );

  return { term };
}
