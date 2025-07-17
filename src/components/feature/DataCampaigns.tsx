import React, { useState, useEffect } from "react";
import DataFile from "./datafile";

interface DataCampaignsProps {
  // DataFile props
  selectedClient: string;
  onDataProcessed: (data: any) => void;
  isProcessing: boolean;

  // Additional props needed for Campaign Management
  userRole?: string;
}






const DataCampaigns: React.FC<DataCampaignsProps> = ({
  selectedClient,
  onDataProcessed,
  isProcessing,
}) => {
 


  // State for Campaigns
  

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

     
    </div>
  );
};

export default DataCampaigns;
