import React, { useState, useRef, useEffect } from 'react';
import { Send, Copy, Check, Loader2, RefreshCw, Globe, Eye, FileText, MessageSquare, CheckCircle, XCircle, ChevronDown, Volume2, VolumeX } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from "../../config";
import './EmailCampaignBuilder.css';
import notificationSound from '../../assets/sound/notification.mp3';
import { AlertCircle } from 'lucide-react';

// --- Type Definitions ---
interface Message {
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

type TabType = 'template' | 'conversation' | 'result';

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
  previewText ,  // ✅ <-- add this line
  exampleOutput,
  regenerateExampleOutput,

  dataFiles,
  contacts,
  selectedDataFileId,
  selectedContactId,
  handleSelectDataFile,
  setSelectedContactId,
  applyContactPlaceholders  // 👈 add this

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
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
          {conversationStarted && !isComplete && (
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
<div className="example-section">
          <div className="example-header">
          {/* DATAFILE + CONTACT SELECTION */}
      <div className="example-datafile-section">
  
  <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
    <select
      className="datafile-dropdown"
      value={selectedDataFileId || ""}
      onChange={e => handleSelectDataFile(Number(e.target.value))}
    >
      <option value="">-- Select contact file --</option>
      {dataFiles.map(df => (
        <option key={df.id} value={df.id}>{df.name}</option>
      ))}
    </select>

    <select
      className="contact-dropdown"
      value={selectedContactId || ""}
      disabled={!contacts.length}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = Number(e.target.value);
        setSelectedContactId(id);
        if (id) {
          const sel = contacts.find(c => c.id === id);
          if (sel) applyContactPlaceholders(sel);  // ✅ direct call
        }
      }}  
       >
      <option value="">
        {contacts.length ? "-- Select contact --" : "Select contact "}
      </option>
      {contacts.map(c => (
        <option key={c.id} value={c.id}>{c.full_name}</option>
      ))}
    </select>
  </div>
</div>
            
            <div className="example-controls">
              <button 
                className="regenerate-btn" 
                onClick={regenerateExampleOutput}
                disabled={!conversationStarted}
              >
               Generate
              </button>
            </div>
          </div>

          <div className="example-body">
            {exampleOutput ? (
              <div
                className="example-content"
                dangerouslySetInnerHTML={{ __html: exampleOutput }}
              />
            ) : conversationStarted ? (
<div className="example-placeholder p-6 text-gray-700 bg-gray-50 rounded-2xl border border-gray-200 shadow-sm leading-relaxed">
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <span role="img" aria-label="info">💡</span> How this works
      </h3>
      <p className="mb-3">
        Once enough questions have been answered on the left conversation area,
        you can click <strong>“Generate”</strong> to preview what your personalized email
        will look like with real contact details.
      </p>
      <p className="mb-3">
        First, select a <strong>contact file</strong> and then choose contacts
        from the dropdown above. The preview will automatically update as you
        refine your campaign blueprint.
      </p>
      <p className="text-gray-500 italic">
        ✨ Tip: Adjust placeholders or content in your blueprint to instantly
        see changes reflected here.
      </p>
    </div>
            ) : (
              <div className="example-placeholder">
                <p>📧 Example output will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ====================================================================
// MAIN COMPONENT
// ====================================================================
const MasterPromptCampaignBuilder: React.FC<EmailCampaignBuilderProps> = ({ selectedClient }) => {
  // --- State Management ---
  const [activeTab, setActiveTab] = useState<TabType>('template');
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
      setSelectedTemplateDefinitionId(definitionId);
      setTemplateName(campaignName || "");

      setIsTyping(true);
      setActiveTab("conversation");

      await loadTemplateDefinitionById(definitionId);

      // ✅ small delay ensures builder UI fully ready
      setTimeout(() => {
        startConversation();
      }, 300);

      // ✅ clear flags so it doesn't re-trigger
      sessionStorage.removeItem("autoStartConversation");
      sessionStorage.removeItem("openConversationTab");
      return;
    }

    // Retry up to 10 times (every 300 ms)
    if (attempts < 10) {
      attempts++;
      setTimeout(tryAutoStart, 300);
    } else {
      console.log("⏳ No auto-start data found after retries — skipping.");
    }
  };

  tryAutoStart();
}, []);


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
          setContacts(res.data.contacts || []);
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

  // ====================================================================
  // ✅ UPDATED: Regenerate Button Handler (Manual Only)
  // ====================================================================
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
        createdBy: effectiveUserId
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
      setSelectedTemplateDefinitionId(def.id);

      console.log(`✅ Template loaded: ${def.templateName}`);
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
      } else if (template.campaignBlueprint) {
        setExampleOutput(template.campaignBlueprint);
      }

      setActiveTab("conversation");
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
    setActiveTab("conversation");
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
      if (data && data.assistantText) {
        const cleanText = cleanAssistantMessage(data.assistantText);
        const botMessage: Message = {
          type: "bot",
          content: cleanText,
          timestamp: new Date(),
        };
        setMessages([botMessage]);
        playNotificationSound();
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

  const userMessage: Message = {
    type: 'user',
    content: currentAnswer,
    timestamp: new Date(),
  };

  setMessages((prev) => [...prev, userMessage]);
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
          message: userMessage.content,
          model: selectedModel,
        }
      : {
          userId: effectiveUserId,
          message: userMessage.content,
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

    // ====================================================================
    // ✅ EXTRACT AND UPDATE PLACEHOLDERS FROM AI RESPONSE
    // ====================================================================
    if (data?.assistantText) {
      const cleanText = cleanAssistantMessage(data.assistantText);
      const match = data.assistantText.match(
        /==PLACEHOLDER_VALUES_START==([\s\S]*?)==PLACEHOLDER_VALUES_END==/
      );
      
      if (match) {
        const placeholderBlock = match[1];
        const lines = placeholderBlock.split(/\r?\n/).filter(Boolean);
        
        // ✅ Get current conversation and contact placeholders separately
        const currentConversationValues = getConversationPlaceholders(placeholderValues);
        const currentContactValues = getContactPlaceholders(placeholderValues);
        const updatedConversationValues = { ...currentConversationValues };

        // ✅ Parse and update ONLY conversation placeholders
        lines.forEach((line: string) => {
          const kv = line.match(/\{([^}]+)\}\s*=\s*(.+)/);
          if (kv) {
            const key = kv[1].trim();
            const value = kv[2].trim();
            
            // ✅ Only update if it's NOT a contact placeholder
            if (!CONTACT_PLACEHOLDERS.includes(key)) {
              updatedConversationValues[key] = value;
              console.log(`✅ Updated conversation placeholder: ${key}`);
            } else {
              console.log(`⏭️ Skipped contact placeholder: ${key}`);
            }
          }
        });

        // ✅ Merge for display (conversation + contact)
        const mergedForDisplay = getMergedPlaceholdersForDisplay(
          updatedConversationValues, 
          currentContactValues
        );
        
        setPlaceholderValues(mergedForDisplay);
        console.log('📦 Updated conversation placeholders:', Object.keys(updatedConversationValues));

        // ====================================================================
        // ❌ REMOVED: Search API auto-call
        // ❌ REMOVED: Example generation auto-call
        // User must click "Regenerate" button manually
        // ====================================================================

        // ====================================================================
        // 💾 SAVE ONLY CONVERSATION PLACEHOLDERS TO DATABASE
        // ====================================================================
        const storedId = sessionStorage.getItem('newCampaignId');
        const activeCampaignId = editTemplateId ?? (storedId ? Number(storedId) : null);

        if (activeCampaignId) {
          try {
            await axios.post(`${API_BASE_URL}/api/CampaignPrompt/template/update`, {
              id: activeCampaignId,
              placeholderValues: updatedConversationValues, // ✅ Only conversation placeholders
            });
            console.log('💾 Saved conversation placeholders to DB (no auto-generation)');
          } catch (err) {
            console.warn('⚠️ Failed to save placeholders:', err);
          }
        }
      }

      const botMessage: Message = {
        type: 'bot',
        content: cleanText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      playNotificationSound();
    }

    // ====================================================================
    // HANDLE COMPLETION
    // ====================================================================
    if (data.isComplete) {
      const completionMessage: Message = {
        type: 'bot',
        content: "🎉 Great! I've filled in all placeholders. Select a contact and click 'Regenerate' to see the personalized email.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, completionMessage]);
      setIsComplete(true);
      return;
    }

    // ====================================================================
    // EDIT MODE FINALIZATION
    // ====================================================================
    if (isEditMode && selectedPlaceholder && currentAnswer.trim()) {
      try {
        await finalizeEditPlaceholder(selectedPlaceholder, currentAnswer.trim());
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

      <div className="campaign-builder-container">
        <div className="campaign-builder-main">
          
<div className="tab-navigation">
  <div className="tab-container">

    <button 
      onClick={() => setActiveTab('conversation')} 
      className={`tab-button ${activeTab === 'conversation' ? 'active' : ''}`} 
      disabled={!conversationStarted && !isEditMode}
    >
      <MessageSquare className="tab-button-icon" />
      <span className="tab-button-text-desktop">Conversation</span>
      <span className="tab-button-text-mobile">Chat</span>
      {conversationStarted && !isComplete && (
        <span className="status-indicator active"></span>
      )}
    </button>

    {/* ✅ Settings tab visible only for ADMIN */}
    {userRole === "ADMIN" && (
      <button 
        onClick={() => setActiveTab('template')} 
        className={`tab-button ${activeTab === 'template' ? 'active' : ''}`}
        disabled={isEditMode}
      >
        <FileText className="tab-button-icon" />
        <span className="tab-button-text-mobile">Setup</span>
        <span className="tab-button-text-desktop">Settings</span>
      </button>
    )}

  </div>
</div>


          <div className="tab-content">
            {activeTab === 'template' && !isEditMode && (
              <TemplateTab 
                masterPrompt={masterPrompt}
                setMasterPrompt={setMasterPrompt}
                masterPromptExtensive={masterPromptExtensive}
                setMasterPromptExtensive={setMasterPromptExtensive}
                systemPrompt={systemPrompt}
                setSystemPrompt={setSystemPrompt}
                systemPromptForEdit={systemPromptForEdit}
                setSystemPromptForEdit={setSystemPromptForEdit}
                previewText={previewText}
                setPreviewText={setPreviewText}
                startConversation={startConversation}
                currentPlaceholders={currentPlaceholders}
                extractPlaceholders={extractPlaceholders}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                availableModels={availableModels}
                saveTemplateDefinition={saveTemplateDefinition}
                isSavingDefinition={isSavingDefinition}
                saveDefinitionStatus={saveDefinitionStatus}
                templateDefinitions={templateDefinitions}
                loadTemplateDefinition={loadTemplateDefinitionById}
                selectedTemplateDefinitionId={selectedTemplateDefinitionId}
                templateName={templateName}
                setTemplateName={setTemplateName}
              />
            )}
            {activeTab === 'conversation' && (
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
              />
            )}
          </div>
        </div>


      </div>
    </div>
  );
};

export default MasterPromptCampaignBuilder;

