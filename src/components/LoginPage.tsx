import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";
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
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Function to get browser information
  const getBrowserInfo = () => {
    const userAgent = navigator.userAgent;
    let browserName = "Unknown";
    let browserVersion = "Unknown";
    if (userAgent.indexOf("Chrome") > -1) {
      browserName = "Chrome";
      const chromeVersion = userAgent.match(/Chrome\/(\d+)/);
      if (chromeVersion) browserVersion = chromeVersion[1];
    }
    // Detect Firefox
    else if (userAgent.indexOf("Firefox") > -1) {
      browserName = "Firefox";
      const firefoxVersion = userAgent.match(/Firefox\/(\d+)/);
      if (firefoxVersion) browserVersion = firefoxVersion[1];
    }
    // Detect Safari
    else if (userAgent.indexOf("Safari") > -1) {
      browserName = "Safari";
      const safariVersion = userAgent.match(/Version\/(\d+)/);
      if (safariVersion) browserVersion = safariVersion[1];
    }
    // Detect Edge
    else if (userAgent.indexOf("Edg") > -1) {
      browserName = "Edge";
      const edgeVersion = userAgent.match(/Edg\/(\d+)/);
      if (edgeVersion) browserVersion = edgeVersion[1];
    }
    // Detect IE
    else if (
      userAgent.indexOf("MSIE") > -1 ||
      userAgent.indexOf("Trident/") > -1
    ) {
      browserName = "Internet Explorer";
      const ieVersion = userAgent.match(/(?:MSIE |rv:)(\d+)/);
      if (ieVersion) browserVersion = ieVersion[1];
    }

    return { browserName, browserVersion };
  };

  // Helper functions
  const formatDate = (date: Date) => {
    // Example: 2024-06-13
    return date.toISOString().split("T")[0];
  };

  const formatTime = (date: Date) => {
    // Example: 14:23:45 GMT
    return date.toISOString().split("T")[1].split(".")[0] + " GMT";
  };

  const sendLoginNotificationEmail = async (
    clientName: string,
    companyName: string
  ) => {
    try {
      const now = new Date();
      const { browserName, browserVersion } = getBrowserInfo();

      // Get IP address (this will be done server-side for accuracy)
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

      // Prepare IP link
      const ipLink =
        ipAddress !== "Unavailable"
          ? `<a href="https://whatismyipaddress.com/ip/${ipAddress}" target="_blank">${ipAddress}</a>`
          : ipAddress;

      const emailData = {
        To: "info@groupji.co, rushikeshg@groupji.co", //
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
    debugger;
    try {
      // Special handling for the demo password
      const isDemoLogin = password.toLowerCase() === "pitchcraft123";

      // For demo login, we'll send a special username and the "real" password
      const loginUsername = isDemoLogin ? "Acme" : username;
      const loginPassword = isDemoLogin ? "Ace2025%" : password;
      // Call the existing login endpoint
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          username: loginUsername,
          password: loginPassword,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const token = data.token;
        const clientID = data.clientID;
        const IsAdmin = data.isadmin;
        const IsDemoAccount = data.isDemoAccount || isDemoLogin; // Set demo flag if using demo password
        const FirstName = isDemoLogin ? "John" : data.firstName;
        const LastName = isDemoLogin ? "Doe" : data.lastName;
        const companyName = data.companyName || "Acme Corporation";

        // In demo mode, we use the original entered username for tracking
        const clientName = isDemoLogin
          ? username // Use what the user actually entered
          : [FirstName, LastName].filter(Boolean).join(" ") || username;

        sessionStorage.setItem("clientId", clientID);
        sessionStorage.setItem("isAdmin", IsAdmin);
        sessionStorage.setItem("isDemoAccount", String(IsDemoAccount));

        if (token) {
          dispatch(setToken(token));
          // In demo mode, we still save the original username for tracking
          // This helps identify who used the demo login
          dispatch(saveUserName(isDemoLogin ? username : loginUsername));

          // For display purposes, we might want John Doe:
          if (FirstName) {
            dispatch(saveFirstName(FirstName));
          }
          if (LastName) {
            dispatch(saveLastName(LastName));
          }

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
              const ipResponse = await fetch(
                "https://api.ipify.org?format=json"
              );
              if (ipResponse.ok) {
                const ipData = await ipResponse.json();
                ipAddress = ipData.ip;
              }
            } catch (error) {
              // Optionally log error
            }

            dispatch(
              saveLoginDeviceInfo({
                ipAddress,
                browserName,
                browserVersion,
              })
            );

            // Special handling for email if this was a demo login
            if (isDemoLogin) {
              // Add "DEMO LOGIN" to the subject to make it clear
              await sendLoginNotificationEmail(
                `DEMO Client: ${username}`, // Make it clear this was demo login with the entered username
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

  useEffect(() => {
    return () => {
      setLoader(false);
    };
  }, []);

  return (
    <div className="login-container page d-flex flex-col">
      <h1 className="text-[24px] text-white mb-4">Login to PitchKraft</h1>
      <div className="login-box mb-10">
        <form onSubmit={handleLogin}>
          {" "}
          {/* Use onSubmit directly */}
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
          <div className="form-group mb-0">
            <button
              type="submit"
              className="button save-button d-flex justify-center"
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
                      <path d="M55.89,262.818c-3-26-0.5-51.1,6.3-74.3c22.6-77.1,93.5-133.8,177.6-134.8v-50.4c0-2.8,3.5-4.3,5.8-2.6l103.7,76.2    c1.7,1.3,1.7,3.9,0,5.1l-103.6,76.2c-2.4,1.7-5.8,0.2-5.8-2.6v-50.3c-55.3,0.9-102.5,35-122.8,83.2c-7.7,18.2-11.6,38.3-10.5,59.4    c1.5,29,12.4,55.7,29.6,77.3c9.2,11.5,7,28.3-4.9,37c-11.3,8.3-27.1,6-35.8-5C74.19,330.618,59.99,298.218,55.89,262.818z     M355.29,166.018c17.3,21.5,28.2,48.3,29.6,77.3c1.1,21.2-2.9,41.3-10.5,59.4c-20.3,48.2-67.5,82.4-122.8,83.2v-50.3    c0-2.8-3.5-4.3-5.8-2.6l-103.7,76.2c-1.7,1.3-1.7,3.9,0,5.1l103.6,76.2c2.4,1.7,5.8,0.2,5.8-2.6v-50.4    c84.1-0.9,155.1-57.6,177.6-134.8c6.8-23.2,9.2-48.3,6.3-74.3c-4-35.4-18.2-67.8-39.5-94.4c-8.8-11-24.5-13.3-35.8-5    C348.29,137.718,346.09,154.518,355.29,166.018z" />
                    </g>
                  </g>
                </svg>
              )}
              <span className="ml-5">Log in</span>
            </button>
          </div>
        </form>
      </div>
      {error && <div className="alert alert-danger error-message">{error}</div>}
    </div>
  );
};

export default LoginPage;
