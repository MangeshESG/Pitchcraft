import API_BASE_URL from "../config";

/**
 * Admin-controlled security switches (Settings > Security). The login flow on
 * the API reads these, so turning the OTP switch off changes sign-in for every
 * user immediately.
 */
export interface SecuritySettings {
  /** False means username + password alone signs a user in. */
  loginOtpEnabled: boolean;
}

export const fetchSecuritySettings = async (): Promise<SecuritySettings> => {
  const response = await fetch(`${API_BASE_URL}/api/security-settings`, {
    headers: { accept: "application/json" },
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      json?.message || json?.Message || "Failed to load security settings.",
    );
  }

  // Anything other than an explicit false is treated as "OTP on", matching the
  // API's own default.
  const raw = json?.loginOtpEnabled ?? json?.LoginOtpEnabled;

  return { loginOtpEnabled: raw !== false && raw !== "false" };
};

export const saveLoginOtpEnabled = async (
  enabled: boolean,
  updatedBy: number,
): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/security-settings/login-otp`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ enabled, updatedBy }),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      json?.message || json?.Message || "Failed to save security settings.",
    );
  }
};
