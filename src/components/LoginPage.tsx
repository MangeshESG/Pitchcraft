import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config";
import "./LoginPage.css";

type ViewMode = "login" | "register" | "forgot" | "otp";

interface ViewProps {
  setView: React.Dispatch<React.SetStateAction<ViewMode>>;
}

const AuthPage: React.FC = () => {
  const [view, setView] = useState<ViewMode>("login");

  return (
    <div className="page login-container">
      <div className="login-box">
        {view === "login" && <LoginForm setView={setView} />}
        {view === "register" && <RegisterForm setView={setView} />}
        {view === "forgot" && <ForgotPasswordForm setView={setView} />}
        {view === "otp" && <OtpVerification setView={setView} />}
      </div>
    </div>
  );
};

export default AuthPage;

/* ---------------- LOGIN ---------------- */
const LoginForm: React.FC<ViewProps> = ({ setView }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [trustThisDevice, setTrustThisDevice] = useState(false); // ✅ NEW
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/login/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, trustednumber: trustThisDevice ? "1" : null }), // pass trustednumber
      });

      let data: any;
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (response.ok && data.token) {
        // Direct success
        navigate("/main");
      } else if (data.message?.includes("OTP sent")) {
        localStorage.setItem("loginUser", username);
        localStorage.setItem("trustThisDevice", trustThisDevice ? "true" : "false"); // save preference
        setView("otp");
      } else {
        setError(data.message || "Invalid login credentials.");
      }
    } catch (err) {
      setError("Server error. Please try again later.");
    }
  };

  return (
    <div>
      <h2>Login to Pitchcraft</h2>
      <form onSubmit={handleLogin}>
        <label>User name</label>
        <input
          type="text"
          placeholder="Email address"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <label>Password</label>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {/* ✅ Trust This Device Checkbox */}
        <div style={{ margin: "10px 0" }}>
          <label>
            <input
              type="checkbox"
              checked={trustThisDevice}
              onChange={(e) => setTrustThisDevice(e.target.checked)}
            />{" "}
            Trust this device (Don’t ask OTP again)
          </label>
        </div>

        <button type="submit" className="login-button">Log in</button>
      </form>
      {error && <div className="error-message">{error}</div>}
      <div className="register-link">
        <a onClick={() => setView("forgot")}>Forgot password?</a> |{" "}
        <a onClick={() => setView("register")}>Create account</a>
      </div>
    </div>
  );
};

/* ---------------- REGISTER ---------------- */
const RegisterForm: React.FC<ViewProps> = ({ setView }) => {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    companyName: "",
    jobTitle: ""
  });
  const [message, setMessage] = useState("");

const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  try {
    const response = await fetch(`${API_BASE_URL}/api/login/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    // ✅ FIX: check if response has content before parsing JSON
    let data;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (response.ok) {
      localStorage.setItem("registerEmail", form.email);
      setView("otp");
    } else {
      setMessage(data?.message || "Registration failed.");
    }
  } catch (err) {
    setMessage("Server error: " + (err as Error).message);
  }
};
  return (
    <div>
      <h2>Create Account</h2>
      <form onSubmit={handleRegister}>
        <input placeholder="First Name" required onChange={(e) => setForm({ ...form, firstName: e.target.value })}/>
        <input placeholder="Last Name" required onChange={(e) => setForm({ ...form, lastName: e.target.value })}/>
        <input placeholder="Username" required onChange={(e) => setForm({ ...form, username: e.target.value })}/>
        <input type="email" placeholder="Email" required onChange={(e) => setForm({ ...form, email: e.target.value })}/>
        <input type="password" placeholder="Password" required onChange={(e) => setForm({ ...form, password: e.target.value })}/>
        <input placeholder="Company Name" onChange={(e) => setForm({ ...form, companyName: e.target.value })}/>
        <input placeholder="Job Title" onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}/>
        <button type="submit" className="register-button">Register</button>
      </form>
      {message && <div className="success-message">{message}</div>}
      <div className="register-link">
        <a onClick={() => setView("login")}>Back to Login</a>
      </div>
    </div>
  );
};

/* ---------------- FORGOT PASSWORD ---------------- */
const ForgotPasswordForm: React.FC<ViewProps> = ({ setView }) => {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const handleSendOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/login/restpass_send-otp?email=${email}`,
        { method: "POST" }
      );
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("resetEmail", email);
        setMsg("OTP sent! Check your inbox.");
        setView("otp");
      } else {
        setMsg(data.message || "Error sending OTP.");
      }
    } catch {
      setMsg("Server error.");
    }
  };

  return (
    <div>
      <h2>Reset Password</h2>
      <form onSubmit={handleSendOtp}>
        <input type="email" value={email} placeholder="Enter your email" required onChange={(e) => setEmail(e.target.value)}/>
        <button type="submit" className="login-button">Send OTP</button>
      </form>
      {msg && <div className="success-message">{msg}</div>}
    </div>
  );
};

/* ---------------- OTP ---------------- */
const OtpVerification: React.FC<ViewProps> = ({ setView }) => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");

  const registerEmail = localStorage.getItem("registerEmail");
  const resetEmail = localStorage.getItem("resetEmail");
  const loginUser = localStorage.getItem("loginUser");
  const trustThisDevice = localStorage.getItem("trustThisDevice") === "true"; // read from storage

  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (registerEmail) {
        const response = await fetch(`${API_BASE_URL}/api/login/registration-verify-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: registerEmail, otp }),
        });
        if (response.ok) {
          setMsg("Registration successful! Please log in.");
          localStorage.removeItem("registerEmail");
          setView("login");
        } else {
          setMsg("Invalid or expired OTP.");
        }
      } else if (resetEmail) {
        const res = await fetch(
          `${API_BASE_URL}/api/login/verify-otp-and-reset-password?Email=${resetEmail}&Otp=${otp}&NewPassword=${newPassword}`,
          { method: "POST" }
        );
        if (res.ok) {
          setMsg("Password reset successful!");
          localStorage.removeItem("resetEmail");
          setView("login");
        } else {
          setMsg("OTP invalid or expired.");
        }
      } else if (loginUser) {
        // ✅ pass trustThisDevice flag to backend
        const res = await fetch(
          `${API_BASE_URL}/api/login/verify_trust_otp?username=${loginUser}&otp=${otp}&trustthisdivice=${trustThisDevice}`,
          { method: "POST" }
        );
        const data = await res.json();
        if (res.ok && data.token) {
          setMsg("Login successful!");
          localStorage.removeItem("loginUser");
          localStorage.removeItem("trustThisDevice");
          navigate("/main"); // ✅ redirect after login
        } else {
          setMsg("Invalid OTP");
        }
      }
    } catch {
      setMsg("Server error.");
    }
  };

  return (
    <div>
      <h2>Enter OTP</h2>
      <form onSubmit={handleVerify}>
        <input
          type="text"
          value={otp}
          placeholder="Enter OTP"
          required
          onChange={(e) => setOtp(e.target.value)}
        />
        {resetEmail && (
          <input
            type="password"
            value={newPassword}
            placeholder="New Password"
            required
            onChange={(e) => setNewPassword(e.target.value)}
          />
        )}
        <button type="submit" className="login-button">Verify</button>
      </form>
      {msg && <div className="success-message">{msg}</div>}
    </div>
  );
};