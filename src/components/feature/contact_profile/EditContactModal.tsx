import React, { useState, useEffect, useCallback } from 'react';
import API_BASE_URL from '../../../config';
import { defaultButtonStyle } from '../../../styles/buttonStyles';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../Redux/store';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import DOMPurify from "dompurify";
import { faEdit,faTrashAlt,faCircleXmark,faSquarePlus    } from "@fortawesome/free-regular-svg-icons";

import {
  faAngleRight,
  faAngleUp,
  faBars,
  faBullhorn,
  faDashboard,
 // faEdit,
  faEllipsisV,
  faEnvelope,
  faEnvelopeOpen,
  faFileAlt,
  faGear,
  faList,
  faPaperclip,
  faRobot,
  faThumbtack, // Add this for Campaign Builder
  faAngleDown,
  faBriefcase,
  faGraduationCap,
  faStar,
  faNewspaper,
  faCertificate,
} from "@fortawesome/free-solid-svg-icons"
import { useAppModal } from '../../../hooks/useAppModal';
import RichTextEditor from '../../common/RTEEditor';
import AccordionSection from '../../common/accordion/Accordion';
import AppModal from '../../common/AppModal';
import deleteIcon from "../../../assets/images/deleteiconn.png";
import gpsPin from "../../../assets/images/Unpin.png";
import pinimage from "../../../assets/images/pin.png";
import { Slash } from "lucide-react";
import { Pin, PinOff } from 'lucide-react';
import{formatDateTimeLocal, formatTimeLocal}from "../../common/dateFormatters";
import CommonSidePanel from '../../common/CommonSidePanel';
import { closePanel, openPanel } from '../../../slices/panelSlice';
import { pinEmail } from '../inbox/inboxPin';
import { repairAndParseJsonObject } from '../../../utils/jsonRepair';
import GenderAvatar from './GenderAvatar';

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
  companyTelephone?: string;
  companyEmployeeCount?: string;
  companyIndustry?: string;
  companyLinkedInURL?: string;
  notes?: string;
  linkedIninformation?: string;
  web_search_data?: string | null;
  updated_at?: string | null;
  customFields?: Record<string, string>;


}

interface EditContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact | null;
  onContactUpdated: (updatedContact: Contact) => void;
  onShowMessage: (message: string, type: 'success' | 'error') => void;
  hideFullName?: boolean;
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

interface PinnedEmailMessage {
  type?: string;
  messageId?: string;
  subject?: string;
  body?: string;
  fromEmail?: string;
  toEmail?: string;
  date?: string;
  isRead?: boolean;
  contactId?: number | null;
  contactName?: string;
  attachments?: PinnedEmailAttachment[];
}

interface PinnedEmailAttachment {
  id?: number;
  messageId?: string;
  fileName?: string;
  originalFileName?: string;
  contentType?: string;
  filePath?: string;
  fileSize?: number;
}

interface PinnedEmailThread {
  trackingId: string;
  subject: string;
  contactEmail?: string | null;
  totalMessages: number;
  lastMessageDate: string;
  hasUnread: boolean;
  contactId: number | null;
  isPinned: boolean;
  messages?: PinnedEmailMessage[];
}

interface EmailEngagementStats {
  sentCount: number;
  openCount: number;
  clickCount: number;
  bounceBackCount: number;
}

/**
 * The JSON the profile-summary model returns (see ProfileSummaryPrompt.cs).
 * Every field is optional here because older contacts hold a plain-text or HTML
 * summary in linkedIninformation instead, and because the model may legitimately
 * return null / [] for anything the profile did not cover.
 */
interface ProfileSummaryJson {
  generatedOn?: string | null;
  fullName?: string | null;
  firstName?: string | null;
  pronunciation?: string | null;
  nameUsuallyAssociatedWith?: string | null;
  estimatedAge?: string | null;
  headline?: string | null;
  currentJobTitle?: string | null;
  currentCompany?: string | null;
  location?: string | null;
  quickSummary?: string | null;
  chronology?: {
    dates?: string | null;
    jobTitle?: string | null;
    company?: string | null;
    location?: string | null;
    description?: string | null;
  }[];
  education?: {
    institution?: string | null;
    qualification?: string | null;
    dates?: string | null;
    details?: string | null;
  }[];
  certifications?: { name?: string | null; issuer?: string | null; date?: string | null }[];
  projectsAndPublications?: { title?: string | null; description?: string | null }[];
  skills?: string[];
  recentVisibleFocus?: { hasRecentActivity?: boolean; paragraphs?: string[] };
  notProvided?: string[];
}

// Personal accordion tabs. Everything after "professional" only appears once the
// stored summary is the structured JSON.
type PersonalTab =
  | "information"
  | "professional"
  | "chronology"
  | "education"
  | "skills"
  | "recentFocus";

const PROFILE_TABS: { key: PersonalTab; label: string }[] = [
  { key: "chronology", label: "Chronology" },
  { key: "education", label: "Education" },
  { key: "skills", label: "Skills" },
  { key: "recentFocus", label: "Recent focus" },
];

/** Trims a model string and treats "null"/"N/A"-style filler as absent. */
const cleanText = (value: any): string => {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return /^(null|n\/a|none|not provided|not known|unknown)$/i.test(text) ? "" : text;
};

const asArray = <T,>(value: any): T[] => (Array.isArray(value) ? (value as T[]) : []);

/**
 * The stored summary is raw JSON as it comes back from the API, but a round trip
 * through the rich-text editor wraps it in markup and escapes its quotes, so
 * unwrap that before trying to parse it.
 */
const stripHtmlToText = (value: string): string => {
  if (!/<[a-z/][\s\S]*>/i.test(value)) return value;
  const holder = document.createElement("div");
  holder.innerHTML = value;
  return (holder.textContent || "").trim();
};

// Company "Insights" tab: known sections of the contact's web_search_data.
// Rendered dynamically — only sections that actually contain data are shown.
const INSIGHT_SECTIONS: { key: string; title: string; description: string; icon: any }[] = [
  { key: "company_overview", title: "Company overview", description: "Key facts, industry, size, and headquarters", icon: faFileAlt },
  { key: "recent_news", title: "Recent news", description: "Latest news and announcements about the company", icon: faBullhorn },
  { key: "search_results", title: "Search results", description: "Relevant findings gathered from the web", icon: faList },
  { key: "funding", title: "Funding", description: "Funding and investment details", icon: faGear },
  { key: "hiring_signals", title: "Hiring signals", description: "Recent hiring activity and openings", icon: faRobot },
  { key: "extra_information_findings", title: "Additional insights", description: "Other relevant information", icon: faFileAlt },
];

const insightHasData = (value: any): boolean => {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return String(value).trim().length > 0;
};

const formatInsightLabel = (key: string): string =>
  key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Source values can arrive as a plain URL, a markdown link "[label](url)", or a
// bare domain. Normalize to an absolute URL so links open externally instead of
// being treated as a relative path inside the app.
const extractUrl = (raw: any): string => {
  const s = String(raw).trim();
  // markdown "[label](https://...)" or "(https://...)"
  const md = s.match(/\((https?:\/\/[^)]+)\)/i);
  if (md) return md[1];
  // first absolute URL found anywhere in the string
  const abs = s.match(/https?:\/\/[^\s)\]]+/i);
  if (abs) return abs[0];
  // bare domain like "liberty-it.co.uk" → prefix protocol
  if (/^[\w-]+(\.[\w-]+)+/.test(s)) return `https://${s.replace(/^\/+/, "")}`;
  return s;
};

// Recursively renders a piece of the (dynamic) web_search_data JSON. Missing or
// empty fields are skipped so partial responses still render cleanly.
const renderInsightValue = (value: any): React.ReactNode => {
  if (value == null || value === "") return null;

  if (typeof value !== "object") {
    const text = String(value).trim();
    if (!text) return null;
    if (/https?:\/\//i.test(text) || /^\[[^\]]*\]\([^)]+\)$/.test(text)) {
      return (
        <a href={extractUrl(text)} target="_blank" rel="noopener noreferrer" style={{ color: "#15803d", wordBreak: "break-all" }}>
          {text}
        </a>
      );
    }
    return <span style={{ color: "#374151" }}>{text}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {value.map((item, i) => (
          <div key={i} style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #eef2f6" }}>
            {renderInsightValue(item)}
          </div>
        ))}
      </div>
    );
  }

  const entries = Object.entries(value).filter(([k, v]) => k !== "evidence" && insightHasData(v));
  if (entries.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {entries.map(([k, v]) => {
        if (k === "sources") {
          const sources = Array.isArray(v) ? v : [v];
          return (
            <div key={k} style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
              {sources.map((src: any, si: number) => (
                <a
                  key={si}
                  href={extractUrl(src)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 11.5, background: "#f0fdf4", padding: "3px 10px", borderRadius: 99, border: "1px solid #bbf7d0", color: "#15803d", textDecoration: "none", wordBreak: "break-all" }}
                >
                  🔗 Source
                </a>
              ))}
            </div>
          );
        }

        const child = renderInsightValue(v);
        if (child == null) return null;
        const isComplex = typeof v === "object" && v !== null;

        return (
          <div key={k} style={{ fontSize: 13, lineHeight: 1.55 }}>
            <span style={{ fontWeight: 600, color: "#111827" }}>{formatInsightLabel(k)}</span>
            {isComplex ? <div style={{ marginTop: 4 }}>{child}</div> : <span style={{ color: "#374151" }}>: {child}</span>}
          </div>
        );
      })}
    </div>
  );
};

// Candidate field names used to pull a compact title / body out of a dynamic
// research item (personalization_angle, key_findings, events, ...).
const OPP_TITLE_KEYS = ["title", "heading", "name", "label", "basis", "category", "type", "opportunity"];
const OPP_BODY_KEYS = ["angle", "description", "explanation", "finding", "detail", "details", "summary", "text", "insight", "reason"];

// Normalizes any web_search_data value into a list of items to iterate over.
const toInsightItems = (value: any): any[] => {
  if (value == null) return [];
  if (Array.isArray(value)) return value.filter((v) => insightHasData(v));
  if (typeof value === "object") return Object.keys(value).length ? [value] : [];
  return String(value).trim() ? [String(value)] : [];
};

// Renders one research item as an icon + bold title + muted description row.
const renderOpportunityItem = (item: any, keyId: React.Key, icon: any): React.ReactNode => {
  let title: string | undefined;
  let body: string | undefined;
  let sources: any[] = [];

  if (typeof item === "string") {
    body = item;
  } else if (item && typeof item === "object") {
    const entries = Object.entries(item).filter(([k, v]) => k !== "evidence" && insightHasData(v));
    const titleEntry = entries.find(([k]) => OPP_TITLE_KEYS.includes(k.toLowerCase()));
    const bodyEntry = entries.find(
      ([k]) => OPP_BODY_KEYS.includes(k.toLowerCase()) && k !== titleEntry?.[0]
    );
    title = titleEntry ? String(titleEntry[1]) : undefined;
    body = bodyEntry ? String(bodyEntry[1]) : undefined;
    const srcEntry = entries.find(([k]) => k.toLowerCase() === "sources");
    if (srcEntry) sources = Array.isArray(srcEntry[1]) ? srcEntry[1] : [srcEntry[1]];
    // Fallback: nothing matched the known keys — join remaining fields.
    if (!title && !body) {
      body = entries
        .filter(([k]) => k.toLowerCase() !== "sources")
        .map(([, v]) => String(v))
        .join(" — ");
    }
  }

  if (!title && !body) return null;

  return (
    <div
      key={keyId}
      className="group flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#bbf7d0] hover:shadow-[0_6px_18px_rgba(63,159,66,0.12)]"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#f0fdf4] text-[#3f9f42] ring-1 ring-[#dcfce7] transition-colors duration-200 group-hover:bg-[#3f9f42] group-hover:text-white group-hover:ring-[#3f9f42]">
        <FontAwesomeIcon icon={icon} />
      </span>
      <div className="min-w-0 flex-1">
        {title && <div className="text-sm font-semibold text-gray-900">{title}</div>}
        {body && (
          <div className={`text-[13px] leading-relaxed text-gray-500 ${title ? "mt-0.5" : ""}`}>{body}</div>
        )}
        {sources.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {sources.map((src: any, si: number) => (
              <a
                key={si}
                href={extractUrl(src)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-[#f0fdf4] px-2.5 py-1 text-[11px] font-medium text-[#15803d] ring-1 ring-[#dcfce7] transition-colors hover:bg-[#dcfce7]"
              >
                🔗 Source
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


const EditContactModal: React.FC<EditContactModalProps> = ({
  isOpen,
  onClose,
  contact,
  onContactUpdated,
  onShowMessage,
  hideFullName = false,
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
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
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
  const [isFullNameManuallyEdited, setIsFullNameManuallyEdited] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailBodyPopup, setShowEmailBodyPopup] = useState(false);
  const [showNotesPopup, setShowNotesPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [emailTimeline, setEmailTimeline] = useState<any[]>([]);
  const [emailEngagementStats, setEmailEngagementStats] = useState<EmailEngagementStats>({
    sentCount: 0,
    openCount: 0,
    clickCount: 0,
    bounceBackCount: 0,
  });
  // const [notesHistory, setNotesHistory] = useState<Note[]>([]);
  const reduxUserId = useSelector((state: RootState) => state.auth.userId);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
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
  const [personalTab, setPersonalTab] = useState<PersonalTab>("information");
  // "insights" is the Overview tab (shown by default when the Company section opens)
  const [companyTab, setCompanyTab] = useState<"information" | "insights">("insights");
  // Only one accordion section open at a time; opening one closes the others.
  const [openSection, setOpenSection] = useState<"personal" | "company" | "custom" | null>("personal");
  const toggleSection = (section: "personal" | "company" | "custom") =>
    setOpenSection((prev) => (prev === section ? null : section));

  // Whenever the Company section is opened, default it to the Overview tab.
  useEffect(() => {
    if (openSection === "company") {
      setCompanyTab("insights");
    }
  }, [openSection]);
  // "outreach" | "findings" | a dynamic INSIGHT_SECTIONS key (e.g. "recent_news")
  const [researchTab, setResearchTab] = useState<string>("outreach");

  // Parse the contact's web_search_data (JSON string) for the Company > Insights tab.
  const companyInsightsData = React.useMemo<Record<string, any> | null>(() => {
    const raw = contact?.web_search_data;
    if (!raw) return null;
    if (typeof raw === "object") return raw;
    return repairAndParseJsonObject(raw);
  }, [contact]);
  // The professional summary is stored as the structured JSON described in
  // ProfileSummaryPrompt.cs. Contacts summarised before that change hold plain
  // text or HTML, so this stays null and the summary renders as it always did.
  const profileSummary = React.useMemo<ProfileSummaryJson | null>(() => {
    const raw = stripHtmlToText((savedLinkedInSummary || "").trim());
    if (!/^(```[a-z]*\s*)?\{/i.test(raw)) return null;

    const parsed = repairAndParseJsonObject(raw);
    if (!parsed) return null;

    // Only treat it as a profile if it carries at least one section we render,
    // so unrelated JSON keeps falling through to the plain-text path.
    const isProfile =
      "quickSummary" in parsed ||
      "chronology" in parsed ||
      "nameUsuallyAssociatedWith" in parsed;

    return isProfile ? (parsed as ProfileSummaryJson) : null;
  }, [savedLinkedInSummary]);

  // Tabs beyond Information / Professional summary only exist for JSON summaries.
  useEffect(() => {
    if (!profileSummary && PROFILE_TABS.some((tab) => tab.key === personalTab)) {
      setPersonalTab("professional");
    }
  }, [profileSummary, personalTab]);

  const [isSavingLinkedIn, setIsSavingLinkedIn] = useState(false);
   const [showErrorToast, setShowErrorToast] = useState(false);
   const [linkedInActionsAnchor, setLinkedInActionsAnchor] = useState<boolean>(false);
   const [showLinkedInDeleteModal, setShowLinkedInDeleteModal] = useState(false);
  const [isDeleteLinkedInLoading, setIsDeleteLinkedInLoading] = useState(false);
  const [pinnedEmails, setPinnedEmails] = useState<PinnedEmailThread[]>([]);
  const [isLoadingPinnedEmails, setIsLoadingPinnedEmails] = useState(false);
  const [expandedPinnedEmailIds, setExpandedPinnedEmailIds] = useState<Set<string>>(new Set());
  const [pinnedEmailActionsAnchor, setPinnedEmailActionsAnchor] = useState<string | null>(null);
  const [pinnedEmailDeleteOptionsAnchor, setPinnedEmailDeleteOptionsAnchor] = useState<string | null>(null);
  const [showPinnedEmailDeleteModal, setShowPinnedEmailDeleteModal] = useState(false);
  const [pinnedEmailToDelete, setPinnedEmailToDelete] = useState<PinnedEmailThread | null>(null);
  const [pendingPinnedEmailDeleteMode, setPendingPinnedEmailDeleteMode] = useState<"soft" | "Permanent">("soft");
  const [isDeletingPinnedEmail, setIsDeletingPinnedEmail] = useState(false);
   // 🔥 LinkedIn Summary Character Limit
  const LINKEDIN_SUMMARY_MAX_LENGTH = 10000;
  const LINKEDIN_TRUNCATE_LENGTH = 300;

  const activePanel = useSelector(
    (state: RootState) => state.panel.activePanel
  );
    
  const showLinkedSummaryModal =
    activePanel === "show-linkedin-summary-modal";

  const [customFieldDefs, setCustomFieldDefs] = useState<any[]>([]);
const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
const effectiveUserId = React.useMemo(() => {
  const storedClientId =
    searchParams.get("clientId") ||
    localStorage.getItem("selectedClientId") ||
    sessionStorage.getItem("selectedClientId");

  if (storedClientId && storedClientId !== "" && storedClientId !== "null") {
    return Number(storedClientId);
  }

  return Number(reduxUserId);
}, [reduxUserId, searchParams]);

const loadCustomFieldDefinitions = async () => {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/crm/custom-fields?clientId=${effectiveUserId}`
    );

    if (!res.ok) return;

    const data = await res.json();
    setCustomFieldDefs(data || []);
  } catch (err) {
    console.error("Failed loading custom field defs", err);
  }
};
useEffect(() => {
  loadCustomFieldDefinitions();
}, [effectiveUserId]);
  
  const getLinkedInPlainTextLength = (html: string) => {
    if (!html) return 0;
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return (temp.textContent || temp.innerText || "").trim().length;
  };
  
  const linkedInPlainTextLength = getLinkedInPlainTextLength(linkedInSummary);
  const isLinkedInSaveDisabled = linkedInPlainTextLength === 0 || linkedInPlainTextLength > LINKEDIN_SUMMARY_MAX_LENGTH;
   const toastAnimation = `
@keyframes toastProgress {
  from { width: 100%; }
  to { width: 0%; }
}
`;
  // Show toast message when LinkedIn summary exceeds limit
  useEffect(() => {
    if (linkedInPlainTextLength > LINKEDIN_SUMMARY_MAX_LENGTH) {
      setToastMessage("You have exceeded the 10,000 character limit.");
       setShowErrorToast(true);

      const timer = setTimeout(() => {
         setShowErrorToast(false);
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
const menuIconStyle = {
  width: 22,
  height: 22,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
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
  const getContactNameParts = (value?: Contact | null) => {
    const first = value?.first_name?.trim() || "";
    const last = value?.last_name?.trim() || "";
    let full = value?.full_name?.trim() || "";

    if (!full && (first || last)) {
      full = `${first} ${last}`.trim();
    }

    if (!first && !last && full) {
      const parts = full.split(" ").filter(Boolean);
      return {
        firstName: parts[0] || "",
        lastName: parts.slice(1).join(" ").trim(),
        fullName: full,
      };
    }

    return { firstName: first, lastName: last, fullName: full };
  };

  const buildFullName = (first: string, last: string, full: string) => {
    const trimmedFull = full.trim();
    if (trimmedFull) return trimmedFull;
    return `${first.trim()} ${last.trim()}`.trim();
  };

  const buildNameFromParts = (first: string, last: string) =>
    `${first.trim()} ${last.trim()}`.trim();

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

  useEffect(() => {
    if (contact) {
      const { firstName, lastName, fullName } = getContactNameParts(contact);
      setIsFullNameManuallyEdited(false);
      setFormData(prev => ({
        ...prev,
        firstName,
        lastName,
        fullName,
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
      setCustomFieldValues(contact.customFields || {});
    }
    console.log("Contact received:", contact);
  }, [contact]);

  const handleCustomFieldChange = (key: string, value: any) => {
      setCustomFieldValues(prev => ({
        ...prev,
        [key]: value
      }));
    };
    const renderCustomField = (field: any) => {
  const value = customFieldValues[field.field_name] || "";

  switch (field.field_type) {

    case "text":
      return (
        <input
          type="text"
          className={underlineInput}
          value={value}
          onChange={(e) =>
            handleCustomFieldChange(field.field_name, e.target.value)
          }
        />
      );

    case "longtext":
      return (
        <textarea
          className={`${underlineInput} resize-y min-h-[80px]`}
          rows={3}
          value={value}
          onChange={(e) =>
            handleCustomFieldChange(field.field_name, e.target.value)
          }
        />
      );

    case "number":
      return (
        <input
          type="number"
          className={underlineInput}
          value={value}
          onChange={(e) =>
            handleCustomFieldChange(field.field_name, e.target.value)
          }
        />
      );

case "boolean":
  const isChecked = value === "true" || value === true;

  return (
    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden w-fit">
      <button
        type="button"
        onClick={() => handleCustomFieldChange(field.field_name, false)}
        className={`px-4 py-1 text-sm font-medium transition ${
          !isChecked
            ? "bg-[#3f9f42] text-white"
            : "bg-white text-gray-600"
        }`}
      >
        No
      </button>

      <button
        type="button"
        onClick={() => handleCustomFieldChange(field.field_name, true)}
        className={`px-4 py-1 text-sm font-medium transition ${
          isChecked
            ? "bg-[#3f9f42] text-white"
            : "bg-white text-gray-600"
        }`}
      >
        Yes
      </button>
    </div>
  );

    case "date":
      return (
        <input
          type="date"
          className={underlineInput}
          value={value}
          onChange={(e) =>
            handleCustomFieldChange(field.field_name, e.target.value)
          }
        />
      );

    case "datetime":
      return (
        <input
          type="datetime-local"
          className={underlineInput}
          value={value}
          onChange={(e) =>
            handleCustomFieldChange(field.field_name, e.target.value)
          }
        />
      );

    case "dropdown":
      const options = field.options_json
        ? JSON.parse(field.options_json)
        : [];

      return (
        <select
          className={underlineInput}
          value={value}
          onChange={(e) =>
            handleCustomFieldChange(field.field_name, e.target.value)
          }
        >
          <option value="">Select</option>
          {options.map((o: string) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );

    default:
      return (
        <input
          type="text"
          className={underlineInput}
          value={value}
          onChange={(e) =>
            handleCustomFieldChange(field.field_name, e.target.value)
          }
        />
      );
  }
};

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === "fullName") {
      setIsFullNameManuallyEdited(true);
      setFormData(prev => ({
        ...prev,
        fullName: value
      }));
      return;
    }

    setFormData(prev => {
      const nextFormData = {
        ...prev,
        [name]: value
      };

      if (
        (name === "firstName" || name === "lastName") &&
        !isFullNameManuallyEdited
      ) {
        nextFormData.fullName = buildNameFromParts(
          name === "firstName" ? value : prev.firstName,
          name === "lastName" ? value : prev.lastName
        );
      }

      return nextFormData;
    });
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

    if (!formData.email.trim()) {
      onShowMessage('Email is required', 'error');
      return;
    }

    if (!contact?.id) {
      onShowMessage('Contact ID is missing', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const trimmedFirstName = formData.firstName.trim();
      const trimmedLastName = formData.lastName.trim();
      const computedFullName = buildFullName(
        trimmedFirstName,
        trimmedLastName,
        formData.fullName
      );
      const fullNameToSend = computedFullName ? computedFullName : undefined;

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
          firstName: trimmedFirstName || undefined,
          lastName: trimmedLastName || undefined,
          fullName: fullNameToSend,
          clientId: effectiveUserId,
          emailBody: stripHtml(formData.emailBody),
          customFields: Object.fromEntries(
            Object.entries(customFieldValues).map(([key, value]) => [
              key,
              value === null || value === undefined ? "" : value.toString()
            ])
          )
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
        first_name: trimmedFirstName || undefined,
        last_name: trimmedLastName || undefined,
        full_name: fullNameToSend,
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
          customFields: customFieldValues   // ✅ ADD THIS

      };
     
      setToastMessage('Contact updated successfully!');
       setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 6000);
     // setPopupMessage({ text: 'Contact updated successfully!', type: 'success' });
      //setTimeout(() => setPopupMessage(null), 2000);
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

  const fetchEmailEngagementStats = async (contactId: number) => {
    if (!contactId) {
      setEmailEngagementStats({ sentCount: 0, openCount: 0, clickCount: 0, bounceBackCount: 0 });
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/contact-engagement/${contactId}`,
        {
          headers: {
            accept: "*/*",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch email engagement");

      const data = await response.json();
      setEmailEngagementStats({
        sentCount: Number(data?.sentCount || 0),
        openCount: Number(data?.openCount || 0),
        clickCount: Number(data?.clickCount || 0),
        bounceBackCount: Number(data?.bounceBackCount || 0),
      });
    } catch (err) {
      console.error("Failed to fetch email engagement", err);
      setEmailEngagementStats({ sentCount: 0, openCount: 0, clickCount: 0, bounceBackCount: 0 });
    }
  };

  const emailStats = React.useMemo(() => {
    const sent = emailEngagementStats.sentCount;
    const uniqueOpens = emailEngagementStats.openCount;
    const uniqueClicks = emailEngagementStats.clickCount;
    const bounceBack = emailEngagementStats.bounceBackCount;

    return {
      sent,
      uniqueOpens,
      uniqueClicks,
      bounceBack,
      uniqueOpensPct: sent ? ((uniqueOpens / sent) * 100).toFixed(1) : "0.0",
      uniqueClicksPct: sent ? ((uniqueClicks / sent) * 100).toFixed(1) : "0.0",
      bounceBackPct: sent ? ((bounceBack / sent) * 100).toFixed(1) : "0.0",
    };
  }, [emailEngagementStats]);




  useEffect(() => {
    if (contact?.id) {
      fetchEmailTimeline(contact.id);
      fetchEmailEngagementStats(contact.id);
    } else {
      setEmailEngagementStats({ sentCount: 0, openCount: 0, clickCount: 0, bounceBackCount: 0 });
    }
  }, [contact?.id]);

  const fetchPinnedEmails = useCallback(async () => {
    if (!effectiveUserId || !contact?.id) {
      setPinnedEmails([]);
      return;
    }

    setIsLoadingPinnedEmails(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/Inbox/pinned-emails`, {
        params: {
          clientId: effectiveUserId,
          contactId: contact.id,
        },
        headers: {
          accept: "*/*",
        },
      });

      const data = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : [];

      setPinnedEmails(data);
      setExpandedPinnedEmailIds(new Set());
      setPinnedEmailActionsAnchor(null);
    } catch (error) {
      console.error("Failed to fetch pinned emails", error);
      setPinnedEmails([]);
      setExpandedPinnedEmailIds(new Set());
      setPinnedEmailActionsAnchor(null);
    } finally {
      setIsLoadingPinnedEmails(false);
    }
  }, [effectiveUserId, contact?.id]);

  useEffect(() => {
    fetchPinnedEmails();
  }, [fetchPinnedEmails]);
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
    if (!effectiveUserId || !contact?.id) return;

    try {
      setIsEditMode(true);
      setEditingNoteId(note.id);
      setNoteActionsAnchor(null);

      const res = await axios.get(
        `${API_BASE_URL}/api/notes/Get-Note-By-Id`,
        {
          params: {
            clientId: effectiveUserId,
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

  const togglePinnedEmailExpand = (trackingId: string) => {
    setExpandedPinnedEmailIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackingId)) {
        next.delete(trackingId);
      } else {
        next.add(trackingId);
      }
      return next;
    });
  };

  const formatAttachmentSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAttachmentDownload = async (attachment: PinnedEmailAttachment) => {
    if (!attachment.id) return;

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
      console.error("Failed to download pinned email attachment", error);
      appModal.showError("Failed to download attachment");
    }
  };

  const renderMessageAttachments = (attachments?: PinnedEmailAttachment[]) => {
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
              onClick={() => handleAttachmentDownload(attachment)}
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
                textDecoration: "none",
                fontSize: 13,
                cursor: attachment.id ? "pointer" : "not-allowed",
              }}
              title={fileName}
              disabled={!attachment.id}
            >
              <FontAwesomeIcon icon={faPaperclip} style={{ color: "#3f9f42", flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {fileName}
              </span>
              {fileSize && (
                <span style={{ color: "#6b7280", flexShrink: 0 }}>
                  {fileSize}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const handlePinnedEmailUnpin = async (email: PinnedEmailThread) => {
    setPinnedEmailActionsAnchor(null);
    try {
      const response = await pinEmail(String(effectiveUserId), email.trackingId, null);

      if (response.data?.success === false) {
        throw new Error(response.data?.message || "Failed to unpin email");
      }

      setPinnedEmails((prev) => prev.filter((item) => item.trackingId !== email.trackingId));
      setToastMessage("Email was unpinned");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 2500);
    } catch (error) {
      console.error("Failed to unpin pinned email", error);
      appModal.showError("Failed to unpin email");
    }
  };

  const deletePinnedEmail = async (email: PinnedEmailThread, deleteMode: "soft" | "Permanent") => {
    setPinnedEmailActionsAnchor(null);
    setPinnedEmailDeleteOptionsAnchor(null);
    setIsDeletingPinnedEmail(true);
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

      setPinnedEmails((prev) => prev.filter((item) => item.trackingId !== email.trackingId));
      setShowPinnedEmailDeleteModal(false);
      setPinnedEmailToDelete(null);
      setToastMessage(deleteMode === "Permanent" ? "Email deleted permanently" : "Email moved to trash");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 2500);
    } catch (error) {
      console.error("Failed to delete pinned email", error);
      appModal.showError("Failed to delete email");
    } finally {
      setIsDeletingPinnedEmail(false);
    }
  };

  const handlePinnedEmailDelete = (email: PinnedEmailThread, deleteMode: "soft" | "Permanent") => {
    setPinnedEmailActionsAnchor(null);
    setPinnedEmailDeleteOptionsAnchor(null);
    setPinnedEmailToDelete(email);
    setPendingPinnedEmailDeleteMode(deleteMode);
    setShowPinnedEmailDeleteModal(true);
  };

  const confirmPinnedEmailDelete = () => {
    if (!pinnedEmailToDelete) return;
    deletePinnedEmail(pinnedEmailToDelete, pendingPinnedEmailDeleteMode);
  };

  const formatDateTimeIST = formatDateTimeLocal;
   const formatTimeIST = formatTimeLocal;
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
    if (!effectiveUserId || !contact?.id) return;

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
            clientId: effectiveUserId,
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
    if (!effectiveUserId || !contact?.id || !noteToDelete) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/notes/Delete-Note`, {
        params: {
          clientId: effectiveUserId,
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
       setShowErrorToast(true);
      setTimeout(() =>  setShowErrorToast(false), 3000);
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

      //setShowLinkedInSummaryPopup(false);
      dispatch(closePanel());

    } catch (error) {
      console.error("Failed to update LinkedIn summary", error);
      appModal.showError("Failed to update LinkedIn summary");
    } finally {
      setIsSavingLinkedIn(false);
      onSavingLinkedInChange?.(false);
    }
  };
  if (!isOpen || !contact) return null;

  // ---- Structured profile summary (JSON) helpers -------------------------
  // Sections of the parsed summary, each rendered in its own Personal tab.
  const chronologyItems = asArray<NonNullable<ProfileSummaryJson["chronology"]>[number]>(
    profileSummary?.chronology,
  );
  const educationItems = asArray<NonNullable<ProfileSummaryJson["education"]>[number]>(
    profileSummary?.education,
  );
  const certificationItems = asArray<NonNullable<ProfileSummaryJson["certifications"]>[number]>(
    profileSummary?.certifications,
  );
  const projectItems = asArray<NonNullable<ProfileSummaryJson["projectsAndPublications"]>[number]>(
    profileSummary?.projectsAndPublications,
  );
  const skillItems = asArray<string>(profileSummary?.skills)
    .map((skill) => cleanText(skill))
    .filter(Boolean);
  const focusParagraphs = asArray<string>(profileSummary?.recentVisibleFocus?.paragraphs)
    .map((paragraph) => cleanText(paragraph))
    .filter(Boolean);
  const notProvidedItems = asArray<string>(profileSummary?.notProvided)
    .map((item) => cleanText(item))
    .filter(Boolean);

  // Shared card chrome for the profile section tabs.
  const profileCard = (title: string, icon: any, body: React.ReactNode) => (
    <div className="rounded-lg border border-[#e5e7eb] bg-white p-5">
      <div className="mb-4 flex items-center gap-[10px]">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-[#f0fdf4] text-[#3f9f42]">
          <FontAwesomeIcon icon={icon} />
        </span>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
      </div>
      {body}
    </div>
  );

  const profileEmptyState = (message: string) => (
    <p className="text-sm italic text-gray-400">{message}</p>
  );

  const profileSubHeading = (label: string) => (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#3f9f42]">{label}</span>
      <span className="h-px flex-1 bg-gray-100" />
    </div>
  );

  const chronologyBlock = profileCard(
    "Chronology",
    faBriefcase,
    chronologyItems.length > 0 ? (
      <ol className="flex flex-col gap-5">
        {chronologyItems.map((role, index) => (
          <li key={index} className="relative border-l-2 border-[#e5f5e6] pl-4">
            <span className="absolute -left-[5px] top-[7px] h-2 w-2 rounded-full bg-[#3f9f42]" />
            {cleanText(role.dates) && (
              <p className="text-xs font-semibold uppercase tracking-wide text-[#3f9f42]">
                {cleanText(role.dates)}
              </p>
            )}
            {cleanText(role.jobTitle) && (
              <p className="text-sm font-semibold text-gray-900">{cleanText(role.jobTitle)}</p>
            )}
            {(cleanText(role.company) || cleanText(role.location)) && (
              <p className="text-sm text-gray-600">
                {[cleanText(role.company), cleanText(role.location)].filter(Boolean).join(" · ")}
              </p>
            )}
            {cleanText(role.description) && (
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                {cleanText(role.description)}
              </p>
            )}
          </li>
        ))}
      </ol>
    ) : (
      profileEmptyState("No employment history was provided in the supplied profile.")
    ),
  );

  const educationBlock = (
    <div className="flex flex-col gap-3">
      {profileCard(
        "Education",
        faGraduationCap,
        educationItems.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {educationItems.map((entry, index) => (
              <li key={index} className="border-l-2 border-[#e5f5e6] pl-4">
                {cleanText(entry.institution) && (
                  <p className="text-sm font-semibold text-gray-900">{cleanText(entry.institution)}</p>
                )}
                {cleanText(entry.qualification) && (
                  <p className="text-sm text-gray-600">{cleanText(entry.qualification)}</p>
                )}
                {cleanText(entry.dates) && (
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#3f9f42]">
                    {cleanText(entry.dates)}
                  </p>
                )}
                {cleanText(entry.details) && (
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{cleanText(entry.details)}</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          profileEmptyState("No education information was provided in the supplied profile.")
        ),
      )}

      {projectItems.length > 0 &&
        profileCard(
          "Projects & publications",
          faFileAlt,
          <ul className="flex flex-col gap-3">
            {projectItems.map((project, index) => (
              <li key={index}>
                {cleanText(project.title) && (
                  <p className="text-sm font-semibold text-gray-900">{cleanText(project.title)}</p>
                )}
                {cleanText(project.description) && (
                  <p className="text-sm leading-relaxed text-gray-600">{cleanText(project.description)}</p>
                )}
              </li>
            ))}
          </ul>,
        )}
    </div>
  );

  const skillsBlock = (
    <div className="flex flex-col gap-3">
      {profileCard(
        "Skills & core expertise",
        faStar,
        skillItems.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {skillItems.map((skill, index) => (
              <span
                key={index}
                className="rounded-full border border-[#d7ecd8] bg-[#f0fdf4] px-3 py-1 text-[13px] font-medium text-[#2f7a32]"
              >
                {skill}
              </span>
            ))}
          </div>
        ) : (
          profileEmptyState("No skills were evidenced in the supplied profile.")
        ),
      )}

      {certificationItems.length > 0 &&
        profileCard(
          "Certifications",
          faCertificate,
          <ul className="flex flex-col gap-3">
            {certificationItems.map((certification, index) => (
              <li key={index}>
                {cleanText(certification.name) && (
                  <p className="text-sm font-semibold text-gray-900">{cleanText(certification.name)}</p>
                )}
                {(cleanText(certification.issuer) || cleanText(certification.date)) && (
                  <p className="text-sm text-gray-600">
                    {[cleanText(certification.issuer), cleanText(certification.date)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ul>,
        )}
    </div>
  );

  const recentFocusBlock = profileCard(
    `${cleanText(profileSummary?.firstName) || "Recent"}${
      cleanText(profileSummary?.firstName) ? "’s recent visible focus" : " visible focus"
    }`,
    faNewspaper,
    focusParagraphs.length > 0 ? (
      <div className="flex flex-col gap-3">
        {profileSummary?.recentVisibleFocus?.hasRecentActivity === false &&
          profileSubHeading("No recent activity")}
        {focusParagraphs.map((paragraph, index) => (
          <p key={index} className="text-sm leading-relaxed text-gray-600">
            {paragraph}
          </p>
        ))}
      </div>
    ) : (
      profileEmptyState("No recent LinkedIn posts or articles were visible on the supplied profile.")
    ),
  );

  // LinkedIn summary card shown inside Personal > Professional summary tab
  const linkedInSummaryBlock = (
    <div>
      <div className="rounded-lg border border-[#e5e7eb] bg-white p-5">
        <div className="flex items-center justify-between" style={{ position: "relative" }}>
          <div className="flex gap-[10px] items-center">
            <span>
              <svg className="h-5 w-5 text-[#3f9f42]" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
            </span>
            <h3 className="text-base font-semibold text-foreground">LinkedIn summary</h3>
          </div>
          {/* 3-dot menu button for LinkedIn Summary */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLinkedInActionsAnchor(!linkedInActionsAnchor);
            }}
            style={{
              position: "relative",
              border: "none",
              background: "#ebebeb",
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
          {/* Action menu for LinkedIn Summary */}
          {linkedInActionsAnchor && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 34,
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
                  dispatch(openPanel("show-linkedin-summary-modal"));
                  setLinkedInActionsAnchor(false);
                }}
                style={menuBtnStyle}
                className="flex gap-2 items-center ml-[4px]"
              >
                <div style={menuIconStyle}>
                  <FontAwesomeIcon icon={faEdit} style={{ color: "#3f9f42", fontSize: 19 }} />
                </div>
                <span className="font-[600]">Edit</span>
              </button>
              <button
                onClick={() => {
                  setShowLinkedInDeleteModal(true);
                  setLinkedInActionsAnchor(false);
                }}
                style={menuBtnStyle}
                className="flex gap-2 items-center"
              >
                <div style={menuIconStyle}>
                  <FontAwesomeIcon icon={faTrashAlt} style={{ color: "#3f9f42", fontSize: 18 }} />
                </div>
                <span className="font-[600]">Delete</span>
              </button>
            </div>
          )}
        </div>

        {/* STRUCTURED JSON SUMMARY — the quick summary paragraph plus the
            identifying fields; the rest of the JSON lives in its own tabs. */}
        {profileSummary ? (
          <div
            style={{
              marginTop: 12,
              maxHeight: isLinkedInExpanded ? "none" : 260,
              overflowY: isLinkedInExpanded ? "visible" : "auto",
            }}
          >
            {(cleanText(profileSummary.currentJobTitle) ||
              cleanText(profileSummary.currentCompany) ||
              cleanText(profileSummary.location) ||
              cleanText(profileSummary.estimatedAge)) && (
              <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                {[
                  [cleanText(profileSummary.currentJobTitle), cleanText(profileSummary.currentCompany)]
                    .filter(Boolean)
                    .join(" at "),
                  cleanText(profileSummary.location),
                  cleanText(profileSummary.estimatedAge) &&
                    `Estimated age: ${cleanText(profileSummary.estimatedAge)}`,
                ]
                  .filter(Boolean)
                  .map((meta, index) => (
                    <span key={index}>{meta}</span>
                  ))}
              </div>
            )}

            {cleanText(profileSummary.quickSummary) ? (
              <p className="text-sm leading-relaxed text-[#374151]">
                {cleanText(profileSummary.quickSummary)}
              </p>
            ) : (
              profileEmptyState("The summary paragraph was not returned for this profile.")
            )}

            {notProvidedItems.length > 0 && (
              <p className="mt-3 text-xs italic text-gray-400">
                Not provided in the supplied profile: {notProvidedItems.join(", ")}.
              </p>
            )}

            {cleanText(profileSummary.generatedOn) && (
              <p className="mt-3 text-xs text-gray-400">
                Summary generated on {cleanText(profileSummary.generatedOn)}
              </p>
            )}
          </div>
        ) : savedLinkedInSummary ? (
          /* HTML RENDERER — contacts summarised before the JSON format */
          <div
            style={{
              fontSize: 14,
              color: "#374151",
              lineHeight: "1.6",
              whiteSpace: "normal",
              wordWrap: "break-word",
              wordBreak: "break-word",
              overflowWrap: "break-word",
              maxWidth: "100%",
              marginTop: 12,
              maxHeight: isLinkedInExpanded ? "none" : 260,
              overflowY: isLinkedInExpanded ? "visible" : "auto",
            }}
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(savedLinkedInSummary),
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => dispatch(openPanel("show-linkedin-summary-modal"))}
            style={{
              marginTop: 12,
              background: "transparent",
              border: "none",
              color: "#9ca3af",
              cursor: "pointer",
              fontSize: 14,
              fontStyle: "italic",
              padding: 0,
              textAlign: "left",
            }}
          >
            No LinkedIn summary yet. Click to add one.
          </button>
        )}
      </div>

      {/* View more / View less toggle below the card. For a JSON summary only
          the quick-summary paragraph is in this card, so measure that. */}
      {savedLinkedInSummary &&
        (profileSummary
          ? cleanText(profileSummary.quickSummary).length
          : getPlainText(savedLinkedInSummary).length) > LINKEDIN_TRUNCATE_LENGTH && (
          <div className="flex justify-center mt-4">
            <button
              type="button"
              onClick={() => setIsLinkedInExpanded(!isLinkedInExpanded)}
              className="flex items-center gap-1.5 text-sm font-semibold text-[#3f9f42]"
            >
              {isLinkedInExpanded ? "View less" : "View more"}
              <FontAwesomeIcon icon={isLinkedInExpanded ? faAngleUp : faAngleDown} />
            </button>
          </div>
        )}
    </div>
  );

  // Company > Insights tab (left column) shows ONLY the company overview.
  const availableInsightSections = companyInsightsData
    ? INSIGHT_SECTIONS.filter(
        (section) =>
          section.key === "company_overview" &&
          insightHasData(companyInsightsData[section.key]),
      )
    : [];

  // The remaining insight sections (news, search results, hiring signals, etc.)
  // are surfaced as tabs in the right-column research card instead.
  const sideInsightSections = companyInsightsData
    ? INSIGHT_SECTIONS.filter(
        (section) =>
          section.key !== "company_overview" &&
          insightHasData(companyInsightsData[section.key]),
      )
    : [];

  const companyInsightsBlock = (
    <div>
      {availableInsightSections.length > 0 ? (
        <div className="flex flex-col gap-3">
          {availableInsightSections.map((section) => (
            <div key={section.key} className="rounded-lg border border-[#e5e7eb] bg-white overflow-hidden">
              <div className="flex items-center gap-3 p-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-[#f0fdf4] text-[#3f9f42]">
                  <FontAwesomeIcon icon={section.icon} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">{section.title}</span>
                  <span className="block text-xs text-gray-500">{section.description}</span>
                </span>
              </div>
              <div className="border-t border-[#eef2f6] p-4">
                {renderInsightValue(companyInsightsData?.[section.key])}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm italic text-gray-400">No company insights available yet.</p>
      )}
    </div>
  );

  // Research card (right column): Outreach opportunities + Key findings & events,
  // both sourced from the contact's web_search_data.
  const outreachItems = companyInsightsData ? toInsightItems(companyInsightsData.personalization_angle) : [];
  const keyFindingItems = companyInsightsData ? toInsightItems(companyInsightsData.key_findings) : [];
  const eventItems = companyInsightsData
    ? toInsightItems(
        companyInsightsData.events ??
          companyInsightsData.event_insights ??
          companyInsightsData.event_findings ??
          companyInsightsData.events_findings
      )
    : [];
  const hasResearch =
    outreachItems.length > 0 ||
    keyFindingItems.length > 0 ||
    eventItems.length > 0 ||
    sideInsightSections.length > 0;

  const researchOpportunitiesBlock = hasResearch ? (
    <div className="bg-white rounded-lg p-6 shadow-[5px_5px_12px_rgba(0,0,0,0.15)] border border border-[#cccccc]">
      {/* Tabs */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 border-b border-gray-200 mb-5">
        <button
          type="button"
          onClick={() => setResearchTab("outreach")}
          className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
            researchTab === "outreach"
              ? "border-[#3f9f42] text-[#3f9f42]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Outreach opportunities
        </button>
        <button
          type="button"
          onClick={() => setResearchTab("findings")}
          className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
            researchTab === "findings"
              ? "border-[#3f9f42] text-[#3f9f42]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Key findings &amp; events
        </button>
        {sideInsightSections.map((section) => (
          <button
            key={section.key}
            type="button"
            onClick={() => setResearchTab(section.key)}
            className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              researchTab === section.key
                ? "border-[#3f9f42] text-[#3f9f42]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {section.title}
          </button>
        ))}
      </div>

      {/* OUTREACH OPPORTUNITIES TAB */}
      {researchTab === "outreach" && (
        <div className="flex flex-col gap-2.5">
          {outreachItems.length > 0 ? (
            outreachItems.map((item, i) => renderOpportunityItem(item, `o-${i}`, faThumbtack))
          ) : (
            <p className="text-sm italic text-gray-400">No outreach opportunities available yet.</p>
          )}
        </div>
      )}

      {/* KEY FINDINGS & EVENTS TAB */}
      {researchTab === "findings" && (
        <div className="flex flex-col gap-2.5">
          {keyFindingItems.map((item, i) => renderOpportunityItem(item, `f-${i}`, faList))}
          {eventItems.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-1 pt-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#3f9f42]">Events</span>
                <span className="h-px flex-1 bg-gray-100" />
              </div>
              {eventItems.map((item, i) => renderOpportunityItem(item, `e-${i}`, faBullhorn))}
            </>
          )}
          {keyFindingItems.length === 0 && eventItems.length === 0 && (
            <p className="text-sm italic text-gray-400">No key findings or events available yet.</p>
          )}
        </div>
      )}

      {/* MOVED INSIGHT SECTIONS (news, search results, hiring signals, etc.) */}
      {sideInsightSections.map(
        (section) =>
          researchTab === section.key && (
            <div key={section.key}>
              {renderInsightValue(companyInsightsData?.[section.key])}
            </div>
          ),
      )}

      {/* Footer */}
      {contact?.updated_at && (
        <div className="mt-5 pt-4 border-t border-gray-100">
          <span className="text-xs text-gray-400">Researched on {formatDateTimeIST(contact.updated_at)}</span>
        </div>
      )}
    </div>
  ) : null;

  const content = (
    <div className={`${asPage ? "w-full" : "w-[90%] max-w-6xl"} ${!asPage && "shadow-xl rounded-lg"}`}>
      {/* Flex container for left & right */}
      <div className="flex flex-row gap-8">

        {/* LEFT SIDE (Edit Contact) */}
        <div className="w-1/2 bg-white rounded-lg p-6  shadow-[5px_5px_12px_rgba(0,0,0,0.15)] border border border-[#cccccc]">
          {/* Header */}
          <div className="mb-3 flex justify-between">
            <div className='flex flex-col'>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-[600] text-gray-900">
                  {[formData.firstName, formData.lastName].filter(Boolean).join(" ").trim() ||
                    formData.fullName ||
                    "Edit contact"}
                </h1>
                {/* How the first name is usually used, then how the name sounds —
                    both come from the structured profile summary. */}
                <GenderAvatar value={profileSummary?.nameUsuallyAssociatedWith} />
                {cleanText(profileSummary?.pronunciation) && (
                  <span
                    title="Pronunciation"
                    className="rounded-full bg-[#f8fafc] border border-[#e2e8f0] px-2.5 py-1 text-xs italic text-gray-500"
                  >
                    “{cleanText(profileSummary?.pronunciation)}”
                  </span>
                )}
              </div>

            </div>
             {/* Buttons */}
              <div className="flex items-center justify-end gap-3">
                <button
                  type='button'
                  className="rounded-lg bg-[#f8fafc] border-[1.5px] border-[#e2e8f0] px-3.5 py-2 text-[13px] font-medium text-[#374151] transition-all duration-150 hover:bg-[#f1f5f9] hover:border-[#cbd5e1]"
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  style={{
                    ...defaultButtonStyle,
                    cursor: isSubmitting || !formData.email?.trim() ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting || !formData.email?.trim() ? 0.5 : 1,
                  }}
                  disabled={isSubmitting || !formData.email?.trim()}
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
                open={openSection === "personal"}
                onToggle={() => toggleSection("personal")}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                }
                title="Personal"
              >
                {/* Tabs: Information / Professional summary, then one tab per
                    section of the structured summary when there is one. */}
                <div className="flex gap-6 border-b border-gray-200 mb-6 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setPersonalTab("information")}
                    className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                      personalTab === "information"
                        ? "border-[#3f9f42] text-[#3f9f42]"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Information
                  </button>
                  <button
                    type="button"
                    onClick={() => setPersonalTab("professional")}
                    className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                      personalTab === "professional"
                        ? "border-[#3f9f42] text-[#3f9f42]"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Professional summary
                  </button>
                  {profileSummary &&
                    PROFILE_TABS.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setPersonalTab(tab.key)}
                        className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                          personalTab === tab.key
                            ? "border-[#3f9f42] text-[#3f9f42]"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                </div>

                {/* INFORMATION TAB */}
                {personalTab === "information" && (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div className='flex flex-col gap-[5px] form-group !mb-[0]'>
                      <label className={underlineLabel}>First name</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className={underlineInput}
                        placeholder="First name"
                      />
                    </div>
                    <div className='flex flex-col gap-[5px] form-group !mb-[0]'>
                      <label className={underlineLabel}>Last name</label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className={underlineInput}
                        placeholder="Last name"
                      />
                    </div>
                    {!hideFullName && (
                      <div className='flex flex-col gap-[5px] form-group !mb-[0]'>
                        <label className={underlineLabel}>Full name (optional)</label>
                        <input
                          type="text"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          className={underlineInput}
                          placeholder="Full name"
                        />
                      </div>
                    )}
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
                    <div className='flex flex-col gap-[5px] form-group !mb-[0]'>
                      <label className={underlineLabel}>LinkedIn URL</label>
                      <div className="flex items-center gap-2">
                        {/* LinkedIn Icon - Outside and to the left */}
                        {formData.linkedInUrl && (
                          <span
                            className="cursor-pointer flex-shrink-0"
                            onClick={() => {
                              const url = formData.linkedInUrl.startsWith("http")
                                ? formData.linkedInUrl
                                : `https://${formData.linkedInUrl}`;
                              window.open(url, "_blank");
                            }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="20px"
                              height="22px"
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
                          </span>
                        )}
                        <input type="text" name="linkedInUrl" value={formData.linkedInUrl} onChange={handleInputChange} placeholder="Enter LinkedIn URL" className={underlineInput}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* PROFESSIONAL SUMMARY TAB */}
                {personalTab === "professional" && linkedInSummaryBlock}

                {/* STRUCTURED SUMMARY TABS */}
                {profileSummary && personalTab === "chronology" && chronologyBlock}
                {profileSummary && personalTab === "education" && educationBlock}
                {profileSummary && personalTab === "skills" && skillsBlock}
                {profileSummary && personalTab === "recentFocus" && recentFocusBlock}
              </AccordionSection>

              {/* COMPANY INFORMATION */}
              <AccordionSection
                open={openSection === "company"}
                onToggle={() => toggleSection("company")}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                }
                title="Company"
              >
                {/* Tabs: Information / Insights */}
                <div className="flex gap-6 border-b border-gray-200 mb-6">
                  <button
                    type="button"
                    onClick={() => setCompanyTab("information")}
                    className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      companyTab === "information"
                        ? "border-[#3f9f42] text-[#3f9f42]"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Information
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompanyTab("insights")}
                    className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      companyTab === "insights"
                        ? "border-[#3f9f42] text-[#3f9f42]"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Overview
                  </button>
                </div>

                {/* INFORMATION TAB */}
                {companyTab === "information" && (
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
                  <div className="flex flex-col gap-[5px] form-group !mb-[0]">
                    <label className={underlineLabel}>Website</label>
                    <div className="flex items-center gap-2">
                      {/* Globe Icon - Outside and to the left */}
                      {formData.website && (
                        <span
                          className="cursor-pointer flex-shrink-0"
                          onClick={() => {
                            const url = formData.website.startsWith("http")
                              ? formData.website
                              : `https://${formData.website}`;
                            window.open(url, "_blank");
                          }}
                        >
                          <svg
                            width="24px"
                            height="24px"
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
                      {/* Website Input - Non-clickable, but editable */}
                      <input
                        type="text"
                        name="website"
                        value={formData.website}
                        onChange={handleInputChange}
                        placeholder="Enter website"
                        className={underlineInput}
                      />
                    </div>
                  </div>
                  <div className='flex flex-col gap-[5px] form-group !mb-[0]'>
                    <label className={underlineLabel}>Company LinkedIn URL</label>
                    <div className="flex items-center gap-2">
                      {/* LinkedIn Icon - Outside and to the left */}
                      {formData.companyLinkedInURL && (
                        <span
                          className="cursor-pointer flex-shrink-0"
                          onClick={() => {
                            const url = formData.companyLinkedInURL.startsWith("http")
                              ? formData.companyLinkedInURL
                              : `https://${formData.companyLinkedInURL}`;
                            window.open(url, "_blank");
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20px"
                            height="22px"
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
                        </span>
                      )}
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
                </div>
                )}

                {/* INSIGHTS TAB */}
                {companyTab === "insights" && companyInsightsBlock}
              </AccordionSection>

              {/* CUSTOM FIELDS */}
  <AccordionSection
    open={openSection === "custom"}
    onToggle={() => toggleSection("custom")}
    icon={
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        viewBox="0 0 24 24"
        stroke="#3f9f42"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12h6M9 16h6M9 8h6M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
      </svg>
    }
    title="Custom fields"
  >
  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

{customFieldDefs.map(field => (

      <div
        key={field.id}
        className="flex flex-col gap-[5px] form-group !mb-[0]"
      >
        <label className={underlineLabel}>
          {field.field_name}
        </label>

        {renderCustomField(field)}

      </div>

    ))}

  </div>
</AccordionSection>

              



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
            <div className="grid grid-cols-4 gap-4">
              <Stat label="Sent" value={emailStats.sent} color="#1b5e20" bgClass='bg-green-50' />

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
                color="#7c3aed"
                bgClass='bg-purple-50'
              />

              <Stat
                label="Bounce back"
                value={emailStats.bounceBack}
                percentage={emailStats.bounceBackPct}
                color="#f97316"
                bgClass='bg-orange-50'
              />
            </div>




          </div>

          {/* Outreach opportunities / Key findings & events (from web_search_data) */}
          {researchOpportunitiesBlock}

          {/* Pinned Notes */}
          {pinnedNotes.length > 0 && (
          <div className="bg-white rounded-lg p-6 shadow-[5px_5px_12px_rgba(0,0,0,0.15)] border border border-[#cccccc]">
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
                              onClick={async () => {
                                await onTogglePin?.(note.id);
                                setNoteActionsAnchor(null);
                                // await fetchNotesHistory();
                              }}
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
                              onClick={async () => {
                                await onDeleteNote?.(note.id);
                                setNoteActionsAnchor(null);
                                // await fetchNotesHistory();
                              }}
                              style={menuBtnStyle}
                              className="flex gap-2 items-center "
                            >
                               <div style={menuIconStyle}>
                                      <FontAwesomeIcon
                                        icon={faTrashAlt}
                                        style={{ color: "#3f9f42", fontSize: 18 }}
                                      />
                                    </div>
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
          </div>
          )}

          {(isLoadingPinnedEmails || pinnedEmails.length > 0) && (
            <div className="bg-white rounded-lg p-6 shadow-[5px_5px_12px_rgba(0,0,0,0.15)] border border border-[#cccccc]">
              <div className="mb-4 flex items-center gap-2">
                <span className="text-[#3f9f42]">
                  <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12H8m8-4H8m12 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h8l4 3v-3h0a2 2 0 002-2z" />
                  </svg>
                </span>
                <h3 className="text-lg font-semibold text-foreground">Pinned emails ({pinnedEmails.length})</h3>
              </div>

              {isLoadingPinnedEmails ? (
                <div style={{ fontSize: 13, color: "#6b7280" }}>Loading pinned emails...</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {pinnedEmails.map((email) => {
                    const conversationMessages = email.messages || [];
                    const latestMessage = email.messages?.[email.messages.length - 1];
                    const isExpandedEmail = expandedPinnedEmailIds.has(email.trackingId);
                    const hasEmailBody = conversationMessages.some((message) => Boolean(message.body));
                    const hasAttachments = conversationMessages.some((message) => (message.attachments || []).length > 0);

                    return (
                      <div
                        key={email.trackingId}
                        className="relative rounded-[5px] border border-solid border-[#e5e7eb] border-l-[3px] border-l-[#3f9f42] bg-[#f8fff8] p-4"
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>
                              {formatDateTimeIST(email.lastMessageDate)}
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", wordBreak: "break-word" }}>
                              {email.subject || latestMessage?.subject || "No subject"}
                            </div>
                          </div>
                          <div style={{ position: "relative", flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                const nextAnchor = pinnedEmailActionsAnchor === email.trackingId ? null : email.trackingId;
                                setPinnedEmailActionsAnchor(nextAnchor);
                                setPinnedEmailDeleteOptionsAnchor(null);
                              }}
                              style={{
                                border: "none",
                                background: "#ebebeb",
                                borderRadius: "50%",
                                width: 32,
                                height: 32,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              title="Email actions"
                            >
                              <FontAwesomeIcon icon={faEllipsisV} />
                            </button>

                            {pinnedEmailActionsAnchor === email.trackingId && (
                              <div
                                style={{
                                  position: "absolute",
                                  right: 0,
                                  top: 38,
                                  background: "#fff",
                                  border: "1px solid #eee",
                                  borderRadius: 6,
                                  boxShadow: "0 2px 16px rgba(0,0,0,0.12)",
                                  zIndex: 101,
                                  minWidth: 150,
                                }}
                                onClick={(event) => event.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => handlePinnedEmailUnpin(email)}
                                  style={menuBtnStyle}
                                  className="flex gap-2 items-center"
                                >
                                  <div style={menuIconStyle}>
                                    <PinOff size={19} color="#3f9f42" strokeWidth={2.5} />
                                  </div>
                                  <span className="font-[600]">Unpin</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setPinnedEmailDeleteOptionsAnchor(
                                      pinnedEmailDeleteOptionsAnchor === email.trackingId ? null : email.trackingId
                                    );
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
                                  <span className="font-[600]" style={{ color: "#3f9f42" }}>Delete</span>
                                </button>

                                {pinnedEmailDeleteOptionsAnchor === email.trackingId && (
                                  <div
                                    style={{
                                      borderTop: "1px solid #e5e7eb",
                                      background: "#fff",
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handlePinnedEmailDelete(email, "soft");
                                      }}
                                      style={{ ...menuBtnStyle, paddingLeft: 42 }}
                                      className="flex gap-2 items-center"
                                    >
                                      <span className="font-[600]" style={{ color: "#3f9f42" }}>Delete from Inbox</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handlePinnedEmailDelete(email, "Permanent");
                                      }}
                                      style={{ ...menuBtnStyle, paddingLeft: 42 }}
                                      className="flex gap-2 items-center"
                                    >
                                      <span className="font-[600]" style={{ color: "#3f9f42" }}>Delete permanently</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {(latestMessage?.fromEmail || email.contactEmail) && (
                          <div style={{ marginTop: 8, fontSize: 13, color: "#4b5563", wordBreak: "break-word" }}>
                            From: {latestMessage?.fromEmail || email.contactEmail}
                          </div>
                        )}

                        {(hasEmailBody || hasAttachments) && (
                          <>
                            {isExpandedEmail ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
                                {conversationMessages.map((message, messageIndex) => (
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
                                      <div style={{ fontWeight: 700, color: "#111827", wordBreak: "break-word" }}>
                                        {message.subject || email.subject || "No subject"}
                                      </div>
                                      <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
                                        {message.fromEmail && <span>From: {message.fromEmail}</span>}
                                        {message.toEmail && <span>To: {message.toEmail}</span>}
                                        {message.date && <span>{formatDateTimeIST(message.date)}</span>}
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
                                        __html: DOMPurify.sanitize(message.body || "<p>No email body available</p>"),
                                      }}
                                    />
                                    <div style={{ padding: "0 12px 12px" }}>
                                      {renderMessageAttachments(message.attachments)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div
                                style={{
                                  marginTop: 12,
                                  padding: 12,
                                  border: "1px solid #e5e7eb",
                                  borderRadius: 6,
                                  background: "#fff",
                                  maxWidth: "100%",
                                  maxHeight: 180,
                                  overflow: "hidden",
                                  fontSize: 14,
                                  lineHeight: 1.5,
                                  color: "#374151",
                                }}
                                dangerouslySetInnerHTML={{
                                  __html: DOMPurify.sanitize(latestMessage?.body || "<p>No preview available</p>"),
                                }}
                              />
                            )}

                            {!isExpandedEmail && renderMessageAttachments(latestMessage?.attachments)}

                            {(hasEmailBody || hasAttachments) && (
                              <button
                                type="button"
                                onClick={() => togglePinnedEmailExpand(email.trackingId)}
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
                                {isExpandedEmail ? "Show less" : "View conversation"}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* LinkedIn summary moved into Personal > Professional summary tab */}

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
                  style={defaultButtonStyle}
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
                  className="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-[#3f9f42] resize-y min-h-[120px]"
                />
              </div>
            </div>
          )
        }
        <CommonSidePanel
          //isOpen={showLinkedInSummaryPopup}
          isOpen={showLinkedSummaryModal}
          onClose={() => 
            //setShowLinkedInSummaryPopup(false)
            dispatch(closePanel())
          }
          title="LinkedIn Summary"
          footerContent={
            <>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => {
                    //setShowLinkedInSummaryPopup(false)
                    dispatch(closePanel())
                  }}
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
                  ...defaultButtonStyle,
                  cursor: isLinkedInSaveDisabled ? "not-allowed" : "pointer",
                  opacity: isLinkedInSaveDisabled ? 0.5 : 1,
                }}
              >
                Save
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
              <RichTextEditor
                value={linkedInSummary}
                onChange={setLinkedInSummary}
              />
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
              {linkedInPlainTextLength}/10000
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
{/* DELETE LINKEDIN SUMMARY CONFIRMATION MODAL */}
{showLinkedInDeleteModal && (
  <div style={{
    position: 'fixed',
    zIndex: 99999,
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
    <div style={{
      background: '#fff',
      padding: '32px',
      borderRadius: '12px',
      minWidth: '400px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      textAlign: 'center'
    }}>
      {/* Close Button */}
      <button
        onClick={() => setShowLinkedInDeleteModal(false)}
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          background: 'none',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          color: '#6b7280'
        }}
      >
        ✕
      </button>

      {/* Modal Title */}
      <h2 style={{
        fontSize: '20px',
        fontWeight: '600',
        marginBottom: '12px',
        color: '#1f2937',
        textAlign: 'justify'

      }}>
        Delete LinkedIn summary
      </h2>

      {/* Modal Message */}
      <p style={{
        fontSize: '16px',
        color: '#6b7280',
        marginBottom: '28px',
        lineHeight: '1.5'
      }}>
        Are you sure you want to delete this LinkedIn summary?
      </p>

      {/* Buttons */}
      <div style={{
        display: 'flex',
        gap: '12px',
        justifyContent: 'end'
      }}>
        {/* Cancel Button */}
        <button
          onClick={() => setShowLinkedInDeleteModal(false)}
          disabled={isDeleteLinkedInLoading}
          style={{
            padding: '10px 24px',
            background: '#1f2937',
            color: '#fff',
            border: 'none',
            borderRadius: '20px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: isDeleteLinkedInLoading ? 'not-allowed' : 'pointer',
            opacity: isDeleteLinkedInLoading ? 0.6 : 1,
            transition: 'background 0.2s'
          }}
        >
          Cancel
        </button>

        {/* Delete Button */}
        <button
          onClick={async () => {
            setIsDeleteLinkedInLoading(true);
            try {
              const response = await fetch(
                `${API_BASE_URL}/api/Crm/contacts/delete-linkedin-info?contactId=${contact?.id}`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                }
              );

              if (!response.ok) {
                throw new Error('Failed to delete LinkedIn summary');
              }

              // Clear the LinkedIn summary from state
              setLinkedInSummary("");
              setSavedLinkedInSummary("");
              setShowLinkedInDeleteModal(false);
              
              // Show success message
              setToastMessage('LinkedIn summary deleted successfully');
              setShowSuccessToast(true);
              setTimeout(() => setShowSuccessToast(false), 3000);
            } catch (error) {
              console.error('Error deleting LinkedIn summary:', error);
              setToastMessage('Failed to delete LinkedIn summary');
              setShowErrorToast(true);
              setTimeout(() => setShowErrorToast(false), 3000);
            } finally {
              setIsDeleteLinkedInLoading(false);
            }
          }}
          disabled={isDeleteLinkedInLoading}
          style={{
            padding: '10px 24px',
            background: '#DC2626',
            color: '#fff',
            border: 'none',
            borderRadius: '20px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: isDeleteLinkedInLoading ? 'not-allowed' : 'pointer',
            opacity: isDeleteLinkedInLoading ? 0.6 : 1,
            transition: 'background 0.2s'
          }}
        >
          {isDeleteLinkedInLoading ? 'Deleting...' : 'Delete'}
        </button>
      </div>
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
        {showPinnedEmailDeleteModal && (
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-[99999]"
            onClick={(event) => {
              event.stopPropagation();
              if (isDeletingPinnedEmail) return;
              setShowPinnedEmailDeleteModal(false);
              setPinnedEmailToDelete(null);
            }}
          >
            <div
              className="bg-white rounded-xl p-6 w-[520px] relative"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 className="text-lg font-semibold mb-3">Delete email</h2>

              <p className="text-sm text-gray-600 mb-6">
                {pendingPinnedEmailDeleteMode === "Permanent"
                  ? "Are you sure you want to permanently delete this email?"
                  : "Are you sure you want to move this email to trash?"}
              </p>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPinnedEmailDeleteModal(false);
                    setPinnedEmailToDelete(null);
                  }}
                  disabled={isDeletingPinnedEmail}
                  className="px-5 py-2 rounded-full bg-black text-white disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmPinnedEmailDelete}
                  disabled={isDeletingPinnedEmail}
                  className="px-5 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {isDeletingPinnedEmail
                    ? "Deleting..."
                    : pendingPinnedEmailDeleteMode === "Permanent"
                      ? "Delete permanently"
                      : "Delete from Inbox"}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (isDeletingPinnedEmail) return;
                  setShowPinnedEmailDeleteModal(false);
                  setPinnedEmailToDelete(null);
                }}
                className="absolute top-4 right-4 text-xl"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        <AppModal
          isOpen={appModal.isOpen}
          onClose={appModal.hideModal}
          {...appModal.config}
        />
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
                First name
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
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
                Last name
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>
            {!hideFullName && (
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                  Full name (optional)
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>
            )}

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
              disabled={isSubmitting || !formData.email.trim()}
              style={{
                ...defaultButtonStyle,
                cursor: isSubmitting || !formData.email.trim() ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || !formData.email.trim() ? 0.5 : 1,
              }}
            >
              {isSubmitting ? 'Updating...' : 'Update contact'}
            </button>
          </div>
        </form>
      </div>
      {showPinnedEmailDeleteModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[99999]"
          onClick={(event) => {
            event.stopPropagation();
            if (isDeletingPinnedEmail) return;
            setShowPinnedEmailDeleteModal(false);
            setPinnedEmailToDelete(null);
          }}
        >
          <div
            className="bg-white rounded-xl p-6 w-[520px] relative"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-3">Delete email</h2>

            <p className="text-sm text-gray-600 mb-6">
              {pendingPinnedEmailDeleteMode === "Permanent"
                ? "Are you sure you want to permanently delete this email?"
                : "Are you sure you want to move this email to trash?"}
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowPinnedEmailDeleteModal(false);
                  setPinnedEmailToDelete(null);
                }}
                disabled={isDeletingPinnedEmail}
                className="px-5 py-2 rounded-full bg-black text-white disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmPinnedEmailDelete}
                disabled={isDeletingPinnedEmail}
                className="px-5 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
              >
                {isDeletingPinnedEmail
                  ? "Deleting..."
                  : pendingPinnedEmailDeleteMode === "Permanent"
                    ? "Delete permanently"
                    : "Delete from Inbox"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (isDeletingPinnedEmail) return;
                setShowPinnedEmailDeleteModal(false);
                setPinnedEmailToDelete(null);
              }}
              className="absolute top-4 right-4 text-xl"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      <AppModal
        isOpen={appModal.isOpen}
        onClose={appModal.hideModal}
        {...appModal.config}
      />
    </div>
  );
};

export default EditContactModal;


