import React, { useState, useEffect, useRef, useCallback } from "react";
import RichTextEditor from "../../common/RTEEditor";
import ElementsTab from "./ElementsTab";
import type { PlaceholderDefinitionUI } from "./EmailCampaignBuilder";

export interface BlueprintBuilderPanelProps {
  activeBuildTab: "chat" | "elements";
  setActiveBuildTab: (v: "chat" | "elements") => void;

  onApprove?: () => void;
  onStartConversation?: (method: "reference" | "description", initialMessage: string) => void;

  // Admin-only extras
  userRole?: string;
  usageInfo?: { promptTokens: number; completionTokens: number; cost: number } | null;
  totalUsage?: { totalInput: number; totalOutput: number; totalCost: number };
  onShowInstructions?: () => void;
  onShowVT?: () => void;

  isTemplateLoading?: boolean;
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

  placeholderValues: Record<string, string>;
  groupedPlaceholders: Record<string, PlaceholderDefinitionUI[]>;
  formValues: Record<string, string>;
  setFormValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  renderPlaceholderInput: (p: PlaceholderDefinitionUI) => React.ReactNode;
  saveAllPlaceholders: () => Promise<void>;

  exampleOutput: string;
  editableExampleOutput: string;
  setEditableExampleOutput: React.Dispatch<React.SetStateAction<string>>;
  filledTemplate: string;
  isPreviewLoading: boolean;
  regenerateExampleOutput: () => Promise<void>;
  saveExampleEmail: () => Promise<void>;
  isPreviewAllowed: boolean;

  dataFiles: any[];
  contacts: any[];
  selectedDataFileId: number | null;
  selectedContactId: number | null;
  handleSelectDataFile: (id: number) => void;
  setSelectedContactId: React.Dispatch<React.SetStateAction<number | null>>;
  applyContactPlaceholders: (contact: any) => Promise<void>;

  searchResults: string[];
  allSourcedData: string;
  sourcedSummary: string;

  editTemplateId: number | null;
  initialExampleEmail: string;
  selectedElement: string | null;

  attachedImages: string[];
  setAttachedImages: React.Dispatch<React.SetStateAction<string[]>>;
  handleImageUpload: (file: File) => Promise<void>;

  ConversationTabComponent: React.ComponentType<any>;
  ExampleOutputPanelComponent: React.ComponentType<any>;
}

const BlueprintBuilderPanel: React.FC<BlueprintBuilderPanelProps> = ({
  activeBuildTab,
  setActiveBuildTab: _setActiveBuildTab,
  isTemplateLoading = false,
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
  userRole,
  usageInfo,
  totalUsage,
  onShowInstructions,
  onShowVT,
}) => {
  const isAdmin = userRole === "ADMIN";
  // Chat phase: preview panel toggle
  const [chatPreviewOpen, setChatPreviewOpen] = useState(false);

  // Elements phase: preview panel open/collapse
  const [previewPanelOpen, setPreviewPanelOpen] = useState(false);

  // Elements phase: resizable split
  const [splitPct, setSplitPct] = useState(52); // left panel % width
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Elements phase: preview sub-tabs
  const [previewTab, setPreviewTab] = useState<"output" | "pt" | "stages">("output");
  const [previewSubTab, setPreviewSubTab] = useState<"search" | "data" | "summary">("summary");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 1;
  const totalPages = Math.max(1, Math.ceil((contacts.length || 1) / rowsPerPage));
  const setPageSize = () => {};

  // Expanded placeholder modal (elements tab)
  const [expandedPlaceholder, setExpandedPlaceholder] = useState<{ key: string; friendlyName: string } | null>(null);
  const [expandedDraft, setExpandedDraft] = useState("");

  // Reset pagination when data file changes
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

  // Drag-to-resize handlers (elements phase)
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.min(75, Math.max(25, pct)));
    };
    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // ============================================================
  // CHAT PHASE (Phases 1–3): centered layout with action header
  // ============================================================
  if (activeBuildTab === "chat") {
    return (
      <>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 10,
          }}
        >
          {/* ---- ACTION HEADER ---- */}
          <div style={{ flexShrink: 0 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0 12px",
              }}
            >
              {/* Title */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, background: "#f0fdf4", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚙️</div>
                <div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Blueprint builder</span>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  onClick={() => setChatPreviewOpen((v) => !v)}
                  style={{
                    display: "flex", alignItems: "center", gap: 5, padding: "7px 14px",
                    border: chatPreviewOpen ? "2px solid #3f9f42" : "1px solid #d1d5db",
                    borderRadius: 8,
                    background: chatPreviewOpen ? "#f0fdf4" : "#fff",
                    fontSize: 13, cursor: "pointer",
                    color: chatPreviewOpen ? "#3f9f42" : "#374151",
                    fontWeight: chatPreviewOpen ? 600 : 400,
                  }}
                >
                  <span style={{ fontSize: 14 }}>👁️</span> Preview email
                </button>
                {isAdmin && onShowInstructions && (
                  <button
                    onClick={onShowInstructions}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", border: "1px solid #d1d5db", borderRadius: 8, background: "#fff", fontSize: 13, cursor: "pointer", color: "#374151" }}
                  >
                    📋 Instructions set
                  </button>
                )}
                {isAdmin && onShowVT && (
                  <button
                    onClick={onShowVT}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", border: "1px solid #d1d5db", borderRadius: 8, background: "#fff", fontSize: 13, cursor: "pointer", color: "#374151" }}
                  >
                    VT
                  </button>
                )}
                <button
                  onClick={saveAllPlaceholders}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 16px", borderRadius: 8, background: "#3f9f42", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                  💾 Save
                </button>
              </div>
            </div>

            {/* Admin token stats row */}
            {isAdmin && usageInfo && (
              <div style={{ display: "flex", gap: 16, padding: "4px 0 8px", fontSize: 11, color: "#6b7280", flexWrap: "wrap" }}>
                <span style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 5, padding: "3px 8px", display: "flex", gap: 8 }}>
                  <strong style={{ color: "#374151" }}>Last:</strong>
                  <span>In {usageInfo.promptTokens ?? 0}</span>
                  <span>Out {usageInfo.completionTokens ?? 0}</span>
                  <span>💲{(usageInfo.cost ?? 0).toFixed(6)}</span>
                </span>
                {totalUsage && totalUsage.totalCost > 0 && (
                  <span style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 5, padding: "3px 8px", display: "flex", gap: 8 }}>
                    <strong style={{ color: "#374151" }}>Total:</strong>
                    <span>In {totalUsage.totalInput}</span>
                    <span>Out {totalUsage.totalOutput}</span>
                    <span>💲{totalUsage.totalCost.toFixed(6)}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ---- CONTENT AREA (chat + optional preview) ---- */}
          <div style={{ display: "flex", gap: 12 }}>

            {/* Chat — fills full panel width */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <ConversationTabComponent
                  isTemplateLoading={isTemplateLoading}
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
                  isPreviewLoading={isPreviewLoading}
                />
              </div>
            </div>

            {/* ---- PREVIEW PANEL (slide-in on the right) ---- */}
            {chatPreviewOpen && (
              <div
                style={{
                  width: "42%",
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: 10,
                  overflow: "hidden",
                  border: "1px solid #e5e7eb",
                  boxShadow: "2px 2px 12px rgba(0,0,0,0.08)",
                }}
              >
                {/* Preview header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    background: "#fff",
                    borderBottom: "1px solid #e5e7eb",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>👁️</span>
                    <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>Live preview</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={async () => {
                        const contact = contacts.find((c) => c.id === selectedContactId);
                        if (contact) {
                          await applyContactPlaceholders(contact);
                          await regenerateExampleOutput();
                        }
                      }}
                      disabled={isPreviewLoading || !selectedContactId}
                      style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", fontSize: 13, cursor: selectedContactId ? "pointer" : "not-allowed", color: "#374151", display: "flex", alignItems: "center", gap: 5 }}
                    >
                      ⚡ Generate
                    </button>
                    <button
                      onClick={() => setChatPreviewOpen(false)}
                      style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", fontSize: 13, cursor: "pointer", color: "#374151" }}
                      title="Close preview"
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
          </div>
        </div>

        {/* ===== EXPANDED PLACEHOLDER MODAL ===== */}
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
            <div style={{ width: "80%", maxWidth: 900, background: "#fff", borderRadius: 10, padding: 20, boxShadow: "0 20px 40px rgba(0,0,0,0.25)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600 }}>{expandedPlaceholder.friendlyName}</h3>
                <button onClick={() => setExpandedPlaceholder(null)} style={{ border: "none", background: "transparent", fontSize: 20, cursor: "pointer" }}>✕</button>
              </div>
              <RichTextEditor value={expandedDraft} height={320} onChange={setExpandedDraft} />
              <div style={{ textAlign: "right", marginTop: 12 }}>
                <button onClick={() => { setFormValues((prev) => ({ ...prev, [expandedPlaceholder.key]: expandedDraft })); setExpandedPlaceholder(null); }}>Done</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ============================================================
  // ELEMENTS PHASE (Phase 5): action header + toggled preview
  // ============================================================

  const elemSteps = [
    { num: 1, label: "Choose method" },
    { num: 2, label: "Provide input" },
    { num: 3, label: "Review blueprint" },
    { num: 4, label: "Example email" },
    { num: 5, label: "Edit & preview" },
  ];

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 10 }}>

        {/* ---- ACTION HEADER (matches chat phase) ---- */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, background: "#f0fdf4", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚙️</div>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Blueprint builder</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => setPreviewPanelOpen((v) => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "7px 14px",
                  border: previewPanelOpen ? "2px solid #3f9f42" : "1px solid #d1d5db",
                  borderRadius: 8,
                  background: previewPanelOpen ? "#f0fdf4" : "#fff",
                  fontSize: 13, cursor: "pointer",
                  color: previewPanelOpen ? "#3f9f42" : "#374151",
                  fontWeight: previewPanelOpen ? 600 : 400,
                }}
              >
                <span style={{ fontSize: 14 }}>👁️</span> Preview email
              </button>
              {isAdmin && onShowInstructions && (
                <button
                  onClick={onShowInstructions}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", border: "1px solid #d1d5db", borderRadius: 8, background: "#fff", fontSize: 13, cursor: "pointer", color: "#374151" }}
                >
                  📋 Instructions set
                </button>
              )}
              {isAdmin && onShowVT && (
                <button
                  onClick={onShowVT}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", border: "1px solid #d1d5db", borderRadius: 8, background: "#fff", fontSize: 13, cursor: "pointer", color: "#374151" }}
                >
                  VT
                </button>
              )}
              <button
                onClick={saveAllPlaceholders}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 16px", borderRadius: 8, background: "#3f9f42", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >
                💾 Save
              </button>
            </div>
          </div>

          {/* Admin token stats row */}
          {isAdmin && usageInfo && (
            <div style={{ display: "flex", gap: 16, padding: "0 0 8px", fontSize: 11, color: "#6b7280", flexWrap: "wrap" }}>
              <span style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 5, padding: "3px 8px", display: "flex", gap: 8 }}>
                <strong style={{ color: "#374151" }}>Last:</strong>
                <span>In {usageInfo.promptTokens ?? 0}</span>
                <span>Out {usageInfo.completionTokens ?? 0}</span>
                <span>💲{(usageInfo.cost ?? 0).toFixed(6)}</span>
              </span>
              {totalUsage && totalUsage.totalCost > 0 && (
                <span style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 5, padding: "3px 8px", display: "flex", gap: 8 }}>
                  <strong style={{ color: "#374151" }}>Total:</strong>
                  <span>In {totalUsage.totalInput}</span>
                  <span>Out {totalUsage.totalOutput}</span>
                  <span>💲{totalUsage.totalCost.toFixed(6)}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ---- STEP PILLS ---- */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0 12px", flexShrink: 0, flexWrap: "wrap" }}>
          {elemSteps.map((step) => {
            const done = step.num < 5;
            const active = step.num === 5;
            return (
              <div key={step.num} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px 4px 5px", borderRadius: 20, background: done ? "#dcfce7" : active ? "#f0fdf4" : "#f3f4f6", border: `1px solid ${done ? "#86efac" : active ? "#3f9f42" : "#e5e7eb"}`, color: done ? "#16a34a" : active ? "#3f9f42" : "#9ca3af", fontSize: 13, fontWeight: done || active ? 600 : 400 }}>
                <span style={{ width: 20, height: 20, background: done ? "#3f9f42" : active ? "#3f9f42" : "#e5e7eb", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", color: done || active ? "#fff" : "#9ca3af", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                  {done ? "✓" : step.num}
                </span>
                {step.label}
              </div>
            );
          })}
        </div>

        {/* ---- CONTENT: elements (+ preview panel when open) ---- */}
        <div
          ref={containerRef}
          style={{ display: "flex", borderRadius: 10, border: "1px solid #e5e7eb", position: "relative" }}
        >
          {/* LEFT: Elements accordion — full width or split */}
          <div style={{ width: previewPanelOpen ? `${splitPct}%` : "100%", flexShrink: 0, display: "flex", flexDirection: "column" }}>
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
          </div>

          {/* DRAG HANDLE (only when preview open) */}
          {previewPanelOpen && (
            <div
              onMouseDown={onMouseDown}
              style={{ width: 6, flexShrink: 0, background: "#e5e7eb", cursor: "col-resize", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s", zIndex: 10 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#3f9f42"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#e5e7eb"; }}
              title="Drag to resize"
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} style={{ width: 3, height: 3, borderRadius: "50%", background: "#9ca3af" }} />
                ))}
              </div>
            </div>
          )}

          {/* RIGHT: Preview panel (only when open) */}
          {previewPanelOpen && (
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", borderLeft: "1px solid #e5e7eb" }}>
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
                onCollapse={() => setPreviewPanelOpen(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ===== EXPANDED PLACEHOLDER MODAL ===== */}
      {expandedPlaceholder && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "80%", maxWidth: 900, background: "#fff", borderRadius: 10, padding: 20, boxShadow: "0 20px 40px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600 }}>{expandedPlaceholder.friendlyName}</h3>
              <button onClick={() => setExpandedPlaceholder(null)} style={{ border: "none", background: "transparent", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <RichTextEditor value={expandedDraft} height={320} onChange={setExpandedDraft} />
            <div style={{ textAlign: "right", marginTop: 12 }}>
              <button onClick={() => { setFormValues((prev) => ({ ...prev, [expandedPlaceholder.key]: expandedDraft })); setExpandedPlaceholder(null); }}>Done</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BlueprintBuilderPanel;
