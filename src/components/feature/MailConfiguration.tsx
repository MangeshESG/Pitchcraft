import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrashAlt } from "@fortawesome/free-regular-svg-icons";
import AddMailboxModal from "../common/AddMailboxModal";
import OtherMailboxWizard from "../common/OtherMailboxWizard";
import CommonSidePanel from "../common/CommonSidePanel";
import PaginationControls from "./PaginationControls";
import OtpModal from "./OtpModal";
import ValidateRecordsModal from "./ValidateRecordsModal";
import DomainAuthColumn from "./DomainAuthColumn";
import API_BASE_URL from "../../config";
import { closePanel, openPanel } from "../../slices/panelSlice";

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
  selectedDomain,}) => {
  const [mailboxFilter, setMailboxFilter] = React.useState<
    "all" | "smtp" | "imap" | "notConfigured"
  >("all");
  const [editIncludeImap, setEditIncludeImap] = React.useState(false);

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
  const hasOutgoing = (item: any) =>
    Boolean(item?.server || item?.fromEmail || item?.username || item?.senderName);
  const hasIncoming = (item: any) => Boolean(getInbox(item));
  const getMailboxStatus = (item: any) => {
    const outgoing = hasOutgoing(item);
    const incoming = hasIncoming(item);

    if (outgoing && incoming) return "Complete";
    if (outgoing) return "SMTP Only";
    if (incoming) return "IMAP Only";
    return "Not Configured";
  };
  const mailboxFilterOptions = [
    { key: "all", label: "All Mailboxes" },
    { key: "smtp", label: "SMTP Only" },
    { key: "imap", label: "IMAP (Incoming)" },
    { key: "notConfigured", label: "Not Configured" },
  ];
  const mailboxCounts = {
    all: filteredMailboxes.length,
    smtp: filteredMailboxes.filter((item: any) => hasOutgoing(item) && !hasIncoming(item)).length,
    imap: filteredMailboxes.filter((item: any) => hasIncoming(item)).length,
    notConfigured: filteredMailboxes.filter(
      (item: any) => !hasOutgoing(item) && !hasIncoming(item)
    ).length,
  };
  const filteredMailboxRows = filteredMailboxes.filter((item: any) => {
    if (mailboxFilter === "smtp") return hasOutgoing(item) && !hasIncoming(item);
    if (mailboxFilter === "imap") return hasIncoming(item);
    if (mailboxFilter === "notConfigured") return !hasOutgoing(item) && !hasIncoming(item);
    return true;
  });
  const mailboxTotalPages = Math.ceil(filteredMailboxRows.length / pageSize);
  const mailboxStartIndex = (currentPageMailbox - 1) * pageSize;
  const displayedMailboxRows = filteredMailboxRows.slice(
    mailboxStartIndex,
    mailboxStartIndex + pageSize
  );
  const formatMailboxDate = (item: any) => {
    const dateValue =
      item?.updatedAt || item?.createdAt || item?.inbox?.updatedAt || item?.inbox?.createdAt;
    if (!dateValue) return "-";

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const getAvatarColor = (index: number) =>
    ["#9c27b0", "#14b8a6", "#f59e0b", "#f87171", "#22c55e", "#a855f7"][
      index % 6
    ];

  return (
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
                    <button
                      className="save-button button auto-width small d-flex justify-between align-center"
                      style={{ borderRadius: "8px", background: "#3f9f42", color: "#fff", border: "none" }}
                      onClick={() => {
                        dispatch(openPanel("add-edit-mailbox-modal"));
                      }}
                    >
                      + Add mailbox
                    </button>
                  )}
                </div>

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

                <div style={{ marginBottom: 16 }}>
                  <input
                    type="text"
                    className="search-input"
                    style={{ width: 360, height: 38, borderRadius: 6 }}
                    placeholder="Search by email or server"
                    value={mailboxSearch}
                    onChange={(e) => {
                      setMailboxSearch(e.target.value);
                      setCurrentPageMailbox(1);
                    }}
                  />
                </div>

                <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" }}>
                  <table className="contacts-table" style={{ background: "#fff", margin: 0 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        <th>Email Address</th>
                        <th onClick={() => toggleSort("server", smtpSortKey, setSmtpSortKey, setSmtpSortDirection)} style={{ cursor: "pointer" }}>Outgoing (SMTP){renderSortArrow("server", smtpSortKey, smtpSortDirection)}</th>
                        <th>Incoming (IMAP)</th>
                        <th>Status</th>
                        <th>Last Updated</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedMailboxRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center", padding: "28px 12px", color: "#6b7280" }}>
                            No mailbox configurations found.
                          </td>
                        </tr>
                      ) : (
                        displayedMailboxRows.map((item: any, index: number) => {
                          const inbox = getInbox(item);
                          const status = getMailboxStatus(item);
                          const emailAddress = item.fromEmail || item.username || inbox?.emailAddress || "-";
                          const displayName = item.senderName || item.username || "-";
                          const smtpSecurity = item.securityType || item.SecurityType || (item.useSsl || item.usessl ? "SSL" : "None");
                          const statusTheme =
                            status === "Complete"
                              ? { background: "#e8f5e8", color: "#2e7d32" }
                              : status === "SMTP Only"
                                ? { background: "#eaf3ff", color: "#1d7fe8" }
                                : { background: "#fdecec", color: "#dc2626" };

                          return (
                            <tr key={item.id || index}>
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
                                {hasOutgoing(item) ? (
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
                                {inbox ? (
                                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                    <span style={{ color: "#3f9f42", fontWeight: 700, lineHeight: "18px" }}>{"\u2713"}</span>
                                    <span>
                                      <span style={{ display: "block", color: "#1f2937" }}>{inbox.host || "-"}:{inbox.port || "-"}</span>
                                      <span style={{ display: "block", color: "#6b7280", fontSize: 12, marginTop: 2 }}>{inbox.encryption || "-"}</span>
                                    </span>
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
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <button
                                    className="segment-actions-btn"
                                    type="button"
                                    style={{ border: "none", background: "transparent", cursor: "pointer", padding: "2px 8px", fontSize: 20, color: "#374151" }}
                                    onClick={() =>
                                      setMailboxActionsAnchor(
                                        `smtp-${item.id}` === mailboxActionsAnchor ? null : `smtp-${item.id}`
                                      )
                                    }
                                  >
                                    {"\u22EE"}
                                  </button>
                                </div>
                                {mailboxActionsAnchor === `smtp-${item.id}` && (
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
                                          handleEdit(item);
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
                                          handleDelete(item.id);
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
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 14 }}>
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
                {/* Add/Edit Mailbox Modal */}
                <AddMailboxModal
                  //isOpen={openModals}
                  isOpen={showAddEditMailBoxModal}
                  onClose={() => {
                    //handleModalClose("modal-add-mailbox");
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
                  title="Edit Inbox configuration"
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
                          Email Address <span style={{ color: "red" }}>*</span>
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
                      <h3 style={{ marginBottom: 16, color: "#333" }}>Verify SMTP Email</h3>
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
                            //handleModalClose("modal-add-mailbox");
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
                  {/* <input
                    type="email"
                    className="search-input"
                    style={{ width: 340 }}
                    placeholder="Enter BCC email address"
                    value={newBccEmail}
                    onChange={(e) => setNewBccEmail(e.target.value)}
                  /> */}
                  <button
                    className="save-button button auto-width small d-flex justify-between align-center mt-10"
                    style={{ marginLeft: "auto", borderRadius: "12px" }}
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
                    ) : paginatedBccEmails.length === 0 ? (
                      <tr>
                        <td colSpan={2} style={{ textAlign: "center" }}>
                          No BCC emails configured.
                        </td>
                      </tr>
                    ) : (
                      paginatedBccEmails.map((email) => (
                        <tr key={email.id}>
                          <td>{email.bccEmailAddress}</td>
                          <td>
                            {!isDemoAccount && (
                              <button
                                className="button secondary small"
                                onClick={() => handleDeleteBcc(email.id)}
                                disabled={bccLoading}
                                style={{
                                  padding: "6px 12px",
                                  fontSize: "14px",
                                  background: "#dc3545",
                                  color: "#fff",
                                  border: "none",
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
                <PaginationControls
                  currentPage={bccPage}
                  totalPages={totalPagesBCC}
                  totalRecords={sortedBccEmails.length}
                  pageSize={pageSize}
                  setCurrentPage={setBccPage}
                   setPageSize={(size) => setPageSize(Number(size))}
                   showPageSizeDropdown={true}
                   pageLabel="Page:"
                />
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
                        onClick={() => 
                          //setShowPopup(false)
                          dispatch(closePanel())

                        }
                        style={{
                          padding: "10px 32px",
                          border: "1px solid #ddd",
                          background: "#fff",
                          borderRadius: "12px",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "500",
                          color: "#333",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={bccLoading || !newBccEmail}
                        style={{
                          padding: "10px 32px",
                          background: "#fff",
                          color: bccLoading || !newBccEmail ? "#ccc" : "#ef4444",
                          border: `1px solid ${bccLoading || !newBccEmail ? "#ccc" : "#ef4444"}`,
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
                    ) : sortedDomainData.length > 0 ? (
                      sortedDomainData.map((domain, index) => (
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
                                  Validate Records
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
                                padding: "6px 12px",
                                fontSize: "14px",
                                background: "#dc3545",
                                color: "#fff",
                                border: "none",
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
                    console.log('Validate Records for:', domain.emailDomain);
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
  );
};

export default MailConfiguration;
