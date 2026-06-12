import React, { useState, useEffect, useRef } from "react";
import type { PlaceholderDefinitionUI } from "./EmailCampaignBuilder";

export interface ElementsTabProps {
  groupedPlaceholders: Record<string, PlaceholderDefinitionUI[]>;
  formValues: Record<string, string>;
  setFormValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onExpandElement: (p: PlaceholderDefinitionUI) => void;
  saveAllPlaceholders: () => void;

  dataFiles: any[];
  contacts: any[];
  selectedDataFileId: number | null;
  selectedContactId: number | null;
  handleSelectDataFile: (id: number) => void;
  setSelectedContactId: (id: number | null) => void;
  applyContactPlaceholders: (c: any) => void;

  renderPlaceholderInput: (p: PlaceholderDefinitionUI) => React.ReactNode;
}

const CATEGORY_ICONS: Record<string, string> = {
  "your company": "🏢",
  "images": "🖼️",
  "message writing style": "✍️",
  "dos and don'ts": "⚡",
  "greetings & farewells": "👋",
  "call-to-action": "🎯",
  "subject line": "📧",
  "core message focus": "💡",
  "extra assets": "📎",
  "extra visuals": "🎨",
  "smart conditions": "🔀",
  "general": "📋",
};

const getCategoryIcon = (cat: string) => CATEGORY_ICONS[cat.toLowerCase()] ?? "📋";

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
  html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

const ElementsTab: React.FC<ElementsTabProps> = ({
  groupedPlaceholders,
  formValues,
  onExpandElement,
  saveAllPlaceholders,
}) => {
  const categories = Object.keys(groupedPlaceholders);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Open the first category once, on initial load. After that the user is free to
  // collapse it (expandedCategory === null) without it springing back open.
  const didInitOpenRef = useRef(false);
  useEffect(() => {
    if (!didInitOpenRef.current && categories.length > 0) {
      setExpandedCategory(categories[0]);
      didInitOpenRef.current = true;
    }
  }, [categories]);

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
          style={{
            padding: "7px 16px",
            fontSize: 13,
            fontWeight: 700,
            borderRadius: 8,
            border: "none",
            background: "#3f9f42",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          Save all
        </button>
      </div>

      {/* CATEGORY ACCORDIONS */}
      <div style={{ paddingRight: 2 }}>
        {Object.entries(groupedPlaceholders).map(([category, placeholders]) => {
          const filledCount = countFilledFields(placeholders);
          const totalCount = placeholders.length;
          const empty = isCategoryEmpty(placeholders);
          const icon = getCategoryIcon(category);
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
                  background: "#fff",
                }}
              >
                <div style={{
                  width: 28, height: 28,
                  background: "#f0fdf4",
                  borderRadius: 6,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, flexShrink: 0,
                }}>
                  {icon}
                </div>

                <span style={{ flex: 1, fontWeight: 700, fontSize: 12, color: "#374151", letterSpacing: "0.06em", textTransform: "uppercase" }}>
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

                    return (
                      <div
                        key={p.placeholderKey}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "minmax(160px, 260px) 1fr auto",
                          gap: 16,
                          alignItems: "center",
                          padding: "11px 14px",
                          borderBottom: idx < placeholders.length - 1 ? "1px solid #f3f4f6" : "none",
                        }}
                      >
                        {/* COLUMN 1: NAME */}
                        <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
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
                        <div style={{
                          fontSize: 13,
                          color: displayValue ? "#111827" : "#9ca3af",
                          fontStyle: displayValue ? "normal" : "italic",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          minWidth: 0,
                        }}>
                          {displayValue ? (
                            isUrl ? (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                style={{ color: "#3f9f42", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 4 }}
                              >
                                <LinkIcon />
                                {displayValue}
                              </a>
                            ) : displayValue
                          ) : "Not set"}
                        </div>

                        {/* COLUMN 3: ACTION */}
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button onClick={() => onExpandElement(p)} title="Edit this element or use AI chat" style={actionButtonStyle}>
                            <EditIcon />
                            Edit
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
