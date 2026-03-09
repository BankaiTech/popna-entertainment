import { useSearchParams, Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ERROR_STORAGE_KEY } from '@/utils/errorPage';

interface StoredError {
  message: string;
  stack: string;
  time: string;
  context: string;
}

/**
 * When user visits /?error_show (or any URL with error_show), show the last stored error.
 * After an error we redirect to home with ?error_show so they land here and see what happened.
 */
export default function ErrorShowPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const hasParam = searchParams.has('error_show');
  const messageFromUrl = searchParams.get('message');

  let data: StoredError | null = null;
  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(ERROR_STORAGE_KEY);
      if (raw) data = JSON.parse(raw) as StoredError;
    } catch {
      // ignore
    }
  }

  const message = data?.message ?? messageFromUrl ?? t('errorPage.fallbackMessage', 'An error occurred.');
  const stack = data?.stack ?? '';
  const time = data?.time ?? '';
  const context = data?.context ?? '';

  if (!hasParam) {
    return null;
  }

  if (!data && !messageFromUrl) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="fixed inset-0 z-[100] min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-red-600 text-white px-5 py-4 font-semibold text-lg">
          {t('errorPage.title', 'Something went wrong')}
        </div>
        <div className="p-5 space-y-4">
          {time && (
            <p className="text-sm text-slate-500">{new Date(time).toLocaleString()}</p>
          )}
          {context && (
            <p className="text-sm text-slate-600"><span className="font-medium">{t('errorPage.context', 'Context:')}</span> {context}</p>
          )}
          <p className="text-slate-800 whitespace-pre-wrap break-words font-medium">{message}</p>
          {stack && (
            <pre className="text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-4 overflow-auto max-h-60 text-slate-600 whitespace-pre-wrap break-words">
              {stack}
            </pre>
          )}
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-white font-medium hover:opacity-90 transition-opacity"
            >
              {t('errorPage.backToHome', 'Back to home')}
            </Link>
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.removeItem(ERROR_STORAGE_KEY);
                } catch {
                  // ignore
                }
                window.location.href = '/';
              }}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              {t('errorPage.dismissAndGoHome', 'Dismiss and go home')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
