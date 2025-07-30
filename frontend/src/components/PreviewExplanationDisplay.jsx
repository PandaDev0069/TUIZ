import { useEffect } from 'react';
import './previewExplanationDisplay.css';

function PreviewExplanationDisplay({ question, selectedAnswer, onClose, isVisible }) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000); // Auto close after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible || !question) return null;

  const correctAnswer = question.answers?.find(answer => answer.isCorrect);
  const userAnswer = selectedAnswer !== null ? question.answers[selectedAnswer] : null;
  const isCorrect = userAnswer?.isCorrect || false;

  return (
    <div className="preview-explanation-overlay">
      <div className="preview-explanation-modal">
        <div className="explanation-header">
          <h2>📖 解説</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="explanation-content">
          {/* Question Recap */}
          <div className="question-recap">
            <h3>問題</h3>
            <p>{question.text}</p>
          </div>

          {/* Answer Result */}
          <div className={`answer-result ${isCorrect ? 'correct' : 'incorrect'}`}>
            <div className="result-icon">
              {isCorrect ? '✅' : '❌'}
            </div>
            <div className="result-text">
              {isCorrect ? '正解です！' : '不正解でした'}
            </div>
          </div>

          {/* Correct Answer */}
          <div className="correct-answer-section">
            <h4>正解</h4>
            <div className="correct-answer">
              {correctAnswer?.text}
            </div>
          </div>

          {/* Your Answer (if different) */}
          {!isCorrect && userAnswer && (
            <div className="user-answer-section">
              <h4>あなたの回答</h4>
              <div className="user-answer">
                {userAnswer.text}
              </div>
            </div>
          )}

          {/* Explanation Text */}
          {(question.explanation_text || question.explanation) && (
            <div className="explanation-section">
              {question.explanation_title && (
                <h4>{question.explanation_title}</h4>
              )}
              <div className="explanation-text">
                {question.explanation_text || question.explanation}
              </div>
            </div>
          )}

          {/* Explanation Image */}
          {question.explanation_image_url && (
            <div className="explanation-image">
              <img src={question.explanation_image_url} alt="解説画像" />
            </div>
          )}
        </div>

        <div className="explanation-footer">
          <button className="continue-button" onClick={onClose}>
            続行 ▶️
          </button>
        </div>
      </div>
    </div>
  );
}

export default PreviewExplanationDisplay;
