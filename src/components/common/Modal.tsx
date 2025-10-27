import React from "react";
import ReactDOM from "react-dom";

interface ModalProps {
  show: boolean;
  closeModal: () => void;
  children: React.ReactNode;
  buttonLabel?: string;
  size?: string;
}

const Modal: React.FC<ModalProps> = ({
  show,
  closeModal,
  children,
  buttonLabel,
  size,
}) => {console.log("Modal show prop:", show);
  if (!show) return null;
  return ReactDOM.createPortal (
    <div className={`modal-overlay ${size} ${show ? "active" : ""}`}>
      <div className={`modal-content ${size || ""}`}>
        {children}
        {buttonLabel && (
          <button
            className="close-button stop-button button"
            onClick={closeModal}
          >
            {buttonLabel}
          </button>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
