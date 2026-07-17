import { useState, useEffect, useRef , useMemo } from "react";
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
import "quill/dist/quill.snow.css"; // Import styles
import API_BASE_URL from "../../config";
import axios from "axios";
import AppModal from "../common/AppModal";
import { useAppModal } from "../../hooks/useAppModal";
import { useSelector } from "react-redux";
import { RootState } from "../../Redux/store";
import SendEmailPanel from "./SendEmailPanel";
import KraftEmailPanel from "./KraftEmailPanel";
import { useSoundAlert } from "../common/useSoundAlert";
import ReactMarkdown from "react-markdown";
import toggleOn from "../../assets/images/on-button.png";
import toggleOff from "../../assets/images/off-button.png";
import DOMPurify from "dompurify";
import { faAngleRight, faAngleLeft, faCircleRight, faDownload, faBullhorn } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit,faTrashAlt,faCircleXmark,faSquarePlus,faBell    } from "@fortawesome/free-regular-svg-icons";
import{formatDateTimeLocal, formatTimeLocal}from "../common/dateFormatters";
import { KraftEmailEmptyState, KraftLoadingState, KraftCampaignSelectState } from "./Output.new";
import { repairAndParseJsonObject } from "../../utils/jsonRepair";

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
  templateId?: number; // ✅ added for campaign blueprint
}

interface Campaign {
  id: number;
  campaignName: string;
  promptId: number;
  zohoViewId?: string | null;
  clientId: number;
  description?: string;
  templateId?: number;
  segmentId?: number | null;
  segmentName?: string | null;
  dataFileName?: string | null;
  dataSource?: string;
}

const normalizeExternalUrl = (url?: string | null) => {
  const trimmedUrl = url?.trim();

  if (!trimmedUrl || trimmedUrl === "N/A" || trimmedUrl === "NA") {
    return "";
  }

  return /^[a-z][a-z\d+.-]*:\/\//i.test(trimmedUrl)
    ? trimmedUrl
    : `https://${trimmedUrl}`;
};

interface OutputInterface {
  outputForm: {
    generatedContent: string;
    linkLabel: string;
    usage: string;
    currentPrompt: string;
    searchResults: string[];
    allScrapedData: string;
  };
  isResetEnabled: boolean;
  isSoundEnabled: boolean;
  setIsSoundEnabled: React.Dispatch<React.SetStateAction<boolean>>; // Add this prop

  onRegenerateContact?: (
    tab: string,
    options: {
      regenerate: boolean;
      regenerateIndex: number;
      nextPageToken?: string | null;
      prevPageToken?: string | null;
    },
  ) => void | Promise<void>;

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
    direction?: "next" | "previous" | null,
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
  clearUsage: () => void;

  toneSettings?: any;
  toneSettingsHandler?: (e: any) => void;
  fetchToneSettings?: () => Promise<void>;
  saveToneSettings?: () => Promise<boolean>;
  selectedSegmentId?: number | null; // Add this
  handleSubjectTextChange?: (value: string) => void; // Add this
  setSelectedPrompt?: React.Dispatch<React.SetStateAction<Prompt | null>>; // ✅ added

  showCreditModal?: boolean; // Add this
  checkUserCredits?: (
    clientId?: string | number | null,
  ) => Promise<
    | { total: number; canGenerate: boolean; monthlyLimitExceeded: boolean }
    | number
    | null
  >; // Add this
  userId?: string | null; // Add this
  followupEnabled?: boolean;
  setFollowupEnabled?: (value: boolean) => void;
  notKraftedEnabled?: boolean;
  setNotKraftedEnabled?: (value: boolean) => void;
  kraftedNotSentEnabled?: boolean;
  setKraftedNotSentEnabled?: (value: boolean) => void;
  onGoToBlueprints?: () => void;
  isFetchingContacts?: boolean;
}

const OutputLogBanner: React.FC<{
  content: string;
  formatOutput: (text: string) => string;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ content, formatOutput, isExpanded, onToggle }) => {
  const rawLines = content.split('\n').filter((l) => l.trim() !== '');
  const lastRawLine = rawLines[rawLines.length - 1] || '';
  // Strip HTML tags for preview so CSS ellipsis truncation works reliably
  const lastLinePlain = lastRawLine.replace(/<[^>]*>/g, '');

  return (
    <>
      <div
        className="mx-6 mt-4 rounded-lg border cursor-pointer hover:bg-[#f5f6f8] transition-colors"
        style={{ background: '#ffffff', borderColor: '#e8eaee' }}
        onClick={onToggle}
        title="Click to view full log"
      >
        <div className="flex items-center gap-2 px-3 py-2" style={{ minWidth: 0 }}>
          <span
            className="flex-shrink-0 w-2 h-2 rounded-full animate-pulse"
            style={{ background: '#22c55e' }}
          />
          <span
            style={{
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#374151',
              lineHeight: '1.4',
              display: 'block',
            }}
          >
            {lastLinePlain}
          </span>
          <span
            className="flex-shrink-0 text-[11px] font-medium px-2 py-0.5 rounded border ml-2"
            style={{ color: '#374151', background: '#f5f6f8', borderColor: '#e8eaee', whiteSpace: 'nowrap' }}
          >
            View all ({rawLines.length})
          </span>
        </div>
      </div>

      {isExpanded && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={onToggle}
        >
          <div
            style={{
              background: '#fff', borderRadius: '14px',
              maxWidth: '1100px', width: '92vw', maxHeight: '80vh',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px', borderBottom: '1px solid #e8eaee', flexShrink: 0,
              background: '#f8fafc',
            }}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: '#22c55e', flexShrink: 0 }} />
                <span style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>
                  Output Log
                </span>
                <span style={{ fontSize: '12px', color: '#6b7280', background: '#f1f5f9', padding: '1px 8px', borderRadius: '99px', border: '1px solid #e2e8f0' }}>
                  {rawLines.length} {rawLines.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>
              <button
                onClick={onToggle}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '18px', color: '#6b7280', lineHeight: 1, padding: '2px 6px',
                }}
              >
                ✕
              </button>
            </div>
            <pre
              style={{
                overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                flex: 1, margin: 0, padding: '16px 20px',
                fontFamily: 'monospace', fontSize: '12.5px', color: '#374151',
                background: '#ffffff', lineHeight: 1.6,
              }}
              dangerouslySetInnerHTML={{ __html: formatOutput(content) }}
            />
          </div>
        </div>
      )}
    </>
  );
};

const WebResearchCards: React.FC<{ content: string }> = ({ content }) => {
  const data = repairAndParseJsonObject(content);

  if (!data) {
    return (
      <div style={{ padding: '10px', border: '1px solid #e8eaee', borderRadius: '8px', lineHeight: 1.6, fontSize: '13px' }}>
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }

  const cardStyle: React.CSSProperties = {
    background: '#fff', borderRadius: '12px', border: '1px solid #e8eaee', padding: '16px 18px',
  };

  const iconMap: Record<string, string> = {
    company_overview: '🏢', overview: '🏢', company: '🏢',
    key_findings: '💡', findings: '💡', insights: '🔍',
    recent_news: '📰', news: '📰', updates: '📰',
    event_insights: '🗓', events: '🗓', event: '📅',
    personalization_angle: '✉️', personalization: '✉️',
    summary: '📋', products: '📦', services: '🛠',
    leadership: '👤', funding: '💰', competitors: '⚡',
    pain_points: '🎯', opportunities: '🌱', technology: '💻',
    social_media: '📱', contact: '📞',
  };

  const getIcon = (key: string) =>
    iconMap[key] || iconMap[Object.keys(iconMap).find(k => key.toLowerCase().includes(k)) || ''] || '📌';

  const fmtKey = (key: string) =>
    key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const renderValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) return null;

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return <p style={{ margin: 0, fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>{String(value)}</p>;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return null;

      // Array of primitives → checkmark list
      if (typeof value[0] !== 'object') {
        return (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {value.map((item, i) => (
              <li key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>
                <span style={{ color: '#22c55e', flexShrink: 0, marginTop: '1px' }}>✔</span>
                {String(item)}
              </li>
            ))}
          </ul>
        );
      }

      // Array of objects → smart rows
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {value.map((item: Record<string, any>, i) => {
            const entries = Object.entries(item).filter(([, v]) => v != null && String(v).trim() !== '');
            if (entries.length === 0) return null;

            // Detect a "date-like" field and treat the rest as the main content
            const dateEntry = entries.find(([k]) => /^(date|time|published|when|at)$/i.test(k));
            const contentEntries = entries.filter(([k]) => !/^(date|time|published|when|at)$/i.test(k));

            if (dateEntry && contentEntries.length > 0) {
              const mainText = contentEntries.map(([, v]) => String(v)).join(' — ');
              return (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '11px', color: '#6b7280', whiteSpace: 'nowrap', marginTop: '2px', minWidth: '70px' }}>
                    {String(dateEntry[1])}
                  </span>
                  <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>
                    <span style={{ color: '#3f9f42', marginRight: '6px' }}>◆</span>{mainText}
                  </span>
                </div>
              );
            }

            // Generic object row
            return (
              <div key={i} style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                {entries.map(([k, v]) => (
                  <div key={k} style={{ fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 500 }}>{fmtKey(k)}: </span>{String(v)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      );
    }

    // Plain object → description-first, then badges (short values) or rows (long values)
    if (typeof value === 'object') {
      const entries = Object.entries(value).filter(([, v]) => v != null && String(v).trim() !== '');
      if (entries.length === 0) return null;

      const descEntry = entries.find(([k]) => /description|summary|overview|about/i.test(k));
      const rest = entries.filter(([k]) => !/description|summary|overview|about/i.test(k));
      // Use row layout when any value is longer than 35 chars (e.g. event_insights focus/attendees)
      const useBadges = !rest.some(([, v]) => String(v).length > 35);

      return (
        <div>
          {descEntry && (
            <p style={{ fontSize: '13px', color: '#374151', marginBottom: '10px', lineHeight: 1.55, marginTop: 0 }}>
              {String(descEntry[1])}
            </p>
          )}
          {rest.length > 0 && (
            useBadges ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {rest.map(([k, v]) => {
                  const strVal = String(v);
                  const isUrl = /^https?:\/\//i.test(strVal) || /website|url|link/i.test(k);
                  if (isUrl) {
                    const href = /^https?:\/\//i.test(strVal) ? strVal : `https://${strVal}`;
                    return (
                      <a key={k} href={href} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '11.5px', background: '#f0fdf4', padding: '3px 10px', borderRadius: '99px', border: '1px solid #bbf7d0', color: '#15803d', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                        🔗 {strVal}
                      </a>
                    );
                  }
                  return (
                    <span key={k} style={{ fontSize: '11.5px', background: '#f1f5f9', padding: '3px 10px', borderRadius: '99px', border: '1px solid #e2e8f0', color: '#374151', whiteSpace: 'nowrap' }}>
                      <span style={{ color: '#6b7280' }}>{fmtKey(k)}: </span>{strVal}
                    </span>
                  );
                })}
              </div>
            ) : (
              // Long values → labeled rows (e.g. event_insights)
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {rest.map(([k, v]) => {
                  const strVal = String(v);
                  const isUrl = /^https?:\/\//i.test(strVal) || /website|url|link/i.test(k);
                  return (
                    <div key={k} style={{ display: 'flex', gap: '8px', fontSize: '13px', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 500, flexShrink: 0, color: '#6b7280', minWidth: '80px' }}>{fmtKey(k)}:</span>
                      {isUrl ? (
                        <a href={/^https?:\/\//i.test(strVal) ? strVal : `https://${strVal}`} target="_blank" rel="noopener noreferrer"
                          style={{ color: '#15803d', textDecoration: 'none' }}>🔗 {strVal}</a>
                      ) : (
                        <span style={{ color: '#374151', lineHeight: 1.5 }}>{strVal}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      );
    }

    return null;
  };

  const entries = Object.entries(data).filter(([, v]) => {
    if (v === null || v === undefined) return false;
    if (typeof v === 'string' && v.trim() === '') return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {entries.map(([key, value]) => {
          const isFullWidth = typeof value === 'string';
          return (
            <div key={key} style={{ ...cardStyle, ...(isFullWidth ? { gridColumn: '1 / -1', background: '#f8fafc', borderColor: '#e2e8f0' } : {}) }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '17px' }}>{getIcon(key)}</span>
                <span style={{ fontWeight: 600, fontSize: '13.5px', color: '#111827' }}>{fmtKey(key)}</span>
              </div>
              {renderValue(value)}
            </div>
          );
        })}
      </div>
      {entries.length > 0 && (
        <div style={{ marginTop: '12px', padding: '8px 14px', background: '#f8fafc', borderRadius: '8px', fontSize: '11.5px', color: '#6b7280', textAlign: 'center', border: '1px solid #e8eaee' }}>
          ✦ These insights are automatically gathered to help personalize and craft highly relevant emails.
        </div>
      )}
    </div>
  );
};

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
  setCurrentPage,
  fetchAndDisplayEmailBodies,
  selectedZohoviewId,
  onClearExistingResponse,
  isResetEnabled,
  zohoClient,
  onRegenerateContact,
  recentlyAddedOrUpdatedId,
  setRecentlyAddedOrUpdatedId,
  selectedClient,
  handleStart,
  handleStop, // Add this line
  isDemoAccount,
  settingsForm,
  settingsFormHandler,
  selectedPrompt,
  selectedCampaign,
  isProcessing,
  handleClearAll,
  campaigns,
  handleCampaignChange,
  isStopRequested,
  saveToneSettings,
  setSelectedPrompt,
  showCreditModal,
  checkUserCredits,
  userId,
  followupEnabled,
  setFollowupEnabled,
  notKraftedEnabled,
  setNotKraftedEnabled,
  kraftedNotSentEnabled,
  setKraftedNotSentEnabled,
  isSoundEnabled,
  setIsSoundEnabled,
  clearUsage,
  handleReset,
  onGoToBlueprints,
  isFetchingContacts,

}) => {
  const appModal = useAppModal();
  const [loading, setLoading] = useState(true);
  const safeCampaigns = Array.isArray(campaigns) ? campaigns : [];



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
        '<span style="color: green;">successfully generated</span>',
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
  const [tab3, setTab3] = useState("Stages");
  const tabHandler2 = (e: React.ChangeEvent<any>) => {
    const { innerText } = e.target;
    console.log(innerText, "innerText");
    setTab2(innerText);
    if (innerText === "Insights") {
      setTab3("Online research");
    }
    if (innerText === "Stages") {
      setTab3("Stages");
    }
  };

  const [emailLoading, setEmailLoading] = useState(false); // Loading state for fetching email data

  const tabHandler3 = (e: React.ChangeEvent<any>) => {
    const { innerText } = e.target;
    console.log(innerText, "innerText");
    setTab3(innerText);
  };

  const getDisplayText = (value: any, fallback = "No information available.") => {
    if (Array.isArray(value)) {
      if (value.length === 0) return fallback;
      return value
        .map((item) =>
          typeof item === "string" ? item : JSON.stringify(item, null, 2),
        )
        .join("\n\n");
    }

    if (value && typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }

    if (typeof value === "string" && value.trim() && value !== "NA") {
      return value;
    }

    return fallback;
  };

  const getWebSearchDisplayText = (
    value: any,
    fallback = "No online research available.",
  ) => {
    const hasSearchResults =
      Array.isArray(value?.searchResults) && value.searchResults.length > 0;

    const normalizedValue =
      value?.webSearchData ||
      value?.WebSearchData ||
      value?.summary ||
      value?.Summary ||
      value?.webSearchResponse?.webSearchData ||
      value?.webSearchResponse?.summary ||
      (hasSearchResults ? value.searchResults : undefined) ||
      // Only treat the raw value as content when it isn't an empty
      // web-search object (e.g. { webSearchData: "", searchResults: [] }),
      // which happens when personalization search is skipped.
      (typeof value === "string" || Array.isArray(value) ? value : "");

    return getDisplayText(normalizedValue, fallback)
      .replace(/\\n/g, "\n")
      .replace(
        /\((?!\[|https?:\/\/)([a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s)]*)?)\)/gi,
        (_match, url) => {
          const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
          return `([${url}](${href}))`;
        },
      )
      .replace(/([^\n])\s+(\*\*[A-Z][^*]{2,80}\*\*:?\s*)/g, "$1\n\n$2")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/(^|\n)\s+\n/g, "\n")
      .replace(/(#{1,6} .+)\n{2,}(?=(-|\d+\.|\*\*))/g, "$1\n")
      .trim();
  };

  const compactEmailHtml = (html: string) => {
    const sanitized = DOMPurify.sanitize(
      (html || "No email context available.").replace(/\n/g, "<br/>"),
    );
    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitized, "text/html");

    const hasVisibleContent = (node: HTMLElement) => {
      const text = node.textContent?.replace(/\s|\u00a0/g, "") || "";
      const hasMedia = !!node.querySelector("img, table, a, hr");
      const hasBackgroundImage = /background-image\s*:/i.test(
        node.getAttribute("style") || "",
      );

      return Boolean(text || hasMedia || hasBackgroundImage);
    };

    doc.body
      .querySelectorAll<HTMLElement>("p, div, span, tr, td, th")
      .forEach((node) => {
        if (!hasVisibleContent(node)) {
          node.remove();
        }
      });

    doc.body.querySelectorAll("br").forEach((br) => {
      const previous = br.previousSibling;
      const next = br.nextSibling;

      if (
        previous?.nodeName === "BR" ||
        (!previous && next?.nodeName === "BR")
      ) {
        br.remove();
      }
    });

    doc.body.querySelectorAll<HTMLElement>("tr, td, th").forEach((node) => {
      if (!hasVisibleContent(node)) {
        node.remove();
      }
    });

    doc.body.querySelectorAll<HTMLElement>("*").forEach((node) => {
      node.removeAttribute("height");
      node.style.marginTop = "0";
      node.style.marginBottom = "4px";
      node.style.paddingTop = "0";
      node.style.paddingBottom = "0";
      node.style.height = "auto";
      node.style.minHeight = "0";
      node.style.lineHeight = node.style.lineHeight || "1.35";
    });

    return doc.body.innerHTML;
  };

  const renderInsightBody = (
    text: string,
    variant: "text" | "markdown" | "html",
    isModal = false,
  ) => {
    const commonStyle: React.CSSProperties = {
      width: "100%",
      padding: "10px",
      border: "1px solid #ccc",
      borderRadius: "4px",
      fontFamily: "inherit",
      fontSize: "inherit",
      whiteSpace: variant === "text" ? "pre-wrap" : "normal",
      wordBreak: "break-word",
      overflowWrap: "anywhere",
      overflowX: "hidden",
      overflowY: isModal ? "auto" : "visible",
      height: isModal ? "800px" : "auto",
      boxSizing: "border-box",
      lineHeight: 1.45,
    };

    if (variant === "html") {
      return (
        <div
          style={commonStyle}
          dangerouslySetInnerHTML={{
            __html: compactEmailHtml(text),
          }}
        />
      );
    }

    if (variant === "markdown") {
      return (
        <div style={commonStyle}>
          <ReactMarkdown
            components={{
              p: ({ children }) => (
                <p style={{ margin: "0 0 8px", lineHeight: 1.45 }}>
                  {children}
                </p>
              ),
              h1: ({ children }) => (
                <h1 style={{ margin: "0 0 6px", fontSize: "1.2em", lineHeight: 1.3 }}>
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 style={{ margin: "0 0 6px", fontSize: "1.1em", lineHeight: 1.3 }}>
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 style={{ margin: "0 0 6px", fontSize: "1em", lineHeight: 1.3 }}>
                  {children}
                </h3>
              ),
              ul: ({ children }) => (
                <ul style={{ margin: "0 0 8px 18px", padding: 0 }}>
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol style={{ margin: "0 0 8px 18px", padding: 0 }}>
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li style={{ margin: "0 0 4px", lineHeight: 1.45 }}>
                  {children}
                </li>
              ),
              a: ({ children, href }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#2563eb", textDecoration: "underline" }}
                >
                  {children}
                </a>
              ),
            }}
          >
            {text}
          </ReactMarkdown>
        </div>
      );
    }

    return <pre style={commonStyle}>{text}</pre>;
  };

  // Consistent-font empty state shown when an insight tab has no information.
  const renderEmptyInsight = (message: string) => (
    <div className="form-group">
      <div className="d-flex mb-10"></div>
      <div
        style={{
          width: "100%",
          padding: "10px",
          border: "1px solid #ccc",
          borderRadius: "4px",
          fontFamily: "inherit",
          fontSize: "inherit",
          lineHeight: 1.45,
          color: "#374151",
          boxSizing: "border-box",
        }}
      >
        {message}
      </div>
    </div>
  );

  const renderInsightPre = (
    text: string,
    modalId: string,
    title: string,
    variant: "text" | "markdown" | "html" = "text",
  ) => (
    <div className="form-group">
      <div className="d-flex mb-10"></div>
      <span className="pos-relative d-flex justify-start">
        {renderInsightBody(text, variant)}

        <Modal
          show={openModals[modalId]}
          closeModal={() => handleModalClose(modalId)}
          buttonLabel="Ok"
          size="90%"
        >
          <label>{title}</label>
          {renderInsightBody(text, variant, true)}
        </Modal>
        <button
          className="full-view-icon d-flex align-center justify-center"
          onClick={() => handleModalOpen(modalId)}
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
  );

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
    handleReset?.();
  };
  //----------------------------------------------------------------------


  // ✅ Load blueprint when campaign changes


  //----------------------------------------------------------------------
  const [userRole, setUserRole] = useState<string>(""); // Store user role
  // === Load Campaign Blueprint when campaign is selected ===


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

  const [combinedResponses, setCombinedResponses] = useState<any[]>([]);

  const currentContact = combinedResponses[currentIndex] || {};
  const currentInsights = allsearchResults[currentIndex];
  const normalizedInsights =
    currentInsights && !Array.isArray(currentInsights) && typeof currentInsights === "object"
      ? currentInsights
      : {};

  // Empty-state messages shown (in a consistent font) when an insight tab has
  // no information that was used in the krafting of the email.
  const EMPTY_ONLINE_RESEARCH =
    "These insights are generated when krafting emails and then saved in the relevant contact.";
  const EMPTY_NOTES =
    "No notes were used in the krafting of the email. There may be no notes added for this contact, they may not have been set to include in personalization or they may not be useful in krafting this email.";
  const EMPTY_EMAILS =
    "No emails were used in the krafting of the email. There may be no email communications for this contact or they may not be useful in krafting this email.";
  const EMPTY_PROFESSIONAL_SUMMARY =
    "No professional summary information was used in the krafting of the email. There may be no professional summary for this contact or it may not be useful in krafting this email.";

  const onlineResearchText = getWebSearchDisplayText(
    normalizedInsights.webSearchData ||
      normalizedInsights.webSearchResponse ||
      normalizedInsights.searchResults ||
      everyscrapedData[currentIndex] ||
      currentInsights,
    EMPTY_ONLINE_RESEARCH,
  );
  const notesUsedText = getDisplayText(
    normalizedInsights.notes ||
      allSearchTermBodies[currentIndex] ||
      currentContact.notes,
    EMPTY_NOTES,
  );
  const emailInsightText = getDisplayText(
    normalizedInsights.emailContext || currentContact.use_email,
    EMPTY_EMAILS,
  );
  const linkedinInsightText = getDisplayText(
    normalizedInsights.linkedinInfo ||
      allsummery[currentIndex] ||
      currentContact.linkedin_info ||
      currentContact.linkedIninformation,
    EMPTY_PROFESSIONAL_SUMMARY,
  );

  // Whether each insight tab actually has information (vs. the empty message).
  const hasOnlineResearch = onlineResearchText !== EMPTY_ONLINE_RESEARCH;
  const hasNotes = notesUsedText !== EMPTY_NOTES;
  const hasEmails = emailInsightText !== EMPTY_EMAILS;
  const hasProfessionalSummary =
    linkedinInsightText !== EMPTY_PROFESSIONAL_SUMMARY;

  // Update the useEffect that sets combinedResponses to also store the original
  // In the second useEffect that notifies parent of initial data
  useEffect(() => {
    // Keep currentIndex as is when new responses are added
    if (
      currentIndex >= combinedResponses.length &&
      combinedResponses.length > 0
    ) {
      setCurrentIndex(Math.max(0, combinedResponses.length - 1));
    }
  }, [allResponses, combinedResponses.length]);

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
            "next",
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
            "previous",
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
    if (combinedResponses.length > 0) {
      setCurrentIndex(combinedResponses.length - 1);
    }
  };

  // Add this state to track the input value separately from the currentIndex
  const [inputValue, setInputValue] = useState<string>(
    (currentIndex + 1).toString(),
  );

  // Update inputValue whenever currentIndex changes
  useEffect(() => {
    setInputValue((currentIndex + 1).toString());
  }, [currentIndex]);

  const handleIndexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Always update the input field value
    setInputValue(newValue);

    // Only update the actual index if we have a valid number and responses exist
    if (newValue.trim() !== "" && combinedResponses.length > 0) {
      const pageNumber = parseInt(newValue, 10);

      if (!isNaN(pageNumber) && pageNumber > 0) {
        // Ensure it doesn't exceed the maximum
        const validPageNumber = Math.min(pageNumber, combinedResponses.length);

        // Convert to zero-based index
        setCurrentIndex(validPageNumber - 1);
      }
    } else if (combinedResponses.length > 0) {
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
        Subject: item.subject || "N/A",
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
        { wch: 25 }, //Subject
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
          writeError,
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
    sessionStorage.setItem("currentIndex", currentIndex.toString());
  }, [currentIndex]);

  // Restore contact index after campaign refresh
useEffect(() => {
  const storedIndex = sessionStorage.getItem("refreshTargetIndex");

  if (!storedIndex) return;
  if (combinedResponses.length === 0) return;

  const index = parseInt(storedIndex, 10);

  // ✅ Clamp safely to NEW dataset
  const safeIndex = Math.min(index, combinedResponses.length - 1);

  setCurrentIndex(safeIndex);

  sessionStorage.removeItem("refreshTargetIndex");
}, [combinedResponses.length]);

  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerationTargetId, setRegenerationTargetId] = useState<
    string | number | null
  >(null);
  const regenerateClickInFlightRef = useRef(false);
  const kraftStartClickInFlightRef = useRef(false);

  // Add this at the top of your component:
  useEffect(() => {
    if (recentlyAddedOrUpdatedId && combinedResponses.length > 0) {
      const ix = combinedResponses.findIndex(
        (r) => r.id === recentlyAddedOrUpdatedId,
      );
      if (ix !== -1) {
        setCurrentIndex(ix);
        setRecentlyAddedOrUpdatedId?.(null); // Use the prop version if you get it from parent!
      }
    }
  }, [combinedResponses, recentlyAddedOrUpdatedId]);

  //----------------------------------------------------------------------
// Editable content state for Subject
const [isEditingSubject, setIsEditingSubject] = useState(false);
const [editableSubject, setEditableSubject] = useState("");
const [isSavingSubject, setIsSavingSubject] = useState(false);

  useEffect(() => {
    const subject = combinedResponses[currentIndex]?.subject || "";
    setEditableSubject(subject);
    setIsEditingSubject(false);
  }, [currentIndex, combinedResponses]);

// Function to save the edited subject
  const saveEditedSubject = async () => {
    setIsSavingSubject(true);

    try {
      const currentItem = combinedResponses[currentIndex];
      const effectiveUserId =
        selectedClient !== "" ? selectedClient : reduxUserId;

      await saveToCrmUpdateEmail({
        clientId: Number(effectiveUserId),
        contactId: Number(currentItem.id),
        emailSubject: editableSubject,
        emailBody: currentItem.pitch || "",
      });

      // Update combinedResponses - PRESERVE segmentId and dataFileId
      const updatedItem = {
        ...currentItem,
        subject: editableSubject,
        segmentId: currentItem.segmentId || currentItem.SegmentId, // ✅ Preserve (check both cases)
        dataFileId: currentItem.dataFileId || currentItem.DataFileId, // ✅ Preserve (check both cases)
      };

      setCombinedResponses((prev) =>
        prev.map((item, i) =>
          i === currentIndex ? updatedItem : item,
        ),
      );

      // Update source arrays
      const allIdx = allResponses.findIndex(
        (r) => r.id === currentItem.id,
      );
      if (allIdx !== -1) {
        const updated = [...allResponses];
        updated[allIdx] = updatedItem;
        setAllResponses(updated);
      }

      const existingIdx = existingResponse.findIndex(
        (r) => r.id === currentItem.id,
      );
      if (existingIdx !== -1) {
        const updated = [...existingResponse];
        updated[existingIdx] = updatedItem;
        setexistingResponse(updated);
      }

      setIsEditingSubject(false);
      toast.success("Subject updated successfully!");
    } catch (error) {
      console.error("Failed to update subject:", error);
      toast.error("Failed to update subject");
    } finally {
      setIsSavingSubject(false);
    }
  };



  const [editableContent, setEditableContent] = useState(
    combinedResponses[currentIndex]?.pitch || "",
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isLogExpanded, setIsLogExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Shows the right-panel loader immediately when the campaign is refreshed or
  // selected, covering the gap before fetchAndDisplayEmailBodies flips
  // isFetchingContacts (e.g. while the campaign blueprint is still loading).
  const [isRefreshing, setIsRefreshing] = useState(false);
  const quillRef = useRef<any>(null);

  // Wraps the parent campaign-change handler so the loader stays visible for the
  // entire flow: selecting the campaign, loading its blueprint, and fetching its
  // contact data.
  const handleCampaignChangeWithLoader = async (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    // No loader needed when clearing the selection.
    if (!e?.target?.value) {
      handleCampaignChange?.(e);
      return;
    }
    setIsRefreshing(true);
    try {
      await handleCampaignChange?.(e);
    } finally {
      setIsRefreshing(false);
    }
  };

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
  const { playSound } = useSoundAlert();
  const saveToCrmUpdateEmail = async ({
    clientId,
    contactId,
    emailSubject,
    emailBody,
  }: SaveToCrmUpdateEmailParams): Promise<any> => {
    if (!contactId) throw new Error("Contact ID is required to update");
    if (!clientId) throw new Error("Client ID is required to update");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/contacts/update-email`,
        {
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
        },
      );

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(
          errJson.message || "Failed to update contact via CRM API",
        );
      }
      const result = await response.json();

      // 🔔 PLAY SOUND AFTER SUCCESS
      playSound();

      return result;
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
      const currentContact = combinedResponses[currentIndex];

      // Create the updated item with new pitch - PRESERVE segmentId and dataFileId
      const updatedItem = {
        ...currentContact,
        pitch: editableContent,
        segmentId: currentContact.segmentId || currentContact.SegmentId, // ✅ Preserve (check both cases)
        dataFileId: currentContact.dataFileId || currentContact.DataFileId, // ✅ Preserve (check both cases)
      };

      // First save to Zoho before updating UI - now passing the subject
      const currentItem = combinedResponses[currentIndex];
      const effectiveUserId =
        selectedClient !== "" ? selectedClient : reduxUserId;

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
        (item) => item.id === combinedResponses[currentIndex].id,
      );

      if (allResponsesIndex !== -1) {
        // Update in allResponses
        const updatedAllResponses = [...allResponses];
        updatedAllResponses[allResponsesIndex] = updatedItem;
        setAllResponses(updatedAllResponses);
      } else {
        // Check if it exists in existingResponse
        const existingResponseIndex = existingResponse.findIndex(
          (item) => item.id === combinedResponses[currentIndex].id,
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
    const currentContact = combinedResponses[currentIndex];
    if (currentContact?.pitch) {
      setEditableContent(
        aggressiveCleanHTML(currentContact.pitch),
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
  // useEffect(() => {
  //   if (isEditing && editorRef.current) {
  //     // Update editor content whenever the current index changes or when entering edit mode
  //     editorRef.current.innerHTML = editableContent;
  //   }
  // }, [isEditing, editableContent, currentIndex]);
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== editableContent) {
      editorRef.current.innerHTML = editableContent || "";
    }
  }, [editableContent]);

  const [openDeviceDropdown, setOpenDeviceDropdown] = useState(false);
  const [outputEmailWidth, setOutputEmailWidth] = useState<string>("");

  const toggleOutputEmailWidth = (deviceName: string) => {
    setOutputEmailWidth(deviceName);
    setOpenDeviceDropdown(false);
  };

  //-----------------------------------------
  // Add this interface
  interface SmtpUser {
    id: number;
    username: string;
    type?: string;
    smtpType?: string;
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
  //  const userId = sessionStorage.getItem("clientId");
  //const effectiveUserId = selectedClient !== "" ? selectedClient : userId;
  const reduxUserId = useSelector((state: RootState) => state.auth.userId);
  const effectiveUserId = selectedClient !== "" ? selectedClient : reduxUserId;
  console.log("API Payload Client ID:", effectiveUserId);

  useEffect(() => {
    console.log("User ID from Redux:", reduxUserId);
    console.log("Effective User ID:", effectiveUserId);
  }, [reduxUserId, effectiveUserId]);

  // Detect onboarding completeness for the Kraft-email empty-state checklist
  // (whether the client has any contacts / blueprints). Mirrors Dashboard.tsx.
  const [hasContacts, setHasContacts] = useState(false);
  const [hasBlueprint, setHasBlueprint] = useState(false);

  useEffect(() => {
    if (!effectiveUserId) return;
    let cancelled = false;
    (async () => {
      try {
        const [templatesRes, dataFilesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/CampaignPrompt/templates/${effectiveUserId}`).then(
            (r) => (r.ok ? r.json() : [])
          ),
          fetch(
            `${API_BASE_URL}/api/Crm/datafile-byclientid?clientId=${effectiveUserId}`
          ).then((r) => (r.ok ? r.json() : [])),
        ]);
        const templateList = Array.isArray(templatesRes?.templates)
          ? templatesRes.templates
          : Array.isArray(templatesRes)
          ? templatesRes
          : [];
        const realFiles = Array.isArray(dataFilesRes)
          ? dataFilesRes.filter((f: any) => f.id !== -1 && f.id !== "-1")
          : [];
        if (!cancelled) {
          setHasBlueprint(templateList.length > 0);
          setHasContacts(realFiles.length > 0);
        }
      } catch {
        // ignore — checklist simply shows the items as not-done
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveUserId]);

  const getCampaignSourceLabel = (campaign?: Campaign) => {
    if (!campaign) return "Source";
    if (campaign.dataSource === "Segment" && campaign.segmentName) return campaign.segmentName;
    if (campaign.dataSource === "DataFile" && campaign.dataFileName) return campaign.dataFileName;
    if (typeof campaign.zohoViewId === "string" && campaign.zohoViewId.startsWith("view_")) return "View";
    if (campaign.segmentId) return "Segment";
    if (campaign.zohoViewId) return "List";
    return "Source";
  };

  // Navigate to the Campaigns page and auto-open the edit panel for this
  // campaign (CampaignManagement reads "editCampaignId" on mount).
  const handleCampaignEditClick = (campaign?: Campaign) => {
    if (!campaign) return;
    sessionStorage.setItem("editCampaignId", campaign.id.toString());
    window.location.href = `/#/main?tab=Campaigns&t=${Date.now()}`;
    // Covers the case where the Campaigns tab is already mounted (preserved
    // panel) so the mount effect won't re-run.
    window.dispatchEvent(new CustomEvent("openCampaignEdit"));
  };

  const handleCampaignSourceClick = (campaign?: Campaign) => {
    if (!campaign || !effectiveUserId) return;

    const viewStateKey = `crm_view_state_${effectiveUserId}`;
    sessionStorage.removeItem(viewStateKey);

    if (typeof campaign.zohoViewId === "string" && campaign.zohoViewId.startsWith("view_")) {
      const viewId = campaign.zohoViewId.replace("view_", "");
      sessionStorage.setItem(
        viewStateKey,
        JSON.stringify({
          viewId: Number(viewId),
          viewMode: "detail",
          source: "kraft-email-campaign-source",
          nonce: Date.now(),
        })
      );
      window.location.href = `/#/main?tab=DataCampaigns&subtab=View&t=${Date.now()}`;
      return;
    }

    if (campaign.segmentId || campaign.dataSource === "Segment") {
      window.location.href = `/#/main?tab=DataCampaigns&subtab=Segment&segmentId=${campaign.segmentId}&t=${Date.now()}`;
      setTimeout(() => window.location.reload(), 50);
      return;
    }

    if (campaign.zohoViewId || campaign.dataSource === "DataFile") {
      window.location.href = `/#/main?tab=DataCampaigns&subtab=List&dataFileId=${campaign.zohoViewId}&t=${Date.now()}`;
      setTimeout(() => window.location.reload(), 50);
    }
  };

  // Add useEffect to fetch SMTP users
  useEffect(() => {
    const fetchSmtpUsers = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/email/get-Outboxs?clientId=${effectiveUserId}`,
          {
            headers: {
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          },
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

  // Prepend a timestamped, colored line to the shared output log (the same
  // "small part" banner used for email generation) so email-send progress and
  // errors are shown there too.
  const appendSendLog = (
    message: string,
    color: "green" | "red" | "orange" | "blue" = "green",
  ) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const stamp = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    setOutputForm((prev: any) => ({
      ...prev,
      generatedContent:
        `<span style="color: ${color}">[${stamp}] ${message}</span><br/>` +
        (prev.generatedContent || ""),
    }));
  };

  const handleSendEmail = async (
    subjectFromButton: string,

    targetContact: (typeof combinedResponses)[number] | null = null,
  ) => {
    setEmailMessage("");

    setEmailError("");

    const subjectToUse = subjectFromButton || emailFormData.Subject;

    if (!subjectToUse || !selectedSmtpUser) {
      setEmailError(
        "Please fill in all required fields: Subject and From Email.",
      );

      return;
    }

    setSendingEmail(true);

    try {
      const currentContact = targetContact || combinedResponses[currentIndex];

      if (!currentContact || !currentContact.id) {
        setEmailError("No valid contact selected");

        setSendingEmail(false);

        return;
      }

      console.log("Sending email to:", currentContact?.name);

      // In handleSendEmail function, replace the requestBody with:
      const selectedSmtp = smtpUsers.find(u => u.id === parseInt(selectedSmtpUser || "0"));
      const requestBody = {
        clientId: parseInt(effectiveUserId || "0"),
        contactid: currentContact.id,
        campaignid: selectedCampaign ? parseInt(selectedCampaign) : null,
        isFollowUp: followupEnabled || false,
        BccEmail: emailFormData.BccEmail || "",
        OutboxId: parseInt(selectedSmtpUser || "0"),
        Type: selectedSmtp?.type || selectedSmtp?.smtpType || "",
        SegmentId: currentContact.segmentId &&
          currentContact.segmentId !== "null" &&
          currentContact.segmentId !== "" &&
          !isNaN(parseInt(currentContact.segmentId))
            ? parseInt(currentContact.segmentId)
            : 0,
      };

      // Add validation before sending
      if (!requestBody.clientId || !requestBody.contactid || !requestBody.OutboxId || 
          requestBody.clientId === 0 || requestBody.OutboxId === 0) {
        setEmailError("Missing required fields: clientId, contactId, or OutboxId");
        setSendingEmail(false);
        toast.error("Missing required fields for email sending");
        return;
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/email/send-singleEmail`,

        requestBody,

        {
          headers: {
            "Content-Type": "application/json",

            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );

      setEmailMessage(response.data.message || "Email sent successfully!");

      toast.success("Email sent successfully!");

      appendSendLog(
        `Sent email successfully to contact ${currentContact.name || "N/A"} with company name ${currentContact.company || "N/A"} and email address ${currentContact.email || "N/A"}`,
        "green",
      );

      // Update the contact's email sent status

      try {
        const updatedItem = {
          ...combinedResponses[currentIndex],

          emailsentdate: new Date().toISOString(),

          PG_Added_Correctly: true,
          
          segmentId: combinedResponses[currentIndex].segmentId || combinedResponses[currentIndex].SegmentId, // ✅ Preserve (check both cases)
          dataFileId: combinedResponses[currentIndex].dataFileId || combinedResponses[currentIndex].DataFileId, // ✅ Preserve (check both cases)
        };

        setCombinedResponses((prev) =>
          prev.map((item, i) => (i === currentIndex ? updatedItem : item)),
        );

        const allResponsesIndex = allResponses.findIndex(
          (item) => item.id === updatedItem.id,
        );

        if (allResponsesIndex !== -1) {
          const updatedAll = [...allResponses];

          updatedAll[allResponsesIndex] = updatedItem;

          setAllResponses(updatedAll);
        }

        const existingResponseIndex = existingResponse.findIndex(
          (item) => item.id === updatedItem.id,
        );

        if (existingResponseIndex !== -1) {
          const updatedExisting = [...existingResponse];

          updatedExisting[existingResponseIndex] = updatedItem;

          setexistingResponse(updatedExisting);
        }

        if (response.data.nextContactId) {
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
      const failedContact = targetContact || combinedResponses[currentIndex];
      appendSendLog(
        `Failed to send email to contact ${failedContact?.name || "N/A"} with company name ${failedContact?.company || "N/A"} and email address ${failedContact?.email || "N/A"}`,
        "red",
      );

      if (axios.isAxiosError(err)) {
        const errorMessage =
          err.response?.data?.message ||
          err.response?.data ||
          "Failed to send email.";

        // Check for specific error message
        if (errorMessage === "Email body or subject is incorrect.") {
          appModal.showModal({
            type: "error",
            title: "Email Error",
            message: `Email body or subject is incorrect for ${combinedResponses[currentIndex]?.name || combinedResponses[currentIndex]?.email || "this contact"}. Please check your email content and subject line.`,
            confirmText: "OK",
          });
        } else {
          setEmailError(errorMessage);
          toast.error("Failed to send email");
        }
      } else if (err instanceof Error) {
        setEmailError(err.message);
        toast.error("Failed to send email");
      } else {
        setEmailError("An unknown error occurred.");
        toast.error("Failed to send email");
      }
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
            error.response?.data,
          );
        }
      }
    };

    if (effectiveUserId) {
      fetchBccEmails();
    }
  }, [effectiveUserId, token]);



  useEffect(() => {
    if (isEditing && combinedResponses[currentIndex]?.pitch) {
      setEditableContent(combinedResponses[currentIndex].pitch);
    }
  }, [currentIndex, combinedResponses, isEditing]);


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

  // Notes functionality
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [currentNotes, setCurrentNotes] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesMessage, setNotesMessage] = useState("");

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
  // function formatLocalDateTime(dateString: string | undefined | null): string {
  //   if (!dateString) return "N/A";

  //   let dateObj: Date | null = null;

  //   // ISO format: 'YYYY-MM-DD...'
  //   if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
  //     dateObj = new Date(dateString);
  //   }
  //   // DD-MM-YYYY HH:mm:ss format (with either - or / as separator)
  //   else if (/^\d{2}[-/]\d{2}[-/]\d{4}/.test(dateString)) {
  //     // Accept both dashes and slashes
  //     // e.g. '24-06-2025 16:35:25' or '24/06/2025 16:35:25'
  //     const [datePart, timePart] = dateString.split(" ");
  //     const [day, month, year] = datePart.split(/[-/]/).map(Number);
  //     let hour = 0,
  //       min = 0,
  //       sec = 0;
  //     if (timePart) {
  //       [hour, min, sec] = timePart.split(":").map(Number);
  //     }
  //     dateObj = new Date(year, month - 1, day, hour, min, sec);
  //   }
  //   // fallback
  //   else {
  //     dateObj = new Date(dateString);
  //   }

  //   if (!dateObj || isNaN(dateObj.getTime())) return "N/A";

  //   return dateObj
  //     .toLocaleString("en-GB", {
  //       day: "2-digit",
  //       month: "short",
  //       year: "numeric",
  //       hour: "numeric",
  //       minute: "2-digit",
  //       hour12: true,
  //     })
  //     .replace(",", "");
  // }
  const formatDateTimeIST = formatDateTimeLocal;
  const formatTimeIST = formatTimeLocal;

  // Add this useEffect after the existing combinedResponses useEffect
  useEffect(() => {
    console.log(
      "combinedResponses updated:",
      combinedResponses.length,
      "items",
    );
    console.log("Current index:", currentIndex);
    console.log("Current contact:", combinedResponses[currentIndex]);

    // NOTE: Do NOT reset currentIndex here. This effect runs in the same commit
    // as the "Restore contact index after campaign refresh" effect above, and a
    // setCurrentIndex(0) here would clobber the restored index (sending the user
    // back to the first contact after clicking refresh). Setting the index to the
    // value it already has does not force a re-render anyway, so there is nothing
    // to gain and a real bug to lose.
  }, [combinedResponses]);

  useEffect(() => {
    // This will trigger when campaigns are created/updated/deleted
    console.log("Campaigns updated in Output component:", safeCampaigns.length);
  }, [safeCampaigns.length, refreshTrigger]); // Add refreshTrigger dependency


 //-----------------------------------------bulk email sending logic------------------//
 const DELAY_OPTIONS = [
  0, 5, 10, 15, 20, 30, 40, 50, 70, 90, 130, 150, 200, 300,
];

  const [minDelay, setMinDelay] = useState(30);
  const [maxDelay, setMaxDelay] = useState(90);

  const [countdown, setCountdown] = useState<number | null>(null);

  const [isBulkSending, setIsBulkSending] = useState(false);

  const [bulkSendIndex, setBulkSendIndex] = useState(currentIndex);

  const stopBulkRef = useRef(false);

  const getRandomDelayMs = (min: number, max: number) => {
  const minMs = min * 1000;
  const maxMs = max * 1000;
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
};

const sleepWithCountdown = async (ms: number) => {
  const endTime = Date.now() + ms;

  const updateCountdown = () => {
    const remainingMs = endTime - Date.now();
    const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
    setCountdown(remainingSec);
    return remainingMs;
  };

  updateCountdown();

  while (!stopBulkRef.current) {
    const remaining = updateCountdown();
    if (remaining <= 0) break;

    // Short polling interval (not 1 sec fixed)
    await new Promise((res) => setTimeout(res, 500));
  }

  setCountdown(null);
};


  const sendEmailsInBulk = async (startIdx = 0, endIdx?: number) => {
    console.log('🚀 sendEmailsInBulk STARTED', { startIdx, endIdx, isBulkSending, selectedSmtpUser });
    
    if (isBulkSending) {
      console.log('⚠️ Already sending, returning');
      return;
    }

    if (!selectedSmtpUser) {
      console.log('❌ No SMTP user selected');
      toast.error('Please select From email first');
      return;
    }

    console.log('✅ Starting bulk send...');
    setIsBulkSending(true);
    stopBulkRef.current = false;

    let index = startIdx;
    const maxIndex = endIdx !== undefined ? Math.min(endIdx, combinedResponses.length - 1) : combinedResponses.length - 1;
    let sentCount = 0;
    let skippedCount = 0;

    while (index <= maxIndex && !stopBulkRef.current) {
      // Update current index to show the contact being processed
      setCurrentIndex(index);

      const contact = combinedResponses[index];

      // Check if we should skip this contact based on include email trail setting
      if (followupEnabled) {
        const emailedDate = contact.emailsentdate;
        const kraftedDate = contact.lastemailupdateddate;

        if (emailedDate && kraftedDate) {
          const emailedTime = new Date(emailedDate).getTime();
          const kraftedTime = new Date(kraftedDate).getTime();

          // Skip if emailed date is greater than krafted date
          if (emailedTime > kraftedTime) {
            console.log(
              `Skipping contact ${contact.id}: Email already sent after last kraft`,
            );
            skippedCount++;
            index++;
            setBulkSendIndex(index);
            await new Promise((res) => setTimeout(res, 500));
            continue;
          }
        }
      }

      try {
        // Prepare subject and request body

        const subjectToUse = contact.subject || "No subject";

        console.log("Subject:", subjectToUse);

        if (!contact.id) {
          index++;

          skippedCount++;

          setBulkSendIndex(index);

          await new Promise((res) => setTimeout(res, 500)); // Small delay before next

          continue;
        }

        // In sendEmailsInBulk function, replace the requestBody with:
        const selectedSmtp = smtpUsers.find(u => u.id === parseInt(selectedSmtpUser || "0"));
        const requestBody = {
          clientId: parseInt(effectiveUserId || "0"),
          contactid: contact.id,
          campaignid: selectedCampaign ? parseInt(selectedCampaign) : null,
          isFollowUp: followupEnabled || false,
          BccEmail: emailFormData.BccEmail || "",
          OutboxId: parseInt(selectedSmtpUser || "0"),
          Type: selectedSmtp?.type || selectedSmtp?.smtpType || "",
          SegmentId: contact.segmentId &&
            contact.segmentId !== "null" &&
            contact.segmentId !== "" &&
            !isNaN(parseInt(contact.segmentId))
              ? parseInt(contact.segmentId)
              : 0,
        };

        console.log('📧 Sending email for contact:', contact.id, 'SegmentId:', requestBody.SegmentId);

        // Remove validation - let backend handle it

        const response = await axios.post(
          `${API_BASE_URL}/api/email/send-singleEmail`,

          requestBody,

          {
            headers: {
              "Content-Type": "application/json",

              ...(token && { Authorization: `Bearer ${token}` }),
            },
          },
        );

        sentCount++;

        appendSendLog(
          `Sent email successfully to contact ${contact.name || "N/A"} with company name ${contact.company || "N/A"} and email address ${contact.email || "N/A"}`,
          "green",
        );

        // UPDATE local state for this contact

        const updatedItem = {
          ...contact,

          emailsentdate: new Date().toISOString(),

          PG_Added_Correctly: true,
          
          segmentId: contact.segmentId || contact.SegmentId, // ✅ Preserve (check both cases)
          dataFileId: contact.dataFileId || contact.DataFileId, // ✅ Preserve (check both cases)
        };

        // Update combinedResponses

        setCombinedResponses((prev) =>
          prev.map((item, i) => (i === index ? updatedItem : item)),
        );

        // Update allResponses if needed

        const allResponsesIndex = allResponses.findIndex(
          (item) => item.id === contact.id,
        );

        if (allResponsesIndex !== -1) {
          setAllResponses((prev) => {
            const updated = [...prev];

            updated[allResponsesIndex] = updatedItem;

            return updated;
          });
        }

        // Update existingResponse if needed

        const existingResponseIndex = existingResponse.findIndex(
          (item) => item.id === contact.id,
        );

        if (existingResponseIndex !== -1) {
          setexistingResponse((prev) => {
            const updated = [...prev];

            updated[existingResponseIndex] = updatedItem;

            return updated;
          });
        }
      } catch (err) {
        console.error(`Error sending email to ${contact.email}:`, err);

        appendSendLog(
          `Failed to send email to contact ${contact.name || "N/A"} with company name ${contact.company || "N/A"} and email address ${contact.email || "N/A"}`,
          "red",
        );

        if (axios.isAxiosError(err)) {
          console.error("API Error:", err.response?.data);

          const errorMessage =
            err.response?.data?.message ||
            err.response?.data ||
            "Failed to send email.";

          // Check for specific error message and show popup
          if (errorMessage === "Email body or subject is incorrect.") {
            appModal.showModal({
              type: "error",
              title: "Email Error",
              message: `Email body or subject is incorrect for ${contact.name || contact.email}. Please check your email content and subject line.`,
              confirmText: "OK",
            });

            // Wait 3 seconds before closing popup and continuing
            await new Promise((resolve) => {
              setTimeout(() => {
                appModal.hideModal();
                resolve(void 0);
              }, 3000);
            });
          }
        }

        skippedCount++;
      }

      index++;

      setBulkSendIndex(index);

      // Show progress

      const progress = `Progress: ${index}/${combinedResponses.length} (Sent: ${sentCount}, Skipped: ${skippedCount})`;

      console.log(progress); // Add console log to track progress

      // Wait before processing next email

        // Wait ONLY if next email exists
        if (index < combinedResponses.length - 1 && !stopBulkRef.current) {
          if (enableDelay) {
            const delayMs = getRandomDelayMs(minDelay, maxDelay);
            console.log(`⏳ Waiting ${delayMs / 1000}s before next email`);
            await sleepWithCountdown(delayMs);
          } else {
            // Small delay to prevent overwhelming the server
            await new Promise((res) => setTimeout(res, 500));
          }
        }

    // Throttle emails
    }

    setIsBulkSending(false);
    setCountdown(null); // 👈 ADD THIS

    stopBulkRef.current = false;

    console.log(
      `Bulk send completed. Sent: ${sentCount}, Skipped: ${skippedCount}`,
    );
  };

  const stopBulkSending = () => {
    stopBulkRef.current = true;
    setIsBulkSending(false);
    setCountdown(null);
  };




  const [sendEmailControls, setSendEmailControls] = useState(false);
  const [kraftEmailControls, setKraftEmailControls] = useState(false);
  const preserveIndexRef = useRef(false);

  // Index range states for bulk email sending
  const [startIndex, setStartIndex] = useState("");
  const [endIndex, setEndIndex] = useState("");
  const [enableDelay, setEnableDelay] = useState(false);
  const [enableIndexRange, setEnableIndexRange] = useState(false);

  // Kraft email index range states
  const [kraftStartIndex, setKraftStartIndex] = useState("");
  const [kraftEndIndex, setKraftEndIndex] = useState("");
  const [kraftEnableIndexRange, setKraftEnableIndexRange] = useState(false);


const usageData = useMemo(() => {
  if (!outputForm?.usage) return null;
  try {
    const parsed = JSON.parse(outputForm.usage);
    const toUsageNumber = (value: unknown) => {
      const numericValue = Number(value);
      return Number.isFinite(numericValue) ? numericValue : 0;
    };

    return {
      last: {
        tokens: toUsageNumber(parsed?.last?.tokens),
        cost: toUsageNumber(parsed?.last?.cost),
        emails: toUsageNumber(parsed?.last?.emails),
      },
      total: {
        tokens: toUsageNumber(parsed?.total?.tokens),
        cost: toUsageNumber(parsed?.total?.cost),
        emails: toUsageNumber(parsed?.total?.emails),
      },
    };
  } catch {
    return null;
  }
}, [outputForm.usage]);

const [editingIndex, setEditingIndex] = useState<number | null>(null);
useEffect(() => {
  if (!isEditing) return;

  if (editorRef.current) {
    editorRef.current.innerHTML = editableContent || "";
    editorRef.current.focus();
  }
}, [isEditing]);


  const editableArea = useRef<HTMLDivElement | null>(null);
  const [tabPanelHeight, setTabPanelHeight] = useState(0); // div2 height

    useEffect(() => {
    const updateHeight = () => {
      if (editableArea?.current) {
        setTabPanelHeight(editableArea?.current && editableArea?.current.offsetHeight);
      }
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  






  if (safeCampaigns.length === 0) {
    return (
      <KraftEmailEmptyState
        onGoToBlueprints={onGoToBlueprints}
        hasContacts={hasContacts}
        hasBlueprint={hasBlueprint}
        hasCampaign={safeCampaigns.length > 0}
      />
    );
  }

  const selectedCampaignDetails = safeCampaigns.find((c) => String(c?.id) === selectedCampaign);

  if (!selectedCampaign) {
    return (
      <KraftCampaignSelectState
        campaigns={safeCampaigns}
        selectedCampaign={selectedCampaign}
        handleCampaignChange={handleCampaignChangeWithLoader}
      />
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#ffffff' }}>
      {/* PAGE HEADER */}
      <div className="flex items-start justify-between pt-4 pb-4 px-6">
        <div>
          <h1 className="text-[26px] font-bold text-[#111827] leading-tight">Kraft emails</h1>
          
        </div>
        <div className="flex items-center gap-3">
          {userRole === "ADMIN" && usageData && (
            <div style={{ padding: "6px 10px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "11px", lineHeight: "1.3", whiteSpace: "nowrap", position: "relative" }}>
              <button onClick={clearUsage} title="Clear usage" style={{ position: "absolute", top: "4px", right: "6px", border: "none", background: "transparent", cursor: "pointer", fontSize: "12px", color: "#64748b" }}>✕</button>
              <div style={{ display: "flex", gap: "10px" }}><strong>Last:</strong><span>Tokens {usageData.last.tokens}</span><span>💲{usageData.last.cost.toFixed(6)}</span></div>
              <div style={{ display: "flex", gap: "10px", marginTop: "2px" }}><strong>Total:</strong><span>Emails {usageData.total.emails}</span><span>Tokens {usageData.total.tokens}</span><span>💲{usageData.total.cost.toFixed(6)}</span></div>
            </div>
          )}
          <div className="flex items-center">
            <ReactTooltip anchorSelect="#download-data-tooltip" place="top">Download all loaded emails to a spreadsheet</ReactTooltip>
            <a href="#" id="download-data-tooltip" onClick={(e) => { e.preventDefault(); if (!isExporting && combinedResponses.length > 0) { exportToExcel(); } }} className="export-link green flex items-center">
              <FontAwesomeIcon icon={faDownload} style={{ color: "#3f9f42", fontSize: 18 }} />
            </a>
          </div>
          <div className="flex items-center gap-2 cursor-pointer" title={isSoundEnabled ? "Sound ON" : "Sound OFF"} onClick={() => setIsSoundEnabled((prev) => !prev)}>
            <FontAwesomeIcon icon={faBell} style={{ color: "#3f9f42", fontSize: 18 }} />
            <img src={isSoundEnabled ? toggleOn : toggleOff} alt="Sound Toggle" style={{ height: "28px", width: "32px" }}/>
          </div>
        </div>
      </div>

      <div className="px-6 pb-12">
        <div className="grid gap-5 items-start" style={{ gridTemplateColumns: '380px 1fr' }}>

          {/* LEFT CARD */}
          <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e8eaee' }}>
            {/* Campaign section */}
            <div className="mb-1">
              <div className="flex items-center gap-2">
                <div className="form-group !mb-0 flex-1">
                  <select
                    onChange={handleCampaignChangeWithLoader}
                    value={selectedCampaign}
                    className="w-full"
                  >
                    <option value="">Campaign</option>
                    {safeCampaigns
                      .slice()
                      .sort((a, b) =>
                        String(a?.campaignName ?? "").toLowerCase().localeCompare(
                          String(b?.campaignName ?? "").toLowerCase(),
                        ),
                      )
                      .map((campaign) => (
                      <option key={campaign.id} value={String(campaign.id)}>
                        {campaign.campaignName}
                      </option>
                    ))}
                  </select>
                  {!selectedCampaign && (
                    <small className="error-text">Select a campaign</small>
                  )}
                </div>
              </div>
              {selectedCampaign && selectedCampaignDetails?.description && (
                <small className="campaign-description mt-1 block text-[12px]" style={{ color: '#6b7280' }}>
                  {selectedCampaignDetails.description}
                </small>
              )}
            </div>

            {/* Campaign banner */}
            {selectedCampaign ? (
              <div className="flex items-center justify-between gap-2 rounded-lg px-3 py-1 mb-2 text-[13px] font-medium" style={{ background: 'transparent', color: '#2d7a30' }}>
                <span className="flex items-center gap-2">✓ Campaign loaded</span>
                {/* Grouped, right-aligned campaign action icons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <ReactTooltip
                    anchorSelect="#refresh-campaign-tooltip"
                    place="top"
                    positionStrategy="fixed"
                    style={{ zIndex: 99999 }}
                  >
                    Refresh campaign
                  </ReactTooltip>
                  <button
                    id="refresh-campaign-tooltip"
                    className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-[#f5f6f8] flex-shrink-0"
                    style={{ borderColor: '#e8eaee', background: '#ffffff' }}
                    onClick={async () => {
                      const indexToPreserve = currentIndex;
                      sessionStorage.setItem("refreshTargetIndex", indexToPreserve.toString());
                      sessionStorage.removeItem("selectedPrompt");
                      sessionStorage.removeItem("campaignSubjectConfig");
                      setJumpToNewLast(false);
                      setIsRefreshing(true); // show the right-panel loader right away
                      setCombinedResponses([]);
                      setAllResponses([]);
                      setexistingResponse([]);
                      setSelectedPrompt?.(null);
                      setCurrentIndex(0);
                      try {
                        await handleCampaignChange?.({
                          target: { value: selectedCampaign },
                        } as React.ChangeEvent<HTMLSelectElement>);
                      } finally {
                        setIsRefreshing(false);
                      }
                    }}
                    aria-label="Refresh campaign"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 16 16" fill="none">
                      <g fill="#3f9f42"><path d="M8 1.5A6.5 6.5 0 001.5 8 .75.75 0 010 8a8 8 0 0113.5-5.81v-.94a.75.75 0 011.5 0v3a.75.75 0 01-.75.75h-3a.75.75 0 010-1.5h1.44A6.479 6.479 0 008 1.5zM15.25 7.25A.75.75 0 0116 8a8 8 0 01-13.5 5.81v.94a.75.75 0 01-1.5 0v-3a.75.75 0 01.75-.75h3a.75.75 0 010 1.5H3.31A6.5 6.5 0 0014.5 8a.75.75 0 01.75-.75z"/></g>
                    </svg>
                  </button>

                  {/* Edit campaign */}
                  <ReactTooltip
                    anchorSelect="#edit-campaign-tooltip"
                    place="top"
                    positionStrategy="fixed"
                    style={{ zIndex: 99999 }}
                  >
                    Edit campaign
                  </ReactTooltip>
                  <button
                    id="edit-campaign-tooltip"
                    className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-[#f5f6f8] flex-shrink-0"
                    style={{ borderColor: '#e8eaee', background: '#ffffff' }}
                    onClick={() => handleCampaignEditClick(selectedCampaignDetails)}
                    aria-label="Edit campaign"
                  >
                    <FontAwesomeIcon icon={faBullhorn} style={{ color: "#3f9f42", fontSize: 16 }} />
                  </button>

                  {(selectedCampaignDetails?.zohoViewId || selectedCampaignDetails?.segmentId || selectedCampaignDetails?.dataSource) && (
                    <>
                      <ReactTooltip
                        anchorSelect="#go-source-tooltip"
                        place="top"
                        positionStrategy="fixed"
                        style={{ zIndex: 99999 }}
                      >
                        Edit data
                      </ReactTooltip>
                      <button
                        id="go-source-tooltip"
                        className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-[#f5f6f8] flex-shrink-0"
                        style={{ borderColor: '#e8eaee', background: '#ffffff' }}
                        onClick={() => handleCampaignSourceClick(selectedCampaignDetails)}
                        aria-label="Edit data"
                      >
                        <FontAwesomeIcon icon={faCircleRight} style={{ color: "#3f9f42", fontSize: 18 }} />
                      </button>
                    </>
                  )}
                  {selectedCampaignDetails?.templateId && (
                    <>
                      <ReactTooltip
                        anchorSelect="#edit-blueprint-tooltip"
                        place="top"
                        positionStrategy="fixed"
                        style={{ zIndex: 99999 }}
                      >
                        Edit this campaign's blueprint
                      </ReactTooltip>
                      <button
                        id="edit-blueprint-tooltip"
                        className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-[#f5f6f8] flex-shrink-0"
                        style={{ borderColor: '#e8eaee', background: '#ffffff' }}
                        onClick={async () => {
                          const campaign = selectedCampaignDetails;
                          if (campaign?.templateId) {
                            try {
                              const response = await fetch(`${API_BASE_URL}/api/CampaignPrompt/campaign/${campaign.templateId}`);
                              if (response.ok) {
                                const fullTemplate = await response.json();
                                const example = fullTemplate?.placeholderValues?.example_output_email || "";
                                if (fullTemplate.placeholderValues) {
                                  sessionStorage.setItem("campaign_placeholder_values", JSON.stringify(fullTemplate.placeholderValues));
                                }
                                sessionStorage.setItem("editTemplateId", campaign.templateId.toString());
                                sessionStorage.setItem("editTemplateMode", "true");
                                sessionStorage.setItem("newCampaignId", campaign.templateId.toString());
                                sessionStorage.setItem("newCampaignName", fullTemplate.templateName || campaign.campaignName);
                                sessionStorage.setItem("initialExampleEmail", example);
                                if (fullTemplate.templateDefinitionId) {
                                  sessionStorage.setItem("selectedTemplateDefinitionId", fullTemplate.templateDefinitionId.toString());
                                }
                                window.dispatchEvent(new CustomEvent("switchToBlueprint", { detail: { templateId: campaign.templateId } }));
                              }
                            } catch (error) {
                              console.error("Error loading blueprint:", error);
                            }
                          }
                        }}
                        aria-label="Edit this campaign's blueprint"
                      >
                        <FontAwesomeIcon icon={faEdit} style={{ color: "#3f9f42", fontSize: 18 }}/>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 mb-4 text-[13px]" style={{ background: '#eef6ff', border: '1px solid #cfe0ff', color: '#1e40af' }}>
                ℹ Select a campaign to begin
              </div>
            )}

            {/* Stop warning */}
            {isStopRequested && !isResetEnabled && (
              <div style={{ color: "red", marginBottom: "8px", fontWeight: 500 }}>
                Please wait, the last pitch generation is being completed...
                <span className="animated-ellipsis"></span>
              </div>
            )}

            {/* Send Email Panel - always visible in left card */}
            <SendEmailPanel
              key={`send-panel-${combinedResponses.length}-${currentIndex}`}
              isOpen={false}
          onClose={() => setSendEmailControls(!sendEmailControls)}
          bccOptions={bccOptions}
          emailFormData={emailFormData}
          setEmailFormData={setEmailFormData}
          bccSelectMode={bccSelectMode}
          setBccSelectMode={setBccSelectMode}
          smtpUsers={smtpUsers}
          selectedSmtpUser={selectedSmtpUser}
          setSelectedSmtpUser={setSelectedSmtpUser}
          minDelay={minDelay}
          setMinDelay={setMinDelay}
          maxDelay={maxDelay}
          setMaxDelay={setMaxDelay}
          DELAY_OPTIONS={DELAY_OPTIONS}
          startIndex={startIndex}
          setStartIndex={setStartIndex}
          endIndex={endIndex}
          setEndIndex={setEndIndex}
          combinedResponses={combinedResponses}
          isBulkSending={isBulkSending}
          countdown={countdown}
          sendingEmail={sendingEmail}
          emailMessage={emailMessage}
          currentIndex={currentIndex}
          followupEnabled={followupEnabled}
          enableDelay={enableDelay}
          setEnableDelay={setEnableDelay}
          enableIndexRange={enableIndexRange}
          setEnableIndexRange={setEnableIndexRange}
          overwriteDatabase={settingsForm?.overwriteDatabase ?? false}
          setFollowupEnabled={setFollowupEnabled}
          notKraftedEnabled={notKraftedEnabled}
          setNotKraftedEnabled={setNotKraftedEnabled}
          kraftedNotSentEnabled={kraftedNotSentEnabled}
          setKraftedNotSentEnabled={setKraftedNotSentEnabled}
          filteredResponses={combinedResponses}
          selectedZohoviewId={selectedZohoviewId}
          fetchAndDisplayEmailBodies={fetchAndDisplayEmailBodies}

          setOverwriteDatabase={(val: boolean) =>
            settingsFormHandler?.({
              target: {
                name: "overwriteDatabase",
                type: "checkbox",
                checked: val,
                value: val,
              },
            } as any)
          }


          onSendSingle={async () => {
            if (!combinedResponses[currentIndex]) {
              toast.error("No contact selected");
              return;
            }
            if (!selectedSmtpUser) {
              toast.error("Please select From email");
              return;
            }
            const subject = combinedResponses[currentIndex]?.subject || "No subject";
            await handleSendEmail(subject);
          }}
          onSendAll={() => {
            if (isBulkSending) {
              stopBulkSending();
            } else {
              if (!selectedSmtpUser) {
                toast.error("Please select From email first");
                return;
              }
              if (enableDelay && minDelay > maxDelay) {
                toast.error("Min delay cannot be greater than max delay");
                return;
              }
              const start = enableIndexRange && startIndex ? parseInt(startIndex) - 1 : currentIndex;
              const end = enableIndexRange && endIndex ? parseInt(endIndex) - 1 : undefined;
              if (enableIndexRange) {
                if (start < 0 || start >= combinedResponses.length) {
                  toast.error("Invalid start index");
                  return;
                }
                if (end !== undefined && (end < start || end >= combinedResponses.length)) {
                  toast.error("Invalid end index");
                  return;
                }
              }
              sendEmailsInBulk(start, end);
            }
          }}
           onStart={async () => {
          if (showCreditModal) {
            return;
          }
          if (kraftStartClickInFlightRef.current) {
            return;
          }

          kraftStartClickInFlightRef.current = true;

          try {
            if (
              sessionStorage.getItem("isDemoAccount") !== "true"
            ) {
              const effectiveUserId =
                selectedClient !== "" ? selectedClient : userId;
              const currentCredits =
                await checkUserCredits?.(effectiveUserId);
              const canGenerate =
                typeof currentCredits === "number"
                  ? currentCredits > 0
                  : currentCredits && typeof currentCredits === "object"
                    ? currentCredits.canGenerate !== false && Number((currentCredits as any).total ?? 0) > 0
                    : false;
              if (!canGenerate) {
                return;
              }
            }

            const startIdx = kraftEnableIndexRange && kraftStartIndex ? parseInt(kraftStartIndex) - 1 : undefined;
            await handleStart?.(startIdx);
          } finally {
            kraftStartClickInFlightRef.current = false;
          }
        }}
        onStop={handleStop}
        isResetEnabled={isResetEnabled}
            />
          </div>

          {/* RIGHT PANEL */}
          <div ref={editableArea} className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#e8eaee', position: 'relative' }}>
            {/* Right-panel overlay: loading contacts */}
            {(isFetchingContacts || isRefreshing) && (
              <div style={{ position: 'absolute', inset: 0, background: '#fff', zIndex: 10, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '48px' }}>
                <KraftLoadingState />
              </div>
            )}
            {/* Output log - one-liner with expand toggle */}
            {outputForm.generatedContent && (
              <OutputLogBanner
                content={outputForm.generatedContent}
                formatOutput={formatOutput}
                isExpanded={isLogExpanded}
                onToggle={() => setIsLogExpanded(p => !p)}
              />
            )}

            {/* Pager navigation + tab bar */}
            <div className="px-6 pt-3">
            {/* Wrapper for navigation + contact index */}
            <div className="d-flex align-items-center gap gap-3">
              {/* Navigation buttons */}
              <div className="d-flex align-items-center gap-1">
                <button
                  onClick={handleFirstPage}
                  disabled={isProcessing}
                  title="Click to go to the first generated email"
                  className="secondary-button h-[35px] w-[38px] !px-[5px] !py-[10px] flex justify-center items-center"
                >
                  <img
                    src={previousIcon}
                    alt="Previous"
                    style={{ width: "20px", height: "20px", objectFit: "contain" }}
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
                      marginLeft: "-7px",
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
                      marginRight: "-7px",
                    }}
                  />
                </button>

                <button
                  onClick={handleLastPage}
                  disabled={isProcessing || currentIndex === combinedResponses.length - 1}
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
              </div>

              {/* Contact index */}
              <div className="d-flex align-items-center font-size-medium h-[35px]">
                <span className="flex items-center">Contact:</span>
                <input
                  type="number"
                  value={inputValue}
                  onChange={handleIndexChange}
                  onBlur={() => {
                    if (
                      inputValue.trim() === "" ||
                      isNaN(parseInt(inputValue, 10)) ||
                      parseInt(inputValue, 10) < 1
                    ) {
                      setInputValue((currentIndex + 1).toString());
                    }
                  }}
                  min="1"
                  max={combinedResponses.length}
                  className="form-control text-center !mx-2"
                  style={{
                    width: "70px",
                    padding: "8px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                  }}
                />
                <span className="flex items-center">
                  of{" "}
                  {selectedZohoviewId
                    ? (() => {
                      const selectedView = zohoClient.find(
                        (client) => client.zohoviewId === selectedZohoviewId,
                      );
                      return selectedView
                        ? selectedView.totalContact
                        : combinedResponses.length;
                    })()
                    : zohoClient.reduce(
                      (sum, client) => sum + client.totalContact,
                      0,
                    )
                  }
                </span>
              </div>
              {/* Add this inside your green box area */}
            </div>

            {/* New Tab */}
            {tab === "New" && (
              <>
                <div className="tabs secondary d-flex align-center flex-col-991 justify-between !mb-[4px]">
                  <ul className="d-flex">
                    <li>
                      <button
                        onClick={tabHandler2}
                        className={`button ${tab2 === "Output" ? "active" : ""}`}
                      >
                        Output
                      </button>
                    </li>

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
                    {userRole === "ADMIN" && (
                      <li>
                        <button
                          onClick={tabHandler2}
                          className={`button ${tab2 === "Insights" ? "active" : ""}`}
                        >
                          Insights
                        </button>
                      </li>
                    )}
                    <li></li>
                  </ul>
                  {/* {!isDemoAccount && (
                    <div
                      className="flex items-center"
                      style={{ marginRight: "890px" }}
                    >
                      <label className="checkbox-label !mb-[0px] mr-[5px] flex items-center">
                        <input
                          type="checkbox"
                          checked={followupEnabled || false}
                          onChange={(e) => {
                            setFollowupEnabled?.(e.target.checked);
                          }}
                          className="!mr-0"
                        />
                        <span style={{ fontSize: "14px", whiteSpace: "nowrap" }}>
                          Include email trail
                        </span>
                      </label>
                    </div>
                  )} */}
                </div>
                {tab2 === "Output" && (
                  <>

                    <div className="form-group mb-0 mt-0">
                      <div className="d-flex justify-between w-full">
                        <div
                          className="contact-info !text-[18px] self-start leading-[35px] inline-block break-words break-all text-[#111] px-[10px] py-[5px] bg-[#f5f6fa] rounded-[5px] mt-0 mb-[10px] mr-[5px] ml-0 border border-[#b3b3b3]"
                          style={{ color: "#111111" }}
                        >
                          {/* <strong style={{ whiteSpace: "pre" }}>Contact: </strong> */}
                          {/* <span style={{ whiteSpace: "pre" }}> </span> */}
                          <span
                           onClick={() => {
                           const contact = combinedResponses[currentIndex];
                           if (!contact?.id) return;

                           const contactDetailsUrl = `/#/contact-details/${contact.id}?tab=Output&dataFileId=${contact?.dataFileId}&clientId=${effectiveUserId}`;
                           window.open(contactDetailsUrl, "_blank");
                           }}
                           className="cursor-pointer text-[#3f9f42] hover:underline font-semibold px-[10px]"
                          >
                          {combinedResponses[currentIndex]?.name || "NA"}
                          </span>
                          {combinedResponses[currentIndex]?.title || "NA"}
                          <span className="text-[25px] inline-block relative top-[4px] px-[10px]">
                            &bull;
                          </span>
                          {combinedResponses[currentIndex]?.company || "NA"}
                          <span className="text-[25px] inline-block relative top-[4px] px-[10px]">
                            &bull;
                          </span>
                          {combinedResponses[currentIndex]?.location || "NA"}
                          <span style={{ whiteSpace: "pre" }}> </span>

                          <ReactTooltip
                            anchorSelect="#website-icon-tooltip"
                            place="top"
                          >
                            {combinedResponses[currentIndex]?.website && 
                             combinedResponses[currentIndex]?.website.trim() !== "" && 
                             combinedResponses[currentIndex]?.website !== "N/A" && 
                             combinedResponses[currentIndex]?.website !== "NA" 
                             ? "Open company website" : "Website URL not available"}
                          </ReactTooltip>
                          {combinedResponses[currentIndex]?.website && 
                           combinedResponses[currentIndex]?.website.trim() !== "" && 
                           combinedResponses[currentIndex]?.website !== "N/A" && 
                           combinedResponses[currentIndex]?.website !== "NA" ? (
                            <a
                              href={normalizeExternalUrl(
                                combinedResponses[currentIndex]?.website,
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              id="website-icon-tooltip"
                            >
                              <span className="inline-block relative top-[8px] mr-[3px]">
                                <svg
                                  width="26px"
                                  height="26px"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    fill-rule="evenodd"
                                    clip-rule="evenodd"
                                    d="M9.83824 18.4467C10.0103 18.7692 10.1826 19.0598 10.3473 19.3173C8.59745 18.9238 7.07906 17.9187 6.02838 16.5383C6.72181 16.1478 7.60995 15.743 8.67766 15.4468C8.98112 16.637 9.40924 17.6423 9.83824 18.4467ZM11.1618 17.7408C10.7891 17.0421 10.4156 16.1695 10.1465 15.1356C10.7258 15.0496 11.3442 15 12.0001 15C12.6559 15 13.2743 15.0496 13.8535 15.1355C13.5844 16.1695 13.2109 17.0421 12.8382 17.7408C12.5394 18.3011 12.2417 18.7484 12 19.0757C11.7583 18.7484 11.4606 18.3011 11.1618 17.7408ZM9.75 12C9.75 12.5841 9.7893 13.1385 9.8586 13.6619C10.5269 13.5594 11.2414 13.5 12.0001 13.5C12.7587 13.5 13.4732 13.5593 14.1414 13.6619C14.2107 13.1384 14.25 12.5841 14.25 12C14.25 11.4159 14.2107 10.8616 14.1414 10.3381C13.4732 10.4406 12.7587 10.5 12.0001 10.5C11.2414 10.5 10.5269 10.4406 9.8586 10.3381C9.7893 10.8615 9.75 11.4159 9.75 12ZM8.38688 10.0288C8.29977 10.6478 8.25 11.3054 8.25 12C8.25 12.6946 8.29977 13.3522 8.38688 13.9712C7.11338 14.3131 6.05882 14.7952 5.24324 15.2591C4.76698 14.2736 4.5 13.168 4.5 12C4.5 10.832 4.76698 9.72644 5.24323 8.74088C6.05872 9.20472 7.1133 9.68686 8.38688 10.0288ZM10.1465 8.86445C10.7258 8.95042 11.3442 9 12.0001 9C12.6559 9 13.2743 8.95043 13.8535 8.86447C13.5844 7.83055 13.2109 6.95793 12.8382 6.2592C12.5394 5.69894 12.2417 5.25156 12 4.92432C11.7583 5.25156 11.4606 5.69894 11.1618 6.25918C10.7891 6.95791 10.4156 7.83053 10.1465 8.86445ZM15.6131 10.0289C15.7002 10.6479 15.75 11.3055 15.75 12C15.75 12.6946 15.7002 13.3521 15.6131 13.9711C16.8866 14.3131 17.9412 14.7952 18.7568 15.2591C19.233 14.2735 19.5 13.1679 19.5 12C19.5 10.8321 19.233 9.72647 18.7568 8.74093C17.9413 9.20477 16.8867 9.6869 15.6131 10.0289ZM17.9716 7.46178C17.2781 7.85231 16.39 8.25705 15.3224 8.55328C15.0189 7.36304 14.5908 6.35769 14.1618 5.55332C13.9897 5.23077 13.8174 4.94025 13.6527 4.6827C15.4026 5.07623 16.921 6.08136 17.9716 7.46178ZM8.67765 8.55325C7.61001 8.25701 6.7219 7.85227 6.02839 7.46173C7.07906 6.08134 8.59745 5.07623 10.3472 4.6827C10.1826 4.94025 10.0103 5.23076 9.83823 5.5533C9.40924 6.35767 8.98112 7.36301 8.67765 8.55325ZM15.3224 15.4467C15.0189 16.637 14.5908 17.6423 14.1618 18.4467C13.9897 18.7692 13.8174 19.0598 13.6527 19.3173C15.4026 18.9238 16.921 17.9186 17.9717 16.5382C17.2782 16.1477 16.3901 15.743 15.3224 15.4467ZM12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z"
                                    fill="#3f9f42"
                                  />
                                </svg>
                              </span>
                              {/* {combinedResponses[currentIndex]?.website || "NA"} */}
                            </a>
                          ) : (
                            <span
                              style={{
                                height: "20px",
                                display: "inline-block",
                                opacity: 0.5,
                                cursor: "not-allowed"
                              }}
                              id="website-icon-tooltip"
                            >
                              <span className="inline-block relative top-[9px] mr-[3px]">
                                <svg
                                  width="28px"
                                  height="28px"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    fill-rule="evenodd"
                                    clip-rule="evenodd"
                                    d="M9.83824 18.4467C10.0103 18.7692 10.1826 19.0598 10.3473 19.3173C8.59745 18.9238 7.07906 17.9187 6.02838 16.5383C6.72181 16.1478 7.60995 15.743 8.67766 15.4468C8.98112 16.637 9.40924 17.6423 9.83824 18.4467ZM11.1618 17.7408C10.7891 17.0421 10.4156 16.1695 10.1465 15.1356C10.7258 15.0496 11.3442 15 12.0001 15C12.6559 15 13.2743 15.0496 13.8535 15.1355C13.5844 16.1695 13.2109 17.0421 12.8382 17.7408C12.5394 18.3011 12.2417 18.7484 12 19.0757C11.7583 18.7484 11.4606 18.3011 11.1618 17.7408ZM9.75 12C9.75 12.5841 9.7893 13.1385 9.8586 13.6619C10.5269 13.5594 11.2414 13.5 12.0001 13.5C12.7587 13.5 13.4732 13.5593 14.1414 13.6619C14.2107 13.1384 14.25 12.5841 14.25 12C14.25 11.4159 14.2107 10.8616 14.1414 10.3381C13.4732 10.4406 12.7587 10.5 12.0001 10.5C11.2414 10.5 10.5269 10.4406 9.8586 10.3381C9.7893 10.8615 9.75 11.4159 9.75 12ZM8.38688 10.0288C8.29977 10.6478 8.25 11.3054 8.25 12C8.25 12.6946 8.29977 13.3522 8.38688 13.9712C7.11338 14.3131 6.05882 14.7952 5.24324 15.2591C4.76698 14.2736 4.5 13.168 4.5 12C4.5 10.832 4.76698 9.72644 5.24323 8.74088C6.05872 9.20472 7.1133 9.68686 8.38688 10.0288ZM10.1465 8.86445C10.7258 8.95042 11.3442 9 12.0001 9C12.6559 9 13.2743 8.95043 13.8535 8.86447C13.5844 7.83055 13.2109 6.95793 12.8382 6.2592C12.5394 5.69894 12.2417 5.25156 12 4.92432C11.7583 5.25156 11.4606 5.69894 11.1618 6.25918C10.7891 6.95791 10.4156 7.83053 10.1465 8.86445ZM15.6131 10.0289C15.7002 10.6479 15.75 11.3055 15.75 12C15.75 12.6946 15.7002 13.3521 15.6131 13.9711C16.8866 14.3131 17.9412 14.7952 18.7568 15.2591C19.233 14.2735 19.5 13.1679 19.5 12C19.5 10.8321 19.233 9.72647 18.7568 8.74093C17.9413 9.20477 16.8867 9.6869 15.6131 10.0289ZM17.9716 7.46178C17.2781 7.85231 16.39 8.25705 15.3224 8.55328C15.0189 7.36304 14.5908 6.35769 14.1618 5.55332C13.9897 5.23077 13.8174 4.94025 13.6527 4.6827C15.4026 5.07623 16.921 6.08136 17.9716 7.46178ZM8.67765 8.55325C7.61001 8.25701 6.7219 7.85227 6.02839 7.46173C7.07906 6.08134 8.59745 5.07623 10.3472 4.6827C10.1826 4.94025 10.0103 5.23076 9.83823 5.5533C9.40924 6.35767 8.98112 7.36301 8.67765 8.55325ZM15.3224 15.4467C15.0189 16.637 14.5908 17.6423 14.1618 18.4467C13.9897 18.7692 13.8174 19.0598 13.6527 19.3173C15.4026 18.9238 16.921 17.9186 17.9717 16.5382C17.2782 16.1477 16.3901 15.743 15.3224 15.4467ZM12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z"
                                    fill="#cccccc"
                                  />
                                </svg>
                              </span>
                            </span>
                          )}
                          {/* <span style={{ whiteSpace: "pre" }}> </span>| */}
                          <ReactTooltip anchorSelect="#li-icon-tooltip" place="top">
                            {combinedResponses[currentIndex]?.linkedin && 
                             combinedResponses[currentIndex]?.linkedin.trim() !== "" && 
                             combinedResponses[currentIndex]?.linkedin !== "N/A" && 
                             combinedResponses[currentIndex]?.linkedin !== "NA" 
                             ? "Open this contact in LinkedIn" : "LinkedIn URL not available"}
                          </ReactTooltip>
                          {combinedResponses[currentIndex]?.linkedin && 
                           combinedResponses[currentIndex]?.linkedin.trim() !== "" && 
                           combinedResponses[currentIndex]?.linkedin !== "N/A" && 
                           combinedResponses[currentIndex]?.linkedin !== "NA" ? (
                            <a
                              href={normalizeExternalUrl(
                                combinedResponses[currentIndex]?.linkedin,
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                verticalAlign: "middle",
                                height: "23px",
                                display: "inline-block",
                              }}
                              id="li-icon-tooltip"
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
                            </a>
                          ) : (
                            <span
                              style={{
                                verticalAlign: "middle",
                                height: "23px",
                                display: "inline-block",
                                opacity: 0.5,
                                cursor: "not-allowed"
                              }}
                              id="li-icon-tooltip"
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
                                  fill="#cccccc"
                                ></path>
                                <path
                                  d="M5 10C5 9.44772 5.44772 9 6 9H7C7.55228 9 8 9.44771 8 10V18C8 18.5523 7.55228 19 7 19H6C5.44772 19 5 18.5523 5 18V10Z"
                                  fill="#cccccc"
                                ></path>
                                <path
                                  d="M11 19H12C12.5523 19 13 18.5523 13 18V13.5C13 12 16 11 16 13V18.0004C16 18.5527 16.4477 19 17 19H18C18.5523 19 19 18.5523 19 18V12C19 10 17.5 9 15.5 9C13.5 9 13 10.5 13 10.5V10C13 9.44771 12.5523 9 12 9H11C10.4477 9 10 9.44772 10 10V18C10 18.5523 10.4477 19 11 19Z"
                                  fill="#cccccc"
                                ></path>
                                <path
                                  fillRule="evenodd"
                                  clipRule="evenodd"
                                  d="M20 1C21.6569 1 23 2.34315 23 4V20C23 21.6569 21.6569 23 20 23H4C2.34315 23 1 21.6569 1 20V4C1 2.34315 2.34315 1 4 1H20ZM20 3C20.5523 3 21 3.44772 21 4V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3H20Z"
                                  fill="#cccccc"
                                ></path>
                              </svg>
                            </span>
                          )}
                          <ReactTooltip
                            anchorSelect="#email-icon-tooltip"
                            place="top"
                          >
                            Open this email in your local email client
                          </ReactTooltip>
                          <a
                            href={`mailto:${combinedResponses[currentIndex]?.email || ""
                              }?subject=${encodeURIComponent(
                                combinedResponses[currentIndex]?.subject || "",
                              )}&body=${encodeURIComponent(
                                combinedResponses[currentIndex]?.pitch || "",
                              )}`}
                            title="Open this email in your local email client"
                            className="ml-[3px]"
                            style={{
                              verticalAlign: "middle",
                              height: "34px",
                              display: "inline-block",
                            }}
                            id="email-icon-tooltip"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="33px"
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
                          {/* <ReactTooltip
                            anchorSelect="#notes-icon-tooltip"
                            place="top"
                          >
                            View/Edit notes for this contact
                          </ReactTooltip>
                          <button
                            id="notes-icon-tooltip"
                            onClick={() => {
                              const contact = combinedResponses[currentIndex];
                              setCurrentNotes(contact?.notes || "");
                              setIsEditingNotes(true);
                              setShowNotesModal(true);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              verticalAlign: "middle",
                              height: "34px",
                              display: "inline-block",
                              marginLeft: "3px",
                            }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24px"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <path
                                d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z"
                                fill="#3f9f42"
                              />
                              <path
                                d="M14 2V8H20"
                                fill="none"
                                stroke="#fff"
                                strokeWidth="2"
                              />
                              <path
                                d="M16 13H8M16 17H8M10 9H8"
                                stroke="#fff"
                                strokeWidth="2"
                              />
                            </svg>
                          </button> */}
                        </div>

                        {/* Email Sent Date - remaining width */}
                        <div
                          style={{
                            flex: "1",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "end",
                            justifyContent: "center",
                            marginLeft: "0px", // keeps alignment similar to your existing pitch date
                          }}
                        >
                          
                          {/* <span
                            style={{
                              fontSize: "13px",
                              color: "#666",
                              fontStyle: "italic",
                            }}
                          >
                            {combinedResponses[currentIndex]?.lastemailupdateddate
                              ? `Krafted: ${formatDateTimeIST(
                                combinedResponses[currentIndex]
                                  ?.lastemailupdateddate,
                              )}`
                              : ""}
                          </span> */}

                          {/* Email Sent Date */}
                          {/* <span
                            style={{
                              fontSize: "13px",
                              color: "#666",
                              fontStyle: "italic",
                              marginTop: "2px",
                            }}
                          >
                            {combinedResponses[currentIndex]?.emailsentdate
                              ? `Emailed: ${formatDateTimeIST(
                                combinedResponses[currentIndex]?.emailsentdate,
                              )}`
                              : ""}
                          </span> */}
                        </div>
                      </div>
                      <div className="form-group" style={{ marginBottom: "20px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "start", // changed from flex-start to center
                          }}
                        >
                          {/* Subject field - flexible width, leaves room for dates */}
                          <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                            <label
                              style={{
                                flexShrink: 0,
                                marginBottom: "0",
                                fontWeight: "600",
                                fontSize: "14px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Subject
                            </label>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              {!isEditingSubject ? (
                                /* READ MODE */
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
                                    cursor: "pointer",
                                  }}
                                  onClick={() => {
                                    setEditableSubject(
                                      combinedResponses[currentIndex]?.subject || "",
                                    );
                                    setIsEditingSubject(true);
                                  }}
                                  title="Click to edit subject"
                                >
                                  {combinedResponses[currentIndex]?.subject || "Click to add subject"}
                                </div>
                              ) : (
                                /* EDIT MODE */
                                <>
                                  <input
                                    type="text"
                                    value={editableSubject}
                                    onChange={(e) => setEditableSubject(e.target.value)}
                                    autoFocus
                                    className="form-control"
                                    style={{
                                      width: "100%",
                                      padding: "8px",
                                      fontSize: "14px",
                                    }}
                                  />

                                  <div className="flex gap-2 mt-2">
                                    <button
                                      className="button save-button small"
                                      onClick={saveEditedSubject}
                                      disabled={isSavingSubject}
                                      style={{ borderRadius: "12px" }}
                                    >
                                      {isSavingSubject ? "Saving..." : "Save"}
                                    </button>

                                    <button
                                      className="button secondary small"
                                      onClick={() => {
                                        setEditableSubject(
                                          combinedResponses[currentIndex]?.subject || "",
                                        );
                                        setIsEditingSubject(false);
                                      }}
                                      style={{ borderRadius: "12px" }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>

                          </div>

                          {/* Krafted / Emailed dates — shown at the end of the subject row */}
                          {combinedResponses[currentIndex] && (
                            <div
                              style={{
                                flexShrink: 0,
                                marginLeft: "16px",
                                textAlign: "right",
                                fontSize: "12px",
                                fontStyle: "italic",
                                color: "#666",
                                lineHeight: 1.5,
                                whiteSpace: "nowrap",
                              }}
                            >
                              <div>
                                Krafted: {formatDateTimeLocal(combinedResponses[currentIndex]?.lastemailupdateddate)}
                              </div>
                              <div>
                                Emailed: {formatDateTimeLocal(combinedResponses[currentIndex]?.emailsentdate)}
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                      <span className="pos-relative d-flex justify-start">
                        {isEditing ? (
                          <div
                            className="editor-container"
                            style={{
                              width: "100%",
                              maxWidth: `${outputEmailWidth === "Mobile"
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
                                    e.target.value,
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
                                <option value="h1">Heading 1</option>
                                <option value="h2">Heading 2</option>
                                <option value="h3">Heading 3</option>
                                <option value="p">Normal</option>
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
                              contentEditable
                              suppressContentEditableWarning
                              className="textarea-full-height preview-content-area"
                              onInput={(e) => {
                                setEditableContent(e.currentTarget.innerHTML);
                              }}
                              style={{
                                minHeight: "500px",
                                padding: "10px",
                                border: "1px solid #ccc",
                                borderTop: "none",
                                borderRadius: "0 0 4px 4px",
                                whiteSpace: "normal",
                                overflowY: "auto",
                                overflowX: "auto",
                                wordWrap: "break-word",
                                width: "100%",
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
                                style={{ borderRadius: "12px" }}
                              >
                                {isSaving ? "Saving..." : "Save changes"}
                              </button>
                              <button
                                className="secondary button"
                                onClick={() => {
                                  setIsEditing(false);
                                  setEditableContent(
                                    combinedResponses[currentIndex]?.pitch || "",
                                  );
                                }}
                                style={{ borderRadius: "12px" }}
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
                                maxWidth: `${outputEmailWidth === "Mobile"
                                    ? "480px"
                                    : outputEmailWidth === "Tab"
                                      ? "768px"
                                      : "100%"
                                  }`,
                              }}
                              dangerouslySetInnerHTML={{
                                __html: combinedResponses[currentIndex]?.pitch || "",
                              }}

                            ></div>
                            <div className="output-email-floated-icons floated-icons-green d-flex bg-[#ffffff] rounded-md">
                              <div className="d-flex align-items-center justify-between flex-col-991" style={{ order: 1 }}>
                                <div className="d-flex relative">
                                  <button
                                    onClick={() =>
                                      setOpenDeviceDropdown(!openDeviceDropdown)
                                    }
                                    className="w-[55px] justify-center px-3 py-2 bg-gray-200 rounded-md flex items-center device-icon"
                                    style={{ appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none' }}
                                  >
                                    {outputEmailWidth === "Mobile" && (
                                      <>
                                        <ReactTooltip
                                          anchorSelect="#mobile-device-view"
                                          place="left"
                                        >
                                          Mobile view
                                        </ReactTooltip>
                                        <span id="mobile-device-view">
                                          {/* Mobile icon */}
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="25px"
                                            height=""
                                            viewBox="0 0 24 24"
                                            fill="none"
                                          >
                                            <path
                                              d="M11 18H13M9.2 21H14.8C15.9201 21 16.4802 21 16.908 20.782C17.2843 20.5903 17.5903 20.2843 17.782 19.908C18 19.4802 18 18.9201 18 17.8V6.2C18 5.0799 18 4.51984 17.782 4.09202C17.5903 3.71569 17.2843 3.40973 16.908 3.21799C16.4802 3 15.9201 3 14.8 3H9.2C8.0799 3 7.51984 3 7.09202 3.21799C6.71569 3.40973 6.40973 3.71569 6.21799 4.09202C6 4.51984 6 5.07989 6 6.2V17.8C6 18.9201 6 19.4802 6.21799 19.908C6.40973 20.2843 6.71569 20.5903 7.09202 20.782C7.51984 21 8.07989 21 9.2 21Z"
                                              stroke="#000000"
                                              strokeWidth="2"
                                              stroke-linecap="round"
                                              stroke-linejoin="round"
                                            ></path>
                                          </svg>
                                        </span>
                                      </>
                                    )}
                                    {outputEmailWidth === "Tab" && (
                                      <>
                                        <ReactTooltip
                                          anchorSelect="#tab-device-view"
                                          place="left"
                                        >
                                          Tab view
                                        </ReactTooltip>
                                        <span id="tab-device-view">
                                          {/* Tab icon */}
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="25px"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                          >
                                            <rect
                                              x="4"
                                              y="3"
                                              width="16"
                                              height="18"
                                              rx="1"
                                              stroke="#200E32"
                                              strokeWidth="2"
                                              strokeLinecap="round"
                                            />
                                            <circle
                                              cx="12"
                                              cy="18"
                                              r="1"
                                              fill="#200E32"
                                            />
                                          </svg>
                                        </span>
                                      </>
                                    )}
                                    {outputEmailWidth === "" && (
                                      <>
                                        <ReactTooltip
                                          anchorSelect="#desktop-device-view"
                                          place="left"
                                        >
                                          Desktop view
                                        </ReactTooltip>
                                        <span id="desktop-device-view">
                                          {/* Desktop icon */}
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            xmlnsXlink="http://www.w3.org/1999/xlink"
                                            width="25px"
                                            viewBox="0 0 24 24"
                                            version="1.1"
                                          >
                                            <title>Desktop</title>
                                            <g
                                              stroke="none"
                                              strokeWidth="1"
                                              fill="none"
                                              fillRule="evenodd"
                                            >
                                              <g>
                                                <rect
                                                  x="0"
                                                  y="0"
                                                  width="24"
                                                  height="24"
                                                  fillRule="nonzero"
                                                />
                                                <rect
                                                  x="3"
                                                  y="4"
                                                  width="18"
                                                  height="13"
                                                  rx="2"
                                                  stroke="#0C0310"
                                                  strokeWidth="2"
                                                  strokeLinecap="round"
                                                />
                                                <line
                                                  x1="7.5"
                                                  y1="21"
                                                  x2="16.5"
                                                  y2="21"
                                                  stroke="#0C0310"
                                                  strokeWidth="2"
                                                  strokeLinecap="round"
                                                />
                                                <line
                                                  x1="12"
                                                  y1="17"
                                                  x2="12"
                                                  y2="21"
                                                  stroke="#0C0310"
                                                  strokeWidth="2"
                                                  strokeLinecap="round"
                                                />
                                              </g>
                                            </g>
                                          </svg>
                                        </span>
                                      </>
                                    )}
                                  </button>
                                  {openDeviceDropdown && (
                                    <div className="w-[55px] absolute right-0 mt-[35px] bg-[#eeeeee] pt-[5px] rounded-b-md rounded-t-none d-flex flex-col output-responsive-button-group justify-center-991 col-12-991">
                                      {outputEmailWidth !== "Mobile" && (
                                        <>
                                          <ReactTooltip
                                            anchorSelect="#mobile-device-view"
                                            place="left"
                                          >
                                            Mobile view
                                          </ReactTooltip>
                                          <button
                                            id="mobile-device-view"
                                            className={`w-[55px] button pad-10 d-flex align-center align-self-center output-email-width-button-mobile justify-center
                              ${outputEmailWidth === "Mobile" &&
                                              "bg-active"
                                              }
                              `}
                                            onClick={() =>
                                              toggleOutputEmailWidth("Mobile")
                                            }
                                          >
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              width="25px"
                                              height=""
                                              viewBox="0 0 24 24"
                                              fill="none"
                                            >
                                              <path
                                                d="M11 18H13M9.2 21H14.8C15.9201 21 16.4802 21 16.908 20.782C17.2843 20.5903 17.5903 20.2843 17.782 19.908C18 19.4802 18 18.9201 18 17.8V6.2C18 5.0799 18 4.51984 17.782 4.09202C17.5903 3.71569 17.2843 3.40973 16.908 3.21799C16.4802 3 15.9201 3 14.8 3H9.2C8.0799 3 7.51984 3 7.09202 3.21799C6.71569 3.40973 6.40973 3.71569 6.21799 4.09202C6 4.51984 6 5.07989 6 6.2V17.8C6 18.9201 6 19.4802 6.21799 19.908C6.40973 20.2843 6.71569 20.5903 7.09202 20.782C7.51984 21 8.07989 21 9.2 21Z"
                                                stroke="#000000"
                                                strokeWidth="2"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                              ></path>
                                            </svg>
                                            {/* <span className="ml-3 font-size-medium">Mobile View</span> */}
                                          </button>
                                        </>
                                      )}

                                      {outputEmailWidth !== "Tab" && (
                                        <>
                                          <ReactTooltip
                                            anchorSelect="#tab-device-view"
                                            place="left"
                                          >
                                            Tab view
                                          </ReactTooltip>
                                          <button
                                            id="tab-device-view"
                                            className={`w-[55px] button pad-10 d-flex align-center align-self-center output-email-width-button-tab justify-center
                            ${outputEmailWidth === "Tab" && "bg-active"}
                            `}
                                            onClick={() =>
                                              toggleOutputEmailWidth("Tab")
                                            }
                                          >
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              width="25px"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                            >
                                              <rect
                                                x="4"
                                                y="3"
                                                width="16"
                                                height="18"
                                                rx="1"
                                                stroke="#200E32"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                              />
                                              <circle
                                                cx="12"
                                                cy="18"
                                                r="1"
                                                fill="#200E32"
                                              />
                                            </svg>
                                            {/* <span className="ml-3 font-size-medium">Tab View</span> */}
                                          </button>
                                        </>
                                      )}

                                      {outputEmailWidth !== "" && (
                                        <>
                                          <ReactTooltip
                                            anchorSelect="#desktop-device-view"
                                            place="left"
                                          >
                                            Desktop view
                                          </ReactTooltip>
                                          <button
                                            id="desktop-device-view"
                                            className={`w-[55px] button pad-10 d-flex align-center align-self-center output-email-width-button-desktop justify-center
                              ${outputEmailWidth === "" && "bg-active"}
                              `}
                                            onClick={() => toggleOutputEmailWidth("")}
                                          >
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              xmlnsXlink="http://www.w3.org/1999/xlink"
                                              width="25px"
                                              viewBox="0 0 24 24"
                                              version="1.1"
                                            >
                                              <title>Desktop</title>
                                              <g
                                                stroke="none"
                                                strokeWidth="1"
                                                fill="none"
                                                fillRule="evenodd"
                                              >
                                                <g>
                                                  <rect
                                                    x="0"
                                                    y="0"
                                                    width="24"
                                                    height="24"
                                                    fillRule="nonzero"
                                                  />
                                                  <rect
                                                    x="3"
                                                    y="4"
                                                    width="18"
                                                    height="13"
                                                    rx="2"
                                                    stroke="#0C0310"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                  />
                                                  <line
                                                    x1="7.5"
                                                    y1="21"
                                                    x2="16.5"
                                                    y2="21"
                                                    stroke="#0C0310"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                  />
                                                  <line
                                                    x1="12"
                                                    y1="17"
                                                    x2="12"
                                                    y2="21"
                                                    stroke="#0C0310"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                  />
                                                </g>
                                              </g>
                                            </svg>
                                            {/* <span className="ml-5 font-size-medium">Desktop</span> */}
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  )}

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
                                  onClick={() => {
                                    const pitch = combinedResponses[currentIndex]?.pitch || "";
                                    setEditableContent(pitch);
                                    setEditableContent(pitch);       // store content

                                    setEditingIndex(currentIndex); // 🔒 lock index

                                    setIsEditing(true);
                                  }}
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

                              <>
                                <ReactTooltip
                                  anchorSelect="#regenerate-email-body-tooltip"
                                  place="top"
                                >
                                  Regenerate this email body
                                </ReactTooltip>
                                <button
                                  id="regenerate-email-body-tooltip"
                                  onClick={async () => {
                                    if (showCreditModal) return;
                                    if (regenerateClickInFlightRef.current) return;
                                    regenerateClickInFlightRef.current = true;

                                    const currentContact = combinedResponses[currentIndex];
                                    if (!currentContact) {
                                      alert("No contact selected to regenerate pitch for.");
                                      regenerateClickInFlightRef.current = false;
                                      return;
                                    }
                                    if (!onRegenerateContact) {
                                      alert("Regenerate logic not wired up! Consult admin.");
                                      regenerateClickInFlightRef.current = false;
                                      return;
                                    }

                                    if (sessionStorage.getItem("isDemoAccount") !== "true") {
                                      const effectiveUserId = selectedClient !== "" ? selectedClient : userId;
                                      const currentCredits = await checkUserCredits?.(effectiveUserId);
                                      const canGenerate =
                                        typeof currentCredits === "number"
                                          ? currentCredits > 0
                                          : currentCredits && typeof currentCredits === "object"
                                            ? currentCredits.canGenerate !== false && Number((currentCredits as any).total ?? 0) > 0
                                            : false;
                                      if (!canGenerate) {
                                        regenerateClickInFlightRef.current = false;
                                        return;
                                      }
                                    }

                                    setIsRegenerating(true);
                                    setRegenerationTargetId(currentContact.id);

                                    try {
                                      await onRegenerateContact("Output", {
                                        regenerate: true,
                                        regenerateIndex: currentIndex,
                                      });
                                    } finally {
                                      setIsRegenerating(false);
                                      setRegenerationTargetId(null);
                                      regenerateClickInFlightRef.current = false;
                                    }
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
                                    background: "none !important",
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
                                  className={`button d-flex align-center square-40 justify-center ${isCopyText && "save-button auto-width"
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
                      size="100%"
                    >
                      {" "}
                      <div
                        style={{
                          backgroundColor: "white",
                          padding: "20px",
                          borderRadius: "10px",
                          boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                        }}
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
                          <div
                            style={{ display: "flex", justifyContent: "flex-end" }}
                          >
                            <button
                              type="button"
                              className="button save-button"
                              style={{
                                padding: "8px 16px",
                                cursor: "pointer",
                              }}
                              onClick={() => {
                                handleModalClose("modal-output-2");
                                setIsEditing(false);
                              }}
                              aria-label="Close"
                              title="Close"
                            >
                              OK
                            </button>
                          </div>
                          <div>
                            <label>Email body</label>
                            <div>
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
                      </div>
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
                            className={`button full-width ${tab3 === "Stages" ? "active" : ""
                              }`}
                          >
                            Stages
                          </button>
                        </li>
                        <li className="flex-50percent-991 flex-full-640">

                        </li>
                      </ul>
                    </div>
                    {tab3 === "Stages" && (
                      <div className="form-group">
                        <div className="d-flex mb-10"></div>
                        <span className="pos-relative d-flex justify-start">
                          <pre
                            style={{
                              width: "100%",
                              padding: "10px",
                              border: "1px solid #ccc",
                              borderRadius: "4px",
                              fontFamily: "inherit",
                              fontSize: "inherit",
                              whiteSpace: "pre-wrap",
                              /* ✅ IMPORTANT PART */
                              height: "auto",        // let content decide height
                              overflow: "visible",   // no inner scroll    boxSizing: "border-box",
                            }}
                          >
                            {typeof allprompt[currentIndex] === "string"
                              ? allprompt[currentIndex]
                              : "No prompt available."}
                          </pre>


                          <Modal
                            show={openModals["modal-output-3"]}
                            closeModal={() => handleModalClose("modal-output-3")}
                            buttonLabel="Ok"
                            size="90%"
                          >
                            <label>Stages</label>

                            {/* <pre
                  className="textarea-full-height preview-content-area"
                  dangerouslySetInnerHTML={{
                    __html:
                      typeof allprompt[currentIndex] === "string"
                        ? allprompt[currentIndex]
                        : "No prompt available.",
                  }}
                ></pre> */}
                            <pre
                              style={{
                                height: "800px",
                                width: "100%",
                                padding: "10px",
                                border: "1px solid #ccc",
                                borderRadius: "4px",
                                fontFamily: "inherit",
                                fontSize: "inherit",

                                /* ✅ KEY FIXES */
                                whiteSpace: "pre-wrap",     // keep line breaks
                                wordBreak: "break-word",    // break long words
                                overflowWrap: "anywhere",   // modern browsers
                                overflowX: "hidden",        // ❌ no horizontal scroll
                                overflowY: "auto",          // ✅ vertical scroll only

                                boxSizing: "border-box",
                              }}
                            >
                              {typeof allprompt[currentIndex] === "string"
                                ? allprompt[currentIndex]
                                : "No prompt available."}
                            </pre>


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


                  </>
                )}
                {tab2 === "Insights" && userRole === "ADMIN" && (
                  <>
                    <div className="tabs secondary d-flex align-center ">
                      <ul className="d-flex full-width flex-wrap-991">
                        {[
                          { key: "Online research", hasInfo: hasOnlineResearch },
                          { key: "Notes", hasInfo: hasNotes },
                          { key: "Emails", hasInfo: hasEmails },
                          {
                            key: "Professional summary",
                            hasInfo: hasProfessionalSummary,
                          },
                        ].map((insightTab) => (
                          <li
                            key={insightTab.key}
                            className="flex-25percent-991 flex-full-640"
                          >
                            <button
                              onClick={() => setTab3(insightTab.key)}
                              className={`button full-width ${
                                tab3 === insightTab.key ? "active" : ""
                              }`}
                            >
                              {insightTab.key}
                              {insightTab.hasInfo && (
                                <sup
                                  title="Information available"
                                  style={{
                                    color: "#3f9f42",
                                    marginLeft: "3px",
                                    fontSize: "0.85em",
                                  }}
                                >
                                  ✓
                                </sup>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {tab3 === "Online research" &&
                      (!hasOnlineResearch ? (
                        renderEmptyInsight(onlineResearchText)
                      ) : (
                      <div className="form-group">
                        <div className="d-flex mb-10"></div>
                        <span className="pos-relative d-flex justify-start">
                          <div style={{ width: '100%' }}>
                            <WebResearchCards content={onlineResearchText} />
                          </div>
                          <Modal
                            show={openModals["modal-output-insights-research"]}
                            closeModal={() => handleModalClose("modal-output-insights-research")}
                            buttonLabel="Ok"
                            size="90%"
                          >
                            <label>Online research</label>
                            <div style={{ overflowY: 'auto', maxHeight: '80vh', padding: '8px 0' }}>
                              <WebResearchCards content={onlineResearchText} />
                            </div>
                          </Modal>
                          <button
                            className="full-view-icon d-flex align-center justify-center"
                            onClick={() => handleModalOpen("modal-output-insights-research")}
                          >
                            <svg width="40px" height="40px" viewBox="0 0 512 512">
                              <polyline points="304 96 416 96 416 208" fill="none" stroke="#000000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32"/>
                              <line x1="405.77" y1="106.2" x2="111.98" y2="400.02" fill="none" stroke="#000000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32"/>
                              <polyline points="208 416 96 416 96 304" fill="none" stroke="#000000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32"/>
                            </svg>
                          </button>
                        </span>
                      </div>
                      ))}
                    {tab3 === "Notes" &&
                      (!hasNotes
                        ? renderEmptyInsight(notesUsedText)
                        : renderInsightPre(
                            notesUsedText,
                            "modal-output-insights-notes",
                            "Notes used for personalization",
                          ))}
                    {tab3 === "Emails" &&
                      (!hasEmails
                        ? renderEmptyInsight(emailInsightText)
                        : renderInsightPre(
                            emailInsightText,
                            "modal-output-insights-emails",
                            "Emails",
                            "html",
                          ))}
                    {tab3 === "Professional summary" &&
                      (!hasProfessionalSummary
                        ? renderEmptyInsight(linkedinInsightText)
                        : renderInsightPre(
                            linkedinInsightText,
                            "modal-output-insights-linkedin",
                            "Professional summary",
                          ))}
                  </>
                )}
                {/* Add this after the Output tab and before the Stages tab */}


              </>
            )}
            </div>
          </div>
        </div>
      </div>
      <AppModal
        isOpen={appModal.isOpen}
        onClose={appModal.hideModal}
        {...appModal.config}
      />

      {/* Email sending state is shown inline on the Send button ("Sending...")
          — no full-screen loader so the rest of the UI stays usable. */}

      {/* Notes Modal */}
      {showNotesModal && (
        <div
          style={{
            position: "fixed",
            zIndex: 99999,
            inset: 0,
            background: "rgba(0,0,0,0.6)",
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
              minWidth: 500,
              maxWidth: 600,
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >


            <>
              <textarea
                value={currentNotes}
                onChange={(e) => setCurrentNotes(e.target.value)}
                placeholder="Enter notes for this contact..."
                style={{
                  width: "100%",
                  minHeight: 120,
                  padding: 12,
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  fontSize: 14,
                  resize: "vertical",
                  marginBottom: 16,
                }}
              />
              {notesMessage && (
                <div
                  style={{
                    color: "green",
                    marginBottom: 16,
                    fontSize: 14,
                  }}
                >
                  {notesMessage}
                </div>
              )}
              <div
                style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}
              >
                <button
                  onClick={async () => {
                    setIsSavingNotes(true);
                    try {
                      const contact = combinedResponses[currentIndex];
                      const response = await fetch(
                        `${API_BASE_URL}/api/Crm/Update-Notes?contactid=${contact.id}&Notes=${encodeURIComponent(currentNotes)}`,
                        {
                          method: "POST",
                          headers: {
                            accept: "*/*",
                          },
                        },
                      );

                      if (response.ok) {
                        // Update the contact in combinedResponses
                        const updatedCombinedResponses = [...combinedResponses];
                        updatedCombinedResponses[currentIndex] = {
                          ...updatedCombinedResponses[currentIndex],
                          notes: currentNotes,
                        };
                        setCombinedResponses(updatedCombinedResponses);

                        setNotesMessage("Notes updated successfully!");

                        setTimeout(() => {
                          setNotesMessage("");
                          setShowNotesModal(false);
                          setIsEditingNotes(false);
                        }, 1000);
                      } else {
                        throw new Error("Failed to update notes");
                      }
                    } catch (error) {
                      console.error("Error updating notes:", error);
                      setNotesMessage(
                        "Failed to update notes. Please try again.",
                      );
                    } finally {
                      setIsSavingNotes(false);
                    }
                  }}
                  disabled={isSavingNotes}
                  style={{
                    padding: "8px 16px",
                    background: isSavingNotes ? "#ccc" : "#3f9f42",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: isSavingNotes ? "not-allowed" : "pointer",
                  }}
                >
                  {isSavingNotes ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setShowNotesModal(false);
                    setIsEditingNotes(false);
                    setNotesMessage("");
                  }}
                  disabled={isSavingNotes}
                  style={{
                    padding: "8px 16px",
                    border: "1px solid #ddd",
                    background: "#fff",
                    borderRadius: "4px",
                    cursor: isSavingNotes ? "not-allowed" : "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </>
          </div>
        </div>
      )}

      {/* Kraft Email Panel */}
      {/* <KraftEmailPanel
        isOpen={kraftEmailControls}
        onClose={() => setKraftEmailControls(false)}
        isResetEnabled={isResetEnabled}
        overwriteDatabase={settingsForm?.overwriteDatabase ?? false}
        onOverwriteChange={(checked) => {
          console.log('onOverwriteChange called with:', checked);
          console.log('settingsFormHandler:', settingsFormHandler);
          if (settingsFormHandler) {
            const event = {
              target: {
                name: "overwriteDatabase",
                checked,
                type: "checkbox",
              },
            } as any;
            console.log('Calling settingsFormHandler with event:', event);
            settingsFormHandler(event);
          }
        }}
        isDemoAccount={isDemoAccount}
        startIndex={kraftStartIndex}
        setStartIndex={setKraftStartIndex}
        endIndex={kraftEndIndex}
        setEndIndex={setKraftEndIndex}
        enableIndexRange={kraftEnableIndexRange}
        setEnableIndexRange={setKraftEnableIndexRange}
        combinedResponses={combinedResponses}
        usageData={usageData}
        clearUsage={clearUsage}
        userRole={userRole}
        currentIndex={currentIndex}
        onStart={async () => {
          if (showCreditModal) {
            return;
          }

          if (
            sessionStorage.getItem("isDemoAccount") !== "true"
          ) {
            const effectiveUserId =
              selectedClient !== "" ? selectedClient : userId;
            const currentCredits =
              await checkUserCredits?.(effectiveUserId);
            if (
              currentCredits &&
              typeof currentCredits === "object" &&
              !currentCredits.canGenerate
            ) {
              return;
            }
          }

          const startIdx = kraftEnableIndexRange && kraftStartIndex ? parseInt(kraftStartIndex) - 1 : currentIndex;
          handleStart?.(startIdx);
        }}
        onStop={handleStop}
      /> */}


    </div>
  );
};

export default Output;
