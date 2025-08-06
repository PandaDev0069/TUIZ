import React from 'react';
import '../QuestionRenderer.css';

/**
 * TimerComponent - Exact copy of QuestionRenderer timer implementation
 * 
 * Props:
 * - timer: Current timer value in seconds
 * - timeLimit: Total time limit in milliseconds (like QuestionRenderer's question.timeLimit)
 */
const TimerComponent = ({ timer, timeLimit }) => {
  // Calculate strokeDashoffset using exact QuestionRenderer formula
  const strokeDashoffset = timeLimit ? 
    283 - (283 * ((timeLimit / 1000 - timer) / (timeLimit / 1000))) : 0;

  return (
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
              // EXACT QuestionRenderer formula: 283 - (283 * ((timeLimit/1000 - timer) / (timeLimit/1000)))
              // Simplified: 283 * (timer / (timeLimit/1000))
              strokeDashoffset: timeLimit ? 
                283 - (283 * ((timeLimit / 1000 - timer) / (timeLimit / 1000))) : 0,
              transition: 'stroke-dashoffset 1s linear'
            }}
          />
        </svg>
      </div>
    </div>
  );
};

export default TimerComponent;
