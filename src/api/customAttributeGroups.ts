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
  assigned_system_group_key: string | null;
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

function withSelectedClient(path: string): string {
  const selected = sessionStorage.getItem("selectedClientId") || localStorage.getItem("selectedClientId");
  if (!selected || !/^[1-9]\d*$/.test(selected)) return `${basePath}${path}`;
  const url = new URL(`${basePath}${path}`, window.location.origin);
  url.searchParams.set("clientId", selected);
  return url.toString();
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (!token) throw new Error("Please sign in again to manage attribute groups.");

  let response: Response;
  try {
    response = await fetch(withSelectedClient(path), {
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

export function getGroupAttributes(page: number, pageSize: number, search: string, groupId?: number, ungroupedOnly = false, systemGroupKey?: string) {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search });
  if (groupId !== undefined) query.set("groupId", String(groupId));
  if (ungroupedOnly) query.set("ungroupedOnly", "true");
  if (systemGroupKey) query.set("systemGroupKey", systemGroupKey);
  return request<PagedResult<GroupAttribute>>(`/attributes?${query}`);
}

export function saveAttributeGroup(groupId: number | null, body: SaveAttributeGroup) {
  return request<{ id: number; name: string }>(groupId === null ? "" : `/${groupId}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteAttributeGroup(groupId: number) {
  return request<void>(`/${groupId}/delete`, { method: "POST" });
}

export function reorderAttributeGroups(page: number, pageSize: number, orderedIds: number[]) {
  return request<void>("/order", { method: "POST", body: JSON.stringify({ page, pageSize, orderedIds }) });
}

export function reorderGroupAttributes(groupId: number, page: number, pageSize: number, orderedIds: number[]) {
  return request<void>(`/${groupId}/attributes/order`, { method: "POST", body: JSON.stringify({ page, pageSize, orderedIds }) });
}

export function reorderMixedGroupAttributes(groupId: number, orderedKeys: string[]) {
  return request<void>(`/${groupId}/mixed-order`, { method: "POST", body: JSON.stringify({ orderedKeys }) });
}

export function moveGroupAttribute(attributeId: number, destinationGroupId: number | null) {
  return request<void>("/attributes/move", {
    method: "POST",
    body: JSON.stringify({ attributeId, destinationGroupId: destinationGroupId ?? 0 }),
  });
}

export function moveGroupAttributeToSystem(attributeId: number, destinationSystemGroupKey: "personal" | "company") {
  return request<void>("/attributes/move", {
    method: "POST",
    body: JSON.stringify({ attributeId, destinationGroupId: 0, destinationSystemGroupKey }),
  });
}

export interface CustomAttributeLayout {
  groups: Pick<AttributeGroup, "id" | "name" | "sort_order">[];
  attributes: Pick<GroupAttribute, "id" | "field_name" | "field_key" | "field_type" | "options_json" | "group_id" | "assigned_system_group_key" | "sort_order">[];
}

export function getCustomAttributeLayout() {
  return request<CustomAttributeLayout>("/layout");
}

export interface SystemAttributeGroup {
  key: string;
  name: string;
  customAttributeCount?: number;
  fields: { key: string; name: string; type: string; order: number; groupKey: string }[];
}

export async function getSystemAttributeGroups(): Promise<SystemAttributeGroup[]> {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const response = await fetch(withSelectedClient("/system"), {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Could not load system attribute groups.");
  const result = await response.json();
  return result.groups;
}

export async function reorderSystemAttributes(groupKey: string, orderedKeys: string[]): Promise<void> {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const response = await fetch(withSelectedClient(`/system/${groupKey}/order`), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ orderedKeys }),
  });
  if (!response.ok) throw new Error("Could not save system field order.");
}

export async function moveSystemAttributes(destinationGroupKey: string, fieldKeys: string[]): Promise<void> {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const response = await fetch(withSelectedClient("/system/move"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ destinationGroupKey, fieldKeys }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || "Could not move system fields.");
  }
}
