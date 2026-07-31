import React, { useState } from "react";
import Tracking from "./Tracking";
import EmailSignature from "./EmailSignature";
import DateTimeSettings from "./DateTimeSettings";
import {
  pageBodyClass,
  pageClass,
  pageHeaderClass,
  pageSubClass,
  pageTitleClass,
  tabClass,
} from "../common/settingsStyles";

interface SettingsProps {
  selectedClient: string;
}

type SettingsTab = "Tracking" | "DateTime" | "EmailSignature";

const TABS: { key: SettingsTab; label: string }[] = [
  { key: "Tracking", label: "Tracking" },
  { key: "DateTime", label: "Date and time" },
  { key: "EmailSignature", label: "Email signature" },
];

const Settings: React.FC<SettingsProps> = ({ selectedClient }) => {
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsTab>("Tracking");

  return (
    <div className={pageClass}>
      {/* Page header — same chrome as Profile */}
      <div className={pageHeaderClass}>
        <h1 className={pageTitleClass}>General</h1>
        <p className={pageSubClass}>
          Manage tracking, date and time, and email signature settings for this
          client.
        </p>

        <nav className="mt-5 flex gap-8" aria-label="General settings tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSettingsSubTab(tab.key)}
              className={tabClass(settingsSubTab === tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className={pageBodyClass}>
        {settingsSubTab === "Tracking" && (
          <Tracking selectedClient={selectedClient} />
        )}
        {settingsSubTab === "DateTime" && (
          <DateTimeSettings selectedClient={selectedClient} />
        )}
        {settingsSubTab === "EmailSignature" && (
          <EmailSignature selectedClient={selectedClient} />
        )}
      </div>
    </div>
  );
};

export default Settings;
