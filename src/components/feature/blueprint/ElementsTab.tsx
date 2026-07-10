import React, { useState, useEffect, useRef } from "react";
import type { PlaceholderDefinitionUI } from "./EmailCampaignBuilder";
import { defaultButtonStyle } from "../../../styles/buttonStyles";

export interface ElementsTabProps {
  groupedPlaceholders: Record<string, PlaceholderDefinitionUI[]>;
  formValues: Record<string, string>;
  setFormValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onExpandElement: (p: PlaceholderDefinitionUI) => void;
  saveAllPlaceholders: () => void;
  // True while the "Save all" request is in flight. Used to show an inline
  // spinner on the button instead of a full-screen loader overlay.
  isSaving?: boolean;

  // Key of the placeholder currently open in the edit side panel (used to
  // highlight its row in the list). Null when no element is being edited.
  activeElementKey?: string | null;

  dataFiles: any[];
  contacts: any[];
  selectedDataFileId: number | null;
  selectedContactId: number | null;
  handleSelectDataFile: (id: number) => void;
  setSelectedContactId: (id: number | null) => void;
  applyContactPlaceholders: (c: any) => void;

  renderPlaceholderInput: (p: PlaceholderDefinitionUI) => React.ReactNode;
}

// Theme-coloured (green) line icons per category, keyed by lower-cased name.
const CATEGORY_ICON_PATHS: Record<string, React.ReactNode> = {
  "core message focus": (
    <>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </>
  ),
  "your company": (
    <>
      <rect width="16" height="20" x="4" y="2" rx="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
    </>
  ),
  "images": (
    <>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </>
  ),
  "message writing style": (
    <>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </>
  ),
  "dos and don'ts": <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  "greetings & farewells": (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" x2="9.01" y1="9" y2="9" />
      <line x1="15" x2="15.01" y1="9" y2="9" />
    </>
  ),
  "call-to-action": (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  "subject line": (
    <>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </>
  ),
  "extra assets": (
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  ),
  "extra visuals": (
    <>
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </>
  ),
  "smart conditions": (
    <>
      <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
      <path d="m18 2 4 4-4 4" />
      <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" />
      <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" />
      <path d="m18 14 4 4-4 4" />
    </>
  ),
  "search": (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  "vendor": (
    <>
      <rect width="20" height="14" x="2" y="7" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </>
  ),
  "output": (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="m9 18 3-3-3-3" />
    </>
  ),
};

const DEFAULT_ICON_PATH = (
  <>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" x2="8" y1="13" y2="13" />
    <line x1="16" x2="8" y1="17" y2="17" />
    <line x1="10" x2="8" y1="9" y2="9" />
  </>
);

const CategoryIcon: React.FC<{ category: string }> = ({ category }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3f9f42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {CATEGORY_ICON_PATHS[category.toLowerCase()] ?? DEFAULT_ICON_PATH}
  </svg>
);

// Edit (pencil) icon SVG
const EditIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

// External link icon SVG
const LinkIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const URL_REGEX = /^(https?:\/\/|www\.)\S+$/i;

const stripHtml = (html: string) =>
  html
    // Preserve line breaks: turn <br> and block-element ends into newlines
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .trim();

const ElementsTab: React.FC<ElementsTabProps> = ({
  groupedPlaceholders,
  formValues,
  onExpandElement,
  saveAllPlaceholders,
  activeElementKey,
  isSaving = false,
}) => {
  const categories = Object.keys(groupedPlaceholders);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Threshold (chars) beyond which a text value is clamped to a short preview.
  // The full value is always available in the "View and edit" side panel.
  const LONG_TEXT_THRESHOLD = 140;

  // The section that currently holds the active element (e.g. EXAMPLE OUTPUT
  // EMAIL opened on landing). Recomputed each render so it tracks the real
  // category once async placeholders replace the generic "general" fallback.
  const activeCategory = activeElementKey
    ? Object.entries(groupedPlaceholders).find(([, items]) =>
        items.some((p) => p.placeholderKey === activeElementKey),
      )?.[0] ?? null
    : null;

  // Expand the active element's section, re-running only when that category
  // string changes (so the fallback "general" upgrades to the real section).
  // We remember what we last auto-opened so a user collapse/click afterwards is
  // not overridden. With no active element, open the first category once.
  const lastAutoCategoryRef = useRef<string | null>(null);
  const didFallbackOpenRef = useRef(false);
  useEffect(() => {
    if (categories.length === 0) return;
    if (activeCategory) {
      if (lastAutoCategoryRef.current !== activeCategory) {
        setExpandedCategory(activeCategory);
        lastAutoCategoryRef.current = activeCategory;
      }
      return;
    }
    if (!didFallbackOpenRef.current) {
      setExpandedCategory(categories[0]);
      didFallbackOpenRef.current = true;
    }
  }, [activeCategory, categories]);

  const countFilledFields = (placeholders: PlaceholderDefinitionUI[]) =>
    placeholders.filter((p) => {
      const v = formValues[p.placeholderKey];
      return v && v.trim().length > 0;
    }).length;

  const isCategoryEmpty = (placeholders: PlaceholderDefinitionUI[]) =>
    placeholders.every((p) => {
      const v = formValues[p.placeholderKey];
      return !v || !v.trim();
    });

  const getDisplayValue = (key: string) => {
    const raw = formValues[key] ?? "";
    if (!raw || !raw.trim()) return "";
    const isHtml = /<[a-z][\s\S]*>/i.test(raw);
    return (isHtml ? stripHtml(raw) : raw).trim();
  };

  const actionButtonStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 4,
    padding: "4px 10px",
    fontSize: 11, fontWeight: 600,
    borderRadius: 6,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#6b7280",
    cursor: "pointer",
    flexShrink: 0,
    whiteSpace: "nowrap",
    lineHeight: 1.4,
  };

  return (
    <div
      style={{
        padding: "20px 20px 24px",
        display: "flex",
        flexDirection: "column",
        background: "#fafafa",
        minHeight: 0,
      }}
    >
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexShrink: 0 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0 }}>Edit elements</h2>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "3px 0 0" }}>
            Define the elements that make up your personalized outbound.
          </p>
        </div>
        <button
          onClick={saveAllPlaceholders}
          disabled={isSaving}
          style={{
            ...defaultButtonStyle,
            cursor: isSaving ? "not-allowed" : "pointer",
            opacity: isSaving ? 0.75 : 1,
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
          }}
        >
          {isSaving ? (
            <>
              <svg
                width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ animation: "campaign-builder-spin 1s linear infinite" }}
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Saving…
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Save all
            </>
          )}
        </button>
      </div>

      {/* CATEGORY ACCORDIONS */}
      <div style={{ paddingRight: 2 }}>
        {Object.entries(groupedPlaceholders).map(([category, placeholders]) => {
          const filledCount = countFilledFields(placeholders);
          const totalCount = placeholders.length;
          const empty = isCategoryEmpty(placeholders);
          const allFilled = filledCount === totalCount && totalCount > 0;
          const isOpen = expandedCategory === category;

          return (
            <div
              key={category}
              style={{
                marginBottom: 8,
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                background: "#fff",
                overflow: "hidden",
              }}
            >
              {/* CATEGORY HEADER */}
              <div
                onClick={() => setExpandedCategory(isOpen ? null : category)}
                style={{
                  cursor: "pointer",
                  padding: "11px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  userSelect: "none",
                  background: "#f0fdf4",
                }}
              >
                <div style={{
                  width: 28, height: 28,
                  background: "#fff",
                  borderRadius: 6,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <CategoryIcon category={category} />
                </div>

                <span style={{ flex: 1, fontWeight: 700, fontSize: 12, color: "#166534", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {category}
                </span>

                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                  background: empty ? "#fef3c7" : allFilled ? "#dcfce7" : "#f0fdf4",
                  color: empty ? "#d97706" : allFilled ? "#16a34a" : "#3f9f42",
                  letterSpacing: "0.04em",
                }}>
                  {empty ? "EMPTY" : `${filledCount}/${totalCount}`}
                </span>

                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ flexShrink: 0, transition: "transform 0.15s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              {/* FIELD ROWS */}
              {isOpen && (
                <div style={{ borderTop: "1px solid #f3f4f6" }}>
                  {placeholders.map((p, idx) => {
                    const displayValue = getDisplayValue(p.placeholderKey);
                    const isUrl = !!displayValue && URL_REGEX.test(displayValue);
                    const href = /^https?:\/\//i.test(displayValue) ? displayValue : `https://${displayValue}`;
                    const isLongText = !isUrl && displayValue.length > LONG_TEXT_THRESHOLD;
                    const isActive = !!activeElementKey && activeElementKey === p.placeholderKey;

                    return (
                      <div
                        key={p.placeholderKey}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "minmax(160px, 260px) 1fr auto",
                          gap: 16,
                          alignItems: "flex-start",
                          padding: "11px 14px",
                          borderBottom: idx < placeholders.length - 1 ? "1px solid #f3f4f6" : "none",
                          // Highlight the row whose element is open in the edit side panel.
                          background: isActive ? "#f3f4f6" : "transparent",
                        }}
                      >
                        {/* COLUMN 1: NAME */}
                        <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, paddingTop: 1 }}>
                          <span style={{ fontWeight: 600, fontSize: 13, color: "#374151", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {p.friendlyName}
                          </span>
                          {p.helpLink && (
                            <a
                              href={p.helpLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Learn more"
                              style={{ color: "#3f9f42", display: "inline-flex", alignItems: "center", flexShrink: 0 }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="16" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12.01" y2="8" />
                              </svg>
                            </a>
                          )}
                        </div>

                        {/* COLUMN 2: VALUE */}
                        <div style={{ fontSize: 13, minWidth: 0 }}>
                          {!displayValue ? (
                            <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Not set</span>
                          ) : isUrl ? (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{ color: "#3f9f42", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 4, wordBreak: "break-all" }}
                            >
                              <LinkIcon />
                              {displayValue}
                            </a>
                          ) : (
                            <div
                              style={{
                                color: "#111827",
                                lineHeight: 1.5,
                                overflowWrap: "anywhere",
                                whiteSpace: "pre-wrap",
                                ...(isLongText
                                  ? {
                                      display: "-webkit-box",
                                      WebkitLineClamp: 3,
                                      WebkitBoxOrient: "vertical",
                                      overflow: "hidden",
                                    }
                                  : {}),
                              }}
                            >
                              {displayValue}
                            </div>
                          )}
                        </div>

                        {/* COLUMN 3: ACTION */}
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button
                            onClick={() => onExpandElement(p)}
                            title="View and edit this element or use AI chat"
                            style={{
                              ...actionButtonStyle,
                              // Active row's button picks up the theme green so it
                              // reads as the currently-open element.
                              ...(isActive
                                ? { borderColor: "#86efac", background: "#f0fdf4", color: "#3f9f42" }
                                : {}),
                            }}
                          >
                            <EditIcon />
                            View and edit
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ElementsTab;
