import { useCallback } from 'react';

// Custom hook for managing toast notifications
export const useToast = () => {
  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    if (window.showToast) {
      return window.showToast(message, type, duration);
    } else {
      // Fallback to browser alert if toast system is not available
      alert(message);
      console.warn('Toast system not initialized, falling back to alert');
    }
  }, []);

  const showSuccess = useCallback((message, duration = 4000) => {
    return showToast(message, 'success', duration);
  }, [showToast]);

  const showError = useCallback((message, duration = 5000) => {
    return showToast(message, 'error', duration);
  }, [showToast]);

  const showWarning = useCallback((message, duration = 4500) => {
    return showToast(message, 'warning', duration);
  }, [showToast]);

  const showInfo = useCallback((message, duration = 4000) => {
    return showToast(message, 'info', duration);
  }, [showToast]);

  const clearAllToasts = useCallback(() => {
    if (window.clearToasts) {
      window.clearToasts();
    }
  }, []);

  return {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAllToasts
  };
};

export default useToast;
