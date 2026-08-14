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
  const dynamicSize =
    size && (size.includes("%") || size.includes("px") || size.includes("vw"))
      ? { width: size, height: "auto", maxHeight: "90vh" }
      : {};
  return ReactDOM.createPortal (
    <div className={`modal-overlay ${size} ${show ? "active" : ""}`}>
     <div
        className={`modal-content ${
          !size || dynamicSize.width ? "" : size // only apply class if not numeric
        }`}
        style={{ ...dynamicSize, position: "relative" }}
      >
        {children}
         {buttonLabel && (
          <button
            type="button"
            className="absolute top-3 right-10"
            style={{
              padding: "10px 24px",
              background: "#f8fafc",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
            }}
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
