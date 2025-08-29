import { useState, useCallback } from 'react';

interface AppModalConfig {
  title?: string;
  message?: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  customContent?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
}

export const useAppModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<AppModalConfig>({});

  const showModal = useCallback((modalConfig: AppModalConfig) => {
    setConfig(modalConfig);
    setIsOpen(true);
  }, []);

  const hideModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const showSuccess = useCallback((message: string, title?: string) => {
    showModal({
      type: 'success',
      title: title || 'Success',
      message,
    });
  }, [showModal]);

  const showError = useCallback((message: string, title?: string) => {
    showModal({
      type: 'error',
      title: title || 'Error',
      message,
    });
  }, [showModal]);

  const showWarning = useCallback((message: string, title?: string) => {
    showModal({
      type: 'warning',
      title: title || 'Warning',
      message,
    });
  }, [showModal]);

  const showInfo = useCallback((message: string, title?: string) => {
    showModal({
      type: 'info',
      title: title || 'Information',
      message,
    });
  }, [showModal]);

  const showConfirm = useCallback((
    message: string,
    onConfirm: () => void,
    title?: string,
    confirmText?: string,
    cancelText?: string
  ) => {
    showModal({
      type: 'confirm',
      title: title || 'Confirmation',
      message,
      onConfirm,
      confirmText,
      cancelText,
    });
  }, [showModal]);

  return {
    isOpen,
    config,
    showModal,
    hideModal,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
  };
};