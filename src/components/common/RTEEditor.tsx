import React, { useEffect, useRef, useState } from "react";

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
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const [openMenu, setOpenMenu] = useState<
    null | "color" | "highlight" | "align"
  >(null);

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

  return (
    <div className="w-full" style={{ width: "100%" }}>
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
    </div>
  );
};

export default RichTextEditor;
