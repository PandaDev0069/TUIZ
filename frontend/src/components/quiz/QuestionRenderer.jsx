import React, { useEffect, useRef } from 'react';
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

  // Refs for auto-scroll functionality
  const questionContentRef = useRef(null);
  const optionsRef = useRef(null);

  // Auto-scroll to options when new question loads
  useEffect(() => {
    if (question && questionContentRef.current) {
      // Small delay to ensure DOM is fully rendered
      const scrollTimeout = setTimeout(() => {
        // Check if this is a mobile device
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
          // On mobile, we want to scroll so the options are visible
          // First, try to get the options container
          const optionsContainer = questionContentRef.current.querySelector('.quiz-options-container, .quiz-true-false-container');
          
          if (optionsContainer) {
            console.log('📱 Auto-scrolling to quiz options on mobile');
            
            // Calculate ideal scroll position
            const containerRect = optionsContainer.getBoundingClientRect();
            const questionRect = questionContentRef.current.getBoundingClientRect();
            
            // Scroll to show the top of options with some padding
            const targetScrollTop = window.pageYOffset + containerRect.top - window.innerHeight * 0.3;
            
            window.scrollTo({
              top: Math.max(0, targetScrollTop),
              behavior: 'smooth'
            });
          } else {
            // Fallback: scroll to the question content wrapper
            questionContentRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest'
            });
          }
        } else {
          // On desktop, center the question content
          questionContentRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        }
      }, 300); // Delay to allow image loading and layout

      return () => clearTimeout(scrollTimeout);
    }
  }, [question?.id]); // Trigger when question ID changes

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
    <div className="quiz-question-renderer">
      {showProgress && question.showProgress && (
        <div className="quiz-question-progress">
          <div className="quiz-progress-info">
            <span className="quiz-question-number">
              質問 {question.questionNumber || '?'} / {question.totalQuestions || '?'}
            </span>
            <div className="quiz-progress-bar">
              <div 
                className="quiz-progress-fill" 
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
        <div className={`quiz-question-timer ${timer <= 0 ? 'time-up' : ''} ${timer <= 5 ? 'urgent' : ''}`}>
          <div className="quiz-timer-circle">
            <div className="quiz-timer-text">
              {timer <= 0 ? '時間切れ!' : timer}
            </div>
            <svg className="quiz-timer-ring" viewBox="0 0 100 100">
              <circle
                className="quiz-timer-ring-background"
                cx="50"
                cy="50"
                r="45"
                fill="transparent"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="4"
              />
              <circle
                className="quiz-timer-ring-progress"
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

      <div className="quiz-question-type-indicator">
        <span className={`quiz-type-badge ${question.type}`}>
          {question.type === 'true_false' ? '○×' : 
           question.type === 'multiple_choice_4' ? '4択' : 
           question.type === 'multiple_choice_3' ? '3択' : 
           question.type === 'multiple_choice_2' ? '2択' : 
           question.type === 'multiple_choice' ? '選択' : '質問'}
        </span>
      </div>

      <div className="quiz-question-content-wrapper" ref={questionContentRef}>
        {getQuestionTypeComponent()}
      </div>
    </div>
  );
};

export default QuestionRenderer;
