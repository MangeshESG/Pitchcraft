import React, { useState, useEffect } from "react";
import API_BASE_URL from "../../config";
import { useSelector } from "react-redux";
import { RootState } from "../../Redux/store";
import { useAppData } from "../../contexts/AppDataContext";
import AppModal from "../common/AppModal";
import { useAppModal } from "../../hooks/useAppModal";
import PaginationControls from "./PaginationControls";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface CampaignManagementProps {
  selectedClient: string;
  userRole?: string;
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
}

interface Campaign {
  id: number;
  campaignName: string;
  promptId: number;
  clientId: number;
  description?: string;
  templateId?: number; // campaign blueprint ID
  segmentId?: number | null;
  zohoViewId?: string | null;
  segmentName?: string | null;
  dataFileName?: string | null;
  dataSource?: string;
}

interface DataFile {
  id: number;
  client_id: number;
  name: string;
}

interface CampaignBlueprint {
  id: number;
  templateName: string;
  campaignBlueprint: string;
  selectedModel?: string;
}

const CampaignManagement: React.FC<CampaignManagementProps> = ({
  selectedClient,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [dataFiles, setDataFiles] = useState<DataFile[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [promptList, setPromptList] = useState<Prompt[]>([]);
  const [campaignBlueprints, setCampaignBlueprints] = useState<CampaignBlueprint[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);
  const [campaignSearch, setCampaignSearch] = useState("");
  const [campaignActionsAnchor, setCampaignActionsAnchor] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [listSortKey, setListSortKey] = useState<string>("campaignName");
  const [listSortDirection, setListSortDirection] = useState<"asc" | "desc">("asc");
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");


  const appModal = useAppModal();
  const { refreshTrigger, triggerRefresh } = useAppData();

  const reduxUserId = useSelector((state: RootState) => state.auth.userId);
  const effectiveUserId = selectedClient !== "" ? selectedClient : reduxUserId;

  const [campaignForm, setCampaignForm] = useState({
    campaignName: "",
    promptId: "",
    zohoViewId: "",
    segmentId: "",
    description: "",
    templateId: "", // campaign blueprint id
  });

  // ================== FETCH FUNCTIONS ==================
  const compareStrings = (a?: string, b?: string, direction: "asc" | "desc" = "asc") => {
    const valueA = (a || "").toLowerCase();
    const valueB = (b || "").toLowerCase();

    if (valueA < valueB) return direction === "asc" ? -1 : 1;
    if (valueA > valueB) return direction === "asc" ? 1 : -1;
    return 0;
  };
  const handleListSort = (key: string) => {
    if (listSortKey === key) {
      setListSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setListSortKey(key);
      setListSortDirection("asc");
    }
  };
  const fetchCampaigns = async () => {
    if (!effectiveUserId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/campaigns/client/${effectiveUserId}`);
      const data: Campaign[] = await res.json();
      const enrichedCampaigns = await Promise.all(
        data.map(async (c) => {
          try {
            const detailRes = await fetch(
              `${API_BASE_URL}/api/auth/campaigns/${c.id}`
            );
            const detail = await detailRes.json();
            return {
              ...c,
              templateId: detail.templateId,
            };
          } catch {
            return c;
          }
        })
      );
      setCampaigns(enrichedCampaigns);
      // setCampaigns(data);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDataFiles = async () => {
    if (!effectiveUserId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/crm/datafile-byclientid?clientId=${effectiveUserId}`);
      const data: DataFile[] = await res.json();
      setDataFiles(data);
    } catch (err) {
      console.error("Error fetching data files:", err);
    }
  };

  const fetchSegments = async () => {
    if (!effectiveUserId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/Crm/get-segments-by-client?clientId=${effectiveUserId}`);
      const data: Segment[] = await res.json();
      setSegments(data);
    } catch (err) {
      console.error("Error fetching segments:", err);
    }
  };

  const fetchPromptsList = async () => {
    if (!effectiveUserId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/getprompts/${effectiveUserId}`);
      const data: Prompt[] = await res.json();
      setPromptList(data);
    } catch (err) {
      console.error("Error fetching prompts:", err);
    }
  };

  const fetchCampaignBlueprints = async () => {
    if (!effectiveUserId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/CampaignPrompt/templates/${effectiveUserId}`);
      const data = await res.json();
      setCampaignBlueprints(data.templates || []);
    } catch (err) {
      console.error("Error fetching campaign blueprints:", err);
    }
  };

  useEffect(() => {
    if (effectiveUserId) {
      fetchCampaigns();
      fetchDataFiles();
      fetchSegments();
      fetchPromptsList();
      fetchCampaignBlueprints();
    }
  }, [effectiveUserId, refreshTrigger]);

  // ================== HANDLERS ==================

  const handlePromptSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const promptId = e.target.value;
    const prompt = promptList.find((p) => p.id.toString() === promptId);
    setSelectedPrompt(prompt || null);
    setCampaignForm((prev) => ({ ...prev, promptId }));
  };

  const handleDataSourceChange = (type: "datafile" | "segment", value: string) => {
    setCampaignForm((prev) => ({
      ...prev,
      zohoViewId: type === "datafile" ? value : "",
      segmentId: type === "segment" ? value : "",
    }));
  };

  const handleCampaignSelect = async (campaignId: string) => {
    const campaign = campaigns.find((c) => c.id.toString() === campaignId);
    if (!campaign) return;

    setSelectedCampaign(campaign);
    setCampaignForm({
      campaignName: campaign.campaignName,
      promptId: campaign.promptId?.toString() || "",
      zohoViewId: campaign.zohoViewId || "",
      segmentId: campaign.segmentId?.toString() || "",
      description: campaign.description || "",
      templateId: campaign.templateId?.toString() || "",
    });

    // ✅ Load blueprint data for the selected campaign
    if (campaign.templateId) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/CampaignPrompt/campaign/${campaign.templateId}`);
        const data = await res.json();
        saveCampaignBlueprint(data);
      } catch (error) {
        console.error("Error fetching campaign blueprint:", error);
      }
    }
  };


  const handleCampaignFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setCampaignForm((prev) => ({ ...prev, [name]: value }));
  };


  // ✅ Helper: Save campaign blueprint to sessionStorage and context
  const saveCampaignBlueprint = (blueprintData: any) => {
    if (!blueprintData) return;

    const promptPayload = {
      id: blueprintData.id || "campaign-blueprint",
      name: blueprintData.templateName || "Campaign Blueprint",
      text: blueprintData.campaignBlueprint || "",
      model: blueprintData.selectedModel || "gpt-5",
    };

    // ✅ Store in sessionStorage for MainPage.tsx
    sessionStorage.setItem("selectedPrompt", JSON.stringify(promptPayload));
    sessionStorage.setItem("selectedCampaignId", blueprintData.id);

    // ✅ Optional: update context/local state
    setSelectedPrompt(promptPayload);
  };


  const createCampaign = async () => {
    if (!campaignForm.campaignName || !effectiveUserId) {
      appModal.showError("Please fill all required fields.");
      return;
    }

    const requestBody = {
      campaignName: campaignForm.campaignName,
      promptId: campaignForm.promptId ? parseInt(campaignForm.promptId) : null,
      clientId: typeof effectiveUserId === "string" ? parseInt(effectiveUserId) : effectiveUserId,
      templateId: campaignForm.templateId ? parseInt(campaignForm.templateId) : null,
      description: campaignForm.description,
      segmentId: campaignForm.segmentId ? parseInt(campaignForm.segmentId) : null,
      zohoViewId: campaignForm.zohoViewId || null,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const resBody = await res.json();
      console.log("resBody", resBody);
      if (!res.ok) throw new Error(resBody.message || JSON.stringify(resBody));

      // ✅ Store the blueprint (prompt) returned by backend
      if (resBody.campaignBlueprint) {
        saveCampaignBlueprint({
          id: resBody.templateId,
          templateName: campaignBlueprints.find((bp) => bp.id === resBody.templateId)?.templateName,
          campaignBlueprint: resBody.campaignBlueprint,
          selectedModel: "gpt-5",
        });
      }

     // appModal.showSuccess("Campaign created successfully");

       setToastMessage("The Campaign has been created with success!");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);

      setShowCreateCampaignModal(false);
      fetchCampaigns();
      triggerRefresh(); // Notify other components to refresh their campaign data
    } catch (err: any) {
      console.error(err);
      appModal.showError(err.message || "Failed to create campaign");
    }
  };



  const updateCampaign = async () => {
    if (!selectedCampaign) return;
    const requestBody = {
      id: selectedCampaign.id,
      campaignName: campaignForm.campaignName,
      promptId: parseInt(campaignForm.promptId),
      zohoViewId: campaignForm.zohoViewId || null,
      segmentId: campaignForm.segmentId ? parseInt(campaignForm.segmentId) : null,
      description: campaignForm.description,
      templateId: campaignForm.templateId ? parseInt(campaignForm.templateId) : null,
    };
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/updatecampaign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!res.ok) throw new Error("Failed to update campaign");
      // appModal.showSuccess("Campaign updated successfully");
      setToastMessage("The Campaign has been updated with success!");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      setShowCreateCampaignModal(false);
      fetchCampaigns();
      triggerRefresh(); // Notify other components to refresh their campaign data
    } catch (err) {
      console.error(err);
      appModal.showError("Failed to update campaign");
    }
  };

  const deleteCampaign = async (campaign: Campaign) => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/deletecampaign/${campaign.id}`, { method: "POST" });
      // appModal.showSuccess("Campaign deleted successfully");
      setToastMessage("The Campaign has been deleted with success!");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      fetchCampaigns();
      triggerRefresh(); // Notify other components to refresh their campaign data
    } catch (err) {
      console.error(err);
      appModal.showError("Failed to delete campaign");
    }
  };
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/campaigns/client/${effectiveUserId}`);
        const data = await response.json();
        console.log("Alltemplateid", data)
        setCampaigns(data);
        // setCampaigns(data.campaigns || []);
      } catch (err) {
        console.error("Error fetching campaigns", err);
      }
    };
    fetchCampaigns();
  }, []);

  // ================== UI RENDER ==================

  //const pageSize = 5;
  const [pageSize, setPageSize] = useState<number | "All">(10);
  // const filteredCampaigns = campaigns.filter((c) =>
  //   c.campaignName.toLowerCase().includes(campaignSearch.toLowerCase())
  // );
  const filteredCampaigns = campaigns
    .filter((c) =>
      c.campaignName.toLowerCase().includes(campaignSearch.toLowerCase())
    )
    .sort((a, b) => {
      switch (listSortKey) {
        case "campaignName":
          return compareStrings(a.campaignName, b.campaignName, listSortDirection);

        case "templateName":
          return compareStrings(
            campaignBlueprints.find(bp => bp.id === a.templateId)?.templateName,
            campaignBlueprints.find(bp => bp.id === b.templateId)?.templateName,
            listSortDirection
          );

        case "description":
          return compareStrings(a.description, b.description, listSortDirection);

        default:
          return 0;
      }
    });

  const totalPages = pageSize === "All"
    ? 1
    : Math.ceil(filteredCampaigns.length / pageSize);
  const paginatedCampaigns = pageSize === "All"
    ? filteredCampaigns
    : filteredCampaigns.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  const menuBtnStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    background: "transparent",
    border: "none",
    textAlign: "left",
    fontSize: "14px",
    cursor: "pointer",
  };
  const renderSortArrow = (columnKey: string, currentSortKey: string, sortDirection: string) => {
    if (columnKey === currentSortKey) {
      return sortDirection === "asc" ? " ▲" : " ▼"
    }
    return ""
  }
  return (
    <div className="data-campaigns-container">
      <div className="section-wrapper">
        <h2 className="section-title" style={{ marginTop: "-65px" }}>Campaigns</h2>
        <p style={{ marginBottom: '10px' }}>Create and manage campaigns quickly and efficiently.</p>

        <div style={{ display: "flex", alignItems: "center", marginBottom: 16, gap: 16 }}>
          <input
            type="text"
            placeholder="Search campaigns..."
            value={campaignSearch}
            onChange={(e) => setCampaignSearch(e.target.value)}
            className="search-input"
            style={{ width: 340 }}
          />
          <button
            className="save-button button small"
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
                templateId: "",
              });
            }}
          >
            + Create campaign
          </button>
        </div>
        <div style={{ marginBottom: "10px" }}>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalRecords={filteredCampaigns.length}
            setCurrentPage={setCurrentPage}
            setPageSize={setPageSize}
            showPageSizeDropdown={true}
            pageLabel="Page:"
          />
        </div>

        <table className="contacts-table" style={{ background: "#fff" }}>
          <thead>
            <tr>
              <th onClick={() => handleListSort("campaignName")} style={{ cursor: "pointer" }}>Campaign name{renderSortArrow("campaignName", listSortKey, listSortDirection)}</th>
              <th onClick={() => handleListSort("templateName")} style={{ cursor: "pointer" }}>Blueprint{renderSortArrow("templateName", listSortKey, listSortDirection)}</th>
              <th onClick={() => handleListSort("description")} style={{ cursor: "pointer" }}>Data source</th>
              <th onClick={() => handleListSort("description")} style={{ cursor: "pointer" }}>Description{renderSortArrow("description", listSortKey, listSortDirection)}</th>
              <th onClick={() => handleListSort("name")} style={{ cursor: "pointer" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5}>Loading...</td></tr>
            ) : paginatedCampaigns.length === 0 ? (
              <tr><td colSpan={5}>No campaigns found.</td></tr>
            ) : (
              paginatedCampaigns.map((c) => (
                <tr key={c.id}>
                  <td>{c.campaignName}</td>
                  <td>
                    {c.templateId
                      ? campaignBlueprints.find(bp => bp.id === c.templateId)?.templateName || "-"
                      : "-"}
                  </td>

                  <td>
                    {c.dataSource === "Segment" && c.segmentName ? c.segmentName :
                      c.dataSource === "DataFile" && c.dataFileName ? c.dataFileName :
                        c.zohoViewId ? "List" : c.segmentId ? "Segment" : "-"}
                  </td>
                  <td>{c.description || "-"}</td>
                  <td style={{ position: "relative" }}>
                    <button
                      onClick={() =>
                        setCampaignActionsAnchor(
                          campaignActionsAnchor === c.id ? null : c.id
                        )
                      }
                      style={{
                        padding: "4px 10px",
                        borderRadius: "5px",
                        fontSize: "20px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      ⋮
                    </button>

                    {campaignActionsAnchor === c.id && (
                      <div
                        style={{
                          position: "absolute",
                          top: "30px",
                          right: 0,
                          // background: "#fff",
                          //border: "1px solid #ddd",
                          borderRadius: "6px",
                          boxShadow: "0px 4px 12px rgba(0,0,0,0.15)",
                          zIndex: 100,
                          padding: "8px 0",
                          width: "120px",
                        }}
                      >
                        {/* <button
        onClick={() => {
          handleCampaignSelect(c.id.toString());
          setCampaignActionsAnchor(null);
        }}
        style={menuBtnStyle}
        className="flex gap-2 items-center"
      >
        👁 View
      </button> */}

                        <button
                          onClick={() => {
                            handleCampaignSelect(c.id.toString());
                            setShowCreateCampaignModal(true);
                            setCampaignActionsAnchor(null);
                          }}
                          style={{ ...menuBtnStyle, fontSize: '15px', fontWeight: 600 }}
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
                          </span> Edit
                        </button>

                        <button
                          onClick={() => {
                            deleteCampaign(c);
                            setCampaignActionsAnchor(null);
                          }}
                          style={{ ...menuBtnStyle, fontSize: '15px', fontWeight: 600 }}
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
                          </span> Delete
                        </button>
                      </div>
                    )}
                  </td>

                  {/* <td>
                    <button onClick={() => handleCampaignSelect(c.id.toString())}>Edit</button>
                    <button onClick={() => deleteCampaign(c)}>Delete</button>
                  </td> */}
                </tr>
              ))
            )}
          </tbody>
        </table>

        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalRecords={filteredCampaigns.length}
          setCurrentPage={setCurrentPage}
          setPageSize={setPageSize}
          showPageSizeDropdown={true}
          pageLabel="Page:"
        />
      </div>
      <ToastContainer />
      {showCreateCampaignModal && (
        <div
          // onClick={() => {
          //   setShowCreateCampaignModal(false);
          //   setSelectedCampaign(null);
          //   setCampaignForm({
          //     campaignName: "",
          //     promptId: "",
          //     zohoViewId: "",
          //     segmentId: "",
          //     description: "",
          //     templateId: "",
          //   });
          //   setSelectedPrompt(null);
          // }}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: "8px",
              padding: "32px 40px",
              width: "45%",
              maxWidth: "800px",
              boxShadow: "0px 8px 40px rgba(0,0,0,0.2)",
              position: "relative",
              animation: "fadeIn 0.2s ease-in-out",
            }}
          >
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "600",
                marginBottom: "24px",
                color: "#222",
              }}
            >
              {selectedCampaign ? "Edit campaign" : "Create campaign"}
            </h2>

            {/* Campaign Name */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontWeight: 500 }}>
                Campaign name <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="text"
                name="campaignName"
                value={campaignForm.campaignName}
                onChange={handleCampaignFormChange}
                placeholder="Enter campaign name"
                style={{
                  width: "100%",
                  marginTop: "6px",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                  outline: "none",
                  fontSize: "14px",
                }}
              />
            </div>

            {/* Blueprint Dropdown */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontWeight: 500 }}>
                Blueprint <span style={{ color: "red" }}>*</span>
              </label>
              <select
                value={campaignForm.templateId}
                onChange={(e) =>
                  setCampaignForm((prev) => ({
                    ...prev,
                    templateId: e.target.value,
                  }))
                }
                style={{
                  width: "100%",
                  marginTop: "6px",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                  outline: "none",
                  fontSize: "14px",
                  backgroundColor: "#fff",
                }}
              >
                <option value="">Select Blueprint</option>
                {campaignBlueprints.map((bp) => (
                  <option key={bp.id} value={bp.id}>
                    {bp.templateName}
                  </option>
                ))}
              </select>
            </div>

            {/* List/Segment */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontWeight: 500 }}>
                List/segment <span style={{ color: "red" }}>*</span>
              </label>
              <select
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.startsWith("list-")) {
                    handleDataSourceChange("datafile", value.replace("list-", ""));
                  } else if (value.startsWith("segment-")) {
                    handleDataSourceChange("segment", value.replace("segment-", ""));
                  } else {
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
                disabled={isLoading || (dataFiles.length === 0 && segments.length === 0)}
                style={{
                  width: "100%",
                  marginTop: "6px",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                  outline: "none",
                  fontSize: "14px",
                  backgroundColor: "#fff",
                }}
              >
                <option value="">Select list or segment</option>
                {dataFiles.length > 0 && (
                  <optgroup label="Lists">
                    {dataFiles.map((file) => (
                      <option key={`list-${file.id}`} value={`list-${file.id}`}>
                        {file.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {segments.length > 0 && (
                  <optgroup label="Segments">
                    {segments.map((segment) => (
                      <option key={`segment-${segment.id}`} value={`segment-${segment.id}`}>
                        {segment.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Description */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontWeight: 500 }}>Description</label>
              <textarea
                name="description"
                value={campaignForm.description}
                onChange={handleCampaignFormChange}
                placeholder="Enter campaign description"
                style={{
                  width: "100%",
                  marginTop: "6px",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                  outline: "none",
                  fontSize: "14px",
                  resize: "none",
                }}
                rows={3}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                onClick={() => setShowCreateCampaignModal(false)}
                style={{
                  padding: "8px 18px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  background: "#fff",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={selectedCampaign ? updateCampaign : createCampaign}
                disabled={
                  isLoading ||
                  !campaignForm.campaignName ||
                  !campaignForm.templateId ||
                  (!campaignForm.zohoViewId && !campaignForm.segmentId)
                }
                style={{
                  padding: "8px 18px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor:
                    !isLoading &&
                      campaignForm.campaignName &&
                      campaignForm.templateId &&
                      (campaignForm.zohoViewId || campaignForm.segmentId)
                      ? "#3f9f42"
                      : "#ccc",
                  color: "#fff",
                  fontWeight: 500,
                  cursor:
                    !isLoading &&
                      campaignForm.campaignName &&
                      campaignForm.templateId &&
                      (campaignForm.zohoViewId || campaignForm.segmentId)
                      ? "pointer"
                      : "not-allowed",
                  transition: "0.2s ease",
                }}
              >
                {isLoading
                  ? selectedCampaign
                    ? "Updating..."
                    : "Creating..."
                  : selectedCampaign
                    ? "Update campaign"
                    : "Create campaign"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showSuccessToast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#ecfdf5",
            color: "#065f46",
            padding: "12px 18px",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
            zIndex: 99999,
            minWidth: 320,
          }}
        >
          {/* Green check */}
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "#22c55e",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            ✓
          </div>

          {/* Message */}
          <div style={{ fontSize: 14, flex: 1 }}>
            {toastMessage}
          </div>

          {/* Close */}
          <div
            onClick={() => setShowSuccessToast(false)}
            style={{
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ×
          </div>
        </div>
      )}

      <AppModal isOpen={appModal.isOpen} onClose={appModal.hideModal} {...appModal.config} />
    </div>
  );
};

export default CampaignManagement;
