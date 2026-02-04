import React, { useRef, useCallback, useEffect, useState } from "react";
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
} from "@fortawesome/free-solid-svg-icons";
import { faEnvelope, faFileAlt } from "@fortawesome/free-regular-svg-icons";
import { usePageTitle } from "../hooks/usePageTitle";
import "./MainPage.css";
import Modal from "./common/Modal";
import AppModal from "../components/common/AppModal";
import pitchLogo from "../assets/images/pitch_logo.png";
import Template from "./feature/blueprint/Template"; // Add this import

import { useAppModal } from "../hooks/useAppModal";
import { useSelector } from "react-redux";
import ReactQuill from "react-quill-new";
import Mail from "./feature/Mail";
import "react-quill-new/dist/quill.snow.css";
import { RootState } from "../Redux/store";
import { systemPrompt, Languages } from "../utils/label";
import Output from "./feature/Output";
import DataFile from "./feature/datafile";
import axios from "axios";
import Header from "./common/Header";
import API_BASE_URL from "../config";
import { useDispatch } from "react-redux";
import { useModel } from "../ModelContext";
import { AppDispatch } from "../Redux/store"; // ✅ import AppDispatch
import DataCampaigns from "./feature/ContactList"; // Adjust the path based on your file structure
import CampaignManagement from "./feature/CampaignManagement";
import { useAppData } from "../contexts/AppDataContext";
import { Dashboard } from "./feature/Dashboard";
import EmailCampaignBuilder from "./feature/blueprint/EmailCampaignBuilder";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { saveUserCredit } from "../slices/authSLice";
import { useCreditCheck } from "../hooks/useCreditCheck";
import CreditCheckModal from "./common/CreditCheckModal";
import Myplan from "./feature/Myplan";
import { useSoundAlert } from "./common/useSoundAlert";

interface Prompt {
  id: number;
  name: string;
  text: string;
  userId?: number; // userId might not always be returned from the API
  createdAt?: string;
  template?: string;
}

const modules = {
  toolbar: [
    [
      { header: "1" },
      { header: "2" },
      { header: "3" },
      { header: "4" },
      { header: "5" },
      { header: "6" },
      [{ size: ["14px", "16px", "18px"] }],
      { font: [] },
    ],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    // ["blockquote", "code-block"],
    [{ script: "sub" }, { script: "super" }],
    // ["link", "image", "video"],
    ["clean"],
  ],
};

interface SearchTermForm {
  searchCount: string;
  searchTerm: string;
  instructions: string;
  output: string;
  [key: string]: string; // For any additional properties
}

interface Client {
  firstName: string;
  lastName: string;
  clientID: number;
  companyName: string;
}

interface PitchGenDataResponse {
  data: EmailEntry[];
  nextPageToken?: string;
  more_records?: boolean;
}
interface Campaign {
  id: number;
  campaignName: string;
  promptId: number;
  zohoViewId: string;
  clientId: number;
  description?: string;
}

interface OutputInterface {
  outputForm: {
    generatedContent: string;
    linkLabel: string;
    usage: string;
    currentPrompt: string;
    searchResults: string[];
    allScrapedData: string;
  };
  isResetEnabled: boolean;

  onRegenerateContact?: (
    tab: string,
    options: {
      regenerate: boolean;
      regenerateIndex: number;
      nextPageToken?: string | null;
      prevPageToken?: string | null;
    },
  ) => void;

  outputFormHandler: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  setOutputForm: React.Dispatch<
    React.SetStateAction<{
      generatedContent: string;
      linkLabel: string;
      usage: string;
      currentPrompt: string;
      searchResults: string[];
      allScrapedData: string;
    }>
  >;
  allResponses: any[];
  isPaused: boolean;
  setAllResponses: React.Dispatch<React.SetStateAction<any[]>>;
  currentIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  onClearOutput: () => void;
  allprompt: any[];
  setallprompt: React.Dispatch<React.SetStateAction<any[]>>;
  allsearchResults: any[];
  setallsearchResults: React.Dispatch<React.SetStateAction<any[]>>;
  everyscrapedData: any[];
  seteveryscrapedData: React.Dispatch<React.SetStateAction<any[]>>;
  allSearchTermBodies: string[];
  setallSearchTermBodies: React.Dispatch<React.SetStateAction<string[]>>;
  onClearContent?: (clearContent: () => void) => void;
  allsummery: any[];
  setallsummery: React.Dispatch<React.SetStateAction<any[]>>;
  existingResponse: any[];
  setexistingResponse: React.Dispatch<React.SetStateAction<any[]>>;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  prevPageToken: string | null;
  nextPageToken: string | null;
  fetchAndDisplayEmailBodies: (
    zohoviewId: string,
    pageToken?: string | null,
    direction?: "next" | "previous" | null,
  ) => Promise<void>;
  selectedZohoviewId: string;
  onClearExistingResponse?: (clearFunction: () => void) => void;
  recentlyAddedOrUpdatedId?: string | number | null;
  setRecentlyAddedOrUpdatedId?: React.Dispatch<
    React.SetStateAction<string | number | null>
  >;
  selectedClient: string;
  isStarted?: boolean;
  handleStart?: (startIndex?: number) => void;
  handlePauseResume?: () => void;
  handleReset?: () => void;
  handleStop?: () => void; // Add this line
  isPitchUpdateCompleted?: boolean;
  allRecordsProcessed?: boolean;
  isDemoAccount?: boolean;
  settingsForm?: any;
  settingsFormHandler?: (e: any) => void;
  delayTime?: string;
  setDelay?: (value: string) => void;
  selectedCampaign?: string;
  isProcessing?: boolean;
  handleClearAll?: () => void;
  campaigns?: any[];
  handleCampaignChange?: (e: any) => void;
  selectionMode?: string;
  promptList?: any[];
  handleSelectChange?: (e: any) => void;
  userRole?: string; // Make sure this is included
  dataFiles?: any[];
  handleZohoModelChange?: (e: any) => void;
  emailLoading?: boolean;
  languages?: any[];
  selectedLanguage?: string;
  handleLanguageChange?: (e: any) => void;
  subjectMode?: string;
  setSubjectMode?: (value: string) => void;
  subjectText?: string;
  setSubjectText?: (value: string) => void;
  selectedPrompt: Prompt | null;
}
interface EmailEntry {
  email_subject: string;
  id?: string;
  full_Name?: string;
  job_Title?: string;
  account_name_friendlySingle_Line_12?: string;
  mailing_Country?: string;
  website?: string;
  linkedIn_URL?: string;
  sample_email_body?: string;
  generated: boolean;
  email?: string;
  last_Email_Body_updated?: string; // Add this line
  pG_Processed_on1?: string; // Add this line
}

interface SettingsFormType {
  overwriteDatabase: boolean;
  // Add any other properties that your settingsForm has
}
const MainPage: React.FC = () => {
  const unlockAudio = () => {
    const audio = new Audio(
      process.env.PUBLIC_URL + "/assets/sound/notification.mp3",
    );
    audio.volume = 0; // silent
    audio.play().catch(() => {});
  };
  const { playSound } = useSoundAlert();
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem("soundEnabled") !== "false";
  });
  useEffect(() => {
    localStorage.setItem("soundEnabled", String(isSoundEnabled));
  }, [isSoundEnabled]);
  const isSoundEnabledRef = useRef(isSoundEnabled);

  useEffect(() => {
    isSoundEnabledRef.current = isSoundEnabled;
    localStorage.setItem("soundEnabled", String(isSoundEnabled));
  }, [isSoundEnabled]);
  // Credit check hook
  const {
    credits,
    showCreditModal,
    checkUserCredits,
    closeCreditModal,
    handleSkipModal,
  } = useCreditCheck();

  // Listen for credit modal event from login
  useEffect(() => {
    const handleShowCreditModal = () => {
      if (credits === 0 && !localStorage.getItem("creditModalSkipped")) {
        checkUserCredits();
      }
    };

    window.addEventListener("showCreditModal", handleShowCreditModal);
    return () =>
      window.removeEventListener("showCreditModal", handleShowCreditModal);
  }, [credits, checkUserCredits]);

  // Modal states
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info" as "success" | "error" | "warning" | "info" | "confirm",
    onConfirm: () => {},
    onCancel: () => {},
  });

  // Context and hooks
  const appData = useAppData();
  const triggerRefresh = appData.triggerRefresh;
  const setClientSettings = appData.setClientSettings;
  const clientSettings = appData.clientSettings;
  const refreshTrigger = appData.refreshTrigger;
  const clientId = useSelector((state: RootState) => state.client.clientId);
  const [formData, setFormData] = useState({
    Server: "",
    Port: "",
    Username: "",
    Password: "",
    useSsl: "",
  });

  const [showPopup, setShowPopup] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [userRole, setUserRole] = useState<string>(""); // Store user role
  const userId = useSelector((state: RootState) => state.auth.userId);
  const [selectedDataFile, setSelectedDataFile] = useState(null);
  const [allsearchResults, setallsearchResults] = useState<any[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [allResponses, setAllResponses] = useState<any[]>([]);
  const [everyscrapedData, seteveryscrapedData] = useState<any[]>([]);
  const [allprompt, setallprompt] = useState<any[]>([]);
  const [allSearchTermBodies, setallSearchTermBodies] = useState<string[]>([]);
  const [clearContentFunction, setClearContentFunction] = useState<
    (() => void) | null
  >(null);
  const [allsummery, setallsummery] = useState<any[]>([]);
  const [loading, setLoading] = useState(true); // Initial loading state for fetching Zoho clients
  const [emailLoading, setEmailLoading] = useState(false); // Loading state for fetching email data

  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [prevPageToken, setPrevPageToken] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [existingResponse, setexistingResponse] = useState<any[]>([]);
  const [clearExistingResponse, setClearExistingResponse] = useState<
    () => void
  >(() => {});
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [clientNames, setClientNames] = useState<Client[]>([]);

  const processCacheRef = useRef<Record<string, any>>({});
  const [allRecordsProcessed, setAllRecordsProcessed] = useState(false);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [selectionMode, setSelectionMode] = useState<"manual" | "campaign">(
    "manual",
  );

  const stopRef = useRef(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPitchUpdateCompleted, setIsPitchUpdateCompleted] = useState(false);
  const [pitchGenData, setPitchGenData] = useState<PitchGenDataResponse>({
    data: [],
  }); // Store the entire response

  const apiUrl = `${API_BASE_URL}/api/auth/getprompts/${userId}`;
  const [promptList, setPromptList]: any = useState([]);
  const [pitchResponses, setPitchResponses] = useState([]);
  const [, forceUpdate] = useState(false); // Force re-render

  const [recentlyAddedOrUpdatedId, setRecentlyAddedOrUpdatedId] = useState<
    string | number | null
  >(null);

  const dispatch = useDispatch<AppDispatch>(); // ✅ type the dispatch
  const { selectedModelName, setSelectedModelName } = useModel();
  const [selectedZohoviewId, setSelectedZohoviewId] = useState<string>("");
  const {
    username,
    firstName,
    lastName,
    ipAddress,
    browserName,
    browserVersion,
  } = useSelector((state: RootState) => state.auth);

  //submenu
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);

  const initialTab = queryParams.get("tab") || "Dashboard";
  const initialContactsSubTab = queryParams.get("subtab") || "List";
  const initialMailSubTab = queryParams.get("mailSubTab") || "Dashboard";

  // states initialized correctly
  const [tab, setTab] = useState<string>(initialTab);
  const [mailSubTab, setMailSubTab] = useState<string>(initialMailSubTab);
  const [contactsSubTab, setContactsSubTab] = useState<string>(
    initialContactsSubTab,
  );

  // Update page title when tab changes
  useEffect(() => {
    const getPageTitle = () => {
      switch (tab) {
        case "Dashboard":
          return "Dashboard - View progress and help videos";
        case "TestTemplate":
          return "Blueprints - Create and manage email blueprints";
        case "Playground":
          return "Playground - Experiment with email generation";
        case "DataCampaigns":
          return contactsSubTab === "List"
            ? "Contact Lists - Create and manage contacts and segments"
            : "Contact Segments - Create and manage contacts and segments";
        case "Campaigns":
          return "Campaigns - Create and manage email campaigns";
        case "Output":
          return "Kraft Emails - Generate hyper-personalized emails";
        case "Mail":
          return mailSubTab === "Dashboard"
            ? "Mail Dashboard - Configure email, schedule sends and review analytics"
            : mailSubTab === "Configuration"
              ? "Mail Configuration - Configure email, schedule sends and review analytics"
              : "Mail Schedules - Configure email, schedule sends and review analytics";
        case "MyPlan":
          return "My Plan";
        default:
          return "Dashboard";
      }
    };

    document.title = `${getPageTitle()} - PitchKraft`;
  }, [tab, contactsSubTab, mailSubTab]);

  const [showMailSubmenu, setShowMailSubmenu] = useState(initialTab === "Mail");
  const [showContactsSubmenu, setShowContactsSubmenu] = useState(false);

  useEffect(() => {
    // Safety reset for stuck loader after login
    const timer = setTimeout(() => {
      setIsFetchingContacts?.(false);
      setIsLoadingClientSettings?.(false);
    }, 2000); // 2s fallback in case fetch fails silently
    return () => clearTimeout(timer);
  }, []);

  // update states when query changes

  useEffect(() => {
    setTab(initialTab);

    setContactsSubTab(initialContactsSubTab);

    setMailSubTab(initialMailSubTab);
  }, [initialTab, initialContactsSubTab, initialMailSubTab]);

  const [showDataFileUpload, setShowDataFileUpload] = useState(false);

  const [isLoadingClientSettings, setIsLoadingClientSettings] = useState(false);
  const clientID = sessionStorage.getItem("clientId");
  const [lastLoadedClientId, setLastLoadedClientId] = useState<string | null>(
    null,
  );
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(
    null,
  );
  const appModal = useAppModal();

  interface DataFile {
    id: number;
    client_id: number;
    name: string;
    data_file_name: string;
    description: string;
    created_at: string;
    contacts: any[];
  }

  const handleClearContent = useCallback((clearContent: () => void) => {
    setClearContentFunction(() => clearContent);
  }, []);

  // Async stop function to allow context switching
  const stop = () => {
    stopRef.current = !stopRef.current;
    forceUpdate((prev) => !prev);
    setIsPaused(!isPaused);
    // Don't reset lastProcessedToken and lastProcessedIndex here
    // They will be used when resuming
  };

  // Campaign fetching effect

  useEffect(() => {
    const fetchCampaigns = async () => {
      console.log(selectedClient, clientID);
      if (!selectedClient && !clientID) {
        setCampaigns([]);
        return;
      }

      setLoading(true);
      try {
        let url = `${API_BASE_URL}/api/auth/campaigns/client`;
        if (selectedClient) {
          url += `/${selectedClient}`;
        } else if (clientID) {
          url += `/${clientID}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("data", data);
        setCampaigns(data);
        //  setCampaigns(data.campaigns || []);
      } catch (error) {
        console.error("Error fetching campaigns:", error);
        setCampaigns([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [selectedClient, clientID, refreshTrigger]);
  //Dropdown Of Client
  useEffect(() => {
    const fetchClientData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/allUserDetails`);
        const data: Client[] = await response.json();
        setClientNames(data);
      } catch (error) {
        console.error("Error fetching client details:", error);
      }
    };

    if (userRole === "ADMIN") {
      fetchClientData();
    }
  }, [userRole, API_BASE_URL]);

  // Function to handle user's response
  const handlePopupResponse = (shouldStop: boolean) => {
    setShowPopup(false);
    if (!shouldStop) {
      stopRef.current = false; // Reset stop request if user cancels
    }
  };

  const handleNewDataFileSelection = () => {
    // Call the clear function when a new data file is selected
    if (clearExistingResponse) {
      clearExistingResponse();
    }

    // Additional logic for handling new data file selection can be added here
  };

  // Handle change event for the select element
  const handleZohoModelChange = async (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const selectedId = event.target.value;

    // Switch to manual mode when selecting a data file
    if (selectedId) {
      setSelectionMode("manual");
      setSelectedCampaign(""); // Clear campaign selection
    }

    // ✅ Fix: Set selectedZohoviewId in the correct format
    const formattedZohoviewId = `${clientID || effectiveUserId},${selectedId}`;
    setSelectedZohoviewId(formattedZohoviewId);
    console.log("Setting selectedZohoviewId to:", formattedZohoviewId);

    // Call the clear function when a new data file is selected
    handleNewDataFileSelection();

    if (selectedId && (clientID || effectiveUserId)) {
      try {
        // Use the formatted zohoviewId
        await fetchAndDisplayEmailBodies(formattedZohoviewId);
      } catch (error) {
        console.error("Error fetching email bodies:", error);
      }
    }
  };

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLabel = event.target.value;
    // Switch to manual mode when selecting a prompt
    if (selectedLabel) {
      setSelectionMode("manual");
      setSelectedCampaign(""); // Clear campaign selection
    }

    const prompt = promptList.find((p: Prompt) => p.name === selectedLabel);
    setSelectedPrompt(prompt || null);
  };

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setSelectedPrompt((prev) => ({
      ...prev!,
      body: e.target.value,
    }));
    console.log(setSelectedPrompt, "selectedPitch");
  };

  const [selectedLanguage, setSelectedLanguage] = useState<Languages>(
    Object.values(Languages).includes("English" as Languages)
      ? ("English" as Languages)
      : Object.values(Languages)[0],
  );

  const [zohoClient, setZohoClient] = useState<ZohoClient[]>([]);

  const handleLanguageChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setSelectedLanguage(event.target.value as Languages);
  };

  const [openModals, setOpenModals] = useState<{ [key: string]: boolean }>({});

  const handleModalOpen = (id: string) => {
    setOpenModals((prev) => ({ ...prev, [id]: true }));
  };

  const handleModalClose = (id: string) => {
    setOpenModals((prev) => ({ ...prev, [id]: false }));
  };

  const handleClientChange = async (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const newClientId = event.target.value;
    setSelectedClient(newClientId);

    // Reset everything when switching clients
    setSelectedPrompt(null);
    setSelectedZohoviewId("");
    setSelectedCampaign("");
    setSelectionMode("manual");
    setPromptList([]);
    setClientSettings(null);

    // Clear all local form states (they will later be overwritten
    // automatically by loadCampaignBlueprint() when user selects a campaign)
    setSearchTermForm({
      searchCount: "",
      searchTerm: "",
      instructions: "",
      output: "",
    });

    setSettingsForm({
      systemInstructions: "",
      subjectInstructions: "",
      emailTemplate: "",
    });

    setSelectedModelName("gpt-5"); // default model, will be overwritten by campaign

    // Trigger refresh for dependent UI
    triggerRefresh();
  };

  useEffect(() => {
    const isAdminString = sessionStorage.getItem("isAdmin");
    const isAdmin = isAdminString === "true"; // Correct comparison
    setUserRole(isAdmin ? "ADMIN" : "USER");
  }, []);

  const [delayTime, setDelay] = useState<number>(0);
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [cachedContacts, setCachedContacts] = useState<any[]>([]);
  const effectiveUserId = selectedClient !== "" ? selectedClient : userId;

  //  Close popup when clicking outside for support details
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowSupportPopup(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSubjectTextChange = (value: string) => {};

  const buildReplacements = (
    entry: any,
    currentDate: string,
    toneSettings: any,
    scrappedData?: string,
  ) => {
    return {
      company_name: entry.company_name || entry.company || "",
      company_name_friendly: entry.company_name_friendly || entry.company || "",
      job_title: entry.job_title || entry.title || "",
      location: entry.country_or_address || entry.location || "",
      full_name: entry.full_name || entry.name || "",
      linkedin_url: entry.linkedin_url || entry.linkedin || "",
      website: entry.website || "",
      date: currentDate,
      notes: entry.notes || "",

      // ✅ Add here, with optional default
      search_output_summary: scrappedData || "",

      // Tone Settings tab values
      language: toneSettings.language || "",
      emojis: toneSettings.emojis || "",
      tone: toneSettings.tone || "",
      chatty: toneSettings.chatty || "",
      creativity: toneSettings.creativity || "",
      reasoning: toneSettings.reasoning || "",
      dateGreeting: toneSettings.dateGreeting || "",
      dateFarewell: toneSettings.dateFarewell || "",
    };
  };

  const [isFetchingContacts, setIsFetchingContacts] = useState(false);
  const [followupEnabled, setFollowupEnabled] = useState(false);

  const fetchAndDisplayEmailBodies = useCallback(
    async (
      zohoviewId: string, // Format: "clientId,dataFileId" OR "segment_segmentId"
      pageToken: string | null = null,
      direction: "next" | "previous" | null = null,
      forceFollowup?: boolean,
    ) => {
      try {
        setIsFetchingContacts(true); // Start loader

        setEmailLoading(true);

        const effectiveUserId =
          selectedClient !== "" ? Number(selectedClient) : Number(userId);

        if (!effectiveUserId || effectiveUserId <= 0) {
          console.error("Invalid userId or clientID:", effectiveUserId);
          return;
        }

        let contactsData = [];
        let dataFileId: string | null = null;
        let segmentId: string | null = null;

        // ✅ Check if this is a segment-based call
        if (zohoviewId.startsWith("segment_")) {
          // Extract segmentId from "segment_123" format
          segmentId = zohoviewId.replace("segment_", "");
          console.log("Fetching segment contacts for segmentId:", segmentId);

          // ✅ Fetch from segment API
          const url = `${API_BASE_URL}/api/Crm/contacts/by-client-segment?clientId=${effectiveUserId}&segmentId=${segmentId}&isFollowUp=${forceFollowup ?? followupEnabled}`;
          const response = await fetch(url);

          if (!response.ok) {
            throw new Error("Failed to fetch segment contacts");
          }

          const fetchedSegmentData = await response.json();
          contactsData = fetchedSegmentData.contacts || [];
          console.log("Fetched segment contacts:", contactsData);
        } else {
          // ✅ Original datafile logic - ensure dataFileId is valid
          // Parse zohoviewId to get clientId and dataFileId
          const [clientId, extractedDataFileId] = zohoviewId.split(",");
          dataFileId = extractedDataFileId;

          // ✅ Validation: ensure dataFileId is not undefined
          if (!dataFileId || dataFileId === "undefined") {
            console.error(
              "Invalid dataFileId:",
              dataFileId,
              "from zohoviewId:",
              zohoviewId,
            );
            throw new Error("Invalid dataFileId - cannot fetch contacts");
          }

          // Use effectiveUserId instead of selectedClient in URL
          const url = `${API_BASE_URL}/api/crm/contacts/by-client-datafile?clientId=${effectiveUserId}&dataFileId=${dataFileId}&isFollowUp=${forceFollowup ?? followupEnabled}`;
          console.log("Fetching datafile contacts with URL:", url);
          const response = await fetch(url);

          if (!response.ok) {
            throw new Error("Failed to fetch email bodies");
          }

          const fetchedEmailData = await response.json();
          contactsData = fetchedEmailData.contacts || [];
          console.log("Fetched datafile contacts:", contactsData);
        }

        // ✅ Rest of the function with added dataFileId and segmentId
        setCachedContacts(contactsData);

        if (!Array.isArray(contactsData)) {
          console.error("Invalid data format");
          return;
        }
        const emailResponses = contactsData.map((entry: any) => ({
          id: entry.id,
          dataFileId: dataFileId || entry.dataFileId || "null", // Add dataFileId to response
          segmentId: segmentId || "null", // Add segmentId to response
          name: entry.full_name || "N/A",
          title: entry.job_title || "N/A",
          company: entry.company_name || "N/A",
          location: entry.country_or_address || "N/A",
          website: entry.website || "N/A",
          linkedin: entry.linkedin_url || "N/A",
          pitch: entry.email_body || "No email body found",
          timestamp: entry.created_at || new Date().toISOString(),
          nextPageToken: null,
          prevPageToken: null,
          generated: false,
          subject: entry.email_subject || "N/A",
          email: entry.email || "N/A",
          lastemailupdateddate: entry.updated_at || "N/A",
          emailsentdate: entry.email_sent_at || "N/A",
          notes: entry.notes || "",
        }));

        const newItemsCount = emailResponses.length;
        const naPlaceholders = new Array(newItemsCount).fill("NA");
        const emptyArrayPlaceholders = new Array(newItemsCount).fill([]);

        setexistingResponse(emailResponses);
        setAllResponses(emailResponses);
        setallprompt(naPlaceholders);
        setallsearchResults(emptyArrayPlaceholders);
        seteveryscrapedData(naPlaceholders);
        setallsummery(naPlaceholders);
        setallSearchTermBodies(naPlaceholders);

        // Don't automatically set index when refetching due to followup change
        // Only set to valid index on initial load
        if (!followupEnabled && direction === null) {
          // Find first valid contact BEFORE setting index
          let validIndex = 0;
          for (let i = 0; i < emailResponses.length; i++) {
            const contact = emailResponses[i];
            if (contact.name !== "N/A" && contact.company !== "N/A") {
              validIndex = i;
              break;
            }
          }

          // Set to the valid index directly
          setCurrentIndex(validIndex);
          console.log("Setting current index to:", validIndex);
        }
      } catch (error) {
        console.error("Error fetching email bodies:", error);
      } finally {
        setEmailLoading(false);
        setIsFetchingContacts(false); // Stop loader
      }
    },
    [selectedClient, userId, followupEnabled],
  );

  // Refetch data when followup checkbox changes
  useEffect(() => {
    if (selectedZohoviewId) {
      console.log(
        "Followup checkbox changed, refetching data:",
        followupEnabled,
      );
      console.log("Current selectedZohoviewId:", selectedZohoviewId);
      console.log("Current index before refetch:", currentIndex);

      // Store current index before refetch
      const savedIndex = currentIndex;

      // ✅ Fix: Ensure selectedZohoviewId is in correct format
      let correctedZohoviewId = selectedZohoviewId;

      // If it's just a number (dataFileId) and not segment format, fix it
      if (
        !selectedZohoviewId.startsWith("segment_") &&
        !selectedZohoviewId.includes(",")
      ) {
        correctedZohoviewId = `${effectiveUserId},${selectedZohoviewId}`;
        console.log("Corrected selectedZohoviewId to:", correctedZohoviewId);
        // Also update the state to prevent future issues
        setSelectedZohoviewId(correctedZohoviewId);
      }

      fetchAndDisplayEmailBodies(correctedZohoviewId).then(() => {
        // Restore index after data is fetched
        setTimeout(() => {
          console.log("Restoring index to:", savedIndex);
          setCurrentIndex(savedIndex);
        }, 100);
      });
    }
  }, [followupEnabled, effectiveUserId]);

  // Handle followup checkbox change
  const handleFollowupChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFollowupEnabled(event.target.checked);
  };

  const sendEmail = async (
    cost: number,
    failedReq: number,
    successReq: number,
    scrapfailedReq: number,
    totaltokensused: number,
    timeSpent: string,
    startTime: Date | null,
    endTime: Date | null,
    generatedPitches: any[] = [],
    promptText: string = "No prompt template was selected",
    isPauseReport: boolean = false,
  ) => {
    // use the values from the top of your component!
    const formattedStartTime = startTime ? startTime.toLocaleString() : "N/A";
    const formattedEndTime = endTime ? endTime.toLocaleString() : "N/A";
    const lastPitch =
      generatedPitches.length > 0
        ? generatedPitches[generatedPitches.length - 1].pitch
        : "No pitches were generated in this session";
    const ipLink =
      ipAddress && ipAddress !== "Unavailable"
        ? `<a href="https://whatismyipaddress.com/ip/${ipAddress}" target="_blank">${ipAddress}</a>`
        : ipAddress || "Unavailable";

    // Modify the subject line to indicate if this is a pause report
    const reportType = isPauseReport ? "Pause Report" : "Processing Report";

    const emailData = {
      To: "info@groupji.co, rushikeshg@groupji.co",
      Subject: reportType,
      Body: `
        <html>
        <head>
            <style>
                body, html { margin: 0 !important; padding: 0 !important; line-height: 1.4 !important; font-family: Arial, sans-serif; }
                div { margin: 0 0 10px 0 !important; }
                .section { margin-bottom: 20px !important; padding-bottom: 10px !important; border-bottom: 1px solid #eee; }
                .pitch { background-color: #f9f9f9; padding: 15px; border-left: 4px solid #4CAF50; margin: 10px 0; }
                .report-type { color: ${
                  isPauseReport ? "orange" : "green"
                }; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="section">
                <h2><span class="report-type">${reportType}</span></h2>
                ${
                  isPauseReport
                    ? "<p><strong>Status:</strong> Process was paused by the user</p>"
                    : ""
                }
            </div>
            <div class="section">
                <h2>User Info:</h2>
                <p><strong>Username:</strong> ${username || "N/A"}</p>
                <p><strong>User ID:</strong> ${userId || "N/A"}</p>
                <p><strong>User Role:</strong> ${userRole || "N/A"}</p>
                <p><strong>First Name:</strong> ${firstName || "N/A"}</p>
                <p><strong>Last Name:</strong> ${lastName || "N/A"}</p>
            </div>
            <div class="section">
                <h2>Device Info:</h2>
                <p><strong>IP Address:</strong> ${ipLink}</p>
                <p><strong>Browser:</strong> ${browserName || "N/A"}</p>
                <p><strong>Browser Version:</strong> ${
                  browserVersion || "N/A"
                }</p>
            </div>
            <div class="section">
                <h2>Timings:</h2>
                <p><strong>Start time of the process:</strong> ${formattedStartTime}</p>
                <p><strong>End time of the process:</strong> ${formattedEndTime}</p>
                <p><strong>Time spent:</strong> ${timeSpent}</p>
            </div>
            <div class="section">
                <h2>Costs:</h2>
                <p><strong>Total records successfully processed:</strong> ${successReq}</p>
                <p><strong>Total records failed to process:</strong> ${failedReq}</p>
                <p><strong>Total scrap data failed requests:</strong> ${scrapfailedReq}</p>
                <p><strong>Total tokens used:</strong> ${totaltokensused}</p>
                <p><strong>Total cost of the transaction:</strong> $${cost.toFixed(
                  2,
                )}</p>
            </div>
            <div class="section">
                <h2>Prompt Template Used:</h2>
                <div class="prompt">${promptText}</div>
            </div>
            <div class="section">
                <h2>Last Generated Pitch:</h2>
                <div class="pitch">${lastPitch}</div>
            </div>
            <div class="section">
                <h2>Generated Pitches Count:</h2>
                <p>${generatedPitches.length}</p>
            </div>
        </body>
        </html>
      `,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/sendemail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailData),
      });

      if (!response.ok)
        throw new Error(`Failed to send email: ${response.statusText}`);

      const result = await response.json();
      console.log(`${reportType} email sent successfully:`, result);
    } catch (error) {
      console.error(`Error sending ${reportType.toLowerCase()}:`, error);
    }
  };

  var cost = 0;
  var failedReq = 0;
  var successReq = 0;
  var scrapfailedreq = 0;
  var totaltokensused = 0;

  // Helper function to format date and time
  function formatDateTime(date: Date): string {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are zero-based
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
  }

  const analyzeScrapedData = (
    scrapedData: string,
  ): { original: number; assisted: number } => {
    if (!scrapedData) return { original: 0, assisted: 0 };

    // Count occurrences of text1 (original) and text2 (assisted)
    const originalCount = (scrapedData.match(/text1\s*=/g) || []).length;
    const assistedCount = (scrapedData.match(/text2\s*=/g) || []).length;

    return { original: originalCount, assisted: assistedCount };
  };

  // Load Campaign Blueprint when a campaign is selected
  // 🧠 Define this function above goToTab (not inside useEffect)
  // Load Campaign Blueprint when a campaign is selected
  const loadCampaignBlueprint = async (selectedCampaign: string) => {
    console.log(
      "Fetching campaign details for selected campaign:",
      selectedCampaign,
    );

    const campaignResponse = await fetch(
      `${API_BASE_URL}/api/auth/campaigns/${selectedCampaign}`,
    );
    if (!campaignResponse.ok)
      throw new Error("Failed to fetch campaign details");
    const campaignData = await campaignResponse.json();

    const clientId = campaignData.clientId;
    const templateId = campaignData.templateId;

    if (!templateId || !clientId)
      throw new Error("Missing templateId or clientId");

    let blueprint = "";
    let matchedTemplate: any = null;

    // 🔹 1. Fetch blueprint + placeholderValues from template
    const bpResp = await fetch(
      `${API_BASE_URL}/api/CampaignPrompt/campaign/${templateId}`,
    );
    let bpJson: any = {};
    if (bpResp.ok) {
      bpJson = await bpResp.json();

      blueprint = (
        bpJson.campaignBlueprint ||
        bpJson.aiInstructions ||
        bpJson.masterBlueprint ||
        bpJson.templateBlueprint ||
        ""
      ).toString();

      // ---------------------------------------------------------
      // ⭐⭐⭐ ADD YOUR REQUIRED LOGIC HERE
      // ---------------------------------------------------------

      const pv = bpJson.placeholderValues || {};

      // ✅ Subject config from placeholderValues
      // ✅ Subject config from placeholderValues (STORE RAW STRING)
      const subjectConfig = {
        aiMode: (pv["email_subject-AI"] || "").toString().toLowerCase(), // "yes" | "no"
        manualTemplate: pv["email_subject-manual"] || "",
      };

      sessionStorage.setItem(
        "campaignSubjectConfig",
        JSON.stringify(subjectConfig),
      );

      setSearchTermForm({
        searchTerm: pv.hook_search_terms || "",
        instructions: pv.search_objective || "",
        searchCount: bpJson.searchURLCount?.toString() || "1",
        output: "",
      });

      // Set selected GPT Model
      setSelectedModelName(bpJson.selectedModel || "gpt-5");

      if (bpJson.subjectInstructions) {
        setSettingsForm((prev: any) => ({
          ...prev,
          subjectInstructions: bpJson.subjectInstructions,
        }));
      }
      console.log("🎯 Loaded from DB:", {
        searchTerm: pv.hook_search_terms,
        instructions: pv.search_objective,
        searchCount: bpJson.searchURLCount,
        model: bpJson.selectedModel,
      });

      // ---------------------------------------------------------
    }

    // 🔹 2. Fallback: fetch from client templates
    if (!blueprint.trim()) {
      const templatesResp = await fetch(
        `${API_BASE_URL}/api/CampaignPrompt/templates/${clientId}`,
      );
      if (templatesResp.ok) {
        const templatesJson = await templatesResp.json();
        matchedTemplate = (templatesJson.templates || []).find(
          (t: any) => t.id === templateId,
        );
        blueprint = (
          matchedTemplate?.campaignBlueprint ||
          matchedTemplate?.aiInstructions ||
          matchedTemplate?.masterBlueprint ||
          ""
        ).toString();
      }
    }

    if (!blueprint.trim())
      throw new Error(`No blueprint found for templateId: ${templateId}`);

    // Prepare prompt
    const campaignBlueprintPrompt = {
      id: templateId,
      name:
        matchedTemplate?.templateName ||
        campaignData.templateName ||
        `Template ${templateId}`,
      text: blueprint,
      model: matchedTemplate?.selectedModel || "gpt-5",
    };

    // Save to React + sessionStorage
    setSelectedPrompt(campaignBlueprintPrompt);
    sessionStorage.setItem(
      "selectedPrompt",
      JSON.stringify(campaignBlueprintPrompt),
    );

    console.log(
      "✅ Blueprint set:",
      campaignBlueprintPrompt.name,
      campaignBlueprintPrompt.text.substring(0, 120),
    );

    return campaignBlueprintPrompt;
  };

  useEffect(() => {
    if (selectedCampaign) {
      loadCampaignBlueprint(selectedCampaign).catch((err) =>
        console.error("❌ Blueprint load failed in useEffect:", err),
      );
    }
  }, [selectedCampaign]);

  // =====================================================
  // 🟢 STEP 3: READ subject config from campaign placeholders
  // =====================================================
  const getSubjectMode = () => {
    try {
      const cfg = JSON.parse(
        sessionStorage.getItem("campaignSubjectConfig") || "{}",
      );

      // Explicit NO → manual subject
      if (cfg.aiMode === "no") {
        return {
          isAI: false,
          manualTemplate: cfg.manualTemplate || "",
        };
      }

      // YES / missing / invalid → AI subject
      return {
        isAI: true,
        manualTemplate: cfg.manualTemplate || "",
      };
    } catch {
      return {
        isAI: true,
        manualTemplate: "",
      };
    }
  };
  const totalEmailTokensRef = useRef(0);
const totalEmailCostRef = useRef(0);
const totalEmailCountRef = useRef(0); // <-- emails, NOT api calls

useEffect(() => {
  console.log(
    "Current prompt length:",
    allprompt[currentIndex]?.length
  );
}, [allprompt, currentIndex]);

  const goToTab = async (
    tab: string,
    options?: {
      regenerate?: boolean;
      regenerateIndex?: number;
      nextPageToken?: string | null;
      prevPageToken?: string | null;
      startFromIndex?: number;
      useCachedData?: boolean;
    },
  ) => {
    let lastEmailTokens = 0;
    let lastEmailCost = 0;
    let lastEmailGenerations = 0;

  
    // Calculate effectiveUserId first
    const tempEffectiveUserId = selectedClient !== "" ? selectedClient : userId;
    // Check credits before starting generation process
    if (
      tab === "Output" &&
      !options?.regenerate &&
      sessionStorage.getItem("isDemoAccount") !== "true"
    ) {
      const currentCredits = await checkUserCredits(tempEffectiveUserId);
      if (currentCredits && !currentCredits.canGenerate) {
        return; // Stop execution if can't generate
      }
    }

    if (tab === "Output" && selectedCampaign) {
      try {
        await loadCampaignBlueprint(selectedCampaign);
      } catch (error) {
        console.error("❌ Failed to load campaign blueprint:", error);
        return;
      }
    }
    // --- Get current date in readable format ---
    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const replaceAllPlaceholders = (
      text: string,
      replacements: { [key: string]: any },
    ) => {
      if (!text) return "";

      let result = text;

      // Log what we're working with
      //console.log("Original text (first 200 chars):", text.substring(0, 200));
      console.log("Replacements:", replacements);

      // Simple split-join approach which is more reliable
      Object.entries(replacements).forEach(([key, value]) => {
        const placeholder = `{${key}}`;
        const cleanValue = value || "";

        console.log(
          `Looking for: "${placeholder}", replacing with: "${cleanValue}"`,
        );
        console.log(
          `Found ${
            (
              text.match(
                new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"),
              ) || []
            ).length
          } occurrences`,
        );

        // Use split-join which is more reliable than regex for literal strings
        result = result.split(placeholder).join(cleanValue);
      });

      console.log("Result (first 200 chars):", result.substring(0, 200));
      console.log(
        "Remaining placeholders:",
        result.match(/\{[^}]+\}/g) || "none",
      );

      return result;
    };

    setTab(tab);
    // If already processing, show loader and prevent multiple starts
    if (isProcessing) {
      return;
    }

    const selectedModelNameA = selectedModelName;
    const searchterm = searchTermForm.searchTerm;
    const searchCount = searchTermForm.searchCount;
    const instructionsParamA = searchTermForm.instructions;
    const systemInstructionsA = settingsForm.systemInstructions;
    const subject_instruction = settingsForm.subjectInstructions;

    const startTime = new Date();

    let parsedClientId: number;
    let parsedDataFileId: number | null = null;
    let segmentId: string | null = null;
    if (selectedZohoviewId) {
      if (selectedZohoviewId.startsWith("segment_")) {
        // ✅ Handle segment-based campaign
        segmentId = selectedZohoviewId.replace("segment_", "");
        parsedClientId =
          selectedClient !== "" ? Number(selectedClient) : Number(userId);
        parsedDataFileId = null; // No dataFileId for segments
        console.log("Using segment-based campaign, segmentId:", segmentId);
      } else if (selectedZohoviewId.includes(",")) {
        // ✅ Handle datafile-based campaign (existing logic)
        const [clientIdStr, dataFileIdStr] = selectedZohoviewId.split(",");
        parsedClientId = parseInt(clientIdStr);
        parsedDataFileId = parseInt(dataFileIdStr);
        console.log(
          "Using datafile-based campaign, dataFileId:",
          parsedDataFileId,
        );
      } else {
        // ✅ Fallback for different format
        parsedDataFileId = parseInt(selectedZohoviewId);
        parsedClientId =
          selectedClient !== "" ? Number(selectedClient) : Number(userId);
      }
    } else {
      parsedClientId =
        selectedClient !== "" ? Number(selectedClient) : Number(userId);
    }

    // Use the parsed client ID consistently throughout
    const effectiveUserId =
      parsedClientId ||
      (selectedClient !== "" ? Number(selectedClient) : Number(userId));

    if (!effectiveUserId || effectiveUserId <= 0) {
      console.error("Invalid userId or clientID:", effectiveUserId);
      return;
    }

    setStartTime(startTime);
    let generatedPitches: any[] = []; // Declare and initialize generatedPitches

    try {
      setIsProcessing(true);

      // ======= REGENERATION BLOCK START =======
      if (!selectedPrompt) {
        // Determine which variables are missing
        const missingVars = [];
        if (!selectedPrompt) missingVars.push("prompt template");

        // Create error message
        const errorMessage = `<span style="color: red">[${formatDateTime(
          new Date(),
        )}] Error: Cannot generate pitch  Missing required parameters: ${missingVars.join(
          ", ",
        )}</span>`;

        // Update the form with error message
        setOutputForm((prev) => ({
          ...prev,
          generatedContent: errorMessage + "<br/>" + prev.generatedContent,
        }));

        // Set states to stop processing
        setIsProcessing(false);
        setIsPitchUpdateCompleted(true);
        setIsPaused(true);
        return;
      }

      if (options?.regenerate) {
        lastEmailTokens = 0;
        lastEmailCost = 0;
        lastEmailGenerations = 0;

        // Use the regenerateIndex to get the specific contact from allResponses
        const index =
          typeof options.regenerateIndex === "number"
            ? options.regenerateIndex
            : 0;

        // Get the entry directly from allResponses instead of fetching again
        const entry = allResponses[index];

        if (!entry) {
          setIsProcessing(false);
          setIsPitchUpdateCompleted(true);
          setIsPaused(true);
          return;
        }
        // Map new API fields to existing variables
        const company_name_friendly = entry.company_name || entry.company;
        const full_name = entry.full_name || entry.name;
        const job_title = entry.job_title || entry.title;
        const location = entry.country_or_address || entry.location;
        const linkedin_url = entry.linkedin_url || entry.linkedin;
        const website = entry.website;
        const company_name = entry.company_name || entry.company;
        const emailbody = entry.email_body || entry.pitch;
        const id = entry.id;
        const dataFileId = entry.dataFileId; // New field from allResponses
        const segmentId = entry.segmentId; // New field from allResponses

        // --- Get current date in readable format ---
        const currentDate = new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        // --- Generate new pitch as per your normal contact process ---
        let replacements = buildReplacements(entry, currentDate, {});

        replacements.notes = entry.notes || "";

        const searchTermBody = replaceAllPlaceholders(searchterm, replacements);

        const filledInstructions = replaceAllPlaceholders(
          instructionsParamA,
          replacements,
        );

        const summary = {};
        const searchResults = [];
        const scrappedData = "";

        if (!scrappedData) {
          setOutputForm((prev) => ({
            ...prev,
            generatedContent:
              `<span style="color: orange">[${formatDateTime(
                new Date(),
              )}] No scraped data for ${full_name}. Generating pitch anyway.</span><br/>` +
              prev.generatedContent,
          }));
        }

        replacements = {
          ...replacements,
          search_output_summary: scrappedData || "",
        };

        let systemPrompt = replaceAllPlaceholders(
          systemInstructionsA,
          replacements,
        );
        let replacedPromptText = replaceAllPlaceholders(
          selectedPrompt?.text || "",
          replacements,
        );

        const promptToSend = `\n${systemPrompt}\n${replacedPromptText}`;

        setOutputForm((prev) => ({
          ...prev,
          currentPrompt: promptToSend,
          searchResults: [],
          allScrapedData: "",
        }));
        setallprompt((prev) => {
        const updated = [...prev];
        if (index < updated.length) updated[index] = promptToSend;
        else updated.push(promptToSend);
        return updated;
      });

        // Request body
        const requestBody = {
          scrappedData: systemPrompt,
          prompt: replacedPromptText,
          ModelName: selectedModelNameA,
        };
        const pitchResponse = await fetch(
          `${API_BASE_URL}/api/auth/generatepitch`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          },
        );

        const pitchData = await pitchResponse.json();
        if (!pitchResponse.ok) {
          setOutputForm((prev) => ({
            ...prev,
            generatedContent:
              `<span style="color: red">[${formatDateTime(
                new Date(),
              )}] Pitch generation failed for ${full_name}. Using fallback pitch.</span><br/>` +
              prev.generatedContent,
          }));


        }

        setOutputForm((prev) => ({
          ...prev,
          generatedContent:
            `<span style="color: green">[${formatDateTime(
              new Date(),
            )}] Pitch successfully crafted, for contact ${full_name} with company name ${company_name} and domain ${
              entry.email
            }</span><br/>` + prev.generatedContent,
          linkLabel: pitchData.response.content,
        }));

        //----------------------------------------------------------------------------------------

        // ---------------- SUBJECT GENERATION (PLACEHOLDER CONTROLLED ONLY) ----------------
        const { isAI, manualTemplate } = getSubjectMode();

        let subjectLine = "";

        // --- CASE 1: AI SUBJECT ---
        if (isAI) {
          const filledSubjectInstruction = replaceAllPlaceholders(
            subject_instruction,
            {
              ...replacements,
              generated_pitch: pitchData.response?.content || "",
            },
          );

          const subjectRequestBody = {
            scrappedData: filledSubjectInstruction,
            prompt: pitchData.response?.content,
            ModelName: selectedModelNameA,
          };

          const subjectResponse = await fetch(
            `${API_BASE_URL}/api/auth/generatepitch`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(subjectRequestBody),
            },
          );

          if (subjectResponse.ok) {
            
            const subjectData = await subjectResponse.json();
            subjectLine = subjectData.response?.content || "";
          }
          
        }

        // --- CASE 2: MANUAL SUBJECT ---
        else if (manualTemplate.trim()) {
          subjectLine = replaceAllPlaceholders(manualTemplate, {
            company_name,
            job_title,
            location,
            full_name,
            linkedin_url,
            website,
            date: currentDate,
            search_output_summary: scrappedData || "",
            generated_pitch: pitchData.response?.content || "",
          });
        }

        // --- CASE 3: NOTHING ---
        else {
          subjectLine = "";
        }
        // ---------------- SUBJECT GENERATION END ----------------

        // ✅ Replace the database update logic in REGENERATION BLOCK
        try {
          if (id && pitchData.response?.content) {
            const requestBody: any = {
              clientId: effectiveUserId,
              contactId: id,
              GPTGenerate: true,
              emailSubject: subjectLine,
              emailBody: pitchData.response.content,
            };

            // Add segmentId or dataFileId based on priority
            if (segmentId) {
              requestBody.segmentId = segmentId;
            } else if (parsedDataFileId) {
              requestBody.dataFileId = parsedDataFileId;
            }

            const updateContactResponse = await fetch(
              `${API_BASE_URL}/api/crm/contacts/update-email`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
              },
            ); ///

            if (!updateContactResponse.ok) {
              const updateContactError = await updateContactResponse.json();
              setOutputForm((prevOutputForm) => ({
                ...prevOutputForm,
                generatedContent:
                  `<span style="color: orange">[${formatDateTime(
                    new Date(),
                  )}] Updating contact in database incomplete for ${full_name}. Error: ${
                    updateContactError.Message || "Unknown error"
                  }</span><br/>` + prevOutputForm.generatedContent,
              }));
              if (isSoundEnabledRef.current) {
                playSound();
              }
            } else {
              setOutputForm((prevOutputForm) => ({
                ...prevOutputForm,
                generatedContent:
                  `<span style="color: green">[${formatDateTime(
                    new Date(),
                  )}] Updated pitch in database for ${full_name}.</span><br/>` +
                  prevOutputForm.generatedContent,
              }));
              if (isSoundEnabledRef.current) {
                playSound();
              }
              try {
                const userCreditResponse = await fetch(
                  `${API_BASE_URL}/api/crm/user_credit?clientId=${effectiveUserId}`,
                );
                if (!userCreditResponse.ok)
                  throw new Error("Failed to fetch user credit");

                const userCreditData = await userCreditResponse.json();
                console.log("User credit data:", userCreditData);
                dispatch(saveUserCredit(userCreditData));

                // Dispatch custom event to notify credit update
                window.dispatchEvent(
                  new CustomEvent("creditUpdated", {
                    detail: { clientId: effectiveUserId },
                  }),
                );
              } catch (creditError) {
                console.error("User credit API error:", creditError);
              }
            }
          }
        } catch (updateError) {
          setOutputForm((prevOutputForm) => ({
            ...prevOutputForm,
            generatedContent:
              `<span style="color: orange">[${formatDateTime(
                new Date(),
              )}] Database update error for ${full_name}.</span><br/>` +
              prevOutputForm.generatedContent,
          }));
        }

        const newResponse = {
          ...entry,
          name: full_name || "N/A",
          title: job_title || "N/A",
          company: company_name_friendly || "N/A",
          location: location || "N/A",
          website: website || "N/A",
          linkedin: linkedin_url || "N/A",
          pitch: pitchData.response.content,
          subject: subjectLine,
          timestamp: new Date().toISOString(),
          id,
          nextPageToken: null,
          prevPageToken: null,
          generated: true,
          lastemailupdateddate: new Date().toISOString(),
          emailsentdate: entry.email_sent_at || "N/A",
          dataFileId: entry.dataFileId || entry.data_file_id || null,
          segmentId: entry.segmentId || null,
        };
        const regenIndex = allResponses.findIndex((r) => r.id === id);

        // ---- Update all relevant state arrays by id ----
        setexistingResponse((prev) =>
          prev.map((resp) => (resp.id === id ? newResponse : resp)),
        );

        setAllResponses((prev) =>
          prev.map((resp) => (resp.id === id ? newResponse : resp)),
        );

        setallprompt((prev) => {
          const updated = [...prev];
          if (regenIndex > -1) updated[regenIndex] = promptToSend;
          else updated.push(promptToSend);
          return updated;
        });

        setRecentlyAddedOrUpdatedId(id);

        setIsProcessing(false);
        setIsPitchUpdateCompleted(true);
        setIsPaused(true);
        return;
      }
      // ======= REGENERATION BLOCK END =======

      // Main processing loop - fetch all contacts at once
      let moreRecords = true;
      let currentIndex = 0;
      let shouldReplaceFromIndex = false;

      const currentDate = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      if (
        options?.startFromIndex !== undefined &&
        options.startFromIndex >= 0
      ) {
        currentIndex = options.startFromIndex;
        shouldReplaceFromIndex = true;
      } else {
        currentIndex = 0; // Only use 0 if no specific index is provided
      }

      let foundRecordWithoutPitch = false;

      // Show loader
      setOutputForm((prevForm) => ({
        ...prevForm,
        generatedContent:
          '<span style="color: blue">Processing initiated...please wait...</span><br/>' +
          prevForm.generatedContent,
      }));

      // Declare contacts variable before the if/else block
      // Declare contacts variable
      let contacts: any[] = [];

      // Check if we have contacts to process from the Output component
      const contactsToProcessStr = sessionStorage.getItem("contactsToProcess");
      if (contactsToProcessStr) {
        // Use the contacts passed from Output (already filtered if filters were active)
        contacts = JSON.parse(contactsToProcessStr);
        sessionStorage.removeItem("contactsToProcess");
        console.log("Using contacts from Output component:", contacts.length);
        console.log(
          "First contact:",
          contacts[0]?.full_name || contacts[0]?.name,
        );
        currentIndex = 0; // Start from beginning since we already sliced from currentIndex
      } else {
        // Fallback: fetch contacts if not provided (for backward compatibility)
        // Use cached data if available and flag is set
        if (options?.useCachedData && cachedContacts.length > 0) {
          contacts = cachedContacts;
        } else {
          // ✅ Fetch contacts based on campaign type
          if (segmentId) {
            // Fetch from segment API
            console.log(
              "Fetching contacts from segment API, segmentId:",
              segmentId,
            );
            const response = await fetch(
              `${API_BASE_URL}/api/Crm/segment/${segmentId}/contacts`,
            );

            if (!response.ok) {
              throw new Error("Failed to fetch segment contacts");
            }

            const data = await response.json();
            contacts = data || []; // Segment API returns contacts directly
            console.log("Fetched segment contacts:", contacts.length);
          } else if (parsedDataFileId) {
            // Fetch from datafile API (existing logic)
            console.log(
              "Fetching contacts from datafile API, dataFileId:",
              parsedDataFileId,
            );
            const response = await fetch(
              `${API_BASE_URL}/api/crm/contacts/by-client-datafile?clientId=${effectiveUserId}&dataFileId=${parsedDataFileId}`,
            );

            if (!response.ok) {
              throw new Error("Failed to fetch datafile contacts");
            }

            const data = await response.json();
            contacts = data.contacts || [];
            console.log("Fetched datafile contacts:", contacts.length);
          } else {
            throw new Error(
              "No valid data source found (neither segment nor datafile)",
            );
          }
        }
      }

      if (!Array.isArray(contacts) || contacts.length === 0) {
        console.error("No contacts to process");
        setIsProcessing(false);
        setIsPitchUpdateCompleted(true);
        setIsPaused(true);
        return;
      }

      // Process all contacts
      for (let i = currentIndex; i < contacts.length; i++) {

        // 🔄 Reset LAST email counters per contact
        lastEmailTokens = 0;
        lastEmailCost = 0;
        lastEmailGenerations = 0;

        // Start from currentIndex instead of 0
        const entry = contacts[i];

        if (stopRef.current === true) {
          setIsProcessing(false); // Now set processing to false

          return;
        }

        // Process the entry
        const urlParam: string = `https://www.${entry.email.split("@")[1]}`;
        try {
          var company_name_friendly = entry.company_name;
          var full_name = entry.full_name;
          var job_title = entry.job_title;
          var location = entry.country_or_address;
          var linkedin_url = entry.linkedin_url;
          var emailbody = entry.email_body;
          var website = entry.website;
          var company_name = entry.company_name;

          // Check if email already exists and if we should overwrite
          if (entry.email_body && !settingsForm.overwriteDatabase) {
            const responseIndex = shouldReplaceFromIndex
              ? i
              : allResponses.length;

            setOutputForm((prevOutputForm) => ({
              ...prevOutputForm,
              generatedContent:
                `<span style="color: orange">[${formatDateTime(
                  new Date(),
                )}] Pitch crafted for contact ${full_name} with company name ${company_name} and domain ${
                  entry.email
                } </span><br/>` + prevOutputForm.generatedContent,
              linkLabel: entry.email_body,
            }));

            await delay(delayTime * 1000);

            const existingResponse = {
              ...entry,
              name: entry.full_name || "N/A",
              title: entry.job_title || "N/A",
              company: entry.company_name || "N/A",
              location: entry.country_or_address || "N/A",
              website: entry.website || "N/A",
              linkedin: entry.linkedin_url || "N/A",
              pitch: entry.email_body,
              timestamp: new Date().toISOString(),
              generated: false,
              nextPageToken: null,
              prevPageToken: null,
              id: entry.id,
              subject: entry.email_subject || "N/A",
              lastemailupdateddate: entry.updated_at || "N/A",
              emailsentdate: entry.email_sent_at || "N/A",
              dataFileId: entry.dataFileId, // Make sure this is preserved correctly
              segmentId: segmentId ? parseInt(segmentId) : null, // Also preserve segmentId
            };

            setAllResponses((prevResponses) => {
              const updated = [...prevResponses];

              if (responseIndex < updated.length) {
                updated[responseIndex] = existingResponse;
              } else {
                updated.push(existingResponse);
              }

              setCurrentIndex(responseIndex);

              return updated;
            });

            // Update these to use responseIndex logic

            // setallprompt((prevPrompts) => {
            //   const updated = [...prevPrompts];

            //   if (responseIndex < updated.length) {
            //     updated[responseIndex] = "";
            //   } else {
            //     updated.push("");
            //   }

            //   return updated;
            // });

            // ❌ DO NOT WIPE PROMPT — KEEP EXISTING
            // setallprompt((prevPrompts) => {
            //   const updated = [...prevPrompts];
            //   if (!updated[responseIndex]) {
            //     updated[responseIndex] = "";
            //   }
            //   return updated;
            // });


            setallsearchResults((prevSearchResults) => {
              const updated = [...prevSearchResults];

              if (responseIndex < updated.length) {
                updated[responseIndex] = [];
              } else {
                updated.push([]);
              }

              return updated;
            });

            seteveryscrapedData((prevScrapedData) => {
              const updated = [...prevScrapedData];

              if (responseIndex < updated.length) {
                updated[responseIndex] = "";
              } else {
                updated.push("");
              }

              return updated;
            });

            setallsummery((prevSummery) => {
              const updated = [...prevSummery];

              if (responseIndex < updated.length) {
                updated[responseIndex] = "";
              } else {
                updated.push("");
              }

              return updated;
            });

            setallSearchTermBodies((prevSearchTermBodies) => {
              const updated = [...prevSearchTermBodies];
              if (responseIndex < updated.length) {
                updated[responseIndex] = "";
              } else {
                updated.push("");
              }
              return updated;
            });

            continue;
          } else {
            foundRecordWithoutPitch = true;
            if (isDemoAccount) {
              setOutputForm((prevOutputForm) => ({
                ...prevOutputForm,
                generatedContent:
                  `<span style="color: blue">[${formatDateTime(
                    new Date(),
                  )}] Subscription: Trial mode. Processing is paused. Contact support on Live Chat (bottom right) or London: +44 (0) 207 660 4243 | New York: +1 (0) 315 400 2402 or email info@dataji.co </span><br/>` +
                  prevOutputForm.generatedContent,
              }));

              moreRecords = false;
              stopRef.current = true;

              break;
            }
          }

          // Step 1: Scrape Website with caching
          let replacements = buildReplacements(entry, currentDate, {
            urlParam,
          });
          replacements.notes = entry.notes || "";

          const searchTermBody = replaceAllPlaceholders(
            searchterm,
            replacements,
          );
          const filledInstructions = replaceAllPlaceholders(
            instructionsParamA,
            replacements,
          );

          const summary = {};
          const searchResults = [];
          const scrappedData = "";

          replacements = {
            ...replacements,
            search_output_summary: scrappedData || "",
          };

          let systemPrompt = replaceAllPlaceholders(
            systemInstructionsA,
            replacements,
          );

          let replacedPromptText = replaceAllPlaceholders(
            selectedPrompt?.text || "",
            replacements,
          );

          const promptToSend = `
          ${systemPrompt}

          ${replacedPromptText}
          `;

          setallprompt((prev) => {
          const updated = [...prev];
          const targetIndex = shouldReplaceFromIndex ? i : prev.length;

          if (targetIndex < updated.length) {
            updated[targetIndex] = promptToSend;
          } else {
            updated.push(promptToSend);
          }

          return updated;
        });

          setOutputForm((prevState) => ({
            ...prevState,
            currentPrompt: promptToSend,
          }));

          setOutputForm((prevOutputForm) => ({
            ...prevOutputForm,

            generatedContent:
              `<span style="color: blue">[${formatDateTime(
                new Date(),
              )}] Crafting phase #1 integritas , for contact ${full_name} with company name ${company_name} and domain ${
                entry.email
              }</span><br/>` + prevOutputForm.generatedContent,
          }));

          const requestBody = {
            scrappedData: systemPrompt,
            prompt: replacedPromptText,
            ModelName: selectedModelNameA,
          };
          const pitchResponse = await fetch(
            `${API_BASE_URL}/api/auth/generatepitch`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(requestBody),
            },
          );

          const pitchData = await pitchResponse.json();
          if (!pitchResponse.ok) {
            const formattedTime = formatDateTime(new Date());


           

            
            setOutputForm((prevOutputForm) => ({
              ...prevOutputForm,

              generatedContent:
                `<span style="color: red">[${formatDateTime(
                  new Date(),
                )}] Phase #1 integritas incomplete for contact ${full_name} with company name ${company_name} and domain ${
                  entry.email
                }</span><br/>` + prevOutputForm.generatedContent,
             
            }));
            generatedPitches.push({
              ...entry,
              pitch: "Error Crafting pitch",
            });
            continue;
          }

            successReq += 1;

            const bodyTokens = Number(pitchData.response.totalTokens);
            const bodyCost = Number(pitchData.response.currentCost);

            // LAST
// LAST
lastEmailTokens += bodyTokens;
lastEmailCost += bodyCost;

// TOTAL (persisted)
totalEmailTokensRef.current += bodyTokens;
totalEmailCostRef.current += bodyCost;

// ✅ ONE EMAIL GENERATED (body is mandatory)
lastEmailGenerations = 1;
totalEmailCountRef.current += 1;


            // keep legacy totals
            cost += bodyCost;
            totaltokensused += bodyTokens;


          // Success: Update UI with the generated pitch
          setOutputForm((prevOutputForm) => ({
            ...prevOutputForm,

            generatedContent:
              `<span style="color: green">[${formatDateTime(
                new Date(),
              )}] Pitch successfully crafted for contact ${full_name} with company name ${company_name} and domain ${
                entry.email
              }</span><br/>` + prevOutputForm.generatedContent,
     
            
          }));

          setOutputForm((prevOutputForm) => ({
            ...prevOutputForm,
            linkLabel: pitchData.response.content,
          }));

          generatedPitches.push({
            ...entry,
            name: entry.full_name || "N/A",
            title: entry.job_title || "N/A",
            company: entry.company_name || "N/A",
            location: entry.country_or_address || "N/A",
            website: entry.website || "N/A",
            linkedin: entry.linkedin_url || "N/A",
            pitch: pitchData.response.content,
            subject: entry.email_subject || "N/A",
            lastemailupdateddate: entry.updated_at || "N/A",
            emailsentdate: entry.email_sent_at || "N/A",
          });

          // Generate subject line
          // ---------------- SUBJECT GENERATION (PLACEHOLDER CONTROLLED ONLY) ----------------

          // ---------------- SUBJECT GENERATION (PLACEHOLDER CONTROLLED ONLY) ----------------
          const { isAI, manualTemplate } = getSubjectMode();

          let subjectLine = "";

          // --- CASE 1: AI SUBJECT ---
          if (isAI) {
            const filledSubjectInstruction = replaceAllPlaceholders(
              subject_instruction,
              {
                ...replacements,
                generated_pitch: pitchData.response?.content || "",
              },
            );

            const subjectRequestBody = {
              scrappedData: filledSubjectInstruction,
              prompt: pitchData.response?.content,
              ModelName: selectedModelNameA,
            };

            const subjectResponse = await fetch(
              `${API_BASE_URL}/api/auth/generatepitch`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(subjectRequestBody),
              },
            );

          if (subjectResponse.ok) {
            const subjectData = await subjectResponse.json();

            subjectLine = subjectData.response?.content || "";

            const subjectTokens = Number(subjectData?.response?.totalTokens || 0);
            const subjectCost = Number(subjectData?.response?.currentCost || 0);

            // LAST (same email)
// LAST (same email)
lastEmailTokens += subjectTokens;
lastEmailCost += subjectCost;

// TOTAL
totalEmailTokensRef.current += subjectTokens;
totalEmailCostRef.current += subjectCost;

// ⚠️ DO NOT increment email count here
// subject is part of SAME email


            // legacy totals (if still used elsewhere)
            cost += subjectCost;
            totaltokensused += subjectTokens;
          }


          }

          // --- CASE 2: MANUAL SUBJECT ---
          else if (manualTemplate.trim()) {
            subjectLine = replaceAllPlaceholders(manualTemplate, {
              company_name,
              job_title,
              location,
              full_name,
              linkedin_url,
              website,
              date: currentDate,
              search_output_summary: scrappedData || "",
              generated_pitch: pitchData.response?.content || "",
            });
          }

          // --- CASE 3: NOTHING ---
          else {
            subjectLine = "";
          }
          // ---------------- SUBJECT GENERATION END ----------------
          setOutputForm((prev) => ({
  ...prev,
  usage: JSON.stringify({
    last: {
      tokens: lastEmailTokens,
      cost: Number(lastEmailCost.toFixed(6)),
      emails: lastEmailGenerations, // always 1
    },
    total: {
      tokens: totalEmailTokensRef.current,
      cost: Number(totalEmailCostRef.current.toFixed(6)),
      emails: totalEmailCountRef.current,
    },
  }),
}));


          // Update the linkLabel to show both subject and pitch
          setOutputForm((prevOutputForm) => ({
            ...prevOutputForm,
            linkLabel: pitchData.response.content,
            emailSubject: subjectLine,
          }));

          // Update generatedPitches to include subject
          generatedPitches.push({
            ...entry,
            name: entry.full_name || "N/A",
            title: entry.job_title || "N/A",
            company: entry.company_name || "N/A",
            location: entry.country_or_address || "N/A",
            website: entry.website || "N/A",
            linkedin: entry.linkedin_url || "N/A",
            pitch: pitchData.response.content,
            subject: subjectLine,
            lastemailupdateddate: entry.updated_at || "N/A",
            emailsentdate: entry.email_sent_at || "N/A",
          });

          // Update newResponse to include subject
          const newResponse = {
            ...entry,
            name: entry.full_name || "N/A",
            title: entry.job_title || "N/A",
            company: entry.company_name || "N/A",
            location: entry.country_or_address || "N/A",
            website: entry.website || "N/A",
            linkedin: entry.linkedin_url || "N/A",
            pitch: pitchData.response.content,
            subject: subjectLine,
            timestamp: new Date().toISOString(),
            id: entry.id,
            nextPageToken: null,
            prevPageToken: null,
            generated: true,
            lastemailupdateddate: new Date().toISOString(),
            emailsentdate: entry.email_sent_at || "N/A",
            dataFileId: entry.dataFileId || entry.data_file_id || null,
            segmentId: entry.segmentId || null,
          };
          const responseIndex = shouldReplaceFromIndex
            ? currentIndex + (i - currentIndex)
            : allResponses.length;

          setAllResponses((prevResponses) => {
            const updated = [...prevResponses];

            if (responseIndex < updated.length) {
              // Replace existing entry

              updated[responseIndex] = newResponse;
            } else {
              // Add new entry

              updated.push(newResponse);
            }

            return updated;
          });

          // Similarly update other arrays at the correct index

          // setallprompt((prevPrompts) => {
          //   const updated = [...prevPrompts];
          //   if (responseIndex < updated.length) {
          //     updated[responseIndex] = promptToSend;
          //   } else {
          //     updated.push(promptToSend);
          //   }
          //   return updated;
          // });
          setallprompt((prevPrompts) => {
          const updated = [...prevPrompts];
          if (!updated[responseIndex]) {
            updated[responseIndex] = "";
            }
            return updated;
          });

          setCurrentIndex(responseIndex);
          setRecentlyAddedOrUpdatedId(newResponse.id);

          // ✅ Update database with new API (in main processing loop)
          try {
            if (entry.id && pitchData.response.content) {
              const requestBody: any = {
                clientId: effectiveUserId,
                contactId: entry.id,
                GPTGenerate: true,
                emailSubject: subjectLine,
                emailBody: pitchData.response.content,
              };

              // Add segmentId or dataFileId based on priority
              if (segmentId) {
                requestBody.segmentId = segmentId;
              } else if (parsedDataFileId) {
                requestBody.dataFileId = parsedDataFileId;
              }

              const updateContactResponse = await fetch(
                `${API_BASE_URL}/api/crm/contacts/update-email`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(requestBody),
                },
              );

              if (!updateContactResponse.ok) {
                const updateContactError = await updateContactResponse.json();
                setOutputForm((prevOutputForm) => ({
                  ...prevOutputForm,
                  generatedContent:
                    `<span style="color: orange">[${formatDateTime(
                      new Date(),
                    )}] Updating contact in database incomplete for ${full_name}. Error: ${
                      updateContactError.Message || "Unknown error"
                    }</span><br/>` + prevOutputForm.generatedContent,
                }));
                if (isSoundEnabledRef.current) {
                  playSound();
                }
              } else {
                setOutputForm((prevOutputForm) => ({
                  ...prevOutputForm,
                  generatedContent:
                    `<span style="color: green">[${formatDateTime(
                      new Date(),
                    )}] Updated pitch in database for ${full_name}.</span><br/>` +
                    prevOutputForm.generatedContent,
                }));
                if (isSoundEnabledRef.current) {
                  playSound();
                }
                try {
                  const userCreditResponse = await fetch(
                    `${API_BASE_URL}/api/crm/user_credit?clientId=${effectiveUserId}`,
                  );
                  if (!userCreditResponse.ok)
                    throw new Error("Failed to fetch user credit");

                  const userCreditData = await userCreditResponse.json();
                  console.log("User credit data:", userCreditData);
                  dispatch(saveUserCredit(userCreditData));

                  // Dispatch custom event to notify credit update
                  window.dispatchEvent(
                    new CustomEvent("creditUpdated", {
                      detail: { clientId: effectiveUserId },
                    }),
                  );
                } catch (creditError) {
                  console.error("User credit API error:", creditError);
                }
              }
            }
          } catch (updateError) {
            setOutputForm((prevOutputForm) => ({
              ...prevOutputForm,
              generatedContent:
                `<span style="color: orange">[${formatDateTime(
                  new Date(),
                )}] Database update error for ${full_name}.</span><br/>` +
                prevOutputForm.generatedContent,
            }));
          }

          console.log("Delaying " + delayTime + " secs");
          // await delay(delayTime * 1000); // 1-second delay
        } catch (error) {
          setOutputForm((prevOutputForm: any) => ({
            ...prevOutputForm,
            generatedContent:
              `<span style="color: red">[${formatDateTime(
                new Date(),
              )}] Phase #1 integritas incomplete for contact ${
                entry.full_name
              } with company name ${entry.company_name} and domain ${
                entry.email
              }</span><br/>` + prevOutputForm.generatedContent,
            usage:
              `Cost: $${cost.toFixed(6)}    ` +
              `Failed Requests: ${failedReq}    ` +
              `Success Requests: ${successReq}                ` +
              `Scraped Data Failed Requests: ${scrapfailedreq}   ` +
              `Total Tokens Used: ${totaltokensused}   `,
          }));
          console.error(`Error processing entry ${entry.email}:`, error);
          generatedPitches.push({
            ...entry,
            pitch: "Error generating pitch",
          });
        }
      }

      // Set processing to false when completely done
      if (!moreRecords) {
        setAllRecordsProcessed(true);
      }

      moreRecords = false; // No pagination in new API

      // Process completed successfully
      if (!stopRef.current) {
        // Reset all tracking variables

        stopRef.current = false;
        setIsPaused(true);
      }

      // Capture the end time after processing all entries
      const endTime = new Date();
      setEndTime(endTime);

      // Calculate time spent
      const timeSpent = endTime.getTime() - startTime.getTime();
      const hours = Math.floor((timeSpent % 86400000) / 3600000);
      const minutes = Math.floor(((timeSpent % 86400000) % 3600000) / 60000);
      const formattedTimeSpent = `${hours} hours ${minutes} minutes`;

      // Send email report
      sendEmail(
        cost,
        failedReq,
        successReq,
        scrapfailedreq,
        totaltokensused,
        formattedTimeSpent,
        startTime,
        endTime,
        generatedPitches,
        selectedPrompt?.text,
      );
    } catch (error) {
      // Ensure processing is set to false even if there's an error
      setIsProcessing(false);
      console.error("Error:", error);
      setOutputForm((prevForm) => ({
        ...prevForm,
        generatedContent:
          `<span style="color: red"> Error: </span><br/>` +
          prevForm.generatedContent,
      }));
    } finally {
      // Ensure processing is set to false
      setIsProcessing(false);
      setIsPitchUpdateCompleted(true); // Set to true when pitch is updated
      setIsPaused(true);
    }
  };

  const [outputForm, setOutputForm] = useState<OutputInterface["outputForm"]>({
    generatedContent: "",
    linkLabel: "",
    usage: "",
    currentPrompt: "",
    searchResults: [],
    allScrapedData: "",
  });

  const outputFormHandler = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!e || !e.target) {
        console.error("Event is undefined or missing target:", e);
        return;
      }

      const { name, value } = e.target;
      setOutputForm((prevOutputForm) => ({
        ...prevOutputForm,
        [name]: value,
      }));
    },
    [],
  );

  const clearOutputForm = () => {
    setOutputForm((prevForm) => ({
      ...prevForm,
      generatedContent: "",
    }));
  };

  const searchTermFormHandler = useCallback(
    (e: {
      target: {
        name: string;
        value: string;
      };
    }) => {
      const { name, value } = e.target;
      console.log("Handling form update:", { name, value });

      setSearchTermForm((prev: SearchTermForm) => ({
        ...prev,
        [name]: value,
      }));
    },
    [],
  );

  // Also update the state declaration
  const [searchTermForm, setSearchTermForm] = useState<SearchTermForm>({
    searchCount: "",
    searchTerm: "",
    instructions: "",
    output: "",
  });

  const [settingsForm, setSettingsForm] = useState({
    emailTemplate: "",
    viewId: "",
    overwriteDatabase: false,
    tkInput: "",
    tkOutput: "",
    systemInstructions: systemPrompt,
  }) as any;

  const settingsFormHandler = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      let newValue: string | boolean = value;

      // Check if the target is an HTMLInputElement and type is checkbox
      if ("type" in e.target && e.target.type === "checkbox") {
        newValue = (e.target as HTMLInputElement).checked;
      }

      console.log(
        `settingsFormHandler called for ${name} with value: ${newValue}`,
      ); // Debug log

      setSettingsForm((prevSettings: any) => ({
        ...prevSettings,
        [name]: newValue,
      }));
    },
    [],
  );

  // Convert line break to br
  const formatTextForDisplay = (text: string) => {
    return text.replace(/\n/g, "<br/>");
  };

  // Convert br tag to line break
  const formatTextForEditor = (text: string) => {
    return text.replace(/<br\/>/g, "\n");
  };

  interface ZohoClient {
    id: number;
    zohoviewId: string;
    zohoviewName: string;
    clientId: number;
    totalContact: number;
  }

  interface Contact {
    name: string;
    title: string;
    company: string;
    location: string;
    website: string;
    linkedin: string;
    pitch: string;
    timestamp: string;
  }

  const IsAdmin = sessionStorage.getItem("IsAdmin");
  const [showSupportPopup, setShowSupportPopup] = useState(false);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // State for data files
  const [dataFiles, setDataFiles] = useState<DataFile[]>([]);

  // Fetch data files when client changes
  useEffect(() => {
    const fetchDataFiles = async () => {
      if (!selectedClient && !clientID) {
        setDataFiles([]);
        return;
      }

      setLoading(true);

      try {
        const effectiveUserId = selectedClient !== "" ? selectedClient : userId;

        const url = `${API_BASE_URL}/api/Crm/datafile-byclientid?clientId=${effectiveUserId}`;

        const response = await fetch(url);

        if (!response.ok) {
          if (response.status === 404) {
            console.log(`No data files found for client: ${effectiveUserId}`);
            setDataFiles([]);
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: DataFile[] = await response.json();
        setDataFiles(data);
      } catch (error) {
        console.error("Error fetching data files:", error);
        setDataFiles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDataFiles();
  }, [selectedClient, clientID]);

  const handleModelChange = async (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const modelName = event.target.value;
    const selectedId = event.target.value;
    setSelectedZohoviewId(selectedId);
    if (selectedId) {
      await fetchAndDisplayEmailBodies(selectedId);
    }
  };

  const handleStart = async (startIndex?: number) => {
    if (!selectedPrompt) return;

    // Use the passed startIndex or current index, don't clear all data
    const indexToStart = startIndex !== undefined ? startIndex : currentIndex;

    setAllRecordsProcessed(false);
    setIsStarted(true);
    setIsPaused(false);
    //setIsProcessing(true);
    stopRef.current = false;

    goToTab("Output", {
      startFromIndex: indexToStart,
      useCachedData: true,
    });
  };

  const handleStop = async () => {
    if (isProcessing) {
      setIsPaused(true);
      stopRef.current = true;

      // Calculate time spent so far
      const currentTime = new Date();
      let timeSpent = "";

      if (startTime) {
        const timeDiff = currentTime.getTime() - startTime.getTime();
        const hours = Math.floor((timeDiff % 86400000) / 3600000);
        const minutes = Math.floor(((timeDiff % 86400000) % 3600000) / 60000);
        timeSpent = `${hours} hours ${minutes} minutes`;
      }

      // Get the current values from the usage string
      const usageText = outputForm.usage;

      // Extract values using regex
      const costMatch = usageText.match(/Cost: \$([0-9.]+)/);
      const failedReqMatch = usageText.match(/Failed Requests: ([0-9]+)/);
      const successReqMatch = usageText.match(/Success Requests: ([0-9]+)/);
      const scrapfailedReqMatch = usageText.match(
        /Scraped Data Failed Requests: ([0-9]+)/,
      );
      const totaltokensusedMatch = usageText.match(
        /Total Tokens Used: ([0-9]+)/,
      );

      const currentCost = costMatch ? parseFloat(costMatch[1]) : cost;
      const currentFailedReq = failedReqMatch
        ? parseInt(failedReqMatch[1])
        : failedReq;
      const currentSuccessReq = successReqMatch
        ? parseInt(successReqMatch[1])
        : successReq;
      const currentScrapfailedReq = scrapfailedReqMatch
        ? parseInt(scrapfailedReqMatch[1])
        : scrapfailedreq;
      const currentTotaltokensused = totaltokensusedMatch
        ? parseInt(totaltokensusedMatch[1])
        : totaltokensused;

      // Send email with the values from the usage display
      await sendEmail(
        currentCost,
        currentFailedReq,
        currentSuccessReq,
        currentScrapfailedReq,
        currentTotaltokensused,
        timeSpent,
        startTime,
        currentTime,
        allResponses,
        selectedPrompt?.text || "No prompt template was selected",
        true, // Flag to indicate this is a stop report
      );
    }
  };

  const handleReset = () => {
    // Only allow reset if paused
    if (!isPaused) return;
    // Stop any ongoing generation process
    stopRef.current = true;

    // Reset all state variables
    setIsStarted(false);
    setIsPaused(false);
    setIsProcessing(false);
    setIsPitchUpdateCompleted(false);

    // Reset last processed token and index

    // Clear all accumulated data
    setAllResponses([]);
    setallsearchResults([]);
    seteveryscrapedData([]);
    setallprompt([]);
    setallSearchTermBodies([]);
    setallsummery([]);

    // Reset output form
    setOutputForm({
      generatedContent: "",
      linkLabel: "",
      usage: "",
      currentPrompt: "",
      searchResults: [],
      allScrapedData: "",
    });

    // Clear any existing content
    clearContentFunction?.();

    // Reset cost and request tracking variables
    cost = 0;
    failedReq = 0;
    successReq = 0;
    scrapfailedreq = 0;
    totaltokensused = 0;

    // Reset existingResponse and related index in Output.tsx
    clearExistingResponse(); // Call the function to clear existingResponse
    setCurrentIndex(0); // Reset currentIndex in Output.tsx
    setCurrentPage(0); // Resetting the current page to 0

    setNextPageToken(null);
    setPrevPageToken(null);
    setRecentlyAddedOrUpdatedId(null); // Optional if you're using it
  };

  // Get the demo account status directly from session storage
  const isDemoAccount = sessionStorage.getItem("isDemoAccount") === "true";

  // Set default delay for demo users
  useEffect(() => {
    if (isDemoAccount) {
      setDelay(5); // Set default delay value for demo users
      // Set overwriteDatabase to false for demo users:
      setSettingsForm((prev: SettingsFormType) => ({
        ...prev,
        overwriteDatabase: false, // Set default value for demo users
      }));
    }
  }, [isDemoAccount]);
  //for output

  // fetch campaigns in parent
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/auth/campaigns/client/${effectiveUserId}`,
        );
        const data = await response.json();
        setCampaigns(data);
        // setCampaigns(data.campaigns || []);
      } catch (err) {
        console.error("Error fetching campaigns", err);
      }
    };
    fetchCampaigns();
  }, []);
  const handleCampaignChange = async (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const campaignId = event.target.value;
    setSelectedCampaign(campaignId);

    if (campaignId) {
      setSelectionMode("campaign");

      // Clear existing data
      setAllResponses([]);
      setexistingResponse([]);
      setCurrentIndex(0);

      // Find the selected campaign
      const campaign = campaigns.find((c) => c.id.toString() === campaignId);
      console.log("Selected campaign:", campaign);

      if (campaign) {
        // Set the corresponding prompt
        const promptMatch = promptList.find(
          (p: Prompt) => p.id === campaign.promptId,
        );
        if (promptMatch) {
          setSelectedPrompt(promptMatch);
        }

        // ✅ Check if campaign is segment-based or datafile-based
        const segmentId = (campaign as any).segmentId;
        const dataFileId = campaign.zohoViewId;
        setSelectedSegmentId(segmentId || null); // <-- Add this

        console.log("Campaign segmentId:", segmentId);
        console.log("Campaign dataFileId:", dataFileId);

        // Get the client ID
        const effectiveUserId = selectedClient !== "" ? selectedClient : userId;

        // Fetch data based on campaign type
        try {
          if (segmentId) {
            // ✅ Campaign uses segment
            console.log("Using segment-based campaign");
            const segmentZohoviewId = `segment_${segmentId}`;
            setSelectedZohoviewId(segmentZohoviewId);
            await fetchAndDisplayEmailBodies(segmentZohoviewId);
          } else if (dataFileId) {
            // ✅ Campaign uses datafile - Fix: set in correct format
            console.log("Using datafile-based campaign");
            const datafileZohoviewId = `${effectiveUserId},${dataFileId}`;
            setSelectedZohoviewId(datafileZohoviewId);
            await fetchAndDisplayEmailBodies(datafileZohoviewId);
          } else {
            console.error("Campaign has neither segmentId nor dataFileId");
            return;
          }
        } catch (error) {
          console.error("Error fetching contacts:", error);
        }
      }
    } else {
      // If no campaign is selected, switch back to manual mode
      setSelectionMode("manual");
      setSelectedPrompt(null);
      setSelectedSegmentId(null); // <-- Clear on deselection
      setSelectedZohoviewId("");
      setAllResponses([]);
      setexistingResponse([]);
    }
  };

  const handleClearAll = () => {
    stopRef.current = true;

    processCacheRef.current = {};
    setAllRecordsProcessed(false);

    // Reset all state variables
    setIsStarted(false);
    setIsPaused(false);
    setIsProcessing(false); // Add this line
    setIsPitchUpdateCompleted(false);

    // Reset last processed token and index

    // Clear all accumulated data
    setAllResponses([]);
    setallsearchResults([]);
    seteveryscrapedData([]);
    setallprompt([]);
    setallSearchTermBodies([]);
    setallsummery([]);

    // Reset output form
    setOutputForm({
      generatedContent: "",
      linkLabel: "",
      usage: "",
      currentPrompt: "",
      searchResults: [],
      allScrapedData: "",
    });

    clearContentFunction?.();

    // Reset cost and request tracking variables
    cost = 0;
    failedReq = 0;
    successReq = 0;
    scrapfailedreq = 0;
    totaltokensused = 0;

    setexistingResponse([]);
    setCurrentIndex(0);
    setCurrentPage(0);

    localStorage.removeItem("cachedResponses");
    localStorage.removeItem("currentIndex");
  };

  const handleExcelDataProcessed = async (processedData: any[]) => {
    console.log("Excel data processed:", processedData);

    if (processedData.length > 0) {
      // Convert Excel data to your expected format
      const formattedData: EmailEntry[] = processedData.map(
        (contact, index) => ({
          id: `excel_${index + 1}`,
          full_Name: contact.name,
          email: contact.email,
          email_subject: "",
          job_Title: contact.job_title || "",
          account_name_friendlySingle_Line_12: contact.company || "",
          mailing_Country: contact.location || "",
          linkedIn_URL: contact.linkedin || "",
          website: "", // Optional fields
          sample_email_body: "",
          generated: false,
          last_Email_Body_updated: "",
          pG_Processed_on1: "",
        }),
      );

      // Update your existing state with the Excel data
      setexistingResponse(formattedData);
      setPitchGenData({ data: formattedData });

      // Optionally switch to Output tab to show the data
      // setTab("Output");
    }
  };

  const [selectedDataFileId, setSelectedDataFileId] = useState("");

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const clearUsage = () => {
    setOutputForm((prevOutputForm: any) => ({
      ...prevOutputForm,
      usage: "", // Correctly clears the usage field
    }));
  };

  const [showBlueprintSubmenu, setShowBlueprintSubmenu] =
    useState<boolean>(false);
  const [blueprintSubTab, setBlueprintSubTab] = useState<string>("List");

  <Header onUpgradeClick={() => setTab("MyPlan")} connectTo={true} />;

  return (
    // <div className="login-container pitch-page flex-col d-flex">
    <div className="flex h-full bg-gray-100">
      {/* Sidebar */}
      {isSidebarOpen && (
        <aside
          className={`bg-white border-r shadow-sm flex flex-col transition-all duration-300 h-full`}
        >
          <div className="p-2 text-xl font-bold border-b">
            <div className="flex justify-between items-start">
              <img
                src={pitchLogo}
                alt="Pitchcraft Logo"
                style={{ height: "100px" }}
              />
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="w-[40px] h-[40px] flex items-center justify-center rounded-md bg-gray-200 hover:bg-gray-300 mt-[10px]"
              >
                <FontAwesomeIcon
                  icon={faBars}
                  className=" text-[#333333] text-2xl"
                />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto h-full">
            <nav className="flex-1 py-4 space-y-2">
              {/* Side Menu */}
              <div className="side-menu">
                <div className="side-menu-inner">
                  <ul className="side-menu-list">
                    <li className={tab === "Dashboard" ? "active" : ""}>
                      <button
                        onClick={() => {
                          setTab("Dashboard");
                          setShowMailSubmenu(false);
                          setShowContactsSubmenu(false);
                          navigate("/main");
                        }}
                        className="side-menu-button"
                        title="View progress and help videos"
                      >
                        <span className="menu-icon">
                          {/* <FontAwesomeIcon
                            icon={faDashboard}
                            className=" text-[#333333] text-lg"
                          /> */}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20px"
                            height="20px"
                            viewBox="0 0 24 24"
                            fill={tab === "Dashboard" ? "#3f9f42" : "#111111"}
                          >
                            <path
                              stroke={
                                tab === "Dashboard" ? "#3f9f42" : "#111111"
                              }
                              stroke-width="2"
                              d="M4 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5ZM14 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V5ZM4 16a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3ZM14 13a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-6Z"
                            />
                          </svg>
                        </span>
                        <span className="menu-text">Dashboard</span>
                      </button>
                    </li>

                    <li
                      className={`${tab === "TestTemplate" ? "active" : ""} ${
                        showBlueprintSubmenu
                          ? "has-submenu submenu-open"
                          : "has-submenu"
                      }`}
                    >
                      <button
                        onClick={() => {
                          if (tab !== "TestTemplate") {
                            setTab("TestTemplate");
                            setShowBlueprintSubmenu(true);
                            setShowMailSubmenu(false);
                            setShowContactsSubmenu(false);
                            navigate("/main?tab=TestTemplate");
                          } else {
                            setShowBlueprintSubmenu((prev: boolean) => !prev);
                          }
                        }}
                        className="side-menu-button"
                        title="Create and manage email blueprints"
                      >
                        <span className="menu-icon">
                          <FontAwesomeIcon
                            icon={faFileAlt}
                            className="text-[#333333] text-lg"
                          />
                        </span>
                        <span className="menu-text">Blueprints</span>
                        <span className="submenu-arrow">
                          <FontAwesomeIcon
                            icon={faAngleRight}
                            className="text-[#333333] text-lg"
                          />
                        </span>
                      </button>

                      {/* Submenu items */}
                      {showBlueprintSubmenu && (
                        <ul className="submenu">
                          {/* Normal Blueprint list */}
                          <li
                            className={
                              blueprintSubTab === "List" ? "active" : ""
                            }
                          >
                            <button
                              onClick={() => {
                                setBlueprintSubTab("List");
                                setTab("TestTemplate");

                                // FIX: Delay writing to session to avoid breaking navigation
                                setTimeout(() => {
                                  sessionStorage.setItem(
                                    "campaign_activeTab",
                                    "build",
                                  );
                                }, 0);

                                navigate("/main?tab=TestTemplate");
                              }}
                              className="submenu-button"
                            >
                              Blueprints
                            </button>
                          </li>

                          {/* ADMIN only Playground */}
                          {userRole === "ADMIN" && (
                            <li
                              className={
                                blueprintSubTab === "Playground" ? "active" : ""
                              }
                            >
                              <button
                                onClick={() => {
                                  setBlueprintSubTab("Playground");
                                  setTab("Playground");
                                  navigate("/main?tab=Playground");
                                }}
                                className="submenu-button"
                              >
                                Playground
                              </button>
                            </li>
                          )}
                        </ul>
                      )}
                    </li>

                    <li
                      className={`${tab === "DataCampaigns" ? "active" : ""} ${
                        showContactsSubmenu
                          ? "has-submenu submenu-open"
                          : "has-submenu"
                      }`}
                    >
                      <button
                        onClick={() => {
                          if (tab !== "DataCampaigns") {
                            setTab("DataCampaigns");
                            setShowContactsSubmenu(true);
                            setShowMailSubmenu(false);
                          } else {
                            setShowContactsSubmenu((prev) => !prev);
                          }
                        }}
                        className="side-menu-button"
                        title="Create and manage contacts and segments"
                      >
                        <span className="menu-icon">
                          <FontAwesomeIcon
                            icon={faList}
                            className=" text-[#333333] text-lg"
                          />
                        </span>
                        <span className="menu-text">Contacts</span>
                        <span className="submenu-arrow">
                          <FontAwesomeIcon
                            icon={faAngleRight}
                            className=" text-[#333333] text-lg"
                          />
                        </span>
                      </button>
                      {showContactsSubmenu && (
                        <ul className="submenu">
                          <li
                            className={
                              contactsSubTab === "List" ? "active" : ""
                            }
                          >
                            <button
                              onClick={() => {
                                setContactsSubTab("List");
                                setTab("DataCampaigns");
                                setShowMailSubmenu(false);
                              }}
                              className="submenu-button"
                            >
                              Lists
                            </button>
                          </li>
                          <li
                            className={
                              contactsSubTab === "Segment" ? "active" : ""
                            }
                          >
                            <button
                              onClick={() => {
                                setContactsSubTab("Segment");
                                setTab("DataCampaigns");
                                setShowMailSubmenu(false);
                              }}
                              className="submenu-button"
                            >
                              Segments
                            </button>
                          </li>
                        </ul>
                      )}
                    </li>

                    <li className={tab === "Campaigns" ? "active" : ""}>
                      <button
                        onClick={() => {
                          setTab("Campaigns");
                          setShowMailSubmenu(false);
                          setShowContactsSubmenu(false);
                          navigate("/main?tab=Campaigns");
                        }}
                        className="side-menu-button"
                        title="Create and manage email campaigns"
                      >
                        <span className="menu-icon">
                          <FontAwesomeIcon
                            icon={faBullhorn}
                            className=" text-[#333333] text-lg"
                          />
                        </span>
                        <span className="menu-text">Campaigns</span>
                      </button>
                    </li>
                    <li className={tab === "Output" ? "active" : ""}>
                      <button
                        onClick={() => {
                          setTab("Output");
                          setShowMailSubmenu(false);
                          setShowContactsSubmenu(false);
                          navigate("/main?tab=Output");
                          navigate("/main?tab=Output");
                        }}
                        className="side-menu-button"
                        title="Generate hyper-personalized emails"
                      >
                        <span className="menu-icon">
                          <FontAwesomeIcon
                            icon={faEnvelopeOpen}
                            className=" text-[#333333] text-lg"
                          />
                        </span>
                        <span className="menu-text">Kraft emails</span>
                      </button>
                    </li>
                    <li
                      className={`${tab === "Mail" ? "active" : ""} ${
                        showMailSubmenu
                          ? "has-submenu submenu-open"
                          : "has-submenu"
                      }`}
                    >
                      <button
                        onClick={() => {
                          if (tab !== "Mail") {
                            setTab("Mail");
                            setShowMailSubmenu(true);
                            setShowContactsSubmenu(false);
                          } else {
                            setShowMailSubmenu((prev) => !prev);
                          }
                        }}
                        className="side-menu-button"
                        title="Configure email, schedule sends and review analytics"
                      >
                        <span className="menu-icon">
                          <FontAwesomeIcon
                            icon={faEnvelope}
                            className=" text-[#333333] text-lg"
                          />
                        </span>
                        <span className="menu-text">Mail</span>
                        <span className="submenu-arrow">
                          <FontAwesomeIcon
                            icon={faAngleRight}
                            className=" text-[#333333] text-lg"
                          />
                        </span>
                      </button>
                      {showMailSubmenu && (
                        <ul className="submenu">
                          <li
                            className={
                              mailSubTab === "Dashboard" ? "active" : ""
                            }
                          >
                            <button
                              onClick={() => {
                                setMailSubTab("Dashboard");
                                setTab("Mail");
                              }}
                              className="submenu-button"
                            >
                              Dashboard
                            </button>
                          </li>
                          <li
                            className={
                              mailSubTab === "Configuration" ? "active" : ""
                            }
                          >
                            <button
                              onClick={() => {
                                setMailSubTab("Configuration");
                                setTab("Mail");
                              }}
                              className="submenu-button"
                            >
                              Configuration
                            </button>
                          </li>
                          <li
                            className={
                              mailSubTab === "Schedule" ? "active" : ""
                            }
                          >
                            <button
                              onClick={() => {
                                setMailSubTab("Schedule");
                                setTab("Mail");
                              }}
                              className="submenu-button"
                            >
                              Schedules
                            </button>
                          </li>
                        </ul>
                      )}
                    </li>
                  </ul>
                </div>
              </div>
            </nav>
            {/* Rest of Output component content */}
              <div className="pb-2 d-flex align-center justify-end p-4 w-[100%] border-t-[3px] border-t-[#eeeeee]">
                <div className="form-group w-[100%]">
                 
                  <span className="pos-relative full-width flex flex-col">


                    <div
                      ref={popupRef}
                      className="absolute left-0 top-full mt-2 bg-white border border-gray-300 rounded-md shadow-lg p-3 w-50"
                    >
                      <h4 className="font-semibold mb-2 text-sm text-gray-800">
                        Need support?
                      </h4>
                      <div className="text-sm text-gray-700 space-y-1">
                        <p>
                          <strong>London:</strong> +44 (0) 207 660 4243
                        </p>
                        <p>
                          <strong>New York:</strong> +1 (0) 315 400 2402
                        </p>
                        <p>
                          <a
                            href="mailto:support@pitchkraft.co"
                            className="text-blue-600 hover:underline"
                          >
                            support@pitchkraft.co
                          </a>
                        </p>
                      </div>
                    </div>
                  </span>
                </div>
              </div>
            
          </div>
        </aside>
      )}

      {/* Content Area */}
      <div className="flex flex-col flex-1 h-full">
        {/* Header */}
        <header className="bg-white shadow-sm border-b p-2 px-4 flex justify-between items-center min-h-[77px]">
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-[40px] h-[40px] flex items-center justify-center rounded-md bg-gray-200 hover:bg-gray-300 mr-[15px]"
            >
              <FontAwesomeIcon
                icon={faBars}
                className=" text-[#333333] text-2xl"
              />
            </button>
          )}
          <Header
            connectTo={true}
            selectedClient={selectedClient}
            handleClientChange={handleClientChange}
            clientNames={clientNames}
            userRole={userRole}
            onUpgradeClick={() => setTab("MyPlan")}
          />
        </header>

        {/* Inner Main Content */}
        <main className="flex-1 overflow-y-auto h-[calc(100%-87px)] p-[20px] bg-[#eeeeee]">
          <div
            className={`
               rounded-md p-6
              ${tab !== "Dashboard" && "bg-white p-4 shadow-md"}
            `}
          >
            {/* Main Content Area */}

            <div className="tab-content">
              {tab === "Dashboard" && <Dashboard />}
            </div>

            {/* Tab Content */}
            <div className="tab-content"></div>

            {tab === "DataCampaigns" && !showDataFileUpload && (
              <DataCampaigns
                selectedClient={selectedClient}
                onDataProcessed={handleExcelDataProcessed}
                isProcessing={isProcessing}
                initialTab={contactsSubTab}
                onTabChange={setContactsSubTab}
                onAddContactClick={() => setShowDataFileUpload(true)} // Add this
              />
            )}

            {tab === "DataCampaigns" && showDataFileUpload && (
              <DataFile
                selectedClient={selectedClient}
                onDataProcessed={(data) => {
                  handleExcelDataProcessed(data);
                  setShowDataFileUpload(false); // Return to contacts list
                  // Optionally refresh data or perform other actions
                }}
                isProcessing={isProcessing}
                onBack={() => setShowDataFileUpload(false)} // Add back functionality
              />
            )}
            {tab === "Campaigns" && (
              <CampaignManagement
                selectedClient={selectedClient}
                userRole={userRole}
              />
            )}
            {tab === "Output" && (
              <Output
                outputForm={outputForm}
                outputFormHandler={outputFormHandler}
                setOutputForm={setOutputForm}
                allResponses={allResponses}
                isPaused={isPaused}
                setAllResponses={setAllResponses}
                currentIndex={currentIndex}
                setCurrentIndex={setCurrentIndex}
                onClearOutput={clearOutputForm}
                allprompt={allprompt}
                setallprompt={setallprompt}
                allsearchResults={allsearchResults}
                setallsearchResults={setallsearchResults}
                everyscrapedData={everyscrapedData}
                seteveryscrapedData={seteveryscrapedData}
                allSearchTermBodies={allSearchTermBodies}
                setallSearchTermBodies={setallSearchTermBodies}
                onClearContent={handleClearContent}
                setallsummery={setallsummery}
                allsummery={allsummery}
                existingResponse={existingResponse}
                setexistingResponse={setexistingResponse}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                prevPageToken={prevPageToken}
                nextPageToken={nextPageToken}
                fetchAndDisplayEmailBodies={fetchAndDisplayEmailBodies}
                selectedZohoviewId={selectedZohoviewId}
                onClearExistingResponse={setClearExistingResponse}
                isResetEnabled={!isProcessing}
                zohoClient={zohoClient}
                onRegenerateContact={goToTab}
                recentlyAddedOrUpdatedId={recentlyAddedOrUpdatedId}
                setRecentlyAddedOrUpdatedId={setRecentlyAddedOrUpdatedId}
                selectedClient={selectedClient}
                isStarted={isStarted}
                handleStart={handleStart}
                handleReset={handleReset}
                isPitchUpdateCompleted={isPitchUpdateCompleted}
                allRecordsProcessed={allRecordsProcessed}
                isDemoAccount={isDemoAccount}
                settingsForm={settingsForm}
                settingsFormHandler={settingsFormHandler}
                delayTime={delayTime.toString()} // Convert number to string
                setDelay={(value: string) => setDelay(parseInt(value) || 0)} // Convert string back to number
                handleClearAll={handleClearAll}
                campaigns={campaigns}
                selectedCampaign={selectedCampaign}
                handleCampaignChange={handleCampaignChange}
                selectionMode={selectionMode}
                promptList={promptList}
                handleSelectChange={handleSelectChange}
                userRole={userRole}
                dataFiles={dataFiles}
                handleZohoModelChange={handleZohoModelChange}
                emailLoading={emailLoading}
                languages={Object.values(Languages)}
                selectedLanguage={selectedLanguage}
                handleLanguageChange={handleLanguageChange}
                selectedPrompt={selectedPrompt} // Make sure this is passed
                handleStop={handleStop}
                isStopRequested={stopRef.current} // Add this line
                selectedSegmentId={selectedSegmentId}
                handleSubjectTextChange={handleSubjectTextChange}
                showCreditModal={showCreditModal}
                checkUserCredits={checkUserCredits}
                userId={userId}
                followupEnabled={followupEnabled}
                setFollowupEnabled={setFollowupEnabled}
                isSoundEnabled={isSoundEnabled}
                setIsSoundEnabled={setIsSoundEnabled}
                clearUsage={clearUsage}

              />
            )}

            {tab === "Mail" && (
              <Mail
                selectedClient={selectedClient}
                outputForm={outputForm}
                outputFormHandler={outputFormHandler}
                setOutputForm={setOutputForm}
                allResponses={allResponses}
                isPaused={isPaused}
                setAllResponses={setAllResponses}
                currentIndex={currentIndex}
                setCurrentIndex={setCurrentIndex}
                onClearOutput={clearOutputForm}
                allprompt={allprompt}
                setallprompt={setallprompt}
                allsearchResults={allsearchResults}
                setallsearchResults={setallsearchResults}
                everyscrapedData={everyscrapedData}
                seteveryscrapedData={seteveryscrapedData}
                allSearchTermBodies={allSearchTermBodies}
                setallSearchTermBodies={setallSearchTermBodies}
                onClearContent={handleClearContent}
                setallsummery={setallsummery}
                allsummery={allsummery}
                existingResponse={existingResponse}
                setexistingResponse={setexistingResponse}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                prevPageToken={prevPageToken}
                nextPageToken={nextPageToken}
                fetchAndDisplayEmailBodies={fetchAndDisplayEmailBodies}
                selectedZohoviewId={selectedZohoviewId}
                onClearExistingResponse={setClearExistingResponse}
                isResetEnabled={!isProcessing}
                zohoClient={zohoClient}
                initialTab={mailSubTab}
                onTabChange={setMailSubTab}
              />
            )}
            {tab === "Playground" && userRole === "ADMIN" && (
              <EmailCampaignBuilder selectedClient={selectedClient} />
            )}

            {tab === "TestTemplate" && (
              <Template
                selectedClient={selectedClient}
                userRole={userRole}
                isDemoAccount={isDemoAccount}
                onTemplateSelect={(template) => {
                  setSelectedPrompt(template);
                  // You can add any additional logic here when a template is selected
                }}
              />
            )}

            {/* Stop Confirmation Popup */}
            {showPopup && (
              <div className="popup">
                <p>Do you want to stop the process?</p>
                <button onClick={() => handlePopupResponse(true)}>Yes</button>
                <button onClick={() => handlePopupResponse(false)}>No</button>
              </div>
            )}
            {tab === "MyPlan" && <Myplan />}
          </div>
        </main>
      </div>
      <AppModal
        isOpen={appModal.isOpen}
        onClose={appModal.hideModal}
        {...appModal.config}
      />
      <AppModal
        isOpen={isFetchingContacts || isLoadingClientSettings}
        onClose={() => {}}
        type="loader"
        loaderMessage={
          isFetchingContacts
            ? "Loading contacts..."
            : "Loading client settings..."
        }
        closeOnOverlayClick={false}
      />
      <CreditCheckModal
        isOpen={showCreditModal}
        onClose={closeCreditModal}
        onSkip={handleSkipModal}
        credits={credits}
        setTab={setTab}
      />
    </div>
  );
};

export default MainPage;
