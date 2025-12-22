/**
 * Real-time Performance Dashboard
 * Enterprise-Grade Performance-Monitoring für Production
 */

import React, { useState, useEffect, useCallback } from 'react';
import { performanceMonitor, PerformanceMetrics } from '../utils/performance-monitor';
import '../styles/performance-dashboard.css';

interface PerformanceDashboardProps {
  isVisible: boolean;
  onClose: () => void;
}

interface MetricData {
  current: number;
  rating: 'excellent' | 'good' | 'needsImprovement' | 'poor';
  trend: 'up' | 'down' | 'stable';
  history: number[];
}

interface DashboardMetrics {
  [key: string]: MetricData;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  isVisible,
  onClose
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({});
  const [isRealTime, setIsRealTime] = useState(true);
  const [performanceBudget, setPerformanceBudget] = useState({
    totalBundleSize: 500, // kB
    initialLoadTime: 2000, // ms
    timeToInteractive: 3000 // ms
  });

  // Performance Metriken aktualisieren
  const updateMetrics = useCallback(() => {
    const currentMetrics = performanceMonitor.getMetrics();
    const newMetrics: DashboardMetrics = {};

    Object.entries(currentMetrics).forEach(([key, value]) => {
      if (value !== undefined) {
        const rating = getMetricRating(key as keyof PerformanceMetrics, value) as 'excellent' | 'good' | 'needsImprovement' | 'poor';
        const history = metrics[key]?.history || [];
        const newHistory = [...history.slice(-19), value]; // Letzte 20 Werte
        
        newMetrics[key] = {
          current: value,
          rating,
          trend: calculateTrend(history, value),
          history: newHistory
        };
      }
    });

    setMetrics(newMetrics);
  }, [metrics]);

  useEffect(() => {
    if (isVisible) {
      updateMetrics();
      
      if (isRealTime) {
        const interval = setInterval(updateMetrics, 1000);
        return () => clearInterval(interval);
      }
    }
  }, [isVisible, isRealTime, updateMetrics]);

  // Performance Budget Check
  const checkPerformanceBudget = () => {
    const violations: string[] = [];
    
    const totalBundleSize = metrics.totalBundleSize?.current || 0;
    if (totalBundleSize > performanceBudget.totalBundleSize) {
      violations.push(`Bundle size exceeds budget: ${totalBundleSize}kB > ${performanceBudget.totalBundleSize}kB`);
    }

    const initialLoadTime = metrics.bundleLoadTime?.current || 0;
    if (initialLoadTime > performanceBudget.initialLoadTime) {
      violations.push(`Load time exceeds budget: ${initialLoadTime}ms > ${performanceBudget.initialLoadTime}ms`);
    }

    const tti = metrics.tti?.current || 0;
    if (tti > performanceBudget.timeToInteractive) {
      violations.push(`TTI exceeds budget: ${tti}ms > ${performanceBudget.timeToInteractive}ms`);
    }

    return violations;
  };

  const violations = checkPerformanceBudget();

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Real-time Performance Dashboard</h2>
              <p className="text-blue-100 mt-1">Enterprise Performance Monitoring</p>
            </div>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isRealTime}
                  onChange={(e) => setIsRealTime(e.target.checked)}
                  className="form-checkbox h-4 w-4 text-blue-600"
                />
                <span className="text-sm">Real-time</span>
              </label>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 text-2xl font-bold"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Performance Budget Violations */}
          {violations.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-red-800 font-semibold mb-2">🚨 Performance Budget Violations</h3>
              <ul className="text-red-700 text-sm space-y-1">
                {violations.map((violation, index) => (
                  <li key={index}>• {violation}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Core Web Vitals */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Core Web Vitals</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(metrics).filter(([key]) => 
                ['fcp', 'lcp', 'cls', 'fid'].includes(key)
              ).map(([key, data]) => (
                <MetricCard
                  key={key}
                  name={key}
                  data={data}
                  unit={key === 'cls' ? '' : 'ms'}
                />
              ))}
            </div>
          </div>

          {/* Runtime Performance */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Runtime Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(metrics).filter(([key]) => 
                ['memoryUsage', 'longTask', 'renderTime', 'componentMountTime'].includes(key)
              ).map(([key, data]) => (
                <MetricCard
                  key={key}
                  name={key}
                  data={data}
                  unit={key === 'memoryUsage' ? 'MB' : 'ms'}
                />
              ))}
            </div>
          </div>

          {/* App Performance */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">App Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(metrics).filter(([key]) => 
                ['aiServiceResponseTime', 'slideTransitionTime', 'timeToFirstInteraction'].includes(key)
              ).map(([key, data]) => (
                <MetricCard
                  key={key}
                  name={key}
                  data={data}
                  unit="ms"
                />
              ))}
            </div>
          </div>

          {/* Bundle Performance */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Bundle Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(metrics).filter(([key]) => 
                ['bundleLoadTime', 'totalBundleSize', 'cacheHitRate'].includes(key)
              ).map(([key, data]) => (
                <MetricCard
                  key={key}
                  name={key}
                  data={data}
                  unit={key === 'totalBundleSize' ? 'kB' : key === 'cacheHitRate' ? '%' : 'ms'}
                />
              ))}
            </div>
          </div>

          {/* Performance Trends Chart */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Performance Trends</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <SimpleChart data={metrics} />
            </div>
          </div>

          {/* Performance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">Excellent Metrics</h4>
              <p className="text-2xl font-bold text-green-600">
                {Object.values(metrics).filter(m => m.rating === 'excellent').length}
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-semibold text-yellow-800 mb-2">Needs Improvement</h4>
              <p className="text-2xl font-bold text-yellow-600">
                {Object.values(metrics).filter(m => m.rating === 'needsImprovement').length}
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-800 mb-2">Poor Metrics</h4>
              <p className="text-2xl font-bold text-red-600">
                {Object.values(metrics).filter(m => m.rating === 'poor').length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Metric Card Component
interface MetricCardProps {
  name: string;
  data: MetricData;
  unit: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ name, data, unit }) => {
  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'excellent': return 'text-green-600 bg-green-50 border-green-200';
      case 'good': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'needsImprovement': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      case 'stable': return '→';
      default: return '';
    }
  };

  const formatMetricName = (name: string) => {
    return name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  return (
    <div className={`p-4 rounded-lg border ${getRatingColor(data.rating)}`}>
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-sm">{formatMetricName(name)}</h4>
        <span className="text-lg">{getTrendIcon(data.trend)}</span>
      </div>
      <div className="flex items-baseline space-x-2">
        <span className="text-2xl font-bold">
          {data.current.toFixed(unit === '%' ? 1 : 0)}
        </span>
        <span className="text-sm opacity-75">{unit}</span>
      </div>
      <div className="mt-2">
        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getRatingColor(data.rating)}`}>
          {data.rating}
        </span>
      </div>
      {/* Mini Chart */}
      <div className="mt-3 h-8">
        <MiniChart data={data.history} />
      </div>
    </div>
  );
};

// Simple Chart Component
const SimpleChart: React.FC<{ data: DashboardMetrics }> = ({ data }) => {
  const metrics = Object.entries(data).slice(0, 6); // Zeige nur erste 6 Metriken
  
  return (
    <div className="flex items-end space-x-2 h-32">
      {metrics.map(([key, metricData]) => {
        const maxValue = Math.max(...metricData.history);
        const height = (metricData.current / maxValue) * 100;
        
        // Konvertiere Höhe zu CSS-Klasse
        const getHeightClass = (heightPercent: number): string => {
          const roundedHeight = Math.round(heightPercent / 5) * 5; // Auf 5% runden
          return `chart-bar-height-${Math.max(0, Math.min(100, roundedHeight))}`;
        };
        
        const getRatingClass = (rating: string): string => {
          switch (rating) {
            case 'excellent': return 'chart-bar-excellent';
            case 'good': return 'chart-bar-good';
            case 'needsImprovement': return 'chart-bar-needs-improvement';
            case 'poor': return 'chart-bar-poor';
            default: return 'chart-bar-good';
          }
        };

        return (
          <div key={key} className="chart-bar-container">
            <div
              className={`chart-bar-base ${getHeightClass(height)} ${getRatingClass(metricData.rating)}`}
              title={`${key}: ${metricData.current.toFixed(2)}`}
            />
            <span className="text-xs mt-1 text-gray-600 transform rotate-45 origin-bottom-left">
              {key}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// Mini Chart Component für Metric Cards
const MiniChart: React.FC<{ data: number[] }> = ({ data }) => {
  if (data.length < 2) return null;
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        className="text-gray-400"
      />
    </svg>
  );
};

// Helper Functions
function getMetricRating(metric: keyof PerformanceMetrics, value: number): 'excellent' | 'good' | 'needsImprovement' | 'poor' {
  const thresholds: Record<keyof PerformanceMetrics, { excellent: number; good: number; needsImprovement: number; }> = {
    fcp: { excellent: 1200, good: 1800, needsImprovement: 2500 },
    lcp: { excellent: 2000, good: 2500, needsImprovement: 4000 },
    cls: { excellent: 0.05, good: 0.1, needsImprovement: 0.25 },
    fid: { excellent: 50, good: 100, needsImprovement: 200 },
    tbt: { excellent: 150, good: 300, needsImprovement: 600 },
    tti: { excellent: 2500, good: 3000, needsImprovement: 4500 },
    bundleLoadTime: { excellent: 1500, good: 2500, needsImprovement: 4000 },
    initialBundleSize: { excellent: 100, good: 200, needsImprovement: 500 },
    totalBundleSize: { excellent: 500, good: 800, needsImprovement: 1200 },
    cacheHitRate: { excellent: 0.9, good: 0.7, needsImprovement: 0.5 },
    memoryUsage: { excellent: 50, good: 100, needsImprovement: 200 },
    memoryLeaks: { excellent: 5, good: 10, needsImprovement: 20 },
    longTask: { excellent: 50, good: 100, needsImprovement: 200 },
    renderTime: { excellent: 16, good: 32, needsImprovement: 50 },
    componentMountTime: { excellent: 50, good: 100, needsImprovement: 200 },
    aiServiceResponseTime: { excellent: 1000, good: 2000, needsImprovement: 5000 },
    slideTransitionTime: { excellent: 200, good: 400, needsImprovement: 800 },
    voiceRecognitionLatency: { excellent: 300, good: 500, needsImprovement: 1000 },
    timeToFirstInteraction: { excellent: 1500, good: 2500, needsImprovement: 4000 },
    scrollPerformance: { excellent: 60, good: 30, needsImprovement: 15 },
    animationFrameRate: { excellent: 60, good: 45, needsImprovement: 30 }
  };

  const threshold = thresholds[metric];
  if (!threshold) return 'good';

  if (value <= threshold.excellent) return 'excellent';
  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needsImprovement';
  return 'poor';
}

function calculateTrend(history: number[], current: number): 'up' | 'down' | 'stable' {
  if (history.length < 2) return 'stable';
  
  const recent = history.slice(-3);
  const average = recent.reduce((sum, val) => sum + val, 0) / recent.length;
  
  const diff = current - average;
  const percentageDiff = Math.abs(diff) / average;
  
  if (percentageDiff < 0.05) return 'stable';
  return diff > 0 ? 'up' : 'down';
}

export default PerformanceDashboard;