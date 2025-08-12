import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { FaExclamationTriangle, FaEye, FaEyeSlash, FaEnvelope, FaLock, FaArrowLeft } from 'react-icons/fa';
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
    <div className="auth tuiz-animate-entrance">
      <div className="auth__container tuiz-animate-entrance">
        {/* Header */}
        <div className="auth__header tuiz-animate-entrance">
          <h1 className="auth__title tuiz-animate-continuous">TUIZ情報王</h1>
          <h2 className="auth__subtitle">ホストログイン</h2>
          <p className="auth__description">
            クイズを作成・管理するためにログインしてください
          </p>
        </div>

        {/* Login Form */}
        <form className="auth__form tuiz-animate-entrance" onSubmit={handleSubmit}>
          {/* General Error */}
          {errors.general && (
            <div className="auth__error-message tuiz-animate-entrance">
              <span className="auth__error-icon tuiz-animate-continuous">
                <FaExclamationTriangle />
              </span>
              {errors.general}
            </div>
          )}

          {/* Email/Name Input */}
          <div className="auth__input-group tuiz-animate-entrance">
            <label htmlFor="emailOrName" className="auth__label">
              <FaEnvelope className="auth__label-icon auth__label-icon--email tuiz-animate-continuous" />
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
                onFocus={() => handleInputFocus(emailInputRef)}
                disabled={loading}
                autoComplete="username"
              />
            </div>
            {errors.emailOrName && (
              <span className="auth__field-error">{errors.emailOrName}</span>
            )}
          </div>

          {/* Password Input */}
          <div className="auth__input-group tuiz-animate-entrance" ref={passwordGroupRef}>
            <label htmlFor="password" className="auth__label">
              <FaLock className="auth__label-icon auth__label-icon--lock tuiz-animate-continuous" />
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
                onFocus={() => handleInputFocus(passwordInputRef, passwordGroupRef)}
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
            className={`auth__button auth__button--login ${loading ? 'auth__button--loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="auth__loading-spinner"></span>
                ログイン中...
              </>
            ) : (
              'ログイン'
            )}
          </button>

          {/* Register Link */}
          <div className="auth__links">
            <p className="auth__links-text">
              アカウントをお持ちでない方は{' '}
              <Link to="/register" className="auth__link">
                新規登録
              </Link>
            </p>
          </div>
        </form>

        {/* Back to Home */}
        <div className="auth__footer">
          <Link to="/" className="auth__back-link">
            <FaArrowLeft className="auth__back-icon" />
            ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
