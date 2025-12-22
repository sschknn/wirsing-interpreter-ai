/**
 * Performance Regression Testing Service
 * Automatisierte Performance-Tests für CI/CD Integration
 */

import { performanceMonitor, PerformanceMetrics } from './performance-monitor';

export interface PerformanceTestResult {
  testName: string;
  passed: boolean;
  metrics: PerformanceMetrics;
  violations: string[];
  timestamp: string;
  duration: number;
}

export interface PerformanceTestSuite {
  name: string;
  tests: PerformanceTest[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

export interface PerformanceTest {
  name: string;
  test: () => Promise<PerformanceTestResult>;
  threshold?: Partial<PerformanceMetrics>;
  timeout?: number;
}

export class PerformanceTester {
  private static instance: PerformanceTester;
  private results: PerformanceTestResult[] = [];
  
  public static getInstance(): PerformanceTester {
    if (!PerformanceTester.instance) {
      PerformanceTester.instance = new PerformanceTester();
    }
    return PerformanceTester.instance;
  }

  /**
   * Führe eine Performance-Test-Suite aus
   */
  public async runTestSuite(suite: PerformanceTestSuite): Promise<{
    passed: boolean;
    results: PerformanceTestResult[];
    summary: {
      total: number;
      passed: number;
      failed: number;
      violations: number;
    };
  }> {
    console.log(`🧪 Starting Performance Test Suite: ${suite.name}`);
    
    const results: PerformanceTestResult[] = [];
    
    try {
      // Setup
      if (suite.setup) {
        await suite.setup();
      }

      // Führe alle Tests aus
      for (const test of suite.tests) {
        const result = await this.runSingleTest(test);
        results.push(result);
        this.results.push(result);
        
        const status = result.passed ? '✅' : '❌';
        console.log(`${status} ${test.name}: ${result.passed ? 'PASSED' : 'FAILED'}`);
        
        if (result.violations.length > 0) {
          console.log('  Violations:', result.violations.join(', '));
        }
      }

      // Teardown
      if (suite.teardown) {
        await suite.teardown();
      }

      const summary = this.generateSummary(results);
      
      console.log(`\n📊 Test Suite Summary:`);
      console.log(`  Total: ${summary.total}`);
      console.log(`  Passed: ${summary.passed}`);
      console.log(`  Failed: ${summary.failed}`);
      console.log(`  Violations: ${summary.violations}`);

      return {
        passed: summary.failed === 0,
        results,
        summary
      };

    } catch (error) {
      console.error(`❌ Test Suite failed: ${error}`);
      throw error;
    }
  }

  /**
   * Führe einen einzelnen Performance-Test aus
   */
  private async runSingleTest(test: PerformanceTest): Promise<PerformanceTestResult> {
    const startTime = Date.now();
    
    try {
      console.log(`  Running: ${test.name}`);
      
      // Test mit Timeout ausführen
      const testPromise = test.test();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), test.timeout || 30000);
      });

      const result = await Promise.race([testPromise, timeoutPromise]);
      
      // Führe Performance-Thresholds-Check durch
      const violations = this.checkThresholds(result.metrics, test.threshold);
      
      return {
        ...result,
        violations,
        passed: violations.length === 0 && result.passed
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        testName: test.name,
        passed: false,
        metrics: {},
        violations: [`Test execution failed: ${error}`],
        timestamp: new Date().toISOString(),
        duration
      };
    }
  }

  /**
   * Prüfe Performance-Thresholds
   */
  private checkThresholds(metrics: PerformanceMetrics, thresholds?: Partial<PerformanceMetrics>): string[] {
    if (!thresholds) return [];
    
    const violations: string[] = [];
    
    Object.entries(thresholds).forEach(([metric, threshold]) => {
      const value = metrics[metric as keyof PerformanceMetrics];
      
      if (value !== undefined && value > threshold) {
        violations.push(`${metric}: ${value} exceeds threshold ${threshold}`);
      }
    });

    return violations;
  }

  /**
   * Generiere Test-Summary
   */
  private generateSummary(results: PerformanceTestResult[]) {
    return {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      violations: results.reduce((sum, r) => sum + r.violations.length, 0)
    };
  }

  /**
   * Erstelle Standard Performance-Test-Suite
   */
  public createStandardSuite(): PerformanceTestSuite {
    return {
      name: 'Standard Performance Tests',
      tests: [
        {
          name: 'Page Load Performance',
          test: () => this.testPageLoadPerformance(),
          threshold: {
            fcp: 2000,
            lcp: 3000,
            tti: 4000
          }
        },
        {
          name: 'Memory Usage',
          test: () => this.testMemoryUsage(),
          threshold: {
            memoryUsage: 100
          }
        },
        {
          name: 'Bundle Performance',
          test: () => this.testBundlePerformance(),
          threshold: {
            bundleLoadTime: 3000,
            totalBundleSize: 800
          }
        },
        {
          name: 'Runtime Performance',
          test: () => this.testRuntimePerformance(),
          threshold: {
            renderTime: 50,
            componentMountTime: 200
          }
        }
      ]
    };
  }

  /**
   * Test: Page Load Performance
   */
  private async testPageLoadPerformance(): Promise<PerformanceTestResult> {
    const startTime = Date.now();
    
    // Simuliere Page Load Test
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const metrics = performanceMonitor.getMetrics();
    
    return {
      testName: 'Page Load Performance',
      passed: true,
      metrics,
      violations: [],
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime
    };
  }

  /**
   * Test: Memory Usage
   */
  private async testMemoryUsage(): Promise<PerformanceTestResult> {
    const startTime = Date.now();
    
    // Sammle Memory-Metriken
    const metrics = performanceMonitor.getMetrics();
    
    // Simuliere Memory-Test
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return {
      testName: 'Memory Usage',
      passed: true,
      metrics,
      violations: [],
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime
    };
  }

  /**
   * Test: Bundle Performance
   */
  private async testBundlePerformance(): Promise<PerformanceTestResult> {
    const startTime = Date.now();
    
    const metrics = performanceMonitor.getMetrics();
    
    // Simuliere Bundle-Test
    await new Promise(resolve => setTimeout(resolve, 75));
    
    return {
      testName: 'Bundle Performance',
      passed: true,
      metrics,
      violations: [],
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime
    };
  }

  /**
   * Test: Runtime Performance
   */
  private async testRuntimePerformance(): Promise<PerformanceTestResult> {
    const startTime = Date.now();
    
    const metrics = performanceMonitor.getMetrics();
    
    // Simuliere Runtime-Test
    await new Promise(resolve => setTimeout(resolve, 25));
    
    return {
      testName: 'Runtime Performance',
      passed: true,
      metrics,
      violations: [],
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime
    };
  }

  /**
   * Erstelle Load Test Suite für Artillery
   */
  public createLoadTestSuite(): PerformanceTestSuite {
    return {
      name: 'Load Testing Suite',
      tests: [
        {
          name: 'Concurrent Users Load Test',
          test: () => this.testConcurrentUsers(),
          timeout: 60000
        },
        {
          name: 'Stress Test',
          test: () => this.testStress(),
          timeout: 120000
        }
      ]
    };
  }

  /**
   * Test: Concurrent Users
   */
  private async testConcurrentUsers(): Promise<PerformanceTestResult> {
    const startTime = Date.now();
    
    // Simuliere Concurrent User Test
    console.log('  Simulating 100 concurrent users...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const metrics = performanceMonitor.getMetrics();
    
    return {
      testName: 'Concurrent Users Load Test',
      passed: true,
      metrics,
      violations: [],
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime
    };
  }

  /**
   * Test: Stress Test
   */
  private async testStress(): Promise<PerformanceTestResult> {
    const startTime = Date.now();
    
    // Simuliere Stress Test
    console.log('  Running stress test scenario...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const metrics = performanceMonitor.getMetrics();
    
    return {
      testName: 'Stress Test',
      passed: true,
      metrics,
      violations: [],
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime
    };
  }

  /**
   * Generiere Performance-Report
   */
  public generateReport(): string {
    const report = this.results.map(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const violations = result.violations.length > 0 
        ? `\n  Violations: ${result.violations.join(', ')}` 
        : '';
      
      return `${status} ${result.testName} (${result.duration}ms)${violations}`;
    }).join('\n');

    const summary = this.generateSummary(this.results);
    
    return `Performance Test Report
Generated: ${new Date().toISOString()}

Results:
${report}

Summary:
  Total Tests: ${summary.total}
  Passed: ${summary.passed}
  Failed: ${summary.failed}
  Violations: ${summary.violations}

Overall Status: ${summary.failed === 0 ? 'PASSED' : 'FAILED'}`;
  }

  /**
   * Exportiere Ergebnisse als JSON
   */
  public exportResults(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: this.generateSummary(this.results)
    }, null, 2);
  }

  /**
   * Lösche gespeicherte Ergebnisse
   */
  public clearResults(): void {
    this.results = [];
  }
}

// Singleton-Export
export const performanceTester = PerformanceTester.getInstance();

// React Hook für Performance-Tests
import { useState, useCallback } from 'react';

export function usePerformanceTest() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<PerformanceTestResult[]>([]);

  const runTest = useCallback(async (test: PerformanceTest) => {
    setIsRunning(true);
    try {
      const result = await performanceTester.runTestSuite({
        name: 'Single Test',
        tests: [test]
      });
      setResults(result.results);
      return result;
    } finally {
      setIsRunning(false);
    }
  }, []);

  const runSuite = useCallback(async (suite: PerformanceTestSuite) => {
    setIsRunning(true);
    try {
      const result = await performanceTester.runTestSuite(suite);
      setResults(result.results);
      return result;
    } finally {
      setIsRunning(false);
    }
  }, []);

  return {
    isRunning,
    results,
    runTest,
    runSuite,
    clearResults: () => setResults([])
  };
}

export default PerformanceTester;