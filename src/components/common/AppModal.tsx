import React, { useEffect, useState } from 'react';
import './AppModal.css';

interface AppModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  customContent?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  closeOnOverlayClick?: boolean;
}

const AppModal: React.FC<AppModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  customContent,
  size = 'small',
  closeOnOverlayClick = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className="app-modal-icon success" viewBox="0 0 24 24">
            <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
          </svg>
        );
      case 'error':
        return (
          <svg className="app-modal-icon error" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
          </svg>
        );
      case 'warning':
        return (
          <svg className="app-modal-icon warning" viewBox="0 0 24 24">
            <path fill="currentColor" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
          </svg>
        );
      default:
        return (
          <svg className="app-modal-icon info" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
        );
    }
  };

  return (
    <div 
      className={`app-modal-overlay ${isOpen ? 'open' : ''}`}
      onClick={handleOverlayClick}
    >
      <div className={`app-modal-container ${size} ${isOpen ? 'open' : ''}`}>
        {customContent ? (
          customContent
        ) : (
          <>
            <div className="app-modal-header">
              {type !== 'confirm' && getIcon()}
              {title && <h2 className="app-modal-title">{title}</h2>}
              <button className="app-modal-close" onClick={onClose}>
                ×
              </button>
            </div>
            <div className="app-modal-body">
              {message && <p className="app-modal-message">{message}</p>}
            </div>
            <div className="app-modal-footer">
              {type === 'confirm' ? (
                <>
                  <button className="app-modal-button secondary" onClick={handleCancel}>
                    {cancelText}
                  </button>
                  <button className="app-modal-button primary" onClick={handleConfirm}>
                    {confirmText}
                  </button>
                </>
              ) : (
                <button className="app-modal-button primary" onClick={handleConfirm}>
                  {confirmText}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AppModal;