import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faBolt,
  faPaperPlane,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { defaultButtonStyle, lessPriorityButtonStyle } from "../../../styles/buttonStyles";
import RichTextEditor from "../../common/RTEEditor";

interface ContactComposeEmailPopupProps {
  isOpen: boolean;
  onClose: () => void;
  blueprints: Array<{ id: number; templateName: string }>;
  fromOptions: Array<{
    id?: number;
    outboxId?: number;
    OutboxId?: number;
    username?: string;
    emailAddress?: string;
    fromEmail?: string;
    email?: string;
    type?: string;
    smtpType?: string;
  }>;
  selectedFromId: string;
  onFromChange: (value: string) => void;
  toEmail: string;
  signatureHtml: string;
  isSignatureLoading?: boolean;
  onGenerate: (blueprintId: number) => Promise<{ emailBody: string; emailSubject: string }>;
  onSend: (payload: {
    emailSubject: string;
    emailBody: string;
    ccEmails: string[] | null;
    bccEmails: string[] | null;
  }) => Promise<boolean>;
  isSending: boolean;
}

const inputStyle: React.CSSProperties = {
  height: 42,
  border: "1px solid #d8dee8",
  borderRadius: 6,
  padding: "0 14px",
  fontSize: 13,
  color: "#111827",
  background: "#fff",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  width: 120,
  fontSize: 13,
  fontWeight: 700,
  color: "#111827",
};

const compactFieldStyle: React.CSSProperties = {
  width: 390,
  minWidth: 390,
  maxWidth: 390,
  flex: "0 0 390px",
};

export const parseRecipientInput = (value: string) =>
  value
    .split(/[,\n;]/)
    .map((email) => email.trim())
    .filter(Boolean);

export const mergeRecipients = (current: string[], next: string[]) => {
  const seen = new Set(current.map((email) => email.toLowerCase()));
  const merged = [...current];
  next.forEach((email) => {
    if (!seen.has(email.toLowerCase())) {
      seen.add(email.toLowerCase());
      merged.push(email);
    }
  });
  return merged;
};

interface RecipientChipInputProps {
  recipients: string[];
  draft: string;
  onRecipientsChange: (recipients: string[]) => void;
  onDraftChange: (draft: string) => void;
  placeholder: string;
  containerStyle?: React.CSSProperties;
}

export const RecipientChipInput: React.FC<RecipientChipInputProps> = ({
  recipients,
  draft,
  onRecipientsChange,
  onDraftChange,
  placeholder,
  containerStyle,
}) => {
  const commitDraft = () => {
    const nextRecipients = parseRecipientInput(draft);
    if (!nextRecipients.length) {
      onDraftChange("");
      return;
    }
    onRecipientsChange(mergeRecipients(recipients, nextRecipients));
    onDraftChange("");
  };

  const removeRecipient = (recipientToRemove: string) => {
    onRecipientsChange(recipients.filter((recipient) => recipient !== recipientToRemove));
  };

  return (
    <div
      style={{
        ...compactFieldStyle,
        minHeight: 42,
        border: "1px solid #d8dee8",
        borderRadius: 6,
        padding: "4px 8px",
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 6,
        background: "#fff",
        ...containerStyle,
      }}
      onClick={(event) => {
        const input = event.currentTarget.querySelector("input");
        input?.focus();
      }}
    >
      {recipients.map((recipient) => (
        <span
          key={recipient}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            maxWidth: "100%",
            border: "1px solid #c7d0dc",
            borderRadius: 999,
            padding: "5px 9px",
            background: "#f8fafc",
            color: "#0f172a",
            fontSize: 13,
            lineHeight: 1,
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {recipient}
          </span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              removeRecipient(recipient);
            }}
            style={{
              border: "none",
              background: "transparent",
              color: "#334155",
              cursor: "pointer",
              padding: 0,
              lineHeight: 1,
              display: "inline-flex",
            }}
            aria-label={`Remove ${recipient}`}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(event) => {
          const value = event.target.value;
          if (/[,\n;]/.test(value)) {
            onRecipientsChange(mergeRecipients(recipients, parseRecipientInput(value)));
            onDraftChange("");
            return;
          }
          onDraftChange(value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === "Tab") {
            if (draft.trim()) {
              event.preventDefault();
              commitDraft();
            }
          } else if (event.key === "Backspace" && !draft && recipients.length) {
            onRecipientsChange(recipients.slice(0, -1));
          }
        }}
        onBlur={commitDraft}
        style={{
          flex: "1 1 120px",
          minWidth: 90,
          border: "none",
          outline: "none",
          height: 28,
          fontSize: 13,
          color: "#111827",
        }}
        placeholder={recipients.length ? "" : placeholder}
      />
    </div>
  );
};

const ContactComposeEmailPopup: React.FC<ContactComposeEmailPopupProps> = ({
  isOpen,
  onClose,
  blueprints,
  fromOptions,
  selectedFromId,
  onFromChange,
  toEmail,
  signatureHtml,
  isSignatureLoading = false,
  onGenerate,
  onSend,
  isSending,
}) => {
  const [selectedBlueprintId, setSelectedBlueprintId] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [ccEmailDraft, setCcEmailDraft] = useState("");
  const [showBcc, setShowBcc] = useState(false);
  const [bccEmails, setBccEmails] = useState<string[]>([]);
  const [bccEmailDraft, setBccEmailDraft] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGeneratedBody, setHasGeneratedBody] = useState(false);
  const signatureSelector = "[data-compose-email-signature]";

  const getComposeSignatureBlock = (signature: string) =>
    signature
      ? `<br/><br/><div data-compose-email-signature="true">${signature}</div>`
      : "";

  const removeComposeSignature = (html: string) => {
    if (!html) return "";
    if (typeof document === "undefined") {
      return html;
    }
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    wrapper.querySelectorAll(signatureSelector).forEach((node) => node.remove());
    return wrapper.innerHTML.replace(/(?:<br\s*\/?>|\s)+$/gi, "");
  };

  const appendComposeSignature = (draftHtml: string, signature: string) => {
    const draftWithoutSignature = removeComposeSignature(draftHtml || "");
    return `${draftWithoutSignature}${getComposeSignatureBlock(signature)}`;
  };

  useEffect(() => {
    if (!isOpen) {
      setSelectedBlueprintId("");
      setEmailBody("");
      setEmailSubject("");
      setShowCc(false);
      setCcEmails([]);
      setCcEmailDraft("");
      setShowBcc(false);
      setBccEmails([]);
      setBccEmailDraft("");
      setIsGenerating(false);
      setHasGeneratedBody(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || hasGeneratedBody) return;

    setEmailBody((currentBody) => appendComposeSignature(currentBody, signatureHtml));
  }, [isOpen, signatureHtml, hasGeneratedBody]);

  const getPlainBody = (html: string) => {
    if (!html) return "";
    if (typeof document === "undefined") {
      return html.replace(/<[^>]*>/g, " ");
    }
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  };

  const plainBody = getPlainBody(emailBody);
  const getFromOptionId = (fromOption: ContactComposeEmailPopupProps["fromOptions"][number]) =>
    fromOption.id ?? fromOption.outboxId ?? fromOption.OutboxId;
  const getFromOptionLabel = (fromOption: ContactComposeEmailPopupProps["fromOptions"][number]) =>
    fromOption.username || fromOption.emailAddress || fromOption.fromEmail || fromOption.email || "";
  const visibleFromOptions = fromOptions.filter((fromOption) => {
    const optionId = getFromOptionId(fromOption);
    const optionLabel = getFromOptionLabel(fromOption).trim();
    return optionId !== undefined && optionId !== null && optionLabel;
  });

  const handleGenerate = async () => {
    if (!selectedBlueprintId || isGenerating) return;

    setIsGenerating(true);
    try {
      const generatedEmail = await onGenerate(Number(selectedBlueprintId));
      setHasGeneratedBody(true);
      setEmailBody(generatedEmail.emailBody || "");
      setEmailSubject(generatedEmail.emailSubject || "");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if (isSending) return;
    const finalCcEmails = showCc ? mergeRecipients(ccEmails, parseRecipientInput(ccEmailDraft)) : [];
    const finalBccEmails = showBcc ? mergeRecipients(bccEmails, parseRecipientInput(bccEmailDraft)) : [];
    const sent = await onSend({
      emailSubject,
      emailBody,
      ccEmails: finalCcEmails.length ? finalCcEmails : null,
      bccEmails: finalBccEmails.length ? finalBccEmails : null,
    });

    if (sent) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1200,
        background: "rgba(15, 23, 42, 0.36)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(1180px, 96vw)",
          maxHeight: "92vh",
          overflow: "auto",
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 24px 70px rgba(15, 23, 42, 0.22)",
          padding: 24,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 28,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              border: "none",
              background: "transparent",
              color: "#111827",
              fontSize: 18,
              fontWeight: 700,
              cursor: "pointer",
              padding: 0,
            }}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            Compose email
          </button>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!selectedBlueprintId || isGenerating}
              style={{
                ...lessPriorityButtonStyle,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                opacity: (!selectedBlueprintId || isGenerating) ? 0.6 : 1,
                cursor: (!selectedBlueprintId || isGenerating) ? "not-allowed" : "pointer",
              }}
            >
              <FontAwesomeIcon icon={faBolt} />
              {isGenerating ? "Generating..." : "Generate"}
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending}
              style={{
                ...defaultButtonStyle,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                opacity: isSending ? 0.6 : 1,
                cursor: isSending ? "not-allowed" : "pointer",
              }}
            >
              <FontAwesomeIcon icon={faPaperPlane} />
              {isSending ? "Sending..." : "Send"}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close compose"
              title="Close"
              style={{
                width: 38,
                height: 38,
                border: "1px solid #d8dee8",
                borderRadius: 8,
                background: "#fff",
                color: "#64748b",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </div>

        <div
          style={{
            border: "1px solid #e0e6ef",
            borderRadius: 8,
            padding: 24,
            background: "#fff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
            <label style={labelStyle}>Select blueprint</label>
            <select
              value={selectedBlueprintId}
              onChange={(event) => setSelectedBlueprintId(event.target.value)}
              style={{ ...inputStyle, width: 390 }}
            >
              <option value="">Select blueprint (optional)...</option>
              {blueprints.map((blueprint) => (
                <option key={blueprint.id} value={blueprint.id}>
                  {blueprint.templateName}
                </option>
              ))}
            </select>
            </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
            <label style={labelStyle}>From</label>
            <select
              value={selectedFromId}
              onChange={(event) => onFromChange(event.target.value)}
              style={{ ...inputStyle, ...compactFieldStyle }}
            >
              <option value="">Select from email...</option>
              {visibleFromOptions.map((fromOption) => {
                const optionId = getFromOptionId(fromOption);
                return (
                <option key={optionId} value={optionId}>
                  {getFromOptionLabel(fromOption)}
                </option>
                );
              })}
            </select>
            {isSignatureLoading && (
              <span style={{ color: "#64748b", fontSize: 12, whiteSpace: "nowrap" }}>
                Loading signature...
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
            <label style={labelStyle}>To</label>
            <input
              value={toEmail}
              readOnly
              style={{
                ...inputStyle,
                ...compactFieldStyle,
                background: "#f8fafc",
                color: "#475569",
                cursor: "not-allowed",
              }}
              placeholder="Contact email not available"
            />
            {!showCc && (
              <button
                type="button"
                onClick={() => setShowCc(true)}
                style={{ border: "none", background: "transparent", color: "#16822f", fontWeight: 700, cursor: "pointer" }}
              >
                Cc
              </button>
            )}
            {!showBcc && (
              <button
                type="button"
                onClick={() => setShowBcc(true)}
                style={{ border: "none", background: "transparent", color: "#16822f", fontWeight: 700, cursor: "pointer" }}
              >
                Bcc
              </button>
            )}
          </div>

          {showCc && (
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
              <label style={labelStyle}>Cc</label>
              <RecipientChipInput
                recipients={ccEmails}
                draft={ccEmailDraft}
                onRecipientsChange={setCcEmails}
                onDraftChange={setCcEmailDraft}
                placeholder="Enter Cc email..."
              />
              <button
                type="button"
                onClick={() => {
                  setShowCc(false);
                  setCcEmails([]);
                  setCcEmailDraft("");
                }}
                style={{ border: "none", background: "transparent", color: "#64748b", fontWeight: 700, cursor: "pointer" }}
              >
                X
              </button>
            </div>
          )}

          {showBcc && (
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
              <label style={labelStyle}>Bcc</label>
              <RecipientChipInput
                recipients={bccEmails}
                draft={bccEmailDraft}
                onRecipientsChange={setBccEmails}
                onDraftChange={setBccEmailDraft}
                placeholder="Enter Bcc email..."
              />
              <button
                type="button"
                onClick={() => {
                  setShowBcc(false);
                  setBccEmails([]);
                  setBccEmailDraft("");
                }}
                style={{ border: "none", background: "transparent", color: "#64748b", fontWeight: 700, cursor: "pointer" }}
              >
                X
              </button>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <label style={labelStyle}>Subject</label>
            <input
              value={emailSubject}
              onChange={(event) => setEmailSubject(event.target.value)}
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Enter subject..."
            />
          </div>

          <div>
            <RichTextEditor value={emailBody} onChange={setEmailBody} height={360} />
            <div
              style={{
                minHeight: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "4px 12px 0",
                color: "#64748b",
                fontSize: 12,
              }}
            >
              <span>Characters: {plainBody.length}</span>
              <span>{plainBody.trim() ? plainBody.trim().split(/\s+/).length : 0} words</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactComposeEmailPopup;
