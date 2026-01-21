import React, { useState } from 'react';
import API_BASE_URL from '../../config';

interface ValidateRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDomain: any;
  onValidate: (domain: any) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  refreshDomainData: () => void;
  effectiveUserId: string | null;
}

const ValidateRecordsModal: React.FC<ValidateRecordsModalProps> = ({
  isOpen,
  onClose,
  selectedDomain,
  onValidate,
  showSuccess,
  showError,
  refreshDomainData,
  effectiveUserId
}) => {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !selectedDomain) return null;

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          padding: 32,
          borderRadius: 8,
          width: "60%",
          maxWidth: 800,
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 24, fontSize: "24px", fontWeight: "600" }}>
          Authenticate {selectedDomain.domain || selectedDomain.emailDomain?.replace('mailto:', '').split('@')[1] || 'domain'}
        </h2>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: "18px" }}>Verify domain</h3>
          </div>
          <p style={{ marginBottom: 16, color: "#666", fontSize: "15px" }}>
            Add the public key below to the subdomain <strong>_pitchgen.{selectedDomain.domain || selectedDomain.emailDomain?.replace('mailto:', '').split('@')[1] || 'domain'}</strong> in your domain's DNS settings.
          </p>
          <div style={{ marginBottom: 8 }}>
            <span style={{ color: "#333", fontWeight: "500" }}>Type: </span>
            <span style={{ color: "#333", fontWeight: "500" }}>TXT</span>
          </div>
          <div style={{ background: "#f8f9fa", padding: 16, borderRadius: 4, border: "1px solid #e9ecef", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <span style={{ color: "#333", fontWeight: "500", minWidth: "50px" }}>Value:</span>
              <code style={{ fontSize: "14px", wordBreak: "break-all", flex: 1, color: "#333" }}>
                {selectedDomain.token || "pitchgen-verification=596206f78b9d093fc77d2bf58eb82304"}
              </code>
              <button
                style={{
                  background: "none",
                  border: "1px solid #ccc",
                  padding: "4px 8px",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: "16px",
                  flexShrink: 0
                }}
                onClick={() => {
                  navigator.clipboard.writeText(selectedDomain.token || "pitchgen-verification=596206f78b9d093fc77d2bf58eb82304");
                }}
              >
                📋
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h3 style={{ margin: 0, marginBottom: 12, fontSize: "16px", fontWeight: "600", color: "#333" }}>Note</h3>
          <p style={{ margin: 0, color: "#666", fontSize: "14px", lineHeight: "1.5" }}>
            Please note that it may take up to 24 to 48 hours for DNS changes to fully take effect. Hopefully it will be much sooner. Any problems please contact support.
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              border: "1px solid #ccc",
              background: "#fff",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              setIsLoading(true);
              try {
                const response = await fetch(
                  `${API_BASE_URL}/api/domain-verification/verify?domain=${encodeURIComponent(selectedDomain.domain || selectedDomain.emailDomain?.split('@')[1])}&clientId=${effectiveUserId || ''}`,
                  {
                    method: 'POST',
                    headers: {
                      'accept': '*/*'
                    },
                    body: ''
                  }
                );
                
                if (response.ok) {
                  showSuccess('Domain verification successful!');
                  refreshDomainData();
                } else {
                  showError('Domain verification failed. Please try again.');
                }
              } catch (error) {
                console.error('Error verifying domain:', error);
                showError('Error verifying domain. Please check your connection.');
              } finally {
                setIsLoading(false);
              }
              
              onValidate(selectedDomain);
              onClose();
            }}
            disabled={isLoading}
            style={{
              padding: "10px 20px",
              background: isLoading ? "#6c757d" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: isLoading ? "not-allowed" : "pointer",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            {isLoading && (
              <span style={{ 
                border: "2px solid #fff", 
                borderTop: "2px solid transparent", 
                borderRadius: "50%", 
                width: "14px", 
                height: "14px", 
                animation: "spin 0.6s linear infinite",
                display: "inline-block"
              }} />
            )}
            {isLoading ? "Validating..." : "Validate Records"}
          </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default ValidateRecordsModal;