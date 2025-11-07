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
        style={dynamicSize}
      >
        {children}
         {buttonLabel && (
          <button
            className="absolute top-31 right-20 bg-green-600 text-white px-4 py-1 rounded-md hover:bg-green-700"
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
