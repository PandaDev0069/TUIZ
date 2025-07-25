import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import QuizSaveManager from '../utils/quizSaveManager';
import { getSummaryData } from '../utils/dataCleanup';

/**
 * Hook for managing quiz creation with progressive saving
 */
export const useQuizCreation = () => {
  const { apiCall } = useAuth();
  const { showSuccess, showError, showInfo } = useToast();
  
  // Initialize save manager
  const saveManager = new QuizSaveManager(apiCall);
  
  // State management
  const [currentQuizId, setCurrentQuizId] = useState(null);
  const [saveStatus, setSaveStatus] = useState('unsaved'); // 'unsaved', 'saving', 'saved', 'error'
  const [lastSaved, setLastSaved] = useState(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  // Auto-save timer ref (use ref to prevent infinite loops)
  const autoSaveTimer = useRef(null);

  /**
   * Create initial draft quiz
   */
  const createDraftQuiz = useCallback(async (metadata) => {
    if (!metadata.title?.trim()) {
      throw new Error('タイトルは必須です');
    }

    try {
      setSaveStatus('saving');
      console.log('Creating draft quiz with metadata:', metadata);
      const quiz = await saveManager.createDraftQuiz(metadata);
      setCurrentQuizId(quiz.id);
      setSaveStatus('saved');
      setLastSaved(new Date());
      showSuccess('クイズの下書きを作成しました');
      console.log('Draft quiz created successfully:', quiz.id);
      return quiz.id;
    } catch (error) {
      setSaveStatus('error');
      console.error('Draft creation failed with detailed error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        fullError: error
      });
      // Don't show error here, let the calling function handle it
      throw error;
    }
  }, [saveManager, showSuccess]);

  /**
   * Manual save (一時保存 button)
   */
  const temporarySave = useCallback(async (metadata, questions) => {
    // Create enhanced metadata with better defaults for intermediate save
    const enhancedMetadata = {
      ...metadata,
      // Ensure required fields have values
      title: metadata.title?.trim() || "Untitled Quiz",
      description: metadata.description?.trim() || "",
      category: metadata.category || "general",
      difficulty_level: metadata.difficulty_level || "medium",
      estimated_duration: metadata.estimated_duration || 5,
      is_public: Boolean(metadata.is_public),
      tags: Array.isArray(metadata.tags) ? metadata.tags : []
    };

    // Skip if no title (minimum requirement)
    if (!enhancedMetadata.title?.trim() || enhancedMetadata.title === "Untitled Quiz") {
      showError('タイトルを入力してください');
      return null;
    }

    if (!currentQuizId) {
      // Create draft if doesn't exist
      try {
        console.log('Creating new draft quiz with enhanced metadata:', enhancedMetadata);
        const quizId = await createDraftQuiz(enhancedMetadata);
        return quizId;
      } catch (error) {
        console.error('Draft creation failed with error:', error);
        // Handle payload size errors specifically
        if (error.message.includes('too large') || error.message.includes('413')) {
          showError('データサイズが大きすぎます。画像を小さくするか、項目を減らしてください。');
        } else if (error.message.includes('42501')) {
          showError('認証エラーが発生しました。再ログインしてください。');
        } else {
          showError(`一時保存に失敗しました: ${error.message}`);
        }
        return null;
      }
    }

    try {
      setSaveStatus('saving');
      
      // Use summary data for auto-save to reduce payload size
      const summaryData = getSummaryData(enhancedMetadata, questions);
      
      console.log('Updating existing quiz with summary data:', summaryData);
      
      // Update metadata with summary data
      await saveManager.updateMetadata(currentQuizId, summaryData.metadata);
      
      // Update status to 'creating' if has questions
      if (questions.length > 0) {
        await saveManager.setStatusCreating(currentQuizId);
      }
      
      // Update question count
      await saveManager.updateQuestionCount(currentQuizId, questions.length);
      
      setSaveStatus('saved');
      setLastSaved(new Date());
      showSuccess('一時保存しました');
      
      return currentQuizId;
    } catch (error) {
      setSaveStatus('error');
      console.error('Temporary save failed:', error);
      
      // Handle specific error types
      if (error.message.includes('too large') || error.message.includes('413')) {
        showError('データサイズが大きすぎます。画像サイズを小さくしてください。');
      } else {
        showError('一時保存に失敗しました。ネットワーク接続を確認してください。');
      }
      return null;
    }
  }, [currentQuizId, saveManager, showSuccess, showError, createDraftQuiz]);

  /**
   * Auto-save functionality
   */
  const triggerAutoSave = useCallback(async (metadata, questions) => {
    if (!autoSaveEnabled || !currentQuizId) return;

    try {
      const result = await saveManager.autoSave(currentQuizId, {
        metadata,
        questions
      });
      
      if (result.success) {
        setSaveStatus('saved');
        setLastSaved(result.timestamp);
      }
    } catch (error) {
      console.warn('Auto-save failed:', error);
      setSaveStatus('error');
    }
  }, [currentQuizId, autoSaveEnabled, saveManager]);

  /**
   * Schedule auto-save
   */
  const scheduleAutoSave = useCallback((metadata, questions) => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    const timer = setTimeout(() => {
      triggerAutoSave(metadata, questions);
    }, 30000); // Auto-save every 30 seconds

    autoSaveTimer.current = timer;
  }, [triggerAutoSave]); // Remove autoSaveTimer from dependencies

  /**
   * Save individual question (progressive saving)
   */
  const saveQuestion = useCallback(async (questionData, orderIndex) => {
    if (!currentQuizId) {
      throw new Error('Quiz ID not found. Please save metadata first.');
    }

    try {
      const savedQuestion = await saveManager.saveQuestion(
        currentQuizId, 
        questionData, 
        orderIndex
      );

      // Save answers if they exist
      if (questionData.answers && questionData.answers.length > 0) {
        await saveManager.saveAnswers(savedQuestion.id, questionData.answers);
      }

      return savedQuestion;
    } catch (error) {
      showError('質問の保存に失敗しました: ' + error.message);
      throw error;
    }
  }, [currentQuizId, saveManager, showError]);

  /**
   * Final publish
   */
  const publishQuiz = useCallback(async (finalSettings = {}) => {
    if (!currentQuizId) {
      throw new Error('Quiz ID not found');
    }

    try {
      setSaveStatus('saving');
      const result = await saveManager.publishQuiz(currentQuizId, finalSettings);
      setSaveStatus('saved');
      showSuccess('クイズを公開しました！');
      return result;
    } catch (error) {
      setSaveStatus('error');
      showError('公開に失敗しました: ' + error.message);
      throw error;
    }
  }, [currentQuizId, saveManager, showSuccess, showError]);

  /**
   * Load existing draft
   */
  const loadDraft = useCallback(async (quizId) => {
    try {
      const data = await saveManager.loadDraft(quizId);
      setCurrentQuizId(quizId);
      setSaveStatus('saved');
      return data;
    } catch (error) {
      showError('下書きの読み込みに失敗しました: ' + error.message);
      throw error;
    }
  }, [saveManager, showError]);

  /**
   * Delete draft
   */
  const deleteDraft = useCallback(async () => {
    if (!currentQuizId) return;

    try {
      await saveManager.deleteDraft(currentQuizId);
      setCurrentQuizId(null);
      setSaveStatus('unsaved');
      showInfo('下書きを削除しました');
    } catch (error) {
      showError('削除に失敗しました: ' + error.message);
    }
  }, [currentQuizId, saveManager, showInfo, showError]);

  // Cleanup auto-save timer
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, []); // Empty dependency array - cleanup only on unmount

  // Mark as unsaved when data changes
  const markUnsaved = useCallback(() => {
    setSaveStatus(prevStatus => prevStatus === 'saved' ? 'unsaved' : prevStatus);
  }, []); // No dependencies needed with setter function pattern

  return {
    // State
    currentQuizId,
    saveStatus,
    lastSaved,
    autoSaveEnabled,
    
    // Actions
    createDraftQuiz,
    temporarySave,
    scheduleAutoSave,
    saveQuestion,
    publishQuiz,
    loadDraft,
    deleteDraft,
    markUnsaved,
    
    // Settings
    setAutoSaveEnabled
  };
};

export default useQuizCreation;
