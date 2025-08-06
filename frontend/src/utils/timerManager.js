/**
 * Timer Management Utility
 * Centralized timer management to prevent memory leaks
 */

import { useState, useEffect, useRef } from 'react';

class TimerManager {
  constructor() {
    this.timers = new Map();
    this.intervals = new Map();
    this.nextId = 1;
  }

  /**
   * Create a managed setTimeout with automatic cleanup tracking
   */
  setTimeout(callback, delay, name = null) {
    const id = this.nextId++;
    const timerId = setTimeout(() => {
      // Execute callback
      try {
        callback();
      } catch (error) {
        console.error(`Timer callback error (${name || id}):`, error);
      }
      // Auto-cleanup after execution
      this.timers.delete(id);
    }, delay);

    this.timers.set(id, {
      timerId,
      type: 'timeout',
      name: name || `timeout_${id}`,
      created: Date.now(),
      delay
    });

    return id;
  }

  /**
   * Create a managed setInterval with automatic cleanup tracking
   */
  setInterval(callback, interval, name = null) {
    const id = this.nextId++;
    const timerId = setInterval(() => {
      try {
        callback();
      } catch (error) {
        console.error(`Interval callback error (${name || id}):`, error);
      }
    }, interval);

    this.intervals.set(id, {
      timerId,
      type: 'interval',
      name: name || `interval_${id}`,
      created: Date.now(),
      interval
    });

    return id;
  }

  /**
   * Clear a specific managed timer
   */
  clearTimeout(id) {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer.timerId);
      this.timers.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Clear a specific managed interval
   */
  clearInterval(id) {
    const interval = this.intervals.get(id);
    if (interval) {
      clearInterval(interval.timerId);
      this.intervals.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Clear all managed timers and intervals
   */
  clearAll() {
    // Clear all timeouts
    for (const [id, timer] of this.timers.entries()) {
      clearTimeout(timer.timerId);
    }
    this.timers.clear();

    // Clear all intervals
    for (const [id, interval] of this.intervals.entries()) {
      clearInterval(interval.timerId);
    }
    this.intervals.clear();

    console.log('🧹 TimerManager: Cleared all timers and intervals');
  }

  /**
   * Get current timer and interval counts for debugging
   */
  getStatus() {
    return {
      timeouts: this.timers.size,
      intervals: this.intervals.size,
      total: this.timers.size + this.intervals.size,
      activeTimers: Array.from(this.timers.values()).map(t => ({
        name: t.name,
        age: Date.now() - t.created,
        delay: t.delay
      })),
      activeIntervals: Array.from(this.intervals.values()).map(i => ({
        name: i.name,
        age: Date.now() - i.created,
        interval: i.interval
      }))
    };
  }

  /**
   * Debug: Print current status
   */
  debug() {
    const status = this.getStatus();
    console.log('🕒 TimerManager Status:', status);
    
    if (status.total > 10) {
      console.warn('⚠️ High timer count detected:', status.total);
    }
    
    return status;
  }

  /**
   * Find and clear old timers (useful for debugging leaks)
   */
  clearOldTimers(maxAge = 60000) { // 1 minute default
    const now = Date.now();
    let cleared = 0;

    // Clear old timeouts
    for (const [id, timer] of this.timers.entries()) {
      if (now - timer.created > maxAge) {
        clearTimeout(timer.timerId);
        this.timers.delete(id);
        cleared++;
        console.log(`🧹 Cleared old timeout: ${timer.name}`);
      }
    }

    // Clear old intervals
    for (const [id, interval] of this.intervals.entries()) {
      if (now - interval.created > maxAge) {
        clearInterval(interval.timerId);
        this.intervals.delete(id);
        cleared++;
        console.log(`🧹 Cleared old interval: ${interval.name}`);
      }
    }

    if (cleared > 0) {
      console.log(`🧹 TimerManager: Cleared ${cleared} old timers`);
    }

    return cleared;
  }
}

// Create singleton instance
const timerManager = new TimerManager();

/**
 * React hook for managing timers with automatic cleanup
 */
export const useTimerManager = () => {
  const [manager] = useState(() => new TimerManager());

  useEffect(() => {
    // Cleanup all timers when component unmounts
    return () => {
      manager.clearAll();
    };
  }, [manager]);

  return manager;
};

/**
 * React hook for a single managed timeout
 */
export const useManagedTimeout = (callback, delay, dependencies = []) => {
  const manager = useTimerManager();
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current !== null) {
      manager.clearTimeout(timeoutRef.current);
    }

    // Set new timeout if delay is provided
    if (delay !== null && callback) {
      timeoutRef.current = manager.setTimeout(callback, delay, 'useManagedTimeout');
    }

    // Cleanup on unmount or dependency change
    return () => {
      if (timeoutRef.current !== null) {
        manager.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [callback, delay, manager, ...dependencies]);

  return () => {
    if (timeoutRef.current !== null) {
      manager.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };
};

/**
 * React hook for a single managed interval
 */
export const useManagedInterval = (callback, interval, dependencies = []) => {
  const manager = useTimerManager();
  const intervalRef = useRef(null);

  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current !== null) {
      manager.clearInterval(intervalRef.current);
    }

    // Set new interval if interval is provided
    if (interval !== null && callback) {
      intervalRef.current = manager.setInterval(callback, interval, 'useManagedInterval');
    }

    // Cleanup on unmount or dependency change
    return () => {
      if (intervalRef.current !== null) {
        manager.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [callback, interval, manager, ...dependencies]);

  return () => {
    if (intervalRef.current !== null) {
      manager.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };
};

// Global timer manager for non-React usage
export { timerManager };
export default TimerManager;
