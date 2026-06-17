import React, { useState, useEffect, useRef } from "react";
import API_BASE_URL from "../../config";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../Redux/store";
import { useAppData } from "../../contexts/AppDataContext";
import AppModal from "../common/AppModal";
import { useAppModal } from "../../hooks/useAppModal";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CommonSidePanel from "../common/CommonSidePanel";
import { closePanel, openPanel } from "../../slices/panelSlice";
import "./blueprint/Template.new.css";
import { BpBanner } from "./blueprint/BpBanner";
import campaignIllustration from "../../assets/images/campaign-illustration.png";
import campaignIllustration2 from "../../assets/images/Campgains_old_user.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import {
  FileText,
  MoreVertical,
  Pencil,
  Plus,
  Rocket,
  Search,
  Trash2,
  Users,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

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

interface ViewOption {
  id: number;
  name: string;
  description?: string;
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
  createdAt?: string;
  created_at?: string;
  CreatedAt?: string;
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

const VIDEO_BASE = "https://app.pitchkraft.ai";
const CAMPAIGN_VIDEO = `${VIDEO_BASE}/video/Campaigns.mp4`;

const CampaignManagement: React.FC<CampaignManagementProps> = ({
  selectedClient,
}) => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [dataFiles, setDataFiles] = useState<DataFile[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [views, setViews] = useState<ViewOption[]>([]);
  const [promptList, setPromptList] = useState<Prompt[]>([]);
  const [campaignBlueprints, setCampaignBlueprints] = useState<CampaignBlueprint[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  // const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);
  const [campaignSearch, setCampaignSearch] = useState("");
  const [campaignActionsAnchor, setCampaignActionsAnchor] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [listSortKey, setListSortKey] = useState<string>("campaignName");
  const [listSortDirection, setListSortDirection] = useState<"asc" | "desc">("asc");
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [showCampaignVideo, setShowCampaignVideo] = useState(false);
  const campaignVideoRef = useRef<HTMLVideoElement>(null);

  const activePanel = useSelector(
    (state: RootState) => state.panel.activePanel
  );

  const showCreateCampaignModal =
    activePanel === "campaign-create";


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
  const getCampaignCreatedAt = (campaign: Campaign) =>
    campaign.createdAt || campaign.created_at || campaign.CreatedAt || "";

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getBlueprintName = (campaign: Campaign) =>
    campaign.templateId
      ? campaignBlueprints.find((bp) => bp.id === campaign.templateId)?.templateName || "-"
      : "-";

  const getDataSourceName = (campaign: Campaign) => {
    if (typeof campaign.zohoViewId === "string" && campaign.zohoViewId.startsWith("view_")) {
      return (
        views.find(
          (view) =>
            view.id.toString() ===
            (campaign.zohoViewId as string).replace("view_", "")
        )?.name || "View"
      );
    }

    if (campaign.dataSource === "Segment" && campaign.segmentName) return campaign.segmentName;
    if (campaign.dataSource === "DataFile" && campaign.dataFileName) return campaign.dataFileName;
    if (campaign.segmentId) return "Segment";
    if (campaign.zohoViewId) return "List";
    return "-";
  };

  const handleDataSourceClick = (campaign: Campaign) => {
    // Clear any previous view state from sessionStorage
    const viewStateKey = `crm_view_state_${effectiveUserId}`;
    sessionStorage.removeItem(viewStateKey);
    
    // Check if it's a view
    if (typeof campaign.zohoViewId === "string" && campaign.zohoViewId.startsWith("view_")) {
      const viewId = campaign.zohoViewId.replace("view_", "");
      
      // Save view state to sessionStorage so ContactViews component can pick it up
      sessionStorage.setItem(
        viewStateKey,
        JSON.stringify({
          viewId: Number(viewId),
          viewMode: "detail"
        })
      );
      
      // Navigate to View subtab
      window.location.href = `/#/main?tab=DataCampaigns&subtab=View`;
      return;
    }

    // Check if it's a segment (check segmentId first, not zohoViewId)
    if (campaign.segmentId || campaign.dataSource === "Segment") {
      // Add timestamp to force refresh
      window.location.href = `/#/main?tab=DataCampaigns&subtab=Segment&segmentId=${campaign.segmentId}&t=${Date.now()}`;
      return;
    }

    // Check if it's a data file (list) - this should be checked last
    if (campaign.zohoViewId || campaign.dataSource === "DataFile") {
      // Add timestamp to force refresh
      window.location.href = `/#/main?tab=DataCampaigns&subtab=List&dataFileId=${campaign.zohoViewId}&t=${Date.now()}`;
      return;
    }
  };

  const resetCampaignForm = () => {
    setSelectedCampaign(null);
    setCampaignForm({
      campaignName: "",
      promptId: "",
      zohoViewId: "",
      segmentId: "",
      description: "",
      templateId: "",
    });
    setSelectedPrompt(null);
  };

  const openCreateCampaignPanel = () => {
    fetchViews();
    dispatch(openPanel("campaign-create"));
    resetCampaignForm();
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
              ...detail,
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
      setDataFiles(data.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())));
    } catch (err) {
      console.error("Error fetching data files:", err);
    }
  };

  const fetchSegments = async () => {
    if (!effectiveUserId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/Crm/get-segments-by-client?clientId=${effectiveUserId}`);
      const data: Segment[] = await res.json();
      setSegments(data.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())));
    } catch (err) {
      console.error("Error fetching segments:", err);
    }
  };

  const fetchViews = async () => {
    if (!effectiveUserId) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/Crm/views-by-client?clientId=${effectiveUserId}`
      );
      const data: ViewOption[] = await res.json();
      setViews(
        data.sort((a, b) =>
          a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        )
      );
    } catch (err) {
      console.error("Error fetching views:", err);
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
      const templates = data.templates || [];
      setCampaignBlueprints(templates.sort((a: CampaignBlueprint, b: CampaignBlueprint) => 
        a.templateName.toLowerCase().localeCompare(b.templateName.toLowerCase())
      ));
    } catch (err) {
      console.error("Error fetching campaign blueprints:", err);
    }
  };

  useEffect(() => {
    if (effectiveUserId) {
      fetchCampaigns();
      fetchDataFiles();
      fetchSegments();
      fetchViews();
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

  const handleDataSourceChange = (
    type: "datafile" | "segment" | "view",
    value: string
  ) => {
    setCampaignForm((prev) => ({
      ...prev,
      zohoViewId:
        type === "datafile" ? value : type === "view" ? `view_${value}` : "",
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

    //  Load blueprint data for the selected campaign
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


  //  Helper: Save campaign blueprint to sessionStorage and context
  const saveCampaignBlueprint = (blueprintData: any) => {
    if (!blueprintData) return;

    const promptPayload = {
      id: blueprintData.id || "campaign-blueprint",
      name: blueprintData.templateName || "Campaign Blueprint",
      text: blueprintData.campaignBlueprint || "",
      model: blueprintData.selectedModel || "gpt-5",
    };

    //  Store in sessionStorage for MainPage.tsx
    sessionStorage.setItem("selectedPrompt", JSON.stringify(promptPayload));
    sessionStorage.setItem("selectedCampaignId", blueprintData.id);

    //  Optional: update context/local state
    setSelectedPrompt(promptPayload);
  };


  const createCampaign = async () => {
    if (!campaignForm.campaignName || !effectiveUserId) {
     // appModal.showError("Please fill all required fields.");
       setToastMessage("Please fill all required fields.");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 6000);
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
      if (!res.ok) throw new Error(resBody.message || JSON.stringify(resBody));

      //  Store the blueprint (prompt) returned by backend
      if (resBody.campaignBlueprint) {
        saveCampaignBlueprint({
          id: resBody.templateId,
          templateName: campaignBlueprints.find((bp) => bp.id === resBody.templateId)?.templateName,
          campaignBlueprint: resBody.campaignBlueprint,
          selectedModel: "gpt-5",
        });
      }

      // appModal.showSuccess("Campaign created successfully");

      setToastMessage("The Campaign has been created");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 6000);

      //setShowCreateCampaignModal(false);
      dispatch(closePanel());
      fetchCampaigns();
      triggerRefresh(); // Notify other components to refresh their campaign data
    } catch (err: any) {
      console.error(err);
     // appModal.showError(err.message || "Failed to create campaign");
      setToastMessage("Failed to create campaign");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 6000);
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
      setToastMessage("Campaign updated successfully");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 6000);
      //setShowCreateCampaignModal(false);
      dispatch(closePanel());

      fetchCampaigns();
      triggerRefresh(); // Notify other components to refresh their campaign data
    } catch (err) {
      console.error(err);
     // appModal.showError("Failed to update campaign");
      setToastMessage("Failed to update campaign");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 6000);
    }
  };

  const deleteCampaign = async (campaign: Campaign) => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/deletecampaign/${campaign.id}`, { method: "POST" });
      // appModal.showSuccess("Campaign deleted successfully");
      setToastMessage("Campaign deleted successfully");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 6000);
      fetchCampaigns();
      triggerRefresh(); // Notify other components to refresh their campaign data
    } catch (err) {
      console.error(err);
     // appModal.showError("Failed to delete campaign");
      setToastMessage("Failed to delete campaign");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 6000);
    }
  };
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/campaigns/client/${effectiveUserId}`);
        const data = await response.json();
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

        case "createdAt":
          const dateA = new Date(getCampaignCreatedAt(a)).getTime();
          const dateB = new Date(getCampaignCreatedAt(b)).getTime();
          const safeDateA = Number.isNaN(dateA) ? 0 : dateA;
          const safeDateB = Number.isNaN(dateB) ? 0 : dateB;
          return listSortDirection === "asc"
            ? safeDateA - safeDateB
            : safeDateB - safeDateA;

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
  const isCreateDisabled =
    isLoading ||
    !campaignForm.campaignName ||
    !campaignForm.templateId ||
    (!campaignForm.zohoViewId && !campaignForm.segmentId);


  const renderSortIcon = (columnKey: string) => {
    if (columnKey !== listSortKey) return <ArrowUpDown className="h-3 w-3 text-[#cdd2da]" />;
    return listSortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3 text-[#3f9f42]" />
    ) : (
      <ArrowDown className="h-3 w-3 text-[#3f9f42]" />
    );
  };
  const renderCampaignActions = (campaign: Campaign) => (
    <>
      <button
        type="button"
        onClick={() =>
          setCampaignActionsAnchor(
            campaignActionsAnchor === campaign.id ? null : campaign.id
          )
        }
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#6b7280] hover:bg-[#eef0f3]"
        aria-label={"Open actions for " + campaign.campaignName}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {campaignActionsAnchor === campaign.id && (
        <div className="absolute right-2 top-10 z-30 w-[140px] rounded-lg border border-[#e8eaee] bg-white py-1.5 text-left shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
          <button type="button" onClick={() => { handleCampaignSelect(campaign.id.toString()); dispatch(openPanel("campaign-create")); setCampaignActionsAnchor(null); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-[#374151] hover:bg-[#f5f6f8]">
            <Pencil className="h-4 w-4 text-[#3f9f42]" /> Edit
          </button>
          <div className="my-1 h-px bg-[#eef0f3]" />
          <button type="button" onClick={() => { deleteCampaign(campaign); setCampaignActionsAnchor(null); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-[#b91c1c] hover:bg-[#fef2f2]">
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      )}
    </>
  );

  const pageStart =
    filteredCampaigns.length === 0
      ? 0
      : pageSize === "All"
      ? 1
      : (currentPage - 1) * pageSize + 1;
  const pageEnd =
    pageSize === "All"
      ? filteredCampaigns.length
      : Math.min(currentPage * pageSize, filteredCampaigns.length);

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages || 1));
  };

  const closeCampaignVideo = () => {
    campaignVideoRef.current?.pause();
    setShowCampaignVideo(false);
  };

  return (
    <div className="bp-list-wrap campaign-bp-page">
        {isLoading ? (
          <div className="bp-list-body">
            <div className="bp-rows__msg">Loading campaigns...</div>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bp-empty-body">
            <div className="bp-empty-hero">
              <div className="bp-empty-hero__bg" />
              <div className="bp-empty-hero__content">
                <div className="bp-empty-hero__copy">
                  <span className="bp-start-pill">Start here</span>
                  <h2 className="bp-empty-headline">Create your first campaign.</h2>
                  <p className="bp-empty-body-text">
                    Choose a blueprint, connect a contact source, and PitchKraft will be ready to kraft personalized outreach.
                  </p>
                  <div className="bp-empty-actions">
                    <button className="bp-btn-primary" onClick={openCreateCampaignPanel}>
                      <Plus className="h-4 w-4" />
                      Create your first campaign
                    </button>
                    <button
                      className="bp-btn-secondary"
                      type="button"
                      onClick={() => setShowCampaignVideo(true)}
                    >
                      <FontAwesomeIcon icon={faPlay} style={{ color: "#3f9f42" }} />
                      Watch demo
                    </button>
                  </div>
                  <div className="bp-empty-meta">
                    Takes about 4 minutes. You can edit the campaign later.
                  </div>
                </div>
                <div className="bp-empty-hero__art">
                  <img
                    src={campaignIllustration}
                    alt="Campaign illustration"
                    style={{ width: 500, height: "auto", maxWidth: "100%" }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              </div>
            </div>

          </div>
        ) : (
          <>
            <div className="bp-page-header">
              <div className="bp-page-header__inner">
                <div>
                  <h1 className="bp-page-title">
                    Campaigns
                    <span className="bp-count-pill">{campaigns.length}</span>
                  </h1>
                </div>
              </div>
            </div>

            <div className="bp-list-body">
              <BpBanner
                title="Create  and view your campaigns"
                subtitle={
                  <>
                    You have created <strong>{campaigns.length}</strong> campaign{campaigns.length !== 1 ? "s" : ""}.
                    Keep refining sources and blueprints to improve every outbound run.
                  </>
                }
                primaryLabel="Create campaign"
                primaryIcon={<Plus className="h-4 w-4" />}
                onPrimaryClick={openCreateCampaignPanel}
                secondaryLabel="Explore best practices"
                secondaryIcon={<FontAwesomeIcon icon={faArrowUpRightFromSquare} />}
                secondaryHref="https://www.pitchkraft.ai/campaigns/"
                imageSrc={campaignIllustration2}
                imageAlt="Campaign illustration"
              />
            </div>

            <div className="bp-list-body">
              <div className="bp-toolbar">
                <div className="bp-toolbar__left">
                  <div className="bp-search">
                    <Search className="bp-search__icon h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search by campaign name"
                      value={campaignSearch}
                      onChange={(e) => {
                        setCampaignSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </div>
                  <button className="bp-btn-tertiary" onClick={() => handleListSort("createdAt")}>
                    {listSortKey === "createdAt" && listSortDirection === "asc"
                      ? "Oldest first"
                      : "Newest first"}
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>

                <div className="bp-pagination">
                  <span>
                    Showing <strong>{paginatedCampaigns.length}</strong> of {filteredCampaigns.length}
                  </span>
                  <div className="bp-pagination__nav">
                    <button onClick={() => goToPage(1)} disabled={currentPage === 1}>{"<<"}</button>
                    <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>{"<"}</button>
                    <span className="bp-pagination__page">{currentPage} / {totalPages || 1}</span>
                    <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>{">"}</button>
                    <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}>{">>"}</button>
                  </div>
                </div>
              </div>

              <div className="bp-rows">
                <div
                  className="bp-rows__head"
                  style={{ gridTemplateColumns: "14px 1.2fr 1fr 1fr 1.2fr 130px 110px" }}
                >
                  <div />
                  <div className="bp-th" onClick={() => handleListSort("campaignName")}>
                    Campaign {renderSortIcon("campaignName")}
                  </div>
                  <div className="bp-th" onClick={() => handleListSort("templateName")}>
                    Blueprint {renderSortIcon("templateName")}
                  </div>
                  <div>Data source</div>
                  <div className="bp-th" onClick={() => handleListSort("description")}>
                    Description {renderSortIcon("description")}
                  </div>
                  <div className="bp-th" onClick={() => handleListSort("createdAt")}>
                    Creation date {renderSortIcon("createdAt")}
                  </div>
                  <div />
                </div>

                {paginatedCampaigns.length === 0 ? (
                  <div className="bp-rows__msg">No campaign found.</div>
                ) : (
                  paginatedCampaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="bp-row"
                      style={{ gridTemplateColumns: "14px 1.2fr 1fr 1fr 1.2fr 130px 110px" }}
                    >
                      <div className="bp-row__rail" />
                      <div className="bp-row__name">
                        <button
                          type="button"
                          className="bp-row__link"
                          onClick={() => {
                            handleCampaignSelect(campaign.id.toString());
                            dispatch(openPanel("campaign-create"));
                          }}
                        >
                          {campaign.campaignName}
                        </button>
                      </div>
                      <div className="bp-row__id">{getBlueprintName(campaign)}</div>
                      <div className="bp-row__id" title={getDataSourceName(campaign)}>
                        {(campaign.zohoViewId || campaign.segmentId) && getDataSourceName(campaign) !== "-" ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDataSourceClick(campaign);
                            }}
                            className="bp-row__link"
                            style={{ textDecoration: "underline", color: "#3f9f42" }}
                          >
                            {getDataSourceName(campaign)}
                          </button>
                        ) : (
                          <span>{getDataSourceName(campaign)}</span>
                        )}
                      </div>
                      <div className="bp-row__id">{campaign.description || "-"}</div>
                      <div className="bp-row__date">{formatDate(getCampaignCreatedAt(campaign))}</div>
                      <div className="bp-row__actions">{renderCampaignActions(campaign)}</div>
                    </div>
                  ))
                )}
              </div>

              <div className="bp-tip">
                Showing {pageStart} to {pageEnd} of {filteredCampaigns.length} campaigns.
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const value = e.target.value === "All" ? "All" : Number(e.target.value);
                    setPageSize(value);
                    setCurrentPage(1);
                  }}
                  style={{
                    marginLeft: 12,
                    border: "1px solid #dadde2",
                    borderRadius: 8,
                    padding: "6px 10px",
                    background: "#fff",
                    color: "#374151",
                  }}
                >
                  {[10, 25, 50].map((size) => (
                    <option key={size} value={size}>{size} / page</option>
                  ))}
                  <option value="All">All</option>
                </select>
              </div>
            </div>
          </>
        )}
      {showCampaignVideo && (
        <div
          className="bp-video-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeCampaignVideo();
            }
          }}
        >
          <div className="bp-video-modal">
            <button
              type="button"
              className="bp-video-close"
              onClick={closeCampaignVideo}
              aria-label="Close video"
            >
              x
            </button>
            <video
              ref={campaignVideoRef}
              src={CAMPAIGN_VIDEO}
              controls
              autoPlay
              className="bp-video-player"
            />
          </div>
        </div>
      )}
      <ToastContainer />
      <style>{`
        .campaign-bp-page {
          margin: 0;
          width: 100%;
          background: var(--bp-bg);
        }
        .campaign-bp-page .bp-page-header {
          margin: 0;
          border-radius: 0;
          box-shadow: none;
        }
        .campaign-bp-page .bp-list-body {
          max-width: none;
        }
        .campaign-bp-page .bp-row,
        .campaign-bp-page .bp-rows__head {
          grid-template-columns: 14px 1.2fr 1fr 1fr 1.2fr 130px 110px;
        }
        .campaign-bp-page .bp-row__link {
          border: 0;
          background: transparent;
          padding: 0;
          text-align: left;
          font-family: inherit;
        }
        .campaign-bp-page .bp-row__actions {
          overflow: visible;
        }
        @media (max-width: 768px) {
          .campaign-bp-page .bp-row {
            grid-template-columns: 6px 1fr 28px !important;
          }
        }
        @keyframes toastProgress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      <CommonSidePanel
        isOpen={showCreateCampaignModal}
        onClose={() => {
          dispatch(closePanel());
          resetCampaignForm();
        }}
        title={selectedCampaign ? "Edit campaign" : "Create campaign"}
        footerContent={
          <>
            <button
              type="button"
              onClick={() => {
                dispatch(closePanel());
                resetCampaignForm();
              }}
              className="h-10 rounded-lg border border-[#dadde2] px-5 text-[13.5px] font-semibold text-[#374151] hover:bg-[#f5f6f8]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={selectedCampaign ? updateCampaign : createCampaign}
              disabled={isCreateDisabled}
              className={`inline-flex h-10 items-center gap-2 rounded-lg px-5 text-[13.5px] font-semibold shadow-[0_4px_12px_rgba(63,159,66,0.18)] ${
                isCreateDisabled
                  ? "cursor-not-allowed bg-[#eef0f3] text-[#9ca3af] shadow-none"
                  : "bg-[#3f9f42] text-white hover:bg-[#368a39]"
              }`}
            >
              {isLoading
                ? selectedCampaign
                  ? "Updating..."
                  : "Creating..."
                : selectedCampaign
                  ? "Save changes"
                  : "Create campaign"}
              {!selectedCampaign && !isLoading && <ChevronRight className="h-4 w-4" />}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#374151]">Campaign name <span className="text-[#dc2626]">*</span></label>
            <input type="text" name="campaignName" value={campaignForm.campaignName} onChange={handleCampaignFormChange} placeholder="Enter campaign name" className="h-10 w-full rounded-lg border border-[#dadde2] px-3 text-[13.5px] outline-none placeholder:text-[#9ca3af] focus:border-[#3f9f42] focus:ring-2 focus:ring-[#3f9f42]/15" />
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#374151]">Blueprint <span className="text-[#dc2626]">*</span></label>
            <div className="relative">
              <select value={campaignForm.templateId} onChange={(e) => setCampaignForm((prev) => ({ ...prev, templateId: e.target.value }))} className="h-10 w-full appearance-none rounded-lg border border-[#dadde2] bg-white pl-3 pr-10 text-[13.5px] text-[#374151] outline-none focus:border-[#3f9f42] focus:ring-2 focus:ring-[#3f9f42]/15">
                <option value="">Select blueprint</option>
                {[...campaignBlueprints].sort((a, b) => a.templateName.toLowerCase().localeCompare(b.templateName.toLowerCase())).map((bp) => (<option key={bp.id} value={bp.id}>{bp.templateName}</option>))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
            </div>
            <p className="mt-1.5 text-[11.5px] text-[#6b7280]">The blueprint defines how each email is personalized.</p>
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#374151]">List / segment / view <span className="text-[#dc2626]">*</span></label>
            <div className="relative">
              <select
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.startsWith("list-")) {
                    handleDataSourceChange("datafile", value.replace("list-", ""));
                  } else if (value.startsWith("segment-")) {
                    handleDataSourceChange("segment", value.replace("segment-", ""));
                  } else if (value.startsWith("view-")) {
                    handleDataSourceChange("view", value.replace("view-", ""));
                  } else {
                    setCampaignForm((prev) => ({ ...prev, zohoViewId: "", segmentId: "" }));
                  }
                }}
                value={
                  campaignForm.segmentId
                    ? "segment-" + campaignForm.segmentId
                    : campaignForm.zohoViewId?.startsWith("view_")
                    ? "view-" + campaignForm.zohoViewId.replace("view_", "")
                    : campaignForm.zohoViewId
                    ? "list-" + campaignForm.zohoViewId
                    : ""
                }
                disabled={isLoading || (dataFiles.length === 0 && segments.length === 0 && views.length === 0)}
                className="h-10 w-full appearance-none rounded-lg border border-[#dadde2] bg-white pl-3 pr-10 text-[13.5px] text-[#374151] outline-none focus:border-[#3f9f42] focus:ring-2 focus:ring-[#3f9f42]/15 disabled:bg-[#f5f6f8] disabled:text-[#9ca3af]"
              >
                <option value="">Select list, segment, or view</option>
                {dataFiles.length > 0 && (<optgroup label="Lists">{dataFiles.map((file) => (<option key={"list-" + file.id} value={"list-" + file.id}>{file.name}</option>))}</optgroup>)}
                {segments.length > 0 && (<optgroup label="Segments">{segments.map((segment) => (<option key={"segment-" + segment.id} value={"segment-" + segment.id}>{segment.name}</option>))}</optgroup>)}
                {views.length > 0 && (<optgroup label="Views">{views.map((view) => (<option key={"view-" + view.id} value={"view-" + view.id}>{view.name}</option>))}</optgroup>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#374151]">Description</label>
            <textarea name="description" value={campaignForm.description} onChange={handleCampaignFormChange} placeholder="What is this campaign about?" className="min-h-[96px] w-full resize-y rounded-lg border border-[#dadde2] px-3 py-2.5 text-[13.5px] outline-none placeholder:text-[#9ca3af] focus:border-[#3f9f42] focus:ring-2 focus:ring-[#3f9f42]/15" rows={4} />
            <div className="mt-1 flex items-center justify-between"><p className="text-[11.5px] text-[#6b7280]">Optional. Shown in the campaigns list.</p><span className="text-[11.5px] text-[#9ca3af]">{campaignForm.description.length} / 240</span></div>
          </div>

          <div className="mt-2 rounded-xl border border-[#eef0f3] bg-[#fafbfc] p-3.5">
            <div className="text-[11.5px] font-semibold uppercase tracking-wide text-[#6b7280]">Summary</div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div className="min-w-0 rounded-lg border border-[#eef0f3] bg-white p-2.5"><div className="flex items-center gap-1.5 text-[11px] text-[#6b7280]"><Users className="h-3.5 w-3.5 text-[#3f9f42]" />Source</div><div className="mt-1 truncate text-[13px] font-semibold text-[#111827]">{campaignForm.zohoViewId || campaignForm.segmentId ? "Selected" : "-"}</div></div>
              <div className="min-w-0 rounded-lg border border-[#eef0f3] bg-white p-2.5"><div className="flex items-center gap-1.5 text-[11px] text-[#6b7280]"><FileText className="h-3.5 w-3.5 text-[#3f9f42]" />Blueprint</div><div className="mt-1 truncate text-[13px] font-semibold text-[#111827]">{campaignForm.templateId ? "Selected" : "-"}</div></div>
              <div className="min-w-0 rounded-lg border border-[#eef0f3] bg-white p-2.5"><div className="flex items-center gap-1.5 text-[11px] text-[#6b7280]"><Rocket className="h-3.5 w-3.5 text-[#3f9f42]" />Status</div><div className="mt-1 truncate text-[13px] font-semibold text-[#111827]">{selectedCampaign ? "Active" : "Draft"}</div></div>
            </div>
          </div>
        </div>
      </CommonSidePanel>
      {showSuccessToast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#E6F4EF",        // soft pastel green
            color: "#2F3A34",              // dark grey text (not black)
            padding: "14px 22px",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            gap: 16,
            boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
            zIndex: 99999,
            minWidth: 420,
            fontSize: 16,
            fontWeight: 500,
            overflow: "hidden",
          }}
        >
          {/* Timer Bar */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: 4,
              width: "100%",
              background: "#1F9D74",  // darker green line like image
              animation: "toastProgress 3s linear forwards",
            }}
          />

          {/* Check Circle */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#1F9D74",   // same green as timer
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            OK
          </div>

          {/* Message */}
          <div style={{ flex: 1 }}>
            {toastMessage}
          </div>

          {/* Close Button */}
          <div
            onClick={() => setShowSuccessToast(false)}
            style={{
              cursor: "pointer",
              fontSize: 30,
              fontWeight: 500,
              color: "#6B7280",   // soft gray like screenshot
              lineHeight: 1,
            }}
          >
            x
          </div>
        </div>
      )}
      {showErrorToast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#FDECEC",        // pastel red background
            color: "#2F3A34",              // dark soft red text
            padding: "14px 22px",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            gap: 16,
            boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
            zIndex: 99999,
            minWidth: 420,
            fontSize: 16,
            fontWeight: 500,
            overflow: "hidden",
          }}
        >
          {/* Timer Bar */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: 4,
              width: "100%",
              background: "#DC2626",   // strong red timer
              animation: "toastProgress 3s linear forwards",
            }}
          />

          {/* Error Circle */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#DC2626",   // same red as timer
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            !
          </div>

          {/* Message */}
          <div style={{ flex: 1 }}>
            {toastMessage}
          </div>

          {/* Close Button */}
          <div
            onClick={() => setShowErrorToast(false)}
            style={{
              cursor: "pointer",
              fontSize: 30,
              fontWeight: 500,
              color: "#9CA3AF",  // same gray as success close
              lineHeight: 1,
            }}
          >
            x
          </div>
        </div>
      )}

      <AppModal isOpen={appModal.isOpen} onClose={appModal.hideModal} {...appModal.config} />
    </div>
  );
};

export default CampaignManagement;
