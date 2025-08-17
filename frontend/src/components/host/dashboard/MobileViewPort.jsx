import React from 'react';
import './MobileViewPort.css';

/**
 * MobileViewPort - Flexible mobile-sized viewport container
 * Standard mobile dimensions for rendering content with multiple sizing modes
 */
function MobileViewPort({ 
  children, 
  className = "",
  mode = "default", // "default", "scale-to-fit", "auto-scale", "compact", "wide"
  size = "default" // "default", "small", "large", "modern" 
}) {
  const modeClass = mode !== "default" ? `mobile-viewport--${mode}` : "";
  const sizeClass = size !== "default" ? `mobile-viewport--${size}` : "";
  
  return (
    <div className={`mobile-viewport ${modeClass} ${sizeClass} ${className}`}>
      <div className="mobile-viewport__content">
        {children}
      </div>
    </div>
  );
}

export default MobileViewPort;
