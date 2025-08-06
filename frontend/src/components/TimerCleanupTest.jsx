/**
 * Timer Cleanup Integration Test
 * Tests the TimerManager and memory leak prevention systems
 */

import React, { useState, useEffect } from 'react';
import { useManagedTimeout, useManagedInterval, useTimerManager } from '../utils/timerManager';
import { useMemoryMonitor } from '../utils/memoryMonitor';
import './timerCleanupTest.css';

const TimerCleanupTest = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [componentCount, setComponentCount] = useState(0);
  const memoryMonitor = useMemoryMonitor('TimerCleanupTest');

  const runMemoryLeakTest = async () => {
    setIsRunning(true);
    setTestResults([]);

    const results = [];
    const testStartMemory = memoryMonitor.getSnapshot();

    // Test 1: Component mounting/unmounting with timers
    results.push('🧪 Test 1: Component lifecycle timer cleanup...');
    setTestResults([...results]);
    
    for (let i = 0; i < 10; i++) {
      setComponentCount(i + 1);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setComponentCount(0); // Unmount all components
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const test1Memory = memoryMonitor.getSnapshot();
    results.push(`✅ Test 1 complete. Memory change: ${(test1Memory.usedJSHeapSize - testStartMemory.usedJSHeapSize) / 1024} KB`);
    setTestResults([...results]);

    // Test 2: Timer creation and cleanup stress test
    results.push('🧪 Test 2: Timer stress test...');
    setTestResults([...results]);

    const timerManager = window.timerManager;
    const initialTimerCount = timerManager.getStatus().activeCount;

    // Create many timers
    const timers = [];
    for (let i = 0; i < 100; i++) {
      const timeoutId = timerManager.setTimeout(() => {}, 10000);
      const intervalId = timerManager.setInterval(() => {}, 1000);
      timers.push(timeoutId, intervalId);
    }

    const peakTimerCount = timerManager.getStatus().activeCount;
    results.push(`📊 Created ${peakTimerCount - initialTimerCount} timers`);
    setTestResults([...results]);

    // Clear all timers
    timers.forEach(id => {
      timerManager.clearTimeout(id);
      timerManager.clearInterval(id);
    });

    await new Promise(resolve => setTimeout(resolve, 100));
    const finalTimerCount = timerManager.getStatus().activeCount;
    
    const test2Memory = memoryMonitor.getSnapshot();
    results.push(`✅ Test 2 complete. Final timer count: ${finalTimerCount}. Memory change: ${(test2Memory.usedJSHeapSize - test1Memory.usedJSHeapSize) / 1024} KB`);
    setTestResults([...results]);

    // Test 3: Memory trend analysis
    results.push('🧪 Test 3: Memory trend analysis...');
    setTestResults([...results]);

    const memoryTrend = memoryMonitor.getTrend();
    if (memoryTrend) {
      results.push(`📈 Memory trend: ${memoryTrend.growthRateMBPerMinute} MB/min over ${memoryTrend.timeSpanMinutes} minutes`);
    } else {
      results.push('📈 Insufficient data for trend analysis');
    }

    const finalMemory = memoryMonitor.getSnapshot();
    const totalMemoryChange = (finalMemory.usedJSHeapSize - testStartMemory.usedJSHeapSize) / (1024 * 1024);
    
    results.push(`🏁 Test complete. Total memory change: ${totalMemoryChange.toFixed(2)} MB`);
    
    if (Math.abs(totalMemoryChange) < 1) {
      results.push('✅ PASS: Memory usage remained stable');
    } else {
      results.push('⚠️ WARNING: Significant memory change detected');
    }

    setTestResults(results);
    setIsRunning(false);
  };

  return (
    <div className="timer-cleanup-test">
      <div className="test-header">
        <h2>🧪 Timer Cleanup & Memory Leak Test</h2>
        <p>Tests the TimerManager system for memory leaks and proper cleanup</p>
      </div>

      <div className="test-controls">
        <button 
          onClick={runMemoryLeakTest} 
          disabled={isRunning}
          className="test-button"
        >
          {isRunning ? 'Running Tests...' : 'Run Memory Leak Test'}
        </button>
        
        <button 
          onClick={() => window.memoryUtils?.logMemoryInfo()}
          className="debug-button"
        >
          Log Memory Info
        </button>
      </div>

      <div className="test-components">
        <h3>Test Components ({componentCount})</h3>
        <div className="component-grid">
          {Array.from({ length: componentCount }, (_, i) => (
            <TestComponent key={i} id={i} />
          ))}
        </div>
      </div>

      <div className="test-results">
        <h3>Test Results</h3>
        <div className="results-list">
          {testResults.map((result, index) => (
            <div key={index} className="result-item">
              {result}
            </div>
          ))}
        </div>
      </div>

      <div className="memory-info">
        <h3>Live Memory Info</h3>
        <MemoryDisplay monitor={memoryMonitor} />
      </div>
    </div>
  );
};

// Test component that creates and cleans up timers
const TestComponent = ({ id }) => {
  const managedTimeout = useManagedTimeout();
  const managedInterval = useManagedInterval();
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Create some timers that should be cleaned up on unmount
    managedTimeout.setTimeout(() => {
      console.log(`TestComponent ${id}: timeout executed`);
    }, Math.random() * 5000);

    managedInterval.setInterval(() => {
      setCount(prev => prev + 1);
    }, 1000);

    return () => {
      console.log(`TestComponent ${id}: unmounting`);
    };
  }, [id, managedTimeout, managedInterval]);

  return (
    <div className="test-component">
      <div>Component {id}</div>
      <div>Count: {count}</div>
    </div>
  );
};

// Live memory display component
const MemoryDisplay = ({ monitor }) => {
  const [memoryInfo, setMemoryInfo] = useState(null);

  useEffect(() => {
    const updateMemory = () => {
      setMemoryInfo(monitor.getSnapshot());
    };

    updateMemory();
    const interval = setInterval(updateMemory, 2000);

    return () => clearInterval(interval);
  }, [monitor]);

  if (!memoryInfo || memoryInfo.error) {
    return <div>Memory API not available</div>;
  }

  return (
    <div className="memory-display">
      <div>Used: {memoryInfo.usedMB} MB</div>
      <div>Total: {memoryInfo.totalMB} MB</div>
      <div>Limit: {memoryInfo.limitMB} MB</div>
      <div>Usage: {((memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100).toFixed(1)}%</div>
    </div>
  );
};

export default TimerCleanupTest;
