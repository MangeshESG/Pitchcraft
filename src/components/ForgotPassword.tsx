import React, { useState } from "react";
import { useOtpTimer } from "../hooks/useOtpTimer";
import { usePageTitle } from "../hooks/usePageTitle";
import "./LoginPage.css"; // Reuse login page styles

const ForgotPasswordPage: React.FC = () => {
  usePageTitle("Forgot Password");
  
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState<"enterEmail" | "verifyOtp">("enterEmail");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { timeLeft, isExpired, startTimer, formatTime } = useOtpTimer();

  // Step 1: Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `https://test.pitchkraft.ai/api/Login/restpass_send-otp?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            Accept: "*/*",
          },
          body: "",
        }
      );

      if (response.ok) {
        setMessage("OTP sent successfully. Please check your email.");
        setStep("verifyOtp"); // ✅ move to next step
        startTimer();
      } else {
        const errorText = await response.text();
        setError("Failed to send OTP: " + errorText);
      }
    } catch (err: any) {
      setError("Error sending OTP: " + err.message);
    }
  };

  // Step 2: Verify OTP and reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const url = `https://test.pitchkraft.ai/api/Login/verify-otp-and-reset-password?Email=${encodeURIComponent(
        email
      )}&Otp=${encodeURIComponent(otp)}&NewPassword=${encodeURIComponent(
        newPassword
      )}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "*/*",
        },
        body: "",
      });

      if (response.ok) {
        setMessage("Password reset successful. Please login.");
        setStep("enterEmail"); // Optional: reset back to step 1
        setEmail("");
        setOtp("");
        setNewPassword("");
      } else {
        const errorText = await response.text();
        setError("Failed to reset password: " + errorText);
      }
    } catch (err: any) {
      setError("Error resetting password: " + err.message);
    }
  };

  return (
    <div className="login-container page d-flex flex-col">
      <h1 style={{ color: "white", textAlign: "center" }}>Forgot Password</h1>

      <div className="login-box mb-10">
        {step === "enterEmail" ? (
          <form onSubmit={handleSendOtp}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group mb-0">
              <button
                type="submit"
                className="button save-button d-flex justify-center"
              >
                Send OTP
              </button>
            </div>
          </form>
        ) : (
          <>
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label>OTP</label>
                <input
                  type="text"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  disabled={isExpired}
                />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group mb-0">
                <button
                  type="submit"
                  className="button save-button d-flex justify-center"
                  disabled={isExpired}
                >
                  {isExpired ? 'OTP Expired' : 'Reset Password'}
                </button>
              </div>
            </form>
            
            <div style={{ 
              marginTop: '15px', 
              padding: '12px 20px', 
              backgroundColor: '#f8f4e6', 
              borderRadius: '8px', 
              textAlign: 'center', 
              fontSize: '16px', 
              fontWeight: '500',
              color: isExpired ? '#dc3545' : '#8b6914',
              border: '1px solid #e6d7a3'
            }}>
              {isExpired ? 'OTP Expired' : `Time Remaining: ${formatTime}`}
            </div>
          </>
        )}
      </div>

      {message && <div className="alert success-message">{message}</div>}
      {error && <div className="alert alert-danger error-message">{error}</div>}
    </div>
  );
};

export default ForgotPasswordPage;
