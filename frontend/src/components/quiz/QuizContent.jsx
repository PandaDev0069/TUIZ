import React from 'react';
import QuestionRenderer from './QuestionRenderer';
import ConnectionStatus from '../ConnectionStatus';
import './QuizContent.css';

/**
 * QuizContent - Pure quiz rendering component without routing dependencies
 * Can be used both in normal Quiz page and inline preview
 */
function QuizContent({ 
  question,
  selected,
  answerResult,
  timer,
  score = 0,
  streak = 0,
  questionScore = 0,
  onAnswer,
  showConnectionStatus = true,
  previewMode = false,
  isHostView = false
}) {
  if (!question) {
    return (
      <div className="quiz-content quiz-content--loading">
        <div className="quiz-loading">
          {previewMode ? (
            <div className="quiz-preview-placeholder">
              <h3>クイズプレビュー</h3>
              <p>質問を読み込み中...</p>
            </div>
          ) : (
            <div className="quiz-loading-skeleton">
              <div className="loading-bar"></div>
              <div className="loading-text">質問を読み込み中...</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`quiz-content ${previewMode ? 'quiz-content--preview' : ''}`}>
      {/* Connection Status - only show in real mode */}
      {showConnectionStatus && !previewMode && (
        <ConnectionStatus 
          position="top-left"
          showText={false}
          compact={true}
          className="quiz__connection-status"
        />
      )}
      
      <div className="quiz-page">
        <div className="quiz-header">
          <div className="quiz-player-stats">
            <div className="quiz-current-score">
              {isHostView ? 'ホストビュー' : `スコア: ${score}`}
            </div>
            {!isHostView && streak > 1 && <div className="quiz-streak-badge">🔥 {streak}連続!</div>}
            {!isHostView && questionScore > 0 && <div className="quiz-last-points">+{questionScore}</div>}
            {isHostView && (
              <div className="quiz-host-indicator">
                👁️ プレイヤーと同期中
              </div>
            )}
          </div>
        </div>

        <QuestionRenderer
          key={question?.id || question?.questionNumber}
          question={question}
          selected={selected}
          answerResult={answerResult}
          timer={timer}
          onAnswer={onAnswer}
          showProgress={true}
          showTimer={true}
          previewMode={previewMode}
          isHostView={isHostView}
        />
      </div>
    </div>
  );
}

export default QuizContent;
