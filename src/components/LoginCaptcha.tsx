import React, { useEffect, useRef } from "react";

const SITE_KEY = "6LcAEuAtAAAAAMLtDQcgUeyvDoxTCWn9aVGgIiXu";
const SCRIPT_ID = "google-recaptcha-v2-script";

declare global {
  interface Window {
    grecaptcha?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => number;
      reset: (widgetId: number) => void;
      ready: (callback: () => void) => void;
    };
  }
}

interface LoginCaptchaProps {
  onChange: (token: string | null) => void;
  resetKey: number;
}

const LoginCaptcha: React.FC<LoginCaptchaProps> = ({ onChange, resetKey }) => {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let mounted = true;
    const render = () => {
      if (!mounted || !container.current || widgetId.current !== null || !window.grecaptcha) return;
      window.grecaptcha.ready(() => {
        if (!mounted || !container.current || widgetId.current !== null || !window.grecaptcha) return;
        widgetId.current = window.grecaptcha.render(container.current, {
          sitekey: SITE_KEY,
          callback: (token: string) => onChangeRef.current(token),
          "expired-callback": () => onChangeRef.current(null),
          "error-callback": () => onChangeRef.current(null),
        });
      });
    };

    if (window.grecaptcha) {
      render();
    } else {
      let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = SCRIPT_ID;
        script.src = "https://www.google.com/recaptcha/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", render);
      return () => {
        mounted = false;
        script?.removeEventListener("load", render);
      };
    }
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (widgetId.current !== null) {
      window.grecaptcha?.reset(widgetId.current);
      onChangeRef.current(null);
    }
  }, [resetKey]);

  return <div ref={container} className="login-captcha" />;
};

export default LoginCaptcha;
