import React, { useState, useEffect, useCallback } from 'react';
import API_BASE_URL from '../../config';
import { useSelector } from 'react-redux';
import { RootState } from '../../Redux/store';
import axios from 'axios';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import DOMPurify from "dompurify";

import {
  faAngleRight,
  faAngleUp,
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
  faAngleDown,
} from "@fortawesome/free-solid-svg-icons"
import { useAppModal } from '../../hooks/useAppModal';
import RichTextEditor from './../common/RTEEditor';
import AccordionSection from '../common/accordion/Accordion';

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
  companyTelephone?: string;
  companyEmployeeCount?: string;
  companyIndustry?: string;
  companyLinkedInURL?: string;
  notes?: string;
  linkedIninformation?: string;

}

interface EditContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact | null;
  onContactUpdated: (updatedContact: Contact) => void;
  onShowMessage: (message: string, type: 'success' | 'error') => void;
  hideOverlay?: boolean;
  asPage?: boolean;
  // pinnedNotes: Note[];
  // ✅ Note management callbacks - moved from contact-detail-view
  notesHistory: any[];
  onEditNote?: (note: any) => void;
  onDeleteNote?: (noteId: number) => void;
  onTogglePin?: (noteId: number) => void;
  onNotesHistoryUpdate?: () => void;
  onSavingLinkedInChange?: (isSaving: boolean) => void;
}
interface Note {
  id: number;
  note: string;
  createdAt: string;
  createdByEmail?: string;
  isPin: boolean;
  isUseInGenration: boolean;
}


const EditContactModal: React.FC<EditContactModalProps> = ({
  isOpen,
  onClose,
  contact,
  onContactUpdated,
  onShowMessage,
  hideOverlay = false,
  asPage = false,
  //pinnedNotes,
  // ✅ Line 66-71: Destructure note management callbacks
  notesHistory,
  onEditNote,
  onDeleteNote,
  onTogglePin,
  onNotesHistoryUpdate,
  onSavingLinkedInChange,
}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    website: '',
    companyName: '',
    jobTitle: '',
    linkedInUrl: '',
    countryOrAddress: '',
    emailSubject: '',
    emailBody: '',
    companyTelephone: '',
    companyEmployeeCount: '',
    companyIndustry: '',
    companyLinkedInURL: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailBodyPopup, setShowEmailBodyPopup] = useState(false);
  const [showNotesPopup, setShowNotesPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [emailTimeline, setEmailTimeline] = useState<any[]>([]);
  // const [notesHistory, setNotesHistory] = useState<Note[]>([]);
  const reduxUserId = useSelector((state: RootState) => state.auth.userId);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [noteActionsAnchor, setNoteActionsAnchor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isEmailPersonalization, setIsEmailPersonalization] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const appModal = useAppModal();
  const [deletePopupOpen, setDeletePopupOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);
  const [deleteContactId, setDeleteContactId] = useState<number | null>(null);
  const [showLinkedInSummaryPopup, setShowLinkedInSummaryPopup] = useState(false);
  // Collapsible section states - all expanded by default
  const [expandedPersonalInfo, setExpandedPersonalInfo] = useState(true);
  const [expandedCompanyInfo, setExpandedCompanyInfo] = useState(true);
  const [expandedWebsiteSocial, setExpandedWebsiteSocial] = useState(true);
  const [linkedInSummary, setLinkedInSummary] = useState("");
  const [savedLinkedInSummary, setSavedLinkedInSummary] = useState("");
  const editorRef = React.useRef<HTMLDivElement | null>(null);
  const [expandedNoteIds, setExpandedNoteIds] = useState<Set<number>>(new Set());
  const [isLinkedInExpanded, setIsLinkedInExpanded] = useState(false);
  const [isSavingLinkedIn, setIsSavingLinkedIn] = useState(false);
   // 🔥 LinkedIn Summary Character Limit
  const LINKEDIN_SUMMARY_MAX_LENGTH = 10000;
  const LINKEDIN_TRUNCATE_LENGTH = 300;
  
  const getLinkedInPlainTextLength = (html: string) => {
    if (!html) return 0;
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return (temp.textContent || temp.innerText || "").trim().length;
  };
  
  const linkedInPlainTextLength = getLinkedInPlainTextLength(linkedInSummary);
  const isLinkedInSaveDisabled = linkedInPlainTextLength === 0 || linkedInPlainTextLength > LINKEDIN_SUMMARY_MAX_LENGTH;
  
  // Show toast message when LinkedIn summary exceeds limit
  useEffect(() => {
    if (linkedInPlainTextLength > LINKEDIN_SUMMARY_MAX_LENGTH) {
      setToastMessage("You have exceeded the 10,000 character limit.");
      setShowSuccessToast(true);

      const timer = setTimeout(() => {
        setShowSuccessToast(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [linkedInPlainTextLength]);
  const menuBtnStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    textAlign: "left",
  };

  const Stat = ({
    label,
    value,
    color,
    percentage,
    bgClass
  }: {
    label: string;
    value: number;
    color?: string;
    percentage?: string;
    bgClass?:string;
  }) => (
    <div
      className={`rounded-lg ${bgClass} border border-blue-100 p-3 text-center shadow-[0_4px_12px_rgba(0,0,0,0.1)]`}
      style={{ minHeight: 110 }}
    >
      <div
        className="text-md text-blue-600 font-medium"
        style={{ color: color ?? "#6b7280"}}
      >
        {label}
      </div>

      <div
        className="text-5xl font-bold text-blue-700"
        style={{ color: color ?? "#111827" }}
      >
        {value}
      </div>

      {/* Percentage BELOW value */}
      <div className="text-sm text-gray-500 text-center h-5 mt-[10px]">
      {percentage ? `(${percentage}%)` : ""}
    </div>
    </div>
  );
// Helper function to get plain text from HTML
  const getPlainText = (html: string): string => {
    if (!html) return "";
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
  };

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
// 🔥 Truncate LinkedIn summary to 300 characters (similar to Note)
  const getTruncatedLinkedIn = (html: string): string => {
    const plainText = getPlainText(html);
    if (plainText.length > LINKEDIN_TRUNCATE_LENGTH) {
      return plainText.substring(0, LINKEDIN_TRUNCATE_LENGTH) + "...";
    }
    return plainText;
  };

  useEffect(() => {
    if (contact) {
      setFormData(prev => ({
        ...prev,
        fullName: contact.full_name || '',
        email: contact.email || '',
        website: contact.website || '',
        companyName: contact.company_name || '',
        jobTitle: contact.job_title || '',
        linkedInUrl: contact.linkedin_url || '',
        countryOrAddress: contact.country_or_address || '',
        emailSubject: contact.email_subject || '',
        emailBody: stripHtml(contact.email_body || ''),
        //emailBody: contact.email_body || '',
        companyTelephone: contact.companyTelephone || '',
        companyEmployeeCount: contact.companyEmployeeCount || '',
        companyIndustry: contact.companyIndustry || '',
        companyLinkedInURL: contact.companyLinkedInURL || '',
        notes: contact.notes ?? prev.notes,
      }));
      setLinkedInSummary(contact.linkedIninformation || "");
      setSavedLinkedInSummary(contact.linkedIninformation || "");
    }
    console.log("Contact received:", contact);
  }, [contact]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const stripHtml = (html: string): string => {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
  };
  // const inputStyle =
  //   "w-full h-10 px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-bg-[#3f9f42]-200 focus:ring-bg-[#3f9f42]-200 focus:border-green-00 transition-colors placeholder-gray-400"
  const labelStyle = "block text-sm font-semibold text-gray-700 mb-2.5"
  const wideInputStyle =
    "w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3f9f42]";
  // const inputStyle =
  //   "w-full max-w-[19rem] px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3f9f42]";
  const inputStyle =
    "w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3f9f42]";

  const sectionTitleStyle =
    "text-xs font-bold text-gray-600 uppercase tracking-widest mb-5 mt-7 first:mt-0 pb-3 border-b border-gray-200"
  const dividerStyle = "h-px bg-gray-200 my-7"

  // 🔥 NEW styles for image-like UI
  const underlineInput =
    "w-full rounded-lg border border-border bg-card px-4 py-3 text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary form-control";

  const underlineLabel =
    "mb-1.5 block text-xs font-semibold text-muted-foreground";

  const infoCard =
    "w-full max-w-sm bg-white rounded-xl border border-gray-200 p-5";



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName.trim() || !formData.email.trim()) {
      onShowMessage('Full name and email are required', 'error');
      return;
    }

    if (!contact?.id) {
      onShowMessage('Contact ID is missing', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/update-contact?id=${contact.id}`,
        {
          method: 'POST',
          headers: {
            'accept': '*/*',
            'Content-Type': 'application/json'
          },
          // body: JSON.stringify(formData)
          body: JSON.stringify({
            ...formData,
            emailBody: stripHtml(formData.emailBody),
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update contact');
      }
      // const updatedContact = await response.json();
      // onShowMessage('Contact updated successfully!', 'success');
      //onContactUpdated(updatedContact);
      await response.json()
      const updatedContact: Contact = {
        ...contact,
        full_name: formData.fullName,
        email: formData.email,
        website: formData.website,
        company_name: formData.companyName,
        job_title: formData.jobTitle,
        linkedin_url: formData.linkedInUrl,
        country_or_address: formData.countryOrAddress,
        email_subject: formData.emailSubject,
        email_body: formData.emailBody,
        companyTelephone: formData.companyTelephone,
        companyEmployeeCount: formData.companyEmployeeCount,
        companyIndustry: formData.companyIndustry,
        companyLinkedInURL: formData.companyLinkedInURL,
        notes: formData.notes, // 🔥 THIS WAS MISSING
      };

      onShowMessage('Contact updated successfully!', 'success');
      setPopupMessage({ text: 'Contact updated successfully!', type: 'success' });
      setTimeout(() => setPopupMessage(null), 2000);
      onContactUpdated(updatedContact);
      // handleClose();
    } catch (error) {
      console.error('Error updating contact:', error);
      onShowMessage('Failed to update contact. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };
  const fetchEmailTimeline = async (contactId: number) => {
    if (!contactId) return;

    //setIsLoadingHistory(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/email-timeline?contactId=${contactId}`
      );

      if (!response.ok) throw new Error("Failed to fetch email timeline");

      const data = await response.json();
      console.log("timelinedata:", data);
      // ✅ IMPORTANT: inject contactCreatedAt into editingContact
      // setEditingContact((prev: any) =>
      //   prev
      //     ? {
      //       ...prev,
      //       contactCreatedAt: data.contactCreatedAt,
      //     }
      //     : prev
      // );

      setEmailTimeline(data.emails || []);
    } catch (err) {
      console.error(err);
      setEmailTimeline([]);
    } finally {
      // setIsLoadingHistory(false);
    }
  };
  const emailStats = React.useMemo(() => {
    const sent = emailTimeline.length;

    const openedTrackingIds = new Set<string>();
    const clickedTrackingIds = new Set<string>();

    let totalClicks = 0;

    emailTimeline.forEach((email: any) => {
      email.events?.forEach((ev: any) => {
        if (ev.eventType === "Open") {
          openedTrackingIds.add(email.trackingId);
        }

        if (ev.eventType === "Click") {
          clickedTrackingIds.add(email.trackingId);
          totalClicks++;
        }
      });
    });

    const uniqueOpens = openedTrackingIds.size;
    const uniqueClicks = clickedTrackingIds.size;

    return {
      sent,
      uniqueOpens,
      uniqueClicks,
      uniqueOpensPct: sent ? ((uniqueOpens / sent) * 100).toFixed(1) : "0.0",
      uniqueClicksPct: sent ? ((uniqueClicks / sent) * 100).toFixed(1) : "0.0",
    };
  }, [emailTimeline]);




  useEffect(() => {
    if (contact?.id) {
      fetchEmailTimeline(contact.id);
    }
  }, [contact?.id]);
  // const fetchNotesHistory = useCallback(async () => {
  //   if (!reduxUserId || !contact?.id) return;

  //   try {
  //     const res = await axios.get(
  //       `${API_BASE_URL}/api/notes/Get-All-Note`,
  //       {
  //         params: {
  //           clientId: reduxUserId,
  //           contactId: contact.id,
  //         },
  //       }
  //     );

  //     if (res.data?.success) {
  //       setNotesHistory(res.data.data || []);
  //     } else {
  //       setNotesHistory([]);
  //     }
  //   } catch (err) {
  //     console.error("Failed to fetch notes history", err);
  //     setNotesHistory([]);
  //   }
  // },[reduxUserId, contact?.id]);
  const handleEditNote = async (note: any) => {
    if (!reduxUserId || !contact?.id) return;

    try {
      setIsEditMode(true);
      setEditingNoteId(note.id);
      setNoteActionsAnchor(null);

      const res = await axios.get(
        `${API_BASE_URL}/api/notes/Get-Note-By-Id`,
        {
          params: {
            clientId: reduxUserId,
            contactId: contact.id,
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
  // useEffect(() => {
  //   fetchNotesHistory();
  // }, [contact?.id, reduxUserId]);

  const pinnedNotes = React.useMemo(
    () => (notesHistory || []).filter(n => n.isPin),
    [notesHistory]
  );

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
  // const handleTogglePin = async (noteId: number) => {
  //   if (!reduxUserId || !contact?.id) return;

  //   try {
  //     await axios.post(`${API_BASE_URL}/api/notes/Toggle-Pin`, {
  //       clientId: reduxUserId,
  //       contactId: contact.id,
  //       noteId,
  //     });


  //     setNoteActionsAnchor(null); // 🔥 REQUIRED
  //     fetchNotesHistory();
  //     setToastMessage("Note pin status updated");
  //     setShowSuccessToast(true);
  //     setTimeout(() => setShowSuccessToast(false), 2500);

  //     setNoteActionsAnchor(null);
  //     onNotesHistoryUpdate?.();
  //     // 🔥 IMPORTANT
  //     fetchNotesHistory();

  //   } catch (err) {
  //     console.error("Failed to toggle pin", err);
  //     appModal.showError("Failed to update pin");
  //   }
  // };
  const handleTogglePin = async (noteId: number) => {
    if (!reduxUserId || !contact?.id) return;

    try {
      // Get current note to find its current pin status
      const noteToToggle = notesHistory.find(n => n.id === noteId);
      if (!noteToToggle) return;

      const newPinStatus = !noteToToggle.isPin;

      // Make API call to update pin status on backend
      await axios.post(
        `${API_BASE_URL}/api/notes/Update-Note`,
        null,
        {
          params: {
            NoteId: noteId,
            clientId: reduxUserId,
            contactId: contact.id,
            Note: noteToToggle.note,
            IsPin: newPinStatus,
            IsUseInGenration: noteToToggle.isUseInGenration,
          },
        }
      );

      setNoteActionsAnchor(null);
      setToastMessage(newPinStatus ? "Note was pinned" : "Note was unpinned");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 2500);

      // Refresh notes history to trigger re-render
      // await fetchNotesHistory();
      onNotesHistoryUpdate?.();

    } catch (err) {
      console.error("Failed to toggle pin", err);
      appModal.showError("Failed to update pin");
    }
  };
  const handleDeleteNote = (noteId: number) => {
    if (!contact?.id) return;
    setNoteToDelete(noteId);
    setDeletingNoteId(noteId);
    setDeleteContactId(Number(contact.id));
    setDeletePopupOpen(true);
  };
  const confirmDeleteNote = async () => {
    if (!reduxUserId || !contact?.id || !noteToDelete) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/notes/Delete-Note`, {
        params: {
          clientId: reduxUserId,
          contactId: contact.id,
          noteId: noteToDelete,
        },
      });

      setDeletePopupOpen(false);
      setNoteToDelete(null);
      setDeletingNoteId(null);

      setToastMessage("Note deleted successfully");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 2500);

      // 🔥 refresh list
      //  await fetchNotesHistory();
      onNotesHistoryUpdate?.()

    } catch (err) {
      console.error("Failed to delete note", err);
      appModal.showError("Failed to delete note");
    }
  };
  const handleLinkedInSummarySave = async () => {
    if (!contact?.id) return;
 // 🔥 Check character limit before saving
    if (linkedInPlainTextLength > LINKEDIN_SUMMARY_MAX_LENGTH) {
      setToastMessage("You have exceeded the 10,000 character limit.");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      return;
    }
    try {
      setIsSavingLinkedIn(true);
      onSavingLinkedInChange?.(true);
      await axios.post(
       `${API_BASE_URL}/api/Crm/Update-linkedIninformation?contactid=${contact.id}`,
        linkedInSummary,
        {
        headers: {
        'Content-Type': 'application/json',
        },
      }
    );
   setSavedLinkedInSummary(linkedInSummary);
      onContactUpdated({
        ...contact,
        linkedIninformation: linkedInSummary,
      });

      setToastMessage("LinkedIn summary updated successfully");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 4000);

      setShowLinkedInSummaryPopup(false);
    } catch (error) {
      console.error("Failed to update LinkedIn summary", error);
      appModal.showError("Failed to update LinkedIn summary");
    } finally {
      setIsSavingLinkedIn(false);
      onSavingLinkedInChange?.(false);
    }
  };
  if (!isOpen || !contact) return null;

  const content = (
    <div className={`${asPage ? "w-full" : "w-[90%] max-w-6xl"} ${!asPage && "shadow-xl rounded-lg"}`}>
      {/* Flex container for left & right */}
      <div className="flex flex-row gap-8">

        {/* LEFT SIDE (Edit Contact) */}
        <div className="w-1/2 bg-white rounded-lg p-6  shadow-[5px_5px_12px_rgba(0,0,0,0.15)] border border border-[#cccccc]">
          {/* Header */}
          <div className="mb-3 flex justify-between">
            <div className='flex flex-col'>
              <h1 className="text-xl font-[600] text-gray-900">Edit contact</h1>
              <p className="text-sm text-gray-500 mt-1">Update contact information and details</p>
            </div>
             {/* Buttons */}
              <div className="flex items-center justify-end gap-3">
                <button type='button' className="rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
                <button
                  type='submit'
                  className="rounded-lg bg-[#3f9f42] px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:bg-gray-300"
                  disabled={isSubmitting || !formData.fullName?.trim() || !formData.email?.trim()}
                  onClick={handleSubmit}
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
                
              </div>
          </div>

          {/* Personal Info Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <div className="space-y- border border-[#cccccc] rounded-lg bg-white shadow-sm border-b-0">
              {/* PERSONAL INFORMATION */}
              <AccordionSection
                defaultOpen
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                }
                title="Personal information"
              >
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div className='flex flex-col gap-[5px] form-group !mb-[0]'>
                      <label className={underlineLabel}>Full name</label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        className={underlineInput}
                        placeholder="Full name"
                      />
                    </div>
                    <div className='flex flex-col gap-[5px] form-group !mb-[0]'>
                      <label className={underlineLabel}>Email</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={underlineInput}
                        placeholder="Email"
                      />
                    </div>
                </div>
              </AccordionSection>

              {/* COMPANY INFORMATION */}
              <AccordionSection
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                }
                title="Company information"
              >
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className='flex flex-col gap-[5px] form-group !mb-[0]'>
                    <label className={underlineLabel}>Job title</label>
                    <input
                      type="text"
                      name="jobTitle"
                      value={formData.jobTitle}
                      onChange={handleInputChange}
                      placeholder="Job title"
                      className={underlineInput}
                    />
                  </div>
                  <div className='flex flex-col gap-[5px] form-group !mb-[0]'>
                    <label className={underlineLabel}>Company name</label>
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      placeholder="Company name"
                      className={underlineInput}
                    />
                  </div>
                  <div className='flex flex-col gap-[5px] form-group !mb-[0]'>
                    <label className={underlineLabel}>Company industry</label>
                    <input
                      type="text"
                      name="companyIndustry"
                      value={formData.companyIndustry}
                      onChange={handleInputChange}
                      placeholder="Company industry"
                      className={underlineInput}
                    />
                  </div>
                  <div className='flex flex-col gap-[5px] form-group !mb-[0]'>
                    <label className={underlineLabel}>Company employee count</label>
                    <input
                      type="text"
                      name="companyEmployeeCount"
                      value={formData.companyEmployeeCount}
                      onChange={handleInputChange}
                      placeholder="Company employee count"
                      className={underlineInput}
                    />
                  </div>
                  <div className='flex flex-col gap-[5px] form-group !mb-[0]'>
                    <label className={underlineLabel}>Company telephone</label>
                    <input
                      type="text"
                      name="companyTelephone"
                      value={formData.companyTelephone}
                      onChange={handleInputChange}
                      placeholder="Company telephone"
                      className={underlineInput}
                    />
                  </div>
                  <div className='flex flex-col gap-[5px] form-group !mb-[0]'>
                    <label className={underlineLabel}>Country/address</label>
                    <input
                      type="text"
                      name="countryOrAddress"
                      value={formData.countryOrAddress}
                      onChange={handleInputChange}
                      placeholder="Country/address"
                      className={underlineInput}
                    />
                  </div>
                </div>
              </AccordionSection>

              {/* WEBSITE & SOCIAL */}
              <AccordionSection
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                }
                title="Website & social"
              >
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                  <div className="flex flex-col gap-[5px] form-group !mb-[0]">
  <label className={underlineLabel}>Website</label>

  <div className="relative">
    <input
      type="text"
      name="website"
      value={formData.website}
      onChange={handleInputChange}
      placeholder="Enter website"
      className={`${underlineInput} text-[#3f9f42] underline pr-[40px]`}
      onDoubleClick={() => {
        if (formData.website) {
          const url = formData.website.startsWith("http")
            ? formData.website
            : `https://${formData.website}`;
          window.open(url, "_blank");
        }
      }}
    />

    {/* Globe Icon */}
    {formData.website && (
      <span
        className="absolute right-[90px] top-[55%] translate-y-[-50%] cursor-pointer"
        onClick={() => {
          const url = formData.website.startsWith("http")
            ? formData.website
            : `https://${formData.website}`;
          window.open(url, "_blank");
        }}
      >
        <svg
          width="22px"
          height="22px"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
             d="M9.83824 18.4467C10.0103 18.7692 10.1826 19.0598 10.3473 19.3173C8.59745 18.9238 7.07906 17.9187 6.02838 16.5383C6.72181 16.1478 7.60995 15.743 8.67766 15.4468C8.98112 16.637 9.40924 17.6423 9.83824 18.4467ZM11.1618 17.7408C10.7891 17.0421 10.4156 16.1695 10.1465 15.1356C10.7258 15.0496 11.3442 15 12.0001 15C12.6559 15 13.2743 15.0496 13.8535 15.1355C13.5844 16.1695 13.2109 17.0421 12.8382 17.7408C12.5394 18.3011 12.2417 18.7484 12 19.0757C11.7583 18.7484 11.4606 18.3011 11.1618 17.7408ZM9.75 12C9.75 12.5841 9.7893 13.1385 9.8586 13.6619C10.5269 13.5594 11.2414 13.5 12.0001 13.5C12.7587 13.5 13.4732 13.5593 14.1414 13.6619C14.2107 13.1384 14.25 12.5841 14.25 12C14.25 11.4159 14.2107 10.8616 14.1414 10.3381C13.4732 10.4406 12.7587 10.5 12.0001 10.5C11.2414 10.5 10.5269 10.4406 9.8586 10.3381C9.7893 10.8615 9.75 11.4159 9.75 12ZM8.38688 10.0288C8.29977 10.6478 8.25 11.3054 8.25 12C8.25 12.6946 8.29977 13.3522 8.38688 13.9712C7.11338 14.3131 6.05882 14.7952 5.24324 15.2591C4.76698 14.2736 4.5 13.168 4.5 12C4.5 10.832 4.76698 9.72644 5.24323 8.74088C6.05872 9.20472 7.1133 9.68686 8.38688 10.0288ZM10.1465 8.86445C10.7258 8.95042 11.3442 9 12.0001 9C12.6559 9 13.2743 8.95043 13.8535 8.86447C13.5844 7.83055 13.2109 6.95793 12.8382 6.2592C12.5394 5.69894 12.2417 5.25156 12 4.92432C11.7583 5.25156 11.4606 5.69894 11.1618 6.25918C10.7891 6.95791 10.4156 7.83053 10.1465 8.86445ZM15.6131 10.0289C15.7002 10.6479 15.75 11.3055 15.75 12C15.75 12.6946 15.7002 13.3521 15.6131 13.9711C16.8866 14.3131 17.9412 14.7952 18.7568 15.2591C19.233 14.2735 19.5 13.1679 19.5 12C19.5 10.8321 19.233 9.72647 18.7568 8.74093C17.9413 9.20477 16.8867 9.6869 15.6131 10.0289ZM17.9716 7.46178C17.2781 7.85231 16.39 8.25705 15.3224 8.55328C15.0189 7.36304 14.5908 6.35769 14.1618 5.55332C13.9897 5.23077 13.8174 4.94025 13.6527 4.6827C15.4026 5.07623 16.921 6.08136 17.9716 7.46178ZM8.67765 8.55325C7.61001 8.25701 6.7219 7.85227 6.02839 7.46173C7.07906 6.08134 8.59745 5.07623 10.3472 4.6827C10.1826 4.94025 10.0103 5.23076 9.83823 5.5533C9.40924 6.35767 8.98112 7.36301 8.67765 8.55325ZM15.3224 15.4467C15.0189 16.637 14.5908 17.6423 14.1618 18.4467C13.9897 18.7692 13.8174 19.0598 13.6527 19.3173C15.4026 18.9238 16.921 17.9186 17.9717 16.5382C17.2782 16.1477 16.3901 15.743 15.3224 15.4467ZM12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z"
             fill="#3f9f42"
          />
        </svg>
      </span>
    )}
  </div>
</div>
                  <div className='flex flex-col gap-[5px] form-group !mb-[0]'>
                    <label className={underlineLabel}>LinkedIn URL</label>
                    <input type="text" name="linkedInUrl" value={formData.linkedInUrl} onChange={handleInputChange} placeholder="Enter LinkedIn URL" className={`${underlineInput} text-[#3f9f42] underline cursor-pointer`}
                      onDoubleClick={() => {
                        if (formData.linkedInUrl) {
                          const url = formData.linkedInUrl.startsWith("http")
                            ? formData.linkedInUrl
                            : `https://${formData.linkedInUrl}`;
                          window.open(url, "_blank");
                        }
                      }}
                    />
                  </div>
                  <div className='flex flex-col gap-[5px] form-group !mb-[0]'>
                    <label className={underlineLabel}>Company linkedIn URL</label>
                    <input
                      type="text"
                      name="companyLinkedInURL"
                      value={formData.companyLinkedInURL}
                      onChange={handleInputChange}
                      placeholder="Company LinkedIn URL"
                      className={underlineInput}
                    />
                  </div>

                </div>
              </AccordionSection>

              



              {/* PERSONAL INFORMATION */}
              {/* <div
                onClick={() => setExpandedPersonalInfo(!expandedPersonalInfo)}
                className="flex items-center justify-between cursor-pointer p-3 rounded hover:bg-gray-50 transition-colors"
                style={{ marginTop: -12, marginLeft: -12, marginRight: -12, marginBottom: 8, paddingLeft: 16, paddingRight: 273 }}
              >
                <h3 className="text-sm font-semibold text-[#3f9f42]">Personal information</h3>
                <FontAwesomeIcon
                  icon={faAngleDown}
                  style={{
                    transform: expandedPersonalInfo ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.25s ease',
                    fontSize: 16,
                    marginTop: "auto"
                  }}
                  className="text-[#3f9f42]"
                />
              </div>
              
              {expandedPersonalInfo && (
                <>
                  <div className='flex flex-col gap-[5px]'>
                    <label className={underlineLabel}>Full name</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className={underlineInput}
                      placeholder="Full name"
                    />
                  </div>

                  <div className='flex flex-col gap-[5px]'>
                    <label className={underlineLabel}>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={underlineInput}
                      placeholder="Email"
                    />
                  </div>
                </>
              )} */}

              {/* COMPANY INFORMATION */}
              {/* <div
                onClick={() => setExpandedCompanyInfo(!expandedCompanyInfo)}
                className="flex items-center justify-between cursor-pointer p-3 rounded hover:bg-gray-50 transition-colors"
                style={{ marginTop: 6, marginLeft: -12, marginRight: -12, marginBottom: 8, paddingLeft: 16, paddingRight: 273 }}
              >
                <h3 className="text-sm font-semibold text-[#3f9f42]">Company information</h3>
                <FontAwesomeIcon
                  icon={faAngleDown}
                  style={{
                    transform: expandedCompanyInfo ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.25s eas',
                    fontSize: 16,
                    marginTop: "auto"
                  }}
                  className="text-[#3f9f42]"
                />
              </div>
              {expandedCompanyInfo && (
                <>
                  <div className='flex flex-col gap-[5px]'>
                    <label className={underlineLabel}>Job title</label>
                    <input
                      type="text"
                      name="jobTitle"
                      value={formData.jobTitle}
                      onChange={handleInputChange}
                      placeholder="Job title"
                      className={underlineInput}
                    />
                  </div>
                  <div className='flex flex-col gap-[5px]'>
                    <label className={underlineLabel}>Company name</label>
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      placeholder="Company name"
                      className={underlineInput}
                    />
                  </div>
                  <div className='flex flex-col gap-[5px]'>
                    <label className={underlineLabel}>Company industry</label>
                    <input
                      type="text"
                      name="companyIndustry"
                      value={formData.companyIndustry}
                      onChange={handleInputChange}
                      placeholder="Company industry"
                      className={underlineInput}
                    />
                  </div>
                  <div className='flex flex-col gap-[5px]'>
                    <label className={underlineLabel}>Company employee count</label>
                    <input
                      type="text"
                      name="companyEmployeeCount"
                      value={formData.companyEmployeeCount}
                      onChange={handleInputChange}
                      placeholder="Company employee count"
                      className={underlineInput}
                    />
                  </div>
                  <div className='flex flex-col gap-[5px]'>
                    <label className={underlineLabel}>Company telephone</label>
                    <input
                      type="text"
                      name="companyTelephone"
                      value={formData.companyTelephone}
                      onChange={handleInputChange}
                      placeholder="Company telephone"
                      className={underlineInput}
                    />
                  </div>
                  <div className='flex flex-col gap-[5px]'>
                    <label className={underlineLabel}>Country/address</label>
                    <input
                      type="text"
                      name="countryOrAddress"
                      value={formData.countryOrAddress}
                      onChange={handleInputChange}
                      placeholder="Country/address"
                      className={underlineInput}
                    />
                  </div>
                </>
              )} */}

              {/* WEBSITE & SOCIAL */}
              {/* <div
                onClick={() => setExpandedWebsiteSocial(!expandedWebsiteSocial)}
                className="flex items-center justify-between cursor-pointer p-3 rounded hover:bg-gray-50 transition-colors"
                style={{ marginTop: 12, marginLeft: -12, marginRight: -12, marginBottom: 8, paddingLeft: 16, paddingRight: 273 }}
              >
                <h3 className="text-sm font-semibold text-[#3f9f42]">Website & social</h3>
                <FontAwesomeIcon
                  icon={faAngleDown}
                  style={{
                    transform: expandedWebsiteSocial ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.25s eas',
                    fontSize: 16,
                    marginTop: "auto"
                  }}
                  className="text-[#3f9f42]"
                />
              </div>
              {expandedWebsiteSocial && (
                <>
                  <div className='flex flex-col gap-[5px]'>
                    <label className={underlineLabel}>Website</label>
                    <input type="text" name="website" value={formData.website} onChange={handleInputChange} placeholder="Enter website" className={`${underlineInput} text-[#3f9f42] underline cursor-pointer`}
                      onDoubleClick={() => {
                        if (formData.website) {
                          const url = formData.website.startsWith("http")
                            ? formData.website
                            : `https://${formData.website}`;
                          window.open(url, "_blank");
                        }
                      }}
                    />
                  </div>
                  <div className='flex flex-col gap-[5px]'>
                    <label className={underlineLabel}>LinkedIn URL</label>
                    <input type="text" name="linkedInUrl" value={formData.linkedInUrl} onChange={handleInputChange} placeholder="Enter LinkedIn URL" className={`${underlineInput} text-[#3f9f42] underline cursor-pointer`}
                      onDoubleClick={() => {
                        if (formData.linkedInUrl) {
                          const url = formData.linkedInUrl.startsWith("http")
                            ? formData.linkedInUrl
                            : `https://${formData.linkedInUrl}`;
                          window.open(url, "_blank");
                        }
                      }}
                    />
                  </div>
                  <div className='flex flex-col gap-[5px]'>
                    <label className={underlineLabel}>Company linkedIn URL</label>
                    <input
                      type="text"
                      name="companyLinkedInURL"
                      value={formData.companyLinkedInURL}
                      onChange={handleInputChange}
                      placeholder="Company LinkedIn URL"
                      className={underlineInput}
                    />
                  </div>
                </>
              )} */}

              {/* SAVE / CANCEL BUTTONS */}
              {/* <div className="flex justify-start items-center gap-3 mt-6 pt-4 border-gray-200 sticky bottom-0 bg-white z-10">
                <button
                  type="button"
                  className="px-5 py-2 border border-gray-300 rounded-full text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.fullName?.trim() || !formData.email?.trim()}
                  className="px-6 py-2 bg-[#3f9f42] text-white rounded-full text-sm disabled:bg-gray-300"
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
              </div> */}
            </div>
          </form>
        </div>

        {/* RIGHT SIDE (Email Campaigns, Pinned Notes, LinkedIn Summary) */}
        <div className="w-1/2 flex flex-col gap-6">
          {/* Email Campaigns */}
          <div className="bg-white rounded-lg p-6 shadow-[5px_5px_12px_rgba(0,0,0,0.15)] border border border-[#cccccc]">
            <div className="mb-4 flex items-center gap-2">
              <span className='text-[#3f9f42]'>
                <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </span>
              <h3 className="text-lg font-semibold text-foreground">Email campaign</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Sent" value={emailStats.sent} color="#333" bgClass='bg-gray-80' />

              <Stat
                label="Unique opens"
                value={emailStats.uniqueOpens}
                percentage={emailStats.uniqueOpensPct}
                color="#ff9800"
                bgClass='bg-orange-50'
              />

              <Stat
                label="Unique clicks"
                value={emailStats.uniqueClicks}
                percentage={emailStats.uniqueClicksPct}
                color="#3f9f42"
                bgClass='bg-green-50'
              />
            </div>




          </div>

          {/* Pinned Notes */}
          <div className="bg-white rounded-lg p-6 shadow-[5px_5px_12px_rgba(0,0,0,0.15)] border border border-[#cccccc]">
            {pinnedNotes.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className='text-[#3f9f42]'>
                    <svg xmlns="http://www.w3.org/2000/svg" width="25px" height="25px" viewBox="0 -0.5 25 25" fill="none">
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M9.808 4.00001H15.329C15.3863 4.00001 15.4433 4.00367 15.5 4.01101C17.7473 4.16817 19.4924 6.0332 19.5 8.28601V14.715C19.4917 17.0871 17.5641 19.0044 15.192 19H9.808C7.43551 19.0044 5.50772 17.0865 5.5 14.714V8.28601C5.50772 5.91353 7.43551 3.99558 9.808 4.00001Z" stroke="#3f9f42" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                      <path d="M19.5 9.03599C19.9142 9.03599 20.25 8.7002 20.25 8.28599C20.25 7.87177 19.9142 7.53599 19.5 7.53599V9.03599ZM15.5 8.28599H14.75C14.75 8.7002 15.0858 9.03599 15.5 9.03599V8.28599ZM16.25 4.01099C16.25 3.59677 15.9142 3.26099 15.5 3.26099C15.0858 3.26099 14.75 3.59677 14.75 4.01099H16.25ZM14.5 12.75C14.9142 12.75 15.25 12.4142 15.25 12C15.25 11.5858 14.9142 11.25 14.5 11.25V12.75ZM8.5 11.25C8.08579 11.25 7.75 11.5858 7.75 12C7.75 12.4142 8.08579 12.75 8.5 12.75V11.25ZM11.5 9.74999C11.9142 9.74999 12.25 9.4142 12.25 8.99999C12.25 8.58577 11.9142 8.24999 11.5 8.24999V9.74999ZM8.5 8.24999C8.08579 8.24999 7.75 8.58577 7.75 8.99999C7.75 9.4142 8.08579 9.74999 8.5 9.74999V8.24999ZM15.5 15.75C15.9142 15.75 16.25 15.4142 16.25 15C16.25 14.5858 15.9142 14.25 15.5 14.25V15.75ZM8.5 14.25C8.08579 14.25 7.75 14.5858 7.75 15C7.75 15.4142 8.08579 15.75 8.5 15.75V14.25ZM19.5 7.53599H15.5V9.03599H19.5V7.53599ZM16.25 8.28599V4.01099H14.75V8.28599H16.25ZM14.5 11.25H8.5V12.75H14.5V11.25ZM11.5 8.24999H8.5V9.74999H11.5V8.24999ZM15.5 14.25H8.5V15.75H15.5V14.25Z" fill="#3f9f42"></path>
                    </svg>
                  </span>
                  <h3 className="text-lg font-semibold text-foreground">Pinned notes ({pinnedNotes.length})</h3>
                </div>
                {pinnedNotes.map((note: any, index: number) => (
                  <div key={note.id} style={{ display: "flex", gap: 16, paddingBottom: index !== pinnedNotes.length - 1 ? 24 : 0, }} >
                    {/* Note content */}
                    <div style={{ flex: 1 }}>
                      <div className='relative rounded-[5px] border border-solid border-[#e5e7eb] border-l-[3px] border-l-[#cccccc] bg-[#fefcf9] p-4' >
                        <div style={{ fontSize: 13, color: "#666", marginBottom: 8 }}> {formatDateTimeIST(note.createdAt)} </div>
                        {/* 3-dot menu */}
                        <button onClick={(e) => {
                          e.stopPropagation(); setNoteActionsAnchor(noteActionsAnchor === note.id ? null : note.id);
                        }} style={{ position: "absolute", top: 12, right: 12, border: "none", background: "#ebebeb", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", }} >
                          <FontAwesomeIcon icon={faEllipsisV} />
                        </button>
                        {/* Action menu */}
                        {noteActionsAnchor === note.id && (
                          <div style={{ position: "absolute", right: 0, top: 48, background: "#fff", border: "1px solid #eee", borderRadius: 6, boxShadow: "0 2px 16px rgba(0,0,0,0.12)", zIndex: 101, minWidth: 160, }}
                            onClick={(e) => e.stopPropagation()} >
                            <button
                              onClick={async () => {
                                await onEditNote?.(note);
                                setNoteActionsAnchor(null);
                                //  await fetchNotesHistory();
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

                            {/* 📌 PIN / UNPIN */}
                            <button
                              onClick={async () => {
                                await onTogglePin?.(note.id);
                                setNoteActionsAnchor(null);
                                // await fetchNotesHistory();
                              }}
                              style={menuBtnStyle}
                              className="flex gap-2 items-center"
                            >
                              <span>
                                <FontAwesomeIcon
                                  icon={faThumbtack}
                                  style={{
                                    transform: note.isPin ? "rotate(45deg)" : "none",
                                    width: "25px",
                                    height: "25px"
                                  }}
                                />
                              </span>
                              <span className="font-[600]">
                                {note.isPin ? "Unpin" : "Pin"}
                              </span>
                            </button>

                            {/* 🗑️ DELETE */}
                            <button
                              onClick={async () => {
                                await onDeleteNote?.(note.id);
                                setNoteActionsAnchor(null);
                                // await fetchNotesHistory();
                              }}
                              style={menuBtnStyle}
                              className="flex gap-2 items-center "
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
                          </div>)}
                        {/* NOTE TEXT — ✅ NO <p> TAG */}
                        <div
                          className="rendered-note-content"
                          style={{
                            fontSize: 14,
                            lineHeight: "1.5",
                            whiteSpace: "normal",
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* LinkedIn Summary */}
          <div
            className="bg-white rounded-lg p-6 shadow-[5px_5px_12px_rgba(0,0,0,0.15)] border border border-[#cccccc]"
            style={{ minHeight: 160 }}   // ✅ better than fixed height
          >
           
            <div className="flex items-center  justify-between">
                <div className='flex  gap-[10px] items-center'>
                  <span className=''>
                    <svg className="h-5 w-5 text-[#3f9f42]" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                  </span>
                  <h3 className="text-lg font-semibold text-foreground">LinkedIn summary</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLinkedInSummaryPopup(true)}
                  className="flex items-center gap-2 text-[#333333] rounded transition-colors"
                >
                  <FontAwesomeIcon icon={faEdit} className='20px' />
                </button>
                
            </div>

            {/* ✅ HTML RENDERER */}
            <div
              style={{
                fontSize: 14,
                color: "#374151",
                lineHeight: "1.6",
                whiteSpace: "normal",
                overflow: "hidden",
                wordWrap: "break-word",
                wordBreak: "break-word",
                overflowWrap: "break-word",
                maxWidth: "100%",
              }}
              className='py-[16px]'
               dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(
                  !savedLinkedInSummary  
                    ? "<p>No LinkedIn summary available</p>"
                    : isLinkedInExpanded 
                      ? savedLinkedInSummary
                      : `<p>${getTruncatedLinkedIn(savedLinkedInSummary)}</p>`
                ),
              }}
            />
             {/* 🔥 EXPAND/COLLAPSE BUTTON */}
            {linkedInSummary && getPlainText(linkedInSummary).length > LINKEDIN_TRUNCATE_LENGTH && (
              <button
                onClick={() => setIsLinkedInExpanded(!isLinkedInExpanded)}
                style={{
                  marginTop: 12,
                  background: "transparent",
                  border: "none",
                  color: "#3f9f42",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                {isLinkedInExpanded ? "Show less" : "Expand"}
              </button>
            )}
          </div>

        </div>
      </div>
    </div >
  )
  if (asPage) {
    return (
      <>
        {content}
        {popupMessage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          >
            <div
              className={`p-5 rounded shadow-md text-white max-w-sm w-full text-center ${popupMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                }`}
            >
              {popupMessage.text}
            </div>
          </div>
        )}

        {showEmailBodyPopup && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              zIndex: 100000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                background: "#fff",
                padding: 24,
                borderRadius: 8,
                width: "70%",
                maxWidth: 900,
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 16 }}>
                Email body
              </h3>

              <textarea
                value={formData.emailBody}
                readOnly
                rows={12}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  resize: "vertical",
                  background: "#f9f9f9",
                }}
              />

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setShowEmailBodyPopup(false)}
                  style={{
                    padding: "8px 16px",
                    background: "#3f9f42",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
        {
          showNotesPopup && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
              <div className="bg-white w-full max-w-3xl rounded-lg shadow-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold">Notes</h3>
                  <button
                    onClick={() => setShowNotesPopup(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <textarea
                  name="notes"
                  value={formData.notes || ""}
                  onChange={handleInputChange}
                  rows={15}
                  className="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-[#3f9f42]"
                />
              </div>
            </div>
          )
        }
        {/* LinkedIn Summary Popup with Toolbar */}
        {/* OVERLAY */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: showLinkedInSummaryPopup
              ? "rgba(0,0,0,0.6)"
              : "transparent",
            zIndex: 100000,
            pointerEvents: showLinkedInSummaryPopup ? "auto" : "none",
            transition: "background 0.3s ease",
          }}
          onClick={() => setShowLinkedInSummaryPopup(false)}
        >
          {/* RIGHT DRAWER */}
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              height: "100vh",
              width: 454,
              background: "#fff",
              boxShadow: "-4px 0 20px rgba(0,0,0,0.08)",
              transform: showLinkedInSummaryPopup
                ? "translateX(0)"
                : "translateX(100%)",
              transition: "transform 0.35s ease-in-out",
              display: "flex",
              flexDirection: "column",
              zIndex: 1000,
            }}
            onClick={(e) => e.stopPropagation()} 
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
                LinkedIn Summary
              </h3>
              <button
                onClick={() => setShowLinkedInSummaryPopup(false)}
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
            {/* BODY (Scrollable) */}
            <div
              className="note-editor-wrapper"
              style={{ flex: 1, overflowY: "auto", padding: 20 }}
            >
              <div style={{ marginBottom: 10 }}>
                <RichTextEditor
                  value={linkedInSummary}
                  onChange={setLinkedInSummary}
                />
              </div>
                <div style={{ marginTop: 8, fontSize: 12, color:"#6b7280" }}>
            {linkedInPlainTextLength}/10000
          </div>
            </div>

            {/* FOOTER (Fixed Bottom) */}
            <div
              style={{
                padding: 16,
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px solid #e5e7eb",
                marginBottom: 50,
                background: "#fff",
                position: "sticky",
              }}
            >
                {/* LEFT SIDE BUTTONS */}
           <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowLinkedInSummaryPopup(false)}
                type="button"
                className="px-5 py-2 border border-gray-300 rounded-full text-sm"
              >
                Cancel
              </button>
               <button
                  onClick={() => setLinkedInSummary("")}
                  type="button"
                  className="px-5 py-2 border border-red-300 text-red-600 rounded-full text-sm"
                >
                Clear
             </button>
            </div>
              <button
                onClick={handleLinkedInSummarySave}
                disabled={isLinkedInSaveDisabled || isSavingLinkedIn}
                style={{
                  background: isLinkedInSaveDisabled ? "#d1d5db" : "#3f9f42",
                  color: isLinkedInSaveDisabled ? "#6b7280" : "#ffffff",
                  border: "none",
                  padding: "8px 18px",
                  borderRadius: 18,
                  fontSize: 14,
                  cursor: isLinkedInSaveDisabled ? "not-allowed" : "pointer",
                  fontWeight: 500,
                  borderTop: "2px solid transparent",
                  opacity: isLinkedInSaveDisabled ? 0.6 : 1,
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>

        {/* SUCCESS TOAST */}
        {showSuccessToast && (
          <div
            style={{
              position: "fixed",
              bottom: 24,
              left: "50%",
              transform: "translateX(-50%)",
              background: "#ecfdf5",
              color: "#065f46",
              padding: "12px 18px",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 12,
              boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
              zIndex: 99999,
              minWidth: 320,
            }}
          >
            {/* Green check */}
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "#22c55e",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              ✓
            </div>

            {/* Message */}
            <div style={{ fontSize: 14, flex: 1 }}>
              {toastMessage}
            </div>

            {/* Close */}
            <div
              onClick={() => setShowSuccessToast(false)}
              style={{
                cursor: "pointer",
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              ×
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      zIndex: 99999,
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: '#fff',
        padding: 24,
        borderRadius: 8,
        width: '45%',
        maxWidth: 800,
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: 20 }}>Edit contact</h3>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                Full name <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                Email <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                Company name
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                Job title
              </label>
              <input
                type="text"
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                Website
              </label>
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                LinkedIn URL
              </label>
              <input
                type="text"
                name="linkedInUrl"
                value={formData.linkedInUrl}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                Country/address
              </label>
              <input
                type="text"
                name="countryOrAddress"
                value={formData.countryOrAddress}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                Company telephone
              </label>
              <input
                type="text"
                name="companyTelephone"
                value={formData.companyTelephone}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                Company employee count
              </label>
              <input
                type="text"
                name="companyEmployeeCount"
                value={formData.companyEmployeeCount}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                Company industry
              </label>
              <input
                type="text"
                name="companyIndustry"
                value={formData.companyIndustry}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                Company linkedin URL
              </label>
              <input
                type="text"
                name="companyLinkedInURL"
                value={formData.companyLinkedInURL}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
              Email subject
            </label>
            <input
              type="text"
              name="emailSubject"
              value={formData.emailSubject}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
              Email body
            </label>
            <textarea
              name="emailBody"
              value={formData.emailBody}
              onChange={handleInputChange}
              rows={4}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '8px 16px',
                border: '1px solid #ddd',
                background: '#fff',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.fullName.trim() || !formData.email.trim()}
              style={{
                padding: '8px 16px',
                background: isSubmitting || !formData.fullName.trim() || !formData.email.trim() ? '#ccc' : '#3f9f42',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: isSubmitting || !formData.fullName.trim() || !formData.email.trim() ? 'not-allowed' : 'pointer'
              }}
            >
              {isSubmitting ? 'Updating...' : 'Update contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditContactModal;


