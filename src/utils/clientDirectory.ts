import API_BASE_URL from "../config";

/**
 * The list of clients behind the header's "Select a client" dropdown, so the
 * admin panels can offer the same picker instead of asking for a raw id.
 *
 * Same endpoint the header uses. It is unauthenticated and returns every
 * client, which is why nothing here is a permission check — the panels that
 * use it are gated on the API by their own endpoints.
 */

export interface ClientOption {
  clientId: number;
  firstName: string;
  lastName: string;
  companyName: string;
  /** "Ada Lovelace — Analytical Engines", ready to put in an <option>. */
  label: string;
}

const buildLabel = (
  firstName: string,
  lastName: string,
  companyName: string,
  clientId: number,
): string => {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  const parts = [name || `Client ${clientId}`];

  if (companyName?.trim()) parts.push(companyName.trim());

  return parts.join(" — ");
};

export const fetchClientOptions = async (): Promise<ClientOption[]> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/allUserDetails`, {
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("Could not load the client list.");
  }

  const data = await response.json().catch(() => null);

  // Checked rather than asserted, the same way MainPage handles this list: an
  // error object landing in state would otherwise blow up the .map below.
  if (!Array.isArray(data)) return [];

  return data
    .map((row: any) => {
      const clientId = Number(row?.clientID ?? row?.ClientID ?? row?.clientId);
      const firstName = String(row?.firstName ?? row?.FirstName ?? "");
      const lastName = String(row?.lastName ?? row?.LastName ?? "");
      const companyName = String(row?.companyName ?? row?.CompanyName ?? "");

      return {
        clientId,
        firstName,
        lastName,
        companyName,
        label: buildLabel(firstName, lastName, companyName, clientId),
      };
    })
    .filter((client) => Number.isInteger(client.clientId) && client.clientId > 0);
};
