import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../config';
import { useSelector } from 'react-redux';
import { RootState } from '../../Redux/store';
import axios from 'axios';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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
  onEditNote?: (note: any) => void;
  onDeleteNote?: (noteId: number) => void;
  onTogglePin?: (noteId: number) => void;
  onNotesHistoryUpdate?: () => void;
}
interface Note {
  id: number;
  note: string;
  createdAt: string;
  createdByEmail?: string;
  isPin: boolean;
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
  onEditNote,
  onDeleteNote,
  onTogglePin,
  onNotesHistoryUpdate,
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
  const [notesHistory, setNotesHistory] = useState<Note[]>([]);
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
  }: {
    label: string;
    value: number;
    color?: string;
    percentage?: string;
  }) => (
    <div
      className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center"
      style={{ minHeight: 110 }}
    >
      <div
        className="text-sm mb-2 text-center"
        style={{ color: color ?? "#6b7280", fontWeight: "500" }}
      >
        {label}
      </div>

      <div className="text-2xl leading-8 font-semibold text-center">
        <span style={{ color: color ?? "#111827" }}>{value}</span>
        {percentage && (
          <span className="text-sm text-gray-500 ml-1">
            ({percentage}%)
          </span>
        )}
      </div>
    </div>
  );



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
        notes: contact.notes ?? prev.notes
      }));
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
    "w-full border-0 border-b border-gray-300 px-0 py-1 text-sm focus:outline-none focus:border-black bg-transparent";

  const underlineLabel =
    "block text-xs  tracking-wide text-gray-500 mb-1";

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
  const fetchNotesHistory = async () => {
    if (!reduxUserId || !contact?.id) return;

    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/notes/Get-All-Note`,
        {
          params: {
            clientId: reduxUserId,
            contactId: contact.id,
          },
        }
      );

      if (res.data?.success) {
        setNotesHistory(res.data.data || []);
      } else {
        setNotesHistory([]);
      }
    } catch (err) {
      console.error("Failed to fetch notes history", err);
      setNotesHistory([]);
    }
  };
  const handleEditNote = async (note: any) => {
    if (!reduxUserId || !contact?.id) return;

    try {
      setIsEditMode(true);
      setEditingNoteId(note.id);
      //  setNoteActionsAnchor(null);

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
  useEffect(() => {
    fetchNotesHistory();
  }, [contact?.id, reduxUserId]);

  const pinnedNotes = React.useMemo(
    () => notesHistory.filter(n => n.isPin),
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
  const handleTogglePin = async (noteId: number) => {
    if (!reduxUserId || !contact?.id) return;

    try {
      await axios.post(`${API_BASE_URL}/api/notes/Toggle-Pin`, {
        clientId: reduxUserId,
        contactId: contact.id,
        noteId,
      });


      setNoteActionsAnchor(null); // 🔥 REQUIRED
      fetchNotesHistory();
      setToastMessage("Note pin status updated");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 2500);

      setNoteActionsAnchor(null);
      onNotesHistoryUpdate?.();
      // 🔥 IMPORTANT
      fetchNotesHistory();

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
      fetchNotesHistory();
      onNotesHistoryUpdate?.()

    } catch (err) {
      console.error("Failed to delete note", err);
      appModal.showError("Failed to delete note");
    }
  };

  if (!isOpen || !contact) return null;

  const content = (
    <div className={`${asPage ? "w-full" : "w-[90%] max-w-6xl"} ${!asPage && "shadow-xl rounded-lg"} p-8`}>
      {/* Flex container for left & right */}
      <div className="flex flex-row gap-8">

        {/* LEFT SIDE (Edit Contact) */}
        <div className="w-1/2 bg-white rounded-lg p-6 shadow-sm">
          {/* Header */}
          <div className="mb-6 border-b border-gray-200 pb-4">
            <h1 className="text-xl font-bold text-gray-900">Edit contact</h1>
            <p className="text-sm text-gray-500 mt-1">Update contact information and details</p>
          </div>

          {/* Personal Info Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="space-y-5 p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
              {/* PERSONAL INFORMATION */}
              <div
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
                  <div>
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

                  <div>
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
              )}
              <div
                onClick={() => setExpandedCompanyInfo(!expandedCompanyInfo)}
                className="flex items-center justify-between cursor-pointer p-3 rounded hover:bg-gray-50 transition-colors"
                style={{ marginTop: 12, marginLeft: -12, marginRight: -12, marginBottom: 8, paddingLeft: 16, paddingRight: 273 }}
              >
                {/* COMPANY INFORMATION */}
                <h3 className="text-sm font-semibold text-[#3f9f42] mt-4">Company information</h3>
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
                  <div>
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
                  <div>
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
                  <div>
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
                  <div>
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
                  <div>
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
                  <div>
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
              )}

              {/* WEBSITE & SOCIAL */}
              <div
                onClick={() => setExpandedWebsiteSocial(!expandedWebsiteSocial)}
                className="flex items-center justify-between cursor-pointer p-3 rounded hover:bg-gray-50 transition-colors"
                style={{ marginTop: 12, marginLeft: -12, marginRight: -12, marginBottom: 8, paddingLeft: 16, paddingRight: 273 }}
              >
                <h3 className="text-sm font-semibold text-[#3f9f42] mt-4">Website & social</h3>
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
                  <div>
                    <label className={underlineLabel}>Website</label>
                    <input
                      type="text"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      placeholder="Website"
                      className={underlineInput}
                    />
                  </div>
                  <div>
                    <label className={underlineLabel}>LinkedIn URL</label>
                    <input
                      type="text"
                      name="linkedInUrl"
                      value={formData.linkedInUrl}
                      onChange={handleInputChange}
                      placeholder="LinkedIn URL"
                      className={underlineInput}
                    />
                  </div>
                  <div>
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
              )}

              {/* SAVE / CANCEL BUTTONS */}
              <div className="flex justify-start items-center gap-3 mt-6 pt-4 border-t border-gray-200 sticky bottom-0 bg-white z-10">
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
              </div>
            </div>
          </form>
        </div>

        {/* RIGHT SIDE (Email Campaigns, Pinned Notes, LinkedIn Summary) */}
        <div className="w-1/2 flex flex-col gap-6">
          {/* Email Campaigns */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="font-semibold mb-4">Email campaigns</h3>
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Sent" value={emailStats.sent} />

              <Stat
                label="Unique opens"
                value={emailStats.uniqueOpens}
                percentage={emailStats.uniqueOpensPct}
                color="#ff9800"
              />

              <Stat
                label="Unique clicks"
                value={emailStats.uniqueClicks}
                percentage={emailStats.uniqueClicksPct}
                color="#3f9f42"
              />
            </div>



            {/* Pinned Notes */}
            {/* PINNED NOTES – FIRST */}
            {pinnedNotes.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, }} > Pinned notes ({pinnedNotes.length}) </div>
                {pinnedNotes.map((note: any, index: number) => (
                  <div key={note.id} style={{ display: "flex", gap: 16, paddingBottom: index !== pinnedNotes.length - 1 ? 24 : 0, }} >
                    {/* Note content */}
                    <div style={{ flex: 1 }}>
                      <div style={{ background: "#fefcf9", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, position: "relative", }} >
                        <div style={{ fontSize: 13, color: "#666", marginBottom: 8 }}> {formatDateTimeIST(note.createdAt)} </div>
                        {/* 3-dot menu */}
                        <button onClick={(e) => {
                          e.stopPropagation(); setNoteActionsAnchor(noteActionsAnchor === note.id ? null : note.id);
                        }} style={{ position: "absolute", top: 12, right: 12, border: "none", background: "#ede9fe", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", }} >
                          <FontAwesomeIcon icon={faEllipsisV} />
                        </button>
                        {/* Action menu */}
                        {noteActionsAnchor === note.id && (
                          <div style={{ position: "absolute", right: 0, top: 48, background: "#fff", border: "1px solid #eee", borderRadius: 6, boxShadow: "0 2px 16px rgba(0,0,0,0.12)", zIndex: 101, minWidth: 160, }}
                            onClick={(e) => e.stopPropagation()} >
                            <button
                              onClick={() => {
                                onEditNote?.(note);
                                setNoteActionsAnchor(null);
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
                              onClick={() => onTogglePin?.(note.id)}
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
                              onClick={() => {
                                onDeleteNote?.(note.id);
                                setNoteActionsAnchor(null);
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
                        <div style={{ fontSize: 14 }}> {stripHtml(note.note)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* LinkedIn Summary */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200" style={{ height: "20%" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">LinkedIn summary</h3>
              <button
                type="button"
                onClick={() => setShowLinkedInSummaryPopup(true)}
                className="flex items-center gap-2 px-3 py-1  text-black rounded  transition-colors"
              >
                <FontAwesomeIcon icon={faEdit} width="16" height="16" />
              </button>
            </div>
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

        <div
          style={{
            position: "fixed",
            inset: 0,
            background: showLinkedInSummaryPopup ? "rgba(0,0,0,0.6)" : "transparent",
            zIndex: 100000,
            display: "flex",
            justifyContent: "flex-end",
            transition: "background 0.3s ease",
            pointerEvents: showLinkedInSummaryPopup ? "auto" : "none",
          }}
          onClick={() => setShowLinkedInSummaryPopup(false)}
        >
          <div
            style={{
              background: "#fff",
              padding: 24,
              width: "70%",
              maxWidth: 900,
              height: "90vh",
              boxShadow: "-4px 0 20px rgba(0,0,0,0.08)",
              transform: showLinkedInSummaryPopup
                ? "translateX(0)"
                : "translateX(110%)",
              transition: "transform 0.35s ease-in-out",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>LinkedIn Summary</h3>
              <button
                onClick={() => setShowLinkedInSummaryPopup(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 24,
                  cursor: "pointer",
                  color: "#666",
                }}
              >
                ✕
              </button>
            </div>

            {/* Formatting Toolbar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px",
                border: "1px solid #d1d5db",
                borderBottom: "none",
                // marginBottom: 12,
                flexWrap: "wrap",
                backgroundColor: "#f5f5f5",
                borderRadius: "4px 4px 0 0",
              }}
            >
              <select
                style={{
                  padding: "6px 10px",
                  border: "1px solid #d1d5db",
                  borderRadius: 4,
                  fontSize: 14,
                  cursor: "pointer",
                }}
                onChange={(e) => {
                  if (e.target.value) document.execCommand("formatBlock", false, `<${e.target.value}>`);
                }}
              >
                <option value="">Normal</option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
                <option value="p">Paragraph</option>
              </select>

              <button
                type="button"
                onClick={() => document.execCommand("bold", false)}
                style={{
                  padding: "6px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 4,
                  background: "#f9fafb",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
                title="Bold"
              >
                B
              </button>

              <button
                type="button"
                onClick={() => document.execCommand("italic", false)}
                style={{
                  padding: "6px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 4,
                  background: "#f9fafb",
                  cursor: "pointer",
                  fontStyle: "italic",
                }}
                title="Italic"
              >
                I
              </button>

              <button
                type="button"
                onClick={() => document.execCommand("underline", false)}
                style={{
                  padding: "6px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 4,
                  background: "#f9fafb",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
                title="Underline"
              >
                U
              </button>

              <button
                type="button"
                onClick={() => document.execCommand("strikethrough", false)}
                style={{
                  padding: "6px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 4,
                  background: "#f9fafb",
                  cursor: "pointer",
                  textDecoration: "line-through",
                }}
                title="Strikethrough"
              >
                S
              </button>

              <div style={{ width: 1, height: 24, background: "#e5e7eb", margin: "0 4px" }}></div>

              <button
                type="button"
                onClick={() => document.execCommand("insertUnorderedList", false)}
                style={{
                  padding: "6px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 4,
                  background: "#f9fafb",
                  cursor: "pointer",
                }}
                title="Bullet list"
              >
                •
              </button>

              <button
                type="button"
                onClick={() => document.execCommand("insertOrderedList", false)}
                style={{
                  padding: "6px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 4,
                  background: "#f9fafb",
                  cursor: "pointer",
                }}
                title="Numbered list"
              >
                1.
              </button>

              <button
                type="button"
                onClick={() => {
                  const url = prompt("Enter URL:");
                  if (url) document.execCommand("createLink", false, url);
                }}
                style={{
                  padding: "6px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 4,
                  background: "#f9fafb",
                  cursor: "pointer",
                }}
                title="Insert link"
              >
                🔗
              </button>

              <button
                type="button"
                onClick={() => {
                  const url = prompt("Enter image URL:");
                  if (url) document.execCommand("insertImage", false, url);
                }}
                style={{
                  padding: "6px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 4,
                  background: "#f9fafb",
                  cursor: "pointer",
                }}
                title="Insert image"
              >
                🖼️
              </button>
            </div>

            {/* Editable Content Area */}
            <div
              contentEditable
              style={{
                width: "100%",
                minHeight: "400px",
                padding: "12px",
                border: "1px solid #d1d5db",
                borderTop: "none",
                borderRadius: "0 0 4px 4px",
                outline: "none",
                fontSize: 14,
                lineHeight: 1.6,
              }}
              onBlur={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  linkedInUrl: (e.currentTarget as HTMLDivElement).innerHTML,
                }));
              }}
              suppressContentEditableWarning
            >
              {/* {formData.linkedInUrl || ""} */}
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setShowLinkedInSummaryPopup(false)}
                style={{
                  padding: "8px 16px",
                  background: "#3f9f42",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>

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
