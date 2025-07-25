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
    
    // Ensure all database required fields are provided with proper defaults
    const draftData = {
      // Required fields from database schema
      title: cleanedMetadata.title?.trim() || "Untitled Quiz",
      description: cleanedMetadata.description?.trim() || "",
      category: cleanedMetadata.category || "general", // Use 'general' as safe default
      difficulty_level: cleanedMetadata.difficulty_level || "medium",
      
      // Optional fields with safe defaults
      is_public: Boolean(cleanedMetadata.is_public), // Always false for drafts
      estimated_duration: cleanedMetadata.estimated_duration || 5, // Default 5 minutes
      total_questions: 0, // Will be updated as questions are added
      times_played: 0,
      average_score: 0.0,
      completion_rate: 0.0,
      
      // Status and metadata
      status: 'draft',
      tags: Array.isArray(cleanedMetadata.tags) ? cleanedMetadata.tags : [],
      
      // Optional URL fields (can be null)
      thumbnail_url: cleanedMetadata.thumbnail_url || null,
      
      // Settings
      play_settings: {}
    };

    console.log('Creating draft quiz with data:', draftData);

    try {
      const result = await this.apiCall('/quiz/create', {
        method: 'POST',
        body: JSON.stringify(draftData)
      });

      console.log('Draft quiz creation successful:', result);
      return result.quiz;
    } catch (error) {
      console.error('Draft quiz creation failed:', {
        error: error.message,
        data: draftData,
        fullError: error,
        stack: error.stack
      });
      
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
   * Update quiz status to 'creating' when user starts adding questions
   */
  async setStatusCreating(quizId) {
    return await this.apiCall(`/quiz/${quizId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'creating' })
    });
  }

  /**
   * Save quiz metadata updates
   */
  async updateMetadata(quizId, metadata) {
    const cleanedMetadata = cleanMetadata(metadata);
    
    // Ensure all required fields are included with proper defaults
    const updateData = {
      title: cleanedMetadata.title?.trim() || "Untitled Quiz",
      description: cleanedMetadata.description?.trim() || "",
      category: cleanedMetadata.category || "general",
      difficulty_level: cleanedMetadata.difficulty_level || "medium",
      is_public: Boolean(cleanedMetadata.is_public),
      estimated_duration: cleanedMetadata.estimated_duration || 5,
      tags: Array.isArray(cleanedMetadata.tags) ? cleanedMetadata.tags : [],
      thumbnail_url: cleanedMetadata.thumbnail_url || null
    };

    console.log('Updating quiz metadata:', updateData);

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
    const quiz = await this.apiCall(`/quiz/${quizId}`);
    const questions = await this.apiCall(`/quiz/${quizId}/questions`);
    
    return {
      quiz,
      questions
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
      
      // Update metadata with cleaned data
      await this.updateMetadata(quizId, summaryData.metadata);
      
      // Update question count
      await this.updateQuestionCount(quizId, summaryData.questionsCount);
      
      return { success: true, timestamp: new Date() };
    } catch (error) {
      console.error('Auto-save failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export default QuizSaveManager;
