const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const DatabaseManager = require('../../config/database');
const AuthMiddleware = require('../../middleware/auth');

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
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `thumbnail-${uniqueSuffix}${ext}`);
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
router.post('/upload-thumbnail', AuthMiddleware.authenticateToken, upload.single('thumbnail'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    // Read the uploaded file
    const filePath = req.file.path;
    const fileName = req.file.filename;
    const fileBuffer = fs.readFileSync(filePath);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('quiz-thumbnails')
      .upload(`${req.user.id}/${fileName}`, fileBuffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      // Clean up local file
      fs.unlinkSync(filePath);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to upload to storage',
        error: uploadError.message 
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('quiz-thumbnails')
      .getPublicUrl(`${req.user.id}/${fileName}`);

    // Clean up local file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'Thumbnail uploaded successfully',
      thumbnail_url: urlData.publicUrl,
      file_path: uploadData.path
    });

  } catch (error) {
    console.error('Thumbnail upload error:', error);
    
    // Clean up local file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('File cleanup error:', cleanupError);
      }
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Upload thumbnail for existing quiz
router.post('/:id/upload-thumbnail', AuthMiddleware.authenticateToken, upload.single('thumbnail'), async (req, res) => {
  try {
    const quizId = req.params.id;
    
    console.log('🖼️ Thumbnail upload started for quiz:', quizId);
    console.log('📊 Upload details:', {
      hasFile: !!req.file,
      fileName: req.file?.filename,
      fileSize: req.file?.size,
      mimeType: req.file?.mimetype,
      userId: req.user?.id
    });
    
    if (!req.file) {
      console.error('❌ No file uploaded for quiz:', quizId);
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
      console.error('❌ Quiz verification error for quiz', quizId, ':', verifyError.message);
      return res.status(404).json({
        success: false,
        message: 'Quiz not found or access denied',
        error: verifyError.message
      });
    }

    if (!existingQuiz) {
      console.error('❌ Quiz not found:', quizId);
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    console.log('✅ Quiz verification successful:', existingQuiz.title);

    // Read the uploaded file
    const filePath = req.file.path;
    const fileName = req.file.filename;
    const fileBuffer = fs.readFileSync(filePath);

    console.log('📤 Uploading to Supabase storage:', fileName);

    // Upload to Supabase Storage using user-scoped client
    const { data: uploadData, error: uploadError } = await userSupabase.storage
      .from('quiz-thumbnails')
      .upload(`${req.user.id}/${fileName}`, fileBuffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Supabase upload error:', uploadError);
      // Clean up local file
      fs.unlinkSync(filePath);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to upload to storage',
        error: uploadError.message 
      });
    }

    console.log('✅ File uploaded to storage successfully');

    // Get public URL using user-scoped client
    const { data: urlData } = userSupabase.storage
      .from('quiz-thumbnails')
      .getPublicUrl(`${req.user.id}/${fileName}`);

    const thumbnailUrl = urlData.publicUrl;
    console.log('🔗 Generated thumbnail URL:', thumbnailUrl);

    // Update quiz thumbnail_url in database using user-scoped client
    console.log('💾 Updating database with thumbnail URL for quiz:', quizId);
    const { data: updateData, error: updateError } = await userSupabase
      .from('question_sets')
      .update({ 
        thumbnail_url: thumbnailUrl
      })
      .eq('id', quizId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Database update error for quiz', quizId, ':', updateError.message);
      console.error('❌ Update error details:', updateError);
      
      // Clean up uploaded file from storage
      try {
        await userSupabase.storage
          .from('quiz-thumbnails')
          .remove([`${req.user.id}/${fileName}`]);
        console.log('🧹 Cleaned up storage file after DB error');
      } catch (cleanupError) {
        console.warn('⚠️ Storage cleanup warning:', cleanupError);
      }

      // Clean up local file
      fs.unlinkSync(filePath);
      
      return res.status(500).json({
        success: false,
        message: 'データベースの更新に失敗しました。',
        error: updateError.message
      });
    }

    console.log('✅ Database updated successfully');
    console.log('📋 Updated quiz data:', updateData);

    // Double-check that the update actually persisted by reading it back
    console.log('🔍 Verifying database update persistence...');
    const { data: verifyData, error: readVerifyError } = await userSupabase
      .from('question_sets')
      .select('id, title, thumbnail_url')
      .eq('id', quizId)
      .single();

    if (readVerifyError) {
      console.error('❌ Verification read failed:', readVerifyError);
    } else {
      console.log('🔍 Verification result:', {
        id: verifyData.id,
        title: verifyData.title,
        thumbnail_url: verifyData.thumbnail_url,
        urlMatch: verifyData.thumbnail_url === thumbnailUrl
      });
      
      if (verifyData.thumbnail_url !== thumbnailUrl) {
        console.error('❌ CRITICAL: Database update did not persist! Expected:', thumbnailUrl, 'Got:', verifyData.thumbnail_url);
        
        // Try to update again with explicit transaction
        console.log('🔄 Attempting database update retry...');
        const { data: retryData, error: retryError } = await userSupabase
          .from('question_sets')
          .update({ thumbnail_url: thumbnailUrl })
          .eq('id', quizId)
          .select()
          .single();
          
        if (retryError) {
          console.error('❌ Retry failed:', retryError);
        } else {
          console.log('✅ Retry successful:', retryData);
        }
      }
    }

    // Clean up local file
    fs.unlinkSync(filePath);

    console.log(`🎉 Thumbnail upload completed for quiz: ${quizId} - ${thumbnailUrl}`);

    res.json({
      success: true,
      message: 'サムネイル画像がアップロードされました。',
      thumbnail_url: thumbnailUrl,
      quiz: updateData
    });

  } catch (error) {
    console.error('❌ Thumbnail upload error:', error);
    
    // Clean up local file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('🧹 Cleaned up local file after error');
      } catch (cleanupError) {
        console.error('❌ File cleanup error:', cleanupError);
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
router.delete('/:id/thumbnail', AuthMiddleware.authenticateToken, async (req, res) => {
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
      console.error('Database update error:', updateError);
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
        console.warn('Storage deletion warning:', storageError);
        // Don't fail the request if storage deletion fails
      }
    }

    console.log(`Thumbnail deleted for quiz ${quizId} by user:`, req.user.name);

    res.json({
      success: true,
      message: 'サムネイル画像が削除されました。',
      quiz: updateData
    });

  } catch (error) {
    console.error('Thumbnail deletion error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'サムネイル画像の削除中にエラーが発生しました。'
    });
  }
});

// Create quiz with metadata
router.post('/create', AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      difficulty_level,
      estimated_duration,
      thumbnail_url,
      tags,
      is_public,
      status
    } = req.body;

    // Validate required fields
    if (!title || !category || !difficulty_level) {
      return res.status(400).json({
        success: false,
        message: 'Title, category, and difficulty level are required'
      });
    }

    // Create user-scoped Supabase client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);

    // Insert quiz set into database using user-scoped client
    const { data: quizData, error: quizError } = await userSupabase
      .from('question_sets')
      .insert([{
        user_id: req.user.id, // CRITICAL: Set user_id for RLS policy compliance
        title: title.trim(),
        description: description?.trim() || null,
        category: category,
        difficulty_level: difficulty_level,
        estimated_duration: estimated_duration || null,
        thumbnail_url: thumbnail_url || null,
        tags: tags || [], // This should be a text array
        is_public: is_public || false,
        status: status || 'draft', // Use draft status for intermediate saves
        total_questions: 0, // Will be updated as questions are added
        times_played: 0,
        average_score: 0.0,
        completion_rate: 0.0,
        play_settings: {}
        // Note: id, created_at, updated_at, last_played_at are handled by database defaults
      }])
      .select()
      .single();

    if (quizError) {
      console.error('Quiz creation error:', quizError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create quiz',
        error: quizError.message
      });
    }

    res.json({
      success: true,
      message: 'Quiz created successfully',
      quiz: quizData
    });

  } catch (error) {
    console.error('Quiz creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get user's quizzes
router.get('/my-quizzes', AuthMiddleware.authenticateToken, async (req, res) => {
  try {
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
        estimated_duration,
        thumbnail_url,
        tags,
        is_public,
        status,
        total_questions,
        created_at,
        updated_at
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching quizzes:', error);
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
    console.error('Error fetching quizzes:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get quiz by ID
router.get('/:id', AuthMiddleware.authenticateToken, async (req, res) => {
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
      console.error('Error fetching quiz:', error);
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
    console.error('Error fetching quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update quiz metadata
router.put('/:id', AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const quizId = req.params.id;
    const updateData = { ...req.body };
    
    // Remove fields that shouldn't be updated via this endpoint
    delete updateData.id;
    delete updateData.user_id;
    delete updateData.created_at;
    delete updateData.updated_at; // Let database handle timestamps

    // Create user-scoped client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);

    // First verify the quiz exists and belongs to this user
    const { data: existingQuiz, error: verifyError } = await userSupabase
      .from('question_sets')
      .select('id, user_id, title')
      .eq('id', quizId)
      .single();

    if (verifyError) {
      console.error('Quiz verification error for quiz', quizId, ':', verifyError.message);
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

    console.log(`✅ Quiz updated: ${quizId} (${updateData.title || existingQuiz.title})`);
    
    // Validate update data against database constraints
    if (updateData.difficulty_level && !['easy', 'medium', 'hard', 'expert'].includes(updateData.difficulty_level)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid difficulty level. Must be: easy, medium, hard, or expert'
      });
    }

    if (updateData.status && !['draft', 'published', 'archived'].includes(updateData.status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: draft, published, or archived'
      });
    }

    if (updateData.estimated_duration && (typeof updateData.estimated_duration !== 'number' || updateData.estimated_duration <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Estimated duration must be a positive number'
      });
    }

    if (updateData.total_questions && (typeof updateData.total_questions !== 'number' || updateData.total_questions < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Total questions must be a non-negative number'
      });
    }

    const { data: quiz, error } = await userSupabase
      .from('question_sets')
      .update(updateData)
      .eq('id', quizId)
      .select()
      .single();

    if (error) {
      console.error('Error updating quiz', quizId, ':', error.message);
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
    console.error('Error updating quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Delete quiz
router.delete('/:id', AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const quizId = req.params.id;
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);

    console.log('🗑️ Starting quiz deletion for:', quizId);

    // First, get the quiz data to check for thumbnail
    const { data: quizData, error: fetchError } = await userSupabase
      .from('question_sets')
      .select('id, title, thumbnail_url, user_id')
      .eq('id', quizId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching quiz for deletion:', fetchError);
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

    console.log('✅ Quiz found for deletion:', quizData.title);

    // Delete thumbnail from storage if it exists
    if (quizData.thumbnail_url) {
      try {
        console.log('🖼️ Deleting thumbnail from storage:', quizData.thumbnail_url);
        
        // Extract filename from URL
        const urlParts = quizData.thumbnail_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `${req.user.id}/${fileName}`;

        const { error: storageError } = await userSupabase.storage
          .from('quiz-thumbnails')
          .remove([filePath]);

        if (storageError) {
          console.warn('⚠️ Thumbnail deletion warning:', storageError);
          // Don't fail the entire deletion if thumbnail cleanup fails
        } else {
          console.log('✅ Thumbnail deleted from storage successfully');
        }
      } catch (thumbnailError) {
        console.warn('⚠️ Thumbnail cleanup error:', thumbnailError);
        // Continue with quiz deletion even if thumbnail cleanup fails
      }
    } else {
      console.log('📝 No thumbnail to delete');
    }

    // First, get all question data with image URLs for cleanup
    const { data: questionsWithImages, error: questionIdsError } = await userSupabase
      .from('questions')
      .select('id, image_url, explanation_image_url')
      .eq('question_set_id', quizId);

    if (questionIdsError) {
      console.warn('⚠️ Error fetching question data:', questionIdsError);
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
        console.warn('⚠️ Error fetching answer data:', answerError);
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
      console.log(`🖼️ Deleting ${imagesToDelete.length} images from storage`);
      
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
              console.warn(`⚠️ Failed to delete image ${filePath}:`, deleteError);
            } else {
              console.log(`✅ Deleted image: ${filePath}`);
            }
          }
        } catch (imageError) {
          console.warn(`⚠️ Error deleting image ${imageUrl}:`, imageError);
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
        console.warn('⚠️ Error deleting answers:', answersError);
        // Continue anyway - the questions deletion might cascade
      } else {
        console.log('✅ Answers deleted successfully');
      }
    } else {
      console.log('📝 No questions found, skipping answer deletion');
    }

    // Delete all questions associated with this quiz
    const { error: questionsError } = await userSupabase
      .from('questions')
      .delete()
      .eq('question_set_id', quizId);

    if (questionsError) {
      console.error('❌ Error deleting questions:', questionsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete quiz questions',
        error: questionsError.message
      });
    }

    console.log('✅ Questions deleted successfully');

    // Finally, delete the quiz itself
    const { error: quizError } = await userSupabase
      .from('question_sets')
      .delete()
      .eq('id', quizId);

    if (quizError) {
      console.error('❌ Error deleting quiz:', quizError);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete quiz',
        error: quizError.message
      });
    }

    console.log(`🎉 Quiz "${quizData.title}" deleted completely (including thumbnail)`);

    res.json({
      success: true,
      message: 'Quiz deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting quiz:', error);
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
    const { status } = req.body;

    // Validate status - use actual database enum values
    const validStatuses = ['draft', 'published', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: draft, published, or archived'
      });
    }

    const { data: updatedQuiz, error } = await AuthMiddleware.createUserScopedClient(req.userToken)
      .from('question_sets')
      .update({
        status: status
      })
      .eq('id', quizId)
      .select()
      .single();

    if (error) {
      console.error('Status update error:', error);
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
    console.error('Error updating quiz status:', error);
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
      console.error('Question count update error:', error);
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
    console.error('Error updating question count:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Publish quiz (final step)
router.post('/:id/publish', AuthMiddleware.authenticateToken, async (req, res) => {
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
      console.error('Publish error:', publishError);
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
    console.error('Error publishing quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get quiz with questions (for loading drafts)
router.get('/:id/questions', AuthMiddleware.authenticateToken, async (req, res) => {
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
      console.error('Questions fetch error:', error);
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
    console.error('Error fetching questions:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
