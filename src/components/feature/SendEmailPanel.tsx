import React, { useState } from "react";
import { toast } from "react-toastify";

interface SendEmailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  bccOptions: any[];
  emailFormData: { BccEmail: string };
  setEmailFormData: (data: any) => void;
  bccSelectMode: string;
  setBccSelectMode: (mode: string) => void;
  smtpUsers: any[];
  selectedSmtpUser: string;
  setSelectedSmtpUser: (id: string) => void;
  minDelay: number;
  setMinDelay: (val: number) => void;
  maxDelay: number;
  setMaxDelay: (val: number) => void;
  DELAY_OPTIONS: number[];
  startIndex: string;
  setStartIndex: (val: string) => void;
  endIndex: string;
  setEndIndex: (val: string) => void;
  combinedResponses: any[];
  isBulkSending: boolean;
  countdown: number | null;
  sendingEmail: boolean;
  emailMessage: string;
  currentIndex: number;
  followupEnabled?: boolean;
  onSendSingle: () => void;
  onSendAll: () => void;
  enableDelay?: boolean;
  setEnableDelay?: (val: boolean) => void;
  enableIndexRange?: boolean;
  setEnableIndexRange?: (val: boolean) => void;
}

const SendEmailPanel: React.FC<SendEmailPanelProps> = ({
  isOpen,
  onClose,
  bccOptions,
  emailFormData,
  setEmailFormData,
  bccSelectMode,
  setBccSelectMode,
  smtpUsers,
  selectedSmtpUser,
  setSelectedSmtpUser,
  minDelay,
  setMinDelay,
  maxDelay,
  setMaxDelay,
  DELAY_OPTIONS,
  startIndex,
  setStartIndex,
  endIndex,
  setEndIndex,
  combinedResponses,
  isBulkSending,
  countdown,
  sendingEmail,
  emailMessage,
  currentIndex,
  followupEnabled,
  onSendSingle,
  onSendAll,
  enableDelay: externalEnableDelay,
  setEnableDelay: externalSetEnableDelay,
  enableIndexRange: externalEnableIndexRange,
  setEnableIndexRange: externalSetEnableIndexRange,
}) => {
  const [internalEnableDelay, setInternalEnableDelay] = useState(false);
  const [internalEnableIndexRange, setInternalEnableIndexRange] = useState(false);

  const enableDelay = externalEnableDelay ?? internalEnableDelay;
  const setEnableDelay = externalSetEnableDelay ?? setInternalEnableDelay;
  const enableIndexRange = externalEnableIndexRange ?? internalEnableIndexRange;
  const setEnableIndexRange = externalSetEnableIndexRange ?? setInternalEnableIndexRange;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        height: "100vh",
        width: 420,
        background: "#fff",
        boxShadow: "-4px 0 20px rgba(0,0,0,0.08)",
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.35s ease-in-out",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          background: "#d9fdd3",
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
          Send emails
        </h3>
        <button
          onClick={onClose}
          style={{
            border: "none",
            background: "transparent",
            fontSize: 22,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>

      {/* BODY */}
      <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
        {/* ROW 1: From */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
            From
          </label>
          <select
            className="form-control"
            value={selectedSmtpUser}
            onChange={(e) => setSelectedSmtpUser(e.target.value)}
            style={{ width: "100%", padding: "8px", fontSize: 14 }}
          >
            <option value="">Sender</option>
            {smtpUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.username}
              </option>
            ))}
          </select>
        </div>

        {/* ROW 2: BCC */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
            BCC
          </label>
          <select
            className="form-control"
            value={bccSelectMode === "other" ? "Other" : emailFormData.BccEmail}
            onChange={(e) => {
              const selected = e.target.value;
              if (selected === "Other") {
                setBccSelectMode("other");
                setEmailFormData({ ...emailFormData, BccEmail: "" });
                localStorage.setItem("lastBCCOtherMode", "true");
              } else {
                setBccSelectMode("dropdown");
                setEmailFormData({ ...emailFormData, BccEmail: selected });
                localStorage.setItem("lastBCCOtherMode", "false");
                localStorage.setItem("lastBCC", selected);
              }
            }}
            style={{ width: "100%", padding: "8px", fontSize: 14 }}
          >
            <option value="">BCC email</option>
            {bccOptions.map((option) => (
              <option key={option.id} value={option.bccEmailAddress}>
                {option.bccEmailAddress}
              </option>
            ))}
            <option value="Other">Other</option>
          </select>
          {bccSelectMode === "other" && (
            <input
              type="email"
              placeholder="Type BCC email"
              value={emailFormData.BccEmail}
              onChange={(e) => {
                setEmailFormData({ ...emailFormData, BccEmail: e.target.value });
                localStorage.setItem("lastBCC", e.target.value);
              }}
              style={{ width: "100%", padding: "8px", fontSize: 14, marginTop: 8 }}
            />
          )}
        </div>

        {/* ROW 3: Delay panel */}
        <div
          style={{
            marginBottom: 20,
            padding: "12px 16px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            backgroundColor: "#fff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
            <input
              type="checkbox"
              id="enableDelay"
              checked={enableDelay}
              onChange={(e) => setEnableDelay(e.target.checked)}
              style={{ marginRight: 8, cursor: "pointer" }}
            />
            <label htmlFor="enableDelay" style={{ fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Delay (Seconds)
            </label>
          </div>
          {enableDelay && (
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
              <div style={{ width: "80px" }}>
                <label style={{ display: "block", marginBottom: 4, fontSize: 12, color: "#666" }}>
                  Min
                </label>
                <select
                  className="form-control"
                  value={minDelay}
                  onChange={(e) => setMinDelay(Number(e.target.value))}
                  style={{ width: "100%", padding: "6px 8px", fontSize: 13 }}
                >
                  {DELAY_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ width: "80px" }}>
                <label style={{ display: "block", marginBottom: 4, fontSize: 12, color: "#666" }}>
                  Max
                </label>
                <select
                  className="form-control"
                  value={maxDelay}
                  onChange={(e) => setMaxDelay(Number(e.target.value))}
                  style={{ width: "100%", padding: "6px 8px", fontSize: 13 }}
                >
                  {DELAY_OPTIONS.filter((v) => v >= minDelay).map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ROW 4: Index Range panel */}
        <div
          style={{
            marginBottom: 20,
            padding: "12px 16px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            backgroundColor: "#fff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
            <input
              type="checkbox"
              id="enableIndexRange"
              checked={enableIndexRange}
              onChange={(e) => setEnableIndexRange(e.target.checked)}
              style={{ marginRight: 8, cursor: "pointer" }}
            />
            <label htmlFor="enableIndexRange" style={{ fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Restrict contacts
            </label>
          </div>
          {enableIndexRange && (
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
              <div style={{ width: "80px" }}>
                <label style={{ display: "block", marginBottom: 4, fontSize: 12, color: "#666" }}>
                  From
                </label>
                <select
                  className="form-control"
                  value={startIndex}
                  onChange={(e) => {
                    setStartIndex(e.target.value);
                    if (endIndex && parseInt(endIndex) <= parseInt(e.target.value)) {
                      setEndIndex("");
                    }
                  }}
                  style={{ width: "100%", padding: "6px 8px", fontSize: 13 }}
                >
                  <option value="">From</option>
                  {Array.from({ length: combinedResponses.length }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                      {num}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ width: "80px" }}>
                <label style={{ display: "block", marginBottom: 4, fontSize: 12, color: "#666" }}>
                  To
                </label>
                <select
                  className="form-control"
                  value={endIndex}
                  onChange={(e) => setEndIndex(e.target.value)}
                  disabled={!startIndex}
                  style={{ width: "100%", padding: "6px 8px", fontSize: 13 }}
                >
                  <option value="">To</option>
                  {startIndex &&
                    Array.from(
                      { length: combinedResponses.length - parseInt(startIndex) },
                      (_, i) => parseInt(startIndex) + i + 1
                    ).map((num) => (
                      <option key={num} value={num}>
                        {num}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Countdown */}
        {isBulkSending && countdown !== null && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: "#f0fdf4",
              borderRadius: 8,
              fontSize: 14,
              color: "#3f9f42",
              fontWeight: 500,
              textAlign: "center",
            }}
          >
            ⏳ Next email in {countdown}s
          </div>
        )}

        {/* Krafted and Emailed Dates */}
        {combinedResponses[currentIndex] && (
          <div style={{ marginTop: 16 }}>
            {combinedResponses[currentIndex]?.lastemailupdateddate && (
              <div
                style={{
                  fontSize: 13,
                  color: "#666",
                  fontStyle: "italic",
                  marginBottom: 4,
                }}
              >
                Krafted: {(() => {
                  const dateString = combinedResponses[currentIndex]?.lastemailupdateddate;
                  if (!dateString) return "N/A";
                  let dateObj: Date | null = null;
                  if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
                    dateObj = new Date(dateString);
                  } else if (/^\d{2}[-/]\d{2}[-/]\d{4}/.test(dateString)) {
                    const [datePart, timePart] = dateString.split(" ");
                    const [day, month, year] = datePart.split(/[-/]/).map(Number);
                    let hour = 0, min = 0, sec = 0;
                    if (timePart) {
                      [hour, min, sec] = timePart.split(":").map(Number);
                    }
                    dateObj = new Date(year, month - 1, day, hour, min, sec);
                  } else {
                    dateObj = new Date(dateString);
                  }
                  if (!dateObj || isNaN(dateObj.getTime())) return "N/A";
                  return dateObj.toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  }).replace(",", "");
                })()}
              </div>
            )}
            {combinedResponses[currentIndex]?.emailsentdate && (
              <div
                style={{
                  fontSize: 13,
                  color: "#666",
                  fontStyle: "italic",
                }}
              >
                Emailed: {(() => {
                  const dateString = combinedResponses[currentIndex]?.emailsentdate;
                  if (!dateString) return "N/A";
                  let dateObj: Date | null = null;
                  if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
                    dateObj = new Date(dateString);
                  } else if (/^\d{2}[-/]\d{2}[-/]\d{4}/.test(dateString)) {
                    const [datePart, timePart] = dateString.split(" ");
                    const [day, month, year] = datePart.split(/[-/]/).map(Number);
                    let hour = 0, min = 0, sec = 0;
                    if (timePart) {
                      [hour, min, sec] = timePart.split(":").map(Number);
                    }
                    dateObj = new Date(year, month - 1, day, hour, min, sec);
                  } else {
                    dateObj = new Date(dateString);
                  }
                  if (!dateObj || isNaN(dateObj.getTime())) return "N/A";
                  return dateObj.toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  }).replace(",", "");
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER - ROW 5: Buttons */}
      <div
        style={{
          padding: 16,
          display: "flex",
          gap: 12,
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <button
          type="button"
          className="button save-button"
          onClick={onSendSingle}
          disabled={(() => {
            const contact = combinedResponses[currentIndex];
            if (!contact || sendingEmail || sessionStorage.getItem("isDemoAccount") === "true") {
              return true;
            }
            if (followupEnabled) {
              const emailedDate = contact.emailsentdate;
              const kraftedDate = contact.lastemailupdateddate;
              if (emailedDate && kraftedDate) {
                const emailedTime = new Date(emailedDate).getTime();
                const kraftedTime = new Date(kraftedDate).getTime();
                if (emailedTime > kraftedTime) return true;
              }
            }
            return false;
          })()}
          style={{ flex: 1, padding: "10px 16px", fontSize: 14, fontWeight: 600 }}
        >
          {!sendingEmail && emailMessage === "" && "Send"}
          {sendingEmail && "Sending..."}
          {!sendingEmail && emailMessage && "Sent"}
        </button>

        <button
          type="button"
          className="button save-button"
          onClick={onSendAll}
          disabled={(() => {
            if (sessionStorage.getItem("isDemoAccount") === "true") return true;
            if (followupEnabled) {
              const canSendAny = combinedResponses.some((contact) => {
                const emailedDate = contact.emailsentdate;
                const kraftedDate = contact.lastemailupdateddate;
                if (!emailedDate || !kraftedDate) return true;
                const emailedTime = new Date(emailedDate).getTime();
                const kraftedTime = new Date(kraftedDate).getTime();
                return kraftedTime >= emailedTime;
              });
              return !canSendAny;
            }
            return false;
          })()}
          style={{ flex: 1, padding: "10px 16px", fontSize: 14, fontWeight: 600 }}
        >
          {isBulkSending ? "Stop" : "Send all"}
        </button>
      </div>
    </div>
  );
};

export default SendEmailPanel;
