import React, { useState, useEffect } from "react";
import DataFile from "./datafile";
import API_BASE_URL from "../../config";
import "./DataCampaigns.css";
import ContactsTable from "./ContactsTable"; 
import ContactsOfDataFileModal from "./ContactsOfDataFileModal";

const menuBtnStyle = {
  display: 'block',
  width: '100%',
  padding: '8px 18px',
  textAlign: 'left',
  background: 'none',
  border: 'none',
  color: '#222',
  fontSize: '15px',
  cursor: 'pointer'
} as React.CSSProperties;


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



 

  // Load data when client changes
  useEffect(() => {
    if (effectiveUserId) {
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


//Segment Modal States
const [showSaveSegmentModal, setShowSaveSegmentModal] = useState(false);
const [segmentName, setSegmentName] = useState("");
const [segmentDescription, setSegmentDescription] = useState("");
const [savingSegment, setSavingSegment] = useState(false);


// Find this function in your DataCampaigns.tsx and replace it
const handleSaveSegment = async () => {
  if (!segmentName) return;
  setSavingSegment(true);

  // Determine which contacts to use based on view mode
  const contactsToUse = viewMode === 'detail' 
    ? Array.from(detailSelectedContacts).map(Number)
    : Array.from(selectedContacts).map(Number);

  const dataFileToUse = viewMode === 'detail' 
    ? selectedDataFileForView?.id 
    : selectedDataFile;

  const segmentData = {
    name: segmentName,
    description: segmentDescription,
    dataFileId: Number(dataFileToUse),
    contactIds: contactsToUse
  };

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/Crm/Creat-Segments?ClientId=${effectiveUserId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(segmentData)
      }
    );

    if (!response.ok) {
      throw new Error('Failed to save segment');
    }
    
    alert('Segment saved successfully!');
    setShowSaveSegmentModal(false);
    setSegmentName("");
    setSegmentDescription("");
    
    // Clear selections after saving
    if (viewMode === 'detail') {
      setDetailSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set());
    }
    
    // Refresh segments if on segment tab
    if (activeSubTab === "Segment") {
      fetchSegments();
    }
  } catch (error) {
    alert('Failed to save segment');
  } finally {
    setSavingSegment(false);
  }
};


//segments 
const [segments, setSegments] = useState<any[]>([]);
const [selectedSegment, setSelectedSegment] = useState<string>('');
const [segmentContacts, setSegmentContacts] = useState<Contact[]>([]);
const [segmentSearchQuery, setSegmentSearchQuery] = useState('');
const [isLoadingSegments, setIsLoadingSegments] = useState(false);
const [isLoadingSegmentContacts, setIsLoadingSegmentContacts] = useState(false);
// Fetch all segments for client
const fetchSegments = async () => {
  if (!effectiveUserId) return;
  setIsLoadingSegments(true);
  try {
    const response = await fetch(`${API_BASE_URL}/api/Crm/get-segments-by-client?clientId=${effectiveUserId}`);
    if (!response.ok) throw new Error('Failed to fetch segments');
    const data = await response.json();
    setSegments(data);
  } catch (err) {
    setSegments([]);
  } finally {
    setIsLoadingSegments(false);
  }
};

// Fetch contacts for selected segment
const fetchSegmentContacts = async (segmentId: string) => {
  if (!segmentId) return;
  setIsLoadingSegmentContacts(true);
  try {
    // Use the correct endpoint!
    const response = await fetch(`${API_BASE_URL}/api/Crm/segment/${segmentId}/contacts`);
    if (!response.ok) throw new Error('Failed to fetch segment contacts');
    const data = await response.json();
    setSegmentContacts(data || []);
  } catch (err) {
    setSegmentContacts([]);
  } finally {
    setIsLoadingSegmentContacts(false);
  }
};

// Fetch segment list when tab switches or client changes
useEffect(() => {
  if (activeSubTab === "Segment") {
    fetchSegments();
    setSelectedSegment('');
    setSegmentContacts([]);
  }
}, [activeSubTab, effectiveUserId]);

// Fetch segment contacts when segment selected
useEffect(() => {
  if (selectedSegment) {
    fetchSegmentContacts(selectedSegment);
  } else {
    setSegmentContacts([]);
  }
}, [selectedSegment]);

const segmentFilteredContacts = segmentContacts.filter((contact) => {
  const searchLower = segmentSearchQuery.toLowerCase();
  return (
    contact.full_name?.toLowerCase().includes(searchLower) ||
    contact.email?.toLowerCase().includes(searchLower) ||
    contact.company_name?.toLowerCase().includes(searchLower) ||
    contact.job_title?.toLowerCase().includes(searchLower) ||
    contact.country_or_address?.toLowerCase().includes(searchLower)
  );
});

const [listSearch, setListSearch] = useState('');
const [listActionsAnchor, setListActionsAnchor] = useState<string | null>(null); // Which datafile ID's menu open
const [editingList, setEditingList] = useState<DataFileItem | null>(null);
const [renamingListName, setRenamingListName] = useState('');
const [showConfirmListDelete, setShowConfirmListDelete] = useState(false);
const [viewingListId, setViewingListId] = useState<string | null>(null); // for modal of viewing contacts

// Filter datafiles per search
const filteredDatafiles = dataFiles.filter(df =>
  df.name.toLowerCase().includes(listSearch.toLowerCase()) || 
  df.id.toString().includes(listSearch)
);

const handleDeleteList = async (file: DataFileItem) => {
  try {
    setIsLoading(true);
    const url = `${API_BASE_URL}/api/Crm/delete-contacts-and-file?clientId=${file.client_id}&dataFileId=${file.id}`;
    const response = await fetch(url, { method: "POST" });
    if (!response.ok) throw new Error("Failed to delete list/file");
    // Optionally show a toast: alert("List deleted successfully!");
    await fetchDataFiles(); // refresh the list
  } catch (err) {
    alert("Failed to delete list");
  } finally {
    setIsLoading(false);
    setEditingList(null);
    setShowConfirmListDelete(false);
  }
};


// Add view mode states
const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
const [selectedDataFileForView, setSelectedDataFileForView] = useState<DataFileItem | null>(null);
const [segmentViewMode, setSegmentViewMode] = useState<'list' | 'detail'>('list');
const [selectedSegmentForView, setSelectedSegmentForView] = useState<any>(null);

// Add detail view states
const [detailContacts, setDetailContacts] = useState<Contact[]>([]);
const [detailTotalContacts, setDetailTotalContacts] = useState(0);
const [detailCurrentPage, setDetailCurrentPage] = useState(1);
const [detailPageSize] = useState(20);
const [detailSearchQuery, setDetailSearchQuery] = useState("");
const [detailSelectedContacts, setDetailSelectedContacts] = useState<Set<string>>(new Set());
const [isLoadingDetail, setIsLoadingDetail] = useState(false);

// Add segment table states
const [editingSegment, setEditingSegment] = useState<any>(null);
const [renamingSegmentName, setRenamingSegmentName] = useState('');
const [showConfirmSegmentDelete, setShowConfirmSegmentDelete] = useState(false);
const [segmentActionsAnchor, setSegmentActionsAnchor] = useState<string | null>(null);


// Add after your other fetch functions
const fetchDetailContacts = async (type: 'list' | 'segment', item: any) => {
  if (!item?.id || !effectiveUserId) return;
  
  setIsLoadingDetail(true);
  try {
    let url = "";
    if (type === 'list') {
      url = `${API_BASE_URL}/api/Crm/contacts/by-client-datafile?clientId=${effectiveUserId}&dataFileId=${item.id}`;
    } else {
      url = `${API_BASE_URL}/api/Crm/segment/${item.id}/contacts`;
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch contacts");
    
    const data = await response.json();
    if (type === 'list') {
      setDetailContacts(data.contacts || []);
      setDetailTotalContacts(data.contactCount || 0);
    } else {
      setDetailContacts(data || []);
      setDetailTotalContacts(data.length || 0);
    }
  } catch (error) {
    console.error("Error fetching contacts:", error);
    setDetailContacts([]);
    setDetailTotalContacts(0);
  } finally {
    setIsLoadingDetail(false);
  }
};

// Add handlers for detail view
const handleDetailSelectContact = (contactId: string) => {
  const newSelection = new Set(detailSelectedContacts);
  if (newSelection.has(contactId)) {
    newSelection.delete(contactId);
  } else {
    newSelection.add(contactId);
  }
  setDetailSelectedContacts(newSelection);
};

const handleDetailSelectAll = () => {
  const currentPageContacts = detailContacts.slice(
    (detailCurrentPage - 1) * detailPageSize,
    detailCurrentPage * detailPageSize
  );
  if (detailSelectedContacts.size === currentPageContacts.length && currentPageContacts.length > 0) {
    setDetailSelectedContacts(new Set());
  } else {
    setDetailSelectedContacts(new Set(currentPageContacts.map(c => c.id.toString())));
  }
};

// Effect to fetch contacts when viewing detail
useEffect(() => {
  if (viewMode === 'detail' && selectedDataFileForView) {
    fetchDetailContacts('list', selectedDataFileForView);
  }
}, [viewMode, selectedDataFileForView?.id]);

useEffect(() => {
  if (segmentViewMode === 'detail' && selectedSegmentForView) {
    fetchDetailContacts('segment', selectedSegmentForView);
  }
}, [segmentViewMode, selectedSegmentForView?.id]);

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
    <div className="section-wrapper">
      {viewMode === 'list' ? (
        <>
          <h2 className="section-title">Lists</h2>
          
          <div style={{display: "flex", alignItems: "center", marginBottom: 16, gap: 16}}>
            <input
              type="text"
              className="search-input"
              style={{width: 340}}
              placeholder="Search a list name or ID"
              value={listSearch}
              onChange={e => setListSearch(e.target.value)}
            />
            <button 
  className="button primary" 
  style={{marginLeft: "auto"}}
  onClick={onAddContactClick}
>
  + Create a list
</button>
          </div>
          <table className="contacts-table" style={{background: "#fff"}}>
            <thead>
              <tr>
                <th>Lists</th>
                <th>ID</th>
                <th>Folder</th>
                <th>Contacts</th>
                <th>Creation date</th>
                <th>Description</th>
                <th style={{minWidth:48}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDatafiles.length === 0 && (
                <tr><td colSpan={7} style={{textAlign:"center"}}>No lists found.</td></tr>
              )}
              {filteredDatafiles.map(file => (
                <tr key={file.id}>
                  <td>
                    <span
                      className="list-link"
                      style={{ color: "#186bf3", cursor: "pointer", textDecoration: "underline" }}
                      onClick={() => {
                        setSelectedDataFileForView(file);
                        setViewMode('detail');
                        setDetailCurrentPage(1);
                        setDetailSearchQuery("");
                        setDetailSelectedContacts(new Set());
                      }}
                    >
                      {file.name}
                    </span>
                  </td>
                  <td>#{file.id}</td>
                  <td>Your First Folder</td>
                  <td>{file.contacts?.length || 0}</td>
                  <td>{file.created_at ? new Date(file.created_at).toLocaleString() : "-"}</td>
                  <td>{file.description || "-"}</td>
                  <td style={{position:"relative"}}>
                    <button 
                      className="segment-actions-btn"
                      style={{
                        border: "none",
                        background: "none",
                        fontSize: 24,
                        cursor: "pointer",
                        padding: "2px 10px"
                      }}
                      onClick={() => setListActionsAnchor(file.id.toString() === listActionsAnchor ? null : file.id.toString())}
                    >⋮</button>
                    {listActionsAnchor === file.id.toString() && (
                      <div className="segment-actions-menu" style={{
                        position:"absolute", right:0, top:32,
                        background:"#fff", border:"1px solid #eee",
                        borderRadius:6, boxShadow:"0 2px 16px rgba(0,0,0,0.12)",
                        zIndex:101, minWidth: 160
                      }}>
                        <button onClick={() => {
                          setEditingList(file);
                          setRenamingListName(file.name);
                          setListActionsAnchor(null);
                        }} style={menuBtnStyle}>✏️ Rename</button>
                        <button onClick={() => {
                          setSelectedDataFileForView(file);
                          setViewMode('detail');
                          setListActionsAnchor(null);
                          setDetailCurrentPage(1);
                          setDetailSearchQuery("");
                          setDetailSelectedContacts(new Set());
                        }} style={menuBtnStyle}>👁️ View</button>
                        <button onClick={() => {
                          setEditingList(file);
                          setShowConfirmListDelete(true);
                          setListActionsAnchor(null);
                        }} style={{...menuBtnStyle,color:"#c00"}}>🗑️ Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        // Detail view using ContactsTable
       <ContactsTable
  contacts={detailContacts}
  columns={columns}
  isLoading={isLoadingDetail}
  search={detailSearchQuery}
  setSearch={setDetailSearchQuery}
  showCheckboxes={true}
  paginated={true}
  currentPage={detailCurrentPage}
  pageSize={detailPageSize}
  onPageChange={setDetailCurrentPage}
  onSelectAll={handleDetailSelectAll}
  selectedContacts={detailSelectedContacts}
  onSelectContact={handleDetailSelectContact}
  formatDate={formatDate}
  getContactValue={getContactValue}
  totalContacts={detailTotalContacts}
  viewMode="detail"
  detailTitle={`${selectedDataFileForView?.name} (#${selectedDataFileForView?.id})`}
  detailDescription={selectedDataFileForView?.description || 'No description available'}
  onBack={() => {
    setViewMode('list');
    setSelectedDataFileForView(null);
  }}
  onAddContact={onAddContactClick}
  customHeader={
    detailSelectedContacts.size > 0 && (
      <div style={{ 
        marginBottom: 16, 
        padding: '12px 16px', 
        background: '#f0f7ff', 
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 16
      }}>
        <span style={{ fontWeight: 500 }}>
          {detailSelectedContacts.size} contact{detailSelectedContacts.size > 1 ? 's' : ''} selected
        </span>
        <button 
          className="button primary"
          onClick={() => setShowSaveSegmentModal(true)}
          style={{ marginLeft: 'auto' }}
        >
          Create Segment
        </button>
      </div>
    )
  }
/>
      )}

      {/* Rename modal */}
      {editingList && !showConfirmListDelete && (
        <div className="modal-overlay">
          <div className="modal" style={{minWidth:320}}>
            <h3>Rename List</h3>
            <input
              value={renamingListName}
              onChange={e=>setRenamingListName(e.target.value)}
              style={{width:'100%',marginBottom:12}}
              autoFocus
            />
            <div style={{display:'flex',gap:12,justifyContent:"flex-end"}}>
              <button onClick={()=>setEditingList(null)} className="button secondary">Cancel</button>
              <button className="button primary" onClick={async ()=>{
                // await renameDataFile(editingList.id, renamingListName)
                setEditingList(null); 
                fetchDataFiles();
              }} disabled={!renamingListName.trim()}>Save</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete confirmation modal */}
      {editingList && showConfirmListDelete && (
        <div className="modal-overlay">
          <div className="modal" style={{minWidth:320}}>
            <h3>Delete List</h3>
            <p>Are you sure you want to delete <b>{editingList.name}</b>?</p>
            <div style={{display:'flex',gap:12,justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowConfirmListDelete(false);setEditingList(null);}} className="button secondary">Cancel</button>
              <button
                className="button primary" 
                style={{background:'#c00',color:'#fff'}}
                onClick={() => editingList && handleDeleteList(editingList)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
)}


{activeSubTab === "Segment" && (
  <div className="segment-content">
    <div className="section-wrapper">
      {segmentViewMode === 'list' ? (
        <>
          <h2 className="section-title">Segments</h2>
          <div style={{marginBottom: 4, color: "#555"}}>
            Create and manage segments to organize your contacts for targeted campaigns.
          </div>
          <div style={{display: "flex", alignItems: "center", marginBottom: 16, gap: 16}}>
            <input
              type="text"
              className="search-input"
              style={{width: 340}}
              placeholder="Search segments..."
              value={segmentSearchQuery}
              onChange={e => setSegmentSearchQuery(e.target.value)}
            />
            <button className="button primary" style={{marginLeft: "auto"}}>+ Create Segment</button>
          </div>
          
          <table className="contacts-table" style={{background: "#fff"}}>
            <thead>
              <tr>
                <th>Segment Name</th>
                <th>Contacts</th>
                <th>Created Date</th>
                <th>Description</th>
                <th style={{minWidth:48}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingSegments ? (
                <tr><td colSpan={5} style={{textAlign:"center"}}>Loading segments...</td></tr>
              ) : segments.length === 0 ? (
                <tr><td colSpan={5} style={{textAlign:"center"}}>No segments found.</td></tr>
              ) : (
                segments
                  .filter(seg => 
                    seg.name?.toLowerCase().includes(segmentSearchQuery.toLowerCase()) ||
                    seg.description?.toLowerCase().includes(segmentSearchQuery.toLowerCase())
                  )
                  .map(segment => (
                    <tr key={segment.id}>
                      <td>
                        <span
                          className="list-link"
                          style={{ color: "#186bf3", cursor: "pointer", textDecoration: "underline" }}
                          onClick={() => {
                            setSelectedSegmentForView(segment);
                            setSegmentViewMode('detail');
                            setDetailCurrentPage(1);
                            setDetailSearchQuery("");
                            setDetailSelectedContacts(new Set());
                          }}
                        >
                          {segment.name}
                        </span>
                      </td>
                      <td>{segment.contactCount || segment.contacts?.length || 0}</td>
                      <td>{segment.createdAt ? new Date(segment.createdAt).toLocaleDateString() : "-"}</td>
                      <td>{segment.description || "-"}</td>
                      <td style={{position:"relative"}}>
                        <button 
                          className="segment-actions-btn"
                          style={{
                            border: "none",
                            background: "none",
                            fontSize: 24,
                            cursor: "pointer",
                            padding: "2px 10px"
                          }}
                          onClick={() => setSegmentActionsAnchor(segment.id.toString() === segmentActionsAnchor ? null : segment.id.toString())}
                        >⋮</button>
                        {segmentActionsAnchor === segment.id.toString() && (
                          <div className="segment-actions-menu" style={{
                            position:"absolute", right:0, top:32,
                            background:"#fff", border:"1px solid #eee",
                            borderRadius:6, boxShadow:"0 2px 16px rgba(0,0,0,0.12)",
                            zIndex:101, minWidth: 160
                          }}>
                            <button onClick={() => {
                              setSelectedSegmentForView(segment);
                              setSegmentViewMode('detail');
                              setSegmentActionsAnchor(null);
                              setDetailCurrentPage(1);
                              setDetailSearchQuery("");
                              setDetailSelectedContacts(new Set());
                            }} style={menuBtnStyle}>👁️ View</button>
                            <button style={{...menuBtnStyle,color:"#c00"}}>🗑️ Delete</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </>
      ) : (
        // Detail view for segments
        <ContactsTable
          contacts={detailContacts}
          columns={columns}
          isLoading={isLoadingDetail}
          search={detailSearchQuery}
          setSearch={setDetailSearchQuery}
          showCheckboxes={true}
          paginated={true}
          currentPage={detailCurrentPage}
          pageSize={detailPageSize}
          onPageChange={setDetailCurrentPage}
          onSelectAll={handleDetailSelectAll}
          selectedContacts={detailSelectedContacts}
          onSelectContact={handleDetailSelectContact}
          formatDate={formatDate}
          getContactValue={getContactValue}
          totalContacts={detailTotalContacts}
          viewMode="detail"
          detailTitle={selectedSegmentForView?.name}
          detailDescription={selectedSegmentForView?.description || 'No description available'}
          onBack={() => {
            setSegmentViewMode('list');
            setSelectedSegmentForView(null);
          }}
          onAddContact={onAddContactClick}
        />
      )}
    </div>
  </div>
)}

       {showSaveSegmentModal && (
  <div style={{
    position: "fixed",
    zIndex: 99999,
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  }}>
    <div style={{
      background: "#fff",
      padding: 40,
      borderRadius: 12,
      minWidth: 340,
      boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
    }}>
      <h2 style={{marginTop: 0}}>Save as Segment</h2>
      <p style={{marginBottom: 16, color: '#666'}}>
        Creating segment with {viewMode === 'detail' ? detailSelectedContacts.size : selectedContacts.size} selected contact{(viewMode === 'detail' ? detailSelectedContacts.size : selectedContacts.size) > 1 ? 's' : ''}
      </p>
      <input
        type="text"
        placeholder="Segment Name"
        value={segmentName}
        onChange={e => setSegmentName(e.target.value)}
        autoFocus
        style={{width: "100%", marginBottom: 10}}
      />
      <textarea
        placeholder="Description (optional)"
        value={segmentDescription}
        onChange={e => setSegmentDescription(e.target.value)}
        style={{marginTop: 10, width: "100%", minHeight: 80}}
        rows={3}
      />
      <div style={{marginTop: 18, display:'flex', gap:8, justifyContent:'flex-end'}}>
        <button onClick={() => setShowSaveSegmentModal(false)} className="button secondary">
          Cancel
        </button>
        <button onClick={handleSaveSegment} className="button primary" disabled={!segmentName || savingSegment}>
          {savingSegment ? "Saving..." : "Save Segment"}
        </button>
      </div>
    </div>
  </div>
)}
  </div>
  );
};

export default DataCampaigns;
