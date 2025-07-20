import React from 'react';
import './questionListPanel.css';

function QuestionListPanel({
  questions,
  currentIndex,
  setCurrentIndex,
  addNewQuestion,
  deleteQuestion,
  duplicateQuestion,
  moveQuestionUp,
  moveQuestionDown
}) {
  // Get question type for display
  const getQuestionType = (question) => {
    const answerCount = question.answers.length;
    const isMaruBatsu = question.answers.some(a => 
      a.text.includes('○') || a.text.includes('×') || 
      a.text.includes('正') || a.text.includes('誤')
    );
    
    if (answerCount === 2) {
      return isMaruBatsu ? '○×' : '2択';
    } else if (answerCount === 4) {
      return '4択';
    } else {
      return `${answerCount}択`;
    }
  };

  // Check if question is valid
  const isQuestionValid = (question) => {
    const hasValidText = question.text.trim().length > 0;
    const hasValidAnswers = question.answers.every(a => a.text.trim().length > 0);
    const hasCorrectAnswer = question.answers.some(a => a.isCorrect);
    return hasValidText && hasValidAnswers && hasCorrectAnswer;
  };

  // Get question preview text
  const getQuestionPreview = (question) => {
    if (question.text.trim()) {
      return question.text.length > 25 ? question.text.slice(0, 25) + '...' : question.text;
    }
    return '問題文を入力してください...';
  };

  return (
    <div className="question-list-panel">
      {/* Panel Header */}
      <div className="panel-header">
        <div className="panel-title">
          <span className="title-icon">📋</span>
          <span className="title-text">質問リスト</span>
        </div>
        <div className="panel-stats">
          <span className="question-count">{questions.length}問</span>
          <span className="valid-count">
            {questions.filter(isQuestionValid).length}完了
          </span>
        </div>
      </div>

      {/* Questions List */}
      <div className="questions-list">
        {questions.map((question, index) => {
          const isActive = index === currentIndex;
          const isValid = isQuestionValid(question);
          
          return (
            <div
              key={question.id}
              className={`question-item ${isActive ? 'active' : ''} ${isValid ? 'valid' : 'invalid'}`}
              onClick={() => setCurrentIndex(index)}
            >
              <div className="question-header">
                <div className="question-number">Q{index + 1}</div>
                <div className="question-type">{getQuestionType(question)}</div>
                <div className="question-status">
                  {isValid ? '✅' : '⚠️'}
                </div>
              </div>
              
              <div className="question-preview">
                {getQuestionPreview(question)}
              </div>
              
              <div className="question-meta">
                <span className="time-limit">{question.timeLimit}秒</span>
                <span className="points">
                  {question.points === '0' ? '0点' : 
                   question.points === 'double' ? '2倍' : '標準'}
                </span>
              </div>

              {/* Question Actions */}
              <div className="question-actions">
                <button
                  className="action-btn move-up"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveQuestionUp(index);
                  }}
                  disabled={index === 0}
                  title="上に移動"
                >
                  ⬆️
                </button>
                
                <button
                  className="action-btn move-down"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveQuestionDown(index);
                  }}
                  disabled={index === questions.length - 1}
                  title="下に移動"
                >
                  ⬇️
                </button>
                
                <button
                  className="action-btn duplicate"
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateQuestion(index);
                  }}
                  title="複製"
                >
                  📋
                </button>
                
                <button
                  className="action-btn delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteQuestion(index);
                  }}
                  disabled={questions.length <= 1}
                  title="削除"
                >
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Question Button */}
      <div className="panel-footer">
        <button className="add-question-btn" onClick={addNewQuestion}>
          <span className="add-icon">➕</span>
          <span className="add-text">新しい質問を追加</span>
        </button>
      </div>

      {/* Quick Stats */}
      <div className="panel-summary">
        <div className="summary-title">クイズ概要</div>
        <div className="summary-stats">
          <div className="stat-row">
            <span className="stat-label">総問題数:</span>
            <span className="stat-value">{questions.length}問</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">予想時間:</span>
            <span className="stat-value">
              {Math.ceil(questions.reduce((total, q) => total + q.timeLimit + 5, 0) / 60)}分
            </span>
          </div>
          <div className="stat-row">
            <span className="stat-label">完成状況:</span>
            <span className="stat-value">
              {Math.round((questions.filter(isQuestionValid).length / questions.length) * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuestionListPanel;
