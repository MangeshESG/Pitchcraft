import React from "react";
import type { PlaceholderDefinitionUI } from "./EmailCampaignBuilder";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDown, faCircleInfo } from "@fortawesome/free-solid-svg-icons";
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

  renderPlaceholderInput: (p: PlaceholderDefinitionUI) => JSX.Element;
}

const ElementsTab: React.FC<ElementsTabProps> = ({
  groupedPlaceholders,
  setExpandedKey,
  saveAllPlaceholders,
  renderPlaceholderInput,
  setFormValues,
}) => {
  const UI_SIZE_TO_SPAN: Record<string, number> = {
    sm: 3,
    md: 4,
    lg: 6,
    xl: 12,
  };

const formatCategoryLabel = (category: string) =>
  category.toUpperCase();

const sanitizeOnPaste = (html: string) => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "b",
      "strong",
      "i",
      "em",
      "u",
      "br",
      "p",
      "ul",
      "ol",
      "li",
      "a",
    ],
    ALLOWED_ATTR: ["href"],
    FORBID_TAGS: ["span", "div"],
    FORBID_ATTR: ["style", "class"],
    KEEP_CONTENT: true,
  });
};

const sanitizeRichText = (html: string) =>
  DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "strong", "i", "em", "u", "br", "p", "ul", "ol", "li", "a"],
    ALLOWED_ATTR: ["href"],
    FORBID_ATTR: ["style", "class"],
    KEEP_CONTENT: true,
  });

const insertPlainText = (text: string) => {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;

  selection.deleteFromDocument();
  selection.getRangeAt(0).insertNode(document.createTextNode(text));
};




  return (
    <div
      className="elements-tab-container !mt-[0] !rounded-none"
      style={{
        padding: "20px",
        height: "calc(100% - 60px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "15px",
          flexShrink: 0,
        }}
      >
        <h2 style={{ fontSize: "22px", fontWeight: 600 }}>Edit elements</h2>

        <button
          onClick={saveAllPlaceholders}
          style={{
            padding: "6px 14px",
            fontSize: "14px",
            fontWeight: 600,
            borderRadius: "4px",
            border: "1px solid #d1d5db",
            background: "#3f9f42",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Save
        </button>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          paddingRight: "8px",
        }}
      >
        {Object.entries(groupedPlaceholders).map(([category, placeholders]) => (
          <details
            key={category}
            style={{
              marginBottom: "10px",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              background: "#fff",
            }}
          >
            {/* CATEGORY HEADER */}
            <summary
              style={{
                listStyle: "none",
                cursor: "pointer",
                padding: "12px 16px",
                fontSize: "16px",
                fontWeight: 600,
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
            <span style={{ color: "green" }}>
              {formatCategoryLabel(category)}
            </span>



              <FontAwesomeIcon
                icon={faAngleDown}
                style={{ transition: "transform 0.2s ease" }}
              />
            </summary>

            {/* PLACEHOLDERS */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(12, 1fr)",
                gap: "20px",
                padding: "16px",
                maxHeight: "60vh",
                overflowY: "auto",
              }}
            >
              {placeholders.map((p) => (
                <div
                  key={p.placeholderKey}
                  style={{
                    gridColumn: `span ${UI_SIZE_TO_SPAN[p.uiSize || "md"]}`,
                  }}
                >
                  {/* LABEL ROW */}
                  <label
                    style={{
                      fontWeight: 600,
                      marginBottom: "6px",
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                    }}
                  >
                    {/* LEFT: NAME + HELP ICON */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span>{p.friendlyName}</span>

                      {p.helpLink && (
                        <a
                          href={p.helpLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Learn more"
                          style={{
                            color: "#2563eb",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FontAwesomeIcon icon={faCircleInfo} />
                        </a>
                      )}
                    </div>

                    {/* RIGHT: EXPAND */}
                    {p.isExpandable && p.isRichText && (
                      <button
                        onClick={() =>
                          setExpandedKey(p.placeholderKey, p.friendlyName)
                        }
                        style={{
                          fontSize: "12px",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          border: "1px solid #d1d5db",
                          background: "#f9fafb",
                          cursor: "pointer",
                        }}
                      >
                        Expand
                      </button>
                    )}
                  </label>

                  <div
                  onPaste={(e) => {
                    e.preventDefault();

                    const pastedText = e.clipboardData.getData("text/plain");

                    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
                    if (!target) return;

                    const start = target.selectionStart ?? 0;
                    const end = target.selectionEnd ?? 0;

                    const newValue =
                      target.value.substring(0, start) +
                      pastedText +
                      target.value.substring(end);

                    setFormValues(prev => ({
                      ...prev,
                      [p.placeholderKey]: newValue,
                    }));

                    requestAnimationFrame(() => {
                      target.selectionStart = target.selectionEnd = start + pastedText.length;
                    });
                  }}



                  >
                    {renderPlaceholderInput({
                      ...p,
                      options: p.options || [],
                    })}
                  </div>

                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
};

export default ElementsTab;
