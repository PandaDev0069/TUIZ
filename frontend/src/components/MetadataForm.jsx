import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './metadataForm.css';

function MetadataForm({ metadata, setMetadata }) {
  const { apiCall } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [errors, setErrors] = useState({});

  // Predefined categories for dropdown
  const categories = [
    '一般知識', '歴史', '地理', '科学', '数学', 
    '文学', '芸術', 'スポーツ', '音楽', '映画',
    '料理', '動物', '植物', 'テクノロジー', 'ビジネス',
    'その他'
  ];

  // Difficulty levels
  const difficultyLevels = [
    { value: 'easy', label: '簡単', description: '誰でも答えられる基本的な問題' },
    { value: 'medium', label: '普通', description: '一般的な知識が必要な問題' },
    { value: 'hard', label: '難しい', description: '専門的な知識が必要な問題' },
    { value: 'expert', label: '上級', description: '高度な専門知識が必要な問題' }
  ];

  // Validation function
  const validateField = (field, value) => {
    const newErrors = { ...errors };
    
    switch (field) {
      case 'title':
        if (!value.trim()) {
          newErrors.title = 'タイトルは必須です';
        } else if (value.length > 255) {
          newErrors.title = 'タイトルは255文字以内で入力してください';
        } else {
          delete newErrors.title;
        }
        break;
      case 'description':
        if (value.length > 1000) {
          newErrors.description = '説明は1000文字以内で入力してください';
        } else {
          delete newErrors.description;
        }
        break;
      case 'category':
        if (!value) {
          newErrors.category = 'カテゴリーを選択してください';
        } else {
          delete newErrors.category;
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes with validation
  const handleInputChange = (field, value) => {
    setMetadata({ ...metadata, [field]: value });
    validateField(field, value);
  };

  // Handle tags input (convert to array)
  const handleTagsChange = (value) => {
    const tagsArray = value.split(',').map(tag => tag.trim()).filter(tag => tag);
    setMetadata({ ...metadata, tags: tagsArray, tagsString: value });
  };

  // Handle thumbnail upload
  const handleThumbnailUpload = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('ファイルサイズは5MB以下にしてください');
      return;
    }

    try {
      setUploadingThumbnail(true);
      
      // Create FormData for upload
      const formData = new FormData();
      formData.append('thumbnail', file);
      
      // Upload to backend
      const response = await fetch(`${window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : `http://${window.location.hostname}:3001`}/api/quiz/upload-thumbnail`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('tuiz_token')}`
        },
        body: formData
      });

      if (!response.ok) {
        let errorMessage = 'アップロードに失敗しました';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          // If response is not JSON, get the text to see what we're receiving
          const responseText = await response.text();
          console.error('Non-JSON response:', responseText);
          errorMessage = `サーバーエラー (${response.status}): ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Update metadata with uploaded thumbnail URL
      setMetadata({ 
        ...metadata, 
        thumbnail_url: data.thumbnail_url,
        thumbnail_file: file 
      });
      
      alert('サムネイル画像がアップロードされました！');
    } catch (error) {
      console.error('Thumbnail upload error:', error);
      alert('画像のアップロードに失敗しました: ' + error.message);
    } finally {
      setUploadingThumbnail(false);
    }
  };

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop event
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleThumbnailUpload(e.dataTransfer.files[0]);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleThumbnailUpload(file);
    }
  };

  // Handle upload area click
  const handleUploadClick = () => {
    const fileInput = document.getElementById('thumbnail-upload');
    if (fileInput) {
      fileInput.click();
    }
  };

  // Remove thumbnail
  const removeThumbnail = () => {
    setMetadata({ 
      ...metadata, 
      thumbnail_url: "", 
      thumbnail_file: null 
    });
  };

  return (
    <div className="metadata-form">
      <div className="form-header">
        <h2 className="form-title">📋 クイズの基本情報</h2>
        <p className="form-description">
          クイズの基本的な情報を入力してください。必須項目は * で表示されています。
        </p>
      </div>

      <div className="form-content">
        {/* Title Input */}
        <div className="input-group">
          <label htmlFor="title" className="input-label required">
            クイズタイトル
          </label>
          <input
            type="text"
            id="title"
            className={`form-input ${errors.title || !metadata.title?.trim() ? 'error' : ''}`}
            placeholder="例: 世界の首都クイズ"
            value={metadata.title || ''}
            onChange={(e) => handleInputChange('title', e.target.value)}
            maxLength={255}
            required
          />
          <span className="input-hint">
            {(metadata.title || '').length}/255 文字
          </span>
          {errors.title && (
            <span className="field-error">{errors.title}</span>
          )}
        </div>

        {/* Description Input */}
        <div className="input-group">
          <label htmlFor="description" className="input-label">
            クイズの説明（任意）
          </label>
          <textarea
            id="description"
            className={`form-textarea ${errors.description ? 'error' : ''}`}
            placeholder="例: 世界各国の首都に関する知識を試す10問のクイズです。初心者から上級者まで楽しめる内容になっています。"
            value={metadata.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={4}
            maxLength={1000}
          />
          <span className="input-hint">
            {(metadata.description || '').length}/1000 文字
          </span>
          {errors.description && (
            <span className="field-error">{errors.description}</span>
          )}
        </div>

        {/* Category Selection */}
        <div className="input-group">
          <label htmlFor="category" className="input-label required">
            カテゴリー
          </label>
          <select
            id="category"
            className={`form-select ${errors.category || !metadata.category ? 'error' : ''}`}
            value={metadata.category || ''}
            onChange={(e) => handleInputChange('category', e.target.value)}
            required
          >
            <option value="">カテゴリーを選択してください</option>
            {categories.map((cat, index) => (
              <option key={index} value={cat}>{cat}</option>
            ))}
          </select>
          {errors.category && (
            <span className="field-error">{errors.category}</span>
          )}
        </div>

        {/* Difficulty Level */}
        <div className="input-group">
          <label className="input-label required">
            難易度レベル
          </label>
          <div className={`radio-group difficulty-group ${!metadata.difficulty_level ? 'error' : ''}`}>
            {difficultyLevels.map((level) => (
              <label key={level.value} className="radio-option">
                <input
                  type="radio"
                  name="difficulty_level"
                  value={level.value}
                  checked={metadata.difficulty_level === level.value}
                  onChange={() => handleInputChange('difficulty_level', level.value)}
                />
                <span className="radio-custom"></span>
                <div className="radio-content">
                  <span className="radio-title">{level.label}</span>
                  <span className="radio-description">{level.description}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Tags Input */}
        <div className="input-group">
          <label htmlFor="tags" className="input-label">
            タグ（任意）
          </label>
          <input
            type="text"
            id="tags"
            className="form-input"
            placeholder="例: 地理, 世界, 首都, 国名（カンマ区切り）"
            value={metadata.tagsString || (metadata.tags ? metadata.tags.join(', ') : '')}
            onChange={(e) => handleTagsChange(e.target.value)}
          />
          <span className="input-hint">
            カンマ（,）で区切って複数のタグを入力できます
          </span>
          {metadata.tags && metadata.tags.length > 0 && (
            <div className="tags-preview">
              {metadata.tags.map((tag, index) => (
                <span key={index} className="tag-chip">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Thumbnail Upload */}
        <div className="input-group">
          <label className="input-label">
            サムネイル画像（任意）
          </label>
          
          {!metadata.thumbnail_url ? (
            <div
              className={`upload-area ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={handleUploadClick}
              style={{ cursor: 'pointer' }}
            >
              <div className="upload-content">
                <div className="upload-icon">📸</div>
                <p className="upload-text">
                  クリックまたはドラッグ&ドロップで<br />
                  サムネイル画像をアップロード
                </p>
                <span className="upload-hint">
                  推奨サイズ: 16:9 比率、最大5MB
                </span>
              </div>
              <input
                type="file"
                id="thumbnail-upload"
                className="file-input"
                accept="image/*"
                onChange={handleFileInputChange}
                disabled={uploadingThumbnail}
                style={{ display: 'none' }}
              />
              {uploadingThumbnail && (
                <div className="upload-overlay">
                  <div className="loading-spinner"></div>
                  <span>アップロード中...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="image-preview">
              <img 
                src={metadata.thumbnail_url} 
                alt="Thumbnail preview"
                className="preview-image"
              />
              <div className="image-actions">
                <button
                  type="button"
                  className="btn-secondary btn-small"
                  onClick={removeThumbnail}
                  disabled={uploadingThumbnail}
                >
                  削除
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Additional Settings */}
        <div className="input-group">
          <label className="input-label">
            公開設定
          </label>
          <div className="radio-group visibility-group">
            <label className="radio-option">
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={!metadata.is_public}
                onChange={() => setMetadata({ ...metadata, is_public: false })}
              />
              <span className="radio-custom"></span>
              <div className="radio-content">
                <span className="radio-title">
                  🔒 非公開
                </span>
                <span className="radio-description">
                  自分だけがアクセスできます
                </span>
              </div>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={metadata.is_public || false}
                onChange={() => setMetadata({ ...metadata, is_public: true })}
              />
              <span className="radio-custom"></span>
              <div className="radio-content">
                <span className="radio-title">
                  🌐 公開
                </span>
                <span className="radio-description">
                  誰でもアクセスできます
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Form Summary */}
        <div className="form-summary">
          <h3 className="summary-title">📊 設定内容の確認</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">タイトル:</span>
              <span className="summary-value">
                {metadata.title || '未入力'}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">カテゴリー:</span>
              <span className="summary-value">
                {metadata.category || '未選択'}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">難易度:</span>
              <span className="summary-value">
                {difficultyLevels.find(d => d.value === metadata.difficulty_level)?.label || '未選択'}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">公開設定:</span>
              <span className="summary-value">
                {metadata.is_public ? '🌐 公開' : '🔒 非公開'}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">タグ数:</span>
              <span className="summary-value">
                {metadata.tags ? metadata.tags.length : 0}個
              </span>
            </div>
          </div>
        </div>

        {/* Validation Summary */}
        {Object.keys(errors).length > 0 && (
          <div className="validation-summary error">
            <h4>⚠️ 入力エラーがあります</h4>
            <ul>
              {Object.entries(errors).map(([field, error]) => (
                <li key={field}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Success Indicator */}
        {Object.keys(errors).length === 0 && metadata.title && metadata.category && metadata.difficulty_level && (
          <div className="validation-summary success">
            <h4>✅ 基本情報の入力が完了しました</h4>
            <p>次のステップに進むことができます。</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default MetadataForm;
