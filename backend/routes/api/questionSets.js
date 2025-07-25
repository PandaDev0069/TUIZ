const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const DatabaseManager = require('../../config/database');
const { getAuthenticatedUser } = require('../../helpers/authHelper');

// Initialize database
const db = new DatabaseManager();

// Configure multer for thumbnail uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for quiz thumbnails
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('サポートされていないファイル形式です。JPEG、PNG、またはWebP形式の画像をアップロードしてください。'));
    }
  }
});

// Get public question sets
router.get('/public', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    
    // For now, return a simple test question set if database is empty
    const result = await db.getPublicQuestionSets(parseInt(limit), parseInt(offset));
    
    if (result.success && result.questionSets.length > 0) {
      res.json({ questionSets: result.questionSets });
    } else {
      // Return a default question set for testing
      const defaultQuestionSet = {
        id: 'default-questions',
        title: 'サンプルクイズ',
        description: '基本的な日本の知識クイズ',
        category: 'general',
        difficulty_level: 'medium',
        total_questions: 5,
        is_public: true,
        created_at: new Date().toISOString()
      };
      res.json({ questionSets: [defaultQuestionSet] });
    }
  } catch (error) {
    console.error('Error fetching question sets:', error);
    // Return default question set on error
    const defaultQuestionSet = {
      id: 'default-questions',
      title: 'サンプルクイズ',
      description: '基本的な日本の知識クイズ',
      category: 'general',
      difficulty_level: 'medium',
      total_questions: 5,
      is_public: true,
      created_at: new Date().toISOString()
    };
    res.json({ questionSets: [defaultQuestionSet] });
  }
});

// Get user's own question sets (must be before :id route)
router.get('/my-sets', async (req, res) => {
  try {
    // Get authenticated user
    let authenticatedUser;
    try {
      authenticatedUser = await getAuthenticatedUser(req.headers.authorization);
    } catch (authError) {
      return res.status(401).json({ error: authError.message });
    }
    
    const { limit = 20, offset = 0 } = req.query;
    
    // Get user's question sets
    const { data: questionSets, error } = await db.supabaseAdmin
      .from('question_sets')
      .select('*')
      .eq('user_id', authenticatedUser.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    res.json({ questionSets: questionSets || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific question set
router.get('/:id', async (req, res) => {
  try {
    const result = await db.getQuestionSetWithQuestions(req.params.id);
    
    if (result.success) {
      res.json({ questionSet: result.questionSet });
    } else {
      res.status(404).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload thumbnail for question set
router.post('/:id/upload-thumbnail', upload.single('thumbnail'), async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'サムネイル画像が選択されていません。'
      });
    }

    // Get authenticated user
    let authenticatedUser;
    try {
      authenticatedUser = await getAuthenticatedUser(req.headers.authorization);
    } catch (authError) {
      return res.status(401).json({ error: authError.message });
    }

    // Verify ownership of the question set
    const { data: questionSet, error: verifyError } = await db.supabaseAdmin
      .from('question_sets')
      .select('user_id, title')
      .eq('id', id)
      .eq('user_id', authenticatedUser.id)
      .single();

    if (verifyError || !questionSet) {
      return res.status(403).json({ 
        success: false,
        error: 'クイズセットが見つからないか、アクセス権限がありません' 
      });
    }

    // Generate unique filename
    const fileExt = path.extname(file.originalname);
    const fileName = `${id}_${Date.now()}${fileExt}`;
    const filePath = `quiz-thumbnails/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await db.supabaseAdmin.storage
      .from('quiz-thumbnails')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({
        success: false,
        message: 'サムネイル画像のアップロードに失敗しました。'
      });
    }

    // Get public URL
    const { data: urlData } = db.supabaseAdmin.storage
      .from('quiz-thumbnails')
      .getPublicUrl(filePath);

    const thumbnailUrl = urlData.publicUrl;

    // Update question set's thumbnail_url in database
    const { data: updateData, error: updateError } = await db.supabaseAdmin
      .from('question_sets')
      .update({ 
        thumbnail_url: thumbnailUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      
      // Clean up uploaded file
      await db.supabaseAdmin.storage
        .from('quiz-thumbnails')
        .remove([filePath]);

      return res.status(500).json({
        success: false,
        message: 'データベースの更新に失敗しました。'
      });
    }

    console.log(`Thumbnail uploaded for question set ${id} by user:`, authenticatedUser.name);

    res.json({
      success: true,
      message: 'サムネイル画像がアップロードされました。',
      thumbnail_url: thumbnailUrl,
      questionSet: updateData
    });

  } catch (error) {
    console.error('Thumbnail upload error:', error);
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'ファイルサイズが大きすぎます。10MB以下の画像をアップロードしてください。'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'サムネイル画像のアップロード中にエラーが発生しました。'
    });
  }
});

// Delete thumbnail for question set
router.delete('/:id/thumbnail', async (req, res) => {
  try {
    const { id } = req.params;

    // Get authenticated user
    let authenticatedUser;
    try {
      authenticatedUser = await getAuthenticatedUser(req.headers.authorization);
    } catch (authError) {
      return res.status(401).json({ error: authError.message });
    }

    // Get question set and verify ownership
    const { data: questionSet, error: verifyError } = await db.supabaseAdmin
      .from('question_sets')
      .select('user_id, thumbnail_url')
      .eq('id', id)
      .eq('user_id', authenticatedUser.id)
      .single();

    if (verifyError || !questionSet) {
      return res.status(403).json({ 
        success: false,
        error: 'クイズセットが見つからないか、アクセス権限がありません' 
      });
    }

    // Extract file path from thumbnail URL if it exists
    let filePath = null;
    if (questionSet.thumbnail_url) {
      const url = new URL(questionSet.thumbnail_url);
      const pathSegments = url.pathname.split('/');
      if (pathSegments.length >= 3) {
        filePath = pathSegments.slice(-2).join('/'); // e.g., "quiz-thumbnails/filename.jpg"
      }
    }

    // Update database to remove thumbnail_url
    const { data: updateData, error: updateError } = await db.supabaseAdmin
      .from('question_sets')
      .update({ 
        thumbnail_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
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
        await db.supabaseAdmin.storage
          .from('quiz-thumbnails')
          .remove([filePath.split('/')[1]]); // Just the filename part
      } catch (storageError) {
        console.warn('Storage deletion warning:', storageError);
        // Don't fail the request if storage deletion fails
      }
    }

    console.log(`Thumbnail deleted for question set ${id} by user:`, authenticatedUser.name);

    res.json({
      success: true,
      message: 'サムネイル画像が削除されました。',
      questionSet: updateData
    });

  } catch (error) {
    console.error('Thumbnail deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'サムネイル画像の削除中にエラーが発生しました。'
    });
  }
});

// Create question set metadata only
router.post('/metadata', async (req, res) => {
  try {
    console.log('Creating question set metadata:', req.body);
    
    const { title, description, category, difficulty_level, is_public, estimated_duration, thumbnail_url, tags, status } = req.body;
    
    // Validate required fields
    if (!title?.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    // Get authenticated user
    let authenticatedUser;
    try {
      authenticatedUser = await getAuthenticatedUser(req.headers.authorization);
      console.log('Authenticated user:', authenticatedUser.id, authenticatedUser.name);
    } catch (authError) {
      console.error('Authentication error:', authError.message);
      return res.status(401).json({ error: authError.message });
    }
    
    // Create question set metadata using authenticated user
    const questionSetData = {
      user_id: authenticatedUser.id,
      title: title.trim(),
      description: description?.trim() || '',
      category: category || 'general',
      difficulty_level: difficulty_level || 'medium',
      is_public: is_public || false,
      estimated_duration: estimated_duration || 5,
      total_questions: 0,
      thumbnail_url: thumbnail_url || null,
      tags: tags || [],
      status: status || 'draft'
    };

    const { data: questionSet, error } = await db.supabaseAdmin
      .from('question_sets')
      .insert(questionSetData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating question set:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('Question set metadata created:', questionSet.id, 'by user:', authenticatedUser.name);
    res.json(questionSet);
  } catch (error) {
    console.error('Error in question set metadata creation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update question set metadata
router.patch('/:id/metadata', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, difficulty_level, is_public, estimated_duration, thumbnail_url, tags, status } = req.body;
    
    console.log(`Updating question set metadata for ${id}:`, req.body);
    
    // Get authenticated user
    let authenticatedUser;
    try {
      authenticatedUser = await getAuthenticatedUser(req.headers.authorization);
    } catch (authError) {
      return res.status(401).json({ error: authError.message });
    }
    
    // Verify ownership of the question set
    const { data: questionSet, error: verifyError } = await db.supabaseAdmin
      .from('question_sets')
      .select('user_id')
      .eq('id', id)
      .eq('user_id', authenticatedUser.id)
      .single();
    
    if (verifyError || !questionSet) {
      return res.status(403).json({ error: 'Question set not found or unauthorized' });
    }
    
    // Build update object with only provided fields
    const updateData = {
      updated_at: new Date().toISOString()
    };
    
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || '';
    if (category !== undefined) updateData.category = category;
    if (difficulty_level !== undefined) updateData.difficulty_level = difficulty_level;
    if (is_public !== undefined) updateData.is_public = is_public;
    if (estimated_duration !== undefined) updateData.estimated_duration = estimated_duration;
    if (thumbnail_url !== undefined) updateData.thumbnail_url = thumbnail_url;
    if (tags !== undefined) updateData.tags = tags;
    if (status !== undefined) updateData.status = status;
    
    // Update question set metadata
    const { data: updatedQuestionSet, error } = await db.supabaseAdmin
      .from('question_sets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating question set metadata:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('Question set metadata updated:', updatedQuestionSet.id, 'by user:', authenticatedUser.name);
    res.json(updatedQuestionSet);
  } catch (error) {
    console.error('Error in question set metadata update:', error);
    res.status(500).json({ error: error.message });
  }
});

// Finalize question set (update total questions)
router.patch('/:id/finalize', async (req, res) => {
  try {
    const { id } = req.params;
    const { total_questions, settings } = req.body;
    
    console.log(`Finalizing question set ${id} with ${total_questions} questions`);
    
    // Get authenticated user
    let authenticatedUser;
    try {
      authenticatedUser = await getAuthenticatedUser(req.headers.authorization);
    } catch (authError) {
      return res.status(401).json({ error: authError.message });
    }
    
    // Verify ownership of the question set
    const { data: questionSet, error: verifyError } = await db.supabaseAdmin
      .from('question_sets')
      .select('user_id')
      .eq('id', id)
      .eq('user_id', authenticatedUser.id)
      .single();
    
    if (verifyError || !questionSet) {
      return res.status(403).json({ error: 'Question set not found or unauthorized' });
    }
    
    // Update question set with final metadata
    const { data: updatedQuestionSet, error } = await db.supabaseAdmin
      .from('question_sets')
      .update({
        total_questions: total_questions || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error finalizing question set:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('Question set finalized:', updatedQuestionSet.id, 'by user:', authenticatedUser.name);
    res.json(updatedQuestionSet);
  } catch (error) {
    console.error('Error in question set finalization:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk question set creation (keep for backward compatibility)
router.post('/', async (req, res) => {
  try {
    const { 
      title, 
      description, 
      category, 
      difficulty_level, 
      is_public,
      estimated_duration,
      questions 
    } = req.body;
    
    // Get authenticated user
    let authenticatedUser;
    try {
      authenticatedUser = await getAuthenticatedUser(req.headers.authorization);
      console.log('Creating question set for authenticated user:', authenticatedUser.id, authenticatedUser.name);
    } catch (authError) {
      return res.status(401).json({ error: authError.message });
    }
    
    const questionSetData = {
      title,
      description: description || '',
      category: category || 'general',
      difficulty_level: difficulty_level || 'medium',
      is_public: is_public !== false, // Default to true for testing
      estimated_duration: estimated_duration || 10,
      user_id: authenticatedUser.id, // Use the authenticated user ID
      total_questions: questions ? questions.length : 0
    };
    
    console.log('Creating question set with data:', questionSetData);
    console.log('Questions:', questions?.length || 0, 'questions');
    
    const result = await db.createQuestionSet(questionSetData, questions || []);
    
    if (result.success) {
      res.status(201).json({ questionSet: result.questionSet });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
