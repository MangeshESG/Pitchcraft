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
}

const ContactsTable: React.FC<ContactsTableProps> = ({
  contacts, columns, isLoading, search, setSearch,
  showCheckboxes, paginated, currentPage=1, pageSize=20, onPageChange,
  onSelectAll, selectedContacts, onSelectContact, formatDate, getContactValue,
  totalContacts
}) => {
  const colList = columns.filter(col =>
    showCheckboxes ? col.visible : (col.key !== "checkbox" && col.visible)
  );
  return (
    <>
      <div style={{display:"flex", alignItems:"center", marginBottom:12, gap:12}}>
        <input
          type="text"
          className="search-input"
          style={{minWidth:300}}
          placeholder="Search..."
          value={search}
          onChange={e=>setSearch(e.target.value)}
        />
        {showCheckboxes && totalContacts!==undefined && <span>{totalContacts} contacts</span>}
      </div>
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
                          ? selectedContacts.size === contacts.length && contacts.length > 0
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
            {isLoading ?
              <tr>
                <td colSpan={colList.length} className="text-center">Loading...</td>
              </tr> : contacts.length === 0 ?
              <tr>
                <td colSpan={colList.length} className="text-center">No contacts found.</td>
              </tr> :
              contacts.map(contact => (
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
            }
          </tbody>
        </table>
      </div>
      {paginated && contacts.length > 0 && typeof onPageChange === "function" && (
        <div className="pagination-wrapper d-flex justify-between align-center mt-20">
          <div className="pagination-info">
            Page {currentPage}
          </div>
          <div className="pagination-controls d-flex align-center gap-10">
            <button
              className="pagination-btn"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >Prev</button>
            <span>Page {currentPage}</span>
            <button
              className="pagination-btn"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={contacts.length < pageSize}
            >Next</button>
          </div>
        </div>
      )}
    </>
  );
};

export default ContactsTable;