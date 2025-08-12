import { useState, useEffect, useRef, createContext, useContext } from 'react';
import PropTypes from 'prop-types';
import './AnimationSystem.css';

/**
 * AnimationSystem - Comprehensive Animation and Interaction Framework
 * Phase 5: Enhanced UX & Polish Implementation
 * 
 * Features:
 * - Smooth page transitions with configurable timing
 * - Real-time data animations with performance optimization
 * - Player join/leave effects with celebration systems
 * - Score update animations with physics-based motion
 * - Loading state improvements with skeleton screens
 * - Micro-interactions for enhanced user feedback
 * - Context-based animation management
 */

// Animation Context for global animation state management
const AnimationContext = createContext({
  animationsEnabled: true,
  performanceMode: 'balanced', // 'performance', 'balanced', 'quality'
  reducedMotion: false,
  setAnimationsEnabled: () => {},
  setPerformanceMode: () => {},
  triggerCelebration: () => {},
  animateScoreChange: () => {}
});

// Custom hook for accessing animation context
export const useAnimations = () => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimations must be used within an AnimationProvider');
  }
  return context;
};

// Animation Provider Component
export function AnimationProvider({ children }) {
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [performanceMode, setPerformanceMode] = useState('balanced');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [celebrationQueue, setCelebrationQueue] = useState([]);
  const celebrationTimeouts = useRef(new Set());

  // Detect user's motion preferences
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    
    const handleChange = (e) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Cleanup celebration timeouts on unmount
  useEffect(() => {
    return () => {
      celebrationTimeouts.current.forEach(timeout => clearTimeout(timeout));
      celebrationTimeouts.current.clear();
    };
  }, []);

  // Trigger celebration animations
  const triggerCelebration = (type = 'success', duration = 3000, options = {}) => {
    if (!animationsEnabled || reducedMotion) return;

    const celebrationId = `celebration-${Date.now()}-${Math.random()}`;
    const celebration = {
      id: celebrationId,
      type,
      duration,
      timestamp: Date.now(),
      ...options
    };

    setCelebrationQueue(prev => [...prev, celebration]);

    // Auto-remove celebration after duration
    const timeout = setTimeout(() => {
      setCelebrationQueue(prev => prev.filter(c => c.id !== celebrationId));
      celebrationTimeouts.current.delete(timeout);
    }, duration);
    
    celebrationTimeouts.current.add(timeout);
  };

  // Animate score changes with physics-based motion
  const animateScoreChange = (element, oldScore, newScore, options = {}) => {
    if (!element || !animationsEnabled || reducedMotion) return;

    const {
      duration = 1000,
      easing = 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      onComplete = () => {}
    } = options;

    const scoreAnimation = element.animate([
      { 
        transform: 'scale(1)', 
        color: 'var(--color-text-primary)' 
      },
      { 
        transform: 'scale(1.2)', 
        color: 'var(--color-accent)' 
      },
      { 
        transform: 'scale(1)', 
        color: 'var(--color-text-primary)' 
      }
    ], {
      duration,
      easing,
      fill: 'forwards'
    });

    // Animate the number change
    const startTime = performance.now();
    const scoreDiff = newScore - oldScore;

    const updateScore = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentScore = Math.round(oldScore + (scoreDiff * easedProgress));
      
      element.textContent = currentScore.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(updateScore);
      } else {
        element.textContent = newScore.toLocaleString();
        onComplete();
      }
    };

    requestAnimationFrame(updateScore);
    return scoreAnimation;
  };

  const contextValue = {
    animationsEnabled,
    performanceMode,
    reducedMotion,
    celebrationQueue,
    setAnimationsEnabled,
    setPerformanceMode,
    triggerCelebration,
    animateScoreChange
  };

  return (
    <AnimationContext.Provider value={contextValue}>
      {children}
      <CelebrationOverlay celebrations={celebrationQueue} />
    </AnimationContext.Provider>
  );
}

AnimationProvider.propTypes = {
  children: PropTypes.node.isRequired
};

// Page Transition Component
export function PageTransition({ 
  children, 
  transitionKey, 
  type = 'slide', 
  duration = 300,
  direction = 'right'
}) {
  const { animationsEnabled, reducedMotion } = useAnimations();
  const [isVisible, setIsVisible] = useState(false);
  const [currentKey, setCurrentKey] = useState(transitionKey);
  const containerRef = useRef(null);

  useEffect(() => {
    if (transitionKey !== currentKey) {
      if (animationsEnabled && !reducedMotion) {
        // Fade out current content
        setIsVisible(false);
        
        setTimeout(() => {
          setCurrentKey(transitionKey);
          setIsVisible(true);
        }, duration / 2);
      } else {
        setCurrentKey(transitionKey);
        setIsVisible(true);
      }
    } else {
      setIsVisible(true);
    }
  }, [transitionKey, currentKey, duration, animationsEnabled, reducedMotion]);

  const getTransitionClasses = () => {
    if (!animationsEnabled || reducedMotion) return '';
    
    const baseClass = 'page-transition';
    const typeClass = `page-transition--${type}`;
    const directionClass = `page-transition--${direction}`;
    const visibleClass = isVisible ? 'page-transition--visible' : '';
    
    return `${baseClass} ${typeClass} ${directionClass} ${visibleClass}`.trim();
  };

  return (
    <div 
      ref={containerRef}
      className={getTransitionClasses()}
      style={{
        '--transition-duration': `${duration}ms`
      }}
    >
      {children}
    </div>
  );
}

PageTransition.propTypes = {
  children: PropTypes.node.isRequired,
  transitionKey: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['slide', 'fade', 'scale', 'flip']),
  duration: PropTypes.number,
  direction: PropTypes.oneOf(['up', 'down', 'left', 'right'])
};

// Player Join/Leave Animation Component
export function PlayerActionAnimation({ 
  action, 
  playerName, 
  onComplete = () => {},
  position = 'top-right'
}) {
  const { animationsEnabled, reducedMotion } = useAnimations();
  const [isVisible, setIsVisible] = useState(false);
  const animationRef = useRef(null);

  useEffect(() => {
    if (animationsEnabled && !reducedMotion) {
      setIsVisible(true);
      
      const timeout = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onComplete, 300); // Wait for exit animation
      }, 3000);
      
      return () => clearTimeout(timeout);
    } else {
      onComplete();
    }
  }, [animationsEnabled, reducedMotion, onComplete]);

  if (!animationsEnabled || reducedMotion) return null;

  const getActionIcon = () => {
    switch (action) {
      case 'join':
        return '👋';
      case 'leave':
        return '👋';
      case 'answer':
        return '✅';
      case 'correct':
        return '🎉';
      case 'incorrect':
        return '😅';
      default:
        return '📝';
    }
  };

  const getActionText = () => {
    switch (action) {
      case 'join':
        return `${playerName} joined the game!`;
      case 'leave':
        return `${playerName} left the game`;
      case 'answer':
        return `${playerName} answered!`;
      case 'correct':
        return `${playerName} got it right!`;
      case 'incorrect':
        return `${playerName} gave it their best!`;
      default:
        return `${playerName} is active`;
    }
  };

  const getActionColor = () => {
    switch (action) {
      case 'join':
      case 'correct':
        return 'var(--color-success)';
      case 'leave':
        return 'var(--color-warning)';
      case 'incorrect':
        return 'var(--color-info)';
      default:
        return 'var(--color-accent)';
    }
  };

  return (
    <div 
      ref={animationRef}
      className={`player-action-animation player-action-animation--${position} ${
        isVisible ? 'player-action-animation--visible' : ''
      }`}
      style={{
        '--action-color': getActionColor()
      }}
    >
      <div className="player-action-content">
        <span className="player-action-icon">{getActionIcon()}</span>
        <span className="player-action-text">{getActionText()}</span>
      </div>
    </div>
  );
}

PlayerActionAnimation.propTypes = {
  action: PropTypes.oneOf(['join', 'leave', 'answer', 'correct', 'incorrect']).isRequired,
  playerName: PropTypes.string.isRequired,
  onComplete: PropTypes.func,
  position: PropTypes.oneOf(['top-left', 'top-right', 'bottom-left', 'bottom-right'])
};

// Loading Animation Component
export function LoadingAnimation({ 
  type = 'spinner', 
  size = 'medium', 
  message = '',
  showSkeleton = false 
}) {
  const { animationsEnabled, reducedMotion } = useAnimations();

  if (showSkeleton) {
    return <SkeletonLoader type={type} />;
  }

  const getLoadingContent = () => {
    if (reducedMotion) {
      return (
        <div className="loading-static">
          <div className="loading-dots">
            <span>●</span>
            <span>●</span>
            <span>●</span>
          </div>
          {message && <p className="loading-message">{message}</p>}
        </div>
      );
    }

    switch (type) {
      case 'spinner':
        return (
          <div className={`loading-spinner loading-spinner--${size}`}>
            <div className="spinner-ring"></div>
            {message && <p className="loading-message">{message}</p>}
          </div>
        );
      
      case 'pulse':
        return (
          <div className={`loading-pulse loading-pulse--${size}`}>
            <div className="pulse-dot pulse-dot--1"></div>
            <div className="pulse-dot pulse-dot--2"></div>
            <div className="pulse-dot pulse-dot--3"></div>
            {message && <p className="loading-message">{message}</p>}
          </div>
        );
      
      case 'wave':
        return (
          <div className={`loading-wave loading-wave--${size}`}>
            <div className="wave-bar wave-bar--1"></div>
            <div className="wave-bar wave-bar--2"></div>
            <div className="wave-bar wave-bar--3"></div>
            <div className="wave-bar wave-bar--4"></div>
            <div className="wave-bar wave-bar--5"></div>
            {message && <p className="loading-message">{message}</p>}
          </div>
        );
      
      default:
        return (
          <div className="loading-default">
            <p>{message || 'Loading...'}</p>
          </div>
        );
    }
  };

  return (
    <div className={`loading-animation ${!animationsEnabled ? 'loading-animation--static' : ''}`}>
      {getLoadingContent()}
    </div>
  );
}

LoadingAnimation.propTypes = {
  type: PropTypes.oneOf(['spinner', 'pulse', 'wave', 'skeleton']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  message: PropTypes.string,
  showSkeleton: PropTypes.bool
};

// Skeleton Loader Component
function SkeletonLoader({ type }) {
  const skeletonElements = {
    card: (
      <div className="skeleton-card">
        <div className="skeleton-line skeleton-line--title"></div>
        <div className="skeleton-line skeleton-line--subtitle"></div>
        <div className="skeleton-line skeleton-line--content"></div>
        <div className="skeleton-line skeleton-line--content skeleton-line--short"></div>
      </div>
    ),
    list: (
      <div className="skeleton-list">
        {[1, 2, 3, 4, 5].map(index => (
          <div key={index} className="skeleton-list-item">
            <div className="skeleton-avatar"></div>
            <div className="skeleton-content">
              <div className="skeleton-line skeleton-line--name"></div>
              <div className="skeleton-line skeleton-line--detail"></div>
            </div>
          </div>
        ))}
      </div>
    ),
    chart: (
      <div className="skeleton-chart">
        <div className="skeleton-chart-header">
          <div className="skeleton-line skeleton-line--chart-title"></div>
        </div>
        <div className="skeleton-chart-body">
          {[1, 2, 3, 4, 5].map(index => (
            <div key={index} className="skeleton-bar" style={{ height: `${20 + index * 15}%` }}></div>
          ))}
        </div>
      </div>
    )
  };

  return (
    <div className="skeleton-loader">
      {skeletonElements[type] || skeletonElements.card}
    </div>
  );
}

// Micro-interaction Component
export function MicroInteraction({ 
  children, 
  type = 'hover', 
  intensity = 'medium',
  disabled = false 
}) {
  const { animationsEnabled, reducedMotion } = useAnimations();
  const [isActive, setIsActive] = useState(false);
  const elementRef = useRef(null);

  const handleInteraction = (active) => {
    if (disabled || !animationsEnabled || reducedMotion) return;
    setIsActive(active);
  };

  const getInteractionClasses = () => {
    const baseClass = 'micro-interaction';
    const typeClass = `micro-interaction--${type}`;
    const intensityClass = `micro-interaction--${intensity}`;
    const activeClass = isActive ? 'micro-interaction--active' : '';
    const disabledClass = disabled ? 'micro-interaction--disabled' : '';
    
    return `${baseClass} ${typeClass} ${intensityClass} ${activeClass} ${disabledClass}`.trim();
  };

  const interactionProps = {
    onMouseEnter: () => handleInteraction(true),
    onMouseLeave: () => handleInteraction(false),
    onMouseDown: () => handleInteraction(true),
    onMouseUp: () => handleInteraction(false),
    onFocus: () => handleInteraction(true),
    onBlur: () => handleInteraction(false)
  };

  return (
    <div 
      ref={elementRef}
      className={getInteractionClasses()}
      {...(type === 'hover' || type === 'focus' ? interactionProps : {})}
    >
      {children}
    </div>
  );
}

MicroInteraction.propTypes = {
  children: PropTypes.node.isRequired,
  type: PropTypes.oneOf(['hover', 'focus', 'press', 'ripple']),
  intensity: PropTypes.oneOf(['subtle', 'medium', 'strong']),
  disabled: PropTypes.bool
};

// Celebration Overlay Component
function CelebrationOverlay({ celebrations }) {
  const { animationsEnabled, reducedMotion } = useAnimations();

  if (!animationsEnabled || reducedMotion || celebrations.length === 0) {
    return null;
  }

  return (
    <div className="celebration-overlay">
      {celebrations.map(celebration => (
        <CelebrationEffect key={celebration.id} {...celebration} />
      ))}
    </div>
  );
}

// Individual Celebration Effect
function CelebrationEffect({ type, duration, intensity = 'medium', colors = [] }) {
  const effectRef = useRef(null);

  useEffect(() => {
    if (!effectRef.current) return;

    const element = effectRef.current;
    
    // Generate celebration particles based on type
    const generateParticles = () => {
      const particleCount = intensity === 'subtle' ? 20 : intensity === 'medium' ? 50 : 100;
      const defaultColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
      const particleColors = colors.length > 0 ? colors : defaultColors;

      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = `celebration-particle celebration-particle--${type}`;
        particle.style.setProperty('--particle-color', particleColors[i % particleColors.length]);
        particle.style.setProperty('--particle-delay', `${Math.random() * 0.5}s`);
        particle.style.setProperty('--particle-duration', `${duration / 1000}s`);
        particle.style.setProperty('--particle-x', `${Math.random() * 100}%`);
        particle.style.setProperty('--particle-y', `${Math.random() * 100}%`);
        
        element.appendChild(particle);
      }
    };

    generateParticles();

    const cleanup = setTimeout(() => {
      element.innerHTML = '';
    }, duration);

    return () => {
      clearTimeout(cleanup);
      element.innerHTML = '';
    };
  }, [type, duration, intensity, colors]);

  return <div ref={effectRef} className={`celebration-effect celebration-effect--${type}`}></div>;
}

// Animation Performance Monitor
export function AnimationPerformanceMonitor() {
  const { performanceMode, setPerformanceMode } = useAnimations();
  const [fps, setFps] = useState(60);
  const [frameCount, setFrameCount] = useState(0);
  const lastTime = useRef(performance.now());

  useEffect(() => {
    let animationId;

    const measurePerformance = (currentTime) => {
      const deltaTime = currentTime - lastTime.current;
      
      if (deltaTime >= 1000) { // Update every second
        const currentFps = Math.round((frameCount * 1000) / deltaTime);
        setFps(currentFps);
        setFrameCount(0);
        lastTime.current = currentTime;

        // Auto-adjust performance mode based on FPS
        if (currentFps < 30 && performanceMode !== 'performance') {
          setPerformanceMode('performance');
          console.warn('Low FPS detected, switching to performance mode');
        } else if (currentFps > 50 && performanceMode === 'performance') {
          setPerformanceMode('balanced');
          console.info('FPS improved, switching to balanced mode');
        }
      } else {
        setFrameCount(prev => prev + 1);
      }

      animationId = requestAnimationFrame(measurePerformance);
    };

    animationId = requestAnimationFrame(measurePerformance);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [frameCount, performanceMode, setPerformanceMode]);

  // Only show in development mode
  if (import.meta.env.PROD) return null;

  return (
    <div className="animation-performance-monitor">
      <div className="performance-indicator">
        <span className="performance-label">FPS:</span>
        <span className={`performance-value ${fps < 30 ? 'performance-value--warning' : ''}`}>
          {fps}
        </span>
      </div>
      <div className="performance-mode">
        <span className="performance-label">Mode:</span>
        <span className="performance-value">{performanceMode}</span>
      </div>
    </div>
  );
}

export default AnimationProvider;
