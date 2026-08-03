import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import API_BASE_URL from "../../config";
import "./ContactList.css";
import DynamicContactsTable from "./DynamicContactsTable";
import ToastMessage from "../common/ToastMessage";
import AddContactModal from "./AddContactModal";
import EditContactModal from "./contact_profile/EditContactModal";
import CreateListModal from "./CreateListModal";
import SegmentModal from "../common/SegmentModal";
import CommonSidePanel from "../common/CommonSidePanel";
import FilterBuilder from "../common/FilterBuilder";
import ContactViews from "./ContactViews";
import BulkUpdatePanel from "./BulkUpdatePanel";
import PopupModal from "../common/PopupModal";
import WebsiteGlobeIcon from "../common/WebsiteGlobeIcon";
import { formatUserDate, formatUserDateTime, formatUserTime } from "../common/dateTimePreferences";

import { useAppData } from "../../contexts/AppDataContext";
import { useToast } from "../../hooks/useToast";
import { useDispatch, useSelector } from "react-redux";
import {
  ContactsPageHeader,
  ContactsEmptyState,
  ContactsListsRows,
  ContactsToolbar,
} from "./ContactList.new";
import "./ContactList.new.css";
import { RootState } from "../../Redux/store";
import PaginationControls from "./PaginationControls";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import deleteIcon from "../../assets/images/deleteiconn.png";
import duplicateIcon from "../../assets/images/icons/duplicate.png";
import {
  TRACKING_BOT_CLICK_FIELD,
  TRACKING_CLICK_FIELD,
  TRACKING_OPEN_FIELD,
  TRACKING_SEND_DATE_FIELD,
} from "../../utils/trackingFilterUtils";

import {
  faAngleRight,
  faBars,
  faBullhorn,
  faDashboard,
  //faEdit,
  faEnvelopeOpen,
  faGear,
  faList,
  faRobot, // Add this for Campaign Builder

} from "@fortawesome/free-solid-svg-icons"
import { faEdit,faTrashAlt,faCircleXmark ,faFileLines   } from "@fortawesome/free-regular-svg-icons";
import { closePanel, openPanel } from "../../slices/panelSlice";
import { defaultButtonStyle, lessPriorityButtonStyle } from "../../styles/buttonStyles";
import useColumnPreferences from "../../hooks/useColumnPreferences";

/**
 * Columns shown to a client who has never arranged their own layout, and what
 * "Reset to default" restores. Everything else — including custom attributes —
 * starts hidden.
 */
const DEFAULT_VISIBLE_COLUMNS = [
  'first_name',
  'last_name',
  'full_name',
  'email',
  'company_name',
  'job_title',
  'country_or_address',
  'hasLinkedInInfo',
  'hasNotes',
];

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
const actionIconStyle = {
  width: 24,
  height: 24,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};
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
  first_name?: string;
  last_name?: string;
  full_name?: string;
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

const getContactNameParts = (contact: Contact) => {
  const first =
    contact.first_name?.trim() ||
    (contact as any).firstName?.trim() ||
    "";
  const last =
    contact.last_name?.trim() ||
    (contact as any).lastName?.trim() ||
    "";
  let full =
    contact.full_name?.trim() ||
    (contact as any).fullName?.trim() ||
    "";

  if (!full && (first || last)) {
    full = `${first} ${last}`.trim();
  }

  if (!first && !last && full) {
    const parts = full.split(" ").filter(Boolean);
    return {
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" ").trim(),
      fullName: full,
    };
  }

  return { firstName: first, lastName: last, fullName: full };
};

const getDisplayName = (contact: Contact) => {
  const { fullName } = getContactNameParts(contact);
  return fullName || contact.email || "-";
};

const getContactValue = (contact: Contact, key: string): any => {
  if (key === "first_name" || key === "last_name" || key === "full_name") {
    const { firstName, lastName, fullName } = getContactNameParts(contact);
    if (key === "first_name") return firstName || fullName || "";
    if (key === "last_name") return lastName || fullName || "";
    return fullName || "";
  }
  return (contact as any)[key];
};

interface ContactsResponse {
  contactCount: number;
  contacts: Contact[];
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
  const dispatch = useDispatch();
  const [activeSubTab, setActiveSubTab] = useState(initialTab);
  const [searchParams] = useSearchParams();

  const reduxUserId = useSelector((state: RootState) => state.auth.userId);

  const effectiveUserId =
    selectedClient?.trim() || reduxUserId || "";
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

  const activePanel = useSelector(
  (state: RootState) => state.panel.activePanel
  );

  const showCreateListCommonModal =
      activePanel === "create-list-modal";

  const showRenameContactListModal =
      activePanel === "rename-contact-list-modal";

  const showBulkUpdatePanelModal =
  activePanel === "bulk-update-panel-modal";

  const showAddContactCommonModal =
  activePanel === "add-contact-modal";

  
  const showSaveSegmentCommonModal =
  activePanel === "save-segment-modal";

  const showRenameSegmentCommonModal =
  activePanel === "rename-segment-modal";

  // Contact list states
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [totalContacts, setTotalContacts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageLists, setCurrentPageLists] = useState(1);
  const [pageSize, setPageSize] = useState<number | "All">(30);
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
  const [notesHistory, setNotesHistory] = useState<any[]>([]);
  const isDemoAccount = sessionStorage.getItem("isDemoAccount") === "true";

  const [activeFilters, setActiveFilters] = useState<any[]>([]);

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

  // Lightweight views summary - used for the header KPI strip (count + "added this month")
  const [headerViews, setHeaderViews] = useState<{ id: number; created_at?: string }[]>([]);
  const [isLoadingHeaderViews, setIsLoadingHeaderViews] = useState(false);


  const [viewRefreshToken, setViewRefreshToken] = useState(0);

  const { toast, showToast, hideToast } = useToast();
  const { refreshTrigger, triggerRefresh } = useAppData();
  const showContactMessage = (
    message: string,
    type: "success" | "error" | "info" | "warning"
  ) => {
    showToast(message, type, 3000);
  };
  // Existing states
  const [zohoClient, setZohoClient] = useState<ZohoClient[]>([]);
  const [selectedZohoViewForDeletion, setSelectedZohoViewForDeletion] =
    useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isDeletingContact, setIsDeletingContact] = useState(false);
  const [isCloningContact, setIsCloningContact] = useState(false);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);

  const [customFields, setCustomFields] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/Crm/custom-fields?clientId=${effectiveUserId}`)
      .then((res) => res.json())
      .then((data) => setCustomFields(data));
  }, [effectiveUserId]);

  // Custom attribute columns are keyed by field_name, so the layout needs the
  // id alongside it to survive a rename on the server.
  const customFieldIdByName = useMemo(() => {
    const map: Record<string, number> = {};
    (Array.isArray(customFields) ? customFields : []).forEach((field: any) => {
      if (field?.field_name && typeof field?.id === "number") {
        map[field.field_name] = field.id;
      }
    });
    return map;
  }, [customFields]);

  // Client-level column layout (show/hide + sequence), stored in the DB and
  // shared by every list, segment and saved view.
  const {
    layout: columnLayout,
    saveLayout: saveColumnLayout,
    resetLayout: resetColumnLayout,
    migratedLegacySelection,
  } = useColumnPreferences(effectiveUserId, {
    customFieldIdByName,
    onError: (message) => showContactMessage(message, "error"),
  });

  // A just-migrated localStorage selection stands in for the defaults, so the
  // columns a user had hidden before the move to the DB stay hidden.
  const defaultVisibleColumns = migratedLegacySelection ?? DEFAULT_VISIBLE_COLUMNS;

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
        name: "All contacts",
        data_file_name: "super_list",
        description: "All contacts from all lists",
        created_at: new Date().toISOString(),
        contacts: [],
        contactCount: superListCount
      };
      
      const orderedData = [...data].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, {
          sensitivity: "base",
        })
      );
      
      setDataFiles([superList, ...orderedData]);
       
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
  const formatDateTime = formatUserDateTime;

  const formatTime = formatUserTime;

  const toggleEmailBody = (trackingId: string) => {
    setExpandedEmailId(prev =>
      prev === trackingId ? null : trackingId
    );
  };
  //IST Formatter
  const formatDateTimeIST = formatUserDateTime;

const formatTimeIST = formatUserTime;

  // Handle data file change
  const handleDataFileChange = (dataFileId: string) => {
    setSelectedDataFile(dataFileId);
    setCurrentPage(1);
    setSelectedContacts(new Set());
  };
  // Replace the existing formatDate function with this:
  const formatDate = formatUserDate;
  // Filter contacts based on search query
  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const searchLower = searchQuery.toLowerCase()
      const { firstName, lastName, fullName } = getContactNameParts(contact);
      return (
        firstName.toLowerCase().includes(searchLower) ||
        lastName.toLowerCase().includes(searchLower) ||
        fullName.toLowerCase().includes(searchLower) ||
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

  const numericPageSize = getNumericPageSize(pageSize, filteredContacts.length);
  const startIndex = (currentPage - 1) * numericPageSize;
  const endIndex = Math.min(currentPage * numericPageSize, filteredContacts.length)

  // Load data when client changes or component mounts
  useEffect(() => {
    if (effectiveUserId) {
      fetchDataFiles();
      fetchSegments();
      fetchHeaderViews();
    }
  }, [effectiveUserId]);

  useEffect(() => {
    if (refreshTrigger > 0 && effectiveUserId) {
      fetchDataFiles();
    }
  }, [refreshTrigger, effectiveUserId]);

  // Load data when switching to List tab
  useEffect(() => {
    if (activeSubTab === "List" && effectiveUserId && dataFiles.length === 0 && !isLoading) {
      fetchDataFiles();
    }
  }, [activeSubTab, effectiveUserId]);


  // Fetch contacts when data file changes
  useEffect(() => {
    if (selectedDataFile && effectiveUserId) {
      fetchContacts();
    }
  }, [selectedDataFile, effectiveUserId]);

  useEffect(() => {
    setActiveSubTab(initialTab);
  }, [initialTab]);

  const viewNavigationToken = searchParams.get("t");

  useEffect(() => {
    if (activeSubTab === "View" && viewNavigationToken) {
      setViewRefreshToken((prev) => prev + 1);
    }
  }, [activeSubTab, viewNavigationToken]);

  // Clicking "Lists" in the sidebar should always return to the lists grid,
  // not the previously opened list detail. The nav token (?t=) lets us detect
  // the click even when the subtab is already "List". Skip when the URL points
  // at a specific list (dataFileId) so deep links still open the detail view.
  useEffect(() => {
    if (
      activeSubTab === "List" &&
      viewNavigationToken &&
      !searchParams.get("dataFileId")
    ) {
      setViewMode("list");
      setSelectedDataFileForView(null);
    }
  }, [activeSubTab, viewNavigationToken]);

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
  const [showBulkUpdatePanel, setShowBulkUpdatePanel] = useState(false);

  // Delete contacts from Lists
  const handleDeleteListContacts = async () => {
    const contactsToDelete = viewMode === "detail"
      ? Array.from(detailSelectedContacts)
      : Array.from(selectedContacts);

    if (contactsToDelete.length === 0) return;

    setShowDeleteConfirmation(false);

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

      showContactMessage(`${contactsToDelete.length} contact(s) deleted successfully!`, "success");

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
      showContactMessage("Failed to delete contacts", "error");
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

    setShowDeleteConfirmation(false);

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

      showContactMessage(`${contactsToDelete.length} contact(s) deleted successfully!`, "success");

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
      showContactMessage("Failed to delete contacts", "error");
    } finally {
      setIsDeletingContact(false);
    }
  };

  // Open a contact's profile in a new tab (used by the name link and by the
  // dedicated profile-icon column shown when the "Full name" column is hidden).
  const openContactProfile = (row: any) => {
    const dataFileId = row.dataFileId || selectedDataFileForView?.id;
    const contactDetailsUrl = `/#/contact-details/${row.id}?tab=DataCampaigns&subtab=List&dataFileId=${dataFileId}&clientId=${effectiveUserId}`;
    window.open(contactDetailsUrl, "_blank");
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
            showContactMessage(`${contact.email} has been unsubscribed successfully.`, "success");
          } else if (responseText === "Already Unsubscribed") {
            showContactMessage(`${contact.email} is already unsubscribed.`, "info");
          }
          successCount++;
        } else {
          errorCount++;
        }
      }

      if (errorCount > 0) {
        showContactMessage(`${errorCount} contact(s) failed to unsubscribe.`, "error");
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
      showContactMessage("Failed to unsubscribe contacts", "error");
    } finally {
      setIsUnsubscribing(false);
    }
  };

  // Helper function to get contact IDs for segment creation
  const getContactListSegmentIds = (): number[] => {
    const contactsToUse =
      viewMode === "detail"
        ? Array.from(detailSelectedContacts).map(Number)
        : segmentViewMode === "detail"
          ? Array.from(detailSelectedContacts).map(Number)
          : Array.from(selectedContacts).map(Number);
    
    return contactsToUse.filter((id): id is number => !isNaN(id) && id > 0);
  };

  // Get dataFileId for segment creation
  const getContactListDataFileId = (): number | null => {
    const dataFileToUse =
      viewMode === "detail"
        ? selectedDataFileForView?.id
        : segmentViewMode === "detail"
          ? selectedSegmentForView?.dataFileId
          : selectedDataFile;
    
    return dataFileToUse ? Number(dataFileToUse) : null;
  };

  // Clear selections after segment operation
  const clearContactListSelections = () => {
    if (viewMode === "detail" || segmentViewMode === "detail") {
      setDetailSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set());
    }
    
    // Refresh segments if on segment tab
    if (activeSubTab === "Segment") {
      fetchSegments();
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
  // Lightweight fetch used only to populate the "Total views" KPI in the header
  const fetchHeaderViews = async () => {
    if (!effectiveUserId) return;
    setIsLoadingHeaderViews(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/views-by-client?clientId=${effectiveUserId}`
      );
      if (!response.ok) throw new Error("Failed to fetch views");
      const data = await response.json();
      setHeaderViews(
        Array.isArray(data)
          ? data.map((v: any) => ({ id: v.id, created_at: v.created_at || v.createdAt }))
          : []
      );
    } catch (err) {
      setHeaderViews([]);
    } finally {
      setIsLoadingHeaderViews(false);
    }
  };

  const fetchSegments = async () => {
    if (!effectiveUserId) return;
    setIsLoadingSegments(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/get-segments-by-client?clientId=${effectiveUserId}`
      );
      if (!response.ok) throw new Error("Failed to fetch segments");
      const data = await response.json();
      setSegments(
        [...data].sort((a, b) =>
          (a.name || "").localeCompare(b.name || "", undefined, {
            sensitivity: "base",
          })
        )
      );
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
    } else {
      filtered = [...filtered].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, {
          sensitivity: "base",
        })
      );
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
      showContactMessage("Failed to delete list", "error");
    } finally {
      setIsLoading(false);
      setEditingList(null);
      setShowConfirmListDelete(false);
      dispatch(closePanel());
    }
  };

  // Add view mode states
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const [viewsDetailMode, setViewsDetailMode] = useState(false);
  const [selectedDataFileForView, setSelectedDataFileForView] =
    useState<DataFileItem | null>(null);
  const [segmentViewMode, setSegmentViewMode] = useState<"list" | "detail">(
    "list"
  );
  const [selectedSegmentForView, setSelectedSegmentForView] =
    useState<any>(null);

  // Add detail view states
  const [allDetailContacts, setAllDetailContacts] = useState<Contact[]>([]);
  const [detailContacts, setDetailContacts] = useState<Contact[]>([]);
  const filteredDetailContacts = useMemo(() => detailContacts, [detailContacts]);
  const [detailTotalContacts, setDetailTotalContacts] = useState(0);
  const [detailCurrentPage, setDetailCurrentPage] = useState(1);
  const [detailPageSize] = useState(30);
  const [detailSearchQuery, setDetailSearchQuery] = useState("");
  const [detailSelectedContacts, setDetailSelectedContacts] = useState<
    Set<string>
  >(new Set());
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteContactCount, setDeleteContactCount] = useState(0);

  // Add segment table states
  const [editingSegment, setEditingSegment] = useState<any>(null);
  const [renamingSegmentName, setRenamingSegmentName] = useState("");
  const [showConfirmSegmentDelete, setShowConfirmSegmentDelete] =
    useState(false);
  const [segmentActionsAnchor, setSegmentActionsAnchor] = useState<
    string | null
  >(null);

  const fetchAllContactsFromDataFiles = async () => {
    const dataFileIds = dataFiles
      .filter((file) => file.id !== -1)
      .map((file) => file.id);

    if (dataFileIds.length === 0) {
      return { contacts: [], contactCount: 0 };
    }

    const requests = dataFileIds.map(async (dataFileId) => {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/contacts/List-by-CleinteId?clientId=${effectiveUserId}&dataFileId=${dataFileId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch contacts");
      }
      const data = await response.json();
      const contacts = (data.contacts || []).map((contact: any) => ({
        ...contact,
        dataFileId,
      }));
      return contacts;
    });

    const results = await Promise.allSettled(requests);
    const merged = new Map<number, any>();

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        result.value.forEach((contact: any) => {
          const existing = merged.get(contact.id);
          merged.set(contact.id, existing ? { ...existing, ...contact } : contact);
        });
      }
    });

    const contacts = Array.from(merged.values());
    return { contacts, contactCount: contacts.length };
  };

  // Add after your other fetch functions
  const fetchDetailContacts = async (type: "list" | "segment", item: any) => {
    if (!item?.id || !effectiveUserId) return;

    setIsLoadingDetail(true);
    try {
      let url = "";
      if (type === "list") {
        // Check if Super List is selected
        if (item.id === -1) {
          const data = await fetchAllContactsFromDataFiles();
          setAllDetailContacts(data.contacts || []);
          setDetailContacts(data.contacts || []);
          setDetailTotalContacts(data.contactCount || 0);
          return;
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
        setAllDetailContacts(data.contacts || []);
        setDetailContacts(data.contacts || []);
        setDetailTotalContacts(data.contactCount || 0);
      } else {
        // Extract contacts from the new response structure
        setAllDetailContacts(data.contacts || []);
        setDetailContacts(data.contacts || []);
        setDetailTotalContacts(data.contactCount || 0);
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
      setAllDetailContacts([]);
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
      showContactMessage("List renamed successfully!", "success");
    } catch (error) {
      console.error("Failed to rename list:", error);
      showContactMessage("Failed to rename list. Please try again.", "error");
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
      showContactMessage("Segment renamed successfully!", "success");
    } catch (error) {
      console.error("Failed to rename segment:", error);
      showContactMessage("Failed to rename segment. Please try again.", "error");
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

      showContactMessage("Segment deleted successfully!", "success");
    } catch (error) {
      console.error("Failed to delete segment:", error);
      showContactMessage("Failed to delete segment. Please try again.", "error");
    } finally {
      setIsLoadingSegments(false);
      setEditingSegment(null);
      setShowConfirmSegmentDelete(false);
      dispatch(closePanel());
    }
  };

  const normalizeCustomFieldKey = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const getCustomFieldValue = (contact: any, fieldName: string) => {
    if (!contact) return "";

    const directKey = `custom_${fieldName}`;
    const normalizedKey = normalizeCustomFieldKey(fieldName);
    const normalizedDirectKey = `custom_${normalizedKey}`;
    if (contact[directKey] !== undefined) return contact[directKey];
    if (contact[normalizedDirectKey] !== undefined) return contact[normalizedDirectKey];
    if (contact[fieldName] !== undefined) return contact[fieldName];

    let customFieldsValue = contact.customFields;
    if (typeof customFieldsValue === "string") {
      try {
        customFieldsValue = JSON.parse(customFieldsValue);
      } catch {
        customFieldsValue = undefined;
      }
    }

    if (customFieldsValue && typeof customFieldsValue === "object") {
      if (fieldName in customFieldsValue) return customFieldsValue[fieldName];
      const normalizedTarget = normalizeCustomFieldKey(fieldName);
      const matchedEntry = Object.entries(customFieldsValue).find(
        ([key]) => normalizeCustomFieldKey(key) === normalizedTarget
      );
      if (matchedEntry) return matchedEntry[1];
    }

    return "";
  };

  type CsvColumn = {
    key: string;
    header: string;
    getValue?: (contact: any) => any;
  };

  const getCustomFieldColumns = (data: any[]): CsvColumn[] => {
    const fieldMap = new Map<string, string>();

    (customFields || []).forEach((field: any) => {
      if (!field?.field_name) return;
      const normalized = normalizeCustomFieldKey(field.field_name);
      if (!fieldMap.has(normalized)) {
        fieldMap.set(normalized, field.field_name);
      }
    });

    data.forEach((contact) => {
      let customFieldsValue = contact?.customFields;
      if (typeof customFieldsValue === "string") {
        try {
          customFieldsValue = JSON.parse(customFieldsValue);
        } catch {
          customFieldsValue = undefined;
        }
      }

      if (customFieldsValue && typeof customFieldsValue === "object") {
        Object.keys(customFieldsValue).forEach((key) => {
          const normalized = normalizeCustomFieldKey(key);
          if (!fieldMap.has(normalized)) {
            fieldMap.set(normalized, key);
          }
        });
      }

      Object.keys(contact || {}).forEach((key) => {
        if (key.startsWith("custom_")) {
          const rawKey = key.replace(/^custom_/, "");
          const normalized = normalizeCustomFieldKey(rawKey);
          if (!fieldMap.has(normalized)) {
            fieldMap.set(normalized, rawKey);
          }
        }
      });
    });

    return Array.from(fieldMap.entries()).map(([normalized, label]) => ({
      key: `custom_${normalized}`,
      header: label,
      getValue: (contact: any) => getCustomFieldValue(contact, label),
    }));
  };

  // Helper function to convert data to CSV
  const downloadCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      showContactMessage("No data to export", "warning");
      return;
    }
    // Define all possible columns
    const baseColumns: CsvColumn[] = [
      { key: "full_name", header: "Full Name" },
      { key: "first_name", header: "First Name" },
      { key: "last_name", header: "Last Name" },
      { key: "email", header: "Email" },
      { key: "job_title", header: "Job title" },
      { key: "company_name", header: "Company name" },
      { key: "companyTelephone", header: "Company telephone" },
      { key: "website", header: "Website" },
      { key: "country_or_address", header: "Country Or Address" },
      { key: "companyIndustry", header: "Company industry" },
      { key: "linkedin_url", header: "LinkedIn URL" },
      { key: "companyEmployeeCount", header: "Company Employee Count" },
      { key: "companyLinkedInURL", header: "Company LinkedIn URL" },
      { key: "hasLinkedInInfo", header: "LinkedIn Information" },
      { key: "hasNotes", header: "Notes" },
      { key: "unsubscribe", header: "Unsubscribe" },
      // { key: "companyEventLink", header: "Company Event Link" },
      { key: "created_at", header: "Created date" },
      { key: "updated_at", header: "Updated date" },
      { key: "email_sent_at", header: "Email Sent Date" },
    ];

    const customColumns: CsvColumn[] = getCustomFieldColumns(data);
    const allColumns = [...baseColumns, ...customColumns];

    // Use all columns instead of filtering by data availability
    const columnsToExport = allColumns;

    // Create header row with all columns
    const headers = columnsToExport.map((col) => col.header);

    // Map the data to CSV rows
    const csvRows = [
      headers.join(","), // Header row
      ...data.map((contact) => {
        const row = columnsToExport.map((column) => {
          let value = column.getValue ? column.getValue(contact) : contact[column.key];
          if (value === null || value === undefined) value = "";

          // Format boolean values for hasLinkedInInfo and hasNotes
          if (column.key === "hasLinkedInInfo" || column.key === "hasNotes") {
            value = value === true ? "Yes" : value === false ? "No" : "";
          }

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
        showContactMessage("No contacts to download", "warning");
        return;
      }

      // Download as CSV
      const filename = `${file.name.replace(/[^a-z0-9]/gi, "_")}_${new Date().toISOString().split("T")[0]
        }`;
      downloadCSV(contacts, filename);
    } catch (error) {
      console.error("Error downloading list:", error);
      showContactMessage("Failed to download list data", "error");
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
        showContactMessage("No contacts to download", "warning");
        return;
      }

      // Download as CSV
      const filename = `${segment.name.replace(/[^a-z0-9]/gi, "_")}_${new Date().toISOString().split("T")[0]
        }`;
      downloadCSV(contacts, filename);
    } catch (error) {
      console.error("Error downloading segment:", error);
      showContactMessage("Failed to download segment data", "error");
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
    } else {
      filtered = [...filtered].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, {
          sensitivity: "base",
        })
      );
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
    first_name: "First name",
    last_name: "Last name",
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
    companyLinkedInURL: "Company LinkedIn URL",
    companyEventLink: "Company event link",
    unsubscribe: "Unsubscribe",
    notes: "Notes",
    hasLinkedInInfo: "LinkedIn information",
    hasNotes: "Notes",
  };
  const segmentFilteredContacts = useMemo(() => {
    let filtered = segmentContacts.filter((contact) => {
      const searchLower = segmentSearchQuery.toLowerCase()
      const { firstName, lastName, fullName } = getContactNameParts(contact);
      return (
        firstName.toLowerCase().includes(searchLower) ||
        lastName.toLowerCase().includes(searchLower) ||
        fullName.toLowerCase().includes(searchLower) ||
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

const baseFields: any[] = [
  { key: "first_name", label: "First Name", type: "text" },
  { key: "last_name", label: "Last Name", type: "text" },
  { key: "full_name", label: "Full Name", type: "text" },
  { key: "email", label: "Email", type: "text" },
  { key: "company_name", label: "Company", type: "text" },
  { key: "job_title", label: "Job Title", type: "text" },
  { key: "country_or_address", label: "Country", type: "text" },
  { key: "companyIndustry", label: "Industry", type: "text" },
  { key: "companyEmployeeCount", label: "Employee Count", type: "number" },
  { key: "hasLinkedInInfo", label: "LinkedIn information", type: "boolean" },
  { key: "hasNotes", label: "Notes", type: "boolean" },
  {
    key: TRACKING_OPEN_FIELD,
    label: "Opened email",
    type: "boolean",
    contextType: "campaign",
  },
  {
    key: TRACKING_CLICK_FIELD,
    label: "Clicked email",
    type: "boolean",
    contextType: "campaign",
  },
  {
    key: TRACKING_BOT_CLICK_FIELD,
    label: "Bot click",
    type: "boolean",
    contextType: "campaign",
  },
  {
    key: TRACKING_SEND_DATE_FIELD,
    label: "Send date",
    type: "date",
    contextType: "campaign",
  },
];
const normalizeFilterFieldType = (fieldType?: string) => {
  switch ((fieldType || "").toLowerCase()) {
    case "number":
      return "number";
    case "date":
    case "datetime":
      return "date";
    case "boolean":
      return "boolean";
    case "dropdown":
      return "dropdown";
    case "longtext":
    case "text":
    default:
      return "text";
  }
};

const safeParseFilterOptions = (value?: string) => {
  if (!value) return undefined;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const customFieldOptions = useMemo(() => {
  return customFields.map((f: any) => ({
    key: `custom_${f.field_name}`,
    label: f.field_name,
    type: normalizeFilterFieldType(f.field_type),
    options: safeParseFilterOptions(f.options_json),
  }));
}, [customFields]);
const filterFields: any = useMemo(() => {
  return [...baseFields, ...customFieldOptions];
}, [customFieldOptions]);


  const superListContactCount = dataFiles.find((f) => f.id === -1)?.contactCount || 0;
  const totalDataFiles = dataFiles.filter((f) => f.id !== -1).length;
  const totalViews = headerViews.length;

  // "+N this month" deltas for the header KPI cards, derived from each item's creation date
  const isCreatedThisMonth = (dateString?: string | null) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  };
  const listsAddedThisMonth = dataFiles.filter((f) => f.id !== -1 && isCreatedThisMonth(f.created_at)).length;
  const viewsAddedThisMonth = headerViews.filter((v) => isCreatedThisMonth(v.created_at)).length;
  const segmentsAddedThisMonth = segments.filter((s) => isCreatedThisMonth(s.createdAt)).length;

  return (
    <div className="data-campaigns-container">
      {!(showContactPage ||
        (activeSubTab === "List" && viewMode === "detail") ||
        (activeSubTab === "View" && viewsDetailMode) ||
        (activeSubTab === "Segment" && segmentViewMode === "detail")
      ) && (
        <ContactsPageHeader
          totalContacts={superListContactCount}
          totalLists={totalDataFiles}
          totalViews={totalViews}
          totalSegments={segments.length}
          activeTab={
            activeSubTab === "View" ? "views" :
            activeSubTab === "Segment" ? "segments" : "lists"
          }
          listsDelta={`+${listsAddedThisMonth} this month`}
          viewsDelta={`+${viewsAddedThisMonth} this month`}
          segmentsDelta={`+${segmentsAddedThisMonth} this month`}
          showStats={true}
          onAddContact={() => dispatch(openPanel("add-contact-modal"))}
          onImportList={() => onAddContactClick?.()}
          onCreateList={(e) => {
            e.stopPropagation();
            dispatch(openPanel("create-list-modal"));
          }}
        />
      )}

      {/* Tab Content */}
      {activeSubTab === "List" && (
        <div className="list-content">
          {!showContactPage && (

            <div className="section-wrapper">
              {viewMode === "list" ? (
                <>
                  {totalDataFiles === 0 && !isLoading ? (
                    <ContactsEmptyState
                      onAddContact={() => dispatch(openPanel("add-contact-modal"))}
                      onImportList={() => onAddContactClick?.()}
                      onCreateList={() => dispatch(openPanel("create-list-modal"))}
                    />
                  ) : (
                    <>
                      <ContactsToolbar
                        search={listSearch}
                        onSearchChange={setListSearch}
                        sortKey={listSortKey}
                        sortDirection={listSortDirection as "asc" | "desc"}
                        onSort={() => handleListSort("created_at")}
                        currentPage={currentPageLists}
                        totalPages={totalPages1}
                        pageSize={pageSize}
                        totalRecords={filteredDatafiles.length}
                        onPageChange={setCurrentPageLists}
                        onPageSizeChange={setPageSize}
                        placeholder="Search a list name or ID"
                      />
                      <ContactsListsRows
                        data={currentData}
                        isLoading={isLoading}
                        sortKey={listSortKey}
                        sortDirection={listSortDirection as "asc" | "desc"}
                        onSort={handleListSort}
                        actionsAnchor={listActionsAnchor}
                        setActionsAnchor={setListActionsAnchor}
                        onRowClick={(file) => {
                          setSelectedDataFileForView(file as DataFileItem);
                          setViewMode("detail");
                          setDetailCurrentPage(1);
                          setDetailSearchQuery("");
                          setDetailSelectedContacts(new Set());
                        }}
                        onRename={(file) => {
                          setEditingList(file as DataFileItem);
                          dispatch(openPanel("rename-contact-list-modal"));
                          setRenamingListName(file.name);
                          setRenamingListDescription(file.description || "");
                        }}
                        onView={(file) => {
                          setSelectedDataFileForView(file as DataFileItem);
                          setViewMode("detail");
                          setDetailCurrentPage(1);
                          setDetailSearchQuery("");
                          setDetailSelectedContacts(new Set());
                        }}
                        onDownload={(file) => handleDownloadList(file as DataFileItem)}
                        onDelete={(file) => {
                          setEditingList(file as DataFileItem);
                          setShowConfirmListDelete(true);
                          dispatch(openPanel("rename-contact-list-modal"));
                        }}
                        isDemoAccount={isDemoAccount}
                        formatDate={formatDate}
                      />
                    </>
                  )}
                </>
              ) : (
                  <div style={{ padding: "20px 32px 24px" }}>
                <DynamicContactsTable
                  data={filteredDetailContacts}
                  isLoading={isLoadingDetail}
                  search={detailSearchQuery}
                  setSearch={setDetailSearchQuery}
                  showCheckboxes={true}
                  paginated={true}
                  currentPage={detailCurrentPage}
                  pageSize={detailPageSize}
                  onPageChange={setDetailCurrentPage}
                  onOpenProfile={openContactProfile}
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
                    "customFields",
                  ]} // Hide large/unwanted fields
                  onColumnsChange={saveColumnLayout}
                  onResetColumns={resetColumnLayout}
                  persistedColumnLayout={columnLayout}
                  defaultVisibleColumns={defaultVisibleColumns}
                  customFormatters={{
                    first_name: (value: any, row: any) => {
                      const { firstName, fullName } = getContactNameParts(row as Contact);
                      return firstName || fullName || "-";
                    },
                    last_name: (value: any, row: any) => {
                      const { lastName, fullName } = getContactNameParts(row as Contact);
                      return lastName || fullName || "-";
                    },
                    full_name: (value: any, row: any) => {
                      const displayName = getDisplayName(row as Contact);
                      if (!displayName || displayName === "-") return "-";

                      return (
                        <span
                          style={{
                            color: "#3f9f42",
                            textDecoration: "underline",
                            cursor: "pointer",
                            fontWeight: 500,
                          }}
                          onClick={(e) => {
                           e.stopPropagation();
                           openContactProfile(row);
                          }}
                        >
                          {displayName}
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
                            display: "inline-flex",
                            color: "#3f9f42",
                            textDecoration: "none",
                            cursor: "pointer",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <WebsiteGlobeIcon />
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

                    // LinkedIn Info status
                    hasLinkedInInfo: (value: any) => {
                      if (value === true) {
                        return <span style={{ color: "#28a745", fontSize: "16px" }}>✅</span>;
                      } else if (value === false) {
                        return <span style={{ color: "#dc3545", fontSize: "16px" }}>-</span>;
                      }
                      return "-";
                    },

                    // Notes status
                    hasNotes: (value: any) => {
                      if (value === true) {
                        return <span style={{ color: "#28a745", fontSize: "16px" }}>✅</span>;
                      } else if (value === false) {
                        return <span style={{ color: "#dc3545", fontSize: "16px" }}>-</span>;
                      }
                      return "-";
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
                    "first_name",
                    "last_name",
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
                  backLabel="Back to lists"
                  onAddItem={() => 
                    //setShowAddContactModal(true)
                    dispatch(openPanel("add-contact-modal"))

                  }
                  columnNameMap={columnNameMap}
                  customHeader={
                    <>
                      <div style={{ marginBottom: 16 }}>
                        <FilterBuilder
                          data={allDetailContacts}
                          fields={filterFields}
                          onFiltered={(data) => {
                            setDetailContacts(data);
                            setDetailTotalContacts(data.length);
                            setDetailCurrentPage(1);
                            setDetailSelectedContacts(new Set());
                          }}
                          clientId={effectiveUserId}
                          saveViewConfig={{
                            clientId: effectiveUserId,
                            dataFileIds:
                              selectedDataFileForView?.id === -1
                                ? []
                                : selectedDataFileForView
                                ? [selectedDataFileForView.id]
                                : [],
                            useAllDataFiles: selectedDataFileForView?.id === -1,
                            excludedDataFileIds:
                              selectedDataFileForView?.id === -1 ? [] : undefined,
                            onSuccess: (view) => {
                              setViewRefreshToken((prev) => prev + 1);
                              triggerRefresh();
                              showContactMessage(
                                `View "${view?.name || "Saved view"}" created successfully!`,
                                "success"
                              );
                            },
                            onError: (message) => showContactMessage(message, "error"),
                          }}
                        />
                      </div>
                      {detailSelectedContacts.size > 0 && (
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
                                  const contactId = Array.from(
                                    detailSelectedContacts
                                  )[0];
                                  try {
                                    setIsCloningContact(true);
                                    const response = await fetch(
                                      `${API_BASE_URL}/api/Crm/clone-contact?contactId=${contactId}`,
                                      { method: "POST", headers: { accept: "*/*" } }
                                    );
                                    if (!response.ok)
                                      throw new Error("Failed to clone contact");
                                    showContactMessage("Contact cloned successfully!", "success");
                                    if (selectedDataFileForView) {
                                      fetchDetailContacts(
                                        "list",
                                        selectedDataFileForView
                                      );
                                    }
                                    setDetailSelectedContacts(new Set());
                                  } catch (error) {
                                    showContactMessage("Failed to clone contact", "error");
                                  } finally {
                                    setIsCloningContact(false);
                                  }
                                }}
                                disabled={isCloningContact}
                                style={{
                                  background: "none",
                                  color: "#3f9f42",
                                  border: "none",
                                  borderRadius: "12px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: "40px",
                                  height: "40px",
                                  padding: "0",
                                  cursor: isCloningContact ? "not-allowed" : "pointer",
                                  opacity: isCloningContact ? 0.6 : 1
                                }}
                                title={isCloningContact ? "Cloning..." : "Clone contact"}
                              >
                                <img
                                  src={duplicateIcon}
                                  alt="Clone"
                                  style={{
                                    width: 22,
                                    height: 22,
                                    objectFit: "contain",
                                    filter: "invert(47%) sepia(82%) saturate(397%) hue-rotate(84deg) brightness(95%) contrast(90%)"
                                  }}
                                />
                              </button>
                            )}
                            <button
                              className="button secondary"
                              onClick={() => {
                                setDeleteContactCount(detailSelectedContacts.size);
                                setShowDeleteConfirmation(true);
                              }}
                              disabled={isDeletingContact}
                              style={{
                                background: "none",
                                color: "#3f9f42",
                                border: "none",
                                borderRadius: "12px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "40px",
                                height: "40px",
                                padding: "0",
                                cursor: isDeletingContact ? "not-allowed" : "pointer",
                                opacity: isDeletingContact ? 0.6 : 1
                              }}
                              title={isDeletingContact ? "Deleting..." : "Delete contacts"}
                            >
                              <FontAwesomeIcon
                                icon={faTrashAlt}
                                style={{ fontSize: 20, color: "#3f9f42" }}
                              />
                            </button>
                            <button
                              className="button secondary"
                              onClick={handleUnsubscribeContacts}
                              disabled={isUnsubscribing}
                              style={{
                                background: "none",
                                color: "#3f9f42",
                                border: "none",
                                borderRadius: "12px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "40px",
                                height: "40px",
                                padding: "0",
                                cursor: isUnsubscribing ? "not-allowed" : "pointer",
                                opacity: isUnsubscribing ? 0.6 : 1
                              }}
                              title={isUnsubscribing ? "Processing..." : "Unsubscribe"}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="22" width="22">
                                <path stroke="#3f9f42" strokeLinecap="round" strokeLinejoin="round" d="M11.25 17.25c0 1.5913 0.6321 3.1174 1.7574 4.2426 1.1252 1.1253 2.6513 1.7574 4.2426 1.7574 1.5913 0 3.1174 -0.6321 4.2426 -1.7574 1.1253 -1.1252 1.7574 -2.6513 1.7574 -4.2426 0 -1.5913 -0.6321 -3.1174 -1.7574 -4.2426 -1.1252 -1.1253 -2.6513 -1.7574 -4.2426 -1.7574 -1.5913 0 -3.1174 0.6321 -4.2426 1.7574 -1.1253 1.1252 -1.7574 2.6513 -1.7574 4.2426Z" strokeWidth="2"></path>
                                <path stroke="#3f9f42" strokeLinecap="round" strokeLinejoin="round" d="M14.25 17.25h6" strokeWidth="2"></path>
                                <path stroke="#3f9f42" strokeLinecap="round" strokeLinejoin="round" d="M8.25 15.75h-6c-0.39782 0 -0.77936 -0.158 -1.06066 -0.4393C0.908035 15.0294 0.75 14.6478 0.75 14.25v-12c0 -0.39782 0.158035 -0.77936 0.43934 -1.06066C1.47064 0.908035 1.85218 0.75 2.25 0.75h18c0.3978 0 0.7794 0.158035 1.0607 0.43934 0.2813 0.2813 0.4393 0.66284 0.4393 1.06066V9" strokeWidth="2"></path>
                                <path stroke="#3f9f42" strokeLinecap="round" strokeLinejoin="round" d="m21.41 1.30005 -8.143 6.264c-0.5783 0.44486 -1.2874 0.68606 -2.017 0.68606 -0.7296 0 -1.43873 -0.2412 -2.01701 -0.68606l-8.144 -6.264" strokeWidth="2"></path>
                              </svg>
                            </button>
                            <button
                              className="button primary"
                              onClick={() => {
                                //setShowSaveSegmentModal(true);
                                dispatch(openPanel("save-segment-modal"));

                                if (segments.length === 0) {
                                  fetchSegments();
                                }
                              }}
                              style={{
                                backgroundColor: 'transparent',
                                borderColor: 'transparent',
                                color: '#3f9f42',
                                border: 'none',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '40px',
                                height: '40px',
                                padding: '0',
                                cursor: 'pointer'
                              }}
                              title="Segment"
                            >
                              <svg
                                width="30"
                                height="30"
                                viewBox="0 0 100 100"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M50 50H85C85 69.33 69.33 85 50 85C30.67 85 15 69.33 15 50C15 30.67 30.67 15 50 15V50Z"
                                  stroke="#3f9f42"
                                  strokeWidth="6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M60 40V15C73.8071 15 85 26.1929 85 40H60Z"
                                  stroke="#3f9f42"
                                  strokeWidth="6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                            <button
                              className="button secondary"
                              onClick={() => 
                                //setShowBulkUpdatePanel(true)
                                dispatch(openPanel("bulk-update-panel-modal"))
                              }
                              style={{
                                background: "none",
                                color: "#3f9f42",
                                border: "none",
                                borderRadius: "12px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "40px",
                                height: "40px",
                                padding: "0",
                                cursor: "pointer"
                              }}
                              title="Bulk update"
                            >
                              <FontAwesomeIcon
                                icon={faEdit}
                                style={{ fontSize: 20, color: "#3f9f42" }}
                              />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  }
                // customColumns={customColumns}
                />
              </div>

              )}

              <CommonSidePanel
                isOpen={editingList !== null && !showConfirmListDelete && showRenameContactListModal}
                onClose={() => {
                  setEditingList(null);
                  setRenamingListName("");
                  setRenamingListDescription("");
                  dispatch(closePanel());
                }}
                title="Rename list"
                footerContent={
                  <>
                    <button
                      onClick={() => {
                        setEditingList(null);
                        setRenamingListName("");
                        setRenamingListDescription("");
                      }}
                      className="button secondary"
                      style={lessPriorityButtonStyle}
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
                        ...defaultButtonStyle,
                        cursor:
                          renamingListName.trim() &&
                            renamingListDescription.trim() &&
                            !isRenamingList
                            ? "pointer"
                            : "not-allowed",
                        opacity:
                          renamingListName.trim() &&
                            renamingListDescription.trim() &&
                            !isRenamingList
                            ? 1
                            : 0.5,
                      }}
                    >
                      {isRenamingList ? "Saving..." : "Save"}
                    </button>
                  </>
                }
              >
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
              </CommonSidePanel>

              {/* Delete confirmation modal - FIXED VERSION */}
              {editingList && showConfirmListDelete && createPortal(
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
                          dispatch(openPanel("rename-contact-list-modal"));
                          setEditingList(null);
                        }}
                        className="button secondary"
                        style={lessPriorityButtonStyle}
                      >
                        Cancel
                      </button>
                      <button
                        className="button primary"
                        style={{
                          padding: "8px 16px",
                          background: "var(--btn-danger-bg)",
                          color: "var(--btn-danger-fg)",
                          border: "1px solid var(--btn-danger-border)",
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
                </div>,
                document.body
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
                    showContactMessage(msg, type === "success" ? "success" : "error");
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
                    padding: "8px 16px",
                    background: "var(--btn-default-bg)",
                    color: "var(--btn-default-fg)",
                    border: "1px solid var(--btn-default-border)",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  ← Back
                </button>

                <h2 style={{ margin: 0, fontWeight: 600 }}>
                  {getDisplayName(editingContact)}
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
                     setAllDetailContacts(prev =>
                       prev.map(c =>
                     c.id === updatedContact.id ? updatedContact : c
                     ));
                     setDetailContacts(prev =>
                       prev.map(c =>
                     c.id === updatedContact.id ? updatedContact : c
                     ));
                     fetchContacts(); // optional, for list sync
                     }}
                    onShowMessage={(msg, type) => {
                      showContactMessage(msg, type === "success" ? "success" : "error");
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
                segments.length === 0 && !isLoadingSegments ? (
                  superListContactCount === 0 ? (
                    <ContactsEmptyState
                      onAddContact={() => dispatch(openPanel("add-contact-modal"))}
                      onImportList={() => onAddContactClick?.()}
                      onCreateList={() => dispatch(openPanel("create-list-modal"))}
                    />
                  ) : (
                    <div className="ct-rows">
                      <div className="ct-rows__msg">No segments created yet.</div>
                    </div>
                  )
                ) : (
                <>
                  <ContactsToolbar
                    search={segmentSearchQuery}
                    onSearchChange={setSegmentSearchQuery}
                    sortKey={segmentSortKey}
                    sortDirection={segmentSortDirection as "asc" | "desc"}
                    onSort={() => handleSegmentSort("createdAt")}
                    currentPage={segmentCurrentPage}
                    totalPages={segmentTotalPages}
                    pageSize={pageSize}
                    totalRecords={filteredSegments.length}
                    onPageChange={setSegmentCurrentPage}
                    onPageSizeChange={setPageSize}
                    placeholder="Search segments..."
                  />
                  <ContactsListsRows
                    data={paginatedSegments.map((seg) => ({
                      id: seg.id,
                      name: seg.name,
                      description: seg.description,
                      created_at: seg.createdAt,
                      contactCount: seg.contactCount ?? (seg.contacts?.length ?? 0),
                    })) as any[]}
                    isLoading={isLoadingSegments}
                    sortKey={segmentSortKey}
                    sortDirection={segmentSortDirection as "asc" | "desc"}
                    onSort={handleSegmentSort}
                    actionsAnchor={segmentActionsAnchor}
                    setActionsAnchor={setSegmentActionsAnchor}
                    onRowClick={(file) => {
                      const seg = segments.find((s) => s.id === file.id);
                      if (seg) { setSelectedSegmentForView(seg); setSegmentViewMode("detail"); setDetailCurrentPage(1); setDetailSearchQuery(""); setDetailSelectedContacts(new Set()); }
                    }}
                    onRename={(file) => {
                      const seg = segments.find((s) => s.id === file.id);
                      if (seg && !isDemoAccount) { setEditingSegment(seg); setRenamingSegmentName(seg.name); setRenamingSegmentDescription(seg.description || ""); dispatch(openPanel("rename-segment-modal")); }
                    }}
                    onView={(file) => {
                      const seg = segments.find((s) => s.id === file.id);
                      if (seg) { setSelectedSegmentForView(seg); setSegmentViewMode("detail"); setDetailCurrentPage(1); setDetailSearchQuery(""); setDetailSelectedContacts(new Set()); }
                    }}
                    onDownload={(file) => { const seg = segments.find((s) => s.id === file.id); if (seg) handleDownloadSegment(seg); }}
                    onDelete={(file) => {
                      const seg = segments.find((s) => s.id === file.id);
                      if (seg && !isDemoAccount) { setEditingSegment(seg); setShowConfirmSegmentDelete(true); dispatch(openPanel("rename-segment-modal")); }
                    }}
                    isDemoAccount={isDemoAccount}
                    formatDate={formatDate}
                  />

                </>
                )
              ) : (
                // Detail view for segments
                <div style={{ padding: "20px 32px 24px" }}>
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
                  onOpenProfile={openContactProfile}
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
                    "customFields",
                  ]}
                  onColumnsChange={saveColumnLayout}
                  onResetColumns={resetColumnLayout}
                  persistedColumnLayout={columnLayout}
                  defaultVisibleColumns={defaultVisibleColumns}
                  customFormatters={{
                    first_name: (value: any, row: any) => {
                      const { firstName, fullName } = getContactNameParts(row as Contact);
                      return firstName || fullName || "-";
                    },
                    last_name: (value: any, row: any) => {
                      const { lastName, fullName } = getContactNameParts(row as Contact);
                      return lastName || fullName || "-";
                    },
                    full_name: (value: any, row: any) => {
                      const displayName = getDisplayName(row as Contact);
                      if (!displayName || displayName === "-") return "-";

                      return (
                        <span
                          style={{
                            color: "#3f9f42",
                            textDecoration: "underline",
                            cursor: "pointer",
                            fontWeight: 500,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();

                            if (!selectedSegmentForView) {
                              console.error("No segment selected");
                              return;
                            }

                            // Use row.dataFileId if available, otherwise use segment's dataFileId
                            const dataFileId = row.dataFileId || selectedSegmentForView.dataFileId;
                            
                            const contactDetailsUrl = `/#/contact-details/${row.id}?tab=DataCampaigns&subtab=Segment&segmentId=${selectedSegmentForView.id}&dataFileId=${dataFileId}&clientId=${effectiveUserId}`;
                            window.open(contactDetailsUrl, "_blank");
                          }}
                        >
                          {displayName}
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
                            display: "inline-flex",
                            color: "#3f9f42",
                            textDecoration: "none",
                            cursor: "pointer",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <WebsiteGlobeIcon />
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

                    // LinkedIn Info status
                    hasLinkedInInfo: (value: any) => {
                      if (value === true) {
                        return <span style={{ color: "#28a745", fontSize: "16px" }}>✅</span>;
                      } else if (value === false) {
                        return <span style={{ color: "#dc3545", fontSize: "16px" }}>-</span>;
                      }
                      return "-";
                    },

                    // Notes status
                    hasNotes: (value: any) => {
                      if (value === true) {
                        return <span style={{ color: "#28a745", fontSize: "16px" }}>✅</span>;
                      } else if (value === false) {
                        return <span style={{ color: "#dc3545", fontSize: "16px" }}>-</span>;
                      }
                      return "-";
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
                    "first_name",
                    "last_name",
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
                  backLabel="Back to segments"
                  customHeader={
                    <>
                      <div style={{ marginBottom: 16 }}>
                        <FilterBuilder
                          data={allDetailContacts}
                          fields={filterFields}
                          onFiltered={(data) => {
                            setDetailContacts(data);
                            setDetailTotalContacts(data.length);
                            setDetailCurrentPage(1);
                            setDetailSelectedContacts(new Set());
                          }}
                          clientId={effectiveUserId}
                          saveViewConfig={{
                            clientId: effectiveUserId,
                            dataFileIds: [],
                            segmentIds: selectedSegmentForView
                              ? [selectedSegmentForView.id]
                              : [],
                            onSuccess: (view) => {
                              setViewRefreshToken((prev) => prev + 1);
                              triggerRefresh();
                              showContactMessage(
                                `View "${view?.name || "Saved view"}" created successfully!`,
                                "success"
                              );
                            },
                            onError: (message) => showContactMessage(message, "error"),
                          }}
                        />
                      </div>
                      {detailSelectedContacts.size > 0 && (
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
                                  showContactMessage("Contact cloned successfully!", "success");
                                  if (selectedSegmentForView) {
                                    fetchDetailContacts("segment", selectedSegmentForView);
                                  }
                                  setDetailSelectedContacts(new Set());
                                } catch (error) {
                                  showContactMessage("Failed to clone contact", "error");
                                } finally {
                                  setIsCloningContact(false);
                                }
                              }}
                              disabled={isCloningContact}
                              style={{
                                background: "none",
                                color: "#3f9f42",
                                border: "none",
                                borderRadius: "12px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "40px",
                                height: "40px",
                                padding: "0",
                                cursor: isCloningContact ? "not-allowed" : "pointer",
                                opacity: isCloningContact ? 0.6 : 1
                              }}
                              title={isCloningContact ? "Cloning..." : "Clone contact"}
                            >
                              <img
                                src={duplicateIcon}
                                alt="Clone"
                                style={{
                                  width: 22,
                                  height: 22,
                                  objectFit: "contain",
                                  filter: "invert(47%) sepia(82%) saturate(397%) hue-rotate(84deg) brightness(95%) contrast(90%)"
                                }}
                              />
                            </button>
                          )}
                          <button
                            className="button secondary"
                            onClick={() => {
                              setDeleteContactCount(detailSelectedContacts.size);
                              setShowDeleteConfirmation(true);
                            }}
                            disabled={isDeletingContact}
                            style={{
                              background: "none",
                              color: "#3f9f42",
                              border: "none",
                              borderRadius: "12px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "40px",
                              height: "40px",
                              padding: "0",
                              cursor: isDeletingContact ? "not-allowed" : "pointer",
                              opacity: isDeletingContact ? 0.6 : 1
                            }}
                            title={isDeletingContact ? "Deleting..." : "Remove"}
                          >
                            <FontAwesomeIcon
                              icon={faTrashAlt}
                              style={{ fontSize: 20, color: "#3f9f42" }}
                            />
                          </button>
                          <button
                            className="button secondary"
                            onClick={handleUnsubscribeContacts}
                            disabled={isUnsubscribing}
                            style={{
                              background: "none",
                              color: "#3f9f42",
                              border: "none",
                              borderRadius: "12px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "40px",
                              height: "40px",
                              padding: "0",
                              cursor: isUnsubscribing ? "not-allowed" : "pointer",
                              opacity: isUnsubscribing ? 0.6 : 1
                            }}
                            title={isUnsubscribing ? "Processing..." : "Unsubscribe"}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="22" width="22">
                              <path stroke="#3f9f42" strokeLinecap="round" strokeLinejoin="round" d="M11.25 17.25c0 1.5913 0.6321 3.1174 1.7574 4.2426 1.1252 1.1253 2.6513 1.7574 4.2426 1.7574 1.5913 0 3.1174 -0.6321 4.2426 -1.7574 1.1253 -1.1252 1.7574 -2.6513 1.7574 -4.2426 0 -1.5913 -0.6321 -3.1174 -1.7574 -4.2426 -1.1252 -1.1253 -2.6513 -1.7574 -4.2426 -1.7574 -1.5913 0 -3.1174 0.6321 -4.2426 1.7574 -1.1253 1.1252 -1.7574 2.6513 -1.7574 4.2426Z" strokeWidth="2"></path>
                              <path stroke="#3f9f42" strokeLinecap="round" strokeLinejoin="round" d="M14.25 17.25h6" strokeWidth="2"></path>
                              <path stroke="#3f9f42" strokeLinecap="round" strokeLinejoin="round" d="M8.25 15.75h-6c-0.39782 0 -0.77936 -0.158 -1.06066 -0.4393C0.908035 15.0294 0.75 14.6478 0.75 14.25v-12c0 -0.39782 0.158035 -0.77936 0.43934 -1.06066C1.47064 0.908035 1.85218 0.75 2.25 0.75h18c0.3978 0 0.7794 0.158035 1.0607 0.43934 0.2813 0.2813 0.4393 0.66284 0.4393 1.06066V9" strokeWidth="2"></path>
                              <path stroke="#3f9f42" strokeLinecap="round" strokeLinejoin="round" d="m21.41 1.30005 -8.143 6.264c-0.5783 0.44486 -1.2874 0.68606 -2.017 0.68606 -0.7296 0 -1.43873 -0.2412 -2.01701 -0.68606l-8.144 -6.264" strokeWidth="2"></path>
                            </svg>
                          </button>
                          <button
                            className="button primary"
                            onClick={() => 
                              //setShowSaveSegmentModal(true)
                              dispatch(openPanel("save-segment-modal"))
                            }
                            style={{ 
                              backgroundColor: 'transparent',
                              borderColor: 'transparent',
                              color: '#3f9f42',
                              border: 'none',
                              borderRadius: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '40px',
                              height: '40px',
                              padding: '0',
                              cursor: 'pointer'
                            }}
                            title="Segment"
                          >
                            <svg
                              width="30"
                              height="30"
                              viewBox="0 0 100 100"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M50 50H85C85 69.33 69.33 85 50 85C30.67 85 15 69.33 15 50C15 30.67 30.67 15 50 15V50Z"
                                stroke="#3f9f42"
                                strokeWidth="6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M60 40V15C73.8071 15 85 26.1929 85 40H60Z"
                                stroke="#3f9f42"
                                strokeWidth="6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                          <button
                            className="button secondary"
                            onClick={() => 
                              //setShowBulkUpdatePanel(true)
                              dispatch(openPanel("bulk-update-panel-modal"))
                            }
                            style={{
                              background: "none",
                              color: "#3f9f42",
                              border: "none",
                              borderRadius: "12px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "40px",
                              height: "40px",
                              padding: "0",
                              cursor: "pointer"
                            }}
                            title="Bulk Update"
                          >
                            <FontAwesomeIcon
                              icon={faEdit}
                              style={{ fontSize: 20, color: "#3f9f42" }}
                            />
                          </button>
                        </div>
                      </div>
                      )}
                    </>
                  }
                />
                </div>
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
                    padding: "8px 16px",
                    background: "var(--btn-default-bg)",
                    color: "var(--btn-default-fg)",
                    border: "1px solid var(--btn-default-border)",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  ← Back
                </button>

                <h2 style={{ margin: 0, fontWeight: 600 }}>
                  {getDisplayName(editingContact)}
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
                     setAllDetailContacts(prev =>
                     prev.map(c =>
                     c.id === updatedContact.id ? updatedContact : c
                     ));
                     setDetailContacts(prev =>
                     prev.map(c =>
                     c.id === updatedContact.id ? updatedContact : c
                     ));
                     fetchContacts(); // optional, for list sync
                     }}
                    onShowMessage={(msg, type) => {
                      showContactMessage(msg, type === "success" ? "success" : "error");
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

      <div style={{ display: activeSubTab === "View" ? "block" : "none" }}>
        {totalViews === 0 && !isLoadingHeaderViews && !viewsDetailMode ? (
          superListContactCount === 0 ? (
            <ContactsEmptyState
              onAddContact={() => dispatch(openPanel("add-contact-modal"))}
              onImportList={() => onAddContactClick?.()}
              onCreateList={() => dispatch(openPanel("create-list-modal"))}
            />
          ) : (
            <div className="ct-rows">
              <div className="ct-rows__msg">No views created yet.</div>
            </div>
          )
        ) : (
        <ContactViews
          clientId={effectiveUserId}
          filterFields={filterFields}
          isActive={activeSubTab === "View"}
          refreshToken={viewRefreshToken}
          columnNameMap={columnNameMap}
          persistedColumnLayout={columnLayout}
          onColumnsChange={saveColumnLayout}
          onResetColumns={resetColumnLayout}
          defaultVisibleColumns={defaultVisibleColumns}
          onShowMessage={(message, type) => {
            showContactMessage(message, type === "success" ? "success" : "error");
          }}
          onViewModeChange={(mode) => setViewsDetailMode(mode === "detail")}
        />
        )}
      </div>

      {/* Rename Segment Modal */}
      <CommonSidePanel
        isOpen={editingSegment !== null && !showConfirmSegmentDelete && showRenameSegmentCommonModal}
        onClose={() => {
          setEditingSegment(null);
          setRenamingSegmentName("");
          setRenamingSegmentDescription("");
          dispatch(closePanel());
        }}
        title="Rename segment"
        footerContent={
          <>
            <button
              onClick={() => {
                setEditingSegment(null);
                setRenamingSegmentName("");
                setRenamingSegmentDescription("");
              }}
              className="button secondary"
              style={lessPriorityButtonStyle}
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
                ...defaultButtonStyle,
                cursor:
                  renamingSegmentName.trim() &&
                    !isRenamingSegment
                    ? "pointer"
                    : "not-allowed",
                opacity:
                  renamingSegmentName.trim() &&
                    !isRenamingSegment
                    ? 1
                    : 0.5,
              }}
            >
              {isRenamingSegment ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
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
      </CommonSidePanel>

      {/* Delete Segment Confirmation Modal */}
      {editingSegment && showConfirmSegmentDelete && createPortal(
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
                  dispatch(closePanel());
                  setEditingSegment(null);
                }}
                className="button secondary"
                style={lessPriorityButtonStyle}
              >
                Cancel
              </button>
              <button
                className="button primary"
                style={{
                  padding: "8px 16px",
                  background: "var(--btn-danger-bg)",
                  color: "var(--btn-danger-fg)",
                  border: "1px solid var(--btn-danger-border)",
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
        </div>,
        document.body
      )}

      <SegmentModal
        //isOpen={showSaveSegmentModal}
        isOpen={showSaveSegmentCommonModal}
        onClose={() => 
          //setShowSaveSegmentModal(false)
          dispatch(closePanel())
        }
        selectedContactsCount={
          viewMode === "detail" || segmentViewMode === "detail"
            ? detailSelectedContacts.size
            : selectedContacts.size
        }
        effectiveUserId={effectiveUserId}
        token={sessionStorage.getItem("token")}
        dataFileId={getContactListDataFileId()}
        onSuccess={(message) => showContactMessage(message, "success")}
        onError={(message) => showContactMessage(message, "error")}
        onContactsCleared={clearContactListSelections}
        getContactIds={getContactListSegmentIds}
      />

      <CreateListModal
        //isOpen={showCreateListModal}
        isOpen={showCreateListCommonModal}
        onClose={() => 
          //setShowCreateListModal(false)
          dispatch(closePanel())

        }
        selectedClient={selectedClient}
        onListCreated={async () => {
          await fetchDataFiles();
          triggerRefresh();
        }}
        onShowMessage={(message, type) => {
          showContactMessage(message, type === "success" ? "success" : "error");
        }}
      />
      <AddContactModal
        //isOpen={showAddContactModal}
        isOpen={showAddContactCommonModal}
        onClose={() => 
          //setShowAddContactModal(false)
          dispatch(closePanel())
        }
        dataFileId={selectedDataFileForView?.id?.toString() || selectedDataFile}
        clientId={effectiveUserId}
        onContactAdded={() => {
          // Refresh the data files grid to update contact counts
          fetchDataFiles();
          
          if (viewMode === "detail" && selectedDataFileForView) {
            fetchDetailContacts("list", selectedDataFileForView);
          } else if (segmentViewMode === "detail" && selectedSegmentForView) {
            fetchDetailContacts("segment", selectedSegmentForView);
          } else if (selectedDataFile) {
            fetchContacts();
          }
        }}
        onShowMessage={(message, type) => {
          showContactMessage(message, type === "success" ? "success" : "error");
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
          showContactMessage(message, type === "success" ? "success" : "error");
        }}
      />
      <ToastMessage
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={hideToast}
        duration={3}
        position="bottom-center"
      />
      <BulkUpdatePanel
        //isOpen={showBulkUpdatePanel}
        isOpen={showBulkUpdatePanelModal}
        onClose={() => 
          //setShowBulkUpdatePanel(false)
          dispatch(closePanel())
        }
        selectedContactIds={
          viewMode === "detail" || segmentViewMode === "detail"
            ? Array.from(detailSelectedContacts)
            : Array.from(selectedContacts)
        }
        clientId={effectiveUserId}
        onUpdateComplete={() => {
          // Refresh the appropriate grid based on current view
          if (viewMode === "detail" && selectedDataFileForView) {
            fetchDetailContacts("list", selectedDataFileForView);
          } else if (segmentViewMode === "detail" && selectedSegmentForView) {
            fetchDetailContacts("segment", selectedSegmentForView);
          } else if (selectedDataFile) {
            fetchContacts();
          }
          
          // Clear selections after update
          if (viewMode === "detail" || segmentViewMode === "detail") {
            setDetailSelectedContacts(new Set());
          } else {
            setSelectedContacts(new Set());
          }
        }}
      />
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
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
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Delete contacts</h3>
            <p style={{ marginBottom: 20 }}>
              Are you sure you want to delete this {deleteContactCount} contact{deleteContactCount > 1 ? 's' : ''}?
            </p>
            <div
              style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="button secondary"
                style={lessPriorityButtonStyle}
              >
                Cancel
              </button>
              <button
                className="button primary"
                style={{
                  padding: "8px 16px",
                  background: "var(--btn-danger-bg)",
                  color: "var(--btn-danger-fg)",
                  border: "1px solid var(--btn-danger-border)",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
                onClick={() => {
                  if (activeSubTab === "Segment" || segmentViewMode === "detail") {
                    handleDeleteSegmentContacts();
                  } else {
                    handleDeleteListContacts();
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataCampaigns;
