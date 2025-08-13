import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useConfirmation } from '../hooks/useConfirmation';
import ConfirmationModal from './ConfirmationModal';
import { apiConfig } from '../utils/apiConfig';
import { useTimerManager } from '../utils/timerManager';
import {
  FaCheck,
  FaTimes,
  FaInfoCircle,
  FaUser,
  FaFolderOpen,
  FaSave,
  FaTrash,
  FaClock,
  FaUpload
} from 'react-icons/fa';
import './profileSettingsModal.css';

const ProfileSettingsModal = ({ isOpen, onClose, onProfileUpdated }) => {
  const { user, apiCall, refreshUser } = useAuth();
  const { showConfirmation, confirmationProps } = useConfirmation();
  const timerManager = useTimerManager();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    avatar_url: user?.avatar_url || ''
  });
  const [preview, setPreview] = useState(user?.avatar_url || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);
  const nameInputRef = useRef(null);
  const dialogRef = useRef(null);

  // Update form data and preview when user data changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        avatar_url: user.avatar_url || ''
      });
      setPreview(user.avatar_url || '');
    }
  }, [user]);

  // Helper function to show messages
  const showMessage = (type, text) => {
    setMessage({ type, text });
    timerManager.setTimeout(() => {
      setMessage({ type: '', text: '' });
    }, 5000); // Clear message after 5 seconds
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showMessage('error', 'サポートされていないファイル形式です。JPEG、PNG、またはWebP形式の画像をアップロードしてください。');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      showMessage('error', 'ファイルサイズが大きすぎます。5MB以下の画像をアップロードしてください。');
      return;
    }

    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadingImage(true);
      
      // Create FormData for file upload
      const uploadFormData = new FormData();
      uploadFormData.append('avatar', selectedFile);
      uploadFormData.append('userId', user.id);

      // Upload image
      const response = await fetch(apiConfig.getApiUrl('/auth/upload-avatar'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('tuiz_token')}`
        },
        body: uploadFormData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'アップロードに失敗しました');
      }

      const data = await response.json();
      
      // Update form data with new avatar URL
      setFormData(prev => ({
        ...prev,
        avatar_url: data.avatar_url
      }));
      
      // Refresh user data from server to get updated avatar
      await refreshUser();
      
      // Notify parent component of profile update
      if (onProfileUpdated) {
        onProfileUpdated();
      }
      
      // Clear selected file
      setSelectedFile(null);
      
      showMessage('success', 'プロフィール画像がアップロードされました！');
    } catch (error) {
      console.error('Image upload error:', error);
      showMessage('error', '画像のアップロードに失敗しました: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // Accessibility: focus the dialog and then the first input when opened
  useEffect(() => {
    if (isOpen) {
      // Focus dialog for immediate keyboard access
      dialogRef.current?.focus();
      // Then focus name input slightly later to avoid scroll jumps
      const t = setTimeout(() => nameInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);

      // Update profile
      const response = await apiCall('/auth/update-profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: formData.name,
          avatar_url: formData.avatar_url
        })
      });

      // Refresh user data from server
      await refreshUser();
      
      // Notify parent component of profile update
      if (onProfileUpdated) {
        onProfileUpdated();
      }
      
      showMessage('success', 'プロフィールが更新されました！');
      onClose();
    } catch (error) {
      console.error('Profile update error:', error);
      showMessage('error', 'プロフィールの更新に失敗しました: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!user?.avatar_url) {
      // If there's no saved avatar, just clear the local preview
      setPreview('');
      setSelectedFile(null);
      setFormData(prev => ({
        ...prev,
        avatar_url: ''
      }));
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    try {
      const confirmed = await showConfirmation({
        title: 'プロフィール画像を削除',
        message: 'プロフィール画像を削除しますか？この操作は取り消せません。',
        confirmText: '削除する',
        cancelText: 'キャンセル',
        type: 'danger'
      });

      if (!confirmed) return;

      setUploadingImage(true);

      // Call delete avatar endpoint
      await apiCall('/auth/delete-avatar', {
        method: 'DELETE'
      });

      // Refresh user data from server
      await refreshUser();

      // Notify parent component of profile update
      if (onProfileUpdated) {
        onProfileUpdated();
      }

      // Clear local state
      setPreview('');
      setSelectedFile(null);
      setFormData(prev => ({
        ...prev,
        avatar_url: ''
      }));
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      showMessage('success', 'プロフィール画像が削除されました！');
    } catch (error) {
      console.error('Avatar removal error:', error);
      showMessage('error', 'プロフィール画像の削除に失敗しました: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="profile-settings__overlay"
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        role="presentation"
      >
      <div
        className="profile-settings__dialog tuiz-glass-card tuiz-glass-card--medium tuiz-animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-settings-title"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        ref={dialogRef}
      >
        <div className="profile-settings__header">
          <h2 id="profile-settings-title" className="profile-settings__title tuiz-text-gradient">プロフィール設定</h2>
          <button aria-label="閉じる" className="profile-settings__close" onClick={onClose}>×</button>
        </div>

        {/* Message Display */}
        {message.text && (
          <div className={`profile-settings__banner ${message.type ? `profile-settings__banner--${message.type}` : ''} tuiz-animate-fade-in`}>
            <span className="profile-settings__banner-icon">
              {message.type === 'success' ? <FaCheck /> : message.type === 'error' ? <FaTimes /> : <FaInfoCircle />}
            </span>
            <span className="profile-settings__banner-text">{message.text}</span>
            <button
              className="profile-settings__banner-close"
              onClick={() => setMessage({ type: '', text: '' })}
              aria-label="メッセージを閉じる"
            >
              ×
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="profile-settings__form">
          {/* Avatar Section */}
          <div className="profile-settings__section profile-settings__section--avatar">
            <h3 className="profile-settings__section-title">プロフィール画像</h3>
            <div className="profile-settings__avatar-container">
              <div className="profile-settings__avatar-preview">
                {preview ? (
                  <img src={preview} alt="プロフィール画像" className="profile-settings__avatar-image" />
                ) : (
                  <div className="profile-settings__avatar-placeholder">
                    <FaUser className="profile-settings__avatar-icon" />
                  </div>
                )}
              </div>
              
              <div className="profile-settings__avatar-controls">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="profile-settings__file-input"
                  id="avatar-upload"
                />
                <label htmlFor="avatar-upload" className="tuiz-button tuiz-button--secondary profile-settings__button">
                  <FaFolderOpen /> 画像を選択
                </label>
                
                {selectedFile && (
                  <button
                    type="button"
                    onClick={handleImageUpload}
                    disabled={uploadingImage}
                    className="tuiz-button tuiz-button--gradient tuiz-button--sm profile-settings__button"
                  >
                    {uploadingImage ? <><FaClock /> アップロード中...</> : <><FaUpload /> アップロード</>}
                  </button>
                )}
                
                {preview && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    disabled={uploadingImage}
                    className="tuiz-button tuiz-button--danger tuiz-button--sm profile-settings__button"
                  >
                    {uploadingImage ? <><FaClock /> 削除中...</> : <><FaTrash /> 削除</>}
                  </button>
                )}
              </div>
              
              <p className="profile-settings__file-info">
                JPEG, PNG, WebP形式対応 (最大5MB)
              </p>
            </div>
          </div>

          {/* Basic Info Section */}
          <div className="profile-settings__section">
            <h3 className="profile-settings__section-title">基本情報</h3>
            
            <div className="profile-settings__group">
              <label className="profile-settings__label" htmlFor="name">表示名</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                maxLength={100}
                className="profile-settings__input tuiz-input"
                ref={nameInputRef}
              />
            </div>

            <div className="profile-settings__group">
              <label className="profile-settings__label" htmlFor="email">メールアドレス</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                disabled
                className="profile-settings__input tuiz-input"
              />
              <p className="profile-settings__note">メールアドレスは変更できません</p>
            </div>
          </div>

          {/* Account Info Section */}
          <div className="profile-settings__section">
            <h3 className="profile-settings__section-title">アカウント情報</h3>
            <div className="profile-settings__info-grid">
              <div className="profile-settings__info-item">
                <span className="profile-settings__info-label">ユーザーID:</span>
                <span className="profile-settings__info-value">{user?.id}</span>
              </div>
              <div className="profile-settings__info-item">
                <span className="profile-settings__info-label">登録日:</span>
                <span className="profile-settings__info-value">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('ja-JP') : '不明'}
                </span>
              </div>
              <div className="profile-settings__info-item">
                <span className="profile-settings__info-label">役割:</span>
                <span className="profile-settings__info-value">{user?.role || 'user'}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="profile-settings__actions">
            <button
              type="button"
              onClick={onClose}
              className="tuiz-button tuiz-button--secondary"
              disabled={loading}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="tuiz-button tuiz-button--gradient"
              disabled={loading}
            >
              {loading ? <><FaClock /> 保存中...</> : <><FaSave /> 保存</>}
            </button>
          </div>
        </form>
      </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal {...confirmationProps} />
    </>
  );
};

export default ProfileSettingsModal;
