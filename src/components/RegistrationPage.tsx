import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOtpTimer } from "../hooks/useOtpTimer";
import { usePageTitle } from "../hooks/usePageTitle";
import "./LoginPage.css";

const RegistrationPage: React.FC = () => {
  usePageTitle("Register");
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    password: "",
    companyName: "",
    jobTitle: "",
  });

  const [showOtpForm, setShowOtpForm] = useState(false);
  const [otp, setOtp] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [emailForOtp, setEmailForOtp] = useState("");
  const { timeLeft, isExpired, startTimer, formatTime } = useOtpTimer();

  const navigate = useNavigate();
// Auto-hide success message after 3 seconds
React.useEffect(() => {
  if (success) {
    const timer = setTimeout(() => {
      setSuccess(""); // Clear the message
    }, 3000); // 3 seconds

    return () => clearTimeout(timer); // Cleanup
  }
}, [success]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("");
    setError("");

    try {
      const response = await fetch("https://test.pitchkraft.ai/api/Login/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "*/*",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
  setSuccess("Registration successful! Please verify OTP.");
  setEmailForOtp(formData.email);
  startTimer();

  // ⏳ Show OTP form after 1 second (without delaying the success message)
  setTimeout(() => {
    setShowOtpForm(true);
  }, 5000);
}

 else {
        const errorText = await response.text();
        setError("Registration failed: " + errorText);
      }
    } catch (err: any) {
      setError("Error submitting form: " + err.message);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("");
    setError("");

    try {
      const response = await fetch("https://test.pitchkraft.ai/api/Login/registration-verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "*/*",
        },
        body: JSON.stringify({
          email: emailForOtp,
          otp: otp,
        }),
      });

      if (response.ok) {
        setSuccess("OTP verified successfully! Please login.");
        setShowOtpForm(false);
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          username: "",
          password: "",
          companyName: "",
          jobTitle: "",
        });
        setOtp("");
      } else {
        const errorText = await response.text();
        setError("OTP verification failed: " + errorText);
      }
    } catch (err: any) {
      setError("Error verifying OTP: " + err.message);
    }
  };

  return (
    <div className="login-container page d-flex flex-col">
      <h1 style={{ color: "white" }}>Register to Pitchcraft</h1>

      {/* OTP Form */}
      {showOtpForm ? (
        <div className="login-box">
          <form onSubmit={handleOtpSubmit}>
            <div className="form-group">
  <label htmlFor="otp">Enter OTP sent to your email</label>
  <input
    id="otp"
    type="text"
    value={otp}
    onChange={(e) => setOtp(e.target.value)}
    required
    placeholder="Enter OTP"
    title="Please enter the OTP sent to your email"
    disabled={isExpired}
  />
</div>

            <div className="form-group mb-0">
              <button type="submit" className="button save-button d-flex justify-center" disabled={isExpired}>
                {isExpired ? 'OTP Expired' : 'Verify OTP'}
              </button>
            </div>
            
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
          </form>
        </div>
      ) : (
        // Registration Form
        <div className="login-box mb-10">
          <form onSubmit={handleSubmit}>
            {/* 2 Column Flex Layout */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
              {/* Column 1 */}
              <div style={{ flex: "1 1 45%" }}>
                <div className="form-group">
  <label htmlFor="firstName">First name</label>
  <input
    id="firstName"
    type="text"
    name="firstName"
    value={formData.firstName}
    onChange={handleChange}
    required
    placeholder="Enter your first name"
    title="Please enter your first name"
  />
</div>

                <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="Enter your email"
            title="Please enter your email address"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="Enter your password"
            title="Password must be at least 8 characters"
          />
        </div>
      </div>

      {/* Column 2 */}
      <div style={{ flex: "1 1 45%" }}>
        <div className="form-group">
          <label htmlFor="lastName">Last name</label>
          <input
            id="lastName"
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
            placeholder="Enter your last name"
            title="Please enter your last name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            placeholder="Choose a username"
            title="Your username must be unique"
          />
        </div>

        <div className="form-group">
          <label htmlFor="companyName">Company name</label>
          <input
            id="companyName"
            type="text"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            required
            placeholder="Enter your company name"
            title="Enter the name of your company"
          />
        </div>

        <div className="form-group">
          <label htmlFor="jobTitle">Job title</label>
          <input
            id="jobTitle"
            type="text"
            name="jobTitle"
            value={formData.jobTitle}
            onChange={handleChange}
            required
            placeholder="Enter your job title"
            title="Please enter your current job title"
          />
        </div>
      </div>
    </div>

    <div className="form-group mb-0" style={{ marginTop: "20px" }}>
      <button type="submit" className="button save-button d-flex justify-center">
        Register
      </button>
    </div>
  </form>

          <div className="register-link mt-10">
            <p>Already have an account?</p>
            <button type="button" className="button save-button d-flex justify-center" onClick={() => navigate("/")}>
              Login
            </button>
          </div>
        </div>
      )}

      {success && <div className="alert success-message">{success}</div>}
      {error && <div className="alert alert-danger error-message">{error}</div>}
    </div>
  );
};

export default RegistrationPage;
