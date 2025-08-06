import React from 'react';
import QuestionImage from './QuestionImage';
import AnswerOption from './AnswerOption';
import './TrueFalseQuestion.css';

const TrueFalseQuestion = ({ 
  question, 
  selected, 
  answerResult, 
  timer, 
  onAnswer 
}) => {
  if (!question) return null;

  // For true/false questions, we expect exactly 2 options
  const trueOption = question.options[0];
  const falseOption = question.options[1];

  // Enhanced option display with O/X symbols
  const getEnhancedTrueOption = () => {
    const baseText = trueOption || "正しい";
    // Add O symbol if not already present
    if (!baseText.includes('○') && !baseText.includes('O')) {
      return `○ ${baseText}`;
    }
    return baseText;
  };

  const getEnhancedFalseOption = () => {
    const baseText = falseOption || "間違い";
    // Add X symbol if not already present
    if (!baseText.includes('×') && !baseText.includes('X')) {
      return `× ${baseText}`;
    }
    return baseText;
  };

  return (
    <div className="quiz-true-false-question">
      <div className="quiz-question-header">
        <QuestionImage 
          src={question._dbData?.image_url}
          alt={`質問 ${question.questionNumber || ''} の画像`}
          className="quiz-main-question-image"
          placeholder={true}
          lazy={false}
        />
        
        <h2 className="quiz-question-text">{question.question}</h2>
      </div>
      
      <div className="quiz-true-false-container" id="quiz-options-focus-target">
        <AnswerOption
          option={getEnhancedTrueOption()}
          index={0}
          questionType="true_false"
          isSelected={selected === 0}
          isCorrect={answerResult && answerResult.correctAnswer === 0}
          isDisabled={selected !== null || timer <= 0}
          showCorrectAnswer={answerResult && question.showCorrectAnswer}
          imageUrl={question._dbData?.answers?.[0]?.image_url}
          onClick={onAnswer}
          className="quiz-true-false-option quiz-true-option"
        />
        
        <div className="quiz-vs-divider">
          <span>VS</span>
        </div>
        
        <AnswerOption
          option={getEnhancedFalseOption()}
          index={1}
          questionType="true_false"
          isSelected={selected === 1}
          isCorrect={answerResult && answerResult.correctAnswer === 1}
          isDisabled={selected !== null || timer <= 0}
          showCorrectAnswer={answerResult && question.showCorrectAnswer}
          imageUrl={question._dbData?.answers?.[1]?.image_url}
          onClick={onAnswer}
          className="quiz-true-false-option quiz-false-option"
        />
      </div>
      
      {selected !== null && !answerResult && (
        <div className="quiz-answer-submitted">
          <div className="quiz-submitted-indicator">
            <div className="quiz-checkmark">✓</div>
            <span>回答送信済み</span>
          </div>
          <p className="quiz-waiting-message">他のプレイヤーの回答を待っています...</p>
        </div>
      )}
    </div>
  );
};

export default TrueFalseQuestion;
