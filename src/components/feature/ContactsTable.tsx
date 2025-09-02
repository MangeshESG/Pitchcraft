import { useRef, useCallback, useState, useEffect } from "react";
import React from "react";

interface ContactsTableProps {
  contacts: any[];
  columns: any[];
  isLoading: boolean;
  search: string;
  setSearch: (s: string) => void;
  showCheckboxes?: boolean;
  paginated?: boolean;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (pg: number) => void;
  onSelectAll?: () => void;
  selectedContacts?: Set<string>;
  onSelectContact?: (id: string) => void;
  formatDate: (dt: string) => string;
  getContactValue: (c: any, k: string) => any;
  totalContacts?: number;

  // New props for detail view
  viewMode?: "table" | "detail";
  detailTitle?: string;
  detailDescription?: string;
  onBack?: () => void;
  onAddContact?: () => void;
  hideSearch?: boolean;
  customHeader?: React.ReactNode;
  onColumnsChange?: (columns: any[]) => void;
}

const ContactsTable: React.FC<ContactsTableProps> = ({
  contacts,
  columns,
  isLoading,
  search,
  setSearch,
  showCheckboxes,
  paginated,
  currentPage = 1,
  pageSize = 20,
  onPageChange,
  onSelectAll,
  selectedContacts,
  onSelectContact,
  formatDate,
  getContactValue,
  totalContacts,
  viewMode = "table",
  detailTitle,
  detailDescription,
  onBack,
  onAddContact,
  hideSearch = false,
  customHeader,
  onColumnsChange,
}) => {
  const [showColumnPanel, setShowColumnPanel] = useState(false);
  const [localColumns, setLocalColumns] = useState(columns);
  const columnPanelRef = useRef<HTMLDivElement>(null);

  const colList = localColumns.filter((col) =>
    showCheckboxes ? col.visible : col.key !== "checkbox" && col.visible
  );

  // Filter contacts based on search
  const filteredContacts = contacts.filter((contact) => {
    const searchLower = search.toLowerCase();
    return (
      contact.full_name?.toLowerCase().includes(searchLower) ||
      contact.email?.toLowerCase().includes(searchLower) ||
      contact.company_name?.toLowerCase().includes(searchLower) ||
      contact.job_title?.toLowerCase().includes(searchLower) ||
      contact.country_or_address?.toLowerCase().includes(searchLower) ||
      contact.toEmail?.toLowerCase().includes(searchLower) ||
      contact.subject?.toLowerCase().includes(searchLower) ||
      contact.company?.toLowerCase().includes(searchLower) ||
      contact.jobTitle?.toLowerCase().includes(searchLower) ||
      contact.location?.toLowerCase().includes(searchLower)
    );
  });

  // Paginate filtered contacts
  const displayContacts = paginated
    ? filteredContacts.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
      )
    : filteredContacts;

  const totalPages = Math.ceil(filteredContacts.length / pageSize);

  const toggleColumnVisibility = (columnKey: string) => {
    const updatedColumns = localColumns.map((col) =>
      col.key === columnKey ? { ...col, visible: !col.visible } : col
    );
    setLocalColumns(updatedColumns);
    if (onColumnsChange) {
      onColumnsChange(updatedColumns);
    }
  };

  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const columnDropdownRef = useRef<HTMLDivElement>(null);

  // Add this useEffect to handle clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        columnPanelRef.current &&
        !columnPanelRef.current.contains(event.target as Node)
      ) {
        setShowColumnPanel(false);
      }
    };

    if (showColumnPanel) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showColumnPanel]);

  return (
    <>
      {/* Detail View Header */}
      {viewMode === "detail" && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 20,
              gap: 16,
            }}
          >
            {onBack && (
              <button className="button secondary" onClick={onBack}>
                ← Back
              </button>
            )}
            {detailTitle && <h2 style={{ margin: 0 }}>{detailTitle}</h2>}
            <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
              <button
                className="button secondary"
                onClick={() => setShowColumnPanel(!showColumnPanel)}
              >
                Show/Hide Columns
              </button>
              {onAddContact && (
                <button className="button primary" onClick={onAddContact}>
                  + Add Contact
                </button>
              )}
            </div>
          </div>

          {detailDescription && (
            <div style={{ marginBottom: 16, color: "#555" }}>
              {detailDescription}
            </div>
          )}
        </>
      )}

      {/* Custom Header */}
      {customHeader}

      {/* Search and Info Bar */}
      {!hideSearch && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 12,
            gap: 12,
          }}
        >
          <input
            type="text"
            className="search-input"
            style={{ minWidth: 300 }}
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {totalContacts !== undefined && (
            <span style={{ fontWeight: 600 }}>
              Total: {totalContacts} contacts
            </span>
          )}
          {showCheckboxes && selectedContacts && selectedContacts.size > 0 && (
            <span style={{ color: "#186bf3" }}>
              {selectedContacts.size} selected
            </span>
          )}
          {viewMode === "table" && (
            <button
              className="button secondary"
              onClick={() => setShowColumnPanel(!showColumnPanel)}
              style={{ marginLeft: "auto" }}
            >
              ⚙️ Columns
            </button>
          )}
        </div>
      )}

      {/* Main Content with Sidebar */}
      <div style={{ position: "relative", display: "flex" }}>
        {/* Table Content */}
        <div
          style={{
            width: "100%",
            marginRight: showColumnPanel ? "300px" : "0",
            transition: "margin-right 0.3s ease",
          }}
        >
          <div className="contacts-table-wrapper">
            <table className="contacts-table">
              <thead>
                <tr>
                  {colList.map((column) => (
                    <th key={column.key} style={{ width: column.width }}>
                      {column.key === "checkbox" ? (
                        <input
                          type="checkbox"
                          checked={
                            selectedContacts
                              ? selectedContacts.size ===
                                  displayContacts.length &&
                                displayContacts.length > 0
                              : false
                          }
                          onChange={onSelectAll}
                        />
                      ) : (
                        column.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={colList.length} className="text-center">
                      Loading...
                    </td>
                  </tr>
                ) : displayContacts.length === 0 ? (
                  <tr>
                    <td colSpan={colList.length} className="text-center">
                      {search
                        ? "No contacts found matching your search."
                        : "No contacts found."}
                    </td>
                  </tr>
                ) : (
                  displayContacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className={
                        selectedContacts?.has(contact.id.toString())
                          ? "selected"
                          : ""
                      }
                    >
                      {colList.map((column) => (
                        <td key={column.key}>
                          {column.key === "checkbox" ? (
                            <input
                              type="checkbox"
                              checked={selectedContacts?.has(
                                contact.id.toString()
                              )}
                              onChange={() =>
                                onSelectContact?.(contact.id.toString())
                              }
                            />
                          ) : (
                            getContactValue(contact, column.key) || "-"
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {paginated &&
            filteredContacts.length > 0 &&
            typeof onPageChange === "function" && (
              <div className="pagination-wrapper d-flex justify-between align-center mt-20">
                <div className="pagination-info">
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, filteredContacts.length)} of{" "}
                  {filteredContacts.length} contacts
                </div>
                <div className="pagination-controls d-flex align-center gap-10">
                  <button
                    className="pagination-btn"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    className="pagination-btn"
                    onClick={() =>
                      onPageChange(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
        </div>

        {/* Column Settings Sidebar Panel */}
        {showColumnPanel && (
          <div
            ref={columnPanelRef}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              height: "100vh",
              width: "300px",
              background: "#fff",
              border: "1px solid #e0e0e0",

              boxShadow: "-4px 0 12px rgba(0,0,0,0.15)",
              padding: "20px",
              zIndex: 1000,
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
                paddingBottom: "10px",
                borderBottom: "1px solid #e0e0e0",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#333",
                }}
              >
                Show/Hide columns
              </h3>
              <button
                onClick={() => setShowColumnPanel(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#666",
                }}
              >
                ×
              </button>
            </div>

            <div
              className="justify-start"
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {localColumns
                .filter((col) => col.key !== "checkbox")
                .map((column) => (
                  <label
                    key={column.key}
                    className="items-start"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "10px 12px",
                      border: "1px solid #e0e0e0",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      backgroundColor: column.visible ? "#f0f7ff" : "#f9f9f9",
                      transition: "background-color 0.2s ease",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={column.visible}
                      onChange={() => toggleColumnVisibility(column.key)}
                      style={{
                        marginRight: "12px",
                        transform: "scale(1.2)",
                      }}
                    />
                    <span
                      style={{
                        fontWeight: column.visible ? "500" : "400",
                        color: column.visible ? "#333" : "#666",
                      }}
                    >
                      {column.label}
                    </span>
                    {column.visible && (
                      <span
                        style={{
                          marginLeft: "auto",
                          color: "#28a745",
                          fontSize: "12px",
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </label>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Overlay when panel is open */}
      {showColumnPanel && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.3)",
            zIndex: 999,
          }}
          onClick={() => setShowColumnPanel(false)}
        />
      )}
    </>
  );
};

export default ContactsTable;
