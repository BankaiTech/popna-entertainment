import React from 'react';
import { reportFatalError } from '@/lib/errorReporter';

interface State {
  hasError: boolean;
}

/**
 * ErrorBoundary — catches React render errors and reports them.
 * Redirects only for true render crashes, not API/network failures.
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
    reportFatalError(error, errorInfo.componentStack ?? 'React componentDidCatch');
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return null;
    }
    return this.props.children;
  }
}
