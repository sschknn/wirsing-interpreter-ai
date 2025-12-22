/**
 * Enterprise Performance Monitoring System
 * Umfassende Performance-Metriken für Production-Monitoring
 */

export interface PerformanceMetrics {
  // Core Web Vitals
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  cls?: number; // Cumulative Layout Shift
  fid?: number; // First Input Delay
  tbt?: number; // Total Blocking Time
  tti?: number; // Time to Interactive
  
  // Bundle Performance
  bundleLoadTime?: number;
  initialBundleSize?: number;
  totalBundleSize?: number;
  cacheHitRate?: number;
  
  // Runtime Performance
  memoryUsage?: number;
  memoryLeaks?: number;
  longTask?: number;
  renderTime?: number;
  componentMountTime?: number;
  
  // Custom App Metrics
  aiServiceResponseTime?: number;
  slideTransitionTime?: number;
  voiceRecognitionLatency?: number;
  
  // User Experience
  timeToFirstInteraction?: number;
  scrollPerformance?: number;
  animationFrameRate?: number;
}

export interface PerformanceThresholds {
  excellent: number;
  good: number;
  needsImprovement: number;
  poor: number;
}

export const PERFORMANCE_THRESHOLDS: Record<keyof PerformanceMetrics, PerformanceThresholds> = {
  fcp: { excellent: 1200, good: 1800, needsImprovement: 2500, poor: Infinity },
  lcp: { excellent: 2000, good: 2500, needsImprovement: 4000, poor: Infinity },
  cls: { excellent: 0.05, good: 0.1, needsImprovement: 0.25, poor: Infinity },
  fid: { excellent: 50, good: 100, needsImprovement: 200, poor: Infinity },
  tbt: { excellent: 150, good: 300, needsImprovement: 600, poor: Infinity },
  tti: { excellent: 2500, good: 3000, needsImprovement: 4500, poor: Infinity },
  
  bundleLoadTime: { excellent: 1500, good: 2500, needsImprovement: 4000, poor: Infinity },
  initialBundleSize: { excellent: 100, good: 200, needsImprovement: 500, poor: Infinity }, // kB
  totalBundleSize: { excellent: 500, good: 800, needsImprovement: 1200, poor: Infinity }, // kB
  cacheHitRate: { excellent: 0.9, good: 0.7, needsImprovement: 0.5, poor: 0 },
  
  memoryUsage: { excellent: 50, good: 100, needsImprovement: 200, poor: Infinity }, // MB
  memoryLeaks: { excellent: 5, good: 10, needsImprovement: 20, poor: Infinity }, // MB increase
  longTask: { excellent: 50, good: 100, needsImprovement: 200, poor: Infinity }, // ms
  renderTime: { excellent: 16, good: 32, needsImprovement: 50, poor: Infinity }, // ms per frame
  componentMountTime: { excellent: 50, good: 100, needsImprovement: 200, poor: Infinity },
  
  aiServiceResponseTime: { excellent: 1000, good: 2000, needsImprovement: 5000, poor: Infinity },
  slideTransitionTime: { excellent: 200, good: 400, needsImprovement: 800, poor: Infinity },
  voiceRecognitionLatency: { excellent: 300, good: 500, needsImprovement: 1000, poor: Infinity },
  
  timeToFirstInteraction: { excellent: 1500, good: 2500, needsImprovement: 4000, poor: Infinity },
  scrollPerformance: { excellent: 60, good: 30, needsImprovement: 15, poor: 0 }, // fps
  animationFrameRate: { excellent: 60, good: 45, needsImprovement: 30, poor: 0 } // fps
};

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics = {};
  private observers: PerformanceObserver[] = [];
  private reportQueue: PerformanceMetrics[] = [];
  private isReporting = false;
  
  private constructor() {
    this.initializeObservers();
    this.setupCoreWebVitals();
    this.setupMemoryMonitoring();
    this.setupCustomMetrics();
  }
  
  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  private initializeObservers() {
    // Performance Observer für Long Tasks
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          console.warn(`Long Task detected: ${entry.duration}ms`, entry);
          this.recordMetric('longTask', entry.duration);
        });
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);
    }
  }
  
  private setupCoreWebVitals() {
    // First Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (entry.name === 'first-contentful-paint') {
          this.recordMetric('fcp', entry.startTime);
        }
      });
    }).observe({ entryTypes: ['paint'] });
    
    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      if (lastEntry) {
        this.recordMetric('lcp', lastEntry.startTime);
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] });
    
    // First Input Delay
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        this.recordMetric('fid', entry.processingStart - entry.startTime);
      });
    }).observe({ entryTypes: ['first-input'] });
    
    // Layout Shift Score
    new PerformanceObserver((list) => {
      let clsScore = 0;
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsScore += entry.value;
        }
      });
      this.recordMetric('cls', clsScore);
    }).observe({ entryTypes: ['layout-shift'] });
  }
  
  private setupMemoryMonitoring() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.recordMetric('memoryUsage', memory.usedJSHeapSize / 1024 / 1024); // MB
      
      // Überwache Memory-Leaks
      setInterval(() => {
        const current = (performance as any).memory.usedJSHeapSize / 1024 / 1024;
        const previous = this.metrics.memoryUsage || 0;
        
        if (current > previous * 1.1 && previous > 0) {
          console.warn('Potential memory leak detected', { previous, current });
          this.recordMetric('memoryLeaks', current - previous);
        }
        
        this.recordMetric('memoryUsage', current);
      }, 10000); // Check every 10 seconds
    }
  }
  
  private setupCustomMetrics() {
    // Time to Interactive
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.recordMetric('tti', performance.now());
      }, 0);
    });
    
    // Bundle Loading Performance
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        this.recordMetric('bundleLoadTime', navigation.loadEventEnd - navigation.fetchStart);
      }
    });
  }
  
  public recordMetric(metric: keyof PerformanceMetrics, value: number): void {
    this.metrics[metric] = value;
    
    // Threshold-Checking
    const threshold = PERFORMANCE_THRESHOLDS[metric];
    if (threshold) {
      const rating = this.getMetricRating(metric, value);
      console.log(`Performance Metric [${metric}]: ${value.toFixed(2)} - ${rating}`);
      
      // Alert für schlechte Performance
      if (rating === 'needsImprovement' || rating === 'poor') {
        console.warn(`Performance Alert: ${metric} is ${rating}`, { value, threshold });
      }
    }
  }
  
  private getMetricRating(metric: keyof PerformanceMetrics, value: number): string {
    const threshold = PERFORMANCE_THRESHOLDS[metric];
    if (!threshold) return 'unknown';
    
    if (value <= threshold.excellent) return 'excellent';
    if (value <= threshold.good) return 'good';
    if (value <= threshold.needsImprovement) return 'needsImprovement';
    return 'poor';
  }
  
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
  
  public getPerformanceReport(): string {
    const report = Object.entries(this.metrics)
      .map(([metric, value]) => {
        const rating = this.getMetricRating(metric as keyof PerformanceMetrics, value || 0);
        return `${metric}: ${value?.toFixed(2) || 'N/A'} (${rating})`;
      })
      .join('\n');
    
    return `Performance Report:\n${report}`;
  }
  
  public async reportToAnalytics(metrics?: PerformanceMetrics): Promise<void> {
    if (this.isReporting) return;
    this.isReporting = true;
    
    try {
      const finalMetrics = metrics || this.metrics;
      
      // Simuliere Analytics-Reporting
      console.log('📊 Reporting to Analytics:', finalMetrics);
      
      // In Production würde hier der tatsächliche Analytics-Call stehen
      // await analytics.track('performance_metrics', finalMetrics);
      
    } catch (error) {
      console.error('Failed to report performance metrics:', error);
    } finally {
      this.isReporting = false;
    }
  }
  
  // App-spezifische Performance-Metriken
  public startComponentTimer(componentName: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMetric('componentMountTime', duration);
      console.log(`Component [${componentName}] mounted in ${duration.toFixed(2)}ms`);
    };
  }
  
  public measureAIServiceCall<T>(serviceName: string, operation: () => Promise<T>): Promise<T> {
    const start = performance.now();
    return operation().finally(() => {
      const duration = performance.now() - start;
      this.recordMetric('aiServiceResponseTime', duration);
      console.log(`AI Service [${serviceName}] completed in ${duration.toFixed(2)}ms`);
    });
  }
  
  public measureSlideTransition(): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMetric('slideTransitionTime', duration);
    };
  }
  
  // Bundle-Size Tracking
  public trackBundleSize(): void {
    // Sammle Bundle-Informationen
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    let totalSize = 0;
    
    scripts.forEach((script) => {
      const src = script.getAttribute('src');
      if (src && !src.includes('data:')) {
        // Diese Information wäre normalerweise aus Build-Metrics verfügbar
        console.log(`Bundle chunk: ${src}`);
      }
    });
  }
  
  public dispose(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
  }
}

// Singleton-Export für einfache Nutzung
export const performanceMonitor = PerformanceMonitor.getInstance();

// React Hook für Performance-Monitoring
import { useEffect, useRef } from 'react';

export function usePerformanceMonitor(componentName: string) {
  const endTimerRef = useRef<(() => void) | null>(null);
  
  useEffect(() => {
    // Starte Timer beim Component-Mount
    endTimerRef.current = performanceMonitor.startComponentTimer(componentName);
    
    return () => {
      // Beende Timer beim Component-Unmount
      if (endTimerRef.current) {
        endTimerRef.current();
      }
    };
  }, [componentName]);
  
  return {
    measureOperation: <T>(operationName: string, operation: () => T): T => {
      const timer = performanceMonitor.startComponentTimer(operationName);
      const result = operation();
      timer();
      return result;
    },
    
    measureAsyncOperation: async <T>(operationName: string, operation: () => Promise<T>): Promise<T> => {
      return performanceMonitor.measureAIServiceCall(operationName, operation);
    }
  };
}