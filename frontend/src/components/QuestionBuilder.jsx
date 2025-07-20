import { useState } from 'react';
import './questionBuilder.css';

function QuestionBuilder({ question, updateQuestion, questionIndex, totalQuestions, onDeleteQuestion }) {
  const [dragActive, setDragActive] = useState(false);

  // Handle file upload for question image
  const handleQuestionImageUpload = (file) => {
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      updateQuestion({ 
        ...question, 
        image: url, 
        imageFile: file 
      });
    }
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
      }];
      updateQuestion({ ...question, answers: newAnswers });
    }
  };

  // Remove answer option
  const removeAnswer = (index) => {
    if (question.answers.length > 2) {
      const newAnswers = question.answers.filter((_, i) => i !== index);
      updateQuestion({ ...question, answers: newAnswers });
    }
  };

  // Handle answer image upload
  const handleAnswerImageUpload = (index, file) => {
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      updateAnswer(index, 'image', url);
      updateAnswer(index, 'imageFile', file);
    }
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

  // Get question type based on answer count
  const getQuestionType = () => {
    const answerCount = question.answers.length;
    if (answerCount === 2) {
      // Check if it's true/false based on answer text
      const isMaruBatsu = question.answers.some(a => 
        a.text.includes('○') || a.text.includes('×') || 
        a.text.includes('正') || a.text.includes('誤')
      );
      return isMaruBatsu ? "true_false" : "multiple_choice_2";
    } else if (answerCount === 4) {
      return "multiple_choice_4";
    } else {
      return "multiple_choice_4"; // Default
    }
  };

  // Calculate points based on type and difficulty
  const calculatePoints = () => {
    const basePoints = 1000;
    const typeMultipliers = {
      "multiple_choice_2": 0.8,
      "multiple_choice_4": 1.0,
      "true_false": 0.8,
    };
    
    const type = getQuestionType();
    const typeMultiplier = typeMultipliers[type] || 1;
    const baseQuestionPoints = Math.round(basePoints * typeMultiplier);
    
    // Handle different point modes, default to "standard" if undefined
    const pointsMode = question.points || "standard";
    
    if (pointsMode === "0") {
      return 0;
    } else if (pointsMode === "double") {
      return baseQuestionPoints * 2;
    } else {
      // "standard" or default
      return baseQuestionPoints;
    }
  };

  // Calculate base points (without multiplier) for display in selector
  const calculateBasePoints = () => {
    const basePoints = 1000;
    const typeMultipliers = {
      "multiple_choice_2": 0.8,
      "multiple_choice_4": 1.0,
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
            {getQuestionType() === 'true_false' ? '○×問題' : 
             getQuestionType() === 'multiple_choice_2' ? '2択問題' : '4択問題'}
          </div>
          {totalQuestions > 1 && (
            <button
              className="delete-question-btn"
              onClick={() => onDeleteQuestion(questionIndex)}
              title="この問題を削除"
            >
              🗑️
            </button>
          )}
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
              className={`image-upload-area small ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="upload-content">
                <div className="upload-icon">🖼️</div>
                <p className="upload-text">画像を選択</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="file-input"
                />
              </div>
            </div>
          ) : (
            <div className="image-preview small">
              <img
                src={question.image}
                alt="Question preview"
                className="preview-image"
              />
              <button
                type="button"
                className="remove-image-btn"
                onClick={removeQuestionImage}
                title="画像を削除"
              >
                ❌
              </button>
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
            <select
              className="setting-select"
              value={question.points || "standard"}
              onChange={(e) => updateQuestion({ ...question, points: e.target.value })}
            >
              <option value="0">ポイントなし (0点)</option>
              <option value="standard">標準ポイント ({calculateBasePoints()}点)</option>
              <option value="double">2倍ポイント ({calculateBasePoints() * 2}点)</option>
            </select>
          </div>

          {/* Question Type */}
          <div className="setting-group">
            <label className="input-label">問題タイプ</label>
            <select
              className="setting-select"
              value={getQuestionType()}
              onChange={(e) => {
                const newType = e.target.value;
                const currentType = getQuestionType();
                let newAnswers = [...question.answers];
                
                if (newType === 'true_false') {
                  // Set to true/false answers
                  newAnswers = [
                    { id: Date.now() + 1, text: "○（正しい）", isCorrect: false, image: "", imageFile: null },
                    { id: Date.now() + 2, text: "×（間違い）", isCorrect: false, image: "", imageFile: null },
                  ];
                } else if (newType === 'multiple_choice_2') {
                  // Always reset to 2 regular choices when switching to multiple_choice_2
                  if (currentType !== 'multiple_choice_2') {
                    newAnswers = [
                      { id: Date.now() + 1, text: "", isCorrect: false, image: "", imageFile: null },
                      { id: Date.now() + 2, text: "", isCorrect: false, image: "", imageFile: null },
                    ];
                  }
                } else if (newType === 'multiple_choice_4') {
                  // Set to 4 choices or keep existing if already 4 regular choices
                  if (question.answers.length !== 4 || currentType === 'true_false') {
                    newAnswers = [
                      { id: Date.now() + 1, text: "", isCorrect: false, image: "", imageFile: null },
                      { id: Date.now() + 2, text: "", isCorrect: false, image: "", imageFile: null },
                      { id: Date.now() + 3, text: "", isCorrect: false, image: "", imageFile: null },
                      { id: Date.now() + 4, text: "", isCorrect: false, image: "", imageFile: null },
                    ];
                  }
                }
                
                updateQuestion({ ...question, answers: newAnswers });
              }}
            >
              <option value="true_false">○×問題</option>
              <option value="multiple_choice_2">2択問題</option>
              <option value="multiple_choice_4">4択問題</option>
            </select>
          </div>
        </div>

        {/* Answer Options */}
        <div className="answers-section">
          <div className="answers-header">
            <h3 className="answers-title">回答選択肢</h3>
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
                  <label className="correct-checkbox">
                    <input
                      type="checkbox"
                      checked={answer.isCorrect}
                      onChange={(e) => handleCorrectAnswerChange(index, e.target.checked)}
                    />
                    <span className="checkbox-custom"></span>
                    <span className="checkbox-label">正解</span>
                  </label>
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
                </div>

                {/* Answer Image */}
                <div className="answer-image-section">
                  {!answer.image ? (
                    <div className="answer-image-upload">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAnswerImageUpload(index, file);
                        }}
                        className="file-input"
                        id={`answer-image-${answer.id}`}
                      />
                      <label htmlFor={`answer-image-${answer.id}`} className="upload-label">
                        📎 画像を追加
                      </label>
                    </div>
                  ) : (
                    <div className="answer-image-preview">
                      <img
                        src={answer.image}
                        alt={`Answer ${index + 1}`}
                        className="answer-preview-image"
                      />
                      <button
                        type="button"
                        className="remove-answer-image-btn"
                        onClick={() => removeAnswerImage(index)}
                        title="画像を削除"
                      >
                        ❌
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {correctAnswersCount === 0 && (
            <div className="validation-error">
              ⚠️ 少なくとも1つの正解を選択してください
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
            
            <div className={`preview-answers ${getQuestionType() === 'multiple_choice_4' ? 'grid-2x2' : 
                             getQuestionType() === 'multiple_choice_2' ? 'horizontal' : 'large-buttons'}`}>
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
