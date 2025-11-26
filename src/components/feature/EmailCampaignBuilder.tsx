import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Send, Copy, Check, Loader2, RefreshCw, Globe, Eye, FileText, MessageSquare, CheckCircle, XCircle, ChevronDown, Volume2, VolumeX } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from "../../config";
import './EmailCampaignBuilder.css';
import notificationSound from '../../assets/sound/notification.mp3';
import { AlertCircle } from 'lucide-react';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import PaginationControls from './PaginationControls';
import { Tooltip as ReactTooltip } from "react-tooltip";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import downArrow from "../../assets/images/down.png";


// --- Type Definitions ---
interface Message {
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

// include both old and new tab keys
type TabType =
  | 'template'
  | 'conversation'
  | 'result'
  | 'build'
  | 'elements'
  | 'instructions'
  | 'ct';


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
  isSectionOpen: boolean
  setIsSectionOpen: (value: boolean) => void
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
          <h2>3. Master campaign template (unpopulated)</h2>
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




// ✅ UPDATED ConversationTab Component
const ConversationTab: React.FC<ConversationTabProps> = ({
  conversationStarted,
  messages,
  isSectionOpen,
  setIsSectionOpen,
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
  previewText,  // ✅ <-- add this line
  exampleOutput,
  regenerateExampleOutput,

  dataFiles,
  contacts,
  selectedDataFileId,
  selectedContactId,
  handleSelectDataFile,
  setSelectedContactId,
  applyContactPlaceholders,  // 👈 add this

  searchResults,
  allSourcedData,
  sourcedSummary,


}) => {



  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const renderMessageContent = (content: string) => {
    const isHtml = /<[a-z][\s\S]*>/i.test(content);
    if (isHtml) {
      return <div className="rendered-html-content" dangerouslySetInnerHTML={{ __html: content }} />;
    } else {
      return <p className="message-content">{content}</p>;
    }
  };

  useEffect(() => {
    // Focus input when conversation starts or after a new bot message
    if (!isTyping && conversationStarted && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isTyping, messages, conversationStarted]);

  const [activeMainTab, setActiveMainTab] = useState<'output' | 'stages' | 'elements'>('output');
  const [activeSubStageTab, setActiveSubStageTab] = useState<'search' | 'data' | 'summary'>('search');

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 1;
  const totalPages = Math.ceil(contacts.length / rowsPerPage);
  const paginatedContact = contacts[(currentPage - 1) * rowsPerPage];
  useEffect(() => {
    if (contacts.length > 0) {
      const contact = contacts[(currentPage - 1) * rowsPerPage];
      if (contact) {
        setSelectedContactId(contact.id);
        applyContactPlaceholders(contact);
      }
    }
  }, [currentPage, contacts]);

  return (
    <div className="conversation-container">
      <div className="chat-layout">
        {/* ===================== CHAT SECTION ===================== */}
        <div className="chat-section">
          {isEditMode && !conversationStarted && (
            <div className="placeholder-selector-section" style={{
              padding: '20px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <div className="placeholder-selector-header" style={{ marginBottom: '15px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
                  Select Placeholder to Edit
                </h3>
                <p style={{ color: '#6b7280', fontSize: '14px' }}>
                  Choose which placeholder value you want to modify
                </p>
              </div>

              <div className="placeholder-selector-content">
                <select
                  className="placeholder-dropdown"
                  value={selectedPlaceholder || ''}
                  onChange={(e) => {
                    if (e.target.value && onPlaceholderSelect) {
                      onPlaceholderSelect(e.target.value);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '15px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">-- Select a placeholder to edit --</option>
                  {availablePlaceholders.map((placeholder) => (
                    <option key={placeholder} value={placeholder}>
                      {`{${placeholder}}`} - Current: {placeholderValues[placeholder] || "Not set"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="placeholder-actions" style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    window.location.reload();
                  }}
                  className="button secondary"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel Edit Mode
                </button>
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className="messages-area">
            {/* {conversationStarted && (
              <button
                onClick={resetAll}
                className="clear-history-button"
                title="Clear history and start fresh"
              >
                <XCircle size={16} />
                Clear History
              </button>
            )} */}

            {!conversationStarted && !isEditMode ? (
              <div className="empty-conversation">
                <div className="empty-conversation-content">
                  <MessageSquare size={48} className="empty-conversation-icon" />
                  <p className="empty-conversation-text">
                    Start by entering your template in the 'Template' tab.
                  </p>
                </div>
              </div>
            ) : conversationStarted ? (
              <div className="messages-list">
                {isEditMode && selectedPlaceholder && (
                  <div className="edit-mode-indicator" style={{
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fbbf24',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <AlertCircle size={16} color="#f59e0b" />
                    <span>Editing: <strong>{`{${selectedPlaceholder}}`}</strong></span>
                  </div>
                )}

                {messages.map((message, index) => (
                  <div key={index} className={`message-wrapper ${message.type}`}>
                    <div className={`message-bubble ${message.type}`}>
                      {renderMessageContent(message.content)}
                      <div className={`message-time ${message.type}`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="typing-indicator">
                    <div className="typing-bubble">
                      <div className="typing-content">
                        <Loader2 className="typing-spinner" />
                        <span className="typing-text">Blueprint builder is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            ) : null}
          </div>

          {/* Input field */}
          {conversationStarted  && (
            <div className="input-area">
              <div className="input-container">
                <textarea
                  ref={inputRef}
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your answer..."
                  className="message-input"
                  rows={2}
                  disabled={isTyping}
                />

                <button
                  onClick={handleSendMessage}
                  disabled={isTyping || !currentAnswer.trim()}
                  className="send-button"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ===================== EXAMPLE SECTION ===================== */}
        {isSectionOpen && (
          <div className="example-section">
            <div className="example-header">
              <div className="example-datafile-section">
                <label>Contact list</label>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "-20px" }}>
                  <select
                    className="datafile-dropdown"
                    value={selectedDataFileId || ""}
                    onChange={e => handleSelectDataFile(Number(e.target.value))}
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
                  <div className="pagination-wrapper example-pagination" style={{ marginTop: "-20px" }} >
                    <PaginationControls
                      currentPage={currentPage}
                      totalPages={totalPages}
                      pageSize={rowsPerPage}
                      totalRecords={contacts.length}
                      setCurrentPage={setCurrentPage}
                    /></div>
                </div>
              </div>

            </div>
            {selectedContactId && (
              <div className="contact-row-wrapper" style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "-15px", backgroundColor: " #f5f6fa" }}>
                {/* Contact Details */}
                {(() => {
                  const contact = contacts.find(c => c.id === selectedContactId);
                  if (!contact) return null;

                  const safe = (val: string | null | undefined) => val?.trim() || "NA";

                  return (
                    <div className="contact-details" style={{ display: "flex", gap: "8px", flexWrap: "wrap", border: "1px solid #d1d5db", padding: "10px 10px", borderRadius: "8px", backgroundColor: "#f9fafb", alignItems: "inherit" }}>
                      <span>{safe(contact.full_name)}</span> •
                      <span>{safe(contact.job_title)}</span> •
                      <span>{safe(contact.company_name)}</span> •
                      <span>{safe(contact.country_or_address)}</span>
                      <ReactTooltip
                        anchorSelect="#website-icon-tooltip"
                        place="top"
                      >
                        Open company website
                      </ReactTooltip>
                      <span className="inline-block relative  mr-[3px]">
                        <svg
                          id="website-icon-tooltip"
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
                      <ReactTooltip anchorSelect="#li-icon-tooltip" place="top">
                        Open this contact in LinkedIn
                      </ReactTooltip>
                      <svg
                        id="li-icon-tooltip"
                        xmlns="http://www.w3.org/2000/svg"
                        width="20px"
                        height="22px"
                        viewBox="0 0 24 24"
                        fill="#333333"
                        style={{ marginTop: "3px" }}
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
                      <ReactTooltip
                        anchorSelect="#email-icon-tooltip"
                        place="top"
                      >
                        Open this email in your local email client
                      </ReactTooltip>  <svg
                        id="email-icon-tooltip"
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
                    </div>
                  );
                })()}

              {/* Generate Button BESIDE contact details */}
<button
  className="regenerate-btn"
  onClick={async () => {
    if (!selectedContactId) {
      alert("Please select a contact before generating.");
      return;
    }

    const contact = contacts.find(c => c.id === selectedContactId);
    if (!contact) {
      alert("Invalid contact selection.");
      return;
    }

    // Step 1: Apply contact placeholders
    await applyContactPlaceholders(contact);

    // Step 2: Run example generation, but only if defined
    if (regenerateExampleOutput) {
      await regenerateExampleOutput();
    } else {
      console.error("❌ regenerateExampleOutput is undefined");
      alert("Example generation function missing!");
    }
  }}
  disabled={!conversationStarted}
>
  Generate
</button>

            </div>
          )}


            {/* === Tabs for Example Output === */}
            <div className="example-tabs">
              {["Output", "Stages"].map(tab => (
                <button
                  key={tab}
                  className={`stage-tab-btn ${activeMainTab === tab.toLowerCase() ? "active" : ""}`}
                  onClick={() => setActiveMainTab(tab.toLowerCase() as 'output' | 'stages')}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* === Main Tab Content === */}
            {activeMainTab === "output" && (
              <div className="example-body">
                {exampleOutput ? (
                  <div
                    className="example-content"
                    dangerouslySetInnerHTML={{ __html: exampleOutput }}
                  />
                ) : (
                  <div className="example-placeholder">
                    <p>📧 Example output will appear here</p>
                  </div>
                )}
              </div>
            )}

          

            {activeMainTab === "stages" && (
              <div className="stages-container">
                <div className="stage-tabs">
                  {["search", "data", "summary"].map(tab => (
                    <button
                      key={tab}
                      className={`stage-tab ${activeSubStageTab === tab ? "active" : ""}`}
                      onClick={() => setActiveSubStageTab(tab as 'search' | 'data' | 'summary')}
                    >
                      {tab === "search" ? "Search Results" :
                        tab === "data" ? "All Sourced Data" :
                          "Sourced Data Summary"}
                    </button>
                  ))}
                </div>

                <div className="stage-content">
                  {activeSubStageTab === "search" && (
                    <ul className="search-results-list">
                      {searchResults.length > 0 ? (
                        searchResults.map((url: string, idx: number) => (
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
                    <pre className="all-sourced-data bg-gray-50 p-3 rounded-lg max-h-[400px] overflow-auto text-sm whitespace-pre-wrap">
                      {allSourcedData || "No sourced data available."}
                    </pre>
                  )}

                  {activeSubStageTab === "summary" && (
                    <div className="sourced-summary bg-gray-50 p-4 rounded-lg leading-relaxed text-gray-800">
                      {sourcedSummary || "No summary available."}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        )}
      </div>
    </div>
  );
};

// ====================================================================
// MAIN COMPONENT
// ====================================================================
const MasterPromptCampaignBuilder: React.FC<EmailCampaignBuilderProps> = ({ selectedClient }) => {
  // --- State Management ---
const [activeTab, setActiveTab] = useState<TabType>('build');
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





useEffect(() => {
  const saved = sessionStorage.getItem("campaign_activeTab") as TabType | null;
  if (saved) {
    setActiveTab(saved);
  } else {
    setActiveTab("build");
    sessionStorage.setItem("campaign_activeTab", "build");
  }
}, []);
useEffect(() => {
  if (activeTab) sessionStorage.setItem("campaign_activeTab", activeTab);
}, [activeTab]);
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

      setActiveTab("build");
      startConversation();
    }
  }, [systemPrompt, masterPrompt, selectedTemplateDefinitionId]);




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
  const regenerateExampleOutputWithValues = async (placeholders: Record<string, string>) => {
    try {
      console.log('🔄 Regenerating example output with provided placeholders...');

      const storedId = sessionStorage.getItem('newCampaignId');
      const activeCampaignId = editTemplateId ?? (storedId ? Number(storedId) : null);

      if (!activeCampaignId) {
        console.warn("⚠️ No campaign instance found");
        return;
      }

      console.log('📧 Calling example/generate API with:', Object.keys(placeholders));

      const response = await axios.post(`${API_BASE_URL}/api/CampaignPrompt/example/generate`, {
        userId: effectiveUserId,
        campaignTemplateId: activeCampaignId,
        model: selectedModel,
        placeholderValues: placeholders
      });

      if ((response.data.success || response.data.Success) &&
        (response.data.exampleOutput || response.data.ExampleOutput)) {
        setExampleOutput(response.data.exampleOutput || response.data.ExampleOutput);
        console.log('✅ Example output generated successfully');
      } else {
        console.warn('⚠️ No example output returned from API');
      }

    } catch (error: any) {
      console.error('❌ Error regenerating example output:', error);
      throw error; // Propagate error to caller
    }
  };

  // 🧭 Stages tab state

  // 🔍 States for Stages tab data
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [allSourcedData, setAllSourcedData] = useState<string>('');
  const [sourcedSummary, setSourcedSummary] = useState<string>('');

  // ====================================================================
  // ✅ COMPLETE: Regenerate Example Output (MANUAL ONLY)
  // ====================================================================
  const regenerateExampleOutput = async () => {
    try {
      console.log('🚀 Manual regenerate button clicked');

      if (!editTemplateId && !selectedTemplateDefinitionId) {
        alert('Please save the template first before regenerating example output.');
        return;
      }

      // Get conversation and contact placeholders
      const conversationValues = getConversationPlaceholders(placeholderValues);
      const contactValues = getContactPlaceholders(placeholderValues);
      const mergedForSearch = getMergedPlaceholdersForDisplay(conversationValues, contactValues);

      console.log('📦 Conversation placeholders:', Object.keys(conversationValues));
      console.log('📇 Contact placeholders:', Object.keys(contactValues));

      // ====================================================================
      // 🔍 STEP 1: CHECK IF SEARCH IS NEEDED
      // ====================================================================
      const hasSearchTermsPlaceholder = masterPrompt.includes('{hook_search_terms}');
      let searchResultSummary = '';

      if (hasSearchTermsPlaceholder && conversationValues['hook_search_terms']) {
        console.log('🔍 Search terms detected, preparing search API call...');

        // ✅ Validate required conversation placeholders
        if (!conversationValues['vendor_company_email_main_theme']) {
          alert('❌ Missing "vendor_company_email_main_theme" value. Please complete the conversation first.');
          return;
        }

        let searchTerm = conversationValues['hook_search_terms'];

        // ✅ Replace placeholders in search term
        const processedSearchTerm = replacePlaceholdersInString(searchTerm, mergedForSearch);

        // ✅ Check for unreplaced placeholders in search term
        const unreplacedInSearchTerm = processedSearchTerm.match(/\{[^}]+\}/g);
        if (unreplacedInSearchTerm) {
          const placeholderNames = unreplacedInSearchTerm.map(p => p.replace(/[{}]/g, ''));
          const missingContactPlaceholders = placeholderNames.filter(p => CONTACT_PLACEHOLDERS.includes(p));

          if (missingContactPlaceholders.length > 0) {
            alert(`⚠️ Search query requires contact information: ${missingContactPlaceholders.join(', ')}.\n\nPlease select a contact from the dropdown first.`);
            return;
          } else {
            alert(`⚠️ Missing required values: ${placeholderNames.join(', ')}`);
            return;
          }
        }

        console.log('🔍 Processed search term:', processedSearchTerm);

        // ✅ Build instructions template
        // ✅ Use search_objective from conversation placeholders ONLY
        if (!conversationValues['search_objective'] || !conversationValues['search_objective'].trim()) {
          alert("❌ Missing 'search_objective' value in placeholders. Please ensure it is set before regenerating.");
          console.error("❌ No search_objective found in conversationValues");
          return;
        }

        console.log("📋 Using search_objective for Process API instructions...");
        const rawInstructions = conversationValues['search_objective'].trim();

        // ✅ Replace placeholders inside the search_objective text
        const processedInstructions = replacePlaceholdersInString(rawInstructions, mergedForSearch);

        // ✅ Check for any unreplaced placeholders
        const unreplacedInInstructions = processedInstructions.match(/\{[^}]+\}/g);
        if (unreplacedInInstructions) {
          console.warn('⚠️ Unreplaced placeholders in search_objective:', unreplacedInInstructions);
          alert(`⚠️ Missing values for search instructions: ${unreplacedInInstructions.join(', ')}`);
          return;
        }

        console.log("✅ Final processed instructions ready for Process API:");
        console.log(processedInstructions);




        // ✅ Call Search API
        try {
          console.log('📤 Calling Search API (process)...');
          console.log('📤 Payload:', {
            searchTerm: processedSearchTerm,
            modelName: selectedModel,
            searchCount: 5
          });

          const searchResponse = await axios.post(`${API_BASE_URL}/api/auth/process`, {
            searchTerm: processedSearchTerm,
            instructions: processedInstructions,
            modelName: selectedModel,
            searchCount: 5
          });

          console.log('📥 Search API response received');

          // Extract result
          const pitchResponse = searchResponse.data?.pitchResponse || searchResponse.data?.PitchResponse;

          if (pitchResponse) {
            searchResultSummary = pitchResponse.content ||
              pitchResponse.Content ||
              pitchResponse.result ||
              pitchResponse.Result ||
              '';
          }

          if (!searchResultSummary) {
            searchResultSummary = searchResponse.data?.content ||
              searchResponse.data?.Content ||
              searchResponse.data?.result ||
              searchResponse.data?.Result ||
              '';
          }

          console.log('✅ Search summary length:', searchResultSummary?.length || 0);
          if (searchResponse.data.searchResults) {
            setSearchResults(searchResponse.data.searchResults);
          }
          if (searchResponse.data.allScrapedData) {
            setAllSourcedData(searchResponse.data.allScrapedData);
          }
          if (searchResponse.data.pitchResponse?.content) {
            setSourcedSummary(searchResponse.data.pitchResponse.content);
          }

          if (!searchResultSummary) {
            console.warn('⚠️ No content found in search response');
            alert('Search completed but no results were found. Proceeding with example generation...');
          } else {
            // ✅ Update conversation placeholders with search result
            conversationValues['search_output_summary'] = searchResultSummary;

            // Update merged values
            const updatedMerged = getMergedPlaceholdersForDisplay(conversationValues, contactValues);
            setPlaceholderValues(updatedMerged);
            console.log('📦 Added search_output_summary to conversation placeholders');

            // ✅ Save updated conversation placeholders to database
            const storedId = sessionStorage.getItem('newCampaignId');
            const activeCampaignId = editTemplateId ?? (storedId ? Number(storedId) : null);

          if (activeCampaignId) {
            await axios.post(`${API_BASE_URL}/api/CampaignPrompt/template/update`, {
              id: activeCampaignId,
              placeholderValues: conversationValues // ✅ Only conversation placeholders
            });
            await reloadCampaignBlueprint();

            console.log('💾 Saved conversation placeholders with search result to DB');
          }
        }

        } catch (searchError: any) {
          console.error('❌ Search API error:', searchError);
          console.error('❌ Error response:', searchError.response?.data);
          alert(`Search API failed: ${searchError.response?.data?.message || searchError.message}\n\nProceeding with example generation without search results...`);
        }
      } else {
        console.log('ℹ️ No search terms placeholder or value not set - skipping search');
      }

      // ====================================================================
      // 📧 STEP 2: GENERATE EXAMPLE OUTPUT
      // ====================================================================
      const storedId = sessionStorage.getItem('newCampaignId');
      const activeCampaignId = editTemplateId ?? (storedId ? Number(storedId) : null);

      if (!activeCampaignId) {
        alert("❌ No campaign instance found. Please start a campaign first.");
        return;
      }

      // ✅ Use merged values (conversation + contact) for example generation
      const finalMergedValues = getMergedPlaceholdersForDisplay(conversationValues, contactValues);

      console.log('📧 Generating example output...');
      console.log('📦 Using placeholders:', Object.keys(finalMergedValues));

      // ✅ Call Example Generation API
      try {
        console.log('📤 Calling Example Generation API...');

        const response = await axios.post(`${API_BASE_URL}/api/CampaignPrompt/example/generate`, {
          userId: effectiveUserId,
          campaignTemplateId: activeCampaignId,
          model: selectedModel,
          placeholderValues: finalMergedValues // ✅ Merged values (conversation + contact)
        });

        console.log('📥 Example generation response received');

        if ((response.data.success || response.data.Success) &&
          (response.data.exampleOutput || response.data.ExampleOutput)) {
          const generatedOutput = response.data.exampleOutput || response.data.ExampleOutput;
          setExampleOutput(generatedOutput);
          console.log('✅ Example output set successfully');
          console.log('📧 Output length:', generatedOutput.length);
        } else {
          console.warn('⚠️ No example output returned from API');
          alert('Example generation completed but no output was returned. Please try again.');
        }

      } catch (error: any) {
        console.error('❌ Example generation error:', error);
        console.error('❌ Error response:', error.response?.data);
        alert(`Failed to generate example output: ${error.response?.data?.message || error.message}`);
      }

      console.log('✅ regenerateExampleOutput completed');

    } catch (error: any) {
      console.error('❌ Fatal error in regenerateExampleOutput:', error);
      console.error('❌ Error stack:', error.stack);
      alert(`Failed to regenerate: ${error.message}`);
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
      alert("Please enter a template name");
      return;
    }

    if (!systemPrompt.trim() || !masterPrompt.trim()) {
      alert("Please fill in AI Instructions and Placeholders List");
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

        await loadTemplateDefinitions();

        setTimeout(() => setSaveDefinitionStatus('idle'), 3000);
      }
    } catch (error: any) {
      console.error('Error saving template definition:', error);

      if (error.response?.data?.message?.includes('already exists')) {
        alert('A template with this name already exists. Please use a different name.');
      } else {
        setSaveDefinitionStatus('error');
        setTimeout(() => setSaveDefinitionStatus('idle'), 3000);
      }
    } finally {
      setIsSavingDefinition(false);
    }
  };


  const updateTemplateDefinition = async () => {
    if (!selectedTemplateDefinitionId) {
      alert("No template selected to update.");
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
      alert("Failed to update template definition.");
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
      setActiveTab('conversation');
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
      setMessages([]);

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

      setActiveTab("build");
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
  const startEditConversation = async (placeholder: string) => {
    if (!effectiveUserId || !placeholder) return;

    setSelectedPlaceholder(placeholder);
    setMessages([]);
    setConversationStarted(true);
    setIsComplete(false);
    setIsTyping(true);

    const currentValue = placeholderValues[placeholder] || "not set";

    try {
      const response = await axios.post(`${API_BASE_URL}/api/CampaignPrompt/edit/start`, {
        userId: effectiveUserId,
        campaignTemplateId: editTemplateId,
        placeholder,
        currentValue,
        model: selectedModel,
      });

      const data = response.data.response;
      if (data && data.assistantText) {
        setMessages([{ type: "bot", content: data.assistantText, timestamp: new Date() }]);
        playNotificationSound();
      }
    } catch (error) {
      console.error("Error starting edit conversation:", error);
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
    await reloadCampaignBlueprint();
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
    setActiveTab("build");
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
          campaignTemplateId: editTemplateId,
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
            await reloadCampaignBlueprint();
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

    // If not complete and in edit mode, finalize placeholder using the captured answerText
    if (isEditMode && selectedPlaceholder && answerText) {
      try {
        await finalizeEditPlaceholder(selectedPlaceholder, answerText);
      } catch (err) {
        console.warn('⚠️ finalizeEditPlaceholder failed:', err);
      }
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
    setActiveTab('template');
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
  | "placeholder_long" 
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

      alert("Template deleted successfully.");

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
      alert("Failed to delete template definition.");
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

      <div className="campaign-builder-container" style={{marginTop: "auto"}}>
        <div className="campaign-builder-main">


          <div className="data-campaigns-container">
            {/* Sub-tabs Navigation */}
<div className="tabs secondary mb-20">
  <ul className="d-flex" style={{ padding: "12px" }}>

    {/* BUILD TAB */}
    <li>
      <button
        type="button"
        onClick={() => {
          setActiveTab("build");
          sessionStorage.setItem("campaign_activeTab", "build");
        }}
        className={`button !pt-0 ${activeTab === "build" ? "active" : ""}`}
      >
        Build
      </button>
    </li>

    {/* ELEMENTS TAB */}
    <li>
      <button
        type="button"
        onClick={() => {
          setActiveTab("elements");
          sessionStorage.setItem("campaign_activeTab", "elements");
        }}
        className={`button !pt-0 ${activeTab === "elements" ? "active" : ""}`}
      >
        Elements
      </button>
    </li>

    {/* INSTRUCTIONS TAB */}
    <li>
      <button
        type="button"
        onClick={() => {
          setActiveTab("instructions");
          sessionStorage.setItem("campaign_activeTab", "instructions");
        }}
        className={`button !pt-0 ${activeTab === "instructions" ? "active" : ""}`}
      >
        Instructions set
      </button>
    </li>

    {/* VT TAB */}
    <li>
      <button
        type="button"
        onClick={() => {
          setActiveTab("ct");
          sessionStorage.setItem("campaign_activeTab", "ct");
        }}
        className={`button !pt-0 ${activeTab === "ct" ? "active" : ""}`}
      >
        VT (unpopulated)
      </button>
    </li>

  </ul>
</div>

          </div>

          <div className="tab-content">
            {activeTab === "build" && (
              <button
                onClick={() => setIsSectionOpen(!isSectionOpen)}
                className="w-[40px] h-[40px] flex items-center justify-center rounded-md bg-gray-200 hover:bg-gray-300 ml-auto mb-[10px] mt-[-24px]"
              >
                {/* <FontAwesomeIcon
                  icon={faBars}
                  className=" text-[#333333] text-2xl"
                /> */}
                 <img
    src={downArrow}
    alt="toggle"
    className="w-[24px] h-[24px] object-contain"
  />
              </button>
            )}

            {/* 1️⃣ BUILD TAB (CHAT) */}
            {activeTab === "build" && (
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
                previewText={previewText}
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
                isSectionOpen={isSectionOpen}
                setIsSectionOpen={setIsSectionOpen}
              />
            )}

            {/* 2️⃣ ELEMENTS TAB */}
            {activeTab === "elements" && (
              <div className="elements-tab-container">
                <h3>Detected Placeholder Values</h3>
                <pre>{JSON.stringify(placeholderValues, null, 2)}</pre>
              </div>
            )}

            {/* 3️⃣ INSTRUCTIONS SET TAB */}
            {activeTab === "instructions" && (
              <div className="instructions-wrapper">

                {/* =======================================================
                    TOP HEADER SECTION (Picklist + Inputs + Buttons)
                 ======================================================== */}
                <div className="instructions-header" style={{ marginTop: "-43px" }}>

                  {/* Load Template Definition */}
                  <div className="load-template-box">
                    <label className="section-label">Load Existing Template Definition</label>
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
                      <label className="section-label">Template Name</label>
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
          <label className="section-label">Select GPT Model</label>
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
  <label className="section-label">Search URL Count</label>
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
                          {isSavingDefinition ? "Saving..." : "Save Template Definition"}
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
                          {isSavingDefinition ? "Updating..." : "Update Template Definition"}
                        </button>
                      )}


                      <button
                        className="start-btn"
                        onClick={startConversation}
                        disabled={!selectedTemplateDefinitionId}
                      >
                        Start Filling Placeholders →
                      </button>
                      <button
                        className="new-btn"
                        onClick={createNewInstruction}
                      >
                        + New Instruction
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
        ["ai_new", "AI Instructions (new blueprint)"],
        ["ai_edit", "AI Instructions (edit blueprint)"],
        ["placeholder_short", "Placeholders list (essential)"],
        ["placeholder_long", "Placeholders list (extended)"],
        ["ct", "CT (unpopulated)"],
        ["subject_instructions", "Email Subject Instructions"]

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

  {instructionSubTab === "placeholder_long" && (
    <SimpleTextarea
      value={masterPromptExtensive}
      onChange={(e: any) => setMasterPromptExtensive(e.target.value)}
      placeholder="Extended placeholder list..."
    />
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



            {/* 4️⃣ CT UNPOPULATED */}
{/* 4️⃣ CT UNPOPULATED */}
{activeTab === "ct" && (
  <div className="ct-tab-container">
    <h3>Master Campaign Template (Unpopulated)</h3>

    <div className="instruction-subtab-content">
      <SimpleTextarea
        value={previewText}
        onChange={(e: any) => setPreviewText(e.target.value)}
        placeholder="Unpopulated master template..."
      />
    </div>
  </div>
)}


          </div>

        </div>


      </div>
    </div>
  );
};

export default MasterPromptCampaignBuilder;

