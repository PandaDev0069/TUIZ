import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import './auth.css';

function Login() {
  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.emailOrUsername.trim()) {
      newErrors.emailOrUsername = 'メールアドレスまたはユーザー名を入力してください';
    }

    if (!formData.password) {
      newErrors.password = 'パスワードを入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      const result = await login(formData.emailOrUsername, formData.password);
      
      if (result.success) {
        // Success! AuthContext will handle the redirect
        console.log('Login successful');
      } else {
        setErrors({ general: result.message });
      }
    } catch (error) {
      setErrors({ general: 'ログイン中にエラーが発生しました。もう一度お試しください。' });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-content">
        {/* Header */}
        <div className="auth-header">
          <h1 className="auth-title">TUIZ情報王</h1>
          <h2 className="auth-subtitle">ホストログイン</h2>
          <p className="auth-description">
            クイズを作成・管理するためにログインしてください
          </p>
        </div>

        {/* Login Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          {/* General Error */}
          {errors.general && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {errors.general}
            </div>
          )}

          {/* Email/Username Input */}
          <div className="input-group">
            <label htmlFor="emailOrUsername" className="input-label">
              メールアドレスまたはユーザー名
            </label>
            <div className="input-wrapper">
              <input
                type="text"
                id="emailOrUsername"
                name="emailOrUsername"
                className={`auth-input ${errors.emailOrUsername ? 'error' : ''}`}
                placeholder="例: user@example.com または username"
                value={formData.emailOrUsername}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                disabled={loading}
                autoComplete="username"
              />
            </div>
            {errors.emailOrUsername && (
              <span className="field-error">{errors.emailOrUsername}</span>
            )}
          </div>

          {/* Password Input */}
          <div className="input-group">
            <label htmlFor="password" className="input-label">
              パスワード
            </label>
            <div className="input-wrapper has-toggle">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                className={`auth-input ${errors.password ? 'error' : ''}`}
                placeholder="パスワードを入力"
                value={formData.password}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                title={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && (
              <span className="field-error">{errors.password}</span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`auth-button login-button ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                ログイン中...
              </>
            ) : (
              'ログイン'
            )}
          </button>

          {/* Register Link */}
          <div className="auth-links">
            <p>
              アカウントをお持ちでない方は{' '}
              <Link to="/register" className="auth-link">
                新規登録
              </Link>
            </p>
          </div>
        </form>

        {/* Back to Home */}
        <div className="auth-footer">
          <Link to="/" className="back-link">
            ← ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
