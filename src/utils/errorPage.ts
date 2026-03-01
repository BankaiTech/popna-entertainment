/**
 * Send error details to the standalone error.html page.
 * Persists to sessionStorage and redirects so error.html can display it.
 */
const STORAGE_KEY = '__nexlink_error__';

export function sendErrorToPage(error: Error, context?: string): void {
  try {
    const data = {
      message: error?.message ?? String(error),
      stack: error?.stack ?? '',
      time: new Date().toISOString(),
      context: context ?? '',
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.location.href = '/error.html';
  } catch {
    window.location.href = '/error.html?message=' + encodeURIComponent(String(error));
  }
}
