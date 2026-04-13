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
  const [mailboxTab, setMailboxTab] = useState<"smtp" | "imap">("smtp");
  const [imapForm, setImapForm] = useState({
    emailAddress: "",
    host: "",
    port: "",
    useSSL: true,
    username: "",
    password: ""
  });
  const [imapLoading, setImapLoading] = useState(false);

  // Handle IMAP form changes
  const handleImapChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setImapForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };
  
  // Handle IMAP form submission
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
    setEditingId(null);
    setMailboxTab("smtp");
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
          <button
            onClick={mailboxTab === "smtp" ? handleSubmitSMTP : handleImapSubmit}
            disabled={mailboxTab === "smtp" ? smtpLoading : imapLoading}
            style={{
              padding: "10px 32px",
              background: "#fff",
              color: (mailboxTab === "smtp" ? smtpLoading : imapLoading) ? "#ccc" : "#ef4444",
              border: `1px solid ${(mailboxTab === "smtp" ? smtpLoading : imapLoading) ? "#ccc" : "#ef4444"}`,
              borderRadius: "24px",
              cursor: (mailboxTab === "smtp" ? smtpLoading : imapLoading) ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            {mailboxTab === "smtp" 
              ? (smtpLoading ? "Testing..." : editingId ? "Update" : "Add")
              : (imapLoading ? "Adding..." : "Add IMAP")
            }
          </button>
        </>
      }
    >
      {/* Tabs */}
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
          onClick={() => setMailboxTab("smtp")}
          style={{
            padding: "12px 16px",
            background: "none",
            border: "none",
            borderBottom:
              mailboxTab === "smtp"
                ? "2px solid #3f9f42"
                : "2px solid transparent",
            color: mailboxTab === "smtp" ? "#3f9f42" : "#666",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          SMTP Configuration
        </button>
        <button
          onClick={() => setMailboxTab("imap")}
          style={{
            padding: "12px 16px",
            background: "none",
            border: "none",
            borderBottom:
              mailboxTab === "imap"
                ? "2px solid #3f9f42"
                : "2px solid transparent",
            color: mailboxTab === "imap" ? "#3f9f42" : "#666",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          IMAP Configuration
        </button>
      </div>

      {/* SMTP Tab Content */}
      {mailboxTab === "smtp" && (
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

      {/* IMAP Tab Content */}
      {mailboxTab === "imap" && (
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
    </CommonSidePanel>
  );
};

export default AddMailboxModal;