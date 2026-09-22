import API_BASE_URL from "../config";

export interface ColumnPreferenceScope {
  scopeType: "list" | "segment" | "view";
  /** List -1 identifies All contacts. Other IDs must be positive. */
  scopeId: number;
}

export interface ColumnPreference {
  columnKey: string;
  label?: string | null;
  isVisible: boolean;
  sortOrder: number;
  customFieldId?: number | null;
  isCustomField?: boolean;
}

export interface ColumnPreferencesResponse {
  hasSavedLayout: boolean;
  columns: ColumnPreference[];
}

const BASE = `${API_BASE_URL}/api/Crm/column-preferences`;
const queryFor = (clientId: string | number, scope: ColumnPreferenceScope) =>
  new URLSearchParams({
    clientId: String(clientId),
    scopeType: scope.scopeType,
    scopeId: String(scope.scopeId),
  }).toString();

export const fetchColumnPreferences = async (
  clientId: string | number,
  scope: ColumnPreferenceScope
): Promise<ColumnPreferencesResponse> => {
  const res = await fetch(`${BASE}?${queryFor(clientId, scope)}`);
  if (!res.ok) throw new Error(`Failed to load column layout (${res.status})`);
  const json = await res.json();
  const columns: ColumnPreference[] = Array.isArray(json?.columns) ? json.columns : [];
  return { hasSavedLayout: !!json?.hasSavedLayout && columns.length > 0, columns };
};

export const saveColumnPreferences = async (
  clientId: string | number,
  columns: ColumnPreference[],
  scope: ColumnPreferenceScope
): Promise<void> => {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: Number(clientId),
      ...scope,
      columns: columns.map((c) => ({
        columnKey: c.columnKey,
        label: c.label ?? null,
        isVisible: c.isVisible,
        customFieldId: c.customFieldId ?? null,
      })),
    }),
  });
  if (!res.ok) throw new Error(`Failed to save column layout (${res.status})`);
};

export const resetColumnPreferences = async (
  clientId: string | number,
  scope: ColumnPreferenceScope
): Promise<void> => {
  const res = await fetch(`${BASE}/reset?${queryFor(clientId, scope)}`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to reset column layout (${res.status})`);
};
