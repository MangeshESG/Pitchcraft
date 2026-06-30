import React from 'react';

type DeleteMode = 'soft' | 'Permanent';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  deleteMode: DeleteMode;
  count: number;
  itemName?: string;
  locationLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  deleteMode,
  count,
  itemName = 'email',
  locationLabel = 'your inbox',
  onClose,
  onConfirm
}) => {
  if (!isOpen) return null;

  const isPermanent = deleteMode === 'Permanent';
  const pluralItemName = count === 1 ? itemName : `${itemName}s`;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          backdropFilter: 'blur(4px)'
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: 0,
            width: '90%',
            maxWidth: '520px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            animation: 'deleteModalSlideIn 0.2s ease-out',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{
            padding: '24px 24px 20px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: isPermanent ? '#fee2e2' : '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isPermanent ? '#ef4444' : '#f59e0b'} strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                </svg>
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                margin: 0,
                color: '#111827'
              }}>
                {isPermanent ? 'Delete permanently?' : `Delete ${count === 1 ? 'Email' : 'Emails'}?`}
              </h3>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                color: '#9ca3af',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
                e.currentTarget.style.color = '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#9ca3af';
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div style={{ padding: '24px' }}>
            <p style={{
              fontSize: '15px',
              color: '#4b5563',
              marginBottom: '20px',
              lineHeight: '1.6'
            }}>
              You are about to delete {count} {pluralItemName} from {locationLabel}.
            </p>

            {isPermanent && (
              <div style={{
                padding: '12px 16px',
                background: '#fef2f2',
                borderLeft: '4px solid #ef4444',
                borderRadius: '6px',
                marginBottom: '20px'
              }}>
                <p style={{
                  fontSize: '13px',
                  color: '#991b1b',
                  margin: 0,
                  fontWeight: '500'
                }}>
                  Warning: This action is irreversible!
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '12px 24px',
                  background: '#f9fafb',
                  color: '#374151',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  flex: 1
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f9fafb';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                style={{
                  padding: '12px 24px',
                  background: isPermanent ? '#3f9f42' : '#f59e0b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isPermanent ? '#358938' : '#d97706';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isPermanent ? '#3f9f42' : '#f59e0b';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
                {isPermanent ? 'Delete permanently' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes deleteModalSlideIn {
            from {
              opacity: 0;
              transform: translateY(-20px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}
      </style>
    </>
  );
};

export default DeleteConfirmationModal;
