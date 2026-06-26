import React, { useState, useEffect, useRef, useCallback } from "react";
import ElementsTab from "./ElementsTab";
import type { PlaceholderDefinitionUI } from "./EmailCampaignBuilder";
import { Loader2 } from "lucide-react";
import RichTextEditor from "../../common/RTEEditor";
import DOMPurify from "dompurify";

export interface BlueprintBuilderPanelProps {
  activeBuildTab: "chat" | "elements";
  setActiveBuildTab: (v: "chat" | "elements") => void;
  onBeforeAiChatOpen?: () => Promise<boolean>;

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

// Decode HTML entities (e.g. "&lt;div&gt;") back into real markup. Used when the
// model returns entity-encoded HTML so it renders instead of showing as tags.
const decodeHtmlEntities = (str: string): string => {
  if (typeof document === "undefined" || !/&(?:lt|gt|amp|quot|#\d+);/i.test(str)) return str;
  const el = document.createElement("textarea");
  el.innerHTML = str;
  return el.value;
};

// Prepare a bot message for rendering. Strips internal placeholder/status blocks,
// unwraps markdown ```html code fences, and decodes entity-encoded HTML so the
// chat shows formatted HTML rather than literal source.
const prepareChatContent = (raw: string): { content: string; isHtml: boolean } => {
  let content = (raw || "")
    .replace(/==PLACEHOLDER_VALUES_START==[\s\S]*?==PLACEHOLDER_VALUES_END==/g, "")
    .replace(/\{\s*"status"[\s\S]*?\}/g, "")
    .trim();

  // Unwrap fenced code blocks (```html … ``` or ``` … ```) — keep the inner body
  // so the HTML it contains renders instead of displaying the fence + tags.
  content = content.replace(/```(?:html|xml)?\s*\n?([\s\S]*?)```/gi, (_m, inner) => String(inner).trim());

  // If it looks entity-encoded rather than real markup, decode it.
  if (!/<[a-z][\s\S]*>/i.test(content) && /&lt;[a-z/]/i.test(content)) {
    content = decodeHtmlEntities(content);
  }

  return { content, isHtml: /<[a-z][\s\S]*>/i.test(content) };
};

const BlueprintBuilderPanel: React.FC<BlueprintBuilderPanelProps> = ({
  activeBuildTab,
  setActiveBuildTab: _setActiveBuildTab,
  onBeforeAiChatOpen,
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

  // Elements phase: preview panel open/collapse.
  const [previewPanelOpen, setPreviewPanelOpen] = useState(false);

  // Elements phase: resizable split. Default to 40% so the elements list sits at
  // 40% of the screen and the open edit/preview panel fills the remaining 60%.
  const [splitPct, setSplitPct] = useState(40); // left panel % width
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
  const handleOpenSidePanelTab = async (tab: "manual" | "chat") => {
    if (!sidePanelElement) return;

    if (tab === "chat") {
      const canOpen = await onBeforeAiChatOpen?.();
      if (canOpen === false) return;
    }

    setSidePanelTab(tab);
    if (tab === "chat" && chatStartedForKey !== sidePanelElement.placeholderKey) {
      onPlaceholderSelect(sidePanelElement.placeholderKey);
      setChatStartedForKey(sidePanelElement.placeholderKey);
    }
  };

  // On first load, open the {example_output_email} element directly in the edit
  // side panel so it's ready to view/edit on landing (instead of the live preview).
  const didInitSidePanelRef = useRef(false);
  useEffect(() => {
    if (didInitSidePanelRef.current) return;
    const example = Object.values(groupedPlaceholders)
      .flat()
      .find((p) => p.placeholderKey === "example_output_email");
    if (example) {
      setSidePanelElement(example);
      setSidePanelTab("manual");
      setChatStartedForKey(null);
      didInitSidePanelRef.current = true;
    }
  }, [groupedPlaceholders]);

  // Keep the open side-panel element in sync with the latest placeholder
  // definitions. Placeholders load asynchronously — a generic fallback first
  // (category "general", plain text), then the real backend data (proper
  // category, friendly name and rich-text flag) — so a pinned object can go
  // stale. Re-resolve by key and update only when a rendered field differs
  // (avoids an update loop on the rebuilt-every-render groupedPlaceholders).
  useEffect(() => {
    if (!sidePanelElement) return;
    const latest = Object.values(groupedPlaceholders)
      .flat()
      .find((p) => p.placeholderKey === sidePanelElement.placeholderKey);
    if (
      latest &&
      latest !== sidePanelElement &&
      (latest.category !== sidePanelElement.category ||
        latest.friendlyName !== sidePanelElement.friendlyName ||
        latest.isRichText !== sidePanelElement.isRichText ||
        latest.inputType !== sidePanelElement.inputType)
    ) {
      setSidePanelElement(latest);
    }
  }, [groupedPlaceholders, sidePanelElement]);

  // Side-panel chat scroll handling (floating scroll-to-bottom arrow)
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const handleChatScroll = useCallback(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    setShowScrollDown(!nearBottom);
  }, []);

  const scrollChatToBottom = useCallback((smooth = true) => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Keep the chat pinned to the latest message as it grows.
  useEffect(() => {
    if (sidePanelTab !== "chat") return;
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setShowScrollDown(false);
  }, [messages, isTyping, sidePanelTab, chatStartedForKey]);

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
          {/* Negative top margin lifts the action buttons up beside the page
              header/Back row (which are rendered by the parent above the panel).
              pointerEvents:none lets clicks pass through the overlapping empty
              area to the Back button beneath; the buttons re-enable pointer events. */}
          <div style={{ flexShrink: 0, marginTop: -64, pointerEvents: "none" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                padding: "8px 0 12px",
              }}
            >
              {/* Action buttons */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", pointerEvents: "auto" }}>
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

  // Right column is shared between the element edit panel and the live preview.
  // The element side panel takes precedence when an element is being edited.
  const rightPanelOpen = previewPanelOpen || !!sidePanelElement;

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 10 }}>

        {/* ---- ACTION HEADER (matches chat phase) ---- */}
        {/* Negative top margin lifts the action buttons up beside the page
            header/Back row (rendered by the parent above the panel).
            pointerEvents:none lets clicks pass through the overlapping empty area
            to the Back button beneath; the buttons re-enable pointer events. */}
        <div style={{ flexShrink: 0, marginTop: -64, pointerEvents: "none" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", padding: "8px 0 12px" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", pointerEvents: "auto" }}>
              <button
                onClick={() => {
                  // Opening the live preview closes the element edit panel so the
                  // preview takes over the right column instead of stacking under it.
                  setSidePanelElement(null);
                  setPreviewPanelOpen((v) => !v);
                }}
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

        {/* ---- CONTENT: elements (+ preview panel when open) ---- */}
        <div
          ref={containerRef}
          style={{
            display: "flex",
            position: "relative",
            // Items align to the top so the right panel can use position:sticky to
            // float in the viewport (instead of stretching to the row height).
            alignItems: "flex-start",
            // With no panel open, the elements list occupies only the left third
            // of the width (the rest stays empty until an edit/preview panel opens).
            width: rightPanelOpen ? "100%" : "40%",
          }}
        >
          {/* LEFT: Elements accordion — full width or split. Its own bordered
              card so it reads as separate from the edit/preview panel. */}
          <div
            style={{
              width: rightPanelOpen ? `${splitPct}%` : "100%",
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              background: "#fff",
              overflow: "hidden",
            }}
          >
            <ElementsTab
              groupedPlaceholders={groupedPlaceholders}
              formValues={formValues}
              setFormValues={setFormValues}
              onExpandElement={(p) => {
                // Opening the edit panel closes the live preview so only one
                // right-column panel is shown at a time.
                setPreviewPanelOpen(false);
                setSidePanelElement(p);
                setSidePanelTab("manual");
                setChatStartedForKey(null);
              }}
              saveAllPlaceholders={saveAllPlaceholders}
              activeElementKey={sidePanelElement?.placeholderKey ?? null}
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

          {/* DRAG HANDLE (only when a right panel is open) — also the visible gap
              that separates the two cards. */}
          {rightPanelOpen && (
            <div
              onMouseDown={onMouseDown}
              style={{ width: 22, flexShrink: 0, alignSelf: "stretch", background: "transparent", cursor: "col-resize", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 10 }}
              title="Drag to resize"
            >
              {/* Resize affordance: ‹||› arrows in light green, near the top (just
                  below the Save all button) so users know the two panels can be
                  dragged wider/narrower. */}
              <div
                style={{
                  marginTop: 40,
                  width: 22, height: 34,
                  borderRadius: 6,
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5cae60"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 8 1 12 4 16" />
                  <polyline points="20 8 23 12 20 16" />
                  <line x1="9" y1="6" x2="9" y2="18" />
                  <line x1="15" y1="6" x2="15" y2="18" />
                </svg>
              </div>

              {/* Grip dots lower down, vertically centred in the remaining gap. */}
              <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ width: 3, height: 3, borderRadius: "50%", background: "#cbd5e1" }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* RIGHT: Element edit side panel (inline) — sticky so it floats in the
              viewport while the elements list scrolls the page behind it */}
          {sidePanelElement ? (
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", background: "#fff", position: "sticky", top: 12, alignSelf: "flex-start", maxHeight: "calc(100vh - 24px)" }}>
              {/* Side panel header */}
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0, background: "#fff" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 2 }}>
                    {sidePanelElement.friendlyName}
                  </div>
                  {sidePanelElement.description && sidePanelElement.description.trim() ? (
                    <div
                      className="placeholder-description"
                      style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(sidePanelElement.description, {
                          ADD_ATTR: ["target", "rel"],
                        }),
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {sidePanelElement.category}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSidePanelElement(null)}
                  title="Close"
                  style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #e5e7eb", background: "#fafafa", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", flexShrink: 0 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Tab Bar */}
              <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", background: "#fafafa", flexShrink: 0 }}>
                {(["manual", "chat"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      void handleOpenSidePanelTab(tab);
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

              {/* Content Area — flex column so tabs flow and the panel sizes to content */}
              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>

                {/* MANUAL TAB */}
                {sidePanelTab === "manual" && (
                  <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px" }}>
                    <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 14, lineHeight: 1.5 }}>
                      Edit <strong style={{ color: "#374151" }}>{sidePanelElement.friendlyName}</strong> directly below. Changes are saved when you click "Save all" on the elements page.
                    </p>

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
                      <RichTextEditor
                        value={formValues[sidePanelElement.placeholderKey] || ""}
                        height={160}
                        autoGrow
                        onChange={(val) => setFormValues((prev) => ({ ...prev, [sidePanelElement!.placeholderKey]: val }))}
                      />
                    ) : (
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

                {/* CHAT TAB */}
                {sidePanelTab === "chat" && (
                  <>
                    {/* Pre-start state */}
                    {chatStartedForKey !== sidePanelElement.placeholderKey && (
                      <div style={{ flex: 1, minHeight: 360, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "28px 24px", textAlign: "center", gap: 16 }}>
                        <div style={{ width: 56, height: 56, background: "#f0fdf4", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3f9f42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
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
                          onClick={async () => {
                            const canOpen = await onBeforeAiChatOpen?.();
                            if (canOpen === false) return;

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
                            "Start AI chat"
                          )}
                        </button>
                      </div>
                    )}

                    {/* Active chat — flex column: messages grow/scroll, input pinned below */}
                    {chatStartedForKey === sidePanelElement.placeholderKey && (
                      <div style={{ flex: 1, minHeight: 360, display: "flex", flexDirection: "column", position: "relative" }}>
                        {/* Scrollable messages */}
                        <div ref={chatScrollRef} onScroll={handleChatScroll} style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 16px" }}>
                          {messages.map((msg: any, idx: number) => {
                            const raw: string = msg.content || "";
                            const { content, isHtml } = prepareChatContent(raw);

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
                                    flexShrink: 0, marginTop: 2,
                                  }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3f9f42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <rect x="3" y="11" width="18" height="10" rx="2" />
                                      <circle cx="12" cy="5" r="2" />
                                      <path d="M12 7v4" />
                                      <line x1="8" y1="16" x2="8" y2="16" />
                                      <line x1="16" y1="16" x2="16" y2="16" />
                                    </svg>
                                  </span>
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
                                    ? <div
                                        className="rendered-html-content"
                                        style={{ overflowWrap: "anywhere", maxWidth: "100%" }}
                                        dangerouslySetInnerHTML={{
                                          __html: DOMPurify.sanitize(content, { ADD_ATTR: ["target", "rel"] }),
                                        }}
                                      />
                                    : <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{content}</p>
                                  }
                                  <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: "right" }}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {/* Thinking indicator (in-panel) */}
                          {isTyping && (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                              <span style={{ width: 26, height: 26, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3f9f42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="3" y="11" width="18" height="10" rx="2" />
                                  <circle cx="12" cy="5" r="2" />
                                  <path d="M12 7v4" />
                                </svg>
                              </span>
                              <div style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 14px", display: "flex", gap: 6, alignItems: "center" }}>
                                <div style={{ display: "flex", gap: 4 }}>
                                  {[0, 1, 2].map((i) => (
                                    <div key={i} style={{
                                      width: 6, height: 6, borderRadius: "50%", background: "#9ca3af",
                                      animation: "campaign-builder-dot-bounce 1.4s ease-in-out infinite",
                                      animationDelay: `${i * 0.16}s`,
                                    }} />
                                  ))}
                                </div>
                                <span style={{ fontSize: 12, color: "#6b7280" }}>Thinking…</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Floating scroll-to-bottom arrow */}
                        {showScrollDown && (
                          <button
                            onClick={() => scrollChatToBottom(true)}
                            title="Scroll to latest"
                            style={{
                              position: "absolute",
                              bottom: 88,
                              left: "50%",
                              transform: "translateX(-50%)",
                              width: 34,
                              height: 34,
                              borderRadius: "50%",
                              background: "#fff",
                              border: "1px solid #d1d5db",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#374151",
                              zIndex: 5,
                            }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>
                        )}

                        {/* Input — pinned to the bottom of the panel */}
                        <div style={{ flexShrink: 0, borderTop: "1px solid #e5e7eb", padding: "12px 16px", background: "#fff" }}>
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
          ) : previewPanelOpen ? (
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", background: "#fff", position: "sticky", top: 12, alignSelf: "flex-start", height: "calc(100vh - 24px)" }}>
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
          ) : null}
        </div>
      </div>
    </>
  );
};

export default BlueprintBuilderPanel;
