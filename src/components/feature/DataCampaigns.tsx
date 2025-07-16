import React, { useState, useEffect } from "react";
import DataFile from "./datafile";
import API_BASE_URL from "../../config";

interface DataCampaignsProps {
  // DataFile props
  selectedClient: string;
  onDataProcessed: (data: any) => void;
  isProcessing: boolean;

  // Additional props needed for Campaign Management
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

const DataCampaigns: React.FC<DataCampaignsProps> = ({
  selectedClient,
  onDataProcessed,
  isProcessing,
  userRole,
}) => {
  // State for Zoho Views
  const [zohoClient, setZohoClient] = useState<ZohoClient[]>([]);
  const [zohoViewForm, setZohoViewForm] = useState({
    zohoviewId: "",
    zohoviewName: "",
    TotalContact: "",
  });
  const [selectedZohoViewForDeletion, setSelectedZohoViewForDeletion] =
    useState("");
  const [isLoading, setIsLoading] = useState(false);

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
    zohoViewId: "",
    description: "",
  });

  // Fetch Zoho Client data
  const fetchZohoClient = async () => {
    if (!selectedClient) {
      console.log("No client selected, skipping fetch");
      return;
    }

    setIsLoading(true);
    try {
      const url = `${API_BASE_URL}/api/auth/zohoclientid/${selectedClient}`;
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
    if (!selectedClient) {
      console.log("No client selected, skipping fetch");
      return;
    }

    setIsLoading(true);
    try {
      const url = `${API_BASE_URL}/api/auth/getprompts/${selectedClient}`;
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
    if (!selectedClient) {
      console.log("No client selected, skipping campaign fetch");
      return;
    }

    setIsLoading(true);
    try {
      const url = `${API_BASE_URL}/api/auth/campaigns/client/${selectedClient}`;
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

  // Zoho View handlers
  const onZohoViewInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setZohoViewForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const addZohoView = async (
    zohoviewId: string,
    zohoviewName: string,
    clientId: string
  ) => {
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/addzohoview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          zohoviewId,
          zohoviewName,
          TotalContact: zohoViewForm.TotalContact,
          clientId: parseInt(clientId),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add Zoho view");
      }

      const data = await response.json();
      alert("Zoho view added successfully");
      await fetchZohoClient();

      return data;
    } catch (error) {
      console.error("Error adding Zoho view:", error);
      alert("Failed to add Zoho view");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddZohoView = async () => {
    if (
      !zohoViewForm.zohoviewId ||
      !zohoViewForm.zohoviewName ||
      !selectedClient
    ) {
      alert("Please fill all fields and ensure a client is selected");
      return;
    }

    await addZohoView(
      zohoViewForm.zohoviewId,
      zohoViewForm.zohoviewName,
      selectedClient
    );

    setZohoViewForm({
      zohoviewId: "",
      zohoviewName: "",
      TotalContact: "",
    });
  };

  const deleteZohoView = async (zohoviewId: string, clientId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/deletezohoview/${zohoviewId}/${clientId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete Zoho view");
      }

      alert("Zoho view deleted successfully");
      await fetchZohoClient();
    } catch (error) {
      console.error("Error deleting Zoho view:", error);
      alert("Failed to delete Zoho view");
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
      !selectedClient
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
          zohoViewId: campaignForm.zohoViewId,
          clientId: parseInt(selectedClient),
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
    if (selectedClient) {
      fetchZohoClient();
      fetchPromptsList();
      fetchCampaigns();
    }
  }, [selectedClient]);

  // BCC Email Management states
  const [bccEmails, setBccEmails] = useState<BccEmail[]>([]);
  const [newBccEmail, setNewBccEmail] = useState<string>("");
  const [bccLoading, setBccLoading] = useState(false);
  const [bccError, setBccError] = useState<string>("");

  type BccEmail = { id: number; bccEmailAddress: string; clinteId: number };

  // Fetch BCC emails when client changes
  useEffect(() => {
    if (!selectedClient) return;

    const fetchBcc = async () => {
      setBccLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/email/get-by-clinte?clinteId=${selectedClient}`
        );
        if (!res.ok) throw new Error("Failed to fetch BCC emails");
        const data = await res.json();
        setBccEmails(data);
        setBccError("");
      } catch (error: any) {
        setBccError("Could not fetch BCC emails");
      } finally {
        setBccLoading(false);
      }
    };

    fetchBcc();
  }, [selectedClient]);

  const handleAddBcc = async () => {
    if (!newBccEmail) return;
    setBccLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/email/${selectedClient}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ BccEmailAddress: newBccEmail }),
      });
      if (!res.ok) throw new Error("Add failed");
      setNewBccEmail("");
      setBccError("");
      // Refresh list
      const updated = await fetch(
        `${API_BASE_URL}/api/email/get-by-clinte?clinteId=${selectedClient}`
      );
      setBccEmails(await updated.json());
    } catch (error: any) {
      setBccError("Error adding BCC email");
    } finally {
      setBccLoading(false);
    }
  };

  const handleDeleteBcc = async (id: number) => {
    setBccLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/email/delete?id=${id}&clinteId=${selectedClient}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Delete failed");
      setBccError("");
      setBccEmails(bccEmails.filter((e) => e.id !== id));
    } catch (error: any) {
      setBccError("Error deleting");
    } finally {
      setBccLoading(false);
    }
  };

  return (
    <div className="data-campaigns-container">
      {/* Data File Section */}
      <div className="section-wrapper mb-20">
        <DataFile
          selectedClient={selectedClient}
          onDataProcessed={onDataProcessed}
          isProcessing={isProcessing}
        />
      </div>

      {/* Campaign Management Section */}
      <div className="section-wrapper">
        <h2 className="section-title">Campaign Management</h2>
        <div className="login-box gap-down d-flex">
          <div className="input-section edit-section">
            {/* Zoho View Management */}
            <h3 className="left mt-0">Data File Management</h3>
            <div className="row flex-wrap-991">
              <div className="col col-3 col-4-991 col-12-640">
                <div className="form-group">
                  <label>Zoho View ID</label>
                  <input
                    type="text"
                    value={zohoViewForm.zohoviewId}
                    name="zohoviewId"
                    placeholder="Enter Zoho View ID"
                    onChange={onZohoViewInput}
                  />
                </div>
              </div>

              <div className="col col-3 col-4-991 col-12-640">
                <div className="form-group">
                  <label>Zoho View Name</label>
                  <input
                    type="text"
                    value={zohoViewForm.zohoviewName}
                    name="zohoviewName"
                    placeholder="Enter Zoho View Name"
                    onChange={onZohoViewInput}
                  />
                </div>
              </div>

              <div className="col col-3 col-4-991 col-12-640">
                <div className="form-group">
                  <label>Total Contact</label>
                  <input
                    type="text"
                    value={zohoViewForm.TotalContact}
                    name="TotalContact"
                    placeholder="Enter Total Contact"
                    onChange={onZohoViewInput}
                  />
                </div>
              </div>

              <div className="col col-3 col-12-991 col-12-640">
                <div className="form-group d-flex justify-end-991 mt-24 mt-0-991">
                  <button
                    className="save-button button small d-flex justify-center align-center"
                    onClick={handleAddZohoView}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span>Adding...</span>
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
                        <span className="ml-5">Add</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="row mt-3 flex-wrap-480">
              <div className="col col-4 col-auto-768 col-12-480">
                <div className="form-group">
                  <label>Select Zoho View to Delete</label>
                  {isLoading ? (
                    <div>Loading Zoho views...</div>
                  ) : (
                    <select
                      value={selectedZohoViewForDeletion}
                      onChange={(e) =>
                        setSelectedZohoViewForDeletion(e.target.value)
                      }
                      className="form-control"
                    >
                      <option value="">Select a Zoho View</option>
                      {zohoClient && zohoClient.length > 0 ? (
                        zohoClient.map((view) => (
                          <option key={view.id} value={view.zohoviewId}>
                            {view.zohoviewName} ({view.zohoviewId})
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>
                          No Zoho views available
                        </option>
                      )}
                    </select>
                  )}
                  {!isLoading && zohoClient.length === 0 && selectedClient && (
                    <div className="text-muted mt-1">
                      No Zoho views found for this client
                    </div>
                  )}
                </div>
              </div>

              <div className="col col-4 col-auto-768 col-12-480">
                <div className="form-group d-flex mt-24 mt-0-480">
                  <button
                    className="secondary button d-flex justify-between align-center"
                    onClick={() => {
                      if (selectedZohoViewForDeletion) {
                        deleteZohoView(
                          selectedZohoViewForDeletion,
                          selectedClient
                        );
                        setSelectedZohoViewForDeletion("");
                      } else {
                        alert("Please select a Zoho View to delete");
                      }
                    }}
                    disabled={isLoading || !selectedZohoViewForDeletion}
                  >
                    {isLoading ? (
                      <span>Loading...</span>
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

            <div className="row mt-3">
              <div className="col col-12">
                <h3 className="left mt-0">Campaign Configuration</h3>
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
                  {!isLoading && promptList.length === 0 && selectedClient && (
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
                    {zohoClient.map((client) => (
                      <option key={client.id} value={client.zohoviewId}>
                        {client.zohoviewName}
                      </option>
                    ))}
                  </select>
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
                  {!isLoading && campaigns.length === 0 && selectedClient && (
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
            {/* BCC Email Management Section */}
            <div className="row mt-3">
              <div className="col col-12">
                <h3 className="left mt-0">BCC Email Management</h3>
                {bccError && <div style={{ color: "red" }}>{bccError}</div>}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <input
                    type="email"
                    placeholder="Add BCC Email"
                    value={newBccEmail}
                    onChange={(e) => setNewBccEmail(e.target.value)}
                    style={{ flex: "0 0 240px", marginRight: "10px" }}
                    disabled={bccLoading}
                  />
                  <button
                    className="save-button button small"
                    onClick={handleAddBcc}
                    disabled={bccLoading || !newBccEmail}
                  >
                    Add
                  </button>
                </div>
                {bccLoading ? (
                  <div>Loading BCC emails...</div>
                ) : bccEmails.length === 0 ? (
                  <div>No BCC emails.</div>
                ) : (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {bccEmails.map((e) => (
                      <li
                        key={e.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ marginRight: 12 }}>
                          {e.bccEmailAddress}
                        </span>
                        <button
                          className="secondary button small"
                          onClick={() => handleDeleteBcc(e.id)}
                          disabled={bccLoading}
                          title="Delete this BCC address"
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataCampaigns;
