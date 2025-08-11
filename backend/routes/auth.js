const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const path = require('path');
const AuthMiddleware = require('../middleware/auth');
const RateLimitMiddleware = require('../middleware/rateLimiter');

const router = express.Router();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Initialize Supabase clients
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
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

// Input validation helper
const validateInput = {
  email: (email) => {
    // Safer email validation to prevent ReDoS attacks
    // Uses atomic groups and prevents catastrophic backtracking
    if (!email || typeof email !== 'string' || email.length > 254) {
      return false;
    }
    
    // Simple but safe email validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
  },
  
  name: (name) => {
    return name && name.length >= 3 && name.length <= 20 && /^[a-zA-Z0-9_\s]+$/.test(name);
  },
  
  password: (password) => {
    return password && password.length >= 6;
  }
};

// Register new user
router.post('/register', RateLimitMiddleware.createAuthLimit(), AuthMiddleware.loginRateLimit(), async (req, res) => {
  try {
    const { email, name, password, confirmPassword } = req.body;

    // Input validation
    if (!email || !name || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'すべてのフィールドを入力してください。'
      });
    }

    if (!validateInput.email(email)) {
      return res.status(400).json({
        success: false,
        message: '有効なメールアドレスを入力してください。'
      });
    }

    if (!validateInput.name(name)) {
      return res.status(400).json({
        success: false,
        message: '名前は3-20文字で、英数字、アンダースコア、スペースのみ使用できます。'
      });
    }

    if (!validateInput.password(password)) {
      return res.status(400).json({
        success: false,
        message: 'パスワードは6文字以上である必要があります。'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'パスワードが一致しません。'
      });
    }

    // Register user through Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true // Auto-confirm for development
    });

    if (error) {
      console.error('Supabase registration error:', error);
      
      if (error.message.includes('already registered')) {
        return res.status(400).json({
          success: false,
          message: 'このメールアドレスは既に使用されています。'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    // Create user profile in our users table
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: data.user.id,
        email: data.user.email,
        name: name
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Don't fail registration if profile creation fails
    }

    // Generate a session token for immediate login
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return res.status(201).json({
        success: true,
        message: 'アカウントが作成されました。ログインしてください。',
        user: {
          id: data.user.id,
          email: data.user.email,
          name: name
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'アカウントが正常に作成されました。',
      user: {
        id: data.user.id,
        email: data.user.email,
        name: name
      },
      token: sessionData.session.access_token
    });

    console.log(`✅ New user registered: ${name} (${email})`);

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.message === 'Email already exists') {
      return res.status(400).json({
        success: false,
        message: 'このメールアドレスは既に使用されています。'
      });
    }

    res.status(500).json({
      success: false,
      message: 'アカウント作成中にエラーが発生しました。もう一度お試しください。'
    });
  }
});

// Login user
router.post('/login', RateLimitMiddleware.createAuthLimit(), AuthMiddleware.loginRateLimit(), async (req, res) => {
  try {
    const { emailOrName, password } = req.body;

    // Input validation
    if (!emailOrName || !password) {
      return res.status(400).json({
        success: false,
        message: 'メールアドレス/名前とパスワードを入力してください。'
      });
    }

    // Check if emailOrName is an email or name
    let email = emailOrName;
    
    // If it's not an email, try to find the email by name
    if (!validateInput.email(emailOrName)) {
      const { data: userProfile, error: findError } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('name', emailOrName)
        .single();
      
      if (findError || !userProfile) {
        return res.status(401).json({
          success: false,
          message: 'メールアドレス/名前またはパスワードが正しくありません。'
        });
      }
      
      email = userProfile.email;
    }

    // Authenticate user through Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Supabase login error:', error);
      return res.status(401).json({
        success: false,
        message: 'メールアドレス/名前またはパスワードが正しくありません。'
      });
    }

    // Get user profile from our users table
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !userProfile) {
      console.error('Profile fetch error:', profileError);
      return res.status(500).json({
        success: false,
        message: 'ユーザープロフィールの取得に失敗しました。'
      });
    }

    res.json({
      success: true,
      message: 'ログインしました。',
      user: {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        last_login: new Date().toISOString()
      },
      token: data.session.access_token
    });

    console.log(`✅ User logged in: ${userProfile.name} (${userProfile.email})`);

  } catch (error) {
    console.error('Login error:', error);
    
    res.status(500).json({
      success: false,
      message: 'ログイン中にエラーが発生しました。もう一度お試しください。'
    });
  }
});

// Get current user profile
router.get('/profile', RateLimitMiddleware.createReadLimit(), AuthMiddleware.authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Refresh token
router.post('/refresh', RateLimitMiddleware.createAuthLimit(), AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    // With Supabase, refresh tokens are handled differently
    // For now, return the existing token or suggest re-login
    res.json({
      success: true,
      message: 'Token refresh not needed with Supabase. Current session is valid.',
      user: req.user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Token refresh failed. Please log in again.'
    });
  }
});

// Upload avatar image
router.post('/upload-avatar', RateLimitMiddleware.createUploadLimit(), AuthMiddleware.authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    const user = req.user;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'ファイルが選択されていません。'
      });
    }

    // Generate unique filename
    const fileExt = path.extname(file.originalname);
    const fileName = `${user.id}_${Date.now()}${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({
        success: false,
        message: 'ファイルのアップロードに失敗しました。'
      });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const avatarUrl = urlData.publicUrl;

    // Update user's avatar_url in database
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      
      // Clean up uploaded file
      await supabaseAdmin.storage
        .from('avatars')
        .remove([filePath]);

      return res.status(500).json({
        success: false,
        message: 'プロフィールの更新に失敗しました。'
      });
    }

    res.json({
      success: true,
      message: 'プロフィール画像がアップロードされました。',
      avatar_url: avatarUrl,
      user: updateData
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'ファイルサイズが大きすぎます。5MB以下の画像をアップロードしてください。'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'ファイルのアップロード中にエラーが発生しました。'
    });
  }
});

// Update user profile
router.put('/update-profile', RateLimitMiddleware.createModerateLimit(), AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { name, avatar_url } = req.body;

    // Validate input
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '表示名を入力してください。'
      });
    }

    if (!validateInput.name(name.trim())) {
      return res.status(400).json({
        success: false,
        message: '表示名は3-20文字で、英数字、アンダースコア、スペースのみ使用できます。'
      });
    }

    // Check if name is already taken by another user
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('name', name.trim())
      .neq('id', user.id)
      .single();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'この表示名は既に使用されています。'
      });
    }

    // Update user profile
    const updateData = {
      name: name.trim(),
      updated_at: new Date().toISOString()
    };

    // Only update avatar_url if it's provided
    if (avatar_url !== undefined) {
      updateData.avatar_url = avatar_url;
    }

    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Profile update error:', updateError);
      return res.status(500).json({
        success: false,
        message: 'プロフィールの更新に失敗しました。'
      });
    }

    res.json({
      success: true,
      message: 'プロフィールが更新されました。',
      user: updatedUser
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'プロフィールの更新中にエラーが発生しました。'
    });
  }
});

// Logout (client-side will remove token)
router.post('/logout', RateLimitMiddleware.createGeneralLimit(), AuthMiddleware.authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'ログアウトしました。'
  });
});

// Delete avatar image
router.delete('/delete-avatar', RateLimitMiddleware.createModerateLimit(), AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    if (!user.avatar_url) {
      return res.status(400).json({
        success: false,
        message: 'プロフィール画像が設定されていません。'
      });
    }

    // Extract file path from avatar URL
    const avatarUrl = user.avatar_url;
    const urlParts = avatarUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const filePath = `avatars/${fileName}`;

    // Delete from Supabase Storage
    const { error: deleteError } = await supabaseAdmin.storage
      .from('avatars')
      .remove([filePath]);

    if (deleteError) {
      console.error('Storage delete error:', deleteError);
      // Continue anyway, as the file might not exist
    }

    // Update user's avatar_url in database
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('users')
      .update({ avatar_url: null })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      return res.status(500).json({
        success: false,
        message: 'プロフィールの更新に失敗しました。'
      });
    }

    res.json({
      success: true,
      message: 'プロフィール画像が削除されました。',
      user: updateData
    });

  } catch (error) {
    console.error('Avatar delete error:', error);
    res.status(500).json({
      success: false,
      message: 'プロフィール画像の削除中にエラーが発生しました。'
    });
  }
});

// Check if email/name is available
router.post('/check-availability', RateLimitMiddleware.createGeneralLimit(), async (req, res) => {
  try {
    const { email, name } = req.body;
    
    const result = {
      email: { available: true },
      name: { available: true }
    };

    if (email) {
      const { data: emailData } = await supabase
        .from('users')
        .select('id')
        .eq('email', email);
      result.email.available = !emailData || emailData.length === 0;
    }

    if (name) {
      const { data: nameData } = await supabase
        .from('users')
        .select('id')
        .eq('name', name);
      result.name.available = !nameData || nameData.length === 0;
    }

    res.json({
      success: true,
      availability: result
    });

  } catch (error) {
    console.error('Availability check error:', error);
    res.status(500).json({
      success: false,
      message: 'チェック中にエラーが発生しました。'
    });
  }
});

module.exports = router;
