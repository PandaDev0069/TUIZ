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
  
  // Clean and validate title (required, max 255 chars)
  cleaned.title = cleaned.title?.trim() || "Untitled Quiz";
  if (cleaned.title.length > 255) {
    cleaned.title = cleaned.title.substring(0, 255);
  }
  
  // Clean description (optional, can be null)
  cleaned.description = cleaned.description?.trim() || null;
  
  // Clean category (optional, can be null, max 100 chars)
  if (cleaned.category) {
    cleaned.category = cleaned.category.trim();
    if (cleaned.category.length > 100) {
      cleaned.category = cleaned.category.substring(0, 100);
    }
  } else {
    cleaned.category = null;
  }
  
  // Validate difficulty_level (max 20 chars, enum values)
  const validDifficulties = ['easy', 'medium', 'hard', 'expert'];
  if (!cleaned.difficulty_level || !validDifficulties.includes(cleaned.difficulty_level)) {
    cleaned.difficulty_level = 'medium'; // Default fallback
  }
  
  // Ensure arrays are properly formatted for database
  if (cleaned.tags && Array.isArray(cleaned.tags)) {
    cleaned.tags = cleaned.tags.filter(tag => tag && tag.trim());
  } else if (typeof cleaned.tags === 'string') {
    // Handle case where tags might be a comma-separated string
    cleaned.tags = cleaned.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
  } else {
    cleaned.tags = [];
  }
  
  // Convert estimated_duration to integer or null (must be positive if provided)
  if (cleaned.estimated_duration) {
    const duration = parseInt(cleaned.estimated_duration);
    cleaned.estimated_duration = (duration > 0) ? duration : null;
  } else {
    cleaned.estimated_duration = null;
  }
  
  // Ensure boolean fields are properly set
  cleaned.is_public = Boolean(cleaned.is_public);
  
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
