const express = require('express');
const router = express.Router();
const DatabaseManager = require('../../config/database');
const { getAuthenticatedUser } = require('../../helpers/authHelper');

// Initialize database
const db = new DatabaseManager();

// Get user info from token
router.get('/user-info', async (req, res) => {
  try {
    const authenticatedUser = await getAuthenticatedUser(req.headers.authorization);
    res.json(authenticatedUser);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Get all question sets for debugging
router.get('/all-question-sets', async (req, res) => {
  try {
    const { data: questionSets, error } = await db.supabaseAdmin
      .from('question_sets')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    res.json({ questionSets: questionSets || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all questions for debugging
router.get('/all-questions', async (req, res) => {
  try {
    const { data: questions, error } = await db.supabaseAdmin
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    res.json({ questions: questions || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear all data (development only)
router.delete('/clear-all', async (req, res) => {
  try {
    // Delete all questions first (foreign key constraint)
    await db.supabaseAdmin.from('questions').delete().gte('id', 0);
    
    // Delete all question sets
    await db.supabaseAdmin.from('question_sets').delete().gte('id', 0);
    
    res.json({ message: 'All data cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test database connection
router.get('/test-db', async (req, res) => {
  try {
    const { data, error } = await db.supabaseAdmin
      .from('question_sets')
      .select('count(*)')
      .single();
    
    if (error) {
      return res.status(500).json({ error: error.message, connected: false });
    }
    
    res.json({ connected: true, questionSetsCount: data.count });
  } catch (error) {
    res.status(500).json({ error: error.message, connected: false });
  }
});

// Get server status
router.get('/status', (req, res) => {
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

module.exports = router;
