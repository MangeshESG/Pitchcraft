import React, { useState, useRef, useEffect } from 'react';
import { Send, ChevronDown, ChevronUp, Copy, Check, Loader2, RefreshCw, Globe, Search, Eye, FileText, MessageSquare, CheckCircle } from 'lucide-react';
import axios from 'axios';

// Type definitions
interface Message {
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

interface PlaceholderData {
  [key: string]: string;
}

interface QuestionFlow {
  placeholder: string;
  question: string;
  optional?: boolean;
  requiresSearch?: boolean;
  searchType?: 'contact' | 'testimonial' | 'general';
}

type TabType = 'template' | 'conversation' | 'result';

const MasterPromptCampaignBuilder: React.FC = () => {
  // State management
  const [activeTab, setActiveTab] = useState<TabType>('template');
  const [masterPrompt, setMasterPrompt] = useState(`Subject: How {vendor_company} Can Help {company_name} Achieve {campaign_objective}

Hi {full_name},

I noticed that {company_name} is {vendor_company_main_theme}. As someone in your position as {job_title}, you're likely focused on driving growth and efficiency.

{vendor_company} specializes in {vendor_company_main_theme}, and we've helped similar companies achieve remarkable results.

{reference_email}

Our clients typically see:
- Increased efficiency by 40%
- Reduced costs by 30%  
- Improved customer satisfaction

{final_sample_email}

One of our clients recently said:
"{testimonial}"

Would you be interested in a brief 15-minute call to explore how we can help {company_name} achieve similar results?

You can learn more about us at {vendor_company_website_URL} or reach out directly at {vendor_contact_url}.

Best regards,
{signature_block}

P.S. {search_string_1}
{search_string_2}

---
Banner: {banner_image_url}
Footer: {footer_image_url}`);

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [placeholderData, setPlaceholderData] = useState<PlaceholderData>({});
  const [finalPrompt, setFinalPrompt] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Unique session ID
  const [userId] = useState(`user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://localhost:7216';

  // Dynamic question flow based on placeholders
  const [questionFlow, setQuestionFlow] = useState<QuestionFlow[]>([]);

  // Extract placeholders from master prompt
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

  // Generate questions based on placeholders
  const generateQuestionFlow = (placeholders: string[]): QuestionFlow[] => {
    const questionMap: { [key: string]: QuestionFlow } = {
      'vendor_company': {
        placeholder: 'vendor_company',
        question: "What is your company name?",
        optional: false
      },
      'vendor_company_website_URL': {
        placeholder: 'vendor_company_website_URL',
        question: "What is your company's website URL?",
        optional: false,
        requiresSearch: true,
        searchType: 'general'
      },
      'vendor_company_main_theme': {
        placeholder: 'vendor_company_main_theme',
        question: "What is your company's main focus or specialization?",
        optional: false
      },
      'campaign_objective': {
        placeholder: 'campaign_objective',
        question: "What is the primary objective of this email campaign?",
        optional: false
      },
      'reference_email': {
        placeholder: 'reference_email',
        question: "Do you have a reference email style or key points to include? (Type 'skip' if not)",
        optional: true
      },
      'signature_block': {
        placeholder: 'signature_block',
        question: "Please provide your email signature (name, title, contact info):",
        optional: false
      },
      'banner_image_url': {
        placeholder: 'banner_image_url',
        question: "URL for banner image? (Type 'skip' if not required)",
        optional: true
      },
      'footer_image_url': {
        placeholder: 'footer_image_url',
        question: "URL for footer image? (Type 'skip' if not required)",
        optional: true
      },
      'vendor_contact_url': {
        placeholder: 'vendor_contact_url',
        question: "What is your primary contact or CTA link?",
        optional: false,
        requiresSearch: true,
        searchType: 'contact'
      },
      'testimonial': {
        placeholder: 'testimonial',
        question: "Do you have a customer testimonial to include? (Type 'skip' to search website)",
        optional: true,
        requiresSearch: true,
        searchType: 'testimonial'
      },
      'final_sample_email': {
        placeholder: 'final_sample_email',
        question: "Any specific content or value propositions to highlight in the email body?",
        optional: false
      },
      'search_string_1': {
        placeholder: 'search_string_1',
        question: "First search string for lead generation (or type 'auto' to generate)?",
        optional: false
      },
      'search_string_2': {
        placeholder: 'search_string_2',
        question: "Second search string for lead generation (or type 'auto' to generate)?",
        optional: false
      }
    };

    // For placeholders not in the map, create generic questions
    return placeholders.map(placeholder => {
      if (questionMap[placeholder]) {
        return questionMap[placeholder];
      }
      return {
        placeholder,
        question: `Please provide value for {${placeholder}}:`,
        optional: false
      };
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

const startConversation = () => {
  const placeholders = extractPlaceholders(masterPrompt);
  const questions = generateQuestionFlow(placeholders);
  
  // Reset everything first
  setMessages([]);
  setCurrentQuestionIndex(0);
  setPlaceholderData({});
  setIsComplete(false);
  setConversationStarted(true);
  setActiveTab('conversation');
  
  // Set the question flow
  setQuestionFlow(questions);

  // Add welcome message
  const welcomeMessage: Message = {
    type: 'bot',
    content: `I'll help you fill in your campaign template. I found ${placeholders.length} placeholders that need values. Let me ask you about each one.`,
    timestamp: new Date()
  };
  
  // Use setTimeout to ensure state is updated before asking first question
  setTimeout(() => {
    setMessages([welcomeMessage]);
    
    // Ask first question after another timeout
    setTimeout(() => {
      if (questions.length > 0) {
        const firstQuestion: Message = {
          type: 'bot',
          content: questions[0].question,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, firstQuestion]);
      }
    }, 1500);
  }, 100);
};

 const askNextQuestion = () => {
  if (currentQuestionIndex < questionFlow.length) {
    const currentQuestion = questionFlow[currentQuestionIndex];
    if (currentQuestion) {
      const questionMessage: Message = {
        type: 'bot',
        content: currentQuestion.question,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, questionMessage]);
    }
  } else if (currentQuestionIndex === questionFlow.length && questionFlow.length > 0) {
    // All questions answered, generate final prompt
    generateFinalPrompt();
  }
};

  const performWebSearch = async (query: string, searchType: string): Promise<any> => {
    setIsSearching(true);
    try {
      let systemPrompt = '';
      let searchMessage = '';

      switch (searchType) {
        case 'contact':
          systemPrompt = "You are an expert at finding contact information from websites.";
          searchMessage = `Find the main contact URL or page from the website: ${query}`;
          break;
        case 'testimonial':
          systemPrompt = "You are an expert at finding customer testimonials and reviews.";
          searchMessage = `Search for customer testimonials on the website: ${placeholderData.vendor_company_website_URL || query}`;
          break;
        default:
          systemPrompt = "You are a professional B2B research assistant.";
          searchMessage = `Research information about: ${query}`;
      }

      const response = await axios.post(`${API_BASE_URL}/api/CampaignPrompt/chat`, {
        userId: userId,
        message: searchMessage,
        systemPrompt: systemPrompt,
        model: "gpt-5"
      });

      if (response.data && response.data.response) {
        return response.data.response.assistantText;
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
    return null;
  };

  const handleSendMessage = async () => {
    if (currentAnswer.trim() === '') return;

    const userMessage: Message = {
      type: 'user',
      content: currentAnswer,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    
    const answer = currentAnswer.trim();
    setCurrentAnswer('');
    setIsTyping(true);

    const currentQuestion = questionFlow[currentQuestionIndex];
    
    // Handle skip for optional fields
    if (currentQuestion.optional && answer.toLowerCase() === 'skip') {
      setPlaceholderData(prev => ({ ...prev, [currentQuestion.placeholder]: '' }));
    } else {
      // Store the answer
      setPlaceholderData(prev => ({ ...prev, [currentQuestion.placeholder]: answer }));
      
      // Perform search if needed
          if (currentQuestion.requiresSearch && answer.toLowerCase() !== 'skip') {
        if (currentQuestion.searchType === 'testimonial' && answer.toLowerCase() === 'skip') {
          // Search for testimonials on website
          const searchResult = await performWebSearch(placeholderData.vendor_company_website_URL || '', 'testimonial');
          if (searchResult) {
            const testimonialMessage: Message = {
              type: 'bot',
              content: `Found testimonials on your website:\n${searchResult}\n\nWould you like to use one of these? Please paste your choice or provide a custom one.`,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, testimonialMessage]);
            setIsTyping(false);
            return; // Don't move to next question yet
          }
        } else if (currentQuestion.requiresSearch) {
          const searchResult = await performWebSearch(answer, currentQuestion.searchType || 'general');
          if (searchResult) {
            const infoMessage: Message = {
              type: 'bot',
              content: `✅ Found additional information: ${searchResult.substring(0, 200)}...`,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, infoMessage]);
          }
        }
      }
      
      // Generate search strings automatically
      if (currentQuestion.placeholder === 'search_string_1' && answer.toLowerCase() === 'auto') {
        const searchString = `${placeholderData.vendor_company} ${placeholderData.vendor_company_main_theme} B2B leads site:linkedin.com OR site:crunchbase.com`;
        setPlaceholderData(prev => ({ ...prev, search_string_1: searchString }));
      } else if (currentQuestion.placeholder === 'search_string_2' && answer.toLowerCase() === 'auto') {
        const searchString = `"${placeholderData.vendor_company}" "${placeholderData.campaign_objective}" email outreach site:linkedin.com`;
        setPlaceholderData(prev => ({ ...prev, search_string_2: searchString }));
      }
    }

    setCurrentQuestionIndex(prev => prev + 1);
    setTimeout(() => {
      setIsTyping(false);
      askNextQuestion();
    }, 1000);
  };

  const generateFinalPrompt = () => {
    let filledPrompt = masterPrompt;
    
    // Replace all placeholders with collected data
    Object.entries(placeholderData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      filledPrompt = filledPrompt.replace(regex, value || `[${key}]`);
    });
    
    setFinalPrompt(filledPrompt);
    setIsComplete(true);
    
    const completionMessage: Message = {
      type: 'bot',
      content: "🎉 Great! I've filled in all the placeholders in your campaign prompt. Click on the 'Final Result' tab to see your completed template.",
      timestamp: new Date()
    };
    setMessages(prev => [...prev, completionMessage]);
    
    // Auto-switch to result tab after a delay
    setTimeout(() => {
      setActiveTab('result');
    }, 2000);
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
    setMessages([]);
    setCurrentQuestionIndex(0);
    setPlaceholderData({});
    setFinalPrompt('');
    setIsComplete(false);
    setConversationStarted(false);
    setActiveTab('template');
  };

  // Get current placeholders from master prompt
  const currentPlaceholders = extractPlaceholders(masterPrompt);
  const filledPlaceholders = Object.keys(placeholderData);

  // Tab content components
  const TemplateTab = () => (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Master Prompt Template</h2>
        <p className="text-gray-600">Enter your email template with placeholders in {'{'}placeholder{'}'} format</p>
      </div>
      
      <textarea
        value={masterPrompt}
        onChange={(e) => setMasterPrompt(e.target.value)}
        className="w-full h-96 p-4 border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
        placeholder="Enter your master prompt with {placeholders}..."
      />
      
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Detected Placeholders:</h3>
          <span className="text-sm text-gray-600">{currentPlaceholders.length} found</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {currentPlaceholders.map((placeholder) => (
            <span
              key={placeholder}
              className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-full"
            >
              {`{${placeholder}}`}
            </span>
          ))}
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

  const ConversationTab = () => (
    <div className="flex flex-col h-[700px]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {!conversationStarted ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Start by entering your template in the Template tab</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl p-4 ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-800 shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <div className={`text-xs mt-2 ${
                    message.type === 'user' ? 'text-blue-200' : 'text-gray-400'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {(isTyping || isSearching) && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center space-x-2">
                    {isSearching ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span className="text-sm text-gray-600">Searching web...</span>
                      </>
                    ) : (
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
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
              disabled={isTyping || isSearching}
            />
            <button
              onClick={handleSendMessage}
              disabled={isTyping || isSearching || !currentAnswer.trim()}
              className={`rounded-lg p-3 transition-all ${
                isTyping || isSearching || !currentAnswer.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Send size={20} />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="mt-2 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {currentQuestionIndex < questionFlow.length && (
                <>
                  Question {currentQuestionIndex + 1} of {questionFlow.length}
                  {questionFlow[currentQuestionIndex]?.optional && (
                    <button
                      onClick={() => setCurrentAnswer('skip')}
                      className="ml-2 text-blue-600 hover:text-blue-700"
                    >
                      Skip this step →
                    </button>
                  )}
                </>
              )}
            </div>
            {(questionFlow[currentQuestionIndex]?.placeholder === 'search_string_1' || 
              questionFlow[currentQuestionIndex]?.placeholder === 'search_string_2') && (
              <button
                onClick={() => setCurrentAnswer('auto')}
                className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200"
              >
                Auto-generate
              </button>
            )}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="bg-gray-200 h-1">
        <div 
          className="bg-blue-600 h-1 transition-all duration-500"
          style={{ width: `${(currentQuestionIndex / questionFlow.length) * 100}%` }}
        />
      </div>
    </div>
  );

  const ResultTab = () => (
    <div className="p-6">
      {!isComplete ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <CheckCircle size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Complete the conversation to see your final template</p>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
              <Check className="text-green-600" />
              Your Completed Campaign Template
            </h2>
            <p className="text-gray-600">All placeholders have been replaced with your provided values</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700">
              {finalPrompt}
            </pre>
          </div>

          <div className="flex gap-3 mb-6">
            <button
              onClick={copyToClipboard}
              className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check size={20} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={20} />
                  Copy to Clipboard
                </>
              )}
            </button>
                        <button
              onClick={resetAll}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
            >
              <RefreshCw size={20} />
              Start Over
            </button>
          </div>

          {/* Placeholder Mapping Table */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h3 className="font-semibold mb-3">Placeholder Replacements:</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.entries(placeholderData).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between py-2 border-b last:border-0">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">{`{${key}}`}</code>
                  <span className="text-sm text-gray-700 truncate max-w-md" title={value}>
                    {value || '[empty]'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Globe size={28} />
              Master Campaign Prompt Builder
            </h1>
            <p className="text-blue-100 mt-2">Create personalized email campaigns with dynamic placeholders</p>
          </div>

          {/* Tab Navigation */}
          <div className="border-b">
            <div className="flex">
              <button
                onClick={() => setActiveTab('template')}
                className={`flex-1 px-6 py-4 font-semibold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'template'
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <FileText size={20} />
                Template
              </button>
              <button
                onClick={() => setActiveTab('conversation')}
                className={`flex-1 px-6 py-4 font-semibold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'conversation'
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                disabled={!conversationStarted}
              >
                <MessageSquare size={20} />
                Conversation
                {conversationStarted && !isComplete && (
                  <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                    {currentQuestionIndex}/{questionFlow.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('result')}
                className={`flex-1 px-6 py-4 font-semibold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'result'
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                disabled={!isComplete}
              >
                <CheckCircle size={20} />
                Final Result
                {isComplete && (
                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    Ready
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="min-h-[600px]">
            {activeTab === 'template' && <TemplateTab />}
            {activeTab === 'conversation' && <ConversationTab />}
            {activeTab === 'result' && <ResultTab />}
          </div>
        </div>

        {/* Status Panel */}
        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h3 className="font-bold text-lg mb-4">Progress Overview</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{currentPlaceholders.length}</div>
              <p className="text-sm text-gray-600 mt-1">Total Placeholders</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">{filledPlaceholders.length}</div>
              <p className="text-sm text-gray-600 mt-1">Filled</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-orange-600">
                {currentPlaceholders.length - filledPlaceholders.length}
              </div>
              <p className="text-sm text-gray-600 mt-1">Remaining</p>
            </div>
          </div>

          {/* Placeholder Status Grid */}
          {currentPlaceholders.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold mb-3">Placeholder Status:</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {currentPlaceholders.map((placeholder) => {
                  const isFilled = filledPlaceholders.includes(placeholder);
                  return (
                    <div
                      key={placeholder}
                      className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                        isFilled
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-gray-50 text-gray-600 border border-gray-200'
                      }`}
                    >
                      {isFilled ? (
                        <CheckCircle size={16} className="flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-400 flex-shrink-0" />
                      )}
                      <span className="truncate">{placeholder}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Tips Section */}
        <div className="mt-6 bg-blue-50 rounded-lg p-6">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            <Eye size={20} className="text-blue-600" />
            How to Use
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">
                1
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Enter Template</h4>
                <p className="text-sm text-gray-700">
                  Write your email template with {'{'}placeholders{'}'} for dynamic content
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">
                2
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Fill Values</h4>
                <p className="text-sm text-gray-700">
                  Answer questions about each placeholder through the conversation
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">
                3
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Get Result</h4>
                <p className="text-sm text-gray-700">
                  Copy your completed template with all placeholders replaced
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        .animate-bounce {
          animation: bounce 1.4s infinite;
        }

        /* Custom scrollbar */
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

        /* Smooth transitions */
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