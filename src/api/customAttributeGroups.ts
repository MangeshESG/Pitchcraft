import API_BASE_URL from "../config";

export interface AttributeGroup {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  attributeCount: number;
  sort_order: number;
}

export interface GroupAttribute {
  id: number;
  field_name: string;
  field_key: string;
  field_type: string;
  options_json: string | null;
  group_id: number | null;
  groupName: string | null;
  sort_order: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SaveAttributeGroup {
  name: string;
  description: string;
  addAttributeIds: number[];
  removeAttributeIds: number[];
}

const basePath = `${API_BASE_URL}/api/crm/custom-attribute-groups`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (!token) throw new Error("Please sign in again to manage attribute groups.");

  let response: Response;
  try {
    response = await fetch(`${basePath}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new Error("Could not connect to the custom attributes service. Please try again.");
  }
  if (!response.ok) {
    let message = "";
    if (response.headers.get("content-type")?.toLowerCase().includes("json")) {
      try {
        const parsed = await response.json();
        const candidate = parsed?.message || parsed?.title || parsed?.detail;
        if (typeof candidate === "string" && candidate.length <= 300 && !/<[^>]*>/.test(candidate)) {
          message = candidate;
        }
      } catch { /* Use a safe status message below. */ }
    }
    if (!message) {
      if (response.status === 401) message = "Your session has expired. Please sign in again.";
      else if (response.status === 403) message = "Custom attributes are unavailable or access is denied (403). Please contact support.";
      else if (response.status === 404) message = "Custom attributes service is unavailable on this server. Please contact support.";
      else message = `Custom attributes request failed (${response.status}). Please try again.`;
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  if (!response.headers.get("content-type")?.toLowerCase().includes("json")) {
    throw new Error("Custom attributes service returned an unexpected response. Please contact support.");
  }
  return response.json();
}

export function getAttributeGroups(page: number, pageSize: number, search: string) {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search });
  return request<PagedResult<AttributeGroup>>(`?${query}`);
}

export function getGroupAttributes(page: number, pageSize: number, search: string, groupId?: number) {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search });
  if (groupId !== undefined) query.set("groupId", String(groupId));
  return request<PagedResult<GroupAttribute>>(`/attributes?${query}`);
}

export function saveAttributeGroup(groupId: number | null, body: SaveAttributeGroup) {
  return request<{ id: number; name: string }>(groupId === null ? "" : `/${groupId}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteAttributeGroup(groupId: number) {
  return request<void>(`/${groupId}`, { method: "DELETE" });
}

export function reorderAttributeGroups(page: number, pageSize: number, orderedIds: number[]) {
  return request<void>("/order", { method: "POST", body: JSON.stringify({ page, pageSize, orderedIds }) });
}

export function reorderGroupAttributes(groupId: number, page: number, pageSize: number, orderedIds: number[]) {
  return request<void>(`/${groupId}/attributes/order`, { method: "POST", body: JSON.stringify({ page, pageSize, orderedIds }) });
}

export interface CustomAttributeLayout {
  groups: Pick<AttributeGroup, "id" | "name" | "sort_order">[];
  attributes: Pick<GroupAttribute, "id" | "field_name" | "field_key" | "field_type" | "options_json" | "group_id" | "sort_order">[];
}

export function getCustomAttributeLayout() {
  return request<CustomAttributeLayout>("/layout");
}
