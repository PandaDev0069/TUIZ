const express = require('express');
const multer = require('multer');
const path = require('path');
const AuthMiddleware = require('../middleware/auth');
const DatabaseManager = require('../config/database');
const logger = require('./utils/logger');

const router = express.Router();
const db = new DatabaseManager();

// Multer configuration for general file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_UPLOAD_SIZE) || 52428800, // 50MB default (increased from 10MB)
    fieldSize: 25 * 1024 * 1024, // 25MB for field data
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// General image upload endpoint with bucket support
router.post('/image', AuthMiddleware.authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Get the bucket from request body (defaults to 'uploads')
    const bucket = req.body.bucket || 'uploads';
    
    // Validate bucket name
    const allowedBuckets = [
      'avatars',
      'quiz-thumbnails', 
      'question-images',
      'answer-images',
      'explanation-images',
      'uploads'
    ];
    
    if (!allowedBuckets.includes(bucket)) {
      return res.status(400).json({ 
        error: 'Invalid bucket specified',
        allowedBuckets 
      });
    }

    // Generate unique filename
    const fileExt = path.extname(req.file.originalname);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${fileExt}`;
    const filePath = `${req.user.id}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await db.supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (error) {
      logger.error('Supabase storage error:', error);
      return res.status(500).json({ 
        error: 'Failed to upload image',
        details: error.message 
      });
    }

    // Get the public URL
    const { data: publicUrlData } = db.supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
      logger.error('Failed to get public URL for uploaded file');
      return res.status(500).json({ error: 'Failed to get image URL' });
    }

    res.json({
      message: 'Image uploaded successfully',
      imageUrl: publicUrlData.publicUrl,
      fileName: fileName,
      filePath: filePath,
      bucket: bucket,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

  } catch (error) {
    logger.error('Error uploading image:', error);
    res.status(500).json({ 
      error: 'Failed to upload image',
      details: error.message 
    });
  }
});

// Delete image endpoint
router.delete('/image', AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const { bucket, filePath } = req.body;

    if (!bucket || !filePath) {
      return res.status(400).json({ 
        error: 'Bucket and filePath are required' 
      });
    }

    // Validate bucket name
    const allowedBuckets = [
      'avatars',
      'quiz-thumbnails', 
      'question-images',
      'answer-images',
      'explanation-images',
      'uploads'
    ];
    
    if (!allowedBuckets.includes(bucket)) {
      return res.status(400).json({ 
        error: 'Invalid bucket specified',
        allowedBuckets 
      });
    }

    // Only allow users to delete their own files
    if (!filePath.startsWith(req.user.id + '/')) {
      return res.status(403).json({ 
        error: 'You can only delete your own files' 
      });
    }

    // Delete from Supabase Storage
    const { error } = await db.supabaseAdmin.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      logger.error('Supabase storage deletion error:', error);
      return res.status(500).json({ 
        error: 'Failed to delete image',
        details: error.message 
      });
    }

    res.json({
      message: 'Image deleted successfully',
      bucket: bucket,
      filePath: filePath
    });

  } catch (error) {
    logger.error('Error deleting image:', error);
    res.status(500).json({ 
      error: 'Failed to delete image',
      details: error.message 
    });
  }
});

module.exports = router;
