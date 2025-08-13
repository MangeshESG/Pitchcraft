import React, { useState, useEffect } from "react";
import API_BASE_URL from "../../config";
import { useSelector } from "react-redux";
import { RootState } from "../../Redux/store";
import { useAppData } from "../../contexts/AppDataContext";


interface CampaignManagementProps {
  selectedClient: string;
  userRole?: string;
}

interface ZohoClient {
  id: string;
  zohoviewId: string;
  zohoviewName: string;
  TotalContact?: string;
}

interface Segment {
  id: number;
  name: string;
  description: string;
  dataFileId: number;
  clientId: number;
  createdAt: string;
  updatedAt: string | null;
}


interface Prompt {
  id: number;
  name: string;
  text: string;
  userId?: number;
  createdAt?: string;
  template?: string;
}

interface Campaign {
  id: number;
  campaignName: string;
  promptId: number;
  zohoViewId: string;
  clientId: number;
  description?: string;
}

// Add new interface for DataFile
interface DataFile {
  id: number;
  client_id: number;
  name: string;
  data_file_name: string;
  description: string;
  created_at: string;
  contacts: any[];
}
const menuBtnStyle = {
  display: "block",
  width: "100%",
  padding: "8px 18px",
  textAlign: "left" as const,
  background: "none",
  border: "none",
  color: "#222",
  fontSize: "15px",
  cursor: "pointer",
};

const CampaignManagement: React.FC<CampaignManagementProps> = ({
  selectedClient,
  userRole,
}) => {
  // State for Zoho Views (keeping for backward compatibility if needed)
  const [zohoClient, setZohoClient] = useState<ZohoClient[]>([]);
  const [zohoViewForm, setZohoViewForm] = useState({
    zohoviewId: "",
    zohoviewName: "",
    TotalContact: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  // State for Data Files
  const [dataFiles, setDataFiles] = useState<DataFile[]>([]);

    // Add new state for table UI
  const [campaignSearch, setCampaignSearch] = useState("");
  const [campaignActionsAnchor, setCampaignActionsAnchor] = useState<string | null>(null);
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);


  // State for Campaigns
  const [promptList, setPromptList] = useState<Prompt[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null
  );
  const [campaignForm, setCampaignForm] = useState({
    campaignName: "",
    promptId: "",
    zohoViewId: "", // Keeping the same field name for backward compatibility
    segmentId: "", // For segment selection
    description: "",
  });
  const userId = useSelector((state: RootState) => state.auth.userId);

  const effectiveUserId = selectedClient !== "" ? selectedClient : userId;
  const [segments, setSegments] = useState<Segment[]>([]);

const { refreshTrigger, saveFormState, getFormState, triggerRefresh } = useAppData(); // ADD triggerRefresh here


  // Fetch Data Files by Client ID
  const fetchDataFiles = async () => {
    if (!effectiveUserId) {
      console.log("No client selected, skipping data files fetch");
      return;
    }

    setIsLoading(true);
    try {
      const url = `${API_BASE_URL}/api/crm/datafile-byclientid?clientId=${effectiveUserId}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: DataFile[] = await response.json();
      setDataFiles(data);
    } catch (error) {
      console.error("Error fetching data files:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Zoho Client data (keeping for backward compatibility)
  const fetchZohoClient = async () => {
    if (!effectiveUserId) {
      return;
    }

    setIsLoading(true);
    try {
      const url = `${API_BASE_URL}/api/auth/zohoclientid/${effectiveUserId}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: ZohoClient[] = await response.json();
      setZohoClient(data);
    } catch (error) {
      console.error("Error fetching zoho client id:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Prompts
  const fetchPromptsList = async () => {
    if (!effectiveUserId) {
      console.log("No client selected, skipping fetch");
      return;
    }

    setIsLoading(true);
    try {
      const url = `${API_BASE_URL}/api/auth/getprompts/${effectiveUserId}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: Prompt[] = await response.json();
      setPromptList(data);
    } catch (error) {
      console.error("Error fetching prompts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Campaigns
  const fetchCampaigns = async () => {
    if (!effectiveUserId) {
      console.log("No client selected, skipping campaign fetch");
      return;
    }

    setIsLoading(true);
    try {
      const url = `${API_BASE_URL}/api/auth/campaigns/client/${effectiveUserId}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: Campaign[] = await response.json();
      setCampaigns(data);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Campaign handlers
  const handlePromptSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const promptId = e.target.value;
    if (!promptId) {
      setSelectedPrompt(null);
      return;
    }

    const prompt = promptList.find((p) => p.id.toString() === promptId);
    setSelectedPrompt(prompt || null);

    setCampaignForm((prev) => ({
      ...prev,
      promptId,
    }));
  };

// Update handleCampaignSelect to handle both zohoViewId and segmentId
const handleCampaignSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
  const campaignId = e.target.value;
  if (!campaignId) {
    setSelectedCampaign(null);
    setCampaignForm({
      campaignName: "",
      promptId: "",
      zohoViewId: "",
      segmentId: "", // Add this
      description: "",
    });
    return;
  }

  const campaign = campaigns.find((c) => c.id.toString() === campaignId);
  if (campaign) {
    setSelectedCampaign(campaign);

    setCampaignForm({
      campaignName: campaign.campaignName,
      promptId: campaign.promptId.toString(),
      zohoViewId: (campaign as any).zohoViewId || "", // Handle both old and new campaigns
      segmentId: (campaign as any).segmentId?.toString() || "", // Add this
      description: campaign.description || "",
    });

    const prompt = promptList.find((p) => p.id === campaign.promptId);
    setSelectedPrompt(prompt || null);
  }
};

   const handleCampaignFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const newForm = { ...campaignForm, [name]: value };
    setCampaignForm(newForm);
    saveFormState('campaign-form', newForm); // Add this line
  };


    useEffect(() => {
    if (effectiveUserId && refreshTrigger > 0) {
      fetchDataFiles();
      fetchSegments();
    }
  }, [refreshTrigger, effectiveUserId]);

  useEffect(() => {
    const savedForm = getFormState('campaign-form');
    if (Object.keys(savedForm).length > 0) {
      setCampaignForm(savedForm);
    }
  }, []); // Add this useEffect

  
const createCampaign = async () => {
  // Check that either zohoViewId OR segmentId is provided (not both, not neither)
  const hasDataFile = !!campaignForm.zohoViewId;
  const hasSegment = !!campaignForm.segmentId;
  
  if (!campaignForm.campaignName || !campaignForm.promptId || !effectiveUserId) {
    alert("Please fill all required fields for the campaign");
    return;
  }

  if ((!hasDataFile && !hasSegment) || (hasDataFile && hasSegment)) {
    alert("Please select either a data file OR a segment (not both)");
    return;
  }

  setIsLoading(true);
  try {
    const requestBody: any = {
      campaignName: campaignForm.campaignName,
      promptId: parseInt(campaignForm.promptId),
      clientId: parseInt(effectiveUserId),
      description: campaignForm.description,
    };

    // Add either zohoViewId or segmentId
    if (hasDataFile) {
      requestBody.zohoViewId = campaignForm.zohoViewId;
    } else {
      requestBody.segmentId = parseInt(campaignForm.segmentId);
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/campaigns`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to create campaign");
    }

    alert("Campaign created successfully");

    setCampaignForm({
      campaignName: "",
      promptId: "",
      zohoViewId: "",
      segmentId: "",
      description: "",
    });
    setShowCreateCampaignModal(false);

    await fetchCampaigns();
    
    
    triggerRefresh();
        
  } catch (error) {
    console.error("Error creating campaign:", error);
    alert(`Failed to create campaign: ${error}`);
  } finally {
    setIsLoading(false);
  }
};


const updateCampaign = async () => {
  const hasDataFile = !!campaignForm.zohoViewId;
  const hasSegment = !!campaignForm.segmentId;
  
  if (!selectedCampaign || !campaignForm.campaignName || !campaignForm.promptId) {
    alert("Please select a campaign and fill all required fields");
    return;
  }

  if ((!hasDataFile && !hasSegment) || (hasDataFile && hasSegment)) {
    alert("Please select either a data file OR a segment (not both)");
    return;
  }

  setIsLoading(true);
  try {
    const requestBody: any = {
      id: selectedCampaign.id,
      campaignName: campaignForm.campaignName,
      promptId: parseInt(campaignForm.promptId),
      description: campaignForm.description,
    };

    // Add either zohoViewId or segmentId
    if (hasDataFile) {
      requestBody.zohoViewId = campaignForm.zohoViewId;
      requestBody.segmentId = null;
    } else {
      requestBody.segmentId = parseInt(campaignForm.segmentId);
      requestBody.zohoViewId = null;
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/updatecampaign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update campaign");
    }

    alert("Campaign updated successfully");

    setShowCreateCampaignModal(false);

    await fetchCampaigns();
    
    
    triggerRefresh();
        
  } catch (error) {
    console.error("Error updating campaign:", error);
    alert(`Failed to update campaign: ${error}`);
  } finally {
    setIsLoading(false);
  }
};


  const deleteCampaign = async () => {
  if (!selectedCampaign) {
    alert("Please select a campaign to delete");
    return;
  }

  if (!window.confirm("Are you sure you want to delete this campaign?")) {
    return;
  }

  setIsLoading(true);
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/auth/deletecampaign/${selectedCampaign.id}`,
      {
        method: "POST",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to delete campaign");
    }

    alert("Campaign deleted successfully");

    setSelectedCampaign(null);
    setCampaignForm({
      campaignName: "",
      promptId: "",
      zohoViewId: "",
      segmentId: "",
      description: "",
    });

    await fetchCampaigns();
    
    await fetchCampaigns();
    
    triggerRefresh();
  } catch (error) {
    console.error("Error deleting campaign:", error);
    alert("Failed to delete campaign");
  } finally {
    setIsLoading(false);
  }
};

  // Load data when client changes
// Update your useEffect
useEffect(() => {
  if (effectiveUserId) {
    fetchDataFiles();
    fetchSegments(); // Add this line
    fetchPromptsList();
    fetchCampaigns();
  }
}, [effectiveUserId]);


  // Add this function with your other fetch functions
const fetchSegments = async () => {
  if (!effectiveUserId) {
    console.log("No client selected, skipping segments fetch");
    return;
  }

  setIsLoading(true);
  try {
    const url = `${API_BASE_URL}/api/Crm/get-segments-by-client?clientId=${effectiveUserId}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: Segment[] = await response.json();
    setSegments(data);
  } catch (error) {
    console.error("Error fetching segments:", error);
  } finally {
    setIsLoading(false);
  }
};

// Add this function to handle data source selection
const handleDataSourceChange = (type: 'datafile' | 'segment', value: string) => {
  if (type === 'datafile') {
    setCampaignForm(prev => ({
      ...prev,
      zohoViewId: value,
      segmentId: "" // Clear segment when datafile is selected
    }));
  } else {
    setCampaignForm(prev => ({
      ...prev,
      segmentId: value,
      zohoViewId: "" // Clear datafile when segment is selected
    }));
  }
};

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.campaignName?.toLowerCase().includes(campaignSearch.toLowerCase()) ||
    campaign.description?.toLowerCase().includes(campaignSearch.toLowerCase())
  );

  // Add this useEffect after your other hooks
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    // Check if the click is outside the actions menu
    const target = event.target as HTMLElement;
    const isActionsButton = target.closest('.segment-actions-btn');
    const isActionsMenu = target.closest('.segment-actions-menu');
    
    if (!isActionsButton && !isActionsMenu) {
      setCampaignActionsAnchor(null);
    }
  };

  // Add event listener when menu is open
  if (campaignActionsAnchor) {
    document.addEventListener('click', handleClickOutside);
  }

  // Cleanup
  return () => {
    document.removeEventListener('click', handleClickOutside);
  };
}, [campaignActionsAnchor]);

  return (
    <div className="data-campaigns-container">
      <div className="section-wrapper">
        <h2 className="section-title">Campaigns</h2>
        <div style={{ marginBottom: 4, color: "#555" }}>
          Create and manage campaigns to generate personalized content for your contacts.
        </div>

        <div style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 16,
          gap: 16,
        }}>
          <input
            type="text"
            className="search-input"
            style={{ width: 340 }}
            placeholder="Search campaigns..."
            value={campaignSearch}
            onChange={(e) => setCampaignSearch(e.target.value)}
          />
          <button
            className="button primary"
            style={{ marginLeft: "auto" }}
            onClick={() => {
              setShowCreateCampaignModal(true);
              setSelectedCampaign(null);
              setCampaignForm({
                campaignName: "",
                promptId: "",
                zohoViewId: "",
                segmentId: "",
                description: "",
              });
              setSelectedPrompt(null);
            }}
          >
            + Create campaign
          </button>
        </div>

        <table className="contacts-table" style={{ background: "#fff" }}>
          <thead>
            <tr>
              <th>Campaign Name</th>
              <th>Template</th>
              <th>Data Source</th>
              <th>Description</th>
              <th>Created Date</th>
              <th style={{ minWidth: 48 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center" }}>
                  Loading campaigns...
                </td>
              </tr>
            ) : filteredCampaigns.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center" }}>
                  No campaigns found.
                </td>
              </tr>
            ) : (
                            filteredCampaigns.map((campaign) => {
                const prompt = promptList.find(p => p.id === campaign.promptId);
                const dataFile = dataFiles.find(df => df.id.toString() === (campaign as any).zohoViewId);
                const segment = segments.find(s => s.id === (campaign as any).segmentId);
                
                return (
                  <tr key={campaign.id}>
                    <td>{campaign.campaignName}</td>
                    <td>{prompt?.name || "-"}</td>
                    <td>
                      {dataFile ? (
                        <span>List: {dataFile.name}</span>
                      ) : segment ? (
                        <span>Segment: {segment.name}</span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{campaign.description || "-"}</td>
                    <td>{new Date().toLocaleDateString()}</td>
                    <td style={{ position: "relative" }}>
                      <button
                        className="segment-actions-btn"
                        style={{
                          border: "none",
                          background: "none",
                          fontSize: 24,
                          cursor: "pointer",
                          padding: "2px 10px",
                        }}
                        onClick={() =>
                          setCampaignActionsAnchor(
                            campaign.id.toString() === campaignActionsAnchor
                              ? null
                              : campaign.id.toString()
                          )
                        }
                      >
                        ⋮
                      </button>
                      {campaignActionsAnchor === campaign.id.toString() && (
                        <div
                          className="segment-actions-menu"
                          style={{
                            position: "absolute",
                            right: 0,
                            top: 32,
                            background: "#fff",
                            border: "1px solid #eee",
                            borderRadius: 6,
                            boxShadow: "0 2px 16px rgba(0,0,0,0.12)",
                            zIndex: 101,
                            minWidth: 160,
                          }}
                        >
                          <button
                            onClick={() => {
                              setSelectedCampaign(campaign);
                              setCampaignForm({
                                campaignName: campaign.campaignName,
                                promptId: campaign.promptId.toString(),
                                zohoViewId: (campaign as any).zohoViewId || "",
                                segmentId: (campaign as any).segmentId?.toString() || "",
                                description: campaign.description || "",
                              });
                              const prompt = promptList.find((p) => p.id === campaign.promptId);
                              setSelectedPrompt(prompt || null);
                              setShowCreateCampaignModal(true);
                              setCampaignActionsAnchor(null);
                            }}
                            style={menuBtnStyle}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete "${campaign.campaignName}"?`)) {
                                setSelectedCampaign(campaign);
                                deleteCampaign();
                              }
                              setCampaignActionsAnchor(null);
                            }}
                            style={{ ...menuBtnStyle, color: "#c00" }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Campaign Modal */}
{showCreateCampaignModal && (
    <div
    style={{
      position: "fixed",
      zIndex: 99999,
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
    onClick={() => {
      // Close modal when clicking on backdrop
      setShowCreateCampaignModal(false);
      setSelectedCampaign(null);
      setCampaignForm({
        campaignName: "",
        promptId: "",
        zohoViewId: "",
        segmentId: "",
        description: "",
      });
      setSelectedPrompt(null);
    }}
  >
    <div
      style={{
        background: "#fff",
        padding: 32,
        borderRadius: 8,
        width: "90%",
        maxWidth: 700,
        maxHeight: "90vh",
        overflow: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}
      onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal

    >
      <h2 style={{ marginTop: 0, marginBottom: 24 }}>
        {selectedCampaign ? "Edit Campaign" : "Create Campaign"}
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <div className="form-group">
            <label>
              Campaign Name <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="text"
              name="campaignName"
              value={campaignForm.campaignName}
              onChange={handleCampaignFormChange}
              placeholder="Enter campaign name"
            />
          </div>
        </div>

        <div>
          <div className="form-group">
            <label>
              Template <span style={{ color: "red" }}>*</span>
            </label>
            <select
              value={selectedPrompt?.id || ""}
              onChange={handlePromptSelect}
              className="form-control"
            >
              <option value="">Select a template</option>
              {promptList.map((prompt) => (
                <option key={prompt.id} value={prompt.id}>
                  {prompt.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* List Dropdown */}
        <div>
          <div className="form-group">
            <label>
              List
            </label>
            <select
              name="zohoViewId"
              value={campaignForm.zohoViewId}
              onChange={(e) => handleDataSourceChange('datafile', e.target.value)}
              className="form-control"
              disabled={!!campaignForm.segmentId}
            >
              <option value="">Select a list</option>
              {dataFiles.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Segment Dropdown */}
        <div style={{ gridColumn: "1 / -1" }}>
          <div className="form-group">
            <label>
              Segment
            </label>
            <select
              name="segmentId"
              value={campaignForm.segmentId}
              onChange={(e) => handleDataSourceChange('segment', e.target.value)}
              className="form-control"
              disabled={!!campaignForm.zohoViewId}
            >
              <option value="">Select a segment</option>
              {segments.map((segment) => (
                <option key={segment.id} value={segment.id}>
                  {segment.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={campaignForm.description || ""}
              onChange={handleCampaignFormChange}
              placeholder="Enter campaign description"
              rows={3}
              style={{ width: "100%" }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
        <button
          type="button"
          onClick={() => {
            setShowCreateCampaignModal(false);
            setSelectedCampaign(null);
            setCampaignForm({
              campaignName: "",
              promptId: "",
              zohoViewId: "",
              segmentId: "",
              description: "",
            });
            setSelectedPrompt(null);
          }}
          className="button secondary"
          style={{
            padding: "8px 16px",
            border: "1px solid #ddd",
            background: "#fff",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={selectedCampaign ? updateCampaign : createCampaign}
          className="button primary"
          disabled={
            isLoading ||
            !campaignForm.campaignName ||
            !campaignForm.promptId ||
            (!campaignForm.zohoViewId && !campaignForm.segmentId)
          }
          style={{
            padding: "8px 16px",
            background:
              !isLoading &&
              campaignForm.campaignName &&
              campaignForm.promptId &&
              (campaignForm.zohoViewId || campaignForm.segmentId)
                ? "#007bff"
                : "#ccc",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor:
              !isLoading &&
              campaignForm.campaignName &&
              campaignForm.promptId &&
              (campaignForm.zohoViewId || campaignForm.segmentId)
                ? "pointer"
                : "not-allowed",
          }}
        >
          {isLoading ? (
            selectedCampaign ? "Updating..." : "Creating..."
          ) : (
            selectedCampaign ? "Update Campaign" : "Create Campaign"
          )}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default CampaignManagement;