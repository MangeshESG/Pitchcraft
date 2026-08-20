import { useRef, useCallback, useState, useEffect, useMemo } from "react";
import React from "react";
import PaginationControls from "./PaginationControls";
import CommonSidePanel from "../common/CommonSidePanel";
import { lessPriorityButtonStyle } from "../../styles/buttonStyles";
import type { ColumnPreference } from "../../api/columnPreferences";
import "./DynamicContactsTable.css";

// ---------- Types ----------
interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  width?: string;
  type?: "string" | "number" | "date" | "boolean" | "url" | "email" | "custom";
  formatter?: (value: any, item: any) => React.ReactNode | string;
  searchable?: boolean;
  sortable?: boolean;
}

type PageSize = number | "All";

export interface BulkAction {
  key: string;
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  onClick: (selectedIds: string[]) => void;
}

interface DynamicContactsTableProps {
  data: any[];
  isLoading: boolean;
  search: string;
  setSearch: (s: string) => void;
  showCheckboxes?: boolean;
  paginated?: boolean;
  currentPage?: number;
  pageSize?: number | "All";
  serverSidePagination?: boolean;
  onPageChange: (pg: number) => void;
  selectedItems?: Set<string>;
  onSelectItem?: (id: string) => void;
  totalItems?: number;

  autoGenerateColumns?: boolean;
  customColumns?: ColumnConfig[];
  excludeFields?: string[];
  includeFields?: string[];
  customFormatters?: { [key: string]: (value: any, item: any) => React.ReactNode | string };
  searchFields?: string[];
  primaryKey?: string;

  viewMode?: "table" | "detail";
  detailTitle?: string;
  detailDescription?: string;
  onBack?: () => void;
  backLabel?: string;
  onAddItem?: () => void;
  hideSearch?: boolean;
  customHeader?: React.ReactNode;
  /** Fires with the full column list in display order — position is the sequence. */
  onColumnsChange?: (columns: ColumnConfig[]) => void;
  columnNameMap?: Record<string, string>;

  /**
   * Client-level saved layout (visibility + order). Columns it doesn't mention
   * keep their default visibility and are appended after the saved ones.
   */
  persistedColumnLayout?: ColumnPreference[];
  /** Clears the saved layout. When omitted, "Reset to default" only resets locally. */
  onResetColumns?: () => void;
  /**
   * Columns shown when the client has no saved layout, and what "Reset to
   * default" restores. Anything outside the list starts hidden. Falls back to a
   * name/email/company heuristic when not supplied.
   */
  defaultVisibleColumns?: string[];
  onPageSizeChange?: (size: number) => void;

  currentTab?: string;

  /** Optional floating bulk-action bar buttons */
  bulkActions?: BulkAction[];
  /** Called when the bulk bar "Clear" button is pressed */
  onClearSelection?: () => void;

  /**
   * When provided, the table can open a row's profile. An extra icon column is
   * shown only when the "full_name" column is hidden, so there is always a way
   * to reach the contact profile even if the name column isn't visible.
   */
  onOpenProfile?: (row: any) => void;
  /** Optional fixed first data column, rendered immediately after checkboxes. */
  leadingColumn?: {
    header: string;
    width?: string;
    render: (row: any) => React.ReactNode;
  };
}

type SortDirection = "asc" | "desc";
interface SortConfig { key: string | null; direction: SortDirection; }

// ---------- Helpers ----------
const flattenObject = (obj: any) => {
  const flattened: any = { ...obj };
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.entries(value).forEach(([nestedKey, nestedValue]) => {
        flattened[nestedKey] =
          nestedValue && typeof nestedValue === "object" && !Array.isArray(nestedValue)
            ? JSON.stringify(nestedValue)
            : nestedValue;
      });
      delete flattened[key];
    }
  });
  return flattened;
};

const getSafeRenderableValue = (value: any): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") {
    if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "—";
    const keys = Object.keys(value);
    return keys.length > 0 ? JSON.stringify(value) : "—";
  }
  return String(value);
};

// Avatar initials & palette
const AVATAR_PALETTE: [string, string][] = [
  ["#e8f3e9", "#2d7a30"], ["#e6efff", "#1d4ed8"], ["#fff3da", "#b45309"],
  ["#fce7f3", "#be185d"], ["#f3e8ff", "#6d28d9"], ["#fee2e2", "#b91c1c"],
  ["#ecfeff", "#0e7490"], ["#f0fdf4", "#15803d"],
];
const initialsFor = (row: any): string => {
  const f = (row.first_name || row.firstName || "").trim();
  const l = (row.last_name  || row.lastName  || "").trim();
  if (f || l) return ((f[0] || "") + (l[0] || "")).toUpperCase() || "?";
  const full = (row.full_name || row.fullName || row.email || "").trim();
  return full.slice(0, 2).toUpperCase() || "?";
};
const paletteFor = (id: any): [string, string] => {
  const n = Number(id) || 0;
  return AVATAR_PALETTE[Math.abs(n) % AVATAR_PALETTE.length];
};

// ---------- Component ----------
const DynamicContactsTable: React.FC<DynamicContactsTableProps> = ({
  data,
  isLoading,
  search,
  setSearch,
  showCheckboxes = false,
  paginated = false,
  currentPage = 1,
  pageSize: pageSizeProp = 10,
  serverSidePagination = false,
  onPageChange,
  onPageSizeChange,
  selectedItems,
  onSelectItem,
  totalItems,
  autoGenerateColumns = true,
  customColumns,
  excludeFields = [],
  includeFields = [],
  customFormatters = {},
  searchFields = [],
  primaryKey = "id",
  viewMode = "table",
  detailTitle,
  detailDescription,
  onBack,
  backLabel = "Back",
  onAddItem,
  hideSearch = false,
  customHeader,
  onColumnsChange,
  columnNameMap,
  persistedColumnLayout = [],
  onResetColumns,
  defaultVisibleColumns,
  currentTab,
  bulkActions,
  onClearSelection,
  onOpenProfile,
  leadingColumn,
}) => {
  const [columns, setColumns]           = useState<ColumnConfig[]>([]);
  const [showColumnPanel, setShowColumnPanel] = useState(false);
  const [pageSize, setPageSize]         = useState<PageSize>(pageSizeProp);
  const [sortConfig, setSortConfig]     = useState<SortConfig>({ key: null, direction: "asc" });
  const isInitializedRef                = useRef(false);
  /** Column order before any saved layout is applied — restored by "Reset to default". */
  const naturalOrderRef                 = useRef<string[]>([]);

  // Column reordering (drag & drop in the Columns panel)
  const [dragKey, setDragKey]           = useState<string | null>(null);
  const [dragOverKey, setDragOverKey]   = useState<string | null>(null);

  // ---------- Column generation ----------
  const generateColumnsFromData = useCallback((dataArray: any[]): ColumnConfig[] => {
    if (!dataArray || dataArray.length === 0) return [];

    const sampleItem = dataArray[0];
    const generated: ColumnConfig[] = [];

    if (showCheckboxes) {
      generated.push({ key: "checkbox", label: "", visible: true, width: "44px", type: "custom", searchable: false, sortable: false });
    }

    const allKeys = new Set<string>();
    dataArray.slice(0, 10).forEach((item) => Object.keys(item).forEach((k) => allKeys.add(k)));

    Array.from(allKeys).forEach((key) => {
      if (excludeFields.includes(key)) return;
      if (includeFields.length > 0 && !includeFields.includes(key)) return;

      const sample = sampleItem[key];
      const type   = detectColumnType(key, sample);
      generated.push({
        key,
        label: generateLabel(key),
        visible: getDefaultVisibility(key, type),
        type,
        searchable: ["string", "email", "url"].includes(type || "string"),
        sortable: true,
        formatter: customFormatters[key] || getDefaultFormatter(type),
      });
    });

    const alwaysInclude = new Set(["first_name", "last_name", "full_name"]);
    return generated.filter((col) => {
      if (col.key === "checkbox") return true;
      if (alwaysInclude.has(col.key)) return true;
      return dataArray.some((item) => {
        const v = item[col.key];
        return v !== null && v !== undefined && v !== "" && v !== "—";
      });
    });
  }, [showCheckboxes, excludeFields, includeFields, customFormatters]); // eslint-disable-line

  const detectColumnType = (key: string, value: any): ColumnConfig["type"] => {
    const k = key.toLowerCase();
    if (typeof value === "boolean" || k === "haslinkedininfo" || k === "hasnotes" || k.includes("success") || k.includes("active") || k.includes("enabled")) return "boolean";
    if (k.includes("url") || k.includes("website") || k.includes("linkedin")) return "url";
    if (k.includes("email")) return "email";
    if (k.includes("date") || k.includes("time") || k.includes("at") || k.includes("timestamp")) return "date";
    if (typeof value === "number" || k.includes("count") || k.includes("amount") || k.includes("id")) return "number";
    return "string";
  };

  const generateLabel = (key: string): string => {
    if (key === "hasLinkedInInfo") return "LinkedIn information";
    if (key === "hasNotes") return "Notes";
    if (key.toLowerCase().includes("linkedin") && key.toLowerCase().includes("url")) {
      return key.toLowerCase().includes("company") ? "Company LinkedIn URL" : "LinkedIn URL";
    }
    const raw = key.replace(/^custom_/, "").trim();

    // Custom attributes come from the DB already written as readable text
    // ("DNC reason", "DJ - data status") — show them exactly as stored.
    if (/\s/.test(raw)) return raw;

    return raw
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")     // camelCase  -> camel Case
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")  // DNCReason  -> DNC Reason
      .replace(/[_-]/g, " ")
      .replace(/\b[a-z]/g, (l) => l.toUpperCase())
      .trim();
  };

  // Pure default — the saved layout is applied separately by applyLayout(), so
  // that "Reset to default" really does fall back to defaults.
  const getDefaultVisibility = (key: string, _type: ColumnConfig["type"]): boolean => {
    if (defaultVisibleColumns && defaultVisibleColumns.length > 0)
      return defaultVisibleColumns.includes(key);

    const k = key.toLowerCase();
    if (["body", "html", "content", "description", "notes"].some((h) => k.includes(h))) return false;
    if (["name", "email", "company", "title", "type", "status", "date"].some((s) => k.includes(s))) return true;
    return true;
  };

  // ---------- Default cell formatters ----------
  const getDefaultFormatter = (type: ColumnConfig["type"]) => {
    switch (type) {
      case "date":
        return (value: any) => {
          if (!value) return <span className="dt-muted">—</span>;
          try {
            const d = new Date(value);
            if (isNaN(d.getTime())) return <span>{value}</span>;
            return (
              <span className="dt-num">
                {d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                {" "}
                {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            );
          } catch { return <span>{value}</span>; }
        };

      case "boolean":
        return (value: any) => {
          let truthy: boolean | null = null;
          if (value === true)  truthy = true;
          else if (value === false) truthy = false;
          else if (typeof value === "string") {
            if (/success|true|yes/i.test(value))  truthy = true;
            else if (/fail|false|no/i.test(value)) truthy = false;
          }
          if (truthy === null) return <span className="dt-muted">—</span>;
          return truthy ? (
            <span className="dt-pill dt-pill-yes">
              <svg viewBox="0 0 24 24" className="dt-pill-icon">
                <path fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="m5 12 5 5 9-11"/>
              </svg>
              Yes
            </span>
          ) : (
            <span className="dt-pill dt-pill-no">
              <svg viewBox="0 0 24 24" className="dt-pill-icon">
                <path fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" d="m6 6 12 12M18 6 6 18"/>
              </svg>
              No
            </span>
          );
        };

      case "url":
        return (value: any) => {
          if (!value || value === "—" || value === "-") return <span className="dt-muted">—</span>;
          if (typeof value !== "string") return <span>{getSafeRenderableValue(value)}</span>;
          const url = value.startsWith("http") ? value : `https://${value}`;
          return (
            <a href={url} target="_blank" rel="noopener noreferrer" className="dt-link" onClick={(e) => e.stopPropagation()}>
              {value.length > 30 ? value.substring(0, 30) + "…" : value}
              <svg viewBox="0 0 24 24" className="dt-link-icon">
                <path fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" d="M7 17 17 7M9 7h8v8"/>
              </svg>
            </a>
          );
        };

      case "email":
        return (value: any) => {
          if (!value || value === "—" || value === "-") return <span className="dt-muted">—</span>;
          return (
            <a href={`mailto:${value}`} className="dt-link" onClick={(e) => e.stopPropagation()}>
              {value}
            </a>
          );
        };

      default:
        return (value: any) => {
          const v = getSafeRenderableValue(value);
          return v === "—" ? <span className="dt-muted">—</span> : <span>{v}</span>;
        };
    }
  };

  // ---------- Processed data ----------
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((item) => flattenObject(item));
  }, [data]);

  // ---------- Initialize columns ----------
  const rememberNaturalOrder = (cols: ColumnConfig[]) => {
    naturalOrderRef.current = cols.map((c) => c.key);
    return cols;
  };

  useEffect(() => {
    if (!isInitializedRef.current && data.length > 0) {
      if (customColumns) {
        setColumns(applyLayout(rememberNaturalOrder(customColumns), persistedColumnLayout));
      } else if (autoGenerateColumns) {
        setColumns(applyLayout(rememberNaturalOrder(generateColumnsFromData(processedData)), persistedColumnLayout));
      }
      isInitializedRef.current = true;
    } else if (customColumns && isInitializedRef.current) {
      setColumns(applyLayout(rememberNaturalOrder(customColumns), persistedColumnLayout));
    }
  }, [processedData.length, customColumns, autoGenerateColumns, persistedColumnLayout]); // eslint-disable-line

  useEffect(() => { if (data.length === 0) isInitializedRef.current = false; }, [data.length]);

  useEffect(() => {
    setPageSize(pageSizeProp);
  }, [pageSizeProp]);

  // The layout can land after the columns are built (it is fetched separately).
  useEffect(() => {
    if (persistedColumnLayout.length === 0) return;
    setColumns((prev) => (prev.length > 0 ? applyLayout(prev, persistedColumnLayout) : prev));
  }, [persistedColumnLayout]); // eslint-disable-line

  useEffect(() => { setShowColumnPanel(false); }, [currentTab]);

  // ---------- Search ----------
  const filteredData = useMemo(() => {
    if (serverSidePagination) return processedData;
    if (!search.trim()) return processedData;
    const q = search.toLowerCase();
    const fields = searchFields.length > 0
      ? searchFields
      : columns.filter((c) => c.searchable !== false).map((c) => c.key);
    return processedData.filter((item) =>
      fields.some((f) => {
        const v = item[f];
        return v != null && String(v).toLowerCase().includes(q);
      })
    );
  }, [processedData, search, searchFields, columns, serverSidePagination]);

  // ---------- Column reordering ----------
  /** Moves `fromKey` into the slot currently held by `toKey` and persists the new sequence. */
  const moveColumn = (fromKey: string, toKey: string) => {
    if (!fromKey || !toKey || fromKey === toKey) return;

    const list = [...columns];
    const from = list.findIndex((c) => c.key === fromKey);
    const to   = list.findIndex((c) => c.key === toKey);
    if (from < 0 || to < 0) return;

    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);

    setColumns(list);
    onColumnsChange?.(list);
  };

  const toggleColumn = (columnKey: string) => {
    const updated = columns.map((c) =>
      c.key === columnKey ? { ...c, visible: !c.visible } : c
    );

    setColumns(updated);
    onColumnsChange?.(updated);
  };

  // ---------- Sort ----------
  const handleSort = (columnKey: string) => {
    setSortConfig((prev) => ({
      key: columnKey,
      direction: prev.key === columnKey && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortedData = useMemo(() => {
    // Under server-side pagination we can only sort the rows currently loaded
    // (the active page), which is enough to keep header click-to-sort working.
    if (!sortConfig.key) return filteredData;
    const k = sortConfig.key;
    return [...filteredData].sort((a, b) => {
      const va = a?.[k], vb = b?.[k];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number")
        return sortConfig.direction === "asc" ? va - vb : vb - va;
      const da = Date.parse(va), db = Date.parse(vb);
      if (!isNaN(da) && !isNaN(db))
        return sortConfig.direction === "asc" ? da - db : db - da;
      const sa = String(va).toLowerCase(), sb = String(vb).toLowerCase();
      return sortConfig.direction === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
  }, [filteredData, sortConfig, serverSidePagination]);

  const totalRecords = serverSidePagination && typeof totalItems === "number"
    ? totalItems
    : filteredData.length;
  const totalPages = pageSize === "All" ? 1 : Math.max(1, Math.ceil(totalRecords / (pageSize as number)));
  const displayData = serverSidePagination || !paginated || pageSize === "All"
    ? sortedData
    : sortedData.slice((currentPage - 1) * (pageSize as number), currentPage * (pageSize as number));

  const visibleColumns = columns.filter((c) => c.visible);

  // Show a dedicated profile-link column only when the "Full name" column is
  // hidden — otherwise the name itself is the link to the profile.
  const fullNameVisible = columns.some((c) => c.key === "full_name" && c.visible);
  const showProfileCol = !!onOpenProfile && !fullNameVisible && !leadingColumn;
  const totalColSpan = visibleColumns.length + (showProfileCol ? 1 : 0) + (leadingColumn ? 1 : 0);

  const leadingHeaderCell = leadingColumn ? (
    <th key="__leading__" style={{ width: leadingColumn.width || "64px" }}>
      <span className="dt-th-label">{leadingColumn.header}</span>
    </th>
  ) : null;

  const renderLeadingBodyCell = (item: any) =>
    leadingColumn ? <td key="__leading__">{leadingColumn.render(item)}</td> : null;

  // Profile-link column cells. Rendered as the first data column (immediately
  // after the selection checkbox) so there is always a leading way to reach the
  // contact profile when the "Full name" column is hidden.
  const profileHeaderCell = showProfileCol ? (
    <th key="__profile__" style={{ width: "70px" }}>
      <span className="dt-th-label">Profile</span>
    </th>
  ) : null;

  const renderProfileBodyCell = (item: any) =>
    showProfileCol ? (
      <td key="__profile__">
        <button
          type="button"
          title="Open contact profile"
          onClick={(e) => { e.stopPropagation(); onOpenProfile!(item); }}
          style={{
            background: "none",
            border: "none",
            padding: 4,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="#3f9f42"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="8" r="3.2" />
            <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
          </svg>
        </button>
      </td>
    ) : null;

  // ---------- Cell rendering ----------
  const getFormattedValue = (item: any, column: ColumnConfig, index?: number): React.ReactNode => {
    if (column.key === "checkbox") {
      const id = item[primaryKey]?.toString();
      return (
        <input
          type="checkbox"
          className="dt-checkbox"
          checked={!!selectedItems?.has(id)}
          onChange={() => onSelectItem?.(id)}
          onClick={(e) => e.stopPropagation()}
        />
      );
    }

    if (column.key === "id" && typeof index === "number") {
      return pageSize === "All" ? index + 1 : (currentPage - 1) * (pageSize as number) + index + 1;
    }

    const rawValue = item[column.key];
    if (customFormatters[column.key]) return customFormatters[column.key](rawValue, item);
    if (column.formatter) return column.formatter(rawValue, item);
    const v = getSafeRenderableValue(rawValue);
    return v === "—" ? <span className="dt-muted">—</span> : v;
  };

  // Avatar name cell (used only when no customFormatter overrides the column)
  const renderNameCell = (item: any): React.ReactNode => {
    const [bg, fg] = paletteFor(item[primaryKey]);
    const ini  = initialsFor(item);
    const name = ((item.full_name || `${item.first_name || ""} ${item.last_name || ""}`).trim()) || item.email || "—";
    return (
      <div className="dt-name">
        <div className="dt-avatar" style={{ background: bg, color: fg }}>{ini}</div>
        <div className="dt-name__text">
          <div className="dt-name__primary">{name}</div>
          {item.job_title && (
            <div className="dt-name__secondary">{item.job_title}</div>
          )}
        </div>
      </div>
    );
  };

  // ---------- Select all ----------
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectItem) return;
    filteredData.forEach((item) => {
      const id = item[primaryKey]?.toString();
      if (!id) return;
      const has = selectedItems?.has(id);
      if (checked && !has) onSelectItem(id);
      else if (!checked && has) onSelectItem(id);
    });
  };

  const pageIds    = displayData.map((i) => i[primaryKey]?.toString()).filter(Boolean) as string[];
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedItems?.has(id));
  const someSelected = pageIds.some((id) => selectedItems?.has(id));

  // ---------- Floating bulk bar ----------
  const renderBulkBar = () => {
    if (!selectedItems || selectedItems.size === 0) return null;
    const ids     = Array.from(selectedItems);
    const actions = bulkActions || [];
    return (
      <div className="dt-bulkbar">
        <div className="dt-bulkbar__inner">
          <div className="dt-bulkbar__count">
            <span className="dt-bulkbar__num">{selectedItems.size}</span>
            <span>{selectedItems.size === 1 ? "selected" : "selected"}</span>
          </div>
          {actions.length > 0 && <div className="dt-bulkbar__sep" />}
          {actions.map((a) => (
            <button
              key={a.key}
              onClick={() => a.onClick(ids)}
              className={`dt-bulkbar__btn${a.danger ? " is-danger" : ""}`}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
          <div className="dt-bulkbar__sep" />
          <button
            onClick={() => {
              if (onClearSelection) {
                onClearSelection();
              } else {
                ids.forEach((id) => onSelectItem?.(id));
              }
            }}
            className="dt-bulkbar__clear"
          >
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="m6 6 12 12M18 6 6 18"/>
            </svg>
            Clear
          </button>
        </div>
      </div>
    );
  };

  // ---------- Render ----------
  return (
    <>
      {/* Detail view header */}
      {viewMode === "detail" && (
        <div className="dt-detail-header">
          {onBack && (
            <button
              onClick={onBack}
              style={{
                ...lessPriorityButtonStyle,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6"/>
              </svg>
              {backLabel}
            </button>
          )}
          <div className="dt-detail-header__info">
            <div className="dt-detail-header__top">
              {detailTitle && <h2 className="dt-detail-title">{detailTitle}</h2>}
              {typeof totalItems === "number" && (
                <span className="dt-count-pill">{totalItems.toLocaleString()} contacts</span>
              )}
            </div>
            {detailDescription && (
              <p className="dt-detail-desc">{detailDescription}</p>
            )}
          </div>
          <div className="dt-detail-actions">
            {onAddItem && (
              <button className="dt-btn-default" onClick={onAddItem}>
                <svg viewBox="0 0 24 24" width="14" height="14">
                  <path fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" d="M12 5v14M5 12h14"/>
                </svg>
                Add contact
              </button>
            )}
          </div>
        </div>
      )}

      {customHeader}

      {/* Toolbar */}
      {!hideSearch && (
        <div className="dt-toolbar">
          <div className="dt-toolbar__left">
            <div className="dt-search">
              <svg viewBox="0 0 24 24" className="dt-search__icon">
                <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.7"/>
                <path stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" d="m20 20-3.5-3.5"/>
              </svg>
              <input
                type="text"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="dt-result-count">
              <span className="dt-result-count__num">{totalRecords.toLocaleString()}</span>
              <span>{totalRecords === 1 ? "item" : "items"}</span>
              {search && !serverSidePagination && <span className="dt-muted">· filtered from {processedData.length.toLocaleString()}</span>}
            </div>
          </div>

          <div className="dt-toolbar__right">
            {/* Columns button */}
            <button className="dt-btn-tertiary" onClick={() => setShowColumnPanel(true)}>
              <svg viewBox="0 0 24 24" width="14" height="14">
                <rect x="3" y="4" width="6" height="16" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7"/>
                <rect x="11" y="4" width="6" height="16" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7"/>
                <rect x="19" y="4" width="2" height="16" rx="1" fill="currentColor"/>
              </svg>
              Columns
              <span className="dt-muted dt-num">
                {visibleColumns.filter((c) => c.key !== "checkbox").length}/{columns.filter((c) => c.key !== "checkbox").length}
              </span>
            </button>

            {/* Inline pagination */}
            <div className="dt-pagination-inline">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalRecords={totalRecords}
                setCurrentPage={onPageChange}
                setPageSize={(s: any) => {
                  if (serverSidePagination) {
                    setPageSize(pageSizeProp);
                    return;
                  }
                  setPageSize(s);
                  onPageSizeChange?.(s as number);
                }}
                showPageSizeDropdown={!serverSidePagination}
                pageLabel="Page:"
              />
            </div>
          </div>
        </div>
      )}

      {/* Table card */}
      <div className="dt-card">
        <div className="dt-scroll">
          <table className="dt-table">
            <thead>
              <tr>
                {leadingColumn && !showCheckboxes && leadingHeaderCell}
                {showProfileCol && !showCheckboxes && profileHeaderCell}
                {visibleColumns.map((column) => {
                  const isSorted = sortConfig.key === column.key;
                  const sortable = column.key !== "checkbox" && column.sortable !== false;
                  const headerCell = (
                    <th
                      key={column.key}
                      onClick={() => sortable && handleSort(column.key)}
                      style={{ width: column.width, cursor: sortable ? "pointer" : "default" }}
                      className={column.key === "checkbox" ? "dt-th-check" : ""}
                    >
                      {column.key === "checkbox" ? (
                        <input
                          type="checkbox"
                          className="dt-checkbox"
                          checked={allSelected}
                          ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                      ) : (
                        <span className="dt-th-label">
                          {columnNameMap?.[column.key] || column.label}
                          {sortable && (
                            <svg viewBox="0 0 24 24" className={`dt-sort-icon${isSorted ? " is-active" : ""}`}>
                              {isSorted && sortConfig.direction === "asc" ? (
                                <path fill="currentColor" d="M12 6l5 7H7z"/>
                              ) : isSorted ? (
                                <path fill="currentColor" d="M12 18l-5-7h10z"/>
                              ) : (
                                <path fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" d="M7 4v16m0 0-3-3m3 3 3-3M17 4v16m0-16 3 3m-3-3-3 3"/>
                              )}
                            </svg>
                          )}
                        </span>
                      )}
                    </th>
                  );
                  if (column.key === "checkbox" && (leadingColumn || showProfileCol)) {
                    return (
                      <React.Fragment key={column.key}>
                        {headerCell}
                        {leadingHeaderCell}
                        {profileHeaderCell}
                      </React.Fragment>
                    );
                  }
                  return headerCell;
                })}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={totalColSpan} className="dt-state-cell">
                    <div className="dt-loading">
                      <span className="dt-spinner" />
                      Loading…
                    </div>
                  </td>
                </tr>
              ) : displayData.length === 0 ? (
                <tr>
                  <td colSpan={totalColSpan} className="dt-state-cell">
                    <div className="dt-empty">
                      <div className="dt-empty__icon">
                        <svg viewBox="0 0 24 24" width="22" height="22">
                          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.7"/>
                          <path stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" d="m20 20-3.5-3.5"/>
                        </svg>
                      </div>
                      <div className="dt-empty__title">
                        {search ? "No items match your search" : "No items found"}
                      </div>
                      <div className="dt-empty__sub">
                        {search ? "Try a different search term." : "Add items to see them here."}
                      </div>
                      {search && (
                        <button className="dt-empty__clear" onClick={() => setSearch("")}>
                          Clear search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                displayData.map((item, index) => {
                  const id         = item[primaryKey]?.toString();
                  const isSelected = !!selectedItems?.has(id);
                  return (
                    <tr key={id || index} className={isSelected ? "is-selected" : ""}>
                      {leadingColumn && !showCheckboxes && renderLeadingBodyCell(item)}
                      {showProfileCol && !showCheckboxes && renderProfileBodyCell(item)}
                      {visibleColumns.map((column) => {
                        const isNameCol = ["name", "full_name", "first_name"].includes(column.key);
                        const hasCustomFormatter = !!customFormatters[column.key];
                        const bodyCell = (
                          <td
                            key={column.key}
                            className={column.key === "checkbox" ? "dt-td-check" : ""}
                          >
                            {isNameCol && !hasCustomFormatter
                              ? renderNameCell(item)
                              : getFormattedValue(item, column, index)}
                          </td>
                        );
                        if (column.key === "checkbox" && (leadingColumn || showProfileCol)) {
                          return (
                            <React.Fragment key={column.key}>
                              {bodyCell}
                              {renderLeadingBodyCell(item)}
                              {renderProfileBodyCell(item)}
                            </React.Fragment>
                          );
                        }
                        return bodyCell;
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom pagination */}
        {paginated && totalRecords > 0 && (
          <div className="dt-pagination-bottom">
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalRecords={totalRecords}
              setCurrentPage={onPageChange}
              setPageSize={(s: any) => {
                if (serverSidePagination) {
                  setPageSize(pageSizeProp);
                  return;
                }
                setPageSize(s);
                onPageSizeChange?.(s as number);
              }}
              showPageSizeDropdown={!serverSidePagination}
              pageLabel="Page:"
            />
          </div>
        )}
      </div>

      {/* Floating bulk-action bar */}
      {renderBulkBar()}

      {/* Column visibility side panel */}
      <CommonSidePanel
        isOpen={showColumnPanel}
        onClose={() => setShowColumnPanel(false)}
        title="Columns"
        width={360}
        children={
          <div className="dt-cols-panel">
            <div className="dt-cols-panel__actions">
              <button
                className="dt-link-btn"
                onClick={() => {
                  const updated = columns.map((c) => c.key === "checkbox" ? c : { ...c, visible: true });
                  setColumns(updated);
                  onColumnsChange?.(updated);
                }}
              >
                Select all
              </button>
              <span className="dt-muted">·</span>
              <button
                className="dt-link-btn dt-link-btn--muted"
                onClick={() => {
                  // Restore the original sequence as well as default visibility.
                  const natural = naturalOrderRef.current;
                  const ordered = natural.length > 0
                    ? [...columns].sort((a, b) => natural.indexOf(a.key) - natural.indexOf(b.key))
                    : columns;

                  const updated = ordered.map((c) =>
                    c.key === "checkbox" ? c : { ...c, visible: getDefaultVisibility(c.key, c.type) }
                  );

                  setColumns(updated);

                  // onResetColumns clears the stored layout; falling back to
                  // onColumnsChange would just save the defaults straight back.
                  if (onResetColumns) onResetColumns();
                  else onColumnsChange?.(updated);
                }}
              >
                Reset to default
              </button>
            </div>

            <p className="dt-cols-panel__hint">
              Drag the handle to change the column order. Your layout is saved for
              everyone on this account and applies to every list and segment.
            </p>

            <div className="dt-cols-panel__list">
              {columns.filter((c) => c.key !== "checkbox").map((column) => (
                <div
                  key={column.key}
                  className={
                    "dt-col-row" +
                    (column.visible ? " is-on" : "") +
                    (dragKey === column.key ? " is-dragging" : "") +
                    (dragOverKey === column.key && dragKey !== column.key ? " is-drop-target" : "")
                  }
                  draggable
                  onDragStart={(e) => {
                    setDragKey(column.key);
                    e.dataTransfer.effectAllowed = "move";
                    // Firefox only starts a drag when data is set.
                    e.dataTransfer.setData("text/plain", column.key);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragOverKey !== column.key) setDragOverKey(column.key);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = dragKey || e.dataTransfer.getData("text/plain");
                    moveColumn(from, column.key);
                    setDragKey(null);
                    setDragOverKey(null);
                  }}
                  onDragEnd={() => { setDragKey(null); setDragOverKey(null); }}
                  onClick={() => toggleColumn(column.key)}
                >
                  <span
                    className="dt-col-row__grip"
                    aria-hidden="true"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg viewBox="0 0 16 16" width="12" height="12">
                      <circle cx="5.5" cy="3"  r="1.35" fill="currentColor"/>
                      <circle cx="10.5" cy="3"  r="1.35" fill="currentColor"/>
                      <circle cx="5.5" cy="8"  r="1.35" fill="currentColor"/>
                      <circle cx="10.5" cy="8"  r="1.35" fill="currentColor"/>
                      <circle cx="5.5" cy="13" r="1.35" fill="currentColor"/>
                      <circle cx="10.5" cy="13" r="1.35" fill="currentColor"/>
                    </svg>
                  </span>
                  <input
                    type="checkbox"
                    className="dt-checkbox"
                    checked={column.visible}
                    aria-label={columnNameMap?.[column.key] || column.label}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleColumn(column.key)}
                  />
                  <div className="dt-col-row__text">
                    <div className="dt-col-row__label">
                      {columnNameMap?.[column.key] || column.label}
                    </div>
                    <div className="dt-col-row__type">{column.type || "text"}</div>
                  </div>
                  {column.visible && (
                    <svg viewBox="0 0 24 24" className="dt-col-row__check">
                      <path fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="m5 12 5 5 9-11"/>
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>
        }
        footerContent={
          <div className="dt-cols-footer">
            <div>
              Visible: <strong>{columns.filter((c) => c.visible && c.key !== "checkbox").length}</strong>
            </div>
            <div>
              Hidden: <strong>{columns.filter((c) => !c.visible && c.key !== "checkbox").length}</strong>
            </div>
          </div>
        }
      />
    </>
  );
};

// ---------- Internal helper ----------
/**
 * Applies a saved client layout to a column list: visibility from the layout,
 * order from the layout's position. Columns the layout has never seen (a new
 * custom attribute, a newly returned field) keep their default visibility and
 * are appended after the saved ones. The selection checkbox always leads.
 */
function applyLayout(cols: ColumnConfig[], layout: ColumnPreference[]): ColumnConfig[] {
  if (!layout || layout.length === 0) return cols;

  const positionByKey = new Map<string, ColumnPreference>();
  layout.forEach((pref, index) => {
    positionByKey.set(pref.columnKey, { ...pref, sortOrder: index });
  });

  const checkbox: ColumnConfig[] = [];
  const saved: ColumnConfig[]    = [];
  const appended: ColumnConfig[] = [];

  cols.forEach((col) => {
    if (col.key === "checkbox") { checkbox.push(col); return; }

    const pref = positionByKey.get(col.key);
    if (pref) saved.push({ ...col, visible: pref.isVisible });
    else appended.push(col);
  });

  saved.sort(
    (a, b) => (positionByKey.get(a.key)!.sortOrder) - (positionByKey.get(b.key)!.sortOrder)
  );

  return [...checkbox, ...saved, ...appended];
}

export default DynamicContactsTable;
