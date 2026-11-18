import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "./Redux/store";
import { useSessionRenewal } from "./hooks/useSessionRenewal";
import { isTokenExpired } from "./utils/session";

const ProtectedRoute: React.FC = () => {
  const reduxToken = useSelector((state: RootState) => state.auth.token);

  // ✅ Critical Fix: fallback to localStorage
  const token = reduxToken || localStorage.getItem("token");

  // Renews the token a few minutes before it expires, so a session being
  // worked in does not die at the API's 60-minute mark. Mounted here because
  // this layout route stays mounted across every authenticated screen.
  useSessionRenewal();

  // A token that exists but is past `exp` is not a session: the API refuses it
  // and every [Authorize] call 401s. Checking only for presence is what used
  // to leave the app looking signed in while nothing authenticated worked.
  // The hook clears the stale session and leaves the reason for the login
  // screen to show; this redirect is the same destination either way.
  if (!token || isTokenExpired(token)) return <Navigate to="/" replace />;

  return <Outlet />;
};

export default ProtectedRoute;
