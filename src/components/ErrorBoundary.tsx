import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Global Error Boundary [ARCH-05]
 * Catches uncaught errors in any child component and shows a fallback UI
 * instead of crashing the entire application (white screen).
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50" dir="rtl">
          <div className="text-center space-y-4 p-8 max-w-md">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-neutral-900">حدث خطأ غير متوقع</h2>
            <p className="text-neutral-500 text-sm leading-relaxed">
              {this.state.error?.message || 'عذراً، حدث خطأ أثناء تحميل الصفحة. الرجاء المحاولة مرة أخرى.'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium"
              >
                إعادة تحميل الصفحة
              </button>
              <button
                onClick={() => (this as any).setState({ hasError: false })}
                className="px-6 py-2.5 border border-neutral-300 rounded-lg hover:bg-neutral-100 transition-colors text-sm font-medium"
              >
                المحاولة مرة أخرى
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
