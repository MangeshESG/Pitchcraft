import React from "react";

interface KraftEmailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: () => void;
  onStop?: () => void;
  isResetEnabled: boolean;
  overwriteDatabase: boolean;
  onOverwriteChange: (checked: boolean) => void;
  isDemoAccount?: boolean;
  startIndex: string;
  setStartIndex: (val: string) => void;
  endIndex: string;
  setEndIndex: (val: string) => void;
  enableIndexRange: boolean;
  setEnableIndexRange: (val: boolean) => void;
  combinedResponses: any[];
  usageData: any;
  clearUsage: () => void;
  userRole?: string;
  currentIndex: number;
}

const KraftEmailPanel: React.FC<KraftEmailPanelProps> = ({
  isOpen,
  onClose,
  onStart,
  onStop,
  isResetEnabled,
  overwriteDatabase,
  onOverwriteChange,
  isDemoAccount,
  startIndex,
  setStartIndex,
  endIndex,
  setEndIndex,
  enableIndexRange,
  setEnableIndexRange,
  combinedResponses,
  usageData,
  clearUsage,
  userRole,
  currentIndex,
}) => {
  const [indexRangeError, setIndexRangeError] = React.useState("");
  const [showValidationError, setShowValidationError] = React.useState(false);

  const formatLocalDateTime = (dateString: string | undefined | null): string => {
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
  };
  
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
          Kraft emails
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
        {/* Overwrite checkbox */}
        {!isDemoAccount && (
          <div
            style={{
              marginBottom: 20,
              padding: "12px 16px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              backgroundColor: "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <input
                type="checkbox"
                id="kraftOverwriteDatabase"
                checked={overwriteDatabase}
                onChange={(e) => {
                  console.log('Checkbox clicked, new value:', e.target.checked);
                  onOverwriteChange(e.target.checked);
                }}
                style={{ marginRight: 8, cursor: "pointer" }}
              />
              <label
                htmlFor="kraftOverwriteDatabase"
                style={{
                  fontSize: "inherit",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Overwrite
              </label>
            </div>
          </div>
        )}

        {/* Index Range panel */}
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
              id="kraftEnableIndexRange"
              checked={enableIndexRange}
              onChange={(e) => setEnableIndexRange(e.target.checked)}
              style={{ marginRight: 8, cursor: "pointer" }}
            />
            <label htmlFor="kraftEnableIndexRange" style={{ fontSize: "inherit", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Restrict contacts
            </label>
          </div>
          {enableIndexRange && (
            <>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                <div style={{ width: "80px" }}>
                  <label style={{ display: "block", marginBottom: 4, fontSize: "inherit", color: "#666", fontFamily: "inherit" }}>
                    From
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={startIndex}
                    onChange={(e) => {
                      setStartIndex(e.target.value);
                      setShowValidationError(false);
                    }}
                    placeholder="From"
                    min="1"
                    max={combinedResponses.length}
                    style={{ width: "100%", padding: "6px 8px", fontSize: 13 }}
                  />
                </div>
                <div style={{ width: "80px" }}>
                  <label style={{ display: "block", marginBottom: 4, fontSize: "inherit", color: "#666", fontFamily: "inherit" }}>
                    To
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={endIndex}
                    onChange={(e) => {
                      setEndIndex(e.target.value);
                      setShowValidationError(false);
                    }}
                    placeholder="To"
                    min={startIndex || "1"}
                    max={combinedResponses.length}
                    disabled={!startIndex}
                    style={{ width: "100%", padding: "6px 8px", fontSize: 13 }}
                  />
                </div>
              </div>
              {showValidationError && indexRangeError && (
                <div
                  style={{
                    marginTop: 8,
                    padding: "6px 10px",
                    background: "#fee",
                    border: "1px solid #fcc",
                    borderRadius: 4,
                    fontSize: 12,
                    color: "#c33",
                  }}
                >
                  {indexRangeError}
                </div>
              )}
            </>
          )}
        </div>

        {/* Usage Panel */}
        {userRole === "ADMIN" && usageData && (
          <div
            style={{
              marginBottom: 20,
              padding: "12px 16px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              backgroundColor: "#fff",
              position: "relative",
            }}
          >
            <button
              onClick={clearUsage}
              title="Clear usage"
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: "14px",
                color: "#64748b",
              }}
            >
              ✕
            </button>
            <div style={{ fontSize: "13px", lineHeight: "1.6" }}>
              <div style={{ marginBottom: 8 }}>
                <strong>Last:</strong>
                <span style={{ marginLeft: 8 }}>Tokens {usageData.last.tokens}</span>
                <span style={{ marginLeft: 8 }}>💲{usageData.last.cost.toFixed(6)}</span>
              </div>
              <div>
                <strong>Total:</strong>
                <span style={{ marginLeft: 8 }}>Emails {usageData.total.emails}</span>
                <span style={{ marginLeft: 8 }}>Tokens {usageData.total.tokens}</span>
                <span style={{ marginLeft: 8 }}>💲{usageData.total.cost.toFixed(6)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Krafted and Emailed Dates */}
        {combinedResponses[currentIndex] && (
          <div style={{ marginTop: 16 }}>
            {combinedResponses[currentIndex]?.lastemailupdateddate && (
              <div
                style={{
                  fontSize: "inherit",
                  color: "#666",
                  fontStyle: "italic",
                  marginBottom: 4,
                  fontFamily: "inherit",
                }}
              >
                Krafted: {formatLocalDateTime(combinedResponses[currentIndex]?.lastemailupdateddate)}
              </div>
            )}
            {combinedResponses[currentIndex]?.emailsentdate && (
              <div
                style={{
                  fontSize: "inherit",
                  color: "#666",
                  fontStyle: "italic",
                  fontFamily: "inherit",
                }}
              >
                Emailed: {formatLocalDateTime(combinedResponses[currentIndex]?.emailsentdate)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div
        style={{
          padding: 16,
          display: "flex",
          gap: 12,
          borderTop: "1px solid #e5e7eb",
        }}
      >
        {isResetEnabled ? (
          <button
            type="button"
            className="button save-button"
            onClick={() => {
              if (enableIndexRange && startIndex && endIndex) {
                const fromValue = parseInt(startIndex);
                const toValue = parseInt(endIndex);
                
                if (toValue > combinedResponses.length) {
                  setIndexRangeError(`Maximum contact count is ${combinedResponses.length}`);
                  setShowValidationError(true);
                  return;
                } else if (toValue <= fromValue) {
                  setIndexRangeError("To must be greater than From");
                  setShowValidationError(true);
                  return;
                }
              }
              
              setIndexRangeError("");
              setShowValidationError(false);
              onStart();
            }}
            style={{ flex: 1, padding: "10px 16px", fontSize: 14, fontWeight: 600 }}
          >
            Start
          </button>
        ) : (
          <button
            type="button"
            className="button save-button"
            onClick={onStop}
            style={{ flex: 1, padding: "10px 16px", fontSize: 14, fontWeight: 600 }}
          >
            Stop
          </button>
        )}
      </div>
    </div>
  );
};

export default KraftEmailPanel;
