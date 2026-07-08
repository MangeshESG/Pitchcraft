import React, { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faBolt,
  faPaperPlane,
  faBold,
  faItalic,
  faUnderline,
  faStrikethrough,
  faListUl,
  faListOl,
  faAlignLeft,
  faLink,
  faImage,
  faUndo,
  faRedo,
  faInfoCircle,
} from "@fortawesome/free-solid-svg-icons";

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
  onGenerate: (blueprintId: number) => Promise<{ emailBody: string; emailSubject: string }>;
  onSend: (payload: { emailSubject: string; emailBody: string; bccEmail: string }) => Promise<boolean>;
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

const toolbarButtonStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  border: "none",
  background: "transparent",
  color: "#1f2937",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const ContactComposeEmailPopup: React.FC<ContactComposeEmailPopupProps> = ({
  isOpen,
  onClose,
  blueprints,
  fromOptions,
  selectedFromId,
  onFromChange,
  toEmail,
  onGenerate,
  onSend,
  isSending,
}) => {
  const [selectedBlueprintId, setSelectedBlueprintId] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [showBcc, setShowBcc] = useState(false);
  const [bccEmail, setBccEmail] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedBlueprintId("");
      setEmailBody("");
      setEmailSubject("");
      setShowBcc(false);
      setBccEmail("");
      setIsGenerating(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== emailBody) {
      editorRef.current.innerHTML = emailBody || "";
    }
  }, [emailBody]);

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
      setEmailBody(generatedEmail.emailBody || "");
      setEmailSubject(generatedEmail.emailSubject || "");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if (isSending) return;
    const sent = await onSend({
      emailSubject,
      emailBody,
      bccEmail: showBcc ? bccEmail : "",
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
            Compose Email
          </button>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!selectedBlueprintId || isGenerating}
              style={{
                height: 38,
                padding: "0 18px",
                borderRadius: 6,
                border: (!selectedBlueprintId || isGenerating) ? "1px solid #d1d5db" : "1px solid #178d2e",
                background: (!selectedBlueprintId || isGenerating) ? "#e5e7eb" : "#118a27",
                color: (!selectedBlueprintId || isGenerating) ? "#9ca3af" : "#fff",
                fontSize: 13,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
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
                height: 38,
                padding: "0 22px",
                borderRadius: 6,
                border: isSending ? "1px solid #d1d5db" : "1px solid #178d2e",
                background: isSending ? "#e5e7eb" : "#118a27",
                color: isSending ? "#9ca3af" : "#fff",
                fontSize: 13,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                cursor: isSending ? "not-allowed" : "pointer",
              }}
            >
              <FontAwesomeIcon icon={faPaperPlane} />
              {isSending ? "Sending..." : "Send"}
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
            <label style={labelStyle}>Select Blueprint</label>
            <select
              value={selectedBlueprintId}
              onChange={(event) => setSelectedBlueprintId(event.target.value)}
              style={{ ...inputStyle, width: 390 }}
            >
              <option value="">Select blueprint...</option>
              {blueprints.map((blueprint) => (
                <option key={blueprint.id} value={blueprint.id}>
                  {blueprint.templateName}
                </option>
              ))}
            </select>
            <span style={{ color: "#64748b", fontSize: 12 }}>
              Choose a blueprint to generate a personalized email.
            </span>
            <FontAwesomeIcon icon={faInfoCircle} style={{ color: "#64748b", fontSize: 13 }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
            <label style={labelStyle}>From</label>
            <select
              value={selectedFromId}
              onChange={(event) => onFromChange(event.target.value)}
              style={{ ...inputStyle, flex: 1 }}
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
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
            <label style={labelStyle}>To</label>
            <input
              value={toEmail}
              readOnly
              style={{
                ...inputStyle,
                flex: 1,
                background: "#f8fafc",
                color: "#475569",
                cursor: "not-allowed",
              }}
              placeholder="Contact email not available"
            />
            <button
              type="button"
              onClick={() => setShowBcc((current) => !current)}
              style={{ border: "none", background: "transparent", color: "#16822f", fontWeight: 700, cursor: "pointer" }}
            >
              {showBcc ? "Hide Bcc" : "Bcc"}
            </button>
          </div>

          {showBcc && (
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
              <label style={labelStyle}>Bcc</label>
              <input
                value={bccEmail}
                onChange={(event) => setBccEmail(event.target.value)}
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Enter Bcc email address..."
              />
              <button
                type="button"
                onClick={() => {
                  setShowBcc(false);
                  setBccEmail("");
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

          <div style={{ border: "1px solid #d8dee8", borderRadius: 6, overflow: "hidden" }}>
            <div
              style={{
                minHeight: 44,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "0 12px",
                borderBottom: "1px solid #d8dee8",
                background: "#f8fafc",
              }}
            >
              <select style={{ height: 34, border: "none", background: "transparent", fontSize: 13, color: "#111827", width: 110 }}>
                <option>Normal</option>
              </select>
              <button type="button" style={toolbarButtonStyle}><FontAwesomeIcon icon={faBold} /></button>
              <button type="button" style={toolbarButtonStyle}><FontAwesomeIcon icon={faItalic} /></button>
              <button type="button" style={toolbarButtonStyle}><FontAwesomeIcon icon={faUnderline} /></button>
              <button type="button" style={toolbarButtonStyle}><FontAwesomeIcon icon={faStrikethrough} /></button>
              <span style={{ width: 1, height: 20, background: "#e2e8f0" }} />
              <button type="button" style={toolbarButtonStyle}><FontAwesomeIcon icon={faListUl} /></button>
              <button type="button" style={toolbarButtonStyle}><FontAwesomeIcon icon={faListOl} /></button>
              <button type="button" style={toolbarButtonStyle}><FontAwesomeIcon icon={faAlignLeft} /></button>
              <button type="button" style={toolbarButtonStyle}><FontAwesomeIcon icon={faLink} /></button>
              <button type="button" style={toolbarButtonStyle}><FontAwesomeIcon icon={faImage} /></button>
              <button type="button" style={toolbarButtonStyle}><FontAwesomeIcon icon={faUndo} /></button>
              <button type="button" style={toolbarButtonStyle}><FontAwesomeIcon icon={faRedo} /></button>
            </div>

            <div
              ref={editorRef}
              className="contact-compose-email-body"
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Write your email here..."
              onInput={(event) => setEmailBody(event.currentTarget.innerHTML)}
              onBlur={(event) => setEmailBody(event.currentTarget.innerHTML)}
              style={{
                width: "100%",
                minHeight: 360,
                maxHeight: 360,
                border: "none",
                outline: "none",
                overflowY: "auto",
                overflowX: "hidden",
                padding: 22,
                color: "#334155",
                fontSize: 14,
                lineHeight: 1.5,
                boxSizing: "border-box",
                wordBreak: "break-word",
              }}
            />

            <div
              style={{
                borderTop: "1px solid #e5e7eb",
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                padding: "0 16px",
                color: "#64748b",
                fontSize: 12,
              }}
            >
              {plainBody.trim() ? plainBody.trim().split(/\s+/).length : 0} words
            </div>
          </div>

          <style>
            {`
              .contact-compose-email-body:empty:before {
                content: attr(data-placeholder);
                color: #94a3b8;
              }
              .contact-compose-email-body img {
                max-width: 100%;
                height: auto;
              }
              .contact-compose-email-body table {
                max-width: 100%;
              }
              .contact-compose-email-body p {
                margin: 0 0 10px;
              }
            `}
          </style>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 22,
              color: "#64748b",
              fontSize: 13,
            }}
          >
            <span>
              <FontAwesomeIcon icon={faBolt} style={{ color: "#16822f", marginRight: 8 }} />
              Use AI to generate content based on the selected blueprint.
            </span>
            <span>Characters: {plainBody.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactComposeEmailPopup;
