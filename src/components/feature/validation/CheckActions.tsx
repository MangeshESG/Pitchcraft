import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import SuggestionList from "./SuggestionList";
import type { ValidationSuggestion } from "../../../api/contactValidation";

interface CheckActionsProps {
  /** The check this panel belongs to, e.g. "Live contact". */
  checkLabel: string;
  suggestions: ValidationSuggestion[];
  /** Applies or dismisses one correction. Omitted leaves the list read-only. */
  onResolve?: (
    suggestion: ValidationSuggestion,
    action: "accept" | "dismiss"
  ) => Promise<void>;
  /** Sets this one score to 100. */
  onVerify?: () => Promise<void>;
  /** Deletes the contact. Confirmed inside the panel first. */
  onDelete?: () => Promise<void>;
}

const ACTION_BUTTON: React.CSSProperties = {
  width: "100%",
  padding: "7px 12px",
  borderRadius: 8,
  fontSize: 12.5,
  fontWeight: 600,
  textAlign: "left",
  cursor: "pointer",
};

/**
 * The actions available on one contact's verdict for one check, behind an info
 * icon beside that score.
 *
 * Everything lives in a panel rather than in the cell because the grid is read
 * first and acted on second: a list of four hundred contacts is scanned for
 * which rows are bad, and only then is one of them dealt with. Corrections,
 * their evidence and two destructive-ish buttons rendered inline would make
 * every bad row three times the height of a good one and push the name and
 * company off the screen — so the row stays one line and the icon is the way
 * in.
 *
 * The three actions sit together because they are the three answers to the
 * same question. The score says this record is wrong; the user either fixes it
 * (accept), decides it is fine as it stands (verify), or decides it is not
 * worth keeping (delete).
 */
const CheckActions: React.FC<CheckActionsProps> = ({
  checkLabel,
  suggestions,
  onResolve,
  onVerify,
  onDelete,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  /**
   * Where the panel is pinned, as one vertical edge and a left.
   *
   * Opening upwards sets `bottom` rather than a computed `top`, because the
   * panel's height depends on how many corrections it is showing and is not
   * known until it has rendered. Positioning it by subtracting the *maximum*
   * height left a short panel floating a couple of hundred pixels above the
   * icon that opened it, pointing at the wrong row. Pinning the edge that
   * faces the icon keeps the two together at any height.
   */
  const [anchor, setAnchor] =
    useState<{ top?: number; bottom?: number; left: number; maxHeight: number } | null>(null);
  /**
   * Delete is two clicks, and the confirmation replaces the button rather than
   * opening a dialog over it — a modal here would close this panel behind it
   * and lose the context the user was deleting on the strength of.
   */
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState<"verify" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  // The panel is portalled out of the table to escape its overflow clipping,
  // so an outside-click check has to know about both elements.
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") setIsOpen(false);
        return;
      }

      const target = event.target as Node;

      if (!buttonRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);

    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [isOpen]);

  const hasPending = suggestions.some((s) => s.status === "pending");

  const toggle = () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    const rect = buttonRef.current?.getBoundingClientRect();

    if (rect) {
      // Open upwards when there is not enough room below, so a contact near the
      // bottom of a long list does not open its panel off-screen.
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;

      setAnchor({
        ...(openUp
          ? { bottom: window.innerHeight - rect.top + 6 }
          : { top: rect.bottom + 6 }),
        left: Math.max(8, Math.min(rect.left - 8, window.innerWidth - 340)),
        // Never taller than the room it has, so the panel scrolls internally
        // instead of running off the top or bottom of the window.
        maxHeight: Math.min(340, Math.max(160, openUp ? spaceAbove : spaceBelow)),
      });
    }

    setIsConfirmingDelete(false);
    setError(null);
    setIsOpen(true);
  };

  const run = async (which: "verify" | "delete", action: () => Promise<void>) => {
    setBusy(which);
    setError(null);

    try {
      await action();
      setIsOpen(false);
    } catch (problem: any) {
      setError(problem?.message ?? "That could not be saved.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        title="Corrections and actions for this score"
        aria-label="Corrections and actions for this score"
        style={{
          marginLeft: 5,
          width: 18,
          height: 18,
          padding: 0,
          borderRadius: "50%",
          border: `1px solid ${hasPending ? "#3f9f42" : "#cdd2da"}`,
          // A pending correction is the only state worth pulling the eye, so it
          // is the only one that fills the icon in.
          background: hasPending ? "#3f9f42" : "#fff",
          color: hasPending ? "#fff" : "#6b7280",
          fontSize: 11,
          fontWeight: 700,
          lineHeight: 1,
          cursor: "pointer",
          verticalAlign: "middle",
        }}
      >
        i
      </button>

      {isOpen && anchor &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: "fixed",
              top: anchor.top,
              bottom: anchor.bottom,
              left: anchor.left,
              width: 330,
              maxHeight: anchor.maxHeight,
              overflowY: "auto",
              background: "#fff",
              border: "1px solid #e8eaee",
              borderRadius: 12,
              boxShadow: "0 12px 32px rgba(15, 23, 42, 0.16)",
              padding: 14,
              zIndex: 1100,
              fontSize: 13,
              color: "#0b1220",
              textAlign: "left",
            }}
          >
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
              {checkLabel}
            </div>

            {suggestions.length > 0 ? (
              <SuggestionList
                compact
                suggestions={suggestions}
                onResolve={onResolve}
              />
            ) : (
              <p style={{ margin: "0 0 4px", color: "#6b7280", fontSize: 12.5 }}>
                No corrections were suggested for this contact.
              </p>
            )}

            <div
              style={{
                display: "grid",
                gap: 6,
                marginTop: 12,
                paddingTop: 10,
                borderTop: "1px solid #f0f1f4",
              }}
            >
              {onVerify && (
                <button
                  type="button"
                  onClick={() => void run("verify", onVerify)}
                  disabled={busy !== null}
                  title={`Sets this ${checkLabel.toLowerCase()} score to 100. The other three checks keep their own scores.`}
                  style={{
                    ...ACTION_BUTTON,
                    border: "1px solid #3f9f42",
                    background: "#f1f8f2",
                    color: "#2d7a30",
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  {busy === "verify" ? "Saving…" : "✓ Mark verified — set this score to 100"}
                </button>
              )}

              {onDelete && !isConfirmingDelete && (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  disabled={busy !== null}
                  style={{
                    ...ACTION_BUTTON,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    color: "#b91c1c",
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  Delete this contact
                </button>
              )}

              {onDelete && isConfirmingDelete && (
                <div
                  style={{
                    padding: "9px 10px",
                    borderRadius: 8,
                    border: "1px solid #fecaca",
                    background: "#fef2f2",
                  }}
                >
                  <p style={{ margin: "0 0 8px", fontSize: 12.5, color: "#7f1d1d", lineHeight: 1.5 }}>
                    Delete this contact permanently? This cannot be undone.
                  </p>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => void run("delete", onDelete)}
                      disabled={busy !== null}
                      style={{
                        padding: "4px 12px",
                        borderRadius: 7,
                        border: "1px solid #b91c1c",
                        background: "#b91c1c",
                        color: "#fff",
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: busy ? "not-allowed" : "pointer",
                        opacity: busy ? 0.6 : 1,
                      }}
                    >
                      {busy === "delete" ? "Deleting…" : "Delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(false)}
                      disabled={busy !== null}
                      style={{
                        padding: "4px 12px",
                        borderRadius: 7,
                        border: "1px solid #d1d5db",
                        background: "#fff",
                        color: "#374151",
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <p style={{ margin: "8px 0 0", fontSize: 12, color: "#b91c1c" }}>{error}</p>
            )}
          </div>,
          document.body
        )}
    </>
  );
};

export default CheckActions;
