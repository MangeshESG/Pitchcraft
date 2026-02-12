'use client';

import React, { useEffect, useRef, useState } from "react";
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
}

const ContactDetailView: React.FC = () => {
  const params = useParams<{ contactId: string }>();
  const contactId = params.contactId;
  const reduxUserId = useSelector((state: RootState) => state.auth.userId);

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
  const noteToolbar = {
    toolbar: [
      ["bold", "italic", "underline"],
      [{ align: [] }],
      [{ list: "bullet" }],
    ],
  };
  const [noteText, setNoteText] = useState("");
  const noteEditorRef = useRef<HTMLDivElement | null>(null);

  const plainTextLength = noteText.replace(/<[^>]+>/g, "").length;
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
  const toolbarBtnStyle: React.CSSProperties = {
    minWidth: 32,
    height: 32,
    padding: "0 10px",
    border: "1px solid #e5e7eb",
    borderRadius: 4,
    background: "#ffffff",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
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
    if (!contactId || !reduxUserId) return;

    setLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/Crm/contacts/List-by-CleinteId`,
        {
          params: {
            clientId: reduxUserId,
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
  }, [contactId, reduxUserId, dataFileId]);
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
    if (!reduxUserId || !contactId) {
      appModal.showError("Client or Contact not found");
      return;
    }

    if (!noteText || plainTextLength === 0) {
      appModal.showError("Note cannot be empty");
      return;
    }

    try {
      setIsSavingNote(true);

      if (isEditMode && editingNoteId) {
        // ✅ UPDATE NOTE
        await axios.post(
          `${API_BASE_URL}/api/notes/Update-Note`,
          null,
          {
            params: {
              NoteId: editingNoteId,
              clientId: reduxUserId,
              contactId: contactId,
              Note: noteText,
              IsPin: isPinned,
              IsUseInGenration: isEmailPersonalization,
            },
          }
        );
      } else {
        // ✅ ADD NOTE
        await axios.post(`${API_BASE_URL}/api/notes/Add-Note`, {
          clientId: reduxUserId,
          contactId: contactId,
          note: noteText,
          isPin: isPinned,
          isUseInGenration: isEmailPersonalization,
        });
      }

      // reset UI
      setIsNoteOpen(false);
      setNoteText("");
      setIsPinned(false);
      setIsEmailPersonalization(false);
      setIsEditMode(false);
      setEditingNoteId(null);

      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);

      fetchNotesHistory();
    } catch (error) {
      console.error("Save/Update note failed", error);
      appModal.showError("Failed to save note");
    } finally {
      setIsSavingNote(false);
    }
  };

  const fetchNotesHistory = async () => {
    if (!reduxUserId || !contactId) return;

    setIsLoadingNotes(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/notes/Get-All-Note`,
        {
          params: {
            clientId: reduxUserId,
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
    if (!reduxUserId || !contactId) return;

    try {
      setIsEditMode(true);
      setEditingNoteId(note.id);
      setNoteActionsAnchor(null);

      const res = await axios.get(
        `${API_BASE_URL}/api/notes/Get-Note-By-Id`,
        {
          params: {
            clientId: reduxUserId,
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
    if (!reduxUserId || !deleteContactId || !deletingNoteId) return;

    try {
      await axios.post(
        `${API_BASE_URL}/api/notes/Delete-Note`,
        null,
        {
          params: {
            clientId: reduxUserId,
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
  };

  const handleTogglePin = async (noteId: number) => {
    if (!reduxUserId || !contactId) return;

    try {
      // Get current note to find its current pin status
      const noteToToggle = notesHistory.find(n => n.id === noteId);
      if (!noteToToggle) return;

      const newPinStatus = !noteToToggle.isPin;

      // ✅ Make API call to update pin status on backend
      await axios.post(
        `${API_BASE_URL}/api/notes/Update-Note`,
        null,
        {
          params: {
            NoteId: noteId,
            clientId: reduxUserId,
            contactId: contactId,
            Note: noteToToggle.note,
            IsPin: newPinStatus,
            IsUseInGenration: noteToToggle.isUseInGenration,
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
  };
  const handleDeleteNoteClick = async (note: any) => {
    if (!reduxUserId || !contactId) return;

    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/notes/Get-Note-By-Id`,
        {
          params: {
            clientId: reduxUserId,
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
                  paddingRight: 180,
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

                          if (notesHistory.length === 0) {
                            fetchNotesHistory();
                          }
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
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 500,

                      //color: "#3f9f42",
                    }}
                  >
                    <FontAwesomeIcon icon={faEdit} style={{ color: "#3f9f42", cursor: "pointer", }} />
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
                                      style={{
                                        background: "#f3f4f6",
                                        padding: 12,
                                        borderRadius: 6,
                                        marginTop: 4,
                                        fontSize: 14,
                                        whiteSpace: "pre-wrap",
                                      }}
                                    >
                                      <div style={{ color: "#333" }}>
                                        {stripHtml(email.body) || "No email body available"}
                                      </div>
                                    </div>
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
                                              onClick={() => handleTogglePin(note.id)}
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
                                                handleDeleteNote(note.id);
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
                                          </div>
                                        )}

                                        <div style={{ fontSize: 14 }}>{stripHtml(note.note)}</div>
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
                                style={{
                                  background: "#f3f4f6",
                                  padding: 12,
                                  borderRadius: 6,
                                  marginBottom: 8,
                                  fontSize: 14,
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                <div style={{ color: "#333" }}>
                                  {stripHtml(email.body) || "No email body available"}
                                </div>
                              </div>
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
                                            onClick={() => handleTogglePin(note.id)}
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
                                              handleDeleteNote(note.id);
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
                                        </div>
                                      )}

                                      {/* NOTE CONTENT */}
                                      <div style={{ fontSize: 14 }}>
                                        {stripHtml(note.note)}
                                      </div>
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
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
                    Lists
                  </h3>

                  <p style={{ fontSize: 14, color: "#6b7280" }}>
                    This contact belongs to the following lists.
                  </p>

                  {/* Placeholder – replace with real list data */}
                  {/* <ul style={{ marginTop: 12, fontSize: 14 }}>
                    <li>• Startup Founders – India</li>
                    <li>• SaaS Leads – Q1</li>
                    <li>• Cold Outreach – LinkedIn</li>
                  </ul> */}
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
          width: 420,
          background: "#fff",
          boxShadow: "-4px 0 20px rgba(0,0,0,0.08)",
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
            background: "#d9fdd3",
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
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

        {/* BODY */}
        <div style={{ padding: 20, flex: 1 }}>
          {/* <ReactQuill
            value={noteText}
            onChange={setNoteText}
            modules={noteToolbar}
            placeholder="Take notes here..."
            style={{
              height: 220,
              marginBottom: 50,
              borderRadius: 8,
            }}
          /> */}
          {/* NOTE EDITOR */}
          {/* NOTE EDITOR */}
          <div
            style={{
              border: "1px solid #d1d5db",
              borderRadius: 6,
              marginBottom: 10,
            }}
          >
            {/* TOOLBAR */}
            <div
              style={{
                display: "flex",
                gap: 4,
                padding: 6,
                borderBottom: "1px solid #d1d5db",
                background: "#f9fafb",
              }}
            >
              <button type="button" style={toolbarBtnStyle} onClick={() => document.execCommand("bold")}>
                <b>B</b>
              </button>

              <button type="button" style={toolbarBtnStyle} onClick={() => document.execCommand("italic")}>
                <i>I</i>
              </button>

              <button type="button" style={toolbarBtnStyle} onClick={() => document.execCommand("underline")}>
                <u>U</u>
              </button>

              <button type="button" style={toolbarBtnStyle} onClick={() => document.execCommand("strikeThrough")}>
                <s>S</s>
              </button>

              <button type="button" style={toolbarBtnStyle} onClick={() => document.execCommand("insertUnorderedList")}>
                •
              </button>

              <button type="button" style={toolbarBtnStyle} onClick={() => document.execCommand("insertOrderedList")}>
                1
              </button>

              <button
                type="button"
                style={toolbarBtnStyle}
                onClick={() => {
                  const url = prompt("Enter link URL");
                  if (url) document.execCommand("createLink", false, url);
                }}
              >
                🔗
              </button>
            </div>

            {/* EDITABLE AREA */}
            <div
              ref={noteEditorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => setNoteText(e.currentTarget.innerHTML)}
              // dangerouslySetInnerHTML={{ __html: noteText }}
              dir="ltr"
              style={{
                minHeight: 220,
                padding: 12,
                outline: "none",
                fontSize: 14,
                whiteSpace: "normal",
                direction: "ltr",        // ← NEW
                textAlign: "left",
              }}
            />
          </div>




          <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
            {plainTextLength}/10000
          </div>

          {/* PIN */}
          <div className="flex items-start  gap-3 mt-4">
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
          <div className="flex items-start gap-3 mt-6">
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
            marginBottom: 50
          }}
        >
          <button
            onClick={() => setIsNoteOpen(false)}
            style={{
              border: "none",
              background: "transparent",
              color: "#6366f1",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <button
            onClick={saveNote}
            disabled={isSavingNote}
            style={{
              background: isSavingNote ? "#9ca3af" : "#3f9f42",
              color: "#fff",
              border: "none",
              padding: "8px 18px",
              borderRadius: 18,
              fontSize: 14,
              cursor: isSavingNote ? "not-allowed" : "pointer",
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

            {isSavingNote ? "Saving..." : "Save note"}
          </button>

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
            The note has been created with success!
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
  );
};

export default ContactDetailView;
