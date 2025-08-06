import React from 'react';
import QuestionImage from './QuestionImage';
import AnswerOption from './AnswerOption';
import './MultipleChoiceQuestion.css';

const MultipleChoiceQuestion = ({ 
  question, 
  selected, 
  answerResult, 
  timer, 
  onAnswer 
}) => {
  if (!question) return null;

  const getLayoutClass = () => {
    const optionCount = question.options?.length || 0;
    const hasImages = question._dbData?.answers?.some(answer => answer.image_url);
    
    // Mobile-first responsive layouts based on option count
    switch (optionCount) {
      case 2:
        // Two options: side by side (horizontal)
        return 'layout-2-horizontal';
      case 3:
        // Three options: 2 on top, 1 below
        return 'layout-3-two-one';
      case 4:
        // Four options: 2x2 grid
        return 'layout-4-grid';
      default:
        // Fallback for other counts (5+) - vertical list
        return 'layout-vertical';
    }
  };

  return (
    <div className="quiz-multiple-choice-question">
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
      
      <div className={`quiz-options-container ${getLayoutClass()}`}>
        {question.options.map((opt, i) => {
          const optionImageUrl = question._dbData?.answers?.[i]?.image_url;
          
          return (
            <AnswerOption
              key={i}
              option={opt}
              index={i}
              questionType={question.type}
              isSelected={selected === i}
              isCorrect={answerResult && answerResult.correctAnswer === i}
              isDisabled={selected !== null || timer <= 0}
              showCorrectAnswer={answerResult && question.showCorrectAnswer}
              imageUrl={optionImageUrl}
              onClick={onAnswer}
              className="quiz-multiple-choice-option"
              showIndex={true}
            />
          );
        })}
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

export default MultipleChoiceQuestion;
