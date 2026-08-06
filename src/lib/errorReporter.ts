/**
 * Global error reporter — optionally emails via EmailJS.
 * Does NOT redirect to login by default (that caused auth loops when API/CORS failed).
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

export type ReportErrorOptions = {
  /** Only for true fatal UI crashes — never for API/network failures */
  redirectToLogin?: boolean;
};

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
    console.warn('[errorReporter] EmailJS env vars not set. Error not emailed:', payload.error_message);
    return;
  }
  try {
    const emailjs = await import('@emailjs/browser');
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, payload, { publicKey: PUBLIC_KEY });
  } catch {
    // Never let the reporter itself throw
  }
}

/**
 * Report an error (email + console). Redirect only when options.redirectToLogin is true.
 */
export async function reportError(
  error: unknown,
  context?: string,
  options?: ReportErrorOptions
): Promise<void> {
  const now = Date.now();
  const shouldEmail = now - _lastReportTime >= DEBOUNCE_MS;
  if (shouldEmail) {
    _lastReportTime = now;
    const payload = buildEmailPayload(error, context);
    sendEmail(payload).catch(() => undefined);
  } else {
    console.warn('[errorReporter] Debounced:', context, error);
  }

  if (options?.redirectToLogin) {
    redirectToLogin();
  }
}

/** Fatal render crash — report and leave the broken page. */
export async function reportFatalError(error: unknown, context?: string): Promise<void> {
  return reportError(error, context, { redirectToLogin: true });
}

function redirectToLogin(): void {
  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
}
