import React from "react";
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

const UI_SIZE_TO_SPAN: Record<string, number> = { sm: 3, md: 4, lg: 6, xl: 12 };

// Expand icon SVG
const ExpandIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </svg>
);

const ElementsTab: React.FC<ElementsTabProps> = ({
  groupedPlaceholders,
  formValues,
  setFormValues,
  onExpandElement,
  saveAllPlaceholders,
  renderPlaceholderInput,
}) => {
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

  const isFieldFilled = (key: string) => {
    const v = formValues[key];
    return !!(v && v.trim().length > 0);
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

          return (
            <details
              key={category}
              open
              style={{
                marginBottom: 8,
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                background: "#fff",
                overflow: "hidden",
              }}
            >
              {/* CATEGORY HEADER */}
              <summary
                style={{
                  listStyle: "none",
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

                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: "transform 0.15s" }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </summary>

              {/* FIELDS GRID */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(12, 1fr)",
                  gap: 10,
                  padding: "12px 14px 16px",
                  borderTop: "1px solid #f3f4f6",
                }}
              >
                {placeholders.map((p) => {
                  const filled = isFieldFilled(p.placeholderKey);
                  return (
                    <div
                      key={p.placeholderKey}
                      style={{
                        gridColumn: `span ${UI_SIZE_TO_SPAN[p.uiSize || "md"]}`,
                        background: filled ? "#f0fdf4" : "#fafafa",
                        border: `1px solid ${filled ? "#bbf7d0" : "#e5e7eb"}`,
                        borderRadius: 8,
                        padding: "9px 11px 10px",
                        transition: "border-color 0.15s, background 0.15s",
                      }}
                    >
                      {/* LABEL ROW */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, overflow: "hidden" }}>
                          {/* Status dot */}
                          <span style={{
                            width: 6, height: 6, borderRadius: "50%",
                            background: filled ? "#22c55e" : "#d1d5db",
                            flexShrink: 0,
                          }} />
                          <span style={{ fontWeight: 600, fontSize: 12, color: "#374151", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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

                        {/* Expand button */}
                        <button
                          onClick={() => onExpandElement(p)}
                          title="Expand to edit or use AI chat"
                          style={{
                            display: "flex", alignItems: "center", gap: 3,
                            padding: "2px 6px",
                            fontSize: 10, fontWeight: 600,
                            borderRadius: 4,
                            border: "1px solid #d1d5db",
                            background: "#fff",
                            color: "#6b7280",
                            cursor: "pointer",
                            flexShrink: 0,
                            whiteSpace: "nowrap",
                            lineHeight: 1.4,
                          }}
                        >
                          <ExpandIcon />
                          Expand
                        </button>
                      </div>

                      {/* INPUT */}
                      <div
                        onPaste={(e) => {
                          e.preventDefault();
                          const pastedText = e.clipboardData.getData("text/plain");
                          const target = e.target as HTMLInputElement | HTMLTextAreaElement;
                          if (!target || !("selectionStart" in target)) return;
                          const start = target.selectionStart ?? 0;
                          const end = target.selectionEnd ?? 0;
                          const newValue = target.value.substring(0, start) + pastedText + target.value.substring(end);
                          setFormValues((prev) => ({ ...prev, [p.placeholderKey]: newValue }));
                          requestAnimationFrame(() => {
                            target.selectionStart = target.selectionEnd = start + pastedText.length;
                          });
                        }}
                      >
                        {renderPlaceholderInput({ ...p, options: p.options || [] })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
};

export default ElementsTab;
