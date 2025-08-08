const express = require('express');
const logger = require('../../utils/logger');
const router = express.Router();
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const DatabaseManager = require('../../config/database');
const AuthMiddleware = require('../../middleware/auth');
const RateLimitMiddleware = require('../../middleware/rateLimiter');
const SecurityUtils = require('../../utils/SecurityUtils');

// Initialize database
const db = new DatabaseManager();
const OrderManager = require('../../utils/OrderManager');

// Initialize order manager
const orderManager = new OrderManager();

// Rate limiter for image deletion routes
const deleteImageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests, please try again later.'
  }
});

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
router.get('/set/:id', RateLimitMiddleware.createReadLimit(), AuthMiddleware.authenticateToken, async (req, res) => {
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

// IMPORTANT: Bulk routes must come BEFORE parameterized routes like /:id

// Bulk upload images for questions and answers (to be called before bulk save)
router.post('/bulk-upload-images', RateLimitMiddleware.createUploadLimit(), AuthMiddleware.authenticateToken, upload.array('images', 50), async (req, res) => {
  try {
    console.log('🖼️ BULK IMAGE UPLOAD ENDPOINT HIT');
    console.log('Files received:', req.files?.length || 0);
    console.log('Body data:', JSON.stringify(req.body, null, 2));
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'No image files provided' 
      });
    }
    
    const { question_set_id, image_mappings } = req.body;
    
    if (!question_set_id) {
      return res.status(400).json({ 
        success: false,
        error: 'Question set ID is required' 
      });
    }
    
    // Parse image mappings (sent as JSON string in multipart form)
    let mappings;
    try {
      mappings = JSON.parse(image_mappings || '[]');
    } catch (e) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid image mappings format' 
      });
    }
    
    // Create user-scoped Supabase client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);
    
    // Verify the user owns the question set
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
    
    const userId = req.user?.id;
    const uploadResults = [];
    
    // Ensure req.files is an array to prevent type confusion
    if (!Array.isArray(req.files)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid files format'
      });
    }
    // Upload each image file
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const mapping = mappings[i];
      
      if (!mapping) {
        console.error('No mapping found for file index:', i);
        continue;
      }
      
      try {
        // Generate unique filename based on type
        const fileExtension = file.originalname.split('.').pop();
        const timestamp = Date.now();
        let fileName, bucketName;
        
        if (mapping.type === 'question') {
          fileName = `question_temp_${timestamp}_${i}.${fileExtension}`;
          bucketName = process.env.STORAGE_BUCKET_QUESTION_IMAGES || 'question-images';
        } else if (mapping.type === 'answer') {
          fileName = `answer_temp_${timestamp}_${i}.${fileExtension}`;
          bucketName = process.env.STORAGE_BUCKET_ANSWER_IMAGES || 'answer-images';
        } else {
          console.error('Unknown image type:', mapping.type);
          continue;
        }
        
        const filePath = `${userId}/${fileName}`;
        
        SecurityUtils.safeLog('info', 'Uploading image', {
          mappingType: mapping.type,
          filePath: filePath
        });
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await db.supabaseAdmin.storage
          .from(bucketName)
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '3600',
            upsert: true
          });
        
        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          uploadResults.push({
            index: i,
            mapping: mapping,
            success: false,
            error: uploadError.message
          });
          continue;
        }
        
        // Get public URL
        const { data: { publicUrl } } = db.supabaseAdmin.storage
          .from(bucketName)
          .getPublicUrl(filePath);
        
        SecurityUtils.safeLog('info', 'Image uploaded successfully', {
          mappingType: mapping.type,
          publicUrl: publicUrl
        });
        
        uploadResults.push({
          index: i,
          mapping: mapping,
          success: true,
          url: publicUrl
        });
        
      } catch (error) {
        SecurityUtils.safeLog('error', 'Error uploading image', {
          imageIndex: i,
          error: error
        });
        uploadResults.push({
          index: i,
          mapping: mapping,
          success: false,
          error: error.message
        });
      }
    }
    
    SecurityUtils.safeLog('info', 'Bulk image upload completed', {
      successCount: uploadResults.filter(r => r.success).length,
      totalCount: uploadResults.length
    });
    
    res.json({
      success: true,
      results: uploadResults
    });
    
  } catch (error) {
    console.error('Error in bulk image upload:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Bulk create questions for a question set
router.post('/bulk', RateLimitMiddleware.createQuizLimit(), AuthMiddleware.authenticateToken, async (req, res) => {
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
      explanation_title: q.explanation_title?.trim() || '',
      explanation_text: q.explanation_text?.trim() || q.explanation?.trim() || '',
      explanation_image_url: q.explanation_image_url || null,
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
    res.status(201).json({ 
      success: true,
      questions: insertedQuestions 
    });
  } catch (error) {
    console.error('Error in bulk question creation:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Bulk update questions
router.put('/bulk', RateLimitMiddleware.createQuizLimit(), AuthMiddleware.authenticateToken, async (req, res) => {
  logger.debug('🔥 BULK UPDATE ENDPOINT HIT');
  logger.debug('Request body:', JSON.stringify(req.body, null, 2));
  logger.debug('User from auth:', req.user);
  logger.debug('User token present:', !!req.userToken);
  
  try {
    const { question_set_id, questions } = req.body;
    
    if (!question_set_id || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ 
        success: false,
        error: 'Question set ID and questions array are required' 
      });
    }
    
    logger.debug('Bulk update request received:', {
      question_set_id,
      questionsCount: questions.length,
      userToken: req.userToken ? 'present' : 'missing'
    });
    
    // Create user-scoped Supabase client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);
    
    // Verify the user owns the question set - RLS will handle this
    const { data: questionSet, error: verifyError } = await userSupabase
      .from('question_sets')
      .select('id')
      .eq('id', question_set_id)
      .single();
    
    if (verifyError || !questionSet) {
      console.error('Question set verification failed:', {
        question_set_id,
        verifyError: verifyError?.message || verifyError,
        questionSet
      });
      return res.status(403).json({ 
        success: false,
        error: 'Question set not found or unauthorized' 
      });
    }
    
    SecurityUtils.safeLog('info', 'Starting bulk update for questions in set', {
      questionCount: questions.length,
      questionSetId: question_set_id
    });
    
    // Use database transaction to ensure atomicity
    const updatedQuestions = [];
    const createdQuestions = [];
    const errors = [];
    
    // STEP 1: Handle order conflicts by temporarily setting all existing questions to high order_index values
    // This prevents unique constraint violations during bulk updates (database has CHECK constraint order_index >= 0)
    
    // Helper function to check if an ID is a valid UUID (backend ID)
    const isValidUUID = (id) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return typeof id === 'string' && uuidRegex.test(id);
    };
    
    // First, get all existing questions from the database for this question set
    const { data: existingDbQuestions, error: getExistingError } = await userSupabase
      .from('questions')
      .select('id')
      .eq('question_set_id', question_set_id);
    
    if (getExistingError) {
      console.error('Error fetching existing questions:', getExistingError);
      return res.status(500).json({
        success: false,
        error: `Failed to fetch existing questions: ${getExistingError.message}`
      });
    }
    
    const existingDbQuestionIds = (existingDbQuestions || []).map(q => q.id);
    console.log('Existing questions in database:', existingDbQuestionIds);
    
    // Only set temporary indices for questions that actually exist in the database
    if (existingDbQuestionIds.length > 0) {
      console.log('Temporarily setting high order indices for existing questions to avoid conflicts...');
      
      for (let i = 0; i < existingDbQuestionIds.length; i++) {
        const tempOrderIndex = 10000 + i; // Use large positive numbers to avoid conflicts (well above normal range)
        
        const { error: tempOrderError } = await userSupabase
          .from('questions')
          .update({ order_index: tempOrderIndex })
          .eq('id', existingDbQuestionIds[i]);
        
        if (tempOrderError) {
          console.error('Error setting temporary order index:', tempOrderError);
          return res.status(500).json({
            success: false,
            error: `Failed to prepare questions for reordering: ${tempOrderError.message}`
          });
        }
      }
      console.log(`Set temporary high indices for ${existingDbQuestionIds.length} existing questions`);
    } else {
      console.log('No existing questions found in database, skipping temporary index step');
    }
    
    // STEP 2: Process each question
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      
      try {
        // Determine if this is a new question - check if we have a valid backend UUID
        const backendId = question.backend_id || question.id;
        const isNewQuestion = !backendId || !isValidUUID(backendId) || String(backendId).startsWith('temp_');
        
        console.log(`Processing question ${i}: ID=${backendId}, isNew=${isNewQuestion}, targetQuestionSet=${question_set_id}`);
        
        if (isNewQuestion) {
          // Create new question
          const questionData = {
            question_set_id,
            question_text: question.text?.trim() || question.question_text?.trim(),
            question_type: question.question_type || question.type || 'multiple_choice',
            image_url: question.image_url || question.image || null,
            time_limit: question.timeLimit || question.time_limit || 10,
            points: question.points || 100,
            difficulty: question.difficulty || 'medium',
            explanation_title: question.explanation_title?.trim() || '',
            explanation_text: question.explanation_text?.trim() || question.explanation?.trim() || '',
            explanation_image_url: question.explanation_image_url || null,
            order_index: i // Use array index as order
          };
          
          // Filter out blob URLs from question image
          if (questionData.image_url && (questionData.image_url.startsWith('blob:') || questionData.image_url.includes('localhost'))) {
            console.log('Filtering out blob URL from question image:', questionData.image_url);
            questionData.image_url = null;
          }
          
          console.log('Creating question with data:', questionData);
          
          const { data: newQuestion, error: createError } = await userSupabase
            .from('questions')
            .insert(questionData)
            .select()
            .single();
          
          if (createError) {
            console.error('Error creating question:', createError);
            errors.push({ index: i, error: createError.message });
            continue;
          }
          
          console.log('Question created:', newQuestion.id, 'for question set:', question_set_id);
          createdQuestions.push(newQuestion);
          
          // Handle answers for new question
          if (question.answers && Array.isArray(question.answers)) {
            for (let j = 0; j < question.answers.length; j++) {
              const answer = question.answers[j];
              
              // Helper function to check if URL is a blob URL that needs to be filtered out
              const isBlobUrl = (url) => {
                return url && (url.startsWith('blob:') || url.includes('localhost'));
              };
              
              const originalImageUrl = answer.image_url || answer.image;
              const filteredImageUrl = (answer.image_url && !isBlobUrl(answer.image_url)) ? answer.image_url : 
                                     (answer.image && !isBlobUrl(answer.image)) ? answer.image : null;
              
              if (originalImageUrl && filteredImageUrl === null) {
                console.log(`🚫 Filtered out blob URL from answer ${j}:`, originalImageUrl);
              }
              
              const answerData = {
                question_id: newQuestion.id,
                answer_text: answer.text?.trim() || '',
                is_correct: answer.isCorrect || false,
                order_index: j,
                answer_explanation: answer.answer_explanation?.trim() || '',
                // Filter out blob URLs - only store actual Supabase storage URLs
                image_url: filteredImageUrl
              };
              
              console.log('Creating answer with data:', answerData);
              
              const { data: newAnswer, error: answerError } = await userSupabase
                .from('answers')
                .insert(answerData)
                .select()
                .single();
              
              if (answerError) {
                console.error('Error creating answer:', answerError);
                errors.push({ index: i, answerIndex: j, error: answerError.message });
              } else {
                console.log('Answer created:', newAnswer.id, 'for question:', newQuestion.id);
              }
            }
          }
          
        } else {
          // Update existing question
          const questionId = question.backend_id || question.id;
          
          // CRITICAL: Verify the question belongs to the target question set
          const { data: existingQuestion, error: verifyError } = await userSupabase
            .from('questions')
            .select('id, question_set_id')
            .eq('id', questionId)
            .single();
          
          if (verifyError || !existingQuestion) {
            console.error(`❌ Question ${questionId} not found or unauthorized`);
            errors.push({ index: i, error: `Question ${questionId} not found or unauthorized` });
            continue;
          }
          
          // Check if question belongs to the target question set
          if (existingQuestion.question_set_id !== question_set_id) {
            console.error(`❌ CRITICAL: Question ${questionId} belongs to question set ${existingQuestion.question_set_id}, not ${question_set_id}`);
            console.error(`🚨 This prevents cross-question-set updates and data corruption`);
            errors.push({ 
              index: i, 
              error: `Question ${questionId} belongs to a different question set. Cannot update across question sets.` 
            });
            continue;
          }
          
          console.log(`✅ Question ${questionId} ownership verified for question set ${question_set_id}`);
          
          const questionData = {
            question_text: question.text?.trim() || question.question_text?.trim(),
            question_type: question.question_type || question.type || 'multiple_choice',
            image_url: question.image_url || question.image || null,
            time_limit: question.timeLimit || question.time_limit || 10,
            points: question.points || 100,
            difficulty: question.difficulty || 'medium',
            explanation_title: question.explanation_title?.trim() || '',
            explanation_text: question.explanation_text?.trim() || question.explanation?.trim() || '',
            explanation_image_url: question.explanation_image_url || null,
            order_index: i // Use array index as order
          };
          
          // Filter out blob URLs from question image
          if (questionData.image_url && (questionData.image_url.startsWith('blob:') || questionData.image_url.includes('localhost'))) {
            console.log('Filtering out blob URL from question image:', questionData.image_url);
            questionData.image_url = null;
          }
          
          console.log('Updating question:', questionId, 'with data:', questionData);
          
          const { data: updatedQuestion, error: updateError } = await userSupabase
            .from('questions')
            .update(questionData)
            .eq('id', questionId)
            .select()
            .single();
          
          if (updateError) {
            console.error('Error updating question:', updateError);
            errors.push({ index: i, error: updateError.message });
            continue;
          }
          
          console.log('Question updated:', updatedQuestion.id);
          updatedQuestions.push(updatedQuestion);
          
          // Handle answers for existing question - smart update instead of delete/recreate
          if (question.answers && Array.isArray(question.answers)) {
            // First, get existing answers with their details and verify they belong to this question
            const { data: existingAnswers, error: getAnswersError } = await userSupabase
              .from('answers')
              .select('id, answer_text, is_correct, order_index, answer_explanation, image_url, question_id')
              .eq('question_id', questionId)
              .order('order_index', { ascending: true });
            
            if (getAnswersError) {
              console.error('Error fetching existing answers:', getAnswersError);
              errors.push({ index: i, error: `Failed to fetch existing answers: ${getAnswersError.message}` });
              continue;
            }
            
            // Verify all existing answers belong to the correct question (additional safety check)
            if (existingAnswers) {
              const orphanedAnswers = existingAnswers.filter(ans => ans.question_id !== questionId);
              if (orphanedAnswers.length > 0) {
                console.error(`❌ Found ${orphanedAnswers.length} orphaned answers not belonging to question ${questionId}`);
                errors.push({ index: i, error: `Data integrity issue: orphaned answers detected` });
                continue;
              }
            }
            
            console.log(`📋 Found ${existingAnswers?.length || 0} existing answers for question: ${questionId}`);
            
            const newAnswers = question.answers;
            const toUpdate = [];
            const toCreate = [];
            const toDelete = [];
            
            // Compare existing vs new answers
            for (let j = 0; j < newAnswers.length; j++) {
              const newAnswer = newAnswers[j];
              const existingAnswer = existingAnswers?.[j]; // Match by order index
              
              // Helper function to check if URL is a blob URL that needs to be filtered out
              const isBlobUrl = (url) => {
                return url && (url.startsWith('blob:') || url.includes('localhost'));
              };
              
              const filteredImageUrl = (newAnswer.image_url && !isBlobUrl(newAnswer.image_url)) ? newAnswer.image_url : 
                                     (newAnswer.image && !isBlobUrl(newAnswer.image)) ? newAnswer.image : null;
              
              const answerData = {
                answer_text: newAnswer.text?.trim() || '',
                is_correct: newAnswer.isCorrect || false,
                order_index: j,
                answer_explanation: newAnswer.answer_explanation?.trim() || '',
                image_url: filteredImageUrl
              };
              
              if (existingAnswer) {
                // Check if answer needs updating (compare all fields)
                const needsUpdate = 
                  existingAnswer.answer_text !== answerData.answer_text ||
                  existingAnswer.is_correct !== answerData.is_correct ||
                  existingAnswer.order_index !== answerData.order_index ||
                  existingAnswer.answer_explanation !== answerData.answer_explanation ||
                  existingAnswer.image_url !== answerData.image_url;
                
                if (needsUpdate) {
                  toUpdate.push({
                    id: existingAnswer.id,
                    data: answerData,
                    index: j
                  });
                  console.log(`🔄 Answer ${j} needs update for question: ${questionId}`);
                } else {
                  console.log(`✅ Answer ${j} unchanged for question: ${questionId}`);
                }
              } else {
                // New answer to create
                toCreate.push({
                  data: { ...answerData, question_id: questionId },
                  index: j
                });
                console.log(`➕ New answer ${j} to create for question: ${questionId}`);
              }
            }
            
            // Mark extra existing answers for deletion
            if (existingAnswers && existingAnswers.length > newAnswers.length) {
              for (let k = newAnswers.length; k < existingAnswers.length; k++) {
                toDelete.push(existingAnswers[k].id);
                console.log(`🗑️ Extra answer ${k} to delete for question: ${questionId}`);
              }
            }
            
            // Execute updates
            for (const update of toUpdate) {
              console.log(`🔄 Updating answer ${update.index} for question: ${questionId}`);
              const { error: updateError } = await userSupabase
                .from('answers')
                .update(update.data)
                .eq('id', update.id);
              
              if (updateError) {
                console.error('❌ Error updating answer:', updateError);
                errors.push({ index: i, answerIndex: update.index, error: updateError.message });
              } else {
                console.log(`✅ Answer ${update.index} updated successfully`);
              }
            }
            
            // Execute creations
            for (const creation of toCreate) {
              console.log(`➕ Creating answer ${creation.index} for question: ${questionId}`);
              const { data: newAnswer, error: createError } = await userSupabase
                .from('answers')
                .insert(creation.data)
                .select()
                .single();
              
              if (createError) {
                console.error('❌ Error creating answer:', createError);
                errors.push({ index: i, answerIndex: creation.index, error: createError.message });
              } else {
                console.log(`✅ Answer created: ${newAnswer.id} for question: ${questionId}`);
              }
            }
            
            // Execute deletions
            for (const deleteId of toDelete) {
              console.log(`🗑️ Deleting extra answer: ${deleteId}`);
              const { error: deleteError } = await userSupabase
                .from('answers')
                .delete()
                .eq('id', deleteId);
              
              if (deleteError) {
                console.error('❌ Error deleting answer:', deleteError);
                // Try with admin client as fallback
                const { error: adminDeleteError } = await db.supabaseAdmin
                  .from('answers')
                  .delete()
                  .eq('id', deleteId);
                
                if (adminDeleteError) {
                  console.error('❌ Admin deletion also failed:', adminDeleteError);
                  errors.push({ index: i, error: `Failed to delete answer: ${deleteError.message}` });
                } else {
                  console.log(`✅ Answer deleted successfully using admin client: ${deleteId}`);
                }
              } else {
                console.log(`✅ Answer deleted successfully: ${deleteId}`);
              }
            }
            
            console.log(`🎯 Answer operation summary for question ${questionId}: ${toUpdate.length} updated, ${toCreate.length} created, ${toDelete.length} deleted`);
          }
        }
      } catch (questionError) {
        console.error(`Error processing question ${i}:`, questionError);
        errors.push({ index: i, error: questionError.message });
      }
    }
    
    // STEP 3: Final pass to ensure all questions have correct sequential order indices
    // This handles any remaining order conflicts and ensures clean sequential ordering
    console.log('Performing final order index cleanup...');
    
    // Get all questions in the set (including newly created ones)
    const { data: allQuestionsInSet, error: getAllError } = await userSupabase
      .from('questions')
      .select('id')
      .eq('question_set_id', question_set_id)
      .order('order_index', { ascending: true });
    
    if (getAllError) {
      console.error('Error getting all questions for final ordering:', getAllError);
      // Continue anyway, don't fail the entire operation
    } else {
      // Update each question with sequential order starting from 0
      for (let i = 0; i < allQuestionsInSet.length; i++) {
        const { error: finalOrderError } = await userSupabase
          .from('questions')
          .update({ order_index: i })
          .eq('id', allQuestionsInSet[i].id);
        
        if (finalOrderError) {
          console.error(`Error setting final order ${i} for question ${allQuestionsInSet[i].id}:`, finalOrderError);
          // Continue with other questions
        }
      }
      console.log(`Final order cleanup completed for ${allQuestionsInSet.length} questions`);
    }
    
    // Return results
    const allQuestions = [...updatedQuestions, ...createdQuestions];
    
    console.log(`Bulk update completed: ${createdQuestions.length} created, ${updatedQuestions.length} updated, ${errors.length} errors`);
    
    if (errors.length > 0) {
      console.error('Bulk update errors:', errors);
      return res.status(207).json({ // 207 Multi-Status for partial success
        success: false,
        questions: allQuestions,
        errors: errors,
        message: `Partial success: processed ${allQuestions.length}/${questions.length} questions`
      });
    }
    
    res.json({ 
      success: true,
      questions: allQuestions,
      created: createdQuestions.length,
      updated: updatedQuestions.length
    });
    
  } catch (error) {
    console.error('Error in bulk question update:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Reorder questions in a question set
router.put('/set/:id/reorder', RateLimitMiddleware.createModerateLimit(), AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { questionOrder } = req.body; // Array of question IDs in desired order
    
    // Create user-scoped Supabase client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);
    
    // Verify user owns the question set
    const { data: questionSet, error: setError } = await userSupabase
      .from('question_sets')
      .select('id, user_id')
      .eq('id', id)
      .single();
    
    if (setError || !questionSet || questionSet.user_id !== req.userId) {
      return res.status(403).json({ 
        success: false,
        error: 'Question set not found or unauthorized' 
      });
    }
    
    // Validate that all provided question IDs belong to this question set
    const { data: existingQuestions, error: questionsError } = await userSupabase
      .from('questions')
      .select('id')
      .eq('question_set_id', id);
    
    if (questionsError) {
      return res.status(500).json({ 
        success: false,
        error: questionsError.message 
      });
    }
    
    const existingIds = existingQuestions.map(q => q.id);
    const allValid = questionOrder.every(qId => existingIds.includes(qId));
    
    if (!allValid || questionOrder.length !== existingQuestions.length) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid question order data' 
      });
    }
    
    // Transform the questionOrder array to match the expected format
    const questionOrders = questionOrder.map((questionId, index) => ({
      questionId,
      order: index
    }));

    // Use the OrderManager to perform the batch reorder
    const result = await orderManager.reorderQuestions(userSupabase, id, questionOrders);
    
    if (!result.success) {
      return res.status(500).json({ 
        success: false,
        error: result.error 
      });
    }
    
    res.json({ 
      success: true,
      data: result.data 
    });
    
  } catch (error) {
    console.error('Error reordering questions:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// NOW the parameterized routes that might conflict

// Create a new question
router.post('/', RateLimitMiddleware.createQuizLimit(), AuthMiddleware.authenticateToken, async (req, res) => {
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
    res.status(201).json({
      success: true,
      question: question
    });
  } catch (error) {
    console.error('Error in question creation:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Update a question
router.put('/:id', RateLimitMiddleware.createQuizLimit(), AuthMiddleware.authenticateToken, async (req, res) => {
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
    res.json({
      success: true,
      question: updatedQuestion
    });
  } catch (error) {
    console.error('Error in question update:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Delete a question
router.delete('/:id', RateLimitMiddleware.createStrictLimit(), AuthMiddleware.authenticateToken, async (req, res) => {
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

// Upload image for a question
router.post('/:id/upload-image', RateLimitMiddleware.createUploadLimit(), AuthMiddleware.authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Uploading question image for question:', id);
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No image file provided' 
      });
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
      return res.status(403).json({ 
        success: false,
        error: 'Question not found or unauthorized' 
      });
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
      return res.status(500).json({ 
        success: false,
        error: 'Failed to upload image' 
      });
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
      return res.status(500).json({ 
        success: false,
        error: updateError.message 
      });
    }
    
    console.log('Question image uploaded successfully:', publicUrl);
    
    res.json({
      success: true,
      question: updatedQuestion,
      image_url: publicUrl
    });
    
  } catch (error) {
    console.error('Error uploading question image:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Delete image for a question
router.delete('/:id/image', RateLimitMiddleware.createModerateLimit(), AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Create user-scoped Supabase client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);
    
    // Get question with image info - RLS will handle ownership verification
    const { data: questionData, error: questionError } = await userSupabase
      .from('questions')
      .select(`
        id,
        image_url
      `)
      .eq('id', id)
      .single();
    
    if (questionError || !questionData) {
      return res.status(403).json({ 
        success: false,
        error: 'Question not found or unauthorized' 
      });
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
    
    // Update question to remove image references using user-scoped client
    const { data: updatedQuestion, error: updateError } = await userSupabase
      .from('questions')
      .update({
        image_url: null
      })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error removing question image references:', updateError);
      return res.status(500).json({ 
        success: false,
        error: updateError.message 
      });
    }
    
    res.json({ 
      success: true,
      question: updatedQuestion 
    });
    
  } catch (error) {
    console.error('Error deleting question image:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Delete explanation image for a question
router.delete('/:id/explanation-image', RateLimitMiddleware.createModerateLimit(), deleteImageLimiter, AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Create user-scoped Supabase client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);
    
    // Get question with explanation image info - RLS will handle ownership verification
    const { data: questionData, error: questionError } = await userSupabase
      .from('questions')
      .select(`
        id,
        explanation_image_url
      `)
      .eq('id', id)
      .single();
    
    if (questionError || !questionData) {
      return res.status(403).json({ 
        success: false,
        error: 'Question not found or unauthorized' 
      });
    }
    
    // Delete from storage if URL exists
    if (questionData.explanation_image_url) {
      // Extract the file path from the URL
      // Supabase storage URLs are like: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
      const urlParts = questionData.explanation_image_url.split('/');
      const bucketIndex = urlParts.findIndex(part => part === 'public');
      if (bucketIndex !== -1 && bucketIndex + 2 < urlParts.length) {
        const filePath = urlParts.slice(bucketIndex + 2).join('/');
        const { error: deleteError } = await db.supabaseAdmin.storage
          .from(process.env.STORAGE_BUCKET_EXPLANATION_IMAGES || 'explanation-images')
          .remove([filePath]);
        
        if (deleteError) {
          console.error('Storage delete error:', deleteError);
        }
      }
    }
    
    // Update question to remove explanation image references using user-scoped client
    const { data: updatedQuestion, error: updateError } = await userSupabase
      .from('questions')
      .update({
        explanation_image_url: null
      })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error removing question explanation image references:', updateError);
      return res.status(500).json({ 
        success: false,
        error: updateError.message 
      });
    }
    
    res.json({ 
      success: true,
      question: updatedQuestion 
    });
    
  } catch (error) {
    console.error('Error deleting question explanation image:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;
