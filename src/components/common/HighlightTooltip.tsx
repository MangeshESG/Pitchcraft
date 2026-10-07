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

interface TipRow {
  /** "Source", "Role", "Excerpt" — the label the generator wrote. */
  key?: string;
  value: string;
}

interface TipContent {
  title: string;
  rows: TipRow[];
}

/**
 * Splits a label into its heading and its lines.
 *
 * Two shapes arrive. The records the generator returns are a heading followed
 * by `Source:` / `Role:` / `Excerpt:` lines; the highlights baked into older
 * bodies are a single "Web Searched Data: …" sentence. Both read as a heading
 * plus rows, so they are rendered the same way.
 */
const parseTip = (raw: string): TipContent => {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  // Keys are short and wordlike, so a colon inside a sentence is not read as one.
  const keyed = /^([A-Za-z][A-Za-z /&'-]{0,40}):\s*([\s\S]*)$/;

  let title = "";
  const rows: TipRow[] = [];

  lines.forEach((line, index) => {
    const match = keyed.exec(line);

    if (index === 0) {
      if (match && match[2]) {
        title = match[1];
        rows.push({ value: match[2] });
      } else {
        title = line;
      }
      return;
    }

    if (match && match[2]) rows.push({ key: match[1], value: match[2] });
    else rows.push({ value: line });
  });

  return { title, rows };
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

    const show = (mark: HTMLElement) => {
      const text = mark.getAttribute(TOOLTIP_ATTR) ?? "";
      if (!text.trim()) return;

      const rect = mark.getBoundingClientRect();
      // Open upwards when the highlight sits near the bottom of the window, so
      // a tooltip on the last paragraph is not cut off by the viewport.
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;

      activeMark.current = mark;
      setTip({
        content: parseTip(text),
        color: mark.style.backgroundColor || "#e5e7eb",
        ...(openUp
          ? { bottom: window.innerHeight - rect.top + 6 }
          : { top: rect.bottom + 6 }),
        left: Math.max(8, Math.min(rect.left, window.innerWidth - TIP_WIDTH - 8)),
        maxHeight: Math.min(320, Math.max(160, openUp ? spaceAbove : spaceBelow)),
      });
    };

    const markFrom = (event: Event): HTMLElement | null => {
      const target = event.target;
      if (!(target instanceof Element)) return null;
      return target.closest(`[${TOOLTIP_ATTR}]`) as HTMLElement | null;
    };

    const handleOver = (event: MouseEvent) => {
      const mark = markFrom(event);
      if (!mark) return;

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
    // against the viewport would otherwise drift away from its wording.
    const handleScroll = () => hideNow();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") hideNow();
    };

    root.addEventListener("mouseover", handleOver);
    root.addEventListener("mouseout", handleOut);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    document.addEventListener("keydown", handleKey);

    return () => {
      root.removeEventListener("mouseover", handleOver);
      root.removeEventListener("mouseout", handleOut);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
      document.removeEventListener("keydown", handleKey);
      clearTimers();
    };
  }, [rootRef, enabled, hideNow, clearTimers]);

  useEffect(() => clearTimers, [clearTimers]);

  if (!tip) return null;

  return createPortal(
    <div
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
            marginBottom: tip.content.rows.length ? 8 : 0,
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

      {tip.content.rows.map((row, index) => (
        <p
          key={`${row.key ?? "line"}-${index}`}
          style={{
            margin: index ? "6px 0 0" : 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {row.key && (
            <span style={{ fontWeight: 600, color: "#6b7280" }}>{row.key}: </span>
          )}
          {linkifyText(row.value)}
        </p>
      ))}
    </div>,
    document.body,
  );
};

export default HighlightTooltip;
