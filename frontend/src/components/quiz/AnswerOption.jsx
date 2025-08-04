/**
 * AnswerOption.jsx
 * 
 * Component for displaying answer options with support for text + image combinations,
 * accessibility features, and interactive states.
 */

import { useState } from 'react';
import './AnswerOption.css';

const AnswerOption = ({ 
  option,
  index,
  questionType,
  isSelected,
  isCorrect,
  isDisabled,
  showCorrectAnswer,
  imageUrl,
  onClick,
  className = ""
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleClick = () => {
    if (!isDisabled && onClick) {
      onClick(index);
    }
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  const getOptionText = () => {
    // Always use the provided option text, regardless of question type
    return option;
  };

  const getAriaLabel = () => {
    let label = `選択肢 ${index + 1}: ${getOptionText()}`;
    if (imageUrl && !imageError) {
      label += ' (画像付き)';
    }
    if (isSelected) {
      label += ' - 選択済み';
    }
    if (showCorrectAnswer && isCorrect) {
      label += ' - 正解';
    }
    return label;
  };

  const optionClasses = [
    'quiz-answer-option',
    className,
    questionType,
    isSelected && 'selected',
    isDisabled && 'disabled',
    showCorrectAnswer && isCorrect && 'correct-answer',
    showCorrectAnswer && isSelected && !isCorrect && 'wrong-answer',
    imageUrl && 'has-image',
    imageUrl && !imageError && 'image-loaded'
  ].filter(Boolean).join(' ');

  return (
    <li
      className={optionClasses}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-label={getAriaLabel()}
      aria-pressed={isSelected}
      aria-disabled={isDisabled}
    >
      <div className="quiz-option-content">
        {/* Image section */}
        {imageUrl && (
          <div className="quiz-option-image-container">
            {!imageError ? (
              <>
                {!imageLoaded && (
                  <div className="quiz-option-image-placeholder">
                    <div className="quiz-mini-spinner"></div>
                  </div>
                )}
                <img
                  src={imageUrl}
                  alt={`選択肢 ${index + 1} の画像`}
                  className={`quiz-option-image ${imageLoaded ? 'loaded' : 'loading'}`}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  loading="lazy"
                  draggable={false}
                />
              </>
            ) : (
              <div className="quiz-option-image-error">
                <span className="quiz-error-icon">🖼️</span>
              </div>
            )}
          </div>
        )}

        {/* Text section */}
        <div className="quiz-option-text-container">
          <span className="quiz-option-text">{getOptionText()}</span>
          
          {/* Option indicators */}
          <div className="quiz-option-indicators">
            {isSelected && (
              <span className="quiz-selected-indicator" aria-hidden="true">
                ✓
              </span>
            )}
            {showCorrectAnswer && isCorrect && (
              <span className="quiz-correct-indicator" aria-hidden="true">
                ✅
              </span>
            )}
            {showCorrectAnswer && isSelected && !isCorrect && (
              <span className="quiz-wrong-indicator" aria-hidden="true">
                ❌
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Selection highlight border */}
      <div className="quiz-option-border" aria-hidden="true"></div>
    </li>
  );
};

export default AnswerOption;
