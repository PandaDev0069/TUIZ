/**
 * Connection Status Component
 * 
 * Displays real-time socket connection status with reconnection indicators.
 * Can be placed in any component to show connection health.
 */

import React from 'react';
import { useConnectionStatus } from '../hooks/useSocket';
import { FiWifi, FiWifiOff, FiLoader, FiAlertCircle } from 'react-icons/fi';
import './connectionStatus.css';

const ConnectionStatus = ({ 
  compact = false, 
  showText = true, 
  className = '',
  position = 'top-right' 
}) => {
  const { statusInfo, reconnectAttempts, connectionState, isConnected } = useConnectionStatus();


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
