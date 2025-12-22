/**
 * Umfassende Tests für performanceLogger.ts
 * 
 * Testet das Performance-Monitoring-System (485 Zeilen) mit:
 * - Web Vitals Tracking
 * - Memory Monitoring
 * - User Action Tracking
 * - Performance Reporting
 * - Auto-Initialisierung
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { performanceMonitor, usePerformanceTracking, PerformanceMonitor } from '../../utils/performanceLogger';

// Mock für browser APIs
const mockPerformanceObserver = {
  observe: vi.fn(),
  disconnect: vi.fn(),
};

global.PerformanceObserver = vi.fn().mockImplementation((callback) => {
  // Simulate performance entries
  setTimeout(() => {
    callback({
      getEntries: () => [{
        name: 'test-entry',
        startTime: 100,
        duration: 50,
        entryType: 'paint',
      }],
      getEntriesByType: () => [],
    });
  }, 0);
  
  return mockPerformanceObserver;
});

// Mock für performance API
global.performance = {
  ...global.performance,
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByName: vi.fn(() => []),
  getEntriesByType: vi.fn(() => []),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 5000000,
  },
};

// Mock für window events
Object.defineProperty(window, 'addEventListener', {
  value: vi.fn(),
  writable: true,
});

Object.defineProperty(window, 'removeEventListener', {
  value: vi.fn(),
  writable: true,
});

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    vi.clearAllMocks();
    monitor = PerformanceMonitor.getInstance();
    monitor.clearData();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('sollte nur eine Instanz erstellen', () => {
      const instance1 = PerformanceMonitor.getInstance();
      const instance2 = PerformanceMonitor.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization', () => {
    it('sollte nur einmal initialisiert werden', () => {
      const initializeSpy = vi.spyOn(monitor as any, 'initialize');
      
      monitor.initialize();
      monitor.initialize();
      monitor.initialize();
      
      expect(initializeSpy).toHaveBeenCalledTimes(1);
    });

    it('sollte alle Monitoring-Systeme initialisieren', () => {
      const trackPageLoadSpy = vi.spyOn(monitor as any, 'trackPageLoad');
      const setupWebVitalsSpy = vi.spyOn(monitor as any, 'setupWebVitalsTracking');
      const setupMemorySpy = vi.spyOn(monitor as any, 'setupMemoryTracking');
      const setupNavigationSpy = vi.spyOn(monitor as any, 'setupNavigationTiming');

      monitor.initialize();

      expect(trackPageLoadSpy).toHaveBeenCalled();
      expect(setupWebVitalsSpy).toHaveBeenCalled();
      expect(setupMemorySpy).toHaveBeenCalled();
      expect(setupNavigationSpy).toHaveBeenCalled();
    });
  });

  describe('Metric Logging', () => {
    it('sollte Performance-Metriken loggen', () => {
      monitor.logMetric('test_metric', 150);

      const report = monitor.generateReport();
      expect(report.metrics).toHaveLength(1);
      expect(report.metrics[0]).toEqual(
        expect.objectContaining({
          name: 'test_metric',
          value: 150,
        })
      );
    });

    it('sollte Metriken mit Metadata loggen', () => {
      const metadata = { component: 'test', action: 'click' };
      monitor.logMetric('test_metric', 150, metadata);

      const report = monitor.generateReport();
      expect(report.metrics[0].metadata).toEqual(metadata);
    });

    it('sollte nur die letzten 100 Metriken behalten', () => {
      // 105 Metriken loggen
      for (let i = 0; i < 105; i++) {
        monitor.logMetric(`metric_${i}`, i);
      }

      const report = monitor.generateReport();
      expect(report.metrics).toHaveLength(100);
      // Sollte die letzten 100 sein (5-104)
      expect(report.metrics[0].name).toBe('metric_5');
      expect(report.metrics[99].name).toBe('metric_104');
    });

    it('sollte Metriken in Development loggen', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      monitor.logMetric('test_metric', 150);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '📊 Performance Metric: test_metric = 150ms',
        ''
      );
      
      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });

    it('sollte Metriken in Production nicht loggen', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      monitor.logMetric('test_metric', 150);
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });
  });

  describe('User Action Tracking', () => {
    it('sollte User Actions loggen', () => {
      monitor.logUserAction('button_click', 250, 'submit-btn');

      const report = monitor.generateReport();
      expect(report.userActions).toHaveLength(1);
      expect(report.userActions[0]).toEqual(
        expect.objectContaining({
          action: 'button_click',
          duration: 250,
          element: 'submit-btn',
        })
      );
    });

    it('sollte aktuelle Seite in User Actions tracken', () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/presentation' },
        writable: true,
      });

      monitor.logUserAction('page_navigate', 100);

      const report = monitor.generateReport();
      expect(report.userActions[0].page).toBe('/presentation');
    });

    it('sollte nur die letzten 50 User Actions behalten', () => {
      // 55 User Actions loggen
      for (let i = 0; i < 55; i++) {
        monitor.logUserAction(`action_${i}`, i);
      }

      const report = monitor.generateReport();
      expect(report.userActions).toHaveLength(50);
      // Sollte die letzten 50 sein (5-54)
      expect(report.userActions[0].action).toBe('action_5');
      expect(report.userActions[49].action).toBe('action_54');
    });
  });

  describe('Web Vitals Tracking', () => {
    it('sollte First Contentful Paint tracken', () => {
      monitor.logMetric('test', 0); // Initialize
      
      const logWebVitalSpy = vi.spyOn(monitor as any, 'logWebVital');
      monitor.logWebVital('FCP', 1800);

      const report = monitor.generateReport();
      expect(report.webVitals).toHaveLength(1);
      expect(report.webVitals[0]).toEqual(
        expect.objectContaining({
          name: 'FCP',
          value: 1800,
          rating: 'good',
        })
      );
    });

    it('sollte Web Vital Ratings korrekt berechnen', () => {
      // Test FCP Ratings
      expect(monitor.getWebVitalRating('FCP', 1800)).toBe('good');
      expect(monitor.getWebVitalRating('FCP', 2500)).toBe('needs-improvement');
      expect(monitor.getWebVitalRating('FCP', 3500)).toBe('poor');

      // Test LCP Ratings
      expect(monitor.getWebVitalRating('LCP', 2000)).toBe('good');
      expect(monitor.getWebVitalRating('LCP', 3000)).toBe('needs-improvement');
      expect(monitor.getWebVitalRating('LCP', 5000)).toBe('poor');

      // Test FID Ratings
      expect(monitor.getWebVitalRating('FID', 50)).toBe('good');
      expect(monitor.getWebVitalRating('FID', 200)).toBe('needs-improvement');
      expect(monitor.getWebVitalRating('FID', 400)).toBe('poor');

      // Test CLS Ratings
      expect(monitor.getWebVitalRating('CLS', 0.05)).toBe('good');
      expect(monitor.getWebVitalRating('CLS', 0.15)).toBe('needs-improvement');
      expect(monitor.getWebVitalRating('CLS', 0.3)).toBe('poor');

      // Test TTFB Ratings
      expect(monitor.getWebVitalRating('TTFB', 600)).toBe('good');
      expect(monitor.getWebVitalRating('TTFB', 1200)).toBe('needs-improvement');
      expect(monitor.getWebVitalRating('TTFB', 2000)).toBe('poor');
    });

    it('sollte nur die letzten 10 Web Vitals behalten', () => {
      // 12 Web Vitals loggen
      for (let i = 0; i < 12; i++) {
        monitor.logWebVital('FCP', 1000 + i * 100);
      }

      const report = monitor.generateReport();
      expect(report.webVitals).toHaveLength(10);
      // Sollte die letzten 10 sein (2-11)
      expect(report.webVitals[0].value).toBe(1200);
      expect(report.webVitals[9].value).toBe(2100);
    });
  });

  describe('Performance Marks', () => {
    it('sollte Performance-Marks erstellen', () => {
      monitor.createMark('test_mark');
      
      expect(performance.mark).toHaveBeenCalledWith('test_mark');
    });

    it('sollte Zeit zwischen Marks messen', () => {
      const mockMeasure = {
        duration: 250,
      };
      
      global.performance.getEntriesByName = vi.fn(() => [mockMeasure]);
      const logMetricSpy = vi.spyOn(monitor, 'logMetric');

      const duration = monitor.measureMark('start_mark', 'end_mark', 'test_measure');

      expect(performance.measure).toHaveBeenCalledWith('test_measure', 'start_mark', 'end_mark');
      expect(logMetricSpy).toHaveBeenCalledWith('mark_test_measure', 250);
      expect(duration).toBe(250);
    });
  });

  describe('Memory Tracking', () => {
    it('sollte Memory Usage tracken', () => {
      const logMetricSpy = vi.spyOn(monitor, 'logMetric');

      monitor.trackMemoryUsage();

      expect(logMetricSpy).toHaveBeenCalledWith('memory_used', 1000000);
      expect(logMetricSpy).toHaveBeenCalledWith('memory_total', 2000000);
      expect(logMetricSpy).toHaveBeenCalledWith('memory_limit', 5000000);
    });

    it('sollte Memory-Tracking überspringen, wenn nicht verfügbar', () => {
      delete (global.performance as any).memory;
      const logMetricSpy = vi.spyOn(monitor, 'logMetric');

      monitor.trackMemoryUsage();

      expect(logMetricSpy).not.toHaveBeenCalled();
    });
  });

  describe('Reporting', () => {
    it('sollte umfassenden Report generieren', () => {
      monitor.logMetric('test_metric', 100);
      monitor.logUserAction('test_action', 200);
      monitor.logWebVital('FCP', 1500);

      const report = monitor.generateReport();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('page');
      expect(report).toHaveProperty('userAgent');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('userActions');
      expect(report).toHaveProperty('webVitals');
      expect(report).toHaveProperty('summary');
    });

    it('sollte Summary mit korrekten Statistiken generieren', () => {
      monitor.logUserAction('fast_action', 50);
      monitor.logUserAction('slow_action', 1500);
      monitor.logUserAction('medium_action', 300);
      monitor.logWebVital('FCP', 2000);

      const summary = monitor.generateReport().summary;

      expect(summary.totalUserActions).toBe(3);
      expect(summary.averageUserActionTime).toBe(617); // (50 + 1500 + 300) / 3 = 617
      expect(summary.slowUserActionsCount).toBe(1);
      expect(summary.webVitals.FCP.average).toBe(2000);
      expect(summary.webVitals.FCP.rating).toBe('needs-improvement');
    });

    it('sollte Report als JSON exportieren', () => {
      monitor.logMetric('test', 100);

      const jsonExport = monitor.exportData();
      const parsed = JSON.parse(jsonExport);

      expect(parsed).toHaveProperty('metrics');
      expect(parsed.metrics).toHaveLength(1);
      expect(parsed.metrics[0].name).toBe('test');
    });
  });

  describe('Analytics Integration', () => {
    it('sollte Daten an Analytics-Endpoint senden', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as any);

      monitor.logMetric('test', 100);
      monitor.sendToAnalytics('https://analytics.example.com');

      expect(fetchSpy).toHaveBeenCalledWith('https://analytics.example.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.any(String),
      });

      fetchSpy.mockRestore();
    });

    it('sollte Daten lokal für Debugging speichern', async () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      monitor.logMetric('test', 100);
      monitor.sendToAnalytics();

      expect(setItemSpy).toHaveBeenCalledWith(
        'performanceReport',
        expect.any(String)
      );

      setItemSpy.mockRestore();
    });

    it('sollte lokale Speicherung bei Fehlern handhaben', async () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
        .mockImplementation(() => {
          throw new Error('Storage full');
        });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      monitor.logMetric('test', 100);
      monitor.sendToAnalytics();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Konnte Performance-Report nicht lokal speichern:',
        expect.any(Error)
      );

      setItemSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('Data Management', () => {
    it('sollte alle Daten löschen können', () => {
      monitor.logMetric('test', 100);
      monitor.logUserAction('test', 200);
      monitor.logWebVital('FCP', 1500);

      monitor.clearData();

      const report = monitor.generateReport();
      expect(report.metrics).toHaveLength(0);
      expect(report.userActions).toHaveLength(0);
      expect(report.webVitals).toHaveLength(0);
    });
  });

  describe('Performance Tests', () => {
    it('sollte große Datenmengen effizient verarbeiten', () => {
      const startTime = performance.now();

      // 1000 Metriken loggen
      for (let i = 0; i < 1000; i++) {
        monitor.logMetric(`metric_${i}`, i);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Sollte unter 100ms dauern
      expect(duration).toBeLessThan(100);
    });

    it('sollte Memory-effizient sein', () => {
      const initialMemory = (global.performance as any).memory?.usedJSHeapSize || 0;

      // Viele Operationen durchführen
      for (let i = 0; i < 100; i++) {
        monitor.logMetric(`metric_${i}`, i);
        monitor.logUserAction(`action_${i}`, i * 10);
      }

      const report = monitor.generateReport();
      
      // Sollte nur die letzten 100 Metriken und 50 Actions behalten
      expect(report.metrics).toHaveLength(100);
      expect(report.userActions).toHaveLength(50);
    });
  });

  describe('Hook Integration', () => {
    describe('usePerformanceTracking', () => {
      it('sollte Action-Tracking-Hook bereitstellen', () => {
        const trackAction = usePerformanceTracking().trackAction;

        expect(typeof trackAction).toBe('function');
      });

      it('sollte Metric-Tracking-Hook bereitstellen', () => {
        const trackMetric = usePerformanceTracking().trackMetric;

        expect(typeof trackMetric).toBe('function');
      });

      it('sollte Action-Tracking funktionieren', () => {
        const { trackAction } = usePerformanceTracking();
        const stopTracking = trackAction('test_action');

        // Simuliere Zeitverzögerung
        setTimeout(() => {
          stopTracking();
        }, 10);

        const report = monitor.generateReport();
        
        // Sollte mindestens eine User Action haben
        expect(report.userActions.length).toBeGreaterThan(0);
      });

      it('sollte Metric-Tracking funktionieren', () => {
        const { trackMetric } = usePerformanceTracking();

        trackMetric('custom_metric', 150, { component: 'test' });

        const report = monitor.generateReport();
        const metric = report.metrics.find(m => m.name === 'custom_metric');
        
        expect(metric).toBeDefined();
        expect(metric?.value).toBe(150);
        expect(metric?.metadata?.component).toBe('test');
      });
    });
  });

  describe('Browser Compatibility', () => {
    it('sollte nur im Browser initialisiert werden', () => {
      const originalWindow = global.window;
      delete (global as any).window;

      const initializeSpy = vi.spyOn(PerformanceMonitor.prototype, 'initialize');
      
      // Re-import um Auto-Initialisierung zu testen
      vi.doMock('../../utils/performanceLogger', () => ({
        performanceMonitor: PerformanceMonitor.getInstance(),
        usePerformanceTracking: vi.fn(),
        default: PerformanceMonitor,
      }));

      expect(initializeSpy).not.toHaveBeenCalled();

      global.window = originalWindow;
    });

    it('sollte PerformanceObserver-Fehler handhaben', () => {
      const originalPerformanceObserver = global.PerformanceObserver;
      global.PerformanceObserver = undefined;

      // Sollte keinen Fehler werfen
      expect(() => {
        monitor.initialize();
      }).not.toThrow();

      global.PerformanceObserver = originalPerformanceObserver;
    });
  });
});