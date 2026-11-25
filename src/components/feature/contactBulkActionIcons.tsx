import React from "react";

/**
 * The pictures on the selection bar's actions.
 *
 * Inline SVG drawn in `currentColor` rather than the coloured <img> icons the
 * old selection strip used: the bar tints Delete red on hover and greys an
 * action out while its last click is still running, and a bitmap tinted with a
 * `filter:` chain cannot follow either. One copy here because the list grid,
 * the segment grid and the views grid all show the same six actions.
 */

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const SegmentActionIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path {...stroke} d="M12 3a9 9 0 1 0 9 9h-9V3Z" />
    <path {...stroke} d="M15 3.6A9 9 0 0 1 20.4 9H15V3.6Z" />
  </svg>
);

export const BulkEditActionIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path {...stroke} d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
    <path {...stroke} d="m14.5 6.5 3 3" />
  </svg>
);

export const UnsubscribeActionIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path {...stroke} d="M20.5 11V6.5a1.5 1.5 0 0 0-1.5-1.5H4a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 4 18h7" />
    <path {...stroke} d="m3 6.2 7.6 5.3a2.5 2.5 0 0 0 2.8 0L21 6.2" />
    <circle {...stroke} cx="17.5" cy="17.5" r="4" />
    <path {...stroke} d="M15.5 17.5h4" />
  </svg>
);

export const CloneActionIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect {...stroke} x="9" y="9" width="11" height="11" rx="2" />
    <path {...stroke} d="M15 5.5A1.5 1.5 0 0 0 13.5 4H6a2 2 0 0 0-2 2v7.5A1.5 1.5 0 0 0 5.5 15" />
  </svg>
);

export const DeleteActionIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path {...stroke} d="M4 7h16M10 4h4M9.5 7l.7 12.1a1.5 1.5 0 0 0 1.5 1.4h.6a1.5 1.5 0 0 0 1.5-1.4L14.5 7" />
    <path {...stroke} d="m6.5 7 .8 12.6A1.5 1.5 0 0 0 8.8 21h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
  </svg>
);
