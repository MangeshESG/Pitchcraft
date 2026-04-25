import React, { useState, useEffect, useCallback } from "react";
import { Tooltip as ReactTooltip, Tooltip } from "react-tooltip";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import API_BASE_URL from "../../../config";
import "./Template.css";
import { useCreditCheck } from "../../../hooks/useCreditCheck";
import { useAppModal } from "../../../hooks/useAppModal";
import EmailCampaignBuilder from "./EmailCampaignBuilder";
import PaginationControls from "../PaginationControls";
import duplicateIcon from "../../../assets/images/icons/duplicate.png";
import CreditCheckModal from "../../common/CreditCheckModal";
import deleteIcon from "../../../assets/images/deleteiconn.png";
import CommonSidePanel from "../../common/CommonSidePanel";
import {
  faAngleRight,
  faBars,
  faBullhorn,
  faDashboard,
 // faEdit,
  faEllipsisV,
  faEnvelope,
  faEnvelopeOpen,
  faFileAlt,
  faGear,
  faList,
  faRobot,
  faTrash ,
  faThumbtack, // Add this for Campaign Builder
  faThumbtackSlash,
  faPencil ,
  faPen

} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit,faTrashAlt,faCircleXmark ,faFileLines   } from "@fortawesome/free-regular-svg-icons";
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
const actionIconStyle = {
  width: 24,
  height: 24,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};
interface Prompt {
  id: number;
  name: string;
  text: string;
  userId?: number;
  createdAt?: string;
  template?: string;
  description?: string;
}

interface CampaignTemplate {
  id: number;
  clientId: string;
  templateName: string;
  aiInstructions: string;
  placeholderListInfo: string;
  masterBlueprintUnpopulated: string;
  placeholderListWithValue: string;
  campaignBlueprint: string;
  placeholderValues?: Record<string, string>;
  selectedModel: string;
  createdAt: string;
  updatedAt?: string;
  hasConversation?: boolean;
}

// ✅ NEW: Template Definition interface
interface TemplateDefinition {
  id: number;
  templateName: string;
  aiInstructions: string;
  aiInstructionsForEdit: string;
  placeholderList: string;
  masterBlueprintUnpopulated: string;
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
  usageCount: number;
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
  const [campaignTemplates, setCampaignTemplates] = useState<
    CampaignTemplate[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCampaignTemplate, setSelectedCampaignTemplate] =
    useState<CampaignTemplate | null>(null);
  const [templateActionsAnchor, setTemplateActionsAnchor] = useState<
    string | null
  >(null);

  // Modal states
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showViewCampaignModal, setShowViewCampaignModal] = useState(false);
  const [showEditCampaignModal, setShowEditCampaignModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameInput, setRenameInput] = useState("");
  const [showCloneConfirmModal, setShowCloneConfirmModal] = useState(false);
  const [showCloneNameModal, setShowCloneNameModal] = useState(false);
  const [cloneNameInput, setCloneNameInput] = useState("");

  const [viewCampaignTab, setViewCampaignTab] = useState<
    "example" | "template"
  >("example");
  const [exampleEmail, setExampleEmail] = useState("");
  const [editableCampaignTemplate, setEditableCampaignTemplate] = useState("");
  const [currentPlaceholderValues, setCurrentPlaceholderValues] = useState<
    Record<string, string>
  >({});

  const [editCampaignForm, setEditCampaignForm] = useState({
    templateName: "",
    aiInstructions: "",
    placeholderListInfo: "",
    masterBlueprintUnpopulated: "",
    selectedModel: "gpt-5",
  });

  const appModal = useAppModal();
  const {
    checkUserCredits,
    showCreditModal,
    closeCreditModal,
    handleSkipModal,
    credits,
  } = useCreditCheck();
  const DEFAULT_USER_TEMPLATE_ID = 65;
  const DEFAULT_USER_TEMPLATE_NAME = "PKB- FINAL 2.0";
  const isAdmin = userRole?.toUpperCase() === "ADMIN";
  const normalizeClientId = (value?: string | null) => {
    const trimmedValue = value?.trim();

    if (
      !trimmedValue ||
      trimmedValue === "null" ||
      trimmedValue === "undefined"
    ) {
      return "";
    }

    return trimmedValue;
  };
  const loggedInClientId = normalizeClientId(sessionStorage.getItem("clientId"));
  const selectedClientId = normalizeClientId(selectedClient);
  const effectiveUserId = isAdmin
    ? selectedClientId || loggedInClientId
    : loggedInClientId;

  const BLUEPRINT_BUILDER_SESSION_KEY = "blueprintBuilderOpen";

  const getStoredActiveBlueprintId = () => {
    const storedId =
      sessionStorage.getItem("newCampaignId") ||
      sessionStorage.getItem("editTemplateId");
    const parsedId = Number(storedId);

    return Number.isFinite(parsedId) && parsedId > 0 ? parsedId : null;
  };

  const shouldRestoreCampaignBuilder = () => {
    const hasActiveBlueprint = getStoredActiveBlueprintId() !== null;
    const builderWasOpen =
      sessionStorage.getItem(BLUEPRINT_BUILDER_SESSION_KEY) === "true";
    const editModeRequested =
      sessionStorage.getItem("editTemplateMode") === "true";

    return hasActiveBlueprint && (builderWasOpen || editModeRequested);
  };

  const [showCampaignBuilder, setShowCampaignBuilder] = useState(() =>
    shouldRestoreCampaignBuilder(),
  );

  // ✅ NEW: Template name modal states
  const [showTemplateNameModal, setShowTemplateNameModal] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState("");
  const [templateDefinitions, setTemplateDefinitions] = useState<
    TemplateDefinition[]
  >([]);
  const [selectedTemplateDefinitionId, setSelectedTemplateDefinitionId] =
    useState<number | null>(null);
  const [isPreparingCreateCampaign, setIsPreparingCreateCampaign] =
    useState(false);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [hoveredTemplateId, setHoveredTemplateId] = useState<number | null>(
    null,
  );
  const [exampleCache, setExampleCache] = useState<
    Record<number, string | undefined>
  >({});
   // ✅ NEW: Sorting state for templates table
  const [listSortKey, setListSortKey] = useState<string>("templateName");
  const [listSortDirection, setListSortDirection] = useState<"asc" | "desc">("asc");

   // Utility functions
  // ✅ NEW: String comparison helper for sorting
  const compareStrings = (a?: string, b?: string, direction: "asc" | "desc" = "asc") => {
    const valueA = (a || "").toLowerCase();
    const valueB = (b || "").toLowerCase();

    if (valueA < valueB) return direction === "asc" ? -1 : 1;
    if (valueA > valueB) return direction === "asc" ? 1 : -1;
    return 0;
  };
  // ✅ NEW: Handle column sort
  const handleListSort = (key: string) => {
  if (listSortKey === key) {
    setListSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  } else {
    setListSortKey(key);
    setListSortDirection("asc");
  }
};

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

  // ✅ NEW: Fetch template definitions
  const fetchTemplateDefinitions = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/CampaignPrompt/template-definitions?activeOnly=true`,
      );

      if (!response.ok) throw new Error("Failed to load template definitions");

      const data = await response.json();
      const defs: TemplateDefinition[] = data.templateDefinitions || [];

      if (isAdmin) {
        // ✅ Admin → see all templates
        setTemplateDefinitions(defs);

        if (defs.length > 0) {
          setSelectedTemplateDefinitionId(defs[0].id);
        }
      } else {
        // ✅ USER → force PKB-Final only
        const pkbTemplate = defs.find((d) => d.id === DEFAULT_USER_TEMPLATE_ID);

        setTemplateDefinitions(pkbTemplate ? [pkbTemplate] : []);
        setSelectedTemplateDefinitionId(DEFAULT_USER_TEMPLATE_ID);
      }
    } catch (error) {
      console.error(error);
      setTemplateDefinitions([]);
    }
  }, [isAdmin]);

  // Fetch campaign templates
  const fetchCampaignTemplates = useCallback(async () => {
    if (!effectiveUserId) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/CampaignPrompt/templates/${effectiveUserId}`,
      );

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

  // ✅ NEW: Handle create campaign button click
  const handleCreateCampaignClick = async () => {
    if (!effectiveUserId) {
      appModal.showError(
        isAdmin
          ? "Please select a client or log in again to use the admin account."
          : "Client ID missing. Please log in again.",
      );
      return;
    }

    // Check credits before allowing blueprint creation
    if (sessionStorage.getItem("isDemoAccount") !== "true" && effectiveUserId) {
      const currentCredits = await checkUserCredits(effectiveUserId);

      if (currentCredits && !currentCredits.canGenerate) {
        return; // Stop execution if can't generate
      }
    }

    setIsPreparingCreateCampaign(true);
    setShowTemplateNameModal(true);
    setTemplateNameInput("");
    setSelectedTemplateDefinitionId(null);
    setTemplateDefinitions([]);

    try {
      await fetchTemplateDefinitions();
    } finally {
      setIsPreparingCreateCampaign(false);
    }
  };

  // ✅ NEW: Handle template name submission
  // ✅ UPDATED: Handle template name submission
  const handleTemplateNameSubmit = async () => {
    if (!templateNameInput.trim()) {
      appModal.showError("Please enter a campaign name");
      return;
    }

    if (!effectiveUserId) {
      appModal.showError(
        isAdmin
          ? "Please select a client or log in again to use the admin account."
          : "Client ID missing. Please log in again.",
      );
      return;
    }

    // ✅ ROLE-BASED TEMPLATE RESOLUTION (TS SAFE)
    let finalTemplateDefinitionId: number;

    if (isAdmin) {
      if (selectedTemplateDefinitionId == null) {
        appModal.showError("Please select a template definition first");
        return;
      }
      finalTemplateDefinitionId = selectedTemplateDefinitionId;
    } else {
      // 🔒 USER → force PKB-Final
      finalTemplateDefinitionId = DEFAULT_USER_TEMPLATE_ID;
    }

    setIsCreatingCampaign(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/CampaignPrompt/campaign/start`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: effectiveUserId,
            templateDefinitionId: finalTemplateDefinitionId,
            templateName: templateNameInput,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to create campaign");
      }

      const data = await response.json();

      if (data.success || data.Success) {
        // ✅ Store campaign info
        sessionStorage.setItem("newCampaignId", data.campaignId.toString());
        sessionStorage.setItem("newCampaignName", data.templateName);
        sessionStorage.setItem(
          "selectedTemplateDefinitionId",
          finalTemplateDefinitionId.toString(),
        );
        sessionStorage.setItem("autoStartConversation", "true");
        sessionStorage.setItem("openConversationTab", "true");
        setActiveBlueprintId(data.campaignId);

        await fetchCampaignTemplates(); // ✅ CRITICAL

        // ✅ Close modal and open builder

        setShowTemplateNameModal(false);
        setShowCampaignBuilder(true);

      } 
      
      else {
        throw new Error(
          data.message || data.Message || "Failed to create campaign",
        );
      }
    } catch (error) {
      console.error("Error creating campaign:", error);
      appModal.showError("Failed to create campaign");
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  // Update template
  const handleUpdateCampaignTemplate = async () => {
    if (!selectedCampaignTemplate || !editCampaignForm.templateName) {
      appModal.showError("Please fill all required fields");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/CampaignPrompt/template/update`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedCampaignTemplate.id,
            templateName: editCampaignForm.templateName,
            aiInstructions: editCampaignForm.aiInstructions,
            placeholderListInfo: editCampaignForm.placeholderListInfo,
            masterBlueprintUnpopulated:
              editCampaignForm.masterBlueprintUnpopulated,
            selectedModel: editCampaignForm.selectedModel,
          }),
        },
      );

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

  // Delete campaign template
  const handleDeleteCampaignTemplate = async () => {
    if (!selectedCampaignTemplate) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/CampaignPrompt/template/${selectedCampaignTemplate.id}/delete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
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

  // Rename campaign template
  const handleRenameCampaignTemplate = async () => {
    if (!selectedCampaignTemplate || !renameInput.trim()) {
      appModal.showError("Please enter a valid name");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/CampaignPrompt/rename-Template`,
        {
          method: "POST",
          headers: {
            accept: "*/*",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clientId: effectiveUserId,
            templateId: selectedCampaignTemplate.id,
            templateName: renameInput.trim(),
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to rename campaign template");
      }

      appModal.showSuccess("Campaign template renamed successfully!");
      setShowRenameModal(false);
      setSelectedCampaignTemplate(null);
      setRenameInput("");
      await fetchCampaignTemplates();
    } catch (error) {
      appModal.showError("Failed to rename campaign template");
    } finally {
      setIsLoading(false);
    }
  };

  // Clone campaign template with name
  const handleCloneCampaignTemplate = async () => {
    if (!selectedCampaignTemplate || !cloneNameInput.trim()) {
      appModal.showError("Please enter a name for the cloned template");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/CampaignPrompt/clone-template?clientId=${effectiveUserId}&templateId=${selectedCampaignTemplate.id}&Name=${encodeURIComponent(cloneNameInput.trim())}`,
        {
          method: "POST",
          headers: { accept: "*/*" },
          body: "",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to clone campaign template");
      }

      appModal.showSuccess("Campaign template cloned successfully!");
      setShowCloneNameModal(false);
      setSelectedCampaignTemplate(null);
      setCloneNameInput("");
      await fetchCampaignTemplates();
    } catch (error) {
      appModal.showError("Failed to clone campaign template");
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
  })// ✅ NEW: Sort filtered templates
    .sort((a, b) => {
      switch (listSortKey) {
        case "templateName":
          return compareStrings(a.templateName, b.templateName, listSortDirection);

        case "id":
          const idCompare = a.id - b.id;
          return listSortDirection === "asc" ? idCompare : -idCompare;

        case "createdAt":
          const dateA = new Date(a.createdAt || "").getTime();
          const dateB = new Date(b.createdAt || "").getTime();
          const dateCompare = dateA - dateB;
          return listSortDirection === "asc" ? dateCompare : -dateCompare;

        default:
          return 0;
      }
    });
  //pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "All">(10);
  //const pageSize = 10;
  const effectivePageSize =
    pageSize === "All" ? filteredCampaignTemplates.length : pageSize;
  const totalPages =
    effectivePageSize === 0
      ? 1
      : Math.ceil(filteredCampaignTemplates.length / effectivePageSize);

  const startIndex =
    pageSize === "All" ? 0 : (currentPage - 1) * effectivePageSize;
  const paginatedTemplates =
    pageSize === "All"
      ? filteredCampaignTemplates
      : filteredCampaignTemplates.slice(
          startIndex,
          startIndex + (effectivePageSize || 0),
        );
  // Effects
  useEffect(() => {
    if (effectiveUserId) {
      fetchCampaignTemplates();
    }
  }, [effectiveUserId, fetchCampaignTemplates]);

  const generateExampleEmail = (template: CampaignTemplate) => {
    if (!template) return "";

    if ((template as any).exampleOutput) {
      // ✅ DB field preferred
      return (template as any).exampleOutput;
    }

    if (template.placeholderValues?.example_output) {
      return template.placeholderValues.example_output;
    }

    return template.campaignBlueprint || "";
  };
  const preloadExampleEmail = async (template: CampaignTemplate) => {
    if (template.id in exampleCache) return; // 👈 IMPORTANT

    // Mark as loading
    setExampleCache((prev) => ({
      ...prev,
      [template.id]: undefined,
    }));

    try {
      const fullTemplate = await fetchCampaignTemplateDetails(template.id);

       // ✅ Take ONLY example_output_email from placeholderValues
    const example = fullTemplate?.placeholderValues?.example_output_email || "";

      setExampleCache((prev) => ({
        ...prev,
        [template.id]: example, // empty string means "no example"
      }));
    } catch (e) {
      setExampleCache((prev) => ({
        ...prev,
        [template.id]: "",
      }));
    }
  };

//for picklist of blueprint
//for picklist of blueprint
const handleBlueprintSwitch = async (blueprintId: number) => {
  const blueprint = campaignTemplates.find(b => b.id === blueprintId);
  if (!blueprint) return;

  // Fetch the example email for this blueprint
  try {
    const fullTemplate = await fetchCampaignTemplateDetails(blueprintId);
    
    // Extract the example email
    const example =  fullTemplate?.placeholderValues?.example_output_email || "";
    
    // Update session storage with the example email
    sessionStorage.setItem("initialExampleEmail", example);
  } catch (error) {
    console.error("Error loading blueprint example:", error);
    sessionStorage.setItem("initialExampleEmail", "");
  }

    // Update session storage (builder depends on this)
    sessionStorage.setItem("newCampaignId", blueprint.id.toString());
    sessionStorage.setItem("newCampaignName", blueprint.templateName);
    sessionStorage.setItem("editTemplateId", blueprint.id.toString());
    sessionStorage.setItem("editTemplateMode", "true");
    setActiveBlueprintId(blueprint.id);

    // Force builder re-mount
    setShowCampaignBuilder(false);
    setTimeout(() => {
      setShowCampaignBuilder(true);
    }, 0);
  };

  const fetchCampaignTemplateDetails = async (templateId: number) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/CampaignPrompt/campaign/${templateId}`,
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("AI data", data);
      return data;
    } catch (error) {
      console.error("Error fetching template details:", error);
      return null;
    }
  };
  const extractExampleOutputEmail = (placeholderListWithValue?: string) => {
    if (!placeholderListWithValue) return "";

    // Match everything after {example_output_email} =
    const match = placeholderListWithValue.match(
      /\{example_output_email\}\s*=\s*([\s\S]*)/i,
    );

    return match ? match[1].trim() : "";
  };
  const extractExampleFromPlaceholderList = (
    placeholderListWithValue?: any,
  ): string => {
    if (!placeholderListWithValue) return "";

    // CASE 1: API returns ARRAY
    if (Array.isArray(placeholderListWithValue)) {
      const exampleItem = placeholderListWithValue.find(
        (item) =>
          item.key === "example_output_email" ||
          item.name === "example_output_email",
      );

      return exampleItem?.value?.trim() || "";
    }

    // CASE 2: API returns STRING
    if (typeof placeholderListWithValue === "string") {
      const match = placeholderListWithValue.match(
        /\{example_output_email\}\s*=\s*([\s\S]*)/i,
      );
      return match?.[1]?.trim() || "";
    }

    return "";
  };

  const handleViewCampaignTemplate = async (template: CampaignTemplate) => {
    setIsLoading(true);
    try {
      const fullTemplate = await fetchCampaignTemplateDetails(template.id);
      if (fullTemplate) {
        setSelectedCampaignTemplate(fullTemplate);
        setExampleEmail(
          fullTemplate.placeholderValues?.example_output_email || "",
        );

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
  const getTooltipText = (html?: string) => {
    if (!html || html === "No example email available") {
      return "No example email available";
    }

    const div = document.createElement("div");
    div.innerHTML = html;

    const text = div.textContent || div.innerText || "";
    return text.trim() || "No example email available";
  };

  const handleSaveCampaignTemplateChanges = async () => {
    if (!selectedCampaignTemplate) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/CampaignPrompt/template/update`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedCampaignTemplate.id,
            templateName: selectedCampaignTemplate.templateName,
            aiInstructions: selectedCampaignTemplate.aiInstructions,
            placeholderListInfo: selectedCampaignTemplate.placeholderListInfo,
            masterBlueprintUnpopulated:
              selectedCampaignTemplate.masterBlueprintUnpopulated,
            campaignBlueprint: editableCampaignTemplate,
            selectedModel: selectedCampaignTemplate.selectedModel,
            placeholderValues: currentPlaceholderValues,
          }),
        },
      );

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
  const [activeBlueprintId, setActiveBlueprintId] = useState<number | null>(() =>
    getStoredActiveBlueprintId(),
  );

  // Check if we should open builder directly on mount
  useEffect(() => {
    const storedId =
      sessionStorage.getItem("newCampaignId") ||
      sessionStorage.getItem("editTemplateId");
    const parsedId = Number(storedId);
    const hasStoredBlueprint = Number.isFinite(parsedId) && parsedId > 0;
    const builderWasOpen =
      sessionStorage.getItem(BLUEPRINT_BUILDER_SESSION_KEY) === "true";
    const editModeRequested =
      sessionStorage.getItem("editTemplateMode") === "true";

    if (hasStoredBlueprint) {
      setActiveBlueprintId(parsedId);
    }

    if (hasStoredBlueprint && (builderWasOpen || editModeRequested)) {
      setShowCampaignBuilder(true);
    }
  }, []);

  useEffect(() => {
    if (showCampaignBuilder && activeBlueprintId !== null) {
      sessionStorage.setItem(BLUEPRINT_BUILDER_SESSION_KEY, "true");
      return;
    }

    sessionStorage.removeItem(BLUEPRINT_BUILDER_SESSION_KEY);
  }, [activeBlueprintId, showCampaignBuilder]);
  // ✅ NEW: Render sort arrow indicator
  const renderSortArrow = (columnKey: string, currentSortKey: string, sortDirection: string) => {
    if (columnKey === currentSortKey) {
      return sortDirection === "asc" ? " ▲" : " ▼";
    }
    return "";
  };

  return (
    <div className="template-container">
      {!showCampaignBuilder ? (
        <>
          <div className="section-wrapper">
            <h2 className="section-title">Blueprints</h2>

            {/* Search and Create button */}
            <div className="controls-wrapper">
              <input
                type="text"
                className="search-input"
                placeholder="Search a blueprint name or ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                className="button save-button auto-width small"
                onClick={handleCreateCampaignClick}
                style={{ borderRadius: "12px" }}
              >
                <span className="text-[20px] mr-1">+</span> Create campaign
                blueprint
              </button>
            </div>
            <div style={{ marginBottom: "10px" }}>
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalRecords={filteredCampaignTemplates.length}
                setCurrentPage={setCurrentPage}
                setPageSize={setPageSize}
                showPageSizeDropdown={true}
                pageLabel="Page:"
              />
            </div>

            {/* Campaign Templates Table */}
            <table className="contacts-table">
              <thead>
                <tr>
                  <th onClick={() => handleListSort("templateName")} style={{ cursor: "pointer" }}>Blueprints{renderSortArrow("templateName", listSortKey, listSortDirection)}</th>
                  <th onClick={() => handleListSort("id")} style={{ cursor: "pointer" }}>ID {renderSortArrow("id", listSortKey, listSortDirection)}</th>
                  <th onClick={() => handleListSort("createdAt")} style={{ cursor: "pointer" }}>Creation date {renderSortArrow("createdAt", listSortKey, listSortDirection)}</th>
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
                ) : paginatedTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center" }}>
                      No campaign blueprint found.
                    </td>
                  </tr>
                ) : (
                  paginatedTemplates.map((template) => (
                    <tr key={template.id}>
                      {/* <td>
                        <span
                          className="template-link"
                          onClick={() => handleViewCampaignTemplate(template)}
                        >
                          {template.templateName}
                        </span>
                      </td> */}
                      <td>
                        <span
                          id={`blueprint-${template.id}`} // ✅ ADD THIS
                          className="template-link"
                          onMouseEnter={() => {
                            setHoveredTemplateId(template.id);
                            preloadExampleEmail(template);
                          }}
                          onClick={async () => { 
                            sessionStorage.setItem(
                              "editTemplateId",
                              template.id.toString(),
                            );
                            sessionStorage.setItem("editTemplateMode", "true");
                            sessionStorage.setItem(
                              "newCampaignId",
                              template.id.toString(),
                            );
                            sessionStorage.setItem(
                              "newCampaignName",
                              template.templateName,
                            );
                            setActiveBlueprintId(template.id);

                            // const example =
                            //   getTooltipText(exampleCache[template.id] || generateExampleEmail(template));

                            // sessionStorage.setItem("initialExampleEmail", example);
                            // ✅ FIXED: Load example email immediately, not from tooltip cache
                            try {
                              const fullTemplate = await fetchCampaignTemplateDetails(template.id);
                              const example = fullTemplate?.placeholderValues?.example_output_email || "";
                              sessionStorage.setItem("initialExampleEmail", example);
                            } catch (error) {
                              console.error("Error loading example email:", error);
                              sessionStorage.setItem("initialExampleEmail", "");
                            }
                            setShowCampaignBuilder(true);
                            setTimeout(() => {
                            setShowCampaignBuilder(true);
                           }, 0);
                          }}
                        >
                          {template.templateName}
                        </span>

                        {/* Tooltip */}
                        <Tooltip
                          anchorId={`blueprint-${template.id}`}
                          place="right"
                          offset={20}
                          positionStrategy="fixed" // ✅ ESCAPES TABLE CLIPPING
                          className="example-tooltip"
                        >
                          {exampleCache[template.id] === undefined ? (
                            <div>Loading example email...</div>
                          ) : (
                            <div
                              className="tooltip-email-content"
                              dangerouslySetInnerHTML={{
                                __html:
                                  exampleCache[template.id] ||
                                  "<p>No example email available</p>",
                              }}
                            />
                          )}
                        </Tooltip>
                      </td>

                      <td>#{template.id}</td>
                      <td>{formatDate(template.createdAt)}</td>
                      <td style={{ position: "relative" }}>
                        <button
                          className="template-actions-btn"
                          onClick={() =>
                            setTemplateActionsAnchor(
                              `campaign-${template.id}` ===
                                templateActionsAnchor
                                ? null
                                : `campaign-${template.id}`,
                            )
                          }
                        >
                          ⋮
                        </button>

                        {templateActionsAnchor ===
                          `campaign-${template.id}` && (
                          <div className="template-actions-menu">
                            <button
                              onClick={() => {
                                handleViewCampaignTemplate(template);
                                setTemplateActionsAnchor(null);
                              }}
                              style={menuBtnStyle}
                              className="flex gap-2 items-center"
                            >
                              <span style={actionIconStyle}>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="22px"
                                  height="22px"
                                  viewBox="0 0 24 20"
                                  fill="none"
                                >
                                  <circle
                                    cx="12"
                                    cy="12"
                                    r="4"
                                    fill="#3f9f42"
                                  />
                                  <path
                                    d="M21 12C21 12 20 4 12 4C4 4 3 12 3 12"
                                    stroke="#3f9f42"
                                    strokeWidth="2"
                                  />
                                </svg>
                              </span>
                              <span>View</span>
                            </button>

                            <>
                              <button
                                onClick={async () => {
                                  sessionStorage.setItem("editTemplateId", template.id.toString());
                                  sessionStorage.setItem("editTemplateMode", "true");

                                  // REQUIRED FIX 🔥 (builder reads this!)
                                  sessionStorage.setItem("newCampaignId", template.id.toString());
                                  sessionStorage.setItem("newCampaignName", template.templateName);
                                  setActiveBlueprintId(template.id);
                                 // ✅ FIXED: Load example email immediately
                                  try {
                                    const fullTemplate = await fetchCampaignTemplateDetails(template.id);
                                    const example =  fullTemplate?.placeholderValues?.example_output_email || "";
                                    sessionStorage.setItem("initialExampleEmail", example);
                                  } catch (error) {
                                    console.error("Error loading example email:", error);
                                    sessionStorage.setItem("initialExampleEmail", "");
                                  }
                                   setShowCampaignBuilder(true);
                                  // Safe delay
                                  // setTimeout(() => {
                                  //   setShowCampaignBuilder(true);
                                  // }, 0);

                                  setTemplateActionsAnchor(null);
                                }}
                                style={menuBtnStyle}
                                className="flex gap-2 items-center"
                              >                          
                              <span style={actionIconStyle}>
                               <FontAwesomeIcon
                               icon={faEdit}
                               style={{ color: "#3f9f42", fontSize: 20 }}
                                />
                             </span>  
                                <span>Edit</span>
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedCampaignTemplate(template);
                                  setRenameInput(template.templateName);
                                  setShowRenameModal(true);
                                  setTemplateActionsAnchor(null);
                                }}
                                style={menuBtnStyle}
                                className="flex gap-2 items-center"
                              >
                                {/* <span>
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="28px"
                                    height="28px"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                  >
                                    <path
                                      d="M12 3.99997H6C4.89543 3.99997 4 4.8954 4 5.99997V18C4 19.1045 4.89543 20 6 20H18C19.1046 20 20 19.1045 20 18V12M18.4142 8.41417L19.5 7.32842C20.281 6.54737 20.281 5.28104 19.5 4.5C18.7189 3.71895 17.4526 3.71895 16.6715 4.50001L15.5858 5.58575M18.4142 8.41417L12.3779 14.4505C12.0987 14.7297 11.7431 14.9201 11.356 14.9975L8.41422 15.5858L9.00257 12.6441C9.08001 12.2569 9.27032 11.9013 9.54951 11.6221L15.5858 5.58575M18.4142 8.41417L15.5858 5.58575"
                                      stroke="#3f9f42"
                                      strokeWidth="2"
                                      stroke-linecap="round"
                                      stroke-linejoin="round"
                                    ></path>
                                  </svg>
                                </span> */}
                                <span style={actionIconStyle}>
                                <FontAwesomeIcon
                                 icon={faFileLines    }
                                 style={{ color: "#3f9f42", fontSize: 20 }}
                                 />
                                </span>
                                <span>Rename</span>
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedCampaignTemplate(template);
                                  setCloneNameInput(
                                    `${template.templateName} - copy`,
                                  );
                                  setShowCloneNameModal(true);
                                  setTemplateActionsAnchor(null);
                                }}
                                style={menuBtnStyle}
                                className="flex gap-2 items-center"
                              >
                                <span style={actionIconStyle}>
                                  {" "}
                                  <img
                                    src={duplicateIcon}
                                    alt="Clone"
                                    style={{
                                      width: 22,
                                      height: 22,
                                      objectFit: "contain",
                                      filter:
                                     "invert(47%) sepia(82%) saturate(397%) hue-rotate(84deg) brightness(95%) contrast(90%)",
                                    }}
                                  />
                                </span>
                                <span>Clone</span>
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
                                {/* <span className="ml-[3px]">
                                  <img
                                    src={deleteIcon}
                                    alt="Delete"
                                    className="w-[24px] h-[24px] font-normal"
                                  />
                                </span> */}
                                 <span style={actionIconStyle}>
                                 <FontAwesomeIcon
                                 icon={faTrashAlt}
                                 style={{ color: "#3f9f42", fontSize: 20 }}
                                 />
                                </span>
                                <span>Delete</span>
                              </button>
                            </>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalRecords={paginatedTemplates.length}
              setCurrentPage={setCurrentPage}
              setPageSize={setPageSize}
              showPageSizeDropdown={true}
              pageLabel="Page:"
            />
          </div>

          <CommonSidePanel
            isOpen={showTemplateNameModal}
            onClose={() => setShowTemplateNameModal(false)}
            title="📝 Create new campaign blueprint"
            width={440}
            footerContent={
              <>
                <button
                  className="button secondary"
                  onClick={() => setShowTemplateNameModal(false)}
                  disabled={isCreatingCampaign}
                  style={{ 
                    padding: "10px 24px", 
                    borderRadius: "24px",
                    border: "2px solid #ddd",
                    background: "#fff",
                    color: "#666",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  className="button save-button"
                  onClick={handleTemplateNameSubmit}
                  disabled={
                    isPreparingCreateCampaign ||
                    !templateNameInput.trim() ||
                    !selectedTemplateDefinitionId ||
                    isCreatingCampaign
                  }
                  style={{
                    padding: "10px 24px",
                    borderRadius: "24px",
                    border: "2px solid #dc3545",
                    background: "#fff",
                    color: "#dc3545",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: (isPreparingCreateCampaign || !templateNameInput.trim() || !selectedTemplateDefinitionId || isCreatingCampaign) ? "not-allowed" : "pointer",
                    opacity: (isPreparingCreateCampaign || !templateNameInput.trim() || !selectedTemplateDefinitionId || isCreatingCampaign) ? 0.5 : 1
                  }}
                >
                  {isCreatingCampaign ? (
                    <>
                      <span className="spinner" style={{ marginRight: "8px" }}>⏳</span>
                      Creating campaign...
                    </>
                  ) : (
                    "Create blueprint"
                  )}
                </button>
              </>
            }
          >
            {isPreparingCreateCampaign ? (
              <div
                style={{
                  minHeight: "220px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "14px",
                  color: "#4b5563",
                }}
              >
                <style>
                  {`
                    @keyframes templatePanelSpin {
                      to { transform: rotate(360deg); }
                    }
                  `}
                </style>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    border: "4px solid #e5e7eb",
                    borderTopColor: "#dc3545",
                    borderRadius: "50%",
                    animation: "templatePanelSpin 0.8s linear infinite",
                  }}
                />
                <div style={{ fontSize: "14px", fontWeight: 500 }}>
                  Loading blueprint options...
                </div>
              </div>
            ) : (
              <>
                {isAdmin && (
                  <div className="form-group" style={{ marginBottom: "20px" }}>
                    <label>
                      Select base template <span style={{ color: "red" }}>*</span>
                    </label>
                    <select
                      value={selectedTemplateDefinitionId || ""}
                      onChange={(e) => setSelectedTemplateDefinitionId(parseInt(e.target.value))}
                    >
                      <option value="">-- Select a template definition --</option>
                      {templateDefinitions.map((def) => (
                        <option key={def.id} value={def.id}>
                          {def.templateName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: "20px" }}>
                  <label htmlFor="templateName" style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                    Campaign name <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    id="templateName"
                    type="text"
                    value={templateNameInput}
                    onChange={(e) => setTemplateNameInput(e.target.value)}
                    placeholder="e.g., IBM Sales Outreach"
                    autoFocus
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && templateNameInput.trim() && selectedTemplateDefinitionId) {
                        handleTemplateNameSubmit();
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "15px",
                    }}
                  />
                  <p style={{ marginTop: "8px", fontSize: "13px", color: "#6b7280" }}>
                    💡 Give this specific campaign instance a unique name
                  </p>
                </div>
              </>
            )}
          </CommonSidePanel>
          {/* Clone Name Input Modal */}
          <CommonSidePanel
            isOpen={showCloneNameModal && selectedCampaignTemplate !== null}
            onClose={() => {
              setShowCloneNameModal(false);
              setSelectedCampaignTemplate(null);
              setCloneNameInput("");
            }}
            title="Clone blueprint"
            width={440}
            footerContent={
              <>
                <button
                  onClick={() => {
                    setShowCloneNameModal(false);
                    setSelectedCampaignTemplate(null);
                    setCloneNameInput("");
                  }}
                  disabled={isLoading}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "24px",
                    border: "2px solid #ddd",
                    background: "#fff",
                    color: "#666",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCloneCampaignTemplate}
                  disabled={isLoading || !cloneNameInput.trim()}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "24px",
                    border: "2px solid #dc3545",
                    background: "#fff",
                    color: "#dc3545",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: cloneNameInput.trim() ? "pointer" : "not-allowed",
                    opacity: cloneNameInput.trim() ? 1 : 0.5
                  }}
                >
                  {isLoading ? "Cloning..." : "Clone Blueprint"}
                </button>
              </>
            }
          >
            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label
                htmlFor="cloneNameInput"
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  marginBottom: "8px",
                  color: "#374151",
                }}
              >
                New blueprint name <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                id="cloneNameInput"
                type="text"
                value={cloneNameInput}
                onChange={(e) => setCloneNameInput(e.target.value)}
                placeholder="Enter name for cloned blueprint"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === "Enter" && cloneNameInput.trim()) {
                    handleCloneCampaignTemplate();
                  }
                }}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                }}
              />
              <p style={{ marginTop: "8px", fontSize: "13px", color: "#6b7280" }}>
                💡 Cloning from: <strong>{selectedCampaignTemplate?.templateName}</strong>
              </p>
            </div>
          </CommonSidePanel>

          {/* Rename Modal */}
          <CommonSidePanel
            isOpen={showRenameModal && selectedCampaignTemplate !== null}
            onClose={() => {
              setShowRenameModal(false);
              setSelectedCampaignTemplate(null);
              setRenameInput("");
            }}
            title="Rename blueprint"
            width={440}
            footerContent={
              <>
                <button
                  onClick={() => {
                    setShowRenameModal(false);
                    setSelectedCampaignTemplate(null);
                    setRenameInput("");
                  }}
                  disabled={isLoading}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "24px",
                    border: "2px solid #ddd",
                    background: "#fff",
                    color: "#666",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRenameCampaignTemplate}
                  disabled={isLoading || !renameInput.trim()}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "24px",
                    border: "2px solid #dc3545",
                    background: "#fff",
                    color: "#dc3545",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: renameInput.trim() ? "pointer" : "not-allowed",
                    opacity: renameInput.trim() ? 1 : 0.5
                  }}
                >
                  {isLoading ? "Saving..." : "Save"}
                </button>
              </>
            }
          >
            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label
                htmlFor="renameInput"
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  marginBottom: "8px",
                  color: "#374151",
                }}
              >
                Blueprint name <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                id="renameInput"
                type="text"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                placeholder="Enter blueprint name"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === "Enter" && renameInput.trim()) {
                    handleRenameCampaignTemplate();
                  }
                }}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                }}
              />
            </div>
          </CommonSidePanel>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirmModal && selectedCampaignTemplate && (
            <div className="modal-backdrop">
              <div className="modal-content" style={{ padding: "15px" }}>
                <h2>Confirm deletion</h2>
                <p>
                  Are you sure you want to delete the campaign template{" "}
                  <strong>"{selectedCampaignTemplate.templateName}"</strong>?
                </p>
                <div className="modal-footer">
                  <button
                    className="button secondary"
                    onClick={() => {
                      setShowDeleteConfirmModal(false);
                      setSelectedCampaignTemplate(null);
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    className="button"
                    style={{ backgroundColor: "#3f9f42", color: "white" }}
                    onClick={handleDeleteCampaignTemplate}
                    disabled={isLoading}
                  >
                    {isLoading ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* View Campaign Template Modal */}
          {showViewCampaignModal && selectedCampaignTemplate && (
            <div className="modal-backdrop">
              <div className="modal-content modal-large">
                {/* ✅ Header with close (✕) icon */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: "-22px",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <button
                    onClick={() => {
                      setShowViewCampaignModal(false);
                      setSelectedCampaignTemplate(null);
                      setExampleEmail("");
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "22px",
                      cursor: "pointer",
                      color: "#6b7280",
                      fontWeight: "bold",
                    }}
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                {/* Render ONLY Example Output */}
                <div className="modal-body">
                    <h3 style={{ marginBottom: "16px", fontSize: "16px", fontWeight: "600" }}>Example Output</h3>
                  <div
                    className="example-output-preview"
                    style={{
                      background: "#ffffff",
                      padding: "20px",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      height: "auto",
                      overflowY: "hidden",
                    }}
                    dangerouslySetInnerHTML={{
                      __html: exampleEmail || "<p style='color: #9ca3af; text-align: center; padding: 40px 0;'>No example email available</p>"
                    }}
                  />
                </div>
                 {/* Modal Footer with Edit Button */}
                <div className="modal-footer" style={{ display: "flex", gap: "10px", justifyContent: "flex-end", padding: "16px", borderTop: "1px solid #e5e7eb" }}>
                  <button
                    onClick={() => {
                      setShowViewCampaignModal(false);
                      setSelectedCampaignTemplate(null);
                      setShowEditCampaignModal(true);
                      setEditCampaignForm({
                        templateName: selectedCampaignTemplate?.templateName || "",
                        aiInstructions: selectedCampaignTemplate?.aiInstructions || "",
                        placeholderListInfo: selectedCampaignTemplate?.placeholderListInfo || "",
                        masterBlueprintUnpopulated: selectedCampaignTemplate?.masterBlueprintUnpopulated || "",
                        selectedModel: selectedCampaignTemplate?.selectedModel || "gpt-4.1",
                      });
                    }}
                    style={{
                      padding: "8px 16px",
                      background: "#3b82f6",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500"
                    }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Campaign Modal */}
          {showEditCampaignModal && selectedCampaignTemplate && (
            <div className="modal-backdrop">
              <div className="modal-content modal-large">
                <h2>Advanced edit: {selectedCampaignTemplate.templateName}</h2>

                <div className="form-group">
                  <label>Template name</label>
                  <input
                    type="text"
                    value={editCampaignForm.templateName}
                    onChange={(e) =>
                      setEditCampaignForm({
                        ...editCampaignForm,
                        templateName: e.target.value,
                      })
                    }
                    placeholder="Template Name"
                  />
                </div>

                <div className="form-group">
                  <label>AI instructions</label>
                  <textarea
                    value={editCampaignForm.aiInstructions}
                    onChange={(e) =>
                      setEditCampaignForm({
                        ...editCampaignForm,
                        aiInstructions: e.target.value,
                      })
                    }
                    rows={6}
                    placeholder="AI Instructions for conversation"
                  />
                </div>

                <div className="form-group">
                  <label>Placeholder list</label>
                  <textarea
                    value={editCampaignForm.placeholderListInfo}
                    onChange={(e) =>
                      setEditCampaignForm({
                        ...editCampaignForm,
                        placeholderListInfo: e.target.value,
                      })
                    }
                    rows={4}
                    placeholder="{name}, {company}, {role}"
                  />
                </div>

                <div className="form-group">
                  <label>Master blueprint (unpopulated)</label>
                  <textarea
                    value={editCampaignForm.masterBlueprintUnpopulated}
                    onChange={(e) =>
                      setEditCampaignForm({
                        ...editCampaignForm,
                        masterBlueprintUnpopulated: e.target.value,
                      })
                    }
                    rows={10}
                    placeholder="Template with {placeholders}"
                  />
                </div>

                <div className="form-group">
                  <label>GPT model</label>
                  <select
                    value={editCampaignForm.selectedModel}
                    onChange={(e) =>
                      setEditCampaignForm({
                        ...editCampaignForm,
                        selectedModel: e.target.value,
                      })
                    }
                  >
                    <option value="gpt-4.1">GPT-4.1</option>
                    <option value="gpt-4.1-mini">GPT-4.1 mini</option>
                    <option value="gpt-5">GPT-5</option>
                    <option value="gpt-5-mini">GPT-5 mini</option>
                    <option value="gpt-5-nano">GPT-5 nano</option>
                  </select>
                </div>
                 <div className="form-group">
                  <label>Example Output Preview</label>
                  <div
                    style={{
                      background: "#ffffff",
                      padding: "20px",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      minHeight: "200px",
                      overflowY: "auto"
                    }}
                    dangerouslySetInnerHTML={{
                      __html: exampleEmail || "<p style='color: #9ca3af; text-align: center; padding: 40px 0;'>No example email loaded</p>"
                    }}
                  />
                </div>

                <div className="modal-footer">
                  <button
                    className="button secondary"
                    onClick={() => {
                      setShowEditCampaignModal(false);
                      setEditCampaignForm({
                        templateName: "",
                        aiInstructions: "",
                        placeholderListInfo: "",
                        masterBlueprintUnpopulated: "",
                        selectedModel: "gpt-5",
                      });
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    className="button save-button"
                    onClick={handleUpdateCampaignTemplate}
                    disabled={isLoading || !editCampaignForm.templateName}
                  >
                    {isLoading ? "Updating..." : "Update template"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* ✅ Show Campaign Builder Inline */
        <div>
          <div
            style={{
              display: "flex",
              gap: "16px",
              alignItems: "center",
              marginBottom: "20px",
              marginTop: "-35px",
              // borderBottom: "1px solid #e5e7eb",
              // background: "#f9fafb"
            }}
          >
            <button
              onClick={async () => {
                // ✅ Close UI first
                setShowCampaignBuilder(false);
                setActiveBlueprintId(null);
                sessionStorage.removeItem(BLUEPRINT_BUILDER_SESSION_KEY);

                // ✅ Give React state a tick before cleanup
                setTimeout(async () => {
                  // Only clear temp campaign session, not builder state keys used later
                  sessionStorage.removeItem("newCampaignId");
                  sessionStorage.removeItem("newCampaignName");
                  sessionStorage.removeItem("autoStartConversation");
                  sessionStorage.removeItem("openConversationTab");
                  sessionStorage.removeItem("initialExampleEmail");

                  // Don’t remove selectedTemplateDefinitionId – we need that next time

                  // ✅ Refresh campaign list
                  await fetchCampaignTemplates();
                }, 300);
              }}
              style={{
                background: "#eaeaea", // ✅ Match PitchKraft green
                color: "#222",
                border: "none",
                borderRadius: "12px",
                padding: "8px 16px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              ← Back
            </button>
            <select
              value={activeBlueprintId?.toString() || ""}
              onChange={(e) => handleBlueprintSwitch(Number(e.target.value))}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                backgroundColor: "#fff",
                minWidth: "220px",
              }}
            >
              {[...campaignTemplates].sort((a, b) => a.templateName.toLowerCase().localeCompare(b.templateName.toLowerCase())).map((template) => (
                <option key={template.id} value={template.id}>
                  {template.templateName}
                </option>
              ))}
            </select>

            {/* <h2 className="font-[600]">{sessionStorage.getItem("newCampaignName") || "Blueprint"}</h2> */}
          </div>

          <EmailCampaignBuilder selectedClient={effectiveUserId} />
        </div>
      )}

      {/* Credit Check Modal */}
      <CreditCheckModal
        isOpen={showCreditModal}
        onClose={closeCreditModal}
        onSkip={handleSkipModal}
        credits={credits || 0}
        setTab={() => {}} // Not needed in this context
      />
    </div>
  );
};

export default Template;
