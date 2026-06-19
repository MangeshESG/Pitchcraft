import React, { useState, useMemo } from "react";
import type { PlaceholderDefinitionUI } from "./EmailCampaignBuilder";
import RichTextEditor from "../../common/RTEEditor";
import CommonSidePanel from "../../common/CommonSidePanel";
import "./EmailCampaignBuilder.css";

type GPTModel = { id: string; name: string; description?: string };

export interface TemplateDefinition {
  id: number;
  templateName: string;
  aiInstructions: string;
  aiInstructionsForEdit: string;
  placeholderList: string;
  placeholderListExtensive: string;
  masterBlueprintUnpopulated: string;
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
  usageCount: number;
}

export interface InstructionSetManagerProps {
  // Template definitions list
  templateDefinitions: TemplateDefinition[];
  selectedTemplateDefinitionId: number | null;
  isSavingDefinition: boolean;

  // Template fields
  templateName: string;
  setTemplateName: (v: string) => void;
  systemPrompt: string;
  setSystemPrompt: (v: string) => void;
  systemPromptForEdit: string;
  setSystemPromptForEdit: (v: string) => void;
  masterPrompt: string;
  setMasterPrompt: (v: string) => void;
  masterPromptExtensive: string;
  setMasterPromptExtensive: (v: string) => void;
  previewText: string;
  setPreviewText: (v: string) => void;
  searchURLCount: number;
  setSearchURLCount: (v: number) => void;
  subjectInstructions: string;
  setSubjectInstructions: (v: string) => void;
  webSearchInstructions: string;
  setWebSearchInstructions: (v: string) => void;
  selectedModel: string;
  setSelectedModel: (v: string) => void;
  availableModels: GPTModel[];

  // Placeholder manager (shared with builder)
  uiPlaceholders: PlaceholderDefinitionUI[];
  setUiPlaceholders: React.Dispatch<React.SetStateAction<PlaceholderDefinitionUI[]>>;

  // Actions — implemented in parent, toast logic included
  onLoadTemplateDefinition: (id: number) => Promise<void>;
  onSaveTemplateDefinition: () => Promise<void>;
  onUpdateTemplateDefinition: () => Promise<void>;
  onDeleteTemplateDefinition: () => Promise<void>;
  onCreateNewInstruction: () => void;
  onStartConversation: () => void;
  onSavePlaceholderDefinitions: () => Promise<void>;
  onDeletePlaceholderDefinition: (key: string) => Promise<void>;
}

type InstructionSubTab =
  | "ai_new"
  | "ai_edit"
  | "placeholder_short"
  | "placeholders"
  | "ct"
  | "web_search_instructions"
  | "subject_instructions";

const InstructionSetManager: React.FC<InstructionSetManagerProps> = ({
  templateDefinitions,
  selectedTemplateDefinitionId,
  isSavingDefinition,
  templateName, setTemplateName,
  systemPrompt, setSystemPrompt,
  systemPromptForEdit, setSystemPromptForEdit,
  masterPrompt, setMasterPrompt,
  masterPromptExtensive, setMasterPromptExtensive,
  previewText, setPreviewText,
  searchURLCount, setSearchURLCount,
  subjectInstructions, setSubjectInstructions,
  webSearchInstructions, setWebSearchInstructions,
  selectedModel, setSelectedModel,
  availableModels,
  uiPlaceholders, setUiPlaceholders,
  onLoadTemplateDefinition,
  onSaveTemplateDefinition,
  onUpdateTemplateDefinition,
  onDeleteTemplateDefinition,
  onCreateNewInstruction,
  onStartConversation,
  onSavePlaceholderDefinitions,
  onDeletePlaceholderDefinition,
}) => {
  const [instructionSubTab, setInstructionSubTab] = useState<InstructionSubTab>("ai_new");

  // Placeholder whose description popup is currently open (null = closed)
  const [descEditKey, setDescEditKey] = useState<string | null>(null);
  const descEditPlaceholder = descEditKey
    ? uiPlaceholders.find((p) => p.placeholderKey === descEditKey) ?? null
    : null;

  const formatCategoryLabel = (category: string) =>
    category.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  const categoryList = useMemo(() => {
    const map = new Map<string, number>();
    uiPlaceholders.forEach((p) => {
      map.set(p.category, p.categorySequence ?? 999);
    });
    return Array.from(map.entries())
      .map(([name, seq]) => ({ name, seq }))
      .sort((a, b) => a.seq - b.seq);
  }, [uiPlaceholders]);

  const movePlaceholder = (key: string, direction: "up" | "down") => {
    setUiPlaceholders((prev) => {
      const current = prev.find((p) => p.placeholderKey === key);
      if (!current) return prev;
      const category = current.category;
      const sameCategory = prev
        .filter((p) => p.category === category)
        .sort((a, b) => a.placeholderSequence - b.placeholderSequence);
      const idx = sameCategory.findIndex((p) => p.placeholderKey === key);
      if (idx === -1) return prev;
      if (direction === "up" && idx > 0)
        [sameCategory[idx - 1], sameCategory[idx]] = [sameCategory[idx], sameCategory[idx - 1]];
      if (direction === "down" && idx < sameCategory.length - 1)
        [sameCategory[idx], sameCategory[idx + 1]] = [sameCategory[idx + 1], sameCategory[idx]];
      sameCategory.forEach((p, i) => { p.placeholderSequence = i + 1; });
      return prev.map((p) =>
        p.category === category
          ? sameCategory.find((x) => x.placeholderKey === p.placeholderKey)!
          : p,
      );
    });
  };

  const moveCategory = (category: string, direction: "up" | "down") => {
    setUiPlaceholders((prev) => {
      let categorySeqList = Array.from(new Set(prev.map((p) => p.category))).map((cat, idx) => ({
        name: cat,
        seq: prev.find((p) => p.category === cat)?.categorySequence ?? idx + 1,
      }));
      categorySeqList.sort((a, b) => a.seq - b.seq);
      const index = categorySeqList.findIndex((c) => c.name === category);
      if (index === -1) return prev;
      if (direction === "up" && index > 0) {
        const tmp = categorySeqList[index - 1].seq;
        categorySeqList[index - 1].seq = categorySeqList[index].seq;
        categorySeqList[index].seq = tmp;
      }
      if (direction === "down" && index < categorySeqList.length - 1) {
        const tmp = categorySeqList[index + 1].seq;
        categorySeqList[index + 1].seq = categorySeqList[index].seq;
        categorySeqList[index].seq = tmp;
      }
      categorySeqList = categorySeqList
        .sort((a, b) => a.seq - b.seq)
        .map((c, idx2) => ({ ...c, seq: idx2 + 1 }));
      return prev.map((p) => ({
        ...p,
        categorySequence:
          categorySeqList.find((c) => c.name === p.category)?.seq ?? p.categorySequence,
      }));
    });
  };

  function SimpleTextarea({
    value,
    onChange,
    className = "instruction-textarea",
    ...props
  }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
      <textarea
        defaultValue={value}
        onBlur={(e) => onChange && onChange(e)}
        className={className}
        style={{
          width: "100%",
          minHeight: "50000px",
          maxHeight: "1000px",
          overflowY: "auto",
          resize: "vertical",
          padding: "10px",
          fontSize: "14px",
          border: "1px solid #ccc",
          borderRadius: "6px",
          background: "#fff",
        }}
        {...props}
      />
    );
  }

  const SUB_TABS: [InstructionSubTab, string][] = [
    ["ai_new", "AI instructions (new blueprint)"],
    ["ai_edit", "AI instructions (edit blueprint)"],
    ["placeholder_short", "Placeholders list (essential)"],
    ["placeholders", "Placeholder manager"],
    ["ct", "UT "],
    ["subject_instructions", "Email subject instructions"],
    ["web_search_instructions", "Web search instructions"],
  ];

  return (
    <div className="instructions-wrapper">
      {/* ======================================================
          TOP HEADER SECTION (Picklist + Inputs + Buttons)
      ====================================================== */}
      <div className="instructions-header !px-[0]">
        {/* Load Template Definition */}
        <div className="load-template-box">
          <label className="section-label">Load existing template definition</label>
          <select
            className="definition-select"
            value={selectedTemplateDefinitionId || ""}
            onChange={(e) => {
              const id = Number(e.target.value);
              if (id) onLoadTemplateDefinition(id);
            }}
          >
            <option value="">-- Select a template definition --</option>
            {templateDefinitions.map((def) => (
              <option key={def.id} value={def.id}>
                {def.templateName} (Used {def.usageCount} times)
              </option>
            ))}
          </select>
        </div>

        <div className="input-row">
          {/* Template Name */}
          <div className="template-name-box">
            <label className="section-label">Template name</label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Enter template name"
              className="text-input"
            />
          </div>

          {/* Model Picker */}
          <div className="model-select-box">
            <label className="section-label">Select AI model</label>
            <select
              className="definition-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="search-count-box">
            <label className="section-label">Search URL count</label>
            <select
              className="definition-select"
              value={searchURLCount}
              onChange={(e) => setSearchURLCount(Number(e.target.value))}
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="button-row">
            {selectedTemplateDefinitionId === null && (
              <button
                className="save-btn"
                onClick={onSaveTemplateDefinition}
                disabled={isSavingDefinition}
                style={{ borderRadius: "12px" }}
              >
                {isSavingDefinition ? "Saving..." : "Save template definition"}
              </button>
            )}

            {selectedTemplateDefinitionId !== null && (
              <button
                className="save-btn"
                style={{ background: "#2563eb", borderRadius: "12px" }}
                onClick={onUpdateTemplateDefinition}
                disabled={isSavingDefinition}
              >
                {isSavingDefinition ? "Updating..." : "Update template definition"}
              </button>
            )}

            <button
              className="start-btn"
              onClick={onStartConversation}
              disabled={!selectedTemplateDefinitionId}
              style={{ borderRadius: "12px" }}
            >
              Start filling placeholders →
            </button>

            <button className="new-btn" onClick={onCreateNewInstruction} style={{ borderRadius: "12px" }}>
              + New instruction
            </button>
          </div>

          {selectedTemplateDefinitionId !== null && (
            <button
              className="delete-btn"
              style={{ background: "#dc2626", color: "white", borderRadius: "12px" }}
              onClick={onDeleteTemplateDefinition}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* ======================================================
          INTERNAL SUB-TABS
      ====================================================== */}
      <div className="instruction-subtabs">
        {SUB_TABS.map(([key, label]) => (
          <button
            key={key}
            className={`subtab-btn ${instructionSubTab === key ? "active" : ""}`}
            onClick={() => setInstructionSubTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ======================================================
          SUB-TAB CONTENT
      ====================================================== */}
      <div className="instruction-subtab-content">
        {instructionSubTab === "ai_new" && (
          <SimpleTextarea
            value={systemPrompt}
            onChange={(e: any) => setSystemPrompt(e.target.value)}
            placeholder="AI instructions (new blueprint)..."
          />
        )}

        {instructionSubTab === "ai_edit" && (
          <SimpleTextarea
            value={systemPromptForEdit}
            onChange={(e: any) => setSystemPromptForEdit(e.target.value)}
            placeholder="AI instructions (edit blueprint)..."
          />
        )}

        {instructionSubTab === "placeholder_short" && (
          <SimpleTextarea
            value={masterPrompt}
            onChange={(e: any) => setMasterPrompt(e.target.value)}
            placeholder="Short placeholder list..."
          />
        )}

        {instructionSubTab === "placeholders" && (
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "20px",
            }}
          >
            <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>
              Placeholder manager
            </h3>

            {/* HEADER ROW */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 2fr 2fr 2fr 2fr 2fr 1fr 1fr 90px 60px 60px",
                gap: "10px",
                fontWeight: 600,
                fontSize: "13px",
                color: "#374151",
                marginBottom: "10px",
              }}
            >
              <div>Placeholder</div>
              <div>Friendly name</div>
              <div>Category</div>
              <div>Input / Options</div>
              <div>Default value</div>
              <div>Help link</div>
              <div>Size</div>
              <div>Expand</div>
              <div>Description</div>
              <div>Move</div>
              <div>Delete</div>
            </div>

            {/* CATEGORY GROUPS */}
            {categoryList.map((cat) => (
              <div key={cat.name} style={{ marginBottom: "20px" }}>
                {/* CATEGORY HEADER */}
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    margin: "12px 0 8px 0",
                    borderBottom: "1px solid #e5e7eb",
                    paddingBottom: "6px",
                  }}
                >
                  <span>{formatCategoryLabel(cat.name)}</span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      style={{ padding: "4px 8px", borderRadius: "6px", background: "#e5e7eb", cursor: "pointer" }}
                      onClick={() => moveCategory(cat.name, "up")}
                    >↑</button>
                    <button
                      style={{ padding: "4px 8px", borderRadius: "6px", background: "#e5e7eb", cursor: "pointer" }}
                      onClick={() => moveCategory(cat.name, "down")}
                    >↓</button>
                  </div>
                </div>

                {/* PLACEHOLDERS IN CATEGORY */}
                {uiPlaceholders
                  .filter((p) => p.category === cat.name)
                  .sort((a, b) => a.placeholderSequence - b.placeholderSequence)
                  .map((p) => (
                    <div
                      key={p.placeholderKey}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2fr 2fr 2fr 2fr 2fr 2fr 1fr 1fr 90px 60px 60px",
                        gap: "10px",
                        alignItems: "center",
                        marginBottom: "10px",
                      }}
                    >
                      {/* Placeholder Key */}
                      <strong>{`{${p.placeholderKey}}`}</strong>

                      {/* Friendly Name */}
                      <input
                        value={p.friendlyName}
                        onChange={(e) => {
                          const v = e.target.value;
                          setUiPlaceholders((prev) =>
                            prev.map((x) =>
                              x.placeholderKey === p.placeholderKey ? { ...x, friendlyName: v } : x,
                            ),
                          );
                        }}
                        className="text-input"
                      />

                      {/* Category */}
                      <select
                        value={p.category}
                        onChange={(e) => {
                          const v = e.target.value.toLowerCase().trim();
                          setUiPlaceholders((prev) =>
                            prev.map((x) =>
                              x.placeholderKey === p.placeholderKey ? { ...x, category: v } : x,
                            ),
                          );
                        }}
                        className="definition-select"
                      >
                        <option value="call-to-action">CALL-TO-ACTION</option>
                        <option value="core message focus">CORE MESSAGE FOCUS</option>
                        <option value="dos and don'ts">DOS AND DON'TS</option>
                        <option value="extra assets">EXTRA ASSETS</option>
                        <option value="extra visuals">EXTRA VISUALS</option>
                        <option value="greetings & farewells">GREETINGS & FAREWELLS</option>
                        <option value="message writing style">MESSAGE WRITING STYLE</option>
                        <option value="subject line">SUBJECT LINE</option>
                        <option value="your company">YOUR COMPANY</option>
                        <option value="smart conditions">SMART CONDITIONS</option>
                        <option value="images">IMAGES</option>
                      </select>

                      {/* Input Type + Options */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <select
                          value={p.inputType}
                          onChange={(e) => {
                            const v = e.target.value as any;
                            setUiPlaceholders((prev) =>
                              prev.map((x) =>
                                x.placeholderKey === p.placeholderKey
                                  ? {
                                    ...x,
                                    inputType: v,
                                    isRichText: v === "richtext",
                                    isExpandable: v === "richtext" ? x.isExpandable : false,
                                    options: v === "select" ? x.options || [] : [],
                                  }
                                  : x,
                              ),
                            );
                          }}
                          className="definition-select"
                        >
                          <option value="text">Text</option>
                          <option value="textarea">Textarea</option>
                          <option value="richtext">Rich text</option>
                          <option value="select">Dropdown</option>
                        </select>

                        {p.inputType === "select" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {(p.options || []).map((opt, idx) => (
                              <div key={idx} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const newVal = e.target.value;
                                    setUiPlaceholders((prev) =>
                                      prev.map((x) =>
                                        x.placeholderKey === p.placeholderKey
                                          ? { ...x, options: x.options?.map((o, i) => (i === idx ? newVal : o)) }
                                          : x,
                                      ),
                                    );
                                  }}
                                  className="text-input"
                                  style={{ fontSize: "12px" }}
                                />
                                <button
                                  onClick={() => {
                                    setUiPlaceholders((prev) =>
                                      prev.map((x) =>
                                        x.placeholderKey === p.placeholderKey
                                          ? { ...x, options: x.options?.filter((_, i) => i !== idx) }
                                          : x,
                                      ),
                                    );
                                  }}
                                  style={{
                                    background: "#ef4444",
                                    color: "#fff",
                                    padding: "4px 8px",
                                    borderRadius: "4px",
                                    fontSize: "12px",
                                    border: "none",
                                    cursor: "pointer",
                                  }}
                                >✕</button>
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                setUiPlaceholders((prev) =>
                                  prev.map((x) =>
                                    x.placeholderKey === p.placeholderKey
                                      ? { ...x, options: [...(x.options || []), ""] }
                                      : x,
                                  ),
                                );
                              }}
                              style={{
                                marginTop: "4px",
                                border: "1px dashed #9ca3af",
                                padding: "6px",
                                borderRadius: "6px",
                                cursor: "pointer",
                                background: "#e5e7eb",
                              }}
                            >➕ Add option</button>
                          </div>
                        )}
                      </div>

                      {/* Default Value */}
                      <div>
                        {p.inputType === "select" ? (
                          <select
                            value={p.defaultValue ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setUiPlaceholders((prev) =>
                                prev.map((x) =>
                                  x.placeholderKey === p.placeholderKey ? { ...x, defaultValue: v } : x,
                                ),
                              );
                            }}
                            className="definition-select"
                          >
                            <option value="">-- Default --</option>
                            {(p.options || []).map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={p.defaultValue ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setUiPlaceholders((prev) =>
                                prev.map((x) =>
                                  x.placeholderKey === p.placeholderKey ? { ...x, defaultValue: v } : x,
                                ),
                              );
                            }}
                            className="text-input"
                            placeholder="Default value"
                          />
                        )}
                      </div>

                      {/* Help Link */}
                      <div>
                        <input
                          type="url"
                          value={p.helpLink ?? ""}
                          placeholder="https://docs.example.com/placeholder"
                          onChange={(e) => {
                            const v = e.target.value;
                            setUiPlaceholders((prev) =>
                              prev.map((x) =>
                                x.placeholderKey === p.placeholderKey ? { ...x, helpLink: v } : x,
                              ),
                            );
                          }}
                          className="text-input"
                        />
                      </div>

                      {/* UI Size */}
                      <select
                        value={p.uiSize}
                        onChange={(e) => {
                          const v = e.target.value as "sm" | "md" | "lg" | "xl";
                          setUiPlaceholders((prev) =>
                            prev.map((x) =>
                              x.placeholderKey === p.placeholderKey ? { ...x, uiSize: v } : x,
                            ),
                          );
                        }}
                        className="definition-select"
                      >
                        <option value="sm">SM</option>
                        <option value="md">MD</option>
                        <option value="lg">LG</option>
                        <option value="xl">XL</option>
                      </select>

                      {/* Expand Toggle */}
                      <label style={{ display: "flex", justifyContent: "center" }}>
                        <input
                          type="checkbox"
                          checked={!!p.isExpandable}
                          disabled={p.inputType !== "richtext"}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setUiPlaceholders((prev) =>
                              prev.map((x) =>
                                x.placeholderKey === p.placeholderKey
                                  ? { ...x, isExpandable: checked, isRichText: checked || x.isRichText }
                                  : x,
                              ),
                            );
                          }}
                        />
                      </label>

                      {/* Description Button */}
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <button
                          onClick={() => setDescEditKey(p.placeholderKey)}
                          title={p.description ? "Edit description" : "Add description"}
                          style={{
                            padding: "6px 8px",
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            background: p.description ? "#dcfce7" : "#f3f4f6",
                            cursor: "pointer",
                            fontSize: "12px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {p.description ? "📝 Edit" : "＋ Add"}
                        </button>
                      </div>

                      {/* Move Buttons */}
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          style={{ padding: "4px 8px", borderRadius: "12px", background: "#e5e7eb", cursor: "pointer" }}
                          onClick={() => movePlaceholder(p.placeholderKey, "up")}
                        >↑</button>
                        <button
                          style={{ padding: "4px 8px", borderRadius: "12px", background: "#e5e7eb", cursor: "pointer" }}
                          onClick={() => movePlaceholder(p.placeholderKey, "down")}
                        >↓</button>
                      </div>

                      {/* Delete Button */}
                      <button
                        disabled={p.isRuntimeOnly}
                        onClick={() => onDeletePlaceholderDefinition(p.placeholderKey)}
                        title={p.isRuntimeOnly ? "Runtime placeholders cannot be deleted" : "Delete placeholder"}
                        style={{
                          background: p.isRuntimeOnly ? "#9ca3af" : "#dc2626",
                          cursor: p.isRuntimeOnly ? "not-allowed" : "pointer",
                          color: "#fff",
                          borderRadius: "12px",
                          padding: "6px 10px",
                        }}
                      >🗑️</button>
                    </div>
                  ))}
              </div>
            ))}

            <div style={{ marginTop: "20px", textAlign: "right" }}>
              <button
                onClick={onSavePlaceholderDefinitions}
                style={{ padding: "10px 18px", background: "#3f9f42", color: "#fff", borderRadius: "12px", fontWeight: 600 }}
              >
                Save placeholder settings
              </button>
            </div>
          </div>
        )}

        {instructionSubTab === "ct" && (
          <SimpleTextarea
            value={previewText}
            onChange={(e: any) => setPreviewText(e.target.value)}
            placeholder="Unpopulated master template..."
          />
        )}

        {instructionSubTab === "subject_instructions" && (
          <SimpleTextarea
            value={subjectInstructions}
            onChange={(e: any) => setSubjectInstructions(e.target.value)}
            placeholder="Enter instructions for generating email subject..."
          />
        )}

        {instructionSubTab === "web_search_instructions" && (
          <SimpleTextarea
            value={webSearchInstructions}
            onChange={(e: any) => setWebSearchInstructions(e.target.value)}
            placeholder="Enter instructions for web search. You can use placeholders like {company_name}, {job_title}, or {hook_search_terms}..."
          />
        )}

      </div>

      {/* ======================================================
          DESCRIPTION SIDE PANEL (rich text + hyperlinks, multiline)
      ====================================================== */}
      <CommonSidePanel
        isOpen={!!descEditPlaceholder}
        onClose={() => setDescEditKey(null)}
        title={
          descEditPlaceholder
            ? `Description — {${descEditPlaceholder.placeholderKey}}`
            : "Description"
        }
        width={560}
        footerContent={
          <button
            onClick={() => setDescEditKey(null)}
            style={{
              marginLeft: "auto",
              padding: "8px 18px",
              borderRadius: "10px",
              border: "none",
              background: "#3f9f42",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Done
          </button>
        }
      >
        {descEditPlaceholder && (
          <>
            <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "10px" }}>
              You can add multiple lines and hyperlinks. This text is shown to users when
              filling this placeholder.
            </p>

            <RichTextEditor
              value={descEditPlaceholder.description ?? ""}
              height={320}
              onChange={(html) =>
                setUiPlaceholders((prev) =>
                  prev.map((x) =>
                    x.placeholderKey === descEditPlaceholder.placeholderKey
                      ? { ...x, description: html }
                      : x,
                  ),
                )
              }
            />
          </>
        )}
      </CommonSidePanel>
    </div>
  );
};

export default InstructionSetManager;
