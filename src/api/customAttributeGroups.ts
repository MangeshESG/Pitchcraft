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

  const response = await fetch(`${basePath}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = await response.text();
    let message = body;
    try {
      const parsed = JSON.parse(body);
      message = parsed.message || parsed.title || body;
    } catch { /* Plain-text API error. */ }
    throw new Error(message || "Could not save the attribute group.");
  }
  return response.status === 204 ? undefined as T : response.json();
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
    method: groupId === null ? "POST" : "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteAttributeGroup(groupId: number) {
  return request<void>(`/${groupId}`, { method: "DELETE" });
}

export function reorderAttributeGroups(page: number, pageSize: number, orderedIds: number[]) {
  return request<void>("/order", { method: "PUT", body: JSON.stringify({ page, pageSize, orderedIds }) });
}

export function reorderGroupAttributes(groupId: number, page: number, pageSize: number, orderedIds: number[]) {
  return request<void>(`/${groupId}/attributes/order`, { method: "PUT", body: JSON.stringify({ page, pageSize, orderedIds }) });
}

export interface CustomAttributeLayout {
  groups: Pick<AttributeGroup, "id" | "name" | "sort_order">[];
  attributes: Pick<GroupAttribute, "id" | "field_name" | "field_key" | "field_type" | "options_json" | "group_id" | "sort_order">[];
}

export function getCustomAttributeLayout() {
  return request<CustomAttributeLayout>("/layout");
}
