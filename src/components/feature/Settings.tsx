import React, { useState, useEffect } from "react";
import Modal from "../common/Modal";
import API_BASE_URL from "../../config";
import { useModel } from "../../ModelContext";
import { useAppData } from "../../contexts/AppDataContext";
import AppModal from "../common/AppModal";
import { useAppModal } from "../../hooks/useAppModal";

interface SettingsProps {
  selectedClient: string;
  fetchClientSettings: (clientID: number) => Promise<any>;
  settingsForm: any;
  settingsFormHandler: (e: React.ChangeEvent<HTMLInputElement>) => void;
  settingsFormOnSubmit: (e: any) => void;
  preloadedSettings?: any; // ADD THIS
  isLoadingSettings?: boolean; // ADD THIS
  lastLoadedClientId: string | null;
  setLastLoadedClientId: React.Dispatch<React.SetStateAction<string | null>>;
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
  preloadedSettings, // ADD THIS
  isLoadingSettings = false, // ADD THIS
  lastLoadedClientId,
  setLastLoadedClientId,
}) => {
  const [openModals, setOpenModals] = useState<{ [key: string]: boolean }>({});
  const { selectedModelName, setSelectedModelName } = useModel();
  const [models, setModels] = useState<Model[]>([]);

  const appModal = useAppModal();

  // Added state for selected model
  const [selectedModel, setSelectedModel] = useState<string>("");
  const { refreshTrigger, clientSettings, setClientSettings, triggerRefresh } =
    useAppData();

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

  // REPLACE the useEffect I provided earlier with this corrected version:
  useEffect(() => {
    if (!selectedClient) return;

    (async () => {
      try {
        setIsLoading(true);

        // Use clientSettings from context first, then preloaded, then fetch
        let settings = clientSettings || preloadedSettings;

        // Only fetch if we don't have settings from context/props and it's a different client
        if (!settings && selectedClient !== lastLoadedClientId) {
          settings = await fetchClientSettings(Number(selectedClient));
        }

        // Only proceed if we have valid settings
        if (settings && Object.keys(settings).length > 0) {
          console.log("Applying settings to form:", settings); // Debug log

          // Set Model
          if (settings.modelName) {
            setSelectedModel(settings.modelName);
            setSelectedModelName(settings.modelName);
            localStorage.setItem("selectedModel", settings.modelName);
          }

          // Update Search Term Form
          const newSearchTermData = {
            searchCount: settings.searchCount?.toString() || "",
            searchTerm: settings.searchTerm || "",
            instructions: settings.instructions || "",
          };

          // Update local state
          setLocalSearchTermForm(newSearchTermData);

          // Update parent form state for each field
          if (searchTermFormHandler) {
            searchTermFormHandler({
              target: {
                name: "searchCount",
                value: newSearchTermData.searchCount,
              },
            } as React.ChangeEvent<HTMLInputElement>);

            searchTermFormHandler({
              target: {
                name: "searchTerm",
                value: newSearchTermData.searchTerm,
              },
            } as React.ChangeEvent<HTMLInputElement>);

            searchTermFormHandler({
              target: {
                name: "instructions",
                value: newSearchTermData.instructions,
              },
            } as React.ChangeEvent<HTMLInputElement>);
          }

          // Update Settings Form
          const newSettingsData = {
            systemInstructions: settings.systemInstructions || "",
            subjectInstructions: settings.subjectInstructions || "",
          };

          // Update local state
          setLocalSettingsForm((prev) => ({
            ...prev,
            ...newSettingsData,
          }));

          // Update parent form state for each field
          if (settingsFormHandler) {
            settingsFormHandler({
              target: {
                name: "systemInstructions",
                value: newSettingsData.systemInstructions,
              },
            } as React.ChangeEvent<HTMLInputElement>);

            settingsFormHandler({
              target: {
                name: "subjectInstructions",
                value: newSettingsData.subjectInstructions,
              },
            } as React.ChangeEvent<HTMLInputElement>);
          }

          // Fetch additional data
          await Promise.all([fetchZohoClient(), fetchDemoAccountStatus()]);
        }

        setLastLoadedClientId(selectedClient);
      } catch (error) {
        console.error("Error loading client settings:", error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [selectedClient, clientSettings, refreshTrigger, lastLoadedClientId]);

  // Modify handleModelChange to update local state

  const handleModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const modelName = event.target.value;
    setSelectedModel(modelName);
    setSelectedModelName(modelName); // context
    localStorage.setItem("selectedModel", modelName);
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
      // Prepare data in snake_case format as expected by API
      const settingsData = {
        model_name: selectedModel,
        search_URL_count:
          parseInt(
            localSearchTermForm.searchCount || searchTermForm.searchCount
          ) || 0,
        search_term:
          localSearchTermForm.searchTerm || searchTermForm.searchTerm || "",
        instruction:
          localSearchTermForm.instructions || searchTermForm.instructions || "",
        system_instruction:
          localSettingsForm.systemInstructions ||
          settingsForm.systemInstructions ||
          "",
        subject_instructions:
          localSettingsForm.subjectInstructions ||
          settingsForm.subjectInstructions ||
          "",
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
      appModal.showSuccess("Settings updated successfully");

      // Refresh settings to ensure UI is in sync
      const updatedSettings = await fetchClientSettings(Number(selectedClient));

      // Update context with new settings
      if (setClientSettings) {
        setClientSettings(updatedSettings);
      }

      // Trigger refresh
      if (triggerRefresh) {
        triggerRefresh();
      }
    } catch (error) {
      console.error("Error updating settings:", error);
      appModal.showError("Failed to update settings. Please try again.");
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
      appModal.showError(
        "Please fill all fields and ensure a client is selected"
      );
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
      appModal.showError(
        "Please enter Zoho View ID and ensure a client is selected"
      );
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
      appModal.showSuccess("Zoho view added successfully");
      await fetchZohoClient();

      return data;
    } catch (error) {
      console.error("Error adding Zoho view:", error);
      appModal.showError("Failed to add Zoho view");
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

      appModal.showSuccess("Zoho view deleted successfully");
      await fetchZohoClient();
    } catch (error) {
      console.error("Error deleting Zoho view:", error);
      appModal.showError("Failed to delete Zoho view");
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
    <div className="input-section edit-section">
      {tab === "Processes" && (
        <>
          <div className="row flex-wrap p-[15px] !m-0 bg-[#ddf7dd] rounded-[10px] border-2 border-dashed border-[#3f9f42]">
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
                <li className="mb-5 mb-10-640">
                  <strong>Current date </strong>
                  <br /> {"{date}"}
                </li>
              </ul>
            </div>
          </div>

          <br />

          <h3 className="left mt-0 sub-title">Models</h3>
          <form onSubmit={settingsFormOnSubmit}>
            <div className="row">
              <div className="col col-12 right">
                <div className="form-group">
                  <label>Select model</label>

                  <select
                    name="model"
                    id="model"
                    value={selectedModel || selectedModelName}
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
          <h3 className="left mt-0 d-flex align-items-center sub-title">
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
                <div className="form-group mb-0 mt-[26px]">
                  <label className="sr-only">Search URL count</label>
                  <select
                    name="searchCount"
                    value={
                      searchTermForm.searchCount ||
                      localSearchTermForm.searchCount ||
                      ""
                    }
                    onChange={(e) => {
                      console.log("Search count changing to:", e.target.value);
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

            <h3 className="left mt-20 sub-title">
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
          <h3 className="left mt-20 sub-title">Call #3 to AI API - Subject</h3>
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
                    onClick={() => handleModalOpen("modal-subjectInstructions")}
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
            <div className="d-flex justify-end">
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

      <AppModal
        isOpen={appModal.isOpen}
        onClose={appModal.hideModal}
        {...appModal.config}
      />
    </div>
  );
};

export default Settings;
