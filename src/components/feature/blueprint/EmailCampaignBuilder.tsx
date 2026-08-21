import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { faAngleRight, faAngleLeft, faCircleRight, faCircleLeft } from "@fortawesome/free-solid-svg-icons";
import BlueprintBuilderPanel from "./BlueprintBuilderPanel";
import InstructionSetManager from "./InstructionSetManager";
import { categoryLabel } from "./categoryLabels";
import {
  Send,
  Loader2,
  RefreshCw,
  FileText,
  MessageSquare,
  CheckCircle,
  XCircle,
  ChevronDown,
  Volume2,
  VolumeX,
  Palette,
  Magnet,
  Search,
  Target,
  RotateCcw,
  Zap,
  TrendingUp,
  User,
  Megaphone,
  Edit3,
  Image as ImageIcon,
  Ban,
  Plus,
  Mic,
  ArrowUp,
} from "lucide-react";
import axios from "axios";
import API_BASE_URL from "../../../config";
import { extractGenerationInsights } from "../../../utils/generationInsights";
import "./EmailCampaignBuilder.css";
import notificationSound from "../../../assets/sound/notification.mp3";
import { AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import PaginationControls from "../PaginationControls";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";
import downArrow from "../../assets/images/down.png";
import PopupModal from "../../common/PopupModal";
import toggleOn from "../../../assets/images/on-button.png";
import toggleOff from "../../../assets/images/off-button.png";
import witchLogo from "../../../assets/images/Witch_logo_AI.png";
import startFromExistingEmail from "../../../assets/images/blueprint_start_existing_email.png";
import startFromScratch from "../../../assets/images/blueprint_start_from_scratch.png";
import RichTextEditor from "../../common/RTEEditor";
import DOMPurify from "dompurify";
import LoadingSpinner from "../../common/LoadingSpinner";
import { OPENAI_MODELS, isDeepSeekModel } from "../../../utils/aiModels";
import { defaultButtonStyle, lessPriorityButtonStyle } from "../../../styles/buttonStyles";

// The blueprint builder / instruction set must never run on a DeepSeek model.
// Coerce any DeepSeek (or empty) value back to a safe OpenAI default so loading
// an older definition/template that was saved with DeepSeek doesn't bring it back.
const DEFAULT_BUILDER_MODEL = "gpt-5.1";

// Minimum plain-text length (HTML stripped, ends trimmed) for a blueprint's
// example_output_email to count as "a real example email" — one of the signals
// that a loaded blueprint is already built (opens in edit mode) and that the
// preview can be generated. It is not the only one: see loadTemplateForEdit.
const MIN_EXAMPLE_EMAIL_LENGTH = 10;
const toBuilderModel = (model?: string | null): string =>
  !model || isDeepSeekModel(model) ? DEFAULT_BUILDER_MODEL : model;
const PITCH_GENERATION_API_BASE_URL = "https://playground.esuk.co.uk";
//const PITCH_GENERATION_API_BASE_URL = "https://localhost:7216";

// --- Type Definitions ---
export interface Message {
  type: "user" | "bot";
  content: string;
  timestamp: Date;
}

interface StoredChatMessage {
  role?: string;
  content?: string;
}

// include both old and new tab keys
type MainTab = "build" | "instructions" | "ct";
type BuildSubTab = "chat" | "elements";

export type GPTModel = {
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
  categorySequence: number; // ⭐ NEW
  placeholderSequence: number; // ⭐ NEW
  options?: string[];

  // ✅ TEMP UI-only raw editor value (NOT saved to backend)
  _rawOptions?: string;
  helpLink?: string;
  defaultValue?: string;
  description?: string;

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
  saveDefinitionStatus: "idle" | "success" | "error";
  templateDefinitions: TemplateDefinition[];
  loadTemplateDefinition: (id: number) => Promise<void>;
  selectedTemplateDefinitionId: number | null;
  templateName: string;
  setTemplateName: (value: string) => void;
}

// Minimal shape needed to render the blueprint switcher dropdown in the header.
export interface BlueprintSwitcherOption {
  id: number;
  templateName: string;
}

interface EmailCampaignBuilderProps {
  selectedClient: string | null;
  onBeforeAiChatOpen?: () => Promise<boolean>;
  onExitBuilder?: () => void;
  // Admin-only blueprint switcher. The parent passes these only when the user is
  // an ADMIN; when omitted the dropdown is not rendered at all.
  blueprintOptions?: BlueprintSwitcherOption[];
  activeBlueprintId?: number | null;
  onBlueprintChange?: (blueprintId: number) => void;
  isSwitchingBlueprint?: boolean;
}

interface ConversationTabProps {
  // --- Core fields ---
  isTemplateLoading?: boolean;
  conversationStarted: boolean;
  messages: Message[];
  isTyping: boolean;
  isComplete: boolean;

  currentAnswer: string;
  setCurrentAnswer: (value: string) => void;
  handleSendMessage: (overrideText?: string) => void;
  handleKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  resetAll: () => void;
  onExitBuilder?: () => void;
  onStartConversation?: (method: "reference" | "description", initialMessage: string) => void;
  onApprove?: () => void;

  // --- Edit‑mode support ---
  isEditMode?: boolean;
  availablePlaceholders?: string[];
  placeholderValues?: Record<string, string>;
  onPlaceholderSelect?: (placeholder: string) => void;
  selectedPlaceholder?: string;
  setIsTyping?: (value: boolean) => void;

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

  filledTemplate: string; // <-- ADD THIS
  editTemplateId?: number | null;

  groupedPlaceholders: Record<string, PlaceholderDefinitionUI[]>;
  initialExampleEmail: string;
  selectedElement?: string | null;

  attachedImages: string[];
  setAttachedImages: React.Dispatch<React.SetStateAction<string[]>>;
  handleImageUpload: (file: File) => Promise<void>;
  isPreviewLoading?: boolean;
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
  "full_name",
  "first_name",
  "last_name",
  "linkedin_url",
  "job_title",
  "location",
  "company_name",
  "company_name_friendly",
  "company_name_abbrev",
  "website",
];

// ====================================================================
// HELPER FUNCTIONS
// ====================================================================
const ExampleEmailEditor: React.FC<{
  value: string;
  onChange: (val: string) => void;
  height?: number;
  showActionButtons?: boolean;
  finalPrompt?: string;
  webSearchData?: string;
  insightEmails?: string;
  insightNotes?: string;
  insightProfessionalSummary?: string;
  // Action-bar wiring — the same set the Inbox and Output editors pass, so the
  // preview toolbar carries every control in all three places.
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  regenerateDisabled?: boolean;
  showDeviceButton?: boolean;
  outputEmailWidth?: string;
  openDeviceDropdown?: boolean;
  onDeviceDropdownToggle?: () => void;
  onDeviceWidthChange?: (width: string) => void;
  onExpandEditor?: () => void;
}> = ({
  value,
  onChange,
  height = 320,
  showActionButtons,
  finalPrompt,
  webSearchData,
  insightEmails,
  insightNotes,
  insightProfessionalSummary,
  onRegenerate,
  isRegenerating,
  regenerateDisabled,
  showDeviceButton,
  outputEmailWidth,
  openDeviceDropdown,
  onDeviceDropdownToggle,
  onDeviceWidthChange,
  onExpandEditor,
}) => {
  return (
    <RichTextEditor
      value={value}
      onChange={onChange}
      height={height}
      showActionButtons={showActionButtons}
      finalPrompt={finalPrompt}
      webSearchData={webSearchData}
      insightEmails={insightEmails}
      insightNotes={insightNotes}
      insightProfessionalSummary={insightProfessionalSummary}
      onRegenerate={onRegenerate}
      isRegenerating={isRegenerating}
      regenerateDisabled={regenerateDisabled}
      showDeviceButton={showDeviceButton}
      outputEmailWidth={outputEmailWidth}
      openDeviceDropdown={openDeviceDropdown}
      onDeviceDropdownToggle={onDeviceDropdownToggle}
      onDeviceWidthChange={onDeviceWidthChange}
      onExpandEditor={onExpandEditor}
    />
  );
};

// Filter out contact placeholders - keep only conversation placeholders
const getConversationPlaceholders = (
  allPlaceholders: Record<string, string>,
): Record<string, string> => {
  const filtered: Record<string, string> = {};

  Object.keys(allPlaceholders || {}).forEach((key) => {
    if (!CONTACT_PLACEHOLDERS.includes(key)) {
      filtered[key] = allPlaceholders[key] || "";
    }
  });

  return filtered;
};

type PageSize = number | "All";
// Get only contact placeholders from merged set
const getContactPlaceholders = (
  allPlaceholders: Record<string, string>,
): Record<string, string> => {
  const contactOnly: Record<string, string> = {};

  CONTACT_PLACEHOLDERS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(allPlaceholders, key)) {
      contactOnly[key] = allPlaceholders[key] || "";
    }
  });

  return contactOnly;
};

// Merge conversation + contact placeholders for display/preview only
const getMergedPlaceholdersForDisplay = (
  conversationPlaceholders: Record<string, string>,
  contactPlaceholders: Record<string, string>,
): Record<string, string> => {
  return { ...conversationPlaceholders, ...contactPlaceholders };
};

// ====================================================================
// CHILD COMPONENTS
// ====================================================================
export function useSessionState<T>(
  key: string,
  defaultValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    const saved = sessionStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  });

  useEffect(() => {
    sessionStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState];
}

const cleanStoredAssistantMessage = (text: string): string => {
  if (!text) return "";

  return text
    .replace(
      /==PLACEHOLDER_VALUES_START==[\s\S]*?==PLACEHOLDER_VALUES_END==/g,
      "",
    )
    .replace(/{\s*"status"[\s\S]*?}/g, "")
    .trim();
};

const readStoredChatMessages = (source: any): StoredChatMessage[] | undefined => {
  if (!source) return undefined;

  if (Array.isArray(source)) {
    return source;
  }

  if (typeof source === "string") {
    try {
      const parsed = JSON.parse(source);
      return Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }

  return (
    readStoredChatMessages(source.messages) ||
    readStoredChatMessages(source.Messages) ||
    readStoredChatMessages(source.conversationData) ||
    readStoredChatMessages(source.ConversationData) ||
    readStoredChatMessages(source.history) ||
    readStoredChatMessages(source.History) ||
    readStoredChatMessages(source.conversation) ||
    readStoredChatMessages(source.Conversation)
  );
};

const mapStoredChatMessages = (storedMessages?: StoredChatMessage[]): Message[] => {
  if (!Array.isArray(storedMessages)) return [];

  return storedMessages
    .filter((message) => {
      const role = message.role?.toLowerCase();
      return role === "user" || role === "assistant";
    })
    .map((message): Message => {
      const role = message.role?.toLowerCase();
      const content = message.content || "";

      return {
        type: role === "assistant" ? "bot" : "user",
        content:
          role === "assistant" ? cleanStoredAssistantMessage(content) : content,
        timestamp: new Date(),
      };
    })
    .filter((message) => message.content.trim().length > 0);
};

const INITIAL_BLUEPRINT_WELCOME_MESSAGE = `
<div style="font-family:Inter, Segoe UI, Calibri, Arial, sans-serif; font-size:16px; line-height:1.6; color:#111827; background:#ffffff; border:1px solid #e5e7eb; border-radius:18px; padding:22px 20px; box-shadow:0 8px 30px rgba(15,23,42,0.06);">
  <div style="font-size:22px; line-height:1.3; font-weight:800; color:#111827; margin:0 0 14px 0;">
    Welcome to PitchKraft Blueprint Builder. What does it do and how?
  </div>
  <p style="margin:0 0 12px 0;">
    The Blueprint Builder sets the base blueprint (template) which PitchKraft will use to create all the beautifully relevant emails in this email campaign. It's a quick process and the thing to remember is: you don't need it perfect because you can change it anytime by going into the 'Elements' section afterwards. Just play, get a feel, use the Preview email section in the right to see how the emails will look and then play around in 'Elements' until you get that 'eureka' moment. Contact us for support ANYTIME.
  </p>
  <p style="margin:0 0 12px 0; font-weight:700; color:#111827;">
    Let's start with the 'reference email'.
  </p>
  <p style="margin:0 0 12px 0;">
    A reference email is an email which you might already use for this campaign. This is the quickest way to get up and running. The Blueprint Builder will extract the style and structure from the reference email for the emails it will create in PitchKraft for this campaign. Don't have a reference email? Don't worry. Blueprint Builder will build one with you.
  </p>
  <div style="margin:0 0 14px 0; padding:12px 14px; border:1px solid #e5e7eb; border-radius:14px; background:#f9fafb;">
    <div style="font-size:14px; line-height:1.5; font-weight:800; color:#374151; margin:0 0 8px 0;">
      What I need
    </div>
    <ul style="margin:0; padding-left:18px; color:#111827;">
      <li style="margin:0 0 6px 0;">an email you already use or have written for this campaign</li>
      <li style="margin:0 0 6px 0;">or a sample with your preferred tone or structure</li>
      <li style="margin:0;">or a short description of the style and goal you want</li>
    </ul>
  </div>
  <div style="margin:0 0 16px 0; display:flex; align-items:center; gap:8px;">
    <img src="https://user6733.na.imgto.link/public/20260406/help-removebg-preview.avif" alt="" style="width:17px; height:17px; display:block;">
    <span style="font-size:15px; line-height:1.5; color:#111827;">
      More help here:
    </span>
    <a href="https://www.pitchkraft.ai/your-current-email-template/" target="_blank" rel="noopener noreferrer" style="font-size:15px; line-height:1.5; color:#16a34a; text-decoration:underline; font-weight:600;">
      What is a reference email and why it matters
    </a>
  </div>
</div>
`.trim();

// Shared dark, ChatGPT-style instruction input used across the chat/refine steps.
// Text on top; a "+" attach on the bottom-left; mic + circular send on the right.
const BlueprintChatInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  onKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onAttach: (file: File) => void;
  isTyping: boolean;
  canSend: boolean;
  placeholder: string;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
}> = ({ value, onChange, onKeyPress, onSend, onAttach, isTyping, canSend, placeholder, inputRef }) => {
  return (
    <div style={{ maxWidth: 820, margin: "0 auto", width: "100%", background: "#2f2f2f", borderRadius: 26, padding: "12px 14px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
        }}
        onKeyPress={onKeyPress}
        placeholder={placeholder}
        className="bp-dark-input"
        disabled={isTyping}
        rows={1}
        style={{ width: "100%", border: "none", outline: "none", background: "transparent", color: "#fff", fontSize: 15, lineHeight: "22px", resize: "none", fontFamily: "inherit", maxHeight: 200, overflowY: "auto", padding: "2px 4px", display: "block" }}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* + attach */}
        <label style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "50%", cursor: isTyping ? "not-allowed" : "pointer", color: "#e5e5e5", border: "1px solid #4b4b4b", flexShrink: 0 }} title="Attach file">
          <input type="file" accept="image/*" hidden disabled={isTyping} onChange={(e) => { const f = e.target.files?.[0]; if (f) onAttach(f); e.currentTarget.value = ""; }} />
          <Plus size={18} />
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "50%", color: "#e5e5e5" }} title="Voice">
            <Mic size={18} />
          </span>
          <button onClick={onSend} disabled={isTyping || !canSend} title="Send"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "50%", background: isTyping || !canSend ? "#5a5a5a" : "#fff", color: isTyping || !canSend ? "#9ca3af" : "#111827", border: "none", cursor: isTyping || !canSend ? "not-allowed" : "pointer", flexShrink: 0 }}>
            <ArrowUp size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export const ConversationTab: React.FC<ConversationTabProps> = ({
  isTemplateLoading = false,
  conversationStarted,
  messages,

  isTyping,
  isComplete,
  currentAnswer,
  setCurrentAnswer,
  handleSendMessage,
  handleKeyPress,
  resetAll,
  onExitBuilder,
  isEditMode = false,
  availablePlaceholders = [],
  placeholderValues = {},
  onPlaceholderSelect,
  selectedPlaceholder,
  setIsTyping,
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
  editTemplateId, // ⭐ ADD THIS
  groupedPlaceholders,
  initialExampleEmail,
  selectedElement,

  attachedImages,
  setAttachedImages,
  handleImageUpload,
  onStartConversation,
  onApprove,
  isPreviewLoading = false,
}) => {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const hasExampleEmail = initialExampleEmail.trim().length > 0;

  // Wizard phase state
  const [localSelectedMethod, setLocalSelectedMethod] = useState<"reference" | "description" | null>(null);
  const [referenceEmailDraft, setReferenceEmailDraft] = useState("");
  const [referenceEmailSubmitted, setReferenceEmailSubmitted] = useState(false);
  const [blueprintApproved, setBlueprintApproved] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [showFullExampleEmail, setShowFullExampleEmail] = useState(false);
  // Phase 5: after the example email is approved we show a "blueprint ready"
  // step; only choosing "Fine-tune elements" advances to the elements editor.
  const [exampleApproved, setExampleApproved] = useState(false);

  // Track the message index when Phase 4 starts, so we only show refinement messages
  const phase4StartIndexRef = useRef<number | null>(null);
  useEffect(() => {
    if (blueprintApproved && phase4StartIndexRef.current === null) {
      phase4StartIndexRef.current = messages.length;
    } else if (!blueprintApproved) {
      phase4StartIndexRef.current = null;
      setExampleApproved(false);
    }
  }, [blueprintApproved]);

  // Auto-resize the input textarea as the user types
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    el.style.overflowY = el.scrollHeight > 160 ? "auto" : "hidden";
  }, [currentAnswer]);

  // The chat area is deliberately unbounded in height: the thread grows with the
  // conversation and the page is the only thing that scrolls. It used to be
  // capped to the viewport with its own inner scroller, which meant two nested
  // scrollbars down the right-hand side. The composer stays reachable because
  // it is `position: sticky` at the bottom of this column.
  // ========================================
  // IMAGE ATTACHMENT STATE








  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !messages.length) return;

    // While the bot is composing a reply, keep the "Blueprint Builder is
    // thinking…" indicator in view so the user sees the response is coming.
    // The thread has no scroller of its own, so this scrolls the page; the
    // indicator's `scroll-margin-bottom` keeps it clear of the sticky composer.
    // It re-pins on the next frame and once after layout settles, because late
    // layout (rendered HTML, images, the auto-growing composer) can otherwise
    // leave the indicator below the fold.
    if (isTyping) {
      const typingIndicator = container.querySelector(".typing-indicator");
      if (typingIndicator) {
        const pinToIndicator = () => {
          messagesContainerRef.current
            ?.querySelector(".typing-indicator")
            ?.scrollIntoView({ block: "end", behavior: "auto" });
        };
        pinToIndicator();
        const frame = requestAnimationFrame(pinToIndicator);
        const settleTimer = window.setTimeout(pinToIndicator, 200);
        return () => {
          cancelAnimationFrame(frame);
          window.clearTimeout(settleTimer);
        };
      }
    }

    const messageElements = container.querySelectorAll(".message-wrapper");
    if (!messageElements.length) return;

    const lastMessage = messageElements[messageElements.length - 1] as HTMLElement;
    const lastMessageType = messages[messages.length - 1]?.type;

    if (lastMessageType === "user") {
      lastMessage.scrollIntoView({ block: "end", behavior: "auto" });
    } else {
      lastMessage.scrollIntoView({ block: "start", behavior: "auto" });
      window.scrollBy(0, -16);
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (!isTyping && conversationStarted) {
      // wait for DOM + disabled=false
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isTyping, conversationStarted]);

  useEffect(() => {
    if (!messages.length) return;

    const last = messages[messages.length - 1].content;

    const isComplete =
      last.includes("==PLACEHOLDER_VALUES_START==") &&
      last.includes("==PLACEHOLDER_VALUES_END==") &&
      last.includes('"complete"');

  }, [messages]);

  const renderMessageContent = (rawContent: string) => {
    if (!rawContent) return null;

    // 🧹 CLEAN PLACEHOLDER BLOCK EVERY TIME
    let content = rawContent
      .replace(
        /==PLACEHOLDER_VALUES_START==[\s\S]*?==PLACEHOLDER_VALUES_END==/g,
        "",
      )
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

  const [popupmodalInfo, setPopupModalInfo] = useState({
    open: false,
    title: "",
    message: "",
  });
  const closeModal = () => {
    setPopupModalInfo((prev) => ({ ...prev, open: false }));
  };

  // ===============================
  // SAFE TRUNCATE HELPER
  // ===============================
  const truncate = (val: string, max = 50) =>
    val.length > max ? val.slice(0, max) + "…" : val;

  // ===============================
  // HTML → CLEAN TEXT (reference email box)
  // Preserves paragraph/line breaks and list bullets, then tidies whitespace
  // so a pasted email is sent to the AI as readable, well-spaced text.
  // ===============================
  const htmlToCleanText = (html: string): string => {
    let s = html
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\s*li[^>]*>/gi, "\n• ")
      .replace(/<\/(p|div|li|h[1-6]|tr|ul|ol|blockquote)>/gi, "\n");
    const decoded = new DOMParser().parseFromString(s, "text/html").body.textContent || "";
    return decoded
      .replace(/[ \t ]+/g, " ") // collapse runs of spaces/tabs/nbsp
      .replace(/ *\n */g, "\n")      // trim spaces around line breaks
      .replace(/\n{3,}/g, "\n\n")    // at most one blank line between blocks
      .trim();
  };

  // ===============================
  // GROUP PLACEHOLDERS (CATEGORY WISE)
  // ===============================

  // Derive current wizard phase (only applies to non-edit mode)
  const wizardPhase: 1 | 2 | 3 | 4 = !conversationStarted ? 1 : !isComplete ? 2 : !blueprintApproved ? 3 : 4;

  // Filtered conversation placeholders for review card
  const reviewPlaceholders = Object.entries(placeholderValues || {})
    .filter(([k, v]) => !CONTACT_PLACEHOLDERS.includes(k) && k !== "example_output_email" && v && v.trim())
    .slice(0, 8);

  return (
    <div className="conversation-container" style={{ display: "flex", flexDirection: "row" }}>

      {/* ---- RIGHT PANEL: all phase + edit mode content ---- */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

      {/* ===== PHASE 1: CHOOSE METHOD ===== */}
      {!isEditMode && wizardPhase === 1 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "16px", background: "#fff" }}>
          <div style={{ width: "100%", maxWidth: 1400, background: "#fff", borderRadius: 16, padding: "20px 28px" }}>
            {/* Header */}
            <div style={{ textAlign: "left", marginBottom: 18 }}>
              <h2 style={{ fontSize: 25, fontWeight: 800, color: "#111827", marginBottom: 8, lineHeight: 1.15 }}>Let's build your blueprint</h2>
              <p style={{ color: "#6b7280", fontSize: 13, maxWidth: 460, lineHeight: 1.55 }}>
                Choose how you'd like to start. We'll derive the placeholders and let you fine-tune before sending.
              </p>
            </div>

            {/* Method cards */}
            <div style={{ display: "flex", gap: 14, width: "100%", alignItems: "stretch", flexWrap: "wrap" }}>
              {[
                {
                  id: "reference" as const,
                  image: startFromExistingEmail,
                  accent: "#3f9f42",
                  iconBg: "#e7f6e8",
                  tagColor: "#2f7d32",
                  recommended: true,
                  title: "Start with an existing email",
                  paras: [
                    "Paste an email you already use. Not a template but one you actually have sent. Make sure it is personalized for the recipient and that the information that personalizes it is available from an internet search.",
                    "PitchKraft will derive the theme, the hook and the way in which you currently personalize the email and create a blueprint so it can create emails to all your other contacts and personalize each of them in the same way.",
                  ],
                  tagSymbol: "✓",
                  tags: ["Smarter setup", "More accurate", "Learns your style"],
                },
                {
                  id: "description" as const,
                  image: startFromScratch,
                  accent: "#7c3aed",
                  iconBg: "#f1ecfe",
                  tagColor: "#6d28d9",
                  recommended: false,
                  title: "Start from scratch",
                  paras: [
                    "If you don't already have an existing email that you use then PitchKraft will work with you to create it.",
                    "The Blueprint Builder will ask you to give information about your organization, what it is promoting and how you want to make each of the emails hyper-relevant to each of your contacts.",
                    "This is the 'hook' and the internet search to create the hook for each prospect is the 'personalization search'.",
                    "Just dive in. It's much easier than it sounds.",
                  ],
                  tagSymbol: "+",
                  tags: ["Guided setup", "AI-powered", "Great for new users"],
                },
              ].map((opt) => {
                const selected = localSelectedMethod === opt.id;
                return (
                  <div key={opt.id} onClick={() => setLocalSelectedMethod(opt.id)}
                    style={{ flex: "1 1 290px", minWidth: 270, padding: 20, border: `2px solid ${selected ? opt.accent : "#e5e7eb"}`, borderRadius: 14, cursor: "pointer", background: "#fff", transition: "all 0.2s", display: "flex", flexDirection: "column" }}>
                    {/* Top row: icon + (recommended) + radio */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 13 }}>
                      {/* Illustration rather than a glyph in a tinted chip — the
                          artwork carries the detail, so it gets room to breathe
                          and no background tint behind it. */}
                      <img
                        src={opt.image}
                        alt=""
                        style={{ width: 96, height: 68, objectFit: "contain", objectPosition: "left center", flexShrink: 0 }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {opt.recommended && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#e7f6e8", color: "#2f7d32", fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 999 }}>
                            ⭐ Recommended
                          </span>
                        )}
                        <div style={{ width: 17, height: 17, borderRadius: "50%", border: `2px solid ${selected ? opt.accent : "#d1d5db"}`, background: selected ? opt.accent : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {selected && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 20, color: "#111827", marginBottom: 10 }}>{opt.title}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 15 }}>
                      {opt.paras.map((p, i) => (
                        <p key={i} style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.55 }}>{p}</p>
                      ))}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: "auto" }}>
                      {opt.tags.map((t) => (
                        <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: opt.iconBg, color: opt.tagColor, fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 999 }}>
                          <span style={{ fontWeight: 700 }}>{opt.tagSymbol}</span> {t}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            {(() => {
              const busy = isTemplateLoading || isStarting;
              return (
                <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center", marginTop: 20 }}>
                  <button
                    onClick={() => {
                      if (!localSelectedMethod || busy) return;
                      setIsStarting(true);
                      const msg = localSelectedMethod === "reference"
                        ? "I'll start from a reference email."
                        : "I'll start from a description.";
                      onStartConversation?.(localSelectedMethod, msg);
                    }}
                    disabled={!localSelectedMethod || busy}
                    style={{ ...defaultButtonStyle, display: "flex", alignItems: "center", gap: 8, minWidth: 120, justifyContent: "center", cursor: localSelectedMethod && !busy ? "pointer" : "not-allowed", opacity: localSelectedMethod && !busy ? 1 : 0.5 }}>
                    {busy ? (
                      <>
                        <Loader2 size={16} style={{ animation: "campaign-builder-spin 1s linear infinite" }} />
                        Setting up…
                      </>
                    ) : "Continue →"}
                  </button>
                </div>
              );
            })()}
            <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 13 }}>
              🛡️ Don't worry — you can switch methods anytime before approving the blueprint.
            </p>
          </div>
        </div>
      )}

      {/* ===== EDIT MODE: placeholder dropdown ===== */}
      {isEditMode && (
        <div className="chat-placeholder-panel px-[20px] pt-[20px]" style={{ color: "#3f9f42" }}>
          <select
            className="placeholder-dropdown"
            value={selectedPlaceholder || ""}
            onChange={(e) => {
              const value = e.target.value;
              if (value) setIsTyping?.(true);
              onPlaceholderSelect?.(value);
            }}
            disabled={isTyping}
          >
            <option value="">Edit elements</option>
            {Object.entries(groupedPlaceholders).map(([category, placeholders]) => (
              <optgroup key={category} label={categoryLabel(category)}>
                {placeholders.map((p) => {
                  const value = placeholderValues?.[p.placeholderKey] || "";
                  return (
                    <option key={p.placeholderKey} value={p.placeholderKey}>
                      {p.friendlyName}{value ? ` — ${truncate(value)}` : " — Not set"}
                    </option>
                  );
                })}
              </optgroup>
            ))}
          </select>
          {!(conversationStarted || (isEditMode && selectedElement)) && (
            <div style={{ padding: "10px", background: "#f3f4f6", color: "#111827" }}>
              <div className="email-preview-content" dangerouslySetInnerHTML={{ __html: hasExampleEmail ? initialExampleEmail : "<p style='color:#6b7280'>No example email loaded.</p>" }} />
            </div>
          )}
        </div>
      )}

      {/* ===== PHASE 2: PROVIDE INPUT (CHAT) ===== */}
      {(isEditMode || wizardPhase === 2) && (
        <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 180px)" }}>
          {/* Messages — no overflow of its own; the page scrolls instead */}
          <div className="messages-area" ref={messagesContainerRef} style={{ flex: 1 }}>
            {isEditMode && !conversationStarted && selectedPlaceholder && (
              <div className="empty-conversation"><p>Preparing conversation…</p></div>
            )}
            {/* Welcome hero */}
            {!isEditMode && (
              <div style={{ textAlign: "center", padding: "28px 20px 12px" }}>
                <div style={{ width: 104, height: 104, borderRadius: "50%", background: "radial-gradient(circle, #eafaf0 0%, #f7fdf9 65%, transparent 100%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                  <img src={witchLogo} alt="Blueprint Assistant" style={{ width: 78, height: 78, objectFit: "contain" }} />
                </div>
                <h2 style={{ fontSize: 26, fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>
                  Hi! I am your <span style={{ color: "#3f9f42" }}>Blueprint Assistant</span>
                </h2>
              </div>
            )}
            {(conversationStarted || isEditMode) && (
              <div className="messages-list">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`message-wrapper ${msg.type}`} style={msg.type === "bot" ? { alignItems: "flex-start", gap: 10 } : undefined}>
                    {msg.type === "bot" && (
                      <img src={witchLogo} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "contain", background: "#f0fdf4", border: "1.5px solid #86efac", padding: 3, flexShrink: 0, marginTop: 2 }} />
                    )}
                    <div className={`message-bubble ${msg.type}`}>
                      {renderMessageContent(msg.content)}
                      <div className={`message-time ${msg.type}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="typing-indicator">
                    <div className="typing-dots-row">
                      <div className="typing-avatar"><img src={witchLogo} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} /></div>
                      <div className="typing-dots-bubble">
                        <div className="typing-dot" />
                        <div className="typing-dot" />
                        <div className="typing-dot" />
                      </div>
                      {/* Sits on the dots row, not under it: as the last thing in
                          the thread the indicator hugs the bottom of the scroll
                          area, and a label on its own line below the bubble was
                          the part that got clipped. */}
                      <span className="typing-label">Blueprint Builder is thinking…</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Attached images */}
          {attachedImages.length > 0 && (
            <div className="flex gap-2 px-3 pb-2 flex-wrap">
              {attachedImages.map((url, idx) => (
                <div key={idx} className="relative">
                  <img src={url} className="w-16 h-16 object-cover rounded border" />
                  <button className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs px-1"
                    onClick={() => setAttachedImages((prev) => prev.filter((_, i) => i !== idx))}>✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Input area */}
          {(() => {
          // Only render the input bar (with its top border) when a composer will
          // actually appear inside it — otherwise it shows as an empty line while
          // the bot is "thinking" before the reference composer is revealed.
          const showReferenceComposer =
            !isEditMode && localSelectedMethod === "reference" && !referenceEmailSubmitted && messages.length > 0 && !isTyping;
          const showNormalComposer = isEditMode || localSelectedMethod !== "reference" || referenceEmailSubmitted;
          return conversationStarted && (showReferenceComposer || showNormalComposer) && (
            <div className="input-area" style={{ position: "sticky", bottom: 0, zIndex: 10, background: "#fff" }}>
              {/* Reference email big textarea (shown until submitted) */}
              {showReferenceComposer && (
                <div style={{ padding: "12px 16px", maxWidth: 820, margin: "0 auto" }}>
                  {/* Composer — same look as the answer/instruction input */}
                  <div style={{ background: "#2f2f2f", borderRadius: 26, padding: "12px 14px 10px", display: "flex", flexDirection: "column", gap: 8, transition: "box-shadow 0.15s" }}>
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      role="textbox"
                      aria-multiline="true"
                      className="reference-email-editor"
                      data-placeholder="Paste your reference email here…"
                      onInput={(e) => setReferenceEmailDraft(htmlToCleanText((e.currentTarget as HTMLDivElement).innerHTML))}
                      onPaste={(e) => {
                        e.preventDefault();
                        const html = e.clipboardData.getData("text/html");
                        const text = e.clipboardData.getData("text/plain");
                        if (html) {
                          const clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
                          document.execCommand("insertHTML", false, clean);
                        } else {
                          document.execCommand("insertText", false, text);
                        }
                        setReferenceEmailDraft(htmlToCleanText((e.currentTarget as HTMLDivElement).innerHTML));
                      }}
                      style={{ width: "100%", minHeight: 24, maxHeight: 320, padding: "2px 4px", border: "none", outline: "none", background: "transparent", color: "#f3f4f6", fontSize: 14, fontFamily: "inherit", lineHeight: 1.6, overflow: "auto" }}
                    />
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      {/* + attach */}
                      <label style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "50%", cursor: isTyping ? "not-allowed" : "pointer", color: "#e5e5e5", border: "1px solid #4b4b4b", flexShrink: 0 }} title="Attach file">
                        <input type="file" accept="image/*" hidden disabled={isTyping} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.currentTarget.value = ""; }} />
                        <Plus size={18} />
                      </label>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "50%", color: "#e5e5e5" }} title="Voice">
                          <Mic size={18} />
                        </span>
                        <button
                          onClick={() => {
                            if (!referenceEmailDraft.trim() && attachedImages.length === 0) return;
                            setReferenceEmailSubmitted(true);
                            handleSendMessage(referenceEmailDraft.trim() || undefined);
                            setReferenceEmailDraft("");
                          }}
                          disabled={isTyping || (!referenceEmailDraft.trim() && attachedImages.length === 0)}
                          title="Derive blueprint"
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "50%", background: isTyping || (!referenceEmailDraft.trim() && attachedImages.length === 0) ? "#5a5a5a" : "#fff", color: isTyping || (!referenceEmailDraft.trim() && attachedImages.length === 0) ? "#9ca3af" : "#111827", border: "none", cursor: isTyping || (!referenceEmailDraft.trim() && attachedImages.length === 0) ? "not-allowed" : "pointer", flexShrink: 0 }}>
                          <ArrowUp size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Normal chat input — show unless waiting for reference email paste */}
              {showNormalComposer && (
                <BlueprintChatInput
                  value={currentAnswer}
                  onChange={setCurrentAnswer}
                  onKeyPress={handleKeyPress}
                  onSend={() => handleSendMessage()}
                  onAttach={handleImageUpload}
                  isTyping={isTyping}
                  canSend={!!currentAnswer.trim() || attachedImages.length > 0}
                  placeholder="Type your answer…"
                  inputRef={inputRef}
                />
              )}
            </div>
          );
          })()}
        </div>
      )}

      {/* ===== PHASE 3: REVIEW BLUEPRINT ===== */}
      {!isEditMode && wizardPhase === 3 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 0" }}>
            {/* Bot intro */}
            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 14, color: "#374151", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <img src={witchLogo} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "contain", background: "#f0fdf4", border: "1.5px solid #86efac", padding: 3, flexShrink: 0 }} />
              <span>Here's what I derived. Have a quick read — you can approve, ask me to refine it, or rewrite from scratch.</span>
            </div>

            {/* Blueprint review card */}
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", padding: "20px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ background: "#dcfce7", color: "#16a34a", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 4, letterSpacing: "0.04em" }}>DERIVED BLUEPRINT</span>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>Generated just now</span>
              </div>

              {reviewPlaceholders.length > 0 ? (
                reviewPlaceholders.map(([key, value], idx) => (
                  <div key={key} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: idx < reviewPlaceholders.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.06em", marginBottom: 4, textTransform: "uppercase" }}>
                      {key.replace(/_/g, " ")}
                    </div>
                    <div style={{ fontSize: 14, color: "#111827", lineHeight: 1.55 }}>{value}</div>
                  </div>
                ))
              ) : (
                <p style={{ color: "#9ca3af", fontSize: 14 }}>Blueprint elements are being finalised…</p>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 14, borderTop: "1px solid #f3f4f6" }}>
                <span style={{ fontSize: 13, color: "#6b7280" }}>Next: we'll generate an example email for you to approve.</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => handleSendMessage("Rewrite the blueprint from scratch — regenerate all the elements again.")}
                    disabled={isTyping}
                    style={{ padding: "8px 16px", border: "1px solid #d1d5db", borderRadius: 8, background: "#fff", fontSize: 14, cursor: isTyping ? "not-allowed" : "pointer", color: "#374151", opacity: isTyping ? 0.6 : 1 }}>
                    Rewrite
                  </button>
                  <button
                    onClick={() => setBlueprintApproved(true)}
                    style={{ ...defaultButtonStyle, display: "flex", alignItems: "center", gap: 6 }}>
                    Approve →
                  </button>
                </div>
              </div>
            </div>

            {/* Typing indicator for Phase 3 */}
            {isTyping && (
              <div className="typing-indicator" style={{ padding: "0 16px 8px" }}>
                <div className="typing-dots-row">
                  <div className="typing-avatar"><img src={witchLogo} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} /></div>
                  <div className="typing-dots-bubble">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
                <span className="typing-label">Updating blueprint…</span>
              </div>
            )}

            {/* Refinement quick actions */}
            {!isTyping && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", marginBottom: 12, letterSpacing: "0.05em", fontWeight: 600 }}>REFINE THIS BLUEPRINT</p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                  {[
                    { icon: Palette, color: "#16a34a", bg: "#eafaf0", label: "Change theme", msg: "Let's change the theme of the blueprint." },
                    { icon: Magnet, color: "#9333ea", bg: "#f5edfe", label: "Change hook", msg: "Let's change the hook." },
                    { icon: Search, color: "#0d9488", bg: "#e6f7f5", label: "Change personalization search", msg: "Let's change the personalization search." },
                    { icon: RefreshCw, color: "#ea580c", bg: "#fef1e7", label: "Retry with different reference emails", msg: "Retry with different reference emails." },
                    { icon: Target, color: "#2563eb", bg: "#e8f0fe", label: "Make it closer to my reference emails personalization", msg: "Make it closer to my reference emails' personalization." },
                  ].map((a) => {
                    const Icon = a.icon;
                    return (
                      <button key={a.label}
                        onClick={() => handleSendMessage(a.msg)}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.background = "#fbfdfc"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.background = "#fff"; }}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", fontSize: 13, cursor: "pointer", color: "#374151", fontWeight: 500, transition: "border-color 0.15s, background 0.15s" }}>
                        <span style={{ width: 26, height: 26, borderRadius: 8, background: a.bg, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon size={15} color={a.color} />
                        </span>
                        {a.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Refinement chat input */}
          <div style={{ borderTop: "1px solid #e5e7eb", padding: "12px 16px", background: "#fff" }}>
            <BlueprintChatInput
              value={currentAnswer}
              onChange={setCurrentAnswer}
              onKeyPress={handleKeyPress}
              onSend={() => handleSendMessage()}
              onAttach={handleImageUpload}
              isTyping={isTyping}
              canSend={!!currentAnswer.trim()}
              placeholder="Type your instruction here…"
              inputRef={inputRef}
            />
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 8, display: "flex", alignItems: "center", gap: 5 }}>
              ⓘ You can type any instruction — change a field, remove something, revert, or paste a new reference email.
            </p>
          </div>
        </div>
      )}

      {/* ===== PHASE 4: EXAMPLE EMAIL REVIEW ===== */}
      {!isEditMode && wizardPhase === 4 && !exampleApproved && (() => {
        const exampleEmailHtml = placeholderValues?.["example_output_email"] || "";
        const hasEmail = exampleEmailHtml.trim().length > 0;
        // Hide the "blueprint complete" boilerplate from the refinement chat —
        // it's informational and not relevant while refining the example email.
        const COMPLETION_MARKER = "The fundamental elements of your campaign blueprint have been saved";
        const phase4Messages = (phase4StartIndexRef.current !== null
          ? messages.slice(phase4StartIndexRef.current)
          : []
        ).filter((m) => !(m.type === "bot" && m.content.includes(COMPLETION_MARKER)));
        return (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 0" }}>
              {/* Bot intro */}
              <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 14, color: "#374151", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <img src={witchLogo} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "contain", background: "#f0fdf4", border: "1.5px solid #86efac", padding: 3, flexShrink: 0 }} />
                <span>Here's the example email I derived from your blueprint. Approve it to open the editor, or refine it below.</span>
              </div>

              {/* Email card */}
              {hasEmail ? (
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", overflow: "hidden", marginBottom: 16 }}>
                  <div style={{ padding: "12px 20px 0", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, background: "#dcfce7", color: "#16a34a", padding: "2px 8px", borderRadius: 20, letterSpacing: "0.04em" }}>EXAMPLE OUTPUT</span>
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>AI-generated from your blueprint</span>
                  </div>
                  <div style={{ position: "relative" }}>
                    <div
                      style={{ padding: "14px 20px 8px", fontSize: 14, lineHeight: 1.7, color: "#111827", maxHeight: showFullExampleEmail ? "none" : 180, overflow: "hidden" }}
                      dangerouslySetInnerHTML={{ __html: exampleEmailHtml }}
                    />
                    {!showFullExampleEmail && (
                      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 48, background: "linear-gradient(transparent, #fff)", pointerEvents: "none" }} />
                    )}
                  </div>
                  {/* Card footer: show more toggle + Rewrite / Approve */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "12px 20px", flexWrap: "wrap" }}>
                    <button
                      onClick={() => setShowFullExampleEmail((v) => !v)}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "1px solid #d1d5db", borderRadius: 8, background: "#fff", fontSize: 13, cursor: "pointer", color: "#374151", fontWeight: 500 }}
                    >
                      {showFullExampleEmail ? "Show less" : "Show full email"}
                      <ChevronDown size={15} style={{ transform: showFullExampleEmail ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                    </button>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button
                        onClick={() => handleSendMessage("Rewrite the example email from scratch.")}
                        disabled={isTyping}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", border: "1px solid #d1d5db", borderRadius: 8, background: "#fff", fontSize: 13, fontWeight: 500, cursor: isTyping ? "not-allowed" : "pointer", color: "#374151", opacity: isTyping ? 0.6 : 1 }}
                      >
                        <Edit3 size={15} /> Rewrite
                      </button>
                      <button
                        onClick={() => setExampleApproved(true)}
                        style={{ ...defaultButtonStyle, display: "flex", alignItems: "center", gap: 6 }}
                      >
                        Approve →
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ border: "1px dashed #d1d5db", borderRadius: 10, padding: "40px 24px", background: "#f9fafb", textAlign: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 24, marginBottom: 10 }}>📭</div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 4 }}>No example email found</p>
                  <p style={{ fontSize: 13, color: "#9ca3af" }}>The AI didn't generate an example output yet. Go back and ask it to include one.</p>
                </div>
              )}

              {/* Refinement messages (only messages sent/received during Phase 4) */}
              {phase4Messages.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  {phase4Messages.map((msg, idx) => (
                    <div key={idx} style={{
                      display: "flex",
                      justifyContent: msg.type === "user" ? "flex-end" : "flex-start",
                      marginBottom: 10,
                    }}>
                      {msg.type === "bot" && (
                        <img src={witchLogo} alt="" style={{ width: 28, height: 28, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "50%", objectFit: "contain", padding: 2, flexShrink: 0, marginRight: 8, marginTop: 2 }} />
                      )}
                      <div style={{
                        maxWidth: "80%",
                        padding: "10px 14px",
                        borderRadius: msg.type === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        background: msg.type === "user" ? "#3f9f42" : "#f9fafb",
                        border: msg.type === "user" ? "none" : "1px solid #e5e7eb",
                        color: msg.type === "user" ? "#fff" : "#111827",
                        fontSize: 14,
                        lineHeight: 1.55,
                      }}>
                        {renderMessageContent(msg.content)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Typing indicator */}
              {isTyping && (
                <div className="typing-indicator" style={{ marginBottom: 12 }}>
                  <div className="typing-dots-row">
                    <div className="typing-avatar"><img src={witchLogo} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} /></div>
                    <div className="typing-dots-bubble">
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                    </div>
                  </div>
                  <span className="typing-label">Refining example email…</span>
                </div>
              )}

              {/* Quick refinement cards */}
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, letterSpacing: "0.05em", marginBottom: 2 }}>QUICK REFINEMENTS</p>
                <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 12 }}>Refine your email quickly with these options.</p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {[
                    { icon: RotateCcw, color: "#ea580c", label: "Revert to last version", msg: "Revert to the last version." },
                    { icon: Target, color: "#2563eb", label: "Make closer to reference email", msg: "Make it closer to my reference email." },
                    { icon: Zap, color: "#ca8a04", label: "Make it shorter", msg: "Make the email shorter." },
                    { icon: TrendingUp, color: "#9333ea", label: "Make it longer", msg: "Make the email longer." },
                    { icon: User, color: "#16a34a", label: "Make personalization more deep", msg: "Make the personalization deeper." },
                    { icon: Megaphone, color: "#db2777", label: "Softer CTA", msg: "Use a softer call to action." },
                    { icon: Target, color: "#e11d48", label: "More direct", msg: "Make it more direct." },
                  ].map((a) => {
                    const Icon = a.icon;
                    return (
                      <button key={a.label}
                        onClick={() => handleSendMessage(a.msg)}
                        disabled={isTyping}
                        onMouseEnter={(e) => { if (!isTyping) { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.background = "#fbfdfc"; } }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.background = "#fff"; }}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", fontSize: 13, cursor: isTyping ? "not-allowed" : "pointer", color: "#374151", fontWeight: 500, opacity: isTyping ? 0.5 : 1, transition: "border-color 0.15s, background 0.15s", maxWidth: 220, textAlign: "left" }}>
                        <Icon size={18} color={a.color} style={{ flexShrink: 0 }} />
                        {a.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Chat input for refinements */}
            <div style={{ borderTop: "1px solid #e5e7eb", padding: "12px 16px", background: "#fff", flexShrink: 0 }}>
              <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                ⓘ You can type any instruction here — e.g. "make it shorter", "softer CTA", "change the personalization".
              </p>
              <div style={{ marginBottom: 10 }}>
                <BlueprintChatInput
                  value={currentAnswer}
                  onChange={setCurrentAnswer}
                  onKeyPress={handleKeyPress}
                  onSend={() => handleSendMessage()}
                  onAttach={handleImageUpload}
                  isTyping={isTyping}
                  canSend={!!currentAnswer.trim()}
                  placeholder="Ask AI to rewrite anything — e.g. 'make it shorter', 'change the CTA', 'remove this paragraph'…"
                  inputRef={inputRef}
                />
              </div>

              {/* Footer: AI chat mode note + exit/back */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "#9ca3af", display: "flex", alignItems: "center", gap: 5 }}>
                  🛡️ You're still in AI chat mode. Ask for any email change before approving.
                </span>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <button
                    onClick={() => setBlueprintApproved(false)}
                    style={{ fontSize: 12, color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}
                  >
                    ← Back to blueprint
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== PHASE 5: BLUEPRINT READY (between example approval and elements) ===== */}
      {!isEditMode && wizardPhase === 4 && exampleApproved && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "16px", background: "#fafafa", overflowY: "auto" }}>
          <div style={{ width: "100%", maxWidth: 1280, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "28px 32px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 22 }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#3f9f42", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <CheckCircle size={40} color="#fff" />
              </div>
              <div>
                <h2 style={{ fontSize: 28, fontWeight: 800, color: "#111827", marginBottom: 8, lineHeight: 1.2 }}>
                  Your <span style={{ color: "#3f9f42" }}>blueprint</span> is ready to use.
                </h2>
                <p style={{ fontSize: 15, color: "#6b7280", lineHeight: 1.6 }}>
                  Theme, hook, and your example email are set.<br />You can start creating campaigns with this right now.
                </p>
              </div>
            </div>

            <div style={{ borderTop: "1px solid #f3f4f6", marginBottom: 20 }} />

            <p style={{ fontSize: 14, color: "#374151", marginBottom: 16 }}>
              Want to make every email even more consistent and on-brand? A few optional elements can help:
            </p>

            {/* Optional element cards */}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
              {[
                { icon: Edit3, color: "#16a34a", bg: "#eafaf0", title: "Signature", desc: "Keep a consistent sign-off across your whole campaign" },
                { icon: ImageIcon, color: "#7c3aed", bg: "#f1ecfe", title: "Banner & Footer Image", desc: "Add constant visuals to every email" },
                { icon: Ban, color: "#dc2626", bg: "#fdecec", title: "Avoid Words", desc: "List words you never want used in outreach" },
                { icon: FileText, color: "#2563eb", bg: "#e8f0fe", title: "Special Instructions", desc: "Add any other rules in your own words" },
                { icon: Plus, color: "#6b7280", bg: "#f3f4f6", title: "More elements available", desc: "Explore additional elements to refine your blueprint" },
              ].map((c) => {
                const Icon = c.icon;
                return (
                  <div key={c.title} onClick={() => onApprove?.()}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.color; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; }}
                    style={{ flex: "1 1 200px", minWidth: 180, padding: 18, border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff", cursor: "pointer", transition: "border-color 0.15s" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                      <Icon size={22} color={c.color} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 6 }}>{c.title}</div>
                    <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>{c.desc}</div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={() => onApprove?.()}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 20px", border: "1px solid #d1d5db", borderRadius: 10, background: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#374151" }}>
                <FileText size={16} /> Fine-tune elements →
              </button>
              <button
                onClick={() => {
                  onExitBuilder?.();
                  const base = window.location.href.split("#")[0];
                  window.location.href = `${base}#/main?tab=Campaigns`;
                }}
                style={{ ...defaultButtonStyle, display: "flex", alignItems: "center", gap: 8 }}>
                <Send size={16} /> Skip &amp; go to Campaigns →
              </button>
              <span style={{ fontSize: 13, color: "#9ca3af", display: "flex", alignItems: "center", gap: 6 }}>
                🛡️ Skipping is fine — you can return to this blueprint anytime to add, edit, preview, or remove elements.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL ===== */}
      <PopupModal open={popupmodalInfo.open} title={popupmodalInfo.title} message={popupmodalInfo.message} onClose={closeModal} />

      </div>{/* end right panel */}
    </div>
  );
};

// ====================================================================
// REUSABLE EXAMPLE OUTPUT PANEL COMPONENT
// ====================================================================
interface ExampleOutputPanelProps {
  // generation state
  isGenerating: boolean; // ✅ FIXED
  regenerateExampleOutput?: () => Promise<void> | void;

  // output fields
  exampleOutput?: string;
  editableExampleOutput: string;
  setEditableExampleOutput: (v: string) => void;
  saveExampleEmail: () => Promise<void>;
  exampleSaveStatus?: "idle" | "saving" | "saved";

  // generation transparency (shown via the editor action bar)
  previewFinalPrompt?: string;
  previewWebSearchData?: string;
  previewEmails?: string;
  previewNotes?: string;
  previewProfessionalSummary?: string;

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
  setPageSize: (v: number | "All") => void;

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

  isPreviewAllowed: boolean;
  onCollapse?: () => void;
}

export const ExampleOutputPanel: React.FC<ExampleOutputPanelProps> = ({
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
  exampleSaveStatus = "idle",
  isGenerating,
  regenerateExampleOutput,
  activeMainTab,
  setActiveMainTab,
  filledTemplate,
  exampleOutput,
  isPreviewAllowed,
  onCollapse,
  previewFinalPrompt,
  previewWebSearchData,
  previewEmails,
  previewNotes,
  previewProfessionalSummary,
}) => {
  const selectedContact = contacts.find((c) => c.id === selectedContactId);
  const [userRole, setUserRole] = useState<string>("");

  // Device-preview + expand state for the editor action bar (same controls the
  // Inbox and Output editors offer).
  const [previewDeviceWidth, setPreviewDeviceWidth] = useState<string>("");
  const [openDeviceDropdown, setOpenDeviceDropdown] = useState(false);
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);

  useEffect(() => {
    setUserRole(sessionStorage.getItem("isAdmin") === "true" ? "ADMIN" : "USER");
  }, []);

  const getInitials = (contact: any) => {
    const parts = (contact?.full_name || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0]?.[0]?.toUpperCase() ?? "?";
  };

  const handlePreview = async () => {
    if (!selectedContact) return;
    await applyContactPlaceholders(selectedContact);
    if (regenerateExampleOutput) await regenerateExampleOutput();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fff" }}>

      {/* ── HEADER ── */}
      <div style={{ padding: "10px 14px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>Live preview</span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {onCollapse && (
            <button onClick={onCollapse} title="Collapse preview"
              style={{ padding: "4px 7px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", color: "#9ca3af", fontSize: 14, lineHeight: 1, display: "flex", alignItems: "center" }}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── CONTACT LIST SELECTOR ── */}
      <div style={{ padding: "8px 14px", borderBottom: "1px solid #f3f4f6", flexShrink: 0, background: "#fafafa" }}>
        <div style={{ position: "relative" }}>
          <select
            value={selectedDataFileId || ""}
            onChange={(e) => handleSelectDataFile(Number(e.target.value))}
            style={{
              width: "100%", height: 30, fontSize: 12, padding: "0 26px 0 10px",
              borderRadius: 6, border: "1px solid #d1d5db", background: "#fff",
              appearance: "none", color: selectedDataFileId ? "#111827" : "#9ca3af", cursor: "pointer",
            }}
          >
            <option value="">— Select contact list —</option>
            {[...dataFiles]
              .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
              .map((df) => <option key={df.id} value={df.id}>{df.name}</option>)}
          </select>
          <span style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#9ca3af", fontSize: 9 }}>▼</span>
        </div>
      </div>

      {/* ── CONTACT CARD + COMPACT PAGINATION ── */}
      {contacts.length > 0 && (
        <div style={{ padding: "8px 14px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {selectedContact ? (
            <>
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "linear-gradient(135deg, #3f9f42 0%, #16a34a 100%)",
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, flexShrink: 0, boxShadow: "0 1px 4px rgba(63,159,66,0.25)",
              }}>
                {getInitials(selectedContact)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {selectedContact.full_name || "—"}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {[selectedContact.job_title, selectedContact.company_name].filter(Boolean).join(" · ")}
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, fontSize: 12, color: "#9ca3af" }}>No contact selected</div>
          )}
          <PaginationControls
            variant="compact"
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={rowsPerPage}
            totalRecords={contacts.length}
            setCurrentPage={setCurrentPage}
            setPageSize={setPageSize}
            showPageSizeDropdown={false}
            showInfo={false}
          />
          {/* Generate sits beside the contact navigation: it acts on whichever
              contact those arrows land on. */}
          <button
            onClick={handlePreview}
            disabled={isGenerating || !selectedContactId || !isPreviewAllowed}
            title="Generate the preview for this contact"
            style={{
              padding: "4px 10px", borderRadius: 6, border: "1px solid #d1d5db",
              background: "#fff", fontSize: 12, cursor: (!selectedContactId || !isPreviewAllowed) ? "not-allowed" : "pointer",
              color: "#374151", display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
              opacity: (!selectedContactId || !isPreviewAllowed) ? 0.45 : 1,
            }}
          >
            {isGenerating
              ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
              : <RefreshCw size={11} />}
            Generate
          </button>
        </div>
      )}

      {/* ── TABS ── */}
      <div style={{ padding: "0 14px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex" }}>
          {(["output", ...(userRole === "ADMIN" ? ["pt"] : [])] as Array<"output" | "pt">).map((t) => (
            <button key={t} onClick={() => setActiveMainTab(t)}
              style={{
                padding: "9px 14px", fontSize: 12, fontWeight: 600, background: "none", border: "none",
                borderBottom: activeMainTab === t ? "2px solid #3f9f42" : "2px solid transparent",
                color: activeMainTab === t ? "#3f9f42" : "#9ca3af", cursor: "pointer",
                letterSpacing: "0.04em", transition: "color 0.15s, border-color 0.15s",
              }}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
        {activeMainTab === "output" && editableExampleOutput && (
          <button onClick={saveExampleEmail}
            disabled={exampleSaveStatus === "saving"}
            style={{
              fontSize: 12, padding: "3px 12px",
              background: exampleSaveStatus === "saved" ? "#16a34a" : "#3f9f42",
              color: "#fff", border: "none", borderRadius: 6,
              cursor: exampleSaveStatus === "saving" ? "not-allowed" : "pointer",
              fontWeight: 600, display: "flex", alignItems: "center", gap: 5,
              minWidth: 92, justifyContent: "center",
            }}>
            {exampleSaveStatus === "saving" ? (
              <>
                <Loader2 size={12} style={{ animation: "campaign-builder-spin 1s linear infinite" }} />
                Saving…
              </>
            ) : exampleSaveStatus === "saved" ? (
              <>
                <CheckCircle size={12} />
                Saved
              </>
            ) : (
              "Save email"
            )}
          </button>
        )}
      </div>

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {activeMainTab === "output" && (
          editableExampleOutput || exampleOutput ? (
            <div
              style={{
                maxWidth:
                  previewDeviceWidth === "Mobile"
                    ? "480px"
                    : previewDeviceWidth === "Tab"
                      ? "768px"
                      : "100%",
                margin: "0 auto",
              }}
            >
              <ExampleEmailEditor
                value={editableExampleOutput || exampleOutput || ""}
                onChange={setEditableExampleOutput}
                showActionButtons
                finalPrompt={previewFinalPrompt}
                webSearchData={previewWebSearchData}
                insightEmails={previewEmails}
                insightNotes={previewNotes}
                insightProfessionalSummary={previewProfessionalSummary}
                onRegenerate={handlePreview}
                isRegenerating={isGenerating}
                regenerateDisabled={!selectedContactId || !isPreviewAllowed}
                showDeviceButton
                outputEmailWidth={previewDeviceWidth}
                openDeviceDropdown={openDeviceDropdown}
                onDeviceDropdownToggle={() => setOpenDeviceDropdown((open) => !open)}
                onDeviceWidthChange={(width) => {
                  setPreviewDeviceWidth(width);
                  setOpenDeviceDropdown(false);
                }}
                onExpandEditor={() => setIsEditorExpanded(true)}
              />
            </div>
          ) : (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>No preview yet</div>
              <div style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.6, maxWidth: 200, margin: "0 auto" }}>
                Select a contact list and a contact, then click <strong>Generate</strong> to generate a preview.
              </div>
              {!isPreviewAllowed && (
                <div style={{ marginTop: 14, fontSize: 11, color: "#d97706", background: "#fef3c7", borderRadius: 6, padding: "6px 12px", display: "inline-block" }}>
                  Complete the blueprint first
                </div>
              )}
            </div>
          )
        )}
        {activeMainTab === "pt" && (
          filledTemplate
            ? <pre style={{ padding: 16, fontSize: 12, whiteSpace: "pre-wrap", fontFamily: "monospace", color: "#374151", margin: 0 }}>{filledTemplate}</pre>
            : <p style={{ padding: 20, color: "#9ca3af", fontSize: 13 }}>Filled template will appear here</p>
        )}
      </div>

      {/* Expanded editor — the preview panel is narrow, so the expand action
          opens the same editor over the full window. */}
      {isEditorExpanded && (
        <div
          onClick={() => setIsEditorExpanded(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 10, padding: 20,
              width: "90%", maxWidth: 1100, maxHeight: "90vh", overflow: "auto",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>Example email</span>
              <button
                type="button"
                onClick={() => setIsEditorExpanded(false)}
                title="Close"
                style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 6, cursor: "pointer", color: "#6b7280", fontSize: 15, lineHeight: 1, padding: "4px 9px" }}
              >
                ✕
              </button>
            </div>
            <ExampleEmailEditor
              value={editableExampleOutput || exampleOutput || ""}
              onChange={setEditableExampleOutput}
              height={520}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const RichTextInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
}> = ({ value, onChange }) => {
  const editorRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!editorRef.current) return;

    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      className="border border-gray-300 p-3 rounded w-full bg-gray-50"
      style={{ minHeight: "90px" }}
      onInput={(e) =>
        onChange((e.target as HTMLDivElement).innerHTML)
      }
    />
  );
};


// ====================================================================
// BLUEPRINT SWITCHER
// ====================================================================
// Compact picklist shown next to "Back to blueprints" that lets the user jump
// straight from one blueprint to another without going back to the list.
const BlueprintSwitcher: React.FC<{
  options: BlueprintSwitcherOption[];
  activeBlueprintId: number | null;
  isSwitching?: boolean;
  onChange: (blueprintId: number) => void;
}> = ({ options, activeBlueprintId, isSwitching = false, onChange }) => {
  const [isFocused, setIsFocused] = useState(false);

  const hasActive =
    activeBlueprintId !== null &&
    options.some((option) => option.id === activeBlueprintId);

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <select
        value={hasActive ? String(activeBlueprintId) : ""}
        disabled={isSwitching}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChange={(e) => {
          const nextId = Number(e.target.value);
          if (!Number.isFinite(nextId) || nextId <= 0) return;
          if (nextId === activeBlueprintId) return;
          onChange(nextId);
        }}
        title="Switch blueprint"
        aria-label="Switch blueprint"
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          minWidth: 220,
          maxWidth: 340,
          padding: "10px 34px 10px 14px",
          borderRadius: 8,
          border: `1.5px solid ${isFocused ? "#3f9f42" : "#d1d5db"}`,
          background: isSwitching ? "#f3f4f6" : "#ffffff",
          color: hasActive ? "#111827" : "#6b7280",
          fontSize: 13,
          fontWeight: 500,
          lineHeight: "16px",
          cursor: isSwitching ? "wait" : "pointer",
          outline: "none",
          boxShadow: isFocused ? "0 0 0 3px rgba(63, 159, 66, 0.15)" : "none",
          textOverflow: "ellipsis",
        }}
      >
        {!hasActive && (
          <option value="" disabled>
            Select a blueprint
          </option>
        )}
        {options.map((option) => (
          <option key={option.id} value={String(option.id)}>
            {option.templateName || `Blueprint #${option.id}`}
          </option>
        ))}
      </select>
      <ChevronDown
        size={15}
        style={{
          position: "absolute",
          right: 11,
          pointerEvents: "none",
          color: "#6b7280",
        }}
      />
    </div>
  );
};

// ====================================================================
// MAIN COMPONENT
// ====================================================================
const MasterPromptCampaignBuilder: React.FC<EmailCampaignBuilderProps> = ({
  selectedClient,
  onBeforeAiChatOpen,
  onExitBuilder,
  blueprintOptions,
  activeBlueprintId = null,
  onBlueprintChange,
  isSwitchingBlueprint = false,
}) => {
  // --- State Management ---
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copied, setCopied] = useState(false);
  const [soundEnabled, setSoundEnabled] = useSessionState<boolean>(
    "campaign_sound_enabled",
    true,
  );
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [editTemplateId, setEditTemplateId] = useState<number | null>(null);
  const [originalTemplateData, setOriginalTemplateData] = useState<any>(null);
  const [selectedPlaceholder, setSelectedPlaceholder] = useState<string>("");
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isPreparingAutoStart, setIsPreparingAutoStart] = useState<boolean>(
    () => sessionStorage.getItem("autoStartConversation") === "true",
  );
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [selectedTemplateDefinitionId, setSelectedTemplateDefinitionId] =
    useState<number | null>(null);

  const [messages, setMessages] = useSessionState<Message[]>(
    "campaign_messages",
    [],
  );
  const hasAttemptedChatRestoreRef = useRef(false);
  const [usageInfo, setUsageInfo] = useState<any>(null);

  const [finalPrompt, setFinalPrompt] = useSessionState<string>(
    "campaign_final_prompt",
    "",
  );
  const [finalPreviewText, setFinalPreviewText] = useSessionState<string>(
    "campaign_final_preview",
    "",
  );
  const [exampleOutput, setExampleOutput] = useState<string>("");
  const [previewFinalPrompt, setPreviewFinalPrompt] = useState<string>("");
  const [previewWebSearchData, setPreviewWebSearchData] = useState<string>("");
  const [previewEmails, setPreviewEmails] = useState<string>("");
  const [previewNotes, setPreviewNotes] = useState<string>("");
  const [previewProfessionalSummary, setPreviewProfessionalSummary] = useState<string>("");
  const [filledTemplate, setFilledTemplate] = useState<string>("");

  const [placeholderValues, setPlaceholderValues] = useSessionState<
    Record<string, string>
  >("campaign_placeholder_values", {});
  const [isComplete, setIsComplete] = useSessionState<boolean>(
    "campaign_is_complete",
    false,
  );
  const [conversationStarted, setConversationStarted] =
    useSessionState<boolean>("campaign_started", false);
  const [systemPrompt, setSystemPrompt] = useSessionState<string>(
    "campaign_system_prompt",
    "",
  );
  const [systemPromptForEdit, setSystemPromptForEdit] = useSessionState<string>(
    "campaign_system_prompt_edit",
    "",
  );
  const [masterPrompt, setMasterPrompt] = useSessionState<string>(
    "campaign_master_prompt",
    "",
  );
  const [previewText, setPreviewText] = useSessionState<string>(
    "campaign_preview_text",
    "",
  );
  const [selectedModel, setSelectedModel] = useSessionState<string>(
    "campaign_selected_model",
    "gpt-5.1",
  );
  // Self-heal: if a DeepSeek model was persisted in this session before DeepSeek
  // was excluded from the builder, reset it to the OpenAI default on mount.
  useEffect(() => {
    if (isDeepSeekModel(selectedModel)) {
      setSelectedModel(DEFAULT_BUILDER_MODEL);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [masterPromptExtensive, setMasterPromptExtensive] =
    useSessionState<string>("campaign_master_prompt_extensive", "");

  const baseUserId = sessionStorage.getItem("clientId");
  const effectiveUserId = selectedClient || baseUserId;

  const [templateDefinitions, setTemplateDefinitions] = useState<
    TemplateDefinition[]
  >([]);
  const [isSavingDefinition, setIsSavingDefinition] = useState(false);
  const [saveDefinitionStatus, setSaveDefinitionStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [templateName, setTemplateName] = useSessionState<string>(
    "campaign_template_name",
    "",
  );
  const [isLoadingDefinitions, setIsLoadingDefinitions] = useState(false);

  // ---- Datafiles & contacts ---
  const [dataFiles, setDataFiles] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedDataFileId, setSelectedDataFileId] = useState<number | null>(
    null,
  );
  const [selectedContactId, setSelectedContactId] = useState<number | null>(
    null,
  );

  const [campaignBlueprint, setCampaignBlueprint] = useState<string>("");
  // NEW
  const [searchURLCount, setSearchURLCount] = useState<number>(1);
  const [subjectInstructions, setSubjectInstructions] = useState<string>("");
  const [webSearchInstructions, setWebSearchInstructions] = useState<string>("");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [openedFromTemplateEdit, setOpenedFromTemplateEdit] = useState(false);
  // true once the user has completed the full wizard or an existing blueprint is loaded
  const [wizardCompleted, setWizardCompleted] = useState(false);

  // A real example email unlocks the preview mid-wizard; once the blueprint is
  // built, the preview stays available even for blueprints that never carry an
  // example email.
  const isPreviewAllowed = React.useMemo(() => {
    if (wizardCompleted) return true;
    const emailHtml = placeholderValues?.example_output_email;
    return getPlainTextLength(emailHtml) >= MIN_EXAMPLE_EMAIL_LENGTH;
  }, [placeholderValues?.example_output_email, wizardCompleted]);

  // isEditMode is driven by explicit completion, NOT by example_output_email content.
  // This prevents the wizard from jumping to edit mode mid-conversation when the AI
  // generates example_output_email in the same message as status:complete.
  const isEditMode = wizardCompleted;


  // ========================================
  // IMAGE UPLOAD STATE
  // ========================================

  const showModal = (title: string, message: string) => {
    setPopupModalInfo({ open: true, title, message });
  };
  const toastAnimation = `
@keyframes toastProgress {
  from { width: 100%; }
  to { width: 0%; }
}
`;
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const uploadImage = async (file: File) => {
    if (!effectiveUserId) return;

    if (!file.type.startsWith("image/")) {
       setToastMessage("Only image files are allowed.");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 5000);
     // showModal("Invalid file", "Only image files are allowed.");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);     // ✅ FIXED
    formData.append("userId", effectiveUserId);

    try {
      setIsUploadingImage(true);

      const res = await axios.post(
        `${API_BASE_URL}/api/CampaignPrompt/images/upload-image`,
        formData
      );

      if (res.data?.imageUrl) {         // ✅ FIXED
        setAttachedImages(prev => [...prev, res.data.imageUrl]);
      }

    } catch (err) {
      console.error("Image upload failed:", err);
     // showModal("Error", "Image upload failed.");
      setToastMessage("Image upload failed.");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 5000);
    } finally {
      setIsUploadingImage(false);
    }
  };




  // ========================================
  // UI-ONLY PLACEHOLDER METADATA STATE
  // ========================================
  const [uiPlaceholders, setUiPlaceholders] = useState<
    PlaceholderDefinitionUI[]
  >([]);

  const [editableExampleOutput, setEditableExampleOutput] = useState("");
  const [isSavingElements, setIsSavingElements] = useState(false);
  // Tracks the example-email save so its button can show Saving… / Saved
  // inline instead of relying solely on the toast.
  const [exampleSaveStatus, setExampleSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [activeMainTab, setActiveMainTab] = useState<MainTab>("build");
  const [activeBuildTab, setActiveBuildTab] = useState<BuildSubTab>("chat");

  const [popupmodalInfo, setPopupModalInfo] = useState({
    open: false,
    title: "",
    message: "",
  });

  const [totalUsage, setTotalUsage] = useState({
    totalInput: 0,
    totalOutput: 0,
    totalCalls: 0,
    totalCost: 0,
  });

  const normalizePlaceholderKey = (key: string) => {
    return key.trim().toLowerCase();
  };

  const normalizeCategory = (category: string) =>
    category.trim().toLowerCase();




  const closeModal = () => {
    setPopupModalInfo((prev) => ({ ...prev, open: false }));
  };

  const saveExampleEmail = async () => {
    try {
      const storedId = sessionStorage.getItem("newCampaignId");
      const activeCampaignId =
        editTemplateId ?? (storedId ? Number(storedId) : null);

      if (!activeCampaignId) {
       // showModal("Error", "No campaign instance found.");
        setToastMessage("No campaign instance found.");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 5000);
        return;
      }

      if (!editableExampleOutput.trim()) {
       // showModal("Warning", "Example email is empty.");
        setToastMessage("Example email is empty.");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 5000);
        return;
      }

      setExampleSaveStatus("saving");

      await axios.post(
        `${API_BASE_URL}/api/CampaignPrompt/template/update-placeholders`,
        {
          templateId: activeCampaignId,
          placeholderValues: {
            example_output_email: editableExampleOutput, // ✅ CORRECT KEY
          },
        },
      );

      // ✅ THIS is what flips edit mode
      setPlaceholderValues((prev) => ({
        ...prev,
        example_output_email: editableExampleOutput,
      }));

      // showModal("Success", "✅ Example email saved successfully!");
      setExampleSaveStatus("saved");
      setTimeout(() => setExampleSaveStatus("idle"), 2500);
      setToastMessage("Example email has been saved");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 5000);
    } catch (error) {
      console.error("❌ Save example output failed:", error);
      setExampleSaveStatus("idle");
      //showModal("Error", "Failed to save example email.");
      setToastMessage("Failed to save example email.");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 5000);
    }
  };

  interface ExampleEmailEditorProps {
    value: string;
    onChange: (value: string) => void;
  }

  const ExampleEmailEditor = ({
    value,
    onChange,
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

    return <RichTextEditor value={value} height={320} onChange={onChange} />;
  };

  useEffect(() => {
    if (activeMainTab === "build" && exampleOutput && !editableExampleOutput) {
      setEditableExampleOutput(exampleOutput);
    }
  }, [activeMainTab, exampleOutput]);

  // Load selectedTemplateDefinitionId from sessionStorage on mount
  useEffect(() => {
    const storedDefId = sessionStorage.getItem("selectedTemplateDefinitionId");
    if (storedDefId && !selectedTemplateDefinitionId) {
      setSelectedTemplateDefinitionId(Number(storedDefId));
    }
  }, []);

  useEffect(() => {
    if (!selectedTemplateDefinitionId) {
      setUiPlaceholders([]);
      return;
    }

    let isCancelled = false;
    setUiPlaceholders([]);

    axios
      .get(
        `${API_BASE_URL}/api/CampaignPrompt/placeholders/by-template/${selectedTemplateDefinitionId}`,
      )
      .then((res) => {
        if (isCancelled) return;

        const nextPlaceholders = Array.isArray(res.data) ? res.data : [];

          setUiPlaceholders(
            nextPlaceholders.map((p: any, index: number) => ({
              ...p,
              category: normalizeCategory(p.category),
              categorySequence: p.categorySequence ?? 999,
              placeholderSequence: p.placeholderSequence ?? index + 1,
            })),
          );

          console.log("✅ Loaded element definitions from backend");
      })
      .catch((err) =>
        console.error("❌ Failed to load element definitions", err),
      );
  }, [selectedTemplateDefinitionId]);

  useEffect(() => {
    setEditableExampleOutput(exampleOutput || "");
  }, [exampleOutput]);

  useEffect(() => {
    if (!uiPlaceholders.length) return;

    const withMissingDefaults = (values: Record<string, string>) => {
      let changed = false;
      const next = { ...values };

      uiPlaceholders.forEach((p) => {
        const hasValue = Object.prototype.hasOwnProperty.call(
          next,
          p.placeholderKey,
        );
        const defaultValue = p.defaultValue;

        if (!hasValue && defaultValue != null && defaultValue !== "") {
          next[p.placeholderKey] = defaultValue;
          changed = true;
        }
      });

      return changed ? next : values;
    };

    setFormValues((prev) => withMissingDefaults(prev));
    setPlaceholderValues((prev) => withMissingDefaults(prev));
  }, [uiPlaceholders, setPlaceholderValues]);

  // ✅ CRITICAL: Sync formValues whenever placeholderValues changes
  useEffect(() => {
    if (Object.keys(placeholderValues).length > 0) {
      setFormValues(prev => {
        const merged = { ...prev, ...placeholderValues };
        console.log("✅ formValues synced:", Object.keys(merged));
        return merged;
      });
    }
  }, [placeholderValues]);

  // Restore/persist activeMainTab in sessionStorage
  useEffect(() => {
    const main = sessionStorage.getItem("campaign_activeMainTab") as MainTab | null;
    if (main) setActiveMainTab(main);
    const build = sessionStorage.getItem("campaign_activeBuildTab") as BuildSubTab | null;
    if (build) setActiveBuildTab(build);
  }, []);

  useEffect(() => {
    sessionStorage.setItem("campaign_activeMainTab", activeMainTab);
  }, [activeMainTab]);

  useEffect(() => {
    sessionStorage.setItem("campaign_activeBuildTab", activeBuildTab);
  }, [activeBuildTab]);

  // ====================================================================
  // LOAD DATA FILES
  // ====================================================================
  useEffect(() => {
    if (!effectiveUserId) return;
    axios
      .get(
        `${API_BASE_URL}/api/Crm/datafile-byclientid?clientId=${effectiveUserId}`,
      )
      .then((res) => setDataFiles(res.data || []))
      .catch((err) => console.error("Failed to load datafiles", err));
  }, [effectiveUserId]);

  // ====================================================================
  // AUTO-START CONVERSATION (Robust version)
  // ====================================================================
  useEffect(() => {
    let attempts = 0;

    const tryAutoStart = async () => {
      const autoStart = sessionStorage.getItem("autoStartConversation");
      const newCampaignId = sessionStorage.getItem("newCampaignId");
      const selectedDefinition = sessionStorage.getItem(
        "selectedTemplateDefinitionId",
      );
      const campaignName = sessionStorage.getItem("newCampaignName");

      if (autoStart && newCampaignId && selectedDefinition) {
        console.log(`🚀 Auto-starting campaign "${campaignName}"...`);
        const definitionId = parseInt(selectedDefinition);
        setIsPreparingAutoStart(true);
        resetTransientCampaignState({ clearUiPlaceholders: true });

        // Set states (async)
        setSelectedTemplateDefinitionId(definitionId);
        setTemplateName(campaignName || "");

        // Load template — do not set isTyping here; Phase 1 shows after load
        await loadTemplateDefinitionById(definitionId);
        setIsPreparingAutoStart(false);

        // ⛔ DO NOT remove autoStartConversation here
        // Let watcher handle it

        return;
      }

      if (attempts < 10) {
        attempts++;
        setTimeout(tryAutoStart, 300);
      } else {
        setIsPreparingAutoStart(false);
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
      // Template is ready — navigate to Build > Chat so Phase 1 (choose method) shows.
      // Do NOT call startConversation() here; the user must pick a method first.
      sessionStorage.removeItem("autoStartConversation");
      sessionStorage.removeItem("openConversationTab");

      setActiveMainTab("build");
      setActiveBuildTab("chat");
    }
  }, [systemPrompt, masterPrompt, selectedTemplateDefinitionId]);



  const stripToText = (html: string) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    return (div.textContent || "").replace(/\s+/g, " ").trim();
  };

  const cleanRichHtml = (html: string) => {
    return DOMPurify.sanitize(html, {
      // 🚫 DO NOT use USE_PROFILES here

      ALLOWED_TAGS: [
        "b",
        "strong",
        "i",
        "em",
        "u",
        "br",
        "p",
        "ul",
        "ol",
        "li",
        "a",
      ],

      ALLOWED_ATTR: ["href"],

      FORBID_TAGS: ["span", "div"],

      FORBID_ATTR: ["style", "class"],

      KEEP_CONTENT: true,
    });
  };



  const sanitizePlaceholders = (
    values: Record<string, string>,
    uiPlaceholders: PlaceholderDefinitionUI[],
  ) => {
    const cleaned: Record<string, string> = {};

    Object.entries(values).forEach(([key, raw]) => {
      // 🚫 keep example output untouched
      if (key === "example_output_email") {
        cleaned[key] = raw;
        return;
      }

      const meta = uiPlaceholders.find(p => p.placeholderKey === key);

      const isRich =
        meta?.isRichText === true ||
        meta?.inputType === "richtext" ||
        /signature|body|testimony|html/i.test(key);

      cleaned[key] = isRich
        ? cleanRichHtml(raw)
        : stripToText(raw);
    });

    return cleaned;
  };

  const applyPlaceholderDefaults = (
    values: Record<string, string>,
    definitions: PlaceholderDefinitionUI[],
  ) => {
    const withDefaults = { ...values };

    definitions.forEach((placeholder) => {
      const currentValue = withDefaults[placeholder.placeholderKey];
      const defaultValue = placeholder.defaultValue;
      // Only backfill a default when the field was never set (missing/null).
      // An explicit empty string means the user intentionally cleared the
      // field, so we must NOT restore the default — otherwise clearing a
      // placeholder (e.g. AVOID WORDS) can never be saved as empty.
      const shouldUseDefault =
        (currentValue === null || currentValue === undefined) &&
        defaultValue != null &&
        defaultValue !== "";

      if (shouldUseDefault) {
        withDefaults[placeholder.placeholderKey] = defaultValue;
      }
    });

    return withDefaults;
  };




  const saveAllPlaceholders = async () => {
    try {
      setIsSavingElements(true);
      const storedId = sessionStorage.getItem("newCampaignId");
      const activeTemplateId =
        editTemplateId ?? (storedId ? Number(storedId) : null);

      if (!activeTemplateId) {
       // showModal("Error", "No campaign template found.");
       setToastMessage("No campaign template found.");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 5000);
        return;
      }

      // ✅ ONE source of truth
      const mergedValues = {
        ...placeholderValues,
        ...formValues,
      };
      const valuesWithDefaults = applyPlaceholderDefaults(
        mergedValues,
        uiPlaceholders,
      );
      const cleanedValues = sanitizePlaceholders(
        valuesWithDefaults,
        uiPlaceholders,
      );

      console.log("FINAL PAYLOAD", cleanedValues);

      await axios.post(
        `${API_BASE_URL}/api/CampaignPrompt/template/update-placeholders`,
        {
          templateId: activeTemplateId,
          placeholderValues: cleanedValues,
        },
      );

      setPlaceholderValues((prev) => ({
        ...prev,
        ...cleanedValues,
      }));

      await reloadCampaignBlueprint();

      //   showModal("Success", "✅ Element values updated successfully!");

      setToastMessage("Element values updated successfully!");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 5000);
    } catch (error) {
      console.error("❌ Failed to update elements:", error);
     // showModal("Warning", "Failed to update element values.");
     setToastMessage("Failed to update element values.");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 5000);
    } finally {
      setIsSavingElements(false);
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
      axios
        .get(
          `${API_BASE_URL}/api/Crm/contacts/by-client-datafile?clientId=${effectiveUserId}&dataFileId=${id}`,
        )
        .then((res) => {
          //setContacts(res.data.contacts || []);
          const loadedContacts = res.data.contacts || [];
          setContacts(loadedContacts);
          if (loadedContacts.length > 0) {
            const firstContact = loadedContacts[0];
            setSelectedContactId(firstContact.id);
            applyContactPlaceholders(firstContact); // auto-fill placeholders
          }
        })
        .catch((err) => console.error("Failed to load contacts", err));
    }
  };

  const applyContactPlaceholders = async (contact: any) => {
    if (!contact) return;

    try {
      console.log("📇 Applying contact elements:", contact.full_name);

      // Derive friendly / abbrev variants
      const friendly =
        contact.company_name
          ?.replace(/\b(ltd|llc|limited|plc)\b/gi, "")
          .trim() || contact.company_name;
      const abbrev = friendly
        ? friendly.toLowerCase().replace(/\s+/g, "-")
        : "";
      let first = contact.first_name || "";
      let last = contact.last_name || "";
      let fullName = contact.full_name || "";

      if (!fullName && (first || last)) {
        fullName = `${String(first).trim()} ${String(last).trim()}`.trim();
      }

      if (!first && !last && fullName) {
        const parts = fullName.split(" ").filter(Boolean);
        first = parts[0] || "";
        last = parts.slice(1).join(" ").trim();
      }

      // ✅ Build contact placeholders exactly matching template placeholders
      const contactValues: Record<string, string> = {
        full_name: fullName || "",
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
      const mergedForDisplay = getMergedPlaceholdersForDisplay(
        conversationValues,
        contactValues,
      );

      setPlaceholderValues(mergedForDisplay);

      console.log("✅ Contact elements applied");
      console.log("🌐 Website value:", mergedForDisplay.website || "(none)");
      console.log(
        "🔗 LinkedIn value:",
        mergedForDisplay.linkedin_url || "(none)",
      );
      console.log('ℹ️ Click "Regenerate" to generate email with this contact');
    } catch (error) {
      console.error("⚠️ Error applying contact elements:", error);
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
  const [allSourcedData, setAllSourcedData] = useState<string>("");
  const [sourcedSummary, setSourcedSummary] = useState<string>("");

  function resetTransientCampaignState(options?: { clearUiPlaceholders?: boolean }) {
    setMessages([]);
    setCurrentAnswer("");
    setFinalPrompt("");
    setFinalPreviewText("");
    setPlaceholderValues({});
    setFormValues({});
    setIsComplete(false);
    setConversationStarted(false);
    setExampleOutput("");
    setFilledTemplate("");
    setEditableExampleOutput("");
    setAttachedImages([]);
    setSelectedPlaceholder("");
    setSelectedElement(null);
    setSearchResults([]);
    setAllSourcedData("");
    setSourcedSummary("");
    setWizardCompleted(false);

    if (options?.clearUiPlaceholders) {
      setUiPlaceholders([]);
    }
  }
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
    "website",
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
    // if (isGenerating) return;
    const canGeneratePreview = await onBeforeAiChatOpen?.();
    if (canGeneratePreview === false) {
      return;
    }

    try {
      setIsPreviewLoading(true);
      console.log("🚀 Manual regenerate button clicked");

      if (!editTemplateId && !selectedTemplateDefinitionId) {
        // showModal(
        //   "Warning",
        //   "Please save the template first before regenerating example output.",
        // );
         setToastMessage("Please save the template first before regenerating example output.");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 5000);
        return;
      }

      // --------------------------------------------------
      // 1️⃣ Collect placeholders
      // --------------------------------------------------
      const conversationValues = getConversationPlaceholders(placeholderValues);
      const contactValues = getContactPlaceholders(placeholderValues);

      console.log("📦 Conversation elements:", Object.keys(conversationValues));
      console.log("📇 Contact elements:", Object.keys(contactValues));

      // --------------------------------------------------
      // 2️⃣ + 3️⃣ GENERATE PREVIEW via the real generation endpoint
      //    Uses the SAME path as actual sending (notes, web search,
      //    email history, subject) but preview:true → no DB write,
      //    no credit deduction, no kraft history.
      // --------------------------------------------------
      const storedId = sessionStorage.getItem("newCampaignId");
      const activeCampaignId =
        editTemplateId ?? (storedId ? Number(storedId) : null);

      if (!activeCampaignId) {
        setToastMessage("No campaign instance found.");
        setShowErrorToast(true);
        setTimeout(() => setShowErrorToast(false), 5000);
        return;
      }

      if (!selectedContactId) {
        setToastMessage("Select a contact to preview.");
        setShowErrorToast(true);
        setTimeout(() => setShowErrorToast(false), 5000);
        return;
      }

      // Persist the current campaign placeholder edits so the backend reads
      // fresh values (runtime-only placeholders are filtered out server-side).
      const mergedAll = getMergedPlaceholdersForDisplay(
        conversationValues,
        contactValues,
      );
      await axios.post(
        `${API_BASE_URL}/api/CampaignPrompt/template/update-placeholders`,
        {
          templateId: activeCampaignId,
          placeholderValues: mergedAll,
        },
      );

      console.log("📧 Generating preview via generate-single-contact...");
      setIsPreviewLoading(true);

      const response = await axios.post(
        `${PITCH_GENERATION_API_BASE_URL}/api/email-generation/generate`,
        {
          blueprintId: activeCampaignId,
          contactId: selectedContactId,
          clientId: String(effectiveUserId),
          overwriteExisting: true,
          preview: true, // ⬅️ no save, no credit, no history
        },
      );

      if (response.data?.usage) {
        const u = response.data.usage;
        const inTokens = u.totalTokens ?? u.TotalTokens ?? 0;
        const cost = u.totalCost ?? u.TotalCost ?? 0;

        setUsageInfo({
          promptTokens: inTokens,
          completionTokens: 0,
          cost,
        });

        setTotalUsage((prev) => ({
          totalInput: prev.totalInput + inTokens,
          totalOutput: prev.totalOutput,
          totalCalls: prev.totalCalls + 1,
          totalCost: prev.totalCost + cost,
        }));
      }

      if (response.data?.success || response.data?.Success) {
        const body =
          response.data.emailBody || response.data.EmailBody || "";
        const subject =
          response.data.emailSubject || response.data.EmailSubject || "";

        setExampleOutput(body);
        const previewInsights = extractGenerationInsights(response.data);
        setPreviewFinalPrompt(previewInsights.finalPrompt);
        setPreviewWebSearchData(previewInsights.webSearchData);
        setPreviewEmails(previewInsights.emails);
        setPreviewNotes(previewInsights.notes);
        setPreviewProfessionalSummary(previewInsights.professionalSummary);
        window.dispatchEvent(
          new CustomEvent("creditUpdated", {
            detail: { clientId: String(effectiveUserId) },
          }),
        );
        // subject is available in `subject` if the preview UI wants to show it
        console.log("✅ Preview generated. Subject:", subject);
        playNotificationSound();
      } else {
        setToastMessage("Preview generation returned no output.");
        setShowErrorToast(true);
        setTimeout(() => setShowErrorToast(false), 5000);
      }
    } catch (error: any) {
      console.error("❌ regenerateExampleOutput failed:", error);
     //showModal("Error", `Failed to regenerate: ${error.message}`);
     setToastMessage(`Failed to regenerate: ${error.message}`);
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 5000);
    } finally {
      // 🔥 THIS IS THE IMPORTANT PART
      setIsPreviewLoading(false);
    }
  };
  const toggleNotifications = () => {
    setSoundEnabled((prev) => !prev);
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
      const response = await axios.get(
        `${API_BASE_URL}/api/CampaignPrompt/template-definitions?activeOnly=true`,
      );
      const definitions = response.data.templateDefinitions || [];
      setTemplateDefinitions(definitions.sort((a: TemplateDefinition, b: TemplateDefinition) => 
        a.templateName.localeCompare(b.templateName)
      ));
    } catch (error) {
      console.error("Error loading template definitions:", error);
    } finally {
      setIsLoadingDefinitions(false);
    }
  };

  // ====================================================================
  // SAVE TEMPLATE DEFINITION
  // ====================================================================
  const saveTemplateDefinition = async () => {
    if (!templateName.trim()) {
     // showModal("reason", "Please enter a template name");
      setToastMessage("Please enter a template name");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 5000);
      return;
    }

    if (!systemPrompt.trim() || !masterPrompt.trim()) {
      // showModal(
      //   "missing parameters",
      //   "Please fill in AI Instructions and elements List",
      // );
      setToastMessage("Please fill in AI Instructions and elements List");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 5000);
      return;
    }

    setIsSavingDefinition(true);
    setSaveDefinitionStatus("idle");

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/CampaignPrompt/template-definition/save`,
        {
          templateName,
          aiInstructions: systemPrompt,
          aiInstructionsForEdit: systemPromptForEdit,
          placeholderList: masterPrompt,
          placeholderListExtensive: masterPromptExtensive,
          masterBlueprintUnpopulated: previewText,
          createdBy: effectiveUserId,
          searchURLCount,
          subjectInstructions,
          webSearchInstructions,
          selectedModel,
        },
      );

      if (response.data.success) {
        const newId = response.data.templateDefinitionId;

        setSaveDefinitionStatus("success");
        setSelectedTemplateDefinitionId(newId);

        // ⭐ SAVE PLACEHOLDERS AFTER CREATING TEMPLATE DEF
        await savePlaceholderDefinitionsInner(newId);

        await loadTemplateDefinitions();

        setTimeout(() => setSaveDefinitionStatus("idle"), 3000);
      }
    } catch (error: any) {
      console.error("Error saving template definition:", error);
      if (error.response?.data?.message?.includes("already exists")) {
        // showModal(
        //   "Instruction",
        //   "A template with this name already exists. Please use a different name.",
        // );
         setToastMessage("A template with this name already exists. Please use a different name.");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 5000);
      } else {
        setSaveDefinitionStatus("error");
        setTimeout(() => setSaveDefinitionStatus("idle"), 3000);
      }
    } finally {
      setIsSavingDefinition(false);
    }
  };

  const savePlaceholderDefinitionsInner = async (definitionId: number) => {
    const sortedPlaceholders = [...uiPlaceholders].sort((a, b) => {
      if (a.categorySequence !== b.categorySequence)
        return a.categorySequence - b.categorySequence;
      return a.placeholderSequence - b.placeholderSequence;
    });

    await axios.post(`${API_BASE_URL}/api/CampaignPrompt/placeholders/save`, {
      templateDefinitionId: definitionId,
      placeholders: sortedPlaceholders,
    });

    console.log("✅ element definitions saved");
  };

  const savePlaceholderDefinitions = async () => {
    if (!selectedTemplateDefinitionId) return;

    const sortedPlaceholders = [...uiPlaceholders].sort((a, b) => {
      if (a.categorySequence !== b.categorySequence)
        return a.categorySequence - b.categorySequence;
      return a.placeholderSequence - b.placeholderSequence;
    });

    await axios.post(`${API_BASE_URL}/api/CampaignPrompt/placeholders/save`, {
      templateDefinitionId: selectedTemplateDefinitionId,
      placeholders: sortedPlaceholders,
    });

   // alert("✅ element definitions saved");
    setToastMessage("element definitions saved");
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 5000);
  };
  // ====================================================================
  // UPDATE TEMPLATE DEFINITION
  // ====================================================================

  const updateTemplateDefinition = async () => {
    if (!selectedTemplateDefinitionId) {
    //  showModal("Instruction", "No template selected to update.");
      setToastMessage("No template selected to update.");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 5000);
      return;
    }

    setIsSavingDefinition(true);

    try {
      await axios.post(
        `${API_BASE_URL}/api/CampaignPrompt/template-definition/update`,
        {
          id: selectedTemplateDefinitionId,
          templateName: templateName,
          aiInstructions: systemPrompt,
          aiInstructionsForEdit: systemPromptForEdit,
          placeholderList: masterPrompt,
          placeholderListExtensive: masterPromptExtensive,
          masterBlueprintUnpopulated: previewText,
          searchURLCount,
          subjectInstructions,
          webSearchInstructions,
          selectedModel: selectedModel,
        },
      );

      //alert("Template updated successfully.");
      setToastMessage("Template updated successfully.");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 5000);
      await loadTemplateDefinitions();
    } catch (err) {
      console.error("Update failed:", err);
     // showModal("error", "Failed to update template definition.");
      setToastMessage("Failed to update template definition.");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 5000);
    } finally {
      setIsSavingDefinition(false);
    }
  };

  // ====================================================================
  // LOAD TEMPLATE DEFINITION BY ID
  // ====================================================================
  const loadTemplateDefinitionById = async (id: number) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/CampaignPrompt/template-definition/${id}`,
      );
      const def = response.data;

      setTemplateName(def.templateName || "");
      setSystemPrompt(def.aiInstructions || "");
      setSystemPromptForEdit(def.aiInstructionsForEdit || "");
      setMasterPrompt(def.placeholderList || "");
      setMasterPromptExtensive(def.placeholderListExtensive || "");
      setPreviewText(def.masterBlueprintUnpopulated || "");
      setSearchURLCount(def.searchURLCount || 1);
      setSubjectInstructions(def.subjectInstructions || "");
      setWebSearchInstructions(def.webSearchInstructions || "");
      setSelectedModel(toBuilderModel(def.selectedModel));

      // ✅ REQUIRED!!!
      setSelectedTemplateDefinitionId(def.id);
    } catch (error) {
      console.error("⚠️ Failed to load template definition:", error);
      setIsPreparingAutoStart(false);
    }
  };

  // ====================================================================
  // LOAD TEMPLATE FOR EDIT MODE
  // ====================================================================
  useEffect(() => {
    const templateId = sessionStorage.getItem("editTemplateId");
    const editMode = sessionStorage.getItem("editTemplateMode");

    if (templateId && editMode === "true") {
      clearAllSessionData();

      setEditTemplateId(Number(templateId));
      setOpenedFromTemplateEdit(true); // ✅ ONLY HERE
      setActiveMainTab("build");
      setActiveBuildTab("chat");

      loadTemplateForEdit(Number(templateId));

      sessionStorage.removeItem("editTemplateId");
      sessionStorage.removeItem("editTemplateMode");
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
    sessionStorage.removeItem("campaign_web_search_instructions");
  };

  const applyStoredChatMessages = (storedMessages?: StoredChatMessage[]) => {
    const restoredMessages = mapStoredChatMessages(storedMessages);

    if (restoredMessages.length === 0) {
      return false;
    }

    const rawMessages = Array.isArray(storedMessages) ? storedMessages : [];
    const restoredComplete = rawMessages.some((message) => {
      const content = message.content || "";
      return (
        content.includes("==PLACEHOLDER_VALUES_START==") &&
        content.includes("==PLACEHOLDER_VALUES_END==") &&
        content.includes('"complete"')
      );
    });

    setMessages(restoredMessages);
    setConversationStarted(true);
    setIsComplete(restoredComplete);
    setActiveMainTab("build");
    setActiveBuildTab("chat");

    return true;
  };

  const getStoredCampaignId = () => {
    const storedId =
      sessionStorage.getItem("newCampaignId") ||
      sessionStorage.getItem("editTemplateId");
    const parsedId = Number(storedId);

    return Number.isFinite(parsedId) && parsedId > 0 ? parsedId : null;
  };

  const restoreChatFromBackend = async () => {
    if (!effectiveUserId || messages.length > 0) return;

    const campaignId = getStoredCampaignId();
    if (!campaignId) return;

    const isStartingNewCampaign =
      sessionStorage.getItem("autoStartConversation") === "true";
    const isOpeningForElementEdit =
      sessionStorage.getItem("editTemplateMode") === "true";

    if (isStartingNewCampaign || isOpeningForElementEdit) return;

    try {
      const historyResponse = await axios.get(
        `${API_BASE_URL}/api/CampaignPrompt/history/${effectiveUserId}`,
        {
          params: {
            campaignTemplateId: campaignId,
          },
        },
      );
      const historyData = historyResponse.data?.response ?? historyResponse.data;

      applyStoredChatMessages(readStoredChatMessages(historyData));
    } catch (error) {
      console.warn("Failed to restore campaign chat from backend:", error);
    }
  };

  useEffect(() => {
    if (!effectiveUserId || messages.length > 0) return;
    if (hasAttemptedChatRestoreRef.current) return;

    hasAttemptedChatRestoreRef.current = true;
    restoreChatFromBackend();
    // Restore should run once per builder mount when local chat is empty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveUserId, messages.length]);

  const loadTemplateForEdit = async (templateId: number) => {
    setIsLoadingTemplate(true);
    try {
      resetTransientCampaignState({ clearUiPlaceholders: true });

      const res = await axios.get(
        `${API_BASE_URL}/api/CampaignPrompt/campaign/${templateId}`,
      );
      const template = res.data;

      setOriginalTemplateData(template);
      setCampaignBlueprint(template.campaignBlueprint || "");

      setSystemPrompt(template.aiInstructions || "");
      setSystemPromptForEdit(template.aiInstructionsForEdit || "");
      setMasterPrompt(template.placeholderList || "");
      setMasterPromptExtensive(template.placeholderListExtensive || "");
      setPreviewText(template.masterBlueprintUnpopulated || "");
      setSelectedModel(toBuilderModel(template.selectedModel));
      setSelectedTemplateDefinitionId(template.templateDefinitionId || null);
      setTemplateName(template.templateName || "");
      setSubjectInstructions(template.subjectInstructions || "");
      setWebSearchInstructions(template.webSearchInstructions || "");
      setIsComplete(false);

      // --------------------------------------------
      // LOAD PREVIOUS CONVERSATION MESSAGES
      // --------------------------------------------
      let loadedMessages: Message[] = [];

      const storedConversationMessages = readStoredChatMessages(template);

      if (storedConversationMessages) {
        console.log(
          "📨 Loading past conversation messages:",
          storedConversationMessages.length,
        );

        loadedMessages = mapStoredChatMessages(storedConversationMessages);

        setMessages(loadedMessages);
      } else {
        console.log("ℹ️ No stored messages found for this campaign.");
        setMessages([]);
      }

      // ✅ Load ONLY conversation placeholders from DB
      if (template.placeholderValues) {
        const conversationOnly = getConversationPlaceholders(
          template.placeholderValues,
        );
        console.log("📦 Loading placeholder values:", conversationOnly);
        console.log("📦 Values:", JSON.stringify(conversationOnly, null, 2));

        // ✅ Set placeholderValues (formValues will sync via useEffect)
        setPlaceholderValues(conversationOnly);
      } else {
        setPlaceholderValues({});
        setFormValues({});
      }

      if (template.exampleOutput) {
        setExampleOutput(template.exampleOutput);
      }

      const loadedExampleEmail = template.placeholderValues?.example_output_email;
      const hasExistingEmail =
        typeof loadedExampleEmail === "string" &&
        getPlainTextLength(loadedExampleEmail) >= MIN_EXAMPLE_EMAIL_LENGTH;

      // An example email is only ONE sign that a saved blueprint is already
      // built. Blueprints whose type never produces one (or that predate the
      // example step) are just as finished, so gating edit mode on the email
      // alone stranded them in the wizard with no way to reach the elements
      // editor. Saved elements or a conversation that reached the completion
      // marker count just as well.
      const savedElementValues = getConversationPlaceholders(
        template.placeholderValues || {},
      );
      const hasSavedElements = Object.entries(savedElementValues).some(
        ([key, value]) =>
          key !== "example_output_email" &&
          typeof value === "string" &&
          value.trim().length > 0,
      );
      const conversationReachedCompletion = (
        storedConversationMessages || []
      ).some((message) => {
        const content = message?.content || "";
        return (
          content.includes("==PLACEHOLDER_VALUES_START==") &&
          content.includes("==PLACEHOLDER_VALUES_END==") &&
          content.includes('"complete"')
        );
      });
      // A conversation that was started but never completed still owes the user
      // the wizard — dropping them into the elements editor would abandon a
      // half-built blueprint mid-question.
      const hasUnfinishedConversation =
        loadedMessages.length > 0 && !conversationReachedCompletion;

      const isBuiltBlueprint =
        hasExistingEmail ||
        conversationReachedCompletion ||
        (hasSavedElements && !hasUnfinishedConversation);

      setWizardCompleted(isBuiltBlueprint);
      setActiveMainTab("build");
      setActiveBuildTab(isBuiltBlueprint ? "elements" : "chat");
      setConversationStarted(loadedMessages.length > 0);
      setIsTyping(false);
      // setIsEditMode(true);
    } catch (error) {
      console.error("Error loading template:", error);
      //alert("Failed to load template for editing");
      setToastMessage("Failed to load template for editing");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 5000);
      //setIsEditMode(false);
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
      console.warn("startEditConversation: missing effectiveUserId or element");
      return;
    }

    const canUseAiChat = await onBeforeAiChatOpen?.();
    if (canUseAiChat === false) {
      return;
    }

    // Prefer in-memory editTemplateId, fall back to session keys (newCampaignId or editTemplateId)
    const storedNewCampaignId = sessionStorage.getItem("newCampaignId");
    const storedEditTemplateId = sessionStorage.getItem("editTemplateId");

    const campaignTemplateIdCandidate =
      editTemplateId ??
      (storedNewCampaignId ? Number(storedNewCampaignId) : null) ??
      (storedEditTemplateId ? Number(storedEditTemplateId) : null);

    const campaignTemplateId = Number(campaignTemplateIdCandidate);

    // Validate campaignTemplateId
    if (
      !campaignTemplateId ||
      Number.isNaN(campaignTemplateId) ||
      campaignTemplateId <= 0
    ) {
      // showModal(
      //   "Invalid",
      //   "No campaign ID found. Please open the campaign in edit mode first (wait until it finishes loading).",
      // );
      setToastMessage("No campaign ID found. Please open the campaign in edit mode first (wait until it finishes loading");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 5000);
      console.error(
        "startEditConversation: campaignTemplateId is missing/invalid:",
        {
          editTemplateId,
          storedNewCampaignId,
          storedEditTemplateId,
          campaignTemplateIdCandidate,
        },
      );
      return;
    }

    // Good to set UI state after validation (prevents sending requests when id missing)
    setSelectedPlaceholder(placeholder);
    setMessages([]);
    setConversationStarted(true);
    setIsComplete(false);
    // Only drive the in-panel "thinking…" indicator (isTyping). Do NOT trigger the
    // full-screen LoadingSpinner overlay here — the side-panel chat shows its own.
    setIsTyping(true);

    const currentValue = placeholderValues[placeholder] || "not set";

    try {
      const payload = {
        userId: String(effectiveUserId), // ✅ STRING
        campaignTemplateId: campaignTemplateId, // numeric
        placeholder,
        currentValue,
        model: selectedModel,
      };

      // DEBUG: inspect outgoing payload in console/network tab
      console.log("startEditConversation -> payload:", payload);

      // If your backend expects { req: { ... } } wrap the payload:
      // const bodyToSend = { req: payload }; // <-- uncomment if API requires req wrapper
      const bodyToSend = payload;

      const response = await axios.post(
        `${API_BASE_URL}/api/CampaignPrompt/edit/start`,
        bodyToSend,
      );

      // Dispatch credit update event after successful API call
      window.dispatchEvent(
        new CustomEvent("creditUpdated", {
          detail: { clientId: effectiveUserId },
        }),
      );

      const data = response.data?.response ?? response.data;
      if (response.data?.usage) {
        const u = response.data.usage;

        const inTokens =
          u.promptTokens ?? u.prompt_tokens ?? u.inputTokens ?? 0;
        const outTokens =
          u.completionTokens ?? u.completion_tokens ?? u.outputTokens ?? 0;
        const cost = u.cost ?? u.totalCost ?? 0;

        setUsageInfo({
          promptTokens: inTokens,
          completionTokens: outTokens,
          cost,
        });

        setTotalUsage((prev) => ({
          totalInput: prev.totalInput + inTokens,
          totalOutput: prev.totalOutput + outTokens,
          totalCalls: prev.totalCalls + 1,
          totalCost: prev.totalCost + cost,
        }));
      }

      if (data && data.assistantText) {
        setMessages([
          { type: "bot", content: data.assistantText, timestamp: new Date() },
        ]);
        playNotificationSound();
      } else {
        // If API returns a different shape, log it for debugging and show friendly message
        console.warn(
          "startEditConversation: unexpected response:",
          response.data,
        );
        setMessages([
          {
            type: "bot",
            content: "Received unexpected response from server.",
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err: any) {
      console.error(
        "Error starting edit conversation:",
        err,
        err?.response?.data,
      );
      setMessages([
        {
          type: "bot",
          content:
            "Sorry, I couldn't start the edit conversation. Please try again.",
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

  const finalizeEditPlaceholder = async (
    updatedPlaceholder: string,
    newValue: string,
  ) => {
    if (!editTemplateId || !effectiveUserId) return;

    // Get current conversation placeholders
    const conversationValues = getConversationPlaceholders(placeholderValues);
    const contactValues = getContactPlaceholders(placeholderValues);

    // Update the specific placeholder
    // conversationValues[updatedPlaceholder] = newValue;
    const essentialKeys = extractPlaceholders(masterPrompt);

    if (!essentialKeys.includes(updatedPlaceholder)) {
      console.warn("Blocked non-essential placeholder:", updatedPlaceholder);
      return;
    }

    conversationValues[updatedPlaceholder] = newValue;

    // Merge for display
    const mergedForDisplay = getMergedPlaceholdersForDisplay(
      conversationValues,
      contactValues,
    );
    setPlaceholderValues(mergedForDisplay);

    try {
      // ✅ Save ONLY conversation placeholders to DB
      await axios.post(`${API_BASE_URL}/api/CampaignPrompt/template/update`, {
        id: editTemplateId,
        placeholderValues: conversationValues, // ✅ Only conversation placeholders
        selectedModel,
      });
      reloadCampaignBlueprint();
      console.log("✅ Conversation element saved in DB:", updatedPlaceholder);
      console.log("ℹ️ Click 'Regenerate' to see the updated email");

      // ❌ REMOVED: Auto-regeneration
      // User must click "Regenerate" button manually
    } catch (err) {
      console.error("⚠️ Error during element finalization:", err);
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
      audioRef.current.play().catch((error) => {
        console.log("Audio play failed:", error);
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
        icon: "/favicon.ico",
        tag: "campaign-notification",
        requireInteraction: false,
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

    document.addEventListener("click", requestPermission, { once: true });

    return () => {
      document.removeEventListener("click", requestPermission);
    };
  }, []);

  // ====================================================================
  // AVAILABLE MODELS
  // ====================================================================
  // The blueprint-generation model is no longer picked here — an admin sets it
  // once in Settings > AI models and the API resolves it server-side.

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

  // ===============================
  // HTML → TEXT LENGTH HELPER
  // ===============================
  function getPlainTextLength(html?: string): number {
    if (!html) return 0;
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.innerText.trim().length;
  }

  // ====================================================================
  // REPLACE PLACEHOLDERS IN STRING
  // ====================================================================
  const replacePlaceholdersInString = (
    text: string,
    values: Record<string, string>,
  ): string => {
    if (!text) return "";

    let result = text;

    Object.entries(values).forEach(([key, value]) => {
      if (!value) {
        return;
      }

      const patterns = [
        new RegExp(`\\{${key}\\}`, "g"),
        new RegExp(`\\{ ${key} \\}`, "g"),
        new RegExp(`\\{${key} \\}`, "g"),
        new RegExp(`\\{ ${key}\\}`, "g"),
      ];

      patterns.forEach((regex) => {
        result = result.replace(regex, value);
      });
    });

    return result;
  };

  // ====================================================================
  // SCROLL TO BOTTOM
  // ====================================================================

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

  // ========================================
  // BUILD UI PLACEHOLDERS ONLY IF EMPTY
  // (Do NOT override backend-loaded placeholders)
  // ========================================
  useEffect(() => {
    // ⛔ If backend already loaded placeholders → DO NOT rebuild
    if (uiPlaceholders.length > 0) {
      return;
    }

    const keys = extractPlaceholders(masterPrompt).map(normalizePlaceholderKey);

    const uniqueKeys = Array.from(new Set(keys));

    setUiPlaceholders(
      uniqueKeys.map((key, index) => ({
        placeholderKey: key,
        friendlyName: key.replace(/_/g, " "),
        category: "general",
        categorySequence: 99,
        placeholderSequence: index + 1,
        inputType: "text",
        options: [],
        uiSize: "md",
        isRichText: false,
        isExpandable: false,
        isRuntimeOnly: RUNTIME_ONLY_PLACEHOLDERS.includes(key),
      }))
    );

  }, [masterPrompt]);

  // 🔒 ESSENTIAL placeholders ONLY (from masterPrompt)
  const essentialPlaceholderKeys = React.useMemo(
    () => extractPlaceholders(masterPrompt),
    [masterPrompt],
  );

  // Group by category first, then order placeholders WITHIN each category by
  // placeholderSequence only. This mirrors the placeholder manager
  // (InstructionSetManager) exactly. A global (categorySequence,
  // placeholderSequence) sort followed by reduce would scramble the order
  // whenever a category holds placeholders with mixed categorySequence values
  // — which happens after a placeholder's category is changed via the dropdown
  // (that updates `category` but not `categorySequence`).
  const groupedPlaceholders = (() => {
    const visible = uiPlaceholders.filter(
      (p) =>
        !p.isRuntimeOnly &&
        (essentialPlaceholderKeys.length === 0 ||
          essentialPlaceholderKeys.includes(p.placeholderKey))
    );

    // Category display order: keyed to each category's categorySequence
    // (last one wins, matching the manager's categoryList).
    const categorySeq = new Map<string, number>();
    visible.forEach((p) => categorySeq.set(p.category, p.categorySequence ?? 999));
    const orderedCategories = Array.from(categorySeq.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([name]) => name);

    const grouped: Record<string, PlaceholderDefinitionUI[]> = {};
    orderedCategories.forEach((category) => {
      grouped[category] = visible
        .filter((p) => p.category === category)
        .sort((a, b) => a.placeholderSequence - b.placeholderSequence);
    });
    return grouped;
  })();

  const visibleMessages: Message[] = isPreparingAutoStart ? [] : messages;
  const visiblePlaceholderValues: Record<string, string> = isPreparingAutoStart
    ? {}
    : placeholderValues;
  const visibleGroupedPlaceholders: Record<string, PlaceholderDefinitionUI[]> =
    isPreparingAutoStart ? {} : groupedPlaceholders;
  const visibleFormValues: Record<string, string> = isPreparingAutoStart
    ? {}
    : formValues;

  const [initialExampleEmail, setInitialExampleEmail] = useState<string>("");
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);
  const hasExampleEmail = initialExampleEmail.trim().length > 0;
  useEffect(() => {
    const storedExample = sessionStorage.getItem("initialExampleEmail");
    const campaignId = sessionStorage.getItem("newCampaignId") || sessionStorage.getItem("editTemplateId");
    setCurrentCampaignId(campaignId);
    if (storedExample && storedExample.trim().length > 0) {
      setInitialExampleEmail(storedExample);
    } else {
      setInitialExampleEmail("");
    }
  }, []);
  // ✅ NEW: Watch for blueprint changes and update example email every 500ms
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const newCampaignId = sessionStorage.getItem("newCampaignId") || sessionStorage.getItem("editTemplateId");

      // If campaign ID changed, update the example email
      if (newCampaignId && newCampaignId !== currentCampaignId) {
        setCurrentCampaignId(newCampaignId);

        const storedExample = sessionStorage.getItem("initialExampleEmail");
        if (storedExample && storedExample.trim().length > 0) {
          setInitialExampleEmail(storedExample);
        } else {
          setInitialExampleEmail("null");
        }
      }
    }, 500);

    return () => clearInterval(checkInterval);
  }, [currentCampaignId]);
const renderPlaceholderInput = (p: PlaceholderDefinitionUI) => {
  const key = p.placeholderKey;
  const hasExplicitValue = Object.prototype.hasOwnProperty.call(formValues, key);
  const value = hasExplicitValue
    ? formValues[key] ?? ""
    : p.defaultValue ?? "";

    const baseStyle: React.CSSProperties = {
      width: "100%",
      padding: "8px 10px",
      borderRadius: "6px",
      border: "1px solid #d1d5db",
      fontSize: "14px",
      background: "#fff",
    };

    switch (p.inputType) {
      case "richtext":
        return (
          <div className="flex w-full rich-text-editor">
            <RichTextInput
              value={value}
              onChange={(val) =>
                setFormValues(prev => ({
                  ...prev,
                  [key]: val,
                }))
              }
            />
          </div>
        );
      case "textarea":
        return (
          <div className="flex">
            <textarea
              className="resize-y"
              value={value}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  [key]: e.target.value,
                }))
              }
              style={{ ...baseStyle, minHeight: "90px" }}
            />
          </div>
        );

      case "select":
        return (
          <div className="flex">
            <select
              value={value}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  [key]: e.target.value,
                }))
              }
              style={baseStyle}
            >
              <option value="">-- Select --</option>
              {p.options?.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        );

      default:
        return (
          <div className="flex">
            <input
              type="text"
              value={value}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  [key]: e.target.value,
                }))
              }
              style={baseStyle}
            />
          </div>
        );
    }
  };

  // ====================================================================
  // START CONVERSATION
  // ====================================================================
  const startConversation = async (initialUserMessage?: string) => {
    if (!effectiveUserId) {
      console.warn("⚠️ No client ID available — cannot start conversation.");
      return;
    }

    const canUseAiChat = await onBeforeAiChatOpen?.();
    if (canUseAiChat === false) {
      return;
    }

    if (systemPrompt.trim() === "" || masterPrompt.trim() === "") {
      console.log("⏳ Template not ready yet — skipping manual alert.");
      return;
    }

    resetTransientCampaignState();
    setConversationStarted(true);
    setActiveMainTab("build");
    setActiveBuildTab("chat");
    setIsTyping(true);
    setExampleOutput("");
    setAttachedImages([]); // 🔥 clear images after start


    setMessages(
      initialUserMessage
        ? [{ type: "user", content: initialUserMessage, timestamp: new Date() }]
        : [{ type: "bot", content: INITIAL_BLUEPRINT_WELCOME_MESSAGE, timestamp: new Date() }]
    );

    const cleanAssistantMessage = (text: string): string => {
      if (!text) return "";
      return text
        .replace(
          /==PLACEHOLDER_VALUES_START==[\s\S]*?==PLACEHOLDER_VALUES_END==/g,
          "",
        )
        .replace(/{\s*"status"[\s\S]*?}/g, "")
        .trim();
    };

    try {
      const campaignTemplateId = getStoredCampaignId();

      const response = await axios.post(`${API_BASE_URL}/api/CampaignPrompt/chat`, {
    userId: effectiveUserId,
    campaignTemplateId,
    message: initialUserMessage ?? masterPrompt,
    images: attachedImages,
    systemPrompt,
    model: selectedModel,
      });
      // Dispatch credit update event after successful API call
      window.dispatchEvent(
        new CustomEvent("creditUpdated", {
          detail: { clientId: effectiveUserId },
        }),
      );

      const data = response.data.response;
      if (data?.usage || response.data?.usage) {
        const u = data?.usage ?? response.data.usage;

        const inTokens =
          u.promptTokens ?? u.prompt_tokens ?? u.inputTokens ?? 0;
        const outTokens =
          u.completionTokens ?? u.completion_tokens ?? u.outputTokens ?? 0;
        const cost = u.cost ?? u.totalCost ?? 0;

        setUsageInfo({
          promptTokens: inTokens,
          completionTokens: outTokens,
          cost,
        });

        setTotalUsage((prev) => ({
          totalInput: prev.totalInput + inTokens,
          totalOutput: prev.totalOutput + outTokens,
          totalCalls: prev.totalCalls + 1,
          totalCost: prev.totalCost + cost,
        }));
      }

      if (data) {
        // if it's already marked complete, only push completion message
        if (data.isComplete) {
          const completionMessage: Message = {
            type: "bot",
            content:
              "Great. That's all done.\n\n" +
              "The fundamental elements of your campaign blueprint have been saved. You can now change any of these elements in the 'Edit elements' pick list above using the same interactive chat or use the 'Elements' tab where you can directly change them and change any of the many additional elements that you can use in your campaign blueprint.\n\n" +
              "You can also choose one of the contacts in the 'Preview email' area on the right and see how the actual emails will look as you continue to play with and change the elements of the blueprint. If you don't have any contacts saved then just hop over to the Contacts area and add some manually or import them from a spreadsheet.",

            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, completionMessage]);
          setIsComplete(true);
          playNotificationSound();
        } else if (data.assistantText) {
          const cleanText = cleanAssistantMessage(data.assistantText);
          setMessages((prev) => [
            ...prev,
            { type: "bot", content: cleanText, timestamp: new Date() },
          ]);
          playNotificationSound();
        }
      }
    } catch (error) {
      console.error("❌ Error starting conversation:", error);
      const errorMessage: Message = {
        type: "bot",
        content:
          "Great. That's all done.\n\n" +
          "The fundamental elements of your campaign blueprint have been saved. You can now change any of these elements in the 'Edit elements' pick list above using the same interactive chat or use the 'Elements' tab where you can directly change them and change any of the many additional elements that you can use in your campaign blueprint.\n\n" +
          "You can also choose one of the contacts in the 'Preview email' area on the right and see how the actual emails will look as you continue to play with and change the elements of the blueprint. If you don't have any contacts saved then just hop over to the Contacts area and add some manually or import them from a spreadsheet.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      playNotificationSound();
    } finally {
      setIsTyping(false);
      setIsPreparingAutoStart(false);
    }
  };

const parsePlaceholdersSafe = (block: string) => {
  const dict: Record<string, string> = {};

  const lines = block.split("\n");

  let currentKey: string | null = null;
  let currentValue: string[] = [];

  lines.forEach((rawLine) => {
    const line = rawLine.replace(/\r$/, ""); // ✅ preserve spaces

    const match = line.match(/^\{([^}]+)\}\s*=\s*(.*)/);

    if (match) {
      if (currentKey) {
        dict[currentKey] = currentValue.join("\n").trim();
      }

      currentKey = match[1].trim();
      currentValue = match[2] ? [match[2]] : []; // ✅ safe init
    } else {
      if (currentKey && line !== "") {
        currentValue.push(line);
      }
    }
  });

  if (currentKey) {
    dict[currentKey] = currentValue.join("\n").trim();
  }

  return dict;
};

  const handleSendMessage = async (overrideText?: string) => {
    const answerText = (overrideText ?? currentAnswer).trim();
    if (
      isTyping ||
      !effectiveUserId ||
      (answerText === "" && attachedImages.length === 0)
    ) {
      return;
    }

    const canUseAiChat = await onBeforeAiChatOpen?.();
    if (canUseAiChat === false) {
      return;
    }

    const imagesToSend = [...attachedImages];


    const userMessage: Message = {
      type: "user",
      content: answerText,
      timestamp: new Date(),
    };

    // Prefer in-memory editTemplateId, fall back to session keys (newCampaignId or editTemplateId)
    const storedNewCampaignId = sessionStorage.getItem("newCampaignId");
    const storedEditTemplateId = sessionStorage.getItem("editTemplateId");

    const campaignTemplateIdCandidate =
      editTemplateId ??
      (storedNewCampaignId ? Number(storedNewCampaignId) : null) ??
      (storedEditTemplateId ? Number(storedEditTemplateId) : null);

    const campaignTemplateId = Number(campaignTemplateIdCandidate);
    // add user message to UI immediately
    setMessages((prev) => [...prev, userMessage]);

    // clear input AFTER capturing content
    setCurrentAnswer("");
    setAttachedImages([]); // 🔥 ADD THIS

    setIsTyping(true);


    try {
      const endpoint = isEditMode
        ? `${API_BASE_URL}/api/CampaignPrompt/edit/chat`
        : `${API_BASE_URL}/api/CampaignPrompt/chat`;

      const requestBody = isEditMode
        ? {
          userId: effectiveUserId,
          campaignTemplateId,
          message: answerText,
          model: selectedModel,
          images: imagesToSend,
        }
        : {
          userId: effectiveUserId,
          campaignTemplateId,
          message: answerText,
          systemPrompt: "",
          model: selectedModel,
          images: imagesToSend,
        };

      const response = await axios.post(endpoint, requestBody);

      // Dispatch credit update event after successful API call
      window.dispatchEvent(
        new CustomEvent("creditUpdated", {
          detail: { clientId: effectiveUserId },
        }),
      );

      const data = response.data.response;
      if (data?.usage || response.data?.usage) {
        const u = data?.usage ?? response.data.usage;

        const inTokens =
          u.promptTokens ?? u.prompt_tokens ?? u.inputTokens ?? 0;
        const outTokens =
          u.completionTokens ?? u.completion_tokens ?? u.outputTokens ?? 0;
        const cost = u.cost ?? u.totalCost ?? 0;

        setUsageInfo({
          promptTokens: inTokens,
          completionTokens: outTokens,
          cost,
        });

        setTotalUsage((prev) => ({
          totalInput: prev.totalInput + inTokens,
          totalOutput: prev.totalOutput + outTokens,
          totalCalls: prev.totalCalls + 1,
          totalCost: prev.totalCost + cost,
        }));
      }

      const cleanAssistantMessage = (text: string): string => {
        if (!text) return "";
        return text
          .replace(
            /==PLACEHOLDER_VALUES_START==[\s\S]*?==PLACEHOLDER_VALUES_END==/g,
            "",
          )
          .replace(/{\s*"status"[\s\S]*?}/g, "")
          .trim();
      };

      // If the response contains assistantText, parse placeholders first
      let cleanText = "";
      if (data?.assistantText) {
        cleanText = cleanAssistantMessage(data.assistantText);

        // extract placeholder block if present
        const match = data.assistantText.match(
          /==PLACEHOLDER_VALUES_START==([\s\S]*?)==PLACEHOLDER_VALUES_END==/,
        );

        if (match) {
          const placeholderBlock = match[1] || "";
          const parsedPlaceholders = parsePlaceholdersSafe(placeholderBlock);
          // split current placeholders into conversation/contact
          const currentConversationValues =
            getConversationPlaceholders(placeholderValues);
          const currentContactValues =
            getContactPlaceholders(placeholderValues);
          const updatedConversationValues = { ...currentConversationValues };

          // Object.entries(parsedPlaceholders).forEach(([key, value]) => {
          //   if (!CONTACT_PLACEHOLDERS.includes(key)) {
          //     updatedConversationValues[key] = value;
          //   }
          // });

          const essentialKeys = extractPlaceholders(masterPrompt);

          Object.entries(parsedPlaceholders).forEach(([key, value]) => {
            if (
              essentialKeys.includes(key) &&
              !CONTACT_PLACEHOLDERS.includes(key)
            ) {
              updatedConversationValues[key] = value;
            }
          });

          // merge for display once (removed duplicate call)
          const mergedForDisplay = getMergedPlaceholdersForDisplay(
            updatedConversationValues,
            currentContactValues,
          );
          setPlaceholderValues(mergedForDisplay);
          console.log(
            "📦 Updated conversation elements:",
            Object.keys(updatedConversationValues),
          );

          // Save conversation placeholders to DB (if campaign exists)
          const storedId = sessionStorage.getItem("newCampaignId");
          const activeCampaignId =
            editTemplateId ?? (storedId ? Number(storedId) : null);

          if (activeCampaignId) {
            try {
              await axios.post(
                `${API_BASE_URL}/api/CampaignPrompt/template/update`,
                {
                  id: activeCampaignId,
                  placeholderValues: updatedConversationValues, // only conversation placeholders
                },
              );
              reloadCampaignBlueprint();
              console.log(
                "💾 Saved conversation elements to DB (no auto-generation)",
              );
            } catch (err) {
              console.warn("⚠️ Failed to save elements:", err);
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
          type: "bot",
          content:
            "Great. That's all done.\n\n" +
            "The fundamental elements of your campaign blueprint have been saved. You can now change any of these elements in the 'Edit elements' pick list above using the same interactive chat or use the 'Elements' tab where you can directly change them and change any of the many additional elements that you can use in your campaign blueprint.\n\n" +
            "You can also choose one of the contacts in the 'Preview email' area on the right and see how the actual emails will look as you continue to play with and change the elements of the blueprint. If you don't have any contacts saved then just hop over to the Contacts area and add some manually or import them from a spreadsheet.",
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
            console.warn("⚠️ finalizeEditelement failed:", err);
          }
        }

        setIsTyping(false);
        return; // stop here (no further bot message)
      }

      // Normal (non-complete) flow: append clean assistant message if present
      if (cleanText) {
        const botMessage: Message = {
          type: "bot",
          content: cleanText,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMessage]);
        await reloadCampaignBlueprint();
        playNotificationSound();
      }
    } catch (error) {
      console.error("❌ Error sending message:", error);
      const errorMessage: Message = {
        type: "bot",
        content: "Sorry, there was an error. Please try again.",
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
  const updateTemplateInDatabase = async (
    updatedPlaceholderValues: Record<string, string>,
  ) => {
    if (!editTemplateId || !originalTemplateData) return;

    try {
      // ✅ Only use conversation placeholders for database update
      const conversationOnly = getConversationPlaceholders(
        updatedPlaceholderValues,
      );

      const response = await axios.post(
        `${API_BASE_URL}/api/CampaignPrompt/template/update`,
        {
          id: editTemplateId,
          placeholderValues: conversationOnly, // ✅ Only conversation placeholders
          selectedModel: selectedModel,
        },
      );

      if (!response.data.success) {
        throw new Error("Failed to update template");
      }
    } catch (error) {
      console.error("Error updating template:", error);
      throw error;
    }
  };

  // ====================================================================
  // HANDLE KEY PRESS
  // ====================================================================
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
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
    if (effectiveUserId) {
      axios
        .post(
          `${API_BASE_URL}/api/CampaignPrompt/history/${effectiveUserId}/clear`,
        )
        .catch((err) => console.error("Failed to clear history:", err));
    }

    clearAllSessionData();

    //setIsEditMode(false);
    setOpenedFromTemplateEdit(false); // ✅ IMPORTANT

    setEditTemplateId(null);
    setOriginalTemplateData(null);
    setSelectedPlaceholder("");
    setSelectedTemplateDefinitionId(null);
    setTemplateName("");

    resetTransientCampaignState({ clearUiPlaceholders: true });
    setConversationStarted(false);
    setSystemPrompt("");
    setSystemPromptForEdit("");
    setMasterPrompt("");
    setMasterPromptExtensive("");
    setPreviewText("");
    setSubjectInstructions("");
    setWebSearchInstructions("");
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

  const createNewInstruction = () => {
    setSelectedTemplateDefinitionId(null); // remove dropdown selection
    setTemplateName("");
    setSystemPrompt("");
    setSystemPromptForEdit("");
    setMasterPrompt("");
    setMasterPromptExtensive("");
    setPreviewText("");
    setSubjectInstructions("");
    setWebSearchInstructions("");

    // Clear conversation-related saved session
    sessionStorage.removeItem("campaign_system_prompt");
    sessionStorage.removeItem("campaign_system_prompt_edit");
    sessionStorage.removeItem("campaign_master_prompt");
    sessionStorage.removeItem("campaign_master_prompt_extensive");
    sessionStorage.removeItem("campaign_preview_text");
    sessionStorage.removeItem("campaign_template_name");
    sessionStorage.removeItem("campaign_web_search_instructions");

    // Optional: Show toast
    console.log("✨ Starting new instruction from scratch");
  };

  const deleteTemplateDefinition = async () => {
    if (!selectedTemplateDefinitionId) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this template definition? This cannot be undone.",
    );

    if (!confirmDelete) return;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/CampaignPrompt/template-definition/${selectedTemplateDefinitionId}/deactivate`,
      );

      // showModal("Success", "Template deleted successfully.");
      setToastMessage("Template deleted successfully.");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 5000);

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
      //showModal("error", "Failed to delete template definition.");
       setToastMessage("Failed to delete template definition.");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 5000);
    }
  };
  // ensure you import useEffect at top

  const reloadCampaignBlueprint = async () => {
    try {
      const storedId = sessionStorage.getItem("newCampaignId");
      const id = editTemplateId ?? (storedId ? Number(storedId) : null);

      if (!id) return;

      const res = await axios.get(
        `${API_BASE_URL}/api/CampaignPrompt/campaign/${id}`,
      );
      const data = res.data;

      // Update example output
      if (data.exampleOutput) {
        setExampleOutput(data.exampleOutput);
      }

      // Update placeholders
      if (data.placeholderValues) {
        const conversationOnly = getConversationPlaceholders(
          data.placeholderValues,
        );
        const contactOnly = getContactPlaceholders(placeholderValues);

        setPlaceholderValues({
          ...conversationOnly,
          ...contactOnly,
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



  const deletePlaceholderDefinition = async (placeholderKey: string) => {
    if (!selectedTemplateDefinitionId) return;

    const confirmDelete = window.confirm(
      `Delete placeholder {${placeholderKey}}?\n\nThis will remove it from the template definition.`
    );

    if (!confirmDelete) return;

    try {
      await axios.post(
        `${API_BASE_URL}/api/CampaignPrompt/placeholders/delete`,
        {
          templateDefinitionId: selectedTemplateDefinitionId,
          placeholderKey,
        }
      );

      // 🔥 REMOVE + RE-NORMALIZE ORDER
      setUiPlaceholders((prev) => {
        const filtered = prev.filter(
          (p) => p.placeholderKey !== placeholderKey
        );

        const grouped: Record<string, PlaceholderDefinitionUI[]> = {};

        filtered.forEach((p) => {
          if (!grouped[p.category]) grouped[p.category] = [];
          grouped[p.category].push(p);
        });

        return Object.values(grouped).flatMap((list) =>
          list
            .sort((a, b) => a.placeholderSequence - b.placeholderSequence)
            .map((p, idx) => ({
              ...p,
              placeholderSequence: idx + 1,
            }))
        );
      });


      // Clean values
      setFormValues((prev) => {
        const copy = { ...prev };
        delete copy[placeholderKey];
        return copy;
      });

      setPlaceholderValues((prev) => {
        const copy = { ...prev };
        delete copy[placeholderKey];
        return copy;
      });

      console.log(`🗑️ Placeholder deleted: ${placeholderKey}`);
    } catch (err) {
      console.error("❌ Failed to delete placeholder", err);
     // showModal("Error", "Failed to delete placeholder definition.");
     setToastMessage("Failed to delete placeholder definition.");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 5000);
    }
  };


  // ====================================================================
  // RENDER
  // ====================================================================
  return (
    <div className="email-campaign-builder !p-[0]">
      {/* ================= BACK-TO-BLUEPRINTS BUTTON ================= */}
      {/* Single, always-visible exit control shown at the top of every step/UI
          of the builder (replaces the per-step "Cancel" buttons). Rendered in
          normal flow above the main container so it sits above each step's
          content instead of floating over it. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          padding: "12px 16px 0",
        }}
      >
        <button
          onClick={() => (onExitBuilder ? onExitBuilder() : resetAll())}
          title="Back to blueprints"
          style={{
            ...lessPriorityButtonStyle,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <FontAwesomeIcon icon={faAngleLeft} /> Back to blueprints
        </button>

        {/* ---- BLUEPRINT SWITCHER ----
            Rendered whenever the parent supplies options (Template.tsx passes the
            blueprints in scope for the current user). Changing the selection
            reloads the whole builder against the chosen blueprint; a completed
            blueprint (one that already has an example output email) opens
            straight in edit mode. */}
        {blueprintOptions && blueprintOptions.length > 0 && (
          <BlueprintSwitcher
            options={blueprintOptions}
            activeBlueprintId={activeBlueprintId}
            isSwitching={isSwitchingBlueprint}
            onChange={(id) => onBlueprintChange?.(id)}
          />
        )}
      </div>

      {/* ================= LOADING OVERLAYS ================= */}
      {isLoadingTemplate && <LoadingSpinner message="Loading template for editing..." />}
      {isLoadingDefinitions && <LoadingSpinner message="Loading blueprint definitions..." />}

      {/* ================= MAIN CONTAINER ================= */}
      <div className="campaign-builder-container !p-[0]">
        <div className="campaign-builder-mains">
          <PopupModal
            open={popupmodalInfo.open}
            title={popupmodalInfo.title}
            message={popupmodalInfo.message}
            onClose={closeModal}
          />

          {/* ================= BUILD TAB ================= */}
          {activeMainTab === "build" && (
            <BlueprintBuilderPanel
              conversationStarted={conversationStarted}
              messages={visibleMessages}
              isTyping={isTyping}
              isComplete={isComplete}
              currentAnswer={currentAnswer}
              setCurrentAnswer={setCurrentAnswer}
              handleSendMessage={handleSendMessage}
              handleKeyPress={handleKeyPress}
              resetAll={resetAll}
              onExitBuilder={onExitBuilder}
              isEditMode={isEditMode}
              selectedPlaceholder={selectedPlaceholder}
              onPlaceholderSelect={startEditConversation}
              setIsTyping={setIsTyping}
              placeholderValues={visiblePlaceholderValues}
              groupedPlaceholders={visibleGroupedPlaceholders}
              formValues={visibleFormValues}
              setFormValues={setFormValues}
              renderPlaceholderInput={renderPlaceholderInput}
              saveAllPlaceholders={saveAllPlaceholders}
              isSavingElements={isSavingElements}
              exampleOutput={exampleOutput}
              editableExampleOutput={editableExampleOutput}
              setEditableExampleOutput={setEditableExampleOutput}
              previewFinalPrompt={previewFinalPrompt}
              previewWebSearchData={previewWebSearchData}
              previewEmails={previewEmails}
              previewNotes={previewNotes}
              previewProfessionalSummary={previewProfessionalSummary}
              filledTemplate={filledTemplate}
              isPreviewLoading={isPreviewLoading}
              regenerateExampleOutput={regenerateExampleOutput}
              saveExampleEmail={saveExampleEmail}
              exampleSaveStatus={exampleSaveStatus}
              isPreviewAllowed={isPreviewAllowed}
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
              editTemplateId={editTemplateId}
              initialExampleEmail={initialExampleEmail}
              selectedElement={selectedElement}
              attachedImages={attachedImages}
              setAttachedImages={setAttachedImages}
              handleImageUpload={uploadImage}
              activeBuildTab={activeBuildTab}
              setActiveBuildTab={setActiveBuildTab}
              onBeforeAiChatOpen={onBeforeAiChatOpen}
              onApprove={() => { setWizardCompleted(true); setActiveBuildTab("elements"); }}
              onStartConversation={(method, msg) => startConversation(msg)}
              isTemplateLoading={isPreparingAutoStart}
              ConversationTabComponent={ConversationTab}
              ExampleOutputPanelComponent={ExampleOutputPanel}
              userRole={userRole}
              usageInfo={usageInfo}
              totalUsage={totalUsage}
              onShowInstructions={() => setActiveMainTab("instructions")}
              onShowVT={() => setActiveMainTab("ct")}
            />
          )}

          {/* ================= INSTRUCTIONS TAB ================= */}
          {activeMainTab === "instructions" && userRole === "ADMIN" && (
            <div style={{ padding: "10px 0 0" }}>
              <button
                onClick={() => setActiveMainTab("build")}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", border: "1px solid #d1d5db", borderRadius: 8, background: "#fff", fontSize: 13, cursor: "pointer", color: "#374151", marginBottom: 12 }}
              >
                ← Back to Build
              </button>
            </div>
          )}
          {activeMainTab === "instructions" && (
            <InstructionSetManager
              templateDefinitions={templateDefinitions}
              selectedTemplateDefinitionId={selectedTemplateDefinitionId}
              isSavingDefinition={isSavingDefinition}
              templateName={templateName}
              setTemplateName={setTemplateName}
              systemPrompt={systemPrompt}
              setSystemPrompt={setSystemPrompt}
              systemPromptForEdit={systemPromptForEdit}
              setSystemPromptForEdit={setSystemPromptForEdit}
              masterPrompt={masterPrompt}
              setMasterPrompt={setMasterPrompt}
              masterPromptExtensive={masterPromptExtensive}
              setMasterPromptExtensive={setMasterPromptExtensive}
              previewText={previewText}
              setPreviewText={setPreviewText}
              searchURLCount={searchURLCount}
              setSearchURLCount={setSearchURLCount}
              subjectInstructions={subjectInstructions}
              setSubjectInstructions={setSubjectInstructions}
              webSearchInstructions={webSearchInstructions}
              setWebSearchInstructions={setWebSearchInstructions}
              uiPlaceholders={uiPlaceholders}
              setUiPlaceholders={setUiPlaceholders}
              onLoadTemplateDefinition={loadTemplateDefinitionById}
              onSaveTemplateDefinition={saveTemplateDefinition}
              onUpdateTemplateDefinition={updateTemplateDefinition}
              onDeleteTemplateDefinition={deleteTemplateDefinition}
              onCreateNewInstruction={createNewInstruction}
              onStartConversation={startConversation}
              onSavePlaceholderDefinitions={savePlaceholderDefinitions}
              onDeletePlaceholderDefinition={deletePlaceholderDefinition}
            />
          )}

          {/* ================= VT TAB ================= */}
          {activeMainTab === "ct" && userRole === "ADMIN" && (
            <div style={{ padding: "10px 0 0" }}>
              <button
                onClick={() => setActiveMainTab("build")}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", border: "1px solid #d1d5db", borderRadius: 8, background: "#fff", fontSize: 13, cursor: "pointer", color: "#374151", marginBottom: 12 }}
              >
                ← Back to Build
              </button>
            </div>
          )}
          {activeMainTab === "ct" && (
            <div className="ct-tab-container mt-[6px]">
              <h3>Live vendor blueprint (Auto updated)</h3>
              <SimpleTextarea
                value={campaignBlueprint}
                onChange={(e: any) => setCampaignBlueprint(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>
      <style>{toastAnimation}</style>
      {showSuccessToast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#E6F4EF",        // soft pastel green
            color: "#2F3A34",              // dark grey text (not black)
            padding: "14px 22px",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            gap: 16,
            boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
            zIndex: 99999,
            minWidth: 420,
            fontSize: 16,
            fontWeight: 500,
            overflow: "hidden",
          }}
        >
          {/* Timer Bar */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: 4,
              width: "100%",
              background: "#1F9D74",  // darker green line like image
              animation: "toastProgress 3s linear forwards",
            }}
          />

          {/* Check Circle */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#1F9D74",   // same green as timer
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            ✓
          </div>

          {/* Message */}
          <div style={{ flex: 1 }}>
            {toastMessage}
          </div>

          {/* Close Button */}
          <div
            onClick={() => setShowSuccessToast(false)}
            style={{
              cursor: "pointer",
              fontSize: 30,
              fontWeight: 500,
              color: "#6B7280",   // soft gray like screenshot
              lineHeight: 1,
            }}
          >
            ×
          </div>
        </div>
      )}
      {/* ERROR TOAST */}
{showErrorToast && (
  <div
    style={{
      position: "fixed",
      bottom: 24,
      left: "50%",
      transform: "translateX(-50%)",
      background: "#FDECEC",        // pastel red background
      color: "#2F3A34",              // dark soft red text
      padding: "14px 22px",
      borderRadius: 12,
      display: "flex",
      alignItems: "center",
      gap: 16,
      boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
      zIndex: 99999,
      minWidth: 420,
      fontSize: 16,
      fontWeight: 500,
      overflow: "hidden",
    }}
  >
    {/* Timer Bar */}
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        height: 4,
        width: "100%",
        background: "#DC2626",   // strong red timer
        animation: "toastProgress 3s linear forwards",
      }}
    />

    {/* Error Circle */}
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: "#DC2626",   // same red as timer
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 16,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      !
    </div>

    {/* Message */}
    <div style={{ flex: 1 }}>
      {toastMessage}
    </div>

    {/* Close Button */}
    <div
      onClick={() => setShowErrorToast(false)}
      style={{
        cursor: "pointer",
        fontSize: 30,
        fontWeight: 500,
        color: "#9CA3AF",  // same gray as success close
        lineHeight: 1,
      }}
    >
      ×
    </div>
  </div>
)}
    </div>
  );
};

export default MasterPromptCampaignBuilder;

