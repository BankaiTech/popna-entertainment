import React from 'react';
import { sendErrorToPage } from '@/utils/errorPage';

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  State
> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    sendErrorToPage(error, 'React ErrorBoundary: ' + (errorInfo?.componentStack?.split('\n')[1]?.trim() || ''));
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            fontFamily: 'system-ui, sans-serif',
            background: '#f8fafc',
            color: '#181c32',
          }}
        >
          <div style={{ maxWidth: 480 }}>
            <h1 style={{ fontSize: '1.25rem', marginBottom: 8 }}>
              Something went wrong
            </h1>
            <pre
              style={{
                padding: 16,
                background: '#fff',
                border: '1px solid #e4e6ef',
                borderRadius: 8,
                overflow: 'auto',
                fontSize: 12,
                color: '#f1416c',
              }}
            >
              {this.state.error.message}
            </pre>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                marginTop: 16,
                padding: '10px 20px',
                background: '#009ef7',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
