import React, { useState } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { RootState } from "../../Redux/store";
import { useDispatch } from "react-redux";
import { clearToken } from "../../slices/authSLice";
import logoImage from "../../assets/images/pitchcraftlogo.png"; 

interface HeaderProps {
  connectTo: boolean;
  selectedClient?: string;
  handleClientChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  clientNames?: Client[];
  userRole?: string;
}

interface Client {
  clientID: number;
  firstName: string;
  lastName: string;
  companyName: string;
}

const menuList = ["Excel", "Hubspot", "Salesforce", "Zoho"];

const Header: React.FC<HeaderProps> = React.memo(({   
  connectTo,
  selectedClient,
  handleClientChange,
  clientNames = [],
  userRole, 
}) => {
  const firstName = useSelector((state: RootState) => state.auth.firstName);
  const lastName = useSelector((state: RootState) => state.auth.lastName);
  const username = useSelector(
    (state: RootState) => state.auth.username
  ) as string;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const logoutHandler = () => {
    dispatch(clearToken());
    localStorage.removeItem("selectedModel");
    navigate("/");
  };
  
  const full_Name =
    firstName && lastName ? `${firstName} ${lastName}` : "Guest";

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  return (
  <div className="main-head d-flex justify-between align-center">
    <h1 className="logo" onClick={toggleMenu}>
      <img 
        src={logoImage} 
        alt="Pitchcraft Logo" 
        style={{ height: "125px" }}
      />
      <span className="hamburger-icon">&#9776;</span>
    </h1>

    <div
      className={`menu-section d-flex align-center ${
        isMenuOpen ? "show" : ""
      }`}
    >
      <div className="item">
        <div className="user-info-wrapper">
          <div className="user-greeting d-flex align-center">
            <span className="mr-5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15px"
                height="15px"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M8 7C9.65685 7 11 5.65685 11 4C11 2.34315 9.65685 1 8 1C6.34315 1 5 2.34315 5 4C5 5.65685 6.34315 7 8 7Z"
                  fill="#000000"
                />
                <path
                  d="M14 12C14 10.3431 12.6569 9 11 9H5C3.34315 9 2 10.3431 2 12V15H14V12Z"
                  fill="#000000"
                />
              </svg>
            </span>
            Hello
            <Link to="" className="ml-5 green">
              {full_Name}
            </Link>
          </div>

          {/* Client Selector Below Username */}
          {userRole === "ADMIN" && handleClientChange && (
            <div className="client-selector-wrapper mt-5">
              <select
                value={selectedClient || ""}
                onChange={handleClientChange}
                className="header-client-select"
              >
                <option value="">--Please choose a client--</option>
                {clientNames.map((client: Client, index: number) => (
                  <option key={index} value={client.clientID.toString()}>
                    {`${client.firstName} ${client.lastName} - ${client.companyName} - ${client.clientID}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="item">
        {connectTo && (
          <button className="dropdown ml-10 bg-white button small auto-width d-flex justify-between align-center">
            <span className="d-flex full-width justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="17px"
                height="17px"
              >
                <path
                  fillRule="evenodd"
                  d="M 11 2 L 11 11 L 2 11 L 2 13 L 11 13 L 11 22 L 13 22 L 13 13 L 22 13 L 22 11 L 13 11 L 13 2 Z"
                />
              </svg>
              <span className="ml-5">Connect to</span>
            </span>
            <ul className="sub-menu d-flex flex-col">
              {menuList.map((item, i) => (
                <li key={i}>
                  <Link to="/">{item}</Link>
                </li>
              ))}
            </ul>
          </button>
        )}
      </div>
      
      <div className="item">
        <button
          onClick={logoutHandler}
          className="ml-10 save-button button auto-width small d-flex justify-between align-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18px"
            height="18px"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M12 3V12M18.3611 5.64001C19.6195 6.8988 20.4764 8.50246 20.8234 10.2482C21.1704 11.994 20.992 13.8034 20.3107 15.4478C19.6295 17.0921 18.4759 18.4976 16.9959 19.4864C15.5159 20.4752 13.776 21.0029 11.9961 21.0029C10.2162 21.0029 8.47625 20.4752 6.99627 19.4864C5.51629 18.4976 4.36274 17.0921 3.68146 15.4478C3.00019 13.8034 2.82179 11.994 3.16882 10.2482C3.51584 8.50246 4.37272 6.8988 5.6311 5.64001"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="ml-5">Logout</span>
        </button>
      </div>
    </div>
  </div>
);
});

export default Header;