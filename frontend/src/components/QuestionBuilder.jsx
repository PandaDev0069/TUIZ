import { useState, useEffect } from 'react';
import './questionBuilder.css';

function QuestionBuilder({ question, updateQuestion, questionIndex, totalQuestions, onDeleteQuestion }) {
  const [dragActive, setDragActive] = useState(false);
  const [answerDragActive, setAnswerDragActive] = useState({});

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        if (getQuestionType() === 'multiple_choice' && question.answers.length < 4) {
          // Inline addAnswer logic to avoid dependency issues
          const newAnswers = [...question.answers, {
            id: Date.now() + Math.random(),
            text: "",
            isCorrect: false,
            image: "",
            imageFile: null,
            order_index: question.answers.length,
            answer_explanation: ""
          }];
          updateQuestion({ ...question, answers: newAnswers });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [question, updateQuestion]);

  // Helper function to get question type (moved up for use in useEffect)
  const getQuestionType = () => {
    // Use the stored question_type if available, otherwise infer from answers
    if (question.question_type) {
      return question.question_type;
    }
    
    const answerCount = question.answers.length;
    if (answerCount === 2) {
      // Check if it's true/false based on answer text
      const isMaruBatsu = question.answers.some(a => 
        a.text.includes('○') || a.text.includes('×') || 
        a.text.includes('正') || a.text.includes('誤')
      );
      return isMaruBatsu ? "true_false" : "multiple_choice";
    } else {
      return "multiple_choice";
    }
  };

  // Handle file upload for question image
  const handleQuestionImageUpload = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください');
      return;
    }

    // Validate file size (5MB max for question images)
    if (file.size > 5 * 1024 * 1024) {
      alert('ファイルサイズは5MB以下にしてください');
      return;
    }

    const url = URL.createObjectURL(file);
    updateQuestion({ 
      ...question, 
      image: url, 
      imageFile: file 
    });
  };

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop event
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleQuestionImageUpload(e.dataTransfer.files[0]);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleQuestionImageUpload(file);
    }
  };

  // Remove question image
  const removeQuestionImage = () => {
    if (question.image) {
      URL.revokeObjectURL(question.image);
    }
    updateQuestion({ 
      ...question, 
      image: "", 
      imageFile: null 
    });
  };

  // Update answer
  const updateAnswer = (index, key, value) => {
    const updated = [...question.answers];
    updated[index][key] = value;
    updateQuestion({ ...question, answers: updated });
  };

  // Add new answer option
  const addAnswer = () => {
    if (question.answers.length < 4) {
      const newAnswers = [...question.answers, {
        id: Date.now() + Math.random(), // Simple ID generation
        text: "",
        isCorrect: false,
        image: "",
        imageFile: null,
        order_index: question.answers.length,
        answer_explanation: ""
      }];
      updateQuestion({ ...question, answers: newAnswers });
    }
  };

  // Remove answer option
  const removeAnswer = (index) => {
    if (question.answers.length > 2) {
      const newAnswers = question.answers
        .filter((_, i) => i !== index)
        .map((answer, newIndex) => ({ ...answer, order_index: newIndex }));
      updateQuestion({ ...question, answers: newAnswers });
    }
  };

  // Move answer up
  const moveAnswerUp = (index) => {
    if (index > 0) {
      const newAnswers = [...question.answers];
      [newAnswers[index - 1], newAnswers[index]] = [newAnswers[index], newAnswers[index - 1]];
      // Update order_index for all answers
      const reindexedAnswers = newAnswers.map((answer, newIndex) => ({ 
        ...answer, 
        order_index: newIndex 
      }));
      updateQuestion({ ...question, answers: reindexedAnswers });
    }
  };

  // Move answer down
  const moveAnswerDown = (index) => {
    if (index < question.answers.length - 1) {
      const newAnswers = [...question.answers];
      [newAnswers[index], newAnswers[index + 1]] = [newAnswers[index + 1], newAnswers[index]];
      // Update order_index for all answers
      const reindexedAnswers = newAnswers.map((answer, newIndex) => ({ 
        ...answer, 
        order_index: newIndex 
      }));
      updateQuestion({ ...question, answers: reindexedAnswers });
    }
  };

  // Handle drag events for answer images
  const handleAnswerDrag = (e, answerId) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setAnswerDragActive(prev => ({ ...prev, [answerId]: true }));
    } else if (e.type === "dragleave") {
      setAnswerDragActive(prev => ({ ...prev, [answerId]: false }));
    }
  };

  // Handle drop event for answer images
  const handleAnswerDrop = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    const answerId = question.answers[index].id;
    setAnswerDragActive(prev => ({ ...prev, [answerId]: false }));
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleAnswerImageUpload(index, e.dataTransfer.files[0]);
    }
  };

  // Handle answer image upload
  const handleAnswerImageUpload = (index, file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください');
      return;
    }

    // Validate file size (3MB max for answer images)
    if (file.size > 3 * 1024 * 1024) {
      alert('ファイルサイズは3MB以下にしてください');
      return;
    }

    const url = URL.createObjectURL(file);
    updateAnswer(index, 'image', url);
    updateAnswer(index, 'imageFile', file);
  };

  // Remove answer image
  const removeAnswerImage = (index) => {
    const answer = question.answers[index];
    if (answer.image) {
      URL.revokeObjectURL(answer.image);
    }
    updateAnswer(index, 'image', '');
    updateAnswer(index, 'imageFile', null);
  };

  // Ensure at least one correct answer
  const handleCorrectAnswerChange = (index, isCorrect) => {
    const updated = [...question.answers];
    updated[index].isCorrect = isCorrect;
    
    // If we're unchecking the only correct answer, prevent it
    const hasCorrectAnswer = updated.some(answer => answer.isCorrect);
    if (!hasCorrectAnswer && !isCorrect) {
      // Don't allow unchecking if it's the last correct answer
      return;
    }
    
    updateQuestion({ ...question, answers: updated });
  };

  // Calculate points based on type and difficulty
  const calculatePoints = () => {
    const basePoints = 1000;
    const typeMultipliers = {
      "multiple_choice": 1.0,
      "true_false": 1.0,
    };
    
    const type = getQuestionType();
    const typeMultiplier = typeMultipliers[type] || 1;
    const baseQuestionPoints = Math.round(basePoints * typeMultiplier);
    
    // Points is now an integer value directly
    return question.points || 100;
  };

  // Calculate base points (without multiplier) for display in selector
  const calculateBasePoints = () => {
    const basePoints = 1000;
    const typeMultipliers = {
      "multiple_choice": 1.0,
      "true_false": 0.8,
    };
    
    const type = getQuestionType();
    const typeMultiplier = typeMultipliers[type] || 1;
    return Math.round(basePoints * typeMultiplier);
  };

  const correctAnswersCount = question.answers.filter(a => a.isCorrect).length;
  const hasValidQuestion = question.text.trim().length > 0;
  const hasValidAnswers = question.answers.every(a => a.text.trim().length > 0) && correctAnswersCount > 0;

  return (
    <div className="question-builder">
      <div className="question-header">
        <div className="question-number">
          <span className="number">問題 {questionIndex + 1}</span>
          <span className="total">/ {totalQuestions}</span>
        </div>
        <div className="question-actions">
          <div className="question-type-badge">
            {getQuestionType() === 'true_false' ? '○×問題' : '選択問題'}
          </div>
        </div>
      </div>

      <div className="question-content">
        {/* Question Text */}
        <div className="input-group">
          <label htmlFor={`question-text-${question.id}`} className="input-label required">
            問題文
          </label>
          <textarea
            id={`question-text-${question.id}`}
            className={`question-textarea ${!hasValidQuestion ? 'error' : ''}`}
            placeholder="例: フランスの首都はどこですか？"
            value={question.text}
            onChange={(e) => updateQuestion({ ...question, text: e.target.value })}
            rows={3}
            maxLength={500}
          />
          <span className="input-hint">
            {question.text.length}/500 文字
          </span>
          {!hasValidQuestion && (
            <span className="field-error">問題文を入力してください</span>
          )}
        </div>

        {/* Question Image Upload */}
        <div className="input-group">
          <label className="input-label">
            問題画像（任意）
          </label>
          
          {!question.image ? (
            <div
              className={`upload-area ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById(`question-image-${question.id}`).click()}
              style={{ cursor: 'pointer' }}
            >
              <div className="upload-content">
                <div className="upload-icon">🖼️</div>
                <p className="upload-text">
                  クリックまたはドラッグ&ドロップで<br />
                  問題画像をアップロード
                </p>
                <span className="upload-hint">
                  推奨サイズ: 16:9 比率、最大5MB
                </span>
              </div>
              <input
                type="file"
                id={`question-image-${question.id}`}
                className="file-input"
                accept="image/*"
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            <div className="image-preview">
              <img
                src={question.image}
                alt="Question preview"
                className="preview-image"
              />
              <div className="image-actions">
                <button
                  type="button"
                  className="btn-secondary btn-small"
                  onClick={removeQuestionImage}
                  title="画像を削除"
                >
                  削除
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Question Settings Row */}
        <div className="settings-row">
          {/* Time Limit */}
          <div className="setting-group">
            <label className="input-label">タイムリミット</label>
            <select
              className="setting-select"
              value={question.timeLimit}
              onChange={(e) => updateQuestion({ ...question, timeLimit: parseInt(e.target.value) })}
            >
              {Array.from({ length: 116 }, (_, i) => i + 5).map((time) => (
                <option key={time} value={time}>
                  {time}秒
                </option>
              ))}
            </select>
          </div>

          {/* Points */}
          <div className="setting-group">
            <label className="input-label">ポイント</label>
            <input
              type="number"
              className="setting-input"
              min="0"
              max="10000"
              step="10"
              value={question.points || 100}
              onChange={(e) => updateQuestion({ ...question, points: parseInt(e.target.value, 10) || 100 })}
              placeholder="100"
            />
          </div>

          {/* Difficulty */}
          <div className="setting-group">
            <label className="input-label">難易度</label>
            <select
              className="setting-select"
              value={question.difficulty || "medium"}
              onChange={(e) => updateQuestion({ ...question, difficulty: e.target.value })}
            >
              <option value="easy">簡単</option>
              <option value="medium">普通</option>
              <option value="hard">難しい</option>
              <option value="expert">エキスパート</option>
            </select>
          </div>

          {/* Question Type */}
          <div className="setting-group">
            <label className="input-label">問題タイプ</label>
            <select
              className="setting-select"
              value={question.question_type || "multiple_choice"}
              onChange={(e) => {
                const newType = e.target.value;
                const currentType = question.question_type || "multiple_choice";
                let newAnswers = [...question.answers];
                
                if (newType === 'true_false') {
                  // Set to true/false answers
                  newAnswers = [
                    { 
                      id: Date.now() + 1, 
                      text: "○（正しい）", 
                      isCorrect: false, 
                      image: "", 
                      imageFile: null,
                      order_index: 0,
                      answer_explanation: ""
                    },
                    { 
                      id: Date.now() + 2, 
                      text: "×（間違い）", 
                      isCorrect: false, 
                      image: "", 
                      imageFile: null,
                      order_index: 1,
                      answer_explanation: ""
                    },
                  ];
                } else if (newType === 'multiple_choice') {
                  // Keep existing answers if compatible, otherwise reset to 2 choices
                  if (currentType === 'true_false' || question.answers.length === 0) {
                    newAnswers = [
                      { 
                        id: Date.now() + 1, 
                        text: "", 
                        isCorrect: false, 
                        image: "", 
                        imageFile: null,
                        order_index: 0,
                        answer_explanation: ""
                      },
                      { 
                        id: Date.now() + 2, 
                        text: "", 
                        isCorrect: false, 
                        image: "", 
                        imageFile: null,
                        order_index: 1,
                        answer_explanation: ""
                      },
                    ];
                  } else {
                    // Update existing answers to include new fields
                    newAnswers = question.answers.map((answer, index) => ({
                      ...answer,
                      order_index: index,
                      answer_explanation: answer.answer_explanation || ""
                    }));
                  }
                }
                
                updateQuestion({ 
                  ...question, 
                  question_type: newType, 
                  answers: newAnswers 
                });
              }}
            >
              <option value="true_false">○×問題</option>
              <option value="multiple_choice">選択問題</option>
            </select>
          </div>
        </div>

        {/* Answer Options */}
        <div className="answers-section">
          <div className="answers-header">
            <h3 className="answers-title">
              回答選択肢 ({question.answers.length}{getQuestionType() === 'multiple_choice' ? '/4' : '/2'})
            </h3>
            <div className="answers-info">
              <span className={`correct-count ${correctAnswersCount === 0 ? 'error' : ''}`}>
                正解: {correctAnswersCount}個
              </span>
            </div>
          </div>

          <div className="answers-grid">
            {question.answers.map((answer, index) => (
              <div key={answer.id} className="answer-item">
                <div className="answer-header">
                  <span className="answer-label">選択肢 {index + 1}</span>
                  <div className="answer-controls">
                    {/* Answer reordering buttons */}
                    {question.answers.length > 2 && getQuestionType() === 'multiple_choice' && (
                      <div className="answer-reorder-controls">
                        <button
                          type="button"
                          className={`reorder-btn ${index === 0 ? 'disabled' : ''}`}
                          onClick={() => moveAnswerUp(index)}
                          disabled={index === 0}
                          title="選択肢を上に移動"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className={`reorder-btn ${index === question.answers.length - 1 ? 'disabled' : ''}`}
                          onClick={() => moveAnswerDown(index)}
                          disabled={index === question.answers.length - 1}
                          title="選択肢を下に移動"
                        >
                          ↓
                        </button>
                      </div>
                    )}
                    <label className="correct-checkbox">
                      <input
                        type="checkbox"
                        checked={answer.isCorrect}
                        onChange={(e) => handleCorrectAnswerChange(index, e.target.checked)}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="checkbox-label">正解</span>
                    </label>
                    {question.answers.length > 2 && getQuestionType() === 'multiple_choice' && (
                      <button
                        type="button"
                        className={`remove-answer-btn ${answer.isCorrect && correctAnswersCount === 1 ? 'disabled' : ''}`}
                        onClick={() => {
                          if (answer.isCorrect && correctAnswersCount === 1) {
                            alert('最後の正解選択肢は削除できません。先に他の選択肢を正解に設定してください。');
                            return;
                          }
                          removeAnswer(index);
                        }}
                        title={answer.isCorrect && correctAnswersCount === 1 ? 
                               "最後の正解選択肢は削除できません" : 
                               "選択肢を削除"}
                        disabled={answer.isCorrect && correctAnswersCount === 1}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="answer-content">
                  <textarea
                    className={`answer-textarea ${!answer.text.trim() ? 'error' : ''}`}
                    placeholder={`選択肢 ${index + 1} を入力`}
                    value={answer.text}
                    onChange={(e) => updateAnswer(index, "text", e.target.value)}
                    rows={2}
                    maxLength={200}
                  />
                  <span className="input-hint">
                    {answer.text.length}/200 文字
                  </span>
                  
                  {/* Answer Explanation */}
                  <textarea
                    className="answer-textarea explanation-textarea"
                    placeholder={`選択肢 ${index + 1} の説明 (オプション)`}
                    value={answer.answer_explanation || ""}
                    onChange={(e) => updateAnswer(index, "answer_explanation", e.target.value)}
                    rows={2}
                    maxLength={300}
                  />
                  <span className="input-hint">
                    {(answer.answer_explanation || "").length}/300 文字
                  </span>
                </div>

                {/* Answer Image */}
                <div className="answer-image-section">
                  <label className="input-label-small">画像（任意）</label>
                  {!answer.image ? (
                    <div 
                      className={`upload-area small ${answerDragActive[answer.id] ? 'drag-active' : ''}`}
                      onDragEnter={(e) => handleAnswerDrag(e, answer.id)}
                      onDragLeave={(e) => handleAnswerDrag(e, answer.id)}
                      onDragOver={(e) => handleAnswerDrag(e, answer.id)}
                      onDrop={(e) => handleAnswerDrop(e, index)}
                      onClick={() => document.getElementById(`answer-image-${answer.id}`).click()}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="upload-content">
                        <div className="upload-icon">📎</div>
                        <p className="upload-text">
                          クリックまたはドラッグ&ドロップで<br />
                          画像を追加
                        </p>
                        <span className="upload-hint">最大3MB</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAnswerImageUpload(index, file);
                        }}
                        className="file-input"
                        id={`answer-image-${answer.id}`}
                        style={{ display: 'none' }}
                      />
                    </div>
                  ) : (
                    <div className="image-preview small">
                      <img
                        src={answer.image}
                        alt={`Answer ${index + 1}`}
                        className="preview-image"
                      />
                      <div className="image-actions">
                        <button
                          type="button"
                          className="btn-secondary btn-small"
                          onClick={() => removeAnswerImage(index)}
                          title="画像を削除"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add Answer Button (Bottom) */}
          {getQuestionType() === 'multiple_choice' && question.answers.length < 4 && (
            <div className="add-answer-section">
              <button
                type="button"
                className="add-answer-btn-large"
                onClick={addAnswer}
                title="選択肢を追加"
              >
                ➕ 選択肢を追加 ({question.answers.length}/4)
              </button>
              <span className="add-answer-hint">
                最大4つまで選択肢を追加できます
              </span>
            </div>
          )}

          {correctAnswersCount === 0 && (
            <div className="validation-error">
              ⚠️ 少なくとも1つの正解を選択してください
            </div>
          )}

          {getQuestionType() === 'multiple_choice' && question.answers.length === 2 && (
            <div className="answers-tip">
              💡 ヒント: 選択肢を追加してより難しい問題にできます
            </div>
          )}

          {getQuestionType() === 'multiple_choice' && question.answers.length === 4 && (
            <div className="answers-max-tip">
              ✅ 最大数の選択肢に達しました (4/4)
            </div>
          )}
        </div>

        {/* Question Preview */}
        <div className="question-preview">
          <h3 className="preview-title">プレビュー</h3>
          <div className="preview-card">
            <div className="preview-header">
              <span className="preview-timer">⏱️ {question.timeLimit}秒</span>
              <span className="preview-points">🏆 {calculatePoints()}点</span>
            </div>
            
            {question.image && (
              <div className="preview-question-image">
                <img src={question.image} alt="Question" />
              </div>
            )}
            
            <div className="preview-question">
              {question.text || "問題文を入力してください..."}
            </div>
            
            <div className={`preview-answers ${question.answers.length === 4 ? 'grid-2x2' : 
                             question.answers.length === 2 && getQuestionType() !== 'true_false' ? 'horizontal' : 'large-buttons'}`}>
              {question.answers.map((answer, index) => (
                <div 
                  key={answer.id} 
                  className={`preview-answer-option ${answer.isCorrect ? 'correct' : ''}`}
                >
                  {getQuestionType() === 'true_false' ? (
                    <div className="answer-content-wrapper">
                      <div className="answer-text">
                        {answer.text || `選択肢 ${index + 1}`}
                      </div>
                      {answer.image && (
                        <div className="answer-image-container">
                          <img 
                            src={answer.image} 
                            alt={`Answer ${index + 1}`} 
                            className="answer-image"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="answer-content-wrapper">
                      <span className="answer-letter">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <div className="answer-text">
                        {answer.text || `選択肢 ${index + 1}`}
                      </div>
                      {answer.image && (
                        <div className="answer-image-container">
                          <img 
                            src={answer.image} 
                            alt={`Answer ${index + 1}`} 
                            className="answer-image"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Validation Status */}
        <div className="validation-status">
          <div className={`status-item ${hasValidQuestion ? 'valid' : 'invalid'}`}>
            {hasValidQuestion ? '✅' : '❌'} 問題文
          </div>
          <div className={`status-item ${hasValidAnswers ? 'valid' : 'invalid'}`}>
            {hasValidAnswers ? '✅' : '❌'} 回答選択肢
          </div>
          <div className={`status-item ${correctAnswersCount > 0 ? 'valid' : 'invalid'}`}>
            {correctAnswersCount > 0 ? '✅' : '❌'} 正解設定
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuestionBuilder;
