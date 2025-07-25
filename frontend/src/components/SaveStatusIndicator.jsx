import React from 'react';
import './saveStatusIndicator.css';

/**
 * Save Status Indicator Component
 * Shows current save status with visual feedback
 */
function SaveStatusIndicator({ 
  saveStatus, 
  lastSaved, 
  onTemporarySave, 
  autoSaveEnabled,
  onToggleAutoSave 
}) {
  const formatLastSaved = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const diff = Math.floor((now - timestamp) / 1000);
    
    if (diff < 60) return '今保存しました';
    if (diff < 3600) return `${Math.floor(diff / 60)}分前に保存`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}時間前に保存`;
    
    return timestamp.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusConfig = () => {
    switch (saveStatus) {
      case 'unsaved':
        return {
          icon: '⚠️',
          text: '未保存の変更があります',
          className: 'status-unsaved',
          showSaveButton: true
        };
      case 'saving':
        return {
          icon: '⏳',
          text: '保存中...',
          className: 'status-saving',
          showSaveButton: false
        };
      case 'saved':
        return {
          icon: '✅',
          text: lastSaved ? formatLastSaved(lastSaved) : '保存済み',
          className: 'status-saved',
          showSaveButton: true
        };
      case 'error':
        return {
          icon: '❌',
          text: '保存に失敗しました',
          className: 'status-error',
          showSaveButton: true
        };
      default:
        return {
          icon: '📄',
          text: '新しいクイズ',
          className: 'status-new',
          showSaveButton: true
        };
    }
  };

  const status = getStatusConfig();

  return (
    <div className={`save-status-indicator ${status.className}`}>
      <div className="save-status-info">
        <span className="status-icon">{status.icon}</span>
        <span className="status-text">{status.text}</span>
      </div>
      
      <div className="save-actions">
        {status.showSaveButton && (
          <button
            className="temporary-save-btn"
            onClick={onTemporarySave}
            disabled={saveStatus === 'saving'}
          >
            <span className="save-icon">💾</span>
            一時保存
          </button>
        )}
        
        <button
          className={`auto-save-toggle ${autoSaveEnabled ? 'enabled' : 'disabled'}`}
          onClick={onToggleAutoSave}
          title={autoSaveEnabled ? '自動保存を無効にする' : '自動保存を有効にする'}
        >
          <span className="toggle-icon">
            {autoSaveEnabled ? '🔄' : '⏸️'}
          </span>
          <span className="toggle-text">
            自動保存{autoSaveEnabled ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>
    </div>
  );
}

export default SaveStatusIndicator;
