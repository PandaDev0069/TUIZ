import React, { useState, useEffect } from 'react';
import { useManagedInterval, useManagedTimeout } from '../../utils/timerManager';
import './ExplanationDisplay.css';

const ExplanationDisplay = ({ 
  explanation, 
  isVisible, 
  duration = 10000, 
  onClose,
  showTimer = true,
  autoClose = true 
}) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isClosing, setIsClosing] = useState(false);

  // Use managed interval for countdown
  useManagedInterval(
    () => {
      if (!isVisible || !autoClose) return;
      
      setTimeLeft(prev => {
        if (prev <= 100) {
          setIsClosing(true);
          // Use managed timeout for animation delay
          setTimeout(() => onClose?.(), 300);
          return 0;
        }
        return prev - 100;
      });
    },
    100,
    [isVisible, autoClose, onClose]
  );

  // Reset timer when visibility or duration changes
  useEffect(() => {
    if (isVisible) {
      setTimeLeft(duration);
      setIsClosing(false);
    }
  }, [isVisible, duration]);

  // Handle manual close with managed timeout
  const handleManualClose = () => {
    setIsClosing(true);
    setTimeout(() => onClose?.(), 300);
  };

  if (!isVisible || !explanation) return null;

  const progressPercent = autoClose ? (timeLeft / duration) * 100 : 100;

  return (
    <div className={`quiz-explanation-overlay ${isClosing ? 'closing' : ''}`}>
      <div className="quiz-explanation-container">
        {showTimer && autoClose && (
          <div className="quiz-explanation-timer">
            <div className="quiz-timer-bar">
              <div 
                className="quiz-timer-progress" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="quiz-timer-text">
              {Math.ceil(timeLeft / 1000)}s
            </span>
          </div>
        )}

        <div className="quiz-explanation-content">
          {explanation.title && (
            <h3 className="quiz-explanation-title">{explanation.title}</h3>
          )}

          <div className="quiz-explanation-body">
            {explanation.image_url && (
              <div className="quiz-explanation-image-container">
                <img 
                  src={explanation.image_url} 
                  alt={explanation.title || "Explanation image"}
                  className="quiz-explanation-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}

            {explanation.text && (
              <div className="quiz-explanation-text">
                {explanation.text.split('\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            )}
          </div>
        </div>

        {!autoClose && (
          <button 
            className="quiz-explanation-close-btn"
            onClick={handleManualClose}
            aria-label="Close explanation"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default ExplanationDisplay;
