/**
 * Enhanced testing framework for WorkBeam
 * Provides comprehensive testing utilities for manual and automated testing
 */

import { useAppStore } from '../hooks/useAppStore';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  duration: number;
  data?: any;
}

interface TestSuite {
  name: string;
  tests: Array<() => Promise<TestResult>>;
}

class TestingFramework {
  private results: TestResult[] = [];
  private suites: TestSuite[] = [];

  // Register test suite
  registerSuite(suite: TestSuite) {
    this.suites.push(suite);
  }

  // Run all test suites
  async runAllSuites(): Promise<TestResult[]> {
    console.log('🧪 Running comprehensive test suite...');
    this.results = [];

    for (const suite of this.suites) {
      console.group(`📋 Test Suite: ${suite.name}`);
      
      for (const test of suite.tests) {
        try {
          const result = await test();
          this.results.push(result);
          
          const emoji = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
          console.log(`${emoji} ${result.name}: ${result.message} (${result.duration}ms)`);
        } catch (error) {
          const failResult: TestResult = {
            name: 'Unknown Test',
            status: 'fail',
            message: `Test threw error: ${error.message}`,
            duration: 0
          };
          this.results.push(failResult);
          console.error('❌ Test Error:', error);
        }
      }
      
      console.groupEnd();
    }

    this.printSummary();
    return this.results;
  }

  private printSummary() {
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    const total = this.results.length;

    console.log('\n📊 Test Summary:');
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${failed}/${total}`);
    console.log(`⚠️ Warnings: ${warnings}/${total}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => r.status === 'fail')
        .forEach(result => console.log(`  - ${result.name}: ${result.message}`));
    }
  }
}

// Create testing framework instance
export const testingFramework = new TestingFramework();

// Helper function to create a test
export const createTest = (
  name: string,
  testFn: () => Promise<boolean> | boolean,
  expectedMessage?: string
): (() => Promise<TestResult>) => {
  return async () => {
    const startTime = performance.now();
    
    try {
      const result = await testFn();
      const duration = performance.now() - startTime;
      
      return {
        name,
        status: result ? 'pass' : 'fail',
        message: result ? (expectedMessage || 'Test passed') : 'Test failed',
        duration
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        name,
        status: 'fail',
        message: `Error: ${error.message}`,
        duration
      };
    }
  };
};

// API Testing Suite
const apiTestSuite: TestSuite = {
  name: 'API Connectivity',
  tests: [
    createTest('Health Check', async () => {
      const { api } = await import('./api');
      const health = await api.healthCheck();
      return health && (health.status === 'healthy' || health.environment === 'local-fallback');
    }, 'API health check successful'),

    createTest('Client API', async () => {
      const { api } = await import('./api');
      const clients = await api.getClients();
      return Array.isArray(clients);
    }, 'Client API returns array'),

    createTest('Jobs API', async () => {
      const { api } = await import('./api');
      const jobs = await api.getJobs();
      return Array.isArray(jobs);
    }, 'Jobs API returns array'),
  ]
};

// Navigation Testing Suite
const navigationTestSuite: TestSuite = {
  name: 'Navigation System',
  tests: [
    createTest('Store Initialization', () => {
      const store = useAppStore.getState();
      return store.navigation.screen === 'dashboard';
    }, 'App store initialized with dashboard'),

    createTest('Navigation Function', () => {
      const navigate = useAppStore.getState().navigate;
      navigate('clients');
      const newState = useAppStore.getState();
      return newState.navigation.screen === 'clients';
    }, 'Navigation changes screen correctly'),

    createTest('Back Navigation', () => {
      const goBack = useAppStore.getState().goBack;
      goBack();
      const newState = useAppStore.getState();
      return newState.navigation.screen === 'dashboard';
    }, 'Back navigation works correctly'),
  ]
};

// Local Storage Testing Suite
const storageTestSuite: TestSuite = {
  name: 'Data Storage',
  tests: [
    createTest('Local Storage Access', () => {
      const testKey = 'test-key';
      const testValue = 'test-value';
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      return retrieved === testValue;
    }, 'Local storage read/write works'),

    createTest('App Data Structure', () => {
      const data = localStorage.getItem('trades-app-data');
      if (!data) return true; // No data is ok
      try {
        const parsed = JSON.parse(data);
        return typeof parsed === 'object';
      } catch {
        return false;
      }
    }, 'App data is valid JSON'),
  ]
};

// Performance Testing Suite
const performanceTestSuite: TestSuite = {
  name: 'Performance',
  tests: [
    createTest('Memory Usage', () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usagePercent = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;
        return usagePercent < 80; // Less than 80% memory usage
      }
      return true; // Skip if not available
    }, 'Memory usage is acceptable'),

    createTest('DOM Size', () => {
      const nodeCount = document.getElementsByTagName('*').length;
      return nodeCount < 1000; // Reasonable DOM size
    }, 'DOM size is manageable'),
  ]
};

// Feature Testing Suite
const featureTestSuite: TestSuite = {
  name: 'Core Features',
  tests: [
    createTest('Error Tracking Available', () => {
      return typeof (window as any).errorTracker !== 'undefined';
    }, 'Error tracking system is available'),

    createTest('Performance Monitor Available', () => {
      return typeof (window as any).performanceMonitor !== 'undefined';
    }, 'Performance monitor is available'),

    createTest('Notification System', async () => {
      // Test if notification functions exist
      const { initializeOverdueNotifications } = await import('./overdue-notification-service');
      return typeof initializeOverdueNotifications === 'function';
    }, 'Notification system is available'),
  ]
};

// Register all test suites
testingFramework.registerSuite(apiTestSuite);
testingFramework.registerSuite(navigationTestSuite);
testingFramework.registerSuite(storageTestSuite);
testingFramework.registerSuite(performanceTestSuite);
testingFramework.registerSuite(featureTestSuite);

// Development testing utilities
export const devTestUtils = {
  // Quick test runner
  runQuickTest: async () => {
    console.log('🚀 Running quick test...');
    const results = await testingFramework.runAllSuites();
    const failed = results.filter(r => r.status === 'fail').length;
    
    if (failed === 0) {
      console.log('🎉 All tests passed!');
    } else {
      console.warn(`⚠️ ${failed} tests failed`);
    }
    
    return results;
  },

  // Create test data
  createTestData: () => {
    console.log('📊 Creating test data...');
    
    const testClient = {
      id: `test-client-${Date.now()}`,
      name: 'Test Client Ltd',
      email: 'test@example.com',
      phone: '+44 7700 900123',
      address: '123 Test Street, London, SW1A 1AA',
      createdAt: new Date().toISOString()
    };

    const data = JSON.parse(localStorage.getItem('trades-app-data') || '{}');
    if (!data.clients) data.clients = [];
    data.clients.push(testClient);
    localStorage.setItem('trades-app-data', JSON.stringify(data));
    
    console.log('✅ Test client created:', testClient);
    return testClient;
  },

  // Clean test data
  cleanTestData: () => {
    console.log('🗑️ Cleaning test data...');
    
    const data = JSON.parse(localStorage.getItem('trades-app-data') || '{}');
    let cleaned = 0;
    
    if (data.clients) {
      const before = data.clients.length;
      data.clients = data.clients.filter((c: any) => !c.name.includes('Test'));
      cleaned += before - data.clients.length;
    }
    
    if (data.jobs) {
      const before = data.jobs.length;
      data.jobs = data.jobs.filter((j: any) => !j.title?.includes('Test'));
      cleaned += before - data.jobs.length;
    }
    
    localStorage.setItem('trades-app-data', JSON.stringify(data));
    console.log(`✅ Cleaned ${cleaned} test records`);
    return cleaned;
  },

  // Test navigation flow
  testNavigationFlow: async () => {
    console.log('🧭 Testing navigation flow...');
    const navigate = useAppStore.getState().navigate;
    
    const screens = ['clients', 'calendar', 'settings', 'dashboard'];
    
    for (const screen of screens) {
      navigate(screen as any);
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log(`✅ Navigated to ${screen}`);
    }
    
    console.log('🎉 Navigation flow test complete!');
  }
};

// Expose testing framework in development
if (process.env.NODE_ENV === 'development') {
  (window as any).testingFramework = testingFramework;
  (window as any).devTestUtils = devTestUtils;
  console.log('🧪 Testing framework available at window.testingFramework');
  console.log('🛠️ Dev test utils available at window.devTestUtils');
}

// testingFramework is already exported above, removing duplicate export