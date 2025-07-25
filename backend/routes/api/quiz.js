const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const DatabaseManager = require('../../config/database');
const auth = require('../../middleware/auth');

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
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Upload thumbnail endpoint
router.post('/upload-thumbnail', auth, upload.single('thumbnail'), async (req, res) => {
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
router.post('/create', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      difficulty_level,
      estimated_duration,
      thumbnail_url,
      tags,
      is_public
    } = req.body;

    // Validate required fields
    if (!title || !category || !difficulty_level) {
      return res.status(400).json({
        success: false,
        message: 'Title, category, and difficulty level are required'
      });
    }

    // Insert quiz set into database
    const { data: quizData, error: quizError } = await supabase
      .from('question_sets')
      .insert([{
        title: title.trim(),
        description: description?.trim() || null,
        category: category,
        difficulty_level: difficulty_level,
        estimated_duration: estimated_duration || null,
        thumbnail_url: thumbnail_url || null,
        tags: tags || [],
        is_public: is_public || false,
        user_id: req.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
router.get('/my-quizzes', auth, async (req, res) => {
  try {
    const { data: quizzes, error } = await supabase
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
      .eq('user_id', req.user.id)
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
router.get('/:id', auth, async (req, res) => {
  try {
    const quizId = req.params.id;

    const { data: quiz, error } = await supabase
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
      .eq('user_id', req.user.id)
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
router.put('/:id', auth, async (req, res) => {
  try {
    const quizId = req.params.id;
    const updateData = { ...req.body };
    
    // Add updated timestamp
    updateData.updated_at = new Date().toISOString();

    // Remove fields that shouldn't be updated via this endpoint
    delete updateData.id;
    delete updateData.user_id;
    delete updateData.created_at;

    const { data: quiz, error } = await supabase
      .from('question_sets')
      .update(updateData)
      .eq('id', quizId)
      .eq('user_id', req.user.id)
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
router.delete('/:id', auth, async (req, res) => {
  try {
    const quizId = req.params.id;

    // First delete all questions associated with this quiz
    const { error: questionsError } = await supabase
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
    const { error: quizError } = await supabase
      .from('question_sets')
      .delete()
      .eq('id', quizId)
      .eq('user_id', req.user.id);

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

module.exports = router;
