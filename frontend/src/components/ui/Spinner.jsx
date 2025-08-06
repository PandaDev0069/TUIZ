import React from 'react';
import './Spinner.css';

/**
 * Spinner Component - BEM Methodology
 * 
 * Usage:
 * <Spinner /> - Default spinner
 * <Spinner size="small" /> - Small spinner  
 * <Spinner size="large" /> - Large spinner
 * <Spinner theme="primary" text="Loading..." /> - Primary theme with text
 * <Spinner centered /> - Centered spinner
 * <Spinner inline /> - Inline spinner
 */

const Spinner = ({ 
  size = 'default', 
  theme = 'default',
  text = '',
  centered = false,
  inline = false,
  className = ''
}) => {
  const spinnerClasses = [
    'spinner',
    size === 'small' ? 'spinner--small' : '',
    size === 'large' ? 'spinner--large' : '',
    theme === 'dark' ? 'spinner--dark' : '',
    theme === 'primary' ? 'spinner--primary' : '',
    theme === 'success' ? 'spinner--success' : '',
    centered ? 'spinner--centered' : '',
    inline ? 'spinner--inline' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={spinnerClasses}>
      <div className="spinner__icon"></div>
      {text && <div className="spinner__text">{text}</div>}
    </div>
  );
};

export default Spinner;
