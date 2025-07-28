import React, { useState, useEffect } from "react";
import API_BASE_URL from "../../config";
import { useSelector } from "react-redux";
import { RootState } from "../../Redux/store";

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
    description: "",
  });
  const userId = useSelector((state: RootState) => state.auth.userId);

  const effectiveUserId = selectedClient !== "" ? selectedClient : userId;

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

  const handleCampaignSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const campaignId = e.target.value;
    if (!campaignId) {
      setSelectedCampaign(null);
      setCampaignForm({
        campaignName: "",
        promptId: "",
        zohoViewId: "",
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
        zohoViewId: campaign.zohoViewId,
        description: campaign.description || "",
      });

      const prompt = promptList.find((p) => p.id === campaign.promptId);
      setSelectedPrompt(prompt || null);
    }
  };

  const handleCampaignFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setCampaignForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const createCampaign = async () => {
    if (
      !campaignForm.campaignName ||
      !campaignForm.promptId ||
      !campaignForm.zohoViewId ||
      !effectiveUserId
    ) {
      alert("Please fill all fields for the campaign");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/campaigns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignName: campaignForm.campaignName,
          promptId: parseInt(campaignForm.promptId),
          zohoViewId: campaignForm.zohoViewId, // This might need to be updated based on your backend expectations
          clientId: parseInt(effectiveUserId),
          description: campaignForm.description,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create campaign");
      }

      alert("Campaign created successfully");

      setCampaignForm({
        campaignName: "",
        promptId: "",
        zohoViewId: "",
        description: "",
      });

      await fetchCampaigns();
    } catch (error) {
      console.error("Error creating campaign:", error);
      alert("Failed to create campaign");
    } finally {
      setIsLoading(false);
    }
  };

  const updateCampaign = async () => {
    if (
      !selectedCampaign ||
      !campaignForm.campaignName ||
      !campaignForm.promptId ||
      !campaignForm.zohoViewId
    ) {
      alert("Please select a campaign and fill all fields");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/updatecampaign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedCampaign.id,
          campaignName: campaignForm.campaignName,
          promptId: parseInt(campaignForm.promptId),
          zohoViewId: campaignForm.zohoViewId,
          description: campaignForm.description,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update campaign");
      }

      alert("Campaign updated successfully");
      await fetchCampaigns();
    } catch (error) {
      console.error("Error updating campaign:", error);
      alert("Failed to update campaign");
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
  useEffect(() => {
    if (effectiveUserId) {
      // fetchZohoClient(); // Commenting out if not needed anymore
      fetchDataFiles(); // Fetch data files instead
      fetchPromptsList();
      fetchCampaigns();
    }
  }, [effectiveUserId]);

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
              <div className="grid grid-cols-4 gap-4">
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
                    <label>Select Template</label>
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
                    {!isLoading &&
                      promptList.length === 0 &&
                      selectedClient && (
                        <div className="text-muted mt-1 error-text">
                          No templates found for this client
                        </div>
                      )}
                  </div>
                </div>

                <div className="col-12-768">
                  <div className="form-group">
                    <label>Select data file</label>
                    <select
                      name="zohoViewId"
                      value={campaignForm.zohoViewId}
                      onChange={handleCampaignFormChange}
                      className="form-control"
                    >
                      <option value="">Select a data file</option>
                      {zohoClient.map((client) => (
                        <option key={client.id} value={client.zohoviewId}>
                          {client.zohoviewName}
                        </option>
                      ))}
                    </select>
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
                          <span className="ml-5">Create campaign</span>
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
            <div className="max-width-40-pcnt">
              <div className="row mt-3 no-margin">
                <div className="col-12">
                  <div className="sub-title">Manage campaign</div>
                </div>
              </div>
              <div className="flex">
                <div className="flex-1 mr-4">
                  <div className="form-group">
                    <label>Select campaign to manage</label>
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
                    {!isLoading &&
                      campaigns.length === 0 &&
                      selectedClient && (
                        <div className="text-muted mt-1 error-text">
                          No campaigns found for this client
                        </div>
                      )}
                  </div>
                </div>

                <div className="">
                  <div className="form-group d-flex justify-end-991 mt-[28px] mt-0-991">
                    <button
                      className="secondary h-[40px] full-width button d-flex justify-center align-center mr-4 button-full-640"
                      onClick={updateCampaign}
                      disabled={isLoading || !selectedCampaign}
                    >
                      {isLoading ? (
                        <span>Updating...</span>
                      ) : (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18px"
                            height="18px"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M12 3.99997H6C4.89543 3.99997 4 4.8954 4 5.99997V18C4 19.1045 4.89543 20 6 20H18C19.1046 20 20 19.1045 20 18V12M18.4142 8.41417L19.5 7.32842C20.281 6.54737 20.281 5.28104 19.5 4.5C18.7189 3.71895 17.4526 3.71895 16.6715 4.50001L15.5858 5.58575M18.4142 8.41417L12.3779 14.4505C12.0987 14.7297 11.7431 14.9201 11.356 14.9975L8.41422 15.5858L9.00257 12.6441C9.08001 12.2569 9.27032 11.9013 9.54951 11.6221L15.5858 5.58575M18.4142 8.41417L15.5858 5.58575"
                              stroke="#ffffff"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            ></path>
                          </svg>
                          <span className="ml-5">Update</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="">
                  <div className="form-group d-flex justify-end-991 mt-[28px] mt-0-991">
                    <button
                      className="delete-button   h-[40px] full-width button d-flex justify-center align-center button-full-640"
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
                            <path d="M 21 2 C 19.354545 2 18 3.3545455 18 5 L 18 7 L 8 7 A 1.0001 1.0001 0 1 0 8 9 L 9 9 L 9 45 C 9 46.654 10.346 48 12 48 L 38 48 C 39.654 48 41 46.654 41 45 L 41 9 L 42 9 A 1.0001 1.0001 0 1 0 42 7 L 32 7 L 32 5 C 32 3.3545455 30.645455 2 29 2 L 21 2 z M 21 4 L 29 4 C 29.554545 4 30 4.4454545 30 5 L 30 7 L 20 7 L 20 5 C 20 4.4454545 20.445455 4 21 4 z M 19 14 C 19.552 14 20 14.448 20 15 L 20 40 C 20 40.553 19.552 41 19 41 C 18.448 41 18 40.553 18 40 L 18 15 C 18 14.448 18.448 14 19 14 z M 25 14 C 25.552 14 26 14.448 26 15 L 26 40 C 26 40.553 25.552 41 25 41 C 24.448 41 24 40.553 24 40 L 24 15 C 24 14.448 24.448 14 25 14 z M 31 14 C 31.553 14 32 14.448 32 15 L 32 40 C 32 40.553 31.553 41 31 41 C 30.447 41 30 40.553 30 40 L 30 15 C 30 14.448 30.447 14 31 14 z"></path>
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
                <label>Select Template</label>
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
                <label>Select Data File</label>
                <select
                  name="zohoViewId"
                  value={campaignForm.zohoViewId}
                  onChange={handleCampaignFormChange}
                  className="form-control"
                >
                  <option value="">Select a data file</option>
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
                <label>Select Campaign to Manage</label>
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
