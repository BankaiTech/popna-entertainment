import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './i18n';
import './styles/index.css';
import { useAuthStore } from './store/useAuthStore';
import { useStore } from './store/useStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { sendErrorToPage } from './utils/errorPage';

// Initialize auth synchronously (reads from localStorage only)
useAuthStore.getState().initialize();

// Global handlers: send uncaught errors to error.html
window.addEventListener('error', (event) => {
  const err = event.error ?? new Error(event.message);
  sendErrorToPage(err, 'Uncaught error');
});
window.addEventListener('unhandledrejection', (event) => {
  const err = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
  sendErrorToPage(err, 'Unhandled promise rejection');
});

// Defer app store init so first paint is not blocked; run after mount
const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
  // Run store init after React has mounted (app already has mock data in initial state)
  Promise.resolve()
    .then(() => useStore.getState().initialize())
    .catch((err) => console.error('Store init failed:', err));
}
