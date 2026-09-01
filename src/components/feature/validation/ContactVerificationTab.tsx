import React, { useCallback, useEffect, useState } from "react";
import {
  ContactValidationResult,
  fetchValidationResults,
  markVerified,
} from "../../../api/contactValidation";
import ValidationCell from "./ValidationCell";
import { formatUserDate } from "../../common/dateTimePreferences";

interface ContactVerificationTabProps {
  clientId: string | number;
  contactId: number;
  onShowMessage?: (message: string, type: "success" | "error") => void;
}

/** The four checks, in the order the spec introduces them. */
const CHECKS = [
  {
    key: "contactFit",
    label: "Contact fit",
    blurb: "Does this company and job title belong in the target audience?",
  },
  {
    key: "dataIntegrity",
    label: "Data integrity",
    blurb: "Is the record itself complete, clean and consistent?",
  },
  {
    key: "liveContact",
    label: "Live contact",
    blurb: "Is this person still at that company in that role?",
    linkedInHint: true,
  },
  {
    key: "emailValidity",
    label: "Email validity",
    blurb: "Is the address real and deliverable?",
  },
] as const;

/**
 * One contact's validation state: the four scores, what each check said, the
 * evidence behind it, and the manual override.
 *
 * The list grid shows the same scores in a row; this exists for the moment a
 * user stops on one contact and wants the whole picture — including the dates,
 * which are the part that says whether a score is still worth trusting.
 */
const ContactVerificationTab: React.FC<ContactVerificationTabProps> = ({
  clientId,
  contactId,
  onShowMessage,
}) => {
  const [result, setResult] = useState<ContactValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    if (!clientId || !contactId) return;

    setIsLoading(true);

    try {
      const rows = await fetchValidationResults(clientId, [contactId]);
      setResult(rows[0] ?? null);
    } catch (error: any) {
      onShowMessage?.(error?.message ?? "Validation results could not be loaded.", "error");
    } finally {
      setIsLoading(false);
    }
    // onShowMessage is a fresh closure on every parent render; depending on it
    // would reload this panel on each keystroke elsewhere in the profile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, contactId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleVerified = async () => {
    const next = !result?.isVerified;
    setIsSaving(true);

    try {
      const message = await markVerified(clientId, [contactId], next);
      await load();
      onShowMessage?.(message, "success");
    } catch (error: any) {
      onShowMessage?.(error?.message ?? "The contact could not be marked.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div style={{ padding: "32px 0", color: "#6b7280", fontSize: 13 }}>Loading…</div>;
  }

  const hasAnyCheck =
    !!result &&
    CHECKS.some((check) => (result as any)[`${check.key}Confidence`] !== null &&
                           (result as any)[`${check.key}Confidence`] !== undefined);

  return (
    <div style={{ maxWidth: 760 }}>
      {/* ---------- Manual override ---------- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "14px 16px",
          borderRadius: 12,
          border: `1px solid ${result?.isVerified ? "#d5f0da" : "#e8eaee"}`,
          background: result?.isVerified ? "#f1f8f2" : "#fff",
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#0b1220" }}>
            {result?.isVerified ? "Marked as verified" : "Not marked as verified"}
          </div>
          <div style={{ marginTop: 3, fontSize: 12.5, color: "#6b7280", lineHeight: 1.5 }}>
            {result?.isVerified && result.verifiedAt
              ? `Checked by hand on ${formatUserDate(result.verifiedAt)}. Re-running a check will not clear this.`
              : "Mark a contact verified when you have checked it yourself, or corrected something the AI got wrong."}
          </div>
        </div>

        <button
          onClick={toggleVerified}
          disabled={isSaving}
          style={{
            flexShrink: 0,
            padding: "8px 16px",
            borderRadius: 8,
            border: `1px solid ${result?.isVerified ? "#d1d5db" : "#3f9f42"}`,
            background: result?.isVerified ? "#fff" : "#f1f8f2",
            color: result?.isVerified ? "#374151" : "#2d7a30",
            fontSize: 13,
            fontWeight: 600,
            cursor: isSaving ? "not-allowed" : "pointer",
            opacity: isSaving ? 0.6 : 1,
          }}
        >
          {isSaving
            ? "Saving…"
            : result?.isVerified
              ? "Remove mark"
              : "Mark as verified"}
        </button>
      </div>

      {/* ---------- The four checks ---------- */}
      {!hasAnyCheck && (
        <div
          style={{
            padding: "32px 20px",
            textAlign: "center",
            color: "#6b7280",
            fontSize: 13,
            border: "1px dashed #e8eaee",
            borderRadius: 12,
            lineHeight: 1.6,
          }}
        >
          No checks have been run on this contact yet.
          <br />
          Select it in a list and use the validate action to run one.
        </div>
      )}

      {hasAnyCheck && (
        <div style={{ display: "grid", gap: 12 }}>
          {CHECKS.map((check) => {
            const score = (result as any)[`${check.key}Confidence`] as number | null;
            const comments = (result as any)[`${check.key}Comments`] as string | null;
            const checkedAt = (result as any)[
              check.key === "emailValidity" ? "emailCheckedAt" : `${check.key}CheckedAt`
            ] as string | null;

            return (
              <div
                key={check.key}
                style={{
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "1px solid #e8eaee",
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#0b1220" }}>
                      {check.label}
                    </div>
                    <div style={{ marginTop: 2, fontSize: 12.5, color: "#6b7280" }}>
                      {check.blurb}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* The date is what says whether a score is still worth
                        trusting — a contact verified as current a year ago is
                        not evidence of anything today. */}
                    <span style={{ fontSize: 11.5, color: "#9ca3af", whiteSpace: "nowrap" }}>
                      {checkedAt ? formatUserDate(checkedAt) : "Never run"}
                    </span>
                    <ValidationCell
                      score={score}
                      comments={comments}
                      checkedAt={checkedAt}
                      sources={result?.sources ?? []}
                      showLinkedInHint={
                        !!(check as any).linkedInHint &&
                        typeof score === "number" &&
                        score < 100
                      }
                    />
                  </div>
                </div>

                {comments?.trim() && (
                  <p
                    style={{
                      margin: "10px 0 0",
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: "#374151",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {comments.trim()}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---------- Evidence ---------- */}
      {!!result?.sources?.length && (
        <div style={{ marginTop: 20 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "#6b7280",
              marginBottom: 8,
            }}
          >
            Sources
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
            {result.sources.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#2563eb", wordBreak: "break-word" }}
                >
                  {source.label || source.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ContactVerificationTab;
