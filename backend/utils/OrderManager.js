// Order Management Utilities
// These utilities help maintain proper order indices for questions and answers

const DatabaseManager = require('../config/database');
const logger = require('./logger');

class OrderManager {
  constructor() {
    this.db = new DatabaseManager();
  }

  /**
   * Update order indices for a set of questions
   * @param {string} questionSetId - The ID of the question set
   * @param {Array} questionOrder - Array of question IDs in the desired order
   * @returns {Promise<boolean>} - Success status
   */
  async updateQuestionOrder(questionSetId, questionOrder) {
    try {
      // Update each question with its new order index
      const updates = questionOrder.map((questionId, index) => 
        this.db.supabaseAdmin
          .from('questions')
          .update({ order_index: index })
          .eq('id', questionId)
          .eq('question_set_id', questionSetId) // Ensure ownership
      );

      const results = await Promise.all(updates);
      
      // Check if all updates succeeded
      return results.every(result => !result.error);
    } catch (error) {
      logger.error('Error updating question order:', error);
      return false;
    }
  }

  /**
   * Batch reorder questions with proper transaction handling
   * @param {Object} supabaseClient - User-scoped Supabase client
   * @param {string} questionSetId - The ID of the question set
   * @param {Array} questionOrders - Array of {questionId, order} objects
   * @returns {Promise<{success: boolean, error?: string, data?: any}>} - Result object
   */
  async reorderQuestions(supabaseClient, questionSetId, questionOrders) {
    try {
      // First, temporarily set all order_index to negative values to avoid conflicts
      const tempUpdates = questionOrders.map((item, index) => 
        supabaseClient
          .from('questions')
          .update({ order_index: -(index + 1) })
          .eq('id', item.questionId)
          .eq('question_set_id', questionSetId)
      );

      const tempResults = await Promise.all(tempUpdates);
      
      // Check if any temp updates failed
      const tempErrors = tempResults.filter(result => result.error);
      if (tempErrors.length > 0) {
        return {
          success: false,
          error: `Failed to prepare reorder: ${tempErrors[0].error.message}`
        };
      }

      // Now set the actual order indices
      const finalUpdates = questionOrders.map((item) => 
        supabaseClient
          .from('questions')
          .update({ order_index: item.order })
          .eq('id', item.questionId)
          .eq('question_set_id', questionSetId)
      );

      const finalResults = await Promise.all(finalUpdates);
      
      // Check if any final updates failed
      const finalErrors = finalResults.filter(result => result.error);
      if (finalErrors.length > 0) {
        return {
          success: false,
          error: `Failed to complete reorder: ${finalErrors[0].error.message}`
        };
      }

      return {
        success: true,
        data: { message: 'Questions reordered successfully' }
      };
    } catch (error) {
      logger.error('Error in batch reorder questions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update order indices for a set of answers
   * @param {string} questionId - The ID of the question
   * @param {Array} answerOrder - Array of answer IDs in the desired order
   * @returns {Promise<boolean>} - Success status
   */
  async updateAnswerOrder(questionId, answerOrder) {
    try {
      // Update each answer with its new order index
      const updates = answerOrder.map((answerId, index) => 
        this.db.supabaseAdmin
          .from('answers')
          .update({ order_index: index })
          .eq('id', answerId)
          .eq('question_id', questionId) // Ensure ownership
      );

      const results = await Promise.all(updates);
      
      // Check if all updates succeeded
      return results.every(result => !result.error);
    } catch (error) {
      logger.error('Error updating answer order:', error);
      return false;
    }
  }

  /**
   * Normalize order indices for questions in a question set
   * This ensures sequential ordering (0, 1, 2, 3...) without gaps
   * @param {string} questionSetId - The ID of the question set
   * @returns {Promise<boolean>} - Success status
   */
  async normalizeQuestionOrder(questionSetId) {
    try {
      // Get all questions ordered by current order_index
      const { data: questions, error: fetchError } = await this.db.supabaseAdmin
        .from('questions')
        .select('id')
        .eq('question_set_id', questionSetId)
        .order('order_index', { ascending: true });

      if (fetchError) {
        logger.error('Error fetching questions for normalization:', fetchError);
        return false;
      }

      // Update with sequential indices
      const questionOrder = questions.map(q => q.id);
      return await this.updateQuestionOrder(questionSetId, questionOrder);
    } catch (error) {
      logger.error('Error normalizing question order:', error);
      return false;
    }
  }

  /**
   * Normalize order indices for answers in a question
   * This ensures sequential ordering (0, 1, 2, 3...) without gaps
   * @param {string} questionId - The ID of the question
   * @returns {Promise<boolean>} - Success status
   */
  async normalizeAnswerOrder(questionId) {
    try {
      // Get all answers ordered by current order_index
      const { data: answers, error: fetchError } = await this.db.supabaseAdmin
        .from('answers')
        .select('id')
        .eq('question_id', questionId)
        .order('order_index', { ascending: true });

      if (fetchError) {
        logger.error('Error fetching answers for normalization:', fetchError);
        return false;
      }

      // Update with sequential indices
      const answerOrder = answers.map(a => a.id);
      return await this.updateAnswerOrder(questionId, answerOrder);
    } catch (error) {
      logger.error('Error normalizing answer order:', error);
      return false;
    }
  }

  /**
   * Validate that order indices are sequential and start from 0
   * @param {Array} items - Array of items with order_index property
   * @returns {boolean} - Whether the order is valid
   */
  validateOrder(items) {
    if (!items || items.length === 0) return true;
    
    // Sort by order_index
    const sorted = [...items].sort((a, b) => a.order_index - b.order_index);
    
    // Check if indices are sequential starting from 0
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].order_index !== i) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get the next available order index for a question set
   * @param {string} questionSetId - The ID of the question set
   * @returns {Promise<number>} - The next order index
   */
  async getNextQuestionOrderIndex(questionSetId) {
    try {
      const { data: questions, error } = await this.db.supabaseAdmin
        .from('questions')
        .select('order_index')
        .eq('question_set_id', questionSetId)
        .order('order_index', { ascending: false })
        .limit(1);

      if (error) {
        logger.error('Error getting next question order index:', error);
        return 0;
      }

      return questions.length > 0 ? questions[0].order_index + 1 : 0;
    } catch (error) {
      logger.error('Error getting next question order index:', error);
      return 0;
    }
  }

  /**
   * Get the next available order index for a question's answers
   * @param {string} questionId - The ID of the question
   * @returns {Promise<number>} - The next order index
   */
  async getNextAnswerOrderIndex(questionId) {
    try {
      const { data: answers, error } = await this.db.supabaseAdmin
        .from('answers')
        .select('order_index')
        .eq('question_id', questionId)
        .order('order_index', { ascending: false })
        .limit(1);

      if (error) {
        logger.error('Error getting next answer order index:', error);
        return 0;
      }

      return answers.length > 0 ? answers[0].order_index + 1 : 0;
    } catch (error) {
      logger.error('Error getting next answer order index:', error);
      return 0;
    }
  }
}

module.exports = OrderManager;
