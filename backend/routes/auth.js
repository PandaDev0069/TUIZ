const express = require('express');
const DatabaseManager = require('../config/database');
const AuthMiddleware = require('../middleware/auth');

const router = express.Router();
const db = new DatabaseManager();

// Input validation helper
const validateInput = {
  email: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  username: (username) => {
    return username && username.length >= 3 && username.length <= 20 && /^[a-zA-Z0-9_]+$/.test(username);
  },
  
  password: (password) => {
    return password && password.length >= 6;
  }
};

// Register new user
router.post('/register', AuthMiddleware.loginRateLimit(), async (req, res) => {
  try {
    const { email, username, password, confirmPassword } = req.body;

    // Input validation
    if (!email || !username || !password || !confirmPassword) {
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

    if (!validateInput.username(username)) {
      return res.status(400).json({
        success: false,
        message: 'ユーザー名は3-20文字で、英数字とアンダースコアのみ使用できます。'
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

    // Create user
    const result = await db.createUser({
      email,
      username,
      password
    });
    
    if (!result.success) {
      throw new Error(result.error);
    }

    const newUser = result.user;
    
    // Generate token
    const token = AuthMiddleware.generateToken(newUser);

    res.status(201).json({
      success: true,
      message: 'アカウントが正常に作成されました。',
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username || newUser.name
      },
      token
    });

    console.log(`✅ New user registered: ${newUser.username || newUser.name} (${newUser.email})`);

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.message === 'Email or username already exists') {
      return res.status(400).json({
        success: false,
        message: 'このメールアドレスまたはユーザー名は既に使用されています。'
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
    const { emailOrUsername, password } = req.body;

    // Input validation
    if (!emailOrUsername || !password) {
      return res.status(400).json({
        success: false,
        message: 'メールアドレス/ユーザー名とパスワードを入力してください。'
      });
    }

    // Authenticate user
    const result = await db.authenticateUser(emailOrUsername, password);
    
    if (!result.success) {
      throw new Error(result.error);
    }

    const user = result.user;
    
    // Generate token
    const token = AuthMiddleware.generateToken(user);

    res.json({
      success: true,
      message: 'ログインしました。',
      user: {
        id: user.id,
        email: user.email,
        username: user.username || user.name,
        last_login: user.last_active
      },
      token
    });

    console.log(`✅ User logged in: ${user.username || user.name} (${user.email})`);

  } catch (error) {
    console.error('Login error:', error);
    
    if (error.message.includes('Invalid login credentials') || 
        error.message.includes('invalid_credentials') ||
        error.message === 'User not found' || 
        error.message === 'Invalid password') {
      return res.status(401).json({
        success: false,
        message: 'メールアドレス/ユーザー名またはパスワードが正しくありません。'
      });
    }

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
router.post('/refresh', AuthMiddleware.authenticateToken, (req, res) => {
  const newToken = AuthMiddleware.generateToken(req.user);
  
  res.json({
    success: true,
    token: newToken
  });
});

// Logout (client-side will remove token)
router.post('/logout', AuthMiddleware.authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'ログアウトしました。'
  });
});

// Check if email/username is available
router.post('/check-availability', async (req, res) => {
  try {
    const { email, username } = req.body;
    
    const result = {
      email: { available: true },
      username: { available: true }
    };

    if (email) {
      const { data: emailData } = await db.supabase
        .from('users')
        .select('id')
        .eq('email', email);
      result.email.available = !emailData || emailData.length === 0;
    }

    if (username) {
      const { data: usernameData } = await db.supabase
        .from('users')
        .select('id')
        .eq('name', username); // Use 'name' field instead of 'username'
      result.username.available = !usernameData || usernameData.length === 0;
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
