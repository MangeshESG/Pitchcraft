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
import { extractGenerationInsights } from "../utils/generationInsights";
import { DEFAULT_DATE_TIME_PREFERENCES, setDateTimePreferences } from "./common/dateTimePreferences";
import { useDispatch } from "react-redux";
import { useModel } from "../ModelContext";
import { AppDispatch } from "../Redux/store"; // ✅ import AppDispatch
import DataCampaigns from "./feature/ContactList"; // Adjust the path based on your file structure
import CampaignManagement from "./feature/CampaignManagement";
import { useAppData } from "../contexts/AppDataContext";
import { Dashboard } from "./feature/Dashboard";
import EmailCampaignBuilder from "./feature/blueprint/EmailCampaignBuilder";
import DeepSeekSearchGenerator from "./feature/blueprint/DeepSeekSearchGenerator";
import Settings from "./feature/Settings";
import Profile from "./feature/Profile";
import InstructionSetPage from "./feature/blueprint/InstructionSetPage";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { saveUserCredit } from "../slices/authSLice";
import { useCreditCheck } from "../hooks/useCreditCheck";
import CreditCheckModal from "./common/CreditCheckModal";
import Myplan from "./feature/Myplan";
import { useSoundAlert } from "./common/useSoundAlert";
import { link } from "node:fs";
import LoadingSpinner from "./common/LoadingSpinner";
import CustomFieldSettings from "./feature/CustomFieldSettings";
import ContactDetailView from "./feature/contact_profile/ContactDetailView";
import { closePanel } from "../slices/panelSlice";
const PITCH_GENERATION_API_BASE_URL = "https://playground.esuk.co.uk";
//const PITCH_GENERATION_API_BASE_URL = "https://localhost:7216";



interface Prompt {
  id: number;
  name: string;
  text: string;
  userId?: number; // userId might not always be returned from the API
  createdAt?: string;
  template?: string;
  model?: string;
  webSearchInstructions?: string;
  placeholderValues?: Record<string, any>;
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

// Everything the generation API hands back for one contact.
interface GeneratedEmailResult {
  emailBody: string;
  emailSubject: string;
  generated: boolean;
  finalPrompt: string;
  webSearchData: string;
  notes: string;
  emails: string;
  professionalSummary: string;
  usage: { totalTokens: number; totalCost: number };
}

// Usage block returned by /api/email-generation/generate (web search + body +
// subject are already summed server-side).
const normalizeGenerationUsage = (usage: any) => {
  const toNumber = (value: unknown) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  };

  return {
    totalTokens: toNumber(usage?.totalTokens ?? usage?.TotalTokens),
    totalCost: toNumber(usage?.totalCost ?? usage?.TotalCost),
  };
};

const normalizeCampaigns = (data: any): Campaign[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.campaigns)) return data.campaigns;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

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
  ) => void | Promise<void>;

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

interface SelectedInboxUnreadCounts {
  associated: number;
  external: number;
  allMessages: number;
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
  const [forceShowCreditModal, setForceShowCreditModal] = useState(false);

  const canGenerateFromCreditResponse = (creditResponse: any) => {
    if (typeof creditResponse === "number") {
      return creditResponse > 0;
    }

    if (!creditResponse || typeof creditResponse !== "object") {
      return false;
    }

    return (
      creditResponse.canGenerate !== false &&
      Number(creditResponse.total ?? creditResponse.credits ?? 0) > 0
    );
  };

  const ensureCanGenerateWithCredits = async (
    clientId?: string | number | null,
  ) => {
    if ((sessionStorage.getItem("isDemoAccount") ?? localStorage.getItem("isDemoAccount")) === "true") {
      return true;
    }

    const currentCredits = await checkUserCredits(clientId);
    const canGenerate = canGenerateFromCreditResponse(currentCredits);

    if (!canGenerate) {
      setForceShowCreditModal(true);
    }

    return canGenerate;
  };

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
  const [selectedClient, setSelectedClient] = useState<string>(() => {
    const hashQuery = window.location.hash.split("?")[1] || "";
    const initialClientIdFromQuery = new URLSearchParams(hashQuery).get("clientId");

    return (
      initialClientIdFromQuery ||
      localStorage.getItem("selectedClientId") ||
      sessionStorage.getItem("selectedClientId") ||
      ""
    );
  });
  const [clientNames, setClientNames] = useState<Client[]>([]);

  const processCacheRef = useRef<Record<string, any>>({});
  const [allRecordsProcessed, setAllRecordsProcessed] = useState(false);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [selectionMode, setSelectionMode] = useState<"manual" | "campaign">(
    "manual",
  );

  const stopRef = useRef(false);
  const kraftResumeIndexRef = useRef<number | null>(null);
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
  const latestLocationSearchRef = useRef(location.search);
  const queryParams = new URLSearchParams(location.search);
  const isContactDetailPage = location.pathname.startsWith("/contact-details/");
  const selectedClientIdFromQuery = queryParams.get("clientId") || "";

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
      if (isContactDetailPage) {
        return "Contact Details";
      }

      switch (tab) {
        case "Dashboard":
          return "Dashboard - View progress and help videos";
        case "TestTemplate":
          return "Blueprints - Create and manage email blueprints";
        case "Playground":
          return "Playground - Experiment with email generation";
        case "DeepSeekSearch":
          return "DeepSeek Search - Generate email with web search";
        case "DataCampaigns":
          if (contactsSubTab === "List") {
            return "Contact Lists - Create and manage contacts and segments";
          }
          if (contactsSubTab === "View") {
            return "Contact Views - Create and manage views";
          }
          if (contactsSubTab === "CustomFields") {
            return "Custom attributes - Manage contact custom attributes";
          }
          return "Contact Segments - Create and manage contacts and segments";
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
        case "Settings":
          return "Settings - Application settings and tracking";
        case "Profile":
          return "Profile - Edit your account details";
        case "MyPlan":
          return "My Plan";
        default:
          return "Dashboard";
      }
    };

    document.title = `${getPageTitle()} - PitchKraft`;
  }, [isContactDetailPage, tab, contactsSubTab, mailSubTab]);

  const [showMailSubmenu, setShowMailSubmenu] = useState(initialTab === "Mail");
  const [showContactsSubmenu, setShowContactsSubmenu] = useState(
    initialTab === "DataCampaigns",
  );
  const [showSettingsSubmenu, setShowSettingsSubmenu] = useState(false);
  const [settingsSubTab, setSettingsSubTab] = useState<string>("General");
  const [inboxUnreadCount, setInboxUnreadCount] = useState<number>(0);
  const [selectedInboxUnreadCounts, setSelectedInboxUnreadCounts] =
    useState<SelectedInboxUnreadCounts>({
      associated: 0,
      external: 0,
      allMessages: 0,
    });
  const [showInboxSubmenu, setShowInboxSubmenu] = useState(initialTab === "Mail" && initialMailSubTab === "Inbox");
  const [inboxSubTab, setInboxSubTab] = useState<string>(() => {
    // Only set from URL if we're actually on the Mail/Inbox tab
    if (initialTab === "Mail" && initialMailSubTab === "Inbox") {
      const params = new URLSearchParams(location.search);
      return params.get("inboxSubTab") || "Inbox";
    }
    return "Inbox";
  });

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
    latestLocationSearchRef.current = location.search;
  }, [location.search]);

  useEffect(() => {
    if (!selectedClientIdFromQuery) return;

    setSelectedClient((prev) =>
      prev !== selectedClientIdFromQuery ? selectedClientIdFromQuery : prev,
    );
    localStorage.setItem("selectedClientId", selectedClientIdFromQuery);
    sessionStorage.setItem("selectedClientId", selectedClientIdFromQuery);
  }, [selectedClientIdFromQuery]);

  useEffect(() => {
    setTab((prev) => (prev !== initialTab ? initialTab : prev));
    setContactsSubTab((prev) =>
      prev !== initialContactsSubTab ? initialContactsSubTab : prev,
    );
    setMailSubTab((prev) =>
      prev !== initialMailSubTab ? initialMailSubTab : prev,
    );

    setShowContactsSubmenu(initialTab === "DataCampaigns");
    setShowMailSubmenu(initialTab === "Mail");
    setShowBlueprintSubmenu(
      initialTab === "TestTemplate" ||
        initialTab === "Playground" ||
        initialTab === "DeepSeekSearch",
    );
    setBlueprintSubTab((prev) => {
      if (initialTab === "Playground") return "Playground";
      if (initialTab === "DeepSeekSearch") return "DeepSeekSearch";
      if (initialTab === "TestTemplate") return "List";
      return prev;
    });
    // Profile lives under the Settings group, so landing there (e.g. via the
    // header name link) should expand that group rather than collapse it.
    if (initialTab === "Profile") {
      setShowSettingsSubmenu(true);
    } else if (initialTab !== "Settings") {
      setShowSettingsSubmenu(false);
    }
  }, [
    initialTab,
    initialContactsSubTab,
    initialMailSubTab,
  ]);

  useEffect(() => {
    const forceMyPlanRedirect =
      sessionStorage.getItem("forceMyPlanRedirect") === "true";

    if (forceMyPlanRedirect && initialTab === "MyPlan" && tab !== "MyPlan") {
      return;
    }

    const params = new URLSearchParams(latestLocationSearchRef.current);
    let nextSearch = "";

    if (tab === "DataCampaigns") {
      params.set("tab", tab);
      params.set("subtab", contactsSubTab);
    } else if (params.has("subtab")) {
      params.delete("subtab");
      if (tab === "Dashboard") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
    } else if (tab === "Dashboard") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }

    if (tab === "Mail") {
      params.set("mailSubTab", mailSubTab);
    } else if (params.has("mailSubTab")) {
      params.delete("mailSubTab");
    }

    nextSearch = params.toString();

    const currentSearch = latestLocationSearchRef.current;
    const normalizedCurrentSearch = currentSearch.startsWith("?")
      ? currentSearch.slice(1)
      : currentSearch;

    if (nextSearch !== normalizedCurrentSearch) {
      navigate(nextSearch ? `/main?${nextSearch}` : "/main", { replace: true });
    }
  }, [tab, contactsSubTab, mailSubTab, navigate]);

  useEffect(() => {
    if (sessionStorage.getItem("forceMyPlanRedirect") !== "true") {
      return;
    }

    const params = new URLSearchParams(location.search);
    const isOnMyPlanRoute =
      location.pathname === "/main" && params.get("tab") === "MyPlan";

    if (!isOnMyPlanRoute) {
      navigate("/main?tab=MyPlan", { replace: true });
    }

    if (tab !== "MyPlan") {
      setTab("MyPlan");
    }

    setShowContactsSubmenu(false);
    setShowMailSubmenu(false);

    const timer = window.setTimeout(() => {
      sessionStorage.removeItem("forceMyPlanRedirect");
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [location.pathname, location.search, navigate, tab]);

  const goToMyPlan = () => {
    sessionStorage.setItem("forceMyPlanRedirect", "true");
    setTab("MyPlan");
    if (isContactDetailPage) {
      const appBaseUrl = window.location.href.split("#")[0];
      window.location.href = `${appBaseUrl}#/main?tab=MyPlan`;
    }
  };

  const [showDataFileUpload, setShowDataFileUpload] = useState(false);
  const [mountedTabs, setMountedTabs] = useState<Record<string, boolean>>(() => ({
    [initialTab]: true,
  }));
  const [hasMountedDataFileUpload, setHasMountedDataFileUpload] =
    useState(false);

  useEffect(() => {
    setMountedTabs((prev) => {
      if (prev[tab]) return prev;
      return { ...prev, [tab]: true };
    });
  }, [tab]);

  useEffect(() => {
    if (showDataFileUpload) {
      setHasMountedDataFileUpload(true);
    }
  }, [showDataFileUpload]);

  const [isLoadingClientSettings, setIsLoadingClientSettings] = useState(false);
  const clientID =
    sessionStorage.getItem("clientId") ?? localStorage.getItem("clientId");
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
        setCampaigns(normalizeCampaigns(data));
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



  const [zohoClient, setZohoClient] = useState<ZohoClient[]>([]);



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

  // ✅ CRITICAL FIX — persist client across tabs & refresh
  if (newClientId) {
    localStorage.setItem("selectedClientId", newClientId);
    sessionStorage.setItem("selectedClientId", newClientId);
  } else {
    localStorage.removeItem("selectedClientId");
    sessionStorage.removeItem("selectedClientId");
  }

  // Reset everything when switching clients
  setSelectedPrompt(null);
  setSelectedZohoviewId("");
  setSelectedCampaign("");
  setSelectionMode("manual");
  setPromptList([]);
  setClientSettings(null);

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

  setSelectedModelName("gpt-5.1");

  triggerRefresh();
};

  useEffect(() => {
    // Mirror per-tab login flags into localStorage so a Dashboard opened in a
    // new tab (where sessionStorage is empty) can still read them. Covers the
    // already-logged-in session without requiring a fresh login.
    ["isAdmin", "clientId", "isDemoAccount"].forEach((key) => {
      const value = sessionStorage.getItem(key);
      if (value !== null) localStorage.setItem(key, value);
    });

    // sessionStorage is per-tab and is not reliably copied into a newly opened
    // tab (e.g. Dashboard opened via the logo), so fall back to the shared
    // localStorage mirror written at login.
    const isAdminString =
      sessionStorage.getItem("isAdmin") ?? localStorage.getItem("isAdmin");
    const isAdmin = isAdminString === "true"; // Correct comparison
    setUserRole(isAdmin ? "ADMIN" : "USER");
  }, []);

  useEffect(() => {
    if (!userRole || userRole === "ADMIN" || !selectedClient) return;

    setSelectedClient("");
    localStorage.removeItem("selectedClientId");
    sessionStorage.removeItem("selectedClientId");
  }, [userRole, selectedClient]);

  // Listen for blueprint edit event from Output
  useEffect(() => {
    const handleShowLoader = () => {
      setIsLoadingClientSettings(true);
    };
    
    const handleSwitchToBlueprint = async (event: any) => {
      const templateId = event.detail?.templateId;
      if (templateId) {
        // Load the template details first
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/CampaignPrompt/campaign/${templateId}`,
          );
          if (response.ok) {
            const data = await response.json();
            sessionStorage.setItem("newCampaignName", data.templateName);
            const example = data.placeholderValues?.example_output_email || "";
            sessionStorage.setItem("initialExampleEmail", example);
          }
        } catch (error) {
          console.error("Error loading template:", error);
        }
        
        setTab("TestTemplate");
        setShowBlueprintSubmenu(true);
        setShowMailSubmenu(false);
        setShowContactsSubmenu(false);
        navigate("/main?tab=TestTemplate");
        
        setTimeout(() => setIsLoadingClientSettings(false), 800);
      }
    };

    window.addEventListener("showBlueprintLoader", handleShowLoader);
    window.addEventListener("switchToBlueprint", handleSwitchToBlueprint);
    return () => {
      window.removeEventListener("showBlueprintLoader", handleShowLoader);
      window.removeEventListener("switchToBlueprint", handleSwitchToBlueprint);
    };
  }, [navigate]);

  const [delayTime, setDelay] = useState<number>(0);
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [cachedContacts, setCachedContacts] = useState<any[]>([]);
  const effectiveUserId = selectedClient !== "" ? selectedClient : userId;

  useEffect(() => {
    if (!effectiveUserId) return;
    fetch(`${API_BASE_URL}/api/auth/date-time-settings/${effectiveUserId}`)
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => data && setDateTimePreferences({
        timeZone: data.timeZone || DEFAULT_DATE_TIME_PREFERENCES.timeZone,
        timeZoneLabel: data.timeZoneLabel,
        dateFormat: data.dateFormat || DEFAULT_DATE_TIME_PREFERENCES.dateFormat,
        timeFormat: data.timeFormat || DEFAULT_DATE_TIME_PREFERENCES.timeFormat,
      }))
      .catch(() => undefined);
  }, [effectiveUserId]);

  const handleSubjectTextChange = (value: string) => {};
  const getEmailTrailHtml = (emailBody?: string) => {
    if (!followupEnabled || !emailBody) return "";

    const body = String(emailBody);
    const markerIndexes = [
      body.search(/<hr\b/i),
      body.search(/<b>\s*From:\s*<\/b>/i),
      body.search(/(^|\n)\s*From:\s*/i),
    ].filter((index) => index >= 0);

    if (markerIndexes.length === 0) return "";

    return body.slice(Math.min(...markerIndexes)).trim();
  };

  const mergeGeneratedPitchWithEmailTrail = (
    generatedPitch?: string,
    previousEmailBody?: string,
  ) => {
    const pitch = generatedPitch || "";
    const oldThread = getEmailTrailHtml(previousEmailBody);

    return oldThread ? `${pitch}\n\n${oldThread}` : pitch;
  };

  const [isFetchingContacts, setIsFetchingContacts] = useState(false);
  const [followupEnabled, setFollowupEnabled] = useState(false);
  const [notKraftedEnabled, setNotKraftedEnabled] = useState(false);
  const [kraftedNotSentEnabled, setKraftedNotSentEnabled] = useState(false);

  const fetchAndDisplayEmailBodies = useCallback(
    async (
      zohoviewId: string, // Format: "clientId,dataFileId" OR "segment_segmentId" OR "view_viewId"
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

        // ✅ Check if this is a view-based call
        if (zohoviewId.startsWith("view_")) {
          const viewId = zohoviewId.replace("view_", "");
          if (!viewId) {
            throw new Error("Invalid viewId - cannot fetch contacts");
          }

          const response = await fetch(`${API_BASE_URL}/api/Crm/view-contacts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId: effectiveUserId,
              viewId: Number(viewId),
              page: 1,
              pageSize: 0,
              search: "",
              isFollowUp: forceFollowup ?? followupEnabled,
              notKrafted: notKraftedEnabled,
              kraftedNotSent: kraftedNotSentEnabled,
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to fetch view contacts");
          }

          const fetchedViewData = await response.json();
          contactsData = fetchedViewData.contacts || [];
          console.log("Fetched view contacts:", contactsData);
        } else if (zohoviewId.startsWith("segment_")) {
          // ✅ Segment-based call
          // Extract segmentId from "segment_123" format
          segmentId = zohoviewId.replace("segment_", "");
          console.log("Fetching segment contacts for segmentId:", segmentId);

          // ✅ Fetch from segment API
          const url = `${API_BASE_URL}/api/Crm/contacts/by-client-segment?clientId=${effectiveUserId}&segmentId=${segmentId}&isFollowUp=${forceFollowup ?? followupEnabled}&notKrafted=${notKraftedEnabled}&kraftedNotSent=${kraftedNotSentEnabled}`;
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
          const url = `${API_BASE_URL}/api/crm/contacts/by-client-datafile?clientId=${effectiveUserId}&dataFileId=${dataFileId}&isFollowUp=${forceFollowup ?? followupEnabled}&notKrafted=${notKraftedEnabled}&kraftedNotSent=${kraftedNotSentEnabled}`;
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
          dataFileId: dataFileId || entry.dataFileId || entry.DataFileId || entry.data_file_id || "null", // Add dataFileId to response
          segmentId: segmentId || "null", // Add segmentId to response
          name: entry.full_name || "N/A",
          // ✅ carry first/last name so {first_name}/{last_name} can be replaced
          first_name: entry.first_name || "",
          last_name: entry.last_name || "",
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
          linkedin_info: entry.linkedIninformation || "",

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
    [selectedClient, userId, followupEnabled, notKraftedEnabled, kraftedNotSentEnabled],
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
        !selectedZohoviewId.startsWith("view_") &&
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
  }, [followupEnabled, notKraftedEnabled, kraftedNotSentEnabled, effectiveUserId]);

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
      To: "info@groupji.co, aamirs@groupji.co",
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
    let webSearchInstructions = "";

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

      webSearchInstructions =
        bpJson.webSearchInstructions || bpJson.WebSearchInstructions || "";

      setSearchTermForm({
        searchTerm: pv.hook_search_terms || "",
        instructions: webSearchInstructions || pv.search_objective || "",
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
        webSearchInstructions,
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
      model: bpJson.selectedModel || matchedTemplate?.selectedModel || "gpt-5",
      webSearchInstructions,
      placeholderValues: bpJson.placeholderValues || {},
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

  // Running totals across the whole kraft session (survive re-renders).
  const totalEmailTokensRef = useRef(0);
  const totalEmailCostRef = useRef(0);
  const totalEmailCountRef = useRef(0); // <-- emails, NOT api calls

  useEffect(() => {
    console.log("Current prompt length:", allprompt[currentIndex]?.length);
  }, [allprompt, currentIndex]);

/**
 * Single source of truth for email generation.
 *
 * POST /api/email-generation/generate resolves the blueprint, notes, email
 * conversation, professional summary, web research, body and subject, then
 * saves the contact, deducts the credit and writes kraft history. The frontend
 * only renders what comes back — it no longer builds prompts or chains calls.
 */
const generateEmailViaBackend = async (params: {
  blueprintId: number;
  contactId: number | string;
  clientId: number | string;
  overwriteExisting?: boolean;
}): Promise<GeneratedEmailResult> => {
  const response = await fetch(`${PITCH_GENERATION_API_BASE_URL}/api/email-generation/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "*/*" },
    body: JSON.stringify({
      blueprintId: Number(params.blueprintId),
      contactId: Number(params.contactId),
      clientId: String(params.clientId),
      overwriteExisting: params.overwriteExisting ?? true,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !(data?.success ?? data?.Success)) {
    throw new Error(
      data?.message || data?.Message || `Generation failed (${response.status})`,
    );
  }

  const insights = extractGenerationInsights(data);

  return {
    emailBody: data.emailBody ?? data.EmailBody ?? "",
    emailSubject: data.emailSubject ?? data.EmailSubject ?? "",
    // false when the contact already had an email and overwrite was off
    generated: (data.generated ?? data.Generated ?? true) as boolean,
    finalPrompt: insights.finalPrompt,
    webSearchData: insights.webSearchData,
    notes: insights.notes,
    emails: insights.emails,
    professionalSummary: insights.professionalSummary,
    usage: normalizeGenerationUsage(data.usage ?? data.Usage),
  };
};

const resolvePromptSafely = async () => {

  // ✅ 1. Always prefer live React state
  if (selectedPrompt) return selectedPrompt;

  // ✅ 2. Detect hard refresh → SKIP CACHE
  const isHardRefresh = sessionStorage.getItem("refreshTargetIndex");

  if (!isHardRefresh) {
    const stored = sessionStorage.getItem("selectedPrompt");

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSelectedPrompt?.(parsed);
        return parsed;
      } catch (err) {
        console.warn("Invalid cached blueprint, ignoring");
        sessionStorage.removeItem("selectedPrompt");
      }
    }
  }

  // ✅ 3. Always fetch blueprint during refresh
  if (selectedCampaign) {
    const blueprint = await loadCampaignBlueprint(selectedCampaign);

    // ✅ Store only fresh blueprint
    sessionStorage.setItem(
      "selectedPrompt",
      JSON.stringify(blueprint),
    );

    return blueprint;
  }

  return null;
};

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
      (sessionStorage.getItem("isDemoAccount") ?? localStorage.getItem("isDemoAccount")) !== "true"
    ) {
      const canGenerate = await ensureCanGenerateWithCredits(tempEffectiveUserId);
      if (!canGenerate) {
        setIsProcessing(false); // release the Stop button
        return; // Stop execution if can't generate
      }
    }

    let promptForRun: Prompt | null = selectedPrompt;

    if (tab === "Output" && selectedCampaign) {
      try {
        const loadedPrompt = await loadCampaignBlueprint(selectedCampaign);
        if (loadedPrompt) {
          promptForRun = loadedPrompt;
        }
      } catch (error) {
        console.error("❌ Failed to load campaign blueprint:", error);
        setIsProcessing(false); // release the Stop button
        return;
      }
    }
    // --- Get current date in readable format ---
    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const setContactInsights = (
      targetIndex: number,
      insight: {
        webSearchData?: string;
        searchResults?: any[];
        notes?: string;
        emailContext?: string;
        linkedinInfo?: string;
      },
    ) => {
      const webSearchResponse = {
        webSearchData: insight.webSearchData || "",
        searchResults: insight.searchResults || [],
      };

      setallsearchResults((prev) => {
        const updated = [...prev];
        updated[targetIndex] = {
          ...webSearchResponse,
          webSearchResponse,
          notes: insight.notes || "",
          emailContext: insight.emailContext || "",
          linkedinInfo: insight.linkedinInfo || "",
        };
        return updated;
      });

      seteveryscrapedData((prev) => {
        const updated = [...prev];
        updated[targetIndex] = insight.webSearchData || "";
        return updated;
      });

      setallSearchTermBodies((prev) => {
        const updated = [...prev];
        updated[targetIndex] = insight.notes || "";
        return updated;
      });

      setallsummery((prev) => {
        const updated = [...prev];
        updated[targetIndex] = insight.linkedinInfo || "";
        return updated;
      });
    };

    setTab(tab);
    // Block a second run while one is in flight. handleStart flips
    // isProcessing before calling this, but goToTab already holds the previous
    // render's closure, so the legitimate start still gets through — only
    // later re-entries (e.g. regenerate mid-run) are stopped here.
    if (isProcessing) {
      return;
    }

    // Model, search terms, system instructions and subject instructions all
    // live on the blueprint and are applied server-side by
    // /api/email-generation/generate — nothing to assemble here anymore.
    const startTime = new Date();

    let parsedClientId: number;
    let parsedDataFileId: number | null = null;
    let segmentId: string | null = null;
    let viewId: string | null = null;
    if (selectedZohoviewId) {
      if (selectedZohoviewId.startsWith("view_")) {
        // Handle view-based campaign
        viewId = selectedZohoviewId.replace("view_", "");
        parsedClientId =
          selectedClient !== "" ? Number(selectedClient) : Number(userId);
        parsedDataFileId = null;
        console.log("Using view-based campaign, viewId:", viewId);
      } else if (selectedZohoviewId.startsWith("segment_")) {
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

    setIsProcessing(true);

    try {
      // ======= REGENERATION BLOCK START =======
        if (!promptForRun && !options?.regenerate) {
        const missingVars = [];
        if (!promptForRun) missingVars.push("prompt template");

        const errorMessage = `<span style="color: red">[${formatDateTime(
          new Date(),
        )}] Error: Cannot generate pitch. Missing required parameters: ${missingVars.join(
          ", ",
        )}</span>`;

        setOutputForm(prev => ({
          ...prev,
          generatedContent: errorMessage + "<br/>" + prev.generatedContent,
        }));

        setIsProcessing(false);
        setIsPitchUpdateCompleted(true);
        setIsPaused(true);
        return;
      }

      if (options?.regenerate) {
        lastEmailTokens = 0;
        lastEmailCost = 0;
        lastEmailGenerations = 0;

        const index =
          typeof options.regenerateIndex === "number"
            ? options.regenerateIndex
            : 0;

        const entry = allResponses[index];

        if (!entry) {
          setIsProcessing(false);
          setIsPitchUpdateCompleted(true);
          setIsPaused(true);
          return;
        }

        // ✅ CRITICAL FIX — ALWAYS RESOLVE PROMPT
        const safePrompt = promptForRun || await resolvePromptSafely();

        if (!safePrompt) {
          setOutputForm(prev => ({
            ...prev,
            generatedContent:
              `<span style="color:red">[${formatDateTime(new Date())}] Error: Prompt template not loaded</span><br/>`
              + prev.generatedContent,
          }));

          setIsProcessing(false);
          setIsPitchUpdateCompleted(true);
          setIsPaused(true);
          return;
        }

        const full_name = entry.full_name || entry.name;
        const company_name = entry.company_name || entry.company;

        const blueprintId = Number(safePrompt.id);

        if (!blueprintId) {
          setOutputForm(prev => ({
            ...prev,
            generatedContent:
              `<span style="color:red">[${formatDateTime(new Date())}] Error: Blueprint id missing — cannot kraft ${full_name}</span><br/>`
              + prev.generatedContent,
          }));

          setIsProcessing(false);
          setIsPitchUpdateCompleted(true);
          setIsPaused(true);
          return;
        }

        setOutputForm(prev => ({
          ...prev,
          generatedContent:
            `<span style="color: blue">[${formatDateTime(new Date())}] Crafting phase #1 integritas , for contact ${full_name} with company name ${company_name} and domain ${
            entry.email}</span><br/>`
            + prev.generatedContent,
        }));

        // 🚀 One backend call does prompt building, research, body, subject,
        // the contact save, the credit deduction and the kraft history.
        let generation: GeneratedEmailResult;
        try {
          generation = await generateEmailViaBackend({
            blueprintId,
            contactId: entry.id,
            clientId: effectiveUserId,
            overwriteExisting: true,
          });
        } catch (generationError: any) {
          console.error("Regeneration failed:", generationError);
          setOutputForm(prev => ({
            ...prev,
            generatedContent:
              `<span style="color:red">[${formatDateTime(new Date())}] Phase #1 integritas incomplete for contact ${full_name} with company name ${company_name} and domain ${entry.email}${
                generationError?.message ? ` — ${generationError.message}` : ""
              }</span><br/>`
              + prev.generatedContent,
          }));

          setIsProcessing(false);
          setIsPitchUpdateCompleted(true);
          setIsPaused(true);
          return;
        }

        const generationTokens = generation.usage.totalTokens;
        const generationCost = generation.usage.totalCost;

        lastEmailTokens += generationTokens;
        lastEmailCost += generationCost;

        totalEmailTokensRef.current += generationTokens;
        totalEmailCostRef.current += generationCost;

        lastEmailGenerations = 1;
        totalEmailCountRef.current += 1;

        cost += generationCost;
        totaltokensused += generationTokens;

        const subjectLine = generation.emailSubject;
        const displayPitch = mergeGeneratedPitchWithEmailTrail(
          generation.emailBody,
          entry.email_body || entry.pitch,
        );

        setOutputForm(prev => ({
          ...prev,
          currentPrompt: generation.finalPrompt,
          searchResults: [],
          allScrapedData: generation.webSearchData,
        }));

        setallprompt(prev => {
          const updated = [...prev];
          updated[index] = generation.finalPrompt;
          return updated;
        });

        setContactInsights(index, {
          webSearchData: generation.webSearchData,
          searchResults: [],
          notes: generation.notes,
          emailContext: generation.emails,
          linkedinInfo: generation.professionalSummary,
        });

        setOutputForm(prev => ({
          ...prev,
          generatedContent:
            `<span style="color:green">[${formatDateTime(new Date())}] Pitch successfully crafted for contact ${full_name} with company name ${company_name} and domain ${entry.email}</span><br/>`
            + prev.generatedContent,
          linkLabel: displayPitch,
        }));

        setOutputForm(prev => ({
          ...prev,
          usage: JSON.stringify({
            last: {
              tokens: lastEmailTokens,
              cost: Number(lastEmailCost.toFixed(6)),
              emails: lastEmailGenerations,
            },
            total: {
              tokens: totalEmailTokensRef.current,
              cost: Number(totalEmailCostRef.current.toFixed(6)),
              emails: totalEmailCountRef.current,
            },
          }),
          emailSubject: subjectLine,
        }));

        // The backend saved the contact as part of the generation call.
        setOutputForm(prev => ({
          ...prev,
          generatedContent:
            `<span style="color: green">[${formatDateTime(
              new Date(),
            )}] Updated pitch in database for ${full_name}.</span><br/>`
            + prev.generatedContent,
        }));

        try {
          const userCreditResponse = await fetch(
            `${API_BASE_URL}/api/crm/user_credit?clientId=${effectiveUserId}`,
          );
          if (!userCreditResponse.ok) {
            throw new Error("Failed to fetch user credit");
          }

          const userCreditData = await userCreditResponse.json();
          dispatch(saveUserCredit(userCreditData));

          window.dispatchEvent(
            new CustomEvent("creditUpdated", {
              detail: { clientId: effectiveUserId },
            }),
          );
        } catch (creditError) {
          console.error("User credit API error:", creditError);
        }

        setAllResponses(prev =>
          prev.map(r =>
            r.id === entry.id
              ? {
                  ...r,
                  pitch: displayPitch,
                  subject: subjectLine,
                  // Refresh the "Krafted" date to reflect this regeneration.
                  lastemailupdateddate: new Date().toISOString(),
                }
              : r,
          ),
        );

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
          if (viewId) {
            console.log("Fetching contacts from view API, viewId:", viewId);
            const response = await fetch(`${API_BASE_URL}/api/Crm/view-contacts`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                clientId: effectiveUserId,
                viewId: Number(viewId),
                page: 1,
                pageSize: 0,
                search: "",
              }),
            });

            if (!response.ok) {
              throw new Error("Failed to fetch view contacts");
            }

            const data = await response.json();
            contacts = data.contacts || [];
            console.log("Fetched view contacts:", contacts.length);
          } else if (segmentId) {
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
              "No valid data source found (neither view, segment nor datafile)",
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

        // Process the entry — only the fields the log messages need; every
        // other contact field is resolved server-side.
        try {
          var full_name = entry.full_name;
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
              notes: entry.notes || "",
              linkedin_info: entry.linkedIninformation || entry.linkedin_info || "",
              dataFileId: entry.dataFileId || entry.DataFileId || entry.data_file_id, // Make sure this is preserved correctly
              segmentId: segmentId ? parseInt(segmentId) : null, // Also preserve segmentId
              viewId: viewId ? parseInt(viewId) : null,
            };

            kraftResumeIndexRef.current =
              responseIndex + 1 < contacts.length ? responseIndex + 1 : null;
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

          const hasCreditsForThisEmail = await ensureCanGenerateWithCredits(
            effectiveUserId,
          );

          if (!hasCreditsForThisEmail) {
            kraftResumeIndexRef.current = i;
            setCurrentIndex(i);
            setOutputForm((prevOutputForm) => ({
              ...prevOutputForm,
              generatedContent:
                `<span style="color: orange">[${formatDateTime(
                  new Date(),
                )}] Credit limit reached. Processing paused before crafting ${full_name || entry.email}.</span><br/>` +
                prevOutputForm.generatedContent,
            }));

            moreRecords = false;
            stopRef.current = true;
            break;
          }

          // 🚀 ONE BACKEND CALL PER CONTACT
          // The API resolves notes, email history, professional summary, web
          // research, the final prompt, the body and the subject, then saves
          // the contact, deducts the credit and records kraft history.
          const blueprintId = Number(promptForRun?.id);

          if (!blueprintId) {
            setOutputForm((prevOutputForm) => ({
              ...prevOutputForm,
              generatedContent:
                `<span style="color: red">[${formatDateTime(
                  new Date(),
                )}] Error: Blueprint id missing — cannot kraft ${full_name}.</span><br/>` +
                prevOutputForm.generatedContent,
            }));

            moreRecords = false;
            stopRef.current = true;
            break;
          }

          const promptTargetIndex = shouldReplaceFromIndex
            ? i
            : allResponses.length + generatedPitches.length;

          setOutputForm((prevOutputForm) => ({
            ...prevOutputForm,

            generatedContent:
              `<span style="color: blue">[${formatDateTime(
                new Date(),
              )}] Crafting phase #1 integritas , for contact ${full_name} with company name ${company_name} and domain ${
                entry.email
              }</span><br/>` + prevOutputForm.generatedContent,
          }));

          let generation: GeneratedEmailResult;
          try {
            generation = await generateEmailViaBackend({
              blueprintId,
              contactId: entry.id,
              clientId: effectiveUserId,
              overwriteExisting: true,
            });
          } catch (generationError: any) {
            console.error(`Generation failed for ${entry.email}:`, generationError);

            setOutputForm((prevOutputForm) => ({
              ...prevOutputForm,

              generatedContent:
                `<span style="color: red">[${formatDateTime(
                  new Date(),
                )}] Phase #1 integritas incomplete for contact ${full_name} with company name ${company_name} and domain ${
                  entry.email
                }${generationError?.message ? ` — ${generationError.message}` : ""}</span><br/>` +
                prevOutputForm.generatedContent,
            }));

            generatedPitches.push({
              ...entry,
              pitch: "Error Crafting pitch",
            });
            continue;
          }

          successReq += 1;

          const generationTokens = generation.usage.totalTokens;
          const generationCost = generation.usage.totalCost;

          // LAST
          lastEmailTokens += generationTokens;
          lastEmailCost += generationCost;

          // TOTAL (persisted)
          totalEmailTokensRef.current += generationTokens;
          totalEmailCostRef.current += generationCost;

          // ✅ ONE EMAIL GENERATED
          lastEmailGenerations = 1;
          totalEmailCountRef.current += 1;

          // keep legacy totals
          cost += generationCost;
          totaltokensused += generationTokens;

          const subjectLine = generation.emailSubject;
          const displayPitch = mergeGeneratedPitchWithEmailTrail(
            generation.emailBody,
            entry.email_body || entry.pitch,
          );

          setallprompt((prev) => {
            const updated = [...prev];

            if (promptTargetIndex < updated.length) {
              updated[promptTargetIndex] = generation.finalPrompt;
            } else {
              updated.push(generation.finalPrompt);
            }

            return updated;
          });

          setContactInsights(promptTargetIndex, {
            webSearchData: generation.webSearchData,
            searchResults: [],
            notes: generation.notes,
            emailContext: generation.emails,
            linkedinInfo: generation.professionalSummary,
          });

          setOutputForm((prevState) => ({
            ...prevState,
            currentPrompt: generation.finalPrompt,
            searchResults: [],
            allScrapedData: generation.webSearchData,
          }));

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

          generatedPitches.push({
            ...entry,
            name: entry.full_name || "N/A",
            title: entry.job_title || "N/A",
            company: entry.company_name || "N/A",
            location: entry.country_or_address || "N/A",
            website: entry.website || "N/A",
            linkedin: entry.linkedin_url || "N/A",
            pitch: displayPitch,
            subject: entry.email_subject || "N/A",
            lastemailupdateddate: entry.updated_at || "N/A",
            emailsentdate: entry.email_sent_at || "N/A",
          });

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
            linkLabel: displayPitch,
            emailSubject: subjectLine,
          }));

          // Update generatedPitches to include subject
          generatedPitches.push({
            ...entry,
            dataFileId: entry.dataFileId || entry.DataFileId || entry.data_file_id || parsedDataFileId || null,
            segmentId: entry.segmentId || (segmentId ? parseInt(segmentId) : null),
            viewId: viewId ? parseInt(viewId) : null,
            company: entry.company_name || "N/A",
            location: entry.country_or_address || "N/A",
            website: entry.website || "N/A",
            linkedin: entry.linkedin_url || "N/A",
            pitch: displayPitch,
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
            pitch: displayPitch,
            subject: subjectLine,
            timestamp: new Date().toISOString(),
            id: entry.id,
            nextPageToken: null,
            prevPageToken: null,
            generated: true,
            lastemailupdateddate: new Date().toISOString(),
            emailsentdate: entry.email_sent_at || "N/A",
            notes: entry.notes || "",
            linkedin_info: entry.linkedIninformation || entry.linkedin_info || "",
            dataFileId: entry.dataFileId || entry.data_file_id || parsedDataFileId || null, // ✅ Use parsedDataFileId if entry doesn't have it
            segmentId: entry.segmentId || (segmentId ? parseInt(segmentId) : null), // ✅ Use segmentId from scope if entry doesn't have it
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

          kraftResumeIndexRef.current =
            responseIndex + 1 < contacts.length ? responseIndex + 1 : null;
          setCurrentIndex(responseIndex);
          setRecentlyAddedOrUpdatedId(newResponse.id);

          // ✅ The contact was already saved by the generation API — just
          // reflect it in the log and refresh the credit balance.
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

        kraftResumeIndexRef.current = null;
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
      const lastPitch =
      allResponses.length > 0
        ? allResponses[allResponses.length - 1].pitch
        : "No pitches were generated in this session";
        
    const emailRequest = {
        cost: cost,
        userid: userId,
        Role: userRole,
        lastPitch:lastPitch,
        totaltokensused: totaltokensused,
        timeSpent: formattedTimeSpent,
        startTime: startTime,
        endTime: endTime,
        generatedPitches: allResponses,
        promptText: selectedPrompt?.text || "No prompt template was selected",
        isPauseReport: false,
      };
      // Send email report
      // sendEmail(
      //   cost,
      //   failedReq,
      //   successReq,
      //   scrapfailedreq,
      //   totaltokensused,
      //   formattedTimeSpent,
      //   startTime,
      //   endTime,
      //   generatedPitches,
      //   selectedPrompt?.text,
      // );
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/sendemail`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(emailRequest),
        });

        if (!response.ok) {
          throw new Error(`Failed to send email: ${response.statusText}`);
        }

        const result = await response.json();
        console.log("Finish report email sent:", result);
      } catch (error) {
        console.error("Error sending email:", error);
      }
    
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

    // Use explicit range starts first; otherwise resume from the next pending contact.
    const indexToStart =
      startIndex !== undefined
        ? startIndex
        : kraftResumeIndexRef.current ?? currentIndex;

    setAllRecordsProcessed(false);
    setIsStarted(true);
    setIsPaused(false);
    // Flip the button to Stop immediately — goToTab only reaches its own
    // setIsProcessing(true) after the credit check and blueprint load, which
    // left the button showing "Start" for a few network round trips.
    setIsProcessing(true);
    stopRef.current = false;

    goToTab("Output", {
      startFromIndex: indexToStart,
      useCachedData: true,
    });
  };

  const handleStop = async () => {
  if (!isProcessing) return;

  setIsPaused(true);
  stopRef.current = true;

  // Calculate time spent so far
  let timeSpent = "";

  const currentTime = new Date();

  if (startTime) {
    const timeDiff = currentTime.getTime() - startTime.getTime();
    const hours = Math.floor(timeDiff / 3600000);
    const minutes = Math.floor((timeDiff % 3600000) / 60000);
    timeSpent = `${hours} hours ${minutes} minutes`;
  }

  // Get the current values from the usage string
  const usageText = outputForm.usage || "";

  // Extract values using regex
  const costMatch = usageText.match(/Cost: \$([0-9.]+)/);
  const failedReqMatch = usageText.match(/Failed Requests: ([0-9]+)/);
  const successReqMatch = usageText.match(/Success Requests: ([0-9]+)/);
  const scrapFailedReqMatch = usageText.match(
    /Scraped Data Failed Requests: ([0-9]+)/,
  );
  const totalTokensUsedMatch = usageText.match(
    /Total Tokens Used: ([0-9]+)/,
  );

  const currentCost = costMatch ? parseFloat(costMatch[1]) : cost;
  const currentFailedReq = failedReqMatch
    ? parseInt(failedReqMatch[1])
    : failedReq;
  const currentSuccessReq = successReqMatch
    ? parseInt(successReqMatch[1])
    : successReq;
  const currentScrapFailedReq = scrapFailedReqMatch
    ? parseInt(scrapFailedReqMatch[1])
    : scrapfailedreq;
  const currentTotalTokensUsed = totalTokensUsedMatch
    ? parseInt(totalTokensUsedMatch[1])
    : totaltokensused;
const lastPitch =
      allResponses.length > 0
        ? allResponses[allResponses.length - 1].pitch
        : "No pitches were generated in this session";
  // ✅ Correct EmailRequest object
  const emailRequest = {
    cost: currentCost.toFixed(2,),
    successReq: currentSuccessReq,
    userid: userId,
    Role: userRole,
    lastPitch:lastPitch,
    totaltokensused: currentTotalTokensUsed,
    timeSpent: timeSpent,
    startTime: startTime,
    endTime: currentTime,
    generatedPitches: allResponses,
    promptText: selectedPrompt?.text || "No prompt template was selected",
    isPauseReport: true,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/sendemail`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emailRequest),
    });

    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("Pause report email sent:", result);

    // Optional: existing email function
    await sendEmail(
      currentCost,
      currentFailedReq,
      currentSuccessReq,
      currentScrapFailedReq,
      currentTotalTokensUsed,
      timeSpent,
      startTime,
      currentTime,
      allResponses,
      selectedPrompt?.text || "No prompt template was selected",
      true,
    );
  } catch (error) {
    console.error("Error sending pause report email:", error);
  }
};


  const handleReset = () => {
    // Only allow reset if paused
    if (!isPaused) return;
    // Stop any ongoing generation process
    stopRef.current = true;
    kraftResumeIndexRef.current = null;

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
  const isDemoAccount =
    (sessionStorage.getItem("isDemoAccount") ?? localStorage.getItem("isDemoAccount")) === "true";

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

  // Fetch inbox unread count
  useEffect(() => {
    const fetchInboxUnreadCount = async () => {
      if (!selectedClient && !clientID) return;
      
      const effectiveClientId = selectedClient || clientID;
      
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/Inbox/unread-count?clientId=${effectiveClientId}`,
          { headers: { accept: '*/*' } }
        );
        
        if (response.ok) {
          const data = await response.json();
          setInboxUnreadCount(data.grandTotalUnreadCount || 0);
        }
      } catch (error) {
        console.error('Error fetching inbox unread count:', error);
      }
    };

    fetchInboxUnreadCount();
    // Refresh count every 30 seconds
    const interval = setInterval(fetchInboxUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [selectedClient, clientID]);

  const handleSelectedInboxUnreadCountsChange = useCallback(
    (counts: SelectedInboxUnreadCounts) => {
      setSelectedInboxUnreadCounts(counts);
    },
    [],
  );

  const renderInboxTabUnreadBadge = (count: number) => {
    if (count <= 0) return null;

    return (
      <span
        style={{
          backgroundColor: '#3f9f42',
          color: 'white',
          borderRadius: '10px',
          padding: '2px 8px',
          fontSize: '12px',
          fontWeight: 'bold',
          minWidth: '20px',
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {count}
      </span>
    );
  };

  // fetch campaigns in parent
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/auth/campaigns/client/${effectiveUserId}`,
        );
        const data = await response.json();
        setCampaigns(normalizeCampaigns(data));
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
  kraftResumeIndexRef.current = null;

  if (!campaignId) {
    setSelectionMode("manual");
    setSelectedPrompt?.(null);
    setSelectedSegmentId(null);
    setSelectedZohoviewId("");
    setAllResponses([]);
    setexistingResponse([]);
    setCurrentIndex(0);
    return;
  }

  setSelectionMode("campaign");

  // ✅ HARD RESET FIRST
  setAllResponses([]);
  setexistingResponse([]);
  setSelectedPrompt(null);
  setCurrentIndex(0);

  const campaign = normalizeCampaigns(campaigns).find(c => String(c?.id) === campaignId);
  if (!campaign) return;

try {
  // Try loading blueprint but don't block
  try {
    await loadCampaignBlueprint(campaignId);
  } catch (e) {
    console.error("Blueprint load failed, continuing...", e);
  }

  const segmentId = (campaign as any).segmentId;
  const dataFileId = campaign.zohoViewId;

  const effectiveUserId =
    selectedClient !== "" ? selectedClient : userId;

  if (segmentId) {
    const segmentZohoviewId = `segment_${segmentId}`;
    setSelectedZohoviewId(segmentZohoviewId);
    await fetchAndDisplayEmailBodies(segmentZohoviewId);
  } else if (dataFileId && typeof dataFileId === "string" && dataFileId.startsWith("view_")) {
    const viewZohoviewId = dataFileId;
    setSelectedZohoviewId(viewZohoviewId);
    await fetchAndDisplayEmailBodies(viewZohoviewId);
  } else if (dataFileId) {
    const datafileZohoviewId = `${effectiveUserId},${dataFileId}`;
    setSelectedZohoviewId(datafileZohoviewId);
    await fetchAndDisplayEmailBodies(datafileZohoviewId);
  } else {
    console.error("Campaign missing segmentId/dataFileId");
  }
} catch (err) {
  console.error("Campaign reload failed:", err);
}
};

  // When the Kraft emails tab becomes active with a pending "kraftCampaignId"
  // request (set by the Kraft icon on the Campaigns page), auto-select that
  // campaign so its contacts load in the Output panel.
  useEffect(() => {
    if (tab !== "Output") return;
    const kraftId = sessionStorage.getItem("kraftCampaignId");
    if (!kraftId) return;
    if (!campaigns || campaigns.length === 0) return;
    if (!normalizeCampaigns(campaigns).some((c) => String(c?.id) === kraftId)) return;
    if (String(selectedCampaign) === kraftId) {
      sessionStorage.removeItem("kraftCampaignId");
      return;
    }
    sessionStorage.removeItem("kraftCampaignId");
    handleCampaignChange({
      target: { value: kraftId },
    } as React.ChangeEvent<HTMLSelectElement>);
  }, [tab, campaigns]);

  const handleClearAll = () => {
    stopRef.current = true;
    kraftResumeIndexRef.current = null;

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

  const getTabPanelStyle = (isVisible: boolean): React.CSSProperties => ({
    display: isVisible ? "block" : "none",
    animation: isVisible ? "main-page-tab-enter 220ms ease-out" : undefined,
  });

  const shouldRenderTab = (tabName: string) =>
    mountedTabs[tabName] || tab === tabName;

  // Blueprints is now a single direct link (no submenu). The setters are kept so
  // other menu handlers can still reset this state; the values are no longer read.
  const [, setShowBlueprintSubmenu] = useState<boolean>(false);
  const [, setBlueprintSubTab] = useState<string>("List");

  const handleSidebarNavigation = (
  e: React.MouseEvent<HTMLDivElement>
  ) => {
    const target = e.target as HTMLElement;

    if (target.closest(".side-menu-button, .submenu-button")) {
      dispatch(closePanel());
    }
  };

  <Header onUpgradeClick={goToMyPlan} connectTo={true} />;

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
              <a
                href={`${window.location.pathname}#/main?tab=Dashboard${
                  selectedClient ? `&clientId=${selectedClient}` : ""
                }`}
                target="_blank"
                title="Open Dashboard in a new tab"
              >
                <img
                  src={pitchLogo}
                  alt="Pitchcraft Logo"
                  style={{ height: "100px", cursor: "pointer" }}
                />
              </a>
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
          <div className="overflow-y-auto flex-1 min-h-0 sidebar-scroll">
            <nav className="flex-1 py-4 space-y-2">
              {/* Side Menu */}
              <div className="side-menu" onClick={handleSidebarNavigation}>
                <div className="side-menu-inner">
                  <ul className="side-menu-list">
                    <li className={tab === "Dashboard" ? "active" : ""}>
                      <button
                        onClick={() => {
                          setTab("Dashboard");
                          setShowMailSubmenu(false);
                          setShowContactsSubmenu(false);
                          setShowSettingsSubmenu(false);
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
                              strokeWidth="2"
                              d="M4 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5ZM14 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V5ZM4 16a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3ZM14 13a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-6Z"
                            />
                          </svg>
                        </span>
                        <span className="menu-text">Dashboard</span>
                      </button>
                    </li>

                    <li
                      className={`${tab === "DataCampaigns" || tab === "CustomFields" ? "active" : ""} ${
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
                            setShowSettingsSubmenu(false);
                            navigate(`/main?tab=DataCampaigns&subtab=${contactsSubTab}`);
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
                                navigate(`/main?tab=DataCampaigns&subtab=List&t=${Date.now()}`);
                              }}
                              className="submenu-button"
                            >
                              Lists
                            </button>
                          </li>
                          <li
                            className={
                              contactsSubTab === "View" ? "active" : ""
                            }
                          >
                            <button
                              onClick={() => {
                                setContactsSubTab("View");
                                setTab("DataCampaigns");
                                setShowMailSubmenu(false);
                                navigate("/main?tab=DataCampaigns&subtab=View");
                              }}
                              className="submenu-button"
                            >
                              Views
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
                                navigate("/main?tab=DataCampaigns&subtab=Segment");
                              }}
                              className="submenu-button"
                            >
                              Segments
                            </button>
                          </li>
                          <li
                            className={
                              contactsSubTab === "CustomFields" ? "active" : ""
                            }
                          >
                            <button
                              onClick={() => {
                                setContactsSubTab("CustomFields");
                                setTab("DataCampaigns");
                                setShowMailSubmenu(false);
                                setShowSettingsSubmenu(false);
                                navigate("/main?tab=DataCampaigns&subtab=CustomFields");
                              }}
                              className="submenu-button"
                            >
                              Custom attributes
                            </button>
                          </li>

                        </ul>
                      )}
                    </li>

                    <li className={tab === "TestTemplate" ? "active" : ""}>
                      <button
                        onClick={() => {
                          setBlueprintSubTab("List");
                          setTab("TestTemplate");
                          setShowBlueprintSubmenu(false);
                          setShowMailSubmenu(false);
                          setShowContactsSubmenu(false);
                          setShowSettingsSubmenu(false);

                          // FIX: Delay writing to session to avoid breaking navigation
                          setTimeout(() => {
                            sessionStorage.setItem("campaign_activeTab", "build");
                          }, 0);

                          navigate("/main?tab=TestTemplate");
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
                      </button>
                    </li>

                    <li className={tab === "Campaigns" ? "active" : ""}>
                      <button
                        onClick={() => {
                          setTab("Campaigns");
                          setShowMailSubmenu(false);
                          setShowContactsSubmenu(false);
                          setShowSettingsSubmenu(false);
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
                          setShowSettingsSubmenu(false);
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
                          <li className={tab === "Mail" && mailSubTab === "Inbox" ? "active" : ""}>
                            <button
                              onClick={() => {
                                setMailSubTab("Inbox");
                                setTab("Mail");
                                navigate("/main?tab=Mail&mailSubTab=Inbox");
                              }}
                              className="submenu-button"
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}
                            >
                              <span>Inbox</span>
                              {inboxUnreadCount > 0 && (
                                <span
                                  style={{
                                    backgroundColor: '#3f9f42',
                                    color: 'white',
                                    borderRadius: '10px',
                                    padding: '2px 8px',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    minWidth: '20px',
                                    textAlign: 'center'
                                  }}
                                >
                                  {inboxUnreadCount}
                                </span>
                              )}
                            </button>
                          </li>
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

                    <li
                      className={`${tab === "Settings" || tab === "Profile" ? "active" : ""} ${
                        showSettingsSubmenu
                          ? "has-submenu submenu-open"
                          : "has-submenu"
                      }`}
                    >
                      <button
                        onClick={() => {
                          if (tab !== "Settings" && tab !== "Profile") {
                            setTab("Settings");
                            setShowSettingsSubmenu(true);
                            setShowMailSubmenu(false);
                            setShowContactsSubmenu(false);
                          } else {
                            setShowSettingsSubmenu((prev) => !prev);
                          }
                        }}
                        className="side-menu-button"
                        title="Application settings"
                      >
                        <span className="menu-icon">
                          <FontAwesomeIcon
                            icon={faGear}
                            className=" text-[#333333] text-lg"
                          />
                        </span>
                        <span className="menu-text">Settings</span>
                        <span className="submenu-arrow">
                          <FontAwesomeIcon
                            icon={faAngleRight}
                            className=" text-[#333333] text-lg"
                          />
                        </span>
                      </button>
                      {showSettingsSubmenu && (
                        <ul className="submenu">
                          <li className={tab === "Profile" ? "active" : ""}>
                            <button
                              onClick={() => {
                                setTab("Profile");
                                setShowMailSubmenu(false);
                                setShowContactsSubmenu(false);
                              }}
                              className="submenu-button"
                            >
                              Profile
                            </button>
                          </li>
                          <li
                            className={
                              tab === "Settings" && settingsSubTab === "General"
                                ? "active"
                                : ""
                            }
                          >
                            <button
                              onClick={() => {
                                setSettingsSubTab("General");
                                setTab("Settings");
                              }}
                              className="submenu-button"
                            >
                              General
                            </button>
                          </li>
                          {userRole === "ADMIN" && (
                            <li
                              className={
                                tab === "Settings" &&
                                settingsSubTab === "InstructionSet"
                                  ? "active"
                                  : ""
                              }
                            >
                              <button
                                onClick={() => {
                                  setSettingsSubTab("InstructionSet");
                                  setTab("Settings");
                                }}
                                className="submenu-button"
                              >
                                Instruction set
                              </button>
                            </li>
                          )}
                        </ul>
                      )}
                    </li>
                  </ul>
                </div>
              </div>
            </nav>
          </div>

          {/* Support details — pinned to the bottom-left of the menu.
              Hidden while any submenu is expanded so the menu never needs to
              scroll. Extra bottom padding keeps the email line clear of the
              fixed Live Chat widget in the bottom-left corner. */}
          {!showContactsSubmenu && !showMailSubmenu && !showSettingsSubmenu && (
            <div className="mt-auto border-t border-gray-200 px-4 pt-4 pb-24">
              <h4 className="text-[13px] font-semibold text-gray-800 mb-2">
                Need support?
              </h4>
              <div className="text-[12px] text-gray-600 space-y-1">
                <p>
                  <span className="font-medium text-gray-700">London:</span>{" "}
                  +44 (0) 207 660 4243
                </p>
                <p>
                  <span className="font-medium text-gray-700">New York:</span>{" "}
                  +1 (0) 315 400 2402
                </p>
                <p>
                  <a
                    href="mailto:support@pitchkraft.co"
                    className="text-[#3f9f42] hover:underline break-all"
                  >
                    support@pitchkraft.co
                  </a>
                </p>
              </div>
            </div>
          )}
        </aside>
      )}

      {/* Content Area */}
      <div className="flex flex-col flex-1 h-full w-[calc(100%-270px)]">
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
            onUpgradeClick={goToMyPlan}
          />
        </header>

        {/* Inner Main Content */}
        <main className={`flex-1 overflow-y-auto h-[calc(100%-87px)] ${
          tab === "Dashboard" || tab === "MyPlan"
            ? "bg-white"
            : tab === "TestTemplate" || tab === "DataCampaigns" || tab === "Campaigns" || tab === "Settings" || tab === "Profile" || tab === "Mail"
              ? "bg-[#fafbfc]"
              : "bg-[#eeeeee]"
        } ${tab === "Dashboard" || tab === "MyPlan" || tab === "TestTemplate" || tab === "DataCampaigns" || tab === "Campaigns" || tab === "Settings" || tab === "Profile" || tab === "Output" || tab === "Mail" ? "p-0" : "p-[20px]"}`}>
          <div
            className={`
               rounded-md
              ${!isContactDetailPage && tab !== "Dashboard" && tab !== "MyPlan" && tab !== "TestTemplate" && tab !== "DataCampaigns" && tab !== "Campaigns" && tab !== "Settings" && tab !== "Profile" && tab !== "Output" && tab !== "Mail" ? "bg-white p-4 shadow-md min-h-[100%]" : ""}
            `}
          >
            {/* Main Content Area */}
            {isContactDetailPage ? (
              <ContactDetailView embedded />
            ) : (
              <>

            {shouldRenderTab("Dashboard") && (
              <div className="tab-content preserved-tab-panel" style={getTabPanelStyle(tab === "Dashboard")}>
                <Dashboard firstName={firstName ?? undefined} clientId={effectiveUserId ?? undefined} />
              </div>
            )}

            {/* <div className="tab-content"></div> */}

            {shouldRenderTab("DataCampaigns") && (
              <>
                <div
                  className="preserved-tab-panel"
                  style={getTabPanelStyle(
                    tab === "DataCampaigns" &&
                    contactsSubTab !== "CustomFields" &&
                    !showDataFileUpload
                  )}
                >
                  <DataCampaigns
                    selectedClient={selectedClient}
                    onDataProcessed={handleExcelDataProcessed}
                    isProcessing={isProcessing}
                    initialTab={contactsSubTab}
                    onTabChange={setContactsSubTab}
                    onAddContactClick={() => setShowDataFileUpload(true)}
                  />
                </div>

                {(hasMountedDataFileUpload || showDataFileUpload) && (
                  <div
                    className="preserved-tab-panel"
                    style={getTabPanelStyle(tab === "DataCampaigns" && showDataFileUpload)}
                  >
                    <DataFile
                      selectedClient={selectedClient}
                      onDataProcessed={(data) => {
                        handleExcelDataProcessed(data);
                        setShowDataFileUpload(false);
                      }}
                      isProcessing={isProcessing}
                      onBack={() => setShowDataFileUpload(false)}
                    />
                  </div>
                )}
                <div
                  className="preserved-tab-panel"
                  style={getTabPanelStyle(
                    tab === "DataCampaigns" && contactsSubTab === "CustomFields"
                  )}
                >
                  <CustomFieldSettings
                    selectedClient={selectedClient}
                  />
                </div>
              </>
            )}
            {shouldRenderTab("Campaigns") && (
              <div className="preserved-tab-panel" style={getTabPanelStyle(tab === "Campaigns")}>
                <CampaignManagement
                  selectedClient={selectedClient}
                  userRole={userRole}
                />
              </div>
            )}
            {shouldRenderTab("Output") && (
              <div className="preserved-tab-panel" style={getTabPanelStyle(tab === "Output")}>
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
                  delayTime={delayTime.toString()}
                  setDelay={(value: string) => setDelay(parseInt(value) || 0)}
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
                  selectedPrompt={selectedPrompt}
                  handleStop={handleStop}
                  isStopRequested={stopRef.current}
                  selectedSegmentId={selectedSegmentId}
                  handleSubjectTextChange={handleSubjectTextChange}
                  showCreditModal={showCreditModal}
                  checkUserCredits={checkUserCredits}
                  userId={userId}
                  followupEnabled={followupEnabled}
                  setFollowupEnabled={setFollowupEnabled}
                  notKraftedEnabled={notKraftedEnabled}
                  setNotKraftedEnabled={setNotKraftedEnabled}
                  kraftedNotSentEnabled={kraftedNotSentEnabled}
                  setKraftedNotSentEnabled={setKraftedNotSentEnabled}
                  isSoundEnabled={isSoundEnabled}
                  setIsSoundEnabled={setIsSoundEnabled}
                  clearUsage={clearUsage}
                  isFetchingContacts={isFetchingContacts}
                />
              </div>
            )}

            {shouldRenderTab("Mail") && (
              <div className="preserved-tab-panel" style={getTabPanelStyle(tab === "Mail")}>
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
                  inboxSubTab={inboxSubTab}
                  onInboxSubTabChange={setInboxSubTab}
                  onSelectedInboxUnreadCountsChange={handleSelectedInboxUnreadCountsChange}
                />
              </div>
            )}
            {shouldRenderTab("Playground") && userRole === "ADMIN" && (
              <div className="preserved-tab-panel" style={getTabPanelStyle(tab === "Playground")}>
                <EmailCampaignBuilder selectedClient={selectedClient} />
              </div>
            )}
            {shouldRenderTab("DeepSeekSearch") && userRole === "ADMIN" && (
              <div className="preserved-tab-panel" style={getTabPanelStyle(tab === "DeepSeekSearch")}>
                <DeepSeekSearchGenerator />
              </div>
            )}

            {shouldRenderTab("TestTemplate") && (
              <div className="preserved-tab-panel" style={getTabPanelStyle(tab === "TestTemplate")}>
                <Template
                  selectedClient={selectedClient}
                  userRole={userRole}
                  isDemoAccount={isDemoAccount}
                  onTemplateSelect={(template) => {
                    setSelectedPrompt(template);
                  }}
                />
              </div>
            )}
            {shouldRenderTab("CustomFields") && (
              <div className="preserved-tab-panel" style={getTabPanelStyle(tab === "CustomFields")}>
                <CustomFieldSettings
                  selectedClient={selectedClient}
                />
              </div>
            )}

            {/* Stop Confirmation Popup */}
            {showPopup && (
              <div className="popup">
                <p>Do you want to stop the process?</p>
                <button onClick={() => handlePopupResponse(true)}>Yes</button>
                <button onClick={() => handlePopupResponse(false)}>No</button>
              </div>
            )}
            {shouldRenderTab("Settings") && (
              <div className="preserved-tab-panel" style={getTabPanelStyle(tab === "Settings")}>
                {settingsSubTab === "InstructionSet" && userRole === "ADMIN" ? (
                  <InstructionSetPage selectedClient={(effectiveUserId ?? "").toString()} />
                ) : (
                  <Settings selectedClient={(effectiveUserId ?? "").toString()} />
                )}
              </div>
            )}
            {shouldRenderTab("Profile") && (
              <div className="preserved-tab-panel" style={getTabPanelStyle(tab === "Profile")}>
                <Profile />
              </div>
            )}
            {shouldRenderTab("MyPlan") && (
              <div className="preserved-tab-panel" style={getTabPanelStyle(tab === "MyPlan")}>
                <Myplan selectedClient={effectiveUserId?.toString() || null} />
              </div>
            )}
              </>
            )}
          </div>
        </main>
      </div>
      <AppModal
        isOpen={appModal.isOpen}
        onClose={appModal.hideModal}
        {...appModal.config}
      />
      {isLoadingClientSettings && (
        <LoadingSpinner message="Loading blueprint..." />
      )}
      <CreditCheckModal
        isOpen={showCreditModal || forceShowCreditModal}
        onClose={() => {
          setForceShowCreditModal(false);
          closeCreditModal();
        }}
        onSkip={() => {
          setForceShowCreditModal(false);
          handleSkipModal();
        }}
        credits={credits}
        setTab={(nextTab) => {
          if (nextTab === "MyPlan") {
            goToMyPlan();
            return;
          }

          setTab(nextTab);
        }}
      />
    </div>
  );
};

export default MainPage;
