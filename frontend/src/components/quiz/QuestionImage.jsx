/**
 * QuestionImage.jsx
 * 
 * Component for displaying question images with progressive loading,
 * error handling, and accessibility features.
 */

import { useState, useEffect } from 'react';
import LoadingSkeleton from '../LoadingSkeleton';
import './QuestionImage.css';

const QuestionImage = ({ 
  src, 
  alt = "質問画像", 
  className = "", 
  onLoad, 
  onError,
  placeholder = true,
  lazy = true 
}) => {
  const [imageState, setImageState] = useState('loading');
  const [actualSrc, setActualSrc] = useState(lazy ? null : src);

  useEffect(() => {
    if (!src) {
      setImageState('error');
      return;
    }

    // For lazy loading, start loading when component mounts
    if (lazy && !actualSrc) {
      setActualSrc(src);
    }
  }, [src, lazy, actualSrc]);

  const handleLoad = (e) => {
    setImageState('loaded');
    onLoad && onLoad(e);
  };

  const handleError = (e) => {
    setImageState('error');
    onError && onError(e);
  };

  const handleRetry = () => {
    setImageState('loading');
    // Force reload by adding timestamp
    const retryUrl = src.includes('?') 
      ? `${src}&retry=${Date.now()}` 
      : `${src}?retry=${Date.now()}`;
    setActualSrc(retryUrl);
  };

  // Don't render anything if no src provided
  if (!src) {
    return null;
  }

  return (
    <div className={`quiz-question-image-container ${className} ${imageState}`}>
      {imageState === 'loading' && placeholder && (
        <div className="quiz-image-placeholder">
          <LoadingSkeleton type="image" count={1} />
        </div>
      )}
      
      {imageState === 'error' && (
        <div className="quiz-image-error">
          <div className="quiz-error-icon">🖼️</div>
          <span className="quiz-error-text">画像を読み込めませんでした</span>
          <button 
            className="quiz-retry-button" 
            onClick={handleRetry}
            aria-label="画像の再読み込み"
          >
            再試行
          </button>
        </div>
      )}
      
      {actualSrc && (
        <img
          src={actualSrc}
          alt={alt}
          className={`quiz-question-image ${imageState === 'loaded' ? 'loaded' : 'loading'}`}
          onLoad={handleLoad}
          onError={handleError}
          loading={lazy ? "lazy" : "eager"}
          draggable={false}
        />
      )}
    </div>
  );
};

export default QuestionImage;
