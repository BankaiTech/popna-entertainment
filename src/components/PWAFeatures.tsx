// PWA: Install prompt, Offline banner, automatic update to a new version.
//
// A new version updates itself, but only at a safe moment, so nobody loses work:
//   - when the app is opened again / comes back from the background, or the user moves to another page
//   - never while a dialog is open (Collect payment, Add customer...), a save is running,
//     or the person has typed something on this page that may not be saved yet.
// If no safe moment comes for 2 minutes, the old "New version - Reload" banner appears instead.
import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useLocation } from 'react-router-dom';
import Button from '@/components/ui/Button';
import { Download, WifiOff, RefreshCw, X } from 'lucide-react';
import { pendingWrites } from '@/lib/apiClient';
import { showInfo } from '@/utils/toast';

const UPDATED_KEY = 'lcd-just-updated';
const BANNER_AFTER_MS = 2 * 60 * 1000;

// BeforeInstallPromptEvent is not in all TypeScript libs
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAFeatures() {
  const { t } = useTranslation();
  // Not on the login page: on a phone the banner sits over the Login button. It shows after login.
  const path = useLocation().pathname;
  const onLogin = path === '/login' || path === '/customer/login';
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  // Initialize from viewport so mobile sees banner on first paint (before effect runs). 768px = phones/small tablets.
  const [isMobileView, setIsMobileView] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  );
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [installDismissed, setInstallDismissed] = useState(false);
  const swCleanupRef = useRef<(() => void) | null>(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
    // Check for new version when user returns to the app tab, and periodically (e.g. every 1h)
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      const checkForUpdates = () => {
        if (registration.installing || !navigator.onLine) return;
        registration.update();
      };
      const onVisible = () => {
        if (document.visibilityState === 'visible') checkForUpdates();
      };
      document.addEventListener('visibilitychange', onVisible);
      const intervalMs = 60 * 60 * 1000; // 1 hour
      const interval = setInterval(checkForUpdates, intervalMs);
      swCleanupRef.current = () => {
        document.removeEventListener('visibilitychange', onVisible);
        clearInterval(interval);
      };
    },
  });

  // Clean up SW update checks when component unmounts
  useEffect(() => () => {
    swCleanupRef.current?.();
    swCleanupRef.current = null;
  }, []);

  // Detect if running as installed PWA (standalone) - don't show install when already app
  useEffect(() => {
    const standalone =
      (window.matchMedia('(display-mode: standalone)').matches) ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) setIsInstalled(true);
  }, []);

  // Keep mobile viewport in sync on resize
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)');
    const handler = () => setIsMobileView(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // When on mobile and not installed, show install card (so it appears even before beforeinstallprompt or on iOS)
  useEffect(() => {
    if (isMobileView && !isInstalled && !installDismissed) setShowInstallBanner(true);
  }, [isMobileView, isInstalled, installDismissed]);

  // Install prompt (beforeinstallprompt) - Android Chrome; iOS Safari never fires this
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Online / offline
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') setShowInstallBanner(false);
      setInstallPrompt(null);
    }
  }, [installPrompt]);

  const handleDismissInstall = useCallback(() => {
    setShowInstallBanner(false);
    setInstallDismissed(true);
  }, []);

  const handleReload = useCallback(() => {
    try { sessionStorage.setItem(UPDATED_KEY, '1'); } catch { /* private mode */ }
    setNeedRefresh(false);
    updateServiceWorker(true);
  }, [updateServiceWorker, setNeedRefresh]);

  // Typed something on this page since it opened? Then it may not be saved: wait for another page.
  const typedRef = useRef(false);
  useEffect(() => {
    const onInput = () => { typedRef.current = true; };
    document.addEventListener('input', onInput, true);
    return () => document.removeEventListener('input', onInput, true);
  }, []);
  useEffect(() => { typedRef.current = false; }, [path]);

  const safeToReload = useCallback(() => (
    !document.querySelector('[role="dialog"], [role="alertdialog"]')
    && pendingWrites() === 0
    && !typedRef.current
  ), []);

  // New version ready: switch to it at the first safe moment.
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const tryUpdate = useCallback(() => {
    if (needRefresh && safeToReload()) handleReload();
  }, [needRefresh, safeToReload, handleReload]);
  useEffect(() => {
    if (!needRefresh) return undefined;
    tryUpdate(); // e.g. still on the page that just opened, nothing typed
    const onVisibility = () => tryUpdate(); // opened again, or put in the background
    document.addEventListener('visibilitychange', onVisibility);
    const banner = window.setTimeout(() => setShowUpdateBanner(true), BANNER_AFTER_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearTimeout(banner);
    };
  }, [needRefresh, tryUpdate]);
  useEffect(() => { tryUpdate(); }, [path, tryUpdate]); // moved to another page

  // After the switch: tell the person once.
  useEffect(() => {
    let updated = false;
    try {
      updated = sessionStorage.getItem(UPDATED_KEY) === '1';
      sessionStorage.removeItem(UPDATED_KEY);
    } catch { /* private mode */ }
    if (updated) showInfo(t('pwa.updated', 'Updated to the latest version.'));
  }, [t]);

  return (
    <>
      {/* Offline banner - fixed at top */}
      {!isOnline && (
        <div
          className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 bg-amber-500 text-white py-2 px-4 text-sm font-medium safe-area-inset-top"
          role="status"
          aria-live="polite"
        >
          <WifiOff className="w-4 h-4 shrink-0" />
          {t('pwa.offline', 'You are offline. Some features may be limited.')}
        </div>
      )}

      {/* Install app banner - mobile only, hidden when update banner is showing */}
      {showInstallBanner && !isInstalled && isMobileView && !(needRefresh && showUpdateBanner) && !onLogin && (
        <div className="fixed bottom-20 left-4 right-4 z-[45] flex flex-col gap-3 bg-card border border-border shadow-lg rounded-lg p-3 safe-area-inset-bottom max-w-[calc(100vw-2rem)]">
          <div className="flex items-start gap-2">
            <p className="text-sm text-foreground flex-1">
              {t('pwa.installMessage', 'Install LCO Desk for a better experience')}
            </p>
            <button
              type="button"
              onClick={handleDismissInstall}
              className="p-2 -mt-1 -mr-1 rounded-md hover:bg-muted text-muted-foreground touch-manipulation"
              aria-label={t('common.close', 'Close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {installPrompt ? (
            <Button size="sm" onClick={handleInstall} className="w-full min-h-[44px]">
              <Download className="w-4 h-4 mr-2" />
              {t('pwa.install', 'Install')}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t('pwa.addToHomeScreen', 'Tap the browser menu (⋮ or Share) and choose "Add to Home Screen"')}
            </p>
          )}
        </div>
      )}

      {/* Fallback: no safe moment for 2 minutes (e.g. a long form). Positioned above mobile bottom nav */}
      {needRefresh && showUpdateBanner && (
        <div className="fixed bottom-20 sm:bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[45] flex items-center gap-3 bg-primary text-primary-foreground shadow-xl rounded-lg p-3 safe-area-inset-bottom animate-slide-up">
          <p className="text-sm flex-1">
            {t('pwa.updateAvailable', 'New version available. Reload to update.')}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button size="sm" variant="secondary" onClick={handleReload} className="min-h-[44px] sm:min-h-0 bg-white text-primary hover:bg-gray-100">
              <RefreshCw className="w-4 h-4 mr-1" />
              {t('pwa.reload', 'Reload')}
            </Button>
            <button
              type="button"
              onClick={() => setNeedRefresh(false)}
              className="p-2 rounded-md hover:bg-white/20"
              aria-label={t('common.close', 'Close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
