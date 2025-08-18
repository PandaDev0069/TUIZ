/**
 * Mobile Viewport Fix Utility
 * Handles dynamic viewport height changes on mobile devices
 * Prevents white space below footer caused by address bar show/hide
 */

class ViewportFix {
  constructor() {
    this.isInitialized = false;
    this.lastHeight = 0;
    this.init();
  }

  init() {
    if (this.isInitialized) return;
    
    // Only apply on mobile devices
    if (!this.isMobile()) return;
    
    this.setViewportHeight();
    this.setupEventListeners();
    this.isInitialized = true;
    
    console.log('[TUIZ Viewport] Mobile viewport fix initialized');
  }

  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768;
  }

  setViewportHeight() {
    // Get the actual viewport height
    const vh = window.innerHeight * 0.01;
    
    // Set CSS custom property
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  document.body.style.minHeight = `calc(var(--vh, 1vh) * 100)`;
    
    // Apply to specific elements that need full height
  const pageContainers = document.querySelectorAll('.tuiz-page-container, .auth, .home, .dashboard, .dashboard__wrapper');
    pageContainers.forEach(container => {
      container.style.minHeight = `calc(var(--vh, 1vh) * 100)`;
      container.style.height = `calc(var(--vh, 1vh) * 100)`;
    });

    this.lastHeight = window.innerHeight;
  }

  setupEventListeners() {
    // Handle resize events (address bar show/hide)
    window.addEventListener('resize', this.debounce(() => {
      this.setViewportHeight();
    }, 100));

    // Handle orientation change
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.setViewportHeight();
      }, 500);
    });

    // Handle scroll to detect address bar changes
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (Math.abs(window.innerHeight - this.lastHeight) > 50) {
            this.setViewportHeight();
          }
          ticking = false;
        });
        ticking = true;
      }
    });

    // Handle focus events (keyboard show/hide)
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        setTimeout(() => {
          this.setViewportHeight();
        }, 300);
      });
      
      input.addEventListener('blur', () => {
        setTimeout(() => {
          this.setViewportHeight();
        }, 300);
      });
    });

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        setTimeout(() => {
          this.setViewportHeight();
        }, 100);
      }
    });
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Force refresh viewport
  refresh() {
    this.setViewportHeight();
  }

  // Get current viewport info
  getViewportInfo() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      isMobile: this.isMobile(),
      vh: window.innerHeight * 0.01
    };
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.tuizViewport = new ViewportFix();
  });
} else {
  window.tuizViewport = new ViewportFix();
}

export default ViewportFix;
