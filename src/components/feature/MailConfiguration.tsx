import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faEnvelope, faTrashAlt } from "@fortawesome/free-regular-svg-icons";
import AddMailboxModal from "../common/AddMailboxModal";
import OtherMailboxWizard from "../common/OtherMailboxWizard";
import CommonSidePanel from "../common/CommonSidePanel";
import PaginationControls from "./PaginationControls";
import OtpModal from "./OtpModal";
import ValidateRecordsModal from "./ValidateRecordsModal";
import DomainAuthColumn from "./DomainAuthColumn";
import API_BASE_URL from "../../config";
import { closePanel, openPanel } from "../../slices/panelSlice";
import { MailConfigurationEmptyState } from "./MailConfiguration.new";
import { lessPriorityButtonStyle } from "../../styles/buttonStyles";
import { formatUserDateTime } from "../common/dateTimePreferences";

interface MailConfigurationProps {
  [key: string]: any;
}

const MailConfiguration: React.FC<MailConfigurationProps> = ({
  configTab,
  setConfigTab,
  isDemoAccount,
  dispatch,
  mailboxSearch,
  setMailboxSearch,
  toggleSort,
  smtpSortKey,
  setSmtpSortKey,
  setSmtpSortDirection,
  renderSortArrow,
  smtpSortDirection,
  mailboxActionsAnchor,
  setMailboxActionsAnchor,
  handleEdit,
  handleDelete,
  menuBtnStyle,
  actionIconStyle,
  currentPageMailbox,
  filteredMailboxes,
  pageSize,
  setCurrentPageMailbox,
  setPageSize,
  inboxLoading,
  showAddEditMailBoxModal,
  editingId,
  form,
  setForm,
  handleChangeSMTP,
  handleSubmitSMTP,
  smtpLoading,
  setEditingId,
  effectiveUserId,
  token,
  fetchSmtp,
  fetchInboxCredentials,
  setToastMessage,
  setShowSuccessToast,
  setShowErrorToast,
  showSMTPEditModal,
  showIMAPEditModal,
  inboxForm,
  setInboxForm,
  handleChangeInbox,
  handleSubmitInbox,
  setEditingInboxId,
  showSmtpOtpModal,
  smtpOtpEmail,
  handleSmtpOtpVerify,
  smtpOtpVerifying,
  setShowSmtpOtpModal,
  bccLoading,
  handleDeleteBcc,
  safeBccEmails,
  paginatedBccEmails,
  bccPage,
  totalPagesBCC,
  sortedBccEmails,
  setBccPage,
  bccSortKey,
  setBccSortKey,
  bccSortDirection,
  setBccSortDirection,
  showBCCEmailModal,
  handleSave,
  newBccEmail,
  setNewBccEmail,
  fetchingDomain,
  sortedDomainData,
  domainSortKey,
  setDomainSortKey,
  setDomainSortDirection,
  domainSortDirection,
  setSelectedDomain,
  handleDomainValidateClick,
  handleDomainDeleteClick,
  showOtpModal,
  setShowOtpModal,
  selectedOtpDomain,
  appModal,
  fetchDomainData,
  showValidateModal,
  selectedDomain,
  hasMailboxConfig,
  smtpListLoading,
}) => {
  const [mailboxFilter, setMailboxFilter] = React.useState<
    "all" | "smtp" | "imap" | "oauth"
  >("all");
  const [editIncludeImap, setEditIncludeImap] = React.useState(false);
  const [oauthEditing, setOauthEditing] = React.useState<any | null>(null);
  const [oauthSenderName, setOauthSenderName] = React.useState("");
  const [oauthFullInboxSync, setOauthFullInboxSync] = React.useState(false);
  const [isSavingOauth, setIsSavingOauth] = React.useState(false);
  const [oauthDeleteTarget, setOauthDeleteTarget] = React.useState<any | null>(null);
  const [isDeletingOauth, setIsDeletingOauth] = React.useState(false);
  const [outgoingGroups, setOutgoingGroups] = React.useState<any[]>([]);
  const [groupsLoading, setGroupsLoading] = React.useState(false);
  const [showCreateGroup, setShowCreateGroup] = React.useState(false);
  const [groupName, setGroupName] = React.useState("");
  const [groupDescription, setGroupDescription] = React.useState("");
  const [selectedGroupMailboxes, setSelectedGroupMailboxes] = React.useState<string[]>([]);
  const [savingGroup, setSavingGroup] = React.useState(false);
  const [editingGroupId, setEditingGroupId] = React.useState<number | null>(null);
  const [groupDeleteTarget, setGroupDeleteTarget] = React.useState<any | null>(null);
  const [deletingGroup, setDeletingGroup] = React.useState(false);
  const [groupActionsAnchor, setGroupActionsAnchor] = React.useState<number | null>(null);
  const [viewGroupMailboxes, setViewGroupMailboxes] = React.useState<any | null>(null);

  const fetchOutgoingGroups = React.useCallback(async () => {
    if (!effectiveUserId) return;
    setGroupsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/OutgoingMailboxGroup/get?clientId=${effectiveUserId}`
      );
      if (!response.ok) throw new Error("Failed to load outgoing groups");
      const result = await response.json();
      setOutgoingGroups(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error(error);
      setOutgoingGroups([]);
    } finally {
      setGroupsLoading(false);
    }
  }, [effectiveUserId]);

  React.useEffect(() => {
    if (configTab === "groups") fetchOutgoingGroups();
  }, [configTab, fetchOutgoingGroups]);

  const mailboxGroupKey = (item: any) => `${getProvider(item)}:${item.id}`;
  const mailboxLabel = (item: any) =>
    item.fromEmail || item.emailAddress || item.username || item.senderName || `Mailbox ${item.id}`;
  const groupMemberLabel = (member: any) => {
    const mailbox = filteredMailboxes.find(
      (item: any) => Number(item.id) === Number(member.outboxId) &&
        getProvider(item).toLowerCase() === String(member.provider).toLowerCase()
    );
    return mailbox ? `${mailboxLabel(mailbox)} (${member.provider})` : `${member.provider} #${member.outboxId}`;
  };

  const resetGroupForm = () => {
    setShowCreateGroup(false);
    setGroupName("");
    setGroupDescription("");
    setSelectedGroupMailboxes([]);
    setEditingGroupId(null);
  };

  const createOutgoingGroup = async () => {
    if (!groupName.trim() || selectedGroupMailboxes.length === 0) return;
    const isUpdating = Boolean(editingGroupId);
    setSavingGroup(true);
    try {
      const members = filteredMailboxes
        .filter((item: any) => selectedGroupMailboxes.includes(mailboxGroupKey(item)))
        .map((item: any) => ({ outboxId: Number(item.id), provider: getProvider(item) }));
      const response = await fetch(
        `${API_BASE_URL}/api/OutgoingMailboxGroup/${editingGroupId ? "update" : "create"}`,
        {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingGroupId || 0,
          clientId: Number(effectiveUserId),
          name: groupName.trim(),
          description: groupDescription.trim() || null,
          members,
        }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || result?.message || "Failed to create outgoing group");
      }
      resetGroupForm();
      await fetchOutgoingGroups();
      setToastMessage(`Outgoing group ${isUpdating ? "updated" : "created"} successfully`);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (error) {
      console.error(error);
      setToastMessage(error instanceof Error ? error.message : "Failed to create outgoing group");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    } finally {
      setSavingGroup(false);
    }
  };

  const editOutgoingGroup = (group: any) => {
    setEditingGroupId(Number(group.id));
    setGroupName(group.name || "");
    setGroupDescription(group.description || "");
    setSelectedGroupMailboxes((group.members || []).map(
      (member: any) => `${member.provider}:${member.outboxId}`
    ));
    setShowCreateGroup(true);
    setConfigTab("mailboxes");
  };

  const deleteOutgoingGroup = async () => {
    if (!groupDeleteTarget) return;
    setDeletingGroup(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/OutgoingMailboxGroup/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: groupDeleteTarget.id, clientId: Number(effectiveUserId) }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || result?.message || "Failed to delete outgoing group");
      }
      setGroupDeleteTarget(null);
      await fetchOutgoingGroups();
      setToastMessage("Outgoing group deleted successfully");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (error) {
      console.error(error);
      setToastMessage(error instanceof Error ? error.message : "Failed to delete outgoing group");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    } finally {
      setDeletingGroup(false);
    }
  };

  React.useEffect(() => {
    if (showSMTPEditModal) {
      setEditIncludeImap(Boolean(form.incomingServer || form.incomingPort));
    }
  }, [showSMTPEditModal, form.incomingServer, form.incomingPort]);

  const resetSmtpEditForm = () => {
    dispatch(closePanel());
    setEditingId(null);
    setEditIncludeImap(false);
    setForm({
      server: "",
      port: "",
      username: "",
      password: "",
      fromEmail: "",
      senderName: "",
      usessl: "Auto",
      incomingServer: "",
      incomingPort: "",
      fullInboxSync: false,
      incomingSecurityType: "Auto",
    });
  };

  const getInbox = (item: any) => item?.inbox || null;
  const getProvider = (item: any) => String(item?.provider || item?.Provider || "SMTP");
  const isTrue = (value: any) => value === true || String(value).toLowerCase() === "true";
  const isOAuthMailbox = (item: any) =>
    Boolean(item?.isOAuth) || getProvider(item).toUpperCase() !== "SMTP";
  const hasOutgoing = (item: any) =>
    isOAuthMailbox(item) || Boolean(item?.server || item?.fromEmail || item?.username || item?.senderName);
  const hasIncoming = (item: any) =>
    isOAuthMailbox(item) ? isTrue(item?.fullInboxSync) : Boolean(getInbox(item));
  const getMailboxStatus = (item: any) => {
    if (isOAuthMailbox(item)) return `${getProvider(item)} connected`;
    const outgoing = hasOutgoing(item);
    const incoming = hasIncoming(item);

    if (outgoing && incoming) return "Complete";
    if (outgoing) return "SMTP only";
    if (incoming) return "IMAP only";
    return "Not configured";
  };
  const mailboxFilterOptions = [
    { key: "all", label: "All mailboxes" },
    { key: "smtp", label: "SMTP only" },
    { key: "imap", label: "IMAP (incoming)" },
    { key: "oauth", label: "Gmail / Outlook" },
  ];
  const mailboxCounts = {
    all: filteredMailboxes.length,
    smtp: filteredMailboxes.filter((item: any) => !isOAuthMailbox(item) && hasOutgoing(item) && !hasIncoming(item)).length,
    imap: filteredMailboxes.filter((item: any) => hasIncoming(item) && !isOAuthMailbox(item)).length,
    oauth: filteredMailboxes.filter((item: any) => isOAuthMailbox(item)).length,
  };
  const filteredMailboxRows = filteredMailboxes.filter((item: any) => {
    if (mailboxFilter === "smtp") return !isOAuthMailbox(item) && hasOutgoing(item) && !hasIncoming(item);
    if (mailboxFilter === "imap") return hasIncoming(item) && !isOAuthMailbox(item);
    if (mailboxFilter === "oauth") return isOAuthMailbox(item);
    return true;
  });
  const getMailboxDateValue = (item: any) =>
    item?.updatedAt || item?.createdAt || item?.inbox?.updatedAt || item?.inbox?.createdAt || "";
  const getMailboxSortValue = (item: any, key: string) => {
    const inbox = getInbox(item);

    if (key === "emailAddress") {
      return item.fromEmail || item.username || inbox?.emailAddress || "";
    }

    if (key === "server") {
      const smtpSecurity = item.securityType || item.SecurityType || (item.useSsl || item.usessl ? "SSL" : "None");
      return `${item.server || ""} ${item.port || ""} ${smtpSecurity || ""}`;
    }

    if (key === "incoming") {
      return `${inbox?.host || ""} ${inbox?.port || ""} ${inbox?.encryption || ""}`;
    }

    if (key === "status") {
      return getMailboxStatus(item);
    }

    if (key === "updatedAt") {
      const time = new Date(getMailboxDateValue(item)).getTime();
      return Number.isNaN(time) ? 0 : time;
    }

    return item?.[key] || "";
  };
  const sortedMailboxRows = [...filteredMailboxRows].sort((a: any, b: any) => {
    const valueA = getMailboxSortValue(a, smtpSortKey);
    const valueB = getMailboxSortValue(b, smtpSortKey);
    const comparison =
      typeof valueA === "number" && typeof valueB === "number"
        ? valueA - valueB
        : String(valueA).localeCompare(String(valueB), undefined, {
            numeric: true,
            sensitivity: "base",
          });

    return smtpSortDirection === "asc" ? comparison : -comparison;
  });
  const mailboxTotalPages = Math.ceil(sortedMailboxRows.length / pageSize);
  const mailboxStartIndex = (currentPageMailbox - 1) * pageSize;
  const displayedMailboxRows = sortedMailboxRows.slice(
    mailboxStartIndex,
    mailboxStartIndex + pageSize
  );
  const formatMailboxDate = (item: any) => {
    const dateValue = getMailboxDateValue(item);
    if (!dateValue) return "-";

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "-";

    return formatUserDateTime(date);
  };
  const getAvatarColor = (index: number) =>
    ["#9c27b0", "#14b8a6", "#f59e0b", "#f87171", "#22c55e", "#a855f7"][
      index % 6
    ];

  const openOauthEdit = (item: any) => {
    setOauthEditing(item);
    setOauthSenderName(item.senderName || "");
    setOauthFullInboxSync(Boolean(item.fullInboxSync));
  };

  const saveOauthConfiguration = async () => {
    if (!oauthEditing || !oauthSenderName.trim()) return;
    setIsSavingOauth(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/OAuth/update-configuration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: oauthEditing.id,
          clientId: Number(effectiveUserId),
          senderName: oauthSenderName.trim(),
          fullInboxSync: oauthFullInboxSync,
        }),
      });
      if (!response.ok) throw new Error("Failed to update OAuth configuration");
      setOauthEditing(null);
      await fetchSmtp();
      setToastMessage("OAuth configuration updated successfully");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (error) {
      console.error(error);
      setToastMessage("Failed to update OAuth configuration");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    } finally {
      setIsSavingOauth(false);
    }
  };

  const deleteOauthConfiguration = async () => {
    if (!oauthDeleteTarget) return;
    setIsDeletingOauth(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/OAuth/delete-configuration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: oauthDeleteTarget.id,
          clientId: Number(effectiveUserId),
        }),
      });
      if (!response.ok) throw new Error("Failed to delete OAuth configuration");
      setOauthDeleteTarget(null);
      await fetchSmtp();
      setToastMessage("OAuth configuration deleted successfully");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (error) {
      console.error(error);
      setToastMessage("Failed to delete OAuth configuration");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    } finally {
      setIsDeletingOauth(false);
    }
  };

  // ── Local pagination for BCC + Domain tables (same control as Campaigns/Schedule) ──
  const [bccPageLocal, setBccPageLocal] = React.useState(1);
  const [bccPageSizeLocal, setBccPageSizeLocal] = React.useState<number | "All">(10);
  const [domainPage, setDomainPage] = React.useState(1);
  const [domainPageSize, setDomainPageSize] = React.useState<number | "All">(10);

  const bccRows: any[] = Array.isArray(sortedBccEmails) ? sortedBccEmails : [];
  const bccTotalPagesLocal =
    bccPageSizeLocal === "All" ? 1 : Math.max(1, Math.ceil(bccRows.length / bccPageSizeLocal));
  const bccPaginatedLocal =
    bccPageSizeLocal === "All"
      ? bccRows
      : bccRows.slice((bccPageLocal - 1) * bccPageSizeLocal, bccPageLocal * bccPageSizeLocal);

  const domainRows: any[] = Array.isArray(sortedDomainData) ? sortedDomainData : [];
  const domainTotalPages =
    domainPageSize === "All" ? 1 : Math.max(1, Math.ceil(domainRows.length / domainPageSize));
  const domainPaginated =
    domainPageSize === "All"
      ? domainRows
      : domainRows.slice((domainPage - 1) * domainPageSize, domainPage * domainPageSize);

  return (
        <div style={{ padding: "24px 28px" }}>
          {!hasMailboxConfig && !smtpListLoading ? (
            <MailConfigurationEmptyState
              onAddMailbox={() => dispatch(openPanel("add-edit-mailbox-modal"))}
              isDemoAccount={isDemoAccount}
            />
          ) : (
          <>
          {/* --- SUB TABS --- */}
          <div className="config-tab-container" style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
            <button
              onClick={() => setConfigTab("mailboxes")}
              className={configTab === "mailboxes" ? "active-config-tab" : "config-tab"}
              style={{ borderRadius: "12px" }}
            >
              Mailboxes
            </button>

            <button
              onClick={() => setConfigTab("bcc")}
              className={configTab === "bcc" ? "active-config-tab" : "config-tab"}
              style={{ borderRadius: "12px" }}
            >
              BCC email management
            </button>

            <button
              onClick={() => setConfigTab("domain")}
              className={configTab === "domain" ? "active-config-tab" : "config-tab"}
              style={{ borderRadius: "12px" }}
            >
              Domain authentication
            </button>

            <button
              onClick={() => setConfigTab("groups")}
              className={configTab === "groups" ? "active-config-tab" : "config-tab"}
              style={{ borderRadius: "12px" }}
            >
              Outgoing groups
            </button>
          </div>
          <div className="data-campaigns-container">
            {/* Mailboxes Section */}
            {configTab === "mailboxes" && (
              <div className="section-wrapper">
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
                  <div>
                    <h2 style={{ color: "#111827", textAlign: "left", fontSize: 22, margin: "0 0 6px", fontWeight: 700 }}>
                      Mailboxes
                    </h2>
                    <p style={{ margin: 0, color: "#4b5563", fontSize: 14 }}>
                      Add and manage your email accounts for sending campaigns securely.
                    </p>
                  </div>

                  {!isDemoAccount && (
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        className="btn-default"
                        onClick={() => setShowCreateGroup(true)}
                        disabled={showCreateGroup}
                      >
                        + Create group
                      </button>
                      <button
                        className="btn-default"
                        onClick={() => dispatch(openPanel("add-edit-mailbox-modal"))}
                      >
                        + Add mailbox
                      </button>
                    </div>
                  )}
                </div>

                {showCreateGroup && (
                  <div style={{ padding: 16, marginBottom: 18, border: "1px solid #bbdfbd", borderRadius: 8, background: "#f7fcf7" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) minmax(280px, 2fr) auto", gap: 12, alignItems: "end" }}>
                      <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Group name</label>
                        <input
                          value={groupName}
                          onChange={(event) => setGroupName(event.target.value)}
                          placeholder="Enter group name"
                          style={{ width: "100%", height: 38, padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Description</label>
                        <input
                          value={groupDescription}
                          onChange={(event) => setGroupDescription(event.target.value)}
                          placeholder="Enter description"
                          style={{ width: "100%", height: 38, padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6 }}
                        />
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" className="button secondary small" onClick={resetGroupForm}>Cancel</button>
                        <button
                          type="button"
                          className="save-button button small"
                          onClick={createOutgoingGroup}
                          disabled={savingGroup || !groupName.trim() || selectedGroupMailboxes.length === 0}
                        >
                          {savingGroup ? "Saving..." : editingGroupId ? "Update group" : "Save group"}
                        </button>
                      </div>
                    </div>
                    <div style={{ marginTop: 10, color: "#4b5563", fontSize: 13 }}>
                      Select mailboxes from the list below. {selectedGroupMailboxes.length} selected.
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
                  {mailboxFilterOptions.map((option) => {
                    const optionKey = option.key as keyof typeof mailboxCounts;
                    const isActive = mailboxFilter === option.key;

                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => {
                          setMailboxFilter(option.key as any);
                          setCurrentPageMailbox(1);
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "9px 16px",
                          borderRadius: 8,
                          border: isActive ? "1px solid #3f9f42" : "1px solid #d8dee6",
                          background: isActive ? "#f0fbf1" : "#fff",
                          color: isActive ? "#2f8f32" : "#374151",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        <span>{option.label}</span>
                        <span style={{ color: isActive ? "#2f8f32" : "#6b7280", fontWeight: 600 }}>
                          {mailboxCounts[optionKey]}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                  <input
                    type="text"
                    className="search-input"
                    style={{ width: 360, height: 38, borderRadius: 6, flexShrink: 0 }}
                    placeholder="Search by email or server"
                    value={mailboxSearch}
                    onChange={(e) => {
                      setMailboxSearch(e.target.value);
                      setCurrentPageMailbox(1);
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <PaginationControls
                      currentPage={currentPageMailbox}
                      totalPages={mailboxTotalPages}
                      totalRecords={filteredMailboxRows.length}
                      pageSize={pageSize}
                      setCurrentPage={setCurrentPageMailbox}
                      setPageSize={(size) => setPageSize(Number(size))}
                      showPageSizeDropdown={true}
                      pageLabel="Page:"
                    />
                  </div>
                </div>

                <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" }}>
                  <table className="contacts-table" style={{ background: "#fff", margin: 0 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        {showCreateGroup && (
                          <th style={{ width: 48, textAlign: "center" }}>
                            <input
                              type="checkbox"
                              aria-label="Select all visible mailboxes"
                              checked={displayedMailboxRows.length > 0 && displayedMailboxRows.every((item: any) => selectedGroupMailboxes.includes(mailboxGroupKey(item)))}
                              onChange={(event) => {
                                const visibleKeys = displayedMailboxRows.map(mailboxGroupKey);
                                setSelectedGroupMailboxes((current) => event.target.checked
                                  ? Array.from(new Set([...current, ...visibleKeys]))
                                  : current.filter((key) => !visibleKeys.includes(key))
                                );
                              }}
                            />
                          </th>
                        )}
                        <th onClick={() => toggleSort("emailAddress", smtpSortKey, setSmtpSortKey, setSmtpSortDirection)} style={{ cursor: "pointer" }}>Email address{renderSortArrow("emailAddress", smtpSortKey, smtpSortDirection)}</th>
                        <th onClick={() => toggleSort("server", smtpSortKey, setSmtpSortKey, setSmtpSortDirection)} style={{ cursor: "pointer" }}>Outgoing{renderSortArrow("server", smtpSortKey, smtpSortDirection)}</th>
                        <th onClick={() => toggleSort("incoming", smtpSortKey, setSmtpSortKey, setSmtpSortDirection)} style={{ cursor: "pointer" }}>Incoming{renderSortArrow("incoming", smtpSortKey, smtpSortDirection)}</th>
                        <th onClick={() => toggleSort("status", smtpSortKey, setSmtpSortKey, setSmtpSortDirection)} style={{ cursor: "pointer" }}>Status{renderSortArrow("status", smtpSortKey, smtpSortDirection)}</th>
                        <th onClick={() => toggleSort("updatedAt", smtpSortKey, setSmtpSortKey, setSmtpSortDirection)} style={{ cursor: "pointer" }}>Last updated{renderSortArrow("updatedAt", smtpSortKey, smtpSortDirection)}</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedMailboxRows.length === 0 ? (
                        <tr>
                          <td colSpan={showCreateGroup ? 7 : 6} style={{ textAlign: "center", padding: "28px 12px", color: "#6b7280" }}>
                            No mailbox configurations found.
                          </td>
                        </tr>
                      ) : (
                        displayedMailboxRows.map((item: any, index: number) => {
                          const inbox = getInbox(item);
                          const oauthMailbox = isOAuthMailbox(item);
                          const provider = getProvider(item);
                          const inboxSyncEnabled = oauthMailbox
                            ? isTrue(item.fullInboxSync)
                            : isTrue(inbox?.fullInboxSync ?? inbox?.FullInboxSync);
                          const mailboxActionKey = `${oauthMailbox ? "oauth" : "smtp"}-${item.id}`;
                          const status = getMailboxStatus(item);
                          const emailAddress = item.fromEmail || item.username || inbox?.emailAddress || "-";
                          const displayName = item.senderName || item.username || "-";
                          const smtpSecurity = item.securityType || item.SecurityType || (item.useSsl || item.usessl ? "SSL" : "None");
                          const statusTheme =
                            status === "Complete"
                              ? { background: "#e8f5e8", color: "#2e7d32" }
                              : status === "SMTP only"
                                ? { background: "#eaf3ff", color: "#1d7fe8" }
                                : oauthMailbox
                                  ? { background: "#f0f7ff", color: "#2563eb" }
                                : { background: "#fdecec", color: "#dc2626" };

                          return (
                            <tr key={mailboxActionKey || index}>
                              {showCreateGroup && (
                                <td style={{ textAlign: "center" }}>
                                  <input
                                    type="checkbox"
                                    aria-label={`Select ${emailAddress}`}
                                    checked={selectedGroupMailboxes.includes(mailboxGroupKey(item))}
                                    onChange={(event) => {
                                      const key = mailboxGroupKey(item);
                                      setSelectedGroupMailboxes((current) => event.target.checked
                                        ? [...current, key]
                                        : current.filter((value) => value !== key)
                                      );
                                    }}
                                  />
                                </td>
                              )}
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <span
                                    style={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: "50%",
                                      background: getAvatarColor(index),
                                      color: "#fff",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: 13,
                                      fontWeight: 700,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {String(emailAddress !== "-" ? emailAddress : displayName).charAt(0).toUpperCase() || "M"}
                                  </span>
                                  <span>
                                    <span style={{ display: "block", color: "#1f2937", fontWeight: 600 }}>{emailAddress}</span>
                                    <span style={{ display: "block", color: "#6b7280", fontSize: 12, marginTop: 2 }}>{displayName}</span>
                                  </span>
                                </div>
                              </td>
                              <td>
                                {oauthMailbox ? (
                                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                    <span style={{ color: "#3f9f42", fontWeight: 700, lineHeight: "18px" }}>{"\u2713"}</span>
                                    <span>
                                      <span style={{ display: "block", color: "#1f2937" }}>{provider}</span>
                                      <span style={{ display: "block", color: "#6b7280", fontSize: 12, marginTop: 2 }}>OAuth</span>
                                    </span>
                                  </div>
                                ) : hasOutgoing(item) ? (
                                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                    <span style={{ color: "#3f9f42", fontWeight: 700, lineHeight: "18px" }}>{"\u2713"}</span>
                                    <span>
                                      <span style={{ display: "block", color: "#1f2937" }}>{item.server || "-"}:{item.port || "-"}</span>
                                      <span style={{ display: "block", color: "#6b7280", fontSize: 12, marginTop: 2 }}>{String(smtpSecurity || "-").toUpperCase()}</span>
                                    </span>
                                  </div>
                                ) : (
                                  <span style={{ color: "#9ca3af" }}>Not added</span>
                                )}
                              </td>
                              <td>
                                {oauthMailbox && inboxSyncEnabled ? (
                                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                    <span style={{ color: "#3f9f42", fontWeight: 700, lineHeight: "18px" }}>{"\u2713"}</span>
                                    <span>
                                      <span style={{ display: "block", color: "#1f2937" }}>{provider}</span>
                                      <span style={{ display: "block", color: "#6b7280", fontSize: 12, marginTop: 2 }}>Connected</span>
                                    </span>
                                  </div>
                                ) : oauthMailbox ? (
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#9ca3af" }}>
                                    <span style={{ width: 14, height: 14, borderRadius: "50%", background: "#9ca3af", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>-</span>
                                    <span>Sync disabled</span>
                                  </div>
                                ) : inbox && inboxSyncEnabled ? (
                                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                    <span style={{ color: "#3f9f42", fontWeight: 700, lineHeight: "18px" }}>{"\u2713"}</span>
                                    <span>
                                      <span style={{ display: "block", color: "#1f2937" }}>{inbox.host || "-"}:{inbox.port || "-"}</span>
                                      <span style={{ display: "block", color: "#6b7280", fontSize: 12, marginTop: 2 }}>{inbox.encryption || "-"}</span>
                                    </span>
                                  </div>
                                ) : inbox ? (
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#9ca3af" }}>
                                    <span style={{ width: 14, height: 14, borderRadius: "50%", background: "#9ca3af", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>-</span>
                                    <span>Sync disabled</span>
                                  </div>
                                ) : (
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#9ca3af" }}>
                                    <span style={{ width: 14, height: 14, borderRadius: "50%", background: "#9ca3af", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>-</span>
                                    <span>Not added</span>
                                  </div>
                                )}
                              </td>
                              <td>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    padding: "4px 9px",
                                    borderRadius: 999,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    ...statusTheme,
                                  }}
                                >
                                  {status}
                                </span>
                              </td>
                              <td style={{ color: "#4b5563", whiteSpace: "nowrap" }}>{formatMailboxDate(item)}</td>
                              <td style={{ position: "relative" }}>
                                <>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <button
                                    className="segment-actions-btn"
                                    type="button"
                                    style={{ border: "none", background: "transparent", cursor: "pointer", padding: "2px 8px", fontSize: 20, color: "#374151" }}
                                    onClick={() =>
                                      setMailboxActionsAnchor(
                                        mailboxActionKey === mailboxActionsAnchor ? null : mailboxActionKey
                                      )
                                    }
                                  >
                                    {"\u22EE"}
                                  </button>
                                </div>
                                {mailboxActionsAnchor === mailboxActionKey && (
                                  <div
                                    className="segment-actions-menu py-[10px]"
                                    style={{
                                      position: "absolute",
                                      right: 0,
                                      top: 32,
                                      background: "#fff",
                                      border: "1px solid #eee",
                                      borderRadius: 6,
                                      boxShadow: "0 2px 16px rgba(0,0,0,0.12)",
                                      zIndex: 101,
                                      minWidth: 160,
                                    }}
                                  >
                                    {!isDemoAccount && (
                                      <button
                                        onClick={() => {
                                          if (oauthMailbox) openOauthEdit(item);
                                          else handleEdit(item);
                                          setMailboxActionsAnchor(null);
                                        }}
                                        style={menuBtnStyle}
                                        className="flex gap-2 items-center"
                                      >
                                        <span style={actionIconStyle}>
                                          <FontAwesomeIcon icon={faEdit} style={{ color: "#3f9f42", fontSize: 20 }} />
                                        </span>
                                        <span className="font-[600]">Edit</span>
                                      </button>
                                    )}
                                    {!isDemoAccount && (
                                      <button
                                        onClick={() => {
                                          if (oauthMailbox) setOauthDeleteTarget(item);
                                          else handleDelete(item.id);
                                          setMailboxActionsAnchor(null);
                                        }}
                                        style={{ ...menuBtnStyle }}
                                        className="flex gap-2 items-center"
                                      >
                                        <span style={actionIconStyle}>
                                          <FontAwesomeIcon icon={faTrashAlt} style={{ color: "#3f9f42", fontSize: 20 }} />
                                        </span>
                                        <span className="font-[600]">Delete</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                                </>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <CommonSidePanel
                  isOpen={showSMTPEditModal}
                  onClose={resetSmtpEditForm}
                  title="Edit SMTP configuration"
                  width={820}
                >
                  <OtherMailboxWizard
                    form={form}
                    setForm={setForm}
                    handleChangeSMTP={handleChangeSMTP}
                    onSaveMailbox={() => handleSubmitSMTP(undefined, editIncludeImap)}
                    outgoingLoading={smtpLoading}
                    incomingLoading={smtpLoading && editIncludeImap}
                    includeImap={editIncludeImap}
                    onIncludeImapChange={setEditIncludeImap}
                    onBackToProviders={resetSmtpEditForm}
                    backButtonLabel="Cancel edit"
                    onCancel={resetSmtpEditForm}
                  />
                </CommonSidePanel>
                <CommonSidePanel
                  isOpen={Boolean(oauthEditing)}
                  onClose={() => !isSavingOauth && setOauthEditing(null)}
                  title={`Edit ${oauthEditing ? getProvider(oauthEditing) : "OAuth"} configuration`}
                  footerContent={
                    <>
                      <button
                        type="button"
                        onClick={() => setOauthEditing(null)}
                        disabled={isSavingOauth}
                        style={lessPriorityButtonStyle}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveOauthConfiguration()}
                        disabled={isSavingOauth || !oauthSenderName.trim()}
                        className="px-5 py-2 rounded-md bg-[#3f9f42] text-white disabled:opacity-60"
                      >
                        {isSavingOauth ? "Saving..." : "Save"}
                      </button>
                    </>
                  }
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Email address</label>
                      <input
                        value={oauthEditing?.fromEmail || ""}
                        disabled
                        style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 6, background: "#f3f4f6" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Sender name</label>
                      <input
                        value={oauthSenderName}
                        onChange={(event) => setOauthSenderName(event.target.value)}
                        style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 6 }}
                        placeholder="Enter sender name"
                      />
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14 }}>
                      <input
                        type="checkbox"
                        checked={oauthFullInboxSync}
                        onChange={(event) => setOauthFullInboxSync(event.target.checked)}
                      />
                      Full inbox sync
                    </label>
                  </div>
                </CommonSidePanel>
                {oauthDeleteTarget && (
                  <div
                    className="fixed inset-0 bg-black/40 flex items-center justify-center z-[99999]"
                    onClick={() => !isDeletingOauth && setOauthDeleteTarget(null)}
                  >
                    <div
                      className="bg-white rounded-xl p-6 w-[440px] max-w-[90vw] shadow-2xl"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <h3 className="text-lg font-semibold mb-3">Delete {getProvider(oauthDeleteTarget)} configuration</h3>
                      <p className="text-sm text-gray-600 mb-6">
                        Are you sure you want to delete {oauthDeleteTarget.fromEmail}?
                      </p>
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setOauthDeleteTarget(null)}
                          disabled={isDeletingOauth}
                          style={lessPriorityButtonStyle}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteOauthConfiguration()}
                          disabled={isDeletingOauth}
                          className="px-5 py-2 rounded-md bg-red-600 text-white disabled:opacity-60"
                        >
                          {isDeletingOauth ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {/* Inbox Edit Modal */}
                <CommonSidePanel
                  isOpen={showIMAPEditModal}
                  onClose={() => {
                    dispatch(closePanel());
                    setEditingInboxId(null);
                    setInboxForm({
                      emailAddress: "",
                      protocol: "IMAP",
                      host: "",
                      port: "",
                      username: "",
                      password: "",
                      encryption: "Auto",
                      fullInboxSync: false,
                    });
                  }}
                  title="Edit inbox configuration"
                  width={500}
                  footerContent={
                    <>
                      <button
                        onClick={() => {
                          dispatch(closePanel());
                          setEditingInboxId(null);
                          setInboxForm({
                            emailAddress: "",
                            protocol: "IMAP",
                            host: "",
                            port: "",
                            username: "",
                            password: "",
                            encryption: "Auto",
                            fullInboxSync: false,
                          });
                        }}
                        style={{
                          padding: "10px 32px",
                          border: "1px solid #ddd",
                          background: "#fff",
                          borderRadius: "24px",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "500",
                          color: "#333",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmitInbox}
                        disabled={inboxLoading}
                        style={{
                          padding: "10px 32px",
                          background: "#fff",
                          color: inboxLoading ? "#ccc" : "#ef4444",
                          border: `1px solid ${inboxLoading ? "#ccc" : "#ef4444"}`,
                          borderRadius: "24px",
                          cursor: inboxLoading ? "not-allowed" : "pointer",
                          fontSize: "14px",
                          fontWeight: "500",
                        }}
                      >
                        {inboxLoading ? "Updating..." : "Update"}
                      </button>
                    </>
                  }
                >
                  <form onSubmit={handleSubmitInbox}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "20px",
                        marginBottom: "24px",
                      }}
                    >
                      <div className="form-group">
                        <label>
                          Email address <span style={{ color: "red" }}>*</span>
                        </label>
                        <input
                          type="email"
                          name="emailAddress"
                          value={inboxForm.emailAddress}
                          onChange={handleChangeInbox}
                          required
                          style={{ width: "100%" }}
                          placeholder="user@example.com"
                        />
                      </div>

                      <div className="form-group">
                        <label>
                          Username <span style={{ color: "red" }}>*</span>
                        </label>
                        <input
                          type="text"
                          name="username"
                          value={inboxForm.username}
                          onChange={handleChangeInbox}
                          required
                          style={{ width: "100%" }}
                          placeholder="username"
                        />
                      </div>

                      <div className="form-group">
                        <label>
                          Host <span style={{ color: "red" }}>*</span>
                        </label>
                        <input
                          type="text"
                          name="host"
                          value={inboxForm.host}
                          onChange={handleChangeInbox}
                          required
                          style={{ width: "100%" }}
                          placeholder="imap.gmail.com"
                        />
                      </div>

                      <div className="form-group">
                        <label>
                          Port <span style={{ color: "red" }}>*</span>
                        </label>
                        <input
                          type="number"
                          name="port"
                          value={inboxForm.port}
                          onChange={handleChangeInbox}
                          required
                          style={{ width: "100%" }}
                          placeholder="993"
                        />
                      </div>

                      <div className="form-group">
                        <label>
                          Password <span style={{ color: "red" }}>*</span>
                        </label>
                        <input
                          type="password"
                          name="password"
                          value={inboxForm.password}
                          onChange={handleChangeInbox}
                          required
                          style={{ width: "100%" }}
                          placeholder="********"
                        />
                      </div>

                      <div className="form-group">
                        <label>Encryption</label>
                        <select
                          name="encryption"
                          value={inboxForm.encryption}
                          onChange={handleChangeInbox}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            fontSize: "14px",
                            backgroundColor: "white",
                          }}
                        >
                          <option value="None">None</option>
                          <option value="SSL/TLS">SSL/TLS</option>
                          <option value="STARTTLS">STARTTLS</option>
                          <option value="Auto">Auto</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", marginTop: "16px" }}>
                      <input
                        type="checkbox"
                        id="fullInboxSync"
                        name="fullInboxSync"
                        checked={inboxForm.fullInboxSync}
                        onChange={handleChangeInbox}
                        style={{ marginRight: "8px" }}
                      />
                      <label htmlFor="fullInboxSync" style={{ marginBottom: 0, cursor: "pointer" }}>
                        Full inbox sync
                      </label>
                    </div>
                  </form>
                </CommonSidePanel>
              </div>
            )}

            {configTab === "groups" && (
              <div className="section-wrapper">
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
                  <div>
                    <h2 style={{ color: "#111827", textAlign: "left", fontSize: 22, margin: "0 0 6px", fontWeight: 700 }}>
                      Outgoing groups
                    </h2>
                    <p style={{ margin: 0, color: "#4b5563", fontSize: 14 }}>
                      Group SMTP, Gmail and Outlook mailboxes for outgoing mail.
                    </p>
                  </div>
                </div>

                {groupsLoading ? (
                  <div style={{ padding: 24, color: "#6b7280" }}>Loading groups...</div>
                ) : outgoingGroups.length === 0 ? (
                  <div style={{ padding: 32, border: "1px dashed #d1d5db", borderRadius: 10, textAlign: "center", color: "#6b7280" }}>
                    No outgoing groups created yet.
                  </div>
                ) : (
                  <div style={{ overflow: "visible", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" }}>
                    <table className="contacts-table" style={{ background: "#fff", margin: 0 }}>
                      <thead>
                        <tr style={{ background: "#f8fafc" }}>
                          <th>Group name</th>
                          <th>Description</th>
                          <th>Mailboxes</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outgoingGroups.map((group: any) => (
                          <tr key={group.id}>
                            <td style={{ fontWeight: 600 }}>{group.name}</td>
                            <td style={{ color: "#6b7280" }}>{group.description || "-"}</td>
                            <td>
                              <button
                                type="button"
                                onClick={() => setViewGroupMailboxes(group)}
                                title="View group mailboxes"
                                style={{ border: "none", background: "transparent", color: "#3f9f42", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 6px" }}
                              >
                                <FontAwesomeIcon icon={faEnvelope} style={{ fontSize: 19 }} />
                                <span style={{ fontSize: 13, fontWeight: 600 }}>{(group.members || []).length}</span>
                              </button>
                            </td>
                            <td>
                              <div style={{ position: "relative", display: "inline-block" }}>
                              <button
                                className="segment-actions-btn"
                                type="button"
                                onClick={() => setGroupActionsAnchor(groupActionsAnchor === group.id ? null : group.id)}
                                style={{ border: "none", background: "transparent", cursor: "pointer", padding: "2px 8px", fontSize: 20, color: "#374151" }}
                              >
                                {"\u22EE"}
                              </button>
                              {groupActionsAnchor === group.id && (
                                <div
                                  className="segment-actions-menu py-[10px]"
                                  style={{ position: "absolute", left: 24, top: 4, background: "#fff", border: "1px solid #eee", borderRadius: 6, boxShadow: "0 2px 16px rgba(0,0,0,0.12)", zIndex: 1000, minWidth: 160 }}
                                >
                                  <button
                                    type="button"
                                    style={menuBtnStyle}
                                    className="flex gap-2 items-center"
                                    onClick={() => {
                                      setGroupActionsAnchor(null);
                                      editOutgoingGroup(group);
                                    }}
                                  >
                                    <span style={actionIconStyle}><FontAwesomeIcon icon={faEdit} style={{ color: "#3f9f42", fontSize: 20 }} /></span>
                                    <span className="font-[600]">Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    style={menuBtnStyle}
                                    className="flex gap-2 items-center"
                                    onClick={() => {
                                      setGroupActionsAnchor(null);
                                      setGroupDeleteTarget(group);
                                    }}
                                  >
                                    <span style={actionIconStyle}><FontAwesomeIcon icon={faTrashAlt} style={{ color: "#3f9f42", fontSize: 20 }} /></span>
                                    <span className="font-[600]">Delete</span>
                                  </button>
                                </div>
                              )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {groupDeleteTarget && (
                  <div
                    className="fixed inset-0 bg-black/40 flex items-center justify-center z-[99999]"
                    onClick={() => !deletingGroup && setGroupDeleteTarget(null)}
                  >
                    <div className="bg-white rounded-xl p-6 w-[440px] max-w-[90vw] shadow-2xl" onClick={(event) => event.stopPropagation()}>
                      <h3 className="text-lg font-semibold mb-3">Delete outgoing group</h3>
                      <p className="text-sm text-gray-600 mb-6">
                        Are you sure you want to delete {groupDeleteTarget.name}?
                      </p>
                      <div className="flex justify-end gap-3">
                        <button type="button" style={lessPriorityButtonStyle} disabled={deletingGroup} onClick={() => setGroupDeleteTarget(null)}>
                          Cancel
                        </button>
                        <button type="button" className="px-5 py-2 rounded-md bg-red-600 text-white disabled:opacity-60" disabled={deletingGroup} onClick={deleteOutgoingGroup}>
                          {deletingGroup ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {viewGroupMailboxes && (
                  <div
                    className="fixed inset-0 bg-black/40 flex items-center justify-center z-[99999]"
                    onClick={() => setViewGroupMailboxes(null)}
                  >
                    <div
                      className="bg-white rounded-xl p-6 w-[500px] max-w-[90vw] shadow-2xl"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div style={{ marginBottom: 18 }}>
                        <div>
                          <h3 className="text-lg font-semibold" style={{ margin: 0 }}>{viewGroupMailboxes.name}</h3>
                          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 13 }}>Group mailboxes</p>
                        </div>
                      </div>
                      <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", maxHeight: 360, overflowY: "auto" }}>
                        {(viewGroupMailboxes.members || []).map((member: any) => (
                          <div
                            key={`${member.provider}:${member.outboxId}`}
                            style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderBottom: "1px solid #eef0f3" }}
                          >
                            <span style={{ width: 34, height: 34, borderRadius: "50%", background: "#eef8ef", color: "#3f9f42", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <FontAwesomeIcon icon={faEnvelope} />
                            </span>
                            <span style={{ flex: 1, color: "#1f2937", fontWeight: 600 }}>{groupMemberLabel(member).replace(` (${member.provider})`, "")}</span>
                            <span style={{ color: "#6b7280", fontSize: 12 }}>{member.provider}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
                        <button type="button" style={lessPriorityButtonStyle} onClick={() => setViewGroupMailboxes(null)}>Close</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* BCC Email Management Section */}
            {configTab === "bcc" && (
              <div className="section-wrapper">
                {/* <h2 style={{ color: "black", textAlign: "left" }} className="section-title">
                  BCC email management
                </h2> */}
                <div style={{  color: "#555", }}>
                  Add BCC email addresses to receive copies of all sent emails.
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: 16,
                    gap: 16,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <PaginationControls
                      currentPage={bccPageLocal}
                      totalPages={bccTotalPagesLocal}
                      totalRecords={bccRows.length}
                      pageSize={bccPageSizeLocal}
                      setCurrentPage={setBccPageLocal}
                      setPageSize={(s) => {
                        setBccPageSizeLocal(s);
                        setBccPageLocal(1);
                      }}
                      pageSizeOptions={[10, 30, 50, "All"]}
                    />
                  </div>
                  <button
                    className="btn-default"
                    style={{ flexShrink: 0 }}
                    // onClick={handleAddBcc}
                    onClick={() =>
                     // setShowPopup(true)
                      dispatch(openPanel("bcc-email-modal"))
                    }
                    //disabled={bccLoading || !newBccEmail}
                    disabled={bccLoading} // disable only during API call
                  >
                    {bccLoading ? "Adding..." : "+ Add BCC"}
                  </button>
                </div>

                {/* {bccError && <div style={{ color: "#c00", marginBottom: 16 }}>{bccError}</div>} */}

                <table className="contacts-table" style={{ background: "#fff" }}>
                  <thead>
                    <tr>
                      <th onClick={() => toggleSort("bccEmailAddress", bccSortKey, setBccSortKey, setBccSortDirection)} style={{ cursor: "pointer" }}>BCC email address{renderSortArrow("bccEmailAddress", bccSortKey, bccSortDirection)}</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bccLoading && safeBccEmails.length === 0 ? (
                      <tr>
                        <td colSpan={2} style={{ textAlign: "center" }}>
                          Loading BCC emails...
                        </td>
                      </tr>
                    ) : bccPaginatedLocal.length === 0 ? (
                      <tr>
                        <td colSpan={2} style={{ textAlign: "center" }}>
                          No BCC emails configured.
                        </td>
                      </tr>
                    ) : (
                      bccPaginatedLocal.map((email: any) => (
                        <tr key={email.id}>
                          <td>{email.bccEmailAddress}</td>
                          <td>
                            {!isDemoAccount && (
                              <button
                                onClick={() =>
                                  appModal.showConfirm(
                                    "Are you sure you want to delete this BCC email? This action cannot be undone.",
                                    () => handleDeleteBcc(email.id),
                                    "Delete BCC email",
                                    "Delete",
                                    "Cancel"
                                  )
                                }
                                disabled={bccLoading}
                                style={{
                                  ...lessPriorityButtonStyle,
                                  padding: "6px 12px",
                                  fontSize: "14px",
                                  borderRadius: "12px",
                                  cursor: bccLoading ? "not-allowed" : "pointer",
                                }}
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {/* Popup Modal */}
                <CommonSidePanel
                  isOpen={showBCCEmailModal}
                  onClose={() => 
                    //setShowPopup(false)
                    dispatch(closePanel())

                  }
                  title="Add BCC email"
                  footerContent={
                    <>
                      <button
                      className="btn-muted"
                        onClick={() => 
                          //setShowPopup(false)
                          dispatch(closePanel())

                        }
                        style={{
                          padding: "10px 32px",
                          border: "1px solid #ddd",
                          borderRadius: "12px",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "500",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                      className="btn-default"
                        onClick={handleSave}
                        disabled={bccLoading || !newBccEmail}
                        style={{
                          padding: "10px 32px",
                          borderRadius: "12px",
                          cursor: bccLoading || !newBccEmail ? "not-allowed" : "pointer",
                          fontSize: "14px",
                          fontWeight: "500",
                        }}
                      >
                        {bccLoading ? "Adding..." : "Add"}
                      </button>
                    </>
                  }
                >
                  <div className="form-group">
                    <label>
                      BCC email address <span style={{ color: "red" }}>*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="Enter BCC email address"
                      value={newBccEmail}
                      onChange={(e) => setNewBccEmail(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        fontSize: "14px",
                      }}
                    />
                  </div>
                </CommonSidePanel>
              </div>
            )}

            {/* Domain Authentication Section */}
            {configTab === "domain" && (
              <div className="section-wrapper">
                <div style={{ marginBottom: "20px", color: "#555" }}>
                  Configure domain authentication settings for improved email deliverability.
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: 16,
                    gap: 16,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <PaginationControls
                      currentPage={domainPage}
                      totalPages={domainTotalPages}
                      totalRecords={domainRows.length}
                      pageSize={domainPageSize}
                      setCurrentPage={setDomainPage}
                      setPageSize={(s) => {
                        setDomainPageSize(s);
                        setDomainPage(1);
                      }}
                      pageSizeOptions={[10, 30, 50, "All"]}
                    />
                  </div>
                </div>

                <table className="contacts-table" style={{ background: "#fff" }}>
                  <thead>
                    <tr>
                      <th onClick={() => toggleSort("domain", domainSortKey, setDomainSortKey, setDomainSortDirection)} style={{ cursor: "pointer" }}>Domain{renderSortArrow("domain", domainSortKey, domainSortDirection)}</th>
                      <th onClick={() => toggleSort("ownerAuth", domainSortKey, setDomainSortKey, setDomainSortDirection)} style={{ cursor: "pointer" }}>Domain owner authentication{renderSortArrow("ownerAuth", domainSortKey, domainSortDirection)}</th>
                      <th onClick={() => toggleSort("status", domainSortKey, setDomainSortKey, setDomainSortDirection)} style={{ cursor: "pointer" }}>Domain status{renderSortArrow("status", domainSortKey, domainSortDirection)}</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fetchingDomain ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center" }}>
                          Loading domain data...
                        </td>
                      </tr>
                    ) : domainPaginated.length > 0 ? (
                      domainPaginated.map((domain: any, index: number) => (
                        <tr key={domain.emailDomainId || index}>
                          <td>{domain.domain || "-"}</td>
                          <td>
                            {domain.domainverified ? (
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <span style={{ color: "#28a745", fontSize: "14px" }}>{"\u2713"}</span>
                                <span style={{ color: "#28a745", fontSize: "14px" }}>Verified</span>
                              </div>
                            ) : (
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ color: "#dc3545", fontSize: "14px" }}>Pending</span>
                                <span
                                  style={{
                                    color: "#007bff",
                                    fontSize: "14px",
                                    cursor: "pointer",
                                    textDecoration: "underline",
                                  }}
                                  onClick={() => {
                                    setSelectedDomain(domain);
                                    //setShowValidatePopup(true);
                                    dispatch(openPanel("validate-modal"));
                                  }}
                                >
                                  Validate records
                                </span>
                              </div>
                            )}
                          </td>
                          <td>
                            <DomainAuthColumn 
                              domain={domain} 
                              onValidateClick={handleDomainValidateClick} 
                            />
                          </td>
                          <td>
                            <button
                              onClick={() => handleDomainDeleteClick(domain)}
                              style={{
                                ...lessPriorityButtonStyle,
                                padding: "6px 12px",
                                fontSize: "14px",
                                borderRadius: "12px",
                                cursor: "pointer",
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center" }}>
                          No domains configured.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* OTP Modal */}
                <OtpModal
                  isOpen={showOtpModal}
                  onClose={() => setShowOtpModal(false)}
                  emailDomain={selectedOtpDomain?.emailDomain || ''}
                  onSubmit={async (otp) => {
                    try {
                      const response = await fetch(
                        `${API_BASE_URL}/api/domain-verification/domain-verify-email-otp?Otp=${encodeURIComponent(otp)}&email=${encodeURIComponent(selectedOtpDomain.emailDomain)}&clientId=${effectiveUserId}`,
                        {
                          method: 'POST',
                          headers: {
                            'accept': '*/*'
                          },
                          body: ''
                        }
                      );
                      
                      if (response.ok) {
                        appModal.showSuccess('Email verification successful!');
                        fetchDomainData(); // Refresh domain data
                      } else {
                        appModal.showError('Invalid verification code. Please try again.');
                      }
                    } catch (error) {
                      console.error('Error verifying OTP:', error);
                      appModal.showError('Error verifying code. Please check your connection.');
                    }
                  }}
                />

                {/* Validate Records Modal */}
                <ValidateRecordsModal
                  //isOpen={showValidatePopup}
                  isOpen={showValidateModal}
                  onClose={() => {
                    //setShowValidatePopup(false);
                    dispatch(closePanel());
                  }}
                  selectedDomain={selectedDomain}
                  onValidate={(domain) => {
                    console.log('Validate records for:', domain.emailDomain);
                    // Refresh domain data after validation
                    setTimeout(() => fetchDomainData(), 1000);
                  }}
                  showSuccess={appModal.showSuccess}
                  showError={appModal.showError}
                  refreshDomainData={() => setTimeout(() => fetchDomainData(), 1000)}
                  effectiveUserId={effectiveUserId}
                />
              </div>
            )}
          </div>
          </>
          )}

          {/* Add/Edit Mailbox Modal - always mounted so the empty-state CTA can open it */}
          <AddMailboxModal
            isOpen={showAddEditMailBoxModal}
            onClose={() => {
              dispatch(closePanel());
              setEditingId(null);
            }}
            editingId={editingId}
            form={form}
            setForm={setForm}
            handleChangeSMTP={handleChangeSMTP}
            handleSubmitSMTP={handleSubmitSMTP}
            smtpLoading={smtpLoading}
            setEditingId={setEditingId}
            effectiveUserId={effectiveUserId!!}
            token={token}
            onSuccess={(message) => {
              setToastMessage(message);
              setShowSuccessToast(true);
              setTimeout(() => setShowSuccessToast(false), 6000);
              fetchSmtp();
              fetchInboxCredentials();
            }}
            onError={(message) => {
              setToastMessage(message);
              setShowErrorToast(true);
              setTimeout(() => setShowErrorToast(false), 6000);
            }}
          />

          {/* SMTP OTP Modal */}
          {showSmtpOtpModal && (
            <div
              style={{
                position: "fixed",
                zIndex: 99999,
                inset: 0,
                background: "rgba(0,0,0,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  background: "#fff",
                  padding: "24px",
                  borderRadius: "8px",
                  width: "400px",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ marginBottom: 16, color: "#333" }}>Verify SMTP email</h3>
                <p style={{ marginBottom: 16, color: "#666" }}>
                  Please enter the OTP sent to {smtpOtpEmail}
                </p>
                <input
                  type="text"
                  placeholder="Enter OTP"
                  style={{
                    width: "100%",
                    padding: "8px",
                    marginBottom: "16px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const otp = (e.target as HTMLInputElement).value;
                      if (otp) {
                        handleSmtpOtpVerify(otp);
                      }
                    }
                  }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button
                    className="button secondary small"
                    onClick={() => {
                      setShowSmtpOtpModal(false);
                      setForm({
                        server: "",
                        port: "",
                        username: "",
                        password: "",
                        fromEmail: "",
                        senderName: "",
                        usessl: "Auto",
                        incomingServer: "",
                        incomingPort: "",
                        fullInboxSync: false,
                        incomingSecurityType: "Auto",
                      });
                      dispatch(closePanel());
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="save-button button small"
                    onClick={() => {
                      const otpInput = document.querySelector('input[placeholder="Enter OTP"]') as HTMLInputElement;
                      if (otpInput?.value) {
                        handleSmtpOtpVerify(otpInput.value);
                      }
                    }}
                    disabled={smtpOtpVerifying}
                  >
                    {smtpOtpVerifying ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
  );
};

export default MailConfiguration;
