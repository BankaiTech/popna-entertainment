import type { Provider, ServiceCategory, Product } from '@/models/types';

/**
 * Get service category from product type.
 * Multi-tenant ready — uses product data dynamically.
 */
export const getServiceCategory = (productType: 'cable' | 'internet'): ServiceCategory => productType;

/**
 * Check if provider is cable type (deprecated - use product data instead).
 * Kept for backward compatibility.
 */
export const isCableProvider = (provider: Provider, products?: Product[]): boolean => {
  if (products) {
    const product = products.find((p) => p.name === provider);
    return product?.productType === 'cable';
  }
  // Fallback for backward compatibility
  return provider === 'GTPL';
};

/**
 * Check if provider is internet type (deprecated - use product data instead).
 * Kept for backward compatibility.
 */
export const isInternetProvider = (provider: Provider, products?: Product[]): boolean => {
  if (products) {
    const product = products.find((p) => p.name === provider);
    return product?.productType === 'internet';
  }
  // Fallback for backward compatibility
  return ['BSNL', 'Railwire', 'Krishiinet'].includes(provider);
};

/**
 * Get display name for provider.
 * Multi-tenant ready — uses product data dynamically.
 */
export const getProviderDisplayName = (provider: Provider, products?: Product[]): string => {
  if (products) {
    const product = products.find((p) => p.name === provider);
    if (product) {
      return product.productType === 'cable' ? `${product.name} Cable` : product.name;
    }
  }
  // Fallback for backward compatibility
  if (provider === 'GTPL') return 'GTPL Cable';
  return provider;
};

/**
 * Get short display name for provider.
 * Multi-tenant ready — uses product data dynamically.
 */
export const getProviderShortName = (provider: Provider, products?: Product[]): string => {
  return getProviderDisplayName(provider, products);
};

/**
 * Get connection type label for display (Cable vs Internet separation).
 * Multi-tenant ready — uses product data dynamically.
 */
export const getConnectionTypeLabel = (provider: Provider, products?: Product[]): string => {
  return getProviderDisplayName(provider, products);
};
