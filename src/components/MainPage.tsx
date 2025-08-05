import React, { useRef, useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAngleRight,
  faBars,
  faBullhorn,
  faEnvelopeOpen,
  faGear,
  faList,
} from "@fortawesome/free-solid-svg-icons";
import { faEnvelope, faFileAlt } from "@fortawesome/free-regular-svg-icons";
import "./MainPage.css";
import Modal from "./common/Modal";
import { useSelector } from "react-redux";
import ReactQuill from "react-quill-new";
import { Tooltip as ReactTooltip } from "react-tooltip";
import Mail from "./feature/Mail";
import "react-quill-new/dist/quill.snow.css";
import { RootState } from "../Redux/store";
import { systemPrompt, Languages } from "../utils/label";
import Output from "./feature/Output";
import Settings from "./feature/Settings";
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
    onClearContent?: (clearContent: () => void) => void; // Add this line
  };

  onRegenerateContact?: (
    tab: string,
    options: {
      regenerate: boolean;
      regenerateIndex: number;
      nextPageToken?: string | null;
      prevPageToken?: string | null;
    }
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
  onClearOutput: () => void; // Add this line
  allprompt: any[];
  setallprompt: React.Dispatch<React.SetStateAction<any[]>>;
  allsearchResults: any[];
  setallsearchResults: React.Dispatch<React.SetStateAction<any[]>>;
  everyscrapedData: any[];
  seteveryscrapedData: React.Dispatch<React.SetStateAction<any[]>>;
  allSearchTermBodies: string[];
  setallSearchTermBodies: React.Dispatch<React.SetStateAction<string[]>>;
  allsummery: any[];
  setallsummery: React.Dispatch<React.SetStateAction<any[]>>;
  existingResponse: any[];
  setexistingResponse: React.Dispatch<React.SetStateAction<any[]>>;
  handleNextPage: () => Promise<void>;
  handlePrevPage: () => Promise<void>;
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
    // Context and hooks

 const appData = useAppData();
  const triggerRefresh = appData.triggerRefresh;
  const setClientSettings = appData.setClientSettings;
  const clientSettings = appData.clientSettings;
  const refreshTrigger = appData.refreshTrigger;

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
    "manual"
  );

  const [lastProcessedToken, setLastProcessedToken] = useState(null);
  const [lastProcessedIndex, setLastProcessedIndex] = useState(0);
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
  const [subjectMode, setSubjectMode] = useState("AI generated");
  const [subjectText, setSubjectText] = useState("");
  const [recentlyAddedOrUpdatedId, setRecentlyAddedOrUpdatedId] = useState<
    string | number | null
  >(null);

  const dispatch = useDispatch<AppDispatch>(); // ✅ type the dispatch
  const { selectedModelName } = useModel(); // Selected model name
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
  const [tab, setTab] = useState<string>("Template");
  const [mailSubTab, setMailSubTab] = useState<string>("Dashboard");
  const [showMailSubmenu, setShowMailSubmenu] = useState<boolean>(false);
  const [showContactsSubmenu, setShowContactsSubmenu] = useState(false);
  const [contactsSubTab, setContactsSubTab] = useState("List");

  const [showDataFileUpload, setShowDataFileUpload] = useState(false);

  const [isLoadingClientSettings, setIsLoadingClientSettings] = useState(false);
  const clientID = sessionStorage.getItem("clientId");



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

  const reset = () => {
    stopRef.current = false;
    setIsPaused(false);
    setLastProcessedToken(null);
    setLastProcessedIndex(0);
  };

    // Campaign fetching effect

 useEffect(() => {
    const fetchCampaigns = async () => {
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
        setCampaigns(data);
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

  useEffect(() => {
    const fetchSettings = async () => {
      if (selectedClient) {
        const settings = await fetchClientSettings(Number(selectedClient));
        // do something with the settings here
        console.log(settings);
      }
    };

    fetchSettings();
  }, [selectedClient]);

  const handleNewDataFileSelection = () => {
    // Call the clear function when a new data file is selected
    if (clearExistingResponse) {
      clearExistingResponse();
    }

    // Additional logic for handling new data file selection can be added here
  };

  // Handle change event for the select element
  const handleZohoModelChange = async (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const selectedId = event.target.value;

    // Switch to manual mode when selecting a data file
    if (selectedId) {
      setSelectionMode("manual");
      setSelectedCampaign(""); // Clear campaign selection
    }

    setSelectedZohoviewId(selectedId); // Update the global state

    // Call the clear function when a new data file is selected
    handleNewDataFileSelection();

    if (selectedId && clientID) {
      try {
        // Pass the data file ID instead of zoho view ID
        await fetchAndDisplayEmailBodies(`${clientID},${selectedId}`);
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
    e: React.ChangeEvent<HTMLTextAreaElement>
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
      : Object.values(Languages)[0]
  );

  const [zohoClient, setZohoClient] = useState<ZohoClient[]>([]);

  const handleLanguageChange = (
    event: React.ChangeEvent<HTMLSelectElement>
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

  const fetchPromptsList = useCallback(async () => {
    setEmailLoading(true); // Start loading indicator

    try {
      let url = apiUrl; // Default to current user's prompts

      // If a client is selected, modify the URL to fetch prompts for that client
      if (selectedClient !== "") {
        url = `${API_BASE_URL}/api/auth/getprompts/${selectedClient}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }
      const data: Prompt[] = await response.json();
      console.log("Fetched prompts:", data);
      setPromptList(data);
    } catch (err) {
      console.error("Error fetching prompts:", err);
      setPromptList([]); // Ensure the list is empty in case of an error
    } finally {
      setEmailLoading(false); // Set loading to false when fetching is done
    }
  }, [selectedClient, apiUrl, API_BASE_URL]);

  useEffect(() => {
    // Clear the prompt list immediately when a new client is selected
    setPromptList([]);
    fetchPromptsList();
  }, [selectedClient, fetchPromptsList]);

 const handleClientChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
  const newClientId = event.target.value;
  setSelectedClient(newClientId);

  // Clear existing selections when client changes
  setSelectedPrompt(null);
  setSelectedZohoviewId("");
  setSelectedCampaign("");
  setSelectionMode("manual");
  setPromptList([]);

  // Immediately load client settings using YOUR existing function
  if (newClientId) {
    setIsLoadingClientSettings(true);
    try {
      console.log("Loading settings for client:", newClientId);
      const settings = await fetchClientSettings(Number(newClientId)); // This uses YOUR function
      console.log("Settings loaded:", settings);
      
      // Store settings in context
      setClientSettings(settings);
      
      // Trigger refresh for all components
      triggerRefresh();
    } catch (error) {
      console.error("Error loading client settings:", error);
      setClientSettings(null);
    } finally {
      setIsLoadingClientSettings(false);
    }
  } else {
    setClientSettings(null);
    triggerRefresh();
  }
};


  useEffect(() => {
    const isAdminString = sessionStorage.getItem("isAdmin");
    const isAdmin = isAdminString === "true"; // Correct comparison
    setUserRole(isAdmin ? "ADMIN" : "USER");
  }, []);

  // Add a prompt
  const [addPrompt, setAddPrompt] = useState({
    promptName: "",
    promptInput: "",
    promptTemplate: "",
  });
  const [editPrompt, setEditPrompt] = useState({
    promptName: "",
    promptInput: "",
    promptTemplate: "",
  }) as any;

  const addPromptHandler = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setAddPrompt({
      ...addPrompt,
      [name]: value,
    });
  };
  const editPromptHandler = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setEditPrompt({
      ...editPrompt,
      [name]: value,
    });
  };
  const addPromptSubmitHandler = (e: any) => {
    e.preventDefault();
    createPromptList();
  };
  const setEditHandler = () => {
    setEditPrompt({
      promptName: selectedPrompt?.name,
      promptInput: selectedPrompt?.text,
      promptTemplate: selectedPrompt?.template,
    });
  };
  const editPromptSubmitHandler = (e: any) => {
    e.preventDefault();
    editPromptList();
  };

  const [editPromptAlert, setEditPromptAlert] = useState(false);

  const editPromptList = useCallback(async () => {
    if (
      !editPrompt?.promptName ||
      !editPrompt?.promptInput ||
      !editPrompt?.promptTemplate
    )
      return;

    // Determine which ID to use for the update
    const effectiveUserId = selectedClient !== "" ? selectedClient : userId;

    if (!effectiveUserId || Number(effectiveUserId) <= 0) {
      console.error("Invalid userId or clientID:", effectiveUserId);
      return;
    }

    const id = selectedPrompt?.id; // Get the ID from selectedPrompt

    if (!id || Number(id) <= 0) {
      console.error("Invalid prompt ID:", id);
      return;
    }

    const dataToSend = {
      id: id, // Include the ID for the update
      name: editPrompt?.promptName,
      text: editPrompt?.promptInput,
      userId: effectiveUserId, // Use the determined ID
      createdAt: "2025-02-12T15:15:53.666Z", // This should be updated or removed based on your backend requirements
      template: editPrompt?.promptTemplate,
    };

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/auth/updateprompt`,
        dataToSend,
        { headers: { "Content-Type": "application/json" } }
      );

      console.log("Prompt updated successfully:", res);
      setEditPrompt({ promptName: "", promptInput: "", promptTemplate: "" }); // Reset the form
      setEditPromptAlert((prev) => !prev);
      setTimeout(() => {
        setEditPromptAlert((prev) => !prev);
      }, 3000);
      await fetchPromptsList(); // Refresh the prompt list
    } catch (error: any) {
      console.error(
        "Error updating prompt:",
        error.response?.data || error.message
      );
      // Handle error, display message to user, etc.
    }
  }, [
    editPrompt?.promptInput,
    editPrompt?.promptName,
    editPrompt?.promptTemplate,
    selectedPrompt?.id,
    userId,
    selectedClient,
    fetchPromptsList,
    setEditPrompt,
    setEditPromptAlert,
  ]);

  const [addPromptAlert, setAddPromptAlert] = useState(false);

  const createPromptList = useCallback(async () => {
    if (!addPrompt?.promptName || !addPrompt?.promptInput) return;

    // Determine which ID to use for the creation
    const effectiveUserId =
      selectedClient !== "" ? Number(selectedClient) : Number(userId);

    if (!effectiveUserId || effectiveUserId <= 0) {
      console.error("Invalid userId or clientID:", effectiveUserId);
      return;
    }

    const dataToSend = {
      name: addPrompt.promptName,
      text: addPrompt.promptInput,
      userId: effectiveUserId, // Use the determined ID
      createdAt: new Date().toISOString(),
      template: addPrompt.promptTemplate,
    };

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/auth/addprompt`,
        dataToSend,
        { headers: { "Content-Type": "application/json" } }
      );

      console.log("Prompt created successfully:", res);
      setAddPrompt({ promptName: "", promptInput: "", promptTemplate: "" });
      setAddPromptAlert((prev) => !prev);
      setTimeout(() => {
        setAddPromptAlert((prev) => !prev);
      }, 3000);
      await fetchPromptsList();
    } catch (error) {
      console.error("Error creating prompt:", error);
    }
  }, [
    addPrompt,
    userId,
    selectedClient,
    fetchPromptsList,
    setAddPrompt,
    setAddPromptAlert,
  ]);

  const deletePromptHandler = async () => {
    if (!selectedPrompt) {
      console.error("No prompt selected to delete.");
      return;
    }

    // Determine which ID to use for the deletion
    const effectiveUserId = selectedClient !== "" ? selectedClient : userId;

    if (!effectiveUserId || Number(effectiveUserId) <= 0) {
      console.error("Invalid userId or clientID:", effectiveUserId);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/deleteprompt/${selectedPrompt.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: Number(effectiveUserId) }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      // Get the updated prompt list from the API
      let updatedPromptsResponse;
      if (selectedClient !== "") {
        updatedPromptsResponse = await fetch(
          `${API_BASE_URL}/api/auth/getprompts/${selectedClient}`
        );
      } else {
        updatedPromptsResponse = await fetch(apiUrl);
      }

      if (!updatedPromptsResponse.ok) {
        const errorText = await updatedPromptsResponse.text();
        throw new Error(
          `HTTP error fetching prompts: ${updatedPromptsResponse.status}, message: ${errorText}`
        );
      }

      const updatedPromptList = await updatedPromptsResponse.json();
      setPromptList(updatedPromptList); // Update the promptList state
      handleModalClose("modal-confirm-delete");

      console.log("Prompt deleted and prompt list updated:", updatedPromptList);
      setSelectedPrompt(null); // Clear the selected prompt
    } catch (error) {
      console.error("Error deleting prompt or fetching updated list:", error);
      // Handle error, e.g., show message to user
    }
  };

  const tabHandler = (e: React.MouseEvent<HTMLButtonElement>) => {
    const { innerText } = e.currentTarget;
    setTab(innerText);
  };

  const [tab2, setTab2] = useState("Template");
  const tabHandler2 = (e: React.ChangeEvent<any>) => {
    const { innerText } = e.target;
    console.log(innerText, "innerText");
    setTab2(innerText);
  };

  const [tab3, setTab3] = useState("Template");
  const tabHandler3 = (e: React.ChangeEvent<any>) => {
    const { innerText } = e.target;
    console.log(innerText, "innerText");
    setTab3(innerText);
  };

  const [tab4, setTab4] = useState("Template");
  const tabHandler4 = (e: React.ChangeEvent<any>) => {
    const { innerText } = e.target;
    console.log(innerText, "innerText");
    setTab4(innerText);
  };

  const [delayTime, setDelay] = useState<number>(0);
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [cachedContacts, setCachedContacts] = useState<any[]>([]);

  const fetchAndDisplayEmailBodies = useCallback(
  async (
    zohoviewId: string, // Format: "clientId,dataFileId" OR "segment_segmentId"
    pageToken: string | null = null,
    direction: "next" | "previous" | null = null
  ) => {
    try {
      setEmailLoading(true);

      const effectiveUserId =
        selectedClient !== "" ? Number(selectedClient) : Number(userId);

      if (!effectiveUserId || effectiveUserId <= 0) {
        console.error("Invalid userId or clientID:", effectiveUserId);
        return;
      }

      let contactsData = [];

      // ✅ Check if this is a segment-based call
      if (zohoviewId.startsWith("segment_")) {
        // Extract segmentId from "segment_123" format
        const segmentId = zohoviewId.replace("segment_", "");
        console.log("Fetching segment contacts for segmentId:", segmentId);

        // ✅ Fetch from segment API
        const url = `${API_BASE_URL}/api/Crm/segment/${segmentId}/contacts`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error("Failed to fetch segment contacts");
        }

        const fetchedSegmentData = await response.json();
        contactsData = fetchedSegmentData || [];
        console.log("Fetched segment contacts:", contactsData);

      } else {
        // ✅ Original datafile logic (unchanged)
        // Parse zohoviewId to get clientId and dataFileId
        const [clientId, dataFileId] = zohoviewId.split(",");

        // Use effectiveUserId instead of selectedClient in URL
        const url = `${API_BASE_URL}/api/crm/contacts/by-client-datafile?clientId=${effectiveUserId}&dataFileId=${dataFileId}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error("Failed to fetch email bodies");
        }

        const fetchedEmailData = await response.json();
        contactsData = fetchedEmailData.contacts || [];
        console.log("Fetched datafile contacts:", contactsData);
      }

      // ✅ Rest of the function remains exactly the same
      setCachedContacts(contactsData);

      if (!Array.isArray(contactsData)) {
        console.error("Invalid data format");
        return;
      }

      const emailResponses = contactsData.map((entry: any) => ({
        id: entry.id,
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
    } catch (error) {
      console.error("Error fetching email bodies:", error);
    } finally {
      setEmailLoading(false);
    }
  },
  [selectedClient, userId]
);


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
    isPauseReport: boolean = false
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
                  2
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

  const fetchClientSettings = async (clientID: number): Promise<any> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/clientSettings/${clientID}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch client settings");
      }
      const settings = await response.json();

      if (!settings || settings.length === 0) {
        console.warn("No settings found for the given Client ID");
        return {}; // Return an empty object if no settings are found
      }

      // Assuming the first object in the array is the relevant settings
      const clientSettings = settings[0];

      return {
        modelName: clientSettings.model_name,
        searchCount: clientSettings.search_URL_count,
        searchTerm: clientSettings.search_term,
        instructions: clientSettings.instruction,
        systemInstructions: clientSettings.system_instruction,
        subjectInstructions: clientSettings.subject_instruction,
      };
    } catch (error) {
      console.error("Error fetching client settings:", error);
      return {}; // Return an empty object in case of an error
    }
  };

  const analyzeScrapedData = (
    scrapedData: string
  ): { original: number; assisted: number } => {
    if (!scrapedData) return { original: 0, assisted: 0 };

    // Count occurrences of text1 (original) and text2 (assisted)
    const originalCount = (scrapedData.match(/text1\s*=/g) || []).length;
    const assistedCount = (scrapedData.match(/text2\s*=/g) || []).length;

    return { original: originalCount, assisted: assistedCount };
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
    }
  ) => {
    setTab(tab);
    // If already processing, show loader and prevent multiple starts
    if (isProcessing) {
      return;
    }
    // Fetch default values from API
    const defaultValues = await fetchClientSettings(Number(clientID));
    // Determine which values to use
    const selectedModelNameA = selectedModelName || defaultValues.modelName;
    const searchterm = searchTermForm.searchTerm || defaultValues.searchTerm;
    const searchCount = searchTermForm.searchCount || defaultValues.searchCount;
    const instructionsParamA =
      searchTermForm.instructions || defaultValues.instructions;
    const systemInstructionsA =
      settingsForm.systemInstructions || defaultValues.systemInstructions;
    const subject_instruction =
      settingsForm.subjectInstructions || defaultValues.subjectInstructions;

    const startTime = new Date();

   let parsedClientId: number;
let parsedDataFileId: number | null = null;
let segmentId: string | null = null;

    if (selectedZohoviewId) {
  if (selectedZohoviewId.startsWith("segment_")) {
    // ✅ Handle segment-based campaign
    segmentId = selectedZohoviewId.replace("segment_", "");
    parsedClientId = selectedClient !== "" ? Number(selectedClient) : Number(userId);
    parsedDataFileId = null; // No dataFileId for segments
    console.log("Using segment-based campaign, segmentId:", segmentId);
  } else if (selectedZohoviewId.includes(",")) {
    // ✅ Handle datafile-based campaign (existing logic)
    const [clientIdStr, dataFileIdStr] = selectedZohoviewId.split(",");
    parsedClientId = parseInt(clientIdStr);
    parsedDataFileId = parseInt(dataFileIdStr);
    console.log("Using datafile-based campaign, dataFileId:", parsedDataFileId);
  } else {
    // ✅ Fallback for different format
    parsedDataFileId = parseInt(selectedZohoviewId);
    parsedClientId = selectedClient !== "" ? Number(selectedClient) : Number(userId);
  }
} else {
  parsedClientId = selectedClient !== "" ? Number(selectedClient) : Number(userId);
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
          new Date()
        )}] Error: Cannot generate pitch  Missing required parameters: ${missingVars.join(
          ", "
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
        // Parse selectedZohoviewId to get clientId and dataFileId
        const [clientIdStr, dataFileIdStr] = selectedZohoviewId.split(",");

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
        // --- Get current date in readable format ---
        const currentDate = new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        // --- Generate new pitch as per your normal contact process ---
        const searchTermBody = searchterm
          .replace("{company_name}", company_name)
          .replace("{job_title}", job_title)
          .replace("{location}", location)
          .replace("{full_name}", full_name)
          .replace("{linkedin_url}", linkedin_url)
          .replace("{linkedin_url}", company_name_friendly)
          .replace("{website}", website)
          .replace("{date}", currentDate);

        const filledInstructions = instructionsParamA
          .replace("{company_name}", company_name)
          .replace("{job_title}", job_title)
          .replace("{location}", location)
          .replace("{full_name}", full_name)
          .replace("{linkedin_url}", linkedin_url)
          .replace("{linkedin_url}", company_name_friendly)
          .replace("{website}", website);

        const cacheKey = JSON.stringify({
          searchTerm: searchTermBody,
          instructions: filledInstructions,
          modelName: selectedModelNameA,
          searchCount,
        });

        let scrapeData: any;
        let cacheHit = false;
        if (processCacheRef.current[cacheKey]) {
          scrapeData = processCacheRef.current[cacheKey];
          cacheHit = true;
        } else {
          setOutputForm((prev) => ({
            ...prev,
            generatedContent:
              `<span style="color: orange">[${formatDateTime(
                new Date()
              )}] Crafting phase #1 societatis, for contact ${full_name} with company name ${company_name} and domain ${
                entry.email
              }</span><br/>` + prev.generatedContent,
          }));
          const scrapeResponse = await fetch(
            `${API_BASE_URL}/api/auth/process`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                searchTerm: searchTermBody,
                instructions: filledInstructions,
                modelName: selectedModelNameA,
                searchCount: searchCount,
              }),
            }
          );
          if (!scrapeResponse.ok) {
            setIsProcessing(false);
            setIsPitchUpdateCompleted(true);
            setIsPaused(true);
            return;
          }
          scrapeData = await scrapeResponse.json();
          processCacheRef.current[cacheKey] = scrapeData;
        }

        if (cacheHit) {
          setOutputForm((prev) => ({
            ...prev,
            generatedContent:
              `<span style="color: #b38f00">[${formatDateTime(
                new Date()
              )}] Loading phase #1 societatis, for contact ${full_name} with company name ${company_name} and domain ${
                entry.email
              }</span><br/>` + prev.generatedContent,
          }));
        }

        const summary = scrapeData.pitchResponse || {};
        const searchResults = scrapeData.searchResults || [];
        const scrappedData = summary.content || "";

        if (!scrappedData) {
          setIsProcessing(false);
          setIsPitchUpdateCompleted(true);
          setIsPaused(true);
          return;
        }

        let systemPrompt = systemInstructionsA;
        const replacedPromptText = (selectedPrompt?.text || "")
          .replace("{search_output_summary}", scrappedData)
          .replace("{company_name}", company_name)
          .replace("{job_title}", job_title)
          .replace("{location}", location)
          .replace("{full_name}", full_name)
          .replace("{linkedin_url}", company_name_friendly)
          .replace("{linkedin_url}", linkedin_url)
          .replace("{website}", website)
          .replace("{date}", currentDate);

        const promptToSend = `\n${systemPrompt}\n${replacedPromptText}`;

        setOutputForm((prev) => ({
          ...prev,
          currentPrompt: promptToSend,
          searchResults: scrapeData.searchResults || [],
          allScrapedData: scrapeData.allScrapedData || "",
        }));

        const requestBody = {
          scrappedData: systemPrompt,
          prompt: `${selectedPrompt?.text}`
            .replace("{company_name}", company_name)
            .replace("{job_title}", job_title)
            .replace("{location}", location)
            .replace("{full_name}", full_name)
            .replace("{linkedin_url}", linkedin_url)
            .replace("{linkedin_url}", company_name_friendly)
            .replace("{search_output_summary}", scrappedData)
            .replace("{website}", website)
            .replace("{date}", currentDate),

          ModelName: selectedModelNameA,
        };

        const pitchResponse = await fetch(
          `${API_BASE_URL}/api/auth/generatepitch`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          }
        );

        const pitchData = await pitchResponse.json();
        if (!pitchResponse.ok) {
          setIsProcessing(false);
          setIsPitchUpdateCompleted(true);
          setIsPaused(true);
          return;
        }

        const dataAnalysis = analyzeScrapedData(
          scrapeData.allScrapedData || ""
        );
        setOutputForm((prev) => ({
          ...prev,
          searchResults: searchResults,
          allScrapedData: scrapeData.allScrapedData || "",
          generatedContent:
            `<span style="color: green">[${formatDateTime(
              new Date()
            )}] Pitch successfully crafted(att:${searchCount} org:${
              dataAnalysis.original
            } ass:${
              dataAnalysis.assisted
            }), for contact ${full_name} with company name ${company_name} and domain ${
              entry.email
            }</span><br/>` + prev.generatedContent,
          linkLabel: pitchData.response.content,
        }));

        //----------------------------------------------------------------------------------------
        let subjectLine = "";
        if (subjectMode === "AI generated") {
          const filledSubjectInstruction = subject_instruction
            .replace("{company_name}", company_name)
            .replace("{job_title}", job_title)
            .replace("{location}", location)
            .replace("{full_name}", full_name)
            .replace("{linkedin_url}", linkedin_url)
            .replace("{search_output_summary}", scrappedData)
            .replace("{generated_pitch}", pitchData.response.content)
            .replace("{website}", website)
            .replace("{date}", currentDate);

          const subjectRequestBody = {
            scrappedData: filledSubjectInstruction,
            prompt: pitchData.response.content,
            ModelName: selectedModelNameA,
          };

          setOutputForm((prev) => ({
            ...prev,
            generatedContent:
              `<span style="color: blue">[${formatDateTime(
                new Date()
              )}]  Crafting phase #3 concinnus, for contact ${full_name} with company name ${company_name} and domain ${
                entry.email
              }</span><br/>` + prev.generatedContent,
          }));

          const subjectResponse = await fetch(
            `${API_BASE_URL}/api/auth/generatepitch`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(subjectRequestBody),
            }
          );

          if (subjectResponse.ok) {
            const subjectData = await subjectResponse.json();
            subjectLine = subjectData.response?.content || "";

            setOutputForm((prev) => ({
              ...prev,
              generatedContent:
                `<span style="color: green">[${formatDateTime(
                  new Date()
                )}] Subject successfully crafted, for contact ${full_name} with company name ${company_name} and domain ${
                  entry.email
                }</span><br/>` + prev.generatedContent,
              emailSubject: subjectLine,
            }));
          } else {
            setOutputForm((prev) => ({
              ...prev,
              generatedContent:
                `<span style="color: orange">[${formatDateTime(
                  new Date()
                )}] Email subject generation failed for contact ${full_name}, using default</span><br/>` +
                prev.generatedContent,
            }));
          }
        } else if (subjectMode === "With Placeholder") {
          subjectLine = (subjectText || "")
            .replace("{company_name}", company_name)
            .replace("{job_title}", job_title)
            .replace("{location}", location)
            .replace("{full_name}", full_name)
            .replace("{linkedin_url}", linkedin_url)
            .replace("{search_output_summary}", scrappedData)
            .replace("{generated_pitch}", pitchData.response?.content || "")
            .replace("{website}", website)
            .replace("{date}", currentDate);

          setOutputForm((prev) => ({
            ...prev,
            generatedContent:
              `<span style="color: green">[${formatDateTime(
                new Date()
              )}] Subject using user placeholder for contact ${full_name} with company name ${company_name} and domain ${
                entry.email
              }</span><br/>` + prev.generatedContent,
            emailSubject: subjectLine,
          }));
        }

        // ✅ Replace the database update logic in REGENERATION BLOCK
try {
  if (id && pitchData.response?.content) {
    if (segmentId) {
      // ✅ For segment-based campaigns, we need to find the dataFileId from contact
      const contactDataFileId = entry.dataFileId || entry.data_file_id;
      
      if (contactDataFileId) {
        const updateContactResponse = await fetch(
          `${API_BASE_URL}/api/crm/contacts/update-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ClientId: effectiveUserId,
              DataFileId: contactDataFileId, // Use contact's dataFileId
              ContactId: id,
              EmailSubject: subjectLine,
              EmailBody: pitchData.response.content,
            }),
          }
        );

        if (!updateContactResponse.ok) {
          const updateContactError = await updateContactResponse.json();
          setOutputForm((prevOutputForm) => ({
            ...prevOutputForm,
            generatedContent:
              `<span style="color: orange">[${formatDateTime(
                new Date()
              )}] Updating segment contact in database incomplete for ${full_name}. Error: ${updateContactError.Message}</span><br/>` +
              prevOutputForm.generatedContent,
          }));
        } else {
          setOutputForm((prevOutputForm) => ({
            ...prevOutputForm,
            generatedContent:
              `<span style="color: green">[${formatDateTime(
                new Date()
              )}] Updated segment contact pitch in database for ${full_name}.</span><br/>` +
              prevOutputForm.generatedContent,
          }));
        }
      } else {
        setOutputForm((prevOutputForm) => ({
          ...prevOutputForm,
          generatedContent:
            `<span style="color: orange">[${formatDateTime(
              new Date()
            )}] No dataFileId found for segment contact ${full_name}</span><br/>` +
            prevOutputForm.generatedContent,
        }));
      }
    } else if (parsedDataFileId) {
      // ✅ For datafile-based campaigns (existing logic)
      const updateContactResponse = await fetch(
        `${API_BASE_URL}/api/crm/contacts/update-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ClientId: effectiveUserId,
            DataFileId: parsedDataFileId,
            ContactId: id,
            EmailSubject: subjectLine,
            EmailBody: pitchData.response.content,
          }),
        }
      );

      if (!updateContactResponse.ok) {
        const updateContactError = await updateContactResponse.json();
        setOutputForm((prevOutputForm) => ({
          ...prevOutputForm,
          generatedContent:
            `<span style="color: orange">[${formatDateTime(
              new Date()
            )}] Updating contact in database incomplete for ${full_name}. Error: ${updateContactError.Message}</span><br/>` +
            prevOutputForm.generatedContent,
        }));
      } else {
        setOutputForm((prevOutputForm) => ({
          ...prevOutputForm,
          generatedContent:
            `<span style="color: green">[${formatDateTime(
              new Date()
            )}] Updated pitch in database for ${full_name}.</span><br/>` +
            prevOutputForm.generatedContent,
        }));
      }
    }
  }
} catch (updateError) {
  setOutputForm((prevOutputForm) => ({
    ...prevOutputForm,
    generatedContent:
      `<span style="color: orange">[${formatDateTime(
        new Date()
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
        };
        const regenIndex = allResponses.findIndex((r) => r.id === id);

        // ---- Update all relevant state arrays by id ----
        setexistingResponse((prev) =>
          prev.map((resp) => (resp.id === id ? newResponse : resp))
        );

        setAllResponses((prev) =>
          prev.map((resp) => (resp.id === id ? newResponse : resp))
        );

        setallprompt((prev) => {
          const updated = [...prev];
          if (regenIndex > -1) updated[regenIndex] = promptToSend;
          else updated.push(promptToSend);
          return updated;
        });
        setallsearchResults((prev) => {
          const updated = [...prev];
          if (regenIndex > -1) updated[regenIndex] = searchResults;
          else updated.push(searchResults);
          return updated;
        });
        seteveryscrapedData((prev) => {
          const updated = [...prev];
          if (regenIndex > -1)
            updated[regenIndex] = scrapeData.allScrapedData || "";
          else updated.push(scrapeData.allScrapedData || "");
          return updated;
        });
        setallsummery((prev) => {
          const updated = [...prev];
          if (regenIndex > -1)
            updated[regenIndex] = scrapeData.pitchResponse?.content || "";
          else updated.push(scrapeData.pitchResponse?.content || "");
          return updated;
        });
        setallSearchTermBodies((prev) => {
          const updated = [...prev];
          if (regenIndex > -1) updated[regenIndex] = searchTermBody;
          else updated.push(searchTermBody);
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
      } else if (isPaused) {
        currentIndex = lastProcessedIndex; // Use the last processed index when resuming
      } else {
        currentIndex = 0;
      }

      //
      let foundRecordWithoutPitch = false;

      // Show loader
      setOutputForm((prevForm) => ({
        ...prevForm,
        generatedContent:
          '<span style="color: blue">Processing initiated...please wait...</span><br/>' +
          prevForm.generatedContent,
      }));
      const dataFileIdStr = selectedZohoviewId;

      // Declare contacts variable before the if/else block
      let contacts: any[] = [];

      // Use cached data if available and flag is set
      if (options?.useCachedData && cachedContacts.length > 0) {
  contacts = cachedContacts;
} else {
  // ✅ Fetch contacts based on campaign type
  if (segmentId) {
    // Fetch from segment API
    console.log("Fetching contacts from segment API, segmentId:", segmentId);
    const response = await fetch(
      `${API_BASE_URL}/api/Crm/segment/${segmentId}/contacts`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch segment contacts");
    }

    const data = await response.json();
    contacts = data || []; // Segment API returns contacts directly
    console.log("Fetched segment contacts:", contacts.length);
    
  } else if (parsedDataFileId) {
    // Fetch from datafile API (existing logic)
    console.log("Fetching contacts from datafile API, dataFileId:", parsedDataFileId);
    const response = await fetch(
      `${API_BASE_URL}/api/crm/contacts/by-client-datafile?clientId=${effectiveUserId}&dataFileId=${parsedDataFileId}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch datafile contacts");
    }

    const data = await response.json();
    contacts = data.contacts || [];
    console.log("Fetched datafile contacts:", contacts.length);
    
  } else {
    throw new Error("No valid data source found (neither segment nor datafile)");
  }
}

      if (!Array.isArray(contacts)) {
        console.error("Invalid data format");
        moreRecords = false;
      }

      // Process all contacts
      for (let i = 0; i < contacts.length; i++) {
        const entry = contacts[i];

        // Skip contacts before the starting index if we're replacing from a specific index
        if (shouldReplaceFromIndex && i < currentIndex) {
          continue;
        }
        if (stopRef.current === true) {
          setLastProcessedToken(null);
          setLastProcessedIndex(i); // This should be the actual index being processed
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
                  new Date()
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

            // Remove this line - don't push to generatedPitches yet
            // generatedPitches.push(existingResponse);

            // Update these to use responseIndex logic
            setallprompt((prevPrompts) => {
              const updated = [...prevPrompts];
              if (responseIndex < updated.length) {
                updated[responseIndex] = "";
              } else {
                updated.push("");
              }
              return updated;
            });

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
                    new Date()
                  )}] Subscription: Trial mode. Processing is paused. Contact support on Live Chat (bottom right) or London: +44 (0) 207 660 4243 | New York: +1 (0) 315 400 2402 or email info@dataji.co </span><br/>` +
                  prevOutputForm.generatedContent,
              }));

              moreRecords = false;
              stopRef.current = true;
              setLastProcessedToken(null);
              setLastProcessedIndex(i);
              break;
            }
          }

          // Step 1: Scrape Website with caching
          const searchTermBody = searchterm
            .replace("{company_name}", company_name)
            .replace("{job_title}", job_title)
            .replace("{location}", location)
            .replace("{full_name}", full_name)
            .replace("{linkedin_url}", linkedin_url)
            .replace("{linkedin_url}", company_name_friendly)
            .replace("{website}", website)
            .replace("{date}", currentDate);

          const filledInstructions = instructionsParamA
            .replace("{company_name}", company_name)
            .replace("{job_title}", job_title)
            .replace("{location}", location)
            .replace("{full_name}", full_name)
            .replace("{linkedin_url}", linkedin_url)
            .replace("{linkedin_url}", company_name_friendly)
            .replace("{website}", website)
            .replace("{date}", currentDate);

          const cacheKey = JSON.stringify({
            searchTerm: searchTermBody,
            instructions: filledInstructions,
            modelName: selectedModelNameA,
            searchCount,
          });

          let scrapeData: any;
          let cacheHit = false;

          if (processCacheRef.current[cacheKey]) {
            scrapeData = processCacheRef.current[cacheKey];
            cacheHit = true;
          } else {
            setOutputForm((prevOutputForm) => ({
              ...prevOutputForm,
              generatedContent:
                `<span style="color: orange">[${formatDateTime(
                  new Date()
                )}] Crafting phase #1 societatis, for contact ${full_name} with company name ${company_name} and domain ${
                  entry.email
                }</span><br/>` + prevOutputForm.generatedContent,
            }));

            const scrapeResponse = await fetch(
              `${API_BASE_URL}/api/auth/process`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  searchTerm: searchTermBody,
                  instructions: filledInstructions,
                  modelName: selectedModelNameA,
                  searchCount: searchCount,
                }),
              }
            );
            if (!scrapeResponse.ok) {
              scrapfailedreq += 1;
              setOutputForm((prevOutputForm) => ({
                ...prevOutputForm,
                searchResults: [],
                allScrapedData: "",
                generatedContent:
                  `<span style="color: red">[${formatDateTime(
                    new Date()
                  )}] Centum nulla analysis incomplete for contact ${full_name} with company name ${company_name} and domain ${
                    entry.email
                  }</span><br/>` + prevOutputForm.generatedContent,
                usage:
                  `Cost: $${cost.toFixed(6)}    ` +
                  `Failed Requests: ${failedReq}    ` +
                  `Success Requests: ${successReq}              ` +
                  `Scraped Data Failed Requests: ${scrapfailedreq}   ` +
                  `Total Tokens Used: ${totaltokensused}   `,
              }));
              generatedPitches.push({
                ...entry,
                pitch: "Error scraping website",
              });
              continue;
            }
            scrapeData = await scrapeResponse.json();
            processCacheRef.current[cacheKey] = scrapeData;
          }

          // Always show if data is from cache or not
          if (cacheHit) {
            setOutputForm((prevOutputForm) => ({
              ...prevOutputForm,
              generatedContent:
                `<span style="color: #b38f00">[${formatDateTime(
                  new Date()
                )}] Loading phase #1 societatis, for contact ${full_name} with company name ${company_name} and domain ${
                  entry.email
                }</span><br/>` + prevOutputForm.generatedContent,
            }));
          }

          console.log("All cached values:", processCacheRef.current);

          const summary = scrapeData.pitchResponse || {};
          const searchResults = scrapeData.searchResults || [];
          const scrappedData = summary.content || "";

          if (!scrappedData) {
            const formattedTime = formatDateTime(new Date());
            scrapfailedreq += 1;
            setOutputForm((prevOutputForm) => ({
              ...prevOutputForm,
              searchResults: scrapeData.searchResults || [],
              allScrapedData: scrapeData.allScrapedData || "",
              generatedContent:
                `<span style="color: red">[${formatDateTime(
                  new Date()
                )}] Centum nulla analysis incomplete for contact ${full_name} with company name ${company_name} and domain ${
                  entry.email
                }</span><br/>` + prevOutputForm.generatedContent,
              usage:
                `Cost: $${cost.toFixed(6)}    ` +
                `Failed Requests: ${failedReq}    ` +
                `Success Requests: ${successReq}              ` +
                `Scraped Data Failed Requests: ${scrapfailedreq}   ` +
                `Total Tokens Used: ${totaltokensused}   `,
            }));
            generatedPitches.push({
              ...entry,
              pitch: "Error scraping website",
            });
            continue;
          }

          let systemPrompt = systemInstructionsA;

          const replacedPromptText = (selectedPrompt?.text || "")
            .replace("{search_output_summary}", scrappedData)
            .replace("{company_name}", company_name)
            .replace("{job_title}", job_title)
            .replace("{location}", location)
            .replace("{full_name}", full_name)
            .replace("{linkedin_url}", company_name_friendly)
            .replace("{linkedin_url}", linkedin_url)
            .replace("{website}", website)
            .replace("{date}", currentDate);

          const promptToSend = `
          
          ${systemPrompt}
           
          ${replacedPromptText}`
            .replace("{search_output_summary}", scrappedData)
            .replace("{company_name}", company_name)
            .replace("{job_title}", job_title)
            .replace("{location}", location)
            .replace("{full_name}", full_name)
            .replace("{linkedin_url}", company_name_friendly)
            .replace("{linkedin_url}", linkedin_url)
            .replace("{website}", website)
            .replace("{date}", currentDate);

          setOutputForm((prevState) => ({
            ...prevState,
            currentPrompt: promptToSend,
            searchResults: scrapeData.searchResults || [],
            allScrapedData: scrapeData.allScrapedData || "",
          }));

          const dataAnalysis = analyzeScrapedData(
            scrapeData.allScrapedData || ""
          );

          setOutputForm((prevOutputForm) => ({
            ...prevOutputForm,
            searchResults: scrapeData.searchResults || [],
            allScrapedData: scrapeData.allScrapedData || "",
            generatedContent:
              `<span style="color: blue">[${formatDateTime(
                new Date()
              )}] Crafting phase #2 integritas (att:${searchCount} org:${
                dataAnalysis.original
              } ass:${
                dataAnalysis.assisted
              }), for contact ${full_name} with company name ${company_name} and domain ${
                entry.email
              }</span><br/>` + prevOutputForm.generatedContent,
          }));

          const requestBody = {
            scrappedData: systemPrompt,
            prompt: `${selectedPrompt?.text}`
              .replace("{company_name}", company_name)
              .replace("{job_title}", job_title)
              .replace("{location}", location)
              .replace("{full_name}", full_name)
              .replace("{linkedin_url}", linkedin_url)
              .replace("{linkedin_url}", company_name_friendly)
              .replace("{search_output_summary}", scrappedData)
              .replace("{website}", website)
              .replace("{date}", currentDate),
            ModelName: selectedModelNameA,
          };

          const pitchResponse = await fetch(
            `${API_BASE_URL}/api/auth/generatepitch`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(requestBody),
            }
          );

          const pitchData = await pitchResponse.json();
          if (!pitchResponse.ok) {
            const formattedTime = formatDateTime(new Date());
            failedReq += 1;
            cost += parseFloat(pitchData?.response?.currentCost);
            totaltokensused += parseFloat(pitchData?.response?.totalTokens);
            setOutputForm((prevOutputForm) => ({
              ...prevOutputForm,
              searchResults: scrapeData.searchResults || [],
              allScrapedData: scrapeData.allScrapedData || "",
              generatedContent:
                `<span style="color: red">[${formatDateTime(
                  new Date()
                )}] Phase #2 integritas incomplete for contact ${full_name} with company name ${company_name} and domain ${
                  entry.email
                }</span><br/>` + prevOutputForm.generatedContent,
              usage:
                `Cost: $${cost.toFixed(6)}    ` +
                `Failed Requests: ${failedReq}    ` +
                `Success Requests: ${successReq}                ` +
                `Scraped Data Failed Requests: ${scrapfailedreq}   ` +
                `Total Tokens Used: ${totaltokensused}   `,
            }));
            generatedPitches.push({
              ...entry,
              pitch: "Error Crafting pitch",
            });
            continue;
          }

          successReq += 1;
          cost += parseFloat(pitchData?.response?.currentCost);
          totaltokensused += parseFloat(pitchData?.response?.totalTokens);
          console.log(`Cosstdata ${pitchData}`);

          // Success: Update UI with the generated pitch
          setOutputForm((prevOutputForm) => ({
            ...prevOutputForm,
            searchResults: scrapeData.searchResults || [],
            allScrapedData: scrapeData.allScrapedData || "",
            generatedContent:
              `<span style="color: green">[${formatDateTime(
                new Date()
              )}] Pitch successfully crafted for contact ${full_name} with company name ${company_name} and domain ${
                entry.email
              }</span><br/>` + prevOutputForm.generatedContent,
            usage:
              `Cost: $${cost.toFixed(6)}    ` +
              `Failed Requests: ${failedReq}    ` +
              `Success Requests: ${successReq}                  ` +
              `Scraped Data Failed Requests: ${scrapfailedreq}   ` +
              `Total Tokens Used: ${totaltokensused}   `,
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
          let subjectLine = "";
          if (subjectMode === "AI generated") {
            const filledSubjectInstruction = subject_instruction
              .replace("{company_name}", company_name)
              .replace("{job_title}", job_title)
              .replace("{location}", location)
              .replace("{full_name}", full_name)
              .replace("{linkedin_url}", linkedin_url)
              .replace("{search_output_summary}", scrappedData)
              .replace("{generated_pitch}", pitchData.response.content)
              .replace("{website}", website)
              .replace("{date}", currentDate);

            const subjectRequestBody = {
              scrappedData: filledSubjectInstruction,
              prompt: pitchData.response.content,
              ModelName: selectedModelNameA,
            };

            setOutputForm((prev) => ({
              ...prev,
              generatedContent:
                `<span style="color: blue">[${formatDateTime(
                  new Date()
                )}] Crafting phase #3 concinnus, for contact ${full_name} with company name ${company_name} and domain ${
                  entry.email
                }</span><br/>` + prev.generatedContent,
            }));

            const subjectResponse = await fetch(
              `${API_BASE_URL}/api/auth/generatepitch`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(subjectRequestBody),
              }
            );

            if (subjectResponse.ok) {
              const subjectData = await subjectResponse.json();
              subjectLine = subjectData.response?.content || "";

              setOutputForm((prev) => ({
                ...prev,
                generatedContent:
                  `<span style="color: green">[${formatDateTime(
                    new Date()
                  )}] Subject successfully crafted, for contact ${full_name} with company name ${company_name} and domain ${
                    entry.email
                  }</span><br/>` + prev.generatedContent,
                emailSubject: subjectLine,
              }));
            } else {
              setOutputForm((prev) => ({
                ...prev,
                generatedContent:
                  `<span style="color: orange">[${formatDateTime(
                    new Date()
                  )}] Subject generation failed for contact ${full_name} with company name ${company_name} and domain ${
                    entry.email
                  }</span><br/>` + prev.generatedContent,
              }));
            }
          } else if (subjectMode === "With Placeholder") {
            subjectLine = (subjectText || "")
              .replace("{company_name}", company_name)
              .replace("{job_title}", job_title)
              .replace("{location}", location)
              .replace("{full_name}", full_name)
              .replace("{linkedin_url}", linkedin_url)
              .replace("{search_output_summary}", scrappedData)
              .replace("{generated_pitch}", pitchData.response?.content || "")
              .replace("{website}", website)
              .replace("{date}", currentDate);

            setOutputForm((prev) => ({
              ...prev,
              generatedContent:
                `<span style="color: green">[${formatDateTime(
                  new Date()
                )}] Subject using user placeholder for contact ${full_name} with company name ${company_name} and domain ${
                  entry.email
                }</span><br/>` + prev.generatedContent,
              emailSubject: subjectLine,
            }));
          }

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
          setallprompt((prevPrompts) => {
            const updated = [...prevPrompts];
            if (responseIndex < updated.length) {
              updated[responseIndex] = promptToSend;
            } else {
              updated.push(promptToSend);
            }
            return updated;
          });

          setallsearchResults((prevSearchResults) => {
            const updated = [...prevSearchResults];
            if (responseIndex < updated.length) {
              updated[responseIndex] = scrapeData.searchResults || [];
            } else {
              updated.push(scrapeData.searchResults || []);
            }
            return updated;
          });

          seteveryscrapedData((prevScrapedData) => {
            const updated = [...prevScrapedData];
            if (responseIndex < updated.length) {
              updated[responseIndex] = scrapeData.allScrapedData || "";
            } else {
              updated.push(scrapeData.allScrapedData || "");
            }
            return updated;
          });

          setallsummery((prevSummery) => {
            const updated = [...prevSummery];
            if (responseIndex < updated.length) {
              updated[responseIndex] = scrapeData.pitchResponse?.content || "";
            } else {
              updated.push(scrapeData.pitchResponse?.content || "");
            }
            return updated;
          });

          setallSearchTermBodies((prevSearchTermBodies) => {
            const updated = [...prevSearchTermBodies];
            if (responseIndex < updated.length) {
              updated[responseIndex] = searchTermBody;
            } else {
              updated.push(searchTermBody);
            }
            return updated;
          });
          setCurrentIndex(responseIndex);
          setRecentlyAddedOrUpdatedId(newResponse.id);
          const dataFileIdStr = selectedZohoviewId;

          // Update database with new API
         // ✅ Replace the database update logic in REGENERATION BLOCK

// ✅ Update database with new API (in main processing loop)
try {
  if (entry.id && pitchData.response.content) { // ✅ Use entry.id instead of id
    if (segmentId) {
      // ✅ For segment-based campaigns
      const contactDataFileId = entry.dataFileId || entry.data_file_id;
      
      if (contactDataFileId) {
        const updateContactResponse = await fetch(
          `${API_BASE_URL}/api/crm/contacts/update-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ClientId: effectiveUserId,
              DataFileId: contactDataFileId, // Use contact's dataFileId
              ContactId: entry.id, // ✅ Use entry.id instead of id
              EmailSubject: subjectLine,
              EmailBody: pitchData.response.content,
            }),
          }
        );

        if (!updateContactResponse.ok) {
          const updateContactError = await updateContactResponse.json();
          setOutputForm((prevOutputForm) => ({
            ...prevOutputForm,
            generatedContent:
              `<span style="color: orange">[${formatDateTime(
                new Date()
              )}] Updating segment contact in database incomplete for ${full_name}. Error: ${updateContactError.Message}</span><br/>` +
              prevOutputForm.generatedContent,
          }));
        } else {
          setOutputForm((prevOutputForm) => ({
            ...prevOutputForm,
            generatedContent:
              `<span style="color: green">[${formatDateTime(
                new Date()
              )}] Updated segment contact pitch in database for ${full_name}.</span><br/>` +
              prevOutputForm.generatedContent,
          }));
        }
      }
    } else if (parsedDataFileId) {
      // ✅ For datafile-based campaigns (existing logic)
      const updateContactResponse = await fetch(
        `${API_BASE_URL}/api/crm/contacts/update-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ClientId: effectiveUserId,
            DataFileId: parsedDataFileId,
            ContactId: entry.id, // ✅ Use entry.id instead of id
            EmailSubject: subjectLine,
            EmailBody: pitchData.response.content,
          }),
        }
      );

      if (!updateContactResponse.ok) {
        const updateContactError = await updateContactResponse.json();
        setOutputForm((prevOutputForm) => ({
          ...prevOutputForm,
          generatedContent:
            `<span style="color: orange">[${formatDateTime(
              new Date()
            )}] Updating contact in database incomplete for ${full_name}. Error: ${updateContactError.Message}</span><br/>` +
            prevOutputForm.generatedContent,
        }));
      } else {
        setOutputForm((prevOutputForm) => ({
          ...prevOutputForm,
          generatedContent:
            `<span style="color: green">[${formatDateTime(
              new Date()
            )}] Updated pitch in database for ${full_name}.</span><br/>` +
            prevOutputForm.generatedContent,
        }));
      }
    }
  }
} catch (updateError) {
  setOutputForm((prevOutputForm) => ({
    ...prevOutputForm,
    generatedContent:
      `<span style="color: orange">[${formatDateTime(
        new Date()
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
                new Date()
              )}] Phase #2 integritas incomplete for contact ${
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
        setLastProcessedToken(null);
        setLastProcessedIndex(0);
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
        selectedPrompt?.text
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
    []
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
    []
  );

  // Also update the state declaration
  const [searchTermForm, setSearchTermForm] = useState<SearchTermForm>({
    searchCount: "",
    searchTerm: "",
    instructions: "",
    output: "",
  });

  const searchTermFormOnSubmit = async (e: any) => {
    e.preventDefault();
    try {

      const requestBody = searchTermForm.searchTerm; // Send only the search term in the body

      const instructionsParam = encodeURIComponent(searchTermForm.instructions); // Encode to prevent URL issues
      const modelNameParam = encodeURIComponent(selectedModelName);
      const searchCountParam = encodeURIComponent(searchTermForm.searchCount);

      const response = await fetch(
        `${API_BASE_URL}/api/auth/process?instructions=${instructionsParam}&modelName=${modelNameParam}&searchCount=${searchCountParam}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody), // Send searchTerm in the body
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("API Error:", data);
        setSearchTermForm((prevForm: any) => ({
          ...prevForm,
          output: "Error processing request",
        }));
      } else {
        setSearchTermForm((prevForm: any) => ({
          ...prevForm,
          output: data.response.content, // Store the API response
        }));
      }
    } catch (error) {
      console.error("Error:", error);
      setSearchTermForm((prevForm: any) => ({
        ...prevForm,
        output: "Error processing request",
      }));
    }
  };

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
        `settingsFormHandler called for ${name} with value: ${newValue}`
      ); // Debug log

      setSettingsForm((prevSettings: any) => ({
        ...prevSettings,
        [name]: newValue,
      }));
    },
    [] // Empty dependency array
  );

  const settingsFormOnSubmit = (e: any) => {
    e.preventDefault();
    console.log(outputForm, "outputForm");
    console.log(settingsForm, "settingForm");
  };

  // To handle RTE change
  const handleViewPromptRTE = useCallback(
    (value: string) => {
      if (selectedPrompt) {
        setSelectedPrompt((prev) => ({
          ...prev!,
          text: value,
        }));
      }
    },
    [selectedPrompt]
  );

  const handleEditPromptInputRTE = useCallback(
    (value: string) => {
      if (editPrompt) {
        setEditPrompt((prev: any) => ({
          ...prev!,
          promptInput: value,
        }));
      }
    },
    [editPrompt]
  );
  const handleEditPromptTemplateRTE = useCallback(
    (value: string) => {
      if (editPrompt) {
        setEditPrompt((prev: any) => ({
          ...prev!,
          promptTemplate: value,
        }));
      }
    },
    [editPrompt]
  );
  const handleAddPromptInPutRTE = useCallback(
    (value: string) => {
      if (addPrompt) {
        setAddPrompt((prev) => ({
          ...prev!,
          promptInput: value,
        }));
      }
    },
    [addPrompt]
  );
  const handleAddPromptTemplateRTE = useCallback(
    (value: string) => {
      if (addPrompt) {
        setAddPrompt((prev) => ({
          ...prev!,
          promptTemplate: value,
        }));
      }
    },
    [addPrompt]
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
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const modelName = event.target.value;
    const selectedId = event.target.value;
    setSelectedZohoviewId(selectedId);
    if (selectedId) {
      await fetchAndDisplayEmailBodies(selectedId);
    }
  };

  const handleStart = async (startIndex?: number) => {
    // Only clear all if we're starting from the beginning
    if (!startIndex || startIndex === 0) {
      await handleClearAll();
    }

    if (!selectedPrompt) return;
    setAllRecordsProcessed(false);
    setIsStarted(true);
    setIsPaused(false);
    stopRef.current = false;

    goToTab("Output", {
      startFromIndex: startIndex,
      useCachedData: true, // Use cached data when available
    });
  };

  const handlePauseResume = async () => {
    if (isStarted) {
      if (isPaused) {
        // Check if we've processed all records
        if (allRecordsProcessed) {
          handleReset();
          handleStart();
          return;
        }

        // Only allow resume if pitch update is completed
        if (isPitchUpdateCompleted && !isProcessing) {
          setIsPaused(false);
          stopRef.current = false;
          setIsPitchUpdateCompleted(false);

          // Resume with cached data and pass the last processed index
          goToTab("Output", {
            useCachedData: true,
            startFromIndex: lastProcessedIndex, // Pass the last processed index explicitly
          });
        }
      } else {
        // Pause logic
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
          /Scraped Data Failed Requests: ([0-9]+)/
        );
        const totaltokensusedMatch = usageText.match(
          /Total Tokens Used: ([0-9]+)/
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
          : scrapfailedreq; // Fixed variable name
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
          currentTime, // Use current time as the end time
          allResponses, // Use all responses gathered so far
          selectedPrompt?.text || "No prompt template was selected",
          true // Add a flag to indicate this is a pause report
        );
      }
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
    setLastProcessedToken(null);
    setLastProcessedIndex(0);

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



const handleCampaignChange = async (
  event: React.ChangeEvent<HTMLSelectElement>
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
        (p: Prompt) => p.id === campaign.promptId
      );
      if (promptMatch) {
        setSelectedPrompt(promptMatch);
      }

      // ✅ Check if campaign is segment-based or datafile-based
      const segmentId = (campaign as any).segmentId;
      const dataFileId = campaign.zohoViewId;
      
      console.log("Campaign segmentId:", segmentId);
      console.log("Campaign dataFileId:", dataFileId);

      // Get the client ID
      const effectiveUserId = selectedClient !== "" ? selectedClient : userId;

      // Fetch data based on campaign type
      try {
        if (segmentId) {
          // ✅ Campaign uses segment
          console.log("Using segment-based campaign");
          setSelectedZohoviewId(`segment_${segmentId}`);
          await fetchAndDisplayEmailBodies(`segment_${segmentId}`);
        } else if (dataFileId) {
          // ✅ Campaign uses datafile - existing logic
          console.log("Using datafile-based campaign");
          setSelectedZohoviewId(dataFileId);
          await fetchAndDisplayEmailBodies(`${effectiveUserId},${dataFileId}`);
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
    setSelectedZohoviewId("");
    setAllResponses([]);
    setexistingResponse([]);
  }
};
  const handleClearAll = () => {
    // Confirm before proceeding
    {
      stopRef.current = true;

      processCacheRef.current = {}; // Clear the process cache
      setAllRecordsProcessed(false); // Reset all records processed flag

      // Reset all state variables
      setIsStarted(false);
      setIsPaused(false);
      setIsProcessing(false);
      setIsPitchUpdateCompleted(false);

      // Reset last processed token and index
      setLastProcessedToken(null);
      setLastProcessedIndex(0);

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
      setexistingResponse([]); // Use the state setter directly
      setCurrentIndex(0); // Reset currentIndex in Output.tsx
      setCurrentPage(0); // Resetting the current page to 0

      localStorage.removeItem("cachedResponses");
      localStorage.removeItem("currentIndex");
    }
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
          email_subject: subjectMode === "With Placeholder" ? subjectText : "", // Use your subject logic
          job_Title: contact.job_title || "",
          account_name_friendlySingle_Line_12: contact.company || "",
          mailing_Country: contact.location || "",
          linkedIn_URL: contact.linkedin || "",
          website: "", // Optional fields
          sample_email_body: "",
          generated: false,
          last_Email_Body_updated: "",
          pG_Processed_on1: "",
        })
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

  return (
    // <div className="login-container pitch-page flex-col d-flex">
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      {isSidebarOpen && (
        <aside
          className={`bg-white border-r shadow-sm flex flex-col transition-all duration-300`}
        >
          <div className="p-2 text-xl font-bold border-b">
            <div className="flex justify-between items-start">
              <img
                src={"https://www.pitchkraft.ai/images/pitch_logo.png"}
                alt="Pitchcraft Logo"
                style={{ height: "85px" }}
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

          <nav className="flex-1 py-4 space-y-2">
            {/* Side Menu */}
            <div className="side-menu">
              <div className="side-menu-inner">
                <ul className="side-menu-list">
                  <li className={tab === "Template" ? "active" : ""}>
                    <button
                      onClick={() => setTab("Template")}
                      className="side-menu-button"
                      title="Click to view the original non-personalized email template"
                    >
                      <span className="menu-icon">
                        <FontAwesomeIcon
                          icon={faFileAlt}
                          className=" text-[#333333] text-lg"
                        />
                      </span>
                      <span className="menu-text">Template</span>
                    </button>
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
                        setTab("DataCampaigns");
                        setShowContactsSubmenu(!showContactsSubmenu);
                        setShowMailSubmenu(false); // Close mail submenu if needed
                      }}
                      className="side-menu-button"
                      title="Manage contacts and segments"
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
                          className={contactsSubTab === "List" ? "active" : ""}
                        >
                          <button
                            onClick={() => {
                              setContactsSubTab("List");
                              setTab("DataCampaigns");
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
                      }}
                      className="side-menu-button"
                      title="Manage campaigns"
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
                      onClick={() => setTab("Output")}
                      className="side-menu-button"
                      title="Click to view the hyper-personalized emails being generated"
                    >
                      <span className="menu-icon">
                        <FontAwesomeIcon
                          icon={faEnvelopeOpen}
                          className=" text-[#333333] text-lg"
                        />
                      </span>
                      <span className="menu-text">Output</span>
                    </button>
                  </li>
                  {userRole === "ADMIN" && (
                    <li
                      className={`${tab === "Mail" ? "active" : ""} ${
                        showMailSubmenu
                          ? "has-submenu submenu-open"
                          : "has-submenu"
                      }`}
                    >
                      <button
                        onClick={() => {
                          setTab("Mail");
                          setShowMailSubmenu(!showMailSubmenu);
                        }}
                        className="side-menu-button"
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
                              Schedule
                            </button>
                          </li>
                        </ul>
                      )}
                    </li>
                  )}
                  {userRole === "ADMIN" && (
                    <li className={tab === "Settings" ? "active" : ""}>
                      <button
                        onClick={() => setTab("Settings")}
                        className="side-menu-button"
                      >
                        <span className="menu-icon">
                          <FontAwesomeIcon
                            icon={faGear}
                            className=" text-[#333333] text-lg"
                          />
                        </span>
                        <span className="menu-text">Settings</span>
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </nav>
        </aside>
      )}

      {/* Content Area */}
      <div className="flex flex-col flex-1">
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
          />
        </header>

        {/* Inner Main Content */}
        <main className="flex-1 p-4 overflow-y-auto">
          <div className="bg-white rounded-md shadow-md p-6">
            {/* Main Content Area */}

            {/* Tab Content */}
            <div className="tab-content">
              {tab === "Template" && (
                <>
                  <h1 className="text-[22px] mb-15 pb-4 border-b border-[#cccccc] font-semibold">
                    Templates
                  </h1>
                  <div className="login-box gap-down !mb-[0px] d-flex">
                    <div className="input-section edit-section w-[100%]">
                      <div className="row flex-col-768 mb-[20px]">
                        <div className="col col-12 col-12-768 flex items-end gap-2">
                          <div className="form-group mb-0-imp">
                            <label>
                              Original non-personalized email templates
                            </label>
                            <select
                              onChange={handleSelectChange}
                              value={selectedPrompt?.name || ""}
                              className={
                                !selectedPrompt?.name
                                  ? "highlight-required"
                                  : ""
                              }
                              disabled={userRole !== "ADMIN"}
                            >
                              <option value="">Please select a template</option>
                              {promptList.map((prompt: Prompt) => (
                                <option key={prompt.id} value={prompt.name}>
                                  {prompt.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="add-a-prompt">
                            <ReactTooltip
                              anchorSelect="#output-add-a-prompt-tooltip"
                              place="top"
                            >
                              Add a prompt
                            </ReactTooltip>
                            <button
                              id="output-add-a-prompt-tooltip"
                              className="save-button button square-40 d-flex justify-center align-center button-full-width-480"
                              onClick={() =>
                                handleModalOpen("modal-add-prompt")
                              }
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="#FFFFFF"
                                viewBox="0 0 30 30"
                                width="22px"
                                height="22px"
                              >
                                <path d="M15,3C8.373,3,3,8.373,3,15c0,6.627,5.373,12,12,12s12-5.373,12-12C27,8.373,21.627,3,15,3z M21,16h-5v5 c0,0.553-0.448,1-1,1s-1-0.447-1-1v-5H9c-0.552,0-1-0.447-1-1s0.448-1,1-1h5V9c0-0.553,0.448-1,1-1s1,0.447,1,1v5h5 c0.552,0,1,0.447,1,1S21.552,16,21,16z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="row">
                        <div className="col-12 col">
                          {userRole === "ADMIN" && (
                            <div className="tabs secondary d-flex justify-between-991 flex-col-768 bb-0-768">
                              <ul className="d-flex bb-1-768">
                                <li>
                                  <button
                                    type="button"
                                    onClick={tabHandler2}
                                    className={`button ${
                                      tab2 === "Template" ? "active" : ""
                                    }`}
                                  >
                                    Template
                                  </button>
                                </li>
                                <li>
                                  <button
                                    type="button"
                                    onClick={tabHandler2}
                                    className={`button ${
                                      tab2 === "Instructions" ? "active" : ""
                                    }`}
                                  >
                                    Instructions
                                  </button>
                                </li>
                              </ul>

                              <div className="d-flex align-self-center ml-10 ml-768-0 mt-10-768 flex-col-480 full-width">
                                <ReactTooltip
                                  anchorSelect="#output-edit-prompt-tooltip"
                                  place="top"
                                >
                                  Edit prompt
                                </ReactTooltip>
                                <button
                                  id="output-edit-prompt-tooltip"
                                  className={`save-button button justify-center square-40 d-flex align-center button-full-width-480 mb-10-480 ${
                                    selectedPrompt?.name !== "Select a prompt"
                                      ? ""
                                      : "disabled"
                                  }`}
                                  disabled={
                                    !selectedPrompt?.name ||
                                    selectedPrompt?.name === "Select a prompt"
                                  }
                                  onClick={() => {
                                    handleModalOpen("modal-edit-prompt");
                                    setEditHandler();
                                  }}
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="22px"
                                    height="22px"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                  >
                                    <path
                                      d="M12 3.99997H6C4.89543 3.99997 4 4.8954 4 5.99997V18C4 19.1045 4.89543 20 6 20H18C19.1046 20 20 19.1045 20 18V12M18.4142 8.41417L19.5 7.32842C20.281 6.54737 20.281 5.28104 19.5 4.5C18.7189 3.71895 17.4526 3.71895 16.6715 4.50001L15.5858 5.58575M18.4142 8.41417L12.3779 14.4505C12.0987 14.7297 11.7431 14.9201 11.356 14.9975L8.41422 15.5858L9.00257 12.6441C9.08001 12.2569 9.27032 11.9013 9.54951 11.6221L15.5858 5.58575M18.4142 8.41417L15.5858 5.58575"
                                      stroke="#ffffff"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </button>

                                <span className="d-flex justify-right ml-0-480">
                                  <ReactTooltip
                                    anchorSelect="#output-delete-prompt-tooltip"
                                    place="top"
                                  >
                                    Delete prompt
                                  </ReactTooltip>
                                  <button
                                    id="output-delete-prompt-tooltip"
                                    className="secondary button square-40 d-flex justify-center align-center ml-10 button-full-width-480"
                                    disabled={
                                      !selectedPrompt?.name ||
                                      selectedPrompt?.name === "Select a prompt"
                                    }
                                    onClick={() =>
                                      handleModalOpen("modal-confirm-delete")
                                    }
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="#FFFFFF"
                                      viewBox="0 0 50 50"
                                      width="18px"
                                      height="18px"
                                      style={{
                                        position: "relative",
                                        marginTop: "-2px",
                                      }}
                                    >
                                      <path d="M 21 2 C 19.354545 2 18 3.3545455 18 5 L 18 7 L 8 7 A 1.0001 1.0001 0 1 0 8 9 L 9 9 L 9 45 C 9 46.654 10.346 48 12 48 L 38 48 C 39.654 48 41 46.654 41 45 L 41 9 L 42 9 A 1.0001 1.0001 0 1 0 42 7 L 32 7 L 32 5 C 32 3.3545455 30.645455 2 29 2 L 21 2 z M 21 4 L 29 4 C 29.554545 4 30 4.4454545 30 5 L 30 7 L 20 7 L 20 5 C 20 4.4454545 20.445455 4 21 4 z M 19 14 C 19.552 14 20 14.448 20 15 L 20 40 C 20 40.553 19.552 41 19 41 C 18.448 41 18 40.553 18 40 L 18 15 C 18 14.448 18.448 14 19 14 z M 25 14 C 25.552 14 26 14.448 26 15 L 26 40 C 26 40.553 25.552 41 25 41 C 24.448 41 24 40.553 24 40 L 24 15 C 24 14.448 24.448 14 25 14 z M 31 14 C 31.553 14 32 14.448 32 15 L 32 40 C 32 40.553 31.553 41 31 41 C 30.447 41 30 40.553 30 40 L 30 15 C 30 14.448 30.447 14 31 14 z" />
                                    </svg>
                                  </button>
                                </span>
                              </div>
                            </div>
                          )}

                          {tab2 === "Template" && (
                            <div className="form-group">
                              <label>Template</label>
                              <span className="pos-relative">
                                <pre
                                  className={`no-content height-400 ql-editor ${
                                    !selectedPrompt?.template
                                      ? "text-light"
                                      : ""
                                  }`}
                                  dangerouslySetInnerHTML={{
                                    __html:
                                      selectedPrompt?.template ??
                                      "Template will appear here",
                                  }}
                                ></pre>

                                <Modal
                                  show={openModals["modal-addInput"]}
                                  closeModal={() =>
                                    handleModalClose("modal-addInput")
                                  }
                                  buttonLabel="Ok"
                                >
                                  <label>Template</label>
                                  <ReactQuill
                                    theme="snow"
                                    className="adjust-quill-height"
                                    value={
                                      selectedPrompt
                                        ? formatTextForDisplay(
                                            selectedPrompt.text
                                          )
                                        : ""
                                    }
                                    defaultValue={selectedPrompt?.text}
                                    onChange={(value: string) =>
                                      handleViewPromptRTE(
                                        formatTextForEditor(value)
                                      )
                                    }
                                    modules={modules}
                                  />
                                </Modal>
                                <button
                                  className="full-view-icon d-flex align-center justify-center"
                                  type="button"
                                  onClick={() =>
                                    handleModalOpen("modal-addInput")
                                  }
                                >
                                  <svg
                                    width="30px"
                                    height="30px"
                                    viewBox="0 0 512 512"
                                  >
                                    <polyline
                                      points="304 96 416 96 416 208"
                                      fill="none"
                                      stroke="#000000"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="32"
                                    />
                                    <line
                                      x1="405.77"
                                      y1="106.2"
                                      x2="111.98"
                                      y2="400.02"
                                      fill="none"
                                      stroke="#000000"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="32"
                                    />
                                    <polyline
                                      points="208 416 96 416 96 304"
                                      fill="none"
                                      stroke="#000000"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="32"
                                    />
                                  </svg>
                                </button>
                              </span>
                            </div>
                          )}

                          {tab2 === "Instructions" && userRole === "ADMIN" && (
                            <div className="form-group">
                              <label>Instructions</label>
                              <span className="pos-relative">
                                <pre
                                  className={`no-content height-400 ql-editor ${
                                    !selectedPrompt?.text ? "text-light" : ""
                                  }`}
                                  dangerouslySetInnerHTML={{
                                    __html:
                                      selectedPrompt?.text ??
                                      "Template will appear here",
                                  }}
                                ></pre>

                                <Modal
                                  show={openModals["modal-addInput"]}
                                  closeModal={() =>
                                    handleModalClose("modal-addInput")
                                  }
                                  buttonLabel="Ok"
                                >
                                  <label>Instructions</label>
                                  <ReactQuill
                                    theme="snow"
                                    className="adjust-quill-height"
                                    value={
                                      selectedPrompt
                                        ? formatTextForDisplay(
                                            selectedPrompt.text
                                          )
                                        : ""
                                    }
                                    defaultValue={selectedPrompt?.text}
                                    onChange={(value: string) =>
                                      handleViewPromptRTE(
                                        formatTextForEditor(value)
                                      )
                                    }
                                    modules={modules}
                                  />
                                </Modal>
                                <button
                                  className="full-view-icon d-flex align-center justify-center"
                                  type="button"
                                  onClick={() =>
                                    handleModalOpen("modal-addInput")
                                  }
                                >
                                  <svg
                                    width="30px"
                                    height="30px"
                                    viewBox="0 0 512 512"
                                  >
                                    <polyline
                                      points="304 96 416 96 416 208"
                                      fill="none"
                                      stroke="#000000"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="32"
                                    />
                                    <line
                                      x1="405.77"
                                      y1="106.2"
                                      x2="111.98"
                                      y2="400.02"
                                      fill="none"
                                      stroke="#000000"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="32"
                                    />
                                    <polyline
                                      points="208 416 96 416 96 304"
                                      fill="none"
                                      stroke="#000000"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="32"
                                    />
                                  </svg>
                                </button>
                              </span>
                            </div>
                          )}

                          <div className="form-group d-flex justify-between mb-0">
                            {/* Modals */}

                            {/* Add Prompt Modal */}
                            <Modal
                              show={openModals["modal-add-prompt"]}
                              closeModal={() =>
                                handleModalClose("modal-add-prompt")
                              }
                              buttonLabel="Close"
                            >
                              <form
                                onSubmit={addPromptSubmitHandler}
                                className="full-height"
                              >
                                <h2 className="left">Add a prompt</h2>
                                <div className="form-group">
                                  <label>Prompt name</label>
                                  <input
                                    type="text"
                                    name="promptName"
                                    placeholder="Enter prompt name"
                                    value={addPrompt.promptName}
                                    onChange={addPromptHandler}
                                  />
                                </div>

                                {userRole === "ADMIN" && (
                                  <div className="tabs secondary">
                                    <ul className="d-flex">
                                      <li>
                                        <button
                                          type="button"
                                          onClick={tabHandler4}
                                          className={`button ${
                                            tab4 === "Template" ? "active" : ""
                                          }`}
                                        >
                                          Template
                                        </button>
                                      </li>
                                      <li>
                                        <button
                                          type="button"
                                          onClick={tabHandler4}
                                          className={`button ${
                                            tab4 === "Instructions"
                                              ? "active"
                                              : ""
                                          }`}
                                        >
                                          Instructions
                                        </button>
                                      </li>
                                    </ul>
                                  </div>
                                )}

                                {tab4 === "Template" && (
                                  <div className="form-group edit-prompt-form-height">
                                    <label>Template</label>
                                    <span className="pos-relative">
                                      <ReactQuill
                                        className="adjust-quill-height"
                                        theme="snow"
                                        value={
                                          addPrompt?.promptTemplate
                                            ? formatTextForDisplay(
                                                addPrompt?.promptTemplate
                                              )
                                            : ""
                                        }
                                        defaultValue={addPrompt?.promptTemplate}
                                        onChange={(value: string) =>
                                          handleAddPromptTemplateRTE(
                                            formatTextForEditor(value)
                                          )
                                        }
                                        modules={modules}
                                      />
                                    </span>
                                  </div>
                                )}

                                {tab4 === "Instructions" &&
                                  userRole === "ADMIN" && (
                                    <div className="form-group edit-prompt-form-height">
                                      <label>Instructions</label>
                                      <span className="pos-relative">
                                        <ReactQuill
                                          className="adjust-quill-height"
                                          theme="snow"
                                          value={
                                            addPrompt?.promptInput
                                              ? formatTextForDisplay(
                                                  addPrompt?.promptInput
                                                )
                                              : ""
                                          }
                                          defaultValue={addPrompt?.promptInput}
                                          onChange={(value: string) =>
                                            handleAddPromptInPutRTE(
                                              formatTextForEditor(value)
                                            )
                                          }
                                          modules={modules}
                                        />
                                      </span>
                                    </div>
                                  )}

                                <div className="form-group d-flex">
                                  <button
                                    type="submit"
                                    className="action-button button mr-10"
                                  >
                                    Save prompt
                                  </button>
                                  {addPromptAlert && (
                                    <span className="alert alert-success ml-10">
                                      Prompt added successfully.
                                    </span>
                                  )}
                                </div>
                              </form>
                            </Modal>

                            {/* Edit Prompt Modal */}
                            <Modal
                              show={openModals["modal-edit-prompt"]}
                              closeModal={() =>
                                handleModalClose("modal-edit-prompt")
                              }
                              buttonLabel="Close"
                            >
                              <form
                                onSubmit={editPromptSubmitHandler}
                                className="full-height"
                              >
                                <h2 className="left">Edit Prompt</h2>
                                <div className="form-group">
                                  <label>Prompt name</label>
                                  <input
                                    type="text"
                                    name="promptName"
                                    placeholder="Enter prompt name"
                                    value={editPrompt?.promptName}
                                    onChange={editPromptHandler}
                                  />
                                </div>

                                {userRole === "ADMIN" && (
                                  <div className="tabs secondary">
                                    <ul className="d-flex">
                                      <li>
                                        <button
                                          type="button"
                                          onClick={tabHandler3}
                                          className={`button ${
                                            tab3 === "Template" ? "active" : ""
                                          }`}
                                        >
                                          Template
                                        </button>
                                      </li>
                                      <li>
                                        <button
                                          type="button"
                                          onClick={tabHandler3}
                                          className={`button ${
                                            tab3 === "Instructions"
                                              ? "active"
                                              : ""
                                          }`}
                                        >
                                          Instructions
                                        </button>
                                      </li>
                                    </ul>
                                  </div>
                                )}

                                {tab3 === "Template" && (
                                  <div className="form-group edit-prompt-form-height">
                                    <label>Template</label>
                                    <span className="pos-relative h-full">
                                      <ReactQuill
                                        className="height-350 adjust-quill-height"
                                        theme="snow"
                                        value={
                                          editPrompt?.promptTemplate
                                            ? formatTextForDisplay(
                                                editPrompt?.promptTemplate
                                              )
                                            : ""
                                        }
                                        defaultValue={
                                          editPrompt?.promptTemplate
                                        }
                                        onChange={(value: string) =>
                                          handleEditPromptTemplateRTE(
                                            formatTextForEditor(value)
                                          )
                                        }
                                        modules={modules}
                                      />
                                    </span>
                                  </div>
                                )}

                                {tab3 === "Instructions" &&
                                  userRole === "ADMIN" && (
                                    <div className="form-group edit-prompt-form-height">
                                      <label>Instructions</label>
                                      <span className="pos-relative">
                                        <ReactQuill
                                          className="height-350 adjust-quill-height"
                                          theme="snow"
                                          value={
                                            editPrompt?.promptInput
                                              ? formatTextForDisplay(
                                                  editPrompt?.promptInput
                                                )
                                              : ""
                                          }
                                          defaultValue={editPrompt?.promptInput}
                                          onChange={(value: string) =>
                                            handleEditPromptInputRTE(
                                              formatTextForEditor(value)
                                            )
                                          }
                                          modules={modules}
                                        />
                                      </span>
                                    </div>
                                  )}

                                <div className="form-group d-flex">
                                  <button
                                    type="submit"
                                    className="action-button button mr-10"
                                  >
                                    Save changes
                                  </button>
                                  {editPromptAlert && (
                                    <span className="alert alert-success ml-10">
                                      Prompt edited successfully.
                                    </span>
                                  )}
                                </div>
                              </form>
                            </Modal>

                            {/* Delete Confirmation Modal */}
                            <Modal
                              show={openModals["modal-confirm-delete"]}
                              closeModal={() =>
                                handleModalClose("modal-confirm-delete")
                              }
                              buttonLabel=""
                              size="auto-width"
                            >
                              <h3 className="center text-center mt-0 sub-title">
                                Are you sure want to delete?
                              </h3>
                              <div className="button-group mb-0 d-flex justify-center">
                                <button
                                  className="button save-button small"
                                  onClick={deletePromptHandler}
                                >
                                  Yes
                                </button>
                                <button
                                  className="button button secondary small ml-5"
                                  onClick={() =>
                                    handleModalClose("modal-confirm-delete")
                                  }
                                >
                                  No
                                </button>
                              </div>
                            </Modal>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

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
                handlePauseResume={handlePauseResume}
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
                subjectMode={subjectMode}
                setSubjectMode={setSubjectMode}
                subjectText={subjectText}
                setSubjectText={setSubjectText}
                selectedPrompt={selectedPrompt} // Make sure this is passed
              />
            )}

            {tab === "Settings" && userRole === "ADMIN" && (
              <Settings
                 selectedClient={selectedClient}
                  fetchClientSettings={fetchClientSettings}
                  settingsForm={settingsForm}
                  settingsFormHandler={settingsFormHandler}
                  settingsFormOnSubmit={settingsFormOnSubmit}
                  searchTermForm={searchTermForm}
                  searchTermFormHandler={searchTermFormHandler}
                  searchTermFormOnSubmit={searchTermFormOnSubmit}
                preloadedSettings={clientSettings} // ADD THIS LINE
                isLoadingSettings={isLoadingClientSettings} // ADD THIS LINE
              />
            )}

            {tab === "Mail" && userRole === "ADMIN" && (
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

            {/* Stop Confirmation Popup */}
            {showPopup && (
              <div className="popup">
                <p>Do you want to stop the process?</p>
                <button onClick={() => handlePopupResponse(true)}>Yes</button>
                <button onClick={() => handlePopupResponse(false)}>No</button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainPage;
