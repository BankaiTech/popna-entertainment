// PWA: Install prompt, Offline banner, Update prompt (new version available)
import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useRegisterSW } from 'virtual:pwa-register/react';
import Button from '@/components/ui/Button';
import { Download, WifiOff, RefreshCw, X } from 'lucide-react';

// BeforeInstallPromptEvent is not in all TypeScript libs
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAFeatures() {
  const { t } = useTranslation();
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
    setNeedRefresh(false);
    updateServiceWorker(true);
  }, [updateServiceWorker, setNeedRefresh]);

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
      {showInstallBanner && !isInstalled && isMobileView && !needRefresh && (
        <div className="fixed bottom-20 left-4 right-4 z-[99] flex flex-col gap-3 bg-card border border-border shadow-lg rounded-lg p-3 safe-area-inset-bottom max-w-[calc(100vw-2rem)]">
          <div className="flex items-start gap-2">
            <p className="text-sm text-foreground flex-1">
              {t('pwa.installMessage', 'Install Popna for a better experience')}
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

      {/* Update available - new version - positioned above mobile bottom nav */}
      {needRefresh && (
        <div className="fixed bottom-20 sm:bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[101] flex items-center gap-3 bg-primary text-primary-foreground shadow-xl rounded-lg p-3 safe-area-inset-bottom animate-slide-up">
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
