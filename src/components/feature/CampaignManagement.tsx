import React, { useState, useEffect } from "react";
import API_BASE_URL from "../../config";
import { useSelector } from "react-redux";
import { RootState } from "../../Redux/store";
import { useAppData } from "../../contexts/AppDataContext";
import AppModal from "../common/AppModal";
import { useAppModal } from "../../hooks/useAppModal";
import PaginationControls from "./PaginationControls";

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
  const [campaignActionsAnchor, setCampaignActionsAnchor] = useState<
    string | null
  >(null);
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const appModal = useAppModal();

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

  const reduxUserId = useSelector((state: RootState) => state.auth.userId);
  const effectiveUserId = selectedClient !== "" ? selectedClient : reduxUserId;
  console.log("API Payload Client ID:", effectiveUserId);
  
  useEffect(() => {
    console.log("User ID from Redux:", reduxUserId);
    console.log("Effective User ID:", effectiveUserId);
  }, [reduxUserId, effectiveUserId]);

  // const userId = useSelector((state: RootState) => state.auth.userId);

  // const effectiveUserId = selectedClient !== "" ? selectedClient : userId;
  const [segments, setSegments] = useState<Segment[]>([]);

  const { refreshTrigger, saveFormState, getFormState, triggerRefresh } =
    useAppData(); // ADD triggerRefresh here

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

  const handleCampaignFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    const newForm = { ...campaignForm, [name]: value };
    setCampaignForm(newForm);
    saveFormState("campaign-form", newForm); // Add this line
  };

  useEffect(() => {
    if (effectiveUserId && refreshTrigger > 0) {
      fetchDataFiles();
      fetchSegments();
    }
  }, [refreshTrigger, effectiveUserId]);

  useEffect(() => {
    const savedForm = getFormState("campaign-form");
    if (Object.keys(savedForm).length > 0) {
      setCampaignForm(savedForm);
    }
  }, []); // Add this useEffect

  const createCampaign = async () => {
    // Check that either zohoViewId OR segmentId is provided (not both, not neither)
    const hasDataFile = !!campaignForm.zohoViewId;
    const hasSegment = !!campaignForm.segmentId;

    if (
      !campaignForm.campaignName ||
      !campaignForm.promptId ||
      !effectiveUserId
    ) {
      appModal.showError("Please fill all required fields for the campaign");
      return;
    }

    if ((!hasDataFile && !hasSegment) || (hasDataFile && hasSegment)) {
      appModal.showError(
        "Please select either a data file OR a segment (not both)"
      );
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

      appModal.showSuccess("Campaign created successfully");

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
      appModal.showError(`Failed to create campaign: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCampaign = async () => {
    const hasDataFile = !!campaignForm.zohoViewId;
    const hasSegment = !!campaignForm.segmentId;

    if (
      !selectedCampaign ||
      !campaignForm.campaignName ||
      !campaignForm.promptId
    ) {
      appModal.showError(
        "Please select a campaign and fill all required fields"
      );
      return;
    }

    if ((!hasDataFile && !hasSegment) || (hasDataFile && hasSegment)) {
      appModal.showError(
        "Please select either a data file OR a segment (not both)"
      );
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

      appModal.showSuccess("Campaign updated successfully");

      setShowCreateCampaignModal(false);

      await fetchCampaigns();

      triggerRefresh();
    } catch (error) {
      console.error("Error updating campaign:", error);
      appModal.showError(`Failed to update campaign: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState(null);

  // Move this function outside of deleteCampaign, after your other state declarations
  // After your state declarations and before your useEffects, add this function:
  const deleteCampaignDirectly = async (campaign: Campaign) => {
    if (!campaign) {
      appModal.showError("No campaign selected");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/deletecampaign/${campaign.id}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete campaign");
      }

      appModal.showSuccess("Campaign deleted successfully");

      setSelectedCampaign(null);
      setCampaignForm({
        campaignName: "",
        promptId: "",
        zohoViewId: "",
        segmentId: "",
        description: "",
      });

      await fetchCampaigns();
      triggerRefresh();
    } catch (error) {
      console.error("Error deleting campaign:", error);
      appModal.showError("Failed to delete campaign");
    } finally {
      setIsLoading(false);
    }
  };

  // Replace your existing deleteCampaign function with this simpler version:
  const deleteCampaign = async () => {
    if (!selectedCampaign) {
      appModal.showError("Please select a campaign to delete");
      return;
    }

    await deleteCampaignDirectly(selectedCampaign);
  };
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
  const handleDataSourceChange = (
    type: "datafile" | "segment",
    value: string
  ) => {
    if (type === "datafile") {
      setCampaignForm((prev) => ({
        ...prev,
        zohoViewId: value,
        segmentId: "", // Clear segment when datafile is selected
      }));
    } else {
      setCampaignForm((prev) => ({
        ...prev,
        segmentId: value,
        zohoViewId: "", // Clear datafile when segment is selected
      }));
    }
  };

  const filteredCampaigns = campaigns.filter(
    (campaign) =>
      campaign.campaignName
        ?.toLowerCase()
        .includes(campaignSearch.toLowerCase()) ||
      campaign.description?.toLowerCase().includes(campaignSearch.toLowerCase())
  );

  // Add this useEffect after your other hooks
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click is outside the actions menu
      const target = event.target as HTMLElement;
      const isActionsButton = target.closest(".segment-actions-btn");
      const isActionsMenu = target.closest(".segment-actions-menu");

      if (!isActionsButton && !isActionsMenu) {
        setCampaignActionsAnchor(null);
      }
    };

    // Add event listener when menu is open
    if (campaignActionsAnchor) {
      document.addEventListener("click", handleClickOutside);
    }

    // Cleanup
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [campaignActionsAnchor]);
const [currentPage, setCurrentPage] = useState(1);
const pageSize = 5; // or 10, adjust as needed

// Calculate total pages
const totalPages = Math.ceil(filteredCampaigns.length / pageSize);

// Paginated data
const paginatedCampaigns = filteredCampaigns.slice(
  (currentPage - 1) * pageSize,
  currentPage * pageSize
);
  return (
    <div className="data-campaigns-container">
      <div className="section-wrapper">
        <h2 className="section-title">Campaigns</h2>
        <div style={{ marginBottom: 4, color: "#555" }}>
          Create and manage campaigns to generate personalized content for your
          contacts.
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 16,
            gap: 16,
          }}
        >
          <input
            type="text"
            className="search-input"
            style={{ width: 340 }}
            placeholder="Search campaigns..."
            value={campaignSearch}
            onChange={(e) => setCampaignSearch(e.target.value)}
          />
          <button
            className="save-button button auto-width small d-flex justify-between align-center"
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
              <th>Campaign name</th>
              <th>Template</th>
              <th>Data source</th>
              <th>Description</th>
              <th>Created date</th>
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
                const prompt = promptList.find(
                  (p) => p.id === campaign.promptId
                );
                const dataFile = dataFiles.find(
                  (df) => df.id.toString() === (campaign as any).zohoViewId
                );
                const segment = segments.find(
                  (s) => s.id === (campaign as any).segmentId
                );

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
                        className="segment-actions-btn font-[600]"
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
                          className="segment-actions-menu py-[10px]"
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
                                segmentId:
                                  (campaign as any).segmentId?.toString() || "",
                                description: campaign.description || "",
                              });
                              const prompt = promptList.find(
                                (p) => p.id === campaign.promptId
                              );
                              setSelectedPrompt(prompt || null);
                              setShowCreateCampaignModal(true);
                              setCampaignActionsAnchor(null);
                            }}
                            style={menuBtnStyle}
                            className="flex gap-2 items-center"
                          >
                            <span>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24px"
                                height="24px"
                                viewBox="0 0 24 24"
                                fill="none"
                              >
                                <path
                                  d="M12 3.99997H6C4.89543 3.99997 4 4.8954 4 5.99997V18C4 19.1045 4.89543 20 6 20H18C19.1046 20 20 19.1045 20 18V12M18.4142 8.41417L19.5 7.32842C20.281 6.54737 20.281 5.28104 19.5 4.5C18.7189 3.71895 17.4526 3.71895 16.6715 4.50001L15.5858 5.58575M18.4142 8.41417L12.3779 14.4505C12.0987 14.7297 11.7431 14.9201 11.356 14.9975L8.41422 15.5858L9.00257 12.6441C9.08001 12.2569 9.27032 11.9013 9.54951 11.6221L15.5858 5.58575M18.4142 8.41417L15.5858 5.58575"
                                  stroke="#000000"
                                  strokeWidth="2"
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                ></path>
                              </svg>
                            </span>
                            <span className="font-[600]">Edit</span>
                          </button>
                          <button
                            onClick={() => {
                              deleteCampaignDirectly(campaign);
                              setCampaignActionsAnchor(null);
                            }}
                            style={{ ...menuBtnStyle }}
                            className="flex items-center gap-2"
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
                            <span className="font-[600]">Delete</span>
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
          <PaginationControls
  currentPage={currentPage}
  totalPages={totalPages}
  pageSize={pageSize}
  totalRecords={filteredCampaigns.length}
  setCurrentPage={setCurrentPage}
/>
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
            <h2
              className="sub-title"
              style={{ marginTop: 0, marginBottom: 24 }}
            >
              {selectedCampaign ? "Edit Campaign" : "Create Campaign"}
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 15,
              }}
            >
              <div style={{ gridColumn: "1 / -1" }}>
                <div className="form-group !mb-0">
                  <label>
                    Campaign name <span style={{ color: "red" }}>*</span>
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
                <div className="form-group !mb-0">
                  <label>
                    Template <span style={{ color: "red" }}>*</span>
                  </label>
                  <select
                    value={selectedPrompt?.id || ""}
                    onChange={handlePromptSelect}
                    className="form-control"
                  >
                    <option value="">Template</option>
                    {promptList.map((prompt) => (
                      <option key={prompt.id} value={prompt.id}>
                        {prompt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Combined List/Segment Dropdown */}
              <div style={{ gridColumn: "1 / -1" }}>
                <div className="form-group !mb-0">
                  <label>
                    List/Segment <span style={{ color: "red" }}>*</span>
                  </label>
                  <select
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.startsWith("list-")) {
                        const listId = value.replace("list-", "");
                        handleDataSourceChange("datafile", listId);
                      } else if (value.startsWith("segment-")) {
                        const segmentId = value.replace("segment-", "");
                        handleDataSourceChange("segment", segmentId);
                      } else {
                        // Clear both if no selection
                        setCampaignForm((prev) => ({
                          ...prev,
                          zohoViewId: "",
                          segmentId: "",
                        }));
                      }
                    }}
                    value={
                      campaignForm.zohoViewId
                        ? `list-${campaignForm.zohoViewId}`
                        : campaignForm.segmentId
                          ? `segment-${campaignForm.segmentId}`
                          : ""
                    }
                    className="form-control"
                    disabled={
                      isLoading ||
                      (dataFiles.length === 0 && segments.length === 0)
                    }
                    required
                  >
                    <option value="">List or Segment</option>
                    {dataFiles.length > 0 && (
                      <optgroup label="Lists">
                        {dataFiles.map((file) => (
                          <option
                            key={`list-${file.id}`}
                            value={`list-${file.id}`}
                          >
                            {file.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {segments.length > 0 && (
                      <optgroup label="Segments">
                        {segments.map((segment) => (
                          <option
                            key={`segment-${segment.id}`}
                            value={`segment-${segment.id}`}
                          >
                            {segment.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <div className="form-group !mb-0">
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

            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "flex-end",
                marginTop: 24,
              }}
            >
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
                className="save-button button auto-width small d-flex justify-between align-center"
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
                      ? "#3f9f42"
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
                {isLoading
                  ? selectedCampaign
                    ? "Updating..."
                    : "Creating..."
                  : selectedCampaign
                    ? "Update Campaign"
                    : "Create Campaign"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AppModal
        isOpen={appModal.isOpen}
        onClose={appModal.hideModal}
        {...appModal.config}
      />
    </div>
  );
};

export default CampaignManagement;
