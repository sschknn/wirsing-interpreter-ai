/**
 * Performance Monitoring Utilities für die Wirsing-Interpreter-Anwendung
 * 
 * Diese Utilities bieten umfassendes Performance-Tracking für:
 * - Page Load Zeiten
 * - User Interactions
 * - Web Vitals
 * - Memory Usage
 * - Custom Performance Marks
 */

// ============================================================================
// INTERFACES UND TYPES
// ============================================================================

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any> | undefined;
}

export interface UserActionMetric {
  action: string;
  duration: number;
  timestamp: number;
  element?: string | undefined;
  page?: string;
}

export interface WebVitalMetric {
  name: 'FCP' | 'LCP' | 'FID' | 'CLS' | 'TTFB';
  value: number;
  timestamp: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

// ============================================================================
// PERFORMANCE MONITORING CLASS
// ============================================================================

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private userActions: UserActionMetric[] = [];
  private webVitals: WebVitalMetric[] = [];
  private isInitialized = false;

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // ============================================================================
  // INITIALIZATION UND WEB VITALS
  // ============================================================================

  /**
   * Initialisiert das Performance-Monitoring
   */
  initialize(): void {
    if (this.isInitialized) return;

    this.isInitialized = true;
    this.trackPageLoad();
    this.setupWebVitalsTracking();
    this.setupMemoryTracking();
    this.setupNavigationTiming();

    console.log('🚀 Performance-Monitoring initialisiert');
  }

  /**
   * Verfolgt Page Load Performance
   */
  private trackPageLoad(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          const navStart = (navigation as any).navigationStart || navigation.fetchStart;
          const metrics = {
            domContentLoaded: navigation.domContentLoadedEventEnd - navStart,
            loadComplete: navigation.loadEventEnd - navStart,
            domInteractive: navigation.domInteractive - navStart,
            firstByte: navigation.responseStart - navStart
          };

          Object.entries(metrics).forEach(([name, value]) => {
            this.logMetric(`page_load_${name}`, value);
          });

          // Total Page Load Time
          this.logMetric('page_load_total', navigation.loadEventEnd - navStart);
        }
      }, 0);
    });
  }

  /**
   * Setup Web Vitals Tracking
   */
  private setupWebVitalsTracking(): void {
    if (typeof window === 'undefined') return;

    // First Contentful Paint
    this.observeFirstContentfulPaint();
    
    // Largest Contentful Paint
    this.observeLargestContentfulPaint();
    
    // First Input Delay
    this.observeFirstInputDelay();
    
    // Cumulative Layout Shift
    this.observeCumulativeLayoutShift();
    
    // Time to First Byte (falls nicht bereits getrackt)
    this.observeTimeToFirstByte();
  }

  private observeFirstContentfulPaint(): void {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.logWebVital('FCP', entry.startTime);
        }
      }
    });
    observer.observe({ entryTypes: ['paint'] });
  }

  private observeLargestContentfulPaint(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        this.logWebVital('LCP', lastEntry.startTime);
      }
    });
    observer.observe({ entryTypes: ['largest-contentful-paint'] });
  }

  private observeFirstInputDelay(): void {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const processingStart = (entry as any).processingStart || entry.startTime;
        this.logWebVital('FID', processingStart - entry.startTime);
      }
    });
    observer.observe({ entryTypes: ['first-input'] });
  }

  private observeCumulativeLayoutShift(): void {
    let cumulativeScore = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          cumulativeScore += (entry as any).value;
        }
      }
      this.logWebVital('CLS', cumulativeScore);
    });
    observer.observe({ entryTypes: ['layout-shift'] });
  }

  private observeTimeToFirstByte(): void {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const navigation = entry as PerformanceNavigationTiming;
        const ttfb = navigation.responseStart - navigation.requestStart;
        this.logWebVital('TTFB', ttfb);
      }
    });
    observer.observe({ entryTypes: ['navigation'] });
  }

  // ============================================================================
  // MEMORY UND RESOURCE TRACKING
  // ============================================================================

  private setupMemoryTracking(): void {
    if (typeof window === 'undefined') return;

    // Periodische Memory-Checks (alle 30 Sekunden)
    setInterval(() => {
      this.trackMemoryUsage();
    }, 30000);

    // Memory-Check vor Page Unload
    window.addEventListener('beforeunload', () => {
      this.trackMemoryUsage();
    });
  }

  private trackMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.logMetric('memory_used', memory.usedJSHeapSize);
      this.logMetric('memory_total', memory.totalJSHeapSize);
      this.logMetric('memory_limit', memory.jsHeapSizeLimit);
    }
  }

  private setupNavigationTiming(): void {
    if (typeof window === 'undefined') return;

    // Resource Timing für wichtige Ressourcen
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 1000) { // Nur langsame Ressourcen (> 1s)
          this.logMetric('slow_resource', entry.duration, {
            name: entry.name,
            type: (entry as any).initiatorType || 'unknown',
            size: (entry as any).transferSize
          });
        }
      }
    });
    observer.observe({ entryTypes: ['resource'] });
  }

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  /**
   * Loggt eine Performance-Metrik
   */
  logMetric(name: string, value: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      ...(metadata && { metadata })
    };

    this.metrics.push(metric);

    // Behalte nur die letzten 100 Metriken
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }

    // Console Log für Development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Performance Metric: ${name} = ${value}ms`, metadata || '');
    }
  }

  /**
   * Loggt eine User Action
   */
  logUserAction(action: string, duration: number, element?: string): void {
    const actionMetric: UserActionMetric = {
      action,
      duration,
      timestamp: Date.now(),
      page: window.location.pathname,
      ...(element && { element })
    };

    this.userActions.push(actionMetric);

    // Behalte nur die letzten 50 User Actions
    if (this.userActions.length > 50) {
      this.userActions.shift();
    }

    console.log(`⚡ User Action: ${action} took ${duration}ms`, element ? `(Element: ${element})` : '');
  }

  /**
   * Loggt Web Vital Metriken
   */
  private logWebVital(name: WebVitalMetric['name'], value: number): void {
    const rating = this.getWebVitalRating(name, value);
    
    const webVital: WebVitalMetric = {
      name,
      value: Math.round(value),
      timestamp: Date.now(),
      rating
    };

    this.webVitals.push(webVital);

    // Behalte nur die letzten 10 Web Vitals
    if (this.webVitals.length > 10) {
      this.webVitals.shift();
    }

    console.log(`🌐 Web Vital: ${name} = ${webVital.value}ms (${rating})`);
  }

  /**
   * Bewertet Web Vitals nach Google's Standards
   */
  private getWebVitalRating(name: WebVitalMetric['name'], value: number): WebVitalMetric['rating'] {
    switch (name) {
      case 'FCP':
        if (value <= 1800) return 'good';
        if (value <= 3000) return 'needs-improvement';
        return 'poor';
      
      case 'LCP':
        if (value <= 2500) return 'good';
        if (value <= 4000) return 'needs-improvement';
        return 'poor';
      
      case 'FID':
        if (value <= 100) return 'good';
        if (value <= 300) return 'needs-improvement';
        return 'poor';
      
      case 'CLS':
        if (value <= 0.1) return 'good';
        if (value <= 0.25) return 'needs-improvement';
        return 'poor';
      
      case 'TTFB':
        if (value <= 800) return 'good';
        if (value <= 1800) return 'needs-improvement';
        return 'poor';
      
      default:
        return 'needs-improvement';
    }
  }

  /**
   * Erstellt einen Performance-Mark
   */
  createMark(name: string): void {
    performance.mark(name);
  }

  /**
   * Misst Zeit zwischen zwei Marks
   */
  measureMark(startMark: string, endMark: string, measureName: string): number {
    performance.measure(measureName, startMark, endMark);
    
    const measure = performance.getEntriesByName(measureName, 'measure')[0];
    const duration = measure ? measure.duration : 0;
    
    this.logMetric(`mark_${measureName}`, duration);
    
    return duration;
  }

  // ============================================================================
  // REPORTING UND EXPORT
  // ============================================================================

  /**
   * Generiert Performance-Report
   */
  generateReport(): Record<string, any> {
    return {
      timestamp: new Date().toISOString(),
      page: window.location.href,
      userAgent: navigator.userAgent,
      metrics: this.metrics,
      userActions: this.userActions,
      webVitals: this.webVitals,
      summary: this.generateSummary()
    };
  }

  /**
   * Generiert Performance-Zusammenfassung
   */
  private generateSummary(): Record<string, any> {
    const avgUserActionTime = this.userActions.length > 0 
      ? this.userActions.reduce((sum, action) => sum + action.duration, 0) / this.userActions.length
      : 0;

    const slowActions = this.userActions.filter(action => action.duration > 1000);
    
    const webVitalSummary = this.webVitals.reduce((summary, vital) => {
      summary[vital.name] = {
        average: vital.value,
        rating: vital.rating
      };
      return summary;
    }, {} as Record<string, any>);

    return {
      totalMetrics: this.metrics.length,
      totalUserActions: this.userActions.length,
      totalWebVitals: this.webVitals.length,
      averageUserActionTime: Math.round(avgUserActionTime),
      slowUserActionsCount: slowActions.length,
      webVitals: webVitalSummary,
      memoryUsage: 'memory' in performance ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
        limit: (performance as any).memory.jsHeapSizeLimit
      } : null
    };
  }

  /**
   * Exportiert Performance-Daten als JSON
   */
  exportData(): string {
    return JSON.stringify(this.generateReport(), null, 2);
  }

  /**
   * Sendet Performance-Daten an externen Service (z.B. Analytics)
   */
  sendToAnalytics(endpoint?: string): void {
    const report = this.generateReport();
    
    if (endpoint) {
      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report)
      }).catch(error => {
        console.error('Fehler beim Senden der Performance-Daten:', error);
      });
    }

    // Speichere auch lokal für Debugging
    try {
      localStorage.setItem('performanceReport', JSON.stringify(report));
    } catch (error) {
      console.warn('Konnte Performance-Report nicht lokal speichern:', error);
    }
  }

  /**
   * Löscht alle gespeicherten Performance-Daten
   */
  clearData(): void {
    this.metrics = [];
    this.userActions = [];
    this.webVitals = [];
    console.log('🧹 Performance-Daten gelöscht');
  }
}

// ============================================================================
// EXPORT UND HOOKS
// ============================================================================

// Singleton-Instanz exportieren
export const performanceMonitor = PerformanceMonitor.getInstance();

// Convenience Hooks für React-Komponenten
export const usePerformanceTracking = () => {
  const trackAction = (actionName: string) => {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      performanceMonitor.logUserAction(actionName, duration);
    };
  };

  const trackMetric = (name: string, value: number, metadata?: Record<string, any>) => {
    performanceMonitor.logMetric(name, value, metadata);
  };

  return { trackAction, trackMetric };
};

// Auto-Initialisierung (nur im Browser)
if (typeof window !== 'undefined') {
  performanceMonitor.initialize();
}

export default PerformanceMonitor;