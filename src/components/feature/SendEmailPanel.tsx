import { faAngleLeft, faAngleRight, faCircleLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useState } from "react";
import { toast } from "react-toastify";

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
}) => {
  const [internalEnableDelay, setInternalEnableDelay] = useState(false);
  const [internalEnableIndexRange, setInternalEnableIndexRange] = useState(false);
  const [indexRangeError, setIndexRangeError] = useState("");
  const [showValidationError, setShowValidationError] = useState(false);

  const enableDelay = externalEnableDelay ?? internalEnableDelay;
  const setEnableDelay = externalSetEnableDelay ?? setInternalEnableDelay;
  const enableIndexRange = externalEnableIndexRange ?? internalEnableIndexRange;
  const setEnableIndexRange = externalSetEnableIndexRange ?? setInternalEnableIndexRange;

  const [panelTab, setPanelTab] = useState('kraft');
  const panelTabs = [
    { id: 'kraft', label: 'Kraft' },
    { id: 'send', label: 'Send' },
  ];
const formatLocalDateTime = (dateString: string | undefined | null): string => {
  if (!dateString) return "N/A";
  const dateObj = new Date(dateString);
  if (isNaN(dateObj.getTime())) return "N/A";

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
    <>

      <div
        className={`${isOpen && "hidden"} min-w-[320px] flex flex-1 flex-col bg-[#ffffff] rounded-[10px] border border-[#cccccc] overflow-hidden shadow-[rgba(50,50,93,0.25)_0px_13px_27px_-5px,rgba(0,0,0,0.3)_0px_8px_16px_-8px]`}
      >
        {/* Tabs Header */}
        <div className="flex border-b border-[#cccccc] rounded-[10px 10px 0 0] panel-tab items-center">
          {panelTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPanelTab(tab.id)}
              className={`px-[30px] py-[10px] font-medium text-[16px] border-r border-[#cccccc] bg-gray-200
              ${panelTab === tab.id
                  ? `bg-white  text-[#3f9f42] border-b-[#ffffff] relative active`
                  : 'bg-gray-100 text-slate-400 hover:bg-gray-200 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1)]'
                }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            className="bg-[#e7f5e8] text-[#3f9f42] font-[600] text-[14px] border border-dashed border-[#9b9b9b] !rounded-[4px] h-[30px] ml-[5px] py-[2px] px-[5px]"
            onClick={() => onClose()}
          >
            <span className="flex items-center gap-[5px]">
              {/* <FontAwesomeIcon
                icon={isOpen ? faAngleRight : faAngleLeft}
                className="text-[#ffffff] text-md"
              /> */}
              <FontAwesomeIcon
                icon={isOpen ? faCircleLeft : faAngleLeft}
                className="text-[#3f9f42] text-md pr-[2px]"
              />
              <span>
                {!isOpen ? "Hide actions" : "Show"}
              </span>
            </span>
          </button>
        </div>
        {/* HEADER */}

        {/* CONTENT */}
        {panelTab === "kraft" && (
  <div className="p-[20px] flex flex-col w-[100%] h-[100%]">

    {/* Overwrite */}
    <div
      style={{
        padding: "12px",
        border: "1px solid #cccccc",
        borderRadius: "8px",
        marginBottom: "12px",
        backgroundColor: "#fff",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" ,  gap: "8px"}}>
        <input
          type="checkbox"
          checked={overwriteDatabase ?? false}
          onChange={(e) => {
            const checked = e.target.checked;

            setOverwriteDatabase?.(checked);
          }}
        />
        <label style={{ fontWeight: 600, cursor: "pointer" }}>
          Overwrite
        </label>
      </div>
    </div>

    {/* Restrict Contacts */}
    <div
      style={{
        padding: "12px",
        border: "1px solid #cccccc",
        borderRadius: "8px",
        marginBottom: "12px",
        backgroundColor: "#fff",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <input
          type="checkbox"
          checked={enableIndexRange}
          onChange={(e) => setEnableIndexRange(e.target.checked)}
          style={{ marginRight: 8, cursor: "pointer" }}
        />
        <label style={{ fontWeight: 600, cursor: "pointer" }}>
          Restrict contacts
        </label>
      </div>

      {enableIndexRange && (
        <>
          <div className="mt-[15px]" style={{ display: "flex", gap: 12 }}>
            <div style={{ width: "80px" }}>
              <label style={{ fontSize: 13 }}>From</label>
              <input
                type="number"
                className="form-control"
                value={startIndex}
                onChange={(e) => {
                  setStartIndex(e.target.value);
                  setShowValidationError(false);
                }}
                min="1"
                max={combinedResponses.length}
              />
            </div>

            <div style={{ width: "80px" }}>
              <label style={{ fontSize: 13 }}>To</label>
              <input
                type="number"
                className="form-control"
                value={endIndex}
                onChange={(e) => {
                  setEndIndex(e.target.value);
                  setShowValidationError(false);
                }}
                min={startIndex || "1"}
                max={combinedResponses.length}
                disabled={!startIndex}
              />
            </div>
          </div>

          {showValidationError && indexRangeError && (
            <div className="mt-[8px] text-red-600 text-[12px]">
              {indexRangeError}
            </div>
          )}
        </>
      )}
    </div>

    {/* Krafted & Emailed Dates */}
    {combinedResponses[currentIndex] && (
      <div className="mt-[10px] text-[13px] italic text-gray-600">
        {combinedResponses[currentIndex]?.lastemailupdateddate && (
          <div>
            Krafted:{" "}
            {formatLocalDateTime(
              combinedResponses[currentIndex]?.lastemailupdateddate
            )}
          </div>
        )}
        {combinedResponses[currentIndex]?.emailsentdate && (
          <div>
            Emailed:{" "}
            {formatLocalDateTime(
              combinedResponses[currentIndex]?.emailsentdate
            )}
          </div>
        )}
      </div>
    )}

    {/* START BUTTON */}
    <div className="mt-[100px] pt-[15px] border-t border-[#cccccc] sticky bottom-0 bg-white z-10">
       {isResetEnabled ? (
      <button
        type="button"
        className="button save-button w-[100%]"
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
      className="button save-button w-[100%]"
      onClick={onStop}   // or separate stop handler if you have one
      style={{ flex: 1, padding: "10px 16px", fontSize: 14, fontWeight: 600 }}
    >
      Stop
    </button>
  )}
    </div>
  </div>
)}
        {panelTab === "send" && (
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
                      {smtpUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.username}
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

                {/* ROW 4: Index Range panel */}
                <div
                  className="form-group"
                  style={{
                    padding: "12px",
                    border: "1px solid #cccccc",
                    borderRadius: "8px",
                    backgroundColor: "#fff",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center"}}>
                    <input
                      type="checkbox"
                      id="enableIndexRange"
                      checked={enableIndexRange}
                      onChange={(e) => setEnableIndexRange(e.target.checked)}
                      style={{ marginRight: 8, cursor: "pointer" }}
                      className="!w-[auto]"
                    />
                    <label htmlFor="enableIndexRange" style={{ fontSize: "inherit", marginBottom:0, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      Restrict contacts
                    </label>
                  </div>
                  {enableIndexRange && (
                    <>
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}  className="mt-[15px]">
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

                {/* Countdown */}
                {isBulkSending && countdown !== null && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: 12,
                      background: "#f0fdf4",
                      borderRadius: 8,
                      fontSize: 14,
                      color: "#3f9f42",
                      fontWeight: 500,
                      textAlign: "center",
                    }}
                  >
                    ⏳Next email will be sent in {countdown} seconds
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
                          fontSize: "inherit",
                          color: "#666",
                          fontStyle: "italic",
                          fontFamily: "inherit",
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
              <div className="mt-[30px] flex gap-[10px] border-t border-[#cccccc] pt-[15px] w-[100%] sticky bottom-0 bg-white z-10"
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
            </>

          </div>
        )}

      </div>
    </>
  );
};

export default SendEmailPanel;