const DatabaseManager = require('../config/database');

class QuestionService {
  constructor() {
    this.db = new DatabaseManager();
  }

  /**
   * Get complete question set for game with answers, images, and explanations
   * @param {string} questionSetId - UUID of the question set
   * @returns {Promise<Object>} - Questions formatted for game use
   */
  async getQuestionSetForGame(questionSetId) {
    try {
      console.log(`🎯 Loading questions for game from question set: ${questionSetId}`);
      
      // Single optimized query to get all question data
      const { data: questions, error } = await this.db.supabaseAdmin
        .from('questions')
        .select(`
          id,
          question_text,
          question_type,
          image_url,
          time_limit,
          points,
          order_index,
          explanation_title,
          explanation_text,
          explanation_image_url,
          answers:answers(
            id,
            answer_text,
            image_url,
            is_correct,
            order_index,
            answer_explanation
          )
        `)
        .eq('question_set_id', questionSetId)
        .order('order_index');

      if (error) {
        console.error('❌ Database error loading questions:', error);
        throw new Error(`Failed to load questions: ${error.message}`);
      }

      if (!questions || questions.length === 0) {
        console.warn(`⚠️ No questions found for question set: ${questionSetId}`);
        return {
          success: false,
          error: 'No questions found for this question set',
          questions: []
        };
      }

      // Sort answers by order_index for each question
      const processedQuestions = questions.map(question => ({
        ...question,
        answers: question.answers ? 
          question.answers.sort((a, b) => a.order_index - b.order_index) : 
          []
      }));

      console.log(`✅ Loaded ${processedQuestions.length} questions with answers for game`);
      
      // Log question types for debugging
      const questionTypes = processedQuestions.map(q => q.question_type);
      console.log(`📋 Question types: ${[...new Set(questionTypes)].join(', ')}`);

      return {
        success: true,
        questions: processedQuestions,
        totalQuestions: processedQuestions.length
      };

    } catch (error) {
      console.error('❌ Error in getQuestionSetForGame:', error);
      return {
        success: false,
        error: error.message,
        questions: []
      };
    }
  }

  /**
   * Get lightweight question data for preloading during waiting room
   * @param {string} questionSetId - UUID of the question set
   * @returns {Promise<Object>} - Basic question data for preloading
   */
  async preloadQuestionsForWaiting(questionSetId) {
    try {
      console.log(`⏳ Preloading question data for waiting room: ${questionSetId}`);
      
      // Get minimal data needed for preloading (images and basic info)
      const { data: questions, error } = await this.db.supabaseAdmin
        .from('questions')
        .select(`
          id,
          question_text,
          image_url,
          explanation_image_url,
          order_index,
          answers:answers(
            id,
            answer_text,
            image_url,
            order_index
          )
        `)
        .eq('question_set_id', questionSetId)
        .order('order_index');

      if (error) {
        console.error('❌ Database error preloading questions:', error);
        throw new Error(`Failed to preload questions: ${error.message}`);
      }

      if (!questions || questions.length === 0) {
        console.warn(`⚠️ No questions found for preloading: ${questionSetId}`);
        return {
          success: false,
          error: 'No questions found for preloading',
          questions: []
        };
      }

      // Extract all image URLs for preloading
      const imageUrls = [];
      questions.forEach(question => {
        if (question.image_url) imageUrls.push(question.image_url);
        if (question.explanation_image_url) imageUrls.push(question.explanation_image_url);
        if (question.answers) {
          question.answers.forEach(answer => {
            if (answer.image_url) imageUrls.push(answer.image_url);
          });
        }
      });

      console.log(`✅ Preloaded ${questions.length} questions with ${imageUrls.length} images`);

      return {
        success: true,
        questions: questions.map(q => ({
          id: q.id,
          question_text: q.question_text.substring(0, 100) + '...', // Truncated for preload
          totalAnswers: q.answers ? q.answers.length : 0,
          hasQuestionImage: !!q.image_url,
          hasExplanationImage: !!q.explanation_image_url
        })),
        imageUrls: [...new Set(imageUrls)], // Remove duplicates
        totalQuestions: questions.length
      };

    } catch (error) {
      console.error('❌ Error in preloadQuestionsForWaiting:', error);
      return {
        success: false,
        error: error.message,
        questions: [],
        imageUrls: []
      };
    }
  }

  /**
   * Get question set metadata and settings
   * @param {string} questionSetId - UUID of the question set
   * @returns {Promise<Object>} - Question set metadata
   */
  async getQuestionSetMetadata(questionSetId) {
    try {
      console.log(`📋 Loading question set metadata: ${questionSetId}`);
      
      const { data: questionSet, error } = await this.db.supabaseAdmin
        .from('question_sets')
        .select(`
          id,
          title,
          description,
          total_questions,
          play_settings,
          difficulty_level
        `)
        .eq('id', questionSetId)
        .single();

      if (error) {
        console.error('❌ Database error loading question set metadata:', error);
        throw new Error(`Failed to load question set metadata: ${error.message}`);
      }

      if (!questionSet) {
        console.warn(`⚠️ Question set not found: ${questionSetId}`);
        return {
          success: false,
          error: 'Question set not found'
        };
      }

      console.log(`✅ Loaded metadata for question set: ${questionSet.title}`);

      return {
        success: true,
        questionSet: {
          ...questionSet,
          play_settings: questionSet.play_settings || {}
        }
      };

    } catch (error) {
      console.error('❌ Error in getQuestionSetMetadata:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate that a question set has the minimum required data for a game
   * @param {string} questionSetId - UUID of the question set
   * @returns {Promise<Object>} - Validation result
   */
  async validateQuestionSetForGame(questionSetId) {
    try {
      console.log(`🔍 Validating question set for game: ${questionSetId}`);
      
      // Check question set exists and get basic info
      const metadataResult = await this.getQuestionSetMetadata(questionSetId);
      if (!metadataResult.success) {
        return metadataResult;
      }

      // Check that questions exist and have answers
      const { data: questionCount, error: countError } = await this.db.supabaseAdmin
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('question_set_id', questionSetId);

      if (countError) {
        throw new Error(`Failed to count questions: ${countError.message}`);
      }

      const totalQuestions = questionCount;
      
      if (totalQuestions === 0) {
        return {
          success: false,
          error: 'Question set contains no questions'
        };
      }

      // Check that questions have answers
      const { data: questionsWithAnswers, error: answerError } = await this.db.supabaseAdmin
        .from('questions')
        .select(`
          id,
          answers:answers(id)
        `)
        .eq('question_set_id', questionSetId);

      if (answerError) {
        throw new Error(`Failed to validate answers: ${answerError.message}`);
      }

      const questionsWithoutAnswers = questionsWithAnswers.filter(q => 
        !q.answers || q.answers.length === 0
      );

      if (questionsWithoutAnswers.length > 0) {
        console.warn(`⚠️ ${questionsWithoutAnswers.length} questions have no answers`);
      }

      const validQuestions = questionsWithAnswers.length - questionsWithoutAnswers.length;

      console.log(`✅ Question set validation complete: ${validQuestions}/${questionsWithAnswers.length} questions have answers`);

      return {
        success: true,
        validation: {
          totalQuestions: questionsWithAnswers.length,
          validQuestions: validQuestions,
          questionsWithoutAnswers: questionsWithoutAnswers.length,
          questionSet: metadataResult.questionSet
        }
      };

    } catch (error) {
      console.error('❌ Error in validateQuestionSetForGame:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = QuestionService;
