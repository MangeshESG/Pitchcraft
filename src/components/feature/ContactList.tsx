import React, { useState, useEffect,useMemo } from "react";
import API_BASE_URL from "../../config";
import "./ContactList.css";
import DynamicContactsTable from "./DynamicContactsTable";
import AppModal from "../common/AppModal";
import AddContactModal from "./AddContactModal";
import CreateListModal from "./CreateListModal";

import { useAppModal } from "../../hooks/useAppModal";
import { useSelector } from "react-redux";
import { RootState } from "../../Redux/store";
import PaginationControls from "./PaginationControls";

// Persistent column selection utilities
const CONTACTLIST_COLUMNS_KEY = 'contactlist_selected_columns';

const saveSelectedColumns = (columns: string[]) => {
  try {
    localStorage.setItem(CONTACTLIST_COLUMNS_KEY, JSON.stringify(columns));
  } catch (error) {
    console.warn('Failed to save column selection:', error);
  }
};

const loadSelectedColumns = (): string[] => {
  try {
    const saved = localStorage.getItem(CONTACTLIST_COLUMNS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.warn('Failed to load column selection:', error);
    return [];
  }
};

const getDefaultVisibleColumns = (): string[] => {
  return [
    'full_name',
    'email', 
    'company_name',
    'job_title',
    'country_or_address'
  ];
};

const menuBtnStyle = {
  width: "100%",
  padding: "8px 18px",
  textAlign: "left",
  background: "none",
  border: "none",
  color: "#222",
  fontSize: "15px",
  cursor: "pointer",
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
  contactCount?: number;
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
  companyTelephone?: string;
  companyEmployeeCount?: string;
  companyIndustry?: string;
  companyLinkedInURL?: string;
  companyEventLink?: string;
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

  const reduxUserId = useSelector((state: RootState) => state.auth.userId);
  const effectiveUserId = selectedClient !== "" ? selectedClient : reduxUserId;
  console.log("API Payload Client ID:", effectiveUserId);

  useEffect(() => {
    console.log("User ID from Redux:", reduxUserId);
    console.log("Effective User ID:", effectiveUserId);
  }, [reduxUserId, effectiveUserId]);
  // const userId = sessionStorage.getItem("clientId");
  // const effectiveUserId = selectedClient !== "" ? selectedClient : userId;m
  // Data file states
  const [dataFiles, setDataFiles] = useState<DataFileItem[]>([]);
  const [selectedDataFile, setSelectedDataFile] = useState<string>("");

  // Contact list states
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [totalContacts, setTotalContacts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageLists, setCurrentPageLists] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(
    new Set()
  );
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [showCreateListOptions, setShowCreateListOptions] = useState(false);

  const isDemoAccount = sessionStorage.getItem("isDemoAccount") === "true";


  // Persistent column selection state
  const [savedColumnSelection, setSavedColumnSelection] = useState<string[]>(() => {
    const saved = loadSelectedColumns();
    return saved.length > 0 ? saved : getDefaultVisibleColumns();
  });

  // Column configuration - excluding email_subject and email_body
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: "checkbox", label: "", visible: true, width: "40px" },
    { key: "full_name", label: "Full name", visible: true },
    { key: "email", label: "Email address", visible: true },
    { key: "company_name", label: "Company name", visible: true },
    { key: "job_title", label: "Job title", visible: true },
    { key: "website", label: "Website", visible: false },
    { key: "linkedin_url", label: "LinkedIn profile", visible: false },
    { key: "country_or_address", label: "Location", visible: true },
    { key: "created_at", label: "Created date", visible: false },
    { key: "updated_at", label: "Last updated", visible: false },
    { key: "email_sent_at", label: "Email Sent Date", visible: false },
  ]);

  const appModal = useAppModal();
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
  // Replace the existing formatDate function with this:
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "-";

    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) return "-";

    // Format as "DD MMM YYYY" (e.g., "21 May 2025")
    const options: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "short",
      year: "numeric",
    };

    return date.toLocaleDateString("en-GB", options);
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
    setSelectedContacts((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(contactId)) {
        newSelection.delete(contactId);
      } else {
        newSelection.add(contactId);
      }
      return newSelection;
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    const currentPageContacts = paginatedContacts.map((c) => c.id.toString());

    setSelectedContacts((prev) => {
      if (
        prev.size === currentPageContacts.length &&
        currentPageContacts.length > 0
      ) {
        return new Set();
      } else {
        return new Set(currentPageContacts);
      }
    });
  };

  // Apply saved column selection to current columns
  const applyColumnSelection = (currentColumns: ColumnConfig[], savedSelection: string[]) => {
    return currentColumns.map(col => {
      if (col.key === 'checkbox') return col;
      
      // If no saved selection, use default visibility
      if (savedSelection.length === 0) {
        return { ...col, visible: getDefaultVisibleColumns().includes(col.key) };
      }
      
      // Apply saved selection, defaulting to false for columns not in selection
      return { ...col, visible: savedSelection.includes(col.key) };
    });
  };

  // Toggle column visibility with persistence
  const toggleColumnVisibility = (columnKey: string) => {
    setColumns((prev) => {
      const updated = prev.map((col) =>
        col.key === columnKey ? { ...col, visible: !col.visible } : col
      );
      
      // Save the new selection to localStorage
      const visibleColumns = updated
        .filter(col => col.visible && col.key !== 'checkbox')
        .map(col => col.key);
      
      setSavedColumnSelection(visibleColumns);
      saveSelectedColumns(visibleColumns);
      
      return updated;
    });
  };

  // Calculate pagination
  const totalPages = Math.ceil(filteredContacts.length / pageSize);
 // const startIndex =
   // filteredContacts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
   const startIndex = (currentPage - 1) * pageSize;  
  const endIndex = Math.min(currentPage * pageSize, filteredContacts.length)
  // const endIndex = startIndex + pageSize;
  //const currentData = filteredContacts.slice(startIndex, endIndex);

  // Apply saved column selection when columns change
  useEffect(() => {
    setColumns(prev => applyColumnSelection(prev, savedColumnSelection));
  }, [savedColumnSelection]);

  // Load data when client changes
  useEffect(() => {
    if (effectiveUserId) {
      fetchDataFiles();
    }
  }, [effectiveUserId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowCreateListOptions(false);
    if (showCreateListOptions) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showCreateListOptions]);

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

  // Delete contacts from Lists
  const handleDeleteListContacts = async () => {
    const contactsToDelete = viewMode === "detail"
      ? Array.from(detailSelectedContacts)
      : Array.from(selectedContacts);

    if (contactsToDelete.length === 0) return;

    try {
      setIsLoading(true);
      
      for (const contactId of contactsToDelete) {
        const response = await fetch(
          `${API_BASE_URL}/api/Crm/delete-Datafile-contact?contactId=${contactId}`,
          {
            method: "POST",
            headers: {
              "accept": "*/*",
            },
          }
        );
        
        if (!response.ok) {
          throw new Error(`Failed to delete contact ${contactId}`);
        }
      }

      appModal.showSuccess(`${contactsToDelete.length} contact(s) deleted successfully!`);
      
      if (viewMode === "detail") {
        setDetailSelectedContacts(new Set());
        if (selectedDataFileForView) {
          fetchDetailContacts("list", selectedDataFileForView);
        }
      } else {
        setSelectedContacts(new Set());
        if (selectedDataFile) {
          fetchContacts();
        }
      }
      
    } catch (error) {
      console.error("Error deleting contacts:", error);
      appModal.showError("Failed to delete contacts");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete contacts from Segments
  const handleDeleteSegmentContacts = async () => {
    const contactsToDelete = segmentViewMode === "detail"
      ? Array.from(detailSelectedContacts)
      : Array.from(selectedContacts);

    if (contactsToDelete.length === 0) return;

    try {
      setIsLoading(true);
      
      for (const contactId of contactsToDelete) {
        const response = await fetch(
          `${API_BASE_URL}/api/Crm/delete-by-segment?contactId=${contactId}`,
          {
            method: "POST",
            headers: {
              "accept": "*/*",
            },
          }
        );
        
        if (!response.ok) {
          throw new Error(`Failed to delete contact ${contactId}`);
        }
      }

      appModal.showSuccess(`${contactsToDelete.length} contact(s) deleted successfully!`);
      
      if (segmentViewMode === "detail") {
        setDetailSelectedContacts(new Set());
        if (selectedSegmentForView) {
          fetchDetailContacts("segment", selectedSegmentForView);
        }
      } else {
        setSelectedContacts(new Set());
        fetchSegments();
      }
      
    } catch (error) {
      console.error("Error deleting contacts:", error);
      appModal.showError("Failed to delete contacts");
    } finally {
      setIsLoading(false);
    }
  };

  // Find this function in your DataCampaigns.tsx and replace it
  const handleSaveSegment = async () => {
    if (!segmentName) return;
    setSavingSegment(true);

    // Determine which contacts to use based on view mode
    const contactsToUse =
      viewMode === "detail"
        ? Array.from(detailSelectedContacts).map(Number)
        : segmentViewMode === "detail"
        ? Array.from(detailSelectedContacts).map(Number)
        : Array.from(selectedContacts).map(Number);

    const dataFileToUse =
      viewMode === "detail" 
        ? selectedDataFileForView?.id 
        : segmentViewMode === "detail"
        ? selectedSegmentForView?.dataFileId
        : selectedDataFile;

    const segmentData = {
      name: segmentName,
      description: segmentDescription,
      dataFileId: Number(dataFileToUse),
      contactIds: contactsToUse,
    };

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/Creat-Segments?ClientId=${effectiveUserId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(segmentData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save segment");
      }

      appModal.showSuccess("Segment saved successfully!");
      setShowSaveSegmentModal(false);
      setSegmentName("");
      setSegmentDescription("");

      // Clear selections after saving
      if (viewMode === "detail" || segmentViewMode === "detail") {
        setDetailSelectedContacts(new Set());
      } else {
        setSelectedContacts(new Set());
      }

      // Refresh segments if on segment tab
      if (activeSubTab === "Segment") {
        fetchSegments();
      }
    } catch (error) {
      appModal.showError("Failed to save segment");
    } finally {
      setSavingSegment(false);
    }
  };

  // Segment interface
  interface Segment {
    id: number;
    name: string;
    description?: string;
    dataFileId: number;
    clientId: number;
    createdAt: string;
    updatedAt?: string;
    contactCount?: number;
    contacts?: any[];
  }

  //segments
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<string>("");
  const [segmentCurrentPage, setSegmentCurrentPage] = useState(1)
  const [segmentContacts, setSegmentContacts] = useState<Contact[]>([]);
  const [segmentSearchQuery, setSegmentSearchQuery] = useState("");
  const [isLoadingSegments, setIsLoadingSegments] = useState(false);
  const [isLoadingSegmentContacts, setIsLoadingSegmentContacts] =
    useState(false);
  // Fetch all segments for client
  const fetchSegments = async () => {
    if (!effectiveUserId) return;
    setIsLoadingSegments(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/get-segments-by-client?clientId=${effectiveUserId}`
      );
      if (!response.ok) throw new Error("Failed to fetch segments");
      const data = await response.json();
      setSegments(data);
      setSegmentCurrentPage(1)
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
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/segment/${segmentId}/contacts`
      );
      if (!response.ok) throw new Error("Failed to fetch segment contacts");
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
      setSelectedSegment("");
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

  const [listSearch, setListSearch] = useState("");
  const [listActionsAnchor, setListActionsAnchor] = useState<string | null>(
    null
  ); // Which datafile ID's menu open
  const [editingList, setEditingList] = useState<DataFileItem | null>(null);
  const [renamingListName, setRenamingListName] = useState("");
  const [showConfirmListDelete, setShowConfirmListDelete] = useState(false);
  const [viewingListId, setViewingListId] = useState<string | null>(null); // for modal of viewing contacts

  // Filter datafiles per search
  const filteredDatafiles = dataFiles.filter(
    (df) =>
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
      appModal.showError("Failed to delete list");
    } finally {
      setIsLoading(false);
      setEditingList(null);
      setShowConfirmListDelete(false);
    }
  };

  // Add view mode states
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const [selectedDataFileForView, setSelectedDataFileForView] =
    useState<DataFileItem | null>(null);
  const [segmentViewMode, setSegmentViewMode] = useState<"list" | "detail">(
    "list"
  );
  const [selectedSegmentForView, setSelectedSegmentForView] =
    useState<any>(null);

  // Add detail view states
  const [detailContacts, setDetailContacts] = useState<Contact[]>([]);
  const [detailTotalContacts, setDetailTotalContacts] = useState(0);
  const [detailCurrentPage, setDetailCurrentPage] = useState(1);
  const [detailPageSize] = useState(10);
  const [detailSearchQuery, setDetailSearchQuery] = useState("");
  const [detailSelectedContacts, setDetailSelectedContacts] = useState<
    Set<string>
  >(new Set());
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Add segment table states
  const [editingSegment, setEditingSegment] = useState<any>(null);
  const [renamingSegmentName, setRenamingSegmentName] = useState("");
  const [showConfirmSegmentDelete, setShowConfirmSegmentDelete] =
    useState(false);
  const [segmentActionsAnchor, setSegmentActionsAnchor] = useState<
    string | null
  >(null);

  // Add after your other fetch functions
  const fetchDetailContacts = async (type: "list" | "segment", item: any) => {
    if (!item?.id || !effectiveUserId) return;

    setIsLoadingDetail(true);
    try {
      let url = "";
      if (type === "list") {
        url = `${API_BASE_URL}/api/Crm/contacts/by-client-datafile?clientId=${effectiveUserId}&dataFileId=${item.id}`;
      } else {
        url = `${API_BASE_URL}/api/Crm/segment/${item.id}/contacts`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch contacts");

      const data = await response.json();
      if (type === "list") {
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
    setDetailSelectedContacts((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(contactId)) {
        newSelection.delete(contactId);
      } else {
        newSelection.add(contactId);
      }
      return newSelection;
    });
  };

  const handleDetailSelectAll = () => {
    const currentPageContacts = detailContacts
      .slice(
        (detailCurrentPage - 1) * detailPageSize,
        detailCurrentPage * detailPageSize
      )
      .map((c) => c.id.toString());

    setDetailSelectedContacts((prev) => {
      if (
        prev.size === currentPageContacts.length &&
        currentPageContacts.length > 0
      ) {
        return new Set();
      } else {
        return new Set(currentPageContacts);
      }
    });
  };
  // Effect to fetch contacts when viewing detail
  useEffect(() => {
    if (viewMode === "detail" && selectedDataFileForView) {
      fetchDetailContacts("list", selectedDataFileForView);
    }
  }, [viewMode, selectedDataFileForView?.id]);

  useEffect(() => {
    if (segmentViewMode === "detail" && selectedSegmentForView) {
      fetchDetailContacts("segment", selectedSegmentForView);
    }
  }, [segmentViewMode, selectedSegmentForView?.id]);

  const [renamingListDescription, setRenamingListDescription] = useState("");

  // Add this function at the top of your component or in a separate API file
  const renameDataFile = async (
    id: number,
    newName: string,
    description: string,
    dataFileName: string = ""
  ): Promise<string> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/update-datafile?id=${id}&name=${encodeURIComponent(
          newName
        )}&description=${encodeURIComponent(
          description
        )}&dataFileName=${encodeURIComponent(dataFileName)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(
          `Failed to rename list: ${response.status} ${response.statusText}`
        );
      }

      // Always parse as text since API returns plain text
      const result = await response.text();
      return result;
    } catch (error) {
      console.error("Error renaming list:", error);
      throw error;
    }
  };

  // Add this state at the top with your other states
  const [isRenamingList, setIsRenamingList] = useState(false);

  // Add this function
  const handleRenameList = async () => {
    if (
      !editingList ||
      !renamingListName.trim() ||
      !renamingListDescription.trim()
    )
      return;

    setIsRenamingList(true);
    try {
      await renameDataFile(
        editingList.id,
        renamingListName.trim(),
        renamingListDescription.trim(), // Use the description from the form
        editingList.data_file_name || ""
      );

      // Update the list in local state
      setDataFiles((prev) =>
        prev.map((file) =>
          file.id === editingList.id
            ? {
              ...file,
              name: renamingListName.trim(),
              description: renamingListDescription.trim(),
            }
            : file
        )
      );

      // Close modal and reset states
      setEditingList(null);
      setRenamingListName("");
      setRenamingListDescription("");

      // Show success message
      appModal.showSuccess("List renamed successfully!");
    } catch (error) {
      console.error("Failed to rename list:", error);
      appModal.showError("Failed to rename list. Please try again.");
    } finally {
      setIsRenamingList(false);
    }
  };

  // Add these segment-specific states
  const [renamingSegmentDescription, setRenamingSegmentDescription] =
    useState("");
  const [isRenamingSegment, setIsRenamingSegment] = useState(false);

  // Add these API functions
  const renameSegment = async (
    id: number,
    newName: string,
    description: string
  ): Promise<string> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/update-segment?id=${id}&name=${encodeURIComponent(
          newName
        )}&description=${encodeURIComponent(description)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(
          `Failed to rename segment: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.text();
      return result;
    } catch (error) {
      console.error("Error renaming segment:", error);
      throw error;
    }
  };

  const deleteSegment = async (segmentId: number): Promise<string> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/delete-segment?segmentId=${segmentId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(
          `Failed to delete segment: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.text();
      return result;
    } catch (error) {
      console.error("Error deleting segment:", error);
      throw error;
    }
  };

  // Add these handler functions
  const handleRenameSegment = async () => {
    if (
      !editingSegment ||
      !renamingSegmentName.trim()
    )
      return;

    setIsRenamingSegment(true);
    try {
      await renameSegment(
        editingSegment.id,
        renamingSegmentName.trim(),
        renamingSegmentDescription.trim()
      );

      // Update the segment in local state
      setSegments((prev) =>
        prev.map((segment) =>
          segment.id === editingSegment.id
            ? {
              ...segment,
              name: renamingSegmentName.trim(),
              description: renamingSegmentDescription.trim(),
            }
            : segment
        )
      );

      // Close modal and reset states
      setEditingSegment(null);
      setRenamingSegmentName("");
      setRenamingSegmentDescription("");

      // Show success message
      appModal.showSuccess("Segment renamed successfully!");
    } catch (error) {
      console.error("Failed to rename segment:", error);
      appModal.showError("Failed to rename segment. Please try again.");
    } finally {
      setIsRenamingSegment(false);
    }
  };

  const handleDeleteSegment = async (segment: any) => {
    try {
      setIsLoadingSegments(true);
      await deleteSegment(segment.id);

      // Remove segment from local state
      setSegments((prev) => prev.filter((s) => s.id !== segment.id));

      appModal.showSuccess("Segment deleted successfully!");
    } catch (error) {
      console.error("Failed to delete segment:", error);
      appModal.showError("Failed to delete segment. Please try again.");
    } finally {
      setIsLoadingSegments(false);
      setEditingSegment(null);
      setShowConfirmSegmentDelete(false);
    }
  };

  // Helper function to convert data to CSV
  // Helper function to convert data to CSV
  const downloadCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      appModal.showWarning("No data to export");
      return;
    }
    // Define all possible columns
    const allColumns = [
      { key: "full_name", header: "Full Name" },
      { key: "email", header: "Email" },
      { key: "website", header: "Website" },
      { key: "company_name", header: "Company name" },
      { key: "job_title", header: "Job title" },
      { key: "linkedin_url", header: "LinkedIn URL" },
      { key: "country_or_address", header: "Country Or Address" },
      { key: "companyTelephone", header: "Company telephone" },
      { key: "companyEmployeeCount", header: "Company Employee Count" },
      { key: "companyIndustry", header: "Company industry" },
      { key: "companyLinkedInURL", header: "Company LinkedIn URL" },
      { key: "companyEventLink", header: "Company Event Link" },
      { key: "created_at", header: "Created date" },
      { key: "updated_at", header: "Updated date" },
      { key: "email_sent_at", header: "Email Sent Date" },
    ];


    // Check which columns have data
    const columnsWithData = allColumns.filter((column) => {
      return data.some((contact) => {
        const value = contact[column.key];
        // Check if value exists and is not empty
        return (
          value !== null &&
          value !== undefined &&
          value !== "" &&
          value !== "NA" && // Exclude 'NA' values
          value !== "-"
        ); // Exclude '-' values
      });
    });

    // If no columns have data, alert and return
    if (columnsWithData.length === 0) {
      alert("No data to export");
      return;
    }

    // Create header row with only columns that have data
    const headers = columnsWithData.map((col) => col.header);

    // Map the data to CSV rows
    const csvRows = [
      headers.join(","), // Header row
      ...data.map((contact) => {
        const row = columnsWithData.map((column) => {
          let value = contact[column.key] || "";

          // Format dates if it's a date column
          if (
            (column.key === "created_at" ||
              column.key === "updated_at" ||
              column.key === "email_sent_at") &&
            value
          ) {
            value = formatDate(value);
          }

          // Convert to string
          const stringValue = String(value);

          // Escape values that contain commas, quotes, or newlines
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

    // Create CSV content with BOM for Excel compatibility
    const BOM = "\uFEFF";
    const csvContent = BOM + csvRows.join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    URL.revokeObjectURL(url);
  };
  // Add these functions after your existing handler functions

  // Download list data
  const handleDownloadList = async (file: DataFileItem) => {
    try {
      setIsLoading(true);

      // Fetch all contacts for this list
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/contacts/by-client-datafile?clientId=${effectiveUserId}&dataFileId=${file.id}`
      );

      if (!response.ok) throw new Error("Failed to fetch contacts");

      const data: ContactsResponse = await response.json();
      const contacts = data.contacts || [];

      if (contacts.length === 0) {
        appModal.showWarning("No contacts to download");
        return;
      }

      // Download as CSV
      const filename = `${file.name.replace(/[^a-z0-9]/gi, "_")}_${new Date().toISOString().split("T")[0]
        }`;
      downloadCSV(contacts, filename);
    } catch (error) {
      console.error("Error downloading list:", error);
      appModal.showError("Failed to download list data");
    } finally {
      setIsLoading(false);
      setListActionsAnchor(null);
    }
  };

  // Download segment data
  const handleDownloadSegment = async (segment: any) => {
    try {
      setIsLoadingSegments(true);

      // Fetch all contacts for this segment
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/segment/${segment.id}/contacts`
      );

      if (!response.ok) throw new Error("Failed to fetch segment contacts");

      const contacts = await response.json();

      if (!contacts || contacts.length === 0) {
        appModal.showWarning("No contacts to download");
        return;
      }

      // Download as CSV
      const filename = `${segment.name.replace(/[^a-z0-9]/gi, "_")}_${new Date().toISOString().split("T")[0]
        }`;
      downloadCSV(contacts, filename);
    } catch (error) {
      console.error("Error downloading segment:", error);
      appModal.showError("Failed to download segment data");
    } finally {
      setIsLoadingSegments(false);
      setSegmentActionsAnchor(null);
    }
  };
  const totalPages1 = Math.ceil(filteredDatafiles.length / pageSize);
 const startIndex1 = (currentPageLists - 1) * pageSize;  // ✅ CORRECT - uses currentPageLists
const endIndex1 = Math.min(currentPageLists * pageSize, filteredDatafiles.length);
const currentData = filteredDatafiles.slice(startIndex1, endIndex1);
  //const currentData = filteredDatafiles.slice(currentPage, currentPage + pageSize);

//for segments

// const filteredSegments = segments.filter(
//     (seg) =>
//       seg.name?.toLowerCase().includes(segmentSearchQuery.toLowerCase()) ||
//       seg.description?.toLowerCase().includes(segmentSearchQuery.toLowerCase()),
//   )
 const { filteredSegments, paginatedSegments, segmentTotalPages } = useMemo(() => {
    const filtered = segments.filter(
      (seg) =>
        seg.name?.toLowerCase().includes(segmentSearchQuery.toLowerCase()) ||
        seg.description?.toLowerCase().includes(segmentSearchQuery.toLowerCase()),
    )

    const totalPages = Math.ceil(filtered.length / pageSize)
    const startIndex = (segmentCurrentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginated = filtered.slice(startIndex, endIndex)

    console.log("[v0] Segment Pagination Debug:", {
      totalSegments: segments.length,
      filteredLength: filtered.length,
      segmentCurrentPage,
      pageSize,
      totalPages,
      startIndex,
      endIndex,
      paginatedLength: paginated.length,
      segmentSearchQuery,
    })

    return {
      filteredSegments: filtered,
      paginatedSegments: paginated,
      segmentTotalPages: totalPages,
    }
  }, [segments, segmentSearchQuery, segmentCurrentPage, pageSize])

  // const segmentTotalPages = Math.ceil(filteredSegments.length / pageSize)
  // const segmentStartIndex = (segmentCurrentPage - 1) * pageSize
  // const segmentEndIndex = segmentStartIndex + pageSize
  // const paginatedSegments = filteredSegments.slice(segmentStartIndex, segmentEndIndex)

  const columnNameMap: Record<string, string> = {
    id: "ID",
    full_name: "Full name",
    email: "Email",
    website: "Website",
    company_name: "Company name",
    job_title: "Job title",
    linkedin_url: "LinkedIn URL",
    country_or_address: "Country or address",
    created_at: "Created at",
    updated_at: "Updated at",
    email_sent_at: "Email sent at",
    companyTelephone: "Company telephone",
    companyEmployeeCount: "Company employee count",
    companyIndustry: "Company industry",
    companyLinkedInURL: "Company linked in URL",
    companyEventLink: "Company event link",
  };

  return (
    <div className="data-campaigns-container">
      {/* Sub-tabs Navigation */}
      <div className="tabs secondary mb-20">
        <ul className="d-flex" style={{marginTop: "-56px"}}>
          <li>
            <button
              type="button"
              onClick={() => handleTabChange("List")}
              className={`button !pt-0 ${activeSubTab === "List" ? "active" : ""
                }`}
            >
              Lists
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => handleTabChange("Segment")}
              className={`button !pt-0 ${activeSubTab === "Segment" ? "active" : ""
                }`}
            >
              Segments
            </button>
          </li>
        </ul>
      </div>

      {/* Tab Content */}
      {activeSubTab === "List" && (
        <div className="list-content">
          <div className="section-wrapper">
            {viewMode === "list" ? (
              <>
                <h2 className="section-title">
                  Lists
                </h2>
                <p style={{ marginBottom: '16px', color: '#555' }}>
                  This is where you organize your lists. Create, modify, and manage custom lists for targeted interactions, and keep them in folders for easy navigation.
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
                    placeholder="Search a list name or ID"
                    value={listSearch}
                    onChange={(e) => setListSearch(e.target.value)}
                  />
                  <div style={{ marginLeft: "auto", position: "relative" }}>
                    <button
                      className="ml-10 save-button button auto-width small d-flex justify-between align-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCreateListOptions(!showCreateListOptions);
                      }}
                    >
                      <span className="text-[20px] mr-1">+</span> Create a list
                    </button>
                    {showCreateListOptions && (
                      <div style={{
                        position: "absolute",
                        right: 0,
                        top: 40,
                        background: "#fff",
                        border: "1px solid #eee",
                        borderRadius: 6,
                        boxShadow: "0 2px 16px rgba(0,0,0,0.12)",
                        zIndex: 101,
                        minWidth: 160
                      }}>
                        <button
                          onClick={() => {
                            if (onAddContactClick) onAddContactClick();
                            setShowCreateListOptions(false);
                          }}
                          style={{
                            width: "100%",
                            padding: "8px 18px",
                            textAlign: "left",
                            background: "none",
                            border: "none",
                            color: "#222",
                            fontSize: "15px",
                            cursor: "pointer"
                          }}
                        >
                          📁 Upload File
                        </button>
                        <button
                          onClick={() => {
                            setShowCreateListModal(true);
                            setShowCreateListOptions(false);
                          }}
                          style={{
                            width: "100%",
                            padding: "8px 18px",
                            textAlign: "left",
                            background: "none",
                            border: "none",
                            color: "#222",
                            fontSize: "15px",
                            cursor: "pointer"
                          }}
                        >
                          ✏️ Add Manually
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                 <PaginationControls
                  currentPage={currentPageLists}
                  totalPages={totalPages1}
                  pageSize={pageSize}
                  totalRecords={filteredDatafiles.length}
                  setCurrentPage={setCurrentPageLists}
                />
                <div style={{marginBottom:"10px"}}></div>
                <table
                  className="contacts-table"
                  style={{ background: "#fff", width: "100%", tableLayout: "auto" }}
                >
                  <thead>
                    <tr>
                      <th>Lists</th>
                      <th>ID</th>
                      <th>Folder</th>
                      <th>Contacts</th>
                      <th>Creation date</th>
                      <th>Description</th>
                      <th style={{ minWidth: 48 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentData.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center" }}>
                          No lists found.
                        </td>
                      </tr>
                    )}
                    {currentData.map((file) => (
                      <tr key={file.id}>
                        <td>
                          <span
                            className="list-link text-[#3f9f42]"
                            style={{
                              color: "#28a745",
                              cursor: "pointer",
                              textDecoration: "underline",
                            }}
                            onClick={() => {
                              setSelectedDataFileForView(file);
                              setViewMode("detail");
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
                        <td>{file.contactCount || file.contacts?.length || 0}</td>
                        <td>
                          {file.created_at
                            ? formatDate(file.created_at) // Use formatDate instead of toLocaleString
                            : "-"}
                        </td>
                        <td>{file.description || "-"}</td>
                        <td style={{ position: "relative" }}>
                          <button
                            className="segment-actions-btn  font-[600]"
                            style={{
                              border: "none",
                              background: "none",
                              fontSize: 24,
                              cursor: "pointer",
                              padding: "2px 10px",
                            }}
                            onClick={() =>
                              setListActionsAnchor(
                                file.id.toString() === listActionsAnchor
                                  ? null
                                  : file.id.toString()
                              )
                            }
                          >
                            ⋮
                          </button>
                          {listActionsAnchor === file.id.toString() && (
                            <div
                              className="segment-actions-menu  py-[10px]"
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
                              {!isDemoAccount && (
                                <button
                                  onClick={() => {
                                    setEditingList(file);
                                    setRenamingListName(file.name);
                                    setRenamingListDescription(
                                      file.description || ""
                                    ); // Populate existing description
                                    setListActionsAnchor(null);
                                  }}
                                  style={menuBtnStyle}
                                  className="flex gap-2 items-center"
                                >
                                  <span>
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="28px"
                                      height="28px"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                    >
                                      <path
                                        d="M12 3.99997H6C4.89543 3.99997 4 4.8954 4 5.99997V18C4 19.1045 4.89543 20 6 20H18C19.1046 20 20 19.1045 20 18V12M18.4142 8.41417L19.5 7.32842C20.281 6.54737 20.281 5.28104 19.5 4.5C18.7189 3.71895 17.4526 3.71895 16.6715 4.50001L15.5858 5.58575M18.4142 8.41417L12.3779 14.4505C12.0987 14.7297 11.7431 14.9201 11.356 14.9975L8.41422 15.5858L9.00257 12.6441C9.08001 12.2569 9.27032 11.9013 9.54951 11.6221L15.5858 5.58575M18.4142 8.41417L15.5858 5.58575"
                                        stroke="#000000"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                      ></path>
                                    </svg>
                                  </span>
                                  <span className="font-[600]">Rename</span>
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedDataFileForView(file);
                                  setViewMode("detail");
                                  setListActionsAnchor(null);
                                  setDetailCurrentPage(1);
                                  setDetailSearchQuery("");
                                  setDetailSelectedContacts(new Set());
                                }}
                                style={menuBtnStyle}
                                className="flex gap-2 items-center"
                              >
                                <span>
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24px"
                                    height="24px"
                                    viewBox="0 0 24 20"
                                    fill="none"
                                  >
                                    <circle
                                      cx="12"
                                      cy="12"
                                      r="4"
                                      fill="#33363F"
                                    />
                                    <path
                                      d="M21 12C21 12 20 4 12 4C4 4 3 12 3 12"
                                      stroke="#33363F"
                                      stroke-width="2"
                                    />
                                  </svg>
                                </span>
                                <span className="font-[600]">View</span>
                              </button>
                              <button
                                onClick={() => handleDownloadList(file)}
                                style={menuBtnStyle}
                                className="flex gap-2 items-center"
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
                                            stroke="#000000"
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
                                              stroke="#000000"
                                              stroke-linecap="round"
                                              stroke-linejoin="round"
                                              stroke-width="2"
                                            />

                                            <line
                                              fill="none"
                                              stroke="#000000"
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
                                <span className="font-[600]">Download</span>
                              </button>
                              {!isDemoAccount && (
                                <button
                                  onClick={() => {
                                    setEditingList(file);
                                    setShowConfirmListDelete(true);
                                    setListActionsAnchor(null);
                                  }}
                                  style={{ ...menuBtnStyle }}
                                  className="flex gap-2 items-center"
                                >
                                  <span className="ml-[3px]">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 50 50"
                                      width="22px"
                                      height="22px"
                                    >
                                      <path d="M 21 2 C 19.354545 2 18 3.3545455 18 5 L 18 7 L 8 7 A 1.0001 1.0001 0 1 0 8 9 L 9 9 L 9 45 C 9 46.654 10.346 48 12 48 L 38 48 C 39.654 48 41 46.654 41 45 L 41 9 L 42 9 A 1.0001 1.0001 0 1 0 42 7 L 32 7 L 32 5 C 32 3.3545455 30.645455 2 29 2 L 21 2 z M 21 4 L 29 4 C 29.554545 4 30 4.4454545 30 5 L 30 7 L 20 7 L 20 5 C 20 4.4454545 20.445455 4 21 4 z M 19 14 C 19.552 14 20 14.448 20 15 L 20 40 C 20 40.553 19.552 41 19 41 C 18.448 41 18 40.553 18 40 L 18 15 C 18 14.448 18.448 14 19 14 z M 25 14 C 25.552 14 26 14.448 26 15 L 26 40 C 26 40.553 25.552 41 25 41 C 24.448 41 24 40.553 24 40 L 24 15 C 24 14.448 24.448 14 25 14 z M 31 14 C 31.553 14 32 14.448 32 15 L 32 40 C 32 40.553 31.553 41 31 41 C 30.447 41 30 40.553 30 40 L 30 15 C 30 14.448 30.447 14 31 14 z"></path>
                                    </svg>
                                  </span>
                                  <span className="font-[600]">Delete</span>
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <PaginationControls
                  currentPage={currentPageLists}
                  totalPages={totalPages1}
                  pageSize={pageSize}
                  totalRecords={filteredDatafiles.length}
                  setCurrentPage={setCurrentPageLists}
                />

              </>
            ) : (
              // Detail view using ContactsTable
              <DynamicContactsTable
                data={detailContacts}
                isLoading={isLoadingDetail}
                search={detailSearchQuery}
                setSearch={setDetailSearchQuery}
                showCheckboxes={true}
                paginated={true}
                currentPage={detailCurrentPage}
                pageSize={detailPageSize}
                onPageChange={setDetailCurrentPage}
                selectedItems={detailSelectedContacts}
                onSelectItem={handleDetailSelectContact}
                totalItems={detailTotalContacts}
                // Dynamic configuration
                autoGenerateColumns={true}
                excludeFields={[
                  "email_body",
                  "email_subject",
                  "dataFileId",
                  "data_file",
                ]} // Hide large/unwanted fields
                onColumnsChange={(updatedColumns) => {
                  // Handle column changes from DynamicContactsTable
                  const visibleColumns = updatedColumns
                    .filter(col => col.visible && col.key !== 'checkbox')
                    .map(col => col.key);
                  setSavedColumnSelection(visibleColumns);
                  saveSelectedColumns(visibleColumns);
                }}
                persistedColumnSelection={savedColumnSelection}
                customFormatters={{
                  // Date formatting
                  created_at: (value: any) => formatDate(value),
                  updated_at: (value: any) => formatDate(value),
                  email_sent_at: (value: any) => formatDate(value),

                  // URL formatting
                  website: (value: any) => {
                    if (!value || value === "-") return "-";
                    const url = value.startsWith("http")
                      ? value
                      : `https://${value}`;
                    return (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "#3f9f42",
                          textDecoration: "underline",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Website
                      </a>
                    );
                  },
                  linkedin_url: (value: any) => {
                    if (
                      !value ||
                      value === "-" ||
                      value.toLowerCase() === "linkedin.com"
                    )
                      return "-";
                    const url = value.startsWith("http")
                      ? value
                      : `https://${value}`;
                    return (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "#3f9f42",
                          textDecoration: "underline",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        LinkedIn profile
                      </a>
                    );
                  },

                  // Email formatting
                  email: (value: any) => {
                    if (!value || value === "-") return "-";
                    return (
                      <a
                        href={`mailto:${value}`}
                        style={{
                          color: "#3f9f42",
                          textDecoration: "underline",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {value}
                      </a>
                    );
                  },
                }}
                searchFields={[
                  "full_name",
                  "email",
                  "company_name",
                  "job_title",
                  "country_or_address",
                ]}
                primaryKey="id"
                viewMode="detail"
                detailTitle={`${selectedDataFileForView?.name} (#${selectedDataFileForView?.id})`}
                detailDescription={
                  selectedDataFileForView?.description ||
                  "No description available"
                }
                onBack={() => {
                  setViewMode("list");
                  setSelectedDataFileForView(null);
                }}
                onAddItem={() => setShowAddContactModal(true)}
                columnNameMap={columnNameMap}
                customHeader={
                  detailSelectedContacts.size > 0 && (
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
                        {detailSelectedContacts.size} contact
                        {detailSelectedContacts.size > 1 ? "s" : ""} selected
                      </span>
                      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                        <button
                          className="button secondary"
                          onClick={handleDeleteListContacts}
                          disabled={isLoading}
                          style={{
                            background: "#dc3545",
                            color: "#fff",
                            border: "none",
                          }}
                        >
                          {isLoading ? "Deleting..." : "Delete contacts"}
                        </button>
                        <button
                          className="button primary"
                          onClick={() => setShowSaveSegmentModal(true)}
                        >
                          Create segment
                        </button>
                      </div>
                    </div>
                  )
                }
              // customColumns={customColumns}
              />
            )}

            {editingList && !showConfirmListDelete && (
              <div
                style={{
                  position: "fixed",
                  zIndex: 99999,
                  inset: 0,
                  background: "rgba(0,0,0,0.6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    background: "#fff",
                    padding: 24,
                    borderRadius: 8,
                    minWidth: 400,
                    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                  }}
                >
                  <h3
                    className="sub-title"
                    style={{ marginTop: 0, marginBottom: 16 }}
                  >
                    Rename list
                  </h3>

                  {/* Name field */}
                  <div style={{ marginBottom: 16 }} className="form-group">
                    <label
                      style={{
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      List name <span style={{ color: "red" }}>*</span>
                    </label>
                    <input
                      value={renamingListName}
                      onChange={(e) => setRenamingListName(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                      }}
                      placeholder="Enter list name"
                      autoFocus
                    />
                  </div>

                  {/* Description field */}
                  <div style={{ marginBottom: 16 }} className="form-group">
                    <label
                      style={{
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      Description <span style={{ color: "red" }}></span>
                    </label>
                    <textarea
                      value={renamingListDescription}
                      onChange={(e) =>
                        setRenamingListDescription(e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        minHeight: "80px",
                        resize: "vertical",
                      }}
                      placeholder="Enter description for this list"
                      rows={3}
                    />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      onClick={() => {
                        setEditingList(null);
                        setRenamingListName("");
                        setRenamingListDescription("");
                      }}
                      className="button secondary"
                      style={{
                        padding: "8px 16px",
                        border: "1px solid #ddd",
                        background: "#fff",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="button primary"
                      onClick={handleRenameList}
                      disabled={
                        !renamingListName.trim() ||
                        !renamingListDescription.trim() ||
                        isRenamingList
                      }
                      style={{
                        padding: "8px 16px",
                        background:
                          renamingListName.trim() &&
                            renamingListDescription.trim() &&
                            !isRenamingList
                            ? "#3f9f42"
                            : "#ccc",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor:
                          renamingListName.trim() &&
                            renamingListDescription.trim() &&
                            !isRenamingList
                            ? "pointer"
                            : "not-allowed",
                      }}
                    >
                      {isRenamingList ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete confirmation modal - FIXED VERSION */}
            {editingList && showConfirmListDelete && (
              <div
                style={{
                  position: "fixed",
                  zIndex: 99999,
                  inset: 0,
                  background: "rgba(0,0,0,0.6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    background: "#fff",
                    padding: 24,
                    borderRadius: 8,
                    minWidth: 320,
                    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                  }}
                >
                  <h3 style={{ marginTop: 0, marginBottom: 16 }}>
                    Delete list
                  </h3>
                  <p style={{ marginBottom: 20 }}>
                    Are you sure you want to delete <b>{editingList.name}</b>?
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      onClick={() => {
                        setShowConfirmListDelete(false);
                        setEditingList(null);
                      }}
                      className="button secondary"
                      style={{
                        padding: "8px 16px",
                        border: "1px solid #ddd",
                        background: "#fff",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="button primary"
                      style={{
                        padding: "8px 16px",
                        background: "#dc3545",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                      onClick={() =>
                        editingList && handleDeleteList(editingList)
                      }
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
            {segmentViewMode === "list" ? (
              <>
                <h2 className="section-title">Segments</h2>
                <div style={{ marginBottom: 4, color: "#555" }}>
                  Create and manage segments to organize your contacts for
                  targeted campaigns.
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: 16,
                    gap: 16,
                  }}
                >
                  <input
                    type="text"
                    className="search-input"
                    style={{ width: 340 }}
                    placeholder="Search segments..."
                    value={segmentSearchQuery}
                    onChange={(e) => setSegmentSearchQuery(e.target.value)}
                  />
                </div>
                {/* ✅ Pagination on top right */}
                <div style={{marginBottom:"10px"}}>
                <PaginationControls
                  currentPage={segmentCurrentPage}
                  totalPages={segmentTotalPages}
                  pageSize={pageSize}
                  totalRecords={filteredSegments.length}
                  setCurrentPage={setSegmentCurrentPage}
                />
                </div>
                <table
                  className="contacts-table"
                  style={{ background: "#fff", width: "100%", tableLayout: "auto" }}
                >
                  <thead>
                    <tr>
                      <th>Segment name</th>
                      <th>Contacts</th>
                      <th>Created date</th>
                      <th>Description</th>
                      <th style={{ minWidth: 48 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingSegments ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center" }}>
                          Loading segments...
                        </td>
                      </tr>
                    ) : filteredSegments.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center" }}>
                          No segments found.
                        </td>
                      </tr>
                    ) : (
                      paginatedSegments
                        .filter(
                          (seg) =>
                            seg.name
                              ?.toLowerCase()
                              .includes(segmentSearchQuery.toLowerCase()) ||
                            seg.description
                              ?.toLowerCase()
                              .includes(segmentSearchQuery.toLowerCase())
                        )
                        .map((segment) => (
                          <tr key={segment.id}>
                            <td>
                              <span
                                className="list-link"
                                style={{
                                  color: "#3f9f42",
                                  cursor: "pointer",
                                  textDecoration: "underline",
                                }}
                                onClick={() => {
                                  setSelectedSegmentForView(segment);
                                  setSegmentViewMode("detail");
                                  setDetailCurrentPage(1);
                                  setDetailSearchQuery("");
                                  setDetailSelectedContacts(new Set());
                                }}
                              >
                                {segment.name}
                              </span>
                            </td>
                            <td>
                              {segment.contactCount ||
                                segment.contacts?.length ||
                                0}
                            </td>
                            <td>
                              {segment.createdAt
                                ? formatDate(segment.createdAt) // Use formatDate instead of toLocaleDateString
                                : "-"}
                            </td>
                            <td>{segment.description || "-"}</td>
                            <td style={{ position: "relative" }}>
                              <button
                                className="segment-actions-btn font-[600] font-600"
                                style={{
                                  border: "none",
                                  background: "none",
                                  fontSize: 24,
                                  cursor: "pointer",
                                  padding: "2px 10px",
                                }}
                                onClick={() =>
                                  setSegmentActionsAnchor(
                                    segment.id.toString() ===
                                      segmentActionsAnchor
                                      ? null
                                      : segment.id.toString()
                                  )
                                }
                              >
                                ⋮
                              </button>
                              {segmentActionsAnchor ===
                                segment.id.toString() && (
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
                                    {!isDemoAccount && (
                                      <button
                                        onClick={() => {
                                          setEditingSegment(segment);
                                          setRenamingSegmentName(segment.name);
                                          setRenamingSegmentDescription(
                                            segment.description || ""
                                          );
                                          setSegmentActionsAnchor(null);
                                        }}
                                        style={menuBtnStyle}
                                        className="flex gap-2 items-center"
                                      >
                                        <span>
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="24px"
                                            height="24px"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                          >
                                            <path
                                              d="M12 3.99997H6C4.89543 3.99997 4 4.8954 4 5.99997V18C4 19.1045 4.89543 20 6 20H18C19.1046 20 20 19.1045 20 18V12M18.4142 8.41417L19.5 7.32842C20.281 6.54737 20.281 5.28104 19.5 4.5C18.7189 3.71895 17.4526 3.71895 16.6715 4.50001L15.5858 5.58575M18.4142 8.41417L12.3779 14.4505C12.0987 14.7297 11.7431 14.9201 11.356 14.9975L8.41422 15.5858L9.00257 12.6441C9.08001 12.2569 9.27032 11.9013 9.54951 11.6221L15.5858 5.58575M18.4142 8.41417L15.5858 5.58575"
                                              stroke="#000000"
                                              stroke-width="2"
                                              stroke-linecap="round"
                                              stroke-linejoin="round"
                                            ></path>
                                          </svg>
                                        </span>
                                        <span className="font-[600]">Rename</span>
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        setSelectedSegmentForView(segment);
                                        setSegmentViewMode("detail");
                                        setSegmentActionsAnchor(null);
                                        setDetailCurrentPage(1);
                                        setDetailSearchQuery("");
                                        setDetailSelectedContacts(new Set());
                                      }}
                                      style={menuBtnStyle}
                                      className="flex gap-2 items-center"
                                    >
                                      <span>
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="24px"
                                          height="24px"
                                          viewBox="0 0 24 20"
                                          fill="none"
                                        >
                                          <circle
                                            cx="12"
                                            cy="12"
                                            r="4"
                                            fill="#33363F"
                                          />
                                          <path
                                            d="M21 12C21 12 20 4 12 4C4 4 3 12 3 12"
                                            stroke="#33363F"
                                            stroke-width="2"
                                          />
                                        </svg>
                                      </span>
                                      <span className="font-[600]">View</span>
                                    </button>
                                    {!isDemoAccount && (
                                      <button
                                        onClick={() => {
                                          setEditingSegment(segment);
                                          setShowConfirmSegmentDelete(true);
                                          setSegmentActionsAnchor(null);
                                        }}
                                        style={{ ...menuBtnStyle }}
                                        className="flex gap-2 items-center"
                                      >
                                        <span className="ml-[2px]">
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 50 50"
                                            width="22px"
                                            height="22px"
                                          >
                                            <path d="M 21 2 C 19.354545 2 18 3.3545455 18 5 L 18 7 L 8 7 A 1.0001 1.0001 0 1 0 8 9 L 9 9 L 9 45 C 9 46.654 10.346 48 12 48 L 38 48 C 39.654 48 41 46.654 41 45 L 41 9 L 42 9 A 1.0001 1.0001 0 1 0 42 7 L 32 7 L 32 5 C 32 3.3545455 30.645455 2 29 2 L 21 2 z M 21 4 L 29 4 C 29.554545 4 30 4.4454545 30 5 L 30 7 L 20 7 L 20 5 C 20 4.4454545 20.445455 4 21 4 z M 19 14 C 19.552 14 20 14.448 20 15 L 20 40 C 20 40.553 19.552 41 19 41 C 18.448 41 18 40.553 18 40 L 18 15 C 18 14.448 18.448 14 19 14 z M 25 14 C 25.552 14 26 14.448 26 15 L 26 40 C 26 40.553 25.552 41 25 41 C 24.448 41 24 40.553 24 40 L 24 15 C 24 14.448 24.448 14 25 14 z M 31 14 C 31.553 14 32 14.448 32 15 L 32 40 C 32 40.553 31.553 41 31 41 C 30.447 41 30 40.553 30 40 L 30 15 C 30 14.448 30.447 14 31 14 z"></path>
                                          </svg>
                                        </span>
                                        <span className="font-[600]">Delete</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
                {/* Pagination controls */}
                {/* <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "12px",
                  }}
                >
                  <div>
                    Showing {startIndex + 1} to{" "}
                    {Math.min(startIndex + pageSize, filteredDatafiles.length)} of{" "}
                    {filteredDatafiles.length} items
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((prev) => prev - 1)}
                      style={{
                        padding: "5px 10px",
                        cursor: currentPage === 1 ? "not-allowed" : "pointer",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                      }}
                    >
                      Prev
                    </button>

                    <span>
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((prev) => prev + 1)}
                      style={{
                        padding: "5px 10px",
                        cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div> */}
                {/* ✅ Pagination on top right */}
                <PaginationControls
                  currentPage={segmentCurrentPage}
                  totalPages={segmentTotalPages}
                  pageSize={pageSize}
                  totalRecords={filteredSegments.length}
                  setCurrentPage={setSegmentCurrentPage}
                />

              </>
            ) : (
              // Detail view for segments
              <DynamicContactsTable
                data={detailContacts}
                isLoading={isLoadingDetail}
                search={detailSearchQuery}
                setSearch={setDetailSearchQuery}
                showCheckboxes={true}
                paginated={true}
                currentPage={detailCurrentPage}
                pageSize={detailPageSize}
                onPageChange={setDetailCurrentPage}
                selectedItems={detailSelectedContacts}
                onSelectItem={handleDetailSelectContact}
                totalItems={detailTotalContacts}
                // Dynamic configuration
                autoGenerateColumns={true}
                excludeFields={[
                  "email_body",
                  "email_subject",
                  "dataFileId",
                  "data_file",
                ]}
                onColumnsChange={(updatedColumns) => {
                  // Handle column changes from DynamicContactsTable
                  const visibleColumns = updatedColumns
                    .filter(col => col.visible && col.key !== 'checkbox')
                    .map(col => col.key);
                  setSavedColumnSelection(visibleColumns);
                  saveSelectedColumns(visibleColumns);
                }}
                persistedColumnSelection={savedColumnSelection}
                customFormatters={{
                  created_at: (value: any) => formatDate(value),
                  updated_at: (value: any) => formatDate(value),
                  email_sent_at: (value: any) => formatDate(value),
                  website: (value: any) => {
                    if (!value || value === "-") return "-";
                    const url = value.startsWith("http")
                      ? value
                      : `https://${value}`;
                    return (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "#3f9f42",
                          textDecoration: "underline",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Website
                      </a>
                    );
                  },
                  linkedin_url: (value: any) => {
                    if (
                      !value ||
                      value === "-" ||
                      value.toLowerCase() === "linkedin.com"
                    )
                      return "-";
                    const url = value.startsWith("http")
                      ? value
                      : `https://${value}`;
                    return (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "#3f9f42",
                          textDecoration: "underline",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        LinkedIn Profile
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
                        onClick={(e) => e.stopPropagation()}
                      >
                        {value}
                      </a>
                    );
                  },
                }}
                searchFields={[
                  "full_name",
                  "email",
                  "company_name",
                  "job_title",
                  "country_or_address",
                ]}
                primaryKey="id"
                viewMode="detail"
                detailTitle={selectedSegmentForView?.name}
                detailDescription={
                  selectedSegmentForView?.description ||
                  "No description available"
                }
                onBack={() => {
                  setSegmentViewMode("list");
                  setSelectedSegmentForView(null);
                }}
                customHeader={
                  detailSelectedContacts.size > 0 && (
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
                        {detailSelectedContacts.size} contact
                        {detailSelectedContacts.size > 1 ? "s" : ""} selected
                      </span>
                      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                        <button
                          className="button secondary"
                          onClick={handleDeleteSegmentContacts}
                          disabled={isLoading}
                          style={{
                            background: "#dc3545",
                            color: "#fff",
                            border: "none",
                          }}
                        >
                          {isLoading ? "Deleting..." : "Delete contacts"}
                        </button>
                        <button
                          className="button primary"
                          onClick={() => setShowSaveSegmentModal(true)}
                        >
                          Create segment
                        </button>
                      </div>
                    </div>
                  )
                }
              />
            )}
          </div>
        </div>
      )}

      {/* Rename Segment Modal */}
      {editingSegment && !showConfirmSegmentDelete && (
        <div
          style={{
            position: "fixed",
            zIndex: 99999,
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 8,
              minWidth: 400,
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Rename segment</h3>

            {/* Name field */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{ display: "block", marginBottom: 4, fontWeight: 500 }}
              >
                Segment name <span style={{ color: "red" }}>*</span>
              </label>
              <input
                value={renamingSegmentName}
                onChange={(e) => setRenamingSegmentName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                }}
                placeholder="Enter segment name"
                autoFocus
              />
            </div>

            {/* Description field */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{ display: "block", marginBottom: 4, fontWeight: 500 }}
              >
                Description <span style={{ color: "red" }}></span>
              </label>
              <textarea
                value={renamingSegmentDescription}
                onChange={(e) => setRenamingSegmentDescription(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  minHeight: "80px",
                  resize: "vertical",
                }}
                placeholder="Enter description for this segment"
                rows={3}
              />
            </div>

            <div
              style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => {
                  setEditingSegment(null);
                  setRenamingSegmentName("");
                  setRenamingSegmentDescription("");
                }}
                className="button secondary"
                style={{
                  padding: "8px 16px",
                  border: "1px solid #ddd",
                  background: "#fff",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                className="button primary"
                onClick={handleRenameSegment}
                disabled={
                  !renamingSegmentName.trim() ||
                  isRenamingSegment
                }
                style={{
                  padding: "8px 16px",
                  background:
                    renamingSegmentName.trim() &&
                      !isRenamingSegment
                      ? "#007bff"
                      : "#ccc",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor:
                    renamingSegmentName.trim() &&
                      !isRenamingSegment
                      ? "pointer"
                      : "not-allowed",
                }}
              >
                {isRenamingSegment ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Segment Confirmation Modal */}
      {editingSegment && showConfirmSegmentDelete && (
        <div
          style={{
            position: "fixed",
            zIndex: 99999,
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 8,
              minWidth: 320,
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Delete segment</h3>
            <p style={{ marginBottom: 20 }}>
              Are you sure you want to delete segment{" "}
              <b>{editingSegment.name}</b>?
            </p>
            <div
              style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => {
                  setShowConfirmSegmentDelete(false);
                  setEditingSegment(null);
                }}
                className="button secondary"
                style={{
                  padding: "8px 16px",
                  border: "1px solid #ddd",
                  background: "#fff",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                className="button primary"
                style={{
                  padding: "8px 16px",
                  background: "#dc3545",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
                onClick={() =>
                  editingSegment && handleDeleteSegment(editingSegment)
                }
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showSaveSegmentModal && (
        <div
          style={{
            position: "fixed",
            zIndex: 99999,
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: 40,
              borderRadius: 12,
              minWidth: 340,
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Save as segment</h2>
            <p style={{ marginBottom: 16, color: "#666" }}>
              Creating segment with{" "}
              {viewMode === "detail"
                ? detailSelectedContacts.size
                : selectedContacts.size}{" "}
              selected contact
              {(viewMode === "detail"
                ? detailSelectedContacts.size
                : selectedContacts.size) > 1
                ? "s"
                : ""}
            </p>
            <input
              type="text"
              placeholder="Segment Name"
              value={segmentName}
              onChange={(e) => setSegmentName(e.target.value)}
              autoFocus
              style={{ width: "100%", marginBottom: 10 }}
            />
            <textarea
              placeholder="Description (optional)"
              value={segmentDescription}
              onChange={(e) => setSegmentDescription(e.target.value)}
              style={{ marginTop: 10, width: "100%", minHeight: 80 }}
              rows={3}
            />
            <div
              style={{
                marginTop: 18,
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowSaveSegmentModal(false)}
                className="button secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSegment}
                className="button primary"
                disabled={!segmentName || savingSegment}
              >
                {savingSegment ? "Saving..." : "Save Segment"}
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateListModal
        isOpen={showCreateListModal}
        onClose={() => setShowCreateListModal(false)}
        selectedClient={selectedClient}
        onListCreated={() => {
          fetchDataFiles();
        }}
        onShowMessage={(message, type) => {
          if (type === 'success') {
            appModal.showSuccess(message);
          } else {
            appModal.showError(message);
          }
        }}
      />
      <AddContactModal
        isOpen={showAddContactModal}
        onClose={() => setShowAddContactModal(false)}
        dataFileId={selectedDataFileForView?.id?.toString() || selectedDataFile}
        onContactAdded={() => {
          if (viewMode === "detail" && selectedDataFileForView) {
            fetchDetailContacts("list", selectedDataFileForView);
          } else if (segmentViewMode === "detail" && selectedSegmentForView) {
            fetchDetailContacts("segment", selectedSegmentForView);
          } else if (selectedDataFile) {
            fetchContacts();
          }
        }}
        onShowMessage={(message, type) => {
          if (type === 'success') {
            appModal.showSuccess(message);
          } else {
            appModal.showError(message);
          }
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

export default DataCampaigns;