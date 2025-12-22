import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary Komponente für graceful Error-Handling in React-Anwendungen
 * 
 * Diese Komponente fängt JavaScript-Fehler in der gesamten Komponenten-Hierarchie ab
 * und zeigt eine Fallback-UI anstelle des abgestürzten Teils der App.
 */
class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Logge Fehler für Debugging
    console.error('🔴 Error Boundary hat Fehler abgefangen:', error, errorInfo);
    
    // Speichere Error-Informationen im State
    this.setState({
      errorInfo
    });

    // Rufe optionalen Error-Handler auf
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Sende Fehler an Monitoring-Service (falls konfiguriert)
    this.reportErrorToService(error, errorInfo);
  }

  override componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  /**
   * Sendet Fehler an externen Monitoring-Service
   */
  private reportErrorToService = (error: Error, errorInfo: React.ErrorInfo) => {
    try {
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: this.getCurrentUserId() // Falls verfügbar
      };

      // Hier könnte ein externer Service wie Sentry, LogRocket etc. aufgerufen werden
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureException(error, {
          extra: errorReport
        });
      }

      // Lokale Speicherung für Debugging
      const recentErrors = JSON.parse(localStorage.getItem('recentErrors') || '[]');
      recentErrors.unshift(errorReport);
      recentErrors.splice(10); // Behalte nur die letzten 10 Fehler
      localStorage.setItem('recentErrors', JSON.stringify(recentErrors));
    } catch (reportingError) {
      console.error('Fehler beim Melden des Fehlers:', reportingError);
    }
  };

  /**
   * Holt aktuelle Benutzer-ID (falls verfügbar)
   */
  private getCurrentUserId = (): string | null => {
    try {
      return localStorage.getItem('userId') || null;
    } catch {
      return null;
    }
  };

  /**
   * Versucht die Anwendung nach einem Fehler neu zu laden
   */
  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  /**
   * Lädt die gesamte Seite neu
   */
  private handleReload = () => {
    window.location.reload();
  };

  /**
   * Standard Fallback-UI wenn kein custom fallback bereitgestellt wird
   */
  private renderDefaultFallback = () => {
    const { error, errorInfo } = this.state;
    const isDevelopment = process.env.NODE_ENV === 'development';

    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-slate-800 border border-red-500/20 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
              <svg 
                className="w-5 h-5 text-red-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-white">
              Etwas ist schiefgelaufen
            </h1>
          </div>

          <p className="text-slate-300 mb-6">
            Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut oder laden Sie die Seite neu.
          </p>

          <div className="flex gap-3 mb-6">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-medium"
            >
              Erneut versuchen
            </button>
            <button
              onClick={this.handleReload}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
            >
              Seite neu laden
            </button>
          </div>

          {isDevelopment && error && (
            <details className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <summary className="text-slate-400 cursor-pointer mb-3 font-medium">
                Technische Details (Entwicklungsmodus)
              </summary>
              <div className="space-y-3 text-sm">
                <div>
                  <h4 className="text-red-400 font-medium mb-1">Fehlermeldung:</h4>
                  <pre className="text-slate-300 whitespace-pre-wrap bg-slate-800 p-3 rounded border">
                    {error.message}
                  </pre>
                </div>
                {error.stack && (
                  <div>
                    <h4 className="text-red-400 font-medium mb-1">Stack Trace:</h4>
                    <pre className="text-slate-300 whitespace-pre-wrap bg-slate-800 p-3 rounded border text-xs overflow-auto max-h-48">
                      {error.stack}
                    </pre>
                  </div>
                )}
                {errorInfo && errorInfo.componentStack && (
                  <div>
                    <h4 className="text-red-400 font-medium mb-1">Component Stack:</h4>
                    <pre className="text-slate-300 whitespace-pre-wrap bg-slate-800 p-3 rounded border text-xs overflow-auto max-h-48">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}

          <div className="mt-6 pt-4 border-t border-slate-700">
            <p className="text-xs text-slate-500">
              Wenn das Problem bestehen bleibt, wenden Sie sich bitte an den Support.
            </p>
          </div>
        </div>
      </div>
    );
  };

  override render() {
    if (this.state.hasError) {
      return this.props.fallback || this.renderDefaultFallback();
    }

    return this.props.children;
  }
}

export default ErrorBoundary;