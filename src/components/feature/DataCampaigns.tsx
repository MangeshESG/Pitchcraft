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

const DataCampaigns: React.FC<DataCampaignsProps> = ({
  selectedClient,
  onDataProcessed,
  isProcessing,
  userRole,
}) => {
  // State for Zoho Views
  const [zohoClient, setZohoClient] = useState<ZohoClient[]>([]);
  const [selectedZohoViewForDeletion, setSelectedZohoViewForDeletion] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  // Load data when client changes
  useEffect(() => {
    if (selectedClient) {
      fetchZohoClient();
    }
  }, [selectedClient]);

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

      {/* Data File Management Section */}
      {/* <div className="section-wrapper">
        <h2 className="section-title">Data File Management</h2>
        <div className="login-box gap-down d-flex">
          <div className="input-section edit-section">
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
          </div>
        </div>
      </div> */}
    </div>
  );
};

export default DataCampaigns;