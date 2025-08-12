import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { FaExclamationTriangle, FaEye, FaEyeSlash, FaCheckCircle, FaEnvelope, FaUser, FaLock, FaArrowLeft } from 'react-icons/fa';
import './auth.css';

function Register() {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [availability, setAvailability] = useState({});

  const { register, checkAvailability, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Refs for input elements for mobile keyboard handling
  const emailInputRef = useRef(null);
  const nameInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);

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
          const inputRefs = [emailInputRef, nameInputRef, passwordInputRef, confirmPasswordInputRef];
          if (activeElement && inputRefs.some(ref => ref.current === activeElement)) {
            activeElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest'
            });
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
  const handleInputFocus = (inputRef) => {
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.scrollIntoView({
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

    // Check availability for email and name
    if ((name === 'email' || name === 'name') && value.trim()) {
      debouncedAvailabilityCheck(name, value);
    }
  };

  // Debounced availability check
  const debouncedAvailabilityCheck = (() => {
    let timeouts = {};
    return (field, value) => {
      clearTimeout(timeouts[field]);
      timeouts[field] = setTimeout(async () => {
        if (value.trim()) {
          const result = await checkAvailability(
            field === 'email' ? value : null,
            field === 'name' ? value : null
          );
          if (result) {
            setAvailability(prev => ({
              ...prev,
              [field]: result[field]
            }));
          }
        }
      }, 500);
    };
  })();

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'メールアドレスを入力してください';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
    } else if (availability.email && !availability.email.available) {
      newErrors.email = 'このメールアドレスは既に使用されています';
    }

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = '名前を入力してください';
    } else if (formData.name.length < 3 || formData.name.length > 20) {
      newErrors.name = '名前は3-20文字で入力してください';
    } else if (!/^[a-zA-Z0-9_\s]+$/.test(formData.name)) {
      newErrors.name = '名前は英数字、アンダースコア、スペースのみ使用できます';
    } else if (availability.name && !availability.name.available) {
      newErrors.name = 'この名前は既に使用されています';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'パスワードを入力してください';
    } else if (formData.password.length < 6) {
      newErrors.password = 'パスワードは6文字以上で入力してください';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'パスワード確認を入力してください';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'パスワードが一致しません';
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
      const result = await register(
        formData.email,
        formData.name,
        formData.password,
        formData.confirmPassword
      );
      
      if (result.success) {
        // Success! AuthContext will handle the redirect
        console.log('Registration successful');
      } else {
        setErrors({ general: result.message });
      }
    } catch (error) {
      setErrors({ general: 'アカウント作成中にエラーが発生しました。もう一度お試しください。' });
    } finally {
      setLoading(false);
    }
  };

  const getFieldStatus = (field) => {
    if (errors[field]) return 'error';
    if (availability[field]) {
      return availability[field].available ? 'success' : 'error';
    }
    return '';
  };

  return (
    <div className="auth">
      <div className="auth__container">
        {/* Header */}
        <div className="auth__header">
          <h1 className="auth__title">TUIZ情報王</h1>
          <h2 className="auth__subtitle">新規アカウント作成</h2>
          <p className="auth__description">
            クイズ作成・管理のためのアカウントを作成しましょう
          </p>
        </div>

        {/* Register Form */}
        <form className="auth__form" onSubmit={handleSubmit}>
          {/* General Error */}
          {errors.general && (
            <div className="auth__error-message">
              <span className="auth__error-icon">
                <FaExclamationTriangle />
              </span>
              {errors.general}
            </div>
          )}

          {/* Email Input */}
          <div className="auth__input-group">
            <label htmlFor="email" className="auth__label">
              <FaEnvelope className="auth__label-icon auth__label-icon--email" />
              メールアドレス
            </label>
            <div className="auth__input-wrapper">
              <input
                ref={emailInputRef}
                type="email"
                id="email"
                name="email"
                className={`auth__input ${getFieldStatus('email') === 'error' ? 'auth__input--error' : getFieldStatus('email') === 'success' ? 'auth__input--success' : ''}`}
                placeholder="例: user@example.com"
                value={formData.email}
                onChange={handleChange}
                onFocus={() => handleInputFocus(emailInputRef)}
                disabled={loading}
                autoComplete="email"
              />
              {getFieldStatus('email') === 'success' && (
                <span className="auth__validation-icon auth__validation-icon--success">
                  <FaCheckCircle />
                </span>
              )}
            </div>
            {errors.email && (
              <span className="auth__field-error">{errors.email}</span>
            )}
          </div>

          {/* Name Input */}
          <div className="auth__input-group">
            <label htmlFor="name" className="auth__label">
              <FaUser className="auth__label-icon auth__label-icon--user" />
              名前
            </label>
            <div className="auth__input-wrapper">
              <input
                ref={nameInputRef}
                type="text"
                id="name"
                name="name"
                className={`auth__input ${getFieldStatus('name') === 'error' ? 'auth__input--error' : getFieldStatus('name') === 'success' ? 'auth__input--success' : ''}`}
                placeholder="例: 田中太郎"
                value={formData.name}
                onChange={handleChange}
                onFocus={() => handleInputFocus(nameInputRef)}
                disabled={loading}
                autoComplete="name"
              />
              {getFieldStatus('name') === 'success' && (
                <span className="auth__validation-icon auth__validation-icon--success">
                  <FaCheckCircle />
                </span>
              )}
            </div>
            {errors.name && (
              <span className="auth__field-error">{errors.name}</span>
            )}
            <span className="auth__field-hint">3-20文字、英数字とアンダースコアのみ</span>
          </div>

          {/* Password Input */}
          <div className="auth__input-group">
            <label htmlFor="password" className="auth__label">
              <FaLock className="auth__label-icon auth__label-icon--lock" />
              パスワード
            </label>
            <div className="auth__input-wrapper auth__input-wrapper--has-toggle">
              <input
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                className={`auth__input ${errors.password ? 'auth__input--error' : ''}`}
                placeholder="6文字以上のパスワード"
                value={formData.password}
                onChange={handleChange}
                onFocus={() => handleInputFocus(passwordInputRef)}
                disabled={loading}
                autoComplete="new-password"
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

          {/* Confirm Password Input */}
          <div className="auth__input-group">
            <label htmlFor="confirmPassword" className="auth__label">
              <FaLock className="auth__label-icon auth__label-icon--lock" />
              パスワード確認
            </label>
            <div className="auth__input-wrapper auth__input-wrapper--has-toggle">
              <input
                ref={confirmPasswordInputRef}
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                className={`auth__input ${errors.confirmPassword ? 'auth__input--error' : ''}`}
                placeholder="パスワードを再入力"
                value={formData.confirmPassword}
                onChange={handleChange}
                onFocus={() => handleInputFocus(confirmPasswordInputRef)}
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="auth__password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
                title={showConfirmPassword ? 'パスワードを隠す' : 'パスワードを表示'}
              >
                <span className="auth__password-toggle-icon">
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </button>
            </div>
            {errors.confirmPassword && (
              <span className="auth__field-error">{errors.confirmPassword}</span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`auth__button auth__button--register ${loading ? 'auth__button--loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="auth__loading-spinner"></span>
                作成中...
              </>
            ) : (
              'アカウント作成'
            )}
          </button>

          {/* Login Link */}
          <div className="auth__links">
            <p className="auth__links-text">
              既にアカウントをお持ちの方は{' '}
              <Link to="/login" className="auth__link">
                ログイン
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

export default Register;
