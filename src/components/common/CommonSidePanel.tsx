import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface CommonSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: number;
  footerContent?: React.ReactNode;
  headerContent?: React.ReactNode;
}

const CommonSidePanel: React.FC<CommonSidePanelProps> = ({
  isOpen,
  onClose,
  title,
  children,
  width = 454,
  footerContent,
  headerContent,
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setShouldRender(false), 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        height: "100vh",
        width,
        background: "#fff",
        boxShadow: "rgba(0, 0, 0, 0.30) -4px 0px 10px",
        transform: isAnimating ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.35s ease-in-out",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        borderTopLeftRadius: "30px",
        overflow: "hidden",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          background: "#E4F5E5",
          padding: "16px 20px",
          borderTopLeftRadius: "30px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          flexShrink: 0,
        }}
        className='border-[#cccccc] border-b'
      >
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
          {title}
        </h3>
        {headerContent && headerContent}
        <button
          onClick={onClose}
          style={{
            border: "none",
            background: "transparent",
            fontSize: 22,
            cursor: "pointer",
            marginLeft: "auto"
          }}
        >
          ✕
        </button>
      </div>

      {/* BODY */}
      <div style={{ padding: 20, flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}>
        {children}
      </div>

      {/* FOOTER */}
      {footerContent && (
        <div
          style={{
            padding: "16px 20px 50px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            borderTop: "1px solid #e5e7eb",
            position: "sticky",
            bottom: 0,
            background: "#fff",
            zIndex: 1,
            flexShrink: 0,
            boxShadow: "0 -4px 12px rgba(0, 0, 0, 0.04)",
          }}
        >
          {footerContent}
        </div>
      )}
    </div>
    ,
    document.body
  );
};

export default CommonSidePanel;
