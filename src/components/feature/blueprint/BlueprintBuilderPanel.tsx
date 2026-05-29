import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import ElementsTab from "./ElementsTab";
import type { PlaceholderDefinitionUI } from "./EmailCampaignBuilder";
import { Loader2 } from "lucide-react";
import RichTextEditor from "../../common/RTEEditor";

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

  // Element side panel drawer
  const [sidePanelElement, setSidePanelElement] = useState<PlaceholderDefinitionUI | null>(null);
  const [sidePanelTab, setSidePanelTab] = useState<"manual" | "chat">("manual");
  const [chatStartedForKey, setChatStartedForKey] = useState<string | null>(null);

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
              onExpandElement={(p) => {
                setSidePanelElement(p);
                setSidePanelTab("manual");
                setChatStartedForKey(null);
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

      {/* ===== ELEMENT SIDE PANEL DRAWER (portal → always relative to viewport) ===== */}
      {sidePanelElement && createPortal(
        <>
          {/* Backdrop */}
          <div
            onClick={() => setSidePanelElement(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.12)", zIndex: 999 }}
          />

          {/* Drawer */}
          <div style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: "40vw",
            background: "#fff",
            boxShadow: "-4px 0 28px rgba(0,0,0,0.14)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}>
            {/* Drawer Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0, background: "#fff" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 2 }}>
                  {sidePanelElement.friendlyName}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {sidePanelElement.category}
                </div>
              </div>
              <button
                onClick={() => setSidePanelElement(null)}
                style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #e5e7eb", background: "#fafafa", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", fontSize: 14, flexShrink: 0 }}
              >
                ✕
              </button>
            </div>

            {/* Tab Bar */}
            <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", background: "#fafafa", flexShrink: 0 }}>
              {(["manual", "chat"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setSidePanelTab(tab);
                    if (tab === "chat" && chatStartedForKey !== sidePanelElement.placeholderKey) {
                      onPlaceholderSelect(sidePanelElement.placeholderKey);
                      setChatStartedForKey(sidePanelElement.placeholderKey);
                    }
                  }}
                  style={{
                    flex: 1, padding: "12px 14px",
                    border: "none", background: "none",
                    borderBottom: sidePanelTab === tab ? "2px solid #3f9f42" : "2px solid transparent",
                    color: sidePanelTab === tab ? "#3f9f42" : "#6b7280",
                    fontWeight: sidePanelTab === tab ? 700 : 500,
                    fontSize: 13,
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    transition: "color 0.15s",
                  }}
                >
                  {tab === "manual" ? (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Manual
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      Chat AI
                    </>
                  )}
                </button>
              ))}
            </div>

            {/* Content Area — position:relative so each tab can use absolute fill */}
            <div style={{ flex: 1, minHeight: 0, position: "relative" }}>

              {/* ── MANUAL TAB ── */}
              {sidePanelTab === "manual" && (
                <div style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "20px" }}>
                  <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 14, lineHeight: 1.5 }}>
                    Edit <strong style={{ color: "#374151" }}>{sidePanelElement.friendlyName}</strong> directly below. Changes are saved when you click "Save all" on the elements page.
                  </p>

                  {/* Select */}
                  {sidePanelElement.inputType === "select" && (sidePanelElement.options?.length ?? 0) > 0 ? (
                    <select
                      value={formValues[sidePanelElement.placeholderKey] || ""}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, [sidePanelElement!.placeholderKey]: e.target.value }))}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, color: "#111827", background: "#fff" }}
                    >
                      <option value="">Select…</option>
                      {(sidePanelElement.options ?? []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>

                  ) : sidePanelElement.isRichText || sidePanelElement.inputType === "richtext" ? (
                    /* RichText */
                    <RichTextEditor
                      value={formValues[sidePanelElement.placeholderKey] || ""}
                      height={300}
                      onChange={(val) => setFormValues((prev) => ({ ...prev, [sidePanelElement!.placeholderKey]: val }))}
                    />

                  ) : (
                    /* Plain text — always multiline in the panel */
                    <textarea
                      value={formValues[sidePanelElement.placeholderKey] || ""}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, [sidePanelElement!.placeholderKey]: e.target.value }))}
                      placeholder={`Enter ${sidePanelElement.friendlyName}…`}
                      rows={7}
                      style={{
                        width: "100%",
                        minHeight: 140,
                        padding: "10px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: 8,
                        fontSize: 14,
                        resize: "vertical",
                        fontFamily: "inherit",
                        lineHeight: 1.6,
                        color: "#111827",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  )}
                </div>
              )}

              {/* ── CHAT TAB ── */}
              {sidePanelTab === "chat" && (
                <>
                  {/* Pre-start state */}
                  {chatStartedForKey !== sidePanelElement.placeholderKey && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "28px 24px", textAlign: "center", gap: 16 }}>
                      <div style={{ width: 56, height: 56, background: "#f0fdf4", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
                        💬
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: "#111827", fontSize: 15, marginBottom: 6 }}>
                          Edit with AI
                        </div>
                        <div style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.6, maxWidth: 280 }}>
                          The AI will help you craft the perfect value for <strong>"{sidePanelElement.friendlyName}"</strong> based on your blueprint.
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          onPlaceholderSelect(sidePanelElement.placeholderKey);
                          setChatStartedForKey(sidePanelElement.placeholderKey);
                        }}
                        disabled={isTyping}
                        style={{
                          padding: "10px 22px",
                          background: "#3f9f42",
                          color: "#fff",
                          borderRadius: 8,
                          border: "none",
                          fontWeight: 600,
                          fontSize: 14,
                          cursor: isTyping ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          opacity: isTyping ? 0.7 : 1,
                        }}
                      >
                        {isTyping ? (
                          <>
                            <Loader2 size={14} style={{ animation: "campaign-builder-spin 1s linear infinite" }} />
                            Starting…
                          </>
                        ) : (
                          "Start AI chat →"
                        )}
                      </button>
                    </div>
                  )}

                  {/* Active chat — CSS Grid: messages get 1fr, input gets auto height */}
                  {chatStartedForKey === sidePanelElement.placeholderKey && (
                    <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateRows: "1fr auto" }}>
                      {/* Scrollable messages */}
                      <div style={{ overflowY: "auto", padding: "14px 16px" }}>
                        {messages.map((msg: any, idx: number) => {
                          const raw: string = msg.content || "";
                          const content = raw
                            .replace(/==PLACEHOLDER_VALUES_START==[\s\S]*?==PLACEHOLDER_VALUES_END==/g, "")
                            .replace(/\{\s*"status"[\s\S]*?\}/g, "")
                            .trim();
                          const isHtml = /<[a-z][\s\S]*>/i.test(content);

                          return (
                            <div
                              key={idx}
                              style={{
                                marginBottom: 10,
                                display: "flex",
                                justifyContent: msg.type === "user" ? "flex-end" : "flex-start",
                                alignItems: "flex-start",
                                gap: 6,
                              }}
                            >
                              {msg.type === "bot" && (
                                <span style={{
                                  width: 26, height: 26,
                                  background: "#f0fdf4",
                                  border: "1px solid #86efac",
                                  borderRadius: "50%",
                                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                                  fontSize: 13, flexShrink: 0, marginTop: 2,
                                }}>🤖</span>
                              )}
                              <div style={{
                                maxWidth: "82%",
                                padding: "9px 13px",
                                borderRadius: msg.type === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                                background: msg.type === "user" ? "#3f9f42" : "#f9fafb",
                                border: msg.type === "user" ? "none" : "1px solid #e5e7eb",
                                color: msg.type === "user" ? "#fff" : "#111827",
                                fontSize: 13,
                                lineHeight: 1.55,
                              }}>
                                {isHtml
                                  ? <div dangerouslySetInnerHTML={{ __html: content }} />
                                  : <p style={{ margin: 0 }}>{content}</p>
                                }
                                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: "right" }}>
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Typing indicator */}
                        {isTyping && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                            <span style={{ width: 26, height: 26, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>🤖</span>
                            <div style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 14px", display: "flex", gap: 4, alignItems: "center" }}>
                              {[0, 1, 2].map((i) => (
                                <div key={i} style={{
                                  width: 6, height: 6, borderRadius: "50%", background: "#9ca3af",
                                  animation: "campaign-builder-dot-bounce 1.4s ease-in-out infinite",
                                  animationDelay: `${i * 0.16}s`,
                                }} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Input — grid row "auto" pins it to the bottom */}
                      <div style={{ borderTop: "1px solid #e5e7eb", padding: "12px 16px", background: "#fff" }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                          <textarea
                            value={currentAnswer}
                            onChange={(e) => setCurrentAnswer(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Type your reply…"
                            style={{
                              flex: 1,
                              padding: "9px 12px",
                              border: "1px solid #d1d5db",
                              borderRadius: 8,
                              fontSize: 13,
                              resize: "none",
                              minHeight: 42,
                              maxHeight: 120,
                              fontFamily: "inherit",
                              color: "#111827",
                              outline: "none",
                              lineHeight: 1.5,
                            }}
                            rows={1}
                            disabled={isTyping}
                          />
                          <button
                            onClick={() => handleSendMessage()}
                            disabled={isTyping || !currentAnswer.trim()}
                            style={{
                              padding: "9px 14px",
                              background: isTyping || !currentAnswer.trim() ? "#e5e7eb" : "#3f9f42",
                              color: isTyping || !currentAnswer.trim() ? "#9ca3af" : "#fff",
                              borderRadius: 8,
                              border: "none",
                              cursor: isTyping || !currentAnswer.trim() ? "not-allowed" : "pointer",
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "background 0.15s",
                            }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="22" y1="2" x2="11" y2="13" />
                              <polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                          </button>
                        </div>
                        <p style={{ fontSize: 11, color: "#9ca3af", margin: "6px 0 0", textAlign: "center" }}>
                          The AI will update this element based on your conversation.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
};

export default BlueprintBuilderPanel;
