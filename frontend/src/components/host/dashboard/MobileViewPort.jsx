import React from 'react';
import './MobileViewPort.css';

/**
 * MobileViewPort - Simple mobile-sized viewport container
 * Standard mobile dimensions for rendering content
 */
function MobileViewPort({ children, className = "" }) {
  return (
    <div className={`mobile-viewport ${className}`}>
      <div className="mobile-viewport__content">
        {children}
      </div>
    </div>
  );
}

export default MobileViewPort;
