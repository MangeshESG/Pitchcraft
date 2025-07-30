import { useRef, useCallback, useState, useEffect } from "react";
import Modal from "../common/Modal";
import { Tooltip as ReactTooltip } from "react-tooltip";
import { copyToClipboard } from "../../utils/utils";
import previousIcon from "../../assets/images/previous.png";
import nextIcon from "../../assets/images/Next.png";
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
import SMTPTable from "./Mail";
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
  fullName: string;
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
  scheduledDate: Date;
  scheduledTime: Time;
  timeZone: string;
  smtpID: number;
  smtpName: string;
  zohoviewName: string;
  zohoViewName: string;
  isSent: boolean;
  testIsSent: boolean;
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
  allResponses,
  isPaused,
  setAllResponses,
  currentIndex,
  setCurrentIndex,
  onClearOutput,
  allprompt,
  setallprompt,
  allsearchResults,
  setallsearchResults,
  everyscrapedData,
  seteveryscrapedData,
  allSearchTermBodies,
  setallSearchTermBodies,
  onClearContent, // Add this line
  allsummery,
  setallsummery,
  existingResponse,
  setexistingResponse,
  currentPage,
  setCurrentPage,
  prevPageToken,
  nextPageToken,
  fetchAndDisplayEmailBodies,
  selectedZohoviewId,
  onClearExistingResponse,
  isResetEnabled, // Receive the prop
  zohoClient, // Add this to the destructured props
  selectedClient,
  initialTab = "Dashboard",
  onTabChange,
}) => {

   




  const [isCopyText, setIsCopyText] = useState(false);

  const copyToClipboardHandler = async () => {
    const contentToCopy = combinedResponses[currentIndex]?.pitch || "";

    if (contentToCopy) {
      try {
        // Use the existing copyToClipboard utility function
        const copied = await copyToClipboard(contentToCopy);
        setIsCopyText(copied);

        // Reset the copied state after 1 second
        setTimeout(() => {
          setIsCopyText(false);
        }, 1000);
      } catch (err) {
        console.error("Error copying text:", err);
      }
    }
  };

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
    setAllResponses([]); // Clear all responses
    setCurrentIndex(0); // Reset current index to 0
    setallprompt([]); // Clear all prompts
    setallsearchResults([]); // Clear all search results
    seteveryscrapedData([]); // Clear all scraped data
    setallSearchTermBodies([]); // Clear all search term bodies
    setallsummery([]);
    setCombinedResponses([]); //Clear allCombinedResponses
    setCombinedResponses([]); // Clear combinedResponses
    setexistingResponse([]);
    setExistingDataIndex(0);
    setCurrentIndex(0); // Use the prop to reset currentIndex
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

  const [existingDataIndex, setExistingDataIndex] = useState(0);

  useEffect(() => {
    if (onClearExistingResponse) {
      onClearExistingResponse(() => clearExistingResponse);
    }
  }, [onClearExistingResponse]);

  const clearExistingResponse = () => {
    setexistingResponse([]); // Clear the existingResponse state
    setExistingDataIndex(0); // Reset the index
  };

  useEffect(() => {
    // Keep currentIndex as is when new responses are added
    if (currentIndex >= combinedResponses.length) {
      setCurrentIndex(combinedResponses.length - 1);
    }
  }, [allResponses, currentIndex, setCurrentIndex]);

  const [combinedResponses, setCombinedResponses] = useState<any[]>([]);

  useEffect(() => {
    // Prioritize allResponses, then add unique existingResponses
    let newCombinedResponses = [...allResponses]; // Start with fresh responses

    existingResponse.forEach((existing) => {
      if (!newCombinedResponses.find((nr) => nr.id === existing.id)) {
        newCombinedResponses.push(existing);
      }
    });

    setCombinedResponses(newCombinedResponses);
  }, [allResponses, existingResponse]);

  useEffect(() => {
    if (
      combinedResponses.length > 0 &&
      combinedResponses[combinedResponses.length - 1]?.nextPageToken
    ) {
      setCurrentIndex(combinedResponses.length - 1);
    }
  }, [combinedResponses]);

  const handleNextPage = async () => {
    if (currentIndex < combinedResponses.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      const lastItem = combinedResponses[combinedResponses.length - 1];
      if (lastItem?.nextPageToken) {
        setEmailLoading(true);
        try {
          await fetchAndDisplayEmailBodies(
            selectedZohoviewId1,
            lastItem.nextPageToken,
            "next"
          );
          setCurrentIndex(combinedResponses.length);
        } finally {
          setEmailLoading(false);
        }
      }
    }
  };

  const handlePrevPage = async () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      const firstItem = combinedResponses[0];
      if (firstItem?.prevPageToken) {
        setEmailLoading(true);
        try {
          await fetchAndDisplayEmailBodies1(
            selectedZohoviewId1,
            firstItem.prevPageToken,
            "previous"
          );
          // No need to update currentIndex here, as prepending maintains the current item's position
        } finally {
          setEmailLoading(false);
        }
      }
    }
  };

  const handleFirstPage = () => {
    setCurrentIndex(0);
  };

  const handleLastPage = () => {
    setCurrentIndex(combinedResponses.length - 1);
  };

  // Add this state to track the input value separately from the currentIndex
  const [inputValue, setInputValue] = useState<string>(
    (currentIndex + 1).toString()
  );

  // Update inputValue whenever currentIndex changes
  useEffect(() => {
    setInputValue((currentIndex + 1).toString());
  }, [currentIndex]);

  const handleIndexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Always update the input field value
    setInputValue(newValue);

    // Only update the actual index if we have a valid number
    if (newValue.trim() !== "") {
      const pageNumber = parseInt(newValue, 10);

      if (!isNaN(pageNumber) && pageNumber > 0) {
        // Ensure it doesn't exceed the maximum
        const validPageNumber = Math.min(pageNumber, combinedResponses.length);

        // Convert to zero-based index
        setCurrentIndex(validPageNumber - 1);
      }
    } else {
      // If input is cleared, default to index 0 (first item)
      setCurrentIndex(0);
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    console.table(combinedResponses);
  }, [combinedResponses]);

  useEffect(() => {
    sessionStorage.setItem("currentIndex", currentIndex.toString());
  }, [currentIndex]);

  useEffect(() => {
    const storedCurrentIndex = sessionStorage.getItem("currentIndex");
    if (storedCurrentIndex !== null) {
      setCurrentIndex(parseInt(storedCurrentIndex, 10));
    }
  }, [setCurrentIndex]);

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
    handleModalOpen("modal-edit-link-mailbox")
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
  // const [emailLoading, setEmailLoading] = useState(false); // Loading state for fetching email data
  //const [zohoClient1, setZohoClient1] = useState<ZohoClient[]>([]);
  //  const [clearExistingResponse, setClearExistingResponse] = useState<
  //  () => void
  //  >(() => {});
  //  const [existingResponse, setexistingResponse] = useState<any[]>([]);
  const [nextPageToken1, setNextPageToken1] = useState<string | null>(null);
  const [prevPageToken1, setPrevPageToken1] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // Initial loading state for fetching Zoho clients

  // useEffect(() => {
  //   const fetchZohoClient1 = async () => {
  //     setLoading(true);
  //     try {
  //       let url = `${API_BASE_URL}/api/auth/zohoclientid`;
  //       if (selectedClient) {
  //         url += `/${selectedClient}`;
  //       } else if (clientID) {
  //         url += `/${clientID}`;
  //       } else {
  //         console.error("No client ID available");
  //         setLoading(false);
  //         return;
  //       }

  //       const response = await fetch(url);
  //       if (!response.ok) {
  //         throw new Error(`HTTP error! status: ${response.status}`);
  //       }
  //       const data: ZohoClient[] = await response.json();
  //       setZohoClient1(data);
  //     } catch (error) {
  //       console.error("Error fetching zoho client id:", error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchZohoClient1();
  // }, [selectedClient, clientID]);

  const handleZohoModelChange1 = async (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const selectedId = event.target.value;
    setSelectedZohoviewId1(selectedId);

    handleNewDataFileSelection();

    if (selectedId) {
      try {
        await fetchAndDisplayEmailBodies1(selectedId);
      } catch (error) {
        console.error("Error fetching email bodies:", error);
      }
    }
  };

  const handleNewDataFileSelection = () => {
    if (clearExistingResponse) {
      clearExistingResponse();
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
  //[effectiveUserId]
  // end Schedule Tab js code
  const [showSchedulePopup, setShowSchedulePopup] = useState(false);

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

  // Handle Add/Update Submit
  const handleSubmitSchedule = async (e: any) => {
    e.preventDefault();

    const selectedTimeZone = formData.timeZone;
    const scheduledDate = formData.scheduledDate; // New field!
    const scheduledTime = formData.scheduledTime; // New field!

    // Check if date and time are filled in (should be enforced by 'required' attribute)
    if (!scheduledDate || !scheduledTime) {
      alert("Please select both scheduled date and time.");
      return;
    }

    // Combine date + time into a moment object, interpret in selected timeZone
    const localMoment = moment.tz(
      `${scheduledDate}T${scheduledTime}`,
      selectedTimeZone
    );

    // Convert to UTC for backend payload if needed
    const utcMoment = localMoment.clone().utc();

    // Prepare payload in the expected array format
    const stepsPayload = [
      {
        ScheduledDate: utcMoment.format("YYYY-MM-DD"),
        ScheduledTime: utcMoment.format("HH:mm:ss"),
      },
    ];

    const payload = {
      Title: formData.title,
      zohoviewName: selectedZohoviewId1, //zohoviewId
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

      // Step 3: Clear form and refresh list
      setFormData({
        title: "",
        timeZone: "",
        scheduledDate: "",
        scheduledTime: "",
        EmailDeliver: "", // <--- include this even if you no longer use it!
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
    setSelectedZohoviewId1(item.zohoviewName);
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

  const [editableContent, setEditableContent] = useState(
    combinedResponses[currentIndex]?.pitch || ""
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const saveEditedContent = async () => {
    setIsSaving(true);
    try {
      // Create the updated item with new pitch
      const updatedItem = {
        ...combinedResponses[currentIndex],
        pitch: editableContent,
      };

      const saveToZoho = async (
        content: string,
        responseId: string | number | undefined
      ): Promise<any> => {
        if (!responseId) {
          throw new Error("Contact ID is required to update in Zoho");
        }

        try {
          // Get contact details from the current item
          const currentContact = combinedResponses[currentIndex];
          const full_name =
            currentContact?.name || currentContact?.full_Name || "N/A";
          const company_name =
            currentContact?.company ||
            currentContact?.account_name_friendlySingle_Line_12 ||
            "N/A";
          const email = currentContact?.email || "N/A";

          // Make API call to update Zoho
          const updateContactResponse = await fetch(
            `${API_BASE_URL}/api/auth/updatezoho`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                contactId: responseId,
                emailBody: content,
                accountId: "String", // Change to proper account id if available
              }),
            }
          );

          if (!updateContactResponse.ok) {
            const updateContactError = await updateContactResponse.json();
            // You can add UI feedback here similar to your regeneration code
            console.error("Failed to update in Zoho:", updateContactError);

            // Add to output log if needed
            setOutputForm((prevOutputForm) => ({
              ...prevOutputForm,
              generatedContent:
                `<span style="color: orange">[${formatDateTime(
                  new Date()
                )}] Updating contact in database incomplete for contact ${full_name} with company name ${company_name}. Error: ${
                  updateContactError.Message
                }</span><br/>` + prevOutputForm.generatedContent,
            }));

            throw new Error(
              `Failed to update in Zoho: ${
                updateContactError.Message || "Unknown error"
              }`
            );
          }

          // Success case
          console.log("Successfully updated in Zoho");

          // Add to output log if needed
          setOutputForm((prevOutputForm) => ({
            ...prevOutputForm,
            generatedContent:
              `<span style="color: green">[${formatDateTime(
                new Date()
              )}] Updated pitch in database for contact ${full_name} with company name ${company_name}.</span><br/>` +
              prevOutputForm.generatedContent,
          }));

          return await updateContactResponse.json();
        } catch (error) {
          console.error("Error saving to Zoho:", error);
          throw error;
        }
      };

      const formatDateTime = (date: Date): string => {
        return date.toLocaleString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });
      };

      // First save to Zoho before updating UI
      await saveToZoho(editableContent, combinedResponses[currentIndex]?.id);

      // Update combinedResponses
      const updatedCombinedResponses = [...combinedResponses];
      updatedCombinedResponses[currentIndex] = updatedItem;
      setCombinedResponses(updatedCombinedResponses);

      // Also update the source arrays to ensure persistence
      // First, check if the item exists in allResponses
      const allResponsesIndex = allResponses.findIndex(
        (item) => item.id === combinedResponses[currentIndex].id
      );

      if (allResponsesIndex !== -1) {
        // Update in allResponses
        const updatedAllResponses = [...allResponses];
        updatedAllResponses[allResponsesIndex] = updatedItem;
        setAllResponses(updatedAllResponses);
      } else {
        // Check if it exists in existingResponse
        const existingResponseIndex = existingResponse.findIndex(
          (item) => item.id === combinedResponses[currentIndex].id
        );

        if (existingResponseIndex !== -1) {
          // Update in existingResponse
          const updatedExistingResponse = [...existingResponse];
          updatedExistingResponse[existingResponseIndex] = updatedItem;
          setexistingResponse(updatedExistingResponse);
        }
      }

      // Exit editing mode
      setIsEditing(false);

      // Success message
      toast.success("Content saved successfully!");

      // Here you would also call your Zoho API to persist the changes externally
      // For now, we'll just log it
      console.log("Would save to Zoho:", {
        id: combinedResponses[currentIndex].id,
        pitch: editableContent,
      });
    } catch (error) {
      console.error("Failed to save content:", error);
      toast.error("Failed to save content. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Email device width
  const [outputEmailWidth, setOutputEmailWidth] = useState<string>("");

  const toggleOutputEmailWidth = (deviceName: string) => {
    setOutputEmailWidth(deviceName);
  };

  // Add this useEffect to handle the initialization
  useEffect(() => {
    if (isEditing && editorRef.current) {
      // Update editor content whenever the current index changes or when entering edit mode
      editorRef.current.innerHTML = editableContent;
    }
  }, [isEditing, editableContent, currentIndex]);

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
    { zohoviewId: string; zohoviewName: string }[]
  >([]);
  const [requestCount, setRequestCount] = useState(0);
  const [allEventData, setAllEventData] = useState<EventItem[]>([]);
  const [filteredEventData, setFilteredEventData] = useState<EventItem[]>([]);
  const [filteredEventType, setFilteredEventType] = useState<
    "Open" | "Click" | null
  >(null);

  const fetchEventData = async () => {
    try {
      // Replace with your real API endpoint
      const response = await axios.get(
        `${API_BASE_URL}/track/logs/by-client?ClientId=${effectiveUserId}`
      );

      const data1 = response.data;
      const stats: ClientStats = {};
      data1.forEach((item: any) => {
        const { clientId, eventType } = item;
        if (!stats[clientId]) {
          stats[clientId] = { Open: 0, Click: 0 };
        }
        if (eventType === "Open" || eventType === "Click") {
          stats[clientId][eventType as "Open" | "Click"]++;
        }
      });
      setClientStats(stats);
      setLoading(false);

      const data: EventItem[] = response.data;
      setAllEventData(data); // this stores the full data set

      // Aggregate counts grouped by date (YYYY-MM-DD)
      const statsMap: Record<string, DailyStats> = {};

      let totalRequests = 0,
        totalOpens = 0,
        totalClicks = 0;

      data.forEach((item) => {
        // Extract date only (YYYY-MM-DD) from timestamp
        const date = item.timestamp.split("T")[0];

        if (!statsMap[date]) {
          statsMap[date] = {
            date,
            sent: 0,
            opens: 0,
            clicks: 0,
          };
        }

        // Count event types
        if (item.eventType === "Open") {
          statsMap[date].opens++;
          totalOpens++;
        } else if (item.eventType === "Click") {
          statsMap[date].clicks++;
          totalClicks++;
        } else if (item.eventType === "Request") {
          statsMap[date].sent++;
          totalRequests++;
        }
      });

      // Convert map to sorted array by date ascending
      const sortedStats = Object.values(statsMap).sort((a, b) =>
        a.date.localeCompare(b.date)
      );

      setDailyStats(sortedStats);
      setTotalStats({
        sent: totalRequests,
        opens: totalOpens,
        clicks: totalClicks,
      });
      setFilteredEventData(data); // Save full data

      setLoading(false);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to fetch event data.");
      setLoading(false);
    }
  };

  // Rename your function to be more descriptive
  const fetchEmailLogs = async (clientId: number, zohoViewName: string) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/track/logs`, // Make sure this matches your API endpoint
        {
          params: {
            clientId,
            zohoViewName,
          },
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );
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
    zohoViewId: string
  ) => {
    try {
      // Fetch tracking logs (opens and clicks)
      const response = await axios.get(
        `${API_BASE_URL}/track/logs/by-client-viewid`,
        {
          params: {
            clientId,
            zohoViewName: zohoViewId,
          },
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      // Fetch email logs for sent count
      const emailLogs = await fetchEmailLogs(clientId, zohoViewId);

      // Store ALL data without filtering
      const allTrackingData: EventItem[] = response.data.logs || [];
      const allEmailLogsData = emailLogs || [];

      // Store the raw data
      setAllEventData(allTrackingData);
      setAllEmailLogs(allEmailLogsData); // You'll need to add this state

      // Process data without date filtering
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

      // Refresh all data
      await fetchLogsByClientAndView(Number(effectiveUserId), selectedView);

      // Reapply event type filter if it exists
      if (filteredEventType) {
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
        // Fetch available views
        const response = await axios.get(
          `${API_BASE_URL}/api/auth/zohoclientid/${effectiveUserId}`,
          {
            headers: {
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );
        setAvailableViews(response.data);

        // Don't automatically select or fetch data
        // Let the user select a view first
        setSelectedView(""); // Ensure no view is selected initially
        setRequestCount(0); // Ensure request count is 0 initially
      } catch (error) {
        console.error("Error initializing data:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [effectiveUserId]);

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
      await fetchLogsByClientAndView(Number(effectiveUserId), newViewId);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (allEventData.length > 0 || allEmailLogs.length > 0) {
      processDataWithDateFilter(allEventData, allEmailLogs, startDate, endDate);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        // Clear previous user's data
        setAvailableViews([]);
        setSelectedView("");
        setAllEventData([]);
        setAllEmailLogs([]);
        setFilteredEventData([]);
        setDailyStats([]);
        setTotalStats({ sent: 0, opens: 0, clicks: 0 });
        setRequestCount(0);

        // Fetch available views for new user
        const response = await axios.get(
          `${API_BASE_URL}/api/auth/zohoclientid/${effectiveUserId}`,
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
         


          {/* View Dropdown and Date Filters */}
          <div
            className="form-group d-flex align-center"
            style={{ margin: "20px 0", gap: "10px" }}
          >
            <div>
              <label>
                Zoho View: <span style={{ color: "red" }}>*</span>
              </label>
              <select
                value={selectedView}
                onChange={handleViewChange}
                style={{
                  border: !selectedView ? "1px solid red" : "1px solid #ccc",
                }}
              >
                <option value="">-- Please Select a View --</option>
                {availableViews.map((view) => (
                  <option key={view.zohoviewId} value={view.zohoviewId}>
                    {view.zohoviewName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Start Date:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate || undefined} // Prevent start date from being after end date
              />
            </div>
            <div>
              <label>End Date:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined} // Prevent end date from being before start date
              />
            </div>
            {(startDate || endDate) && (
              <button
                className="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                style={{ alignSelf: "flex-end" }}
              >
                Clear Dates
              </button>
            )}
          </div>
          <div className="stats-cards">
            <div className="card">
              <h3>Sent</h3>
              {loading ? (
                <p>Loading...</p>
              ) : !selectedView ? (
                <p style={{ fontSize: 24 }}>-</p>
              ) : (
                <p style={{ fontSize: 24 }}>{requestCount}</p>
              )}
            </div>
            <div className="card orange">
              <h3>Unique Opens</h3>
              {loading ? (
                <p>Loading...</p>
              ) : !selectedView ? (
                <p style={{ fontSize: 24 }}>-</p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "center",
                  }}
                >
                  <p style={{ fontSize: 24, margin: 0 }}>{totalStats.opens}</p>
                  <p
                    style={{
                      fontSize: 16,
                      color: "#FF8042",
                      marginLeft: 8,
                      margin: 0,
                      fontWeight: "normal",
                    }}
                  >
                    ({openRate}%)
                  </p>
                </div>
              )}
            </div>
            <div className="card blue">
              <h3>Unique Clicks</h3>
              {loading ? (
                <p>Loading...</p>
              ) : !selectedView ? (
                <p style={{ fontSize: 24 }}>-</p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "center",
                  }}
                >
                  <p style={{ fontSize: 24, margin: 0 }}>{totalStats.clicks}</p>
                  <p
                    style={{
                      fontSize: 16,
                      color: "#8884d8",
                      marginLeft: 8,
                      margin: 0,
                      fontWeight: "normal",
                    }}
                  >
                    ({clickRate}%)
                  </p>
                </div>
              )}
            </div>
          </div>

          {dashboardTab === "Overview" && (
            <>
              {/* Stats cards */}
              {/* Stats cards */}

              {/* Line chart */}
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
            </>
          )}

          {dashboardTab === "Details" && (
            <>
              <div className="event-buttons" style={{ marginTop: "20px" }}>
                <button
                  onClick={() => handleFilterEvents("Open")}
                  className="button"
                >
                  Show Opens
                </button>
                <button
                  onClick={() => handleFilterEvents("Click")}
                  className="button ml-10"
                >
                  Show Clicks
                </button>
                <button
                  onClick={handleRefresh}
                  className="button"
                  disabled={isRefreshing}
                >
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              {filteredEventType && (
                <div style={{ marginTop: "20px" }}>
                  <h3 style={{ marginBottom: "10px" }}>
                    {filteredEventType} Events
                  </h3>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      marginTop: "10px",
                    }}
                  >
                    <thead>
                      <tr
                        style={{ backgroundColor: "#f5f5f5", fontWeight: 600 }}
                      >
                        <th style={cellStyle}>Full Name</th>
                        <th style={cellStyle}>Email</th>
                        <th style={cellStyle}>Company</th>
                        <th style={cellStyle}>Job Title</th>
                        <th style={cellStyle}>Location</th>
                        <th style={cellStyle}>Timestamp</th>
                        {filteredEventType === "Click" && (
                          <th style={cellStyle}>Target URL</th>
                        )}
                        <th style={cellStyle}>LinkedIn</th>
                        <th style={cellStyle}>Website</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEventData.map((item, index) => (
                        <tr
                          key={item.id}
                          style={{
                            backgroundColor:
                              index % 2 === 0 ? "#ffffff" : "#f9f9f9",
                          }}
                        >
                          <td style={cellStyle}>{item.fullName}</td>
                          <td style={cellStyle}>{item.email}</td>
                          <td style={cellStyle}>{item.company}</td>
                          <td style={cellStyle}>{item.jobTitle}</td>
                          <td style={cellStyle}>{item.location}</td>
                          <td style={cellStyle}>
                            {formatMailTimestamp(item.timestamp)}
                          </td>
                          {filteredEventType === "Click" && (
                            <td style={cellStyle}>
                              {item.targetUrl ? (
                                <a
                                  href={item.targetUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    color: "#1a0dab",
                                    textDecoration: "underline",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {item.targetUrl}
                                </a>
                              ) : (
                                "-"
                              )}
                            </td>
                          )}
                          <td style={cellStyle}>
                            <a
                              href={item.linkedin_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: "#1a0dab",
                                textDecoration: "underline",
                              }}
                            >
                              LinkedIn
                            </a>
                          </td>
                          <td style={cellStyle}>
                            <a
                              href={item.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: "#1a0dab",
                                textDecoration: "underline",
                              }}
                            >
                              Website
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
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
                closeModal={() =>
                  handleModalClose("modal-edit-link-mailbox")
                }
                buttonLabel="Close"
                size="!w-[500px]"
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
                      <label className="ml-5 !mb-[0] font-size-12 nowrap mr-10 font-[600]" htmlFor="use-ssl">
                        Use SSL
                      </label>
                      </span>
                      <button className="save-button button min-w-[150px]" type="submit">
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
                <div className="empty-message">No BCC emails configured.</div>
              ) : (
                <div className="table-container">
                  <table className="responsive-table" cellPadding="10" width="100%">
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
                      >
                        <option value="">Please select a data file</option>
                        {zohoClient.map((val) => (
                          <option key={val.id} value={val.zohoviewId}>
                            {val.zohoviewName}
                          </option>
                        ))}
                      </select>
                      {!selectedZohoviewId1 && (
                        <small className="error-text">
                          Please select a data file
                        </small>
                      )}
                    </div>
                    {emailLoading && (
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
                    {/* <th>Data files of contacts</th> */}
                    <th>Timezone</th>
                    {/* <th>From</th> */}
                    <th>BCC</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.length === 0 ? (
                    <tr>
                      <td colSpan={7}>No data found</td>
                    </tr>
                  ) : (
                    currentData.map((item, index) => (
                      <tr key={item.id || index}>
                        <td>{item.title}</td>
                        {/* <td>{item.zohoviewName}</td> */}
                        <td>{item.timeZone}</td>
                        {/* <td>{item.smtpID}</td> */}
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
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* <button
                type="submit"
                style={{ marginTop: "28px" }}
                className="save-button button full"
              >
                Send
              </button>*/}

            {tab2 === "Output" && (
              <>
                <div className="tabs secondary d-flex align-center flex-col-991">
                  <ul className="d-flex">
                    {userRole === "ADMIN" && (
                      <li>
                        <button
                          onClick={tabHandler2}
                          className={`button ${
                            tab2 === "Output" ? "active" : ""
                          }`}
                        >
                          Output
                        </button>
                      </li>
                    )}
                  </ul>
                </div>

                <div className="d-flex flex-col-1200 mb-10-991 mt-10-991">
                  <div className="d-flex mr-10 align-center">
                    <button
                      onClick={handleFirstPage}
                      disabled={
                        !isResetEnabled ||
                        (currentIndex === 0 &&
                          !combinedResponses[0]?.prevPageToken)
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "5px 10px",
                        backgroundColor: "#f0f0f0",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                      title="Click to go to the first generated email"
                    >
                      <img
                        src={previousIcon}
                        alt="Previous"
                        style={{
                          width: "20px",
                          height: "20px",
                          objectFit: "contain",
                          marginRight: "5px",
                        }}
                      />
                    </button>
                    <button
                      onClick={handlePrevPage}
                      disabled={
                        !isResetEnabled ||
                        (currentIndex === 0 &&
                          !combinedResponses[0]?.prevPageToken)
                      }
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
                      <span>Prev</span>
                    </button>

                    <button
                      onClick={handleNextPage}
                      disabled={
                        !isResetEnabled ||
                        emailLoading ||
                        (currentIndex === combinedResponses.length - 1 &&
                          !combinedResponses[combinedResponses.length - 1]
                            ?.nextPageToken)
                      }
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

                    <button
                      onClick={handleLastPage}
                      disabled={
                        !isResetEnabled ||
                        emailLoading ||
                        (currentIndex === combinedResponses.length - 1 &&
                          !combinedResponses[combinedResponses.length - 1]
                            ?.nextPageToken)
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "5px 10px",
                        backgroundColor: "#f0f0f0",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                      title="Click to go to the last generated email"
                    >
                      <img
                        src={nextIcon}
                        alt="Next"
                        style={{
                          width: "20px",
                          height: "20px",
                          objectFit: "contain",
                          marginLeft: "5px",
                        }}
                      />
                    </button>

                    {emailLoading && (
                      <div className="loader-overlay">
                        <div className="loader"></div>
                      </div>
                    )}
                  </div>
                  <div className="d-flex flex-col-768 mt-10-1200">
                    <div className="text-center mt-2 d-flex align-center mr-20 mt-10-991 font-size-medium">
                      {combinedResponses.length > 0 && (
                        <>
                          <span>
                            Contact {currentIndex + 1} of{" "}
                            {
                              // Get total contacts from the selected view or all views
                              selectedZohoviewId1
                                ? (() => {
                                    const selectedView = zohoClient.find(
                                      (client) =>
                                        client.zohoviewId ===
                                        selectedZohoviewId1
                                    );
                                    return selectedView
                                      ? selectedView.totalContact
                                      : combinedResponses.length;
                                  })()
                                : zohoClient.reduce(
                                    (sum, client) => sum + client.totalContact,
                                    0
                                  )
                            }{" "}
                            ({combinedResponses.length} loaded)
                          </span>
                          <span style={{ whiteSpace: "pre" }}> </span>
                          <span style={{ whiteSpace: "pre" }}> </span>

                          {/* Input box to enter index */}
                          <input
                            type="number"
                            value={inputValue}
                            onChange={handleIndexChange}
                            onBlur={() => {
                              // When input loses focus, ensure it shows a valid value
                              if (
                                inputValue.trim() === "" ||
                                isNaN(parseInt(inputValue, 10))
                              ) {
                                setInputValue((currentIndex + 1).toString());
                              }
                            }}
                            className="form-control text-center mx-2"
                            style={{ width: "70px" }}
                          />
                        </>
                      )}
                    </div>
                    <div
                      className="contact-info mt-2 lh-35 align-center d-inline-block ml-10 mt-10-991 word-wrap--break-word word-break--break-all  ml-0-768"
                      style={{ color: "red" }}
                    >
                      <strong style={{ whiteSpace: "pre" }}>Contact: </strong>
                      <span style={{ whiteSpace: "pre" }}> </span>
                      {combinedResponses[currentIndex]?.name || "NA"} |
                      <span style={{ whiteSpace: "pre" }}> </span>
                      {combinedResponses[currentIndex]?.title || "NA"} |
                      <span style={{ whiteSpace: "pre" }}> </span>
                      {combinedResponses[currentIndex]?.company || "NA"} |
                      <span style={{ whiteSpace: "pre" }}> </span>
                      {combinedResponses[currentIndex]?.location || "NA"} |
                      <span style={{ whiteSpace: "pre" }}> </span>
                      <a
                        href={
                          combinedResponses[currentIndex]?.website &&
                          !combinedResponses[currentIndex]?.website.startsWith(
                            "http"
                          )
                            ? `https://${combinedResponses[currentIndex]?.website}`
                            : combinedResponses[currentIndex]?.website
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {combinedResponses[currentIndex]?.website || "NA"}
                      </a>
                      <span style={{ whiteSpace: "pre" }}> </span>|
                      <span style={{ whiteSpace: "pre" }}> </span>
                      <a
                        href={combinedResponses[currentIndex]?.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        LinkedIn
                      </a>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  {/* THIS MESSAGE MOVED HERE, ABOVE OUTPUT */}
                  {isPaused && !isResetEnabled && (
                    <div
                      style={{
                        color: "red",
                        marginBottom: "8px",
                        fontWeight: 500,
                      }}
                    >
                      Please wait, the last pitch generation is being
                      completed...
                      <span className="animated-ellipsis"></span>
                    </div>
                  )}

                  <span className="pos-relative"></span>
                </div>
                <div className="form-group">
                  <div className="d-flex mb-10 align-items-center">
                    {/* Your existing Copy to clipboard button */}
                    <button
                      className={`button d-flex align-center small ${
                        isCopyText && "save-button auto-width"
                      }`}
                      onClick={copyToClipboardHandler}
                    >
                      {isCopyText ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18px"
                          height="18px"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M7.29417 12.9577L10.5048 16.1681L17.6729 9"
                            stroke="#ffffff"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="#ffffff"
                            strokeWidth="2"
                          />
                        </svg>
                      ) : (
                        <svg
                          width="18px"
                          height="18px"
                          viewBox="0 0 24 24"
                          version="1.1"
                        >
                          <title>ic_fluent_copy_24_regular</title>
                          <desc>Created with Sketch.</desc>
                          <g
                            id="🔍-Product-Icons"
                            stroke="none"
                            strokeWidth="1"
                            fill="none"
                            fillRule="evenodd"
                          >
                            <g
                              id="ic_fluent_copy_24_regular"
                              fill="#212121"
                              fillRule="nonzero"
                            >
                              <path
                                d="M5.50280381,4.62704038 L5.5,6.75 L5.5,17.2542087 C5.5,19.0491342 6.95507456,20.5042087 8.75,20.5042087 L17.3662868,20.5044622 C17.057338,21.3782241 16.2239751,22.0042087 15.2444057,22.0042087 L8.75,22.0042087 C6.12664744,22.0042087 4,19.8775613 4,17.2542087 L4,6.75 C4,5.76928848 4.62744523,4.93512464 5.50280381,4.62704038 Z M17.75,2 C18.9926407,2 20,3.00735931 20,4.25 L20,17.25 C20,18.4926407 18.9926407,19.5 17.75,19.5 L8.75,19.5 C7.50735931,19.5 6.5,18.4926407 6.5,17.25 L6.5,4.25 C6.5,3.00735931 7.50735931,2 8.75,2 L17.75,2 Z M17.75,3.5 L8.75,3.5 C8.33578644,3.5 8,3.83578644 8,4.25 L8,17.25 C8,17.6642136 8.33578644,18 8.75,18 L17.75,18 C18.1642136,18 18.5,17.6642136 18.5,17.25 L18.5,4.25 C18.5,3.83578644 18.1642136,3.5 17.75,3.5 Z"
                                id="🎨-Color"
                              ></path>
                            </g>
                          </g>
                        </svg>
                      )}
                      <span className={`ml-5 ${isCopyText && "white"}`}>
                        {isCopyText ? "Copied!" : "Copy to clipboard"}
                      </span>
                    </button>
                  </div>
                  <span className="pos-relative">
                    {isEditing ? (
                      <div className="editor-container">
                        <div
                          className="editor-toolbar"
                          style={{
                            padding: "5px",
                            border: "1px solid #ccc",
                            borderBottom: "none",
                            borderRadius: "4px 4px 0 0",
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "5px",
                            background: "#f9f9f9",
                          }}
                        >
                          <select
                            onChange={(e) => {
                              document.execCommand(
                                "formatBlock",
                                false,
                                e.target.value
                              );
                            }}
                            style={{
                              padding: "5px",
                              border: "1px solid #ddd",
                              borderRadius: "3px",
                              marginRight: "5px",
                            }}
                          >
                            <option value="p">Normal</option>
                            <option value="h1">Heading 1</option>
                            <option value="h2">Heading 2</option>
                            <option value="h3">Heading 3</option>
                            <option value="pre">Preformatted</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => document.execCommand("bold")}
                            style={{
                              padding: "5px 10px",
                              border: "1px solid #ddd",
                              borderRadius: "3px",
                              background: "#fff",
                              cursor: "pointer",
                            }}
                          >
                            <strong>B</strong>
                          </button>

                          <button
                            type="button"
                            onClick={() => document.execCommand("italic")}
                            style={{
                              padding: "5px 10px",
                              border: "1px solid #ddd",
                              borderRadius: "3px",
                              background: "#fff",
                              cursor: "pointer",
                            }}
                          >
                            <em>I</em>
                          </button>

                          <button
                            type="button"
                            onClick={() => document.execCommand("underline")}
                            style={{
                              padding: "5px 10px",
                              border: "1px solid #ddd",
                              borderRadius: "3px",
                              background: "#fff",
                              cursor: "pointer",
                            }}
                          >
                            <u>U</u>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              document.execCommand("strikeThrough")
                            }
                            style={{
                              padding: "5px 10px",
                              border: "1px solid #ddd",
                              borderRadius: "3px",
                              background: "#fff",
                              cursor: "pointer",
                            }}
                          >
                            <s>S</s>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              document.execCommand("insertUnorderedList")
                            }
                            style={{
                              padding: "5px 10px",
                              border: "1px solid #ddd",
                              borderRadius: "3px",
                              background: "#fff",
                              cursor: "pointer",
                            }}
                          >
                            <span>•</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              document.execCommand("insertOrderedList")
                            }
                            style={{
                              padding: "5px 10px",
                              border: "1px solid #ddd",
                              borderRadius: "3px",
                              background: "#fff",
                              cursor: "pointer",
                            }}
                          >
                            <span>1.</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const url = prompt("Enter link URL:");
                              if (url)
                                document.execCommand("createLink", false, url);
                            }}
                            style={{
                              padding: "5px 10px",
                              border: "1px solid #ddd",
                              borderRadius: "3px",
                              background: "#fff",
                              cursor: "pointer",
                            }}
                          >
                            <span>🔗</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const url = prompt("Enter image URL:");
                              if (url)
                                document.execCommand("insertImage", false, url);
                            }}
                            style={{
                              padding: "5px 10px",
                              border: "1px solid #ddd",
                              borderRadius: "3px",
                              background: "#fff",
                              cursor: "pointer",
                            }}
                          >
                            <span>🖼️</span>
                          </button>
                        </div>

                        <div
                          ref={editorRef}
                          contentEditable={true}
                          className="textarea-full-height"
                          onBlur={(e) => {
                            setEditableContent(e.currentTarget.innerHTML);
                          }}
                          onFocus={() => {
                            // Set focus to the contentEditable div when toolbar buttons are used
                            if (editorRef.current) {
                              editorRef.current.focus();
                            }
                          }}
                          style={{
                            minHeight: "500px",
                            padding: "10px",
                            border: "1px solid #ccc",
                            borderTop: "none", // Remove top border since toolbar has bottom border
                            borderRadius: "0 0 4px 4px",
                            fontFamily: "inherit",
                            fontSize: "inherit",
                            whiteSpace: "pre-wrap",
                            lineHeight: "1.5",
                            overflowY: "auto",
                            outline: "none",
                          }}
                        />

                        <div className="editor-actions mt-3 d-flex">
                          <button
                            className="action-button button mr-10"
                            onClick={() => {
                              if (editorRef.current) {
                                setEditableContent(editorRef.current.innerHTML);
                              }
                              saveEditedContent();
                            }}
                            disabled={isSaving}
                          >
                            {isSaving ? "Saving..." : "Save Changes"}
                          </button>
                          <button
                            className="secondary button"
                            onClick={() => {
                              setIsEditing(false);
                              setEditableContent(
                                combinedResponses[currentIndex]?.pitch || ""
                              );
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div
                          className="textarea-full-height"
                          style={{
                            minHeight: "500px",
                            padding: "10px",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            fontFamily: "inherit",
                            fontSize: "inherit",
                            whiteSpace: "pre-wrap",
                            overflowY: "auto",
                            overflowX: "auto",
                            boxSizing: "border-box",
                          }}
                          dangerouslySetInnerHTML={{
                            __html:
                              combinedResponses[currentIndex]?.pitch || "",
                          }}
                        ></div>
                        <button
                          className="edit-button button d-flex align-center justify-center"
                          onClick={() => setIsEditing(true)}
                          style={{
                            position: "absolute",
                            top: "10px",
                            right: "70px",
                            zIndex: 5,
                          }}
                        >
                          <svg width="20px" height="20px" viewBox="0 0 24 24">
                            <path
                              d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"
                              fill="currentColor"
                            />
                          </svg>
                          <span className="ml-2">Edit</span>
                        </button>
                        <button
                          className="full-view-icon d-flex align-center justify-center"
                          onClick={() => handleModalOpen("modal-output-2")}
                        >
                          <svg width="40px" height="40px" viewBox="0 0 512 512">
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
                      </>
                    )}
                  </span>{" "}
                  <div className="d-flex justify-center mt-4"></div>{" "}
                  {/* Add this div for navigation buttons */}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Mail;
