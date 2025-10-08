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
  // States - Remove regular template related states
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
  
  // Updated editCampaignForm with new property names
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

  // Update template

  // Updated handleUpdateCampaignTemplate with new property names
 const handleUpdateCampaignTemplate = async () => {
  if (!selectedCampaignTemplate || !editCampaignForm.templateName) {
    appModal.showError("Please fill all required fields");
    return;
  }

  setIsLoading(true);
  try {
    // Changed from PUT to POST
    const response = await fetch(`${API_BASE_URL}/api/CampaignPrompt/template/update`, {
      method: "POST", // Changed from PUT
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

  // Delete template


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

  // Effects
  useEffect(() => {
    if (effectiveUserId) {
      fetchCampaignTemplates();
    }
  }, [effectiveUserId, fetchCampaignTemplates]);

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
      method: "POST", // Changed from PUT to POST
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
            onClick={() => setShowCampaignBuilder(true)}
            disabled={userRole !== "ADMIN"}
          >
            <span className="text-[20px] mr-1">+</span> Create campaign template
          </button>
        </div>

        {/* Campaign Templates Table */}
        <table className="contacts-table">
          <thead>
            <tr>
              <th>Templates</th>
              <th>ID</th>
              <th>Model</th>
              <th>Creation date</th>
              <th>Has Conversation</th>
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
            ) : filteredCampaignTemplates.length === 0 ? (
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
            )}
          </tbody>
        </table>
      </div>


        
     



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