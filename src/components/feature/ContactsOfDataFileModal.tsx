import React, { useState, useEffect } from "react";

interface DataFileItem {
  id: number;
  client_id: number;
  name: string;
  data_file_name: string;
  description: string;
  created_at: string;
  contacts: any[];
}

interface Contact {
  id: number;
  full_name: string;
  email: string;
  website?: string;
  company_name?: string;
  job_title?: string;
  linkedin_url?: string;
  country_or_address?: string;
  email_subject?: string;
  email_body?: string;
  created_at?: string;
  updated_at?: string | null;
  email_sent_at?: string | null;
}

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  width?: string;
}

interface ContactsOfDataFileModalProps {
  dataFile: DataFileItem;
  onClose: () => void;
  columns: ColumnConfig[];
  getContactValue: (contact: Contact, key: string) => any;
  formatDate: (dateString: string | undefined | null) => string;
  API_BASE_URL: string;
}
const ContactsOfDataFileModal: React.FC<ContactsOfDataFileModalProps> = ({
  dataFile,
  onClose,
  columns,
  getContactValue,
  formatDate,
  API_BASE_URL,
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    if (!dataFile) return;
    setLoading(true);
    fetch(
      `${API_BASE_URL}/api/Crm/contacts/by-client-datafile?clientId=${dataFile.client_id}&dataFileId=${dataFile.id}`
    )
      .then((r) => r.json())
      .then((res) => setContacts(res.contacts || []))
      .finally(() => setLoading(false));
  }, [dataFile, API_BASE_URL]);

  const filtered = contacts.filter((c) =>
    columns
      .filter((col) => col.key !== "checkbox" && col.visible)
      .some((col) =>
        getContactValue(c, col.key)
          ?.toString()
          .toLowerCase()
          .includes(search.toLowerCase())
      )
  );

  return (
    <div className="modal-overlay">
      <div
        className="modal"
        style={{
          minWidth: 700,
          maxHeight: "80vh",
          overflow: "auto",
          position: "relative",
        }}
      >
        <h3>
          {dataFile.name} Contacts
          <button
            onClick={onClose}
            style={{
              float: "right",
              border: "none",
              background: "none",
              fontSize: 18,
              cursor: "pointer",
            }}
            aria-label="Close"
            title="Close"
          >
            ×
          </button>
        </h3>
        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
            style={{ width: 350 }}
            placeholder="Search contacts"
          />
        </div>
        <div className="contacts-table-wrapper">
          <table className="contacts-table">
            <thead>
              <tr>
                {columns
                  .filter((col) => col.key !== "checkbox" && col.visible)
                  .map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length}>Loading...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={columns.length}>No contacts found.</td>
                </tr>
              ) : (
                filtered.map((contact) => (
                  <tr key={contact.id}>
                    {columns
                      .filter((col) => col.key !== "checkbox" && col.visible)
                      .map((column) => (
                        <td key={column.key}>
                          {column.key === "website" ||
                          column.key === "linkedin_url" ? (
                            getContactValue(contact, column.key) ? (
                              <a
                                href={getContactValue(contact, column.key)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="contact-link"
                              >
                                {column.key === "linkedin_url"
                                  ? "View Profile"
                                  : "Visit Website"}
                              </a>
                            ) : (
                              "-"
                            )
                          ) : ["created_at", "updated_at", "email_sent_at"].includes(
                              column.key
                            ) ? (
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
      </div>
    </div>
  );
};

export default ContactsOfDataFileModal;