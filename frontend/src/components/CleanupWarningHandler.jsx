import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';
import './cleanupWarningHandler.css';

const CleanupWarningHandler = () => {
  const [warning, setWarning] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleCleanupWarning = (warningData) => {
      console.log('⚠️ Cleanup warning received:', warningData);
      console.log('📍 Current location:', window.location.pathname);
      
      setWarning(warningData);
      
      // Only enable auto-redirect for final warnings, not first warnings
      // AND only if remaining time is very low (safety check)
      if (warningData.type === 'final' && warningData.autoRedirect && warningData.remainingMinutes <= 0.5) {
        console.log(`🚨 Auto-redirect enabled: ${warningData.remainingMinutes} min remaining`);
        // Start countdown for auto-redirect
        setCountdown(warningData.autoRedirect.delaySeconds);
      } else {
        console.log(`ℹ️ Auto-redirect NOT enabled:`, {
          type: warningData.type,
          hasAutoRedirect: !!warningData.autoRedirect,
          remainingMinutes: warningData.remainingMinutes,
          reason: warningData.type !== 'final' ? 'Not final warning' : 
                  !warningData.autoRedirect ? 'No autoRedirect config' :
                  warningData.remainingMinutes > 0.5 ? 'Too much time remaining (>30s)' : 'Unknown'
        });
      }
    };

    console.log('🔧 CleanupWarningHandler: Setting up socket listener');
    socket.on('cleanupWarning', handleCleanupWarning);

    return () => {
      console.log('🔧 CleanupWarningHandler: Cleaning up socket listener');
      socket.off('cleanupWarning', handleCleanupWarning);
    };
  }, [navigate]);

  // Separate useEffect for countdown management
  useEffect(() => {
    let countdownInterval;
    
    if (countdown !== null && countdown > 0) {
      countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            // Don't navigate here - just return 0 and let another effect handle navigation
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [countdown]);

  // Separate useEffect to handle navigation when countdown reaches 0
  useEffect(() => {
    if (countdown === 0) {
      console.log('🔄 Auto-redirect triggered');
      // Use setTimeout to ensure navigation happens after state update is complete
      setTimeout(() => {
        navigate('/');
        setWarning(null);
        setCountdown(null);
      }, 0);
    }
  }, [countdown, navigate]);

  const handleDismiss = () => {
    setWarning(null);
    setCountdown(null);
  };

  const handleGoHome = () => {
    navigate('/');
    setWarning(null);
    setCountdown(null);
  };

  if (!warning) return null;

  const isUrgent = warning.type === 'final';
  const warningClass = `cleanup-warning ${isUrgent ? 'urgent' : 'notice'}`;

  return (
    <div className={warningClass}>
      <div className="warning-content">
        <div className="warning-icon">
          {isUrgent ? '🚨' : '⚠️'}
        </div>
        
        <div className="warning-message">
          <h4>{isUrgent ? 'ゲーム終了警告' : 'ゲーム時間警告'}</h4>
          <p>{warning.message}</p>
          
          {warning.remainingMinutes > 0 && (
            <div className="time-remaining">
              残り時間: {warning.remainingMinutes}分
            </div>
          )}
          
          {countdown !== null && (
            <div className="auto-redirect-notice">
              {countdown}秒後にホームページに戻ります...
            </div>
          )}
        </div>
        
        <div className="warning-actions">
          {!countdown && (
            <button onClick={handleDismiss} className="dismiss-btn">
              確認
            </button>
          )}
          
          <button onClick={handleGoHome} className="home-btn">
            ホームに戻る
          </button>
        </div>
      </div>
    </div>
  );
};

export default CleanupWarningHandler;
