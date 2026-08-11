import API_BASE_URL from "../config";

/**
 * Client-level list-view column layout: which columns are shown and in what
 * order. One layout per client, shared by every list view / segment / saved
 * view. Backed by `crm_column_preferences`.
 */
export interface ColumnPreference {
  columnKey: string;
  label?: string | null;
  isVisible: boolean;
  /** Zero-based position. Assigned by the server from the array order on save. */
  sortOrder: number;
  /** crm_custom_fields.id when the column is a custom attribute. */
  customFieldId?: number | null;
  isCustomField?: boolean;
}

export interface ColumnPreferencesResponse {
  hasSavedLayout: boolean;
  columns: ColumnPreference[];
}

const BASE = `${API_BASE_URL}/api/Crm/column-preferences`;

export const fetchColumnPreferences = async (
  clientId: string | number
): Promise<ColumnPreferencesResponse> => {
  const res = await fetch(`${BASE}?clientId=${clientId}`);

  if (!res.ok) throw new Error(`Failed to load column layout (${res.status})`);

  const json = await res.json();
  const columns: ColumnPreference[] = Array.isArray(json?.columns) ? json.columns : [];

  return {
    hasSavedLayout: !!json?.hasSavedLayout && columns.length > 0,
    columns,
  };
};

/**
 * Replaces the client's whole layout — the array order *is* the column
 * sequence, so a drag-reorder and a show/hide toggle post the same payload.
 */
export const saveColumnPreferences = async (
  clientId: string | number,
  columns: ColumnPreference[]
): Promise<void> => {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: Number(clientId),
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
  clientId: string | number
): Promise<void> => {
  const res = await fetch(`${BASE}/reset?clientId=${clientId}`, { method: "POST" });

  if (!res.ok) throw new Error(`Failed to reset column layout (${res.status})`);
};
