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

  return (
    <div className="true-false-question">
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
      
      <div className="true-false-container">
        <AnswerOption
          option={trueOption || "正しい (○)"}
          index={0}
          questionType="true_false"
          isSelected={selected === 0}
          isCorrect={answerResult && answerResult.correctAnswer === 0}
          isDisabled={selected !== null || timer <= 0}
          showCorrectAnswer={answerResult && question.showCorrectAnswer}
          imageUrl={question._dbData?.answers?.[0]?.image_url}
          onClick={onAnswer}
          className="true-false-option true-option"
          variant="true"
        />
        
        <div className="vs-divider">
          <span>VS</span>
        </div>
        
        <AnswerOption
          option={falseOption || "間違い (×)"}
          index={1}
          questionType="true_false"
          isSelected={selected === 1}
          isCorrect={answerResult && answerResult.correctAnswer === 1}
          isDisabled={selected !== null || timer <= 0}
          showCorrectAnswer={answerResult && question.showCorrectAnswer}
          imageUrl={question._dbData?.answers?.[1]?.image_url}
          onClick={onAnswer}
          className="true-false-option false-option"
          variant="false"
        />
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

export default TrueFalseQuestion;
