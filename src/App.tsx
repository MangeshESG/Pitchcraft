import React, { lazy, Suspense, useEffect } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
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
    // SignalZen live chat — mirrors the official embed snippet.
    // Position (left/right) is configured in the SignalZen dashboard.
    const _sz = ((window as any)._sz = (window as any)._sz || {});
    _sz.appId = "239f3c3e";

    const script = document.createElement("script");
    script.src = "https://cdn.signalzen.com/signalzen.js";
    script.setAttribute("async", "true");
    document.documentElement.firstChild?.appendChild(script);

    const interval = setInterval(() => {
      if (typeof (window as any).SignalZen !== "undefined") {
        clearInterval(interval);
        new (window as any).SignalZen(_sz).load();
      }
    }, 10);

    // Force the SignalZen widget to the bottom-left.
    // The dashboard "position" setting isn't taking effect, so we override the
    // inline "left: <px> !important" that SignalZen writes on #signalzen_widget__root
    // (and the chat window). An inline !important can only be beaten by another
    // inline write, re-asserted via a MutationObserver (fires before paint → no flicker).
    const CHAT_LEFT = "20px";
    const pinChatLeft = () => {
      // Collect every SignalZen-owned root (launcher + chat window may live on
      // separate roots), plus their descendants, wherever SignalZen mounts them.
      const roots = document.querySelectorAll<HTMLElement>(
        '[id^="signal_zen" i],[id^="signalzen" i]'
      );
      if (!roots.length) return;
      const candidates = new Set<HTMLElement>();
      roots.forEach((r) => {
        candidates.add(r);
        r.querySelectorAll<HTMLElement>("*").forEach((c) => candidates.add(c));
      });
      candidates.forEach((el) => {
        // Target the fixed-positioned roots SignalZen anchors via an inline
        // "left" (launcher + chat window). The launcher root can be a 0-size
        // anchor, so we key off the inline left it sets, not element size.
        // Inner position:absolute bits are excluded by the fixed check.
        if (
          window.getComputedStyle(el).position === "fixed" &&
          el.style.left &&
          el.style.left !== CHAT_LEFT
        ) {
          el.style.setProperty("left", CHAT_LEFT, "important");
          el.style.setProperty("right", "auto", "important");
        }
      });
    };

    // Re-assert position whenever SignalZen mounts the widget, swaps nodes
    // (open/close), or rewrites its inline style (resize). Observer callbacks
    // run before paint, so the right-side position is never visible.
    const observer = new MutationObserver(pinChatLeft);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style"],
    });
    pinChatLeft();

    return () => {
      // Clean up the interval and script if it exists
      clearInterval(interval);
      observer.disconnect();
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []); // Empty dependency array to run once on mount

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AppDataProvider> {/* Add this line */}
        <HashRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/main" element={<MainPage />}>
              <Route index element={<Planes />} />
              <Route path="myplan" element={<Myplan />} />
            </Route>

            <Route path="/plans" element={<Planes />} />
            <Route path="/plan-history" element={<PlanHistory />} />

            <Route
              path="/user"
              element={
                <Suspense fallback={<h4>Loading...</h4>}>
                  <UserComp />
                </Suspense>
              }
            />

            <Route path="/amend-prompt/:id" element={<AmendPrompt />} />
            <Route path="/create-customer" element={<CustomerCreateForm />} />
            <Route path="/contact-details/:contactId" element={<MainPage />} />
          </Route>

          {/* ✅ ALWAYS LAST */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        </HashRouter>
        </AppDataProvider> 
      </PersistGate>
    </Provider>
  );
};

export default App;
