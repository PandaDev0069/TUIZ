/**
 * Memory Usage Monitor - Part of Day 2: Memory Leak Prevention
 * Provides utilities to monitor and track memory usage for debugging memory leaks
 */

class MemoryMonitor {
  constructor(options = {}) {
    this.enabled = options.enabled !== false; // Default to enabled
    this.logInterval = options.logInterval || 30000; // 30 seconds
    this.component = options.component || 'global';
    this.memoryHistory = [];
    this.maxHistorySize = options.maxHistorySize || 100;
    this.intervalId = null;
    this.listeners = new Set();
    
    if (this.enabled && typeof window !== 'undefined' && window.performance?.memory) {
      this.startMonitoring();
    }
  }

  startMonitoring() {
    if (this.intervalId) return;
    
    this.intervalId = setInterval(() => {
      this.recordMemoryUsage();
    }, this.logInterval);
    
    console.log(`[MemoryMonitor] Started monitoring for ${this.component}`);
  }

  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log(`[MemoryMonitor] Stopped monitoring for ${this.component}`);
    }
  }

  recordMemoryUsage() {
    if (!window.performance?.memory) return null;

    const memory = window.performance.memory;
    const usage = {
      timestamp: Date.now(),
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      component: this.component
    };

    // Add to history
    this.memoryHistory.push(usage);
    
    // Limit history size
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift();
    }

    // Notify listeners
    this.listeners.forEach(callback => callback(usage));

    // Check for potential memory leaks
    this.checkForMemoryLeaks(usage);

    return usage;
  }

  checkForMemoryLeaks(currentUsage) {
    if (this.memoryHistory.length < 10) return; // Need enough data

    const recent = this.memoryHistory.slice(-10);
    const growth = recent[recent.length - 1].usedJSHeapSize - recent[0].usedJSHeapSize;
    const growthMB = growth / (1024 * 1024);

    // Alert if memory grew by more than 10MB in the last 10 samples
    if (growthMB > 10) {
      console.warn(`[MemoryMonitor] Potential memory leak detected in ${this.component}:`, {
        growthMB: growthMB.toFixed(2),
        currentUsageMB: (currentUsage.usedJSHeapSize / (1024 * 1024)).toFixed(2),
        timeSpan: (currentUsage.timestamp - recent[0].timestamp) / 1000 + 's'
      });
    }
  }

  getMemorySnapshot() {
    if (!window.performance?.memory) {
      return { error: 'Memory API not available' };
    }

    const memory = window.performance.memory;
    return {
      timestamp: Date.now(),
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usedMB: (memory.usedJSHeapSize / (1024 * 1024)).toFixed(2),
      totalMB: (memory.totalJSHeapSize / (1024 * 1024)).toFixed(2),
      limitMB: (memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(2)
    };
  }

  getMemoryHistory() {
    return [...this.memoryHistory];
  }

  getMemoryTrend() {
    if (this.memoryHistory.length < 2) return null;

    const first = this.memoryHistory[0];
    const last = this.memoryHistory[this.memoryHistory.length - 1];
    const growth = last.usedJSHeapSize - first.usedJSHeapSize;
    const timeSpan = last.timestamp - first.timestamp;
    const growthRate = growth / timeSpan; // bytes per ms

    return {
      totalGrowthMB: (growth / (1024 * 1024)).toFixed(2),
      timeSpanMinutes: (timeSpan / (1000 * 60)).toFixed(2),
      growthRateMBPerMinute: ((growthRate * 1000 * 60) / (1024 * 1024)).toFixed(3),
      samples: this.memoryHistory.length
    };
  }

  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  clear() {
    this.memoryHistory = [];
  }

  destroy() {
    this.stopMonitoring();
    this.listeners.clear();
    this.memoryHistory = [];
  }
}

// React Hook for component-level memory monitoring
export const useMemoryMonitor = (componentName, options = {}) => {
  const [memoryMonitor] = useState(() => 
    new MemoryMonitor({ 
      ...options, 
      component: componentName,
      logInterval: options.logInterval || 10000 // More frequent for components
    })
  );

  useEffect(() => {
    return () => {
      memoryMonitor.destroy();
    };
  }, [memoryMonitor]);

  const getSnapshot = () => memoryMonitor.getMemorySnapshot();
  const getHistory = () => memoryMonitor.getMemoryHistory();
  const getTrend = () => memoryMonitor.getMemoryTrend();

  return {
    getSnapshot,
    getHistory,
    getTrend,
    monitor: memoryMonitor
  };
};

// Global memory monitor instance
const globalMemoryMonitor = new MemoryMonitor({ 
  component: 'TUIZ-Global',
  logInterval: 60000 // Check every minute globally
});

// Development utilities
export const memoryUtils = {
  // Force garbage collection (Chrome only, requires --enable-precise-memory-info)
  forceGC: () => {
    if (window.gc) {
      window.gc();
      console.log('[MemoryMonitor] Forced garbage collection');
    } else {
      console.warn('[MemoryMonitor] GC not available. Start Chrome with --enable-precise-memory-info');
    }
  },

  // Get detailed memory info
  getDetailedMemoryInfo: () => {
    const snapshot = globalMemoryMonitor.getMemorySnapshot();
    const trend = globalMemoryMonitor.getMemoryTrend();
    
    return {
      current: snapshot,
      trend,
      history: globalMemoryMonitor.getMemoryHistory(),
      timers: window.timerManager?.getStatus() || { error: 'TimerManager not available' }
    };
  },

  // Log memory info to console
  logMemoryInfo: () => {
    const info = memoryUtils.getDetailedMemoryInfo();
    console.group('[MemoryMonitor] Current Status');
    console.log('Memory Usage:', info.current);
    console.log('Memory Trend:', info.trend);
    console.log('Active Timers:', info.timers);
    console.groupEnd();
  },

  // Create a memory leak detector for specific operations
  createLeakDetector: (operationName) => {
    const baseline = globalMemoryMonitor.getMemorySnapshot();
    
    return {
      check: () => {
        const current = globalMemoryMonitor.getMemorySnapshot();
        const growth = current.usedJSHeapSize - baseline.usedJSHeapSize;
        const growthMB = (growth / (1024 * 1024)).toFixed(2);
        
        console.log(`[LeakDetector] ${operationName} memory change: ${growthMB}MB`);
        
        if (Math.abs(growth) > 5 * 1024 * 1024) { // 5MB threshold
          console.warn(`[LeakDetector] Significant memory change detected for ${operationName}`);
        }
        
        return { baseline, current, growthMB };
      }
    };
  }
};

// Expose global utilities in development
if (process.env.NODE_ENV === 'development') {
  window.memoryUtils = memoryUtils;
  window.globalMemoryMonitor = globalMemoryMonitor;
}

export default MemoryMonitor;
export { globalMemoryMonitor };
