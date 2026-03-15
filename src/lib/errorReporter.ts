/**
 * Global error reporter — sends error details to the admin email via EmailJS
 * and redirects the user to /login. Never shows an error page to end users.
 *
 * Setup: set the following environment variables in .env
 *   VITE_EMAILJS_SERVICE_ID
 *   VITE_EMAILJS_TEMPLATE_ID
 *   VITE_EMAILJS_PUBLIC_KEY
 *   VITE_ERROR_REPORT_EMAIL  (recipient, defaults to bankai.tech12@gmail.com)
 */

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined;
const REPORT_EMAIL = (import.meta.env.VITE_ERROR_REPORT_EMAIL as string | undefined) ?? 'bankai.tech12@gmail.com';

/** Debounce — prevent flooding inbox if many errors fire in quick succession */
let _lastReportTime = 0;
const DEBOUNCE_MS = 10_000;

function buildEmailPayload(error: unknown, context?: string) {
  const err = error instanceof Error ? error : new Error(String(error));
  return {
    to_email: REPORT_EMAIL,
    app_name: 'Popna Billing',
    error_message: err.message,
    error_stack: err.stack ?? 'No stack trace',
    error_context: context ?? 'Unknown context',
    page_url: window.location.href,
    user_agent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  };
}

async function sendEmail(payload: Record<string, string>): Promise<void> {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    // EmailJS not configured — log to console in dev, skip silently in prod
    console.warn('[errorReporter] EmailJS env vars not set. Error not emailed:', payload.error_message);
    return;
  }
  try {
    // Dynamic import so EmailJS is not in the initial bundle
    const emailjs = await import('@emailjs/browser');
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, payload, { publicKey: PUBLIC_KEY });
  } catch {
    // Never let the reporter itself throw — silently swallow
  }
}

/**
 * Report an error: send email notification then redirect to /login.
 * Safe to call from anywhere (ErrorBoundary, global handlers, API interceptors).
 */
export async function reportError(error: unknown, context?: string): Promise<void> {
  const now = Date.now();
  if (now - _lastReportTime < DEBOUNCE_MS) {
    // Already reported recently — still redirect but skip email
    redirectToLogin();
    return;
  }
  _lastReportTime = now;

  const payload = buildEmailPayload(error, context);

  // Fire email without awaiting so redirect happens immediately
  sendEmail(payload).catch(() => undefined);

  redirectToLogin();
}

function redirectToLogin(): void {
  // Use replace so the broken page is removed from history
  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
}
