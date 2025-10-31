import React, { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./components/LoginPage";
import RegistrationPage from "./components/RegistrationPage";
import ForgotPassword from "./components/ForgotPassword";
import MainPage from "./components/MainPage";
import AmendPrompt from "./components/AmendPrompt";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import store, { persistor } from "./Redux/store";
import ProtectedRoute from "./ProtectedRoute";
import { AppDataProvider } from './contexts/AppDataContext';
import Planes from "./components/feature/planes";
import CustomerCreateForm from "./components/feature/CustomerCreateForm";
import PlanHistory from "./components/feature/PlanHistory";
import Myplan from "./components/feature/Myplan";
const UserComp = lazy(() => import("./components/User") as any);

const App: React.FC = () => {
  useEffect(() => {
    // Add the chatbot script
    const script = document.createElement("script");
    script.src = "https://cdn.signalzen.com/signalzen.js";
    script.async = true;
    document.body.appendChild(script);

    const interval = setInterval(() => {
      if (typeof (window as any).SignalZen !== "undefined") {
        clearInterval(interval);
        new (window as any).SignalZen({ appId: "239f3c3e" }).load();
      }
    }, 10);

    return () => {
      // Clean up the interval and script if it exists
      clearInterval(interval);
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []); // Empty dependency array to run once on mount

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AppDataProvider> {/* Add this line */}
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route path="/register" element={<RegistrationPage />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route element={<ProtectedRoute />}>
                {/* <Route path="/main" element={<MainPage />} /> */}
                <Route path="/main" element={<MainPage />}>
                   <Route index element={<Planes />} />         {/* default page */}
                   <Route path="myplan" element={<Myplan />} /> {/* nested page */}
                </Route>
                <Route path="/planes" element={<Planes/>} />
                <Route path="/plan-history" element={<PlanHistory />} />
                <Route
                  path="/user"
                  element={
                    <Suspense
                      fallback={
                        <h4 className="d-flex align-center justify-center">
                          Loading...
                        </h4>
                      }
                    >
                      <UserComp />
                    </Suspense>
                  }
                />
                <Route path="/amend-prompt/:id" element={<AmendPrompt />} />
                {/* <Route path="/create-customer" element={<CustomerCreateForm plan={null} clientId={""} />} /> */}
                <Route path="/create-customer" element={<CustomerCreateForm />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />

            </Routes>
          </BrowserRouter>
        </AppDataProvider> 
      </PersistGate>
    </Provider>
  );
};

export default App;