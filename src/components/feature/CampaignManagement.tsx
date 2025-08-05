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

  const { refreshTrigger, saveFormState, getFormState } = useAppData(); // Add this line


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
      console.log("No client selected, skipping fetch");
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

    await fetchCampaigns();
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
    await fetchCampaigns();
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
        segmentId: "", // Add this
        description: "",
      });

      await fetchCampaigns();
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

  return (
    <div className="campaign-management-container">
      <h2 className="page-title">Campaign Management</h2>

      <div className="login-box gap-down d-flex">
        <div className="input-section edit-section">
          {/* Campaign Configuration Section */}
          {/* <div className="row">
            <div className="col col-12">
              <h3 className="left mt-0 text-[20px] font-[600]">Campaign Configuration</h3>
            </div>
          </div> */}
          {/*  New Campain design */}
          <div className="row gap-2 no-margin">
            <div className="col-12">
              <div className="row no-margin">
                <div className="col-12">
                  <div className="sub-title">Add campaign</div>
                </div>
              </div>
              {/* Update the grid structure */}
<div className="grid grid-cols-5 gap-4"> {/* Changed from 4 to 5 columns */}
  <div className="col-12-768">
    <div className="form-group">
      <label>Campaign name</label>
      <input
        type="text"
        name="campaignName"
        value={campaignForm.campaignName}
        onChange={handleCampaignFormChange}
        placeholder="Enter campaign name"
      />
    </div>
  </div>

  <div className="col-12-768">
    <div className="form-group">
      <label> Template</label>
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
      {!isLoading && promptList.length === 0 && selectedClient && (
        <div className="text-muted mt-1 error-text">
          No templates found for this client
        </div>
      )}
    </div>
  </div>

  {/* Data File Dropdown */}
  <div className="col-12-768">
    <div className="form-group">
      <label> List</label>
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
      {!isLoading && dataFiles.length === 0 && selectedClient && (
        <div className="text-muted mt-1 error-text">
          No data files found
        </div>
      )}
    </div>
  </div>

  {/* Segment Dropdown */}
  <div className="col-12-768">
    <div className="form-group">
      <label> Segment</label>
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
      {!isLoading && segments.length === 0 && selectedClient && (
        <div className="text-muted mt-1 error-text">
          No segments found
        </div>
      )}
    </div>
  </div>

  <div className="col-12-640">
    <div className="form-group d-flex justify-end-991 mt-[28px] mt-0-991">
      <button
        className="save-button full-width button small d-flex justify-center align-center mr-2 button-full-640"
        onClick={createCampaign}
        disabled={
          isLoading ||
          !campaignForm.campaignName ||
          !campaignForm.promptId ||
          (!campaignForm.zohoViewId && !campaignForm.segmentId)
        }
      >
        {isLoading ? (
          <span>Creating Campaign...</span>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="#FFFFFF"
              viewBox="0 0 30 30"
              width="22px"
              height="22px"
            >
              <path d="M15,3C8.373,3,3,8.373,3,15c0,6.627,5.373,12,12,12s12-5.373,12-12C27,8.373,21.627,3,15,3z M21,16h-5v5 c0,0.553-0.448,1-1,1s-1-0.447-1-1v-5H9c-0.552,0-1-0.447-1-1s0.448-1,1-1h5V9c0-0.553,0.448-1,1-1s1,0.447,1,1v5h5 c0.552,0,1,0.447,1,1S21.552,16,21,16z" />
            </svg>
            <span className="ml-5">Create Campaign</span>
          </>
        )}
      </button>
    </div>
  </div>
</div>
            </div>
            
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-12-768">
              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={campaignForm.description || ""}
                  onChange={handleCampaignFormChange}
                  placeholder="Enter campaign description"
                  rows={3}
                ></textarea>
              </div>
            </div>
            
          </div>
          <div className="row flex-wrap-768">
            <div className="col col-3 col-12-768">
              <div className="form-group">
                <label>Campaign Name</label>
                <input
                  type="text"
                  name="campaignName"
                  value={campaignForm.campaignName}
                  onChange={handleCampaignFormChange}
                  placeholder="Enter campaign name"
                />
              </div>
            </div>

            <div className="col col-3 col-12-768">
              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={campaignForm.description || ""}
                  onChange={handleCampaignFormChange}
                  placeholder="Enter campaign description"
                  rows={3}
                ></textarea>
              </div>
            </div>

            <div className="col col-3 col-12-768">
              <div className="form-group">
                <label> Template</label>
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
                {!isLoading && promptList.length === 0 && effectiveUserId && (
                  <div className="text-muted mt-1">
                    No templates found for this client
                  </div>
                )}
              </div>
            </div>

            <div className="col col-3 col-12-768">
              <div className="form-group">
                <label>List</label>
                <select
                  name="zohoViewId"
                  value={campaignForm.zohoViewId}
                  onChange={handleCampaignFormChange}
                  className="form-control"
                >
                  <option value="">List</option>
                  {dataFiles.map((file) => (
                    <option key={file.id} value={file.id.toString()}>
                      {file.name}
                    </option>
                  ))}
                </select>
                {!isLoading && dataFiles.length === 0 && effectiveUserId && (
                  <div className="text-muted mt-1">
                    No data files found for this client
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="row mt-3 flex-wrap-640">
            <div className="col col-3 col-12-640">
              <div className="form-group">
                <label>Campaign to Manage</label>
                <select
                  value={selectedCampaign?.id || ""}
                  onChange={handleCampaignSelect}
                  className="form-control"
                >
                  <option value="">Select a campaign</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.campaignName}
                    </option>
                  ))}
                </select>
                {!isLoading && campaigns.length === 0 && effectiveUserId && (
                  <div className="text-muted mt-1">
                    No campaigns found for this client
                  </div>
                )}
              </div>
            </div>

            <div className="col col-3 col-12-640">
              <div className="form-group d-flex justify-end-991 mt-24 mt-0-991">
                <button
                  className="save-button button small d-flex justify-center align-center mr-2 button-full-640"
                  onClick={createCampaign}
                  disabled={
                    isLoading ||
                    !campaignForm.campaignName ||
                    !campaignForm.promptId ||
                    !campaignForm.zohoViewId
                  }
                >
                  {isLoading ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="#FFFFFF"
                        viewBox="0 0 30 30"
                        width="22px"
                        height="22px"
                      >
                        <path d="M15,3C8.373,3,3,8.373,3,15c0,6.627,5.373,12,12,12s12-5.373,12-12C27,8.373,21.627,3,15,3z M21,16h-5v5 c0,0.553-0.448,1-1,1s-1-0.447-1-1v-5H9c-0.552,0-1-0.447-1-1s0.448-1,1-1h5V9c0-0.553,0.448-1,1-1s1,0.447,1,1v5h5 c0.552,0,1,0.447,1,1S21.552,16,21,16z" />
                      </svg>
                      <span className="ml-5">Create</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="col col-3 col-12-640">
              <div className="form-group d-flex justify-end-991 mt-24 mt-0-991">
                <button
                  className="secondary button d-flex justify-center align-center mr-2 button-full-640"
                  onClick={updateCampaign}
                  disabled={isLoading || !selectedCampaign}
                >
                  {isLoading ? (
                    <span>Updating...</span>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="#FFFFFF"
                        viewBox="0 0 24 24"
                        width="18px"
                        height="18px"
                      >
                        <path d="M21.7 13.35l-1 1-2.05-2.05 1-1c.21-.21.54-.21.75 0l1.3 1.3c.2.21.2.54 0 .75zM19.7 14.35l-2.05-2.05-7.15 7.15v2.05h2.05l7.15-7.15zM12 2c-5.51 0-10 4.49-10 10s4.49 10 10 10 10-4.49 10-10-4.49-10-10-10zM2 12C2 6.49 6.49 2 12 2c5.51 0 10 4.49 10 10 0 5.51-4.49 10-10 10-5.51 0-10-4.49-10-10z" />
                      </svg>
                      <span className="ml-5">Update</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="col col-3 col-12-640">
              <div className="form-group d-flex justify-end-991 mt-24 mt-0-991">
                <button
                  className="delete-button button d-flex justify-center align-center button-full-640"
                  onClick={deleteCampaign}
                  disabled={isLoading || !selectedCampaign}
                >
                  {isLoading ? (
                    <span>Deleting...</span>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="#FFFFFF"
                        viewBox="0 0 50 50"
                        width="18px"
                        height="18px"
                      >
                        <path d="M 21 2 C 19.354545 2 18 3.3545455 18 5 L 18 7 L 8 7 A 1.0001 1.0001 0 1 0 8 9 L 9 9 L 9 45 C 9 46.654 10.346 48 12 48 L 38 48 C 39.654 48 41 46.654 41 45 L 41 9 L 42 9 A 1.0001 1.0001 0 1 0 42 7 L 32 7 L 32 5 C 32 3.3545455 30.645455 2 29 2 L 21 2 z" />
                      </svg>
                      <span className="ml-5">Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignManagement;
