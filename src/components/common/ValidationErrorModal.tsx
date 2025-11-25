import React from 'react';

interface ValidationError {
  row: number;
  field: string;
  value: string;
  message: string;
}

interface ValidationErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  errors: ValidationError[];
  onContinue?: () => void;
  onFixErrors?: () => void;
}

const ValidationErrorModal: React.FC<ValidationErrorModalProps> = ({
  isOpen,
  onClose,
  errors,
  onContinue,
  onFixErrors
}) => {
  if (!isOpen) return null;

  const emailErrors = errors.filter(error => error.field === 'email');
  const otherErrors = errors.filter(error => error.field !== 'email');

  return (
    <div style={{
      position: 'fixed',
      zIndex: 99999,
      inset: 0,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: '#ffffff',
        padding: 24,
        borderRadius: 8,
        width: '90%',
        maxWidth: 600,
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: '#fff3e0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                stroke="#e65100"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h3 style={{ margin: 0, color: '#e65100', fontSize: '20px', fontWeight: 600 }}>Validation errors found</h3>
            <p style={{ margin: 0, color: '#495057', fontSize: '14px' }}>
              {errors.length} issue{errors.length > 1 ? 's' : ''} found in your data
            </p>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          {emailErrors.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ 
                margin: '0 0 8px 0', 
                color: '#571515',
                fontSize: '16px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: 8 }}>
                  <path
                    d="M3 8L10.89 13.26C11.2187 13.4793 11.6049 13.5963 12 13.5963C12.3951 13.5963 12.7813 13.4793 13.11 13.26L21 8M5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19Z"
                    stroke="#571515"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Invalid email formats ({emailErrors.length})
              </h4>
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                border: '1px solid #e6c3c3',
                borderRadius: '4px',
                background: '#edd4d4'
              }}>
                {emailErrors.slice(0, 10).map((error, index) => (
                  <div key={index} style={{
                    padding: '8px 12px',
                    borderBottom: index < Math.min(emailErrors.length, 10) - 1 ? '1px solid #e6c3c3' : 'none',
                    fontSize: '14px',
                    color: '#571515'
                  }}>
                    <strong>Contact {error.row}:</strong> "{error.value}" - {error.message}
                  </div>
                ))}
                {emailErrors.length > 10 && (
                  <div style={{
                    padding: '8px 12px',
                    fontStyle: 'italic',
                    color: '#571515',
                    fontSize: '14px'
                  }}>
                    ... and {emailErrors.length - 10} more email format errors
                  </div>
                )}
              </div>
            </div>
          )}

          {otherErrors.length > 0 && (
            <div>
              <h4 style={{ 
                margin: '0 0 8px 0', 
                color: '#e65100',
                fontSize: '16px',
                fontWeight: 600
              }}>
                Other Issues ({otherErrors.length})
              </h4>
              <div style={{
                maxHeight: '150px',
                overflowY: 'auto',
                border: '1px solid #ff9800',
                borderRadius: '4px',
                background: '#fff3e0'
              }}>
                {otherErrors.slice(0, 5).map((error, index) => (
                  <div key={index} style={{
                    padding: '8px 12px',
                    borderBottom: index < Math.min(otherErrors.length, 5) - 1 ? '1px solid #ff9800' : 'none',
                    fontSize: '14px',
                    color: '#e65100'
                  }}>
                    <strong>Row {error.row}:</strong> {error.message}
                  </div>
                ))}
                {otherErrors.length > 5 && (
                  <div style={{
                    padding: '8px 12px',
                    fontStyle: 'italic',
                    color: '#e65100',
                    fontSize: '14px'
                  }}>
                    ... and {otherErrors.length - 5} more issues
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{
          background: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '4px',
          padding: '12px',
          marginBottom: '20px'
        }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#155724' }}>
            <strong>What happens next?</strong><br />
            • Rows with errors will be skipped during import<br />
            • Only valid rows will be processed<br />
            • You can continue or go back to fix the data
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'flex-end'
        }}>
          {onFixErrors && (
            <button
              onClick={onFixErrors}
              className="button secondary"
              style={{
                padding: '8px 16px',
                backgroundColor: '#f8f9fa',
                color: '#495057',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              Go back & Fix
            </button>
          )}
          {onContinue && (
            <button
              onClick={onContinue}
              style={{
                padding: '8px 16px',
                background: '#3f9f42',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600
              }}
            >
              Continue with valid data
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: '#333333',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ValidationErrorModal;