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
    <div className="elements-tab-container" style={{ padding: "20px" }}>
      <div style={{ display: "flex", gap: "20px" }}>

        {/* LEFT */}
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: "22px", fontWeight: 600, marginBottom: "15px" }}>
            Edit Placeholder Values
          </h2>

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
                {placeholders.map((p: any) => (
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

                      {p.isExpandable && (
                          <button
                            onClick={() =>
                              setExpandedKey(p.placeholderKey, p.friendlyName)
                            }                          
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

                        <div>
                          {renderPlaceholderInput({
                            ...p,
                            options: p.options || []
                          })}

                          {p.inputType === "select" && (
                            <div
                              style={{
                                marginTop: "4px",
                                fontSize: "12px",
                                color: "#6b7280"
                              }}
                            >
                             
                            </div>
                          )}
                        </div>

                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={{ textAlign: "right", marginTop: "20px" }}>
            <button
              onClick={saveAllPlaceholders}
              style={{
                padding: "10px 20px",
                background: "#16a34a",
                color: "#fff",
                borderRadius: "6px",
                fontWeight: 600
              }}
            >
              💾 Save All Changes
            </button>
          </div>
        </div>

        {/* RIGHT */}


      </div>
    </div>
  );
};

export default ElementsTab;
