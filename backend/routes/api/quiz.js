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
        status: status || 'published', // Support draft status for progressive save
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
    
    // Add updated timestamp - let database handle this with DEFAULT
    // updateData.updated_at = new Date().toISOString();

    // Remove fields that shouldn't be updated via this endpoint
    delete updateData.id;
    delete updateData.user_id;
    delete updateData.created_at;
    delete updateData.updated_at; // Let database handle timestamps

    // Create user-scoped client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);

    const { data: quiz, error } = await userSupabase
      .from('question_sets')
      .update(updateData)
      .eq('id', quizId)
      .select()
      .single();

    if (error) {
      console.error('Error updating quiz:', error);
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

    // First delete all questions associated with this quiz
    const { error: questionsError } = await userSupabase
      .from('questions')
      .delete()
      .eq('question_set_id', quizId);

    if (questionsError) {
      console.error('Error deleting questions:', questionsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete quiz questions',
        error: questionsError.message
      });
    }

    // Then delete the quiz itself
    const { error: quizError } = await userSupabase
      .from('question_sets')
      .delete()
      .eq('id', quizId);

    if (quizError) {
      console.error('Error deleting quiz:', quizError);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete quiz',
        error: quizError.message
      });
    }

    res.json({
      success: true,
      message: 'Quiz deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting quiz:', error);
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

    // Validate status
    const validStatuses = ['draft', 'creating', 'published'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: draft, creating, or published'
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
