import React, { useState, useEffect } from "react";
import Modal from "../common/Modal";
import API_BASE_URL from "../../config";
import { useModel } from "../../ModelContext";

interface SettingsProps {
  selectedClient: string;
  fetchClientSettings: (clientID: number) => Promise<any>;
  settingsForm: any;
  settingsFormHandler: (e: React.ChangeEvent<HTMLInputElement>) => void;
  settingsFormOnSubmit: (e: any) => void;
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

interface SettingInterface {
  settingsForm: any;
  searchTermForm: any;
  settingsFormHandler: (value: any) => void;
  searchTermFormHandler: (value: any) => void;
  settingsFormOnSubmit: (e: any) => void;
  searchTermFormOnSubmit: (e: any) => void;
}

interface ZohoClient {
  id: string;
  zohoviewId: string;
  zohoviewName: string;
  TotalContact?: string; // Add this field
}

interface Model {
  id: number;
  modelName: string;
  inputPrice: number;
  outputPrice: number;
}

interface ClientSettings {
  modelName: string;
  searchCount: string;
  searchTerm: string;
  instructions: string;
  systemInstructions: string;
  emailTemplate: string;
}
interface UpdateSettingsPayload {
  model_name: string;
  search_URL_count: string;
  search_term: string;
  instruction: string;
  system_instruction: string;
}

interface SearchTermForm {
  searchCount: string;
  searchTerm: string;
  instructions: string;
  output?: string;
  [key: string]: any; // For any additional properties
}

interface SettingsForm {
  systemInstructions: string;
  subjectInstructions?: string; // <--- camelCase for React
  emailTemplate?: string;
  //...
}

type FormEventType = {
  target: {
    name: string;
    value: string;
  };
};

const Settings: React.FC<SettingInterface & SettingsProps> = ({
  settingsForm,
  searchTermForm,
  searchTermFormHandler,
  settingsFormHandler,
  settingsFormOnSubmit,
  searchTermFormOnSubmit,
  selectedClient,
  fetchClientSettings,
}) => {
  const [openModals, setOpenModals] = useState<{ [key: string]: boolean }>({});
  const { setSelectedModelName } = useModel(); // Destructure setSelectedModelName from context

  const [models, setModels] = useState<Model[]>([]);

  // Added state for selected model
  const [selectedModel, setSelectedModel] = useState<string>("");

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/modelsinfo`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Model[] = await response.json();
        setModels(data);
      } catch (error) {
        console.error("Error fetching models:", error);
      }
    };

    fetchModels();
  }, []); // Empty dependency array ensures this runs once on component mount

  // Load selected model from localStorage on mount
  useEffect(() => {
    const savedModel = localStorage.getItem("selectedModel");
    if (savedModel) {
      setSelectedModel(savedModel);
      setSelectedModelName(savedModel); // Update context as well
    }
  }, []);

  const [settingsData, setSettingsData] = useState({
    Model_name: "",
    Search_URL_count: "",
    Search_term: "",
    Instruction: "",
    System_instruction: "",

    // ... other settings
  });

  const [localSettingsForm, setLocalSettingsForm] = useState<SettingsForm>({
    systemInstructions: "",
    subjectInstructions: "", // <-- make sure this is in initial state
    emailTemplate: "",
  });

  const [localSearchTermForm, setLocalSearchTermForm] =
    useState<SearchTermForm>({
      searchCount: "",
      searchTerm: "",
      instructions: "",
      output: "",
    });

  // CHANGE THIS useEffect
  useEffect(() => {
    const loadClientSettings = async () => {
      if (selectedClient) {
        try {
          const response = await fetchClientSettings(Number(selectedClient));
          const settings = Array.isArray(response) ? response[0] : response;
          console.log("Full settings object:", settings);

          if (settings) {
            // Update model selection
            if (settings.model_name || settings.modelName) {
              const modelName = settings.model_name || settings.modelName;
              setSelectedModel(modelName);
              setSelectedModelName(modelName);
              localStorage.setItem("selectedModel", modelName);
            }

            // Update search term form
            setLocalSearchTermForm((prev) => ({
              ...prev,
              searchCount: settings.searchCount?.toString() || "",
              searchTerm: settings.searchTerm || "",
              instructions: settings.instruction || settings.instructions || "",
            }));

            searchTermFormHandler({
              target: {
                name: "searchCount",
                value: settings.searchCount?.toString() || "",
              },
            } as any);

            searchTermFormHandler({
              target: {
                name: "searchTerm",
                value: settings.searchTerm || "",
              },
            } as any);

            searchTermFormHandler({
              target: {
                name: "instructions",
                value: settings.instruction || settings.instructions || "",
              },
            } as any);

            // FIX: Update system instructions correctly
            settingsFormHandler({
              target: {
                name: "systemInstructions",
                value:
                  settings.system_instruction ||
                  settings.systemInstructions ||
                  "",
              },
            } as any);

            // FIX: Update subject instructions correctly
            settingsFormHandler({
              target: {
                name: "subjectInstructions",
                value:
                  settings.subject_instruction ||
                  settings.subjectInstructions ||
                  "",
              },
            } as any);

            // Also update local state
            setLocalSettingsForm((prev) => ({
              ...prev,
              systemInstructions:
                settings.system_instruction ||
                settings.systemInstructions ||
                "",
              subjectInstructions:
                settings.subject_instruction ||
                settings.subjectInstructions ||
                "",
            }));
          }
        } catch (error) {
          console.error("Error loading client settings:", error);
        }
      }
    };

    loadClientSettings();
  }, [selectedClient]);

  // Modify handleModelChange to update local state

  const handleModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const modelName = event.target.value;
    setSelectedModel(modelName);
    setSelectedModelName(modelName);
    localStorage.setItem("selectedModel", modelName);
    // Specify the type for prev
    setLocalSettingsForm((prev: SettingsForm) => ({
      ...prev,
      model: modelName,
    }));
    settingsFormHandler(event); // Call the original handler if needed
  };

  const handleModalClose = (id: string) => {
    setOpenModals((prev) => ({ ...prev, [id]: false }));
  };
  const handleModalOpen = (id: string) => {
    setOpenModals((prev) => ({ ...prev, [id]: true }));
  };

  useEffect(() => {
    // Initialize local state with the props when they change
    setLocalSettingsForm(settingsForm);
    setLocalSearchTermForm(searchTermForm);
  }, [settingsForm, searchTermForm]);

  interface SettingsForm {
    [key: string]: string; // Assuming all values are strings
  }

  interface SearchTermForm {
    [key: string]: string; // Assuming all values are strings
  }

  const handleSettingsFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalSettingsForm((prev: SettingsForm) => ({ ...prev, [name]: value }));
    settingsFormHandler(e); // Call the original handler
  };

  const handleSearchTermFormChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setLocalSearchTermForm((prev: SearchTermForm) => ({
      ...prev,
      [name]: value,
    }));
    searchTermFormHandler(e); // Call the original handler
  };

  const handleUpdateSettings = async () => {
    try {
      const settingsData = {
        model_name: selectedModel,
        search_URL_count: parseInt(searchTermForm.searchCount) || 0,
        search_term: searchTermForm.searchTerm || "",
        instruction: searchTermForm.instructions || "",
        system_instruction: settingsForm.systemInstructions || "",
        subject_instructions: settingsForm.subjectInstructions || "", // <--- back to snake_case for API
      };

      console.log("Sending update with:", settingsData);

      const response = await fetch(
        `${API_BASE_URL}/api/auth/updateClientSettings/${selectedClient}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(settingsData),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update settings: ${response.statusText}`);
      }
      await updateDemoAccountStatus();

      alert("Settings updated successfully");

      // Refresh settings
      const updatedSettings = await fetchClientSettings(Number(selectedClient));
      if (updatedSettings) {
        setSelectedModel(updatedSettings.modelName || "");
        searchTermFormHandler({
          target: {
            name: "searchCount",
            value: updatedSettings.searchCount?.toString() || "",
          },
        });
        searchTermFormHandler({
          target: {
            name: "searchTerm",
            value: updatedSettings.searchTerm || "",
          },
        });
      }
    } catch (error) {
      console.error("Error updating settings:", error);
      alert();
    }
  };

  useEffect(() => {
    console.log("Form Values Updated:", {
      searchTermForm,
      localSearchTermForm,
      selectedModel,
    });
  }, [searchTermForm, localSearchTermForm, selectedModel]);

  const [zohoViewForm, setZohoViewForm] = useState({
    zohoviewId: "",
    zohoviewName: "",
    TotalContact: "", // Add this field
  });

  // Updated handler name
  const onZohoViewInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setZohoViewForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Update handlers
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

    // Clear the form after successful addition
    setZohoViewForm({
      zohoviewId: "",
      zohoviewName: "",
      TotalContact: "",
    });
  };

  const handleDeleteZohoView = async () => {
    if (!zohoViewForm.zohoviewId || !selectedClient) {
      alert("Please enter Zoho View ID and ensure a client is selected");
      return;
    }

    await deleteZohoView(zohoViewForm.zohoviewId, selectedClient);

    // Clear the form after successful deletion
    setZohoViewForm({
      zohoviewId: "",
      zohoviewName: "",
      TotalContact: "",
    });
  };

  // Add these near the top of your component
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
          TotalContact: zohoViewForm.TotalContact, // Changed to TotalContact
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

  const deleteZohoView = async (zohoviewId: string, clientId: string) => {
    setIsLoading(true); // Use existing loading state
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

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsDemoAccount(false);

    if (selectedClient) {
      fetchZohoClient();
      fetchDemoAccountStatus(); // Add this line
    }
  }, [selectedClient]);

  const [zohoClient, setZohoClient] = useState<ZohoClient[]>([]);
  const [selectedZohoViewForDeletion, setSelectedZohoViewForDeletion] =
    useState("");

  const fetchZohoClient = async () => {
    if (!selectedClient) {
      console.log("No client selected, skipping fetch");
      return;
    }

    setIsLoading(true); // Use existing loading state
    console.log("Fetching Zoho client data for client:", selectedClient);
    try {
      const url = `${API_BASE_URL}/api/auth/zohoclientid/${selectedClient}`;
      console.log("Fetching from URL:", url);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ZohoClient[] = await response.json();
      console.log("Fetched Zoho client data:", data);
      setZohoClient(data);
    } catch (error) {
      console.error("Error fetching zoho client id:", error);
    } finally {
      setIsLoading(false); // Use existing loading state
    }
  };

  const [isDemoAccount, setIsDemoAccount] = useState(false);
  const fetchDemoAccountStatus = async () => {
    if (!selectedClient) return;

    console.log(
      `Fetching demo account status for client ID: ${selectedClient}`
    );

    try {
      setIsLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/api/auth/getDemoAccountStatus/${selectedClient}`
      );

      // Log the raw response for debugging
      console.log(`Raw response status: ${response.status}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get the response text first for debugging
      const responseText = await response.text();
      console.log(`Response text: ${responseText}`);

      // Parse the JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Error parsing JSON:", e);
        throw new Error("Invalid JSON response");
      }

      console.log(`Demo account status for client ${selectedClient}:`, data);

      // Check if the data has the expected structure
      if (data) {
        // Try different property names that might be in the response
        const demoStatus =
          data.IsDemoAccount !== undefined
            ? data.IsDemoAccount
            : data.isDemoAccount !== undefined
            ? data.isDemoAccount
            : data.is_demo_account !== undefined
            ? data.is_demo_account
            : null;

        if (demoStatus !== null) {
          console.log(
            `Setting isDemoAccount to ${demoStatus} for client ${selectedClient}`
          );
          setIsDemoAccount(Boolean(demoStatus)); // Convert to boolean to be safe
        } else {
          console.warn(
            `Demo account status property not found in response for client ${selectedClient}:`,
            data
          );
          // Keep the current state or set to false
        }
      } else {
        console.warn(`Empty or null response for client ${selectedClient}`);
      }
    } catch (error) {
      console.error(
        `Error fetching demo account status for client ${selectedClient}:`,
        error
      );
    } finally {
      setIsLoading(false);
    }
  };

  const updateDemoAccountStatus = async () => {
    if (!selectedClient) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/updateDemoAccount/${selectedClient}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            IsDemoAccount: isDemoAccount,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Demo account update response:", data);

      if (data.Success) {
        console.log("Demo account status updated successfully");
      }
    } catch (error) {
      console.error("Error updating demo account status:", error);
    }
  };
  // Add these state variables in the Settings component
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

  // Add these functions
  const fetchPromptsList = async () => {
    if (!selectedClient) {
      console.log("No client selected, skipping fetch");
      return;
    }

    setIsLoading(true);
    try {
      const url = `${API_BASE_URL}/api/auth/getprompts/${selectedClient}`;
      console.log("Fetching from URL:", url);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: Prompt[] = await response.json();
      console.log("Fetched prompts data:", data);
      setPromptList(data);
    } catch (error) {
      console.error("Error fetching prompts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    if (!selectedClient) {
      console.log("No client selected, skipping campaign fetch");
      return;
    }

    setIsLoading(true);
    try {
      const url = `${API_BASE_URL}/api/auth/campaigns/client/${selectedClient}`;
      console.log("Fetching campaigns from URL:", url);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: Campaign[] = await response.json();
      console.log("Fetched campaigns data:", data);
      setCampaigns(data);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setIsLoading(false);
    }
  };
  // Handlers for prompts and campaigns
  const handlePromptSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const promptId = e.target.value;
    if (!promptId) {
      setSelectedPrompt(null);
      return;
    }

    const prompt = promptList.find((p) => p.id.toString() === promptId);
    setSelectedPrompt(prompt || null);

    // Update campaign form
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

      // Populate the form with campaign data
      setCampaignForm({
        campaignName: campaign.campaignName,
        promptId: campaign.promptId.toString(),
        zohoViewId: campaign.zohoViewId,
        description: campaign.description || "", // Include description
      });

      // Find and select the corresponding prompt
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
          description: campaignForm.description, // Add description
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create campaign");
      }

      alert("Campaign created successfully");

      // Reset form and refresh campaigns
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
      // Change to use the POST endpoint instead of PUT
      const response = await fetch(`${API_BASE_URL}/api/auth/updatecampaign`, {
        method: "POST", // Changed from PUT to POST
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedCampaign.id, // Include the ID in the body
          campaignName: campaignForm.campaignName,
          promptId: parseInt(campaignForm.promptId),
          zohoViewId: campaignForm.zohoViewId,
          description: campaignForm.description, // Add description
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
      // Change to use the POST endpoint instead of DELETE
      const response = await fetch(
        `${API_BASE_URL}/api/auth/deletecampaign/${selectedCampaign.id}`,
        {
          method: "POST", // Changed from DELETE to POST
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete campaign");
      }

      alert("Campaign deleted successfully");

      // Reset selection and form
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
  // Add this useEffect
  useEffect(() => {
    if (selectedClient) {
      fetchPromptsList();
      fetchCampaigns();
    }
  }, [selectedClient]);

  const [tab, setTab] = useState("Processes");
  const tabHandler = (e: React.ChangeEvent<any>) => {
    const { innerText } = e.target;
    console.log(innerText, "innerText");
    setTab(innerText);
  };
  //--------------------------------------------------------------
  type BccEmail = { id: number; bccEmailAddress: string; clinteId: number };
  const [bccEmails, setBccEmails] = useState<BccEmail[]>([]);
  const [newBccEmail, setNewBccEmail] = useState<string>("");
  const [bccLoading, setBccLoading] = useState(false);
  const [bccError, setBccError] = useState<string>("");

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
  //---------------------------------------------------------------
  return (
    <div className="login-box gap-down d-flex">
      <div className="input-section edit-section">
        <div className="tabs secondary d-flex align-center">
          <ul className="d-flex">
            <li>
              <button
                onClick={tabHandler}
                className={`button ${tab === "Processes" ? "active" : ""}`}
              >
                Processes
              </button>
            </li>
            <li>
              <button
                onClick={tabHandler}
                className={`button ${
                  tab === "Campaign Management" ? "active" : ""
                }`}
              >
                Campaign Management
              </button>
            </li>
          </ul>
        </div>
        {tab === "Processes" && (
          <>
            <div className="row flex-wrap">
              <div className="col col-3 col-6-991 col-12-640">
                <ul>
                  <li className="mb-5 mb-10-640">
                    <strong>Name: </strong> <br />
                    {"{full_name}"}
                  </li>
                  <li className="mb-5 mb-10-640">
                    <strong>Linkedin URL: </strong>
                    <br /> {"{linkedin_url}"}
                  </li>
                </ul>
              </div>
              <div className="col col-3 col-6-991 col-12-640">
                <ul>
                  <li className="mb-5 mb-10-640">
                    <strong>Job title: </strong>
                    <br /> {"{job_title}"}
                  </li>
                  <li className="mb-5 mb-10-640">
                    <strong>Location: </strong>
                    <br /> {"{location}"}
                  </li>
                </ul>
              </div>
              <div className="col col-3 col-6-991 col-12-640">
                <ul>
                  <li className="mb-5 mb-10-640">
                    <strong>Company name: </strong>
                    <br /> {"{company_name}"}
                  </li>
                  <li className="mb-5 mb-10-640">
                    <strong> Company name friendly: </strong>
                    <br /> {"{company_name_friendly}"}
                  </li>
                </ul>
              </div>
              <div className="col col-3 col-6-991 col-12-640">
                <ul>
                  <li className="mb-5 mb-10-640">
                    <strong>Company website: </strong>
                    <br /> {"{website}"}
                  </li>
                </ul>
              </div>
            </div>
            <br />

            <h3 className="left mt-0">Models</h3>
            <form onSubmit={settingsFormOnSubmit}>
              <div className="row">
                <div className="col col-12 right">
                  <div className="form-group">
                    <label>Select model</label>

                    <select
                      name="model"
                      id="model"
                      value={selectedModel}
                      onChange={handleModelChange}
                    >
                      <option value="">Select model</option>
                      {models.map((model) => (
                        <option key={model.id} value={model.modelName}>
                          {model.modelName} - Input: $
                          {model.inputPrice.toFixed(4)}, Output: $
                          {model.outputPrice.toFixed(4)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </form>
            <div className="mt-2">
              <a
                href="https://platform.openai.com/docs/pricing"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "12px" }}
              >
                View model pricing
              </a>
            </div>

            <hr />
            <h3 className="left mt-0 d-flex align-items-center">
              <span className="ml-3">
                Call #1 to Search API - Output is sent to 'Call #1 to AI API{" "}
              </span>
              <div className="col col-3"></div>
            </h3>

            <form onSubmit={searchTermFormOnSubmit}>
              <div className="row">
                <div className="col col-6">
                  <div className="form-group">
                    <label>Search terms</label>
                    <input
                      type="text"
                      placeholder="Search terms"
                      name="searchTerm"
                      value={
                        searchTermForm.searchTerm ||
                        localSearchTermForm.searchTerm ||
                        ""
                      }
                      onChange={(e) => {
                        console.log("Search term changing to:", e.target.value);
                        searchTermFormHandler(e);
                        setLocalSearchTermForm((prev) => ({
                          ...prev,
                          searchTerm: e.target.value,
                        }));
                      }}
                    />
                  </div>
                </div>
                <div className="col col-6">
                  <div className="form-group mb-0">
                    <label className="sr-only">Search URL count</label>
                    <select
                      name="searchCount"
                      value={
                        searchTermForm.searchCount ||
                        localSearchTermForm.searchCount ||
                        ""
                      }
                      onChange={(e) => {
                        console.log(
                          "Search count changing to:",
                          e.target.value
                        );
                        searchTermFormHandler(e);
                        setLocalSearchTermForm((prev) => ({
                          ...prev,
                          searchCount: e.target.value,
                        }));
                      }}
                      className="form-control"
                    >
                      <option value="">Select URL count</option>
                      {[...Array(10)].map((_, index) => (
                        <option key={index + 1} value={index + 1}>
                          {index + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <h3 className="left mt-20">
                Call #1 to AI API - Output is {"{search_output_summary}"}{" "}
              </h3>
              <div className="row flex-wrap-640">
                <div className="col col-10 col-12-640">
                  <div className="form-group">
                    <label>Instructions</label>
                    <textarea
                      placeholder=""
                      rows={3}
                      name="instructions"
                      value={searchTermForm.instructions}
                      onChange={searchTermFormHandler}
                    ></textarea>
                    {/* <input
                    type="text"
                    placeholder="Instructions"
                    name="instructions"
                    value={searchTermForm.instructions}
                    onChange={searchTermFormHandler}
                  /> */}
                  </div>
                </div>
              </div>
            </form>
            <h3 className="left mt-20">Call #3 to AI API - Subject</h3>
            <div className="row">
              <div className="col">
                <div className="form-group">
                  <label>Subject instructions (for the email subject)</label>
                  <span className="pos-relative d-flex">
                    <textarea
                      placeholder="Subject instruction"
                      rows={3}
                      name="subjectInstructions"
                      value={settingsForm.subjectInstructions}
                      onChange={settingsFormHandler}
                    ></textarea>
                    <button
                      type="button"
                      className="full-view-icon d-flex align-center justify-center"
                      onClick={() =>
                        handleModalOpen("modal-subjectInstructions")
                      }
                    >
                      <svg width="40px" height="40px" viewBox="0 0 512 512">
                        <title>ionicons-v5-c</title>
                        <polyline
                          points="304 96 416 96 416 208"
                          fill="none"
                          stroke="#000000"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="32"
                        />
                        <line
                          x1="405.77"
                          y1="106.2"
                          x2="111.98"
                          y2="400.02"
                          fill="none"
                          stroke="#000000"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="32"
                        />
                        <polyline
                          points="208 416 96 416 96 304"
                          fill="none"
                          stroke="#000000"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="32"
                        />
                      </svg>
                    </button>
                    <Modal
                      show={openModals["modal-subjectInstructions"]}
                      closeModal={() =>
                        handleModalClose("modal-subjectInstructions")
                      }
                      buttonLabel="Ok"
                    >
                      <label>Subject instruction</label>
                      <textarea
                        placeholder="Subject instruction"
                        rows={15}
                        name="subjectInstructions"
                        className="textarea-full-height"
                        value={settingsForm.subjectInstructions}
                        onChange={settingsFormHandler}
                      ></textarea>
                    </Modal>
                  </span>
                </div>
              </div>
            </div>
            <div className="form-group">
              <div className="form-group">
                <label>
                  System instructions - prefixed to all prompt templates
                </label>
                <span className="pos-relative d-flex">
                  <textarea
                    placeholder=""
                    rows={3}
                    name="systemInstructions"
                    value={settingsForm.systemInstructions}
                    onChange={settingsFormHandler}
                  ></textarea>
                  <button
                    type="button"
                    className="full-view-icon d-flex align-center justify-center"
                    onClick={() => handleModalOpen("modal-systemInstructions")}
                  >
                    <svg width="40px" height="40px" viewBox="0 0 512 512">
                      <title>ionicons-v5-c</title>
                      <polyline
                        points="304 96 416 96 416 208"
                        fill="none"
                        stroke="#000000"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="32"
                      />
                      <line
                        x1="405.77"
                        y1="106.2"
                        x2="111.98"
                        y2="400.02"
                        fill="none"
                        stroke="#000000"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="32"
                      />
                      <polyline
                        points="208 416 96 416 96 304"
                        fill="none"
                        stroke="#000000"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="32"
                      />
                    </svg>
                  </button>
                  <Modal
                    show={openModals["modal-systemInstructions"]}
                    closeModal={() =>
                      handleModalClose("modal-systemInstructions")
                    }
                    buttonLabel="Ok"
                  >
                    <label>System instruction</label>
                    <textarea
                      placeholder=""
                      rows={15}
                      name="systemInstructions"
                      value={settingsForm.systemInstructions}
                      onChange={settingsFormHandler}
                    ></textarea>
                  </Modal>
                </span>
              </div>
              <div className="form-group d-flex justify-end">
                <div className="d-flex align-center">
                  <input
                    type="checkbox"
                    id="demoAccount"
                    checked={isDemoAccount}
                    onChange={(e) => setIsDemoAccount(e.target.checked)}
                    style={{ marginRight: "8px" }}
                  />
                  <label
                    htmlFor="demoAccount"
                    style={{ margin: 0 }}
                    className="nowrap"
                  >
                    Demo Account {isDemoAccount ? "(Yes)" : "(No)"}{" "}
                    {/* Add visual confirmation */}
                  </label>
                </div>
                <div className="d-flex ml-10">
                  <button
                    type="button"
                    onClick={handleUpdateSettings}
                    className="save-button button full"
                  >
                    Update Settings {/* Or "Save Settings" */}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === "Campaign Management" && (
          <>
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

              <div className="col col-3 col-12-991  col-12-640">
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
                <h3 className="left mt-0">Campaign Management</h3>
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
            <div className="row mt-3">
              <div className="col col-12">
                <h4>BCC Email Management</h4>
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
                          className="delete-button button small"
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
          </>
        )}
      </div>
    </div>
  );
};

export default Settings;
