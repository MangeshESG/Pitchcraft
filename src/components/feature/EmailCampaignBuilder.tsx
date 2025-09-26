import React, { useState, useRef, useEffect } from 'react';
import { Send, Copy, Check, Loader2, RefreshCw, Globe, Eye, FileText, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from "../../config";
import './EmailCampaignBuilder.css';

// --- Type Definitions ---
interface Message {
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

type TabType = 'template' | 'conversation' | 'result';

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
}

// ====================================================================
// CHILD COMPONENTS
// ====================================================================

const TemplateTab: React.FC<TemplateTabProps> = ({
  masterPrompt, setMasterPrompt,
  systemPrompt, setSystemPrompt,
  previewText, setPreviewText,
  startConversation, currentPlaceholders,
  extractPlaceholders
}) => {
  return (
    <div className="template-tab">
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
            <h2>2. Master Template</h2>
            <p>Enter your template with {'{'}placeholders{'}'} for the AI to fill.</p>
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
          <h2>3. Additional Text with Placeholders (Optional)</h2>
          <p>Enter any additional text with placeholders. Values collected from the AI conversation will automatically replace matching placeholders here.</p>
          <p className="warning-text">⚠️ This text is NOT sent to the AI. Placeholders here will be filled with values from the master template conversation.</p>
        </div>
        <textarea
          value={previewText}
          onChange={(e) => setPreviewText(e.target.value)}
          className="additional-text-textarea"
          placeholder="e.g., Name-{name}&#10;Company-{company}&#10;Dear {name}, We at {company} are excited to connect with you..."
        />
      </div>
      
      <div className="placeholders-section">
        <h3>Detected Placeholders in Master Template:</h3>
        <div className="placeholders-container">
          {currentPlaceholders.length > 0 ? currentPlaceholders.map((p) => (
            <span key={p} className="placeholder-tag">{`{${p}}`}</span>
          )) : <span className="no-placeholders">No placeholders found in master template.</span>}
        </div>
        
        {previewText && (
          <div style={{ marginTop: '12px' }}>
            <h3>Placeholders in Additional Text:</h3>
            <div className="placeholders-container">
              {extractPlaceholders(previewText).length > 0 ? extractPlaceholders(previewText).map((p) => (
                <span key={p} className="placeholder-tag green">{`{${p}}`}</span>
              )) : <span className="no-placeholders">No placeholders found in additional text.</span>}
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

const ResultTab: React.FC<ResultTabProps> = ({ isComplete, finalPrompt, finalPreviewText, previewText, copied, copyToClipboard, resetAll }) => {
  const [copiedItem, setCopiedItem] = useState<string>('');

  const handleCopy = (text: string, item: string) => {
    copyToClipboard(text);
    setCopiedItem(item);
    setTimeout(() => setCopiedItem(''), 2000);
  };

  const renderContent = (content: string) => {
    const isHtml = /<[a-z][\s\S]*>/i.test(content);
    if (isHtml) {
      return <div className="rendered-html-content" dangerouslySetInnerHTML={{ __html: content }} />;
    } else {
      return <pre className="result-text">{content}</pre>;
    }
  };

  return (
    <div className="result-tab">
      {!isComplete ? (
        <div className="empty-result">
          <div className="empty-result-content">
            <CheckCircle size={48} className="empty-result-icon" />
            <p className="empty-result-text">Complete the conversation to see your final template.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="result-header">
            <h2>
              <Check className="success-icon" /> Your Completed Campaign Template
            </h2>
            <p>All placeholders have been replaced based on your conversation.</p>
          </div>
          
          {previewText && finalPreviewText ? (
            <div className="result-section">
              <h3>Additional Text Result:</h3>
              <div className="result-content">
                {renderContent(finalPreviewText)}
              </div>
              <button 
                onClick={() => handleCopy(finalPreviewText, 'preview')} 
                className="copy-button"
              >
                {copiedItem === 'preview' ? <><Check size={16} />Copied!</> : <><Copy size={16} />Copy Additional Text</>}
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              <p>No additional text template was provided.</p>
            </div>
          )}
          
          <div style={{ marginTop: '1.5rem' }}>
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
  const [masterPrompt, setMasterPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [finalPrompt, setFinalPrompt] = useState('');
  const [finalPreviewText, setFinalPreviewText] = useState('');
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // --- Session and API Configuration ---
    const baseUserId = sessionStorage.getItem("clientId");
  const effectiveUserId = selectedClient || baseUserId;

  // --- Helper Functions ---
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

  const replacePlaceholdersInText = (text: string, values: Record<string, string>): string => {
    let result = text;
    Object.entries(values).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, value);
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

  // --- Core Logic: API Communication ---
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
        model: "gpt-5"
      });
      const data = response.data.response;
      if (data && data.assistantText) {
        const botMessage: Message = { type: 'bot', content: data.assistantText, timestamp: new Date() };
        setMessages([botMessage]);
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      const errorMessage: Message = { type: 'bot', content: 'Sorry, I couldn\'t start the conversation. Please check the API connection and try again.', timestamp: new Date() };
      setMessages([errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async () => {
    if (currentAnswer.trim() === '' || isTyping || !effectiveUserId) return;
    
    const userMessage: Message = { type: 'user', content: currentAnswer, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setCurrentAnswer('');
    setIsTyping(true);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/CampaignPrompt/chat`, {
        userId: effectiveUserId,
        message: userMessage.content,
        systemPrompt: "",
        model: "gpt-5"
      });
      
      const data = response.data.response;
      
      if (data && data.assistantText) {
        // First, check if this is the raw JSON response we're looking for
        let jsonMatch = data.assistantText.match(/\{[\s\S]*?"status"\s*:\s*"complete"[\s\S]*?\}/);
        
        // If not found, it might be wrapped in HTML, so strip HTML first
        if (!jsonMatch) {
          const textWithoutHtml = data.assistantText.replace(/<[^>]*>/g, '');
          jsonMatch = textWithoutHtml.match(/\{[\s\S]*?"status"\s*:\s*"complete"[\s\S]*?\}/);
        }
        
        if (jsonMatch) {
          try {
            // Clean up the JSON string (remove HTML entities)
            let jsonString = jsonMatch[0];
            jsonString = jsonString.replace(/&quot;/g, '"');
            jsonString = jsonString.replace(/&lt;/g, '<');
            jsonString = jsonString.replace(/&gt;/g, '>');
            jsonString = jsonString.replace(/&amp;/g, '&');
            jsonString = jsonString.replace(/&#39;/g, "'");
            
            const completionData = JSON.parse(jsonString);
            
            if (completionData.status === "complete" && completionData.final_prompt) {
              console.log('Completion data found:', completionData);
              
              setFinalPrompt(completionData.final_prompt);
              
              // Extract placeholder values from the final_prompt
              const tempValues: Record<string, string> = {};
              
              // Look for patterns like "Company: ServiceJi" or "Website: serviceji.co"
              const patterns = [
                /Company:\s*([^\n]+)/i,
                /Website:\s*([^\n]+)/i,
                /Main Theme:\s*([^\n]+)/i,
                /About the Company:\s*([^]*?)(?=\n\n|\n[A-Z]|$)/i
              ];
              
              const placeholderMappings: Record<string, string> = {
                'Company': 'vendor_company',
                'Website': 'vendor_company_website_URL',
                'Main Theme': 'vendor_company_main_theme',
                'About the Company': 'about_the_company'
              };
              
              patterns.forEach((pattern, index) => {
                const match = completionData.final_prompt.match(pattern);
                if (match && match[1]) {
                  const key = Object.keys(placeholderMappings)[index];
                  const placeholder = placeholderMappings[key];
                  tempValues[placeholder] = match[1].trim();
                }
              });
              
              // Also try to extract from conversation history
              const allMessages = [...messages, userMessage];
              
              // Extract vendor_company from conversation
              for (let i = 0; i < allMessages.length; i++) {
                if (allMessages[i].type === 'user' && i > 0) {
                  const prevBot = allMessages[i-1];
                  if (prevBot.type === 'bot' && prevBot.content.toLowerCase().includes('company') && prevBot.content.toLowerCase().includes('name')) {
                    if (!tempValues['vendor_company']) {
                      tempValues['vendor_company'] = allMessages[i].content.trim();
                    }
                  }
                }
              }
              
              console.log('Extracted values:', tempValues);
              
              // Store the extracted values
              setPlaceholderValues(tempValues);
              
              // Apply these values to the preview text if it exists
              if (previewText && previewText.trim() !== '') {
                let filledText = previewText;
                
                // Replace all placeholders in the preview text with their values
                Object.entries(tempValues).forEach(([placeholder, value]) => {
                  const regex = new RegExp(`\\{${placeholder}\\}`, 'g');
                  filledText = filledText.replace(regex, value);
                });
                
                setFinalPreviewText(filledText);
                console.log('Filled preview text:', filledText);
              }
              
              setIsComplete(true);
              
              // Show completion message
              const completionMessage: Message = { 
                type: 'bot', 
                content: "🎉 Great! I've filled in all the placeholders. Check the 'Final Result' tab.", 
                timestamp: new Date() 
              };
              setMessages(prev => [...prev, completionMessage]);
              
              // Switch to result tab after delay
              setTimeout(() => setActiveTab('result'), 2000);
              return;
            }
          } catch (e) {
            console.error('Failed to parse completion JSON:', e);
            console.error('JSON string:', jsonMatch[0]);
          }
        }
        
        // If not complete, show the message normally
        const botMessage: Message = { type: 'bot', content: data.assistantText, timestamp: new Date() };
        setMessages(prev => [...prev, botMessage]);
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = { 
        type: 'bot', 
        content: 'Sorry, there was an error processing your answer. Please try again.', 
        timestamp: new Date() 
      };
      setMessages(prev => [...prev, errorMessage]);
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
        axios.delete(`${API_BASE_URL}/api/CampaignPrompt/history/${effectiveUserId}`).catch(err => console.error("Failed to clear history:", err));
    }
    setMessages([]);
    setFinalPrompt('');
    setFinalPreviewText('');
    setPlaceholderValues({});
    setIsComplete(false);
    setConversationStarted(false);
    setActiveTab('template');
  };

  const currentPlaceholders = extractPlaceholders(masterPrompt);

  return (
  <div className="email-campaign-builder">
    <div className="campaign-builder-container">

        <div className="campaign-builder-main">
          {/* Header */}
          <div className="campaign-header">
            <h1>
              <Globe className="campaign-header-icon" />
              AI Campaign Prompt Builder
            </h1>
            <p>Create personalized email campaigns through a dynamic conversation.</p>
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
                <h4>Enter Templates</h4>
                <p>Define AI instructions, master template, and optional additional text with {'{'}placeholders{'}'}.</p>
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