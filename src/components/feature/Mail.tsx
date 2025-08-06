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
import MailDashboard from './MailDashboard';
import type { EventItem, EmailLog } from "../../contexts/AppDataContext";


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



  
  const [isCopyText, setIsCopyText] = useState(false);
const { saveFormState, getFormState, refreshTrigger } = useAppData();
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
  setTab(innerText);

  // Save current state when changing tabs


  if (onTabChange) {
    onTabChange(innerText);
  }
};


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
        alert("Error deleting SMTP");
      }
    }
  };
  //End SMTP

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
// Add this useEffect after your existing useEffects

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
    setDashboardData(prev => ({
      ...prev,
      ...data
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
          <div className="tabs secondary d-flex align-center">
            <div className="input-section edit-section w-full">
              {/* Inline edit Link mailbox form */}
              {/* <h4 className="mt-0">
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
          </form> */}

              <h2 className="!text-left">Mailboxes</h2>
              <div className="table-container mb-[30px]">
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
                        <td colSpan={6}>No records found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {/* Add Prompt Modal */}
                <Modal
                  show={openModals["modal-edit-link-mailbox"]}
                  closeModal={() => handleModalClose("modal-edit-link-mailbox")}
                  buttonLabel="Close"
                  size="!w-[500px] !h-[auto]"
                >
                  <form onSubmit={handleSubmitSMTP}>
                    <h2 className="!text-left">Edit link mailbox</h2>
                    <div className="flex gap-4">
                      <div className="form-group flex-1">
                        <label>Host</label>
                        <input
                          name="server"
                          placeholder="Host"
                          value={form.server}
                          onChange={handleChangeSMTP}
                          required
                        />
                      </div>
                      <div className="form-group flex-1">
                        <label>Port</label>
                        <input
                          name="port"
                          type="number"
                          placeholder="Port"
                          value={form.port}
                          onChange={handleChangeSMTP}
                          required
                        />
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="form-group flex-1">
                        <label>Username</label>
                        <input
                          name="username"
                          placeholder="Username"
                          value={form.username}
                          onChange={handleChangeSMTP}
                          required
                        />
                      </div>
                      <div className="form-group flex-1">
                        <label>Password</label>
                        <input
                          name="password"
                          type="password"
                          placeholder="Password"
                          value={form.password}
                          onChange={handleChangeSMTP}
                          required
                        />
                      </div>
                    </div>
                    <div className="flex">
                      <div className="form-group  flex-1">
                        <label>From email</label>
                        <input
                          name="fromEmail"
                          placeholder="From email"
                          value={form.fromEmail}
                          onChange={handleChangeSMTP}
                          required
                        />
                      </div>
                    </div>
                    <div className="d-flex justify-end">
                      <span className="flex items-center">
                        <input
                          type="checkbox"
                          name="usessl"
                          checked={form.usessl}
                          onChange={handleChangeSMTP}
                          id="use-ssl"
                        />
                        <label
                          className="ml-5 !mb-[0] font-size-12 nowrap mr-10 font-[600]"
                          htmlFor="use-ssl"
                        >
                          Use SSL
                        </label>
                      </span>
                      <button
                        className="save-button button min-w-[150px]"
                        type="submit"
                      >
                        {editingId ? "Update" : "Add"}
                      </button>
                    </div>
                  </form>
                </Modal>
              </div>

              {/* BCC Email Management Section */}
              <h2 className="!text-left">BCC Email Management</h2>
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
                    <div className="loading-message">Loading BCC emails...</div>
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
                        List{" "}
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
                        <option value="">Select a list</option>
                        {scheduleDataFiles.map((file) => (
                          <option key={file.id} value={file.id.toString()}>
                            {file.name}
                          </option>
                        ))}
                      </select>
                      {!selectedZohoviewId1 && scheduleDataFiles.length > 0 && (
                        <small className="error-text">
                          Select a list
                        </small>
                      )}
                      {scheduleDataLoading && (
                        <small>Loading list...</small>
                      )}
                      {!scheduleDataLoading &&
                        scheduleDataFiles.length === 0 && (
                          <small>No list available</small>
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
                    <th>List</th>
                    <th>From</th>
                    <th>Scheduled date</th>
                    <th>Scheduled time</th>
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
