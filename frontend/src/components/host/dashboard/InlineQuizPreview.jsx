import React, { useState, useEffect } from 'react';
import QuizContent from '../../quiz/QuizContent';
import './InlineQuizPreview.css';

/**
 * InlineQuizPreview - Renders quiz content inside iPhone viewport
 * Phase 1: Basic implementation with mock data (NO ROUTING)
 */
function InlineQuizPreview({ 
  disableInteraction = true,
  gameState = null 
}) {
  // Mock quiz state for preview
  const [quizState, setQuizState] = useState({
    question: {
      id: 1,
      question: "これはプレビュー質問です。どの選択肢が正しいですか？",  // Changed from 'text' to 'question'
      type: "multiple_choice",
      options: [                                                               // Changed to array of strings
        'TypeScript - 型安全なJavaScript',
        'JavaScript - 動的プログラミング言語', 
        'Python - シンプルで読みやすい言語',
        'React - ユーザーインターフェースライブラリ'
      ],
      timeLimit: 30,
      questionNumber: 1,
      _dbData: {
        image_url: null,
        answers: [
          { image_url: null },
          { image_url: null },
          { image_url: null },
          { image_url: null }
        ]
      }
    },
    selected: null,
    answerResult: null,
    timer: 25,
    score: 1250,
    streak: 3,
    questionScore: 0
  });

  // Simulate timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setQuizState(prev => ({
        ...prev,
        timer: prev.timer > 0 ? prev.timer - 1 : 0
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Mock answer handler
  const handleAnswer = (selectedIndex) => {
    if (disableInteraction) return;
    
    setQuizState(prev => ({
      ...prev,
      selected: selectedIndex,
      answerResult: { correct: selectedIndex === 3 } // React is the correct answer (index 3)
    }));
  };

  return (
    <div className="inline-quiz-preview">
      {/* Interaction blocker overlay */}
      {disableInteraction && (
        <div 
          className="inline-quiz-preview__interaction-blocker"
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Preview badge */}
      <div className="inline-quiz-preview__badge">
        PREVIEW
      </div>

      {/* Quiz content - NO ROUTER HERE */}
      <div className="inline-quiz-preview__content">
        <QuizContent
          question={quizState.question}
          selected={quizState.selected}
          answerResult={quizState.answerResult}
          timer={quizState.timer}
          score={quizState.score}
          streak={quizState.streak}
          questionScore={quizState.questionScore}
          onAnswer={handleAnswer}
          showConnectionStatus={false}
          previewMode={true}
        />
      </div>
    </div>
  );
}

export default InlineQuizPreview;
