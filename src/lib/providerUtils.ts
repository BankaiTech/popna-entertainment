import type { Provider, ServiceCategory } from '@/models/types';
import { CABLE_PROVIDER, INTERNET_PROVIDERS } from '@/models/types';

/** Cable service: GTPL only. Internet: BSNL, Railwire, Krishiinet. Do NOT mix. */
export const getServiceCategory = (provider: Provider): ServiceCategory =>
  provider === CABLE_PROVIDER ? 'cable' : 'internet';

export const isCableProvider = (provider: Provider): boolean => provider === CABLE_PROVIDER;
export const isInternetProvider = (provider: Provider): boolean =>
  INTERNET_PROVIDERS.includes(provider);

/**
 * Get display name for provider.
 * GTPL = Cable; others = Internet (never mix GTPL with internet in labels).
 */
export const getProviderDisplayName = (provider: Provider): string => {
  if (provider === 'GTPL') return 'GTPL Cable';
  return provider;
};

/**
 * Get short display name for provider
 */
export const getProviderShortName = (provider: Provider): string => {
  if (provider === 'GTPL') return 'GTPL Cable';
  return provider;
};

/**
 * Get connection type label for display (Cable vs Internet separation).
 */
export const getConnectionTypeLabel = (provider: Provider): string => {
  if (provider === 'GTPL') return 'GTPL Cable';
  return provider;
};
