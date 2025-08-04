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
    
    if (hasImages) {
      return optionCount <= 2 ? 'grid-horizontal' : 'grid-2x2';
    }
    
    return optionCount <= 2 ? 'list-horizontal' : 'list-vertical';
  };

  return (
    <div className="multiple-choice-question">
      <div className="question-header">
        <QuestionImage 
          src={question.image_url}
          alt={`質問 ${question.questionNumber || ''} の画像`}
          className="main-question-image"
          placeholder={true}
          lazy={false}
        />
        
        <h2 className="question-text">{question.question}</h2>
      </div>
      
      <div className={`options-container ${getLayoutClass()}`}>
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
              className="multiple-choice-option"
              showIndex={true}
            />
          );
        })}
      </div>
      
      {selected !== null && !answerResult && (
        <div className="answer-submitted">
          <div className="submitted-indicator">
            <div className="checkmark">✓</div>
            <span>回答送信済み</span>
          </div>
          <p className="waiting-message">他のプレイヤーの回答を待っています...</p>
        </div>
      )}
    </div>
  );
};

export default MultipleChoiceQuestion;
