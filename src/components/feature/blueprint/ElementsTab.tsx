import React from "react";
import type { PlaceholderDefinitionUI } 
  from "./EmailCampaignBuilder";


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

return (
  <div
    className="elements-tab-container"
    style={{
      padding: "20px",
      height: "100%",          // ✅ take full available height
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
    Edit placeholder values
  </h2>

  {/* EDIT BUTTON */}
<button
  onClick={saveAllPlaceholders}   // ✅ CALL THE SAVE FUNCTION
  style={{
    padding: "6px 14px",
    fontSize: "14px",
    fontWeight: 600,
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    background: "#16a34a",
    color: "#fff",
    cursor: "pointer"
  }}
>
  💾 Save
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
        <div key={category} style={{ marginBottom: "28px" }}>
          <h3
            style={{
              fontSize: "16px",
              fontWeight: 600,
              marginBottom: "12px",
              borderBottom: "1px solid #e5e7eb",
              paddingBottom: "6px"
            }}
          >
            {category}
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
              background: "#fff",
              padding: "16px",
              borderRadius: "8px",
              border: "1px solid #e5e7eb"
            }}
          >
            {placeholders.map((p) => (
              <div key={p.placeholderKey}>
                <label
                  style={{
                    fontWeight: 600,
                    marginBottom: "6px",
                    fontSize: "14px",
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
