/**
 * On error: redirect to home. Persist error in sessionStorage.
 * When user visits the same URL with ?error_show, the app shows the error details.
 */
export const ERROR_STORAGE_KEY = '__Popna_error__';

export function sendErrorToPage(error: Error, context?: string): void {
  try {
    const data = {
      message: error?.message ?? String(error),
      stack: error?.stack ?? '',
      time: new Date().toISOString(),
      context: context ?? '',
    };
    sessionStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(data));
    window.location.href = '/?error_show';
  } catch {
    window.location.href = '/?error_show&message=' + encodeURIComponent(String(error));
  }
}
