import React, { useState } from 'react';
import API_BASE_URL from '../../config';
import CommonSidePanel from '../common/CommonSidePanel';

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
    <CommonSidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={`Authenticate ${selectedDomain.domain || selectedDomain.emailDomain?.replace('mailto:', '').split('@')[1] || 'domain'}`}
      footerContent={
        <>
          <button
            onClick={onClose}
            style={{
              padding: "10px 32px",
              border: "1px solid #ddd",
              background: "#fff",
              borderRadius: "24px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              color: "#333",
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
              padding: "10px 32px",
              background: "#fff",
              color: isLoading ? "#ccc" : "#ef4444",
              border: `1px solid ${isLoading ? "#ccc" : "#ef4444"}`,
              borderRadius: "24px",
              cursor: isLoading ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            {isLoading ? "Validating..." : "Validate"}
          </button>
        </>
      }
    >
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
    </CommonSidePanel>
  );
};

export default ValidateRecordsModal;