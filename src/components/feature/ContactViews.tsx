import React, { useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../../config";
import DynamicContactsTable from "./DynamicContactsTable";
import PaginationControls from "./PaginationControls";
import FilterBuilder, { FilterCondition } from "../common/FilterBuilder";
import CommonSidePanel from "../common/CommonSidePanel";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrashAlt } from "@fortawesome/free-regular-svg-icons";

type FieldType = "text" | "number" | "date" | "boolean" | "dropdown";
type JoinOperator = "AND" | "OR";

interface ContactFieldOption {
  key: string;
  label: string;
  type: string;
  options?: string[];
}

interface ViewSummary {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
}

interface ViewMeta {
  filtersJson?: string;
  dataFileIds?: number[];
  segmentIds?: number[];
}

interface ViewItem extends ViewSummary, ViewMeta {}

interface ContactViewsProps {
  clientId: string | number;
  filterFields: ContactFieldOption[];
  columnNameMap?: Record<string, string>;
  persistedColumnSelection?: string[];
  onColumnsChange?: (columns: any[]) => void;
  onShowMessage?: (message: string, type: "success" | "error") => void;
}

interface FilterBuilderFieldOption {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
}

interface SourceOption {
  id: number;
  name: string;
}

const VIEW_META_PREFIX = "crm_view_meta_";

const getViewMetaKey = (clientId: string | number) =>
  `${VIEW_META_PREFIX}${clientId}`;

const loadViewMetaMap = (clientId: string | number): Record<string, ViewMeta> => {
  try {
    const raw = localStorage.getItem(getViewMetaKey(clientId));
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn("Failed to load view metadata:", error);
    return {};
  }
};

const saveViewMetaMap = (clientId: string | number, map: Record<string, ViewMeta>) => {
  try {
    localStorage.setItem(getViewMetaKey(clientId), JSON.stringify(map));
  } catch (error) {
    console.warn("Failed to save view metadata:", error);
  }
};

const normalizeFieldType = (value?: string): FieldType => {
  switch ((value || "").toLowerCase()) {
    case "number":
      return "number";
    case "date":
    case "datetime":
      return "date";
    case "boolean":
      return "boolean";
    case "dropdown":
      return "dropdown";
    case "longtext":
    case "text":
    default:
      return "text";
  }
};

const normalizeCustomFieldKey = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const getRowValue = (row: Record<string, any>, fieldKey: string) => {
  const directValue = row[fieldKey];

  if (directValue !== undefined) {
    return directValue;
  }

  if (!fieldKey.startsWith("custom_")) {
    return directValue;
  }

  const customKey = fieldKey.replace(/^custom_/, "");
  const customFields =
    row.customFields && typeof row.customFields === "object"
      ? row.customFields
      : {};

  if (customKey in customFields) {
    return customFields[customKey];
  }

  const normalizedTarget = normalizeCustomFieldKey(customKey);
  const matchedEntry = Object.entries(customFields).find(
    ([key]) => normalizeCustomFieldKey(key) === normalizedTarget
  );

  if (matchedEntry) {
    return matchedEntry[1];
  }

  if (customKey in row) {
    return row[customKey];
  }

  return directValue;
};

const isCompleteCondition = (condition: FilterCondition) =>
  condition.field?.trim() &&
  condition.operator?.trim() &&
  String(condition.value ?? "").trim() !== "";

interface FilterGroup {
  id?: string;
  joinWithPrevious?: JoinOperator;
  conditions: FilterCondition[];
}

const parseFiltersJson = (
  filtersJson?: string
): { logic: string; groups: FilterGroup[] } => {
  if (!filtersJson) {
    return { logic: "NONE", groups: [] };
  }

  try {
    const parsed = JSON.parse(filtersJson);
    if (!parsed) {
      return { logic: "NONE", groups: [] };
    }
    if (Array.isArray(parsed.groups)) {
      return { logic: String(parsed.logic || "GROUPS"), groups: parsed.groups };
    }
    if (Array.isArray(parsed.conditions)) {
      return {
        logic: String(parsed.logic || "CHAIN"),
        groups: [{ conditions: parsed.conditions as FilterCondition[] }],
      };
    }
    return {
      logic: "NONE",
      groups: [],
    };
  } catch {
    return { logic: "NONE", groups: [] };
  }
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const ContactViews: React.FC<ContactViewsProps> = ({
  clientId,
  filterFields,
  columnNameMap,
  persistedColumnSelection = [],
  onColumnsChange,
  onShowMessage,
}) => {
  const [views, setViews] = useState<ViewItem[]>([]);
  const [viewSearch, setViewSearch] = useState("");
  const [currentPageViews, setCurrentPageViews] = useState(1);
  const [pageSizeViews, setPageSizeViews] = useState<number | "All">(10);
  const [isLoadingViews, setIsLoadingViews] = useState(false);
  const [availableDataFiles, setAvailableDataFiles] = useState<SourceOption[]>([]);
  const [availableSegments, setAvailableSegments] = useState<SourceOption[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(false);

  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const [selectedView, setSelectedView] = useState<ViewItem | null>(null);
  const [viewContacts, setViewContacts] = useState<any[]>([]);
  const [viewSearchQuery, setViewSearchQuery] = useState("");
  const [viewCurrentPage, setViewCurrentPage] = useState(1);
  const [viewPageSize] = useState(10);
  const [isLoadingViewContacts, setIsLoadingViewContacts] = useState(false);
  const [viewMetaMissing, setViewMetaMissing] = useState(false);
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  const [isUpdatingView, setIsUpdatingView] = useState(false);
  const [editingView, setEditingView] = useState<ViewItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDataFileIds, setEditDataFileIds] = useState<number[]>([]);
  const [editSegmentIds, setEditSegmentIds] = useState<number[]>([]);
  const [editFiltersJson, setEditFiltersJson] = useState("");
  const [editFiltersSeed, setEditFiltersSeed] = useState("");
  const [viewActionsAnchor, setViewActionsAnchor] = useState<number | null>(null);

  const fieldTypeMap = useMemo(() => {
    const map = new Map<string, FieldType>();
    filterFields.forEach((field) => {
      map.set(field.key, normalizeFieldType(field.type));
    });
    return map;
  }, [filterFields]);

  const normalizedFilterFields = useMemo<FilterBuilderFieldOption[]>(
    () =>
      filterFields.map((field) => ({
        ...field,
        type: normalizeFieldType(field.type),
      })),
    [filterFields]
  );

  const menuBtnStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 18px",
    textAlign: "left",
    background: "none",
    border: "none",
    color: "#222",
    fontSize: "15px",
    cursor: "pointer",
  };

  const actionIconStyle: React.CSSProperties = {
    width: 24,
    height: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  const fetchViews = async () => {
    if (!clientId) return;
    setIsLoadingViews(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/views-by-client?clientId=${clientId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch views");
      }
      const data: ViewSummary[] = await response.json();
      const metaMap = loadViewMetaMap(clientId);
      const merged = data.map((view) => ({
        ...view,
        ...metaMap[String(view.id)],
      }));
      setViews(merged);
    } catch (error) {
      console.error("Error fetching views:", error);
      setViews([]);
    } finally {
      setIsLoadingViews(false);
    }
  };

  useEffect(() => {
    fetchViews();
  }, [clientId]);

  const fetchSources = async () => {
    if (!clientId) return;
    setIsLoadingSources(true);
    try {
      const [dataFilesResponse, segmentsResponse] = await Promise.all([
        fetch(
          `${API_BASE_URL}/api/Crm/datafile-byclientid?clientId=${clientId}`
        ),
        fetch(
          `${API_BASE_URL}/api/Crm/get-segments-by-client?clientId=${clientId}`
        ),
      ]);

      if (dataFilesResponse.ok) {
        const dataFiles = await dataFilesResponse.json();
        const normalized = (dataFiles || [])
          .filter((file: any) => file?.id != null)
          .map((file: any) => ({
            id: Number(file.id),
            name: file.name || file.data_file_name || `List ${file.id}`,
          }));
        setAvailableDataFiles(normalized);
      }

      if (segmentsResponse.ok) {
        const segments = await segmentsResponse.json();
        const normalized = (segments || [])
          .filter((segment: any) => segment?.id != null)
          .map((segment: any) => ({
            id: Number(segment.id),
            name: segment.name || `Segment ${segment.id}`,
          }));
        setAvailableSegments(normalized);
      }
    } catch (error) {
      console.error("Error fetching view sources:", error);
    } finally {
      setIsLoadingSources(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, [clientId]);

  useEffect(() => {
    setViewMode("list");
    setSelectedView(null);
    setViewContacts([]);
    setViewMetaMissing(false);
  }, [clientId]);

  const filteredViews = useMemo(() => {
    const searchLower = viewSearch.toLowerCase();
    return views.filter((view) => {
      return (
        view.name?.toLowerCase().includes(searchLower) ||
        view.description?.toLowerCase().includes(searchLower) ||
        String(view.id).includes(searchLower)
      );
    });
  }, [views, viewSearch]);

  useEffect(() => {
    setCurrentPageViews(1);
  }, [viewSearch]);

  const getNumericPageSize = (size: number | "All", totalItems: number) => {
    return size === "All" ? totalItems : size;
  };

  const paginatedViews = useMemo(() => {
    const numericPageSize =
      getNumericPageSize(pageSizeViews, filteredViews.length) || 1;
    const startIndex = (currentPageViews - 1) * numericPageSize;
    const endIndex = startIndex + numericPageSize;
    return filteredViews.slice(startIndex, endIndex);
  }, [filteredViews, currentPageViews, pageSizeViews]);

  const totalPagesViews = useMemo(() => {
    const numericPageSize =
      getNumericPageSize(pageSizeViews, filteredViews.length) || 1;
    return Math.ceil(filteredViews.length / numericPageSize);
  }, [filteredViews.length, pageSizeViews]);

  const evaluateCondition = (
    row: Record<string, any>,
    condition: FilterCondition
  ) => {
    const value = getRowValue(row, condition.field);
    const normalizedFieldType = fieldTypeMap.get(condition.field) || "text";

    switch (condition.operator) {
      case "contains":
        return String(value)
          .toLowerCase()
          .includes(String(condition.value).toLowerCase());
      case "equals":
        return normalizedFieldType === "boolean"
          ? String(value).toLowerCase() === String(condition.value).toLowerCase()
          : String(value).toLowerCase() === String(condition.value).toLowerCase();
      case "notEquals":
        return normalizedFieldType === "boolean"
          ? String(value).toLowerCase() !== String(condition.value).toLowerCase()
          : String(value).toLowerCase() !== String(condition.value).toLowerCase();
      case "startsWith":
        return String(value)
          .toLowerCase()
          .startsWith(String(condition.value).toLowerCase());
      case "endsWith":
        return String(value)
          .toLowerCase()
          .endsWith(String(condition.value).toLowerCase());
      case "gt":
        return Number(value) > Number(condition.value);
      case "lt":
        return Number(value) < Number(condition.value);
      case "gte":
        return Number(value) >= Number(condition.value);
      case "lte":
        return Number(value) <= Number(condition.value);
      case "before":
        return new Date(value) < new Date(condition.value);
      case "after":
        return new Date(value) > new Date(condition.value);
      default:
        return true;
    }
  };

  const applySavedFilters = (rows: any[], filtersJson?: string) => {
    const parsed = parseFiltersJson(filtersJson);
    const groups = (parsed.groups || [])
      .map((group, groupIndex) => ({
        ...group,
        joinWithPrevious:
          groupIndex === 0 ? undefined : group.joinWithPrevious || "AND",
        conditions: (group.conditions || []).filter((condition) =>
          isCompleteCondition(condition)
        ),
      }))
      .filter((group) => group.conditions.length > 0);

    if (groups.length === 0) {
      return rows;
    }

    return rows.filter((row) =>
      groups.reduce((groupResult, group, groupIndex) => {
        const conditionsResult = group.conditions.reduce(
          (result, condition, index) => {
            const evaluation = evaluateCondition(row, condition);
            if (index === 0) return evaluation;
            return condition.joinWithPrevious === "OR"
              ? result || evaluation
              : result && evaluation;
          },
          true as boolean
        );

        if (groupIndex === 0) {
          return conditionsResult;
        }

        return group.joinWithPrevious === "OR"
          ? groupResult || conditionsResult
          : groupResult && conditionsResult;
      }, true as boolean)
    );
  };

  const fetchContactsForView = async (view: ViewItem) => {
    setIsLoadingViewContacts(true);
    setViewMetaMissing(false);
    try {
      const dataFileIds = view.dataFileIds || [];
      const segmentIds = view.segmentIds || [];

      if (dataFileIds.length === 0 && segmentIds.length === 0) {
        setViewContacts([]);
        setViewMetaMissing(true);
        return;
      }

      let segmentDataFileMap: Record<number, number> = {};
      if (segmentIds.length > 0) {
        try {
          const segmentResponse = await fetch(
            `${API_BASE_URL}/api/Crm/get-segments-by-client?clientId=${clientId}`
          );
          if (segmentResponse.ok) {
            const segmentData = await segmentResponse.json();
            segmentDataFileMap = (segmentData || []).reduce(
              (acc: Record<number, number>, segment: any) => {
                if (segment?.id != null && segment?.dataFileId != null) {
                  acc[segment.id] = segment.dataFileId;
                }
                return acc;
              },
              {}
            );
          }
        } catch (error) {
          console.warn("Failed to load segment metadata:", error);
        }
      }

      const dataFileRequests = dataFileIds.map(async (dataFileId) => {
        const response = await fetch(
          `${API_BASE_URL}/api/Crm/contacts/List-by-CleinteId?clientId=${clientId}&dataFileId=${dataFileId}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch contacts for view");
        }
        const data = await response.json();
        const contacts = data.contacts || [];
        return contacts.map((contact: any) => ({
          ...contact,
          dataFileId,
        }));
      });

      const segmentRequests = segmentIds.map(async (segmentId) => {
        const response = await fetch(
          `${API_BASE_URL}/api/Crm/segment-contacts?clientId=${clientId}&segmentId=${segmentId}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch segment contacts for view");
        }
        const data = await response.json();
        const contacts = data.contacts || [];
        const fallbackDataFileId = segmentDataFileMap[segmentId];
        return contacts.map((contact: any) => ({
          ...contact,
          segmentId,
          dataFileId: contact.dataFileId ?? fallbackDataFileId,
        }));
      });

      const results = await Promise.all([
        Promise.allSettled(dataFileRequests),
        Promise.allSettled(segmentRequests),
      ]);

      const mergedContacts: any[] = [];
      results.forEach((resultGroup) => {
        resultGroup.forEach((result) => {
          if (result.status === "fulfilled") {
            mergedContacts.push(...result.value);
          }
        });
      });

      const mergedMap = new Map<number, any>();
      mergedContacts.forEach((contact) => {
        const existing = mergedMap.get(contact.id);
        if (existing) {
          mergedMap.set(contact.id, { ...existing, ...contact });
        } else {
          mergedMap.set(contact.id, contact);
        }
      });

      const mergedList = Array.from(mergedMap.values());
      const filtered = applySavedFilters(mergedList, view.filtersJson);
      setViewContacts(filtered);
    } catch (error) {
      console.error("Error fetching view contacts:", error);
      setViewContacts([]);
      onShowMessage?.("Failed to load view contacts.", "error");
    } finally {
      setIsLoadingViewContacts(false);
    }
  };

  useEffect(() => {
    if (viewMode === "detail" && selectedView) {
      fetchContactsForView(selectedView);
    }
  }, [viewMode, selectedView?.id]);

  const handleDeleteView = async (view: ViewItem) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete view "${view.name}"?`
    );
    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/delete-view?viewId=${view.id}`,
        { method: "POST" }
      );
      if (!response.ok) {
        throw new Error("Failed to delete view");
      }
      const metaMap = loadViewMetaMap(clientId);
      delete metaMap[String(view.id)];
      saveViewMetaMap(clientId, metaMap);
      setViews((prev) => prev.filter((item) => item.id !== view.id));
      onShowMessage?.("View deleted successfully.", "success");
    } catch (error) {
      console.error("Error deleting view:", error);
      onShowMessage?.("Failed to delete view.", "error");
    }
  };

  const openView = (view: ViewItem) => {
    setViewActionsAnchor(null);
    setSelectedView(view);
    setViewMode("detail");
    setViewSearchQuery("");
    setViewCurrentPage(1);
  };

  const openEditPanel = (view: ViewItem) => {
    setEditingView(view);
    setEditName(view.name || "");
    setEditDescription(view.description || "");
    setEditDataFileIds(view.dataFileIds || []);
    setEditSegmentIds(view.segmentIds || []);
    setEditFiltersJson(view.filtersJson || "");
    setEditFiltersSeed(view.filtersJson || "");
    setIsEditPanelOpen(true);
  };

  const toggleId = (
    list: number[],
    id: number,
    updater: (next: number[]) => void
  ) => {
    if (list.includes(id)) {
      updater(list.filter((entry) => entry !== id));
    } else {
      updater([...list, id]);
    }
  };

  const handleUpdateView = async () => {
    if (!editingView) return;
    if (!editName.trim()) {
      onShowMessage?.("View name is required.", "error");
      return;
    }
    const parsedFilters = parseFiltersJson(editFiltersJson);
    const completeConditions = (parsedFilters.groups || []).flatMap((group) =>
      (group.conditions || []).filter((condition) => isCompleteCondition(condition))
    );
    if (completeConditions.length === 0) {
      onShowMessage?.("Add at least one complete filter before saving.", "error");
      return;
    }

    setIsUpdatingView(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/Crm/update-view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          viewId: editingView.id,
          name: editName.trim(),
          description: editDescription.trim(),
          filtersJson: editFiltersJson,
          dataFileIds: editDataFileIds,
          segmentIds: editSegmentIds,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to update view");
      }

      const updatedView: ViewItem = {
        ...editingView,
        name: editName.trim(),
        description: editDescription.trim(),
        filtersJson: editFiltersJson,
        dataFileIds: editDataFileIds,
        segmentIds: editSegmentIds,
      };

      setViews((prev) =>
        prev.map((view) => (view.id === updatedView.id ? updatedView : view))
      );

      if (selectedView?.id === updatedView.id) {
        setSelectedView(updatedView);
      }

      const metaMap = loadViewMetaMap(clientId);
      metaMap[String(updatedView.id)] = {
        filtersJson: editFiltersJson,
        dataFileIds: editDataFileIds,
        segmentIds: editSegmentIds,
      };
      saveViewMetaMap(clientId, metaMap);

      onShowMessage?.("View updated successfully.", "success");
      setIsEditPanelOpen(false);
      setEditingView(null);
    } catch (error) {
      console.error("Error updating view:", error);
      onShowMessage?.("Failed to update view.", "error");
    } finally {
      setIsUpdatingView(false);
    }
  };

  const detailHeader = viewMetaMissing ? (
    <div
      style={{
        marginBottom: 16,
        padding: "12px 16px",
        background: "#fff7ed",
        borderRadius: 6,
        border: "1px solid #fed7aa",
        color: "#9a3412",
      }}
    >
      This view was saved on the server, but its filter details are
      not cached in this browser yet. Open the list where it was
      created and save it again to make it usable here.
    </div>
  ) : (
    <div
      style={{
        marginBottom: 16,
        padding: "12px 16px",
        background: "#f0f7ff",
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        gap: 16,
        justifyContent: "space-between",
      }}
    >
      <span style={{ fontWeight: 500 }}>
        {viewContacts.length} contact
        {viewContacts.length === 1 ? "" : "s"} in this view
      </span>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {selectedView?.filtersJson && (
          <span style={{ color: "#4b5563", fontSize: 13 }}>
            Filter rules applied
          </span>
        )}
        <button
          type="button"
          className="button secondary"
          onClick={() => selectedView && openEditPanel(selectedView)}
        >
          Edit view
        </button>
      </div>
    </div>
  );

  return (
    <div className="list-content">
      <div className="section-wrapper">
        {viewMode === "list" ? (
          <>
            <h2 className="section-title">Views</h2>
            <p style={{ marginBottom: "16px", color: "#555" }}>
              Saved filters that you can reuse across lists and segments.
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: -5,
                gap: 16,
              }}
            >
              <input
                type="text"
                className="search-input"
                style={{ width: 340 }}
                placeholder="Search a view name or ID"
                value={viewSearch}
                onChange={(event) => setViewSearch(event.target.value)}
              />
            </div>

            <PaginationControls
              currentPage={currentPageViews}
              totalPages={totalPagesViews}
              pageSize={pageSizeViews}
              totalRecords={filteredViews.length}
              setCurrentPage={setCurrentPageViews}
              setPageSize={setPageSizeViews}
              showPageSizeDropdown={true}
              pageLabel="Page:"
            />

            <div style={{ marginBottom: "10px" }} />
            <table
              className="contacts-table"
              style={{ background: "#fff", width: "100%", tableLayout: "auto" }}
            >
              <thead>
                <tr>
                  <th>Views</th>
                  <th>ID</th>
                  <th>Created date</th>
                  <th>Description</th>
                  <th>Sources</th>
                  <th style={{ minWidth: 48 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingViews ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center" }}>
                      Loading...
                    </td>
                  </tr>
                ) : paginatedViews.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center" }}>
                      No views found.
                    </td>
                  </tr>
                ) : (
                  paginatedViews.map((view) => (
                    <tr key={view.id}>
                      <td>
                        <span
                          className="list-link text-[#3f9f42]"
                          style={{
                            color: "#28a745",
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                          onClick={() => openView(view)}
                        >
                          {view.name}
                        </span>
                      </td>
                      <td>#{view.id}</td>
                      <td>{formatDate(view.created_at)}</td>
                      <td>{view.description || "-"}</td>
                      <td>
                        {view.dataFileIds?.length || view.segmentIds?.length
                          ? `${view.dataFileIds?.length || 0} list(s), ${view.segmentIds?.length || 0} segment(s)`
                          : "Not cached"}
                      </td>
                      <td>
                        <div style={{ position: "relative" }}>
                          <button
                            className="segment-actions-btn font-[600]"
                            style={{
                              border: "none",
                              background: "none",
                              fontSize: 24,
                              cursor: "pointer",
                              padding: "2px 10px",
                            }}
                            onClick={() =>
                              setViewActionsAnchor(
                                viewActionsAnchor === view.id ? null : view.id
                              )
                            }
                            aria-label="View actions"
                          >
                            &#8942;
                          </button>

                          {viewActionsAnchor === view.id && (
                            <div
                              className="segment-actions-menu py-[10px]"
                              style={{
                                position: "absolute",
                                right: 0,
                                top: 32,
                                background: "#fff",
                                border: "1px solid #eee",
                                borderRadius: 6,
                                boxShadow: "0 2px 16px rgba(0,0,0,0.12)",
                                zIndex: 101,
                                minWidth: 160,
                              }}
                            >
                              <button
                                onClick={() => {
                                  openView(view);
                                  setViewActionsAnchor(null);
                                }}
                                style={menuBtnStyle}
                                className="flex gap-2 items-center"
                              >
                                <span style={actionIconStyle}>
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="22px"
                                    height="22px"
                                    viewBox="0 0 24 20"
                                    fill="none"
                                  >
                                    <circle cx="12" cy="12" r="4" fill="#3f9f42" />
                                    <path
                                      d="M21 12C21 12 20 4 12 4C4 4 3 12 3 12"
                                      stroke="#3f9f42"
                                      stroke-width="2"
                                    />
                                  </svg>
                                </span>
                                <span className="font-[600]">View</span>
                              </button>
                              <button
                                onClick={() => {
                                  openEditPanel(view);
                                  setViewActionsAnchor(null);
                                }}
                                style={menuBtnStyle}
                                className="flex gap-2 items-center"
                              >
                                <span style={actionIconStyle}>
                                  <FontAwesomeIcon
                                    icon={faEdit}
                                    style={{ color: "#3f9f42", fontSize: 20 }}
                                  />
                                </span>
                                <span className="font-[600]">Edit</span>
                              </button>
                              <button
                                onClick={() => {
                                  handleDeleteView(view);
                                  setViewActionsAnchor(null);
                                }}
                                style={menuBtnStyle}
                                className="flex gap-2 items-center"
                              >
                                <span style={actionIconStyle}>
                                  <FontAwesomeIcon
                                    icon={faTrashAlt}
                                    style={{ color: "#3f9f42", fontSize: 20 }}
                                  />
                                </span>
                                <span className="font-[600]">Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        ) : (
          <>
            <DynamicContactsTable
              data={viewContacts}
              isLoading={isLoadingViewContacts}
              search={viewSearchQuery}
              setSearch={setViewSearchQuery}
              showCheckboxes={false}
              paginated={true}
              currentPage={viewCurrentPage}
              pageSize={viewPageSize}
              onPageChange={setViewCurrentPage}
              totalItems={viewContacts.length}
              autoGenerateColumns={true}
              excludeFields={[
                "email_body",
                "email_subject",
                "dataFileId",
                "data_file",
                "customFields",
              ]}
              onColumnsChange={onColumnsChange}
              persistedColumnSelection={persistedColumnSelection}
              customFormatters={{
                full_name: (value: any, row: any) => {
                  if (!value || value === "-") return "-";

                  const fallbackDataFileId =
                    selectedView?.dataFileIds?.length === 1
                      ? selectedView?.dataFileIds?.[0]
                      : undefined;
                  const fallbackSegmentId =
                    selectedView?.segmentIds?.length === 1
                      ? selectedView?.segmentIds?.[0]
                      : undefined;

                  const dataFileId =
                    row.dataFileId || row.DataFileId || fallbackDataFileId;
                  const segmentId = row.segmentId || row.SegmentId || fallbackSegmentId;

                  const params = new URLSearchParams();
                  if (segmentId) params.set("segmentId", String(segmentId));
                  if (dataFileId != null) params.set("dataFileId", String(dataFileId));
                  const query = params.toString();

                  const contactDetailsUrl = `/#/contact-details/${row.id}${
                    query ? `?${query}` : ""
                  }`;

                  return (
                    <span
                      style={{
                        color: "#3f9f42",
                        textDecoration: "underline",
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        window.open(contactDetailsUrl, "_blank");
                      }}
                    >
                      {value}
                    </span>
                  );
                },
                created_at: (value: any) => formatDate(value),
                updated_at: (value: any) => formatDate(value),
                email_sent_at: (value: any) => formatDate(value),
                website: (value: any) => {
                  if (!value || value === "-") return "-";
                  const url = value.startsWith("http") ? value : `https://${value}`;
                  return (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={value}
                      style={{
                        color: "#3f9f42",
                        textDecoration: "none",
                        cursor: "pointer",
                        fontSize: "16px",
                      }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      Link
                    </a>
                  );
                },
                linkedin_url: (value: any) => {
                  if (!value || value === "-" || value.toLowerCase() === "linkedin.com") {
                    return "-";
                  }
                  const url = value.startsWith("http") ? value : `https://${value}`;
                  return (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={value}
                      style={{
                        color: "#0077b5",
                        textDecoration: "none",
                        cursor: "pointer",
                        fontSize: "16px",
                      }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                    </a>
                  );
                },
                email: (value: any) => {
                  if (!value || value === "-") return "-";
                  return (
                    <a
                      href={`mailto:${value}`}
                      style={{
                        color: "#3f9f42",
                        textDecoration: "underline",
                      }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {value}
                    </a>
                  );
                },
                notes: (value: any) => {
                  if (!value || value === "-" || value.trim() === "") return "-";
                  return (
                    <span
                      title={value}
                      style={{
                        cursor: "pointer",
                        fontSize: "16px",
                        color: "#666",
                      }}
                    >
                      Note
                    </span>
                  );
                },
              }}
              searchFields={[
                "full_name",
                "email",
                "company_name",
                "job_title",
                "country_or_address",
              ]}
              primaryKey="id"
              viewMode="detail"
              detailTitle={`${selectedView?.name} (#${selectedView?.id})`}
              detailDescription={
                selectedView?.description || "No description available"
              }
              onBack={() => {
                setViewMode("list");
                setSelectedView(null);
                setViewContacts([]);
                setViewMetaMissing(false);
              }}
              columnNameMap={columnNameMap}
              customHeader={detailHeader}
            />
          </>
        )}
      </div>

      <CommonSidePanel
        isOpen={isEditPanelOpen}
        onClose={() => {
          setIsEditPanelOpen(false);
          setEditingView(null);
          setEditFiltersSeed("");
        }}
        title="Edit view"
        footerContent={
          <>
            <button
              onClick={() => {
                setIsEditPanelOpen(false);
                setEditingView(null);
                setEditFiltersSeed("");
              }}
              className="button secondary"
              style={{
                padding: "10px 32px",
                border: "1px solid #ddd",
                background: "#fff",
                borderRadius: "24px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                color: "#333",
              }}
            >
              Cancel
            </button>
            <button
              className="button primary"
              onClick={handleUpdateView}
              disabled={isUpdatingView || !editName.trim() || !editFiltersJson}
              style={{
                padding: "10px 32px",
                background: "#fff",
                color:
                  editName.trim() && !isUpdatingView && editFiltersJson
                    ? "#3f9f42"
                    : "#ccc",
                border: `1px solid ${
                  editName.trim() && !isUpdatingView && editFiltersJson
                    ? "#3f9f42"
                    : "#ccc"
                }`,
                borderRadius: "24px",
                cursor:
                  editName.trim() && !isUpdatingView && editFiltersJson
                    ? "pointer"
                    : "not-allowed",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              {isUpdatingView ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        {!editFiltersJson && (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 8,
              border: "1px solid #fde68a",
              background: "#fffbeb",
              color: "#92400e",
              fontSize: 13,
            }}
          >
            Filters are not cached for this view. You can rebuild the filters
            below, or open the original list and save the view again.
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            View name <span style={{ color: "red" }}>*</span>
          </label>
          <input
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
            placeholder="Enter view name"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Description
          </label>
          <textarea
            value={editDescription}
            onChange={(event) => setEditDescription(event.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              minHeight: "80px",
              resize: "vertical",
            }}
            placeholder="Enter description"
            rows={3}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
            Lists
          </label>
          {isLoadingSources && availableDataFiles.length === 0 ? (
            <div style={{ fontSize: 13, color: "#666" }}>Loading lists...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {availableDataFiles.length === 0 && (
                <div style={{ fontSize: 13, color: "#666" }}>
                  No lists available.
                </div>
              )}
              {availableDataFiles.map((file) => (
                <label
                  key={file.id}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <input
                    type="checkbox"
                    checked={editDataFileIds.includes(file.id)}
                    onChange={() =>
                      toggleId(editDataFileIds, file.id, setEditDataFileIds)
                    }
                  />
                  <span>{file.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
            Segments
          </label>
          {isLoadingSources && availableSegments.length === 0 ? (
            <div style={{ fontSize: 13, color: "#666" }}>Loading segments...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {availableSegments.length === 0 && (
                <div style={{ fontSize: 13, color: "#666" }}>
                  No segments available.
                </div>
              )}
              {availableSegments.map((segment) => (
                <label
                  key={segment.id}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <input
                    type="checkbox"
                    checked={editSegmentIds.includes(segment.id)}
                    onChange={() =>
                      toggleId(editSegmentIds, segment.id, setEditSegmentIds)
                    }
                  />
                  <span>{segment.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
            Filters
          </label>
          <FilterBuilder
            data={[]}
            fields={normalizedFilterFields}
            onFiltered={() => {}}
            initialFiltersJson={editFiltersSeed}
            onFiltersJsonChange={(nextFiltersJson) =>
              setEditFiltersJson(nextFiltersJson)
            }
            hideApplyButton={true}
          />
        </div>
      </CommonSidePanel>
    </div>
  );
};

export default ContactViews;
