import React from 'react';
import MultipleChoiceQuestion from './MultipleChoiceQuestion';
import TrueFalseQuestion from './TrueFalseQuestion';
import './QuestionRenderer.css';

const QuestionRenderer = ({ 
  question, 
  selected, 
  answerResult, 
  timer, 
  onAnswer,
  showProgress = true,
  showTimer = true 
}) => {
  if (!question) return null;

  const getQuestionTypeComponent = () => {
    switch (question.type) {
      case 'true_false':
        return (
          <TrueFalseQuestion
            question={question}
            selected={selected}
            answerResult={answerResult}
            timer={timer}
            onAnswer={onAnswer}
          />
        );
      case 'multiple_choice_4':
      case 'multiple_choice_3':
      case 'multiple_choice_2':
      case 'multiple_choice':
      default:
        return (
          <MultipleChoiceQuestion
            question={question}
            selected={selected}
            answerResult={answerResult}
            timer={timer}
            onAnswer={onAnswer}
          />
        );
    }
  };

  return (
    <div className="question-renderer">
      {showProgress && question.showProgress && (
        <div className="question-progress">
          <div className="progress-info">
            <span className="question-number">
              質問 {question.questionNumber || '?'} / {question.totalQuestions || '?'}
            </span>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{
                  width: `${question.questionNumber && question.totalQuestions ? 
                    (question.questionNumber / question.totalQuestions) * 100 : 0}%`
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showTimer && (
        <div className={`question-timer ${timer <= 0 ? 'time-up' : ''} ${timer <= 5 ? 'urgent' : ''}`}>
          <div className="timer-circle">
            <div className="timer-text">
              {timer <= 0 ? '時間切れ!' : timer}
            </div>
            <svg className="timer-ring" viewBox="0 0 100 100">
              <circle
                className="timer-ring-background"
                cx="50"
                cy="50"
                r="45"
                fill="transparent"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="4"
              />
              <circle
                className="timer-ring-progress"
                cx="50"
                cy="50"
                r="45"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                style={{
                  strokeDasharray: '283',
                  strokeDashoffset: question.timeLimit ? 
                    283 - (283 * ((question.timeLimit / 1000 - timer) / (question.timeLimit / 1000))) : 0,
                  transition: 'stroke-dashoffset 1s linear'
                }}
              />
            </svg>
          </div>
        </div>
      )}

      <div className="question-type-indicator">
        <span className={`type-badge ${question.type}`}>
          {question.type === 'true_false' ? '○×' : 
           question.type === 'multiple_choice_4' ? '4択' : 
           question.type === 'multiple_choice_3' ? '3択' : 
           question.type === 'multiple_choice_2' ? '2択' : 
           question.type === 'multiple_choice' ? '選択' : '質問'}
        </span>
      </div>

      <div className="question-content-wrapper">
        {getQuestionTypeComponent()}
      </div>
    </div>
  );
};

export default QuestionRenderer;
