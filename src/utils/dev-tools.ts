/**
 * Development tools and debugging utilities
 * Combines all development features into a single interface
 */

import { errorTracker } from './error-tracking';
import { performanceMonitor } from './performance-monitor';
import { devTestUtils } from './testing-framework';
import { AccessibilityAudit } from './accessibility';
import { useAppStore } from '../hooks/useAppStore';

interface DevToolsInterface {
  // Quick actions
  quickTest: () => Promise<any>;
  clearAllData: () => void;
  createTestData: () => any;
  runFullAudit: () => Promise<any>;
  
  // Navigation helpers
  goTo: (screen: string) => void;
  testNavigation: () => Promise<void>;
  
  // Data inspection
  getAppState: () => any;
  getErrors: () => any;
  getPerformance: () => any;
  
  // Debugging helpers
  enableDebugMode: () => void;
  disableDebugMode: () => void;
  logEverything: () => void;
}

class DevTools implements DevToolsInterface {
  private debugMode = false;
  private originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error
  };

  // Quick test runner
  async quickTest() {
    console.group('🚀 Running Quick Development Test');
    
    const results = await devTestUtils.runQuickTest();
    const accessibility = AccessibilityAudit.runAudit();
    const performance = performanceMonitor.getPerformanceSummary();
    const errors = errorTracker.getErrorSummary();
    
    const summary = {
      tests: {
        total: results.length,
        passed: results.filter(r => r.status === 'pass').length,
        failed: results.filter(r => r.status === 'fail').length
      },
      accessibility: {
        errors: accessibility.errors.length,
        warnings: accessibility.warnings.length,
        suggestions: accessibility.suggestions.length
      },
      performance: {
        avgNavigation: performance.averageNavigationTime,
        longTasks: performance.longTasks,
        layoutShifts: performance.layoutShifts
      },
      errors: {
        total: errors.totalErrors,
        recent: errors.recentErrors.length
      }
    };
    
    console.log('📊 Test Summary:', summary);
    console.groupEnd();
    
    return summary;
  }

  // Clear all application data
  clearAllData() {
    console.warn('🗑️ Clearing all application data...');
    
    // Clear localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('trades-') || key.includes('app'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Clear errors and performance data
    errorTracker.clearErrors();
    
    // Reset app state
    const navigate = useAppStore.getState().navigate;
    navigate('dashboard');
    
    console.log(`✅ Cleared ${keysToRemove.length} storage keys and reset app state`);
  }

  // Create comprehensive test data
  createTestData() {
    console.log('📊 Creating comprehensive test data...');
    
    const testData = {
      clients: [],
      jobs: [],
      invoices: [],
      bookings: []
    };

    // Create test clients
    for (let i = 1; i <= 3; i++) {
      testData.clients.push({
        id: `test-client-${i}`,
        name: `Test Client ${i}`,
        email: `client${i}@test.com`,
        phone: `+44 7700 90012${i}`,
        address: `${i}23 Test Street, London, SW1A 1AA`,
        createdAt: new Date().toISOString()
      });
    }

    // Create test jobs
    for (let i = 1; i <= 5; i++) {
      testData.jobs.push({
        id: `test-job-${i}`,
        title: `Test Job ${i}`,
        clientId: `test-client-${Math.ceil(i / 2)}`,
        status: i % 2 === 0 ? 'completed' : 'in-progress',
        createdAt: new Date().toISOString()
      });
    }

    // Save to localStorage
    const existingData = JSON.parse(localStorage.getItem('trades-app-data') || '{}');
    const mergedData = {
      ...existingData,
      clients: [...(existingData.clients || []), ...testData.clients],
      jobs: [...(existingData.jobs || []), ...testData.jobs],
      invoices: [...(existingData.invoices || []), ...testData.invoices],
      bookings: [...(existingData.bookings || []), ...testData.bookings]
    };
    
    localStorage.setItem('trades-app-data', JSON.stringify(mergedData));
    
    console.log('✅ Test data created:', testData);
    return testData;
  }

  // Run full application audit
  async runFullAudit() {
    console.group('🔍 Running Full Application Audit');
    
    const audit = {
      timestamp: new Date().toISOString(),
      performance: performanceMonitor.getPerformanceSummary(),
      errors: errorTracker.getErrorSummary(),
      accessibility: AccessibilityAudit.runAudit(),
      memory: performanceMonitor.getMemoryUsage(),
      bundleSize: performanceMonitor.estimateBundleSize(),
      appState: this.getAppState(),
      localStorage: this.analyzeLocalStorage()
    };
    
    // Score calculation
    let score = 100;
    
    // Performance deductions
    if (audit.performance.averageNavigationTime > 1000) score -= 10;
    if (audit.performance.longTasks > 5) score -= 10;
    if (audit.performance.layoutShifts > 3) score -= 5;
    
    // Error deductions
    if (audit.errors.totalErrors > 10) score -= 20;
    if (audit.errors.totalErrors > 5) score -= 10;
    
    // Accessibility deductions
    score -= audit.accessibility.errors.length * 5;
    score -= audit.accessibility.warnings.length * 2;
    
    // Memory deductions
    if (audit.memory && audit.memory.percentage > 80) score -= 15;
    if (audit.memory && audit.memory.percentage > 60) score -= 5;
    
    audit.score = Math.max(0, score);
    
    console.log(`📊 Application Health Score: ${audit.score}/100`);
    console.log('📈 Full Audit Results:', audit);
    console.groupEnd();
    
    return audit;
  }

  // Navigation helpers
  goTo(screen: string) {
    const navigate = useAppStore.getState().navigate;
    navigate(screen as any);
    console.log(`📱 Navigated to: ${screen}`);
  }

  async testNavigation() {
    return devTestUtils.testNavigationFlow();
  }

  // Data inspection helpers
  getAppState() {
    return useAppStore.getState();
  }

  getErrors() {
    return errorTracker.getErrorSummary();
  }

  getPerformance() {
    return performanceMonitor.getPerformanceSummary();
  }

  // Analyze localStorage usage
  private analyzeLocalStorage() {
    const analysis = {
      totalKeys: localStorage.length,
      tradesAppKeys: 0,
      totalSize: 0,
      keys: [] as Array<{ key: string; size: number }>
    };

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || '';
        const size = new Blob([value]).size;
        
        analysis.keys.push({ key, size });
        analysis.totalSize += size;
        
        if (key.includes('trades') || key.includes('app')) {
          analysis.tradesAppKeys++;
        }
      }
    }

    return analysis;
  }

  // Debug mode controls
  enableDebugMode() {
    this.debugMode = true;
    
    // Enhanced logging
    console.log = (...args) => {
      this.originalConsole.log('🔍 [DEBUG]', ...args);
    };
    
    console.warn = (...args) => {
      this.originalConsole.warn('⚠️ [DEBUG]', ...args);
    };
    
    console.error = (...args) => {
      this.originalConsole.error('❌ [DEBUG]', ...args);
    };

    // Add debug styles
    document.body.classList.add('debug-mode');
    
    console.log('🔍 Debug mode enabled');
  }

  disableDebugMode() {
    this.debugMode = false;
    
    // Restore original console
    console.log = this.originalConsole.log;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    
    document.body.classList.remove('debug-mode');
    
    console.log('🔍 Debug mode disabled');
  }

  // Log everything for debugging
  logEverything() {
    console.group('📋 Complete Application State Dump');
    console.log('🏪 App Store:', this.getAppState());
    console.log('🚨 Errors:', this.getErrors());
    console.log('⚡ Performance:', this.getPerformance());
    console.log('♿ Accessibility:', AccessibilityAudit.runAudit());
    console.log('💾 Local Storage:', this.analyzeLocalStorage());
    console.log('🧠 Memory:', performanceMonitor.getMemoryUsage());
    console.groupEnd();
  }
}

// Create singleton instance
export const devTools = new DevTools();

// Initialize development tools
export const initializeDevTools = () => {
  if (process.env.NODE_ENV !== 'development') return;

  // Expose dev tools globally
  (window as any).devTools = devTools;
  (window as any).dt = devTools; // Short alias

  // Add helpful console commands
  console.log('\n🛠️  DEVELOPMENT TOOLS AVAILABLE:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('devTools.quickTest()     - Run quick test suite');
  console.log('devTools.runFullAudit()  - Complete app audit');
  console.log('devTools.createTestData() - Generate test data');
  console.log('devTools.clearAllData()  - Clear all app data');
  console.log('devTools.goTo("screen")  - Navigate to screen');
  console.log('devTools.logEverything() - Dump all app state');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Keyboard shortcuts:');
  console.log('Ctrl+Shift+D - Toggle performance dashboard');
  console.log('Alt+M - Focus main navigation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Add debug CSS for development
  const debugStyles = `
    .debug-mode * {
      outline: 1px solid rgba(255, 0, 0, 0.2) !important;
    }
    
    .debug-mode button {
      outline: 2px solid rgba(0, 255, 0, 0.5) !important;
    }
    
    .debug-mode input, .debug-mode textarea, .debug-mode select {
      outline: 2px solid rgba(0, 0, 255, 0.5) !important;
    }
  `;

  const styleSheet = document.createElement('style');
  styleSheet.textContent = debugStyles;
  document.head.appendChild(styleSheet);

  console.log('🛠️ Development tools initialized');
};