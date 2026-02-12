import React, { CSSProperties, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  saveUserId,
  saveUserName,
  saveUserRole,
  saveFirstName,
  saveLastName,
  saveEmail,
  setToken,
  saveLoginDeviceInfo,
  saveUserCredit
} from "../slices/authSLice";
import { useOtpTimer } from "../hooks/useOtpTimer";
import { usePageTitle } from "../hooks/usePageTitle";
import API_BASE_URL from "../config";
import "./LoginPage.css";
import { RootState } from "../Redux/store";

type ViewMode = "login" | "register" | "forgot" | "otp";

interface ViewProps {
  setView: React.Dispatch<React.SetStateAction<ViewMode>>;
  style?: CSSProperties;
}

// Cookie helper functions
const setCookie = (name: string, value: string, days: number) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

const getCookie = (name: string): string | null => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

/* ---------------- LOGIN FORM ---------------- */
const LoginForm: React.FC<ViewProps> = ({ setView }) => {
  const reduxUserId = useSelector((state: RootState) => state.auth.userId);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log("User ID from Redux:", reduxUserId);
  }, [reduxUserId]);

  const getUserIdFromToken = (token: string) => {
    try {
      const payloadBase64 = token.split(".")[1];
      const payloadJson = atob(payloadBase64);
      const payload = JSON.parse(payloadJson);
      return payload.UserId;
    } catch (error) {
      console.error("Error decoding token:", error);
      return null;
    }
  };

  const getUserRoleFromToken = (token: string) => {
    try {
      const payloadBase64 = token.split(".")[1];
      const payloadJson = atob(payloadBase64);
      const payload = JSON.parse(payloadJson);
      return payload.UserRole;
    } catch (error) {
      console.error("Error decoding token:", error);
      return null;
    }
  };

  const getFirstNameFromToken = (token: string) => {
    try {
      const payloadBase64 = token.split(".")[1];
      const payloadJson = atob(payloadBase64);
      const payload = JSON.parse(payloadJson);
      return payload.firstname;
    } catch (error) {
      console.error("Error decoding token:", error);
      return null;
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const trustedDeviceNumber = getCookie("trustedDeviceNumber");
      console.log("All cookies:", document.cookie);
      console.log("Trusted device cookie:", trustedDeviceNumber);

      const body: any = { username, password };

      if (
        trustedDeviceNumber &&
        trustedDeviceNumber.trim() !== "" &&
        trustedDeviceNumber !== "undefined" &&
        !isNaN(Number(trustedDeviceNumber))
      ) {
        body.trustednumber = Number(trustedDeviceNumber);
        console.log("✅ trustednumber added in body:", body.trustednumber);
      } else {
        console.log("🚫 No valid trusted device number found, skipping...");
      }

      const response = await fetch(`${API_BASE_URL}/api/login/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      let data: any;
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (response.ok && data.token) {
        localStorage.setItem("token", data.token);   // ✅ ADD THIS LINE
        dispatch(setToken(data.token));


        const userId = getUserIdFromToken(data.token);
        const userRole = getUserRoleFromToken(data.token);
        const firstName = getFirstNameFromToken(data.token);

        console.log('Login Debug:', { dataFirstName: data.firstName, tokenFirstName: firstName, username });

        dispatch(saveUserName(username));
        if (userId) dispatch(saveUserId(userId));
        if (userRole) dispatch(saveUserRole(userRole));
        if (data.email) dispatch(saveEmail(data.email));

        sessionStorage.setItem("clientId", data.clientId || data.clientID || userId?.toString() || "");
        sessionStorage.setItem("isAdmin", data.isAdmin || "false");
        sessionStorage.setItem("isDemoAccount", data.isDemoAccount || "false");

        // Fix: Ensure firstName from token is dispatched
        if (firstName) dispatch(saveFirstName(firstName));
        if (data.firstName) dispatch(saveFirstName(data.firstName));
        if (data.lastName) dispatch(saveLastName(data.lastName));

        try {
          const creditRes = await fetch(
            `${API_BASE_URL}/api/Crm/user_credit?clientId=${userId}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${data.token}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (creditRes.ok) {
            const creditData = await creditRes.json();
            dispatch(saveUserCredit(creditData));
            console.log("User Credit:", creditData);

            if (creditData === 0 && !localStorage.getItem('creditModalSkipped')) {
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('showCreditModal'));
              }, 1000);
            }
          } else {
            console.error("Failed to fetch user credit");
          }
        } catch (err) {
          console.error("Credit API error:", err);
        }

        localStorage.removeItem('creditModalSkipped');
        navigate("/main");
        return;
      }
      else if (
        response.ok &&
        (data.success || data.message?.toLowerCase().includes("otp"))
      ) {
        storeLoginCredentials(username, password);
        setView("otp");
      } else {
        setError(data.message || "Invalid login credentials.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Server error. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const storeLoginCredentials = (username: string, password: string) => {
    localStorage.setItem("loginUser", username);
    localStorage.setItem("loginPassword", password);
  };

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("demo") === "true") {
    setUsername("Acme");
    setPassword("pitchcraft123");
  }
}, []);



  return (
    <div>
      <h2>Login to PitchKraft</h2>
      <form onSubmit={handleLogin}>
        <label>User name</label>
        <input
          type="text"
          placeholder="Username"
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
        <button type="submit" className="login-button" disabled={isLoading}>
          {isLoading ? (
            <>
              <div className="spinner"></div>
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </button>
      </form>
      {error && <div className="error-message">{error}</div>}
      <div className="register-link">
        <a onClick={() => setView("forgot")}>Forgot password?</a> |{" "}
        <a onClick={() => setView("register")}>Create account</a>
      </div>
    </div>
  );
};

/* ---------------- REGISTER FORM ---------------- */
const RegisterForm: React.FC<ViewProps> = ({ setView }) => {
  const dispatch = useDispatch();

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
  const [error, setError] = useState("");
  const [passwordValid, setPasswordValid] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    setError("");
    if (!passwordValid) {
      alert("Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/login/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      let data;
      try {
        const text = await response.text();
        data = text ? { message: text } : { message: "Success" };
      } catch {
        data = { message: "Registration successful" };
      }

      if (response.ok) {
        localStorage.setItem("registerEmail", form.email);
        localStorage.setItem("registerUsername", form.username);
        localStorage.setItem("registerPassword", form.password);
        dispatch(saveEmail(form.email));

        setMessage("OTP sent to your email!");
        setTimeout(() => setView("otp"), 2000);
      } else {
        setError(data?.message || "Registration failed.");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError("Server error: " + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginTop: '-10px' }}>Create account</h2>
      <form onSubmit={handleRegister}>
        <div className="name-fields">
          <div className="name-field">
            <label>First name*</label>
            <input
              placeholder="First name"
              required
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </div>
          <div className="name-field">
            <label>Last name*</label>
            <input
              placeholder="Last Name"
              required
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </div>
        </div>
        <div className="name-field">
          <label>Email*</label>
          <input
            type="email"
            placeholder="Email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="name-fields">
          <div className="name-field">
            <label>User name*</label>
            <input
              placeholder="User name"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>
          {/* <div className="name-field">
            <label>Password*</label>
            <input
              type="password"
              placeholder="Password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div> */}
          <div className="form-group">
            <label>Password*</label>
            <div
              className={`password-wrapper ${passwordTouched && !passwordValid
                ? "invalid"
                : passwordValid
                  ? "valid"
                  : ""
                }`}
            >
              <input
                type="password"
                placeholder="Enter password"
                value={form.password}
                onFocus={() => setPasswordTouched(true)}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm({ ...form, password: value });
                  setPasswordValid(value.length >= 8);
                }}
                required
              />
            </div>

            {passwordTouched && (
              <div
                className={`password-hint ${passwordValid ? "hint-valid" : "hint-invalid"
                  }`}
              >
                {passwordValid ? "✓" : "✕"} At least 8 characters long
              </div>
            )}
          </div>

        </div>
        <div className="name-field">
          <label>Company name</label>
          <input
            placeholder="Company name"
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
          />
        </div>
        <div className="name-field">
          <label>Job title</label>
          <input
            placeholder="Job title"
            value={form.jobTitle}
            onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
          />
        </div>
        <button type="submit" className="register-button" disabled={isLoading}>
          {isLoading ? (
            <>
              <div className="spinner"></div>
              Registering...
            </>
          ) : (
            "Register"
          )}
        </button>
      </form>
      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}
      <div className="register-link">
        <a onClick={() => setView("login")}>Back to login</a>
      </div>
    </div>
  );
};

/* ---------------- FORGOT PASSWORD FORM ---------------- */
const ForgotPasswordForm: React.FC<ViewProps> = ({ setView }) => {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg("");
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/login/restpass_send-otp?email=${email}`,
        { method: "POST" }
      );

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("resetEmail", email);
        setMsg("OTP sent! Check your inbox.");
        setTimeout(() => setView("otp"), 2000);
      } else {
        setError(data.message || "Error sending OTP.");
      }
    } catch {
      setError("Server error.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2>Reset password</h2>
      <form onSubmit={handleSendOtp}>
        <input
          type="email"
          value={email}
          placeholder="Enter your email"
          required
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="login-button" disabled={isLoading}>
          {isLoading ? (
            <>
              <div className="spinner"></div>
              Sending...
            </>
          ) : (
            "Send OTP"
          )}
        </button>
      </form>
      {msg && <div className="success-message">{msg}</div>}
      {error && <div className="error-message">{error}</div>}
      <div className="register-link">
        <a onClick={() => setView("login")}>Back to login</a>
      </div>
    </div>
  );
};

/* ---------------- OTP VERIFICATION ---------------- */
const OtpVerification: React.FC<ViewProps> = ({ setView }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [trustThisDevice, setTrustThisDevice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { timeLeft, isExpired, startTimer, formatTime } = useOtpTimer();

  React.useEffect(() => {
    startTimer();
  }, []);

  const registerEmail = localStorage.getItem("registerEmail");
  const registerUsername = localStorage.getItem("registerUsername");
  const registerPassword = localStorage.getItem("registerPassword");
  const resetEmail = localStorage.getItem("resetEmail");
  const loginUser = localStorage.getItem("loginUser");
  const loginPassword = localStorage.getItem("loginPassword");

  const getUserIdFromToken = (token: string) => {
    try {
      const payloadBase64 = token.split(".")[1];
      const payloadJson = atob(payloadBase64);
      const payload = JSON.parse(payloadJson);
      return payload.UserId;
    } catch (error) {
      console.error("Error decoding token:", error);
      return null;
    }
  };

  const getUserRoleFromToken = (token: string) => {
    try {
      const payloadBase64 = token.split(".")[1];
      const payloadJson = atob(payloadBase64);
      const payload = JSON.parse(payloadJson);
      return payload.UserRole;
    } catch (error) {
      console.error("Error decoding token:", error);
      return null;
    }
  };

  const getFirstNameFromToken = (token: string) => {
    try {
      const payloadBase64 = token.split(".")[1];
      const payloadJson = atob(payloadBase64);
      const payload = JSON.parse(payloadJson);
      return payload.firstname;
    } catch (error) {
      console.error("Error decoding token:", error);
      return null;
    }
  };

  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg("");
    setError("");
    setIsLoading(true);

    try {
      // Registration OTP verification
      if (registerEmail) {
        const response = await fetch(`${API_BASE_URL}/api/login/registration-verify-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: registerEmail, otp }),
        });

        const contentType = response.headers.get("content-type");
        let data: any = {};

        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
        } else {
          data = { message: await response.text() || "Success" };
        }

        if (response.ok) {
          localStorage.removeItem("registerEmail");
          localStorage.removeItem("registerUsername");
          localStorage.removeItem("registerPassword");
          setMsg("Registration successful! Logging you in...");
          setTimeout(() => setView("login"), 2000);
        } else {
          setError(data.message || "Invalid or expired OTP.");
        }
      }
      // Password reset OTP verification
      else if (resetEmail) {
        const res = await fetch(
          `${API_BASE_URL}/api/login/verify-otp-and-reset-password?Email=${resetEmail}&Otp=${otp}&NewPassword=${newPassword}`,
          { method: "POST" }
        );

        const contentType = res.headers.get("content-type");
        let data: any = {};

        if (contentType && contentType.includes("application/json")) {
          data = await res.json();
        }

        if (res.ok) {
          setMsg("Password reset successful! Please log in with your new password.");
          localStorage.removeItem("resetEmail");
          setTimeout(() => setView("login"), 2000);
        } else {
          setError(data.message || "OTP invalid or expired.");
        }
      }
      // Login OTP verification (with trust device)
      else if (loginUser) {
        const res = await fetch(
          `${API_BASE_URL}/api/login/verify_trust_otp?username=${loginUser}&otp=${otp}&trustthisdivice=${trustThisDevice}`,
          { method: "POST" }
        );

        const contentType = res.headers.get("content-type");
        let data: any = {};

        if (contentType && contentType.includes("application/json")) {
          data = await res.json();
        }

        if (res.ok && data.token) {
          localStorage.setItem("token", data.token);   // ✅ ADD THIS LINE
          dispatch(setToken(data.token));


          const userId = getUserIdFromToken(data.token);
          const userRole = getUserRoleFromToken(data.token);
          const firstName = getFirstNameFromToken(data.token);

          dispatch(saveUserName(loginUser));
          if (userId) dispatch(saveUserId(userId));
          if (userRole) dispatch(saveUserRole(userRole));
          if (data.email) dispatch(saveEmail(data.email));

          sessionStorage.setItem("clientId", data.clientId || data.clientID || userId?.toString() || "");
          sessionStorage.setItem("isAdmin", data.isAdmin || "false");
          sessionStorage.setItem("isDemoAccount", data.isDemoAccount || "false");

          if (firstName) dispatch(saveFirstName(firstName));
          if (data.firstName) dispatch(saveFirstName(data.firstName));
          if (data.lastName) dispatch(saveLastName(data.lastName));

          if (trustThisDevice && data.trustenumber) {
            setCookie("trustedDeviceNumber", data.trustenumber.toString(), 30);
          }

          try {
            const creditRes = await fetch(
              `${API_BASE_URL}/api/Crm/user_credit?clientId=${userId}`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${data.token}`,
                  "Content-Type": "application/json",
                },
              }
            );

            if (creditRes.ok) {
              const creditData = await creditRes.json();
              dispatch(saveUserCredit(creditData));
              console.log("User Credit after OTP:", creditData);

              if (creditData === 0 && !localStorage.getItem('creditModalSkipped')) {
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('showCreditModal'));
                }, 1000);
              }
            } else {
              console.error("Failed to fetch user credit after OTP");
            }
          } catch (err) {
            console.error("Credit API error after OTP:", err);
          }

          localStorage.removeItem("loginUser");
          localStorage.removeItem("loginPassword");
          localStorage.removeItem("trustThisDevice");
          localStorage.removeItem('creditModalSkipped');

          navigate("/main");
        } else {
          setError(data.message || "Invalid OTP");
        }
      }
    } catch (err) {
      console.error("OTP verification error:", err);
      setError("An error occurred while verifying OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResending(true);
    setError("");
    setMsg("");

    try {
      if (loginUser && loginPassword) {
        const trustedDeviceNumber = getCookie("trustedDeviceNumber");
        const body: any = { username: loginUser, password: loginPassword };

        if (
          trustedDeviceNumber &&
          trustedDeviceNumber.trim() !== "" &&
          trustedDeviceNumber !== "undefined" &&
          !isNaN(Number(trustedDeviceNumber))
        ) {
          body.trustednumber = Number(trustedDeviceNumber);
        }

        const response = await fetch(`${API_BASE_URL}/api/login/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        let data: any;
        try {
          data = await response.json();
        } catch {
          data = {};
        }

        if (response.ok && (data.success || data.message?.toLowerCase().includes("otp"))) {
          setMsg("OTP resent successfully!");
          startTimer();
          setTimeout(() => setMsg(""), 3000);
        } else {
          setError("Failed to resend OTP. Please try again.");
        }
      }
    } catch (err) {
      console.error("Resend OTP error:", err);
      setError("Error resending OTP. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div>
      <h2>Enter OTP</h2>
      <p style={{ fontSize: "14px", color: "#666", marginBottom: "20px" }}>
        {registerEmail && "Please enter the OTP sent to your email to complete registration."}
        {resetEmail && "Please enter the OTP and your new password."}
        {loginUser && "Please enter the OTP sent to your email to complete login."}
      </p>

      <form onSubmit={handleVerify}>
        <input
          type="text"
          value={otp}
          placeholder="Enter OTP"
          required
          onChange={(e) => setOtp(e.target.value)}
          maxLength={6}
          disabled={isExpired}
        />

        {/* {loginUser && (
          <div style={{ margin: "10px 0" }}>
            <label>
              <input
                type="checkbox"
                checked={trustThisDevice}
                onChange={(e) => setTrustThisDevice(e.target.checked)}
              />{" "}
              Trust this device (Don't ask for OTP for 30 days)
            </label>
          </div>
        )} */}
        {loginUser && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              margin: "0px 0px 5px",
            }}
          >
            <input
              type="checkbox"
              id="trustDevice"
              checked={trustThisDevice}
              onChange={(e) => setTrustThisDevice(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            <label
              htmlFor="trustDevice"
              style={{
                fontSize: "14px",
                color: "#444",
                cursor: "pointer",
              }}
            >
              Trust this device (Don't ask for OTP for 30 days)
            </label>
          </div>
        )}

        {resetEmail && (
          <input
            type="password"
            value={newPassword}
            placeholder="New Password"
            required
            onChange={(e) => setNewPassword(e.target.value)}
          />
        )}

        <button type="submit" className="login-button" disabled={isLoading || isExpired}>
          {isLoading ? (
            <>
              <div className="spinner"></div>
              Verifying...
            </>
          ) : isExpired ? (
            "OTP Expired"
          ) : (
            "Verify OTP"
          )}
        </button>
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

      {isExpired && loginUser && (
        <button
          type="button"
          onClick={handleResendOtp}
          disabled={isResending}
          className="login-button"
          style={{
            width: '100%',
            marginTop: '15px',
            backgroundColor: isResending ? '#ccc' : '#007bff'
          }}
        >
          {isResending ? (
            <>
              <div className="spinner"></div>
              Resending...
            </>
          ) : (
            'Resend OTP'
          )}
        </button>
      )}

      {msg && <div className="success-message">{msg}</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="register-link">
        <a
          onClick={() => {
            localStorage.removeItem("registerEmail");
            localStorage.removeItem("registerUsername");
            localStorage.removeItem("registerPassword");
            localStorage.removeItem("resetEmail");
            localStorage.removeItem("loginUser");
            localStorage.removeItem("loginPassword");
            localStorage.removeItem("trustThisDevice");
            setView("login");
          }}
        >
          Back to login
        </a>
      </div>
    </div>
  );
};

/* ---------------- MAIN LOGIN PAGE COMPONENT ---------------- */
const LoginPage: React.FC = () => {
  const [view, setView] = useState<ViewMode>("login");
  
  usePageTitle(view === "login" ? "Login" : view === "register" ? "Register" : view === "forgot" ? "Forgot Password" : "OTP Verification");

  return (
    <div className="page login-container">
      <div className={`login-boxx ${view === 'register' ? 'register-offset' : ''}`}>
        {view === "login" && <LoginForm setView={setView} />}
        {view === "register" && <RegisterForm setView={setView} />}
        {view === "forgot" && <ForgotPasswordForm setView={setView} />}
        {view === "otp" && <OtpVerification setView={setView} />}
      </div>
    </div>
  );
};

export default LoginPage;