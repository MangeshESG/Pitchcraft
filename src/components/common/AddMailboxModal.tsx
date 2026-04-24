import React, { useState } from "react";
import CommonSidePanel from "./CommonSidePanel";
import API_BASE_URL from "../../config";

interface SmtpForm {
  server: string;
  port: string;
  username: string;
  password: string;
  fromEmail: string;
  senderName: string;
  usessl: string;
}

interface AddMailboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingId: any;
  form: SmtpForm;
  setForm: React.Dispatch<React.SetStateAction<SmtpForm>>;
  handleChangeSMTP: (e: any) => void;
  handleSubmitSMTP: (e: any) => void;
  smtpLoading: boolean;
  setEditingId: React.Dispatch<React.SetStateAction<any>>;
  effectiveUserId: string;
  token?: string | null;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const AddMailboxModal: React.FC<AddMailboxModalProps> = ({
  isOpen,
  onClose,
  editingId,
  form,
  setForm,
  handleChangeSMTP,
  handleSubmitSMTP,
  smtpLoading,
  setEditingId,
  effectiveUserId,
  token,
  onSuccess,
  onError,
}) => {
  const [mainTab, setMainTab] = useState<"smtp" | "inbox">("smtp");
  const [inboxSubTab, setInboxSubTab] = useState<"imap" | "gmail" | "outlook" | "office365">("imap");
  const [imapForm, setImapForm] = useState({
    emailAddress: "",
    host: "",
    port: "",
    useSSL: true,
    username: "",
    password: ""
  });
  const [imapLoading, setImapLoading] = useState(false);
  const [pop3Loading, setPop3Loading] = useState(false);
  const [gmailSenderName, setGmailSenderName] = useState("");
  const [outlookSenderName, setOutlookSenderName] = useState("");
  const [outlookLoading, setOutlookLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<"gmail" | "outlook" | null>(null);

  const handleImapChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setImapForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleImapSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setImapLoading(true);
    
    try {
      const payload = {
        clientId: parseInt(effectiveUserId) || 0,
        emailAddress: imapForm.emailAddress,
        protocol: "IMAP",
        host: imapForm.host,
        port: parseInt(imapForm.port) || 993,
        useSSL: imapForm.useSSL,
        username: imapForm.username,
        password: imapForm.password,
        syncIntervalMinutes: 1
      };
      
      const response = await fetch(
        `${API_BASE_URL}/api/Inbox/Create-Inboxcredentials`,
        {
          method: 'POST',
          headers: {
            'accept': '*/*',
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
          },
          body: JSON.stringify(payload)
        }
      );
      
      if (response.ok) {
        onSuccess("IMAP configuration added successfully!");
        setImapForm({
          emailAddress: "",
          host: "",
          port: "",
          useSSL: true,
          username: "",
          password: ""
        });
        handleClose();
      } else {
        const errorData = await response.text();
        onError(errorData || "Failed to add IMAP configuration");
      }
    } catch (error) {
      console.error('Error adding IMAP configuration:', error);
      onError("Error adding IMAP configuration. Please check your connection.");
    } finally {
      setImapLoading(false);
    }
  };

  const handleGmailConnect = () => {
    if (!gmailSenderName.trim()) {
      onError("Please enter sender name for Gmail");
      return;
    }

    setPop3Loading(true);
    
    // Open Gmail OAuth in a popup window
    const width = 600;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    const popup = window.open(
      `${API_BASE_URL}/api/OAuth/Gmail_login?clientId=${effectiveUserId}&SenderName=${encodeURIComponent(gmailSenderName)}`,
      'Gmail Authentication',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
    
    // Check if popup was blocked
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      onError('Popup was blocked. Please allow popups for this site.');
      setPop3Loading(false);
      return;
    }
    
    // Listen for messages from the popup
    const handleMessage = (event: MessageEvent) => {
      // Check for both string and object format
      if (event.data === 'gmail-connected' || event.data.type === 'GMAIL_CONNECTED') {
        // Close the popup
        if (popup && !popup.closed) {
          popup.close();
        }
        
        setPop3Loading(false);
        onSuccess('Gmail connected successfully!');
        handleClose();
        
        // Clean up event listener
        window.removeEventListener('message', handleMessage);
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // Monitor popup window (fallback)
    const checkPopup = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkPopup);
        setPop3Loading(false);
        window.removeEventListener('message', handleMessage);
      }
    }, 500);
  };

  const handleOutlookConnect = () => {
    if (!outlookSenderName.trim()) {
      onError("Please enter sender name for Outlook");
      return;
    }

    setOutlookLoading(true);
    
    // Open Outlook OAuth in a popup window
    const width = 600;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    const popup = window.open(
      `${API_BASE_URL}/api/OAuth/Outlook_login?clientId=${effectiveUserId}&SenderName=${encodeURIComponent(outlookSenderName)}`,
      'Outlook Authentication',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
    
    // Check if popup was blocked
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      onError('Popup was blocked. Please allow popups for this site.');
      setOutlookLoading(false);
      return;
    }
    
    // Listen for messages from the popup
    const handleMessage = (event: MessageEvent) => {
      // Check for both string and object format
      if (event.data === 'outlook-connected' || event.data.type === 'OUTLOOK_CONNECTED') {
        // Close the popup
        if (popup && !popup.closed) {
          popup.close();
        }
        
        setOutlookLoading(false);
        onSuccess('Outlook connected successfully!');
        handleClose();
        
        // Clean up event listener
        window.removeEventListener('message', handleMessage);
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // Monitor popup window (fallback)
    const checkPopup = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkPopup);
        setOutlookLoading(false);
        window.removeEventListener('message', handleMessage);
      }
    }, 500);
  };

  const handleClose = () => {
    setForm({
      server: "",
      port: "",
      username: "",
      password: "",
      fromEmail: "",
      senderName: "",
      usessl: "nossl",
    });
    setImapForm({
      emailAddress: "",
      host: "",
      port: "",
      useSSL: true,
      username: "",
      password: ""
    });
    setGmailSenderName("");
    setOutlookSenderName("");
    setSelectedProvider(null);
    setEditingId(null);
    setMainTab("smtp");
    setInboxSubTab("imap");
    onClose();
  };

  return (
    <CommonSidePanel
      isOpen={isOpen}
      onClose={handleClose}
      title={editingId ? "Edit mailbox" : "Add mailbox"}
      footerContent={
        <>
          <button
            type="button"
            onClick={handleClose}
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
          {(mainTab === "smtp" || (mainTab === "inbox" && inboxSubTab === "imap")) && (
            <button
              onClick={mainTab === "smtp" ? handleSubmitSMTP : handleImapSubmit}
              disabled={mainTab === "smtp" ? smtpLoading : imapLoading}
              style={{
                padding: "10px 32px",
                background: "#fff",
                color: (mainTab === "smtp" ? smtpLoading : imapLoading) ? "#ccc" : "#ef4444",
                border: `1px solid ${(mainTab === "smtp" ? smtpLoading : imapLoading) ? "#ccc" : "#ef4444"}`,
                borderRadius: "24px",
                cursor: (mainTab === "smtp" ? smtpLoading : imapLoading) ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              {mainTab === "smtp" 
                ? (smtpLoading ? "Testing..." : editingId ? "Update" : "Add")
                : (imapLoading ? "Adding..." : "Add")
              }
            </button>
          )}
        </>
      }
    >
      {/* Main Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #e5e7eb",
          marginBottom: "16px",
          marginLeft: "-20px",
          marginRight: "-20px",
          marginTop: "-20px",
          paddingLeft: "20px",
          paddingRight: "20px",
        }}
      >
        <button
          onClick={() => setMainTab("smtp")}
          style={{
            padding: "12px 16px",
            background: "none",
            border: "none",
            borderBottom:
              mainTab === "smtp"
                ? "2px solid #3f9f42"
                : "2px solid transparent",
            color: mainTab === "smtp" ? "#3f9f42" : "#666",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          SMTP Configuration
        </button>
        <button
          onClick={() => setMainTab("inbox")}
          style={{
            padding: "12px 16px",
            background: "none",
            border: "none",
            borderBottom:
              mainTab === "inbox"
                ? "2px solid #3f9f42"
                : "2px solid transparent",
            color: mainTab === "inbox" ? "#3f9f42" : "#666",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          Inbox Configuration
        </button>
      </div>

      {/* SMTP Configuration Tab */}
      {mainTab === "smtp" && (
        <form onSubmit={(e) => e.preventDefault()}>
        <div className="flex gap-4">
          <div className="form-group flex-1">
            <label>
              Host <span style={{ color: "red" }}>*</span>
            </label>
            <input
              name="server"
              placeholder="smtp.example.com"
              value={form.server}
              onChange={handleChangeSMTP}
              required
            />
          </div>
          <div className="form-group flex-1">
            <label>
              Port <span style={{ color: "red" }}>*</span>
            </label>
            <input
              name="port"
              type="number"
              placeholder="587"
              value={form.port}
              onChange={handleChangeSMTP}
              required
            />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="form-group flex-1">
            <label>
              Username <span style={{ color: "red" }}>*</span>
            </label>
            <input
              name="username"
              placeholder="user@example.com"
              value={form.username}
              onChange={handleChangeSMTP}
              required
            />
          </div>
          <div className="form-group flex-1">
            <label>
              Password <span style={{ color: "red" }}>*</span>
            </label>
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChangeSMTP}
              required
            />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="form-group flex-1">
            <label>
              From email <span style={{ color: "red" }}>*</span>
            </label>
            <input
              name="fromEmail"
              type="email"
              placeholder="sender@example.com"
              value={form.fromEmail}
              onChange={handleChangeSMTP}
              required
            />
          </div>
          <div className="form-group flex-1">
            <label>
              Sender name <span style={{ color: "red" }}>*</span>
            </label>
            <input
              name="senderName"
              type="text"
              placeholder="John Doe"
              value={form.senderName}
              onChange={handleChangeSMTP}
              required
            />
          </div>
        </div>
        <div className="form-group">
          <label>SSL Configuration</label>
          <select
            name="usessl"
            value={form.usessl}
            onChange={handleChangeSMTP}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontSize: "14px",
              backgroundColor: "white",
            }}
          >
            <option value="nossl">No SSL</option>
            <option value="ssl">SSL</option>
            <option value="ssl/tls">SSL/TLS</option>
          </select>
        </div>
      </form>
      )}

      {/* Inbox Configuration Tab */}
      {mainTab === "inbox" && (
        <>
          {/* Inbox Sub-tabs */}
          <div
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <button
              onClick={() => setInboxSubTab("imap")}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                background:
                  inboxSubTab === "imap" ? "#eef2ff" : "#ffffff",
                color:
                  inboxSubTab === "imap" ? "#3f9f42" : "#374151",
                border:
                  inboxSubTab === "imap"
                    ? "1px solid #3f9f42"
                    : "1px solid #d1d5db",
              }}
            >
              IMAP
            </button>
            <button
              onClick={() => setInboxSubTab("gmail")}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                background:
                  inboxSubTab === "gmail" ? "#eef2ff" : "#ffffff",
                color:
                  inboxSubTab === "gmail" ? "#3f9f42" : "#374151",
                border:
                  inboxSubTab === "gmail"
                    ? "1px solid #3f9f42"
                    : "1px solid #d1d5db",
              }}
            >
              Gmail
            </button>
            <button
              onClick={() => setInboxSubTab("outlook")}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                background:
                  inboxSubTab === "outlook" ? "#eef2ff" : "#ffffff",
                color:
                  inboxSubTab === "outlook" ? "#3f9f42" : "#374151",
                border:
                  inboxSubTab === "outlook"
                    ? "1px solid #3f9f42"
                    : "1px solid #d1d5db",
              }}
            >
              Outlook
            </button>
            <button
              onClick={() => setInboxSubTab("office365")}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                background:
                  inboxSubTab === "office365" ? "#eef2ff" : "#ffffff",
                color:
                  inboxSubTab === "office365" ? "#3f9f42" : "#374151",
                border:
                  inboxSubTab === "office365"
                    ? "1px solid #3f9f42"
                    : "1px solid #d1d5db",
              }}
            >
              Office 365
            </button>
          </div>

          {/* IMAP Content */}
          {inboxSubTab === "imap" && (
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="flex gap-4">
                <div className="form-group flex-1">
                  <label>
                    Email Address <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    name="emailAddress"
                    type="email"
                    placeholder="user@example.com"
                    value={imapForm.emailAddress}
                    onChange={handleImapChange}
                    required
                  />
                </div>
                <div className="form-group flex-1">
                  <label>
                    Username <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    name="username"
                    placeholder="username"
                    value={imapForm.username}
                    onChange={handleImapChange}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="form-group flex-1">
                  <label>
                    Host <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    name="host"
                    placeholder="imap.example.com"
                    value={imapForm.host}
                    onChange={handleImapChange}
                    required
                  />
                </div>
                <div className="form-group flex-1">
                  <label>
                    Port <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    name="port"
                    type="number"
                    placeholder="993"
                    value={imapForm.port}
                    onChange={handleImapChange}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="form-group flex-1">
                  <label>
                    Password <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={imapForm.password}
                    onChange={handleImapChange}
                    required
                  />
                </div>
                <div className="form-group flex-1">
                  {/* Empty div for layout balance */}
                </div>
              </div>
              <div className="form-group">
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "8px", 
                  marginTop: "16px",
                  marginBottom: "8px"
                }}>
                  <input
                    name="useSSL"
                    type="checkbox"
                    id="useSSL"
                    checked={imapForm.useSSL}
                    onChange={handleImapChange}
                    style={{ 
                      margin: 0,
                      width: "16px",
                      height: "16px"
                    }}
                  />
                  <label 
                    htmlFor="useSSL" 
                    style={{ 
                      margin: 0, 
                      cursor: "pointer", 
                      fontSize: "14px", 
                      fontWeight: "500",
                      color: "#333"
                    }}
                  >
                    Use SSL
                  </label>
                </div>
              </div>
            </form>
          )}

          {/* Gmail Content */}
          {inboxSubTab === "gmail" && (
            <div style={{ padding: "20px 0" }}>
              <div className="form-group">
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                  Sender Name <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  value={gmailSenderName}
                  onChange={(e) => setGmailSenderName(e.target.value)}
                  placeholder="Enter sender name"
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "center", marginTop: "16px" }}>
                <button
                  onClick={handleGmailConnect}
                  disabled={pop3Loading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    width: "auto",
                    padding: "10px 32px",
                    background: "#fff",
                    color: pop3Loading ? "#ccc" : "#ef4444",
                    border: `1px solid ${pop3Loading ? "#ccc" : "#ef4444"}`,
                    borderRadius: "24px",
                    cursor: pop3Loading ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {pop3Loading ? "Connecting..." : "Add"}
                </button>
              </div>
            </div>
          )}

          {/* Outlook Content */}
          {inboxSubTab === "outlook" && (
            <div style={{ padding: "20px 0" }}>
              <div className="form-group">
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                  Sender Name <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  value={outlookSenderName}
                  onChange={(e) => setOutlookSenderName(e.target.value)}
                  placeholder="Enter sender name"
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "center", marginTop: "16px" }}>
                <button
                  onClick={handleOutlookConnect}
                  disabled={outlookLoading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    width: "auto",
                    padding: "10px 32px",
                    background: "#fff",
                    color: outlookLoading ? "#ccc" : "#ef4444",
                    border: `1px solid ${outlookLoading ? "#ccc" : "#ef4444"}`,
                    borderRadius: "24px",
                    cursor: outlookLoading ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="7" y="1" width="15" height="21" rx="1.5" fill="#0078D4"/>
                  <rect x="7" y="3.5" width="7.5" height="7.5" fill="#50E6FF"/>
                  <rect x="7" y="11" width="7.5" height="7.5" fill="#0078D4"/>
                  <rect x="14.5" y="11" width="7.5" height="7.5" fill="#50E6FF"/>
                  <rect x="14.5" y="3.5" width="7.5" height="7.5" fill="#50E6FF"/>
                  <path d="M6 9C6 7.89543 6.89543 7 8 7H12.75C13.8546 7 14.75 7.89543 14.75 9V18C14.75 19.1046 13.8546 20 12.75 20H6V9Z" fill="#000000" fillOpacity="0.2"/>
                  <rect y="5" width="13.5" height="13.5" rx="1.5" fill="#0078D4"/>
                  <path d="M10.5 12.0693V11.903C10.5 9.52165 8.94295 8 6.76186 8C4.56636 8 3 9.53598 3 11.9307V12.097C3 14.4783 4.55705 16 6.75 16C8.93364 16 10.5 14.464 10.5 12.0693ZM8.73181 12.097C8.73181 13.5062 7.92488 14.3684 6.76186 14.3684C5.59884 14.3684 4.78023 13.4855 4.78023 12.0693V11.903C4.78023 10.4938 5.58716 9.63158 6.75 9.63158C7.90136 9.63158 8.73181 10.5145 8.73181 11.9307V12.097Z" fill="white"/>
                </svg>
                {outlookLoading ? "Connecting..." : "Add"}
                </button>
              </div>
            </div>
          )}

          {/* Office 365 Content */}
          {inboxSubTab === "office365" && (
            <div style={{ padding: "20px 0" }}>
              <div className="form-group">
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                  Sender Name <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  value={outlookSenderName}
                  onChange={(e) => setOutlookSenderName(e.target.value)}
                  placeholder="Enter sender name"
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "center", marginTop: "16px" }}>
                <button
                  onClick={handleOutlookConnect}
                  disabled={outlookLoading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    width: "auto",
                    padding: "10px 32px",
                    background: "#fff",
                    color: outlookLoading ? "#ccc" : "#ef4444",
                    border: `1px solid ${outlookLoading ? "#ccc" : "#ef4444"}`,
                    borderRadius: "24px",
                    cursor: outlookLoading ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 52 52" fill="#da1b1b" xmlns="http://www.w3.org/2000/svg">
                    <path d="M30.8,49.5c0.6,0.2,1.3,0.2,1.9,0l11.9-3.9c0.8-0.3,1.4-1,1.4-1.9v-36c0-0.6-0.4-1.2-1-1.4L32.9,2.2 c-0.7-0.2-1.4-0.2-2,0L7,11.4c-0.6,0.2-1,0.8-1,1.4v27.1c0,0.6,0.4,1.2,1,1.4L30.8,49.5z M32,42.8c0,0.6-0.5,1.1-1,1l-20-2.7 c-0.5-0.1-0.9-0.5-0.9-1v-0.4c0-0.4,0.2-0.7,0.7-0.9l3.8-1.8c0.4-0.2,0.6-0.5,0.6-0.9V14.8c0-0.5,0.3-0.9,0.8-1l15-3.4 c0.6-0.1,1.2,0.3,1.2,1V42.8z"/>
                  </svg>
                  {outlookLoading ? "Connecting..." : "Add"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </CommonSidePanel>
  );
};

export default AddMailboxModal;
