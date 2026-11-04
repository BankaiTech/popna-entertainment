import React from 'react';
import { reportError } from '@/lib/errorReporter';

interface State {
  hasError: boolean;
}

/**
 * ErrorBoundary — catches React render errors, reports them, and shows a small recovery screen.
 * (It used to redirect to /login, which looped forever when the user was still logged in.)
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    reportError(error, errorInfo.componentStack ?? 'React componentDidCatch');
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-sm text-center space-y-4">
            <p className="text-lg font-semibold">Something went wrong on this screen.</p>
            <p className="text-sm text-gray-500">The error was reported. Try reloading the page.</p>
            <div className="flex gap-2 justify-center">
              <button type="button" className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm"
                onClick={() => window.location.reload()}>Reload</button>
              <button type="button" className="px-4 py-2 rounded-lg border text-sm"
                onClick={() => window.location.assign('/')}>Home</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
