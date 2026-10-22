import * as userDates from "../../common/dateTimePreferences";
import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  Globe,
  MessageSquarePlus,
  Mic,
  RotateCcw,
  SlidersHorizontal,
  Square,
} from "lucide-react";
import API_BASE_URL from "../../../config";
import { lessPriorityButtonStyle } from "../../../styles/buttonStyles";
import witchLogo from "../../../assets/images/Witch_logo_AI.png";
import "./ContactQA.css";

type ContactQARole = "user" | "assistant";

interface ContactQAMessage {
  id: string;
  role: ContactQARole;
  content: string;
  createdAt: string;
}

interface ContactQAUsageSnapshot {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
}

interface ContactQAUsageState {
  last: ContactQAUsageSnapshot;
  total: ContactQAUsageSnapshot & {
    questions: number;
  };
}

interface ContactQANote {
  id: string | number;
  createdAt: string;
  isPinned: boolean;
  isUsedForGeneration: boolean;
  content: string;
}

interface ContactQAEmailReply {
  from: string;
  subject: string;
  date: string;
  body: string;
}

interface ContactQAEmailEvent {
  eventType: string;
  eventAt: string;
  targetUrl: string;
}

interface ContactQAEmail {
  trackingId: string;
  source: string;
  sentAt: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  events: ContactQAEmailEvent[];
  replies: ContactQAEmailReply[];
}

interface ContactQALinkedInMessage {
  id: string | number;
  direction: string;
  messageType: string;
  sentAt: string;
  isSent: boolean;
  body: string;
}

interface ContactQACustomField {
  key: string;
  label: string;
  value: string;
}

interface ContactQAProps {
  clientId: number;
  contactId: number | string;
  contact: any | null;
  notesHistory?: any[];
  emailTimeline?: any[];
  linkedInMessages?: any[];
  loading?: boolean;
  onBeforeQuestion?: () => Promise<boolean>;
  onQuestionSuccess?: () => Promise<void>;
}

const CONTACT_QA_STORAGE_PREFIX = "contact_qa_messages";
const CONTACT_QA_USAGE_STORAGE_PREFIX = "contact_qa_usage";
const CONTACT_QA_SOURCES_STORAGE_PREFIX = "contact_qa_sources";

// The model is not chosen here — an admin sets it in Settings > AI models and
// the API resolves it server-side.

interface ContactQASuggestion {
  /** The card heading. The prompt itself is too long to read at a glance. */
  title: string;
  prompt: string;
}

const SUGGESTED_QUESTIONS: ContactQASuggestion[] = [
  {
    title: "Questions already asked",
    prompt: "What questions has this contact already been asked in previous emails?",
  },
  {
    title: "Catch me up",
    prompt: "Summarize this contact's profile, notes, and outreach history.",
  },
  {
    title: "What to ask next",
    prompt: "What would be the best follow-up question to ask next?",
  },
  {
    title: "Signals & objections",
    prompt:
      "List any signals of interest, objections, or gaps in the conversation so far.",
  },
];

// Only worth offering once the live web is in play, so it sits in front of the
// CRM suggestions rather than replacing one of them.
const INTERNET_RESEARCH_SUGGESTION: ContactQASuggestion = {
  title: "Research online",
  prompt:
    "Research this company online and summarize anything recent that is not already in the CRM.",
};

type ContactQASourceKey =
  | "profile"
  | "notes"
  | "emails"
  | "linkedinProfile"
  | "linkedinMessages"
  | "savedResearch"
  | "internet";

interface ContactQASourceOption {
  key: ContactQASourceKey;
  label: string;
  hint: string;
  /** The live web, rather than something the CRM already holds. */
  isResearch?: boolean;
}

const CONTACT_QA_SOURCE_OPTIONS: ContactQASourceOption[] = [
  {
    key: "profile",
    label: "Profile & fields",
    hint: "Contact and company profile fields, plus every custom field on the record",
  },
  {
    key: "notes",
    label: "Notes",
    hint: "Internal notes saved against this contact",
  },
  {
    key: "emails",
    label: "Emails",
    hint: "Emails sent to this contact, their replies, and open/click activity",
  },
  {
    key: "linkedinProfile",
    label: "LinkedIn info",
    hint: "The stored LinkedIn profile summary and profile URL",
  },
  {
    key: "linkedinMessages",
    label: "LinkedIn messages",
    hint: "LinkedIn messages sent to this contact and replies pasted back in",
  },
  {
    key: "savedResearch",
    label: "Saved insights",
    hint: "Web research already gathered and stored on this contact",
  },
  {
    key: "internet",
    label: "Internet research",
    hint: "Let the model search the live web for anything the CRM cannot answer",
    isResearch: true,
  },
];

// The record sources live behind the composer's Sources menu; internet research
// gets its own visible toggle, the way a chat UI surfaces web search.
const RECORD_SOURCE_OPTIONS = CONTACT_QA_SOURCE_OPTIONS.filter(
  (option) => !option.isResearch,
);

const INTERNET_SOURCE_OPTION = CONTACT_QA_SOURCE_OPTIONS.find(
  (option) => option.isResearch,
) as ContactQASourceOption;

type ContactQASourceSelection = Record<ContactQASourceKey, boolean>;

// Everything the CRM already holds is on by default. Live web search is the one
// opt-in: it is slower and it costs more, and most questions asked here are
// about what we already know.
const DEFAULT_SOURCE_SELECTION: ContactQASourceSelection = {
  profile: true,
  notes: true,
  emails: true,
  linkedinProfile: true,
  linkedinMessages: true,
  savedResearch: true,
  internet: false,
};

const STANDARD_CONTACT_KEYS = new Set([
  "id",
  "first_name",
  "last_name",
  "full_name",
  "email",
  "website",
  "company_name",
  "job_title",
  "linkedin_url",
  "country_or_address",
  "email_subject",
  "email_body",
  "created_at",
  "updated_at",
  "email_sent_at",
  "companyTelephone",
  "companyEmployeeCount",
  "companyIndustry",
  "companyLinkedInURL",
  "unsubscribe",
  "notes",
  "contactCreatedAt",
  "linkedIninformation",
  "linkedin_info",
  "web_search_data",
  "web_searched_data",
]);

// web_search_data is stored as a JSON string; parse it so the model receives
// structured research. Falls back to the raw text if it isn't valid JSON.
const parseWebResearch = (raw: unknown): unknown => {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  if (typeof raw !== "string") return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
};

const decodeHtmlEntities = (value?: string) => {
  if (!value) return "";

  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
};

const htmlToText = (value?: string) => {
  if (!value) return "";

  return decodeHtmlEntities(value)
    .replace(/```html/gi, "")
    .replace(/```/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const formatDateLabel = (value?: string) => {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return userDates.formatUserDateTime(parsed);
};

const toReadableLabel = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const stringifyCustomFieldValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return htmlToText(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => stringifyCustomFieldValue(item))
      .filter(Boolean);
    return normalized.join(", ");
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }

  return String(value);
};

const buildStorageKey = (clientId: number, contactId: number | string) =>
  `${CONTACT_QA_STORAGE_PREFIX}:${clientId}:${contactId}`;

const buildUsageStorageKey = (clientId: number, contactId: number | string) =>
  `${CONTACT_QA_USAGE_STORAGE_PREFIX}:${clientId}:${contactId}`;

const plural = (count: number, singular: string, plural_: string) =>
  `${count} ${count === 1 ? singular : plural_}`;

const buildSourcesStorageKey = (clientId: number, contactId: number | string) =>
  `${CONTACT_QA_SOURCES_STORAGE_PREFIX}:${clientId}:${contactId}`;

// Unknown or missing keys fall back to the default, so a source added later
// isn't left switched off for anyone holding a stored selection.
const readStoredSources = (storageKey: string): ContactQASourceSelection => {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return { ...DEFAULT_SOURCE_SELECTION };

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { ...DEFAULT_SOURCE_SELECTION };
    }

    const restored = { ...DEFAULT_SOURCE_SELECTION };
    CONTACT_QA_SOURCE_OPTIONS.forEach((option) => {
      if (typeof parsed[option.key] === "boolean") {
        restored[option.key] = parsed[option.key];
      }
    });

    return restored;
  } catch (error) {
    console.warn("Failed to restore contact Q&A source selection:", error);
    return { ...DEFAULT_SOURCE_SELECTION };
  }
};

const createEmptyUsageState = (): ContactQAUsageState => ({
  last: {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    cost: 0,
  },
  total: {
    questions: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    cost: 0,
  },
});

const toIsoDate = (value?: string) => {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toISOString();
};

const sortByDate = <T,>(items: T[], getDate: (item: T) => string) =>
  [...items].sort((left, right) => {
    const leftTime = new Date(getDate(left)).getTime();
    const rightTime = new Date(getDate(right)).getTime();

    if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) return 0;
    if (Number.isNaN(leftTime)) return 1;
    if (Number.isNaN(rightTime)) return -1;

    return leftTime - rightTime;
  });

const buildContextSummary = (contextPacket: unknown) =>
  [
    "CONTACT_QA_CONTEXT_V2",
    "The JSON below is the canonical prospect context. Each note, email, reply, and activity item is a separate source record. A single answer may require combining facts from multiple records.",
    JSON.stringify(contextPacket, null, 2),
  ].join("\n\n");

const readStoredMessages = (storageKey: string): ContactQAMessage[] => {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to restore contact Q&A chat:", error);
    return [];
  }
};

const readStoredUsage = (storageKey: string): ContactQAUsageState => {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return createEmptyUsageState();

    const parsed = JSON.parse(raw);
    return {
      last: {
        promptTokens: Number(parsed?.last?.promptTokens ?? 0),
        completionTokens: Number(parsed?.last?.completionTokens ?? 0),
        totalTokens: Number(parsed?.last?.totalTokens ?? 0),
        cost: Number(parsed?.last?.cost ?? 0),
      },
      total: {
        questions: Number(parsed?.total?.questions ?? 0),
        promptTokens: Number(parsed?.total?.promptTokens ?? 0),
        completionTokens: Number(parsed?.total?.completionTokens ?? 0),
        totalTokens: Number(parsed?.total?.totalTokens ?? 0),
        cost: Number(parsed?.total?.cost ?? 0),
      },
    };
  } catch (error) {
    console.warn("Failed to restore contact Q&A usage:", error);
    return createEmptyUsageState();
  }
};

const extractAssistantReply = (payload: any): string => {
  const candidates = [
    payload?.answer,
    payload?.content,
    payload?.message,
    payload?.response?.answer,
    payload?.response?.content,
    payload?.response?.message,
    payload?.response?.output,
    payload?.response?.output_text,
    payload?.Response?.answer,
    payload?.Response?.content,
    payload?.Response?.message,
    payload?.Response?.output,
    payload?.Response?.output_text,
  ];

  const directMatch = candidates.find(
    (candidate) => typeof candidate === "string" && candidate.trim().length > 0,
  );
  if (directMatch) {
    return directMatch.trim();
  }

  const outputItems = payload?.response?.output || payload?.Response?.output;
  if (Array.isArray(outputItems)) {
    const text = outputItems
      .flatMap((item: any) => item?.content || [])
      .map((content: any) => content?.text || "")
      .filter(Boolean)
      .join("\n")
      .trim();

    if (text) return text;
  }

  return "";
};

const normalizeAssistantReply = (value: string) =>
  value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const extractUsage = (payload: any): ContactQAUsageSnapshot => {
  const promptTokens = Number(
    payload?.promptTokens ??
      payload?.PromptTokens ??
      payload?.usage?.promptTokens ??
      payload?.usage?.PromptTokens ??
      payload?.usage?.input_tokens ??
      payload?.usage?.inputTokens ??
      0,
  );

  const completionTokens = Number(
    payload?.completionTokens ??
      payload?.CompletionTokens ??
      payload?.usage?.completionTokens ??
      payload?.usage?.CompletionTokens ??
      payload?.usage?.output_tokens ??
      payload?.usage?.outputTokens ??
      0,
  );

  const totalTokens = Number(
    payload?.totalTokens ??
      payload?.TotalTokens ??
      payload?.usage?.totalTokens ??
      payload?.usage?.TotalTokens ??
      promptTokens + completionTokens,
  );

  const cost = Number(
    payload?.currentCost ??
      payload?.CurrentCost ??
      payload?.cost ??
      payload?.Cost ??
      payload?.usage?.cost ??
      payload?.usage?.currentCost ??
      payload?.usage?.CurrentCost ??
      0,
  );

  return {
    promptTokens,
    completionTokens,
    totalTokens,
    cost,
  };
};

const ContactQA: React.FC<ContactQAProps> = ({
  clientId,
  contactId,
  contact,
  notesHistory = [],
  emailTimeline = [],
  linkedInMessages = [],
  loading = false,
  onBeforeQuestion,
  onQuestionSuccess,
}) => {
  const storageKey = useMemo(
    () => buildStorageKey(clientId, contactId),
    [clientId, contactId],
  );
  const usageStorageKey = useMemo(
    () => buildUsageStorageKey(clientId, contactId),
    [clientId, contactId],
  );
  const sourcesStorageKey = useMemo(
    () => buildSourcesStorageKey(clientId, contactId),
    [clientId, contactId],
  );

  const [messages, setMessages] = useState<ContactQAMessage[]>(() =>
    readStoredMessages(storageKey),
  );
  const [usageState, setUsageState] = useState<ContactQAUsageState>(() =>
    readStoredUsage(usageStorageKey),
  );
  const [selectedSources, setSelectedSources] = useState<ContactQASourceSelection>(
    () => readStoredSources(sourcesStorageKey),
  );
  const [userRole, setUserRole] = useState<string>("");
  const [question, setQuestion] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const [isUsageOpen, setIsUsageOpen] = useState(false);
  // The pane has no scroller of its own: it grows with the thread and the page
  // scroll is the only one, so the composer sits after the last answer.
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const sourcesMenuRef = useRef<HTMLDivElement | null>(null);
  const usageMenuRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const latestAssistantMessageRef = useRef<HTMLDivElement | null>(null);
  const dockRef = useRef<HTMLDivElement | null>(null);
  const previousMessageCountRef = useRef(messages.length);
  const questionInFlightRef = useRef(false);

  const contactContext = useMemo(() => {
    const resolvedContact = contact || {};
    const fullName =
      resolvedContact.full_name ||
      [resolvedContact.first_name, resolvedContact.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();

    // Everything is normalized first and gated second, because the Sources menu
    // has to show how much each source holds even while it is switched off.
    const availableWebResearch = parseWebResearch(resolvedContact.web_search_data);

    const allNotes: ContactQANote[] = sortByDate(
      (notesHistory || []).map((note: any) => ({
        id: note.id,
        createdAt: note.createdAt || note.date || "",
        isPinned: Boolean(note.isPin),
        isUsedForGeneration: Boolean(note.isUseInGenration),
        content: htmlToText(note.note || note.content),
      })),
      (note) => note.createdAt,
    );

    const allEmails: ContactQAEmail[] = sortByDate(
      (emailTimeline || []).map((email: any) => ({
        trackingId: email.trackingId,
        source: email.source || "",
        sentAt: email.sentAt || email.date || "",
        from: email.senderEmailId || email.fromEmail || "",
        to: email.toEmail || resolvedContact.email || "",
        subject: email.subject || "",
        body: htmlToText(email.body || email.email_body),
        events: sortByDate(
          Array.isArray(email.events)
            ? email.events.map((event: any) => ({
                eventType: event.eventType,
                eventAt: event.eventAt || "",
                targetUrl: event.targetUrl || "",
              }))
            : [],
          (event) => event.eventAt,
        ),
        replies: sortByDate(
          Array.isArray(email.replies)
            ? email.replies.map((reply: any) => ({
                from: reply.fromEmail || reply.senderEmailId || "",
                subject: reply.subject || "",
                date: reply.date || reply.sentAt || "",
                body: htmlToText(reply.body || reply.replyBody || reply.message),
              }))
            : [],
          (reply) => reply.date,
        ),
      })),
      (email) => email.sentAt,
    );

    // Both directions of the LinkedIn thread, oldest first: outbound is what we
    // sent, inbound is a reply someone pasted back in. Drafts never reach here —
    // the parent asks the API for sent rows only.
    const allLinkedInMessages: ContactQALinkedInMessage[] = sortByDate(
      (linkedInMessages || [])
        .map((message: any) => ({
          id: message.id ?? message.msgUid ?? "",
          direction: String(message.direction || "outbound").toLowerCase(),
          messageType: message.messageType || "message",
          sentAt: message.sentAt || message.activityAt || message.generatedAt || "",
          isSent: Boolean(message.isSent),
          body: htmlToText(message.body),
        }))
        .filter((message: ContactQALinkedInMessage) => message.body.length > 0),
      (message) => message.sentAt,
    );

    const customFields: ContactQACustomField[] = Object.entries(resolvedContact)
      .filter(([key, value]) => {
        if (STANDARD_CONTACT_KEYS.has(key)) return false;
        if (key.startsWith("_")) return false;
        if (typeof value === "function") return false;

        const normalizedValue = stringifyCustomFieldValue(value);
        return normalizedValue.trim().length > 0;
      })
      .map(([key, value]) => ({
        key,
        label: toReadableLabel(key),
        value: stringifyCustomFieldValue(value),
      }));

    const normalizedContact = {
      id: resolvedContact.id || Number(contactId),
      firstName: resolvedContact.first_name || "",
      lastName: resolvedContact.last_name || "",
      fullName,
      email: resolvedContact.email || "",
      companyName: resolvedContact.company_name || "",
      jobTitle: resolvedContact.job_title || "",
      location: resolvedContact.country_or_address || "",
      website: resolvedContact.website || "",
      linkedinUrl: resolvedContact.linkedin_url || "",
      linkedinSummary:
        htmlToText(
          resolvedContact.linkedIninformation || resolvedContact.linkedin_info,
        ) || "",
      companyTelephone: resolvedContact.companyTelephone || "",
      companyEmployeeCount: stringifyCustomFieldValue(
        resolvedContact.companyEmployeeCount,
      ),
      companyIndustry: resolvedContact.companyIndustry || "",
      createdAt: resolvedContact.contactCreatedAt || resolvedContact.created_at || "",
      createdAtIso: toIsoDate(
        resolvedContact.contactCreatedAt || resolvedContact.created_at,
      ),
      customFields,
    };

    // One checkbox, one source. An unticked source is dropped from the packet
    // entirely rather than flagged, so the model cannot quote something the user
    // chose not to share with it.
    const notes = selectedSources.notes ? allNotes : [];
    const emails = selectedSources.emails ? allEmails : [];
    const linkedInConversation = selectedSources.linkedinMessages
      ? allLinkedInMessages
      : [];
    const selectedCustomFields = selectedSources.profile ? customFields : [];
    const webResearch = selectedSources.savedResearch ? availableWebResearch : null;
    const includeLinkedInProfile = Boolean(selectedSources.linkedinProfile);
    const linkedInSummaryIncluded = Boolean(
      includeLinkedInProfile && normalizedContact.linkedinSummary,
    );

    // With the profile unticked only the name survives, because an answer still
    // has to say who it is about.
    const packetContact = {
      ...(selectedSources.profile
        ? normalizedContact
        : {
            id: normalizedContact.id,
            firstName: normalizedContact.firstName,
            lastName: normalizedContact.lastName,
            fullName: normalizedContact.fullName,
          }),
      customFields: selectedCustomFields,
      linkedinUrl: includeLinkedInProfile ? normalizedContact.linkedinUrl : "",
      linkedinSummary: includeLinkedInProfile ? normalizedContact.linkedinSummary : "",
    };

    const enabledSourceLabels = RECORD_SOURCE_OPTIONS.filter(
      (option) => selectedSources[option.key],
    ).map((option) => option.label);

    const excludedSourceLabels = RECORD_SOURCE_OPTIONS.filter(
      (option) => !selectedSources[option.key],
    ).map((option) => option.label);

    const contextPacket = {
      schemaVersion: "contact_qa_v3",
      entityType: "prospect",
      selectedSources: {
        enabled: enabledSourceLabels,
        excluded: excludedSourceLabels,
        internetResearch: Boolean(selectedSources.internet),
      },
      answeringHints: [
        "Use the JSON structure as the source of truth.",
        "A single question may require evidence from multiple notes, emails, replies, LinkedIn messages, or profile fields.",
        "Treat every note, email, reply, activity event, and LinkedIn message as a separate source record.",
        "When two records support the same answer, keep both records in mind together instead of choosing only one.",
        "The webResearch record holds insights gathered from public web sources (company overview, recent news, hiring signals, key findings, etc.). Use it for company/market context.",
        "linkedinMessages is the LinkedIn conversation. direction=outbound means we sent it; direction=inbound means the contact replied and it was pasted in. Read it as one chronological thread alongside the emails.",
        "The user chose which sources to include. Anything listed in selectedSources.excluded was deliberately left out of this packet: do not guess at it, and say it was excluded if the question depends on it.",
      ],
      sourceCounts: {
        notes: notes.length,
        emails: emails.length,
        replies: emails.reduce(
          (total, email) => total + (email.replies?.length || 0),
          0,
        ),
        linkedinMessages: linkedInConversation.length,
        customFields: selectedCustomFields.length,
        webResearch: webResearch ? 1 : 0,
      },
      contact: packetContact,
      webResearch: webResearch
        ? {
            sourceType: "WebResearch",
            sourceId: "WEBRESEARCH-1",
            description:
              "Insights gathered from public web sources to help personalize outreach.",
            data: webResearch,
          }
        : null,
      linkedin: includeLinkedInProfile
        ? {
            sourceType: "LinkedIn",
            sourceId: "LINKEDIN-1",
            url: resolvedContact.linkedin_url || "",
            summary: normalizedContact.linkedinSummary,
          }
        : null,
      linkedinMessages: linkedInConversation.map((message, index) => ({
        sourceType: "LinkedInMessage",
        sourceId: `LIMSG-${index + 1}`,
        messageId: message.id ?? "",
        direction: message.direction,
        sender: message.direction === "inbound" ? "contact" : "us",
        messageType: message.messageType,
        sentAt: message.sentAt || "",
        sentAtIso: toIsoDate(message.sentAt),
        body: message.body || "",
      })),
      notes: notes.map((note, index) => ({
        sourceType: "Note",
        sourceId: `NOTE-${index + 1}`,
        noteId: note.id ?? "",
        createdAt: note.createdAt || "",
        createdAtIso: toIsoDate(note.createdAt),
        flags: {
          isPinned: note.isPinned,
          isUsedForGeneration: note.isUsedForGeneration,
        },
        content: note.content || "",
      })),
      emails: emails.map((email, index) => ({
        sourceType: "Email",
        sourceId: `EMAIL-${index + 1}`,
        trackingId: email.trackingId || "",
        mailboxSource: email.source || "",
        sentAt: email.sentAt || "",
        sentAtIso: toIsoDate(email.sentAt),
        from: email.from || "",
        to: email.to || "",
        subject: email.subject || "",
        body: email.body || "",
        replies: email.replies.map((reply: ContactQAEmailReply, replyIndex: number) => ({
          sourceType: "Email",
          sourceId: `EMAIL-${index + 1}-REPLY-${replyIndex + 1}`,
          date: reply.date || "",
          dateIso: toIsoDate(reply.date),
          from: reply.from || "",
          subject: reply.subject || "",
          body: reply.body || "",
        })),
        events: email.events.map((event: ContactQAEmailEvent, eventIndex: number) => ({
          sourceType: "Email",
          sourceId: `EMAIL-${index + 1}-EVENT-${eventIndex + 1}`,
          eventType: event.eventType || "",
          eventAt: event.eventAt || "",
          eventAtIso: toIsoDate(event.eventAt),
          targetUrl: event.targetUrl || "",
        })),
      })),
    };

    // "Is there anything to answer from?" has to be judged on the selected
    // sources, not on everything the contact happens to have.
    const hasSelectedContext = Boolean(
      normalizedContact.fullName ||
        (selectedSources.profile &&
          (normalizedContact.email ||
            normalizedContact.companyName ||
            normalizedContact.jobTitle)) ||
        selectedCustomFields.length ||
        linkedInSummaryIncluded ||
        (includeLinkedInProfile && normalizedContact.linkedinUrl) ||
        notes.length ||
        emails.length ||
        linkedInConversation.length ||
        webResearch,
    );

    return {
      contact: normalizedContact,
      notes,
      emails,
      linkedInConversation,
      customFieldCount: selectedCustomFields.length,
      hasWebResearch: Boolean(webResearch),
      hasLinkedInSummary: linkedInSummaryIncluded,
      hasSelectedContext,
      // Counted before the checkboxes are applied — this is what each source
      // could contribute, which is what the Sources menu needs to show.
      available: {
        notes: allNotes.length,
        emails: allEmails.length,
        replies: allEmails.reduce(
          (total, email) => total + (email.replies?.length || 0),
          0,
        ),
        linkedinMessages: allLinkedInMessages.length,
        customFields: customFields.length,
        hasLinkedInProfile: Boolean(
          normalizedContact.linkedinSummary || normalizedContact.linkedinUrl,
        ),
        hasSavedResearch: Boolean(availableWebResearch),
      },
      contextPacket,
      contextSummary: buildContextSummary(contextPacket),
    };
  }, [contact, contactId, emailTimeline, linkedInMessages, notesHistory, selectedSources]);

  const contextStats = useMemo(() => {
    const replyCount = contactContext.emails.reduce(
      (total: number, email: any) => total + (email.replies?.length || 0),
      0,
    );

    return {
      noteCount: contactContext.notes.length,
      emailCount: contactContext.emails.length,
      replyCount,
      linkedInMessageCount: contactContext.linkedInConversation.length,
      customFieldCount: contactContext.customFieldCount,
      hasLinkedInSummary: contactContext.hasLinkedInSummary,
      hasWebResearch: contactContext.hasWebResearch,
    };
  }, [contactContext]);

  // One short line per source row, so the menu answers "is it worth ticking?"
  const sourceSummaries = useMemo<Record<ContactQASourceKey, string>>(() => {
    const available = contactContext.available;

    return {
      profile:
        available.customFields > 0
          ? `Standard fields + ${plural(available.customFields, "custom field", "custom fields")}`
          : "Standard profile fields",
      notes: plural(available.notes, "note", "notes"),
      emails:
        available.replies > 0
          ? `${plural(available.emails, "email", "emails")} · ${plural(available.replies, "reply", "replies")}`
          : plural(available.emails, "email", "emails"),
      linkedinProfile: available.hasLinkedInProfile ? "Stored on the record" : "Nothing stored",
      linkedinMessages: plural(available.linkedinMessages, "message", "messages"),
      savedResearch: available.hasSavedResearch ? "Stored on the record" : "Nothing stored",
      internet: "Live web search",
    };
  }, [contactContext.available]);

  const emptySources = useMemo<Record<ContactQASourceKey, boolean>>(() => {
    const available = contactContext.available;

    return {
      profile: false,
      notes: available.notes === 0,
      emails: available.emails === 0,
      linkedinProfile: !available.hasLinkedInProfile,
      linkedinMessages: available.linkedinMessages === 0,
      savedResearch: !available.hasSavedResearch,
      internet: false,
    };
  }, [contactContext.available]);

  const latestAssistantMessageId = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index]?.role === "assistant") {
        return messages[index].id;
      }
    }

    return null;
  }, [messages]);

  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  useEffect(() => {
    sessionStorage.setItem(usageStorageKey, JSON.stringify(usageState));
  }, [usageState, usageStorageKey]);

  useEffect(() => {
    sessionStorage.setItem(sourcesStorageKey, JSON.stringify(selectedSources));
  }, [selectedSources, sourcesStorageKey]);

  useEffect(() => {
    const isAdminString = sessionStorage.getItem("isAdmin");
    const isAdmin = isAdminString === "true";
    setUserRole(isAdmin ? "ADMIN" : "USER");
  }, []);

  // Scrolling now moves whichever ancestor actually scrolls, since the pane
  // itself no longer does.
  const scrollToComposer = (behavior: ScrollBehavior = "smooth") => {
    dockRef.current?.scrollIntoView({ behavior, block: "end" });
  };

  useEffect(() => {
    const previousMessageCount = previousMessageCountRef.current;
    const hasNewMessage = messages.length > previousMessageCount;
    const lastMessage = messages[messages.length - 1];

    // A fresh answer is parked at the top of the viewport so it reads from its
    // first line; anything else just follows the bottom of the thread.
    if (hasNewMessage && lastMessage?.role === "assistant" && latestAssistantMessageRef.current) {
      latestAssistantMessageRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } else if (hasNewMessage || isSending) {
      scrollToComposer();
    }

    previousMessageCountRef.current = messages.length;
  }, [isSending, messages]);

  // Keep the composer sized to its content, including after a send clears it.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [question]);

  useEffect(() => {
    if (!isSourcesOpen && !isUsageOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (isSourcesOpen && !sourcesMenuRef.current?.contains(target)) {
        setIsSourcesOpen(false);
      }

      if (isUsageOpen && !usageMenuRef.current?.contains(target)) {
        setIsUsageOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      setIsSourcesOpen(false);
      setIsUsageOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSourcesOpen, isUsageOpen]);

  const hasAnySourceSelected = useMemo(
    () => CONTACT_QA_SOURCE_OPTIONS.some((option) => selectedSources[option.key]),
    [selectedSources],
  );

  // Internet research on its own is enough to ask a question: the answer then
  // comes from the live web rather than the CRM. Nothing ticked at all is not,
  // so the composer stays closed until the user picks something.
  const hasContext =
    hasAnySourceSelected &&
    (contactContext.hasSelectedContext || selectedSources.internet);

  const suggestedQuestions = useMemo(
    () =>
      selectedSources.internet
        ? [INTERNET_RESEARCH_SUGGESTION, ...SUGGESTED_QUESTIONS]
        : SUGGESTED_QUESTIONS,
    [selectedSources.internet],
  );

  const selectedRecordSourceCount = useMemo(
    () => RECORD_SOURCE_OPTIONS.filter((option) => selectedSources[option.key]).length,
    [selectedSources],
  );

  const toggleSource = (key: ContactQASourceKey) => {
    setSelectedSources((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setAllRecordSources = (value: boolean) => {
    setSelectedSources((prev) => {
      const next = { ...prev };
      RECORD_SOURCE_OPTIONS.forEach((option) => {
        next[option.key] = value;
      });

      return next;
    });
  };

  const contactFirstName =
    contactContext.contact.firstName ||
    (contactContext.contact.fullName || "").split(" ")[0] ||
    "this contact";

  // The old badge wall, condensed to the one line that answers "what is it
  // reading?". Counts follow the checkboxes, not the record.
  const contextSummaryLine = useMemo(() => {
    const parts: string[] = [];

    if (contextStats.emailCount) {
      parts.push(plural(contextStats.emailCount, "email", "emails"));
    }
    if (contextStats.replyCount) {
      parts.push(plural(contextStats.replyCount, "reply", "replies"));
    }
    if (contextStats.noteCount) {
      parts.push(plural(contextStats.noteCount, "note", "notes"));
    }
    if (contextStats.linkedInMessageCount) {
      parts.push(
        `${plural(contextStats.linkedInMessageCount, "LinkedIn message", "LinkedIn messages")}`,
      );
    }
    if (contextStats.hasLinkedInSummary) {
      parts.push("LinkedIn profile");
    }
    if (contextStats.customFieldCount) {
      parts.push(plural(contextStats.customFieldCount, "custom field", "custom fields"));
    }
    if (contextStats.hasWebResearch) {
      parts.push("saved insights");
    }
    if (selectedSources.internet) {
      parts.push("live web");
    }

    return parts.length ? `Reading ${parts.join(" · ")}` : "No sources selected";
  }, [contextStats, selectedSources.internet]);

  const handleReset = () => {
    setMessages([]);
    setUsageState(createEmptyUsageState());
    setQuestion("");
    setError("");
    sessionStorage.removeItem(storageKey);
    sessionStorage.removeItem(usageStorageKey);
  };

  const sendQuestion = async (
    overrideQuestion?: string,
    historyOverride?: ContactQAMessage[],
  ) => {
    const prompt = (overrideQuestion ?? question).trim();
    if (!prompt || isSending || !hasContext || questionInFlightRef.current) return;
    questionInFlightRef.current = true;

    if (onBeforeQuestion) {
      let canAsk = false;
      try {
        canAsk = await onBeforeQuestion();
      } catch (creditError) {
        console.error("Contact Q&A credit check failed:", creditError);
      }

      if (!canAsk) {
        questionInFlightRef.current = false;
        return;
      }
    }

    const userMessage: ContactQAMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content: prompt,
      createdAt: new Date().toISOString(),
    };

    // Regenerating replays an earlier turn, so the history it sends stops short
    // of the answer being replaced. `messages` stays the restore point if the
    // request then fails.
    const history = historyOverride ?? messages;
    const restorePoint = messages;

    setMessages([...history, userMessage]);
    setQuestion("");
    setError("");
    setIsSending(true);
    setIsSourcesOpen(false);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/contact-qa/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          clientId,
          contactId: Number(contactId),
          question: prompt,
          messages: history.map(({ role, content }) => ({ role, content })),

          context: contactContext.contextPacket,
          contextSummary: contactContext.contextSummary,
          // The packet is already filtered; these tell the API how to talk about
          // what is missing, and whether it may reach for the web at all.
          sources: selectedSources,
          allowWebSearch: selectedSources.internet,
        }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        const backendError =
          json?.message ||
          json?.error ||
          json?.Message ||
          "Failed to get an answer for this contact.";
        throw new Error(backendError);
      }

      const answer = extractAssistantReply(json);
      if (!answer) {
        throw new Error("The contact Q&A endpoint returned an empty answer.");
      }

      const usage = extractUsage(json);

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: normalizeAssistantReply(answer),
          createdAt: new Date().toISOString(),
        },
      ]);

      setUsageState((prev) => ({
        last: usage,
        total: {
          questions: prev.total.questions + 1,
          promptTokens: prev.total.promptTokens + usage.promptTokens,
          completionTokens: prev.total.completionTokens + usage.completionTokens,
          totalTokens: prev.total.totalTokens + usage.totalTokens,
          cost: prev.total.cost + usage.cost,
        },
      }));

      await onQuestionSuccess?.();
    } catch (requestError: any) {
      // Stopping is the user's own doing, so it puts the question back in the
      // box without an error banner.
      const wasAborted = requestError?.name === "AbortError";

      if (!wasAborted) {
        console.error("Contact Q&A request failed:", requestError);
        setError(
          requestError?.message ||
            "Something went wrong while asking about this contact.",
        );
      }

      setMessages(restorePoint);
      setQuestion(prompt);
    } finally {
      abortControllerRef.current = null;
      questionInFlightRef.current = false;
      setIsSending(false);
    }
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
  };

  // Replays the last question against the current source selection, which is
  // the point: tick Internet research, regenerate, get a researched answer.
  const handleRegenerate = () => {
    if (isSending) return;

    let lastUserIndex = -1;
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index]?.role === "user") {
        lastUserIndex = index;
        break;
      }
    }

    if (lastUserIndex < 0) return;

    void sendQuestion(messages[lastUserIndex].content, messages.slice(0, lastUserIndex));
  };

  const handleCopy = async (message: ContactQAMessage) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      window.setTimeout(
        () =>
          setCopiedMessageId((current) =>
            current === message.id ? null : current,
          ),
        1600,
      );
    } catch (copyError) {
      console.warn("Copying the answer failed:", copyError);
    }
  };

  const handleQuestionKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendQuestion();
    }
  };

  const isAdmin = userRole === "ADMIN";

  return (
    <div className="contact-qa-shell">
      <header className="contact-qa-topbar">
        <div className="contact-qa-identity">
          <img src={witchLogo} alt="" className="contact-qa-identity-logo" />
          <div className="contact-qa-identity-text">
            <h3 className="contact-qa-identity-title">Ask about {contactFirstName}</h3>
            <p className="contact-qa-identity-meta">{contextSummaryLine}</p>
          </div>
        </div>

        <div className="contact-qa-topbar-actions">
          {isAdmin && (
            <div className="contact-qa-usage" ref={usageMenuRef}>
              <button
                type="button"
                className={`contact-qa-chip${isUsageOpen ? " open" : ""}`}
                onClick={() => setIsUsageOpen((open) => !open)}
                aria-expanded={isUsageOpen}
                title="Token usage and cost for this chat"
              >
                {usageState.total.questions} Q · ${usageState.total.cost.toFixed(4)}
                <ChevronDown size={14} aria-hidden="true" />
              </button>

              {isUsageOpen && (
                <div className="contact-qa-usage-menu">
                  <div className="contact-qa-usage-row">
                    <strong>Last</strong>
                    <span>In {usageState.last.promptTokens}</span>
                    <span>Out {usageState.last.completionTokens}</span>
                    <span>Tokens {usageState.last.totalTokens}</span>
                    <span>${usageState.last.cost.toFixed(6)}</span>
                  </div>
                  <div className="contact-qa-usage-row">
                    <strong>Total</strong>
                    <span>Q {usageState.total.questions}</span>
                    <span>In {usageState.total.promptTokens}</span>
                    <span>Out {usageState.total.completionTokens}</span>
                    <span>Tokens {usageState.total.totalTokens}</span>
                    <span>${usageState.total.cost.toFixed(6)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            className="contact-qa-newchat"
            style={{
              ...lessPriorityButtonStyle,
              padding: "7px 13px",
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 600,
            }}
            onClick={handleReset}
            disabled={isSending || messages.length === 0}
          >
            <MessageSquarePlus size={15} aria-hidden="true" />
            New chat
          </button>
        </div>
      </header>

      <div className="contact-qa-scroll">
        <div className="contact-qa-thread">
          {messages.length === 0 ? (
            <div className="contact-qa-welcome">
              <img src={witchLogo} alt="" className="contact-qa-welcome-logo" />
              <h4 className="contact-qa-welcome-title">
                Ask anything about {contactFirstName}
              </h4>
              <p className="contact-qa-welcome-text">
                Answers are grounded in the contact's profile, notes, emails and
                LinkedIn history — you pick which of those count, and whether the
                live web is allowed in.
              </p>

              <div className="contact-qa-cards">
                {suggestedQuestions.map((suggestion) => (
                  <button
                    key={suggestion.prompt}
                    type="button"
                    className="contact-qa-card"
                    onClick={() => sendQuestion(suggestion.prompt)}
                    disabled={loading || isSending || !hasContext}
                  >
                    <span className="contact-qa-card-title">{suggestion.title}</span>
                    <span className="contact-qa-card-text">{suggestion.prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className="contact-qa-turn user">
                  <div className="contact-qa-user-bubble">{message.content}</div>
                  <div className="contact-qa-turn-time">
                    {formatDateLabel(message.createdAt)}
                  </div>
                </div>
              ) : (
                <div
                  key={message.id}
                  ref={
                    message.id === latestAssistantMessageId
                      ? latestAssistantMessageRef
                      : null
                  }
                  className={`contact-qa-turn assistant${
                    message.id === latestAssistantMessageId ? " latest" : ""
                  }`}
                >
                  <img src={witchLogo} alt="" className="contact-qa-avatar" />

                  <div className="contact-qa-answer">
                    <div className="contact-qa-markdown">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>

                    <div className="contact-qa-turn-actions">
                      <button
                        type="button"
                        className="contact-qa-turn-action"
                        onClick={() => handleCopy(message)}
                      >
                        {copiedMessageId === message.id ? (
                          <>
                            <Check size={13} aria-hidden="true" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy size={13} aria-hidden="true" />
                            Copy
                          </>
                        )}
                      </button>

                      {message.id === latestAssistantMessageId && (
                        <button
                          type="button"
                          className="contact-qa-turn-action"
                          onClick={handleRegenerate}
                          disabled={isSending || !hasContext}
                          title="Ask the same question again with the sources ticked right now"
                        >
                          <RotateCcw size={13} aria-hidden="true" />
                          Regenerate
                        </button>
                      )}

                      <span className="contact-qa-turn-time">
                        {formatDateLabel(message.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ),
            )
          )}

          {isSending && (
            <div className="contact-qa-turn assistant">
              <img src={witchLogo} alt="" className="contact-qa-avatar" />
              <div className="contact-qa-answer">
                <div className="contact-qa-thinking">
                  <span className="contact-qa-typing" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  {selectedSources.internet
                    ? "Reading the selected sources and searching the web"
                    : "Reading the selected sources"}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      <div className="contact-qa-dock" ref={dockRef}>
        {error && <div className="contact-qa-error">{error}</div>}

        <div className="contact-qa-form">
          <textarea
            ref={textareaRef}
            className="contact-qa-textarea"
            value={question}
            rows={1}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleQuestionKeyDown}
            placeholder={
              !hasAnySourceSelected
                ? "Tick at least one source to ask about this contact..."
                : hasContext
                  ? `Ask anything about ${contactFirstName}...`
                  : "Contact context is still loading..."
            }
            disabled={loading || isSending || !hasContext}
          />

          <div className="contact-qa-actions">
            <div className="contact-qa-actions-left">
              <div className="contact-qa-sources" ref={sourcesMenuRef}>
                <button
                  type="button"
                  className={`contact-qa-tool${isSourcesOpen ? " open" : ""}`}
                  onClick={() => setIsSourcesOpen((open) => !open)}
                  aria-expanded={isSourcesOpen}
                  title="Choose which records the answer may use"
                >
                  <SlidersHorizontal size={15} aria-hidden="true" />
                  Sources
                  <span className="contact-qa-tool-count">
                    {selectedRecordSourceCount}/{RECORD_SOURCE_OPTIONS.length}
                  </span>
                </button>

                {isSourcesOpen && (
                  <div className="contact-qa-source-menu" aria-label="Answer from">
                    <div className="contact-qa-source-menu-head">
                      <span>Answer from</span>
                      <button
                        type="button"
                        onClick={() =>
                          setAllRecordSources(
                            selectedRecordSourceCount < RECORD_SOURCE_OPTIONS.length,
                          )
                        }
                      >
                        {selectedRecordSourceCount < RECORD_SOURCE_OPTIONS.length
                          ? "Select all"
                          : "Clear all"}
                      </button>
                    </div>

                    {RECORD_SOURCE_OPTIONS.map((option) => (
                      <label
                        key={option.key}
                        className={`contact-qa-source-row${
                          emptySources[option.key] ? " empty" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSources[option.key]}
                          onChange={() => toggleSource(option.key)}
                          disabled={isSending}
                        />
                        <span className="contact-qa-source-text">
                          <span className="contact-qa-source-label">
                            {option.label}
                            <span className="contact-qa-source-count">
                              {sourceSummaries[option.key]}
                            </span>
                          </span>
                          <span className="contact-qa-source-hint">{option.hint}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                className={`contact-qa-tool${selectedSources.internet ? " active" : ""}`}
                onClick={() => toggleSource("internet")}
                aria-pressed={selectedSources.internet}
                title={INTERNET_SOURCE_OPTION.hint}
              >
                <Globe size={15} aria-hidden="true" />
                Search web
              </button>
            </div>

            <div className="contact-qa-actions-right">
              <span className="contact-qa-mic" title="Voice">
                <Mic size={18} />
              </span>

              {isSending ? (
                <button
                  type="button"
                  className="contact-qa-send stop"
                  onClick={handleStop}
                  title="Stop generating"
                  aria-label="Stop generating"
                >
                  <Square size={13} aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  className="contact-qa-send"
                  onClick={() => sendQuestion()}
                  disabled={loading || !question.trim() || !hasContext}
                  title="Send"
                  aria-label="Send"
                >
                  <ArrowUp size={18} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="contact-qa-disclaimer">
          Enter to send · Shift + Enter for a new line
          {selectedSources.internet ? " · internet research is on" : ""}
        </p>
      </div>
    </div>
  );
};

export default ContactQA;
