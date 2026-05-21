import React, { useState, useEffect } from "react";
import RichTextEditor from "../../common/RTEEditor";
import ElementsTab from "./ElementsTab";
import type { PlaceholderDefinitionUI } from "./EmailCampaignBuilder";

type BuildSubTab = "chat" | "elements";

export interface BlueprintBuilderPanelProps {
  // Controlled build sub-tab (owned by parent)
  activeBuildTab: "chat" | "elements";
  setActiveBuildTab: (v: "chat" | "elements") => void;

  // Phase-wizard callbacks (new)
  onApprove?: () => void;
  onStartConversation?: (method: "reference" | "description", initialMessage: string) => void;

  // Chat / conversation state
  conversationStarted: boolean;
  messages: any[];
  isTyping: boolean;
  isComplete: boolean;
  currentAnswer: string;
  setCurrentAnswer: (v: string) => void;
  handleSendMessage: () => void;
  handleKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  resetAll: () => void;
  isEditMode: boolean;
  selectedPlaceholder: string;
  onPlaceholderSelect: (key: string) => void;
  setIsTyping: (v: boolean) => void;

  // Placeholder / element state
  placeholderValues: Record<string, string>;
  groupedPlaceholders: Record<string, PlaceholderDefinitionUI[]>;
  formValues: Record<string, string>;
  setFormValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  renderPlaceholderInput: (p: PlaceholderDefinitionUI) => React.ReactNode;
  saveAllPlaceholders: () => Promise<void>;

  // Example output / email preview
  exampleOutput: string;
  editableExampleOutput: string;
  setEditableExampleOutput: React.Dispatch<React.SetStateAction<string>>;
  filledTemplate: string;
  isPreviewLoading: boolean;
  regenerateExampleOutput: () => Promise<void>;
  saveExampleEmail: () => Promise<void>;
  isPreviewAllowed: boolean;

  // Data files / contacts
  dataFiles: any[];
  contacts: any[];
  selectedDataFileId: number | null;
  selectedContactId: number | null;
  handleSelectDataFile: (id: number) => void;
  setSelectedContactId: React.Dispatch<React.SetStateAction<number | null>>;
  applyContactPlaceholders: (contact: any) => Promise<void>;

  // Stages data (for preview panel)
  searchResults: string[];
  allSourcedData: string;
  sourcedSummary: string;

  // Edit mode context
  editTemplateId: number | null;
  initialExampleEmail: string;
  selectedElement: string | null;

  // Image upload
  attachedImages: string[];
  setAttachedImages: React.Dispatch<React.SetStateAction<string[]>>;
  handleImageUpload: (file: File) => Promise<void>;

  // Sub-components passed as props to avoid circular module imports
  ConversationTabComponent: React.ComponentType<any>;
  ExampleOutputPanelComponent: React.ComponentType<any>;
}

const BlueprintBuilderPanel: React.FC<BlueprintBuilderPanelProps> = ({
  activeBuildTab,
  setActiveBuildTab,
  conversationStarted,
  messages,
  isTyping,
  isComplete,
  currentAnswer,
  setCurrentAnswer,
  handleSendMessage,
  handleKeyPress,
  resetAll,
  isEditMode,
  selectedPlaceholder,
  onPlaceholderSelect,
  setIsTyping,
  placeholderValues,
  groupedPlaceholders,
  formValues,
  setFormValues,
  renderPlaceholderInput,
  saveAllPlaceholders,
  exampleOutput,
  editableExampleOutput,
  setEditableExampleOutput,
  filledTemplate,
  isPreviewLoading,
  regenerateExampleOutput,
  saveExampleEmail,
  isPreviewAllowed,
  dataFiles,
  contacts,
  selectedDataFileId,
  selectedContactId,
  handleSelectDataFile,
  setSelectedContactId,
  applyContactPlaceholders,
  searchResults,
  allSourcedData,
  sourcedSummary,
  editTemplateId,
  initialExampleEmail,
  selectedElement,
  attachedImages,
  setAttachedImages,
  handleImageUpload,
  ConversationTabComponent,
  ExampleOutputPanelComponent,
  onApprove,
  onStartConversation,
}) => {
  const [isSectionOpen, setIsSectionOpen] = useState(true);
  const [previewTab, setPreviewTab] = useState<"output" | "pt" | "stages">("output");
  const [previewSubTab, setPreviewSubTab] = useState<"search" | "data" | "summary">("summary");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedPlaceholder, setExpandedPlaceholder] = useState<{
    key: string;
    friendlyName: string;
  } | null>(null);
  const [expandedDraft, setExpandedDraft] = useState("");

  const rowsPerPage = 1;
  const totalPages = Math.max(1, Math.ceil((contacts.length || 1) / rowsPerPage));
  const setPageSize = () => {};

  // Reset pagination when a different contact file is selected
  useEffect(() => {
    if (!selectedDataFileId) return;
    setCurrentPage(1);
  }, [selectedDataFileId]);

  // Auto-apply contact when page changes
  useEffect(() => {
    if (!contacts.length) return;
    const contact = contacts[(currentPage - 1) * rowsPerPage];
    if (!contact || contact.id === selectedContactId) return;
    setSelectedContactId(contact.id);
    applyContactPlaceholders(contact);
  }, [currentPage, contacts]);

  return (
    <>
      <div className="flex gap-4 h-[calc(100vh-200px)] mt-[10px]">
        {/* ================= LEFT PANEL ================= */}
        <div
          style={{
            flex: 1,
            width: isSectionOpen ? "50%" : "100%",
            transition: "all 0.25s ease",
          }}
        >
          {/* Build sub-tab header */}
          <div className="build-subtabs-row !pb-[0]">
            <div className="build-subtabs !gap-[0]">
              {(["chat", "elements"] as BuildSubTab[]).map((t) => (
                <button
                  key={t}
                  className={activeBuildTab === t ? "active" : ""}
                  onClick={() => setActiveBuildTab(t)}
                >
                  {t === "chat" ? "Chat" : "Elements"}
                </button>
              ))}
            </div>
          </div>

          {activeBuildTab === "chat" && (
            <ConversationTabComponent
              conversationStarted={conversationStarted}
              messages={messages}
              isTyping={isTyping}
              isComplete={isComplete}
              currentAnswer={currentAnswer}
              setCurrentAnswer={setCurrentAnswer}
              handleSendMessage={handleSendMessage}
              handleKeyPress={handleKeyPress}
              resetAll={resetAll}
              isEditMode={isEditMode}
              placeholderValues={placeholderValues}
              onPlaceholderSelect={onPlaceholderSelect}
              selectedPlaceholder={selectedPlaceholder}
              setIsTyping={setIsTyping}
              exampleOutput={exampleOutput}
              regenerateExampleOutput={regenerateExampleOutput}
              dataFiles={dataFiles}
              contacts={contacts}
              selectedDataFileId={selectedDataFileId}
              selectedContactId={selectedContactId}
              handleSelectDataFile={handleSelectDataFile}
              setSelectedContactId={setSelectedContactId}
              applyContactPlaceholders={applyContactPlaceholders}
              searchResults={searchResults}
              allSourcedData={allSourcedData}
              sourcedSummary={sourcedSummary}
              filledTemplate={filledTemplate}
              editTemplateId={editTemplateId}
              groupedPlaceholders={groupedPlaceholders}
              initialExampleEmail={initialExampleEmail}
              selectedElement={selectedElement}
              attachedImages={attachedImages}
              setAttachedImages={setAttachedImages}
              handleImageUpload={handleImageUpload}
              onApprove={onApprove}
              onStartConversation={onStartConversation}
            />
          )}

          {activeBuildTab === "elements" && (
            <ElementsTab
              groupedPlaceholders={groupedPlaceholders}
              formValues={formValues}
              setFormValues={setFormValues}
              setExpandedKey={(key, friendlyName) => {
                setExpandedPlaceholder({ key, friendlyName });
                setExpandedDraft(formValues[key] || "");
              }}
              saveAllPlaceholders={saveAllPlaceholders}
              dataFiles={dataFiles}
              contacts={contacts}
              selectedDataFileId={selectedDataFileId}
              selectedContactId={selectedContactId}
              handleSelectDataFile={handleSelectDataFile}
              setSelectedContactId={setSelectedContactId}
              applyContactPlaceholders={applyContactPlaceholders}
              renderPlaceholderInput={renderPlaceholderInput}
            />
          )}
        </div>

        {/* ================= RIGHT PANEL (Live Preview) ================= */}
        {isSectionOpen && (
          <div style={{ flex: 1, width: "50%", paddingLeft: 12, position: "relative", display: "flex", flexDirection: "column" }}>
            {/* Panel header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#fff", border: "1px solid #e5e7eb", borderBottom: "none", borderRadius: "10px 10px 0 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>👁️</span>
                <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>Live preview</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={async () => {
                    const contact = contacts.find((c) => c.id === selectedContactId);
                    if (contact && regenerateExampleOutput) {
                      await applyContactPlaceholders(contact);
                      await regenerateExampleOutput();
                    }
                  }}
                  disabled={isPreviewLoading || !selectedContactId}
                  style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", fontSize: 13, cursor: selectedContactId ? "pointer" : "not-allowed", color: "#374151", display: "flex", alignItems: "center", gap: 5 }}
                >
                  🔄 Refresh
                </button>
                <button
                  onClick={() => setIsSectionOpen(false)}
                  style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", fontSize: 13, cursor: "pointer", color: "#374151" }}
                  title="Hide preview"
                >
                  ✕
                </button>
              </div>
            </div>

            <ExampleOutputPanelComponent
              dataFiles={dataFiles}
              contacts={contacts}
              selectedDataFileId={selectedDataFileId}
              selectedContactId={selectedContactId}
              handleSelectDataFile={handleSelectDataFile}
              setSelectedContactId={setSelectedContactId}
              applyContactPlaceholders={applyContactPlaceholders}
              exampleOutput={exampleOutput}
              editableExampleOutput={editableExampleOutput}
              setEditableExampleOutput={setEditableExampleOutput}
              saveExampleEmail={saveExampleEmail}
              isGenerating={isPreviewLoading}
              regenerateExampleOutput={regenerateExampleOutput}
              currentPage={currentPage}
              totalPages={totalPages}
              rowsPerPage={rowsPerPage}
              setCurrentPage={setCurrentPage}
              setPageSize={setPageSize}
              activeMainTab={previewTab}
              setActiveMainTab={setPreviewTab}
              activeSubStageTab={previewSubTab}
              setActiveSubStageTab={setPreviewSubTab}
              filledTemplate={filledTemplate}
              searchResults={searchResults}
              allSourcedData={allSourcedData}
              sourcedSummary={sourcedSummary}
              isPreviewAllowed={isPreviewAllowed}
            />
          </div>
        )}

        {/* Show preview button when panel is hidden */}
        {!isSectionOpen && (
          <div className="flex">
            <button
              onClick={() => setIsSectionOpen(true)}
              style={{ writingMode: "vertical-rl", textOrientation: "mixed", padding: "16px 10px", borderRadius: "0 8px 8px 0", background: "#f0fdf4", border: "1px solid #d1fae5", color: "#3f9f42", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            >
              <span>Live preview</span>
              <span style={{ fontSize: 16 }}>👁️</span>
            </button>
          </div>
        )}
      </div>

      {/* ================= EXPANDED PLACEHOLDER MODAL ================= */}
      {expandedPlaceholder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "80%",
              maxWidth: "900px",
              background: "#fff",
              borderRadius: "10px",
              padding: "20px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <h3 style={{ fontSize: "18px", fontWeight: 600 }}>
                {expandedPlaceholder.friendlyName}
              </h3>
              <button
                onClick={() => setExpandedPlaceholder(null)}
                style={{ border: "none", background: "transparent", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <RichTextEditor value={expandedDraft} height={320} onChange={setExpandedDraft} />

            <div style={{ textAlign: "right", marginTop: "12px" }}>
              <button
                onClick={() => {
                  setFormValues((prev) => ({
                    ...prev,
                    [expandedPlaceholder.key]: expandedDraft,
                  }));
                  setExpandedPlaceholder(null);
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BlueprintBuilderPanel;
