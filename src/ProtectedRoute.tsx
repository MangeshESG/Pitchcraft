import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "./Redux/store";

const ProtectedRoute: React.FC = () => {
  const token = useSelector((state: RootState) => state.auth.token);

  return token ? <Outlet /> : <Navigate to="/" />;
};

export default ProtectedRoute;
