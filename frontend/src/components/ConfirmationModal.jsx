import React from 'react';
import './confirmationModal.css';

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = '確認',
  message = 'この操作を実行しますか？',
  confirmText = '確認',
  cancelText = 'キャンセル',
  type = 'warning' // 'warning', 'danger', 'info'
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return '⚠️';
      case 'warning':
        return '❓';
      case 'info':
        return 'ℹ️';
      default:
        return '❓';
    }
  };

  return (
    <div className="confirmation-modal-overlay" onClick={onClose}>
      <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirmation-header">
          <div className="confirmation-icon">
            {getIcon()}
          </div>
          <h3 className="confirmation-title">{title}</h3>
        </div>
        
        <div className="confirmation-body">
          <p className="confirmation-message">{message}</p>
        </div>
        
        <div className="confirmation-actions">
          <button 
            className="confirmation-button cancel"
            onClick={onClose}
            type="button"
          >
            {cancelText}
          </button>
          <button 
            className={`confirmation-button confirm ${type}`}
            onClick={handleConfirm}
            type="button"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
