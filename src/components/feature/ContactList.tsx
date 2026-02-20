import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import API_BASE_URL from "../../config";
import "./ContactList.css";
import DynamicContactsTable from "./DynamicContactsTable";
import AppModal from "../common/AppModal";
import AddContactModal from "./AddContactModal";
import EditContactModal from "./EditContactModal";
import CreateListModal from "./CreateListModal";

import { useAppModal } from "../../hooks/useAppModal";
import { useSelector } from "react-redux";
import { RootState } from "../../Redux/store";
import PaginationControls from "./PaginationControls";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAngleRight,
  faBars,
  faBullhorn,
  faDashboard,
  faEdit,
  faEnvelopeOpen,
  faGear,
  faList,
  faRobot, // Add this for Campaign Builder

} from "@fortawesome/free-solid-svg-icons"

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
  // companyEventLink?: string;
  unsubscribe?: string;
  notes?: string;
  contactCreatedAt?: string;
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
interface SortConfig {
  key: string;
  direction: "asc" | "desc";
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
  const [searchParams] = useSearchParams();

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
  const [selectedDataFileId, setSelectedDataFileId] = useState<number | null>(null);


  // Contact list states
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [totalContacts, setTotalContacts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageLists, setCurrentPageLists] = useState(1);
  const [pageSize, setPageSize] = useState<number | "All">(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(
    new Set()
  );
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showEditContactModal, setShowEditContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [inlineContact, setInlineContact] = useState<Contact | null>(null);
  const [showInlineContactPage, setShowInlineContactPage] = useState(false);
  const [showContactPage, setShowContactPage] = useState(false);
  const [emailTimeline, setEmailTimeline] = useState<any[]>([]);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [activeContactTab, setActiveContactTab] = useState<"profile" | "history">("profile");
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [showCreateListOptions, setShowCreateListOptions] = useState(false);
  const [notesHistory, setNotesHistory] = useState<any[]>([]);
  const isDemoAccount = sessionStorage.getItem("isDemoAccount") === "true";

  // Segment interface - moved before usage to fix TDZ error
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

  // Segments state - moved before usage to fix TDZ error
  const [segments, setSegments] = useState<Segment[]>([]);


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
    { key: "notes", label: "Notes", visible: false },
  ]);

  const appModal = useAppModal();
  // Existing states
  const [zohoClient, setZohoClient] = useState<ZohoClient[]>([]);
  const [selectedZohoViewForDeletion, setSelectedZohoViewForDeletion] =
    useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isDeletingContact, setIsDeletingContact] = useState(false);
  const [isCloningContact, setIsCloningContact] = useState(false);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);

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
      
      // Fetch Super List contact count
      let superListCount = 0;
      try {
        const countResponse = await fetch(
          `${API_BASE_URL}/api/Crm/allcontacts/count-by-clientId?clientId=${effectiveUserId}`
        );
        if (countResponse.ok) {
          const countData = await countResponse.json();
          superListCount = countData.contactCount || 0;
        }
      } catch (err) {
        console.error("Error fetching super list count:", err);
      }
      
      // Add Super List as default list
      const superList: DataFileItem = {
        id: -1,
        client_id: Number(effectiveUserId),
        name: "All Contact",
        data_file_name: "super_list",
        description: "All contacts from all lists",
        created_at: new Date().toISOString(),
        contacts: [],
        contactCount: superListCount
      };
      
      setDataFiles([superList, ...data]);
       
      console.log("datafiles",data);
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
      let response;
      
      // Check if Super List is selected
      if (selectedDataFile === "-1") {
        response = await fetch(
          `${API_BASE_URL}/api/Crm/allcontacts/list-by-clientId?clientId=${effectiveUserId}`
        );
      } else {
        response = await fetch(
          `${API_BASE_URL}/api/Crm/contacts/List-by-CleinteId?clientId=${effectiveUserId}&dataFileId=${selectedDataFile}`
        );
      }

      if (!response.ok) {
        throw new Error("Failed to fetch contacts");
      }

      const data: ContactsResponse = await response.json();
      console.log("Contactdata",data);
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
  //fetch email history
  const fetchEmailTimeline = async (contactId: number) => {
    if (!contactId) return;

    setIsLoadingHistory(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/email-timeline?contactId=${contactId}`
      );

      if (!response.ok) throw new Error("Failed to fetch email timeline");

      const data = await response.json();
      console.log("timelinedata:", data);
      // ✅ IMPORTANT: inject contactCreatedAt into editingContact
      setEditingContact((prev: any) =>
        prev
          ? {
            ...prev,
            contactCreatedAt: data.contactCreatedAt,
          }
          : prev
      );

      setEmailTimeline(data.emails || []);
    } catch (err) {
      console.error(err);
      setEmailTimeline([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };
  const stripHtml = (html: string) => {
    if (!html) return "";
    // Remove code block backticks if present
    const cleaned = html.replace(/```(html)?/g, "").trim();
    // Remove all HTML tags
    return cleaned.replace(/<[^>]+>/g, "");
  };
  const formatDateTime = (date?: string) =>
    date ? new Date(date).toLocaleString() : "-";

  const formatTime = (date?: string): string =>
    date ? new Date(date).toLocaleTimeString() : "-";

  const toggleEmailBody = (trackingId: string) => {
    setExpandedEmailId(prev =>
      prev === trackingId ? null : trackingId
    );
  };
  //IST Formatter
  const formatDateTimeIST = (dateString?: string) => {
  if (!dateString) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(dateString));
};

const formatTimeIST = (dateString?: string) => {
  if (!dateString) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(dateString));
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
  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const searchLower = searchQuery.toLowerCase()
      return (
        contact.full_name?.toLowerCase().includes(searchLower) ||
        contact.email?.toLowerCase().includes(searchLower) ||
        contact.company_name?.toLowerCase().includes(searchLower) ||
        contact.job_title?.toLowerCase().includes(searchLower) ||
        contact.country_or_address?.toLowerCase().includes(searchLower)
      )
    })
  }, [contacts, searchQuery])
  const compareContactValues = (valA: any, valB: any, direction: "asc" | "desc"): number => {
    if (valA == null && valB == null) return 0
    if (valA == null) return direction === "asc" ? 1 : -1
    if (valB == null) return direction === "asc" ? -1 : 1

    // Date sorting
    const dateA = new Date(valA)
    const dateB = new Date(valB)
    if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
      return direction === "asc" ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime()
    }

    // Number sorting
    const numA = Number(valA)
    const numB = Number(valB)
    if (!isNaN(numA) && !isNaN(numB) && valA !== "" && valB !== "") {
      return direction === "asc" ? numA - numB : numB - numA
    }

    // String sorting
    return direction === "asc"
      ? String(valA).toLowerCase().localeCompare(String(valB).toLowerCase())
      : String(valB).toLowerCase().localeCompare(String(valA).toLowerCase())
  }


  const sortedContacts = useMemo(() => {
    if (!sortConfig?.key) return filteredContacts

    return [...filteredContacts].sort((a, b) => {
      const valA = (a as any)[sortConfig.key]
      const valB = (b as any)[sortConfig.key]
      return compareContactValues(valA, valB, sortConfig.direction)
    })
  }, [filteredContacts, sortConfig])
  const getNumericPageSize = (size: number | "All", totalItems: number) => {
    return size === "All" ? totalItems : size;
  };
  const paginatedContacts = useMemo(() => {
    const numericPageSize = getNumericPageSize(pageSize, sortedContacts.length);
    return sortedContacts.slice((currentPage - 1) * numericPageSize, currentPage * numericPageSize);
  }, [sortedContacts, currentPage, pageSize]);
  // const paginatedContacts = useMemo(() => {
  //   return sortedContacts.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  // }, [sortedContacts, currentPage, pageSize])

  // const totalPages = useMemo(() => {
  //   return Math.ceil(sortedContacts.length / pageSize)
  // }, [sortedContacts.length, pageSize])
  const totalPages = useMemo(() => {
    const numericPageSize = getNumericPageSize(pageSize, sortedContacts.length);
    return Math.ceil(sortedContacts.length / numericPageSize);
  }, [sortedContacts.length, pageSize]);
  const handleListSort = (columnKey: string) => {
    if (listSortKey === columnKey) {
      // Same column - toggle direction
      setListSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      // Different column - set new sort with asc
      setListSortKey(columnKey)
      setListSortDirection("asc")
    }
    setCurrentPageLists(1)
  }
  const handleSegmentSort = (columnKey: string) => {
    if (segmentSortKey === columnKey) {
      // Same column - toggle direction
      setSegmentSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      // Different column - set new sort with asc
      setSegmentSortKey(columnKey)
      setSegmentSortDirection("asc")
    }
    setSegmentCurrentPage(1)
  }
  const compareStrings = (
    a?: string,
    b?: string,
    direction: "asc" | "desc" = "asc"
  ) => {
    const valueA = (a || "").toLowerCase();
    const valueB = (b || "").toLowerCase();

    if (valueA < valueB) return direction === "asc" ? -1 : 1;
    if (valueA > valueB) return direction === "asc" ? 1 : -1;
    return 0;
  };

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
  const numericPageSize = getNumericPageSize(pageSize, filteredContacts.length);
  const startIndex = (currentPage - 1) * numericPageSize;
  const endIndex = Math.min(currentPage * numericPageSize, filteredContacts.length)

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

  // Handle URL parameters for direct navigation from ContactDetailView
  useEffect(() => {
    const dataFileIdFromUrl = searchParams.get("dataFileId");
    const segmentIdFromUrl = searchParams.get("segmentId");
    
    console.log("URL Params:", { dataFileIdFromUrl, segmentIdFromUrl, dataFilesLength: dataFiles.length, segmentsLength: segments.length });
    
    if (dataFileIdFromUrl && dataFiles.length > 0) {
      const file = dataFiles.find(f => f.id.toString() === dataFileIdFromUrl);
      if (file) {
        setSelectedDataFileForView(file);
        setViewMode("detail");
        setDetailCurrentPage(1);
        setDetailSearchQuery("");
        setDetailSelectedContacts(new Set());
      }
    }
    
    if (segmentIdFromUrl) {
      console.log("Segment ID from URL:", segmentIdFromUrl);
      // First switch to Segment tab
      if (activeSubTab !== "Segment") {
        console.log("Switching to Segment tab");
        setActiveSubTab("Segment");
        if (onTabChange) onTabChange("Segment");
      }
      
      // Then find and set the segment if segments are loaded
      if (segments.length > 0) {
        const segment = segments.find(s => s.id.toString() === segmentIdFromUrl);
        console.log("Found segment:", segment);
        if (segment) {
          setSelectedSegmentForView(segment);
          setSegmentViewMode("detail");
          setDetailCurrentPage(1);
          setDetailSearchQuery("");
          setDetailSelectedContacts(new Set());
        }
      }
    }
  }, [searchParams, dataFiles, segments, activeSubTab]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  //Segment Modal States
  const [showSaveSegmentModal, setShowSaveSegmentModal] = useState(false);
  const [segmentName, setSegmentName] = useState("");
  const [segmentDescription, setSegmentDescription] = useState("");
  const [savingSegment, setSavingSegment] = useState(false);
  const [segmentModalTab, setSegmentModalTab] = useState<"create" | "move">("create");
  const [selectedExistingSegment, setSelectedExistingSegment] = useState<string>("");
  const [movingToSegment, setMovingToSegment] = useState(false);

  // Delete contacts from Lists
  const handleDeleteListContacts = async () => {
    const contactsToDelete = viewMode === "detail"
      ? Array.from(detailSelectedContacts)
      : Array.from(selectedContacts);

    if (contactsToDelete.length === 0) return;

    try {
      setIsDeletingContact(true);

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
      setIsDeletingContact(false);
    }
  };

  // Delete contacts from Segments
  const handleDeleteSegmentContacts = async () => {
    const contactsToDelete = segmentViewMode === "detail"
      ? Array.from(detailSelectedContacts)
      : Array.from(selectedContacts);

    if (contactsToDelete.length === 0) return;

    try {
      setIsDeletingContact(true);

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
      setIsDeletingContact(false);
    }
  };

  // Unsubscribe contacts
  const handleUnsubscribeContacts = async () => {
    const contactsToUnsubscribe = viewMode === "detail" || segmentViewMode === "detail"
      ? Array.from(detailSelectedContacts)
      : Array.from(selectedContacts);

    if (contactsToUnsubscribe.length === 0) return;

    try {
      setIsUnsubscribing(true);
      let successCount = 0;
      let errorCount = 0;

      for (const contactId of contactsToUnsubscribe) {
        // Find the contact to get email
        const contactData = viewMode === "detail" || segmentViewMode === "detail"
          ? detailContacts
          : contacts;
        const contact = contactData.find(c => c.id.toString() === contactId);

        if (!contact?.email) {
          errorCount++;
          continue;
        }

        const response = await fetch(
          `${API_BASE_URL}/api/Crm/UnsubscribeContacts?ClientId=${effectiveUserId}&email=${encodeURIComponent(contact.email)}`,
          {
            method: "GET",
            headers: {
              "accept": "*/*",
            },
          }
        );

        if (response.ok) {
          const responseText = await response.text();
          if (responseText === "Unsubscribed Added Successfully") {
            appModal.showSuccess(`${contact.email} has been unsubscribed successfully.`);
          } else if (responseText === "Already Unsubscribed") {
            appModal.showInfo(`${contact.email} is already unsubscribed.`);
          }
          successCount++;
        } else {
          errorCount++;
        }
      }

      if (errorCount > 0) {
        appModal.showError(`${errorCount} contact(s) failed to unsubscribe.`);
      }

      // Clear selections
      if (viewMode === "detail" || segmentViewMode === "detail") {
        setDetailSelectedContacts(new Set());
      } else {
        setSelectedContacts(new Set());
      }

      // Auto-refresh data after unsubscribe operation
      if (viewMode === "detail" && selectedDataFileForView) {
        fetchDetailContacts("list", selectedDataFileForView);
      } else if (segmentViewMode === "detail" && selectedSegmentForView) {
        fetchDetailContacts("segment", selectedSegmentForView);
      } else if (selectedDataFile) {
        fetchContacts();
      } else if (activeSubTab === "Segment" && selectedSegment) {
        fetchSegmentContacts(selectedSegment);
      }

    } catch (error) {
      console.error("Error unsubscribing contacts:", error);
      appModal.showError("Failed to unsubscribe contacts");
    } finally {
      setIsUnsubscribing(false);
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

  const handleMoveToExistingSegment = async () => {
    if (!selectedExistingSegment) return;
    setMovingToSegment(true);

    // Determine which contacts to use based on view mode
    const contactsToUse =
      viewMode === "detail"
        ? Array.from(detailSelectedContacts).map(Number)
        : segmentViewMode === "detail"
          ? Array.from(detailSelectedContacts).map(Number)
          : Array.from(selectedContacts).map(Number);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/add-contacts-to-existing-segment?ClientId=${effectiveUserId}&SegmentId=${selectedExistingSegment}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(contactsToUse),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to move contacts to segment");
      }

      const result = await response.json();
      
      if (result.alreadyPresentCount > 0 && result.contactsAdded === 0) {
        appModal.showInfo(result.message);
      } else if (result.contactsAdded > 0) {
        let message = result.message;
        if (result.alreadyPresentCount > 0) {
          message += ` (${result.contactsAdded} added, ${result.alreadyPresentCount} already present)`;
        }
        appModal.showSuccess(message);
      } else {
        appModal.showSuccess(result.message || "Contacts moved to segment successfully!");
      }
      setShowSaveSegmentModal(false);
      setSelectedExistingSegment("");
      setSegmentModalTab("create");

      // Clear selections after moving
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
      appModal.showError("Failed to move contacts to segment");
    } finally {
      setMovingToSegment(false);
    }
  };

  // Segment interface
  // (Moved earlier in the file to fix TDZ error)

  //segments - moved before usage to fix TDZ error
  // (Moved earlier in the file to fix TDZ error)
  const [selectedSegment, setSelectedSegment] = useState<string>("");
  const [segmentSortKey, setSegmentSortKey] = useState("")
  const [segmentSortDirection, setSegmentSortDirection] = useState("asc")
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
    if (!segmentId || !effectiveUserId) return;
    setIsLoadingSegmentContacts(true);
    try {
      // Use the new endpoint with clientId and segmentId parameters
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/segment-contacts?clientId=${effectiveUserId}&segmentId=${segmentId}`
      );
      if (!response.ok) throw new Error("Failed to fetch segment contacts");
      const data = await response.json();
      // Extract contacts from the response structure
      setSegmentContacts(data.contacts || []);
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

  // const segmentFilteredContacts = segmentContacts.filter((contact) => {
  //   const searchLower = segmentSearchQuery.toLowerCase();
  //   return (
  //     contact.full_name?.toLowerCase().includes(searchLower) ||
  //     contact.email?.toLowerCase().includes(searchLower) ||
  //     contact.company_name?.toLowerCase().includes(searchLower) ||
  //     contact.job_title?.toLowerCase().includes(searchLower) ||
  //     contact.country_or_address?.toLowerCase().includes(searchLower)
  //   );
  // });

  const [listSearch, setListSearch] = useState("");
  const [listSortKey, setListSortKey] = useState("")
  const [listSortDirection, setListSortDirection] = useState("asc")
  const [listActionsAnchor, setListActionsAnchor] = useState<string | null>(
    null
  ); // Which datafile ID's menu open
  const [editingList, setEditingList] = useState<DataFileItem | null>(null);
  const [renamingListName, setRenamingListName] = useState("");
  const [showConfirmListDelete, setShowConfirmListDelete] = useState(false);
  const [viewingListId, setViewingListId] = useState<string | null>(null); // for modal of viewing contacts


  const toggleListSort = (key: string) => {
    if (listSortKey === key) {
      // Same column - toggle direction
      setListSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      // Different column - set new sort with asc
      setListSortKey(key)
      setListSortDirection("asc")
    }
  }
  // Filter datafiles per search
  // const filteredDatafiles = dataFiles.filter(
  //   (df) =>
  //     df.name.toLowerCase().includes(listSearch.toLowerCase()) ||
  //     df.id.toString().includes(listSearch)
  // );
  const filteredDatafiles = useMemo(() => {
    //const searchLower = listSearch.toLowerCase()
    let filtered = dataFiles.filter((file) => file.name.toLowerCase().includes(listSearch.toLowerCase()))

    // Apply sorting
    if (listSortKey) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = (a as any)[listSortKey] ?? ""
        const bVal = (b as any)[listSortKey] ?? ""

        // Date sorting
        const dateA = new Date(aVal)
        const dateB = new Date(bVal)
        if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
          return listSortDirection === "asc" ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime()
        }

        // Number sorting
        const numA = Number(aVal)
        const numB = Number(bVal)
        if (!isNaN(numA) && !isNaN(numB)) {
          return listSortDirection === "asc" ? numA - numB : numB - numA
        }

        // String sorting
        return listSortDirection === "asc"
          ? String(aVal).toLowerCase().localeCompare(String(bVal).toLowerCase())
          : String(bVal).toLowerCase().localeCompare(String(aVal).toLowerCase())
      })
    }

    return filtered
  }, [dataFiles, listSearch, listSortKey, listSortDirection])


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
        // Check if Super List is selected
        if (item.id === -1) {
          url = `${API_BASE_URL}/api/Crm/allcontacts/list-by-clientId?clientId=${effectiveUserId}`;
        } else {
          url = `${API_BASE_URL}/api/Crm/contacts/List-by-CleinteId?clientId=${effectiveUserId}&dataFileId=${item.id}`;
        }
      } else {
        // Use the new segment-contacts endpoint
        url = `${API_BASE_URL}/api/Crm/segment-contacts?clientId=${effectiveUserId}&segmentId=${item.id}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch contacts");

      const data = await response.json();
      if (type === "list") {
        setDetailContacts(data.contacts || []);
        setDetailTotalContacts(data.contactCount || 0);
      } else {
        // Extract contacts from the new response structure
        setDetailContacts(data.contacts || []);
        setDetailTotalContacts(data.contactCount || 0);
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
      // { key: "companyEventLink", header: "Company Event Link" },
      { key: "unsubscribe", header: "Unsubscribe" },
      { key: "notes", header: "Notes" },
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
        `${API_BASE_URL}/api/Crm/contacts/List-by-CleinteId?clientId=${effectiveUserId}&dataFileId=${file.id}`
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

      // Fetch all contacts for this segment using the new endpoint
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/segment-contacts?clientId=${effectiveUserId}&segmentId=${segment.id}`
      );

      if (!response.ok) throw new Error("Failed to fetch segment contacts");

      const data = await response.json();
      const contacts = data.contacts || [];

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
  const numericPageSizeLists = getNumericPageSize(pageSize, filteredDatafiles.length);
  const totalPages1 = Math.ceil(filteredDatafiles.length / numericPageSizeLists);
  const startIndex1 = (currentPageLists - 1) * numericPageSizeLists;  // ✅ CORRECT - uses currentPageLists
  const endIndex1 = Math.min(currentPageLists * numericPageSizeLists, filteredDatafiles.length);
  const currentData = filteredDatafiles.slice(startIndex1, endIndex1);
  //const currentData = filteredDatafiles.slice(currentPage, currentPage + pageSize);

  //for segments

  // const filteredSegments = segments.filter(
  //     (seg) =>
  //       seg.name?.toLowerCase().includes(segmentSearchQuery.toLowerCase()) ||
  //       seg.description?.toLowerCase().includes(segmentSearchQuery.t oLowerCase()),
  //   )
  // Helper function to render sort arrow
  const renderSortArrow = (columnKey: string, currentSortKey: string, sortDirection: string) => {
    if (columnKey === currentSortKey) {
      return sortDirection === "asc" ? " ▲" : " ▼"
    }
    return ""
  }
  const { filteredSegments, paginatedSegments, segmentTotalPages } = useMemo(() => {
    let filtered = segments.filter(
      (seg) =>
        seg.name?.toLowerCase().includes(segmentSearchQuery.toLowerCase()) ||
        seg.description?.toLowerCase().includes(segmentSearchQuery.toLowerCase()),
    )

    // Apply sorting to filtered segments
    if (segmentSortKey) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = (a as any)[segmentSortKey] ?? ""
        const bVal = (b as any)[segmentSortKey] ?? ""

        const dateA = new Date(aVal)
        const dateB = new Date(bVal)
        if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
          return segmentSortDirection === "asc" ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime()
        }

        const numA = Number(aVal)
        const numB = Number(bVal)
        if (!isNaN(numA) && !isNaN(numB)) {
          return segmentSortDirection === "asc" ? numA - numB : numB - numA
        }

        return segmentSortDirection === "asc"
          ? String(aVal).toLowerCase().localeCompare(String(bVal).toLowerCase())
          : String(bVal).toLowerCase().localeCompare(String(aVal).toLowerCase())
      })
    }
    const numericPageSizeSegments = getNumericPageSize(pageSize, filtered.length);
    const totalPages = Math.ceil(filtered.length / numericPageSizeSegments)
    const startIndex = (segmentCurrentPage - 1) * numericPageSizeSegments
    const endIndex = Math.min(startIndex + numericPageSizeSegments, filtered.length);
    const paginated = filtered.slice(startIndex, endIndex)

    return {
      filteredSegments: filtered,
      paginatedSegments: paginated,
      segmentTotalPages: totalPages,
    }
  }, [segments, segmentSearchQuery, segmentSortKey, segmentSortDirection, segmentCurrentPage, pageSize])

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
    unsubscribe: "Unsubscribe",
    notes: "Notes",
  };
  const segmentFilteredContacts = useMemo(() => {
    let filtered = segmentContacts.filter((contact) => {
      const searchLower = segmentSearchQuery.toLowerCase()
      return (
        contact.full_name?.toLowerCase().includes(searchLower) ||
        contact.email?.toLowerCase().includes(searchLower) ||
        contact.company_name?.toLowerCase().includes(searchLower) ||
        contact.job_title?.toLowerCase().includes(searchLower) ||
        contact.country_or_address?.toLowerCase().includes(searchLower)
      )
    })

    // Apply sorting if segmentSortKey exists
    if (segmentSortKey) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = (a as any)[segmentSortKey] ?? ""
        const bVal = (b as any)[segmentSortKey] ?? ""

        const dateA = new Date(aVal)
        const dateB = new Date(bVal)
        if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
          return segmentSortDirection === "asc" ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime()
        }

        const numA = Number(aVal)
        const numB = Number(bVal)
        if (!isNaN(numA) && !isNaN(numB)) {
          return segmentSortDirection === "asc" ? numA - numB : numB - numA
        }

        return segmentSortDirection === "asc"
          ? String(aVal).toLowerCase().localeCompare(String(bVal).toLowerCase())
          : String(bVal).toLowerCase().localeCompare(String(aVal).toLowerCase())
      })
    }
    const numericPageSizeSegmentContacts = getNumericPageSize(pageSize, filtered.length);
    const totalPages = Math.ceil(filtered.length / numericPageSizeSegmentContacts)
    const startIndex = (segmentCurrentPage - 1) * numericPageSizeSegmentContacts
    const endIndex = Math.min(startIndex + numericPageSizeSegmentContacts, filtered.length);
    const paginated = filtered.slice(startIndex, endIndex)

    return { filtered, paginated, totalPages }
  }, [segmentContacts, segmentSearchQuery, segmentSortKey, segmentSortDirection, segmentCurrentPage, pageSize])


  return (
    <div className="data-campaigns-container">
      {/* Sub-tabs Navigation */}
      <div className="tabs secondary mb-20">
        <ul className="d-flex" style={{ marginTop: "-56px" }}>
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
          {!showContactPage && (

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
                    setPageSize={setPageSize}
                    showPageSizeDropdown={true}
                    pageLabel="Page:"
                  />
                  <div style={{ marginBottom: "10px" }}></div>
                  <table
                    className="contacts-table"
                    style={{ background: "#fff", width: "100%", tableLayout: "auto" }}
                  >
                    <thead>
                      <tr>
                        <th onClick={() => handleListSort("name")} style={{ cursor: "pointer" }}>Lists{renderSortArrow("name", listSortKey, listSortDirection)}</th>
                        <th onClick={() => handleListSort("id")} style={{ cursor: "pointer" }}>ID{renderSortArrow("id", listSortKey, listSortDirection)}</th>
                        <th onClick={() => handleListSort("folder")} style={{ cursor: "pointer" }}>Folder{renderSortArrow("folder", listSortKey, listSortDirection)}</th>
                        <th onClick={() => handleListSort("contactCount")} style={{ cursor: "pointer" }}>Contacts{renderSortArrow("contactCount", listSortKey, listSortDirection)}</th>
                        <th onClick={() => handleListSort("created_at")} style={{ cursor: "pointer" }}>Creation date{renderSortArrow("created_at", listSortKey, listSortDirection)}</th>
                        <th onClick={() => handleListSort("description")} style={{ cursor: "pointer" }}>Description{renderSortArrow("description", listSortKey, listSortDirection)}</th>
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
                          <td>#{file.id === -1 ? "ALL" : file.id}</td>
                          <td>Your First Folder</td>
                          <td>{file.contactCount || file.contacts?.length || 0}</td>
                          <td>
                            {file.created_at
                              ? formatDate(file.created_at) // Use formatDate instead of toLocaleString
                              : "-"}
                          </td>
                          <td>{file.description || "-"}</td>
                          <td style={{ position: "relative" }}>
                            {file.id !== -1 && (
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
                            )}
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
                    setPageSize={setPageSize}
                    showPageSizeDropdown={true}
                    pageLabel="Page:"
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
                    full_name: (value: any, row: any) => {
                      if (!value || value === "-") return "-";

                      return (
                        <span
                          style={{
                            color: "#3f9f42",
                            textDecoration: "underline",
                            cursor: "pointer",
                            fontWeight: 500,
                          }}
                          // onClick={(e) => {
                          //   e.stopPropagation(); // important
                          //   setEditingContact(row);
                          //   setShowContactPage(true);
                          //   setActiveContactTab("profile");
                          //   fetchEmailTimeline(row.id);
                          //   // setShowEditContactModal(true);
                          // }}
                          onClick={(e) => {
                           e.stopPropagation();
                           if (!selectedDataFileForView?.id) {
    console.error("No dataFileId for current list");
    return;
  }

const contactDetailsUrl =
  `/#/contact-details/${row.id}?dataFileId=${selectedDataFileForView.id}`;

  window.open(
    contactDetailsUrl,
    "_blank"
  );}}
                        >
                          {value}
                        </span>
                      );
                    },
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
                          title={value}
                          style={{
                            color: "#3f9f42",
                            textDecoration: "none",
                            cursor: "pointer",
                            fontSize: "16px"
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          🌐
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
                          title={value}
                          style={{
                            color: "#0077b5",
                            textDecoration: "none",
                            cursor: "pointer",
                            fontSize: "16px"
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                          </svg>
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

                    // Notes formatting - show icon with tooltip
                    notes: (value: any) => {
                      if (!value || value === "-" || value.trim() === "") return "-";
                      return (
                        <span
                          title={value}
                          style={{
                            cursor: "pointer",
                            fontSize: "16px",
                            color: "#666"
                          }}
                        >
                          📝
                        </span>
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
                          {detailSelectedContacts.size === 1 && (
                            <button
                              className="button secondary"
                              onClick={async () => {
                                const contactId = Array.from(detailSelectedContacts)[0];
                                try {
                                  setIsCloningContact(true);
                                  const response = await fetch(
                                    `${API_BASE_URL}/api/Crm/clone-contact?contactId=${contactId}`,
                                    { method: "POST", headers: { "accept": "*/*" } }
                                  );
                                  if (!response.ok) throw new Error("Failed to clone contact");
                                  appModal.showSuccess("Contact cloned successfully!");
                                  if (selectedDataFileForView) {
                                    fetchDetailContacts("list", selectedDataFileForView);
                                  }
                                  setDetailSelectedContacts(new Set());
                                } catch (error) {
                                  appModal.showError("Failed to clone contact");
                                } finally {
                                  setIsCloningContact(false);
                                }
                              }}
                              disabled={isCloningContact}
                              style={{
                                background: "#17a2b8",
                                color: "#fff",
                                border: "none",
                              }}
                            >
                              {isCloningContact ? "Cloning..." : "Clone contact"}
                            </button>
                          )}
                          <button
                            className="button secondary"
                            onClick={handleDeleteListContacts}
                            disabled={isDeletingContact}
                            style={{
                              background: "#dc3545",
                              color: "#fff",
                              border: "none",
                            }}
                          >
                            {isDeletingContact ? "Deleting..." : "Delete contacts"}
                          </button>
                          <button
                            className="button secondary"
                            onClick={handleUnsubscribeContacts}
                            disabled={isUnsubscribing}
                            style={{
                              background: "#ff9800",
                              color: "#fff",
                              border: "none",
                            }}
                          >
                            {isUnsubscribing ? "Processing..." : "Unsubscribe"}
                          </button>
                          <button
                            className="button primary"
                            onClick={() => {
                              setShowSaveSegmentModal(true);
                              if (segments.length === 0) {
                                fetchSegments();
                              }
                            }}
                            style={{ 
                              backgroundColor: "#3f9f42",
                              borderColor: "#3f9f42",
                              color: "#fff"
                            }}
                          >
                            Segment
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
              {editingContact && (
                <EditContactModal
                  isOpen={true}
                  contact={editingContact}
                  
                  
                  notesHistory={notesHistory}     // ✅ FIXED

                  asPage={true}           // ✅ INLINE MODE
                  hideOverlay={true}
                  onClose={() => setEditingContact(null)}
                  onContactUpdated={() => {
                    fetchContacts();
                    setEditingContact(null);
                  }}
                  onShowMessage={(msg, type) => {
                    type === 'success'
                      ? appModal.showSuccess(msg)
                      : appModal.showError(msg);
                  }}
                />
              )}
            </div>
          )}
          {showContactPage && editingContact && (
            <div style={{ padding: 24 }}>
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  marginBottom: 20,
                }}
              >
                <button
                  onClick={() => {
                    setShowContactPage(false);
                    setEditingContact(null);
                  }}
                  style={{
                    padding: "6px 12px",
                    background: "#eaeaea",
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  ← Back
                </button>

                <h2 style={{ margin: 0, fontWeight: 600 }}>
                  {editingContact.full_name}
                </h2>
              </div>

              {/* 🔹 Tabs */}
              <div
                style={{
                  display: "flex",
                  gap: 24,
                  borderBottom: "1px solid #e5e7eb",
                  marginBottom: 16,
                }}
              >
                {["profile", "history"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveContactTab(tab as any)}
                    style={{
                      padding: "10px 4px",
                      background: "none",
                      border: "none",
                      borderBottom:
                        activeContactTab === tab
                          ? "2px solid #3f9f42"
                          : "2px solid transparent",
                      color:
                        activeContactTab === tab ? "#3f9f42" : "#555",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {tab === "profile" ? "Profile" : "History"}
                  </button>
                ))}
              </div>

              {/* 🔹 PROFILE TAB */}
              {activeContactTab === "profile" && (
                <>
                  {/* Edit Form */}
                  <EditContactModal
                    isOpen={true}
                    asPage={true}
                    hideOverlay={true}
                    notesHistory={notesHistory}     // ✅ FIXED

                    
                    contact={editingContact}
                    onClose={() => {
                      setShowContactPage(false);
                      setEditingContact(null);
                    }}
                     onContactUpdated={(updatedContact) => {
                     // 🔥 update profile contact immediately
                     setEditingContact(updatedContact);

                     // 🔥 update detail list if used
                     setDetailContacts(prev =>
                       prev.map(c =>
                     c.id === updatedContact.id ? updatedContact : c
                     ));
                     fetchContacts(); // optional, for list sync
                     }}
                    onShowMessage={(msg, type) => {
                      type === "success"
                        ? appModal.showSuccess(msg)
                        : appModal.showError(msg);
                    }}
                  />
                </>
              )}

              {/* 🔹 HISTORY TAB */}
              {activeContactTab === "history" && (
                <div
                  style={{
                    background: "#fff",
                    padding: 24,
                    borderRadius: 8,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  }}
                >
                  <h3 style={{ marginBottom: 20 }}>Emails history</h3>

                  {isLoadingHistory && <p>Loading history...</p>}

                  {!isLoadingHistory && !editingContact?.contactCreatedAt && emailTimeline.length === 0 && (
                    <p style={{ color: "#666" }}>No history found.</p>
                  )}

                  {!isLoadingHistory && (
                    <>
                      {/* 🔹 CONTACT CREATED EVENT */}
                      {editingContact?.contactCreatedAt && (
                        <div style={{ display: "flex", gap: 16, paddingBottom: 24 }}>
                          <div style={{ position: "relative" }}>
                            <div
                              style={{
                                width: 10,
                                height: 10,
                                background: "#3f9f42",
                                borderRadius: "50%",
                                marginTop: 6,
                              }}
                            />
                            <div
                              style={{
                                position: "absolute",
                                top: 16,
                                left: 4,
                                width: 2,
                                height: "100%",
                                background: "#e5e7eb",
                              }}
                            />
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>Contact created</div>
                            <div style={{ fontSize: 13, color: "#666" }}>
                              {formatDateTimeIST(editingContact.contactCreatedAt)}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 🔹 EMAIL TIMELINE */}
                      { emailTimeline.map((email: any, index: number) => (
                          <div key={email.trackingId || index}>
                            <div
                              style={{
                                display: "flex",
                                gap: 16,
                                paddingBottom: 24,
                              }}
                            >
                              {/* Timeline dot */}
                              <div style={{ position: "relative" }}>
                                <div
                                  style={{
                                    width: 10,
                                    height: 10,
                                    background: "#3f9f42",
                                    borderRadius: "50%",
                                    marginTop: 6,
                                  }}
                                />
                                <div
                                  style={{
                                    position: "absolute",
                                    top: 16,
                                    left: 4,
                                    width: 2,
                                    height: "100%",
                                    background: "#e5e7eb",
                                  }}
                                />
                              </div>

                              {/* Content */}
                              <div style={{ flex: 1 }}>
                                {/* 2️⃣ SOURCE */}
                                <div style={{ fontSize: 13, marginBottom: 6 }}>
                                  <b>Source:</b>{" "}
                                  <span style={{ color: "#666" }}>
                                    {email.source || "Unknown source"}
                                  </span>
                                </div>

                                {/* 3️⃣ EMAIL SENT */}
                                <div style={{ fontWeight: 600 }}>Email sent</div>
                                <div
                                  style={{
                                    fontSize: 13,
                                    color: "#666",
                                    marginBottom: 8,
                                  }}
                                >
                                  {formatDateTimeIST(email.sentAt)} from {email.senderEmailId}
                                </div>
                                {/* • */}
                                <div
                                  style={{
                                    background: "#f9fafb",
                                    padding: 12,
                                    borderRadius: 8,
                                  }}
                                >
                                  {/* 4️⃣ EVENTS */}
                                  {email.events?.length > 0 && (
                                    <div style={{ marginBottom: 10 }}>
                                      <div
                                        style={{
                                          fontSize: 13,
                                          fontWeight: 600,
                                          marginBottom: 4,
                                        }}
                                      >
                                        Events
                                      </div>

                                      {email.events.map((ev: any, i: number) => (
                                        <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>
                                          • <b>{ev.eventType}ed</b> at {formatDateTimeIST(ev.eventAt)} 
                                          {ev.targetUrl && (
                                            <>
                                                 {" "}—{" "} <strong>target URL: </strong>
                                              <a
                                                href={ev.targetUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{ color: "#3f9f42" }}
                                              >
                                                {ev.targetUrl}
                                              </a>
                                            </>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* 5️⃣ SUBJECT */}
                                  <div>
                                    <div
                                      style={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        marginBottom: 2,
                                      }}
                                    >
                                      Subject
                                    </div>
                                    <div style={{ color: "#666", fontSize: 13 }}>
                                      {email.subject || "No subject"}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* 6️⃣ EMAIL BODY */}
                            <div
                              className={`email-preview-toggle ${expandedEmailId === email.trackingId ? "submenu-open" : ""
                                }`}
                              onClick={() => toggleEmailBody(email.trackingId)}
                            >
                              <span>
                                {expandedEmailId === email.trackingId
                                  ? "Hide email preview"
                                  : "Show email preview"}
                              </span>

                              <span className="submenu-arrow">
                                <FontAwesomeIcon icon={faAngleRight} />
                              </span>
                            </div>

                            {expandedEmailId === email.trackingId && (
                              <div
                                style={{
                                  background: "#f3f4f6",
                                  padding: 12,
                                  borderRadius: 6,
                                  marginBottom: 8,
                                  fontSize: 14,
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                <div style={{ color: "#333" }}>
                                  {stripHtml(email.body) || "No email body available"}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}

                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeSubTab === "Segment" && (
        <div className="segment-content">
          {!showContactPage && (
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
                  <div style={{ marginBottom: "10px" }}>
                    <PaginationControls
                      currentPage={segmentCurrentPage}
                      totalPages={segmentTotalPages}
                      pageSize={pageSize}
                      totalRecords={filteredSegments.length}
                      setCurrentPage={setSegmentCurrentPage}
                      setPageSize={setPageSize}
                      showPageSizeDropdown={true}
                      pageLabel="Page:"
                    />
                  </div>
                  <table
                    className="contacts-table"
                    style={{ background: "#fff", width: "100%", tableLayout: "auto" }}
                  >
                    <thead>
                      <tr>
                        <th onClick={() => handleSegmentSort("name")} style={{ cursor: "pointer" }}>Segment name{renderSortArrow("name", segmentSortKey, segmentSortDirection)}</th>
                        <th onClick={() => handleSegmentSort("contactCount")} style={{ cursor: "pointer" }}>Contacts{renderSortArrow("contactCount", segmentSortKey, segmentSortDirection)}</th>
                        <th onClick={() => handleSegmentSort("createdAt")} style={{ cursor: "pointer" }}>Created date{renderSortArrow("createdAt", segmentSortKey, segmentSortDirection)}</th>
                        <th onClick={() => handleSegmentSort("description")} style={{ cursor: "pointer" }}>Description{renderSortArrow("description", segmentSortKey, segmentSortDirection)}</th>
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
                                      <button
                                        onClick={() => handleDownloadSegment(segment)}
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
                    setPageSize={setPageSize}
                    showPageSizeDropdown={true}
                    pageLabel="Page:"
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
                    full_name: (value: any, row: any) => {
                      if (!value || value === "-") return "-";

                      return (
                        <span
                          style={{
                            color: "#3f9f42",
                            textDecoration: "underline",
                            cursor: "pointer",
                            fontWeight: 500,
                          }}
                          // onClick={(e) => {
                          //   e.stopPropagation(); // important
                          //   setEditingContact(row);
                          //   setShowContactPage(true);
                          //   //setShowEditContactModal(true);
                          //   setActiveContactTab("profile");
                          //   fetchEmailTimeline(row.id);
                          // }}
                          onClick={(e) => {
  e.stopPropagation();

  if (!selectedSegmentForView) {
    console.error("No segment selected");
    return;
  }

const contactDetailsUrl =
  `/#/contact-details/${row.id}?segmentId=${selectedSegmentForView.id}&dataFileId=${selectedSegmentForView.dataFileId}`;

  window.open(
    contactDetailsUrl,
    "_blank"
  );
}}
                        >
                          {value}
                        </span>
                      );
                    },
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
                          title={value}
                          style={{
                            color: "#3f9f42",
                            textDecoration: "none",
                            cursor: "pointer",
                            fontSize: "16px"
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          🌐
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
                          title={value}
                          style={{
                            color: "#0077b5",
                            textDecoration: "none",
                            cursor: "pointer",
                            fontSize: "16px"
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                          </svg>
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

                    // Notes formatting - show icon with tooltip
                    notes: (value: any) => {
                      if (!value || value === "-" || value.trim() === "") return "-";
                      return (
                        <span
                          title={value}
                          style={{
                            cursor: "pointer",
                            fontSize: "16px",
                            color: "#666"
                          }}
                        >
                          📝
                        </span>
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
                          {detailSelectedContacts.size === 1 && (
                            <button
                              className="button secondary"
                              onClick={async () => {
                                const contactId = Array.from(detailSelectedContacts)[0];
                                try {
                                  setIsCloningContact(true);
                                  const response = await fetch(
                                    `${API_BASE_URL}/api/Crm/clone-contact?contactId=${contactId}`,
                                    { method: "POST", headers: { "accept": "*/*" } }
                                  );
                                  if (!response.ok) throw new Error("Failed to clone contact");
                                  appModal.showSuccess("Contact cloned successfully!");
                                  if (selectedSegmentForView) {
                                    fetchDetailContacts("segment", selectedSegmentForView);
                                  }
                                  setDetailSelectedContacts(new Set());
                                } catch (error) {
                                  appModal.showError("Failed to clone contact");
                                } finally {
                                  setIsCloningContact(false);
                                }
                              }}
                              disabled={isCloningContact}
                              style={{
                                background: "#17a2b8",
                                color: "#fff",
                                border: "none",
                              }}
                            >
                              {isCloningContact ? "Cloning..." : "Clone contact"}
                            </button>
                          )}
                          <button
                            className="button secondary"
                            onClick={handleDeleteSegmentContacts}
                            disabled={isDeletingContact}
                            style={{
                              background: "#dc3545",
                              color: "#fff",
                              border: "none",
                            }}
                          >
                            {isDeletingContact ? "Deleting..." : "Remove"}
                          </button>
                          <button
                            className="button secondary"
                            onClick={handleUnsubscribeContacts}
                            disabled={isUnsubscribing}
                            style={{
                              background: "#ff9800",
                              color: "#fff",
                              border: "none",
                            }}
                          >
                            {isUnsubscribing ? "Processing..." : "Unsubscribe"}
                          </button>
                          <button
                            className="button primary"
                            onClick={() => setShowSaveSegmentModal(true)}
                            style={{ 
                              backgroundColor: "#3f9f42",
                              borderColor: "#3f9f42",
                              color: "#fff"
                            }}
                          >
                            Segment
                          </button>
                        </div>
                      </div>
                    )
                  }
                />
              )}
            </div>
          )}
          {showContactPage && editingContact && (
            <div style={{ padding: 24 }}>
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  marginBottom: 20,
                }}
              >
                <button
                  onClick={() => {
                    setShowContactPage(false);
                    setEditingContact(null);
                  }}
                  style={{
                    padding: "6px 12px",
                    background: "#eaeaea",
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  ← Back
                </button>

                <h2 style={{ margin: 0, fontWeight: 600 }}>
                  {editingContact.full_name}
                </h2>
              </div>

              {/* 🔹 Tabs */}
              <div
                style={{
                  display: "flex",
                  gap: 24,
                  borderBottom: "1px solid #e5e7eb",
                  marginBottom: 16,
                }}
              >
                {["profile", "history"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveContactTab(tab as any)}
                    style={{
                      padding: "10px 4px",
                      background: "none",
                      border: "none",
                      borderBottom:
                        activeContactTab === tab
                          ? "2px solid #3f9f42"
                          : "2px solid transparent",
                      color:
                        activeContactTab === tab ? "#3f9f42" : "#555",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {tab === "profile" ? "Profile" : "History"}
                  </button>
                ))}
              </div>

              {/* 🔹 PROFILE TAB */}
              {activeContactTab === "profile" && (
                <>
                  {/* Edit Form */}
                  <EditContactModal
                    isOpen={true}
                    asPage={true}
                    hideOverlay={true}
                    
                    notesHistory={notesHistory}     // ✅ FIXED

                    contact={editingContact}
                    onClose={() => {
                      setShowContactPage(false);
                      setEditingContact(null);
                    }}
                     onContactUpdated={(updatedContact) => {
                     // 🔥 update profile contact immediately
                     setEditingContact(updatedContact);
                     // 🔥 update detail list if used
                     setDetailContacts(prev =>
                     prev.map(c =>
                     c.id === updatedContact.id ? updatedContact : c
                     ));
                     fetchContacts(); // optional, for list sync
                     }}
                    onShowMessage={(msg, type) => {
                      type === "success"
                        ? appModal.showSuccess(msg)
                        : appModal.showError(msg);
                    }}
                  />
                </>
              )}
              {/* 🔹 HISTORY TAB */}
              {activeContactTab === "history" && (
                <div
                  style={{
                    background: "#fff",
                    padding: 24,
                    borderRadius: 8,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  }}
                >
                  <h3 style={{ marginBottom: 20 }}>Emails history</h3>

                  {isLoadingHistory && <p>Loading history...</p>}

                  {!isLoadingHistory && !editingContact?.contactCreatedAt && emailTimeline.length === 0 && (
                    <p style={{ color: "#666" }}>No history found.</p>
                  )}

                  {!isLoadingHistory && (
                    <>
                      {/* 🔹 CONTACT CREATED EVENT */}
                      {editingContact?.contactCreatedAt && (
                        <div style={{ display: "flex", gap: 16, paddingBottom: 24 }}>
                          <div style={{ position: "relative" }}>
                            <div
                              style={{
                                width: 10,
                                height: 10,
                                background: "#3f9f42",
                                borderRadius: "50%",
                                marginTop: 6,
                              }}
                            />
                            <div
                              style={{
                                position: "absolute",
                                top: 16,
                                left: 4,
                                width: 2,
                                height: "100%",
                                background: "#e5e7eb",
                              }}
                            />
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>Contact created</div>
                            <div style={{ fontSize: 13, color: "#666" }}>
                              {formatDateTimeIST(editingContact.contactCreatedAt)}
                            </div>
                          </div>
                        </div>
                      )}
                       {/* 🔹 EMAIL TIMELINE */}
                      {emailTimeline
                        .map((email: any, index: number) => (
                          <div key={email.trackingId || index}>
                            <div
                              style={{
                                display: "flex",
                                gap: 16,
                                paddingBottom: 24,
                              }}
                            >
                              {/* Timeline dot */}
                              <div style={{ position: "relative" }}>
                                <div
                                  style={{
                                    width: 10,
                                    height: 10,
                                    background: "#3f9f42",
                                    borderRadius: "50%",
                                    marginTop: 6,
                                  }}
                                />
                                <div
                                  style={{
                                    position: "absolute",
                                    top: 16,
                                    left: 4,
                                    width: 2,
                                    height: "100%",
                                    background: "#e5e7eb",
                                  }}
                                />
                              </div>

                              {/* Content */}
                              <div style={{ flex: 1 }}>
                                {/* 2️⃣ SOURCE */}
                                <div style={{ fontSize: 13, marginBottom: 6 }}>
                                  <b>Source:</b>{" "}
                                  <span style={{ color: "#666" }}>
                                    {email.source || "Unknown source"}
                                  </span>
                                </div>

                                {/* 3️⃣ EMAIL SENT */}
                                <div style={{ fontWeight: 600 }}>Email sent</div>
                                <div
                                  style={{
                                    fontSize: 13,
                                    color: "#666",
                                    marginBottom: 8,
                                  }}
                                >
                                  {formatDateTimeIST(email.sentAt)} from {email.senderEmailId}
                                </div>
                                {/* • */}
                                <div
                                  style={{
                                    background: "#f9fafb",
                                    padding: 12,
                                    borderRadius: 8,
                                  }}
                                >
                                  {/* 4️⃣ EVENTS */}
                                  {email.events?.length > 0 && (
                                    <div style={{ marginBottom: 10 }}>
                                      <div
                                        style={{
                                          fontSize: 13,
                                          fontWeight: 600,
                                          marginBottom: 4,
                                        }}
                                      >
                                        Events
                                      </div>

                                      {email.events.map((ev: any, i: number) => (
                                        <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>
                                          • <b>{ev.eventType}ed</b> at {formatDateTimeIST(ev.eventAt)} 
                                          {ev.targetUrl && (
                                            <>
                                                 {" "}—{" "} <strong>target URL: </strong>
                                              <a
                                                href={ev.targetUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{ color: "#3f9f42" }}
                                              >
                                                {ev.targetUrl}
                                              </a>
                                            </>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* 5️⃣ SUBJECT */}
                                  <div>
                                    <div
                                      style={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        marginBottom: 2,
                                      }}
                                    >
                                      Subject
                                    </div>
                                    <div style={{ color: "#666", fontSize: 13 }}>
                                      {email.subject || "No subject"}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* 6️⃣ EMAIL BODY */}
                            <div
                              className={`email-preview-toggle ${expandedEmailId === email.trackingId ? "submenu-open" : ""
                                }`}
                              onClick={() => toggleEmailBody(email.trackingId)}
                            >
                              <span>
                                {expandedEmailId === email.trackingId
                                  ? "Hide email preview"
                                  : "Show email preview"}
                              </span>

                              <span className="submenu-arrow">
                                <FontAwesomeIcon icon={faAngleRight} />
                              </span>
                            </div>

                            {expandedEmailId === email.trackingId && (
                              <div
                                style={{
                                  background: "#f3f4f6",
                                  padding: 12,
                                  borderRadius: 6,
                                  marginBottom: 8,
                                  fontSize: 14,
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                <div style={{ color: "#333" }}>
                                  {stripHtml(email.body) || "No email body available"}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
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
        <div className="modal-overlay">
          <div className="modal-content popup-modal">
            {/* Tabs at the very top */}
            <div style={{ 
              display: "flex", 
              borderBottom: "1px solid #e5e7eb", 
              marginBottom: "16px" 
            }}>
              <button
                onClick={() => setSegmentModalTab("create")}
                style={{
                  padding: "12px 16px",
                  background: "none",
                  border: "none",
                  borderBottom: segmentModalTab === "create" ? "2px solid #3f9f42" : "2px solid transparent",
                  color: segmentModalTab === "create" ? "#3f9f42" : "#666",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "16px"
                }}
              >
                Create new segment
              </button>
              <button
                onClick={() => setSegmentModalTab("move")}
                style={{
                  padding: "12px 16px",
                  background: "none",
                  border: "none",
                  borderBottom: segmentModalTab === "move" ? "2px solid #3f9f42" : "2px solid transparent",
                  color: segmentModalTab === "move" ? "#3f9f42" : "#666",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "16px"
                }}
              >
                Copy to existing segment
              </button>
            </div>

            <p style={{ marginRight: "auto", marginBottom: "16px" }}>
              {segmentModalTab === "create" ? "Creating segment" : "Copying"} with{" "}
              {viewMode === "detail" || segmentViewMode === "detail"
                ? detailSelectedContacts.size
                : selectedContacts.size}{" "}
              selected contact
              {(viewMode === "detail" || segmentViewMode === "detail"
                ? detailSelectedContacts.size
                : selectedContacts.size) > 1
                ? "s"
                : ""}
            </p>

            {/* Create new segment tab content */}
            {segmentModalTab === "create" && (
              <>
                <div style={{ marginBottom: "16px", width: "100%", textAlign: "left" }}>
                  <label style={{
                    display: "block",
                    marginBottom: "4px",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#333"
                  }}>Segment name <span style={{ color: "red" }}>*</span></label>
                  <input
                    type="text"
                    placeholder="Enter segment name"
                    value={segmentName}
                    onChange={(e) => setSegmentName(e.target.value)}
                    autoFocus
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "14px"
                    }}
                  />
                </div>
                <div style={{ marginBottom: "20px", width: "100%", textAlign: "left" }}>
                  <label style={{
                    display: "block",
                    marginBottom: "4px",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#333"
                  }}>Description</label>
                  <textarea
                    placeholder="Enter description (optional)"
                    value={segmentDescription}
                    onChange={(e) => setSegmentDescription(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "14px",
                      minHeight: "80px",
                      resize: "vertical"
                    }}
                    rows={3}
                  />
                </div>
              </>
            )}

            {/* Move to existing segment tab content */}
            {segmentModalTab === "move" && (
              <div style={{ marginBottom: "20px", width: "100%", textAlign: "left" }}>
                <label style={{
                  display: "block",
                  marginBottom: "4px",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#333"
                }}>Select segment <span style={{ color: "red" }}>*</span></label>
                <select
                  value={selectedExistingSegment}
                  onChange={(e) => setSelectedExistingSegment(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "14px"
                  }}
                >
                  <option value="">Choose a segment</option>
                  {segments.map((segment) => (
                    <option key={segment.id} value={segment.id}>
                      {segment.name} ({segment.contactCount || 0} contacts)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", marginLeft: "auto" }}>
              <button
                onClick={() => {
                  setShowSaveSegmentModal(false);
                  setSegmentModalTab("create");
                  setSelectedExistingSegment("");
                }}
                style={{
                  background: "#fff",
                  padding: "8px 16px",
                  color: "#666",
                  borderRadius: "4px",
                  border: "2px solid #ddd",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                Cancel
              </button>
              <button
                onClick={segmentModalTab === "create" ? handleSaveSegment : handleMoveToExistingSegment}
                disabled={
                  segmentModalTab === "create" 
                    ? (!segmentName || savingSegment)
                    : (!selectedExistingSegment || movingToSegment)
                }
                style={{
                  background: 
                    (segmentModalTab === "create" ? (!segmentName || savingSegment) : (!selectedExistingSegment || movingToSegment))
                      ? "#ccc" 
                      : "#218838",
                  padding: "8px 16px",
                  color: "#fff",
                  borderRadius: "4px",
                  border: `2px solid ${
                    (segmentModalTab === "create" ? (!segmentName || savingSegment) : (!selectedExistingSegment || movingToSegment))
                      ? "#ccc" 
                      : "#218838"
                  }`,
                  cursor: 
                    (segmentModalTab === "create" ? (!segmentName || savingSegment) : (!selectedExistingSegment || movingToSegment))
                      ? "not-allowed" 
                      : "pointer",
                  fontSize: "14px"
                }}
              >
                {segmentModalTab === "create" 
                  ? (savingSegment ? "Creating..." : "Create")
                  : (movingToSegment ? "Copying..." : "Copy")
                }
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
      <EditContactModal
        isOpen={showEditContactModal}
        onClose={() => {
          setShowEditContactModal(false);
          setEditingContact(null);
        }}
          notesHistory={notesHistory}     // ✅ FIXED

        contact={editingContact}
        onContactUpdated={() => {
          if (viewMode === "detail" && selectedDataFileForView) {
            fetchDetailContacts("list", selectedDataFileForView);
          } else if (segmentViewMode === "detail" && selectedSegmentForView) {
            fetchDetailContacts("segment", selectedSegmentForView);
          } else if (selectedDataFile) {
            fetchContacts();
          }
          setDetailSelectedContacts(new Set());
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