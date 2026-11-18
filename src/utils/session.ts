import { jwtDecode } from "jwt-decode";
import API_BASE_URL from "../config";
import store from "../Redux/store";
import { clearToken, setToken } from "../slices/authSLice";

/**
 * Sliding session.
 *
 * The API signs tokens that live for `Jwt:ExpiryMinutes` (60) and validates
 * their lifetime, and it has no refresh token. Before this module existed
 * nothing on the client looked at `exp`, so an hour into a session every
 * [Authorize] endpoint began answering 401 while the SPA still looked signed
 * in — the contact subscription button, for one, fell into a "Retry
 * subscription status" that re-sent the same dead token and could never
 * succeed.
 *
 * So the client now renews the token a few minutes before it dies. An active
 * tab slides its session forward indefinitely; a session only ends when the
 * token actually expires unrenewed (tab closed or asleep past `exp`), and then
 * it ends honestly, at the login screen with a reason, rather than as a wall
 * of silent 401s.
 */

/** Renew this long before `exp`. Comfortably over the API's 5-min clock skew. */
const RENEW_LEAD_MS = 5 * 60 * 1000;

/** Backoff after a renewal that failed while the token was still usable. */
const RETRY_DELAY_MS = 60 * 1000;

/**
 * Never renew more often than this, whatever the token's lifetime implies.
 *
 * At the production hour this never binds. It matters when `Jwt:ExpiryMinutes`
 * is small — lowering it is the only practical way to test this code — because
 * then the token's entire life sits inside the lead window above, so every
 * successful renewal would immediately be due again and the renewals would
 * become a hot loop against the API.
 */
const MIN_RENEWAL_INTERVAL_MS = 30 * 1000;

/** Leave at least this much of the old token's life for the call to land. */
const RENEWAL_DEADLINE_MS = 5 * 1000;

/** When this tab last stored a freshly issued token. */
let lastRenewalAt = 0;

/** setTimeout is a 32-bit signed delay, so never schedule past this. */
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/** Where LoginPage reads the reason it is showing the form again. */
const EXPIRY_NOTICE_KEY = "sessionExpiredNotice";

export const SESSION_EXPIRED_MESSAGE =
  "Your session has expired. Please sign in again.";

interface SessionClaims {
  exp?: number;
}

/**
 * The token every screen is actually using.
 *
 * Redux is the live copy and is persisted, but the storage keys are written
 * directly by login and by impersonation, and some screens read them instead,
 * so all three are consulted in the order they take precedence.
 */
export const readStoredToken = (): string | null => {
  const reduxToken = store.getState().auth.token;

  if (reduxToken) return reduxToken;

  try {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
  } catch {
    // Storage can throw when the browser blocks site data.
    return null;
  }
};

/** `exp` as epoch milliseconds, or null when the token is absent or unreadable. */
export const getTokenExpiryMs = (token: string | null): number | null => {
  if (!token) return null;

  try {
    const { exp } = jwtDecode<SessionClaims>(token);

    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    // Not a JWT we can read. Treated as unusable by the callers below.
    return null;
  }
};

/**
 * Whether the token is past `exp` and the API would refuse it.
 *
 * A token whose `exp` cannot be read counts as expired: the server is the one
 * that decides, and guessing "still fine" is what produced the silent 401s.
 */
export const isTokenExpired = (token: string | null): boolean => {
  const expiry = getTokenExpiryMs(token);

  return expiry === null || expiry <= Date.now();
};

/** Writes a freshly issued token everywhere the old one was read from. */
const storeSessionToken = (token: string) => {
  lastRenewalAt = Date.now();
  store.dispatch(setToken(token));

  try {
    localStorage.setItem("token", token);

    // Only mirrored when a session copy already exists, so this does not
    // invent storage the login flow never wrote.
    if (sessionStorage.getItem("token")) {
      sessionStorage.setItem("token", token);
    }
  } catch {
    // Redux still holds the new token, so the session keeps working in this
    // tab even if persisting it fails.
  }
};

/**
 * Drops every trace of the session.
 *
 * Deliberately the same set of keys the header's Logout button clears: a
 * stale `selectedClientId` or `isAdmin` left behind would be inherited by the
 * next user to sign in on this browser.
 */
export const clearSession = () => {
  store.dispatch(clearToken());

  try {
    ["token", "selectedModel", "selectedClientId", "isAdmin", "clientId", "isDemoAccount"]
      .forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
  } catch {
    // Nothing useful to do; redux is already cleared.
  }
};

/** Ends the session and sends the user to the login screen with the reason. */
export const expireSession = () => {
  clearSession();

  try {
    sessionStorage.setItem(EXPIRY_NOTICE_KEY, SESSION_EXPIRED_MESSAGE);
  } catch {
    // The redirect still happens; only the explanation is lost.
  }

  // HashRouter, and this runs outside the router, so the hash is the route.
  if (window.location.hash !== "#/") {
    window.location.hash = "#/";
  }
};

/** Reads and clears the notice, so it shows once rather than on every visit. */
export const takeSessionExpiredNotice = (): string => {
  try {
    const notice = sessionStorage.getItem(EXPIRY_NOTICE_KEY);

    if (notice) sessionStorage.removeItem(EXPIRY_NOTICE_KEY);

    return notice || "";
  } catch {
    return "";
  }
};

/** One renewal at a time per tab, however many callers ask at once. */
let inFlight: Promise<boolean> | null = null;

const requestRenewal = async (token: string): Promise<boolean> => {
  // No body: the live IIS WAF rejects a POST that declares text/plain, and an
  // empty POST sends no Content-Type at all. [Authorize] identifies the caller
  // from the bearer token, so there is nothing to send anyway.
  const response = await fetch(`${API_BASE_URL}/api/login/renew`, {
    method: "POST",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    // 401 here means the token died before we got to it, or the account is
    // gone. Either way this session is over and no retry can help.
    if (response.status === 401 || response.status === 403) expireSession();

    return false;
  }

  const data = await response.json().catch(() => ({}));
  const renewed = data?.Token ?? data?.token;

  if (typeof renewed !== "string" || !renewed) return false;

  storeSessionToken(renewed);

  return true;
};

/**
 * Slides the session forward. Returns whether a new token was stored.
 *
 * A failure that is not the API refusing us (offline, API restarting) leaves
 * the current token in place — it is still valid for a few more minutes, which
 * is what the retry in `useSessionRenewal` is for.
 */
export const renewSession = (): Promise<boolean> => {
  if (inFlight) return inFlight;

  const token = readStoredToken();

  if (!token) return Promise.resolve(false);

  if (isTokenExpired(token)) {
    expireSession();

    return Promise.resolve(false);
  }

  inFlight = requestRenewal(token)
    .catch(() => false)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
};

/**
 * How long until this token should be renewed: 0 when it is already inside the
 * lead window, null when there is nothing to schedule.
 */
export const msUntilRenewal = (token: string | null): number | null => {
  const expiry = getTokenExpiryMs(token);

  if (expiry === null) return null;

  const now = Date.now();

  // Hold off until the floor has passed, so a short token lifetime cannot turn
  // the lead window into a renewal loop...
  const earliest = Math.max(
    expiry - RENEW_LEAD_MS - now,
    lastRenewalAt + MIN_RENEWAL_INTERVAL_MS - now,
  );

  // ...but never wait past the token's own death to honour that floor, or the
  // guard meant to protect the session would be what ends it.
  const latest = Math.max(0, expiry - RENEWAL_DEADLINE_MS - now);

  return Math.max(0, Math.min(earliest, latest, MAX_TIMEOUT_MS));
};

export const RENEWAL_RETRY_DELAY_MS = RETRY_DELAY_MS;
