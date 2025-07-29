/**
 * Quiz Save Manager - Handles progressive saving during quiz creation
 * Allows saving incomplete quizzes with 'draft' or 'creating' status
 */

import { cleanMetadata, cleanQuestions, getSummaryData } from './dataCleanup';

export class QuizSaveManager {
  constructor(apiCall) {
    this.apiCall = apiCall;
  }

  /**
   * Create initial quiz with minimal required fields
   * Status: 'draft' - allows saving with just title
   */
  async createDraftQuiz(metadata) {
    const cleanedMetadata = cleanMetadata(metadata);
    
    // Ensure all database required fields are provided with proper defaults and validation
    const draftData = {
      // Required fields from database schema with validation
      title: cleanedMetadata.title?.trim() || "Untitled Quiz",
      description: cleanedMetadata.description?.trim() || null,
      category: cleanedMetadata.category || null, // Can be null according to schema
      difficulty_level: cleanedMetadata.difficulty_level || "medium",
      
      // Optional fields with safe defaults
      is_public: Boolean(cleanedMetadata.is_public), // Default false
      estimated_duration: cleanedMetadata.estimated_duration || null, // Can be null
      total_questions: 0, // Will be updated as questions are added
      times_played: 0,
      average_score: 0.0,
      completion_rate: 0.0,
      last_played_at: null,
      
      // Status and metadata
      status: 'draft',
      tags: Array.isArray(cleanedMetadata.tags) ? cleanedMetadata.tags : [],
      
      // Optional URL fields (can be null)
      thumbnail_url: cleanedMetadata.thumbnail_url || null,
      
      // Settings
      play_settings: {}
    };

    // Validate title length (max 255 characters)
    if (draftData.title.length > 255) {
      throw new Error('タイトルは255文字以内で入力してください');
    }

    // Validate category length (max 100 characters)
    if (draftData.category && draftData.category.length > 100) {
      throw new Error('カテゴリーは100文字以内で入力してください');
    }

    // Validate estimated_duration (must be positive if provided)
    if (draftData.estimated_duration && draftData.estimated_duration <= 0) {
      throw new Error('推定時間は正の数で入力してください');
    }

    try {
      const result = await this.apiCall('/quiz/create', {
        method: 'POST',
        body: JSON.stringify(draftData)
      });

      return result.quiz;
    } catch (error) {
      console.error('❌ Draft creation failed:', error.message);
      
      // Check if it's an authentication error
      if (error.message.includes('token') || error.message.includes('401') || error.message.includes('unauthorized')) {
        console.error('🔐 Authentication error detected - user may need to re-login');
      }
      
      // Check if it's an RLS policy error
      if (error.message.includes('42501') || error.message.includes('row-level security')) {
        console.error('🛡️ RLS policy violation - database permissions issue');
      }
      
      throw error;
    }
  }

  /**
   * Save quiz metadata updates
   */
  async updateMetadata(quizId, metadata, preserveThumbnail = true) {
    const cleanedMetadata = cleanMetadata(metadata);
    
    // Ensure all required fields are included with proper defaults and validation
    const updateData = {
      title: cleanedMetadata.title?.trim() || "Untitled Quiz",
      description: cleanedMetadata.description?.trim() || null,
      category: cleanedMetadata.category || null,
      difficulty_level: cleanedMetadata.difficulty_level || "medium",
      is_public: Boolean(cleanedMetadata.is_public),
      estimated_duration: cleanedMetadata.estimated_duration || null,
      tags: Array.isArray(cleanedMetadata.tags) ? cleanedMetadata.tags : []
    };

    // Validate title length (max 255 characters)
    if (updateData.title.length > 255) {
      throw new Error('タイトルは255文字以内で入力してください');
    }

    // Validate category length (max 100 characters)
    if (updateData.category && updateData.category.length > 100) {
      throw new Error('カテゴリーは100文字以内で入力してください');
    }

    // Validate estimated_duration (must be positive if provided)
    if (updateData.estimated_duration && updateData.estimated_duration <= 0) {
      throw new Error('推定時間は正の数で入力してください');
    }

    // Only include thumbnail_url if it's explicitly provided or if preserveThumbnail is false
    if (cleanedMetadata.thumbnail_url !== undefined || !preserveThumbnail) {
      updateData.thumbnail_url = cleanedMetadata.thumbnail_url || null;
    }
    // If preserveThumbnail is true and no thumbnail_url is provided, don't include it in the update
    // This prevents overwriting an existing thumbnail_url in the database

    console.log('💾 Updating metadata:', updateData.title);

    return await this.apiCall(`/quiz/${quizId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }

  /**
   * Save a single question (for progressive saving)
   */
  async saveQuestion(quizId, questionData, order_index) {
    const questionPayload = {
      question_set_id: quizId,
      question_text: questionData.text.trim(),
      question_type: questionData.question_type || 'multiple_choice',
      time_limit: questionData.timeLimit || 30,
      points: questionData.points || 100,
      difficulty: questionData.difficulty || 'medium',
      order_index: order_index,
      explanation_title: questionData.explanation_title || '',
      explanation_text: questionData.explanation_text || '',
      explanation_image_url: questionData.explanation_image_url || ''
    };

    return await this.apiCall('/questions', {
      method: 'POST',
      body: JSON.stringify(questionPayload)
    });
  }

  /**
   * Save answers for a question
   */
  async saveAnswers(questionId, answers) {
    const savedAnswers = [];
    
    for (let i = 0; i < answers.length; i++) {
      const answer = answers[i];
      const answerData = {
        question_id: questionId,
        answer_text: answer.text.trim(),
        is_correct: answer.isCorrect,
        order_index: i,
        answer_explanation: answer.explanation || '',
        image_url: answer.image_url || null
      };

      const savedAnswer = await this.apiCall('/answers', {
        method: 'POST',
        body: JSON.stringify(answerData)
      });

      savedAnswers.push(savedAnswer);
    }

    return savedAnswers;
  }

  /**
   * Update total questions count
   */
  async updateQuestionCount(quizId, count) {
    return await this.apiCall(`/quiz/${quizId}/question-count`, {
      method: 'PATCH',
      body: JSON.stringify({ total_questions: count })
    });
  }

  /**
   * Finalize quiz - change status to 'published'
   */
  async publishQuiz(quizId, finalSettings = {}) {
    const publishData = {
      status: 'published',
      ...finalSettings
    };

    return await this.apiCall(`/quiz/${quizId}/publish`, {
      method: 'POST',
      body: JSON.stringify(publishData)
    });
  }

  /**
   * Load existing draft/creating quiz
   */
  async loadDraft(quizId) {
    const quizResponse = await this.apiCall(`/quiz/${quizId}`);
    const questionsResponse = await this.apiCall(`/quiz/${quizId}/questions`);
    
    return {
      quiz: quizResponse.quiz,
      questions: questionsResponse.questions
    };
  }

  /**
   * Delete draft quiz
   */
  async deleteDraft(quizId) {
    return await this.apiCall(`/quiz/${quizId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Auto-save functionality
   */
  async autoSave(quizId, currentData) {
    try {
      // Use summary data to minimize payload size for auto-save
      const summaryData = getSummaryData(currentData.metadata, currentData.questions);
      
      // Update metadata with question count in a single API call
      const metadataWithCount = {
        ...summaryData.metadata,
        total_questions: summaryData.questionsCount
      };
      
      await this.updateMetadata(quizId, metadataWithCount);
      
      return { success: true, timestamp: new Date() };
    } catch (error) {
      console.error('Auto-save failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export default QuizSaveManager;
