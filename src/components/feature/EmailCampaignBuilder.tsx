import React, { useState, useRef, useEffect } from 'react';
import { Send, Copy, Check, Loader2, RefreshCw, Globe, Eye, FileText, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from "../../config";


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
  startConversation: () => void;
  currentPlaceholders: string[];
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
  resetAll: () => void; // Add resetAll to props
}

interface ResultTabProps {
  isComplete: boolean;
  finalPrompt: string;
  copied: boolean;
  copyToClipboard: () => void;
  resetAll: () => void;
}

// ====================================================================
// CHILD COMPONENTS
// ====================================================================

const TemplateTab: React.FC<TemplateTabProps> = ({
  masterPrompt, setMasterPrompt,
  systemPrompt, setSystemPrompt,
  startConversation, currentPlaceholders
}) => (
  <div className="p-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <div className="mb-2">
          <h2 className="text-xl font-bold">1. AI Instructions (System Prompt)</h2>
          <p className="text-gray-600 text-sm">Define how the AI should behave and what its goal is.</p>
        </div>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          className="w-full h-96 p-4 border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
          placeholder="e.g., You are a helpful assistant. Your goal is to fill in the placeholders in the user's template..."
        />
      </div>
      <div>
        <div className="mb-2">
          <h2 className="text-xl font-bold">2. Master Template</h2>
          <p className="text-gray-600 text-sm">Enter your template with {'{'}placeholders{'}'} for the AI to fill.</p>
        </div>
        <textarea
          value={masterPrompt}
          onChange={(e) => setMasterPrompt(e.target.value)}
          className="w-full h-96 p-4 border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
          placeholder="e.g., Subject: Hi {name}, I noticed..."
        />
      </div>
    </div>
    <div className="mt-4">
      <h3 className="font-semibold mb-2">Detected Placeholders in Master Template:</h3>
      <div className="flex flex-wrap gap-2">
        {currentPlaceholders.length > 0 ? currentPlaceholders.map((p) => (
          <span key={p} className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-full">{`{${p}}`}</span>
        )) : <span className="text-sm text-gray-500">No placeholders found yet.</span>}
      </div>
    </div>
    <div className="mt-6 flex justify-center">
      <button
        onClick={startConversation}
        disabled={currentPlaceholders.length === 0 || systemPrompt.trim() === ''}
        className={`px-6 py-3 rounded-lg font-semibold transition-all ${currentPlaceholders.length === 0 || systemPrompt.trim() === '' ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 transform hover:scale-105'}`}
      >
        Start Filling Placeholders →
      </button>
    </div>
  </div>
);

const ConversationTab: React.FC<ConversationTabProps> = ({
  conversationStarted, messages, isTyping, isComplete, currentAnswer, setCurrentAnswer, handleSendMessage, handleKeyPress, chatEndRef, resetAll
}) => {
  const renderMessageContent = (content: string) => {
    const isHtml = /<[a-z][\s\S]*>/i.test(content);
    if (isHtml) {
      return <div dangerouslySetInnerHTML={{ __html: content }} />;
    } else {
      return <p className="whitespace-pre-wrap">{content}</p>;
    }
  };

  return (
    <div className="flex flex-col h-[700px]">
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50 relative">
        {conversationStarted && (
          // ====================================================================
          // NEW "Clear History" BUTTON
          // ====================================================================
          <div className="absolute top-4 right-4">
            <button
              onClick={resetAll}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
              title="Clear history and start fresh"
            >
              <XCircle size={16} />
              Clear History
            </button>
          </div>
        )}
        {!conversationStarted ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Start by entering your template in the 'Template' tab.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-12">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-2xl p-4 ${message.type === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 shadow-sm'}`}>
                  {renderMessageContent(message.content)}
                  <div className={`text-xs mt-2 ${message.type === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-sm text-gray-600">Campaign Builder is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>
      {conversationStarted && !isComplete && (
        <div className="border-t bg-white p-4">
          <div className="flex items-center space-x-2">
            <textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your answer..."
              className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              disabled={isTyping}
            />
            <button
              onClick={handleSendMessage}
              disabled={isTyping || !currentAnswer.trim()}
              className={`rounded-lg p-3 transition-all ${isTyping || !currentAnswer.trim() ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ResultTab: React.FC<ResultTabProps> = ({ isComplete, finalPrompt, copied, copyToClipboard, resetAll }) => (
  <div className="p-6">
    {!isComplete ? (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <CheckCircle size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Complete the conversation to see your final template.</p>
        </div>
      </div>
    ) : (
      <>
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <Check className="text-green-600" /> Your Completed Campaign Template
          </h2>
          <p className="text-gray-600">All placeholders have been replaced based on your conversation.</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700">{finalPrompt}</pre>
        </div>
        <div className="flex gap-3">
          <button onClick={copyToClipboard} className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
            {copied ? <><Check size={20} />Copied!</> : <><Copy size={20} />Copy to Clipboard</>}
          </button>
          <button onClick={resetAll} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2">
            <RefreshCw size={20} /> Start Over
          </button>
        </div>
      </>
    )}
  </div>
);


// ====================================================================
// MAIN COMPONENT
// ====================================================================
const MasterPromptCampaignBuilder: React.FC<EmailCampaignBuilderProps> = ({ selectedClient }) => {
  // --- State Management ---
  const [activeTab, setActiveTab] = useState<TabType>('template');
  const [masterPrompt, setMasterPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [finalPrompt, setFinalPrompt] = useState('');
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
    
    // Check if the assistant's response contains the completion JSON
    if (data && data.assistantText) {
      // Try to find and parse the completion JSON from the assistant's text
      const jsonMatch = data.assistantText.match(/\{[\s\S]*?"status"\s*:\s*"complete"[\s\S]*?\}/);
      
      if (jsonMatch) {
        try {
          const completionData = JSON.parse(jsonMatch[0]);
          
          if (completionData.status === "complete" && completionData.final_prompt) {
            // We found a completion!
            setFinalPrompt(completionData.final_prompt);
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
            return; // Exit early since we handled completion
          }
        } catch (e) {
          console.error('Failed to parse completion JSON:', e);
        }
      }
      
      // If not complete or we couldn't parse, show the message normally
      const botMessage: Message = { type: 'bot', content: data.assistantText, timestamp: new Date() };
      setMessages(prev => [...prev, botMessage]);
    }
    
    // Also check the original isComplete flag as fallback
    if (data && data.isComplete === true) {
      setFinalPrompt(data.finalPrompt);
      setIsComplete(true);
      const completionMessage: Message = { 
        type: 'bot', 
        content: data.assistantText || "🎉 Great! I've filled in all the placeholders. Check the 'Final Result' tab.", 
        timestamp: new Date() 
      };
      setMessages(prev => [...prev, completionMessage]);
      setTimeout(() => setActiveTab('result'), 2000);
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

  const copyToClipboard = () => {
    navigator.clipboard.writeText(finalPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetAll = () => {
    if (effectiveUserId) {
        axios.delete(`${API_BASE_URL}/api/CampaignPrompt/history/${effectiveUserId}`).catch(err => console.error("Failed to clear history:", err));
    }
    setMessages([]);
    setFinalPrompt('');
    setIsComplete(false);
    setConversationStarted(false);
    setActiveTab('template');
  };

  const currentPlaceholders = extractPlaceholders(masterPrompt);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
            <h1 className="text-2xl font-bold flex items-center gap-2"><Globe size={28} />AI Campaign Prompt Builder</h1>
            <p className="text-blue-100 mt-2">Create personalized email campaigns through a dynamic conversation.</p>
          </div>
          {/* Tab Navigation */}
          <div className="border-b">
            <div className="flex">
              <button onClick={() => setActiveTab('template')} className={`flex-1 px-6 py-4 font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === 'template' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><FileText size={20} />Template</button>
              <button onClick={() => setActiveTab('conversation')} className={`flex-1 px-6 py-4 font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === 'conversation' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`} disabled={!conversationStarted}>
                <MessageSquare size={20} /> Conversation {conversationStarted && !isComplete && <span className="ml-2 w-3 h-3 bg-orange-400 rounded-full animate-pulse"></span>}
              </button>
              <button onClick={() => setActiveTab('result')} className={`flex-1 px-6 py-4 font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === 'result' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`} disabled={!isComplete}>
                <CheckCircle size={20} /> Final Result {isComplete && <span className="ml-2 w-3 h-3 bg-green-500 rounded-full"></span>}
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="min-h-[600px]">
            {activeTab === 'template' && (
              <TemplateTab 
                masterPrompt={masterPrompt}
                setMasterPrompt={setMasterPrompt}
                systemPrompt={systemPrompt}
                setSystemPrompt={setSystemPrompt}
                startConversation={startConversation}
                currentPlaceholders={currentPlaceholders}
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
                copied={copied}
                copyToClipboard={copyToClipboard}
                resetAll={resetAll}
              />
            )}
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-6 bg-blue-50 rounded-lg p-6">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><Eye size={20} className="text-blue-600" />How to Use</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">1</div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Enter Instructions & Template</h4>
                <p className="text-sm text-gray-700">Define the AI's goal in the first box and your template in the second.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">2</div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Chat with the AI</h4>
                <p className="text-sm text-gray-700">Answer the AI's questions to provide values for each placeholder.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">3</div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Get Final Result</h4>
                <p className="text-sm text-gray-700">Once all placeholders are filled, your completed template will be ready to copy.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        /* Custom scrollbar for chat area */
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-track {
          background: #f3f4f6;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }

        /* Smooth transitions for better UX */
        * {
          transition-property: background-color, border-color, color, fill, stroke, opacity, transform;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: 150ms;
        }
      `}</style>
    </div>
  );
};
export default MasterPromptCampaignBuilder;