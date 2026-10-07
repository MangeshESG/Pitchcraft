import React from "react";

/**
 * Turns the URLs inside plain text into anchors.
 *
 * Validation comments and source labels arrive as free text with the evidence
 * written into the sentence, so the link is there but dead — this makes it
 * clickable without the caller having to know where in the string it sits.
 */

/** Bare domains are matched too: the model writes "www.accessintel.com" freely. */
const URL_PATTERN = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi;

/**
 * Drops the sentence's punctuation off the end of a match — a URL ending a
 * sentence would otherwise carry the full stop, and a bracketed one the
 * closing bracket, into the href.
 */
const trimTrailingPunctuation = (url: string): string => {
  let out = url;

  while (out && /[.,;:!?'"”»)\]}]$/.test(out)) {
    if (out.endsWith(")")) {
      const opens = (out.match(/\(/g) ?? []).length;
      const closes = (out.match(/\)/g) ?? []).length;
      // A closing bracket the URL opened itself belongs to the URL.
      if (opens >= closes) break;
    }
    out = out.slice(0, -1);
  }

  return out;
};

export interface LinkifyOptions {
  /** Merged into the anchor's own styling. */
  linkStyle?: React.CSSProperties;
}

/**
 * `text` as React nodes, with every URL replaced by a link that opens in a new
 * tab. Clicks are kept from bubbling, so a link inside a popover that closes
 * on click still reaches the browser.
 */
export const linkifyText = (
  text: string,
  options: LinkifyOptions = {},
): React.ReactNode[] => {
  if (!text) return [];

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  URL_PATTERN.lastIndex = 0;

  while ((match = URL_PATTERN.exec(text)) !== null) {
    const raw = trimTrailingPunctuation(match[0]);
    if (!raw) {
      URL_PATTERN.lastIndex = match.index + match[0].length;
      continue;
    }

    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));

    const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

    nodes.push(
      <a
        key={`lnk-${key++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
        style={{
          color: "#2563eb",
          textDecoration: "underline",
          wordBreak: "break-word",
          ...options.linkStyle,
        }}
      >
        {raw}
      </a>,
    );

    lastIndex = match.index + raw.length;
    URL_PATTERN.lastIndex = lastIndex;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));

  return nodes;
};

export default linkifyText;
