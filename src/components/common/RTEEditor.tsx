import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

interface RichTextEditorProps {
  value: string;
  height?: number;
  onChange: (html: string) => void;
  /** When true the editor grows with its content (uses `height` as a minimum)
   *  instead of being a fixed-height box with an inner scrollbar. */
  autoGrow?: boolean;
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
  /** Edit action. */
  onEdit?: () => void;
  /** Final prompt (admin only) shown in the info panel. */
  finalPrompt?: string;
  /** Web-search data shown in the info panel. */
  webSearchData?: string;
  /** Override admin detection (defaults to sessionStorage "isAdmin"). */
  isAdmin?: boolean;
  /** Show ONLY the web-search / final-prompt buttons (no copy/edit/expand/highlight).
   *  Use when the host already has its own copy/expand toolbar. */
  infoButtonsOnly?: boolean;
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

// Gmail-style sizes mapped to execCommand fontSize values (1-7)
const FONT_SIZES: { label: string; value: string }[] = [
  { label: "Small", value: "1" },
  { label: "Normal", value: "3" },
  { label: "Large", value: "5" },
  { label: "Huge", value: "7" },
];

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
    flexWrap: "wrap",
    alignItems: "center",
    gap: "2px",
    padding: "4px 6px",
    background: "#f8f9fa",
    border: "1px solid #d1d5db",
    borderTopLeftRadius: "6px",
    borderTopRightRadius: "6px",
  },
  select: {
    flex: "0 0 auto",
    width: "auto",
    height: "28px",
    fontSize: "12.5px",
    lineHeight: "26px",
    padding: "0 4px",
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
    height: "28px",
    minWidth: "28px",
    padding: "0 5px",
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
  showActionButtons = false,
  isCopyText,
  onCopyToClipboard,
  onExpandEditor,
  onEdit,
  finalPrompt,
  webSearchData,
  isAdmin,
  infoButtonsOnly = false,
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const [openMenu, setOpenMenu] = useState<
    null | "color" | "highlight" | "align"
  >(null);

  // ── Action-bar state ──
  const [copied, setCopied] = useState(false);
  const [infoPanel, setInfoPanel] = useState<null | "prompt" | "websearch">(null);
  const [infoCopied, setInfoCopied] = useState(false);
  // Source-highlight toggle (visual only). ON by default, like Output.
  const [highlightsOn, setHighlightsOn] = useState(true);

  // Light version of Output's getWebSearchDisplayText — so web-search renders
  // the same way (markdown, bare-domain links become clickable).
  const normalizeWebSearch = (raw?: string) =>
    (raw || "")
      .replace(/\\n/g, "\n")
      .replace(
        /\((?!\[|https?:\/\/)([a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s)]*)?)\)/gi,
        (_m, url) => {
          const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
          return `([${url}](${href}))`;
        },
      )
      .replace(/\n{3,}/g, "\n\n")
      .trim();

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

  const infoText = infoPanel === "prompt" ? finalPrompt ?? "" : webSearchData ?? "";

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

  const rememberSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (isSelectionInsideEditor(range)) {
      savedSelectionRef.current = range.cloneRange();
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
    height: 40,
    minWidth: 40,
    padding: "0 8px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    background: "#ffffff",
    cursor: "pointer",
    color: "#374151",
  };

  return (
    <div className="w-full" style={{ width: "100%" }}>
      {/* Highlight strip is visual-only — keeps the underlying HTML intact */}
      <style>{`[data-rte-hl="off"] [title^="Sourced from"]{background-color:transparent !important;cursor:auto !important;}`}</style>

      {infoPanel ? (
        /* ── Info view shown IN PLACE OF the email body ── */
        <div
          style={{
            border: "1px solid #d1d5db",
            borderRadius: 6,
            background: "#ffffff",
            height,
            overflow: "auto",
            padding: "12px 14px",
            boxSizing: "border-box",
          }}
        >
          {infoPanel === "websearch" ? (
            webSearchData?.trim() ? (
              <div style={{ fontSize: 13, lineHeight: 1.5, color: "#374151", wordBreak: "break-word" }}>
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p style={{ margin: "0 0 8px" }}>{children}</p>,
                    ul: ({ children }) => <ul style={{ margin: "0 0 8px 18px", padding: 0 }}>{children}</ul>,
                    ol: ({ children }) => <ol style={{ margin: "0 0 8px 18px", padding: 0 }}>{children}</ol>,
                    li: ({ children }) => <li style={{ margin: "0 0 4px" }}>{children}</li>,
                    a: ({ children, href }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", textDecoration: "underline" }}>
                        {children}
                      </a>
                    ),
                  }}
                >
                  {normalizeWebSearch(webSearchData)}
                </ReactMarkdown>
              </div>
            ) : (
              <div style={{ color: "#9ca3af", fontSize: 13 }}>No online research available.</div>
            )
          ) : (
            <pre
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: 12.5,
                lineHeight: 1.5,
                color: "#374151",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
              }}
            >
              {finalPrompt?.trim() ? finalPrompt : "No final prompt available."}
            </pre>
          )}
        </div>
      ) : (
        <>
      {/* Toolbar */}
      <div ref={toolbarRef} style={tbStyles.toolbar}>
        {/* Font family */}
        <select
          onMouseDown={rememberSelection}
          onChange={(e) => {
            if (e.target.value) commandWithSelection("fontName", e.target.value);
            e.target.value = "";
          }}
          style={{ ...tbStyles.select, width: "104px" }}
          defaultValue=""
          title="Font"
        >
          <option value="" disabled>
            Sans Serif
          </option>
          {FONT_FAMILIES.map((font) => (
            <option key={font.label} value={font.value} style={{ fontFamily: font.value }}>
              {font.label}
            </option>
          ))}
        </select>

        {/* Font size */}
        <select
          onMouseDown={rememberSelection}
          onChange={(e) => {
            if (e.target.value) commandWithSelection("fontSize", e.target.value);
            e.target.value = "";
          }}
          style={{ ...tbStyles.select, width: "72px" }}
          defaultValue=""
          title="Size"
        >
          <option value="" disabled>
            Size
          </option>
          {FONT_SIZES.map((size) => (
            <option key={size.value} value={size.value}>
              {size.label}
            </option>
          ))}
        </select>

        {/* Heading */}
        <select
          onMouseDown={rememberSelection}
          onChange={(e) => {
            if (e.target.value) commandWithSelection("formatBlock", e.target.value);
            e.target.value = "";
          }}
          style={{ ...tbStyles.select, width: "76px" }}
          defaultValue=""
          title="Paragraph style"
        >
          <option value="" disabled>
            Normal
          </option>
          <option value="p">Normal</option>
          <option value="h1">H1</option>
          <option value="h2">H2</option>
          <option value="h3">H3</option>
        </select>

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

        {/* Indent / Outdent */}
        <TbButton title="Indent less" onAction={() => handleCommand("outdent")}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <rect x="1" y="1.5" width="14" height="1.8" rx="0.9" />
            <rect x="7" y="5" width="8" height="1.8" rx="0.9" />
            <rect x="7" y="8.5" width="8" height="1.8" rx="0.9" />
            <rect x="1" y="12" width="14" height="1.8" rx="0.9" />
            <path d="M4.5 6l-3 2 3 2z" />
          </svg>
        </TbButton>
        <TbButton title="Indent more" onAction={() => handleCommand("indent")}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <rect x="1" y="1.5" width="14" height="1.8" rx="0.9" />
            <rect x="7" y="5" width="8" height="1.8" rx="0.9" />
            <rect x="7" y="8.5" width="8" height="1.8" rx="0.9" />
            <rect x="1" y="12" width="14" height="1.8" rx="0.9" />
            <path d="M1.5 6l3 2-3 2z" />
          </svg>
        </TbButton>

        {/* Quote */}
        <TbButton title="Quote" onAction={() => handleCommand("formatBlock", "blockquote")}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3.5 4C2 4 1 5.3 1 7c0 1.6 1 2.7 2.4 2.7-.2 1.2-1 2-2.1 2.4l.5 1.2C4 12.7 5.5 11 5.5 8.4 5.5 5.7 4.7 4 3.5 4zM10.5 4C9 4 8 5.3 8 7c0 1.6 1 2.7 2.4 2.7-.2 1.2-1 2-2.1 2.4l.5 1.2c2.2-.6 3.7-2.3 3.7-4.9C12.5 5.7 11.7 4 10.5 4z" />
          </svg>
        </TbButton>

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
      </div>

      {/* Editor */}
      <div className="rich-text-editor">
        <div
          ref={editorRef}
          contentEditable
          data-rte-hl={highlightsOn ? "on" : "off"}
          className={`p-3 outline-none ${autoGrow ? "" : "overflow-auto"}`}
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
            /* overflowX creates a block formatting context so floated email
             * content is contained (no content spilling past the bottom
             * border) and wide content scrolls inside the editor instead of
             * stretching the page. */
            overflowX: "auto",
            ...(autoGrow
              ? { minHeight: height, overflowY: "auto" }
              : { height, overflowY: "auto" }),
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
      </div>
        </>
      )}

      {/* ── Action bar UNDER the box (opt-in) — icons match Output ── */}
      {showActionButtons && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 2px", flexWrap: "wrap" }}>
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
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M9 11L3 17V20H12L15 17" stroke={highlightsOn ? "#3f9f42" : "#000000"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M22 12L17.4 16.6C16.6189 17.381 15.3526 17.381 14.5716 16.6L9.4 11.4284C8.61895 10.6474 8.61895 9.38104 9.4 8.6L14 4L22 12Z" stroke={highlightsOn ? "#3f9f42" : "#000000"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Edit */}
              {onEdit && (
                <button type="button" title="Edit" onClick={onEdit} style={actionBtnStyle}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3.99997H6C4.89543 3.99997 4 4.8954 4 5.99997V18C4 19.1045 4.89543 20 6 20H18C19.1046 20 20 19.1045 20 18V12M18.4142 8.41417L19.5 7.32842C20.281 6.54737 20.281 5.28104 19.5 4.5C18.7189 3.71895 17.4526 3.71895 16.6715 4.50001L15.5858 5.58575M18.4142 8.41417L12.3779 14.4505C12.0987 14.7297 11.7431 14.9201 11.356 14.9975L8.41422 15.5858L9.00257 12.6441C9.08001 12.2569 9.27032 11.9013 9.54951 11.6221L15.5858 5.58575M18.4142 8.41417L15.5858 5.58575" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}

              {/* Copy */}
              <button type="button" title="Copy to clipboard" onClick={handleCopyMain} style={actionBtnStyle}>
                {copied || isCopyText ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M7.29417 12.9577L10.5048 16.1681L17.6729 9" stroke="#3f9f42" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="12" r="10" stroke="#3f9f42" strokeWidth="2" />
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 32 32" fill="#000000">
                    <path d="M26 4.75h-2c-0.69 0-1.25 0.56-1.25 1.25s0.56 1.25 1.25 1.25v0h0.75v21.5h-17.5v-21.5h0.75c0.69 0 1.25-0.56 1.25-1.25s-0.56-1.25-1.25-1.25v0h-2c-0.69 0-1.25 0.56-1.25 1.25v0 24c0 0.69 0.56 1.25 1.25 1.25h20c0.69-0.001 1.249-0.56 1.25-1.25v-24c-0-0.69-0.56-1.25-1.25-1.25h-0zM11 9.249h10c0.69 0 1.25-0.56 1.25-1.25s-0.56-1.25-1.25-1.25v0h-1.137c0.242-0.513 0.385-1.114 0.387-1.748v-0.001c0-2.347-1.903-4.25-4.25-4.25s-4.25 1.903-4.25 4.25v0c0.002 0.635 0.145 1.236 0.398 1.775l-0.011-0.026h-1.137c-0.69 0-1.25 0.56-1.25 1.25s0.56 1.25 1.25 1.25v0zM14.25 5c0-0 0-0.001 0-0.001 0-0.966 0.784-1.75 1.75-1.75s1.75 0.784 1.75 1.75c0 0.966-0.784 1.75-1.75 1.75v0c-0.966-0.001-1.748-0.783-1.75-1.749v-0zM19.957 13.156l-6.44 7.039-1.516-1.506c-0.226-0.223-0.536-0.361-0.878-0.361-0.69 0-1.25 0.56-1.25 1.25 0 0.345 0.14 0.658 0.366 0.884v0l2.44 2.424 0.022 0.015 0.015 0.021c0.074 0.061 0.159 0.114 0.25 0.156l0.007 0.003c0.037 0.026 0.079 0.053 0.123 0.077l0.007 0.003c0.135 0.056 0.292 0.089 0.457 0.089 0.175 0 0.341-0.037 0.491-0.103l-0.008 0.003c0.053-0.031 0.098-0.061 0.14-0.094l-0.003 0.002c0.102-0.050 0.189-0.11 0.268-0.179l-0.001 0.001 0.015-0.023 0.020-0.014 7.318-8c0.203-0.222 0.328-0.518 0.328-0.844 0-0.69-0.559-1.25-1.25-1.25-0.365 0-0.693 0.156-0.921 0.405l-0.001 0.001z" />
                  </svg>
                )}
              </button>

              {/* Expand */}
              {onExpandEditor && (
                <button type="button" title="Expand" onClick={onExpandEditor} style={actionBtnStyle}>
                  <svg width="24" height="24" viewBox="0 0 512 512">
                    <polyline points="304 96 416 96 416 208" fill="none" stroke="#000000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
                    <line x1="405.77" y1="106.2" x2="111.98" y2="400.02" fill="none" stroke="#000000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
                    <polyline points="208 416 96 416 96 304" fill="none" stroke="#000000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
                  </svg>
                </button>
              )}
            </>
          )}

          {/* Web search data (all users) */}
          <button
            type="button"
            title="Web search data"
            aria-pressed={infoPanel === "websearch"}
            onClick={() => setInfoPanel((p) => (p === "websearch" ? null : "websearch"))}
            style={{ ...actionBtnStyle, background: infoPanel === "websearch" ? "#E4F8E8" : "#ffffff" }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={infoPanel === "websearch" ? "#3f9f42" : "#000000"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </button>

          {/* Final prompt (admin only) */}
          {resolvedIsAdmin && (
            <button
              type="button"
              title="Final prompt (admin)"
              aria-pressed={infoPanel === "prompt"}
              onClick={() => setInfoPanel((p) => (p === "prompt" ? null : "prompt"))}
              style={{ ...actionBtnStyle, background: infoPanel === "prompt" ? "#E4F8E8" : "#ffffff" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={infoPanel === "prompt" ? "#3f9f42" : "#000000"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
            </button>
          )}

          {/* Copy the shown info view */}
          {infoPanel && (
            <button
              type="button"
              title="Copy shown content"
              onClick={handleInfoCopy}
              style={{ ...actionBtnStyle, minWidth: "auto", padding: "0 10px", fontSize: 12 }}
            >
              {infoCopied ? "Copied!" : "Copy"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;
