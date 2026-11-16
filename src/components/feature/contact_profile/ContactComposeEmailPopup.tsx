import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faBolt,
  faPaperPlane,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import RichTextEditor from "../../common/RTEEditor";
import Modal from "../../common/Modal";
import { EmailHighlight, parseEmailHighlights } from "../../../utils/emailHighlights";
import { EmailOption } from "../../../utils/emailOptions";
import EmailOptionPicker from "../../common/EmailOptionPicker";
import { buildManualInstruction } from "../../../utils/manualInstruction";
import "./ContactComposeEmailPopup.css";

interface ContactComposeEmailPopupProps {
  isOpen: boolean;
  onClose: () => void;
  blueprints: Array<{ id: number; templateName: string; templateDefinitionName?: string | null }>;
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
  /** `manualInstruction` is the one-off steer typed in the editor's
   *  instruction column; it fills {manual_instruction} in the prompt. */
  onGenerate: (blueprintId: number, manualInstruction?: string) => Promise<{
    emailBody: string;
    emailSubject: string;
    finalPrompt?: string;
    webSearchData?: string;
    emails?: string;
    notes?: string;
    professionalSummary?: string;
    /** Highlight records as the generator returned them, raw or JSON. */
    emailHighlights?: unknown;
    /**
     * Every email this generation produced. One entry when the blueprint
     * asks for a single email, several when it asks for a choice; the first
     * is the one above and the one already saved to the contact.
     */
    emailOptions?: EmailOption[];
  }>;
  /**
   * Stores an option the user stepped to, replacing the first one the
   * generation saved. Omit to hide the Save button on the option bar.
   */
  onSaveOption?: (payload: {
    emailSubject: string;
    emailBody: string;
    emailHighlights: EmailHighlight[];
  }) => Promise<boolean>;
  onSend: (payload: {
    emailSubject: string;
    emailBody: string;
    ccEmails: string[] | null;
    bccEmails: string[] | null;
  }) => Promise<boolean>;
  isSending: boolean;
}

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
  /** Static label rendered inside the panel (e.g. "To") so a filled field stays identifiable. */
  prefixLabel?: string;
  /** Renders the addresses as a completed panel — nothing to type or remove. */
  readOnly?: boolean;
  /** Caps how many addresses can be entered (Forward accepts a single recipient). */
  maxRecipients?: number;
}

export const RecipientChipInput: React.FC<RecipientChipInputProps> = ({
  recipients,
  draft,
  onRecipientsChange,
  onDraftChange,
  placeholder,
  containerStyle,
  prefixLabel,
  readOnly = false,
  maxRecipients,
}) => {
  const applyLimit = (nextRecipients: string[]) =>
    maxRecipients === undefined ? nextRecipients : nextRecipients.slice(0, maxRecipients);
  const canAddMore = maxRecipients === undefined || recipients.length < maxRecipients;

  const commitDraft = () => {
    const nextRecipients = parseRecipientInput(draft);
    if (!nextRecipients.length) {
      onDraftChange("");
      return;
    }
    onRecipientsChange(applyLimit(mergeRecipients(recipients, nextRecipients)));
    onDraftChange("");
  };

  const removeRecipient = (recipientToRemove: string) => {
    onRecipientsChange(recipients.filter((recipient) => recipient !== recipientToRemove));
  };

  return (
    <div
      className="recipient-chip-input"
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
        cursor: readOnly ? "default" : "text",
        ...containerStyle,
      }}
      onClick={(event) => {
        if (readOnly) return;
        const input = event.currentTarget.querySelector("input");
        input?.focus();
      }}
    >
      {prefixLabel && (
        <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600, lineHeight: 1 }}>
          {prefixLabel}
        </span>
      )}
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
          {!readOnly && (
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
          )}
        </span>
      ))}
      {!readOnly && canAddMore && (
        <input
          value={draft}
          onChange={(event) => {
            const value = event.target.value;
            if (/[,\n;]/.test(value)) {
              onRecipientsChange(applyLimit(mergeRecipients(recipients, parseRecipientInput(value))));
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
      )}
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
  onSaveOption,
  onSend,
  isSending,
}) => {
  const [selectedBlueprintId, setSelectedBlueprintId] = useState("");
  const blueprintGroups = React.useMemo(() => {
    const groups = new Map<string, ContactComposeEmailPopupProps["blueprints"]>();
    blueprints.forEach((blueprint) => {
      const category = (blueprint.templateDefinitionName || "").trim() || "Uncategorized";
      const group = groups.get(category) || [];
      group.push(blueprint);
      groups.set(category, group);
    });
    return Array.from(groups, ([category, items]) => ({
      category,
      blueprints: items.sort((a, b) =>
        a.templateName.toLowerCase().localeCompare(b.templateName.toLowerCase()),
      ),
    })).sort((a, b) => a.category.localeCompare(b.category));
  }, [blueprints]);
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
  // One-off instruction typed in the editor's instruction column. It travels
  // with the next Generate and fills {manual_instruction} in the prompt;
  // nothing is stored, so it applies to that call only.
  const [manualInstruction, setManualInstruction] = useState("");
  const [previewFinalPrompt, setPreviewFinalPrompt] = useState("");
  const [previewWebSearchData, setPreviewWebSearchData] = useState("");
  const [previewEmails, setPreviewEmails] = useState("");
  const [previewNotes, setPreviewNotes] = useState("");
  const [previewProfessionalSummary, setPreviewProfessionalSummary] = useState("");
  // Source highlights for the generated body. The editor paints them over the
  // wording it finds, so the body that gets sent stays clean.
  const [previewHighlights, setPreviewHighlights] = useState<EmailHighlight[]>([]);
  // Every email the last Generate produced. The first is in the editor and
  // already saved to the contact; Previous/Next step through the rest. They
  // are not stored — generating again replaces the whole set.
  const [emailOptions, setEmailOptions] = useState<EmailOption[]>([]);
  const [selectedOption, setSelectedOption] = useState(0);
  // Which option is on the contact row. The generation saves the first one,
  // so that is where this starts once a set arrives.
  const [savedOption, setSavedOption] = useState<number | null>(null);
  const [isSavingOption, setIsSavingOption] = useState(false);
  // Device-preview width for the body editor ("" = desktop).
  const [previewWidth, setPreviewWidth] = useState("");
  const [openDeviceDropdown, setOpenDeviceDropdown] = useState(false);
  // Expand control — same full-width editor modal the Kraft email, Inbox and
  // contact reply/forward toolbars open.
  const [isBodyExpanded, setIsBodyExpanded] = useState(false);
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
      setPreviewWidth("");
      setOpenDeviceDropdown(false);
      setIsBodyExpanded(false);
      setPreviewHighlights([]);
      setManualInstruction("");
      setEmailOptions([]);
      setSelectedOption(0);
      setSavedOption(null);
      setIsSavingOption(false);
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
      const generatedEmail = await onGenerate(
        Number(selectedBlueprintId),
        // Before the first Generate there is no body yet, and the helper then
        // sends the steer on its own rather than a rule pointing at nothing.
        buildManualInstruction(manualInstruction, emailBody),
      );
      setHasGeneratedBody(true);
      setEmailBody(generatedEmail.emailBody || "");
      setEmailSubject(generatedEmail.emailSubject || "");
      setPreviewFinalPrompt(generatedEmail.finalPrompt || "");
      setPreviewWebSearchData(generatedEmail.webSearchData || "");
      setPreviewEmails(generatedEmail.emails || "");
      setPreviewNotes(generatedEmail.notes || "");
      setPreviewProfessionalSummary(generatedEmail.professionalSummary || "");
      setPreviewHighlights(parseEmailHighlights(generatedEmail.emailHighlights));

      const options = generatedEmail.emailOptions ?? [];
      setEmailOptions(options);
      setSelectedOption(0);
      // The generation wrote its first option to the contact row, so that is
      // what is stored until the user steps to another one and saves it.
      setSavedOption(options.length > 0 ? 0 : null);
    } finally {
      setIsGenerating(false);
    }
  };

  // Steps to another option.
  //
  // It replaces the body rather than previewing beside it, so an instruction
  // typed afterwards applies to the option actually chosen: the manual
  // instruction carries the body on screen with it.
  const handleSelectOption = (index: number) => {
    const option = emailOptions[index];
    if (!option) return;

    setSelectedOption(index);
    setEmailBody(option.bodyHtml);
    setEmailSubject(option.subject || "");
    setPreviewHighlights(option.highlights);
  };

  // Stores the option on screen, replacing the first one the generation saved.
  //
  // The body comes from the editor rather than from the option, so an edit
  // made after stepping to it is saved too.
  const handleSaveOption = async () => {
    const option = emailOptions[selectedOption];
    if (!option || !onSaveOption || isSavingOption) return;

    setIsSavingOption(true);
    try {
      const saved = await onSaveOption({
        emailSubject,
        emailBody,
        emailHighlights: option.highlights,
      });

      if (saved) setSavedOption(selectedOption);
    } finally {
      setIsSavingOption(false);
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

  const editorMaxWidth =
    previewWidth === "Mobile" ? 480 : previewWidth === "Tab" ? 768 : "100%";

  return (
    <div className="contact-compose-backdrop" onClick={onClose}>
      <div
        className="contact-compose-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Compose email"
      >
        <div className="contact-compose-head">
          <button
            type="button"
            className="cc-head-back"
            onClick={onClose}
            title="Back"
            aria-label="Back to contact"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <h2 className="cc-head-title">Compose email</h2>
          <button
            type="button"
            className="cc-head-close"
            onClick={onClose}
            aria-label="Close compose"
            title="Close"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="contact-compose-body">
          <div className="cc-strip">
            <div className="cc-strip-lead">
              <span className="cc-strip-mark">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
                </svg>
              </span>
              <span className="cc-strip-copy">
                <span className="cc-strip-title">Draft with a blueprint</span>
                <span className="cc-strip-hint">
                  Pick a blueprint, generate, then edit before sending.
                </span>
              </span>
            </div>
            <label className="cc-visually-hidden" htmlFor="contact-compose-blueprint">
              Blueprint
            </label>
            <select
              id="contact-compose-blueprint"
              value={selectedBlueprintId}
              onChange={(event) => setSelectedBlueprintId(event.target.value)}
            >
              <option value="">Select a blueprint (optional)...</option>
              {blueprintGroups.map(({ category, blueprints: items }) => (
                <optgroup key={category} label={category}>
                  {items.map((blueprint) => (
                    <option key={blueprint.id} value={blueprint.id}>
                      {blueprint.templateName}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button
              type="button"
              className="cc-btn cc-btn-kraft"
              onClick={handleGenerate}
              disabled={!selectedBlueprintId || isGenerating}
            >
              <FontAwesomeIcon icon={faBolt} />
              {isGenerating ? "Generating..." : "Generate"}
            </button>
          </div>

          <div className="cc-fields">
            <div className="cc-row">
              <span className="cc-label">From</span>
              <select
                className="cc-row-select"
                value={selectedFromId}
                onChange={(event) => onFromChange(event.target.value)}
                aria-label="From address"
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
              {isSignatureLoading && <span className="cc-row-note">Loading signature...</span>}
            </div>

            <div className="cc-row">
              <span className="cc-label">To</span>
              <input
                className="cc-row-input cc-row-input-readonly"
                value={toEmail}
                readOnly
                aria-label="To"
                placeholder="Contact email not available"
              />
              {!showCc && (
                <button type="button" className="cc-link" onClick={() => setShowCc(true)}>
                  Cc
                </button>
              )}
              {!showBcc && (
                <button type="button" className="cc-link" onClick={() => setShowBcc(true)}>
                  Bcc
                </button>
              )}
            </div>

            {showCc && (
              <div className="cc-row">
                <span className="cc-label">Cc</span>
                <div className="cc-row-chips">
                  <RecipientChipInput
                    recipients={ccEmails}
                    draft={ccEmailDraft}
                    onRecipientsChange={setCcEmails}
                    onDraftChange={setCcEmailDraft}
                    placeholder="Add Cc recipients"
                    containerStyle={{ width: "100%", minWidth: 0, maxWidth: "none" }}
                  />
                </div>
                <button
                  type="button"
                  className="cc-row-remove"
                  onClick={() => {
                    setShowCc(false);
                    setCcEmails([]);
                    setCcEmailDraft("");
                  }}
                  title="Hide Cc"
                  aria-label="Hide Cc"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
            )}

            {showBcc && (
              <div className="cc-row">
                <span className="cc-label">Bcc</span>
                <div className="cc-row-chips">
                  <RecipientChipInput
                    recipients={bccEmails}
                    draft={bccEmailDraft}
                    onRecipientsChange={setBccEmails}
                    onDraftChange={setBccEmailDraft}
                    placeholder="Add Bcc recipients"
                    containerStyle={{ width: "100%", minWidth: 0, maxWidth: "none" }}
                  />
                </div>
                <button
                  type="button"
                  className="cc-row-remove"
                  onClick={() => {
                    setShowBcc(false);
                    setBccEmails([]);
                    setBccEmailDraft("");
                  }}
                  title="Hide Bcc"
                  aria-label="Hide Bcc"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
            )}

            <div className="cc-row">
              <span className="cc-label">Subject</span>
              <input
                className="cc-row-input"
                value={emailSubject}
                onChange={(event) => setEmailSubject(event.target.value)}
                placeholder="Enter subject..."
                aria-label="Subject"
              />
            </div>
          </div>

          <div className="contact-compose-editor cc-editor" style={{ maxWidth: editorMaxWidth }}>
            <EmailOptionPicker
              options={emailOptions}
              selectedIndex={selectedOption}
              onSelect={handleSelectOption}
              onSave={onSaveOption ? handleSaveOption : undefined}
              isSaving={isSavingOption}
              savedIndex={savedOption}
              disabled={isGenerating}
            >
              <RichTextEditor
                value={emailBody}
                onChange={setEmailBody}
                height={360}
                // Always on, like the Kraft email toolbar: copy, device
                // preview and expand are just as useful on a hand-written
                // body as on a generated one, and the insight panels carry
                // their own empty states before the first Generate.
                showActionButtons
                // Not gated on hasGeneratedBody: the instruction is written
                // before the first Generate, not after it.
                showManualInstruction
                manualInstruction={manualInstruction}
                onManualInstructionChange={setManualInstruction}
                onRegenerate={handleGenerate}
                isRegenerating={isGenerating}
                regenerateDisabled={!selectedBlueprintId}
                showDeviceButton
                outputEmailWidth={previewWidth}
                openDeviceDropdown={openDeviceDropdown}
                onDeviceDropdownToggle={() => setOpenDeviceDropdown((prev) => !prev)}
                onDeviceWidthChange={(width) => {
                  setPreviewWidth(width);
                  setOpenDeviceDropdown(false);
                }}
                highlights={previewHighlights}
                finalPrompt={previewFinalPrompt}
                webSearchData={previewWebSearchData}
                insightEmails={previewEmails}
                insightNotes={previewNotes}
                insightProfessionalSummary={previewProfessionalSummary}
                onExpandEditor={() => setIsBodyExpanded(true)}
              />
              {/* Sits between the editor and the option strip, so the count
                  belongs to the body above it rather than to the strip. */}
              <div className="cc-counts">
                <span>Characters: {plainBody.length}</span>
                <span>{plainBody.trim() ? plainBody.trim().split(/\s+/).length : 0} words</span>
              </div>
            </EmailOptionPicker>
          </div>
        </div>

        <div className="cc-footer">
          <span className="cc-footer-spacer" />
          <button type="button" className="cc-btn cc-btn-ghost" onClick={onClose}>
            Discard
          </button>
          <button
            type="button"
            className="cc-btn cc-btn-primary"
            onClick={handleSend}
            disabled={isSending}
          >
            <FontAwesomeIcon icon={faPaperPlane} />
            {isSending ? "Sending..." : "Send"}
          </button>
        </div>

        {/* Expanded body editor - the Modal portals to <body> at a higher
            z-index than the compose backdrop, so it sits over the popup and
            edits the same `emailBody` state.

            The wrapper is not decoration: React events bubble through the
            component tree, not the DOM one, so without it a click inside the
            portalled modal would reach the backdrop's onClick and close the
            whole compose popup. */}
        <div style={{ display: "contents" }} onClick={(event) => event.stopPropagation()}>
          <Modal
            show={isBodyExpanded}
            closeModal={() => setIsBodyExpanded(false)}
            buttonLabel="Close"
            size="90%"
          >
            <div style={{ padding: 20 }}>
              <label style={{ fontWeight: 500, fontSize: 16, marginBottom: 12, display: "block" }}>
                Email body
              </label>
              <RichTextEditor
                value={emailBody}
                onChange={setEmailBody}
                height={520}
                highlights={previewHighlights}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 14 }}>
                <button
                  type="button"
                  className="cc-btn cc-btn-ghost"
                  onClick={() => setIsBodyExpanded(false)}
                >
                  Done
                </button>
              </div>
            </div>
          </Modal>
        </div>
      </div>
    </div>
  );
};

export default ContactComposeEmailPopup;
