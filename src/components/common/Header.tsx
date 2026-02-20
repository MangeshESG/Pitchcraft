import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { RootState } from "../../Redux/store";
import { clearToken } from "../../slices/authSLice";
import { useCreditRefresh } from "../../hooks/useCreditRefresh";

interface HeaderProps {
  connectTo: boolean;
  selectedClient?: string;
  handleClientChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  clientNames?: Client[];
  userRole?: string;
  onUpgradeClick: () => void;
  onCreditClick?: () => void;
}

interface Client {
  clientID: number;
  firstName: string;
  lastName: string;
  companyName: string;
}

const Header: React.FC<HeaderProps> = React.memo(
  ({ connectTo, selectedClient, handleClientChange, clientNames = [], userRole, onUpgradeClick, onCreditClick }) => {
    const firstName = useSelector((state: RootState) => state.auth.firstName);
    const lastName = useSelector((state: RootState) => state.auth.lastName);
    const username = useSelector((state: RootState) => state.auth.username) as string;
    const reduxUserId = useSelector((state: RootState) => state.auth.userId);
    
    // Use the credit refresh hook
    const { credits, refreshCredits } = useCreditRefresh();

    console.log('Header Debug:', { firstName, username });

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

const logoutHandler = () => {
  dispatch(clearToken());

  localStorage.removeItem("selectedModel");

  // ✅ CRITICAL FIX — prevents stale clientId bugs
  localStorage.removeItem("selectedClientId");
  sessionStorage.removeItem("selectedClientId");

  navigate("/");
};

    const toggleMenu = () => setIsMenuOpen((prev) => !prev);

    const effectiveUserId = React.useMemo(() => {
      const storedClientId =
        localStorage.getItem("selectedClientId") ||
        sessionStorage.getItem("selectedClientId");

      if (storedClientId && storedClientId !== "" && storedClientId !== "null") {
        return storedClientId;
      }

      if (selectedClient && selectedClient !== "") {
        return selectedClient;
      }

      return reduxUserId?.toString();
    }, [selectedClient, reduxUserId]);

    useEffect(() => {
  if (selectedClient && selectedClient !== "") {
    localStorage.setItem("selectedClientId", selectedClient);
    sessionStorage.setItem("selectedClientId", selectedClient); // optional but nice
  }
}, [selectedClient]);
    // Refresh credits when effectiveUserId changes
    useEffect(() => {
      if (effectiveUserId) {
        refreshCredits(effectiveUserId);
      }
    }, [effectiveUserId, refreshCredits]);

    return (
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
          background: "#fff",
         // borderBottom: "1px solid #e5e5e5",
          width: "100%"
        }}
      >
         <div
          style={{
            display: "grid",
            gridTemplateColumns: "260px 1fr auto",
            alignItems: "center",
          //  padding: "12px 20px",
            width: "100%"
          }}
        >
          <div>
          {/* CLIENT DROPDOWN */}
          {userRole === "ADMIN" && handleClientChange && (
            <div style={{
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  width: "240px"
                }}>
              <select
                value={selectedClient || ""}
                onChange={handleClientChange}
               style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    background: "transparent"
                  }}
              >
                <option value="">Select a client</option>
                {clientNames.map((client) => (
                  <option key={client.clientID} value={client.clientID.toString()}>
                    {`${client.firstName} ${client.lastName} - ${client.companyName}`}
                  </option>
                ))}
              </select>
            </div>
          )}
            </div>
             <div />

          {/* USER INFO */}
          <div style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              whiteSpace: "nowrap"
            }}>
            <div className="item flex items-center">
              {/* <div className="user-info-wrapper flex items-center gap-2">
                <div className="user-greeting d-flex align-center mx-[0px] sticky-right"> */}
                  <span className="mr-5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 16 16" fill="none">
                      <path d="M8 7C9.65685 7 11 5.65685 11 4C11 2.34315 9.65685 1 8 1C6.34315 1 5 2.34315 5 4C5 5.65685 6.34315 7 8 7Z" fill="#000000" />
                      <path d="M14 12C14 10.3431 12.6569 9 11 9H5C3.34315 9 2 10.3431 2 12V15H14V12Z" fill="#000000" />
                    </svg>
                  </span>
                  Hello <Link to="" className="ml-5 green">{firstName || ''}</Link>
                </div>

                {/* <div className="user-credit text-sm text-gray-600 sticky-right"> */}
                 <span>
                  Credits:{" "}
                  <span
                   style={{
                  color: "#3f9f42",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
                    onClick={onCreditClick ? () => onCreditClick() : onUpgradeClick}
                    title="Click to view billing history"
                  >
                    {credits !== null ? (typeof credits === 'object' && credits !== null ? credits.total : credits) : "Loading..."}
                  </span>
                </span>

                {/* UPGRADE BUTTON */}
                <button
                  onClick={onUpgradeClick}
                   style={{
                backgroundColor: "#3f9f42",
                color: "#fff",
                padding: "0.5rem 0.8rem",
                borderRadius: "4px",
                border: "none",
                cursor: "pointer",
                fontSize:"15px",
                fontWeight:"600"
              }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#37a137")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#3f9f42")}
                >
                  Upgrade
                </button>
              {/* </div>
            </div> */}

            {/* LOGOUT BUTTON */}
            {/* <div className="item"> */}
              <button
                onClick={logoutHandler}
                 style={{
                backgroundColor: "#3f9f42",
                color: "#fff",
                padding: "0.5rem 0.8rem",
                borderRadius: "4px",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize:"15px",
                fontWeight:"600"
              }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 3V12M18.3611 5.64001C19.6195 6.8988 20.4764 8.50246 20.8234 10.2482C21.1704 11.994 20.992 13.8034 20.3107 15.4478C19.6295 17.0921 18.4759 18.4976 16.9959 19.4864C15.5159 20.4752 13.776 21.0029 11.9961 21.0029C10.2162 21.0029 8.47625 20.4752 6.99627 19.4864C5.51629 18.4976 4.36274 17.0921 3.68146 15.4478C3.00019 13.8034 2.82179 11.994 3.16882 10.2482C3.51584 8.50246 4.37272 6.8988 5.6311 5.64001"
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
               Logout
              </button>
            </div>
          {/* </div> */}
        </div>
      </div>
    );
  }
);

export default Header;
