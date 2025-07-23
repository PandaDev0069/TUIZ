const express = require('express');
const router = express.Router();
const DatabaseManager = require('../../config/database');
const { getAuthenticatedUser } = require('../../helpers/authHelper');

// Initialize database
const db = new DatabaseManager();

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

// Create question set metadata only
router.post('/metadata', async (req, res) => {
  try {
    console.log('Creating question set metadata:', req.body);
    
    const { title, description, category, difficulty_level, is_public, estimated_duration } = req.body;
    
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
    const { data: questionSet, error } = await db.supabaseAdmin
      .from('question_sets')
      .insert({
        user_id: authenticatedUser.id,
        title: title.trim(),
        description: description?.trim() || '',
        category: category || 'general',
        difficulty_level: difficulty_level || 'medium',
        is_public: is_public || false,
        estimated_duration: estimated_duration || 5,
        total_questions: 0
      })
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
