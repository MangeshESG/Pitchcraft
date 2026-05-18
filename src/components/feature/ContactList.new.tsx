// ============================================================
// ContactList.new.tsx — Variation B render-layer for Contacts
// ============================================================
// Drop-in render components for the Lists + Views tabs of your
// existing ContactList.tsx. Keeps every handler, API call, modal,
// and pagination logic exactly as it is — only the layout changes.
//
// EXPORTS
//   <ContactsPageHeader>      — page title + KPI strip + tabs
//   <ContactsEmptyState>      — full empty-state hero + step strip
//   <ContactsListsRows>       — populated Lists table (rows)
//   <ContactsViewsGrid>       — populated Views grid (cards)
//   <ContactsListsRow>        — single row (for custom mapping)
//   <ContactsToolbar>         — search + sort + pagination bar
//
// HOW TO USE inside ContactList.tsx
// ---------------------------------
// import {
//   ContactsPageHeader,
//   ContactsEmptyState,
//   ContactsListsRows,
//   ContactsToolbar,
// } from "./ContactList.new";
// import "./ContactList.new.css";
//
// Replace the JSX inside `{activeSubTab === "List" && (...)}` with:
//
//   <ContactsPageHeader
//     totalContacts={superListContactCount}
//     totalLists={dataFiles.length}
//     totalSegments={segments.length}
//     verifiedPct={94}
//     activeTab={activeSubTab.toLowerCase()}
//     onTabChange={(t) => handleTabChange(
//       t === 'lists' ? 'List' : t === 'views' ? 'View' : 'Segment'
//     )}
//     onAddContact={() => dispatch(openPanel("add-contact-modal"))}
//     onImportList={() => onAddContactClick?.()}
//     onCreateList={(e) => {
//       e.stopPropagation();
//       setShowCreateListOptions(!showCreateListOptions);
//     }}
//   />
//
//   {dataFiles.length === 0 && !isLoading ? (
//     <ContactsEmptyState
//       onAddContact={() => dispatch(openPanel("add-contact-modal"))}
//       onImportList={() => onAddContactClick?.()}
//       onCreateList={() => setShowCreateListModal(true)}
//     />
//   ) : (
//     <>
//       <ContactsToolbar
//         search={listSearch}
//         onSearchChange={setListSearch}
//         sortKey={listSortKey}
//         sortDirection={listSortDirection}
//         onSort={() => handleListSort(listSortKey)}
//         currentPage={currentPageLists}
//         totalPages={totalPages1}
//         pageSize={pageSize}
//         totalRecords={filteredDatafiles.length}
//         onPageChange={setCurrentPageLists}
//         onPageSizeChange={setPageSize}
//         placeholder="Search a list name or ID"
//       />
//       <ContactsListsRows
//         data={currentData}
//         isLoading={isLoading}
//         sortKey={listSortKey}
//         sortDirection={listSortDirection}
//         onSort={handleListSort}
//         actionsAnchor={listActionsAnchor}
//         setActionsAnchor={setListActionsAnchor}
//         onRowClick={(file) => {
//           setSelectedDataFileForView(file);
//           setViewMode("detail");
//           setDetailCurrentPage(1);
//           setDetailSearchQuery("");
//           setDetailSelectedContacts(new Set());
//         }}
//         onRename={(file) => {
//           setEditingList(file);
//           dispatch(openPanel("rename-contact-list-modal"));
//           dispatch(openPanel("save-segment-modal"));
//           setRenamingListName(file.name);
//           setRenamingListDescription(file.description || "");
//         }}
//         onView={(file) => {
//           setSelectedDataFileForView(file);
//           setViewMode("detail");
//           setDetailCurrentPage(1);
//           setDetailSearchQuery("");
//           setDetailSelectedContacts(new Set());
//         }}
//         onDownload={handleDownloadList}
//         onDelete={(file) => {
//           setEditingList(file);
//           setShowConfirmListDelete(true);
//           dispatch(openPanel("rename-contact-list-modal"));
//         }}
//         isDemoAccount={isDemoAccount}
//         formatDate={formatDate}
//       />
//     </>
//   )}
//
// ============================================================

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faPlus,
  faPlay,
  faSort,
  faSortUp,
  faSortDown,
  faChevronDown,
  faAnglesLeft,
  faAngleLeft,
  faAngleRight,
  faAnglesRight,
  faEllipsisV,
  faUpload,
  faDownload,
  faUser,
  faAddressBook,
  faFilter,
  faArrowTrendUp,
  faPencil,
  faEye,
} from "@fortawesome/free-solid-svg-icons";
import { faTrashAlt, faFileLines } from "@fortawesome/free-regular-svg-icons";

// ------------------------------------------------------------
// Shared hero illustration
// ------------------------------------------------------------
export const ContactsIllustration: React.FC<{ width?: number }> = ({
  width = 340,
}) => {
  const h = width * 0.72;
  return (
    <svg viewBox="0 0 420 300" width={width} height={h} style={{ display: "block" }}>
      <defs>
        <linearGradient id="ct-bg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#e2f1e3" />
          <stop offset="100%" stopColor="#f1f8f2" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="210" cy="160" r="135" fill="url(#ct-bg)" />
      <g fill="#3f9f42" opacity="0.55">
        <path d="M70 90l3 6 6 3-6 3-3 6-3-6-6-3 6-3z" />
        <path d="M345 70l2.5 5 5 2.5-5 2.5-2.5 5-2.5-5-5-2.5 5-2.5z" />
        <path d="M380 200l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" />
      </g>
      <rect x="118" y="60" width="218" height="160" rx="14" fill="#fff" stroke="#3f9f42" strokeWidth="2"/>
      <rect x="158" y="92" width="60" height="60" rx="30" fill="#f1f8f2" stroke="#a7d5a9" strokeWidth="2"/>
      <circle cx="188" cy="115" r="10" fill="#3f9f42" opacity="0.7"/>
      <path d="M170 142c2-9 10-13 18-13s16 4 18 13" fill="#3f9f42" opacity="0.7"/>
      <rect x="236" y="100" width="80" height="8" rx="4" fill="#3f9f42" opacity="0.6"/>
      <rect x="236" y="116" width="56" height="6" rx="3" fill="#e2f1e3"/>
      <rect x="236" y="130" width="68" height="6" rx="3" fill="#e2f1e3"/>
      <rect x="138" y="170" width="180" height="6" rx="3" fill="#e2f1e3"/>
      <rect x="138" y="184" width="120" height="6" rx="3" fill="#e2f1e3"/>
      <rect x="138" y="198" width="90" height="6" rx="3" fill="#e2f1e3"/>
      <g>
        <circle cx="312" cy="58" r="20" fill="#fff" stroke="#a7d5a9" strokeWidth="1.5"/>
        <circle cx="312" cy="54" r="6" fill="#3f9f42" opacity="0.55"/>
        <path d="M302 71c2-5 6-8 10-8s8 3 10 8" fill="#3f9f42" opacity="0.55"/>
      </g>
      <g>
        <circle cx="98" cy="240" r="22" fill="#fff" stroke="#a7d5a9" strokeWidth="1.5"/>
        <circle cx="98" cy="235" r="7" fill="#3f9f42" opacity="0.55"/>
        <path d="M86 255c3-6 7-9 12-9s9 3 12 9" fill="#3f9f42" opacity="0.55"/>
      </g>
      <circle cx="305" cy="216" r="22" fill="#3f9f42"/>
      <path d="M305 205v22M294 216h22" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
};

// ------------------------------------------------------------
// Shared page header — title + KPI strip + tabs
// ------------------------------------------------------------
interface PageHeaderProps {
  totalContacts: number;
  totalLists: number;
  totalSegments: number;
  verifiedPct: number;
  activeTab: string; // 'lists' | 'views' | 'segments' | 'custom'
  onTabChange: (tab: string) => void;
  onAddContact?: () => void;
  onImportList?: () => void;
  onCreateList?: (e: React.MouseEvent) => void;
  showStats?: boolean;
}

export const ContactsPageHeader: React.FC<PageHeaderProps> = ({
  totalContacts,
  totalLists,
  totalSegments,
  verifiedPct,
  activeTab,
  onTabChange,
  onAddContact,
  onImportList,
  onCreateList,
  showStats = true,
}) => {
  const tabs = [
    { k: "lists", label: "Lists" },
    { k: "views", label: "Views" },
    { k: "segments", label: "Segments" },
  ];

  return (
    <div className="ct-page-header">
      <div className="ct-page-header__inner">
        <div className="ct-page-header__top">
          <div>
            <div className="ct-eyebrow">CRM</div>
            <h1 className="ct-page-title">
              Contacts
              {totalContacts > 0 && (
                <span className="ct-count-pill">
                  {totalContacts.toLocaleString()}
                </span>
              )}
            </h1>
            <p className="ct-page-sub">
              Organize, segment, and keep your contact data fresh.
            </p>
          </div>
          {totalContacts > 0 && (
            <div className="ct-header-actions">
              <button className="ct-btn-tertiary" onClick={onAddContact}>
                <FontAwesomeIcon icon={faUser} style={{ color: "#3f9f42" }} />
                Add contact
              </button>
              <button className="ct-btn-tertiary" onClick={onImportList}>
                <FontAwesomeIcon icon={faUpload} style={{ color: "#6b7280" }} />
                Import list
              </button>
              <button className="ct-btn-primary-dark" onClick={onCreateList}>
                <FontAwesomeIcon icon={faPlus} />
                Create a list
              </button>
            </div>
          )}
        </div>

        {showStats && totalContacts > 0 && (
          <div className="ct-kpi-strip">
            {[
              { label: "Total lists",     value: totalLists,    delta: "+2 this month",     I: faAddressBook,  tone: "green" },
              { label: "Total contacts",  value: totalContacts, delta: "+186 this week",    I: faUser,         tone: "green" },
              { label: "Segments",        value: totalSegments, delta: "Across 4 sources",  I: faFilter,       tone: "slate" },
              { label: "Verified emails", value: `${verifiedPct}%`, delta: "+2% vs last",   I: faArrowTrendUp, tone: "green" },
            ].map((s) => (
              <div key={s.label} className="ct-kpi">
                <div className="ct-kpi__head">
                  <div className="ct-kpi__label">{s.label}</div>
                  <FontAwesomeIcon icon={s.I} className={`ct-kpi__icon ct-tone-${s.tone}`} />
                </div>
                <div className="ct-kpi__value">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</div>
                <div className={`ct-kpi__delta ct-tone-${s.tone}`}>{s.delta}</div>
              </div>
            ))}
          </div>
        )}

        <div className="ct-tabs">
          {tabs.map((t) => (
            <button
              key={t.k}
              className={`ct-tab ${activeTab === t.k ? "is-active" : ""}`}
              onClick={() => onTabChange(t.k)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------
// Empty state
// ------------------------------------------------------------
export const ContactsEmptyState: React.FC<{
  onAddContact?: () => void;
  onImportList?: () => void;
  onCreateList?: () => void;
}> = ({ onAddContact, onImportList, onCreateList }) => (
  <div className="ct-empty-body">
    <div className="ct-empty-hero">
      <div className="ct-empty-hero__bg" />
      <div className="ct-empty-hero__content">
        <div className="ct-empty-hero__copy">
          <span className="ct-start-pill">⚡ Start here</span>
          <h2 className="ct-empty-headline">Build your audience.</h2>
          <p className="ct-empty-text">
            Add contacts one at a time, import a CSV, or build a list manually.
            Then segment them into views to power every future campaign.
          </p>
          <div className="ct-empty-actions">
            <button className="ct-btn-primary" onClick={onAddContact}>
              <FontAwesomeIcon icon={faPlus} />
              Add your first contact
            </button>
            <button className="ct-btn-secondary" onClick={onImportList}>
              <FontAwesomeIcon icon={faUpload} />
              Import list
            </button>
            <button className="ct-btn-secondary" onClick={onCreateList}>
              <FontAwesomeIcon icon={faPlus} style={{ color: "#3f9f42" }} />
              Create a list
            </button>
          </div>
          <div className="ct-empty-meta">
            CSV, Excel, or paste from any spreadsheet — we'll map the fields for you.
          </div>
        </div>
        <div className="ct-empty-hero__art">
          <ContactsIllustration width={340} />
        </div>
      </div>
    </div>

    <div className="ct-how">
      <div className="ct-eyebrow" style={{ marginBottom: 16 }}>How contacts fit in</div>
      <div className="ct-steps">
        {[
          { n: 1, label: "Add contacts",     icon: "👥", active: true  },
          { n: 2, label: "Create blueprint", icon: "📄", active: false },
          { n: 3, label: "Create campaign",  icon: "📣", active: false },
          { n: 4, label: "Kraft emails",     icon: "✉️", active: false },
          { n: 5, label: "View analytics",   icon: "📈", active: false },
        ].map((s) => (
          <div key={s.n} className={`ct-step ${s.active ? "is-active" : ""}`}>
            <div className="ct-step__head">
              <span className="ct-step__num">STEP {String(s.n).padStart(2, "0")}</span>
              <span className="ct-step__icon">{s.icon}</span>
            </div>
            <div className="ct-step__label">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ------------------------------------------------------------
// Toolbar — search + sort + pagination
// ------------------------------------------------------------
interface ToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  sortKey: string;
  sortDirection: "asc" | "desc";
  onSort: () => void;
  currentPage: number;
  totalPages: number;
  pageSize: number | "All";
  totalRecords: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (n: number | "All") => void;
  placeholder?: string;
}

export const ContactsToolbar: React.FC<ToolbarProps> = (p) => {
  const numericSize = p.pageSize === "All" ? p.totalRecords : p.pageSize;
  const from = (p.currentPage - 1) * numericSize + 1;
  const to = Math.min(p.currentPage * numericSize, p.totalRecords);

  return (
    <div className="ct-toolbar">
      <div className="ct-toolbar__left">
        <div className="ct-search">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="ct-search__icon" />
          <input
            value={p.search}
            onChange={(e) => p.onSearchChange(e.target.value)}
            placeholder={p.placeholder || "Search"}
          />
        </div>
        <button className="ct-btn-tertiary" onClick={p.onSort}>
          <FontAwesomeIcon icon={faSort} style={{ color: "#6b7280" }} />
          {p.sortDirection === "asc" ? "Oldest first" : "Newest first"}
          <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: 10, color: "#6b7280" }} />
        </button>
      </div>

      <div className="ct-pagination">
        <span>
          Showing <strong>{from}–{to}</strong> of <strong>{p.totalRecords}</strong>
        </span>
        <div className="ct-pagination__nav">
          <button onClick={() => p.onPageChange(1)} disabled={p.currentPage === 1}>
            <FontAwesomeIcon icon={faAnglesLeft} />
          </button>
          <button onClick={() => p.onPageChange(p.currentPage - 1)} disabled={p.currentPage === 1}>
            <FontAwesomeIcon icon={faAngleLeft} />
          </button>
          <span className="ct-pagination__page">
            {p.currentPage} / {Math.max(p.totalPages, 1)}
          </span>
          <button onClick={() => p.onPageChange(p.currentPage + 1)} disabled={p.currentPage >= p.totalPages}>
            <FontAwesomeIcon icon={faAngleRight} />
          </button>
          <button onClick={() => p.onPageChange(p.totalPages)} disabled={p.currentPage >= p.totalPages}>
            <FontAwesomeIcon icon={faAnglesRight} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------
// Lists rows
// ------------------------------------------------------------
interface DataFile {
  id: number;
  name: string;
  description?: string;
  contactCount?: number;
  contacts?: any[];
  created_at?: string;
}

const sortIcon = (active: boolean, dir: "asc" | "desc") =>
  active ? (dir === "asc" ? faSortUp : faSortDown) : faSort;

interface RowsProps {
  data: DataFile[];
  isLoading: boolean;
  sortKey: string;
  sortDirection: "asc" | "desc";
  onSort: (k: string) => void;
  actionsAnchor: string | null;
  setActionsAnchor: (v: string | null) => void;
  onRowClick: (file: DataFile) => void;
  onRename: (file: DataFile) => void;
  onView: (file: DataFile) => void;
  onDownload: (file: DataFile) => void;
  onDelete: (file: DataFile) => void;
  isDemoAccount: boolean;
  formatDate: (d?: string | null) => string;
}

export const ContactsListsRows: React.FC<RowsProps> = (p) => (
  <div className="ct-rows">
    <div className="ct-rows__head">
      <div></div>
      <div className="ct-th" onClick={() => p.onSort("name")}>
        List <FontAwesomeIcon icon={sortIcon(p.sortKey === "name", p.sortDirection)} className={p.sortKey === "name" ? "active" : ""} />
      </div>
      <div className="ct-th" onClick={() => p.onSort("id")}>
        ID <FontAwesomeIcon icon={sortIcon(p.sortKey === "id", p.sortDirection)} className={p.sortKey === "id" ? "active" : ""} />
      </div>
      <div className="ct-th ct-right" onClick={() => p.onSort("contactCount")}>
        Contacts <FontAwesomeIcon icon={sortIcon(p.sortKey === "contactCount", p.sortDirection)} className={p.sortKey === "contactCount" ? "active" : ""} />
      </div>
      <div className="ct-th" onClick={() => p.onSort("created_at")}>
        Created <FontAwesomeIcon icon={sortIcon(p.sortKey === "created_at", p.sortDirection)} className={p.sortKey === "created_at" ? "active" : ""} />
      </div>
      <div className="ct-th" onClick={() => p.onSort("description")}>Description</div>
      <div></div>
    </div>

    {p.isLoading ? (
      <div className="ct-rows__msg">Loading lists...</div>
    ) : p.data.length === 0 ? (
      <div className="ct-rows__msg">No lists found.</div>
    ) : (
      p.data.map((file) => (
        <div key={file.id} className="ct-row">
          <div className="ct-row__rail" />
          <a className="ct-row__link" onClick={() => p.onRowClick(file)}>
            {file.name}
          </a>
          <div className="ct-row__id">#{file.id === -1 ? "ALL" : file.id}</div>
          <div className="ct-row__count">
            {(file.contactCount || file.contacts?.length || 0).toLocaleString()}
          </div>
          <div className="ct-row__date">{p.formatDate(file.created_at)}</div>
          <div className="ct-row__desc">{file.description || "—"}</div>
          <div className="ct-row__actions">
            {file.id !== -1 && (
              <button
                title="More"
                onClick={() =>
                  p.setActionsAnchor(
                    p.actionsAnchor === file.id.toString() ? null : file.id.toString()
                  )
                }
              >
                <FontAwesomeIcon icon={faEllipsisV} />
              </button>
            )}
            {p.actionsAnchor === file.id.toString() && (
              <div className="ct-row__menu">
                {!p.isDemoAccount && (
                  <button onClick={() => { p.onRename(file); p.setActionsAnchor(null); }}>
                    <FontAwesomeIcon icon={faFileLines} /> Rename
                  </button>
                )}
                <button onClick={() => { p.onView(file); p.setActionsAnchor(null); }}>
                  <FontAwesomeIcon icon={faEye} /> View
                </button>
                <button onClick={() => { p.onDownload(file); p.setActionsAnchor(null); }}>
                  <FontAwesomeIcon icon={faDownload} /> Download
                </button>
                {!p.isDemoAccount && (
                  <button onClick={() => { p.onDelete(file); p.setActionsAnchor(null); }} className="is-danger">
                    <FontAwesomeIcon icon={faTrashAlt} /> Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ))
    )}
  </div>
);

// ------------------------------------------------------------
// Views grid — for ContactViews.tsx
// ------------------------------------------------------------
interface ViewItem {
  id: number;
  name: string;
  description?: string;
  contactCount?: number;
  created_at?: string;
}

interface ViewsGridProps {
  views: ViewItem[];
  isLoading: boolean;
  contactCounts: Record<number, number>;
  onOpen: (v: ViewItem) => void;
  onMore: (v: ViewItem, e: React.MouseEvent) => void;
  formatDate: (d?: string | null) => string;
}

export const ContactsViewsGrid: React.FC<ViewsGridProps> = (p) => (
  <div className="ct-views-grid">
    {p.isLoading ? (
      <div className="ct-rows__msg">Loading views...</div>
    ) : p.views.length === 0 ? (
      <div className="ct-rows__msg">No saved views yet.</div>
    ) : (
      p.views.map((v) => (
        <div key={v.id} className="ct-view-card" onClick={() => p.onOpen(v)}>
          <div className="ct-view-card__head">
            <div className="ct-view-card__icon">
              <FontAwesomeIcon icon={faFilter} />
            </div>
            <div className="ct-view-card__title">
              <div className="ct-view-card__name">{v.name}</div>
              <div className="ct-view-card__meta">#{v.id} · {p.formatDate(v.created_at)}</div>
            </div>
            <button
              className="ct-view-card__more"
              onClick={(e) => { e.stopPropagation(); p.onMore(v, e); }}
            >
              <FontAwesomeIcon icon={faEllipsisV} />
            </button>
          </div>
          {v.description && <p className="ct-view-card__desc">{v.description}</p>}
          <div className="ct-view-card__footer">
            <div className="ct-view-card__count">
              <FontAwesomeIcon icon={faUser} style={{ color: "#6b7280", fontSize: 11 }} />
              <strong>{(p.contactCounts[v.id] ?? v.contactCount ?? 0).toLocaleString()}</strong>
              <span>contacts</span>
            </div>
            <span className="ct-view-card__open">
              Open <FontAwesomeIcon icon={faAngleRight} style={{ fontSize: 10 }} />
            </span>
          </div>
        </div>
      ))
    )}
  </div>
);
