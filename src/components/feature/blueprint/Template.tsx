import React, { useState, useEffect, useCallback } from "react";
import { Tooltip as ReactTooltip } from "react-tooltip";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import API_BASE_URL from "../../../config";
import "./Template.css";
import { useCreditCheck } from "../../../hooks/useCreditCheck";
import { useAppModal } from "../../../hooks/useAppModal";
import EmailCampaignBuilder from "./EmailCampaignBuilder";
import PaginationControls from "../PaginationControls";
import duplicateIcon from "../../../assets/images/icons/duplicate.png";

const menuBtnStyle = {
  width: "100%",
  padding: "8px 18px",
  textAlign: "left",
  background: "none",
  border: "none",
  color: "#222",
  fontSize: "15px",
  cursor: "pointer",
} as React.CSSProperties;

interface Prompt {
  id: number;
  name: string;
  text: string;
  userId?: number;
  createdAt?: string;
  template?: string;
  description?: string;
}

interface CampaignTemplate {
  id: number;
  clientId: string;
  templateName: string;
  aiInstructions: string;
  placeholderListInfo: string;
  masterBlueprintUnpopulated: string;
  placeholderListWithValue: string;
  campaignBlueprint: string;
  placeholderValues?: Record<string, string>;
  selectedModel: string;
  createdAt: string;
  updatedAt?: string;
  hasConversation?: boolean;
}

// ✅ NEW: Template Definition interface
interface TemplateDefinition {
  id: number;
  templateName: string;
  aiInstructions: string;
  aiInstructionsForEdit: string;
  placeholderList: string;
  masterBlueprintUnpopulated: string;
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
  usageCount: number;
}

interface TemplateProps {
  selectedClient: string;
  userRole?: string;
  isDemoAccount?: boolean;
  onTemplateSelect?: (prompt: Prompt) => void;
}

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ script: "sub" }, { script: "super" }],
    ["clean"],
  ],
};

const Template: React.FC<TemplateProps> = ({
  selectedClient,
  userRole = "USER",
  isDemoAccount = false,
  onTemplateSelect,
}) => {
  // States
  const [campaignTemplates, setCampaignTemplates] = useState<CampaignTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCampaignTemplate, setSelectedCampaignTemplate] = useState<CampaignTemplate | null>(null);
  const [templateActionsAnchor, setTemplateActionsAnchor] = useState<string | null>(null);
  
  // Modal states
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showViewCampaignModal, setShowViewCampaignModal] = useState(false);
  const [showEditCampaignModal, setShowEditCampaignModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameInput, setRenameInput] = useState("");
  const [showCloneConfirmModal, setShowCloneConfirmModal] = useState(false);
  const [showCloneNameModal, setShowCloneNameModal] = useState(false);
  const [cloneNameInput, setCloneNameInput] = useState("");
  
  const [viewCampaignTab, setViewCampaignTab] = useState<"example" | "template">("example");
  const [exampleEmail, setExampleEmail] = useState("");
  const [editableCampaignTemplate, setEditableCampaignTemplate] = useState("");
  const [currentPlaceholderValues, setCurrentPlaceholderValues] = useState<Record<string, string>>({});
  
  const [editCampaignForm, setEditCampaignForm] = useState({
    templateName: "",
    aiInstructions: "",
    placeholderListInfo: "",
    masterBlueprintUnpopulated: "",
    selectedModel: "gpt-5",
  });
  
  const appModal = useAppModal();
  const { checkUserCredits, showCreditModal, closeCreditModal, handleSkipModal, credits } = useCreditCheck();
  const userId = sessionStorage.getItem("clientId");
  const effectiveUserId = selectedClient !== "" ? selectedClient : userId;

  const [showCampaignBuilder, setShowCampaignBuilder] = useState(false);

  // ✅ NEW: Template name modal states
  const [showTemplateNameModal, setShowTemplateNameModal] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState("");
  const [templateDefinitions, setTemplateDefinitions] = useState<TemplateDefinition[]>([]);
  const [selectedTemplateDefinitionId, setSelectedTemplateDefinitionId] = useState<number | null>(null);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);

  // Utility functions
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    
    const options: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "short",
      year: "numeric",
    };
    return date.toLocaleDateString("en-GB", options);
  };

  // ✅ NEW: Fetch template definitions
  const fetchTemplateDefinitions = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/CampaignPrompt/template-definitions?activeOnly=true`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setTemplateDefinitions(data.templateDefinitions || []);
      
      // ✅ Auto-select first template definition
      if (data.templateDefinitions && data.templateDefinitions.length > 0) {
        setSelectedTemplateDefinitionId(data.templateDefinitions[0].id);
      }
    } catch (error) {
      console.error("Error fetching template definitions:", error);
      setTemplateDefinitions([]);
    }
  }, []);

  // Fetch campaign templates
  const fetchCampaignTemplates = useCallback(async () => {
    if (!effectiveUserId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/CampaignPrompt/templates/${effectiveUserId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setCampaignTemplates(data.templates || []);
    } catch (error) {
      console.error("Error fetching campaign templates:", error);
      setCampaignTemplates([]);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveUserId]);

  // ✅ NEW: Handle create campaign button click
  const handleCreateCampaignClick = async () => {
    // Check credits before allowing blueprint creation
    if (sessionStorage.getItem("isDemoAccount") !== "true" && effectiveUserId) {
      const currentCredits = await checkUserCredits(effectiveUserId);
      
      if (currentCredits && !currentCredits.canGenerate) {
        return; // Stop execution if can't generate
      }
    }

    // Fetch template definitions first
    await fetchTemplateDefinitions();
    
    // Show template name modal
    setShowTemplateNameModal(true);
    setTemplateNameInput("");
  };

  // ✅ NEW: Handle template name submission
 // ✅ UPDATED: Handle template name submission
const handleTemplateNameSubmit = async () => {
  if (!templateNameInput.trim()) {
    appModal.showError("Please enter a campaign name");
    return;
  }
  if (!selectedTemplateDefinitionId) {
    appModal.showError("Please select a template definition first");
    return;
  }

  setIsCreatingCampaign(true);

  try {
    const response = await fetch(`${API_BASE_URL}/api/CampaignPrompt/campaign/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: effectiveUserId,
        templateDefinitionId: selectedTemplateDefinitionId,
        templateName: templateNameInput,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create campaign");
    }

    const data = await response.json();

    if (data.success || data.Success) {
      // ✅ Store campaign info
      sessionStorage.setItem("newCampaignId", data.campaignId.toString());
      sessionStorage.setItem("newCampaignName", data.templateName);
      sessionStorage.setItem("selectedTemplateDefinitionId", selectedTemplateDefinitionId.toString());
      sessionStorage.setItem("autoStartConversation", "true");
      sessionStorage.setItem("openConversationTab", "true"); // ✅ NEW FLAG
      
      // ✅ Close modal and open builder
      setShowTemplateNameModal(false);
      setShowCampaignBuilder(true);
    } else {
      throw new Error(data.message || data.Message || "Failed to create campaign");
    }
  } catch (error) {
    console.error("Error creating campaign:", error);
    appModal.showError(  "Failed to create campaign");
  } finally {
    setIsCreatingCampaign(false); // Loader disappears after
  }
};

  // Update template
  const handleUpdateCampaignTemplate = async () => {
    if (!selectedCampaignTemplate || !editCampaignForm.templateName) {
      appModal.showError("Please fill all required fields");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/CampaignPrompt/template/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedCampaignTemplate.id,
          templateName: editCampaignForm.templateName,
          aiInstructions: editCampaignForm.aiInstructions,
          placeholderListInfo: editCampaignForm.placeholderListInfo,
          masterBlueprintUnpopulated: editCampaignForm.masterBlueprintUnpopulated,
          selectedModel: editCampaignForm.selectedModel,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update campaign template");
      }

      appModal.showSuccess("Campaign template updated successfully!");
      setShowEditCampaignModal(false);
      await fetchCampaignTemplates();
    } catch (error) {
      appModal.showError("Failed to update campaign template");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete campaign template
  const handleDeleteCampaignTemplate = async () => {
    if (!selectedCampaignTemplate) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/CampaignPrompt/template/${selectedCampaignTemplate.id}/delete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete campaign template");
      }

      appModal.showSuccess("Campaign template deleted successfully!");
      setShowDeleteConfirmModal(false);
      setSelectedCampaignTemplate(null);
      await fetchCampaignTemplates();
    } catch (error) {
      appModal.showError("Failed to delete campaign template");
    } finally {
      setIsLoading(false);
    }
  };

  // Rename campaign template
  const handleRenameCampaignTemplate = async () => {
    if (!selectedCampaignTemplate || !renameInput.trim()) {
      appModal.showError("Please enter a valid name");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/CampaignPrompt/rename-Template`, {
        method: "POST",
        headers: { 
          "accept": "*/*",
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({
          clientId: effectiveUserId,
          templateId: selectedCampaignTemplate.id,
          templateName: renameInput.trim()
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to rename campaign template");
      }

      appModal.showSuccess("Campaign template renamed successfully!");
      setShowRenameModal(false);
      setSelectedCampaignTemplate(null);
      setRenameInput("");
      await fetchCampaignTemplates();
    } catch (error) {
      appModal.showError("Failed to rename campaign template");
    } finally {
      setIsLoading(false);
    }
  };

  // Clone campaign template with name
  const handleCloneCampaignTemplate = async () => {
    if (!selectedCampaignTemplate || !cloneNameInput.trim()) {
      appModal.showError("Please enter a name for the cloned template");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/CampaignPrompt/clone-template?clientId=${effectiveUserId}&templateId=${selectedCampaignTemplate.id}&Name=${encodeURIComponent(cloneNameInput.trim())}`, {
        method: "POST",
        headers: { "accept": "*/*" },
        body: ""
      });

      if (!response.ok) {
        throw new Error("Failed to clone campaign template");
      }

      appModal.showSuccess("Campaign template cloned successfully!");
      setShowCloneNameModal(false);
      setSelectedCampaignTemplate(null);
      setCloneNameInput("");
      await fetchCampaignTemplates();
    } catch (error) {
      appModal.showError("Failed to clone campaign template");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter templates
  const filteredCampaignTemplates = campaignTemplates.filter((template) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      template.templateName.toLowerCase().includes(searchLower) ||
      template.id.toString().includes(searchLower)
    );
  });
  //pagination
const [currentPage, setCurrentPage] = useState(1);
const [pageSize, setPageSize] = useState<number | "All">(10);
//const pageSize = 10;
const effectivePageSize = pageSize === "All" ? filteredCampaignTemplates.length : pageSize;
const totalPages =effectivePageSize === 0 ? 1 : Math.ceil(filteredCampaignTemplates.length / effectivePageSize);

const startIndex = pageSize === "All" ? 0 :(currentPage - 1) * effectivePageSize;
const paginatedTemplates =
  pageSize === "All"
    ? filteredCampaignTemplates
    : filteredCampaignTemplates.slice(startIndex, startIndex + (effectivePageSize || 0));
  // Effects
  useEffect(() => {
    if (effectiveUserId) {
      fetchCampaignTemplates();
    }
  }, [effectiveUserId, fetchCampaignTemplates]);

const generateExampleEmail = (template: CampaignTemplate) => {
  if (!template) return "";

  if ((template as any).exampleOutput) {       // ✅ DB field preferred
    return (template as any).exampleOutput;
  }

  if (template.placeholderValues?.example_output) {
    return template.placeholderValues.example_output;
  }

  return template.campaignBlueprint || "";
};

  const fetchCampaignTemplateDetails = async (templateId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/CampaignPrompt/campaign/${templateId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("AI data",data);
      return data;
    } catch (error) {
      console.error("Error fetching template details:", error);
      return null;
    }
  };
const extractExampleOutputEmail = (placeholderListWithValue?: string) => {
  debugger
  if (!placeholderListWithValue) return "";

  // Match everything after {example_output_email} =
  const match = placeholderListWithValue.match(
    /\{example_output_email\}\s*=\s*([\s\S]*)/i
  );

  return match ? match[1].trim() : "";
};
  const handleViewCampaignTemplate = async (template: CampaignTemplate) => {
    setIsLoading(true);
    try {
      const fullTemplate = await fetchCampaignTemplateDetails(template.id);
      if (fullTemplate) {
        debugger
        setSelectedCampaignTemplate(fullTemplate);
        const exampleEmailHtml = extractExampleOutputEmail(
  fullTemplate.placeholderListWithValue
)
setExampleEmail(exampleEmailHtml);
       // setExampleEmail(generateExampleEmail(fullTemplate));
        setEditableCampaignTemplate(fullTemplate.campaignBlueprint || "");
        setCurrentPlaceholderValues(fullTemplate.placeholderValues || {});
        setViewCampaignTab("example");
        setShowViewCampaignModal(true);
      }
    } catch (error) {
      appModal.showError("Failed to load template details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCampaignTemplateChanges = async () => {
    if (!selectedCampaignTemplate) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/CampaignPrompt/template/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedCampaignTemplate.id,
          templateName: selectedCampaignTemplate.templateName,
          aiInstructions: selectedCampaignTemplate.aiInstructions,
          placeholderListInfo: selectedCampaignTemplate.placeholderListInfo,
          masterBlueprintUnpopulated: selectedCampaignTemplate.masterBlueprintUnpopulated,
          campaignBlueprint: editableCampaignTemplate,
          selectedModel: selectedCampaignTemplate.selectedModel,
          placeholderValues: currentPlaceholderValues,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update campaign template");
      }

      appModal.showSuccess("Campaign template updated successfully!");
      await fetchCampaignTemplates();
    } catch (error) {
      appModal.showError("Failed to update campaign template");
    } finally {
      setIsLoading(false);
    }
  };
 return (
  <div className="template-container">
    {!showCampaignBuilder ? (
      <>
        <div className="section-wrapper" style={{marginTop:'-60px'}}>
          <h2 className="section-title">Blueprints</h2>

          {/* Search and Create button */}
          <div className="controls-wrapper">
            <input
              type="text"
              className="search-input"
              placeholder="Search a blueprint name or ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              className="button save-button auto-width small"
              onClick={handleCreateCampaignClick}
            >
              <span className="text-[20px] mr-1">+</span> Create campaign blueprint
            </button>
          </div>
          <div style={{marginBottom:"10px"}}>
           <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalRecords={filteredCampaignTemplates.length}
              setCurrentPage={setCurrentPage}
              setPageSize={setPageSize}
              showPageSizeDropdown={true}
              pageLabel="Page:"
            />
            </div>

          {/* Campaign Templates Table */}
          <table className="contacts-table">
            <thead>
              <tr>
                <th>Blueprints</th>
                <th>ID</th>
                <th>Creation date</th>
                <th style={{ minWidth: 48 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center" }}>
                    Loading...
                  </td>
                </tr>
              ) : paginatedTemplates.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center" }}>
                    No campaign blueprint found.
                  </td>
                </tr>
              ) : (
                paginatedTemplates.map((template) => (
                  <tr key={template.id}>
                    <td>
                      <span
                        className="template-link"
                        onClick={() => handleViewCampaignTemplate(template)}
                      >
                        {template.templateName}
                      </span>
                    </td>
                    <td>#{template.id}</td>
                    <td>{formatDate(template.createdAt)}</td>
                    <td style={{ position: "relative" }}>
                      <button
                        className="template-actions-btn"
                        onClick={() =>
                          setTemplateActionsAnchor(
                            `campaign-${template.id}` ===
                              templateActionsAnchor
                              ? null
                              : `campaign-${template.id}`
                          )
                        }
                      >
                        ⋮
                      </button>

                      {templateActionsAnchor === `campaign-${template.id}` && (
                        <div className="template-actions-menu">
                          <button
                            onClick={() => {
                              handleViewCampaignTemplate(template);
                              setTemplateActionsAnchor(null);
                            }}
                            style={menuBtnStyle}
                            className="flex gap-2 items-center"
                          >
                            <span>
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24px"
                                    height="24px"
                                    viewBox="0 0 24 20"
                                    fill="none"
                                  >
                                    <circle
                                      cx="12"
                                      cy="12"
                                      r="4"
                                      fill="#33363F"
                                    />
                                    <path
                                      d="M21 12C21 12 20 4 12 4C4 4 3 12 3 12"
                                      stroke="#33363F"
                                      stroke-width="2"
                                    />
                                  </svg>
                                </span>
                            <span>View</span>
                          </button>

                            <>
                              <button
                                onClick={() => {
                                sessionStorage.setItem("editTemplateId", template.id.toString());
                                sessionStorage.setItem("editTemplateMode", "true");

                                // REQUIRED FIX 🔥 (builder reads this!)
                                sessionStorage.setItem("newCampaignId", template.id.toString());
                                sessionStorage.setItem("newCampaignName", template.templateName);


                                // Safe delay
                                setTimeout(() => {
                                  setShowCampaignBuilder(true);
                                }, 0);

                                setTemplateActionsAnchor(null);
                                }}
                                style={menuBtnStyle}
                                className="flex gap-2 items-center"
                              >
                                <span>
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="28px"
                                      height="28px"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                    >
                                      <path
                                        d="M12 3.99997H6C4.89543 3.99997 4 4.8954 4 5.99997V18C4 19.1045 4.89543 20 6 20H18C19.1046 20 20 19.1045 20 18V12M18.4142 8.41417L19.5 7.32842C20.281 6.54737 20.281 5.28104 19.5 4.5C18.7189 3.71895 17.4526 3.71895 16.6715 4.50001L15.5858 5.58575M18.4142 8.41417L12.3779 14.4505C12.0987 14.7297 11.7431 14.9201 11.356 14.9975L8.41422 15.5858L9.00257 12.6441C9.08001 12.2569 9.27032 11.9013 9.54951 11.6221L15.5858 5.58575M18.4142 8.41417L15.5858 5.58575"
                                        stroke="#000000"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                      ></path>
                                    </svg>
                                  </span>
                                <span>Edit</span>
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedCampaignTemplate(template);
                                  setRenameInput(template.templateName);
                                  setShowRenameModal(true);
                                  setTemplateActionsAnchor(null);
                                }}
                                style={menuBtnStyle}
                                className="flex gap-2 items-center"
                              >
                                <span>
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="28px"
                                      height="28px"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                    >
                                      <path
                                        d="M12 3.99997H6C4.89543 3.99997 4 4.8954 4 5.99997V18C4 19.1045 4.89543 20 6 20H18C19.1046 20 20 19.1045 20 18V12M18.4142 8.41417L19.5 7.32842C20.281 6.54737 20.281 5.28104 19.5 4.5C18.7189 3.71895 17.4526 3.71895 16.6715 4.50001L15.5858 5.58575M18.4142 8.41417L12.3779 14.4505C12.0987 14.7297 11.7431 14.9201 11.356 14.9975L8.41422 15.5858L9.00257 12.6441C9.08001 12.2569 9.27032 11.9013 9.54951 11.6221L15.5858 5.58575M18.4142 8.41417L15.5858 5.58575"
                                        stroke="#000000"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                      ></path>
                                    </svg>
                                  </span>
                                <span>Rename</span>
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedCampaignTemplate(template);
                                  setCloneNameInput(`${template.templateName} - copy`);
                                  setShowCloneNameModal(true);
                                  setTemplateActionsAnchor(null);
                                }}
                                style={menuBtnStyle}
                                className="flex gap-2 items-center"
                              >
                                <span> <img src={duplicateIcon}alt="Clone"style={{width: "23px",height: "23px",objectFit: "contain",}} /></span>
                                <span>Clone</span>
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedCampaignTemplate(template);
                                  setShowDeleteConfirmModal(true);
                                  setTemplateActionsAnchor(null);
                                }}
                                style={menuBtnStyle}
                                className="flex gap-2 items-center"
                              >
                                <span className="ml-[3px]">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 50 50"
                                      width="22px"
                                      height="22px"
                                    >
                                      <path d="M 21 2 C 19.354545 2 18 3.3545455 18 5 L 18 7 L 8 7 A 1.0001 1.0001 0 1 0 8 9 L 9 9 L 9 45 C 9 46.654 10.346 48 12 48 L 38 48 C 39.654 48 41 46.654 41 45 L 41 9 L 42 9 A 1.0001 1.0001 0 1 0 42 7 L 32 7 L 32 5 C 32 3.3545455 30.645455 2 29 2 L 21 2 z M 21 4 L 29 4 C 29.554545 4 30 4.4454545 30 5 L 30 7 L 20 7 L 20 5 C 20 4.4454545 20.445455 4 21 4 z M 19 14 C 19.552 14 20 14.448 20 15 L 20 40 C 20 40.553 19.552 41 19 41 C 18.448 41 18 40.553 18 40 L 18 15 C 18 14.448 18.448 14 19 14 z M 25 14 C 25.552 14 26 14.448 26 15 L 26 40 C 26 40.553 25.552 41 25 41 C 24.448 41 24 40.553 24 40 L 24 15 C 24 14.448 24.448 14 25 14 z M 31 14 C 31.553 14 32 14.448 32 15 L 32 40 C 32 40.553 31.553 41 31 41 C 30.447 41 30 40.553 30 40 L 30 15 C 30 14.448 30.447 14 31 14 z"></path>
                                    </svg>
                                  </span>
                                <span>Delete</span>
                              </button>
                            </>
                          
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
           <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalRecords={paginatedTemplates.length}
            setCurrentPage={setCurrentPage}
            setPageSize={setPageSize}
            showPageSizeDropdown={true}
            pageLabel="Page:"
            />
        </div>

      {/* ✅ NEW: Template Name Modal */}
{/* ✅ UPDATED: Template Name Modal */}
{showTemplateNameModal && (

  <div className="modal-backdrop">
    <div
      className="modal-content"
      onClick={(e) => e.stopPropagation()}
      style={{ maxWidth: "600px" }}
    >
      <div className="modal-header">
        <h2>📝 Create new campaign blueprint</h2>
        <button 
          className="modal-close-btn"
          onClick={() => setShowTemplateNameModal(false)}
          style={{
            background: "none",
            border: "none",
            fontSize: "24px",
            cursor: "pointer",
            color: "#6b7280"
          }}
        >
          ✕
        </button>
      </div>
      
      <div className="modal-body" style={{ padding: "24px" }}>
        {/* ✅ Template Definition Selector */}
        <div className="form-group" style={{ marginBottom: "20px" }}>
          <label htmlFor="templateDefinition" style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
            Select base template <span style={{ color: "red" }}>*</span>
          </label>
          <select
            id="templateDefinition"
            value={selectedTemplateDefinitionId || ''}
            onChange={(e) => setSelectedTemplateDefinitionId(parseInt(e.target.value))}
            style={{
              width: "100%",
             // padding: "12px 16px",
              border: "2px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "15px",
              backgroundColor: "white"
            }}
          >
            <option value="">-- Select a template definition --</option>
            {templateDefinitions.map((def) => (
              <option key={def.id} value={def.id}>
                {def.templateName} {def.usageCount > 0 && `(Used ${def.usageCount} times)`}
              </option>
            ))}
          </select>
          <p style={{ 
            marginTop: "8px", 
            fontSize: "13px", 
            color: "#6b7280" 
          }}>
            💡 Choose which template structure to use for this campaign
          </p>
        </div>

        {/* Template Name Input */}
        <div className="form-group" style={{ marginBottom: "20px" }}>
          <label htmlFor="templateName" style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
            Campaign name <span style={{ color: "red" }}>*</span>
          </label>
          <input
            id="templateName"
            type="text"
            value={templateNameInput}
            onChange={(e) => setTemplateNameInput(e.target.value)}
            placeholder="e.g., IBM Sales Outreach - Q1 2024"
            autoFocus
            onKeyPress={(e) => {
              if (e.key === 'Enter' && templateNameInput.trim() && selectedTemplateDefinitionId) {
                handleTemplateNameSubmit();
              }
            }}
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "2px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "15px"
            }}
          />
          <p style={{ 
            marginTop: "8px", 
            fontSize: "13px", 
            color: "#6b7280" 
          }}>
            💡 Give this specific campaign instance a unique name
          </p>
        </div>

        {/* Template Definition Preview */}

      </div>
      
      <div className="modal-footer" style={{ 
        display: "flex", 
        gap: "12px", 
        padding: "16px 24px",
        borderTop: "1px solid #e5e7eb",
        justifyContent: "flex-end"
      }}>
        <button 
          className="button secondary"
          onClick={() => setShowTemplateNameModal(false)}
          disabled={isCreatingCampaign}
          style={{
            padding: "10px 20px",
            borderRadius: "8px",
            cursor: "pointer"
          }}
        >
          Cancel
        </button>
<button
  className="button save-button"
  onClick={handleTemplateNameSubmit}
  disabled={!templateNameInput.trim() || !selectedTemplateDefinitionId || isCreatingCampaign}
>
  {isCreatingCampaign ? (
    <>
      <span className="spinner" style={{ marginRight: "8px" }}>⏳</span>
      Creating campaign...
    </>
  ) : (
    <>
      Create blueprint
    </>
  )}
</button>
      </div>
    </div>
  </div>
)}
      {/* Clone Name Input Modal */}
      {showCloneNameModal && selectedCampaignTemplate && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: "500px", padding: "24px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "24px", color: "#1f2937" }}>Clone blueprint</h2>
            
            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label htmlFor="cloneNameInput" style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px", color: "#374151" }}>
                New blueprint name <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                id="cloneNameInput"
                type="text"
                value={cloneNameInput}
                onChange={(e) => setCloneNameInput(e.target.value)}
                placeholder="Enter name for cloned blueprint"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && cloneNameInput.trim()) {
                    handleCloneCampaignTemplate();
                  }
                }}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s"
                }}
                onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
              />
              <p style={{ 
                marginTop: "8px", 
                fontSize: "13px", 
                color: "#6b7280" 
              }}>
                💡 Cloning from: <strong>{selectedCampaignTemplate.templateName}</strong>
              </p>
            </div>
            
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px" }}>
              <button
                onClick={() => {
                  setShowCloneNameModal(false);
                  setSelectedCampaignTemplate(null);
                  setCloneNameInput("");
                }}
                disabled={isLoading}
                style={{
                  padding: "10px 20px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  backgroundColor: "white",
                  color: "#374151",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCloneCampaignTemplate}
                disabled={isLoading || !cloneNameInput.trim()}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "8px",
                  backgroundColor: "#22c55e",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: cloneNameInput.trim() ? "pointer" : "not-allowed",
                  opacity: cloneNameInput.trim() ? 1 : 0.6
                }}
              >
                {isLoading ? "Cloning..." : "Clone Blueprint"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && selectedCampaignTemplate && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: "500px", padding: "24px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "24px", color: "#1f2937" }}>Rename blueprint</h2>
            
            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label htmlFor="renameInput" style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px", color: "#374151" }}>
                Blueprint name <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                id="renameInput"
                type="text"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                placeholder="Enter blueprint name"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && renameInput.trim()) {
                    handleRenameCampaignTemplate();
                  }
                }}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s"
                }}
                onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
              />
            </div>
            
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px" }}>
              <button
                onClick={() => {
                  setShowRenameModal(false);
                  setSelectedCampaignTemplate(null);
                  setRenameInput("");
                }}
                disabled={isLoading}
                style={{
                  padding: "10px 20px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  backgroundColor: "white",
                  color: "#374151",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRenameCampaignTemplate}
                disabled={isLoading || !renameInput.trim()}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "8px",
                  backgroundColor: "#22c55e",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: renameInput.trim() ? "pointer" : "not-allowed",
                  opacity: renameInput.trim() ? 1 : 0.6
                }}
              >
                {isLoading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && selectedCampaignTemplate && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{padding:"15px"}}>
            <h2>Confirm deletion</h2>
            <p>
              Are you sure you want to delete the campaign template{" "}
              <strong>"{selectedCampaignTemplate.templateName}"</strong>?
            </p>
            <div className="modal-footer">
              <button
                className="button secondary"
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setSelectedCampaignTemplate(null);
                }}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                className="button"
                style={{ backgroundColor: "#3f9f42", color: "white" }}
                onClick={handleDeleteCampaignTemplate}
                disabled={isLoading}
              >
                {isLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Campaign Template Modal */}
{showViewCampaignModal && selectedCampaignTemplate && (
  <div className="modal-backdrop">
    <div className="modal-content modal-large">

       {/* ✅ Header with close (✕) icon */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
        marginTop:"-22px",
          borderBottom: "1px solid #e5e7eb"
        }}
      >
        <button
          onClick={() => {
            setShowViewCampaignModal(false);
            setSelectedCampaignTemplate(null);
            setExampleEmail("");
          }}
          style={{
            background: "none",
            border: "none",
            fontSize: "22px",
            cursor: "pointer",
            color: "#6b7280",
            fontWeight: "bold"
          }}
          aria-label="Close"
        >
          ✕
        </button>
      </div>


      {/* Render ONLY Example Output */}
       <div className="modal-body">
      <div
        className="example-output-preview"
        style={{
          background: "#ffffff",
          padding: "20px",
          borderRadius: "8px",
          border: "1px solid #e5e7eb",
          height: "auto",
          overflowY: "hidden"
        }}
        dangerouslySetInnerHTML={{
          __html: exampleEmail || "<p>No example email available</p>"
        }}
      />
    </div>
  </div>
  </div>
)}


      {/* Edit Campaign Modal */}
      {showEditCampaignModal && selectedCampaignTemplate && (
        <div className="modal-backdrop">
          <div className="modal-content modal-large">
            <h2>Advanced Edit: {selectedCampaignTemplate.templateName}</h2>
            
            <div className="form-group">
              <label>Template Name</label>
              <input
                type="text"
                value={editCampaignForm.templateName}
                onChange={(e) => setEditCampaignForm({ ...editCampaignForm, templateName: e.target.value })}
                placeholder="Template Name"
              />
            </div>

            <div className="form-group">
              <label>AI Instructions</label>
              <textarea
                value={editCampaignForm.aiInstructions}
                onChange={(e) => setEditCampaignForm({ ...editCampaignForm, aiInstructions: e.target.value })}
                rows={6}
                placeholder="AI Instructions for conversation"
              />
            </div>

            <div className="form-group">
              <label>Placeholder List</label>
              <textarea
                value={editCampaignForm.placeholderListInfo}
                onChange={(e) => setEditCampaignForm({ ...editCampaignForm, placeholderListInfo: e.target.value })}
                rows={4}
                placeholder="{name}, {company}, {role}"
              />
            </div>

            <div className="form-group">
              <label>Master Blueprint (Unpopulated)</label>
              <textarea
                value={editCampaignForm.masterBlueprintUnpopulated}
                onChange={(e) => setEditCampaignForm({ ...editCampaignForm, masterBlueprintUnpopulated: e.target.value })}
                rows={10}
                placeholder="Template with {placeholders}"
              />
            </div>

            <div className="form-group">
              <label>GPT Model</label>
              <select
                value={editCampaignForm.selectedModel}
                onChange={(e) => setEditCampaignForm({ ...editCampaignForm, selectedModel: e.target.value })}
              >
                <option value="gpt-4.1">GPT-4.1</option>
                <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
                <option value="gpt-5">GPT-5</option>
                <option value="gpt-5-mini">GPT-5 Mini</option>
                <option value="gpt-5-nano">GPT-5 Nano</option>
              </select>
            </div>

            <div className="modal-footer">
              <button
                className="button secondary"
                onClick={() => {
                  setShowEditCampaignModal(false);
                  setEditCampaignForm({
                    templateName: "",
                    aiInstructions: "",
                    placeholderListInfo: "",
                    masterBlueprintUnpopulated: "",
                    selectedModel: "gpt-5",
                  });
                }}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                className="button save-button"
                onClick={handleUpdateCampaignTemplate}
                disabled={isLoading || !editCampaignForm.templateName}
              >
                {isLoading ? "Updating..." : "Update Template"}
              </button>
            </div>
          </div>
        </div>
      )}
 </>
    ) : (
      /* ✅ Show Campaign Builder Inline */
      <div>
<div
  style={{
    display: "flex",
    gap:"16px" ,
    alignItems:"center",
    marginBottom:"20px",
    marginTop:"-60px"
    // borderBottom: "1px solid #e5e7eb",
    // background: "#f9fafb"
  }}
>
  <button
    onClick={async () => {
      // ✅ Close UI first
      setShowCampaignBuilder(false);

      // ✅ Give React state a tick before cleanup
      setTimeout(async () => {
        // Only clear temp campaign session, not builder state keys used later
        sessionStorage.removeItem("newCampaignId");
        sessionStorage.removeItem("newCampaignName");
        sessionStorage.removeItem("autoStartConversation");
        sessionStorage.removeItem("openConversationTab");

        // Don’t remove selectedTemplateDefinitionId – we need that next time

        // ✅ Refresh campaign list
        await fetchCampaignTemplates();
      }, 300);
    }}
    style={{
      background: "#eaeaea", // ✅ Match PitchKraft green
      color: "#222",
      border: "none",
      borderRadius: "4px",
      padding: "8px 16px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "600"
    }}
  >
    ← Back
  </button>
   
    <h2>{sessionStorage.getItem("newCampaignName") || "Blueprint"}</h2>
  
</div>


        <div style={{ marginTop: "46px" }}>
          <EmailCampaignBuilder selectedClient={selectedClient} />
        </div>
      </div>
    )}
    
    {/* Credit Check Modal */}
    <CreditCheckModal
      isOpen={showCreditModal}
      onClose={closeCreditModal}
      onSkip={handleSkipModal}
      credits={credits || 0}
      setTab={() => {}} // Not needed in this context
    />
  </div>
);
};

export default Template;
                