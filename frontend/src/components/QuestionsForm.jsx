import { useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import QuestionBuilder from './QuestionBuilder';
import './questionsForm.css';

const QuestionsForm = forwardRef(({ questions, setQuestions, questionSetId = null }, ref) => {
  const { apiCall } = useAuth();
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [isUpdatingMetadata, setIsUpdatingMetadata] = useState(false);
  const questionBuilderRefs = useRef([]);
  
  // Store File objects separately to avoid losing them in React state
  const pendingImageFiles = useRef(new Map());

  // Helper functions to manage File objects
  const storeImageFile = (questionId, answerIndex, file) => {
    const key = answerIndex !== null ? `${questionId}-answer-${answerIndex}` : `${questionId}-question`;
    pendingImageFiles.current.set(key, file);
  };

  const getImageFile = (questionId, answerIndex) => {
    const key = answerIndex !== null ? `${questionId}-answer-${answerIndex}` : `${questionId}-question`;
    return pendingImageFiles.current.get(key);
  };

  const clearImageFile = (questionId, answerIndex) => {
    const key = answerIndex !== null ? `${questionId}-answer-${answerIndex}` : `${questionId}-question`;
    pendingImageFiles.current.delete(key);
  };

  // Update question set metadata based on current questions
  const updateQuestionSetMetadata = async () => {
    if (!questionSetId) return;

    try {
      setIsUpdatingMetadata(true);
      
      // Calculate metadata from current questions
      const totalQuestions = questions.length;
      const completedQuestions = questions.filter(q => {
        const hasValidText = q.text.trim().length > 0;
        const hasValidAnswers = q.answers.every(a => a.text.trim().length > 0);
        const hasCorrectAnswer = q.answers.some(a => a.isCorrect);
        return hasValidText && hasValidAnswers && hasCorrectAnswer;
      }).length;
      
      const estimatedDuration = Math.ceil(questions.reduce((total, q) => total + q.timeLimit + 5, 0) / 60);
      
      // Update the question set metadata
      const updateData = {
        total_questions: totalQuestions,
        estimated_duration: estimatedDuration
      };

      // Only log if there are significant changes
      console.log('� Auto-syncing quiz metadata:', updateData);

      await apiCall(`/quiz/${questionSetId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

    } catch (error) {
      console.error('❌ Failed to sync quiz metadata:', error);
      // Silently fail to avoid disrupting user workflow
    } finally {
      setIsUpdatingMetadata(false);
    }
  };

  // Auto-update metadata when questions change (debounced)
  useEffect(() => {
    if (!questionSetId || questions.length === 0) return;

    const metadataUpdateTimer = setTimeout(() => {
      updateQuestionSetMetadata();
    }, 1000); // Reduced to 1 second for faster updates

    return () => clearTimeout(metadataUpdateTimer);
  }, [questions, questionSetId]);

  // Also update metadata immediately on specific actions
  useEffect(() => {
    if (!questionSetId) return;
    
    // Update immediately when questions are added/removed (length changes)
    updateQuestionSetMetadata();
  }, [questions.length, questionSetId]);

  // Expose functions to parent component
  useImperativeHandle(ref, () => ({
    saveAllQuestions,
    hasUnsavedChanges,
    updateQuestionSetMetadata
  }));

  // Add new question
  const addQuestion = () => {
    const newQuestion = {
      id: `temp_${Date.now()}_${Math.random()}`, // Use temp ID to identify unsaved questions
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
    
    // Metadata will be updated automatically by useEffect
  };

  // Helper function to check if a URL is a blob URL
  const isBlobUrl = (url) => {
    return url && (url.startsWith('blob:') || url.includes('localhost'));
  };

  // Upload images that are still blob URLs
  const uploadPendingImages = async (questionsData, targetQuizId) => {
    const imagesToUpload = [];
    const imageMappings = [];

    console.log('🔍 Checking for images to upload in', questionsData.length, 'questions...');

    // Collect all images that need uploading
    questionsData.forEach((question, questionIndex) => {
      console.log(`🔍 Question ${questionIndex}:`, {
        hasImage: !!question.image,
        imageUrl: question.image,
        isBlobUrl: isBlobUrl(question.image)
      });

      // Check question image - use stored File object if available
      if (isBlobUrl(question.image)) {
        const file = getImageFile(question.id, null);
        if (file && file instanceof File) {
          console.log(`✅ Adding question ${questionIndex} image to upload queue`);
          imagesToUpload.push(file);
          imageMappings.push({
            type: 'question',
            questionIndex: questionIndex,
            answerIndex: null
          });
        } else {
          console.log(`⚠️ Question ${questionIndex} has blob URL but no File object found`);
        }
      }

      // Check answer images
      if (question.answers) {
        question.answers.forEach((answer, answerIndex) => {
          console.log(`🔍 Question ${questionIndex}, Answer ${answerIndex}:`, {
            hasImage: !!answer.image,
            imageUrl: answer.image,
            isBlobUrl: isBlobUrl(answer.image)
          });

          if (isBlobUrl(answer.image)) {
            const file = getImageFile(question.id, answerIndex);
            if (file && file instanceof File) {
              console.log(`✅ Adding question ${questionIndex}, answer ${answerIndex} image to upload queue`);
              imagesToUpload.push(file);
              imageMappings.push({
                type: 'answer',
                questionIndex: questionIndex,
                answerIndex: answerIndex
              });
            } else {
              console.log(`⚠️ Question ${questionIndex}, answer ${answerIndex} has blob URL but no File object found`);
            }
          }
        });
      }
    });

    if (imagesToUpload.length === 0) {
      console.log('ℹ️ No images to upload, proceeding with bulk save');
      return questionsData; // No images to upload
    }

    console.log(`🖼️ Uploading ${imagesToUpload.length} images before bulk save...`);

    try {
      // Prepare FormData for bulk image upload
      const formData = new FormData();
      imagesToUpload.forEach((file, index) => {
        formData.append('images', file);
      });
      formData.append('question_set_id', targetQuizId);
      formData.append('image_mappings', JSON.stringify(imageMappings));

      // Upload all images at once
      const uploadResponse = await apiCall('/questions/bulk-upload-images', {
        method: 'POST',
        body: formData,
        headers: {} // Let browser set Content-Type for FormData
      });

      if (uploadResponse.success && uploadResponse.results) {
        console.log('✅ Bulk image upload completed');
        
        // Update questionsData with the new URLs
        uploadResponse.results.forEach((result, index) => {
          if (result.success && result.mapping) {
            const { questionIndex, answerIndex, type } = result.mapping;
            
            if (type === 'question') {
              questionsData[questionIndex].image_url = result.url;
              questionsData[questionIndex].image = result.url;
              questionsData[questionIndex].imageFile = null; // Clear file after upload
            } else if (type === 'answer' && answerIndex !== null) {
              questionsData[questionIndex].answers[answerIndex].image_url = result.url;
              questionsData[questionIndex].answers[answerIndex].image = result.url;
              questionsData[questionIndex].answers[answerIndex].imageFile = null; // Clear file after upload
            }
            
            console.log(`✅ Updated ${type} image URL:`, result.url);
          } else {
            console.error(`❌ Failed to upload image ${index}:`, result.error);
          }
        });
        
        return questionsData;
      } else {
        console.error('❌ Bulk image upload failed:', uploadResponse);
        // Continue with original data, blob URLs will be filtered out by backend
        return questionsData;
      }
    } catch (error) {
      console.error('❌ Error during bulk image upload:', error);
      // Continue with original data, blob URLs will be filtered out by backend
      return questionsData;
    }
  };

  // Save all questions to backend
  const saveAllQuestions = async (overrideQuizId = null) => {
    try {
      const targetQuizId = overrideQuizId || questionSetId;
      if (!targetQuizId) {
        console.error('No question set ID provided for bulk save');
        return false;
      }
      
      console.log('Saving questions with quiz ID:', targetQuizId);
      
      // Ensure all questions have correct order_index before saving (prevents constraint violations)
      const normalizedQuestions = questions.map((question, index) => ({
        ...question,
        order_index: index
      }));
      
      // Collect all question data - use the state directly since refs may not preserve File objects properly  
      let questionsData = normalizedQuestions.map((question, index) => ({
        ...question,
        order_index: index // Ensure order is correct
      }));
      
      console.log('Performing bulk save for questions:', questionsData.length);
      console.log('Sample question data:', questionsData[0]); // Debug log

      // STEP 1: Upload any pending images first
      questionsData = await uploadPendingImages(questionsData, targetQuizId);
      
      // STEP 2: Perform bulk save with (potentially updated) question data
      const response = await apiCall('/questions/bulk', {
        method: 'PUT',
        body: JSON.stringify({
          question_set_id: targetQuizId,
          questions: questionsData
        })
      });
      
      if (response.success || response.questions) {
        console.log('Bulk save completed:', response);
        
        // Update local state with backend IDs using questionsData as the base
        const updatedQuestions = questionsData.map((questionData, index) => {
          const savedQuestion = response.questions.find(q => q.order_index === index);
          if (savedQuestion) {
            return {
              ...questionData,
              id: savedQuestion.id,
              backend_id: savedQuestion.id,
              order_index: savedQuestion.order_index
            };
          }
          return questionData;
        });
        
        setQuestions(updatedQuestions);
        
        // Update question set metadata after successful save
        await updateQuestionSetMetadata();
        
        // Handle partial success with errors
        if (response.errors && response.errors.length > 0) {
          console.warn('Some questions had errors:', response.errors);
          // Still return true as some questions were saved successfully
          return true;
        }
        
        return true;
      } else {
        console.error('Bulk save failed:', response);
        return false;
      }
      
    } catch (error) {
      console.error('Failed to perform bulk save:', error);
      return false;
    }
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    return questionBuilderRefs.current.some(ref => ref?.hasUnsavedChanges);
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
      
      // Metadata will be updated automatically by useEffect
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
    
    // Metadata will be updated automatically by useEffect
  };

  // Move question up
  const moveQuestionUp = (index) => {
    if (index > 0) {
      const newQuestions = [...questions];
      [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]];
      
      // Update order_index for all questions to match array position
      const reindexedQuestions = newQuestions.map((question, newIndex) => ({
        ...question,
        order_index: newIndex
      }));
      
      setQuestions(reindexedQuestions);
      setActiveQuestionIndex(index - 1);
      
      // Mark as having unsaved changes instead of auto-saving
      // This prevents race conditions and gives user control
    }
  };

  // Move question down
  const moveQuestionDown = (index) => {
    if (index < questions.length - 1) {
      const newQuestions = [...questions];
      [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
      
      // Update order_index for all questions to match array position
      const reindexedQuestions = newQuestions.map((question, newIndex) => ({
        ...question,
        order_index: newIndex
      }));
      
      setQuestions(reindexedQuestions);
      setActiveQuestionIndex(index + 1);
      
      // Mark as having unsaved changes instead of auto-saving
      // This prevents race conditions and gives user control
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
            ref={(el) => {
              // Store ref using question ID for more reliable reference
              const question = questions[activeQuestionIndex];
              if (question && question.id) {
                questionBuilderRefs.current[activeQuestionIndex] = el;
              }
            }}
            question={questions[activeQuestionIndex]}
            updateQuestion={(updatedQuestion) => updateQuestion(activeQuestionIndex, updatedQuestion)}
            questionIndex={activeQuestionIndex}
            totalQuestions={questions.length}
            onDeleteQuestion={deleteQuestion}
            questionSetId={questionSetId}
            onImageFileStored={(questionId, answerIndex, file) => {
              if (file) {
                storeImageFile(questionId, answerIndex, file);
              } else {
                clearImageFile(questionId, answerIndex);
              }
            }}
            onQuestionSaved={(savedQuestion) => {
              console.log('Question saved:', savedQuestion);
              // Update the question with backend data if needed
              const updatedQuestion = {
                ...questions[activeQuestionIndex],
                id: savedQuestion.id,
                backend_id: savedQuestion.id,
                order_index: activeQuestionIndex // Ensure order_index is set
              };
              updateQuestion(activeQuestionIndex, updatedQuestion);
            }}
          />
        )}

        {/* Questions Summary */}
        <div className="questions-summary">
          <div className="summary-header">
            <h3 className="summary-title">クイズ概要</h3>
            {isUpdatingMetadata && (
              <div className="metadata-update-indicator">
                <span className="update-spinner">🔄</span>
                <span className="update-text">同期中...</span>
              </div>
            )}
          </div>
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
});

export default QuestionsForm;
