import React from "react";
import type { PlaceholderDefinitionUI } 
  from "./EmailCampaignBuilder";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDown } from "@fortawesome/free-solid-svg-icons";


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

  dataFiles,
  contacts,
  selectedDataFileId,
  selectedContactId,
  handleSelectDataFile,
  setSelectedContactId,
  applyContactPlaceholders
}) => {

  const UI_SIZE_TO_SPAN: Record<string, number> = {
    sm: 3,  // 25%
    md: 4,  // 33.33%
    lg: 6,  // 50%
    xl: 12  // 100%
  };

return (
  <div
    className="elements-tab-container !mt-[0] !rounded-none "
    style={{
      padding: "20px",
      height: "calc(100% - 60px)",          // ✅ take full available height
      display: "flex",
      flexDirection: "column"
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "15px",
        flexShrink: 0
      }}
    >
      <h2 style={{ fontSize: "22px", fontWeight: 600 }}>
        Edit elements
      </h2>

      {/* EDIT BUTTON */}
    <button
      onClick={saveAllPlaceholders}   // ✅ CALL THE SAVE FUNCTION
      style={{
        padding: "6px 14px",
        fontSize: "14px",
        fontWeight: 600,
        borderRadius: "4px",
        border: "1px solid #d1d5db",
        background: "#3f9f42",
        color: "#fff",
        cursor: "pointer"
      }}
    >
      Save
    </button>

    </div>


    {/* ✅ SCROLLABLE CONTENT */}
    <div
      style={{
        flex: 1,               // ✅ takes remaining height
        overflowY: "auto",     // ✅ enables scrolling
        paddingRight: "8px"
      }}
    >
      {Object.entries(groupedPlaceholders).map(([category, placeholders]) => (
        <div key={category}>
         
          <details
            key={category}
            style={{
              marginBottom: "10px",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              background: "#fff"
            }}
          >
            {/* Accordion Title */}
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
                justifyContent: "space-between"
              }}
            >
              <span style={{ color: "green", textTransform: "uppercase" }}>
                {category}
              </span>

              <FontAwesomeIcon
                icon={faAngleDown}
                className="accordion-chevron"
                style={{ transition: "transform 0.2s ease" }}
              />
            </summary>

            {/* Accordion Body (Input) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(12, 1fr)",
                gap: "20px",
                padding: "16px",
                maxHeight: "60vh",       // ⭐ LIMIT HEIGHT
                overflowY: "auto"        // ⭐ ENABLE SCROLLING
              }}
            >
              {placeholders.map((p) => (
                <div
                  key={p.placeholderKey}
                  style={{
                    gridColumn: `span ${UI_SIZE_TO_SPAN[p.uiSize || "md"]}`
                  }}
                >
                  <label
                    style={{
                      fontWeight: 600,
                      marginBottom: "6px",
                      fontSize: "13px",
                      display: "flex",
                      justifyContent: "space-between"
                    }}
                  >
                    {p.friendlyName}

                  {p.isExpandable && p.isRichText && (
                    <button
                      onClick={() => setExpandedKey(p.placeholderKey, p.friendlyName)}
                      style={{
                        fontSize: "12px",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        border: "1px solid #d1d5db",
                        background: "#f9fafb"
                      }}
                    >
                      Expand
                    </button>
                  )}
                </label>

                  {renderPlaceholderInput({
                    ...p,
                    options: p.options || []
                  })}
                </div>
              ))}
            </div>
          </details>

        </div>
      ))}
    </div>

    {/* FOOTER (fixed) */}
    <div
      style={{
        flexShrink: 0,
        textAlign: "right",
        marginTop: "12px"
      }}
    >

    </div>
  </div>
);

};

export default ElementsTab;
