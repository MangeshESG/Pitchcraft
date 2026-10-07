import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TOOLTIP_ATTR } from "../../utils/emailHighlights";
import { linkifyText } from "../../utils/linkify";

/**
 * The hover card behind a source highlight in the email body.
 *
 * It replaces the browser's own `title` bubble, which is black, unstyled and
 * swallows the links the explanation is built around — the evidence a user
 * wants to open is written into these labels, so the tooltip has to be a real
 * element they can move the pointer into. The card is deliberately the same
 * white popover as a validation score in the contact grid, so an explanation
 * looks the same wherever it is read.
 */

const TIP_WIDTH = 360;

/**
 * One citation inside a label: where the wording came from, what it was used
 * for, the words themselves and the page behind them.
 */
interface TipGroup {
  /** The citation itself, with the owner stripped off: "Note 1", "Message #4". */
  label: string;
  /** What the source was used for — the one run set in bold on the line. */
  role: string;
  /** When the note was written or the message sent, as the prompt gave it. */
  date?: string;
  /** The wording the source supplied, shown without the "Excerpt" label. */
  excerpt?: string;
  /** Pages behind the citation, listed under "Source". */
  urls: string[];
  /** Anything that was not one of the four keys, kept rather than dropped. */
  lines: string[];
}

interface TipContent {
  title: string;
  groups: TipGroup[];
}

const KEYED = /^(source|role|date|excerpt|url|link)\s*:\s*([\s\S]*)$/i;
/** Only the first line is read loosely, to split "Heading: sentence" apart. */
const TITLE_KEYED = /^([A-Za-z][A-Za-z /&'-]{0,40}):\s*([\s\S]*)$/;

const emptyGroup = (): TipGroup => ({ label: "", role: "", urls: [], lines: [] });

/**
 * Drops the owner from a citation's source: "Notes — Note 1" becomes
 * "Note 1". The card is already headed with the owner and coloured by it, so
 * repeating it on every citation only pushed the part that says *which* note
 * or message this was towards the end of the line.
 */
const stripOwner = (source: string, title: string): string => {
  const parts = source.split(/\s+[—–-]\s+/);
  if (parts.length > 1) return parts.slice(1).join(" — ").trim();

  const bare = source.trim();
  return bare.toLowerCase() === title.trim().toLowerCase() ? "" : bare;
};

/**
 * Splits a label into its heading and its citations.
 *
 * Two shapes arrive. The records the generator returns are a heading followed
 * by `Source:` / `Role:` / `Excerpt:` / `URL:` lines, repeated once per
 * citation; the highlights baked into older bodies are a single
 * "Web Searched Data: …" sentence. Both read as a heading over one or more
 * citations, so they are rendered the same way.
 *
 * The keys themselves are not shown. "Source" and "Role" answer the same
 * question — where this wording came from and why — so they read as one line,
 * and the words the source supplied need no label above them to be recognised
 * as a quotation. Only the URL keeps a label, because a bare link under an
 * excerpt would read as part of it.
 */
const parseTip = (raw: string): TipContent => {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let title = "";
  const groups: TipGroup[] = [];
  let current: TipGroup | null = null;
  let source = "";
  let lastKey = "";

  const open = () => {
    current = emptyGroup();
    groups.push(current);
    return current;
  };

  lines.forEach((line, index) => {
    const match = KEYED.exec(line);
    const key = match ? match[1].toLowerCase() : "";
    const value = match ? match[2].trim() : line;

    if (index === 0 && key !== "source") {
      const titled = TITLE_KEYED.exec(line);
      if (titled && titled[2]) {
        title = titled[1];
        open().lines.push(titled[2]);
        lastKey = "line";
      } else {
        title = line;
      }
      return;
    }

    if (key === "source") {
      // A new citation starts here; its role, if any, follows on the next line.
      source = stripOwner(value, title);
      open().label = source;
      lastKey = key;
      return;
    }

    const group = current ?? open();

    if (key === "role") {
      group.role = value;
      if (!group.label) group.label = source;
      lastKey = key;
      return;
    }

    if (key === "date") {
      group.date = value;
      lastKey = key;
      return;
    }

    if (key === "excerpt") {
      group.excerpt = value;
      lastKey = key;
      return;
    }

    if (key === "url" || key === "link" || /^https?:\/\//i.test(line)) {
      if (value) group.urls.push(value);
      lastKey = "url";
      return;
    }

    // A wrapped excerpt continues on the next line rather than starting a row.
    if (lastKey === "excerpt" && group.excerpt) group.excerpt += ` ${line}`;
    else group.lines.push(line);
  });

  return { title, groups: groups.filter((group) =>
    group.label || group.role || group.date || group.excerpt ||
    group.urls.length || group.lines.length) };
};

interface TipState {
  content: TipContent;
  /** The highlight's own colour, shown as the card's heading swatch. */
  color: string;
  top?: number;
  bottom?: number;
  left: number;
  maxHeight: number;
}

export interface HighlightTooltipProps {
  /** The element the highlights live in — the editor body. */
  rootRef: React.RefObject<HTMLElement | null>;
  /** Off while the highlight layer itself is hidden. */
  enabled?: boolean;
}

const HighlightTooltip: React.FC<HighlightTooltipProps> = ({ rootRef, enabled = true }) => {
  const [tip, setTip] = useState<TipState | null>(null);
  const activeMark = useRef<HTMLElement | null>(null);
  /**
   * The card itself. A long label scrolls inside it, and that scroll is an
   * event like any other — without this it closed the card it was scrolling.
   */
  const cardRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const hideNow = useCallback(() => {
    clearTimers();
    activeMark.current = null;
    setTip(null);
  }, [clearTimers]);

  useEffect(() => {
    const root = rootRef.current;

    if (!root || !enabled) {
      hideNow();
      return;
    }

    // Where the pointer was when the card was asked for. A highlight is a run
    // of words, not a box: a sentence wrapping over three lines has a bounding
    // box starting at the paragraph's left edge, so anchoring to it put the
    // card at the far left however near the right the pointer actually was.
    const pointer = { x: 0, y: 0 };

    /**
     * The line of the highlight the pointer is on, rather than the whole run.
     * Falls back to the pointer itself, then to the bounding box, so a card is
     * always placed even if the rects do not line up with the cursor.
     */
    const lineUnderPointer = (mark: HTMLElement): DOMRect => {
      const rects = Array.from(mark.getClientRects());

      const onLine = rects.find(
        (rect) =>
          pointer.y >= rect.top - 2 &&
          pointer.y <= rect.bottom + 2 &&
          pointer.x >= rect.left - 2 &&
          pointer.x <= rect.right + 2,
      );

      return (
        onLine ??
        rects.find((rect) => pointer.y >= rect.top - 2 && pointer.y <= rect.bottom + 2) ??
        rects[0] ??
        mark.getBoundingClientRect()
      );
    };

    const show = (mark: HTMLElement) => {
      const text = mark.getAttribute(TOOLTIP_ATTR) ?? "";
      if (!text.trim()) return;

      const rect = lineUnderPointer(mark);
      // Open upwards when the highlight sits near the bottom of the window, so
      // a tooltip on the last paragraph is not cut off by the viewport.
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;

      // Hung just left of the cursor, so the card reads as belonging to the
      // words under it, and clamped to the window at either edge.
      const wanted = (pointer.x || rect.left) - 24;

      activeMark.current = mark;
      setTip({
        content: parseTip(text),
        color: mark.style.backgroundColor || "#e5e7eb",
        ...(openUp
          ? { bottom: window.innerHeight - rect.top + 6 }
          : { top: rect.bottom + 6 }),
        left: Math.max(8, Math.min(wanted, window.innerWidth - TIP_WIDTH - 8)),
        maxHeight: Math.min(320, Math.max(160, openUp ? spaceAbove : spaceBelow)),
      });
    };

    const markFrom = (event: Event): HTMLElement | null => {
      const target = event.target;
      if (!(target instanceof Element)) return null;
      return target.closest(`[${TOOLTIP_ATTR}]`) as HTMLElement | null;
    };

    // Tracked while the pointer is still travelling over the wording, so the
    // card opens where the cursor ended up and not where it entered.
    const handleMove = (event: MouseEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    };

    const handleOver = (event: MouseEvent) => {
      const mark = markFrom(event);
      if (!mark) return;

      handleMove(event);

      // Already showing this one — the pointer only moved inside it.
      if (mark === activeMark.current) {
        clearTimers();
        return;
      }

      clearTimers();
      // The short delay stops cards flickering open as the pointer crosses
      // highlights on its way somewhere else.
      openTimer.current = setTimeout(() => show(mark), 140);
    };

    const handleOut = (event: MouseEvent) => {
      if (!markFrom(event)) return;

      if (openTimer.current) {
        clearTimeout(openTimer.current);
        openTimer.current = null;
      }

      // Long enough to travel from the wording into the card, which cancels it.
      hideTimer.current = setTimeout(hideNow, 220);
    };

    // Capture: the body can sit inside its own scroller, and a card positioned
    // against the viewport would otherwise drift away from its wording. The
    // card's own scrolling is left alone, so a long label can be read.
    const handleScroll = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && cardRef.current?.contains(target)) return;
      hideNow();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") hideNow();
    };

    root.addEventListener("mouseover", handleOver);
    root.addEventListener("mousemove", handleMove);
    root.addEventListener("mouseout", handleOut);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", hideNow);
    document.addEventListener("keydown", handleKey);

    return () => {
      root.removeEventListener("mouseover", handleOver);
      root.removeEventListener("mousemove", handleMove);
      root.removeEventListener("mouseout", handleOut);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", hideNow);
      document.removeEventListener("keydown", handleKey);
      clearTimers();
    };
  }, [rootRef, enabled, hideNow, clearTimers]);

  useEffect(() => clearTimers, [clearTimers]);

  if (!tip) return null;

  return createPortal(
    <div
      ref={cardRef}
      onMouseEnter={clearTimers}
      onMouseLeave={() => {
        hideTimer.current = setTimeout(hideNow, 160);
      }}
      style={{
        position: "fixed",
        top: tip.top,
        bottom: tip.bottom,
        left: tip.left,
        width: TIP_WIDTH,
        maxHeight: tip.maxHeight,
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
      {tip.content.title && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: tip.content.groups.length ? 10 : 0,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              background: tip.color,
              border: "1px solid rgba(15, 23, 42, 0.12)",
              flex: "0 0 auto",
            }}
          />
          <span style={{ fontWeight: 600 }}>{tip.content.title}</span>
        </div>
      )}

      {tip.content.groups.map((group, index) => (
        <div
          key={`group-${index}`}
          style={
            index
              ? {
                  // One rule between citations — the only thing separating two
                  // of them once the keys that used to announce them are gone.
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: "1px solid #eef0f3",
                }
              : undefined
          }
        >
          {/* The citation and the wording it supplied read as one sentence,
              with the role in bold: it is the part that says why the words are
              there, and the only thing worth finding at a glance. */}
          {(group.label || group.role || group.excerpt) && (
            <p
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {group.label && <span style={{ color: "#374151" }}>{group.label}: </span>}
              {group.role && <strong style={{ fontWeight: 600 }}>{group.role}</strong>}
              {group.excerpt && (
                <>
                  {(group.label || group.role) && " : "}
                  {linkifyText(group.excerpt)}
                </>
              )}
            </p>
          )}

          {group.date && (
            // Under the sentence, not inside it: it says how old the evidence
            // is, which is a caveat on the citation rather than part of it.
            <div style={{ marginTop: 2, fontSize: 12, color: "#6b7280" }}>
              {group.date}
            </div>
          )}

          {group.lines.map((line, lineIndex) => (
            <p
              key={`line-${lineIndex}`}
              style={{
                margin:
                  group.label || group.role || group.date || group.excerpt || lineIndex
                    ? "4px 0 0"
                    : 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {linkifyText(line)}
            </p>
          ))}

          {group.urls.map((url, urlIndex) => (
            <p
              key={`url-${urlIndex}`}
              style={{ margin: "6px 0 0", wordBreak: "break-word" }}
            >
              <span style={{ fontWeight: 600, color: "#6b7280" }}>Source: </span>
              {linkifyText(url)}
            </p>
          ))}
        </div>
      ))}
    </div>,
    document.body,
  );
};

export default HighlightTooltip;
