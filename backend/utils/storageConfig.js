// Storage Configuration Validator
// This utility helps validate that all storage-related environment variables are properly configured

const validateStorageConfig = () => {
  const errors = [];
  const warnings = [];
  
  // Required environment variables
  const requiredVars = {
    'SUPABASE_URL': process.env.SUPABASE_URL,
    'SUPABASE_SERVICE_KEY': process.env.SUPABASE_SERVICE_KEY,
  };
  
  // Storage bucket environment variables
  const storageVars = {
    'STORAGE_BUCKET_AVATARS': process.env.STORAGE_BUCKET_AVATARS || 'avatars',
    'STORAGE_BUCKET_QUIZ_THUMBNAILS': process.env.STORAGE_BUCKET_QUIZ_THUMBNAILS || 'quiz-thumbnails',
    'STORAGE_BUCKET_QUESTION_IMAGES': process.env.STORAGE_BUCKET_QUESTION_IMAGES || 'question-images',
    'STORAGE_BUCKET_ANSWER_IMAGES': process.env.STORAGE_BUCKET_ANSWER_IMAGES || 'answer-images',
  };
  
  // File size configuration
  const maxUploadSize = parseInt(process.env.MAX_UPLOAD_SIZE) || 10485760; // 10MB default
  
  // Check required variables
  Object.entries(requiredVars).forEach(([key, value]) => {
    if (!value) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  });
  
  // Validate file size
  if (maxUploadSize < 1024 * 1024) { // Less than 1MB
    warnings.push(`MAX_UPLOAD_SIZE (${maxUploadSize}) seems very small. Consider at least 1MB.`);
  }
  
  if (maxUploadSize > 50 * 1024 * 1024) { // More than 50MB
    warnings.push(`MAX_UPLOAD_SIZE (${maxUploadSize}) is very large. Consider reducing for better performance.`);
  }
  
  // Log configuration
  console.log('📁 Storage Configuration:');
  console.log('========================');
  
  Object.entries(storageVars).forEach(([key, value]) => {
    const isDefault = !process.env[key];
    console.log(`${key}: ${value}${isDefault ? ' (default)' : ''}`);
  });
  
  console.log(`MAX_UPLOAD_SIZE: ${(maxUploadSize / 1024 / 1024).toFixed(1)}MB`);
  
  // Report validation results
  if (errors.length > 0) {
    console.log('\n❌ Configuration Errors:');
    errors.forEach(error => console.log(`  - ${error}`));
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Configuration Warnings:');
    warnings.forEach(warning => console.log(`  - ${warning}`));
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('\n✅ Storage configuration looks good!');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config: {
      ...storageVars,
      maxUploadSize
    }
  };
};

// Storage bucket information
const getStorageBucketInfo = () => {
  return {
    avatars: {
      name: process.env.STORAGE_BUCKET_AVATARS || 'avatars',
      purpose: 'User profile avatars',
      maxSize: '10MB',
      dashboardUrl: process.env.STORAGE_AVATARS_URL
    },
    quizThumbnails: {
      name: process.env.STORAGE_BUCKET_QUIZ_THUMBNAILS || 'quiz-thumbnails',
      purpose: 'Quiz thumbnail images',
      maxSize: '10MB',
      dashboardUrl: process.env.STORAGE_QUIZ_THUMBNAILS_URL
    },
    questionImages: {
      name: process.env.STORAGE_BUCKET_QUESTION_IMAGES || 'question-images',
      purpose: 'Images attached to questions',
      maxSize: '5MB',
      dashboardUrl: process.env.STORAGE_QUESTION_IMAGES_URL
    },
    answerImages: {
      name: process.env.STORAGE_BUCKET_ANSWER_IMAGES || 'answer-images',
      purpose: 'Images attached to answer options',
      maxSize: '3MB',
      dashboardUrl: process.env.STORAGE_ANSWER_IMAGES_URL
    }
  };
};

// Function to generate file path for storage
const generateStoragePath = (userId, type, entityId, originalFilename) => {
  const fileExtension = originalFilename.split('.').pop();
  const timestamp = Date.now();
  const fileName = `${type}_${entityId}_${timestamp}.${fileExtension}`;
  return `${userId}/${fileName}`;
};

// Function to get storage bucket name by type
const getStorageBucket = (type) => {
  const buckets = {
    'avatar': process.env.STORAGE_BUCKET_AVATARS || 'avatars',
    'quiz-thumbnail': process.env.STORAGE_BUCKET_QUIZ_THUMBNAILS || 'quiz-thumbnails',
    'question-image': process.env.STORAGE_BUCKET_QUESTION_IMAGES || 'question-images',
    'answer-image': process.env.STORAGE_BUCKET_ANSWER_IMAGES || 'answer-images'
  };
  
  return buckets[type] || null;
};

module.exports = {
  validateStorageConfig,
  getStorageBucketInfo,
  generateStoragePath,
  getStorageBucket
};
