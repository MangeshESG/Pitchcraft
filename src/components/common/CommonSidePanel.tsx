import React from 'react';

interface CommonSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: number;
  footerContent?: React.ReactNode;
}

const CommonSidePanel: React.FC<CommonSidePanelProps> = ({
  isOpen,
  onClose,
  title,
  children,
  width = 454,
  footerContent,
}) => {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        height: "100vh",
        width,
        background: "#fff",
        boxShadow: "rgba(0, 0, 0, 0.30) -4px 0px 10px",
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.35s ease-in-out",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          background: "#ffffff",
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
        className='border-[#cccccc] border-b'
      >
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
          {title}
        </h3>
        <button
          onClick={onClose}
          style={{
            border: "none",
            background: "transparent",
            fontSize: 22,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>

      {/* BODY */}
      <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
        {children}
      </div>

      {/* FOOTER */}
      {footerContent && (
        <div
          style={{
            padding: 16,
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px solid #e5e7eb",
            marginBottom: 50,
            position: "sticky",
          }}
        >
          {footerContent}
        </div>
      )}
    </div>
  );
};

export default CommonSidePanel;
