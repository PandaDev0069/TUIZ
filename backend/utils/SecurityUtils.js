const path = require('path');
const crypto = require('crypto');

/**
 * Security utilities for safe file and path handling
 */
class SecurityUtils {
  
  /**
   * Sanitize filename to prevent path traversal attacks
   * @param {string} filename - Original filename
   * @param {string} fallbackName - Fallback name if sanitization fails
   * @returns {string} - Safe filename
   */
  static sanitizeFilename(filename, fallbackName = 'file') {
    if (!filename || typeof filename !== 'string') {
      return `${fallbackName}_${Date.now()}`;
    }
    
    // Remove path components and dangerous characters
    const sanitized = filename
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // Remove dangerous characters
      .replace(/^\.+/, '') // Remove leading dots
      .replace(/\.+$/, '') // Remove trailing dots
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 255); // Limit length
    
    // Extract just the filename part (no directory traversal)
    const baseName = path.basename(sanitized);
    
    // If sanitization resulted in empty string, use fallback
    if (!baseName || baseName === '.' || baseName === '..') {
      return `${fallbackName}_${Date.now()}`;
    }
    
    return baseName;
  }
  
  /**
   * Generate a secure random filename with proper extension
   * @param {string} originalFilename - Original filename for extension
   * @param {string} prefix - Optional prefix
   * @returns {string} - Secure filename
   */
  static generateSecureFilename(originalFilename, prefix = 'file') {
    const ext = originalFilename ? path.extname(this.sanitizeFilename(originalFilename)) : '';
    const randomId = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    
    return `${prefix}_${timestamp}_${randomId}${ext}`;
  }
  
  /**
   * Sanitize user ID to prevent injection in storage paths
   * @param {string} userId - User ID
   * @returns {string} - Safe user ID
   */
  static sanitizeUserId(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }
    
    // Only allow alphanumeric characters, hyphens, and underscores
    const sanitized = userId.replace(/[^a-zA-Z0-9\-_]/g, '');
    
    if (!sanitized || sanitized.length < 3) {
      throw new Error('Invalid user ID format');
    }
    
    return sanitized;
  }
  
  /**
   * Create a safe storage path
   * @param {string} userId - User ID
   * @param {string} filename - Filename
   * @param {string} folder - Optional folder name
   * @returns {string} - Safe storage path
   */
  static createSafeStoragePath(userId, filename, folder = '') {
    const safeUserId = this.sanitizeUserId(userId);
    const safeFilename = this.sanitizeFilename(filename);
    const safeFolder = folder ? this.sanitizeFilename(folder) : '';
    
    if (safeFolder) {
      return `${safeUserId}/${safeFolder}/${safeFilename}`;
    }
    
    return `${safeUserId}/${safeFilename}`;
  }
  
  /**
   * Validate and sanitize file path for local operations
   * @param {string} filePath - File path to validate
   * @param {string} allowedBaseDir - Base directory that files must be within
   * @returns {string} - Safe absolute path
   */
  static validateFilePath(filePath, allowedBaseDir) {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path');
    }
    
    // Resolve to absolute path and normalize
    const absolutePath = path.resolve(filePath);
    const baseDir = path.resolve(allowedBaseDir);
    
    // Check if the resolved path is within the allowed directory
    if (!absolutePath.startsWith(baseDir + path.sep) && absolutePath !== baseDir) {
      throw new Error('Path traversal attempt detected');
    }
    
    return absolutePath;
  }
  
  /**
   * Sanitize format string to prevent format string attacks
   * @param {string} formatString - Format string
   * @param {object} allowedPlaceholders - Allowed placeholder keys
   * @returns {string} - Safe format string
   */
  static sanitizeFormatString(formatString, allowedPlaceholders = {}) {
    if (!formatString || typeof formatString !== 'string') {
      return '';
    }
    
    // Remove any potential format specifiers that could be dangerous
    let sanitized = formatString.replace(/%[^s]/g, ''); // Only allow %s for string replacement
    
    // If we have allowed placeholders, validate them
    if (Object.keys(allowedPlaceholders).length > 0) {
      // Replace template literals with safe values
      sanitized = sanitized.replace(/\${([^}]+)}/g, (match, key) => {
        const trimmedKey = key.trim();
        if (allowedPlaceholders.hasOwnProperty(trimmedKey)) {
          return String(allowedPlaceholders[trimmedKey]);
        }
        return ''; // Remove unallowed placeholders
      });
    }
    
    return sanitized;
  }
  
  /**
   * Safe logging that prevents format string injection
   * @param {string} level - Log level
   * @param {string} message - Message to log
   * @param {object} data - Additional data
   */
  static safeLog(level, message, data = {}) {
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
    const isLocalhost = process.env.IS_LOCALHOST === 'true' || !process.env.NODE_ENV;
    
    if (!isDevelopment && !isLocalhost && level === 'debug') {
      return; // Skip debug logs in production
    }
    
    // Sanitize the message to prevent format string attacks
    const safeMessage = typeof message === 'string' ? 
      message.replace(/%[^s]/g, '').replace(/\${[^}]+}/g, '') : 
      String(message);
    
    // Safely stringify data
    const safeData = data && typeof data === 'object' ? 
      JSON.stringify(data, null, 2) : 
      String(data);
    
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${safeMessage}`;
    
    switch (level) {
      case 'error':
        console.error(logEntry, safeData);
        break;
      case 'warn':
        console.warn(logEntry, safeData);
        break;
      case 'info':
        console.info(logEntry, safeData);
        break;
      case 'debug':
        console.log(logEntry, safeData);
        break;
      default:
        console.log(logEntry, safeData);
    }
  }
}

module.exports = SecurityUtils;
