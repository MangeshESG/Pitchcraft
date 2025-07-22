import { useRef, useCallback, useState, useEffect } from "react";
import Modal from "../common/Modal";
import { Tooltip as ReactTooltip } from "react-tooltip";
import singleprvIcon from "../../assets/images/SinglePrv.png";
import singlenextIcon from "../../assets/images/SingleNext.png";
import emailIcon from "../../assets/images/icons/email.png";
import * as XLSX from "xlsx"; // Add this import
import FileSaver from "file-saver"; // Correct import syntax

import { stringify } from "ajv";
import { useModel } from "../../ModelContext";
import DatePicker from "react-datepicker";
import moment from "moment-timezone";
import "react-datepicker/dist/react-datepicker.css";
import TimePicker from "react-time-picker";
import axios from "axios";
import "./Mail.css";
import API_BASE_URL from "../../config";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import Time from "react-datepicker/dist/time";
type MailTabType = "Dashboard" | "Configuration" | "Schedule";

interface DailyStats {
  date: string;
  sent: number;
  opens: number;
  clicks: number;
}
interface EventItem {
  id: number;
  email: string;
  eventType: "Open" | "Click" | "Request";
  timestamp: string;
  clientId: number;
  targetUrl: string;
  zohoViewName: string;

  // ✅ Add these fields
  full_Name: string;
  company: string;
  jobTitle: string;
  location: string;
  linkedin_URL: string;
  website: string;
}

interface ClientStats {
  [clientId: number]: {
    Open: number;
    Click: number;
  };
}

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
  dataFileId: number;
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
  isResetEnabled, // Receive the prop
  zohoClient, // Add this to the destructured props
  selectedClient,
  initialTab = "Dashboard",
  onTabChange,
}) => {
  const [isCopyText, setIsCopyText] = useState(false);

  const formatOutput = (text: string) => {
    return text
      .replace(
        /successfully generated/gi,
        '<span style="color: green;">successfully generated</span>'
      )
      .replace(/error/gi, '<span style="color: red;">error</span>');
  };
  const [openModals, setOpenModals] = useState<{ [key: string]: boolean }>({});

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
    console.log(innerText, "innerText");
    setTab(innerText);

    // Notify parent component
    if (onTabChange) {
      onTabChange(innerText);
    }
  };

  const [tab2, setTab2] = useState("Output");
  const tabHandler2 = (e: React.ChangeEvent<any>) => {
    const { innerText } = e.target;
    console.log(innerText, "innerText");
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

  const userId = sessionStorage.getItem("clientId");
  const effectiveUserId = selectedClient !== "" ? selectedClient : userId;

  const token = sessionStorage.getItem("token");
  // SMTP View
  const [smtpList, setSmtpList] = useState<SmtpConfig[]>([]);
  const [form, setForm] = useState({
    server: "",
    port: "",
    username: "",
    password: "",
    fromEmail: "",
    usessl: false,
  });
  const [editingId, setEditingId] = useState(null);
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

    try {
      // Step 1: First send test email
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

      // Step 2: If test email succeeded, save or update record
      if (editingId) {
        await axios.post(
          `${API_BASE_URL}/api/email/update-smtp/${editingId}?ClientId=${effectiveUserId}`,
          form,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );
        alert("SMTP updated successfully");
      } else {
        await axios.post(
          `${API_BASE_URL}/api/email/save-smtp?ClientId=${effectiveUserId}`,
          form,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );
        alert("SMTP added successfully");
      }

      // Step 3: Clear form and refresh list
      setForm({
        server: "",
        port: "",
        username: "",
        password: "",
        fromEmail: "",
        usessl: false,
      });
      setEditingId(null);
      fetchSmtp();
    } catch (err) {
      console.error(err);
      alert(
        "Failed to send test email or save SMTP. Please check the settings."
      );
    }
  };

  // Edit Handler
  const handleEdit = (item: any) => {
    setForm(item);
    setEditingId(item.id);
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
        alert("Error deleting SMTP");
      }
    }
  };
  //End SMTP

  const [isLoading, setIsLoading] = useState(false);
  //Schedule Tab js code
  const timezoneOptions = [
    { value: "GMT Standard Time", label: "Europe/London" },
    { value: "W. Europe Standard Time", label: "Europe/Amsterdam" },
    { value: "Central Europe Standard Time", label: "Europe/Berlin" },
    { value: "Eastern Standard Time", label: "America/New_York" },
    { value: "Central Standard Time", label: "America/Chicago" },
    { value: "Mountain Standard Time", label: "America/Denver" },
    { value: "Pacific Standard Time", label: "America/Los_Angeles" },
    { value: "India Standard Time", label: "Asia/Kolkata" },

    // Add more Windows timezone IDs as needed
  ];
  const emaildeliverOptions = [
    { label: "Immediately", value: "0" },
    { label: "In 1 hour", value: "1h" },
    { label: "In 2 hours", value: "2h" },
    { label: "In 24 hours", value: "24h" },
    { label: "In 7 Days", value: "7d" },
    { label: "In 30 Days", value: "30d" },
  ];

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
    const fetchScheduleDataFiles = async () => {
      if (tab === "Schedule" && effectiveUserId) {
        setScheduleDataLoading(true);
        try {
          const response = await axios.get(
            `${API_BASE_URL}/api/crm/datafile-byclientid?clientId=${effectiveUserId}`,
            {
              headers: {
                ...(token && { Authorization: `Bearer ${token}` }),
              },
            }
          );
          setScheduleDataFiles(response.data);
        } catch (error) {
          console.error("Error fetching schedule data files:", error);
          setScheduleDataFiles([]);
        } finally {
          setScheduleDataLoading(false);
        }
      }
    };

    fetchScheduleDataFiles();
  }, [tab, effectiveUserId, token]);

  // Clear schedule data when user changes
  useEffect(() => {
    setSelectedZohoviewId1("");
    setScheduleDataFiles([]);
  }, [effectiveUserId]);

  const handleZohoModelChange1 = async (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const selectedId = event.target.value;
    setSelectedZohoviewId1(selectedId);

    // Find and store the complete file object
    const selectedFile = scheduleDataFiles.find(
      (file) => file.id.toString() === selectedId
    );
    setSelectedScheduleFile(selectedFile || null);

    if (selectedId) {
      try {
        await fetchAndDisplayEmailBodies1(selectedId);
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
        console.log(
          fetchAndDisplayEmailBodies1,
          "call fetchAndDisplayEmailBodies1"
        );
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

    // Calculate base delivery time
    let deliverMoment = moment().tz(selectedTimeZone);

    switch (deliveryOption) {
      case "0":
        break; // Immediately → keep current time
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
        //deliverMoment.add(30, 'days');
        break;
      default:
        break;
    }

    // Convert to UTC
    const utcMoment = deliverMoment.clone().utc();

    let stepsPayload = [
      {
        ScheduledDate: utcMoment.format("YYYY-MM-DD"),
        ScheduledTime: utcMoment.format("HH:mm:ss"),
      },
    ];

    if (formData.EmailDeliver === "custom") {
      // Prepare steps array → convert to UTC
      stepsPayload = steps.map((step) => {
        const localMoment = moment(step.datetime).tz(selectedTimeZone);
        const utcMoment = localMoment.clone().utc();

        return {
          ScheduledDate: utcMoment.format("YYYY-MM-DD"),
          ScheduledTime: utcMoment.format("HH:mm:ss"),
        };
      });
    }

    const payload = {
      Title: formData.title,
      zohoviewName: selectedZohoviewId1, //zohoviewId
      TimeZone: formData.timeZone,
      Steps: stepsPayload,
      SmtpID: selectedUser,
      BccEmail: formData.bccEmail,
    };

    console.log("Payload:", payload);
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
          EmailDeliver: "", // <--- include this even if you no longer use it!
          bccEmail: "",
          smtpID: "",
        });
      } else {
        console.error("Server responded with an error:", data);
        toast.error("Something went wrong");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
          alert("An unexpected error occurred.");
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
      console.log("Fetched schedule list:", response.data);
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
      alert("Please select both scheduled date and time.");
      return;
    }

    const localMoment = moment.tz(
      `${scheduledDate}T${scheduledTime}`,
      selectedTimeZone
    );

    const utcMoment = localMoment.clone().utc();

    const stepsPayload = [
      {
        ScheduledDate: utcMoment.format("YYYY-MM-DD"),
        ScheduledTime: utcMoment.format("HH:mm:ss"),
      },
    ];

    // Find the selected file to get its name
    const selectedFile = scheduleDataFiles.find(
      (file) => file.id.toString() === selectedZohoviewId1
    );

    const payload = {
      Title: formData.title,
      zohoviewName: selectedFile?.name || "", // Send the file name
      dataFileId: parseInt(selectedZohoviewId1) || 0, // Add dataFileId as number
      TimeZone: formData.timeZone,
      Steps: stepsPayload,
      SmtpID: selectedUser,
      BccEmail: formData.bccEmail,
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
        alert("Schedule updated successfully");
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
        alert("Schedule added successfully");
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
      setEditingId(null);
      fetchSchedule();
    } catch (err) {
      console.error(err);
      alert("Failed to schedule mail. Please check the details.");
    }
  };
  // Edit Handler
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

    // Set the dataFileId as string for the select value
    setSelectedZohoviewId1(item.dataFileId?.toString() || "");

    // If you need to set the selected file object as well
    const selectedFile = scheduleDataFiles.find(
      (file) => file.id === item.dataFileId
    );
    if (selectedFile) {
      setSelectedScheduleFile(selectedFile);
    }

    setSelectedUser(item.smtpID);
  };

  // Delete Handler (Assuming you create this API in backend)
  const handleDeleteSchedule = async (id: any) => {
    if (window.confirm("Are you sure to delete this schedule?")) {
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
        alert("Error deleting SMTP");
      }
    }
  };

  // Email device width
  const [outputEmailWidth, setOutputEmailWidth] = useState<string>("");

  const toggleOutputEmailWidth = (deviceName: string) => {
    setOutputEmailWidth(deviceName);
  };

  // Add this useEffect to handle the initialization

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

  const handleRowsPerPageChange = (e: any) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page
  };

  const [clientStats, setClientStats] = useState<ClientStats>({});
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [totalStats, setTotalStats] = useState({
    sent: 0,
    opens: 0,
    clicks: 0,
  });

  const [selectedView, setSelectedView] = useState<string>("");
  const [availableViews, setAvailableViews] = useState<
    { id: number; name: string }[]
  >([]);
  const [requestCount, setRequestCount] = useState(0);
  const [allEventData, setAllEventData] = useState<EventItem[]>([]);
  const [filteredEventData, setFilteredEventData] = useState<EventItem[]>([]);
  const [filteredEventType, setFilteredEventType] = useState<
    "Open" | "Click" | null
  >(null);

  // Rename your function to be more descriptive
  const fetchEmailLogs = async (clientId: number, dataFileId: number) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/Crm/getlogs`, {
        params: {
          clientId,
          dataFileId,
        },
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching email logs:", error);
      return [];
    }
  };

  const handleFilterEvents = (type: "Open" | "Click") => {
    const filtered = allEventData.filter((event) => event.eventType === type);
    setFilteredEventData(filtered);
    setFilteredEventType(type);
  };

  const cellStyle: React.CSSProperties = {
    border: "1px solid #ccc",
    padding: "8px 12px",
    textAlign: "left",
    verticalAlign: "top",
  };
  const formatMailTimestamp = (input: string): string => {
    if (!input) return "";

    try {
      const date = new Date(input);

      if (isNaN(date.getTime())) return "Invalid date";

      const day = date.getDate().toString().padStart(2, "0");

      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();

      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;

      return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return "Invalid date";
    }
  };

  // Add this loading state for refresh functionality
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [dashboardTab, setDashboardTab] = useState("Overview");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredStats = dailyStats.filter((stat) => {
    const statDate = new Date(stat.date);
    return (
      (!startDate || new Date(startDate) <= statDate) &&
      (!endDate || statDate <= new Date(endDate))
    );
  });

  useEffect(() => {
    if (
      tab === "Dashboard" &&
      dashboardTab === "Details" &&
      !filteredEventType
    ) {
      handleFilterEvents("Open");
    }
  }, [tab, dashboardTab]);

  // Update your fetchLogsByClientAndView function
  const fetchLogsByClientAndView = async (
    clientId: number,
    viewId: string // This should be the dataFileId
  ) => {
    try {
      const dataFileId = Number(viewId);

      // Fetch tracking logs (opens and clicks)
      const trackingResponse = await axios.get(
        `${API_BASE_URL}/api/Crm/gettrackinglogs`,
        {
          params: {
            clientId,
            dataFileId,
          },
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      // Fetch email logs for sent count
      const emailLogs = await fetchEmailLogs(clientId, dataFileId);

      // Extract data from responses
      const allTrackingData: EventItem[] = trackingResponse.data || [];
      const allEmailLogsData = emailLogs || [];

      // Store the raw data
      setAllEventData(allTrackingData);
      setAllEmailLogs(allEmailLogsData);

      // Process data without date filtering initially
      processDataWithDateFilter(
        allTrackingData,
        allEmailLogsData,
        startDate,
        endDate
      );
    } catch (error) {
      console.error("Error fetching logs:", error);
      setAllEventData([]);
      setAllEmailLogs([]);
      setFilteredEventData([]);
      setRequestCount(0);
      setDailyStats([]);
      setTotalStats({ sent: 0, opens: 0, clicks: 0 });
      setClientStats({});
    }
  };
  const [allEmailLogs, setAllEmailLogs] = useState<any[]>([]);
  const processDataWithDateFilter = (
    trackingData: EventItem[],
    emailLogs: any[],
    startDate?: string,
    endDate?: string
  ) => {
    // Apply date filtering
    let filteredTrackingData = trackingData;
    let filteredEmailLogs = emailLogs;

    if (startDate || endDate) {
      filteredTrackingData = trackingData.filter((item) => {
        const itemDate = item.timestamp.split("T")[0];
        const isAfterStart = !startDate || itemDate >= startDate;
        const isBeforeEnd = !endDate || itemDate <= endDate;
        return isAfterStart && isBeforeEnd;
      });

      filteredEmailLogs = emailLogs.filter((log: any) => {
        const sentDate = log.sentAt.split("T")[0];
        const isAfterStart = !startDate || sentDate >= startDate;
        const isBeforeEnd = !endDate || sentDate <= endDate;
        return isAfterStart && isBeforeEnd;
      });
    }

    // Track unique opens and clicks per day
    const dailyTracking: Record<
      string,
      {
        uniqueOpens: Set<string>;
        uniqueClicks: Set<string>;
        sentCount: number;
      }
    > = {};

    // Process email logs
    filteredEmailLogs.forEach((log: any) => {
      if (log.isSuccess) {
        const date = log.sentAt.split("T")[0];

        if (!dailyTracking[date]) {
          dailyTracking[date] = {
            uniqueOpens: new Set(),
            uniqueClicks: new Set(),
            sentCount: 0,
          };
        }

        dailyTracking[date].sentCount++;
      }
    });

    // Global unique tracking
    const uniqueOpensInDateRange = new Set<string>();
    const uniqueClicksInDateRange = new Set<string>();

    // Process opens and clicks
    filteredTrackingData.forEach((item) => {
      const date = item.timestamp.split("T")[0];

      if (!dailyTracking[date]) {
        dailyTracking[date] = {
          uniqueOpens: new Set(),
          uniqueClicks: new Set(),
          sentCount: 0,
        };
      }

      if (item.eventType === "Open") {
        dailyTracking[date].uniqueOpens.add(item.email);
        uniqueOpensInDateRange.add(item.email);
      } else if (item.eventType === "Click") {
        dailyTracking[date].uniqueClicks.add(item.email);
        uniqueClicksInDateRange.add(item.email);
      }
    });

    // Create stats for graph
    const statsMap: Record<string, DailyStats> = {};

    Object.keys(dailyTracking).forEach((date) => {
      statsMap[date] = {
        date,
        sent: dailyTracking[date].sentCount,
        opens: dailyTracking[date].uniqueOpens.size,
        clicks: dailyTracking[date].uniqueClicks.size,
      };
    });

    const sortedStats = Object.values(statsMap).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    setDailyStats(sortedStats);

    // Calculate totals
    const totalSentCount = filteredEmailLogs.filter(
      (log: any) => log.isSuccess
    ).length;

    setRequestCount(totalSentCount);
    setTotalStats({
      sent: totalSentCount,
      opens: uniqueOpensInDateRange.size,
      clicks: uniqueClicksInDateRange.size,
    });

    // Update filtered event data
    setFilteredEventData(filteredTrackingData);

    // Apply event type filter if one is selected
    if (filteredEventType) {
      const typeFiltered = filteredTrackingData.filter(
        (event: EventItem) => event.eventType === filteredEventType
      );
      setFilteredEventData(typeFiltered);
    }
  };

  // Update your refresh function to use the new fetchEmailLogs
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (!selectedView) {
        console.warn("Cannot refresh without selected view");
        return;
      }

      // Refresh all data using the selected view ID
      await fetchLogsByClientAndView(Number(effectiveUserId), selectedView);

      // Reapply event type filter if it exists
      if (filteredEventType && allEventData.length > 0) {
        const filtered = allEventData.filter(
          (event) => event.eventType === filteredEventType
        );
        setFilteredEventData(filtered);
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };
  // Update the useEffect that initializes data
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        // Clear all previous data
        setAvailableViews([]);
        setSelectedView("");
        setAllEventData([]);
        setAllEmailLogs([]);
        setFilteredEventData([]);
        setDailyStats([]);
        setTotalStats({ sent: 0, opens: 0, clicks: 0 });
        setRequestCount(0);

        // Fetch available views - use the correct endpoint
        const response = await axios.get(
          `${API_BASE_URL}/api/crm/datafile-byclientid?clientId=${effectiveUserId}`,
          {
            headers: {
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );
        setAvailableViews(response.data);
      } catch (error) {
        console.error("Error initializing data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (effectiveUserId) {
      initializeData();
    }
  }, [effectiveUserId]);

  // Also, add cleanup to prevent state updates after component unmount
  useEffect(() => {
    return () => {
      // Cleanup function to prevent state updates after unmount
      setAvailableViews([]);
      setSelectedView("");
      setAllEventData([]);
      setAllEmailLogs([]);
      setFilteredEventData([]);
      setDailyStats([]);
      setTotalStats({ sent: 0, opens: 0, clicks: 0 });
      setRequestCount(0);
    };
  }, []);

  // Update the useEffect that fetches data based on selectedView
  useEffect(() => {
    if (selectedView && tab === "Dashboard") {
      fetchLogsByClientAndView(Number(effectiveUserId), selectedView);
    } else if (!selectedView) {
      // Clear all data when no view is selected
      setRequestCount(0);
      setAllEventData([]);
      setFilteredEventData([]);
      setDailyStats([]);
      setTotalStats({ sent: 0, opens: 0, clicks: 0 });
      setClientStats({});
    }
  }, [selectedView, tab, effectiveUserId]);

  // Add this function inside your component (before the return statement)
  const handleViewChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newViewId = e.target.value;
    setSelectedView(newViewId);

    // Clear all data
    setLoading(true);
    setAllEventData([]);
    setAllEmailLogs([]);
    setFilteredEventData([]);
    setDailyStats([]);
    setTotalStats({ sent: 0, opens: 0, clicks: 0 });
    setClientStats({});
    setRequestCount(0);

    if (newViewId) {
      // Pass the view ID directly (it's the dataFileId)
      await fetchLogsByClientAndView(Number(effectiveUserId), newViewId);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (allEventData.length > 0 || allEmailLogs.length > 0) {
      processDataWithDateFilter(allEventData, allEmailLogs, startDate, endDate);
    }
  }, [startDate, endDate]);

  const openRate =
    requestCount > 0
      ? ((totalStats.opens / requestCount) * 100).toFixed(1)
      : "0.0";
  const clickRate =
    requestCount > 0
      ? ((totalStats.clicks / requestCount) * 100).toFixed(1)
      : "0.0";

  // BCC Email Management states
  const [bccEmails, setBccEmails] = useState<BccEmail[]>([]);
  const [newBccEmail, setNewBccEmail] = useState<string>("");
  const [bccLoading, setBccLoading] = useState(false);

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

  return (
    <div className="login-box gap-down">
      {tab === "Dashboard" && (
        <>
          {/* Dashboard sub-tabs */}
          <div className="dashboard-tabs">
            <button
              className={dashboardTab === "Overview" ? "active" : ""}
              onClick={() => setDashboardTab("Overview")}
            >
              Overview
            </button>
            <button
              className={dashboardTab === "Details" ? "active" : ""}
              onClick={() => setDashboardTab("Details")}
            >
              Details
            </button>
          </div>

          {/* View Dropdown and Date Filters */}
          <div className="form-controls">
            <div className="form-group">
              <label>
                Zoho View: <span style={{ color: "red" }}>*</span>
              </label>
              <select
                value={selectedView}
                onChange={handleViewChange}
                className={!selectedView ? "error" : ""}
              >
                <option value="">-- Please Select a View --</option>
                {availableViews.map((view) => (
                  <option key={view.id} value={view.id}>
                    {view.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Start Date:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate || undefined}
              />
            </div>

            <div className="form-group">
              <label>End Date:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
              />
            </div>

            {(startDate || endDate) && (
              <button
                className="btn-clear"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
              >
                Clear Dates
              </button>
            )}
          </div>

          {/* Stats cards */}
          <div className="stats-cards">
            <div className="stats-card">
              <h3>Sent</h3>
              {loading ? (
                <p className="value">Loading...</p>
              ) : !selectedView ? (
                <p className="value">-</p>
              ) : (
                <p className="value">{requestCount}</p>
              )}
            </div>

            <div className="stats-card orange">
              <h3>Unique Opens</h3>
              {loading ? (
                <p className="value">Loading...</p>
              ) : !selectedView ? (
                <p className="value">-</p>
              ) : (
                <>
                  <p className="value">{totalStats.opens}</p>
                  <p className="percentage">({openRate}%)</p>
                </>
              )}
            </div>

            <div className="stats-card blue">
              <h3>Unique Clicks</h3>
              {loading ? (
                <p className="value">Loading...</p>
              ) : !selectedView ? (
                <p className="value">-</p>
              ) : (
                <>
                  <p className="value">{totalStats.clicks}</p>
                  <p className="percentage">({clickRate}%)</p>
                </>
              )}
            </div>
          </div>

          {dashboardTab === "Overview" && (
            <div className="chart-container">
              <h2>Statistics Overview</h2>
              {!error && (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={
                      filteredStats.length
                        ? filteredStats
                        : [{ date: "", sent: 0, opens: 0, clicks: 0 }]
                    }
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend verticalAlign="top" height={36} />
                    <Line
                      type="monotone"
                      dataKey="sent"
                      stroke="#00C49F"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="opens"
                      stroke="#FF8042"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="clicks"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {dashboardTab === "Details" && (
            <>
              <div className="event-buttons">
                <button
                  onClick={() => handleFilterEvents("Open")}
                  className={`btn-open ${
                    filteredEventType === "Open" ? "active" : ""
                  }`}
                >
                  Show Opens
                </button>
                <button
                  onClick={() => handleFilterEvents("Click")}
                  className={`btn-click ${
                    filteredEventType === "Click" ? "active" : ""
                  }`}
                >
                  Show Clicks
                </button>
                <button
                  onClick={handleRefresh}
                  className="btn-refresh"
                  disabled={isRefreshing}
                >
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              {filteredEventType && (
                <div className="events-container">
                  <h3>{filteredEventType} Events</h3>
                  <div style={{ overflowX: "auto" }}>
                    <table className="events-table">
                      <thead>
                        <tr>
                          <th>Full Name</th>
                          <th>Email</th>
                          <th>Company</th>
                          <th>Job Title</th>
                          <th>Location</th>
                          <th>Timestamp</th>
                          {filteredEventType === "Click" && <th>Target URL</th>}
                          <th>LinkedIn</th>
                          <th>Website</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEventData.length > 0 ? (
                          filteredEventData.map((item, index) => (
                            <tr key={item.id}>
                              <td>{item.full_Name || item.full_Name || "-"}</td>
                              <td>{item.email || "-"}</td>
                              <td>{item.company || "-"}</td>
                              <td>{item.jobTitle || "-"}</td>
                              <td>{item.location || "-"}</td>
                              <td>{formatMailTimestamp(item.timestamp)}</td>
                              {filteredEventType === "Click" && (
                                <td>
                                  {item.targetUrl ? (
                                    <a
                                      href={item.targetUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      {item.targetUrl.length > 50
                                        ? item.targetUrl.substring(0, 50) +
                                          "..."
                                        : item.targetUrl}
                                    </a>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                              )}
                              <td>
                                {item.linkedin_URL ? (
                                  <a
                                    href={item.linkedin_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="linkedin"
                                  >
                                    LinkedIn
                                  </a>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td>
                                {item.website ? (
                                  <a
                                    href={item.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    Website
                                  </a>
                                ) : (
                                  "-"
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr className="empty-row">
                            <td colSpan={filteredEventType === "Click" ? 9 : 8}>
                              No {filteredEventType?.toLowerCase()} events found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {tab === "Configuration" && (
        <>
          <div className="tabs secondary d-flex align-center">
            <div className="input-section edit-section">
              <div className="table-container mt-0">
                <h4 className="mt-0">
                  {editingId ? "Edit Link mailbox" : "Link mailbox"}
                </h4>
                <form onSubmit={handleSubmitSMTP}>
                  <div className="row flex-col-640">
                    <div className="col col-12-640">
                      <div className="form-group">
                        <label>Host</label>
                        <input
                          name="server"
                          placeholder="Host"
                          value={form.server}
                          onChange={handleChangeSMTP}
                          required
                        />
                        <br />
                      </div>
                    </div>
                    <div className="col col-12-640">
                      <div className="form-group">
                        <label>Port</label>
                        <input
                          name="port"
                          type="number"
                          placeholder="Port"
                          value={form.port}
                          onChange={handleChangeSMTP}
                          required
                        />
                        <br />
                      </div>
                    </div>
                    <div className="col col-12-640">
                      <div className="form-group">
                        <label>Username</label>
                        <input
                          name="username"
                          placeholder="Username"
                          value={form.username}
                          onChange={handleChangeSMTP}
                          required
                        />
                        <br />
                      </div>
                    </div>
                    <div className="col col-12-640">
                      <div className="form-group">
                        <label>Password</label>
                        <input
                          name="password"
                          type="password"
                          placeholder="Password"
                          value={form.password}
                          onChange={handleChangeSMTP}
                          required
                        />
                        <br />
                      </div>
                    </div>
                    <div className="col col-12-640">
                      <div className="form-group">
                        <label>From email</label>
                        <input
                          name="fromEmail"
                          placeholder="From email"
                          value={form.fromEmail}
                          onChange={handleChangeSMTP}
                          required
                        />
                        <br />
                      </div>
                    </div>
                  </div>
                  <div className="d-flex justify-end">
                    <div className="form-group d-flex align-center justify-end">
                      <input
                        type="checkbox"
                        name="usessl"
                        checked={form.usessl}
                        onChange={handleChangeSMTP}
                      />
                      <span className="ml-5 font-size-12 nowrap mr-10">
                        Use SSL
                      </span>
                      <button className="save-button button full" type="submit">
                        {editingId ? "Update" : "Add"}
                      </button>
                    </div>
                  </div>
                </form>

                <h4 className="">Mailboxes</h4>
                <div className="table-container">
                  <table
                    className="responsive-table"
                    style={{ border: "1" }}
                    cellPadding="10"
                    width="100%"
                  >
                    <thead>
                      <tr>
                        <th>Server</th>
                        <th>Port</th>
                        <th>Username</th>
                        <th>From email address</th>
                        <th>SSL</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {smtpList.map((item, index) => (
                        <tr key={item.id || index}>
                          <td>{item.server}</td>
                          <td>{item.port}</td>
                          <td>{item.username}</td>
                          <td>{item.fromEmail}</td>
                          <td>{item.usessl ? "False" : "True"}</td>
                          <td>
                            <button
                              className="save-button button small"
                              onClick={() => handleEdit(item)}
                            >
                              Edit
                            </button>{" "}
                            <button
                              className="save-button button small"
                              onClick={() => handleDelete(item.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {smtpList.length === 0 && (
                        <tr>
                          <td>No records found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* BCC Email Management Section */}
                <h4 className="mt-4">BCC Email Management</h4>
                <div className="bcc-email-section">
                  {bccError && <div className="error-message">{bccError}</div>}
                  <div className="bcc-add-form">
                    <div className="row align-center">
                      <div className="col col-8 col-12-640">
                        <div className="form-group mb-0">
                          <input
                            type="email"
                            placeholder="Add BCC Email"
                            value={newBccEmail}
                            onChange={(e) => setNewBccEmail(e.target.value)}
                            disabled={bccLoading}
                            className="form-control"
                          />
                        </div>
                      </div>
                      <div className="col col-4 col-12-640">
                        <button
                          className="save-button button small full"
                          onClick={handleAddBcc}
                          disabled={bccLoading || !newBccEmail}
                        >
                          {bccLoading ? "Adding..." : "Add BCC"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bcc-list mt-3">
                    {bccLoading ? (
                      <div className="loading-message">
                        Loading BCC emails...
                      </div>
                    ) : bccEmails.length === 0 ? (
                      <div className="empty-message">
                        No BCC emails configured.
                      </div>
                    ) : (
                      <div className="table-container">
                        <table
                          className="responsive-table"
                          cellPadding="10"
                          width="100%"
                        >
                          <thead>
                            <tr>
                              <th>BCC Email Address</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bccEmails.map((email) => (
                              <tr key={email.id}>
                                <td>{email.bccEmailAddress}</td>
                                <td>
                                  <button
                                    className="secondary button small"
                                    onClick={() => handleDeleteBcc(email.id)}
                                    disabled={bccLoading}
                                    title="Delete this BCC address"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {tab === "Schedule" && (
        <div className="tabs secondary d-flex align-center">
          <div className="input-section edit-section">
            <div className="table-container">
              <h5>{editingId ? "Edit Schedule" : "Add Schedule"}</h5>
              <form onSubmit={handleSubmitSchedule} className="space-y-4">
                <div className="row">
                  <div className="col col-3">
                    <div className="form-group">
                      <label>
                        Sequence Name: <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title || ""} // Remove trim() here
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="col col-3">
                    <div className="form-group">
                      <label>
                        Data files of contacts{" "}
                        <span className="required">*</span>
                      </label>
                      <select
                        name="model"
                        id="model"
                        onChange={handleZohoModelChange1}
                        value={selectedZohoviewId1?.trim() || ""}
                        className={
                          !selectedZohoviewId1 ? "highlight-required" : ""
                        }
                        disabled={
                          scheduleDataLoading || scheduleDataFiles.length === 0
                        }
                      >
                        <option value="">Please select a data file</option>
                        {scheduleDataFiles.map((file) => (
                          <option key={file.id} value={file.id.toString()}>
                            {file.name}
                          </option>
                        ))}
                      </select>
                      {!selectedZohoviewId1 && scheduleDataFiles.length > 0 && (
                        <small className="error-text">
                          Please select a data file
                        </small>
                      )}
                      {scheduleDataLoading && (
                        <small>Loading data files...</small>
                      )}
                      {!scheduleDataLoading &&
                        scheduleDataFiles.length === 0 && (
                          <small>No data files available</small>
                        )}
                    </div>
                    {(emailLoading || scheduleDataLoading) && (
                      <div className="loader-overlay">
                        <div className="loader"></div>
                      </div>
                    )}
                  </div>

                  <div className="col col-3">
                    <div className="form-group">
                      <label>Timezone:</label>
                      <select
                        name="timeZone"
                        value={formData.timeZone?.trim() || ""}
                        onChange={handleChange}
                        className={
                          !formData.timeZone ? "highlight-required" : ""
                        }
                      >
                        <option value="">Please select timezone</option>
                        {timezoneOptions.map((tz) => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>
                      {!formData.timeZone && (
                        <small className="error-text">
                          Please select a timezone
                        </small>
                      )}
                    </div>
                  </div>
                  <div className="col col-3">
                    <div className="form-group">
                      <label>From</label>
                      <select
                        value={selectedUser}
                        onChange={handleChangeSmtpUsers}
                      >
                        <option value="">Select email</option>
                        {smtpUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.username}
                          </option>
                        ))}
                      </select>
                      {!selectedUser && (
                        <small className="error-text">
                          Please select a from email
                        </small>
                      )}
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col col-3">
                    <div className="form-group">
                      <label>BCC</label>
                      <input
                        type="text"
                        name="bccEmail"
                        value={formData.bccEmail?.trim() || ""}
                        onChange={handleChange}
                        pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                      />
                      {bccError && (
                        <small style={{ color: "red" }}>{bccError}</small>
                      )}
                    </div>
                  </div>
                  <div className="col col-3">
                    <div className="form-group">
                      <label>
                        Scheduled date <span className="required">*</span>
                      </label>
                      <input
                        type="date"
                        name="scheduledDate"
                        value={formData.scheduledDate || ""}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="col col-3">
                    <div className="form-group">
                      <label>
                        Scheduled time <span className="required">*</span>
                      </label>
                      <input
                        type="time"
                        name="scheduledTime"
                        value={formData.scheduledTime || ""}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="save-button button full"
                  disabled={!isFormValid}
                >
                  {editingId
                    ? "Edit Schedule Delivery"
                    : "Add Schedule Delivery"}
                </button>
              </form>

              {/* Pagination controls */}
              <div className="d-flex flex-col-1200 mb-10-991 mt-10-991">
                <h5>Scheduled </h5>
                <div
                  className="d-flex mr-10 align-center"
                  style={{ justifyContent: "flex-end", padding: "0 72%" }}
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
                      cursor: "pointer",
                    }}
                    title="Click to go to the previous generated email"
                  >
                    <img
                      src={singleprvIcon}
                      alt="Previous"
                      style={{
                        width: "20px",
                        height: "20px",
                        objectFit: "contain",
                        marginRight: "5px",
                      }}
                    />
                    <span>Previous</span>
                  </button>

                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(
                    (page) => (
                      <button
                        key={page}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "5px 10px",
                          backgroundColor: "#f0f0f0",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          cursor: "pointer",
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
                      cursor: "pointer",
                    }}
                    title="Click to go to the next generated email"
                  >
                    <span>Next</span>
                    <img
                      src={singlenextIcon}
                      alt="Next"
                      style={{
                        width: "20px",
                        height: "20px",
                        objectFit: "contain",
                        marginLeft: "5px",
                      }}
                    />
                  </button>
                </div>
              </div>

              <table
                className="responsive-table"
                style={{ border: "1" }}
                cellPadding="10"
                width="100%"
              >
                <thead>
                  <tr>
                    <th>Sequence name</th>
                    <th>Data files of contacts</th>
                    <th>From</th>
                    <th>Scheduled Date</th>
                    <th>Scheduled Time</th>
                    <th>Timezone</th>
                    <th>BCC</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.length === 0 ? (
                    <tr>
                      <td colSpan={8}>No data found</td>
                    </tr>
                  ) : (
                    currentData.map((item, index) => {
                      // Find the data file name
                      const dataFile = scheduleDataFiles.find(
                        (file) => file.id === item.dataFileId
                      );

                      // Find the SMTP user email
                      const smtpUser = smtpUsers.find(
                        (user) => user.id === item.smtpID
                      );

                      // Format date and time
                      const scheduledDate = item.scheduledDate
                        ? new Date(item.scheduledDate).toLocaleDateString()
                        : "-";

                      const scheduledTime = item.scheduledTime || "-";

                      return (
                        <tr key={item.id || index}>
                          <td>{item.title}</td>
                          <td>{dataFile?.name || item.zohoviewName || "-"}</td>
                          <td>{smtpUser?.username || "-"}</td>
                          <td>{scheduledDate}</td>
                          <td>{scheduledTime}</td>
                          <td>{item.timeZone}</td>
                          <td>{item.bccEmail}</td>
                          <td>
                            <button
                              className="save-button button small"
                              onClick={() => handleEditSchedule(item)}
                            >
                              Edit
                            </button>{" "}
                            <button
                              className="save-button button small"
                              onClick={() => handleDeleteSchedule(item.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mail;
