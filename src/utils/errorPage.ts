/**
 * Legacy compat shim — all error reporting now goes through reportError().
 * Kept so existing call-sites don't break.
 */
export { reportError as sendErrorToPage } from '@/lib/errorReporter';

/** @deprecated key no longer used */
export const ERROR_STORAGE_KEY = '__Popna_error__';
