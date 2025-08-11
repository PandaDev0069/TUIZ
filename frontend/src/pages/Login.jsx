import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { FaExclamationTriangle, FaEye, FaEyeSlash } from 'react-icons/fa';
import './auth.css';

function Login() {
  const [formData, setFormData] = useState({
    emailOrName: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Refs for input elements for mobile keyboard handling
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const passwordGroupRef = useRef(null); // Target the entire input-group instead

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Mobile keyboard handling
  useEffect(() => {
    const handleResize = () => {
      const isKeyboardOpen = window.innerHeight < window.screen.height * 0.75;
      
      if (isKeyboardOpen) {
        setTimeout(() => {
          const activeElement = document.activeElement;
          if (activeElement && activeElement === emailInputRef.current) {
            activeElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest'
            });
          } else if (activeElement && activeElement === passwordInputRef.current) {
            // For password field, scroll the entire input group
            if (passwordGroupRef.current) {
              passwordGroupRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
              });
            }
          }
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
      setTimeout(handleResize, 500);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Handle input focus for mobile keyboard
  const handleInputFocus = (inputRef, groupRef = null) => {
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        // For password field, scroll the entire input group; for others, scroll the input
        const targetElement = groupRef ? groupRef.current : inputRef.current;
        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        }
      }, 300);
    }
  };

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

    if (!formData.emailOrName.trim()) {
      newErrors.emailOrName = 'メールアドレスを入力してください';
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
      const result = await login(formData.emailOrName, formData.password);
      
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
      // Close mobile keyboard and scroll to button
      e.target.blur();
      
      // Small delay to allow keyboard to close
      setTimeout(() => {
        handleSubmit(e);
      }, 100);
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
              <span className="error-icon">
                <FaExclamationTriangle />
              </span>
              {errors.general}
            </div>
          )}

          {/* Email/Name Input */}
          <div className="input-group">
            <label htmlFor="emailOrName" className="input-label">
              メールアドレス(例: TUIZ@example.com)
            </label>
            <div className="input-wrapper">
              <input
                ref={emailInputRef}
                type="text"
                id="emailOrName"
                name="emailOrName"
                className={`auth-input ${errors.emailOrName ? 'error' : ''}`}
                placeholder="example@email.com"
                value={formData.emailOrName}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                onFocus={() => handleInputFocus(emailInputRef)}
                disabled={loading}
                autoComplete="username"
              />
            </div>
            {errors.emailOrName && (
              <span className="field-error">{errors.emailOrName}</span>
            )}
          </div>

          {/* Password Input */}
          <div className="input-group" ref={passwordGroupRef}>
            <label htmlFor="password" className="input-label">
              パスワード
            </label>
            <div className="input-wrapper has-toggle">
              <input
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                className={`auth-input ${errors.password ? 'error' : ''}`}
                placeholder="パスワードを入力"
                value={formData.password}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                onFocus={() => handleInputFocus(passwordInputRef, passwordGroupRef)}
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
                {showPassword ? <FaEyeSlash /> : <FaEye />}
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
