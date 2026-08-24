import React, { useCallback, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import {
  SecuritySettings as SecuritySettingsValues,
  fetchSecuritySettings,
  saveLoginOtpEnabled,
} from "../../utils/securitySettings";
import {
  bannerClass,
  cardClass,
  hintClass,
  sectionClass,
} from "../common/settingsStyles";

type Banner = { type: "success" | "error"; text: string } | null;

const badgeClass = (state: "enabled" | "disabled" | "busy") => {
  const base = "rounded-full border px-2.5 py-0.5 text-[13px] font-semibold";
  if (state === "enabled")
    return `${base} border-[#e2f1e3] bg-[#f1f8f2] text-[#2d7a30]`;
  return `${base} border-[#e8eaee] bg-[#f4f5f7] text-[#6b7280]`;
};

/**
 * Application-wide security switches — the "Security" tab of the admin page.
 * Today that is just the login OTP requirement: off means a correct username
 * and password signs a user in without the emailed device-verification code.
 * Rendered inside the page chrome owned by `AdminSettings`, so it starts at
 * the body.
 */
const SecuritySettings: React.FC = () => {
  const [settings, setSettings] = useState<SecuritySettingsValues>({
    loginOtpEnabled: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setSettings(await fetchSecuritySettings());
    } catch (error: any) {
      setBanner({
        type: "error",
        text:
          error?.message ||
          "Could not load security settings. Showing the default (OTP on).",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleToggle = async () => {
    const adminClientId = Number(
      sessionStorage.getItem("clientId") || localStorage.getItem("clientId"),
    );

    if (!adminClientId) {
      setBanner({
        type: "error",
        text: "Could not identify your account. Sign in again and retry.",
      });
      return;
    }

    const next = !settings.loginOtpEnabled;

    setIsSaving(true);
    setBanner(null);

    try {
      await saveLoginOtpEnabled(next, adminClientId);
      setSettings({ loginOtpEnabled: next });
      setBanner({
        type: "success",
        text: next
          ? "Login OTP verification is on. New devices now have to confirm an emailed code."
          : "Login OTP verification is off. Everyone signs in with username and password only.",
      });
    } catch (error: any) {
      setBanner({
        type: "error",
        text: error?.message || "Could not save security settings.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const statusText = isSaving
    ? "Saving..."
    : settings.loginOtpEnabled
      ? "On"
      : "Off";

  return (
    <div className="max-w-4xl">
      {banner && <div className={bannerClass(banner.type)}>{banner.text}</div>}

      {isLoading ? (
        <div className={cardClass}>
          <p className="text-sm text-[#6b7280]">Loading security settings…</p>
        </div>
      ) : (
        <div className={sectionClass}>
          <div className={cardClass}>
            <div className="flex items-start justify-between gap-6">
              <div className="flex min-w-0 items-start gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#e2f1e3] bg-[#f1f8f2] text-[#3f9f42]">
                  <ShieldCheck size={18} />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#0b1220]">
                    Login OTP verification
                  </div>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-[#6b7280]">
                    Emails a one-time code when someone signs in from a
                    device they haven't trusted yet.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3.5">
                <span
                  className={badgeClass(
                    isSaving
                      ? "busy"
                      : settings.loginOtpEnabled
                        ? "enabled"
                        : "disabled",
                  )}
                >
                  {statusText}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.loginOtpEnabled}
                  aria-label="Toggle login OTP verification"
                  onClick={handleToggle}
                  disabled={isSaving}
                  className={`relative h-6 w-11 rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    settings.loginOtpEnabled
                      ? "border-[#3f9f42] bg-[#3f9f42]"
                      : "border-[#d1d5db] bg-[#e5e7eb]"
                  }`}
                >
                  <span
                    className={`absolute top-[3px] h-4 w-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.18)] transition-all ${
                      settings.loginOtpEnabled ? "left-[22px]" : "left-[3px]"
                    }`}
                  />
                </button>
              </div>
            </div>

            <p className={`${hintClass} border-t border-[#f1f2f4] pt-4`}>
              {settings.loginOtpEnabled ? (
                <>
                  Turning this off skips the emailed code for everyone —
                  username and password alone will sign a user in. Trusted
                  devices are unaffected either way.
                </>
              ) : (
                <>
                  <span className="text-[#b45309]">
                    Device verification is currently off for every user.
                  </span>{" "}
                  Turn it back on to require the emailed code again.
                </>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecuritySettings;
