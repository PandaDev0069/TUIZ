import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ExplanationModal from './ExplanationModal';
import './questionBuilder.css';

const QuestionBuilder = forwardRef(({ 
  question, 
  updateQuestion, 
  questionIndex, 
  totalQuestions, 
  onDeleteQuestion,
  questionSetId = null, // Add questionSetId prop for backend communication
  onQuestionSaved = null, // Callback when question is saved to backend
  onImageFileStored = null // New prop to store File objects separately
}, ref) => {
  const { apiCall } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [answerDragActive, setAnswerDragActive] = useState({});
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Expose save function to parent component
  useImperativeHandle(ref, () => ({
    forceSave: () => saveQuestionToBackend(),
    hasUnsavedChanges,
    isSaving,
    getQuestionData: () => ({
      ...question,
      backend_id: question.backend_id || question.id
    })
  }));

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
          setHasUnsavedChanges(true);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [question, updateQuestion]);

  // Auto-save when question data changes (debounced) - DISABLED
  // Auto-save is now handled by the main CreateQuiz component to avoid conflicts
  // useEffect(() => {
  //   if (!hasUnsavedChanges || !questionSetId || !question.id) return;
  //   
  //   // Don't auto-save blank questions
  //   if (!question.text || question.text.trim().length === 0) return;
  //
  //   const autoSaveTimer = setTimeout(() => {
  //     saveQuestionToBackend();
  //   }, 2000); // Auto-save after 2 seconds of inactivity
  //
  //   return () => clearTimeout(autoSaveTimer);
  // }, [question, hasUnsavedChanges, questionSetId]);

  // Mark as having unsaved changes when question data changes
  useEffect(() => {
    // Only mark as having changes if question has meaningful content
    const hasContent = question.text && question.text.trim().length > 0;
    const hasAnswers = question.answers && question.answers.length > 0;
    
    if (hasContent || hasAnswers) {
      setHasUnsavedChanges(true);
    }
  }, [question.text, question.answers, question.timeLimit, question.points, question.difficulty]);

  // Save question to backend
  const saveQuestionToBackend = async () => {
    if (!questionSetId || isSaving) return;
    
    // Don't save if question is empty/blank
    if (!question.text || question.text.trim().length === 0) {
      console.log('Skipping save for blank question');
      return;
    }
    
    // Don't save if question has no answers (for question types that require answers)
    const questionType = getQuestionType();
    if (questionType !== 'open_ended' && (!question.answers || question.answers.length === 0)) {
      console.log('Skipping save for question without answers');
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Prepare question data for backend
      const questionData = {
        question_set_id: questionSetId,
        question_text: question.text.trim(),
        question_type: getQuestionType(),
        time_limit: question.timeLimit || 30,
        points: question.points || 100,
        difficulty: question.difficulty || 'medium',
        order_index: question.order_index !== undefined ? question.order_index : questionIndex,
        explanation_title: question.explanation_title || null,
        explanation_text: question.explanation_text || question.explanation || null,
        explanation_image_url: question.explanation_image_url || null
      };

      let savedQuestion;
      
      // Check if this is a new question that needs to be created
      // A question is "new" if:
      // 1. It has no backend_id, OR
      // 2. It has a numeric timestamp ID (frontend-generated), OR  
      // 3. It has a temp_ prefixed ID
      const isNewQuestion = !question.backend_id || 
                          (typeof question.id === 'number') ||
                          (typeof question.id === 'string' && (question.id.includes('temp_') || /^\d+$/.test(question.id)));
      
      if (isNewQuestion) {
        // This is a new question, create it
        console.log('Creating new question:', questionData);
        const response = await apiCall('/questions', {
          method: 'POST',
          body: JSON.stringify(questionData)
        });
        savedQuestion = response.question || response; // Handle both new and old response formats
        
        // Update the question with the real ID from backend
        updateQuestion({ 
          ...question, 
          id: savedQuestion.id,
          backend_id: savedQuestion.id
        });
        
      } else {
        // This is an existing question with a real backend ID, update it
        const questionId = question.backend_id;
        console.log('Updating existing question:', questionId, questionData);
        const response = await apiCall(`/questions/${questionId}`, {
          method: 'PUT',
          body: JSON.stringify(questionData)
        });
        savedQuestion = response.question || response; // Handle both new and old response formats
      }

      // Save answers
      if (savedQuestion && question.answers.length > 0) {
        await saveAnswersToBackend(savedQuestion.id);
      }

      // Upload question image if exists
      if (question.imageFile && savedQuestion) {
        await uploadQuestionImage(savedQuestion.id);
      }

      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      
      if (onQuestionSaved) {
        onQuestionSaved(savedQuestion);
      }
      
      console.log('Question saved successfully:', savedQuestion.id);
      
    } catch (error) {
      console.error('Failed to save question:', error);
      // Don't clear unsaved changes flag on error
    } finally {
      setIsSaving(false);
    }
  };

  // Save answers to backend
  const saveAnswersToBackend = async (questionId) => {
    const answers = question.answers || [];
    
    // Save answers individually, handling duplicates gracefully
    for (let i = 0; i < answers.length; i++) {
      const answer = answers[i];
      
      const answerData = {
        question_id: questionId,
        answer_text: answer.text.trim(),
        is_correct: answer.isCorrect,
        order_index: i,
        answer_explanation: answer.answer_explanation || null
      };

      try {
        let savedAnswer;
        
        if (!answer.backend_id) {
          // Try to create new answer
          console.log('Creating new answer:', answerData);
          try {
            const response = await apiCall('/answers', {
              method: 'POST',
              body: JSON.stringify(answerData)
            });
            savedAnswer = response.answer || response; // Handle both new and old response formats
            
            // Update answer with backend ID
            const updatedAnswers = [...question.answers];
            updatedAnswers[i] = { ...answer, backend_id: savedAnswer.id };
            updateQuestion({ ...question, answers: updatedAnswers });
            
          } catch (createError) {
            // If creation fails due to duplicate, try to find existing answer and update
            if (createError.message.includes('duplicate key') || createError.message.includes('23505')) {
              console.log('Duplicate detected, attempting to find and update existing answer');
              
              try {
                // Get existing answers for this question
                const existingAnswers = await apiCall(`/answers/question/${questionId}`);
                const existingAnswer = existingAnswers.answers?.find(a => a.order_index === i);
                
                if (existingAnswer) {
                  // Update existing answer
                  const response = await apiCall(`/answers/${existingAnswer.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(answerData)
                  });
                  savedAnswer = response.answer || response; // Handle both new and old response formats
                  
                  // Update local state with backend ID
                  const updatedAnswers = [...question.answers];
                  updatedAnswers[i] = { ...answer, backend_id: existingAnswer.id };
                  updateQuestion({ ...question, answers: updatedAnswers });
                } else {
                  throw createError; // Re-throw if we can't find existing answer
                }
              } catch (updateError) {
                console.error(`Failed to handle duplicate for answer ${i}:`, updateError);
                throw createError; // Re-throw original error
              }
            } else {
              throw createError; // Re-throw if not a duplicate error
            }
          }
          
        } else {
          // Update existing answer
          console.log('Updating existing answer:', answer.backend_id, answerData);
          const response = await apiCall(`/answers/${answer.backend_id}`, {
            method: 'PUT',
            body: JSON.stringify(answerData)
          });
          savedAnswer = response.answer || response; // Handle both new and old response formats
        }

        // Upload answer image if exists
        if (answer.imageFile && savedAnswer) {
          await uploadAnswerImage(savedAnswer.id, i);
        }
        
      } catch (error) {
        console.error(`Failed to save answer ${i}:`, error);
        // Continue with other answers even if one fails
      }
    }
  };

  // Upload question image
  const uploadQuestionImage = async (questionId) => {
    // Don't upload if no file or already uploaded
    if (!question.imageFile || question.image_url) return;
    
    try {
      const formData = new FormData();
      formData.append('image', question.imageFile);
      
      const response = await apiCall(`/questions/${questionId}/upload-image`, {
        method: 'POST',
        body: formData,
        headers: {} // Let browser set Content-Type for FormData
      });
      
      // Update question with uploaded image URL
      updateQuestion({ 
        ...question, 
        image_url: response.image_url,
        image: response.image_url,
        imageFile: null // Clear local file
      });
      
      console.log('Question image uploaded:', response.image_url);
      
    } catch (error) {
      console.error('Failed to upload question image:', error);
    }
  };

  // Upload answer image
  const uploadAnswerImage = async (answerId, answerIndex) => {
    const answer = question.answers[answerIndex];
    // Don't upload if no file or already uploaded
    if (!answer.imageFile || answer.image_url) return;
    
    try {
      const formData = new FormData();
      formData.append('image', answer.imageFile);
      
      const response = await apiCall(`/answers/${answerId}/upload-image`, {
        method: 'POST',
        body: formData,
        headers: {} // Let browser set Content-Type for FormData
      });
      
      // Update answer with uploaded image URL
      const updatedAnswers = [...question.answers];
      updatedAnswers[answerIndex] = { 
        ...answer, 
        image_url: response.image_url,
        image: response.image_url,
        imageFile: null // Clear local file
      };
      updateQuestion({ ...question, answers: updatedAnswers });
      
      console.log('Answer image uploaded:', response.image_url);
      
    } catch (error) {
      console.error('Failed to upload answer image:', error);
    }
  };

  // Manual save function (can be called by parent component)
  const forceSave = async () => {
    await saveQuestionToBackend();
  };

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
  const handleQuestionImageUpload = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください');
      return;
    }

    // Validate file size (5MB max for question images)
    if (file.size > 5 * 1024 * 1024) {
      alert('ファイルサイズは5MB以下にしてください');
      return;
    }

    // Create blob URL for immediate preview
    const url = URL.createObjectURL(file);
    updateQuestion({ 
      ...question, 
      image: url, 
      imageFile: file 
    });
    setHasUnsavedChanges(true);

    // Store File object separately to avoid losing it in state
    if (onImageFileStored) {
      onImageFileStored(question.id, null, file);
    }

    // If we have a questionSetId, upload immediately
    if (questionSetId && question.backend_id) {
      console.log('🖼️ Uploading question image immediately...');
      try {
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await apiCall(`/questions/${question.backend_id}/upload-image`, {
          method: 'POST',
          body: formData,
          headers: {} // Let browser set Content-Type for FormData
        });
        
        // Replace blob URL with storage URL
        updateQuestion({ 
          ...question, 
          image: response.image_url,
          image_url: response.image_url,
          imageFile: null // Clear file after upload
        });
        
        // Clear stored File object
        if (onImageFileStored) {
          onImageFileStored(question.id, null, null);
        }
        
        console.log('✅ Question image uploaded immediately:', response.image_url);
        
      } catch (error) {
        console.error('❌ Failed to upload question image immediately:', error);
        // Keep the blob URL and stored File for bulk upload later
      }
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
  const removeQuestionImage = async () => {
    console.log('🎯 Starting question image removal process...', {
      hasBackendId: !!question.backend_id,
      hasImageUrl: !!question.image_url,
      imageUrl: question.image_url,
      isBlob: question.image_url?.startsWith('blob:')
    });
    
    try {
      // If question has a backend ID and an uploaded image, delete from server
      if (question.backend_id && question.image_url && !question.image_url.startsWith('blob:')) {
        console.log('🗑️ Deleting question image from server:', question.image_url);
        const response = await apiCall(`/questions/${question.backend_id}/image`, {
          method: 'DELETE'
        });
        
        console.log('📥 Question image deletion response:', response);
        
        if (response.success) {
          console.log('✅ Question image deleted from server successfully');
        } else {
          console.warn('⚠️ Server deletion failed, but continuing with local removal');
        }
      } else {
        console.log('⏭️ Skipping server deletion:', {
          reason: !question.backend_id ? 'No backend ID' : 
                  !question.image_url ? 'No image URL' : 
                  'Blob URL (local only)'
        });
      }
    } catch (error) {
      console.error('❌ Failed to delete question image from server:', error);
      // Continue with local removal even if server deletion fails
    }

    // Clean up local blob URL
    if (question.image && question.image.startsWith('blob:')) {
      URL.revokeObjectURL(question.image);
    }
    
    // Update local state
    updateQuestion({ 
      ...question, 
      image: "", 
      image_url: null,
      imageFile: null 
    });
    setHasUnsavedChanges(true);
  };

  // Update answer
  const updateAnswer = (index, key, value) => {
    const updated = [...question.answers];
    updated[index][key] = value;
    updateQuestion({ ...question, answers: updated });
    setHasUnsavedChanges(true);
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
      setHasUnsavedChanges(true);
    }
  };

  // Remove answer option
  const removeAnswer = (index) => {
    if (question.answers.length > 2) {
      const newAnswers = question.answers
        .filter((_, i) => i !== index)
        .map((answer, newIndex) => ({ ...answer, order_index: newIndex }));
      updateQuestion({ ...question, answers: newAnswers });
      setHasUnsavedChanges(true);
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
  const handleAnswerImageUpload = async (index, file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください');
      return;
    }

    // Validate file size (3MB max for answer images)
    if (file.size > 3 * 1024 * 1024) {
      alert('ファイルサイズは3MB以下にしてください');
      return;
    }

    // Create blob URL for immediate preview
    const url = URL.createObjectURL(file);
    updateAnswer(index, 'image', url);
    updateAnswer(index, 'imageFile', file);
    setHasUnsavedChanges(true);

    // Store File object separately to avoid losing it in state
    if (onImageFileStored) {
      onImageFileStored(question.id, index, file);
    }

    // If we have saved answers with backend IDs, upload immediately
    const answer = question.answers[index];
    if (questionSetId && answer.backend_id) {
      console.log('🖼️ Uploading answer image immediately...');
      try {
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await apiCall(`/answers/${answer.backend_id}/upload-image`, {
          method: 'POST',
          body: formData,
          headers: {} // Let browser set Content-Type for FormData
        });
        
        // Replace blob URL with storage URL
        updateAnswer(index, 'image', response.image_url);
        updateAnswer(index, 'image_url', response.image_url);
        updateAnswer(index, 'imageFile', null); // Clear file after upload
        
        // Clear stored File object
        if (onImageFileStored) {
          onImageFileStored(question.id, index, null);
        }
        
        console.log('✅ Answer image uploaded immediately:', response.image_url);
        
      } catch (error) {
        console.error('❌ Failed to upload answer image immediately:', error);
        // Keep the blob URL and stored File for bulk upload later
      }
    }
  };

  // Remove answer image
  const removeAnswerImage = async (index) => {
    const answer = question.answers[index];
    
    console.log('🎯 Starting answer image removal process...', {
      answerIndex: index,
      hasBackendId: !!answer.backend_id,
      hasImageUrl: !!answer.image_url,
      imageUrl: answer.image_url,
      isBlob: answer.image_url?.startsWith('blob:')
    });
    
    try {
      // If answer has a backend ID and an uploaded image, delete from server
      if (answer.backend_id && answer.image_url && !answer.image_url.startsWith('blob:')) {
        console.log('🗑️ Deleting answer image from server via answer endpoint:', answer.image_url);
        const response = await apiCall(`/answers/${answer.backend_id}/image`, {
          method: 'DELETE'
        });
        
        console.log('📥 Answer image deletion response:', response);
        
        if (response.success || response.answer) {
          console.log('✅ Answer image deleted from server successfully');
        } else {
          console.warn('⚠️ Server deletion failed, but continuing with local removal');
        }
      } else if (answer.image_url && !answer.image_url.startsWith('blob:')) {
        // If we have an uploaded image but no backend_id, try to delete directly from storage
        console.log('🗑️ Deleting orphaned answer image directly from storage:', answer.image_url);
        
        try {
          // Extract bucket and file path from URL
          const urlParts = answer.image_url.split('/');
          const bucketIndex = urlParts.findIndex(part => part === 'public');
          
          if (bucketIndex !== -1 && bucketIndex + 2 < urlParts.length) {
            const bucket = urlParts[bucketIndex + 1]; // Should be 'answer-images'
            const filePath = urlParts.slice(bucketIndex + 2).join('/');
            
            const response = await apiCall('/upload/image', {
              method: 'DELETE',
              body: JSON.stringify({
                bucket: bucket,
                filePath: filePath
              }),
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            console.log('📥 Direct storage deletion response:', response);
            
            if (response.message) {
              console.log('✅ Answer image deleted from storage successfully');
            } else {
              console.warn('⚠️ Storage deletion response unclear, but continuing with local removal');
            }
          } else {
            console.warn('⚠️ Could not parse image URL for deletion:', answer.image_url);
          }
        } catch (storageError) {
          console.error('❌ Failed to delete answer image from storage:', storageError);
          // Continue with local removal even if storage deletion fails
        }
      } else {
        console.log('⏭️ Skipping server deletion:', {
          reason: !answer.backend_id && !answer.image_url ? 'No backend ID or image URL' : 
                  !answer.image_url ? 'No image URL' :
                  !answer.backend_id ? 'No backend ID (deleted from storage)' :
                  'Blob URL (local only)'
        });
      }
    } catch (error) {
      console.error('❌ Failed to delete answer image from server:', error);
      // Continue with local removal even if server deletion fails
    }

    // Clean up local blob URL
    if (answer.image && answer.image.startsWith('blob:')) {
      URL.revokeObjectURL(answer.image);
    }
    
    // Update local state
    updateAnswer(index, 'image', '');
    updateAnswer(index, 'image_url', null);
    updateAnswer(index, 'imageFile', null);
    setHasUnsavedChanges(true);
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
    setHasUnsavedChanges(true);
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

        {/* Question Explanation Button */}
        <div className="input-group">
          <div className="explanation-button-section">
            <button
              type="button"
              className={`explanation-button ${hasExplanationContent() ? 'has-content' : ''}`}
              onClick={() => setShowExplanationModal(true)}
            >
              <span className="button-icon">📝</span>
              <span className="button-text">
                {hasExplanationContent() ? '解説を編集' : '解説を追加'}
              </span>
              {hasExplanationContent() && (
                <span className="content-indicator">●</span>
              )}
            </button>
            {hasExplanationContent() && (
              <span className="explanation-preview">
                {question.explanation_title || question.explanation_text || question.explanation || '解説が設定されています'}
              </span>
            )}
          </div>
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
        <div className="question-builder-preview">
          <h3 className="question-builder-preview-title">プレビュー</h3>
          <div className="question-builder-preview-card">
            <div className="question-builder-preview-header">
              <span className="question-builder-preview-timer">⏱️ {question.timeLimit}秒</span>
              <span className="question-builder-preview-points">🏆 {calculatePoints()}点</span>
            </div>
            
            {question.image && (
              <div className="question-builder-preview-question-image">
                <img src={question.image} alt="Question" />
              </div>
            )}
            
            <div className="question-builder-preview-question">
              {question.text || "問題文を入力してください..."}
            </div>
            
            <div className={`question-builder-preview-answers ${question.answers.length === 4 ? 'grid-2x2' : 
                             question.answers.length === 2 && getQuestionType() !== 'true_false' ? 'horizontal' : 'large-buttons'}`}>
              {question.answers.map((answer, index) => (
                <div 
                  key={answer.id} 
                  className={`question-builder-preview-answer-option ${answer.isCorrect ? 'correct' : ''}`}
                >
                  {getQuestionType() === 'true_false' ? (
                    <div className="question-builder-answer-content-wrapper">
                      <div className="question-builder-answer-text">
                        {answer.text || `選択肢 ${index + 1}`}
                      </div>
                      {answer.image && (
                        <div className="question-builder-answer-image-container">
                          <img 
                            src={answer.image} 
                            alt={`Answer ${index + 1}`} 
                            className="question-builder-answer-image"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="question-builder-answer-content-wrapper">
                      <span className="question-builder-answer-letter">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <div className="question-builder-answer-text">
                        {answer.text || `選択肢 ${index + 1}`}
                      </div>
                      {answer.image && (
                        <div className="question-builder-answer-image-container">
                          <img 
                            src={answer.image} 
                            alt={`Answer ${index + 1}`} 
                            className="question-builder-answer-image"
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

      {/* Explanation Modal */}
      <ExplanationModal
        isOpen={showExplanationModal}
        onClose={() => setShowExplanationModal(false)}
        question={question}
        updateQuestion={updateQuestion}
      />
    </div>
  );

  // Helper function to check if explanation content exists
  function hasExplanationContent() {
    return (
      (question.explanation_title && question.explanation_title.trim()) ||
      (question.explanation_text && question.explanation_text.trim()) ||
      (question.explanation && question.explanation.trim()) ||
      question.explanation_image ||
      question.explanation_imageFile
    );
  }
});

export default QuestionBuilder;
