/**
 * Enterprise Sentry Error Tracking - Vereinfachte Konfiguration
 * Funktionsfähige Error-Tracking-Lösung ohne komplexe TypeScript-Dependencies
 */

import * as React from 'react';
import * as Sentry from '@sentry/react';

// Vereinfachte Sentry-Konfiguration
const SENTRY_CONFIG = {
  dsn: process.env.SENTRY_DSN || 'https://test-dsn@sentry.io/1234567',
  environment: process.env.NODE_ENV || 'development',
  debug: process.env.NODE_ENV !== 'production',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0.1,
  release: `wirsing-interpreter-ai@1.0.0`,
  initialScope: {
    tags: {
      component: 'wirsing-interpreter-ai',
    }
  },
  beforeSend: (event: any) => {
    if (process.env.NODE_ENV === 'production') {
      // Filtere weniger kritische Fehler in Production
      if (event.exception) {
        const error = event.exception.values?.[0];
        if (error && error.type === 'ChunkLoadError') {
          return null;
        }
      }
    }
    return event;
  }
};

// Sentry initialisieren
Sentry.init(SENTRY_CONFIG);

// Error Tracking System
class ErrorTracker {
  private static instance: ErrorTracker;
  
  private constructor() {
    this.setupGlobalErrorHandlers();
  }
  
  public static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }
  
  private setupGlobalErrorHandlers() {
    // Global Error Handler
    window.addEventListener('error', (event) => {
      Sentry.captureException(event.error, {
        tags: {
          source: 'window.error',
          filename: event.filename || 'unknown',
          lineno: event.lineno || 0,
          colno: event.colno || 0
        }
      });
    });
    
    // Unhandled Promise Rejections
    window.addEventListener('unhandledrejection', (event) => {
      Sentry.captureException(event.reason, {
        tags: {
          source: 'unhandledrejection'
        }
      });
    });
  }
  
  // Error Capture für React Components
  public captureComponentError(error: Error, errorInfo: any, componentName?: string) {
    Sentry.withScope((scope) => {
      scope.setTag('errorBoundary', true);
      if (componentName) {
        scope.setTag('component', componentName);
      }
      scope.setExtra('errorInfo', errorInfo);
      scope.setLevel('error');
      Sentry.captureException(error);
    });
  }
  
  // Custom Error Reporting
  public reportError(error: Error, context?: Record<string, any>) {
    Sentry.withScope((scope) => {
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }
      Sentry.captureException(error);
    });
  }
  
  // Custom Message Reporting
  public reportMessage(message: string, level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info') {
    Sentry.captureMessage(message, level);
  }
  
  // Performance Tracking (vereinfacht)
  public startTransaction(name: string) {
    const transaction = Sentry.startTransaction({ name });
    return {
      finish: () => transaction.finish(),
      setStatus: (status: string) => transaction.setStatus(status),
      setTag: (key: string, value: string) => transaction.setTag(key, value),
    };
  }
  
  // User Context
  public setUserContext(userId: string, additionalData?: Record<string, any>) {
    Sentry.setUser({
      id: userId,
      ...additionalData
    });
  }
  
  // Add Breadcrumb
  public addBreadcrumb(message: string, category: string = 'custom') {
    Sentry.addBreadcrumb({
      message,
      category,
      level: 'info'
    });
  }
}

// Singleton-Export
export const errorTracker = ErrorTracker.getInstance();

// React Error Boundary Component
export class SentryErrorBoundary extends React.Component<
  { 
    children: React.ReactNode; 
    fallback?: React.ComponentType<any>;
    componentName?: string;
  },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error, errorInfo: any) {
    errorTracker.captureComponentError(error, errorInfo, this.props.componentName);
  }
  
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return React.createElement(FallbackComponent, {});
      }
      
      return React.createElement('div', {
        className: 'error-boundary p-4 bg-red-50 border border-red-200 rounded-md'
      }, [
        React.createElement('h2', {
          key: 'title',
          className: 'text-red-800 font-semibold'
        }, 'Ein Fehler ist aufgetreten'),
        React.createElement('p', {
          key: 'description',
          className: 'text-red-600 mt-2'
        }, 'Es gab ein Problem beim Rendern dieser Komponente. Der Fehler wurde automatisch an unser Monitoring-System gesendet.'),
        React.createElement('button', {
          key: 'retry',
          className: 'mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700',
          onClick: () => this.setState({ hasError: false })
        }, 'Erneut versuchen')
      ]);
    }
    
    return this.props.children;
  }
}

// React Hook für Error Boundary
export function useErrorBoundary(componentName?: string) {
  const [error, setError] = React.useState<Error | null>(null);
  const [errorInfo, setErrorInfo] = React.useState<any>(null);
  
  React.useEffect(() => {
    if (error) {
      errorTracker.captureComponentError(error, errorInfo, componentName);
    }
  }, [error, errorInfo, componentName]);
  
  return {
    error,
    errorInfo,
    setError: (error: Error, errorInfo?: any) => {
      setError(error);
      setErrorInfo(errorInfo);
    },
    clearError: () => {
      setError(null);
      setErrorInfo(null);
    }
  };
}

// Performance Monitoring Hook
export function usePerformanceTracking(componentName: string) {
  const transactionRef = React.useRef<any>(null);
  
  React.useEffect(() => {
    transactionRef.current = errorTracker.startTransaction(`component-${componentName}`);
    
    return () => {
      if (transactionRef.current) {
        transactionRef.current.finish();
      }
    };
  }, [componentName]);
  
  const trackAsyncOperation = async <T>(
    operationName: string, 
    operation: () => Promise<T>
  ): Promise<T> => {
    const span = transactionRef.current?.startChild({
      op: 'async.operation',
      description: operationName
    });
    
    try {
      const result = await operation();
      span?.setStatus('ok');
      return result;
    } catch (error) {
      span?.setStatus('internal_error');
      errorTracker.reportError(error as Error, { operation: operationName });
      throw error;
    } finally {
      span?.finish();
    }
  };
  
  return {
    trackAsyncOperation
  };
}

// AI Service Tracking Hook
export function useAIServiceTracking(serviceName: string) {
  const trackServiceCall = async <T>(
    operation: string,
    serviceOperation: () => Promise<T>
  ): Promise<T> => {
    const transaction = errorTracker.startTransaction(`ai-service-${serviceName}`);
    
    try {
      const result = await serviceOperation();
      transaction.setStatus('ok');
      return result;
    } catch (error) {
      transaction.setStatus('internal_error');
      errorTracker.reportError(error as Error, {
        service: serviceName,
        operation: operation
      });
      throw error;
    } finally {
      transaction.finish();
    }
  };
  
  return { trackServiceCall };
}

// Performance Monitoring für Core Web Vitals
if (typeof window !== 'undefined') {
  // Performance Observer für Core Web Vitals
  if ('PerformanceObserver' in window) {
    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      if (lastEntry) {
        errorTracker.addBreadcrumb(
          `LCP: ${Math.round(lastEntry.startTime)}ms (${lastEntry.startTime > 2500 ? 'poor' : 'good'})`,
          'performance'
        );
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] });
    
    // First Input Delay
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        const fid = entry.processingStart - entry.startTime;
        errorTracker.addBreadcrumb(
          `FID: ${Math.round(fid)}ms (${fid > 100 ? 'poor' : 'good'})`,
          'performance'
        );
      });
    }).observe({ entryTypes: ['first-input'] });
    
    // Cumulative Layout Shift
    new PerformanceObserver((list) => {
      let clsScore = 0;
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsScore += entry.value;
        }
      });
      
      if (clsScore > 0) {
        errorTracker.addBreadcrumb(
          `CLS: ${clsScore.toFixed(3)} (${clsScore > 0.1 ? 'poor' : 'good'})`,
          'performance'
        );
      }
    }).observe({ entryTypes: ['layout-shift'] });
  }
}

// Utility Functions
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) => {
  const WrappedComponent = (props: P) => {
    return React.createElement(SentryErrorBoundary, { componentName }, 
      React.createElement(Component, props)
    );
  };
  
  WrappedComponent.displayName = `withErrorBoundary(${componentName || Component.displayName || Component.name})`;
  return WrappedComponent;
};

export default Sentry;
export { Sentry };