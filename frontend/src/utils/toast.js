// Toast utility functions for easy import
// This provides a consistent way to show notifications across the app

/**
 * Show a success toast notification
 * @param {string} message - The message to display
 * @param {number} duration - Duration in milliseconds (default: 4000)
 */
export const showSuccess = (message, duration = 4000) => {
  if (window.showToast) {
    return window.showToast(message, 'success', duration);
  } else {
    // Fallback for development or if toast system isn't loaded
    console.log(`[SUCCESS] ${message}`);
    alert(`✅ ${message}`);
  }
};

/**
 * Show an error toast notification
 * @param {string} message - The message to display
 * @param {number} duration - Duration in milliseconds (default: 5000)
 */
export const showError = (message, duration = 5000) => {
  if (window.showToast) {
    return window.showToast(message, 'error', duration);
  } else {
    console.error(`[ERROR] ${message}`);
    alert(`❌ ${message}`);
  }
};

/**
 * Show a warning toast notification
 * @param {string} message - The message to display
 * @param {number} duration - Duration in milliseconds (default: 4500)
 */
export const showWarning = (message, duration = 4500) => {
  if (window.showToast) {
    return window.showToast(message, 'warning', duration);
  } else {
    console.warn(`[WARNING] ${message}`);
    alert(`⚠️ ${message}`);
  }
};

/**
 * Show an info toast notification
 * @param {string} message - The message to display
 * @param {number} duration - Duration in milliseconds (default: 4000)
 */
export const showInfo = (message, duration = 4000) => {
  if (window.showToast) {
    return window.showToast(message, 'info', duration);
  } else {
    console.info(`[INFO] ${message}`);
    alert(`ℹ️ ${message}`);
  }
};

/**
 * Show a generic toast notification
 * @param {string} message - The message to display
 * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in milliseconds
 */
export const showToast = (message, type = 'info', duration = 4000) => {
  if (window.showToast) {
    return window.showToast(message, type, duration);
  } else {
    console.log(`[${type.toUpperCase()}] ${message}`);
    const emoji = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    }[type] || 'ℹ️';
    alert(`${emoji} ${message}`);
  }
};

/**
 * Clear all toast notifications
 */
export const clearAllToasts = () => {
  if (window.clearToasts) {
    window.clearToasts();
  }
};

// Default export with all functions
const toast = {
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  show: showToast,
  clear: clearAllToasts
};

export default toast;
