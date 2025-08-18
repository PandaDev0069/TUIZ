import { useState, useCallback } from 'react';

export const useConfirmation = () => {
  const [confirmationState, setConfirmationState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    type: 'warning',
    clickPosition: null,
    onConfirm: null,
    onCancel: null
  });

  const showConfirmation = useCallback(({
    title = '確認',
    message = 'この操作を実行しますか？',
    confirmText = '確認',
    cancelText = 'キャンセル',
    type = 'warning',
    clickPosition = null
  }) => {
    return new Promise((resolve) => {
      setConfirmationState({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        type,
        clickPosition,
        onConfirm: () => {
          resolve(true);
          setConfirmationState(prev => ({ ...prev, isOpen: false }));
        },
        onCancel: () => {
          resolve(false);
          setConfirmationState(prev => ({ ...prev, isOpen: false }));
        }
      });
    });
  }, []);

  const hideConfirmation = useCallback(() => {
    if (confirmationState.onCancel) {
      confirmationState.onCancel();
    } else {
      setConfirmationState(prev => ({ ...prev, isOpen: false }));
    }
  }, [confirmationState.onCancel]);

  return {
    showConfirmation,
    hideConfirmation,
    confirmationProps: {
      isOpen: confirmationState.isOpen,
      onClose: hideConfirmation,
      onConfirm: confirmationState.onConfirm,
      title: confirmationState.title,
      message: confirmationState.message,
      confirmText: confirmationState.confirmText,
      cancelText: confirmationState.cancelText,
      type: confirmationState.type,
      clickPosition: confirmationState.clickPosition
    }
  };
};

