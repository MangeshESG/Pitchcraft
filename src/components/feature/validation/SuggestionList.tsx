import React, { useState } from "react";
import {
  suggestionLabel,
  type ValidationSuggestion,
} from "../../../api/contactValidation";

interface SuggestionListProps {
  suggestions: ValidationSuggestion[];
  /**
   * Applies or dismisses one. Throwing leaves the card as it was and shows the
   * reason. Omitted where there is nothing to post to — the corrections are
   * still worth reading, but the buttons go away rather than doing nothing.
   */
  onResolve?: (
    suggestion: ValidationSuggestion,
    action: "accept" | "dismiss"
  ) => Promise<void>;
  /**
   * Applies every pending correction at once. Omitted leaves only the
   * per-suggestion buttons, which is the right default anywhere one
   * correction is the normal case.
   */
  onResolveAll?: () => Promise<void>;
  /** Called on any click, so a popover host can pin itself open. */
  onInteract?: () => void;
  /**
   * Sized for a grid cell rather than a panel.
   *
   * The table caps a cell at 280px, so the old and new values stack instead of
   * sitting either side of an arrow — at that width the inline form wraps in
   * the middle of a value and the two stop reading as a before and after.
   */
  compact?: boolean;
}

/**
 * The corrections the Data Integrity check offered, each with an Accept button.
 *
 * A score and a paragraph tell a user their data is wrong; this is what lets
 * them do something about it in the place they found out. The old → new pair
 * is always shown rather than just the new value, because "Accept" is a write
 * to a customer record and the user has to be able to see what it replaces
 * before agreeing to it.
 *
 * Dismiss sits beside Accept rather than being the absence of a click: a
 * suggestion left alone reads as unreviewed to the next person to open the
 * contact, and on a list of five hundred that difference is the whole value of
 * having gone through them.
 */
const SuggestionList: React.FC<SuggestionListProps> = ({
  suggestions,
  onResolve,
  onResolveAll,
  onInteract,
  compact = false,
}) => {
  /** The suggestion currently in flight, so only its own buttons go quiet. */
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isApplyingAll, setIsApplyingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingCount = suggestions.filter(
    (suggestion) => suggestion.status === "pending"
  ).length;

  const applyAll = async () => {
    if (!onResolveAll) return;

    onInteract?.();
    setIsApplyingAll(true);
    setError(null);

    try {
      await onResolveAll();
    } catch (problem: any) {
      setError(problem?.message ?? "Those could not be saved.");
    } finally {
      setIsApplyingAll(false);
    }
  };

  const resolve = async (
    suggestion: ValidationSuggestion,
    action: "accept" | "dismiss"
  ) => {
    if (!onResolve) return;

    onInteract?.();
    setBusyId(suggestion.id);
    setError(null);

    try {
      await onResolve(suggestion, action);
    } catch (problem: any) {
      // Shown here rather than as a toast: the failure belongs to this card,
      // and the user is looking at it.
      setError(problem?.message ?? "That could not be saved.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      onMouseDown={(event) => {
        // Keeps a host popover from reading this as an outside click.
        event.stopPropagation();
        onInteract?.();
      }}
      style={
        compact
          ? { marginTop: 8, textAlign: "left" }
          : { marginTop: 12, borderTop: "1px solid #f0f1f4", paddingTop: 10 }
      }
    >
      {/* In a cell the column header already says what this is. */}
      {!compact && (
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
          Suggested corrections
        </div>
      )}

      {/* One button for a reviewed set. It only appears from the second
          pending correction, because below that it is the same click as the
          card's own Accept, in a second place. */}
      {onResolveAll && pendingCount > 1 && (
        <div style={{ marginBottom: compact ? 6 : 8 }}>
          <button
            type="button"
            onClick={() => void applyAll()}
            disabled={isApplyingAll || !!busyId}
            style={{
              width: "100%",
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid #3f9f42",
              background: "#3f9f42",
              color: "#fff",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: isApplyingAll || busyId ? "not-allowed" : "pointer",
              opacity: isApplyingAll || busyId ? 0.6 : 1,
            }}
          >
            {isApplyingAll ? "Applying…" : `Accept all ${pendingCount}`}
          </button>
        </div>
      )}

      <div style={{ display: "grid", gap: compact ? 6 : 8 }}>
        {suggestions.map((suggestion) => {
          const isPending = suggestion.status === "pending";
          // Every pending card goes quiet while the bulk apply runs, because
          // the bulk call is about to resolve this one too.
          const isBusy = busyId === suggestion.id || isApplyingAll;

          return (
            <div
              key={suggestion.id}
              style={{
                padding: compact ? "7px 8px" : "9px 10px",
                borderRadius: 9,
                border: `1px solid ${isPending ? "#e8eaee" : "#f0f1f4"}`,
                background: isPending ? "#fff" : "#fafbfc",
                opacity: isPending ? 1 : 0.75,
                // Keeps the card legible where the column would otherwise be
                // only as wide as a two-digit score. The table caps a cell at
                // 280px, so this widens the column without overflowing it.
                minWidth: compact ? 212 : undefined,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "#6b7280",
                  marginBottom: 4,
                }}
              >
                {suggestionLabel(suggestion)}
              </div>

              <div
                style={{
                  fontSize: compact ? 12.5 : 13,
                  lineHeight: 1.5,
                  wordBreak: "break-word",
                }}
              >
                {/* The struck-through original is what makes this a review
                    rather than an instruction — a user who does not recognise
                    the old value should not be accepting the new one. */}
                <span style={{ color: "#9ca3af", textDecoration: "line-through" }}>
                  {/* "(empty)" is the common case for a data enhancement
                      proposal rather than an edge case: filling a blank column
                      is what that check is for. It still reads as a before and
                      after, because accepting one is still a write. */}
                  {suggestion.current?.trim() || "(empty)"}
                </span>
                {compact ? <br /> : <span style={{ color: "#9ca3af", margin: "0 6px" }}>→</span>}
                <span style={{ color: "#0b1220", fontWeight: 600 }}>
                  {compact && "→ "}
                  {suggestion.suggested}
                </span>
              </div>

              {suggestion.reason?.trim() && (
                <p
                  title={compact ? suggestion.reason.trim() : undefined}
                  style={{
                    margin: "6px 0 0",
                    fontSize: compact ? 11.5 : 12,
                    lineHeight: 1.5,
                    color: "#6b7280",
                    whiteSpace: "pre-wrap",
                    // Evidence can run to a sentence with a URL in it. Three
                    // lines is enough to judge the correction by; the rest is
                    // on hover rather than pushing every other row down.
                    ...(compact
                      ? {
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical" as const,
                          overflow: "hidden",
                        }
                      : {}),
                  }}
                >
                  {suggestion.reason.trim()}
                </p>
              )}

              {isPending && onResolve ? (
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => void resolve(suggestion, "accept")}
                    disabled={isBusy}
                    style={{
                      padding: "4px 12px",
                      borderRadius: 7,
                      border: "1px solid #3f9f42",
                      background: "#f1f8f2",
                      color: "#2d7a30",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: isBusy ? "not-allowed" : "pointer",
                      opacity: isBusy ? 0.6 : 1,
                    }}
                  >
                    {isBusy ? "Saving…" : "Accept"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void resolve(suggestion, "dismiss")}
                    disabled={isBusy}
                    style={{
                      padding: "4px 12px",
                      borderRadius: 7,
                      border: "1px solid #d1d5db",
                      background: "#fff",
                      color: "#374151",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: isBusy ? "not-allowed" : "pointer",
                      opacity: isBusy ? 0.6 : 1,
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              ) : isPending ? null : (
                <div
                  style={{
                    marginTop: 7,
                    fontSize: 12,
                    fontWeight: 600,
                    color: suggestion.status === "accepted" ? "#2d7a30" : "#6b7280",
                  }}
                >
                  {suggestion.status === "accepted" ? "✓ Applied" : "Dismissed"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "#b91c1c" }}>{error}</p>
      )}
    </div>
  );
};

export default SuggestionList;
