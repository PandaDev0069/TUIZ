import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { 
  FaMobile, 
  FaTabletAlt, 
  FaLaptop, 
  FaTv,
  FaExpand,
  FaCompress,
  FaHandPointer,
  FaBatteryFull,
  FaWifi,
  FaSync
} from 'react-icons/fa';
import './MobileOptimization.css';

/**
 * MobileOptimization - Advanced Mobile Experience Framework
 * Phase 5: Enhanced UX & Polish Implementation
 * 
 * Features:
 * - Touch gesture recognition and handling
 * - Responsive layout adaptations with breakpoint detection
 * - Device orientation management
 * - Battery and network optimization
 * - Accessibility enhancements for mobile
 * - Performance monitoring for mobile devices
 * - Pull-to-refresh functionality
 * - Bottom sheet controls
 * - Floating action buttons
 * - Optimized information density
 */

// Device detection utilities
const detectDevice = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  const screen = window.screen;
  
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(ip|ap|wp))))/.test(userAgent);
  const isDesktop = !isMobile && !isTablet;
  
  const devicePixelRatio = window.devicePixelRatio || 1;
  const screenWidth = screen.width * devicePixelRatio;
  const screenHeight = screen.height * devicePixelRatio;
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    devicePixelRatio,
    screenWidth,
    screenHeight,
    touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    standalone: window.matchMedia('(display-mode: standalone)').matches
  };
};

// Network and battery detection
const getConnectionInfo = () => {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  
  return {
    effectiveType: connection?.effectiveType || 'unknown',
    downlink: connection?.downlink || 0,
    rtt: connection?.rtt || 0,
    saveData: connection?.saveData || false
  };
};

const getBatteryInfo = async () => {
  try {
    if ('getBattery' in navigator) {
      const battery = await navigator.getBattery();
      return {
        level: battery.level,
        charging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime
      };
    }
  } catch (error) {
    console.warn('Battery API not available:', error);
  }
  
  return null;
};

// Mobile Optimization Provider
export function MobileOptimizationProvider({ children }) {
  const [deviceInfo, setDeviceInfo] = useState(detectDevice());
  const [orientation, setOrientation] = useState(screen.orientation?.type || 'portrait-primary');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState(getConnectionInfo());
  const [batteryInfo, setBatteryInfo] = useState(null);
  const [performanceMode, setPerformanceMode] = useState('balanced');
  
  // Update device info on resize
  useEffect(() => {
    const handleResize = () => {
      setDeviceInfo(detectDevice());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Monitor orientation changes
  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(screen.orientation?.type || 'portrait-primary');
    };
    
    if (screen.orientation) {
      screen.orientation.addEventListener('change', handleOrientationChange);
      return () => screen.orientation.removeEventListener('change', handleOrientationChange);
    }
  }, []);
  
  // Monitor fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  // Monitor network changes
  useEffect(() => {
    const handleConnectionChange = () => {
      setConnectionInfo(getConnectionInfo());
    };
    
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
      return () => connection.removeEventListener('change', handleConnectionChange);
    }
  }, []);
  
  // Get battery info
  useEffect(() => {
    getBatteryInfo().then(setBatteryInfo);
  }, []);
  
  // Auto-adjust performance mode based on device capabilities
  useEffect(() => {
    const { isMobile, devicePixelRatio } = deviceInfo;
    const { effectiveType, saveData } = connectionInfo;
    const lowBattery = batteryInfo && !batteryInfo.charging && batteryInfo.level < 0.2;
    
    if (saveData || lowBattery || effectiveType === 'slow-2g' || effectiveType === '2g') {
      setPerformanceMode('battery');
    } else if (isMobile && devicePixelRatio > 2) {
      setPerformanceMode('balanced');
    } else {
      setPerformanceMode('performance');
    }
  }, [deviceInfo, connectionInfo, batteryInfo]);
  
  const contextValue = {
    deviceInfo,
    orientation,
    isFullscreen,
    connectionInfo,
    batteryInfo,
    performanceMode,
    setPerformanceMode
  };
  
  return (
    <div className={`mobile-optimization-provider mobile-optimization--${performanceMode}`}>
      {children}
    </div>
  );
}

MobileOptimizationProvider.propTypes = {
  children: PropTypes.node.isRequired
};

// Touch Gesture Handler Component
export function TouchGestureHandler({ 
  children, 
  onSwipeLeft, 
  onSwipeRight, 
  onSwipeUp, 
  onSwipeDown,
  onPinch,
  onDoubleTap,
  onLongPress,
  swipeThreshold = 50,
  pinchThreshold = 0.1,
  longPressDelay = 500,
  disabled = false
}) {
  const elementRef = useRef(null);
  const touchStartRef = useRef(null);
  const touchDataRef = useRef({
    startX: 0,
    startY: 0,
    startDistance: 0,
    startScale: 1,
    isLongPress: false,
    longPressTimer: null,
    lastTap: 0
  });
  
  const resetTouchData = useCallback(() => {
    const data = touchDataRef.current;
    if (data.longPressTimer) {
      clearTimeout(data.longPressTimer);
      data.longPressTimer = null;
    }
    data.isLongPress = false;
  }, []);
  
  const handleTouchStart = useCallback((e) => {
    if (disabled) return;
    
    const touch = e.touches[0];
    const data = touchDataRef.current;
    
    data.startX = touch.clientX;
    data.startY = touch.clientY;
    
    if (e.touches.length === 2) {
      const touch2 = e.touches[1];
      data.startDistance = Math.hypot(
        touch2.clientX - touch.clientX,
        touch2.clientY - touch.clientY
      );
      data.startScale = 1;
    }
    
    // Handle double tap
    const now = Date.now();
    if (now - data.lastTap < 300) {
      onDoubleTap?.();
      data.lastTap = 0;
    } else {
      data.lastTap = now;
    }
    
    // Handle long press
    if (onLongPress) {
      data.longPressTimer = setTimeout(() => {
        data.isLongPress = true;
        onLongPress();
      }, longPressDelay);
    }
  }, [disabled, onDoubleTap, onLongPress, longPressDelay]);
  
  const handleTouchMove = useCallback((e) => {
    if (disabled) return;
    
    const data = touchDataRef.current;
    
    // Clear long press if touch moves
    if (data.longPressTimer) {
      clearTimeout(data.longPressTimer);
      data.longPressTimer = null;
    }
    
    if (e.touches.length === 2 && onPinch) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      const scale = currentDistance / data.startDistance;
      const scaleChange = scale - data.startScale;
      
      if (Math.abs(scaleChange) > pinchThreshold) {
        onPinch(scale, scaleChange);
        data.startScale = scale;
      }
    }
  }, [disabled, onPinch, pinchThreshold]);
  
  const handleTouchEnd = useCallback((e) => {
    if (disabled) return;
    
    const data = touchDataRef.current;
    resetTouchData();
    
    if (data.isLongPress || e.touches.length > 0) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - data.startX;
    const deltaY = touch.clientY - data.startY;
    
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    
    // Determine swipe direction
    if (Math.max(absDeltaX, absDeltaY) > swipeThreshold) {
      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          onSwipeDown?.();
        } else {
          onSwipeUp?.();
        }
      }
    }
  }, [disabled, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, swipeThreshold, resetTouchData]);
  
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
  
  return (
    <div ref={elementRef} className="touch-gesture-handler">
      {children}
    </div>
  );
}

TouchGestureHandler.propTypes = {
  children: PropTypes.node.isRequired,
  onSwipeLeft: PropTypes.func,
  onSwipeRight: PropTypes.func,
  onSwipeUp: PropTypes.func,
  onSwipeDown: PropTypes.func,
  onPinch: PropTypes.func,
  onDoubleTap: PropTypes.func,
  onLongPress: PropTypes.func,
  swipeThreshold: PropTypes.number,
  pinchThreshold: PropTypes.number,
  longPressDelay: PropTypes.number,
  disabled: PropTypes.bool
};

// Pull to Refresh Component
export function PullToRefresh({ 
  children, 
  onRefresh, 
  refreshThreshold = 60,
  maxPullDistance = 120,
  disabled = false 
}) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef(null);
  const startY = useRef(0);
  
  const handleTouchStart = useCallback((e) => {
    if (disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (container && container.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, [disabled, isRefreshing]);
  
  const handleTouchMove = useCallback((e) => {
    if (disabled || isRefreshing || !isPulling) return;
    
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY.current);
    const pullDistance = Math.min(distance * 0.5, maxPullDistance);
    
    setPullDistance(pullDistance);
    
    if (distance > 10) {
      e.preventDefault();
    }
  }, [disabled, isRefreshing, isPulling, maxPullDistance]);
  
  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing || !isPulling) return;
    
    setIsPulling(false);
    
    if (pullDistance >= refreshThreshold) {
      setIsRefreshing(true);
      try {
        await onRefresh?.();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
  }, [disabled, isRefreshing, isPulling, pullDistance, refreshThreshold, onRefresh]);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
  
  const refreshProgress = Math.min(pullDistance / refreshThreshold, 1);
  const shouldTriggerRefresh = pullDistance >= refreshThreshold;
  
  return (
    <div 
      ref={containerRef}
      className={`pull-to-refresh ${isPulling ? 'pull-to-refresh--pulling' : ''}`}
      style={{
        transform: `translateY(${pullDistance}px)`,
        transition: isPulling ? 'none' : 'transform 0.3s ease-out'
      }}
    >
      <div 
        className={`pull-refresh-indicator ${shouldTriggerRefresh ? 'pull-refresh-indicator--ready' : ''} ${isRefreshing ? 'pull-refresh-indicator--refreshing' : ''}`}
        style={{
          opacity: Math.max(0, Math.min(1, refreshProgress)),
          transform: `scale(${0.8 + (refreshProgress * 0.2)})`
        }}
      >
        <div className="refresh-icon">
          <FaSync className={isRefreshing ? 'refresh-icon--spinning' : ''} />
        </div>
        <div className="refresh-text">
          {isRefreshing ? 'Refreshing...' : shouldTriggerRefresh ? 'Release to refresh' : 'Pull to refresh'}
        </div>
      </div>
      {children}
    </div>
  );
}

PullToRefresh.propTypes = {
  children: PropTypes.node.isRequired,
  onRefresh: PropTypes.func,
  refreshThreshold: PropTypes.number,
  maxPullDistance: PropTypes.number,
  disabled: PropTypes.bool
};

// Bottom Sheet Component
export function BottomSheet({ 
  isOpen, 
  onClose, 
  children, 
  snapPoints = [0.3, 0.6, 0.9],
  initialSnap = 0.6,
  backdrop = true 
}) {
  const [currentSnap, setCurrentSnap] = useState(initialSnap);
  const [isDragging, setIsDragging] = useState(false);
  const sheetRef = useRef(null);
  const startY = useRef(0);
  const startSnap = useRef(0);
  
  const getClosestSnapPoint = useCallback((position) => {
    const windowHeight = window.innerHeight;
    const relativePosition = 1 - (position / windowHeight);
    
    return snapPoints.reduce((closest, point) => {
      return Math.abs(point - relativePosition) < Math.abs(closest - relativePosition) ? point : closest;
    });
  }, [snapPoints]);
  
  const handleTouchStart = useCallback((e) => {
    setIsDragging(true);
    startY.current = e.touches[0].clientY;
    startSnap.current = currentSnap;
  }, [currentSnap]);
  
  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY.current;
    const windowHeight = window.innerHeight;
    const deltaSnap = deltaY / windowHeight;
    
    const newSnap = Math.max(0, Math.min(1, startSnap.current - deltaSnap));
    setCurrentSnap(newSnap);
  }, [isDragging]);
  
  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    const windowHeight = window.innerHeight;
    const position = windowHeight * (1 - currentSnap);
    const closestSnap = getClosestSnapPoint(position);
    
    if (closestSnap === 0) {
      onClose?.();
    } else {
      setCurrentSnap(closestSnap);
    }
  }, [isDragging, currentSnap, getClosestSnapPoint, onClose]);
  
  useEffect(() => {
    if (isOpen) {
      setCurrentSnap(initialSnap);
    }
  }, [isOpen, initialSnap]);
  
  if (!isOpen) return null;
  
  return (
    <div className="bottom-sheet-overlay">
      {backdrop && (
        <div 
          className="bottom-sheet-backdrop" 
          onClick={onClose}
        />
      )}
      
      <div
        ref={sheetRef}
        className={`bottom-sheet ${isDragging ? 'bottom-sheet--dragging' : ''}`}
        style={{
          transform: `translateY(${(1 - currentSnap) * 100}%)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="bottom-sheet-handle">
          <div className="sheet-handle-bar"></div>
        </div>
        
        <div className="bottom-sheet-content">
          {children}
        </div>
      </div>
    </div>
  );
}

BottomSheet.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  children: PropTypes.node.isRequired,
  snapPoints: PropTypes.arrayOf(PropTypes.number),
  initialSnap: PropTypes.number,
  backdrop: PropTypes.bool
};

// Floating Action Button Component
export function FloatingActionButton({ 
  icon, 
  onClick, 
  position = 'bottom-right',
  size = 'medium',
  color = 'primary',
  disabled = false,
  tooltip 
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const sizeClasses = {
    small: 'fab--small',
    medium: 'fab--medium',
    large: 'fab--large'
  };
  
  const colorClasses = {
    primary: 'fab--primary',
    secondary: 'fab--secondary',
    success: 'fab--success',
    warning: 'fab--warning',
    danger: 'fab--danger'
  };
  
  const positionClasses = {
    'top-left': 'fab--top-left',
    'top-right': 'fab--top-right',
    'bottom-left': 'fab--bottom-left',
    'bottom-right': 'fab--bottom-right'
  };
  
  return (
    <div className="fab-container">
      <button
        className={`fab ${sizeClasses[size]} ${colorClasses[color]} ${positionClasses[position]} ${disabled ? 'fab--disabled' : ''}`}
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-label={tooltip}
      >
        {icon}
        
        {tooltip && showTooltip && (
          <div className="fab-tooltip">
            {tooltip}
          </div>
        )}
      </button>
    </div>
  );
}

FloatingActionButton.propTypes = {
  icon: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired,
  position: PropTypes.oneOf(['top-left', 'top-right', 'bottom-left', 'bottom-right']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  color: PropTypes.oneOf(['primary', 'secondary', 'success', 'warning', 'danger']),
  disabled: PropTypes.bool,
  tooltip: PropTypes.string
};

// Device Info Display Component (for development)
export function DeviceInfoDisplay() {
  const [deviceInfo, setDeviceInfo] = useState(detectDevice());
  const [connectionInfo, setConnectionInfo] = useState(getConnectionInfo());
  const [batteryInfo, setBatteryInfo] = useState(null);
  
  useEffect(() => {
    const updateInfo = () => {
      setDeviceInfo(detectDevice());
      setConnectionInfo(getConnectionInfo());
    };
    
    window.addEventListener('resize', updateInfo);
    
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      connection.addEventListener('change', updateInfo);
    }
    
    getBatteryInfo().then(setBatteryInfo);
    
    return () => {
      window.removeEventListener('resize', updateInfo);
      if (connection) {
        connection.removeEventListener('change', updateInfo);
      }
    };
  }, []);
  
  // Only show in development mode
  if (import.meta.env.PROD) return null;
  
  return (
    <div className="device-info-display">
      <h4>Device Info</h4>
      <div className="device-info-grid">
        <div className="info-item">
          <span className="info-label">Device:</span>
          <span className="info-value">
            {deviceInfo.isMobile ? <FaMobile /> : deviceInfo.isTablet ? <FaTabletAlt /> : <FaLaptop />}
            {deviceInfo.isMobile ? 'Mobile' : deviceInfo.isTablet ? 'Tablet' : 'Desktop'}
          </span>
        </div>
        
        <div className="info-item">
          <span className="info-label">Touch:</span>
          <span className="info-value">
            <FaHandPointer />
            {deviceInfo.touchSupport ? 'Supported' : 'Not supported'}
          </span>
        </div>
        
        <div className="info-item">
          <span className="info-label">Connection:</span>
          <span className="info-value">
            <FaWifi />
            {connectionInfo.effectiveType}
          </span>
        </div>
        
        {batteryInfo && (
          <div className="info-item">
            <span className="info-label">Battery:</span>
            <span className="info-value">
              <FaBatteryFull />
              {Math.round(batteryInfo.level * 100)}%
              {batteryInfo.charging ? ' (Charging)' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default MobileOptimization;
