'use client';

import React, { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "../../../config";
import { RootState } from "../../../Redux/store";
import { useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAngleRight,
  faBars,
  faBullhorn,
  faDashboard,
  faEdit,
  faEllipsisV,
  faEnvelope,
  faEnvelopeOpen,
  faFileAlt,
  faGear,
  faList,
  faRobot,
  faThumbtack, // Add this for Campaign Builder

} from "@fortawesome/free-solid-svg-icons"
import EditContactModal from "../EditContactModal";
import { useAppModal } from "../../../hooks/useAppModal";
import pitchLogo from "../../../assets/images/pitch_logo.png";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import emailPersonalizationIcon from "../../../assets/images/emailPersonal.png";
import RichTextEditor from '../../common/RTEEditor';
import DOMPurify from "dompurify";
import Detail from './Detail'
import deleteIcon from "../../../assets/images/deleteiconn.png";
import PushPinIcon from "@mui/icons-material/PushPin";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import pin from "../../../assets/images/point.png";
import unpin from "../../../assets/images/pinicon.png";
  


interface Contact {
  id: number;
  full_name: string;
  email: string;
  website?: string;
  company_name?: string;
  job_title?: string;
  linkedin_url?: string;
  country_or_address?: string;
  email_subject?: string;
  email_body?: string;
  created_at?: string;
  updated_at?: string | null;
  email_sent_at?: string | null;
  companyTelephone?: string;
  companyEmployeeCount?: string;
  companyIndustry?: string;
  companyLinkedInURL?: string;
  // companyEventLink?: string;
  unsubscribe?: string;
  notes?: string;
  contactCreatedAt?: string;
  linkedIninformation?: string;
}

const ContactDetailView: React.FC = () => {
  const params = useParams<{ contactId: string }>();
  const contactId = params.contactId;

  const [contact, setContact] = useState<any>(null);
  const [searchParams] = useSearchParams();
    const dataFileId =
      searchParams.get("dataFileId") || searchParams.get("dataField");

  const [activeTab, setActiveTab] = useState<"profile" | "history" | "lists">("profile");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailTimeline, setEmailTimeline] = useState<any[]>([]);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [detailContacts, setDetailContacts] = useState<Contact[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const appModal = useAppModal();
  // Side menu states
  // Side menu states
  const [tab, setTab] = useState("Dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showBlueprintSubmenu, setShowBlueprintSubmenu] = useState(false);
  const [showContactsSubmenu, setShowContactsSubmenu] = useState(false);
  const [showMailSubmenu, setShowMailSubmenu] = useState(false);
  const [blueprintSubTab, setBlueprintSubTab] = useState("List");
  const [contactsSubTab, setContactsSubTab] = useState("List");
  const [mailSubTab, setMailSubTab] = useState("Dashboard");
  const popupRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [showSupportPopup, setShowSupportPopup] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"all" | "notes" | "emails">("all");
  const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: 600,
    color: "#374151",
    marginBottom: 6,
  };
  const navigate = useNavigate();
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [noteText, setNoteText] = useState("");
  const noteEditorRef = useRef<HTMLDivElement | null>(null);

//   const NOTE_MAX_LENGTH = 10000;
//   const getPlainTextLength = (html: string) => {
//   if (!html) return 0;
//   const temp = document.createElement("div");
//   temp.innerHTML = html;
//   return (temp.textContent || temp.innerText || "").trim().length;
// };
// const plainTextLength = getPlainTextLength(noteText);
// const isSaveDisabled =
//   plainTextLength === 0 || plainTextLength > NOTE_MAX_LENGTH;
// useEffect(() => {
//   if (plainTextLength > NOTE_MAX_LENGTH) {
//     setToastMessage("You have exceeded the 10,000 character limit.");
//     setShowSuccessToast(true);

//     const timer = setTimeout(() => {
//       setShowSuccessToast(false);
//     }, 3000);

//     return () => clearTimeout(timer);
//   }
// }, [plainTextLength]);
 // const plainTextLength = noteText.replace(/<[^>]+>/g, "").length;
 const toastAnimation = `
@keyframes toastProgress {
  from { width: 100%; }
  to { width: 0%; }
}
`;
  useEffect(() => {
    const tooltips: Record<string, string> = {
      "ql-bold": "Bold",
      "ql-italic": "Italic",
      "ql-underline": "Underline",
      "ql-align": "Text alignment",
      "ql-list": "Bullet list",
    };

    Object.entries(tooltips).forEach(([className, title]) => {
      const buttons = document.getElementsByClassName(className);
      Array.from(buttons).forEach((btn) => {
        btn.setAttribute("title", title);
      });
    });
  }, []);
  const [isEmailPersonalization, setIsEmailPersonalization] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [notesHistory, setNotesHistory] = useState<any[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [noteActionsAnchor, setNoteActionsAnchor] = useState<string | null>(null);
  const menuBtnStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    textAlign: "left",
  };
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null);
  const [isDeletingNote, setIsDeletingNote] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [deletePopupOpen, setDeletePopupOpen] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);
  const [deleteContactId, setDeleteContactId] = useState<number | null>(null);
   const [expandedNoteIds, setExpandedNoteIds] = useState<Set<number>>(new Set());
 const [showErrorToast, setShowErrorToast] = useState(false);


const NOTE_MAX_LENGTH = 10000;
const MAX_TOTAL_NOTES = 40000;
 const getPlainText = (html: string): string => {
    if (!html) return "";
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
  };
  const getPlainTextLength = (html: string) => {
  if (!html) return 0;
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return (temp.textContent || temp.innerText || "").trim().length;
};
 const getTotalNotesLength = () => {
    if (!notesHistory || notesHistory.length === 0) return 0;
    return notesHistory.reduce((total: number, note: any) => {
      const plainText = getPlainText(note.note || "");
      return total + plainText.length;
    }, 0);
  };
const plainTextLength = getPlainTextLength(noteText);
const totalNotesLength = getTotalNotesLength();
const newNotePlainText = getPlainText(noteText || "");
  // 🔹 When editing: subtract old note length from total
let projectedTotalLength = totalNotesLength + newNotePlainText.length;
if (isEditMode && editingNoteId) {
  const oldNote = notesHistory.find((n: any) => n.id === editingNoteId);
  if (oldNote) {
    const oldLength = getPlainText(oldNote.note || "").length;
    projectedTotalLength = totalNotesLength - oldLength + newNotePlainText.length;
  }
}
const isSaveDisabled =
  plainTextLength === 0 || plainTextLength > NOTE_MAX_LENGTH  || projectedTotalLength > MAX_TOTAL_NOTES;
 useEffect(() => {
    if (!isNoteOpen) return;
    if (plainTextLength > NOTE_MAX_LENGTH) {
      setToastMessage("Single note cannot exceed 10,000 characters.");
      setShowErrorToast(true);

      const timer = setTimeout(() => {
        setShowErrorToast(false);
      }, 3000);

      return () => clearTimeout(timer);
    } else if (projectedTotalLength > MAX_TOTAL_NOTES) {
      setToastMessage("Total notes limit exceeded (Maximum 40,000 characters allowed per contact).");
      setShowErrorToast(true);

      const timer = setTimeout(() => {
        setShowErrorToast(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [plainTextLength, projectedTotalLength, isEditMode, editingNoteId, notesHistory,isNoteOpen]);
// useEffect(() => {
//   if (plainTextLength > NOTE_MAX_LENGTH) {
//     setToastMessage("You have exceeded the 10,000 character limit.");
//     setShowErrorToast(true);

//     const timer = setTimeout(() => {
//       setShowErrorToast(false);
//     }, 3000);

//     return () => clearTimeout(timer);
//   }
// }, [plainTextLength]);
 // Helper function to get plain text from HTML
    // const getPlainText = (html: string): string => {
    //   if (!html) return "";
    //   const temp = document.createElement("div");
    //   temp.innerHTML = html;
    //   return temp.textContent || temp.innerText || "";
    // };

  // Toggle expand/collapse for a note
  const toggleNoteExpand = (noteId: number) => {
    setExpandedNoteIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  // Truncate note text to 300 characters
  const TRUNCATE_LENGTH = 300;
  const getTruncatedNote = (html: string): string => {
    const plainText = getPlainText(html);
    if (plainText.length > TRUNCATE_LENGTH) {
      return plainText.substring(0, TRUNCATE_LENGTH) + "...";
    }
    return plainText;
  };
  
  const [contactDetails, setContactDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

const reduxUserId = useSelector((state: RootState) => state.auth.userId);

const effectiveUserId = useMemo(() => {
  const storedClientId = sessionStorage.getItem("selectedClientId");

  if (storedClientId && storedClientId !== "" && storedClientId !== "null") {
    return Number(storedClientId);
  }

  return Number(reduxUserId);
}, [reduxUserId]);
useEffect(() => {
  console.log("Redux User:", reduxUserId);
  console.log("Stored Client:", sessionStorage.getItem("selectedClientId"));
  console.log("Effective Client:", effectiveUserId);
}, [reduxUserId, effectiveUserId]);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: "14px",
    background: "#f9fafb",
  };
  const fetchEmailTimeline = async (contactId: number) => {
    if (!contactId) return;

    setIsLoadingHistory(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/email-timeline?contactId=${contactId}`
      );

      if (!response.ok) throw new Error("Failed to fetch email timeline");

      const data = await response.json();
      console.log("timelinedata:", data);
      // ✅ IMPORTANT: inject contactCreatedAt into editingContact
      setEditingContact((prev: any) =>
        prev
          ? {
            ...prev,
            contactCreatedAt: data.contactCreatedAt,
          }
          : prev
      );

      setEmailTimeline(data.emails || []);
    } catch (err) {
      console.error(err);
      setEmailTimeline([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };
  const stripHtml = (html: string) => {
    if (!html) return "";
    // Remove code block backticks if present
    const cleaned = html.replace(/```(html)?/g, "").trim();
    // Remove all HTML tags
    return cleaned.replace(/<[^>]+>/g, "");
  };
  const formatDateTime = (date?: string) =>
    date ? new Date(date).toLocaleString() : "-";

  const formatTime = (date?: string): string =>
    date ? new Date(date).toLocaleTimeString() : "-";

  const toggleEmailBody = (trackingId: string) => {
    setExpandedEmailId(prev =>
      prev === trackingId ? null : trackingId
    );
  };
  //IST Formatter
  const formatDateTimeIST = (dateString?: string) => {
    if (!dateString) return "-";

    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(dateString));
  };

  const formatTimeIST = (dateString?: string) => {
    if (!dateString) return "-";

    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(dateString));
  };
  const fetchContact = async () => {
    if (!contactId || !effectiveUserId) return;

    setLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/Crm/contacts/List-by-CleinteId`,
        {
          params: {
            clientId: effectiveUserId,
            dataFileId: dataFileId,
          },
        }
      );

      const contacts = res.data?.contacts || [];
      //     console.log("[v0] API Response - Contacts:", contacts);
      // console.log("[v0] Looking for contactId:", contactId, "Type:", typeof contactId);
      // console.log("Contacts", contacts);
      setDetailContacts(contacts);
      // Debug: Log all contact IDs to see what we're comparing against
      // contacts.forEach((c: any, index: number) => {
      //   console.log(`[v0] Contact ${index}: id=${c.id} (type: ${typeof c.id}), full_name=${c.full_name}`);
      // });

      // const found = contacts.find(
      //   (c: any) => Number(c.id) === Number(contactId)
      // );

      // Try to find contact by exact ID match
      const found = contacts.find((c: any) => {
        const match = String(c.id) === String(contactId);
        console.log(`[v0] Comparing: c.id=${c.id} (${c.full_name}) === contactId=${contactId} => ${match}`);
        return match;
      });

      if (found) {
        console.log("[v0] Setting contact to found contact:", found.full_name);
        setContact(found);
        setEditingContact(found);
        setError(null);
      } else if (contacts.length > 0) {
        // Contact not found, show error with available contacts
        console.log(`[v0] Contact ID ${contactId} not found. Available IDs: ${contacts.map((c: any) => c.id).join(", ")}`);
        setContact(null);
        setEditingContact(null);
        setError(`Contact ID ${contactId} not found in available contacts.`);
      } else {
        // No contacts at all
        setContact(null);
        setEditingContact(null);
        setError("No contacts found.");
      }
    } catch (err) {
      console.error("[v0] Error fetching contact:", err);
      setDetailContacts([]);
      setError("Failed to load contact");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchContact();
  }, [contactId, effectiveUserId, dataFileId]);

  const fetchContactDetails = async () => {
    if (!contactId) return;
    setIsLoadingDetails(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/Crm/contact-details`,
        { params: { contactId } }
      );
      setContactDetails(res.data);
    } catch (err) {
      console.error("Failed to fetch contact details:", err);
    } finally {
      setIsLoadingDetails(false);
    }
  };
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
  const saveNote = async () => {
  if (!noteText) return;

  const newNotePlainText = getPlainText(noteText || "");
  const newNoteLength = newNotePlainText.length;

  // 🔹 1. Single note validation (10000)
  if (newNoteLength > NOTE_MAX_LENGTH) {
    setToastMessage("Single note cannot exceed 10,000 characters.");
    setShowErrorToast(true);
    const timer = setTimeout(() => {
        setShowErrorToast(false);
      }, 3000);
    return () => clearTimeout(timer);
  }

  // 🔹 2. Calculate existing total length
  const existingTotalLength = getTotalNotesLength();

  let adjustedTotalLength = existingTotalLength;

  // 🔹 3. If editing → subtract old note length
  if (isEditMode && editingNoteId) {
    const oldNote = notesHistory.find(
      (n: any) => n.id === editingNoteId
    );

    if (oldNote) {
      const oldLength = getPlainText(oldNote.note || "").length;
      adjustedTotalLength -= oldLength;
    }
  }

  const finalTotalLength = adjustedTotalLength + newNoteLength;

  // 🔹 4. Total limit validation (40000)
  if (finalTotalLength > MAX_TOTAL_NOTES) {
    setToastMessage(
      "Total notes limit exceeded (Maximum 40,000 characters allowed per contact)."
    );
    setShowErrorToast(true);
    const timer = setTimeout(() => {
        setShowErrorToast(false);
      }, 3000);
    return () => clearTimeout(timer);
  }

  try {
    setIsSavingNote(true);

    const payload = {
      clientId: effectiveUserId,
      contactId: contactId,
      note: noteText,
      isPin: isPinned,
      isUseInGenration: isEmailPersonalization,
    };

    if (isEditMode) {
  // ✅ UPDATE NOTE - Use POST not PUT
  await axios.post(
    `${API_BASE_URL}/api/notes/Update-Note`,
    {
      noteId: editingNoteId,  // Add this missing field
      clientId: effectiveUserId,
      contactId: contactId,
      note: noteText,
      isPin: isPinned,
      isUseInGenration: isEmailPersonalization,
    },
    {
      timeout: 45000,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
} else {
  // ✅ ADD NOTE - Change endpoint from create-note to Add-Note
  await axios.post(
    `${API_BASE_URL}/api/notes/Add-Note`,
    {
      clientId: effectiveUserId,
      contactId: contactId,
      note: noteText,
      isPin: isPinned,
      isUseInGenration: isEmailPersonalization,
    },
    {
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

    setToastMessage(
      isEditMode ? "Note updated successfully." : "Note created successfully."
    );
    setShowSuccessToast(true);

    setIsNoteOpen(false);
    setNoteText("");
    setIsPinned(false);
    setIsEmailPersonalization(false);
     setIsEditMode(false);
    setEditingNoteId(null);

    fetchNotesHistory(); // reload notes
  } catch (error) {
    console.error("Save note failed", error);
    setToastMessage("Failed to save note.");
     setShowErrorToast(true);
  } finally {
    setIsSavingNote(false);
    setTimeout(() => {
      setShowErrorToast(false);
      setShowSuccessToast(false);
    }, 3000);
  }
  
};
//   const saveNote = async () => {
//     if (!effectiveUserId || !contactId) {
//       appModal.showError("Client or Contact not found");
//       return;
//     }

//     if (!noteText || plainTextLength === 0) {
//       appModal.showError("Note cannot be empty");
//       return;
//     }
//     if (plainTextLength > NOTE_MAX_LENGTH) {
//   setToastMessage("You have exceeded the 10,000 character limit.");
//   setShowSuccessToast(true);
//   return;
// }
//     try {
//       setIsSavingNote(true);

//       if (isEditMode && editingNoteId) {
//         // ✅ UPDATE NOTE
//         await axios.post(
//   `${API_BASE_URL}/api/notes/Update-Note`,
//   {
//     noteId: editingNoteId,
//     clientId: effectiveUserId,
//     contactId: contactId,
//     note: noteText,
//     isPin: isPinned,
//     isUseInGenration: isEmailPersonalization,
//   },
//   {
//     timeout: 45000,
//     headers: {
//       'Content-Type': 'application/json',
//     },
//   }
// );
//       } else {
//         // ✅ ADD NOTE
//         await axios.post(`${API_BASE_URL}/api/notes/Add-Note`, {
//           clientId: effectiveUserId,
//           contactId: contactId,
//           note: noteText,
//           isPin: isPinned,
//           isUseInGenration: isEmailPersonalization,
//         },{
//     timeout: 60000,  // Increased to 60 seconds
//     headers: {
//       'Content-Type': 'application/json',
//     },});
//       }

//       // reset UI
//       setIsNoteOpen(false);
//       setNoteText("");
//       setIsPinned(false);
//       setIsEmailPersonalization(false);
//       setIsEditMode(false);
//       setEditingNoteId(null);

//       // Set appropriate message based on action
//       if (isEditMode) {
//         setToastMessage("The note has been updated with success!");
//       } else {
//         setToastMessage("The note has been created with success!");
//       }
//       setShowSuccessToast(true);
//       setTimeout(() => setShowSuccessToast(false), 3000);

//       fetchNotesHistory();
//     } catch (error) {
//       console.error("Save/Update note failed", error);
//       appModal.showError("Failed to save note");
//     } finally {
//       setIsSavingNote(false);
//     }
//   };
useEffect(() => {
  if (contactId && effectiveUserId) {
    fetchNotesHistory();
  }
}, [contactId, effectiveUserId]);
  const fetchNotesHistory = async () => {
    if (!effectiveUserId || !contactId) return;

    setIsLoadingNotes(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/notes/Get-All-Note`,
        {
          params: {
            clientId: effectiveUserId,
            contactId: contactId,
          },
        }
      );

      if (res.data?.success) {
        setNotesHistory(res.data.data || []);
      } else {
        setNotesHistory([]);
      }
    } catch (error) {
      console.error("Failed to fetch notes history", error);
      setNotesHistory([]);
    } finally {
      setIsLoadingNotes(false);
    }
  };
  const handleEditNote = async (note: any) => {
    if (!effectiveUserId || !contactId) return;

    try {
      setIsEditMode(true);
      setEditingNoteId(note.id);
      setNoteActionsAnchor(null);

      const res = await axios.get(
        `${API_BASE_URL}/api/notes/Get-Note-By-Id`,
        {
          params: {
            clientId: effectiveUserId,
            contactId: contactId,
            noteId: note.id,
          },
        }
      );

      const data = res.data?.data;
      if (!data) return;

      // Populate fields from API
      setNoteText(data.note || "");
      setIsPinned(!!data.isPin);
      setIsEmailPersonalization(!!data.isUseInGenration);

      // Open panel AFTER data is ready
      setIsNoteOpen(true);

    } catch (error) {
      console.error("Failed to fetch note by id", error);
      appModal.showError("Failed to load note");
    }
  };


  useEffect(() => {
    const closeMenu = () => setNoteActionsAnchor(null);
    document.addEventListener("click", closeMenu);
    return () => document.removeEventListener("click", closeMenu);
  }, []);
  const handleDeleteNote = (noteId: number) => {
    setNoteToDelete(noteId);
    setDeletingNoteId(noteId);
    setDeleteContactId(Number(contactId));
    setDeletePopupOpen(true);
  };
  const confirmDeleteNote = async () => {
    if (!effectiveUserId || !deleteContactId || !deletingNoteId) return;

    try {
      await axios.post(
        `${API_BASE_URL}/api/notes/Delete-Note`,
        null,
        {
          params: {
            clientId: effectiveUserId,
            contactId: deleteContactId,
            noteId: deletingNoteId,
          },
        }
      );

      setToastMessage("The note has been deleted with success!");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);

      setDeletePopupOpen(false);
      setDeletingNoteId(null);
      setDeleteContactId(null);
      fetchNotesHistory(); // ✅ WRITE IT HERE
    } catch (error) {
      console.error("Delete note failed", error);
      appModal.showError("Failed to delete note");
    }
    const timer = setTimeout(() => {
        setShowErrorToast(false);
      }, 3000);
    return () => clearTimeout(timer);
  };

  const handleTogglePin = async (noteId: number) => {
    if (!effectiveUserId || !contactId) return;

    try {
      // Get current note to find its current pin status
      const noteToToggle = notesHistory.find(n => n.id === noteId);
      if (!noteToToggle) return;

      const newPinStatus = !noteToToggle.isPin;

      // ✅ Make API call to update pin status on backend
     await axios.post(
  `${API_BASE_URL}/api/notes/Update-Note`,
  {
    noteId: noteId,
    clientId: effectiveUserId,
    contactId: contactId,
    note: noteToToggle.note,
    isPin: newPinStatus,
    isUseInGenration: noteToToggle.isUseInGenration,
  },
  {
    headers: {
      'Content-Type': 'application/json',
    },
  }
);

      // ✅ Show toast message
      setToastMessage(newPinStatus ? "Note was pinned" : "Note was unpinned");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 2500);

      setNoteActionsAnchor(null);

      // ✅ REFRESH the notes to get latest pinned data
      fetchNotesHistory();
    } catch (error) {
      console.error("Failed to toggle pin status", error);
      appModal.showError("Failed to toggle pin status");
    }
    const timer = setTimeout(() => {
        setShowErrorToast(false);
      }, 3000);
    return () => clearTimeout(timer);
  };
  const handleDeleteNoteClick = async (note: any) => {
    if (!effectiveUserId || !contactId) return;

    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/notes/Get-Note-By-Id`,
        {
          params: {
            clientId: effectiveUserId,
            contactId: contactId,
            noteId: note.id,
          },
        }
      );

      const data = res.data?.data;
      if (!data) return;

      // ✅ store values from API
      setDeletingNoteId(data.id);
      setDeleteContactId(Number(contactId));

      // open confirmation popup
      setDeletePopupOpen(true);
    } catch (error) {
      console.error("Failed to fetch note for delete", error);
      appModal.showError("Failed to load note");
    }
  };
  // ✅ Sync noteText to contentEditable only when opening edit mode or when explicitly set
  useEffect(() => {
    if (noteEditorRef.current && isNoteOpen) {
      // Only update if the content has changed from outside (e.g., loading edit note)
      if (noteEditorRef.current.innerHTML !== noteText) {
        noteEditorRef.current.innerHTML = noteText;
      }
    }
  }, [isEditMode, isNoteOpen]);
  const mergedHistory = React.useMemo(() => {
    const items: any[] = [];

    // Contact created
    if (editingContact?.contactCreatedAt) {
      items.push({
        type: "contact",
        time: new Date(editingContact.contactCreatedAt).getTime(),
        data: editingContact,
      });
    }

    // Emails
    emailTimeline.forEach((email: any) => {
      items.push({
        type: "email",
        time: new Date(email.sentAt).getTime(),
        data: email,
      });
    });

    // Notes
    notesHistory.forEach((note: any) => {
      items.push({
        type: "note",
        time: new Date(note.createdAt).getTime(),
        data: note,
      });
    });

    // newest → oldest
    return items.sort((a, b) => b.time - a.time);
  }, [editingContact, emailTimeline, notesHistory]);

  return (
    <>
    
    <div className="flex h-screen overflow-hidden">
      {/* SIDE MENU */}
      {isSidebarOpen && (
        <aside className="w-[250px] bg-white border-r shadow-sm flex flex-col h-screen sticky top-0 overflow-hidden">
          <div className="p-2 text-xl font-bold border-b">
            <div className="flex justify-between items-start">
              <img
                src={pitchLogo || "/placeholder.svg"}
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
                          navigate("/main");
                          setShowBlueprintSubmenu(false);
                          setShowContactsSubmenu(false);
                          setShowMailSubmenu(false);
                        }}
                        className="side-menu-button"
                        title="View progress and help videos"
                      >
                        <span className="menu-icon">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20px"
                            height="20px"
                            viewBox="0 0 24 24"
                            fill={tab === "Dashboard" ? "#3f9f42" : "#111111"}
                          >
                            <path
                              stroke="#111111"
                              strokeWidth="2"
                              d="M4 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5ZM14 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V5ZM4 16a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3ZM14 13a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-6Z"
                            />
                          </svg>
                        </span>
                        <span className="menu-text">Dashboard</span>
                      </button>
                    </li>

                    <li
                      className={`${tab === "TestTemplate" ? "active" : ""} ${showBlueprintSubmenu
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
                            setShowBlueprintSubmenu((prev) => !prev);
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

                      {showBlueprintSubmenu && (
                        <ul className="submenu">
                          <li
                            className={
                              blueprintSubTab === "List" ? "active" : ""
                            }
                          >
                            <button
                              onClick={() => {
                                setBlueprintSubTab("List");
                                setTab("TestTemplate");
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
                        </ul>
                      )}
                    </li>

                    <li
                      className={`${tab === "DataCampaigns" ? "active" : ""} ${showContactsSubmenu
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
                                navigate("/main?tab=DataCampaigns&subtab=List");
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
                                 navigate("/main?tab=DataCampaigns&subtab=Segment");
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
                      className={`${tab === "Mail" ? "active" : ""} ${showMailSubmenu
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
                                navigate("/main?tab=Mail&mailSubTab=Dashboard");
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
                                navigate("/main?tab=Mail&mailSubTab=Configuration");
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
                                navigate("/main?tab=Mail&mailSubTab=Schedules");
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
      <div className="flex flex-col flex-1  overflow-hidden bg-gray-100">
        <div className="w-full h-screen overflow-y-auto bg-gray-100">
          <div className="pt-4 pb-20 px-6 min-h-screen">
            <div className="bg-white rounded-lg shadow-md p-6 mb-8 ">
              {/* TOP TABS */}
              {/* TOP TABS + RIGHT ACTIONS */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid #e5e7eb",
                  marginBottom: 32,
                }}
              >
                {/* LEFT: PROFILE / HISTORY */}
                <div style={{ display: "flex", gap: 24 }}>
                  {["profile", "history", "lists"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveTab(tab as any);

                        if (tab === "history" && contactId) {
                          if (emailTimeline.length === 0) {
                            fetchEmailTimeline(Number(contactId));
                          }

                          // if (notesHistory.length === 0) {
                          //   fetchNotesHistory();
                          // }
                        }

                        if (tab === "lists" && contactId && !contactDetails) {
                          fetchContactDetails();
                        }
                      }}
                      style={{
                        padding: "12px 0",
                        border: "none",
                        background: "transparent",
                        fontSize: 15,
                        fontWeight: 600,
                        cursor: "pointer",
                        color: activeTab === tab ? "#3f9f42" : "#374151",
                        borderBottom:
                          activeTab === tab
                            ? "2px solid #3f9f42"
                            : "2px solid transparent",
                      }}
                    >
                      {tab === "profile" ? "Profile" : tab === "history" ? "History" : "Lists"}

                    </button>
                  ))}
                </div>

                {/* RIGHT: NOTES BUTTON (LIKE IMAGE) */}
                <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                  <button
                    onClick={() => {
                      // ✅ Reset all note states when opening "Add note" modal
                      setIsEditMode(false);
                      setEditingNoteId(null);
                      setNoteText("");
                      setIsPinned(false);
                      setIsEmailPersonalization(false);
                      setIsNoteOpen(true)
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      fontSize: 15,
                      fontWeight: 500,

                      //color: "#3f9f42",
                    }}
                  >
                    <FontAwesomeIcon icon={faEdit} style={{ color: "#3f9f42", cursor: "pointer", }} className="text-[20px]" />
                    Add note
                  </button>
                </div>
              </div>

              {/* ============ HISTORY FILTER PILLS ============ */}
              {activeTab === "history" && (
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    marginBottom: 24,
                    marginTop: -12,
                    flexWrap: "wrap",
                  }}
                >
                  {[
                    { key: "all", label: "All" },
                    { key: "notes", label: "Notes" },
                    { key: "emails", label: "Emails" },
                  ].map(item => (
                    <button
                      key={item.key}
                      onClick={() => {
                        setHistoryFilter(item.key as any);
                        if (item.key === "notes") {
                          fetchNotesHistory();
                        }
                        if (item.key === "emails" && emailTimeline.length === 0) {
                          fetchEmailTimeline(Number(contactId));
                        }
                      }}

                      style={{
                        padding: "6px 14px",
                        borderRadius: 999,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        background:
                          historyFilter === item.key ? "#eef2ff" : "#ffffff",
                        color:
                          historyFilter === item.key ? "#3f9f42" : "#374151",
                        border:
                          historyFilter === item.key
                            ? "1px solid #3f9f42"
                            : "1px solid #d1d5db",
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
              {/* PROFILE TAB */}
              {activeTab === "profile" && (
                <>
                  {loading && <p>Loading profile...</p>}

                  {!loading && !editingContact && (
                    <p style={{ color: "#666" }}>Contact not found.</p>
                  )}

                  {!loading && editingContact && (
                    <EditContactModal
                      isOpen={true}
                      asPage={true}
                      hideOverlay={true}
                      contact={editingContact}
                      onClose={() => { }}
                      onContactUpdated={(updatedContact) => {
                        setEditingContact(updatedContact);
                        setContact(updatedContact);
                      }}
                      onShowMessage={(msg, type) => {
                        type === "success"
                          ? appModal.showSuccess(msg)
                          : appModal.showError(msg);
                      }}
                      // ✅ Line 1118-1134: Pass note management callbacks to modal
                       notesHistory={notesHistory} 
                      onEditNote={handleEditNote}
                      onDeleteNote={handleDeleteNote}
                      onTogglePin={handleTogglePin}
                      onNotesHistoryUpdate={fetchNotesHistory}
                    />
                  )}
                </>
              )}


              {/* HISTORY TAB */}
              {activeTab === "history" && (
                <div
                  style={{
                    background: "#fff",
                    padding: 24,
                    borderRadius: 8,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  }}
                >

                  {isLoadingHistory && <p>Loading history...</p>}

                  {!isLoadingHistory && !editingContact?.contactCreatedAt && emailTimeline.length === 0 && (
                    <p style={{ color: "#666" }}>No history found.</p>
                  )}

                  {!isLoadingHistory && (
                    <>
                      {historyFilter === "all" && (
                        <>
                          {mergedHistory.map((item, index) => {
                            /* 🟢 CONTACT CREATED */
                            if (item.type === "contact") {
                              return (
                                <div key={`contact-${index}`} style={{ display: "flex", gap: 16, paddingBottom: 24 }}>
                                  <div style={{ position: "relative" }}>
                                    <div
                                      style={{
                                        width: 10,
                                        height: 10,
                                        background: "#3f9f42",
                                        borderRadius: "50%",
                                        marginTop: 6,
                                      }}
                                    />
                                    <div
                                      style={{
                                        position: "absolute",
                                        top: 16,
                                        left: 4,
                                        width: 2,
                                        height: "100%",
                                        background: "#e5e7eb",
                                      }}
                                    />
                                  </div>

                                  <div>
                                    <div style={{ fontWeight: 600 }}>Contact created</div>
                                    <div style={{ fontSize: 13, color: "#666" }}>
                                      {formatDateTimeIST(item.data.contactCreatedAt)}
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            /* 🟢 EMAIL (REUSE YOUR EXISTING JSX) */
                            if (item.type === "email") {
                              const email = item.data;

                              return (
                                <div key={email.trackingId || index} style={{ marginBottom: 24 }}>
                                  {/* Row: timeline dot + content */}
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: 16,
                                      paddingBottom: 8,
                                    }}
                                  >
                                    {/* Timeline dot */}
                                    <div style={{ position: "relative" }}>
                                      <div
                                        style={{
                                          width: 10,
                                          height: 10,
                                          background: "#3f9f42",
                                          borderRadius: "50%",
                                          marginTop: 6,
                                        }}
                                      />
                                      <div
                                        style={{
                                          position: "absolute",
                                          top: 16,
                                          left: 4,
                                          width: 2,
                                          height: "100%",
                                          background: "#e5e7eb",
                                        }}
                                      />
                                    </div>

                                    {/* Content */}
                                    <div style={{ flex: 1 }}>
                                      {/* Source */}
                                      <div style={{ fontSize: 13, marginBottom: 6 }}>
                                        <b>Source:</b>{" "}
                                        <span style={{ color: "#666" }}>{email.source || "Unknown source"}</span>
                                      </div>

                                      {/* Email sent */}
                                      <div style={{ fontWeight: 600 }}>Email sent</div>
                                      <div style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
                                        {formatDateTimeIST(email.sentAt)} from {email.senderEmailId}
                                      </div>

                                      {/* Events + Subject */}
                                      <div style={{ background: "#f9fafb", padding: 12, borderRadius: 8 }}>
                                        {email.events?.length > 0 && (
                                          <div style={{ marginBottom: 10 }}>
                                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Events</div>
                                            {email.events.map((ev: any, i: number) => (
                                              <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>
                                                • <b>{ev.eventType}ed</b> at {formatDateTimeIST(ev.eventAt)}
                                                {ev.targetUrl && (
                                                  <>
                                                    {" "}— <strong>target URL: </strong>
                                                    <a href={ev.targetUrl} target="_blank" rel="noreferrer" style={{ color: "#3f9f42" }}>
                                                      {ev.targetUrl}
                                                    </a>
                                                  </>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        <div>
                                          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Subject</div>
                                          <div style={{ color: "#666", fontSize: 13 }}>{email.subject || "No subject"}</div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Email body toggle — OUTSIDE the flex row */}
                                  <div
                                    className={`email-preview-toggle ${expandedEmailId === email.trackingId ? "submenu-open" : ""}`}
                                    onClick={() => toggleEmailBody(email.trackingId)}
                                    style={{ marginTop: 15, cursor: "pointer" }}
                                  >
                                    <span>
                                      {expandedEmailId === email.trackingId ? "Hide email preview" : "Show email preview"}
                                    </span>
                                    <span className="submenu-arrow">
                                      <FontAwesomeIcon icon={faAngleRight} />
                                    </span>
                                  </div>

                                  {/* Email body — OUTSIDE the flex row */}
                                  {expandedEmailId === email.trackingId && (
                                    <div
                                      className="textarea-full-height preview-content-area"
                                      style={{
                                        minHeight: "500px",
                                        padding: "10px",
                                        border: "1px solid #ccc",
                                        borderRadius: "4px",
                                        fontFamily: "inherit",
                                        fontSize: "inherit",

                                        whiteSpace: "normal",        // ✅ CRITICAL
                                        overflowY: "auto",
                                        overflowX: "auto",
                                        boxSizing: "border-box",
                                        wordWrap: "break-word",

                                        width: "100%",
                                        maxWidth: "100%",            // or simulate device if needed
                                        background: "white",
                                      }}
                                      dangerouslySetInnerHTML={{
                                        __html: email.body || "<p>No email body available</p>",
                                      }}
                                    />
                                  )}

                                </div>

                              );
                            }

                            /* 🟢 NOTE (REUSE YOUR EXISTING JSX) */
                            if (item.type === "note") {
                              const note = item.data;

                              return (
                                <div key={note.id}>
                                  <div style={{ display: "flex", gap: 16, paddingBottom: 24 }}>
                                    {/* Timeline dot */}
                                    <div style={{ position: "relative" }}>
                                      <div
                                        style={{
                                          width: 10,
                                          height: 10,
                                          background: "#3f9f42",
                                          borderRadius: "50%",
                                          marginTop: 6,
                                        }}
                                      />
                                      <div
                                        style={{
                                          position: "absolute",
                                          top: 16,
                                          left: 4,
                                          width: 2,
                                          height: "100%",
                                          background: "#e5e7eb",
                                        }}
                                      />
                                    </div>

                                    {/* Content */}
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontWeight: 600 }}>Note created</div>
                                      <div style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
                                        {formatDateTimeIST(note.createdAt)}
                                      </div>

                                      <div
                                        style={{
                                          background: "#fefcf9",
                                          border: "1px solid #e5e7eb",
                                          borderRadius: 12,
                                          padding: 16,
                                          position: "relative",
                                        }}
                                      >
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setNoteActionsAnchor(noteActionsAnchor === note.id ? null : note.id);
                                          }}
                                          style={{
                                            position: "absolute",
                                            top: 12,
                                            right: 12,
                                            border: "none",
                                            background: "#ede9fe",
                                            borderRadius: "50%",
                                            width: 32,
                                            height: 32,
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                          }}
                                        >
                                          <FontAwesomeIcon icon={faEllipsisV} />
                                        </button>

                                        {noteActionsAnchor === note.id && (
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
                                            <button
                                              onClick={() => {
                                                handleEditNote(note);
                                                setNoteActionsAnchor(null);
                                              }}
                                              style={menuBtnStyle}
                                              className="flex gap-2 items-center ml-[0px]"
                                            >
                                              <span>
                                                <FontAwesomeIcon icon={faEdit} style={{ color: "#3f9f42", cursor: "pointer", }} className="text-[20px]" />
                                              </span>
                                              <span className="font-[600]">Edit</span>
                                            </button>

                                            {/* 📌 PIN / UNPIN */}
                                            <button
                                              onClick={() => handleTogglePin(note.id)}
                                              style={menuBtnStyle}
                                              className="flex gap-2 items-center ml-[-4px]"
                                            >
                                              <span>
                                                <FontAwesomeIcon
                                                  icon={faThumbtack}
                                                  style={{
                                                    transform: note.isPin ? "rotate(45deg)" : "none",
                                                    width: "25px",
                                                    height: "25px",
                                                    color: "#3f9f42"
                                                  }}
                                                />
                                              </span>
                                              <span className="font-[600]">
                                                {note.isPin ? "Unpin" : "Pin"}
                                              </span>
                                            </button>

                                            {/* 🗑️ DELETE */}
                                            <button
                                              onClick={() => {
                                                handleDeleteNote(note.id);
                                                setNoteActionsAnchor(null);
                                              }}
                                              style={menuBtnStyle}
                                              className="flex gap-2 items-center ml-[-4px] "
                                            >
                                              <span className="ml-[3px] font-normal">
                                                <img
                                                  src={deleteIcon}
                                                  alt="Delete"
                                                  className="w-[24px] h-[24px] font-normal"
                                              />
                                              </span>
                                              <span className="font-[600]">Delete</span>
                                            </button>
                                          </div>
                                        )}

<div
  className="rendered-note-content"
  style={{
    fontSize: 14,
    whiteSpace: "normal",
    lineHeight: "1.5",
  }}
 dangerouslySetInnerHTML={{
    __html: expandedNoteIds.has(note.id) 
      ? (note.note || "<p>No note content</p>")
      : `<p>${getTruncatedNote(note.note || "")}</p>`,
  }}
/>
 {/* EXPAND BUTTON */}
{getPlainText(note.note || "").length > TRUNCATE_LENGTH && (
  <button
    onClick={() => toggleNoteExpand(note.id)}
    style={{
      marginTop: 12,
      background: "none",
      border: "none",
      color: "#3f9f42",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
      padding: 0,
    }}
  >
    {expandedNoteIds.has(note.id) ? "Show less" : "Expand"}
  </button>
)}

                                      </div>

                                      <div style={{
                                        marginTop: 8, fontSize: 12, color: "#6b7280", display: "flex", alignItems: "center",
                                        gap: 6,
                                        flexWrap: "nowrap",
                                      }}>
                                        {note.isPin && "📌 Pinned"}
                                        {note.isPin && note.isUseInGenration && " • "}
                                        {note.isUseInGenration && (
                                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                            <img
                                              src={emailPersonalizationIcon}
                                              alt="Used for email personalization"
                                              style={{ width: 18, height: 14 }}
                                            />
                                            <span>Used for email personalization</span>
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                </div>
                              );
                            }

                            return null;
                          })}
                        </>
                      )}

                      {/* 🔹 EMAIL TIMELINE */}
                      {(historyFilter === "emails") &&
                        emailTimeline.map((email: any, index: number) => (
                          <div key={email.trackingId || index}>
                            <div
                              style={{
                                display: "flex",
                                gap: 16,
                                paddingBottom: 24,
                              }}
                            >
                              {/* Timeline dot */}
                              <div style={{ position: "relative" }}>
                                <div
                                  style={{
                                    width: 10,
                                    height: 10,
                                    background: "#3f9f42",
                                    borderRadius: "50%",
                                    marginTop: 6,
                                  }}
                                />
                                <div
                                  style={{
                                    position: "absolute",
                                    top: 16,
                                    left: 4,
                                    width: 2,
                                    height: "100%",
                                    background: "#e5e7eb",
                                  }}
                                />
                              </div>

                              {/* Content */}
                              <div style={{ flex: 1 }}>
                                {/* 2️⃣ SOURCE */}
                                <div style={{ fontSize: 13, marginBottom: 6 }}>
                                  <b>Source:</b>{" "}
                                  <span style={{ color: "#666" }}>
                                    {email.source || "Unknown source"}
                                  </span>
                                </div>

                                {/* 3️⃣ EMAIL SENT */}
                                <div style={{ fontWeight: 600 }}>Email sent</div>
                                <div
                                  style={{
                                    fontSize: 13,
                                    color: "#666",
                                    marginBottom: 8,
                                  }}
                                >
                                  {formatDateTimeIST(email.sentAt)} from {email.senderEmailId}
                                </div>
                                {/* • */}
                                <div
                                  style={{
                                    background: "#f9fafb",
                                    padding: 12,
                                    borderRadius: 8,
                                  }}
                                >
                                  {/* 4️⃣ EVENTS */}
                                  {email.events?.length > 0 && (
                                    <div style={{ marginBottom: 10 }}>
                                      <div
                                        style={{
                                          fontSize: 13,
                                          fontWeight: 600,
                                          marginBottom: 4,
                                        }}
                                      >
                                        Events
                                      </div>

                                      {email.events.map((ev: any, i: number) => (
                                        <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>
                                          • <b>{ev.eventType}ed</b> at {formatDateTimeIST(ev.eventAt)}
                                          {ev.targetUrl && (
                                            <>
                                              {" "}—{" "} <strong>target URL: </strong>
                                              <a
                                                href={ev.targetUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{ color: "#3f9f42" }}
                                              >
                                                {ev.targetUrl}
                                              </a>
                                            </>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* 5️⃣ SUBJECT */}
                                  <div>
                                    <div
                                      style={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        marginBottom: 2,
                                      }}
                                    >
                                      Subject
                                    </div>
                                    <div style={{ color: "#666", fontSize: 13 }}>
                                      {email.subject || "No subject"}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* 6️⃣ EMAIL BODY */}
                            <div
                              className={`email-preview-toggle ${expandedEmailId === email.trackingId ? "submenu-open" : ""
                                }`}
                              onClick={() => toggleEmailBody(email.trackingId)}
                            >
                              <span>
                                {expandedEmailId === email.trackingId
                                  ? "Hide email preview"
                                  : "Show email preview"}
                              </span>

                              <span className="submenu-arrow">
                                <FontAwesomeIcon icon={faAngleRight} />
                              </span>
                            </div>

                          {expandedEmailId === email.trackingId && (
                            <div
                              className="textarea-full-height preview-content-area"
                              style={{
                                minHeight: "500px",
                                padding: "10px",
                                border: "1px solid #ccc",
                                borderRadius: "4px",
                                fontFamily: "inherit",
                                fontSize: "inherit",

                                whiteSpace: "normal",        // ✅ CRITICAL
                                overflowY: "auto",
                                overflowX: "auto",
                                boxSizing: "border-box",
                                wordWrap: "break-word",

                                width: "100%",
                                maxWidth: "100%",            // or simulate device if needed
                                background: "white",
                              }}
                              dangerouslySetInnerHTML={{
                                __html: email.body || "<p>No email body available</p>",
                              }}
                            />
                          )}

                          </div>
                        ))}
                      {/* 🔹 NOTES HISTORY */}
                      {(historyFilter === "notes") && (
                        <>
                          {isLoadingNotes && <p>Loading notes...</p>}

                          {!isLoadingNotes && notesHistory.length === 0 && (
                            <p style={{ color: "#666" }}>No notes found.</p>
                          )}

                          {!isLoadingNotes &&
                            [...notesHistory]
                              .sort((a, b) => {
                                // 1️⃣ pinned notes first
                                if (a.isPin && !b.isPin) return -1;
                                if (!a.isPin && b.isPin) return 1;

                                // 2️⃣ if both pinned or both unpinned → sort by latest createdAt
                                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                              })
                              .map((note: any) => (
                                <div
                                  key={note.id}
                                  style={{
                                    display: "flex",
                                    gap: 16,
                                    paddingBottom: 24,
                                  }}
                                >
                                  {/* Timeline dot */}
                                  <div style={{ position: "relative" }}>
                                    <div
                                      style={{
                                        width: 10,
                                        height: 10,
                                        background: "#3f9f42",
                                        borderRadius: "50%",
                                        marginTop: 6,
                                      }}
                                    />
                                    <div
                                      style={{
                                        position: "absolute",
                                        top: 16,
                                        left: 4,
                                        width: 2,
                                        height: "100%",
                                        background: "#e5e7eb",
                                      }}
                                    />
                                  </div>

                                  {/* Content */}
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600 }}>Note created</div>

                                    <div style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
                                      {formatDateTimeIST(note.createdAt)}
                                    </div>

                                    <div
                                      style={{
                                        background: "#fefcf9",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 12,
                                        padding: 16,
                                        position: "relative",
                                      }}
                                    >
                                      {/* 3 DOT MENU BUTTON */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setNoteActionsAnchor(
                                            noteActionsAnchor === note.id ? null : note.id
                                          );
                                        }}
                                        style={{
                                          position: "absolute",
                                          top: 12,
                                          right: 12,
                                          border: "none",
                                          background: "#ede9fe",
                                          borderRadius: "50%",
                                          width: 32,
                                          height: 32,
                                          cursor: "pointer",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                        }}
                                      >
                                        <FontAwesomeIcon icon={faEllipsisV} />
                                      </button>


                                      {/* DROPDOWN MENU */}
                                      {noteActionsAnchor === note.id && (
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
                                          {/* ✏️ EDIT */}
                                          <button
                                            onClick={() => {
                                              handleEditNote(note);
                                              setNoteActionsAnchor(null);
                                            }}
                                            style={menuBtnStyle}
                                            className="flex gap-2 items-center ml-[0px]"
                                          >
                                            <span>
                                              <FontAwesomeIcon icon={faEdit} style={{ color: "#3f9f42", cursor: "pointer", }} className="text-[20px]" />
                                            </span>
                                            <span className="font-[600]">Edit</span>
                                          </button>

                                          {/* 📌 PIN / UNPIN */}
                                          <button
                                            onClick={() => handleTogglePin(note.id)}
                                            style={menuBtnStyle}
                                            className="flex gap-2 items-center ml-[-4px]"
                                          >
                                            <span>
                                              <FontAwesomeIcon
                                                icon={faThumbtack}
                                                style={{
                                                  transform: note.isPin ? "rotate(45deg)" : "none",
                                                  width: "25px",
                                                  height: "25px",
                                                  color: "#3f9f42"
                                                }}
                                              />
                                            </span>
                                            <span className="font-[600]">
                                              {note.isPin ? "Unpin" : "Pin"}
                                            </span>
                                          </button>

                                          {/* 🗑️ DELETE */}
                                          <button
                                            onClick={() => {
                                              handleDeleteNote(note.id);
                                              setNoteActionsAnchor(null);
                                            }}
                                            style={menuBtnStyle}
                                            className="flex gap-2 items-center ml-[-4px]"
                                          >
                                            <span className="ml-[3px] font-normal">
                                              <img
                                                  src={deleteIcon}
                                                  alt="Delete"
                                                  className="w-[24px] h-[24px] font-normal"
                                              />
                                            </span>
                                            <span className="font-[600]">Delete</span>
                                          </button>
                                        </div>
                                      )}

                                      {/* NOTE CONTENT */}
                                      <div
                                        className="rendered-note-content"
                                        style={{
                                          fontSize: 14,
                                          whiteSpace: "normal",
                                          lineHeight: "1.5",
                                        }}
                                        // dangerouslySetInnerHTML={{
                                        //   __html: note.note || "<p>No note content</p>",
                                        // }}
                                        dangerouslySetInnerHTML={{
                                        __html: expandedNoteIds.has(note.id) 
                                        ? (note.note || "<p>No note content</p>")
                                        : `<p>${getTruncatedNote(note.note || "")}</p>`,
                                        }}
                                      />
                                      {/* EXPAND BUTTON */}
{getPlainText(note.note || "").length > TRUNCATE_LENGTH && (
  <button
    onClick={() => toggleNoteExpand(note.id)}
    style={{
      marginTop: 12,
      background: "none",
      border: "none",
      color: "#3f9f42",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
      padding: 0,
    }}
  >
    {expandedNoteIds.has(note.id) ? "Show less" : "Expand"}
  </button>
)}

                                    </div>
                                    {/* Optional badges */}
                                    <div style={{
                                      marginTop: 8, fontSize: 12, color: "#6b7280", display: "flex", alignItems: "center",
                                      gap: 6,
                                      flexWrap: "nowrap",
                                    }}>
                                      {note.isPin && "📌 Pinned"}
                                      {note.isPin && note.isUseInGenration && " • "}
                                      {note.isUseInGenration && (
                                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                          <img
                                            src={emailPersonalizationIcon}
                                            alt="Used for email personalization"
                                            style={{ width: 18, height: 14 }}
                                          />
                                          <span>Used for email personalization</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
              {/* LISTS TAB */}
              {activeTab === "lists" && (
                <div
                  style={{
                    background: "#fff",
                    padding: 24,
                    borderRadius: 8,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  }}
                >
                  {isLoadingDetails && <p>Loading...</p>}

                  {!isLoadingDetails && !contactDetails && (
                    <p style={{ color: "#666" }}>No data found.</p>
                  )}

                  {!isLoadingDetails && contactDetails && (
                    <div style={{ display: "flex", gap: 32 }}>
                      {/* LEFT: CAMPAIGNS */}
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Campaigns</h3>
                        {contactDetails.campaigns?.length > 0 ? (
                          contactDetails.campaigns.map((campaign: any, idx: number) => (
                            <div key={campaign.campaignId} style={{ display: "flex", gap: 16, paddingBottom: 24 }}>
                              <div style={{ position: "relative" }}>
                                <div
                                  style={{
                                    width: 10,
                                    height: 10,
                                    background: "#3f9f42",
                                    borderRadius: "50%",
                                    marginTop: 6,
                                  }}
                                />
                                {idx < contactDetails.campaigns.length - 1 && (
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: 16,
                                      left: 4,
                                      width: 2,
                                      height: "100%",
                                      background: "#e5e7eb",
                                    }}
                                  />
                                )}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 15 }}>Campaign</div>
                                <div 
                                  onClick={() => navigate(`/main?tab=Campaigns`)}
                                  style={{ 
                                    fontSize: 14, 
                                    color: "#3f9f42", 
                                    marginTop: 4,
                                    cursor: "pointer",
                                    textDecoration: "underline"
                                  }}
                                >
                                  {campaign.campaignName}
                                </div>
                                {campaign.createdAt && (
                                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                                    Created: {formatDateTimeIST(campaign.createdAt)}
                                  </div>
                                )}
                                {campaign.sourceName && (
                                  <div style={{ fontSize: 13, marginTop: 4 }}>
                                    Source: <span 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (campaign.sourceType === "Segment") {
                                          window.location.href = `/main?tab=DataCampaigns&initialTab=Segment&segmentId=${campaign.sourceId}`;
                                        } else if (campaign.sourceType === "DataFile") {
                                          navigate(`/main?tab=DataCampaigns&initialTab=List&dataFileId=${campaign.sourceId}`);
                                        }
                                      }}
                                      style={{ 
                                        color: "#3f9f42", 
                                        cursor: "pointer",
                                        textDecoration: "underline"
                                      }}
                                    >
                                      {campaign.sourceName}
                                    </span>
                                  </div>
                                )}
                                {campaign.template && (
                                  <>
                                    <div style={{ fontSize: 13, marginTop: 4 }}>
                                      Blueprint: <span 
                                        onClick={async () => {
                                          const templateId = campaign.template.templateId.toString();
                                          const templateName = campaign.template.templateName;
                                          
                                          sessionStorage.removeItem("campaign_placeholder_values");
                                          sessionStorage.removeItem("campaign_messages");
                                          
                                          sessionStorage.setItem("editTemplateId", templateId);
                                          sessionStorage.setItem("editTemplateMode", "true");
                                          sessionStorage.setItem("newCampaignId", templateId);
                                          sessionStorage.setItem("newCampaignName", templateName);
                                          
                                          if (campaign.template.templateDefinitionId) {
                                            sessionStorage.setItem(
                                              "selectedTemplateDefinitionId",
                                              campaign.template.templateDefinitionId.toString(),
                                            );
                                          }
                                          
                                          try {
                                            const res = await fetch(`${API_BASE_URL}/api/CampaignPrompt/campaign/${templateId}`);
                                            const data = await res.json();
                                            
                                            const example = data?.placeholderValues?.example_output_email || "";
                                            sessionStorage.setItem("initialExampleEmail", example);
                                            
                                            if (data?.placeholderValues) {
                                              sessionStorage.setItem(
                                                "campaign_placeholder_values",
                                                JSON.stringify(data.placeholderValues)
                                              );
                                            }
                                          } catch (error) {
                                            console.error("Error loading campaign data:", error);
                                            sessionStorage.setItem("initialExampleEmail", "");
                                          }
                                          
                                          navigate("/main?tab=TestTemplate");
                                        }}
                                        style={{ 
                                          color: "#3f9f42", 
                                          cursor: "pointer",
                                          textDecoration: "underline"
                                        }}
                                      >
                                        {campaign.template.templateName}
                                      </span>
                                    </div>
                                    {campaign.template.createdAt && (
                                      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                                        Blueprint Created: {formatDateTimeIST(campaign.template.createdAt)}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p style={{ color: "#666", fontSize: 14 }}>No campaigns found.</p>
                        )}
                      </div>

                      {/* RIGHT: LISTS & SEGMENTS */}
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Lists & Segments</h3>
                        
                        {/* DATA FILE */}
                        <div style={{ display: "flex", gap: 16, paddingBottom: 24 }}>
                          <div style={{ position: "relative" }}>
                            <div
                              style={{
                                width: 10,
                                height: 10,
                                background: "#3f9f42",
                                borderRadius: "50%",
                                marginTop: 6,
                              }}
                            />
                            <div
                              style={{
                                position: "absolute",
                                top: 16,
                                left: 4,
                                width: 2,
                                height: "100%",
                                background: "#e5e7eb",
                              }}
                            />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 15 }}>List</div>
                            <div 
                              onClick={() => {
                                navigate(`/main?tab=DataCampaigns&initialTab=List&dataFileId=${contactDetails.dataFileId}`);
                              }}
                              style={{ 
                                fontSize: 14, 
                                color: "#3f9f42", 
                                marginTop: 4,
                                cursor: "pointer",
                                textDecoration: "underline"
                              }}
                            >
                              {contactDetails.dataFile?.dataFileName || contactDetails.dataFileName}
                            </div>
                            {contactDetails.dataFile?.createdAt && (
                              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                                Created: {formatDateTimeIST(contactDetails.dataFile.createdAt)}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* SEGMENTS */}
                        {contactDetails.segments?.map((segment: any, idx: number) => (
                          <div key={segment.segmentId} style={{ display: "flex", gap: 16, paddingBottom: 24 }}>
                            <div style={{ position: "relative" }}>
                              <div
                                style={{
                                  width: 10,
                                  height: 10,
                                  background: "#3f9f42",
                                  borderRadius: "50%",
                                  marginTop: 6,
                                }}
                              />
                              {idx < contactDetails.segments.length - 1 && (
                                <div
                                  style={{
                                    position: "absolute",
                                    top: 16,
                                    left: 4,
                                    width: 2,
                                    height: "100%",
                                    background: "#e5e7eb",
                                  }}
                                />
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 15 }}>Segment</div>
                              <div 
                                onClick={() => {
                                  window.location.href = `/main?tab=DataCampaigns&initialTab=Segment&segmentId=${segment.segmentId}`;
                                }}
                                style={{ 
                                  fontSize: 14, 
                                  color: "#3f9f42", 
                                  marginTop: 4,
                                  cursor: "pointer",
                                  textDecoration: "underline"
                                }}
                              >
                                {segment.segmentName}
                              </div>
                              {segment.addedAt && (
                                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                                  Added: {formatDateTimeIST(segment.addedAt)}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
      {/* RIGHT SLIDE NOTE PANEL */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width: 454,
          background: "#fff",
          boxShadow: "rgba(0, 0, 0, 0.30) -4px 0px 10px",
          transform: isNoteOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.35s ease-in-out",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            background: "#ffffff",
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
          className='border-[#cccccc] border-b'
        >
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            {isEditMode ? "Edit note" : "Add a note"}
          </h3>
          <button
            onClick={() => setIsNoteOpen(false)}
            style={{
              border: "none",
              background: "transparent",
              fontSize: 22,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
<style>
{`
  .note-editor-wrapper .rich-text-editor > div {
    height: auto !important;
    min-height: 270px !important;
    overflow: visible !important;
  }
`}
</style>
        {/* BODY */}
        <div  className="note-editor-wrapper" style={{ padding: 20, flex: 1 , overflowY: "auto",}}>
          {/* NOTE EDITOR */}
          
            {/* TOOLBAR */}
            <div style={{ marginBottom: 10 }}>
              <RichTextEditor
               value={noteText}
              // height={220}
               onChange={setNoteText}
               
              />
           </div>
            {/* EDITABLE AREA */}
          {/* Character Counters */}
<div
  style={{
    marginTop: 8,
    fontSize: 12,
    color: "#6b7280",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  }}
>
  {/* Left Column */}
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <h3 style={{ margin: 0, fontSize: 12, fontWeight: 500,color: "#111827",}}>
      For this note
    </h3>
    <div>
      {plainTextLength} / 10,000
    </div>
  </div>

  {/* Right Column */}
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: 4,
    }}
  >
    <h3 style={{ margin: 0, fontSize: 12, fontWeight: 500,color: "#111827" }}>
      For all notes
    </h3>
    <div>
      {totalNotesLength} / {MAX_TOTAL_NOTES}
    </div>
  </div>
</div>
          {/* PIN */}
          <div className="flex items-start gap-2 mt-4">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className={`mt-1 w-4 h-4 accent-[#3f9f42] cursor-pointer"
                }`}
            />


            <div>
              <div className="text-sm font-medium text-gray-900">Pin note</div>
              <div className="text-xs text-gray-500">
                Pinned notes stay at the top for easy access.
              </div>
            </div>
          </div>

          {/* EMAIL PERSONALIZATION */}
          <div className="flex items-start gap-2 mt-6">
            <input
              type="checkbox"
              checked={isEmailPersonalization}
              onChange={(e) => setIsEmailPersonalization(e.target.checked)}
              className="mt-1 w-4 h-4 accent-[#3f9f42] cursor-pointer"
            />

            <div>
              <div className="text-sm font-medium text-gray-900">
                Email personalization
              </div>
              <div className="text-xs text-gray-500">
                Use this note to personalize future emails.
              </div>
            </div>
          </div>


        </div>

        {/* FOOTER */}
        <div
          style={{
            padding: 16,
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px solid #e5e7eb",
            marginBottom: 50,
            position: "sticky",
          }}
        >
           {/* LEFT SIDE BUTTONS */}
           <div style={{ display: "flex", gap: 12 }}>
           <button
                  onClick={() => setIsNoteOpen(false)}
                  type="button"
                  className="px-5 py-2 border border-gray-300 rounded-full text-sm"
                >
                  Cancel
          </button>
           <button
                  onClick={() => setNoteText("")}
                  type="button"
                  className="px-5 py-2 border border-red-300 text-red-600 rounded-full text-sm"
                >
                Clear
            </button>
            </div>
          <button
            onClick={saveNote}
            disabled={isSaveDisabled || isSavingNote}
            style={{
              background: isSaveDisabled ? "#d1d5db" : "#3f9f42", // only invalid makes grey
              color: isSaveDisabled ? "#6b7280" : "#ffffff",
              border: "none",
              padding: "8px 18px",
              borderRadius: 18,
              fontSize: 14,
               cursor: isSaveDisabled ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {isSavingNote && (
              <span
                style={{
                  width: 14,
                  height: 14,
                  border: "2px solid #fff",
                  borderTop: "2px solid transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
            )}

            {isSavingNote ? "Saving..." : "Save"}
          </button>

        </div>
      </div>
      <style>{toastAnimation}</style>
      {/* SUCCESS TOAST */}
{showSuccessToast && (
  <div
    style={{
      position: "fixed",
      bottom: 24,
      left: "50%",
      transform: "translateX(-50%)",
      background: "#E6F4EF",        // soft pastel green
      color: "#2F3A34",              // dark grey text (not black)
      padding: "14px 22px",
      borderRadius: 12,
      display: "flex",
      alignItems: "center",
      gap: 16,
      boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
      zIndex: 99999,
      minWidth: 420,
      fontSize: 16,
      fontWeight: 500,
      overflow: "hidden",
    }}
  >
    {/* Timer Bar */}
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        height: 4,
        width: "100%",
        background: "#1F9D74",  // darker green line like image
        animation: "toastProgress 3s linear forwards",
      }}
    />

    {/* Check Circle */}
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: "#1F9D74",   // same green as timer
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 16,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      ✓
    </div>

    {/* Message */}
    <div style={{ flex: 1 }}>
      {toastMessage}
    </div>

    {/* Close Button */}
    <div
      onClick={() => setShowSuccessToast(false)}
      style={{
        cursor: "pointer",
        fontSize: 30,
        fontWeight:500,
        color: "#6B7280",   // soft gray like screenshot
        lineHeight: 1,
      }}
    >
      ×
    </div>
  </div>
)}
      {/* ERROR TOAST */}
{showErrorToast && (
  <div
    style={{
      position: "fixed",
      bottom: 24,
      left: "50%",
      transform: "translateX(-50%)",
      background: "#FDECEC",        // pastel red background
      color: "#2F3A34",              // dark soft red text
      padding: "14px 22px",
      borderRadius: 12,
      display: "flex",
      alignItems: "center",
      gap: 16,
      boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
      zIndex: 99999,
      minWidth: 420,
      fontSize: 16,
      fontWeight: 500,
      overflow: "hidden",
    }}
  >
    {/* Timer Bar */}
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        height: 4,
        width: "100%",
        background: "#DC2626",   // strong red timer
        animation: "toastProgress 3s linear forwards",
      }}
    />

    {/* Error Circle */}
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: "#DC2626",   // same red as timer
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 16,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      !
    </div>

    {/* Message */}
    <div style={{ flex: 1 }}>
      {toastMessage}
    </div>

    {/* Close Button */}
    <div
      onClick={() => setShowErrorToast(false)}
      style={{
        cursor: "pointer",
        fontSize: 30,
        fontWeight: 500,
        color: "#9CA3AF",  // same gray as success close
        lineHeight: 1,
      }}
    >
      ×
    </div>
  </div>
)}
      {deletePopupOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]"
          onClick={(e) => {
            e.stopPropagation();          // ✅ BLOCK document click
            setDeletePopupOpen(false);    // optional: close on backdrop click
          }}
        >
          <div
            className="bg-white rounded-xl p-6 w-[520px] relative"
            onClick={(e) => e.stopPropagation()} // ✅ BLOCK overlay click
          >
            <h2 className="text-lg font-semibold mb-3">Delete note</h2>

            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this note?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletePopupOpen(false)}
                className="px-5 py-2 rounded-full bg-black text-white"
              >
                Cancel
              </button>

              <button
                onClick={() => confirmDeleteNote()}
                className="px-5 py-2 rounded-full bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>

            <button
              onClick={() => setDeletePopupOpen(false)}
              className="absolute top-4 right-4 text-xl"
            >
              ✕
            </button>
          </div>
        </div>
      )}

    </div>
    </>
  );
};

export default ContactDetailView;
