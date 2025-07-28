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
    fileSize: Math.min(parseInt(process.env.MAX_UPLOAD_SIZE) || 52428800, 25 * 1024 * 1024), // 25MB limit for answer images (increased from 3MB), respect MAX_UPLOAD_SIZE if smaller
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

// Get all answers for a specific question
router.get('/question/:id', AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Create user-scoped Supabase client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);
    
    // First verify user has access to this question (through question set ownership)
    const { data: question, error: questionError } = await userSupabase
      .from('questions')
      .select('question_set_id')
      .eq('id', id)
      .single();
    
    if (questionError || !question) {
      return res.status(404).json({ 
        success: false,
        error: 'Question not found or access denied' 
      });
    }
    
    const { data: answers, error } = await userSupabase
      .from('answers')
      .select('*')
      .eq('question_id', id)
      .order('order_index', { ascending: true });
    
    if (error) {
      return res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
    
    res.json({ 
      success: true,
      answers: answers || [] 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Delete all answers for a specific question (bulk delete)
router.delete('/question/:id', AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const { id: questionId } = req.params;
    
    // Create user-scoped Supabase client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);
    
    // First verify user has access to this question (through question set ownership)
    const { data: question, error: questionError } = await userSupabase
      .from('questions')
      .select('question_set_id')
      .eq('id', questionId)
      .single();
    
    if (questionError || !question) {
      return res.status(404).json({ 
        success: false,
        error: 'Question not found or access denied' 
      });
    }
    
    // Verify user owns the question set
    const { data: questionSet, error: setError } = await userSupabase
      .from('question_sets')
      .select('user_id')
      .eq('id', question.question_set_id)
      .single();
    
    if (setError || !questionSet || questionSet.user_id !== req.userId) {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied - you can only delete answers for your own questions' 
      });
    }
    
    // Delete all answers for this question
    const { data: deletedAnswers, error: deleteError } = await userSupabase
      .from('answers')
      .delete()
      .eq('question_id', questionId)
      .select();
    
    if (deleteError) {
      console.error('Error deleting answers:', deleteError);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to delete answers' 
      });
    }
    
    res.json({ 
      success: true,
      deleted_count: deletedAnswers ? deletedAnswers.length : 0,
      message: `Deleted ${deletedAnswers ? deletedAnswers.length : 0} answers for question ${questionId}`
    });
  } catch (error) {
    console.error('Error in bulk delete answers:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Create a new answer
router.post('/', AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const { 
      question_id, 
      answer_text, 
      image_url,
      is_correct, 
      order_index,
      answer_explanation
    } = req.body;
    
    console.log('Creating answer with data:', { question_id, answer_text, is_correct, order_index });
    
    // Validate required fields
    if (!question_id || !answer_text) {
      return res.status(400).json({ 
        success: false,
        error: 'Question ID and answer text are required' 
      });
    }
    
    // Create user-scoped Supabase client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);
    
    // Create the answer using user-scoped client (RLS will handle permission check)
    const { data: answer, error } = await userSupabase
      .from('answers')
      .insert({
        question_id,
        answer_text: answer_text.trim(),
        image_url: image_url || null,
        is_correct: is_correct || false,
        order_index: order_index || 0,
        answer_explanation: answer_explanation || null
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating answer:', error);
      return res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
    
    console.log('Answer created:', answer.id, 'for question:', question_id);
    res.status(201).json({
      success: true,
      answer: answer
    });
  } catch (error) {
    console.error('Error in answer creation:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Update an answer
router.put('/:id', AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      answer_text, 
      image_url,
      is_correct, 
      order_index,
      answer_explanation
    } = req.body;
    
    // Create user-scoped Supabase client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);
    
    // Verify ownership of the answer (through question set) - RLS will handle this automatically
    const { data: answerData, error: answerError } = await userSupabase
      .from('answers')
      .select('id')
      .eq('id', id)
      .single();
    
    if (answerError || !answerData) {
      return res.status(403).json({ 
        success: false,
        error: 'Answer not found or unauthorized' 
      });
    }
    
    // Update the answer using user-scoped client
    const updateData = {};
    if (answer_text !== undefined) updateData.answer_text = answer_text.trim();
    if (image_url !== undefined) updateData.image_url = image_url;
    if (is_correct !== undefined) updateData.is_correct = is_correct;
    if (order_index !== undefined) updateData.order_index = order_index;
    if (answer_explanation !== undefined) updateData.answer_explanation = answer_explanation?.trim() || null;
    
    const { data: updatedAnswer, error } = await userSupabase
      .from('answers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating answer:', error);
      return res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
    
    console.log('Answer updated:', updatedAnswer.id);
    res.json({
      success: true,
      answer: updatedAnswer
    });
  } catch (error) {
    console.error('Error in answer update:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Delete an answer
router.delete('/:id', AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Create user-scoped Supabase client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);
    
    // Verify ownership of the answer (through question set) - RLS will handle this automatically
    const { data: answerData, error: answerError } = await userSupabase
      .from('answers')
      .select('id')
      .eq('id', id)
      .single();
    
    if (answerError || !answerData) {
      return res.status(403).json({ 
        success: false,
        error: 'Answer not found or unauthorized' 
      });
    }
    
    // Delete the answer using user-scoped client
    const { error } = await userSupabase
      .from('answers')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting answer:', error);
      return res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
    
    console.log('Answer deleted:', id);
    res.json({ 
      success: true,
      message: 'Answer deleted successfully' 
    });
  } catch (error) {
    console.error('Error in answer deletion:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Bulk create answers for a question
router.post('/bulk', async (req, res) => {
  try {
    const { question_id, answers } = req.body;
    
    if (!question_id || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ 
        error: 'Question ID and answers array are required' 
      });
    }
    
    // Get authenticated user and verify ownership
    let authenticatedUser;
    try {
      authenticatedUser = await getAuthenticatedUser(req.headers.authorization);
    } catch (authError) {
      return res.status(401).json({ error: authError.message });
    }
    
    // Verify the user owns the question (through question set)
    const { data: questionData, error: questionError } = await db.supabaseAdmin
      .from('questions')
      .select('question_set_id, question_sets!inner(user_id)')
      .eq('id', question_id)
      .single();
    
    if (questionError || !questionData || questionData.question_sets.user_id !== authenticatedUser.id) {
      return res.status(403).json({ error: 'Question not found or unauthorized' });
    }
    
    // Prepare answers for bulk insert
    const answersToInsert = answers.map((a, index) => ({
      question_id,
      answer_text: a.answer_text?.trim() || a.text?.trim(),
      image_url: a.image_url || a.image || null,
      is_correct: a.is_correct || a.isCorrect || false,
      order_index: a.order_index !== undefined ? a.order_index : index,
      answer_explanation: a.answer_explanation || null
    }));
    
    // Insert all answers
    const { data: insertedAnswers, error } = await db.supabaseAdmin
      .from('answers')
      .insert(answersToInsert)
      .select();
    
    if (error) {
      console.error('Error bulk creating answers:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`Bulk created ${insertedAnswers.length} answers for question:`, question_id);
    res.status(201).json({ answers: insertedAnswers });
  } catch (error) {
    console.error('Error in bulk answer creation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload image for an answer
router.post('/:id/upload-image', AuthMiddleware.authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Uploading answer image for answer:', id);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    // Create user-scoped Supabase client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);
    
    // Verify ownership of the answer - RLS will handle this automatically
    const { data: answerData, error: answerError } = await userSupabase
      .from('answers')
      .select('id')
      .eq('id', id)
      .single();
    
    if (answerError || !answerData) {
      return res.status(403).json({ error: 'Answer not found or unauthorized' });
    }
    
    // Get user ID from token
    const userId = req.user?.id;
    
    // Generate unique filename
    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `answer_${id}_${Date.now()}.${fileExtension}`;
    const filePath = `${userId}/${fileName}`;
    
    console.log('Uploading answer image to storage:', filePath);
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await db.supabaseAdmin.storage
      .from(process.env.STORAGE_BUCKET_ANSWER_IMAGES || 'answer-images')
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
      .from(process.env.STORAGE_BUCKET_ANSWER_IMAGES || 'answer-images')
      .getPublicUrl(filePath);
    
    console.log('Generated answer image public URL:', publicUrl);
    
    // Update answer with image URL using user-scoped client
    const { data: updatedAnswer, error: updateError } = await userSupabase
      .from('answers')
      .update({
        image_url: publicUrl
      })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating answer with image URL:', updateError);
      return res.status(500).json({ error: updateError.message });
    }
    
    console.log('Answer image uploaded successfully:', publicUrl);
    
    res.json({
      answer: updatedAnswer,
      image_url: publicUrl
    });
    
  } catch (error) {
    console.error('Error uploading answer image:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete image for an answer
router.delete('/:id/image', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get authenticated user and verify ownership
    const authenticatedUser = await getAuthenticatedUser(req, res);
    if (!authenticatedUser) return;
    
    // Get answer with image info
    const { data: answerData, error: answerError } = await db.supabaseAdmin
      .from('answers')
      .select(`
        id,
        image_url,
        questions (
          id,
          question_sets (
            id,
            user_id
          )
        )
      `)
      .eq('id', id)
      .single();
    
    if (answerError || !answerData || answerData.questions.question_sets.user_id !== authenticatedUser.id) {
      return res.status(403).json({ error: 'Answer not found or unauthorized' });
    }
    
    // Delete from storage if URL exists
    if (answerData.image_url) {
      // Extract the file path from the URL
      // Supabase storage URLs are like: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
      const urlParts = answerData.image_url.split('/');
      const bucketIndex = urlParts.findIndex(part => part === 'public');
      if (bucketIndex !== -1 && bucketIndex + 2 < urlParts.length) {
        const filePath = urlParts.slice(bucketIndex + 2).join('/');
        const { error: deleteError } = await db.supabaseAdmin.storage
          .from(process.env.STORAGE_BUCKET_ANSWER_IMAGES || 'answer-images')
          .remove([filePath]);
        
        if (deleteError) {
          console.error('Storage delete error:', deleteError);
        }
      }
    }
    
    // Update answer to remove image references
    const { data: updatedAnswer, error: updateError } = await db.supabaseAdmin
      .from('answers')
      .update({
        image_url: null
      })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error removing answer image references:', updateError);
      return res.status(500).json({ error: updateError.message });
    }
    
    res.json({ answer: updatedAnswer });
    
  } catch (error) {
    console.error('Error deleting answer image:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reorder answers for a question
router.put('/question/:id/reorder', async (req, res) => {
  try {
    const { id } = req.params; // question_id
    const { answerOrder } = req.body; // Array of answer IDs in desired order
    
    // Get authenticated user and verify ownership
    const authenticatedUser = await getAuthenticatedUser(req, res);
    if (!authenticatedUser) return;
    
    // Verify user owns the question (through question set)
    const { data: questionData, error: questionError } = await db.supabaseAdmin
      .from('questions')
      .select(`
        id,
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
    
    // Validate that all provided answer IDs belong to this question
    const { data: existingAnswers, error: answersError } = await db.supabaseAdmin
      .from('answers')
      .select('id')
      .eq('question_id', id);
    
    if (answersError) {
      return res.status(500).json({ error: answersError.message });
    }
    
    const existingIds = existingAnswers.map(a => a.id);
    const allValid = answerOrder.every(aId => existingIds.includes(aId));
    
    if (!allValid || answerOrder.length !== existingAnswers.length) {
      return res.status(400).json({ error: 'Invalid answer order data' });
    }
    
    // Update the order
    const success = await orderManager.updateAnswerOrder(id, answerOrder);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Answer order updated successfully',
        answerOrder
      });
    } else {
      res.status(500).json({ error: 'Failed to update answer order' });
    }
    
  } catch (error) {
    console.error('Error reordering answers:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
