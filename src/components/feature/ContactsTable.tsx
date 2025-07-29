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
  viewMode?: 'table' | 'detail';
  detailTitle?: string;
  detailDescription?: string;
  onBack?: () => void;
  onAddContact?: () => void;
  hideSearch?: boolean;
  customHeader?: React.ReactNode;
}

const ContactsTable: React.FC<ContactsTableProps> = ({
  contacts, columns, isLoading, search, setSearch,
  showCheckboxes, paginated, currentPage=1, pageSize=20, onPageChange,
  onSelectAll, selectedContacts, onSelectContact, formatDate, getContactValue,
  totalContacts,
  viewMode = 'table',
  detailTitle,
  detailDescription,
  onBack,
  onAddContact,
  hideSearch = false,
  customHeader
}) => {
  const colList = columns.filter(col =>
    showCheckboxes ? col.visible : (col.key !== "checkbox" && col.visible)
  );

  // Filter contacts based on search
  const filteredContacts = contacts.filter((contact) => {
    const searchLower = search.toLowerCase();
    return (
      contact.full_name?.toLowerCase().includes(searchLower) ||
      contact.email?.toLowerCase().includes(searchLower) ||
      contact.company_name?.toLowerCase().includes(searchLower) ||
      contact.job_title?.toLowerCase().includes(searchLower) ||
      contact.country_or_address?.toLowerCase().includes(searchLower)
    );
  });

  // Paginate filtered contacts
  const displayContacts = paginated 
    ? filteredContacts.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : filteredContacts;

  const totalPages = Math.ceil(filteredContacts.length / pageSize);

  return (
    <>
      {/* Detail View Header */}
      {viewMode === 'detail' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, gap: 16 }}>
            {onBack && (
              <button 
                className="button secondary"
                onClick={onBack}
              >
                ← Back
              </button>
            )}
            {detailTitle && (
              <h2 style={{ margin: 0 }}>{detailTitle}</h2>
            )}
            {onAddContact && (
              <button 
                className="button primary" 
                onClick={onAddContact} 
                style={{ marginLeft: 'auto' }}
              >
                + Add Contact
              </button>
            )}
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
        <div style={{display:"flex", alignItems:"center", marginBottom:12, gap:12}}>
          <input
            type="text"
            className="search-input"
            style={{minWidth:300}}
            placeholder="Search..."
            value={search}
            onChange={e=>setSearch(e.target.value)}
          />
          {totalContacts !== undefined && (
            <span style={{ fontWeight: 500 }}>
              Total: {totalContacts} contacts
            </span>
          )}
          {showCheckboxes && selectedContacts && selectedContacts.size > 0 && (
            <span style={{ color: '#186bf3' }}>
              {selectedContacts.size} selected
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="contacts-table-wrapper">
        <table className="contacts-table">
          <thead>
            <tr>
              {colList.map(column => (
                <th key={column.key} style={{ width: column.width }}>
                  {column.key === "checkbox" ? (
                    <input
                      type="checkbox"
                      checked={
                        selectedContacts
                          ? selectedContacts.size === displayContacts.length && displayContacts.length > 0
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
                <td colSpan={colList.length} className="text-center">Loading...</td>
              </tr>
            ) : displayContacts.length === 0 ? (
              <tr>
                <td colSpan={colList.length} className="text-center">
                  {search ? "No contacts found matching your search." : "No contacts found."}
                </td>
              </tr>
            ) : (
              displayContacts.map(contact => (
                <tr
                  key={contact.id}
                  className={
                    selectedContacts?.has(contact.id.toString())
                      ? "selected"
                      : ""
                  }
                >
                  {colList.map(column => (
                    <td key={column.key}>
                      {column.key === "checkbox" ? (
                        <input
                          type="checkbox"
                          checked={selectedContacts?.has(contact.id.toString())}
                          onChange={() => onSelectContact?.(contact.id.toString())}
                        />
                      ) : column.key === "website" || column.key === "linkedin_url" ? (
                        getContactValue(contact, column.key) ? (
                          <a
                            href={getContactValue(contact, column.key)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="contact-link"
                          >
                            {column.key === "linkedin_url" ? "View Profile" : "Visit Website"}
                          </a>
                        ) : (
                          "-"
                        )
                      ) : ["created_at","updated_at","email_sent_at"].includes(column.key) ? (
                        formatDate(getContactValue(contact, column.key))
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
      {paginated && filteredContacts.length > 0 && typeof onPageChange === "function" && (
        <div className="pagination-wrapper d-flex justify-between align-center mt-20">
          <div className="pagination-info">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredContacts.length)} of {filteredContacts.length} contacts
          </div>
          <div className="pagination-controls d-flex align-center gap-10">
            <button
              className="pagination-btn"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button
              className="pagination-btn"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ContactsTable;