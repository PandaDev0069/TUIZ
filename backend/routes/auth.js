const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const AuthMiddleware = require('../middleware/auth');

const router = express.Router();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Initialize Supabase clients
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Input validation helper
const validateInput = {
  email: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
router.post('/register', AuthMiddleware.loginRateLimit(), async (req, res) => {
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
router.post('/login', AuthMiddleware.loginRateLimit(), async (req, res) => {
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
router.get('/profile', AuthMiddleware.authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Refresh token
router.post('/refresh', AuthMiddleware.authenticateToken, async (req, res) => {
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

// Logout (client-side will remove token)
router.post('/logout', AuthMiddleware.authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'ログアウトしました。'
  });
});

// Check if email/name is available
router.post('/check-availability', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    const result = {
      email: { available: true },
      name: { available: true }
    };

    if (email) {
      const { data: emailData } = await db.supabase
        .from('users')
        .select('id')
        .eq('email', email);
      result.email.available = !emailData || emailData.length === 0;
    }

    if (name) {
      const { data: nameData } = await db.supabase
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
