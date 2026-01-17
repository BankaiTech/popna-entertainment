import type { Provider } from '@/models/types';

/**
 * Get display name for provider
 * GTPL is displayed as "Cable Network", others as-is
 */
export const getProviderDisplayName = (provider: Provider): string => {
  if (provider === 'GTPL') {
    return 'GTPL Cable Network';
  }
  return provider;
};

/**
 * Get short display name for provider
 * GTPL is displayed as "GTPL Cable", others as-is
 */
export const getProviderShortName = (provider: Provider): string => {
  if (provider === 'GTPL') {
    return 'GTPL Cable';
  }
  return provider;
};

/**
 * Get connection type label for display
 */
export const getConnectionTypeLabel = (provider: Provider): string => {
  if (provider === 'GTPL') {
    return 'GTPL Cable Network';
  }
  return provider;
};
