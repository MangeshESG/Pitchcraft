import React, { useState, useEffect } from 'react';
import API_BASE_URL from "../../config";
import CommonSidePanel from '../common/CommonSidePanel';


interface DomainAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDomain: any;
  onValidate: (domain: any) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  refreshDomainData: () => void;
  effectiveUserId: string | null;
}

const DomainAuthModal: React.FC<DomainAuthModalProps> = ({
  isOpen,
  onClose,
  selectedDomain,
  onValidate,
  showSuccess,
  showError,
  refreshDomainData,
  effectiveUserId
}) => {
  const [dkimValue, setDkimValue] = useState("");
  const [dmarcValue, setDmarcValue] = useState("");
  const [expectedDkimValue, setExpectedDkimValue] = useState("");
  const [expectedDmarcValue, setExpectedDmarcValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !selectedDomain) return null;

  const authStatus = selectedDomain.dmark || "No SPF, DKIM, DMARC";
  const isSpfVerified = !authStatus.includes("SPF");
  const isDkimVerified = !authStatus.includes("DKIM");
  const isDmarcVerified = !authStatus.includes("DMARC");
  const email = selectedDomain.emailDomain?.replace('mailto:', '') || '';
  const domainName = selectedDomain.domain || email.split('@')[1] || '';

  return (
    <CommonSidePanel
      isOpen={isOpen}
      onClose={onClose}
      title="Domain Authentication Required"
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
            Close
          </button>
          <button
            onClick={async () => {
              setIsLoading(true);
              try {
                const params = new URLSearchParams({
                  domain: domainName,
                  clientId: effectiveUserId || ''
                });
                
                if (!isDkimVerified) {
                  params.append('DKIM', dkimValue || 'null');
                  params.append('expectedDkimValue', expectedDkimValue || 'null');
                }
                
                if (!isDmarcVerified) {
                  params.append('DMARC', dmarcValue || 'null');
                  params.append('expectedDMARcValue', expectedDmarcValue || 'null');
                }
                
                const response = await fetch(
                  `${API_BASE_URL}/api/domain-verification/verify-email-signature?${params.toString()}`,
                  {
                    method: 'GET',
                    headers: {
                      'accept': '*/*'
                    }
                  }
                );
                
                if (response.ok) {
                  showSuccess('Domain verification check completed!');
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
            {isLoading ? "Verifying..." : "Verify"}
          </button>
        </>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <p style={{ marginBottom: 12, color: "#666", fontSize: "16px" }}>
          <strong>Domain:</strong> {domainName}
        </p>
        
        <div style={{ 
          background: "#fff3cd", 
          border: "1px solid #ffeaa7", 
          borderRadius: 4, 
          padding: 16, 
          marginBottom: 16 
        }}>
          <p style={{ margin: 0, color: "#856404", fontWeight: "500", marginBottom: 12 }}>
            DNS Records Status:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: isSpfVerified ? "#28a745" : "#dc3545", fontSize: "16px" }}>
                {isSpfVerified ? "✓" : "✗"}
              </span>
              <span style={{ color: isSpfVerified ? "#28a745" : "#dc3545", fontWeight: "500" }}>
                SPF {isSpfVerified ? "Verified" : "Missing"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: isDkimVerified ? "#28a745" : "#dc3545", fontSize: "16px" }}>
                {isDkimVerified ? "✓" : "✗"}
              </span>
              <span style={{ color: isDkimVerified ? "#28a745" : "#dc3545", fontWeight: "500" }}>
                DKIM {isDkimVerified ? "Verified" : "Missing"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: isDmarcVerified ? "#28a745" : "#dc3545", fontSize: "16px" }}>
                {isDmarcVerified ? "✓" : "✗"}
              </span>
              <span style={{ color: isDmarcVerified ? "#28a745" : "#dc3545", fontWeight: "500" }}>
                DMARC {isDmarcVerified ? "Verified" : "Missing"}
              </span>
            </div>
          </div>
        </div>
        
        {!isDkimVerified && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: "600", fontSize: "16px" }}>
              DKIM Value
            </label>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: "inline-block", marginRight: 8, fontWeight: "500" }}>Domain name:</label>
              <input
                type="text"
                value={dkimValue}
                onChange={(e) => setDkimValue(e.target.value)}
                placeholder=""
                style={{
                  padding: "6px 10px",
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  fontSize: "14px",
                  marginRight: 4
                }}
              />
              <span>.{domainName}</span>
            </div>
            <div>
              <label style={{ display: "inline-block", marginRight: 8, fontWeight: "500" }}>TXT record:</label>
              <input
                type="text"
                value={expectedDkimValue}
                onChange={(e) => setExpectedDkimValue(e.target.value)}
                placeholder=""
                style={{
                  width: "calc(100% - 100px)",
                  padding: "6px 10px",
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  fontSize: "14px"
                }}
              />
            </div>
          </div>
        )}
        
        {!isDmarcVerified && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: "600", fontSize: "16px" }}>
              DMARC Value
            </label>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: "inline-block", marginRight: 8, fontWeight: "500" }}>Domain name:</label>
              <input
                type="text"
                value={dmarcValue}
                onChange={(e) => setDmarcValue(e.target.value)}
                placeholder=""
                style={{
                  padding: "6px 10px",
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  fontSize: "14px",
                  marginRight: 4
                }}
              />
              <span>.{domainName}</span>
            </div>
            <div>
              <label style={{ display: "inline-block", marginRight: 8, fontWeight: "500" }}>TXT record:</label>
              <input
                type="text"
                value={expectedDmarcValue}
                onChange={(e) => setExpectedDmarcValue(e.target.value)}
                placeholder=""
                style={{
                  width: "calc(100% - 100px)",
                  padding: "6px 10px",
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  fontSize: "14px"
                }}
              />
            </div>
          </div>
        )}
        
        <p style={{ color: "#666", fontSize: "14px", lineHeight: "1.5" }}>
          Enter the values for missing DNS records to verify domain authentication.
        </p>
      </div>
    </CommonSidePanel>
  );
};

export default DomainAuthModal;