import type { ServiceCategory, Product } from '@/models/types';

/**
 * Get service category from product type.
 */
export const getServiceCategory = (productType: 'cable' | 'internet'): ServiceCategory => productType;

/**
 * Check if provider is cable type. Uses product data only - no hardcoded names.
 */
export const isCableProvider = (provider: string, products?: Product[]): boolean => {
  if (!products?.length) return false;
  const product = products.find((p) => p.name === provider);
  return product?.productType === 'cable';
};

/**
 * Check if provider is internet type. Uses product data only - no hardcoded names.
 */
export const isInternetProvider = (provider: string, products?: Product[]): boolean => {
  if (!products?.length) return false;
  const product = products.find((p) => p.name === provider);
  return product?.productType === 'internet';
};

/**
 * Get display name for provider. Uses product name from API/store; no static map.
 */
export const getProviderDisplayName = (provider: string, _products?: Product[]): string => {
  return provider || '';
};

/**
 * Get short display name for provider.
 */
export const getProviderShortName = (provider: string, products?: Product[]): string => {
  return getProviderDisplayName(provider, products);
};

/**
 * Get connection type label for display. Product name from API is the label.
 */
export const getConnectionTypeLabel = (provider: string, _products?: Product[]): string => {
  return provider || '';
};
