import { faAngleLeft, faAngleRight, faCircleLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import{formatDateTimeLocal, formatTimeLocal}from "../common/dateFormatters";

interface SendEmailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: () => void;
  onStop?: () => void;
  isResetEnabled: boolean;
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
   overwriteDatabase?: boolean;
  setOverwriteDatabase?: (val: boolean) => void;
  setFollowupEnabled?: (value: boolean) => void;
  notKraftedEnabled?: boolean;
  setNotKraftedEnabled?: (value: boolean) => void;
  kraftedNotSentEnabled?: boolean;
  setKraftedNotSentEnabled?: (value: boolean) => void;
  isDemoAccount?: boolean;
  filteredResponses?: any[];
  // Add these new props for manual refetch
  selectedZohoviewId?: string;
  fetchAndDisplayEmailBodies?: (zohoviewId: string) => void;
  onFilterChange?: () => void; // Add callback for filter changes
}

const SendEmailPanel: React.FC<SendEmailPanelProps> = ({
  isOpen,
  onClose,
  onStart,
  onStop,
  isResetEnabled,
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
  overwriteDatabase,
setOverwriteDatabase,
 setFollowupEnabled,
  notKraftedEnabled,
  setNotKraftedEnabled,
  kraftedNotSentEnabled,
  setKraftedNotSentEnabled,
  isDemoAccount,
  filteredResponses,
  selectedZohoviewId,
  fetchAndDisplayEmailBodies,
  onFilterChange,
}) => {
  console.log('SendEmailPanel - notKraftedEnabled:', notKraftedEnabled); // Debug log
  console.log('SendEmailPanel - setNotKraftedEnabled:', typeof setNotKraftedEnabled); // Debug log

  const [internalEnableDelay, setInternalEnableDelay] = useState(false);
  const [internalEnableIndexRange, setInternalEnableIndexRange] = useState(false);
  const [indexRangeError, setIndexRangeError] = useState("");
  const [showValidationError, setShowValidationError] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("");
  // Collapsed state for the "Hide actions" / "Show actions" toggle
  const [actionsCollapsed, setActionsCollapsed] = useState<boolean>(isOpen ?? false);

  const enableDelay = externalEnableDelay ?? internalEnableDelay;
  const setEnableDelay = externalSetEnableDelay ?? setInternalEnableDelay;
  const enableIndexRange = externalEnableIndexRange ?? internalEnableIndexRange;
  const setEnableIndexRange = externalSetEnableIndexRange ?? setInternalEnableIndexRange;

  // Calculate current filter value for display
  const getCurrentFilterValue = () => {
    if (kraftedNotSentEnabled === true) return "kraft-not-sent";
    if (notKraftedEnabled === true) return "not-krafted";
    if (enableIndexRange === true) return "restrict-contact";
    return selectedFilter;
  };

  const [panelTab, setPanelTab] = useState(() => {
    return localStorage.getItem('sendEmailPanelTab') || 'kraft';
  });
  const panelTabs = [
    { id: 'kraft', label: 'Kraft' },
    { id: 'send', label: 'Send' },
  ];

  const handleTabChange = (tabId: string) => {
    setPanelTab(tabId);
    localStorage.setItem('sendEmailPanelTab', tabId);
  };
// const formatLocalDateTime = (dateString: string | undefined | null): string => {
//   if (!dateString) return "N/A";
//   const dateObj = new Date(dateString);
//   if (isNaN(dateObj.getTime())) return "N/A";}

//   return dateObj.toLocaleString("en-GB", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//     hour: "numeric",
//     minute: "2-digit",
//     hour12: true,
//   }).replace(",", "");
// };
 const formatDateTimeIST = formatDateTimeLocal;
 const formatTimeIST = formatTimeLocal;

  return (
    <>

      <div
        className={`min-w-[320px] flex flex-1 flex-col bg-[#ffffff] rounded-[10px] border border-[#cccccc] overflow-hidden shadow-[rgba(50,50,93,0.25)_0px_13px_27px_-5px,rgba(0,0,0,0.3)_0px_8px_16px_-8px]`}
      >
        {/* Shared controls — apply to both Kraft and Send tabs */}
        {!actionsCollapsed && (
        <div className="p-[20px] pb-[0px] flex flex-col w-[100%]">
          {/* Filter Dropdown */}
          <div
            className="form-group"
            style={{
              padding: "12px",
              border: "1px solid #cccccc",
              borderRadius: "8px",
              marginBottom: "12px",
              backgroundColor: "#fff",
            }}
          >
            <label style={{ display: "block", marginBottom: 6, fontSize: "14px", fontWeight: 600, fontFamily: "inherit" }}>
              Filter
            </label>
            <select
              className="form-control"
              value={getCurrentFilterValue()}
              onChange={(e) => {
                const selectedValue = e.target.value;
                setSelectedFilter(selectedValue);

                // Reset all filters first
                setEnableIndexRange(false);
                setNotKraftedEnabled?.(false);
                setKraftedNotSentEnabled?.(false);

                // Then set the appropriate filter
                if (selectedValue === "restrict-contact") {
                  setEnableIndexRange(true);
                } else if (selectedValue === "not-krafted") {
                  setNotKraftedEnabled?.(true);
                } else if (selectedValue === "kraft-not-sent") {
                  setKraftedNotSentEnabled?.(true);
                }

                // Reset current index when filter changes
                if (typeof window !== "undefined" && (window as any).resetCurrentIndex) {
                  (window as any).resetCurrentIndex();
                }

                if (onFilterChange) {
                  onFilterChange();
                }
              }}
              style={{ width: "100%", padding: "8px", fontSize: 14 }}
            >
              <option value="">Select filter...</option>
              <option value="kraft-not-sent">Kraft not sent</option>
              <option value="not-krafted">Not krafted</option>
              <option value="restrict-contact">Restrict contacts</option>
            </select>
          </div>

          {/* Restrict Contacts (index range) */}
          {(selectedFilter === "restrict-contact" || enableIndexRange === true) && (
            <div
              className="form-group"
              style={{
                padding: "12px",
                border: "1px solid #cccccc",
                borderRadius: "8px",
                marginBottom: "12px",
                backgroundColor: "#fff",
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                <div style={{ width: "80px" }}>
                  <label style={{ display: "block", marginBottom: 4, fontSize: "14px", color: "#333", fontFamily: "inherit" }}>
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
                  <label style={{ display: "block", marginBottom: 4, fontSize: "14px", color: "#333", fontFamily: "inherit" }}>
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
                <div className="mt-[8px] text-red-600 text-[12px]">
                  {indexRangeError}
                </div>
              )}
            </div>
          )}

          {/* Include email trail */}
          {!isDemoAccount && (
            <div
              className="form-group"
              style={{
                padding: "12px",
                border: "1px solid #cccccc",
                borderRadius: "8px",
                backgroundColor: "#fff",
                marginBottom: "12px",
              }}
            >
              <div className="flex items-center gap-[8px]">
                <label className="checkbox-label !mb-[0px] mr-[5px] flex items-center">
                  <input
                    type="checkbox"
                    checked={followupEnabled || false}
                    onChange={(e) => {
                      setFollowupEnabled?.(e.target.checked);
                    }}
                    className="!mr-0"
                  />
                  <span style={{ fontSize: "14px", whiteSpace: "nowrap", marginLeft: "10px" }}>
                    Include email trail
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Krafted & Emailed Dates */}
          {combinedResponses[currentIndex] && (
            <div className="mb-[12px] text-[13px] italic text-gray-600 text-right">
              {combinedResponses[currentIndex]?.lastemailupdateddate && (
                <div>
                  Krafted:{" "}
                  {formatDateTimeIST(combinedResponses[currentIndex]?.lastemailupdateddate)}
                </div>
              )}
              {combinedResponses[currentIndex]?.emailsentdate && (
                <div>
                  Emailed:{" "}
                  {formatDateTimeIST(combinedResponses[currentIndex]?.emailsentdate)}
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* Tabs Header */}
        <div className="flex w-full border-b border-[#cccccc] rounded-[10px 10px 0 0] panel-tab items-center">
          {!actionsCollapsed && panelTabs.map((tab, index) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                border: "1px solid #3f9f42",
                borderLeft: index === 0 ? "1px solid #3f9f42" : "none",
                borderBottom: "1px solid #3f9f42",
              }}
              className={`flex-1 basis-1/2 text-center px-[30px] py-[10px] font-medium text-[16px]
              ${panelTab === tab.id
                  ? `bg-white  text-[#3f9f42] relative active`
                  : 'bg-gray-100 text-slate-400 hover:bg-gray-200 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1)]'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* HEADER */}

        {/* CONTENT */}
        {!actionsCollapsed && panelTab === "kraft" && (
  <div className="p-[20px] flex flex-col w-[100%] h-[100%]">

    {/* Overwrite + Start in one compact row */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        padding: "12px",
        border: "1px solid #cccccc",
        borderRadius: "8px",
        backgroundColor: "#fff",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <input
          id="overwrite-existing-emails"
          type="checkbox"
          checked={overwriteDatabase ?? false}
          onChange={(e) => {
            const checked = e.target.checked;

            setOverwriteDatabase?.(checked);
          }}
        />
        <label htmlFor="overwrite-existing-emails" style={{ fontWeight: 400, cursor: "pointer" }}>
          Overwrite existing emails
        </label>
      </div>

      {isResetEnabled ? (
        <button
          type="button"
          className="btn-default flex-shrink-0"
          onClick={() => {
            if (enableIndexRange && startIndex && endIndex) {
              const fromValue = parseInt(startIndex);
              const toValue = parseInt(endIndex);

              if (toValue > combinedResponses.length) {
                setIndexRangeError(
                  `Maximum contact count is ${combinedResponses.length}`
                );
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
        >
          Start
        </button>
      ) : (
        <button
          type="button"
          className="btn-default flex-shrink-0"
          onClick={onStop}   // or separate stop handler if you have one
        >
          Stop
        </button>
      )}
    </div>
  </div>
)}
        {!actionsCollapsed && panelTab === "send" && (
          <div className="p-[20px] flex items-start flex-col w-[100%] h-[100%]">

            <>
              {/* <div
                style={{
                  background: "#d9fdd3",
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
              </div> */}

              {/* BODY */}
              <div className="flex flex-col w-[100%]">
                {/* ROW 1: From and BCC panel */}
                <div className="flex flex-col" >
                  {/* From */}
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", marginBottom: 6, fontSize: "14px", fontWeight: 600, fontFamily: "inherit" }}>
                      From
                    </label>
                    <select
                      className="form-control"
                      value={selectedSmtpUser}
                      onChange={(e) => setSelectedSmtpUser(e.target.value)}
                      style={{ width: "100%", padding: "8px", fontSize: 14 }}
                    >
                      <option value="">Sender</option>
                      {smtpUsers
                        .filter(user => user && user.email)
                        .sort((a, b) => a.email.localeCompare(b.email, undefined, { sensitivity: 'base' }))
                        .map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* BCC */}
                  <div className="form-group">
                    <label style={{ display: "block", marginBottom: 6, fontSize: "14px", fontWeight: 600, fontFamily: "inherit" }}>
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
                      {bccOptions
                        .filter(option => option && option.bccEmailAddress)
                        .sort((a, b) => a.bccEmailAddress.localeCompare(b.bccEmailAddress, undefined, { sensitivity: 'base' }))
                        .map((option) => (
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
                </div>

                {/* ROW 3: Delay panel */}
                <div
                   className="form-group"
                  style={{
                    padding: "12px",
                    border: "1px solid #cccccc",
                    borderRadius: "8px",
                    marginBottom:"12px",
                    backgroundColor: "#fff",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <input
                      type="checkbox"
                      id="enableDelay"
                      checked={enableDelay}
                      onChange={(e) => setEnableDelay(e.target.checked)}
                      style={{ marginRight: 8, cursor: "pointer" }}
                      className="!w-[auto]"
                    />
                    <label htmlFor="enableDelay" style={{ fontSize: "inherit", fontWeight: 600, marginBottom:0, cursor: "pointer", fontFamily: "inherit" }}>
                      Delay (seconds)
                    </label>
                  </div>
                  {enableDelay && (
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }} className="mt-[15px]">
                      <div style={{ width: "80px" }}>
                        <label style={{ display: "block", marginBottom: 4, fontSize: "14px", color: "#333", fontFamily: "inherit" }}>
                          Min
                        </label>
                        <select
                          className="form-control !min-w-[auto]"
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
                        <label style={{ display: "block", marginBottom: 4, fontSize: "14px", color: "#333", fontFamily: "inherit" }}>
                          Max
                        </label>
                        <select
                          className="form-control !min-w-[auto]"
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

                {/* Countdown */}
                {isBulkSending && countdown !== null && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "8px 12px",
                      background: "#f0fdf4",
                      borderRadius: 8,
                      fontSize: 14,
                      color: "#3f9f42",
                      fontWeight: 500,
                      textAlign: "center",
                      whiteSpace: "nowrap",
                      minWidth: "fit-content",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                    }}
                  >
                    <span>⏳</span>
                    <span>Next email will be sent in {countdown} seconds</span>
                  </div>
                )}
              </div>

              {/* FOOTER - ROW 5: Buttons */}
              <div className="mt-[12px] flex gap-[10px] w-[100%] sticky bottom-0 bg-white z-10"
              >
                <button
                  type="button"
                  className="btn-default flex-1"
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
                >
                  {!sendingEmail && emailMessage === "" && "Send"}
                  {sendingEmail && "Sending..."}
                  {!sendingEmail && emailMessage && "Sent"}
                </button>

                <button
                  type="button"
                  className="btn-default flex-1"
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
                    onSendAll();
                  }}
                  disabled={(() => {
                    if (sessionStorage.getItem("isDemoAccount") === "true") return true;
                    if (followupEnabled) {
                      const canSendAny = combinedResponses.some((contact) => {
                        const emailedDate = contact.emailsentdate;
                        const kraftedDate = contact.lastemailupdateddate;
                        if (!kraftedDate) return false;
                        if (!emailedDate) return true;
                        const emailedTime = new Date(emailedDate).getTime();
                        const kraftedTime = new Date(kraftedDate).getTime();
                        return kraftedTime > emailedTime;
                      });
                      return !canSendAny;
                    }
                    return false;
                  })()}
                >
                  {isBulkSending ? "Stop" : "Send all"}
                </button>
              </div>
            </>

          </div>
        )}

      </div>
    </>
  );
};

export default SendEmailPanel;