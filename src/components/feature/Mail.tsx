import { useRef, useCallback, useState, useEffect } from "react";
import Modal from "../common/Modal";
import singleprvIcon from "../../assets/images/SinglePrv.png";
import singlenextIcon from "../../assets/images/SingleNext.png";
import moment from "moment-timezone";
import axios from "axios";
import "./Mail.css";
import API_BASE_URL from "../../config";
import { toast } from "react-toastify";
import ContactsTable from "./ContactsTable";
import { useAppData } from "../../contexts/AppDataContext";
import MailDashboard from "./MailDashboard";
import type { EventItem, EmailLog } from "../../contexts/AppDataContext";
import AppModal from "../common/AppModal";
import { useAppModal } from "../../hooks/useAppModal";
import { useSelector } from "react-redux";
import { RootState } from "../../Redux/store";
import PaginationControls from "./PaginationControls";
import ValidateRecordsModal from "./ValidateRecordsModal";
import OtpModal from "./OtpModal";
import DomainAuthColumn from "./DomainAuthColumn";
import DomainAuthModal from "./DomainAuthModal";

type MailTabType = "Dashboard" | "Configuration" | "Schedule";

interface scheduleFetch {
  id?: number;
  clientId: number;
  title: string;
  bccEmail?: string;
  scheduledDate: string; // Change from Date to string
  scheduledTime: string; // Change from Time to string
  timeZone: string;
  smtpID: number;
  smtpName: string;
  zohoviewName: string;
  zohoViewName: string;
  isSent: boolean;
  testIsSent: boolean;
  dataFileId: number | null;
  segmentId?: number | null;
}

interface SmtpUser {
  id: number;
  username: string;
}
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
  full_name: string;
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
}) => {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [segmentsLoading, setSegmentsLoading] = useState(false);
  const [scheduleCampaigns, setScheduleCampaigns] = useState<any[]>([]);

  const [isCopyText, setIsCopyText] = useState(false);
  const { saveFormState, getFormState, refreshTrigger } = useAppData();
  const [openModals, setOpenModals] = useState<{ [key: string]: boolean }>({});
  const isDemoAccount = sessionStorage.getItem("isDemoAccount") === "true";

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

  const [emailLoading, setEmailLoading] = useState(false); // Loading state for fetching email data

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
  // SMTP View
  const [smtpList, setSmtpList] = useState<SmtpConfig[]>([]);
  const [form, setForm] = useState({
    server: "",
    port: "",
    username: "",
    password: "",
    fromEmail: "",
    senderName: "",
    usessl: false,
  });
  const [editingId, setEditingId] = useState(null);
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [showSmtpOtpModal, setShowSmtpOtpModal] = useState(false);
  const [smtpOtpEmail, setSmtpOtpEmail] = useState("");
  const [smtpOtpVerifying, setSmtpOtpVerifying] = useState(false);
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

      setSmtpList(response.data); // Assuming the API returns a single object
    } catch (error) {
      setSmtpList([]); // No records found or error
    }
  };

  useEffect(() => {
    fetchSmtp();
  }, [effectiveUserId]);

  // Handle Form Change
  const handleChangeSMTP = (e: any) => {
    const { name, value, type, checked } = e.target;
    setForm((prevForm) => ({
      ...prevForm,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Handle Add/Update Submit
  const handleSubmitSMTP = async (e: any) => {
    e.preventDefault();
    setSmtpLoading(true);

    try {
      // Only send test email
      await axios.post(
        `${API_BASE_URL}/api/email/configTestMail?ClientId=${effectiveUserId}`,
        JSON.stringify(form),
        {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (!editingId) {
        // For Add operation, close add modal first then show OTP modal
        handleModalClose("modal-add-mailbox");
        setSmtpOtpEmail(form.fromEmail);
        setShowSmtpOtpModal(true);
      } else {
        // For Edit operation, just show success
        appModal.showSuccess("Test email sent successfully");
        setForm({
          server: "",
          port: "",
          username: "",
          password: "",
          fromEmail: "",
          senderName: "",
          usessl: false,
        });
        setEditingId(null);
        handleModalClose("modal-add-mailbox");
      }
    } catch (err) {
      console.error(err);
      appModal.showError(
        "Failed to send test email. Please check the settings."
      );
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
        appModal.showSuccess('SMTP email verified successfully!');
        setShowSmtpOtpModal(false);
        setForm({
          server: "",
          port: "",
          username: "",
          password: "",
          fromEmail: "",
          senderName: "",
          usessl: false,
        });
        setEditingId(null);
        // Refresh SMTP list instead of page reload
        fetchSmtp();
      } else {
        appModal.showError('Invalid OTP. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying SMTP OTP:', error);
      appModal.showError('Error verifying OTP. Please check your connection.');
    } finally {
      setSmtpOtpVerifying(false);
    }
  };

  // Edit Handler
  const handleEdit = (item: any) => {
    setForm(item);
    setEditingId(item.id);
    handleModalOpen("modal-edit-link-mailbox");
  };

  // Delete Handler (Assuming you create this API in backend)
  const handleDelete = async (id: any) => {
    if (window.confirm("Are you sure to delete this SMTP config?")) {
      try {
        await axios.post(
          `${API_BASE_URL}/api/email/delete-smtp/${id}?ClientId=${effectiveUserId}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );
        fetchSmtp();
      } catch (err) {
        console.error(err);
        appModal.showError("Error deleting SMTP");
      }
    }
  };
  //End SMTP



  //Fetch Zoho View
  const [selectedZohoviewId1, setSelectedZohoviewId1] = useState<string>("");

  const [nextPageToken1, setNextPageToken1] = useState<string | null>(null);
  const [prevPageToken1, setPrevPageToken1] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // Initial loading state for fetching Zoho clients
  const [scheduleDataFiles, setScheduleDataFiles] = useState<
    { id: number; name: string }[]
  >([]);
  const [scheduleDataLoading, setScheduleDataLoading] = useState(false);
  const [selectedScheduleFile, setSelectedScheduleFile] = useState<{
    id: number;
    name: string;
  } | null>(null);

  useEffect(() => {
    const fetchScheduleData = async () => {
      if (tab === "Schedule" && effectiveUserId) {
        setScheduleDataLoading(true);

        try {
          const campaignsResponse = await axios.get(
            `${API_BASE_URL}/api/auth/campaigns/client/${effectiveUserId}`,
            {
              headers: {
                accept: '*/*',
                ...(token && { Authorization: `Bearer ${token}` }),
              },
            }
          );
          console.log('Campaigns response:', campaignsResponse.data);
          setScheduleCampaigns(campaignsResponse.data || []);
        } catch (error) {
          console.error("Error fetching campaigns:", error);
          setScheduleCampaigns([]);
        } finally {
          setScheduleDataLoading(false);
        }
      }
    };

    fetchScheduleData();
  }, [tab, effectiveUserId, token]);
  // Add this useEffect after your existing useEffects

  useEffect(() => {
    setSelectedZohoviewId1("");
    setScheduleCampaigns([]);
  }, [effectiveUserId]);

  const handleZohoModelChange1 = async (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const selectedValue = event.target.value;
    setSelectedZohoviewId1(selectedValue);

    if (selectedValue) {
      const [type, id] = selectedValue.split("-");

      if (type === "campaign") {
        const selectedCampaign = scheduleCampaigns.find(
          (campaign) => campaign.id.toString() === id
        );
        setSelectedScheduleFile({
          id: selectedCampaign?.id || 0,
          name: selectedCampaign?.campaignName || "",
        });
      }

      try {
        await fetchAndDisplayEmailBodies1(id);
      } catch (error) {
        console.error("Error fetching email bodies:", error);
      }
    }
  };

  const fetchAndDisplayEmailBodies1 = useCallback(
    async (
      zohoviewId: string,
      pageToken: string | null = null,
      direction: "next" | "previous" | null = null
    ) => {
      try {
        setEmailLoading(true);
        let url = `${API_BASE_URL}/api/auth/pitchgenData/${zohoviewId}?ClientId=${effectiveUserId}`;
        if (pageToken) {
          url += `&pageToken=${encodeURIComponent(pageToken)}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch email bodies");
        }

        const fetchedEmailData = await response.json();
        if (!Array.isArray(fetchedEmailData.data)) {
          console.error("Invalid data format");
          return;
        }

        const emailResponses = fetchedEmailData.data.map(
          (entry: EmailEntry) => ({
            id: entry.id,
            name: entry.full_Name || "N/A",
            title: entry.job_Title || "N/A",
            company: entry.account_name_friendlySingle_Line_12 || "N/A",
            location: entry.mailing_Country || "N/A",
            website: entry.website || "N/A",
            linkedin: entry.linkedIn_URL || "N/A",
            pitch: entry.sample_email_body || "No email body found",
            timestamp: new Date().toISOString(),
            nextPageToken: fetchedEmailData.nextPageToken,
            prevPageToken: fetchedEmailData.previousPageToken,
            generated: false,
          })
        );

        if (direction === "next") {
          setexistingResponse((prevResponses) => [
            ...prevResponses,
            ...emailResponses,
          ]);
        } else if (direction === "previous") {
          setexistingResponse((prevResponses) => [
            ...emailResponses,
            ...prevResponses,
          ]);
        } else {
          setexistingResponse(emailResponses);
        }

        setNextPageToken1(fetchedEmailData.nextPageToken || null);
        setPrevPageToken1(fetchedEmailData.previousPageToken || null);
      } catch (error) {
        console.error("Error fetching email bodies:", error);
      } finally {
        setEmailLoading(false);
      }
    },
    [effectiveUserId]
  );
  //End Fetch Zoho View

  const [formData, setFormData] = useState({
    title: "",
    timeZone: "",
    scheduledDate: "", // <--- add this
    scheduledTime: "", // <--- and this
    EmailDeliver: "",
    bccEmail: "",
    smtpID: "",
  });
  const [isFollowUp, setIsFollowUp] = useState(false);

  const [steps, setSteps] = useState([{ datetime: new Date() }]);

  const [response, setResponse] = useState(null);
  const [bccError, setBccError] = useState("");
  // Handle Title / TimeZone change
  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setSelectedOption(e.target.value);
    setFormData({ ...formData, [name]: value });

    const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (value && !pattern.test(value.trim())) {
      setBccError("Please enter a valid email address.");
    } else {
      setBccError("");
    }
  };

  // Handle step datetime change
  const handleStepChange = (index: any, value: any) => {
    const newSteps = [...steps];
    newSteps[index].datetime = value;
    setSteps(newSteps);
  };

  // Add new step
  const addStep = () => {
    setSteps([...steps, { datetime: new Date() }]);
  };
  const [selectedOption, setSelectedOption] = useState("");

  // Remove step
  const removeStep = (index: any) => {
    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(newSteps);
  };
  // Submit form
  const handleSubmit = async (e: any) => {
    e.preventDefault();

    const selectedTimeZone = formData.timeZone;
    const deliveryOption = formData.EmailDeliver;

    let deliverMoment = moment().tz(selectedTimeZone);

    switch (deliveryOption) {
      case "0":
        break;
      case "1h":
        deliverMoment.add(1, "hours");
        break;
      case "2h":
        deliverMoment.add(2, "hours");
        break;
      case "24h":
        deliverMoment.add(24, "hours");
        break;
      case "7d":
        deliverMoment.add(7, "days");
        break;
      case "30d":
        deliverMoment.add(30, "days");
        break;
      case "custom":
        break;
      default:
        break;
    }

    const utcMoment = deliverMoment.clone().utc();

    let stepsPayload = [
      {
        scheduledDate: utcMoment.format("YYYY-MM-DD"),
        scheduledTime: utcMoment.format("HH:mm:ss"),
      },
    ];

    if (formData.EmailDeliver === "custom") {
      stepsPayload = steps.map((step) => {
        const localMoment = moment(step.datetime).tz(selectedTimeZone);
        const utcMoment = localMoment.clone().utc();

        return {
          scheduledDate: utcMoment.format("YYYY-MM-DD"),
          scheduledTime: utcMoment.format("HH:mm:ss"),
        };
      });
    }

    const [type, id] = selectedZohoviewId1.split("-");
    let selectedName = "";
    let dataFileId: number | null = null;
    let segmentId: number | null = null;

    if (type === "campaign") {
      const selectedCampaign = scheduleCampaigns.find(
        (campaign) => campaign.id.toString() === id
      );
      selectedName = selectedCampaign?.campaignName || "";
      
      if (selectedCampaign?.dataSource === "DataFile") {
        dataFileId = parseInt(selectedCampaign.zohoViewId) || null;
        segmentId = null;
      } else if (selectedCampaign?.dataSource === "Segment") {
        segmentId = selectedCampaign.segmentId || null;
        dataFileId = null;
      }
    }

    const payload = {
      title: formData.title,
      zohoviewName: selectedName,
      timeZone: formData.timeZone,
      steps: stepsPayload,
      smtpID: parseInt(selectedUser) || 0,
      bccEmail: formData.bccEmail,
      dataFileId: dataFileId,
      segmentId: segmentId,
      testIsSent: false,
      isFollowUp: isFollowUp,
    };

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/email/create-sequence?ClientId=${effectiveUserId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      setResponse(data);
      if (response.ok) {
        toast.success(data.message);
        alert(data.message);
        setFormData({
          title: "",
          timeZone: "",
          scheduledDate: "",
          scheduledTime: "",
          EmailDeliver: "",
          bccEmail: "",
          smtpID: "",
        });
        setIsFollowUp(false);
        setSelectedZohoviewId1(""); // Clear selection
        setSelectedUser(""); // Clear SMTP selection
      } else {
        console.error("Server responded with an error:", data);
        toast.error(data.message || "Something went wrong");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to create schedule");
    }
  };

  const [smtpUsers, setSmtpUsers] = useState<SmtpUser[]>([]);
  const [selectedUser, setSelectedUser] = useState("");

  useEffect(() => {
    const fetchSmtpUsers = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/email/get-SMTPUser?ClientId=${effectiveUserId}`,
          {
            headers: {
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );
        //setSmtpUsers(response.data);
        setSmtpUsers(response.data?.data || []);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error("Axios error:", error);
          //alert(error.response?.data?.message || error.message);
        } else {
          console.error("Unknown error:", error);
          appModal.showError("An unexpected error occurred.");
        }
      }
    };

    fetchSmtpUsers();
  }, [effectiveUserId]);

  const handleChangeSmtpUsers = (e: any) => {
    setSelectedUser(e.target.value);
  };
  const isFormValid = (formData.title || "").trim() !== "";

  const [scheduleList, setScheduleList] = useState<scheduleFetch[]>([]);
  // const [editingId, setEditingId] = useState(null);
  const fetchSchedule = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/email/get-sequence?ClientId=${effectiveUserId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      setScheduleList(response.data);
    } catch (error) {
      setScheduleList([]); // No records found or error
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [effectiveUserId]);

  const requestBody = {
    title: "string", // Replace with your actual title
    zohoviewName: "", // Get the name from selected file
    testIsSent: true, // Your actual value
    smtpID: 0, // Your actual SMTP ID
    timeZone: "string", // Your actual timezone
    bccEmail: "string", // Your actual BCC email
    steps: [
      {
        scheduledDate: "2025-07-22T09:15:13.332Z", // Your actual date
        scheduledTime: {
          ticks: 0, // Your actual time
        },
      },
    ],
    dataFileId: parseInt(selectedZohoviewId1) || 0, // Convert string to number
  };

  // Handle Add/Update Submit
  const handleSubmitSchedule = async (e: any) => {
    e.preventDefault();

    const selectedTimeZone = formData.timeZone;
    const scheduledDate = formData.scheduledDate;
    const scheduledTime = formData.scheduledTime;

    if (!scheduledDate || !scheduledTime) {
      appModal.showError("Please select both scheduled date and time.");
      return;
    }

    // Find the IANA timezone from the selected Windows timezone
    const selectedTz = timezoneOptions.find(
      (tz) => tz.value === selectedTimeZone
    );
    const ianaTimezone = selectedTz?.iana || "UTC";

    // Create moment object with the local time in the selected timezone
    const localMoment = moment.tz(
      `${scheduledDate}T${scheduledTime}`,
      ianaTimezone
    );

    // Convert to UTC
    const utcMoment = localMoment.clone().utc();

    const stepsPayload = [
      {
        scheduledDate: utcMoment.format("YYYY-MM-DD"),
        scheduledTime: utcMoment.format("HH:mm:ss"),
      },
    ];

    const [type, id] = selectedZohoviewId1.split("-");
    let selectedName = "";
    let dataFileId: number | null = null;
    let segmentId: number | null = null;

    if (type === "campaign") {
      const selectedCampaign = scheduleCampaigns.find(
        (campaign) => campaign.id.toString() === id
      );
      selectedName = selectedCampaign?.campaignName || "";
      
      if (selectedCampaign?.dataSource === "DataFile") {
        dataFileId = parseInt(selectedCampaign.zohoViewId) || null;
        segmentId = null;
      } else if (selectedCampaign?.dataSource === "Segment") {
        segmentId = selectedCampaign.segmentId || null;
        dataFileId = null;
      }
    }

    const payload = {
      title: formData.title,
      zohoviewName: selectedName,
      timeZone: formData.timeZone,
      steps: stepsPayload,
      smtpID: parseInt(selectedUser) || 0,
      bccEmail: formData.bccEmail,
      dataFileId: dataFileId,
      segmentId: segmentId,
      testIsSent: false,
      isFollowUp: isFollowUp,
    };

    try {
      if (editingId) {
        await axios.post(
          `${API_BASE_URL}/api/email/update-sequence/${editingId}?ClientId=${effectiveUserId}`,
          payload,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );
        appModal.showSuccess("Schedule updated successfully");
      } else {
        await axios.post(
          `${API_BASE_URL}/api/email/create-sequence?ClientId=${effectiveUserId}`,
          payload,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );
        appModal.showSuccess("Schedule added successfully");
      }

      setFormData({
        title: "",
        timeZone: "",
        scheduledDate: "",
        scheduledTime: "",
        EmailDeliver: "",
        bccEmail: "",
        smtpID: "",
      });
      setIsFollowUp(false);
      setEditingId(null);
      setSelectedZohoviewId1("");
      setSelectedUser("");
      setShowScheduleModal(false);
      fetchSchedule();
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        appModal.showError(
          `Failed to schedule mail: ${err.response?.data?.message || err.message
          }`
        );
      } else {
        appModal.showError(
          "Failed to schedule mail. Please check the details."
        );
      }
    }
  };
  const handleEditSchedule = (item: any) => {
    setFormData({
      title: item.title || "",
      timeZone: item.timeZone || item.TimeZone || "",
      scheduledDate:
        (item.scheduledDate && item.scheduledDate.slice(0, 10)) ||
        (item.ScheduledDate && item.ScheduledDate.slice(0, 10)) ||
        (item.steps && item.steps[0]?.ScheduledDate) ||
        "",
      scheduledTime:
        item.scheduledTime ||
        item.ScheduledTime ||
        (item.steps && item.steps[0]?.ScheduledTime) ||
        "",
      EmailDeliver: item.EmailDeliver || "",
      bccEmail: item.bccEmail || "",
      smtpID: item.smtpID || "",
    });
    setEditingId(item.id);

    const matchingCampaign = scheduleCampaigns.find(campaign => {
      if (item.segmentId && item.segmentId > 0) {
        return campaign.segmentId === item.segmentId;
      } else if (item.dataFileId && item.dataFileId > 0) {
        return campaign.zohoViewId === item.dataFileId.toString();
      }
      return false;
    });

    if (matchingCampaign) {
      setSelectedZohoviewId1(`campaign-${matchingCampaign.id}`);
    }

    setSelectedUser(item.smtpID);
    setShowScheduleModal(true);
  };

  // Delete Handler (Assuming you create this API in backend)
  const handleDeleteSchedule = async (id: any) => {
   
      try {
        await axios.post(
          `${API_BASE_URL}/api/email/delete-sequence/${id}?ClientId=${effectiveUserId}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );
        fetchSchedule();
      } catch (err) {
        console.error(err);
        appModal.showError("Error deleting SMTP");
      }
   
  };

  // Email device width
  const [outputEmailWidth, setOutputEmailWidth] = useState<string>("");

  const toggleOutputEmailWidth = (deviceName: string) => {
    setOutputEmailWidth(deviceName);
  };

  //const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Calculate total pages
  const totalPages = Math.ceil(scheduleList.length / rowsPerPage);

  // Calculate the current page data
  const indexOfLastItem = currentPage * rowsPerPage;
  const indexOfFirstItem = indexOfLastItem - rowsPerPage;
  const currentData = scheduleList.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
  };

  // BCC Email Management states
  const [bccEmails, setBccEmails] = useState<BccEmail[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [newBccEmail, setNewBccEmail] = useState<string>("");
  const [bccLoading, setBccLoading] = useState(false);
  const [configTab, setConfigTab] = useState("mailboxes");


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
        setBccEmails(data);
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
    setShowPopup(false);
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
      setBccEmails(await updated.json());
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
  const [scheduleSearch, setScheduleSearch] = useState("");
  const [mailboxActionsAnchor, setMailboxActionsAnchor] = useState<
    string | null
  >(null);
  const [scheduleActionsAnchor, setScheduleActionsAnchor] = useState<
    string | null
  >(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  useEffect(() => {
    const fetchScheduleDataForModal = async () => {
      if (showScheduleModal && effectiveUserId && scheduleCampaigns.length === 0) {
        setScheduleDataLoading(true);

        try {
          const campaignsResponse = await axios.get(
            `${API_BASE_URL}/api/auth/campaigns/client/${effectiveUserId}`,
            {
              headers: {
                accept: '*/*',
                ...(token && { Authorization: `Bearer ${token}` }),
              },
            }
          );
          console.log('Modal - Campaigns response:', campaignsResponse.data);
          setScheduleCampaigns(campaignsResponse.data || []);
        } catch (error) {
          console.error('Modal - Error fetching campaigns:', error);
          setScheduleCampaigns([]);
        } finally {
          setScheduleDataLoading(false);
        }
      }
    };

    fetchScheduleDataForModal();
  }, [showScheduleModal, effectiveUserId, token, scheduleCampaigns.length]);

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

  // For Mail component - add these useEffects
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isActionsButton = target.closest(".segment-actions-btn");
      const isActionsMenu = target.closest(".segment-actions-menu");

      if (!isActionsButton && !isActionsMenu) {
        setMailboxActionsAnchor(null);
        setScheduleActionsAnchor(null);
      }
    };

    if (mailboxActionsAnchor || scheduleActionsAnchor) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [mailboxActionsAnchor, scheduleActionsAnchor]);





  //Schedule Tab js code
  // Update your timezoneOptions array with IANA timezone mappings
  const timezoneOptions = [
    // Americas
    { value: "Dateline Standard Time", label: "(UTC-12:00) International Date Line West", iana: "Etc/GMT+12" },
    { value: "UTC-11", label: "(UTC-11:00) Coordinated Universal Time-11", iana: "Etc/GMT+11" },
    { value: "Aleutian Standard Time", label: "(UTC-10:00) Aleutian Islands", iana: "America/Adak" },
    { value: "Hawaiian Standard Time", label: "(UTC-10:00) Hawaii", iana: "Pacific/Honolulu" },

    // UTC-09:30 to UTC-09:00
    { value: "Marquesas Standard Time", label: "(UTC-09:30) Marquesas Islands", iana: "Pacific/Marquesas" },
    { value: "Alaskan Standard Time", label: "(UTC-09:00) Alaska", iana: "America/Anchorage" },
    { value: "UTC-09", label: "(UTC-09:00) Coordinated Universal Time-09", iana: "Etc/GMT+9" },

    // UTC-08:00
    { value: "Pacific Standard Time (Mexico)", label: "(UTC-08:00) Baja California", iana: "America/Tijuana" },
    { value: "UTC-08", label: "(UTC-08:00) Coordinated Universal Time-08", iana: "Etc/GMT+8" },
    { value: "Pacific Standard Time", label: "(UTC-08:00) Pacific Time (US & Canada)", iana: "America/Los_Angeles" },

    // UTC-07:00
    { value: "US Mountain Standard Time", label: "(UTC-07:00) Arizona", iana: "America/Phoenix" },
    { value: "Mountain Standard Time (Mexico)", label: "(UTC-07:00) La Paz, Mazatlan", iana: "America/Mazatlan" },
    { value: "Mountain Standard Time", label: "(UTC-07:00) Mountain Time (US & Canada)", iana: "America/Denver" },
    { value: "Yukon Standard Time", label: "(UTC-07:00) Yukon", iana: "America/Whitehorse" },

    // UTC-06:00
    { value: "Central America Standard Time", label: "(UTC-06:00) Central America", iana: "America/Guatemala" },
    { value: "Central Standard Time", label: "(UTC-06:00) Central Time (US & Canada)", iana: "America/Chicago" },
    { value: "Easter Island Standard Time", label: "(UTC-06:00) Easter Island", iana: "Pacific/Easter" },
    { value: "Central Standard Time (Mexico)", label: "(UTC-06:00) Guadalajara, Mexico City, Monterrey", iana: "America/Mexico_City" },
    { value: "Canada Central Standard Time", label: "(UTC-06:00) Saskatchewan", iana: "America/Regina" },

    // UTC-05:00
    { value: "SA Pacific Standard Time", label: "(UTC-05:00) Bogota, Lima, Quito, Rio Branco", iana: "America/Bogota" },
    { value: "Eastern Standard Time (Mexico)", label: "(UTC-05:00) Chetumal", iana: "America/Cancun" },
    { value: "Eastern Standard Time", label: "(UTC-05:00) Eastern Time (US & Canada)", iana: "America/New_York" },
    { value: "Haiti Standard Time", label: "(UTC-05:00) Haiti", iana: "America/Port-au-Prince" },
    { value: "Cuba Standard Time", label: "(UTC-05:00) Havana", iana: "America/Havana" },
    { value: "US Eastern Standard Time", label: "(UTC-05:00) Indiana (East)", iana: "America/Indianapolis" },
    { value: "Turks And Caicos Standard Time", label: "(UTC-05:00) Turks and Caicos", iana: "America/Grand_Turk" },

    // UTC-04:00
    { value: "Paraguay Standard Time", label: "(UTC-04:00) Asuncion", iana: "America/Asuncion" },
    { value: "Atlantic Standard Time", label: "(UTC-04:00) Atlantic Time (Canada)", iana: "America/Halifax" },
    { value: "Venezuela Standard Time", label: "(UTC-04:00) Caracas", iana: "America/Caracas" },
    { value: "Central Brazilian Standard Time", label: "(UTC-04:00) Cuiaba", iana: "America/Cuiaba" },
    { value: "SA Western Standard Time", label: "(UTC-04:00) Georgetown, La Paz, Manaus, San Juan", iana: "America/La_Paz" },
    { value: "Pacific SA Standard Time", label: "(UTC-04:00) Santiago", iana: "America/Santiago" },

    // UTC-03:30
    { value: "Newfoundland Standard Time", label: "(UTC-03:30) Newfoundland", iana: "America/St_Johns" },

    // UTC-03:00
    { value: "Tocantins Standard Time", label: "(UTC-03:00) Araguaina", iana: "America/Araguaina" },
    { value: "E. South America Standard Time", label: "(UTC-03:00) Brasilia", iana: "America/Sao_Paulo" },
    { value: "SA Eastern Standard Time", label: "(UTC-03:00) Cayenne, Fortaleza", iana: "America/Cayenne" },
    { value: "Argentina Standard Time", label: "(UTC-03:00) City of Buenos Aires", iana: "America/Buenos_Aires" },
    { value: "Montevideo Standard Time", label: "(UTC-03:00) Montevideo", iana: "America/Montevideo" },
    { value: "Magallanes Standard Time", label: "(UTC-03:00) Punta Arenas", iana: "America/Punta_Arenas" },
    { value: "Saint Pierre Standard Time", label: "(UTC-03:00) Saint Pierre and Miquelon", iana: "America/Miquelon" },
    { value: "Bahia Standard Time", label: "(UTC-03:00) Salvador", iana: "America/Bahia" },

    // UTC-02:00
    { value: "UTC-02", label: "(UTC-02:00) Coordinated Universal Time-02", iana: "Etc/GMT+2" },
    { value: "Greenland Standard Time", label: "(UTC-02:00) Greenland", iana: "America/Godthab" },
    { value: "Mid-Atlantic Standard Time", label: "(UTC-02:00) Mid-Atlantic - Old", iana: "Etc/GMT+2" },

    // UTC-01:00
    { value: "Azores Standard Time", label: "(UTC-01:00) Azores", iana: "Atlantic/Azores" },
    { value: "Cape Verde Standard Time", label: "(UTC-01:00) Cabo Verde Is.", iana: "Atlantic/Cape_Verde" },

    // UTC+00:00
    { value: "UTC", label: "(UTC) Coordinated Universal Time", iana: "Etc/UTC" },
    { value: "GMT Standard Time", label: "(UTC+00:00) Dublin, Edinburgh, Lisbon, London", iana: "Europe/London" },
    { value: "Greenwich Standard Time", label: "(UTC+00:00) Monrovia, Reykjavik", iana: "Atlantic/Reykjavik" },
    { value: "Sao Tome Standard Time", label: "(UTC+00:00) Sao Tome", iana: "Africa/Sao_Tome" },

    // UTC+01:00
    { value: "Morocco Standard Time", label: "(UTC+01:00) Casablanca", iana: "Africa/Casablanca" },
    { value: "W. Europe Standard Time", label: "(UTC+01:00) Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna", iana: "Europe/Berlin" },
    { value: "Central Europe Standard Time", label: "(UTC+01:00) Belgrade, Bratislava, Budapest, Ljubljana, Prague", iana: "Europe/Budapest" },
    { value: "Romance Standard Time", label: "(UTC+01:00) Brussels, Copenhagen, Madrid, Paris", iana: "Europe/Paris" },
    { value: "Central European Standard Time", label: "(UTC+01:00) Sarajevo, Skopje, Warsaw, Zagreb", iana: "Europe/Warsaw" },
    { value: "W. Central Africa Standard Time", label: "(UTC+01:00) West Central Africa", iana: "Africa/Lagos" },

    // UTC+02:00
    { value: "GTB Standard Time", label: "(UTC+02:00) Athens, Bucharest", iana: "Europe/Bucharest" },
    { value: "Middle East Standard Time", label: "(UTC+02:00) Beirut", iana: "Asia/Beirut" },
    { value: "Egypt Standard Time", label: "(UTC+02:00) Cairo", iana: "Africa/Cairo" },
    { value: "E. Europe Standard Time", label: "(UTC+02:00) Chisinau", iana: "Europe/Chisinau" },
    { value: "West Bank Standard Time", label: "(UTC+02:00) Gaza, Hebron", iana: "Asia/Gaza" },
    { value: "South Africa Standard Time", label: "(UTC+02:00) Harare, Pretoria", iana: "Africa/Johannesburg" },
    { value: "FLE Standard Time", label: "(UTC+02:00) Helsinki, Kyiv, Riga, Sofia, Tallinn, Vilnius", iana: "Europe/Kiev" },
    { value: "Israel Standard Time", label: "(UTC+02:00) Jerusalem", iana: "Asia/Jerusalem" },
    { value: "South Sudan Standard Time", label: "(UTC+02:00) Juba", iana: "Africa/Juba" },
    { value: "Kaliningrad Standard Time", label: "(UTC+02:00) Kaliningrad", iana: "Europe/Kaliningrad" },
    { value: "Sudan Standard Time", label: "(UTC+02:00) Khartoum", iana: "Africa/Khartoum" },
    { value: "Libya Standard Time", label: "(UTC+02:00) Tripoli", iana: "Africa/Tripoli" },
    { value: "Namibia Standard Time", label: "(UTC+02:00) Windhoek", iana: "Africa/Windhoek" },

    // UTC+03:00
    { value: "Jordan Standard Time", label: "(UTC+03:00) Amman", iana: "Asia/Amman" },
    { value: "Arabic Standard Time", label: "(UTC+03:00) Baghdad", iana: "Asia/Baghdad" },
    { value: "Syria Standard Time", label: "(UTC+03:00) Damascus", iana: "Asia/Damascus" },
    { value: "Turkey Standard Time", label: "(UTC+03:00) Istanbul", iana: "Europe/Istanbul" },
    { value: "Arab Standard Time", label: "(UTC+03:00) Kuwait, Riyadh", iana: "Asia/Riyadh" },
    { value: "Belarus Standard Time", label: "(UTC+03:00) Minsk", iana: "Europe/Minsk" },
    { value: "Russian Standard Time", label: "(UTC+03:00) Moscow, St. Petersburg", iana: "Europe/Moscow" },
    { value: "E. Africa Standard Time", label: "(UTC+03:00) Nairobi", iana: "Africa/Nairobi" },
    { value: "Volgograd Standard Time", label: "(UTC+03:00) Volgograd", iana: "Europe/Volgograd" },

    // UTC+03:30
    { value: "Iran Standard Time", label: "(UTC+03:30) Tehran", iana: "Asia/Tehran" },

    // UTC+04:00
    { value: "Arabian Standard Time", label: "(UTC+04:00) Abu Dhabi, Muscat", iana: "Asia/Dubai" },
    { value: "Astrakhan Standard Time", label: "(UTC+04:00) Astrakhan, Ulyanovsk", iana: "Europe/Astrakhan" },
    { value: "Azerbaijan Standard Time", label: "(UTC+04:00) Baku", iana: "Asia/Baku" },
    { value: "Russia Time Zone 3", label: "(UTC+04:00) Izhevsk, Samara", iana: "Europe/Samara" },
    { value: "Mauritius Standard Time", label: "(UTC+04:00) Port Louis", iana: "Indian/Mauritius" },
    { value: "Saratov Standard Time", label: "(UTC+04:00) Saratov", iana: "Europe/Saratov" },
    { value: "Georgian Standard Time", label: "(UTC+04:00) Tbilisi", iana: "Asia/Tbilisi" },
    { value: "Caucasus Standard Time", label: "(UTC+04:00) Yerevan", iana: "Asia/Yerevan" },

    // UTC+04:30
    { value: "Afghanistan Standard Time", label: "(UTC+04:30) Kabul", iana: "Asia/Kabul" },

    // UTC+05:00
    { value: "West Asia Standard Time", label: "(UTC+05:00) Ashgabat, Tashkent", iana: "Asia/Tashkent" },
    { value: "Ekaterinburg Standard Time", label: "(UTC+05:00) Ekaterinburg", iana: "Asia/Yekaterinburg" },
    { value: "Pakistan Standard Time", label: "(UTC+05:00) Islamabad, Karachi", iana: "Asia/Karachi" },
    { value: "Qyzylorda Standard Time", label: "(UTC+05:00) Qyzylorda", iana: "Asia/Qyzylorda" },

    // UTC+05:30
    { value: "India Standard Time", label: "(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi", iana: "Asia/Kolkata" },
    { value: "Sri Lanka Standard Time", label: "(UTC+05:30) Sri Jayawardenepura", iana: "Asia/Colombo" },

    // UTC+05:45
    { value: "Nepal Standard Time", label: "(UTC+05:45) Kathmandu", iana: "Asia/Kathmandu" },

    // UTC+06:00
    { value: "Central Asia Standard Time", label: "(UTC+06:00) Astana", iana: "Asia/Almaty" },
    { value: "Bangladesh Standard Time", label: "(UTC+06:00) Dhaka", iana: "Asia/Dhaka" },
    { value: "Omsk Standard Time", label: "(UTC+06:00) Omsk", iana: "Asia/Omsk" },

    // UTC+06:30
    { value: "Myanmar Standard Time", label: "(UTC+06:30) Yangon (Rangoon)", iana: "Asia/Yangon" },

    // UTC+07:00
    { value: "SE Asia Standard Time", label: "(UTC+07:00) Bangkok, Hanoi, Jakarta", iana: "Asia/Bangkok" },
    { value: "Altai Standard Time", label: "(UTC+07:00) Barnaul, Gorno-Altaysk", iana: "Asia/Barnaul" },
    { value: "W. Mongolia Standard Time", label: "(UTC+07:00) Hovd", iana: "Asia/Hovd" },
    { value: "North Asia Standard Time", label: "(UTC+07:00) Krasnoyarsk", iana: "Asia/Krasnoyarsk" },
    { value: "N. Central Asia Standard Time", label: "(UTC+07:00) Novosibirsk", iana: "Asia/Novosibirsk" },
    { value: "Tomsk Standard Time", label: "(UTC+07:00) Tomsk", iana: "Asia/Tomsk" },

    // UTC+08:00
    { value: "China Standard Time", label: "(UTC+08:00) Beijing, Chongqing, Hong Kong, Urumqi", iana: "Asia/Shanghai" },
    { value: "North Asia East Standard Time", label: "(UTC+08:00) Irkutsk", iana: "Asia/Irkutsk" },
    { value: "Singapore Standard Time", label: "(UTC+08:00) Kuala Lumpur, Singapore", iana: "Asia/Singapore" },
    { value: "W. Australia Standard Time", label: "(UTC+08:00) Perth", iana: "Australia/Perth" },
    { value: "Taipei Standard Time", label: "(UTC+08:00) Taipei", iana: "Asia/Taipei" },
    { value: "Ulaanbaatar Standard Time", label: "(UTC+08:00) Ulaanbaatar", iana: "Asia/Ulaanbaatar" },

    // UTC+08:45
    { value: "Aus Central W. Standard Time", label: "(UTC+08:45) Eucla", iana: "Australia/Eucla" },

    // UTC+09:00
    { value: "Transbaikal Standard Time", label: "(UTC+09:00) Chita", iana: "Asia/Chita" },
    { value: "Tokyo Standard Time", label: "(UTC+09:00) Osaka, Sapporo, Tokyo", iana: "Asia/Tokyo" },
    { value: "North Korea Standard Time", label: "(UTC+09:00) Pyongyang", iana: "Asia/Pyongyang" },
    { value: "Korea Standard Time", label: "(UTC+09:00) Seoul", iana: "Asia/Seoul" },
    { value: "Yakutsk Standard Time", label: "(UTC+09:00) Yakutsk", iana: "Asia/Yakutsk" },

    // UTC+09:30
    { value: "Cen. Australia Standard Time", label: "(UTC+09:30) Adelaide", iana: "Australia/Adelaide" },
    { value: "AUS Central Standard Time", label: "(UTC+09:30) Darwin", iana: "Australia/Darwin" },

    // UTC+10:00
    { value: "E. Australia Standard Time", label: "(UTC+10:00) Brisbane", iana: "Australia/Brisbane" },
    { value: "AUS Eastern Standard Time", label: "(UTC+10:00) Canberra, Melbourne, Sydney", iana: "Australia/Sydney" },
    { value: "West Pacific Standard Time", label: "(UTC+10:00) Guam, Port Moresby", iana: "Pacific/Port_Moresby" },
    { value: "Tasmania Standard Time", label: "(UTC+10:00) Hobart", iana: "Australia/Hobart" },
    { value: "Vladivostok Standard Time", label: "(UTC+10:00) Vladivostok", iana: "Asia/Vladivostok" },

    // UTC+10:30
    { value: "Lord Howe Standard Time", label: "(UTC+10:30) Lord Howe Island", iana: "Australia/Lord_Howe" },

    // UTC+11:00
    { value: "Bougainville Standard Time", label: "(UTC+11:00) Bougainville Island", iana: "Pacific/Bougainville" },
    { value: "Russia Time Zone 10", label: "(UTC+11:00) Chokurdakh", iana: "Asia/Srednekolymsk" },
    { value: "Magadan Standard Time", label: "(UTC+11:00) Magadan", iana: "Asia/Magadan" },
    { value: "Norfolk Standard Time", label: "(UTC+11:00) Norfolk Island", iana: "Pacific/Norfolk" },
    { value: "Sakhalin Standard Time", label: "(UTC+11:00) Sakhalin", iana: "Asia/Sakhalin" },
    { value: "Central Pacific Standard Time", label: "(UTC+11:00) Solomon Is., New Caledonia", iana: "Pacific/Guadalcanal" },

    // UTC+12:00
    { value: "Russia Time Zone 11", label: "(UTC+12:00) Anadyr, Petropavlovsk-Kamchatsky", iana: "Asia/Kamchatka" },
    { value: "New Zealand Standard Time", label: "(UTC+12:00) Auckland, Wellington", iana: "Pacific/Auckland" },
    { value: "UTC+12", label: "(UTC+12:00) Coordinated Universal Time+12", iana: "Etc/GMT-12" },
    { value: "Fiji Standard Time", label: "(UTC+12:00) Fiji", iana: "Pacific/Fiji" },

    // UTC+12:45
    { value: "Chatham Islands Standard Time", label: "(UTC+12:45) Chatham Islands", iana: "Pacific/Chatham" },

    // UTC+13:00
    { value: "UTC+13", label: "(UTC+13:00) Coordinated Universal Time+13", iana: "Etc/GMT-13" },
    { value: "Tonga Standard Time", label: "(UTC+13:00) Nuku'alofa", iana: "Pacific/Tongatapu" },
    { value: "Samoa Standard Time", label: "(UTC+13:00) Samoa", iana: "Pacific/Apia" },

    // UTC+14:00
    { value: "Line Islands Standard Time", label: "(UTC+14:00) Kiritimati Island", iana: "Pacific/Kiritimati" }
  ];
  //pagination for mail box
  //const pageSize = 10; // items per page
  const [pageSize, setPageSize] = useState(10);

  const [currentPageMailbox, setCurrentPageMailbox] = useState(1);

  const filteredMailboxes = smtpList.filter(
    (item) =>
      item.server?.toLowerCase().includes(mailboxSearch.toLowerCase()) ||
      item.username?.toLowerCase().includes(mailboxSearch.toLowerCase())
  );

  const totalPagesMailbox = Math.ceil(filteredMailboxes.length / pageSize);

  const startIndex = (currentPageMailbox - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const currentMailboxes = filteredMailboxes.slice(startIndex, endIndex);
  //pagination for bcc
  const [bccPage, setBccPage] = useState(1);
  const bccPageSize = 10;
  const totalPagesBCC = Math.ceil(bccEmails.length / bccPageSize);

  const paginatedBccEmails = bccEmails.slice(
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

  // Handle domain validation click
  const handleDomainValidateClick = (domain: any) => {
    setSelectedDomain(domain);
    setShowDomainAuthModal(true);
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
        <>
          {/* --- SUB TABS --- */}
          <div className="config-tab-container" style={{ display: "flex", gap: "20px", marginBottom: "20px",marginTop:"-68px" }}>
            <button
              onClick={() => setConfigTab("mailboxes")}
              className={configTab === "mailboxes" ? "active-config-tab" : "config-tab"}
            >
              Mailboxes
            </button>

            <button
              onClick={() => setConfigTab("bcc")}
              className={configTab === "bcc" ? "active-config-tab" : "config-tab"}
            >
              BCC email management
            </button>

            <button
              onClick={() => setConfigTab("domain")}
              className={configTab === "domain" ? "active-config-tab" : "config-tab"}
            >
              Domain authentication
            </button>
          </div>
          <div className="data-campaigns-container" style={{ marginTop: "-61px" }}>
            {/* Mailboxes Section */}
            {configTab === "mailboxes" && (
              <div className="section-wrapper">
                {/* <h2 style={{ color: "black", textAlign: "left" }} className="section-title">
                  Mailboxes
                </h2> */}
                <p style={{ marginBottom: "20px", marginTop: "80px" }}>
                  The Mailboxes section lets you add and manage email accounts for sending campaigns securely.
                </p>

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
                    placeholder="Search mailbox by server or username"
                    value={mailboxSearch}
                    onChange={(e) => setMailboxSearch(e.target.value)}
                  />
                  {!isDemoAccount && (
                    <button
                      className="save-button button auto-width small d-flex justify-between align-center"
                      style={{ marginLeft: "auto" }}
                      onClick={() => handleModalOpen("modal-add-mailbox")}
                    >
                      + Add mailbox
                    </button>
                  )}
                </div>
                <table className="contacts-table" style={{ background: "#fff" }}>
                  <thead>
                    <tr>
                      <th>Server</th>
                      <th>Port</th>
                      <th>Username</th>
                      <th>From email</th>
                      <th>SSL</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentMailboxes.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center" }}>
                          No mailboxes configured.
                        </td>
                      </tr>
                    ) : (
                      currentMailboxes.map((item, index) => (
                        <tr key={item.id || index}>
                          <td>{item.server}</td>
                          <td>{item.port}</td>
                          <td>{item.username}</td>
                          <td>{item.fromEmail}</td>
                          <td>{Boolean(item.useSsl || item.usessl) ? "Yes" : "No"}</td>
                          <td style={{ position: "relative" }}>
                            <button
                              className="segment-actions-btn"
                              style={{
                                border: "none",
                                background: "none",
                                fontSize: 24,
                                cursor: "pointer",
                                padding: "2px 10px",
                              }}
                              onClick={() =>
                                setMailboxActionsAnchor(
                                  item.id?.toString() === mailboxActionsAnchor ? null : (item.id?.toString() ?? null), // Convert undefined to null
                                )
                              }
                            >
                              ⋮
                            </button>
                            {mailboxActionsAnchor === item.id?.toString() && (
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
                                      handleEdit(item)
                                      setMailboxActionsAnchor(null)
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
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        ></path>
                                      </svg>
                                    </span>
                                    <span className="font-[600]">Edit</span>
                                  </button>
                                )}
                                {!isDemoAccount && (
                                  <button
                                    onClick={() => {
                                      handleDelete(item.id)
                                      setMailboxActionsAnchor(null)
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
                      ))
                    )}
                  </tbody>
                </table>
                <PaginationControls
                  currentPage={currentPageMailbox}
                  totalPages={totalPagesMailbox}
                  totalRecords={filteredMailboxes.length} // Use filteredMailboxes for totalRecords if filtering is applied before pagination
                  pageSize={pageSize}
                  setCurrentPage={setCurrentPageMailbox}
                  setPageSize={(size) => setPageSize(Number(size))}
                   showPageSizeDropdown={true}
                   pageLabel="Page:"
                />
                {/* Add/Edit Mailbox Modal */}
                {/* Replace your Modal component with this custom modal */}
                {(openModals["modal-add-mailbox"] || editingId !== null) && (
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
                    // onClick={() => {
                    //   // Close modal when clicking backdrop
                    //   handleModalClose("modal-add-mailbox")
                    //   setEditingId(null)
                    //   setForm({
                    //     server: "",
                    //     port: "",
                    //     username: "",
                    //     password: "",
                    //     fromEmail: "",
                    //     usessl: false,
                    //   })
                    // }}
                  >
                    <div
                      style={{
                        background: "#fff",
                        padding: "24px",
                        borderRadius: "8px",
                        width: "45%",
                        maxWidth:800,
                        maxHeight: "90vh",
                        overflow: "auto",
                        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                      }}
                      onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                    >
                      <form onSubmit={handleSubmitSMTP}>
                        <h2 className="!text-left" style={{color:"#333",fontSize:"400"}}>{editingId ? "Edit mailbox" : "Add mailbox"}</h2>
                        <div className="flex gap-4">
                          <div className="form-group flex-1">
                            <label>
                              Host <span style={{ color: "red" }}>*</span>
                            </label>
                            <input
                              name="server"
                              placeholder="smtp.example.com"
                              value={form.server}
                              onChange={handleChangeSMTP}
                              required
                            />
                          </div>
                          <div className="form-group flex-1">
                            <label>
                              Port <span style={{ color: "red" }}>*</span>
                            </label>
                            <input
                              name="port"
                              type="number"
                              placeholder="587"
                              value={form.port}
                              onChange={handleChangeSMTP}
                              required
                            />
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="form-group flex-1">
                            <label>
                              Username <span style={{ color: "red" }}>*</span>
                            </label>
                            <input
                              name="username"
                              placeholder="user@example.com"
                              value={form.username}
                              onChange={handleChangeSMTP}
                              required
                            />
                          </div>
                          <div className="form-group flex-1">
                            <label>
                              Password <span style={{ color: "red" }}>*</span>
                            </label>
                            <input
                              name="password"
                              type="password"
                              placeholder="••••••••"
                              value={form.password}
                              onChange={handleChangeSMTP}
                              required
                            />
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="form-group flex-1">
                            <label>
                              From email <span style={{ color: "red" }}>*</span>
                            </label>
                            <input
                              name="fromEmail"
                              type="email"
                              placeholder="sender@example.com"
                              value={form.fromEmail}
                              onChange={handleChangeSMTP}
                              required
                            />
                          </div>
                          <div className="form-group flex-1">
                            <label>
                              Sender name <span style={{ color: "red" }}>*</span>
                            </label>
                            <input
                              name="senderName"
                              type="text"
                              placeholder="John Doe"
                              value={form.senderName}
                              onChange={handleChangeSMTP}
                              required
                            />
                          </div>
                        </div>
                        <div className="d-flex justify-end" style={{ marginTop: 16 }}>
                          <span className="flex items-center">
                            <input
                              type="checkbox"
                              name="usessl"
                              checked={form.usessl}
                              onChange={handleChangeSMTP}
                              id="use-ssl"
                            />
                            <label className="ml-5 !mb-[0] font-size-12 nowrap mr-10 font-[600]" htmlFor="use-ssl">
                              Use SSL
                            </label>
                          </span>
                          <button
                            type="button"
                            className="button secondary min-w-[120px] mr-10"
                            onClick={() => {
                              handleModalClose("modal-add-mailbox")
                              setEditingId(null)
                              setForm({
                                server: "",
                                port: "",
                                username: "",
                                password: "",
                                fromEmail: "",
                                senderName: "",
                                usessl: false,
                              })
                            }}
                          >
                            Cancel
                          </button>
                          <button className="save-button button min-w-[120px]" type="submit" disabled={smtpLoading}>
                            {smtpLoading ? "Testing..." : (editingId ? "Update" : "Add")}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* SMTP OTP Modal */}
                {showSmtpOtpModal && (
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
                      <h3 style={{ marginBottom: 16, color: "#333" }}>Verify SMTP Email</h3>
                      <p style={{ marginBottom: 16, color: "#666" }}>
                        Please enter the OTP sent to {smtpOtpEmail}
                      </p>
                      <input
                        type="text"
                        placeholder="Enter OTP"
                        style={{
                          width: "100%",
                          padding: "8px",
                          marginBottom: "16px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const otp = (e.target as HTMLInputElement).value;
                            if (otp) {
                              handleSmtpOtpVerify(otp);
                            }
                          }
                        }}
                      />
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <button
                          className="button secondary small"
                          onClick={() => {
                            setShowSmtpOtpModal(false);
                            setForm({
                              server: "",
                              port: "",
                              username: "",
                              password: "",
                              fromEmail: "",
                              senderName: "",
                              usessl: false,
                            });
                            handleModalClose("modal-add-mailbox");
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          className="save-button button small"
                          onClick={() => {
                            const otpInput = document.querySelector('input[placeholder="Enter OTP"]') as HTMLInputElement;
                            if (otpInput?.value) {
                              handleSmtpOtpVerify(otpInput.value);
                            }
                          }}
                          disabled={smtpOtpVerifying}
                        >
                          {smtpOtpVerifying ? 'Verifying...' : 'Verify'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* BCC Email Management Section */}
            {configTab === "bcc" && (
              <div className="section-wrapper" style={{ marginTop: 40 }}>
                {/* <h2 style={{ color: "black", textAlign: "left" }} className="section-title">
                  BCC email management
                </h2> */}
                <div style={{ marginBottom: "-40px", color: "#555", marginTop: "80px" }}>
                  Add BCC email addresses to receive copies of all sent emails.
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: 16,
                    gap: 16,
                  }}
                >
                  {/* <input
                    type="email"
                    className="search-input"
                    style={{ width: 340 }}
                    placeholder="Enter BCC email address"
                    value={newBccEmail}
                    onChange={(e) => setNewBccEmail(e.target.value)}
                  /> */}
                  <button
                    className="save-button button auto-width small d-flex justify-between align-center mt-10"
                    style={{ marginLeft: "auto"}}
                    // onClick={handleAddBcc}
                    onClick={() => setShowPopup(true)}
                    //disabled={bccLoading || !newBccEmail}
                    disabled={bccLoading} // disable only during API call
                  >
                    {bccLoading ? "Adding..." : "+ Add BCC"}
                  </button>
                </div>

                {/* {bccError && <div style={{ color: "#c00", marginBottom: 16 }}>{bccError}</div>} */}

                <table className="contacts-table" style={{ background: "#fff" }}>
                  <thead>
                    <tr>
                      <th>BCC email address</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bccLoading && bccEmails.length === 0 ? (
                      <tr>
                        <td colSpan={2} style={{ textAlign: "center" }}>
                          Loading BCC emails...
                        </td>
                      </tr>
                    ) : paginatedBccEmails.length === 0 ? (
                      <tr>
                        <td colSpan={2} style={{ textAlign: "center" }}>
                          No BCC emails configured.
                        </td>
                      </tr>
                    ) : (
                      paginatedBccEmails.map((email) => (
                        <tr key={email.id}>
                          <td>{email.bccEmailAddress}</td>
                          <td>
                            {!isDemoAccount && (
                              <button
                                className="button secondary small"
                                onClick={() => handleDeleteBcc(email.id)}
                                disabled={bccLoading}
                                style={{
                                  padding: "6px 12px",
                                  fontSize: "14px",
                                  background: "#dc3545",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: bccLoading ? "not-allowed" : "pointer",
                                }}
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <PaginationControls
                  currentPage={bccPage}
                  totalPages={totalPagesBCC}
                  totalRecords={bccEmails.length}
                  pageSize={pageSize}
                  setCurrentPage={setBccPage}
                   setPageSize={(size) => setPageSize(Number(size))}
                   showPageSizeDropdown={true}
                   pageLabel="Page:"
                />
                {/* Popup Modal */}
                {showPopup && (
                  <div
                    // onClick={() => setShowPopup(false)}
                    style={{
                      position: "fixed",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      background: "rgba(0,0,0,0.5)",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      zIndex: 1000,
                    }}
                  >
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        background: "#fff",
                        padding: 24,
                        borderRadius: 8,
                        width: "45%",
                        maxWidth:800,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                      }}
                    >
                      <h3 style={{ marginBottom: 16 }}>Add BCC email</h3>

                      <input
                        type="email"
                        className="search-input"
                        style={{
                          width: "100%",
                          padding: "8px",
                          marginBottom: "16px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                        }}
                        placeholder="Enter BCC email address"
                        value={newBccEmail}
                        onChange={(e) => setNewBccEmail(e.target.value)}
                      />

                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <button className="button secondary small" onClick={() => setShowPopup(false)}>
                          Cancel
                        </button>
                        <button
                          className="save-button button small"
                          onClick={handleSave}
                          disabled={bccLoading || !newBccEmail}
                        >
                          {bccLoading ? "Adding..." : "ADD"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Domain Authentication Section */}
            {configTab === "domain" && (
              <div className="section-wrapper" style={{ marginTop: 40 }}>
                <div style={{ marginBottom: "20px", color: "#555", marginTop: "80px" }}>
                  Configure domain authentication settings for improved email deliverability.
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: 16,
                    gap: 16,
                  }}
                >
                </div>

                <table className="contacts-table" style={{ background: "#fff" }}>
                  <thead>
                    <tr>
                      <th>Domain</th>
                      <th>Email status</th>
                      <th>Domain owner authentication</th>
                      <th>Domain status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fetchingDomain ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center" }}>
                          Loading domain data...
                        </td>
                      </tr>
                    ) : domainData.length > 0 ? (
                      domainData.map((domain, index) => (
                        <tr key={domain.emailDomainId || index}>
                          <td>{domain.domain || "-"}</td>
                          <td>
                            {domain.emailDomainverified ? (
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <span style={{ color: "#28a745", fontSize: "14px" }}>✓</span>
                                <span style={{ color: "#28a745", fontSize: "14px" }}>Verified</span>
                              </div>
                            ) : (
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <span style={{ color: "#dc3545", fontSize: "14px" }}>✗</span>
                                <span style={{ color: "#dc3545", fontSize: "14px" }}>Not Verified</span>
                              </div>
                            )}
                          </td>
                          <td>
                            {domain.domainverified ? (
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <span style={{ color: "#28a745", fontSize: "14px" }}>✓</span>
                                <span style={{ color: "#28a745", fontSize: "14px" }}>Verified</span>
                              </div>
                            ) : (
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ color: "#dc3545", fontSize: "14px" }}>Pending</span>
                                <span
                                  style={{
                                    color: "#007bff",
                                    fontSize: "14px",
                                    cursor: "pointer",
                                    textDecoration: "underline",
                                  }}
                                  onClick={() => {
                                    setSelectedDomain(domain);
                                    setShowValidatePopup(true);
                                  }}
                                >
                                  Validate Records
                                </span>
                              </div>
                            )}
                          </td>
                          <td>
                            <DomainAuthColumn 
                              domain={domain} 
                              onValidateClick={handleDomainValidateClick} 
                            />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center" }}>
                          No domains configured.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* OTP Modal */}
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
                        appModal.showSuccess('Email verification successful!');
                        fetchDomainData(); // Refresh domain data
                      } else {
                        appModal.showError('Invalid verification code. Please try again.');
                      }
                    } catch (error) {
                      console.error('Error verifying OTP:', error);
                      appModal.showError('Error verifying code. Please check your connection.');
                    }
                  }}
                />

                {/* Validate Records Modal */}
                <ValidateRecordsModal
                  isOpen={showValidatePopup}
                  onClose={() => setShowValidatePopup(false)}
                  selectedDomain={selectedDomain}
                  onValidate={(domain) => {
                    console.log('Validate Records for:', domain.emailDomain);
                    // Refresh domain data after validation
                    setTimeout(() => fetchDomainData(), 1000);
                  }}
                  showSuccess={appModal.showSuccess}
                  showError={appModal.showError}
                  refreshDomainData={() => setTimeout(() => fetchDomainData(), 1000)}
                  effectiveUserId={effectiveUserId}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* Schedule Tab */}
      {tab === "Schedule" && (
        <>
          <div className="data-campaigns-container" style={{ marginTop: "-60px" }}>
            <div className="section-wrapper">
              <h2 className="section-title" style={{ color: "black", textAlign: "left" }}>Email schedules</h2>
              <div style={{ marginBottom: 4, color: "#555" }}>
                Create and manage email delivery schedules for your campaigns.
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
                  placeholder="Search schedules..."
                  value={scheduleSearch}
                  onChange={(e) => setScheduleSearch(e.target.value)}
                />
                {!isDemoAccount && (
                  <button
                    className="save-button button auto-width small d-flex justify-between align-center"
                    style={{ marginLeft: "auto" }}
                    onClick={() => setShowScheduleModal(true)}
                  >
                    + Create schedule
                  </button>
                )}
              </div>

              <table className="contacts-table" style={{ background: "#fff" }}>
                <thead>
                  <tr>
                    <th>Sequence name</th>
                    <th>List/segment</th>
                    <th>From</th>
                    <th>Scheduled date</th>
                    <th>Scheduled time</th>
                    <th>Timezone</th>
                    <th>BCC</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleList.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center" }}>
                        No schedules found.
                      </td>
                    </tr>
                  ) : (
                    scheduleList
                      .filter(
                        (item) =>
                          item.title
                            ?.toLowerCase()
                            .includes(scheduleSearch.toLowerCase()) ||
                          item.zohoviewName
                            ?.toLowerCase()
                            .includes(scheduleSearch.toLowerCase())
                      )
                      .map((item, index) => {
                        const dataFile = scheduleDataFiles.find(
                          (file) => file.id === item.dataFileId
                        );
                        const smtpUser = smtpUsers.find(
                          (user) => user.id === item.smtpID
                        );
                        const scheduledDate = item.scheduledDate || "-";

                        const scheduledTime = item.scheduledTime || "-";

                        return (
                          <tr key={item.id || index}>
                            <td>{item.title}</td>
                            <td>{item.zohoviewName || "-"}</td>
                            <td>{smtpUser?.username || "-"}</td>
                            <td>{scheduledDate}</td>
                            <td>{scheduledTime}</td>
                            <td>{item.timeZone}</td>
                            <td>{item.bccEmail || "-"}</td>
                            <td style={{ position: "relative" }}>
                              <button
                                className="segment-actions-btn"
                                style={{
                                  border: "none",
                                  background: "none",
                                  fontSize: 24,
                                  cursor: "pointer",
                                  padding: "2px 10px",
                                }}
                                onClick={() =>
                                  setScheduleActionsAnchor(
                                    item.id?.toString() ===
                                      scheduleActionsAnchor
                                      ? null
                                      : item.id?.toString() ?? null // Convert undefined to null
                                  )
                                }
                              >
                                ⋮
                              </button>
                              {scheduleActionsAnchor ===
                                item.id?.toString() && (
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
                                          handleEditSchedule(item);
                                          setScheduleActionsAnchor(null);
                                          setShowScheduleModal(true);
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
                                        <span className="font-[600]">Edit</span>
                                      </button>
                                    )}
                                    {!isDemoAccount && (
                                      <button
                                        onClick={() => {
                                          handleDeleteSchedule(item.id);
                                          setScheduleActionsAnchor(null);
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
                        );
                      })
                  )}
                </tbody>
              </table>

              {/* Pagination controls */}
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={rowsPerPage}               // ✅ use same variable
                totalRecords={totalPages} // ✅ use filtered length
                setCurrentPage={setCurrentPage}
                 setPageSize={(size) => setPageSize(Number(size))}
                 showPageSizeDropdown={true}
                 pageLabel="Page:"
              />
              {/* <div
                className="d-flex align-center justify-end"
                style={{ marginTop: 16 }}
              >
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "5px 10px",
                    backgroundColor: "#f0f0f0",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    marginRight: 8,
                  }}
                >
                  <img
                    src={singleprvIcon}
                    alt="Previous"
                    style={{ width: 20, height: 20, marginRight: 5 }}
                  />
                  <span>Previous</span>
                </button>

                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(
                  (page) => (
                    <button
                      key={page}
                      style={{
                        padding: "5px 10px",
                        backgroundColor:
                          currentPage === page ? "#3f9f42" : "#f0f0f0",
                        color: currentPage === page ? "#fff" : "#333",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        cursor: "pointer",
                        marginRight: 8,
                      }}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "5px 10px",
                    backgroundColor: "#f0f0f0",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    cursor:
                      currentPage === totalPages ? "not-allowed" : "pointer",
                  }}
                >
                  <span>Next</span>
                  <img
                    src={singlenextIcon}
                    alt="Next"
                    style={{ width: 20, height: 20, marginLeft: 5 }}
                  />
                </button>
              </div> */}
            </div>
          </div>

          {/* Schedule Modal */}
          {showScheduleModal && (
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
              onClick={() => {
                // Close modal when clicking backdrop
                setShowScheduleModal(false);
                setEditingId(null);
                setFormData({
                  title: "",
                  timeZone: "",
                  scheduledDate: "",
                  scheduledTime: "",
                  EmailDeliver: "",
                  bccEmail: "",
                  smtpID: "",
                });
                setIsFollowUp(false);
                setSelectedZohoviewId1("");
                setSelectedUser("");
              }}
            >
              <div
                style={{
                  background: "#fff",
                  padding: "32px",
                  borderRadius: "8px",
                  width: "45%",
                  maxWidth: "800px",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                }}
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
              >
                <h2 style={{ marginTop: 0, marginBottom: 24 ,color:"#333",textAlign:"left"}}>
                  {editingId ? "Edit schedule" : "Create schedule"}
                </h2>

                <form onSubmit={handleSubmitSchedule}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "20px",
                      marginBottom: "24px",
                    }}
                  >
                    <div className="form-group">
                      <label>
                        Sequence name <span style={{ color: "red" }}>*</span>
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title || ""}
                        onChange={handleChange}
                        placeholder="Enter sequence name"
                        required
                        style={{ width: "100%" }}
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        Campaign <span style={{ color: "red" }}>*</span>
                      </label>
                      <select
                        name="model"
                        onChange={handleZohoModelChange1}
                        value={selectedZohoviewId1 || ""}
                        disabled={scheduleDataLoading}
                        required
                        style={{ width: "100%" }}
                      >
                        <option value="">Select campaign</option>
                        {scheduleCampaigns.length > 0 ? (
                          scheduleCampaigns.map((campaign) => (
                            <option
                              key={`campaign-${campaign.id}`}
                              value={`campaign-${campaign.id}`}
                            >
                              {campaign.campaignName}
                            </option>
                          ))
                        ) : (
                          !scheduleDataLoading && (
                            <option disabled>No campaigns available</option>
                          )
                        )}
                      </select>
                    </div>
                     <div className="form-group">
                      <label>
                        From <span style={{ color: "red" }}>*</span>
                      </label>
                      <select
                        value={selectedUser}
                        onChange={handleChangeSmtpUsers}
                        required
                        style={{ width: "100%" }}
                      >
                        <option value="">Email</option>
                        {smtpUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.username}
                          </option>
                        ))}
                      </select>
                    </div>
                     <div className="form-group">
                      <label>BCC email</label>
                      <input
                        type="email"
                        name="bccEmail"
                        value={formData.bccEmail || ""}
                        onChange={handleChange}
                        placeholder="Optional BCC email"
                        style={{ width: "100%" }}
                      />
                      {bccError && (
                        <small style={{ color: "red" }}>{bccError}</small>
                      )}
                    </div>

                    <div className="form-group">
                      <label>
                        Timezone <span style={{ color: "red" }}>*</span>
                      </label>
                      <select
                        name="timeZone"
                        value={formData.timeZone || ""}
                        onChange={handleChange}
                        required
                        style={{ width: "100%" }}
                      >
                        <option value="">Timezone</option>
                        {timezoneOptions.map((tz) => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>
                        Scheduled date <span style={{ color: "red" }}>*</span>
                      </label>
                      <input
                        type="date"
                        name="scheduledDate"
                        value={formData.scheduledDate || ""}
                        onChange={handleChange}
                        required
                        style={{ width: "100%" }}
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        Scheduled time <span style={{ color: "red" }}>*</span>
                      </label>
                      <input
                        type="time"
                        name="scheduledTime"
                        value={formData.scheduledTime || ""}
                        onChange={handleChange}
                        required
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <input
                        type="checkbox"
                        id="isFollowUp"
                        checked={isFollowUp}
                        onChange={(e) => setIsFollowUp(e.target.checked)}
                        style={{ marginRight: "8px" }}
                      />
                      <label htmlFor="isFollowUp" style={{ marginBottom: 0, cursor: "pointer" }}>
                        Is follow up
                      </label>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowScheduleModal(false);
                        setEditingId(null);
                        setFormData({
                          title: "",
                          timeZone: "",
                          scheduledDate: "",
                          scheduledTime: "",
                          EmailDeliver: "",
                          bccEmail: "",
                          smtpID: "",
                        });
                        setIsFollowUp(false);
                        setSelectedZohoviewId1("");
                        setSelectedUser("");
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
                      type="submit"
                      className="button primary"
                      disabled={!isFormValid}
                      style={{
                        padding: "8px 16px",
                        background: isFormValid ? "#3f9f42" : "#ccc",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: isFormValid ? "pointer" : "not-allowed",
                      }}
                    >
                      {editingId ? "Update schedule" : "Create schedule"}
                    </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      <AppModal
        isOpen={appModal.isOpen}
        onClose={appModal.hideModal}
        {...appModal.config}
      />

      {/* Domain Validation Modals */}
      <DomainAuthModal
        isOpen={showDomainAuthModal}
        onClose={() => setShowDomainAuthModal(false)}
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
        isOpen={showValidatePopup}
        onClose={() => setShowValidatePopup(false)}
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
              appModal.showSuccess('Email verification successful!');
              fetchDomainData();
            } else {
              appModal.showError('Invalid verification code. Please try again.');
            }
          } catch (error) {
            console.error('Error verifying OTP:', error);
            appModal.showError('Error verifying code. Please check your connection.');
          }
        }}
      />
    </div>
  );
};

export default Mail;
