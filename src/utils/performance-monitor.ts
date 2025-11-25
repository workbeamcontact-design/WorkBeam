/**
 * Performance monitoring and optimization utilities
 * Tracks app performance metrics and provides insights
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  category: 'load' | 'navigation' | 'render' | 'interaction' | 'custom';
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 200;
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.setupPerformanceObservers();
  }

  private setupPerformanceObservers() {
    // Monitor Long Tasks (blocking main thread)
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            // Only record severely problematic long tasks (>500ms)
            // Normal React operations with lazy loading can take 100-300ms
            if (entry.duration > 500) {
              this.recordMetric({
                name: 'long_task',
                value: entry.duration,
                category: 'render'
              });
            }
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch (e) {
        // Some browsers don't support longtask
      }

      // Monitor Layout Shifts
      try {
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput && (entry as any).value > 0.1) {
              this.recordMetric({
                name: 'layout_shift',
                value: (entry as any).value,
                category: 'render'
              });
            }
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (e) {
        // CLS not supported in all browsers
      }

      // Monitor First Input Delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric({
              name: 'first_input_delay',
              value: entry.processingStart - entry.startTime,
              category: 'interaction'
            });
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (e) {
        // FID not supported in all browsers
      }
    }
  }

  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>) {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now()
    };

    this.metrics.push(fullMetric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Performance logging completely disabled - no console warnings
    // Metrics are still collected and available via performanceMonitor.getPerformanceSummary()
  }

  // Performance issue logging is completely disabled
  // Metrics are still collected and available via getPerformanceSummary()
  // To re-enable console warnings, uncomment and restore the logPerformanceIssues method

  // Measure navigation performance
  measureNavigation(fromScreen: string, toScreen: string) {
    const startTime = performance.now();
    
    return {
      end: () => {
        const duration = performance.now() - startTime;
        
        // Sanity check - navigation shouldn't take more than 10 seconds
        if (duration > 10000) {
          console.warn(`⚠️ Suspicious navigation time: ${duration.toFixed(2)}ms - not recording`);
          return;
        }
        
        this.recordMetric({
          name: 'navigation_time',
          value: duration,
          category: 'navigation'
        });
        
        // Only log if duration is reasonable
        if (duration < 5000) {
          console.log(`📱 Navigation ${fromScreen} → ${toScreen}: ${duration.toFixed(2)}ms`);
        }
      }
    };
  }

  // Measure component render time
  measureRender(componentName: string) {
    const startTime = performance.now();
    
    return {
      end: () => {
        const duration = performance.now() - startTime;
        this.recordMetric({
          name: `${componentName}_render`,
          value: duration,
          category: 'render'
        });
        
        if (duration > 16) { // Slower than 60fps
          console.warn(`🐌 Slow render: ${componentName} took ${duration.toFixed(2)}ms`);
        }
      }
    };
  }

  // Measure API call performance
  measureApiCall(endpoint: string) {
    const startTime = performance.now();
    
    return {
      end: (success: boolean = true) => {
        const duration = performance.now() - startTime;
        this.recordMetric({
          name: `api_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`,
          value: duration,
          category: 'custom'
        });
        
        const status = success ? '✅' : '❌';
        console.log(`${status} API ${endpoint}: ${duration.toFixed(2)}ms`);
      }
    };
  }

  // Get performance summary
  getPerformanceSummary(): {
    averageNavigationTime: number;
    slowNavigations: number;
    longTasks: number;
    layoutShifts: number;
    recentMetrics: PerformanceMetric[];
    recommendations: string[];
  } {
    const navigationMetrics = this.metrics.filter(m => m.category === 'navigation');
    const longTasks = this.metrics.filter(m => m.name === 'long_task');
    const layoutShifts = this.metrics.filter(m => m.name === 'layout_shift');
    
    const averageNavigationTime = navigationMetrics.length > 0
      ? navigationMetrics.reduce((sum, m) => sum + m.value, 0) / navigationMetrics.length
      : 0;

    const slowNavigations = navigationMetrics.filter(m => m.value > 1000).length;
    
    const recommendations: string[] = [];
    
    if (averageNavigationTime > 500) {
      recommendations.push('Consider implementing lazy loading for better navigation performance');
    }
    if (longTasks.length > 5) {
      recommendations.push('Break down large tasks to improve UI responsiveness');
    }
    if (layoutShifts.length > 3) {
      recommendations.push('Optimize layout stability to reduce visual jumps');
    }

    return {
      averageNavigationTime,
      slowNavigations,
      longTasks: longTasks.length,
      layoutShifts: layoutShifts.length,
      recentMetrics: this.metrics.slice(-20),
      recommendations
    };
  }

  // Memory usage monitoring
  getMemoryUsage(): {
    used: number;
    total: number;
    percentage: number;
  } | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      };
    }
    return null;
  }

  // Bundle size estimation
  estimateBundleSize(): {
    estimatedSize: number;
    scripts: number;
    stylesheets: number;
  } {
    const scripts = document.querySelectorAll('script[src]').length;
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]').length;
    
    // Rough estimation based on number of resources
    const estimatedSize = (scripts * 150 + stylesheets * 50) * 1024; // KB estimate
    
    return {
      estimatedSize,
      scripts,
      stylesheets
    };
  }

  // Clean up observers
  dispose() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export const usePerformanceMonitor = () => {
  const measureNavigation = (fromScreen: string, toScreen: string) => {
    return performanceMonitor.measureNavigation(fromScreen, toScreen);
  };

  const measureRender = (componentName: string) => {
    return performanceMonitor.measureRender(componentName);
  };

  const measureApiCall = (endpoint: string) => {
    return performanceMonitor.measureApiCall(endpoint);
  };

  return {
    measureNavigation,
    measureRender,
    measureApiCall,
    getPerformanceSummary: () => performanceMonitor.getPerformanceSummary(),
    getMemoryUsage: () => performanceMonitor.getMemoryUsage()
  };
};

// Initialize performance monitoring
export const initializePerformanceMonitoring = () => {
  // Expose performance monitor to window for debugging (development only)
  if (process.env.NODE_ENV === 'development') {
    (window as any).performanceMonitor = performanceMonitor;
    console.log('📊 Performance monitor available at window.performanceMonitor');
  }

  // Log initial load performance
  window.addEventListener('load', () => {
    if (performance.timing) {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      performanceMonitor.recordMetric({
        name: 'page_load_time',
        value: loadTime,
        category: 'load'
      });
      console.log(`🚀 Page loaded in ${loadTime}ms`);
    }
  });
};