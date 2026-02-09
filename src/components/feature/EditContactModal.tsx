import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../config';
import { useSelector } from 'react-redux';
import { RootState } from '../../Redux/store';
import axios from 'axios';
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
  const menuBtnStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    textAlign: "left",
  };

  const Stat = ({ label, value }: { label: string; value: any }) => (
    <div
      className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center"
      style={{ minHeight: 110 }}
    >
      <div className="text-sm text-gray-500 mb-2 text-center">
        {label}
      </div>
      <div className="text-2xl leading-8 font-semibold text-gray-900 text-center">
        {value}
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
    const delivered = sent; // assuming always delivered

    let totalOpens = 0;
    let totalClicks = 0;

    const openedTrackingIds = new Set<string>();
    const clickedTrackingIds = new Set<string>();

    emailTimeline.forEach((email: any) => {
      email.events?.forEach((ev: any) => {
        if (ev.eventType === "Open") {
          totalOpens++;
          openedTrackingIds.add(email.trackingId);
        }

        if (ev.eventType === "Click") {
          totalClicks++;
          clickedTrackingIds.add(email.trackingId);
        }
      });
    });

    return {
      sent,
      delivered,

      // unique (used for %)
      hasOpened: openedTrackingIds.size > 0,
      hasClicked: clickedTrackingIds.size > 0,

      // totals (used for counts)
      totalOpens,
      totalClicks,
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

    setToastMessage("Note pin status updated");
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 2500);

    setNoteActionsAnchor(null);

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

  } catch (err) {
    console.error("Failed to delete note", err);
    appModal.showError("Failed to delete note");
  }
};

  if (!isOpen || !contact) return null;
  const content = (
    <div className={`${asPage ? "w-full" : "w-[45%] max-w-3xl"} ${!asPage && "shadow-xl rounded-lg"}`}>
      <div className={`${asPage ? "" : "bg-white rounded-lg"} p-8`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 mb-2">
          <div className="mb-8 pb-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Edit contact</h1>
            <p className="text-sm text-gray-500 mt-2">Update contact information and details</p>
          </div>
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 16,
              marginBottom: 32,
              boxShadow: "none",
              height: "fit-content",
              border: "1px solid #e5e7eb",
              // marginLeft:"-101px",
            }}
          >
            <h3 style={{ marginBottom: 16, fontWeight: 600 }}>
              Email campaigns
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 16,
              }}
            >
              <Stat label="Sent" value={emailStats.sent} />

              <Stat
                label="Unique opens"
                value={`${emailStats.hasOpened ? "100%" : "0%"} (${emailStats.totalOpens})`}
              />

              <Stat
                label="Unique clicks"
                value={`${emailStats.hasClicked ? "100%" : "0%"} (${emailStats.totalClicks})`}
              />

            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 mb-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* PERSONAL INFORMATION */}
            {/* <div>
            <h2 className={sectionTitleStyle}>Personal Information</h2>
            <div className="space-y-4">
              <div>
                <label className={labelStyle}>
                  Full name <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName || ""}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter full name"
                  className={inputStyle}
                />
              </div>

              <div>
                <label className={labelStyle}>
                  Email <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ""}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter email address"
                  className={inputStyle}
                />
              </div>
            </div>
          </div> */}
            {/* PERSONAL INFORMATION */}
            <div>
              {/* <h2 className={sectionTitleStyle}>Personal Information</h2> */}

              <div className={infoCard}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">PERSONAL INFORMATION</h3>
                  {/* <button className="text-gray-400 hover:text-gray-600">⚙</button> */}
                </div>

                <div className="space-y-5">
                  {/* FULL NAME */}
                  <div>
                    <label className={underlineLabel}>Full name</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className={underlineInput}
                    />
                  </div>

                  {/* EMAIL */}
                  <div>
                    <label className={underlineLabel}>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={underlineInput}
                      placeholder='Email'
                    />
                  </div>

                  <h3 className="text-sm font-semibold text-gray-900">COMPANY INFORMATION</h3>
                  {/* SMS */}
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
                      className={underlineInput}
                      placeholder='Company name'
                    />
                  </div>
                  <div>
                    <label className={underlineLabel}>Company industry</label>
                    <input
                      type="text"
                      name="companyIndustry"
                      value={formData.companyIndustry}
                      onChange={handleInputChange}
                      className={underlineInput}
                      placeholder='Company industry'
                    />
                  </div>

                  <div>
                    <label className={underlineLabel}>Company employee count</label>
                    <input
                      type="text"
                      name="companyEmployeeCount"
                      value={formData.companyEmployeeCount}
                      onChange={handleInputChange}
                      className={underlineInput}
                      placeholder='Company employee count'
                    />
                  </div>
                  <div>
                    <label className={underlineLabel}>Company telephone</label>
                    <input
                      type="text"
                      name="companyTelephone"
                      value={formData.companyTelephone}
                      onChange={handleInputChange}
                      className={underlineInput}
                      placeholder='Company telephone'
                    />
                  </div>
                  <div>
                    <label className={underlineLabel}>Country/address</label>
                    <input
                      type="text"
                      name="countryOrAddress"
                      value={formData.countryOrAddress}
                      onChange={handleInputChange}
                      className={underlineInput}
                      placeholder='Country/address'
                    />
                  </div>

                  <h3 className="text-sm font-semibold text-gray-900">WEBSITE & SOCIAL</h3>
                  <div>
                    <label className={underlineLabel}>Website</label>
                    <input
                      type="text"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      className={underlineInput}
                      placeholder='Website'
                    />
                  </div>
                  <div>
                    <label className={underlineLabel}>LinkedIn URL</label>
                    <input
                      type="text"
                      name="linkedInUrl"
                      value={formData.linkedInUrl}
                      onChange={handleInputChange}
                      className={underlineInput}
                      placeholder='LinkedIn URL'
                    />
                  </div>
                  <div>
                    <label className={underlineLabel}>Company LinkedIn URL</label>
                    <input
                      type="text"
                      name="companyLinkedInURL"
                      value={formData.companyLinkedInURL}
                      onChange={handleInputChange}
                      className={underlineInput}
                      placeholder='Company LinkedIn URL'
                    />
                  </div>
                </div>

                {/* BUTTONS */}
                <div className="flex justify-start items-center gap-3 mt-6 pt-4" style={{
                  position: "sticky",
                  bottom: 0,
                  background: "#fff",
                  paddingBottom: 8,
                  zIndex: 10,
                  borderTop: "1px solid #e5e7eb",
                }}>
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
                  > {isSubmitting ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>


            {/* <div className={dividerStyle} /> */}

            {/* PROFESSIONAL INFORMATION */}
            {/* <div>
            <h2 className={sectionTitleStyle}>Company Information</h2>
            <div className="space-y-5">
              <div className="space-y-4">
                <div>
                  <label className={labelStyle}>Job title</label>
                  <input
                    type="text"
                    name="jobTitle"
                    value={formData.jobTitle || ""}
                    onChange={handleInputChange}
                    placeholder="e.g., Software Developer"
                    className={inputStyle}
                  />
                </div>

                <div>
                  <label className={labelStyle}>Company name</label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName || ""}
                    onChange={handleInputChange}
                    placeholder="Enter company name"
                    className={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelStyle}>Company industry</label>
                  <input
                    type="text"
                    name="companyIndustry"
                    value={formData.companyIndustry || ""}
                    onChange={handleInputChange}
                    className={inputStyle}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={labelStyle}>Company employee count</label>
                  <input
                    type="text"
                    name="companyEmployeeCount"
                    value={formData.companyEmployeeCount || ""}
                    onChange={handleInputChange}
                    placeholder="e.g., 50-100"
                    className={inputStyle}
                  />
                </div>
               
                <div>
                  <label className={labelStyle}>Company telephone</label>
                  <input
                    type="text"
                    name="companyTelephone"
                    value={formData.companyTelephone || ""}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                    className={inputStyle}
                  />
                </div>

                <div>
                  <label className={labelStyle}>Country/address</label>
                  <input
                    type="text"
                    name="countryOrAddress"
                    value={formData.countryOrAddress || ""}
                    onChange={handleInputChange}
                    placeholder="Enter location"
                    className={inputStyle}
                  />
                </div>
              </div>
            </div>
          </div> */}

            {/* <div className={dividerStyle} />

          
          <div>
            <h2 className={sectionTitleStyle}>Website & Social</h2>
            
            <div className="space-y-4">
              <div>
                <label className={labelStyle}>Website</label>
                <input
                  type="text"
                  name="website"
                  value={formData.website || ""}
                  onChange={handleInputChange}
                  placeholder="https://example.com"
                  className={inputStyle}
                />
              </div>

              <div>
                <label className={labelStyle}>LinkedIn URL</label>
                <input
                  type="text"
                  name="linkedInUrl"
                  value={formData.linkedInUrl || ""}
                  onChange={handleInputChange}
                  placeholder="https://linkedin.com/in/..."
                  className={inputStyle}
                />
              </div>
              <div>
                <label className={labelStyle}>Company LinkedIn URL</label>
                <input
                  type="text"
                  name="companyLinkedInURL"
                  value={formData.companyLinkedInURL || ""}
                  onChange={handleInputChange}
                  placeholder="https://linkedin.com/company/..."
                  className={inputStyle}
                />
              </div>
            </div>
           
          </div> */}
            {/* 
            <div className={dividerStyle} /> */}
            {/* NOTES */}
            {/* <div>
              <h2 className={sectionTitleStyle}>Additional Information</h2>
              <label className={labelStyle}>Notes</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { console.log("Expand notes clicked"); setShowNotesPopup(true) }}
                  title="Expand notes"
                  className="absolute top-3.5 right-3.5 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors z-10 p-1.5 text-gray-600"
                >
                  ⤢
                </button>

                <textarea
                  name="notes"
                  value={formData.notes || ""}
                  onChange={handleInputChange}
                  rows={6}
                  placeholder="Add internal notes about this contact"
                  className={`${wideInputStyle} resize-none py-2.5`}
                />
              </div>
            </div> */}

            {/* <div className={dividerStyle} /> */}
            {/* EMAIL CONTENT */}
            {/* <div>
              <h2 className={sectionTitleStyle}>Email Content</h2>
              <div className="space-y-5"> */}
            {/* <div>
                <label className={labelStyle}>Email subject</label>
                <input
                  type="text"
                  name="emailSubject"
                  value={formData.emailSubject || ""}
                  onChange={handleInputChange}
                  placeholder="Enter email subject"
                  className={wideInputStyle}
                  style={{ width: "70%" }}
                />
              </div> */}

            {/* <div>
                  <label className={labelStyle}>Email body</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmailBodyPopup(true)}
                      title="Expand email body in fullscreen"
                      className="absolute top-3.5 right-3.5 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors z-10 p-1.5 text-gray-600"
                    >
                      ⤢
                    </button>
                    <textarea
                      name="emailBody"
                      value={formData.emailBody || ""}
                      onChange={handleInputChange}
                      rows={8}
                      placeholder="Enter email body"
                      className={`${wideInputStyle} resize-none h-auto py-2.5`}
                    />
                  </div>
                </div> */}
            {/* </div> */}
            {/* </div> */}

            {/* <div className={dividerStyle} /> */}
            {/* Buttons for form submission */}
            {/* <div className="sticky bottom-0 bg-white border-t border-gray-200 mt-10 pt-4 flex justify-end gap-4">
              <button
                type="button"
                className="px-6 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.fullName?.trim() || !formData.email?.trim()}
                className="px-6 py-2 rounded-md bg-black text-white hover:bg-gray-900 disabled:bg-gray-300"
              >
                {isSubmitting ? "Updating..." : "Update contact"}
              </button>
            </div> */}
          </form>
          <div className="flex flex-col gap-6">
            <div
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: 16,
                marginBottom: 32,
                boxShadow: "none",
                // height: "20%",
                border: "1px solid #e5e7eb",
              }}
            >
              {/* PINNED NOTES – FIRST */}
              {pinnedNotes.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      marginBottom: 12,
                    }}
                  >
                    Pinned notes ({pinnedNotes.length})
                  </div>

                  {pinnedNotes.map((note: any, index: number) => (
                    <div
                      key={note.id}
                      style={{
                        display: "flex",
                        gap: 16,
                        paddingBottom: index !== pinnedNotes.length - 1 ? 24 : 0,
                      }}
                    >
                      {/* Note content */}
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            background: "#fefcf9",
                            border: "1px solid #e5e7eb",
                            borderRadius: 12,
                            padding: 16,
                            position: "relative",
                          }}
                        >
                          <div style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
                            {formatDateTimeIST(note.createdAt)}
                          </div>
                          {/* 3-dot menu */}
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

                          {/* Action menu */}
                          {noteActionsAnchor === note.id && (
                            <div
                              style={{
                                position: "absolute",
                                right: 0,
                                top: 48,
                                background: "#fff",
                                border: "1px solid #eee",
                                borderRadius: 6,
                                boxShadow: "0 2px 16px rgba(0,0,0,0.12)",
                                zIndex: 101,
                                minWidth: 160,
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  handleEditNote(note);
                                  setNoteActionsAnchor(null);
                                }}
                                style={menuBtnStyle}
                                className="flex gap-2 items-center"
                              >
                                <span>
                                  {/* same EDIT svg */}
                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none">
                                    <path
                                      d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V12"
                                      stroke="#000"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                    <path
                                      d="M16.5 3.5a2.12 2.12 0 0 1 3 3L12 14l-4 1 1-4 7.5-7.5z"
                                      stroke="#000"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </span>
                                <span className="font-[600]">Edit</span>
                              </button>

                              {/* 📌 PIN / UNPIN */}
                              <button
                                onClick={() => handleTogglePin(note.id)}
                                style={menuBtnStyle}
                                className="flex gap-2 items-center"
                              >
                                <span>
                                  <FontAwesomeIcon
                                    icon={faThumbtack}
                                    style={{
                                      transform: note.isPin ? "rotate(45deg)" : "none",
                                    }}
                                  />
                                </span>
                                <span className="font-[600]">
                                  {note.isPin ? "Unpin" : "Pin"}
                                </span>
                              </button>

                              {/* 🗑️ DELETE */}
                              <button
                                onClick={confirmDeleteNote}
                                style={menuBtnStyle}
                                className="flex gap-2 items-center text-red-600"
                              >
                                <span>
                                  {/* same DELETE svg */}
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="22px" height="22px">
                                    <path d="M 21 2 C 19.354545 2 18 3.3545455 18 5 L 18 7 L 8 7
                                                A 1.0001 1.0001 0 1 0 8 9 L 9 9 L 9 45 C 9 46.654 10.346 48
                                                12 48 L 38 48 C 39.654 48 41 46.654 41 45 L 41 9 L 42 9
                                                A 1.0001 1.0001 0 1 0 42 7 L 32 7 L 32 5 C 32 3.3545455
                                              30.645455 2 29 2 Z" />
                                  </svg>
                                </span>
                                <span className="font-[600]">Delete</span>
                              </button>
                            </div>
                          )}

                          {/* NOTE TEXT — ✅ NO <p> TAG */}
                          <div style={{ fontSize: 14 }}>
                            {stripHtml(note.note)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* linkdin  SUMMARY */}
            <div
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: 16,
                marginBottom: 32,
                boxShadow: "none",
                height: "20%",
                border: "1px solid #e5e7eb",
              }}
            >
              <h3 style={{ marginBottom: 16, fontWeight: 600 }}>
                LinkedIn  information
              </h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

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
