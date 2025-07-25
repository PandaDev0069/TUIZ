/**
 * Data cleanup utilities for API requests
 * Removes file objects and other non-serializable data before sending to backend
 */

/**
 * Clean metadata object for API transmission
 */
export const cleanMetadata = (metadata) => {
  const cleaned = { ...metadata };
  
  // Remove file objects that can't be JSON serialized
  delete cleaned.thumbnail_file;
  
  // Ensure required fields have proper defaults
  cleaned.title = cleaned.title?.trim() || "Untitled Quiz";
  cleaned.description = cleaned.description?.trim() || "";
  cleaned.category = cleaned.category || "general";
  cleaned.difficulty_level = cleaned.difficulty_level || "medium";
  
  // Ensure arrays are properly formatted for database
  if (cleaned.tags && Array.isArray(cleaned.tags)) {
    cleaned.tags = cleaned.tags.filter(tag => tag && tag.trim());
  } else if (typeof cleaned.tags === 'string') {
    // Handle case where tags might be a comma-separated string
    cleaned.tags = cleaned.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
  } else {
    cleaned.tags = [];
  }
  
  // Convert string fields to proper types
  if (cleaned.estimated_duration) {
    cleaned.estimated_duration = parseInt(cleaned.estimated_duration) || 5;
  } else {
    cleaned.estimated_duration = 5; // Default 5 minutes
  }
  
  // Ensure boolean fields are properly set
  cleaned.is_public = Boolean(cleaned.is_public);
  
  // Validate enum values
  const validDifficulties = ['easy', 'medium', 'hard', 'expert'];
  if (!validDifficulties.includes(cleaned.difficulty_level)) {
    cleaned.difficulty_level = 'medium'; // Default fallback
  }
  
  // Validate category - ensure it's not empty
  const validCategories = ['general', 'science', 'history', 'sports', 'entertainment', 'technology', 'other'];
  if (!cleaned.category || !validCategories.includes(cleaned.category)) {
    cleaned.category = 'general'; // Safe default
  }
  
  return cleaned;
};

/**
 * Clean questions array for API transmission
 */
export const cleanQuestions = (questions) => {
  return questions.map(question => cleanQuestion(question));
};

/**
 * Clean single question object for API transmission
 */
export const cleanQuestion = (question) => {
  const cleaned = { ...question };
  
  // Remove file objects
  delete cleaned.imageFile;
  delete cleaned.explanation_imageFile;
  
  // Clean answers
  if (cleaned.answers && Array.isArray(cleaned.answers)) {
    cleaned.answers = cleaned.answers.map(answer => {
      const cleanedAnswer = { ...answer };
      delete cleanedAnswer.imageFile;
      return cleanedAnswer;
    });
  }
  
  // Ensure proper data types
  cleaned.timeLimit = parseInt(cleaned.timeLimit) || 30;
  cleaned.points = parseInt(cleaned.points) || 100;
  
  return cleaned;
};

/**
 * Get summary data for auto-save (minimal data to reduce payload size)
 */
export const getSummaryData = (metadata, questions) => {
  return {
    metadata: {
      title: metadata.title,
      description: metadata.description,
      category: metadata.category,
      difficulty_level: metadata.difficulty_level,
      is_public: metadata.is_public,
      tags: metadata.tags
    },
    questionsCount: questions.length,
    hasImages: questions.some(q => q.image || q.explanation_image || 
      q.answers.some(a => a.image))
  };
};

export default {
  cleanMetadata,
  cleanQuestions,
  cleanQuestion,
  getSummaryData
};
