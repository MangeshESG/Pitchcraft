import React, { useState } from 'react';

interface OtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (otp: string) => void;
  emailDomain: string;
}

const OtpModal: React.FC<OtpModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  emailDomain
}) => {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (otp.trim()) {
      setIsLoading(true);
      try {
        await onSubmit(otp);
        setOtp('');
        onClose();
      } finally {
        setIsLoading(false);
      }
    }
  };

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
          padding: 24,
          borderRadius: 8,
          width: "400px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 24, fontSize: "20px", fontWeight: "600", color: "#333" }}>Verify Domain</h3>
        
        <p style={{ marginBottom: 24, color: "#666", fontSize: "14px", lineHeight: 1.5 }}>
          To verify <strong>{emailDomain?.split('@')[1] || 'domain'}</strong>, enter the verification code received by <strong>{emailDomain}</strong>
        </p>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", marginBottom: 8, fontSize: "14px", fontWeight: "500", color: "#333" }}>
            Enter verification code
          </label>
          <input
            type="text"
            placeholder=""
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              border: "2px solid #007bff",
              borderRadius: "6px",
              fontSize: "16px",
              outline: "none",
              boxSizing: "border-box"
            }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button 
            onClick={onClose}
            style={{
              padding: "8px 16px",
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
            onClick={handleSubmit}
            disabled={!otp.trim() || isLoading}
            style={{
              padding: "8px 16px",
              background: (otp.trim() && !isLoading) ? "#007bff" : "#ccc",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: (otp.trim() && !isLoading) ? "pointer" : "not-allowed",
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
            {isLoading ? "Verifying..." : "Verify"}
          </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default OtpModal;