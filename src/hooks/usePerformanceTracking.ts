import { useEffect, useRef, useState } from 'react';
import { performanceMonitor } from '../utils/performance-monitor';

/**
 * Safe performance tracking hooks
 */

export const useNavigationTracking = (screen: string) => {
  const measurementRef = useRef<{ end: () => void; startTime: number } | null>(null);
  const previousScreenRef = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clean up any previous measurement and timeout
    if (measurementRef.current) {
      measurementRef.current.end();
      measurementRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Only measure if we have a previous screen and it's different
    if (previousScreenRef.current && previousScreenRef.current !== screen) {
      const startTime = performance.now();
      
      measurementRef.current = {
        startTime,
        end: () => {
          const duration = performance.now() - startTime;
          // Only record reasonable navigation times (under 5 seconds)
          if (duration < 5000) {
            performanceMonitor.recordMetric({
              name: 'navigation_time',
              value: duration,
              category: 'navigation'
            });
            console.log(`📱 Navigation ${previousScreenRef.current} → ${screen}: ${duration.toFixed(2)}ms`);
          } else {
            console.warn(`⚠️ Ignoring unrealistic navigation time: ${duration.toFixed(2)}ms`);
          }
        }
      };

      // Force cleanup after 1 second max
      timeoutRef.current = setTimeout(() => {
        if (measurementRef.current) {
          measurementRef.current.end();
          measurementRef.current = null;
        }
        timeoutRef.current = null;
      }, 1000);
    }

    previousScreenRef.current = screen;

    // Cleanup function
    return () => {
      if (measurementRef.current) {
        measurementRef.current.end();
        measurementRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [screen]);
};

export const useRenderTracking = (componentName: string) => {
  const measurementRef = useRef<{ end: () => void } | null>(null);

  useEffect(() => {
    measurementRef.current = performanceMonitor.measureRender(componentName);

    return () => {
      if (measurementRef.current) {
        measurementRef.current.end();
      }
    };
  }, [componentName]);
};