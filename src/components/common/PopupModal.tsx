import React from "react";
import "./PopupModal.css";  // you define styles
interface PopupModalProps {
  open: boolean;
  title?: string;
  message?: string;
  onClose: () => void;
  children?: React.ReactNode;
}

const PopupModal: React.FC<PopupModalProps> = ({ open, title, message, onClose, children }) => {
  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content popup-modal">
         <div className="headerr">
          <svg
          className="success-icon"
          width="25"
          height="25"
          viewBox="0 0 24 24"
          fill="none"
          style={{marginTop:"5px",marginRight:"5px"}}
        >
          <path d="M20 6L9 17L4 12" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {title && <h2 style={{color:"#000",fontWeight:"600"}}>{title}</h2>}
        <span
  onClick={onClose}
  style={{
    marginLeft: "auto",
    fontSize: "25px",
    fontWeight: 600,
    color: "#9e9e9e",
    cursor: "pointer",
    lineHeight: 1
  }}
>
  ×
</span>
        </div>
        {message && <p style={{marginRight:"auto"}}>{message}</p>}
        {children}
        <button style={{background:"#218838",padding:"5px",color:"#fff",borderRadius: "4px",width: "60px",border: "2px solid #218838",marginLeft:"auto"}} onClick={onClose}>OK</button>
      </div>
    </div>
  );
};

export default PopupModal;