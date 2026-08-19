'use client';

import React, { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "../../../config";
import { RootState } from "../../../Redux/store";
import { useSelector, useDispatch } from "react-redux";
import { openPanel, closePanel } from "../../../slices/panelSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAngleRight,
  faBars,
  faBullhorn,
  faEllipsisV,
  faEnvelope,
  faEnvelopeOpen,
  faFileAlt,
  faGear,
  faList,
  faPaperclip,
  faDownload,
  faReply,
  faPen,
  faShare,
} from "@fortawesome/free-solid-svg-icons";
import { faEdit, faTrashAlt, faSquarePlus } from "@fortawesome/free-regular-svg-icons";
import EditContactModal from "./EditContactModal";
import { useAppModal } from "../../../hooks/useAppModal";
import pitchLogo from "../../../assets/images/pitch_logo.png";
import "react-quill/dist/quill.snow.css";
import emailPersonalizationIcon from "../../../assets/images/emailPersonal.png";
import RichTextEditor from '../../common/RTEEditor';
import { extractGenerationInsights } from '../../../utils/generationInsights';
import LoadingSpinner from '../../common/LoadingSpinner';
import CreditCheckModal from "../../common/CreditCheckModal";
import Modal from "../../common/Modal";
import { useCreditCheck } from "../../../hooks/useCreditCheck";

import{formatDateTimeLocal, formatTimeLocal}from "../../common/dateFormatters";
import { Pin, PinOff, Linkedin } from 'lucide-react';

import CommonSidePanel from '../../common/CommonSidePanel';
import { defaultButtonStyle } from "../../../styles/buttonStyles";
import ContactQA from "./ContactQA";
import ContactComposeEmailPopup, { RecipientChipInput, mergeRecipients, parseRecipientInput } from "./ContactComposeEmailPopup";
import ContactEmailsTab from "./ContactEmailsTab";
import { pinEmail } from "../inbox/inboxPin";
import EmailIframe from "../inbox/EmailIframe";
import { repairAndParseJsonObject } from "../../../utils/jsonRepair";
import { saveUserCredit } from "../../../slices/authSLice";
import "../inbox/InboxView.css";
import { copyToClipboard } from "../../../utils/utils";

const PITCH_GENERATION_API_BASE_URL = "https://playground.esuk.co.uk";
//const PITCH_GENERATION_API_BASE_URL = "https://localhost:7216";

interface Contact {
  id: number;
  first_name?: string;
  last_name?: string;
  full_name?: string;
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
  web_search_data?: string | null;
}

interface ContactDetailViewProps {
  embedded?: boolean;
}

interface ContactReplyBlueprint {
  id: number;
  templateName: string;
}

interface ContactSmtpUser {
  id?: number;
  outboxId?: number;
  OutboxId?: number;
  inboxId?: number;
  InboxId?: number;
  inboxid?: number;
  username?: string;
  emailAddress?: string;
  fromEmail?: string;
  email?: string;
  provider?: string;
  Provider?: string;
  type?: string;
  smtpType?: string;
}

const ResearchCards: React.FC<{ content: string }> = ({ content }) => {
  const data = repairAndParseJsonObject(content);
  if (!data) {
    return <pre style={{ fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word", padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e8eaee" }}>{content}</pre>;
  }

  const cardStyle: React.CSSProperties = { background: "#fff", borderRadius: 12, border: "1px solid #e8eaee", padding: "14px 16px" };
  const iconMap: Record<string, string> = {
    company_overview: "🏢", key_findings: "💡", recent_news: "📰",
    event_insights: "🗓", personalization_angle: "✉️", summary: "📋",
    insights: "🔍", news: "📰", findings: "💡",
  };
  const getIcon = (k: string) => iconMap[k] || iconMap[Object.keys(iconMap).find(ik => k.includes(ik)) || ""] || "📌";
  const fmtKey = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  const renderVal = (value: any): React.ReactNode => {
    if (value == null) return null;
    if (typeof value !== "object") return <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{String(value)}</p>;
    if (Array.isArray(value)) {
      if (!value.length) return null;
      if (typeof value[0] !== "object") return (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
          {value.map((item, i) => (
            <li key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
              <span style={{ color: "#22c55e", flexShrink: 0 }}>✔</span>{String(item)}
            </li>
          ))}
        </ul>
      );
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {value.map((item: Record<string, any>, i) => {
            const entries = Object.entries(item).filter(([, v]) => v != null && String(v).trim());
            const dateE = entries.find(([k]) => /^(date|time|published|when)$/i.test(k));
            const rest = entries.filter(([k]) => !/^(date|time|published|when)$/i.test(k));
            if (dateE && rest.length) return (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ fontSize: 11, color: "#6b7280", whiteSpace: "nowrap", minWidth: 70, marginTop: 2 }}>{String(dateE[1])}</span>
                <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}><span style={{ color: "#3f9f42", marginRight: 6 }}>◆</span>{rest.map(([, v]) => String(v)).join(" — ")}</span>
              </div>
            );
            return <div key={i} style={{ padding: "8px 10px", background: "#f8fafc", borderRadius: 8, border: "1px solid #f1f5f9" }}>
              {entries.map(([k, v]) => <div key={k} style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}><span style={{ fontWeight: 500 }}>{fmtKey(k)}: </span>{String(v)}</div>)}
            </div>;
          })}
        </div>
      );
    }
    const entries = Object.entries(value).filter(([, v]) => v != null && String(v).trim());
    const descE = entries.find(([k]) => /description|summary|overview|about/i.test(k));
    const rest = entries.filter(([k]) => !/description|summary|overview|about/i.test(k));
    const useBadges = !rest.some(([, v]) => String(v).length > 35);
    return (
      <div>
        {descE && <p style={{ fontSize: 13, color: "#374151", marginBottom: 10, lineHeight: 1.55, marginTop: 0 }}>{String(descE[1])}</p>}
        {rest.length > 0 && (useBadges
          ? <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{rest.map(([k, v]) => {
            const sv = String(v); const isUrl = /^https?:\/\//i.test(sv) || /website|url|link/i.test(k);
            return isUrl
              ? <a key={k} href={/^https?:\/\//i.test(sv) ? sv : `https://${sv}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, background: "#f0fdf4", padding: "3px 10px", borderRadius: 99, border: "1px solid #bbf7d0", color: "#15803d", textDecoration: "none", whiteSpace: "nowrap" }}>🔗 {sv}</a>
              : <span key={k} style={{ fontSize: 11.5, background: "#f1f5f9", padding: "3px 10px", borderRadius: 99, border: "1px solid #e2e8f0", color: "#374151", whiteSpace: "nowrap" }}><span style={{ color: "#6b7280" }}>{fmtKey(k)}: </span>{sv}</span>;
          })}</div>
          : <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>{rest.map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: 8, fontSize: 13, alignItems: "flex-start" }}>
              <span style={{ fontWeight: 500, flexShrink: 0, color: "#6b7280", minWidth: 80 }}>{fmtKey(k)}:</span>
              <span style={{ color: "#374151", lineHeight: 1.5 }}>{String(v)}</span>
            </div>
          ))}</div>
        )}
      </div>
    );
  };

  const entries = Object.entries(data).filter(([, v]) => v != null && !(typeof v === "string" && !v.trim()) && !(Array.isArray(v) && !v.length));
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {entries.map(([key, value]) => {
          const isFullWidth = typeof value === "string";
          return (
            <div key={key} style={{ ...cardStyle, ...(isFullWidth ? { gridColumn: "1 / -1", background: "#f8fafc", borderColor: "#e2e8f0" } : {}) }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>{getIcon(key)}</span>
                <span style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{fmtKey(key)}</span>
              </div>
              {renderVal(value)}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12, padding: "7px 14px", background: "#f8fafc", borderRadius: 8, fontSize: 11.5, color: "#6b7280", textAlign: "center", border: "1px solid #e8eaee" }}>
        ✦ Insights gathered from public web sources to help personalize outreach.
      </div>
    </div>
  );
};

const ContactDetailView: React.FC<ContactDetailViewProps> = ({
  embedded = false,
}) => {
  const params = useParams<{ contactId: string }>();
  const contactId = params.contactId;

  const [contact, setContact] = useState<any>(null);
  const [searchParams] = useSearchParams();
    const dataFileId =
      searchParams.get("dataFileId") ||
      searchParams.get("dataFieldId") ||
      searchParams.get("dataField");
    const segmentId = searchParams.get("segmentId");

  const [activeTab, setActiveTab] = useState<"profile" | "history" | "lists" | "qa" | "emails" | "insights">("profile");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailTimeline, setEmailTimeline] = useState<any[]>([]);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [emailActionsAnchor, setEmailActionsAnchor] = useState<string | null>(null);
  const [emailToDelete, setEmailToDelete] = useState<any | null>(null);
  const [showEmailDeleteModal, setShowEmailDeleteModal] = useState(false);
  const [pendingEmailDeleteMode, setPendingEmailDeleteMode] = useState<"soft" | "Permanent">("soft");
  const [isDeletingEmail, setIsDeletingEmail] = useState(false);
  const [pinningEmailId, setPinningEmailId] = useState<string | null>(null);
  const [detailContacts, setDetailContacts] = useState<Contact[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isRefreshingContactEmails, setIsRefreshingContactEmails] = useState(false);
  const [contactMailTab, setContactMailTab] = useState<"allmessages" | "sent">("allmessages");
  const [selectedContactThread, setSelectedContactThread] = useState<any | null>(null);
  const [contactCollapsedEmails, setContactCollapsedEmails] = useState<{ [key: string]: boolean }>({});
  const [expandedContactMessageHeaders, setExpandedContactMessageHeaders] = useState<{ [key: string]: boolean }>({});
  const [contactReplyText, setContactReplyText] = useState("");
  const [contactReplyTrailHtml, setContactReplyTrailHtml] = useState("");
  const [contactReplyCcEmails, setContactReplyCcEmails] = useState<string[]>([]);
  const [contactReplyCcDraft, setContactReplyCcDraft] = useState("");
  const [contactReplyBccEmails, setContactReplyBccEmails] = useState<string[]>([]);
  const [contactReplyBccDraft, setContactReplyBccDraft] = useState("");
  const [showContactReplyCc, setShowContactReplyCc] = useState(false);
  const [showContactReplyBcc, setShowContactReplyBcc] = useState(false);
  const [contactReplyAttachments, setContactReplyAttachments] = useState<File[]>([]);
  const [isComposePopupOpen, setIsComposePopupOpen] = useState(false);
  const [composeSmtpUsers, setComposeSmtpUsers] = useState<ContactSmtpUser[]>([]);
  const [selectedComposeSmtpUser, setSelectedComposeSmtpUser] = useState("");
  const [composeSignatureHtml, setComposeSignatureHtml] = useState("");
  const [isLoadingComposeSignature, setIsLoadingComposeSignature] = useState(false);
  const [isSendingComposeEmail, setIsSendingComposeEmail] = useState(false);
  const [showContactReplySection, setShowContactReplySection] = useState(false);
  const [isSendingContactReply, setIsSendingContactReply] = useState(false);
  const [contactReplyBlueprints, setContactReplyBlueprints] = useState<ContactReplyBlueprint[]>([]);
  const sortedComposeBlueprints = useMemo(
    () => [...contactReplyBlueprints].sort((a, b) =>
      (a.templateName || "").localeCompare(b.templateName || "", undefined, { sensitivity: "base" })
    ),
    [contactReplyBlueprints]
  );
  const sortedComposeFromOptions = useMemo(
    () => [...composeSmtpUsers].sort((a, b) => {
      const getLabel = (option: ContactSmtpUser) =>
        option.username || option.emailAddress || option.fromEmail || option.email || "";
      return getLabel(a).localeCompare(getLabel(b), undefined, { sensitivity: "base" });
    }),
    [composeSmtpUsers]
  );
  const [selectedContactReplyBlueprint, setSelectedContactReplyBlueprint] = useState<number | null>(null);
  const [isKraftingContactReply, setIsKraftingContactReply] = useState(false);
  const [isCopyContactReplyText, setIsCopyContactReplyText] = useState(false);
  const [openContactReplyDeviceDropdown, setOpenContactReplyDeviceDropdown] = useState(false);
  const [contactReplyEmailWidth, setContactReplyEmailWidth] = useState<string>("");
  const [isSavingContactReplyDraft, setIsSavingContactReplyDraft] = useState(false);
  const [isContactReplyExpanded, setIsContactReplyExpanded] = useState(false);
  const [showContactForwardSection, setShowContactForwardSection] = useState(false);
  const [contactForwardEmail, setContactForwardEmail] = useState("");
  const [contactForwardDraft, setContactForwardDraft] = useState("");
  const [contactForwardCcEmails, setContactForwardCcEmails] = useState<string[]>([]);
  const [contactForwardCcDraft, setContactForwardCcDraft] = useState("");
  const [contactForwardBccEmails, setContactForwardBccEmails] = useState<string[]>([]);
  const [contactForwardBccDraft, setContactForwardBccDraft] = useState("");
  const [contactForwardMessage, setContactForwardMessage] = useState("");
  const [showContactForwardBcc, setShowContactForwardBcc] = useState(false);
  const [showContactForwardCc, setShowContactForwardCc] = useState(false);
  const [isForwardingContactEmail, setIsForwardingContactEmail] = useState(false);
  const [contactForwardEmailWidth, setContactForwardEmailWidth] = useState<string>("");
  const [openContactForwardDeviceDropdown, setOpenContactForwardDeviceDropdown] = useState(false);
  const [isContactForwardExpanded, setIsContactForwardExpanded] = useState(false);
  const contactReplyKraftInFlightRef = useRef(false);
  const contactMailDetailRef = useRef<HTMLDivElement | null>(null);
  // Insights captured from the last kraft, surfaced through the editor's
  // action bar (same as the Inbox reply/forward editors).
  const [kraftFinalPrompt, setKraftFinalPrompt] = useState("");
  const [kraftWebSearchData, setKraftWebSearchData] = useState("");
  const [kraftEmails, setKraftEmails] = useState("");
  const [kraftNotes, setKraftNotes] = useState("");
  const [kraftProfessionalSummary, setKraftProfessionalSummary] = useState("");

  const captureKraftInsights = (responseData: any) => {
    const insights = extractGenerationInsights(responseData);
    setKraftFinalPrompt(insights.finalPrompt);
    setKraftWebSearchData(insights.webSearchData);
    setKraftEmails(insights.emails);
    setKraftNotes(insights.notes);
    setKraftProfessionalSummary(insights.professionalSummary);
  };

  useEffect(() => {
    if (!showContactReplySection && !showContactForwardSection) return;

    const scrollToComposer = () => {
      const el = contactMailDetailRef.current;
      if (el) {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      }
    };

    requestAnimationFrame(() => {
      scrollToComposer();
      window.setTimeout(scrollToComposer, 120);
    });
  }, [showContactReplySection, showContactForwardSection, selectedContactThread?.trackingId]);

  const appModal = useAppModal();
  const {
    credits,
    showCreditModal,
    checkUserCredits,
    closeCreditModal,
    handleSkipModal,
  } = useCreditCheck();
  const [forceShowCreditModal, setForceShowCreditModal] = useState(false);
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
  const [historyFilter, setHistoryFilter] = useState<"all" | "notes" | "emails" | "attachments" | "linkedin">("all");
  const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: 600,
    color: "#374151",
    marginBottom: 6,
  };
  const primarySoftButtonStyle: React.CSSProperties = {
    background: "#e2f1e3",
    color: "#3f9f42",
    border: "1px solid #cfecd6",
  };
  const secondaryButtonStyle: React.CSSProperties = {
    background: "#f8fafc",
    color: "#374151",
    border: "1px solid #d1d5db",
  };
  const navigate = useNavigate();
  const handleCreditModalTabChange = (nextTab: string) => {
    if (nextTab === "MyPlan") {
      sessionStorage.setItem("forceMyPlanRedirect", "true");
      const appBaseUrl = window.location.href.split("#")[0];
      window.location.href = `${appBaseUrl}#/main?tab=MyPlan`;
      return;
    }

    if (embedded) {
      navigate(`/main?tab=${nextTab}`);
      return;
    }

    setTab(nextTab);
  };
  // const [isNoteOpen, setIsNoteOpen] = useState(false);
  const dispatch = useDispatch();
  const activePanel = useSelector((state: RootState) => state.panel.activePanel);
  const showNotePanel = activePanel === "note";
  const showAttachmentPanel = activePanel === "attachment";
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
const menuIconStyle = {
  width: 22,
  height: 22,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const menuItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  width: "100%",
  padding: "10px 16px",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontSize: 15,
  fontWeight: 600,
};
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
  const [isSavingLinkedIn, setIsSavingLinkedIn] = useState(false);
 const [showErrorToast, setShowErrorToast] = useState(false);
  // const [isAttachmentPanelOpen, setIsAttachmentPanelOpen] = useState(false);
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentDescription, setAttachmentDescription] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [attachmentsHistory, setAttachmentsHistory] = useState<any[]>([]);
  const [linkedInMessages, setLinkedInMessages] = useState<any[]>([]);
  const [isLoadingLinkedIn, setIsLoadingLinkedIn] = useState(false);
  const [expandedLinkedInId, setExpandedLinkedInId] = useState<string | null>(null);


const NOTE_MAX_LENGTH = 10000;
const MAX_TOTAL_NOTES = 60000;
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
    if (!showNotePanel) return;
    if (plainTextLength > NOTE_MAX_LENGTH) {
      setToastMessage("Single note cannot exceed 10,000 characters.");
      setShowErrorToast(true);

      const timer = setTimeout(() => {
        setShowErrorToast(false);
      }, 3000);

      return () => clearTimeout(timer);
    } else if (projectedTotalLength > MAX_TOTAL_NOTES) {
      setToastMessage("Total notes limit exceeded (Maximum 60,000 characters allowed per contact).");
      setShowErrorToast(true);

      const timer = setTimeout(() => {
        setShowErrorToast(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [plainTextLength, projectedTotalLength, isEditMode, editingNoteId, notesHistory, showNotePanel]);
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
  const [isBlueprintLoading, setIsBlueprintLoading] = useState(false);

  // Campaign-driven web-search insights generation (mirrors MainPage flow)
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

const reduxUserId = useSelector((state: RootState) => state.auth.userId);

const effectiveUserId = useMemo(() => {
  const storedClientId =
    searchParams.get("clientId") ||
    localStorage.getItem("selectedClientId") ||
    sessionStorage.getItem("selectedClientId");

  if (storedClientId && storedClientId !== "" && storedClientId !== "null") {
    return Number(storedClientId);
  }

  return Number(reduxUserId);
}, [reduxUserId, searchParams]);

const token = sessionStorage.getItem("token");

useEffect(() => {
  const lastFrom = localStorage.getItem("lastFrom");
  if (lastFrom) setSelectedComposeSmtpUser(lastFrom);
}, []);

useEffect(() => {
  if (!effectiveUserId) return;

  const fetchContactReplyBlueprints = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/CampaignPrompt/templates/${effectiveUserId}?pageSize=20&pageNumber=1`,
        {
          headers: {
            accept: "*/*",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      const templates = Array.isArray(response.data?.templates) ? response.data.templates : [];
      setContactReplyBlueprints(templates);
    } catch (error) {
      console.error("Failed to fetch reply blueprints:", error);
    }
  };

  fetchContactReplyBlueprints();
}, [effectiveUserId, token]);

useEffect(() => {
  if (!effectiveUserId) return;

  const fetchComposeSmtpUsers = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/email/get-Outboxs?clientId=${effectiveUserId}`,
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      const users = Array.isArray(response.data?.data) ? response.data.data : [];
      setComposeSmtpUsers(users);
      if (users.length === 1) {
        const onlyUserId = users[0]?.id ?? users[0]?.outboxId ?? users[0]?.OutboxId;
        if (onlyUserId !== undefined && onlyUserId !== null) {
          setSelectedComposeSmtpUser((current) => current || String(onlyUserId));
        }
      }
    } catch (error) {
      console.error("Failed to fetch compose SMTP users:", error);
    }
  };

  fetchComposeSmtpUsers();
}, [effectiveUserId, token]);

useEffect(() => {
  if (selectedComposeSmtpUser) {
    localStorage.setItem("lastFrom", selectedComposeSmtpUser);
  }
}, [selectedComposeSmtpUser]);

const canGenerateFromCreditResponse = (creditResponse: any) => {
  if (typeof creditResponse === "number") {
    return creditResponse > 0;
  }

  if (!creditResponse || typeof creditResponse !== "object") {
    return false;
  }

  if (creditResponse.monthlyLimitExceeded || creditResponse.canGenerate === false) {
    return false;
  }

  const creditValue = [
    creditResponse.total,
    creditResponse.credits,
    creditResponse.credit,
    creditResponse.remainingCredits,
    creditResponse.remainingCredit,
    creditResponse.remaining,
    creditResponse.balance,
  ].find((value) => value !== undefined && value !== null && !Number.isNaN(Number(value)));

  if (creditValue !== undefined) {
    return Number(creditValue) > 0;
  }

  return creditResponse.canGenerate === true;
};

const refreshCreditsAfterDeduction = async () => {
  try {
    const userCreditResponse = await fetch(
      `${API_BASE_URL}/api/crm/user_credit?clientId=${effectiveUserId}`,
    );
    if (!userCreditResponse.ok) {
      throw new Error("Failed to fetch user credit");
    }

    const userCreditData = await userCreditResponse.json();
    dispatch(saveUserCredit(userCreditData));

    window.dispatchEvent(
      new CustomEvent("creditUpdated", {
        detail: { clientId: effectiveUserId },
      }),
    );
  } catch (creditError) {
    console.error("User credit API error:", creditError);
  }
};

const ensureCanDeductCredit = async () => {
  if (sessionStorage.getItem("isDemoAccount") === "true") {
    return true;
  }

  const currentCredits = await checkUserCredits(effectiveUserId);
  const canGenerate = canGenerateFromCreditResponse(currentCredits);

  if (!canGenerate) {
    setForceShowCreditModal(true);
  }

  return canGenerate;
};

useEffect(() => {
  console.log("Redux User:", reduxUserId);
  console.log(
    "Stored Client:",
    searchParams.get("clientId") ||
      localStorage.getItem("selectedClientId") ||
      sessionStorage.getItem("selectedClientId"),
  );
  console.log("Effective Client:", effectiveUserId);
}, [reduxUserId, effectiveUserId, searchParams]);

// Load the client's campaigns for the "Generate insights" dropdown.
useEffect(() => {
  if (!effectiveUserId || effectiveUserId <= 0) {
    setCampaigns([]);
    return;
  }
  const fetchCampaigns = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/auth/campaigns/client/${effectiveUserId}`,
      );
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
      setCampaigns([]);
    }
  };
  fetchCampaigns();
}, [effectiveUserId]);

// IDs of the campaigns this contact already belongs to (from the Lists tab data),
// so the insights dropdown can list those first.
const contactCampaignIdSet = useMemo(() => {
  const ids = (contactDetails?.campaigns || [])
    .map((c: any) => String(c?.campaignId ?? c?.id ?? ""))
    .filter(Boolean);
  return new Set<string>(ids);
}, [contactDetails]);

// Split campaigns into "this contact's campaigns" (shown first) and the rest,
// each sorted by their display label.
const groupedCampaigns = useMemo(() => {
  const decorated = [...campaigns]
    .map((campaign) => ({
      campaign,
      label:
        (campaign.description || "").trim() || campaign.campaignName || "",
    }))
    .sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));

  return {
    contactCampaigns: decorated.filter((x) =>
      contactCampaignIdSet.has(String(x.campaign.id)),
    ),
    otherCampaigns: decorated.filter(
      (x) => !contactCampaignIdSet.has(String(x.campaign.id)),
    ),
  };
}, [campaigns, contactCampaignIdSet]);

// Literal {placeholder} substitution (same approach as MainPage).
const fillPlaceholders = (text: string, replacements: Record<string, any>) => {
  if (!text) return "";
  let result = text;
  Object.entries(replacements).forEach(([key, value]) => {
    result = result.split(`{${key}}`).join(value ?? "");
  });
  return result;
};

// Map the current contact's details onto the placeholder keys blueprints use.
const buildContactReplacements = (c: any): Record<string, any> => ({
  company_name: c?.company_name || c?.company || "",
  company_name_friendly: c?.company_name_friendly || c?.company_name || c?.company || "",
  job_title: c?.job_title || c?.title || "",
  location: c?.country_or_address || c?.location || "",
  full_name:
    c?.full_name ||
    [c?.first_name, c?.last_name].filter(Boolean).join(" ") ||
    c?.name ||
    "",
  first_name: c?.first_name || "",
  last_name: c?.last_name || "",
  email: c?.email || "",
  linkedin_url: c?.linkedin_url || c?.linkedin || "",
  website: c?.website || "",
  company_linkedin_url: c?.companyLinkedInURL || "",
  company_industry: c?.companyIndustry || "",
  notes: c?.notes || "",
  date: new Date().toISOString().split("T")[0],
});

// Resolve the selected campaign → its blueprint's web-search instructions,
// fill in this contact's details, run the web search, and show the insights.
const handleGenerateInsights = async () => {
  if (!selectedCampaign) {
    appModal.showError("Please select a campaign first.");
    return;
  }
  if (!contactId) {
    appModal.showError("No contact selected.");
    return;
  }

  const canGenerate = await ensureCanDeductCredit();
  if (!canGenerate) return;

  setIsGeneratingInsights(true);
  try {
    // 1. Campaign → templateId (blueprint)
    const campaignRes = await fetch(
      `${API_BASE_URL}/api/auth/campaigns/${selectedCampaign}`,
    );
    if (!campaignRes.ok) throw new Error("Failed to fetch campaign details");
    const campaignData = await campaignRes.json();
    const templateId = campaignData.templateId;
    if (!templateId) throw new Error("This campaign has no blueprint attached.");

    // 2. Blueprint → web-search instructions + placeholder values
    const bpRes = await fetch(
      `${API_BASE_URL}/api/CampaignPrompt/campaign/${templateId}`,
    );
    if (!bpRes.ok) throw new Error("Failed to fetch blueprint");
    const bpJson = await bpRes.json();
    const pv = bpJson.placeholderValues || {};
    const webSearchInstructions =
      bpJson.webSearchInstructions ||
      bpJson.WebSearchInstructions ||
      pv.search_objective ||
      "";

    // 3. Fill blueprint placeholders with this contact's details
    const replacements = {
      ...pv,
      // alias: templates may use {hook} while blueprints store hook_search_terms
      hook: pv.hook || pv.hook_search_terms || "",
      ...buildContactReplacements(contact),
    };
    const filledInstructions = fillPlaceholders(webSearchInstructions, replacements);

    if (!filledInstructions.trim()) {
      throw new Error(
        "The selected campaign's blueprint has no web-search instructions.",
      );
    }

    // 4. Run the web search (backend also persists it against the contact)
    const wsRes = await fetch(`${API_BASE_URL}/api/auth/websearch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instructions: filledInstructions,
        contactId: Number(contactId),
        clientId: effectiveUserId,
      }),
    });
    const wsData = await wsRes.json();
    if (!wsRes.ok) {
      throw new Error(wsData?.message || wsData?.Message || "Web search failed");
    }

    const webSearchData =
      wsData?.webSearchData || wsData?.WebSearchData || wsData?.summary || "";

    // 5. Reflect the fresh insights in the profile + edit views immediately
    const nowIso = new Date().toISOString();
    setContact((prev: any) =>
      prev ? { ...prev, web_search_data: webSearchData, updated_at: nowIso } : prev,
    );
    setEditingContact((prev) =>
      prev ? { ...prev, web_search_data: webSearchData, updated_at: nowIso } : prev,
    );

    await refreshCreditsAfterDeduction();

    appModal.showSuccess("Insights generated successfully.");
  } catch (err: any) {
    console.error("Generate insights failed:", err);
    appModal.showError(err?.message || "Failed to generate insights.");
  } finally {
    setIsGeneratingInsights(false);
  }
};

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: "14px",
    background: "#f9fafb",
  };

  const getMessageTime = (message: any) =>
    new Date(message?.date || message?.Date || message?.sentAt || message?.SentAt || message?.receiveAt || message?.ReceiveAt || 0).getTime();

  const getTrackingIdValue = (value: any) =>
    String(
      value?.trackingId ||
      value?.TrackingId ||
      value?.trackingid ||
      value?.threadId ||
      value?.ThreadId ||
      ""
    ).trim();

  const getMessageIdValue = (value: any) =>
    String(value?.messageId || value?.MessageId || "").trim();

  const getProviderValue = (value: any) =>
    String(
      value?.Provider ||
      value?.provider ||
      value?.ProviderName ||
      value?.providerName ||
      value?.providername ||
      value?.["Provider name"] ||
      value?.["provider name"] ||
      value?.SmtpType ||
      value?.smtpType ||
      ""
    ).trim();

  const getInboxIdValue = (value: any) => {
    const inboxId = Number(value?.inboxid ?? value?.inboxId ?? value?.InboxId ?? value?.inboxID ?? 0);
    return Number.isFinite(inboxId) && inboxId > 0 ? inboxId : null;
  };

  const normalizeConversationThread = (conversation: any) => {
    const rawMessages = conversation.messages || conversation.Messages || [];
    const sortedMessages = [...rawMessages].map((message: any, index: number) => ({
      ...message,
      type: message.type || message.Type,
      messageId: getMessageIdValue(message) || `${getTrackingIdValue(conversation) || "message"}-${index}`,
      subject: message.subject || message.Subject,
      body: message.body || message.Body,
      fromEmail: message.fromEmail || message.FromEmail,
      toEmail: message.toEmail || message.ToEmail,
      date: message.date || message.Date,
      isRead: message.isRead ?? message.IsRead ?? true,
      contactId: message.contactId ?? message.ContactId,
      contactName: message.contactName || message.ContactName,
      attachments: message.attachments || message.Attachments || [],
      inboxid: getInboxIdValue(message) ?? message.inboxid ?? message.inboxId ?? message.InboxId,
      Provider: getProviderValue(message),
      provider: getProviderValue(message),
    })).sort(
      (a: any, b: any) => getMessageTime(a) - getMessageTime(b)
    );
    const latestMessage = sortedMessages[sortedMessages.length - 1] || {};
    const threadDate = conversation.lastMessageDate || conversation.LastMessageDate || latestMessage.date;
    const latestType = String(latestMessage.type || "").toLowerCase();
    const isInboxThread = latestType !== "sent";
    const primaryMessage = latestMessage;
    const trackingId = getTrackingIdValue(conversation) || getTrackingIdValue(latestMessage);

    return {
      ...conversation,
      inboxid: getInboxIdValue(conversation) ?? getInboxIdValue(latestMessage) ?? sortedMessages.map(getInboxIdValue).find(Boolean) ?? conversation.inboxid ?? conversation.inboxId ?? conversation.InboxId ?? latestMessage.inboxid ?? latestMessage.inboxId ?? latestMessage.InboxId,
      Provider: getProviderValue(conversation) || getProviderValue(latestMessage),
      provider: getProviderValue(conversation) || getProviderValue(latestMessage),
      trackingId: trackingId || `${conversation.contactId || conversation.ContactId || contactId}-${threadDate || latestMessage.messageId}`,
      subject: conversation.subject || conversation.Subject || latestMessage.subject,
      body: primaryMessage?.body,
      sentAt: threadDate,
      receiveAt: threadDate,
      senderEmailId: latestMessage.fromEmail,
      fromEmail: latestMessage.fromEmail || conversation.contactEmail || conversation.ContactEmail,
      toEmail: latestMessage.toEmail,
      emailType: isInboxThread ? "inbox" : "sent",
      messages: sortedMessages,
      replies: sortedMessages.filter((message: any) => message !== primaryMessage),
      contactName: latestMessage.contactName,
    };
  };

  const normalizeEmailTimeline = (data: any) => {
    if (Array.isArray(data?.conversations) && data.conversations.length > 0) {
      return data.conversations
        .map(normalizeConversationThread)
        .sort((a: any, b: any) => {
          const dateA = new Date(a.sentAt || a.receiveAt || 0).getTime();
          const dateB = new Date(b.sentAt || b.receiveAt || 0).getTime();
          return dateB - dateA;
        });
    }

    const sentEmails = (data?.emails || []).map((email: any) => ({
      ...email,
      emailType: "sent",
    }));

    const inboxEmails = (data?.inboxemails || []).map((email: any) => ({
      ...email,
      emailType: "inbox",
      sentAt: email.receiveAt,
      senderEmailId: email.fromEmail,
    }));

    const getThreadKey = (email: any) =>
      getTrackingIdValue(email) ||
      getMessageIdValue(email) ||
      `${email.subject || "no-subject"}-${email.senderEmailId || email.fromEmail || ""}-${email.toEmail || ""}`;

    const groupedEmails = [...sentEmails, ...inboxEmails].reduce((groups: Record<string, any[]>, email: any) => {
      const key = getThreadKey(email);
      if (!groups[key]) groups[key] = [];
      groups[key].push(email);
      return groups;
    }, {});

    return Object.entries(groupedEmails).map(([threadKey, emails]) => {
      if (emails.length === 1) return emails[0];

      const messages = emails
        .map((email: any, index: number) => ({
          type: email.emailType === "sent" ? "Sent" : "Reply",
          messageId: getMessageIdValue(email) || `${threadKey}-${index}`,
          subject: email.subject || email.Subject,
          body: email.body || email.Body,
          fromEmail: email.fromEmail || email.FromEmail || email.senderEmailId || email.SenderEmailId,
          toEmail: email.toEmail || email.ToEmail,
          date: email.sentAt || email.SentAt || email.receiveAt || email.ReceiveAt,
          isRead: email.isRead ?? email.IsRead ?? true,
          contactId: email.contactId ?? email.ContactId,
          contactName: email.contactName || email.ContactName,
          attachments: email.attachments || email.Attachments || [],
        }))
        .sort((a: any, b: any) => getMessageTime(a) - getMessageTime(b));
      const latestMessage = messages[messages.length - 1] || {};
      const firstEmail = emails[0];

      return {
        ...firstEmail,
        trackingId: threadKey,
        subject: latestMessage.subject || firstEmail.subject,
        body: latestMessage.body,
        sentAt: latestMessage.date,
        receiveAt: latestMessage.date,
        senderEmailId: latestMessage.fromEmail,
        fromEmail: latestMessage.fromEmail,
        toEmail: latestMessage.toEmail,
        emailType: String(latestMessage.type || "").toLowerCase() === "sent" ? "sent" : "inbox",
        messages,
        replies: messages.slice(0, -1),
        contactName: latestMessage.contactName,
      };
    }).sort((a, b) => {
      const dateA = new Date(a.sentAt || a.receiveAt || 0).getTime();
      const dateB = new Date(b.sentAt || b.receiveAt || 0).getTime();
      return dateB - dateA;
    });
  };

  const fetchContactEmailThreads = async (targetContactId: number) => {
    if (!targetContactId || !effectiveUserId) return [];

    const threadsResponse = await fetch(
      `${API_BASE_URL}/api/Inbox/contact-threads?clientId=${effectiveUserId}&contactId=${targetContactId}&pageNumber=1&pageSize=500`
    );

    if (!threadsResponse.ok) {
      throw new Error("Failed to fetch contact email threads");
    }

    const threadsData = await threadsResponse.json();
    const contactThreads = threadsData?.data?.data || threadsData?.data?.Data || [];
    const normalizedThreads = Array.isArray(contactThreads)
      ? contactThreads.map(normalizeConversationThread)
      : [];

    setEmailTimeline(normalizedThreads);
    return normalizedThreads;
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

      try {
        await fetchContactEmailThreads(contactId);
      } catch (threadError) {
        console.error("contact-threads API failed, falling back to email-timeline conversations", threadError);
        setEmailTimeline(normalizeEmailTimeline(data));
      }
      setNotesHistory(data.notes || []); // ✅ Set notes from timeline API
      setAttachmentsHistory(data.attachments || []); // ✅ Set attachments from timeline API
    } catch (err) {
      console.error(err);
      setEmailTimeline([]);
      setNotesHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // 🔹 LinkedIn messages — api/linkedin-messages/by-contact returns the
  //    contact's append-only LinkedIn history (drafts + messages marked sent).
  const normalizeLinkedInMessage = (raw: any) => {
    const sentAt = raw.sentAt ?? raw.SentAt ?? null;
    const generatedAt = raw.generatedAt ?? raw.GeneratedAt ?? null;
    const body = raw.body ?? raw.Body ?? "";

    return {
      id: raw.id ?? raw.Id,
      msgUid: raw.msgUid ?? raw.MsgUid,
      messageType: raw.messageType ?? raw.MessageType ?? "message",
      blueprintId: raw.blueprintId ?? raw.BlueprintId ?? null,
      body,
      characterCount: raw.characterCount ?? raw.CharacterCount ?? body.length,
      isSent: raw.isSent ?? raw.IsSent ?? false,
      sentAt,
      markedFrom: raw.markedFrom ?? raw.MarkedFrom ?? null,
      generatedAt,
      // sent messages always carry sentAt; generatedAt is only a fallback
      activityAt: sentAt || generatedAt,
    };
  };

  const fetchLinkedInMessages = async (targetContactId: number) => {
    if (!targetContactId || !effectiveUserId) return;

    setIsLoadingLinkedIn(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/linkedin-messages/by-contact`,
        {
          params: {
            clientId: Number(effectiveUserId),
            contactId: targetContactId,
            includeBody: true,
            // the timeline is a record of what actually went out — drafts stay out of it
            sentOnly: true,
            take: 200,
          },
        }
      );

      const rows = response.data?.data ?? response.data?.Data ?? [];
      const normalized = (Array.isArray(rows) ? rows : [])
        .map(normalizeLinkedInMessage)
        .sort(
          (a: any, b: any) =>
            new Date(b.activityAt || 0).getTime() -
            new Date(a.activityAt || 0).getTime()
        );

      setLinkedInMessages(normalized);
    } catch (err) {
      console.error("Failed to fetch LinkedIn messages", err);
      setLinkedInMessages([]);
    } finally {
      setIsLoadingLinkedIn(false);
    }
  };

  useEffect(() => {
  if (contactId && effectiveUserId) {
    fetchEmailTimeline(Number(contactId));
    fetchLinkedInMessages(Number(contactId));
  }
}, [contactId, effectiveUserId]);

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

  const formatAttachmentSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleEmailAttachmentDownload = async (attachment: any) => {
    if (!attachment?.id) return;

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/Inbox/download/${attachment.id}`,
        {
          headers: {
            accept: "*/*",
          },
          responseType: "blob",
        }
      );

      const contentDisposition = response.headers["content-disposition"];
      let filename = attachment.originalFileName || attachment.fileName || "download";

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?=['"]?(?:UTF-8'')?([^'"\s]+)['"]?/i);
        if (filenameMatch) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download email attachment", error);
      setToastMessage("Failed to download attachment.");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    }
  };

  const renderMessageAttachments = (attachments?: any[]) => {
    if (!attachments || attachments.length === 0) return null;

    return (
      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
        {attachments.map((attachment, index) => {
          const fileName = attachment.originalFileName || attachment.fileName || `Attachment ${index + 1}`;
          const fileSize = formatAttachmentSize(attachment.fileSize);

          return (
            <button
              key={`${attachment.id || attachment.filePath || fileName}-${index}`}
              type="button"
              onClick={() => handleEmailAttachmentDownload(attachment)}
              disabled={!attachment.id}
              title={fileName}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                maxWidth: "100%",
                padding: "8px 10px",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                color: "#1f2937",
                background: "#fff",
                fontSize: 13,
                cursor: attachment.id ? "pointer" : "not-allowed",
              }}
            >
              <FontAwesomeIcon icon={faPaperclip} style={{ color: "#3f9f42", flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {fileName}
              </span>
              {fileSize && <span style={{ color: "#6b7280", flexShrink: 0 }}>{fileSize}</span>}
              <FontAwesomeIcon icon={faDownload} style={{ color: "#6b7280", flexShrink: 0 }} />
            </button>
          );
        })}
      </div>
    );
  };

  const getEmailPreviewMessages = (email: any) => {
    const rawMessages = email.messages || email.Messages || [];
    if (Array.isArray(rawMessages) && rawMessages.length > 0) {
      return rawMessages.map((message: any, index: number) => ({
        ...message,
        type: message.type || message.Type,
        messageId: getMessageIdValue(message) || `${getTrackingIdValue(email) || "message"}-${index}`,
        subject: message.subject || message.Subject,
        body: message.body || message.Body,
        fromEmail: message.fromEmail || message.FromEmail,
        toEmail: message.toEmail || message.ToEmail,
        date: message.date || message.Date,
        isRead: message.isRead ?? message.IsRead ?? true,
        contactId: message.contactId ?? message.ContactId,
        contactName: message.contactName || message.ContactName,
        attachments: message.attachments || message.Attachments || [],
      })).sort((a: any, b: any) => getMessageTime(b) - getMessageTime(a));
    }

    return [
      {
        type: email.emailType === "sent" ? "Sent" : "Reply",
        messageId: getMessageIdValue(email) || getTrackingIdValue(email),
        subject: email.subject || email.Subject,
        body: email.body || email.Body,
        fromEmail: email.fromEmail || email.FromEmail || email.senderEmailId || email.SenderEmailId,
        toEmail: email.toEmail || email.ToEmail,
        date: email.sentAt || email.SentAt || email.receiveAt || email.ReceiveAt,
        attachments: email.attachments || email.Attachments || [],
      },
    ];
  };

  const renderEmailPreview = (email: any) => {
    const messages = getEmailPreviewMessages(email);

    return (
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
          maxWidth: "100%",
          background: "white",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {messages.map((message: any, messageIndex: number) => (
          <div
            key={message.messageId || `${email.trackingId}-${messageIndex}`}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              background: "#fff",
              maxWidth: "100%",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "10px 12px",
                borderBottom: "1px solid #e5e7eb",
                background: "#f9fafb",
                color: "#374151",
                fontSize: 13,
              }}
            >
              {message.type && (
                <div style={{ fontSize: 12, color: "#3f9f42", fontWeight: 700, marginBottom: 4 }}>
                  {message.type}
                </div>
              )}
              <div style={{ fontWeight: 700, color: "#111827", wordBreak: "break-word" }}>
                {message.subject || email.subject || "No subject"}
              </div>
              <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
                {message.fromEmail && <span>From: {message.fromEmail}</span>}
                {message.toEmail && <span>To: {message.toEmail}</span>}
                {(message.date || email.sentAt || email.receiveAt) && (
                  <span>{formatDateTimeIST(message.date || email.sentAt || email.receiveAt)}</span>
                )}
              </div>
            </div>
            <div
              style={{
                padding: 12,
                maxWidth: "100%",
                overflowX: "auto",
                fontSize: 14,
                lineHeight: 1.5,
                color: "#374151",
              }}
              dangerouslySetInnerHTML={{
                __html: message.body || "<p>No email body available</p>",
              }}
            />
            <div style={{ padding: "0 12px 12px" }}>
              {renderMessageAttachments(message.attachments)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const isEmailPinned = (email: any) => Boolean(email?.isPinned ?? email?.isPin);

  const handleToggleEmailPin = async (email: any) => {
    if (!effectiveUserId || !email?.trackingId) return;

    const nextPinned = !isEmailPinned(email);
    setPinningEmailId(email.trackingId);
    setEmailActionsAnchor(null);

    try {
      const response = await pinEmail(String(effectiveUserId), email.trackingId, null);

      if (response.data?.success === false) {
        throw new Error(response.data?.message || "Failed to update email pin");
      }

      setEmailTimeline((prev) =>
        prev.map((item) =>
          item.trackingId === email.trackingId
            ? { ...item, isPinned: nextPinned, isPin: nextPinned }
            : item
        )
      );
      setToastMessage(nextPinned ? "Email was pinned" : "Email was unpinned");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 2500);
    } catch (error) {
      console.error("Failed to update email pin", error);
      setToastMessage("Failed to update email pin.");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    } finally {
      setPinningEmailId(null);
    }
  };

  const handleEmailDelete = (email: any, deleteMode: "soft" | "Permanent") => {
    setEmailActionsAnchor(null);
    setEmailToDelete(email);
    setPendingEmailDeleteMode(deleteMode);
    setShowEmailDeleteModal(true);
  };

  const deleteEmail = async (email: any, deleteMode: "soft" | "Permanent") => {
    if (!effectiveUserId || !email?.trackingId) return;

    setIsDeletingEmail(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/Inbox/delete-conversation`,
        {
          TrackingIds: [email.trackingId],
          deleteMode,
          clientid: Number(effectiveUserId),
        },
        {
          headers: {
            accept: "*/*",
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data?.success === false) {
        throw new Error(response.data?.message || "Failed to delete email");
      }

      setEmailTimeline((prev) => prev.filter((item) => item.trackingId !== email.trackingId));
      setExpandedEmailId((prev) => (prev === email.trackingId ? null : prev));
      setShowEmailDeleteModal(false);
      setEmailToDelete(null);
      setToastMessage(deleteMode === "Permanent" ? "Email deleted permanently" : "Email moved to trash");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 2500);
    } catch (error) {
      console.error("Failed to delete email", error);
      setToastMessage("Failed to delete email.");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    } finally {
      setIsDeletingEmail(false);
    }
  };

  const confirmEmailDelete = () => {
    if (!emailToDelete) return;
    deleteEmail(emailToDelete, pendingEmailDeleteMode);
  };

  const showContactMailSuccess = (message: string) => {
    setToastMessage(message);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const showContactMailError = (message: string) => {
    setToastMessage(message);
    setShowErrorToast(true);
    setTimeout(() => setShowErrorToast(false), 3000);
  };

  const refreshContactEmailGrid = async () => {
    if (!contactId || isRefreshingContactEmails) return;

    setIsRefreshingContactEmails(true);
    try {
      const refreshedThreads = await fetchContactEmailThreads(Number(contactId));
      setSelectedContactThread((currentThread: any) => {
        if (!currentThread) return refreshedThreads[0] || null;
        return refreshedThreads.find((thread: any) => thread.trackingId === currentThread.trackingId) || refreshedThreads[0] || null;
      });
      showContactMailSuccess("Emails refreshed.");
    } catch (error: any) {
      console.error("Failed to refresh contact emails:", error);
      showContactMailError(error.message || "Failed to refresh emails.");
    } finally {
      setIsRefreshingContactEmails(false);
    }
  };

  const contactReplyTrailMarker = 'data-reply-email-trail="true"';
  const contactReplySignatureMarker = 'data-reply-email-signature="true"';
  const contactReplyTrailSeparator = '<hr style="border:0;border-top:1px solid #d1d5db;margin:16px 0;width:100%;" />';

  const escapeContactReplyHtml = (value: string): string =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const splitContactReplyTrail = (html: string): { draftHtml: string; trailHtml: string } => {
    const markerMatch = html.match(/data-reply-email-trail(?:=(?:"true"|'true'|true|""))?/i);
    const markerIndex = markerMatch?.index ?? -1;

    if (markerIndex === -1) {
      return { draftHtml: html, trailHtml: "" };
    }

    const detailsStart = html.lastIndexOf("<details", markerIndex);
    const divStart = html.lastIndexOf("<div", markerIndex);
    const trailTagStart = Math.max(detailsStart, divStart);

    if (trailTagStart === -1) {
      return { draftHtml: html, trailHtml: "" };
    }

    const separatorStart = Math.max(
      html.lastIndexOf("<br/><br/>", trailTagStart),
      html.lastIndexOf("<br/>", trailTagStart)
    );
    const trailStart = separatorStart === -1 ? trailTagStart : separatorStart;

    return {
      draftHtml: html.slice(0, trailStart),
      trailHtml: html.slice(trailStart),
    };
  };

  const buildCollapsedContactReplyTrail = (formattedTrail: string): string =>
    `<br/><div ${contactReplyTrailMarker} data-trail-open="false" class="contact-reply-trail" contenteditable="false" style="display:inline-block;margin:0;padding:0;color:#111111;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.35;text-align:left;min-width:34px;min-height:22px;"><span class="contact-reply-trail-toggle" contenteditable="false" style="cursor:pointer;display:inline-flex;align-items:center;justify-content:center;color:#3f9f42;background:#eaf5ea;border:1px solid #cfe7d0;border-radius:999px;font-weight:700;font-size:18px;line-height:1;width:34px;height:22px;padding:0;margin:0 0 10px 0;">...</span><div class="contact-reply-trail-body" style="display:none;">${contactReplyTrailSeparator}${formattedTrail}</div></div>`;

  const appendContactReplyTrail = (draftHtml: string, formattedTrail: string): string => {
    const { draftHtml: currentDraftHtml } = splitContactReplyTrail(draftHtml || "");
    const compactDraftHtml = currentDraftHtml.replace(/(?:<br\s*\/?>|\s)+$/gi, "");
    return `${compactDraftHtml}${buildCollapsedContactReplyTrail(formattedTrail)}`;
  };

  const replaceContactReplyDraftContent = (nextDraftHtml: string) => {
    setContactReplyText((currentReplyText) => {
      const { trailHtml } = splitContactReplyTrail(currentReplyText);
      return `${nextDraftHtml || ""}${trailHtml || contactReplyTrailHtml}`;
    });
  };

  const getContactForwardSignatureHtml = (html: string): string => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    return wrapper.querySelector("[data-reply-email-signature]")?.outerHTML || "";
  };

  const appendContactForwardSignature = (html: string, signatureHtml: string): string => {
    const { draftHtml, trailHtml } = splitContactReplyTrail(html || "");
    if (draftHtml.includes(contactReplySignatureMarker)) return html;

    const compactDraftHtml = draftHtml.replace(/(?:<br\s*\/?>|\s)+$/gi, "");
    return `${compactDraftHtml}<br/><br/><div ${contactReplySignatureMarker}>${signatureHtml}</div>${trailHtml}`;
  };

  const replaceContactForwardDraftContent = (nextDraftHtml: string) => {
    setContactForwardMessage((currentForwardMessage) => {
      const { trailHtml } = splitContactReplyTrail(currentForwardMessage);
      const signatureHtml = getContactForwardSignatureHtml(currentForwardMessage);
      return `${nextDraftHtml || ""}${signatureHtml ? `<br/><br/>${signatureHtml}` : ""}${trailHtml}`;
    });
  };

  const getSendableContactReplyBody = (html: string): string => {
    if (!/data-reply-email-trail(?:=(?:"true"|'true'|true|""))?/i.test(html)) {
      return html;
    }

    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;

    wrapper.querySelectorAll("[data-reply-email-trail]").forEach((details) => {
      const trailContent = document.createElement("div");
      trailContent.innerHTML = details.innerHTML;
      trailContent.querySelector("summary")?.remove();
      trailContent.querySelector(".contact-reply-trail-toggle")?.remove();
      const body = trailContent.querySelector(".contact-reply-trail-body") as HTMLElement | null;
      if (body) body.style.display = "";
      details.replaceWith(...Array.from(trailContent.childNodes));
    });

    return wrapper.innerHTML;
  };

  const getDraftContactReplyBody = (html: string): string => splitContactReplyTrail(html || "").draftHtml;

  const formatContactReplyTrailHeader = (headerText: string): string => {
    const fullyDecode = (text: string): string => {
      const textarea = document.createElement("textarea");
      textarea.innerHTML = text;
      const decoded = textarea.value;
      if (decoded !== text && /&(?:quot|lt|gt|amp);/.test(decoded)) {
        return fullyDecode(decoded);
      }
      return decoded;
    };

    const headerRows = fullyDecode(headerText)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^([^:]+):\s*(.*)$/);
        if (!match) return `<div style="margin:0 0 8px 0;">${escapeContactReplyHtml(line)}</div>`;
        return `<div style="margin:0 0 8px 0;text-align:left;"><strong style="font-weight:700;">${escapeContactReplyHtml(match[1])}:</strong> <span style="font-weight:400;">${escapeContactReplyHtml(match[2])}</span></div>`;
      })
      .join("");

    return `<div style="margin:0 0 14px 0;padding:0;background:#ffffff;color:#111111;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.35;text-align:left;">${headerRows}</div>`;
  };

  const formatContactReplyEmailTrail = (trail: string): string => {
    const decodeHtmlEntities = (html: string): string => {
      const textarea = document.createElement("textarea");
      textarea.innerHTML = html;
      const decoded = textarea.value;
      if (decoded !== html && (decoded.includes("&lt;") || decoded.includes("&gt;") || decoded.includes("&quot;") || decoded.includes("&amp;"))) {
        return decodeHtmlEntities(decoded);
      }
      return decoded;
    };

    const decodedTrail = decodeHtmlEntities(trail);
    const htmlStart = decodedTrail.search(/<html[\s>]/i);
    const bodyOpen = decodedTrail.search(/<body[^>]*>/i);
    const bodyClose = decodedTrail.search(/<\/body>/i);
    const firstHtmlTagIndex = decodedTrail.search(/<\/?[a-z][a-z0-9-]*(?:\s[^<>]*)?>/i);
    const headerText = htmlStart > 0
      ? decodedTrail.slice(0, htmlStart).trim()
      : firstHtmlTagIndex > 0
        ? decodedTrail.slice(0, firstHtmlTagIndex).trim()
        : bodyOpen > 0
          ? decodedTrail.slice(0, bodyOpen).trim()
          : "";
    const rawBody = bodyOpen !== -1 && bodyClose !== -1 && bodyClose > bodyOpen
      ? decodedTrail.slice(decodedTrail.indexOf(">", bodyOpen) + 1, bodyClose)
      : firstHtmlTagIndex > -1
        ? decodedTrail.slice(firstHtmlTagIndex)
        : escapeContactReplyHtml(decodedTrail).replace(/\r\n|\r|\n/g, "<br>");
    const bodyContent = rawBody
      .replace(/<!doctype[^>]*>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<head[\s\S]*?<\/head>/gi, "")
      .replace(/<\/?(?:html|body|head)\b[^>]*>/gi, "")
      .replace(/<(?:meta|style|link|base)\b[^>]*>([\s\S]*?<\/style>)?/gi, "")
      .trim()
      .replace(/<hr\b[^>]*>/gi, contactReplyTrailSeparator);

    return `${headerText ? formatContactReplyTrailHeader(headerText) : ""}${bodyContent}`;
  };

  const copyContactReplyToClipboard = async () => {
    const container = document.createElement("div");
    container.innerHTML = contactReplyText || "";
    const contentToCopy = (container.textContent || container.innerText || "").trim();

    if (!contentToCopy) return;

    try {
      const copied = await copyToClipboard(contentToCopy);
      setIsCopyContactReplyText(copied);
      setTimeout(() => setIsCopyContactReplyText(false), 1000);
    } catch (error) {
      console.error("Failed to copy reply text:", error);
    }
  };

  const handleKraftContactReply = async (thread: any) => {
    if (!selectedContactReplyBlueprint || !thread?.contactId) {
      showContactMailError("Please select a blueprint first.");
      return;
    }

    if (contactReplyKraftInFlightRef.current) {
      return;
    }

    contactReplyKraftInFlightRef.current = true;

    const canKraft = await ensureCanDeductCredit();
    if (!canKraft) {
      contactReplyKraftInFlightRef.current = false;
      return;
    }

    setIsKraftingContactReply(true);
    try {
      const response = await axios.post(
        `${PITCH_GENERATION_API_BASE_URL}/api/email-generation/generate`,
        {
          blueprintId: selectedContactReplyBlueprint,
          contactId: thread.contactId,
          clientId: String(effectiveUserId),
          overwriteExisting: true,
        },
        {
          headers: {
            accept: "*/*",
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (response.data?.success && response.data?.emailBody) {
        replaceContactReplyDraftContent(response.data.emailBody);
        captureKraftInsights(response.data);
        refreshCreditsAfterDeduction();
        window.dispatchEvent(new CustomEvent("creditUpdated", { detail: { clientId: effectiveUserId } }));
        return;
      }

      throw new Error(response.data?.message || "Failed to generate email");
    } catch (error: any) {
      console.error("Failed to kraft contact reply:", error);
      showContactMailError(error.response?.data?.message || error.message || "Failed to generate email.");
    } finally {
      setIsKraftingContactReply(false);
      contactReplyKraftInFlightRef.current = false;
    }
  };

  const handleGenerateComposeEmail = async (blueprintId: number) => {
    const emptyGeneratedEmail = { emailBody: "", emailSubject: "" };

    if (!blueprintId || !contactId) {
      showContactMailError("Please select a blueprint first.");
      return emptyGeneratedEmail;
    }

    const canKraft = await ensureCanDeductCredit();
    if (!canKraft) return emptyGeneratedEmail;

    try {
      const response = await axios.post(
        `${PITCH_GENERATION_API_BASE_URL}/api/email-generation/generate`,
        {
          blueprintId,
          contactId: Number(contactId),
          clientId: String(effectiveUserId),
          overwriteExisting: true,
        },
        {
          headers: {
            accept: "*/*",
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (response.data?.success && (response.data?.emailBody || response.data?.emailSubject)) {
        refreshCreditsAfterDeduction();
        window.dispatchEvent(new CustomEvent("creditUpdated", { detail: { clientId: effectiveUserId } }));
        const generationInsights = extractGenerationInsights(response.data);

        return {
          emailBody: response.data.emailBody || "",
          emailSubject: response.data.emailSubject || "",
          finalPrompt: generationInsights.finalPrompt,
          webSearchData: generationInsights.webSearchData,
          emails: generationInsights.emails,
          notes: generationInsights.notes,
          professionalSummary: generationInsights.professionalSummary,
        };
      }

      throw new Error(response.data?.message || "Failed to generate email");
    } catch (error: any) {
      console.error("Failed to generate compose email:", error);
      showContactMailError(error.response?.data?.message || error.message || "Failed to generate email.");
      return emptyGeneratedEmail;
    }
  };

  const getComposeSmtpId = (smtpUser: ContactSmtpUser) =>
    smtpUser.id ?? smtpUser.outboxId ?? smtpUser.OutboxId;

  const normalizeSignatureProvider = (provider?: string) => {
    const normalizedProvider = String(provider || "").trim();
    if (!normalizedProvider) return "";
    return normalizedProvider.toLowerCase() === "smtp" ? "imap" : normalizedProvider;
  };

  useEffect(() => {
    if (!isComposePopupOpen) {
      setComposeSignatureHtml("");
      setIsLoadingComposeSignature(false);
      return;
    }

    const selectedSmtp = composeSmtpUsers.find(
      (smtpUser) => String(getComposeSmtpId(smtpUser) ?? "") === selectedComposeSmtpUser
    );
    const signatureInboxId = selectedComposeSmtpUser;
    const signatureProvider = normalizeSignatureProvider(
      selectedSmtp?.provider ||
      selectedSmtp?.Provider ||
      selectedSmtp?.type ||
      selectedSmtp?.smtpType
    );

    if (!effectiveUserId || !signatureInboxId || !signatureProvider) {
      setComposeSignatureHtml("");
      return;
    }

    let isCancelled = false;
    const fetchComposeSignature = async () => {
      setIsLoadingComposeSignature(true);
      setComposeSignatureHtml("");
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/Crm/Single_signatures/${effectiveUserId}?InboxId=${signatureInboxId}&Provider=${encodeURIComponent(signatureProvider)}&Mathod=Contact`,
          {
            headers: {
              accept: "*/*",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );

        if (!isCancelled) {
          setComposeSignatureHtml(response.data?.signatureHtml || "");
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Failed to fetch compose signature:", error);
          setComposeSignatureHtml("");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingComposeSignature(false);
        }
      }
    };

    fetchComposeSignature();

    return () => {
      isCancelled = true;
    };
  }, [isComposePopupOpen, selectedComposeSmtpUser, composeSmtpUsers, effectiveUserId, token]);

  const handleSendComposeEmail = async ({
    emailSubject,
    emailBody,
    ccEmails,
    bccEmails,
  }: {
    emailSubject: string;
    emailBody: string;
    ccEmails: string[] | null;
    bccEmails: string[] | null;
  }): Promise<boolean> => {
    const emailBodyToSave = emailBody;
    const plainBody = getPlainText(emailBodyToSave || "").trim();
    const outboxId = parseInt(selectedComposeSmtpUser || "0", 10);
    const selectedSmtp = composeSmtpUsers.find((smtpUser) => Number(getComposeSmtpId(smtpUser)) === outboxId);

    if (!contactId || !effectiveUserId) {
      showContactMailError("Contact not found.");
      return false;
    }

    if (!outboxId) {
      showContactMailError("Please select From email.");
      return false;
    }

    if (!emailSubject.trim()) {
      showContactMailError("Please enter subject.");
      return false;
    }

    if (!plainBody) {
      showContactMailError("Please write email body.");
      return false;
    }

    setIsSendingComposeEmail(true);
    try {
      const updateResponse = await axios.post(
        `${API_BASE_URL}/api/Crm/contacts/update-email`,
        {
          clientId: Number(effectiveUserId),
          contactId: Number(contactId),
          campaignId: null,
          blueprintId: null,
          gptGenerate: true,
          emailSubject,
          emailBody: emailBodyToSave,
        },
        {
          headers: {
            accept: "*/*",
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (
        updateResponse.status < 200 ||
        updateResponse.status >= 300 ||
        updateResponse.data?.success === false ||
        updateResponse.data?.success === "false"
      ) {
        throw new Error(updateResponse.data?.message || "Failed to update email before sending");
      }

      const sendResponse = await axios.post(
        `${API_BASE_URL}/api/email/send-singleEmail`,
        {
          clientId: Number(effectiveUserId),
          contactid: Number(contactId),
          campaignid: null,
          isFollowUp: false,
          CcEmail: ccEmails,
          BccEmail: bccEmails,
          OutboxId: outboxId,
          Type: selectedSmtp?.type || selectedSmtp?.smtpType || "",
          SegmentId:
            segmentId &&
            segmentId !== "null" &&
            segmentId !== "" &&
            !Number.isNaN(parseInt(segmentId, 10))
              ? parseInt(segmentId, 10)
              : 0,
        },
        {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (sendResponse.data?.success === false) {
        throw new Error(sendResponse.data?.message || "Failed to send email");
      }

      const refreshedThreads = await fetchContactEmailThreads(Number(contactId));
      if (refreshedThreads.length > 0) {
        setSelectedContactThread(refreshedThreads[0]);
        setContactCollapsedEmails(buildDefaultContactCollapseState(refreshedThreads[0]));
      }

      setContact((currentContact: any) => currentContact
        ? {
            ...currentContact,
            email_subject: emailSubject,
            email_body: emailBodyToSave,
            email_sent_at: new Date().toISOString(),
          }
        : currentContact
      );
      showContactMailSuccess(sendResponse.data?.message || "Email sent successfully.");
      return true;
    } catch (error: any) {
      console.error("Failed to send compose email:", error);
      showContactMailError(error.response?.data?.message || error.message || "Failed to send email.");
      return false;
    } finally {
      setIsSendingComposeEmail(false);
    }
  };

  const handleSendContactReply = async (thread: any) => {
    const sendableReplyBody = getSendableContactReplyBody(contactReplyText || "");
    const plainReply = getPlainText(getDraftContactReplyBody(contactReplyText || "")).trim();

    if (!thread?.trackingId) {
      showContactMailError("Please select a thread first.");
      return;
    }

    const threadMessages = Array.isArray(thread?.messages) ? thread.messages : [];
    const replyOutboxId =
      getInboxIdValue(thread) ??
      getInboxIdValue(thread?.lastMessage) ??
      threadMessages.map(getInboxIdValue).find(Boolean);

    if (!replyOutboxId) {
      showContactMailError("Thread inbox id not found.");
      return;
    }

    if (!plainReply) {
      showContactMailError("Please write a reply.");
      return;
    }

    const replyProvider =
      getProviderValue(thread) ||
      getProviderValue(thread?.lastMessage) ||
      getProviderValue(threadMessages.find((message: any) => getProviderValue(message)));

    if (!replyProvider) {
      showContactMailError("Thread provider not found.");
      return;
    }

    const formData = new FormData();
    formData.append("TrackingId", String(thread.trackingId));
    formData.append("ClientId", String(Number(effectiveUserId)));
    formData.append("ReplyBody", sendableReplyBody);
    formData.append("Outboxid", String(replyOutboxId));
    formData.append("CC", mergeRecipients(contactReplyCcEmails, parseRecipientInput(contactReplyCcDraft)).join(","));
    formData.append("BCC", mergeRecipients(contactReplyBccEmails, parseRecipientInput(contactReplyBccDraft)).join(","));
    formData.append("Provider", replyProvider);
    contactReplyAttachments.forEach((file) => {
      formData.append("Attachments", file);
    });

    setIsSendingContactReply(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/email/reply_email`, formData, {
        headers: {
          accept: "*/*",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (response.data?.success === false) {
        throw new Error(response.data?.message || "Failed to send reply");
      }

      const sentMessage = {
        type: "Reply",
        messageId: `temp-${Date.now()}`,
        subject: `Re: ${thread.subject || ""}`.trim(),
        body: sendableReplyBody,
        fromEmail: thread?.lastMessage?.toEmail || thread?.contactEmail || contact?.email || "",
        toEmail: thread.contactEmail || contact?.email || "",
        date: new Date().toISOString(),
        isRead: true,
        contactId: Number(contactId),
        contactName: contact?.full_name || contact?.first_name || thread.contactName,
        attachments: [],
      };

      const updateThreadWithReply = (item: any) => {
        if (item.trackingId !== thread.trackingId) return item;
        const messages = Array.isArray(item.messages) ? item.messages : [];
        const nextMessages = [...messages, sentMessage];
        return {
          ...item,
          messages: nextMessages,
          totalMessages: nextMessages.length,
          lastMessage: sentMessage,
          lastMessageDate: sentMessage.date,
          subject: item.subject || sentMessage.subject,
        };
      };

      setEmailTimeline((prev) => prev.map(updateThreadWithReply));
      setSelectedContactThread((prev: any) => (prev?.trackingId === thread.trackingId ? updateThreadWithReply(prev) : prev));
      setContactReplyText("");
      setContactReplyTrailHtml("");
      setContactReplyCcEmails([]);
      setContactReplyCcDraft("");
      setContactReplyBccEmails([]);
      setContactReplyBccDraft("");
      setShowContactReplyCc(false);
      setShowContactReplyBcc(false);
      setContactReplyAttachments([]);
      setShowContactReplySection(false);
      showContactMailSuccess("Reply sent successfully!");

      if (contactId) {
        fetchEmailTimeline(Number(contactId));
      }
    } catch (error: any) {
      console.error("Failed to send contact reply:", error);
      showContactMailError(error.response?.data?.message || error.message || "Failed to send reply.");
    } finally {
      setIsSendingContactReply(false);
    }
  };

  const handleKraftContactForward = async (thread: any) => {
    if (!selectedContactReplyBlueprint || !thread?.contactId) {
      showContactMailError("Please select a blueprint first.");
      return;
    }

    if (contactReplyKraftInFlightRef.current) return;
    contactReplyKraftInFlightRef.current = true;

    const canKraft = await ensureCanDeductCredit();
    if (!canKraft) {
      contactReplyKraftInFlightRef.current = false;
      return;
    }

    setIsKraftingContactReply(true);
    try {
      const response = await axios.post(
        `${PITCH_GENERATION_API_BASE_URL}/api/email-generation/generate`,
        {
          blueprintId: selectedContactReplyBlueprint,
          contactId: thread.contactId,
          clientId: String(effectiveUserId),
          overwriteExisting: true,
        },
        {
          headers: {
            accept: "*/*",
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (response.data?.success && response.data?.emailBody) {
        replaceContactForwardDraftContent(response.data.emailBody);
        captureKraftInsights(response.data);
        refreshCreditsAfterDeduction();
        window.dispatchEvent(new CustomEvent("creditUpdated", { detail: { clientId: effectiveUserId } }));
      } else {
        throw new Error(response.data?.message || "Failed to generate email");
      }
    } catch (error: any) {
      console.error("Failed to kraft contact forward:", error);
      showContactMailError(error.response?.data?.message || error.message || "Failed to generate email.");
    } finally {
      setIsKraftingContactReply(false);
      contactReplyKraftInFlightRef.current = false;
    }
  };

  const getContactThreadProvider = (thread: any) => {
    const messages = Array.isArray(thread?.messages) ? thread.messages : [];
    return (
      getProviderValue(thread) ||
      getProviderValue(thread?.lastMessage) ||
      getProviderValue(messages.find((message: any) => getProviderValue(message))) ||
      ""
    );
  };

  const openContactForwardSection = (thread: any) => {
    setContactForwardEmail("");
    setContactForwardDraft("");
    setContactForwardCcEmails([]);
    setContactForwardCcDraft("");
    setContactForwardBccEmails([]);
    setContactForwardBccDraft("");
    setContactForwardMessage("");
    setShowContactForwardBcc(false);
    setShowContactForwardCc(false);
    setShowContactReplySection(false);
    setShowContactForwardSection(true);
  };

  const closeContactForwardSection = () => {
    if (isForwardingContactEmail) return;
    setContactForwardEmail("");
    setContactForwardDraft("");
    setContactForwardCcEmails([]);
    setContactForwardCcDraft("");
    setContactForwardBccEmails([]);
    setContactForwardBccDraft("");
    setContactForwardMessage("");
    setShowContactForwardBcc(false);
    setShowContactForwardCc(false);
    setShowContactForwardSection(false);
  };

  // The To panel keeps a single committed address; fall back to whatever is
  // still uncommitted in the chip input so a click straight from typing works.
  const getContactForwardRecipient = () =>
    (contactForwardEmail.trim() || parseRecipientInput(contactForwardDraft)[0] || "").trim();

  const handleForwardContactEmail = async (thread: any) => {
    const forwardRecipient = getContactForwardRecipient();
    if (!thread?.trackingId || !forwardRecipient || !contactForwardMessage.trim()) return;

    const threadMessages = Array.isArray(thread?.messages) ? thread.messages : [];
    const forwardOutboxId =
      getInboxIdValue(thread) ??
      getInboxIdValue(thread?.lastMessage) ??
      threadMessages.map(getInboxIdValue).find(Boolean);

    if (!forwardOutboxId) {
      showContactMailError("Thread inbox id not found.");
      return;
    }

    const forwardProvider = getContactThreadProvider(thread);
    if (!forwardProvider) {
      showContactMailError("Thread provider not found.");
      return;
    }

    setIsForwardingContactEmail(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/Forward/forward-email`,
        {
          trackingId: thread.trackingId,
          clientId: Number(effectiveUserId),
          forwardToEmail: forwardRecipient,
          forwardMessage: getSendableContactReplyBody(contactForwardMessage),
          outboxId: forwardOutboxId,
          ccEmail: mergeRecipients(contactForwardCcEmails, parseRecipientInput(contactForwardCcDraft)).join(","),
          bccEmail: mergeRecipients(contactForwardBccEmails, parseRecipientInput(contactForwardBccDraft)).join(","),
          Provider: forwardProvider,
        },
        {
          headers: {
            accept: "*/*",
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (response.data?.success === false) {
        throw new Error(response.data?.message || "Failed to forward email");
      }

      showContactMailSuccess("Email forwarded successfully!");
      setContactForwardEmail("");
      setContactForwardDraft("");
      setContactForwardCcEmails([]);
      setContactForwardCcDraft("");
      setContactForwardBccEmails([]);
      setContactForwardBccDraft("");
      setContactForwardMessage("");
      setShowContactForwardBcc(false);
      setShowContactForwardCc(false);
      setShowContactForwardSection(false);
    } catch (error: any) {
      console.error("Failed to forward contact email:", error);
      showContactMailError(error.response?.data?.message || error.message || "Failed to forward email.");
    } finally {
      setIsForwardingContactEmail(false);
    }
  };

  const handleSaveContactReplyDraft = async (thread: any) => {
    const draftBody = getDraftContactReplyBody(contactReplyText || "");

    if (!getPlainText(draftBody).trim() || !thread?.contactId) {
      return;
    }

    setIsSavingContactReplyDraft(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/Crm/contacts/update-email`,
        {
          clientId: Number(effectiveUserId),
          contactId: thread.contactId,
          gptGenerate: false,
          emailSubject: null,
          emailBody: draftBody,
        },
        {
          headers: {
            accept: "*/*",
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (response.data?.success === false) {
        throw new Error(response.data?.message || "Failed to save draft");
      }

      showContactMailSuccess("Draft saved successfully!");
    } catch (error: any) {
      console.error("Failed to save contact reply draft:", error);
      showContactMailError(error.response?.data?.message || error.message || "Failed to save draft.");
    } finally {
      setIsSavingContactReplyDraft(false);
    }
  };

  const renderEmailActions = (email: any, inline = false) => {
    const pinned = isEmailPinned(email);
    const isPinning = pinningEmailId === email.trackingId;

    return (
      <div style={inline ? { position: "relative", display: "inline-flex", zIndex: 10 } : { position: "absolute", top: 0, right: 0, zIndex: 10 }}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            const nextAnchor = emailActionsAnchor === email.trackingId ? null : email.trackingId;
            setEmailActionsAnchor(nextAnchor);
          }}
          style={{
            border: "none",
            background: "#ebebeb",
            borderRadius: "50%",
            width: inline ? 28 : 32,
            height: inline ? 28 : 32,
            cursor: "pointer",
          }}
          title="Email actions"
        >
          <FontAwesomeIcon icon={faEllipsisV} />
        </button>

        {emailActionsAnchor === email.trackingId && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 38,
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
              zIndex: 30,
              minWidth: 150,
              overflow: "hidden",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => handleToggleEmailPin(email)}
              disabled={isPinning}
              style={menuBtnStyle}
              className="flex gap-2 items-center"
            >
              <div style={menuIconStyle}>
                {pinned ? (
                  <PinOff size={19} color="#3f9f42" strokeWidth={2.5} />
                ) : (
                  <Pin size={21} color="#3f9f42" strokeWidth={2} />
                )}
              </div>
              <span className="font-[600]" style={{ color: "#3f9f42" }}>
                {isPinning ? "Updating..." : pinned ? "Unpin" : "Pin"}
              </span>
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleEmailDelete(email, "Permanent");
              }}
              style={menuBtnStyle}
              className="flex gap-2 items-center"
            >
              <div style={menuIconStyle}>
                <FontAwesomeIcon
                  icon={faTrashAlt}
                  style={{ color: "#3f9f42", fontSize: 18 }}
                />
              </div>
              <span className="font-[600]" style={{ color: "#3f9f42" }}>Delete permanently</span>
            </button>
          </div>
        )}
      </div>
    );
  };
  //IST Formatter
  // const formatDateTimeIST = (dateString?: string) => {
  //   if (!dateString) return "-";

  //   return new Intl.DateTimeFormat("en-IN", {
  //     timeZone: "Asia/Kolkata",
  //     day: "2-digit",
  //     month: "short",
  //     year: "numeric",
  //     hour: "2-digit",
  //     minute: "2-digit",
  //     hour12: true,
  //   }).format(new Date(dateString));
  // };

  // const formatTimeIST = (dateString?: string) => {
  //   if (!dateString) return "-";

  //   return new Intl.DateTimeFormat("en-IN", {
  //     timeZone: "Asia/Kolkata",
  //     hour: "2-digit",
  //     minute: "2-digit",
  //     hour12: true,
  //   }).format(new Date(dateString));
  // };
  // ✅ Using imported formatters from dateFormatters common
  // For backwards compatibility, create aliases to the imported functions
  const formatDateTimeIST = formatDateTimeLocal;
  const formatTimeIST = formatTimeLocal;

  const linkedInMessageTitle = (message: any) => {
    const isConnectionNote =
      String(message.messageType || "").toLowerCase() === "connection_note";

    return isConnectionNote ? "Connection note sent" : "LinkedIn message sent";
  };

  const renderLinkedInTimelineItem = (message: any, index: number) => {
    const itemKey = String(message.msgUid || message.id || index);
    const isExpanded = expandedLinkedInId === itemKey;
    const body = message.body || "";
    const snippet = body.length > 180 ? `${body.slice(0, 180)}…` : body;

    return (
      <div key={`linkedin-${itemKey}`} style={{ marginBottom: 24 }}>
        {/* Row: timeline dot + content */}
        <div style={{ display: "flex", gap: 16, paddingBottom: 8 }}>
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
              <span style={{ color: "#666" }}>
                LinkedIn{message.markedFrom ? ` (${message.markedFrom})` : ""}
              </span>
            </div>

            <div
              style={{
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Linkedin size={16} color="#0a66c2" />
              {linkedInMessageTitle(message)}
            </div>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
              {formatDateTimeIST(message.sentAt || message.generatedAt)}
            </div>

            {/* Message preview */}
            <div style={{ background: "#f9fafb", padding: 12, borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                Message
              </div>
              <div
                style={{
                  color: "#666",
                  fontSize: 13,
                  whiteSpace: "pre-wrap",
                }}
              >
                {snippet || "No message content"}
              </div>
              <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                {message.characterCount} characters
              </div>
            </div>
          </div>
        </div>

        {/* Full message toggle — OUTSIDE the flex row */}
        {body && (
          <div
            className={`email-preview-toggle ${isExpanded ? "submenu-open" : ""}`}
            onClick={() => setExpandedLinkedInId(isExpanded ? null : itemKey)}
            style={{ marginTop: 15, cursor: "pointer" }}
          >
            <span>{isExpanded ? "Hide message" : "Show message"}</span>
            <span className="submenu-arrow">
              <FontAwesomeIcon icon={faAngleRight} />
            </span>
          </div>
        )}

        {isExpanded && (
          <div
            style={{
              marginTop: 12,
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 16,
              fontSize: 14,
              lineHeight: 1.6,
              color: "#374151",
              whiteSpace: "pre-wrap",
            }}
          >
            {body}
          </div>
        )}
      </div>
    );
  };
  const fetchContact = async () => {
    if (!contactId || !effectiveUserId) {
      console.error("[ContactDetail] Missing contactId or effectiveUserId", { contactId, effectiveUserId });
      return;
    }

    setLoading(true);
    try {
      let res;
      
      console.log("[ContactDetail] Fetching contact with:", { contactId, effectiveUserId, dataFileId, segmentId });
      
      // Try direct contact fetch first (for mail dashboard)
      try {
        console.log("[ContactDetail] Trying direct contact fetch");
        const directRes = await axios.get(
          `${API_BASE_URL}/api/Crm/contact-by-id`,
          {
            params: {
              contactId: contactId,
              clientId: effectiveUserId,
            },
          }
        );
        
        if (directRes.data) {
          console.log("[ContactDetail] Found contact via direct fetch");
          setContact(directRes.data);
          setEditingContact(directRes.data);
          setError(null);
          setLoading(false);
          return;
        }
      } catch (directError) {
        console.log("[ContactDetail] Direct fetch failed, trying list/segment endpoints");
      }
      
      // If coming from segment, use segment-contacts endpoint
      if (segmentId) {
        console.log("[ContactDetail] Using segment endpoint");
        res = await axios.get(
          `${API_BASE_URL}/api/Crm/segment-contacts`,
          {
            params: {
              clientId: effectiveUserId,
              segmentId: segmentId,
            },
          }
        );
      } else if (dataFileId && dataFileId !== "-1") {
        // If coming from list, use list endpoint
        console.log("[ContactDetail] Using list endpoint with dataFileId:", dataFileId);
        res = await axios.get(
          `${API_BASE_URL}/api/Crm/contacts/List-by-ClientId`,
          {
            params: {
              clientId: effectiveUserId,
              dataFileId: dataFileId,
            },
          }
        );
      } else {
        // Fallback: fetch all contacts
        console.log("[ContactDetail] Using all contacts endpoint");
        res = await axios.get(
          `${API_BASE_URL}/api/Crm/allcontacts/list-by-clientId`,
          {
            params: {
              clientId: effectiveUserId,
            },
          }
        );
      }

      const contacts = res.data?.contacts || [];
      console.log("[v0] API Response - Contacts:", contacts.length);
      console.log("[v0] Looking for contactId:", contactId);
      console.log("[v0] dataFileId:", dataFileId, "segmentId:", segmentId);
      setDetailContacts(contacts);

      // Try to find contact by exact ID match
      const found = contacts.find((c: any) => {
        const match = String(c.id) === String(contactId);
        if (match) {
          console.log("[v0] Found matching contact:", c.full_name, "ID:", c.id);
        }
        return match;
      });

      if (found) {
        console.log("[v0] Setting contact to found contact:", found.full_name);
        setContact(found);
        setEditingContact(found);
        setError(null);
      } else {
        // Contact not found - log detailed info
        console.error(`[v0] Contact ID ${contactId} not found.`);
        console.error(`[v0] Available contact IDs:`, contacts.slice(0, 5).map((c: any) => ({ id: c.id, name: c.full_name })));
        console.error(`[v0] Search params - dataFileId: ${dataFileId}, segmentId: ${segmentId}`);
        
        setContact(null);
        setEditingContact(null);
        setError(`Contact not found. Please ensure you're accessing the contact from the correct list or segment.`);
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
  }, [contactId, effectiveUserId, dataFileId, segmentId]);

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

  // Load contact details up front so the insights dropdown can group by the
  // campaigns this contact belongs to (not only when the Lists tab is opened).
  useEffect(() => {
    if (contactId && !contactDetails) {
      fetchContactDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

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
      "Total notes limit exceeded (Maximum 60,000 characters allowed per contact)."
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

dispatch(closePanel());
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
// ✅ Notes now fetched from timeline API, no separate call needed
// useEffect(() => {
//   if (contactId && effectiveUserId) {
//     fetchNotesHistory();
//   }
// }, [contactId, effectiveUserId]);
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
      dispatch(openPanel("note"));

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
    if (noteEditorRef.current && showNotePanel) {
      // Only update if the content has changed from outside (e.g., loading edit note)
      if (noteEditorRef.current.innerHTML !== noteText) {
        noteEditorRef.current.innerHTML = noteText;
      }
    }
  }, [isEditMode, showNotePanel]);
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

    // Notes
    notesHistory.forEach((note: any) => {
      items.push({
        type: "note",
        time: new Date(note.createdAt).getTime(),
        data: note,
      });
    });

    // Attachments
    attachmentsHistory.forEach((attachment: any) => {
      items.push({
        type: "attachment",
        time: new Date(attachment.createdDate).getTime(),
        data: attachment,
      });
    });

    emailTimeline.forEach((email: any) => {
      const emailTime =
        email.lastMessageDate ||
        email.sentAt ||
        email.SentAt ||
        email.receiveAt ||
        email.ReceiveAt ||
        email.date ||
        email.Date;

      items.push({
        type: "email",
        time: new Date(emailTime || 0).getTime(),
        data: email,
      });
    });

    // LinkedIn messages
    linkedInMessages.forEach((message: any) => {
      items.push({
        type: "linkedin",
        time: new Date(message.activityAt || 0).getTime(),
        data: message,
      });
    });

    // newest → oldest
    return items.sort((a, b) => b.time - a.time);
  }, [editingContact, notesHistory, attachmentsHistory, emailTimeline, linkedInMessages]);

  const extractEmailAddress = (emailString?: string): string => {
    if (!emailString) return "";
    const match = emailString.match(/<(.+?)>/);
    return (match ? match[1] : emailString).trim();
  };

  const extractSenderName = (emailString?: string): string => {
    if (!emailString) return "Unknown";
    const match = emailString.match(/^"?(.+?)"?\s*</);
    if (match) return match[1].replace(/"/g, "").trim();
    return extractEmailAddress(emailString).split("@")[0] || "Unknown";
  };

  const getMailInitials = (email?: string, contactName?: string): string => {
    const name = contactName || extractSenderName(email);
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (parts[0] || email || "?").substring(0, 1).toUpperCase();
  };

  const formatMailListDate = (dateString?: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

    if (diffDays === 0) {
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    }
    if (diffDays < 7) {
      return date.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getContactMailPreview = (body?: string): string => {
    if (!body) return "No preview available";
    const textarea = document.createElement("textarea");
    textarea.innerHTML = body;
    const cleanText = textarea.value
      .replace(/<style[^>]*>.*?<\/style>/gis, "")
      .replace(/<script[^>]*>.*?<\/script>/gis, "")
      .replace(/<!--.*?-->/gs, "")
      .replace(/<head[^>]*>.*?<\/head>/gis, "")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&gt;/g, ">")
      .replace(/&lt;/g, "<")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, "\"")
      .replace(/&#39;/g, "'")
      .replace(/&#x[0-9A-Fa-f]+;/g, "")
      .replace(/&#[0-9]+;/g, "")
      .replace(/\{[^}]*\}/g, "")
      .replace(/v\\:\*|o\\:\*|w\\:\*/g, "")
      .replace(/behavior:url\([^)]*\)/g, "")
      .replace(/mso-[^;:]*:[^;]*/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText || cleanText.length < 5 || /^[\W_\s]+$/.test(cleanText)) {
      return "No preview available";
    }

    return cleanText.substring(0, 100) + (cleanText.length > 100 ? "..." : "");
  };

  const formatContactEmailBody = (body?: string): string => {
    if (!body) return "<p>No email body available</p>";
    const containsActualHtml = /<\/?(?:html|head|body|div|table|p|span|font|blockquote|br)\b/i.test(body);
    const containsEncodedHtml = /&lt;\/?(?:html|head|body|div|table|p|span|font|blockquote|br)\b/i.test(body);

    if (containsActualHtml || !containsEncodedHtml) return body;

    return body
      .replace(/&gt;/g, ">")
      .replace(/&lt;/g, "<")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, "\"")
      .replace(/&#39;/g, "'");
  };

  const contactMailThreads = useMemo(() => {
    const toThread = (email: any, index: number) => {
      const messages = getEmailPreviewMessages(email).map((message: any, messageIndex: number) => ({
        ...message,
        messageId: getMessageIdValue(message) || `${getTrackingIdValue(email) || index}-${messageIndex}`,
        subject: message.subject || message.Subject || email.subject || email.Subject || "No subject",
        body: message.body || "",
        fromEmail: message.fromEmail || message.FromEmail || email.fromEmail || email.FromEmail || email.senderEmailId || email.SenderEmailId || "",
        toEmail: message.toEmail || message.ToEmail || email.toEmail || email.ToEmail || contact?.email || "",
        date: message.date || message.Date || email.sentAt || email.SentAt || email.receiveAt || email.ReceiveAt || "",
        contactName: message.contactName || message.ContactName || email.contactName || email.ContactName || contact?.full_name || contact?.first_name,
        attachments: message.attachments || message.Attachments || [],
        type: message.type || (email.emailType === "sent" ? "Sent" : "Reply"),
        isRead: message.isRead ?? true,
        contactId: message.contactId ?? message.ContactId ?? Number(contactId),
        inboxid: getInboxIdValue(message) ?? getInboxIdValue(email) ?? message.inboxid ?? message.inboxId ?? message.InboxId ?? email.inboxid ?? email.inboxId ?? email.InboxId,
        Provider: getProviderValue(message) || getProviderValue(email),
        provider: getProviderValue(message) || getProviderValue(email),
      }));
      const sortedMessages = [...messages].sort((a: any, b: any) => getMessageTime(a) - getMessageTime(b));
      const latestMessage = sortedMessages[sortedMessages.length - 1] || {};
      const trackingId = getTrackingIdValue(email) || getTrackingIdValue(latestMessage) || getMessageIdValue(latestMessage) || `contact-mail-${index}`;
      const lastMessageDate = latestMessage.date || email.sentAt || email.SentAt || email.receiveAt || email.ReceiveAt || "";

      return {
        ...email,
        trackingId,
        subject: email.subject || email.Subject || latestMessage.subject || "No subject",
        contactEmail: contact?.email || email.toEmail || email.ToEmail || email.fromEmail || email.FromEmail || latestMessage.toEmail || latestMessage.fromEmail || "",
        totalMessages: sortedMessages.length,
        lastMessageDate,
        hasUnread: sortedMessages.some((message: any) => message.isRead === false),
        contactId: Number(contactId),
        inboxid: getInboxIdValue(email) ?? getInboxIdValue(latestMessage) ?? sortedMessages.map(getInboxIdValue).find(Boolean) ?? email.inboxid ?? email.inboxId ?? email.InboxId ?? latestMessage.inboxid ?? latestMessage.inboxId ?? latestMessage.InboxId,
        Provider: getProviderValue(email) || getProviderValue(latestMessage),
        provider: getProviderValue(email) || getProviderValue(latestMessage),
        messages: sortedMessages,
        lastMessage: latestMessage,
      };
    };

    const byTrackingId = new Map<string, any>();

    emailTimeline.map(toThread).forEach((thread: any) => {
      const key = thread.trackingId;
      const existing = byTrackingId.get(key);

      if (!existing) {
        byTrackingId.set(key, thread);
        return;
      }

      const messagesById = new Map<string, any>();
      [...existing.messages, ...thread.messages].forEach((message: any, index: number) => {
        const messageKey = getMessageIdValue(message) || `${key}-${index}-${message.date || ""}`;
        if (!messagesById.has(messageKey)) {
          messagesById.set(messageKey, message);
        }
      });
      const messages = Array.from(messagesById.values()).sort((a: any, b: any) => getMessageTime(a) - getMessageTime(b));
      const latestMessage = messages[messages.length - 1] || existing.lastMessage || thread.lastMessage || {};

      byTrackingId.set(key, {
        ...existing,
        ...thread,
        subject: thread.subject || existing.subject,
        totalMessages: messages.length,
        lastMessageDate: latestMessage.date || thread.lastMessageDate || existing.lastMessageDate,
        hasUnread: messages.some((message: any) => message.isRead === false),
        messages,
        lastMessage: latestMessage,
      });
    });

    return Array.from(byTrackingId.values())
      .sort((a: any, b: any) => new Date(b.lastMessageDate || 0).getTime() - new Date(a.lastMessageDate || 0).getTime());
  }, [emailTimeline, contact, contactId]);

  const visibleContactMailThreads = useMemo(() => {
    if (contactMailTab === "sent") {
      return contactMailThreads
        .flatMap((thread: any) => {
          const threadMessages = Array.isArray(thread.messages) ? thread.messages : [];
          const sentMessages = threadMessages.filter(
            (message: any) => String(message.type || "").toLowerCase() === "sent"
          );

          return sentMessages.map((message: any, messageIndex: number) => ({
            ...thread,
            sentItemKey: `${thread.trackingId}-sent-${getMessageIdValue(message) || messageIndex}`,
            subject: message.subject || thread.subject,
            totalMessages: 1,
            messages: [message],
            lastMessage: message,
            lastMessageDate: message.date || thread.lastMessageDate,
          }));
        })
        .sort((a: any, b: any) => getMessageTime(b.lastMessage) - getMessageTime(a.lastMessage));
    }

    return contactMailThreads.filter((thread: any) => {
      const threadMessages = Array.isArray(thread.messages) ? thread.messages : [];
      return threadMessages.some((message: any) => String(message.type || "").toLowerCase() !== "sent");
    });
  }, [contactMailTab, contactMailThreads]);

  const getContactMailViewKey = (thread: any): string =>
    thread?.sentItemKey || thread?.trackingId || "";

  useEffect(() => {
    const trackingId = selectedContactThread?.trackingId;

    if ((!showContactReplySection && !showContactForwardSection) || !trackingId) {
      return;
    }

    let isCancelled = false;

    const fetchContactReplyTrail = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/Inbox/email-trail?trackingId=${encodeURIComponent(trackingId)}`,
          {
            headers: {
              accept: "*/*",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );

        if (isCancelled) return;

        const emailTrail = response.data?.emailTrail || "";
        if (emailTrail) {
          const formattedTrail = formatContactReplyEmailTrail(emailTrail);
          const collapsedTrail = buildCollapsedContactReplyTrail(formattedTrail);
          if (showContactForwardSection) {
            setContactForwardMessage((currentForwardMessage) =>
              appendContactReplyTrail(currentForwardMessage, formattedTrail)
            );
          } else {
            setContactReplyTrailHtml(collapsedTrail);
            setContactReplyText((currentReplyText) => {
              const { draftHtml: currentDraftHtml } = splitContactReplyTrail(currentReplyText || "");
              const compactDraftHtml = currentDraftHtml.replace(/(?:<br\s*\/?>|\s)+$/gi, "");
              return `${compactDraftHtml}${collapsedTrail}`;
            });
          }
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Failed to fetch contact reply trail:", error);
        }
      }
    };

    fetchContactReplyTrail();

    return () => {
      isCancelled = true;
    };
  }, [showContactReplySection, showContactForwardSection, selectedContactThread?.trackingId, token]);

  // Load the mailbox signature into reply and forward drafts. The thread
  // carries the inbox it arrived on, so the signature is resolved from that
  // inbox rather than the compose "From" selection.
  useEffect(() => {
    const thread = selectedContactThread;

    if ((!showContactReplySection && !showContactForwardSection) || !thread || !effectiveUserId) {
      return;
    }

    const threadMessages = Array.isArray(thread?.messages) ? thread.messages : [];
    const signatureInboxId =
      getInboxIdValue(thread) ??
      getInboxIdValue(thread?.lastMessage) ??
      threadMessages.map(getInboxIdValue).find(Boolean);
    const signatureProvider = normalizeSignatureProvider(getContactThreadProvider(thread));

    if (!signatureInboxId || !signatureProvider) {
      return;
    }

    let isCancelled = false;

    const fetchContactReplySignature = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/Crm/Single_signatures/${effectiveUserId}?InboxId=${signatureInboxId}&Provider=${encodeURIComponent(signatureProvider)}&Mathod=Inbox`,
          {
            headers: {
              accept: "*/*",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );

        if (isCancelled) return;

        const signatureHtml = response.data?.signatureHtml || "";
        if (!signatureHtml) return;

        if (showContactForwardSection) {
          setContactForwardMessage((currentForwardMessage) =>
            appendContactForwardSignature(currentForwardMessage, signatureHtml)
          );
        } else {
          setContactReplyText((currentReplyText) => {
            const { draftHtml, trailHtml } = splitContactReplyTrail(currentReplyText || "");
            if (draftHtml.includes(contactReplySignatureMarker)) {
              return currentReplyText;
            }

            const compactDraftHtml = draftHtml.replace(/(?:<br\s*\/?>|\s)+$/gi, "");
            return `${compactDraftHtml}<br/><br/><div ${contactReplySignatureMarker}>${signatureHtml}</div>${trailHtml || contactReplyTrailHtml}`;
          });
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Failed to fetch contact reply signature:", error);
        }
      }
    };

    fetchContactReplySignature();

    return () => {
      isCancelled = true;
    };
  }, [showContactReplySection, showContactForwardSection, selectedContactThread?.trackingId, effectiveUserId, token]);

  useEffect(() => {
    setSelectedContactThread(null);
    setContactCollapsedEmails({});
    setExpandedContactMessageHeaders({});
    setContactReplyText("");
    setContactReplyTrailHtml("");
    setContactReplyCcEmails([]);
    setContactReplyCcDraft("");
    setContactReplyBccEmails([]);
    setContactReplyBccDraft("");
    setShowContactReplyCc(false);
    setShowContactReplyBcc(false);
    setContactReplyAttachments([]);
    setShowContactReplySection(false);
    setIsContactReplyExpanded(false);
    setOpenContactReplyDeviceDropdown(false);
    setShowContactForwardSection(false);
    setContactForwardEmail("");
    setContactForwardCcEmails([]);
    setContactForwardCcDraft("");
    setContactForwardBccEmails([]);
    setContactForwardBccDraft("");
    setContactForwardMessage("");
    setShowContactForwardCc(false);
    setShowContactForwardBcc(false);
  }, [contactMailTab, contactId]);

  useEffect(() => {
    if (
      selectedContactThread &&
      !visibleContactMailThreads.some(
        (thread: any) => getContactMailViewKey(thread) === getContactMailViewKey(selectedContactThread)
      )
    ) {
      setSelectedContactThread(null);
      setContactCollapsedEmails({});
      setExpandedContactMessageHeaders({});
      setContactReplyText("");
      setContactReplyTrailHtml("");
      setContactReplyCcEmails([]);
      setContactReplyCcDraft("");
      setContactReplyBccEmails([]);
      setContactReplyBccDraft("");
      setShowContactReplyCc(false);
      setShowContactReplyBcc(false);
      setContactReplyAttachments([]);
      setShowContactReplySection(false);
      setIsContactReplyExpanded(false);
      setOpenContactReplyDeviceDropdown(false);
      setShowContactForwardSection(false);
      setContactForwardEmail("");
      setContactForwardCcEmails([]);
      setContactForwardCcDraft("");
      setContactForwardBccEmails([]);
      setContactForwardBccDraft("");
      setContactForwardMessage("");
      setShowContactForwardCc(false);
      setShowContactForwardBcc(false);
      return;
    }

    if (selectedContactThread) {
      const refreshedThread = visibleContactMailThreads.find(
        (thread: any) => getContactMailViewKey(thread) === getContactMailViewKey(selectedContactThread)
      );

      if (refreshedThread && refreshedThread !== selectedContactThread) {
        setSelectedContactThread(refreshedThread);
      }
    }
  }, [visibleContactMailThreads, selectedContactThread]);

  const getContactMessageCollapseKey = (thread: any, message: any, index: number) =>
    `${thread.trackingId}-${message.messageId}-${index}`;

  const buildDefaultContactCollapseState = (thread: any) => {
    const collapsed: { [key: string]: boolean } = {};
    [...(thread.messages || [])]
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .forEach((message: any, index: number) => {
        collapsed[getContactMessageCollapseKey(thread, message, index)] = index !== 0;
      });
    return collapsed;
  };

  const handleContactThreadSelect = (thread: any) => {
    setSelectedContactThread(thread);
    setContactReplyText("");
    setContactReplyTrailHtml("");
    setContactReplyCcEmails([]);
    setContactReplyCcDraft("");
    setContactReplyBccEmails([]);
    setContactReplyBccDraft("");
    setShowContactReplyCc(false);
    setShowContactReplyBcc(false);
    setContactReplyAttachments([]);
    setShowContactReplySection(false);
    setIsContactReplyExpanded(false);
    setOpenContactReplyDeviceDropdown(false);
    setShowContactForwardSection(false);
    setContactForwardEmail("");
    setContactForwardCcEmails([]);
    setContactForwardCcDraft("");
    setContactForwardBccEmails([]);
    setContactForwardBccDraft("");
    setContactForwardMessage("");
    setShowContactForwardCc(false);
    setShowContactForwardBcc(false);
    setContactCollapsedEmails(buildDefaultContactCollapseState(thread));
  };

  const toggleContactEmailCollapse = (key: string) => {
    setContactCollapsedEmails((prev) => ({ ...prev, [key]: false }));
  };

  const toggleContactMessageHeader = (key: string) => {
    setExpandedContactMessageHeaders((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderContactMailList = () => {
    if (isLoadingHistory) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: 12 }}>
          <div style={{ width: 24, height: 24, border: "3px solid #eaf5ea", borderTop: "3px solid #3f9f42", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          <span style={{ fontSize: 13, color: "#9aa1ab" }}>Loading messages...</span>
        </div>
      );
    }

    if (visibleContactMailThreads.length === 0) {
      return <div className="no-mails">No {contactMailTab === "sent" ? "sent emails" : "inbox emails"} found</div>;
    }

    return (
      <div className="list-scroll">
        {visibleContactMailThreads.map((thread: any) => {
          const lastMessage = thread.lastMessage || thread.messages[thread.messages.length - 1] || {};
          const threadViewKey = getContactMailViewKey(thread);
          const isSelected = getContactMailViewKey(selectedContactThread) === threadViewKey;
          const attachmentCount = thread.messages.reduce((count: number, message: any) => count + (message.attachments?.length || 0), 0);
          const pinned = isEmailPinned(thread);

          return (
            <div
              key={threadViewKey}
              className={`mail-item ${thread.hasUnread ? "unread" : ""} ${isSelected ? "selected" : ""}`}
              onClick={() => handleContactThreadSelect(thread)}
            >
              <div className="mail-avatar">{getMailInitials(lastMessage.fromEmail || thread.contactEmail, lastMessage.contactName)}</div>
              <div className="mail-content">
                <div className="mail-item-header">
                  <span className="mail-sender">{lastMessage.contactName || extractSenderName(lastMessage.fromEmail || thread.contactEmail)}</span>
                  <span className="mail-row-actions">
                    <span className="mail-date">{formatMailListDate(thread.lastMessageDate)}</span>
                    {pinned && (
                      <span className="mail-pinned-indicator" title="Pinned" aria-label="Pinned">
                        <Pin size={15} strokeWidth={2.5} />
                      </span>
                    )}
                    <span className="mail-action-wrapper" onClick={(event) => event.stopPropagation()}>
                      {renderEmailActions(thread, true)}
                    </span>
                  </span>
                </div>
                <div className="mail-subject">
                  {thread.totalMessages > 1 && <span className="reply-icon">↩ {thread.totalMessages}</span>}
                  {attachmentCount > 0 && (
                    <span title={`${attachmentCount} attachment${attachmentCount > 1 ? "s" : ""}`} style={{ display: "inline-flex", alignItems: "center", marginRight: 6, color: "#6b7280" }}>
                      <FontAwesomeIcon icon={faPaperclip} />
                    </span>
                  )}
                  {thread.subject}
                </div>
                <div className="mail-preview">{getContactMailPreview(lastMessage.body)}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderContactMailReader = () => {
    if (!selectedContactThread) {
      return (
        <div className="read-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          <p>Select an email to read it here</p>
        </div>
      );
    }

    const activeThread =
      visibleContactMailThreads.find(
        (thread: any) => getContactMailViewKey(thread) === getContactMailViewKey(selectedContactThread)
      ) ||
      selectedContactThread;
    const readerMessages = contactMailTab === "sent"
      ? [...(activeThread.messages || [])]
      : [...(activeThread.messages || [])].filter(
          (message: any) => String(message.type || "").toLowerCase() !== "sent"
        );
    const sortedMessages = readerMessages.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
      <>
        <div className="read-head">
          <h1 className="read-subject">{activeThread.subject}</h1>
          <div className="read-head-actions">
            <button
              className="head-icon danger"
              title="Delete"
              onClick={() => handleEmailDelete(activeThread, "Permanent")}
            >
              <FontAwesomeIcon icon={faTrashAlt} style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>
        <button
          type="button"
          className="scroll-to-bottom-btn"
          title="Scroll to bottom"
          onClick={() => {
            const el = contactMailDetailRef.current;
            if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
        </button>
        <div
          className="mail-detail contact-mail-detail"
          ref={contactMailDetailRef}
          style={{ paddingBottom: contactMailTab !== "sent" && !showContactReplySection && !showContactForwardSection ? 82 : 0 }}
        >
          {sortedMessages.slice(0, 1).map((message: any, index: number) => {
            const uniqueKey = getContactMessageCollapseKey(activeThread, message, index);
            const isCollapsed = contactCollapsedEmails[uniqueKey] ?? index !== 0;
            const isHeaderExpanded = expandedContactMessageHeaders[uniqueKey];

            return (
              <div key={uniqueKey} style={{ paddingBottom: index < sortedMessages.length - 1 ? 16 : 0, borderBottom: index < sortedMessages.length - 1 ? "1px solid #e5e7eb" : "none" }}>
                <div className="mail-detail-header">
                  <div className="mail-detail-top">
                    <div className="mail-detail-avatar">{getMailInitials(message.fromEmail, message.contactName)}</div>
                    <div className="mail-detail-info">
                      <div className="mail-detail-sender">{message.contactName || extractSenderName(message.fromEmail)}</div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{extractEmailAddress(message.fromEmail)}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                        <span style={{ color: "#6b7280", fontSize: 13 }}>To:</span>
                        <span style={{ color: "#2563eb", fontSize: 13 }}>{extractEmailAddress(message.toEmail || activeThread.contactEmail)}</span>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleContactMessageHeader(uniqueKey);
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: "2px 4px",
                            color: "#6b7280",
                            display: "inline-flex",
                            alignItems: "center",
                            marginLeft: 4,
                          }}
                          title={isHeaderExpanded ? "Hide details" : "Show details"}
                        >
                          <FontAwesomeIcon
                            icon={faAngleRight}
                            style={{
                              width: 10,
                              height: 10,
                              transform: isHeaderExpanded ? "rotate(90deg)" : "rotate(0deg)",
                              transition: "transform 0.2s",
                            }}
                          />
                        </button>
                      </div>
                      {isHeaderExpanded && (
                        <div
                          style={{
                            marginTop: 8,
                            padding: "8px 0",
                            fontSize: 13,
                            lineHeight: 1.8,
                            color: "#6b7280",
                            borderTop: "1px solid #e5e7eb",
                          }}
                        >
                          <div><strong style={{ color: "#374151" }}>From:</strong> {message.contactName || extractSenderName(message.fromEmail)} &lt;{extractEmailAddress(message.fromEmail)}&gt;</div>
                          <div><strong style={{ color: "#374151" }}>To:</strong> {extractEmailAddress(message.toEmail || activeThread.contactEmail)}</div>
                          <div><strong style={{ color: "#374151" }}>Date:</strong> {formatDateTimeIST(message.date)}</div>
                          <div><strong style={{ color: "#374151" }}>Subject:</strong> {message.subject || activeThread.subject}</div>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button
                        type="button"
                        title="Forward"
                        aria-label="Forward email"
                        className="btn-default"
                        onClick={(event) => {
                          event.stopPropagation();
                          openContactForwardSection(activeThread);
                        }}
                      >
                        <FontAwesomeIcon icon={faShare} />
                      </button>
                      <div className="mail-detail-date">{formatDateTimeIST(message.date)}</div>
                    </div>
                  </div>
                </div>
                {isCollapsed ? (
                  <div
                    className="mail-body-preview"
                    onClick={() => toggleContactEmailCollapse(uniqueKey)}
                    style={{ padding: "16px 24px", borderLeft: "3px solid #e5e7eb", borderRadius: 4 }}
                  >
                    {getContactMailPreview(message.body)}
                  </div>
                ) : (
                  <div>
                    <div className="mail-body" style={{ maxWidth: "100%", padding: 0 }}>
                      <EmailIframe
                        html={formatContactEmailBody(message.body)}
                      />
                    </div>
                  </div>
                )}
                <div style={{ padding: "0 24px 12px" }}>{renderMessageAttachments(message.attachments)}</div>
              </div>
            );
          })}
          {contactMailTab !== "sent" && !showContactReplySection && !showContactForwardSection && (
            <div className="reply-button-sticky">
              <button
                type="button"
                className="btn-default"
                onClick={() => {
                  setShowContactForwardSection(false);
                  setShowContactReplySection(true);
                }}
              >
                <FontAwesomeIcon icon={faReply} className="reply-pill-icon" />
                Reply
              </button>
            </div>
          )}
        </div>
        {showContactForwardSection && (
          <form
            className="reply-section"
            onSubmit={(event) => {
              event.preventDefault();
              handleForwardContactEmail(activeThread);
            }}
            style={{
              marginTop: 24,
              padding: "24px 24px 20px",
              borderTop: "1px solid #e5e7eb",
              background: "#fff",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <label style={{ fontWeight: 500, fontSize: 14, color: "#374151" }}>Forward</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select
                  value={selectedContactReplyBlueprint || ""}
                  onChange={(event) => setSelectedContactReplyBlueprint(event.target.value ? Number(event.target.value) : null)}
                  style={{ padding: "6px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, background: "#fff" }}
                >
                  <option value="">Select Blueprint</option>
                  {contactReplyBlueprints.map((blueprint) => (
                    <option key={blueprint.id} value={blueprint.id}>{blueprint.templateName}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleKraftContactForward(activeThread)}
                  disabled={!selectedContactReplyBlueprint || isKraftingContactReply || !activeThread.contactId}
                  className="btn-default"
                >
                  {isKraftingContactReply ? "Krafting..." : "Kraft"}
                </button>
              </div>
            </div>
            <style>
              {`
                .contact-email-workspace .reply-section .rich-text-editor > div {
                  min-height: 160px !important;
                  height: auto !important;
                  overflow-y: visible !important;
                }
              `}
            </style>
            <div style={{ display: "grid", gap: 12, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <RecipientChipInput
                  prefixLabel="To"
                  recipients={contactForwardEmail.trim() ? [contactForwardEmail.trim()] : []}
                  draft={contactForwardDraft}
                  onRecipientsChange={(recipients) => setContactForwardEmail(recipients[0] || "")}
                  onDraftChange={setContactForwardDraft}
                  placeholder="Enter recipient email"
                  maxRecipients={1}
                  containerStyle={{ width: "100%", minWidth: 0, maxWidth: "none", flex: 1 }}
                />
                {!showContactForwardCc && (
                  <button
                    type="button"
                    onClick={() => setShowContactForwardCc(true)}
                    style={{ padding: "10px 12px", background: "#fff", color: "#2563eb", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 500, whiteSpace: "nowrap" }}
                  >
                    CC
                  </button>
                )}
                {!showContactForwardBcc && (
                  <button
                    type="button"
                    onClick={() => setShowContactForwardBcc(true)}
                    style={{ padding: "10px 12px", background: "#fff", color: "#2563eb", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 500, whiteSpace: "nowrap" }}
                  >
                    BCC
                  </button>
                )}
              </div>
              {showContactForwardCc && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <RecipientChipInput
                    recipients={contactForwardCcEmails}
                    draft={contactForwardCcDraft}
                    onRecipientsChange={setContactForwardCcEmails}
                    onDraftChange={setContactForwardCcDraft}
                    placeholder="Enter CC email"
                    containerStyle={{ width: "100%", minWidth: 0, maxWidth: "none", flex: 1 }}
                  />
                  <button type="button" onClick={() => { setContactForwardCcEmails([]); setContactForwardCcDraft(""); setShowContactForwardCc(false); }} title="Hide CC" aria-label="Hide CC" style={{ width: 38, height: 38, border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", cursor: "pointer" }}>x</button>
                </div>
              )}
              {showContactForwardBcc && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <RecipientChipInput
                    recipients={contactForwardBccEmails}
                    draft={contactForwardBccDraft}
                    onRecipientsChange={setContactForwardBccEmails}
                    onDraftChange={setContactForwardBccDraft}
                    placeholder="Enter BCC email"
                    containerStyle={{ width: "100%", minWidth: 0, maxWidth: "none", flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setContactForwardBccEmails([]);
                      setContactForwardBccDraft("");
                      setShowContactForwardBcc(false);
                    }}
                    title="Hide BCC"
                    aria-label="Hide BCC"
                    style={{ width: 38, height: 38, border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", cursor: "pointer" }}
                  >
                    x
                  </button>
                </div>
              )}
              <div
                style={{
                  maxWidth: contactForwardEmailWidth === "Mobile" ? "480px" : contactForwardEmailWidth === "Tab" ? "768px" : "100%",
                  margin: "0 auto",
                  width: "100%",
                }}
              >
                <RichTextEditor
                  value={contactForwardMessage}
                  onChange={setContactForwardMessage}
                  showActionButtons
                  onRegenerate={() => handleKraftContactForward(activeThread)}
                  isRegenerating={isKraftingContactReply}
                  regenerateDisabled={!selectedContactReplyBlueprint || !activeThread?.contactId}
                  showDeviceButton
                  outputEmailWidth={contactForwardEmailWidth}
                  openDeviceDropdown={openContactForwardDeviceDropdown}
                  onDeviceDropdownToggle={() => setOpenContactForwardDeviceDropdown((prev) => !prev)}
                  onDeviceWidthChange={(width) => {
                    setContactForwardEmailWidth(width);
                    setOpenContactForwardDeviceDropdown(false);
                  }}
                  onExpandEditor={() => setIsContactForwardExpanded(true)}
                  finalPrompt={kraftFinalPrompt}
                  webSearchData={kraftWebSearchData}
                  insightEmails={kraftEmails}
                  insightNotes={kraftNotes}
                  insightProfessionalSummary={kraftProfessionalSummary}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="button"
                onClick={closeContactForwardSection}
                disabled={isForwardingContactEmail}
                style={{
                  padding: "10px 24px",
                  ...secondaryButtonStyle,
                  borderRadius: 6,
                  cursor: isForwardingContactEmail ? "not-allowed" : "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isForwardingContactEmail ||
                  (!contactForwardEmail.trim() && !contactForwardDraft.trim()) ||
                  !contactForwardMessage.trim()
                }
                className="btn-default"
              >
                {isForwardingContactEmail ? "Forwarding..." : "Forward"}
              </button>
            </div>
          </form>
        )}
        {contactMailTab !== "sent" && showContactReplySection && (
          <div
            className="reply-section"
            style={{
              marginTop: 24,
              padding: "24px 24px 20px",
              borderTop: "1px solid #e5e7eb",
              background: "#fff",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 12,
                flexWrap: "wrap",
              }}
            >
              <label style={{ fontWeight: 500, fontSize: 14, color: "#374151" }}>Write reply</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {!showContactReplyCc && (
                  <button
                    type="button"
                    onClick={() => setShowContactReplyCc(true)}
                    style={{ padding: "6px 12px", background: "#fff", color: "#2563eb", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 500 }}
                  >
                    CC
                  </button>
                )}
                {!showContactReplyBcc && (
                  <button
                    type="button"
                    onClick={() => setShowContactReplyBcc(true)}
                    style={{ padding: "6px 12px", background: "#fff", color: "#2563eb", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 500 }}
                  >
                    BCC
                  </button>
                )}
                <label
                  style={{
                    width: 38,
                    minWidth: 38,
                    height: 38,
                    padding: 0,
                    background: "#fff",
                    color: "#6b7280",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title="Attach files"
                >
                  <FontAwesomeIcon icon={faPaperclip} style={{ color: "#3f9f42" }} />
                  <input
                    type="file"
                    multiple
                    style={{ display: "none" }}
                    onChange={(event) => {
                      const files = event.target.files ? Array.from(event.target.files) : [];
                      if (files.length) setContactReplyAttachments((prev) => [...prev, ...files]);
                      event.target.value = "";
                    }}
                  />
                </label>
                <select
                  value={selectedContactReplyBlueprint || ""}
                  onChange={(event) => setSelectedContactReplyBlueprint(event.target.value ? Number(event.target.value) : null)}
                  style={{
                    padding: "6px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: "pointer",
                    minWidth: 200,
                    background: "#fff",
                  }}
                >
                  <option value="">Select Blueprint</option>
                  {contactReplyBlueprints.map((blueprint) => (
                    <option key={blueprint.id} value={blueprint.id}>
                      {blueprint.templateName}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleKraftContactReply(activeThread)}
                  disabled={!selectedContactReplyBlueprint || isKraftingContactReply || !activeThread.contactId}
                  className="btn-default"
                >
                  {isKraftingContactReply ? "Krafting..." : "Kraft"}
                </button>
              </div>
            </div>
            {(activeThread.contactEmail || contact?.email) && (
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <RecipientChipInput
                  readOnly
                  prefixLabel="To"
                  recipients={[extractEmailAddress(activeThread.contactEmail || contact?.email || "")]}
                  draft=""
                  onRecipientsChange={() => {}}
                  onDraftChange={() => {}}
                  placeholder=""
                  containerStyle={{ width: "100%", minWidth: 0, maxWidth: "none", flex: 1 }}
                />
              </div>
            )}
            {(showContactReplyCc || showContactReplyBcc) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {showContactReplyCc && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <RecipientChipInput
                      recipients={contactReplyCcEmails}
                      draft={contactReplyCcDraft}
                      onRecipientsChange={setContactReplyCcEmails}
                      onDraftChange={setContactReplyCcDraft}
                      placeholder="Enter CC email"
                      containerStyle={{ width: "100%", minWidth: 0, maxWidth: "none", flex: 1 }}
                    />
                    <button type="button" onClick={() => { setContactReplyCcEmails([]); setContactReplyCcDraft(""); setShowContactReplyCc(false); }} style={{ width: 38, border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", cursor: "pointer" }}>x</button>
                  </div>
                )}
                {showContactReplyBcc && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <RecipientChipInput
                      recipients={contactReplyBccEmails}
                      draft={contactReplyBccDraft}
                      onRecipientsChange={setContactReplyBccEmails}
                      onDraftChange={setContactReplyBccDraft}
                      placeholder="Enter BCC email"
                      containerStyle={{ width: "100%", minWidth: 0, maxWidth: "none", flex: 1 }}
                    />
                    <button type="button" onClick={() => { setContactReplyBccEmails([]); setContactReplyBccDraft(""); setShowContactReplyBcc(false); }} style={{ width: 38, border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", cursor: "pointer" }}>x</button>
                  </div>
                )}
              </div>
            )}
            {contactReplyAttachments.length > 0 && (
              <div style={{ marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {contactReplyAttachments.map((file, index) => (
                  <span key={`${file.name}-${file.lastModified}-${index}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 999, fontSize: 12, color: "#374151", background: "#f9fafb" }}>
                    {file.name}
                    <button type="button" onClick={() => setContactReplyAttachments((prev) => prev.filter((_, fileIndex) => fileIndex !== index))} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#ef4444", fontSize: 14, lineHeight: 1 }}>x</button>
                  </span>
                ))}
              </div>
            )}
            <style>
              {`
                .contact-email-workspace .reply-section .rich-text-editor > div {
                  min-height: 160px !important;
                  height: 260px !important;
                  max-height: 360px !important;
                  overflow-y: auto !important;
                  overflow-x: hidden !important;
                  box-sizing: border-box !important;
                  word-break: break-word;
                  overflow-wrap: anywhere;
                }
                .contact-email-workspace .reply-section .rich-text-editor [data-reply-email-trail],
                .contact-email-workspace .reply-section .rich-text-editor .contact-reply-trail-body {
                  max-width: 100% !important;
                  overflow-x: hidden !important;
                  box-sizing: border-box !important;
                  word-break: break-word;
                  overflow-wrap: anywhere;
                }
                .contact-email-workspace .reply-section .rich-text-editor [data-reply-email-trail][data-trail-open="false"] {
                  display: inline-block !important;
                  min-width: 34px !important;
                  min-height: 22px !important;
                  padding: 0 !important;
                  overflow: visible !important;
                  cursor: pointer !important;
                }
                .contact-email-workspace .reply-section .rich-text-editor [data-reply-email-trail][data-trail-open="false"] .contact-reply-trail-toggle {
                  display: inline-flex !important;
                  visibility: visible !important;
                  opacity: 1 !important;
                  position: relative !important;
                  z-index: 1 !important;
                  align-items: center !important;
                  justify-content: center !important;
                  color: #3f9f42 !important;
                  background: #eaf5ea !important;
                  border: 1px solid #cfe7d0 !important;
                  border-radius: 999px !important;
                  font-weight: 700 !important;
                  font-size: 18px !important;
                  line-height: 1 !important;
                  width: 34px !important;
                  height: 22px !important;
                  margin: 0 0 10px 0 !important;
                }
                .contact-email-workspace .reply-section .rich-text-editor [data-reply-email-trail][data-trail-open="false"] .contact-reply-trail-body {
                  display: none !important;
                }
                .contact-email-workspace .reply-section .rich-text-editor [data-reply-email-trail][data-trail-open="true"] {
                  display: block !important;
                }
                .contact-email-workspace .reply-section .rich-text-editor [data-reply-email-trail][data-trail-open="true"] .contact-reply-trail-toggle {
                  display: inline-flex !important;
                  visibility: visible !important;
                  opacity: 1 !important;
                }
                .contact-email-workspace .reply-section .rich-text-editor [data-reply-email-trail][data-trail-open="true"] .contact-reply-trail-body {
                  display: block !important;
                }
                .contact-email-workspace .reply-section .rich-text-editor table,
                .contact-email-workspace .reply-section .rich-text-editor img {
                  max-width: 100% !important;
                  height: auto !important;
                }
                .contact-email-workspace .reply-section .rich-text-editor * {
                  max-width: 100%;
                }
              `}
            </style>
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  maxWidth: contactReplyEmailWidth === "Mobile" ? "480px" : contactReplyEmailWidth === "Tab" ? "768px" : "100%",
                  margin: "0 auto",
                  // Anchors the floated "Save draft" button to the editor, so it
                  // follows the device-preview width instead of the full row.
                  position: "relative",
                }}
              >
                {/* Insights / regenerate / copy / device / expand all live in
                    the editor toolbar — same controls as Inbox and Output. */}
                <RichTextEditor
                  value={contactReplyText}
                  onChange={setContactReplyText}
                  height={260}
                  showActionButtons
                  onRegenerate={() => handleKraftContactReply(activeThread)}
                  isRegenerating={isKraftingContactReply}
                  regenerateDisabled={!selectedContactReplyBlueprint || !activeThread?.contactId}
                  isCopyText={isCopyContactReplyText}
                  onCopyToClipboard={copyContactReplyToClipboard}
                  showDeviceButton
                  outputEmailWidth={contactReplyEmailWidth}
                  openDeviceDropdown={openContactReplyDeviceDropdown}
                  onDeviceDropdownToggle={() => setOpenContactReplyDeviceDropdown((prev) => !prev)}
                  onDeviceWidthChange={(width) => {
                    setContactReplyEmailWidth(width);
                    setOpenContactReplyDeviceDropdown(false);
                  }}
                  onExpandEditor={() => setIsContactReplyExpanded(true)}
                  finalPrompt={kraftFinalPrompt}
                  webSearchData={kraftWebSearchData}
                  insightEmails={kraftEmails}
                  insightNotes={kraftNotes}
                  insightProfessionalSummary={kraftProfessionalSummary}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 14, alignItems: "center" }}>
              <button
                type="button"
                onClick={() => handleSendContactReply(activeThread)}
                disabled={!getPlainText(getDraftContactReplyBody(contactReplyText || "")).trim() || isSendingContactReply}
                className="btn-default"
                style={{ order: 2 }}
              >
                {isSendingContactReply ? "Sending..." : "Send reply"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowContactReplySection(false);
                  setContactReplyText("");
                  setContactReplyTrailHtml("");
                  setContactReplyCcEmails([]);
                  setContactReplyCcDraft("");
                  setContactReplyBccEmails([]);
                  setContactReplyBccDraft("");
                  setShowContactReplyCc(false);
                  setShowContactReplyBcc(false);
                  setContactReplyAttachments([]);
                }}
                style={{
                  order: 1,
                  padding: "10px 24px",
                  ...secondaryButtonStyle,
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        <Modal
          show={isContactReplyExpanded}
          closeModal={() => setIsContactReplyExpanded(false)}
          buttonLabel="Close"
          size="90%"
        >
          <div style={{ padding: 20 }}>
            <label style={{ fontWeight: 500, fontSize: 16, marginBottom: 12, display: "block" }}>Reply editor</label>
              <RichTextEditor value={contactReplyText} onChange={setContactReplyText} height={520} />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => handleSaveContactReplyDraft(activeThread)}
                  disabled={isSavingContactReplyDraft || !getPlainText(getDraftContactReplyBody(contactReplyText || "")).trim()}
                  style={{
                    padding: "10px 24px",
                    ...((isSavingContactReplyDraft || !getPlainText(getDraftContactReplyBody(contactReplyText || "")).trim())
                      ? { background: "#e5e7eb", color: "#9ca3af", border: "1px solid #d1d5db" }
                      : primarySoftButtonStyle),
                    borderRadius: 6,
                    cursor: isSavingContactReplyDraft || !getPlainText(getDraftContactReplyBody(contactReplyText || "")).trim() ? "not-allowed" : "pointer",
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  {isSavingContactReplyDraft ? "Saving..." : "Save draft"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsContactReplyExpanded(false)}
                  style={{
                    padding: "10px 24px",
                    ...secondaryButtonStyle,
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  Done
                </button>
              </div>
          </div>
        </Modal>
        <Modal
          show={isContactForwardExpanded}
          closeModal={() => setIsContactForwardExpanded(false)}
          buttonLabel="Close"
          size="90%"
        >
          <div style={{ padding: 20 }}>
            <label style={{ fontWeight: 500, fontSize: 16, marginBottom: 12, display: "block" }}>Forward editor</label>
            <RichTextEditor value={contactForwardMessage} onChange={setContactForwardMessage} height={520} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 14 }}>
              <button
                type="button"
                onClick={() => setIsContactForwardExpanded(false)}
                style={{
                  padding: "10px 24px",
                  ...secondaryButtonStyle,
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      </>
    );
  };

  return (
    <>
    
    <div className={embedded ? "w-full" : "flex h-screen overflow-hidden"}>
      {/* SIDE MENU */}
      {!embedded && isSidebarOpen && (
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
                          <li className={contactsSubTab === "CustomFields" ? "active" : ""}>
                            <button
                              onClick={() => {
                                setContactsSubTab("CustomFields");
                                setTab("DataCampaigns");   // ✅ FIX
                                setShowMailSubmenu(false);
                                navigate("/main?tab=DataCampaigns&subtab=CustomFields");
                              }}
                              className="submenu-button"
                            >
                              Custom attributes
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
      <div
        className={
          embedded
            ? "w-full"
            : "flex flex-col flex-1 overflow-hidden bg-gray-100"
        }
      >
        <div className={embedded ? "w-full" : "w-full h-screen overflow-y-auto bg-gray-100"}>
          <div className={embedded ? "pt-4 pb-20 px-2 min-h-full" : "pt-4 pb-20 px-6 min-h-screen"}>
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
                  {/* "insights" tab hidden — research is shown in the right panel. To restore, add "insights" back to the array below. */}
                  {["profile", "history", "lists", "qa", "emails" /*, "insights" */].map((tab) => (
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

                        if (tab === "emails" && contactId && emailTimeline.length === 0) {
                          fetchEmailTimeline(Number(contactId));
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
                      {tab === "profile"
                        ? "Profile"
                        : tab === "history"
                          ? "Activity"
                          : tab === "lists"
                            ? "Lists"
                            : tab === "qa"
                              ? "Q&A"
                              : tab === "emails"
                                ? "Emails"
                                : "Insights"}

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
                      dispatch(openPanel("note"))
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
                    <FontAwesomeIcon icon={faSquarePlus  } style={{ color: "#3f9f42", cursor: "pointer", }} className="text-[20px]" />
                    Add note
                  </button>
                  <button
                    onClick={() => dispatch(openPanel("attachment"))}
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
                    }}
                  >
                    <FontAwesomeIcon icon={faPaperclip} style={{ color: "#3f9f42", cursor: "pointer", }} className="text-[20px]" />
                    Add attachment
                  </button>

                  {/* Compose — only on the Emails tab */}
                  {activeTab === "emails" && (
                    <button
                      type="button"
                      onClick={() => setIsComposePopupOpen(true)}
                      style={{
                        ...defaultButtonStyle,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 7,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <FontAwesomeIcon icon={faPen} />
                      Compose
                    </button>
                  )}

                  {/* Campaign-driven web-search insights generation */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row-reverse",
                      alignItems: "center",
                      gap: 10,
                      marginLeft: "auto",
                      padding: "8px 10px",
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      background: "#ffffff",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    }}
                  >
                    <select
                      value={selectedCampaign}
                      onChange={(e) => setSelectedCampaign(e.target.value)}
                      disabled={isGeneratingInsights}
                      style={{
                        padding: "8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: 8,
                        fontSize: 14,
                        color: "#374151",
                        background: "#ffffff",
                        cursor: isGeneratingInsights ? "not-allowed" : "pointer",
                        width: 200,
                        maxWidth: 200,
                        flexShrink: 0,
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                      }}
                    >
                      <option value="">Select campaign</option>
                      {groupedCampaigns.contactCampaigns.length > 0 && (
                        <optgroup label="This contact's campaigns">
                          {groupedCampaigns.contactCampaigns.map(({ campaign, label }) => (
                            <option key={campaign.id} value={campaign.id.toString()}>
                              {label}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {groupedCampaigns.otherCampaigns.length > 0 && (
                        <optgroup label="Other campaigns">
                          {groupedCampaigns.otherCampaigns.map(({ campaign, label }) => (
                            <option key={campaign.id} value={campaign.id.toString()}>
                              {label}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    <button
                      onClick={handleGenerateInsights}
                      disabled={isGeneratingInsights || !selectedCampaign}
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 14px",
                        border: "1.5px solid #e2e8f0",
                        borderRadius: 8,
                        background: "#f8fafc",
                        color: "#374151",
                        fontSize: 13,
                        fontWeight: 500,
                        cursor:
                          isGeneratingInsights || !selectedCampaign
                            ? "not-allowed"
                            : "pointer",
                        opacity: isGeneratingInsights || !selectedCampaign ? 0.6 : 1,
                        transition: "all 0.18s",
                      }}
                      onMouseEnter={(e) => {
                        if (isGeneratingInsights || !selectedCampaign) return;
                        e.currentTarget.style.background = "#f1f5f9";
                        e.currentTarget.style.borderColor = "#cbd5e1";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#f8fafc";
                        e.currentTarget.style.borderColor = "#e2e8f0";
                      }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12 3l1.9 4.9L18.8 9.8l-4.9 1.9L12 16.6l-1.9-4.9L5.2 9.8l4.9-1.9L12 3z"
                          fill="#374151"
                        />
                        <path
                          d="M18.5 14.5l.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8.8-2.1z"
                          fill="#374151"
                        />
                      </svg>
                      {isGeneratingInsights ? "Generating..." : "Generate insights"}
                    </button>
                  </div>
                </div>
              </div>

              {/* ============ HISTORY FILTER PILLS ============ */}
              {activeTab === "history" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    marginBottom: 24,
                    marginTop: -12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {[
                      { key: "all", label: "All" },
                      { key: "notes", label: "Notes" },
                      { key: "attachments", label: "Attachments" },
                      { key: "emails", label: "Emails" },
                      { key: "linkedin", label: "LinkedIn" },
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
                        if (item.key === "linkedin" && linkedInMessages.length === 0) {
                          fetchLinkedInMessages(Number(contactId));
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
                </div>
              )}
              {/* PROFILE TAB */}
              {activeTab === "profile" && (
                <>
                  {!loading && !editingContact && (
                    <p style={{ color: "#666" }}>Contact not found.</p>
                  )}

                  {!loading && editingContact && (
                    <EditContactModal
                      isOpen={true}
                      asPage={true}
                      hideOverlay={true}
                      hideFullName={true}
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
                      notesHistory={notesHistory} 
                      onEditNote={handleEditNote}
                      onDeleteNote={handleDeleteNote}
                      onTogglePin={handleTogglePin}
                      onNotesHistoryUpdate={fetchNotesHistory}
                      onSavingLinkedInChange={setIsSavingLinkedIn}
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

                  {!isLoadingHistory && !editingContact?.contactCreatedAt && emailTimeline.length === 0 && linkedInMessages.length === 0 && (
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
                              const isInboxEmail = email.emailType === 'inbox';
                              const threadMessageCount = email.messages?.length || 0;
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
                                    <div style={{ flex: 1, position: "relative", paddingRight: 44 }}>
                                      {renderEmailActions(email)}
                                      {/* Source */}
                                      {!isInboxEmail && (
                                        <div style={{ fontSize: 13, marginBottom: 6 }}>
                                          <b>Source:</b>{" "}
                                          <span style={{ color: "#666" }}>{email.source || "Unknown source"}</span>
                                        </div>
                                      )}

                                      {/* Email sent/received */}
                                      <div style={{ fontWeight: 600 }}>
                                        {threadMessageCount > 1 ? "Email thread" : isInboxEmail ? "Email received" : "Email sent"}
                                      </div>
                                      <div style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
                                        {formatDateTimeIST(email.sentAt || email.receiveAt)}
                                        {!isInboxEmail && ` from ${email.senderEmailId}`}
                                        {isInboxEmail && ` from ${email.fromEmail}`}
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
                                          {threadMessageCount > 1 && (
                                            <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                                              {threadMessageCount} messages in this thread
                                            </div>
                                          )}
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

                                  {expandedEmailId === email.trackingId && renderEmailPreview(email)}

                                </div>

                              );
                            }

                            /* 🟢 LINKEDIN MESSAGE */
                            if (item.type === "linkedin") {
                              return renderLinkedInTimelineItem(item.data, index);
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
                                          style={{
                                            position: "absolute",
                                            right: 0,
                                            top: 36,
                                            background: "#fff",
                                            border: "1px solid #e5e7eb",
                                            borderRadius: 8,
                                            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                                            zIndex: 101,
                                            minWidth: 170,
                                            padding: "6px 0",
                                          }}
                                        >
                                        {/* EDIT */}
                                        <button
                                            onClick={() => {
                                              handleEditNote(note);
                                              setNoteActionsAnchor(null);
                                            }}
                                            style={menuItemStyle}
                                            //className="flex gap-2 items-center ml-[0px]"
                                          >
                                            <div style={menuIconStyle}>
                                             <FontAwesomeIcon
                                             icon={faEdit}
                                            style={{ color: "#3f9f42", fontSize: 19 }}
                                            />
                                            </div>
                                            <span>Edit</span>
                                          </button>

    {/* PIN / UNPIN */}
    <button
  onClick={() => handleTogglePin(note.id)}
  style={menuItemStyle}
>
   <div style={menuIconStyle}>
    {note.isPin ? (
      <PinOff size={19} color="#3f9f42" strokeWidth={2.5} />
    ) : (
      <Pin size={21} color="#3f9f42" strokeWidth={2} />
    )}
  </div>

  <span>{note.isPin ? "Unpin" : "Pin"}</span>
</button>

    {/* DELETE */}
    <button
  onClick={() => {
    handleDeleteNote(note.id);
    setNoteActionsAnchor(null);
  }}
  style={menuItemStyle}
>
  <div style={menuIconStyle}>
        {/* <img
          src={deleteIcon}
          alt="Delete"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
          }}
        /> */}
        <FontAwesomeIcon
          icon={faTrashAlt}
          style={{ color: "#3f9f42", fontSize: 18 }}
        />
      </div>
  <span>Delete</span>
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

                            /* 🟢 ATTACHMENT */
                            if (item.type === "attachment") {
                              const attachment = item.data;

                              return (
                                <div key={attachment.id}>
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

                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontWeight: 600 }}>Attachment added</div>
                                      <div style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
                                        {formatDateTimeIST(attachment.createdDate)}
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
                                          onClick={async () => {
                                            try {
                                              const response = await axios.get(
                                                `${API_BASE_URL}/api/Attachment/download/${attachment.id}`,
                                                { responseType: "blob" }
                                              );
                                              const url = window.URL.createObjectURL(new Blob([response.data]));
                                              const link = document.createElement("a");
                                              link.href = url;
                                              link.setAttribute("download", attachment.fileName);
                                              document.body.appendChild(link);
                                              link.click();
                                              link.remove();
                                              window.URL.revokeObjectURL(url);
                                            } catch (error) {
                                              console.error("Download failed", error);
                                              setToastMessage("Failed to download attachment.");
                                              setShowErrorToast(true);
                                              setTimeout(() => setShowErrorToast(false), 3000);
                                            }
                                          }}
                                          title="Download attachment"
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
                                          <FontAwesomeIcon icon={faDownload} style={{ color: "#3f9f42" }} />
                                        </button>

                                        <div
                                          style={{
                                            fontSize: 14,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                          }}
                                        >
                                          <FontAwesomeIcon icon={faPaperclip} style={{ color: "#3f9f42" }} />
                                          <span>{attachment.fileName}</span>
                                        </div>
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

                      {/* 🔹 EMAIL TIMELINE — moved to the standalone "Emails" tab */}
                      {historyFilter === "emails" && emailTimeline.length === 0 && (
                        <p style={{ color: "#666" }}>No emails found.</p>
                      )}
                      {(historyFilter === "emails") &&
                        emailTimeline.map((email: any, index: number) => {
                          const isInboxEmail = email.emailType === 'inbox';
                          const threadMessageCount = email.messages?.length || 0;
                          
                          return (
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
                              <div style={{ flex: 1, position: "relative", paddingRight: 44 }}>
                                {renderEmailActions(email)}
                                {/* 2️⃣ SOURCE - Only show for sent emails */}
                                {!isInboxEmail && (
                                  <div style={{ fontSize: 13, marginBottom: 6 }}>
                                    <b>Source:</b>{" "}
                                    <span style={{ color: "#666" }}>
                                      {email.source || "Unknown source"}
                                    </span>
                                  </div>
                                )}

                                {/* 3️⃣ EMAIL SENT/RECEIVED */}
                                <div style={{ fontWeight: 600 }}>
                                  {threadMessageCount > 1 ? "Email thread" : isInboxEmail ? "Email received" : "Email sent"}
                                </div>
                                <div
                                  style={{
                                    fontSize: 13,
                                    color: "#666",
                                    marginBottom: 8,
                                  }}
                                >
                                  {formatDateTimeIST(email.sentAt || email.receiveAt)}
                                  {!isInboxEmail && ` from ${email.senderEmailId}`}
                                  {isInboxEmail && ` from ${email.fromEmail}`}
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
                                    {threadMessageCount > 1 && (
                                      <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                                        {threadMessageCount} messages in this thread
                                      </div>
                                    )}
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

                          {expandedEmailId === email.trackingId && renderEmailPreview(email)}

                          </div>
                        );}
                        )}
                      {/* 🔹 LINKEDIN MESSAGES */}
                      {historyFilter === "linkedin" && (
                        <>
                          {isLoadingLinkedIn && (
                            <p style={{ color: "#666" }}>Loading LinkedIn messages...</p>
                          )}

                          {!isLoadingLinkedIn && linkedInMessages.length === 0 && (
                            <p style={{ color: "#666" }}>No LinkedIn messages found.</p>
                          )}

                          {!isLoadingLinkedIn &&
                            linkedInMessages.map((message: any, index: number) =>
                              renderLinkedInTimelineItem(message, index)
                            )}
                        </>
                      )}

                      {/* 🔹 ATTACHMENTS HISTORY */}
                      {(historyFilter === "attachments") && (
                        <>
                          {attachmentsHistory.length === 0 && (
                            <p style={{ color: "#666" }}>No attachments found.</p>
                          )}

                          {attachmentsHistory.map((attachment: any) => (
                            <div key={attachment.id}>
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

                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600 }}>Attachment added</div>
                                  <div style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
                                    {formatDateTimeIST(attachment.createdDate)}
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
                                      onClick={async () => {
                                        try {
                                          const response = await axios.get(
                                            `${API_BASE_URL}/api/Attachment/download/${attachment.id}`,
                                            { responseType: "blob" }
                                          );
                                          const url = window.URL.createObjectURL(new Blob([response.data]));
                                          const link = document.createElement("a");
                                          link.href = url;
                                          link.setAttribute("download", attachment.fileName);
                                          document.body.appendChild(link);
                                          link.click();
                                          link.remove();
                                          window.URL.revokeObjectURL(url);
                                        } catch (error) {
                                          console.error("Download failed", error);
                                          setToastMessage("Failed to download attachment.");
                                          setShowErrorToast(true);
                                          setTimeout(() => setShowErrorToast(false), 3000);
                                        }
                                      }}
                                      title="Download attachment"
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
                                      <FontAwesomeIcon icon={faDownload} style={{ color: "#3f9f42" }} />
                                    </button>

                                    <div
                                      style={{
                                        fontSize: 14,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                      }}
                                    >
                                      <FontAwesomeIcon icon={faPaperclip} style={{ color: "#3f9f42" }} />
                                      <span>{attachment.fileName}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      )}

                      {/* 🔹 NOTES HISTORY */}
                      {(historyFilter === "notes") && (
                        <>
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
                                             <div style={menuIconStyle}>
                                             <FontAwesomeIcon
                                             icon={faEdit}
                                            style={{ color: "#3f9f42", fontSize: 19 }}
                                            />
                                            </div>
                                            <span className="font-[600]">Edit</span>
                                          </button>

                                          {/* 📌 PIN / UNPIN */}
                                          <button
                                            onClick={() => handleTogglePin(note.id)}
                                            style={menuBtnStyle}
                                            className="flex gap-2 items-center"
                                          >
                                             <div style={menuIconStyle}>
                                             {note.isPin ? (
                                             <PinOff size={19} color="#3f9f42" strokeWidth={2.5} />
                                             ) : (
                                            <Pin size={21} color="#3f9f42" strokeWidth={2} />
                                             )}
                                            </div>
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
                                            className="flex gap-2 items-center"
                                          >
                                            <div style={menuIconStyle}>
                                            <FontAwesomeIcon
                                            icon={faTrashAlt}
                                            style={{ color: "#3f9f42", fontSize: 18 }}
                                            />
                                            </div>
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
                                          navigate(`/main?tab=DataCampaigns&initialTab=Segment&segmentId=${campaign.sourceId}`);
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
                                          setIsBlueprintLoading(true);
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
                                  navigate(`/main?tab=DataCampaigns&initialTab=Segment&segmentId=${segment.segmentId}`);
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

              {activeTab === "qa" && (
                <ContactQA
                  key={`${effectiveUserId}-${contactId || "unknown"}`}
                  clientId={effectiveUserId}
                  contactId={contactId || ""}
                  contact={editingContact || contact}
                  notesHistory={notesHistory}
                  emailTimeline={emailTimeline}
                  loading={loading || isLoadingHistory}
                  onBeforeQuestion={ensureCanDeductCredit}
                  onQuestionSuccess={refreshCreditsAfterDeduction}
                />
              )}

              {activeTab === "emails" && (
                <ContactEmailsTab
                  contactMailTab={contactMailTab}
                  setContactMailTab={setContactMailTab}
                  renderMailList={renderContactMailList}
                  renderMailReader={renderContactMailReader}
                  onRefresh={refreshContactEmailGrid}
                  isRefreshing={isRefreshingContactEmails}
                />
              )}

              {activeTab === "insights" && (
                <div>
                  {contact?.web_search_data ? (
                    <ResearchCards content={contact.web_search_data} />
                  ) : (
                    <div style={{ textAlign: "center", padding: "48px 0", color: "#9ca3af", fontSize: 13 }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                      No web research data available for this contact.
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* ATTACHMENT PANEL */}
      <CommonSidePanel
        isOpen={showAttachmentPanel}
        onClose={() => {
          dispatch(closePanel());
          setAttachmentName("");
          setAttachmentDescription("");
          setAttachmentFile(null);
        }}
        title="Add attachment"
        footerContent={
          <>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => {
                  dispatch(closePanel());
                  setAttachmentName("");
                  setAttachmentDescription("");
                  setAttachmentFile(null);
                }}
                type="button"
                className="px-5 py-2 border border-gray-300 rounded-full text-sm"
              >
                Cancel
              </button>
            </div>
            <button
              onClick={async () => {
                if (!attachmentFile || !contactId) return;
                setIsUploadingAttachment(true);
                try {
                  const formData = new FormData();
                  formData.append("ContactId", contactId);
                  formData.append("Name", attachmentName);
                  if (attachmentDescription) {
                    formData.append("Description", attachmentDescription);
                  }
                  formData.append("File", attachmentFile);
                  await axios.post(`${API_BASE_URL}/api/Attachment/upload`, formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                  });
                  setToastMessage("Attachment uploaded successfully.");
                  setShowSuccessToast(true);
                  setTimeout(() => setShowSuccessToast(false), 3000);
                  dispatch(closePanel());
                  setAttachmentName("");
                  setAttachmentDescription("");
                  setAttachmentFile(null);
                  // Refresh timeline to show new attachment
                  if (contactId) {
                    fetchEmailTimeline(Number(contactId));
                  }
                } catch (error) {
                  console.error("Upload failed", error);
                  setToastMessage("Failed to upload attachment.");
                  setShowErrorToast(true);
                  setTimeout(() => setShowErrorToast(false), 3000);
                } finally {
                  setIsUploadingAttachment(false);
                }
              }}
              disabled={!attachmentFile || isUploadingAttachment}
              style={{
                ...defaultButtonStyle,
                cursor: !attachmentFile ? "not-allowed" : "pointer",
                opacity: !attachmentFile ? 0.5 : 1,
              }}
            >
              {isUploadingAttachment ? "Uploading..." : "Upload"}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Name</label>
            <input
              type="text"
              value={attachmentName}
              onChange={(e) => setAttachmentName(e.target.value)}
              style={inputStyle}
              placeholder="Enter attachment name"
            />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={attachmentDescription}
              onChange={(e) => setAttachmentDescription(e.target.value)}
              style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
              placeholder="Enter description"
            />
          </div>
          <div>
            <label style={labelStyle}>File</label>
            <div
              onClick={() => document.getElementById('attachment-file-input')?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const files = e.dataTransfer.files;
                if (files && files[0]) {
                  setAttachmentFile(files[0]);
                }
              }}
              style={{
                ...inputStyle,
                padding: "60px 12px",
                textAlign: "center",
                cursor: "pointer",
                border: "2px dashed #d1d5db",
                background: "#f9fafb",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9ca3af"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <div style={{ fontSize: 14, color: "#374151" }}>
                {attachmentFile ? attachmentFile.name : "Drag & drop your attachment file here, or click to select"}
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>
                Supports: .Pdf, .xlsx, .xls, .csv (Max size: 10MB)
              </div>
            </div>
            <input
              id="attachment-file-input"
              type="file"
              onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
              style={{ display: "none" }}
            />
          </div>
        </div>
      </CommonSidePanel>
      {/* NOTE PANEL */}
      <CommonSidePanel
        isOpen={showNotePanel}
        onClose={() => dispatch(closePanel())}
        title={isEditMode ? "Edit note" : "Add a note"}
        footerContent={
          <>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => dispatch(closePanel())}
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
                ...defaultButtonStyle,
                cursor: isSaveDisabled ? "not-allowed" : "pointer",
                opacity: isSaveDisabled ? 0.5 : 1,
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
          </>
        }
      >
        <style>
          {`
            .note-editor-wrapper .rich-text-editor > div {
              height: auto !important;
              min-height: 270px !important;
              overflow: visible !important;
            }
          `}
        </style>
        <div className="note-editor-wrapper">
          <div style={{ marginBottom: 10 }}>
            <RichTextEditor value={noteText} onChange={setNoteText} />
          </div>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <h3 style={{ margin: 0, fontSize: 12, fontWeight: 500, color: "#111827" }}>
                For this note
              </h3>
              <div>{plainTextLength} / 10,000</div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 4,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 12, fontWeight: 500, color: "#111827" }}>
                For all notes
              </h3>
              <div>{totalNotesLength} / {MAX_TOTAL_NOTES}</div>
            </div>
          </div>
          <div className="flex items-start gap-2 mt-4">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="mt-1 w-4 h-4 accent-[#3f9f42] cursor-pointer"
            />
            <div>
              <div className="text-sm font-medium text-gray-900">Pin note</div>
              <div className="text-xs text-gray-500">
                Pinned notes stay at the top for easy access.
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2 mt-6">
            <input
              type="checkbox"
              checked={isEmailPersonalization}
              onChange={(e) => setIsEmailPersonalization(e.target.checked)}
              className="mt-1 w-4 h-4 accent-[#3f9f42] cursor-pointer"
            />
            <div>
              <div className="text-sm font-medium text-gray-900">
                Use in personalization
              </div>
              <div className="text-xs text-gray-500">
                Use this note to personalize future emails and in Q&A.
              </div>
            </div>
          </div>
        </div>
      </CommonSidePanel>
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
      {showEmailDeleteModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]"
          onClick={(event) => {
            event.stopPropagation();
            if (isDeletingEmail) return;
            setShowEmailDeleteModal(false);
            setEmailToDelete(null);
          }}
        >
          <div
            className="bg-white rounded-xl p-6 w-[520px] relative"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-3">Delete email</h2>

            <p className="text-sm text-gray-600 mb-6">
              {pendingEmailDeleteMode === "Permanent"
                ? "Are you sure you want to permanently delete this email?"
                : "Are you sure you want to move this email to trash?"}
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowEmailDeleteModal(false);
                  setEmailToDelete(null);
                }}
                disabled={isDeletingEmail}
                className="px-5 py-2 rounded-full bg-black text-white disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmEmailDelete}
              disabled={isDeletingEmail}
              className="px-5 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
            >
                {isDeletingEmail
                  ? "Deleting..."
                  : pendingEmailDeleteMode === "Permanent"
                    ? "Delete permanently"
                    : "Delete from Inbox"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (isDeletingEmail) return;
                setShowEmailDeleteModal(false);
                setEmailToDelete(null);
              }}
              className="absolute top-4 right-4 text-xl"
            >
              ✕
            </button>
          </div>
        </div>
      )}

    </div>
    <ContactComposeEmailPopup
      isOpen={isComposePopupOpen}
      onClose={() => setIsComposePopupOpen(false)}
      blueprints={sortedComposeBlueprints}
      fromOptions={sortedComposeFromOptions}
      selectedFromId={selectedComposeSmtpUser}
      onFromChange={setSelectedComposeSmtpUser}
      toEmail={contact?.email || ""}
      signatureHtml={composeSignatureHtml}
      isSignatureLoading={isLoadingComposeSignature}
      onGenerate={handleGenerateComposeEmail}
      onSend={handleSendComposeEmail}
      isSending={isSendingComposeEmail}
    />
    {(loading || isLoadingHistory || isLoadingNotes || isLoadingDetails || isBlueprintLoading || isSavingNote) && (
      <LoadingSpinner
        message={
          isSavingNote ? "Saving note..." :
          isBlueprintLoading ? "Loading blueprint..." :
          isLoadingDetails ? "Loading details..." :
          isLoadingNotes ? "Loading Profile..." :
          isLoadingHistory ? "Loading history..." :
          "Loading..."
        }
      />
    )}
    <CreditCheckModal
      isOpen={showCreditModal || forceShowCreditModal}
      onClose={() => {
        setForceShowCreditModal(false);
        closeCreditModal();
      }}
      onSkip={() => {
        setForceShowCreditModal(false);
        handleSkipModal();
      }}
      credits={credits}
      setTab={handleCreditModalTabChange}
    />
    </>
  );
};

export default ContactDetailView;
