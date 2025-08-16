import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FaExclamationTriangle, FaInfoCircle, FaQuestionCircle } from 'react-icons/fa';
import './confirmationModal.css';

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = '確認',
  message = 'この操作を実行しますか？',
  confirmText = '確認',
  cancelText = 'キャンセル',
  type = 'warning', // 'warning', 'danger', 'info'
  clickPosition = null // { x: number, y: number }
}) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Use setTimeout to ensure modal is fully rendered before positioning
      const positionModal = () => {
        const modal = modalRef.current;
        if (!modal) return;
        
        // Get viewport dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // First, temporarily position modal to get accurate dimensions
        modal.style.position = 'fixed';
        modal.style.left = '-9999px';
        modal.style.top = '-9999px';
        modal.style.transform = 'none';
        modal.style.visibility = 'hidden';
        
        // Force layout and get actual dimensions
        const modalRect = modal.getBoundingClientRect();
        const modalWidth = modalRect.width;
        const modalHeight = modalRect.height;
        
        let left, top;
        
        if (clickPosition) {
          // Position at click location (viewport coordinates)
          left = clickPosition.x;
          top = clickPosition.y;
        } else {
          // Default to center of viewport
          left = viewportWidth / 2;
          top = viewportHeight / 2;
        }
        
        // Adjust horizontal position to keep modal within viewport
        if (left + modalWidth / 2 > viewportWidth - 20) {
          left = viewportWidth - modalWidth / 2 - 20;
        } else if (left - modalWidth / 2 < 20) {
          left = modalWidth / 2 + 20;
        }
        
        // Adjust vertical position to keep modal within viewport
        if (top + modalHeight / 2 > viewportHeight - 20) {
          top = viewportHeight - modalHeight / 2 - 20;
        } else if (top - modalHeight / 2 < 20) {
          top = modalHeight / 2 + 20;
        }
        
        // Apply final position using fixed positioning relative to viewport
        modal.style.position = 'fixed';
        modal.style.left = `${left}px`;
        modal.style.top = `${top}px`;
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.visibility = 'visible';
        
      };
      
      // Position immediately and also after a small delay to ensure rendering
      positionModal();
      setTimeout(positionModal, 10);
    }
  }, [isOpen, clickPosition]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <FaExclamationTriangle className="confirmation-modal__icon-element confirmation-modal__icon-element--danger" />;
      case 'warning':
        return <FaQuestionCircle className="confirmation-modal__icon-element confirmation-modal__icon-element--warning" />;
      case 'info':
        return <FaInfoCircle className="confirmation-modal__icon-element confirmation-modal__icon-element--info" />;
      default:
        return <FaQuestionCircle className="confirmation-modal__icon-element confirmation-modal__icon-element--warning" />;
    }
  };

  const getIconContainerClass = () => {
    switch (type) {
      case 'danger':
        return 'confirmation-modal__icon confirmation-modal__icon--danger';
      case 'warning':
        return 'confirmation-modal__icon confirmation-modal__icon--warning';
      case 'info':
        return 'confirmation-modal__icon confirmation-modal__icon--info';
      default:
        return 'confirmation-modal__icon confirmation-modal__icon--warning';
    }
  };

  const modalContent = (
    <div className="confirmation-modal__overlay" onClick={handleOverlayClick}>
      <div 
        ref={modalRef}
        className="confirmation-modal" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirmation-modal__header">
          <div className={getIconContainerClass()}>
            {getIcon()}
          </div>
          <div className="confirmation-modal__title-section">
            <h3 className="confirmation-modal__title">{title}</h3>
          </div>
        </div>
        
        <div className="confirmation-modal__body">
          <p className="confirmation-modal__message">{message}</p>
        </div>
        
        <div className="confirmation-modal__actions">
          <button 
            className="confirmation-modal__button confirmation-modal__button--cancel"
            onClick={onClose}
            type="button"
          >
            {cancelText}
          </button>
          <button 
            className={`confirmation-modal__button confirmation-modal__button--confirm confirmation-modal__button--${type}`}
            onClick={handleConfirm}
            type="button"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  // Render the modal directly in document.body using createPortal
  return createPortal(modalContent, document.body);
};

export default ConfirmationModal;
