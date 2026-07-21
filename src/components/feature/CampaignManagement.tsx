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
import campaignIllustration from "../../assets/images/Campgains_old_user.png";
import campaignIllustration2 from "../../assets/images/Campgains_old_user.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import PaginationControls from "./PaginationControls";
import { defaultButtonStyle, lessPriorityButtonStyle } from "../../styles/buttonStyles";
import {
  FileText,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Check,
  Send,
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

const AnalyticsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%" aria-hidden="true">
    <g fill="none" stroke="#3f9f42" strokeWidth="36" strokeLinecap="round" strokeLinejoin="round">
      <path d="M 70,225 L 195,100 L 330,195 L 442,50" />
      <rect x="54" y="375" width="58" height="72" rx="20" />
      <rect x="168" y="255" width="62" height="192" rx="22" />
      <rect x="284" y="300" width="60" height="147" rx="22" />
      <rect x="400" y="155" width="60" height="292" rx="22" />
    </g>
  </svg>
);

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

  const openTrackingDashboard = (campaign: Campaign) => {
    if (!campaign.id || !effectiveUserId) return;

    const redirectKey = `mail_dashboard_campaign_redirect_${effectiveUserId}`;
    sessionStorage.setItem(
      redirectKey,
      JSON.stringify({
        campaignId: campaign.id.toString(),
        dashboardTab: "Overview",
        nonce: Date.now(),
      })
    );
    sessionStorage.setItem(
      "mail_dashboard_campaign_redirect",
      JSON.stringify({
        campaignId: campaign.id.toString(),
        dashboardTab: "Overview",
        nonce: Date.now(),
      })
    );

    window.location.href = `/#/main?tab=Mail&mailSubTab=Dashboard&campaignId=${campaign.id}&t=${Date.now()}`;
  };

  const handleBlueprintClick = async (campaign: Campaign) => {
    if (!campaign.templateId) return;

    const templateId = campaign.templateId.toString();
    const fallbackName =
      getBlueprintName(campaign) !== "-"
        ? getBlueprintName(campaign)
        : campaign.campaignName;

    sessionStorage.setItem("editTemplateId", templateId);
    sessionStorage.setItem("editTemplateMode", "true");
    sessionStorage.setItem("newCampaignId", templateId);
    sessionStorage.setItem("newCampaignName", fallbackName);
    sessionStorage.setItem("initialExampleEmail", "");
    window.dispatchEvent(new CustomEvent("showBlueprintLoader"));
    window.dispatchEvent(
      new CustomEvent("switchToBlueprint", {
        detail: { templateId: campaign.templateId },
      })
    );

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/CampaignPrompt/campaign/${campaign.templateId}`
      );

      if (response.ok) {
        const fullTemplate = await response.json();
        const example = fullTemplate?.placeholderValues?.example_output_email || "";

        if (fullTemplate.placeholderValues) {
          sessionStorage.setItem(
            "campaign_placeholder_values",
            JSON.stringify(fullTemplate.placeholderValues)
          );
        }

        sessionStorage.setItem("newCampaignName", fullTemplate.templateName || campaign.campaignName);
        sessionStorage.setItem("initialExampleEmail", example);

        if (fullTemplate.templateDefinitionId) {
          sessionStorage.setItem(
            "selectedTemplateDefinitionId",
            fullTemplate.templateDefinitionId.toString()
          );
        }
      } else {
        sessionStorage.setItem("newCampaignName", getBlueprintName(campaign) || campaign.campaignName);
        sessionStorage.setItem("initialExampleEmail", "");
      }
    } catch (error) {
      console.error("Error loading blueprint:", error);
      sessionStorage.setItem("newCampaignName", getBlueprintName(campaign) || campaign.campaignName);
      sessionStorage.setItem("initialExampleEmail", "");
    }
  };

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

  // Open the campaign in the Kraft emails (Output) page. MainPage reads
  // "kraftCampaignId" once the Output tab is active and selects that campaign.
  const handleOpenInKraft = (campaign: Campaign) => {
    sessionStorage.setItem("kraftCampaignId", campaign.id.toString());
    window.location.href = `/#/main?tab=Output&t=${Date.now()}`;
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
          viewMode: "detail",
          source: "campaign-data-source",
          nonce: Date.now()
        })
      );
      
      // Navigate to View subtab with timestamp to force refresh
      window.location.href = `/#/main?tab=DataCampaigns&subtab=View&t=${Date.now()}`;
      return;
    }

    // Check if it's a segment (check segmentId first, not zohoViewId)
    if (campaign.segmentId || campaign.dataSource === "Segment") {
      // Navigate with segmentId and timestamp to force component remount
      const url = new URL(window.location.href.split('#')[0]);
      window.location.href = `/#/main?tab=DataCampaigns&subtab=Segment&segmentId=${campaign.segmentId}&t=${Date.now()}`;
      // Force page reload to clear any stale state
      setTimeout(() => window.location.reload(), 50);
      return;
    }

    // Check if it's a data file (list) - this should be checked last
    if (campaign.zohoViewId || campaign.dataSource === "DataFile") {
      // Navigate with dataFileId and timestamp to force refresh
      window.location.href = `/#/main?tab=DataCampaigns&subtab=List&dataFileId=${campaign.zohoViewId}&t=${Date.now()}`;
      // Force page reload to clear any stale state
      setTimeout(() => window.location.reload(), 50);
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

  // Auto-open the edit panel when navigated here via the "Edit campaign" icon
  // on the Kraft emails page (which sets "editCampaignId" in sessionStorage).
  // Handles both a fresh mount (effect below) and an already-mounted, preserved
  // tab panel (the "openCampaignEdit" window event).
  useEffect(() => {
    const openEditFromRequest = () => {
      const editId = sessionStorage.getItem("editCampaignId");
      if (!editId || campaigns.length === 0) return;
      if (!campaigns.some((c) => c.id.toString() === editId)) return;
      sessionStorage.removeItem("editCampaignId");
      handleCampaignSelect(editId);
      dispatch(openPanel("campaign-create"));
    };

    openEditFromRequest();
    window.addEventListener("openCampaignEdit", openEditFromRequest);
    return () => window.removeEventListener("openCampaignEdit", openEditFromRequest);
  }, [campaigns]);

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
  const [pageSize, setPageSize] = useState<number | "All">(30);
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

        case "dataSource":
          return compareStrings(
            getDataSourceName(a),
            getDataSourceName(b),
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

  const closeCampaignVideo = () => {
    campaignVideoRef.current?.pause();
    setShowCampaignVideo(false);
  };

  // Prerequisites for creating a campaign: at least one contact source and one blueprint.
  const campaignSteps = [
    {
      done: dataFiles.length > 0 || segments.length > 0 || views.length > 0,
      icon: <Users className="h-4 w-4" />,
      title: "Add at least one contact",
      subtitle: "Add contacts to build your audience.",
      addLabel: "Add contacts",
      onAdd: () => {
        window.location.href = `/#/main?tab=DataCampaigns&subtab=List`;
      },
    },
    {
      done: campaignBlueprints.length > 0,
      icon: <FileText className="h-4 w-4" />,
      title: "Add at least one blueprint",
      subtitle: "Create a blueprint to use in your campaign.",
      addLabel: "Add blueprint",
      onAdd: () => {
        window.location.href = `/#/main?tab=TestTemplate`;
      },
    },
  ];
  const allStepsCompleted = campaignSteps.every((step) => step.done);

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
                  {!allStepsCompleted && (
                    <div className="bp-setup-checklist">
                      {campaignSteps.map((step) => (
                        <div key={step.addLabel} className="bp-setup-card">
                          <span className="bp-setup-card__icon">{step.icon}</span>
                          <div className="bp-setup-card__text">
                            <div className="bp-setup-card__title">{step.title}</div>
                            <div className="bp-setup-card__subtitle">{step.subtitle}</div>
                          </div>
                          {step.done ? (
                            <span className="bp-setup-badge bp-setup-badge--done">
                              <Check className="h-3.5 w-3.5" />
                              Completed
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="bp-btn-default bp-setup-card__btn"
                              onClick={step.onAdd}
                            >
                              <Plus className="h-4 w-4" />
                              {step.addLabel}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="bp-empty-actions">
                    {allStepsCompleted && (
                      <button
                        className="btn-default"
                        onClick={openCreateCampaignPanel}
                        style={{ height: 48, padding: "0 20px", borderRadius: 12, fontSize: 14.5 }}
                      >
                        <Plus className="h-4 w-4" />
                        Create your first campaign
                      </button>
                    )}
                    <a
                      className="bp-btn-secondary"
                      href="https://youtu.be/A9v62GRIXfs?si=H0OCXGEgFYSNK3li"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FontAwesomeIcon icon={faPlay} style={{ color: "#3f9f42" }} />
                      Watch demo
                    </a>
                  </div>
                  <div className="bp-empty-meta">
                    Takes seconds. You can edit the campaign anytime.
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
                    Create more campaigns by linking a contact list or view and a blueprint.
                  </>
                }
                primaryLabel="Create campaign"
                primaryIcon={<Plus className="h-4 w-4" />}
                primaryClassName="bp-btn-banner-default"
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

                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalRecords={filteredCampaigns.length}
                  pageSize={pageSize}
                  setCurrentPage={setCurrentPage}
                  setPageSize={(s) => {
                    setPageSize(s);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="bp-rows">
                <div
                  className="bp-rows__head"
                  style={{ gridTemplateColumns: "14px minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.2fr) 145px 130px 90px 110px" }}
                >
                  <div />
                  <div className="bp-th" onClick={() => handleListSort("campaignName")}>
                    Campaign {renderSortIcon("campaignName")}
                  </div>
                  <div className="bp-th" onClick={() => handleListSort("templateName")}>
                    Blueprint {renderSortIcon("templateName")}
                  </div>
                  <div className="bp-th" onClick={() => handleListSort("dataSource")}>
                    Data source {renderSortIcon("dataSource")}
                  </div>
                  <div className="bp-th" onClick={() => handleListSort("description")}>
                    Description {renderSortIcon("description")}
                  </div>
                  <div className="bp-th" onClick={() => handleListSort("createdAt")}>
                    Creation date {renderSortIcon("createdAt")}
                  </div>
                  <div className="campaign-analytics-cell">Analytics</div>
                  <div className="campaign-analytics-cell">Kraft</div>
                  <div />
                </div>

                {paginatedCampaigns.length === 0 ? (
                  <div className="bp-rows__msg">No campaign found.</div>
                ) : (
                  paginatedCampaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="bp-row"
                      style={{ gridTemplateColumns: "14px minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.2fr) 145px 130px 90px 110px" }}
                    >
                      <div className="bp-row__rail" />
                      <div className="bp-row__name" title={campaign.campaignName}>
                        <button
                          type="button"
                          className="bp-row__link"
                          title={campaign.campaignName}
                          onClick={() => {
                            handleCampaignSelect(campaign.id.toString());
                            dispatch(openPanel("campaign-create"));
                          }}
                        >
                          {campaign.campaignName}
                        </button>
                      </div>
                      <div className="bp-row__id" title={getBlueprintName(campaign)}>
                        {campaign.templateId ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBlueprintClick(campaign);
                            }}
                            className="bp-row__link"
                            style={{ textDecoration: "underline", color: "#3f9f42" }}
                          >
                            {getBlueprintName(campaign) !== "-"
                              ? getBlueprintName(campaign)
                              : `Blueprint #${campaign.templateId}`}
                          </button>
                        ) : (
                          <span>{getBlueprintName(campaign)}</span>
                        )}
                      </div>
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
                      <div className="bp-row__id campaign-description-cell">{campaign.description || "-"}</div>
                      <div className="bp-row__date">{formatDate(getCampaignCreatedAt(campaign))}</div>
                      <div className="bp-row__id campaign-analytics-cell">
                        <button
                          type="button"
                          aria-label={`Open analytics for ${campaign.campaignName}`}
                          title="Open analytics"
                          onClick={(e) => {
                            e.stopPropagation();
                            openTrackingDashboard(campaign);
                          }}
                          className="campaign-analytics-button"
                        >
                          <AnalyticsIcon />
                        </button>
                      </div>
                      <div className="bp-row__id campaign-analytics-cell">
                        <button
                          type="button"
                          aria-label={`Open ${campaign.campaignName} in Kraft emails`}
                          title="Open in Kraft emails"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenInKraft(campaign);
                          }}
                          className="campaign-analytics-button"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="bp-row__actions">{renderCampaignActions(campaign)}</div>
                    </div>
                  ))
                )}
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
          grid-template-columns: 14px minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.2fr) 145px 130px 110px;
        }
        .campaign-bp-page .bp-row > *,
        .campaign-bp-page .bp-rows__head > * {
          min-width: 0;
        }
        .campaign-bp-page .bp-row__link {
          border: 0;
          background: transparent;
          padding: 0;
          text-align: left;
          font-family: inherit;
          max-width: 100%;
          min-width: 0;
        }
        .campaign-bp-page .bp-row__name,
        .campaign-bp-page .bp-row__id,
        .campaign-bp-page .bp-row__date {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .campaign-bp-page .bp-row__id .bp-row__link {
          display: inline-block;
          vertical-align: middle;
        }
        .campaign-bp-page .campaign-description-cell {
          white-space: normal;
          overflow-wrap: anywhere;
          line-height: 1.45;
        }
        .campaign-bp-page .bp-row__actions {
          overflow: visible;
        }
        .campaign-bp-page .campaign-analytics-cell {
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .campaign-bp-page .campaign-analytics-button {
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #d8ebda;
          border-radius: 8px;
          background: #f7fbf8;
          padding: 6px;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
        }
        .campaign-bp-page .campaign-analytics-button:hover {
          background: #eef8ef;
          border-color: #3f9f42;
          transform: translateY(-1px);
        }
        .campaign-bp-page .campaign-analytics-button:focus-visible {
          outline: 2px solid rgba(63, 159, 66, 0.28);
          outline-offset: 2px;
        }
        .campaign-bp-page .bp-setup-checklist {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 24px;
          max-width: 620px;
        }
        .campaign-bp-page .bp-setup-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          border: 1px solid #eef0f3;
          border-radius: 12px;
          background: #fafbfc;
        }
        .campaign-bp-page .bp-setup-card__icon {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #e8f3e9;
          color: #3f9f42;
        }
        .campaign-bp-page .bp-setup-card__text {
          flex: 1;
          min-width: 0;
        }
        .campaign-bp-page .bp-setup-card__title {
          font-size: 14px;
          font-weight: 600;
          color: #0b1220;
        }
        .campaign-bp-page .bp-setup-card__subtitle {
          font-size: 12.5px;
          color: #6b7280;
          margin-top: 2px;
        }
        .campaign-bp-page .bp-setup-badge {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 12.5px;
          font-weight: 600;
        }
        .campaign-bp-page .bp-setup-badge--done {
          background: #e8f3e9;
          color: #2d7a30;
        }
        .campaign-bp-page .bp-setup-card__btn {
          flex-shrink: 0;
          height: auto;
          padding: 8px 14px;
          font-size: 12.5px;
          border-radius: 8px;
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
              style={lessPriorityButtonStyle}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={selectedCampaign ? updateCampaign : createCampaign}
              disabled={isCreateDisabled}
              style={{
                ...defaultButtonStyle,
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                ...(isCreateDisabled ? { opacity: 0.5, cursor: "not-allowed" } : {}),
              }}
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
            <p className="mt-0.5 text-[11.5px] text-[#6b7280]">The blueprint defines how each email is personalized.</p>
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#374151]">List / view / segment <span className="text-[#dc2626]">*</span></label>
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
            <p className="mt-0.5 text-[11.5px] text-[#6b7280]">Select the data you wish to contact in this campaign.</p>
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#374151]">Description</label>
            <textarea name="description" value={campaignForm.description} onChange={handleCampaignFormChange} placeholder="What is this campaign about?" className="min-h-[96px] w-full resize-y rounded-lg border border-[#dadde2] px-3 py-2.5 text-[13.5px] outline-none placeholder:text-[#9ca3af] focus:border-[#3f9f42] focus:ring-2 focus:ring-[#3f9f42]/15" rows={4} />
            <div className="mt-1 flex items-center justify-between"><p className="text-[11.5px] text-[#6b7280]">Optional. Shown in the campaigns list.</p><span className="text-[11.5px] text-[#9ca3af]">{campaignForm.description.length} / 240</span></div>
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
