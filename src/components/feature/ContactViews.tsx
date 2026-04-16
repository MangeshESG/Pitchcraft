import React, { useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../../config";
import DynamicContactsTable from "./DynamicContactsTable";
import PaginationControls from "./PaginationControls";
import FilterBuilder from "../common/FilterBuilder";
import CommonSidePanel from "../common/CommonSidePanel";
import AppModal from "../common/AppModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import duplicateIcon from "../../assets/images/icons/duplicate.png";
import BulkUpdatePanel from "./BulkUpdatePanel";
import SegmentModal from "../common/SegmentModal";

import {
  faEdit,
  faTrashAlt,
} from "@fortawesome/free-regular-svg-icons";

import type {
  FieldType,
  FilterCondition,
  FilterGroup,
  JoinOperator,
} from "../common/filterTypes";
import {
  TRACKING_CLICK_FIELD,
  TRACKING_OPEN_FIELD,
  buildTrackingIndexesForGroups,
  conditionRequiresCampaign,
  evaluateTrackingCondition,
  hasRequiredConditionContext,
} from "../../utils/trackingFilterUtils";

import { useAppModal } from "../../hooks/useAppModal";
import { useAppData } from "../../contexts/AppDataContext";


interface ContactFieldOption {
  key: string;
  label: string;
  type: string;
  options?: string[];
  contextType?: "campaign";
}

interface ViewSummary {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
  contactCount?: number;
}

interface ViewMeta {
  filtersJson?: string;
  dataFileIds?: number[];
  segmentIds?: number[];
  useAllDataFiles?: boolean;
  excludedDataFileIds?: number[];
}

interface ViewItem extends ViewSummary, ViewMeta {}

interface ContactViewsProps {
  clientId: string | number;
  filterFields: ContactFieldOption[];
  columnNameMap?: Record<string, string>;
  persistedColumnSelection?: string[];
  onColumnsChange?: (columns: any[]) => void;
  onShowMessage?: (message: string, type: "success" | "error") => void;
  isActive?: boolean;
  refreshToken?: number;
}

interface FilterBuilderFieldOption {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  contextType?: "campaign";
}

type CsvColumn = {
  key: string;
  header: string;
  getValue?: (contact: any) => any;
};

const VIEW_META_PREFIX = "crm_view_meta_";
const VIEW_STATE_PREFIX = "crm_view_state_";

const getViewMetaKey = (clientId: string | number) =>
  `${VIEW_META_PREFIX}${clientId}`;

const getViewStateKey = (clientId: string | number) =>
  `${VIEW_STATE_PREFIX}${clientId}`;

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

const loadViewState = (
  clientId: string | number
): { viewId: number; viewMode: "detail" } | null => {
  try {
    const raw = sessionStorage.getItem(getViewStateKey(clientId));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed?.viewMode !== "detail" || !Number.isFinite(Number(parsed?.viewId))) {
      return null;
    }

    return {
      viewId: Number(parsed.viewId),
      viewMode: "detail",
    };
  } catch (error) {
    console.warn("Failed to load view state:", error);
    return null;
  }
};

const saveViewState = (
  clientId: string | number,
  state: { viewId: number; viewMode: "detail" }
) => {
  try {
    sessionStorage.setItem(getViewStateKey(clientId), JSON.stringify(state));
  } catch (error) {
    console.warn("Failed to save view state:", error);
  }
};

const clearViewState = (clientId: string | number) => {
  try {
    sessionStorage.removeItem(getViewStateKey(clientId));
  } catch (error) {
    console.warn("Failed to clear view state:", error);
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
  (condition.operator === "isEmpty" ||
    condition.operator === "isNotEmpty" ||
    String(condition.value ?? "").trim() !== "") &&
  hasRequiredConditionContext(condition);

interface SourceOption {
  id: number;
  name: string;
}

interface ParsedFilterGroup {
  id?: string;
  joinWithPrevious?: JoinOperator;
  conditions: FilterCondition[];
}

const parseFiltersJson = (
  filtersJson?: string
): { logic: string; groups: ParsedFilterGroup[] } => {
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

const getContactNameParts = (row: any) => {
  const first =
    row?.first_name?.trim() ||
    row?.firstName?.trim() ||
    "";
  const last =
    row?.last_name?.trim() ||
    row?.lastName?.trim() ||
    "";
  let full =
    row?.full_name?.trim() ||
    row?.fullName?.trim() ||
    "";

  if (!full && (first || last)) {
    full = `${first} ${last}`.trim();
  }

  if (!first && !last && full) {
    const parts = full.split(" ").filter(Boolean);
    return {
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" ").trim(),
      fullName: full,
    };
  }

  return { firstName: first, lastName: last, fullName: full };
};

const getDisplayName = (row: any) => {
  const { fullName } = getContactNameParts(row);
  return fullName || row?.email || "-";
};

const getCustomFieldValue = (contact: any, fieldName: string) => {
  const directKey = `custom_${normalizeCustomFieldKey(fieldName)}`;
  if (contact?.[directKey] !== undefined) {
    return contact[directKey];
  }

  let customFieldsValue = contact?.customFields;
  if (typeof customFieldsValue === "string") {
    try {
      customFieldsValue = JSON.parse(customFieldsValue);
    } catch {
      customFieldsValue = undefined;
    }
  }

  if (customFieldsValue && typeof customFieldsValue === "object") {
    if (fieldName in customFieldsValue) return customFieldsValue[fieldName];
    const normalizedTarget = normalizeCustomFieldKey(fieldName);
    const matchedEntry = Object.entries(customFieldsValue).find(
      ([key]) => normalizeCustomFieldKey(key) === normalizedTarget
    );
    if (matchedEntry) return matchedEntry[1];
  }

  return "";
};

const getTrackingCampaignIds = (groups: FilterGroup[]) =>
  Array.from(
    new Set(
      groups.flatMap((group) =>
        (group.conditions || [])
          .filter((condition) => conditionRequiresCampaign(condition))
          .map((condition) => Number(condition.context?.campaignId))
          .filter((campaignId) => Number.isFinite(campaignId) && campaignId > 0)
      )
    )
  );

const ContactViews: React.FC<ContactViewsProps> = ({
  clientId,
  filterFields,
  columnNameMap,
  persistedColumnSelection = [],
  onColumnsChange,
  onShowMessage,
  isActive = false,
  refreshToken = 0,
}) => {
  const [views, setViews] = useState<ViewItem[]>([]);
  const [viewSearch, setViewSearch] = useState("");
  const [currentPageViews, setCurrentPageViews] = useState(1);
  const [pageSizeViews, setPageSizeViews] = useState<number | "All">(10);
  const [viewSortKey, setViewSortKey] = useState("");
  const [viewSortDirection, setViewSortDirection] = useState<"asc" | "desc">(
    "asc"
  );
  const [isLoadingViews, setIsLoadingViews] = useState(false);
  const [availableDataFiles, setAvailableDataFiles] = useState<SourceOption[]>([]);
  const [availableSegments, setAvailableSegments] = useState<SourceOption[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(false);

  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const [selectedView, setSelectedView] = useState<ViewItem | null>(null);
  const [baseViewContacts, setBaseViewContacts] = useState<any[]>([]);
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
  const [editExcludedDataFileIds, setEditExcludedDataFileIds] = useState<number[]>([]);
  const [editSegmentIds, setEditSegmentIds] = useState<number[]>([]);
  const [editFiltersJson, setEditFiltersJson] = useState("");
  const [editFiltersSeed, setEditFiltersSeed] = useState("");
  const [viewActionsAnchor, setViewActionsAnchor] = useState<number | null>(null);
  const [viewContactCounts, setViewContactCounts] = useState<Record<number, number>>({});
  const [downloadingViewId, setDownloadingViewId] = useState<number | null>(null);
  const [showBulkUpdatePanel, setShowBulkUpdatePanel] = useState(false);
  const [showSaveSegmentModal, setShowSaveSegmentModal] = useState(false);
  const [isDeletingContact, setIsDeletingContact] = useState(false);
  const [isCloningContact, setIsCloningContact] = useState(false);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);

  const appModal = useAppModal(); // ✅ correct place
  const { triggerRefresh } = useAppData();
  //------------------------------
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const handleSelectContact = (contactId: string) => {
    setSelectedContacts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) newSet.delete(contactId);
      else newSet.add(contactId);
      return newSet;
    });
  };

const handleSelectAll = (contacts: any[]) => {
  const ids = contacts.map(c => c.id.toString());

  setSelectedContacts(prev => {
    const allSelected = ids.every(id => prev.has(id));
    return allSelected ? new Set() : new Set(ids);
  });
};

const handleUnsubscribeContacts = async () => {
  const ids = Array.from(selectedContacts);
  if (ids.length === 0) return;

  try {
    setIsUnsubscribing(true);

    for (const id of ids) {
      const contact = viewContacts.find((item) => item.id.toString() === id);

      if (!contact?.email) continue;

      const response = await fetch(
        `${API_BASE_URL}/api/Crm/UnsubscribeContacts?ClientId=${clientId}&email=${encodeURIComponent(contact.email)}`
      );

      if (!response.ok) {
        throw new Error("Failed to unsubscribe selected contacts");
      }
    }

    setSelectedContacts(new Set());
    if (selectedView) {
      await fetchContactsForView(selectedView);
    }
    appModal.showSuccess("Selected contacts unsubscribed successfully!");
  } catch (error) {
    console.error("Failed to unsubscribe contacts:", error);
    appModal.showError("Failed to unsubscribe selected contacts");
  } finally {
    setIsUnsubscribing(false);
  }
};

const handleCloneContacts = async () => {
  const ids = Array.from(selectedContacts);
  if (ids.length !== 1) return;

  try {
    setIsCloningContact(true);

    const response = await fetch(`${API_BASE_URL}/api/Crm/clone-contact?contactId=${ids[0]}`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Failed to clone contact");
    }

    setSelectedContacts(new Set());
    if (selectedView) {
      await fetchContactsForView(selectedView);
    }
    appModal.showSuccess("Contact cloned successfully!");
  } catch (error) {
    console.error("Failed to clone contact:", error);
    appModal.showError("Failed to clone contact");
  } finally {
    setIsCloningContact(false);
  }
};

const handleDeleteContacts = async () => {
  const ids = Array.from(selectedContacts);
  if (ids.length === 0) return;

  try {
    setIsDeletingContact(true);

    for (const id of ids) {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/delete-Datafile-contact?contactId=${id}`,
        {
          method: "POST",
          headers: {
            accept: "*/*",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete contact ${id}`);
      }
    }

    setSelectedContacts(new Set());
    if (selectedView) {
      await fetchContactsForView(selectedView);
    }
    appModal.showSuccess(`${ids.length} contact(s) deleted successfully!`);
  } catch (error) {
    console.error("Failed to delete contacts:", error);
    appModal.showError("Failed to delete contacts");
  } finally {
    setIsDeletingContact(false);
  }
};
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
  const viewColumnNameMap = useMemo(
    () => ({
      ...(columnNameMap || {}),
      hasOpened: "Opened",
      hasClicked: "Clicked",
    }),
    [columnNameMap]
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

  const getCustomFieldColumns = (data: any[]): CsvColumn[] => {
    const fieldMap = new Map<string, string>();

    filterFields.forEach((field) => {
      if (!field?.key?.startsWith("custom_")) return;
      const label = field.label || field.key.replace(/^custom_/, "");
      const normalized = normalizeCustomFieldKey(label);
      if (!fieldMap.has(normalized)) {
        fieldMap.set(normalized, label);
      }
    });

    data.forEach((contact) => {
      let customFieldsValue = contact?.customFields;
      if (typeof customFieldsValue === "string") {
        try {
          customFieldsValue = JSON.parse(customFieldsValue);
        } catch {
          customFieldsValue = undefined;
        }
      }

      if (customFieldsValue && typeof customFieldsValue === "object") {
        Object.keys(customFieldsValue).forEach((key) => {
          const normalized = normalizeCustomFieldKey(key);
          if (!fieldMap.has(normalized)) {
            fieldMap.set(normalized, key);
          }
        });
      }

      Object.keys(contact || {}).forEach((key) => {
        if (!key.startsWith("custom_")) return;
        const rawKey = key.replace(/^custom_/, "");
        const normalized = normalizeCustomFieldKey(rawKey);
        if (!fieldMap.has(normalized)) {
          fieldMap.set(normalized, rawKey);
        }
      });
    });

    return Array.from(fieldMap.entries()).map(([normalized, label]) => ({
      key: `custom_${normalized}`,
      header: label,
      getValue: (contact: any) => getCustomFieldValue(contact, label),
    }));
  };

  const downloadCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      onShowMessage?.("No contacts to download.", "error");
      return;
    }

    const baseColumns: CsvColumn[] = [
      { key: "full_name", header: "Full Name" },
      { key: "first_name", header: "First Name" },
      { key: "last_name", header: "Last Name" },
      { key: "email", header: "Email" },
      { key: "job_title", header: "Job title" },
      { key: "company_name", header: "Company name" },
      { key: "companyTelephone", header: "Company telephone" },
      { key: "website", header: "Website" },
      { key: "country_or_address", header: "Country Or Address" },
      { key: "companyIndustry", header: "Company industry" },
      { key: "linkedin_url", header: "LinkedIn URL" },
      { key: "companyEmployeeCount", header: "Company Employee Count" },
      { key: "companyLinkedInURL", header: "Company LinkedIn URL" },
      { key: "hasLinkedInInfo", header: "LinkedIn Information" },
      { key: "hasNotes", header: "Notes" },
      { key: "hasOpened", header: "Opened" },
      { key: "hasClicked", header: "Clicked" },
      { key: "unsubscribe", header: "Unsubscribe" },
      { key: "created_at", header: "Created date" },
      { key: "updated_at", header: "Updated date" },
      { key: "email_sent_at", header: "Email Sent Date" },
    ];

    const customColumns = getCustomFieldColumns(data);
    const columnsToExport = [...baseColumns, ...customColumns];
    const headers = columnsToExport.map((col) => col.header);

    const csvRows = [
      headers.join(","),
      ...data.map((contact) => {
        const row = columnsToExport.map((column) => {
          let value = column.getValue ? column.getValue(contact) : contact[column.key];
          if (value === null || value === undefined) value = "";

          if (
            column.key === "hasLinkedInInfo" ||
            column.key === "hasNotes" ||
            column.key === "hasOpened" ||
            column.key === "hasClicked"
          ) {
            value = value === true ? "Yes" : value === false ? "No" : "";
          }

          if (
            (column.key === "created_at" ||
              column.key === "updated_at" ||
              column.key === "email_sent_at") &&
            value
          ) {
            value = formatDate(value);
          }

          const stringValue = String(value);
          if (
            stringValue.includes(",") ||
            stringValue.includes('"') ||
            stringValue.includes("\n") ||
            stringValue.includes("\r")
          ) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }

          return stringValue;
        });

        return row.join(",");
      }),
    ];

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
      const data: any[] = await response.json();
      const metaMap = loadViewMetaMap(clientId);
      const merged = data.map((view) => {
        const meta = metaMap[String(view.id)];
        const serverUseAll =
          view.useAllDataFiles ?? view.use_all_datafiles ?? meta?.useAllDataFiles;
        const serverExcluded =
          view.excludedDataFileIds ??
          view.excluded_datafile_ids ??
          meta?.excludedDataFileIds;

        return {
          ...view,
          ...meta,
          useAllDataFiles: serverUseAll,
          excludedDataFileIds: serverExcluded,
        };
      });
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

  useEffect(() => {
    if (!clientId || !isActive) return;
    fetchViews();
  }, [clientId, isActive, refreshToken]);

  useEffect(() => {
    if (!clientId) return;

    if (viewMode === "detail" && selectedView?.id) {
      saveViewState(clientId, {
        viewId: selectedView.id,
        viewMode: "detail",
      });
    }
  }, [clientId, viewMode, selectedView?.id]);

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
    setBaseViewContacts([]);
    setViewContacts([]);
    setViewMetaMissing(false);
    setViewContactCounts({});
    setDownloadingViewId(null);
    clearViewState(clientId);
  }, [clientId]);

  useEffect(() => {
    if (!clientId || isLoadingViews || views.length === 0) {
      return;
    }

    if (viewMode === "detail" && selectedView?.id) {
      const latestSelectedView = views.find((view) => view.id === selectedView.id);

      if (!latestSelectedView) {
        setViewMode("list");
        setSelectedView(null);
        setViewContacts([]);
        setViewMetaMissing(false);
        clearViewState(clientId);
        return;
      }

      if (latestSelectedView !== selectedView) {
        setSelectedView(latestSelectedView);
      }

      return;
    }

    const persistedState = loadViewState(clientId);
    if (!persistedState?.viewId) {
      return;
    }

    const persistedView = views.find((view) => view.id === persistedState.viewId);
    if (!persistedView) {
      clearViewState(clientId);
      return;
    }

    setSelectedView(persistedView);
    setViewMode("detail");
  }, [clientId, isLoadingViews, selectedView, viewMode, views]);

  const handleViewSort = (key: string) => {
    if (viewSortKey === key) {
      setViewSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setViewSortKey(key);
      setViewSortDirection("asc");
    }
    setCurrentPageViews(1);
  };

  const renderViewSortArrow = (columnKey: string) => {
    if (columnKey === viewSortKey) {
      return viewSortDirection === "asc" ? " ▲" : " ▼";
    }
    return "";
  };

  const filteredViews = useMemo(() => {
    const searchLower = viewSearch.toLowerCase();
    let filtered = views.filter((view) => {
      return (
        view.name?.toLowerCase().includes(searchLower) ||
        view.description?.toLowerCase().includes(searchLower) ||
        String(view.id).includes(searchLower)
      );
    });
    if (viewSortKey) {
      filtered = [...filtered].sort((a: any, b: any) => {
        const aVal = (a as any)[viewSortKey] ?? "";
        const bVal = (b as any)[viewSortKey] ?? "";

        const dateA = new Date(aVal);
        const dateB = new Date(bVal);
        if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
          return viewSortDirection === "asc"
            ? dateA.getTime() - dateB.getTime()
            : dateB.getTime() - dateA.getTime();
        }

        const numA = Number(aVal);
        const numB = Number(bVal);
        if (!isNaN(numA) && !isNaN(numB)) {
          return viewSortDirection === "asc" ? numA - numB : numB - numA;
        }

        return viewSortDirection === "asc"
          ? String(aVal).toLowerCase().localeCompare(String(bVal).toLowerCase())
          : String(bVal).toLowerCase().localeCompare(String(aVal).toLowerCase());
      });
    }
    return filtered;
  }, [views, viewSearch, viewSortKey, viewSortDirection]);

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
    condition: FilterCondition,
    campaignIndexes: Awaited<ReturnType<typeof buildTrackingIndexesForGroups>>
  ) => {
    if (conditionRequiresCampaign(condition)) {
      return evaluateTrackingCondition(row, condition, campaignIndexes);
    }

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
      case "isEmpty":
        return (
          value === null ||
          value === undefined ||
          String(value).trim() === ""
        );
      case "isNotEmpty":
        return !(
          value === null ||
          value === undefined ||
          String(value).trim() === ""
        );
      default:
        return true;
    }
  };

  const applySavedFilters = async (rows: any[], filtersJson?: string) => {
    const parsed = parseFiltersJson(filtersJson);
    const groups: FilterGroup[] = (parsed.groups || [])
      .map((group, groupIndex) => ({
        id: group.id || `group-${groupIndex}`,
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

    const campaignIndexes = await buildTrackingIndexesForGroups(clientId, groups);

    return rows.filter((row) =>
      groups.reduce((groupResult, group, groupIndex) => {
        const conditionsResult = group.conditions.reduce(
          (result, condition, index) => {
            const evaluation = evaluateCondition(row, condition, campaignIndexes);
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

  const decorateContactsWithTrackingState = async (
    rows: any[],
    filtersJson?: string
  ) => {
    const parsed = parseFiltersJson(filtersJson);
    const groups: FilterGroup[] = (parsed.groups || [])
      .map((group, groupIndex) => ({
        id: group.id || `group-${groupIndex}`,
        joinWithPrevious:
          groupIndex === 0 ? undefined : group.joinWithPrevious || "AND",
        conditions: (group.conditions || []).filter((condition) =>
          isCompleteCondition(condition)
        ),
      }))
      .filter((group) => group.conditions.length > 0);

    const trackingCampaignIds = getTrackingCampaignIds(groups);

    if (trackingCampaignIds.length === 0) {
      return rows.map((row) => ({
        ...row,
        hasOpened: false,
        hasClicked: false,
      }));
    }

    const campaignIndexes = await buildTrackingIndexesForGroups(clientId, groups);

    return rows.map((row) => ({
      ...row,
      hasOpened: trackingCampaignIds.some((campaignId) =>
        evaluateTrackingCondition(
          row,
          {
            id: `tracking-open-${campaignId}`,
            field: TRACKING_OPEN_FIELD,
            operator: "equals",
            value: "true",
            context: { campaignId },
          },
          campaignIndexes
        )
      ),
      hasClicked: trackingCampaignIds.some((campaignId) =>
        evaluateTrackingCondition(
          row,
          {
            id: `tracking-click-${campaignId}`,
            field: TRACKING_CLICK_FIELD,
            operator: "equals",
            value: "true",
            context: { campaignId },
          },
          campaignIndexes
        )
      ),
    }));
  };

  const fetchViewContactsData = async (
    view: ViewItem
  ): Promise<{ contacts: any[]; metaMissing: boolean; contactCount: number }> => {
    const allDataFileIds = availableDataFiles.map((file) => file.id);
    const excludedDataFileIds = view.excludedDataFileIds || [];
    const effectiveAllDataFileIds = allDataFileIds.filter(
      (id) => !excludedDataFileIds.includes(id)
    );
    const dataFileIds =
      view.useAllDataFiles && effectiveAllDataFileIds.length > 0
        ? effectiveAllDataFileIds
        : view.dataFileIds || [];
    const segmentIds = view.segmentIds || [];
    const hasLocalFilters = !!view.filtersJson;
    const hasLocalSources = dataFileIds.length > 0 || segmentIds.length > 0;

    if (!hasLocalFilters || !hasLocalSources) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/Crm/view-contacts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: Number(clientId),
            viewId: Number(view.id),
            page: 1,
            pageSize: 0,
            search: "",
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch view contacts from server");
        }

        const data = await response.json();
        const contacts = await decorateContactsWithTrackingState(
          data.contacts || [],
          view.filtersJson
        );
        return {
          contacts,
          metaMissing: false,
          contactCount: data.contactCount ?? data.total ?? contacts.length,
        };
      } catch (error) {
        console.warn("Server fallback for view contacts failed:", error);
        return { contacts: [], metaMissing: true, contactCount: 0 };
      }
    }

    if (dataFileIds.length === 0 && segmentIds.length === 0) {
      return { contacts: [], metaMissing: true, contactCount: 0 };
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
        `${API_BASE_URL}/api/Crm/contacts/List-by-ClientId?clientId=${clientId}&dataFileId=${dataFileId}`
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
    const filtered = await applySavedFilters(mergedList, view.filtersJson);
    const decorated = await decorateContactsWithTrackingState(
      filtered,
      view.filtersJson
    );

    return {
      contacts: decorated,
      metaMissing: false,
      contactCount: decorated.length,
    };
  };

  const updateViewCountCache = (viewId: number, count: number) => {
    setViewContactCounts((prev) => ({ ...prev, [viewId]: count }));
    setViews((prev) =>
      prev.map((item) =>
        item.id === viewId ? { ...item, contactCount: count } : item
      )
    );
  };

  const fetchContactsForView = async (view: ViewItem) => {
    setIsLoadingViewContacts(true);
    setViewMetaMissing(false);
    try {
      const { contacts, metaMissing, contactCount } = await fetchViewContactsData(view);
      setBaseViewContacts(contacts);
      setViewContacts(contacts);
      setViewMetaMissing(metaMissing);
      if (!metaMissing) {
        updateViewCountCache(view.id, contactCount);
      }
    } catch (error) {
      console.error("Error fetching view contacts:", error);
      setBaseViewContacts([]);
      setViewContacts([]);
      setViewMetaMissing(false);
      onShowMessage?.("Failed to load view contacts.", "error");
    } finally {
      setIsLoadingViewContacts(false);
    }
  };

  const handleDownloadView = async (view: ViewItem) => {
    setDownloadingViewId(view.id);
    try {
      const { contacts, metaMissing, contactCount } = await fetchViewContactsData(view);

      if (metaMissing) {
        onShowMessage?.(
          "This view is missing saved filter metadata in this browser, so it cannot be downloaded yet.",
          "error"
        );
        return;
      }

      if (!contacts.length) {
        onShowMessage?.("No contacts to download.", "error");
        updateViewCountCache(view.id, 0);
        return;
      }

      updateViewCountCache(view.id, contactCount);
      const filename = `${view.name.replace(/[^a-z0-9]/gi, "_")}_${
        new Date().toISOString().split("T")[0]
      }`;
      downloadCSV(contacts, filename);
    } catch (error) {
      console.error("Error downloading view:", error);
      onShowMessage?.("Failed to download view data.", "error");
    } finally {
      setDownloadingViewId(null);
      setViewActionsAnchor(null);
    }
  };

  useEffect(() => {
    if (viewMode === "detail" && selectedView) {
      fetchContactsForView(selectedView);
    }
  }, [
    viewMode,
    selectedView?.id,
    selectedView?.filtersJson,
    selectedView?.useAllDataFiles,
    selectedView?.dataFileIds?.length,
    selectedView?.segmentIds?.length,
    selectedView?.excludedDataFileIds?.length,
    availableDataFiles.length,
  ]);

  const handleDeleteView = async (view: ViewItem) => {
    appModal.showConfirm(
      `Are you sure you want to delete view "${view.name}"?`,
      async () => {
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
          triggerRefresh();
          if (selectedView?.id === view.id) {
            setSelectedView(null);
            setViewMode("list");
            setBaseViewContacts([]);
            setViewContacts([]);
            setViewMetaMissing(false);
            clearViewState(clientId);
          }
          onShowMessage?.("View deleted successfully.", "success");
        } catch (error) {
          console.error("Error deleting view:", error);
          onShowMessage?.("Failed to delete view.", "error");
        }
      },
      "Delete view",
      "Delete",
      "Cancel"
    );
  };

  const openView = (view: ViewItem) => {
    setViewActionsAnchor(null);
    if (view.useAllDataFiles) {
      fetchSources();
    }
    setSelectedView(view);
    setViewMode("detail");
    setSelectedContacts(new Set());
    setViewSearchQuery("");
    setViewCurrentPage(1);
  };

  const openEditPanel = (view: ViewItem) => {
    setEditingView(view);
    setEditName(view.name || "");
    setEditDescription(view.description || "");
    if (view.useAllDataFiles) {
      if (availableDataFiles.length === 0) {
        fetchSources();
      }
      const excludedIds = view.excludedDataFileIds || [];
      const allIds = availableDataFiles.map((file) => file.id);
      setEditExcludedDataFileIds(excludedIds);
      setEditDataFileIds(allIds.filter((id) => !excludedIds.includes(id)));
    } else {
      setEditExcludedDataFileIds([]);
      setEditDataFileIds(view.dataFileIds || []);
    }
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
      const useAllDataFiles = !!editingView.useAllDataFiles;
      const excludedDataFileIds = useAllDataFiles ? editExcludedDataFileIds : [];
      const response = await fetch(`${API_BASE_URL}/api/Crm/update-view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          viewId: editingView.id,
          name: editName.trim(),
          description: editDescription.trim(),
          filtersJson: editFiltersJson,
          dataFileIds: useAllDataFiles ? [] : editDataFileIds,
          segmentIds: editSegmentIds,
          useAllDataFiles,
          excludedDataFileIds,
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
        dataFileIds: useAllDataFiles ? [] : editDataFileIds,
        segmentIds: editSegmentIds,
        useAllDataFiles,
        excludedDataFileIds,
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
        dataFileIds: useAllDataFiles ? [] : editDataFileIds,
        segmentIds: editSegmentIds,
        useAllDataFiles,
        excludedDataFileIds,
      };
      saveViewMetaMap(clientId, metaMap);

      triggerRefresh();
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

  const selectedViewContactCount =
    selectedView?.id != null
      ? viewContactCounts[selectedView.id] ?? viewContacts.length
      : viewContacts.length;
  const refinedViewContactCount = viewContacts.length;
  const hasRefinedViewResults =
    baseViewContacts.length > 0 && refinedViewContactCount !== baseViewContacts.length;

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
  <>
    {/* ✅ BULK ACTION BAR */}
{selectedContacts.size > 0 && (
  <div
    style={{
      marginBottom: 16,
      padding: "12px 16px",
      background: "#f0f7ff",
      borderRadius: 6,
      display: "flex",
      alignItems: "center",
      gap: 16,
    }}
  >
    <span style={{ fontWeight: 500 }}>
      {selectedContacts.size} contact
      {selectedContacts.size > 1 ? "s" : ""} selected
    </span>

    <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
      {selectedContacts.size === 1 && (
        <button
          className="button secondary"
          onClick={handleCloneContacts}
          disabled={isCloningContact}
          style={{
            background: "none",
            color: "#3f9f42",
            border: "none",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "40px",
            height: "40px",
            padding: "0",
            cursor: isCloningContact ? "not-allowed" : "pointer",
            opacity: isCloningContact ? 0.6 : 1,
          }}
          title={isCloningContact ? "Cloning..." : "Clone contact"}
        >
          <img
            src={duplicateIcon}
            alt="Clone"
            style={{
              width: 22,
              height: 22,
              objectFit: "contain",
              filter:
                "invert(47%) sepia(82%) saturate(397%) hue-rotate(84deg) brightness(95%) contrast(90%)",
            }}
          />
        </button>
      )}

      <button
        className="button secondary"
        onClick={handleDeleteContacts}
        disabled={isDeletingContact}
        style={{
          background: "none",
          color: "#3f9f42",
          border: "none",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "40px",
          height: "40px",
          padding: "0",
          cursor: isDeletingContact ? "not-allowed" : "pointer",
          opacity: isDeletingContact ? 0.6 : 1,
        }}
        title={isDeletingContact ? "Deleting..." : "Delete contacts"}
      >
        <FontAwesomeIcon
          icon={faTrashAlt}
          style={{ fontSize: 20, color: "#3f9f42" }}
        />
      </button>

      <button
        className="button secondary"
        onClick={handleUnsubscribeContacts}
        disabled={isUnsubscribing}
        style={{
          background: "none",
          color: "#3f9f42",
          border: "none",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "40px",
          height: "40px",
          padding: "0",
          cursor: isUnsubscribing ? "not-allowed" : "pointer",
          opacity: isUnsubscribing ? 0.6 : 1,
        }}
        title={isUnsubscribing ? "Processing..." : "Unsubscribe"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="22" width="22">
          <path stroke="#3f9f42" strokeLinecap="round" strokeLinejoin="round" d="M11.25 17.25c0 1.5913 0.6321 3.1174 1.7574 4.2426 1.1252 1.1253 2.6513 1.7574 4.2426 1.7574 1.5913 0 3.1174 -0.6321 4.2426 -1.7574 1.1253 -1.1252 1.7574 -2.6513 1.7574 -4.2426 0 -1.5913 -0.6321 -3.1174 -1.7574 -4.2426 -1.1252 -1.1253 -2.6513 -1.7574 -4.2426 -1.7574 -1.5913 0 -3.1174 0.6321 -4.2426 1.7574 -1.1253 1.1252 -1.7574 2.6513 -1.7574 4.2426Z" strokeWidth="2"></path>
          <path stroke="#3f9f42" strokeLinecap="round" strokeLinejoin="round" d="M14.25 17.25h6" strokeWidth="2"></path>
          <path stroke="#3f9f42" strokeLinecap="round" strokeLinejoin="round" d="M8.25 15.75h-6c-0.39782 0 -0.77936 -0.158 -1.06066 -0.4393C0.908035 15.0294 0.75 14.6478 0.75 14.25v-12c0 -0.39782 0.158035 -0.77936 0.43934 -1.06066C1.47064 0.908035 1.85218 0.75 2.25 0.75h18c0.3978 0 0.7794 0.158035 1.0607 0.43934 0.2813 0.2813 0.4393 0.66284 0.4393 1.06066V9" strokeWidth="2"></path>
          <path stroke="#3f9f42" strokeLinecap="round" strokeLinejoin="round" d="m21.41 1.30005 -8.143 6.264c-0.5783 0.44486 -1.2874 0.68606 -2.017 0.68606 -0.7296 0 -1.43873 -0.2412 -2.01701 -0.68606l-8.144 -6.264" strokeWidth="2"></path>
        </svg>
      </button>

      <button
        className="button primary"
        onClick={() => setShowSaveSegmentModal(true)}
        style={{
          backgroundColor: "transparent",
          borderColor: "transparent",
          color: "#3f9f42",
          border: "none",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "40px",
          height: "40px",
          padding: "0",
          cursor: "pointer",
        }}
        title="Segment"
      >
        <svg
          width="30"
          height="30"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M50 50H85C85 69.33 69.33 85 50 85C30.67 85 15 69.33 15 50C15 30.67 30.67 15 50 15V50Z"
            stroke="#3f9f42"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M60 40V15C73.8071 15 85 26.1929 85 40H60Z"
            stroke="#3f9f42"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <button
        className="button secondary"
        onClick={() => setShowBulkUpdatePanel(true)}
        style={{
          background: "none",
          color: "#3f9f42",
          border: "none",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "40px",
          height: "40px",
          padding: "0",
          cursor: "pointer",
        }}
        title="Bulk Update"
      >
        <FontAwesomeIcon
          icon={faEdit}
          style={{ fontSize: 20, color: "#3f9f42" }}
        />
      </button>
    </div>
  </div>
)}

    {/* ✅ EXISTING HEADER (DON’T REMOVE) */}
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
        {hasRefinedViewResults
          ? `Showing ${refinedViewContactCount} of ${selectedViewContactCount} contacts in this view`
          : `${selectedViewContactCount} contact${selectedViewContactCount === 1 ? "" : "s"} in this view`}
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
          onClick={() => selectedView && handleDownloadView(selectedView)}
        >
          Download
        </button>

        <button
          type="button"
          className="button secondary"
          onClick={() => selectedView && openEditPanel(selectedView)}
        >
          Edit view
        </button>
      </div>
    </div>
  </>
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
                  <th
                    onClick={() => handleViewSort("name")}
                    style={{ cursor: "pointer" }}
                  >
                    Views{renderViewSortArrow("name")}
                  </th>
                  <th
                    onClick={() => handleViewSort("id")}
                    style={{ cursor: "pointer" }}
                  >
                    ID{renderViewSortArrow("id")}
                  </th>
                  <th
                    onClick={() => handleViewSort("created_at")}
                    style={{ cursor: "pointer" }}
                  >
                    Created date{renderViewSortArrow("created_at")}
                  </th>
                  <th
                    onClick={() => handleViewSort("description")}
                    style={{ cursor: "pointer" }}
                  >
                    Description{renderViewSortArrow("description")}
                  </th>
                  <th>Contacts</th>
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
                      <td>{view.contactCount ?? viewContactCounts[view.id] ?? "-"}</td>
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
                                onClick={() => handleDownloadView(view)}
                                style={menuBtnStyle}
                                className="flex gap-2 items-center"
                                disabled={downloadingViewId === view.id}
                              >
                                <span className="ml-[2px]">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="22px"
                                    height="22px"
                                    viewBox="0 0 24 24"
                                  >
                                    <title />
                                    <g id="Complete">
                                      <g id="download">
                                        <g>
                                          <path
                                            d="M3,12.3v7a2,2,0,0,0,2,2H19a2,2,0,0,0,2-2v-7"
                                            fill="none"
                                            stroke="#3f9f42"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                          />
                                          <g>
                                            <polyline
                                              data-name="Right"
                                              fill="none"
                                              id="Right-2"
                                              points="7.9 12.3 12 16.3 16.1 12.3"
                                              stroke="#3f9f42"
                                              stroke-linecap="round"
                                              stroke-linejoin="round"
                                              stroke-width="2"
                                            />
                                            <line
                                              fill="none"
                                              stroke="#3f9f42"
                                              stroke-linecap="round"
                                              stroke-linejoin="round"
                                              stroke-width="2"
                                              x1="12"
                                              x2="12"
                                              y1="2.7"
                                              y2="14.2"
                                            />
                                          </g>
                                        </g>
                                      </g>
                                    </g>
                                  </svg>
                                </span>
                                <span className="font-[600]">
                                  {downloadingViewId === view.id
                                    ? "Downloading..."
                                    : "Download"}
                                </span>
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
            {!viewMetaMissing && selectedView && (
              <div style={{ marginBottom: 20 }}>
                <FilterBuilder
                  key={`${selectedView.id}-${selectedView.filtersJson || ""}`}
                  data={baseViewContacts}
                  fields={normalizedFilterFields}
                  clientId={clientId}
                  initialFiltersJson={selectedView.filtersJson}
                  onFiltered={(filteredData) => {
                    setViewContacts(filteredData);
                    setViewCurrentPage(1);
                    setSelectedContacts(new Set());
                  }}
                  saveViewConfig={{
                    clientId,
                    dataFileIds: selectedView.useAllDataFiles
                      ? []
                      : selectedView.dataFileIds || [],
                    segmentIds: selectedView.segmentIds || [],
                    useAllDataFiles: !!selectedView.useAllDataFiles,
                    excludedDataFileIds: selectedView.excludedDataFileIds || [],
                    onSuccess: (savedView) => {
                      fetchViews();
                      triggerRefresh();
                      onShowMessage?.(
                        `New view "${savedView?.name || "Untitled view"}" created successfully.`,
                        "success"
                      );
                    },
                    onError: (message) => {
                      onShowMessage?.(message, "error");
                    },
                  }}
                />
              </div>
            )}

            <DynamicContactsTable
              data={viewContacts}
              isLoading={isLoadingViewContacts}
              search={viewSearchQuery}
              setSearch={setViewSearchQuery}
              showCheckboxes={true}
              paginated={true}
              currentPage={viewCurrentPage}
              pageSize={viewPageSize}
              onPageChange={setViewCurrentPage}
              totalItems={viewContacts.length}
              autoGenerateColumns={true}
              selectedItems={selectedContacts}
              onSelectItem={handleSelectContact}
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
                first_name: (value: any, row: any) => {
                  const { firstName, fullName } = getContactNameParts(row);
                  return firstName || fullName || "-";
                },
                last_name: (value: any, row: any) => {
                  const { lastName, fullName } = getContactNameParts(row);
                  return lastName || fullName || "-";
                },
                full_name: (value: any, row: any) => {
                  const displayName = getDisplayName(row);
                  if (!displayName || displayName === "-") return "-";

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
                  params.set("tab", "DataCampaigns");
                  params.set("subtab", "View");
                  params.set("clientId", String(clientId));
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
                      {displayName}
                    </span>
                  );
                },
                created_at: (value: any) => formatDate(value),
                updated_at: (value: any) => formatDate(value),
                email_sent_at: (value: any) => formatDate(value),
                hasOpened: (value: any) => (value ? "Yes" : "No"),
                hasClicked: (value: any) => (value ? "Yes" : "No"),
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
                "first_name",
                "last_name",
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
                setBaseViewContacts([]);
                setViewContacts([]);
                setViewMetaMissing(false);
                setSelectedContacts(new Set());
                clearViewState(clientId);
              }}
              columnNameMap={viewColumnNameMap}
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
          setEditExcludedDataFileIds([]);
        }}
        title="Edit view"
        footerContent={
          <>
            <button
              onClick={() => {
                setIsEditPanelOpen(false);
                setEditingView(null);
                setEditFiltersSeed("");
                setEditExcludedDataFileIds([]);
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
                    checked={
                      editingView?.useAllDataFiles
                        ? !editExcludedDataFileIds.includes(file.id)
                        : editDataFileIds.includes(file.id)
                    }
                    onChange={() => {
                      if (editingView?.useAllDataFiles) {
                        const isExcluded = editExcludedDataFileIds.includes(file.id);
                        setEditExcludedDataFileIds((prev) =>
                          isExcluded
                            ? prev.filter((entry) => entry !== file.id)
                            : [...prev, file.id]
                        );
                        setEditDataFileIds((prev) =>
                          isExcluded
                            ? [...prev, file.id]
                            : prev.filter((entry) => entry !== file.id)
                        );
                      } else {
                        toggleId(editDataFileIds, file.id, setEditDataFileIds);
                      }
                    }}
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
            clientId={clientId}
            initialFiltersJson={editFiltersSeed}
            onFiltersJsonChange={(nextFiltersJson) =>
              setEditFiltersJson(nextFiltersJson)
            }
            hideApplyButton={true}
            
          />
        </div>
      </CommonSidePanel>
<BulkUpdatePanel
  isOpen={showBulkUpdatePanel}
  onClose={() => setShowBulkUpdatePanel(false)}
  selectedContactIds={Array.from(selectedContacts)}
  clientId={String(clientId)}
  onUpdateComplete={() => {
    setSelectedContacts(new Set());
    if (selectedView) {
      fetchContactsForView(selectedView);
    }
  }}
/>

<SegmentModal
  isOpen={showSaveSegmentModal}
  onClose={() => setShowSaveSegmentModal(false)}

  getContactIds={() =>
    Array.from(selectedContacts).map(id => Number(id))
  }

  selectedContactsCount={selectedContacts.size}

effectiveUserId={String(clientId)}

  onSuccess={(message) => {
    appModal.showSuccess(message);
    setSelectedContacts(new Set());
    setShowSaveSegmentModal(false);
  }}

  onError={(message: string) => {
    console.error("Segment save error:", message);
    appModal.showError(message);
  }}

  onContactsCleared={() => {
    setSelectedContacts(new Set());
  }}
/>

<AppModal
  isOpen={appModal.isOpen}
  onClose={appModal.hideModal}
  {...appModal.config}
/>
      
    </div>

    
  );
  
};

export default ContactViews;
