const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const DatabaseManager = require('../../config/database');
const AuthMiddleware = require('../../middleware/auth');
const SecurityUtils = require('../../utils/SecurityUtils');
const RateLimitMiddleware = require('../../middleware/rateLimiter');
const logger = require('../../utils/logger');

// Initialize database manager
const dbManager = new DatabaseManager();
const supabase = dbManager.supabase;

const router = express.Router();

// Configure multer for thumbnail uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/thumbnails');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    try {
      // Generate secure filename to prevent path injection
      const secureFilename = SecurityUtils.generateSecureFilename(file.originalname, 'thumbnail');
      cb(null, secureFilename);
    } catch (error) {
      logger.error('Filename generation error:', error.message);
      cb(error, null);
    }
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit (increased from 5MB)
    fieldSize: 10 * 1024 * 1024, // 10MB for field data
  }
});

// Upload thumbnail endpoint
router.post('/upload-thumbnail', RateLimitMiddleware.createUploadLimit(), AuthMiddleware.authenticateToken, upload.single('thumbnail'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    // Read the uploaded file with secure path construction and validation
    const uploadsDir = path.join(__dirname, '../uploads/thumbnails');
    // Use the secure filename that multer generated (stored in req.file.filename)
    const secureFileName = req.file.filename; // This is already secure from multer config
    // Construct safe path from known safe directory and secure filename
    const safePath = path.join(uploadsDir, secureFileName);
    
    // Additional security validation - ensure path is within allowed directory
    const normalizedSafePath = path.resolve(safePath);
    const normalizedUploadsDir = path.resolve(uploadsDir);
    if (!normalizedSafePath.startsWith(normalizedUploadsDir + path.sep)) {
      throw new Error('Path traversal attempt detected');
    }
    
    const fileBuffer = fs.readFileSync(normalizedSafePath);

    // Upload to Supabase Storage with safe path
    const safeStoragePath = SecurityUtils.createSafeStoragePath(req.user.id, secureFileName);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('quiz-thumbnails')
      .upload(safeStoragePath, fileBuffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      logger.error('Supabase upload error:', uploadError);
      // Clean up local file
      try {
        fs.unlinkSync(normalizedSafePath); // normalizedSafePath is validated
      } catch (cleanupError) {
        SecurityUtils.safeLog('error', 'Failed to cleanup local file', {
          filePath: path.basename(secureFileName),
          error: cleanupError.message
        });
      }
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to upload to storage',
        error: uploadError.message 
      });
    }

    // Get public URL with safe path
    const { data: urlData } = supabase.storage
      .from('quiz-thumbnails')
      .getPublicUrl(safeStoragePath);

    // Clean up local file
    fs.unlinkSync(normalizedSafePath);

    res.json({
      success: true,
      message: 'Thumbnail uploaded successfully',
      thumbnail_url: urlData.publicUrl,
      file_path: uploadData.path
    });

  } catch (error) {
    logger.error('Thumbnail upload error:', error);
    
    // Clean up local file if it exists
    if (req.file && req.file.filename) {
      try {
        // Reconstruct safe path from known directory and secure filename with validation
        const uploadsDir = path.join(__dirname, '../uploads/thumbnails');
        const safePath = path.join(uploadsDir, req.file.filename);
        const normalizedSafePath = path.resolve(safePath);
        const normalizedUploadsDir = path.resolve(uploadsDir);
        if (!normalizedSafePath.startsWith(normalizedUploadsDir + path.sep)) {
          throw new Error('Path traversal attempt detected in cleanup');
        }
        fs.unlinkSync(normalizedSafePath);
      } catch (cleanupError) {
        SecurityUtils.safeLog('error', 'File cleanup error', {
          filePath: path.basename(req.file.filename),
          error: cleanupError.message
        });
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message 
    });
  }
});// Upload thumbnail for existing quiz
router.post('/:id/upload-thumbnail', RateLimitMiddleware.createUploadLimit(), AuthMiddleware.authenticateToken, upload.single('thumbnail'), async (req, res) => {
  try {
    const quizId = req.params.id;
    
    logger.info('🖼️ Thumbnail upload started for quiz:', quizId);
    logger.debug('📊 Upload details:', {
      hasFile: !!req.file,
      fileName: req.file?.filename,
      fileSize: req.file?.size,
      mimeType: req.file?.mimetype,
      userId: req.user?.id
    });
    
    if (!req.file) {
      logger.warn('❌ No file uploaded for quiz:', quizId);
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    // Create user-scoped Supabase client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);

    // First, verify the quiz exists and belongs to this user
    const { data: existingQuiz, error: verifyError } = await userSupabase
      .from('question_sets')
      .select('id, user_id, title')
      .eq('id', quizId)
      .single();

    if (verifyError) {
      logger.error('❌ Quiz verification error for quiz', quizId, ':', verifyError.message);
      return res.status(404).json({
        success: false,
        message: 'Quiz not found or access denied',
        error: verifyError.message
      });
    }

    if (!existingQuiz) {
      logger.warn('❌ Quiz not found:', quizId);
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    logger.debug('✅ Quiz verification successful:', existingQuiz.title);

    // Read the uploaded file with secure path construction and validation
    const uploadsDir = path.join(__dirname, '../uploads/thumbnails');
    // Use the secure filename that multer generated
    const secureFileName = req.file.filename;
    const safePath = path.join(uploadsDir, secureFileName);
    
    // Additional security validation - ensure path is within allowed directory
    const normalizedSafePath = path.resolve(safePath);
    const normalizedUploadsDir = path.resolve(uploadsDir);
    if (!normalizedSafePath.startsWith(normalizedUploadsDir + path.sep)) {
      throw new Error('Path traversal attempt detected');
    }normalizedSafePath
    
    const fileBuffer = fs.readFileSync(normalizedSafePath);

    logger.debug('📤 Uploading to Supabase storage:', secureFileName);

    // Upload to Supabase Storage using user-scoped client
    const { data: uploadData, error: uploadError } = await userSupabase.storage
      .from('quiz-thumbnails')
      .upload(`${req.user.id}/${secureFileName}`, fileBuffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      logger.error('❌ Supabase upload error:', uploadError);
      // Clean up local file
      try {
        fs.unlinkSync(normalizedSafePath); // normalizedSafePath is already secure
      } catch (cleanupError) {
        SecurityUtils.safeLog('error', 'Failed to cleanup local file', {
          filePath: path.basename(secureFileName),
          error: cleanupError.message
        });
      }
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to upload to storage',
        error: uploadError.message
      });
    }    logger.debug('✅ File uploaded to storage successfully');

    // Get public URL using user-scoped client
    const { data: urlData } = userSupabase.storage
      .from('quiz-thumbnails')
      .getPublicUrl(`${req.user.id}/${secureFileName}`);

    const thumbnailUrl = urlData.publicUrl;
    logger.debug('🔗 Generated thumbnail URL:', thumbnailUrl);

    // Update quiz thumbnail_url in database using user-scoped client
    logger.debug('💾 Updating database with thumbnail URL for quiz:', quizId);
    const { data: updateData, error: updateError } = await userSupabase
      .from('question_sets')
      .update({ 
        thumbnail_url: thumbnailUrl
      })
      .eq('id', quizId)
      .select()
      .single();

    if (updateError) {
      logger.error('❌ Database update error for quiz', quizId, ':', updateError.message);
      logger.debug('❌ Update error details:', updateError);
      
      // Clean up uploaded file from storage
      try {
        await userSupabase.storage
          .from('quiz-thumbnails')
          .remove([`${req.user.id}/${secureFileName}`]);
        logger.debug('🧹 Cleaned up storage file after DB error');
      } catch (cleanupError) {
        logger.warn('⚠️ Storage cleanup warning:', cleanupError);
      }

      // Clean up local file
      try {
        fs.unlinkSync(normalizedSafePath); // normalizedSafePath is already secure
      } catch (cleanupError) {
        SecurityUtils.safeLog('error', 'Failed to cleanup local file', {
          filePath: path.basename(secureFileName),
          error: cleanupError.message
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'データベースの更新に失敗しました。',
        error: updateError.message
      });
    }

    logger.info('✅ Database updated successfully');
    logger.debug('📋 Updated quiz data:', updateData);

    // Double-check that the update actually persisted by reading it back
    logger.debug('🔍 Verifying database update persistence...');
    const { data: verifyData, error: readVerifyError } = await userSupabase
      .from('question_sets')
      .select('id, title, thumbnail_url')
      .eq('id', quizId)
      .single();

    if (readVerifyError) {
      logger.error('❌ Verification read failed:', readVerifyError);
    } else {
      logger.debug('🔍 Verification result:', {
        id: verifyData.id,
        title: verifyData.title,
        thumbnail_url: verifyData.thumbnail_url,
        urlMatch: verifyData.thumbnail_url === thumbnailUrl
      });
      
      if (verifyData.thumbnail_url !== thumbnailUrl) {
        logger.error('❌ CRITICAL: Database update did not persist! Expected:', thumbnailUrl, 'Got:', verifyData.thumbnail_url);
        
        // Try to update again with explicit transaction
        logger.debug('🔄 Attempting database update retry...');
        const { data: retryData, error: retryError } = await userSupabase
          .from('question_sets')
          .update({ thumbnail_url: thumbnailUrl })
          .eq('id', quizId)
          .select()
          .single();
          
        if (retryError) {
          logger.error('❌ Retry failed:', retryError);
        } else {
          logger.debug('✅ Retry successful:', retryData);
        }
      }
    }

    // Clean up local file
    try {
      fs.unlinkSync(normalizedSafePath); // normalizedSafePath is already secure
    } catch (cleanupError) {
      SecurityUtils.safeLog('error', 'Failed to cleanup local file', {
        filePath: path.basename(secureFileName),
        error: cleanupError.message
      });
    }

    SecurityUtils.safeLog('info', 'Thumbnail upload completed for quiz', {
      quizId: quizId,
      thumbnailUrl: thumbnailUrl
    });

    res.json({
      success: true,
      message: 'サムネイル画像がアップロードされました。',
      thumbnail_url: thumbnailUrl,
      quiz: updateData
    });

  } catch (error) {
    logger.error('❌ Thumbnail upload error:', error);
    
    // Clean up local file if it exists
    if (req.file && req.file.filename) {
      try {
        // Reconstruct safe path from known directory and secure filename with validation
        const uploadsDir = path.join(__dirname, '../uploads/thumbnails');
        const safePath = path.join(uploadsDir, req.file.filename);
        const normalizedSafePath = path.resolve(safePath);
        const normalizedUploadsDir = path.resolve(uploadsDir);
        if (!normalizedSafePath.startsWith(normalizedUploadsDir + path.sep)) {
          throw new Error('Path traversal attempt detected in cleanup');
        }
        fs.unlinkSync(normalizedSafePath);
        logger.debug('🧹 Cleaned up local file after error');
      } catch (cleanupError) {
        SecurityUtils.safeLog('error', 'File cleanup error', {
          filePath: path.basename(req.file.filename),
          error: cleanupError.message
        });
      }
    }

    res.status(500).json({
      success: false,
      message: '画像のアップロードに失敗しました',
      error: error.message
    });
  }
});

// Delete thumbnail for existing quiz
router.delete('/:id/thumbnail', RateLimitMiddleware.createModerateLimit(), AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const quizId = req.params.id;

    // Create user-scoped Supabase client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);

    // Get quiz and verify ownership - RLS will handle this automatically
    const { data: quiz, error: verifyError } = await userSupabase
      .from('question_sets')
      .select('id, thumbnail_url')
      .eq('id', quizId)
      .single();

    if (verifyError || !quiz) {
      return res.status(403).json({ 
        success: false,
        error: 'クイズが見つからないか、アクセス権限がありません' 
      });
    }

    // Extract file path from thumbnail URL if it exists
    let filePath = null;
    if (quiz.thumbnail_url) {
      const urlParts = quiz.thumbnail_url.split('/');
      if (urlParts.length > 0) {
        const fileName = urlParts[urlParts.length - 1];
        filePath = `${req.user.id}/${fileName}`;
      }
    }

    // Update database to remove thumbnail URL
    const { data: updateData, error: updateError } = await userSupabase
      .from('question_sets')
      .update({ 
        thumbnail_url: null
      })
      .eq('id', quizId)
      .select()
      .single();

    if (updateError) {
      logger.error('Database update error:', updateError);
      return res.status(500).json({
        success: false,
        message: 'データベースの更新に失敗しました。'
      });
    }

    // Remove file from storage if it exists
    if (filePath) {
      try {
        await userSupabase.storage
          .from('quiz-thumbnails')
          .remove([filePath]);
      } catch (storageError) {
        logger.warn('Storage deletion warning:', storageError);
        // Don't fail the request if storage deletion fails
      }
    }

    SecurityUtils.safeLog('info', 'Thumbnail deleted for quiz by user', {
      quizId: quizId,
      userName: req.user.name
    });

    res.json({
      success: true,
      message: 'サムネイル画像が削除されました。',
      quiz: updateData
    });

  } catch (error) {
    logger.error('Thumbnail deletion error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'サムネイル画像の削除中にエラーが発生しました。'
    });
  }
});

// Create quiz with metadata
router.post('/create', RateLimitMiddleware.createQuizLimit(), AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      difficulty_level,
      thumbnail_url,
      tags,
      is_public,
      status
    } = req.body;

    // Validate required fields
    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    // Validate title length (max 255 characters as per schema)
    if (title.trim().length > 255) {
      return res.status(400).json({
        success: false,
        message: 'Title must be 255 characters or less'
      });
    }

    // Validate category length (max 100 characters as per schema)
    if (category && category.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Category must be 100 characters or less'
      });
    }

    // Validate difficulty_level (max 20 characters and valid values)
    const validDifficulties = ['easy', 'medium', 'hard', 'expert'];
    if (difficulty_level && (!validDifficulties.includes(difficulty_level) || difficulty_level.length > 20)) {
      return res.status(400).json({
        success: false,
        message: 'Difficulty level must be one of: easy, medium, hard, expert'
      });
    }

    // Create user-scoped Supabase client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);

    // Prepare quiz data according to schema constraints
    const quizData = {
      user_id: req.user.id, // CRITICAL: Set user_id for RLS policy compliance
      title: title.trim(), // Required, max 255 chars
      description: description?.trim() || null, // Optional text
      category: category || null, // Optional, max 100 chars
      difficulty_level: difficulty_level || 'medium', // Default 'medium', max 20 chars
      thumbnail_url: thumbnail_url || null, // Optional text
      tags: Array.isArray(tags) ? tags : [], // Default empty array
      is_public: Boolean(is_public), // Default false
      status: status || 'draft', // Default 'draft'
      total_questions: 0, // Default 0, will be updated as questions are added
      times_played: 0, // Default 0
      completion_rate: 0.0, // Default 0.0
      play_settings: {}, // Default empty object
      last_played_at: null // Default null
      // Note: id, created_at, updated_at are handled by database defaults
    };

    // Insert quiz set into database using user-scoped client
    const { data: insertedQuiz, error: quizError } = await userSupabase
      .from('question_sets')
      .insert([quizData])
      .select()
      .single();

    if (quizError) {
      logger.error('Quiz creation error:', quizError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create quiz',
        error: quizError.message
      });
    }

    res.json({
      success: true,
      message: 'Quiz created successfully',
      quiz: insertedQuiz
    });

  } catch (error) {
    logger.error('Quiz creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get user's quizzes
router.get('/my-quizzes', RateLimitMiddleware.createReadLimit(), AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    // Get user ID from authenticated request
    const userId = req.user.id;
    
    // Create user-scoped Supabase client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);
    
    const { data: quizzes, error } = await userSupabase
      .from('question_sets')
      .select(`
        id,
        title,
        description,
        category,
        difficulty_level,
        thumbnail_url,
        tags,
        is_public,
        status,
        total_questions,
        times_played,
        completion_rate,
        last_played_at,
        play_settings,
        created_at,
        updated_at
      `)
      .eq('user_id', userId) // Explicitly filter by user ID
      .order('updated_at', { ascending: false });

    if (error) {
      logger.error('Error fetching quizzes:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch quizzes',
        error: error.message
      });
    }

    res.json({
      success: true,
      quizzes: quizzes || []
    });

  } catch (error) {
    logger.error('Error fetching quizzes:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get public quizzes (no authentication required for browsing public content)
router.get('/public/browse', RateLimitMiddleware.createReadLimit(), async (req, res) => {
  try {
    const { 
      category = '', 
      difficulty = '', 
      search = '', 
      sort = 'updated_desc',
      limit = 20,
      offset = 0 
    } = req.query;

    // Use admin Supabase client for public data access (bypasses RLS)
    const DatabaseManager = require('../../config/database');
    const db = new DatabaseManager();
    const supabase = db.supabaseAdmin || db.supabase; // Use admin client if available

    let query = supabase
      .from('question_sets')
      .select(`
        id,
        title,
        description,
        category,
        difficulty_level,
        thumbnail_url,
        total_questions,
        times_played,
        created_at,
        updated_at,
        is_public,
        user_id,
        users!inner(id, name)
      `)
      .eq('status', 'published')
      .eq('is_public', true);

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }

    if (difficulty) {
      query = query.eq('difficulty_level', difficulty);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%, description.ilike.%${search}%, category.ilike.%${search}%`);
    }

    // Apply sorting
    switch (sort) {
      case 'created_desc':
        query = query.order('created_at', { ascending: false });
        break;
      case 'plays_desc':
        query = query.order('times_played', { ascending: false });
        break;
      case 'questions_desc':
        query = query.order('total_questions', { ascending: false });
        break;
      case 'title_asc':
        query = query.order('title', { ascending: true });
        break;
      case 'updated_desc':
      default:
        query = query.order('updated_at', { ascending: false });
        break;
    }

    // Apply pagination
    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data: quizzes, error } = await query;

    if (error) {
      logger.error('Error fetching public quizzes:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching public quizzes',
        error: error.message
      });
    }

    res.json({
      success: true,
      quizzes: quizzes || [],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: quizzes && quizzes.length === parseInt(limit)
      }
    });

  } catch (error) {
    logger.error('Error fetching public quizzes:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Clone public quiz to user's library
router.post('/public/clone/:id', RateLimitMiddleware.createModerateLimit(), AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const publicQuizId = req.params.id;
    const userId = req.user.id; // Use req.user.id instead of req.userId

    logger.info('🔄 Clone request started for quiz:', publicQuizId);
    logger.debug('👤 User ID:', userId);
    logger.debug('🔐 User token present:', !!req.userToken);

    // Create user-scoped Supabase client for reading public data
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);
    
    // Get admin client for write operations to bypass RLS
    const DatabaseManager = require('../../config/database');
const logger = require('../../utils/logger');
    const db = new DatabaseManager();
    const adminSupabase = db.supabaseAdmin || db.supabase;

    logger.debug('📖 Fetching public quiz...');
    // First, get the public quiz using user-scoped client for RLS compliance
    const { data: publicQuiz, error: fetchError } = await userSupabase
      .from('question_sets')
      .select(`
        *,
        questions (
          *,
          answers (*)
        )
      `)
      .eq('id', publicQuizId)
      .eq('is_public', true)
      .eq('status', 'published')
      .single();

    logger.debug('📊 Fetch result:', { found: !!publicQuiz, error: fetchError });

    if (fetchError || !publicQuiz) {
      logger.warn('❌ Public quiz not found:', publicQuizId);
      return res.status(404).json({
        success: false,
        message: 'Public quiz not found'
      });
    }

    logger.info('✅ Quiz clone initiated:', publicQuiz.title);
    logger.debug('📊 Questions count:', publicQuiz.questions?.length || 0);

    // Check if user already has this quiz cloned (skip if cloned_from field doesn't exist yet)
    try {
      const { data: existingClone } = await userSupabase
        .from('question_sets')
        .select('id')
        .eq('cloned_from', publicQuizId)
        .single();

      if (existingClone) {
        return res.status(400).json({
          success: false,
          message: 'You have already cloned this quiz'
        });
      }
    } catch (cloneCheckError) {
      // If cloned_from field doesn't exist, continue with cloning
      logger.debug('Clone check skipped (cloned_from field may not exist):', cloneCheckError.message);
    }

    logger.info('✅ Public quiz found:', publicQuiz.title);
    logger.debug('📝 Creating clone...');

    // Function to copy image to new location for the cloned quiz
    const copyImageToNewLocation = async (originalImageUrl, imageType = 'thumbnail') => {
      if (!originalImageUrl) return null;
      
      try {
        // Extract the original file info
        const urlParts = originalImageUrl.split('/');
        const bucketIndex = urlParts.findIndex(part => part === 'public');
        if (bucketIndex === -1) return originalImageUrl; // Not a storage URL
        
        const bucketName = urlParts[bucketIndex + 1];
        const originalFilePath = urlParts.slice(bucketIndex + 2).join('/');
        
        // Generate new file path for the clone
        const fileExtension = originalFilePath.split('.').pop();
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 15);
        const newFileName = `${imageType}_${timestamp}_${randomId}.${fileExtension}`;
        const newFilePath = `${userId}/${newFileName}`;
        
        // Download the original image
        const { data: originalImageData, error: downloadError } = await adminSupabase.storage
          .from(bucketName)
          .download(originalFilePath);
          
        if (downloadError) {
          logger.warn('⚠️ Failed to download original image for cloning:', downloadError.message);
          return null; // Return null to indicate failure to clone image
        }
        
        // Upload to new location
        const { data: uploadData, error: uploadError } = await adminSupabase.storage
          .from(bucketName)
          .upload(newFilePath, originalImageData, {
            contentType: originalImageData.type,
            upsert: true
          });
          
        if (uploadError) {
          logger.warn('⚠️ Failed to upload cloned image:', uploadError.message);
          return originalImageUrl; // Return original URL as fallback
        }
        
        // Get the public URL for the new image
        const { data: { publicUrl } } = adminSupabase.storage
          .from(bucketName)
          .getPublicUrl(newFilePath);
          
        logger.debug('✅ Image cloned successfully:', newFilePath);
        return publicUrl;
        
      } catch (error) {
        logger.warn('⚠️ Error cloning image:', error.message);
        return originalImageUrl; // Return original URL as fallback
      }
    };

    // Clone the thumbnail if it exists
    const clonedThumbnailUrl = await copyImageToNewLocation(publicQuiz.thumbnail_url, 'thumbnail');

    // Create the cloned quiz using admin client to bypass RLS
    let insertData = {
      title: `${publicQuiz.title} (クローン)`,
      description: publicQuiz.description,
      category: publicQuiz.category,
      difficulty_level: publicQuiz.difficulty_level,
      total_questions: publicQuiz.total_questions || 0,
      thumbnail_url: clonedThumbnailUrl,
      is_public: false,
      status: 'draft',
      user_id: userId, // Explicitly set the user_id
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Add cloned_from field if it exists in the schema
    try {
      insertData.cloned_from = publicQuizId;
    } catch (error) {
      logger.debug('⚠️ cloned_from field may not exist yet');
    }

    logger.debug('📋 Insert data prepared:', { title: insertData.title, userId: insertData.user_id });

    const { data: clonedQuiz, error: cloneError } = await adminSupabase
      .from('question_sets')
      .insert(insertData)
      .select()
      .single();

    logger.debug('📊 Clone result:', { success: !!clonedQuiz, error: cloneError });

    if (cloneError) {
      logger.error('❌ Error cloning quiz:', cloneError);
      logger.debug('📋 Insert data:', insertData);
      return res.status(500).json({
        success: false,
        message: 'Error cloning quiz',
        error: cloneError.message
      });
    }

    // Clone questions and their answers
    if (publicQuiz.questions && publicQuiz.questions.length > 0) {
      logger.info('🔄 Cloning questions:', publicQuiz.questions.length);
      
      for (let i = 0; i < publicQuiz.questions.length; i++) {
        const originalQuestion = publicQuiz.questions[i];
        
        // Clone question image and explanation image
        const clonedQuestionImageUrl = await copyImageToNewLocation(originalQuestion.image_url, 'question');
        const clonedExplanationImageUrl = await copyImageToNewLocation(originalQuestion.explanation_image_url, 'explanation');
        
        // Create question with correct schema
        const questionData = {
          question_set_id: clonedQuiz.id,
          question_text: originalQuestion.question_text,
          question_type: originalQuestion.question_type,
          image_url: clonedQuestionImageUrl,
          time_limit: originalQuestion.time_limit || 30,
          points: originalQuestion.points || 100,
          difficulty: originalQuestion.difficulty || 'medium',
          order_index: i,
          explanation_title: originalQuestion.explanation_title,
          explanation_text: originalQuestion.explanation_text,
          explanation_image_url: clonedExplanationImageUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: clonedQuestion, error: questionError } = await adminSupabase
          .from('questions')
          .insert(questionData)
          .select()
          .single();

        if (questionError) {
          logger.error('❌ Error cloning question:', questionError);
          continue; // Skip this question but continue with others
        }

        logger.debug('✅ Question cloned:', clonedQuestion.id);

        // Clone answers for this question (if they exist in the original)
        if (originalQuestion.answers && originalQuestion.answers.length > 0) {
          const answersData = [];
          
          for (let answerIndex = 0; answerIndex < originalQuestion.answers.length; answerIndex++) {
            const answer = originalQuestion.answers[answerIndex];
            
            // Clone answer image if it exists
            const clonedAnswerImageUrl = await copyImageToNewLocation(answer.image_url, 'answer');
            
            answersData.push({
              question_id: clonedQuestion.id,
              answer_text: answer.answer_text,
              is_correct: answer.is_correct,
              order_index: answerIndex,
              image_url: clonedAnswerImageUrl,
              answer_explanation: answer.answer_explanation,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }

          const { error: answersError } = await adminSupabase
            .from('answers')
            .insert(answersData);

          if (answersError) {
            logger.error('❌ Error cloning answers for question:', answersError);
          } else {
            logger.debug('✅ Answers cloned for question:', clonedQuestion.id);
          }
        } else {
          // Handle old-style questions with correct_answers/incorrect_answers arrays
          const answers = [];
          
          if (originalQuestion.correct_answers) {
            originalQuestion.correct_answers.forEach((answer, idx) => {
              answers.push({
                question_id: clonedQuestion.id,
                answer_text: answer,
                is_correct: true,
                order_index: answers.length,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            });
          }
          
          if (originalQuestion.incorrect_answers) {
            originalQuestion.incorrect_answers.forEach((answer, idx) => {
              answers.push({
                question_id: clonedQuestion.id,
                answer_text: answer,
                is_correct: false,
                order_index: answers.length,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            });
          }

          if (answers.length > 0) {
            const { error: answersError } = await adminSupabase
              .from('answers')
              .insert(answers);

            if (answersError) {
              logger.error('❌ Error cloning legacy answers:', answersError);
            } else {
              logger.debug('✅ Legacy answers cloned for question:', clonedQuestion.id);
            }
          }
        }
      }
      
      logger.info('✅ All questions cloned successfully');
    }

    res.json({
      success: true,
      message: 'Quiz successfully cloned to your library',
      clonedQuiz: {
        id: clonedQuiz.id,
        title: clonedQuiz.title
      }
    });

  } catch (error) {
    logger.error('Error cloning public quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get quiz by ID
router.get('/:id', RateLimitMiddleware.createReadLimit(), AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const quizId = req.params.id;

    // Create user-scoped Supabase client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);

    const { data: quiz, error } = await userSupabase
      .from('question_sets')
      .select(`
        *,
        questions (
          id,
          question_text,
          question_type,
          image_url,
          time_limit,
          points,
          difficulty,
          order_index,
          answers (
            id,
            answer_text,
            is_correct,
            order_index
          )
        )
      `)
      .eq('id', quizId)
      .single();

    if (error) {
      logger.error('Error fetching quiz:', error);
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    res.json({
      success: true,
      quiz: quiz
    });

  } catch (error) {
    logger.error('Error fetching quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update quiz metadata
router.put('/:id', RateLimitMiddleware.createQuizLimit(), AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const quizId = req.params.id;
    const updateData = { ...req.body };
    
    // Remove fields that shouldn't be updated via this endpoint
    delete updateData.id;
    delete updateData.user_id;
    delete updateData.created_at;
    delete updateData.updated_at; // Let database handle timestamps

    // Validate title if provided
    if (updateData.title !== undefined) {
      if (!updateData.title || updateData.title.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Title cannot be empty'
        });
      }
      if (updateData.title.trim().length > 255) {
        return res.status(400).json({
          success: false,
          message: 'Title must be 255 characters or less'
        });
      }
      updateData.title = updateData.title.trim();
    }

    // Validate category if provided
    if (updateData.category !== undefined && updateData.category !== null && updateData.category.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Category must be 100 characters or less'
      });
    }

    // Validate difficulty_level if provided
    if (updateData.difficulty_level !== undefined) {
      const validDifficulties = ['easy', 'medium', 'hard', 'expert'];
      if (!validDifficulties.includes(updateData.difficulty_level) || updateData.difficulty_level.length > 20) {
        return res.status(400).json({
          success: false,
          message: 'Difficulty level must be one of: easy, medium, hard, expert'
        });
      }
    }

    // Validate status if provided
    if (updateData.status !== undefined) {
      const validStatuses = ['draft', 'published', 'archived'];
      if (!validStatuses.includes(updateData.status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be: draft, published, or archived'
        });
      }
    }



    // Validate total_questions if provided
    if (updateData.total_questions !== undefined && updateData.total_questions !== null) {
      if (typeof updateData.total_questions !== 'number' || updateData.total_questions < 0) {
        return res.status(400).json({
          success: false,
          message: 'Total questions must be a non-negative number'
        });
      }
    }

    // Validate times_played if provided
    if (updateData.times_played !== undefined && updateData.times_played !== null) {
      if (typeof updateData.times_played !== 'number' || updateData.times_played < 0) {
        return res.status(400).json({
          success: false,
          message: 'Times played must be a non-negative number'
        });
      }
    }

    // Remove deprecated fields if present in payload
    if (Object.prototype.hasOwnProperty.call(updateData, 'average_score')) {
      delete updateData.average_score;
    }

    // Validate completion_rate if provided
    if (updateData.completion_rate !== undefined && updateData.completion_rate !== null) {
      if (typeof updateData.completion_rate !== 'number' || updateData.completion_rate < 0 || updateData.completion_rate > 1) {
        return res.status(400).json({
          success: false,
          message: 'Completion rate must be a number between 0 and 1'
        });
      }
    }

    // Validate tags if provided
    if (updateData.tags !== undefined && !Array.isArray(updateData.tags)) {
      return res.status(400).json({
        success: false,
        message: 'Tags must be an array'
      });
    }

    // Create user-scoped client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);

    // First verify the quiz exists and belongs to this user
    const { data: existingQuiz, error: verifyError } = await userSupabase
      .from('question_sets')
      .select('id, user_id, title')
      .eq('id', quizId)
      .single();

    if (verifyError) {
      logger.error('Quiz verification error for quiz', quizId, ':', verifyError.message);
      return res.status(404).json({
        success: false,
        message: 'Quiz not found or access denied',
        error: verifyError.message
      });
    }

    if (!existingQuiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    SecurityUtils.safeLog('info', 'Quiz updated', {
      quizId: quizId,
      title: updateData.title || existingQuiz.title
    });
    
    // Remove the old validation code that was duplicated above
    const { data: quiz, error } = await userSupabase
      .from('question_sets')
      .update(updateData)
      .eq('id', quizId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating quiz', quizId, ':', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to update quiz',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Quiz updated successfully',
      quiz: quiz
    });

  } catch (error) {
    logger.error('Error updating quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Delete quiz
router.delete('/:id', RateLimitMiddleware.createStrictLimit(), AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const quizId = req.params.id;
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);

    logger.info('🗑️ Starting quiz deletion for:', quizId);

    // First, get the quiz data to check for thumbnail
    const { data: quizData, error: fetchError } = await userSupabase
      .from('question_sets')
      .select('id, title, thumbnail_url, user_id')
      .eq('id', quizId)
      .single();

    if (fetchError) {
      logger.error('❌ Error fetching quiz for deletion:', fetchError);
      return res.status(404).json({
        success: false,
        message: 'Quiz not found or access denied',
        error: fetchError.message
      });
    }

    if (!quizData) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    logger.debug('✅ Quiz found for deletion:', quizData.title);

    // Delete thumbnail from storage if it exists
    if (quizData.thumbnail_url) {
      try {
        logger.debug('🖼️ Deleting thumbnail from storage:', quizData.thumbnail_url);
        
        // Extract filename from URL
        const urlParts = quizData.thumbnail_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `${req.user.id}/${fileName}`;

        const { error: storageError } = await userSupabase.storage
          .from('quiz-thumbnails')
          .remove([filePath]);

        if (storageError) {
          logger.warn('⚠️ Thumbnail deletion warning:', storageError);
          // Don't fail the entire deletion if thumbnail cleanup fails
        } else {
          logger.debug('✅ Thumbnail deleted from storage successfully');
        }
      } catch (thumbnailError) {
        logger.warn('⚠️ Thumbnail cleanup error:', thumbnailError);
        // Continue with quiz deletion even if thumbnail cleanup fails
      }
    } else {
      logger.debug('📝 No thumbnail to delete');
    }

    // First, get all question data with image URLs for cleanup
    const { data: questionsWithImages, error: questionIdsError } = await userSupabase
      .from('questions')
      .select('id, image_url, explanation_image_url')
      .eq('question_set_id', quizId);

    if (questionIdsError) {
      logger.warn('⚠️ Error fetching question data:', questionIdsError);
    }

    // Get all answer data with image URLs for cleanup
    let answersWithImages = [];
    if (questionsWithImages && questionsWithImages.length > 0) {
      const questionIdArray = questionsWithImages.map(q => q.id);
      const { data: answerData, error: answerError } = await userSupabase
        .from('answers')
        .select('id, image_url')
        .in('question_id', questionIdArray);
      
      if (answerError) {
        logger.warn('⚠️ Error fetching answer data:', answerError);
      } else {
        answersWithImages = answerData || [];
      }
    }

    // Clean up all images from storage
    const imagesToDelete = [];
    
    // Collect question images and explanation images
    if (questionsWithImages) {
      questionsWithImages.forEach(question => {
        if (question.image_url) imagesToDelete.push(question.image_url);
        if (question.explanation_image_url) imagesToDelete.push(question.explanation_image_url);
      });
    }
    
    // Collect answer images
    answersWithImages.forEach(answer => {
      if (answer.image_url) imagesToDelete.push(answer.image_url);
    });

    // Delete images from storage
    if (imagesToDelete.length > 0) {
      SecurityUtils.safeLog('info', 'Deleting images from storage', {
        imageCount: imagesToDelete.length
      });
      
      for (const imageUrl of imagesToDelete) {
        try {
          // Extract file path from URL
          const urlParts = imageUrl.split('/');
          const bucketIndex = urlParts.findIndex(part => part === 'public');
          if (bucketIndex !== -1 && bucketIndex + 2 < urlParts.length) {
            const bucketName = urlParts[bucketIndex + 1];
            const filePath = urlParts.slice(bucketIndex + 2).join('/');
            
            const { error: deleteError } = await userSupabase.storage
              .from(bucketName)
              .remove([filePath]);
            
            if (deleteError) {
              SecurityUtils.safeLog('warn', 'Failed to delete image', {
                filePath: path.basename(filePath),
                error: deleteError
              });
            } else {
              SecurityUtils.safeLog('info', 'Deleted image', {
                filePath: path.basename(filePath)
              });
            }
          }
        } catch (imageError) {
          SecurityUtils.safeLog('warn', 'Error deleting image', {
            imageUrl: imageUrl,
            error: imageError
          });
        }
      }
    }

    // Delete all answers for questions in this quiz
    if (questionsWithImages && questionsWithImages.length > 0) {
      const questionIdArray = questionsWithImages.map(q => q.id);
      const { error: answersError } = await userSupabase
        .from('answers')
        .delete()
        .in('question_id', questionIdArray);

      if (answersError) {
        logger.warn('⚠️ Error deleting answers:', answersError);
        // Continue anyway - the questions deletion might cascade
      } else {
        logger.debug('✅ Answers deleted successfully');
      }
    } else {
      logger.debug('📝 No questions found, skipping answer deletion');
    }

    // Delete all questions associated with this quiz
    const { error: questionsError } = await userSupabase
      .from('questions')
      .delete()
      .eq('question_set_id', quizId);

    if (questionsError) {
      logger.error('❌ Error deleting questions:', questionsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete quiz questions',
        error: questionsError.message
      });
    }

    logger.debug('✅ Questions deleted successfully');

    // Finally, delete the quiz itself
    const { error: quizError } = await userSupabase
      .from('question_sets')
      .delete()
      .eq('id', quizId);

    if (quizError) {
      logger.error('❌ Error deleting quiz:', quizError);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete quiz',
        error: quizError.message
      });
    }

    SecurityUtils.safeLog('info', 'Quiz deleted completely including thumbnail', {
      quizTitle: quizData.title
    });

    res.json({
      success: true,
      message: 'Quiz deleted successfully'
    });

  } catch (error) {
    logger.error('❌ Error deleting quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update quiz status (for progressive saving)
router.patch('/:id/status', AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const quizId = req.params.id;
    const { status, was_published } = req.body;

    // Validate status - use actual database enum values
    const validStatuses = ['draft', 'published', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: draft, published, or archived'
      });
    }

    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);

    // First get the current quiz to preserve existing play_settings
    const { data: currentQuiz, error: fetchError } = await userSupabase
      .from('question_sets')
      .select('play_settings')
      .eq('id', quizId)
      .single();

    if (fetchError) {
      logger.error('Error fetching current quiz:', fetchError);
      return res.status(404).json({
        success: false,
        message: 'Quiz not found or access denied'
      });
    }

    // Prepare update data
    const updateData = { status: status };
    
    // If marking as draft and was_published is true, merge this info with existing play_settings
    if (status === 'draft' && was_published) {
      updateData.play_settings = {
        ...(currentQuiz.play_settings || {}),
        was_published: true
      };
    } else if (status === 'published') {
      // When republishing, remove the was_published flag but keep other settings
      const { was_published: _, ...otherSettings } = currentQuiz.play_settings || {};
      updateData.play_settings = otherSettings;
    }

    const { data: updatedQuiz, error } = await userSupabase
      .from('question_sets')
      .update(updateData)
      .eq('id', quizId)
      .select()
      .single();

    if (error) {
      logger.error('Status update error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update quiz status',
        error: error.message
      });
    }

    if (!updatedQuiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Quiz status updated successfully',
      quiz: updatedQuiz
    });

  } catch (error) {
    logger.error('Error updating quiz status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Comprehensive publish endpoint
router.patch('/:id/publish', AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const quizId = req.params.id;
    const { play_settings } = req.body;

    SecurityUtils.safeLog('info', 'Publishing quiz for user', {
      quizId: quizId,
      userId: req.user.id,
      userName: req.user.name
    });
    SecurityUtils.safeLog('info', 'Play settings', play_settings);

    // Create user-scoped Supabase client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);

    // First, get the current quiz to validate it can be published
    const { data: currentQuiz, error: fetchError } = await userSupabase
      .from('question_sets')
      .select(`
        *,
        questions (
          id,
          question_text,
          question_type,
          answers (
            id,
            answer_text,
            is_correct
          )
        )
      `)
      .eq('id', quizId)
      .single();

    if (fetchError || !currentQuiz) {
      SecurityUtils.safeLog('error', 'Quiz not found or access denied', {
        quizId: quizId,
        error: fetchError?.message
      });
      return res.status(404).json({
        success: false,
        message: 'Quiz not found or access denied',
        error: fetchError?.message
      });
    }

    SecurityUtils.safeLog('info', 'Found quiz with questions', {
      quizTitle: currentQuiz.title,
      questionCount: currentQuiz.questions?.length || 0
    });
    logger.debug(`🔍 Quiz data structure:`, {
      id: currentQuiz.id,
      title: currentQuiz.title,
      questionsArray: currentQuiz.questions,
      questionsLength: currentQuiz.questions?.length,
      hasQuestions: !!currentQuiz.questions
    });

    // Let's also check if questions exist directly in the database
    const { data: directQuestionsCheck, error: directQuestionsError } = await userSupabase
      .from('questions')
      .select('id, question_text, question_set_id')
      .eq('question_set_id', quizId);
    
    SecurityUtils.safeLog('info', 'Direct questions check for quiz', {
      quizId: quizId,
      count: directQuestionsCheck?.length || 0,
      questions: directQuestionsCheck,
      error: directQuestionsError?.message
    });

    // Let's also try with admin client to see if it's an RLS issue
    const { data: adminQuestionsCheck, error: adminQuestionsError } = await dbManager.supabaseAdmin
      .from('questions')
      .select('id, question_text, question_set_id')
      .eq('question_set_id', quizId);
    
    SecurityUtils.safeLog('info', 'Admin questions check for quiz', {
      quizId: quizId,
      count: adminQuestionsCheck?.length || 0,
      questions: adminQuestionsCheck,
      error: adminQuestionsError?.message
    });

    // Validate quiz can be published
    const validationErrors = [];

    // Check basic metadata
    if (!currentQuiz.title?.trim()) {
      validationErrors.push('Quiz title is required');
    }
    if (!currentQuiz.category) {
      validationErrors.push('Quiz category is required');
    }
    if (!currentQuiz.difficulty_level) {
      validationErrors.push('Quiz difficulty level is required');
    }

    // Check questions
    if (!currentQuiz.questions || currentQuiz.questions.length === 0) {
      validationErrors.push('At least one question is required');
    }

    // Validate each question
    currentQuiz.questions?.forEach((question, index) => {
      if (!question.question_text?.trim()) {
        validationErrors.push(`Question ${index + 1}: Question text is required`);
      }

      const hasValidAnswers = question.answers?.length >= 2;
      const hasCorrectAnswer = question.answers?.some(a => a.is_correct);

      if (!hasValidAnswers) {
        validationErrors.push(`Question ${index + 1}: At least 2 answers are required`);
      }
      if (!hasCorrectAnswer) {
        validationErrors.push(`Question ${index + 1}: At least one correct answer is required`);
      }
    });

    if (validationErrors.length > 0) {
      SecurityUtils.safeLog('warn', 'Validation failed for quiz', {
        quizId: quizId,
        errors: validationErrors
      });
      return res.status(400).json({
        success: false,
        message: 'Quiz validation failed',
        validationErrors
      });
    }

    SecurityUtils.safeLog('info', 'Quiz passed validation checks', {
      quizId: quizId
    });

    // Update quiz to published status with settings
    const updateData = {
      status: 'published',
      updated_at: new Date().toISOString()
    };

    // Merge new play_settings with existing ones, removing was_published flag
    if (play_settings || currentQuiz.play_settings) {
      const newSettings = play_settings || {};
      
      // Use only the new clean settings (don't merge with old bloated settings)
      // Remove was_published flag if it exists
      const { was_published: _, ...cleanNewSettings } = newSettings;
      updateData.play_settings = cleanNewSettings;
    }

    // Update total_questions to match actual question count
    if (currentQuiz.questions) {
      updateData.total_questions = currentQuiz.questions.length;
    }

    SecurityUtils.safeLog('info', 'Updating quiz with data', {
      quizId: quizId,
      updateData: updateData
    });

    const { data: publishedQuiz, error: publishError } = await userSupabase
      .from('question_sets')
      .update(updateData)
      .eq('id', quizId)
      .select()
      .single();

    if (publishError) {
      SecurityUtils.safeLog('error', 'Publish error for quiz', {
        quizId: quizId,
        error: publishError
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to publish quiz',
        error: publishError.message
      });
    }

    SecurityUtils.safeLog('info', 'Quiz successfully published by user', {
      quizId: quizId,
      userId: req.user.id,
      userName: req.user.name
    });

    res.json({
      success: true,
      message: 'Quiz published successfully',
      quiz: publishedQuiz
    });

  } catch (error) {
    logger.error('💥 Error publishing quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update question count (for progressive saving)
router.patch('/:id/question-count', AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const quizId = req.params.id;
    const { total_questions } = req.body;

    if (typeof total_questions !== 'number' || total_questions < 0) {
      return res.status(400).json({
        success: false,
        message: 'total_questions must be a non-negative number'
      });
    }

    const { data: updatedQuiz, error } = await AuthMiddleware.createUserScopedClient(req.userToken)
      .from('question_sets')
      .update({
        total_questions: total_questions
      })
      .eq('id', quizId)
      .select()
      .single();

    if (error) {
      logger.error('Question count update error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update question count',
        error: error.message
      });
    }

    if (!updatedQuiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Question count updated successfully',
      quiz: updatedQuiz
    });

  } catch (error) {
    logger.error('Error updating question count:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Publish quiz (final step)
router.post('/:id/publish', RateLimitMiddleware.createQuizLimit(), AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const quizId = req.params.id;
    const { play_settings = {} } = req.body;

    // First, get the quiz to validate it exists and belongs to user
    const { data: quiz, error: fetchError } = await supabase
      .from('question_sets')
      .select(`
        *,
        questions (
          id,
          question_text,
          answers (id)
        )
      `)
      .eq('id', quizId)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found or access denied'
      });
    }

    // Validate quiz is ready for publishing
    if (!quiz.questions || quiz.questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish quiz without questions'
      });
    }

    // Check that all questions have answers
    const hasIncompleteQuestions = quiz.questions.some(q => !q.answers || q.answers.length < 2);
    if (hasIncompleteQuestions) {
      return res.status(400).json({
        success: false,
        message: 'All questions must have at least 2 answers'
      });
    }

    // Update quiz to published status
    const { data: publishedQuiz, error: publishError } = await AuthMiddleware.createUserScopedClient(req.userToken)
      .from('question_sets')
      .update({
        status: 'published',
        play_settings: play_settings,
        total_questions: quiz.questions.length
      })
      .eq('id', quizId)
      .select()
      .single();

    if (publishError) {
      logger.error('Publish error:', publishError);
      return res.status(500).json({
        success: false,
        message: 'Failed to publish quiz',
        error: publishError.message
      });
    }

    res.json({
      success: true,
      message: 'Quiz published successfully',
      quiz: publishedQuiz
    });

  } catch (error) {
    logger.error('Error publishing quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get quiz with questions (for loading drafts)
router.get('/:id/questions', RateLimitMiddleware.createReadLimit(), AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const quizId = req.params.id;

    // Create user-scoped Supabase client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);

    const { data: questions, error } = await userSupabase
      .from('questions')
      .select(`
        *,
        answers (*)
      `)
      .eq('question_set_id', quizId)
      .order('order_index', { ascending: true });

    if (error) {
      logger.error('Questions fetch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch questions',
        error: error.message
      });
    }

    res.json({
      success: true,
      questions: questions || []
    });

  } catch (error) {
    logger.error('Error fetching questions:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Check session status endpoint
router.post('/session/check', RateLimitMiddleware.createReadLimit(), AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const { gameId, room } = req.body;

    if (!gameId || !room) {
      return res.status(400).json({
        success: false,
        message: 'gameId and room are required'
      });
    }

    logger.debug('🔍 Checking session status:', { gameId, room, userId: req.user.id });

    // Get access to activeGames through ActiveGameUpdater
    const ActiveGameUpdater = require('../../utils/ActiveGameUpdater');
    
    if (!ActiveGameUpdater.activeGamesRef) {
      logger.error('❌ ActiveGameUpdater reference not set');
      return res.status(500).json({
        success: false,
        message: 'Game session service not available'
      });
    }
    
    // Debug: Log all active games for troubleshooting
    const allActiveGames = Array.from(ActiveGameUpdater.activeGamesRef.keys());
    logger.debug('🎮 All active games:', allActiveGames);
    logger.debug('🔍 Looking for room:', room);
    
    // Get game data from active games
    const gameData = ActiveGameUpdater.activeGamesRef.get(room);
    
    if (!gameData) {
      logger.debug('❌ Game not found in active games:', room);
      logger.debug('🔄 Available games:', allActiveGames.join(', '));
      return res.json({
        success: true,
        isActive: false,
        message: 'Game session not found'
      });
    }

    // Check if user is the host of this session
    const expectedHostId = `host_${req.user.id}`;
    if (gameData.host !== expectedHostId) {
      logger.debug('❌ User is not the host of this session:', { 
        userId: req.user.id, 
        expectedHostId,
        actualHostId: gameData.host 
      });
      return res.json({
        success: true,
        isActive: false,
        message: 'User is not the host of this session'
      });
    }

    // Verify game status
    const isWaiting = gameData.status === 'waiting' || gameData.gameStatus === 'waiting';
    
    logger.debug('✅ Session check result:', {
      gameId,
      room,
      isActive: isWaiting,
      gameStatus: gameData.gameStatus,
      status: gameData.status,
      playerCount: gameData.players ? (gameData.players instanceof Map ? gameData.players.size : Object.keys(gameData.players).length) : 0
    });

    res.json({
      success: true,
      isActive: isWaiting,
      gameStatus: gameData.status || gameData.gameStatus,
      playerCount: gameData.players ? (gameData.players instanceof Map ? gameData.players.size : Object.keys(gameData.players).length) : 0,
      createdAt: gameData.createdAt,
      hostId: gameData.host
    });

  } catch (error) {
    logger.error('Error checking session status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
