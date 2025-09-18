import React, { useState, useRef, useEffect } from 'react';
import { Send, Copy, Check, Loader2, RefreshCw, Globe, Eye, FileText, MessageSquare, CheckCircle } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from "../../config";


// --- Type Definitions ---
interface Message {
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

type TabType = 'template' | 'conversation' | 'result';

// --- Master System Prompt for the AI ---
const MASTER_SYSTEM_PROMPT = `
You are an expert conversational AI assistant named 'Campaign Builder'. Your primary goal is to help a user fill in all the placeholders (formatted as {placeholder_name}) in an email master prompt they provide.

Here is your process:
1. When the user provides their master prompt, first analyze it and identify ALL the placeholders.
2. Acknowledge the user and tell them how many placeholders you've found.
3. Ask the user for the value of each placeholder, one by one, in a friendly and conversational manner. Do not ask for all of them at once.
4. Use the context of the placeholder name to ask a natural question. For example, for {vendor_company}, ask 'What is your company's name?'. For {campaign_objective}, ask 'What is the main goal of this campaign?'.
5. You have a 'web_search' tool. If a placeholder suggests you could find information online (e.g., {vendor_company_website_URL}, {testimonial}), you can use the search tool to assist the user, but always present the findings and ask for their confirmation or input.
6. Keep track of the placeholders you have filled internally.
7. Once you have gathered information for ALL the placeholders, your FINAL task is to generate the completed prompt.
8. When you are ready to provide the final prompt, you MUST respond with a single, specific JSON object and nothing else. The format is critical for the application to work. The JSON object must be:
{
  "status": "complete",
  "final_prompt": "<The fully completed prompt text here>"
}
Do not add any conversational text before or after this final JSON object. Your last response MUST be this JSON structure.
`;

// ====================================================================
// STEP 1: DEFINE PROPS FOR THE CHILD COMPONENTS
// ====================================================================
interface TemplateTabProps {
  masterPrompt: string;
  setMasterPrompt: (value: string) => void;
  startConversation: () => void;
  currentPlaceholders: string[];
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
}

interface ResultTabProps {
  isComplete: boolean;
  finalPrompt: string;
  copied: boolean;
  copyToClipboard: () => void;
  resetAll: () => void;
}


// ====================================================================
// STEP 2: MOVE THE TAB COMPONENTS OUTSIDE THE MAIN COMPONENT
// ====================================================================

const TemplateTab: React.FC<TemplateTabProps> = ({ masterPrompt, setMasterPrompt, startConversation, currentPlaceholders }) => (
  <div className="p-6">
    <div className="mb-6">
      <h2 className="text-xl font-bold mb-2">1. Master Prompt Template</h2>
      <p className="text-gray-600">Enter your email template with placeholders in {'{'}placeholder{'}'} format.</p>
    </div>
    <textarea
      value={masterPrompt}
      onChange={(e) => setMasterPrompt(e.target.value)}
      className="w-full h-96 p-4 border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
      placeholder="Enter your master prompt with {placeholders}..."
    />
    <div className="mt-4">
      <h3 className="font-semibold mb-2">Detected Placeholders:</h3>
      <div className="flex flex-wrap gap-2">
        {currentPlaceholders.length > 0 ? currentPlaceholders.map((p) => (
          <span key={p} className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
            {`{${p}}`}
          </span>
        )) : <span className="text-sm text-gray-500">No placeholders found yet.</span>}
      </div>
    </div>
    <div className="mt-6 flex justify-center">
      <button
        onClick={startConversation}
        disabled={currentPlaceholders.length === 0}
        className={`px-6 py-3 rounded-lg font-semibold transition-all ${
          currentPlaceholders.length === 0
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 transform hover:scale-105'
        }`}
      >
        Start Filling Placeholders →
      </button>
    </div>
  </div>
);

// This component goes outside your main MasterPromptCampaignBuilder function

const ConversationTab: React.FC<ConversationTabProps> = ({
  conversationStarted, messages, isTyping, isComplete, currentAnswer, setCurrentAnswer, handleSendMessage, handleKeyPress, chatEndRef
}) => {

  // Helper function to render message content
  const renderMessageContent = (content: string) => {
    // A simple regex to check if the string contains HTML tags
    const isHtml = /<[a-z][\s\S]*>/i.test(content);

    if (isHtml) {
      // If it's HTML, use dangerouslySetInnerHTML to render it
      return <div dangerouslySetInnerHTML={{ __html: content }} />;
    } else {
      // Otherwise, render it as plain text to preserve formatting like newlines
      return <p className="whitespace-pre-wrap">{content}</p>;
    }
  };

  return (
    <div className="flex flex-col h-[700px]">
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {!conversationStarted ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Start by entering your template in the 'Template' tab.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-2xl p-4 ${message.type === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 shadow-sm'}`}>
                  
                  {/* Use our new render function here */}
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
              className={`rounded-lg p-3 transition-all ${
                isTyping || !currentAnswer.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
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
// STEP 3: THE MAIN COMPONENT NOW MANAGES STATE AND PASSES PROPS
// ====================================================================

const MasterPromptCampaignBuilder: React.FC = () => {
  // --- State Management ---
  const [activeTab, setActiveTab] = useState<TabType>('template');
  const [masterPrompt, setMasterPrompt] = useState(`Add placeholder text here with {placeholders} for dynamic content.`);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [finalPrompt, setFinalPrompt] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // --- Session and API Configuration ---
  const [userId] = useState(`user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

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

  // --- Core Logic: API Communication ---
  const startConversation = async () => {
    if (masterPrompt.trim() === '') return;
    setMessages([]);
    setFinalPrompt('');
    setIsComplete(false);
    setConversationStarted(true);
    setActiveTab('conversation');
    setIsTyping(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/CampaignPrompt/chat`, {
        userId: userId,
        message: masterPrompt,
        systemPrompt: MASTER_SYSTEM_PROMPT,
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

// in MasterPromptCampaignBuilder.tsx

const handleSendMessage = async () => {
  if (currentAnswer.trim() === '' || isTyping) return;
  
  const userMessage: Message = { type: 'user', content: currentAnswer, timestamp: new Date() };
  setMessages(prev => [...prev, userMessage]);
  setCurrentAnswer('');
  setIsTyping(true);
  
  try {
    //
    // THIS IS THE CORRECTED API CALL
    //
    const response = await axios.post(`${API_BASE_URL}/api/CampaignPrompt/chat`, {
      userId: userId,
      message: userMessage.content,
      systemPrompt: "", // Send an empty string, backend validation requires the field to be present
      model: "gpt-5"    // The model is also required
    });
    
    const data = response.data.response;
    
    if (data && data.isComplete) {
      setFinalPrompt(data.finalPrompt);
      setIsComplete(true);
      const completionMessage: Message = { type: 'bot', content: data.assistantText || "🎉 Great! I've filled in all the placeholders. Check the 'Final Result' tab.", timestamp: new Date() };
      setMessages(prev => [...prev, completionMessage]);
      setTimeout(() => setActiveTab('result'), 2000);
    } else if (data && data.assistantText) {
      const botMessage: Message = { type: 'bot', content: data.assistantText, timestamp: new Date() };
      setMessages(prev => [...prev, botMessage]);
    }
  } catch (error) {
    console.error('Error sending message:', error);
    const errorMessage: Message = { type: 'bot', content: 'Sorry, there was an error processing your answer. Please try again.', timestamp: new Date() };
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
    axios.delete(`${API_BASE_URL}/api/CampaignPrompt/history/${userId}`).catch(err => console.error("Failed to clear history:", err));
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
                <h4 className="font-semibold text-sm mb-1">Enter Template</h4>
                <p className="text-sm text-gray-700">Write or paste your email template with {'{'}placeholders{'}'} for any dynamic content.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">2</div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Chat with the AI</h4>
                <p className="text-sm text-gray-700">Answer the AI's questions to provide values for each placeholder in a natural conversation.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">3</div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Get Final Result</h4>
                <p className="text-sm text-gray-700">Once all placeholders are filled, your completed template will be ready to copy and use.</p>
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