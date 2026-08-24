import API_BASE_URL from "../config";
import store, { persistor } from "../Redux/store";
import {
  saveEmail,
  saveFirstName,
  saveLastName,
  saveUserId,
  saveUserName,
  saveUserRole,
  setToken,
} from "../slices/authSLice";

/**
 * "Sign in as this client" — an admin swaps their session for a client's so
 * they can work inside that account. The API issues an ordinary client token,
 * so the resulting session has no admin rights at all and is indistinguishable
 * from the client's own: nothing in the UI hints that an admin is behind it.
 *
 * The switch is deliberately one-way. Getting back to admin means signing out
 * and signing in again, so no admin session is left parked in the browser.
 */

export interface ImpersonatedSession {
  token: string;
  clientId: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
}

export const impersonateClient = async (
  targetClientId: number,
): Promise<ImpersonatedSession> => {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Your session has expired. Sign in again and retry.");
  }

  const response = await fetch(`${API_BASE_URL}/api/login/admin/impersonate`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ targetClientId }),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      json?.message || json?.Message || "Could not sign in as this client.",
    );
  }

  return {
    token: json.token ?? json.Token,
    clientId: json.clientId ?? json.ClientId,
    username: json.username ?? json.Username ?? "",
    firstName: json.firstName ?? json.FirstName ?? "",
    lastName: json.lastName ?? json.LastName ?? "",
    email: json.email ?? json.Email ?? "",
  };
};

/**
 * Swaps the live session for another one and restarts the app.
 *
 * MainPage reads the admin flag once on mount and holds a lot of client-scoped
 * state, so a reload is what actually makes the switch take effect everywhere.
 * The persisted auth slice is flushed first — otherwise the reload would
 * rehydrate the *previous* user's name and id straight back over the new token.
 */
export const applySessionAndReload = async (session: ImpersonatedSession) => {
  const clientId = String(session.clientId);

  localStorage.setItem("token", session.token);

  store.dispatch(setToken(session.token));
  store.dispatch(saveUserId(clientId));
  store.dispatch(saveUserName(session.username));
  store.dispatch(saveFirstName(session.firstName));
  store.dispatch(saveLastName(session.lastName));
  store.dispatch(saveEmail(session.email));
  store.dispatch(saveUserRole("USER"));

  // Explicitly not an admin — this is what strips the client dropdown and the
  // admin settings once MainPage re-reads the flag on mount.
  [
    ["clientId", clientId],
    ["isAdmin", "false"],
    ["isDemoAccount", "false"],
  ].forEach(([key, value]) => {
    sessionStorage.setItem(key, value);
    localStorage.setItem(key, value);
  });

  // The new session *is* the client, so nothing is "selected" on top of it.
  localStorage.removeItem("selectedClientId");
  sessionStorage.removeItem("selectedClientId");
  localStorage.removeItem("selectedModel");

  try {
    await persistor.flush();
  } catch {
    // Flushing is best effort; the storage keys above are already written.
  }

  window.location.reload();
};
