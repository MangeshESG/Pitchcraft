import React, { useEffect, useState } from "react";
import logo from "../../assets/images/pitch_logo.png";

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = "Loading...",
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + Math.random() * 12;
      });
    }, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "#ffffff",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "32px",
      }}
    >
      <img
        src={logo}
        alt="PitchKraft"
        style={{
          height: "72px",
          objectFit: "contain",
          animation: "fadeInUp 0.5s ease both",
        }}
      />

      <div style={{ width: "260px", textAlign: "center" }}>
        <div
          style={{
            width: "100%",
            height: "5px",
            backgroundColor: "#e8f5e9",
            borderRadius: "99px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min(progress, 100)}%`,
              background: "linear-gradient(90deg, #3f9f42, #66bb6a)",
              borderRadius: "99px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <p
          style={{
            marginTop: "12px",
            color: "#6b7280",
            fontSize: "13px",
            fontWeight: 500,
            letterSpacing: "0.02em",
            animation: "fadeInUp 0.6s ease both",
          }}
        >
          {message}
        </p>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;
