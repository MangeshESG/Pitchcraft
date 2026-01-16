import React from 'react';

interface DomainAuthColumnProps {
  domain: any;
  onValidateClick: (domain: any) => void;
}

const DomainAuthColumn: React.FC<DomainAuthColumnProps> = ({ domain, onValidateClick }) => {
  if (!domain) return <span>-</span>;

  const authStatus = domain.dmark || "No SPF, DKIM, DMARC";
  const isAllVerified = authStatus === "All records verified";

  if (isAllVerified) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <span style={{ color: "#28a745", fontSize: "14px" }}>✓</span>
        <span style={{ color: "#28a745", fontSize: "14px" }}>Verified</span>
      </div>
    );
  }

  return (
    <span
      style={{
        color: "#dc3545",
        fontSize: "14px",
        cursor: "pointer",
        textDecoration: "underline",
      }}
      onClick={() => onValidateClick(domain)}
    >
      Pending
    </span>
  );
};

export default DomainAuthColumn;