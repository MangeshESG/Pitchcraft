// ============================================================
// ContactList.new.tsx — Variation B render-layer for Contacts
// ============================================================
// Drop-in render components for the Lists + Views tabs of your
// existing ContactList.tsx. Keeps every handler, API call, modal,
// and pagination logic exactly as it is — only the layout changes.
//
// EXPORTS
//   <ContactsPageHeader>      — page title + KPI strip
//   <ContactsEmptyState>      — full empty-state hero
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
  faPencil,
  faEye,
  faDatabase,
} from "@fortawesome/free-solid-svg-icons";
import { faTrashAlt, faFileLines } from "@fortawesome/free-regular-svg-icons";
import contactNewUserImage from "../../assets/images/contcat_new_user.png";

// ------------------------------------------------------------
// Shared page header — title + KPI strip
// ------------------------------------------------------------
interface PageHeaderProps {
  totalContacts: number;
  totalLists: number;
  totalViews: number;
  totalSegments: number;
  activeTab: "lists" | "views" | "segments";
  listsDelta?: string;
  viewsDelta?: string;
  segmentsDelta?: string;
  onAddContact?: () => void;
  onImportList?: () => void;
  onCreateList?: (e: React.MouseEvent) => void;
  showStats?: boolean;
}

export const ContactsPageHeader: React.FC<PageHeaderProps> = ({
  totalContacts,
  totalLists,
  totalViews,
  totalSegments,
  activeTab,
  listsDelta,
  viewsDelta,
  segmentsDelta,
  onAddContact,
  onImportList,
  onCreateList,
  showStats = true,
}) => {
  if (totalContacts === 0) return null;

  const headerTitle =
    activeTab === "views" ? "Views" :
    activeTab === "segments" ? "Segments" : "Lists";
  const headerCount =
    activeTab === "views" ? totalViews :
    activeTab === "segments" ? totalSegments : totalLists;

  return (
    <div className="ct-page-header">
      <div className="ct-page-header__inner">
        <div className="ct-page-header__top">
          <div>
            <h1 className="ct-page-title">
              {headerTitle}
              <span className="ct-count-pill">
                {headerCount.toLocaleString()}
              </span>
            </h1>
          </div>
          <div className="ct-header-actions">
            <button className="ct-btn-tertiary-default" onClick={onImportList}>
              <FontAwesomeIcon icon={faUpload} style={{ color: "var(--btn-default-fg)" }} />
              Import list
            </button>
            <button className="ct-btn-tertiary" onClick={onAddContact}>
              <FontAwesomeIcon icon={faUser} style={{ color: "var(--btn-muted-fg)" }} />
              Add contact
            </button>
            <button className="ct-btn-tertiary" onClick={onCreateList}>
              <FontAwesomeIcon icon={faPlus} style={{ color: "var(--btn-muted-fg)" }} />
              Create a list
            </button>
          </div>
        </div>

        {showStats && (
          <div className="ct-kpi-strip">
            {[
              { label: "Total contacts", value: totalContacts, delta: undefined,    I: faUser,        tone: "green" },
              { label: "Total lists",    value: totalLists,    delta: listsDelta,    I: faAddressBook, tone: "green" },
              { label: "Total views",    value: totalViews,    delta: viewsDelta,    I: faEye,         tone: "green" },
              { label: "Total segments", value: totalSegments, delta: segmentsDelta, I: faFilter,      tone: "slate" },
            ].map((s) => (
              <div key={s.label} className="ct-kpi">
                <div className="ct-kpi__head">
                  <div className="ct-kpi__label">{s.label}</div>
                  <FontAwesomeIcon icon={s.I} className={`ct-kpi__icon ct-tone-${s.tone}`} />
                </div>
                <div className="ct-kpi__value">{s.value.toLocaleString()}</div>
                {s.delta && <div className={`ct-kpi__delta ct-tone-${s.tone}`}>{s.delta}</div>}
              </div>
            ))}
          </div>
        )}
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
      <div className="ct-empty-hero__content">
        <div className="ct-empty-hero__copy">
          <span className="ct-start-pill">Start here</span>
          <h2 className="ct-empty-headline">Build your audience.</h2>
          <p className="ct-empty-text">
           Add contacts one at a time or import a list*. You can optionally segment them into views to power every future campaign.
          </p>
          <div className="ct-empty-actions">
            <button className="ct-btn-default" onClick={onImportList}>
              <FontAwesomeIcon icon={faUpload} style={{ color: "var(--btn-default-fg)" }} />
              Import list
            </button>
            <button className="ct-btn-muted" onClick={onAddContact}>
              <FontAwesomeIcon icon={faPlus} style={{ color: "var(--btn-muted-fg)" }} />
              Add your first contact
            </button>
            <button className="ct-btn-muted" onClick={onCreateList}>
              <FontAwesomeIcon icon={faPlus} style={{ color: "var(--btn-muted-fg)" }} />
              Create a list
            </button>
          </div>
          <div className="ct-empty-meta">
            * Import a CSV, Excel file or any spreadsheet — we'll map the fields for you.
          </div>
        </div>
        <div className="ct-empty-hero__art">
          <img src={contactNewUserImage} alt="" width={500} style={{ display: "block", maxWidth: "100%", height: "auto" }} />
        </div>
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
        <div className="ct-pagination__size">
          <select
            value={p.pageSize as any}
            onChange={(e) => {
              const v = e.target.value;
              p.onPageSizeChange(v === "All" ? "All" : Number(v));
              p.onPageChange(1);
            }}
          >
            {[10, 20, 30, 40, 50, 100, 200, "All"].map((s) => (
              <option key={String(s)} value={s as any}>
                {s} / page
              </option>
            ))}
          </select>
          <FontAwesomeIcon icon={faChevronDown} className="ct-pagination__size-caret" />
        </div>
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
      p.data.map((file) => {
        const isSystemList =
          file.id === -1 ||
          file.name === "All contacts" ||
          file.name === "All manually added contacts";
        return (
        <div key={file.id} className="ct-row">
          {isSystemList ? (
            <FontAwesomeIcon
              icon={faDatabase}
              className="ct-row__sysicon"
              title="System list"
            />
          ) : (
            <div className="ct-row__rail" />
          )}
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
        );
      })
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
