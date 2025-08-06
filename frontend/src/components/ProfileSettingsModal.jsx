import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useConfirmation } from '../hooks/useConfirmation';
import ConfirmationModal from './ConfirmationModal';
import { apiConfig } from '../utils/apiConfig';
import { useManagedTimeout } from '../utils/timerManager';
import './profileSettingsModal.css';

const ProfileSettingsModal = ({ isOpen, onClose }) => {
  const { user, apiCall, refreshUser } = useAuth();
  const { showConfirmation, confirmationProps } = useConfirmation();
  const managedTimeout = useManagedTimeout();
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
    managedTimeout.setTimeout(() => {
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
      <div className="profile-settings-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>プロフィール設定</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {/* Message Display */}
        {message.text && (
          <div className={`message-banner ${message.type}`}>
            <span className="message-icon">
              {message.type === 'success' ? '✅' : message.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span className="message-text">{message.text}</span>
            <button 
              className="message-close"
              onClick={() => setMessage({ type: '', text: '' })}
            >
              ×
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="profile-form">
          {/* Avatar Section */}
          <div className="avatar-section">
            <h3>プロフィール画像</h3>
            <div className="avatar-container">
              <div className="avatar-preview">
                {preview ? (
                  <img src={preview} alt="プロフィール画像" className="avatar-image" />
                ) : (
                  <div className="avatar-placeholder">
                    <span className="avatar-icon">👤</span>
                  </div>
                )}
              </div>
              
              <div className="avatar-controls">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="file-input"
                  id="avatar-upload"
                />
                <label htmlFor="avatar-upload" className="upload-button">
                  📁 画像を選択
                </label>
                
                {selectedFile && (
                  <button
                    type="button"
                    onClick={handleImageUpload}
                    disabled={uploadingImage}
                    className="upload-confirm-button"
                  >
                    {uploadingImage ? '⏳ アップロード中...' : '💾 アップロード'}
                  </button>
                )}
                
                {preview && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    disabled={uploadingImage}
                    className="remove-button"
                  >
                    {uploadingImage ? '⏳ 削除中...' : '🗑️ 削除'}
                  </button>
                )}
              </div>
              
              <p className="file-info">
                JPEG, PNG, WebP形式対応 (最大5MB)
              </p>
            </div>
          </div>

          {/* Basic Info Section */}
          <div className="form-section">
            <h3>基本情報</h3>
            
            <div className="form-group">
              <label htmlFor="name">表示名</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                maxLength={100}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">メールアドレス</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                disabled
                className="form-input disabled"
              />
              <p className="field-note">メールアドレスは変更できません</p>
            </div>
          </div>

          {/* Account Info Section */}
          <div className="form-section">
            <h3>アカウント情報</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">ユーザーID:</span>
                <span className="info-value">{user?.id}</span>
              </div>
              <div className="info-item">
                <span className="info-label">登録日:</span>
                <span className="info-value">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('ja-JP') : '不明'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">役割:</span>
                <span className="info-value">{user?.role || 'user'}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="cancel-button"
              disabled={loading}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="save-button"
              disabled={loading}
            >
              {loading ? '⏳ 保存中...' : '💾 保存'}
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
