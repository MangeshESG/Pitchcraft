import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import DOMPurify from "dompurify";
import { repairAndParseJsonObject } from "../../utils/jsonRepair";

// Empty-state copy — identical to the Insights tab in Output.tsx.
const EMPTY_ONLINE_RESEARCH =
  "These insights are generated when krafting emails and then saved in the relevant contact.";
const EMPTY_NOTES =
  "No notes were used in the krafting of the email. There may be no notes added for this contact, they may not have been set to include in personalization or they may not be useful in krafting this email.";
const EMPTY_EMAILS =
  "No emails were used in the krafting of the email. There may be no email communications for this contact or they may not be useful in krafting this email.";
const EMPTY_PROFESSIONAL_SUMMARY =
  "No professional summary information was used in the krafting of the email. There may be no professional summary for this contact or it may not be useful in krafting this email.";

type InsightTabKey = "research" | "emails" | "notes" | "summary";

const INSIGHT_TABS: { key: InsightTabKey; label: string }[] = [
  { key: "research", label: "Online research" },
  { key: "emails", label: "Emails" },
  { key: "notes", label: "Notes" },
  { key: "summary", label: "Professional summary" },
];

// Placeholder values used across the app while data loads.
const hasInsightValue = (value?: string) => {
  const text = (value ?? "").trim();
  return text !== "" && !/^(na|n\/a|null|undefined)$/i.test(text);
};

// Renders web-research JSON as cards — identical to Output.tsx "Online research".
const WebResearchCards: React.FC<{ content: string }> = ({ content }) => {
  const data = repairAndParseJsonObject(content);

  if (!data) {
    return (
      <div style={{ padding: "10px", border: "1px solid #e8eaee", borderRadius: "8px", lineHeight: 1.6, fontSize: "13px" }}>
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }

  const cardStyle: React.CSSProperties = {
    background: "#fff", borderRadius: "12px", border: "1px solid #e8eaee", padding: "16px 18px",
  };

  const iconMap: Record<string, string> = {
    company_overview: "🏢", overview: "🏢", company: "🏢",
    key_findings: "💡", findings: "💡", insights: "🔍",
    recent_news: "📰", news: "📰", updates: "📰",
    event_insights: "🗓", events: "🗓", event: "📅",
    personalization_angle: "✉️", personalization: "✉️",
    summary: "📋", products: "📦", services: "🛠",
    leadership: "👤", funding: "💰", competitors: "⚡",
    pain_points: "🎯", opportunities: "🌱", technology: "💻",
    social_media: "📱", contact: "📞",
  };

  const getIcon = (key: string) =>
    iconMap[key] || iconMap[Object.keys(iconMap).find((k) => key.toLowerCase().includes(k)) || ""] || "📌";

  const fmtKey = (key: string) =>
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const renderValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) return null;

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return <p style={{ margin: 0, fontSize: "13px", color: "#374151", lineHeight: 1.6 }}>{String(value)}</p>;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return null;

      if (typeof value[0] !== "object") {
        return (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "7px" }}>
            {value.map((item, i) => (
              <li key={i} style={{ display: "flex", gap: "8px", fontSize: "13px", color: "#374151", lineHeight: 1.5 }}>
                <span style={{ color: "#22c55e", flexShrink: 0, marginTop: "1px" }}>✔</span>
                {String(item)}
              </li>
            ))}
          </ul>
        );
      }

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {value.map((item: Record<string, any>, i) => {
            const entries = Object.entries(item).filter(([, v]) => v != null && String(v).trim() !== "");
            if (entries.length === 0) return null;

            const dateEntry = entries.find(([k]) => /^(date|time|published|when|at)$/i.test(k));
            const contentEntries = entries.filter(([k]) => !/^(date|time|published|when|at)$/i.test(k));

            if (dateEntry && contentEntries.length > 0) {
              const mainText = contentEntries.map(([, v]) => String(v)).join(" — ");
              return (
                <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "11px", color: "#6b7280", whiteSpace: "nowrap", marginTop: "2px", minWidth: "70px" }}>
                    {String(dateEntry[1])}
                  </span>
                  <span style={{ fontSize: "13px", color: "#374151", lineHeight: 1.5 }}>
                    <span style={{ color: "#3f9f42", marginRight: "6px" }}>◆</span>{mainText}
                  </span>
                </div>
              );
            }

            return (
              <div key={i} style={{ padding: "8px 10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                {entries.map(([k, v]) => (
                  <div key={k} style={{ fontSize: "13px", color: "#374151", lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 500 }}>{fmtKey(k)}: </span>{String(v)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      );
    }

    if (typeof value === "object") {
      const entries = Object.entries(value).filter(([, v]) => v != null && String(v).trim() !== "");
      if (entries.length === 0) return null;

      const descEntry = entries.find(([k]) => /description|summary|overview|about/i.test(k));
      const rest = entries.filter(([k]) => !/description|summary|overview|about/i.test(k));
      const useBadges = !rest.some(([, v]) => String(v).length > 35);

      return (
        <div>
          {descEntry && (
            <p style={{ fontSize: "13px", color: "#374151", marginBottom: "10px", lineHeight: 1.55, marginTop: 0 }}>
              {String(descEntry[1])}
            </p>
          )}
          {rest.length > 0 && (
            useBadges ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {rest.map(([k, v]) => {
                  const strVal = String(v);
                  const isUrl = /^https?:\/\//i.test(strVal) || /website|url|link/i.test(k);
                  if (isUrl) {
                    const href = /^https?:\/\//i.test(strVal) ? strVal : `https://${strVal}`;
                    return (
                      <a key={k} href={href} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: "11.5px", background: "#f0fdf4", padding: "3px 10px", borderRadius: "99px", border: "1px solid #bbf7d0", color: "#15803d", textDecoration: "none", whiteSpace: "nowrap" }}>
                        🔗 {strVal}
                      </a>
                    );
                  }
                  return (
                    <span key={k} style={{ fontSize: "11.5px", background: "#f1f5f9", padding: "3px 10px", borderRadius: "99px", border: "1px solid #e2e8f0", color: "#374151", whiteSpace: "nowrap" }}>
                      <span style={{ color: "#6b7280" }}>{fmtKey(k)}: </span>{strVal}
                    </span>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                {rest.map(([k, v]) => {
                  const strVal = String(v);
                  const isUrl = /^https?:\/\//i.test(strVal) || /website|url|link/i.test(k);
                  return (
                    <div key={k} style={{ display: "flex", gap: "8px", fontSize: "13px", alignItems: "flex-start" }}>
                      <span style={{ fontWeight: 500, flexShrink: 0, color: "#6b7280", minWidth: "80px" }}>{fmtKey(k)}:</span>
                      {isUrl ? (
                        <a href={/^https?:\/\//i.test(strVal) ? strVal : `https://${strVal}`} target="_blank" rel="noopener noreferrer"
                          style={{ color: "#15803d", textDecoration: "none" }}>🔗 {strVal}</a>
                      ) : (
                        <span style={{ color: "#374151", lineHeight: 1.5 }}>{strVal}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      );
    }

    return null;
  };

  const entries = Object.entries(data).filter(([, v]) => {
    if (v === null || v === undefined) return false;
    if (typeof v === "string" && v.trim() === "") return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {entries.map(([key, value]) => {
          const isFullWidth = typeof value === "string";
          return (
            <div key={key} style={{ ...cardStyle, ...(isFullWidth ? { gridColumn: "1 / -1", background: "#f8fafc", borderColor: "#e2e8f0" } : {}) }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <span style={{ fontSize: "17px" }}>{getIcon(key)}</span>
                <span style={{ fontWeight: 600, fontSize: "13.5px", color: "#111827" }}>{fmtKey(key)}</span>
              </div>
              {renderValue(value)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface RichTextEditorProps {
  value: string;
  height?: number;
  onChange: (html: string) => void;
  /** When true the editor grows with its content (uses `height` as a minimum)
   *  instead of being a fixed-height box with an inner scrollbar. */
  autoGrow?: boolean;
  /** Preview mode: content isn't editable and the formatting controls are
   *  hidden, so the toolbar carries only the action buttons. */
  readOnly?: boolean;
  showActionButtons?: boolean;
  outputEmailWidth?: string;
  isCopyText?: boolean;
  openDeviceDropdown?: boolean;
  onDeviceDropdownToggle?: () => void;
  onDeviceWidthChange?: (width: string) => void;
  onCopyToClipboard?: () => void;
  onExpandEditor?: () => void;

  // ── Action bar (rendered only when showActionButtons is true) ──
  /** Highlight toggle (on/off) — controlled by the parent. */
  highlightActive?: boolean;
  onToggleHighlight?: () => void;
  /** Regenerate action — the button only renders when this is provided. */
  onRegenerate?: () => void;
  /** Spins the regenerate icon and blocks repeat clicks. */
  isRegenerating?: boolean;
  /** Greys out regenerate (e.g. no contact selected / reset not enabled). */
  regenerateDisabled?: boolean;
  /** Render the device-preview (desktop / tab / mobile) control in the action
   *  bar. Leave false when the host already shows its own device toolbar. */
  showDeviceButton?: boolean;
  /** Final prompt (admin only) shown in the info panel. */
  finalPrompt?: string;
  /** Online-research data shown in the Insights panel ("Online research" tab). */
  webSearchData?: string;
  /** Email conversation used in the krafting ("Emails" tab). */
  insightEmails?: string;
  /** Notes used in the krafting ("Notes" tab). */
  insightNotes?: string;
  /** Professional (LinkedIn) summary used in the krafting ("Professional summary" tab). */
  insightProfessionalSummary?: string;
  /** Override admin detection (defaults to sessionStorage "isAdmin"). */
  isAdmin?: boolean;
  /** Show ONLY the web-search / final-prompt buttons (no copy/edit/expand/highlight).
   *  Use when the host already has its own copy/expand toolbar. */
  infoButtonsOnly?: boolean;
  /** Reserve this many px on the right of the action bar so it clears a
   *  host-provided absolute toolbar (e.g. a device-preview dropdown). */
  reserveRight?: number;
}

// Gmail-style font list
const FONT_FAMILIES: { label: string; value: string }[] = [
  { label: "Sans Serif", value: "arial, helvetica, sans-serif" },
  { label: "Serif", value: "'times new roman', serif" },
  { label: "Fixed Width", value: "'courier new', monospace" },
  { label: "Wide", value: "'arial black', sans-serif" },
  { label: "Narrow", value: "'arial narrow', sans-serif" },
  { label: "Comic Sans MS", value: "'comic sans ms', cursive" },
  { label: "Garamond", value: "garamond, serif" },
  { label: "Georgia", value: "georgia, serif" },
  { label: "Tahoma", value: "tahoma, sans-serif" },
  { label: "Trebuchet MS", value: "'trebuchet ms', sans-serif" },
  { label: "Verdana", value: "verdana, sans-serif" },
];

// Word / Gmail point sizes. execCommand only understands the 1-7 scale, so
// these are applied as real px values (see applyFontSize).
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

// Gmail-style color palette
const COLOR_PALETTE: string[] = [
  "#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#efefef", "#ffffff",
  "#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#4a86e8", "#0000ff",
  "#9900ff", "#ff00ff", "#e06666", "#f6b26b", "#ffd966", "#93c47d", "#76a5af", "#6fa8dc",
  "#8e7cc3", "#c27ba0", "#cc0000", "#e69138", "#f1c232", "#6aa84f", "#45818e", "#3d85c6",
];

/* Self-contained toolbar styles (inline) so host-page CSS — full-width
 * selects, global button rules, etc. — cannot distort the toolbar. The
 * editor is used in Output, Inbox and Contact notes which all have very
 * different surrounding styles. */
const tbStyles: Record<string, React.CSSProperties> = {
  toolbar: {
    display: "flex",
    // Compact enough that formatting + action controls sit on one row at normal
    // widths; wrapping is kept only as a fallback for very narrow containers
    // (e.g. the mobile device preview).
    flexWrap: "wrap",
    alignItems: "center",
    gap: "1px",
    padding: "4px 6px",
    background: "#f8f9fa",
    border: "1px solid #d1d5db",
    borderTopLeftRadius: "6px",
    borderTopRightRadius: "6px",
  },
  select: {
    flex: "0 0 auto",
    width: "auto",
    height: "26px",
    fontSize: "11px",
    lineHeight: "24px",
    padding: "0 2px",
    margin: 0,
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    background: "#ffffff",
    color: "#374151",
    cursor: "pointer",
    boxSizing: "border-box",
  },
  btn: {
    flex: "0 0 auto",
    height: "26px",
    minWidth: "26px",
    padding: "0 4px",
    margin: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    borderRadius: "4px",
    fontSize: "13px",
    lineHeight: 1,
    color: "#374151",
    cursor: "pointer",
    boxSizing: "border-box",
  },
  divider: {
    flex: "0 0 auto",
    width: "1px",
    height: "20px",
    background: "#d1d5db",
    margin: "0 4px",
  },
  menu: {
    position: "absolute",
    zIndex: 50,
    top: "100%",
    left: 0,
    marginTop: "4px",
    padding: "8px",
    background: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  },
  swatch: {
    width: "18px",
    height: "18px",
    padding: 0,
    border: "1px solid #e5e7eb",
    borderRadius: "2px",
    cursor: "pointer",
  },
};

// Device-preview widths. "" is the full-width desktop view.
const DEVICE_OPTIONS: { label: string; value: string }[] = [
  { label: "Desktop", value: "" },
  { label: "Tab", value: "Tab" },
  { label: "Mobile", value: "Mobile" },
];

const DEVICE_LABELS: Record<string, string> = {
  "": "Desktop",
  Tab: "Tab",
  Mobile: "Mobile",
};

/** Monitor / tablet / phone glyph for the device-preview control. */
const DeviceIcon: React.FC<{ width: string }> = ({ width }) => {
  const stroke = "#3f9f42";

  if (width === "Mobile") {
    return (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
        <path
          d="M11 18H13M9.2 21H14.8C15.9201 21 16.4802 21 16.908 20.782C17.2843 20.5903 17.5903 20.2843 17.782 19.908C18 19.4802 18 18.9201 18 17.8V6.2C18 5.0799 18 4.51984 17.782 4.09202C17.5903 3.71569 17.2843 3.40973 16.908 3.21799C16.4802 3 15.9201 3 14.8 3H9.2C8.0799 3 7.51984 3 7.09202 3.21799C6.71569 3.40973 6.40973 3.71569 6.21799 4.09202C6 4.51984 6 5.07989 6 6.2V17.8C6 18.9201 6 19.4802 6.21799 19.908C6.40973 20.2843 6.71569 20.5903 7.09202 20.782C7.51984 21 8.07989 21 9.2 21Z"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (width === "Tab") {
    return (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="3" width="16" height="18" rx="1" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="18" r="1" fill={stroke} />
      </svg>
    );
  }

  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="13" rx="2" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <line x1="7.5" y1="21" x2="16.5" y2="21" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="17" x2="12" y2="21" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

/** Toolbar icon button — inline styles + transparent background so the
 *  page's global `button` / `.button` rules can't restyle it. */
const TbButton: React.FC<{
  title: string;
  onAction: () => void;
  children: React.ReactNode;
}> = ({ title, onAction, children }) => (
  <button
    type="button"
    title={title}
    onMouseDown={(e) => {
      e.preventDefault();
      onAction();
    }}
    style={{ ...tbStyles.btn, background: "transparent" }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLButtonElement).style.background = "#e5e7eb";
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
    }}
  >
    {children}
  </button>
);

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  height = 400,
  onChange,
  autoGrow = false,
  readOnly = false,
  showActionButtons = false,
  isCopyText,
  onCopyToClipboard,
  onExpandEditor,
  onRegenerate,
  isRegenerating = false,
  regenerateDisabled = false,
  showDeviceButton = false,
  outputEmailWidth = "",
  openDeviceDropdown = false,
  onDeviceDropdownToggle,
  onDeviceWidthChange,
  finalPrompt,
  webSearchData,
  insightEmails,
  insightNotes,
  insightProfessionalSummary,
  isAdmin,
  infoButtonsOnly = false,
  reserveRight = 0,
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const [openMenu, setOpenMenu] = useState<
    null | "color" | "highlight" | "align" | "indent" | "size"
  >(null);
  // Size shown in the toolbar — follows the caret, like Word / Gmail.
  const [currentFontSize, setCurrentFontSize] = useState(16);

  // ── Action-bar state ──
  const [copied, setCopied] = useState(false);
  const [infoPanel, setInfoPanel] = useState<null | "prompt" | "insights">(null);
  const [insightTab, setInsightTab] = useState<InsightTabKey>("research");
  const [infoCopied, setInfoCopied] = useState(false);
  // Source-highlight toggle (visual only). ON by default, like Output.
  const [highlightsOn, setHighlightsOn] = useState(true);

  const resolvedIsAdmin =
    isAdmin ??
    (typeof window !== "undefined" &&
      window.sessionStorage?.getItem("isAdmin") === "true");

  const writeClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text ?? "");
      return true;
    } catch {
      return false;
    }
  };

  const handleCopyMain = async () => {
    if (onCopyToClipboard) {
      onCopyToClipboard();
      return;
    }
    const ok = await writeClipboard(editorRef.current?.innerText ?? "");
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  // Which insight tabs actually carry information (drives the ✓ markers).
  const insightHasInfo: Record<InsightTabKey, boolean> = {
    research: hasInsightValue(webSearchData),
    emails: hasInsightValue(insightEmails),
    notes: hasInsightValue(insightNotes),
    summary: hasInsightValue(insightProfessionalSummary),
  };

  const activeInsightText =
    insightTab === "research"
      ? webSearchData ?? ""
      : insightTab === "emails"
        ? insightEmails ?? ""
        : insightTab === "notes"
          ? insightNotes ?? ""
          : insightProfessionalSummary ?? "";

  // The copy button copies whatever the panel is currently showing.
  const infoText = infoPanel === "prompt" ? finalPrompt ?? "" : activeInsightText;

  const handleInfoCopy = async () => {
    const ok = await writeClipboard(infoText);
    if (ok) {
      setInfoCopied(true);
      setTimeout(() => setInfoCopied(false), 1500);
    }
  };

  useEffect(() => {
    if (!editorRef.current) return;
    const incoming = value || "";
    // If the value is plain text (no HTML tags) preserve its line breaks by
    // converting newlines to <br> — otherwise innerHTML collapses them to spaces.
    const looksLikeHtml = /<[a-z][\s\S]*>/i.test(incoming);
    const html = looksLikeHtml ? incoming : incoming.replace(/\r\n|\r|\n/g, "<br>");
    if (editorRef.current.innerHTML !== html) {
      editorRef.current.innerHTML = html;
    }
  }, [value]);

  // Close any open toolbar dropdown when clicking outside of it
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const isSelectionInsideEditor = (range: Range) => {
    const editor = editorRef.current;
    if (!editor) return false;
    return editor.contains(range.commonAncestorContainer);
  };

  /** Reads the size actually rendered at the caret so the toolbar can show it. */
  const syncFontSizeFromSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    let node: Node | null = selection.getRangeAt(0).startContainer;
    if (node && node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    if (!(node instanceof HTMLElement) || !editorRef.current?.contains(node)) return;
    const px = Math.round(parseFloat(window.getComputedStyle(node).fontSize));
    if (px > 0) setCurrentFontSize(px);
  };

  const rememberSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (isSelectionInsideEditor(range)) {
      savedSelectionRef.current = range.cloneRange();
      syncFontSizeFromSelection();
    }
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    const range = savedSelectionRef.current;
    if (!selection || !range) return;
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const normalizeUrl = (url: string) => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return "";
    if (/^(https?:|mailto:|tel:|#)/i.test(trimmedUrl)) return trimmedUrl;
    return `https://${trimmedUrl}`;
  };

  const normalizeEditorLinks = () => {
    editorRef.current?.querySelectorAll("a[href]").forEach((link) => {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    });
  };

  const syncEditorValue = () => {
    if (!editorRef.current) return;
    normalizeEditorLinks();
    onChange(editorRef.current.innerHTML);
  };

  const handleCommand = (command: string, value?: string) => {
    // Produce inline-style spans (email friendly) instead of <font> tags
    try {
      document.execCommand("styleWithCSS", false, "true");
    } catch {
      /* ignore — not supported by every browser */
    }
    document.execCommand(command, false, value);
    syncEditorValue();
  };

  /** Restore the remembered selection, then run the command. Used by
   *  dropdown menus (selects / palettes) where interaction steals focus. */
  const commandWithSelection = (command: string, value?: string) => {
    editorRef.current?.focus();
    restoreSelection();
    handleCommand(command, value);
  };

  /** Applies an exact px size. execCommand's fontSize only accepts the legacy
   *  1-7 scale, so tag the selection with size 7 and swap those <font> nodes
   *  for spans carrying the real size (inline styles travel well in email). */
  const applyFontSize = (px: number) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    restoreSelection();

    try {
      // "false" keeps execCommand emitting <font size="7">, which is easy to
      // find again — with styleWithCSS on it produces a CSS keyword instead.
      document.execCommand("styleWithCSS", false, "false");
    } catch {
      /* ignore — not supported by every browser */
    }
    document.execCommand("fontSize", false, "7");

    const replacements: HTMLElement[] = [];
    editor.querySelectorAll('font[size="7"]').forEach((node) => {
      const span = document.createElement("span");
      span.style.fontSize = `${px}px`;
      while (node.firstChild) span.appendChild(node.firstChild);
      node.parentNode?.replaceChild(span, node);
      replacements.push(span);
    });

    // Swapping the nodes drops the selection — put it back over the new spans
    // so consecutive changes (size then bold) keep working on the same text.
    if (replacements.length > 0) {
      const range = document.createRange();
      range.setStartBefore(replacements[0]);
      range.setEndAfter(replacements[replacements.length - 1]);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      savedSelectionRef.current = range.cloneRange();
    }

    setCurrentFontSize(px);
    syncEditorValue();
  };

  const handleCreateLink = () => {
    rememberSelection();
    const href = normalizeUrl(prompt("Enter link URL") || "");
    if (!href) return;

    editorRef.current?.focus();
    restoreSelection();

    const selection = window.getSelection();
    const selectedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    if (selectedRange && !selectedRange.collapsed && isSelectionInsideEditor(selectedRange)) {
      document.execCommand("createLink", false, href);
    } else {
      const link = document.createElement("a");
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = href;
      document.execCommand("insertHTML", false, link.outerHTML);
    }

    syncEditorValue();
  };

  const actionBtnStyle: React.CSSProperties = {
    height: 28,
    minWidth: 28,
    padding: "0 4px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #d1d5db",
    borderRadius: 5,
    background: "#ffffff",
    cursor: "pointer",
    color: "#374151",
    flex: "0 0 auto",
  };

  // Brand green used for all action icons (per design).
  const ICON = "#3f9f42";

  const actionButtonsGroup = (
    <>
      {/* Insights — online research, emails, notes, professional summary */}
      <button
        type="button"
        title="Insights"
        aria-pressed={infoPanel === "insights"}
        onClick={() => setInfoPanel((p) => (p === "insights" ? null : "insights"))}
        style={{ ...actionBtnStyle, background: infoPanel === "insights" ? "#E4F8E8" : "#ffffff" }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={ICON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18h6" />
          <path d="M10 21h4" />
          <path d="M12 3a6 6 0 0 0-3.6 10.8c.5.4.8.9.9 1.5l.1.7h5.2l.1-.7c.1-.6.4-1.1.9-1.5A6 6 0 0 0 12 3Z" />
        </svg>
      </button>

      {!infoButtonsOnly && (
        <>
          {/* Highlight on/off (source highlights) */}
          <button
            type="button"
            title={highlightsOn ? "Hide highlights" : "Show highlights"}
            aria-pressed={highlightsOn}
            onClick={() => setHighlightsOn((v) => !v)}
            style={{ ...actionBtnStyle, background: highlightsOn ? "#E4F8E8" : "#ffffff" }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M9 11L3 17V20H12L15 17" stroke={ICON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22 12L17.4 16.6C16.6189 17.381 15.3526 17.381 14.5716 16.6L9.4 11.4284C8.61895 10.6474 8.61895 9.38104 9.4 8.6L14 4L22 12Z" stroke={ICON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Regenerate */}
          {onRegenerate && (
            <button
              type="button"
              title={isRegenerating ? "Regenerating…" : "Regenerate this email body"}
              aria-label="Regenerate this email body"
              onClick={onRegenerate}
              disabled={isRegenerating || regenerateDisabled}
              style={{
                ...actionBtnStyle,
                cursor: isRegenerating || regenerateDisabled ? "not-allowed" : "pointer",
                opacity: isRegenerating || regenerateDisabled ? 0.6 : 1,
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 16 16"
                fill={ICON}
                style={
                  isRegenerating
                    ? { animation: "rte-spin 1s linear infinite" }
                    : undefined
                }
              >
                <path d="M8 1.5A6.5 6.5 0 001.5 8 .75.75 0 010 8a8 8 0 0113.5-5.81v-.94a.75.75 0 011.5 0v3a.75.75 0 01-.75.75h-3a.75.75 0 010-1.5h1.44A6.479 6.479 0 008 1.5zM15.25 7.25A.75.75 0 0116 8a8 8 0 01-13.5 5.81v.94a.75.75 0 01-1.5 0v-3a.75.75 0 01.75-.75h3a.75.75 0 010 1.5H3.31A6.5 6.5 0 0014.5 8a.75.75 0 01.75-.75z" />
              </svg>
            </button>
          )}

          {/* Copy */}
          <button type="button" title="Copy to clipboard" onClick={handleCopyMain} style={actionBtnStyle}>
            {copied || isCopyText ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M7.29417 12.9577L10.5048 16.1681L17.6729 9" stroke={ICON} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="10" stroke={ICON} strokeWidth="2" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 32 32" fill={ICON}>
                <path d="M26 4.75h-2c-0.69 0-1.25 0.56-1.25 1.25s0.56 1.25 1.25 1.25v0h0.75v21.5h-17.5v-21.5h0.75c0.69 0 1.25-0.56 1.25-1.25s-0.56-1.25-1.25-1.25v0h-2c-0.69 0-1.25 0.56-1.25 1.25v0 24c0 0.69 0.56 1.25 1.25 1.25h20c0.69-0.001 1.249-0.56 1.25-1.25v-24c-0-0.69-0.56-1.25-1.25-1.25h-0zM11 9.249h10c0.69 0 1.25-0.56 1.25-1.25s-0.56-1.25-1.25-1.25v0h-1.137c0.242-0.513 0.385-1.114 0.387-1.748v-0.001c0-2.347-1.903-4.25-4.25-4.25s-4.25 1.903-4.25 4.25v0c0.002 0.635 0.145 1.236 0.398 1.775l-0.011-0.026h-1.137c-0.69 0-1.25 0.56-1.25 1.25s0.56 1.25 1.25 1.25v0zM14.25 5c0-0 0-0.001 0-0.001 0-0.966 0.784-1.75 1.75-1.75s1.75 0.784 1.75 1.75c0 0.966-0.784 1.75-1.75 1.75v0c-0.966-0.001-1.748-0.783-1.75-1.749v-0zM19.957 13.156l-6.44 7.039-1.516-1.506c-0.226-0.223-0.536-0.361-0.878-0.361-0.69 0-1.25 0.56-1.25 1.25 0 0.345 0.14 0.658 0.366 0.884v0l2.44 2.424 0.022 0.015 0.015 0.021c0.074 0.061 0.159 0.114 0.25 0.156l0.007 0.003c0.037 0.026 0.079 0.053 0.123 0.077l0.007 0.003c0.135 0.056 0.292 0.089 0.457 0.089 0.175 0 0.341-0.037 0.491-0.103l-0.008 0.003c0.053-0.031 0.098-0.061 0.14-0.094l-0.003 0.002c0.102-0.050 0.189-0.11 0.268-0.179l-0.001 0.001 0.015-0.023 0.020-0.014 7.318-8c0.203-0.222 0.328-0.518 0.328-0.844 0-0.69-0.559-1.25-1.25-1.25-0.365 0-0.693 0.156-0.921 0.405l-0.001 0.001z" />
              </svg>
            )}
          </button>

          {/* Device preview: desktop / tab / mobile */}
          {showDeviceButton && (
            <div style={{ position: "relative" }}>
              <button
                type="button"
                title={`${DEVICE_LABELS[outputEmailWidth] || "Desktop"} view`}
                aria-label="Preview width"
                aria-expanded={openDeviceDropdown}
                onClick={() => onDeviceDropdownToggle?.()}
                style={{
                  ...actionBtnStyle,
                  background: openDeviceDropdown ? "#E4F8E8" : "#ffffff",
                }}
              >
                <DeviceIcon width={outputEmailWidth} />
              </button>

              {openDeviceDropdown && (
                <div
                  style={{
                    position: "absolute",
                    top: 32,
                    right: 0,
                    zIndex: 60,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    padding: 4,
                    background: "#ffffff",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  }}
                >
                  {DEVICE_OPTIONS.filter((option) => option.value !== outputEmailWidth).map(
                    (option) => (
                      <button
                        key={option.label}
                        type="button"
                        title={`${option.label} view`}
                        aria-label={`${option.label} view`}
                        onClick={() => onDeviceWidthChange?.(option.value)}
                        style={{ ...actionBtnStyle, width: 28 }}
                      >
                        <DeviceIcon width={option.value} />
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>
          )}

          {/* Expand */}
          {onExpandEditor && (
            <button type="button" title="Expand" onClick={onExpandEditor} style={actionBtnStyle}>
              <svg width="17" height="17" viewBox="0 0 512 512">
                <polyline points="304 96 416 96 416 208" fill="none" stroke={ICON} strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
                <line x1="405.77" y1="106.2" x2="111.98" y2="400.02" fill="none" stroke={ICON} strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
                <polyline points="208 416 96 416 96 304" fill="none" stroke={ICON} strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
              </svg>
            </button>
          )}
        </>
      )}

      {/* Final prompt (admin only) */}
      {resolvedIsAdmin && (
        <button
          type="button"
          title="Final prompt (admin)"
          aria-pressed={infoPanel === "prompt"}
          onClick={() => setInfoPanel((p) => (p === "prompt" ? null : "prompt"))}
          style={{ ...actionBtnStyle, background: infoPanel === "prompt" ? "#E4F8E8" : "#ffffff" }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={ICON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
        </button>
      )}
    </>
  );

  return (
    <div className="w-full" style={{ width: "100%" }}>
      {/* Highlight strip is visual-only — keeps the underlying HTML intact.
          The generated spans all carry `cursor:help` (both spacing variants are
          matched because contentEditable may re-serialize the style attribute),
          so every highlight colour is covered, not just the sourced-from one.
          Manual highlights applied from the toolbar have no title/cursor and are
          deliberately left alone. */}
      <style>{`[data-rte-hl="off"] [style*="cursor:help"],
        [data-rte-hl="off"] [style*="cursor: help"],
        [data-rte-hl="off"] [title^="Sourced from"],
        [data-rte-hl="off"] [title^="Personalized"]{background-color:transparent !important;cursor:auto !important;}
        @keyframes rte-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Toolbar (formatting controls + action buttons pinned right) */}
      <div ref={toolbarRef} style={tbStyles.toolbar}>
        {!readOnly && (
        <>
        {/* Font family — width is pinned (min/max too) so nothing can stretch
            the control, and the placeholder is kept short for the same reason. */}
        <select
          onMouseDown={rememberSelection}
          onChange={(e) => {
            if (e.target.value) commandWithSelection("fontName", e.target.value);
            e.target.value = "";
          }}
          style={{ ...tbStyles.select, width: "56px", minWidth: "56px", maxWidth: "56px" }}
          defaultValue=""
          title="Font"
        >
          <option value="" disabled>
            Font
          </option>
          {FONT_FAMILIES.map((font) => (
            <option key={font.label} value={font.value} style={{ fontFamily: font.value }}>
              {font.label}
            </option>
          ))}
        </select>

        {/* Font size — a menu rather than a <select> so the box can show the
            size at the caret and the list can be styled to match the toolbar. */}
        <div style={{ position: "relative", flex: "0 0 auto" }}>
          <button
            type="button"
            title="Font size"
            aria-haspopup="listbox"
            aria-expanded={openMenu === "size"}
            onMouseDown={(e) => {
              e.preventDefault();
              rememberSelection();
              setOpenMenu(openMenu === "size" ? null : "size");
            }}
            style={{
              ...tbStyles.select,
              width: "48px",
              minWidth: "48px",
              maxWidth: "48px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 4px",
              lineHeight: 1,
            }}
          >
            <span>{currentFontSize}</span>
            <span style={{ fontSize: "8px", color: "#6b7280" }}>▼</span>
          </button>

          {openMenu === "size" && (
            <div
              role="listbox"
              style={{
                ...tbStyles.menu,
                padding: "4px 0",
                minWidth: "62px",
                maxHeight: "260px",
                overflowY: "auto",
              }}
            >
              {FONT_SIZES.map((size) => {
                const isActive = size === currentFontSize;
                return (
                  <button
                    key={size}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyFontSize(size);
                      setOpenMenu(null);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "3px 12px",
                      border: "none",
                      background: isActive ? "#E4F8E8" : "transparent",
                      color: isActive ? "#2f7a32" : "#374151",
                      textAlign: "left",
                      cursor: "pointer",
                      lineHeight: 1.35,
                      // Every row reads at the same size — the number is the
                      // label, not a preview.
                      fontSize: "12px",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "#f3f4f6";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <span style={tbStyles.divider} />

        {/* Bold / Italic / Underline / Strikethrough */}
        <TbButton title="Bold (Ctrl+B)" onAction={() => handleCommand("bold")}>
          <b style={{ fontSize: "13px" }}>B</b>
        </TbButton>
        <TbButton title="Italic (Ctrl+I)" onAction={() => handleCommand("italic")}>
          <i style={{ fontSize: "13px", fontFamily: "georgia, serif" }}>I</i>
        </TbButton>
        <TbButton title="Underline (Ctrl+U)" onAction={() => handleCommand("underline")}>
          <u style={{ fontSize: "13px" }}>U</u>
        </TbButton>
        <TbButton title="Strikethrough" onAction={() => handleCommand("strikeThrough")}>
          <s style={{ fontSize: "13px" }}>S</s>
        </TbButton>

        {/* Text color */}
        <div style={{ position: "relative", flex: "0 0 auto" }}>
          <TbButton
            title="Text color"
            onAction={() => {
              rememberSelection();
              setOpenMenu(openMenu === "color" ? null : "color");
            }}
          >
            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                borderBottom: "3px solid #ef4444",
                lineHeight: 1.1,
              }}
            >
              A
            </span>
          </TbButton>
          {openMenu === "color" && (
            <div
              style={{
                ...tbStyles.menu,
                display: "grid",
                gridTemplateColumns: "repeat(8, 18px)",
                gap: "4px",
              }}
            >
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  title={color}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commandWithSelection("foreColor", color);
                    setOpenMenu(null);
                  }}
                  style={{ ...tbStyles.swatch, backgroundColor: color }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Highlight color */}
        <div style={{ position: "relative", flex: "0 0 auto" }}>
          <TbButton
            title="Highlight color"
            onAction={() => {
              rememberSelection();
              setOpenMenu(openMenu === "highlight" ? null : "highlight");
            }}
          >
            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                background: "#fde047",
                padding: "0 3px",
                lineHeight: 1.2,
                borderRadius: "2px",
              }}
            >
              A
            </span>
          </TbButton>
          {openMenu === "highlight" && (
            <div style={{ ...tbStyles.menu, width: "184px" }}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  commandWithSelection("hiliteColor", "transparent");
                  setOpenMenu(null);
                }}
                style={{
                  width: "100%",
                  marginBottom: "6px",
                  fontSize: "11px",
                  padding: "2px 4px",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                None
              </button>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(8, 18px)",
                  gap: "4px",
                }}
              >
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={color}
                    type="button"
                    title={color}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      commandWithSelection("hiliteColor", color);
                      setOpenMenu(null);
                    }}
                    style={{ ...tbStyles.swatch, backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <span style={tbStyles.divider} />

        {/* Alignment */}
        <div style={{ position: "relative", flex: "0 0 auto" }}>
          <TbButton
            title="Align"
            onAction={() => {
              rememberSelection();
              setOpenMenu(openMenu === "align" ? null : "align");
            }}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="2" width="14" height="2" rx="1" />
              <rect x="1" y="7" width="9" height="2" rx="1" />
              <rect x="1" y="12" width="12" height="2" rx="1" />
            </svg>
          </TbButton>
          {openMenu === "align" && (
            <div style={{ ...tbStyles.menu, display: "flex", gap: "2px", padding: "4px" }}>
              <TbButton title="Align left" onAction={() => { commandWithSelection("justifyLeft"); setOpenMenu(null); }}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="1" y="2" width="14" height="2" rx="1" /><rect x="1" y="7" width="9" height="2" rx="1" /><rect x="1" y="12" width="12" height="2" rx="1" />
                </svg>
              </TbButton>
              <TbButton title="Align center" onAction={() => { commandWithSelection("justifyCenter"); setOpenMenu(null); }}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="1" y="2" width="14" height="2" rx="1" /><rect x="3.5" y="7" width="9" height="2" rx="1" /><rect x="2" y="12" width="12" height="2" rx="1" />
                </svg>
              </TbButton>
              <TbButton title="Align right" onAction={() => { commandWithSelection("justifyRight"); setOpenMenu(null); }}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="1" y="2" width="14" height="2" rx="1" /><rect x="6" y="7" width="9" height="2" rx="1" /><rect x="3" y="12" width="12" height="2" rx="1" />
                </svg>
              </TbButton>
              <TbButton title="Justify" onAction={() => { commandWithSelection("justifyFull"); setOpenMenu(null); }}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="1" y="2" width="14" height="2" rx="1" /><rect x="1" y="7" width="14" height="2" rx="1" /><rect x="1" y="12" width="14" height="2" rx="1" />
                </svg>
              </TbButton>
            </div>
          )}
        </div>

        {/* Lists */}
        <TbButton title="Numbered list" onAction={() => handleCommand("insertOrderedList")}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <text x="0" y="4.5" fontSize="4.5" fontFamily="arial">1</text>
            <text x="0" y="9.5" fontSize="4.5" fontFamily="arial">2</text>
            <text x="0" y="14.5" fontSize="4.5" fontFamily="arial">3</text>
            <rect x="5" y="1.5" width="10" height="1.8" rx="0.9" />
            <rect x="5" y="6.5" width="10" height="1.8" rx="0.9" />
            <rect x="5" y="11.5" width="10" height="1.8" rx="0.9" />
          </svg>
        </TbButton>
        <TbButton title="Bulleted list" onAction={() => handleCommand("insertUnorderedList")}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="2" cy="2.5" r="1.4" />
            <circle cx="2" cy="7.5" r="1.4" />
            <circle cx="2" cy="12.5" r="1.4" />
            <rect x="5" y="1.5" width="10" height="1.8" rx="0.9" />
            <rect x="5" y="6.5" width="10" height="1.8" rx="0.9" />
            <rect x="5" y="11.5" width="10" height="1.8" rx="0.9" />
          </svg>
        </TbButton>

        {/* Indent — one button; hovering reveals increase / decrease */}
        <div
          style={{ position: "relative", flex: "0 0 auto" }}
          onMouseEnter={() => setOpenMenu("indent")}
          onMouseLeave={() => setOpenMenu((m) => (m === "indent" ? null : m))}
        >
          <TbButton title="Indent" onAction={() => handleCommand("indent")}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="1.5" width="14" height="1.8" rx="0.9" />
              <rect x="7" y="5" width="8" height="1.8" rx="0.9" />
              <rect x="7" y="8.5" width="8" height="1.8" rx="0.9" />
              <rect x="1" y="12" width="14" height="1.8" rx="0.9" />
              <path d="M1.5 6l3 2-3 2z" />
            </svg>
          </TbButton>
          {openMenu === "indent" && (
            // No top margin — a gap between button and flyout would break the
            // hover chain and close the menu while the pointer crosses it.
            <div style={{ ...tbStyles.menu, marginTop: 0, display: "flex", gap: "2px", padding: "4px" }}>
              <TbButton title="Indent more" onAction={() => handleCommand("indent")}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="1" y="1.5" width="14" height="1.8" rx="0.9" />
                  <rect x="7" y="5" width="8" height="1.8" rx="0.9" />
                  <rect x="7" y="8.5" width="8" height="1.8" rx="0.9" />
                  <rect x="1" y="12" width="14" height="1.8" rx="0.9" />
                  <path d="M1.5 6l3 2-3 2z" />
                </svg>
              </TbButton>
              <TbButton title="Indent less" onAction={() => handleCommand("outdent")}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="1" y="1.5" width="14" height="1.8" rx="0.9" />
                  <rect x="7" y="5" width="8" height="1.8" rx="0.9" />
                  <rect x="7" y="8.5" width="8" height="1.8" rx="0.9" />
                  <rect x="1" y="12" width="14" height="1.8" rx="0.9" />
                  <path d="M4.5 6l-3 2 3 2z" />
                </svg>
              </TbButton>
            </div>
          )}
        </div>

        <span style={tbStyles.divider} />

        {/* Link / Image */}
        <TbButton title="Insert link" onAction={handleCreateLink}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </TbButton>
        <TbButton
          title="Insert image"
          onAction={() => {
            const url = prompt("Enter image URL");
            if (url) handleCommand("insertImage", url);
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </TbButton>

        {/* Remove formatting */}
        <TbButton title="Remove formatting" onAction={() => handleCommand("removeFormat")}>
          <span style={{ fontSize: "12px" }}>
            <s>T</s>
            <sub style={{ fontSize: "9px" }}>x</sub>
          </span>
        </TbButton>
        </>
        )}

        {/* Action buttons pinned to the right of the toolbar.
            In infoButtonsOnly mode the host already has its own top-right
            toolbar (copy/expand/save), so reserve space to sit left of it. */}
        {showActionButtons && (
          <span
            style={{
              marginLeft: "auto",
              // Reserve space so the bar clears a host-provided absolute toolbar
              // (e.g. the device-preview dropdown) sitting at the top-right.
              marginRight: reserveRight,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              flex: "0 0 auto",
              paddingLeft: 8,
            }}
          >
            {actionButtonsGroup}
          </span>
        )}
      </div>

      {/* Editor + info view — editor stays mounted so its content survives toggling */}
      <div className="rich-text-editor">
        <div
          ref={editorRef}
          contentEditable={!readOnly}
          suppressContentEditableWarning
          data-rte-hl={highlightsOn ? "on" : "off"}
          className="p-3 outline-none"
          style={{
            border: "1px solid #d1d5db",
            borderTop: "none",
            borderBottomLeftRadius: "6px",
            borderBottomRightRadius: "6px",
            padding: "12px",
            outline: "none",
            background: "#ffffff",
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
            wordWrap: "break-word",
            overflowWrap: "break-word",
            overflowX: "auto",
            // Hidden (not unmounted) while the info view is shown.
            display: infoPanel ? "none" : "block",
            // No internal vertical scroller — grow with content.
            minHeight: height,
            overflowY: "visible",
          }}
          onInput={syncEditorValue}
          onBlur={syncEditorValue}
          onMouseUp={rememberSelection}
          onKeyUp={rememberSelection}
          onClick={(e) => {
            if (!(e.target instanceof Element)) return;
            const target = e.target as HTMLElement;
            const link = target.closest('a[href]') as HTMLAnchorElement | null;
            if (link?.href) {
              e.preventDefault();
              window.open(link.href, "_blank", "noopener,noreferrer");
              return;
            }

            const summary = target.closest('summary');
            const details: Element | null =
              summary?.closest('details') || target.closest('[data-reply-email-trail]');

            if (details?.hasAttribute('data-reply-email-trail')) {
              e.preventDefault();
              if (details instanceof HTMLDetailsElement) {
                details.open = !details.open;
              } else {
                const isOpen = details.getAttribute('data-trail-open') === 'true';
                details.setAttribute('data-trail-open', isOpen ? 'false' : 'true');
                const body = details.querySelector('.contact-reply-trail-body') as HTMLElement | null;
                if (body) body.style.display = isOpen ? 'none' : 'block';
              }
              onChange(e.currentTarget.innerHTML);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              e.preventDefault();
              document.execCommand("insertHTML", false, "&nbsp;&nbsp;&nbsp;&nbsp;");
            }
          }}
        />

        {/* Info view — shown in place of the editor; same bordered area as the
            email body, grows with content (no nested box, no inner scroller). */}
        {infoPanel && (
          <div
            style={{
              position: "relative",
              border: "1px solid #d1d5db",
              borderTop: "none",
              borderBottomLeftRadius: "6px",
              borderBottomRightRadius: "6px",
              padding: "12px 14px",
              background: "#ffffff",
              width: "100%",
              boxSizing: "border-box",
              minHeight: height,
              height: "auto",
              maxHeight: "none",
              overflow: "visible",
            }}
          >
            <button
              type="button"
              title="Copy"
              onClick={handleInfoCopy}
              style={{ ...actionBtnStyle, position: "absolute", top: 8, right: 8, height: 28, minWidth: "auto", padding: "0 10px", fontSize: 12, zIndex: 1 }}
            >
              {infoCopied ? "Copied!" : "Copy"}
            </button>
            {infoPanel === "insights" ? (
              <div style={{ paddingRight: 64 }}>
                {/* Sub-tabs — same set as the Insights tab in Output */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {INSIGHT_TABS.map((tab) => {
                    const isActive = insightTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setInsightTab(tab.key)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 999,
                          fontSize: 12.5,
                          fontWeight: 500,
                          lineHeight: 1.4,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          border: `1px solid ${isActive ? ICON : "#e5e7eb"}`,
                          background: isActive ? "#E4F8E8" : "#ffffff",
                          color: isActive ? "#2f7a32" : "#374151",
                        }}
                      >
                        {tab.label}
                        {insightHasInfo[tab.key] && (
                          <sup title="Information available" style={{ color: ICON, marginLeft: 3, fontSize: "0.85em" }}>
                            ✓
                          </sup>
                        )}
                      </button>
                    );
                  })}
                </div>

                {insightTab === "research" &&
                  (insightHasInfo.research ? (
                    <WebResearchCards content={webSearchData as string} />
                  ) : (
                    <div style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.5 }}>
                      {EMPTY_ONLINE_RESEARCH}
                    </div>
                  ))}

                {insightTab === "emails" &&
                  (insightHasInfo.emails ? (
                    <div
                      style={{ fontSize: 13, lineHeight: 1.5, color: "#374151", wordBreak: "break-word" }}
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize((insightEmails || "").replace(/\n/g, "<br/>")),
                      }}
                    />
                  ) : (
                    <div style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.5 }}>{EMPTY_EMAILS}</div>
                  ))}

                {insightTab === "notes" &&
                  (insightHasInfo.notes ? (
                    <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 13, lineHeight: 1.5, color: "#374151" }}>
                      {insightNotes}
                    </div>
                  ) : (
                    <div style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.5 }}>{EMPTY_NOTES}</div>
                  ))}

                {insightTab === "summary" &&
                  (insightHasInfo.summary ? (
                    <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 13, lineHeight: 1.5, color: "#374151" }}>
                      {insightProfessionalSummary}
                    </div>
                  ) : (
                    <div style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.5 }}>
                      {EMPTY_PROFESSIONAL_SUMMARY}
                    </div>
                  ))}
              </div>
            ) : (
              // A plain div (NOT <pre>) so global `pre` CSS can't add a bordered,
              // max-height scroll box. Preserves line breaks, wraps, grows.
              <div
                style={{
                  margin: 0,
                  paddingRight: 64,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: "#374151",
                  maxHeight: "none",
                  overflow: "visible",
                }}
              >
                {finalPrompt?.trim() ? finalPrompt : "No final prompt available."}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default RichTextEditor;
