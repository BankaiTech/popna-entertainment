import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './i18n';
import './styles/index.css';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/useAuthStore';
import { useStore } from './store/useStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './components/ThemeProvider';
import { sendErrorToPage } from './utils/errorPage';

// Initialize auth synchronously (reads from localStorage only)
useAuthStore.getState().initialize();

// Global handlers: log unexpected errors. Never redirect for API/CORS/network failures —
// that cleared the page while auth stayed set and bounced login ↔ dashboard in a loop.
const BENIGN_PATTERNS = [
  'ResizeObserver',
  'Script error',
  'Loading chunk',
  'Loading CSS chunk',
  'Failed to fetch dynamically imported module',
  'NetworkError',
  'Network Error',
  'Load failed',
  'cancelled',
  'CORS',
  'ERR_NETWORK',
  'ERR_FAILED',
  'Failed to fetch',
  'timeout',
  'ECONNABORTED',
];
function isBenignError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return BENIGN_PATTERNS.some((p) => msg.includes(p) || lower.includes(p.toLowerCase()));
}
function isAxiosOrApiRejection(reason: unknown): boolean {
  if (!reason || typeof reason !== 'object') return false;
  const r = reason as { isAxiosError?: boolean; config?: unknown; response?: unknown; code?: string };
  return Boolean(r.isAxiosError || r.config || r.code === 'ERR_NETWORK' || r.code === 'ECONNABORTED');
}
window.addEventListener('error', (event) => {
  const msg = event.error?.message ?? event.message ?? '';
  if (isBenignError(msg)) {
    console.warn('[Benign error ignored]', msg);
    return;
  }
  const err = event.error ?? new Error(event.message);
  // Report only — do not redirect (avoids auth bounce loops)
  sendErrorToPage(err, 'Uncaught error');
});
window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason instanceof Error ? event.reason.message : String(event.reason);
  if (isBenignError(msg) || isAxiosOrApiRejection(event.reason)) {
    console.warn('[API/network rejection ignored]', msg);
    event.preventDefault();
    return;
  }
  const err = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
  sendErrorToPage(err, 'Unhandled promise rejection');
});

// Defer app store init so first paint is not blocked; run after mount
const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ThemeProvider>
        <ErrorBoundary>
          <BrowserRouter>
            <App />
            <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
          </BrowserRouter>
        </ErrorBoundary>
      </ThemeProvider>
    </React.StrictMode>
  );
  // Defer store hydrate until authenticated — avoids firing contacts/org APIs on the login page
  Promise.resolve()
    .then(() => {
      if (useAuthStore.getState().isAuthenticated) {
        return useStore.getState().initialize();
      }
    })
    .catch((err) => console.error('Store init failed:', err));
}
