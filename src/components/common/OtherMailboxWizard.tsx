import React, { useState } from "react";

interface SmtpForm {
  server: string;
  port: string;
  username: string;
  password: string;
  fromEmail: string;
  senderName: string;
  usessl: string;
  incomingServer: string;
  incomingPort: string;
  fullInboxSync: boolean;
  incomingSecurityType: string;
}

interface OtherMailboxWizardProps {
  form: SmtpForm;
  setForm: React.Dispatch<React.SetStateAction<SmtpForm>>;
  handleChangeSMTP: (e: any) => void;
  onSaveMailbox: () => void;
  outgoingLoading: boolean;
  incomingLoading: boolean;
  includeImap: boolean;
  onIncludeImapChange: (include: boolean) => void;
  onBackToProviders?: () => void;
  backButtonLabel?: string;
  onCancel: () => void;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 42,
  padding: "9px 12px",
  border: "1px solid #dfe4ea",
  borderRadius: 6,
  fontSize: 14,
  color: "#1f2937",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontSize: 13,
  fontWeight: 600,
  color: "#374151",
};

const fieldStyle: React.CSSProperties = {
  marginBottom: 22,
};

const stepMeta = [
  {
    title: "Outgoing (SMTP)",
    subtitle: "Configure SMTP settings",
  },
  {
    title: "Incoming (IMAP)",
    subtitle: "Configure IMAP settings",
    badge: "Optional",
  },
  {
    title: "Review & Save",
    subtitle: "Review and save mailbox",
  },
];

const OtherMailboxWizard: React.FC<OtherMailboxWizardProps> = ({
  form,
  setForm,
  handleChangeSMTP,
  onSaveMailbox,
  outgoingLoading,
  incomingLoading,
  includeImap,
  onIncludeImapChange,
  onBackToProviders,
  backButtonLabel = "< Back to providers",
  onCancel,
}) => {
  const [activeStep, setActiveStep] = useState(0);

  const renderStepContent = () => {
    if (activeStep === 0) {
      return (
        <>
          <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#1f2937" }}>
            Outgoing (SMTP)
          </h3>
          <p style={{ margin: "0 0 26px", fontSize: 13, color: "#6b7280" }}>
            Configure the SMTP settings used to send emails.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Outgoing server <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                name="server"
                placeholder="smtp.example.com"
                value={form.server}
                onChange={handleChangeSMTP}
                style={inputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Outgoing port <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                name="port"
                type="number"
                placeholder="587"
                value={form.port}
                onChange={handleChangeSMTP}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Username <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                name="username"
                placeholder="user@example.com"
                value={form.username}
                onChange={handleChangeSMTP}
                style={inputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Password <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                name="password"
                type="password"
                placeholder="********"
                value={form.password}
                onChange={handleChangeSMTP}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>
                From email <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                name="fromEmail"
                type="email"
                placeholder="sender@example.com"
                value={form.fromEmail}
                onChange={handleChangeSMTP}
                style={inputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Sender name <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                name="senderName"
                placeholder="John Doe"
                value={form.senderName}
                onChange={handleChangeSMTP}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Outgoing encryption</label>
            <select
              name="usessl"
              value={form.usessl}
              onChange={handleChangeSMTP}
              style={{ ...inputStyle, background: "#fff" }}
            >
              <option value="None">None</option>
              <option value="SSL/TLS">SSL/TLS</option>
              <option value="STARTTLS">STARTTLS</option>
              <option value="Auto">Auto</option>
            </select>
          </div>
        </>
      );
    }

    if (activeStep === 1) {
      return (
        <>
          <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#1f2937" }}>
            Incoming (IMAP)
          </h3>
          <p style={{ margin: "0 0 26px", fontSize: 13, color: "#6b7280" }}>
            Add IMAP settings if this mailbox should sync inbox replies.
          </p>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: "12px 14px",
              marginBottom: 22,
              cursor: "pointer",
            }}
          >
            <span>
              <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#1f2937" }}>
                Include IMAP
              </span>
              <span style={{ display: "block", marginTop: 3, fontSize: 12, color: "#6b7280" }}>
                Turn this on only if inbox sync should be configured.
              </span>
            </span>
            <span
              onClick={(e) => {
                e.preventDefault();
                onIncludeImapChange(!includeImap);
              }}
              style={{
                width: 44,
                height: 24,
                borderRadius: 999,
                background: includeImap ? "#3f9f42" : "#d1d5db",
                position: "relative",
                flexShrink: 0,
                transition: "background 0.2s ease",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  left: includeImap ? 23 : 3,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "#fff",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
                  transition: "left 0.2s ease",
                }}
              />
            </span>
          </label>

          <div style={{ opacity: includeImap ? 1 : 0.45, pointerEvents: includeImap ? "auto" : "none" }}>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Email address <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                name="fromEmail"
                type="email"
                placeholder="user@example.com"
                value={form.fromEmail}
                onChange={handleChangeSMTP}
                style={inputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Username <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                name="username"
                placeholder="user@example.com"
                value={form.username}
                onChange={handleChangeSMTP}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Password <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                name="password"
                type="password"
                placeholder="********"
                value={form.password}
                onChange={handleChangeSMTP}
                style={inputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Incoming encryption</label>
              <select
                name="incomingSecurityType"
                value={form.incomingSecurityType}
                onChange={handleChangeSMTP}
                style={{ ...inputStyle, background: "#fff" }}
              >
                <option value="None">None</option>
                <option value="SSL/TLS">SSL/TLS</option>
                <option value="STARTTLS">STARTTLS</option>
                <option value="Auto">Auto</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Incoming server <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                name="incomingServer"
                placeholder="imap.example.com"
                value={form.incomingServer}
                onChange={handleChangeSMTP}
                style={inputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Incoming port <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                name="incomingPort"
                type="number"
                placeholder="993"
                value={form.incomingPort}
                onChange={handleChangeSMTP}
                style={inputStyle}
              />
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151" }}>
            <input
              type="checkbox"
              name="fullInboxSync"
              checked={form.fullInboxSync}
              onChange={(e) => {
                const { name, checked } = e.target;
                setForm((prev) => ({ ...prev, [name]: checked }));
              }}
            />
            Full inbox sync
          </label>
          </div>
        </>
      );
    }

    return (
      <>
        <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#1f2937" }}>
          Review & Save
        </h3>
        <p style={{ margin: "0 0 24px", fontSize: 13, color: "#6b7280" }}>
          Review your settings before saving the mailbox configuration.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {[
            ["From email", form.fromEmail || "-"],
            ["Sender name", form.senderName || "-"],
            ["SMTP server", form.server || "-"],
            ["SMTP port", form.port || "-"],
            ["SMTP encryption", form.usessl || "-"],
            ...(includeImap
              ? [
                  ["IMAP", "Included"],
                  ["IMAP server", form.incomingServer || "-"],
                  ["IMAP port", form.incomingPort || "-"],
                  ["IMAP encryption", form.incomingSecurityType || "-"],
                ]
              : [["IMAP", "Not included"]]),
          ].map(([label, value]) => (
            <div key={label} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1f2937", wordBreak: "break-word" }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px minmax(0, 1fr)", margin: "-20px" }}>
      <aside style={{ borderRight: "1px solid #e5e7eb", padding: "24px 18px", background: "#fbfcfd" }}>
        {onBackToProviders && (
          <button
            type="button"
            onClick={onBackToProviders}
            style={{
              border: "none",
              background: "transparent",
              padding: 0,
              marginBottom: 22,
              color: "#6b7280",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {backButtonLabel}
          </button>
        )}
        {stepMeta.map((step, index) => {
          const isActive = activeStep === index;
          const isDone = activeStep > index;

          return (
            <button
              key={step.title}
              type="button"
              onClick={() => setActiveStep(index)}
              style={{
                display: "grid",
                gridTemplateColumns: "28px 1fr",
                columnGap: 10,
                width: "100%",
                padding: "0 0 24px",
                border: "none",
                background: "transparent",
                textAlign: "left",
                cursor: "pointer",
                position: "relative",
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: isActive || isDone ? "#fff" : "#6b7280",
                  background: isActive || isDone ? "#3f9f42" : "#fff",
                  border: isActive || isDone ? "1px solid #3f9f42" : "1px solid #d1d5db",
                  zIndex: 1,
                }}
              >
                {index + 1}
              </span>
              {index < stepMeta.length - 1 && (
                <span
                  style={{
                    position: "absolute",
                    left: 10,
                    top: 22,
                    width: 1,
                    height: 34,
                    background: "#d8dee6",
                  }}
                />
              )}
              <span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1f2937" }}>{step.title}</span>
                  {step.badge && (
                    <span style={{ fontSize: 10, color: "#6b7280", border: "1px solid #d1d5db", borderRadius: 10, padding: "1px 6px" }}>
                      {step.badge}
                    </span>
                  )}
                </span>
                <span style={{ display: "block", marginTop: 4, fontSize: 11, color: "#6b7280" }}>
                  {step.subtitle}
                </span>
              </span>
            </button>
          );
        })}
      </aside>

      <section style={{ minHeight: 560, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "28px 32px", flex: "1 1 auto" }}>{renderStepContent()}</div>
        <div
          style={{
            borderTop: "1px solid #e5e7eb",
            padding: "16px 32px",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            background: "#fff",
          }}
        >
          <button
            type="button"
            onClick={activeStep === 0 ? onCancel : () => setActiveStep((step) => step - 1)}
            style={{
              padding: "9px 22px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              background: "#fff",
              color: "#374151",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {activeStep === 0 ? "Cancel" : "Back"}
          </button>

          {activeStep < 2 ? (
            <button
              type="button"
              onClick={() => setActiveStep((step) => step + 1)}
              style={{
                padding: "9px 22px",
                border: "1px solid #3f9f42",
                borderRadius: 6,
                background: "#3f9f42",
                color: "#fff",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {activeStep === 0 ? "Next: IMAP Settings" : "Next: Review"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onSaveMailbox}
              disabled={outgoingLoading || incomingLoading}
              style={{
                padding: "9px 24px",
                border: `1px solid ${outgoingLoading || incomingLoading ? "#d1d5db" : "#3f9f42"}`,
                borderRadius: 6,
                background: outgoingLoading || incomingLoading ? "#f3f4f6" : "#3f9f42",
                color: outgoingLoading || incomingLoading ? "#9ca3af" : "#fff",
                cursor: outgoingLoading || incomingLoading ? "not-allowed" : "pointer",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {outgoingLoading || incomingLoading ? "Saving..." : "Save"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
};

export default OtherMailboxWizard;
