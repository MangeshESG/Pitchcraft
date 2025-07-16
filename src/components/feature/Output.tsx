import { useState, useEffect, useRef } from "react";
import Modal from "../common/Modal";
import { Tooltip as ReactTooltip } from "react-tooltip";
import { copyToClipboard } from "../../utils/utils";
import previousIcon from "../../assets/images/previous.png";
import nextIcon from "../../assets/images/Next.png";
import singleprvIcon from "../../assets/images/SinglePrv.png";
import singlenextIcon from "../../assets/images/SingleNext.png";
import excelIcon from "../../assets/images/icons/excel.png";
import emailIcon from "../../assets/images/icons/email.png";

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
  handleStart?: () => void;
  handlePauseResume?: () => void;
  handleReset?: () => void;
  isPitchUpdateCompleted?: boolean;
  allRecordsProcessed?: boolean;
  isDemoAccount?: boolean;
  settingsForm?: any;
  settingsFormHandler?: (e: any) => void;
  delayTime?: string;
  setDelay?: (value: string) => void;
  selectedPrompt?: any;
  selectedCampaign?: string;
  isProcessing?: boolean;
  handleClearAll?: () => void; // Optional prop for clearing all
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
  onRegenerateContact,
  recentlyAddedOrUpdatedId,
  setRecentlyAddedOrUpdatedId,
  selectedClient,
    isStarted,
  handleStart,
  handlePauseResume,
  handleReset,
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

  useEffect(() => {
    // Keep currentIndex as is when new responses are added
    if (currentIndex >= combinedResponses.length) {
      setCurrentIndex(combinedResponses.length - 1);
    }
  }, [allResponses, currentIndex, setCurrentIndex]);

  const clearUsage = () => {
    setOutputForm((prevOutputForm: any) => ({
      ...prevOutputForm,
      usage: "", // Correctly clears the usage field
    }));
  };

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
  // Define the saveToZoho function in your component
  const saveToZoho = async (
    content: string,
    responseId: string | number | undefined,
    subject: string | undefined
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
            email_subject: subject || "",
            accountId: "String", // Change to proper account id if available
          }),
        }
      );

      if (!updateContactResponse.ok) {
        const updateContactError = await updateContactResponse.json();
        console.error("Failed to update in Zoho:", updateContactError);

        setOutputForm((prevOutputForm) => ({
          ...prevOutputForm,
          generatedContent:
            `<span style="color: orange">[${formatDateTime(
              new Date()
            )}] Updating contact in database incomplete for contact ${full_name} with company name ${company_name}. Error: ${
              updateContactError.Message || JSON.stringify(updateContactError)
            }</span><br/>` + prevOutputForm.generatedContent,
        }));

        throw new Error(
          `Failed to update in Zoho: ${
            updateContactError.Message || JSON.stringify(updateContactError)
          }`
        );
      }

      // Success case
      console.log("Successfully updated in Zoho");

      setOutputForm((prevOutputForm) => ({
        ...prevOutputForm,
        generatedContent:
          `<span style="color: green">[${formatDateTime(
            new Date()
          )}] Updated pitch and subject in database for contact ${full_name} with company name ${company_name}.</span><br/>` +
          prevOutputForm.generatedContent,
      }));

      return await updateContactResponse.json();
    } catch (error) {
      console.error("Error saving to Zoho:", error);
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
      await saveToZoho(
        editableContent,
        combinedResponses[currentIndex]?.id,
        currentSubject
      );

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

  const handleSendEmail = async (subjectFromButton: string) => {
    setEmailMessage("");
    setEmailError("");

    const subjectToUse = subjectFromButton || emailFormData.Subject;

    if (!subjectToUse || !emailFormData.BccEmail || !selectedSmtpUser) {
      setEmailError(
        "Please fill in all required fields: Subject, BCC Email, and From Email."
      );
      return;
    }

    setSendingEmail(true);

    try {
      const currentContact = combinedResponses[currentIndex];
      const previousContact = combinedResponses[currentIndex - 1];
      const nextContact = combinedResponses[currentIndex + 1];

      const pageTokenToUse =
        previousContact?.nextPageToken || nextContact?.prevPageToken || "";

      console.log("Using pageToken:", pageTokenToUse);
      console.log("Sending email to:", currentContact?.name);

      const response = await axios.post(
        `${API_BASE_URL}/api/email/send-singleEmail`,
        {},
        {
          params: {
            ClientId: effectiveUserId,
            zohoViewName: selectedZohoviewId,
            pageToken: pageTokenToUse,
            subject: subjectToUse,
            SmtpID: selectedSmtpUser,
            ...(emailFormData.BccEmail && { BccEmail: emailFormData.BccEmail }),
          },
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      setEmailMessage(response.data.message || "Email sent successfully!");
      toast.success("Email sent successfully!");

      try {
        const updatePayload = {
          Id: currentContact.id,
          Last_Email_Body_Updated: new Date().toISOString(),
          PG_Added_Correctly: true,
        };

        const updateResponse = await axios.post(
          `${API_BASE_URL}/api/auth/update-contact-fields`,
          updatePayload,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );

        const updatedResponses = [...combinedResponses];
        updatedResponses[currentIndex] = {
          ...updatedResponses[currentIndex],
          emailsentdate: new Date().toISOString(),
          PG_Added_Correctly: true,
        };
        setCombinedResponses(updatedResponses);
      } catch (updateError) {
        console.error("Failed to update Zoho record:", updateError);
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

  return (
    <div className="login-box gap-down">
      {/* <div className="tabs secondary d-flex align-center"></div> */}
     
<div className="output-control-bar d-flex justify-between align-center mb-20">
  <div className="control-buttons d-flex align-center">
    {!isStarted ? (
      <button
        className="primary-button"
        onClick={handleStart}
        disabled={
          (!selectedPrompt?.name || !selectedZohoviewId) &&
          !selectedCampaign
        }
        title="Click to generate hyper-personalized emails using the selected template for contacts in the selected data file"
      >
        Start
      </button>
    ) : (
      <>
        <button
          className="primary-button"
          onClick={handlePauseResume}
          disabled={
            isPaused && (!isPitchUpdateCompleted || isProcessing)
          }
          title={
            isPaused
              ? allRecordsProcessed
                ? "Click to start a new process"
                : "Click to resume the generation of emails"
              : "Click to pause the generation of emails"
          }
        >
          {isPaused
            ? allRecordsProcessed
              ? "Start"
              : "Resume"
            : "Pause"}
        </button>

        {isPaused && (
          <button
            className="secondary-button ml-10"
            onClick={handleReset}
            disabled={
              !isPitchUpdateCompleted || isProcessing || !isPaused
            }
            title="Click to reset so that the generation of emails begins again from the first of the contacts in the selected data file"
          >
            Reset
          </button>
        )}
      </>
    )}
  </div>

  {/* Right side options */}
  <div className="output-control-options d-flex align-center">
    {!isDemoAccount && (
      <>
        <label className="checkbox-label mr-20">
          <input
            type="checkbox"
            checked={settingsForm.overwriteDatabase}
            name="overwriteDatabase"
            id="overwriteDatabase"
            onChange={settingsFormHandler}
          />
          <span>Overwrite database</span>
        </label>

        <div className="form-group d-flex align-center mb-0 mr-20">
          <label className="font-size-medium font-500 mb-0 mr-10">
            Delay(secs)
          </label>
          <input
            type="number"
            value={delayTime}
            onChange={(e: any) => setDelay?.(e.target.value)}
            className="height-35"
            style={{ width: "55px" }}
          />
        </div>
      </>
    )}
    
    {userRole === "ADMIN" && (
      <button
        className="secondary-button nowrap"
        onClick={handleClearAll}
        disabled={
          !isPitchUpdateCompleted || isProcessing || !isPaused
        }
        title="Clear all data and reset the application state"
      >
        Reset all
      </button>
    )}
  </div>
</div>
      {userRole === "ADMIN" && (
        <div className="row pb-2 d-flex align-center justify-end">
          <div className="col col-12">
            <div className="form-group d-flex justify-between">
              <label className="mb-0">Usage</label>
            </div>
            <div className="form-group d-flex justify-between">
              <span className="pos-relative full-width">
                <textarea
                  placeholder="Usage"
                  rows={1}
                  name="tkUsage"
                  value={outputForm.usage}
                  className="full-width"
                  onChange={outputFormHandler}
                ></textarea>
              </span>
              <button
                className="ml-10 button clear-button small d-flex align-center h-[100%] justify-center"
                onClick={clearUsage}
                style={{ height: "40px" }}
              >
                Clear Usage
              </button>
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
              <div className="d-flex align-center">
                <button
                  onClick={handleFirstPage}
                  disabled={
                    !isResetEnabled ||
                    (currentIndex === 0 && !combinedResponses[0]?.prevPageToken)
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "5px 10px",
                    backgroundColor: "#f0f0f0",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    cursor: "pointer",
                    height: "35px",
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
                    (currentIndex === 0 && !combinedResponses[0]?.prevPageToken)
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "5px 10px",
                    backgroundColor: "#f0f0f0",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    cursor: "pointer",
                    height: "35px",
                    marginLeft: "3px",
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
                    height: "35px",
                    marginLeft: "3px",
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
                    height: "35px",
                    marginLeft: "3px",
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
            </ul>
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
              <div className="form-group">
                <div className="d-flex mb-10 align-items-center">
                  {userRole === "ADMIN" && (
                    <button
                      className="button clear-button small d-flex align-center"
                      onClick={clearContent}
                    >
                      <span>Clear output</span>
                    </button>
                  )}
                </div>

                {/* THIS MESSAGE MOVED HERE, ABOVE OUTPUT */}
                {isPaused && !isResetEnabled && (
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
                    className="w-full p-3 border border-gray-300 rounded-lg overflow-y-auto height-50"
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
              <div className="form-group">
                <div className="d-flex mb-10 align-items-center justify-between flex-col-991">
                  <div className="d-flex"></div>

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
                    {combinedResponses[currentIndex]?.generated ? (
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
                    )}
                  </div>
                </div>
                <div className="d-flex mb-10">
                  <div className="text-center mt-2 d-flex align-center mr-20 mt-10-991 font-size-medium">
                    {combinedResponses.length > 0 && (
                      <>
                        <span>
                          Contact {currentIndex + 1} of{" "}
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
                          style={{ width: "70px", padding: "8px" }}
                        />
                      </>
                    )}
                  </div>
                  <div
                    className="contact-info lh-35 align-center d-inline-block word-wrap--break-word word-break--break-all"
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
                    <ReactTooltip anchorSelect="#li-icon-tooltip" place="top">
                      Open this contact in LinkedIn
                    </ReactTooltip>
                    <a
                      href={combinedResponses[currentIndex]?.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        verticalAlign: "middle",
                        height: "27px",
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
                        height: "31px",
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
                </div>
                <div className="form-group" style={{ marginBottom: "20px" }}>
                  <div
                    style={{
                      display: "flex",
                      gap: "15px",
                      alignItems: "center", // changed from flex-start to center
                    }}
                  >
                    {/* Subject field - 48% width */}
                    <div style={{ flex: "0 0 40%" }}>
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
                          padding: "10px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          fontFamily: "inherit",
                          fontSize: "inherit",
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
                    <div style={{ flex: "0 0 15%" }}>
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
                    <div style={{ flex: "0 0 15%" }}>
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
                        className="button save-button x-small d-flex align-center align-self-center ml-10 my-5-640 mr-10"
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
                          marginTop: "25px",
                        }}
                      >
                        {!sendingEmail && emailMessage === "" && "Send"}
                        {sendingEmail && "Sending..."}
                        {!sendingEmail && emailMessage && "Sent"}
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
                        paddingTop: "25px",
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
                          ? `Pitch generated: ${formatLocalDateTime(
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
                          ? `Email sent: ${formatLocalDateTime(
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
                          whiteSpace: "pre",
                          overflowY: "auto",
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
                              width="22px"
                              height="22px"
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
                              className="ml-5 button square-40  justify-center"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                backgroundColor: "#f0f0f0",
                                borderRadius: "4px",
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
                                width="15px"
                                height="15px"
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
                            className={`button d-flex align-center square-40 ml-5 justify-center ${
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
                                xmlns="http://www.w3.org/2000/svg"
                                fill="#000000"
                                width="20px"
                                height="20px"
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
                  setIsEditing(false); // Optionally exit edit mode globally
                }}
                buttonLabel=""
              >
                <form className="full-height">
                  <h2 className="left">Edit Email Body – Full View</h2>

                  <div className="form-group">
                    <label>Email Body</label>
                    <div className="editor-toolbar">
                      <button
                        type="button"
                        onClick={() => document.execCommand("bold")}
                      >
                        <strong>B</strong>
                      </button>
                      <button
                        type="button"
                        onClick={() => document.execCommand("italic")}
                      >
                        <em>I</em>
                      </button>
                      <button
                        type="button"
                        onClick={() => document.execCommand("underline")}
                      >
                        <u>U</u>
                      </button>
                      <button
                        type="button"
                        onClick={() => document.execCommand("strikeThrough")}
                      >
                        <s>S</s>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          document.execCommand("insertUnorderedList")
                        }
                      >
                        •
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          document.execCommand("insertOrderedList")
                        }
                      >
                        1.
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const url = prompt("Enter link URL:");
                          if (url)
                            document.execCommand("createLink", false, url);
                        }}
                      >
                        🔗
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const url = prompt("Enter image URL:");
                          if (url)
                            document.execCommand("insertImage", false, url);
                        }}
                      >
                        🖼️
                      </button>
                    </div>

                    {/* Scrollable content area */}
                    <div
                      className="full-modal-scroller"
                      style={{
                        maxHeight: "60vh", // Adjust height as needed
                        overflowY: "auto",
                        overflowX: "hidden",
                        marginBottom: "20px",
                        paddingRight: "8px", // for better UX
                      }}
                    >
                      <div
                        ref={editorRef}
                        contentEditable={true}
                        suppressContentEditableWarning={true}
                        className="textarea-full-height preview-content-area"
                        dangerouslySetInnerHTML={{
                          __html: editableContent,
                        }}
                        onInput={(e) =>
                          setEditableContent(e.currentTarget.innerHTML)
                        }
                        onBlur={(e) =>
                          setEditableContent(e.currentTarget.innerHTML)
                        }
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
                        }}
                      />
                    </div>
                  </div>

                  <div className="form-group d-flex editor-actions">
                    <button
                      type="button"
                      className="action-button button mr-10"
                      onClick={() => {
                        if (editorRef.current) {
                          setEditableContent(editorRef.current.innerHTML);
                          saveEditedContent();
                        }
                        handleModalClose("modal-output-2");
                      }}
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      className="secondary button"
                      onClick={() => handleModalClose("modal-output-2")}
                    >
                      Cancel
                    </button>
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
        </>
      )}
    </div>
  );
};

export default Output;
