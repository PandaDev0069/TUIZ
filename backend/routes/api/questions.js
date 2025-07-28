const express = require('express');
const router = express.Router();
const multer = require('multer');
const DatabaseManager = require('../../config/database');
const AuthMiddleware = require('../../middleware/auth');

// Initialize database
const db = new DatabaseManager();
const OrderManager = require('../../utils/OrderManager');

// Initialize order manager
const orderManager = new OrderManager();

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_UPLOAD_SIZE) || 25 * 1024 * 1024, // Use env var or default 25MB (increased from 5MB)
    fieldSize: 10 * 1024 * 1024, // 10MB for field data
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Get all questions for a specific question set
router.get('/set/:id', AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Create user-scoped Supabase client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);
    
    // First verify the user owns this question set
    const { data: questionSet, error: setError } = await userSupabase
      .from('question_sets')
      .select('id')
      .eq('id', id)
      .single();
    
    if (setError || !questionSet) {
      return res.status(404).json({ 
        success: false,
        message: 'Question set not found or access denied' 
      });
    }
    
    const { data: questions, error } = await userSupabase
      .from('questions')
      .select('*')
      .eq('question_set_id', id)
      .order('order_index', { ascending: true });
    
    if (error) {
      return res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
    
    res.json({ 
      success: true,
      questions: questions || [] 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Create a new question
router.post('/', AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const { 
      question_set_id, 
      question_text, 
      question_type,
      image_url,
      time_limit, 
      points, 
      difficulty,
      explanation,
      explanation_title,
      explanation_text,
      explanation_image_url,
      order_index 
    } = req.body;
    
    console.log('Creating question with data:', { 
      question_text, 
      question_type, 
      order_index, 
      time_limit, 
      points, 
      difficulty 
    });
    
    // Validate required fields
    if (!question_set_id || !question_text) {
      return res.status(400).json({ 
        success: false,
        error: 'Question set ID and question text are required' 
      });
    }
    
    // Create user-scoped Supabase client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);
    
    // Verify the user owns the question set (RLS will handle this automatically)
    const { data: questionSet, error: verifyError } = await userSupabase
      .from('question_sets')
      .select('id')
      .eq('id', question_set_id)
      .single();
    
    if (verifyError || !questionSet) {
      return res.status(403).json({ 
        success: false,
        error: 'Question set not found or unauthorized' 
      });
    }
    
    // Create the question using user-scoped client
    const { data: question, error } = await userSupabase
      .from('questions')
      .insert({
        question_set_id,
        question_text: question_text.trim(),
        question_type: question_type || 'multiple_choice',
        image_url: image_url || null,
        time_limit: time_limit || 10,
        points: points || 100,
        difficulty: difficulty || 'medium',
        explanation_title: explanation_title?.trim() || null,
        explanation_text: explanation_text?.trim() || explanation?.trim() || null, // Backward compatibility
        explanation_image_url: explanation_image_url || null,
        order_index: order_index || 0
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating question:', error);
      return res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
    
    console.log('Question created:', question.id, 'for question set:', question_set_id);
    res.status(201).json(question); // Return question object directly
  } catch (error) {
    console.error('Error in question creation:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Update a question
router.put('/:id', AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      question_text, 
      question_type,
      image_url,
      time_limit, 
      points, 
      difficulty,
      explanation,
      explanation_title,
      explanation_text,
      explanation_image_url,
      order_index 
    } = req.body;
    
    // Create user-scoped Supabase client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);
    
    // Verify the user owns the question (through question set) - RLS will handle this
    const { data: questionData, error: questionError } = await userSupabase
      .from('questions')
      .select('question_set_id')
      .eq('id', id)
      .single();
    
    if (questionError || !questionData) {
      return res.status(403).json({ 
        success: false,
        error: 'Question not found or unauthorized' 
      });
    }
    
    // Update the question
    const updateData = {};
    if (question_text !== undefined) updateData.question_text = question_text.trim();
    if (question_type !== undefined) updateData.question_type = question_type;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (time_limit !== undefined) updateData.time_limit = time_limit;
    if (points !== undefined) updateData.points = points;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (explanation_title !== undefined) updateData.explanation_title = explanation_title?.trim() || null;
    if (explanation_text !== undefined) updateData.explanation_text = explanation_text?.trim() || null;
    if (explanation_image_url !== undefined) updateData.explanation_image_url = explanation_image_url || null;
    // Backward compatibility: if old 'explanation' field is used, map to explanation_text
    if (explanation !== undefined && explanation_text === undefined) updateData.explanation_text = explanation.trim();
    if (order_index !== undefined) updateData.order_index = order_index;
    
    const { data: updatedQuestion, error } = await userSupabase
      .from('questions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating question:', error);
      return res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
    
    console.log('Question updated:', updatedQuestion.id);
    res.json(updatedQuestion); // Return question object directly
  } catch (error) {
    console.error('Error in question update:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Delete a question
router.delete('/:id', AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Create user-scoped Supabase client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);
    
    // Verify the user owns the question (through question set) - RLS will handle this
    const { data: questionData, error: questionError } = await userSupabase
      .from('questions')
      .select('question_set_id')
      .eq('id', id)
      .single();
    
    if (questionError || !questionData) {
      return res.status(403).json({ 
        success: false,
        error: 'Question not found or unauthorized' 
      });
    }
    
    // Delete the question
    const { error } = await userSupabase
      .from('questions')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting question:', error);
      return res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
    
    console.log('Question deleted:', id);
    res.json({ 
      success: true,
      message: 'Question deleted successfully' 
    });
  } catch (error) {
    console.error('Error in question deletion:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Bulk create questions for a question set
router.post('/bulk', AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const { question_set_id, questions } = req.body;
    
    if (!question_set_id || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ 
        success: false,
        error: 'Question set ID and questions array are required' 
      });
    }
    
    // Create user-scoped Supabase client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);
    
    // Verify the user owns the question set - RLS will handle this
    const { data: questionSet, error: verifyError } = await userSupabase
      .from('question_sets')
      .select('id')
      .eq('id', question_set_id)
      .single();
    
    if (verifyError || !questionSet) {
      return res.status(403).json({ 
        success: false,
        error: 'Question set not found or unauthorized' 
      });
    }
    
    // Prepare questions for bulk insert
    const questionsToInsert = questions.map((q, index) => ({
      question_set_id,
      question_text: q.question_text?.trim() || q.text?.trim(),
      question_type: q.question_type || q.type || 'multiple_choice',
      image_url: q.image_url || q.image || null,
      time_limit: q.time_limit || q.timeLimit || 10,
      points: q.points || 100,
      difficulty: q.difficulty || 'medium',
      explanation: q.explanation?.trim() || '',
      order_index: q.order_index !== undefined ? q.order_index : index
    }));
    
    // Insert all questions using user-scoped client
    const { data: insertedQuestions, error } = await userSupabase
      .from('questions')
      .insert(questionsToInsert)
      .select();
    
    if (error) {
      console.error('Error bulk creating questions:', error);
      return res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
    
    console.log(`Bulk created ${insertedQuestions.length} questions for question set:`, question_set_id);
    res.status(201).json({ questions: insertedQuestions });
  } catch (error) {
    console.error('Error in bulk question creation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload image for a question
router.post('/:id/upload-image', AuthMiddleware.authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Uploading question image for question:', id);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    // Create user-scoped Supabase client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);
    
    // Verify ownership of the question - RLS will handle this automatically
    const { data: questionData, error: questionError } = await userSupabase
      .from('questions')
      .select('id')
      .eq('id', id)
      .single();
    
    if (questionError || !questionData) {
      return res.status(403).json({ error: 'Question not found or unauthorized' });
    }
    
    // Get user ID from token
    const userId = req.user?.id;
    
    // Generate unique filename
    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `question_${id}_${Date.now()}.${fileExtension}`;
    const filePath = `${userId}/${fileName}`;
    
    console.log('Uploading to storage:', filePath);
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await db.supabaseAdmin.storage
      .from(process.env.STORAGE_BUCKET_QUESTION_IMAGES || 'question-images')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload image' });
    }
    
    // Get public URL
    const { data: { publicUrl } } = db.supabaseAdmin.storage
      .from(process.env.STORAGE_BUCKET_QUESTION_IMAGES || 'question-images')
      .getPublicUrl(filePath);
    
    console.log('Generated public URL:', publicUrl);
    
    // Update question with image URL using user-scoped client
    const { data: updatedQuestion, error: updateError } = await userSupabase
      .from('questions')
      .update({
        image_url: publicUrl
      })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating question with image URL:', updateError);
      return res.status(500).json({ error: updateError.message });
    }
    
    console.log('Question image uploaded successfully:', publicUrl);
    
    res.json({
      question: updatedQuestion,
      image_url: publicUrl
    });
    
  } catch (error) {
    console.error('Error uploading question image:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete image for a question
router.delete('/:id/image', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get authenticated user and verify ownership
    const authenticatedUser = await getAuthenticatedUser(req, res);
    if (!authenticatedUser) return;
    
    // Get question with image info
    const { data: questionData, error: questionError } = await db.supabaseAdmin
      .from('questions')
      .select(`
        id,
        image_url,
        question_sets (
          id,
          user_id
        )
      `)
      .eq('id', id)
      .single();
    
    if (questionError || !questionData || questionData.question_sets.user_id !== authenticatedUser.id) {
      return res.status(403).json({ error: 'Question not found or unauthorized' });
    }
    
    // Delete from storage if URL exists
    if (questionData.image_url) {
      // Extract the file path from the URL
      // Supabase storage URLs are like: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
      const urlParts = questionData.image_url.split('/');
      const bucketIndex = urlParts.findIndex(part => part === 'public');
      if (bucketIndex !== -1 && bucketIndex + 2 < urlParts.length) {
        const filePath = urlParts.slice(bucketIndex + 2).join('/');
        const { error: deleteError } = await db.supabaseAdmin.storage
          .from(process.env.STORAGE_BUCKET_QUESTION_IMAGES || 'question-images')
          .remove([filePath]);
        
        if (deleteError) {
          console.error('Storage delete error:', deleteError);
        }
      }
    }
    
    // Update question to remove image references
    const { data: updatedQuestion, error: updateError } = await db.supabaseAdmin
      .from('questions')
      .update({
        image_url: null
      })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error removing question image references:', updateError);
      return res.status(500).json({ error: updateError.message });
    }
    
    res.json({ question: updatedQuestion });
    
  } catch (error) {
    console.error('Error deleting question image:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reorder questions in a question set
router.put('/set/:id/reorder', async (req, res) => {
  try {
    const { id } = req.params;
    const { questionOrder } = req.body; // Array of question IDs in desired order
    
    // Get authenticated user and verify ownership
    const authenticatedUser = await getAuthenticatedUser(req, res);
    if (!authenticatedUser) return;
    
    // Verify user owns the question set
    const { data: questionSet, error: setError } = await db.supabaseAdmin
      .from('question_sets')
      .select('id, user_id')
      .eq('id', id)
      .single();
    
    if (setError || !questionSet || questionSet.user_id !== authenticatedUser.id) {
      return res.status(403).json({ error: 'Question set not found or unauthorized' });
    }
    
    // Validate that all provided question IDs belong to this question set
    const { data: existingQuestions, error: questionsError } = await db.supabaseAdmin
      .from('questions')
      .select('id')
      .eq('question_set_id', id);
    
    if (questionsError) {
      return res.status(500).json({ error: questionsError.message });
    }
    
    const existingIds = existingQuestions.map(q => q.id);
    const allValid = questionOrder.every(qId => existingIds.includes(qId));
    
    if (!allValid || questionOrder.length !== existingQuestions.length) {
      return res.status(400).json({ error: 'Invalid question order data' });
    }
    
    // Update the order
    const success = await orderManager.updateQuestionOrder(id, questionOrder);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Question order updated successfully',
        questionOrder
      });
    } else {
      res.status(500).json({ error: 'Failed to update question order' });
    }
    
  } catch (error) {
    console.error('Error reordering questions:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
