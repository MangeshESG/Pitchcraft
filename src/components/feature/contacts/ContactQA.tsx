import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import API_BASE_URL from "../../../config";
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
  loading?: boolean;
}

const CONTACT_QA_STORAGE_PREFIX = "contact_qa_messages";
const CONTACT_QA_USAGE_STORAGE_PREFIX = "contact_qa_usage";

const SUGGESTED_QUESTIONS = [
  "What questions has this contact already been asked in previous emails?",
  "Summarize this contact's profile, notes, and outreach history.",
  "What would be the best follow-up question to ask next?",
  "List any signals of interest, objections, or gaps in the conversation so far.",
];

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
]);

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

  return parsed.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
  loading = false,
}) => {
  const storageKey = useMemo(
    () => buildStorageKey(clientId, contactId),
    [clientId, contactId],
  );
  const usageStorageKey = useMemo(
    () => buildUsageStorageKey(clientId, contactId),
    [clientId, contactId],
  );

  const [messages, setMessages] = useState<ContactQAMessage[]>(() =>
    readStoredMessages(storageKey),
  );
  const [usageState, setUsageState] = useState<ContactQAUsageState>(() =>
    readStoredUsage(usageStorageKey),
  );
  const [userRole, setUserRole] = useState<string>("");
  const [question, setQuestion] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const qaShellRef = useRef<HTMLDivElement | null>(null);
  const latestAssistantMessageRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const previousMessageCountRef = useRef(messages.length);

  const contactContext = useMemo(() => {
    const resolvedContact = contact || {};
    const fullName =
      resolvedContact.full_name ||
      [resolvedContact.first_name, resolvedContact.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();

    const notes: ContactQANote[] = sortByDate(
      (notesHistory || []).map((note: any) => ({
        id: note.id,
        createdAt: note.createdAt || note.date || "",
        isPinned: Boolean(note.isPin),
        isUsedForGeneration: Boolean(note.isUseInGenration),
        content: htmlToText(note.note || note.content),
      })),
      (note) => note.createdAt,
    );

    const emails: ContactQAEmail[] = sortByDate(
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

    const contextPacket = {
      schemaVersion: "contact_qa_v2",
      entityType: "prospect",
      answeringHints: [
        "Use the JSON structure as the source of truth.",
        "A single question may require evidence from multiple notes, emails, replies, or profile fields.",
        "Treat every note, email, reply, and activity event as a separate source record.",
        "When two records support the same answer, keep both records in mind together instead of choosing only one.",
      ],
      sourceCounts: {
        notes: notes.length,
        emails: emails.length,
        replies: emails.reduce(
          (total, email) => total + (email.replies?.length || 0),
          0,
        ),
        customFields: customFields.length,
      },
      contact: normalizedContact,
      linkedin: {
        sourceType: "LinkedIn",
        sourceId: "LINKEDIN-1",
        url: resolvedContact.linkedin_url || "",
        summary: normalizedContact.linkedinSummary,
      },
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

    return {
      contact: normalizedContact,
      notes,
      emails,
      contextPacket,
      contextSummary: buildContextSummary(contextPacket),
    };
  }, [contact, contactId, emailTimeline, notesHistory]);

  const contextStats = useMemo(() => {
    const replyCount = contactContext.emails.reduce(
      (total: number, email: any) => total + (email.replies?.length || 0),
      0,
    );

    return {
      noteCount: contactContext.notes.length,
      emailCount: contactContext.emails.length,
      replyCount,
      customFieldCount: contactContext.contact.customFields.length,
      hasLinkedInSummary: Boolean(contactContext.contact.linkedinSummary),
    };
  }, [contactContext]);

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
    const isAdminString = sessionStorage.getItem("isAdmin");
    const isAdmin = isAdminString === "true";
    setUserRole(isAdmin ? "ADMIN" : "USER");
  }, []);

  useEffect(() => {
    const previousMessageCount = previousMessageCountRef.current;
    const hasNewMessage = messages.length > previousMessageCount;
    const lastMessage = messages[messages.length - 1];

    if (hasNewMessage && lastMessage?.role === "assistant") {
      latestAssistantMessageRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } else if (hasNewMessage || isSending) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    previousMessageCountRef.current = messages.length;
  }, [isSending, messages]);

  useEffect(() => {
    const handleWindowScroll = () => {
      if (!qaShellRef.current) {
        setShowScrollTop(false);
        return;
      }

      const shellTop = qaShellRef.current.getBoundingClientRect().top + window.scrollY;
      setShowScrollTop(window.scrollY > shellTop + 280);
    };

    handleWindowScroll();
    window.addEventListener("scroll", handleWindowScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleWindowScroll);
    };
  }, []);

  const hasContext = Boolean(
    contactContext.contact.fullName ||
      contactContext.contact.email ||
      contactContext.notes.length ||
      contactContext.emails.length ||
      contactContext.contact.linkedinSummary ||
      contactContext.contact.customFields.length,
  );

  const handleReset = () => {
    setMessages([]);
    setUsageState(createEmptyUsageState());
    setQuestion("");
    setError("");
    sessionStorage.removeItem(storageKey);
    sessionStorage.removeItem(usageStorageKey);
  };

  const sendQuestion = async (overrideQuestion?: string) => {
    const prompt = (overrideQuestion ?? question).trim();
    if (!prompt || isSending || !hasContext) return;

    const userMessage: ContactQAMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content: prompt,
      createdAt: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setQuestion("");
    setError("");
    setIsSending(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/contact-qa/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          clientId,
          contactId: Number(contactId),
          modelName: "gpt-4o-mini",
          question: prompt,
          messages: messages.map(({ role, content }) => ({ role, content })),

          context: contactContext.contextPacket,
          contextSummary: contactContext.contextSummary,
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
    } catch (requestError: any) {
      console.error("Contact Q&A request failed:", requestError);
      setError(
        requestError?.message ||
          "Something went wrong while asking about this contact.",
      );
      setMessages((prev) => prev.filter((message) => message.id !== userMessage.id));
      setQuestion(prompt);
    } finally {
      setIsSending(false);
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

  const handleScrollToTop = () => {
    qaShellRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const isAdmin = userRole === "ADMIN";

  return (
    <div ref={qaShellRef} className="contact-qa-shell">
      <div className="contact-qa-header">
        <div>
          <h2 className="contact-qa-title">Q&amp;A</h2>
          <p className="contact-qa-subtitle">
            Ask targeted questions about this contact and get answers grounded in
            the profile, custom attributes, LinkedIn summary, notes, sent
            emails, replies, and activity already stored in the CRM.
          </p>
          <div className="contact-qa-badges">
            <span className="contact-qa-badge">
              Contact: {contactContext.contact.fullName || "Unknown contact"}
            </span>
            <span className="contact-qa-badge">
              Company: {contactContext.contact.companyName || "Unknown company"}
            </span>
            <span className="contact-qa-badge">
              Notes: {contextStats.noteCount}
            </span>
            <span className="contact-qa-badge">
              Emails: {contextStats.emailCount}
            </span>
            <span className="contact-qa-badge">
              Replies: {contextStats.replyCount}
            </span>
            <span className="contact-qa-badge">
              Custom fields: {contextStats.customFieldCount}
            </span>
            <span className="contact-qa-badge">
              LinkedIn: {contextStats.hasLinkedInSummary ? "Included" : "Not available"}
            </span>
          </div>
        </div>

        <div className="contact-qa-header-actions">
          {isAdmin && (
            <div className="contact-qa-usage-panel">
              <div className="contact-qa-usage-row">
                <strong>Last:</strong>
                <span>In {usageState.last.promptTokens}</span>
                <span>Out {usageState.last.completionTokens}</span>
                <span>Tokens {usageState.last.totalTokens}</span>
                <span>💲{usageState.last.cost.toFixed(6)}</span>
              </div>
              <div className="contact-qa-usage-row">
                <strong>Total:</strong>
                <span>Q {usageState.total.questions}</span>
                <span>In {usageState.total.promptTokens}</span>
                <span>Out {usageState.total.completionTokens}</span>
                <span>Tokens {usageState.total.totalTokens}</span>
                <span>💲{usageState.total.cost.toFixed(6)}</span>
              </div>
            </div>
          )}

          <button
            type="button"
            className="contact-qa-reset"
            onClick={handleReset}
            disabled={isSending}
          >
            Reset chat
          </button>
        </div>
      </div>

      <div className="contact-qa-board">


        <div className="contact-qa-messages">
          {messages.length === 0 ? (
            <div className="contact-qa-empty">
              <div className="contact-qa-empty-card">
                <h3>Start a contact-specific conversation</h3>
                <p>
                  Use this space to ask what has already been asked, what the
                  contact seems interested in, what has been promised, or what
                  the best next question should be based on the full contact
                  history.
                </p>

                <div className="contact-qa-suggestions">
                  {SUGGESTED_QUESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="contact-qa-suggestion"
                      onClick={() => sendQuestion(suggestion)}
                      disabled={loading || isSending || !hasContext}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                ref={
                  message.role === "assistant" &&
                  message.id === latestAssistantMessageId
                    ? latestAssistantMessageRef
                    : null
                }
                className={`contact-qa-row ${message.role}`}
              >
                <div className={`contact-qa-bubble ${message.role}`}>
                  {message.role === "assistant" ? (
                    <div className="contact-qa-markdown">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    message.content
                  )}
                  <div className="contact-qa-meta">
                    {message.role === "user" ? "You" : "Contact Q&A"} ·{" "}
                    {formatDateLabel(message.createdAt)}
                  </div>
                </div>
              </div>
            ))
          )}

          {isSending && (
            <div className="contact-qa-row assistant">
              <div className="contact-qa-bubble assistant">
                Looking through the contact profile, notes, and email history...
                <div className="contact-qa-meta">Generating answer</div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {error && <div className="contact-qa-error">{error}</div>}

        <div className="contact-qa-composer">
          <div className="contact-qa-form">
            <textarea
              className="contact-qa-textarea"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleQuestionKeyDown}
              placeholder={
                hasContext
                  ? "Ask about previous questions, objections, intent, next best question, or anything else grounded in this contact's history..."
                  : "Contact context is still loading..."
              }
              disabled={loading || isSending || !hasContext}
            />

            <div className="contact-qa-actions">
              <div className="contact-qa-hint">
                Press Enter to send. Use Shift + Enter for a new line.
              </div>

              <button
                type="button"
                className="contact-qa-send"
                onClick={() => sendQuestion()}
                disabled={loading || isSending || !question.trim() || !hasContext}
              >
                {isSending && <span className="contact-qa-loader" />}
                Ask 
              </button>
            </div>
          </div>
        </div>
      </div>

      {showScrollTop && (
        <button
          type="button"
          className="contact-qa-scroll-top"
          onClick={handleScrollToTop}
          aria-label="Scroll to top of Q&A"
        >
          ↑
        </button>
      )}
    </div>
  );
};

export default ContactQA;
