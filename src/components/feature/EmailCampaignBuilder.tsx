import React, { useState, useRef, useEffect, FormEvent, ChangeEvent } from 'react';
import { Send, Upload, Image as ImageIcon, Type, Link2, Smile, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Trash2, Edit2, Save, X, CheckCircle, RefreshCw, Globe, Loader2, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

// Type definitions
interface Message {
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

interface CampaignData {
  vendor_company: string;
  vendor_company_website_URL: string;
  vendor_company_main_theme: string;
  campaign_objective: string;
  reference_email: string;
  signature_block: string;
  banner_image_url: string;
  footer_image_url: string;
  vendor_contact_url: string;
  testimonial: string;
  approved_hook: string;
  final_sample_email: string;
  paragraph_formation: string;
  fixedPara: string;
  example_output: string;
  search_string_1: string;
  search_string_2: string;
}

interface TemplateAssets {
  bannerImage: string | null;
  footerImage: string | null;
  signatureImage: string | null;
}

interface QuestionStep {
  id: number;
  question: string;
  placeholder: keyof CampaignData;
  optional: boolean;
  skipOption?: string;
  requiresScraping?: boolean;
  scrapingField?: string;
}

interface WebResearchResult {
  contactUrl?: string;
  testimonials?: string[];
  companyInfo?: {
    description?: string;
    services?: string[];
    clients?: string[];
  };
  found: boolean;
}

const EmailCampaignBuilder: React.FC = () => {
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [userId] = useState(`user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`); // Unique user ID for this session
  const [templateAssets, setTemplateAssets] = useState<TemplateAssets>({
    bannerImage: null,
    footerImage: null,
    signatureImage: null
  });
  const [campaignData, setCampaignData] = useState<CampaignData>({
    vendor_company: '',
    vendor_company_website_URL: '',
    vendor_company_main_theme: '',
    campaign_objective: '',
    reference_email: '',
    signature_block: '',
    banner_image_url: '',
    footer_image_url: '',
    vendor_contact_url: '',
    testimonial: '',
    approved_hook: '',
    final_sample_email: '',
    paragraph_formation: '',
    fixedPara: '',
    example_output: '',
    search_string_1: '',
    search_string_2: ''
  });
  const [foundTestimonials, setFoundTestimonials] = useState<string[]>([]);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // API base URL - update this to match your environment
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://localhost:7216';

  // Question steps configuration
  const questionSteps: QuestionStep[] = [
    {
      id: 1,
      question: "What is the name of your company?",
      placeholder: 'vendor_company',
      optional: false
    },
    {
      id: 2,
      question: "What is your company's website URL?",
      placeholder: 'vendor_company_website_URL',
      optional: false,
      requiresScraping: true,
      scrapingField: 'contact'
    },
    {
      id: 3,
      question: "What is your company's main theme or focus?",
      placeholder: 'vendor_company_main_theme',
      optional: false
    },
    {
      id: 4,
      question: "What is the objective of this email campaign?",
      placeholder: 'campaign_objective',
      optional: false
    },
    {
      id: 5,
      question: "Do you have a reference email that you want us to consider? (Type 'skip' if not)",
      placeholder: 'reference_email',
      optional: true,
      skipOption: 'skip'
    },
    {
      id: 6,
      question: "Please provide the professional signature block for your emails (name, title, role, email). Include all info in a single input.",
      placeholder: 'signature_block',
      optional: false
    },
    {
      id: 7,
      question: "Please provide the URL for your banner image. (Type 'skip' if not required)",
      placeholder: 'banner_image_url',
      optional: true,
      skipOption: 'skip'
    },
    {
      id: 8,
      question: "Please provide the URL for your footer image. (Type 'skip' if not required)",
      placeholder: 'footer_image_url',
      optional: true,
      skipOption: 'skip'
    },
    {
      id: 9,
      question: "What is the primary CTA link (contact URL) for your emails?",
      placeholder: 'vendor_contact_url',
      optional: false,
      requiresScraping: true,
      scrapingField: 'contact'
    }
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Start conversation
    if (messages.length === 0) {
      setTimeout(() => {
        const welcomeMessage: Message = {
          type: 'bot',
          content: "Welcome to PitchDraft Email Campaign Builder! 🚀 Let's create a powerful email campaign together. I'll guide you through each step.",
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
        
        setTimeout(() => {
          askNextQuestion();
        }, 1500);
      }, 500);
    }
  }, []);

  // Clear session on unmount
  useEffect(() => {
    return () => {
      // Clear chat history when component unmounts
      axios.delete(`${API_BASE_URL}/api/CampaignPrompt/history/${userId}`)
        .catch(err => console.error('Error clearing chat history:', err));
    };
  }, [userId]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>, type: 'banner' | 'footer' | 'signature') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setTemplateAssets(prev => ({
          ...prev,
          [`${type}Image`]: result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUrlInput = (url: string, type: 'banner' | 'footer' | 'signature') => {
    if (url.trim()) {
      setTemplateAssets(prev => ({
        ...prev,
        [`${type}Image`]: url
      }));
    }
  };

  // Real web scraping using your API
  const performWebResearch = async (url: string, field: string): Promise<WebResearchResult> => {
    try {
      let systemPrompt = '';
      let message = '';

      if (field === 'contact') {
        systemPrompt = "You are an expert web researcher specializing in finding contact information and website structure.";
        message = `Please analyze the website ${url} and find:
1. The main contact page URL (look for /contact, /contact-us, /get-in-touch, etc.)
2. Any contact forms or email addresses
3. Company description and services

Provide the information in a structured format.`;
      } else if (field === 'testimonials') {
        systemPrompt = "You are an expert at finding customer testimonials and reviews on company websites.";
        message = `Please search the website ${url} for:
1. Customer testimonials or reviews
2. Case studies mentioning client feedback
3. Success stories with quotes

Extract up to 5 testimonials if available. Provide exact quotes.`;
      }

      const response = await axios.post(`${API_BASE_URL}/api/CampaignPrompt/chat`, {
        userId: userId,
        message: message,
        systemPrompt: systemPrompt,
        model: "gpt-5"
      });
 

      if (response.data && response.data.response) {
        const aiResponse = response.data.response.assistantText;
        
        if (field === 'contact') {
          // Extract contact URL from the response
          const contactUrlMatch = aiResponse.match(/contact(?:-us)?(?:\.html)?|get-in-touch|reach-us/i);
          const urlPatterns = [
            /(?:contact\s*(?:page|url)?[:\s]+)?(?:https?:\/\/[^\s]+(?:\/contact[^\s]*|\/get-in-touch[^\s]*|\/reach[^\s]*))/gi,
            /(?:found|detected|located)[^.]*?(?:https?:\/\/[^\s]+contact[^\s]*)/gi
          ];
          
          let contactUrl = '';
          for (const pattern of urlPatterns) {
            const matches = aiResponse.match(pattern);
            if (matches) {
              // Extract the URL from the match
              const urlMatch = matches[0].match(/https?:\/\/[^\s]+/);
              if (urlMatch) {
                contactUrl = urlMatch[0];
                break;
              }
            }
          }

          // If no contact URL found in response, construct one
          if (!contactUrl && url) {
            contactUrl = `${url.replace(/\/$/, '')}/contact-us`;
          }

          return {
            contactUrl: contactUrl,
            companyInfo: {
              description: aiResponse.substring(0, 200) + '...'
            },
            found: !!contactUrl
          };
        } else if (field === 'testimonials') {
          // Extract testimonials from the response
          const testimonialPatterns = [
            /"([^"]+)"\s*[-–—]\s*[^,\n]+/g, // Quoted testimonials with attribution
            /[""]([^""]+)[""](?:\s*[-–—]\s*[^,\n]+)?/g, // Smart quotes
            /testimonial[s]?:?\s*[""]([^""]+)[""]?/gi,
            /client\s+(?:said|says|feedback)[:\s]+[""]([^""]+)[""]?/gi
          ];
          
          const testimonials: string[] = [];
          for (const pattern of testimonialPatterns) {
            const matches = aiResponse.matchAll(pattern);
            for (const match of matches) {
              if (match[1] && match[1].length > 30 && match[1].length < 500) {
                testimonials.push(match[1].trim());
              }
            }
          }

          // Remove duplicates
        const uniqueTestimonials = Array.from(new Set(testimonials)).slice(0, 5);

          return {
            testimonials: uniqueTestimonials,
            found: uniqueTestimonials.length > 0
          };
        }
      }

      return { found: false };
    } catch (error) {
      console.error('Web research error:', error);
      // Fallback to basic scraping simulation
      if (field === 'contact') {
        return {
          contactUrl: `${url}/contact-us`,
          found: true
        };
      }
      return { found: false };
    }
  };

  const askNextQuestion = () => {
    if (currentStepIndex < questionSteps.length) {
      const currentStep = questionSteps[currentStepIndex];
      const questionMessage: Message = {
        type: 'bot',
        content: currentStep.question,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, questionMessage]);
    } else if (currentStepIndex === questionSteps.length) {
      // Ask about testimonials after scraping
      checkForTestimonials();
    } else if (currentStepIndex === questionSteps.length + 1) {
      // Generate sample email
      generateSampleEmail();
    }
  };

  const checkForTestimonials = async () => {
    setIsScraping(true);
    const scrapingMessage: Message = {
      type: 'bot',
      content: "🔍 Searching for testimonials on your website...",
      timestamp: new Date()
    };
    setMessages(prev => [...prev, scrapingMessage]);

    const scrapingResult = await performWebResearch(campaignData.vendor_company_website_URL, 'testimonials');
    setIsScraping(false);

    if (scrapingResult.testimonials && scrapingResult.testimonials.length > 0) {
      setFoundTestimonials(scrapingResult.testimonials);
      const testimonialMessage: Message = {
        type: 'bot',
        content: `We found ${scrapingResult.testimonials.length} testimonials on your website:\n\n${scrapingResult.testimonials.map((t: string, i: number) => `${i + 1}. "${t}"`).join('\n\n')}\n\nPlease type the number to select one, provide a custom testimonial, or type 'skip'.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, testimonialMessage]);
    } else {
      const noTestimonialMessage: Message = {
        type: 'bot',
        content: "No testimonials were found on your website. If you would like to include a testimonial, please provide one now or type 'skip'.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, noTestimonialMessage]);
    }
  };

  const generateSampleEmail = async () => {
    setIsTyping(true);
    
    const generatingMessage: Message = {
      type: 'bot',
      content: "✨ Generating your sample email using AI...",
      timestamp: new Date()
    };
    setMessages(prev => [...prev, generatingMessage]);

    try {
      // Use GPT to generate a personalized email
      const systemPrompt = `You are an expert B2B email copywriter. Create compelling, personalized cold emails that get responses.`;
      const message = `Create a professional B2B cold email with the following details:
- Company: ${campaignData.vendor_company}
- Main Theme: ${campaignData.vendor_company_main_theme}
- Campaign Objective: ${campaignData.campaign_objective}
- Signature: ${campaignData.signature_block}
${campaignData.testimonial && campaignData.testimonial !== 'skip' ? `- Include this testimonial: "${campaignData.testimonial}"` : ''}
${campaignData.reference_email && campaignData.reference_email !== 'skip' ? `- Reference style: ${campaignData.reference_email}` : ''}

Use placeholders like {first_name}, {company_name}, and {industry} for personalization.
Keep it concise, professional, and action-oriented.`;

      const response = await axios.post(`${API_BASE_URL}/api/CampaignPrompt/chat`, {
        userId: userId,
        message: message,
        systemPrompt: systemPrompt,
        model: "gpt-5"
      });

      if (response.data && response.data.response && response.data.response.assistantText) {
        const generatedContent = response.data.response.assistantText;
        setGeneratedEmail(generatedContent);
      } else {
        // Fallback to template-based generation
        const emailContent = `
Hi {first_name},

I noticed your company {company_name} has been making waves in {industry}. ${campaignData.vendor_company} specializes in ${campaignData.vendor_company_main_theme}, and I believe we can help you ${campaignData.campaign_objective}.

${campaignData.vendor_company} helps companies like yours achieve remarkable results through our innovative solutions. Our platform enables businesses to streamline their processes and achieve measurable growth.

${campaignData.testimonial && campaignData.testimonial !== 'skip' ? `Here's what one of our clients said: "${campaignData.testimonial}"` : ''}

Would you be interested in a brief 15-minute call to explore how we can help {company_name} achieve similar results?

${campaignData.signature_block}
        `;
        setGeneratedEmail(emailContent.trim());
      }

      setIsTyping(false);
      setShowEmailPreview(true);

      const previewMessage: Message = {
        type: 'bot',
        content: "Here's your sample email. Please review it carefully. Type 'approve' if it looks good, or 'regenerate' if you'd like me to create a new version.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, previewMessage]);
    } catch (error) {
      console.error('Error generating email:', error);
      setIsTyping(false);
      // Use fallback template
      const emailContent = `
Hi {first_name},

I noticed your company {company_name} has been making waves in {industry}. ${campaignData.vendor_company} specializes in ${campaignData.vendor_company_main_theme}, and I believe we can help you ${campaignData.campaign_objective}.

${campaignData.vendor_company} helps companies like yours achieve remarkable results through our innovative solutions. Our platform enables businesses to streamline their processes and achieve measurable growth.

${campaignData.testimonial && campaignData.testimonial !== 'skip' ? `Here's what one of our clients said: "${campaignData.testimonial}"` : ''}

Would you be interested in a brief 15-minute call to explore how we can help {company_name} achieve similar results?

${campaignData.signature_block}
      `;
      setGeneratedEmail(emailContent.trim());
      setShowEmailPreview(true);
    }
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

    // Handle testimonial selection
    if (currentStepIndex === questionSteps.length && foundTestimonials.length > 0) {
      const selectedIndex = parseInt(answer) - 1;
      if (!isNaN(selectedIndex) && selectedIndex >= 0 && selectedIndex < foundTestimonials.length) {
        setCampaignData(prev => ({ ...prev, testimonial: foundTestimonials[selectedIndex] }));
      } else if (answer.toLowerCase() === 'skip') {
        setCampaignData(prev => ({ ...prev, testimonial: 'skip' }));
      } else {
        setCampaignData(prev => ({ ...prev, testimonial: answer }));
      }
      setCurrentStepIndex(prev => prev + 1);
      setTimeout(() => {
        setIsTyping(false);
        askNextQuestion();
      }, 1000);
      return;
    }

    // Handle email approval
    if (currentStepIndex === questionSteps.length + 1) {
      if (answer.toLowerCase() === 'approve') {
        handleEmailApproval();
        return;
      } else if (answer.toLowerCase() === 'regenerate') {
        setIsTyping(false);
        generateSampleEmail();
        return;
      }
    }

    // Process regular question answers
    if (currentStepIndex < questionSteps.length) {
      const currentStep = questionSteps[currentStepIndex];
      
      // Check if answer is skip for optional fields
      if (currentStep.optional && answer.toLowerCase() === currentStep.skipOption) {
        setCampaignData(prev => ({ ...prev, [currentStep.placeholder]: 'skip' }));
      } else {
        setCampaignData(prev => ({ ...prev, [currentStep.placeholder]: answer }));
      }

      // Handle scraping if needed
      if (currentStep.requiresScraping && currentStep.scrapingField) {
        setIsScraping(true);
        const scrapingMessage: Message = {
          type: 'bot',
          content: `🔍 Analyzing your website for ${currentStep.scrapingField} information...`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, scrapingMessage]);

        const scrapingResult = await performWebResearch(answer, currentStep.scrapingField);
        setIsScraping(false);

        if (scrapingResult.found) {
          if (currentStep.placeholder === 'vendor_contact_url' && scrapingResult.contactUrl) {
            setCampaignData(prev => ({ ...prev, vendor_contact_url: scrapingResult.contactUrl || '' }));
            const foundMessage: Message = {
              type: 'bot',
              content: `✅ Found contact URL: ${scrapingResult.contactUrl}`,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, foundMessage]);
          }
          
          if (scrapingResult.companyInfo) {
            const infoMessage: Message = {
              type: 'bot',
              content: `ℹ️ Company info gathered: ${scrapingResult.companyInfo.description || 'Processing...'}`,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, infoMessage]);
          }
        } else {
          const notFoundMessage: Message = {
            type: 'bot',
            content: `⚠️ Could not automatically find ${currentStep.scrapingField} information. Please provide it manually in the next step.`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, notFoundMessage]);
        }
      }

      setCurrentStepIndex(prev => prev + 1);
      setTimeout(() => {
        setIsTyping(false);
        askNextQuestion();
      }, 1500);
    }
  };

  const handleEmailApproval = async () => {
    setCampaignData(prev => ({
      ...prev,
      approved_hook: generatedEmail.split('\n')[0],
      final_sample_email: generatedEmail,
      example_output: generatedEmail
    }));

    // Analyze paragraph formation
    const paragraphs = generatedEmail.split('\n\n');
    const paragraphFormation = paragraphs.map((para, index) => {
      if (index === 0) return `Paragraph ${index + 1} → Hook: Personalized greeting and connection`;
      if (para.includes(campaignData.vendor_company)) return `Paragraph ${index + 1} → Assurance: Company capabilities and value proposition`;
      if (para.includes('call') || para.includes('meeting')) return `Paragraph ${index + 1} → CTA: Meeting request`;
      if (para.includes('testimonial')) return `Paragraph ${index + 1} → Social Proof: Client testimonial`;
      return `Paragraph ${index + 1} → Supporting content`;
    }).join('\n');

    setCampaignData(prev => ({
      ...prev,
      paragraph_formation: paragraphFormation
    }));

    // Extract fixed paragraphs
    const fixedContent = paragraphs.filter(para => 
      !para.includes('{') && 
      !para.includes(campaignData.signature_block) &&
      para.length > 50
    ).join('\n');
    
    setCampaignData(prev => ({
      ...prev,
      fixedPara: fixedContent || 'No fixed paragraphs detected'
    }));

    // Generate search strings using AI
    try {
      const searchStringPrompt = `Based on this company information:
- Company: ${campaignData.vendor_company}
- Focus: ${campaignData.vendor_company_main_theme}
- Objective: ${campaignData.campaign_objective}

Generate two optimized search strings:
1. For GPT/OpenAI web search (dynamic, reusable)
2. For Google Search API (single query, comprehensive)

Include relevant sites like LinkedIn, Crunchbase, industry publications.`;

      const response = await axios.post(`${API_BASE_URL}/api/CampaignPrompt/chat`, {
        userId: userId,
        message: searchStringPrompt,
        systemPrompt: "You are an expert at creating optimized search queries for B2B research.",
        model: "gpt-5"
      });

      if (response.data && response.data.response && response.data.response.assistantText) {
        const searchResponse = response.data.response.assistantText;
        // Extract search strings from response
        const lines = searchResponse.split('\n');
     const searchString1 = lines.find((line: string) => line.includes('1.'))?.replace(/^1\.\s*/, '') || 
  `${campaignData.vendor_company} ${campaignData.vendor_company_main_theme} site:linkedin.com OR site:crunchbase.com`;
const searchString2 = lines.find((line: string) => line.includes('2.'))?.replace(/^2\.\s*/, '') || 
  `"${campaignData.vendor_company}" "${campaignData.vendor_company_main_theme}" B2B leads site:linkedin.com OR site:crunchbase.com`;
        
        setCampaignData(prev => ({
          ...prev,
          search_string_1: searchString1,
          search_string_2: searchString2
        }));
      }
    } catch (error) {
      console.error('Error generating search strings:', error);
      // Fallback search strings
      const searchString1 = `${campaignData.vendor_company} ${campaignData.vendor_company_main_theme} ${campaignData.campaign_objective} site:linkedin.com OR site:crunchbase.com`;
      const searchString2 = `${campaignData.vendor_company} "${campaignData.vendor_company_main_theme}" email lead generation site:linkedin.com OR site:crunchbase.com`;

      setCampaignData(prev => ({
        ...prev,
        search_string_1: searchString1,
        search_string_2: searchString2
      }));
    }

    setIsTyping(false);
    showFinalSummary();
  };

  const showFinalSummary = () => {
    const summaryMessage: Message = {
      type: 'bot',
      content: "🎉 Excellent! Your email campaign is ready. Here's a summary of all the placeholders and data collected:",
      timestamp: new Date()
    };
    setMessages(prev => [...prev, summaryMessage]);

    const placeholderSummary = Object.entries(campaignData)
      .filter(([key, value]) => value && value !== 'skip')
      .map(([key, value]) => `{${key}} → "${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"`)
      .join('\n');

    const finalMessage: Message = {
      type: 'bot',
      content: `📋 **Campaign Data Summary:**\n\n${placeholderSummary}\n\n✅ Your campaign is now ready for automation!`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, finalMessage]);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessageContent = (content: string) => {
    // Format message content with markdown-style formatting
    let processedContent = content;
    
    // Bold text
    processedContent = processedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Line breaks
    processedContent = processedContent.replace(/\n/g, '<br/>');
    
    // URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    processedContent = processedContent.replace(urlRegex, '<a href="$1" target="_blank" class="text-blue-500 underline">$1</a>');
    
    return <div dangerouslySetInnerHTML={{ __html: processedContent }} />;
  };

  // Template Preview Component
  const TemplatePreview = () => {
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [currentUploadType, setCurrentUploadType] = useState<'banner' | 'footer' | 'signature' | null>(null);
    const [imageUrl, setImageUrl] = useState('');

    const signatureLines = campaignData.signature_block.split(',').map(line => line.trim());

    const openUploadModal = (type: 'banner' | 'footer' | 'signature') => {
      setCurrentUploadType(type);
      setShowUploadModal(true);
      setImageUrl('');
    };

    return (
           <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Eye size={24} />
              Email Template Preview
            </h2>
            <button
              onClick={() => setShowTemplatePreview(false)}
              className="p-2 hover:bg-green-800 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {/* Email Preview */}
            <div className="bg-white rounded-lg shadow-lg border overflow-hidden">
              {/* Banner Image */}
              <div className="relative group">
                {templateAssets.bannerImage ? (
                  <div className="relative">
                    <img 
                      src={templateAssets.bannerImage} 
                      alt="Email Banner" 
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2U1ZTVlNSIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzk5OSI+QmFubmVyIEltYWdlPC90ZXh0Pgo8L3N2Zz4=';
                      }}
                    />
                    <button
                      onClick={() => setTemplateAssets(prev => ({ ...prev, bannerImage: null }))}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => openUploadModal('banner')}
                    className="w-full h-48 bg-green-50 border-2 border-dashed border-green-300 flex flex-col items-center justify-center cursor-pointer hover:bg-green-100 transition-colors"
                  >
                    <Upload size={32} className="text-green-600 mb-2" />
                    <p className="text-green-700 font-medium">Upload Banner Image</p>
                    <p className="text-green-600 text-sm">Click to upload or enter URL</p>
                  </div>
                )}
              </div>

              {/* Email Content */}
              <div className="p-8">
                {/* Greeting */}
                <p className="text-lg mb-4">Hi {'{first_name}'},</p>

                {/* Email Body */}
                <div className="space-y-4 text-gray-700">
                  {generatedEmail.split('\n\n').map((paragraph, index) => {
                    if (paragraph.includes('Hi {first_name}')) return null;
                    if (paragraph.includes(campaignData.signature_block)) return null;
                    
                    return (
                      <p key={index} className="leading-relaxed">
                        {paragraph.split(/(\{[^}]+\})/).map((part, i) => (
                          <span key={i}>
                            {part.match(/\{[^}]+\}/) ? (
                              <span className="bg-yellow-200 px-1 rounded font-mono text-sm">{part}</span>
                            ) : (
                              part
                            )}
                          </span>
                        ))}
                      </p>
                    );
                  })}
                </div>

                {/* Testimonial */}
                {campaignData.testimonial && campaignData.testimonial !== 'skip' && (
                  <div className="mt-6 p-6 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
                    <p className="text-gray-700 italic">"{campaignData.testimonial}"</p>
                  </div>
                )}

                {/* Signature */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="flex items-start gap-4">
                    {templateAssets.signatureImage ? (
                      <div className="relative group">
                        <img 
                          src={templateAssets.signatureImage} 
                          alt="Signature" 
                          className="w-32 h-32 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <button
                          onClick={() => setTemplateAssets(prev => ({ ...prev, signatureImage: null }))}
                          className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => openUploadModal('signature')}
                        className="w-32 h-32 bg-gray-50 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors rounded"
                      >
                        <ImageIcon size={20} className="text-gray-400 mb-1" />
                        <p className="text-gray-500 text-xs text-center">Add Logo/Signature</p>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">Warm regards,</p>
                      {signatureLines.map((line, index) => (
                        <p key={index} className="text-gray-700 text-sm">{line}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Image */}
              <div className="relative group">
                {templateAssets.footerImage ? (
                  <div className="relative">
                    <img 
                      src={templateAssets.footerImage} 
                      alt="Email Footer" 
                      className="w-full h-32 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2U1ZTVlNSIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzk5OSI+Rm9vdGVyIEltYWdlPC90ZXh0Pgo8L3N2Zz4=';
                      }}
                    />
                    <button
                      onClick={() => setTemplateAssets(prev => ({ ...prev, footerImage: null }))}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => openUploadModal('footer')}
                    className="w-full h-32 bg-green-50 border-2 border-dashed border-green-300 flex flex-col items-center justify-center cursor-pointer hover:bg-green-100 transition-colors"
                  >
                    <Upload size={24} className="text-green-600 mb-1" />
                    <p className="text-green-700 font-medium text-sm">Upload Footer Image</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Upload Modal */}
          {showUploadModal && currentUploadType && (
            <div className="fixed inset-0 z-60 bg-black bg-opacity-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h3 className="text-lg font-bold mb-4">
                  Add {currentUploadType.charAt(0).toUpperCase() + currentUploadType.slice(1)} Image
                </h3>
                
                <div className="space-y-4">
                  {/* URL Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Image URL
                    </label>
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      onClick={() => {
                        if (imageUrl.trim()) {
                          handleImageUrlInput(imageUrl, currentUploadType);
                          setShowUploadModal(false);
                        }
                      }}
                      className="mt-2 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Add from URL
                    </button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">Or</span>
                    </div>
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="block w-full cursor-pointer">
                      <div className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-green-400 transition-colors">
                        <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                        <p className="text-gray-600">Click to upload from computer</p>
                        <p className="text-gray-400 text-sm mt-1">PNG, JPG up to 5MB</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          handleImageUpload(e, currentUploadType);
                          setShowUploadModal(false);
                        }}
                      />
                    </label>
                  </div>

                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const EmailPreview = () => {
    if (!showEmailPreview) return null;

    const emailLines = generatedEmail.split('\n');
    const hasTestimonial = campaignData.testimonial && campaignData.testimonial !== 'skip';

    return (
           <div className="my-4 bg-white rounded-lg shadow-lg border-2 border-green-500 overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <ImageIcon size={20} />
            Email Preview
          </h3>
        </div>
        
        <div className="p-6">
          {/* Banner Image Placeholder */}
          {campaignData.banner_image_url && campaignData.banner_image_url !== 'skip' && (
            <div className="mb-4 p-8 bg-green-100 border-2 border-green-300 rounded text-center">
              <span className="text-green-700 font-mono">{`{banner_image_url}`} - Banner Image</span>
            </div>
          )}
          
          {/* Email Body */}
          <div className="space-y-4">
            {emailLines.map((line, index) => {
              if (line.trim() === '') return <br key={index} />;
              
              // Highlight placeholders
              const highlightedLine = line.replace(/\{([^}]+)\}/g, '<span class="bg-yellow-200 px-1 rounded font-mono text-sm">{$1}</span>');
              
              return (
                <p key={index} dangerouslySetInnerHTML={{ __html: highlightedLine }} />
              );
            })}
          </div>
          
          {/* Testimonial Section */}
          {hasTestimonial && (
            <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
              <p className="italic text-gray-700">{campaignData.testimonial}</p>
            </div>
          )}
          
          {/* Footer Image Placeholder */}
          {campaignData.footer_image_url && campaignData.footer_image_url !== 'skip' && (
            <div className="mt-6 p-8 bg-green-100 border-2 border-green-300 rounded text-center">
              <span className="text-green-700 font-mono">{`{footer_image_url}`} - Footer Image</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Globe size={28} />
              PitchDraft Email Campaign Builder
            </h1>
            <p className="text-green-100 mt-2">AI-powered email campaign creation with smart placeholders</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="bg-green-700 px-2 py-1 rounded">Step {currentStepIndex + 1} of 12</span>
              <span className="bg-green-700 px-2 py-1 rounded">Real-time Web Research</span>
              <span className="bg-green-700 px-2 py-1 rounded">GPT-5 Powered</span>
            </div>
          </div>

          {/* Messages Container */}
          <div className="h-[600px] overflow-y-auto p-6 bg-gray-50">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 ${
                      message.type === 'user'
                        ? 'bg-green-600 text-white'
                        : 'bg-white text-gray-800 shadow-sm'
                    }`}
                  >
                    {renderMessageContent(message.content)}
                    <div className={`text-xs mt-2 ${
                      message.type === 'user' ? 'text-green-200' : 'text-gray-400'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Email Preview */}
              <EmailPreview />
              
              {/* Typing/Scraping Indicators */}
              {(isTyping || isScraping) && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center space-x-2">
                      {isScraping ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                          <span className="text-sm text-gray-600">Performing web research...</span>
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
          </div>

          {/* Input Area */}
          <div className="border-t bg-white p-4">
            <div className="flex items-center space-x-2">
              <textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your answer..."
                className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={2}
                disabled={isTyping || isScraping}
              />
              <button
                onClick={handleSendMessage}
                disabled={isTyping || isScraping || !currentAnswer.trim()}
                className={`rounded-lg p-3 transition-all ${
                  isTyping || isScraping || !currentAnswer.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                <Send size={20} />
              </button>
            </div>
            
            {/* Quick Actions */}
            {currentStepIndex === questionSteps.length + 1 && showEmailPreview && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setCurrentAnswer('approve')}
                  className="flex-1 bg-green-100 text-green-700 px-4 py-2 rounded-lg hover:bg-green-200 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle size={16} />
                  Approve Email
                </button>
                <button
                  onClick={() => setCurrentAnswer('regenerate')}
                  className="flex-1 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw size={16} />
                  Regenerate
                </button>
                <button
                  onClick={() => setShowTemplatePreview(true)}
                  className="flex-1 bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye size={16} />
                  Preview Template
                </button>
              </div>
            )}
            
            {/* Skip Option for Optional Fields */}
            {currentStepIndex < questionSteps.length && questionSteps[currentStepIndex]?.optional && (
              <div className="mt-2">
                <button
                  onClick={() => setCurrentAnswer('skip')}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Skip this step →
                </button>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="bg-gray-200 h-1">
            <div 
              className="bg-green-600 h-1 transition-all duration-500"
              style={{ width: `${(currentStepIndex / 12) * 100}%` }}
            />
          </div>
        </div>

        {/* Data Summary Panel (shown after completion) */}
        {currentStepIndex > questionSteps.length + 1 && (
          <div className="mt-6 bg-white rounded-lg shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <CheckCircle className="text-green-600" />
              Campaign Data Collected
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(campaignData).map(([key, value]) => 
                value && value !== 'skip' ? (
                  <div key={key} className="bg-gray-50 p-3 rounded">
                    <span className="font-mono text-sm text-gray-600">{`{${key}}`}</span>
                    <p className="text-sm mt-1 truncate" title={value}>
                      {value}
                    </p>
                  </div>
                ) : null
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button 
                onClick={() => {
                  const dataStr = JSON.stringify(campaignData, null, 2);
                  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                  const exportFileDefaultName = `campaign_${Date.now()}.json`;
                  
                  const linkElement = document.createElement('a');
                  linkElement.setAttribute('href', dataUri);
                  linkElement.setAttribute('download', exportFileDefaultName);
                  linkElement.click();
                }}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Export Configuration
              </button>
              <button 
                onClick={() => {
                  // Copy to clipboard
                  navigator.clipboard.writeText(JSON.stringify(campaignData, null, 2));
                  alert('Campaign data copied to clipboard!');
                }}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Copy to Clipboard
              </button>
              <button 
                onClick={() => setShowTemplatePreview(true)}
                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                <Eye size={16} />
                View Template
              </button>
            </div>
          </div>
        )}

        {/* API Status Indicator */}
               <div className="mt-4 text-center text-xs text-gray-500">
          {isScraping ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Connected to AI Research API
            </span>
          ) : (
            <span>Session ID: {userId.substring(0, 8)}...</span>
          )}
        </div>
      </div>

      {/* Template Preview Modal */}
      {showTemplatePreview && <TemplatePreview />}

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

        /* Custom scrollbar for chat */
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
          transition-property: background-color, border-color, color, fill, stroke;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: 150ms;
        }

        /* Modal backdrop */
        .fixed {
          backdrop-filter: blur(2px);
        }

        /* Loading animation */
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default EmailCampaignBuilder;