import { useRef, useCallback, useState, useEffect, type Dispatch, type SetStateAction } from "react";
import Modal from "../common/Modal";
import axios from "axios";
import "./Mail.css";
import API_BASE_URL from "../../config";
import { toast } from "react-toastify";
import ContactsTable from "./ContactsTable";
import { useAppData } from "../../contexts/AppDataContext";
import MailDashboard from "./MailDashboard";
import type { EventItem, EmailLog } from "../../contexts/AppDataContext";
import AppModal from "../common/AppModal";
import LoadingSpinner from "../common/LoadingSpinner";
import { useAppModal } from "../../hooks/useAppModal";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../Redux/store";
import PaginationControls from "./PaginationControls";
import ValidateRecordsModal from "./ValidateRecordsModal";
import OtpModal from "./OtpModal";
import DomainAuthModal from "./DomainAuthModal";
import CommonSidePanel from "../common/CommonSidePanel";
import ToastMessage from "../common/ToastMessage";
import deleteIcon from "../../assets/images/deleteiconn.png";
import { faEdit,faTrashAlt,faCircleXmark } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import InboxView from "./inbox/InboxView";
import MailConfiguration from "./MailConfiguration";
import { closePanel, openPanel } from "../../slices/panelSlice";
import ScheduleTab from "./schedule/ScheduleTab";
type MailTabType = "Dashboard" | "Configuration" | "Schedule" | "Inbox";

interface SmtpConfig {
  id?: number;
  server: string;
  port: number;
  username: string;
  password: string;
  usessl: boolean;
  useSsl?: boolean;
  fromEmail: string;
}

interface InboxCredential {
  id: number;
  clientId: number;
  emailAddress: string;
  protocol: "IMAP" | "POP3";
  host: string;
  port: number;
  useSSL: boolean;
  username: string;
  password: string;
  syncIntervalMinutes: number;
  createdAt: string;
  updatedAt: string;
}
interface EmailEntry {
  id?: string;
  full_Name?: string;
  job_Title?: string;
  account_name_friendlySingle_Line_12?: string;
  mailing_Country?: string;
  website?: string;
  linkedIn_URL?: string;
  sample_email_body?: string;
  generated: boolean;
}

// In Output.tsx
interface ZohoClient {
  id: number;
  zohoviewId: string;
  zohoviewName: string;
  clientId: number;
  totalContact: number;
}

interface SettingsProps {
  selectedClient: string;
}

interface MailProps {
  initialTab?: string;
  onTabChange?: (tab: string) => void;
  inboxSubTab?: string;
  onInboxSubTabChange?: (subTab: string) => void;
  onSelectedInboxUnreadCountsChange?: (counts: {
    associated: number;
    external: number;
    allMessages: number;
  }) => void;
}

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  width?: string;
}

interface EmailContact {
  id: number;
  contactId: number;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email: string;
  company: string;
  jobTitle: string;
  location: string;
  linkedin_URL?: string;
  website?: string;
  timestamp: string;
  eventType: "Open" | "Click";
  targetUrl?: string;
  hasOpened?: boolean;
  hasClicked?: boolean;
}

interface Segment {
  id: number;
  name: string;
  description: string;
  dataFileId: number;
  clientId: number;
  createdAt: string;
  updatedAt: string | null;
}

interface OutputInterface {
  outputForm: {
    generatedContent: string;
    linkLabel: string;
    currentPrompt: string;
    searchResults: string[];
    allScrapedData: string;
  };
  isResetEnabled: boolean; // Add this prop

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
  setAllResponses: React.Dispatch<React.SetStateAction<any[]>>; // Add this line
  currentIndex: number; // Add this line
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>; // Add this line
  onClearOutput: () => void;
  allprompt: any[];
  setallprompt: React.Dispatch<React.SetStateAction<any[]>>;
  allsearchResults: any[];
  setallsearchResults: React.Dispatch<React.SetStateAction<any[]>>;
  everyscrapedData: any[];
  seteveryscrapedData: React.Dispatch<React.SetStateAction<any[]>>;
  allSearchTermBodies: string[];
  setallSearchTermBodies: React.Dispatch<React.SetStateAction<string[]>>;
  onClearContent?: (clearContent: () => void) => void; // Add this line
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
    direction?: "next" | "previous" | null
  ) => Promise<void>;
  selectedZohoviewId: string;
  onClearExistingResponse?: (clearFunction: () => void) => void; // Define the prop to accept a function
  zohoClient: ZohoClient[]; // Add this new prop type
}

const asArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const arrayKeys = [
      "data",
      "items",
      "result",
      "results",
      "records",
      "campaigns",
      "mailboxes",
      "schedules",
      "emails",
    ];

    for (const key of arrayKeys) {
      if (Array.isArray(record[key])) {
        return record[key] as T[];
      }
    }
  }

  return [];
};

const Mail: React.FC<OutputInterface & SettingsProps & MailProps> = ({
  outputForm,
  //outputFormHandler,
  setOutputForm,

  setallSearchTermBodies,
  onClearContent, // Add this line
  setallsummery,
  setexistingResponse,
  currentPage,
  setCurrentPage,

  onClearExistingResponse,
  selectedClient,
  initialTab = "Dashboard",
  onTabChange,
  inboxSubTab = "Inbox",
  onInboxSubTabChange,
  onSelectedInboxUnreadCountsChange,
}) => {
  const dispatch = useDispatch();

  const [segments, setSegments] = useState<Segment[]>([]);
  const [segmentsLoading, setSegmentsLoading] = useState(false);

  const [isCopyText, setIsCopyText] = useState(false);
  const { saveFormState, getFormState, refreshTrigger } = useAppData();
  const [openModals, setOpenModals] = useState<{ [key: string]: boolean }>({});
  const isDemoAccount = sessionStorage.getItem("isDemoAccount") === "true";
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showErrorToast, setShowErrorToast] = useState(false);

  const activePanel = useSelector(
    (state: RootState) => state.panel.activePanel
  );
  
  const showValidateModal =
    activePanel === "validate-modal";

  const showSMTPEditModal =
    activePanel === "smtp-edit-modal";

   const showIMAPEditModal =
    activePanel === "imap-edit-modal";

  const showBCCEmailModal =
    activePanel === "bcc-email-modal";

  const showAddEditMailBoxModal = activePanel === "add-edit-mailbox-modal";
  const showDomainValidation = activePanel === "domain-validation-modal";



  const handleModalOpen = (id: string) => {
    setOpenModals((prev) => ({ ...prev, [id]: true }));
  };

  const handleModalClose = (id: string) => {
    setOpenModals((prev) => ({ ...prev, [id]: false }));
  };

  const [tab, setTab] = useState<MailTabType>(initialTab as MailTabType);

  useEffect(() => {
    setTab(initialTab as MailTabType);
  }, [initialTab]);

  const tabHandler = (e: React.MouseEvent<HTMLButtonElement>) => {
    const innerText = e.currentTarget.innerText as MailTabType;
    setTab(innerText);

    // Save current state when changing tabs

    if (onTabChange) {
      onTabChange(innerText);
    }
  };

  const appModal = useAppModal();

  const [tab2, setTab2] = useState("Output");
  const tabHandler2 = (e: React.ChangeEvent<any>) => {
    const { innerText } = e.target;
    setTab2(innerText);
  };

  const clearContent = () => {
    setOutputForm((prevOutputForm: any) => ({
      ...prevOutputForm,
      generatedContent: "", // Clear generated content
      linkLabel: "", // Clear link label
      currentPrompt: "",
      searchResults: [],
      allScrapedData: "",
    }));

    setallSearchTermBodies([]); // Clear all search term bodies
    setallsummery([]);
    setexistingResponse([]);

    setCurrentPage(0); // Resetting the
  };

  const [userRole, setUserRole] = useState<string>(""); // Store user role

  useEffect(() => {
    const isAdminString = sessionStorage.getItem("isAdmin");
    const isAdmin = isAdminString === "true"; // Correct comparison
    setUserRole(isAdmin ? "ADMIN" : "USER");
  }, []);

  useEffect(() => {
    if (onClearContent) {
      onClearContent(clearContent);
    }
  }, [onClearContent]);
  //const userId = sessionStorage.getItem("clientId");
  //const effectiveUserId = selectedClient !== "" ? selectedClient : userId;
  const reduxUserId = useSelector((state: RootState) => state.auth.userId);
  const effectiveUserId = selectedClient !== "" ? selectedClient : reduxUserId;
  console.log("API Payload Client ID:", effectiveUserId);

  useEffect(() => {
    console.log("User ID from Redux:", reduxUserId);
    console.log("Effective User ID:", effectiveUserId);
  }, [reduxUserId, effectiveUserId]);

  const token = sessionStorage.getItem("token");

  const getBackendErrorMessage = (err: any, fallback: string) => {
    const errorData = err?.response?.data;

    if (!errorData) {
      return err?.message || fallback;
    }

    if (typeof errorData === "string") {
      return errorData;
    }

    if (errorData.message) {
      return errorData.message;
    }

    if (errorData.error) {
      return errorData.error;
    }

    if (errorData.title) {
      return errorData.title;
    }

    if (errorData.detail) {
      return errorData.detail;
    }

    if (errorData.errors && typeof errorData.errors === "object") {
      const firstError = Object.values(errorData.errors)
        .flat()
        .find(Boolean);
      if (firstError) {
        return String(firstError);
      }
    }

    return fallback;
  };

  // SMTP View
  const [smtpList, setSmtpList] = useState<SmtpConfig[]>([]);
  // IMAP/POP3 View
  const [inboxList, setInboxList] = useState<InboxCredential[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [form, setForm] = useState({
    server: "",
    port: "",
    username: "",
    password: "",
    fromEmail: "",
    senderName: "",
    usessl: "Auto",
    incomingServer: "",
    incomingPort: "",
    fullInboxSync: false,
    incomingSecurityType: "Auto",
  });
  
  // Inbox form state
  const [inboxForm, setInboxForm] = useState({
    emailAddress: "",
    protocol: "IMAP",
    host: "",
    port: "",
    username: "",
    password: "",
    encryption: "Auto",
    fullInboxSync: false,
  });
  
  const [editingId, setEditingId] = useState(null);
  const [editingInboxId, setEditingInboxId] = useState<number | null>(null);
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [showSmtpOtpModal, setShowSmtpOtpModal] = useState(false);
  const [smtpOtpEmail, setSmtpOtpEmail] = useState("");
  const [smtpOtpVerifying, setSmtpOtpVerifying] = useState(false);
  const [deletePopupOpen, setDeletePopupOpen] = useState(false);
  const [selectedDeleteId, setSelectedDeleteId] = useState<any>(null);
  const [deletingInboxId, setDeletingInboxId] = useState<number | null>(null);
  // Fetch SMTP List
  const fetchSmtp = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/email/get-smtp?ClientId=${effectiveUserId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            //...(token && { 'Authorization': `Bearer ${token}` })
          },
        }
      );

      setSmtpList(asArray<SmtpConfig>(response.data));
    } catch (error) {
      setSmtpList([]); // No records found or error
    }
  };

  // Fetch IMAP/POP3 List
  const fetchInboxCredentials = async () => {
    setInboxLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/Inbox/Get-Inboxcredentials?clientId=${effectiveUserId}`,
        {
          headers: {
            "Content-Type": "application/json",
            //...(token && { 'Authorization': `Bearer ${token}` })
          },
        }
      );

      setInboxList(asArray<InboxCredential>(response.data));
    } catch (error) {
      console.error('Error fetching inbox credentials:', error);
      setInboxList([]);
    } finally {
      setInboxLoading(false);
    }
  };

  useEffect(() => {
    fetchSmtp();
    fetchInboxCredentials();
  }, [effectiveUserId]);

  // Handle Form Change
  const handleChangeSMTP = (e: any) => {
    const { name, value } = e.target;
    setForm((prevForm) => ({
      ...prevForm,
      [name]: value,
    }));
  };

  // Handle Inbox Form Change
  const handleChangeInbox = (e: any) => {
    const { name, value, type, checked } = e.target;
    setInboxForm((prevForm) => ({
      ...prevForm,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Handle Inbox Edit
  const handleEditInbox = (item: InboxCredential) => {
    setInboxForm({
      emailAddress: item.emailAddress,
      protocol: "IMAP",
      host: item.host,
      port: item.port.toString(),
      username: item.username,
      password: item.password,
      encryption: (item as any).encryption || "Auto",
      fullInboxSync: (item as any).fullInboxSync || false,
    });
    setEditingInboxId(item.id);
    dispatch(openPanel("imap-edit-modal"));
  };

  // Handle Inbox Update Submit
  const handleSubmitInbox = async (e: any) => {
    e.preventDefault();
    setInboxLoading(true);

    try {
      const payload = {
        clientId: effectiveUserId,
        emailAddress: inboxForm.emailAddress,
        protocol: "IMAP",
        host: inboxForm.host,
        port: parseInt(inboxForm.port),
        encryption: inboxForm.encryption,
        username: inboxForm.username,
        password: inboxForm.password,
        fullInboxSync: inboxForm.fullInboxSync,
      };

      await axios.post(
        `${API_BASE_URL}/api/Inbox/update-Inboxcredentials?id=${editingInboxId}`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      setToastMessage("Inbox configuration updated successfully");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 6000);
      
      // Reset form and close modal
      setInboxForm({
        emailAddress: "",
        protocol: "IMAP",
        host: "",
        port: "",
        username: "",
        password: "",
        encryption: "Auto",
        fullInboxSync: false,
      });
      setEditingInboxId(null);
      dispatch(closePanel());
      
      // Refresh Inbox list
      fetchInboxCredentials();
    } catch (err: any) {
      console.error(err);
      const errorMessage = getBackendErrorMessage(
        err,
        "Failed to update Inbox configuration"
      );
      
      setToastMessage(errorMessage);
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 6000);
    } finally {
      setInboxLoading(false);
    }
  };

  // Handle Add/Update Submit
  const handleSubmitSMTP = async (e?: any, includeInbox?: boolean) => {
    e?.preventDefault?.();
    setSmtpLoading(true);

    try {
      const shouldIncludeInbox =
        includeInbox ?? Boolean(form.incomingServer || form.incomingPort);
      const payload = {
        outgoingServer: form.server,
        outgoingPort: parseInt(form.port),
        domainId: 0,
        username: form.username,
        password: form.password,
        fromEmail: form.fromEmail,
        senderName: form.senderName,
        outgoingSecurityType: form.usessl,
        isUpdate: !!editingId,
        inbox: shouldIncludeInbox
          ? {
              clientId: parseInt(String(effectiveUserId)),
              emailAddress: form.fromEmail,
              host: form.incomingServer,
              port: parseInt(form.incomingPort),
              fullInboxSync: form.fullInboxSync,
              username: form.username,
              password: form.password,
              encryption: form.incomingSecurityType,
            }
          : null,
      };

      const smtpUrl = editingId
        ? `${API_BASE_URL}/api/email/Update-smtp/${editingId}?ClientId=${effectiveUserId}`
        : `${API_BASE_URL}/api/email/configTestMail?ClientId=${effectiveUserId}`;

      await axios.post(
        smtpUrl,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (!editingId) {
        // For Add operation, close add modal first then show OTP modal
        //handleModalClose("modal-add-mailbox");
        dispatch(closePanel());
        setSmtpOtpEmail(form.fromEmail);
        setShowSmtpOtpModal(true);
      } else {
        // For Edit operation, just show success
        setToastMessage("Mailbox configuration updated successfully");
        setShowErrorToast(false);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 6000);
        setForm({
          server: "",
          port: "",
          username: "",
          password: "",
          fromEmail: "",
          senderName: "",
          usessl: "Auto",
          incomingServer: "",
          incomingPort: "",
          fullInboxSync: false,
          incomingSecurityType: "Auto",
        });
        setEditingId(null);
        //handleModalClose("modal-edit-smtp");
        dispatch(closePanel());
        fetchSmtp(); // Refresh SMTP grid
        fetchInboxCredentials(); // Refresh Inbox grid
      }
    } catch (err: any) {
      console.error(err);
      const errorMessage = getBackendErrorMessage(
        err,
        editingId
          ? "Failed to update mailbox configuration"
          : "Failed to send test email. Please check the settings."
      );
      
      setToastMessage(errorMessage);
      setShowSuccessToast(false);
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 6000);
    } finally {
      setSmtpLoading(false);
    }
  };

  // Handle SMTP OTP Verification
  const handleSmtpOtpVerify = async (otp: string) => {
    setSmtpOtpVerifying(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/domain-verification/verifySmtpOtp?email=${encodeURIComponent(smtpOtpEmail)}&otp=${encodeURIComponent(otp)}&clientId=${effectiveUserId}`,
        {
          method: 'POST',
          headers: {
            'accept': '*/*'
          },
          body: ''
        }
      );
      
      if (response.ok) {
       // appModal.showSuccess('SMTP email verified successfully!');
        setToastMessage("SMTP email verified successfully!");
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 6000);
        setShowSmtpOtpModal(false);
        setForm({
          server: "",
          port: "",
          username: "",
          password: "",
          fromEmail: "",
          senderName: "",
          usessl: "Auto",
          incomingServer: "",
          incomingPort: "",
          fullInboxSync: false,
          incomingSecurityType: "Auto",
        });
        setEditingId(null);
        // Refresh SMTP list and Inbox list
        fetchSmtp();
        fetchInboxCredentials();
      } else {
       // appModal.showError('Invalid OTP. Please try again.');
        setToastMessage("Invalid OTP. Please try again.");
        setShowErrorToast(true);
        setTimeout(() => setShowErrorToast(false), 6000);
      }
    } catch (error) {
      console.error('Error verifying SMTP OTP:', error);
      //appModal.showError('Error verifying OTP. Please check your connection.');
      setToastMessage("Error verifying OTP. Please check your connection.");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 6000);
    } finally {
      setSmtpOtpVerifying(false);
    }
  };

  // Edit Handler
  const handleEdit = (item: any) => {
    const inbox = item.inbox || {};
    setForm({
      server: item.server,
      port: item.port?.toString() || "",
      username: item.username || inbox.username || "",
      password: item.password || inbox.password || "",
      fromEmail: item.fromEmail || inbox.emailAddress || "",
      senderName: item.senderName || "",
      usessl: (item.SecurityType || item.securityType || "Auto"),
      incomingServer: inbox.host || item.incomingServer || "",
      incomingPort: inbox.port?.toString() || item.incomingPort?.toString() || "",
      fullInboxSync: inbox.fullInboxSync ?? item.fullInboxSync ?? false,
      incomingSecurityType: inbox.encryption || item.incomingSecurityType || "Auto",
    });
    setEditingId(item.id);
    //handleModalOpen("modal-edit-smtp");
    dispatch(openPanel("smtp-edit-modal"));
  };
const handleDelete = (id: any) => {
  setSelectedDeleteId(id);
  setDeletePopupOpen(true);
};

// Handle Inbox Delete
const handleDeleteInbox = (id: number) => {
  setDeletingInboxId(id);
  setDeletePopupOpen(true);
};

// Confirm Inbox Delete
const confirmDeleteInbox = async () => {
  if (!deletingInboxId) return;

  setInboxLoading(true);
  try {
    await axios.post(
      `${API_BASE_URL}/api/Inbox/delete-Inboxcredentials?id=${deletingInboxId}`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      }
    );

    setToastMessage("Inbox configuration deleted successfully");
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 6000);
    
    setDeletePopupOpen(false);
    setDeletingInboxId(null);
    
    // Refresh Inbox list
    fetchInboxCredentials();
  } catch (err: any) {
    console.error(err);
    let errorMessage = "Failed to delete Inbox configuration";
    
    if (err.response?.data) {
      const errorData = err.response.data;
      if (typeof errorData === 'string') {
        errorMessage = errorData;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    }
    
    setToastMessage(errorMessage);
    setShowErrorToast(true);
    setTimeout(() => setShowErrorToast(false), 6000);
    
    setDeletePopupOpen(false);
    setDeletingInboxId(null);
  } finally {
    setInboxLoading(false);
  }
};
const confirmDeleteSmtp = async () => {
  if (!selectedDeleteId) return;

  try {
    await axios.post(
      `${API_BASE_URL}/api/email/delete-smtp/${selectedDeleteId}?ClientId=${effectiveUserId}`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      }
    );

    fetchSmtp(); // Refresh grid
    setDeletePopupOpen(false);
    setSelectedDeleteId(null);
    setToastMessage("SMTP configuration deleted successfully");
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 6000);
  } catch (err) {
    console.error(err);
    setToastMessage("Error deleting SMTP");
    setShowErrorToast(true);
    setTimeout(() => setShowErrorToast(false), 6000);
    setDeletePopupOpen(false);
  }
};
  // Handle Delete Handler (Assuming you create this API in backend)
  // const handleDelete = async (id: any) => {
  //   if (window.confirm("Are you sure to delete this SMTP config?")) {
  //     try {
  //       await axios.post(
  //         `${API_BASE_URL}/api/email/delete-smtp/${id}?ClientId=${effectiveUserId}`,
  //         {
  //           headers: {
  //             "Content-Type": "application/json",
  //             ...(token && { Authorization: `Bearer ${token}` }),
  //           },
  //         }
  //       );
  //       fetchSmtp(); // Refresh grid
  //     } catch (err) {
  //       console.error(err);
  //       // appModal.showError("Error deleting SMTP");
  //       setToastMessage("Error deleting SMTP");
  //     setShowErrorToast(true);
  //     setTimeout(() => setShowErrorToast(false), 6000);
  //     }
  //   }
  // };
  //End SMTP



  const [bccError, setBccError] = useState("");

  // Email device width
  const [outputEmailWidth, setOutputEmailWidth] = useState<string>("");

  const toggleOutputEmailWidth = (deviceName: string) => {
    setOutputEmailWidth(deviceName);
  };

  // BCC Email Management states
  const [bccEmails, setBccEmails] = useState<BccEmail[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [newBccEmail, setNewBccEmail] = useState<string>("");
  const [bccLoading, setBccLoading] = useState(false);
  const [configTab, setConfigTab] = useState("mailboxes");
  const [mailboxSubTab, setMailboxSubTab] = useState<"smtp" | "inbox">("smtp");


  type BccEmail = { id: number; bccEmailAddress: string; clinteId: number };

  // Fetch BCC emails when client changes
  useEffect(() => {
    if (!effectiveUserId) return;

    const fetchBcc = async () => {
      setBccLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/email/get-by-clinte?clinteId=${effectiveUserId}`
        );
        if (!res.ok) throw new Error("Failed to fetch BCC emails");
        const data = await res.json();
        setBccEmails(asArray<BccEmail>(data));
        setBccError("");
      } catch (error: any) {
        setBccError("Could not fetch BCC emails");
      } finally {
        setBccLoading(false);
      }
    };

    fetchBcc();
  }, [effectiveUserId]);
  const handleSave = () => {
    handleAddBcc();
    setNewBccEmail("");
    //setShowPopup(false);
    dispatch(closePanel());
  };
  const handleAddBcc = async () => {
    if (!newBccEmail) return;
    setBccLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/email/${effectiveUserId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ BccEmailAddress: newBccEmail }),
      });
      if (!res.ok) throw new Error("Add failed");
      setNewBccEmail("");
      setBccError("");
      // Refresh list
      const updated = await fetch(
        `${API_BASE_URL}/api/email/get-by-clinte?clinteId=${effectiveUserId}`
      );
      const updatedData = await updated.json();
      setBccEmails(asArray<BccEmail>(updatedData));
    } catch (error: any) {
      setBccError("Error adding BCC email");
    } finally {
      setBccLoading(false);
    }
  };

  const handleDeleteBcc = async (id: number) => {
    setBccLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/email/delete?id=${id}&clinteId=${effectiveUserId}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Delete failed");
      setBccError("");
      setBccEmails(bccEmails.filter((e) => e.id !== id));
    } catch (error: any) {
      setBccError("Error deleting");
    } finally {
      setBccLoading(false);
    }
  };

  const [dashboardData, setDashboardData] = useState({
    allEventData: [] as EventItem[],
    allEmailLogs: [] as any[],
    emailLogs: [] as EmailLog[],
    selectedView: "",
    loading: false,
    dataFetched: false,
  });

  // Add dashboard data handlers
  const handleDashboardDataChange = useCallback((data: any) => {
    setDashboardData((prev) => ({
      ...prev,
      ...data,
    }));
  }, []);

  // Clear dashboard data when user changes
  useEffect(() => {
    setDashboardData({
      allEventData: [],
      allEmailLogs: [],
      emailLogs: [],
      selectedView: "",
      loading: false,
      dataFetched: false,
    });
  }, [effectiveUserId]);

  // Add these states for the new UI
  const [mailboxSearch, setMailboxSearch] = useState("");
  const [smtpSortKey, setSmtpSortKey] = useState("server");
  const [smtpSortDirection, setSmtpSortDirection] = useState<"asc" | "desc">("asc");
  const [inboxSortKey, setInboxSortKey] = useState("host");
  const [inboxSortDirection, setInboxSortDirection] = useState<"asc" | "desc">("asc");
  const [bccSortKey, setBccSortKey] = useState("bccEmailAddress");
  const [bccSortDirection, setBccSortDirection] = useState<"asc" | "desc">("asc");
  const [domainSortKey, setDomainSortKey] = useState("domain");
  const [domainSortDirection, setDomainSortDirection] = useState<"asc" | "desc">("asc");
  const [mailboxActionsAnchor, setMailboxActionsAnchor] = useState<
    string | null
  >(null);

  // Menu button style constant
  const menuBtnStyle = {
    width: "100%",
    padding: "8px 18px",
    textAlign: "left" as const,
    background: "none",
    border: "none",
    color: "#222",
    fontSize: "15px",
    cursor: "pointer",
  };
const actionIconStyle = {
  width: 24,
  height: 24,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

  const compareSortableValues = (
    a: unknown,
    b: unknown,
    direction: "asc" | "desc"
  ) => {
    const normalize = (value: unknown) => {
      if (typeof value === "boolean") return value ? 1 : 0;
      if (typeof value === "number") return value;
      if (value === null || value === undefined) return "";
      return String(value).toLowerCase();
    };

    const valueA = normalize(a);
    const valueB = normalize(b);
    const comparison =
      typeof valueA === "number" && typeof valueB === "number"
        ? valueA - valueB
        : String(valueA).localeCompare(String(valueB), undefined, {
            numeric: true,
            sensitivity: "base",
          });

    return direction === "asc" ? comparison : -comparison;
  };

  const renderSortArrow = (
    columnKey: string,
    currentSortKey: string,
    direction: "asc" | "desc"
  ) => {
    if (columnKey !== currentSortKey) return "";
    return direction === "asc" ? " ▲" : " ▼";
  };

  const toggleSort = (
    key: string,
    currentKey: string,
    setKey: Dispatch<SetStateAction<string>>,
    setDirection: Dispatch<SetStateAction<"asc" | "desc">>
  ) => {
    if (currentKey === key) {
      setDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setKey(key);
      setDirection("asc");
    }
  };

  const getSmtpSortValue = (item: SmtpConfig, key: string) => {
    if (key === "senderName") return (item as any).senderName;
    if (key === "ssl") return (item as any).SecurityType || (item as any).securityType || item.usessl || item.useSsl;
    return (item as any)[key];
  };

  const getInboxSortValue = (item: InboxCredential, key: string) => {
    if (key === "ssl") return item.useSSL;
    return (item as any)[key];
  };

  const getDomainSortValue = (domain: any, key: string) => {
    if (key === "ownerAuth") return domain.domainverified;
    if (key === "status") {
      return domain.status || domain.domainStatus || domain.dkimStatus || domain.spfStatus || "";
    }
    return domain[key];
  };

  // For Mail component - add these useEffects
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isActionsButton = target.closest(".segment-actions-btn");
      const isActionsMenu = target.closest(".segment-actions-menu");

      if (!isActionsButton && !isActionsMenu) {
        setMailboxActionsAnchor(null);
      }
    };

    if (mailboxActionsAnchor) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [mailboxActionsAnchor]);





  const [pageSize, setPageSize] = useState(10);

  const [currentPageMailbox, setCurrentPageMailbox] = useState(1);

  const safeSmtpList = asArray<SmtpConfig>(smtpList);
  const filteredMailboxes = safeSmtpList
    .filter((item) => {
      const search = mailboxSearch.toLowerCase();
      const inbox = (item as any).inbox || {};
      const searchableValues = [
        item.server,
        item.username,
        item.fromEmail,
        (item as any).senderName,
        (item as any).securityType,
        inbox.emailAddress,
        inbox.host,
        inbox.username,
        inbox.encryption,
      ];

      return searchableValues.some((value) =>
        String(value || "").toLowerCase().includes(search)
      );
    })
    .sort((a, b) =>
      compareSortableValues(
        getSmtpSortValue(a, smtpSortKey),
        getSmtpSortValue(b, smtpSortKey),
        smtpSortDirection
      )
    );

  const totalPagesMailbox = Math.ceil(filteredMailboxes.length / pageSize);

  const startIndex = (currentPageMailbox - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const currentMailboxes = filteredMailboxes.slice(startIndex, endIndex);

  // IMAP/POP3 pagination
  const [currentPageInbox, setCurrentPageInbox] = useState(1);

  const safeInboxList = asArray<InboxCredential>(inboxList);
  const filteredInboxes = safeInboxList
    .filter(
      (item) =>
        item.host?.toLowerCase().includes(mailboxSearch.toLowerCase()) ||
        item.username?.toLowerCase().includes(mailboxSearch.toLowerCase()) ||
        item.emailAddress?.toLowerCase().includes(mailboxSearch.toLowerCase())
    )
    .sort((a, b) =>
      compareSortableValues(
        getInboxSortValue(a, inboxSortKey),
        getInboxSortValue(b, inboxSortKey),
        inboxSortDirection
      )
    );

  const totalPagesInbox = Math.ceil(filteredInboxes.length / pageSize);

  const startIndexInbox = (currentPageInbox - 1) * pageSize;
  const endIndexInbox = startIndexInbox + pageSize;

  const currentInboxes = filteredInboxes.slice(startIndexInbox, endIndexInbox);
  //pagination for bcc
  const [bccPage, setBccPage] = useState(1);
  const bccPageSize = 10;
  const safeBccEmails = asArray<BccEmail>(bccEmails);
  const sortedBccEmails = [...safeBccEmails].sort((a, b) =>
    compareSortableValues(
      (a as any)[bccSortKey],
      (b as any)[bccSortKey],
      bccSortDirection
    )
  );
  const totalPagesBCC = Math.ceil(sortedBccEmails.length / bccPageSize);

  const paginatedBccEmails = sortedBccEmails.slice(
    (bccPage - 1) * bccPageSize,
    bccPage * bccPageSize
  );

  // Domain states
  const [domainData, setDomainData] = useState<any[]>([]);
  const [fetchingDomain, setFetchingDomain] = useState(false);
  const [showValidatePopup, setShowValidatePopup] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<any>(null);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [selectedOtpDomain, setSelectedOtpDomain] = useState<any>(null);
  const [showDomainAuthModal, setShowDomainAuthModal] = useState(false);
  const [showDeleteDomainModal, setShowDeleteDomainModal] = useState(false);
  const [selectedDeleteDomain, setSelectedDeleteDomain] = useState<any>(null);
  const [deletingDomain, setDeletingDomain] = useState(false);
  const sortedDomainData = [...domainData].sort((a, b) =>
    compareSortableValues(
      getDomainSortValue(a, domainSortKey),
      getDomainSortValue(b, domainSortKey),
      domainSortDirection
    )
  );

  // Handle domain validation click
  const handleDomainValidateClick = (domain: any) => {
    setSelectedDomain(domain);
    //setShowDomainAuthModal(true);
    dispatch(openPanel("domain-validation-modal"));
  };

  // Handle domain delete click
  const handleDomainDeleteClick = (domain: any) => {
    setSelectedDeleteDomain(domain);
    setShowDeleteDomainModal(true);
  };

  // Handle domain delete confirmation
  const handleDeleteDomain = async () => {
    if (!selectedDeleteDomain) return;
    
    setDeletingDomain(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/domain-verification/delete-domain?domainId=${selectedDeleteDomain.domainid}&clientId=${effectiveUserId}`,
        {
          method: 'POST',
          headers: {
            'accept': '*/*'
          },
          body: ''
        }
      );
      
      if (response.ok) {
       // appModal.showSuccess('Domain deleted successfully!');
         setToastMessage("Domain deleted successfully!");
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 6000);
        fetchDomainData();
      } else {
       // appModal.showError('Failed to delete domain. Please try again.');
         setToastMessage("Failed to delete domain. Please try again.");
        setShowErrorToast(true);
        setTimeout(() => setShowErrorToast(false), 6000);
      }
    } catch (error) {
      console.error('Error deleting domain:', error);
     // appModal.showError('Error deleting domain. Please check your connection.');
       setToastMessage("Error deleting domain. Please check your connection.");
        setShowErrorToast(true);
        setTimeout(() => setShowErrorToast(false), 6000);
    } finally {
      setDeletingDomain(false);
      setShowDeleteDomainModal(false);
      setSelectedDeleteDomain(null);
    }
  };

  // Fetch domain verification data
  const fetchDomainData = async () => {
    if (!effectiveUserId) return;
    
    setFetchingDomain(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/domain-verification/get-verified-domain?clientId=${effectiveUserId}`,
        {
          method: 'GET',
          headers: {
            'accept': '*/*'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setDomainData(Array.isArray(data) ? data : []);
      } else {
        setDomainData([]);
      }
    } catch (error) {
      console.error('Error fetching domain data:', error);
      setDomainData([]);
    } finally {
      setFetchingDomain(false);
    }
  };

  // Fetch domain data when component mounts or user changes
  useEffect(() => {
    if (effectiveUserId) {
      fetchDomainData();
    }
  }, [effectiveUserId]);

  // Fetch domain data when tab changes to domain
  useEffect(() => {
    if (configTab === "domain" && effectiveUserId) {
      fetchDomainData();
    }
  }, [configTab, effectiveUserId]);

  return (
    <div className="login-box gap-down">
      {tab === "Dashboard" && (
        <MailDashboard
          effectiveUserId={effectiveUserId}
          token={token}
          isVisible={tab === "Dashboard"}
          externalData={dashboardData}
          onDataChange={handleDashboardDataChange}
        />
      )}

      {tab === "Configuration" && (
        <MailConfiguration
          configTab={configTab}
          setConfigTab={setConfigTab}
          mailboxSubTab={mailboxSubTab}
          setMailboxSubTab={setMailboxSubTab}
          isDemoAccount={isDemoAccount}
          dispatch={dispatch}
          mailboxSearch={mailboxSearch}
          setMailboxSearch={setMailboxSearch}
          toggleSort={toggleSort}
          smtpSortKey={smtpSortKey}
          setSmtpSortKey={setSmtpSortKey}
          setSmtpSortDirection={setSmtpSortDirection}
          renderSortArrow={renderSortArrow}
          smtpSortDirection={smtpSortDirection}
          currentMailboxes={currentMailboxes}
          mailboxActionsAnchor={mailboxActionsAnchor}
          setMailboxActionsAnchor={setMailboxActionsAnchor}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
          menuBtnStyle={menuBtnStyle}
          actionIconStyle={actionIconStyle}
          currentPageMailbox={currentPageMailbox}
          totalPagesMailbox={totalPagesMailbox}
          filteredMailboxes={filteredMailboxes}
          pageSize={pageSize}
          setCurrentPageMailbox={setCurrentPageMailbox}
          setPageSize={setPageSize}
          inboxSortKey={inboxSortKey}
          setInboxSortKey={setInboxSortKey}
          setInboxSortDirection={setInboxSortDirection}
          inboxSortDirection={inboxSortDirection}
          inboxLoading={inboxLoading}
          currentInboxes={currentInboxes}
          handleEditInbox={handleEditInbox}
          handleDeleteInbox={handleDeleteInbox}
          currentPageInbox={currentPageInbox}
          totalPagesInbox={totalPagesInbox}
          filteredInboxes={filteredInboxes}
          setCurrentPageInbox={setCurrentPageInbox}
          showAddEditMailBoxModal={showAddEditMailBoxModal}
          editingId={editingId}
          form={form}
          setForm={setForm}
          handleChangeSMTP={handleChangeSMTP}
          handleSubmitSMTP={handleSubmitSMTP}
          smtpLoading={smtpLoading}
          setEditingId={setEditingId}
          effectiveUserId={effectiveUserId}
          token={token}
          fetchSmtp={fetchSmtp}
          fetchInboxCredentials={fetchInboxCredentials}
          setToastMessage={setToastMessage}
          setShowSuccessToast={setShowSuccessToast}
          setShowErrorToast={setShowErrorToast}
          showSMTPEditModal={showSMTPEditModal}
          showIMAPEditModal={showIMAPEditModal}
          inboxForm={inboxForm}
          setInboxForm={setInboxForm}
          handleChangeInbox={handleChangeInbox}
          handleSubmitInbox={handleSubmitInbox}
          setEditingInboxId={setEditingInboxId}
          showSmtpOtpModal={showSmtpOtpModal}
          smtpOtpEmail={smtpOtpEmail}
          handleSmtpOtpVerify={handleSmtpOtpVerify}
          smtpOtpVerifying={smtpOtpVerifying}
          setShowSmtpOtpModal={setShowSmtpOtpModal}
          bccLoading={bccLoading}
          handleDeleteBcc={handleDeleteBcc}
          safeBccEmails={safeBccEmails}
          paginatedBccEmails={paginatedBccEmails}
          bccPage={bccPage}
          totalPagesBCC={totalPagesBCC}
          sortedBccEmails={sortedBccEmails}
          setBccPage={setBccPage}
          bccSortKey={bccSortKey}
          setBccSortKey={setBccSortKey}
          bccSortDirection={bccSortDirection}
          setBccSortDirection={setBccSortDirection}
          showBCCEmailModal={showBCCEmailModal}
          handleSave={handleSave}
          newBccEmail={newBccEmail}
          setNewBccEmail={setNewBccEmail}
          fetchingDomain={fetchingDomain}
          sortedDomainData={sortedDomainData}
          domainSortKey={domainSortKey}
          setDomainSortKey={setDomainSortKey}
          setDomainSortDirection={setDomainSortDirection}
          domainSortDirection={domainSortDirection}
          setSelectedDomain={setSelectedDomain}
          handleDomainValidateClick={handleDomainValidateClick}
          handleDomainDeleteClick={handleDomainDeleteClick}
          showOtpModal={showOtpModal}
          setShowOtpModal={setShowOtpModal}
          selectedOtpDomain={selectedOtpDomain}
          appModal={appModal}
          fetchDomainData={fetchDomainData}
          showValidateModal={showValidateModal}
          selectedDomain={selectedDomain}
        />
      )}

      {/* Schedule Tab */}
      {tab === "Schedule" && (
        <ScheduleTab
          effectiveUserId={effectiveUserId}
          token={token}
          isDemoAccount={isDemoAccount}
          setExistingResponse={setexistingResponse}
        />
      )}

      {/* Inbox Tab */}
      {tab === "Inbox" && (
        <InboxView 
          effectiveUserId={effectiveUserId!!} 
          token={token}
          isVisible={tab === "Inbox"}
          initialTab={inboxSubTab}
          onTabChange={onInboxSubTabChange}
          onSelectedInboxUnreadCountsChange={onSelectedInboxUnreadCountsChange}
        />
      )}

      <AppModal
        isOpen={appModal.isOpen}
        onClose={appModal.hideModal}
        {...appModal.config}
      />

      <ToastMessage
        show={showSuccessToast}
        message={toastMessage}
        type="success"
        onClose={() => setShowSuccessToast(false)}
        position="bottom-center"
      />
      <ToastMessage
        show={showErrorToast}
        message={toastMessage}
        type="error"
        onClose={() => setShowErrorToast(false)}
        position="bottom-center"
      />

      {/* Loading Spinners */}
      {smtpLoading && <LoadingSpinner message="Processing..." />}
      {bccLoading && <LoadingSpinner message="Loading..." />}
      {fetchingDomain && <LoadingSpinner message="Loading domain data..." />}
      {deletingDomain && <LoadingSpinner message="Deleting domain..." />}
      {smtpOtpVerifying && <LoadingSpinner message="Verifying OTP..." />}
      {inboxLoading && <LoadingSpinner message="Loading inbox credentials..." />}

      {/* Domain Validation Modals */}
      <DomainAuthModal
        //isOpen={showDomainAuthModal}
        isOpen={showDomainValidation}

        onClose={() => 
          //setShowDomainAuthModal(false)
          dispatch(closePanel())
        }
        selectedDomain={selectedDomain}
        onValidate={(domain) => {
          console.log('Validate Records for:', domain.emailDomain);
          setTimeout(() => fetchDomainData(), 1000);
        }}
        showSuccess={appModal.showSuccess}
        showError={appModal.showError}
        refreshDomainData={() => setTimeout(() => fetchDomainData(), 1000)}
        effectiveUserId={effectiveUserId}
      />

      <ValidateRecordsModal
        //isOpen={showValidatePopup}
        isOpen={showValidateModal}
        onClose={() => {
          //setShowValidatePopup(false);
          dispatch(closePanel());
        }}
        selectedDomain={selectedDomain}
        onValidate={(domain) => {
          console.log('Validate Records for:', domain.emailDomain);
          setTimeout(() => fetchDomainData(), 1000);
        }}
        showSuccess={appModal.showSuccess}
        showError={appModal.showError}
        refreshDomainData={() => setTimeout(() => fetchDomainData(), 1000)}
        effectiveUserId={effectiveUserId}
      />

      <OtpModal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        emailDomain={selectedOtpDomain?.emailDomain || ''}
        onSubmit={async (otp) => {
          try {
            const response = await fetch(
              `${API_BASE_URL}/api/domain-verification/domain-verify-email-otp?Otp=${encodeURIComponent(otp)}&email=${encodeURIComponent(selectedOtpDomain.emailDomain)}&clientId=${effectiveUserId}`,
              {
                method: 'POST',
                headers: {
                  'accept': '*/*'
                },
                body: ''
              }
            );
            
            if (response.ok) {
              //appModal.showSuccess('Email verification successful!');
              setToastMessage("Email verification successful!");
              setShowSuccessToast(true);
              setTimeout(() => setShowSuccessToast(false), 6000);
              fetchDomainData();
            } else {
             // appModal.showError('Invalid verification code. Please try again.');
              setToastMessage("Invalid verification code. Please try again.");
              setShowErrorToast(true);
              setTimeout(() => setShowErrorToast(false), 6000);
            }
          } catch (error) {
            console.error('Error verifying OTP:', error);
            //appModal.showError('Error verifying code. Please check your connection.');
            setToastMessage("Error verifying code. Please check your connection.");
            setShowErrorToast(true);
            setTimeout(() => setShowErrorToast(false), 6000);
          }
        }}
      />
{deletePopupOpen && (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]"
    onClick={() => setDeletePopupOpen(false)}
  >
    <div
      className="bg-white rounded-xl p-6 w-[520px] relative"
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="text-lg font-semibold mb-3 text-gray-900">
        Delete {deletingInboxId ? 'Inbox' : 'SMTP'} configuration
      </h3>

      <p className="text-sm text-gray-600 mb-6">
        Are you sure you want to delete this {deletingInboxId ? 'Inbox' : 'SMTP'} configuration?
      </p>

      <div className="flex justify-end gap-3">
        <button
          onClick={() => {
            setDeletePopupOpen(false);
            setDeletingInboxId(null);
            setSelectedDeleteId(null);
          }}
          className="px-5 py-2 rounded-full bg-black text-white"
        >
          Cancel
        </button>

        <button
          onClick={deletingInboxId ? confirmDeleteInbox : confirmDeleteSmtp}
          className="px-5 py-2 rounded-full bg-red-600 text-white hover:bg-red-700"
        >
          Delete
        </button>
      </div>

      <button
        onClick={() => {
          setDeletePopupOpen(false);
          setDeletingInboxId(null);
          setSelectedDeleteId(null);
        }}
        className="absolute top-4 right-4 text-xl"
      >
        ✕
      </button>
    </div>
  </div>
)}
      {/* Delete Domain Modal */}
      {showDeleteDomainModal && (
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
              padding: "24px",
              borderRadius: "8px",
              width: "400px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 16, color: "#333" }}>Delete Domain</h3>
            <p style={{ marginBottom: 16, color: "#666" }}>
              Are you sure you want to delete this domain? If you delete this domain, all related mailboxes will also be deleted.
            </p>
            <p style={{ marginBottom: 16, color: "#dc3545", fontWeight: "bold" }}>
              Domain: {selectedDeleteDomain?.domain}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                className="button secondary small"
                onClick={() => {
                  setShowDeleteDomainModal(false);
                  setSelectedDeleteDomain(null);
                }}
              >
                Cancel
              </button>
              <button
                className="button small"
                style={{
                  background: "#dc3545",
                  color: "#fff",
                  border: "none",
                }}
                onClick={handleDeleteDomain}
                disabled={deletingDomain}
              >
                {deletingDomain ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mail;
