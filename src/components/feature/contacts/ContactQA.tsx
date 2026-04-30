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

  const [messages, setMessages] = useState<ContactQAMessage[]>(() =>
    readStoredMessages(storageKey),
  );
  const [question, setQuestion] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const qaShellRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const contactContext = useMemo(() => {
    const resolvedContact = contact || {};
    const fullName =
      resolvedContact.full_name ||
      [resolvedContact.first_name, resolvedContact.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();

    const notes = (notesHistory || []).map((note: any) => ({
      id: note.id,
      createdAt: note.createdAt || note.date,
      isPinned: Boolean(note.isPin),
      isUsedForGeneration: Boolean(note.isUseInGenration),
      content: htmlToText(note.note || note.content),
    }));

    const emails: ContactQAEmail[] = (emailTimeline || []).map((email: any) => ({
      trackingId: email.trackingId,
      source: email.source || "",
      sentAt: email.sentAt || email.date,
      from: email.senderEmailId || email.fromEmail || "",
      to: email.toEmail || resolvedContact.email || "",
      subject: email.subject || "",
      body: htmlToText(email.body || email.email_body),
      events: Array.isArray(email.events)
        ? email.events.map((event: any) => ({
            eventType: event.eventType,
            eventAt: event.eventAt,
            targetUrl: event.targetUrl || "",
          }))
        : [],
      replies: Array.isArray(email.replies)
        ? email.replies.map((reply: any) => ({
            from: reply.fromEmail || reply.senderEmailId || "",
            subject: reply.subject || "",
            date: reply.date || reply.sentAt,
            body: htmlToText(reply.body || reply.replyBody || reply.message),
          }))
        : [],
    }));

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

    const summaryLines = [
      "CONTACT PROFILE",
      `Full Name: ${fullName || "Unknown"}`,
      `Email: ${resolvedContact.email || "Unknown"}`,
      `Company: ${resolvedContact.company_name || "Unknown"}`,
      `Job Title: ${resolvedContact.job_title || "Unknown"}`,
      `Location: ${resolvedContact.country_or_address || "Unknown"}`,
      `Website: ${resolvedContact.website || "Unknown"}`,
      `LinkedIn URL: ${resolvedContact.linkedin_url || "Unknown"}`,
      `Company Telephone: ${resolvedContact.companyTelephone || "Unknown"}`,
      `Company Size: ${resolvedContact.companyEmployeeCount || "Unknown"}`,
      `Industry: ${resolvedContact.companyIndustry || "Unknown"}`,
      `Contact Created At: ${formatDateLabel(resolvedContact.contactCreatedAt || resolvedContact.created_at) || "Unknown"}`,
      "",
      "LINKEDIN SUMMARY",
      htmlToText(resolvedContact.linkedIninformation || resolvedContact.linkedin_info) || "No LinkedIn summary available.",
      "",
      "CUSTOM FIELDS",
      customFields.length > 0
        ? customFields
            .map(
              (field, index) =>
                `Field ${index + 1} - ${field.label}: ${field.value}`,
            )
            .join("\n")
        : "No custom fields available.",
      "",
      "NOTES",
      notes.length > 0
        ? notes
            .map(
              (note, index) =>
                `Note ${index + 1} (${formatDateLabel(note.createdAt) || "Unknown date"}${note.isPinned ? ", pinned" : ""}${note.isUsedForGeneration ? ", used for generation" : ""})\n${note.content || "No note content"}`,
            )
            .join("\n\n")
        : "No notes available.",
      "",
      "EMAIL HISTORY",
      emails.length > 0
        ? emails
            .map((email: ContactQAEmail, index: number) => {
              const replyText =
                email.replies.length > 0
                  ? email.replies
                      .map(
                        (reply: ContactQAEmailReply, replyIndex: number) =>
                          `Reply ${replyIndex + 1} (${formatDateLabel(reply.date) || "Unknown date"})\nFrom: ${reply.from || "Unknown"}\nSubject: ${reply.subject || "No subject"}\n${reply.body || "No reply body"}`,
                      )
                      .join("\n\n")
                  : "No replies.";

              const eventText =
                email.events.length > 0
                  ? email.events
                      .map(
                        (event: ContactQAEmailEvent, eventIndex: number) =>
                          `Event ${eventIndex + 1}: ${event.eventType || "Unknown"} at ${formatDateLabel(event.eventAt) || "Unknown date"}${event.targetUrl ? ` (${event.targetUrl})` : ""}`,
                      )
                      .join("\n")
                  : "No tracked events.";

              return `Email ${index + 1} (${formatDateLabel(email.sentAt) || "Unknown date"})\nFrom: ${email.from || "Unknown"}\nTo: ${email.to || "Unknown"}\nSource: ${email.source || "Unknown"}\nSubject: ${email.subject || "No subject"}\nBody:\n${email.body || "No email body"}\n\nEvents:\n${eventText}\n\nReplies:\n${replyText}`;
            })
            .join("\n\n--------------------\n\n")
        : "No email history available.",
    ];

    return {
      contact: {
        id: resolvedContact.id || Number(contactId),
        fullName,
        firstName: resolvedContact.first_name || "",
        lastName: resolvedContact.last_name || "",
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
        customFields,
      },
      notes,
      emails,
      contextSummary: summaryLines.join("\n"),
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

  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

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
    setQuestion("");
    setError("");
    sessionStorage.removeItem(storageKey);
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

          context: contactContext,
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

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: answer,
          createdAt: new Date().toISOString(),
        },
      ]);
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

        <button
          type="button"
          className="contact-qa-reset"
          onClick={handleReset}
          disabled={isSending}
        >
          Reset chat
        </button>
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
              <div key={message.id} className={`contact-qa-row ${message.role}`}>
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
