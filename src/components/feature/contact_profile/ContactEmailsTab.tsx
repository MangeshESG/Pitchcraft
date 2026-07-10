import React from "react";

interface ContactEmailsTabProps {
  /** Which mail sub-view is active in the list pane. */
  contactMailTab: "allmessages" | "sent";
  setContactMailTab: (tab: "allmessages" | "sent") => void;
  /** Render callbacks supplied by the parent, which owns the mail state. */
  renderMailList: () => React.ReactNode;
  renderMailReader: () => React.ReactNode;
}

/**
 * Standalone "Emails" tab for the contact profile.
 *
 * The email data, loading state and the list/reader closures live in
 * ContactDetailView (they are deeply coupled to that component's state), so
 * this component owns only the Emails-tab *layout*: the All Messages / Sent
 * switch and the two-pane workspace grid. The Compose action lives in the
 * shared top-right action bar of ContactDetailView.
 */
const ContactEmailsTab: React.FC<ContactEmailsTabProps> = ({
  contactMailTab,
  setContactMailTab,
  renderMailList,
  renderMailReader,
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
                All Messages
              </button>
              <button
                type="button"
                className={`inbox-tab${contactMailTab === "sent" ? " active" : ""}`}
                onClick={() => setContactMailTab("sent")}
              >
                Sent
              </button>
            </div>
          </div>
          {renderMailList()}
        </div>
        <div className="read-pane">{renderMailReader()}</div>
      </div>
    </div>
  );
};

export default ContactEmailsTab;
