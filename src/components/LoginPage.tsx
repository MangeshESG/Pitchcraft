import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  saveUserId,
  saveUserName,
  saveUserRole,
  saveFirstName,
  saveLastName,
  setToken,
  saveLoginDeviceInfo,
} from "../slices/authSLice";
import API_BASE_URL from "../config";

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loader, setLoader] = useState(false);
  const [otp, setOtp] = useState("");
  const [trustThisDevice, setTrustThisDevice] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};


  // Function to get browser information
  const getBrowserInfo = () => {
    const userAgent = navigator.userAgent;
    let browserName = "Unknown";
    let browserVersion = "Unknown";
    if (userAgent.indexOf("Chrome") > -1) {
      browserName = "Chrome";
      const chromeVersion = userAgent.match(/Chrome\/(\d+)/);
      if (chromeVersion) browserVersion = chromeVersion[1];
    } else if (userAgent.indexOf("Firefox") > -1) {
      browserName = "Firefox";
      const firefoxVersion = userAgent.match(/Firefox\/(\d+)/);
      if (firefoxVersion) browserVersion = firefoxVersion[1];
    } else if (userAgent.indexOf("Safari") > -1) {
      browserName = "Safari";
      const safariVersion = userAgent.match(/Version\/(\d+)/);
      if (safariVersion) browserVersion = safariVersion[1];
    } else if (userAgent.indexOf("Edg") > -1) {
      browserName = "Edge";
      const edgeVersion = userAgent.match(/Edg\/(\d+)/);
      if (edgeVersion) browserVersion = edgeVersion[1];
    } else if (
      userAgent.indexOf("MSIE") > -1 ||
      userAgent.indexOf("Trident/") > -1
    ) {
      browserName = "Internet Explorer";
      const ieVersion = userAgent.match(/(?:MSIE |rv:)(\d+)/);
      if (ieVersion) browserVersion = ieVersion[1];
    }
    return { browserName, browserVersion };
  };

  const formatDate = (date: Date) => date.toISOString().split("T")[0];

  const formatTime = (date: Date) =>
    date.toISOString().split("T")[1].split(".")[0] + " GMT";

  const sendLoginNotificationEmail = async (
    clientName: string,
    companyName: string
  ) => {
    try {
      const now = new Date();
      const { browserName, browserVersion } = getBrowserInfo();

      let ipAddress = "Unavailable";
      try {
        const ipResponse = await fetch("https://api.ipify.org?format=json");
        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          ipAddress = ipData.ip;
        }
      } catch (error) {
        console.error("Error fetching IP address:", error);
      }

      const ipLink =
        ipAddress !== "Unavailable"
          ? `<a href="https://whatismyipaddress.com/ip/${ipAddress}" target="_blank">${ipAddress}</a>`
          : ipAddress;

      const emailData = {
        To: "info@groupji.co, rushikeshg@groupji.co",
        Subject: `Login Activity - ${clientName}`,
        Body: `
        <html>
        <head>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                }
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                }
                .header {
                    font-size: 18px;
                    margin-bottom: 20px;
                }
                ul {
                    list-style-type: none;
                    padding-left: 10px;
                }
                li {
                    margin-bottom: 8px;
                }
                .section {
                    margin-top: 20px;
                    margin-bottom: 20px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <p class="header">Hello,</p>
                
                  <p>Below are the login activity details on pitch generator (<a href="https://pitch.dataji.co/">https://pitch.dataji.co/</a>) site:</p>

                <ul>
                    <li> Client name: ${clientName}</li>
                    <li> Company name: ${companyName}</li>
                </ul>
                
                <div class="section">
                    <ul>
                        <li> Login date: ${formatDate(now)}</li>
                        <li> Login time: ${formatTime(now)}</li>
                    </ul>
                </div>
                
                <p>The client was logged on the following machine:</p>
                <ul>
                    <li> IP address: ${ipLink}</li>
                </ul>
                
                <p>The browser used to login was:</p>
                <ul>
                    <li> Browser: ${browserName}</li>
                    <li> Browser version: ${browserVersion}</li>
                </ul>
            </div>
        </body>
        </html>
      `,
      };

      const response = await fetch(`${API_BASE_URL}/api/auth/sendemail`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        console.error("Failed to send login notification email");
      } else {
        console.log("Login notification email sent successfully");
      }
    } catch (error) {
      console.error("Error sending login notification email:", error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoader(true);
    try {
      const isDemoLogin = password.toLowerCase() === "pitchcraft123";
      const loginUsername = isDemoLogin ? "Acme" : username;
      const loginPassword = isDemoLogin ? "Ace2025%" : password;
       const trustNumberFromCookie = getCookie("trustenumber");

    // If there's no cookie, continue without showing any error
    // Don't halt the process if no cookie exists
    const trustedNumber = trustNumberFromCookie || "0"; // Default to an empty string if no cookie

      const response = await fetch("https://test.pitchkraft.ai/api/Login/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
          trustednumber: trustedNumber,
        }),
      });

      const data = await response.json();

      if (data.success && data.message === "OTP sent successfully") {
        setShowOtp(true);
        setOtpMessage("");
        setLoader(false);
        return;
      }

      if (response.ok) {
        const token = data.token;
        const clientID = data.clientID;
        const IsAdmin = data.isadmin;
        const IsDemoAccount = data.isDemoAccount || isDemoLogin;
        const FirstName = isDemoLogin ? "John" : data.firstName;
        const LastName = isDemoLogin ? "Doe" : data.lastName;
        const companyName = data.companyName || "Acme Corporation";

        const clientName = isDemoLogin
          ? username
          : [FirstName, LastName].filter(Boolean).join(" ") || username;

        sessionStorage.setItem("clientId", clientID);
        sessionStorage.setItem("isAdmin", IsAdmin);
        sessionStorage.setItem("isDemoAccount", String(IsDemoAccount));

        if (token) {
          dispatch(setToken(token));
          dispatch(saveUserName(isDemoLogin ? username : loginUsername));
          if (FirstName) dispatch(saveFirstName(FirstName));
          if (LastName) dispatch(saveLastName(LastName));

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

          const userId = getUserIdFromToken(token);
          const userRole = getUserRoleFromToken(token);

          if (userId) {
            dispatch(saveUserId(userId));
            dispatch(saveUserRole(userRole || "ADMIN"));

            const { browserName, browserVersion } = getBrowserInfo();

            let ipAddress = "Unavailable";
            try {
              const ipResponse = await fetch("https://api.ipify.org?format=json");
              if (ipResponse.ok) {
                const ipData = await ipResponse.json();
                ipAddress = ipData.ip;
              }
            } catch (error) {}

            dispatch(
              saveLoginDeviceInfo({
                ipAddress,
                browserName,
                browserVersion,
              })
            );

            if (isDemoLogin) {
              await sendLoginNotificationEmail(
                `DEMO Client: ${username}`,
                companyName
              );
            } else {
              await sendLoginNotificationEmail(clientName, companyName);
            }

            navigate("/main");
          } else {
            console.error("User ID not found in token.");
            setError(
              "Login successful, but user ID could not be retrieved. Please try again."
            );
          }
        } else {
          setError("Username or Password is incorrect.");
        }
      } else {
        setError("Username or Password is incorrect.");
      }
    } catch (error) {
      setError("Username or Password is incorrect.");
    } finally {
      setLoader(false);
    }
  };

  const handleVerifyOtp = async () => {
  setOtpMessage("");
  setLoader(true);
  try {
    const response = await fetch(
      `https://test.pitchkraft.ai/api/Login/verify_trust_otp?username=${username}&otp=${otp}&trustthisdivice=${trustThisDevice}`,
      {
        method: "POST",
        headers: {
          accept: "*/*",
        },
        body: "",
      }
    );

    if (response.ok) {
      const data = await response.json();

      // Save trustenumber cookie (expires in 7 days)
      const trustenumber = data.trustenumber;
      if (trustenumber) {
        document.cookie = `trustenumber=${trustenumber}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
      }

      setOtpMessage("OTP Verified Successfully!");
      navigate("/main");
    } else {
      setOtpMessage("OTP verification failed. Please try again.");
    }
  } catch (error) {
    setOtpMessage("Error verifying OTP. Please try again.");
  } finally {
    setLoader(false);
  }
};

  useEffect(() => {
    return () => {
      setLoader(false);
    };
  }, []);

  return (
    <div className="login-container page d-flex flex-col">
      <h1 style={{ color: "white" }}>Login to Pitchcraft</h1>

      {!showOtp ? (
        <div className="login-box mb-10">
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>User name</label>
              <input
                type="text"
                placeholder="Email address"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: "10px",
              }}
            >
              <Link
                to="/forgot-password"
                style={{ color: "#0b0404ff", textDecoration: "none" }}
              >
                Forgot Password
              </Link>
            </div>
            <div className="form-group mb-0">
              <button
                type="submit"
                className="button save-button d-flex justify-center"
                disabled={loader}
              >
                {loader && (
                  <svg
                    className={`${loader && "spin"}`}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="#ffffff"
                    height="20px"
                    width="20px"
                    version="1.1"
                    id="Capa_1"
                    viewBox="0 0 491.236 491.236"
                  >
                    <g>
                      <g>
                        <path d="M55.89,262.818c-3-26-0.5-51.1,6.3-74.3c22.6-77.1,93.5-133.8,177.6-134.8v-50.4c0-2.8,3.5-4.3,5.8-2.6l103.7,76.2 c1.7,1.3,1.7,4,0,5.2l-103.7,76.2c-2.3,1.7-5.8,0.2-5.8-2.6v-48.1c-68,0.9-124.5,46.6-140.3,112.2c-3.1,12.2-4.2,26-3.4,41.3 c1.4,31.1,15.6,60.4,40.1,78.7c18.2,14.3,42.4,22.6,69.8,22.6c49.2,0,89.1-39.9,89.1-89.1v-46c0-2.5,3.1-3.8,4.8-2l19.4,20.7 c6.9,7.3,12.3,16.2,15.6,26.3c0.1,0.2,0.3,0.5,0.4,0.7c-1.7,40.2-34.4,72.5-74.9,72.5c-31.1,0-57.9-20-68.2-48.1 C64.99,288.318,60.59,275.418,55.89,262.818z" />
                      </g>
                    </g>
                  </svg>
                )}
                &nbsp;Login
              </button>
            </div>
            
           </form>
           <div className="register-link mt-10">
            <p>Don't have an account?</p>
            <button
              type="button"
              className="button save-button d-flex justify-center"
              onClick={() => navigate("/register")}
            >
              Register
            </button>
          </div>
      </div>
    ) : (
      <div className="login-box mb-10">
        <form onSubmit={(e) => { e.preventDefault(); handleVerifyOtp(); }}>
          <div className="form-group">
            <label htmlFor="otp">Enter OTP</label>
            <input
              type="text"
              id="otp"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </div>
          <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              className="custom-checkbox"
              checked={trustThisDevice}
              onChange={() => setTrustThisDevice(!trustThisDevice)}
            />
            Trust this device
          </label>
        </div>
          <div className="form-group mb-0">
            <button
              type="submit"
              className="button save-button d-flex justify-center"
              disabled={loader}
            >
              {loader ? "Verifying..." : "Verify OTP"}
            </button>
          </div>
          {otpMessage && <p>{otpMessage}</p>}
        </form>
      </div>
    )}

    {error && <p style={{ color: "red" }}>{error}</p>}
  </div>
  );
};

export default LoginPage;
