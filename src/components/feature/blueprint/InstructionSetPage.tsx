import React, { useState, useEffect } from "react";
import axios from "axios";
import API_BASE_URL from "../../../config";
import InstructionSetManager, {
  TemplateDefinition,
} from "./InstructionSetManager";
import type {
  PlaceholderDefinitionUI,
  GPTModel,
} from "./EmailCampaignBuilder";
import { OPENAI_MODELS, isDeepSeekModel } from "../../../utils/aiModels";
import LoadingSpinner from "../../common/LoadingSpinner";
import "./EmailCampaignBuilder.css";

// Keep the builder / instruction set off any DeepSeek model.
const DEFAULT_BUILDER_MODEL = "gpt-5.1";
const toBuilderModel = (model?: string | null): string =>
  !model || isDeepSeekModel(model) ? DEFAULT_BUILDER_MODEL : model;

const normalizeCategory = (category: string) =>
  (category || "").trim().toLowerCase();

interface InstructionSetPageProps {
  selectedClient?: string;
}

/**
 * Standalone Instruction Set editor.
 *
 * `InstructionSetManager` is a presentational component whose state and API
 * handlers normally live inside `EmailCampaignBuilder`. This container owns that
 * logic independently so the manager can be shown as its own admin-only page
 * (Settings → Instruction set) without a campaign context. State is plain
 * `useState` (not session-backed) so it never collides with an active builder
 * session.
 */
const InstructionSetPage: React.FC<InstructionSetPageProps> = ({
  selectedClient,
}) => {
  const effectiveUserId =
    selectedClient || sessionStorage.getItem("clientId") || "";

  const availableModels: GPTModel[] = OPENAI_MODELS;

  // ---- Template definition list ----
  const [templateDefinitions, setTemplateDefinitions] = useState<
    TemplateDefinition[]
  >([]);
  const [selectedTemplateDefinitionId, setSelectedTemplateDefinitionId] =
    useState<number | null>(null);
  const [isLoadingDefinitions, setIsLoadingDefinitions] = useState(false);
  const [isSavingDefinition, setIsSavingDefinition] = useState(false);

  // ---- Editable template fields ----
  const [templateName, setTemplateName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [systemPromptForEdit, setSystemPromptForEdit] = useState("");
  const [masterPrompt, setMasterPrompt] = useState("");
  const [masterPromptExtensive, setMasterPromptExtensive] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [searchURLCount, setSearchURLCount] = useState<number>(1);
  const [subjectInstructions, setSubjectInstructions] = useState("");
  const [webSearchInstructions, setWebSearchInstructions] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>(
    DEFAULT_BUILDER_MODEL,
  );

  // ---- Placeholder (element) definitions ----
  const [uiPlaceholders, setUiPlaceholders] = useState<
    PlaceholderDefinitionUI[]
  >([]);

  // ---- Toast feedback ----
  const [toastMessage, setToastMessage] = useState("");
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);

  const flashSuccess = (msg: string) => {
    setToastMessage(msg);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 4000);
  };
  const flashError = (msg: string) => {
    setToastMessage(msg);
    setShowErrorToast(true);
    setTimeout(() => setShowErrorToast(false), 5000);
  };

  // ====================================================================
  // LOAD TEMPLATE DEFINITIONS
  // ====================================================================
  const loadTemplateDefinitions = async () => {
    setIsLoadingDefinitions(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/CampaignPrompt/template-definitions?activeOnly=true`,
      );
      const definitions: TemplateDefinition[] =
        response.data.templateDefinitions || [];
      setTemplateDefinitions(
        [...definitions].sort((a, b) =>
          a.templateName.localeCompare(b.templateName),
        ),
      );
    } catch (error) {
      console.error("Error loading template definitions:", error);
    } finally {
      setIsLoadingDefinitions(false);
    }
  };

  useEffect(() => {
    loadTemplateDefinitions();
  }, []);

  // Load placeholders whenever a definition is selected.
  useEffect(() => {
    if (!selectedTemplateDefinitionId) {
      setUiPlaceholders([]);
      return;
    }

    let isCancelled = false;
    setUiPlaceholders([]);

    axios
      .get(
        `${API_BASE_URL}/api/CampaignPrompt/placeholders/by-template/${selectedTemplateDefinitionId}`,
      )
      .then((res) => {
        if (isCancelled) return;
        const next = Array.isArray(res.data) ? res.data : [];
        setUiPlaceholders(
          next.map((p: any, index: number) => ({
            ...p,
            category: normalizeCategory(p.category),
            categorySequence: p.categorySequence ?? 999,
            placeholderSequence: p.placeholderSequence ?? index + 1,
          })),
        );
      })
      .catch((err) =>
        console.error("❌ Failed to load element definitions", err),
      );

    return () => {
      isCancelled = true;
    };
  }, [selectedTemplateDefinitionId]);

  // ====================================================================
  // SAVE / UPDATE / LOAD / DELETE
  // ====================================================================
  const savePlaceholderDefinitionsInner = async (definitionId: number) => {
    const sorted = [...uiPlaceholders].sort((a, b) => {
      if (a.categorySequence !== b.categorySequence)
        return a.categorySequence - b.categorySequence;
      return a.placeholderSequence - b.placeholderSequence;
    });

    await axios.post(`${API_BASE_URL}/api/CampaignPrompt/placeholders/save`, {
      templateDefinitionId: definitionId,
      placeholders: sorted,
    });
  };

  const saveTemplateDefinition = async () => {
    if (!templateName.trim()) {
      flashError("Please enter a template name");
      return;
    }
    if (!systemPrompt.trim() || !masterPrompt.trim()) {
      flashError("Please fill in AI Instructions and elements List");
      return;
    }

    setIsSavingDefinition(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/CampaignPrompt/template-definition/save`,
        {
          templateName,
          aiInstructions: systemPrompt,
          aiInstructionsForEdit: systemPromptForEdit,
          placeholderList: masterPrompt,
          placeholderListExtensive: masterPromptExtensive,
          masterBlueprintUnpopulated: previewText,
          createdBy: effectiveUserId,
          searchURLCount,
          subjectInstructions,
          webSearchInstructions,
          selectedModel,
        },
      );

      if (response.data.success) {
        const newId = response.data.templateDefinitionId;
        setSelectedTemplateDefinitionId(newId);
        await savePlaceholderDefinitionsInner(newId);
        await loadTemplateDefinitions();
        flashSuccess("Instruction set saved.");
      }
    } catch (error: any) {
      console.error("Error saving template definition:", error);
      if (error.response?.data?.message?.includes("already exists")) {
        flashError(
          "A template with this name already exists. Please use a different name.",
        );
      } else {
        flashError("Failed to save instruction set.");
      }
    } finally {
      setIsSavingDefinition(false);
    }
  };

  const savePlaceholderDefinitions = async () => {
    if (!selectedTemplateDefinitionId) return;
    try {
      await savePlaceholderDefinitionsInner(selectedTemplateDefinitionId);
      flashSuccess("Element definitions saved.");
    } catch (err) {
      console.error("Failed to save element definitions", err);
      flashError("Failed to save element definitions.");
    }
  };

  const updateTemplateDefinition = async () => {
    if (!selectedTemplateDefinitionId) {
      flashError("No template selected to update.");
      return;
    }

    setIsSavingDefinition(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/CampaignPrompt/template-definition/update`,
        {
          id: selectedTemplateDefinitionId,
          templateName,
          aiInstructions: systemPrompt,
          aiInstructionsForEdit: systemPromptForEdit,
          placeholderList: masterPrompt,
          placeholderListExtensive: masterPromptExtensive,
          masterBlueprintUnpopulated: previewText,
          searchURLCount,
          subjectInstructions,
          webSearchInstructions,
          selectedModel,
        },
      );
      flashSuccess("Template updated successfully.");
      await loadTemplateDefinitions();
    } catch (err) {
      console.error("Update failed:", err);
      flashError("Failed to update template definition.");
    } finally {
      setIsSavingDefinition(false);
    }
  };

  const loadTemplateDefinitionById = async (id: number) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/CampaignPrompt/template-definition/${id}`,
      );
      const def = response.data;

      setTemplateName(def.templateName || "");
      setSystemPrompt(def.aiInstructions || "");
      setSystemPromptForEdit(def.aiInstructionsForEdit || "");
      setMasterPrompt(def.placeholderList || "");
      setMasterPromptExtensive(def.placeholderListExtensive || "");
      setPreviewText(def.masterBlueprintUnpopulated || "");
      setSearchURLCount(def.searchURLCount || 1);
      setSubjectInstructions(def.subjectInstructions || "");
      setWebSearchInstructions(def.webSearchInstructions || "");
      setSelectedModel(toBuilderModel(def.selectedModel));
      setSelectedTemplateDefinitionId(def.id);
    } catch (error) {
      console.error("⚠️ Failed to load template definition:", error);
    }
  };

  const createNewInstruction = () => {
    setSelectedTemplateDefinitionId(null);
    setTemplateName("");
    setSystemPrompt("");
    setSystemPromptForEdit("");
    setMasterPrompt("");
    setMasterPromptExtensive("");
    setPreviewText("");
    setSubjectInstructions("");
    setWebSearchInstructions("");
    setUiPlaceholders([]);
  };

  const deleteTemplateDefinition = async () => {
    if (!selectedTemplateDefinitionId) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this template definition? This cannot be undone.",
    );
    if (!confirmDelete) return;

    try {
      await axios.post(
        `${API_BASE_URL}/api/CampaignPrompt/template-definition/${selectedTemplateDefinitionId}/deactivate`,
      );
      flashSuccess("Template deleted successfully.");
      createNewInstruction();
      await loadTemplateDefinitions();
    } catch (error) {
      console.error("Delete failed:", error);
      flashError("Failed to delete template definition.");
    }
  };

  const deletePlaceholderDefinition = async (placeholderKey: string) => {
    if (!selectedTemplateDefinitionId) return;

    const confirmDelete = window.confirm(
      `Delete placeholder {${placeholderKey}}?\n\nThis will remove it from the template definition.`,
    );
    if (!confirmDelete) return;

    try {
      await axios.post(`${API_BASE_URL}/api/CampaignPrompt/placeholders/delete`, {
        templateDefinitionId: selectedTemplateDefinitionId,
        placeholderKey,
      });

      // Remove and re-normalize per-category ordering.
      setUiPlaceholders((prev) => {
        const filtered = prev.filter((p) => p.placeholderKey !== placeholderKey);
        const grouped: Record<string, PlaceholderDefinitionUI[]> = {};
        filtered.forEach((p) => {
          if (!grouped[p.category]) grouped[p.category] = [];
          grouped[p.category].push(p);
        });
        return Object.values(grouped).flatMap((list) =>
          list
            .sort((a, b) => a.placeholderSequence - b.placeholderSequence)
            .map((p, idx) => ({ ...p, placeholderSequence: idx + 1 })),
        );
      });
    } catch (err) {
      console.error("❌ Failed to delete placeholder", err);
      flashError("Failed to delete placeholder definition.");
    }
  };

  return (
    <div className="email-campaign-builder" style={{ padding: 20 }}>
      {isLoadingDefinitions && (
        <LoadingSpinner message="Loading instruction sets..." />
      )}

      {/* Toasts */}
      {(showSuccessToast || showErrorToast) && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 9999,
            padding: "12px 18px",
            borderRadius: 8,
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            background: showSuccessToast ? "#3f9f42" : "#dc2626",
          }}
        >
          {toastMessage}
        </div>
      )}

      <InstructionSetManager
        templateDefinitions={templateDefinitions}
        selectedTemplateDefinitionId={selectedTemplateDefinitionId}
        isSavingDefinition={isSavingDefinition}
        templateName={templateName}
        setTemplateName={setTemplateName}
        systemPrompt={systemPrompt}
        setSystemPrompt={setSystemPrompt}
        systemPromptForEdit={systemPromptForEdit}
        setSystemPromptForEdit={setSystemPromptForEdit}
        masterPrompt={masterPrompt}
        setMasterPrompt={setMasterPrompt}
        masterPromptExtensive={masterPromptExtensive}
        setMasterPromptExtensive={setMasterPromptExtensive}
        previewText={previewText}
        setPreviewText={setPreviewText}
        searchURLCount={searchURLCount}
        setSearchURLCount={setSearchURLCount}
        subjectInstructions={subjectInstructions}
        setSubjectInstructions={setSubjectInstructions}
        webSearchInstructions={webSearchInstructions}
        setWebSearchInstructions={setWebSearchInstructions}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        availableModels={availableModels}
        uiPlaceholders={uiPlaceholders}
        setUiPlaceholders={setUiPlaceholders}
        onLoadTemplateDefinition={loadTemplateDefinitionById}
        onSaveTemplateDefinition={saveTemplateDefinition}
        onUpdateTemplateDefinition={updateTemplateDefinition}
        onDeleteTemplateDefinition={deleteTemplateDefinition}
        onCreateNewInstruction={createNewInstruction}
        onStartConversation={() => {
          /* Not applicable outside the campaign builder. */
        }}
        onSavePlaceholderDefinitions={savePlaceholderDefinitions}
        onDeletePlaceholderDefinition={deletePlaceholderDefinition}
      />
    </div>
  );
};

export default InstructionSetPage;
