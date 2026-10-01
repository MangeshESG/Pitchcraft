import React, { useEffect, useState } from "react";
import InstructionSetPage from "./blueprint/InstructionSetPage";
import AiModelSettings from "./AiModelSettings";
import SecuritySettings from "./SecuritySettings";
import PromptSettings from "./PromptSettings";
import ValidationSettings from "./ValidationSettings";
import AdminAccountSettings from "./AdminAccountSettings";
import AdminCreditSettings from "./AdminCreditSettings";
import { fetchIsSuperAdmin } from "../../utils/superAdminRequest";
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

type AdminTab =
  | "InstructionSet"
  | "AiModels"
  | "Prompts"
  | "Validation"
  | "Security"
  | "Accounts"
  | "Credits";

/**
 * Tabs that hand out logins and credits. Every admin sees the rest of this
 * page; these two are limited to the client ids on the API's
 * SuperAdmins:ClientIds allowlist, so they are hidden from everyone else
 * rather than shown and then refused.
 */
const SUPER_ADMIN_TABS: AdminTab[] = ["Accounts", "Credits"];

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
    key: "Validation",
    label: "Validation",
    description:
      "Tuning for the Audience Assurance checks. These settings apply to every client and take effect on the next run.",
  },
  {
    key: "Accounts",
    label: "Accounts",
    description:
      "Create a client account directly, for onboarding someone without sending them through sign-up.",
  },
  {
    key: "Credits",
    label: "Credits",
    description:
      "Add credits to a client by hand, or take them back. Changes apply to the client's balance immediately.",
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
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void fetchIsSuperAdmin().then((allowed) => {
      if (isMounted) setIsSuperAdmin(allowed);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleTabs = TABS.filter(
    (tab) => isSuperAdmin || !SUPER_ADMIN_TABS.includes(tab.key),
  );

  const activeTab = visibleTabs.find((tab) => tab.key === adminSubTab) ?? TABS[0];

  return (
    <div className={pageClass}>
      {/* Page header — same chrome as Profile and General */}
      <div className={pageHeaderClass}>
        <h1 className={pageTitleClass}>Admin</h1>
        <p className={pageSubClass}>{activeTab.description}</p>

        <nav className="mt-5 flex gap-8" aria-label="Admin settings tabs">
          {visibleTabs.map((tab) => (
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
          {adminSubTab === "Validation" && <ValidationSettings />}
          {adminSubTab === "Security" && <SecuritySettings />}
          {adminSubTab === "Accounts" && isSuperAdmin && <AdminAccountSettings />}
          {adminSubTab === "Credits" && isSuperAdmin && <AdminCreditSettings />}
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
