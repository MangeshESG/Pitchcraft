import React from "react";
import { Link } from "react-router-dom";
import "./MainPage.css";
import Header from "./common/Header";

const User: React.FC = () => {
  return (
    <div className="login-container pitch-page flex-col d-flex">
      <Header connectTo={false} onUpgradeClick={() => {}}  />

      <h2 className="left mt-10">Manage user </h2>
      <div className="login-box user-form gap-down d-flex">
        <div className="input-section edit-section">
          <div className="row">
            <div className="col col-12 right">
              <div className="row flex-col">
                <div className="form-group col">
                  <label>First name</label>
                  <input type="text" placeholder="Enter your first name" />
                </div>
                <div className="form-group col">
                  <label>Last name</label>
                  <input type="text" placeholder="Enter your last name" />
                </div>
                <div className="form-group col">
                  <label>Email</label>
                  <input type="text" placeholder="Enter your email" />
                </div>
                <div className="form-group col">
                  <label>Password</label>
                  <input type="password" placeholder="Enter your password" />
                </div>
                <div className="form-group col">
                  <label>User role</label>
                  <input type="text" placeholder="Enter your role" />
                </div>
                <div className="col d-flex align-end">
                  <div className="form-group mb-0 full-width">
                    <button className="save-button button">Save changes</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="container small">
        <Link
          to="/main"
          className="mb-20 secondary button small d-flex justify-center align-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20px"
            height="20px"
            viewBox="0 0 1024 1024"
          >
            <path
              fill="#ffffff"
              d="M224 480h640a32 32 0 1 1 0 64H224a32 32 0 0 1 0-64z"
            />
            <path
              fill="#ffffff"
              d="m237.248 512 265.408 265.344a32 32 0 0 1-45.312 45.312l-288-288a32 32 0 0 1 0-45.312l288-288a32 32 0 1 1 45.312 45.312L237.248 512z"
            />
          </svg>
          <span className="ml-5">Back to prompt</span>
        </Link>
      </div>
    </div>
  );
};

export default User;
