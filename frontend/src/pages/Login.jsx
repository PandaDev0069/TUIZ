import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { FaExclamationTriangle, FaEye, FaEyeSlash, FaEnvelope, FaLock, FaArrowLeft } from 'react-icons/fa';
import '../utils/AnimationController'; // Ensure AnimationController is loaded
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
  
  // Refs for input elements
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Force animation initialization immediately
  useEffect(() => {
    // Ensure AnimationController is available and initialize animations
    if (window.tuizAnimations) {
      window.tuizAnimations.initializePageAnimations();
    }
    
    // Add ready class after a brief delay to prevent flash
    const timer = setTimeout(() => {
      const authElement = document.querySelector('.auth');
      if (authElement) {
        authElement.classList.add('tuiz-animations-ready');
      }
    }, 50); // Very short delay to ensure CSS is loaded
    
    return () => clearTimeout(timer);
  }, []);

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
      // Close mobile keyboard
      e.target.blur();
      
      // Small delay to allow keyboard to close
      setTimeout(() => {
        handleSubmit(e);
      }, 100);
    }
  };

  return (
    <div className="auth tuiz-animate-fade-in">
      <div className="auth__container tuiz-animate-scale-in tuiz-animate-stagger-1">
        {/* Header */}
        <div className="auth__header tuiz-animate-fade-in-down tuiz-animate-stagger-2">
          <h1 className="auth__title tuiz-animate-float">TUIZ情報王</h1>
          <h2 className="auth__subtitle tuiz-animate-fade-in tuiz-animate-stagger-3">ホストログイン</h2>
          <p className="auth__description tuiz-animate-fade-in tuiz-animate-stagger-4">
            クイズを作成・管理するためにログインしてください
          </p>
        </div>

        {/* Login Form */}
        <form className="auth__form tuiz-animate-fade-in-up tuiz-animate-stagger-5" onSubmit={handleSubmit}>
          {/* General Error */}
          {errors.general && (
            <div className="auth__error-message tuiz-animate-slide-in-up">
              <span className="auth__error-icon tuiz-animate-pulse">
                <FaExclamationTriangle />
              </span>
              {errors.general}
            </div>
          )}

          {/* Email/Name Input */}
          <div className="auth__input-group tuiz-animate-slide-in-up tuiz-animate-stagger-1">
            <label htmlFor="emailOrName" className="auth__label">
              <FaEnvelope className="auth__label-icon auth__label-icon--email tuiz-animate-breathe" />
              メールアドレス
            </label>
            <div className="auth__input-wrapper">
              <input
                ref={emailInputRef}
                type="text"
                id="emailOrName"
                name="emailOrName"
                className={`auth__input ${errors.emailOrName ? 'auth__input--error' : ''}`}
                placeholder="example@email.com"
                value={formData.emailOrName}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                disabled={loading}
                autoComplete="username"
              />
            </div>
            {errors.emailOrName && (
              <span className="auth__field-error">{errors.emailOrName}</span>
            )}
          </div>

          {/* Password Input */}
          <div className="auth__input-group tuiz-animate-slide-in-up tuiz-animate-stagger-2">
            <label htmlFor="password" className="auth__label">
              <FaLock className="auth__label-icon auth__label-icon--lock tuiz-animate-breathe" />
              パスワード
            </label>
            <div className="auth__input-wrapper auth__input-wrapper--has-toggle">
              <input
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                className={`auth__input ${errors.password ? 'auth__input--error' : ''}`}
                placeholder="パスワードを入力"
                value={formData.password}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth__password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                title={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
              >
                <span className="auth__password-toggle-icon">
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </button>
            </div>
            {errors.password && (
              <span className="auth__field-error">{errors.password}</span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`auth__button auth__button--login tuiz-animate-scale-in tuiz-animate-stagger-3 tuiz-hover-lift ${loading ? 'auth__button--loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="auth__loading-spinner tuiz-animate-spin"></span>
                ログイン中...
              </>
            ) : (
              'ログイン'
            )}
          </button>

          {/* Register Link */}
          <div className="auth__links tuiz-animate-fade-in tuiz-animate-stagger-4">
            <p className="auth__links-text">
              アカウントをお持ちでない方は{' '}
              <Link to="/register" className="auth__link tuiz-animate-hover">
                新規登録
              </Link>
            </p>
          </div>
        </form>

        {/* Back to Home */}
        <div className="auth__footer tuiz-animate-fade-in tuiz-animate-stagger-5">
          <Link to="/" className="auth__back-link tuiz-hover-lift">
            <FaArrowLeft className="auth__back-icon tuiz-animate-float" />
            ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
