import React from "react";

interface ContactEmailsTabProps {
  /** Which mail sub-view is active in the list pane. */
  contactMailTab: "allmessages" | "sent";
  setContactMailTab: (tab: "allmessages" | "sent") => void;
  /** Render callbacks supplied by the parent, which owns the mail state. */
  renderMailList: () => React.ReactNode;
  renderMailReader: () => React.ReactNode;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

/**
 * Standalone "Emails" tab for the contact profile.
 *
 * The email data, loading state and the list/reader closures live in
 * ContactDetailView (they are deeply coupled to that component's state), so
 * this component owns only the Emails-tab *layout*: the Inbox / Sent
 * switch and the two-pane workspace grid. The Compose action lives in the
 * shared top-right action bar of ContactDetailView.
 */
const ContactEmailsTab: React.FC<ContactEmailsTabProps> = ({
  contactMailTab,
  setContactMailTab,
  renderMailList,
  renderMailReader,
  onRefresh,
  isRefreshing = false,
}) => {
  return (
    <div className="inbox-workspace contact-email-workspace" style={{ marginTop: -25 }}>
      <div
        className="inbox-content inbox-grid"
        style={{
          gridTemplateColumns: "360px minmax(0, 1fr)",
          height: "calc(100vh - 260px)",
          minHeight: 560,
        }}
      >
        <div className="list-pane">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <div className="inbox-tabs" style={{ borderBottom: "none", flex: 1 }}>
              <button
                type="button"
                className={`inbox-tab${contactMailTab === "allmessages" ? " active" : ""}`}
                onClick={() => setContactMailTab("allmessages")}
              >
                Inbox
              </button>
              <button
                type="button"
                className={`inbox-tab${contactMailTab === "sent" ? " active" : ""}`}
                onClick={() => setContactMailTab("sent")}
              >
                Sent
              </button>
            </div>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                title={isRefreshing ? "Refreshing..." : "Refresh emails"}
                aria-label={isRefreshing ? "Refreshing emails" : "Refresh emails"}
                style={{
                  width: 36,
                  height: 36,
                  marginRight: 8,
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  background: "#fff",
                  color: "#3f9f42",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: isRefreshing ? "not-allowed" : "pointer",
                  opacity: isRefreshing ? 0.65 : 1,
                  flexShrink: 0,
                }}
              >
                <svg
                  width="16px"
                  height="16px"
                  viewBox="0 0 16 16"
                  fill="none"
                  style={{ animation: isRefreshing ? "spin 1s linear infinite" : "none" }}
                >
                  <g fill="currentColor">
                    <path d="M8 1.5A6.5 6.5 0 001.5 8 .75.75 0 010 8a8 8 0 0113.5-5.81v-.94a.75.75 0 011.5 0v3a.75.75 0 01-.75.75h-3a.75.75 0 010-1.5h1.44A6.479 6.479 0 008 1.5zM15.25 7.25A.75.75 0 0116 8a8 8 0 01-13.5 5.81v.94a.75.75 0 01-1.5 0v-3a.75.75 0 01.75-.75h3a.75.75 0 010 1.5H3.31A6.5 6.5 0 0014.5 8a.75.75 0 01.75-.75z" />
                  </g>
                </svg>
              </button>
            )}
          </div>
          {renderMailList()}
        </div>
        <div className="read-pane">{renderMailReader()}</div>
      </div>
    </div>
  );
};

export default ContactEmailsTab;
