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
    fileSize: Math.min(parseInt(process.env.MAX_UPLOAD_SIZE) || 10485760, 3 * 1024 * 1024) // 3MB limit for answer images, respect MAX_UPLOAD_SIZE if smaller
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
router.get('/question/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: answers, error } = await db.supabaseAdmin
      .from('answers')
      .select('*')
      .eq('question_id', id)
      .order('order_index', { ascending: true });
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    res.json({ answers: answers || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new answer
router.post('/', async (req, res) => {
  try {
    const { 
      question_id, 
      answer_text, 
      image_url,
      image_storage_path,
      is_correct, 
      order_index,
      answer_explanation
    } = req.body;
    
    // Validate required fields
    if (!question_id || !answer_text) {
      return res.status(400).json({ 
        error: 'Question ID and answer text are required' 
      });
    }
    
    // Get authenticated user and verify ownership of question (through question set)
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
    
    // Create the answer
    const { data: answer, error } = await db.supabaseAdmin
      .from('answers')
      .insert({
        question_id,
        answer_text: answer_text.trim(),
        image_url: image_url || null,
        image_storage_path: image_storage_path || null,
        is_correct: is_correct || false,
        order_index: order_index || 0,
        answer_explanation: answer_explanation || null
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating answer:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('Answer created:', answer.id, 'for question:', question_id);
    res.status(201).json(answer);
  } catch (error) {
    console.error('Error in answer creation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update an answer
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      answer_text, 
      image_url,
      image_storage_path,
      is_correct, 
      order_index,
      answer_explanation
    } = req.body;
    
    // Get authenticated user
    let authenticatedUser;
    try {
      authenticatedUser = await getAuthenticatedUser(req.headers.authorization);
    } catch (authError) {
      return res.status(401).json({ error: authError.message });
    }
    
    // Verify the user owns the answer (through question -> question set)
    const { data: answerData, error: answerError } = await db.supabaseAdmin
      .from('answers')
      .select('question_id, questions!inner(question_sets!inner(user_id))')
      .eq('id', id)
      .single();
    
    if (answerError || !answerData || answerData.questions.question_sets.user_id !== authenticatedUser.id) {
      return res.status(403).json({ error: 'Answer not found or unauthorized' });
    }
    
    // Update the answer
    const updateData = {};
    if (answer_text !== undefined) updateData.answer_text = answer_text.trim();
    if (image_url !== undefined) updateData.image_url = image_url;
    if (image_storage_path !== undefined) updateData.image_storage_path = image_storage_path;
    if (is_correct !== undefined) updateData.is_correct = is_correct;
    if (order_index !== undefined) updateData.order_index = order_index;
    if (answer_explanation !== undefined) updateData.answer_explanation = answer_explanation?.trim() || null;
    
    const { data: updatedAnswer, error } = await db.supabaseAdmin
      .from('answers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating answer:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('Answer updated:', updatedAnswer.id);
    res.json(updatedAnswer);
  } catch (error) {
    console.error('Error in answer update:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete an answer
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
    
    // Verify the user owns the answer (through question -> question set)
    const { data: answerData, error: answerError } = await db.supabaseAdmin
      .from('answers')
      .select('question_id, questions!inner(question_sets!inner(user_id))')
      .eq('id', id)
      .single();
    
    if (answerError || !answerData || answerData.questions.question_sets.user_id !== authenticatedUser.id) {
      return res.status(403).json({ error: 'Answer not found or unauthorized' });
    }
    
    // Delete the answer
    const { error } = await db.supabaseAdmin
      .from('answers')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting answer:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('Answer deleted:', id);
    res.json({ message: 'Answer deleted successfully' });
  } catch (error) {
    console.error('Error in answer deletion:', error);
    res.status(500).json({ error: error.message });
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
      image_storage_path: a.image_storage_path || null,
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
router.post('/:id/upload-image', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    // Get authenticated user and verify ownership
    const authenticatedUser = await getAuthenticatedUser(req, res);
    if (!authenticatedUser) return;
    
    // Check if answer exists and user owns it (through question set)
    const { data: answerData, error: answerError } = await db.supabaseAdmin
      .from('answers')
      .select(`
        id,
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
    
    // Generate unique filename
    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `answer_${id}_${Date.now()}.${fileExtension}`;
    const filePath = `${authenticatedUser.id}/${fileName}`;
    
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
    
    // Update answer with image URL
    const { data: updatedAnswer, error: updateError } = await db.supabaseAdmin
      .from('answers')
      .update({
        image_url: publicUrl,
        image_storage_path: filePath
      })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating answer with image URL:', updateError);
      return res.status(500).json({ error: updateError.message });
    }
    
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
        image_storage_path,
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
    
    // Delete from storage if path exists
    if (answerData.image_storage_path) {
      const { error: deleteError } = await db.supabaseAdmin.storage
        .from(process.env.STORAGE_BUCKET_ANSWER_IMAGES || 'answer-images')
        .remove([answerData.image_storage_path]);
      
      if (deleteError) {
        console.error('Storage delete error:', deleteError);
      }
    }
    
    // Update answer to remove image references
    const { data: updatedAnswer, error: updateError } = await db.supabaseAdmin
      .from('answers')
      .update({
        image_url: null,
        image_storage_path: null
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
