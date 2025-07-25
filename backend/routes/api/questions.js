const express = require('express');
const router = express.Router();
const multer = require('multer');
const DatabaseManager = require('../../config/database');
const { getAuthenticatedUser } = require('../../helpers/authHelper');

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
    fileSize: parseInt(process.env.MAX_UPLOAD_SIZE) || 5 * 1024 * 1024 // Use env var or default 5MB
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
router.get('/set/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: questions, error } = await db.supabaseAdmin
      .from('questions')
      .select('*')
      .eq('question_set_id', id)
      .order('order_index', { ascending: true });
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    res.json({ questions: questions || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new question
router.post('/', async (req, res) => {
  try {
    const { 
      question_set_id, 
      question_text, 
      question_type,
      image_url,
      image_storage_path,
      time_limit, 
      points, 
      difficulty,
      explanation,
      order_index 
    } = req.body;
    
    // Validate required fields
    if (!question_set_id || !question_text) {
      return res.status(400).json({ 
        error: 'Question set ID and question text are required' 
      });
    }
    
    // Get authenticated user and verify ownership of question set
    let authenticatedUser;
    try {
      authenticatedUser = await getAuthenticatedUser(req.headers.authorization);
    } catch (authError) {
      return res.status(401).json({ error: authError.message });
    }
    
    // Verify the user owns the question set
    const { data: questionSet, error: verifyError } = await db.supabaseAdmin
      .from('question_sets')
      .select('user_id')
      .eq('id', question_set_id)
      .eq('user_id', authenticatedUser.id)
      .single();
    
    if (verifyError || !questionSet) {
      return res.status(403).json({ error: 'Question set not found or unauthorized' });
    }
    
    // Create the question
    const { data: question, error } = await db.supabaseAdmin
      .from('questions')
      .insert({
        question_set_id,
        question_text: question_text.trim(),
        question_type: question_type || 'multiple_choice',
        image_url: image_url || null,
        image_storage_path: image_storage_path || null,
        time_limit: time_limit || 10,
        points: points || 100,
        difficulty: difficulty || 'medium',
        explanation: explanation?.trim() || '',
        order_index: order_index || 0
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating question:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('Question created:', question.id, 'for question set:', question_set_id);
    res.status(201).json(question);
  } catch (error) {
    console.error('Error in question creation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a question
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      question_text, 
      question_type,
      image_url,
      image_storage_path,
      time_limit, 
      points, 
      difficulty,
      explanation,
      order_index 
    } = req.body;
    
    // Get authenticated user
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
      .eq('id', id)
      .single();
    
    if (questionError || !questionData || questionData.question_sets.user_id !== authenticatedUser.id) {
      return res.status(403).json({ error: 'Question not found or unauthorized' });
    }
    
    // Update the question
    const updateData = {};
    if (question_text !== undefined) updateData.question_text = question_text.trim();
    if (question_type !== undefined) updateData.question_type = question_type;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (image_storage_path !== undefined) updateData.image_storage_path = image_storage_path;
    if (time_limit !== undefined) updateData.time_limit = time_limit;
    if (points !== undefined) updateData.points = points;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (explanation !== undefined) updateData.explanation = explanation.trim();
    if (order_index !== undefined) updateData.order_index = order_index;
    
    const { data: updatedQuestion, error } = await db.supabaseAdmin
      .from('questions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating question:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('Question updated:', updatedQuestion.id);
    res.json(updatedQuestion);
  } catch (error) {
    console.error('Error in question update:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a question
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get authenticated user
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
      .eq('id', id)
      .single();
    
    if (questionError || !questionData || questionData.question_sets.user_id !== authenticatedUser.id) {
      return res.status(403).json({ error: 'Question not found or unauthorized' });
    }
    
    // Delete the question
    const { error } = await db.supabaseAdmin
      .from('questions')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting question:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('Question deleted:', id);
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error in question deletion:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk create questions for a question set
router.post('/bulk', async (req, res) => {
  try {
    const { question_set_id, questions } = req.body;
    
    if (!question_set_id || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ 
        error: 'Question set ID and questions array are required' 
      });
    }
    
    // Get authenticated user and verify ownership
    let authenticatedUser;
    try {
      authenticatedUser = await getAuthenticatedUser(req.headers.authorization);
    } catch (authError) {
      return res.status(401).json({ error: authError.message });
    }
    
    // Verify the user owns the question set
    const { data: questionSet, error: verifyError } = await db.supabaseAdmin
      .from('question_sets')
      .select('user_id')
      .eq('id', question_set_id)
      .eq('user_id', authenticatedUser.id)
      .single();
    
    if (verifyError || !questionSet) {
      return res.status(403).json({ error: 'Question set not found or unauthorized' });
    }
    
    // Prepare questions for bulk insert
    const questionsToInsert = questions.map((q, index) => ({
      question_set_id,
      question_text: q.question_text?.trim() || q.text?.trim(),
      question_type: q.question_type || q.type || 'multiple_choice',
      image_url: q.image_url || q.image || null,
      image_storage_path: q.image_storage_path || null,
      time_limit: q.time_limit || q.timeLimit || 10,
      points: q.points || 100,
      difficulty: q.difficulty || 'medium',
      explanation: q.explanation?.trim() || '',
      order_index: q.order_index !== undefined ? q.order_index : index
    }));
    
    // Insert all questions
    const { data: insertedQuestions, error } = await db.supabaseAdmin
      .from('questions')
      .insert(questionsToInsert)
      .select();
    
    if (error) {
      console.error('Error bulk creating questions:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`Bulk created ${insertedQuestions.length} questions for question set:`, question_set_id);
    res.status(201).json({ questions: insertedQuestions });
  } catch (error) {
    console.error('Error in bulk question creation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload image for a question
router.post('/:id/upload-image', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    // Get authenticated user and verify ownership
    const authenticatedUser = await getAuthenticatedUser(req, res);
    if (!authenticatedUser) return;
    
    // Check if question exists and user owns it (through question set)
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
    
    // Generate unique filename
    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `question_${id}_${Date.now()}.${fileExtension}`;
    const filePath = `${authenticatedUser.id}/${fileName}`;
    
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
    
    // Update question with image URL
    const { data: updatedQuestion, error: updateError } = await db.supabaseAdmin
      .from('questions')
      .update({
        image_url: publicUrl,
        image_storage_path: filePath
      })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating question with image URL:', updateError);
      return res.status(500).json({ error: updateError.message });
    }
    
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
        image_storage_path,
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
    
    // Delete from storage if path exists
    if (questionData.image_storage_path) {
      const { error: deleteError } = await db.supabaseAdmin.storage
        .from(process.env.STORAGE_BUCKET_QUESTION_IMAGES || 'question-images')
        .remove([questionData.image_storage_path]);
      
      if (deleteError) {
        console.error('Storage delete error:', deleteError);
      }
    }
    
    // Update question to remove image references
    const { data: updatedQuestion, error: updateError } = await db.supabaseAdmin
      .from('questions')
      .update({
        image_url: null,
        image_storage_path: null
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
