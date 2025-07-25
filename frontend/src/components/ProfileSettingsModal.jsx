import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './profileSettingsModal.css';

const ProfileSettingsModal = ({ isOpen, onClose }) => {
  const { user, apiCall } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    avatar_url: user?.avatar_url || ''
  });
  const [preview, setPreview] = useState(user?.avatar_url || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

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
      alert('サポートされていないファイル形式です。JPEG、PNG、またはWebP形式の画像をアップロードしてください。');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('ファイルサイズが大きすぎます。5MB以下の画像をアップロードしてください。');
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
      const response = await fetch(`${window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : `http://${window.location.hostname}:3001`}/api/auth/upload-avatar`, {
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
      
      // Clear selected file
      setSelectedFile(null);
      
      alert('プロフィール画像がアップロードされました！');
    } catch (error) {
      console.error('Image upload error:', error);
      alert('画像のアップロードに失敗しました: ' + error.message);
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

      // Update user in localStorage
      const updatedUser = { ...user, ...response.user };
      localStorage.setItem('tuiz_user', JSON.stringify(updatedUser));
      
      alert('プロフィールが更新されました！');
      onClose();
      
      // Refresh page to update user data in context
      window.location.reload();
    } catch (error) {
      console.error('Profile update error:', error);
      alert('プロフィールの更新に失敗しました: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveImage = () => {
    setPreview('');
    setSelectedFile(null);
    setFormData(prev => ({
      ...prev,
      avatar_url: ''
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>プロフィール設定</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

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
                    className="remove-button"
                  >
                    🗑️ 削除
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
  );
};

export default ProfileSettingsModal;
