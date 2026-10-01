/**
 * Source highlights for a krafted email.
 *
 * The generator returns the email body as clean HTML and the highlights as
 * separate records. Nothing is painted into the body itself, so the stored
 * email is exactly what the prospect receives and nothing has to be stripped
 * out of it before sending.
 *
 * These helpers do the other half: locate each record's wording inside the
 * rendered body and wrap it, so the colour and the hover tooltip are produced
 * here rather than by the model.
 */

export interface EmailHighlight {
  /** Verbatim slice of the email's visible text, as the generator returned it. */
  text: string;
  /** Source that owns the wording — the category names from the blueprint. */
  owner?: string;
  /** Tooltip shown on hover. Free text from the generator. */
  label?: string;
  /** Which occurrence of `text` to paint when the wording repeats, 1-based. */
  occurrence?: number;
}

/** Marks a span this module created, so it can be removed again exactly. */
export const HIGHLIGHT_ATTR = "data-pk-hl";

/**
 * Owner → background colour. These are the blueprint's own source colours;
 * changing a colour here restyles every email, including ones generated
 * before the change, because the body no longer carries the colour.
 */
const OWNER_COLORS: Record<string, string> = {
  internet_search: "#CFFAF2",
  notes: "#FDE2EF",
  email_history: "#EDE7FF",
  linkedin_information: "#E4F8E8",
  exact: "#FFF1B8",
  alternative: "#DDEBFF",
  personalized_for_prospect: "#F4EBDD",
};

/**
 * Keyword → colour, used when a record has no owner the map recognises.
 * Labels are free text, so this reads the tooltip rather than giving up.
 */
const LABEL_KEYWORDS: Array<[RegExp, string]> = [
  [/internet|web ?search|online|research/i, OWNER_COLORS.internet_search],
  [/note/i, OWNER_COLORS.notes],
  [/email|conversation|thread|history/i, OWNER_COLORS.email_history],
  [/linkedin/i, OWNER_COLORS.linkedin_information],
  [/exact/i, OWNER_COLORS.exact],
  [/alternative/i, OWNER_COLORS.alternative],
  [/personal/i, OWNER_COLORS.personalized_for_prospect],
];

/** Neutral grey, so an unrecognised source still highlights and still hovers. */
const FALLBACK_COLOR = "#EEF0F3";

export const highlightColor = (highlight: EmailHighlight): string => {
  const owner = (highlight.owner ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (owner && OWNER_COLORS[owner]) return OWNER_COLORS[owner];

  const label = highlight.label ?? "";
  for (const [pattern, color] of LABEL_KEYWORDS) {
    if (pattern.test(label)) return color;
  }

  return FALLBACK_COLOR;
};

/**
 * Reads highlights from whatever the API handed over: the array the
 * generation endpoint returns, or the JSON string stored on the contact row.
 * Anything unreadable yields an empty list — the email still renders, just
 * without highlights.
 */
export const parseEmailHighlights = (raw: unknown): EmailHighlight[] => {
  if (!raw) return [];

  let value = raw;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      value = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(value)) return [];

  return value
    .map((item: any): EmailHighlight | null => {
      if (!item || typeof item !== "object") return null;
      const text = String(item.text ?? item.Text ?? "").trim();
      if (!text) return null;
      return {
        text,
        owner: String(item.owner ?? item.Owner ?? "").trim(),
        label: String(item.label ?? item.Label ?? "").trim(),
        occurrence: Number(item.occurrence ?? item.Occurrence ?? 1) || 1,
      };
    })
    .filter((item): item is EmailHighlight => item !== null);
};

// ── locating the wording ──

interface TextSlot {
  node: Text;
  /** Where this node's text starts in the document-order concatenation. */
  start: number;
}

/**
 * Every text node under `root`, in document order, skipping anything already
 * inside a highlight so two records cannot wrap the same words twice.
 */
const collectTextSlots = (root: HTMLElement): { slots: TextSlot[]; text: string } => {
  const slots: TextSlot[] = [];
  let text = "";

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = (node as Text).parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest(`[${HIGHLIGHT_ATTR}]`)) return NodeFilter.FILTER_REJECT;
      if (parent.closest("script,style")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let current = walker.nextNode() as Text | null;
  while (current) {
    slots.push({ node: current, start: text.length });
    text += current.data;
    current = walker.nextNode() as Text | null;
  }

  return { slots, text };
};

/**
 * Whitespace-collapsed copy of `source`, plus the original index of each
 * character kept. Matching runs on this so a snippet still lines up when the
 * HTML wrapped a line, indented a tag, or used &nbsp; between words.
 */
const normalizeWithMap = (source: string): { text: string; map: number[] } => {
  let text = "";
  const map: number[] = [];
  let pendingSpace = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    //   is &nbsp; — the editor emits it freely, the model never does.
    const isSpace = /\s/.test(char) || char === " ";

    if (isSpace) {
      pendingSpace = text.length > 0;
      continue;
    }

    if (pendingSpace) {
      text += " ";
      map.push(i);
      pendingSpace = false;
    }

    text += char;
    map.push(i);
  }

  return { text, map };
};

/**
 * Wraps [start, end) of the document-order text in highlight spans.
 *
 * One record can span several text nodes — a sentence containing a bold word
 * or a link, or wording that runs across a paragraph boundary. Each node gets
 * its own span rather than one span across the boundary, which keeps the HTML
 * valid and matches how the generator is told to describe them.
 */
const wrapRange = (
  slots: TextSlot[],
  start: number,
  end: number,
  decorate: (span: HTMLSpanElement) => void,
): boolean => {
  let wrapped = false;

  for (const slot of slots) {
    const slotEnd = slot.start + slot.node.data.length;
    if (slotEnd <= start || slot.start >= end) continue;

    const from = Math.max(start - slot.start, 0);
    const to = Math.min(end - slot.start, slot.node.data.length);
    if (to <= from) continue;

    // Whitespace-only fragments at a boundary add an empty-looking highlight.
    if (!slot.node.data.slice(from, to).trim()) continue;

    let target = slot.node;
    if (to < target.data.length) target.splitText(to);
    if (from > 0) target = target.splitText(from);

    const span = document.createElement("span");
    decorate(span);
    target.parentNode?.insertBefore(span, target);
    span.appendChild(target);
    wrapped = true;
  }

  return wrapped;
};

export interface ApplyHighlightsResult {
  applied: number;
  /** Records whose wording was not found — usually hand-edited since krafting. */
  missed: number;
}

/**
 * Paints `highlights` into `root`, replacing any previously painted ones.
 *
 * A record whose wording is no longer in the body is skipped and counted.
 * The body is never rewritten to make a record fit: an edited sentence simply
 * loses its highlight.
 */
export const applyHighlights = (
  root: HTMLElement,
  highlights: EmailHighlight[],
): ApplyHighlightsResult => {
  stripHighlights(root);

  let applied = 0;
  let missed = 0;

  for (const highlight of highlights) {
    const needle = normalizeWithMap(highlight.text).text;
    if (!needle) continue;

    // Re-collected each time: wrapping splits text nodes, so the offsets from
    // the previous pass no longer describe the tree.
    const { slots, text } = collectTextSlots(root);
    const haystack = normalizeWithMap(text);

    const wanted = Math.max(highlight.occurrence ?? 1, 1);
    let found = -1;
    let searchFrom = 0;

    for (let n = 0; n < wanted; n += 1) {
      found = haystack.text.toLowerCase().indexOf(needle.toLowerCase(), searchFrom);
      if (found < 0) break;
      searchFrom = found + 1;
    }

    if (found < 0) {
      missed += 1;
      continue;
    }

    const start = haystack.map[found];
    const end = haystack.map[found + needle.length - 1] + 1;

    const color = highlightColor(highlight);
    const label = highlight.label || highlight.owner || "";

    const wrapped = wrapRange(slots, start, end, (span) => {
      span.setAttribute(HIGHLIGHT_ATTR, highlight.owner || "1");
      span.setAttribute("style", `background-color:${color};cursor:help;`);
      if (label) span.setAttribute("title", label);
    });

    if (wrapped) applied += 1;
    else missed += 1;
  }

  return { applied, missed };
};

/**
 * Removes every span this module added, leaving the body as it was. Called
 * before the editor's content is read back, so what gets saved and sent is
 * the clean email rather than the decorated view of it.
 */
export const stripHighlights = (root: HTMLElement): void => {
  const marks = Array.from(root.querySelectorAll(`[${HIGHLIGHT_ATTR}]`));

  for (const mark of marks) {
    const parent = mark.parentNode;
    if (!parent) continue;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
  }

  // splitText left the wording in several adjacent text nodes; rejoining them
  // keeps the saved HTML identical to what arrived.
  if (marks.length) root.normalize();
};

/** Same as {@link stripHighlights}, for an HTML string. */
export const stripHighlightsFromHtml = (html: string): string => {
  if (!html || html.indexOf(HIGHLIGHT_ATTR) === -1) return html;

  const holder = document.createElement("div");
  holder.innerHTML = html;
  stripHighlights(holder);
  return holder.innerHTML;
};
