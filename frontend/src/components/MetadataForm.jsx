import { useState } from 'react';
import './metadataForm.css';

function MetadataForm({ metadata, setMetadata }) {
  const [dragActive, setDragActive] = useState(false);

  // Handle file upload (both click and drag & drop)
  const handleFileUpload = (file) => {
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setMetadata({ 
        ...metadata, 
        coverImage: url, 
        coverImageFile: file 
      });
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
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Remove cover image
  const removeCoverImage = () => {
    if (metadata.coverImage) {
      URL.revokeObjectURL(metadata.coverImage);
    }
    setMetadata({ 
      ...metadata, 
      coverImage: "", 
      coverImageFile: null 
    });
  };

  return (
    <div className="metadata-form">
      <div className="form-header">
        <h2 className="form-title">📋 クイズの基本情報</h2>
        <p className="form-description">
          クイズの基本的な情報を入力してください。タイトルは必須項目です。
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
            className={`form-input ${!metadata.title.trim() ? 'error' : ''}`}
            placeholder="例: 世界の首都クイズ"
            value={metadata.title}
            onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
            maxLength={100}
            required
          />
          <span className="input-hint">
            {metadata.title.length}/100 文字
          </span>
          {!metadata.title.trim() && (
            <span className="field-error">タイトルを入力してください</span>
          )}
        </div>

        {/* Description Input */}
        <div className="input-group">
          <label htmlFor="description" className="input-label">
            クイズの説明（任意）
          </label>
          <textarea
            id="description"
            className="form-textarea"
            placeholder="例: 世界各国の首都に関する知識を試す10問のクイズです。初心者から上級者まで楽しめる内容になっています。"
            value={metadata.description}
            onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
            rows={4}
            maxLength={500}
          />
          <span className="input-hint">
            {metadata.description.length}/500 文字
          </span>
        </div>

        {/* Cover Image Upload */}
        <div className="input-group">
          <label className="input-label">
            カバー画像（任意）
          </label>
          
          {!metadata.coverImage ? (
            <div 
              className={`image-upload-area ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="upload-content">
                <div className="upload-icon">📸</div>
                <p className="upload-text">
                  画像をドラッグ&ドロップまたはクリックして選択
                </p>
                <p className="upload-hint">
                  推奨サイズ: 1200×630px、最大5MB
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="file-input"
                />
              </div>
            </div>
          ) : (
            <div className="image-preview">
              <img
                src={metadata.coverImage}
                alt="Cover preview"
                className="preview-image"
              />
              <div className="image-actions">
                <button
                  type="button"
                  className="remove-image-btn"
                  onClick={removeCoverImage}
                  title="画像を削除"
                >
                  🗑️ 削除
                </button>
              </div>
            </div>
          )}
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
            placeholder="例: 地理, 世界, 首都, 知識"
            value={metadata.tags}
            onChange={(e) => setMetadata({ ...metadata, tags: e.target.value })}
            maxLength={200}
          />
          <span className="input-hint">
            カンマ区切りで入力してください（{metadata.tags.length}/200 文字）
          </span>
        </div>

        {/* Visibility Settings */}
        <div className="input-group">
          <label className="input-label">
            公開設定
          </label>
          <div className="radio-group">
            <label className="radio-option">
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={metadata.visibility === "private"}
                onChange={() => setMetadata({ ...metadata, visibility: "private" })}
              />
              <span className="radio-custom"></span>
              <div className="radio-content">
                <span className="radio-title">🔒 非公開</span>
                <span className="radio-description">
                  自分だけがアクセス可能（推奨）
                </span>
              </div>
            </label>

            <label className="radio-option">
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={metadata.visibility === "public"}
                onChange={() => setMetadata({ ...metadata, visibility: "public" })}
              />
              <span className="radio-custom"></span>
              <div className="radio-content">
                <span className="radio-title">🌐 公開</span>
                <span className="radio-description">
                  誰でもアクセス可能
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Preview Card */}
        {metadata.title && (
          <div className="preview-section">
            <h3 className="preview-title">プレビュー</h3>
            <div className="quiz-preview-card">
              {metadata.coverImage && (
                <div className="preview-image-container">
                  <img 
                    src={metadata.coverImage} 
                    alt="Cover" 
                    className="preview-cover-image"
                  />
                </div>
              )}
              <div className="preview-content">
                <h4 className="preview-quiz-title">{metadata.title}</h4>
                {metadata.description && (
                  <p className="preview-description">{metadata.description}</p>
                )}
                {metadata.tags && (
                  <div className="preview-tags">
                    {metadata.tags.split(',').map((tag, index) => (
                      <span key={index} className="preview-tag">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
                <div className="preview-meta">
                  <span className="preview-visibility">
                    {metadata.visibility === 'public' ? '🌐 公開' : '🔒 非公開'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MetadataForm;
