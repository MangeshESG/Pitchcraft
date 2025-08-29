import { useState, useEffect, useRef } from "react";
import Modal from "../common/Modal";
import { Tooltip as ReactTooltip } from "react-tooltip";
import { copyToClipboard } from "../../utils/utils";
import previousIcon from "../../assets/images/previous.png";
import nextIcon from "../../assets/images/Next.png";
import singleprvIcon from "../../assets/images/SinglePrv.png";
import singlenextIcon from "../../assets/images/SingleNext.png";
import { useAppData } from "../../contexts/AppDataContext";

import * as XLSX from "xlsx";
import FileSaver from "file-saver";
import { toast } from "react-toastify";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css"; // Import styles
import API_BASE_URL from "../../config";
import axios from "axios";

// In Output.tsx
interface ZohoClient {
  id: number;
  zohoviewId: string;
  zohoviewName: string;
  clientId: number;
  totalContact: number;
}

interface Prompt {
  id: number;
  name: string;
  text: string;
  userId?: number; // userId might not always be returned from the API
  createdAt?: string;
  template?: string;
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
  isResetEnabled: boolean; // Add this prop

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
  recentlyAddedOrUpdatedId?: string | number | null;
  setRecentlyAddedOrUpdatedId?: React.Dispatch<
    React.SetStateAction<string | number | null>
  >;
  selectedClient: string;
  isStarted?: boolean;
  handleStart?: (startIndex?: number) => void; // Change this line
  handlePauseResume?: () => void;
  handleReset?: () => void;
  isPitchUpdateCompleted?: boolean;
  allRecordsProcessed?: boolean;
  isDemoAccount?: boolean;
  settingsForm?: any;
  settingsFormHandler?: (e: any) => void;
  delayTime?: string;
  setDelay?: (value: string) => void;
  selectedCampaign?: string;
  isProcessing?: boolean;
  handleClearAll?: () => void; // Optional prop for clearing all
  campaigns?: any[];
  handleCampaignChange?: (e: any) => void;
  selectionMode?: string;
  promptList?: any[];
  handleSelectChange?: (e: any) => void;
  userRole?: string;
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
  handleStop?: () => void; // Move this here - as a separate property
  isStopRequested?: boolean; // Add this line

  toneSettings?: any;
  toneSettingsHandler?: (e: any) => void;


}

const Output: React.FC<OutputInterface> = ({
  outputForm,
  outputFormHandler,
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
  onClearContent,
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
  isResetEnabled,
  zohoClient,
  onRegenerateContact,
  recentlyAddedOrUpdatedId,
  setRecentlyAddedOrUpdatedId,
  selectedClient,
  isStarted,
  handleStart,
  handlePauseResume,
  handleReset,
  handleStop, // Add this line
  isPitchUpdateCompleted,
  allRecordsProcessed,
  isDemoAccount,
  settingsForm,
  settingsFormHandler,
  delayTime,
  setDelay,
  selectedPrompt,
  selectedCampaign,
  isProcessing,
  handleClearAll,
  campaigns,
  handleCampaignChange,
  selectionMode,
  promptList,
  handleSelectChange,
  dataFiles,
  handleZohoModelChange,
  languages,
  selectedLanguage,
  handleLanguageChange,
  subjectMode,
  setSubjectMode,
  subjectText,
  setSubjectText,
  isStopRequested, // Add this line
  toneSettings,        // Add this
  toneSettingsHandler, // Add this

}) => {
  const [isCopyText, setIsCopyText] = useState(false);
  const { refreshTrigger } = useAppData(); // Make sure this includes refreshTrigger

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

  const [tab, setTab] = useState("New");
  const tabHandler = (e: React.ChangeEvent<any>) => {
    const { innerText } = e.target;
    console.log(innerText, "innerText");
    setTab(innerText);
  };

  const [tab2, setTab2] = useState("Output");
  const tabHandler2 = (e: React.ChangeEvent<any>) => {
    const { innerText } = e.target;
    console.log(innerText, "innerText");
    setTab2(innerText);
  };

  const [emailLoading, setEmailLoading] = useState(false); // Loading state for fetching email data

  const [tab3, setTab3] = useState("Stages");
  const tabHandler3 = (e: React.ChangeEvent<any>) => {
    const { innerText } = e.target;
    console.log(innerText, "innerText");
    setTab3(innerText);
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

  const clearUsage = () => {
    setOutputForm((prevOutputForm: any) => ({
      ...prevOutputForm,
      usage: "", // Correctly clears the usage field
    }));
  };

  const [combinedResponses, setCombinedResponses] = useState<any[]>([]);

  useEffect(() => {
    // Keep currentIndex as is when new responses are added
    if (
      currentIndex >= combinedResponses.length &&
      combinedResponses.length > 0
    ) {
      setCurrentIndex(Math.max(0, combinedResponses.length - 1));
    }
  }, [allResponses, currentIndex, setCurrentIndex, combinedResponses.length]);

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

  const [jumpToNewLast, setJumpToNewLast] = useState(false);
  const prevCountRef = useRef(combinedResponses.length);

  useEffect(() => {
    // Only run if jump is pending and count has increased!
    if (jumpToNewLast && combinedResponses.length > prevCountRef.current) {
      setCurrentIndex((prevIndex) => prevIndex + 1); // Move to next contact only!
      setJumpToNewLast(false);
    }
    prevCountRef.current = combinedResponses.length;
  }, [jumpToNewLast, combinedResponses]);

  const handleNextPage = async () => {
    if (currentIndex < combinedResponses.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      const lastItem = combinedResponses[combinedResponses.length - 1];
      if (lastItem?.nextPageToken) {
        setEmailLoading(true);
        try {
          const previousLength = combinedResponses.length;
          await fetchAndDisplayEmailBodies(
            selectedZohoviewId,
            lastItem.nextPageToken,
            "next"
          );
          // Jump to the first item of the newly fetched page
          //setCurrentIndex(previousLength);
          setJumpToNewLast(true);
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
          await fetchAndDisplayEmailBodies(
            selectedZohoviewId,
            firstItem.prevPageToken,
            "previous"
          );
          // currentIndex will be adjusted in fetchAndDisplayEmailBodies when direction is "previous"
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

  // Add this function inside your component
  const exportToExcel = () => {
    if (!combinedResponses || combinedResponses.length === 0) {
      alert("No data available to export");
      return;
    }

    try {
      setIsExporting(true);
      console.log("Exporting data:", combinedResponses.length, "records");

      // Format the data for Excel - extract only the fields we want to include
      const exportData = combinedResponses.map((item) => ({
        Name: item.name || item.full_Name || "N/A",
        Title: item.title || item.job_Title || "N/A",
        Company:
          item.company || item.account_name_friendlySingle_Line_12 || "N/A",
        Location: item.location || item.mailing_Country || "N/A",
        Website: item.website || "N/A",
        LinkedIn: item.linkedin || item.linkedIn_URL || "N/A",
        Pitch: item.pitch || item.sample_email_body || "N/A",
        Timestamp: item.timestamp || new Date().toISOString(),
        Generated: item.generated ? "Yes" : "No",
      }));

      // Create worksheet with the data
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Add column widths for better readability
      const wscols = [
        { wch: 20 }, // Name
        { wch: 20 }, // Title
        { wch: 20 }, // Company
        { wch: 15 }, // Location
        { wch: 25 }, // Website
        { wch: 25 }, // LinkedIn
        { wch: 60 }, // Pitch
        { wch: 20 }, // Timestamp
        { wch: 10 }, // Generated
      ];
      ws["!cols"] = wscols;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Generated Pitches");

      // Generate a filename with date
      const date = new Date().toISOString().split("T")[0];
      const filename = `Generated_Pitches_${date}.xlsx`;

      // Attempt to download the file
      try {
        // Try the standard XLSX.writeFile method first
        XLSX.writeFile(wb, filename);
        console.log("Excel file exported with XLSX.writeFile");
      } catch (writeError) {
        console.warn(
          "XLSX.writeFile failed, falling back to FileSaver:",
          writeError
        );

        // Fallback to FileSaver if writeFile doesn't work
        const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([wbout], { type: "application/octet-stream" });
        FileSaver.saveAs(blob, filename);
        console.log("Excel file exported with FileSaver");
      }
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Error exporting data. See console for details.");
    } finally {
      setIsExporting(false);
    }
  };

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

  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerationTargetId, setRegenerationTargetId] = useState<
    string | number | null
  >(null);

  // Add this at the top of your component:
  useEffect(() => {
    if (recentlyAddedOrUpdatedId && combinedResponses.length > 0) {
      const ix = combinedResponses.findIndex(
        (r) => r.id === recentlyAddedOrUpdatedId
      );
      if (ix !== -1) {
        setCurrentIndex(ix);
        setRecentlyAddedOrUpdatedId?.(null); // Use the prop version if you get it from parent!
      }
    }
  }, [combinedResponses, recentlyAddedOrUpdatedId]);

  //----------------------------------------------------------------------
  const [editableContent, setEditableContent] = useState(
    combinedResponses[currentIndex]?.pitch || ""
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const quillRef = useRef<any>(null);

  // Add this function to handle content changes
  const handleContentInput = (e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.innerHTML;
    setEditableContent(content);
  };

interface SaveToCrmUpdateEmailParams {
  clientId: number;
  contactId: number;
  emailSubject: string;
  emailBody: string;
}

const saveToCrmUpdateEmail = async ({
  clientId,
  contactId,
  emailSubject,
  emailBody,
}: SaveToCrmUpdateEmailParams): Promise<any> => {
  if (!contactId) throw new Error("Contact ID is required to update");
  if (!clientId) throw new Error("Client ID is required to update");

  try {
    const response = await fetch(`${API_BASE_URL}/api/Crm/contacts/update-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId,
        contactId,
        emailSubject: emailSubject ?? "",
        emailBody: emailBody ?? "",
        // dataFileId removed from request body
      }),
    });

    if (!response.ok) {
      const errJson = await response.json();
      throw new Error(errJson.message || "Failed to update contact via CRM API");
    }

    return await response.json();
  } catch (error) {
    console.error("Error saving to CRM contacts API:", error);
    throw error;
  }
};


  // You'll need this helper function
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
  // Add a function to save the edited content
  const saveEditedContent = async () => {
    setIsSaving(true);
    try {
      // Get the subject from the current item
      const currentSubject = combinedResponses[currentIndex]?.subject;

      // Create the updated item with new pitch
      const updatedItem = {
        ...combinedResponses[currentIndex],
        pitch: editableContent,
      };

      // First save to Zoho before updating UI - now passing the subject
      const currentItem = combinedResponses[currentIndex];
      const effectiveUserId = selectedClient !== "" ? selectedClient : userId;

      await saveToCrmUpdateEmail({
        clientId: Number(effectiveUserId),                 
        contactId: Number(currentItem?.id),
        emailSubject: currentItem?.subject || "",
        emailBody: editableContent,
      });

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
    } catch (error) {
      console.error("Failed to save content:", error);
      toast.error("Failed to save content. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // When opening the modal or setting editable content
  useEffect(() => {
    if (combinedResponses[currentIndex]?.pitch) {
      setEditableContent(
        aggressiveCleanHTML(combinedResponses[currentIndex].pitch)
      );
    } else {
      setEditableContent("");
    }
  }, [currentIndex, combinedResponses]);

  useEffect(() => {
    console.log("combinedResponses updated:", combinedResponses);
  }, [combinedResponses]);

  useEffect(() => {
    console.log("currentIndex changed:", currentIndex);
    console.log("Current pitch:", combinedResponses[currentIndex]?.pitch);
  }, [currentIndex]);

  const [editorInitialized, setEditorInitialized] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Add this useEffect to handle the initialization
  useEffect(() => {
    if (isEditing && editorRef.current) {
      // Update editor content whenever the current index changes or when entering edit mode
      editorRef.current.innerHTML = editableContent;
    }
  }, [isEditing, editableContent, currentIndex]);

  const [outputEmailWidth, setOutputEmailWidth] = useState<string>("");

  const toggleOutputEmailWidth = (deviceName: string) => {
    setOutputEmailWidth(deviceName);
  };

  //-----------------------------------------
  // Add this interface
  interface SmtpUser {
    id: number;
    username: string;
  }

  // Inside your Output component, add these state variables:
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailFormData, setEmailFormData] = useState({
    Subject: "",
    BccEmail: "",
  });
  const [selectedSmtpUser, setSelectedSmtpUser] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [smtpUsers, setSmtpUsers] = useState<SmtpUser[]>([]);

  // Get token and userId (add if not already present)
  const token = sessionStorage.getItem("token");
  const userId = sessionStorage.getItem("clientId");
  const effectiveUserId = selectedClient !== "" ? selectedClient : userId;

  // Add useEffect to fetch SMTP users
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
        setSmtpUsers(response.data?.data || []);
      } catch (error) {
        console.error("Failed to fetch SMTP users:", error);
      }
    };

    if (effectiveUserId) {
      fetchSmtpUsers();
    }
  }, [effectiveUserId, token]);

const handleSendEmail = async (
  subjectFromButton: string,
  targetContact: typeof combinedResponses[number] | null = null
) => {
  setEmailMessage("");
  setEmailError("");

  const subjectToUse = subjectFromButton || emailFormData.Subject;
  if (!subjectToUse || !selectedSmtpUser) {
    setEmailError(
      "Please fill in all required fields: Subject and From Email."
    );
    return;
  }

  setSendingEmail(true);

  try {
    const currentContact = targetContact || combinedResponses[currentIndex];

    // Ensure we have the required contact information
    if (!currentContact || !currentContact.id) {
      setEmailError("No valid contact selected");
      setSendingEmail(false);
      return;
    }

    console.log("Sending email to:", currentContact?.name);

    // Prepare the request body according to the new API structure
    const requestBody = {
      clientId: effectiveUserId,
      contactid: currentContact.id,
      dataFileId: currentContact.datafileid || 0,
      toEmail: currentContact.email,
      subject: subjectToUse,
      body: currentContact.pitch || "", // Using the pitch as the email body
      bccEmail: emailFormData.BccEmail || "", // Send empty string if no BCC
      smtpId: selectedSmtpUser,
      fullName: currentContact.name,
      countryOrAddress: currentContact.location || "",
      companyName: currentContact.company || "",
      website: currentContact.website || "",
      linkedinUrl: currentContact.linkedin || "",
      jobTitle: currentContact.title || "",
    };

    // Rest of the function remains the same...
    const response = await axios.post(
      `${API_BASE_URL}/api/email/send-singleEmail`,
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      }
    );

    setEmailMessage(response.data.message || "Email sent successfully!");
    toast.success("Email sent successfully!");

    // Update the contact's email sent status
    try {
      // Update local state
      const updatedItem = {
        ...combinedResponses[currentIndex],
        emailsentdate: new Date().toISOString(),
        PG_Added_Correctly: true,
      };
      setCombinedResponses((prev) =>
        prev.map((item, i) => (i === currentIndex ? updatedItem : item))
      );

      const allResponsesIndex = allResponses.findIndex(
        (item) => item.id === updatedItem.id
      );
      if (allResponsesIndex !== -1) {
        const updatedAll = [...allResponses];
        updatedAll[allResponsesIndex] = updatedItem;
        setAllResponses(updatedAll);
      }
      const existingResponseIndex = existingResponse.findIndex(
        (item) => item.id === updatedItem.id
      );
      if (existingResponseIndex !== -1) {
        const updatedExisting = [...existingResponse];
        updatedExisting[existingResponseIndex] = updatedItem;
        setexistingResponse(updatedExisting);
      }

           // If the API returns nextContactId, you might want to handle navigation
      if (response.data.nextContactId) {
        // Optional: Auto-navigate to next contact or store for later use
        console.log("Next contact ID:", response.data.nextContactId);
      }
    } catch (updateError) {
      console.error("Failed to update contact record:", updateError);
      if (axios.isAxiosError(updateError)) {
        console.error("Update error details:", updateError.response?.data);
      }
      toast.warning("Email sent but failed to update record status");
    }

    setTimeout(() => {
      setShowEmailModal(false);
      setEmailMessage("");
    }, 2000);
  } catch (err) {
    if (axios.isAxiosError(err)) {
      setEmailError(
        err.response?.data?.message ||
          err.response?.data ||
          "Failed to send email."
      );
    } else if (err instanceof Error) {
      setEmailError(err.message);
    } else {
      setEmailError("An unknown error occurred.");
    }
    toast.error("Failed to send email");
  } finally {
    setSendingEmail(false);
  }
};
  //-----------------------------------------
  const aggressiveCleanHTML = (html: string): string => {
    // Parse and rebuild the HTML with controlled spacing
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const body = doc.body;

    // Process all block elements
    const blocks = body.querySelectorAll("p, div, h1, h2, h3, h4, h5, h6");
    blocks.forEach((block) => {
      // Cast to HTMLElement to access style property
      const htmlBlock = block as HTMLElement;
      // Apply inline styles directly to override any existing styles
      htmlBlock.style.cssText =
        "margin: 0 0 10px 0 !important; padding: 0 !important; line-height: 1.4 !important;";
    });

    // Remove last element's bottom margin
    if (blocks.length > 0) {
      const lastBlock = blocks[blocks.length - 1] as HTMLElement;
      lastBlock.style.marginBottom = "0 !important";
    }

    return body.innerHTML;
  };

  type BccOption = { id: number; bccEmailAddress: string; clinteId: number };
  const [bccOptions, setBccOptions] = useState<BccOption[]>([]);

  useEffect(() => {
    const fetchBccEmails = async () => {
      try {
        const url = `${API_BASE_URL}/api/email/get-by-clinte?clinteId=${effectiveUserId}`;
        const response = await axios.get(url, {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
        const emails = response.data || [];
        setBccOptions(emails);

        if (emails.length === 1) {
          setEmailFormData((prev) => ({
            ...prev,
            BccEmail: emails[0].bccEmailAddress,
          }));
        }
      } catch (error: unknown) {
        console.error("Failed to fetch BCC emails:", error);

        // 👇 safest way in TypeScript for Axios errors
        if (axios.isAxiosError(error)) {
          // error is treated as AxiosError here
          console.error(
            "Status:",
            error.response?.status,
            "Data:",
            error.response?.data
          );
        }
      }
    };

    if (effectiveUserId) {
      fetchBccEmails();
    }
  }, [effectiveUserId, token]);

  // On BCC change, after setEmailFormData...

  useEffect(() => {
    if (emailFormData.BccEmail) {
      localStorage.setItem("lastBCC", emailFormData.BccEmail);
    }
  }, [emailFormData.BccEmail]);

  useEffect(() => {
    if (selectedSmtpUser) {
      localStorage.setItem("lastFrom", selectedSmtpUser);
    }
  }, [selectedSmtpUser]);

  // On mount, try to initialize both BCC and From from storage
  useEffect(() => {
    const lastBcc = localStorage.getItem("lastBCC");
    const lastFrom = localStorage.getItem("lastFrom");
    if (lastBcc) setEmailFormData((prev) => ({ ...prev, BccEmail: lastBcc }));
    if (lastFrom) setSelectedSmtpUser(lastFrom);
  }, []);

  const [bccSelectMode, setBccSelectMode] = useState("dropdown"); // or "other"

  useEffect(() => {
    const lastBcc = localStorage.getItem("lastBCC");
    const wasOtherMode = localStorage.getItem("lastBCCOtherMode");
    if (lastBcc) {
      setEmailFormData((prev) => ({ ...prev, BccEmail: lastBcc }));
      if (
        wasOtherMode === "true" ||
        (bccOptions.length &&
          !bccOptions.some((option) => option.bccEmailAddress === lastBcc))
      ) {
        setBccSelectMode("other");
      } else {
        setBccSelectMode("dropdown");
      }
    }
  }, [bccOptions]);

  // Add this function at the top of your component or in a utils file
  function formatLocalDateTime(dateString: string | undefined | null): string {
    if (!dateString) return "N/A";

    let dateObj: Date | null = null;

    // ISO format: 'YYYY-MM-DD...'
    if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
      dateObj = new Date(dateString);
    }
    // DD-MM-YYYY HH:mm:ss format (with either - or / as separator)
    else if (/^\d{2}[-/]\d{2}[-/]\d{4}/.test(dateString)) {
      // Accept both dashes and slashes
      // e.g. '24-06-2025 16:35:25' or '24/06/2025 16:35:25'
      const [datePart, timePart] = dateString.split(" ");
      const [day, month, year] = datePart.split(/[-/]/).map(Number);
      let hour = 0,
        min = 0,
        sec = 0;
      if (timePart) {
        [hour, min, sec] = timePart.split(":").map(Number);
      }
      dateObj = new Date(year, month - 1, day, hour, min, sec);
    }
    // fallback
    else {
      dateObj = new Date(dateString);
    }

    if (!dateObj || isNaN(dateObj.getTime())) return "N/A";

    return dateObj
      .toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .replace(",", "");
  }

  // Add this useEffect after the existing combinedResponses useEffect
  useEffect(() => {
    console.log(
      "combinedResponses updated:",
      combinedResponses.length,
      "items"
    );
    console.log("Current index:", currentIndex);
    console.log("Current contact:", combinedResponses[currentIndex]);

    // Force a re-render if we have data but UI shows NA
    if (combinedResponses.length > 0 && currentIndex === 0) {
      const contact = combinedResponses[0];
      if (contact && contact.name !== "N/A") {
        // Data is valid, force update
        setCurrentIndex(0);
      }
    }
  }, [combinedResponses]);

    useEffect(() => {
    // This will trigger when campaigns are created/updated/deleted
    console.log('Campaigns updated in Output component:', campaigns?.length);
  }, [campaigns, refreshTrigger]); // Add refreshTrigger dependency


const [isBulkSending, setIsBulkSending] = useState(false);
const [bulkSendIndex, setBulkSendIndex] = useState(currentIndex);
const stopBulkRef = useRef(false);

const sendEmailsInBulk = async (startIndex = 0) => {
  
  
  // Check if we have SMTP user selected BEFORE starting
  if (!selectedSmtpUser) {
    return; // Exit early
  }

  setIsBulkSending(true);
  stopBulkRef.current = false;

  let index = startIndex;
  let sentCount = 0;
  let skippedCount = 0;

  while (index < combinedResponses.length && !stopBulkRef.current) {
    // Update current index to show the contact being processed
    setCurrentIndex(index);
    
    const contact = combinedResponses[index];
  

    try {
      // Prepare subject and request body
      const subjectToUse = contact.subject || "No subject";
      console.log('Subject:', subjectToUse);

      if (!contact.id) {
        index++;
        skippedCount++;
        setBulkSendIndex(index);
        await new Promise(res => setTimeout(res, 500)); // Small delay before next
        continue;
      }

      const requestBody = {
        clientId: effectiveUserId,
        contactid: contact.id,
        dataFileId: contact.datafileid || 0,
        toEmail: contact.email,
        subject: subjectToUse,
        body: contact.pitch || "",
        bccEmail: emailFormData.BccEmail || "",
        smtpId: selectedSmtpUser,
        fullName: contact.name,
        countryOrAddress: contact.location || "",
        companyName: contact.company || "",
        website: contact.website || "",
        linkedinUrl: contact.linkedin || "",
        jobTitle: contact.title || "",
      };

      
     

      const response = await axios.post(
        `${API_BASE_URL}/api/email/send-singleEmail`,
        requestBody,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      sentCount++;

      // UPDATE local state for this contact
      const updatedItem = {
        ...contact,
        emailsentdate: new Date().toISOString(),
        PG_Added_Correctly: true,
      };
      
      // Update combinedResponses
      setCombinedResponses(prev =>
        prev.map((item, i) => (i === index ? updatedItem : item))
      );

      // Update allResponses if needed
      const allResponsesIndex = allResponses.findIndex(
        (item) => item.id === contact.id
      );
      if (allResponsesIndex !== -1) {
        setAllResponses(prev => {
          const updated = [...prev];
          updated[allResponsesIndex] = updatedItem;
          return updated;
        });
      }

      // Update existingResponse if needed
      const existingResponseIndex = existingResponse.findIndex(
        (item) => item.id === contact.id
      );
      if (existingResponseIndex !== -1) {
        setexistingResponse(prev => {
          const updated = [...prev];
          updated[existingResponseIndex] = updatedItem;
          return updated;
        });
      }

    } catch (err) {
      if (axios.isAxiosError(err)) {
      }
      skippedCount++;
    }

    index++;
    setBulkSendIndex(index);
    
    // Show progress
    const progress = `Progress: ${index}/${combinedResponses.length} (Sent: ${sentCount}, Skipped: ${skippedCount})`;
    
    // Wait before processing next email
    await new Promise(res => setTimeout(res, 1200)); // Throttle emails
  }

  setIsBulkSending(false);
  stopBulkRef.current = false;
  
  
  
};

const stopBulkSending = () => {
  stopBulkRef.current = true;
  setIsBulkSending(false);
};


  return (
    <div className="login-box gap-down">
      <div className="d-flex justify-between align-center mb-20 border-b pb-[15px] mb-[15px]">

      </div>

      {/* Add the selection dropdowns and subject line section */}
      <div className="d-flex justify-between align-center mb-0">
        <div className="input-section edit-section w-[100%]">
          {/* Dropdowns Row */}
          <div className="flex gap-4">
            <div className="col-4">
              <div className="form-group">
                <label>
                  Campaign <span className="required">*</span>
                </label>
                <select
                  onChange={handleCampaignChange}
                  value={selectedCampaign}
                >
                  <option value="">Select a campaign</option>
                  {campaigns?.map((campaign) => (
                    <option key={campaign.id} value={campaign.id.toString()}>
                      {campaign.campaignName}
                    </option>
                  ))}
                </select>
                {!selectedCampaign && (
                  <small className="error-text">Please select a campaign</small>
                )}
              </div>
              {selectedCampaign &&
                campaigns?.find((c) => c.id.toString() === selectedCampaign)
                  ?.description && (
                  <div className="campaign-description-container">
                    <small className="campaign-description">
                      {
                        campaigns.find(
                          (c) => c.id.toString() === selectedCampaign
                        )?.description
                      }
                    </small>
                  </div>
                )}
            </div>

            {/* <div className="col col-3 col-12-768">
              <div className="form-group">
                <label>Original non-personalized email templates</label>
                <select
                  onChange={handleSelectChange}
                  value={selectedPrompt?.name || ""}
                  className={!selectedPrompt?.name ? "highlight-required" : ""}
                  disabled={
                    userRole !== "ADMIN" || selectionMode === "campaign"
                  }
                >
                  <option value="">Please select a template</option>
                  {promptList?.map((prompt: any) => (
                    <option key={prompt.id} value={prompt.name}>
                      {prompt.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="col col-3 col-12-768">
              <div className="form-group">
                <label>Data files of contacts</label>
                <select
                  name="model"
                  id="model"
                  onChange={handleZohoModelChange}
                  value={selectedZohoviewId}
                  className={!selectedZohoviewId ? "highlight-required" : ""}
                  disabled={
                    userRole !== "ADMIN" || selectionMode === "campaign"
                  }
                >
                  <option value="">Please select a data file</option>
                  {dataFiles?.map((file) => (
                    <option key={file.id} value={file.id}>
                      {file.name} - {file.data_file_name}
                    </option>
                  ))}
                </select>
              </div>
              {emailLoading && (
                <div className="loader-overlay">
                  <div className="loader"></div>
                </div>
              )}
            </div> */}

            <div className="col-5">
                    {!isDemoAccount && (

              <div className="form-group" style={{ flexWrap: "wrap" }}>
                <label style={{ width: "100%" }}>Subject</label>

                <div className="flex">
                  <select
                    onChange={(e) => setSubjectMode?.(e.target.value)}
                    value={subjectMode}
                    className="height-35"
                    style={{ minWidth: 150, marginRight: 10 }}
                  >
                    <option value="AI generated">AI generated</option>
                    <option value="With Placeholder">With placeholder</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Enter subject here"
                    value={subjectText}
                    onChange={(e) => setSubjectText?.(e.target.value)}
                    disabled={subjectMode !== "With Placeholder"}
                  />
                </div>
              </div>
                    )}
            </div>

            <div className="">
                    {!isDemoAccount && (

              <div className="form-group">
                <label>Language</label>
                <select
                  onChange={handleLanguageChange}
                  value={selectedLanguage}
                  className="height-35"
                >
                  <option value="">Select a language</option>
                  {languages
                    ?.sort((a, b) => a.localeCompare(b))
                    .map((language, index) => (
                      <option key={index} value={language}>
                        {language}
                      </option>
                    ))}
                </select>
              </div>
                    )}
            </div>
            
          </div>

          {/* Subject Line Row */}
        </div>
      </div>

      {/* Rest of Output component content */}

      {userRole === "ADMIN" && (
        <div className="row pb-2 d-flex align-center justify-end">
          <div className="col col-12">
            <div className="form-group">
              <label>Usage</label>
              <span className="pos-relative full-width flex">
                <textarea
                  placeholder="Usage"
                  rows={1}
                  name="tkUsage"
                  value={outputForm.usage}
                  className="full-width p-[0.5rem]"
                  onChange={outputFormHandler}
                ></textarea>
                <button
                  className="secondary-button ml-10 button clear-button small d-flex align-center h-[100%] justify-center"
                  onClick={clearUsage}
                >
                  Clear Usage
                </button>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* New Tab */}
      {tab === "New" && (
        <>
          <div className="tabs secondary d-flex align-center flex-col-991 justify-between">
            <ul className="d-flex">
              {userRole === "ADMIN" && (
                <li>
                  <button
                    onClick={tabHandler2}
                    className={`button ${tab2 === "Output" ? "active" : ""}`}
                  >
                    Output
                  </button>
                </li>
              )}
              {userRole === "ADMIN" && (
                <li>
                  <button
                    onClick={tabHandler2}
                    className={`button ${tab2 === "Stages" ? "active" : ""}`}
                  >
                    Stages
                  </button>
                </li>
              )}
              <li>
                <button
                className={`tab-button ${tab2 === "Settings" ? "active" : ""}`}
                onClick={() => setTab2("Settings")}
              >
                Settings
              </button>
              </li>              
                <div className="d-flex align-center gap-1 mr-3">
                <button
                  onClick={handleFirstPage}
                  disabled={isProcessing} 

                  title="Click to go to the first generated email"
                  className="secondary-button h-[35px] w-[38px] !px-[5px] !py-[10px] flex justify-center items-center"
                >
                  <img
                    src={previousIcon}
                    alt="Previous"
                    style={{
                      width: "20px",
                      height: "20px",
                      objectFit: "contain",
                    }}
                  />
                </button>
                <button
                  onClick={handlePrevPage}
                  disabled={isProcessing || currentIndex === 0}
                  className="secondary-button flex justify-center items-center !px-[10px] h-[35px]"
                  title="Click to go to the previous generated email"
                >
                  <img
                    src={singleprvIcon}
                    alt="Previous"
                    style={{
                      width: "20px",
                      height: "20px",
                      objectFit: "contain",
                      marginRight: "2px",
                      marginLeft:"-7px"
                    }}
                  />
                  <span>Prev</span>
                </button>

                <button
                  onClick={handleNextPage}
                  disabled={isProcessing || currentIndex === combinedResponses.length - 1}
                  className="secondary-button !h-[35px] !py-[10px] !px-[10px] flex justify-center items-center"
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
                      marginLeft: "2px",
                      marginRight:"-7px"
                    }}
                  />
                </button>

                <button
                  onClick={handleLastPage}
                  disabled={isProcessing || currentIndex === combinedResponses.length - 1} // Simplified condition

                  className="secondary-button h-[35px] w-[38px] !px-[5px] !py-[10px] flex justify-center items-center !px-[10px]"
                  title="Click to go to the last generated email"
                >
                  <img
                    src={nextIcon}
                    alt="Next"
                    style={{
                      width: "20px",
                      height: "20px",
                      objectFit: "contain",
                      marginLeft: "2px",
                    }}
                  />
                </button>

                {emailLoading && (
                  <div className="loader-overlay">
                    <div className="loader"></div>
                  </div>
                )}
              </div>
              
              <div className="mtext-center d-flex align-center mr-20 mt-10-991 font-size-medium">
                {combinedResponses.length > 0 && (
                  <>
                    <span>
                      {/* <strong>Contact:</strong> {currentIndex + 1} of{" "} */}
                      <strong>Contact:</strong> 
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
                        className="form-control text-center !mx-2"
                        style={{ width: "70px", padding: "8px" }}
                      />
                       of{" "}
                      {
                        // Get total contacts from the selected view or all views
                        selectedZohoviewId
                          ? (() => {
                              const selectedView = zohoClient.find(
                                (client) =>
                                  client.zohoviewId === selectedZohoviewId
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
                      <span className="opacity-60">
                        ({combinedResponses.length} loaded)
                      </span>
                    </span>
                    <span style={{ whiteSpace: "pre" }}> </span>
                    <span style={{ whiteSpace: "pre" }}> </span>

                    
                  </>
                )}
              </div>
            </ul>
            <div className="flex">
              <div className="flex mr-4">
                
                {isResetEnabled ? ( // Changed from !isProcessing to isResetEnabled
                
                  <button
                    className="primary-button bg-[#3f9f42]"
                    onClick={() => handleStart?.(currentIndex)}
                    disabled={
                      (!selectedPrompt?.name || !selectedZohoviewId) &&
                      !selectedCampaign
                    }
                    title={`Click to generate hyper-personalized emails starting from contact ${currentIndex + 1}`}
                  >
                    Generate
                  </button>
                ) : (
                  <button
                    className="primary-button bg-[#3f9f42]"
                    onClick={handleStop}
                    disabled={isStopRequested} // Disable if stop is already requested
                    title="Click to stop the generation of emails"
                  >
                    Stop
                  </button>
                )}
              </div>
              <div className="flex mr-4">
             {!isDemoAccount && (

               <button
                className="secondary-button nowrap"
                onClick={handleClearAll}
                disabled={!isResetEnabled} // Changed from isProcessing to !isResetEnabled
                title="Clear all data and reset the application state"
              >
                Reset all
              </button>
              )}
              </div>
              <div className="!mb-[0px] flex align-center">
                {!isDemoAccount && (

                <label className="checkbox-label !mb-[0px] mr-[5px] flex align-center">
                  <input
                    type="checkbox"
                    checked={settingsForm?.overwriteDatabase}
                    name="overwriteDatabase"
                    id="overwriteDatabase"
                    onChange={settingsFormHandler}
                    className="!mr-0"
                  />
                  <span className="text-[14px]">Overwrite</span>
                </label>
              )}
              {!isDemoAccount && (

                <span>
                  <ReactTooltip anchorSelect="#overwrite-checkbox" place="top">
                    Reset all company level intel
                  </ReactTooltip>
                  <svg id="overwrite-checkbox" width="14px" height="14px" viewBox="0 0 24 24" fill="#555555" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 17.75C12.4142 17.75 12.75 17.4142 12.75 17V11C12.75 10.5858 12.4142 10.25 12 10.25C11.5858 10.25 11.25 10.5858 11.25 11V17C11.25 17.4142 11.5858 17.75 12 17.75Z" fill="#1C274C"/>
                    <path d="M12 7C12.5523 7 13 7.44772 13 8C13 8.55228 12.5523 9 12 9C11.4477 9 11 8.55228 11 8C11 7.44772 11.4477 7 12 7Z" fill="#1C274C"/>
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M1.25 12C1.25 6.06294 6.06294 1.25 12 1.25C17.9371 1.25 22.75 6.06294 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12ZM12 2.75C6.89137 2.75 2.75 6.89137 2.75 12C2.75 17.1086 6.89137 21.25 12 21.25C17.1086 21.25 21.25 17.1086 21.25 12C21.25 6.89137 17.1086 2.75 12 2.75Z" fill="#1C274C"/>
                  </svg>
                </span>
                )}
                
              </div>
              
            </div>
            <div className="d-flex flex-col-1200 mb-10-991 mt-10-991">
              <div className="d-flex flex-col-768 mt-10-1200">
                {/* Add the Excel export link */}
                <ReactTooltip anchorSelect="#download-data-tooltip" place="top">
                  Download all loaded emails to a spreadsheet
                </ReactTooltip>
                <a
                  href="#"
                  id="download-data-tooltip"
                  onClick={(e) => {
                    e.preventDefault();
                    if (!isExporting && combinedResponses.length > 0) {
                      exportToExcel();
                    }
                  }}
                  className="export-link ml-10 mr-10 my-5-640 green"
                  style={{
                    color: "#0066cc",
                    textDecoration: "none",
                    cursor:
                      combinedResponses.length === 0 || isExporting
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      combinedResponses.length === 0 || isExporting ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {isExporting ? (
                    <span>Exporting...</span>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20px"
                        height="20px"
                        viewBox="0 0 32 32"
                      >
                        <title>file_type_excel2</title>
                        <path
                          d="M28.781,4.405H18.651V2.018L2,4.588V27.115l16.651,2.868V26.445H28.781A1.162,1.162,0,0,0,30,25.349V5.5A1.162,1.162,0,0,0,28.781,4.405Zm.16,21.126H18.617L18.6,23.642h2.487v-2.2H18.581l-.012-1.3h2.518v-2.2H18.55l-.012-1.3h2.549v-2.2H18.53v-1.3h2.557v-2.2H18.53v-1.3h2.557v-2.2H18.53v-2H28.941Z"
                          style={{ fill: "#20744a", fillRule: "evenodd" }}
                        />
                        <rect
                          x="22.487"
                          y="7.439"
                          width="4.323"
                          height="2.2"
                          style={{ fill: "#20744a" }}
                        />
                        <rect
                          x="22.487"
                          y="10.94"
                          width="4.323"
                          height="2.2"
                          style={{ fill: "#20744a" }}
                        />
                        <rect
                          x="22.487"
                          y="14.441"
                          width="4.323"
                          height="2.2"
                          style={{ fill: "#20744a" }}
                        />
                        <rect
                          x="22.487"
                          y="17.942"
                          width="4.323"
                          height="2.2"
                          style={{ fill: "#20744a" }}
                        />
                        <rect
                          x="22.487"
                          y="21.443"
                          width="4.323"
                          height="2.2"
                          style={{ fill: "#20744a" }}
                        />
                        <polygon
                          points="6.347 10.673 8.493 10.55 9.842 14.259 11.436 10.397 13.582 10.274 10.976 15.54 13.582 20.819 11.313 20.666 9.781 16.642 8.248 20.513 6.163 20.329 8.585 15.666 6.347 10.673"
                          style={{ fill: "#ffffff", fillRule: "evenodd" }}
                        />
                      </svg>
                      <span className="ml-5 green">Download</span>
                    </>
                  )}
                </a>
              </div>
            </div>
          </div>
          {tab2 === "Output" && (
            <>
              <div className="form-group mb-0">
                {/* <div className="d-flex mb-10 align-items-center">
                  {userRole === "ADMIN" && (
                    <button
                      className="button clear-button small d-flex align-center"
                      onClick={clearContent}
                    >
                      <span>Clear output</span>
                    </button>
                  )}
                </div> */}

                {/* THIS MESSAGE MOVED HERE, ABOVE OUTPUT */}
                {isStopRequested && !isResetEnabled && (
                  <div
                    style={{
                      color: "red",
                      marginBottom: "8px",
                      fontWeight: 500,
                    }}
                  >
                    Please wait, the last pitch generation is being completed...
                    <span className="animated-ellipsis"></span>
                  </div>
                )}

                <span className="pos-relative">
                  <pre
                    className="w-full p-3 py-[5px] border border-gray-300 rounded-lg overflow-y-auto h-[45px] min-h-[45px] break-words whitespace-pre-wrap text-[13px]"
                    dangerouslySetInnerHTML={{
                      __html: formatOutput(outputForm.generatedContent),
                    }}
                  ></pre>
                  <Modal
                    show={openModals["modal-output-1"]}
                    closeModal={() => handleModalClose("modal-output-1")}
                    buttonLabel="Ok"
                  >
                    <label>Output</label>
                    <pre
                      className="height-full--25 w-full p-3 border border-gray-300 rounded-lg overflow-y-auto textarea-height-600"
                      dangerouslySetInnerHTML={{
                        __html: formatOutput(outputForm.generatedContent),
                      }}
                    ></pre>
                  </Modal>
                  {/* Add the full-view-icon button here */}
                  <button
                    className="full-view-icon d-flex align-center justify-center"
                    onClick={() => handleModalOpen("modal-output-1")}
                  >
                    <svg width="30px" height="30px" viewBox="0 0 512 512">
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
              <div className="form-group mb-0">
                <div className="d-flex justify-between w-full">
                  <div
                    className="contact-info lh-35 align-center d-inline-block word-wrap--break-word word-break--break-all"
                    style={{ color: "#3f9f42" }}
                  >
                    {/* <strong style={{ whiteSpace: "pre" }}>Contact: </strong> */}
                    {/* <span style={{ whiteSpace: "pre" }}> </span> */}
                    {combinedResponses[currentIndex]?.name || "NA"},
                    <span style={{ whiteSpace: "pre" }}> </span>
                    {combinedResponses[currentIndex]?.title || "NA"} at
                    <span style={{ whiteSpace: "pre" }}> </span>
                    {combinedResponses[currentIndex]?.company || "NA"} in 
                    <span style={{ whiteSpace: "pre" }}> </span>
                    {combinedResponses[currentIndex]?.location || "NA"}
                    <span style={{ whiteSpace: "pre" }}> </span>
                    {/* <span className="inline-block relative top-[6px] mr-[3px]">
                      <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 7H16C18.7614 7 21 9.23858 21 12C21 14.7614 18.7614 17 16 17H14M10 7H8C5.23858 7 3 9.23858 3 12C3 14.7614 5.23858 17 8 17H10M8 12H16" stroke="#3f9f42" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </span> */}
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
                      <span className="inline-block relative top-[8px] mr-[3px]">
                        <svg width="26px" height="26px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M9.83824 18.4467C10.0103 18.7692 10.1826 19.0598 10.3473 19.3173C8.59745 18.9238 7.07906 17.9187 6.02838 16.5383C6.72181 16.1478 7.60995 15.743 8.67766 15.4468C8.98112 16.637 9.40924 17.6423 9.83824 18.4467ZM11.1618 17.7408C10.7891 17.0421 10.4156 16.1695 10.1465 15.1356C10.7258 15.0496 11.3442 15 12.0001 15C12.6559 15 13.2743 15.0496 13.8535 15.1355C13.5844 16.1695 13.2109 17.0421 12.8382 17.7408C12.5394 18.3011 12.2417 18.7484 12 19.0757C11.7583 18.7484 11.4606 18.3011 11.1618 17.7408ZM9.75 12C9.75 12.5841 9.7893 13.1385 9.8586 13.6619C10.5269 13.5594 11.2414 13.5 12.0001 13.5C12.7587 13.5 13.4732 13.5593 14.1414 13.6619C14.2107 13.1384 14.25 12.5841 14.25 12C14.25 11.4159 14.2107 10.8616 14.1414 10.3381C13.4732 10.4406 12.7587 10.5 12.0001 10.5C11.2414 10.5 10.5269 10.4406 9.8586 10.3381C9.7893 10.8615 9.75 11.4159 9.75 12ZM8.38688 10.0288C8.29977 10.6478 8.25 11.3054 8.25 12C8.25 12.6946 8.29977 13.3522 8.38688 13.9712C7.11338 14.3131 6.05882 14.7952 5.24324 15.2591C4.76698 14.2736 4.5 13.168 4.5 12C4.5 10.832 4.76698 9.72644 5.24323 8.74088C6.05872 9.20472 7.1133 9.68686 8.38688 10.0288ZM10.1465 8.86445C10.7258 8.95042 11.3442 9 12.0001 9C12.6559 9 13.2743 8.95043 13.8535 8.86447C13.5844 7.83055 13.2109 6.95793 12.8382 6.2592C12.5394 5.69894 12.2417 5.25156 12 4.92432C11.7583 5.25156 11.4606 5.69894 11.1618 6.25918C10.7891 6.95791 10.4156 7.83053 10.1465 8.86445ZM15.6131 10.0289C15.7002 10.6479 15.75 11.3055 15.75 12C15.75 12.6946 15.7002 13.3521 15.6131 13.9711C16.8866 14.3131 17.9412 14.7952 18.7568 15.2591C19.233 14.2735 19.5 13.1679 19.5 12C19.5 10.8321 19.233 9.72647 18.7568 8.74093C17.9413 9.20477 16.8867 9.6869 15.6131 10.0289ZM17.9716 7.46178C17.2781 7.85231 16.39 8.25705 15.3224 8.55328C15.0189 7.36304 14.5908 6.35769 14.1618 5.55332C13.9897 5.23077 13.8174 4.94025 13.6527 4.6827C15.4026 5.07623 16.921 6.08136 17.9716 7.46178ZM8.67765 8.55325C7.61001 8.25701 6.7219 7.85227 6.02839 7.46173C7.07906 6.08134 8.59745 5.07623 10.3472 4.6827C10.1826 4.94025 10.0103 5.23076 9.83823 5.5533C9.40924 6.35767 8.98112 7.36301 8.67765 8.55325ZM15.3224 15.4467C15.0189 16.637 14.5908 17.6423 14.1618 18.4467C13.9897 18.7692 13.8174 19.0598 13.6527 19.3173C15.4026 18.9238 16.921 17.9186 17.9717 16.5382C17.2782 16.1477 16.3901 15.743 15.3224 15.4467ZM12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" fill="#3f9f42"/>
                        </svg>
                      </span>
                      {/* {combinedResponses[currentIndex]?.website || "NA"} */}
                    </a>
                    {/* <span style={{ whiteSpace: "pre" }}> </span>| */}
                    <ReactTooltip anchorSelect="#li-icon-tooltip" place="top">
                      Open this contact in LinkedIn
                    </ReactTooltip>
                    <a
                      href={combinedResponses[currentIndex]?.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        verticalAlign: "middle",
                        height: "25px",
                        display: "inline-block",
                      }}
                      id="li-icon-tooltip"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20px"
                        height="20px"
                        viewBox="0 0 24 24"
                        fill="#333333"
                      >
                        <path
                          d="M6.5 8C7.32843 8 8 7.32843 8 6.5C8 5.67157 7.32843 5 6.5 5C5.67157 5 5 5.67157 5 6.5C5 7.32843 5.67157 8 6.5 8Z"
                          fill="#3f9f42"
                        ></path>
                        <path
                          d="M5 10C5 9.44772 5.44772 9 6 9H7C7.55228 9 8 9.44771 8 10V18C8 18.5523 7.55228 19 7 19H6C5.44772 19 5 18.5523 5 18V10Z"
                          fill="#3f9f42"
                        ></path>
                        <path
                          d="M11 19H12C12.5523 19 13 18.5523 13 18V13.5C13 12 16 11 16 13V18.0004C16 18.5527 16.4477 19 17 19H18C18.5523 19 19 18.5523 19 18V12C19 10 17.5 9 15.5 9C13.5 9 13 10.5 13 10.5V10C13 9.44771 12.5523 9 12 9H11C10.4477 9 10 9.44772 10 10V18C10 18.5523 10.4477 19 11 19Z"
                          fill="#3f9f42"
                        ></path>
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M20 1C21.6569 1 23 2.34315 23 4V20C23 21.6569 21.6569 23 20 23H4C2.34315 23 1 21.6569 1 20V4C1 2.34315 2.34315 1 4 1H20ZM20 3C20.5523 3 21 3.44772 21 4V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3H20Z"
                          fill="#3f9f42"
                        ></path>
                      </svg>
                    </a>
                    <ReactTooltip
                      anchorSelect="#email-icon-tooltip"
                      place="top"
                    >
                      Open this email in your local email client
                    </ReactTooltip>
                    <a
                      href={`mailto:${
                        combinedResponses[currentIndex]?.email || ""
                      }?subject=${encodeURIComponent(
                        combinedResponses[currentIndex]?.subject || ""
                      )}&body=${encodeURIComponent(
                        combinedResponses[currentIndex]?.pitch || ""
                      )}`}
                      title="Open this email in your local email client"
                      className="ml-5"
                      style={{
                        verticalAlign: "middle",
                        height: "33px",
                        display: "inline-block",
                      }}
                      id="email-icon-tooltip"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="29px"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M3.75 5.25L3 6V18L3.75 18.75H20.25L21 18V6L20.25 5.25H3.75ZM4.5 7.6955V17.25H19.5V7.69525L11.9999 14.5136L4.5 7.6955ZM18.3099 6.75H5.68986L11.9999 12.4864L18.3099 6.75Z"
                          fill="#3f9f42"
                        ></path>
                      </svg>
                    </a>
                  </div>
                  <div className="d-flex mb-10 align-items-center justify-between flex-col-991">
                    <div className="d-flex">
                      <div className="d-flex ml-10 output-responsive-button-group justify-center-991 col-12-991 flex-col-640">
                        <button
                          className={`button pad-10 d-flex align-center align-self-center output-email-width-button-mobile justify-center
                              ${outputEmailWidth === "Mobile" && "bg-active"}
                              `}
                          onClick={() => toggleOutputEmailWidth("Mobile")}
                        >
                          <svg
                            fill="#000000"
                            data-name="Layer 1"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 120 120"
                            style={{ width: "20px" }}
                          >
                            <path d="M85.81 120H34.19a8.39 8.39 0 0 1-8.38-8.39V8.39A8.39 8.39 0 0 1 34.19 0h51.62a8.39 8.39 0 0 1 8.38 8.39v103.22a8.39 8.39 0 0 1-8.38 8.39zM34.19 3.87a4.52 4.52 0 0 0-4.51 4.52v103.22a4.52 4.52 0 0 0 4.51 4.52h51.62a4.52 4.52 0 0 0 4.51-4.52V8.39a4.52 4.52 0 0 0-4.51-4.52z" />
                            <path d="M73.7 10.32H46.3L39.28 3.3 42.01.57l5.89 5.88h24.2L77.99.57l2.73 2.73-7.02 7.02zM47.1 103.23h25.81v3.87H47.1z" />
                          </svg>
                          {/* <span className="ml-3 font-size-medium">Mobile View</span> */}
                        </button>
                        <button
                          className={`button pad-10 ml-5 d-flex align-center align-self-center output-email-width-button-tab justify-center
                              ${outputEmailWidth === "Tab" && "bg-active"}
                              `}
                          onClick={() => toggleOutputEmailWidth("Tab")}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            xmlnsXlink="http://www.w3.org/1999/xlink"
                            fill="#000000"
                            version="1.1"
                            id="Capa_1"
                            width="20px"
                            height="20px"
                            viewBox="0 0 54.355 54.355"
                            xmlSpace="preserve"
                          >
                            <g>
                              <g>
                                <path d="M8.511,54.355h37.333c1.379,0,2.5-1.121,2.5-2.5V2.5c0-1.378-1.121-2.5-2.5-2.5H8.511c-1.379,0-2.5,1.122-2.5,2.5v49.354    C6.011,53.234,7.133,54.355,8.511,54.355z M9.011,3h36.333v48.354H9.011V3z" />
                                <path d="M40.928,6.678h-27.5c-0.827,0-1.5,0.673-1.5,1.5v34.25c0,0.827,0.673,1.5,1.5,1.5h27.5c0.827,0,1.5-0.673,1.5-1.5V8.178    C42.428,7.351,41.755,6.678,40.928,6.678z M41.428,42.428c0,0.275-0.224,0.5-0.5,0.5h-27.5c-0.276,0-0.5-0.225-0.5-0.5V8.178    c0-0.276,0.224-0.5,0.5-0.5h27.5c0.276,0,0.5,0.224,0.5,0.5V42.428z" />
                                <path d="M27.178,45.013c-1.378,0-2.499,1.121-2.499,2.499s1.121,2.499,2.499,2.499c1.377,0,2.498-1.121,2.498-2.499    S28.556,45.013,27.178,45.013z M27.178,49.01c-0.827,0-1.499-0.672-1.499-1.499s0.672-1.499,1.499-1.499    c0.826,0,1.498,0.672,1.498,1.499S28.005,49.01,27.178,49.01z" />
                              </g>
                            </g>
                          </svg>
                          {/* <span className="ml-3 font-size-medium">Tab View</span> */}
                        </button>
                        <button
                          className={`button pad-10 ml-5 d-flex align-center align-self-center output-email-width-button-desktop justify-center
                              ${outputEmailWidth === "" && "bg-active"}
                              `}
                          onClick={() => toggleOutputEmailWidth("")}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="#000000"
                            width="20"
                            height="20"
                            viewBox="0 -3 32 32"
                            preserveAspectRatio="xMidYMid"
                          >
                            <path d="M30.000,21.000 L17.000,21.000 L17.000,24.000 L22.047,24.000 C22.600,24.000 23.047,24.448 23.047,25.000 C23.047,25.552 22.600,26.000 22.047,26.000 L10.047,26.000 C9.494,26.000 9.047,25.552 9.047,25.000 C9.047,24.448 9.494,24.000 10.047,24.000 L15.000,24.000 L15.000,21.000 L2.000,21.000 C0.898,21.000 0.000,20.103 0.000,19.000 L0.000,2.000 C0.000,0.897 0.898,0.000 2.000,0.000 L30.000,0.000 C31.103,0.000 32.000,0.897 32.000,2.000 L32.000,19.000 C32.000,20.103 31.103,21.000 30.000,21.000 ZM2.000,2.000 L2.000,19.000 L29.997,19.000 L30.000,2.000 L2.000,2.000 Z" />
                          </svg>
                          {/* <span className="ml-5 font-size-medium">Desktop</span> */}
                        </button>
                      </div>

                      {/* Your existing Generated/Existing indicator */}
                      {/* {combinedResponses[currentIndex]?.generated ? (
                            <span
                              className="generated-indicator d-flex align-center"
                              title="Generated Content"
                            >
                              Generated
                            </span>
                          ) : (
                            combinedResponses[currentIndex] && (
                              <span
                                className="existing-indicator d-flex align-center ml-10"
                                title="Existing Content"
                              >
                                Existing
                              </span>
                            )
                          )} */}
                    </div>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: "20px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "start", // changed from flex-start to center
                    }}
                  >
                    {/* Subject field - 48% width */}
                    <div style={{ flex: "0 0 47%", paddingRight: "15px" }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontWeight: "600",
                          fontSize: "14px",
                        }}
                      >
                        Subject
                      </label>
                      <div
                        className="textarea-full-height"
                        style={{
                          minHeight: "30px",
                          maxHeight: "120px",
                          padding: "8px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          fontFamily: "inherit",
                          fontSize: "14px",
                          backgroundColor: "#f9f9f9",
                          overflowY: "auto",
                          width: "100%",
                          whiteSpace: "normal",
                          wordWrap: "break-word",
                        }}
                      >
                        {combinedResponses[currentIndex]?.subject ||
                          "No subject available"}
                      </div>
                    </div>

                    {/* BCC field - 20% width */}
                    <div style={{ flex: "0 0 15%", paddingRight: "15px" }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontWeight: "600",
                          fontSize: "14px",
                        }}
                      >
                        BCC
                      </label>
                      <select
                        className="form-control"
                        value={
                          bccSelectMode === "other"
                            ? "Other"
                            : emailFormData.BccEmail
                        }
                        onChange={(e) => {
                          const selected = e.target.value;
                          if (selected === "Other") {
                            setBccSelectMode("other");
                            setEmailFormData({
                              ...emailFormData,
                              BccEmail: "",
                            });
                            localStorage.setItem("lastBCCOtherMode", "true");
                            // Do NOT clear lastBCC, keep it if exists
                          } else {
                            setBccSelectMode("dropdown");
                            setEmailFormData({
                              ...emailFormData,
                              BccEmail: selected,
                            });
                            localStorage.setItem("lastBCCOtherMode", "false");
                            localStorage.setItem("lastBCC", selected);
                          }
                        }}
                        style={{
                          width: "100%",
                          padding: "10px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          fontSize: "inherit",
                          minHeight: "30px",
                          marginBottom: bccSelectMode === "other" ? "8px" : 0,
                          background: "#f8fff8",
                        }}
                      >
                        <option value="">Select BCC email</option>
                        {bccOptions.map((option) => (
                          <option
                            key={option.id}
                            value={option.bccEmailAddress}
                          >
                            {option.bccEmailAddress}
                          </option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                      {bccSelectMode === "other" && (
                        <input
                          type="email"
                          placeholder="Type BCC email"
                          value={emailFormData.BccEmail}
                          onChange={(e) => {
                            setEmailFormData({
                              ...emailFormData,
                              BccEmail: e.target.value,
                            });
                            localStorage.setItem("lastBCC", e.target.value); // <== store as soon as typed
                          }}
                          style={{
                            width: "100%",
                            padding: "10px",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            fontSize: "inherit",
                            minHeight: "30px",
                            marginTop: "8px",
                            background: "#f8fff8",
                          }}
                        />
                      )}
                    </div>

                    {/* From Email field - 20% width */}
                    <div style={{ flex: "0 0 15%", paddingRight: "15px" }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontWeight: "600",
                          fontSize: "14px",
                        }}
                      >
                        From
                      </label>
                      <select
                        className="form-control"
                        value={selectedSmtpUser}
                        onChange={(e) => setSelectedSmtpUser(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          fontSize: "inherit",
                          minHeight: "30px",
                        }}
                      >
                        <option value="">Select sender</option>
                        {smtpUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.username}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Send Button - 10% width to align in row */}
                    <div
                      style={{
                        flex: "0 0 10%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        marginLeft:'auto'
                      }}
                    >
                      <ReactTooltip
                        anchorSelect="#output-send-email-tooltip"
                        place="top"
                      >
                        Send email
                      </ReactTooltip>
                      <button
                        id="output-send-email-btn"
                        type="button"
                        className="button save-button x-small d-flex align-center align-self-center my-5-640 mr-[5px]"
                        onClick={async () => {
                          if (!combinedResponses[currentIndex]) {
                            toast.error("No contact selected");
                            return;
                          }

                          if (!selectedSmtpUser) {
                            toast.error("Please select From email");
                            return;
                          }

                          const subject =
                            combinedResponses[currentIndex]?.subject ||
                            "No subject";

                          await handleSendEmail(subject); // 👈 Pass subject here
                        }}
                        disabled={
                          !combinedResponses[currentIndex] ||
                          sendingEmail ||
                          sessionStorage.getItem("isDemoAccount") === "true"
                        }
                        style={{
                          cursor:
                            combinedResponses[currentIndex] && !sendingEmail
                              ? "pointer"
                              : "not-allowed",
                          padding: "5px 15px",
                          opacity:
                            combinedResponses[currentIndex] && !sendingEmail
                              ? 1
                              : 0.6,
                          height: "38px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginTop: "30px",
                        }}
                      >
                        {!sendingEmail && emailMessage === "" && "Send"}
                        {sendingEmail && "Sending..."}
                        {!sendingEmail && emailMessage && "Sent"}
                      </button>
                      <span className="relative top-[15px]">
                          <svg id="send-email-info" width="14px" height="14px" viewBox="0 0 24 24" fill="#555555" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 17.75C12.4142 17.75 12.75 17.4142 12.75 17V11C12.75 10.5858 12.4142 10.25 12 10.25C11.5858 10.25 11.25 10.5858 11.25 11V17C11.25 17.4142 11.5858 17.75 12 17.75Z" fill="#1C274C"/>
                          <path d="M12 7C12.5523 7 13 7.44772 13 8C13 8.55228 12.5523 9 12 9C11.4477 9 11 8.55228 11 8C11 7.44772 11.4477 7 12 7Z" fill="#1C274C"/>
                          <path fill-rule="evenodd" clip-rule="evenodd" d="M1.25 12C1.25 6.06294 6.06294 1.25 12 1.25C17.9371 1.25 22.75 6.06294 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12ZM12 2.75C6.89137 2.75 2.75 6.89137 2.75 12C2.75 17.1086 6.89137 21.25 12 21.25C17.1086 21.25 21.25 17.1086 21.25 12C21.25 6.89137 17.1086 2.75 12 2.75Z" fill="#1C274C"/>
                        </svg>
                      </span>
                      <ReactTooltip anchorSelect="#send-email-info" place="top">
                        Send this email
                      </ReactTooltip>
                      <button
                        type="button"
                        className="ml-1 button save-button x-small d-flex align-center align-self-center my-5-640 mr-[5px]"
                        onClick={() => {
                          console.log('Button clicked, isBulkSending:', isBulkSending);
                          
                          if (isBulkSending) {
                            console.log('Stopping bulk send...');
                            stopBulkSending();
                          } else {
                            // Check if SMTP is selected before starting
                            if (!selectedSmtpUser) {
                              toast.error("Please select From email first");
                              return;
                            }
                            console.log('Starting bulk send...');
                            sendEmailsInBulk(currentIndex);
                          }
                        }}
                        disabled={
                          sessionStorage.getItem("isDemoAccount") === "true"
                        }
                        style={{
                          cursor:
                            sessionStorage.getItem("isDemoAccount") !== "true"
                              ? "pointer"
                              : "not-allowed",
                          padding: "5px 15px",
                          opacity:
                            sessionStorage.getItem("isDemoAccount") !== "true"
                              ? 1
                              : 0.6,
                          height: "38px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginTop: "30px",
                        }}
                      >
                        {isBulkSending ? "Stop" : "Send All"}
                      </button>
                    </div>

                 
                    {/* Email Sent Date - remaining width */}
                    <div
                      style={{
                        flex: "1",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        justifyContent: "center",
                        marginLeft: "0px", // keeps alignment similar to your existing pitch date
                      }}
                    >
                      {/* Pitch Generated Date */}
                      <span
                        style={{
                          fontSize: "13px",
                          color: "#666",
                          fontStyle: "italic",
                        }}
                      >
                        {combinedResponses[currentIndex]?.lastemailupdateddate
                          ? `Krafted: ${formatLocalDateTime(
                              combinedResponses[currentIndex]
                                ?.lastemailupdateddate
                            )}`
                          : ""}
                      </span>

                      {/* Email Sent Date */}
                      <span
                        style={{
                          fontSize: "13px",
                          color: "#666",
                          fontStyle: "italic",
                          marginTop: "5px",
                        }}
                      >
                        {combinedResponses[currentIndex]?.emailsentdate
                          ? `Emailed: ${formatLocalDateTime(
                              combinedResponses[currentIndex]?.emailsentdate
                            )}`
                          : ""}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="pos-relative d-flex justify-center">
                  {isEditing ? (
                    <div
                      className="editor-container"
                      style={{
                        width: "100%",
                        maxWidth: `${
                          outputEmailWidth === "Mobile"
                            ? "480px"
                            : outputEmailWidth === "Tab"
                            ? "768px"
                            : "100%"
                        }`,
                      }}
                    >
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
                            width: "auto",
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
                          onClick={() => document.execCommand("strikeThrough")}
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
                        className="textarea-full-height preview-content-area"
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
                          whiteSpace: "normal",
                          overflowY: "auto",
                          overflowX: "auto", // Add horizontal overflow
                          boxSizing: "border-box", // Add box-sizing
                          wordWrap: "break-word", // Add word-wrap
                          width: "100%", // Add width

                          outline: "none",
                        }}
                      />

                      <div className="editor-actions mt-10 d-flex">
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
                        className="textarea-full-height preview-content-area"
                        style={{
                          minHeight: "500px",
                          padding: "10px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          fontFamily: "inherit",
                          fontSize: "inherit",
                          whiteSpace: "normal",
                          overflowY: "auto",
                          overflowX: "auto",
                          boxSizing: "border-box",
                          wordWrap: "break-word",
                          width: "100%",
                          maxWidth: `${
                            outputEmailWidth === "Mobile"
                              ? "480px"
                              : outputEmailWidth === "Tab"
                              ? "768px"
                              : "100%"
                          }`,
                        }}
                        dangerouslySetInnerHTML={{
                          __html: aggressiveCleanHTML(
                            combinedResponses[currentIndex]?.pitch || ""
                          ),
                        }}
                      ></div>
                      <div className="output-email-floated-icons d-flex">
                        <>
                          <ReactTooltip
                            anchorSelect="#edit-email-body-tooltip"
                            place="top"
                          >
                            Edit this email body
                          </ReactTooltip>
                          <button
                            id="edit-email-body-tooltip"
                            className="edit-button button d-flex align-center justify-center square-40"
                            onClick={() => setIsEditing(true)}
                          >
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
                              />
                            </svg>
                            {/* <span className="ml-3">Edit</span> */}
                          </button>
                        </>

                        {userRole === "ADMIN" && (
                          <>
                            <ReactTooltip
                              anchorSelect="#regenerate-email-body-tooltip"
                              place="top"
                            >
                              Regenerate this email body
                            </ReactTooltip>
                            <button
                              id="regenerate-email-body-tooltip"
                              onClick={() => {
                                if (!combinedResponses[currentIndex]) {
                                  alert(
                                    "No contact selected to regenerate pitch for."
                                  );
                                  return;
                                }
                                if (!onRegenerateContact) {
                                  alert(
                                    "Regenerate logic not wired up! Consult admin."
                                  );
                                  return;
                                }
                                setIsRegenerating(true);
                                setRegenerationTargetId(
                                  combinedResponses[currentIndex].id
                                );

                                const regenerateIndex = currentIndex;

                                onRegenerateContact("Output", {
                                  regenerate: true,
                                  regenerateIndex: regenerateIndex, // Use currentIndex instead of 0
                                });

                                setTimeout(
                                  () => setIsRegenerating(false),
                                  2500
                                );
                              }}
                              disabled={
                                !combinedResponses[currentIndex] ||
                                !isResetEnabled ||
                                isRegenerating
                              }
                              className="button square-40  !bg-transparent justify-center !disabled:bg-transparent"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                borderRadius: "4px",
                                background:'none !important',
                                cursor:
                                  combinedResponses[currentIndex] &&
                                  !isRegenerating
                                    ? "pointer"
                                    : "not-allowed",
                                opacity:
                                  combinedResponses[currentIndex] &&
                                  !isRegenerating
                                    ? 1
                                    : 0.6,
                              }}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20px"
                                height="20px"
                                viewBox="0 0 16 16"
                                fill="none"
                              >
                                <g fill="#000000">
                                  <path d="M8 1.5A6.5 6.5 0 001.5 8 .75.75 0 010 8a8 8 0 0113.5-5.81v-.94a.75.75 0 011.5 0v3a.75.75 0 01-.75.75h-3a.75.75 0 010-1.5h1.44A6.479 6.479 0 008 1.5zM15.25 7.25A.75.75 0 0116 8a8 8 0 01-13.5 5.81v.94a.75.75 0 01-1.5 0v-3a.75.75 0 01.75-.75h3a.75.75 0 010 1.5H3.31A6.5 6.5 0 0014.5 8a.75.75 0 01.75-.75z" />
                                </g>
                              </svg>
                            </button>
                          </>
                        )}
                        <>
                          {/* Your existing Copy to clipboard button */}
                          <ReactTooltip
                            anchorSelect="#copy-to-clipboard-tooltip"
                            place="top"
                          >
                            Copy the email body to clipboard
                          </ReactTooltip>
                          <button
                            id="copy-to-clipboard-tooltip"
                            className={`button d-flex align-center square-40 justify-center ${
                              isCopyText && "save-button auto-width"
                            }`}
                            onClick={copyToClipboardHandler}
                          >
                            {isCopyText ? (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24px"
                                height="24px"
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
                                xmlns="http://www.w3.org/2000/svg"
                                fill="#000000"
                                width="24px"
                                height="24px"
                                viewBox="0 0 32 32"
                                version="1.1"
                              >
                                <title>clipboard-check</title>
                                <path d="M26 4.75h-2c-0.69 0-1.25 0.56-1.25 1.25s0.56 1.25 1.25 1.25v0h0.75v21.5h-17.5v-21.5h0.75c0.69 0 1.25-0.56 1.25-1.25s-0.56-1.25-1.25-1.25v0h-2c-0.69 0-1.25 0.56-1.25 1.25v0 24c0 0.69 0.56 1.25 1.25 1.25h20c0.69-0.001 1.249-0.56 1.25-1.25v-24c-0-0.69-0.56-1.25-1.25-1.25h-0zM11 9.249h10c0.69 0 1.25-0.56 1.25-1.25s-0.56-1.25-1.25-1.25v0h-1.137c0.242-0.513 0.385-1.114 0.387-1.748v-0.001c0-2.347-1.903-4.25-4.25-4.25s-4.25 1.903-4.25 4.25v0c0.002 0.635 0.145 1.236 0.398 1.775l-0.011-0.026h-1.137c-0.69 0-1.25 0.56-1.25 1.25s0.56 1.25 1.25 1.25v0zM14.25 5c0-0 0-0.001 0-0.001 0-0.966 0.784-1.75 1.75-1.75s1.75 0.784 1.75 1.75c0 0.966-0.784 1.75-1.75 1.75v0c-0.966-0.001-1.748-0.783-1.75-1.749v-0zM19.957 13.156l-6.44 7.039-1.516-1.506c-0.226-0.223-0.536-0.361-0.878-0.361-0.69 0-1.25 0.56-1.25 1.25 0 0.345 0.14 0.658 0.366 0.884v0l2.44 2.424 0.022 0.015 0.015 0.021c0.074 0.061 0.159 0.114 0.25 0.156l0.007 0.003c0.037 0.026 0.079 0.053 0.123 0.077l0.007 0.003c0.135 0.056 0.292 0.089 0.457 0.089 0.175 0 0.341-0.037 0.491-0.103l-0.008 0.003c0.053-0.031 0.098-0.061 0.14-0.094l-0.003 0.002c0.102-0.050 0.189-0.11 0.268-0.179l-0.001 0.001 0.015-0.023 0.020-0.014 7.318-8c0.203-0.222 0.328-0.518 0.328-0.844 0-0.69-0.559-1.25-1.25-1.25-0.365 0-0.693 0.156-0.921 0.405l-0.001 0.001z" />
                              </svg>
                            )}
                            {/* <span className={`ml-5 ${isCopyText && "white"}`}>
                              {isCopyText ? "Copied!" : "Copy to clipboard"}
                            </span> */}
                          </button>
                        </>
                      </div>

                      <button
                        className="full-view-icon d-flex align-center justify-center"
                        onClick={() => handleModalOpen("modal-output-2")}
                      >
                        <svg width="30px" height="30px" viewBox="0 0 512 512">
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
              {showEmailModal && (
                <div
                  className="modal-backdrop"
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmailFormData({ Subject: "", BccEmail: "" });
                    setSelectedSmtpUser("");
                    setEmailMessage("");
                    setEmailError("");
                  }}
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                    backdropFilter: "blur(5px)",
                    zIndex: 9,
                  }}
                />
              )}

<Modal
  show={openModals["modal-output-2"]}
  closeModal={() => {
    handleModalClose("modal-output-2");
    setIsEditing(false);
  }}
  buttonLabel=""
>
  <form
    className="full-height"
    style={{
      margin: 0,
      padding: 0,
      maxHeight: "85vh",
      overflow: "auto",
      minWidth: 0,
    }}
  >
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <h2 style={{ margin: 0, padding: "12px 0" }}>Edit Email Body – Full View</h2>
      <button
        type="button"
        style={{
          border: "none",
          background: "transparent",
          fontSize: "1.7rem",
          cursor: "pointer",
        }}
        onClick={() => {
          handleModalClose("modal-output-2");
          setIsEditing(false);
        }}
        aria-label="Close"
        title="Close"
      >×</button>
    </div>
    <div>
      <label>Email Body</label>
      <div>
        <div
          ref={editorRef}
          contentEditable={true}
          suppressContentEditableWarning={true}
          className="textarea-full-height preview-content-area"
          dangerouslySetInnerHTML={{
            __html: editableContent,
          }}
          onInput={e => setEditableContent(e.currentTarget.innerHTML)}
          onBlur={e => setEditableContent(e.currentTarget.innerHTML)}
          style={{
            minHeight: "340px",
            height: "auto",
            maxHeight: "none",
            overflow: "visible",
            background: "#fff",
            width: "100%",
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "4px",
            fontFamily: "inherit",
            fontSize: "inherit",
            whiteSpace: "normal",
            boxSizing: "border-box",
            wordWrap: "break-word",
          }}
        />
      </div>
    </div>
  </form>
</Modal>
            </>
          )}
          {tab2 === "Stages" && userRole === "ADMIN" && (
            <>
              <div className="tabs secondary d-flex align-center ">
                <ul className="d-flex full-width flex-wrap-991">
                  <li className="flex-50percent-991 flex-full-640">
                    <button
                      onClick={tabHandler3}
                      className={`button full-width ${
                        tab3 === "Stages" ? "active" : ""
                      }`}
                    >
                      Stages
                    </button>
                  </li>
                  <li className="flex-50percent-991 flex-full-640">
                    <button
                      onClick={() => setTab3("Search results")}
                      className={`button full-width ${
                        tab3 === "Search results" ? "active" : ""
                      }`}
                    >
                      Search results
                    </button>
                  </li>
                  <li className="flex-50percent-991 flex-full-640">
                    <button
                      onClick={tabHandler3}
                      className={`button full-width ${
                        tab3 === "All sourced data" ? "active" : ""
                      }`}
                    >
                      All sourced data
                    </button>
                  </li>
                  <li className="flex-50percent-991 flex-full-640">
                    <button
                      onClick={tabHandler3}
                      className={`button full-width ${
                        tab3 === "Sourced data summary" ? "active" : ""
                      }`}
                    >
                      Sourced data summary
                    </button>
                  </li>
                </ul>
              </div>
              {tab3 === "Stages" && (
                <div className="form-group">
                  <div className="d-flex mb-10"></div>
                  <span className="pos-relative d-flex justify-center">
                    <div
                      className="textarea-full-height preview-content-area"
                      style={{
                        height: "800px", // set a fixed height for scrolling
                        width: "100%",
                        padding: "10px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        fontFamily: "inherit",
                        fontSize: "inherit",
                        whiteSpace: "pre-wrap", // keeps line breaks
                        overflowY: "auto", // vertical scrollbar
                        overflowX: "auto", // horizontal scrollbar if needed
                        boxSizing: "border-box", // ensures padding doesn't exceed width
                      }}
                      dangerouslySetInnerHTML={{
                        __html:
                          typeof allprompt[currentIndex] === "string"
                            ? allprompt[currentIndex]
                            : "No prompt available.",
                      }}
                    ></div>

                    <Modal
                      show={openModals["modal-output-3"]}
                      closeModal={() => handleModalClose("modal-output-3")}
                      buttonLabel="Ok"
                    >
                      <label>Stages</label>

                      <pre
                        className="textarea-full-height preview-content-area"
                        dangerouslySetInnerHTML={{
                          __html:
                            typeof allprompt[currentIndex] === "string"
                              ? allprompt[currentIndex]
                              : "No prompt available.",
                        }}
                      ></pre>
                    </Modal>
                    <button
                      className="full-view-icon d-flex align-center justify-center"
                      onClick={() => handleModalOpen("modal-output-3")}
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
                  </span>
                </div>
              )}

              {tab3 === "Search results" && (
                <div className="form-group">
                  <h3>
                    Search results for "
                    {allSearchTermBodies[currentIndex] || "N/A"}"
                  </h3>
                  <span className="pos-relative">
                    <div
                      className="textarea-full-height preview-content-area"
                      style={{
                        height: "800px",
                        width: "100%",
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
                    >
                      <ul>
                        {(allsearchResults[currentIndex] ?? []).length === 0 ? (
                          <li>No search results available.</li>
                        ) : (
                          allsearchResults[currentIndex].map(
                            (result: string, index: number) => (
                              <li key={index}>
                                <a
                                  href={result}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {result}
                                </a>
                              </li>
                            )
                          )
                        )}
                      </ul>
                    </div>

                    <Modal
                      show={openModals["modal-output-search"]}
                      closeModal={() => handleModalClose("modal-output-search")}
                      buttonLabel="Ok"
                    >
                      <label>
                        Search results for "
                        {allSearchTermBodies[currentIndex] || "N/A"}"
                      </label>
                      <pre className="textarea-full-height preview-content-area">
                        <ul>
                          {(allsearchResults[currentIndex] ?? []).length ===
                          0 ? (
                            <li>No search results available.</li>
                          ) : (
                            allsearchResults[currentIndex].map(
                              (result: string, index: number) => (
                                <li key={index}>
                                  <a
                                    href={result}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {result}
                                  </a>
                                </li>
                              )
                            )
                          )}
                        </ul>
                      </pre>
                    </Modal>
                    <button
                      className="full-view-icon d-flex align-center justify-center"
                      onClick={() => handleModalOpen("modal-output-search")}
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
                  </span>
                </div>
              )}

              {tab3 === "All sourced data" && (
                <div className="form-group">
                  <h3>All sourced data</h3>
                  <span className="pos-relative">
                    <div
                      className="textarea-full-height preview-content-area"
                      style={{
                        height: "800px",
                        width: "100%",
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
                    >
                      <p>
                        {typeof everyscrapedData[currentIndex] === "string"
                          ? everyscrapedData[currentIndex]
                          : "No sourced data available."}
                      </p>{" "}
                    </div>

                    <Modal
                      show={openModals["modal-output-scraped"]}
                      closeModal={() =>
                        handleModalClose("modal-output-scraped")
                      }
                      buttonLabel="Ok"
                    >
                      <label>All sourced data</label>
                      <pre className="textarea-full-height preview-content-area">
                        <p>
                          {typeof everyscrapedData[currentIndex] === "string"
                            ? everyscrapedData[currentIndex]
                            : "No sourced data available."}
                        </p>{" "}
                      </pre>
                    </Modal>
                    <button
                      className="full-view-icon d-flex align-center justify-center"
                      onClick={() => handleModalOpen("modal-output-scraped")}
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
                  </span>
                </div>
              )}

              {tab3 === "Sourced data summary" && (
                <div className="form-group">
                  <h3>Sourced data summary</h3>
                  <span className="pos-relative">
                    <div
                      className="textarea-full-height preview-content-area"
                      style={{
                        height: "800px",
                        width: "100%",
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
                    >
                      <p>
                        {typeof allsummery[currentIndex] === "string"
                          ? allsummery[currentIndex]
                          : "No summary available."}
                      </p>
                    </div>

                    <Modal
                      show={openModals["modal-output-summary"]}
                      closeModal={() =>
                        handleModalClose("modal-output-summary")
                      }
                      buttonLabel="Ok"
                    >
                      <label>Sourced data summary</label>
                      <pre className="textarea-full-height preview-content-area">
                        <p>
                          {typeof allsummery[currentIndex] === "string"
                            ? allsummery[currentIndex]
                            : "No summary available."}
                        </p>
                      </pre>
                    </Modal>
                    <button
                      className="full-view-icon d-flex align-center justify-center"
                      onClick={() => handleModalOpen("modal-output-summary")}
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
                  </span>
                </div>
              )}
            </>
          )}
          {/* Add this after the Output tab and before the Stages tab */}
          {tab2 === "Settings" && (
            <div className="settings-tab-content">
              <div className="col-5">
              <div className="form-group" style={{ flexWrap: "wrap" }}>
                <label style={{ width: "100%" }}>Subject</label>

                <div className="flex">
                  <select
                    onChange={(e) => setSubjectMode?.(e.target.value)}
                    value={subjectMode}
                    className="height-35"
                    style={{ minWidth: 150, marginRight: 10 }}
                  >
                    <option value="AI generated">AI generated</option>
                    <option value="With Placeholder">With placeholder</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Enter subject here"
                    value={subjectText}
                    onChange={(e) => setSubjectText?.(e.target.value)}
                    disabled={subjectMode !== "With Placeholder"}
                  />
                </div>
              </div>
            
          </div>
              <div className="form-group">
                <label>Language</label>
                <select
                  className="form-control"
                  value={toneSettings?.language || "English"}
                  onChange={(e) => toneSettingsHandler?.({ target: { name: 'language', value: e.target.value } })}
                  disabled={sessionStorage.getItem("isDemoAccount") === "true"}
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                  <option value="Italian">Italian</option>
                  <option value="Portuguese">Portuguese</option>
                  <option value="Dutch">Dutch</option>
                  <option value="Russian">Russian</option>
                  <option value="Chinese">Chinese</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Korean">Korean</option>
                </select>
              </div>

             
              <div className="form-group">
                <label>Emojis</label>
                <select
                  className="form-control"
                  value={toneSettings?.emojis || "None"}
                  onChange={(e) => toneSettingsHandler?.({ target: { name: 'emojis', value: e.target.value } })}
                  disabled={sessionStorage.getItem("isDemoAccount") === "true"}
                >
                  <option value="None">None</option>
                  <option value="Minimal">Minimal</option>
                  <option value="Few">Few</option>
                  <option value="Many">Many</option>
                </select>
              </div>

              <div className="form-group">
                <label>Tone</label>
                <select
                  className="form-control"
                  value={toneSettings?.tone || "Professional"}
                  onChange={(e) => toneSettingsHandler?.({ target: { name: 'tone', value: e.target.value } })}
                  disabled={sessionStorage.getItem("isDemoAccount") === "true"}
                >
                  <option value="Professional">Professional</option>
                  <option value="Casual">Casual</option>
                  <option value="Formal">Formal</option>
                  <option value="Friendly">Friendly</option>
                  <option value="Enthusiastic">Enthusiastic</option>
                  <option value="Conversational">Conversational</option>
                  <option value="Persuasive">Persuasive</option>
                  <option value="Empathetic">Empathetic</option>
                </select>
              </div>

              <div className="form-group">
                <label>Chatty Level</label>
                <select
                  className="form-control"
                  value={toneSettings?.chatty || "Medium"}
                  onChange={(e) => toneSettingsHandler?.({ target: { name: 'chatty', value: e.target.value } })}
                  disabled={sessionStorage.getItem("isDemoAccount") === "true"}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div className="form-group">
                <label>Creativity Level</label>
                <select
                  className="form-control"
                  value={toneSettings?.creativity || "Medium"}
                  onChange={(e) => toneSettingsHandler?.({ target: { name: 'creativity', value: e.target.value } })}
                  disabled={sessionStorage.getItem("isDemoAccount") === "true"}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div className="form-group">
                <label>Reasoning Level</label>
                <select
                  className="form-control"
                  value={toneSettings?.reasoning || "Medium"}
                  onChange={(e) => toneSettingsHandler?.({ target: { name: 'reasoning', value: e.target.value } })}
                  disabled={sessionStorage.getItem("isDemoAccount") === "true"}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div className="form-group">
                <label>Date Related Greeting</label>
                <select
                  className="form-control"
                  value={toneSettings?.dateGreeting || "No"}
                  onChange={(e) => toneSettingsHandler?.({ target: { name: 'dateGreeting', value: e.target.value } })}
                  disabled={sessionStorage.getItem("isDemoAccount") === "true"}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div className="form-group">
                <label>Date Related Farewell</label>
                <select
                  className="form-control"
                  value={toneSettings?.dateFarewell || "No"}
                  onChange={(e) => toneSettingsHandler?.({ target: { name: 'dateFarewell', value: e.target.value } })}
                  disabled={sessionStorage.getItem("isDemoAccount") === "true"}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              {sessionStorage.getItem("isDemoAccount") === "true" && (
                <div className="demo-notice" style={{
                  padding: "10px",
                  background: "#fff3cd",
                  border: "1px solid #ffeaa7",
                  borderRadius: "4px",
                  color: "#856404",
                  marginTop: "20px"
                }}>
                  <strong>Demo Mode:</strong> Settings are visible but disabled. Upgrade your account to enable these features.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Output;
