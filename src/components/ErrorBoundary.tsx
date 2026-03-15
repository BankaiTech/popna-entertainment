import React from 'react';
import { reportError } from '@/lib/errorReporter';

interface State {
  hasError: boolean;
}

/**
 * ErrorBoundary — catches any React render error, reports it via email,
 * and redirects the user to /login. No error UI is shown to end users.
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
      // Show custom fallback if provided, otherwise render nothing while
      // reportError() is redirecting to /login in the background.
      if (this.props.fallback) return this.props.fallback;
      return null;
    }
    return this.props.children;
  }
}
