/**
 * Centralised environment configuration.
 * All import.meta.env.VITE_* access goes through here.
 */

export const env = {
  /** Base URL for the real backend API. Ignored when USE_MOCK_API is true. */
  API_BASE_URL: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://127.0.0.1:3000/api',

  /** When true (default) the app uses in-memory mock APIs. Set to false to use the real backend. */
  USE_MOCK_API: (import.meta.env.VITE_USE_MOCK_API as string | undefined) !== 'false',

  /** EmailJS config for error reporting */
  EMAILJS_SERVICE_ID: import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined,
  EMAILJS_TEMPLATE_ID: import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined,
  EMAILJS_PUBLIC_KEY: import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined,
  ERROR_REPORT_EMAIL: (import.meta.env.VITE_ERROR_REPORT_EMAIL as string | undefined) ?? 'bankai.tech12@gmail.com',

  /** App metadata */
  APP_NAME: (import.meta.env.VITE_APP_NAME as string | undefined) ?? 'Popna Billing',
  IS_DEV: import.meta.env.DEV as boolean,
  IS_PROD: import.meta.env.PROD as boolean,
} as const;
