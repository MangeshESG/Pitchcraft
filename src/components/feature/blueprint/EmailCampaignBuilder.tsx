import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import {
  faAngleRight, faAngleLeft
} from "@fortawesome/free-solid-svg-icons";
import { Send, Copy, Check, Loader2, RefreshCw, Globe, Eye, FileText, MessageSquare, CheckCircle, XCircle, ChevronDown, Volume2, VolumeX } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from "../../../config";
import './EmailCampaignBuilder.css';
import notificationSound from '../../../assets/sound/notification.mp3';
import { AlertCircle } from 'lucide-react';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import PaginationControls from '../PaginationControls';
import { Tooltip as ReactTooltip } from "react-tooltip";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import downArrow from "../../assets/images/down.png";
import PopupModal from '../../common/PopupModal';
import ElementsTab from "./ElementsTab"
import toggleOn from '../../../assets/images/on-button.png';
import toggleOff from "../../../assets/images/off-button.png";
import RichTextEditor from "../../common/RTEEditor";

// --- Type Definitions ---
interface Message {
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

// include both old and new tab keys
type MainTab = 'build' | 'instructions' | 'ct';
type BuildSubTab = 'chat' | 'elements';


type GPTModel = {
  id: string;
  name: string;
  description?: string;
};

// ====================================================================
// PROPS INTERFACES
// ====================================================================

interface TemplateDefinition {
  id: number;
  templateName: string;
  aiInstructions: string;
  aiInstructionsForEdit: string;
  placeholderList: string;
  placeholderListExtensive: string;
  masterBlueprintUnpopulated: string;
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
  usageCount: number;
}

// ===============================
// UI-ONLY PLACEHOLDER DEFINITION
// ===============================
export interface PlaceholderDefinitionUI {
  placeholderKey: string;
  friendlyName: string;
  category: string;

  inputType: "text" | "textarea" | "richtext" | "select";
  uiSize: "sm" | "md" | "lg" | "xl";

  isRuntimeOnly: boolean;
  isExpandable: boolean;
  isRichText: boolean;
  categorySequence: number;       // ⭐ NEW
  placeholderSequence: number;    // ⭐ NEW
  options?: string[];

  // ✅ TEMP UI-only raw editor value (NOT saved to backend)
  _rawOptions?: string;
}





interface TemplateTabProps {
  masterPrompt: string;
  setMasterPrompt: (value: string) => void;
  masterPromptExtensive: string;
  setMasterPromptExtensive: (value: string) => void;
  systemPrompt: string;
  setSystemPrompt: (value: string) => void;
  systemPromptForEdit: string;
  setSystemPromptForEdit: (value: string) => void;
  previewText: string;
  setPreviewText: (value: string) => void;
  startConversation: () => void;
  currentPlaceholders: string[];
  extractPlaceholders: (text: string) => string[];
  selectedModel: string;
  setSelectedModel: (value: string) => void;
  availableModels: GPTModel[];
  // ✅ NEW PROPS
  saveTemplateDefinition: () => Promise<void>;
  isSavingDefinition: boolean;
  saveDefinitionStatus: 'idle' | 'success' | 'error';
  templateDefinitions: TemplateDefinition[];
  loadTemplateDefinition: (id: number) => Promise<void>;
  selectedTemplateDefinitionId: number | null;
  templateName: string;
  setTemplateName: (value: string) => void;
}

interface EmailCampaignBuilderProps {
  selectedClient: string | null;
}

interface ConversationTabProps {
  // --- Core fields ---
  conversationStarted: boolean;
  messages: Message[];
  isTyping: boolean;
  isComplete: boolean;
  
  currentAnswer: string;
  setCurrentAnswer: (value: string) => void;
  handleSendMessage: () => void;
  handleKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  resetAll: () => void;

  // --- Edit‑mode support ---
  isEditMode?: boolean;
  availablePlaceholders?: string[];
  placeholderValues?: Record<string, string>;
  onPlaceholderSelect?: (placeholder: string) => void;
  selectedPlaceholder?: string;

  // --- Preview & output ---
  previewText?: string;
  exampleOutput?: string;
  regenerateExampleOutput?: () => void;

  // --- Data‑file + contact selectors ---
  dataFiles: any[];
  contacts: any[];
  selectedDataFileId: number | null;
  selectedContactId: number | null;
  handleSelectDataFile: (id: number) => void;
  setSelectedContactId: React.Dispatch<React.SetStateAction<number | null>>;

  // --- Contact‑placeholder filler ---
  applyContactPlaceholders: (contact: any) => void;

  searchResults: string[];
  allSourcedData: string;
  sourcedSummary: string;

  filledTemplate: string;   // <-- ADD THIS
  editTemplateId?: number | null;

  groupedPlaceholders: Record<string, PlaceholderDefinitionUI[]>;
  initialExampleEmail: string;


}



// ✅ Add interface for EditInstructionsModal
interface EditInstructionsModalProps {
  showEditInstructions: boolean;
  isEditMode: boolean;
  editInstructionsInput: string;
  setEditInstructionsInput: (value: string) => void;
  setShowEditInstructions: (value: boolean) => void;
  setIsEditMode: (value: boolean) => void;
  setCustomEditInstructions: (value: string) => void;
  setShowPlaceholderPicker: (value: boolean) => void;
}


const CONTACT_PLACEHOLDERS = [
  'full_name',
  'first_name',
  'last_name',
  'linkedin_url',
  'job_title',
  'location',
  'company_name',
  'company_name_friendly',
  'company_name_abbrev',
  'website'
];

// ====================================================================
// HELPER FUNCTIONS
// ====================================================================
const ExampleEmailEditor: React.FC<{
  value: string;
  onChange: (val: string) => void;
}> = ({ value, onChange }) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const localDraft = useRef<string>("");

  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.innerHTML = value || "";
    localDraft.current = value || "";
  }, [value]);

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      className="example-content"
      onInput={() => {
        if (editorRef.current) {
          localDraft.current = editorRef.current.innerHTML;
        }
      }}
      onBlur={() => onChange(localDraft.current)}
    />
  );
};



// Filter out contact placeholders - keep only conversation placeholders
const getConversationPlaceholders = (allPlaceholders: Record<string, string>): Record<string, string> => {
  const filtered: Record<string, string> = {};

  Object.keys(allPlaceholders || {}).forEach((key) => {
    if (!CONTACT_PLACEHOLDERS.includes(key)) {
      filtered[key] = allPlaceholders[key] || "";
    }
  });

  return filtered;
};

type PageSize = number | "All";
// Get only contact placeholders from merged set
const getContactPlaceholders = (allPlaceholders: Record<string, string>): Record<string, string> => {
  const contactOnly: Record<string, string> = {};

  CONTACT_PLACEHOLDERS.forEach(key => {
    if (Object.prototype.hasOwnProperty.call(allPlaceholders, key)) {
      contactOnly[key] = allPlaceholders[key] || "";
    }
  });

  return contactOnly;
};

// Merge conversation + contact placeholders for display/preview only
const getMergedPlaceholdersForDisplay = (
  conversationPlaceholders: Record<string, string>,
  contactPlaceholders: Record<string, string>
): Record<string, string> => {
  return { ...conversationPlaceholders, ...contactPlaceholders };
};

// ====================================================================
// CHILD COMPONENTS
// ====================================================================
export function useSessionState<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    const saved = sessionStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  });

  useEffect(() => {
    sessionStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState];
}


const ConversationTab: React.FC<ConversationTabProps> = ({
  conversationStarted,
  messages,
  
  isTyping,
  isComplete,
  currentAnswer,
  setCurrentAnswer,
  handleSendMessage,
  handleKeyPress,
  resetAll,
  isEditMode = false,
  availablePlaceholders = [],
  placeholderValues = {},
  onPlaceholderSelect,
  selectedPlaceholder,
  previewText,
  exampleOutput,
  regenerateExampleOutput,

  dataFiles,
  contacts,
  selectedDataFileId,
  selectedContactId,
  handleSelectDataFile,
  setSelectedContactId,
  applyContactPlaceholders,

  searchResults,
  allSourcedData,
  sourcedSummary,
  filledTemplate,
  editTemplateId,   // ⭐ ADD THIS
  groupedPlaceholders,
  initialExampleEmail

     

}) => {
const [isGenerating, setIsGenerating] = useState(false);
const [editableExampleOutput, setEditableExampleOutput] = useState<string>("");

const [placeholderConfirmed, setPlaceholderConfirmed] = useState(false);
const messagesContainerRef = useRef<HTMLDivElement>(null);

const inputRef = useRef<HTMLTextAreaElement | null>(null);


useEffect(() => {
  if (exampleOutput) {
    setEditableExampleOutput(exampleOutput);
  }
}, [exampleOutput]);




useLayoutEffect(() => {
  const container = messagesContainerRef.current;
  if (!container || !messages.length) return;

  const messageElements =
    container.querySelectorAll(".message-wrapper");

  if (!messageElements.length) return;

  const lastMessage =
    messageElements[messageElements.length - 1] as HTMLElement;

  const lastMessageType =
    messages[messages.length - 1]?.type;

  if (lastMessageType === "user") {
    // user message → bottom
    container.scrollTop = container.scrollHeight;
  } else {
    // bot message → start of response
    lastMessage.scrollIntoView({
      block: "start",
      behavior: "auto",
    });

    // subtle spacing (ChatGPT feel)
    container.scrollTop -= 16;
  
  }
}, [messages]);


useEffect(() => {
  if (!isTyping && conversationStarted) {
    // wait for DOM + disabled=false
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }
}, [isTyping, conversationStarted]);



useEffect(() => {
  if (!messages.length) return;

  const last = messages[messages.length - 1].content;

  const isComplete =
    last.includes("==PLACEHOLDER_VALUES_START==") &&
    last.includes("==PLACEHOLDER_VALUES_END==") &&
    last.includes('"complete"');

  if (isComplete) {
    setPlaceholderConfirmed(true);  // Enable dropdown again
  }
}, [messages]);





const renderMessageContent = (rawContent: string) => {
  if (!rawContent) return null;
  debugger

  // 🧹 CLEAN PLACEHOLDER BLOCK EVERY TIME
  let content = rawContent
    .replace(/==PLACEHOLDER_VALUES_START==[\s\S]*?==PLACEHOLDER_VALUES_END==/g, "")
    .replace(/\{\s*"status"[\s\S]*?}/g, "")
    .trim();

  const isHtml = /<[a-z][\s\S]*>/i.test(content);

  if (isHtml) {
    return (
      <div
        className="rendered-html-content"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return <p className="message-content">{content}</p>;
};







  const [activeSubStageTab, setActiveSubStageTab] = useState<
    "search" | "data" | "summary"
  >("search");



const [popupmodalInfo, setPopupModalInfo] = useState({
  open: false,
  title: "",
  message: ""
});
const showModal = (title: string, message: string) => {
  setPopupModalInfo({ open: true, title, message });
};

const closeModal = () => {
  setPopupModalInfo(prev => ({ ...prev, open: false }));
};



const saveExampleEmail = async () => {
  try {
    const storedId = sessionStorage.getItem("newCampaignId");
    const activeCampaignId =
      editTemplateId ?? (storedId ? Number(storedId) : null);


          if (!activeCampaignId) {
            showModal("Error","No campaign instance found.");
            return;
          }

        if (!exampleOutput) {
          showModal("Warning", "No generated email to save.");
          return;
        }
    if (!editableExampleOutput.trim()) {
      showModal("Warning","Example email is empty.");
      return;
    }

    // ✅ Send example_output as a placeholder
    await axios.post(
      `${API_BASE_URL}/api/CampaignPrompt/template/update-placeholders`,
      {
        templateId: activeCampaignId,
        placeholderValues: {
          example_output_email: editableExampleOutput
        }
      }
    );

    showModal("Success","✅ Example email saved successfully");
  } catch (error) {
    console.error("❌ Save example output failed:", error);
    showModal("Error","Failed to save example email.");
  }
};
const showInitialEmail =
  isEditMode && !selectedPlaceholder && !conversationStarted;
 
const showChat =
  !isEditMode || selectedPlaceholder || conversationStarted;




// ===============================
// TYPES
// ===============================


// ===============================
// SAFE TRUNCATE HELPER
// ===============================
const truncate = (val: string, max = 50) =>
  val.length > max ? val.slice(0, max) + "…" : val;

// ===============================
// GROUP PLACEHOLDERS (CATEGORY WISE)
// ===============================


return (
  <div className="conversation-container shadow-[3px_3px_10px_rgba(0,0,0,0.2)]">
    <div className="chat-layout">

      {/* ===================== LEFT : CHAT ===================== */}
      <div className="chat-section">

        {/* ===== CHAT HEADING ===== */}


        {/* ===== PLACEHOLDER DROPDOWN (INSIDE CHAT) ===== */}
        {isEditMode &&showInitialEmail && (
          <div className="chat-placeholder-panel"style={{color:'#3f9f42'}}>
            

            <select
              className="placeholder-dropdown"
              value={selectedPlaceholder || ""}
              onChange={(e) => onPlaceholderSelect?.(e.target.value)}
              disabled={isTyping}
            >
              <option value="">Edit elements</option>

              {Object.entries(groupedPlaceholders).map(
                ([category, placeholders]) => (
                  <optgroup key={category} label={category}>
                    {placeholders.map((p) => {
                      const value =
                        placeholderValues?.[p.placeholderKey] || "";

                      return (
                        <option
                          key={p.placeholderKey}
                          value={p.placeholderKey}
                        >
                          {p.friendlyName}
                          {value
                            ? ` — ${truncate(value)}`
                            : " — Not set"}
                        </option>
                      );
                    })}
                  </optgroup>
                )
              )}
            </select>
             <div
                style={{
                  //marginBottom: "15px",
                  padding: "10px",
                  background: "#f3f4f6",
                  //borderRadius: "6px",
                  //fontSize: "14px",
                  color: "#111827",
                 // whiteSpace: "pre-wrap",
                 // maxHeight: "370px",   // ✅ limit height
                  //overflowY: "visible",    // ✅ enable vertical scroll
                }}
              >
                <div
  className="email-preview-content"
  dangerouslySetInnerHTML={{
    __html: initialExampleEmail || "<p>No example email loaded.</p>",
  }}
/>
              </div>
          </div>
        )}

        {/* ===== CHAT BODY ===== */}
        {showChat && (
        <div className="messages-area" ref={messagesContainerRef} style={{
    flex: showInitialEmail ? "0 0 auto" : "1 1 auto",
  }}>

          {/* EDIT MODE – no placeholder yet */}
          {/* {isEditMode && !conversationStarted && !selectedPlaceholder && (
            <div className="empty-conversation">
              <p>Please select element to edit.</p>
            </div>
          )} */}

          {/* EDIT MODE – preparing */}
          {isEditMode && !conversationStarted && selectedPlaceholder && (
            <div className="empty-conversation">
              <p>Preparing conversation…</p>
            </div>
          )}

          {/* NORMAL MODE – idle */}
          {!conversationStarted && !isEditMode && (
            <div className="empty-conversation" />
          )}

          {/* ACTIVE CHAT */}
          {conversationStarted && (

        <div className="messages-list">

              {messages.map((msg, idx) => (
                <div key={idx} className={`message-wrapper ${msg.type}`}>
                  <div className={`message-bubble ${msg.type}`}>
                    {renderMessageContent(msg.content)}
                    <div className={`message-time ${msg.type}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="typing-indicator flex items-center gap-[5px]">
                  <Loader2 className="typing-spinner" />
                  <span>Blueprint builder is thinking…</span>
                </div>
              )}

              
            </div>
          )}
        </div>
        )}
        {/* ===== INPUT BAR ===== */}
        {conversationStarted && (
          <div className="input-area">
            <div className="input-container">
              <textarea
                ref={inputRef}
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your answer…"
                className="message-input"
                rows={2}
                disabled={isTyping}
              />

              <button
                onClick={handleSendMessage}
                disabled={isTyping || !currentAnswer.trim()}
                className="send-button"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

     

      {/* ===== MODAL ===== */}
      <PopupModal
        open={popupmodalInfo.open}
        title={popupmodalInfo.title}
        message={popupmodalInfo.message}
        onClose={closeModal}
      />
    </div>
  </div>
);

};

// ====================================================================
// REUSABLE EXAMPLE OUTPUT PANEL COMPONENT
// ====================================================================
interface ExampleOutputPanelProps {


  // generation state
  isGenerating: boolean;                      // ✅ FIXED
  regenerateExampleOutput?: () => Promise<void> | void;

  // output fields
  exampleOutput?: string;
  editableExampleOutput: string;
  setEditableExampleOutput: (v: string) => void;
  saveExampleEmail: () => Promise<void>;

  // contact + data file
  dataFiles: any[];
  contacts: any[];
  selectedDataFileId: number | null;
  selectedContactId: number | null;
  handleSelectDataFile: (id: number) => void;
  setSelectedContactId: React.Dispatch<React.SetStateAction<number | null>>;
  applyContactPlaceholders: (c: any) => void;

  // pagination
  currentPage: number;
  totalPages: number;
  rowsPerPage: number;
  setCurrentPage: (v: number) => void;
  setPageSize: (v: number | "All") => void;

  // tabs
  activeMainTab: "output" | "pt" | "stages";
  setActiveMainTab: (t: "output" | "pt" | "stages") => void;

  activeSubStageTab: "search" | "data" | "summary";
  setActiveSubStageTab: (t: "search" | "data" | "summary") => void;


  // PT tab
  filledTemplate: string;

  // Stages tab
  searchResults: string[];
  allSourcedData: string;
  sourcedSummary: string;

  isPreviewAllowed: boolean;   // ✅ ADD



}

const ExampleOutputPanel: React.FC<ExampleOutputPanelProps> = ({
  dataFiles,
  contacts,
  selectedDataFileId,
  selectedContactId,
  handleSelectDataFile,
  setSelectedContactId,
  applyContactPlaceholders,
  currentPage,
  totalPages,
  rowsPerPage,
  setCurrentPage,
  setPageSize,
  editableExampleOutput,
  setEditableExampleOutput,
  saveExampleEmail,
  isGenerating,
  regenerateExampleOutput,
  activeMainTab,
  setActiveMainTab,
  activeSubStageTab,
  setActiveSubStageTab,
  filledTemplate,
  searchResults,
  allSourcedData,
  sourcedSummary,
  exampleOutput,
  isPreviewAllowed,
                    

}) => {

  const safe = (v: any) => (v?.trim ? v.trim() : v) || "NA";
  const selectedContact = contacts.find(c => c.id === selectedContactId);

  return (
    <div className="example-section !h-[calc(100%-60px)] shadow-[3px_3px_10px_rgba(0,0,0,0.2)]">
      {/* ===================== HEADER ===================== */}
      <div className="example-header mb-[0]">
        <div className="example-datafile-section">
          <label className="text-[14px] font-[600]">Contact list</label>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "-20px" }}>
            <select
              className="datafile-dropdown"
              value={selectedDataFileId || ""}
              onChange={(e) => handleSelectDataFile(Number(e.target.value))}
              style={{
                width: "180px",
                height: "35px",
                fontSize: "14px",
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                appearance: "none"
              }}
            >
              <option value="">-- Select contact file --</option>
              {dataFiles.map(df => (
                <option key={df.id} value={df.id}>{df.name}</option>
              ))}
            </select>

            <div className="pagination-wrapper example-pagination" style={{ marginTop: "-20px" }}>
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={rowsPerPage}
                totalRecords={contacts.length}
                setCurrentPage={setCurrentPage}
                setPageSize={setPageSize}
                pageLabel="Contact:"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===================== CONTACT DETAILS ROW ===================== */}
      {selectedContact && (
        <div className="contact-row-wrapper"
             style={{
               display: "flex",
               alignItems: "center",
               gap: "12px",
               marginTop: "-15px",
               backgroundColor: " #f5f6fa"
             }}>

          <div
            className="contact-details"
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              border: "1px solid #d1d5db",
              padding: "10px 10px",
              borderRadius: "8px",
              backgroundColor: "#f9fafb",
            }}
          >
            <span>{safe(selectedContact.full_name)}</span> •
            <span>{safe(selectedContact.job_title)}</span> •
            <span>{safe(selectedContact.company_name)}</span> •
            <span>{safe(selectedContact.country_or_address)}</span>
          </div>

          {/* GENERATE BUTTON */}
          <button
            className="regenerate-btn"
            disabled={isGenerating || !isPreviewAllowed}
            onClick={async () => {
              await applyContactPlaceholders(selectedContact);
              if (regenerateExampleOutput) {
                await regenerateExampleOutput();
              }

            }}
          >
            {isGenerating ? (
              <>
                <Loader2 size={18} className="spinning" />
                &nbsp; Preview email
              </>
            ) : (
              "Preview email"
            )}
          </button>
        </div>
      )}

      {/* ===================== TABS HEADER ===================== */}
      <div
        className="example-tabs"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "0px",
        }}
      >
        <div style={{ display: "flex", gap: "12px" }}>
           {["output", "pt"].map((t) => (                //{["output", "pt", "stages"].map((t) => (
            <button
              key={t}
              className={`stage-tab-btn ${activeMainTab === t ? "active" : ""}`}
              onClick={() => setActiveMainTab(t as any)}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {activeMainTab === "output" && editableExampleOutput && (
          <button
            onClick={saveExampleEmail}
            title='If this preview looks good then save it as the new "Example output email"'
            style={{
              padding: "6px 14px",
              background: "#3f9f42",
              color: "white",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Save email
          </button>
        )}
      </div>

      {/* ===================== OUTPUT TAB ===================== */}
      {activeMainTab === "output" && (
        <div className="example-body">
        {(editableExampleOutput || exampleOutput) ? (
          <ExampleEmailEditor
            value={editableExampleOutput || exampleOutput || ""}
            onChange={setEditableExampleOutput}
          />
        ) : (
          <div className="example-placeholder">
            <p>Example output will appear here</p>
          </div>
        )}

        </div>
      )}

      {/* ===================== PT TAB ===================== */}
      {activeMainTab === "pt" && (
        <div className="example-body">
          {filledTemplate ? (
            <pre className="filled-template-box">{filledTemplate}</pre>
          ) : (
            <p className="example-placeholder">Filled Template will appear here</p>
          )}
        </div>
      )}

      {/* ===================== STAGES TAB ===================== */}
      {/* {activeMainTab === "stages" && (
        <div className="stages-container">
          <div className="stage-tabs">
            {["search", "data", "summary"].map((t) => (
              <button
                key={t}
                className={`stage-tab ${activeSubStageTab === t ? "active" : ""}`}
                onClick={() => setActiveSubStageTab(t as any)}
              >
                {t === "search"
                  ? "Search Results"
                  : t === "data"
                  ? "All Sourced Data"
                  : "Sourced Data Summary"}
              </button>
            ))}
          </div>

          <div className="stage-content">
            {activeSubStageTab === "search" && (
              <ul className="search-results-list">
                {searchResults.length > 0 ? (
                  searchResults.map((url, idx) => (
                    <li key={idx}>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {url}
                      </a>
                    </li>
                  ))
                ) : (
                  <p>No search results available.</p>
                )}
              </ul>
            )}

            {activeSubStageTab === "data" && (
              <pre className="all-sourced-data">{allSourcedData}</pre>
            )}

            {activeSubStageTab === "summary" && (
              <div className="sourced-summary">
                {sourcedSummary || "No summary available."}
              </div>
            )}
          </div>
        </div>
      )} */}
    </div>
  );
};

// ====================================================================
// MAIN COMPONENT
// ====================================================================
const MasterPromptCampaignBuilder: React.FC<EmailCampaignBuilderProps> = ({ selectedClient }) => {
  // --- State Management ---
  const [activeBuildTab, setActiveBuildTab] = useState<BuildSubTab>('chat');
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copied, setCopied] = useState(false);
  const [soundEnabled, setSoundEnabled] = useSessionState<boolean>("campaign_sound_enabled", true);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);


  const [editTemplateId, setEditTemplateId] = useState<number | null>(null);
  const [originalTemplateData, setOriginalTemplateData] = useState<any>(null);
  const [selectedPlaceholder, setSelectedPlaceholder] = useState<string>("");
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);

  const [selectedTemplateDefinitionId, setSelectedTemplateDefinitionId] = useState<number | null>(null);

  const [messages, setMessages] = useSessionState<Message[]>("campaign_messages", []);
  const [usageInfo, setUsageInfo] = useState<any>(null);

  const [finalPrompt, setFinalPrompt] = useSessionState<string>("campaign_final_prompt", "");
  const [finalPreviewText, setFinalPreviewText] = useSessionState<string>("campaign_final_preview", "");
  const [exampleOutput, setExampleOutput] = useState<string>('');
  const [filledTemplate, setFilledTemplate] = useState<string>('');

  const [placeholderValues, setPlaceholderValues] = useSessionState<Record<string, string>>("campaign_placeholder_values", {});
  const [isComplete, setIsComplete] = useSessionState<boolean>("campaign_is_complete", false);
  const [conversationStarted, setConversationStarted] = useSessionState<boolean>("campaign_started", false);
  const [systemPrompt, setSystemPrompt] = useSessionState<string>("campaign_system_prompt", "");
  const [systemPromptForEdit, setSystemPromptForEdit] = useSessionState<string>("campaign_system_prompt_edit", "");
  const [masterPrompt, setMasterPrompt] = useSessionState<string>("campaign_master_prompt", "");
  const [previewText, setPreviewText] = useSessionState<string>("campaign_preview_text", "");
  const [selectedModel, setSelectedModel] = useSessionState<string>("campaign_selected_model", "gpt-5");
  const [masterPromptExtensive, setMasterPromptExtensive] = useSessionState<string>("campaign_master_prompt_extensive", "");

  const baseUserId = sessionStorage.getItem("clientId");
  const [isSectionOpen, setIsSectionOpen] = useState(true);
  const effectiveUserId = selectedClient || baseUserId;

  const [templateDefinitions, setTemplateDefinitions] = useState<TemplateDefinition[]>([]);
  const [isSavingDefinition, setIsSavingDefinition] = useState(false);
  const [saveDefinitionStatus, setSaveDefinitionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [templateName, setTemplateName] = useSessionState<string>("campaign_template_name", "");
  const [isLoadingDefinitions, setIsLoadingDefinitions] = useState(false);

  // ---- Datafiles & contacts ---
  const [dataFiles, setDataFiles] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedDataFileId, setSelectedDataFileId] = useState<number | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);

  const [campaignBlueprint, setCampaignBlueprint] = useState<string>('');
  // NEW
  const [searchURLCount, setSearchURLCount] = useState<number>(1);
  const [subjectInstructions, setSubjectInstructions] = useState<string>("");
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 1;
  const setPageSize = () => {};
  const [openedFromTemplateEdit, setOpenedFromTemplateEdit] = useState(false);




const isPreviewAllowed = React.useMemo(() => {
  const emailHtml = placeholderValues?.example_output_email;
  return getPlainTextLength(emailHtml) >= 20;
}, [placeholderValues?.example_output_email]);

const isEditMode = React.useMemo(() => {
  const html = placeholderValues?.example_output_email;
  return typeof html === "string" && getPlainTextLength(html) >= 20;
}, [placeholderValues?.example_output_email]);

// ========================================
// UI-ONLY PLACEHOLDER METADATA STATE
// ========================================
const [uiPlaceholders, setUiPlaceholders] =
  useState<PlaceholderDefinitionUI[]>([]);

  
const [previewTab, setPreviewTab] = useState<
  "output" | "pt" | "stages"
>("output");

const [previewSubTab, setPreviewSubTab] = useState<
  "search" | "data" | "summary"
>("summary");
const totalPages = Math.max(1, Math.ceil((contacts.length || 1) / rowsPerPage));
const [editableExampleOutput, setEditableExampleOutput] = useState("");
const [isGenerating, setIsGenerating] = useState(false);
const [activeMainTab, setActiveMainTab] = useState<MainTab>('build');

const [activeSubStageTab, setActiveSubStageTab] =
  useState<"search" | "data" | "summary">("summary");
  const [popupmodalInfo, setPopupModalInfo] = useState({
  open: false,
  title: "",
  message: ""
});

const [totalUsage, setTotalUsage] = useState({
  totalInput: 0,
  totalOutput: 0,
  totalCalls: 0,
  totalCost: 0
});

const showModal = (title: string, message: string) => {
  setPopupModalInfo({ open: true, title, message });
};

const closeModal = () => {
  setPopupModalInfo(prev => ({ ...prev, open: false }));
};



const saveExampleEmail = async () => {
  try {
    const storedId = sessionStorage.getItem("newCampaignId");
    const activeCampaignId =
      editTemplateId ?? (storedId ? Number(storedId) : null);

    if (!activeCampaignId) {
      showModal("Error", "No campaign instance found.");
      return;
    }

    if (!editableExampleOutput.trim()) {
      showModal("Warning", "Example email is empty.");
      return;
    }

    await axios.post(
      `${API_BASE_URL}/api/CampaignPrompt/template/update-placeholders`,
      {
        templateId: activeCampaignId,
        placeholderValues: {
          example_output_email: editableExampleOutput // ✅ CORRECT KEY
        }
      }
    );

    // ✅ THIS is what flips edit mode
    setPlaceholderValues(prev => ({
      ...prev,
      example_output_email: editableExampleOutput
    }));

    showModal("Success", "✅ Example email saved successfully!");
  } catch (error) {
    console.error("❌ Save example output failed:", error);
    showModal("Error", "Failed to save example email.");
  }
};



interface ExampleEmailEditorProps {
  value: string;
  onChange: (value: string) => void;
}


const ExampleEmailEditor = ({
  value,
  onChange
}: {
  value: string;
  onChange: (val: string) => void;
}) => {
  const editorRef = React.useRef<HTMLDivElement | null>(null);
  const localDraft = React.useRef<string>("");

  React.useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = value || "";
      localDraft.current = value || "";
    }
  }, [value]);

  return (
    <RichTextEditor
      value={value}
      height={320}
      onChange={onChange}
    />
  );
};

useEffect(() => {
  if (
    activeMainTab === "build" &&
    activeBuildTab === "elements" &&
    exampleOutput &&
    !editableExampleOutput
  ) {
    setEditableExampleOutput(exampleOutput);
  }
}, [activeMainTab, activeBuildTab, exampleOutput]);




useEffect(() => {
  if (!selectedTemplateDefinitionId) return;

  axios
    .get(
      `${API_BASE_URL}/api/CampaignPrompt/placeholders/by-template/${selectedTemplateDefinitionId}`
    )
    .then(res => {
      if (Array.isArray(res.data) && res.data.length > 0) {
    setUiPlaceholders(
      res.data.map((p: any, index: number) => ({
        ...p,
        categorySequence: p.categorySequence ?? 999,       // default sort
        placeholderSequence: p.placeholderSequence ?? index + 1
      }))
    );        
    console.log("✅ Loaded element definitions from backend");
      }
    })
    .catch(err =>
      console.error("❌ Failed to load element definitions", err)
    );
}, [selectedTemplateDefinitionId]);


useEffect(() => {
  if (currentPage > totalPages) {
    setCurrentPage(totalPages);
  }
}, [totalPages]);

useEffect(() => {
  setEditableExampleOutput(exampleOutput || "");
}, [exampleOutput]);


useEffect(() => {
  setFormValues(placeholderValues);
}, [placeholderValues]);


// 1️⃣ Reset page ONLY when contacts list changes
useEffect(() => {
  if (!selectedDataFileId) return;
  setCurrentPage(1);
}, [selectedDataFileId]);


// 2️⃣ Apply contact when page changes
useEffect(() => {
  if (!contacts.length) return;

  const contact = contacts[(currentPage - 1) * rowsPerPage];
  if (!contact || contact.id === selectedContactId) return;

  setSelectedContactId(contact.id);
  applyContactPlaceholders(contact);
}, [currentPage, contacts]);




useEffect(() => {
  const main = sessionStorage.getItem("campaign_activeMainTab") as MainTab | null;
  const build = sessionStorage.getItem("campaign_activeBuildTab") as BuildSubTab | null;

  if (main) setActiveMainTab(main);
  if (build) setActiveBuildTab(build);
}, []);

useEffect(() => {
  sessionStorage.setItem("campaign_activeMainTab", activeMainTab);
  sessionStorage.setItem("campaign_activeBuildTab", activeBuildTab);
}, [activeMainTab, activeBuildTab]);

  // ====================================================================
  // LOAD DATA FILES
  // ====================================================================
  useEffect(() => {
    if (!effectiveUserId) return;
    axios.get(`${API_BASE_URL}/api/Crm/datafile-byclientid?clientId=${effectiveUserId}`)
      .then(res => setDataFiles(res.data || []))
      .catch(err => console.error("Failed to load datafiles", err));
  }, [effectiveUserId]);




  // ====================================================================
  // AUTO-START CONVERSATION (Robust version)
  // ====================================================================
  useEffect(() => {
    let attempts = 0;

    const tryAutoStart = async () => {
      const autoStart = sessionStorage.getItem("autoStartConversation");
      const newCampaignId = sessionStorage.getItem("newCampaignId");
      const selectedDefinition = sessionStorage.getItem("selectedTemplateDefinitionId");
      const campaignName = sessionStorage.getItem("newCampaignName");

      if (autoStart && newCampaignId && selectedDefinition) {
        console.log(`🚀 Auto-starting campaign "${campaignName}"...`);
        const definitionId = parseInt(selectedDefinition);

        // Set states (async)
        setSelectedTemplateDefinitionId(definitionId);
        setTemplateName(campaignName || "");
        setIsTyping(true);

        // Load template
        await loadTemplateDefinitionById(definitionId);

        // ⛔ DO NOT remove autoStartConversation here
        // Let watcher handle it

        return;
      }

      if (attempts < 10) {
        attempts++;
        setTimeout(tryAutoStart, 300);
      }
    };

    tryAutoStart();
  }, []);


  // ---------------------------------------------------------
  // FIX: trigger startConversation ONLY when template is loaded
  // ---------------------------------------------------------
  useEffect(() => {
    const shouldAutoStart = sessionStorage.getItem("autoStartConversation");

    if (
      shouldAutoStart &&
      systemPrompt.trim() !== "" &&
      masterPrompt.trim() !== "" &&
      selectedTemplateDefinitionId !== null
    ) {
      console.log("⚡ All template data ready — starting conversation now!");

      // Remove flags AFTER readiness is confirmed
      sessionStorage.removeItem("autoStartConversation");
      sessionStorage.removeItem("openConversationTab");

      setActiveMainTab("build"); setActiveBuildTab("chat");      
      startConversation();
    }
  }, [systemPrompt, masterPrompt, selectedTemplateDefinitionId]);


const saveAllPlaceholders = async () => {
  try {
    const storedId = sessionStorage.getItem("newCampaignId");
    const activeTemplateId =
      editTemplateId ?? (storedId ? Number(storedId) : null);

    if (!activeTemplateId) {
      showModal("Error","No campaign template found.");
      return;
    }

    // ✅ only conversation placeholders (exclude contact placeholders)
    //const conversationOnly = getConversationPlaceholders(formValues);
    const conversationOnly = Object.fromEntries(
      Object.entries(getConversationPlaceholders(formValues)).filter(
        ([key]) => extractPlaceholders(masterPrompt).includes(key)
      )
    );

    await axios.post(
      `${API_BASE_URL}/api/CampaignPrompt/template/update-placeholders`,
      {
        templateId: activeTemplateId,
        placeholderValues: conversationOnly
      }
    );

    // ✅ update local UI
    setPlaceholderValues(prev => ({
      ...prev,
      ...conversationOnly
    }));

    await reloadCampaignBlueprint();

    showModal("Success","✅ Element values updated successfully!");
  } catch (error) {
    console.error("❌ Failed to update elements:", error);
    showModal("Warning","Failed to update element values.");
  }
};



  // ====================================================================
  // SELECT DATA FILE AND LOAD CONTACTS
  // ====================================================================
  const handleSelectDataFile = (id: number) => {
    setSelectedDataFileId(id);
    setContacts([]);
    setSelectedContactId(null);
    if (id) {
      axios.get(`${API_BASE_URL}/api/Crm/contacts/by-client-datafile?clientId=${effectiveUserId}&dataFileId=${id}`)
        .then(res => {
          //setContacts(res.data.contacts || []);
          const loadedContacts = res.data.contacts || [];
          setContacts(loadedContacts);
          if (loadedContacts.length > 0) {
            const firstContact = loadedContacts[0];
            setSelectedContactId(firstContact.id);
            applyContactPlaceholders(firstContact); // auto-fill placeholders
          }
        })
        .catch(err => console.error("Failed to load contacts", err));
    }
  };


  const applyContactPlaceholders = async (contact: any) => {
    if (!contact) return;

    try {
      console.log('📇 Applying contact elements:', contact.full_name);

      // Derive friendly / abbrev variants
      const friendly = contact.company_name?.replace(/\b(ltd|llc|limited|plc)\b/gi, "").trim() || contact.company_name;
      const abbrev = friendly ? friendly.toLowerCase().replace(/\s+/g, "-") : "";
      const [first = "", last = ""] = (contact.full_name || "").split(" ");

      // ✅ Build contact placeholders exactly matching template placeholders
      const contactValues: Record<string, string> = {
        full_name: contact.full_name || "",
        first_name: first,
        last_name: last,
        job_title: contact.job_title || "",
        location: contact.country_or_address || contact.location || "",
        company_name: contact.company_name || "",
        company_name_friendly: friendly || "",
        company_name_abbrev: abbrev || "",
        linkedin_url: contact.linkedin_url || "",
        website: contact.company_website || contact.website || "",
      };

      // ✅ Merge with current conversation placeholders
      const conversationValues = getConversationPlaceholders(placeholderValues);
      const mergedForDisplay = getMergedPlaceholdersForDisplay(conversationValues, contactValues);

      setPlaceholderValues(mergedForDisplay);

      console.log('✅ Contact elements applied');
      console.log('🌐 Website value:', mergedForDisplay.website || '(none)');
      console.log('🔗 LinkedIn value:', mergedForDisplay.linkedin_url || '(none)');
      console.log('ℹ️ Click "Regenerate" to generate email with this contact');

    } catch (error) {
      console.error("⚠️ Error applying contact elements:", error);
    }
  };


  // ====================================================================
  // ✅ HELPER: Regenerate with Specific Values (Used by regenerateExampleOutput)
  // ====================================================================

// =====================================================
// UI helpers for placeholder dropdown (EDIT MODE)
// =====================================================
const truncate = (val: string, max = 60) => {
  if (!val) return "";
  return val.length > max ? val.slice(0, max) + "…" : val;
};

const getPlaceholderValue = (key: string) => {
  return placeholderValues?.[key] || "";
};

  // 🧭 Stages tab state

  // 🔍 States for Stages tab data
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [allSourcedData, setAllSourcedData] = useState<string>('');
  const [sourcedSummary, setSourcedSummary] = useState<string>('');
// ===============================
// RUNTIME-ONLY PLACEHOLDERS
// ===============================
const RUNTIME_ONLY_PLACEHOLDERS = [
  "full_name",
  "first_name",
  "last_name",
  "job_title",
  "location",
  "linkedin_url",
  "company_name",
  "company_name_friendly",
  "website"
];

// Split placeholders into:
// 1️⃣ persisted (DB-safe)
// 2️⃣ runtime-only (contact-based)
const splitPlaceholders = (all: Record<string, string>) => {
  const persisted: Record<string, string> = {};
  const runtime: Record<string, string> = {};

  Object.entries(all).forEach(([key, value]) => {
    if (RUNTIME_ONLY_PLACEHOLDERS.includes(key)) {
      runtime[key] = value;
    } else {
      persisted[key] = value;
    }
  });

  return { persisted, runtime };
};
  // ====================================================================
  // ✅ COMPLETE: Regenerate Example Output (MANUAL ONLY)
  // ====================================================================
const regenerateExampleOutput = async () => {
  // if (isGenerating) return;
  try {
     setIsGenerating(true);
    console.log("🚀 Manual regenerate button clicked");

    if (!editTemplateId && !selectedTemplateDefinitionId) {
      showModal("Warning","Please save the template first before regenerating example output.");
      return;
    }

    // --------------------------------------------------
    // 1️⃣ Collect placeholders
    // --------------------------------------------------
    const conversationValues = getConversationPlaceholders(placeholderValues);
    const contactValues = getContactPlaceholders(placeholderValues);

    // Used for SEARCH + replacement checks
    const mergedForSearch = getMergedPlaceholdersForDisplay(
      conversationValues,
      contactValues
    );

    console.log("📦 Conversation elements:", Object.keys(conversationValues));
    console.log("📇 Contact elements:", Object.keys(contactValues));

    // --------------------------------------------------
    // 2️⃣ SEARCH FLOW (optional)
    // --------------------------------------------------
    const hasSearchTermsPlaceholder = masterPrompt.includes("{hook_search_terms}");
    let searchResultSummary = "";

    if (hasSearchTermsPlaceholder && conversationValues["hook_search_terms"]) {
      console.log("🔍 Search terms detected, preparing search API call...");

      if (!conversationValues["vendor_company_email_main_theme"]) {
        showModal("Error",
          '❌ Missing "vendor_company_email_main_theme" value. Please complete the conversation first.'
        );
        return;
      }

      const processedSearchTerm = replacePlaceholdersInString(
        conversationValues["hook_search_terms"],
        mergedForSearch
      );

      const unreplaced = processedSearchTerm.match(/\{[^}]+\}/g);
      if (unreplaced) {
        const missing = unreplaced.map(p => p.replace(/[{}]/g, ""));
        showModal("Error",`⚠️ Missing values: ${missing.join(", ")}`);
        return;
      }

      if (!conversationValues["search_objective"]?.trim()) {
        showModal("Error","❌ Missing search_objective value.");
        return;
      }

      const processedInstructions = replacePlaceholdersInString(
        conversationValues["search_objective"],
        mergedForSearch
      );

      try {
        console.log("📤 Calling Search API...");
        const searchResponse = await axios.post(
          `${API_BASE_URL}/api/auth/process`,
          {
            searchTerm: processedSearchTerm,
            instructions: processedInstructions,
            modelName: selectedModel,
            searchCount: 5
          }
        );

        const pitch =
          searchResponse.data?.pitchResponse ||
          searchResponse.data?.PitchResponse;

        searchResultSummary =
          pitch?.content ||
          pitch?.Content ||
          "";

        if (searchResultSummary) {
          conversationValues["search_output_summary"] = searchResultSummary;

          // Update UI (merged, runtime-safe)
          const updatedMerged = getMergedPlaceholdersForDisplay(
            conversationValues,
            contactValues
          );
          setPlaceholderValues(updatedMerged);

          // Save ONLY conversation placeholders
          const storedId = sessionStorage.getItem("newCampaignId");
          const activeCampaignId =
            editTemplateId ?? (storedId ? Number(storedId) : null);

          if (activeCampaignId) {
            await axios.post(
              `${API_BASE_URL}/api/CampaignPrompt/template/update`,
              {
                id: activeCampaignId,
                placeholderValues: conversationValues
              }
            );
            await reloadCampaignBlueprint();
          }
        }
      } catch (err: any) {
        console.error("❌ Search API failed:", err);
        showModal("Error","Search failed. Continuing without search data.");
      }
    }

    // --------------------------------------------------
    // 3️⃣ GENERATE EXAMPLE OUTPUT (IMPORTANT PART)
    // --------------------------------------------------
    const storedId = sessionStorage.getItem("newCampaignId");
    const activeCampaignId =
      editTemplateId ?? (storedId ? Number(storedId) : null);

    if (!activeCampaignId) {
      showModal("Error","❌ No campaign instance found.");
      return;
    }

    // Merge placeholders (conversation + contact)
    const mergedAll = getMergedPlaceholdersForDisplay(
      conversationValues,
      contactValues
    );

    // 🔥 SPLIT PLACEHOLDERS
    const { persisted } = splitPlaceholders(mergedAll);

    console.log("📧 Generating example output...");
    console.log("📦 Persisted elements only:", Object.keys(persisted));
    setIsPreviewLoading(true);
    const response = await axios.post(
      `${API_BASE_URL}/api/CampaignPrompt/example/generate`,
      {
        userId: effectiveUserId,
        campaignTemplateId: activeCampaignId,
        model: selectedModel,
        placeholderValues: mergedAll // ✅ SEND EVERYTHING
      }
    );

if (response.data?.usage) {
  const u = response.data.usage;

  const inTokens =
    u.promptTokens ?? u.prompt_tokens ?? u.inputTokens ?? 0;
  const outTokens =
    u.completionTokens ?? u.completion_tokens ?? u.outputTokens ?? 0;
  const cost = u.cost ?? u.totalCost ?? 0;

  setUsageInfo({
    promptTokens: inTokens,
    completionTokens: outTokens,
    cost,
  });

  setTotalUsage(prev => ({
    totalInput: prev.totalInput + inTokens,
    totalOutput: prev.totalOutput + outTokens,
    totalCalls: prev.totalCalls + 1,
    totalCost: prev.totalCost + cost,
  }));
}




    // Dispatch credit update event after successful API call
    window.dispatchEvent(new CustomEvent('creditUpdated', {
      detail: { clientId: effectiveUserId }
    }));

    if (response.data?.success || response.data?.Success) {
      const html =
        response.data.exampleOutput ||
        response.data.ExampleOutput ||
        "";

      const filled =
        response.data.filledTemplate ||
        response.data.FilledTemplate ||
        "";

      setExampleOutput(html);
      setFilledTemplate(filled);

      console.log("✅ Example output generated");
      playNotificationSound();
    } else {
      showModal("Warning","⚠️ Example generation returned no output.");
    }

  } catch (error: any) {
    console.error("❌ regenerateExampleOutput failed:", error);
    showModal("Error",`Failed to regenerate: ${error.message}`);
  }finally {
    // 🔥 THIS IS THE IMPORTANT PART
    setIsPreviewLoading(false);
  }
};
const toggleNotifications = () => {
  setSoundEnabled(prev => !prev);
};
  // ====================================================================
  // LOAD TEMPLATE DEFINITIONS
  // ====================================================================
  useEffect(() => {
    loadTemplateDefinitions();
  }, []);

  const loadTemplateDefinitions = async () => {
    setIsLoadingDefinitions(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/CampaignPrompt/template-definitions?activeOnly=true`);
      setTemplateDefinitions(response.data.templateDefinitions || []);
    } catch (error) {
      console.error('Error loading template definitions:', error);
    } finally {
      setIsLoadingDefinitions(false);
    }
  };

  // ====================================================================
  // SAVE TEMPLATE DEFINITION
  // ====================================================================
const saveTemplateDefinition = async () => {
  if (!templateName.trim()) {
    showModal("reason","Please enter a template name");
    return;
  }

  if (!systemPrompt.trim() || !masterPrompt.trim()) {
    showModal("missing parameters","Please fill in AI Instructions and elements List");
    return;
  }

  setIsSavingDefinition(true);
  setSaveDefinitionStatus('idle');

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/CampaignPrompt/template-definition/save`,
      {
        templateName,
        aiInstructions: systemPrompt,
        aiInstructionsForEdit: systemPromptForEdit,
        placeholderList: masterPrompt,
        placeholderListExtensive: masterPromptExtensive,
        masterBlueprintUnpopulated: previewText,
        createdBy: effectiveUserId,
        searchURLCount,
        subjectInstructions,
        selectedModel
      }
    );

    if (response.data.success) {
      const newId = response.data.templateDefinitionId;

      setSaveDefinitionStatus('success');
      setSelectedTemplateDefinitionId(newId);

      // ⭐ SAVE PLACEHOLDERS AFTER CREATING TEMPLATE DEF
      await savePlaceholderDefinitionsInner(newId);

      await loadTemplateDefinitions();

      setTimeout(() => setSaveDefinitionStatus('idle'), 3000);
    }
  } catch (error: any) {
    console.error('Error saving template definition:', error);
    if (error.response?.data?.message?.includes('already exists')) {
      showModal("Instruction",'A template with this name already exists. Please use a different name.');
    } else {
      setSaveDefinitionStatus('error');
      setTimeout(() => setSaveDefinitionStatus('idle'), 3000);
    }
  } finally {
    setIsSavingDefinition(false);
  }
};


  const savePlaceholderDefinitionsInner = async (definitionId: number) => {
  const sortedPlaceholders = [...uiPlaceholders].sort((a, b) => {
    if (a.categorySequence !== b.categorySequence)
      return a.categorySequence - b.categorySequence;
    return a.placeholderSequence - b.placeholderSequence;
  });

  await axios.post(`${API_BASE_URL}/api/CampaignPrompt/placeholders/save`, {
    templateDefinitionId: definitionId,
    placeholders: sortedPlaceholders
  });

  console.log("✅ element definitions saved");
};

const savePlaceholderDefinitions = async () => {
  if (!selectedTemplateDefinitionId) return;

  const sortedPlaceholders = [...uiPlaceholders].sort((a, b) => {
    if (a.categorySequence !== b.categorySequence)
      return a.categorySequence - b.categorySequence;
    return a.placeholderSequence - b.placeholderSequence;
  });

  await axios.post(
    `${API_BASE_URL}/api/CampaignPrompt/placeholders/save`,
    {
      templateDefinitionId: selectedTemplateDefinitionId,
      placeholders: sortedPlaceholders
    }
  );

  alert("✅ element definitions saved");
};
  // ====================================================================
  // UPDATE TEMPLATE DEFINITION
  // ==================================================================== 

  const updateTemplateDefinition = async () => {
    if (!selectedTemplateDefinitionId) {
     showModal("Instruction","No template selected to update.");
      return;
    }

    setIsSavingDefinition(true);

  try {
    await axios.post(`${API_BASE_URL}/api/CampaignPrompt/template-definition/update`, {
      id: selectedTemplateDefinitionId,
      templateName: templateName,
      aiInstructions: systemPrompt,
      aiInstructionsForEdit: systemPromptForEdit,
      placeholderList: masterPrompt,
      placeholderListExtensive: masterPromptExtensive,
      masterBlueprintUnpopulated: previewText,
      searchURLCount,
      subjectInstructions,
      selectedModel: selectedModel

    });

      alert("Template updated successfully.");
      await loadTemplateDefinitions();
    } catch (err) {
      console.error("Update failed:", err);
      showModal("error","Failed to update template definition.");
    } finally {
      setIsSavingDefinition(false);
    }
  };

  // ====================================================================
  // LOAD TEMPLATE DEFINITION BY ID
  // ====================================================================
  const loadTemplateDefinitionById = async (id: number) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/CampaignPrompt/template-definition/${id}`);
      const def = response.data;

    setTemplateName(def.templateName || "");
    setSystemPrompt(def.aiInstructions || "");
    setSystemPromptForEdit(def.aiInstructionsForEdit || "");
    setMasterPrompt(def.placeholderList || "");
    setMasterPromptExtensive(def.placeholderListExtensive || "");
    setPreviewText(def.masterBlueprintUnpopulated || "");
    setSearchURLCount(def.searchURLCount || 1);
    setSubjectInstructions(def.subjectInstructions || "");
    setSelectedModel(def.selectedModel );


      // ✅ REQUIRED!!!
      setSelectedTemplateDefinitionId(def.id);

    } catch (error) {
      console.error("⚠️ Failed to load template definition:", error);
    }
  };


  // ====================================================================
  // LOAD TEMPLATE FOR EDIT MODE
  // ====================================================================
    useEffect(() => {
      const templateId = sessionStorage.getItem('editTemplateId');
      const editMode = sessionStorage.getItem('editTemplateMode');

      if (templateId && editMode === 'true') {
        clearAllSessionData();

        setEditTemplateId(Number(templateId));
        setOpenedFromTemplateEdit(true); // ✅ ONLY HERE
        setActiveMainTab("build");
        setActiveBuildTab("chat");

        loadTemplateForEdit(Number(templateId));

        sessionStorage.removeItem('editTemplateId');
        sessionStorage.removeItem('editTemplateMode');
      }
    }, []);


  const clearAllSessionData = () => {
    sessionStorage.removeItem("campaign_messages");
    sessionStorage.removeItem("campaign_final_prompt");
    sessionStorage.removeItem("campaign_final_preview");
    sessionStorage.removeItem("campaign_placeholder_values");
    sessionStorage.removeItem("campaign_is_complete");
    sessionStorage.removeItem("campaign_started");
    sessionStorage.removeItem("campaign_system_prompt");
    sessionStorage.removeItem("campaign_system_prompt_edit");
    sessionStorage.removeItem("campaign_master_prompt");
    sessionStorage.removeItem("campaign_master_prompt_extensive");
    sessionStorage.removeItem("campaign_preview_text");
    sessionStorage.removeItem("campaign_selected_model");
    sessionStorage.removeItem("campaign_template_name");
  };

  const loadTemplateForEdit = async (templateId: number) => {
    setIsLoadingTemplate(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/CampaignPrompt/campaign/${templateId}`);
      const template = res.data;

      setOriginalTemplateData(template);
      setCampaignBlueprint(template.campaignBlueprint || "");


      setSystemPrompt(template.aiInstructions || "");
      setSystemPromptForEdit(template.aiInstructionsForEdit || "");
      setMasterPrompt(template.placeholderList || "");
      setMasterPromptExtensive(template.placeholderListExtensive || "");
      setPreviewText(template.masterBlueprintUnpopulated || "");
      setSelectedModel(template.selectedModel || "gpt-5");
      setSelectedTemplateDefinitionId(template.templateDefinitionId || null);
      setTemplateName(template.templateName || "");
      setSubjectInstructions(template.subjectInstructions || "");
      setIsComplete(false);

      // --------------------------------------------
      // LOAD PREVIOUS CONVERSATION MESSAGES
      // --------------------------------------------
      if (template.conversation && template.conversation.messages) {
        console.log("📨 Loading past conversation messages:", template.conversation.messages.length);

        const loadedMessages = template.conversation.messages.map((m: any) => ({
          type: m.role === "assistant" ? "bot" : "user",
          content: m.content,
          timestamp: new Date()
        }));

        setMessages(loadedMessages);
      } else {
        console.log("ℹ️ No stored messages found for this campaign.");
        setMessages([]);
      }

      // ✅ Load ONLY conversation placeholders from DB
      if (template.placeholderValues) {
        const conversationOnly = getConversationPlaceholders(template.placeholderValues);
        setPlaceholderValues(conversationOnly);
      } else {
        setPlaceholderValues({});
      }

      if (template.exampleOutput) {
        setExampleOutput(template.exampleOutput);
      } 

      setActiveMainTab("build"); setActiveBuildTab("chat");
      setConversationStarted(false);
      setIsTyping(false);
      // setIsEditMode(true);
    } catch (error) {
      console.error("Error loading template:", error);
      alert("Failed to load template for editing");
      //setIsEditMode(false);
    } finally {
      setIsLoadingTemplate(false);
    }
  };

  // ====================================================================
  // START EDIT CONVERSATION
  // ====================================================================
// Robust startEditConversation: reads editTemplateId from state OR session storage (both keys),
// validates numeric campaignTemplateId, and optionally wraps payload in { req } if needed.
const startEditConversation = async (placeholder: string) => {
  if (!effectiveUserId || !placeholder) {
    console.warn("startEditConversation: missing effectiveUserId or element");
    return;
  }

  // Prefer in-memory editTemplateId, fall back to session keys (newCampaignId or editTemplateId)
  const storedNewCampaignId = sessionStorage.getItem('newCampaignId');
  const storedEditTemplateId = sessionStorage.getItem('editTemplateId');

  const campaignTemplateIdCandidate = editTemplateId
    ?? (storedNewCampaignId ? Number(storedNewCampaignId) : null)
    ?? (storedEditTemplateId ? Number(storedEditTemplateId) : null);

  const campaignTemplateId = Number(campaignTemplateIdCandidate);

  // Validate campaignTemplateId
  if (!campaignTemplateId || Number.isNaN(campaignTemplateId) || campaignTemplateId <= 0) {
    showModal("Invalid","No campaign ID found. Please open the campaign in edit mode first (wait until it finishes loading).");
    console.error("startEditConversation: campaignTemplateId is missing/invalid:", {
      editTemplateId,
      storedNewCampaignId,
      storedEditTemplateId,
      campaignTemplateIdCandidate,
    });
    return;
  }

  // Good to set UI state after validation (prevents sending requests when id missing)
  setSelectedPlaceholder(placeholder);
  setMessages([]);
  setConversationStarted(true);
  setIsComplete(false);
  setIsTyping(true);

  const currentValue = placeholderValues[placeholder] || "not set";

  try {
    const payload = {
      userId: String(effectiveUserId),    // ✅ STRING
      campaignTemplateId: campaignTemplateId,      // numeric
      placeholder,
      currentValue,
      model: selectedModel,

    };

    // DEBUG: inspect outgoing payload in console/network tab
    console.log("startEditConversation -> payload:", payload);

    // If your backend expects { req: { ... } } wrap the payload:
    // const bodyToSend = { req: payload }; // <-- uncomment if API requires req wrapper
    const bodyToSend = payload;

    const response = await axios.post(
      `${API_BASE_URL}/api/CampaignPrompt/edit/start`, bodyToSend);

    // Dispatch credit update event after successful API call
    window.dispatchEvent(new CustomEvent('creditUpdated', {
      detail: { clientId: effectiveUserId }
    }));

    const data = response.data?.response ?? response.data;
if (response.data?.usage) {
  const u = response.data.usage;

  const inTokens =
    u.promptTokens ?? u.prompt_tokens ?? u.inputTokens ?? 0;
  const outTokens =
    u.completionTokens ?? u.completion_tokens ?? u.outputTokens ?? 0;
  const cost = u.cost ?? u.totalCost ?? 0;

  setUsageInfo({
    promptTokens: inTokens,
    completionTokens: outTokens,
    cost,
  });

  setTotalUsage(prev => ({
    totalInput: prev.totalInput + inTokens,
    totalOutput: prev.totalOutput + outTokens,
    totalCalls: prev.totalCalls + 1,
    totalCost: prev.totalCost + cost,
  }));
}


    if (data && data.assistantText) {
      setMessages([{ type: "bot", content: data.assistantText, timestamp: new Date() }]);
      playNotificationSound();
    } else {
      // If API returns a different shape, log it for debugging and show friendly message
      console.warn("startEditConversation: unexpected response:", response.data);
      setMessages([{ type: "bot", content: "Received unexpected response from server.", timestamp: new Date() }]);
    }
  } catch (err: any) {
    console.error("Error starting edit conversation:", err, err?.response?.data);
    setMessages([
      {
        type: "bot",
        content: "Sorry, I couldn't start the edit conversation. Please try again.",
        timestamp: new Date(),
      },
    ]);
  } finally {
    setIsTyping(false);
  }
};

  // ====================================================================
  // ✅ UPDATED: Finalize Edit Placeholder (Save Only Conversation)
  // ====================================================================

  const finalizeEditPlaceholder = async (updatedPlaceholder: string, newValue: string) => {
    if (!editTemplateId || !effectiveUserId) return;

    // Get current conversation placeholders
    const conversationValues = getConversationPlaceholders(placeholderValues);
    const contactValues = getContactPlaceholders(placeholderValues);

    // Update the specific placeholder
    // conversationValues[updatedPlaceholder] = newValue;
    const essentialKeys = extractPlaceholders(masterPrompt);

    if (!essentialKeys.includes(updatedPlaceholder)) {
      console.warn("Blocked non-essential placeholder:", updatedPlaceholder);
      return;
    }

    conversationValues[updatedPlaceholder] = newValue;

    // Merge for display
    const mergedForDisplay = getMergedPlaceholdersForDisplay(conversationValues, contactValues);
    setPlaceholderValues(mergedForDisplay);

  try {
    // ✅ Save ONLY conversation placeholders to DB
    await axios.post(`${API_BASE_URL}/api/CampaignPrompt/template/update`, {
      id: editTemplateId,
      placeholderValues: conversationValues, // ✅ Only conversation placeholders
      selectedModel,
    });
    reloadCampaignBlueprint();
    console.log("✅ Conversation element saved in DB:", updatedPlaceholder);
    console.log("ℹ️ Click 'Regenerate' to see the updated email");

      // ❌ REMOVED: Auto-regeneration
      // User must click "Regenerate" button manually

    } catch (err) {
      console.error("⚠️ Error during element finalization:", err);
    }
  };

  // ====================================================================
  // AUDIO & NOTIFICATIONS
  // ====================================================================
  useEffect(() => {
    audioRef.current = new Audio(notificationSound);
    audioRef.current.volume = 1.0;
    audioRef.current.load();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playNotificationSound = () => {
    if (!soundEnabled) return;

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(error => {
        console.log('Audio play failed:', error);
      });
    }

    showBrowserNotification("New message from AI Campaign Builder");
  };

  const showBrowserNotification = (message: string) => {
    if (!("Notification" in window)) {
      return;
    }

    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    if (Notification.permission === "granted") {
      const notification = new Notification("AI Campaign Builder", {
        body: message,
        icon: '/favicon.ico',
        tag: 'campaign-notification',
        requireInteraction: false
      });

      setTimeout(() => notification.close(), 4000);

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  };

  useEffect(() => {
    const requestPermission = () => {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    };

    document.addEventListener('click', requestPermission, { once: true });

    return () => {
      document.removeEventListener('click', requestPermission);
    };
  }, []);

  // ====================================================================
  // AVAILABLE MODELS
  // ====================================================================
  const availableModels: GPTModel[] = [
    { id: 'gpt-5.1', name: 'GPT-5.1', description: 'Adaptive-reasoning flagship update to the GPT-5 series' },
    { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Flagship model in the 4.1 family' },
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 mini', description: 'Faster, lighter version of 4.1' },
    { id: 'gpt-4.1-nano', name: 'GPT-4.1 nano', description: 'Smallest, fastest, lowest-cost variant' },
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Standard GPT-4 Optimized' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Efficient GPT-4o model' },
    { id: 'gpt-5', name: 'GPT-5', description: 'Standard flagship model' },
    { id: 'gpt-5-mini', name: 'GPT-5 Mini', description: 'Lightweight, efficient, cost-effective' },
    { id: 'gpt-5-nano', name: 'GPT-5 Nano', description: 'Ultra-fast, minimal resource usage' },
  ];

  // ====================================================================
  // EXTRACT PLACEHOLDERS
  // ====================================================================
  const extractPlaceholders = (text: string): string[] => {
    const regex = /\{([^}]+)\}/g;
    const placeholders: string[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (!placeholders.includes(match[1])) {
        placeholders.push(match[1]);
      }
    }
    return placeholders;
  };

// ===============================
// HTML → TEXT LENGTH HELPER
// ===============================
function getPlainTextLength(html?: string): number {
  if (!html) return 0;
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.innerText.trim().length;
}


  // ====================================================================
  // REPLACE PLACEHOLDERS IN STRING
  // ====================================================================
  const replacePlaceholdersInString = (
    text: string,
    values: Record<string, string>
  ): string => {
    if (!text) return '';

    let result = text;

    Object.entries(values).forEach(([key, value]) => {
      if (!value) {
        return;
      }

      const patterns = [
        new RegExp(`\\{${key}\\}`, 'g'),
        new RegExp(`\\{ ${key} \\}`, 'g'),
        new RegExp(`\\{${key} \\}`, 'g'),
        new RegExp(`\\{ ${key}\\}`, 'g'),
      ];

      patterns.forEach(regex => {
        result = result.replace(regex, value);
      });
    });

    return result;
  };

  // ====================================================================
  // SCROLL TO BOTTOM
  // ====================================================================

  // ====================================================================
  // RESET ON CLIENT CHANGE
  // ====================================================================
  useEffect(() => {
    if (conversationStarted && !isEditMode) {
      resetAll();
    }
  }, [selectedClient]);


  // ========================================
// BUILD UI PLACEHOLDERS FROM { } LIST
// ========================================

// ========================================
// BUILD UI PLACEHOLDERS ONLY IF EMPTY
// (Do NOT override backend-loaded placeholders)
// ========================================
useEffect(() => {
  // ⛔ If backend already loaded placeholders → DO NOT rebuild
  if (uiPlaceholders.length > 0) {
    return;
  }

  const keys = extractPlaceholders(masterPrompt);

  // Create minimal default items ONLY when no backend data exists
  setUiPlaceholders(
    keys.map((key, index) => ({
      placeholderKey: key,
      friendlyName: key.replace(/_/g, " "),
      category: "General",
      categorySequence: 99,
      placeholderSequence: index + 1,
      inputType: "text",
      options: [],
      uiSize: "md",
      isRichText: false,
      isExpandable: false,
      isRuntimeOnly: RUNTIME_ONLY_PLACEHOLDERS.includes(key),
    }))
  );


}, [masterPrompt]);



useEffect(() => {
  const main = sessionStorage.getItem("campaign_activeMainTab") as MainTab;
  const sub = sessionStorage.getItem("campaign_activeBuildTab") as BuildSubTab;

  if (main) setActiveMainTab(main);
  if (sub) setActiveBuildTab(sub);
}, []);

useEffect(() => {
  sessionStorage.setItem("campaign_activeMainTab", activeMainTab);
  sessionStorage.setItem("campaign_activeBuildTab", activeBuildTab);
}, [activeMainTab, activeBuildTab]);



// 🔒 ESSENTIAL placeholders ONLY (from masterPrompt)
const essentialPlaceholderKeys = React.useMemo(
  () => extractPlaceholders(masterPrompt),
  [masterPrompt]
);

const groupedPlaceholders = uiPlaceholders
  .sort((a, b) => {
    if (a.categorySequence !== b.categorySequence)
      return a.categorySequence - b.categorySequence;
    return a.placeholderSequence - b.placeholderSequence;
  })
  .filter(
    p =>
      !p.isRuntimeOnly &&
      essentialPlaceholderKeys.includes(p.placeholderKey)
  )
  .reduce<Record<string, PlaceholderDefinitionUI[]>>((acc, p) => {
    if (!acc[p.category]) {
      acc[p.category] = [];
    }
    acc[p.category].push(p);
    return acc;
  }, {});

const [initialExampleEmail, setInitialExampleEmail] = useState<string>("");
 useEffect(() => {
    const storedExample = sessionStorage.getItem("initialExampleEmail");
    if (storedExample) {
      setInitialExampleEmail(storedExample);
    }
  }, []);
const renderPlaceholderInput = (p: PlaceholderDefinitionUI) => {
  const key = p.placeholderKey;
  const value = formValues[key] ?? "";

  const baseStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
    background: "#fff"
  };

  switch (p.inputType) {
    

    case "richtext":
      return (
        <div className="flex w-full rich-text-editor">
          <div
            className="border border-gray-300 p-3 rounded w-full bg-gray-50"
            style={{ minHeight: "90px" }}
            dangerouslySetInnerHTML={{ __html: value }}
          />
        </div>
      );

    case "textarea":
      return (
        <div className='flex'>
          <textarea
            className='resize-y'
            value={value}
            onChange={e =>
              setFormValues(prev => ({
                ...prev,
                [key]: e.target.value
              }))
            }
            style={{ ...baseStyle, minHeight: "90px" }}
          />
        </div>
      );

    case "select":
      return (
        <div className='flex'>
          <select
            value={value}
            onChange={e =>
              setFormValues(prev => ({
                ...prev,
                [key]: e.target.value
              }))
            }
            style={baseStyle}
          >
            <option value="">-- Select --</option>
            {p.options?.map(opt => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );

    default:
      return (
        <div className='flex'>
          <input
            type="text"
            value={value}
            onChange={e =>
              setFormValues(prev => ({
                ...prev,
                [key]: e.target.value
              }))
            }
            style={baseStyle}
          />
        </div>
      );
  }
};



  // ====================================================================
  // START CONVERSATION
  // ====================================================================
  const startConversation = async () => {
    if (!effectiveUserId) {
      console.warn("⚠️ No client ID available — cannot start conversation.");
      return;
    }

    if (systemPrompt.trim() === "" || masterPrompt.trim() === "") {
      console.log("⏳ Template not ready yet — skipping manual alert.");
      return;
    }

    setMessages([]);
    setFinalPrompt("");
    setFinalPreviewText("");
    setPlaceholderValues({});
    setIsComplete(false);
    setConversationStarted(true);
    setActiveMainTab("build"); setActiveBuildTab("chat");
    setIsTyping(true);
    setExampleOutput("");

    const cleanAssistantMessage = (text: string): string => {
      if (!text) return "";
      return text
        .replace(/==PLACEHOLDER_VALUES_START==[\s\S]*?==PLACEHOLDER_VALUES_END==/g, "")
        .replace(/{\s*"status"[\s\S]*?}/g, "")
        .trim();
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/api/CampaignPrompt/chat`, {
        userId: effectiveUserId,
        message: masterPrompt,
        systemPrompt: systemPrompt,
        model: selectedModel, // ✅ Use selected model
      });

      // Dispatch credit update event after successful API call
      window.dispatchEvent(new CustomEvent('creditUpdated', {
        detail: { clientId: effectiveUserId }
      }));

      const data = response.data.response;
if (data?.usage || response.data?.usage) {
  const u = data?.usage ?? response.data.usage;

  const inTokens =
    u.promptTokens ?? u.prompt_tokens ?? u.inputTokens ?? 0;
  const outTokens =
    u.completionTokens ?? u.completion_tokens ?? u.outputTokens ?? 0;
  const cost = u.cost ?? u.totalCost ?? 0;

  setUsageInfo({
    promptTokens: inTokens,
    completionTokens: outTokens,
    cost,
  });

  setTotalUsage(prev => ({
    totalInput: prev.totalInput + inTokens,
    totalOutput: prev.totalOutput + outTokens,
    totalCalls: prev.totalCalls + 1,
    totalCost: prev.totalCost + cost,
  }));
}



      if (data) {
        // if it's already marked complete, only push completion message
        if (data.isComplete) {
          const completionMessage: Message = {
            type: "bot",
            content:
              "🎉 Great! I've filled in all elements. Select a contact and click 'Regenerate' to see the personalized email.",
            timestamp: new Date(),
          };
          setMessages([completionMessage]);
          setIsComplete(true);
          playNotificationSound();
        } else if (data.assistantText) {
          const cleanText = cleanAssistantMessage(data.assistantText);
          setMessages([{ type: "bot", content: cleanText, timestamp: new Date() }]);
          playNotificationSound();
        }
      }

    } catch (error) {
      console.error("❌ Error starting conversation:", error);
      const errorMessage: Message = {
        type: "bot",
        content: "Sorry, I couldn't start the conversation. Please check the API connection and try again.",
        timestamp: new Date(),
      };
      setMessages([errorMessage]);
      playNotificationSound();
    } finally {
      setIsTyping(false);
    }
  };


const handleSendMessage = async () => {
  if (currentAnswer.trim() === '' || isTyping || !effectiveUserId) return;

  // capture the user's text before we clear it
  const answerText = currentAnswer.trim();

  const userMessage: Message = {
    type: 'user',
    content: answerText,
    timestamp: new Date(),
  };


    // Prefer in-memory editTemplateId, fall back to session keys (newCampaignId or editTemplateId)
  const storedNewCampaignId = sessionStorage.getItem('newCampaignId');
  const storedEditTemplateId = sessionStorage.getItem('editTemplateId');

  const campaignTemplateIdCandidate = editTemplateId
    ?? (storedNewCampaignId ? Number(storedNewCampaignId) : null)
    ?? (storedEditTemplateId ? Number(storedEditTemplateId) : null);

  const campaignTemplateId = Number(campaignTemplateIdCandidate);
  // add user message to UI immediately
  setMessages((prev) => [...prev, userMessage]);

  // clear input AFTER capturing content
  setCurrentAnswer('');
  setIsTyping(true);

  try {
    const endpoint = isEditMode
      ? `${API_BASE_URL}/api/CampaignPrompt/edit/chat`
      : `${API_BASE_URL}/api/CampaignPrompt/chat`;

    const requestBody = isEditMode
      ? {
          userId: effectiveUserId,
          campaignTemplateId: campaignTemplateId,
          message: answerText,
          model: selectedModel,

        }
      : {
          userId: effectiveUserId,
          message: answerText,
          systemPrompt: '',
          model: selectedModel,
        };

    const response = await axios.post(endpoint, requestBody);
    
    // Dispatch credit update event after successful API call
    window.dispatchEvent(new CustomEvent('creditUpdated', {
      detail: { clientId: effectiveUserId }
    }));
    
    const data = response.data.response;
if (data?.usage || response.data?.usage) {
  const u = data?.usage ?? response.data.usage;

  const inTokens =
    u.promptTokens ?? u.prompt_tokens ?? u.inputTokens ?? 0;
  const outTokens =
    u.completionTokens ?? u.completion_tokens ?? u.outputTokens ?? 0;
  const cost = u.cost ?? u.totalCost ?? 0;

  setUsageInfo({
    promptTokens: inTokens,
    completionTokens: outTokens,
    cost,
  });

  setTotalUsage(prev => ({
    totalInput: prev.totalInput + inTokens,
    totalOutput: prev.totalOutput + outTokens,
    totalCalls: prev.totalCalls + 1,
    totalCost: prev.totalCost + cost,
  }));
}


    const cleanAssistantMessage = (text: string): string => {
      if (!text) return '';
      return text
        .replace(/==PLACEHOLDER_VALUES_START==[\s\S]*?==PLACEHOLDER_VALUES_END==/g, '')
        .replace(/{\s*"status"[\s\S]*?}/g, '')
        .trim();
    };

    // If the response contains assistantText, parse placeholders first
    let cleanText = '';
    if (data?.assistantText) {
      cleanText = cleanAssistantMessage(data.assistantText);

      // extract placeholder block if present
      const match = data.assistantText.match(
        /==PLACEHOLDER_VALUES_START==([\s\S]*?)==PLACEHOLDER_VALUES_END==/
      );

      if (match) {
        const placeholderBlock = match[1] || '';
        const parsedPlaceholders: Record<string, string> = {};
        const kvRegex = /\{([^}]+)\}\s*=\s*([\s\S]*?)(?=\r?\n\{[^}]+\}\s*=|\r?\n==PLACEHOLDER_VALUES_END==|$)/g;
        let m: RegExpExecArray | null;
        while ((m = kvRegex.exec(placeholderBlock)) !== null) {
          const key = m[1].trim();
          let value = m[2] ?? '';
          value = value.replace(/^\r?\n/, '').replace(/\s+$/, '');
          parsedPlaceholders[key] = value;
        }

        // split current placeholders into conversation/contact
        const currentConversationValues = getConversationPlaceholders(placeholderValues);
        const currentContactValues = getContactPlaceholders(placeholderValues);
        const updatedConversationValues = { ...currentConversationValues };

        // Object.entries(parsedPlaceholders).forEach(([key, value]) => {
        //   if (!CONTACT_PLACEHOLDERS.includes(key)) {
        //     updatedConversationValues[key] = value;
        //   }
        // });

        const essentialKeys = extractPlaceholders(masterPrompt);

        Object.entries(parsedPlaceholders).forEach(([key, value]) => {
          if (
            essentialKeys.includes(key) &&
            !CONTACT_PLACEHOLDERS.includes(key)
          ) {
            updatedConversationValues[key] = value;
          }
        });


        // merge for display once (removed duplicate call)
        const mergedForDisplay = getMergedPlaceholdersForDisplay(updatedConversationValues, currentContactValues);
        setPlaceholderValues(mergedForDisplay);
        console.log('📦 Updated conversation elements:', Object.keys(updatedConversationValues));

        // Save conversation placeholders to DB (if campaign exists)
        const storedId = sessionStorage.getItem('newCampaignId');
        const activeCampaignId = editTemplateId ?? (storedId ? Number(storedId) : null);

        if (activeCampaignId) {
          try {
            await axios.post(`${API_BASE_URL}/api/CampaignPrompt/template/update`, {
              id: activeCampaignId,
              placeholderValues: updatedConversationValues, // only conversation placeholders
            });
             reloadCampaignBlueprint();
            console.log('💾 Saved conversation elements to DB (no auto-generation)');
          } catch (err) {
            console.warn('⚠️ Failed to save elements:', err);
          }
        }
      }
    }

    // ----------------------------
    // Completion handling: IMPORTANT
    // ----------------------------
    if (data?.isComplete) {
      // push only the friendly completion message (do not push the raw assistantText)
      const completionMessage: Message = {
        type: 'bot',
        content: "🎉 Great! I've filled in all elements. Select a contact and click 'Regenerate' to see the personalized email.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, completionMessage]);
      setIsComplete(true);
      await reloadCampaignBlueprint();
      playNotificationSound();

      // If edit-mode finalization is required, run it (use answerText)
      if (isEditMode && selectedPlaceholder && answerText) {
        try {
          await finalizeEditPlaceholder(selectedPlaceholder, answerText);
        } catch (err) {
          console.warn('⚠️ finalizeEditelement failed:', err);
        }
      }

      setIsTyping(false);
      return; // stop here (no further bot message)
    }

    // Normal (non-complete) flow: append clean assistant message if present
    if (cleanText) {
      const botMessage: Message = {
        type: 'bot',
        content: cleanText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      await reloadCampaignBlueprint();
      playNotificationSound();
    }


  } catch (error) {
    console.error('❌ Error sending message:', error);
    const errorMessage: Message = {
      type: 'bot',
      content: 'Sorry, there was an error. Please try again.',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, errorMessage]);
  } finally {
    setIsTyping(false);
  }
};


  // ====================================================================
  // UPDATE TEMPLATE IN DATABASE (UNUSED - Can be removed if not needed)
  // ====================================================================
  const updateTemplateInDatabase = async (updatedPlaceholderValues: Record<string, string>) => {
    if (!editTemplateId || !originalTemplateData) return;

    try {
      // ✅ Only use conversation placeholders for database update
      const conversationOnly = getConversationPlaceholders(updatedPlaceholderValues);

      const response = await axios.post(`${API_BASE_URL}/api/CampaignPrompt/template/update`, {
        id: editTemplateId,
        placeholderValues: conversationOnly, // ✅ Only conversation placeholders
        selectedModel: selectedModel,
      });


      if (!response.data.success) {
        throw new Error('Failed to update template');
      }
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  };

  // ====================================================================
  // HANDLE KEY PRESS
  // ====================================================================
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ====================================================================
  // COPY TO CLIPBOARD
  // ====================================================================
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ====================================================================
  // RESET ALL
  // ====================================================================
  const resetAll = () => {
    if (isEditMode) return;

    if (effectiveUserId) {
      axios.post(`${API_BASE_URL}/api/CampaignPrompt/history/${effectiveUserId}/clear`)
        .catch(err => console.error("Failed to clear history:", err));
    }

    clearAllSessionData();

    //setIsEditMode(false);
    setOpenedFromTemplateEdit(false); // ✅ IMPORTANT

    setEditTemplateId(null);
    setOriginalTemplateData(null);
    setSelectedPlaceholder("");
    setSelectedTemplateDefinitionId(null);
    setTemplateName("");

    setMessages([]);
    setFinalPrompt('');
    setFinalPreviewText('');
    setPlaceholderValues({});
    setIsComplete(false);
    setConversationStarted(false);
    setSystemPrompt("");
    setSystemPromptForEdit("");
    setMasterPrompt("");
    setMasterPromptExtensive("");
    setPreviewText("");
    setSelectedModel("gpt-5");
    setActiveMainTab("build");
    setActiveBuildTab("chat");  
  };
  const [userRole, setUserRole] = useState<string>(""); // Store user role

  // ====================================================================
  // CURRENT PLACEHOLDERS
  // ====================================================================
  const currentPlaceholders = extractPlaceholders(masterPrompt);
  useEffect(() => {
    const isAdminString = sessionStorage.getItem("isAdmin");
    const isAdmin = isAdminString === "true"; // Correct comparison
    setUserRole(isAdmin ? "ADMIN" : "USER");
  }, []);


const [instructionSubTab, setInstructionSubTab] = useState<
  "ai_new" 
  | "ai_edit" 
  | "placeholder_short" 
  | "placeholders" 
  | "ct"
  | "subject_instructions"   // ⭐ NEW
>("ai_new");



  const isEditingDefinition = selectedTemplateDefinitionId !== null;

  const createNewInstruction = () => {
    setSelectedTemplateDefinitionId(null);   // remove dropdown selection
    setTemplateName("");
    setSystemPrompt("");
    setSystemPromptForEdit("");
    setMasterPrompt("");
    setMasterPromptExtensive("");
    setPreviewText("");

    // Clear conversation-related saved session
    sessionStorage.removeItem("campaign_system_prompt");
    sessionStorage.removeItem("campaign_system_prompt_edit");
    sessionStorage.removeItem("campaign_master_prompt");
    sessionStorage.removeItem("campaign_master_prompt_extensive");
    sessionStorage.removeItem("campaign_preview_text");
    sessionStorage.removeItem("campaign_template_name");

    // Optional: Show toast
    console.log("✨ Starting new instruction from scratch");
  };

  const deleteTemplateDefinition = async () => {
    if (!selectedTemplateDefinitionId) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this template definition? This cannot be undone."
    );

    if (!confirmDelete) return;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/CampaignPrompt/template-definition/${selectedTemplateDefinitionId}/deactivate`
      );

      showModal("Success","Template deleted successfully.");

      // Reset UI state
      setSelectedTemplateDefinitionId(null);
      setTemplateName("");
      setSystemPrompt("");
      setSystemPromptForEdit("");
      setMasterPrompt("");
      setMasterPromptExtensive("");
      setPreviewText("");

      // Reload list
      loadTemplateDefinitions();

    } catch (error) {
      console.error("Delete failed:", error);
      showModal("error","Failed to delete template definition.");
    }
  };
  // ensure you import useEffect at top


const reloadCampaignBlueprint = async () => {
  try {
    const storedId = sessionStorage.getItem("newCampaignId");
    const id = editTemplateId ?? (storedId ? Number(storedId) : null);

    if (!id) return;

    const res = await axios.get(`${API_BASE_URL}/api/CampaignPrompt/campaign/${id}`);
    const data = res.data;

    // Update example output
    if (data.exampleOutput) {
      setExampleOutput(data.exampleOutput);
    } 

    // Update placeholders
    if (data.placeholderValues) {
      const conversationOnly = getConversationPlaceholders(data.placeholderValues);
      const contactOnly = getContactPlaceholders(placeholderValues);

      setPlaceholderValues({
        ...conversationOnly,
        ...contactOnly
      });
    }

    // Update blueprint
    if (data.campaignBlueprint) {
      setCampaignBlueprint(data.campaignBlueprint);
    }

  } catch (err) {
    console.error("Failed to reload blueprint:", err);
  }
};



const [expandedPlaceholder, setExpandedPlaceholder] = useState<{
  key: string;
  friendlyName: string;
} | null>(null);

const editorRef = useRef<HTMLDivElement | null>(null);

const saveExpandedContent = () => {
  if (!expandedPlaceholder || !editorRef.current) return;

  setFormValues(prev => ({
    ...prev,
    [expandedPlaceholder.key]: editorRef.current?.innerHTML ?? ""
  }));
};






function SimpleTextarea({
  value,
  onChange,
  className = "instruction-textarea",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      defaultValue={value}
      onBlur={(e) => onChange && onChange(e)}
      className={className}
      style={{
        width: "100%",
        minHeight: "50000px",
        maxHeight: "1000px",
        overflowY: "auto",
        resize: "vertical",
        padding: "10px",
        fontSize: "14px",
        border: "1px solid #ccc",
        borderRadius: "6px",
        background: "#fff",
      }}
      {...props}
    />
  );
}

const movePlaceholder = (key: string, direction: "up" | "down") => {
  setUiPlaceholders(prev => {
    const current = prev.find(p => p.placeholderKey === key);
    if (!current) return prev;

    const category = current.category;

    // 1️⃣ Get placeholders only inside this category
    const sameCategory = prev
      .filter(p => p.category === category)
      .sort((a, b) => a.placeholderSequence - b.placeholderSequence);

    // 2️⃣ Find index inside category block
    const idx = sameCategory.findIndex(p => p.placeholderKey === key);

    if (idx === -1) return prev;

    // 3️⃣ Move inside category
    if (direction === "up" && idx > 0) {
      [sameCategory[idx - 1], sameCategory[idx]] = 
        [sameCategory[idx], sameCategory[idx - 1]];
    }

    if (direction === "down" && idx < sameCategory.length - 1) {
      [sameCategory[idx], sameCategory[idx + 1]] =
        [sameCategory[idx + 1], sameCategory[idx]];
    }

    // 4️⃣ Reassign NEW placeholderSequence inside this category only
    sameCategory.forEach((p, i) => {
      p.placeholderSequence = i + 1;
    });

    // 5️⃣ Merge back into full UI list
    return prev.map(p =>
      p.category === category
        ? sameCategory.find(x => x.placeholderKey === p.placeholderKey)!
        : p
    );
  });
};


const categoryList = React.useMemo(() => {
  const map = new Map<string, number>();

  uiPlaceholders.forEach(p => {
    map.set(p.category, p.categorySequence ?? 999);
  });

  return Array.from(map.entries())
    .map(([name, seq]) => ({ name, seq }))
    .sort((a, b) => a.seq - b.seq);
}, [uiPlaceholders]);


const moveCategory = (category: string, direction: "up" | "down") => {
  setUiPlaceholders(prev => {

    // 1️⃣ Build clean category list with FIXED default sequences
    let categories = Array.from(new Set(prev.map(p => p.category)));

    // Assign proper sequential numbers (1,2,3...)
    let categorySeqList = categories.map((cat, idx) => ({
      name: cat,
      seq: prev.find(p => p.category === cat)?.categorySequence ?? (idx + 1)
    }));

    // 2️⃣ Sort by sequence
    categorySeqList.sort((a, b) => a.seq - b.seq);

    // 3️⃣ Find target category index
    const index = categorySeqList.findIndex(c => c.name === category);
    if (index === -1) return prev;

    // 4️⃣ Swap UP
    if (direction === "up" && index > 0) {
      const tmp = categorySeqList[index - 1].seq;
      categorySeqList[index - 1].seq = categorySeqList[index].seq;
      categorySeqList[index].seq = tmp;
    }

    // 5️⃣ Swap DOWN
    if (direction === "down" && index < categorySeqList.length - 1) {
      const tmp = categorySeqList[index + 1].seq;
      categorySeqList[index + 1].seq = categorySeqList[index].seq;
      categorySeqList[index].seq = tmp;
    }

    // 6️⃣ Normalize sequences again (1,2,3…)
    categorySeqList = categorySeqList
      .sort((a, b) => a.seq - b.seq)
      .map((c, idx) => ({ ...c, seq: idx + 1 }));

    // 7️⃣ Apply NEW sequence numbers to each placeholder
    return prev.map(p => ({
      ...p,
      categorySequence:
        categorySeqList.find(c => c.name === p.category)?.seq ?? p.categorySequence
    }));
  });
};


  // ====================================================================
  // RENDER
  // ====================================================================
return (
  <div className="email-campaign-builder !p-[0]">
    {/* ================= TOP TABS ================= */}
    

                    <div className="sticky-tabs">
  <ul className="flex items-center gap-6">
    {/* LEFT TABS */}

                      {/* ================= ADMIN USAGE PANEL ================= */}
{userRole === "ADMIN" && usageInfo && (
  <div style={{
    marginTop: "4px",
    padding: "6px 10px",
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    fontSize: "11px",
    lineHeight: "1.3",
    display: "inline-block",
  }}>
    
    {/* Last Call */}
    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
      <strong>Last:</strong>
      <span>In {usageInfo.promptTokens ?? 0}</span>
      <span>Out {usageInfo.completionTokens ?? 0}</span>
      <span>💲{(usageInfo.cost ?? 0).toFixed(6)}</span>
    </div>

    {/* Total */}
    {totalUsage.totalCost > 0 && (
      <div style={{
        marginTop: "2px",
        display: "flex",
        gap: "10px",
        flexWrap: "wrap",
      }}>
        <strong>Total:</strong>
        <span>In {totalUsage.totalInput}</span>
        <span>Out {totalUsage.totalOutput}</span>
        <span>💲{totalUsage.totalCost.toFixed(6)}</span>
      </div>
    )}

  </div>
)}

        {userRole === "ADMIN" && (

    <div className="flex items-center gap-2">
      {["build", "instructions"].map((t) => (
        <li key={t}>
          <button
            className={activeMainTab === t ? "active" : ""}
            onClick={() => setActiveMainTab(t as any)}
          >
            {t === "build" ? "Build" : "Instructions set"}
          </button>
        </li>
      ))}

      {/* VT TAB */}
      <li>
        <button
          className={activeMainTab === "ct" ? "active" : ""}
          onClick={() => setActiveMainTab("ct")}
        >
          VT
        </button>
      </li>
    </div>
        )}
    {/* RIGHT SIDE — Notifications */}
    <li className="flex items-center gap-0 cursor-pointer">
      <span
        style={{ color: "#3f9f42", fontWeight: 500 }}
       title={soundEnabled ? "Notifications ON" : "Notifications OFF"}
          onClick={toggleNotifications}
      >
        🔔 
      </span>

      <img
        src={soundEnabled  ? toggleOn : toggleOff}
        alt="Notifications Toggle"
        style={{
          height: "24px",
          width: "42px",
          objectFit: "contain",
        }}
        onClick={toggleNotifications}
      />
    </li>
  </ul>
                  


                  </div>



    
    {/* ================= LOADING OVERLAYS ================= */}
    {isLoadingTemplate && (
      <div className="loading-overlay">
        <div className="loading-content">
          <Loader2 size={48} className="spinning" />
          <p>Loading template for editing...</p>
        </div>
      </div>
    )}

    {isLoadingDefinitions && (
      <div className="loading-overlay">
        <div className="loading-content flex flex-col items-center gap-[5px]">
          <Loader2 size={48} className="spinning" />
          <p>Loading template definitions...</p>
        </div>
      </div>
    )}

      {/* ================= MAIN CONTAINER ================= */}
      <div
        className="campaign-builder-container !p-[0]"
      >
        <div className="campaign-builder-mains">
          

        <PopupModal
          open={popupmodalInfo.open}
          title={popupmodalInfo.title}
          message={popupmodalInfo.message}
          onClose={closeModal}
        />

          {/* ================= BUILD TAB ================= */}
          {activeMainTab === "build" && (
            <>


              {/* ================= SPLIT LAYOUT ================= */}
              <div className='flex gap-4 h-[calc(100vh-200px)] mt-[10px]'>
                {/* RIGHT: Show Preview Button (only when closed) */}
                <div className="absolute right-[0] top-[8] z-[100]">
                  <button
                    className="show-preview-btn !rounded-[4px]"
                    onClick={() => setIsSectionOpen(!isSectionOpen)}
                  >
                    <span className='flex items-center gap-[5px]'>
                      <FontAwesomeIcon
                        icon={isSectionOpen ?  faAngleRight:faAngleLeft }
                        className="text-[#ffffff] text-md"
                      />
                      <span>{isSectionOpen ? "Hide" : "Show" } email preview</span>
                    </span>
                  </button>
                </div>
                {/* ================= LEFT PANEL ================= */}
                <div
                  style={{
                    flex: 1,
                    width: isSectionOpen ? "50%" : "100%",
                    transition: "all 0.25s ease",
                  }}
                >
                  {/* ================= BUILD SUBTAB HEADER ROW ================= */}
                  <div className="build-subtabs-row !pb-[0]">
                    {/* LEFT: Chat / Elements tabs */}
                    <div className="build-subtabs !gap-[0]">
                      {["chat", "elements"].map((t) => (
                        <button
                          key={t}
                          className={activeBuildTab === t ? "active" : ""}
                          onClick={() => setActiveBuildTab(t as any)}
                        >
                          {t === "chat" ? "Chat" : "Elements"}
                        </button>
                      ))}
                    </div>

                    

                  </div>
        {activeBuildTab === "chat" && (
          <ConversationTab
            conversationStarted={conversationStarted}
            messages={messages}
            isTyping={isTyping}
            isComplete={isComplete}
            currentAnswer={currentAnswer}
            setCurrentAnswer={setCurrentAnswer}
            handleSendMessage={handleSendMessage}
            handleKeyPress={handleKeyPress}
            resetAll={resetAll}
            isEditMode={isEditMode}
            availablePlaceholders={extractPlaceholders(masterPrompt)}
            placeholderValues={placeholderValues}
            onPlaceholderSelect={startEditConversation}
            selectedPlaceholder={selectedPlaceholder}
            exampleOutput={exampleOutput}
            regenerateExampleOutput={regenerateExampleOutput}
            dataFiles={dataFiles}
            contacts={contacts}
            selectedDataFileId={selectedDataFileId}
            selectedContactId={selectedContactId}
            handleSelectDataFile={handleSelectDataFile}
            setSelectedContactId={setSelectedContactId}
            applyContactPlaceholders={applyContactPlaceholders}
            searchResults={searchResults}
            allSourcedData={allSourcedData}
            sourcedSummary={sourcedSummary}
            filledTemplate={filledTemplate}
            groupedPlaceholders={groupedPlaceholders}
            initialExampleEmail={initialExampleEmail}
          />
        )}

        {activeBuildTab === "elements" && (
          <ElementsTab
            groupedPlaceholders={groupedPlaceholders}
            formValues={formValues}
            setFormValues={setFormValues}
            setExpandedKey={(key, friendlyName) =>
              setExpandedPlaceholder({ key, friendlyName })
            }
            saveAllPlaceholders={saveAllPlaceholders}
            dataFiles={dataFiles}
            contacts={contacts}
            selectedDataFileId={selectedDataFileId}
            selectedContactId={selectedContactId}
            handleSelectDataFile={handleSelectDataFile}
            setSelectedContactId={setSelectedContactId}
            applyContactPlaceholders={applyContactPlaceholders}
            renderPlaceholderInput={renderPlaceholderInput}
          />
        )}
      </div>

                {/* ================= RIGHT PANEL (EMAIL PREVIEW) ================= */}
                {isSectionOpen && (
                  <div
                    style={{
                      flex: 1,
                      width: "50%",
                      paddingLeft: "12px",
                      position: "relative",
                    }}
                  >

                    <div className="flex justify-between min-h-[44px]">
                      <h3 className="font-[600] flex items-center">Email preview</h3>
                    </div>

                     

                    {/* Collapse Button */}
                    {/* <button
                      onClick={() => setIsSectionOpen(false)}
                      title="Collapse preview"
                      style={{
                        position: "absolute",
                        top: "12px",
                        left: "-14px",
                        zIndex: 20,
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        border: "1px solid #d1d5db",
                        background: "#fff",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      <FontAwesomeIcon
                          icon={faAngleRight}
                          className="text-[#333333] text-[30px]"
                        />
                    </button> */}

          <ExampleOutputPanel
            dataFiles={dataFiles}
            contacts={contacts}
            selectedDataFileId={selectedDataFileId}
            selectedContactId={selectedContactId}
            handleSelectDataFile={handleSelectDataFile}
            setSelectedContactId={setSelectedContactId}
            applyContactPlaceholders={applyContactPlaceholders}
            exampleOutput={exampleOutput}
            editableExampleOutput={editableExampleOutput}
            setEditableExampleOutput={setEditableExampleOutput}
            saveExampleEmail={saveExampleEmail}
            isGenerating={isPreviewLoading}
            regenerateExampleOutput={regenerateExampleOutput}
            currentPage={currentPage}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            setCurrentPage={setCurrentPage}
            setPageSize={setPageSize}
            activeMainTab={previewTab}
            setActiveMainTab={setPreviewTab}
            activeSubStageTab={previewSubTab}
            setActiveSubStageTab={setPreviewSubTab}
            filledTemplate={filledTemplate}
            searchResults={searchResults}
            allSourcedData={allSourcedData}
            sourcedSummary={sourcedSummary}
            isPreviewAllowed={isPreviewAllowed}

          />
        </div>
      )}
    </div>
  </>
)}


        {/* ================= INSTRUCTIONS TAB ================= */}
 {activeMainTab === "instructions" && (
              <div className="instructions-wrapper ">

                {/* =======================================================
                    TOP HEADER SECTION (Picklist + Inputs + Buttons)
                 ======================================================== */}
                <div className="instructions-header !px-[0]">

                  {/* Load Template Definition */}
                  <div className="load-template-box">
                    <label className="section-label">Load existing template definition</label>
                    <select
                      className="definition-select"
                      value={selectedTemplateDefinitionId || ""}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        if (id) loadTemplateDefinitionById(id);

                      }}
                    >
                      <option value="">-- Select a template definition --</option>
                      {templateDefinitions.map((def) => (
                        <option key={def.id} value={def.id}>
                          {def.templateName} (Used {def.usageCount} times)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="input-row">
                    {/* Template Name */}
                    <div className="template-name-box">
                      <label className="section-label">Template name</label>
                      <input
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Enter template name"
                        className="text-input"
                      />
                    </div>

        {/* Model Picker */}
        <div className="model-select-box">
          <label className="section-label">Select GPT model</label>
          <select
            className="definition-select"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            {availableModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="search-count-box">
  <label className="section-label">Search URL count</label>
  <select
    className="definition-select"
    value={searchURLCount}
    onChange={(e) => setSearchURLCount(Number(e.target.value))}
  >
    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
      <option key={n} value={n}>{n}</option>
    ))}
  </select>
</div>

                    {/* Save + Start Buttons */}
                    <div className="button-row">
                      {/* Save new definition */}
                      {/* Save new template definition */}
                      {selectedTemplateDefinitionId === null && (
                        <button
                          className="save-btn"
                          onClick={saveTemplateDefinition}
                          disabled={isSavingDefinition}
                        >
                          {isSavingDefinition ? "Saving..." : "Save template definition"}
                        </button>
                      )}

                      {/* Update existing template */}
                      {selectedTemplateDefinitionId !== null && (
                        <button
                          className="save-btn"
                          style={{ background: "#2563eb" }}
                          onClick={updateTemplateDefinition}
                          disabled={isSavingDefinition}
                        >
                          {isSavingDefinition ? "Updating..." : "Update template definition"}
                        </button>
                      )}


                      <button
                        className="start-btn"
                        onClick={startConversation}
                        disabled={!selectedTemplateDefinitionId}
                      >
                        Start filling placeholders →
                      </button>
                      <button
                        className="new-btn"
                        onClick={createNewInstruction}
                      >
                        + New instruction
                      </button>
                    </div>
                    {selectedTemplateDefinitionId !== null && (
                      <button
                        className="delete-btn"
                        style={{ background: "#dc2626", color: "white" }}
                        onClick={deleteTemplateDefinition}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* =======================================================
       INTERNAL SUB-TABS
    ======================================================== */}
    <div className="instruction-subtabs">
      {[
        ["ai_new", "AI instructions (new blueprint)"],
        ["ai_edit", "AI instructions (edit blueprint)"],
        ["placeholder_short", "Placeholders list (essential)"],
        ["placeholders", "Placeholder manager"],
        ["ct", "UT "],
        ["subject_instructions", "Email subject instructions"]

      ].map(([key, label]) => (
        <button
          key={key}
          className={`subtab-btn ${instructionSubTab === key ? "active" : ""}`}
          onClick={() => setInstructionSubTab(key as any)}
        >
          {label}
        </button>
      ))}
    </div>


                {/* =======================================================
    INTERNAL TAB CONTENT
======================================================= */}
<div className="instruction-subtab-content">

  {instructionSubTab === "ai_new" && (
    <SimpleTextarea
      value={systemPrompt}
      onChange={(e: any) => setSystemPrompt(e.target.value)}
      placeholder="AI instructions (new blueprint)..."
    />
  )}

  {instructionSubTab === "ai_edit" && (
    <SimpleTextarea
      value={systemPromptForEdit}
      onChange={(e: any) => setSystemPromptForEdit(e.target.value)}
      placeholder="AI instructions (edit blueprint)..."
    />
  )}

  {instructionSubTab === "placeholder_short" && (
    <SimpleTextarea
      value={masterPrompt}
      onChange={(e: any) => setMasterPrompt(e.target.value)}
      placeholder="Short placeholder list..."
    />
  )}

{instructionSubTab === "placeholders" && (
  <div
    style={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      padding: "20px"
    }}
  >
    <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>
      Placeholder manager
    </h3>

    {/* HEADER */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 2fr 2fr 2fr 1fr 1fr 60px",
        gap: "10px",
        fontWeight: 600,
        fontSize: "13px",
        color: "#374151",
        marginBottom: "10px"
      }}
    >
      <div>Placeholder</div>
      <div>Friendly name</div>
      <div>Category</div>
      <div>Input / Options</div>
      <div>Size</div>
      <div>Expand</div>
      <div></div>
    </div>

    {/* ======================================================
        CATEGORY GROUPS (replaces the old uiPlaceholders.map)
       ====================================================== */}
    {categoryList.map((cat) => (
      <div key={cat.name} style={{ marginBottom: "20px" }}>
        
        {/* CATEGORY HEADER */}
        <div
          style={{
            fontWeight: 700,
            fontSize: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            margin: "12px 0 8px 0",
            borderBottom: "1px solid #e5e7eb",
            paddingBottom: "6px"
          }}
        >
          <span>{cat.name}</span>

          <div style={{ display: "flex", gap: "6px" }}>
            <button
              style={{
                padding: "4px 8px",
                borderRadius: "6px",
                background: "#e5e7eb",
                cursor: "pointer"
              }}
              onClick={() => moveCategory(cat.name, "up")}
            >
              ↑
            </button>

            <button
              style={{
                padding: "4px 8px",
                borderRadius: "6px",
                background: "#e5e7eb",
                cursor: "pointer"
              }}
              onClick={() => moveCategory(cat.name, "down")}
            >
              ↓
            </button>
          </div>
        </div>

        {/* ===== PLACEHOLDERS UNDER THIS CATEGORY ===== */}
        {uiPlaceholders
          .filter((p) => p.category === cat.name)
          .sort((a, b) => a.placeholderSequence - b.placeholderSequence)
          .map((p) => (
            <div
              key={p.placeholderKey}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 2fr 2fr 2fr 1fr 1fr 60px",
                gap: "10px",
                alignItems: "center",
                marginBottom: "10px"
              }}
            >
              {/* Placeholder Key */}
              <strong>{`{${p.placeholderKey}}`}</strong>

              {/* Friendly Name */}
              <input
                value={p.friendlyName}
                onChange={(e) => {
                  const v = e.target.value;
                  setUiPlaceholders((prev) =>
                    prev.map((x) =>
                      x.placeholderKey === p.placeholderKey
                        ? { ...x, friendlyName: v }
                        : x
                    )
                  );
                }}
                className="text-input"
              />

              {/* Category */}
              <select
                value={p.category}
                onChange={(e) => {
                  const v = e.target.value;
                  setUiPlaceholders((prev) =>
                    prev.map((x) =>
                      x.placeholderKey === p.placeholderKey
                        ? { ...x, category: v }
                        : x
                    )
                  );
                }}
                className="definition-select"
              >
                <option>YOUR COMPANY</option>
                <option>CORE MESSAGE FOCUS</option>
                <option>DOS AND DON'TS</option>
                <option>MESSAGE WRITING STYLE</option>
                <option>CALL-TO-ACTION</option>
                <option>GREETINGS & FAREWELLS</option>
                <option>SUBJECT LINE</option>
                <option>EXTRA VISUALS</option>
                <option>EXTRA ASSETS</option>

              </select>

              {/* INPUT TYPE + OPTIONS */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <select
                  value={p.inputType}
                  onChange={(e) => {
                    const v = e.target.value as any;
                    setUiPlaceholders((prev) =>
                      prev.map((x) =>
                        x.placeholderKey === p.placeholderKey
                          ? {
                              ...x,
                              inputType: v,
                              isRichText: v === "richtext",
                              isExpandable: v === "richtext" ? x.isExpandable : false,
                              options: v === "select" ? x.options || [] : []
                            }
                          : x
                      )
                    );
                  }}
                  className="definition-select"
                >
                  <option value="text">Text</option>
                  <option value="textarea">Textarea</option>
                  <option value="richtext">Rich text</option>
                  <option value="select">Dropdown</option>
                </select>

                {/* Option editor */}
                {p.inputType === "select" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {(p.options || []).map((opt, idx) => (
                      <div
                        key={idx}
                        style={{ display: "flex", gap: "6px", alignItems: "center" }}
                      >
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const newVal = e.target.value;
                            setUiPlaceholders((prev) =>
                              prev.map((x) =>
                                x.placeholderKey === p.placeholderKey
                                  ? {
                                      ...x,
                                      options: x.options?.map((o, i) =>
                                        i === idx ? newVal : o
                                      )
                                    }
                                  : x
                              )
                            );
                          }}
                          className="text-input"
                          style={{ fontSize: "12px" }}
                        />

                        <button
                          onClick={() => {
                            setUiPlaceholders((prev) =>
                              prev.map((x) =>
                                x.placeholderKey === p.placeholderKey
                                  ? {
                                      ...x,
                                      options: x.options?.filter((_, i) => i !== idx)
                                    }
                                  : x
                              )
                            );
                          }}
                          style={{
                            background: "#ef4444",
                            color: "#fff",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            border: "none",
                            cursor: "pointer"
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={() => {
                        setUiPlaceholders((prev) =>
                          prev.map((x) =>
                            x.placeholderKey === p.placeholderKey
                              ? { ...x, options: [...(x.options || []), ""] }
                              : x
                          )
                        );
                      }}
                      style={{
                        marginTop: "4px",
                        border: "1px dashed #9ca3af",
                        padding: "6px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        background: "#e5e7eb"
                      }}
                    >
                      ➕ Add option
                    </button>
                  </div>
                )}
              </div>

              {/* UI Size */}
              <select
                value={p.uiSize}
                onChange={(e) => {
                  const v = e.target.value as "sm" | "md" | "lg" | "xl";  // FIXED
                  setUiPlaceholders(prev =>
                    prev.map(x =>
                      x.placeholderKey === p.placeholderKey
                        ? { ...x, uiSize: v }
                        : x
                    )
                  );
                }}
                className="definition-select"
              >
                <option value="sm">SM</option>
                <option value="md">MD</option>
                <option value="lg">LG</option>
                <option value="xl">XL</option>
              </select>


              {/* Expand toggle */}
              <label style={{ display: "flex", justifyContent: "center" }}>
                <input
                  type="checkbox"
                  checked={!!p.isExpandable}
                  disabled={p.inputType !== "richtext"}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setUiPlaceholders((prev) =>
                      prev.map((x) =>
                        x.placeholderKey === p.placeholderKey
                          ? {
                              ...x,
                              isExpandable: checked,
                              isRichText: checked || x.isRichText
                            }
                          : x
                      )
                    );
                  }}
                />
              </label>

              {/* Placeholder move buttons */}
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    background: "#e5e7eb",
                    cursor: "pointer"
                  }}
                  onClick={() => movePlaceholder(p.placeholderKey, "up")}
                >
                  ↑
                </button>

                <button
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    background: "#e5e7eb",
                    cursor: "pointer"
                  }}
                  onClick={() => movePlaceholder(p.placeholderKey, "down")}
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
      </div>
    ))}

    {/* Save button */}
    <div style={{ marginTop: "20px", textAlign: "right" }}>
      <button
        onClick={savePlaceholderDefinitions}
        style={{
          padding: "10px 18px",
          background: "#3f9f42",
          color: "#fff",
          borderRadius: "6px",
          fontWeight: 600
        }}
      >
        Save placeholder settings
      </button>
    </div>
  </div>
)}





  {instructionSubTab === "ct" && (
    <SimpleTextarea
      value={previewText}
      onChange={(e: any) => setPreviewText(e.target.value)}
      placeholder="Unpopulated master template..."
    />
  )}

  {instructionSubTab === "subject_instructions" && (
    <SimpleTextarea
      value={subjectInstructions}
      onChange={(e: any) => setSubjectInstructions(e.target.value)}
      placeholder="Enter instructions for generating email subject..."
    />
  )}

</div>



              </div>
            )}




        {/* ================= VT TAB ================= */}
        {activeMainTab === "ct" && (
          <div className="ct-tab-container mt-[6px]">
            <h3>Live vendor blueprint (Auto updated)</h3>
            <SimpleTextarea
              value={campaignBlueprint}
              onChange={(e: any) => setCampaignBlueprint(e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
          {/* ================= EXPANDED PLACEHOLDER MODAL ================= */}
      {expandedPlaceholder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <div
            style={{
              width: "80%",
              maxWidth: "900px",
              background: "#fff",
              borderRadius: "10px",
              padding: "20px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)"
            }}
          >
            {/* HEADER */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px"
              }}
            >
              <h3 style={{ fontSize: "18px", fontWeight: 600 }}>
                {expandedPlaceholder.friendlyName}
              </h3>

              <button
                onClick={() => setExpandedPlaceholder(null)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "20px",
                  cursor: "pointer"
                }}
              >
                ✕
              </button>
            </div>

            {/* RICH TEXT EDITOR */}
            <ExampleEmailEditor
              value={formValues[expandedPlaceholder.key] || ""}
              onChange={(val) =>
                setFormValues(prev => ({
                  ...prev,
                  [expandedPlaceholder.key]: val
                }))
              }
            />

            {/* FOOTER */}
            <div style={{ textAlign: "right", marginTop: "12px" }}>
              <button
                onClick={() => setExpandedPlaceholder(null)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  background: "#2563eb",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}



  </div>
);

};

export default MasterPromptCampaignBuilder;

