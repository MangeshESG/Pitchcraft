import React from "react";

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
}) => {
  return (
    <div className={`modal ${size} ${show ? "active" : ""}`}>
      <div className="modal-content">
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
    </div>
  );
};

export default Modal;
