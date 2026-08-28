import React, { useState } from "react";
import InstructionSetPage from "./blueprint/InstructionSetPage";
import AiModelSettings from "./AiModelSettings";
import SecuritySettings from "./SecuritySettings";
import PromptSettings from "./PromptSettings";
import {
  pageBodyClass,
  pageClass,
  pageHeaderClass,
  pageSubClass,
  pageTitleClass,
  tabClass,
} from "../common/settingsStyles";

interface AdminSettingsProps {
  selectedClient: string;
}

type AdminTab = "InstructionSet" | "AiModels" | "Prompts" | "Security";

// The subtitle changes with the tab, so the header still says what the panel
// below it does now that three separate pages share one page title.
const TABS: { key: AdminTab; label: string; description: string }[] = [
  {
    key: "InstructionSet",
    label: "Instruction set",
    description:
      "Edit the prompts and placeholders behind blueprint and email generation.",
  },
  {
    key: "AiModels",
    label: "AI models",
    description:
      "Choose the model behind each part of the product. These settings apply to every client and take effect on the next generation.",
  },
  {
    key: "Prompts",
    label: "Prompts",
    description:
      "Edit the AI instructions that ship with the API, such as the email research prompt behind the extension's unlock button.",
  },
  {
    key: "Security",
    label: "Security",
    description:
      "Sign-in rules for the whole product. These settings apply to every client and take effect on the next login.",
  },
];

/**
 * Admin-only settings, one tab per area. MainPage only renders this for
 * ADMIN users — the three panels were separate side-menu items before and are
 * grouped here so the menu stays short.
 */
const AdminSettings: React.FC<AdminSettingsProps> = ({ selectedClient }) => {
  const [adminSubTab, setAdminSubTab] = useState<AdminTab>("InstructionSet");

  const activeTab = TABS.find((tab) => tab.key === adminSubTab) ?? TABS[0];

  return (
    <div className={pageClass}>
      {/* Page header — same chrome as Profile and General */}
      <div className={pageHeaderClass}>
        <h1 className={pageTitleClass}>Admin</h1>
        <p className={pageSubClass}>{activeTab.description}</p>

        <nav className="mt-5 flex gap-8" aria-label="Admin settings tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setAdminSubTab(tab.key)}
              className={tabClass(adminSubTab === tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* The instruction set editor brings its own page padding, so it sits
          outside the shared body wrapper instead of being padded twice. */}
      {adminSubTab === "InstructionSet" ? (
        <InstructionSetPage selectedClient={selectedClient} />
      ) : (
        <div className={pageBodyClass}>
          {adminSubTab === "AiModels" && <AiModelSettings />}
          {adminSubTab === "Prompts" && <PromptSettings />}
          {adminSubTab === "Security" && <SecuritySettings />}
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
