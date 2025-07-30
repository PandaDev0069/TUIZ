import { usePreview } from '../contexts/PreviewContext';
import './previewModeSelector.css';

function PreviewModeSelector() {
  const {
    previewMode,
    setPreviewMode,
    selectedQuestionIndex,
    setSelectedQuestionIndex,
    isMobileView,
    setIsMobileView,
    hostAsPlayer,
    setHostAsPlayer,
    questions,
    startPreview
  } = usePreview();

  return (
    <div className="preview-mode-selector">
      <div className="preview-mode-controls">
        {/* Preview Mode Selection */}
        <div className="preview-control-group">
          <label className="preview-control-label">プレビューモード</label>
          <div className="preview-mode-buttons">
            <button
              className={`preview-mode-button ${previewMode === 'full' ? 'active' : ''}`}
              onClick={() => setPreviewMode('full')}
              title="クイズ全体をプレビュー"
            >
              🎯 フル体験
            </button>
            <button
              className={`preview-mode-button ${previewMode === 'single' ? 'active' : ''}`}
              onClick={() => setPreviewMode('single')}
              title="個別の問題をプレビュー"
            >
              🎯 単問テスト
            </button>
            <button
              className={`preview-mode-button ${previewMode === 'dual' ? 'active' : ''}`}
              onClick={() => setPreviewMode('dual')}
              title="プレイヤーとホストの両方の画面を表示"
            >
              🔄 デュアルビュー
            </button>
          </div>
        </div>

        {/* Question Selection (for single mode) */}
        {previewMode === 'single' && (
          <div className="preview-control-group">
            <label className="preview-control-label">問題選択</label>
            <select
              value={selectedQuestionIndex}
              onChange={(e) => setSelectedQuestionIndex(parseInt(e.target.value))}
              className="preview-question-selector"
            >
              {questions.map((question, index) => (
                <option key={index} value={index}>
                  問題 {index + 1}: {question.text.substring(0, 50)}...
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Mobile View Toggle */}
        <div className="preview-control-group">
          <label className="preview-control-label">表示設定</label>
          <div className="preview-toggle-controls">
            <button
              className={`preview-toggle-button ${isMobileView ? 'active' : ''}`}
              onClick={() => setIsMobileView(!isMobileView)}
              title="モバイル表示をシミュレート"
            >
              📱 {isMobileView ? 'モバイル' : 'デスクトップ'}
            </button>
            <button
              className={`preview-toggle-button ${hostAsPlayer ? 'active' : ''}`}
              onClick={() => setHostAsPlayer(!hostAsPlayer)}
              title="ホストがプレイヤーとして参加"
            >
              🎮 {hostAsPlayer ? 'プレイヤー参加' : '観戦のみ'}
            </button>
          </div>
        </div>

        {/* Start Preview Button */}
        <div className="preview-control-group">
          <button
            className="preview-start-preview-button"
            onClick={startPreview}
            title="プレビューを開始"
          >
            ▶️ プレビュー開始
          </button>
        </div>
      </div>

      {/* Preview Info */}
      <div className="preview-info">
        <div className="preview-info-item">
          <span className="preview-info-label">モード:</span>
          <span className="preview-info-value">
            {previewMode === 'full' && '🎯 フル体験'}
            {previewMode === 'single' && '🎯 単問テスト'}
            {previewMode === 'dual' && '🔄 デュアルビュー'}
          </span>
        </div>
        {previewMode === 'single' && (
          <div className="preview-info-item">
            <span className="preview-info-label">選択中:</span>
            <span className="preview-info-value">問題 {selectedQuestionIndex + 1}</span>
          </div>
        )}
        <div className="preview-info-item">
          <span className="preview-info-label">表示:</span>
          <span className="preview-info-value">
            {isMobileView ? '📱 モバイル' : '💻 デスクトップ'}
          </span>
        </div>
        <div className="preview-info-item">
          <span className="preview-info-label">参加:</span>
          <span className="preview-info-value">
            {hostAsPlayer ? '🎮 プレイヤーとして参加' : '👁️ 観戦のみ'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default PreviewModeSelector;
