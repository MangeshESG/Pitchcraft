import React, { useState, useEffect, useCallback } from "react";
import { Tooltip as ReactTooltip } from "react-tooltip";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import API_BASE_URL from "../../config";
import "./Template.css";
import { useAppModal } from "../../hooks/useAppModal";
import EmailCampaignBuilder from "./EmailCampaignBuilder";
import PaginationControls from "./PaginationControls";

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
        model: "gpt-5",
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
const pageSize = 10;
const totalPages = Math.ceil(filteredCampaignTemplates.length / pageSize);

const startIndex = (currentPage - 1) * pageSize;
const paginatedTemplates = filteredCampaignTemplates.slice(
  startIndex,
  startIndex + pageSize
);
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
      return data;
    } catch (error) {
      console.error("Error fetching template details:", error);
      return null;
    }
  };

  const handleViewCampaignTemplate = async (template: CampaignTemplate) => {
    setIsLoading(true);
    try {
      const fullTemplate = await fetchCampaignTemplateDetails(template.id);
      if (fullTemplate) {
        setSelectedCampaignTemplate(fullTemplate);
        setExampleEmail(generateExampleEmail(fullTemplate));
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
              totalRecords={paginatedTemplates.length}
              setCurrentPage={setCurrentPage}
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
                            <span>👁</span>
                            <span>View</span>
                          </button>

                            <>
                              <button
                                onClick={() => {
                                  sessionStorage.setItem(
                                    "editTemplateId",
                                    template.id.toString()
                                  );
                                  sessionStorage.setItem(
                                    "editTemplateMode",
                                    "true"
                                  );
                                  setShowCampaignBuilder(true);
                                  setTemplateActionsAnchor(null);
                                }}
                                style={menuBtnStyle}
                                className="flex gap-2 items-center"
                              >
                                <span>✏️</span>
                                <span>Edit</span>
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
                                <span>🗑️</span>
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
            Select Base Template <span style={{ color: "red" }}>*</span>
          </label>
          <select
            id="templateDefinition"
            value={selectedTemplateDefinitionId || ''}
            onChange={(e) => setSelectedTemplateDefinitionId(parseInt(e.target.value))}
            style={{
              width: "100%",
              padding: "12px 16px",
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
            Campaign Name <span style={{ color: "red" }}>*</span>
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
      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && selectedCampaignTemplate && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2>Confirm Deletion</h2>
            <p>
              Are you sure you want to delete the campaign template{" "}
              <strong>"{selectedCampaignTemplate.templateName}"</strong>?
            </p>
            <p style={{ color: "#dc3545", fontSize: "14px" }}>
              ⚠️ This action cannot be undone. All associated conversation data will also be deleted.
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
                style={{ backgroundColor: "#dc3545", color: "white" }}
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
            <h2>View Campaign Template: {selectedCampaignTemplate.templateName}</h2>
            
            {/* Tab Navigation */}
            <div className="tabs secondary">
              <ul className="d-flex">
                <li>
                  <button
                    type="button"
                    onClick={() => setViewCampaignTab("example")}
                    className={`button ${viewCampaignTab === "example" ? "active" : ""}`}
                  >
                    Example Email
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setViewCampaignTab("template")}
                    className={`button ${viewCampaignTab === "template" ? "active" : ""}`}
                  >
                    Campaign Template
                  </button>
                </li>
              </ul>
            </div>

            {/* Example Email Tab */}
            {viewCampaignTab === "example" && (
              <div className="form-group">
                <label>Example Email Output</label>
                {userRole === "ADMIN" && !isDemoAccount ? (
                  <ReactQuill
                    theme="snow"
                    value={exampleEmail}
                    onChange={(value) => {
                      setExampleEmail(value);
                      setCurrentPlaceholderValues({
                        ...currentPlaceholderValues,
                        example_output: value
                      });
                    }}
                    modules={modules}
                    className="template-editor"
                    style={{ minHeight: "300px" }}
                  />
                  ) : (
                  <div 
                    className="template-preview example-email-preview"
                    dangerouslySetInnerHTML={{ __html: exampleEmail }}
                    style={{ 
                      minHeight: "300px",
                      backgroundColor: "#f9f9f9",
                      padding: "1rem",
                      borderRadius: "4px"
                    }}
                  />
                )}
                
                {/* Display Placeholder Values */}
                {currentPlaceholderValues && Object.keys(currentPlaceholderValues).length > 0 && (
                  <div className="placeholder-values-section" style={{ marginTop: "1rem" }}>
                    <h4>Placeholder Values:</h4>
                    <div className="placeholder-values-grid">
                      {Object.entries(currentPlaceholderValues).map(([key, value]) => (
                        key !== 'example_output' && (
                          <div key={key} className="placeholder-value-item">
                            <strong>{`{${key}}`}:</strong>
                            <span>{value}</span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Campaign Template Tab */}
            {viewCampaignTab === "template" && (
              <div className="form-group">
                <label>Campaign Template (Final Result)</label>
                  <>
                    <textarea
                      value={editableCampaignTemplate}
                      onChange={(e) => setEditableCampaignTemplate(e.target.value)}
                      className="campaign-template-textarea"
                      rows={15}
                      style={{ 
                        width: "100%",
                        fontFamily: "monospace",
                        fontSize: "0.9rem"
                      }}
                    />
                    <div className="template-metadata" style={{ marginTop: "1rem" }}>
                      <p><strong>Model:</strong> {selectedCampaignTemplate.selectedModel}</p>
                      <p><strong>Created:</strong> {formatDate(selectedCampaignTemplate.createdAt)}</p>
                      {selectedCampaignTemplate.updatedAt && (
                        <p><strong>Last Updated:</strong> {formatDate(selectedCampaignTemplate.updatedAt)}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="template-preview">
                    <pre style={{ whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
                      {selectedCampaignTemplate.campaignBlueprint || "No template content"}
                    </pre>
                  </div>
               
              </div>
            )}

            <div className="modal-footer">
              <button
                className="button secondary"
                onClick={() => {
                  setShowViewCampaignModal(false);
                  setSelectedCampaignTemplate(null);
                  setExampleEmail("");
                  setEditableCampaignTemplate("");
                  setCurrentPlaceholderValues({});
                }}
              >
                Close
              </button>
                <>
                  <button
                    className="button save-button"
                    onClick={handleSaveCampaignTemplateChanges}
                    disabled={isLoading}
                  >
                    {isLoading ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    className="button primary"
                    onClick={() => {
                      setEditCampaignForm({
                        templateName: selectedCampaignTemplate.templateName,
                        aiInstructions: selectedCampaignTemplate.aiInstructions,
                        placeholderListInfo: selectedCampaignTemplate.placeholderListInfo,
                        masterBlueprintUnpopulated: selectedCampaignTemplate.masterBlueprintUnpopulated,
                        selectedModel: selectedCampaignTemplate.selectedModel,
                      });
                      setShowViewCampaignModal(false);
                      setShowEditCampaignModal(true);
                    }}
                  >
                    Advanced Edit
                  </button>
                </>
             
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
      <div
        className="campaign-builder-container"
        style={{
          width: "100%",
          marginTop: "-65px",
          background: "#fff",
          borderRadius: "8px",
          boxShadow: "0 2px 12px rgba(0, 0, 0, 0.05)",
          padding: "0",
          overflow: "hidden"
        }}
      >
<div
  style={{
    display: "flex",
    justifyContent: "flex-start", // ⬅️ Move to left side
    padding: "12px 16px",
    borderBottom: "1px solid #e5e7eb",
    background: "#f9fafb"
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
      background: "#3f9f42", // ✅ Match PitchKraft green
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      padding: "8px 16px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "bold"
    }}
  >
    ← Back to blueprints
  </button>
</div>


        <div style={{ padding: "20px" }}>
          <EmailCampaignBuilder selectedClient={selectedClient} />
        </div>
      </div>
    )}
  </div>
);
};

export default Template;
                