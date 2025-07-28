import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './explanationModal.css';

function ExplanationModal({ isOpen, onClose, question, updateQuestion }) {
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { apiCall } = useAuth();

  if (!isOpen) return null;

  // Handle file upload for explanation image
  const handleExplanationImageUpload = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください');
      return;
    }

    // Validate file size (5MB max for explanation images)
    if (file.size > 5 * 1024 * 1024) {
      alert('ファイルサイズは5MB以下にしてください');
      return;
    }

    setIsUploading(true);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('image', file);
      formData.append('bucket', 'explanation-images');

      // Upload to backend
      const uploadResponse = await apiCall('/upload/image', {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type, let browser set it for multipart/form-data
        }
      });

      if (uploadResponse.imageUrl) {
        // Update question with the uploaded image URL
        updateQuestion({ 
          ...question, 
          explanation_image_url: uploadResponse.imageUrl,
          explanation_image: uploadResponse.imageUrl, // For preview
          explanation_imageFile: null // Clear local file since it's uploaded
        });
      }
    } catch (error) {
      console.error('Error uploading explanation image:', error);
      alert('画像のアップロードに失敗しました。もう一度お試しください。');
    } finally {
      setIsUploading(false);
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
      handleExplanationImageUpload(e.dataTransfer.files[0]);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleExplanationImageUpload(file);
    }
  };

  // Remove explanation image
  const removeExplanationImage = async () => {
    console.log('🎯 Starting explanation image removal process...', {
      hasBackendId: !!question.backend_id,
      hasImageUrl: !!question.explanation_image_url,
      imageUrl: question.explanation_image_url,
      isBlob: question.explanation_image_url?.startsWith('blob:')
    });
    
    try {
      // If question has a backend ID and an uploaded explanation image, delete from server
      if (question.backend_id && question.explanation_image_url && !question.explanation_image_url.startsWith('blob:')) {
        console.log('🗑️ Deleting explanation image from server via question endpoint:', question.explanation_image_url);
        const response = await apiCall(`/questions/${question.backend_id}/explanation-image`, {
          method: 'DELETE'
        });
        
        console.log('📥 Explanation image deletion response:', response);
        
        if (response.success) {
          console.log('✅ Explanation image deleted from server successfully');
        } else {
          console.warn('⚠️ Server deletion failed, but continuing with local removal');
        }
      } else if (question.explanation_image_url && !question.explanation_image_url.startsWith('blob:')) {
        // If we have an uploaded image but no backend_id, try to delete directly from storage
        console.log('🗑️ Deleting orphaned explanation image directly from storage:', question.explanation_image_url);
        
        try {
          // Extract bucket and file path from URL
          const urlParts = question.explanation_image_url.split('/');
          const bucketIndex = urlParts.findIndex(part => part === 'public');
          
          if (bucketIndex !== -1 && bucketIndex + 2 < urlParts.length) {
            const bucket = urlParts[bucketIndex + 1]; // Should be 'explanation-images'
            const filePath = urlParts.slice(bucketIndex + 2).join('/');
            
            const response = await apiCall('/upload/image', {
              method: 'DELETE',
              body: JSON.stringify({
                bucket: bucket,
                filePath: filePath
              }),
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            console.log('📥 Direct storage deletion response:', response);
            
            if (response.message) {
              console.log('✅ Explanation image deleted from storage successfully');
            } else {
              console.warn('⚠️ Storage deletion response unclear, but continuing with local removal');
            }
          } else {
            console.warn('⚠️ Could not parse image URL for deletion:', question.explanation_image_url);
          }
        } catch (storageError) {
          console.error('❌ Failed to delete explanation image from storage:', storageError);
          // Continue with local removal even if storage deletion fails
        }
      } else {
        console.log('⏭️ Skipping server deletion:', {
          reason: !question.backend_id && !question.explanation_image_url ? 'No backend ID or image URL' : 
                  !question.explanation_image_url ? 'No image URL' :
                  !question.backend_id ? 'No backend ID (deleted from storage)' :
                  'Blob URL (local only)'
        });
      }
    } catch (error) {
      console.error('❌ Failed to delete explanation image from server:', error);
      // Continue with local removal even if server deletion fails
    }

    // Clean up local blob URL if it exists
    if (question.explanation_image && question.explanation_image.startsWith('blob:')) {
      URL.revokeObjectURL(question.explanation_image);
    }
    
    // Update local state
    updateQuestion({ 
      ...question, 
      explanation_image_url: null,
      explanation_image: "",
      explanation_imageFile: null 
    });
  };

  // Clear all explanation data
  const clearAllExplanations = () => {
    updateQuestion({
      ...question,
      explanation_title: null,
      explanation_text: null,
      explanation: "", // Backward compatibility
      explanation_image_url: null,
      explanation_image: "",
      explanation_imageFile: null
    });
  };

  const hasExplanationContent = 
    (question.explanation_title && question.explanation_title.trim()) ||
    (question.explanation_text && question.explanation_text.trim()) ||
    (question.explanation && question.explanation.trim()) ||
    question.explanation_image_url ||
    question.explanation_image;

  const displayImage = question.explanation_image_url || question.explanation_image;

  return (
    <div className="explanation-modal-overlay" onClick={onClose}>
      <div className="explanation-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-section">
            <h2 className="modal-title">📝 問題解説の設定</h2>
            <p className="modal-subtitle">回答後に表示される解説を設定します</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-content">
          <div className="explanation-section">
            {/* Explanation Title - matches explanation_title in SQL */}
            <div className="input-group">
              <label className="input-label">
                <span className="label-text">解説タイトル</span>
                <span className="label-optional">任意</span>
              </label>
              <input
                type="text"
                className="explanation-input"
                placeholder="例: なぜパリが正解なのか？"
                value={question.explanation_title || ""}
                onChange={(e) => updateQuestion({ 
                  ...question, 
                  explanation_title: e.target.value.trim() || null
                })}
                maxLength={100}
              />
              <span className="input-hint">
                {(question.explanation_title || "").length}/100 文字
              </span>
            </div>

            {/* Explanation Text - matches explanation_text in SQL */}
            <div className="input-group">
              <label className="input-label">
                <span className="label-text">解説内容</span>
                <span className="label-optional">任意</span>
              </label>
              <textarea
                className="explanation-textarea"
                placeholder="例: パリはフランスの首都で、1789年のフランス革命の舞台としても有名な都市です。セーヌ川沿いに位置し、エッフェル塔やルーブル美術館などの名所があります。詳しい背景や覚え方のコツなどを説明できます。"
                value={question.explanation_text || question.explanation || ""}
                onChange={(e) => {
                  const value = e.target.value.trim() || null;
                  updateQuestion({ 
                    ...question, 
                    explanation_text: value,
                    explanation: value // Backward compatibility
                  });
                }}
                rows={6}
                maxLength={1000}
              />
              <span className="input-hint">
                {(question.explanation_text || question.explanation || "").length}/1000 文字
              </span>
            </div>

            {/* Explanation Image Upload - matches explanation_image_url in SQL */}
            <div className="input-group">
              <label className="input-label">
                <span className="label-text">解説画像</span>
                <span className="label-optional">任意</span>
              </label>
              
              {!displayImage ? (
                <div
                  className={`upload-area explanation-modal-upload-area ${dragActive ? 'drag-active' : ''} ${isUploading ? 'uploading' : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => !isUploading && document.getElementById('explanation-image-input').click()}
                  style={{ cursor: isUploading ? 'not-allowed' : 'pointer' }}
                >
                  <div className="upload-content">
                    {isUploading ? (
                      <>
                        <div className="upload-spinner">⏳</div>
                        <p className="upload-text">アップロード中...</p>
                      </>
                    ) : (
                      <>
                        <div className="upload-icon">🖼️</div>
                        <p className="upload-text">
                          クリックまたはドラッグ&ドロップで<br />
                          解説画像をアップロード
                        </p>
                        <span className="upload-hint">
                          推奨: 16:9比率 | 最大5MB | JPG, PNG, GIF, WebP
                        </span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    id="explanation-image-input"
                    className="file-input"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    disabled={isUploading}
                    style={{ display: 'none' }}
                  />
                </div>
              ) : (
                <div className="image-preview explanation-image-preview">
                  <div className="image-container">
                    <img
                      src={displayImage}
                      alt="Explanation preview"
                      className="preview-image"
                    />
                    <div className="image-overlay">
                      <button
                        type="button"
                        className="btn-danger btn-small image-remove-btn"
                        onClick={removeExplanationImage}
                        title="画像を削除"
                      >
                        🗑️ 削除
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <div className="footer-actions">
            <div className="footer-buttons">
              <button 
                type="button"
                className="btn-secondary"
                onClick={onClose}
              >
                キャンセル
              </button>
              <button 
                type="button"
                className="btn-primary"
                onClick={onClose}
              >
                <span className="button-icon">💾</span>
                保存
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExplanationModal;
