import React from 'react';
import './LoadingSkeleton.css';

const LoadingSkeleton = ({ 
  type = 'question', 
  count = 1, 
  className = '',
  animated = true 
}) => {
  const renderQuestionSkeleton = () => (
    <div className={`skeleton-question ${animated ? 'animated' : ''}`}>
      <div className="skeleton-timer"></div>
      <div className="skeleton-progress"></div>
      <div className="skeleton-image"></div>
      <div className="skeleton-title"></div>
      <div className="skeleton-options">
        <div className="skeleton-option"></div>
        <div className="skeleton-option"></div>
        <div className="skeleton-option"></div>
        <div className="skeleton-option"></div>
      </div>
    </div>
  );

  const renderLeaderboardSkeleton = () => (
    <div className={`skeleton-leaderboard ${animated ? 'animated' : ''}`}>
      <div className="skeleton-header"></div>
      <div className="skeleton-players">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton-player">
            <div className="skeleton-rank"></div>
            <div className="skeleton-name"></div>
            <div className="skeleton-score"></div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderImageSkeleton = () => (
    <div className={`skeleton-image-only ${animated ? 'animated' : ''}`}></div>
  );

  const renderTextSkeleton = () => (
    <div className={`skeleton-text ${animated ? 'animated' : ''}`}>
      <div className="skeleton-line"></div>
      <div className="skeleton-line short"></div>
    </div>
  );

  const renderSkeleton = () => {
    switch (type) {
      case 'question':
        return renderQuestionSkeleton();
      case 'leaderboard':
        return renderLeaderboardSkeleton();
      case 'image':
        return renderImageSkeleton();
      case 'text':
        return renderTextSkeleton();
      default:
        return renderQuestionSkeleton();
    }
  };

  return (
    <div className={`loading-skeleton ${className}`}>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="skeleton-item">
          {renderSkeleton()}
        </div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;
