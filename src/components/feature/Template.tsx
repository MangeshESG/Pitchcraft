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
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Prompt | null>(null);
  const [templateActionsAnchor, setTemplateActionsAnchor] = useState<string | null>(null);
  
  // Modal states
  const [showAddTemplateModal, setShowAddTemplateModal] = useState(false);
  const [showEditTemplateModal, setShowEditTemplateModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  
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

  // Fetch templates
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

  // Delete template
// In Template.tsx, update the handleDeleteTemplate function:

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
      
      // Check if it's a foreign key constraint error
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

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      template.name.toLowerCase().includes(searchLower) ||
      template.id.toString().includes(searchLower) ||
      (template.description || "").toLowerCase().includes(searchLower)
    );
  });

  // Effects
  useEffect(() => {
    if (effectiveUserId) {
      fetchTemplates();
    }
  }, [effectiveUserId, fetchTemplates]);

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
            <span className="text-[20px] mr-1">+</span> Create a template
            </button>
        </div>

        {/* Templates Table */}
        <table className="contacts-table">
          <thead>
            <tr>
              <th>Templates</th>
              <th>ID</th>
              <th>Folder</th>
              <th>Creation date</th>
              <th>Description</th>
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
            ) : filteredTemplates.length === 0 ? (
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
                          template.id.toString() === templateActionsAnchor
                            ? null
                            : template.id.toString()
                        )
                      }
                    >
                      ⋮
                    </button>
                    
                    {templateActionsAnchor === template.id.toString() && (
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && selectedTemplate && (
        <div className="modal-backdrop">
          <div className="modal-content modal-small">
            <h3>Delete Template</h3>
            <p>Are you sure you want to delete <strong>{selectedTemplate.name}</strong>?</p>
            
            <div className="modal-footer">
              <button
                className="button secondary"
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setSelectedTemplate(null);
                }}
              >
                Cancel
              </button>
              <button
                className="button danger"
                onClick={handleDeleteTemplate}
                disabled={isLoading}
              >
                {isLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

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
      onClick={() => setShowCampaignBuilder(false)}
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