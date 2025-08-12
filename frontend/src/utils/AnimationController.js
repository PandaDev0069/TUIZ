/**
 * Universal Animation Controller
 * Manages animations based on user preferences, device capabilities, and network conditions
 */

class AnimationController {
  constructor() {
    this.animationLevel = 'full'; // 'full', 'reduced', 'minimal', 'none'
    this.isInitialized = false;
    this.networkSpeed = 'fast'; // 'fast', 'slow', 'offline'
    this.deviceCapabilities = 'high'; // 'high', 'medium', 'low'
    this.userPreference = null; // User override
    
    this.init();
  }

  init() {
    if (this.isInitialized) return;
    
    // Check user preferences first
    this.checkUserPreferences();
    
    // Detect device capabilities
    this.detectDeviceCapabilities();
    
    // Monitor network conditions
    this.monitorNetworkConditions();
    
    // Calculate optimal animation level
    this.calculateAnimationLevel();
    
    // Apply CSS classes to document
    this.applyAnimationClasses();
    
    // Listen for changes
    this.setupEventListeners();
    
    this.isInitialized = true;
    
    // Expose global methods
    window.tuizAnimations = {
      setLevel: (level) => this.setAnimationLevel(level),
      getLevel: () => this.animationLevel,
      enable: () => this.enableAnimations(),
      disable: () => this.disableAnimations(),
      toggle: () => this.toggleAnimations(),
      controller: this
    };

    console.log('[TUIZ Animations] Controller initialized:', {
      level: this.animationLevel,
      network: this.networkSpeed,
      device: this.deviceCapabilities,
      userPreference: this.userPreference
    });
  }

  checkUserPreferences() {
    // Check CSS media query for reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.userPreference = 'reduced';
      return;
    }

    // Check localStorage for user setting
    const savedPreference = localStorage.getItem('tuiz-animation-preference');
    if (savedPreference && ['full', 'reduced', 'minimal', 'none'].includes(savedPreference)) {
      this.userPreference = savedPreference;
    }
  }

  detectDeviceCapabilities() {
    // Check hardware acceleration
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    const hasWebGL = !!gl;

    // Check memory (rough estimation)
    const memoryInfo = navigator.deviceMemory || 4; // Default to 4GB if unknown

    // Check CPU cores
    const cpuCores = navigator.hardwareConcurrency || 4;

    // Determine device capability
    if (memoryInfo >= 8 && cpuCores >= 8 && hasWebGL) {
      this.deviceCapabilities = 'high';
    } else if (memoryInfo >= 4 && cpuCores >= 4) {
      this.deviceCapabilities = 'medium';
    } else {
      this.deviceCapabilities = 'low';
    }

    // Check if mobile/tablet (generally less capable)
    if (/Mobi|Android|iPad|iPhone/i.test(navigator.userAgent)) {
      if (this.deviceCapabilities === 'high') {
        this.deviceCapabilities = 'medium';
      } else if (this.deviceCapabilities === 'medium') {
        this.deviceCapabilities = 'low';
      }
    }
  }

  monitorNetworkConditions() {
    // Check Network Information API
    if ('connection' in navigator) {
      const connection = navigator.connection;
      
      const updateNetworkSpeed = () => {
        const effectiveType = connection.effectiveType;
        
        if (effectiveType === '4g' || effectiveType === '3g') {
          this.networkSpeed = 'fast';
        } else if (effectiveType === '2g' || effectiveType === 'slow-2g') {
          this.networkSpeed = 'slow';
        } else {
          this.networkSpeed = 'fast'; // Default
        }

        // Consider data saver mode
        if (connection.saveData) {
          this.networkSpeed = 'slow';
        }

        this.calculateAnimationLevel();
        this.applyAnimationClasses();
      };

      updateNetworkSpeed();
      connection.addEventListener('change', updateNetworkSpeed);
    }

    // Fallback: Monitor online/offline
    window.addEventListener('online', () => {
      this.networkSpeed = 'fast';
      this.calculateAnimationLevel();
      this.applyAnimationClasses();
    });

    window.addEventListener('offline', () => {
      this.networkSpeed = 'offline';
      this.calculateAnimationLevel();
      this.applyAnimationClasses();
    });
  }

  calculateAnimationLevel() {
    // User preference always takes priority
    if (this.userPreference) {
      this.animationLevel = this.userPreference;
      return;
    }

    // Calculate based on device and network
    if (this.networkSpeed === 'offline' || 
        (this.networkSpeed === 'slow' && this.deviceCapabilities === 'low')) {
      this.animationLevel = 'none';
    } else if (this.networkSpeed === 'slow' || this.deviceCapabilities === 'low') {
      this.animationLevel = 'minimal';
    } else if (this.deviceCapabilities === 'medium') {
      this.animationLevel = 'reduced';
    } else {
      this.animationLevel = 'full';
    }
  }

  applyAnimationClasses() {
    const body = document.body;
    
    // Remove existing animation classes
    body.classList.remove(
      'tuiz-animations-full',
      'tuiz-animations-reduced', 
      'tuiz-animations-minimal',
      'tuiz-animations-none'
    );

    // Add current animation class
    body.classList.add(`tuiz-animations-${this.animationLevel}`);

    // Dispatch event for components to listen to
    window.dispatchEvent(new CustomEvent('tuiz-animation-level-changed', {
      detail: { level: this.animationLevel }
    }));
  }

  setupEventListeners() {
    // Listen for reduced motion preference changes
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionQuery.addEventListener('change', () => {
      this.checkUserPreferences();
      this.calculateAnimationLevel();
      this.applyAnimationClasses();
    });

    // Listen for visibility change (pause animations when tab not active)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        document.body.classList.add('tuiz-animations-paused');
      } else {
        document.body.classList.remove('tuiz-animations-paused');
      }
    });

    // Performance observer for frame drops
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          let frameDrops = 0;
          
          entries.forEach(entry => {
            if (entry.entryType === 'measure' && entry.duration > 16.67) {
              frameDrops++;
            }
          });

          // If too many frame drops, reduce animation level
          if (frameDrops > 5 && this.animationLevel === 'full') {
            this.setAnimationLevel('reduced');
          }
        });

        observer.observe({ entryTypes: ['measure'] });
      } catch (e) {
        // Performance observer not supported
      }
    }
  }

  setAnimationLevel(level) {
    if (!['full', 'reduced', 'minimal', 'none'].includes(level)) {
      console.warn('[TUIZ Animations] Invalid animation level:', level);
      return;
    }

    this.userPreference = level;
    this.animationLevel = level;
    
    // Save to localStorage
    localStorage.setItem('tuiz-animation-preference', level);
    
    this.applyAnimationClasses();
    
    console.log('[TUIZ Animations] Level changed to:', level);
  }

  enableAnimations() {
    this.setAnimationLevel('full');
  }

  disableAnimations() {
    this.setAnimationLevel('none');
  }

  toggleAnimations() {
    const levels = ['none', 'minimal', 'reduced', 'full'];
    const currentIndex = levels.indexOf(this.animationLevel);
    const nextIndex = (currentIndex + 1) % levels.length;
    this.setAnimationLevel(levels[nextIndex]);
  }

  // Utility methods for components
  shouldAnimate(type = 'basic') {
    switch (type) {
      case 'entrance':
        return this.animationLevel !== 'none';
      case 'hover':
        return this.animationLevel === 'full' || this.animationLevel === 'reduced';
      case 'continuous':
        return this.animationLevel === 'full';
      case 'micro':
        return this.animationLevel !== 'none';
      default:
        return this.animationLevel !== 'none';
    }
  }

  getAnimationDuration(baseMs = 300) {
    switch (this.animationLevel) {
      case 'full':
        return baseMs;
      case 'reduced':
        return baseMs * 0.7;
      case 'minimal':
        return baseMs * 0.5;
      case 'none':
        return 0;
      default:
        return baseMs;
    }
  }

  getAnimationDelay(baseMs = 100) {
    switch (this.animationLevel) {
      case 'full':
        return baseMs;
      case 'reduced':
        return baseMs * 0.5;
      case 'minimal':
        return 0;
      case 'none':
        return 0;
      default:
        return baseMs;
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new AnimationController();
  });
} else {
  new AnimationController();
}

export default AnimationController;
