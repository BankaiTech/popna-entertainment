/**
 * Platform (our) UPI configuration.
 * Used for: subscription renewal (org pays us) and additional product purchases (org pays us).
 * Set via env: VITE_PLATFORM_UPI_ID, VITE_PLATFORM_UPI_NAME
 */
const getEnv = (key: string): string => {
  try {
    const v = (import.meta as unknown as { env?: Record<string, string> }).env?.[key];
    return (v ?? '').trim();
  } catch {
    return '';
  }
};

export const PLATFORM_UPI = {
  upiId: getEnv('VITE_PLATFORM_UPI_ID') || '',
  businessName: getEnv('VITE_PLATFORM_UPI_NAME') || 'Platform',
};

export const hasPlatformUpi = (): boolean => !!PLATFORM_UPI.upiId;
