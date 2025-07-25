import { useState } from 'react';
import QuestionBuilder from './QuestionBuilder';
import './questionsForm.css';

function QuestionsForm({ questions, setQuestions }) {
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // Add new question
  const addQuestion = () => {
    const newQuestion = {
      id: Date.now() + Math.random(),
      text: "",
      image: "",
      imageFile: null,
      question_type: "multiple_choice",
      timeLimit: 30,
      points: 100,
      difficulty: "medium",
      explanation: "", // Backward compatibility
      explanation_title: "",
      explanation_text: "",
      explanation_image: "", // For uploaded image preview
      explanation_imageFile: null, // For uploaded image file
      explanation_image_url: "", // For image URL from backend
      order_index: questions.length,
      answers: [
        { 
          id: Date.now() + Math.random() + 1, 
          text: "", 
          isCorrect: false, 
          image: "", 
          imageFile: null,
          order_index: 0,
          answer_explanation: ""
        },
        { 
          id: Date.now() + Math.random() + 2, 
          text: "", 
          isCorrect: false, 
          image: "", 
          imageFile: null,
          order_index: 1,
          answer_explanation: ""
        },
      ],
    };
    
    const newQuestions = [...questions, newQuestion];
    setQuestions(newQuestions);
    setActiveQuestionIndex(newQuestions.length - 1);
  };

  // Delete question
  const deleteQuestion = (index) => {
    if (questions.length > 1) {
      const newQuestions = questions
        .filter((_, i) => i !== index)
        .map((question, newIndex) => ({ ...question, order_index: newIndex }));
      setQuestions(newQuestions);
      
      // Adjust active index if necessary
      if (activeQuestionIndex >= newQuestions.length) {
        setActiveQuestionIndex(newQuestions.length - 1);
      } else if (activeQuestionIndex > index) {
        setActiveQuestionIndex(activeQuestionIndex - 1);
      }
    }
  };

  // Update specific question
  const updateQuestion = (index, updatedQuestion) => {
    const newQuestions = [...questions];
    newQuestions[index] = updatedQuestion;
    setQuestions(newQuestions);
  };

  // Duplicate question
  const duplicateQuestion = (index) => {
    const questionToDuplicate = questions[index];
    
    // Generate the copy name with proper numbering
    const generateCopyName = (originalText) => {
      const baseText = originalText.replace(/\s*\(コピー\d*\)$/, ''); // Remove existing copy suffix
      const existingCopies = questions
        .map(q => q.text)
        .filter(text => text.startsWith(baseText))
        .filter(text => text.match(/\(コピー\d*\)$/));
      
      if (existingCopies.length === 0) {
        return baseText + ' (コピー)';
      } else {
        // Find the highest copy number
        const copyNumbers = existingCopies.map(text => {
          const match = text.match(/\(コピー(\d*)\)$/);
          if (match) {
            return match[1] === '' ? 1 : parseInt(match[1]);
          }
          return 1;
        });
        const maxNumber = Math.max(...copyNumbers);
        return baseText + ` (コピー${maxNumber + 1})`;
      }
    };
    
    const duplicatedQuestion = {
      ...questionToDuplicate,
      id: Date.now() + Math.random(),
      text: generateCopyName(questionToDuplicate.text),
      answers: questionToDuplicate.answers.map((answer, answerIndex) => ({
        ...answer,
        id: Date.now() + Math.random() + Math.random(),
        order_index: answerIndex,
      })),
    };
    
    const newQuestions = [...questions];
    newQuestions.splice(index + 1, 0, duplicatedQuestion);
    
    // Update order_index for all questions
    const reindexedQuestions = newQuestions.map((question, newIndex) => ({
      ...question,
      order_index: newIndex
    }));
    
    setQuestions(reindexedQuestions);
    setActiveQuestionIndex(index + 1);
  };

  // Move question up
  const moveQuestionUp = (index) => {
    if (index > 0) {
      const newQuestions = [...questions];
      [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]];
      
      // Update order_index for all questions
      const reindexedQuestions = newQuestions.map((question, newIndex) => ({
        ...question,
        order_index: newIndex
      }));
      
      setQuestions(reindexedQuestions);
      setActiveQuestionIndex(index - 1);
    }
  };

  // Move question down
  const moveQuestionDown = (index) => {
    if (index < questions.length - 1) {
      const newQuestions = [...questions];
      [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
      
      // Update order_index for all questions
      const reindexedQuestions = newQuestions.map((question, newIndex) => ({
        ...question,
        order_index: newIndex
      }));
      
      setQuestions(reindexedQuestions);
      setActiveQuestionIndex(index + 1);
    }
  };

  // Validate all questions
  const validateQuestions = () => {
    return questions.every(question => {
      const hasValidText = question.text.trim().length > 0;
      const hasValidAnswers = question.answers.every(a => a.text.trim().length > 0);
      const hasCorrectAnswer = question.answers.some(a => a.isCorrect);
      return hasValidText && hasValidAnswers && hasCorrectAnswer;
    });
  };

  const allQuestionsValid = validateQuestions();

  return (
    <div className="questions-form">
      <div className="form-header">
        <h2 className="form-title">❓ 問題作成</h2>
        <p className="form-description">
          クイズの問題を作成してください。各問題には問題文と選択肢が必要です。
        </p>
      </div>

      <div className="form-content">
        {/* Questions Overview */}
        <div className="questions-overview">
          <div className="overview-header">
            <h3 className="overview-title">問題一覧</h3>
            <div className="overview-stats">
              <span className="question-count">
                {questions.length}問作成済み
              </span>
              <span className={`validation-badge ${allQuestionsValid ? 'valid' : 'invalid'}`}>
                {allQuestionsValid ? '✅ 完了' : '⚠️ 未完了'}
              </span>
            </div>
          </div>

          <div className="questions-tabs">
            {questions.map((question, index) => {
              const hasValidText = question.text.trim().length > 0;
              const hasValidAnswers = question.answers.every(a => a.text.trim().length > 0);
              const hasCorrectAnswer = question.answers.some(a => a.isCorrect);
              const isValid = hasValidText && hasValidAnswers && hasCorrectAnswer;
              const isActive = index === activeQuestionIndex;

              return (
                <div
                  key={question.id}
                  className={`question-tab ${isActive ? 'active' : ''} ${isValid ? 'valid' : 'invalid'}`}
                  onClick={() => setActiveQuestionIndex(index)}
                >
                  <div className="tab-header">
                    <span className="tab-number">問題 {index + 1}</span>
                    <div className="tab-actions">
                      {isValid ? (
                        <span className="status-icon valid">✅</span>
                      ) : (
                        <span className="status-icon invalid">⚠️</span>
                      )}
                    </div>
                  </div>
                  <div className="tab-preview">
                    {question.text.trim() || "問題文を入力してください..."}
                  </div>
                </div>
              );
            })}

            {/* Add Question Button */}
            <button className="add-question-tab" onClick={addQuestion}>
              <span className="add-icon">➕</span>
              <span className="add-text">問題を追加</span>
            </button>
          </div>
        </div>

        {/* Question Management Actions */}
        <div className="question-actions">
          <button
            className="action-btn secondary"
            onClick={() => moveQuestionUp(activeQuestionIndex)}
            disabled={activeQuestionIndex === 0}
            title="上に移動"
          >
            ⬆️ 上へ
          </button>

          <button
            className="action-btn secondary"
            onClick={() => moveQuestionDown(activeQuestionIndex)}
            disabled={activeQuestionIndex === questions.length - 1}
            title="下に移動"
          >
            ⬇️ 下へ
          </button>

          <button
            className="action-btn primary"
            onClick={() => duplicateQuestion(activeQuestionIndex)}
            title="複製"
          >
            📋 複製
          </button>

          <button
            className="action-btn danger"
            onClick={() => deleteQuestion(activeQuestionIndex)}
            disabled={questions.length <= 1}
            title="削除"
          >
            🗑️ 削除
          </button>
        </div>

        {/* Active Question Builder */}
        {questions.length > 0 && (
          <QuestionBuilder
            question={questions[activeQuestionIndex]}
            updateQuestion={(updatedQuestion) => updateQuestion(activeQuestionIndex, updatedQuestion)}
            questionIndex={activeQuestionIndex}
            totalQuestions={questions.length}
            onDeleteQuestion={deleteQuestion}
          />
        )}

        {/* Questions Summary */}
        <div className="questions-summary">
          <h3 className="summary-title">クイズ概要</h3>
          <div className="summary-stats">
            <div className="stat-item">
              <span className="stat-label">総問題数</span>
              <span className="stat-value">{questions.length}問</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">完成問題</span>
              <span className="stat-value">
                {questions.filter(q => {
                  const hasValidText = q.text.trim().length > 0;
                  const hasValidAnswers = q.answers.every(a => a.text.trim().length > 0);
                  const hasCorrectAnswer = q.answers.some(a => a.isCorrect);
                  return hasValidText && hasValidAnswers && hasCorrectAnswer;
                }).length}問
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">予想時間</span>
              <span className="stat-value">
                {Math.ceil(questions.reduce((total, q) => total + q.timeLimit + 5, 0) / 60)}分
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">総ポイント</span>
              <span className="stat-value">
                {questions.reduce((total, q) => {
                  const basePoints = 1000;
                  const answerCount = q.answers.length;
                  const isMaruBatsu = q.answers.some(a => 
                    a.text.includes('○') || a.text.includes('×') || 
                    a.text.includes('正') || a.text.includes('誤')
                  );
                  
                  let typeMultiplier;
                  if (answerCount === 2) {
                    typeMultiplier = isMaruBatsu ? 0.8 : 0.8; // Both true/false and 2-choice are 0.8
                  } else {
                    typeMultiplier = 1.0; // 4-choice
                  }
                  
                  const pointMultiplier = q.points === '0' ? 0 : q.points === 'double' ? 2 : 1;
                  return total + Math.round(basePoints * typeMultiplier * pointMultiplier);
                }, 0)}点
              </span>
            </div>
          </div>
        </div>

        {/* Validation Summary */}
        {!allQuestionsValid && (
          <div className="validation-summary">
            <h4 className="validation-title">⚠️ 未完了の問題があります</h4>
            <div className="validation-issues">
              {questions.map((question, index) => {
                const hasValidText = question.text.trim().length > 0;
                const hasValidAnswers = question.answers.every(a => a.text.trim().length > 0);
                const hasCorrectAnswer = question.answers.some(a => a.isCorrect);
                const issues = [];

                if (!hasValidText) issues.push("問題文が入力されていません");
                if (!hasValidAnswers) issues.push("回答選択肢が不完全です");
                if (!hasCorrectAnswer) issues.push("正解が設定されていません");

                if (issues.length > 0) {
                  return (
                    <div key={question.id} className="validation-issue">
                      <span className="issue-question">問題 {index + 1}:</span>
                      <ul className="issue-list">
                        {issues.map((issue, i) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default QuestionsForm;
