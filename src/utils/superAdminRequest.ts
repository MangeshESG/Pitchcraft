import API_BASE_URL from "../config";

/**
 * Shared plumbing for the admin panels that create accounts and move credits.
 *
 * These endpoints identify the caller from their token and check it against
 * the API's `SuperAdmins:ClientIds` allowlist, so the request has to carry the
 * token — an unauthenticated call is refused rather than silently ignored.
 * Hiding the panels in the UI is convenience; the API is what enforces this.
 */

/** Login writes the token to localStorage; older screens mirror it to session. */
const readToken = (): string | null =>
  localStorage.getItem("token") || sessionStorage.getItem("token");

export class SuperAdminError extends Error {
  /** HTTP status, so a caller can tell "not allowed" from "bad input". */
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SuperAdminError";
    this.status = status;
  }
}

/**
 * POSTs as the signed-in admin and returns the parsed body.
 *
 * The API answers a refusal with a message worth showing verbatim ("Your
 * account is not authorised for this action", "This client holds 40 credits"),
 * so that message is preferred over anything invented here.
 */
export const postAsSuperAdmin = async <T>(
  path: string,
  body: unknown,
  fallbackMessage: string,
): Promise<T> => {
  const token = readToken();

  if (!token) {
    throw new SuperAdminError("Your session has expired. Sign in again and retry.", 401);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new SuperAdminError(
      json?.message || json?.Message || fallbackMessage,
      response.status,
    );
  }

  return json as T;
};

export const getAsSuperAdmin = async <T>(
  path: string,
  fallbackMessage: string,
): Promise<T> => {
  const token = readToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new SuperAdminError(
      json?.message || json?.Message || fallbackMessage,
      response.status,
    );
  }

  return json as T;
};

/**
 * Whether the signed-in admin is on the API's allowlist. Used only to decide
 * whether the Accounts and Credits tabs are worth showing — a false here and
 * a refusal from the endpoints themselves are the same answer, and the
 * endpoints are the ones that matter.
 */
export const fetchIsSuperAdmin = async (): Promise<boolean> => {
  try {
    const json = await getAsSuperAdmin<any>(
      "/api/login/admin/is-super-admin",
      "Could not check your permissions.",
    );

    return (json?.allowed ?? json?.Allowed) === true;
  } catch {
    // An older API without this endpoint, or an expired session. Hiding the
    // tabs is the safe way to be wrong: nothing is lost that the API would
    // have allowed anyway.
    return false;
  }
};
