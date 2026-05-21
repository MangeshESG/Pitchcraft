import React from "react";
import type { PlaceholderDefinitionUI } from "./EmailCampaignBuilder";
import DOMPurify from "dompurify";

export interface ElementsTabProps {
  groupedPlaceholders: Record<string, PlaceholderDefinitionUI[]>;
  formValues: Record<string, string>;
  setFormValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setExpandedKey: (key: string, friendlyName: string) => void;
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

// Category icon map
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

const sanitizeOnPaste = (html: string) =>
  DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "strong", "i", "em", "u", "br", "p", "ul", "ol", "li", "a"],
    ALLOWED_ATTR: ["href"],
    FORBID_TAGS: ["span", "div"],
    FORBID_ATTR: ["style", "class"],
    KEEP_CONTENT: true,
  });

const ElementsTab: React.FC<ElementsTabProps> = ({
  groupedPlaceholders,
  formValues,
  setFormValues,
  setExpandedKey,
  saveAllPlaceholders,
  renderPlaceholderInput,
}) => {
  const formatCategoryLabel = (cat: string) =>
    cat.toUpperCase();

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

  return (
    <div
      style={{
        padding: "24px 20px 20px",
        height: "calc(100% - 0px)",
        display: "flex",
        flexDirection: "column",
        background: "#fafafa",
      }}
    >
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexShrink: 0 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>Edit elements</h2>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>
            Define the elements that make up your personalized outbound.
          </p>
        </div>
        <button
          onClick={saveAllPlaceholders}
          style={{
            padding: "8px 18px",
            fontSize: 14,
            fontWeight: 700,
            borderRadius: 8,
            border: "none",
            background: "#3f9f42",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          💾 Save
        </button>
      </div>

      {/* SCROLLABLE CATEGORY ACCORDIONS */}
      <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
        {Object.entries(groupedPlaceholders).map(([category, placeholders]) => {
          const filledCount = countFilledFields(placeholders);
          const empty = isCategoryEmpty(placeholders);
          const icon = getCategoryIcon(category);

          return (
            <details
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
              <summary
                style={{
                  listStyle: "none",
                  cursor: "pointer",
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  userSelect: "none",
                }}
              >
                {/* Icon */}
                <div style={{ width: 32, height: 32, background: "#f0fdf4", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                  {icon}
                </div>

                {/* Label */}
                <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: "#111827", letterSpacing: "0.02em" }}>
                  {formatCategoryLabel(category)}
                </span>

                {/* Badge */}
                {empty ? (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "#fef3c7", color: "#d97706", letterSpacing: "0.04em" }}>
                    EMPTY
                  </span>
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "#dcfce7", color: "#16a34a", letterSpacing: "0.04em" }}>
                    {filledCount} FIELD{filledCount !== 1 ? "S" : ""}
                  </span>
                )}

                {/* Chevron */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </summary>

              {/* FIELDS GRID */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(12, 1fr)",
                  gap: 16,
                  padding: "16px 16px 20px",
                  borderTop: "1px solid #f3f4f6",
                  maxHeight: "60vh",
                  overflowY: "auto",
                }}
              >
                {placeholders.map((p) => (
                  <div
                    key={p.placeholderKey}
                    style={{ gridColumn: `span ${UI_SIZE_TO_SPAN[p.uiSize || "md"]}` }}
                  >
                    {/* LABEL */}
                    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: "#374151" }}>{p.friendlyName}</span>
                        {p.helpLink && (
                          <a href={p.helpLink} target="_blank" rel="noopener noreferrer" title="Learn more"
                            style={{ color: "#3f9f42", display: "inline-flex", alignItems: "center" }}
                            onClick={(e) => e.stopPropagation()}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                          </a>
                        )}
                      </div>
                      {p.isExpandable && p.isRichText && (
                        <button
                          onClick={() => setExpandedKey(p.placeholderKey, p.friendlyName)}
                          style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, border: "1px solid #d1d5db", background: "#f9fafb", cursor: "pointer", color: "#374151", whiteSpace: "nowrap" }}>
                          Expand ↗
                        </button>
                      )}
                    </label>

                    {/* INPUT */}
                    <div
                      onPaste={(e) => {
                        e.preventDefault();
                        const pastedText = e.clipboardData.getData("text/plain");
                        const target = e.target as HTMLInputElement | HTMLTextAreaElement;
                        if (!target) return;
                        const start = target.selectionStart ?? 0;
                        const end = target.selectionEnd ?? 0;
                        const newValue = target.value.substring(0, start) + pastedText + target.value.substring(end);
                        setFormValues((prev) => ({ ...prev, [p.placeholderKey]: newValue }));
                        requestAnimationFrame(() => { target.selectionStart = target.selectionEnd = start + pastedText.length; });
                      }}
                    >
                      {renderPlaceholderInput({ ...p, options: p.options || [] })}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
};

export default ElementsTab;
