import React from 'react';

interface ToastMessageProps {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
  duration?: number; // in seconds, default 6
  position?: 'bottom-center' | 'top-center' | 'top-right' | 'bottom-right';
}

const ToastMessage: React.FC<ToastMessageProps> = ({
  show,
  message,
  type,
  onClose,
  duration = 6,
  position = 'bottom-center'
}) => {
  if (!show) return null;

  // Theme configurations for different toast types
  const themes = {
    success: {
      background: '#E6F4EF',
      progressColor: '#1F9D74',
      iconBackground: '#1F9D74',
      icon: '✓',
      textColor: '#2F3A34'
    },
    error: {
      background: '#FDECEC',
      progressColor: '#DC2626',
      iconBackground: '#DC2626',
      icon: '!',
      textColor: '#2F3A34'
    },
    warning: {
      background: '#FEF3C7',
      progressColor: '#F59E0B',
      iconBackground: '#F59E0B',
      icon: '⚠',
      textColor: '#2F3A34'
    },
    info: {
      background: '#DBEAFE',
      progressColor: '#3B82F6',
      iconBackground: '#3B82F6',
      icon: 'i',
      textColor: '#2F3A34'
    }
  };

  // Position configurations
  const positions = {
    'bottom-center': {
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      top: 'auto',
      right: 'auto'
    },
    'top-center': {
      top: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      bottom: 'auto',
      right: 'auto'
    },
    'top-right': {
      top: 24,
      right: 24,
      transform: 'none',
      bottom: 'auto',
      left: 'auto'
    },
    'bottom-right': {
      bottom: 24,
      right: 24,
      transform: 'none',
      top: 'auto',
      left: 'auto'
    }
  };

  const theme = themes[type];
  const positionStyle = positions[position];

  return (
    <>
      <div
        style={{
          position: 'fixed',
          ...positionStyle,
          background: theme.background,
          color: theme.textColor,
          padding: '14px 22px',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
          zIndex: 99999,
          minWidth: 420,
          fontSize: 16,
          fontWeight: 500,
          overflow: 'hidden',
        }}
      >
        {/* Progress Bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: 4,
            width: '100%',
            background: theme.progressColor,
            animation: `toastProgress ${duration}s linear forwards`,
          }}
        />

        {/* Icon */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: theme.iconBackground,
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {theme.icon}
        </div>

        {/* Message */}
        <div style={{ flex: 1 }}>
          {message}
        </div>

        {/* Close Button */}
        <div
          onClick={onClose}
          style={{
            cursor: 'pointer',
            fontSize: 30,
            fontWeight: 500,
            color: '#6B7280',
            lineHeight: 1,
          }}
        >
          ×
        </div>
      </div>

      {/* CSS Animation */}
      <style>
        {`
          @keyframes toastProgress {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}
      </style>
    </>
  );
};

export default ToastMessage;