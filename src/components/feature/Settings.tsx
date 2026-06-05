import React, { useState } from "react";
import Tracking from "./Tracking";
import EmailSignature from "./EmailSignature";

interface SettingsProps {
  selectedClient: string;
}

const Settings: React.FC<SettingsProps> = ({ selectedClient }) => {
  const [settingsSubTab, setSettingsSubTab] = useState<string>("Tracking");

  return (
    <div className="settings-container h-full">
      <div className="settings-tabs-wrapper">
        {/* Tab Navigation */}
        <div className="settings-tabs border-b border-gray-200 bg-white">
          <nav className="flex space-x-8 px-6" aria-label="Settings tabs">
            <button
              onClick={() => setSettingsSubTab("Tracking")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                settingsSubTab === "Tracking"
                  ? "border-[#3f9f42] text-[#3f9f42]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Tracking
            </button>
            <button
              onClick={() => setSettingsSubTab("EmailSignature")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                settingsSubTab === "EmailSignature"
                  ? "border-[#3f9f42] text-[#3f9f42]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Email signature
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="settings-content">
          {settingsSubTab === "Tracking" && (
            <Tracking selectedClient={selectedClient} />
          )}
          {settingsSubTab === "EmailSignature" && (
            <EmailSignature selectedClient={selectedClient} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
