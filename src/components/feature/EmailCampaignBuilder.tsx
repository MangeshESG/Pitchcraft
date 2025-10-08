import React, { useState, useRef, useEffect } from 'react';
import { Send, Copy, Check, Loader2, RefreshCw, Globe, Eye, FileText, MessageSquare, CheckCircle, XCircle, ChevronDown, Volume2, VolumeX } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from "../../config";
import './EmailCampaignBuilder.css';
import notificationSound from '../../assets/sound/notification.mp3';

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
interface TemplateTabProps {
  masterPrompt: string;
  setMasterPrompt: (value: string) => void;
  systemPrompt: string;
  setSystemPrompt: (value: string) => void;
  previewText: string;
  setPreviewText: (value: string) => void;
  startConversation: () => void;
  currentPlaceholders: string[];
  extractPlaceholders: (text: string) => string[];
  selectedModel: string;
  setSelectedModel: (value: string) => void;
  availableModels: GPTModel[];
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

// Updated ResultTabProps with additional props
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
  systemPrompt, setSystemPrompt,
  previewText, setPreviewText,
  startConversation, currentPlaceholders,
  extractPlaceholders, selectedModel,
  setSelectedModel, availableModels
}) => {
  return (
    <div className="template-tab">
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
          />
        </div>
        <div>
          <div className="template-section">
            <h2>2. Placeholders List</h2>
            <p>Enter your {'{'}placeholders{'}'} for the AI to fill.</p>
          </div>
          <textarea
            value={masterPrompt}
            onChange={(e) => setMasterPrompt(e.target.value)}
            className="template-textarea"
            placeholder="e.g., Subject: Hi {name}, I noticed..."
          />
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
      
      <div className="start-button-container">
        <button
          onClick={startConversation}
          disabled={currentPlaceholders.length === 0 || systemPrompt.trim() === ''}
          className="start-button"
        >
          Start Filling Placeholders →
        </button>
      </div>
    </div>
  );
};

const ConversationTab: React.FC<ConversationTabProps> = ({
  conversationStarted, messages, isTyping, isComplete, currentAnswer, setCurrentAnswer, handleSendMessage, handleKeyPress, chatEndRef, resetAll
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
        {!conversationStarted ? (
          <div className="empty-conversation">
            <div className="empty-conversation-content">
              <MessageSquare size={48} className="empty-conversation-icon" />
              <p className="empty-conversation-text">Start by entering your template in the 'Template' tab.</p>
            </div>
          </div>
        ) : (
          <div className="messages-list">
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
        )}
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

// Updated ResultTab with save functionality
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
  messages
}) => {
  const [copiedItem, setCopiedItem] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [templateName, setTemplateName] = useState("");

  const handleCopy = (text: string, item: string) => {
    copyToClipboard(text);
    setCopiedItem(item);
    setTimeout(() => setCopiedItem(""), 2000);
  };

const saveCampaignTemplate = async () => {
  if (!effectiveUserId || !templateName.trim()) {
    alert("Please enter a template name");
    return;
  }

  setIsSaving(true);
  setSaveStatus('idle');

  try {
    const response = await axios.post(`${API_BASE_URL}/api/CampaignPrompt/template/save`, {
      clientId: effectiveUserId,
      templateName: templateName,
      aiInstructions: systemPrompt,  // Changed from systemPrompt
      placeholderListInfo: masterPrompt,  // Changed from masterPrompt
      masterBlueprintUnpopulated: previewText,  // Changed from previewText
      placeholderListWithValue: finalPrompt,  // Changed from finalPrompt
      campaignBlueprint: finalPreviewText,  // Changed from finalPreviewText
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
      setTemplateName('');
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

          {/* Campaign Template (Previously Additional Text Result) */}
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

          {/* Master Campaign Result */}
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

          {/* Save Template Section */}
          <div className="save-template-section">
            <h3>Save Campaign Template</h3>
            <div className="save-template-form">
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Enter template name..."
                className="template-name-input"
                disabled={isSaving}
              />
              <button 
                onClick={saveCampaignTemplate} 
                disabled={isSaving || !templateName.trim()}
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
                    <FileText size={16} /> Save Template
                  </>
                )}
              </button>
            </div>
            {saveStatus === 'success' && (
              <p className="success-message">Template saved successfully!</p>
            )}
            {saveStatus === 'error' && (
              <p className="error-message">Failed to save template. Please try again.</p>
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

  const [messages, setMessages] = useSessionState<Message[]>("campaign_messages", []);
  const [finalPrompt, setFinalPrompt] = useSessionState<string>("campaign_final_prompt", "");
  const [finalPreviewText, setFinalPreviewText] = useSessionState<string>("campaign_final_preview", "");
  const [placeholderValues, setPlaceholderValues] = useSessionState<Record<string, string>>("campaign_placeholder_values", {});
  const [isComplete, setIsComplete] = useSessionState<boolean>("campaign_is_complete", false);
  const [conversationStarted, setConversationStarted] = useSessionState<boolean>("campaign_started", false);
  const [systemPrompt, setSystemPrompt] = useSessionState<string>("campaign_system_prompt", "");
  const [masterPrompt, setMasterPrompt] = useSessionState<string>("campaign_master_prompt", "");
  const [previewText, setPreviewText] = useSessionState<string>("campaign_preview_text", "");
  const [selectedModel, setSelectedModel] = useSessionState<string>("campaign_selected_model", "gpt-5");
  
  const baseUserId = sessionStorage.getItem("clientId");
  const effectiveUserId = selectedClient || baseUserId;

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
    if (conversationStarted) {
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

    if (data && data.isComplete) {
      console.log('✅ Campaign completed!');
      
      const assistantText = data.assistantText || '';
      const placeholderValuesMatch = assistantText
        .match(/==PLACEHOLDER_VALUES_START==([\s\S]*?)==PLACEHOLDER_VALUES_END==/);

      if (placeholderValuesMatch) {
        const tempValues: Record<string, string> = {};
        const placeholderSection = placeholderValuesMatch[1];
        
        // Updated regex to handle multi-line values
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
    if (effectiveUserId) {
      // Changed from DELETE to POST
      axios.post(`${API_BASE_URL}/api/CampaignPrompt/history/${effectiveUserId}/clear`)
        .catch(err => console.error("Failed to clear history:", err));
    }

    sessionStorage.removeItem("campaign_messages");
    sessionStorage.removeItem("campaign_final_prompt");
    sessionStorage.removeItem("campaign_final_preview");
    sessionStorage.removeItem("campaign_placeholder_values");
    sessionStorage.removeItem("campaign_is_complete");
    sessionStorage.removeItem("campaign_started");
    sessionStorage.removeItem("campaign_system_prompt");
    sessionStorage.removeItem("campaign_master_prompt");
    sessionStorage.removeItem("campaign_preview_text");
    sessionStorage.removeItem("campaign_selected_model");

    setMessages([]);
    setFinalPrompt('');
    setFinalPreviewText('');
    setPlaceholderValues({});
    setIsComplete(false);
    setConversationStarted(false);
    setSystemPrompt("");
    setMasterPrompt("");
    setPreviewText("");
    setSelectedModel("gpt-5");
    setActiveTab('template');
  };

  const currentPlaceholders = extractPlaceholders(masterPrompt);

  return (
    <div className="email-campaign-builder">
      <div className="campaign-builder-container">
        <div className="campaign-builder-main">
          {/* Header with Sound Toggle */}
          <div className="campaign-header">
            <div className="campaign-header-content">
              <h1>
                <Globe className="campaign-header-icon" />
                AI Campaign Prompt Builder
              </h1>
              <p>Create personalized email campaigns through a dynamic conversation.</p>
            </div>
            {/* Sound Toggle Button */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="sound-toggle-button"
              title={soundEnabled ? "Mute notifications" : "Enable notifications"}
            >
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
          </div>
          
          {/* Tab Navigation */}
          <div className="tab-navigation">
            <div className="tab-container">
              <button 
                onClick={() => setActiveTab('template')} 
                className={`tab-button ${activeTab === 'template' ? 'active' : ''}`}
              >
                <FileText className="tab-button-icon" />
                <span className="tab-button-text-desktop">Template</span>
                <span className="tab-button-text-mobile">Setup</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('conversation')} 
                className={`tab-button ${activeTab === 'conversation' ? 'active' : ''}`} 
                disabled={!conversationStarted}
              >
                <MessageSquare className="tab-button-icon" />
                <span className="tab-button-text-desktop">Conversation</span>
                <span className="tab-button-text-mobile">Chat</span>
                {conversationStarted && !isComplete && <span className="status-indicator active"></span>}
              </button>
              
              <button 
                onClick={() => setActiveTab('result')} 
                className={`tab-button ${activeTab === 'result' ? 'active' : ''}`} 
                disabled={!isComplete}
              >
                <CheckCircle className="tab-button-icon" />
                <span className="tab-button-text-desktop">Final Result</span>
                <span className="tab-button-text-mobile">Result</span>
                {isComplete && <span className="status-indicator complete"></span>}
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'template' && (
              <TemplateTab 
                masterPrompt={masterPrompt}
                setMasterPrompt={setMasterPrompt}
                systemPrompt={systemPrompt}
                setSystemPrompt={setSystemPrompt}
                previewText={previewText}
                setPreviewText={setPreviewText}
                startConversation={startConversation}
                currentPlaceholders={currentPlaceholders}
                extractPlaceholders={extractPlaceholders}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                availableModels={availableModels}
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
              />
            )}
            {activeTab === 'result' && (
              <ResultTab
                isComplete={isComplete}
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
              />
            )}
          </div>
        </div>

        {/* Tips Section */}
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
              <span className="highlight">💡 Tip:</span> The additional text field is perfect for email signatures, disclaimers, or any content that shares the same placeholder values as your main template.
            </p>
          </div>
        </details>
      </div>
    </div>
  );
};

export default MasterPromptCampaignBuilder;