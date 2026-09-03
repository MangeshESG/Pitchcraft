import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { parseApiDate, type ValidationSource } from "../../../api/contactValidation";

/**
 * The confidence bands the checks are scored against.
 *
 * Six bands rather than a red/amber/green traffic light, because the whole
 * point of the scoring instruction is that the model must use the full range
 * instead of clustering everything at "probably fine". Three colours would
 * flatten 70 and 94 into the same signal and hide exactly the distinction the
 * scores exist to make.
 */
const BANDS = [
  { min: 95, label: "Extremely strong", fg: "#166534", bg: "#dcfce7", border: "#bbf7d0" },
  { min: 85, label: "Strong", fg: "#15803d", bg: "#f0fdf4", border: "#d5f0da" },
  { min: 70, label: "Likely, with a caveat", fg: "#a16207", bg: "#fefce8", border: "#fde68a" },
  { min: 50, label: "Material uncertainty", fg: "#b45309", bg: "#fff7ed", border: "#fed7aa" },
  { min: 25, label: "Probably fails", fg: "#c2410c", bg: "#fff1f2", border: "#fecdd3" },
  { min: 0, label: "Fails", fg: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
];

const bandFor = (score: number) =>
  BANDS.find((band) => score >= band.min) ?? BANDS[BANDS.length - 1];

export interface ValidationCellProps {
  score?: number | null;
  comments?: string | null;
  sources?: ValidationSource[];
  checkedAt?: string | null;
  /** Short prefix inside the chip, e.g. "Fit" or "Data". Omit for score only. */
  label?: string;
  /**
   * Adds the spec's "Check LinkedIn" prompt below the comments whenever the
   * score is short of certain. Only the live contact check sets this — it is
   * the one whose answer a person can go and confirm in one click.
   */
  showLinkedInHint?: boolean;
}

/**
 * One score in the contact grid: a coloured confidence badge that opens the
 * comments and the evidence behind it.
 *
 * The comments are behind a click rather than in the cell because they run to
 * a paragraph, and a grid of paragraphs is unreadable — but they are the part
 * that tells a user *why*, so they are one click away and never truncated in
 * the popover.
 */
const ValidationCell: React.FC<ValidationCellProps> = ({
  score,
  comments,
  sources = [],
  checkedAt,
  label,
  showLinkedInHint = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * A click pins the popover open so it survives the pointer leaving. Without
   * this, hover-to-open would make the source links unreachable — they would
   * vanish the moment you moved towards them.
   */
  const isPinned = useRef(false);

  const cancelHoverTimer = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };

  useEffect(() => cancelHoverTimer, []);

  // Close on any outside click or Escape. The popover is portalled to the body
  // so it can escape the table's overflow clipping, which means it cannot rely
  // on a parent's blur.
  useEffect(() => {
    if (!isOpen) return;

    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") {
          isPinned.current = false;
          setIsOpen(false);
        }
        return;
      }

      if (!buttonRef.current?.contains(event.target as Node)) {
        isPinned.current = false;
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

  if (score === null || score === undefined) {
    return <span style={{ color: "#9ca3af" }}>—</span>;
  }

  const band = bandFor(score);
  const hasDetail = !!comments?.trim() || sources.length > 0 || showLinkedInHint;

  const positionAndOpen = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      // Flip above the row when there is no room below, so a score near the
      // bottom of a long list does not open off-screen.
      const spaceBelow = window.innerHeight - rect.bottom;
      setAnchor({
        top: spaceBelow > 280 ? rect.bottom + 6 : Math.max(8, rect.top - 286),
        left: Math.min(rect.left, window.innerWidth - 380),
      });
    }
    setIsOpen(true);
  };

  // Opening on hover is what makes a grid of scores readable — you sweep the
  // column instead of clicking every cell. The short delay stops the popover
  // flickering open as the pointer crosses chips on its way somewhere else.
  const handleMouseEnter = () => {
    if (!hasDetail) return;
    cancelHoverTimer();
    hoverTimer.current = setTimeout(positionAndOpen, 120);
  };

  const handleMouseLeave = () => {
    cancelHoverTimer();
    if (isPinned.current) return;
    // Long enough to travel from the chip into the popover, which cancels it.
    hoverTimer.current = setTimeout(() => setIsOpen(false), 220);
  };

  const handleClick = () => {
    if (!hasDetail) return;
    cancelHoverTimer();

    if (isOpen && isPinned.current) {
      isPinned.current = false;
      setIsOpen(false);
      return;
    }

    isPinned.current = true;
    positionAndOpen();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        title={hasDetail ? undefined : band.label}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "3px 9px",
          whiteSpace: "nowrap",
          borderRadius: 999,
          border: `1px solid ${band.border}`,
          background: band.bg,
          color: band.fg,
          fontSize: 12.5,
          fontWeight: 600,
          cursor: hasDetail ? "pointer" : "default",
          lineHeight: 1.4,
        }}
      >
        {label ? `${label} ${score}` : score}
      </button>

      {isOpen && anchor &&
        createPortal(
          <div
            onMouseEnter={cancelHoverTimer}
            onMouseLeave={handleMouseLeave}
            style={{
              position: "fixed",
              top: anchor.top,
              left: anchor.left,
              width: 360,
              maxHeight: 280,
              overflowY: "auto",
              background: "#fff",
              border: "1px solid #e8eaee",
              borderRadius: 12,
              boxShadow: "0 12px 32px rgba(15, 23, 42, 0.16)",
              padding: 14,
              zIndex: 1100,
              fontSize: 13,
              lineHeight: 1.55,
              color: "#0b1220",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <span style={{ fontWeight: 600, color: band.fg }}>
                {score} · {band.label}
              </span>
              {checkedAt && (
                <span style={{ fontSize: 11.5, color: "#6b7280" }}>
                  {parseApiDate(checkedAt).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>

            {comments?.trim() ? (
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{comments.trim()}</p>
            ) : (
              <p style={{ margin: 0, color: "#6b7280" }}>No issues were reported.</p>
            )}

            {showLinkedInHint && (
              <p
                style={{ margin: "10px 0 0", fontWeight: 600, color: "#b45309" }}
                title="Click on the LinkedIn column to open LinkedIn with this contact. If you have downloaded the PitchKraft browser extension then it will automatically check the contact against the data held in LinkedIn."
              >
                Check LinkedIn
              </p>
            )}

            {sources.length > 0 && (
              <div style={{ marginTop: 12, borderTop: "1px solid #f0f1f4", paddingTop: 10 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    color: "#6b7280",
                    marginBottom: 6,
                  }}
                >
                  Sources
                </div>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {sources.map((source) => (
                    <li key={source.url} style={{ marginBottom: 4 }}>
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
          </div>,
          document.body
        )}
    </>
  );
};

export default ValidationCell;

/**
 * Reads the sources blob the list endpoints send down as a JSON string.
 * Malformed JSON yields no sources rather than taking the cell down with it.
 */
export const parseSources = (raw: unknown): ValidationSource[] => {
  if (Array.isArray(raw)) return raw as ValidationSource[];
  if (typeof raw !== "string" || !raw.trim()) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
