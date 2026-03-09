import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './i18n';
import './styles/index.css';
import { useAuthStore } from './store/useAuthStore';
import { useStore } from './store/useStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './components/ThemeProvider';
import { sendErrorToPage } from './utils/errorPage';

// Initialize auth synchronously (reads from localStorage only)
useAuthStore.getState().initialize();

// Global handlers: log uncaught errors but only redirect for fatal ones.
// Benign browser errors (ResizeObserver, Script error, etc.) are logged silently.
const BENIGN_PATTERNS = [
  'ResizeObserver',
  'Script error',
  'Loading chunk',
  'Loading CSS chunk',
  'Failed to fetch dynamically imported module',
  'NetworkError',
  'Load failed',
  'cancelled',
];
function isBenignError(msg: string): boolean {
  return BENIGN_PATTERNS.some((p) => msg.includes(p));
}
window.addEventListener('error', (event) => {
  const msg = event.error?.message ?? event.message ?? '';
  if (isBenignError(msg)) {
    console.warn('[Benign error ignored]', msg);
    return;
  }
  const err = event.error ?? new Error(event.message);
  sendErrorToPage(err, 'Uncaught error');
});
window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason instanceof Error ? event.reason.message : String(event.reason);
  if (isBenignError(msg)) {
    console.warn('[Benign rejection ignored]', msg);
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
          </BrowserRouter>
        </ErrorBoundary>
      </ThemeProvider>
    </React.StrictMode>
  );
  // Run store init after React has mounted (app already has mock data in initial state)
  Promise.resolve()
    .then(() => useStore.getState().initialize())
    .catch((err) => console.error('Store init failed:', err));
}
