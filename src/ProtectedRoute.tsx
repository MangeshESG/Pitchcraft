import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "./Redux/store";

const ProtectedRoute: React.FC = () => {
  const reduxToken = useSelector((state: RootState) => state.auth.token);

  // ✅ Critical Fix: fallback to localStorage
  const token = reduxToken || localStorage.getItem("token");

  return token ? <Outlet /> : <Navigate to="/" replace />;
};

export default ProtectedRoute;
