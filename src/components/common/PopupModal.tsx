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
      <div className="modal-content">
        {/* {title && <h2>{title}</h2>} */}
        {message && <p>{message}</p>}
        {children}
        <button style={{background:"#218838",padding:"5px",color:"#fff",marginLeft:"225px",borderRadius: "4px",width: "60px",border: "2px solid #218838"}} onClick={onClose}>OK</button>
      </div>
    </div>
  );
};

export default PopupModal;