import React, { useState, useEffect } from "react";
import DataFile from "./datafile";
import API_BASE_URL from "../../config";
import "./DataCampaigns.css";

interface DataCampaignsProps {
  selectedClient: string;
  onDataProcessed: (data: any) => void;
  isProcessing: boolean;
  userRole?: string;
  initialTab?: string;
  onTabChange?: (tab: string) => void;
  onAddContactClick?: () => void; // Add this line
}

interface ZohoClient {
  id: string;
  zohoviewId: string;
  zohoviewName: string;
  TotalContact?: string;
}

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

const getContactValue = (contact: Contact, key: string): any => {
  return (contact as any)[key];
};

interface ContactsResponse {
  contactCount: number;
  contacts: Contact[];
}

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  width?: string;
}

const DataCampaigns: React.FC<DataCampaignsProps> = ({
  selectedClient,
  onDataProcessed,
  isProcessing,
  initialTab = "List",
  onTabChange,
  userRole,
  onAddContactClick, // Add this
}) => {
  const [activeSubTab, setActiveSubTab] = useState(initialTab);

  const userId = sessionStorage.getItem("clientId");
  const effectiveUserId = selectedClient !== "" ? selectedClient : userId;
  // Data file states
  const [dataFiles, setDataFiles] = useState<DataFileItem[]>([]);
  const [selectedDataFile, setSelectedDataFile] = useState<string>("");

  // Contact list states
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [totalContacts, setTotalContacts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(
    new Set()
  );
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);

  // Column configuration - excluding email_subject and email_body
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: "checkbox", label: "", visible: true, width: "40px" },
    { key: "full_name", label: "Full Name", visible: true },
    { key: "email", label: "Email Address", visible: true },
    { key: "company_name", label: "Company Name", visible: true },
    { key: "job_title", label: "Job Title", visible: true },
    { key: "website", label: "Website", visible: false },
    { key: "linkedin_url", label: "LinkedIn Profile", visible: false },
    { key: "country_or_address", label: "Location", visible: true },
    { key: "created_at", label: "Created Date", visible: false },
    { key: "updated_at", label: "Last Updated", visible: false },
    { key: "email_sent_at", label: "Email Sent Date", visible: false },
  ]);

  // Existing states
  const [zohoClient, setZohoClient] = useState<ZohoClient[]>([]);
  const [selectedZohoViewForDeletion, setSelectedZohoViewForDeletion] =
    useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  const handleTabChange = (tab: string) => {
    setActiveSubTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // Fetch data files
  const fetchDataFiles = async () => {
    if (!effectiveUserId) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/datafile-byclientid?clientId=${effectiveUserId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch data files");
      }

      const data: DataFileItem[] = await response.json();
      setDataFiles(data);
    } catch (error) {
      console.error("Error fetching data files:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch contacts data
  const fetchContacts = async () => {
    if (!effectiveUserId || !selectedDataFile) return;

    setIsLoadingContacts(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/contacts/by-client-datafile?clientId=${effectiveUserId}&dataFileId=${selectedDataFile}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch contacts");
      }

      const data: ContactsResponse = await response.json();
      setContacts(data.contacts || []);
      setTotalContacts(data.contactCount || 0);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      setContacts([]);
      setTotalContacts(0);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  // Handle data file change
  const handleDataFileChange = (dataFileId: string) => {
    setSelectedDataFile(dataFileId);
    setCurrentPage(1);
    setSelectedContacts(new Set());
  };

  // Filter contacts based on search query
  const filteredContacts = contacts.filter((contact) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      contact.full_name?.toLowerCase().includes(searchLower) ||
      contact.email?.toLowerCase().includes(searchLower) ||
      contact.company_name?.toLowerCase().includes(searchLower) ||
      contact.job_title?.toLowerCase().includes(searchLower) ||
      contact.country_or_address?.toLowerCase().includes(searchLower)
    );
  });

  // Paginate filtered contacts
  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Handle contact selection
  const handleSelectContact = (contactId: string) => {
    const newSelection = new Set(selectedContacts);
    if (newSelection.has(contactId)) {
      newSelection.delete(contactId);
    } else {
      newSelection.add(contactId);
    }
    setSelectedContacts(newSelection);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (
      selectedContacts.size === paginatedContacts.length &&
      paginatedContacts.length > 0
    ) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(
        new Set(paginatedContacts.map((c) => c.id.toString()))
      );
    }
  };

  // Toggle column visibility
  const toggleColumnVisibility = (columnKey: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.key === columnKey ? { ...col, visible: !col.visible } : col
      )
    );
  };

  // Format date
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  };

  // Calculate pagination
  const totalPages = Math.ceil(filteredContacts.length / pageSize);
  const startIndex =
    filteredContacts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, filteredContacts.length);

  // Existing fetch functions
  const fetchZohoClient = async () => {
    if (!effectiveUserId) {
      console.log("No client selected, skipping fetch");
      return;
    }

    setIsLoading(true);
    try {
      const url = `${API_BASE_URL}/api/auth/zohoclientid/${effectiveUserId}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: ZohoClient[] = await response.json();
      setZohoClient(data);
    } catch (error) {
      console.error("Error fetching zoho client id:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteZohoView = async (zohoviewId: string, clientId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/deletezohoview/${zohoviewId}/${clientId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete Zoho view");
      }

      alert("Zoho view deleted successfully");
      await fetchZohoClient();
    } catch (error) {
      console.error("Error deleting Zoho view:", error);
      alert("Failed to delete Zoho view");
    } finally {
      setIsLoading(false);
    }
  };

  // Load data when client changes
  useEffect(() => {
    if (effectiveUserId) {
      fetchZohoClient();
      fetchDataFiles();
    }
  }, [effectiveUserId]);

  // Fetch contacts when data file changes
  useEffect(() => {
    if (selectedDataFile && effectiveUserId) {
      fetchContacts();
    }
  }, [selectedDataFile, effectiveUserId]);

  useEffect(() => {
    setActiveSubTab(initialTab);
  }, [initialTab]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="data-campaigns-container">
      {/* Sub-tabs Navigation */}
      <div className="tabs secondary mb-20">
        <ul className="d-flex">
          <li>
            <button
              type="button"
              onClick={() => handleTabChange("List")}
              className={`button ${activeSubTab === "List" ? "active" : ""}`}
            >
              List
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => handleTabChange("Segment")}
              className={`button ${activeSubTab === "Segment" ? "active" : ""}`}
            >
              Segment
            </button>
          </li>
        </ul>
      </div>

      {/* Tab Content */}
      {activeSubTab === "List" && (
        <div className="list-content">
          {/* Contact List Section */}
          <div className="section-wrapper mb-20">
            <div className="contacts-header d-flex justify-between align-center mb-20">
              <div className="header-left d-flex align-center gap-20">
                <h2 className="section-title mb-0">{totalContacts} contacts</h2>
                {/* Data File Dropdown */}
                <div className="data-file-selector">
                  <select
                    value={selectedDataFile}
                    onChange={(e) => handleDataFileChange(e.target.value)}
                    className="data-file-dropdown"
                    disabled={isLoading}
                  >
                    <option value="">Select a data file</option>
                    {dataFiles.map((file) => (
                      <option key={file.id} value={file.id.toString()}>
                        {file.name} ({file.data_file_name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="contacts-actions d-flex align-center gap-10">
                <button
                  className="button secondary"
                  onClick={() => setShowColumnSettings(!showColumnSettings)}
                >
                  <span className="d-flex align-center">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="mr-5"
                    >
                      <path
                        d="M12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M20.5 12C20.5 10.067 18.933 8.5 17 8.5M3.5 12C3.5 10.067 5.067 8.5 7 8.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    Customize columns
                  </span>
                </button>
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Search by name, email, company, job title or location"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                    style={{ width: "400px" }}
                  />
                </div>
                <button
                  className="button primary"
                  onClick={() => {
                    if (onAddContactClick) {
                      onAddContactClick();
                    }
                  }}
                >
                  Add Contact
                </button>
              </div>
            </div>

            {/* Column Settings Dropdown */}
            {showColumnSettings && (
              <div className="column-settings-dropdown">
                <div className="dropdown-header">
                  <h4>Customize Columns</h4>
                  <button onClick={() => setShowColumnSettings(false)}>
                    ×
                  </button>
                </div>
                <div className="column-list">
                  {columns
                    .filter((col) => col.key !== "checkbox")
                    .map((column) => (
                      <label key={column.key} className="column-item">
                        <input
                          type="checkbox"
                          checked={column.visible}
                          onChange={() => toggleColumnVisibility(column.key)}
                        />
                        {column.label}
                      </label>
                    ))}
                </div>
              </div>
            )}

            {/* Contacts Table */}
            <div className="contacts-table-wrapper">
              <table className="contacts-table">
                <thead>
                  <tr>
                    {columns
                      .filter((col) => col.visible)
                      .map((column) => (
                        <th key={column.key} style={{ width: column.width }}>
                          {column.key === "checkbox" ? (
                            <input
                              type="checkbox"
                              checked={
                                selectedContacts.size ===
                                  paginatedContacts.length &&
                                paginatedContacts.length > 0
                              }
                              onChange={handleSelectAll}
                            />
                          ) : (
                            column.label
                          )}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoadingContacts ? (
                    <tr>
                      <td
                        colSpan={columns.filter((col) => col.visible).length}
                        className="text-center"
                      >
                        Loading contacts...
                      </td>
                    </tr>
                  ) : !selectedDataFile ? (
                    <tr>
                      <td
                        colSpan={columns.filter((col) => col.visible).length}
                        className="text-center"
                      >
                        Please select a data file to view contacts
                      </td>
                    </tr>
                  ) : paginatedContacts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={columns.filter((col) => col.visible).length}
                        className="text-center"
                      >
                        {searchQuery
                          ? "No contacts found matching your search"
                          : "No contacts found in this data file"}
                      </td>
                    </tr>
                  ) : (
                    paginatedContacts.map((contact) => (
                      <tr
                        key={contact.id}
                        className={
                          selectedContacts.has(contact.id.toString())
                            ? "selected"
                            : ""
                        }
                      >
                        {columns
                          .filter((col) => col.visible)
                          .map((column) => (
                            <td key={column.key}>
                              {column.key === "checkbox" ? (
                                <input
                                  type="checkbox"
                                  checked={selectedContacts.has(
                                    contact.id.toString()
                                  )}
                                  onChange={() =>
                                    handleSelectContact(contact.id.toString())
                                  }
                                />
                              ) : column.key === "website" ||
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
                              ) : column.key === "created_at" ||
                                column.key === "updated_at" ||
                                column.key === "email_sent_at" ? (
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
            {paginatedContacts.length > 0 && (
              <div className="pagination-wrapper d-flex justify-between align-center mt-20">
                <div className="pagination-info">
                  Showing {startIndex} to {endIndex} of{" "}
                  {filteredContacts.length} contacts
                  {searchQuery && ` (filtered from ${totalContacts} total)`}
                </div>
                <div className="pagination-controls d-flex align-center gap-10">
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="page-size-select"
                  >
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                  </select>
                  <button
                    className="pagination-btn"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <span className="page-numbers">
                    Page {currentPage} of {totalPages || 1}
                  </span>
                  <button
                    className="pagination-btn"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages || totalPages === 0}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === "Segment" && (
        <div className="segment-content">
          <div className="section-wrapper">
            <h2 className="section-title">Contact Segments</h2>
            <div className="login-box gap-down d-flex">
              <div className="input-section edit-section">
                <div className="row">
                  <div className="col-12">
                    <div className="form-group">
                      <p>Segment management functionality coming soon...</p>
                      {/* You can add segment creation, filtering, and management features here */}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataCampaigns;
