/**
 * Connection Status Component
 * 
 * Displays real-time socket connection status with reconnection indicators.
 * Can be placed in any component to show connection health.
 * Auto-hides after 2 seconds when connected.
 */

import React, { useState, useEffect } from 'react';
import { FiWifi, FiWifiOff, FiLoader, FiAlertCircle } from 'react-icons/fi';
import './connectionStatus.css';

const ConnectionStatus = ({ 
  compact = false, 
  showText = true, 
  className = '',
  position = 'top-right',
  autoHide = true,
  autoHideDelay = 2000,
  // Connection props passed from parent
  isConnected = true,
  connectionState = 'connected',
  reconnectAttempts = 0
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [shouldShow, setShouldShow] = useState(true);

  // Generate status info from props
  const getStatusInfo = () => {
    switch (connectionState) {
      case 'connected':
        return {
          status: 'connected',
          message: '接続済み',
          color: 'green',
          icon: '🟢'
        };
      case 'connecting':
        return {
          status: 'connecting',
          message: '接続中...',
          color: 'orange',
          icon: '🟡'
        };
      case 'disconnected':
        return {
          status: 'disconnected',
          message: reconnectAttempts > 0 ? `再接続中... (${reconnectAttempts}回目)` : '切断済み',
          color: 'red',
          icon: '🔴'
        };
      case 'error':
        return {
          status: 'error',
          message: '接続エラー',
          color: 'red',
          icon: '🔴'
        };
      default:
        return {
          status: isConnected ? 'connected' : 'disconnected',
          message: isConnected ? '接続済み' : '切断済み',
          color: isConnected ? 'green' : 'red',
          icon: isConnected ? '🟢' : '🔴'
        };
    }
  };

  const statusInfo = getStatusInfo();

  // Handle auto-hide logic
  useEffect(() => {
    if (!autoHide) return;

    if (statusInfo.status === 'connected') {
      // Start fade out after delay
      const fadeOutTimer = setTimeout(() => {
        setIsVisible(false);
      }, autoHideDelay);

      // Completely hide after fade animation completes
      const hideTimer = setTimeout(() => {
        setShouldShow(false);
      }, autoHideDelay + 300); // 300ms for fade transition

      return () => {
        clearTimeout(fadeOutTimer);
        clearTimeout(hideTimer);
      };
    } else {
      // Show immediately when not connected
      setShouldShow(true);
      setIsVisible(true);
    }
  }, [statusInfo.status, autoHide, autoHideDelay]);

  // Don't render if completely hidden
  if (!shouldShow) {
    return null;
  }


  const getIcon = () => {
    switch (statusInfo.status) {
      case 'connected':
        return <FiWifi className="connection-status__icon" />;
      case 'connecting':
        return <FiLoader className="connection-status__icon connection-status__icon--spinning" />;
      case 'disconnected':
      case 'error':
        return <FiWifiOff className="connection-status__icon" />;
      default:
        return <FiAlertCircle className="connection-status__icon" />;
    }
  };

  const baseClasses = [
    'connection-status',
    `connection-status--${statusInfo.status}`,
    `connection-status--${position}`,
    compact ? 'connection-status--compact' : '',
    !isVisible ? 'connection-status--fading' : '',
    className
  ].filter(Boolean).join(' ');

  if (compact) {
    return (
      <div className={baseClasses} title={statusInfo.message}>
        {getIcon()}
      </div>
    );
  }

  return (
    <div className={baseClasses}>
      <div className="connection-status__content">
        {getIcon()}
        {showText && (
          <span className="connection-status__text">
            {statusInfo.message}
          </span>
        )}
        {reconnectAttempts > 0 && statusInfo.status === 'disconnected' && (
          <span className="connection-status__attempts">
            ({reconnectAttempts}回目)
          </span>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus;
