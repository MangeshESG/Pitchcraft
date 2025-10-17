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
}

interface ResultTabProps {
  isComplete: boolean;
  finalPrompt: string;
  finalPreviewText: string;
  previewText: string;
  copied: boolean;
  copyToClipboard: (text: string) => void;
  resetAll: () => void;
  systemPrompt: string;
  masterPrompt: string;
  placeholderValues: Record<string, string>;
  selectedModel: string;
  effectiveUserId: string | null;
  messages: Message[];
  selectedTemplateDefinitionId: number | null;
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


interface ConversationTabProps {
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
  // ✅ NEW PROPS for edit mode
  isEditMode?: boolean;
  availablePlaceholders?: string[];
  placeholderValues?: Record<string, string>;
  onPlaceholderSelect?: (placeholder: string) => void;
  selectedPlaceholder?: string;
}

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
  selectedPlaceholder
}) => {
  const renderMessageContent = (content: string) => {
    const isHtml = /<[a-z][\s\S]*>/i.test(content);
    if (isHtml) {
      return <div className="rendered-html-content" dangerouslySetInnerHTML={{ __html: content }} />;
    } else {
      return <p className="message-content">{content}</p>;
    }
  };

  return (
    <div className="conversation-container">
      {/* ✅ NEW: Placeholder Selector for Edit Mode */}
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
        {conversationStarted && (
          <button
            onClick={resetAll}
            className="clear-history-button"
            title="Clear history and start fresh"
          >
            <XCircle size={16} />
            Clear History
          </button>
        )}
        
        {!conversationStarted && !isEditMode ? (
          <div className="empty-conversation">
            <div className="empty-conversation-content">
              <MessageSquare size={48} className="empty-conversation-icon" />
              <p className="empty-conversation-text">Start by entering your template in the 'Template' tab.</p>
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
                    <span className="typing-text">Campaign Builder is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        ) : null}
      </div>
      
      {conversationStarted && !isComplete && (
        <div className="input-area">
          <div className="input-container">
            <textarea
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
  );
};

const ResultTab: React.FC<ResultTabProps> = ({ 
  isComplete, 
  finalPrompt, 
  finalPreviewText, 
  previewText, 
  copied, 
  copyToClipboard, 
  resetAll,
  systemPrompt,
  masterPrompt,
  placeholderValues,
  selectedModel,
  effectiveUserId,
  messages,
  selectedTemplateDefinitionId
}) => {
  const [copiedItem, setCopiedItem] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleCopy = (text: string, item: string) => {
    copyToClipboard(text);
    setCopiedItem(item);
    setTimeout(() => setCopiedItem(""), 2000);
  };

  const saveCampaignTemplate = async () => {
    if (!effectiveUserId) {
      alert("User ID is required");
      return;
    }

    if (!selectedTemplateDefinitionId || selectedTemplateDefinitionId <= 0) {
      alert("Please create or select a template definition first");
      return;
    }

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const response = await axios.post(`${API_BASE_URL}/api/CampaignPrompt/template/save`, {
        clientId: effectiveUserId,
        templateDefinitionId: selectedTemplateDefinitionId,
        placeholderListWithValue: finalPrompt,
        campaignBlueprint: finalPreviewText,
        placeholderValues: placeholderValues,
        selectedModel: selectedModel,
        conversationMessages: messages.map(msg => ({
          type: msg.type,
          content: msg.content,
          timestamp: msg.timestamp
        }))
      });

      if (response.data.success) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const renderContent = (content: string) => {
    if (!content) return null;
    const isHtml = /<[a-z][\s\S]*>/i.test(content.trim());

    if (isHtml) {
      return (
        <div
          className="result-content"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    } else {
      return (
        <pre className="result-content" style={{ whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
          {content}
        </pre>
      );
    }
  };

  return (
    <div className="result-tab">
      {!isComplete ? (
        <div className="empty-result">
          <div className="empty-result-content">
            <CheckCircle size={48} className="empty-result-icon" />
            <p className="empty-result-text">
              Complete the conversation to see your final template.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="result-header">
            <h2>
              <Check className="success-icon" /> Your Completed Campaign Template
            </h2>
            <p>
              All placeholders have been replaced based on your conversation.
            </p>
          </div>

          {previewText && finalPreviewText ? (
            <div className="result-section campaign-template">
              <h3>Campaign Template:</h3>
              {renderContent(finalPreviewText)}
              <button
                onClick={() => handleCopy(finalPreviewText, "preview")}
                className="copy-button"
              >
                {copiedItem === "preview" ? (
                  <>
                    <Check size={16} /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} /> Copy Campaign Template
                  </>
                )}
              </button>
            </div>
          ) : (
            <div style={{ textAlign: "center", color: "#6b7280" }}>
              <p>No campaign template was provided.</p>
            </div>
          )}

          {finalPrompt && (
            <div className="result-section">
              <h3>Master Campaign Result:</h3>
              {renderContent(finalPrompt)}
              <button
                onClick={() => handleCopy(finalPrompt, "master")}
                className="copy-button"
              >
                {copiedItem === "master" ? (
                  <>
                    <Check size={16} /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} /> Copy Master Campaign
                  </>
                )}
              </button>
            </div>
          )}

          <div className="save-template-section">
            <h3>Save Campaign</h3>
            {!selectedTemplateDefinitionId && (
              <p className="warning-text" style={{ marginBottom: '10px' }}>
                ⚠️ No template definition selected. Please create one from the Template tab first.
              </p>
            )}
            <div className="save-template-form">
              <button 
                onClick={saveCampaignTemplate} 
                disabled={isSaving || !selectedTemplateDefinitionId}
                className="save-template-button"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="spinning" /> Saving...
                  </>
                ) : saveStatus === 'success' ? (
                  <>
                    <CheckCircle size={16} /> Saved!
                  </>
                ) : saveStatus === 'error' ? (
                  <>
                    <XCircle size={16} /> Failed
                  </>
                ) : (
                  <>
                    <FileText size={16} /> Save Campaign
                  </>
                )}
              </button>
            </div>
            {saveStatus === 'success' && (
              <p className="success-message">Campaign saved successfully!</p>
            )}
            {saveStatus === 'error' && (
              <p className="error-message">Failed to save campaign. Please try again.</p>
            )}
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <button onClick={resetAll} className="reset-button">
              <RefreshCw size={20} /> Start Over
            </button>
          </div>
        </>
      )}
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

  // ✅ ADD MISSING EDIT MODE STATES
  const [isEditMode, setIsEditMode] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState<number | null>(null);
  const [originalTemplateData, setOriginalTemplateData] = useState<any>(null);
  const [selectedPlaceholder, setSelectedPlaceholder] = useState<string>("");
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);

  // ✅ Add selectedTemplateDefinitionId state
  const [selectedTemplateDefinitionId, setSelectedTemplateDefinitionId] = useState<number | null>(null);

  const [messages, setMessages] = useSessionState<Message[]>("campaign_messages", []);
  const [finalPrompt, setFinalPrompt] = useSessionState<string>("campaign_final_prompt", "");
  const [finalPreviewText, setFinalPreviewText] = useSessionState<string>("campaign_final_preview", "");
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

  // ✅ NEW - Save template definition function
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
        
        // Reload template definitions
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

  // ✅ NEW - Load a specific template definition
  const loadTemplateDefinitionById = async (id: number) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/CampaignPrompt/template-definition/${id}`);
      const def = response.data;
      
      setTemplateName(def.templateName);
      setSystemPrompt(def.aiInstructions || "");
      setSystemPromptForEdit(def.aiInstructionsForEdit || "");
      setMasterPrompt(def.placeholderList || "");
      setMasterPromptExtensive(def.placeholderListExtensive || "");
      setPreviewText(def.masterBlueprintUnpopulated || "");
      setSelectedTemplateDefinitionId(def.id);
      
      // Show success message
      alert(`Template "${def.templateName}" loaded successfully!`);
    } catch (error) {
      console.error('Error loading template definition:', error);
      alert('Failed to load template definition');
    }
  };


  useEffect(() => {
    const templateId = sessionStorage.getItem('editTemplateId');
    const editMode = sessionStorage.getItem('editTemplateMode');
    
    if (templateId && editMode === 'true') {
      clearAllSessionData();
      
      setEditTemplateId(parseInt(templateId));
      setIsEditMode(true);
      setActiveTab('conversation'); // ✅ Go directly to conversation tab
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
    sessionStorage.removeItem("campaign_template_name"); // ✅ NEW
  };

const loadTemplateForEdit = async (templateId: number) => {
  setIsLoadingTemplate(true);
  try {
    const response = await axios.get(`${API_BASE_URL}/api/CampaignPrompt/campaign/${templateId}`);
    const template = response.data;
    
    setOriginalTemplateData(template);
    
    setMessages([]);
    setConversationStarted(false);
    setIsComplete(false);
    
    // ✅ Load AI instructions from database
    setSystemPrompt(template.aiInstructions || "");
    setSystemPromptForEdit(template.aiInstructionsForEdit || "");
    setMasterPrompt(template.placeholderList || "");
    setMasterPromptExtensive(template.placeholderListExtensive || "");
    setPreviewText(template.masterBlueprintUnpopulated || "");
    setSelectedModel(template.selectedModel || "gpt-5");
    setSelectedTemplateDefinitionId(template.templateDefinitionId || null);
    setTemplateName(template.templateName || "");
    
    if (template.placeholderValues) {
      setPlaceholderValues(template.placeholderValues);
    } else {
      setPlaceholderValues({});
    }
    
    if (template.placeholderListWithValue && template.campaignBlueprint) {
      setFinalPrompt(template.placeholderListWithValue);
      setFinalPreviewText(template.campaignBlueprint);
      setIsComplete(true);
    }
    
    // ✅ Go directly to conversation tab in edit mode
    setActiveTab('conversation');
  } catch (error) {
    console.error('Error loading template:', error);
    alert('Failed to load template for editing');
    setIsEditMode(false);
  } finally {
    setIsLoadingTemplate(false);
  }
};


const startEditConversation = async (placeholder: string) => {
  if (!effectiveUserId || !placeholder) return;
  
  setSelectedPlaceholder(placeholder);
  setMessages([]);
  setConversationStarted(true);
  setIsComplete(false);
  setIsTyping(true);
  
  const currentValue = placeholderValues[placeholder] || "not set";
  
  // ✅ Use systemPromptForEdit from database (loaded in loadTemplateForEdit)
  let editSystemPrompt = "";
  
  if (systemPromptForEdit && systemPromptForEdit.trim() !== "") {
    // Use the AI instructions for editing from the database
    editSystemPrompt = systemPromptForEdit
      .replace(/{placeholder}/g, placeholder)
      .replace(/{currentValue}/g, currentValue);
  } else {
    // Fallback to default instructions if none in database
    editSystemPrompt = `You are an AI assistant helping to edit a specific placeholder value in a campaign template. 
The user wants to modify the value for {${placeholder}}.
Current value: "${currentValue}"

Your task:
1. Ask the user what new value they want for {${placeholder}}
2. Confirm the new value with them
3. When confirmed, return the response in this EXACT format:

==PLACEHOLDER_UPDATE_START==
{${placeholder}} = [new value here]
==PLACEHOLDER_UPDATE_END==

{
  "status": "complete",
  "updated_placeholder": "${placeholder}",
  "old_value": "${currentValue}",
  "new_value": "[new value here]"
}`;
  }
  
  try {
    const response = await axios.post(`${API_BASE_URL}/api/CampaignPrompt/chat`, {
      userId: effectiveUserId,
      message: `I want to change the value of {${placeholder}}. Current value is: "${currentValue}"`,
      systemPrompt: editSystemPrompt,
      model: selectedModel
    });
    
    const data = response.data.response;
    if (data && data.assistantText) {
      const botMessage: Message = { 
        type: 'bot', 
        content: data.assistantText, 
        timestamp: new Date() 
      };
      setMessages([botMessage]);
      playNotificationSound();
    }
  } catch (error) {
    console.error('Error starting edit conversation:', error);
    const errorMessage: Message = { 
      type: 'bot', 
      content: 'Sorry, I couldn\'t start the edit conversation. Please try again.', 
      timestamp: new Date() 
    };
    setMessages([errorMessage]);
  } finally {
    setIsTyping(false);
  }
};


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

  const availableModels: GPTModel[] = [
    { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Latest GPT-4.1 model' },
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', description: 'Efficient GPT-4.1 model' },
    { id: 'gpt-5', name: 'GPT-5', description: 'Standard flagship model' },
    { id: 'gpt-5-mini', name: 'GPT-5 Mini', description: 'Lightweight, efficient, cost-effective' },
    { id: 'gpt-5-nano', name: 'GPT-5 Nano', description: 'Ultra-fast, minimal resource usage' },
  ];

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

  const replacePlaceholdersInText = (text: string, values: Record<string, string>, allowedPlaceholders: string[]): string => {
    let result = text;
    Object.entries(values).forEach(([key, value]) => {
      if (allowedPlaceholders.includes(key)) {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        result = result.replace(regex, value);
      }
    });
    return result;
  };
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (conversationStarted && !isEditMode) {
      resetAll();
    }
  }, [selectedClient]);

  const startConversation = async () => {
    if (!effectiveUserId) {
        alert("Cannot start conversation: No client ID is available.");
        return;
    }
    if (systemPrompt.trim() === '' || masterPrompt.trim() === '') {
        alert("Please provide both the AI Instructions and the Master Template before starting.");
        return;
    }

    setMessages([]);
    setFinalPrompt('');
    setFinalPreviewText('');
    setPlaceholderValues({});
    setIsComplete(false);
    setConversationStarted(true);
    setActiveTab('conversation');
    setIsTyping(true);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/CampaignPrompt/chat`, {
        userId: effectiveUserId,
        message: masterPrompt,
        systemPrompt: systemPrompt,
        model: selectedModel
      });
      const data = response.data.response;
      if (data && data.assistantText) {
        const botMessage: Message = { type: 'bot', content: data.assistantText, timestamp: new Date() };
        setMessages([botMessage]);
        playNotificationSound();
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      const errorMessage: Message = { type: 'bot', content: 'Sorry, I couldn\'t start the conversation. Please check the API connection and try again.', timestamp: new Date() };
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
      timestamp: new Date() 
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentAnswer('');
    setIsTyping(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/CampaignPrompt/chat`, {
        userId: effectiveUserId,
        message: userMessage.content,
        systemPrompt: "",
        model: selectedModel
      });

      const data = response.data.response;

      if (isEditMode && data && data.assistantText) {
        const updateMatch = data.assistantText.match(/==PLACEHOLDER_UPDATE_START==([\s\S]*?)==PLACEHOLDER_UPDATE_END==/);
        
        if (updateMatch) {
          const updateSection = updateMatch[1].trim();
          const placeholderRegex = /(?:\{)?([^{}=]+?)(?:\})?\s*=\s*([\s\S]+)/;
          const match = placeholderRegex.exec(updateSection);
          
          if (match) {
            const placeholder = match[1].trim();
            const newValue = match[2].trim();
            
            console.log(`Updating placeholder: ${placeholder} with value: ${newValue}`);
            
            const updatedValues = { ...placeholderValues, [placeholder]: newValue };
            setPlaceholderValues(updatedValues);
            
            const allowedPlaceholders = extractPlaceholders(masterPrompt);
            const filledMaster = replacePlaceholdersInText(masterPrompt, updatedValues, allowedPlaceholders);
            setFinalPrompt(filledMaster);
            
            const previewPlaceholders = extractPlaceholders(previewText);
            const filledPreview = replacePlaceholdersInText(previewText, updatedValues, previewPlaceholders);
            setFinalPreviewText(filledPreview);
            
            try {
              await updateTemplateInDatabase(updatedValues);
              
              const completionMessage: Message = { 
                type: 'bot', 
                content: `✅ Successfully updated {${placeholder}} to "${newValue}". The template has been saved.`, 
                timestamp: new Date() 
              };
              setMessages(prev => [...prev, completionMessage]);
              playNotificationSound();
              
              if (effectiveUserId) {
                axios.post(`${API_BASE_URL}/api/CampaignPrompt/history/${effectiveUserId}/clear`)
                  .catch(err => console.error("Failed to clear history:", err));
              }
              
              // ✅ After successful update, reset conversation to show dropdown again
              setTimeout(() => {
                setConversationStarted(false);
                setMessages([]);
                setSelectedPlaceholder("");
                setIsComplete(true); // Show updated results in result tab
              }, 2000);
            } catch (saveError) {
              console.error('Error saving template:', saveError);
              const errorMessage: Message = { 
                type: 'bot', 
                content: '❌ Updated the value locally but failed to save to database. Please try saving again.', 
                timestamp: new Date() 
              };
              setMessages(prev => [...prev, errorMessage]);
            }
            
            return;
          }
        }
      }
      
      if (!isEditMode && data && data.isComplete) {
        console.log('✅ Campaign completed!');
        
        const assistantText = data.assistantText || '';
        const placeholderValuesMatch = assistantText
          .match(/==PLACEHOLDER_VALUES_START==([\s\S]*?)==PLACEHOLDER_VALUES_END==/);

        if (placeholderValuesMatch) {
          const tempValues: Record<string, string> = {};
          const placeholderSection = placeholderValuesMatch[1];
          
          const placeholderRegex = /\{([^}]+)\}\s*=\s*([\s\S]*?)(?=\n\{[^}]+\}\s*=|$)/g;
          let match;
          
          while ((match = placeholderRegex.exec(placeholderSection)) !== null) {
            const placeholder = match[1].trim();
            const value = match[2].trim();
            tempValues[placeholder] = value;
          }

          console.log('Extracted placeholder values:', tempValues);

          const allowedPlaceholders = extractPlaceholders(masterPrompt);
          setPlaceholderValues(tempValues);

          const filledMaster = replacePlaceholdersInText(masterPrompt, tempValues, allowedPlaceholders);
          setFinalPrompt(filledMaster);

          const previewPlaceholders = extractPlaceholders(previewText);
          const filledPreview = replacePlaceholdersInText(previewText, tempValues, previewPlaceholders);
          setFinalPreviewText(filledPreview);

          setIsComplete(true);

          const completionMessage: Message = { 
            type: 'bot', 
            content: "🎉 Great! I've filled in all the placeholders. Check the 'Final Result' tab.", 
            timestamp: new Date() 
          };
          setMessages(prev => [...prev, completionMessage]);
          playNotificationSound();

          setTimeout(() => setActiveTab('result'), 1500);
          return;
        }
      }

      if (data && data.assistantText) {
        const botMessage: Message = { 
          type: 'bot', 
          content: data.assistantText, 
          timestamp: new Date() 
        };
        setMessages(prev => [...prev, botMessage]);
        playNotificationSound();
      }

    } catch (error) {
      console.error('❌ Error sending message:', error);
      const errorMessage: Message = { 
        type: 'bot', 
        content: 'Sorry, there was an error processing your answer. Please try again.', 
        timestamp: new Date() 
      };
      setMessages(prev => [...prev, errorMessage]);
      playNotificationSound();
    } finally {
      setIsTyping(false);
    }
  };

  const updateTemplateInDatabase = async (updatedPlaceholderValues: Record<string, string>) => {
    if (!editTemplateId || !originalTemplateData) return;

    try {
      const allowedPlaceholders = extractPlaceholders(masterPrompt);
      const updatedFilledMaster = replacePlaceholdersInText(masterPrompt, updatedPlaceholderValues, allowedPlaceholders);
      
      const previewPlaceholders = extractPlaceholders(previewText);
      const updatedFilledPreview = replacePlaceholdersInText(previewText, updatedPlaceholderValues, previewPlaceholders);

      const response = await axios.post(`${API_BASE_URL}/api/CampaignPrompt/template/update`, {
        id: editTemplateId,
        placeholderListWithValue: updatedFilledMaster,
        campaignBlueprint: updatedFilledPreview,
        selectedModel: selectedModel,
        placeholderValues: updatedPlaceholderValues,
      });

      if (!response.data.success) {
        throw new Error('Failed to update template');
      }
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  };

 

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
    setTemplateName(""); // ✅ NEW

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

  const currentPlaceholders = extractPlaceholders(masterPrompt);

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

    {/* ✅ REMOVED: EditInstructionsModal */}
    {/* ✅ REMOVED: PlaceholderPicker */}

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
        <div className="campaign-header">
          <div className="campaign-header-content">
            <h1>
              <Globe className="campaign-header-icon" />
              Campaign blueprint builder
              {isEditMode && (
                <span className="edit-mode-badge">Edit mode</span>
              )}
            </h1>
            <p>
              {isEditMode 
                ? `Editing template: ${originalTemplateData?.templateName || 'Loading...'}`
                : 'Create personalized email campaigns through a dynamic conversation.'
              }
            </p>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="sound-toggle-button"
            title={soundEnabled ? "Mute notifications" : "Enable notifications"}
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>
        
        <div className="tab-navigation">
          <div className="tab-container">
            <button 
              onClick={() => setActiveTab('template')} 
              className={`tab-button ${activeTab === 'template' ? 'active' : ''}`}
              disabled={isEditMode} // ✅ Disable template tab in edit mode
            >
              <FileText className="tab-button-icon" />
              <span className="tab-button-text-desktop">Template</span>
              <span className="tab-button-text-mobile">Setup</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('conversation')} 
              className={`tab-button ${activeTab === 'conversation' ? 'active' : ''}`} 
              disabled={!conversationStarted && !isEditMode}
            >
              <MessageSquare className="tab-button-icon" />
              <span className="tab-button-text-desktop">Conversation</span>
              <span className="tab-button-text-mobile">Chat</span>
              {conversationStarted && !isComplete && <span className="status-indicator active"></span>}
            </button>
            
            <button 
              onClick={() => setActiveTab('result')} 
              className={`tab-button ${activeTab === 'result' ? 'active' : ''}`} 
              disabled={!isComplete && !isEditMode}
            >
              <CheckCircle className="tab-button-icon" />
              <span className="tab-button-text-desktop">Final Result</span>
              <span className="tab-button-text-mobile">Result</span>
              {isComplete && <span className="status-indicator complete"></span>}
            </button>
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
              // ✅ NEW: Pass edit mode props
              isEditMode={isEditMode}
              availablePlaceholders={extractPlaceholders(masterPrompt)}
              placeholderValues={placeholderValues}
              onPlaceholderSelect={startEditConversation}
              selectedPlaceholder={selectedPlaceholder}
            />
          )}
          {activeTab === 'result' && (
            <ResultTab
              isComplete={isComplete || isEditMode}
              finalPrompt={finalPrompt}
              finalPreviewText={finalPreviewText}
              previewText={previewText}
              copied={copied}
              copyToClipboard={copyToClipboard}
              resetAll={resetAll}
              systemPrompt={systemPrompt}
              masterPrompt={masterPrompt}
              placeholderValues={placeholderValues}
              selectedModel={selectedModel}
              effectiveUserId={effectiveUserId}
              messages={messages}
              selectedTemplateDefinitionId={selectedTemplateDefinitionId}
            />
          )}
        </div>
      </div>

      <details className="tips-section">
        <summary className="tips-header">
          <Eye size={20} className="icon" />
          How to Use
        </summary>
        <div className="tips-grid">
          <div className="tip-item">
            <div className="tip-number">1</div>
            <div className="tip-content">
              <h4>Select Model & Enter Templates</h4>
              <p>Choose your GPT-5 model, define AI instructions, master template, and optional additional text with {'{'}placeholders{'}'}.</p>
            </div>
          </div>
          <div className="tip-item">
            <div className="tip-number">2</div>
            <div className="tip-content">
              <h4>Chat with the AI</h4>
              <p>Answer the AI's questions to provide values for each placeholder.</p>
            </div>
          </div>
          <div className="tip-item">
            <div className="tip-number">3</div>
            <div className="tip-content">
              <h4>Get Final Results</h4>
              <p>View your completed templates with all placeholders filled with actual values.</p>
            </div>
          </div>
        </div>
        <div className="tip-highlight">
          <p>
            <span className="highlight">💡 Tip:</span> 
            {isEditMode 
              ? "In edit mode, select a placeholder from the dropdown to start editing. The AI will use the edit instructions defined in the template definition."
              : "The additional text field is perfect for email signatures, disclaimers, or any content that shares the same placeholder values as your main template."
            }
          </p>
        </div>
      </details>
    </div>
  </div>
);
};

export default MasterPromptCampaignBuilder;
