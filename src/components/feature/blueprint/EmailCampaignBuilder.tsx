import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
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
  chatEndRef: React.Ref<HTMLDivElement>;
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

const TemplateTab: React.FC<TemplateTabProps> = ({
  masterPrompt, setMasterPrompt,
  masterPromptExtensive, setMasterPromptExtensive,
  systemPrompt, setSystemPrompt,
  systemPromptForEdit, setSystemPromptForEdit,
  previewText, setPreviewText,
  startConversation, currentPlaceholders,
  extractPlaceholders, selectedModel,
  setSelectedModel, availableModels,
  saveTemplateDefinition, isSavingDefinition,
  saveDefinitionStatus, templateDefinitions,
  loadTemplateDefinition, selectedTemplateDefinitionId,
  templateName, setTemplateName
}) => {
  return (
    <div className="template-tab">
      {/* ✅ NEW - Template Definition Selector */}
      <div className="template-definition-section">
        <div className="template-section">
          <h2>📋 Load Existing Template Definition</h2>
          <p>Select a saved template definition to auto-fill all fields below.</p>
        </div>
        <div className="template-definition-selector">
          {templateDefinitions.length > 0 ? (
            <select
              className="template-definition-dropdown"
              onChange={(e) => {
                const id = parseInt(e.target.value);
                if (id > 0) loadTemplateDefinition(id);
              }}
              value={selectedTemplateDefinitionId || ''}
            >
              <option value="">-- Select a template definition --</option>
              {templateDefinitions.map((def) => (
                <option key={def.id} value={def.id}>
                  {def.templateName} (Used {def.usageCount} times)
                </option>
              ))}
            </select>
          ) : (
            <p className="no-templates-message">No saved template definitions yet. Create one below!</p>
          )}
        </div>
      </div>

      {/* ✅ NEW - Template Name Input */}
      <div className="template-name-section">
        <div className="template-section">
          <h2>Template Name</h2>
          <p>Give this template definition a unique name.</p>
        </div>
        <input
          type="text"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          className="template-name-input"
          placeholder="e.g., Sales Outreach Template v1"
        />
      </div>

      {/* Model Selection Section */}
      <div className="model-selection-section">
        <h2>Select GPT-5 Model</h2>
        <p>Choose the AI model for your campaign generation.</p>
        <div className="model-dropdown-wrapper">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="model-dropdown"
          >
            {availableModels.map((model: GPTModel) => (
              <option key={model.id} value={model.id}>
                {model.name} {model.description ? `- ${model.description}` : ''}
              </option>
            ))}
          </select>
          <ChevronDown className="dropdown-icon" size={20} />
        </div>
      </div>



      <div className="template-grid">
        <div>
          <div className="template-section">
            <h2>1. AI Instructions (System Prompt)</h2>
            <p>Define how the AI should behave and what its goal is.</p>
          </div>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="template-textarea"
            placeholder="e.g., You are a helpful assistant. Your goal is to fill in the placeholders in the user's template..."
            rows={6}
          />
        </div>

        <div>
          <div className="template-section">
            <h2>1b. AI Instructions for Editing</h2>
            <p>Define how the AI should behave when editing placeholder values.</p>
          </div>
          <textarea
            value={systemPromptForEdit}
            onChange={(e) => setSystemPromptForEdit(e.target.value)}
            className="template-textarea"
            placeholder="e.g., You are an AI assistant helping to edit placeholder values. Use {placeholder} and {currentValue} as variables..."
            rows={6}
          />
          <p className="helper-text" style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
            💡 Use <code>{'{placeholder}'}</code> and <code>{'{currentValue}'}</code> as placeholders in your instructions
          </p>
        </div>

        <div>
          <div className="template-section">
            <h2>2. Placeholders List (Short)</h2>
            <p>Enter a brief list of placeholders for the AI to fill.</p>
          </div>
          <textarea
            value={masterPrompt}
            onChange={(e) => setMasterPrompt(e.target.value)}
            className="template-textarea"
            placeholder="e.g., {name}, {company}, {role}"
            rows={4}
          />
        </div>

        <div>
          <div className="template-section">
            <h2>2b. Placeholders List (Extensive)</h2>
            <p>Provide detailed descriptions and context for each placeholder.</p>
          </div>
          <textarea
            value={masterPromptExtensive}
            onChange={(e) => setMasterPromptExtensive(e.target.value)}
            className="template-textarea"
            placeholder="e.g., {name} - Recipient's full name&#10;{company} - Company name where they work&#10;{role} - Their job title or position"
            rows={8}
          />
          <p className="helper-text" style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
            💡 This extensive list helps the AI understand context and generate better questions
          </p>
        </div>
      </div>

      <div className="additional-text-section">
        <div className="template-section">
          <h2>3. Master campaign template </h2>
          <p className="warning-text">⚠️ This text is NOT sent to the AI. Placeholders here will be filled with values from the conversation.</p>
        </div>
        <textarea
          value={previewText}
          onChange={(e) => setPreviewText(e.target.value)}
          className="additional-text-textarea"
          placeholder="e.g., Name-{name}&#10;Company-{company}&#10;Dear {name}, We at {company} are excited to connect with you..."
        />
      </div>

      <div className="placeholders-section">
        <h3>Detected Placeholders in Placeholders List:</h3>
        <div className="placeholders-container">
          {currentPlaceholders.length > 0 ? currentPlaceholders.map((p) => (
            <span key={p} className="placeholder-tag">{`{${p}}`}</span>
          )) : <span className="no-placeholders">No placeholders found in placeholders list.</span>}
        </div>

        {previewText && (
          <div style={{ marginTop: '12px' }}>
            <h3>Placeholders in Master Campaign Template:</h3>
            <div className="placeholders-container">
              {extractPlaceholders(previewText).length > 0 ? extractPlaceholders(previewText).map((p) => (
                <span key={p} className="placeholder-tag green">{`{${p}}`}</span>
              )) : <span className="no-placeholders">No placeholders found in master campaign template.</span>}
            </div>
          </div>
        )}
      </div>

      {/* ✅ NEW - Save Template Definition Button */}
      <div className="template-actions-section">
        <div className="template-actions-grid">
          <button
            onClick={saveTemplateDefinition}
            disabled={isSavingDefinition || !templateName.trim() || !systemPrompt.trim() || !masterPrompt.trim()}
            className="save-definition-button"
          >
            {isSavingDefinition ? (
              <>
                <Loader2 size={20} className="spinning" /> Saving Template Definition...
              </>
            ) : saveDefinitionStatus === 'success' ? (
              <>
                <CheckCircle size={20} /> Template Definition Saved!
              </>
            ) : saveDefinitionStatus === 'error' ? (
              <>
                <XCircle size={20} /> Save Failed
              </>
            ) : (
              <>
                <FileText size={20} /> Save Template Definition
              </>
            )}
          </button>

          <button
            onClick={startConversation}
            disabled={currentPlaceholders.length === 0 || systemPrompt.trim() === '' || !selectedTemplateDefinitionId}
            className="start-button"
          >
            <MessageSquare size={20} /> Start Filling Placeholders →
          </button>
        </div>

        {saveDefinitionStatus === 'success' && (
          <p className="success-message">✅ Template definition saved successfully! You can now start the conversation.</p>
        )}
        {saveDefinitionStatus === 'error' && (
          <p className="error-message">❌ Failed to save template definition. Please try again.</p>
        )}
        {!selectedTemplateDefinitionId && currentPlaceholders.length > 0 && (
          <p className="info-message">ℹ️ Please save the template definition before starting the conversation.</p>
        )}
      </div>
    </div>
  );
};




const ConversationTab: React.FC<ConversationTabProps> = ({
  conversationStarted,
  messages,
  
  isTyping,
  isComplete,
  currentAnswer,
  setCurrentAnswer,
  handleSendMessage,
  handleKeyPress,
  chatEndRef,
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

     

}) => {
const [isGenerating, setIsGenerating] = useState(false);
const [editableExampleOutput, setEditableExampleOutput] = useState<string>("");

const [placeholderConfirmed, setPlaceholderConfirmed] = useState(false);


useEffect(() => {
  if (exampleOutput) {
    setEditableExampleOutput(exampleOutput);
  }
}, [exampleOutput]);


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




  const inputRef = useRef<HTMLTextAreaElement | null>(null);

const renderMessageContent = (rawContent: string) => {
  if (!rawContent) return null;

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


  useEffect(() => {
    if (!isTyping && conversationStarted && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isTyping, messages, conversationStarted]);




  const [activeSubStageTab, setActiveSubStageTab] = useState<
    "search" | "data" | "summary"
  >("search");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const rowsPerPage = 1;
  const totalPages = Math.ceil(contacts.length / rowsPerPage);
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
  useEffect(() => {
    if (contacts.length > 0) {
      const contact = contacts[(currentPage - 1) * rowsPerPage];
      if (contact) {
        setSelectedContactId(contact.id);
        applyContactPlaceholders(contact);
      }
    }
  }, [currentPage, contacts]);


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
  <div className="conversation-container">
    <div className="chat-layout">

      {/* ===================== LEFT : CHAT ===================== */}
      <div className="chat-section">

        {/* ===== CHAT HEADING ===== */}


        {/* ===== PLACEHOLDER DROPDOWN (INSIDE CHAT) ===== */}
        {isEditMode && (
          <div className="chat-placeholder-panel">
            

            <select
              className="placeholder-dropdown"
              value={selectedPlaceholder || ""}
              onChange={(e) => onPlaceholderSelect?.(e.target.value)}
              disabled={isTyping}
            >
              <option value="">-- Edit elements --</option>

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
          </div>
        )}

        {/* ===== CHAT BODY ===== */}
        <div className="messages-area">

          {/* EDIT MODE – no placeholder yet */}
          {isEditMode && !conversationStarted && !selectedPlaceholder && (
            <div className="empty-conversation">
              <p>Please select element to edit.</p>
            </div>
          )}

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
                <div className="typing-indicator">
                  <Loader2 className="typing-spinner" />
                  <span>Blueprint builder is thinking…</span>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}
        </div>

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
  setPageSize: (v: number) => void;

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

  // Editor component


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
  exampleOutput,                    // ✅ ADD THIS

}) => {

  const safe = (v: any) => (v?.trim ? v.trim() : v) || "NA";
  const selectedContact = contacts.find(c => c.id === selectedContactId);

  return (
    <div className="example-section">

      {/* ===================== HEADER ===================== */}
      <div className="example-header">
        <div className="example-datafile-section" style={{ marginTop: "10px" }}>
          <label>Contact list</label>

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
            disabled={isGenerating}
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
          marginBottom: "10px"
        }}
      >
        <div style={{ display: "flex", gap: "12px" }}>
          {["output", "pt", "stages"].map((t) => (
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
              fontWeight: 600
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
            <p>📧 Example output will appear here</p>
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
            <p className="example-placeholder">🔧 Filled Template will appear here</p>
          )}
        </div>
      )}

      {/* ===================== STAGES TAB ===================== */}
      {activeMainTab === "stages" && (
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
      )}
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
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [soundEnabled, setSoundEnabled] = useSessionState<boolean>("campaign_sound_enabled", true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState<number | null>(null);
  const [originalTemplateData, setOriginalTemplateData] = useState<any>(null);
  const [selectedPlaceholder, setSelectedPlaceholder] = useState<string>("");
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);

  const [selectedTemplateDefinitionId, setSelectedTemplateDefinitionId] = useState<number | null>(null);

  const [messages, setMessages] = useSessionState<Message[]>("campaign_messages", []);
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
          example_output: editableExampleOutput
        }
      }
    );

    showModal("Success","✅ Example email saved successfully!");
  } catch (error) {
    console.error("❌ Save example output failed:", error);
    showModal("Error","Failed to save example email.");
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
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      className="example-content"
      style={{
        minHeight: "320px",
        padding: "16px",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        background: "#ffffff",
        outline: "none",
        lineHeight: "1.6"
      }}
      onInput={() => {
        if (editorRef.current) {
          localDraft.current = editorRef.current.innerHTML;
        }
      }}
      onBlur={() => {
        onChange(localDraft.current);
      }}
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
        setUiPlaceholders(res.data);
        console.log("✅ Loaded placeholder definitions from backend");
      }
    })
    .catch(err =>
      console.error("❌ Failed to load placeholder definitions", err)
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


// ⭐ Ensure contact switching works inside Elements tab also
useEffect(() => {
  if (activeMainTab !== "build" || activeBuildTab !== "elements") return;

  if (contacts.length > 0) {
    const contact = contacts[(currentPage - 1) * rowsPerPage];
    if (contact) {
      setSelectedContactId(contact.id);
      applyContactPlaceholders(contact);
    }
  }
}, [currentPage, contacts, activeMainTab, activeBuildTab]);



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
    const conversationOnly = getConversationPlaceholders(formValues);

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

    showModal("Success","✅ Placeholder values updated successfully!");
  } catch (error) {
    console.error("❌ Failed to update placeholders:", error);
    showModal("Warning","Failed to update placeholder values.");
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
      console.log('📇 Applying contact placeholders:', contact.full_name);

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

      console.log('✅ Contact placeholders applied');
      console.log('🌐 Website value:', mergedForDisplay.website || '(none)');
      console.log('🔗 LinkedIn value:', mergedForDisplay.linkedin_url || '(none)');
      console.log('ℹ️ Click "Regenerate" to generate email with this contact');

    } catch (error) {
      console.error("⚠️ Error applying contact placeholders:", error);
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
  try {
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

    console.log("📦 Conversation placeholders:", Object.keys(conversationValues));
    console.log("📇 Contact placeholders:", Object.keys(contactValues));

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
    console.log("📦 Persisted placeholders only:", Object.keys(persisted));

    const response = await axios.post(
      `${API_BASE_URL}/api/CampaignPrompt/example/generate`,
      {
        userId: effectiveUserId,
        campaignTemplateId: activeCampaignId,
        model: selectedModel,
        placeholderValues: mergedAll // ✅ SEND EVERYTHING
      }
    );

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
    } else {
      showModal("Warning","⚠️ Example generation returned no output.");
    }

  } catch (error: any) {
    console.error("❌ regenerateExampleOutput failed:", error);
    showModal("Error",`Failed to regenerate: ${error.message}`);
  }
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
      showModal("missing parameters","Please fill in AI Instructions and Placeholders List");
      return;
    }

    setIsSavingDefinition(true);
    setSaveDefinitionStatus('idle');

    try {
      const response = await axios.post(`${API_BASE_URL}/api/CampaignPrompt/template-definition/save`, {
        templateName: templateName,
        aiInstructions: systemPrompt,
        aiInstructionsForEdit: systemPromptForEdit,
        placeholderList: masterPrompt,
        placeholderListExtensive: masterPromptExtensive,
        masterBlueprintUnpopulated: previewText,
        createdBy: effectiveUserId,
        searchURLCount,
        subjectInstructions,
        selectedModel: selectedModel

      });

      if (response.data.success) {
        setSaveDefinitionStatus('success');
        setSelectedTemplateDefinitionId(response.data.templateDefinitionId);
          const savePlaceholderDefinitions = async () => {
  if (!selectedTemplateDefinitionId) return;

  await axios.post(
    `${API_BASE_URL}/api/CampaignPrompt/placeholders/save`,
    {
      templateDefinitionId: selectedTemplateDefinitionId,
      placeholders: uiPlaceholders
    }
  );

  console.log("✅ Placeholder definitions saved");
};

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

  const savePlaceholderDefinitions = async () => {
  if (!selectedTemplateDefinitionId) return;

  await axios.post(
    `${API_BASE_URL}/api/CampaignPrompt/placeholders/save`,
    {
      templateDefinitionId: selectedTemplateDefinitionId,
      placeholders: uiPlaceholders
    }
  );

  console.log("✅ Placeholder definitions saved");
};


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

      setEditTemplateId(parseInt(templateId));
      setIsEditMode(true);
      setActiveMainTab("build"); setActiveBuildTab("chat");      
      loadTemplateForEdit(parseInt(templateId));

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
      setIsEditMode(true);
    } catch (error) {
      console.error("Error loading template:", error);
      alert("Failed to load template for editing");
      setIsEditMode(false);
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
    console.warn("startEditConversation: missing effectiveUserId or placeholder");
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

    const response = await axios.post(`${API_BASE_URL}/api/CampaignPrompt/edit/start`, bodyToSend);

    const data = response.data?.response ?? response.data;
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
    console.log("✅ Conversation placeholder saved in DB:", updatedPlaceholder);
    console.log("ℹ️ Click 'Regenerate' to see the updated email");

      // ❌ REMOVED: Auto-regeneration
      // User must click "Regenerate" button manually

    } catch (err) {
      console.error("⚠️ Error during placeholder finalization:", err);
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
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

useEffect(() => {
  // 🛑 IMPORTANT: do NOT rebuild while user is typing dropdown options
  if (uiPlaceholders.some(p => (p as any)._rawOptions !== undefined)) {
    return;
  }

  const keys = extractPlaceholders(masterPrompt);

  setUiPlaceholders(prev => {
    const prevMap = new Map(
      prev.map(p => [p.placeholderKey, p])
    );

    return keys.map(key => {
      const existing = prevMap.get(key);

      // ✅ FULLY PRESERVE existing placeholder config
      if (existing) {
        return {
          ...existing,
          // ✅ preserve typing buffer
          _rawOptions: (existing as any)._rawOptions,

          // ensure runtime flag remains correct
          isRuntimeOnly:
            existing.isRuntimeOnly ??
            RUNTIME_ONLY_PLACEHOLDERS.includes(key)
        };
      }

      // ✅ ONLY for brand-new placeholders
      return {
        placeholderKey: key,
        friendlyName: key.replace(/_/g, " "),
        category: key.includes("search")
          ? "Search"
          : key.includes("example") || key.includes("output")
          ? "Output"
          : "General",

        inputType: "text",
        options: [],

        uiSize:
          key.includes("example") || key.includes("output")
            ? "xl"
            : "md",

        isRuntimeOnly: RUNTIME_ONLY_PLACEHOLDERS.includes(key),
        isExpandable: key.includes("example") || key.includes("output"),
        isRichText: key.includes("example") || key.includes("output")
      };
    });
  });
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



const groupedPlaceholders = uiPlaceholders
  .filter(p => !p.isRuntimeOnly)
  .reduce<Record<string, PlaceholderDefinitionUI[]>>((acc, p) => {
    acc[p.category] = acc[p.category] || [];
    acc[p.category].push(p);
    return acc;
  }, {});


const renderPlaceholderInput = (p: PlaceholderDefinitionUI) => {
  const key = p.placeholderKey;
  const value = formValues[key] ?? "";

  // Common input style
  const baseStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
    background: "#fff"
  };

  switch (p.inputType) {
    // ================================
    // 🔽 DROPDOWN (SELECT)
    // ================================
case "select":
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {/* OPTIONS EDITOR */}
      <input
        type="text"
        placeholder="Options (comma separated)"
        value={p._rawOptions ?? p.options?.join(", ") ?? ""}
        onChange={e => {
          const raw = e.target.value;

          // store raw typing ONLY
          setUiPlaceholders(prev =>
            prev.map(x =>
              x.placeholderKey === p.placeholderKey
                ? { ...x, _rawOptions: raw }
                : x
            )
          );
        }}
        onBlur={() => {
          // parse ONLY when user finishes typing
          setUiPlaceholders(prev =>
            prev.map(x =>
              x.placeholderKey === p.placeholderKey
                ? {
                    ...x,
                    options: (x._rawOptions ?? "")
                      .split(",")
                      .map((o: string) => o.trim())
                      .filter(Boolean),
                    _rawOptions: undefined
                  }
                : x
            )
          );
        }}
        style={{
          ...baseStyle,
          fontSize: "12px",
          background: "#f9fafb"
        }}
      />

      {/* ACTUAL DROPDOWN */}
      <select
        value={value}
        onChange={e =>
          setFormValues(prev => ({ ...prev, [key]: e.target.value }))
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


    // ================================
    // 📝 TEXTAREA
    // ================================
    case "textarea":
      return (
        <textarea
          value={value}
          onChange={e =>
            setFormValues(prev => ({ ...prev, [key]: e.target.value }))
          }
          style={{
            ...baseStyle,
            minHeight: "90px",
            resize: "vertical"
          }}
        />
      );

    // ================================
    // 🧠 RICH TEXT (EXPANDABLE)
    // ================================
      case "richtext":
        return (
          <div
            onClick={() =>
              setExpandedPlaceholder({
                key,
                friendlyName: p.friendlyName
              })
            }
            dangerouslySetInnerHTML={{
              __html:
                value ||
                "<span style='color:#9ca3af'>Click Expand to edit</span>"
            }}
            style={{
              minHeight: "120px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              padding: "10px",
              background: "#ffffff",
              cursor: "pointer",
              lineHeight: "1.6"
            }}
          />
        );


    // ================================
    // ✏️ DEFAULT TEXT INPUT
    // ================================
    default:
      return (
        <input
          type="text"
          value={value}
          onChange={e =>
            setFormValues(prev => ({ ...prev, [key]: e.target.value }))
          }
          style={baseStyle}
        />
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

      const data = response.data.response;
      if (data) {
        // if it's already marked complete, only push completion message
        if (data.isComplete) {
          const completionMessage: Message = {
            type: "bot",
            content:
              "🎉 Great! I've filled in all placeholders. Select a contact and click 'Regenerate' to see the personalized email.",
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
    const data = response.data.response;

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

        Object.entries(parsedPlaceholders).forEach(([key, value]) => {
          if (!CONTACT_PLACEHOLDERS.includes(key)) {
            updatedConversationValues[key] = value;
          }
        });

        // merge for display once (removed duplicate call)
        const mergedForDisplay = getMergedPlaceholdersForDisplay(updatedConversationValues, currentContactValues);
        setPlaceholderValues(mergedForDisplay);
        console.log('📦 Updated conversation placeholders:', Object.keys(updatedConversationValues));

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
            console.log('💾 Saved conversation placeholders to DB (no auto-generation)');
          } catch (err) {
            console.warn('⚠️ Failed to save placeholders:', err);
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
        content: "🎉 Great! I've filled in all placeholders. Select a contact and click 'Regenerate' to see the personalized email.",
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
          console.warn('⚠️ finalizeEditPlaceholder failed:', err);
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

    setIsEditMode(false);
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

  // ====================================================================
  // RENDER
  // ====================================================================
return (
  <div className="email-campaign-builder">
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
        <div className="loading-content">
          <Loader2 size={48} className="spinning" />
          <p>Loading template definitions...</p>
        </div>
      </div>
    )}

    {/* ================= MAIN CONTAINER ================= */}
    <div className="campaign-builder-container" style={{ marginTop: "-30px" }}>
      <div className="campaign-builder-main">

        {/* ================= TOP TABS ================= */}
        <div className="sticky-tabs">
          <ul>
            {["build", "instructions", "ct"].map(t => (
              <li key={t}>
                <button
                  className={activeMainTab === t ? "active" : ""}
                  onClick={() => setActiveMainTab(t as any)}
                >
                  {t === "build" ? "Build" : t === "instructions" ? "Instructions set" : "VT"}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <PopupModal
          open={popupmodalInfo.open}
          title={popupmodalInfo.title}
          message={popupmodalInfo.message}
          onClose={closeModal}
        />

        {/* ================= BUILD TAB ================= */}
{activeMainTab === "build" && (
  <>
    {/* ================= BUILD SUBTAB HEADER ROW ================= */}
    <div className="build-subtabs-row">
      {/* LEFT: Chat / Elements tabs */}
      <div className="build-subtabs">
        {["chat", "elements"].map(t => (
          <button
            key={t}
            className={activeBuildTab === t ? "active" : ""}
            onClick={() => setActiveBuildTab(t as any)}
          >
            {t === "chat" ? "Chat" : "Elements"}
          </button>
        ))}
      </div>

      {/* RIGHT: Show Preview Button (only when closed) */}
      {!isSectionOpen && (
        <button
          className="show-preview-btn"
          onClick={() => setIsSectionOpen(true)}
        >
          ⟩ Show Email Preview
        </button>
      )}
    </div>

    {/* ================= SPLIT LAYOUT ================= */}
    <div
      style={{
        display: "flex",
        gap: "16px",
        height: "calc(100vh - 200px)"
      }}
    >
      {/* ================= LEFT PANEL ================= */}
      <div
        style={{
          flex: 1,
          width: isSectionOpen ? "50%" : "100%",
          transition: "all 0.25s ease"
        }}
      >
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
            chatEndRef={chatEndRef}
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
            borderLeft: "1px solid #e5e7eb",
            paddingLeft: "12px",
            position: "relative"
          }}
        >
          {/* Collapse Button */}
          <button
            onClick={() => setIsSectionOpen(false)}
            title="Collapse preview"
            style={{
              position: "absolute",
              top: "12px",
              left: "-14px",
              zIndex: 20,
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              border: "1px solid #d1d5db",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 700
            }}
          >
            ⟨
          </button>

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
            isGenerating={isGenerating}
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
          />
        </div>
      )}
    </div>
  </>
)}


        {/* ================= INSTRUCTIONS TAB ================= */}
        {activeMainTab === "instructions" && (
          <div className="instructions-wrapper">
            {/* unchanged – keep your existing code */}
          </div>
        )}

        {/* ================= VT TAB ================= */}
        {activeMainTab === "ct" && (
          <div className="ct-tab-container">
            <h3>Live vendor blueprint (Auto updated)</h3>
            <SimpleTextarea
              value={campaignBlueprint}
              onChange={(e: any) => setCampaignBlueprint(e.target.value)}
            />
          </div>
        )}
      </div>
    </div>


  </div>
);

};

export default MasterPromptCampaignBuilder;

