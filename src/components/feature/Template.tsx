import React, { useState, useEffect, useCallback } from "react";
import { Tooltip as ReactTooltip } from "react-tooltip";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import API_BASE_URL from "../../config";
import "./Template.css";
import { useAppModal } from "../../hooks/useAppModal";
import EmailCampaignBuilder from "./EmailCampaignBuilder";

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

// Updated CampaignTemplate interface with new column names
interface CampaignTemplate {
  id: number;
  clientId: string;
  templateName: string;
  aiInstructions: string; // Changed from systemPrompt
  placeholderListInfo: string; // Changed from masterPrompt
  masterBlueprintUnpopulated: string; // Changed from previewText
  placeholderListWithValue: string; // Changed from finalPrompt
  campaignBlueprint: string; // Changed from finalPreviewText
  placeholderValues?: Record<string, string>;
  selectedModel: string;
  createdAt: string;
  updatedAt?: string;
  hasConversation?: boolean;
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
  const [templates, setTemplates] = useState<Prompt[]>([]);
  const [campaignTemplates, setCampaignTemplates] = useState<CampaignTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Prompt | null>(null);
  const [selectedCampaignTemplate, setSelectedCampaignTemplate] = useState<CampaignTemplate | null>(null);
  const [templateActionsAnchor, setTemplateActionsAnchor] = useState<string | null>(null);
  const [activeTemplateType, setActiveTemplateType] = useState<"regular" | "campaign">("regular");
  
  // Modal states
  const [showAddTemplateModal, setShowAddTemplateModal] = useState(false);
  const [showEditTemplateModal, setShowEditTemplateModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showViewCampaignModal, setShowViewCampaignModal] = useState(false);
  const [showEditCampaignModal, setShowEditCampaignModal] = useState(false);
  
  const [viewCampaignTab, setViewCampaignTab] = useState<"example" | "template">("example");
  const [exampleEmail, setExampleEmail] = useState("");
  const [editableCampaignTemplate, setEditableCampaignTemplate] = useState("");
  const [currentPlaceholderValues, setCurrentPlaceholderValues] = useState<Record<string, string>>({});
    
  // Form states
  const [addTemplateForm, setAddTemplateForm] = useState({
    name: "",
    description: "",
    template: "",
    instructions: "",
  });
  
  const [editTemplateForm, setEditTemplateForm] = useState({
    name: "",
    description: "",
    template: "",
    instructions: "",
  });
  
  // Updated editCampaignForm with new property names
  const [editCampaignForm, setEditCampaignForm] = useState({
    templateName: "",
    aiInstructions: "", // Changed from systemPrompt
    placeholderListInfo: "", // Changed from masterPrompt
    masterBlueprintUnpopulated: "", // Changed from previewText
    selectedModel: "gpt-5",
  });
  
  // Tab states for modals
  const [addModalTab, setAddModalTab] = useState<"Template" | "Instructions">("Template");
  const [editModalTab, setEditModalTab] = useState<"Template" | "Instructions">("Template");
  const [viewModalTab, setViewModalTab] = useState<"Template" | "Instructions">("Template");
  
  const appModal = useAppModal();
  const userId = sessionStorage.getItem("clientId");
  const effectiveUserId = selectedClient !== "" ? selectedClient : userId;

  const [showCampaignBuilder, setShowCampaignBuilder] = useState(false);

  // Utility functions
  const formatTextForDisplay = (text: string) => {
    return text.replace(/\n/g, "<br/>");
  };

  const formatTextForEditor = (text: string) => {
    return text.replace(/<br\/>/g, "\n");
  };

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

  // Fetch regular templates
  const fetchTemplates = useCallback(async () => {
    if (!effectiveUserId) return;

    setIsLoading(true);
    try {
      const url = `${API_BASE_URL}/api/auth/getprompts/${effectiveUserId}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: Prompt[] = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error("Error fetching templates:", error);
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveUserId]);

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

  // Create template
  const handleCreateTemplate = async () => {
    if (!addTemplateForm.name || !addTemplateForm.template || !addTemplateForm.instructions) {
      appModal.showError("Please fill all required fields");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/addprompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addTemplateForm.name,
          text: addTemplateForm.instructions,
          template: addTemplateForm.template,
          userId: Number(effectiveUserId),
          createdAt: new Date().toISOString(),
          description: addTemplateForm.description,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create template");
      }

      appModal.showSuccess("Template created successfully!");
      setShowAddTemplateModal(false);
      setAddTemplateForm({
        name: "",
        description: "",
        template: "",
        instructions: "",
      });
      await fetchTemplates();
    } catch (error) {
      appModal.showError("Failed to create template");
    } finally {
      setIsLoading(false);
    }
  };

  // Update template
  const handleUpdateTemplate = async () => {
    if (!selectedTemplate || !editTemplateForm.name || !editTemplateForm.template || !editTemplateForm.instructions) {
      appModal.showError("Please fill all required fields");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/updateprompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTemplate.id,
          name: editTemplateForm.name,
          text: editTemplateForm.instructions,
          template: editTemplateForm.template,
          userId: Number(effectiveUserId),
          createdAt: selectedTemplate.createdAt || new Date().toISOString(),
          description: editTemplateForm.description,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update template");
      }

      appModal.showSuccess("Template updated successfully!");
      setShowEditTemplateModal(false);
      await fetchTemplates();
    } catch (error) {
      appModal.showError("Failed to update template");
    } finally {
      setIsLoading(false);
    }
  };

  // Updated handleUpdateCampaignTemplate with new property names
  const handleUpdateCampaignTemplate = async () => {
    if (!selectedCampaignTemplate || !editCampaignForm.templateName) {
      appModal.showError("Please fill all required fields");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/CampaignPrompt/template/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedCampaignTemplate.id,
          templateName: editCampaignForm.templateName,
          aiInstructions: editCampaignForm.aiInstructions, // Updated
          placeholderListInfo: editCampaignForm.placeholderListInfo, // Updated
          masterBlueprintUnpopulated: editCampaignForm.masterBlueprintUnpopulated, // Updated
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

  // Delete template
  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/deleteprompt/${selectedTemplate.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: Number(effectiveUserId) }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        
        if (response.status === 500 && errorText.includes("FK_Campaigns_Prompts")) {
          appModal.showError(
            "Cannot delete this template because it's being used by one or more campaigns. Please remove or update those campaigns first."
          );
        } else {
          throw new Error("Failed to delete template");
        }
        return;
      }

      appModal.showSuccess("Template deleted successfully!");
      setShowDeleteConfirmModal(false);
      setSelectedTemplate(null);
      await fetchTemplates();
    } catch (error) {
      appModal.showError("Failed to delete template. Please try again.");
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
  const filteredTemplates = templates.filter((template) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      template.name.toLowerCase().includes(searchLower) ||
      template.id.toString().includes(searchLower) ||
      (template.description || "").toLowerCase().includes(searchLower)
    );
  });

  const filteredCampaignTemplates = campaignTemplates.filter((template) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      template.templateName.toLowerCase().includes(searchLower) ||
      template.id.toString().includes(searchLower)
    );
  });

  // Effects
  useEffect(() => {
    if (effectiveUserId) {
      if (activeTemplateType === "regular") {
        fetchTemplates();
      } else {
        fetchCampaignTemplates();
      }
    }
  }, [effectiveUserId, activeTemplateType, fetchTemplates, fetchCampaignTemplates]);

  // Updated generateExampleEmail function
   // Updated generateExampleEmail function
  const generateExampleEmail = (template: CampaignTemplate) => {
    if (!template.placeholderValues) return "";
    
    // Look for {example_output} in placeholder values
    const placeholders = template.placeholderValues as Record<string, string>;
    if (placeholders.example_output) {
      return placeholders.example_output;
    }
    
    // If no example_output, generate from campaign blueprint
    return template.campaignBlueprint || "";
  };

  // Update the fetch function to get full template data
  const fetchCampaignTemplateDetails = async (templateId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/CampaignPrompt/template/${templateId}`);
      
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

  // Update the view handler
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

  // Updated handleSaveCampaignTemplateChanges with new property names
  const handleSaveCampaignTemplateChanges = async () => {
    if (!selectedCampaignTemplate) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/CampaignPrompt/template/update`, {
        method: "PUT",
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
      <div className="section-wrapper">
        <h2 className="section-title">Templates</h2>

        {/* Template Type Tabs */}
        <div className="tabs secondary mb-4">
          <ul className="d-flex">
            <li>
              <button
                type="button"
                onClick={() => setActiveTemplateType("regular")}
                className={`button ${activeTemplateType === "regular" ? "active" : ""}`}
              >
                Regular Templates
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setActiveTemplateType("campaign")}
                className={`button ${activeTemplateType === "campaign" ? "active" : ""}`}
              >
                Campaign Templates
              </button>
            </li>
          </ul>
        </div>

        {/* Search and Create button */}
        <div className="controls-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder="Search a template name or ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            className="button save-button auto-width small"
            onClick={() => {
              if (activeTemplateType === "regular") {
                setShowAddTemplateModal(true);
              } else {
                setShowCampaignBuilder(true);
              }
            }}
            disabled={userRole !== "ADMIN"}
          >
            <span className="text-[20px] mr-1">+</span> Create {activeTemplateType === "campaign" ? "campaign" : "a"} template
          </button>
        </div>

        {/* Templates Table */}
        <table className="contacts-table">
          <thead>
            <tr>
              <th>Templates</th>
              <th>ID</th>
              <th>{activeTemplateType === "campaign" ? "Model" : "Folder"}</th>
              <th>Creation date</th>
              <th>{activeTemplateType === "campaign" ? "Has Conversation" : "Description"}</th>
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
            ) : activeTemplateType === "regular" ? (
              filteredTemplates.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center" }}>
                    No templates found.
                  </td>
                </tr>
              ) : (
                filteredTemplates.map((template) => (
                  <tr key={template.id}>
                    <td>
                      <span
                        className="template-link"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setShowViewModal(true);
                          setViewModalTab("Template");
                        }}
                      >
                        {template.name}
                      </span>
                    </td>
                    <td>#{template.id}</td>
                    <td>Your First Folder</td>
                    <td>{formatDate(template.createdAt)}</td>
                    <td>{template.description || "-"}</td>
                    <td style={{ position: "relative" }}>
                      <button
                        className="template-actions-btn"
                        onClick={() =>
                          setTemplateActionsAnchor(
                            `regular-${template.id}` === templateActionsAnchor
                              ? null
                              : `regular-${template.id}`
                          )
                        }
                      >
                        ⋮
                      </button>
                      
                      {templateActionsAnchor === `regular-${template.id}` && (
                        <div className="template-actions-menu">
                          <button
                            onClick={() => {
                              setSelectedTemplate(template);
                              setShowViewModal(true);
                              setViewModalTab("Template");
                              setTemplateActionsAnchor(null);
                            }}
                            style={menuBtnStyle}
                            className="flex gap-2 items-center"
                          >
                            <span>👁</span>
                            <span>View</span>
                          </button>
                          
                          {!isDemoAccount && userRole === "ADMIN" && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedTemplate(template);
                                  setEditTemplateForm({
                                    name: template.name,
                                    description: template.description || "",
                                    template: template.template || "",
                                    instructions: template.text || "",
                                  });
                                  setShowEditTemplateModal(true);
                                  setEditModalTab("Template");
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
                                  setSelectedTemplate(template);
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
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )
            ) : (
              // Campaign Templates
              filteredCampaignTemplates.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center" }}>
                    No campaign templates found.
                  </td>
                </tr>
              ) : (
                filteredCampaignTemplates.map((template) => (
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
                    <td>{template.selectedModel}</td>
                    <td>{formatDate(template.createdAt)}</td>
                    <td>{template.hasConversation ? "Yes" : "No"}</td>
                    <td style={{ position: "relative" }}>
                      <button
                        className="template-actions-btn"
                        onClick={() =>
                          setTemplateActionsAnchor(
                            `campaign-${template.id}` === templateActionsAnchor
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
                          
                          {!isDemoAccount && userRole === "ADMIN" && (
                            <>
                            <button
                              onClick={() => {
                                // Store the template ID in sessionStorage
                                sessionStorage.setItem('editTemplateId', template.id.toString());
                                sessionStorage.setItem('editTemplateMode', 'true');
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
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )
            )}
          </tbody>
        </table>
      </div>

      {/* Add Template Modal */}
      {showAddTemplateModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2>Create Template</h2>
            
            <div className="form-group">
              <label>Template name <span className="required">*</span></label>
              <input
                type="text"
                value={addTemplateForm.name}
                onChange={(e) => 
                  setAddTemplateForm({ ...addTemplateForm, name: e.target.value })
                }
                placeholder="Enter template name"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={addTemplateForm.description}
                onChange={(e) => 
                  setAddTemplateForm({ ...addTemplateForm, description: e.target.value })
                }
                placeholder="Enter template description"
                rows={3}
              />
            </div>

            {userRole === "ADMIN" && (
              <div className="tabs secondary">
                <ul className="d-flex">
                  <li>
                    <button
                      type="button"
                      onClick={() => setAddModalTab("Template")}
                      className={`button ${addModalTab === "Template" ? "active" : ""}`}
                    >
                      Template
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setAddModalTab("Instructions")}
                      className={`button ${addModalTab === "Instructions" ? "active" : ""}`}
                    >
                      Instructions
                    </button>
                  </li>
                </ul>
              </div>
            )}

            {addModalTab === "Template" && (
              <div className="form-group">
                <label>Template <span className="required">*</span></label>
                <ReactQuill
                  theme="snow"
                  value={formatTextForDisplay(addTemplateForm.template)}
                  onChange={(value) => 
                    setAddTemplateForm({ 
                      ...addTemplateForm, 
                      template: formatTextForEditor(value) 
                    })
                  }
                  modules={modules}
                  className="template-editor"
                />
              </div>
            )}

                       {addModalTab === "Instructions" && userRole === "ADMIN" && (
              <div className="form-group">
                <label>Instructions <span className="required">*</span></label>
                <ReactQuill
                  theme="snow"
                  value={formatTextForDisplay(addTemplateForm.instructions)}
                  onChange={(value) => 
                    setAddTemplateForm({ 
                      ...addTemplateForm, 
                      instructions: formatTextForEditor(value) 
                    })
                  }
                  modules={modules}
                  className="template-editor"
                />
              </div>
            )}

            <div className="modal-footer">
              <button
                className="button secondary"
                onClick={() => {
                  setShowAddTemplateModal(false);
                  setAddTemplateForm({
                    name: "",
                    description: "",
                    template: "",
                    instructions: "",
                  });
                }}
              >
                Cancel
              </button>
              <button
                className="button save-button"
                onClick={handleCreateTemplate}
                disabled={
                  !addTemplateForm.name || 
                  !addTemplateForm.template || 
                  !addTemplateForm.instructions ||
                  isLoading
                }
              >
                {isLoading ? "Creating..." : "Create Template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {showEditTemplateModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2>Edit Template</h2>
            
            <div className="form-group">
              <label>Template name <span className="required">*</span></label>
              <input
                type="text"
                value={editTemplateForm.name}
                onChange={(e) => 
                  setEditTemplateForm({ ...editTemplateForm, name: e.target.value })
                }
                placeholder="Enter template name"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={editTemplateForm.description}
                onChange={(e) => 
                  setEditTemplateForm({ ...editTemplateForm, description: e.target.value })
                }
                placeholder="Enter template description"
                rows={3}
              />
            </div>

            {userRole === "ADMIN" && (
              <div className="tabs secondary">
                <ul className="d-flex">
                  <li>
                    <button
                      type="button"
                      onClick={() => setEditModalTab("Template")}
                      className={`button ${editModalTab === "Template" ? "active" : ""}`}
                    >
                      Template
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setEditModalTab("Instructions")}
                      className={`button ${editModalTab === "Instructions" ? "active" : ""}`}
                    >
                      Instructions
                    </button>
                  </li>
                </ul>
              </div>
            )}

            {editModalTab === "Template" && (
              <div className="form-group">
                <label>Template <span className="required">*</span></label>
                <ReactQuill
                  theme="snow"
                  value={formatTextForDisplay(editTemplateForm.template)}
                  onChange={(value) => 
                    setEditTemplateForm({ 
                      ...editTemplateForm, 
                      template: formatTextForEditor(value) 
                    })
                  }
                  modules={modules}
                  className="template-editor"
                />
              </div>
            )}

            {editModalTab === "Instructions" && userRole === "ADMIN" && (
              <div className="form-group">
                <label>Instructions <span className="required">*</span></label>
                <ReactQuill
                  theme="snow"
                  value={formatTextForDisplay(editTemplateForm.instructions)}
                  onChange={(value) => 
                    setEditTemplateForm({ 
                      ...editTemplateForm, 
                      instructions: formatTextForEditor(value) 
                    })
                  }
                  modules={modules}
                  className="template-editor"
                />
              </div>
            )}

            <div className="modal-footer">
              <button
                className="button secondary"
                onClick={() => {
                  setShowEditTemplateModal(false);
                  setSelectedTemplate(null);
                }}
              >
                Cancel
              </button>
              <button
                className="button save-button"
                onClick={handleUpdateTemplate}
                disabled={
                  !editTemplateForm.name || 
                  !editTemplateForm.template || 
                  !editTemplateForm.instructions ||
                  isLoading
                }
              >
                {isLoading ? "Updating..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Campaign Template Modal - Updated with new property names */}
      {showEditCampaignModal && selectedCampaignTemplate && (
        <div className="modal-backdrop">
          <div className="modal-content modal-large">
            <h2>Edit Campaign Template</h2>
            
            <div className="form-group">
              <label>Template Name <span className="required">*</span></label>
              <input
                type="text"
                value={editCampaignForm.templateName}
                onChange={(e) => 
                  setEditCampaignForm({ ...editCampaignForm, templateName: e.target.value })
                }
                placeholder="Enter template name"
              />
            </div>

            <div className="form-group">
              <label>Model</label>
              <select
                value={editCampaignForm.selectedModel}
                onChange={(e) => 
                  setEditCampaignForm({ ...editCampaignForm, selectedModel: e.target.value })
                }
                className="form-select"
              >
                <option value="gpt-4.1">GPT-4.1</option>
                <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
                <option value="gpt-5">GPT-5</option>
                <option value="gpt-5-mini">GPT-5 Mini</option>
                <option value="gpt-5-nano">GPT-5 Nano</option>
              </select>
            </div>

            <div className="form-group">
              <label>AI Instructions</label>
              <textarea
                value={editCampaignForm.aiInstructions}
                onChange={(e) => 
                  setEditCampaignForm({ ...editCampaignForm, aiInstructions: e.target.value })
                }
                placeholder="Enter AI instructions"
                rows={5}
              />
            </div>

            <div className="form-group">
              <label>Placeholder List Info</label>
              <textarea
                value={editCampaignForm.placeholderListInfo}
                onChange={(e) => 
                  setEditCampaignForm({ ...editCampaignForm, placeholderListInfo: e.target.value })
                }
                placeholder="Enter placeholder list info"
                rows={5}
              />
            </div>

            <div className="form-group">
              <label>Master Blueprint (Unpopulated)</label>
              <textarea
                value={editCampaignForm.masterBlueprintUnpopulated}
                onChange={(e) => 
                  setEditCampaignForm({ ...editCampaignForm, masterBlueprintUnpopulated: e.target.value })
                }
                placeholder="Enter master blueprint"
                rows={5}
              />
            </div>

            <div className="modal-footer">
              <button
                className="button secondary"
                onClick={() => {
                  setShowEditCampaignModal(false);
                  setSelectedCampaignTemplate(null);
                }}
              >
                Cancel
              </button>
              <button
                className="button save-button"
                onClick={handleUpdateCampaignTemplate}
                disabled={!editCampaignForm.templateName || isLoading}
              >
                {isLoading ? "Updating..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Template Modal */}
      {showViewModal && selectedTemplate && (
        <div className="modal-backdrop">
          <div className="modal-content modal-large">
            <h2>View Template: {selectedTemplate.name}</h2>
            
            {userRole === "ADMIN" && (
              <div className="tabs secondary">
                <ul className="d-flex">
                  <li>
                    <button
                      type="button"
                      onClick={() => setViewModalTab("Template")}
                      className={`button ${viewModalTab === "Template" ? "active" : ""}`}
                    >
                      Template
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setViewModalTab("Instructions")}
                      className={`button ${viewModalTab === "Instructions" ? "active" : ""}`}
                    >
                      Instructions
                    </button>
                  </li>
                </ul>
              </div>
            )}

            {viewModalTab === "Template" && (
              <div className="form-group">
                <label>Template</label>
                <div 
                  className="template-preview"
                  dangerouslySetInnerHTML={{ 
                    __html: formatTextForDisplay(selectedTemplate.template || "No template content") 
                  }}
                />
              </div>
            )}

            {viewModalTab === "Instructions" && userRole === "ADMIN" && (
              <div className="form-group">
                <label>Instructions</label>
                <div 
                  className="template-preview"
                  dangerouslySetInnerHTML={{ 
                    __html: formatTextForDisplay(selectedTemplate.text || "No instructions") 
                  }}
                />
              </div>
            )}

            <div className="modal-footer">
              <button
                className="button secondary"
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedTemplate(null);
                }}
              >
                Close
              </button>
              {userRole === "ADMIN" && !isDemoAccount && (
                <button
                  className="button save-button"
                  onClick={() => {
                    setEditTemplateForm({
                      name: selectedTemplate.name,
                      description: selectedTemplate.description || "",
                      template: selectedTemplate.template || "",
                      instructions: selectedTemplate.text || "",
                    });
                    setShowViewModal(false);
                    setShowEditTemplateModal(true);
                    setEditModalTab("Template");
                  }}
                >
                  Edit Template
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced View Campaign Template Modal - Updated with new property names */}
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
                      // Update the placeholder values
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
                {userRole === "ADMIN" && !isDemoAccount ? (
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
                )}
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
              {userRole === "ADMIN" && !isDemoAccount && (
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
            {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (selectedTemplate || selectedCampaignTemplate) && (
        <div className="modal-backdrop">
          <div className="modal-content modal-small">
            <h3>Delete Template</h3>
            <p>
              Are you sure you want to delete{" "}
              <strong>
                {selectedTemplate ? selectedTemplate.name : selectedCampaignTemplate?.templateName}
              </strong>?
            </p>
            
            <div className="modal-footer">
              <button
                className="button secondary"
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setSelectedTemplate(null);
                  setSelectedCampaignTemplate(null);
                }}
              >
                Cancel
              </button>
              <button
                className="button danger"
                onClick={selectedTemplate ? handleDeleteTemplate : handleDeleteCampaignTemplate}
                disabled={isLoading}
              >
                {isLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Builder Modal */}
      {showCampaignBuilder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999999,
          background: 'white'
        }}>
          <EmailCampaignBuilder 
            selectedClient={selectedClient}
          />
          <button
            onClick={() => {
              setShowCampaignBuilder(false);
              // Refresh campaign templates when closing
              fetchCampaignTemplates();
            }}
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              zIndex: 1000000,
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default Template;