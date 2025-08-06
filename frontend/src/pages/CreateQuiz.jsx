import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { showSuccess, showError, showWarning } from '../utils/toast';
import MetadataForm from '../components/MetadataForm';
import QuestionsForm from '../components/QuestionsForm';
import SettingsForm from '../components/SettingsForm';
import ReviewForm from '../components/ReviewForm';
import QuestionReorderModal from '../components/QuestionReorderModal';
import SaveStatusIndicator from '../components/SaveStatusIndicator';
import { useQuizCreation } from '../hooks/useQuizCreation';
import './createQuiz.css';

function CreateQuiz() {
  const { user, isAuthenticated, token, apiCall } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Progressive save functionality
  const {
    currentQuizId,
    setCurrentQuizId, // 🔧 Added to fix currentQuizId restoration from preview
    saveStatus,
    lastSaved,
    autoSaveEnabled,
    temporarySave,
    scheduleAutoSave,
    publishQuiz,
    markUnsaved,
    setAutoSaveEnabled,
    loadDraft
  } = useQuizCreation();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Load quiz data if editing existing quiz (drafts or published)
  const draftLoadedRef = useRef(false);
  
  useEffect(() => {
    const loadQuizData = async () => {
      const state = location.state;
      const questionSetId = state?.questionSetId;
      const editMode = state?.editMode;
      const draftMode = state?.draftMode;
      const wasPublished = state?.wasPublished;
      
      // Load data if editing any quiz (draft or published)
      if (editMode && questionSetId && !draftLoadedRef.current && isAuthenticated) {
        try {
          setIsDraftLoading(true);
          draftLoadedRef.current = true; // Prevent re-loading
          if (import.meta.env.DEV) {
            console.log('Loading quiz for editing:', questionSetId, { draftMode, wasPublished });
          }
          
          // Load the quiz data (same API works for both drafts and published)
          const quizData = await loadDraft(questionSetId);
          if (import.meta.env.DEV) {
            console.log('Quiz data loaded:', quizData);
          }
          
          // Populate metadata
          if (quizData.quiz) {
            setMetadata(prevMetadata => ({
              ...prevMetadata,
              title: quizData.quiz.title || '',
              description: quizData.quiz.description || '',
              category: quizData.quiz.category || '',
              difficulty_level: quizData.quiz.difficulty_level || '',
              estimated_duration: quizData.quiz.estimated_duration || '',
              thumbnail_url: quizData.quiz.thumbnail_url || '',
              tags: quizData.quiz.tags || [],
              is_public: quizData.quiz.is_public || false,
              questionsCount: quizData.quiz.total_questions || 0,
              wasPublished: wasPublished // Store this info for later
            }));
          }
          
          // Populate questions if they exist
          if (quizData.questions && quizData.questions.length > 0) {
            const formattedQuestions = quizData.questions.map((question, index) => ({
              id: question.id || Date.now() + index,
              text: question.question_text || '',
              image: question.image_url || '',
              imageFile: null,
              question_type: question.question_type || 'multiple_choice',
              timeLimit: question.time_limit || 30,
              points: question.points || 100,
              difficulty: question.difficulty || 'medium',
              explanation: question.explanation_text || '',
              explanation_title: question.explanation_title || '',
              explanation_text: question.explanation_text || '',
              explanation_image: '',
              explanation_imageFile: null,
              explanation_image_url: question.explanation_image_url || '',
              order_index: question.order_index || index,
              answers: (question.answers || []).map((answer, answerIndex) => ({
                id: answer.id || Date.now() + index * 100 + answerIndex,
                text: answer.answer_text || '',
                isCorrect: answer.is_correct || false,
                image: answer.image_url || '',
                imageFile: null,
                order_index: answer.order_index || answerIndex,
                answer_explanation: answer.answer_explanation || ''
              }))
            }));
            
            setQuestions(formattedQuestions);
            if (import.meta.env.DEV) {
              console.log('Questions loaded:', formattedQuestions.length);
            }
          }

          // Populate settings if they exist in the quiz
          if (quizData.quiz && quizData.quiz.play_settings) {
            const quizSettings = {
              players_cap: quizData.quiz.play_settings.players_cap || 50,
              game_settings: {
                autoAdvance: quizData.quiz.play_settings.autoAdvance || false,
                hybridMode: quizData.quiz.play_settings.hybridMode || false,
                showExplanations: quizData.quiz.play_settings.showExplanations || false,
                explanationTime: quizData.quiz.play_settings.explanationTime || 30,
                pointCalculation: quizData.quiz.play_settings.pointCalculation || 'fixed',
                streakBonus: quizData.quiz.play_settings.streakBonus || false,
                showLeaderboard: quizData.quiz.play_settings.showLeaderboard || false,
                showProgress: quizData.quiz.play_settings.showProgress || false,
              }
            };
            setSettings(quizSettings);
          }
          
          const loadMessage = wasPublished ? '公開済みクイズを編集モードで読み込みました' : '下書きを読み込みました';
          showSuccess(loadMessage);
          
        } catch (error) {
          console.error('Failed to load quiz:', error);
          showError('クイズの読み込みに失敗しました: ' + error.message);
          draftLoadedRef.current = false; // Reset on error to allow retry
        } finally {
          setIsDraftLoading(false);
          // Allow auto-save after quiz loading is complete (with small delay)
          setTimeout(() => {
            draftLoadedRef.current = false;
          }, 2000);
        }
      }
    };

    loadQuizData();
  }, [isAuthenticated]); // Only depend on authentication, use refs to prevent other dependencies

  // Quiz creation steps
  const [currentStep, setCurrentStep] = useState(() => {
    // If returning from preview, determine the appropriate step based on data completeness
    const state = location.state;
    if (state?.returnFromPreview) {
      // Set step based on what data exists
      if (state.questions?.length > 0 && state.metadata?.title) {
        return 3; // Settings step - where users typically want to return to
      } else if (state.metadata?.title) {
        return 2; // Questions step
      }
    }
    return 1; // Default to metadata step
  });
  const totalSteps = 4;

  // 🔧 CRITICAL FIX: Restore currentQuizId when returning from preview
  useEffect(() => {
    const state = location.state;
    if (state?.returnFromPreview && state.currentQuizId && !currentQuizId) {
      if (import.meta.env.DEV) {
        console.log('🔄 Restoring currentQuizId from preview navigation:', state.currentQuizId);
      }
      setCurrentQuizId(state.currentQuizId);
    }
  }, [location.state, currentQuizId]);

  // Quiz metadata state - Updated to match database schema
  const [metadata, setMetadata] = useState(() => {
    const state = location.state;
    if (state?.returnFromPreview && state.metadata) {
      return {
        ...state.metadata,
        tagsString: Array.isArray(state.metadata.tags) ? state.metadata.tags.join(', ') : ""
      };
    }
    return {
      title: "",
      description: "",
      category: "",
      difficulty_level: "",
      estimated_duration: "",
      estimated_duration_manual: false,
      thumbnail_url: "",
      thumbnail_file: null,
      tags: [],
      tagsString: "",
      is_public: false,
      questionsCount: 0
    };
  });

  // Image upload functions (refs to hold the upload functions from components)
  const thumbnailUploadRef = useRef(null);
  const questionsFormRef = useRef(null);

  // Quiz questions state
  const [questions, setQuestions] = useState(() => {
    const state = location.state;
    if (state?.returnFromPreview && state.questions?.length > 0) {
      return state.questions;
    }
    return [
      {
        id: Date.now(),
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
        order_index: 0,
        answers: [
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
        ],
      },
    ];
  });

  // Quiz settings state
  const [settings, setSettings] = useState(() => {
    const state = location.state;
    if (state?.returnFromPreview && state.settings) {
      return state.settings;
    }
    return {
      // Timing & Flow
      timeLimit: 30,
      breakDuration: 3,
      autoAdvance: true,
      
      // Question & Answer Ordering
      questionOrder: "original", // "original", "random-all", "random-per-player", "custom"
      customQuestionOrder: [],
      answerOrder: "original", // "original", "randomize", "lock-first", "lock-last"
      
      // Gameplay Behavior
      showCorrectAnswer: true,
      showExplanations: true,
      allowAnswerChange: true,
      allowLateSubmissions: false,
      
      // Scoring & Points
      pointCalculation: "fixed", // "fixed", "time-bonus"
      streakBonus: false,
      wrongAnswerPenalty: false,
      
      // Player Experience
      showLeaderboard: true,
      showProgress: true,
      allowReplay: false,
      spectatorMode: true,
      
      // Advanced Options
      maxPlayers: 50,
      autoStart: false,
      kickInactive: false,
      inactiveTimeout: 30
    };
  });

  // Modal states for advanced features
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDraftLoading, setIsDraftLoading] = useState(false);

  // Update questions count in metadata when questions change
  useEffect(() => {
    setMetadata(prev => ({
      ...prev,
      questionsCount: questions.length
    }));
  }, [questions.length]);

  const stepTitles = [
    "📋 基本情報",
    "❓ 問題作成", 
    "⚙️ 設定",
    "🎯 確認・保存"
  ];

  // Comprehensive validation function
  const validateQuizData = (metadata, questions, settings) => {
    const errors = [];
    
    // Validate metadata according to database schema
    if (!metadata.title?.trim()) {
      errors.push('タイトルは必須です');
    }
    if (metadata.title?.trim().length > 255) {
      errors.push('タイトルは255文字以内で入力してください');
    }
    if (metadata.category && metadata.category.length > 100) {
      errors.push('カテゴリーは100文字以内で入力してください');
    }
    if (metadata.difficulty_level && !['easy', 'medium', 'hard', 'expert'].includes(metadata.difficulty_level)) {
      errors.push('難易度レベルが無効です');
    }
    if (metadata.description && metadata.description.length > 5000) { // Text field can be longer
      errors.push('説明は5000文字以内で入力してください');
    }
    if (metadata.estimated_duration && metadata.estimated_duration <= 0) {
      errors.push('推定時間は正の数で入力してください');
    }
    
    // Validate questions
    if (questions.length === 0) {
      errors.push('最低1つの問題が必要です');
    }
    
    questions.forEach((question, index) => {
      if (!question.text?.trim()) {
        errors.push(`問題 ${index + 1}: 問題文は必須です`);
      }
      if (question.text?.trim().length > 1000) {
        errors.push(`問題 ${index + 1}: 問題文は1000文字以内で入力してください`);
      }
      if (question.timeLimit < 5 || question.timeLimit > 300) {
        errors.push(`問題 ${index + 1}: タイムリミットは5-300秒の範囲で設定してください`);
      }
      
      // Validate answers
      if (question.answers.length < 2) {
        errors.push(`問題 ${index + 1}: 最低2つの選択肢が必要です`);
      }
      
      const hasCorrectAnswer = question.answers.some(a => a.isCorrect);
      if (!hasCorrectAnswer) {
        errors.push(`問題 ${index + 1}: 最低1つの正解を設定してください`);
      }
      
      question.answers.forEach((answer, answerIndex) => {
        if (!answer.text?.trim()) {
          errors.push(`問題 ${index + 1}, 選択肢 ${answerIndex + 1}: 選択肢のテキストは必須です`);
        }
        if (answer.text?.trim().length > 500) {
          errors.push(`問題 ${index + 1}, 選択肢 ${answerIndex + 1}: 選択肢は500文字以内で入力してください`);
        }
      });
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Handle temporary save
  const handleTemporarySave = async () => {
    try {
      if (!metadata.title?.trim()) {
        showError('タイトルを入力してから一時保存してください');
        return;
      }
      
      // Upload thumbnail FIRST if pending to get the URL
      let metadataWithThumbnail = { ...metadata };
      
      if (metadata.thumbnail_pending && thumbnailUploadRef.current && currentQuizId) {
        console.log('🖼️ Uploading thumbnail before metadata save');
        try {
          const thumbnailUrl = await thumbnailUploadRef.current(currentQuizId);
          if (thumbnailUrl) {
            metadataWithThumbnail = {
              ...metadataWithThumbnail,
              thumbnail_url: thumbnailUrl,
              thumbnail_pending: false
            };
            
            // Update local state immediately
            setMetadata(metadataWithThumbnail);
            console.log('✅ Thumbnail uploaded, URL included in save:', thumbnailUrl);
          }
        } catch (uploadError) {
          console.error('❌ Thumbnail upload failed:', uploadError.message);
          showWarning('サムネイルアップロードに失敗しましたが、クイズは保存されます');
        }
      }
      
      // Save the quiz with the updated metadata (including thumbnail URL)
      const savedQuizId = await temporarySave(metadataWithThumbnail, questions);
      
        // Save all questions to backend if we're on the questions step
        if (currentStep === 2 && questionsFormRef.current && savedQuizId) {
          try {
            await questionsFormRef.current.saveAllQuestions(savedQuizId);
          } catch (questionsError) {
            console.error('❌ Failed to save questions:', questionsError);
            showWarning('メタデータは保存されましたが、一部の質問の保存に失敗しました');
          }
        }      // Handle thumbnail upload for NEW quizzes (when no currentQuizId exists yet)
      if (savedQuizId && metadata.thumbnail_pending && thumbnailUploadRef.current && !currentQuizId) {
        console.log('🖼️ Uploading thumbnail for new quiz:', savedQuizId);
        try {
          const thumbnailUrl = await thumbnailUploadRef.current(savedQuizId);
          if (thumbnailUrl) {
            setMetadata(prev => ({
              ...prev,
              thumbnail_url: thumbnailUrl,
              thumbnail_pending: false
            }));
            console.log('✅ Thumbnail uploaded for new quiz:', thumbnailUrl);
            // Only show success message when thumbnail is involved
            showSuccess('一時保存とサムネイル画像のアップロードが完了しました');
          } else {
            // No special message for regular save
            showSuccess('一時保存しました');
          }
        } catch (uploadError) {
          console.error('❌ Thumbnail upload failed:', uploadError.message);
          showSuccess('一時保存しました');
          // Don't show thumbnail error for manual saves - user will retry if needed
        }
      } else {
        // Reduced messaging - only confirm save was successful
        showSuccess('一時保存しました');
      }
      
    } catch (error) {
      console.error('Temporary save failed:', error);
      showError('一時保存に失敗しました: ' + error.message);
    }
  };

  // Upload pending images (thumbnail, question images, answer images)
  const uploadPendingImages = async (quizId = null) => {
    const targetQuizId = quizId || currentQuizId;
    
    if (!targetQuizId) {
      console.log('⚠️ No quiz ID available for image upload');
      return;
    }

    try {
      // Upload thumbnail if pending
      if (metadata.thumbnail_pending && thumbnailUploadRef.current) {
        console.log('🖼️ Uploading thumbnail for quiz:', targetQuizId);
        const thumbnailUrl = await thumbnailUploadRef.current(targetQuizId);
        if (thumbnailUrl) {
          // Update local state
          setMetadata(prev => ({
            ...prev,
            thumbnail_url: thumbnailUrl,
            thumbnail_pending: false
          }));
          
          console.log('✅ Thumbnail uploaded successfully:', thumbnailUrl);
          showSuccess('サムネイル画像がアップロードされました');
        }
      } else {
        console.log('📝 No thumbnail to upload or thumbnail upload function not ready');
      }

      // TODO: Upload question images and answer images if needed
      // This can be implemented similarly when question/answer image upload during intermediate save is needed
      
    } catch (error) {
      console.error('❌ Image upload failed:', error.message);
      showWarning('画像のアップロードに失敗しました。最終保存時に再試行されます。');
    }
  };

  // Auto-save when data changes - use debounced auto-save mechanism
  useEffect(() => {
    // Only schedule auto-save if we have a current quiz ID and are authenticated
    if (currentQuizId && !draftLoadedRef.current && isAuthenticated && autoSaveEnabled) {
      // Debounce auto-save: only save after user stops making changes for 1 minute
      const timeoutId = setTimeout(() => {
        scheduleAutoSave(metadata, questions);
      }, 60000); // 1 minute debounce delay
      
      return () => {
        clearTimeout(timeoutId);
        if (scheduleAutoSave.cancel) {
          scheduleAutoSave.cancel();
        }
      };
    }
    
    // Cleanup on unmount or dependency change
    return () => {
      if (scheduleAutoSave.cancel) {
        scheduleAutoSave.cancel();
      }
    };
  }, [metadata, questions, currentQuizId, isAuthenticated, autoSaveEnabled, scheduleAutoSave]);

  // Auto-save when step changes - OPTIMISTIC UI UPDATES
  const handleNext = async () => {
    if (currentStep < totalSteps) {
      // � Save BEFORE navigation for step 2 (questions) to ensure refs are still available
      if (currentStep === 2 && currentQuizId) {
        try {
          console.log('🔄 Saving data before leaving questions step');
          
          // Start save immediately but don't wait for completion
          temporarySave(metadata, questions).catch(error => {
            console.warn('⚠️ Background metadata save failed:', error);
          });
          
          // Save questions while QuestionsForm is still mounted
          if (questionsFormRef.current && questionsFormRef.current.saveAllQuestions) {
            console.log('🎯 Saving questions before navigation with quizId:', currentQuizId);
            // Start questions save but don't wait for completion to avoid blocking UI
            questionsFormRef.current.saveAllQuestions(currentQuizId).catch(error => {
              console.warn('⚠️ Questions save failed:', error);
              // Only show warning for actual failures, not ref availability issues
              showWarning('質問の保存に失敗しました。手動で保存してください。');
            });
            console.log('✅ Questions save initiated before navigation');
          } else {
            // This is expected behavior when component unmounts, don't warn user
            console.log('💡 QuestionsForm ref not available - questions will be saved later');
          }
        } catch (error) {
          console.warn('⚠️ Pre-navigation save failed:', error);
          showWarning('質問の保存に失敗しました。手動で保存してください。');
        }
      }
      
      // � OPTIMISTIC: Navigate immediately after save attempt
      setCurrentStep(currentStep + 1);
      
      // 🔄 Background save for other steps (non-blocking)
      if (currentQuizId || metadata.title.trim()) {
        // Run save in background without blocking UI for non-question steps
        setTimeout(async () => {
          try {
            console.log(`🔄 Background save started for step ${currentStep} navigation`);
            
            if (currentStep === 1) {
              // Moving from metadata step - save metadata and create quiz if needed
              if (currentQuizId) {
                await temporarySave(metadata, questions);
              } else if (metadata.title.trim()) {
                const savedQuizId = await temporarySave(metadata, questions);
                if (savedQuizId) {
                  await uploadPendingImages(savedQuizId);
                }
              }
            } else if (currentStep === 2) {
              // Moving from questions step - save metadata only (questions already saved before navigation)
              if (currentQuizId) {
                // Save metadata
                await temporarySave(metadata, questions);
                console.log('✅ Metadata saved after questions step navigation');
                // Note: Questions were already saved before navigation to avoid ref issues
              }
            } else if (currentStep === 3) {
              // Moving from settings step - save everything
              if (currentQuizId) {
                await temporarySave(metadata, questions);
                // Note: Questions should already be saved from step 2
              }
            }
            
            console.log('✅ Background save completed successfully');
          } catch (error) {
            console.warn('⚠️ Background save failed, but navigation continues:', error);
            showWarning('自動保存に失敗しました。手動で保存してください。');
          }
        }, 0);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveQuiz = async () => {
    try {
      setIsLoading(true);
      console.log('Starting quiz final save process...');
      
      // Step 1: Validate all data thoroughly
      const validationResult = validateQuizData(metadata, questions, settings);
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }

      // If we have a current quiz ID (from progressive save), publish it
      if (currentQuizId) {
        console.log('Publishing existing draft quiz:', currentQuizId);
        
        try {
          // Final update before publishing
          await temporarySave(metadata, questions);
          
          // Upload any remaining pending images
          await uploadPendingImages(currentQuizId);
          
          // Publish the quiz
          const result = await publishQuiz({
            play_settings: settings
          });
          
          console.log('Quiz published successfully:', result);
          showSuccess('クイズが正常に作成・公開されました！');
          
          // Clear temporary data after successful publish
          setCurrentQuizId(null);
          
          navigate('/dashboard');
          return;
        } catch (publishError) {
          console.error('Failed to publish quiz:', publishError);
          // If publish fails, try legacy save as fallback
          console.log('Falling back to legacy save method');
          showWarning('高度な保存に失敗したため、通常の保存方法で続行します');
        }
      }

      // Legacy save process for backward compatibility
      // Step 2: Create quiz with metadata using new API
      const quizData = {
        title: metadata.title.trim(),
        description: metadata.description?.trim() || null,
        category: metadata.category,
        difficulty_level: metadata.difficulty_level,
        estimated_duration: metadata.estimated_duration || calculateEstimatedDuration(questions),
        thumbnail_url: metadata.thumbnail_url || null,
        tags: metadata.tags || [],
        is_public: metadata.is_public || false
      };

      console.log('Step 1 - Creating quiz with metadata:', quizData);

      // Create quiz using new API endpoint
      const quizResult = await apiCall('/quiz/create', {
        method: 'POST',
        body: JSON.stringify(quizData)
      });

      const quizId = quizResult.quiz.id;
      console.log('Step 2 - Quiz Created:', quizId);

      // Step 3: Add questions one by one with image uploads
      const savedQuestions = [];
      
      // Ensure questions have proper order before saving
      const orderedQuestions = normalizeQuestionOrder(questions);
      
      for (let i = 0; i < orderedQuestions.length; i++) {
        const question = orderedQuestions[i];
        console.log(`Step 3.${i + 1} - Processing question ${i + 1}:`, question.text.substring(0, 50) + '...');
        
        const questionData = {
          question_set_id: quizId,
          question_text: question.text.trim(),
          question_type: question.question_type || 'multiple_choice',
          time_limit: question.timeLimit,
          points: question.points || 100,
          difficulty: question.difficulty || 'medium',
          order_index: i, // Use loop index to ensure sequential ordering
          explanation_title: question.explanation_title || '',
          explanation_text: question.explanation_text || question.explanation || '',
          explanation_image_url: question.explanation_image_url || ''
        };

        const savedQuestion = await apiCall('/questions', {
          method: 'POST',
          body: JSON.stringify(questionData)
        });

        savedQuestions.push(savedQuestion);
        console.log(`Question ${i + 1} saved with ID:`, savedQuestion.id);

        // Step 3.5: Upload question image if it exists
        if (question.imageFile) {
          console.log(`Step 3.5.${i + 1} - Uploading question image`);
          try {
            const formData = new FormData();
            formData.append('image', question.imageFile);
            
            const imageResponse = await fetch(`${import.meta.env.VITE_API_URL}/questions/${savedQuestion.id}/upload-image`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: formData
            });

            if (!imageResponse.ok) {
              throw new Error('Failed to upload question image');
            }

            const imageResult = await imageResponse.json();
            console.log(`Question ${i + 1} image uploaded:`, imageResult.image_url);
          } catch (imageError) {
            console.error(`Failed to upload image for question ${i + 1}:`, imageError);
            // Continue with save process even if image upload fails
          }
        }

        // Step 4: Add answers for this question with image uploads
        
        // Ensure answers have proper order before saving
        const orderedAnswers = normalizeAnswerOrder(question.answers || []);
        
        for (let j = 0; j < orderedAnswers.length; j++) {
          const answer = orderedAnswers[j];
          console.log(`Step 4.${i + 1}.${j + 1} - Processing answer ${j + 1}:`, answer.text.substring(0, 30) + '...');
          
          const answerData = {
            question_id: savedQuestion.id,
            answer_text: answer.text.trim(),
            is_correct: answer.isCorrect,
            order_index: j, // Use loop index to ensure sequential ordering
            answer_explanation: answer.answer_explanation || ''
          };

          const savedAnswer = await apiCall('/answers', {
            method: 'POST',
            body: JSON.stringify(answerData)
          });

          console.log(`Answer ${j + 1} for question ${i + 1} saved with ID:`, savedAnswer.id);

          // Step 4.5: Upload answer image if it exists
          if (answer.imageFile) {
            console.log(`Step 4.5.${i + 1}.${j + 1} - Uploading answer image`);
            try {
              const formData = new FormData();
              formData.append('image', answer.imageFile);
              
              const imageResponse = await fetch(`${import.meta.env.VITE_API_URL}/answers/${savedAnswer.id}/upload-image`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
              });

              if (!imageResponse.ok) {
                throw new Error('Failed to upload answer image');
              }

              const imageResult = await imageResponse.json();
              console.log(`Answer ${j + 1} for question ${i + 1} image uploaded:`, imageResult.image_url);
            } catch (imageError) {
              console.error(`Failed to upload image for answer ${j + 1} of question ${i + 1}:`, imageError);
              // Continue with save process even if image upload fails
            }
          }
        }
      }

      console.log('Step 5 - All questions and answers saved successfully');
      
      // Show success message and redirect
      showSuccess('クイズが正常に作成されました！');
      
      // Navigate to dashboard after a short delay to show the toast
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);

    } catch (error) {
      console.error('Quiz save error:', error);
      showError('クイズの保存中にエラーが発生しました: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to calculate estimated duration
  const calculateEstimatedDuration = (questions) => {
    if (!questions.length) return 5;
    // 30 seconds per question + 10 seconds buffer per question
    return Math.ceil((questions.length * 0.5) + (questions.length * 0.17));
  };

  // Helper function to calculate difficulty based on questions
  const calculateDifficulty = (questions) => {
    const avgTimeLimit = questions.reduce((sum, q) => sum + q.timeLimit, 0) / questions.length;
    const hasComplexQuestions = questions.some(q => q.answers.length > 4 || q.text.length > 200);
    
    if (avgTimeLimit < 10 && hasComplexQuestions) return 'hard';
    if (avgTimeLimit < 15 || hasComplexQuestions) return 'medium';
    return 'easy';
  };

  // Helper function to format questions for database
  const formatQuestionsForDatabase = (questions) => {
    return questions.map((question, index) => ({
      question_text: question.text,
      question_type: question.question_type || 'multiple_choice',
      time_limit: question.timeLimit,
      points: question.points || 100,
      difficulty: question.difficulty || 'medium',
      order_index: index,
      explanation_title: question.explanation_title || '',
      explanation_text: question.explanation_text || question.explanation || '',
      explanation_image_url: question.explanation_image_url || '',
      answers: question.answers.map((answer, answerIndex) => ({
        answer_text: answer.text,
        is_correct: answer.isCorrect,
        order_index: answerIndex,
        answer_explanation: answer.answer_explanation || ''
      }))
    }));
  };

  // Helper function to determine question type
  const determineQuestionType = (question) => {
    if (question.answers.length === 2) {
      const texts = question.answers.map(a => a.text.toLowerCase().trim());
      if (texts.includes('true') && texts.includes('false') || 
          texts.includes('○') && texts.includes('×') ||
          texts.includes('はい') && texts.includes('いいえ')) {
        return 'true_false';
      }
    }
    return 'multiple_choice';
  };

  // Helper function to get numeric points value
  const getPointsValue = (pointsSetting) => {
    switch (pointsSetting) {
      case 'low': return 500;
      case 'standard': return 1000;
      case 'high': return 1500;
      case 'custom': return 1000; // Could allow custom input later
      default: return 1000;
    }
  };

  const handlePreviewQuiz = () => {
    // Navigate to the preview page with quiz data
    navigate('/preview', { 
      state: { 
        questions, 
        settings, 
        metadata,
        currentQuizId, // 🔧 CRITICAL FIX: Pass currentQuizId to preview
        returnPath: '/create-quiz'
      } 
    });
  };

  // Helper function to ensure proper order indices for questions
  const normalizeQuestionOrder = (questionsArray) => {
    return questionsArray.map((question, index) => ({
      ...question,
      order_index: index
    }));
  };

  // Helper function to ensure proper order indices for answers within a question
  const normalizeAnswerOrder = (answersArray) => {
    return answersArray.map((answer, index) => ({
      ...answer,
      order_index: index
    }));
  };

  const handleReorderQuestions = () => {
    setShowReorderModal(true);
  };

  const handleReorderComplete = (newQuestions) => {
    // Update order_index for each question based on new position
    const reorderedQuestions = newQuestions.map((question, index) => ({
      ...question,
      order_index: index
    }));
    
    setQuestions(reorderedQuestions);
    // Automatically set question order to custom when reordering is used
    setSettings(prev => ({
      ...prev,
      questionOrder: 'custom',
      customQuestionOrder: reorderedQuestions.map(q => q.id)
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return metadata.title.trim().length > 0;
      case 2:
        // Check if all questions are valid
        return questions.length > 0 && questions.every(question => {
          const hasValidText = question.text.trim().length > 0;
          const hasValidAnswers = question.answers.every(a => a.text.trim().length > 0);
          const hasCorrectAnswer = question.answers.some(a => a.isCorrect);
          return hasValidText && hasValidAnswers && hasCorrectAnswer;
        });
      case 3:
        return true; // Settings are optional
      case 4:
        return true; // Final review
      default:
        return false;
    }
  };

  if (!user) return null;

  // Show loading screen while loading quiz data
  if (isDraftLoading) {
    const state = location.state;
    const wasPublished = state?.wasPublished;
    
    return (
      <div className="create-quiz-container">
        <div className="create-quiz-content">
          <div className="loading-state">
            <div className="loading-spinner">⌛</div>
            <h2>{wasPublished ? 'クイズを読み込み中...' : '下書きを読み込み中...'}</h2>
            <p>データを復元しています。しばらくお待ちください。</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-quiz-container">
      <div className="create-quiz-content">
        {/* Header */}
        <header className="create-quiz-header">
          <div className="header-left">
            <button 
              className="back-button"
              onClick={() => navigate('/dashboard')}
            >
              ← ダッシュボードに戻る
            </button>
            <h1 className="page-title">
              {location.state?.editMode ? 
                (location.state?.wasPublished ? 'クイズ編集（公開済み）' : 
                 location.state?.draftMode ? 'クイズ編集（下書き）' : 'クイズ編集') : 
                'クイズ作成'}
            </h1>
          </div>
          <div className="header-right">
            <span className="creator-info">
              作成者: {user.username}
            </span>
          </div>
        </header>

        {/* Save Status Indicator */}
        <SaveStatusIndicator
          saveStatus={saveStatus}
          lastSaved={lastSaved}
          onTemporarySave={handleTemporarySave}
          autoSaveEnabled={autoSaveEnabled}
          onToggleAutoSave={() => setAutoSaveEnabled(!autoSaveEnabled)}
        />

        {/* Progress Indicator */}
        <div className="progress-container">
          <div className="progress-steps">
            {stepTitles.map((title, index) => {
              const stepNumber = index + 1;
              const isActive = stepNumber === currentStep;
              const isCompleted = stepNumber < currentStep;
              
              return (
                <div 
                  key={stepNumber}
                  className={`progress-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                >
                  <div className="step-circle">
                    {isCompleted ? '✓' : stepNumber}
                  </div>
                  <span className="step-title">{title}</span>
                </div>
              );
            })}
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Main Content */}
        <main className="create-quiz-main">
          <div className="form-container">
            {currentStep === 1 && (
              <MetadataForm 
                metadata={metadata} 
                setMetadata={setMetadata}
                questionSetId={currentQuizId}
                onThumbnailUploadReady={(uploadFn) => {
                  thumbnailUploadRef.current = uploadFn;
                }}
              />
            )}

            {currentStep === 2 && (
              <QuestionsForm 
                ref={questionsFormRef}
                questions={questions} 
                setQuestions={setQuestions}
                questionSetId={currentQuizId}
              />
            )}

            {currentStep === 3 && (
              <SettingsForm 
                settings={settings} 
                setSettings={setSettings}
                questions={questions}
                onPreviewQuiz={handlePreviewQuiz}
                onReorderQuestions={handleReorderQuestions}
                questionSetId={currentQuizId}
              />
            )}

            {currentStep === 4 && (
              <ReviewForm
                metadata={metadata}
                questions={questions}
                settings={settings}
                questionSetId={currentQuizId}
                wasPublished={metadata.wasPublished || false}
                onPublish={() => {
                  const successMessage = metadata.wasPublished ? 
                    'クイズの更新が正常に公開されました！' : 
                    'クイズが正常に公開されました！';
                  showSuccess(successMessage);
                  navigate('/dashboard');
                }}
                onReorderQuestions={handleReorderQuestions}
              />
            )}
          </div>
        </main>

        {/* Navigation */}
        <footer className="create-quiz-footer">
          <div className="nav-buttons">
            <button 
              className="nav-button secondary"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              前へ
            </button>
            
            <div className="step-indicator">
              {currentStep} / {totalSteps}
            </div>

            {currentStep < totalSteps ? (
              <button 
                className="nav-button primary"
                onClick={handleNext}
                disabled={!canProceed()}
              >
                次へ
              </button>
            ) : (
              <div className="final-step-info">
                <span className="final-step-text">
                  内容を確認して公開ボタンをクリックしてください
                </span>
              </div>
            )}
          </div>
        </footer>

        {/* Modals */}
        <QuestionReorderModal
          isOpen={showReorderModal}
          onClose={() => setShowReorderModal(false)}
          questions={questions}
          onReorder={handleReorderComplete}
          questionSetId={currentQuizId}
        />
      </div>
    </div>
  );
}

export default CreateQuiz;
